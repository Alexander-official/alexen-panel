"""Live traffic rates (bytes per second), from the per user / inbound / node
byte counts the usage job collects every few seconds (app/jobs/record_usages.py).
Kept in memory only: a short history of samples, enough for "current speed"
and for the auto IP change rules (app/xray/auto_change.py)."""
import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, List, Optional, Tuple

# how far back samples are kept, seconds (auto change rules can look this far)
HISTORY_SECONDS = 6 * 3600
# "current" speed = average over this many seconds
LIVE_WINDOW = 30

MASTER = None  # node id of the main core

_lock = threading.Lock()
# (time, seconds covered, {(node_id, user_id, inbound_tag): bytes})
_samples: Deque[Tuple[float, float, Dict[Tuple[Optional[int], int, str], int]]] = deque()
_last_time: Optional[float] = None
# nodes that answered in each sample (a node with no traffic still counts as "seen")
_seen: Deque[Tuple[float, set]] = deque()


def record(results: Dict[Optional[int], list], nodes_seen: List[Optional[int]]):
    """results: node id -> [{"uid", "tag", "value"}, ...] (raw bytes since the last call)"""
    global _last_time
    now = time.time()
    with _lock:
        span = now - _last_time if _last_time else 0
        _last_time = now
        if not span:
            return  # first call: the counters held an unknown period
        counts = defaultdict(int)
        for node_id, params in results.items():
            for p in params:
                counts[(node_id, int(p["uid"]), p["tag"])] += int(p["value"])
        _samples.append((now, span, dict(counts)))
        _seen.append((now, set(nodes_seen)))
        while _samples and _samples[0][0] < now - HISTORY_SECONDS:
            _samples.popleft()
        while _seen and _seen[0][0] < now - HISTORY_SECONDS:
            _seen.popleft()


def _window(seconds: float):
    now = time.time()
    with _lock:
        return [s for s in _samples if s[0] >= now - seconds]


def live(window: float = LIVE_WINDOW) -> dict:
    """bytes/s over the last `window` seconds, split every useful way"""
    samples = _window(window)
    covered = sum(span for _, span, _ in samples)
    users: Dict[int, dict] = {}
    inbounds: Dict[str, dict] = {}
    nodes: Dict[Optional[int], float] = defaultdict(float)
    if covered:
        for _, _, counts in samples:
            for (node_id, uid, tag), value in counts.items():
                rate = value / covered
                u = users.setdefault(uid, {"rate": 0.0, "inbounds": defaultdict(float)})
                u["rate"] += rate
                u["inbounds"][tag] += rate
                i = inbounds.setdefault(tag, {"rate": 0.0, "nodes": defaultdict(float)})
                i["rate"] += rate
                i["nodes"][node_id] += rate
                nodes[node_id] += rate
    return {
        "window": covered,
        "users": {uid: {"rate": v["rate"], "inbounds": dict(v["inbounds"])} for uid, v in users.items()},
        "inbounds": {tag: {"rate": v["rate"], "nodes": dict(v["nodes"])} for tag, v in inbounds.items()},
        "nodes": dict(nodes),
    }


def node_rates(seconds: float, tags: Optional[set] = None) -> Dict[Optional[int], dict]:
    """per node over the last `seconds`: covered time, highest per-sample rate.
    Only traffic of the given inbound tags when `tags` is set."""
    samples = _window(seconds)
    now = time.time()
    with _lock:
        seen = [s for s in _seen if s[0] >= now - seconds]
    out: Dict[Optional[int], dict] = {}
    for (t, nodes_in_sample), (_, span, counts) in zip(seen, samples):
        per_node = defaultdict(int)
        for (node_id, _uid, tag), value in counts.items():
            if tags is None or tag in tags:
                per_node[node_id] += value
        for node_id in nodes_in_sample:
            entry = out.setdefault(node_id, {"covered": 0.0, "max_rate": 0.0, "first": t})
            entry["covered"] += span
            entry["max_rate"] = max(entry["max_rate"], per_node.get(node_id, 0) / span if span else 0)
    return out


def low_streaks(threshold: float, tags: Optional[set], since: float = 0) -> Dict[Optional[int], dict]:
    """per node: since when its traffic (of the given inbound tags) has been under
    `threshold` bytes/s without a break, counting no further back than `since`.
    low_since is None when the latest sample was over the threshold.
    A sample the node didn't answer in breaks the streak: no answer isn't "low"."""
    now = time.time()
    with _lock:
        pairs = [(seen, s) for (_, seen), s in zip(_seen, _samples) if s[0] > since]
    out: Dict[Optional[int], dict] = {}
    if not pairs:
        return out
    last_t = pairs[-1][1][0]
    nodes = set().union(*(seen for seen, _ in pairs))
    per_sample = []
    for seen, (t, span, counts) in pairs:
        per_node = defaultdict(int)
        for (node_id, _uid, tag), value in counts.items():
            if tags is None or tag in tags:
                per_node[node_id] += value
        per_sample.append((t, span, seen, per_node))
    live_from = now - LIVE_WINDOW
    for node_id in nodes:
        low_since = None
        for t, span, seen, per_node in reversed(per_sample):
            if node_id not in seen or (span and per_node.get(node_id, 0) / span >= threshold):
                break
            low_since = max(t - span, since)
        live_bytes = sum(p.get(node_id, 0) for t, _, _, p in per_sample if t >= live_from)
        live_span = sum(span for t, span, _, _ in per_sample if t >= live_from)
        out[node_id] = {
            "low_since": low_since,
            # how long that is confirmed by samples (the latest one may be a few s old)
            "low_for": (last_t - low_since) if low_since is not None else 0,
            "live_rate": live_bytes / live_span if live_span else 0,
            "answering": node_id in per_sample[-1][2],
        }
    return out
