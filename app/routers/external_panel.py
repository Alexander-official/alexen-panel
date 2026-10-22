"""Manage external panels (3x-ui / s-ui) Alexen pulls configs and traffic from.
Sudo only. Passwords are stored encrypted (app.node_extras.encrypt) and never returned."""
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import node_extras
from app.db import get_db
from app.db.models import ExternalPanel
from app.external_panels.client import BaseClient, PanelError
from app.models.admin import Admin
from app.models.external_panel import (
    ExternalPanelCreate,
    ExternalPanelModify,
    ExternalPanelResponse,
)
from app.utils import responses

router = APIRouter(tags=["External Panel"], prefix="/api/external-panels",
                   responses={401: responses._401, 403: responses._403})


def _to_response(p: ExternalPanel) -> ExternalPanelResponse:
    return ExternalPanelResponse(
        id=p.id, name=p.name, kind=p.kind, address=p.address, panel_path=p.panel_path,
        scope=p.scope or {}, enabled=p.enabled, username=p.username or "",
        has_password=bool(p.password_enc), has_token=bool(p.token),
        sync_interval=p.sync_interval or 0, live=bool(p.live), count_traffic=bool(p.count_traffic),
        last_sync=p.last_sync, last_error=p.last_error, created_at=p.created_at,
    )


def _get(db: Session, panel_id: int) -> ExternalPanel:
    p = db.query(ExternalPanel).filter(ExternalPanel.id == panel_id).first()
    if not p:
        raise HTTPException(404, "External panel not found")
    return p


@router.get("", response_model=List[ExternalPanelResponse])
def list_panels(db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    return [_to_response(p) for p in db.query(ExternalPanel).order_by(ExternalPanel.id).all()]


@router.post("", response_model=ExternalPanelResponse, responses={409: responses._409})
def create_panel(body: ExternalPanelCreate, db: Session = Depends(get_db),
                 admin: Admin = Depends(Admin.check_sudo_admin)):
    if db.query(ExternalPanel).filter(ExternalPanel.name == body.name).first():
        raise HTTPException(409, "A panel with this name already exists")
    p = ExternalPanel(
        name=body.name, kind=body.kind, address=body.address, panel_path=body.panel_path,
        username=body.username or "", password_enc=node_extras.encrypt(body.password or ""),
        token=body.token or None, scope=body.scope.model_dump(), enabled=body.enabled,
        sync_interval=body.sync_interval or 0, live=bool(body.live), count_traffic=bool(body.count_traffic),
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _to_response(p)


@router.put("/{panel_id}", response_model=ExternalPanelResponse)
def modify_panel(panel_id: int, body: ExternalPanelModify, db: Session = Depends(get_db),
                 admin: Admin = Depends(Admin.check_sudo_admin)):
    p = _get(db, panel_id)
    for field in ("name", "kind", "address", "panel_path", "enabled", "username",
                  "sync_interval", "live", "count_traffic"):
        v = getattr(body, field)
        if v is not None:
            setattr(p, field, v)
    if body.scope is not None:
        p.scope = body.scope.model_dump()
    if body.password:  # empty keeps the stored password
        p.password_enc = node_extras.encrypt(body.password)
    if body.token is not None:
        p.token = body.token or None
    db.commit()
    db.refresh(p)
    return _to_response(p)


@router.delete("/{panel_id}")
def delete_panel(panel_id: int, db: Session = Depends(get_db),
                 admin: Admin = Depends(Admin.check_sudo_admin)):
    p = _get(db, panel_id)
    db.delete(p)
    db.commit()
    return {"detail": "External panel deleted"}


@router.post("/test")
def test_unsaved(body: ExternalPanelCreate, admin: Admin = Depends(Admin.check_sudo_admin)):
    """Try to log in with the given (unsaved) settings and count inbounds."""
    client = BaseClient.from_panel(type("P", (), {
        "kind": body.kind, "address": body.address, "panel_path": body.panel_path,
        "username": body.username or "", "password_enc": "", "token": body.token or "",
    }))
    client.password = body.password or ""
    try:
        return client.test()
    except PanelError as e:
        raise HTTPException(400, str(e))


@router.post("/{panel_id}/test")
def test_panel(panel_id: int, db: Session = Depends(get_db),
               admin: Admin = Depends(Admin.check_sudo_admin)):
    p = _get(db, panel_id)
    try:
        result = BaseClient.from_panel(p).test()
        p.last_error = None
    except PanelError as e:
        p.last_error = str(e)
        db.commit()
        raise HTTPException(400, str(e))
    db.commit()
    return result


@router.get("/{panel_id}/inbounds")
def panel_inbounds(panel_id: int, db: Session = Depends(get_db),
                   admin: Admin = Depends(Admin.check_sudo_admin)):
    p = _get(db, panel_id)
    try:
        client = BaseClient.from_panel(p)
        client.login()
        return {"inbounds": client.raw_inbounds()}
    except PanelError as e:
        raise HTTPException(400, str(e))


@router.get("/{panel_id}/stats")
def panel_stats(panel_id: int, db: Session = Depends(get_db),
                admin: Admin = Depends(Admin.check_sudo_admin)):
    """Live traffic / online for the panel (poll this for near-real-time display)."""
    from datetime import datetime
    p = _get(db, panel_id)
    try:
        client = BaseClient.from_panel(p)
        client.login()
        data = client.stats()
        p.last_sync = datetime.utcnow()
        p.last_error = None
    except PanelError as e:
        p.last_error = str(e)
        db.commit()
        raise HTTPException(400, str(e))
    db.commit()
    return data


# NOTE: the old "import" (pull) flow was removed on 2026-10-22. It dumped every external
# client's literal link into one shared config that landed in EVERY user's subscription.
# The integration is PUSH only now: "Create users on panel" (provision) below.


class ProvisionOptions(BaseModel):
    inbound_ids: list = []    # external inbound ids to create the Alexen users in
    scope_all: bool = False
    scope_admins: list = []
    name_mode: str = "original"   # "original" | "custom" | "random_geo" (app/subscription/external.py)
    name_template: str = ""        # for "custom": {USERNAME} {RANDOM} {FLAG} {COUNTRY} {CAPITAL} {GEO}


def _user_secret(u) -> str:
    # same priority as share.setup_format_variables' EXT_UUID: id, then password, then auth
    dicts = [(pr.settings or {}) for pr in (u.proxies or []) if isinstance(pr.settings, dict)]
    for field in ("id", "password", "auth"):
        for st in dicts:
            if st.get(field):
                return st[field]
    return ""


@router.post("/{panel_id}/provision")
def provision_users(panel_id: int, opts: ProvisionOptions, db: Session = Depends(get_db),
                    admin: Admin = Depends(Admin.check_sudo_admin)):
    """Create the scoped Alexen users AS CLIENTS on the external panel's chosen inbound(s),
    reusing each user's uuid (so identities match). Stage 1 of the push integration."""
    from datetime import datetime
    from app.db.models import User as _User, Admin as _DBA
    p = _get(db, panel_id)
    if not opts.inbound_ids:
        raise HTTPException(400, "Choose at least one inbound on the panel")
    q = db.query(_User)
    if not opts.scope_all:
        if not opts.scope_admins:
            raise HTTPException(400, "Choose everyone or at least one admin")
        ids = [a.id for a in db.query(_DBA).filter(_DBA.username.in_(opts.scope_admins)).all()]
        q = q.filter(_User.admin_id.in_(ids))
    users = q.all()
    try:
        client = BaseClient.from_panel(p)
        client.login()
    except PanelError as e:
        p.last_error = str(e)
        db.commit()
        raise HTTPException(400, str(e))
    created = exists = failed = skipped = 0
    errors = []
    for u in users:
        sec = _user_secret(u)
        if not sec:
            skipped += 1
            continue
        for ib in opts.inbound_ids:
            ok, msg = client.add_client(int(ib), u.username, sec)
            if ok:
                exists += 1 if msg == "exists" else 0
                created += 0 if msg == "exists" else 1
            else:
                failed += 1
                if len(errors) < 3 and msg:
                    errors.append(msg)

    # stage 2: give each provisioned user that server's config in their own sub — one template
    # external-config per inbound, with {EXT_UUID} filled per user (== the uuid we created above)
    import urllib.parse as _u
    from app.external_panels import links as _links
    from app.subscription import external as _external
    host = _u.urlparse(p.address).hostname or ""
    inbs = {ib.get("id"): ib for ib in client.raw_inbounds()}
    prefix = f"extpanel-prov-{panel_id}-"
    new_cfgs = []
    for i, ib_id in enumerate(opts.inbound_ids):
        ib = inbs.get(int(ib_id))
        if not ib:
            continue
        tlinks = _links.inbound_template_links(ib, host, ib.get("port"))
        if not tlinks:
            continue
        name = ib.get("remark") or ib.get("tag") or f"inbound-{ib.get('port')}"
        new_cfgs.append(_external.ExternalConfig(id=f"{prefix}{i}", name=f"{p.name}: {name}",
                                                 kind="links", links="\n".join(tlinks), position="bottom",
                                                 name_mode=opts.name_mode or "original",
                                                 name_template=opts.name_template or ""))
    if new_cfgs:
        settings = _external.load(db)

        def _put(lst):
            return [c for c in lst if not c.id.startswith(prefix)] + new_cfgs
        if opts.scope_all:
            settings.configs = _put(settings.configs)
        for nm in (opts.scope_admins or []):
            a = settings.admins.get(nm) or _external.AdminExternal()
            a.configs = _put(a.configs)
            settings.admins[nm] = a
        _external.save(db, settings)
        from app.subscription import external_sources
        external_sources.forget([c.id for c in new_cfgs])

    p.last_sync = datetime.utcnow()
    p.last_error = (errors[0] if errors else None)
    db.commit()
    return {"users": len(users), "created": created, "exists": exists,
            "failed": failed, "skipped": skipped, "errors": errors, "configs": len(new_cfgs)}
