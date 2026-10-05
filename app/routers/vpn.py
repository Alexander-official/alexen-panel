"""AmneziaWG / OpenVPN per server (app/vpn): settings, agent status, the agent
install command, and the files the install script downloads."""
import base64
import io
import os
import tarfile
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import PlainTextResponse, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import vpn
from app.db import crud, get_db
from app.models.admin import Admin
from app.utils import responses

router = APIRouter(tags=["VPN"], prefix="/api/vpn", responses={401: responses._401, 403: responses._403})
files_router = APIRouter(tags=["VPN"], include_in_schema=False)

AGENT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "vpn-agent")


class AWGIn(BaseModel):
    enabled: bool = False
    address: str = ""
    port: int = 51820
    subnet: str = "10.66.0.0/16"
    mtu: int = 1420
    dns: List[str] = ["1.1.1.1", "8.8.8.8"]
    keepalive: int = 25
    params: Dict[str, int] = {}


class OVPNIn(BaseModel):
    enabled: bool = False
    address: str = ""
    port: int = 1194
    proto: str = "udp"
    subnet: str = "10.67.0.0/16"
    dns: List[str] = ["1.1.1.1", "8.8.8.8"]


class ServerIn(BaseModel):
    agent_port: int = 62060
    agent_address: str = ""
    public_address: str = ""
    awg: AWGIn = AWGIn()
    ovpn: OVPNIn = OVPNIn()


def _xray_ports(key: str) -> set:
    """ports the server's Xray core listens on"""
    from app.xray import cores
    try:
        core = cores.MAIN if key == vpn.MASTER else cores.core_of(int(key))
        return {int(i["port"]) for i in cores.config_of(core).get("inbounds", []) if str(i.get("port", "")).isdigit()}
    except Exception:
        return set()


def _public(db: Session, s: vpn.VPNSettings, key: str, name: str) -> dict:
    srv = s.servers.get(key) or vpn.ServerVPN()
    st = vpn.state.get(key, {})
    warnings = []
    ports = _xray_ports(key)
    for label, svc in (("AmneziaWG", srv.awg), ("OpenVPN", srv.ovpn)):
        if svc.enabled and svc.port in ports:
            warnings.append(f"{label} port {svc.port} is also an Xray inbound port on this server")
    if srv.awg.enabled and srv.ovpn.enabled and srv.awg.port == srv.ovpn.port and srv.ovpn.proto == "udp":
        warnings.append("AmneziaWG and OpenVPN use the same UDP port")
    if srv.agent_port in ports:
        warnings.append(f"agent port {srv.agent_port} is also an Xray inbound port")
    return {
        "key": key, "name": name,
        "agent_port": srv.agent_port, "agent_address": srv.agent_address, "public_address": srv.public_address,
        "default_agent_address": vpn.agent_address(db, key, vpn.ServerVPN()),
        "default_public_address": vpn.public_address(db, key, vpn.ServerVPN()),
        "pinned": bool(srv.agent_cert),
        "awg": {k: v for k, v in srv.awg.model_dump().items() if k != "private_key"},
        "ovpn": {k: v for k, v in srv.ovpn.model_dump().items() if k not in ("cert", "key")},
        "state": st, "warnings": warnings,
        "sessions": _sessions(db, key),
    }


def _sessions(db: Session, key: str) -> list:
    """who is connected to this server right now, from where"""
    from app.db.models import User
    here = vpn.sessions.get(key) or {}
    if not here:
        return []
    names = dict(db.query(User.id, User.username).filter(User.id.in_(list(here))).all())
    out = []
    for uid, ips in here.items():
        out.append({"username": names.get(uid, f"#{uid}"),
                    "ips": [{"ip": ip, "tag": v["tag"], "last_seen": v["last_seen"]} for ip, v in sorted(ips.items())]})
    return sorted(out, key=lambda x: x["username"].lower())


@router.get("")
def get_vpn(db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    s = vpn.load(db)
    return {"servers": [_public(db, s, k, n) for k, n in vpn.server_keys(db).items()],
            "awg_devices": s.awg_devices, "max_devices": vpn.DEVICE_SLOTS}


class DevicesIn(BaseModel):
    awg_devices: int


@router.put("/devices")
def put_devices(body: DevicesIn, db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """AmneziaWG files per user (one per device)"""
    if not 1 <= body.awg_devices <= vpn.DEVICE_SLOTS:
        raise HTTPException(400, f"1 to {vpn.DEVICE_SLOTS} devices")
    s = vpn.load(db)
    s.awg_devices = body.awg_devices
    vpn.save(db, s)
    return {"awg_devices": s.awg_devices}


@router.put("/servers/{key}")
def put_server(key: str, body: ServerIn, db: Session = Depends(get_db),
               admin: Admin = Depends(Admin.check_sudo_admin)):
    names = vpn.server_keys(db)
    if key not in names:
        raise HTTPException(404, "Server not found")
    s = vpn.load(db)
    cur = s.servers.get(key) or vpn.ServerVPN()
    try:
        awg = vpn.AWGSettings(**{**body.awg.model_dump(), "private_key": cur.awg.private_key,
                                 "params": body.awg.params or cur.awg.params})
        ovpn = vpn.OVPNSettings(**{**body.ovpn.model_dump(), "cert": cur.ovpn.cert, "key": cur.ovpn.key})
    except ValueError as e:
        raise HTTPException(400, str(e))
    p = awg.params
    if p and not (p.get("jmin", 0) <= p.get("jmax", 0) <= 1280):
        raise HTTPException(400, "AmneziaWG: Jmin must be ≤ Jmax ≤ 1280")
    if p and p.get("s1", 0) + 56 == p.get("s2", -1):
        raise HTTPException(400, "AmneziaWG: S1 + 56 must not equal S2")
    if awg.subnet == ovpn.subnet:
        raise HTTPException(400, "AmneziaWG and OpenVPN need different subnets")
    moved = (body.agent_address != cur.agent_address) or (body.agent_port != cur.agent_port)
    s.servers[key] = vpn.ServerVPN(agent_port=body.agent_port, agent_address=body.agent_address.strip(),
                                   public_address=body.public_address.strip(),
                                   agent_cert="" if moved else cur.agent_cert, awg=awg, ovpn=ovpn)
    if awg.enabled or ovpn.enabled:
        vpn.ensure_secrets(s, key)
    vpn.save(db, s)
    return _public(db, s, key, names[key])


@router.post("/servers/{key}/reset-pin")
def reset_pin(key: str, db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """trust the agent's certificate again (after reinstalling the agent)"""
    s = vpn.load(db)
    if key in s.servers:
        s.servers[key].agent_cert = ""
        vpn.save(db, s)
    return {"ok": True}


@router.post("/servers/{key}/new-awg-params")
def new_awg_params(key: str, db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """fresh random obfuscation values (users then need the new config)"""
    return vpn._random_awg_params()


@router.get("/install")
def install_command(request: Request, db: Session = Depends(get_db),
                    admin: Admin = Depends(Admin.check_sudo_admin)):
    """the command that installs the agent on a server"""
    cert = crud.get_tls_certificate(db).certificate
    b64 = base64.b64encode(cert.encode()).decode()
    origin = str(request.base_url).rstrip("/")
    return {"command": f"curl -fsSL {origin}/vpn-agent/install.sh | sudo bash -s -- {origin} {b64}",
            "panel_url": origin}


# ---- public files for the install script (code only, nothing secret) ----

@files_router.get("/vpn-agent/install.sh")
def agent_install_script():
    with open(os.path.join(AGENT_DIR, "install.sh")) as f:
        return PlainTextResponse(f.read(), media_type="text/x-shellscript")


@files_router.get("/vpn-agent/agent.tar.gz")
def agent_bundle():
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for name in ("Dockerfile", "agent.py"):
            tar.add(os.path.join(AGENT_DIR, name), arcname=name)
    return Response(buf.getvalue(), media_type="application/gzip")
