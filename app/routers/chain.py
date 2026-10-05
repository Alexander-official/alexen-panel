"""Relay servers (app/xray/chain.py): which server a node's traffic exits through"""
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.admin import Admin
from app.utils import responses
from app.xray import chain

router = APIRouter(tags=["Chain"], prefix="/api/chain", responses={401: responses._401, 403: responses._403})


class LinkIn(BaseModel):
    # None: the server's traffic leaves from the server itself
    exit: Optional[str] = None
    port: Optional[int] = Field(None, ge=1, le=65535)
    address: str = ""
    sni: str = "www.microsoft.com"


def _ports(key: str) -> set:
    from app.routers.vpn import _xray_ports
    return _xray_ports(key)


def _state(db: Session) -> dict:
    from app import vpn
    names = vpn.server_keys(db)
    s = chain.load(db)
    servers = []
    for key, name in names.items():
        link = s.links.get(key)
        servers.append({
            "key": key, "name": name,
            "link": None if not link else {
                "exit": link.exit, "exit_name": names.get(link.exit, link.exit), "port": link.port,
                "address": link.address, "default_address": chain.exit_address(db, link.model_copy(update={"address": ""})),
                "sni": link.sni,
            },
            "relays": [names.get(r, r) for r, l in s.links.items() if l.exit == key],
        })
    return {"servers": servers}


@router.get("")
def get_chain(db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    return _state(db)


@router.put("/{relay}")
def put_chain(relay: str, body: LinkIn, bg: BackgroundTasks, db: Session = Depends(get_db),
              admin: Admin = Depends(Admin.check_sudo_admin)):
    from app import vpn
    names = vpn.server_keys(db)
    if relay not in names:
        raise HTTPException(404, "Server not found")
    s = chain.load(db)
    old = s.links.get(relay)
    if body.exit is None:
        if not old:
            return _state(db)
        s.links.pop(relay)
        chain.save(db, s)
        bg.add_task(chain.restart_servers, [old.exit, relay])
        return _state(db)
    if body.exit not in names:
        raise HTTPException(400, "Exit server not found")
    port = body.port or (old.port if old and old.exit == body.exit else None)
    if port is None:
        taken = _ports(body.exit) | {l.port for r, l in s.links.items() if l.exit == body.exit and r != relay}
        port = next(p for p in range(30500, 31500) if p not in taken)
    if port in _ports(body.exit):
        raise HTTPException(400, f"Port {port} is already used by an inbound on {names[body.exit]}")
    if any(l.port == port and l.exit == body.exit and r != relay for r, l in s.links.items()):
        raise HTTPException(400, f"Port {port} is already used by another relay of {names[body.exit]}")
    keep = old.model_dump() if old and old.exit == body.exit else {}
    link = chain.Link(**{**keep, "exit": body.exit, "port": port, "address": body.address.strip(),
                         "sni": body.sni.strip() or "www.microsoft.com"})
    try:
        chain.check(s, relay, link)
    except ValueError as e:
        raise HTTPException(400, str(e))
    s.links[relay] = link
    chain.save(db, s)
    # the exit first (its new inbound), then the relay; and an old exit loses its inbound
    order = [body.exit] + ([old.exit] if old and old.exit != body.exit else []) + [relay]
    bg.add_task(chain.restart_servers, order)
    return _state(db)
