"""Important notifications (alerts), messages between the sudo admins and each
admin, and warnings the sudo admin puts on users (shown to their admin)."""
import mimetypes
import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import antitheft
from app.db import crud, get_db
from app.db.models import Admin as DBAdmin
from app.db.models import AdminMessage, Alert, User
from app.models.admin import Admin
from app.utils import responses
from config import SQLALCHEMY_DATABASE_URL

router = APIRouter(tags=["Notifications"], prefix="/api", responses={401: responses._401})

EPOCH = datetime(1970, 1, 1)
ts = lambda d: int((d - EPOCH).total_seconds()) if d else 0

# chat attachments: images/audio/video up to 25 MB, stored on disk next to the DB
MEDIA_MAX = 25 * 1024 * 1024
MEDIA_KINDS = {"image": "image/", "audio": "audio/", "video": "video/"}


def _media_dir() -> str:
    """folder for chat attachments, kept beside the sqlite DB (so backups include it)"""
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        db = "/" + SQLALCHEMY_DATABASE_URL.split("sqlite://", 1)[-1].lstrip("/")
        base = os.path.dirname(db) or "."
    else:
        base = os.environ.get("MEDIA_DIR", "/var/lib/marzban")
    path = os.path.join(base, "chat-media")
    os.makedirs(path, exist_ok=True)
    return path


def _dump(m: AdminMessage, sender) -> dict:
    d = {"id": m.id, "time": ts(m.created_at), "sender": sender(m.sender),
         "from_sudo": m.from_sudo, "text": m.text, "read": m.read,
         "edited": ts(m.edited_at)}
    if m.media_path:
        d["media"] = {"type": m.media_type, "mime": m.media_mime,
                      "name": m.media_name, "size": m.media_size or 0}
    return d


# ---------------- anti-theft settings ----------------
@router.get("/anti-theft", response_model=antitheft.TheftSettings)
def read_anti_theft(db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    return antitheft.load(db)


@router.put("/anti-theft", response_model=antitheft.TheftSettings)
def update_anti_theft(body: antitheft.TheftSettings, db: Session = Depends(get_db),
                      admin: Admin = Depends(Admin.check_sudo_admin)):
    return antitheft.save(db, body)


# ---------------- alerts ----------------
def _alerts_query(db: Session, admin: Admin):
    q = db.query(Alert)
    return q if admin.is_sudo else q.filter(Alert.admin == admin.username)


@router.get("/alerts")
def list_alerts(unread: bool = False, before: Optional[int] = None, limit: int = 100,
                db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)):
    q = _alerts_query(db, admin)
    if unread:
        q = q.filter(Alert.read.is_(False))
    if before:
        q = q.filter(Alert.id < before)
    rows = q.order_by(Alert.id.desc()).limit(min(500, max(1, limit))).all()
    return {"items": [{"id": a.id, "time": ts(a.created_at), "kind": a.kind, "username": a.username, "admin": a.admin,
                       "title": a.title, "detail": a.detail, "read": a.read} for a in rows],
            "more": len(rows) == limit}


class ReadBody(BaseModel):
    ids: List[int] = []
    all: bool = False


@router.post("/alerts/read")
def read_alerts(body: ReadBody, db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)):
    q = _alerts_query(db, admin)
    if not body.all:
        q = q.filter(Alert.id.in_(body.ids or [-1]))
    q.update({Alert.read: True}, synchronize_session=False)
    db.commit()
    return {"ok": True}


# ---------------- messages ----------------
def _check_thread(db: Session, admin: Admin, thread: str) -> str:
    if not admin.is_sudo:
        if thread != admin.username:
            raise HTTPException(403, "You can only write to the sudo admin")
        return thread
    target = crud.get_admin(db, thread)
    if not target or target.is_sudo:
        raise HTTPException(404, "Admin not found")
    return thread


def _sender(db: Session):
    """a creator's name is hidden from the sudo admins (app/db/visibility.py): shown as "sudo" """
    from app.db import visibility
    hidden = visibility.hidden_names(db)
    if not hidden:
        return lambda name: name
    return lambda name: "sudo" if name in hidden else name


@router.get("/messages/threads")
def message_threads(db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)):
    """sudo: one thread per admin; an admin: its own thread with the sudo admins"""
    if admin.is_sudo:
        names = [a.username for a in db.query(DBAdmin).filter(DBAdmin.is_sudo.is_(False)).order_by(DBAdmin.username).all()]
    else:
        names = [admin.username]
    out = []
    sender = _sender(db)
    for name in names:
        last = db.query(AdminMessage).filter(AdminMessage.thread == name).order_by(AdminMessage.id.desc()).first()
        unread = db.query(func.count(AdminMessage.id)).filter(
            AdminMessage.thread == name, AdminMessage.read.is_(False),
            AdminMessage.from_sudo.is_(not admin.is_sudo)).scalar()
        out.append({"thread": name, "unread": int(unread or 0),
                    "last": {"text": last.text[:120], "media": last.media_type,
                             "time": ts(last.created_at), "sender": sender(last.sender)} if last else None})
    out.sort(key=lambda x: -(x["last"]["time"] if x["last"] else 0))
    return out


@router.get("/messages/{thread}")
def read_messages(thread: str, after: int = 0, db: Session = Depends(get_db),
                  admin: Admin = Depends(Admin.get_current)):
    _check_thread(db, admin, thread)
    rows = db.query(AdminMessage).filter(AdminMessage.thread == thread, AdminMessage.id > after) \
        .order_by(AdminMessage.id.desc()).limit(300).all()[::-1]
    # what the other side wrote is now read
    db.query(AdminMessage).filter(AdminMessage.thread == thread, AdminMessage.read.is_(False),
                                  AdminMessage.from_sudo.is_(not admin.is_sudo)) \
        .update({AdminMessage.read: True}, synchronize_session=False)
    db.commit()
    sender = _sender(db)
    return [_dump(m, sender) for m in rows]


class MessageIn(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)


@router.post("/messages/{thread}")
def send_message(thread: str, body: MessageIn, db: Session = Depends(get_db),
                 admin: Admin = Depends(Admin.get_current)):
    _check_thread(db, admin, thread)
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Write something first")
    m = AdminMessage(thread=thread, sender=admin.username, from_sudo=admin.is_sudo, text=text,
                     created_at=datetime.utcnow())
    db.add(m)
    db.commit()
    return {"id": m.id}


@router.post("/messages/{thread}/media")
async def send_media(thread: str, file: UploadFile = File(...), text: str = Form(""),
                     db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)):
    """attach an image/audio/video (optionally with a caption)"""
    _check_thread(db, admin, thread)
    ctype = (file.content_type or "").lower()
    kind = next((k for k, pre in MEDIA_KINDS.items() if ctype.startswith(pre)), None)
    if not kind:
        raise HTTPException(400, "Only image, audio or video files are allowed")
    data = await file.read(MEDIA_MAX + 1)
    if not data:
        raise HTTPException(400, "Empty file")
    if len(data) > MEDIA_MAX:
        raise HTTPException(413, "File is too large (max 25 MB)")
    ext = os.path.splitext(file.filename or "")[1][:10] or mimetypes.guess_extension(ctype) or ""
    stored = f"{uuid.uuid4().hex}{ext}"
    with open(os.path.join(_media_dir(), stored), "wb") as f:
        f.write(data)
    m = AdminMessage(thread=thread, sender=admin.username, from_sudo=admin.is_sudo,
                     text=(text or "").strip()[:4000], created_at=datetime.utcnow(),
                     media_path=stored, media_type=kind, media_mime=ctype,
                     media_name=(file.filename or stored)[:255], media_size=len(data))
    db.add(m)
    db.commit()
    return {"id": m.id}


@router.get("/messages/media/{msg_id}")
def get_media(msg_id: int, db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)):
    """stream a message attachment (access checked against the message's thread)"""
    m = db.query(AdminMessage).filter(AdminMessage.id == msg_id).first()
    if not m or not m.media_path:
        raise HTTPException(404, "Not found")
    _check_thread(db, admin, m.thread)
    path = os.path.join(_media_dir(), m.media_path)
    if not os.path.isfile(path):
        raise HTTPException(404, "File missing")
    return FileResponse(path, media_type=m.media_mime or "application/octet-stream",
                        filename=m.media_name or m.media_path)


class MessageEdit(BaseModel):
    text: str = Field(..., min_length=1, max_length=4000)


@router.put("/messages/{thread}/{msg_id}")
def edit_message(thread: str, msg_id: int, body: MessageEdit, db: Session = Depends(get_db),
                 admin: Admin = Depends(Admin.get_current)):
    """edit the text of your own message"""
    _check_thread(db, admin, thread)
    m = db.query(AdminMessage).filter(AdminMessage.id == msg_id, AdminMessage.thread == thread).first()
    if not m:
        raise HTTPException(404, "Message not found")
    if m.sender != admin.username:
        raise HTTPException(403, "You can only edit your own messages")
    text = body.text.strip()
    if not text:
        raise HTTPException(400, "Write something first")
    m.text = text
    m.edited_at = datetime.utcnow()
    db.commit()
    return {"id": m.id}


@router.delete("/messages/{thread}/{msg_id}")
def delete_message(thread: str, msg_id: int, db: Session = Depends(get_db),
                   admin: Admin = Depends(Admin.get_current)):
    """delete your own message (and its attachment, if any)"""
    _check_thread(db, admin, thread)
    m = db.query(AdminMessage).filter(AdminMessage.id == msg_id, AdminMessage.thread == thread).first()
    if not m:
        raise HTTPException(404, "Message not found")
    if m.sender != admin.username:
        raise HTTPException(403, "You can only delete your own messages")
    if m.media_path:
        try:
            os.remove(os.path.join(_media_dir(), m.media_path))
        except OSError:
            pass
    db.delete(m)
    db.commit()
    return {"detail": "deleted"}


# ---------------- counts for the bell ----------------
@router.get("/notify/counts")
def notify_counts(db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)):
    alerts = _alerts_query(db, admin).filter(Alert.read.is_(False)).count()
    mq = db.query(func.count(AdminMessage.id)).filter(AdminMessage.read.is_(False),
                                                      AdminMessage.from_sudo.is_(not admin.is_sudo))
    if not admin.is_sudo:
        mq = mq.filter(AdminMessage.thread == admin.username)
    warnings = 0
    if not admin.is_sudo:
        dbadmin = crud.get_admin(db, admin.username)
        warnings = db.query(func.count(User.id)).filter(User.admin_id == dbadmin.id, User.warning.isnot(None)).scalar() if dbadmin else 0
    return {"alerts": alerts, "messages": int(mq.scalar() or 0), "warnings": int(warnings or 0)}


# ---------------- warnings on users ----------------
class WarningIn(BaseModel):
    text: str = Field("", max_length=500)


@router.put("/user/{username}/warning")
def set_user_warning(username: str, body: WarningIn, db: Session = Depends(get_db),
                     admin: Admin = Depends(Admin.check_sudo_admin)):
    user = crud.get_user(db, username)
    if not user:
        raise HTTPException(404, "User not found")
    text = body.text.strip()
    user.warning = text or None
    user.warning_at = datetime.utcnow() if text else None
    db.commit()
    return {"warning": user.warning, "warning_at": ts(user.warning_at)}
