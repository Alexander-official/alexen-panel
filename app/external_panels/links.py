"""Build client share links (vless/vmess/trojan/ss) from a 3x-ui inbound object.

3x-ui's /panel/api/inbounds/list returns each inbound with `settings` and
`streamSettings` (dict or JSON string). We rebuild the per-client share link,
with an optional host override and port remap (e.g. the real 8443 handed out as 443).
"""
import base64
import json
import re
import urllib.parse
from typing import Any, Dict, List, Optional, Tuple


def _is_ip(host: str) -> bool:
    return bool(host) and bool(re.match(r"^\d{1,3}(\.\d{1,3}){3}$", host)) or ":" in (host or "")


def _obj(v: Any) -> dict:
    if isinstance(v, dict):
        return v
    if isinstance(v, str) and v.strip():
        try:
            return json.loads(v)
        except Exception:
            return {}
    return {}


def _stream_query(ss: dict) -> Dict[str, str]:
    """transport + security query params shared by vless/trojan links"""
    q: Dict[str, str] = {}
    net = ss.get("network", "tcp")
    q["type"] = net
    if net == "tcp":
        tcp = ss.get("tcpSettings", {})
        header = (tcp.get("header") or {}).get("type")
        if header and header != "none":
            q["headerType"] = header
            req = (tcp.get("header") or {}).get("request", {})
            host = ",".join(req.get("headers", {}).get("Host", []) or [])
            if host:
                q["host"] = host
            paths = req.get("path") or []
            if paths:
                q["path"] = paths[0]
    elif net == "ws":
        ws = ss.get("wsSettings", {})
        if ws.get("path"):
            q["path"] = ws["path"]
        host = (ws.get("headers") or {}).get("Host") or ws.get("host")
        if host:
            q["host"] = host
    elif net == "grpc":
        g = ss.get("grpcSettings", {})
        if g.get("serviceName"):
            q["serviceName"] = g["serviceName"]
        if g.get("multiMode"):
            q["mode"] = "multi"
    elif net in ("http", "h2"):
        h = ss.get("httpSettings", {})
        if h.get("path"):
            q["path"] = h["path"]
        if h.get("host"):
            q["host"] = ",".join(h["host"]) if isinstance(h["host"], list) else h["host"]
    elif net in ("xhttp", "splithttp"):
        x = ss.get("xhttpSettings", ss.get("splithttpSettings", {}))
        if x.get("path"):
            q["path"] = x["path"]
        if x.get("host"):
            q["host"] = x["host"]
        if x.get("mode"):
            q["mode"] = x["mode"]

    sec = ss.get("security", "none")
    q["security"] = sec
    if sec == "tls":
        tls = ss.get("tlsSettings", {})
        if tls.get("serverName"):
            q["sni"] = tls["serverName"]
        fp = (tls.get("settings") or {}).get("fingerprint")
        if fp:
            q["fp"] = fp
        alpn = tls.get("alpn")
        if alpn:
            q["alpn"] = ",".join(alpn) if isinstance(alpn, list) else alpn
    elif sec == "reality":
        r = ss.get("realitySettings", {})
        rs = r.get("settings") or {}
        if r.get("serverNames"):
            q["sni"] = r["serverNames"][0] if isinstance(r["serverNames"], list) else r["serverNames"]
        if rs.get("fingerprint"):
            q["fp"] = rs["fingerprint"]
        if rs.get("publicKey"):
            q["pbk"] = rs["publicKey"]
        sids = r.get("shortIds") or []
        if sids:
            q["sid"] = sids[0]
        if rs.get("spiderX"):
            q["spx"] = rs["spiderX"]
        q["flow"] = ""  # set per-client below if present
    return {k: v for k, v in q.items() if v not in (None, "")}


_SENTINEL = "EXTUUIDSENTINEL0000"


def inbound_template_links(inbound: dict, host: str, port: Optional[int] = None) -> List[str]:
    """Links for an inbound with the client secret as the {EXT_UUID} placeholder, so each
    Alexen user's sub fills in their own uuid (which matches the client we create on the panel).
    vless/hysteria2/trojan carry the secret in cleartext (works); vmess is base64 → skipped."""
    synth = dict(inbound)
    s = dict(_obj(inbound.get("settings")))
    s["clients"] = [{"id": _SENTINEL, "password": _SENTINEL, "email": ""}]
    synth["settings"] = json.dumps(s)
    out = []
    for _, link in inbound_links(synth, host, port):
        if _SENTINEL in link:
            out.append(link.replace(_SENTINEL, "{EXT_UUID}"))
    return out


def inbound_links(inbound: dict, host: str, port: Optional[int] = None,
                  remark_suffix: str = "") -> List[Tuple[str, str]]:
    """(remark, link) per enabled client of a 3x-ui inbound. host/port override the real ones."""
    settings = _obj(inbound.get("settings"))
    ss = _obj(inbound.get("streamSettings"))
    protocol = inbound.get("protocol", "")
    real_port = port or inbound.get("port")
    base_remark = inbound.get("remark") or inbound.get("tag") or "ext"
    out: List[Tuple[str, str]] = []

    clients = settings.get("clients") or []
    if protocol in ("vless", "vmess", "trojan") and not clients:
        return out

    for c in clients:
        email = c.get("email") or ""
        remark = f"{base_remark}{('-' + email) if email else ''}{remark_suffix}"
        if protocol == "vless":
            q = _stream_query(ss)
            q["encryption"] = "none"  # mandatory in a VLESS share link; clients reject it otherwise
            if c.get("flow"):
                q["flow"] = c["flow"]
            query = urllib.parse.urlencode(q, safe="/,")
            link = f"vless://{c.get('id')}@{host}:{real_port}?{query}#{urllib.parse.quote(remark)}"
        elif protocol == "trojan":
            q = _stream_query(ss)
            query = urllib.parse.urlencode(q, safe="/,")
            link = f"trojan://{urllib.parse.quote(str(c.get('password') or c.get('id') or ''))}@{host}:{real_port}?{query}#{urllib.parse.quote(remark)}"
        elif protocol == "vmess":
            net = ss.get("network", "tcp")
            vm = {
                "v": "2", "ps": remark, "add": host, "port": str(real_port),
                "id": c.get("id"), "aid": str(c.get("alterId", 0)), "net": net,
                "type": "none", "tls": ss.get("security", "none"),
            }
            if net == "ws":
                ws = ss.get("wsSettings", {})
                vm["path"] = ws.get("path", "")
                vm["host"] = (ws.get("headers") or {}).get("Host", "")
            elif net == "grpc":
                vm["path"] = (ss.get("grpcSettings", {}) or {}).get("serviceName", "")
            if ss.get("security") == "tls":
                vm["sni"] = (ss.get("tlsSettings", {}) or {}).get("serverName", "")
            link = "vmess://" + base64.b64encode(json.dumps(vm).encode()).decode()
        elif protocol in ("hysteria", "hysteria2") and (settings.get("version") == 2 or (ss.get("hysteriaSettings", {}) or {}).get("version") == 2 or protocol == "hysteria2"):
            tls = ss.get("tlsSettings", {}) or {}
            hs = ss.get("hysteriaSettings", {}) or {}
            q: Dict[str, str] = {}
            sni = tls.get("serverName")
            if sni:
                q["sni"] = sni
            alpn = tls.get("alpn")
            if alpn:
                q["alpn"] = ",".join(alpn) if isinstance(alpn, list) else alpn
            q["insecure"] = "1" if (not sni or _is_ip(sni)) else "0"
            obfs = hs.get("obfs") or settings.get("obfs")
            if isinstance(obfs, dict) and obfs.get("type"):
                q["obfs"] = obfs.get("type")
                if obfs.get("password"):
                    q["obfs-password"] = obfs.get("password")
            pw = c.get("password") or c.get("auth") or c.get("id") or ""
            query = urllib.parse.urlencode(q, safe="/,")
            link = f"hysteria2://{urllib.parse.quote(str(pw))}@{host}:{real_port}?{query}#{urllib.parse.quote(remark)}"
        else:
            continue
        out.append((remark, link))
    return out
