"""Anti-theft: a user whose traffic in a short time goes past what a person
uses (a shared or stolen subscription, a seedbox...) is reported in the
important notifications, and can be switched off on the spot.

Each rule: more than `max_gb` within `window_minutes`. The traffic comes from
the usage recorder (every few seconds) and is kept in memory per user."""
import json
import threading
import time
from collections import defaultdict, deque
from typing import Dict, List

from pydantic import BaseModel, Field

from app import logger

SETTINGS_KEY = "anti_theft"
MAX_WINDOW = 24 * 60


class TheftRule(BaseModel):
    id: str
    name: str = Field("", max_length=80)
    window_minutes: int = Field(60, ge=1, le=MAX_WINDOW)
    max_gb: float = Field(20, gt=0, le=100000)
    action: str = Field("notify", pattern="^(notify|disable)$")
    enabled: bool = True


class TheftSettings(BaseModel):
    enabled: bool = False
    rules: List[TheftRule] = []
    ignore: List[str] = []          # usernames never checked


_lock = threading.Lock()
_traffic: Dict[int, deque] = defaultdict(deque)     # uid -> (time, bytes)
_last_alert: Dict[tuple, float] = {}                # (uid, rule id) -> time
_cache = {"at": 0.0, "s": TheftSettings()}


def load(db=None) -> TheftSettings:
    from app.db import GetDB, crud
    if db is not None:
        return TheftSettings(**(crud.get_setting(db, SETTINGS_KEY) or {}))
    if time.time() - _cache["at"] < 30:
        return _cache["s"]
    with GetDB() as session:
        s = TheftSettings(**(crud.get_setting(session, SETTINGS_KEY) or {}))
    _cache.update(at=time.time(), s=s)
    return s


def save(db, s: TheftSettings) -> TheftSettings:
    from app.db import crud
    crud.set_setting(db, SETTINGS_KEY, s.model_dump())
    _cache.update(at=time.time(), s=s)
    return s


def feed(usage: List[dict]):
    """called by the usage recorder with [{uid, value}] (bytes since the last call)"""
    try:
        s = load()
        if not s.enabled or not any(r.enabled for r in s.rules):
            return
        now = time.time()
        keep = max(r.window_minutes for r in s.rules if r.enabled) * 60
        hits = []
        with _lock:
            for u in usage:
                uid, value = int(u["uid"]), int(u["value"] or 0)
                if value <= 0:
                    continue
                q = _traffic[uid]
                q.append((now, value))
                while q and q[0][0] < now - keep:
                    q.popleft()
                for r in s.rules:
                    if not r.enabled:
                        continue
                    since = now - r.window_minutes * 60
                    used = sum(v for t, v in q if t >= since)
                    if used > r.max_gb * 1024 ** 3 and now - _last_alert.get((uid, r.id), 0) > r.window_minutes * 60:
                        _last_alert[(uid, r.id)] = now
                        hits.append((uid, r, used))
            # forget users that went quiet
            for uid in [k for k, q in _traffic.items() if not q or q[-1][0] < now - keep]:
                _traffic.pop(uid, None)
        for uid, r, used in hits:
            _report(uid, r, used, s)
    except Exception as e:
        logger.warning(f"anti-theft: {e}")


def _report(uid: int, r: TheftRule, used: int, s: TheftSettings):
    from app.db import GetDB
    from app.db.models import Alert, User
    from app.models.user import UserStatus
    with GetDB() as db:
        user = db.query(User).filter(User.id == uid).first()
        if not user or user.username in s.ignore:
            return
        disabled = False
        if r.action == "disable" and user.status == UserStatus.active:
            user.status = UserStatus.disabled
            disabled = True
        db.add(Alert(kind="theft", username=user.username, admin=user.admin.username if user.admin else None,
                     title=r.name or "Suspicious traffic",
                     detail=json.dumps({"rule": r.id, "used": used, "max_gb": r.max_gb,
                                        "window_minutes": r.window_minutes, "disabled": disabled,
                                        "ips": _ips(uid)})))
        db.commit()
        if disabled:
            from app import xray
            db.refresh(user)
            xray.operations.remove_user(user)
    logger.warning(f"anti-theft: {r.name or r.id}: user #{uid} used {used / 1024 ** 3:.1f} GB in {r.window_minutes} min"
                   + (" (disabled)" if disabled else ""))


def _ips(uid: int) -> list:
    try:
        from app.xray import online
        return sorted(online.get_user_ips(uid))[:20]
    except Exception:
        return []
