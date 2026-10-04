from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import xray
from app.db import get_db
from app.db.models import Admin as DBAdmin
from app.db.models import User, UserInboundUsage
from app.models.admin import Admin
from app.models.user import UserStatus
from app.utils import responses

router = APIRouter(tags=["Stats"], prefix="/api", responses={401: responses._401})


class InboundTraffic(BaseModel):
    inbound_tag: str
    protocol: Optional[str] = None
    used_traffic: int


class TransportTraffic(BaseModel):
    transport: str
    protocols: List[str]
    inbounds: int
    used_traffic: int
    online_ips: int = 0


class TopUser(BaseModel):
    username: str
    admin: Optional[str] = None
    used_traffic: int


class StatsOverview(BaseModel):
    total_users: int
    active_users: int
    total_traffic: int
    inbounds: List[InboundTraffic]
    transports: List[TransportTraffic] = []
    top_users: List[TopUser]


@router.get("/stats/overview", response_model=StatsOverview)
def stats_overview(db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)):
    """System-wide statistics. Resellers see only their own users."""
    dbadmin = None if admin.is_sudo else crud_admin(db, admin.username)
    uq = db.query(User)
    if dbadmin is not None:
        uq = uq.filter(User.admin_id == dbadmin.id)

    user_ids = [u.id for u in uq.with_entities(User.id).all()]
    total_users = len(user_ids)
    active_users = uq.filter(User.status == UserStatus.active).count()
    total_traffic = int(db.query(func.coalesce(func.sum(User.used_traffic), 0))
                        .filter(User.id.in_(user_ids)).scalar() or 0) if user_ids else 0

    inbound_rows = (
        db.query(UserInboundUsage.inbound_tag, func.sum(UserInboundUsage.used_traffic))
        .filter(UserInboundUsage.user_id.in_(user_ids))
        .group_by(UserInboundUsage.inbound_tag)
        .all()
    ) if user_ids else []
    inbounds = sorted(
        (InboundTraffic(
            inbound_tag=tag,
            protocol=(xray.config.inbounds_by_tag.get(tag) or {}).get("protocol"),
            used_traffic=int(total or 0),
        ) for tag, total in inbound_rows),
        key=lambda i: i.used_traffic, reverse=True,
    )

    # group traffic (and live connections) by transport, e.g. tcp / ws / grpc / hysteria
    def transport_of(tag: str) -> str:
        inbound = xray.config.inbounds_by_tag.get(tag) or {}
        net = inbound.get("network") or "tcp"
        return net if inbound.get("tls") in (None, "none") else f"{net} + {inbound['tls']}"

    transports: dict = {}
    for tag, inbound in xray.config.inbounds_by_tag.items():
        t = transports.setdefault(transport_of(tag), {"protocols": set(), "inbounds": 0, "used": 0, "ips": 0})
        t["protocols"].add(inbound.get("protocol") or "?")
        t["inbounds"] += 1
    for i in inbounds:
        if i.inbound_tag in xray.config.inbounds_by_tag:
            transports[transport_of(i.inbound_tag)]["used"] += i.used_traffic
    from app.xray import online as _online
    visible = set(user_ids)
    for uid, ips in _online.online_users.items():
        if uid not in visible:
            continue
        for entry in ips.values():
            for tag in set(entry.get("inbounds") or []):
                if tag in xray.config.inbounds_by_tag:
                    transports[transport_of(tag)]["ips"] += 1
    transport_list = sorted(
        (TransportTraffic(transport=name, protocols=sorted(v["protocols"]), inbounds=v["inbounds"],
                          used_traffic=v["used"], online_ips=v["ips"])
         for name, v in transports.items()),
        key=lambda t: (t.used_traffic, t.online_ips), reverse=True,
    )

    top_rows = (
        db.query(User.username, DBAdmin.username, User.used_traffic)
        .outerjoin(DBAdmin, User.admin_id == DBAdmin.id)
        .filter(User.id.in_(user_ids))
        .order_by(User.used_traffic.desc())
        .limit(10).all()
    ) if user_ids else []
    top_users = [TopUser(username=u, admin=a, used_traffic=int(t or 0)) for u, a, t in top_rows]

    return StatsOverview(
        total_users=total_users,
        active_users=active_users,
        total_traffic=total_traffic,
        inbounds=inbounds,
        transports=transport_list,
        top_users=top_users,
    )


def crud_admin(db, username):
    from app.db import crud
    return crud.get_admin(db, username)
