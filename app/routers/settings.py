from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import crud, get_db
from app.models.admin import Admin
from app.utils import responses

router = APIRouter(tags=["Settings"], prefix="/api", responses={401: responses._401})

SUB_SETTINGS_KEY = "subscription"


class SubscriptionSettings(BaseModel):
    # A "sub page" template per user state. Each may contain directives
    # (#profile-title, #announce, #support-url, with optional "base64:") and
    # placeholders like {username} {used} {limit} {remaining} {expiretime}.
    default_template: Optional[str] = ""
    expired_template: Optional[str] = ""
    disabled_template: Optional[str] = ""
    limited_template: Optional[str] = ""
    near_expire_template: Optional[str] = ""
    near_expire_days: int = 1


def get_subscription_settings(db: Session) -> SubscriptionSettings:
    return SubscriptionSettings(**(crud.get_setting(db, SUB_SETTINGS_KEY) or {}))


@router.get("/sub-settings", response_model=SubscriptionSettings)
def read_sub_settings(db: Session = Depends(get_db),
                      admin: Admin = Depends(Admin.check_sudo_admin)):
    """Subscription page settings: announcement, profile title and per-state metadata"""
    return get_subscription_settings(db)


@router.put("/sub-settings", response_model=SubscriptionSettings)
def update_sub_settings(settings: SubscriptionSettings,
                        db: Session = Depends(get_db),
                        admin: Admin = Depends(Admin.check_sudo_admin)):
    crud.set_setting(db, SUB_SETTINGS_KEY, settings.model_dump())
    return settings


# ---- external configs + link ordering (see app/subscription/external.py) ----
from typing import List as _List

from fastapi import HTTPException
from app.subscription import external as _external


class ExternalPreviewItem(BaseModel):
    remark: str
    link: str
    source: str


class ExternalPreview(BaseModel):
    username: str
    items: _List[ExternalPreviewItem]


def _check_external(settings: "_external.ExternalSettings"):
    if settings.generated_sort not in _external.GENERATED_SORTS:
        raise HTTPException(400, "unknown generated_sort")
    if settings.external_sort not in _external.EXTERNAL_SORTS:
        raise HTTPException(400, "unknown external_sort")
    for c in settings.configs:
        if c.position not in ("top", "bottom"):
            raise HTTPException(400, f"{c.name}: position must be top or bottom")
        if c.links.strip() and not c.link_list():
            raise HTTPException(400, f"{c.name or 'config'}: no valid link (expected scheme://...)")


@router.get("/external-configs", response_model=_external.ExternalSettings)
def read_external_configs(db: Session = Depends(get_db),
                          admin: Admin = Depends(Admin.check_sudo_admin)):
    """Extra config links added to every link-based subscription, and the order of links"""
    return _external.load(db)


@router.put("/external-configs", response_model=_external.ExternalSettings)
def update_external_configs(settings: _external.ExternalSettings,
                            db: Session = Depends(get_db),
                            admin: Admin = Depends(Admin.check_sudo_admin)):
    _check_external(settings)
    return _external.save(db, settings)


@router.post("/external-configs/preview", response_model=ExternalPreview)
def preview_external_configs(settings: _external.ExternalSettings,
                             username: Optional[str] = None,
                             db: Session = Depends(get_db),
                             admin: Admin = Depends(Admin.check_sudo_admin)):
    """What a user's link subscription would look like with these (unsaved) settings"""
    _check_external(settings)
    from app.db.models import User as _User
    from app.models.user import UserResponse
    from app.subscription.share import generate_v2ray_links, setup_format_variables

    dbuser = crud.get_user(db, username) if username else db.query(_User).order_by(_User.id).first()
    if not dbuser:
        raise HTTPException(404, "User not found")
    user = UserResponse.model_validate(dbuser)
    host_groups = (dbuser.admin.host_groups or None) if dbuser.admin else None
    links = generate_v2ray_links(user.proxies, user.inbounds, user.__dict__, False, host_groups)
    status = getattr(user.status, "value", user.status)
    pairs = _external.apply(links, active=status in ("active", "on_hold"), host_groups=host_groups,
                            variables=setup_format_variables(user.__dict__), settings=settings, tagged=True)
    return ExternalPreview(
        username=user.username,
        items=[ExternalPreviewItem(remark=_external._remark(l), link=l, source=src) for l, src in pairs],
    )
