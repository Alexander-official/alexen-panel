from typing import Dict, Optional

from fastapi import APIRouter, BackgroundTasks, Depends
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
    # hours between automatic updates in the apps; None: SUB_UPDATE_INTERVAL from .env
    update_interval: Optional[int] = None
    # admin username -> its own templates for its users; an empty one falls back to the ones above
    admins: Dict[str, "AdminSubTemplates"] = {}


class AdminSubTemplates(BaseModel):
    default_template: Optional[str] = ""
    expired_template: Optional[str] = ""
    disabled_template: Optional[str] = ""
    limited_template: Optional[str] = ""
    near_expire_template: Optional[str] = ""


SubscriptionSettings.model_rebuild()


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
    if "admins" not in settings.model_fields_set:
        settings.admins = get_subscription_settings(db).admins
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
    for c in settings.all_configs():
        if c.position not in ("top", "bottom"):
            raise HTTPException(400, f"{c.name}: position must be top or bottom")
        if c.kind not in ("links", "subscription"):
            raise HTTPException(400, f"{c.name}: unknown kind")
        if c.kind == "subscription":
            if not c.url.startswith(("http://", "https://")):
                raise HTTPException(400, f"{c.name or 'source'}: subscription url must start with http(s)://")
            if c.rename not in ("none", "country", "country_city"):
                raise HTTPException(400, f"{c.name}: unknown rename mode")
            if c.range_end and c.range_end < c.range_start:
                raise HTTPException(400, f"{c.name}: range end is before range start")
            continue
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
    if "admins" not in settings.model_fields_set:
        settings.admins = _external.load(db).admins
    _check_external(settings)
    saved = _external.save(db, settings)
    from app.subscription import external_sources
    external_sources.forget([c.id for c in saved.all_configs()])
    return saved


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
                            variables=setup_format_variables(user.__dict__), settings=settings, tagged=True,
                            admin=dbuser.admin.username if dbuser.admin else "")
    return ExternalPreview(
        username=user.username,
        items=[ExternalPreviewItem(remark=_external._remark(l), link=l, source=src) for l, src in pairs],
    )


def _visible_configs(admin: Admin):
    """what this admin may look at: everything for sudo, else its own list (if allowed)"""
    s = _external.load()
    if admin.is_sudo:
        return s.all_configs()
    mine = s.admins.get(admin.username)
    return list(mine.configs) if mine and mine.self_edit else []


def _own_external(admin: Admin) -> "_external.AdminExternal":
    mine = _external.load().admins.get(admin.username)
    if admin.is_sudo or not mine or not mine.self_edit:
        raise HTTPException(403, "You can't edit external configs")
    return mine


class OwnExternal(BaseModel):
    label: str = ""
    enabled: bool = True
    configs: _List[_external.ExternalConfig] = []


@router.get("/external-configs/mine", response_model=OwnExternal)
def read_own_external(admin: Admin = Depends(Admin.get_current)):
    """an admin's own external configs (when the sudo admin lets it edit them)"""
    mine = _own_external(admin)
    return OwnExternal(label=mine.label, enabled=mine.enabled, configs=mine.configs)


@router.put("/external-configs/mine", response_model=OwnExternal)
def update_own_external(body: OwnExternal, db: Session = Depends(get_db),
                        admin: Admin = Depends(Admin.get_current)):
    mine = _own_external(admin)
    settings = _external.load(db)
    # the admin edits only its list; the label and on/off stay with the sudo admin
    entry = settings.admins[admin.username].model_copy(update={"configs": body.configs})
    settings.admins[admin.username] = entry
    _check_external(settings)
    saved = _external.save(db, settings)
    from app.subscription import external_sources
    external_sources.forget([c.id for c in saved.all_configs()])
    return OwnExternal(label=entry.label, enabled=entry.enabled, configs=entry.configs)


class SourceStatus(BaseModel):
    id: str
    running: bool = False
    updated_at: int = 0
    error: str = ""
    stats: dict = {}
    items: _List[dict] = []


@router.get("/external-configs/sources", response_model=_List[SourceStatus])
def external_sources_status(admin: Admin = Depends(Admin.get_current)):
    """Last fetch/test result of every subscription source"""
    from app.subscription import external_sources as es
    out = []
    for c in _visible_configs(admin):
        if c.kind != "subscription":
            continue
        e = es.get_cache().get(c.id) or {}
        items = [{**it, "kind": _external.link_kind(it["link"])} for it in e.get("items", [])]
        out.append(SourceStatus(id=c.id, running=es.is_running(c.id), updated_at=e.get("updated_at", 0),
                                error=e.get("error", ""), stats=e.get("stats", {}), items=items))
    return out


@router.post("/external-configs/sources/{source_id}/refresh")
def refresh_external_source(source_id: str, bg: BackgroundTasks,
                            admin: Admin = Depends(Admin.get_current)):
    """Fetch, test and rename one source now (runs in the background)"""
    from app.subscription import external_sources as es
    if not any(c.id == source_id and c.kind == "subscription" for c in _visible_configs(admin)):
        raise HTTPException(404, "Source not found (save it first)")
    es._running.add(source_id)
    bg.add_task(es.refresh_due, [source_id])
    return {"detail": "refresh started"}


# ---- Xray JSON subscription (see app/subscription/json_sub.py) ----
from app.subscription import json_sub as _json_sub


@router.get("/json-sub-settings", response_model=_json_sub.JsonSubSettings)
def read_json_sub_settings(db: Session = Depends(get_db),
                           admin: Admin = Depends(Admin.check_sudo_admin)):
    """JSON subscription: clients, direct sites, external configs, the auto (balancer) config"""
    return _json_sub.load(db)


@router.put("/json-sub-settings", response_model=_json_sub.JsonSubSettings)
def update_json_sub_settings(settings: _json_sub.JsonSubSettings,
                             db: Session = Depends(get_db),
                             admin: Admin = Depends(Admin.check_sudo_admin)):
    if any(c not in _json_sub.CLIENTS for c in settings.clients):
        raise HTTPException(400, "unknown client")
    if settings.balancer_strategy not in ("leastPing", "leastLoad", "random", "roundRobin"):
        raise HTTPException(400, "unknown balancer strategy")
    if settings.balancer_position not in ("top", "bottom"):
        raise HTTPException(400, "balancer position must be top or bottom")
    settings.direct_domains = [d.strip() for d in settings.direct_domains if d.strip()]
    settings.direct_ips = [d.strip() for d in settings.direct_ips if d.strip()]
    return _json_sub.save(db, settings)


# ---- subscription web page (see app/subscription/webpage.py) ----
from app.subscription import webpage as _webpage


@router.get("/sub-webpage", response_model=_webpage.WebPageSettings)
def read_sub_webpage(db: Session = Depends(get_db),
                     admin: Admin = Depends(Admin.check_sudo_admin)):
    """What users see when they open their subscription link in a browser"""
    return _webpage.load(db)


@router.put("/sub-webpage", response_model=_webpage.WebPageSettings)
def update_sub_webpage(settings: _webpage.WebPageSettings,
                       db: Session = Depends(get_db),
                       admin: Admin = Depends(Admin.check_sudo_admin)):
    return _webpage.save(db, settings)


@router.get("/sub-webpage/default-apps")
def read_sub_webpage_default_apps(admin: Admin = Depends(Admin.check_sudo_admin)):
    """the built-in app catalog, per platform"""
    return _webpage.default_apps()


@router.get("/sub-webpage/defaults")
def read_sub_webpage_defaults(admin: Admin = Depends(Admin.check_sudo_admin)):
    """the built-in app catalog and the page's own texts per language"""
    return {"apps": _webpage.default_apps(), "texts": _webpage.default_texts(),
            "sections": _webpage.SECTIONS, "platforms": _webpage.PLATFORMS}


class WebPagePreview(BaseModel):
    settings: _webpage.WebPageSettings
    username: Optional[str] = None


@router.post("/sub-webpage/preview")
def preview_sub_webpage(body: WebPagePreview, db: Session = Depends(get_db),
                        admin: Admin = Depends(Admin.check_sudo_admin)):
    """the page as a user would see it, with settings that aren't saved yet"""
    from fastapi.responses import HTMLResponse
    from app.db.models import User
    from app.models.user import UserResponse
    from app.routers.subscription import build_sub_page
    from app.subscription.share import generate_subscription
    from app.templates import render_template
    dbuser = crud.get_user(db, body.username) if body.username else None
    dbuser = dbuser or db.query(User).order_by(User.id).first()
    if not dbuser:
        raise HTTPException(404, "No users yet")
    user = UserResponse.model_validate(dbuser)
    links = generate_subscription(user=user, config_format="v2ray", as_base64=False, reverse=False)
    _, headers = build_sub_page(db, user)
    url = user.subscription_url if user.subscription_url.startswith("http") else "https://example.com" + user.subscription_url
    data = _webpage.page_data(db, body.settings, user, url, [l for l in links.splitlines() if l.strip()],
                              headers, preview=True)
    return HTMLResponse(render_template("subscription/webpage.html", {"data": data}))


# ---- domain of the subscription links (see app/subscription/domain.py) ----
from app.subscription import domain as _domain


class DomainState(BaseModel):
    settings: _domain.DomainSettings
    # what .env sets, used for an empty field
    env_url_prefix: str
    env_path: str
    example: str


def _domain_state(db: Session, s: _domain.DomainSettings) -> DomainState:
    from config import XRAY_SUBSCRIPTION_PATH, XRAY_SUBSCRIPTION_URL_PREFIX
    from app.db.models import User
    from app.utils.jwt import create_subscription_token
    user = db.query(User).order_by(User.id).first()
    name = user.username if user else "username"
    example = _domain.build_url(name, create_subscription_token(name) if user else "<token>", s)
    return DomainState(settings=s, env_url_prefix=XRAY_SUBSCRIPTION_URL_PREFIX, env_path=XRAY_SUBSCRIPTION_PATH,
                       example=example)


@router.get("/sub-domain", response_model=DomainState)
def read_sub_domain(db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """Which address, path and last part the subscription links use"""
    return _domain_state(db, _domain.get())


@router.put("/sub-domain", response_model=DomainState)
def update_sub_domain(settings: _domain.DomainSettings, db: Session = Depends(get_db),
                      admin: Admin = Depends(Admin.check_sudo_admin)):
    if "admins" not in settings.model_fields_set:
        settings.admins = _domain.get().admins   # the page edits the general part only
    return _domain_state(db, _domain.save(db, settings))


@router.post("/sub-domain/example", response_model=DomainState)
def example_sub_domain(settings: _domain.DomainSettings, db: Session = Depends(get_db),
                       admin: Admin = Depends(Admin.check_sudo_admin)):
    """the link a user would get with these (unsaved) settings"""
    return _domain_state(db, settings)


# ---- everything about one admin's subscriptions in one place (admin settings) ----
class AdminSubProfile(BaseModel):
    url_prefix: str = ""                       # own domain for its users' links
    suffix: Optional[str] = None               # own last part; None: the general one
    templates: AdminSubTemplates = AdminSubTemplates()
    external_enabled: bool = True
    external_label: str = ""
    external_self_edit: bool = False
    external_include_general: bool = True     # its users get the general external configs too
    external_count: int = 0                    # read only: edit them on the External configs page
    example: str = ""                          # read only


def _profile(db: Session, name: str) -> AdminSubProfile:
    from app.db.models import Admin as DBAdmin, User
    from app.utils.jwt import create_subscription_token
    d = _domain.get().admins.get(name)
    t = get_subscription_settings(db).admins.get(name) or AdminSubTemplates()
    e = _external.load(db).admins.get(name)
    dbadmin = db.query(DBAdmin).filter(DBAdmin.username == name).first()
    user = db.query(User).filter(User.admin_id == dbadmin.id).order_by(User.id).first() if dbadmin else None
    uname = user.username if user else "username"
    example = _domain.build_url(uname, create_subscription_token(uname) if user else "<token>", admin=name)
    return AdminSubProfile(url_prefix=d.url_prefix if d else "", suffix=d.suffix if d else None, templates=t,
                           external_enabled=e.enabled if e else True, external_label=e.label if e else "",
                           external_self_edit=e.self_edit if e else False,
                           external_include_general=e.include_general if e else True,
                           external_count=len(e.configs) if e else 0, example=example)


@router.get("/admin/{name}/sub-profile", response_model=AdminSubProfile)
def read_admin_sub_profile(name: str, db: Session = Depends(get_db),
                           admin: Admin = Depends(Admin.check_sudo_admin)):
    """an admin's own subscription domain, texts and external configs"""
    return _profile(db, name)


@router.put("/admin/{name}/sub-profile", response_model=AdminSubProfile)
def update_admin_sub_profile(name: str, body: AdminSubProfile, db: Session = Depends(get_db),
                             admin: Admin = Depends(Admin.check_sudo_admin)):
    # domain
    try:
        own = _domain.AdminDomain(url_prefix=body.url_prefix, suffix=body.suffix)
    except Exception as e:
        msg = e.errors()[0].get("msg", str(e)) if hasattr(e, "errors") else str(e)
        raise HTTPException(400, msg.replace("Value error, ", ""))
    ds = _domain.get().model_copy(deep=True)
    if own.url_prefix or own.suffix is not None:
        ds.admins[name] = own
    else:
        ds.admins.pop(name, None)
    _domain.save(db, ds)
    # texts
    subs = get_subscription_settings(db)
    if any((v or "").strip() for v in body.templates.model_dump().values()):
        subs.admins[name] = body.templates
    else:
        subs.admins.pop(name, None)
    crud.set_setting(db, SUB_SETTINGS_KEY, subs.model_dump())
    # external configs (the list itself is edited on its page)
    ext = _external.load(db)
    cur = ext.admins.get(name) or _external.AdminExternal()
    ext.admins[name] = cur.model_copy(update={"enabled": body.external_enabled, "label": body.external_label,
                                              "self_edit": body.external_self_edit,
                                              "include_general": body.external_include_general})
    _external.save(db, ext)
    return _profile(db, name)


@router.get("/admins/sub-profiles")
def admins_sub_profiles(db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """which admins have their own domain, texts or external configs (for the admins list)"""
    doms = _domain.get().admins
    texts = get_subscription_settings(db).admins
    ext = _external.load(db).admins
    out = {}
    for name in set(doms) | set(texts) | set(ext):
        e = ext.get(name)
        out[name] = {
            "domain": doms[name].url_prefix if name in doms else "",
            "texts": sum(1 for v in (texts[name].model_dump().values() if name in texts else []) if (v or "").strip()),
            "external": len(e.configs) if e else 0,
            "external_on": e.enabled if e else True,
            "self_edit": e.self_edit if e else False,
            "include_general": e.include_general if e else True,
        }
    return out
