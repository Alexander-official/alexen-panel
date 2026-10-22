"""Background sync for external panels (3x-ui / s-ui).

Each panel can be set to sync its traffic / online every N seconds, or "live"
(every tick). On each sync we store a stats snapshot on the panel (so the Traffic
view shows fresh data even with the tab closed), mark matched Alexen users online,
and — only when the panel's count_traffic is on — add the external usage DELTA into
the Alexen users' (and their admin's) quota.

Matching is by email == Alexen username (that's how provision creates the clients).
"""
import json
import logging
import time
from datetime import datetime

from app import scheduler
from app.db import GetDB
from app.db.models import Admin, ExternalPanel, User
from app.external_panels.client import BaseClient, PanelError

logger = logging.getLogger("uvicorn.error")

TICK = 3  # seconds; live panels sync every tick, others every sync_interval
AUTO_EVERY = 60  # seconds between auto-provision passes (adding newly-created users)
_last_run: dict = {}   # panel_id -> last stats sync (time.monotonic)
_last_auto: dict = {}  # panel_id -> last auto-provision pass (time.monotonic)


def _secret(u) -> str:
    for field in ("id", "password", "auth"):
        for pr in (u.proxies or []):
            st = pr.settings or {}
            if isinstance(st, dict) and st.get(field):
                return st[field]
    return ""


def _auto_provision(db, p, client) -> None:
    """Add any scoped Alexen user not yet on the panel to all configured inbounds. Only adds
    (never removes — the panel may hold the seller's own clients too). Runs at most every AUTO_EVERY."""
    prov = p.prov_config or {}
    if not (prov.get("auto") and prov.get("inbounds")):
        return
    now = time.monotonic()
    if (now - _last_auto.get(p.id, 0.0)) < AUTO_EVERY:
        return
    _last_auto[p.id] = now
    q = db.query(User)
    if not prov.get("scope_all"):
        aids = [a.id for a in db.query(Admin).filter(Admin.username.in_(prov.get("admins") or [])).all()]
        q = q.filter(User.admin_id.in_(aids))
    users = q.all()
    want_inbounds = set(int(x) for x in prov["inbounds"])
    present = set()
    for ib in client.raw_inbounds():
        if int(ib.get("id")) in want_inbounds:
            s = ib.get("settings")
            s = json.loads(s) if isinstance(s, str) else (s or {})
            for c in s.get("clients", []):
                if c.get("email"):
                    present.add(c["email"])
    inbs = sorted(want_inbounds)
    added = 0
    for u in users:
        if u.username in present:
            continue
        sec = _secret(u)
        if not sec:
            continue
        ok, msg = client.add_client(inbs, u.username, sec)
        if (not ok and "in use" in (msg or "")) or msg == "exists":
            client.del_client(u.username)
            ok, _ = client.add_client(inbs, u.username, sec)
        if ok:
            added += 1
    if added:
        logger.info(f"external panel {p.id} auto-provision: added {added} new user(s)")


def _due(p, now: float) -> bool:
    if not p.enabled:
        return False
    if p.live:
        return True
    iv = p.sync_interval or 0
    if iv > 0 and (now - _last_run.get(p.id, 0.0)) >= iv:
        return True
    # auto-provision panels still need periodic passes even when display sync is off
    if (p.prov_config or {}).get("auto") and (now - _last_auto.get(p.id, 0.0)) >= AUTO_EVERY:
        return True
    return False


def _sync_one(panel_id: int) -> None:
    with GetDB() as db:
        p = db.query(ExternalPanel).filter(ExternalPanel.id == panel_id).first()
        if not p:
            return
        try:
            client = BaseClient.from_panel(p)
            client.login()
            data = client.stats()
        except PanelError as e:
            p.last_error = str(e)
            db.commit()
            return

        clients = data.get("clients", []) or []
        totals: dict = {}
        online_emails = set()
        for c in clients:
            email = (c.get("name") or "").strip()
            if not email:
                continue
            totals[email] = int(c.get("total") or ((c.get("up", 0) or 0) + (c.get("down", 0) or 0)))
            if c.get("online"):
                online_emails.add(email)

        users = db.query(User).filter(User.username.in_(list(totals.keys()))).all() if totals else []
        by_name = {u.username: u for u in users}
        now_dt = datetime.utcnow()

        for email in online_emails:
            u = by_name.get(email)
            if u:
                u.online_at = now_dt

        if p.count_traffic:
            prev = (p.last_stats or {}).get("totals", {}) if isinstance(p.last_stats, dict) else {}
            admin_add: dict = {}
            for email, total in totals.items():
                u = by_name.get(email)
                if not u:
                    continue
                # first time we see a client, its cumulative counter is the baseline (delta 0),
                # so we never dump the whole historical total into the quota at once
                old = int(prev.get(email, total))
                delta = total - old
                if delta > 0:
                    u.used_traffic = (u.used_traffic or 0) + delta
                    u.online_at = now_dt
                    if u.admin_id:
                        admin_add[u.admin_id] = admin_add.get(u.admin_id, 0) + delta
            for admin_id, val in admin_add.items():
                a = db.query(Admin).filter(Admin.id == admin_id).first()
                if a:
                    a.users_usage = (a.users_usage or 0) + val

        # trimmed snapshot (no per-client list — that can be 200+ rows every few seconds);
        # the Traffic view polls /stats live for the client list while it's open
        p.last_stats = {
            "total_up": data.get("total_up", 0), "total_down": data.get("total_down", 0),
            "online": data.get("online", 0), "server": data.get("server") or {},
            "totals": totals, "at": now_dt.isoformat(),
        }
        p.last_sync = now_dt
        p.last_error = None
        db.commit()

        try:
            _auto_provision(db, p, client)
            db.commit()
        except Exception as e:
            logger.warning(f"external panel {p.id} auto-provision: {e}")


def sync_all() -> None:
    now = time.monotonic()
    with GetDB() as db:
        panels = db.query(ExternalPanel).filter(ExternalPanel.enabled.is_(True)).all()
        due = [p.id for p in panels if _due(p, now)]
    for pid in due:
        _last_run[pid] = now
        try:
            _sync_one(pid)
        except Exception as e:
            logger.warning(f"external panel sync {pid}: {e}")


scheduler.add_job(sync_all, "interval", seconds=TICK, coalesce=True,
                  max_instances=1, id="external_panel_sync")
