"""Overview page: users, traffic, protocols and nodes over a period, from the
hourly history (node_usages, node_user_usages, stat_history)."""
import time
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import xray
from app.db import crud, get_db
from app.db.models import Admin as DBAdmin
from app.db.models import Node, NodeUsage, NodeUserUsage, StatHistory, User, UserInboundUsage
from app.models.admin import Admin
from app.utils import responses

router = APIRouter(tags=["Overview"], prefix="/api", responses={401: responses._401})

PERIODS = {"24h": (timedelta(hours=24), "hour"), "7d": (timedelta(days=7), "hour"),
           "30d": (timedelta(days=30), "day"), "90d": (timedelta(days=90), "day"),
           "365d": (timedelta(days=365), "day")}
MASTER = "Master"


def _buckets(period: str, tz: int):
    """bucket start times (UTC) for the period; days follow the viewer's time zone (tz: minutes east of UTC)"""
    span, unit = PERIODS[period]
    now = datetime.utcnow()
    if unit == "hour":
        end = now.replace(minute=0, second=0, microsecond=0)
        n = int(span.total_seconds() // 3600)
        return [end - timedelta(hours=i) for i in range(n - 1, -1, -1)], unit
    local = now + timedelta(minutes=tz)
    end = local.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(minutes=tz)
    n = span.days
    return [end - timedelta(days=i) for i in range(n - 1, -1, -1)], unit


def _index(points: List[datetime], unit: str):
    step = timedelta(hours=1) if unit == "hour" else timedelta(days=1)
    first = points[0]

    def at(dt: datetime) -> Optional[int]:
        i = int((dt - first) // step)
        return i if 0 <= i < len(points) else None
    return at


def _protocol(tag: str) -> str:
    inbound = xray.config.inbounds_by_tag.get(tag) or {}
    proto = inbound.get("protocol")
    if not proto:
        low = tag.lower()
        return "amneziawg" if "amnezia" in low or low.startswith("awg") else "openvpn" if "openvpn" in low else "other"
    net = inbound.get("network") or "tcp"
    tls = inbound.get("tls")
    if proto == "vless" and tls == "reality":
        return "vless-reality"
    if proto in ("vless", "vmess", "trojan"):
        return f"{proto}-{net}"
    return proto


@router.get("/overview")
def overview(period: str = Query("24h"), tz: int = Query(0, ge=-900, le=900),
             db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)):
    if period not in PERIODS:
        raise HTTPException(400, "unknown period")
    points, unit = _buckets(period, tz)
    at = _index(points, unit)
    since = points[0]
    size = len(points)

    dbadmin = None if admin.is_sudo else crud.get_admin(db, admin.username)
    uq = db.query(User)
    if dbadmin is not None:
        uq = uq.filter(User.admin_id == dbadmin.id)
    user_ids = {uid for (uid,) in uq.with_entities(User.id).all()}

    # ---- users now ----
    counts = {getattr(k, "value", str(k)): v for k, v in
              uq.with_entities(User.status, func.count(User.id)).group_by(User.status).all()}
    now = time.time()
    expiring = uq.filter(User.expire.isnot(None), User.expire > now, User.expire < now + 3 * 86400).count()
    created = uq.filter(User.created_at >= since).count()
    from app.xray import online as _online
    online_now = {uid: ips for uid, ips in _online.online_users.items() if uid in user_ids}
    online_ips_now = sum(len(ips) for ips in online_now.values())

    node_names: Dict[Optional[int], str] = {None: MASTER}
    node_names.update(dict(db.query(Node.id, Node.name).all()))

    # ---- traffic over time, per server ----
    by_node: Dict[str, List[int]] = defaultdict(lambda: [0] * size)
    if admin.is_sudo:
        rows = db.query(NodeUsage.created_at, NodeUsage.node_id, NodeUsage.uplink, NodeUsage.downlink) \
            .filter(NodeUsage.created_at >= since).all()
        for created_at, nid, up, down in rows:
            i = at(created_at)
            if i is not None:
                by_node[node_names.get(nid, f"#{nid}")][i] += int(up or 0) + int(down or 0)
    else:
        rows = db.query(NodeUserUsage.created_at, NodeUserUsage.node_id, func.sum(NodeUserUsage.used_traffic)) \
            .filter(NodeUserUsage.created_at >= since, NodeUserUsage.user_id.in_(user_ids or {-1})) \
            .group_by(NodeUserUsage.created_at, NodeUserUsage.node_id).all()
        for created_at, nid, used in rows:
            i = at(created_at)
            if i is not None:
                by_node[node_names.get(nid, f"#{nid}")][i] += int(used or 0)
    total_series = [sum(s[i] for s in by_node.values()) for i in range(size)]

    # ---- top users in the period ----
    top = db.query(NodeUserUsage.user_id, func.sum(NodeUserUsage.used_traffic).label("t")) \
        .filter(NodeUserUsage.created_at >= since, NodeUserUsage.user_id.in_(user_ids or {-1})) \
        .group_by(NodeUserUsage.user_id).order_by(func.sum(NodeUserUsage.used_traffic).desc()).limit(10).all()
    names = dict(db.query(User.id, User.username).filter(User.id.in_([u for u, _ in top] or [-1])).all())
    owners = dict(db.query(User.id, DBAdmin.username).outerjoin(DBAdmin, User.admin_id == DBAdmin.id)
                  .filter(User.id.in_([u for u, _ in top] or [-1])).all())
    top_users = [{"username": names.get(u, "?"), "admin": owners.get(u), "traffic": int(t or 0)} for u, t in top]

    # ---- protocols: history (sudo), or the users' totals since their last reset ----
    inbound_series: Dict[str, List[int]] = defaultdict(lambda: [0] * size)
    if admin.is_sudo:
        for created_at, key, value in db.query(StatHistory.created_at, StatHistory.key, StatHistory.value) \
                .filter(StatHistory.kind == "inbound", StatHistory.created_at >= since).all():
            i = at(created_at)
            if i is not None:
                inbound_series[key][i] += int(value or 0)
        inbound_totals = {k: sum(v) for k, v in inbound_series.items()}
        history_protocols = bool(inbound_totals)
    else:
        inbound_totals = {}
        history_protocols = False
    if not inbound_totals:
        rows = db.query(UserInboundUsage.inbound_tag, func.sum(UserInboundUsage.used_traffic)) \
            .filter(UserInboundUsage.user_id.in_(user_ids or {-1})).group_by(UserInboundUsage.inbound_tag).all()
        inbound_totals = {tag: int(t or 0) for tag, t in rows}
    protocols: Dict[str, int] = defaultdict(int)
    for tag, total in inbound_totals.items():
        protocols[_protocol(tag)] += total
    protocol_series: Dict[str, List[int]] = defaultdict(lambda: [0] * size)
    for tag, series in inbound_series.items():
        p = protocol_series[_protocol(tag)]
        for i, v in enumerate(series):
            p[i] += v

    # ---- online and users per status over time (sudo: whole panel) ----
    online_series = [0] * size
    online_ips_series = [0] * size
    status_series: Dict[str, List[Optional[int]]] = defaultdict(lambda: [None] * size)
    if admin.is_sudo:
        for created_at, kind, key, value in db.query(StatHistory.created_at, StatHistory.kind, StatHistory.key,
                                                     StatHistory.value) \
                .filter(StatHistory.kind.in_(("online", "online_ips", "users")), StatHistory.created_at >= since) \
                .order_by(StatHistory.created_at).all():
            i = at(created_at)
            if i is None:
                continue
            if kind == "online":
                online_series[i] = max(online_series[i], int(value or 0))
            elif kind == "online_ips":
                online_ips_series[i] = max(online_ips_series[i], int(value or 0))
            else:
                status_series[key][i] = int(value or 0)   # rows come in time order: the day's last hour wins

    # ---- servers ----
    from app import node_extras
    flags = node_extras.flags(db)
    online_by_server: Dict[str, set] = defaultdict(set)
    for uid, ips in online_now.items():
        for entry in ips.values():
            for name in entry.get("nodes") or []:
                online_by_server[name].add(uid)
    servers = []
    if admin.is_sudo:
        servers.append({"id": None, "name": MASTER, "status": "connected", "flag": "",
                        "traffic": sum(by_node.get(MASTER, [])), "online": len(online_by_server.get(MASTER, ()))})
        for n in db.query(Node).order_by(Node.id).all():
            servers.append({"id": n.id, "name": n.name, "status": getattr(n.status, "value", n.status),
                            "flag": flags.get(n.id, ""), "traffic": sum(by_node.get(n.name, [])),
                            "online": len(online_by_server.get(n.name, ()))})

    system = None
    if admin.is_sudo:
        import psutil
        mem = psutil.virtual_memory()
        disk = psutil.disk_usage("/")
        system = {"cpu": psutil.cpu_percent(), "cores": psutil.cpu_count(), "mem_used": mem.used,
                  "mem_total": mem.total, "disk_used": disk.used, "disk_total": disk.total,
                  "uptime": int(now - psutil.boot_time())}

    return {
        "period": period,
        "unit": unit,
        "points": [int((p - datetime(1970, 1, 1)).total_seconds()) for p in points],
        "users": {
            "total": len(user_ids),
            "by_status": counts,
            "online": len(online_now),
            "online_ips": online_ips_now,
            "expiring": expiring,
            "created": created,
        },
        "traffic": {
            "total": sum(total_series),
            "series": total_series,
            "by_node": [{"name": k, "total": sum(v), "series": v}
                        for k, v in sorted(by_node.items(), key=lambda x: -sum(x[1]))],
        },
        "protocols": sorted(({"protocol": k, "traffic": v} for k, v in protocols.items() if v),
                            key=lambda x: -x["traffic"]),
        "protocols_from_history": history_protocols,
        "protocol_series": [{"protocol": k, "series": v} for k, v in
                            sorted(protocol_series.items(), key=lambda x: -sum(x[1]))],
        "online_series": online_series,
        "online_ips_series": online_ips_series,
        "status_series": dict(status_series),
        "top_users": top_users,
        "servers": servers,
        "system": system,
    }
