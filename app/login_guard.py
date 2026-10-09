"""Brute-force protection for the admin login, and the client IP the panel can trust.

Failed logins are counted per IP and per IP + username in a sliding window;
over the limit the login answers 429 (without even checking the password, so
guessing stays slow). A successful login clears its IP + username count.
Kept in memory: a restart forgets the counts, which is fine for this purpose.

X-Forwarded-For is only believed when the request comes from a proxy on this
machine (or one listed in TRUSTED_PROXIES): the panel usually faces the
internet directly, and anyone can send that header."""
import os
import threading
import time
from collections import defaultdict, deque
from typing import Deque, Dict, Optional, Tuple

WINDOW = int(os.getenv("LOGIN_FAIL_WINDOW", "600"))          # seconds
MAX_PER_IP = int(os.getenv("LOGIN_MAX_FAILS_PER_IP", "20"))
MAX_PER_USER_IP = int(os.getenv("LOGIN_MAX_FAILS_PER_USER", "5"))
TRUSTED_PROXIES = {"127.0.0.1", "::1"} | {x.strip() for x in os.getenv("TRUSTED_PROXIES", "").split(",") if x.strip()}

_fails: Dict[object, Deque[float]] = defaultdict(deque)
_lock = threading.Lock()


def client_ip(peer: Optional[str], forwarded_for: Optional[str]) -> str:
    """the caller's IP: the connection's own, or the proxy's X-Forwarded-For when a trusted proxy sent it"""
    peer = (peer or "").strip()
    if forwarded_for and peer in TRUSTED_PROXIES:
        return forwarded_for.split(",")[0].strip()[:64] or peer
    return peer[:64] or "Unknown"


def _recent(key, now: float) -> Deque[float]:
    q = _fails[key]
    while q and now - q[0] > WINDOW:
        q.popleft()
    return q


def blocked_for(ip: str, username: str) -> int:
    """seconds until this IP may try this username again (0: it may now)"""
    now = time.time()
    with _lock:
        waits = []
        for key, limit in ((("ip", ip), MAX_PER_IP), (("user", ip, username.lower()), MAX_PER_USER_IP)):
            q = _recent(key, now)
            if len(q) >= limit:
                waits.append(int(WINDOW - (now - q[-limit])) + 1)
        return max(waits, default=0)


def failed(ip: str, username: str) -> None:
    now = time.time()
    with _lock:
        _recent(("ip", ip), now).append(now)
        _recent(("user", ip, username.lower()), now).append(now)
        if len(_fails) > 50000:   # someone spraying from many addresses: drop the stale ones
            for key in [k for k, q in _fails.items() if not q or now - q[-1] > WINDOW]:
                _fails.pop(key, None)


def succeeded(ip: str, username: str) -> None:
    with _lock:
        _fails.pop(("user", ip, username.lower()), None)
