"""The activity log (app/activity.py): sudo admins see everything, an admin its own."""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import ActivityLog
from app.models.admin import Admin
from app.utils import responses

router = APIRouter(tags=["Activity"], prefix="/api", responses={401: responses._401})


@router.get("/activity")
def activity(kind: str = Query("all", pattern="^(all|logins|changes|failed)$"),
             admin_name: Optional[str] = Query(None, alias="admin"),
             q: str = "", before: Optional[int] = None, limit: int = Query(100, ge=1, le=500),
             db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)):
    query = db.query(ActivityLog)
    if not admin.is_sudo:
        query = query.filter(ActivityLog.admin == admin.username)
    elif admin_name:
        query = query.filter(ActivityLog.admin == admin_name)
    if kind == "logins":
        query = query.filter(ActivityLog.action.in_(("login", "login_failed")))
    elif kind == "changes":
        query = query.filter(~ActivityLog.action.in_(("login", "login_failed")))
    elif kind == "failed":
        query = query.filter(or_(ActivityLog.action == "login_failed", ActivityLog.status >= 400))
    if q.strip():
        like = f"%{q.strip()}%"
        query = query.filter(or_(ActivityLog.path.like(like), ActivityLog.detail.like(like),
                                 ActivityLog.ip.like(like), ActivityLog.admin.like(like)))
    if before:
        query = query.filter(ActivityLog.id < before)
    rows = query.order_by(ActivityLog.id.desc()).limit(limit).all()
    admins = [a for (a,) in db.query(ActivityLog.admin).distinct().all() if a] if admin.is_sudo else [admin.username]
    return {
        "items": [{
            "id": r.id, "time": int((r.created_at - datetime(1970, 1, 1)).total_seconds()), "admin": r.admin,
            "action": r.action, "method": r.method, "path": r.path, "status": r.status, "ip": r.ip,
            "user_agent": r.user_agent, "detail": r.detail,
        } for r in rows],
        "admins": sorted(admins),
        "more": len(rows) == limit,
    }
