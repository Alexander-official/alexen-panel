"""In memory view of who is connected right now, refreshed from the main core and every node"""
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Dict, Optional

from app import xray
from app.db import GetDB
from app.db.models import Node
from app.xray import ip_limit
from xray_api import XRay as XRayAPI
from xray_api import exc as xray_exc

MASTER_NAME = "Master"

# user id -> ip -> {"nodes": [...], "inbounds": [...], "last_seen": unix time}
online_users: Dict[int, Dict[str, dict]] = {}
updated_at: Optional[datetime] = None


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
                entry = users.setdefault(uid, {}).setdefault(ip, {"nodes": [], "inbounds": [], "last_seen": 0})
                if node_name not in entry["nodes"]:
                    entry["nodes"].append(node_name)
                if inbound_tag and inbound_tag not in entry["inbounds"]:
                    entry["inbounds"].append(inbound_tag)
                entry["last_seen"] = max(entry["last_seen"], last_seen)

    online_users = users
    updated_at = datetime.utcnow()

    ip_limit.enforce(apis, users)


def get_user_ips(user_id: int) -> Dict[str, dict]:
    return online_users.get(user_id, {})


def get_ip_counts() -> Dict[int, int]:
    return {uid: len(ips) for uid, ips in online_users.items()}
