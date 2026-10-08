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


def server_config(key: str):
    """the core config this server runs (before chain links are added)"""
    from app import xray
    from app.xray import cores
    if key == chain.MASTER:
        return xray.config
    return cores.config_of(cores.core_of(int(key)))


def _choices(config) -> list:
    """outbounds and balancers a server can exit through"""
    out = []
    for o in config.get("outbounds", []):
        if o.get("tag") and o.get("protocol") not in ("blackhole", "dns", "loopback") and o.get("tag") != chain.OUT_TAG:
            out.append({"tag": o["tag"], "kind": "outbound", "protocol": o.get("protocol", "")})
    for b in (config.get("routing") or {}).get("balancers", []):
        if b.get("tag"):
            out.append({"tag": b["tag"], "kind": "balancer", "protocol": "balancer"})
    return out


def _state(db: Session) -> dict:
    from app import node_extras, vpn
    names = vpn.server_keys(db)
    s = chain.load(db)
    extras = node_extras.load(db).nodes
    servers = []
    for key, name in names.items():
        link = s.links.get(key)
        try:
            config = server_config(key)
            choices, first = _choices(config), (config.get("outbounds") or [{}])[0]
        except Exception:
            choices, first = [], {}
        ex = extras.get(key)
        servers.append({
            "key": key, "name": name,
            "flag": ex.flag if ex else "",
            "can_test": key == chain.MASTER or bool(ex and ex.ssh and ex.ssh.secret),
            "exit_tag": s.exits.get(key, ""),
            "default_out": {"tag": first.get("tag", ""), "protocol": first.get("protocol", "")},
            "choices": choices,
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
    s.exits.pop(relay, None)   # one way out at a time
    chain.save(db, s)
    # the exit first (its new inbound), then the relay; and an old exit loses its inbound
    order = [body.exit] + ([old.exit] if old and old.exit != body.exit else []) + [relay]
    bg.add_task(chain.restart_servers, order)
    return _state(db)


class ExitIn(BaseModel):
    tag: str = Field("", max_length=128)   # "": the core's own default


@router.put("/{key}/exit")
def put_exit(key: str, body: ExitIn, bg: BackgroundTasks, db: Session = Depends(get_db),
             admin: Admin = Depends(Admin.check_sudo_admin)):
    """leave this server through one of its core's outbounds / balancers"""
    from app import vpn
    names = vpn.server_keys(db)
    if key not in names:
        raise HTTPException(404, "Server not found")
    tag = body.tag.strip()
    if tag and not chain.exit_target(server_config(key), tag):
        raise HTTPException(400, f"No outbound or balancer \"{tag}\" in the core of {names[key]}")
    s = chain.load(db)
    old_link = s.links.pop(key, None) if tag else None
    if s.exits.get(key, "") == tag and not old_link:
        return _state(db)
    if tag:
        s.exits[key] = tag
    else:
        s.exits.pop(key, None)
    chain.save(db, s)
    bg.add_task(chain.restart_servers, ([old_link.exit] if old_link else []) + [key])
    return _state(db)


def exit_outbounds(key: str) -> list:
    """[(label, outbound)] that this server's users' traffic really leaves through"""
    from app.db import GetDB
    s = chain.load()
    config = server_config(key)
    link = s.links.get(key)
    if link:
        with GetDB() as db:
            address = chain.exit_address(db, link)
        return [(chain.OUT_TAG, chain._outbound(address, link))]
    tag = s.exits.get(key, "")
    outbounds = config.get("outbounds", [])
    if tag and chain.exit_target(config, tag) == "balancer":
        b = next(b for b in config["routing"]["balancers"] if b.get("tag") == tag)
        picked = [o for o in outbounds if any(str(o.get("tag", "")).startswith(p) for p in b.get("selector", []))]
        return [(o["tag"], o) for o in picked]
    ob = next((o for o in outbounds if o.get("tag") == tag), None) if tag else (outbounds[0] if outbounds else None)
    if ob is None:
        return [("direct", {"protocol": "freedom"})]
    return [(ob.get("tag", ""), ob)]


@router.post("/{key}/check")
def check_exit(key: str, db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """open a few sites from this server, the way its users' traffic leaves"""
    from app import outbound_tools, vpn
    if key not in vpn.server_keys(db):
        raise HTTPException(404, "Server not found")
    exits = exit_outbounds(key)
    try:
        res = outbound_tools.test([o for _, o in exits], key)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"sites": [n for n, _ in outbound_tools.SITES],
            "exits": [{"tag": t, "protocol": o.get("protocol", ""), **r} for (t, o), r in zip(exits, res)]}
