import re
from datetime import datetime
from typing import List, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.db import Session, crud, get_db
from app.utils.jwt import get_admin_payload
from config import SUDOERS

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/admin/token")  # Admin view url


# 3-32 letters, digits and _ . @ - (it goes in URLs: /api/admin/{username})
ADMIN_USERNAME_RE = re.compile(r"^[A-Za-z0-9_.@-]{3,32}$")
ADMIN_PASSWORD_MIN = 6


def _check_password(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    if len(v) < ADMIN_PASSWORD_MIN or not v.strip():
        raise ValueError(f"Password must be at least {ADMIN_PASSWORD_MIN} characters")
    return v


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class Admin(BaseModel):
    username: str
    is_sudo: bool
    # above sudo: manages the sudo admins (add, change, remove, promote / demote)
    is_creator: bool = False
    telegram_id: Optional[int] = None
    discord_webhook: Optional[str] = None
    users_usage: Optional[int] = None
    users_limit: Optional[int] = Field(None, ge=0, description="max users, null/0 means unlimited")
    traffic_limit: Optional[int] = Field(
        None, ge=0, description="max data limit (bytes) the admin can hand out in total, null/0 means unlimited")
    expire_date: Optional[datetime] = None
    max_user_ip_limit: Optional[int] = Field(None, ge=0, description="cap for each user's ip_limit")
    max_user_hwid_limit: Optional[int] = Field(None, ge=0, description="cap for each user's hwid_limit")
    host_groups: List[str] = Field(default_factory=list, description="host groups of the admin's users, empty means all")
    # reseller permissions the sudo/creator grants (a sudo/creator is always allowed)
    can_copy_configs: bool = True
    can_edit_limits: bool = True
    # lifetime counters (read-only)
    users_created: int = 0
    users_deleted: int = 0
    model_config = ConfigDict(from_attributes=True)

    @field_validator("host_groups", mode="before")
    @classmethod
    def none_to_list(cls, v):
        return v or []

    @field_validator("users_usage",  mode='before')
    def cast_to_int(cls, v):
        if v is None:  # Allow None values
            return v
        if isinstance(v, float):  # Allow float to int conversion
            return int(v)
        if isinstance(v, int):  # Allow integers directly
            return v
        raise ValueError("must be an integer or a float, not a string")  # Reject strings

    @classmethod
    def get_admin(cls, token: str, db: Session):
        payload = get_admin_payload(token)
        if not payload:
            return

        if payload['username'] in SUDOERS and payload['is_sudo'] is True:
            # the .env admin is the server owner's own way in
            return cls(username=payload['username'], is_sudo=True, is_creator=True)

        dbadmin = crud.get_admin(db, payload['username'])
        if not dbadmin:
            return

        if dbadmin.password_reset_at:
            if not payload.get("created_at"):
                return
            if dbadmin.password_reset_at > payload.get("created_at"):
                return

        if dbadmin.is_sudo and not getattr(dbadmin, "is_creator", False):
            # from here on this request doesn't see the creators and their users (app/db/visibility.py)
            from app.db.visibility import hide_creators
            hide_creators(db)
        return cls.model_validate(dbadmin)

    @classmethod
    def get_current(cls,
                    db: Session = Depends(get_db),
                    token: str = Depends(oauth2_scheme)):
        admin = cls.get_admin(token, db)
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return admin

    @classmethod
    def check_sudo_admin(cls,
                         db: Session = Depends(get_db),
                         token: str = Depends(oauth2_scheme)):
        admin = cls.get_admin(token, db)
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not admin.is_sudo:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You're not allowed"
            )
        return admin


    @classmethod
    def check_edit_limits(cls,
                          db: Session = Depends(get_db),
                          token: str = Depends(oauth2_scheme)):
        """a reseller may touch a user's IP / device limits, devices and online IPs only
        when the sudo/creator allowed it (can_edit_limits); a sudo/creator always may"""
        admin = cls.get_admin(token, db)
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if not admin.is_sudo and not getattr(admin, "can_edit_limits", True):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You're not allowed to change this user's devices or IPs"
            )
        return admin


    @classmethod
    def check_creator_admin(cls,
                            db: Session = Depends(get_db),
                            token: str = Depends(oauth2_scheme)):
        """the server owner's parts (backups, updates): a creator only"""
        admin = cls.check_sudo_admin(db, token)
        if not admin.is_creator:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You're not allowed"
            )
        return admin


class AdminCreate(Admin):
    password: str
    telegram_id: Optional[int] = None
    discord_webhook: Optional[str] = None

    @property
    def hashed_password(self):
        return pwd_context.hash(self.password)

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str):
        v = (v or "").strip()
        if not ADMIN_USERNAME_RE.match(v):
            raise ValueError("Admin username must be 3-32 characters: letters, digits and _ . @ -")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str):
        return _check_password(v)

    @field_validator("discord_webhook")
    @classmethod
    def validate_discord_webhook(cls, value):
        if value and not value.startswith("https://discord.com"):
            raise ValueError("Discord webhook must start with 'https://discord.com'")
        return value


class AdminModify(BaseModel):
    password: Optional[str] = None
    is_sudo: bool
    is_creator: Optional[bool] = None
    telegram_id: Optional[int] = None
    discord_webhook: Optional[str] = None
    users_limit: Optional[int] = Field(None, ge=0)
    traffic_limit: Optional[int] = Field(None, ge=0)
    expire_date: Optional[datetime] = None
    max_user_ip_limit: Optional[int] = Field(None, ge=0)
    max_user_hwid_limit: Optional[int] = Field(None, ge=0)
    host_groups: Optional[List[str]] = None
    can_copy_configs: Optional[bool] = None
    can_edit_limits: Optional[bool] = None

    @property
    def hashed_password(self):
        if self.password:
            return pwd_context.hash(self.password)

    @field_validator("password", mode="before")
    @classmethod
    def validate_password(cls, v):
        # empty: keep the current password
        return _check_password(v or None)

    @field_validator("discord_webhook")
    @classmethod
    def validate_discord_webhook(cls, value):
        if value and not value.startswith("https://discord.com"):
            raise ValueError("Discord webhook must start with 'https://discord.com'")
        return value


class AdminPartialModify(AdminModify):
    __annotations__ = {k: Optional[v] for k, v in AdminModify.__annotations__.items()}


class AdminInDB(Admin):
    username: str
    hashed_password: str

    def verify_password(self, plain_password):
        return pwd_context.verify(plain_password, self.hashed_password)


class AdminValidationResult(BaseModel):
    username: str
    is_sudo: bool
