"""Auto IP change: a rule is a chain of stages. Each stage fires once: when the
traffic of the rule's hosts on a node stays under the stage's threshold for its
time (usually: the IP got blocked), the hosts' address is switched to the stage's
IP. The next stage then starts watching, right away or once the new IP carried
some traffic / some time passed. After the last stage the rule is finished until
it is reset. Rules live in the settings table and are checked by a scheduler job
(app/jobs/auto_ip_change.py)."""
import secrets
import time
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator

from app import logger

SETTINGS_KEY = "auto_ip_change"
MAX_LOG = 100


class Stage(BaseModel):
    ip: str = ""
    # fires when traffic is under this many KB/s ...
    threshold_kbps: float = Field(1, ge=0)
    # ... for this many minutes
    minutes: int = Field(5, ge=1, le=1440)
    # stages after the first: start watching once the previous stage's IP carries
    # this many KB/s (0: off) ...
    start_kbps: float = Field(0, ge=0)
    # ... or this many minutes after the previous switch (0: off); both off: at once
    start_minutes: int = Field(0, ge=0, le=1440)


class Rule(BaseModel):
    id: str = ""
    name: str = Field("", max_length=100)
    enabled: bool = True
    host_ids: List[int] = []
    # node ids to watch; "master" for the main core; empty = every node
    nodes: List[str] = []
    # only switch while somebody is connected to the panel somewhere (any inbound,
    # any node): a quiet night then doesn't look like a block
    require_online: bool = False
    stages: List[Stage] = []
    # kept by the server: the stage that fires next (== len(stages): finished),
    # when it started watching (0: waiting to start), the last switch
    stage: int = 0
    armed_at: float = 0
    last_change: float = 0

    @model_validator(mode="before")
    @classmethod
    def _from_ip_list(cls, v):
        """rules saved before stages: one IP list cycled forever, `current` = in use"""
        if isinstance(v, dict) and "stages" not in v and "ips" in v:
            v = dict(v)
            stages = [{"ip": ip, "threshold_kbps": v.get("threshold_kbps", 1), "minutes": v.get("minutes", 5)}
                      for ip in v.pop("ips") or []]
            v["stages"] = stages
            v["stage"] = min(v.pop("current", -1) + 1, len(stages))
            v["armed_at"] = v.get("last_change", 0)
        return v

    @property
    def finished(self) -> bool:
        return self.stage >= len(self.stages)

    @property
    def watching(self) -> bool:
        """the current stage counts low traffic (the first one always does)"""
        return not self.finished and (self.stage == 0 or self.armed_at > 0)


class LogEntry(BaseModel):
    time: float
    rule: str
    node: str
    old: str
    new: str
    reason: str
    stage: int = 0


class AutoChangeSettings(BaseModel):
    rules: List[Rule] = []
    log: List[LogEntry] = []


def load(db=None) -> AutoChangeSettings:
    from app.db import GetDB, crud
    if db is not None:
        return AutoChangeSettings(**(crud.get_setting(db, SETTINGS_KEY) or {}))
    with GetDB() as db:
        return AutoChangeSettings(**(crud.get_setting(db, SETTINGS_KEY) or {}))


def save(db, s: AutoChangeSettings) -> AutoChangeSettings:
    from app.db import crud
    for r in s.rules:
        if not r.id:
            r.id = secrets.token_hex(4)
        for st in r.stages:
            st.ip = st.ip.strip()
        r.stage = min(max(r.stage, 0), len(r.stages))
    s.log = s.log[-MAX_LOG:]
    crud.set_setting(db, SETTINGS_KEY, s.model_dump())
    return s


def _node_key(node_id: Optional[int]) -> str:
    return "master" if node_id is None else str(node_id)


def _node_name(db, node_id: Optional[int]) -> str:
    if node_id is None:
        return "Master"
    from app.db.models import Node
    node = db.query(Node).filter(Node.id == node_id).first()
    return node.name if node else f"node {node_id}"


def switch(db, rule: Rule, reason: str, node_name: str = "") -> Optional[LogEntry]:
    """Fire the rule's current stage: point its hosts at the stage's IP"""
    from app import xray
    from app.db.models import ProxyHost
    if rule.finished or not rule.host_ids:
        return None
    hosts = db.query(ProxyHost).filter(ProxyHost.id.in_(rule.host_ids)).all()
    if not hosts:
        return None
    n = rule.stage
    new = rule.stages[n].ip
    old = hosts[0].address
    for h in hosts:
        h.address = new
    db.commit()
    xray.hosts.update()
    rule.stage += 1
    rule.armed_at = 0
    rule.last_change = time.time()
    logger.warning(f"Auto IP change \"{rule.name}\" stage {n + 1}: {old} -> {new} ({reason})")
    return LogEntry(time=rule.last_change, rule=rule.name or rule.id, node=node_name, old=old, new=new,
                    reason=reason, stage=n + 1)


def rule_tags(db, rule: Rule) -> set:
    from app.db.models import ProxyHost
    if not rule.host_ids:
        return set()
    return {tag for (tag,) in db.query(ProxyHost.inbound_tag).filter(ProxyHost.id.in_(rule.host_ids)).all()}


def _watched(rule: Rule, rates: dict) -> dict:
    watched = set(rule.nodes)
    return {n: v for n, v in rates.items() if not watched or _node_key(n) in watched}


def streaks(db, rule: Rule, tags: Optional[set] = None) -> dict:
    """node id -> low streak (app/xray/traffic.low_streaks) of the current stage on
    the rule's watched nodes, counted from when the stage started watching"""
    from app.xray import traffic
    tags = rule_tags(db, rule) if tags is None else tags
    if not tags or not rule.watching:
        return {}
    st = rule.stages[rule.stage]
    since = max(rule.armed_at, rule.last_change)
    return _watched(rule, traffic.low_streaks(st.threshold_kbps * 1024, tags, since))


def start_progress(db, rule: Rule, tags: Optional[set] = None) -> Optional[dict]:
    """for a stage waiting to start: how far its start conditions are"""
    from app.xray import traffic
    if rule.finished or rule.watching:
        return None
    st = rule.stages[rule.stage]
    tags = rule_tags(db, rule) if tags is None else tags
    elapsed = time.time() - rule.last_change
    # highest per-sample speed since the switch: the new IP has carried that much
    rates = _watched(rule, traffic.node_rates(elapsed, tags)) if tags else {}
    best = max((v["max_rate"] for v in rates.values()), default=0)
    ready = (
        (st.start_kbps <= 0 and st.start_minutes <= 0)
        or (st.start_minutes > 0 and elapsed >= st.start_minutes * 60)
        or (st.start_kbps > 0 and best >= st.start_kbps * 1024)
    )
    return {"elapsed": elapsed, "best_rate": best, "ready": ready,
            "nodes": {_node_key(n): v["max_rate"] for n, v in rates.items()}}


def check():
    """scheduler job"""
    from app import xray
    from app.db import GetDB
    from app.xray import online

    with GetDB() as db:
        s = load(db)
        changed = False
        new_log = []
        for rule in s.rules:
            if not rule.enabled or rule.finished or not rule.host_ids:
                continue
            tags = rule_tags(db, rule)
            if not tags:
                continue
            if not rule.watching:
                p = start_progress(db, rule, tags)
                if p and p["ready"]:
                    rule.armed_at = time.time()
                    changed = True
                    logger.info(f"Auto IP change \"{rule.name}\": stage {rule.stage + 1} started watching")
                continue
            if rule.require_online and not online.online_users:
                continue
            st = rule.stages[rule.stage]
            window = st.minutes * 60
            for node_id, v in streaks(db, rule, tags).items():
                if node_id is not None and node_id not in xray.nodes:
                    continue
                if v["low_since"] is None or v["low_for"] < window:
                    continue
                name = _node_name(db, node_id)
                entry = switch(db, rule, f"{name}: under {st.threshold_kbps:g} KB/s for {st.minutes} min", name)
                if entry:
                    new_log.append(entry)
                    changed = True
                break
        if changed:
            # the rules may have been edited meanwhile: only write back where they stand
            fresh = load(db)
            state = {r.id: r for r in s.rules}
            for r in fresh.rules:
                if r.id in state:
                    r.stage, r.armed_at, r.last_change = state[r.id].stage, state[r.id].armed_at, state[r.id].last_change
            fresh.log.extend(new_log)
            save(db, fresh)
