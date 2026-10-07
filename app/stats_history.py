"""Hourly history kept for the overview page and the statistics charts:
  inbound     traffic of each inbound (bytes in that hour, all servers)
  online      most users connected at once in that hour
  online_ips  most IPs connected at once in that hour
  users       users per status (last value of the hour)
Node traffic per hour is in node_usages already; per-user in node_user_usages."""
import threading
from datetime import datetime, timedelta
from typing import Dict

from app import logger

_lock = threading.Lock()
KEEP_DAYS = 400


def hour(dt: datetime = None) -> datetime:
    return (dt or datetime.utcnow()).replace(minute=0, second=0, microsecond=0)


def _put(db, kind: str, values: Dict[str, int], mode: str):
    """mode: add (sum up), max (keep the highest), set (last value)"""
    from app.db.models import StatHistory
    at = hour()
    rows = {r.key: r for r in db.query(StatHistory).filter(
        StatHistory.created_at == at, StatHistory.kind == kind, StatHistory.key.in_(list(values))).all()}
    for key, value in values.items():
        value = int(value or 0)
        row = rows.get(key)
        if row is None:
            db.add(StatHistory(created_at=at, kind=kind, key=key[:128], value=value))
        elif mode == "add":
            row.value = (row.value or 0) + value
        elif mode == "max":
            row.value = max(row.value or 0, value)
        else:
            row.value = value


def record_inbounds(usage: Dict[str, int]):
    """called with the traffic each inbound carried since the last call"""
    usage = {k: v for k, v in usage.items() if v}
    if not usage:
        return
    from app.db import GetDB
    with _lock:
        try:
            with GetDB() as db:
                _put(db, "inbound", usage, "add")
                db.commit()
        except Exception as e:
            logger.warning(f"stat history: {e}")


def snapshot():
    """scheduler job: online counts and users per status"""
    from sqlalchemy import func
    from app.db import GetDB
    from app.db.models import StatHistory, User
    from app.xray import online
    with _lock:
        try:
            with GetDB() as db:
                users = online.online_users
                _put(db, "online", {"": len(users)}, "max")
                _put(db, "online_ips", {"": sum(len(ips) for ips in users.values())}, "max")
                counts = dict(db.query(User.status, func.count(User.id)).group_by(User.status).all())
                _put(db, "users", {getattr(k, "value", str(k)): v for k, v in counts.items()}, "set")
                db.commit()
                if datetime.utcnow().minute < 5:
                    db.query(StatHistory).filter(
                        StatHistory.created_at < datetime.utcnow() - timedelta(days=KEEP_DAYS)).delete()
                    db.commit()
        except Exception as e:
            logger.warning(f"stat history: {e}")
