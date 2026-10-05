"""In memory view of who is connected right now, refreshed from the main core and every node"""
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Dict, Optional

from app import logger, xray
from app.db import GetDB
from app.db.models import Node, User
from app.xray import ip_limit
from app.xray import geoip
from xray_api import XRay as XRayAPI
from xray_api import exc as xray_exc

MASTER_NAME = "Master"

# user id -> ip -> {"nodes": [...], "inbounds": [...], "last_seen": unix time}
online_users: Dict[int, Dict[str, dict]] = {}
updated_at: Optional[datetime] = None
_last_apis: Dict[str, object] = {}
_prev_online: Dict[int, int] = {}


def _fetch(api: XRayAPI):
    try:
        return api.get_online_users(timeout=10)
    except xray_exc.XrayError:
        # unreachable core, or one that's too old to have GetUsersStats
        return []


def refresh():
    global online_users, updated_at

    with GetDB() as db:
        node_names = dict(db.query(Node.id, Node.name).all())

    apis = {MASTER_NAME: xray.api}
    for node_id, node in list(xray.nodes.items()):
        if node.connected and node.started:
            apis[node_names.get(node_id, f"node {node_id}")] = node.api

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {name: executor.submit(_fetch, api) for name, api in apis.items()}
    results = {name: future.result() for name, future in futures.items()}

    users: Dict[int, Dict[str, dict]] = {}
    for node_name, online in results.items():
        for user in online:
            try:
                uid = int(user.email.split('.', 1)[0])
            except ValueError:
                continue
            inbound_tag = user.email.split('|', 1)[1] if '|' in user.email else None

            for ip, last_seen in user.ips.items():
                entry = users.setdefault(uid, {}).setdefault(
                    ip, {"nodes": [], "inbounds": [], "last_seen": 0, "first_seen": None, "provider": None})
                if node_name not in entry["nodes"]:
                    entry["nodes"].append(node_name)
                if inbound_tag and inbound_tag not in entry["inbounds"]:
                    entry["inbounds"].append(inbound_tag)
                entry["last_seen"] = max(entry["last_seen"], last_seen)
                # the same IP on two inbounds (e.g. two people behind one IP on
                # different protocols) is shown as two connections
                per = entry.setdefault("per_inbound", {}).setdefault(
                    inbound_tag or "", {"nodes": [], "last_seen": 0})
                if node_name not in per["nodes"]:
                    per["nodes"].append(node_name)
                per["last_seen"] = max(per["last_seen"], last_seen)

    # the IP limit is enforced through Xray, so it only sees Xray's IPs
    import copy
    xray_users = copy.deepcopy(users)
    # AmneziaWG / OpenVPN connections (app/vpn) join the list like any inbound
    try:
        from app import vpn
        for uid, ips in vpn.online_ips().items():
            for ip, v in ips.items():
                entry = users.setdefault(uid, {}).setdefault(
                    ip, {"nodes": [], "inbounds": [], "last_seen": 0, "first_seen": None, "provider": None})
                for n in v["nodes"]:
                    if n not in entry["nodes"]:
                        entry["nodes"].append(n)
                entry["last_seen"] = max(entry["last_seen"], v["last_seen"])
                for tag in v["tags"]:
                    if tag not in entry["inbounds"]:
                        entry["inbounds"].append(tag)
                    per = entry.setdefault("per_inbound", {}).setdefault(tag, {"nodes": [], "last_seen": 0})
                    for n in v["nodes"]:
                        if n not in per["nodes"]:
                            per["nodes"].append(n)
                    per["last_seen"] = max(per["last_seen"], v["last_seen"])
    except Exception as exc:
        logger.warning(f"online: VPN sessions: {exc}")

    # carry first_seen across refreshes; look up each IP's provider (cached)
    now = time.time()
    for uid, ips in users.items():
        prev = online_users.get(uid, {})
        for ip, entry in ips.items():
            entry["first_seen"] = prev.get(ip, {}).get("first_seen") or now
            entry["provider"] = geoip.provider(ip)

    # persist per-user online IP count so the users table can sort by it
    try:
        from sqlalchemy import update as _sql_update
        counts = {uid: len(ips) for uid, ips in users.items()}
        with GetDB() as db:
            # zero out users that were online before but aren't now
            stale = set(_prev_online) - set(counts)
            if stale:
                db.execute(_sql_update(User).where(User.id.in_(stale)).values(online_ip_count=0))
            for uid, c in counts.items():
                db.execute(_sql_update(User).where(User.id == uid).values(online_ip_count=c))
            db.commit()
        _prev_online.clear(); _prev_online.update(counts)
    except Exception as exc:
        logger.warning(f"online: failed to persist ip counts: {exc}")

    online_users = users
    updated_at = datetime.utcnow()
    _last_apis.clear(); _last_apis.update(apis)

    ip_limit.enforce(apis, xray_users)


def get_user_ips(user_id: int) -> Dict[str, dict]:
    return online_users.get(user_id, {})


def get_ip_counts() -> Dict[int, int]:
    return {uid: len(ips) for uid, ips in online_users.items()}
