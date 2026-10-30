"""Per user IP limit: the first IPs a user connects from keep working, the ones beyond the limit get
routed to a blackhole on every core (main and nodes) until one of the earlier IPs disconnects."""
import time
from typing import Dict, Optional, Set, Tuple

from app import logger, xray
from app.db import GetDB
from app.db.models import User
from app.xray.config import IP_LIMIT_OUTBOUND_TAG, user_email
from xray_api import XRay as XRayAPI
from xray_api.router import legacy_geoip
from xray_api import exc as xray_exc

RULE_TAG_PREFIX = "iplimit|"

# user id -> ip -> unix time the IP was first seen online (while it stays online)
first_seen: Dict[int, Dict[str, float]] = {}
# user id -> IPs currently blocked
blocked_ips: Dict[int, Set[str]] = {}
# core name -> rule tags we've added to it
applied_rules: Dict[str, Set[str]] = {}
# core name -> when it answered it has no RoutingService (stock marzban-node), retried every 10 minutes
unsupported_cores: Dict[str, float] = {}
UNSUPPORTED_RETRY_SECONDS = 600
# blocked IPs stay blocked for a while: a blocked connection ends at once, so the IP drops off
# the online list, and without this it would be let in again on the next round (on and off
# every few seconds). user id -> ip -> unix time the hold ends (pushed on while it keeps trying)
held: Dict[int, Dict[str, float]] = {}
HOLD_SECONDS = 90
# counting "new IP blocked" per user: IPs already counted this online session, and the
# pending increments to flush to the DB in the next cycle (no DB writes in the hot path)
_counted_block_ips: Dict[int, set] = {}
_block_pending: Dict[int, int] = {}
# manual kicks: user id -> ip -> unix time the block expires
manual_bans: Dict[int, Dict[str, float]] = {}
MANUAL_BAN_SECONDS = 300

# ---- source IPs that are NOT the user's own (CDN / cloud fronts) -------------
# A VLESS/VMESS WS host fronted through Google (Cloud Run) reaches the core from
# Google's egress IPs, and Google spreads a single user across several of them. Without
# this the IP limit counts those as "too many IPs" and blackholes the user's own tunnel
# (the "one request works, the next doesn't" bug). Google's published ranges are bundled
# (google_ip_ranges.json); extra CIDRs for other fronts can be added through the
# IP_LIMIT_EXEMPT_CIDRS env (comma separated).
import ipaddress
import json as _json
import os as _os


def _load_exempt_networks() -> list:
    nets = []
    path = _os.path.join(_os.path.dirname(__file__), "google_ip_ranges.json")
    try:
        with open(path) as f:
            data = _json.load(f)
        for p in data.get("ipv4", []) + data.get("ipv6", []):
            try:
                nets.append(ipaddress.ip_network(p))
            except ValueError:
                pass
    except Exception as e:
        logger.warning(f"IP limit: couldn't load Google ranges ({e}); fronted IPs won't be exempt")
    for p in (_os.environ.get("IP_LIMIT_EXEMPT_CIDRS", "") or "").replace(" ", "").split(","):
        if p:
            try:
                nets.append(ipaddress.ip_network(p))
            except ValueError:
                logger.warning(f"IP limit: bad IP_LIMIT_EXEMPT_CIDRS entry {p!r}")
    return nets


_exempt_networks = _load_exempt_networks()
_exempt_cache: Dict[str, bool] = {}


def is_exempt_ip(ip: str) -> bool:
    """True for a source IP that belongs to a CDN / cloud front (Google Cloud Run egress,
    or an admin-listed range): it must never count toward, or be blocked by, the IP limit."""
    hit = _exempt_cache.get(ip)
    if hit is None:
        try:
            addr = ipaddress.ip_address(ip)
            hit = any(addr in n for n in _exempt_networks)
        except ValueError:
            hit = False
        _exempt_cache[ip] = hit
    return hit


def _without_exempt(online_users: Dict[int, Dict[str, dict]]) -> Dict[int, Dict[str, dict]]:
    """drop CDN/front source IPs so they are neither counted nor blocked"""
    return {uid: {ip: v for ip, v in ips.items() if not is_exempt_ip(ip)}
            for uid, ips in online_users.items()}


def ban_ip(user_id: int, ip: str, seconds: int = MANUAL_BAN_SECONDS):
    """Kick an online IP: block it for a while so its sessions drop (re-connects are refused)"""
    manual_bans.setdefault(user_id, {})[ip] = time.time() + seconds


def unban_ip(user_id: int, ip: str):
    manual_bans.get(user_id, {}).pop(ip, None)


def _rule_tag(user_id: int, ip: str) -> str:
    return f"{RULE_TAG_PREFIX}{user_id}|{ip}"


def _update_first_seen(online_users: Dict[int, Dict[str, dict]]):
    now = time.time()
    for user_id in list(first_seen):
        if user_id not in online_users:
            del first_seen[user_id]
    for user_id, ips in online_users.items():
        seen = first_seen.setdefault(user_id, {})
        for ip in list(seen):
            if ip not in ips:
                del seen[ip]
        for ip in ips:
            seen.setdefault(ip, now)


def _over_limit(user_id: int, limit: int, now: float) -> list:
    """the IPs of a user to block: the online ones beyond its first `limit`, and the ones
    still held from before, unless a place is free again (then the longest held gets it)"""
    seen = first_seen.get(user_id, {})
    hold = held.setdefault(user_id, {})
    for ip in [i for i, until in hold.items() if until <= now]:
        del hold[ip]
    allowed = [ip for ip in sorted(seen, key=seen.get) if ip not in hold][:limit]
    while len(allowed) < limit and hold:
        ip = min(hold, key=hold.get)
        del hold[ip]
        if ip in seen:
            allowed.append(ip)
    blocked = [ip for ip in seen if ip not in allowed]
    counted = _counted_block_ips.setdefault(user_id, set())
    for ip in blocked:
        hold[ip] = now + HOLD_SECONDS
        if ip not in counted:
            counted.add(ip)
            _block_pending[user_id] = _block_pending.get(user_id, 0) + 1
    return blocked + [ip for ip in hold if ip not in seen]


def _flush_block_counts() -> None:
    """write the pending "new IP blocked" counts to the DB, once per cycle"""
    if not _block_pending:
        return
    pending = dict(_block_pending)
    _block_pending.clear()
    try:
        with GetDB() as db:
            for uid, n in pending.items():
                db.query(User).filter(User.id == uid).update(
                    {User.ip_block_count: User.ip_block_count + n}, synchronize_session=False)
            db.commit()
    except Exception as e:
        # don't lose the counts on a transient DB error
        for uid, n in pending.items():
            _block_pending[uid] = _block_pending.get(uid, 0) + n
        logger.debug(f"ip block count flush: {e}")


def _desired_rules(online_users: Dict[int, Dict[str, dict]]) -> Dict[str, Tuple[list, str]]:
    """rule tag -> (emails of the user on every inbound, ip to block)"""
    if not online_users:
        return {}

    with GetDB() as db:
        limits = db.query(User.id, User.username, User.ip_limit) \
            .filter(User.id.in_(online_users.keys()), User.ip_limit > 0).all()

    inbound_tags = list(xray.config.inbounds_by_tag)

    # usernames for everyone we might build a rule for (ip-limited users + manually banned users)
    now = time.time()
    banned_user_ids = {uid for uid, ips in manual_bans.items()
                       if any(exp > now for exp in ips.values())}
    with GetDB() as db:
        extra = {}
        if banned_user_ids:
            extra = dict(db.query(User.id, User.username).filter(User.id.in_(banned_user_ids)).all())
    usernames = {uid: username for uid, username, _ in limits}
    usernames.update(extra)

    def emails_for(uid):
        return [user_email(uid, usernames[uid], tag) for tag in inbound_tags]

    rules = {}
    for user_id, username, limit in limits:
        for ip in _over_limit(user_id, limit, now):
            rules[_rule_tag(user_id, ip)] = (emails_for(user_id), ip)
    # holds of users who went offline altogether run out on their own
    for user_id in [u for u, h in held.items() if not any(t > now for t in h.values())]:
        del held[user_id]
        _counted_block_ips.pop(user_id, None)
    _flush_block_counts()

    # manual kicks (expire on their own)
    for user_id in banned_user_ids:
        for ip, exp in list(manual_bans[user_id].items()):
            if exp <= now:
                del manual_bans[user_id][ip]
            elif user_id in usernames:
                rules[_rule_tag(user_id, ip)] = (emails_for(user_id), ip)
    return rules


def _core_versions() -> Dict[str, Optional[str]]:
    """core name -> its Xray version (the main one, and every node as it last said)"""
    from app.db.models import Node
    from app.xray.online import MASTER_NAME
    out: Dict[str, Optional[str]] = {MASTER_NAME: getattr(xray.core, "version", None)}
    try:
        with GetDB() as db:
            out.update({name: ver for name, ver in db.query(Node.name, Node.xray_version).all()})
    except Exception:
        pass
    return out


def _sync_core(name: str, api: XRayAPI, rules: Dict[str, Tuple[list, str]], legacy: bool = False):
    if time.time() - unsupported_cores.get(name, 0) < UNSUPPORTED_RETRY_SECONDS:
        return
    applied = applied_rules.setdefault(name, set())

    for tag in applied - rules.keys():
        try:
            api.remove_rule(tag, timeout=5)
        except xray_exc.XrayError:
            pass
        applied.discard(tag)

    # sent every time on purpose: a restarted core forgets its rules, a duplicate is just refused
    for tag, (emails, ip) in rules.items():
        try:
            api.add_rule(tag, IP_LIMIT_OUTBOUND_TAG, user_emails=emails, source_ips=[ip], timeout=5, legacy=legacy)
            applied.add(tag)
        except xray_exc.XrayError as exc:
            if "duplicate ruleTag" in str(exc.details):
                applied.add(tag)
            elif "unknown service" in str(exc.details):
                if name not in unsupported_cores:
                    logger.warning(f"IP limit: \"{name}\" has no Xray RoutingService (stock marzban-node?),"
                                   " extra IPs can't be blocked there")
                unsupported_cores[name] = time.time()
                return
            elif tag not in applied:
                logger.warning(f"IP limit: unable to block {ip} on {name}: {exc.details}")


def enforce_now():
    """Re-push rules right away using the last known cores (for an immediate manual kick)"""
    from app.xray import online
    if online._last_apis:
        enforce(online._last_apis, online.online_users)


def enforce(apis: Dict[str, XRayAPI], online_users: Dict[int, Dict[str, dict]]):
    global blocked_ips

    # IPs behind a CDN/cloud front (Google Cloud Run egress, …) are not the user's own
    # and rotate, so counting them falsely trips the limit: leave them out entirely.
    online_users = _without_exempt(online_users)
    _update_first_seen(online_users)
    rules = _desired_rules(online_users)

    new_blocked: Dict[int, Set[str]] = {}
    for tag, (_, ip) in rules.items():
        user_id = int(tag[len(RULE_TAG_PREFIX):].split('|', 1)[0])
        new_blocked.setdefault(user_id, set()).add(ip)
    for user_id, ips in new_blocked.items():
        for ip in ips - blocked_ips.get(user_id, set()):
            logger.info(f"IP limit: user {user_id} exceeded its limit, blocking {ip}")
    blocked_ips = new_blocked

    versions = _core_versions() if rules or any(applied_rules.values()) else {}
    for name, api in apis.items():
        _sync_core(name, api, rules, legacy=legacy_geoip(versions.get(name)))
