"""Each admin's own profile (Profile page): a picture, a display name, a bio, a contact, and
its own password. Everyone edits only their own; the sudo admins see the others' pictures
and names in the admins list (the creators' stay hidden from them, app/db/visibility.py)."""
import base64
import re
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.db import Session, crud, get_db
from app.db.models import Admin as DBAdmin
from app.db.models import AdminProfile, User
from app.models.admin import Admin, pwd_context
from app.utils import responses
from app.utils.jwt import create_admin_token

router = APIRouter(tags=["Profile"], prefix="/api", responses={401: responses._401})

AVATAR_MAX = 300 * 1024
_AVATAR = re.compile(r"^data:image/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$")
_MAGIC = {"png": b"\x89PNG\r\n\x1a\n", "jpeg": b"\xff\xd8\xff", "webp": b"RIFF"}


class Profile(BaseModel):
    username: str
    role: str                              # creator | sudo | admin
    display_name: str = ""
    bio: str = ""
    contact: str = ""
    avatar: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    users: int = 0
    users_limit: Optional[int] = None
    traffic_limit: Optional[int] = None
    traffic_used: int = 0
    expire_date: Optional[datetime] = None


class ProfileEdit(BaseModel):
    display_name: Optional[str] = None
    bio: Optional[str] = None
    contact: Optional[str] = None
    avatar: Optional[str] = None           # a data: URL, "" removes the picture


class PasswordChange(BaseModel):
    current: str
    new: str


def _own(db: Session, admin: Admin) -> DBAdmin:
    dbadmin = crud.get_admin(db, admin.username)
    if not dbadmin:
        # the .env admin (SUDO_USERNAME) has no account to keep a profile in
        raise HTTPException(400, "This admin has no profile (it comes from the .env file)")
    return dbadmin


def _role(a) -> str:
    return "creator" if getattr(a, "is_creator", False) else "sudo" if a.is_sudo else "admin"


def _out(db: Session, a: DBAdmin) -> Profile:
    p = db.get(AdminProfile, a.id)
    return Profile(
        username=a.username, role=_role(a),
        display_name=(p.display_name if p else "") or "", bio=(p.bio if p else "") or "",
        contact=(p.contact if p else "") or "", avatar=p.avatar if p else None,
        created_at=a.created_at, updated_at=p.updated_at if p else None,
        users=db.query(User.id).filter(User.admin_id == a.id).count(),
        users_limit=a.users_limit, traffic_limit=a.traffic_limit, traffic_used=a.users_usage or 0,
        expire_date=a.expire_date,
    )


def _clean(v: Optional[str], n: int, field: str) -> Optional[str]:
    if v is None:
        return None
    v = "".join(ch for ch in v if ch == "\n" or ord(ch) >= 32).strip()
    if len(v) > n:
        raise HTTPException(400, f"{field}: at most {n} characters")
    return v


def _avatar(v: str) -> Optional[str]:
    if v == "":
        return ""
    m = _AVATAR.match(v or "")
    if not m:
        raise HTTPException(400, "The picture must be a PNG, JPEG or WebP image")
    try:
        raw = base64.b64decode(m.group(2), validate=True)
    except Exception:
        raise HTTPException(400, "The picture must be a PNG, JPEG or WebP image")
    if len(raw) > AVATAR_MAX:
        raise HTTPException(400, "The picture is too big (300 KB at most)")
    kind = m.group(1)
    if not raw.startswith(_MAGIC[kind]) or (kind == "webp" and raw[8:12] != b"WEBP"):
        raise HTTPException(400, "The picture must be a PNG, JPEG or WebP image")
    return v


@router.get("/profile", response_model=Profile)
def get_profile(db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)):
    """my profile"""
    return _out(db, _own(db, admin))


@router.put("/profile", response_model=Profile)
def edit_profile(body: ProfileEdit, db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)):
    """change my picture, name, bio or contact (a field left out stays as it is)"""
    a = _own(db, admin)
    p = db.get(AdminProfile, a.id) or AdminProfile(admin_id=a.id)
    name = _clean(body.display_name, 64, "display_name")
    bio = _clean(body.bio, 500, "bio")
    contact = _clean(body.contact, 100, "contact")
    if name is not None:
        p.display_name = name.replace("\n", " ") or None
    if bio is not None:
        p.bio = re.sub(r"\n{3,}", "\n\n", bio) or None
    if contact is not None:
        p.contact = contact.replace("\n", " ") or None
    if body.avatar is not None:
        p.avatar = _avatar(body.avatar) or None
    p.updated_at = datetime.utcnow().replace(microsecond=0)
    db.add(p)
    db.commit()
    return _out(db, a)


@router.post("/profile/password")
def change_password(body: PasswordChange, request: Request, db: Session = Depends(get_db),
                    admin: Admin = Depends(Admin.get_current)):
    """my own password: the current one first; my other sessions end, this one goes on"""
    from app import login_guard
    a = _own(db, admin)
    ip = login_guard.client_ip(request.client.host if request.client else "", request.headers.get("X-Forwarded-For"))
    wait = login_guard.blocked_for(ip, a.username)
    if wait:
        raise HTTPException(429, f"Too many failed logins: try again in {max(1, wait // 60)} minutes")
    if not pwd_context.verify(body.current, a.hashed_password):
        login_guard.failed(ip, a.username)
        raise HTTPException(400, "The current password is wrong")
    if len(body.new) < 8:
        raise HTTPException(400, "The new password needs 8 characters or more")
    if len(body.new) > 128:
        raise HTTPException(400, "The new password is too long")
    if body.new == body.current:
        raise HTTPException(400, "The new password is the same as the current one")
    a.hashed_password = pwd_context.hash(body.new)
    a.password_reset_at = datetime.utcnow().replace(microsecond=0)
    db.commit()
    return {"access_token": create_admin_token(a.username, a.is_sudo), "token_type": "bearer"}


class PublicProfile(BaseModel):
    display_name: str = ""
    avatar: Optional[str] = None


@router.get("/profiles", response_model=Dict[str, PublicProfile])
def list_profiles(db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """the admins' names and pictures, for the admins list (the ones this admin may see)"""
    out: Dict[str, PublicProfile] = {}
    rows: List = db.query(DBAdmin.username, AdminProfile.display_name, AdminProfile.avatar) \
        .join(AdminProfile, AdminProfile.admin_id == DBAdmin.id).all()
    for username, name, avatar in rows:
        out[username] = PublicProfile(display_name=name or "", avatar=avatar)
    return out
