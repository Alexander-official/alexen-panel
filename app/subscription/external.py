"""External configs and link ordering for link-based (v2ray) subscriptions.

The admin keeps a list of extra config links (other servers, info entries...)
that are added to every user's subscription, above or below the panel's own
configs, plus how the panel's own configs and the external ones are ordered.
Stored in the settings table; cached here and refreshed when saved.
"""
import re
import threading
import urllib.parse
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator

SETTINGS_KEY = "external_configs"

GENERATED_SORTS = ("default", "remark", "remark_desc", "protocol", "reverse")
EXTERNAL_SORTS = ("manual", "name", "name_desc", "protocol")
# VLESS is split by transport / security, the rest by protocol
VLESS_KINDS = ["vless-reality", "vless-tcp", "vless-ws", "vless-grpc", "vless-xhttp", "vless-httpupgrade"]
DEFAULT_PROTOCOL_ORDER = VLESS_KINDS + ["vmess", "trojan", "ss", "hysteria2", "tuic", "wireguard"]


def normalize_order(order: List[str]) -> List[str]:
    """expand an old plain "vless" entry into the VLESS kinds (in its place) and
    add any kind the list doesn't have yet at the end"""
    out: List[str] = []
    for key in order or []:
        for k in (VLESS_KINDS if key == "vless" else [key]):
            if k in DEFAULT_PROTOCOL_ORDER and k not in out:
                out.append(k)
    return out + [k for k in DEFAULT_PROTOCOL_ORDER if k not in out]


def link_kind(link: str) -> str:
    """protocol of a share link; VLESS also by transport ("vless-ws") or reality"""
    scheme = _scheme(link)
    if scheme != "vless":
        return scheme
    q = urllib.parse.parse_qs(urllib.parse.urlsplit(link).query)
    if (q.get("security") or [""])[0] == "reality":
        return "vless-reality"
    net = (q.get("type") or ["tcp"])[0].lower()
    return {
        "tcp": "vless-tcp", "raw": "vless-tcp", "ws": "vless-ws", "grpc": "vless-grpc", "gun": "vless-grpc",
        "xhttp": "vless-xhttp", "splithttp": "vless-xhttp", "httpupgrade": "vless-httpupgrade",
    }.get(net, "vless-tcp")


def protocol_rank(order: List[str]):
    rank = {k: i for i, k in enumerate(normalize_order(order))}
    return lambda link: rank.get(link_kind(link), len(rank))

# the name part after "#" may contain spaces when links are pasted by hand
_LINK_RE = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*://[^\s#]+(#.*)?$")


class ExternalConfig(BaseModel):
    id: str
    name: str = Field("", max_length=128)
    # "links": share links pasted below; "subscription": pulled from `url`
    kind: str = "links"
    # one or more share links, one per line
    links: str = ""
    # subscription sources
    url: str = ""
    user_agent: str = ""
    range_start: int = Field(1, ge=1)  # 1-based, inclusive
    range_end: int = Field(0, ge=0)  # 0 = up to the last one
    rename: str = "country"  # "none" | "country" | "country_city"
    test: bool = False  # test through our xray and keep only working links
    test_timeout: int = Field(5, ge=1, le=30)  # seconds
    refresh_minutes: int = Field(60, ge=5, le=10080)
    enabled: bool = True
    position: str = "bottom"  # "top" | "bottom"
    only_active: bool = True  # hide from expired / limited / disabled users
    groups: List[str] = []  # empty = everyone; else only users of admins in these host groups

    def link_list(self) -> List[str]:
        if self.kind == "subscription":
            from app.subscription.external_sources import cached_links
            return [it["link"] for it in cached_links(self.id)]
        return [ln.strip() for ln in (self.links or "").splitlines() if _LINK_RE.match(ln.strip())]


class ExternalSettings(BaseModel):
    configs: List[ExternalConfig] = []
    generated_sort: str = "default"
    external_sort: str = "manual"
    # used by both "by protocol" sorts
    protocol_order: List[str] = DEFAULT_PROTOCOL_ORDER
    test_url: str = "https://www.gstatic.com/generate_204"

    @field_validator("protocol_order", mode="after")
    @classmethod
    def _normalize(cls, v):
        return normalize_order(v)


_cache: Optional[ExternalSettings] = None
_lock = threading.Lock()


def load(db=None) -> ExternalSettings:
    global _cache
    if _cache is not None and db is None:
        return _cache
    from app.db import GetDB, crud
    if db is None:
        with GetDB() as session:
            data = crud.get_setting(session, SETTINGS_KEY, {}) or {}
    else:
        data = crud.get_setting(db, SETTINGS_KEY, {}) or {}
    settings = ExternalSettings(**data)
    with _lock:
        _cache = settings
    return settings


def save(db, settings: ExternalSettings) -> ExternalSettings:
    global _cache
    from app.db import crud
    crud.set_setting(db, SETTINGS_KEY, settings.model_dump())
    with _lock:
        _cache = settings
    return settings


def _scheme(link: str) -> str:
    s = link.split("://", 1)[0].lower()
    return {"hy2": "hysteria2", "shadowsocks": "ss"}.get(s, s)


def _remark(link: str) -> str:
    if _scheme(link) == "vmess":
        from app.subscription.external_sources import _remark_of
        return _remark_of(link) or link[:40]
    return urllib.parse.unquote(link.split("#", 1)[1]) if "#" in link else link


def _name_key(text: str) -> str:
    """sort key for names: ignore leading emoji / symbols ("🚀 HY2" sorts as "hy2")"""
    i = 0
    while i < len(text) and not text[i].isalnum():
        i += 1
    return text[i:].lower()


def sort_generated(links: List[str], mode: str, order: Optional[List[str]] = None) -> List[str]:
    if mode == "remark":
        return sorted(links, key=lambda l: _name_key(_remark(l)))
    if mode == "remark_desc":
        return sorted(links, key=lambda l: _name_key(_remark(l)), reverse=True)
    if mode == "protocol":
        return sorted(links, key=protocol_rank(order or DEFAULT_PROTOCOL_ORDER))  # stable: keeps inbound order inside
    if mode == "reverse":
        return list(reversed(links))
    return links


def _visible(cfg: ExternalConfig, active: bool, host_groups: Optional[list]) -> bool:
    if not cfg.enabled:
        return False
    if cfg.only_active and not active:
        return False
    # same rule as hosts: an admin without groups sees everything
    if cfg.groups and host_groups and not (set(cfg.groups) & set(host_groups)):
        return False
    return True


def _fill(link: str, variables: dict) -> str:
    """put user placeholders ({USERNAME}...) into the remark part only"""
    if "#" not in link:
        return link
    base, remark = link.split("#", 1)
    text = urllib.parse.unquote(remark)
    for key, value in variables.items():
        text = text.replace("{%s}" % key, str(value))
    return f"{base}#{urllib.parse.quote(text)}"


def apply(links: List[str], *, active: bool, host_groups: Optional[list], variables: dict,
          settings: Optional[ExternalSettings] = None, tagged: bool = False):
    """Order the panel's links and put the external ones around them.
    With tagged=True returns (link, source) pairs, for the preview."""
    s = settings or load()
    own = [(l, "generated") for l in sort_generated(links, s.generated_sort, s.protocol_order)]

    configs = [c for c in s.configs if _visible(c, active, host_groups)]
    if s.external_sort == "name":
        configs.sort(key=lambda c: _name_key(c.name))
    elif s.external_sort == "name_desc":
        configs.sort(key=lambda c: _name_key(c.name), reverse=True)

    top, bottom = [], []
    for c in configs:
        target = top if c.position == "top" else bottom
        target.extend((_fill(l, variables), "external") for l in c.link_list())

    if s.external_sort == "protocol":
        rank = protocol_rank(s.protocol_order)
        key = lambda pair: rank(pair[0])
        top.sort(key=key)  # stable: keeps each protocol's own order
        bottom.sort(key=key)

    result = top + own + bottom
    return result if tagged else [l for l, _ in result]
