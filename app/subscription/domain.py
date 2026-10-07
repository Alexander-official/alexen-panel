"""Domain settings for subscription links, managed from the panel: which address
the links use (instead of XRAY_SUBSCRIPTION_URL_PREFIX), the path word (instead
of "sub"), and an optional last part after the token ("{username}" or any text).

  https://<domain>/<path>/<token>[/<suffix>]

Old links keep working: the token is what identifies the user, the default
/sub/ path is always served, and anything after the token is accepted."""
import re
import threading
import time
from typing import Dict, Optional
from urllib.parse import quote

from pydantic import BaseModel, Field, field_validator

from config import XRAY_SUBSCRIPTION_PATH, XRAY_SUBSCRIPTION_URL_PREFIX

SETTINGS_KEY = "sub_domain"
# the client-type routes under /<path>/<token>/ (app/routers/subscription.py)
RESERVED = {"info", "usage", "sing-box", "clash-meta", "clash", "outline", "v2ray", "v2ray-json"}
_PATH_RE = re.compile(r"^[A-Za-z0-9_-]{1,64}$")


class AdminDomain(BaseModel):
    """an admin's own address for its users' links; empty fields: the general ones"""
    url_prefix: str = Field("", max_length=300)
    suffix: Optional[str] = Field(None, max_length=100)

    @field_validator("url_prefix")
    @classmethod
    def _url(cls, v: str) -> str:
        v = v.strip().rstrip("/")
        if v and not re.match(r"^https?://[^/\s]+(/[^\s]*)?$", v.replace("*", "x")):
            raise ValueError("Use a full address like https://sub.example.com")
        return v


class DomainSettings(BaseModel):
    # e.g. https://sub.example.com or https://example.com:8443; empty: .env
    url_prefix: str = Field("", max_length=300)
    # the path word; empty: .env (XRAY_SUBSCRIPTION_PATH, "sub")
    path: str = Field("", max_length=64)
    # after the token: "", "{username}" or any text (may contain {username})
    suffix: str = Field("", max_length=100)
    # admin username -> its own address (and last part) for its users
    admins: Dict[str, AdminDomain] = {}

    @field_validator("url_prefix")
    @classmethod
    def _url(cls, v: str) -> str:
        v = v.strip().rstrip("/")
        if v and not re.match(r"^https?://[^/\s]+(/[^\s]*)?$", v.replace("*", "x")):
            raise ValueError("Use a full address like https://sub.example.com")
        return v

    @field_validator("path")
    @classmethod
    def _path(cls, v: str) -> str:
        v = v.strip().strip("/")
        if v and not _PATH_RE.match(v):
            raise ValueError("Path: letters, digits, - and _ only")
        if v in ("api", "dashboard", "docs", "redoc", "statics", "openapi.json"):
            raise ValueError(f"/{v}/ is used by the panel")
        return v

    @field_validator("suffix")
    @classmethod
    def _suffix(cls, v: str) -> str:
        v = v.strip().strip("/")
        if "/" in v:
            raise ValueError("The last part can't contain /")
        if v in RESERVED:
            raise ValueError(f"\"{v}\" is used for client types")
        return v


_lock = threading.Lock()
_cache: Optional[DomainSettings] = None
_loaded_at = 0.0
TTL = 30  # seconds; save() refreshes it at once in this process


def get() -> DomainSettings:
    """the settings, cached (they're read for every user a list shows)"""
    global _cache, _loaded_at
    if _cache is not None and time.time() - _loaded_at < TTL:
        return _cache
    with _lock:
        if _cache is not None and time.time() - _loaded_at < TTL:
            return _cache
        try:
            from app.db import GetDB, crud
            with GetDB() as db:
                _cache = DomainSettings(**(crud.get_setting(db, SETTINGS_KEY) or {}))
        except Exception:
            _cache = _cache or DomainSettings()
        _loaded_at = time.time()
        return _cache


def save(db, s: DomainSettings) -> DomainSettings:
    global _cache, _loaded_at
    from app.db import crud
    crud.set_setting(db, SETTINGS_KEY, s.model_dump())
    with _lock:
        _cache, _loaded_at = s, time.time()
    return s


def path() -> str:
    return get().path or XRAY_SUBSCRIPTION_PATH


def admin_prefix(admin: str, s: Optional[DomainSettings] = None) -> str:
    """the admin's own address, if it has one"""
    s = s or get()
    own = s.admins.get(admin) if admin else None
    return own.url_prefix if own and own.url_prefix else ""


def build_url(username: str, token: str, s: Optional[DomainSettings] = None, admin: str = "") -> str:
    """the subscription link of a user (an admin may have its own address)"""
    import secrets
    s = s or get()
    own = s.admins.get(admin) if admin else None
    prefix = ((own.url_prefix if own and own.url_prefix else "") or s.url_prefix
              or XRAY_SUBSCRIPTION_URL_PREFIX).replace("*", secrets.token_hex(8))
    suffix = own.suffix if own and own.suffix is not None else s.suffix
    url = f"{prefix}/{s.path or XRAY_SUBSCRIPTION_PATH}/{token}"
    if suffix:
        url += "/" + quote(suffix.replace("{username}", username), safe="@._-~")
    return url
