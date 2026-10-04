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
