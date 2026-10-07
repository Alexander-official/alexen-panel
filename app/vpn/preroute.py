"""Preroute: a relay server forwards ports to an exit server through a
WireGuard (or AmneziaWG) link, without SNAT, so the exit sees the users' real
IPs for every protocol (TCP and UDP). Users connect to the relay with the
exit's normal configs; nothing about users runs on the relay. Both servers
need the Alexen agent (vpn-agent/), which does the forwarding and routing.

Settings live in the settings table under "preroute"."""
import socket
from typing import Dict, List, Optional

from pydantic import BaseModel, Field

from app.vpn import pki

SETTINGS_KEY = "preroute"
NET = "10.89"                     # link addresses: 10.89.<id>.1 (exit) / .2 (relay)


class Forward(BaseModel):
    proto: str = Field("both", pattern="^(tcp|udp|both)$")
    port: int = Field(..., ge=1, le=65535)                 # on the relay (what users connect to)
    to_port: Optional[int] = Field(None, ge=1, le=65535)   # on the exit; empty: the same port


class Tunnel(BaseModel):
    id: int
    relay: str                                    # server key: "master" or a node id
    exit: str
    kind: str = Field("wg", pattern="^(wg|awg)$")  # WireGuard (fast) / AmneziaWG (hidden)
    port: int = Field(51900, ge=1, le=65535)      # the exit's UDP port for the link
    mtu: int = Field(1420, ge=1200, le=1500)
    all_ports: bool = True                        # every inbound port of the exit
    forwards: List[Forward] = []                  # or just these
    relay_private: str = ""
    relay_public: str = ""
    exit_private: str = ""
    exit_public: str = ""
    psk: str = ""
    params: Dict[str, int] = {}


class PrerouteSettings(BaseModel):
    tunnels: Dict[str, Tunnel] = {}               # tunnel id -> tunnel (a relay may have several exits)


def load(db) -> PrerouteSettings:
    from app.db import crud
    return PrerouteSettings(**(crud.get_setting(db, SETTINGS_KEY) or {}))


def save(db, s: PrerouteSettings) -> PrerouteSettings:
    from app.db import crud
    from app.vpn import _random_awg_params
    for t in s.tunnels.values():
        if not t.relay_private:
            t.relay_private, t.relay_public = pki.wg_keypair()
        if not t.exit_private:
            t.exit_private, t.exit_public = pki.wg_keypair()
        if not t.psk:
            t.psk = pki.wg_psk()
        if t.kind == "awg" and not t.params:
            t.params = _random_awg_params()
    crud.set_setting(db, SETTINGS_KEY, s.model_dump())
    return s


def relays(s: PrerouteSettings) -> set:
    return {t.relay for t in s.tunnels.values()}


def exits(s: PrerouteSettings) -> set:
    return {t.exit for t in s.tunnels.values()}


def participants(s: PrerouteSettings) -> set:
    return {k for t in s.tunnels.values() for k in (t.relay, t.exit)}


def address_of(db, key: str) -> str:
    from app import vpn
    return vpn.master_public_address() if key == vpn.MASTER else vpn._node_address(db, key)


def ipv4(host: str) -> str:
    try:
        return socket.getaddrinfo(host, None, socket.AF_INET)[0][4][0]
    except OSError:
        return ""


def _xray_ports(key: str) -> set:
    from app.xray import cores
    from app import vpn
    try:
        core = cores.MAIN if key == vpn.MASTER else cores.core_of(int(key))
        return {int(i["port"]) for i in cores.config_of(core).get("inbounds", [])
                if str(i.get("port", "")).isdigit() and not str(i.get("tag", "")).startswith("chain-in")}
    except Exception:
        return set()


def reserved_ports(db, key: str) -> set:
    """ports a relay must keep for itself: the panel, its node API, the agent"""
    from app import vpn
    from config import UVICORN_PORT
    out = {62060, 22}
    s = vpn.load(db)
    srv = s.servers.get(key)
    if srv:
        out.add(srv.agent_port)
    if key == vpn.MASTER:
        out.add(int(UVICORN_PORT))
    else:
        from app.db.models import Node
        node = db.query(Node).filter(Node.id == int(key)).first()
        if node:
            out |= {node.port, node.api_port}
    return out


def forwards_of(db, t: Tunnel) -> List[Forward]:
    """what the relay forwards: the exit's Xray inbounds and VPN services, or the custom list"""
    if not t.all_ports:
        wanted = [Forward(proto=f.proto, port=f.port, to_port=f.to_port or f.port) for f in t.forwards]
    else:
        from app import vpn
        wanted = [Forward(proto="both", port=p, to_port=p) for p in sorted(_xray_ports(t.exit))]
        srv = vpn.load(db).servers.get(t.exit)
        if srv and srv.awg.enabled:
            wanted.append(Forward(proto="udp", port=srv.awg.port, to_port=srv.awg.port))
        if srv and srv.ovpn.enabled:
            wanted.append(Forward(proto=srv.ovpn.proto, port=srv.ovpn.port, to_port=srv.ovpn.port))
    skip = reserved_ports(db, t.relay) | {t.port}
    seen, out = set(), []
    for f in wanted:
        if f.port in skip or (f.proto, f.port) in seen:
            continue
        seen.add((f.proto, f.port))
        out.append(f)
    return out


def agent_tunnels(db, key: str, s: Optional[PrerouteSettings] = None) -> List[dict]:
    """what the agent on this server should run (its relay and exit sides)"""
    s = s or load(db)
    out = []
    for t in s.tunnels.values():
        common = {"id": t.id, "kind": t.kind, "iface": f"alxt{t.id}", "psk": t.psk, "mtu": t.mtu,
                  "params": t.params if t.kind == "awg" else {}}
        if t.exit == key:
            out.append({**common, "role": "exit", "private_key": t.exit_private, "peer_public_key": t.relay_public,
                        "local_addr": f"{NET}.{t.id}.1/30", "listen_port": t.port})
        if t.relay == key:
            exit_ip = ipv4(address_of(db, t.exit))
            if not exit_ip:
                continue
            out.append({**common, "role": "relay", "private_key": t.relay_private, "peer_public_key": t.exit_public,
                        "local_addr": f"{NET}.{t.id}.2/30", "peer_addr": f"{NET}.{t.id}.1",
                        "endpoint": f"{exit_ip}:{t.port}", "exit_ip": exit_ip,
                        "forwards": [f.model_dump() for f in forwards_of(db, t)]})
    return sorted(out, key=lambda x: (x["id"], x["role"]))
