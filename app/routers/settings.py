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
    # Each title/announce may be plain text or "base64:<...>". Empty means use the default.
    profile_title: Optional[str] = ""
    announce: Optional[str] = ""
    # shown instead of the normal title/announce when the user is in that state
    expired_title: Optional[str] = ""
    expired_announce: Optional[str] = ""
    disabled_title: Optional[str] = ""
    disabled_announce: Optional[str] = ""
    limited_title: Optional[str] = ""
    limited_announce: Optional[str] = ""
    # shown when the user is within `near_expire_days` of expiring
    near_expire_days: int = 1
    near_expire_title: Optional[str] = ""
    near_expire_announce: Optional[str] = ""


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
