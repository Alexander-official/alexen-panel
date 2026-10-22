import re
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, field_validator

PANEL_KINDS = ("3xui", "sui")


class ExternalPanelScope(BaseModel):
    # which of our admins this panel's imported configs apply to; empty lists = everyone
    admins: List[str] = []
    groups: List[str] = []


class ExternalPanelBase(BaseModel):
    name: str
    kind: str
    address: str
    panel_path: str = "/"
    scope: ExternalPanelScope = ExternalPanelScope()
    enabled: bool = True
    sync_interval: int = 0       # 0 = off (manual), else refresh traffic/online every N seconds
    live: bool = False           # live mode: refresh fast (~3s), ignores sync_interval
    count_traffic: bool = False  # add the external usage into Alexen users' quota

    @field_validator("sync_interval")
    @classmethod
    def _interval(cls, v):
        v = int(v or 0)
        if v and v < 10:   # a sane floor; live mode is the way to go faster
            v = 10
        return min(v, 86400)

    @field_validator("kind")
    @classmethod
    def _kind(cls, v):
        if v not in PANEL_KINDS:
            raise ValueError(f"kind must be one of {PANEL_KINDS}")
        return v

    @field_validator("address")
    @classmethod
    def _address(cls, v):
        v = (v or "").strip().rstrip("/")
        if not re.match(r"^https?://[^/\s]+", v):
            raise ValueError("address must start with http:// or https:// and a host[:port]")
        return v

    @field_validator("panel_path")
    @classmethod
    def _path(cls, v):
        v = (v or "/").strip()
        if not v.startswith("/"):
            v = "/" + v
        return v


class ExternalPanelCreate(ExternalPanelBase):
    username: str = ""
    password: str = ""
    token: Optional[str] = None


class ExternalPanelModify(BaseModel):
    name: Optional[str] = None
    kind: Optional[str] = None
    address: Optional[str] = None
    panel_path: Optional[str] = None
    scope: Optional[ExternalPanelScope] = None
    enabled: Optional[bool] = None
    username: Optional[str] = None
    password: Optional[str] = None  # empty/None keeps the stored one
    token: Optional[str] = None
    sync_interval: Optional[int] = None
    live: Optional[bool] = None
    count_traffic: Optional[bool] = None

    @field_validator("kind")
    @classmethod
    def _kind(cls, v):
        if v is not None and v not in PANEL_KINDS:
            raise ValueError(f"kind must be one of {PANEL_KINDS}")
        return v


class ExternalPanelResponse(BaseModel):
    id: int
    name: str
    kind: str
    address: str
    panel_path: str
    scope: ExternalPanelScope = ExternalPanelScope()
    enabled: bool
    username: str = ""
    has_password: bool = False
    has_token: bool = False
    sync_interval: int = 0
    live: bool = False
    count_traffic: bool = False
    last_sync: Optional[datetime] = None
    last_error: Optional[str] = None
    created_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

    @field_validator("scope", mode="before")
    @classmethod
    def _scope(cls, v):
        if v is None:
            return ExternalPanelScope()
        if isinstance(v, dict):
            return ExternalPanelScope(**v)
        return v
