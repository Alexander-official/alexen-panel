"""Background sync for external panels (3x-ui / s-ui).

Each panel can be set to sync its traffic / online every N seconds, or "live"
(every tick). On each sync we store a stats snapshot on the panel (so the Traffic
view shows fresh data even with the tab closed), mark matched Alexen users online,
and — only when the panel's count_traffic is on — add the external usage DELTA into
the Alexen users' (and their admin's) quota.

Matching is by email == Alexen username (that's how provision creates the clients).
"""
import logging
import time
from datetime import datetime

from app import scheduler
from app.db import GetDB
from app.db.models import Admin, ExternalPanel, User
from app.external_panels.client import BaseClient, PanelError

logger = logging.getLogger("uvicorn.error")

TICK = 3  # seconds; live panels sync every tick, others every sync_interval
_last_run: dict = {}  # panel_id -> last run (time.monotonic)


def _due(p, now: float) -> bool:
    if not p.enabled:
        return False
    if p.live:
        return True
    iv = p.sync_interval or 0
    if iv <= 0:
        return False
    return (now - _last_run.get(p.id, 0.0)) >= iv


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
