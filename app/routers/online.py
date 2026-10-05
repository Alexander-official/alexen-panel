import time
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import func

from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import Admin as DBAdmin
from app.db.models import User, UserHWIDDevice
from app.dependencies import get_validated_user
from app.models.admin import Admin
from app.models.user import UserResponse
from app.utils import responses
from app import xray
from app.xray import ip_limit, online

router = APIRouter(tags=["Online"], prefix="/api", responses={401: responses._401})


class OnlineIP(BaseModel):
    ip: str
    nodes: List[str]
    inbounds: List[str]
    last_seen: datetime
    connected_seconds: int = 0
    provider: Optional[str] = None
    blocked: bool = False
    # e.g. "vless · ws · tls" of the inbound this connection uses
    protocol: Optional[str] = None
    # the user's current speed on that inbound, bytes/s
    rate: float = 0


class UserOnlineIPs(BaseModel):
    username: str
    ip_limit: Optional[int] = None
    ips: List[OnlineIP]


class OnlineUser(BaseModel):
    username: str
    admin: Optional[str] = None
    ip_count: int
    device_count: int = 0
    ip_limit: Optional[int] = None
    blocked_ips: int = 0


class OnlineSummary(BaseModel):
    online_users: int
    online_ips: int
    updated_at: Optional[datetime] = None
    users: List[OnlineUser]


def _visible_ip_counts(db: Session, admin: Admin) -> dict:
    """ip counts of the online users the admin is allowed to see"""
    counts = online.get_ip_counts()
    if not counts:
        return {}

    query = db.query(User.id, User.username, DBAdmin.username, User.ip_limit) \
        .outerjoin(DBAdmin, User.admin_id == DBAdmin.id) \
        .filter(User.id.in_(counts.keys()))
    if not admin.is_sudo:
        query = query.filter(DBAdmin.username == admin.username)

    rows = query.all()
    device_counts = dict(
        db.query(UserHWIDDevice.user_id, func.count(UserHWIDDevice.id))
        .filter(UserHWIDDevice.user_id.in_([r[0] for r in rows]))
        .group_by(UserHWIDDevice.user_id).all()
    ) if rows else {}
    return {uid: (username, admin_username, counts[uid], limit, device_counts.get(uid, 0))
            for uid, username, admin_username, limit in rows}


@router.get("/online", response_model=OnlineSummary)
def get_online_summary(
    limit: int = 50,
    sort: str = "ip",
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.get_current),
):
    """Online users right now (main core and nodes). sort: 'ip' (default) or 'devices'."""
    visible = _visible_ip_counts(db, admin)
    users = [
        OnlineUser(username=username, admin=admin_username, ip_count=count, ip_limit=user_ip_limit,
                   device_count=devices, blocked_ips=len(ip_limit.blocked_ips.get(uid, ())))
        for uid, (username, admin_username, count, user_ip_limit, devices) in visible.items()
    ]
    key = (lambda u: u.device_count) if sort == "devices" else (lambda u: u.ip_count)
    users.sort(key=key, reverse=True)
    return OnlineSummary(
        online_users=len(users),
        online_ips=sum(u.ip_count for u in users),
        updated_at=online.updated_at,
        users=users[:limit],
    )


class ProviderStat(BaseModel):
    name: str
    users: int
    ips: int


class OnlineProviders(BaseModel):
    users: Dict[str, List[str]]
    providers: List[ProviderStat]


@router.get("/online/providers", response_model=OnlineProviders)
def get_online_providers(
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.get_current),
):
    """ISP/provider of each online user's IPs, plus a per-provider breakdown"""
    visible = _visible_ip_counts(db, admin)
    users: Dict[str, List[str]] = {}
    stats: Dict[str, dict] = {}
    for uid, (username, *_rest) in visible.items():
        names = []
        for entry in online.get_user_ips(uid).values():
            name = entry.get("provider") or "Unknown"
            stat = stats.setdefault(name, {"users": set(), "ips": 0})
            stat["users"].add(uid)
            stat["ips"] += 1
            if name not in names:
                names.append(name)
        users[username] = names
    providers = [ProviderStat(name=n, users=len(v["users"]), ips=v["ips"]) for n, v in stats.items()]
    providers.sort(key=lambda p: (p.users, p.ips), reverse=True)
    return OnlineProviders(users=users, providers=providers)


@router.delete("/user/{username}/online-ips/{ip}", responses={403: responses._403, 404: responses._404})
def disconnect_user_ip(ip: str, bg: BackgroundTasks,
                       dbuser: UserResponse = Depends(get_validated_user)):
    """Kick one online IP of the user: block it, then drop the user's live sessions so it really disconnects"""
    bg.add_task(xray.operations.terminate_ip, dbuser=dbuser, ip=ip)
    return {"detail": f"{ip} disconnected"}


@router.post("/user/{username}/online-ips/{ip}/unblock",
             responses={403: responses._403, 404: responses._404})
def unblock_user_ip(ip: str, dbuser: UserResponse = Depends(get_validated_user)):
    """Lift a manual block on an IP so it can connect again right away"""
    ip_limit.unban_ip(dbuser.id, ip)
    ip_limit.enforce_now()
    return {"detail": f"{ip} unblocked"}


def _protocol_label(tag: str) -> Optional[str]:
    if tag == "AmneziaWG":
        return "amneziawg · udp"
    if tag == "OpenVPN":
        return "openvpn"
    inbound = xray.config.inbounds_by_tag.get(tag) if tag else None
    if not inbound:
        return None
    parts = [inbound["protocol"], inbound.get("network")]
    if inbound.get("tls") not in (None, "none", ""):
        parts.append(inbound["tls"])
    return " · ".join(p for p in parts if p)


@router.get("/user/{username}/online-ips", response_model=UserOnlineIPs,
            responses={403: responses._403, 404: responses._404})
def get_user_online_ips(dbuser: UserResponse = Depends(get_validated_user)):
    """IPs the user is connected from right now"""
    user_ips = online.get_user_ips(dbuser.id)
    blocked = set(ip_limit.blocked_ips.get(dbuser.id, ()))
    from app.xray import traffic
    rates = (traffic.live()["users"].get(dbuser.id) or {}).get("inbounds", {})
    ips = []
    for ip, entry in user_ips.items():
        per = entry.get("per_inbound") or {tag: {"nodes": entry["nodes"], "last_seen": entry["last_seen"]}
                                           for tag in (entry["inbounds"] or [""])}
        for tag, info in per.items():
            ips.append(OnlineIP(
                ip=ip, nodes=info["nodes"], inbounds=[tag] if tag else [],
                last_seen=datetime.utcfromtimestamp(info["last_seen"]),
                connected_seconds=int(time.time() - (entry.get("first_seen") or entry["last_seen"])),
                provider=entry.get("provider"),
                blocked=ip in blocked,
                protocol=_protocol_label(tag),
                rate=rates.get(tag, 0),
            ))
    # blocked IPs that already dropped offline still need an "unblock" entry
    for ip in blocked - set(user_ips):
        ips.append(OnlineIP(ip=ip, nodes=[], inbounds=[],
                            last_seen=datetime.utcfromtimestamp(0), blocked=True))
    ips.sort(key=lambda i: (not i.blocked, -i.last_seen.timestamp()))
    return UserOnlineIPs(username=dbuser.username, ip_limit=dbuser.ip_limit, ips=ips)
