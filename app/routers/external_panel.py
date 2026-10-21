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
    )
    db.add(p)
    db.commit()
    db.refresh(p)
    return _to_response(p)


@router.put("/{panel_id}", response_model=ExternalPanelResponse)
def modify_panel(panel_id: int, body: ExternalPanelModify, db: Session = Depends(get_db),
                 admin: Admin = Depends(Admin.check_sudo_admin)):
    p = _get(db, panel_id)
    for field in ("name", "kind", "address", "panel_path", "enabled", "username"):
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


class ImportOptions(BaseModel):
    host: str = ""                 # override server host (default: the panel's host)
    port_map: dict = {}            # {"8443": 443}: hand out 443 for the real 8443
    fake: list = []                # [{host,port,label}] extra "fake location" copies
    scope_all: bool = False        # add to every user (the general external configs)
    scope_admins: list = []        # else add to these admins' users


@router.post("/{panel_id}/import/preview")
def import_preview(panel_id: int, opts: ImportOptions, db: Session = Depends(get_db),
                   admin: Admin = Depends(Admin.check_sudo_admin)):
    """Generate the share links that would be imported (no changes made yet)."""
    p = _get(db, panel_id)
    try:
        client = BaseClient.from_panel(p)
        client.login()
        links = client.share_links(host=opts.host, port_map=opts.port_map, fake=opts.fake)
    except PanelError as e:
        raise HTTPException(400, str(e))
    return {"links": [{"remark": r, "link": l} for r, l in links]}


@router.post("/{panel_id}/import")
def import_configs(panel_id: int, opts: ImportOptions, db: Session = Depends(get_db),
                   admin: Admin = Depends(Admin.check_sudo_admin)):
    """Import the panel's configs as external configs for the chosen scope. Re-importing
    replaces this panel's previous import (configs are tagged extpanel-<id>)."""
    from datetime import datetime
    from app.subscription import external as _external
    p = _get(db, panel_id)
    try:
        client = BaseClient.from_panel(p)
        client.login()
        links = client.share_links(host=opts.host, port_map=opts.port_map, fake=opts.fake)
    except PanelError as e:
        p.last_error = str(e)
        db.commit()
        raise HTTPException(400, str(e))
    if not links:
        raise HTTPException(400, "The panel has no client configs to import")

    cfg_id = f"extpanel-{panel_id}"
    text = "\n".join(l for _, l in links)
    cfg = _external.ExternalConfig(id=cfg_id, name=p.name, kind="links", links=text, position="bottom")

    settings = _external.load(db)

    def _put(lst):
        return [c for c in lst if c.id != cfg_id] + [cfg]

    targets = []
    if opts.scope_all:
        settings.configs = _put(settings.configs)
        targets.append("all")
    for name in (opts.scope_admins or []):
        a = settings.admins.get(name) or _external.AdminExternal()
        a.configs = _put(a.configs)
        settings.admins[name] = a
        targets.append(name)
    if not targets:
        raise HTTPException(400, "Choose a scope: everyone or at least one admin")

    _external.save(db, settings)
    from app.subscription import external_sources
    external_sources.forget([cfg_id])
    p.last_sync = datetime.utcnow()
    p.last_error = None
    db.commit()
    return {"imported": len(links), "scope": targets}
