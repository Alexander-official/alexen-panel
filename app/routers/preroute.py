"""Preroute (app/vpn/preroute.py): rules "relay VPS port -> exit port", each
over a WireGuard / AmneziaWG link, plain iptables or an Xray tunnel inbound."""
from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import vpn
from app.db import get_db
from app.models.admin import Admin
from app.utils import responses
from app.vpn import preroute

router = APIRouter(tags=["Preroute"], prefix="/api/preroute", responses={401: responses._401, 403: responses._403})


class TunnelIn(BaseModel):
    relay: str
    exit: str = ""
    kind: str = Field("wg", pattern="^(wg|awg|iptables|xray)$")
    port: Optional[int] = Field(None, ge=1, le=65535)
    mtu: int = Field(1420, ge=1200, le=1500)
    all_ports: bool = True
    forwards: List[preroute.Forward] = []


def _inbounds(key: str) -> list:
    """the exit's inbounds, for picking ports in the panel"""
    from app.xray import cores
    try:
        core = cores.MAIN if key == vpn.MASTER else cores.core_of(int(key))
        out = []
        for i in cores.config_of(core).get("inbounds", []):
            port = i.get("port")
            if not str(port).isdigit() or str(i.get("tag", "")).startswith(("chain-in", "API")):
                continue
            net = (i.get("streamSettings") or {}).get("network") or ("udp" if i.get("protocol") in ("hysteria",) else "tcp")
            udp = i.get("protocol") in ("hysteria", "wireguard") or net in ("kcp", "quic", "hysteria")
            out.append({"tag": i.get("tag"), "port": int(port), "protocol": i.get("protocol"), "proto": "udp" if udp else "tcp"})
        s = vpn.load_safe(key)
        if s and s.awg.enabled:
            out.append({"tag": "AmneziaWG", "port": s.awg.port, "protocol": "amneziawg", "proto": "udp"})
        if s and s.ovpn.enabled:
            out.append({"tag": "OpenVPN", "port": s.ovpn.port, "protocol": "openvpn", "proto": s.ovpn.proto})
        return sorted(out, key=lambda x: x["port"])
    except Exception:
        return []


def _state(db: Session) -> dict:
    names = vpn.server_keys(db)
    s = preroute.load(db)
    servers = []
    for key, name in names.items():
        st = vpn.state.get(key, {})
        servers.append({
            "key": key, "name": name, "address": preroute.address_of(db, key),
            "agent": {"connected": st.get("connected"), "version": st.get("version", ""), "error": st.get("error", "")},
            "role": "relay" if key in preroute.relays(s) else "exit" if key in preroute.exits(s) else "",
            "inbounds": _inbounds(key),
        })
    tunnels = []
    for tid, t in sorted(s.tunnels.items(), key=lambda x: int(x[0])):
        mine = next((x for x in vpn.state.get(t.relay, {}).get("tunnels") or []
                     if x.get("id") == t.id and x.get("role") == "relay"), None) or {}
        tunnels.append({
            "id": t.id, "relay": t.relay, "exit": t.exit, "kind": t.kind, "port": t.port, "mtu": t.mtu,
            "all_ports": t.all_ports, "enabled": t.enabled, "forwards": [f.model_dump() for f in t.forwards],
            "forwarding": [f.model_dump() for f in preroute.forwards_of(db, t)],
            "replaces": preroute.replaced_inbounds(db, t) if t.kind in ("xray", "iptables") and t.enabled else [],
            "handshake": mine.get("handshake", 0), "rx": mine.get("rx", 0), "tx": mine.get("tx", 0),
        })
    return {"servers": servers, "tunnels": tunnels}


def _expand(fs):
    return {(p, f.port) for f in fs for p in (("tcp", "udp") if f.proto == "both" else (f.proto,))}


def _check(db: Session, s: preroute.PrerouteSettings, t: preroute.Tunnel, names: dict):
    link = t.kind in preroute.LINK_KINDS
    if t.relay not in names or (t.exit and t.exit not in names):
        raise HTTPException(400, "Server not found")
    if link and not t.exit:
        raise HTTPException(400, "Pick the exit server for a WireGuard / AmneziaWG link")
    if t.relay == t.exit:
        raise HTTPException(400, "A server can't forward to itself")
    others = [x for x in s.tunnels.values() if x.id != t.id]
    if link:
        if any(x.exit == t.relay and x.kind in preroute.LINK_KINDS for x in others):
            raise HTTPException(400, f"{names[t.relay]} is an exit for another rule; a server is either a relay or an exit")
        if any(x.relay == t.exit and x.kind in preroute.LINK_KINDS for x in others):
            raise HTTPException(400, f"{names[t.exit]} is a relay in another rule; pick the server users finally exit from")
    if t.exit and not preroute.ipv4(preroute.address_of(db, t.exit)):
        raise HTTPException(400, f"Can't find an IPv4 address for {names[t.exit]}")
    if (not t.all_ports or not t.exit) and not t.forwards:
        raise HTTPException(400, "Add at least one port")
    if not link:
        for f in t.forwards:
            if not t.exit and not f.to_addr:
                raise HTTPException(400, f"Port {f.port}: enter the target IP or domain")
            if f.to_addr and not preroute.ipv4(f.to_addr):
                raise HTTPException(400, f"Can't find an IPv4 address for {f.to_addr}")
        # xray: a relay inbound on a forwarded port is replaced by the tunnel (like iptables
        # DNAT does), so the relay can forward the very ports it serves itself (3x-ui style)
    # one relay port can lead to one place only
    mine = _expand(preroute.forwards_of(db, t))
    for x in others:
        if x.relay != t.relay:
            continue
        clash = sorted({port for _, port in mine & _expand(preroute.forwards_of(db, x))})
        if clash:
            where = names.get(x.exit, x.exit) if x.exit else "another target"
            raise HTTPException(400, f"Port {', '.join(map(str, clash))} of {names[t.relay]} already goes to "
                                     f"{where} (another rule)")
    reserved = preroute.reserved_ports(db, t.relay) & {f.port for f in t.forwards}
    if reserved and (not t.all_ports or not t.exit):
        raise HTTPException(400, f"Port {', '.join(map(str, sorted(reserved)))} is needed by {names[t.relay]} itself "
                                 "(SSH, panel, node or agent)")


def _after_change(bg: BackgroundTasks, *rules: Optional[preroute.Tunnel]):
    """xray rules live in the relay's config: restart that core; the rest reach the agents"""
    from app import vpn
    from app.xray import chain
    bg.add_task(vpn.sync)
    relays = sorted({r.relay for r in rules if r is not None and r.kind == "xray"})
    if relays:
        bg.add_task(chain.restart_servers, relays)


@router.get("")
def get_preroute(db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    return _state(db)


@router.put("/tunnels/{tid}")
def put_tunnel(tid: str, body: TunnelIn, bg: BackgroundTasks, db: Session = Depends(get_db),
               admin: Admin = Depends(Admin.check_sudo_admin)):
    """tid "new" adds a rule"""
    names = vpn.server_keys(db)
    s = preroute.load(db)
    old = s.tunnels.get(tid)
    if tid != "new" and not old:
        raise HTTPException(404, "Rule not found")
    new_id = old.id if old else (max((t.id for t in s.tunnels.values()), default=0) + 1)
    if new_id > 250:
        raise HTTPException(400, "Too many rules")
    port = body.port or 51900
    if body.kind in preroute.LINK_KINDS:
        used = {t.port for t in s.tunnels.values() if t.exit == body.exit and t.id != new_id} | preroute._xray_ports(body.exit)
        port = body.port or (old.port if old and old.exit == body.exit else None)
        if port is None:
            port = next(p for p in range(51900, 52900) if p not in used)
        elif port in used:
            raise HTTPException(400, f"UDP port {port} is already used on {names.get(body.exit, body.exit)}")
    keep = old.model_dump() if old and old.relay == body.relay and old.exit == body.exit and old.kind == body.kind else {}
    t = preroute.Tunnel(**{**keep, "id": new_id, "relay": body.relay, "exit": body.exit, "kind": body.kind,
                           "port": port, "mtu": body.mtu, "all_ports": body.all_ports,
                           "forwards": [f.model_dump() for f in body.forwards]})
    _check(db, s, t, names)
    s.tunnels[str(new_id)] = t
    preroute.save(db, s)
    _after_change(bg, old, t)
    return _state(db)


class EnabledIn(BaseModel):
    enabled: bool


@router.put("/tunnels/{tid}/enabled")
def set_tunnel_enabled(tid: str, body: EnabledIn, bg: BackgroundTasks, db: Session = Depends(get_db),
                       admin: Admin = Depends(Admin.check_sudo_admin)):
    """turn a rule off (kept, nothing of it runs) or on again"""
    s = preroute.load(db)
    t = s.tunnels.get(tid)
    if t is None:
        raise HTTPException(404, "Rule not found")
    if t.enabled != body.enabled:
        t.enabled = body.enabled
        preroute.save(db, s)
        _after_change(bg, t)
    return _state(db)


@router.delete("/tunnels/{tid}")
def delete_tunnel(tid: str, bg: BackgroundTasks, db: Session = Depends(get_db),
                  admin: Admin = Depends(Admin.check_sudo_admin)):
    s = preroute.load(db)
    gone = s.tunnels.pop(tid, None)
    if gone is None:
        raise HTTPException(404, "Rule not found")
    preroute.save(db, s)
    _after_change(bg, gone)
    return _state(db)


@router.post("/tunnels/{tid}/hosts")
def make_hosts(tid: str, db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """a copy of every host of the forwarded inbounds, with the relay's address and port"""
    from app import xray
    from app.db.models import ProxyHost
    from app.xray import cores
    s = preroute.load(db)
    t = s.tunnels.get(tid)
    if not t:
        raise HTTPException(404, "Rule not found")
    if not t.exit:
        raise HTTPException(400, "This rule has custom targets: add its hosts on the Hosts page")
    names = vpn.server_keys(db)
    address = preroute.address_of(db, t.relay)
    relay_port = {f.to_port or f.port: f.port for f in preroute.forwards_of(db, t) if not f.to_addr}
    tags = set(xray.config.inbounds_by_tag)
    core = cores.MAIN if t.exit == vpn.MASTER else cores.core_of(int(t.exit))
    made = 0
    for ib in cores.config_of(core).get("inbounds", []):
        if ib.get("tag") not in tags or ib.get("port") not in relay_port:
            continue
        hosts = db.query(ProxyHost).filter(ProxyHost.inbound_tag == ib["tag"]).order_by(ProxyHost.id).all()
        port = relay_port[ib["port"]]
        if any(h.address == address and (h.port or ib["port"]) == port for h in hosts):
            continue
        base = hosts[0] if hosts else None
        h = ProxyHost(inbound_tag=ib["tag"], address=address,
                      remark=(base.remark if base else ib["tag"]) + f" ({names.get(t.relay, t.relay)})")
        if base:
            for col in ("path", "sni", "host", "security", "alpn", "fingerprint", "allowinsecure",
                        "is_disabled", "mux_enable", "fragment_setting", "noise_setting", "random_user_agent",
                        "use_sni_as_host", "group_name"):
                if hasattr(base, col):
                    setattr(h, col, getattr(base, col))
        h.port = None if port == ib["port"] else port
        db.add(h)
        made += 1
    db.commit()
    xray.hosts.update()
    return {"created": made}


_PROBE = r"""
for t in $TARGETS; do
  h=${t%:*}; p=${t#*:}
  ok=0; for i in 1 2; do timeout 4 bash -c "</dev/tcp/$h/$p" 2>/dev/null && { ok=1; break; }; done
  echo "T $h $p $ok"
done
for h in $HOSTS; do
  ping -c 3 -W 2 -q "$h" >/dev/null 2>&1 && echo "P $h 1" || echo "P $h 0"
done
"""


@router.post("/tunnels/{tid}/test")
def test_tunnel(tid: str, db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """from the relay itself: can it reach the targets? (TCP connect to each
    target port, ping to each target IP). A target the relay can't reach can't
    work through any forwarding, so this tells a network block from a panel problem."""
    import shlex
    import socket
    import subprocess
    from concurrent.futures import ThreadPoolExecutor
    s = preroute.load(db)
    t = s.tunnels.get(tid)
    if not t:
        raise HTTPException(404, "Rule not found")
    targets = []
    for f in preroute.forwards_of(db, t):
        ip = preroute.target_of(db, t, f)
        if ip and f.proto in ("tcp", "both"):
            targets.append((ip, int(f.to_port or f.port)))
    hosts = sorted({ip for ip, _ in targets} | {preroute.target_of(db, t, f) for f in preroute.forwards_of(db, t)} - {""})
    targets = sorted(set(targets))[:40]
    tcp, ping = {}, {}
    if t.relay == vpn.MASTER:
        def one(tp):
            for _ in range(2):
                try:
                    socket.create_connection(tp, timeout=4).close()
                    return True
                except OSError:
                    pass
            return False
        with ThreadPoolExecutor(max_workers=16) as ex:
            tcp = dict(zip(targets, ex.map(one, targets)))
        import shutil
        if shutil.which("ping"):   # not in every image: then just no ping line
            for h in hosts:
                ping[h] = subprocess.run(["ping", "-c", "3", "-W", "2", "-q", h], capture_output=True).returncode == 0
    else:
        from app import outbound_tools
        try:
            client, _ = outbound_tools.ssh_session(int(t.relay))
        except ValueError as e:
            raise HTTPException(400, str(e))
        try:
            env = f"TARGETS={shlex.quote(' '.join(f'{h}:{p}' for h, p in targets))} HOSTS={shlex.quote(' '.join(hosts))}"
            _, out, _ = client.exec_command("bash -c " + shlex.quote(f"{env}\n{_PROBE}"), timeout=300)
            for line in out.read().decode().splitlines():
                parts = line.split()
                if len(parts) == 4 and parts[0] == "T":
                    tcp[(parts[1], int(parts[2]))] = parts[3] == "1"
                elif len(parts) == 3 and parts[0] == "P":
                    ping[parts[1]] = parts[2] == "1"
        finally:
            client.close()
    udp_only = {}
    try:
        e2e = _end_to_end(db, t, udp_only)
    except Exception as e:
        from app import logger
        logger.warning(f"preroute test {tid}: end-to-end part failed: {e}")
        e2e = []
    return {"tcp": [{"ip": h, "port": p, "ok": tcp.get((h, p), False), "udp_only": udp_only.get((h, p), False)}
                    for h, p in targets],
            "ping": [{"ip": h, "ok": ping[h]} for h in hosts if h in ping],
            "e2e": e2e}


UDP_NETWORKS = {"hysteria", "kcp", "mkcp", "quic"}


def _panel_inbound_at(db, ip: str, port: int):
    """(server key, inbound) of a panel server listening on ip:port, or None"""
    from app.xray import cores
    for key in vpn.server_keys(db):
        if preroute.ipv4(preroute.address_of(db, key)) != ip:
            continue
        core = cores.MAIN if key == vpn.MASTER else cores.core_of(int(key))
        for ib in cores.config_of(core).get("inbounds", []):
            if ib.get("port") == port and ib.get("tag"):
                return key, ib
    return None


def _end_to_end(db, t: preroute.Tunnel, udp_only: dict) -> list:
    """like a user: a real config of the target inbound, pointed at relay:port,
    connected from the panel. Only for targets that are this panel's inbounds."""
    from app import outbound_tools, xray
    from app.db.models import User
    from app.models.user import UserResponse
    from app.subscription import external_sources as es
    from app.subscription.share import generate_v2ray_links
    relay_addr = preroute.address_of(db, t.relay)
    cases = []
    for f in preroute.forwards_of(db, t)[:16]:
        ip, to = preroute.target_of(db, t, f), int(f.to_port or f.port)
        hit = _panel_inbound_at(db, ip, to) if ip else None
        if not hit:
            continue
        key, ib = hit
        net = ((ib.get("streamSettings") or {}).get("network") or "tcp").lower()
        if ib.get("protocol") in ("hysteria", "wireguard") or net in UDP_NETWORKS:
            udp_only[(ip, to)] = True
        tag = ib["tag"]
        if tag not in xray.config.inbounds_by_tag:
            continue
        from app.models.proxy import ProxyTypes
        protocol = ProxyTypes(xray.config.inbounds_by_tag[tag]["protocol"])
        link = None
        for u in db.query(User).filter(User.status == "active").limit(200):
            ur = UserResponse.model_validate(u)
            if tag not in (ur.inbounds.get(protocol) or []):
                continue
            links = generate_v2ray_links({protocol: ur.proxies[protocol]}, {protocol: [tag]},
                                         extra_data=ur.model_dump(), reverse=False)
            link = next((l for l in links if es.parse(l)), None)
            if link:
                break
        if not link:
            cases.append({"port": f.port, "to": f"{ip}:{to}", "tag": tag, "error": "no-user"})
            continue
        ob = es.parse(link)["outbound"]
        st = ob.get("settings") or {}
        if "address" in st:
            st["address"], st["port"] = relay_addr, f.port
        for k in ("vnext", "servers"):
            for srv in st.get(k) or []:
                srv["address"], srv["port"] = relay_addr, f.port
        cases.append({"port": f.port, "to": f"{ip}:{to}", "tag": tag, "outbound": ob})
    todo = [c for c in cases if "outbound" in c]
    if todo:
        res = outbound_tools.test([c["outbound"] for c in todo], "master", [outbound_tools.SITES[0][1]], timeout=8)
        for c, r in zip(todo, res):
            c.update({"delay": r["delay"], "error": r["error"], "exit": r["exit"],
                      "ok": r.get("ok", 0), "total": r.get("total", 0)})
    for c in cases:
        c.pop("outbound", None)
    return cases



def _xui_tunnels(data: bytes) -> list:
    """the tunnel (dokodemo-door) inbounds of a 3x-ui database backup"""
    import json
    import os
    import sqlite3
    import tempfile
    if not data.startswith(b"SQLite format 3"):
        raise HTTPException(400, "Not a 3x-ui backup: pick the .db file from 3x-ui (Backup → Download)")
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        f.write(data)
        path = f.name
    try:
        c = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
        try:
            cols = [r[1] for r in c.execute("pragma table_info(inbounds)")]
            if "protocol" not in cols:
                raise HTTPException(400, "Not a 3x-ui backup: it has no inbounds table")
            rows = [dict(zip(cols, r)) for r in c.execute("select * from inbounds")]
        finally:
            c.close()
    except sqlite3.DatabaseError:
        raise HTTPException(400, "Not a 3x-ui backup: pick the .db file from 3x-ui (Backup → Download)")
    finally:
        os.unlink(path)
    out = []
    for r in rows:
        if r.get("protocol") not in ("tunnel", "dokodemo-door"):
            continue
        try:
            st = json.loads(r.get("settings") or "{}")
        except ValueError:
            continue
        addr = st.get("rewriteAddress") or st.get("address") or ""
        to = st.get("rewritePort") or st.get("port") or r.get("port")
        net = (st.get("allowedNetwork") or st.get("network") or "tcp,udp").replace(" ", "")
        proto = "both" if ("tcp" in net and "udp" in net) else ("udp" if "udp" in net else "tcp")
        if not addr or not r.get("port"):
            continue
        out.append({"port": int(r["port"]), "to_addr": str(addr), "to_port": int(to), "proto": proto,
                    "note": str(r.get("remark") or "")[:64], "enabled": bool(r.get("enable", 1))})
    return sorted(out, key=lambda x: x["port"])


@router.post("/import-3xui")
def import_3xui(bg: BackgroundTasks, file: UploadFile = File(...), relay: str = Form(""), apply: bool = Form(False),
                ports: str = Form(""), db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """read a 3x-ui backup's tunnels; with apply, add them to the relay as one Xray tunnel rule
    (only the listed relay ports when "ports" is given)"""
    data = file.file.read(20 * 1024 * 1024 + 1)
    if len(data) > 20 * 1024 * 1024:
        raise HTTPException(400, "The file is too big for a 3x-ui backup")
    found = _xui_tunnels(data)
    if not apply:
        return {"tunnels": found}
    names = vpn.server_keys(db)
    if relay not in names:
        raise HTTPException(400, "Pick the relay server")
    pick = {int(p) for p in ports.split(",") if p.strip().isdigit()} if ports.strip() else None
    chosen = [x for x in found if pick is None or x["port"] in pick]
    if not chosen:
        raise HTTPException(400, "No tunnels picked")
    s = preroute.load(db)
    new_id = max((t.id for t in s.tunnels.values()), default=0) + 1
    t = preroute.Tunnel(id=new_id, relay=relay, exit="", kind="xray", all_ports=False,
                        forwards=[preroute.Forward(proto=x["proto"], port=x["port"], to_port=x["to_port"],
                                                   to_addr=x["to_addr"], note=x["note"]) for x in chosen])
    _check(db, s, t, names)
    s.tunnels[str(new_id)] = t
    preroute.save(db, s)
    _after_change(bg, t)
    return _state(db)
