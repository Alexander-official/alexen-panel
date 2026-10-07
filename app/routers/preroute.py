"""Preroute tunnels (app/vpn/preroute.py): which server a relay forwards to"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import vpn
from app.db import get_db
from app.models.admin import Admin
from app.utils import responses
from app.vpn import preroute

router = APIRouter(tags=["Preroute"], prefix="/api/preroute", responses={401: responses._401, 403: responses._403})


class TunnelIn(BaseModel):
    exit: Optional[str] = None          # None: no preroute for this server
    kind: str = Field("wg", pattern="^(wg|awg)$")
    port: Optional[int] = Field(None, ge=1, le=65535)
    mtu: int = Field(1420, ge=1200, le=1500)
    all_ports: bool = True
    forwards: List[preroute.Forward] = []


def _state(db: Session) -> dict:
    names = vpn.server_keys(db)
    s = preroute.load(db)
    out = []
    for key, name in names.items():
        t = s.tunnels.get(key)
        st = vpn.state.get(key, {})
        link = None
        if t:
            mine = next((x for x in st.get("tunnels") or [] if x.get("id") == t.id and x.get("role") == "relay"), None)
            other = vpn.state.get(t.exit, {})
            link = {
                "exit": t.exit, "exit_name": names.get(t.exit, t.exit), "kind": t.kind, "port": t.port, "mtu": t.mtu,
                "all_ports": t.all_ports, "forwards": [f.model_dump() for f in t.forwards],
                "forwarding": [f.model_dump() for f in preroute.forwards_of(db, t)],
                "relay_address": preroute.address_of(db, key),
                "handshake": (mine or {}).get("handshake", 0), "rx": (mine or {}).get("rx", 0), "tx": (mine or {}).get("tx", 0),
                "relay_agent": st.get("connected"), "exit_agent": other.get("connected"),
                "relay_error": st.get("error", ""), "exit_error": other.get("error", ""),
            }
        out.append({"key": key, "name": name, "link": link,
                    "relays": [names.get(r, r) for r, x in s.tunnels.items() if x.exit == key]})
    return {"servers": out}


@router.get("")
def get_preroute(db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    return _state(db)


@router.put("/{relay}")
def put_preroute(relay: str, body: TunnelIn, db: Session = Depends(get_db),
                 admin: Admin = Depends(Admin.check_sudo_admin)):
    names = vpn.server_keys(db)
    if relay not in names:
        raise HTTPException(404, "Server not found")
    s = preroute.load(db)
    old = s.tunnels.get(relay)
    if body.exit is None:
        s.tunnels.pop(relay, None)
        preroute.save(db, s)
        return _state(db)
    if body.exit not in names:
        raise HTTPException(400, "Exit server not found")
    if body.exit == relay:
        raise HTTPException(400, "A server can't forward to itself")
    if body.exit in s.tunnels:
        raise HTTPException(400, f"{names[body.exit]} is itself a relay; pick the server users finally exit from")
    if any(t.exit == relay for t in s.tunnels.values()):
        raise HTTPException(400, f"{names[relay]} is already an exit for another relay")
    if not preroute.ipv4(preroute.address_of(db, body.exit)):
        raise HTTPException(400, f"Can't find an IPv4 address for {names[body.exit]}")
    used = {t.port for r, t in s.tunnels.items() if t.exit == body.exit and r != relay} | preroute._xray_ports(body.exit)
    port = body.port or (old.port if old and old.exit == body.exit else None)
    if port is None:
        port = next(p for p in range(51900, 52900) if p not in used)
    elif port in used:
        raise HTTPException(400, f"UDP port {port} is already used on {names[body.exit]}")
    tid = old.id if old else (max((t.id for t in s.tunnels.values()), default=0) + 1)
    keep = old.model_dump() if old and old.exit == body.exit and old.kind == body.kind else {}
    s.tunnels[relay] = preroute.Tunnel(**{**keep, "id": tid, "relay": relay, "exit": body.exit, "kind": body.kind,
                                          "port": port, "mtu": body.mtu, "all_ports": body.all_ports,
                                          "forwards": [f.model_dump() for f in body.forwards]})
    preroute.save(db, s)
    return _state(db)


@router.post("/{relay}/hosts")
def make_hosts(relay: str, db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """a copy of every host of the exit's inbounds, with the relay's address"""
    from app import xray
    from app.db.models import ProxyHost
    s = preroute.load(db)
    t = s.tunnels.get(relay)
    if not t:
        raise HTTPException(404, "No preroute on this server")
    names = vpn.server_keys(db)
    address = preroute.address_of(db, relay)
    tags = set(xray.config.inbounds_by_tag)
    ports = {f.port for f in preroute.forwards_of(db, t)}
    from app.xray import cores
    core = cores.MAIN if t.exit == vpn.MASTER else cores.core_of(int(t.exit))
    inbounds = [i for i in cores.config_of(core).get("inbounds", []) if i.get("tag") in tags and i.get("port") in ports]
    made = 0
    for ib in inbounds:
        hosts = db.query(ProxyHost).filter(ProxyHost.inbound_tag == ib["tag"]).order_by(ProxyHost.id).all()
        if any(h.address == address for h in hosts):
            continue
        base = hosts[0] if hosts else None
        h = ProxyHost(inbound_tag=ib["tag"], address=address,
                      remark=(base.remark if base else ib["tag"]) + f" ({names.get(relay, relay)})")
        if base:
            for col in ("port", "path", "sni", "host", "security", "alpn", "fingerprint", "allowinsecure",
                        "is_disabled", "mux_enable", "fragment_setting", "noise_setting", "random_user_agent",
                        "use_sni_as_host", "group_name"):
                if hasattr(base, col):
                    setattr(h, col, getattr(base, col))
        db.add(h)
        made += 1
    db.commit()
    xray.hosts.update()
    return {"created": made}
