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
    from app.external_panels import live as _eplive
    inbs = sorted(want_inbounds)
    added = 0
    for u in users:
        if u.username in present:
            continue
        sid = _eplive.subid(u.username)
        ok, msg = client.add_client(inbs, u.username, sub_id=sid, group=_eplive.GROUP)
        if msg == "exists" or (not ok and any(w in (msg or "").lower() for w in ("in use", "duplicate", "exist"))):
            client.del_client(u.username)
            ok, _ = client.add_client(inbs, u.username, sub_id=sid, group=_eplive.GROUP)
        if ok:
            added += 1
    if added:
        try:
            client.restart_xray()  # make the new clients live
        except Exception:
            pass
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

        by_inbound = data.get("by_inbound", []) or []
        online_emails = set((c.get("name") or "").strip() for c in (data.get("clients") or []) if c.get("online"))
        all_emails = set()
        for ib in by_inbound:
            all_emails.update((ib.get("clients") or {}).keys())

        users = db.query(User).filter(User.username.in_(list(all_emails))).all() if all_emails else []
        by_name = {u.username: u for u in users}
        now_dt = datetime.utcnow()

        for email in online_emails:
            u = by_name.get(email)
            if u:
                u.online_at = now_dt

        # per-inbound usage deltas (cumulative counters → delta since last sync). We attribute each
        # to a persistent, FK-free inbound_tag "🌐 <panel> · <protocol>", so it shows in statistics
        # (per-protocol) and SURVIVES deleting the panel. Quota (used_traffic) is only touched when
        # count_traffic is on; the stats attribution is always recorded.
        prev = (p.last_stats or {}).get("by_inbound_totals", {}) if isinstance(p.last_stats, dict) else {}
        new_prev: dict = {}
        usage_params = []   # [{uid, tag, value}] for UserInboundUsage
        hist: dict = {}     # {tag: bytes} for the hourly charts
        admin_add: dict = {}
        for ib in by_inbound:
            tag = f"🌐 {p.name} · {ib.get('protocol') or '?'}"
            key = str(ib.get("id"))
            prev_clients = prev.get(key) or {}
            cur_clients = ib.get("clients") or {}
            for email, total in cur_clients.items():
                total = int(total)
                new_prev.setdefault(key, {})[email] = total
                u = by_name.get(email)
                if not u:
                    continue
                old = int(prev_clients.get(email, total))  # first sight = baseline (no retro dump)
                delta = total - old
                if delta > 0:
                    usage_params.append({"uid": u.id, "tag": tag, "value": delta})
                    hist[tag] = hist.get(tag, 0) + delta
                    u.online_at = now_dt
                    if p.count_traffic:
                        u.used_traffic = (u.used_traffic or 0) + delta
                        if u.admin_id:
                            admin_add[u.admin_id] = admin_add.get(u.admin_id, 0) + delta
        if p.count_traffic:
            for admin_id, val in admin_add.items():
                a = db.query(Admin).filter(Admin.id == admin_id).first()
                if a:
                    a.users_usage = (a.users_usage or 0) + val

        p.last_stats = {
            "total_up": data.get("total_up", 0), "total_down": data.get("total_down", 0),
            "online": data.get("online", 0), "server": data.get("server") or {},
            "by_inbound_totals": new_prev, "at": now_dt.isoformat(),
        }
        p.last_sync = now_dt
        p.last_error = None
        db.commit()

        # persistent per-protocol stats (own session; survives panel deletion — plain-string tags)
        if usage_params:
            try:
                from app.jobs.record_usages import record_user_inbound_stats
                record_user_inbound_stats(usage_params)
                from app import stats_history
                stats_history.record_inbounds(hist)
            except Exception as e:
                logger.warning(f"external panel {p.id} stats record: {e}")

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
