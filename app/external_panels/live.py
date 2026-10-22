"""Live per-user config links pulled from the external panels' OWN subscription output.

Instead of reconstructing share links (which drifts from the panel's real format), we create
each Alexen user as a client on the panel with a deterministic subId, then fetch that client's
links from the panel via GET /panel/api/clients/subLinks/{subId}. Those links are byte-perfect
and always valid. Cached per (panel, user) for a few seconds; a slow/unreachable panel is skipped
so it never holds up a subscription response.
"""
import threading
import time
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
