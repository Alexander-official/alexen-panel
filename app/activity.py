"""Activity log: every sign-in (and failed attempt) and every change made
through the API, with the admin, time, IP and device (user agent). Request
bodies are kept with secrets removed. Reads (GET) are not logged."""
import json
import re
import threading
import urllib.parse
from datetime import datetime, timedelta
from typing import Optional

from app import logger

KEEP_DAYS = 365
MAX_BODY = 64 * 1024
MAX_DETAIL = 4000
SECRET = re.compile(r"pass|secret|private|token|key$|^key|psk|cert|credential", re.IGNORECASE)
# noisy calls that change nothing worth keeping
SKIP = re.compile(r"^/api/(external-configs/preview|sub-webpage/preview|sub-domain/example|core/outbound-from-link|overview|traffic/live|node-install/)")


def _redact(value, depth=0):
    if depth > 6:
        return "…"
    if isinstance(value, dict):
        return {k: ("•••" if SECRET.search(str(k)) and v not in (None, "", []) else _redact(v, depth + 1))
                for k, v in value.items()}
    if isinstance(value, list):
        out = [_redact(v, depth + 1) for v in value[:50]]
        if len(value) > 50:
            out.append(f"… +{len(value) - 50}")
        return out
    if isinstance(value, str) and len(value) > 300:
        return value[:300] + "…"
    return value


def _detail(body: bytes, content_type: str) -> Optional[str]:
    if not body:
        return None
    try:
        if "json" in content_type:
            data = json.loads(body)
        elif "form" in content_type:
            data = {k: v[0] if len(v) == 1 else v for k, v in urllib.parse.parse_qs(body.decode()).items()}
        else:
            return None
    except Exception:
        return None
    text = json.dumps(_redact(data), ensure_ascii=False, separators=(",", ":"))
    return text[:MAX_DETAIL]


def _admin_of(headers: dict) -> Optional[str]:
    auth = headers.get("authorization", "")
    if not auth.lower().startswith("bearer "):
        return None
    from app.utils.jwt import get_admin_payload
    payload = get_admin_payload(auth[7:].strip())
    return payload["username"] if payload else None


def _client_ip(scope, headers: dict) -> str:
    fwd = headers.get("x-forwarded-for")
    if fwd:
        return fwd.split(",")[0].strip()[:64]
    client = scope.get("client")
    return (client[0] if client else "")[:64]


def record(**row):
    def write():
        try:
            from app.db import GetDB
            from app.db.models import ActivityLog
            with GetDB() as db:
                db.add(ActivityLog(created_at=datetime.utcnow(), **row))
                db.commit()
        except Exception as e:
            logger.warning(f"activity log: {e}")
    threading.Thread(target=write, daemon=True).start()


class ActivityMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http" or scope.get("method") in ("GET", "HEAD", "OPTIONS") \
                or not scope.get("path", "").startswith("/api/") or SKIP.match(scope.get("path", "")):
            return await self.app(scope, receive, send)
        headers = {k.decode().lower(): v.decode(errors="replace") for k, v in scope.get("headers", [])}
        # keep a copy of the body as it goes to the app
        chunks, size = [], 0

        async def recv():
            nonlocal size
            message = await receive()
            if message.get("type") == "http.request" and size < MAX_BODY:
                part = message.get("body", b"")
                chunks.append(part[:MAX_BODY - size])
                size += len(part)
            return message

        status = {"code": 0}

        async def snd(message):
            if message.get("type") == "http.response.start":
                status["code"] = message.get("status", 0)
            await send(message)

        try:
            await self.app(scope, recv, snd)
        finally:
            try:
                path = scope.get("path", "")
                method = scope.get("method", "")
                body = b"".join(chunks)
                ctype = headers.get("content-type", "")
                admin = _admin_of(headers)
                action = f"{method} {path}"[:64]
                if path == "/api/admin/token":
                    form = urllib.parse.parse_qs(body.decode(errors="replace")) if body else {}
                    admin = (form.get("username") or [""])[0][:64] or None
                    action = "login" if status["code"] == 200 else "login_failed"
                    detail = None
                else:
                    detail = _detail(body, ctype)
                record(admin=admin, action=action, method=method, path=path[:256], status=status["code"],
                       ip=_client_ip(scope, headers), user_agent=headers.get("user-agent", "")[:400],
                       detail=detail)
            except Exception as e:
                logger.warning(f"activity log: {e}")


def cleanup():
    from app.db import GetDB
    from app.db.models import ActivityLog
    try:
        with GetDB() as db:
            db.query(ActivityLog).filter(ActivityLog.created_at < datetime.utcnow() - timedelta(days=KEEP_DAYS)).delete()
            db.commit()
    except Exception as e:
        logger.warning(f"activity log cleanup: {e}")
