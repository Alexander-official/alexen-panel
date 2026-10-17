"""The panel's license: what it allows, and activating a key (the creator)."""
from typing import Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app import license as lic
from app.models.admin import Admin
from app.utils import responses

router = APIRouter(tags=["License"], prefix="/api/license", responses={401: responses._401})


class LicenseState(BaseModel):
    status: str                          # active | grace | expired | unlicensed | invalid | moved | suspended | revoked
    locked: bool
    customer: str = ""
    expires: int = 0                     # 0: no end date
    activated: int = 0
    days_left: Optional[int] = None
    grace_until: int = 0
    limits: Dict[str, int] = {}          # 0: no limit
    usage: Dict[str, Optional[int]] = {}
    # a message the seller sent to this panel (shown to every admin until dismissed)
    message: str = ""
    message_at: int = 0
    # the creator only
    key: Optional[str] = None
    install_id: Optional[str] = None
    last_check: Optional[int] = None
    last_attempt: Optional[int] = None
    last_error: Optional[str] = None
    has_key: Optional[bool] = None


def _mask(k: str) -> str:
    return f"{k[:9]}•••••-•••••-{k[-5:]}" if len(k) > 20 else k


def _out(admin: Admin) -> LicenseState:
    st = lic.status()
    out = LicenseState(**{k: st[k] for k in ("status", "locked", "customer", "expires", "activated", "days_left",
                                              "grace_until", "limits")}, usage=lic._usage())
    out.message = st.get("message") or ""
    out.message_at = st.get("message_at") or 0
    if admin.is_creator:
        out.key = _mask(lic.stored_key()) if lic.stored_key() else None
        out.install_id = lic.install_id()[:8]
        out.last_check = st["last_check"] or None
        out.last_attempt = st["last_attempt"] or None
        out.last_error = st["last_error"] or None
        out.has_key = st["has_key"]
    return out


@router.get("", response_model=LicenseState)
def get_license(admin: Admin = Depends(Admin.get_current)):
    """the license: everyone sees what it allows, the creator also how it talks to the server"""
    return _out(admin)


class ActivateBody(BaseModel):
    key: str = ""


@router.post("/activate", response_model=LicenseState)
def activate(body: ActivateBody, admin: Admin = Depends(Admin.check_creator_admin)):
    """bind a license key to this server (an empty key: the one saved here again)"""
    key = body.key.strip() or lic.stored_key()
    if not key:
        raise HTTPException(400, "Enter the license key")
    try:
        lic.activate(key)
    except lic.LicenseError as e:
        raise HTTPException(400, str(e))
    return _out(admin)


@router.post("/check", response_model=LicenseState)
def check_now(admin: Admin = Depends(Admin.check_creator_admin)):
    """ask the license server now (after a renewal, a change of limits)"""
    if not lic.stored_key():
        raise HTTPException(400, "Enter the license key")
    lic.check()
    return _out(admin)


@router.post("/dismiss-message")
def dismiss_message(_: Admin = Depends(Admin.get_current)):
    """any admin can dismiss the seller's message once they've read it"""
    lic.dismiss_message()
    return {"ok": True}
