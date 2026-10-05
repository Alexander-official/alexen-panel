"""Alexen VPN agent.

Runs on every server that offers AmneziaWG and/or OpenVPN. The panel owns all
keys, certificates and the list of allowed users; it sends the wanted state to
POST /apply and reads traffic counters from GET /stats. Only the panel can
talk to the agent: mutual TLS against the panel certificate (the same one
marzban-node trusts).

Environment:
  AGENT_PORT     port to listen on (default 62060)
  PANEL_CERT     the panel's certificate (default /etc/alexen-vpn/panel.pem)
  STATE_DIR      where configs and the agent's own TLS key live (/var/lib/alexen-vpn)
"""
import hashlib
import json
import os
import socket
import ssl
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

VERSION = "1.1.0"
PORT = int(os.environ.get("AGENT_PORT", "62060"))
PANEL_CERT = os.environ.get("PANEL_CERT", "/etc/alexen-vpn/panel.pem")
STATE = os.environ.get("STATE_DIR", "/var/lib/alexen-vpn")
AWG_IF = "awg0"
OVPN_DEV = "tun-alexen"
OVPN_DIR = os.path.join(STATE, "openvpn")
MGMT = ("127.0.0.1", 7505)

lock = threading.RLock()
applied = {"awg": None, "ovpn": None}   # last config that was applied
ovpn_proc = None
# OpenVPN: cumulative bytes per common name, including sessions that ended
ovpn_totals = {}        # cn -> [rx, tx]
ovpn_sessions = {}      # client id -> (cn, rx, tx)
ovpn_online = {}        # cn -> latest "connected since"
ovpn_addrs = {}         # cn -> real IPs of its sessions right now


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def run(cmd, check=True, input=None):
    r = subprocess.run(cmd, input=input, capture_output=True, text=True)
    if check and r.returncode != 0:
        raise RuntimeError(f"{' '.join(cmd)}: {r.stderr.strip() or r.stdout.strip()}")
    return r


def digest(obj) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True).encode()).hexdigest()


# ---------------- forwarding / NAT ----------------

def ip_forward():
    try:
        with open("/proc/sys/net/ipv4/ip_forward", "w") as f:
            f.write("1")
    except OSError as e:
        log("ip_forward:", e)


def nat(subnet: str, dev: str, on: bool):
    """MASQUERADE the VPN subnet out of any other interface, and let it through
    FORWARD (Docker sets the FORWARD policy to DROP)"""
    rules = [
        ["-t", "nat", "POSTROUTING", "-s", subnet, "!", "-o", dev, "-j", "MASQUERADE"],
        ["-t", "filter", "FORWARD", "-i", dev, "-j", "ACCEPT"],
        ["-t", "filter", "FORWARD", "-o", dev, "-m", "conntrack", "--ctstate", "RELATED,ESTABLISHED", "-j", "ACCEPT"],
    ]
    for r in rules:
        table, chain, spec = r[:2], r[2], r[3:]
        exists = run(["iptables", *table, "-C", chain, *spec], check=False).returncode == 0
        if on and not exists:
            run(["iptables", *table, "-I", chain, "1", *spec])
        elif not on:
            while run(["iptables", *table, "-C", chain, *spec], check=False).returncode == 0:
                run(["iptables", *table, "-D", chain, *spec], check=False)


def subnet_of(cidr: str) -> str:
    """10.66.0.1/16 -> 10.66.0.0/16"""
    import ipaddress
    return str(ipaddress.ip_interface(cidr).network)


# ---------------- AmneziaWG ----------------

# config-file spelling of each obfuscation setting
AWG_PARAMS = {"jc": "Jc", "jmin": "Jmin", "jmax": "Jmax", "s1": "S1", "s2": "S2", "s3": "S3", "s4": "S4",
              "h1": "H1", "h2": "H2", "h3": "H3", "h4": "H4", "i1": "I1", "i2": "I2", "i3": "I3", "i4": "I4", "i5": "I5"}


def awg_conf(c: dict) -> str:
    lines = ["[Interface]", f"PrivateKey = {c['private_key']}", f"ListenPort = {int(c['port'])}"]
    for k, name in AWG_PARAMS.items():
        v = (c.get("params") or {}).get(k)
        if v not in (None, ""):
            lines.append(f"{name} = {v}")
    for p in c.get("peers", []):
        lines += ["", "[Peer]", f"PublicKey = {p['public_key']}"]
        if p.get("psk"):
            lines.append(f"PresharedKey = {p['psk']}")
        lines.append(f"AllowedIPs = {p['ip']}/32")
    return "\n".join(lines) + "\n"


def awg_exists() -> bool:
    return run(["ip", "link", "show", AWG_IF], check=False).returncode == 0


def awg_down():
    if awg_exists():
        run(["ip", "link", "del", AWG_IF], check=False)
    old = applied.get("awg")
    if old:
        nat(subnet_of(old["address"]), AWG_IF, False)
    applied["awg"] = None


def awg_apply(c: dict):
    if not c or not c.get("enabled"):
        awg_down()
        return
    old = applied.get("awg") or {}
    iface_keys = ("private_key", "port", "params", "address", "mtu")
    iface_changed = not awg_exists() or any(old.get(k) != c.get(k) for k in iface_keys)
    if iface_changed and awg_exists() and old.get("params") != c.get("params"):
        # obfuscation settings are read when the device starts
        run(["ip", "link", "del", AWG_IF], check=False)
    if not awg_exists():
        run(["amneziawg-go", AWG_IF])
        for _ in range(50):
            if os.path.exists(f"/var/run/amneziawg/{AWG_IF}.sock"):
                break
            time.sleep(0.1)
    path = os.path.join(STATE, f"{AWG_IF}.conf")
    with open(path, "w") as f:
        os.chmod(path, 0o600)
        f.write(awg_conf(c))
    run(["awg", "setconf" if iface_changed else "syncconf", AWG_IF, path])
    run(["ip", "address", "replace", c["address"], "dev", AWG_IF])
    run(["ip", "link", "set", AWG_IF, "mtu", str(int(c.get("mtu") or 1420)), "up"])
    if old.get("address") and old["address"] != c["address"]:
        nat(subnet_of(old["address"]), AWG_IF, False)
    ip_forward()
    nat(subnet_of(c["address"]), AWG_IF, True)
    applied["awg"] = c


def awg_stats():
    if not awg_exists():
        return []
    out = run(["awg", "show", AWG_IF, "dump"], check=False).stdout.strip().splitlines()
    peers = []
    for line in out[1:]:   # first line: the interface
        f = line.split("\t")
        if len(f) >= 8:
            peers.append({"public_key": f[0], "endpoint": f[2], "handshake": int(f[4] or 0),
                          "rx": int(f[5] or 0), "tx": int(f[6] or 0)})
    return peers


# ---------------- OpenVPN ----------------

def ovpn_conf(c: dict) -> str:
    import ipaddress
    net = ipaddress.ip_network(c["network"])
    proto = c.get("proto", "udp")
    lines = [
        f"port {int(c['port'])}", f"proto {proto}", f"dev {OVPN_DEV}", "dev-type tun",
        "ca ca.crt", "cert server.crt", "key server.key", "dh none", "ecdh-curve prime256v1",
        "tls-crypt tc.key", "tls-version-min 1.2", "topology subnet",
        f"server {net.network_address} {net.netmask}",
        'push "redirect-gateway def1 bypass-dhcp"',
        "keepalive 10 60", "data-ciphers AES-128-GCM:AES-256-GCM:CHACHA20-POLY1305",
        "client-config-dir ccd", "ccd-exclusive", "verify-client-cert require",
        # one certificate per user, used on several devices
        "duplicate-cn", "persist-key", "persist-tun",
        f"management {MGMT[0]} {MGMT[1]}", "verb 2", "status-version 2",
    ]
    for dns in c.get("dns") or ["1.1.1.1", "8.8.8.8"]:
        lines.append(f'push "dhcp-option DNS {dns}"')
    if proto.startswith("udp"):
        lines.append("explicit-exit-notify 1")
    return "\n".join(lines) + "\n"


def mgmt(command: str, timeout=3) -> str:
    try:
        with socket.create_connection(MGMT, timeout=timeout) as s:
            s.settimeout(timeout)
            buf = b""
            s.sendall(command.encode() + b"\n")
            while True:
                chunk = s.recv(65536)
                if not chunk:
                    break
                buf += chunk
                if b"\nEND" in buf or b"SUCCESS:" in buf or b"ERROR:" in buf:
                    break
            return buf.decode(errors="replace")
    except OSError:
        return ""


def ovpn_running() -> bool:
    return ovpn_proc is not None and ovpn_proc.poll() is None


def ovpn_down():
    global ovpn_proc
    if ovpn_running():
        ovpn_proc.terminate()
        try:
            ovpn_proc.wait(5)
        except subprocess.TimeoutExpired:
            ovpn_proc.kill()
    ovpn_proc = None
    old = applied.get("ovpn")
    if old:
        nat(old["network"], OVPN_DEV, False)
    applied["ovpn"] = None


def ovpn_apply(c: dict):
    global ovpn_proc
    if not c or not c.get("enabled"):
        ovpn_down()
        return
    old = applied.get("ovpn") or {}
    os.makedirs(os.path.join(OVPN_DIR, "ccd"), exist_ok=True)
    server_keys = ("port", "proto", "network", "dns", "ca", "cert", "key", "tls_crypt")
    restart = not ovpn_running() or any(old.get(k) != c.get(k) for k in server_keys)
    if restart:
        for name, k in (("ca.crt", "ca"), ("server.crt", "cert"), ("server.key", "key"), ("tc.key", "tls_crypt")):
            p = os.path.join(OVPN_DIR, name)
            with open(p, "w") as f:
                f.write(c[k])
            os.chmod(p, 0o600)
        with open(os.path.join(OVPN_DIR, "server.conf"), "w") as f:
            f.write(ovpn_conf(c))
    # who may connect: one (empty) ccd file per allowed common name
    allowed = set(c.get("clients", []))
    ccd = os.path.join(OVPN_DIR, "ccd")
    for name in os.listdir(ccd):
        if name not in allowed:
            os.remove(os.path.join(ccd, name))
            mgmt(f"kill {name}")
    for cn in allowed:
        p = os.path.join(ccd, cn)
        if not os.path.exists(p):
            open(p, "w").close()
    if restart:
        if ovpn_running():
            ovpn_proc.terminate()
            try:
                ovpn_proc.wait(5)
            except subprocess.TimeoutExpired:
                ovpn_proc.kill()
        if old.get("network") and old["network"] != c["network"]:
            nat(old["network"], OVPN_DEV, False)
        ip_forward()
        nat(c["network"], OVPN_DEV, True)
        ovpn_proc = subprocess.Popen(["openvpn", "--config", "server.conf"], cwd=OVPN_DIR)
        log("openvpn started, pid", ovpn_proc.pid)
    applied["ovpn"] = c


def ovpn_poll():
    """add up bytes per common name, keeping sessions that already ended"""
    if not ovpn_running():
        return
    out = mgmt("status 2")
    if not out:
        return
    seen = {}
    online = {}
    addrs = {}
    for line in out.splitlines():
        f = line.split(",")
        if f[0] == "CLIENT_LIST" and len(f) > 11:
            cn, rx, tx, cid = f[1], int(f[5] or 0), int(f[6] or 0), f[10]
            seen[cid] = (cn, rx, tx)
            online[cn] = max(online.get(cn, 0), int(f[8] or 0))
            # "1.2.3.4:5678" (udp) or "tcp4-server:1.2.3.4:5678"
            ip = f[2].rsplit(":", 1)[0].split(":")[-1]
            addrs.setdefault(cn, set()).add(ip)
    with lock:
        for cid, (cn, rx, tx) in seen.items():
            _, prx, ptx = ovpn_sessions.get(cid, (cn, 0, 0))
            t = ovpn_totals.setdefault(cn, [0, 0])
            t[0] += max(0, rx - prx)
            t[1] += max(0, tx - ptx)
        ovpn_sessions.clear()
        ovpn_sessions.update(seen)
        ovpn_online.clear()
        ovpn_online.update(online)
        ovpn_addrs.clear()
        ovpn_addrs.update(addrs)


def watchdog():
    while True:
        time.sleep(5)
        try:
            with lock:
                ovpn_poll()
                if applied.get("ovpn") and not ovpn_running():
                    log("openvpn exited, restarting")
                    c = applied["ovpn"]
                    applied["ovpn"] = None
                    ovpn_apply(c)
                if applied.get("awg") and not awg_exists():
                    log("awg interface gone, recreating")
                    c = applied["awg"]
                    applied["awg"] = None
                    awg_apply(c)
        except Exception as e:
            log("watchdog:", e)


# ---------------- state across restarts ----------------

def save_state():
    p = os.path.join(STATE, "state.json")
    with open(p, "w") as f:
        json.dump(applied, f)
    os.chmod(p, 0o600)


def load_state():
    try:
        with open(os.path.join(STATE, "state.json")) as f:
            s = json.load(f)
        if s.get("awg"):
            awg_apply(s["awg"])
        if s.get("ovpn"):
            ovpn_apply(s["ovpn"])
        log("restored", [k for k, v in applied.items() if v])
    except FileNotFoundError:
        pass
    except Exception as e:
        log("restore failed:", e)


# ---------------- HTTP API ----------------

def status():
    return {
        "version": VERSION,
        "awg": {"running": awg_exists() and bool(applied.get("awg")),
                "peers": len((applied.get("awg") or {}).get("peers", [])),
                "hash": digest(applied["awg"]) if applied.get("awg") else ""},
        "ovpn": {"running": ovpn_running(),
                 "clients": len((applied.get("ovpn") or {}).get("clients", [])),
                 "hash": digest(applied["ovpn"]) if applied.get("ovpn") else ""},
    }


class Handler(BaseHTTPRequestHandler):
    def _send(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass

    def do_GET(self):
        if self.path == "/status":
            with lock:
                return self._send(200, status())
        if self.path == "/stats":
            with lock:
                ovpn_poll()
                return self._send(200, {
                    "time": time.time(),
                    "awg": awg_stats(),
                    "ovpn": [{"cn": cn, "rx": t[0], "tx": t[1], "online": cn in ovpn_online,
                              "addresses": sorted(ovpn_addrs.get(cn, ()))}
                             for cn, t in ovpn_totals.items()],
                })
        self._send(404, {"detail": "not found"})

    def do_POST(self):
        if self.path != "/apply":
            return self._send(404, {"detail": "not found"})
        try:
            body = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
            errors = {}
            with lock:
                for kind, fn in (("awg", awg_apply), ("ovpn", ovpn_apply)):
                    if kind in body:
                        try:
                            fn(body[kind])
                        except Exception as e:
                            errors[kind] = str(e)
                            log(kind, "apply failed:", e)
                save_state()
                return self._send(200 if not errors else 500, {**status(), "errors": errors})
        except Exception as e:
            return self._send(400, {"detail": str(e)})


def tls_context() -> ssl.SSLContext:
    os.makedirs(STATE, exist_ok=True)
    cert, key = os.path.join(STATE, "agent.crt"), os.path.join(STATE, "agent.key")
    if not os.path.exists(cert):
        run(["openssl", "req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1", "-nodes",
             "-days", "3650", "-subj", "/CN=alexen-vpn-agent", "-keyout", key, "-out", cert])
        os.chmod(key, 0o600)
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    ctx.load_cert_chain(cert, key)
    ctx.verify_mode = ssl.CERT_REQUIRED          # the panel's certificate only
    ctx.load_verify_locations(PANEL_CERT)
    return ctx


def main():
    if not os.path.exists(PANEL_CERT):
        raise SystemExit(f"panel certificate missing: {PANEL_CERT}")
    ctx = tls_context()
    load_state()
    threading.Thread(target=watchdog, daemon=True).start()
    srv = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    srv.socket = ctx.wrap_socket(srv.socket, server_side=True)
    log(f"alexen vpn agent {VERSION} on :{PORT}")
    srv.serve_forever()


if __name__ == "__main__":
    main()
