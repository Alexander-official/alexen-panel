"""Per user IP limit: the first IPs a user connects from keep working, the ones beyond the limit get
routed to a blackhole on every core (main and nodes) until one of the earlier IPs disconnects."""
import time
from typing import Dict, Set, Tuple

from app import logger, xray
from app.db import GetDB
from app.db.models import User
from app.xray.config import IP_LIMIT_OUTBOUND_TAG, user_email
from xray_api import XRay as XRayAPI
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
# manual kicks: user id -> ip -> unix time the block expires
manual_bans: Dict[int, Dict[str, float]] = {}
MANUAL_BAN_SECONDS = 300


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
        seen = first_seen.get(user_id, {})
        ips = sorted(seen, key=seen.get)
        if len(ips) <= limit:
            continue
        for ip in ips[limit:]:
            rules[_rule_tag(user_id, ip)] = (emails_for(user_id), ip)

    # manual kicks (expire on their own)
    for user_id in banned_user_ids:
        for ip, exp in list(manual_bans[user_id].items()):
            if exp <= now:
                del manual_bans[user_id][ip]
            elif user_id in usernames:
                rules[_rule_tag(user_id, ip)] = (emails_for(user_id), ip)
    return rules


def _sync_core(name: str, api: XRayAPI, rules: Dict[str, Tuple[list, str]]):
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
            api.add_rule(tag, IP_LIMIT_OUTBOUND_TAG, user_emails=emails, source_ips=[ip], timeout=5)
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

    for name, api in apis.items():
        _sync_core(name, api, rules)
