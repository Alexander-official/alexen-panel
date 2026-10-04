from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import Admin as DBAdmin
from app.db.models import User
from app.dependencies import get_validated_user
from app.models.admin import Admin
from app.models.user import UserResponse
from app.utils import responses
from app.xray import ip_limit, online

router = APIRouter(tags=["Online"], prefix="/api", responses={401: responses._401})


class OnlineIP(BaseModel):
    ip: str
    nodes: List[str]
    inbounds: List[str]
    last_seen: datetime
    blocked: bool = False


class UserOnlineIPs(BaseModel):
    username: str
    ip_limit: Optional[int] = None
    ips: List[OnlineIP]


class OnlineUser(BaseModel):
    username: str
    admin: Optional[str] = None
    ip_count: int
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

    return {uid: (username, admin_username, counts[uid], limit)
            for uid, username, admin_username, limit in query.all()}


@router.get("/online", response_model=OnlineSummary)
def get_online_summary(
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.get_current),
):
    """Online users right now (main core and nodes), the ones with the most IPs first"""
    visible = _visible_ip_counts(db, admin)
    users = sorted(
        (OnlineUser(username=username, admin=admin_username, ip_count=count, ip_limit=user_ip_limit,
                    blocked_ips=len(ip_limit.blocked_ips.get(uid, ())))
         for uid, (username, admin_username, count, user_ip_limit) in visible.items()),
        key=lambda u: u.ip_count, reverse=True,
    )
    return OnlineSummary(
        online_users=len(users),
        online_ips=sum(u.ip_count for u in users),
        updated_at=online.updated_at,
        users=users[:limit],
    )


@router.get("/user/{username}/online-ips", response_model=UserOnlineIPs,
            responses={403: responses._403, 404: responses._404})
def get_user_online_ips(dbuser: UserResponse = Depends(get_validated_user)):
    """IPs the user is connected from right now"""
    ips = [
        OnlineIP(ip=ip, nodes=entry["nodes"], inbounds=entry["inbounds"],
                 last_seen=datetime.utcfromtimestamp(entry["last_seen"]),
                 blocked=ip in ip_limit.blocked_ips.get(dbuser.id, ()))
        for ip, entry in online.get_user_ips(dbuser.id).items()
    ]
    ips.sort(key=lambda i: (i.blocked, -i.last_seen.timestamp()))
    return UserOnlineIPs(username=dbuser.username, ip_limit=dbuser.ip_limit, ips=ips)
