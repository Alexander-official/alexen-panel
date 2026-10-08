"""AmneziaWG and OpenVPN next to Xray.

Every server (the master and each node) can run the Alexen VPN agent
(vpn-agent/). The panel keeps all keys and certificates, decides who may
connect (the same users Xray lets in: active / on hold), pushes that to the
agents, and reads their traffic counters back into the normal usage records
(limits, expiry, admin totals and node usage all apply).

Settings live in the settings table under "vpn"; per-user keys in the
vpn_identities table."""
import hashlib
import ipaddress
import json
import random
import secrets
import ssl
import tempfile
import threading
import time
from collections import defaultdict
from typing import Dict, List, Optional

from pydantic import BaseModel, Field, field_validator

from app import logger
from app.vpn import pki

SETTINGS_KEY = "vpn"
MASTER = "master"
TAG_AWG = "AmneziaWG"
TAG_OVPN = "OpenVPN"
ALLOWED_STATUSES = ("active", "on_hold")
# tunnel addresses are laid out for this many AmneziaWG devices per user, so
# changing the device count never moves anyone's address
DEVICE_SLOTS = 8


def _random_awg_params() -> dict:
    """AmneziaWG obfuscation values in the ranges its docs recommend"""
    jmin = random.randint(40, 60)
    s1 = random.randint(15, 120)
    s2 = random.randint(15, 120)
    while s1 + 56 == s2:
        s2 = random.randint(15, 120)
    hs = random.sample(range(5, 2147483647), 4)
    return {"jc": random.randint(3, 8), "jmin": jmin, "jmax": random.randint(jmin + 10, jmin + 80),
            "s1": s1, "s2": s2, "h1": hs[0], "h2": hs[1], "h3": hs[2], "h4": hs[3]}


class AWGSettings(BaseModel):
    enabled: bool = False
    # what the users' files connect to; empty: the server's address
    address: str = Field("", max_length=255)
    port: int = Field(51820, ge=1, le=65535)
    subnet: str = "10.66.0.0/16"
    mtu: int = Field(1420, ge=1200, le=1500)
    dns: List[str] = ["1.1.1.1", "8.8.8.8"]
    keepalive: int = Field(25, ge=0, le=300)
    # the server's key; made when the service is first turned on
    private_key: str = ""
    # obfuscation (Jc, Jmin, Jmax, S1, S2, H1-H4); clients get the same values
    params: Dict[str, int] = {}

    @field_validator("subnet")
    @classmethod
    def _subnet(cls, v):
        net = ipaddress.ip_network(v.strip(), strict=False)
        if net.version != 4 or net.prefixlen > 24:
            raise ValueError("AmneziaWG subnet: an IPv4 network of /24 or larger")
        return str(net)


class OVPNSettings(BaseModel):
    enabled: bool = False
    address: str = Field("", max_length=255)
    port: int = Field(1194, ge=1, le=65535)
    proto: str = Field("udp", pattern="^(udp|tcp)$")
    subnet: str = "10.67.0.0/16"
    dns: List[str] = ["1.1.1.1", "8.8.8.8"]
    # the server's certificate; made when the service is first turned on
    cert: str = ""
    key: str = ""

    @field_validator("subnet")
    @classmethod
    def _subnet(cls, v):
        net = ipaddress.ip_network(v.strip(), strict=False)
        if net.version != 4 or net.prefixlen > 24:
            raise ValueError("OpenVPN subnet: an IPv4 network of /24 or larger")
        return str(net)


class ServerVPN(BaseModel):
    agent_port: int = Field(62060, ge=1, le=65535)
    # where the panel reaches the agent; empty: 127.0.0.1 for the master, the node's address
    agent_address: str = ""
    # what client configs connect to; empty: the server's own address
    public_address: str = ""
    # the agent's certificate, pinned on first contact
    agent_cert: str = ""
    awg: AWGSettings = AWGSettings()
    ovpn: OVPNSettings = OVPNSettings()


class VPNSettings(BaseModel):
    servers: Dict[str, ServerVPN] = {}
    # AmneziaWG files (keys) per user: one per device, used at the same time
    awg_devices: int = Field(3, ge=1, le=DEVICE_SLOTS)
    ca: str = ""
    ca_key: str = ""
    tls_crypt: str = ""


# ---------------- settings ----------------

_lock = threading.RLock()


def load(db) -> VPNSettings:
    from app.db import crud
    return VPNSettings(**(crud.get_setting(db, SETTINGS_KEY) or {}))


def save(db, s: VPNSettings) -> VPNSettings:
    from app.db import crud
    crud.set_setting(db, SETTINGS_KEY, s.model_dump())
    return s


def ensure_secrets(s: VPNSettings, key: str) -> bool:
    """CA, tls-crypt key and the server's own keys, made the first time they're needed"""
    changed = False
    if not s.ca:
        s.ca, s.ca_key = pki.make_ca()
        changed = True
    if not s.tls_crypt:
        s.tls_crypt = pki.tls_crypt_key()
        changed = True
    srv = s.servers.setdefault(key, ServerVPN())
    if not srv.awg.private_key:
        srv.awg.private_key, _ = pki.wg_keypair()
        changed = True
    if not srv.awg.params:
        srv.awg.params = _random_awg_params()
        changed = True
    if not srv.ovpn.cert:
        srv.ovpn.cert, srv.ovpn.key = pki.issue(s.ca, s.ca_key, f"alexen-{key}", server=True)
        changed = True
    return changed


def server_keys(db) -> Dict[str, str]:
    """key -> name of every server: the master and each node"""
    from app.db.models import Node
    out = {MASTER: "Master"}
    out.update({str(nid): name for nid, name in db.query(Node.id, Node.name).all()})
    return out


def _node_address(db, key: str) -> str:
    if key == MASTER:
        return ""
    from app.db.models import Node
    node = db.query(Node).filter(Node.id == int(key)).first()
    return node.address if node else ""


def master_public_address() -> str:
    from urllib.parse import urlparse
    from config import XRAY_SUBSCRIPTION_URL_PREFIX
    return urlparse(XRAY_SUBSCRIPTION_URL_PREFIX).hostname or ""


def public_address(db, key: str, srv: ServerVPN) -> str:
    if srv.public_address:
        return srv.public_address
    return master_public_address() if key == MASTER else _node_address(db, key)


def service_address(db, key: str, srv: ServerVPN, kind: str) -> str:
    """the address in the users' files: the service's own, else the server's"""
    own = (srv.awg if kind == "awg" else srv.ovpn).address.strip()
    return own or public_address(db, key, srv)


def agent_address(db, key: str, srv: ServerVPN) -> str:
    if srv.agent_address:
        return srv.agent_address
    return "127.0.0.1" if key == MASTER else _node_address(db, key)


# ---------------- users ----------------

def identity(db, user):
    """the user's VPN identity, made on first use"""
    from app.db.models import User, VPNIdentity
    uid = getattr(user, "id", None)
    if uid is None:   # a UserResponse (API/sub models) has no id: find the row
        uid = db.query(User.id).filter(User.username == user.username).scalar()
        if uid is None:
            raise ValueError(f"user {user.username} not found")
    ident = db.query(VPNIdentity).filter(VPNIdentity.user_id == uid).first()
    if ident:
        return ident
    with _lock:
        s = load(db)
        if ensure_secrets(s, MASTER):
            save(db, s)
        from sqlalchemy import func
        idx = (db.query(func.max(VPNIdentity.idx)).scalar() or 0) + 1
        priv, pub = pki.wg_keypair()
        cn = f"u{uid}"
        cert, key = pki.issue(s.ca, s.ca_key, cn, server=False)
        ident = VPNIdentity(user_id=uid, idx=idx, awg_private_key=priv, awg_public_key=pub,
                            awg_psk=pki.wg_psk(), ovpn_cn=cn, ovpn_cert=cert, ovpn_key=key)
        db.add(ident)
        db.commit()
        return ident


def tunnel_ip(subnet: str, idx: int, slot: int = 0) -> str:
    """user idx (1, 2, ...) device slot (0-7): network + 1 + idx * 8 + slot
    (the server itself is network + 1)"""
    net = ipaddress.ip_network(subnet)
    n = 1 + idx * DEVICE_SLOTS + slot
    if n + 1 >= net.num_addresses:
        raise ValueError(f"subnet {subnet} is full: use a larger one (e.g. /16)")
    return str(net.network_address + n)


def device_keys(ident, slot: int):
    """(private, public) AmneziaWG key of one of the user's devices"""
    priv = pki.wg_device_key(ident.awg_private_key, slot)
    return priv, (ident.awg_public_key if slot == 0 else pki.wg_public(priv))


def server_ip(subnet: str) -> str:
    return str(ipaddress.ip_network(subnet).network_address + 1)


GROUPS_KEY = "host_groups"


def item(kind: str, key: str) -> str:
    """how a service of a server is named inside a group: awg:master, ovpn:1"""
    return f"{kind}:{key}"


def permissions(db):
    """(every service some group holds, group name -> its services)"""
    from app.db import crud
    by_group = {}
    for g in crud.get_setting(db, GROUPS_KEY, []) or []:
        by_group[g.get("name")] = set(g.get("vpn") or [])
    grouped = set().union(*by_group.values()) if by_group else set()
    return grouped, by_group


def _admin_groups(user) -> List[str]:
    admin = getattr(user, "admin", None)
    groups = getattr(admin, "host_groups", None) if admin is not None else None
    if isinstance(groups, str):
        from app.utils.host_groups import split_groups
        groups = split_groups(groups)
    return list(groups or [])


def may_use(user, kind: str, key: str, perms) -> bool:
    """same rule as hosts: a service in no group is for everyone; one in groups
    is for users of admins limited to one of those groups (and of unlimited admins)"""
    it = item(kind, key)
    grouped, by_group = perms
    if it not in grouped:
        return True
    groups = _admin_groups(user)
    return not groups or any(it in by_group.get(g, ()) for g in groups)


def allowed(user) -> bool:
    status = getattr(user.status, "value", user.status)
    return status in ALLOWED_STATUSES


# ---------------- client configs ----------------

AWG_NAMES = {"jc": "Jc", "jmin": "Jmin", "jmax": "Jmax", "s1": "S1", "s2": "S2", "s3": "S3", "s4": "S4",
             "h1": "H1", "h2": "H2", "h3": "H3", "h4": "H4"}


def awg_client_conf(db, s: VPNSettings, key: str, user, slot: int = 0) -> str:
    srv = s.servers[key]
    ident = identity(db, user)
    priv, _ = device_keys(ident, slot)
    lines = ["[Interface]", f"PrivateKey = {priv}",
             f"Address = {tunnel_ip(srv.awg.subnet, ident.idx, slot)}/32"]
    if srv.awg.dns:
        lines.append("DNS = " + ", ".join(srv.awg.dns))
    lines.append(f"MTU = {srv.awg.mtu}")
    for k, name in AWG_NAMES.items():
        if k in srv.awg.params:
            lines.append(f"{name} = {srv.awg.params[k]}")
    lines += ["", "[Peer]", f"PublicKey = {pki.wg_public(srv.awg.private_key)}",
              f"PresharedKey = {ident.awg_psk}",
              f"Endpoint = {service_address(db, key, srv, 'awg')}:{srv.awg.port}",
              "AllowedIPs = 0.0.0.0/0, ::/0"]
    if srv.awg.keepalive:
        lines.append(f"PersistentKeepalive = {srv.awg.keepalive}")
    return "\n".join(lines) + "\n"


def ovpn_client_conf(db, s: VPNSettings, key: str, user) -> str:
    srv = s.servers[key]
    ident = identity(db, user)
    lines = ["client", "dev tun", f"proto {srv.ovpn.proto}",
             f"remote {service_address(db, key, srv, 'ovpn')} {srv.ovpn.port}",
             "resolv-retry infinite", "nobind", "persist-key", "persist-tun", "remote-cert-tls server",
             "data-ciphers AES-128-GCM:AES-256-GCM:CHACHA20-POLY1305", "verb 3",
             f"<ca>\n{s.ca.strip()}\n</ca>", f"<cert>\n{ident.ovpn_cert.strip()}\n</cert>",
             f"<key>\n{ident.ovpn_key.strip()}\n</key>", f"<tls-crypt>\n{s.tls_crypt.strip()}\n</tls-crypt>"]
    return "\n".join(lines) + "\n"


def offered(db, user) -> List[dict]:
    """the servers and services a user can use right now (for the sub page)"""
    if not allowed(user):
        return []
    s = load(db)
    names = server_keys(db)
    perms = permissions(db)
    out = []
    for key, srv in s.servers.items():
        if key not in names:
            continue
        # a server whose agent doesn't answer would only hand out dead files
        if state.get(key, {}).get("connected") is False:
            continue
        awg = srv.awg.enabled and may_use(user, "awg", key, perms)
        ovpn = srv.ovpn.enabled and may_use(user, "ovpn", key, perms)
        if awg or ovpn:
            out.append({"key": key, "name": names[key], "awg": awg, "ovpn": ovpn})
    return out


# ---------------- agents ----------------

def digest(obj) -> str:
    """the same hash the agent reports for what it applied"""
    return hashlib.sha256(json.dumps(obj, sort_keys=True).encode()).hexdigest()


_tmp_files: Dict[str, str] = {}


def _tmp(name: str, content: str) -> str:
    path = _tmp_files.get(name)
    if path:
        with open(path) as f:
            if f.read() == content:
                return path
    f = tempfile.NamedTemporaryFile("w", delete=False, suffix=".pem")
    f.write(content)
    f.close()
    _tmp_files[name] = f.name
    return f.name


class AgentError(Exception):
    pass


def _connect_host(host: str) -> str:
    """the agent's IPv4 address when it has one (IPv6 is often not routed)"""
    import socket
    try:
        return socket.getaddrinfo(host, None, socket.AF_INET)[0][4][0]
    except OSError:
        return host


def _version(v) -> tuple:
    try:
        return tuple(int(x) for x in str(v or "0").split(".")[:3])
    except ValueError:
        return (0,)


def _unreachable(host: str, port: int, e: Exception) -> str:
    text = str(e).lower()
    errno = getattr(e, "errno", None)
    if errno in (101, 113) or "unreachable" in text:
        return f"The panel can't reach {host} (network unreachable): check the server's address"
    if isinstance(e, ConnectionRefusedError) or "refused" in text:
        return (f"Nothing listens on {host}:{port}: the agent isn't installed on this server yet "
                "(run the install command below there) or it stopped")
    if "timed out" in text or "timeout" in text:
        return (f"No answer from {host}:{port}: open TCP {port} in that server's firewall "
                "(and in the hosting provider's panel), or install the agent there")
    if "name or service" in text or "getaddrinfo" in text or "nodename" in text:
        return f"Can't resolve {host}: check the server's address"
    return f"Agent not reachable at {host}:{port} ({e.__class__.__name__})"


def _panel_cert(db):
    from app.db import crud
    tls = crud.get_tls_certificate(db)
    return tls.certificate, tls.key


def call(db, key: str, srv: ServerVPN, method: str, path: str, body=None, timeout=10):
    """talk to a server's agent over mutual TLS (the agent's certificate is
    pinned the first time)"""
    import requests
    from app.xray.node import SANIgnoringAdaptor
    host = agent_address(db, key, srv)
    if not host:
        raise AgentError("no address")
    cert, k = _panel_cert(db)
    target = _connect_host(host)
    port = srv.agent_port
    # a node reached through SSH (app/node_tunnel.py): its agent goes the same way
    if key != MASTER and not srv.agent_address and str(key).isdigit():
        from app import node_tunnel
        local = node_tunnel.local_for(int(key), srv.agent_port)
        if local:
            target, port = "127.0.0.1", local
    pin = srv.agent_cert
    if not pin:
        try:
            pin = ssl.get_server_certificate((target, port), timeout=8)
        except Exception as e:
            raise AgentError(_unreachable(host, srv.agent_port, e))
        with _lock:
            s = load(db)
            entry = s.servers.setdefault(key, ServerVPN())
            if not entry.agent_cert:
                entry.agent_cert = pin
                save(db, s)
        srv.agent_cert = pin
    session = requests.Session()
    session.mount("https://", SANIgnoringAdaptor())
    session.cert = (_tmp("panel-cert", cert), _tmp("panel-key", k))
    session.verify = _tmp(f"agent-{key}", pin)
    try:
        url_host = f"[{target}]" if ":" in target else target
        r = session.request(method, f"https://{url_host}:{port}{path}", json=body, timeout=timeout)
    except requests.exceptions.SSLError:
        raise AgentError("the agent's certificate changed (reinstalled?): reset the pin in VPN settings")
    except requests.RequestException as e:
        raise AgentError(_unreachable(host, srv.agent_port, e))
    try:
        data = r.json()
    except ValueError:
        raise AgentError(f"bad answer ({r.status_code})")
    if r.status_code >= 400 and r.status_code != 500:
        raise AgentError(data.get("detail") or f"error {r.status_code}")
    return data


_pub_cache: Dict[tuple, str] = {}


def _device_pub(ident, slot: int) -> str:
    k = (ident.awg_private_key, slot)
    if k not in _pub_cache:
        _pub_cache[k] = device_keys(ident, slot)[1]
    return _pub_cache[k]


def desired(db, s: VPNSettings, key: str, users, idents, perms=None) -> dict:
    """what the server's agent should run"""
    srv = s.servers[key]
    perms = perms or permissions(db)
    awg_users = [u for u in users if may_use(u, "awg", key, perms)]
    ovpn_users = [u for u in users if may_use(u, "ovpn", key, perms)]
    body = {}
    if srv.awg.enabled:
        peers = []
        for u in awg_users:
            ident = idents.get(u.id)
            if ident:
                for slot in range(s.awg_devices):
                    peers.append({"public_key": _device_pub(ident, slot), "psk": ident.awg_psk,
                                  "ip": tunnel_ip(srv.awg.subnet, ident.idx, slot)})
        body["awg"] = {"enabled": True, "port": srv.awg.port,
                       "address": f"{server_ip(srv.awg.subnet)}/{ipaddress.ip_network(srv.awg.subnet).prefixlen}",
                       "mtu": srv.awg.mtu, "private_key": srv.awg.private_key, "params": srv.awg.params,
                       "peers": sorted(peers, key=lambda p: p["ip"])}
    else:
        body["awg"] = {"enabled": False}
    if srv.ovpn.enabled:
        body["ovpn"] = {"enabled": True, "port": srv.ovpn.port, "proto": srv.ovpn.proto, "network": srv.ovpn.subnet,
                        "dns": srv.ovpn.dns, "ca": s.ca, "cert": srv.ovpn.cert, "key": srv.ovpn.key,
                        "tls_crypt": s.tls_crypt,
                        "clients": sorted(idents[u.id].ovpn_cn for u in ovpn_users if u.id in idents)}
    else:
        body["ovpn"] = {"enabled": False}
    return body


# live state per server, for the panel page and the usage job
state: Dict[str, dict] = {}
_last: Dict[str, Dict[str, tuple]] = defaultdict(dict)   # server -> counter id -> (rx, tx)
_pending: Dict[Optional[int], Dict[tuple, int]] = defaultdict(lambda: defaultdict(int))  # node -> (uid, tag) -> bytes
_pending_lock = threading.Lock()


def _node_id(key: str) -> Optional[int]:
    return None if key == MASTER else int(key)


_seen_servers: set = set()   # servers read at least once since the panel started
# server -> user id -> ip -> {"tag", "last_seen"}: who is connected from where
sessions: Dict[str, Dict[int, Dict[str, dict]]] = {}


def _endpoint_ip(endpoint: str) -> str:
    """"1.2.3.4:5678" / "[2a00::1]:5678" -> the IP"""
    if not endpoint or endpoint == "(none)":
        return ""
    if endpoint.startswith("["):
        return endpoint[1:].split("]", 1)[0]
    return endpoint.rsplit(":", 1)[0]


def online_ips() -> Dict[int, Dict[str, dict]]:
    """user id -> ip -> {"nodes", "tags", "last_seen"} over every server (for app/xray/online)"""
    names = dict(_server_names)
    out: Dict[int, Dict[str, dict]] = {}
    for key, users in list(sessions.items()):
        for uid, ips in users.items():
            for ip, info in ips.items():
                e = out.setdefault(uid, {}).setdefault(ip, {"nodes": [], "tags": [], "last_seen": 0})
                name = names.get(key, key)
                if name not in e["nodes"]:
                    e["nodes"].append(name)
                if info["tag"] not in e["tags"]:
                    e["tags"].append(info["tag"])
                e["last_seen"] = max(e["last_seen"], info["last_seen"])
    return out


_server_names: Dict[str, str] = {}


def _count(key: str, counter: str, rx: int, tx: int, uid: int, tag: str):
    prev = _last[key].get(counter)
    _last[key][counter] = (rx, tx)
    if prev is None:
        if key not in _seen_servers:
            return   # the first read after the panel starts holds older traffic: a baseline only
        prev = (0, 0)  # a peer / client that appeared since the last read: all of it is new
    d = (rx - prev[0] if rx >= prev[0] else rx) + (tx - prev[1] if tx >= prev[1] else tx)
    if d > 0:
        with _pending_lock:
            _pending[_node_id(key)][(uid, tag)] += d


def sync():
    """scheduler job: push who may connect to every agent, read traffic back"""
    from app.db import GetDB
    from app.db.models import User, VPNIdentity
    with GetDB() as db:
        s = load(db)
        names = server_keys(db)
        _server_names.clear()
        _server_names.update(names)
        for gone in [k for k in sessions if k not in names]:
            sessions.pop(gone, None)
        from app.vpn import preroute
        pr = preroute.load(db)
        tunnel_keys = preroute.participants(pr)
        active = [k for k in names if k in tunnel_keys or state.get(k, {}).get("tunnels")
                  or (k in s.servers and (s.servers[k].awg.enabled or s.servers[k].ovpn.enabled))
                  or state.get(k, {}).get("running")]
        if not active:
            sessions.clear()
            return
        users = [u for u in db.query(User).all() if allowed(u)]
        idents = {i.user_id: i for i in db.query(VPNIdentity).all()}
        for u in users:
            if u.id not in idents:
                idents[u.id] = identity(db, u)
        s = load(db)   # identity() may have made the CA
        perms = permissions(db)
        by_pub = {_device_pub(i, slot): i.user_id for i in idents.values() for slot in range(s.awg_devices)}
        by_cn = {i.ovpn_cn: i.user_id for i in idents.values()}
        for key in active:
            srv = s.servers.get(key) or ServerVPN()
            st = state.setdefault(key, {})
            try:
                if (srv.awg.enabled or srv.ovpn.enabled) and ensure_secrets(s, key):
                    save(db, s)
                if key in s.servers:
                    body = desired(db, s, key, users, idents, perms)
                else:
                    body = {"awg": {"enabled": False}, "ovpn": {"enabled": False}}
                body["tunnels"] = preroute.agent_tunnels(db, key, pr)
                status = call(db, key, srv, "GET", "/status", timeout=8)
                want_awg = digest(body["awg"]) if body["awg"].get("enabled") else ""
                want_ovpn = digest(body["ovpn"]) if body["ovpn"].get("enabled") else ""
                want_tun = digest(body["tunnels"]) if body["tunnels"] else ""
                have_tun = (status.get("tunnels") or {}).get("hash", "")
                if body["tunnels"] and "tunnels" not in status:
                    raise AgentError("This server's agent is too old for preroute: run the install command again to update it")
                if any(t.get("role") == "nat" for t in body["tunnels"]) and \
                        _version(status.get("version")) < (1, 3, 0):
                    raise AgentError("This server's agent is too old for iptables forwarding: "
                                     "run the install command again to update it")
                errors = {}
                if status["awg"]["hash"] != want_awg or status["ovpn"]["hash"] != want_ovpn or have_tun != want_tun:
                    status = call(db, key, srv, "POST", "/apply", body, timeout=30)
                    errors = status.get("errors") or {}
                stats = call(db, key, srv, "GET", "/stats", timeout=8)
                now = time.time()
                online = set()
                here: Dict[int, Dict[str, dict]] = {}
                for p in stats.get("awg", []):
                    uid = by_pub.get(p["public_key"])
                    if uid:
                        _count(key, "awg:" + p["public_key"], p["rx"], p["tx"], uid, TAG_AWG)
                        # a handshake every 2 minutes while connected (keepalive keeps it fresh)
                        if p.get("handshake") and now - p["handshake"] < 180:
                            online.add(uid)
                            ip = _endpoint_ip(p.get("endpoint", ""))
                            if ip:
                                here.setdefault(uid, {})[ip] = {"tag": TAG_AWG, "last_seen": p["handshake"]}
                for c in stats.get("ovpn", []):
                    uid = by_cn.get(c["cn"])
                    if uid:
                        _count(key, "ovpn:" + c["cn"], c["rx"], c["tx"], uid, TAG_OVPN)
                        if c.get("online"):
                            online.add(uid)
                            for ip in c.get("addresses") or []:
                                here.setdefault(uid, {})[ip] = {"tag": TAG_OVPN, "last_seen": now}
                sessions[key] = here
                _seen_servers.add(key)
                st.update({"connected": True, "error": "; ".join(f"{k}: {v}" for k, v in errors.items()),
                           "version": status.get("version"), "awg": status["awg"], "ovpn": status["ovpn"],
                           "tunnels": (status.get("tunnels") or {}).get("links", []),
                           "running": status["awg"]["running"] or status["ovpn"]["running"],
                           "online": len(online), "checked": now})
            except AgentError as e:
                sessions.pop(key, None)
                st.update({"connected": False, "error": str(e), "checked": time.time()})
            except Exception as e:
                logger.warning(f"VPN sync {key}: {e}")
                st.update({"connected": False, "error": str(e), "checked": time.time()})


def collect_usage() -> Dict[Optional[int], tuple]:
    """traffic since the last call, in record_user_usages' shape:
    node id -> ([{"uid", "value"}], [{"uid", "tag", "value"}])"""
    with _pending_lock:
        pending = dict(_pending)
        _pending.clear()
    out = {}
    for node_id, rows in pending.items():
        per_user = defaultdict(int)
        inbound = []
        for (uid, tag), v in rows.items():
            per_user[uid] += v
            inbound.append({"uid": str(uid), "tag": tag, "value": v})
        out[node_id] = ([{"uid": str(uid), "value": v} for uid, v in per_user.items()], inbound)
    return out


def load_safe(key: str) -> Optional[ServerVPN]:
    """one server's VPN settings, with its own DB session (None when it has none)"""
    try:
        from app.db import GetDB
        with GetDB() as db:
            return load(db).servers.get(key)
    except Exception:
        return None
