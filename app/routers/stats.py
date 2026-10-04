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


class TopUser(BaseModel):
    username: str
    admin: Optional[str] = None
    used_traffic: int


class StatsOverview(BaseModel):
    total_users: int
    active_users: int
    total_traffic: int
    inbounds: List[InboundTraffic]
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
        top_users=top_users,
    )


def crud_admin(db, username):
    from app.db import crud
    return crud.get_admin(db, username)
