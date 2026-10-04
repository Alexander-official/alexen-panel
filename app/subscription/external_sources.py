"""Subscription sources for External Configs.

A source is a subscription URL. Periodically (and on demand) we:
  1. fetch it and pull the share links out (base64 or plain list),
  2. keep the chosen range (e.g. links 1-20),
  3. optionally test every link through our own Xray and keep the working ones,
  4. optionally rename them "<flag> Country" or "<flag> Country - City",
and cache the result. Subscriptions read the cache, so a user's request never
waits for any of this.
"""
import base64
import ipaddress
import json
import logging
import os
import socket
import subprocess
import tempfile
import threading
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional

import requests

from config import XRAY_ASSETS_PATH, XRAY_EXECUTABLE_PATH

logger = logging.getLogger("uvicorn.error")

CACHE_KEY = "external_cache"
DEFAULT_TEST_URL = "https://www.gstatic.com/generate_204"
SCHEME_ALIASES = {"hy2": "hysteria2", "shadowsocks": "ss"}

_cache: Optional[Dict[str, dict]] = None
_cache_lock = threading.Lock()
_refresh_lock = threading.Lock()
_running: set = set()


# ---------------------------------------------------------------- cache

def get_cache() -> Dict[str, dict]:
    global _cache
    if _cache is None:
        from app.db import GetDB, crud
        with GetDB() as db:
            data = crud.get_setting(db, CACHE_KEY, {}) or {}
        with _cache_lock:
            _cache = data
    return _cache


def _store(source_id: str, entry: dict):
    cache = dict(get_cache())
    cache[source_id] = entry
    _persist(cache)


def _persist(cache: dict):
    global _cache
    from app.db import GetDB, crud
    with GetDB() as db:
        crud.set_setting(db, CACHE_KEY, cache)
    with _cache_lock:
        _cache = cache


def forget(keep_ids: List[str]):
    """drop cached results of sources that no longer exist"""
    cache = get_cache()
    if set(cache) - set(keep_ids):
        _persist({k: v for k, v in cache.items() if k in keep_ids})


def cached_links(source_id: str) -> List[dict]:
    return (get_cache().get(source_id) or {}).get("items", [])


def is_running(source_id: str) -> bool:
    return source_id in _running


# ---------------------------------------------------------------- fetching

def scheme_of(link: str) -> str:
    s = link.split("://", 1)[0].lower()
    return SCHEME_ALIASES.get(s, s)


def _b64decode(text: str) -> str:
    text = text.strip().replace("-", "+").replace("_", "/")
    text += "=" * (-len(text) % 4)
    return base64.b64decode(text).decode("utf-8", "ignore")


def fetch_links(url: str, user_agent: str = "") -> List[str]:
    r = requests.get(url, timeout=20, headers={"User-Agent": user_agent or "v2rayNG/1.8.5"})
    r.raise_for_status()
    body = r.text.strip()
    if "://" not in body.split("\n", 1)[0]:
        try:
            body = _b64decode(body)
        except Exception:
            pass
    return [ln.strip() for ln in body.splitlines() if "://" in ln and not ln.strip().startswith("#")]


# ---------------------------------------------------------------- link parsing

def _remark_of(link: str) -> str:
    if scheme_of(link) == "vmess":
        try:
            return json.loads(_b64decode(link[8:])).get("ps", "")
        except Exception:
            return ""
    return urllib.parse.unquote(link.split("#", 1)[1]) if "#" in link else ""


def set_remark(link: str, remark: str) -> str:
    if scheme_of(link) == "vmess":
        try:
            data = json.loads(_b64decode(link[8:]))
            data["ps"] = remark
            return "vmess://" + base64.b64encode(json.dumps(data, ensure_ascii=False).encode()).decode()
        except Exception:
            return link
    return link.split("#", 1)[0] + "#" + urllib.parse.quote(remark)


def parse(link: str) -> Optional[dict]:
    """share link -> {protocol, address, port, outbound}; None when we can't build an Xray outbound"""
    from app.subscription.v2ray import V2rayJsonConfig
    scheme = scheme_of(link)
    try:
        if scheme == "vmess":
            d = json.loads(_b64decode(link[8:]))
            address, port = d.get("add"), int(d.get("port"))
            net = d.get("net") or "tcp"
            tls = d.get("tls") or ""
            q = {"sni": d.get("sni", ""), "host": d.get("host", ""), "path": d.get("path", ""),
                 "fp": d.get("fp", ""), "alpn": d.get("alpn", ""), "headerType": d.get("type", "")}
            cred = d.get("id")
        else:
            u = urllib.parse.urlsplit(link)
            address, port = u.hostname, u.port
            q = {k: v[0] for k, v in urllib.parse.parse_qs(u.query).items()}
            net = q.get("type") or ("hysteria" if scheme == "hysteria2" else "tcp")
            tls = q.get("security") or ("tls" if scheme in ("trojan", "hysteria2") else "")
            cred = urllib.parse.unquote(u.username or "")
            if scheme == "ss":
                # ss://base64(method:password)@host:port  or  ss://base64(method:password@host:port)
                if u.password is not None:
                    method, password = urllib.parse.unquote(u.username), urllib.parse.unquote(u.password)
                elif address:
                    method, password = _b64decode(urllib.parse.unquote(u.username or "")).split(":", 1)
                else:
                    raw = _b64decode(link[5:].split("#", 1)[0].split("?", 1)[0])
                    userinfo, hostport = raw.rsplit("@", 1)
                    method, password = userinfo.split(":", 1)
                    address, port = hostport.rsplit(":", 1)
                    address, port = address.strip("[]"), int(port)
                if q.get("plugin"):
                    return None
        if not address or not port:
            return None

        c = V2rayJsonConfig()
        if scheme == "vless":
            settings = c.vless_config(address=address, port=port, id=cred, flow=q.get("flow", ""))
            proto = "vless"
        elif scheme == "vmess":
            settings = c.vmess_config(address=address, port=port, id=cred)
            proto = "vmess"
        elif scheme == "trojan":
            settings = c.trojan_config(address=address, port=port, password=cred)
            proto = "trojan"
        elif scheme == "ss":
            settings = c.shadowsocks_config(address=address, port=port, password=password, method=method)
            proto = "shadowsocks"
        elif scheme == "hysteria2":
            settings = c.hysteria_config(address=address, port=port)
            proto = "hysteria"
            net = "hysteria"
            q.setdefault("alpn", "h3")
            if q.get("insecure") in ("1", "true"):
                q["allowInsecure"] = "1"
        else:
            return None

        path = q.get("path", "") if net != "grpc" else (q.get("serviceName") or q.get("path", ""))
        alpn = q.get("alpn")
        stream = c.make_stream_setting(
            net=net, tls=tls, sni=q.get("sni") or q.get("peer", ""), host=q.get("host", ""),
            path=urllib.parse.unquote(path), alpn=alpn.split(",") if alpn else None,
            fp=q.get("fp", "") if scheme != "hysteria2" else "",
            pbk=q.get("pbk", ""), sid=q.get("sid", ""), spx=urllib.parse.unquote(q.get("spx", "")),
            headers=q.get("headerType", "none"),
            ais=q.get("allowInsecure") in ("1", "true"),
            multiMode=q.get("mode") == "multi" and net == "grpc",
            mode=q.get("mode", "auto") if net in ("xhttp", "splithttp") else "auto",
        )
        outbound = {"protocol": proto, "settings": settings, "streamSettings": stream}
        if scheme == "hysteria2":
            outbound["streamSettings"]["hysteriaSettings"] = {"version": 2, "auth": cred}
            if q.get("obfs") == "salamander":
                outbound["streamSettings"]["finalmask"] = {
                    "udp": [{"type": "salamander", "settings": {"password": q.get("obfs-password", "")}}]
                }
        return {"protocol": scheme, "address": address, "port": port, "outbound": outbound}
    except Exception:
        return None


# ---------------------------------------------------------------- testing with xray

def _free_ports(n: int) -> List[int]:
    socks_, ports = [], []
    for _ in range(n):
        s = socket.socket()
        s.bind(("127.0.0.1", 0))
        socks_.append(s)
        ports.append(s.getsockname()[1])
    for s in socks_:
        s.close()
    return ports


def _xray_config(outbounds: List[dict], ports: List[int]) -> dict:
    inbounds, outs, rules = [], [], []
    for i, (ob, port) in enumerate(zip(outbounds, ports)):
        inbounds.append({"tag": f"in{i}", "listen": "127.0.0.1", "port": port, "protocol": "socks",
                         "settings": {"udp": False}})
        outs.append({**ob, "tag": f"out{i}"})
        rules.append({"type": "field", "inboundTag": [f"in{i}"], "outboundTag": f"out{i}"})
    outs.append({"tag": "block", "protocol": "blackhole"})
    return {"log": {"loglevel": "none"}, "inbounds": inbounds, "outbounds": outs,
            "routing": {"rules": rules}}


def _valid(outbound: dict) -> bool:
    """ask xray whether it accepts this outbound at all"""
    return _xray_test_config(_xray_config([outbound], _free_ports(1)))


def _xray_test_config(cfg: dict) -> bool:
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
        json.dump(cfg, f)
        path = f.name
    try:
        r = subprocess.run([XRAY_EXECUTABLE_PATH, "run", "-test", "-c", path], capture_output=True,
                           timeout=20, env={**os.environ, "XRAY_LOCATION_ASSET": XRAY_ASSETS_PATH})
        return r.returncode == 0
    except Exception:
        return False
    finally:
        os.unlink(path)


def _probe(port: int, url: str, timeout: float) -> Optional[int]:
    proxies = {"http": f"socks5h://127.0.0.1:{port}", "https": f"socks5h://127.0.0.1:{port}"}
    for _ in range(2):  # one retry: the first request also pays the handshake
        start = time.monotonic()
        try:
            r = requests.get(url, proxies=proxies, timeout=timeout, allow_redirects=False)
            if r.status_code < 400:
                return int((time.monotonic() - start) * 1000)
        except Exception:
            pass
    return None


def test_outbounds(outbounds: List[dict], url: str = DEFAULT_TEST_URL, timeout: float = 5.0,
                   batch: int = 48) -> List[Optional[int]]:
    """latency in ms for each outbound (None = not working), tested through our own xray"""
    results: List[Optional[int]] = [None] * len(outbounds)
    for start in range(0, len(outbounds), batch):
        idx = list(range(start, min(start + batch, len(outbounds))))
        # outbounds xray rejects would make the whole batch fail to start
        if not _xray_test_config(_xray_config([outbounds[i] for i in idx], _free_ports(len(idx)))):
            idx = [i for i in idx if _valid(outbounds[i])]
        if not idx:
            continue
        ports = _free_ports(len(idx))
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as f:
            json.dump(_xray_config([outbounds[i] for i in idx], ports), f)
            path = f.name
        proc = subprocess.Popen([XRAY_EXECUTABLE_PATH, "run", "-c", path],
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                env={**os.environ, "XRAY_LOCATION_ASSET": XRAY_ASSETS_PATH})
        try:
            deadline = time.monotonic() + 5
            while time.monotonic() < deadline:  # wait until the last socks port listens
                try:
                    socket.create_connection(("127.0.0.1", ports[-1]), timeout=0.3).close()
                    break
                except OSError:
                    time.sleep(0.2)
            with ThreadPoolExecutor(max_workers=16) as ex:
                lat = list(ex.map(lambda p: _probe(p, url, timeout), ports))
            for i, value in zip(idx, lat):
                results[i] = value
        finally:
            proc.kill()
            proc.wait()
            os.unlink(path)
    return results


# ---------------------------------------------------------------- naming

def _flag(cc: str) -> str:
    cc = (cc or "").upper()
    if len(cc) != 2 or not cc.isalpha():
        return "🏳️"
    return "".join(chr(0x1F1E6 + ord(ch) - ord("A")) for ch in cc)


def _resolve(address: str) -> Optional[str]:
    try:
        ipaddress.ip_address(address)
        return address
    except ValueError:
        pass
    try:
        return socket.gethostbyname(address)
    except OSError:
        return None


_geo_cache: Dict[str, dict] = {}


def locate(addresses: List[str]) -> Dict[str, dict]:
    """address -> {country, cc, city}, via ip-api's batch endpoint (100 per call)"""
    ips = {a: _resolve(a) for a in set(addresses)}
    todo = [ip for ip in set(ips.values()) if ip and ip not in _geo_cache]
    for i in range(0, len(todo), 100):
        try:
            r = requests.post("http://ip-api.com/batch?fields=status,country,countryCode,city,query",
                              json=todo[i:i + 100], timeout=10)
            for row in r.json():
                if row.get("status") == "success":
                    _geo_cache[row["query"]] = {"country": row.get("country", ""),
                                                "cc": row.get("countryCode", ""), "city": row.get("city", "")}
        except Exception as exc:
            logger.warning(f"external: geo lookup failed: {exc}")
    return {a: _geo_cache.get(ip or "", {}) for a, ip in ips.items()}


def rename_all(items: List[dict], mode: str):
    """name items "<flag> Country" / "<flag> Country - City"; repeats get " 2", " 3"..."""
    geo = locate([it["address"] for it in items])
    seen: Dict[str, int] = {}
    for it in items:
        g = geo.get(it["address"]) or {}
        if g.get("country"):
            name = f"{_flag(g['cc'])} {g['country']}"
            if mode == "country_city" and g.get("city"):
                name += f" - {g['city']}"
        else:
            name = "🏳️ Unknown"
        seen[name] = seen.get(name, 0) + 1
        it["name"] = name if seen[name] == 1 else f"{name} {seen[name]}"
        it["link"] = set_remark(it["link"], it["name"])


# ---------------------------------------------------------------- refresh

def refresh(source, test_url: str = DEFAULT_TEST_URL) -> dict:
    """fetch -> range -> test -> rename one subscription source, cache and return the result"""
    _running.add(source.id)
    entry = {"updated_at": int(time.time()), "items": [], "error": "",
             "stats": {"fetched": 0, "in_range": 0, "tested": 0, "working": 0}}
    try:
        links = fetch_links(source.url, source.user_agent)
        entry["stats"]["fetched"] = len(links)
        start = max(1, source.range_start or 1) - 1
        end = source.range_end or len(links)
        links = links[start:end]
        entry["stats"]["in_range"] = len(links)

        items = []
        for link in links:
            p = parse(link)
            items.append({"link": link, "name": _remark_of(link), "protocol": scheme_of(link),
                          "address": (p or {}).get("address") or urllib.parse.urlsplit(link).hostname or "",
                          "latency": None, "_ob": (p or {}).get("outbound")})

        if source.test:
            testable = [it for it in items if it["_ob"]]
            lat = test_outbounds([it["_ob"] for it in testable], url=test_url,
                                 timeout=max(1, source.test_timeout or 5))
            for it, ms in zip(testable, lat):
                it["latency"] = ms
            entry["stats"]["tested"] = len(testable)
            items = [it for it in testable if it["latency"] is not None]
            entry["stats"]["working"] = len(items)
        else:
            entry["stats"]["working"] = len(items)

        if source.rename in ("country", "country_city") and items:
            rename_all(items, source.rename)

        entry["items"] = [{k: v for k, v in it.items() if k != "_ob"} for it in items]
    except Exception as exc:
        entry["error"] = str(exc)[:300]
        # keep serving the last good result when a refresh fails
        old = get_cache().get(source.id) or {}
        entry["items"] = old.get("items", [])
        logger.warning(f"external source {source.name or source.url}: {exc}")
    finally:
        _running.discard(source.id)
    _store(source.id, entry)
    return entry


def refresh_due(force_ids: Optional[List[str]] = None):
    """scheduler job: refresh every enabled subscription source whose result is older than its interval"""
    # the periodic job skips a round while another refresh runs; a manual
    # refresh waits for it instead
    if not _refresh_lock.acquire(blocking=force_ids is not None):
        return
    try:
        from app.subscription import external
        settings = external.load()
        cache = get_cache()
        now = time.time()
        for src in settings.configs:
            if src.kind != "subscription" or not src.url:
                continue
            forced = force_ids is not None and src.id in force_ids
            if not forced and (not src.enabled or force_ids is not None):
                continue
            age = now - (cache.get(src.id) or {}).get("updated_at", 0)
            if forced or age >= max(5, src.refresh_minutes or 60) * 60:
                refresh(src, settings.test_url or DEFAULT_TEST_URL)
    finally:
        _refresh_lock.release()
