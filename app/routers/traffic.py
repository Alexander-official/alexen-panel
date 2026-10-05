"""Live traffic speeds and the auto IP change rules"""
import time
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import Node, ProxyHost, User
from app.models.admin import Admin
from app.utils import responses
from app.xray import auto_change, traffic

router = APIRouter(tags=["Traffic"], prefix="/api", responses={401: responses._401, 403: responses._403})


def _node_names(db: Session) -> Dict[Optional[int], str]:
    names: Dict[Optional[int], str] = {None: "Master"}
    names.update(dict(db.query(Node.id, Node.name).all()))
    return names


@router.get("/traffic/live")
def live_traffic(db: Session = Depends(get_db), admin: Admin = Depends(Admin.get_current)):
    """Current speed (bytes/s) per user, per inbound and per node"""
    data = traffic.live()
    uids = list(data["users"])
    query = db.query(User.id, User.username).filter(User.id.in_(uids))
    if not admin.is_sudo:
        from app.db import crud
        dbadmin = crud.get_admin(db, admin.username)
        query = query.filter(User.admin_id == (dbadmin.id if dbadmin else -1))
    usernames = dict(query.all())
    names = _node_names(db)
    result = {
        "window": data["window"],
        "users": {usernames[uid]: v for uid, v in data["users"].items() if uid in usernames},
    }
    if admin.is_sudo:
        result["inbounds"] = {
            tag: {"rate": v["rate"], "nodes": {names.get(n, str(n)): r for n, r in v["nodes"].items()}}
            for tag, v in data["inbounds"].items()
        }
        result["nodes"] = {names.get(n, str(n)): r for n, r in data["nodes"].items()}
    return result


class RulesPayload(BaseModel):
    rules: List[auto_change.Rule]


def _status(db: Session, s: auto_change.AutoChangeSettings) -> dict:
    """live view of every rule: which stage it is at; while that stage watches, per
    node since when it has been under the threshold (the countdown starts there);
    while it waits to start, how far its start conditions are"""
    from app import xray
    from app.xray import online
    names = _node_names(db)
    out = {}
    for rule in s.rules:
        paused = None
        if not rule.enabled:
            paused = "disabled"
        elif not rule.stages or not rule.host_ids:
            paused = "incomplete"
        elif rule.watching and rule.require_online and not online.online_users:
            paused = "nobody_online"
        tags = auto_change.rule_tags(db, rule)
        out[rule.id] = {
            "paused": paused,
            "stage": rule.stage,
            "phase": "finished" if rule.finished else "watching" if rule.watching else "starting",
            "start": auto_change.start_progress(db, rule, tags),
            "nodes": [
                {
                    "node": names.get(n, str(n)),
                    "key": "master" if n is None else str(n),
                    "connected": n is None or n in xray.nodes,
                    **v,
                }
                for n, v in auto_change.streaks(db, rule, tags).items()
            ],
        }
    return {"now": time.time(), "rules": out}


def _state(db: Session) -> dict:
    s = auto_change.load(db)
    names = _node_names(db)
    hosts = [
        {"id": h.id, "remark": h.remark, "address": h.address, "inbound_tag": h.inbound_tag, "disabled": bool(h.is_disabled)}
        for h in db.query(ProxyHost).order_by(ProxyHost.inbound_tag, ProxyHost.id).all()
    ]
    return {
        "rules": [r.model_dump() for r in s.rules],
        "log": [e.model_dump() for e in reversed(s.log)],
        "hosts": hosts,
        "nodes": [{"key": "master", "name": "Master"}] + [
            {"key": str(nid), "name": name} for nid, name in names.items() if nid is not None
        ],
        "status": _status(db, s),
    }


@router.get("/auto-change/status")
def get_auto_change_status(db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """cheap to poll: only the live part, plus where each rule's IP list stands"""
    s = auto_change.load(db)
    return {
        **_status(db, s),
        "current": {r.id: {"stage": r.stage, "armed_at": r.armed_at, "last_change": r.last_change} for r in s.rules},
        "log_size": len(s.log),
    }


@router.get("/auto-change")
def get_auto_change(db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    return _state(db)


@router.put("/auto-change")
def put_auto_change(payload: RulesPayload, db: Session = Depends(get_db),
                    admin: Admin = Depends(Admin.check_sudo_admin)):
    s = auto_change.load(db)
    old = {r.id: r for r in s.rules}
    for r in payload.rules:
        prev = old.get(r.id)
        # which stage it is at is the server's business
        if prev:
            r.stage, r.armed_at, r.last_change = prev.stage, prev.armed_at, prev.last_change
        else:
            r.stage, r.armed_at, r.last_change = 0, 0, 0
        r.stages = [st for st in r.stages if st.ip.strip()]
        if r.enabled and (not r.stages or not r.host_ids):
            raise HTTPException(400, f"{r.name or 'rule'}: pick hosts and add at least one stage with an IP")
    s.rules = payload.rules
    auto_change.save(db, s)
    return _state(db)


@router.post("/auto-change/{rule_id}/switch")
def switch_now(rule_id: str, db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """Fire the rule's current stage right away"""
    s = auto_change.load(db)
    rule = next((r for r in s.rules if r.id == rule_id), None)
    if not rule:
        raise HTTPException(404, "Rule not found")
    entry = auto_change.switch(db, rule, "manual", "")
    if not entry:
        raise HTTPException(400, "Nothing to switch: every stage is done, or no hosts are picked")
    s.log.append(entry)
    auto_change.save(db, s)
    return _state(db)


@router.post("/auto-change/{rule_id}/reset")
def reset_rule(rule_id: str, db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """Back to stage 1, watching from now on; the hosts keep their address"""
    s = auto_change.load(db)
    rule = next((r for r in s.rules if r.id == rule_id), None)
    if not rule:
        raise HTTPException(404, "Rule not found")
    rule.stage, rule.armed_at = 0, time.time()
    auto_change.save(db, s)
    return _state(db)
