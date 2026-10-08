"""Outbound tools for the Outbounds page.

test(): each outbound is run in a throw-away Xray behind a local SOCKS port and
a few sites are fetched through it: the delay (like 3x-ui's test), where the
traffic leaves to the internet (IP / country) and which sites open. It runs
on the panel, or on a node over its saved SSH login, since a relay often
behaves very differently from there (e.g. sites blocked in the node's country).

Traffic: Xray counts bytes per outbound; record_usages hands each reading to
add() and the totals are kept in a small JSON file next to the database."""
import json
import os
import shlex
import socket
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional

import requests

from app import logger

# what a user would try first; a reply of any kind (even 403) means the site is reachable
SITES = [
    ("Google", "https://www.gstatic.com/generate_204"),
    ("YouTube", "https://www.youtube.com/"),
    ("Instagram", "https://www.instagram.com/"),
    ("Telegram", "https://web.telegram.org/"),
    ("X", "https://x.com/"),
]
GEO_URL = "http://ip-api.com/json/?fields=status,country,countryCode,city,query"


# ---------------------------------------------------------------- test on the panel

def _fetch(port: int, url: str, timeout: float) -> Optional[int]:
    """ms for one request through the SOCKS port, None when it fails"""
    proxies = {"http": f"socks5h://127.0.0.1:{port}", "https": f"socks5h://127.0.0.1:{port}"}
    start = time.monotonic()
    try:
        requests.get(url, proxies=proxies, timeout=timeout, allow_redirects=False, stream=True).close()
        return int((time.monotonic() - start) * 1000)
    except Exception:
        return None


def _geo(port: int, timeout: float) -> Optional[dict]:
    proxies = {"http": f"socks5h://127.0.0.1:{port}", "https": f"socks5h://127.0.0.1:{port}"}
    try:
        d = requests.get(GEO_URL, proxies=proxies, timeout=timeout).json()
        if d.get("status") == "success":
            return {"ip": d.get("query", ""), "country": d.get("country", ""),
                    "cc": d.get("countryCode", ""), "city": d.get("city", "")}
    except Exception:
        pass
    return None


def _one_local(port: int, urls: List[str], timeout: float) -> dict:
    # the first request also pays the handshake: the delay is the better of two
    first = _fetch(port, urls[0], timeout)
    second = _fetch(port, urls[0], timeout) if first is not None else _fetch(port, urls[0], timeout)
    shown = [x for x in (first, second) if x is not None]
    delay = min(shown) if shown else None
    sites = [delay] + [_fetch(port, u, timeout) for u in urls[1:]]
    return {"delay": delay, "connect": first, "sites": sites,
            "exit": _geo(port, timeout) if delay is not None or any(x is not None for x in sites) else None}


def _test_local(outbounds: List[dict], urls: List[str], timeout: float) -> List[dict]:
    from app.subscription import external_sources as es
    out: List[dict] = [{"error": "", "delay": None, "connect": None, "sites": [], "exit": None} for _ in outbounds]
    good = []
    for i, ob in enumerate(outbounds):
        err = _xray_error(es._xray_config([ob], es._free_ports(1)))
        if err:
            out[i]["error"] = err
        else:
            good.append(i)
    if not good:
        return out
    ports = es._free_ports(len(good))
    import subprocess
    import tempfile
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(es._xray_config([outbounds[i] for i in good], ports), f)
        path = f.name
    proc = subprocess.Popen([es.XRAY_EXECUTABLE_PATH, "run", "-c", path], stdout=subprocess.DEVNULL,
                            stderr=subprocess.DEVNULL, env={**os.environ, "XRAY_LOCATION_ASSET": es.XRAY_ASSETS_PATH})
    try:
        deadline = time.monotonic() + 6
        while time.monotonic() < deadline:
            try:
                socket.create_connection(("127.0.0.1", ports[-1]), timeout=0.3).close()
                break
            except OSError:
                time.sleep(0.2)
        with ThreadPoolExecutor(max_workers=12) as ex:
            res = list(ex.map(lambda p: _one_local(p, urls, timeout), ports))
        for i, r in zip(good, res):
            out[i].update(r)
    finally:
        proc.kill()
        proc.wait()
        os.unlink(path)
    return out


def _xray_error(cfg: dict) -> str:
    """"" when Xray accepts the config, else its complaint (the useful last line)"""
    import subprocess
    import tempfile
    from app.subscription import external_sources as es
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(cfg, f)
        path = f.name
    try:
        r = subprocess.run([es.XRAY_EXECUTABLE_PATH, "run", "-test", "-c", path], capture_output=True, text=True,
                           timeout=20, env={**os.environ, "XRAY_LOCATION_ASSET": es.XRAY_ASSETS_PATH})
        if r.returncode == 0:
            return ""
        lines = [x for x in (r.stdout + r.stderr).splitlines() if x.strip()]
        msg = lines[-1] if lines else "invalid outbound"
        return msg.split("> ")[-1][:300]
    except Exception as e:
        return str(e)[:300]
    finally:
        os.unlink(path)


# ---------------------------------------------------------------- test on a node

_REMOTE = r"""
X=""
for c in /var/lib/alexen-node/xray-core/xray /var/lib/marzban-node/xray-core/xray /usr/local/bin/xray; do
  if [ -x "$c" ]; then X="$c"; break; fi
done
if [ -z "$X" ]; then
  for n in alexen-node marzban-node-marzban-node-1 marzban-node; do
    docker cp "$n:/usr/local/bin/xray" "$D/xray" >/dev/null 2>&1 && X="$D/xray" && break
  done
fi
[ -z "$X" ] && { echo "E no-xray"; exit 0; }
command -v curl >/dev/null 2>&1 || { echo "E no-curl"; exit 0; }
T=$("$X" run -test -c "$D/c.json" 2>&1) || { echo "E bad $(echo "$T" | tail -1)"; exit 0; }
"$X" run -c "$D/c.json" >/dev/null 2>&1 & P=$!
for i in $(seq 1 30); do sleep 0.2; (exec 3<>/dev/tcp/127.0.0.1/$LAST) 2>/dev/null && break; done
one() {
  i=$1; p=$2; px="socks5h://127.0.0.1:$p"
  j=0
  for u in $URLS; do
    n=1; [ $j -eq 0 ] && n=2
    for k in $(seq 1 $n); do
      r=$(curl -s -o /dev/null -m $TO -x "$px" -w "%{http_code} %{time_total}" "$u" 2>/dev/null)
      echo "R $i $j $k $r"
    done
    j=$((j+1))
  done
  g=$(curl -s -m $TO -x "$px" "$GEO" 2>/dev/null | tr -d '\n')
  echo "G $i $g"
}
i=0; W=""
for p in $PORTS; do one $i $p & W="$W $!"; i=$((i+1)); done
wait $W 2>/dev/null
kill $P 2>/dev/null
"""


def _parse_remote(text: str, n: int, n_urls: int) -> List[dict]:
    out = [{"error": "", "delay": None, "connect": None, "sites": [None] * n_urls, "exit": None} for _ in range(n)]
    tries: Dict[int, Dict[int, list]] = {}
    for line in text.splitlines():
        parts = line.strip().split(" ", 3)
        if not parts or not parts[0]:
            continue
        if parts[0] == "E":
            reason = line.strip()[2:]
            msg = {"no-xray": "No Xray found on the node", "no-curl": "curl is not installed on the node"}.get(
                reason, reason[4:].split("> ")[-1][:300] if reason.startswith("bad") else reason)
            for o in out:
                o["error"] = msg
            return out
        if parts[0] == "R" and len(parts) >= 4:
            try:
                i, j = int(parts[1]), int(parts[2])
                rest = parts[3].split()
                k, code, secs = int(rest[0]), (rest[1] if len(rest) > 1 else "000"), \
                    (float(rest[2]) if len(rest) > 2 else 0.0)
            except (ValueError, IndexError):
                continue
            ms = int(secs * 1000) if code not in ("000", "") else None
            tries.setdefault(i, {}).setdefault(j, []).append((k, ms))
        elif parts[0] == "G" and len(parts) >= 3:
            try:
                d = json.loads(line.split(" ", 2)[2])
                if d.get("status") == "success":
                    out[int(parts[1])]["exit"] = {"ip": d.get("query", ""), "country": d.get("country", ""),
                                                  "cc": d.get("countryCode", ""), "city": d.get("city", "")}
            except Exception:
                pass
    for i, per_url in tries.items():
        if i >= n:
            continue
        for j, values in per_url.items():
            if j >= n_urls:
                continue
            ok = [ms for _, ms in values if ms is not None]
            out[i]["sites"][j] = min(ok) if ok else None
            if j == 0:
                first = [ms for k, ms in values if k == 1]
                out[i]["connect"] = first[0] if first else None
                out[i]["delay"] = out[i]["sites"][0]
    return out


def ssh_session(node_id: int):
    """an SSH connection to the node with its saved login, or a ValueError saying why not"""
    from app import node_extras, node_install
    from app.db import GetDB
    from app.db.models import Node
    with GetDB() as db:
        extra = node_extras.get(db, node_id)
        node = db.query(Node).filter(Node.id == node_id).first()
        address = node.address if node else ""
    lg = extra.ssh
    if not lg or not lg.secret:
        raise ValueError("Save the VPS login (SSH) of this node first: the test runs on the node over SSH")
    secret = node_extras.decrypt(lg.secret)
    last = None
    for _ in range(5):   # filtered links drop some attempts
        try:
            return node_install.connect(lg.host or address, lg.port, lg.username,
                                        password=secret if lg.auth == "password" else "",
                                        key=secret if lg.auth == "key" else "",
                                        passphrase=node_extras.decrypt(lg.passphrase), timeout=8), \
                node_install._Session
        except node_install.InstallError as e:
            last = e
            if "login failed" in str(e) or "private key" in str(e):
                break
            time.sleep(0.5)
    raise ValueError(str(last))


def _test_remote(node_id: int, outbounds: List[dict], urls: List[str], timeout: float) -> List[dict]:
    from app.subscription import external_sources as es
    from app import node_extras
    client, Session = ssh_session(node_id)
    try:
        from app.db import GetDB
        with GetDB() as db:
            lg = node_extras.get(db, node_id).ssh
        password = node_extras.decrypt(lg.secret) if lg.auth == "password" else ""
        s = Session(client, lg.username, password, lambda _: None)
        # ports on the node: random high ones, very unlikely to be taken
        import random
        ports = random.sample(range(42000, 48000), len(outbounds))
        d = f"/tmp/alexen-test-{uuid.uuid4().hex[:8]}"
        s.run(f"mkdir -p {d}", sudo=False, quiet=True)
        sftp = client.open_sftp()
        try:
            with sftp.file(f"{d}/c.json", "w") as f:
                f.write(json.dumps(es._xray_config(outbounds, ports)))
        finally:
            sftp.close()
        env = " ".join(f"{k}={shlex.quote(v)}" for k, v in {
            "D": d, "URLS": " ".join(urls), "PORTS": " ".join(map(str, ports)), "LAST": str(ports[-1]),
            "TO": str(int(timeout)), "GEO": GEO_URL}.items())
        script = f"{env}; export D URLS PORTS LAST TO GEO\n{_REMOTE}\nrm -rf {d}\n"
        text = s.run("bash -c " + shlex.quote(script), check=False, quiet=True)
        return _parse_remote(text, len(outbounds), len(urls))
    finally:
        try:
            client.close()
        except Exception:
            pass


def test(outbounds: List[dict], server: str = "master", urls: Optional[List[str]] = None,
         timeout: float = 8.0) -> List[dict]:
    """for each outbound: {error, delay, connect, sites: [ms|None per url], exit}"""
    urls = urls or [u for _, u in SITES]
    clean = []
    for ob in outbounds:
        ob = json.loads(json.dumps(ob))
        ob.pop("tag", None)
        # Xray 26 dropped allowInsecure; an old "false" only makes noise
        tls = (ob.get("streamSettings") or {}).get("tlsSettings") or {}
        if tls.get("allowInsecure") is False:
            tls.pop("allowInsecure")
        clean.append(ob)
    if server in ("", "master"):
        return _test_local(clean, urls, timeout)
    return _test_remote(int(server), clean, urls, timeout)


# ---------------------------------------------------------------- traffic per outbound

_TRAFFIC_FILE = "/var/lib/marzban/outbound_traffic.json"
_traffic: Optional[dict] = None
_tlock = threading.Lock()
_saved_at = 0.0


def _load() -> dict:
    global _traffic
    if _traffic is None:
        try:
            with open(_TRAFFIC_FILE) as f:
                _traffic = json.load(f)
        except Exception:
            _traffic = {"since": int(time.time()), "servers": {}}
    return _traffic


def _save(force: bool = False):
    global _saved_at
    if not force and time.time() - _saved_at < 60:
        return
    _saved_at = time.time()
    try:
        tmp = _TRAFFIC_FILE + ".tmp"
        with open(tmp, "w") as f:
            json.dump(_traffic, f)
        os.replace(tmp, _TRAFFIC_FILE)
    except Exception as e:
        logger.debug(f"outbound traffic: {e}")


def add(server: str, readings) -> None:
    """readings: (tag, "uplink"/"downlink", bytes) of one server, counted since the last reading"""
    with _tlock:
        t = _load()
        per = t["servers"].setdefault(server, {})
        for tag, link, value in readings:
            if not value:
                continue
            row = per.setdefault(tag, {"up": 0, "down": 0})
            row["up" if link == "uplink" else "down"] += int(value)
        _save()


def traffic() -> dict:
    with _tlock:
        return json.loads(json.dumps(_load()))


def reset(tag: Optional[str] = None) -> None:
    global _traffic
    with _tlock:
        t = _load()
        if tag is None:
            _traffic = {"since": int(time.time()), "servers": {}}
        else:
            for per in t["servers"].values():
                per.pop(tag, None)
        _save(force=True)
