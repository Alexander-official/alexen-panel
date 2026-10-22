"""Live per-user config links pulled from the external panels' OWN subscription output.

Instead of reconstructing share links (which drifts from the panel's real format), we create
each Alexen user as a client on the panel with a deterministic subId, then fetch that client's
links from the panel via GET /panel/api/clients/subLinks/{subId}. Those links are byte-perfect
and always valid. Cached per (panel, user) for a few seconds; a slow/unreachable panel is skipped
so it never holds up a subscription response.
"""
import base64
import json
import threading
import time
import urllib.parse
import uuid
from typing import List

GROUP = "alexen"            # marks the clients Alexen creates (so we never touch the panel's own)
_TTL = 30.0                 # per-user link cache
_DOWN = 60.0                # skip a panel this long after it fails/times out
_CLIENT_TTL = 300.0         # reuse a logged-in client this long

_links_cache = {}   # (panel_id, subid) -> (ts, links)
_down = {}          # panel_id -> skip-until ts
_clients = {}       # panel_id -> (ts, client)
_lock = threading.Lock()


def subid(username: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "alexen:" + username))


def _link_hostport(line: str):
    try:
        if line.startswith("vmess://"):
            d = json.loads(base64.b64decode(line[8:].strip() + "==").decode("utf-8"))
            return (str(d.get("add") or ""), int(d.get("port") or 0) or None)
        u = urllib.parse.urlsplit(line.split("#", 1)[0])
        return (u.hostname or "", u.port)
    except Exception:
        return (None, None)


def _rewrite_link(line: str, port_map: dict, host_over: str) -> str:
    """Change a link's port/host for the OUTPUT only (the panel is untouched). Keeps uuid, name
    and params; when the host changes and TLS has no sni, the old host is kept as sni so the
    certificate still matches. Ported from the reference project's _link_rewrite."""
    old_h, old_p = _link_hostport(line)
    new_p = None
    if old_p and port_map:
        new_p = port_map.get(str(old_p)) or port_map.get(old_p)
    new_h = host_over or None
    if not new_p and not new_h:
        return line
    try:
        if line.startswith("vmess://"):
            d = json.loads(base64.b64decode(line[8:].strip() + "==").decode("utf-8"))
            if new_h and new_h != d.get("add"):
                if (d.get("tls") or "") == "tls" and not d.get("sni"):
                    d["sni"] = d.get("add", "")
                if d.get("net") in ("ws", "httpupgrade", "xhttp", "splithttp", "h2", "http") and not d.get("host"):
                    d["host"] = d.get("add", "")
                d["add"] = new_h
            if new_p:
                d["port"] = int(new_p)
            return "vmess://" + base64.b64encode(json.dumps(d, ensure_ascii=False, separators=(",", ":")).encode()).decode()
        body, frag = (line.split("#", 1) + [""])[:2] if "#" in line else (line, None)
        scheme, rest = body.split("://", 1)
        cut = len(rest)
        for ch in "/?":
            i = rest.find(ch)
            if i != -1:
                cut = min(cut, i)
        auth, tail = rest[:cut], rest[cut:]
        ui, _, hp = auth.rpartition("@")
        if hp.startswith("["):
            h, _, p = hp[1:].partition("]")
            p = p.lstrip(":")
        else:
            h, _, p = hp.rpartition(":")
            if not h:
                h, p = p, ""
        before_h = h
        if new_h:
            h = new_h
        if new_p:
            p = str(new_p)
        hfmt = f"[{h}]" if ":" in h else h
        hp2 = f"{hfmt}:{p}" if p else hfmt
        if new_h and new_h != before_h:
            q = urllib.parse.parse_qs(tail.split("?", 1)[1] if "?" in tail else "", keep_blank_values=True)
            sec = q.get("security", [""])[0]
            add = []
            if (sec == "tls" or (scheme in ("trojan", "hysteria2", "hy2", "tuic") and sec in ("", "tls"))) \
                    and not q.get("sni") and not q.get("peer"):
                add.append("sni=" + urllib.parse.quote(before_h))
            if q.get("type", [""])[0] in ("ws", "httpupgrade", "xhttp", "splithttp", "h2", "http") and not q.get("host"):
                add.append("host=" + urllib.parse.quote(before_h))
            if add:
                tail = tail + ("&" if "?" in tail else "?") + "&".join(add)
        auth2 = f"{ui}@{hp2}" if ui else hp2
        return f"{scheme}://{auth2}{tail}" + ("#" + frag if frag is not None else "")
    except Exception:
        return line


def _in_scope(prov: dict, admin_username: str) -> bool:
    if not prov or not prov.get("inbounds"):
        return False
    if prov.get("scope_all"):
        return True
    return admin_username in (prov.get("admins") or [])


def _client_for(panel):
    """A logged-in client per panel, reused for ~5 min (avoids a login per user)."""
    pid = panel.id
    now = time.time()
    c = _clients.get(pid)
    if c and now - c[0] < _CLIENT_TTL:
        return c[1]
    from app.external_panels.client import BaseClient
    cl = BaseClient.from_panel(panel)
    cl.login()
    _clients[pid] = (now, cl)
    return cl


def _fetch(panel, sid: str) -> List[str]:
    pid, now = panel.id, time.time()
    hit = _links_cache.get((pid, sid))
    if hit and now - hit[0] < _TTL:
        return hit[1]
    if _down.get(pid, 0) > now:
        return hit[1] if hit else []
    try:
        links = _client_for(panel).sub_links(sid)
        _links_cache[(pid, sid)] = (time.time(), links)
        _down.pop(pid, None)
        return links
    except Exception:
        _down[pid] = time.time() + _DOWN
        _clients.pop(pid, None)
        return hit[1] if hit else []


def user_links(username: str, admin_username: str = "") -> List[str]:
    """All provisioned external-panel links for a user, named per each panel's provision choice."""
    if not username:
        return []
    from app.db import GetDB
    from app.db.models import ExternalPanel
    from app.subscription import external as _ext

    out: List[str] = []
    sid = subid(username)
    try:
        with GetDB() as db:
            panels = db.query(ExternalPanel).filter(ExternalPanel.enabled.is_(True)).all()
            jobs = []
            for p in panels:
                prov = p.prov_config or {}
                if p.kind != "3xui" or not _in_scope(prov, admin_username):
                    continue
                jobs.append((p, prov, _fetch(p, sid)))  # _fetch uses a cached client; session still open
    except Exception:
        return out

    for p, prov, links in jobs:
        if not links:
            continue
        port_map = {str(k): v for k, v in (prov.get("port_map") or {}).items()}
        host_over = (prov.get("host_over") or "").strip()
        if port_map or host_over:
            links = [_rewrite_link(l, port_map, host_over) for l in links]
        cfg = _ext.ExternalConfig(id=f"extpanel-live-{p.id}", name="", kind="links",
                                  name_mode=prov.get("name_mode") or "original",
                                  name_template=prov.get("name_template") or "")
        variables = {"USERNAME": username}
        out += [_ext._name_link(l, cfg, variables, i) for i, l in enumerate(links)]
    return out


def forget_panel(panel_id: int) -> None:
    for d in (_down, _clients):
        d.pop(panel_id, None)
    for k in [k for k in _links_cache if k[0] == panel_id]:
        _links_cache.pop(k, None)
