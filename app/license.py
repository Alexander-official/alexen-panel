"""The panel's license (Alexen license server, admin.alexateam.ru).

The creator enters a key; the license server binds it to this server and answers with a
certificate signed by its Ed25519 key. The certificate holds the limits (users, admins,
nodes at once), the end date and this server's ids; the panel checks the signature with the
public key below, so a certificate can't be made or changed anywhere else.

The panel asks the server again every 6 hours. When the server can't be reached the panel
keeps going on the certificate it has (the server being down never stops a panel); after the
end date it still works GRACE_DAYS more. Without a valid license the management (the API) is
locked, but the VPN keeps working: Xray, the nodes and the subscription links are untouched.

Files in <data>/license/: key (the key, for the updater too), install_id (this install),
cert.json (the last certificate) and state.json (when it last talked to the server).
"""
import base64
import functools
import hashlib
import json
import logging
import os
import threading
import time
import urllib.error
import urllib.request
import uuid
from typing import Optional

from app.backup import data_dir

logger = logging.getLogger("uvicorn.error")

SERVER = os.environ.get("ALEXEN_LICENSE_SERVER", "https://admin.alexateam.ru").rstrip("/")
# the license server's signing key (public half); a certificate signed by another key is no license
PUBLIC_KEY = "me9Yq1wS0MRKqsRdM7lAOQV2W3yP3C2L+Yr+ovnkp6I="
GRACE_DAYS = 7
CHECK_HOURS = 6
LOCKED = ("unlicensed", "invalid", "expired", "suspended", "revoked", "moved")
KINDS = ("users", "admins", "nodes")

_lock = threading.RLock()
_cache = {"at": 0.0, "value": None, "files": None}
_limit_locks = {k: threading.Lock() for k in KINDS}


class LicenseError(Exception):
    """a refused activation: code is what the dashboard shows (invalid, bound, expired, ...)"""

    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code


class LicenseLimitError(Exception):
    """a user / admin / node over the license's limit, or the license isn't active"""


# ---------------------------------------------------------------- files
def _dir() -> str:
    return os.path.join(data_dir(), "license")


def _path(name: str) -> str:
    return os.path.join(_dir(), name)


def _read(name: str) -> str:
    try:
        with open(_path(name)) as f:
            return f.read().strip()
    except OSError:
        return ""


def _write(name: str, text: str, mode: int = 0o600) -> None:
    os.makedirs(_dir(), exist_ok=True)
    tmp = _path(name + ".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, mode)
    with os.fdopen(fd, "w") as f:
        f.write(text)
    os.chmod(tmp, mode)
    os.replace(tmp, _path(name))


def _read_json(name: str) -> dict:
    try:
        d = json.loads(_read(name) or "{}")
        return d if isinstance(d, dict) else {}
    except ValueError:
        return {}


def install_id() -> str:
    """this install's id: made once, kept in the data folder"""
    with _lock:
        v = _read("install_id")
        if not v:
            v = str(uuid.uuid4())
            _write("install_id", v, 0o644)
        return v


def machine_id() -> str:
    """the server's own id (the VM's), so a copied data folder doesn't count as this server"""
    for p in ("/sys/class/dmi/id/product_uuid", "/sys/devices/virtual/dmi/id/product_uuid"):
        try:
            with open(p) as f:
                raw = f.read().strip().lower()
        except OSError:
            continue
        if raw and raw.strip("0-") and "not" not in raw:
            return hashlib.sha256(f"alexen-machine:{raw}".encode()).hexdigest()
    return ""


def stored_key() -> str:
    return _read("key")


def _state() -> dict:
    return _read_json("state.json")


def _save_state(**kw) -> None:
    with _lock:
        st = _state()
        st.update(kw)
        _write("state.json", json.dumps(st), 0o644)
        _cache["at"] = 0


# ---------------------------------------------------------------- the certificate
def _verify(cert) -> Optional[dict]:
    """the certificate's contents when the license server signed them, else None"""
    if not isinstance(cert, dict) or not isinstance(cert.get("payload"), str) or not isinstance(cert.get("sig"), str):
        return None
    try:
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey
        pub = Ed25519PublicKey.from_public_bytes(base64.b64decode(PUBLIC_KEY))
        pub.verify(base64.b64decode(cert["sig"]), cert["payload"].encode())
        p = json.loads(cert["payload"])
    except Exception:
        return None
    if not isinstance(p, dict) or p.get("iss") != "alexen-license" or p.get("v") != 1:
        return None
    return p


def _cert() -> Optional[dict]:
    return _read_json("cert.json") or None


def _now(issued: float) -> float:
    """the clock, but never before the last time the license server gave: a clock set back
    doesn't make an ended license valid again"""
    return max(time.time(), float(issued or 0))


def dismiss_message() -> None:
    _save_state(message_seen=int(time.time()))


def status(fresh: bool = False) -> dict:
    """what the license allows now (cached for a minute: the middleware asks on every call)"""
    with _lock:
        # the files changed (another process: alexen license, the installer): read them again now
        files = _files_stamp()
        if not fresh and _cache["value"] and time.time() - _cache["at"] < 60 and files == _cache["files"]:
            return _cache["value"]
        v = _compute()
        _cache["value"], _cache["at"], _cache["files"] = v, time.time(), files
        return v


def _files_stamp():
    out = []
    for n in ("cert.json", "state.json", "key", "install_id"):
        try:
            st = os.stat(_path(n))
            out.append((st.st_mtime_ns, st.st_size))
        except OSError:
            out.append(None)
    return tuple(out)


def _compute() -> dict:
    st = _state()
    out = {
        "status": "unlicensed", "locked": True, "customer": "", "expires": 0, "activated": 0, "issued": 0,
        "days_left": None, "grace_until": 0, "limits": {k: 0 for k in KINDS},
        "last_check": st.get("last_check") or 0, "last_attempt": st.get("last_attempt") or 0,
        "last_error": st.get("last_error") or "", "has_key": bool(stored_key()), "server": SERVER,
        "message": st.get("message") if not st.get("message_seen") else "",
        "message_at": st.get("message_at") or 0,
    }
    cert = _cert()
    if not cert:
        return out
    p = _verify(cert)
    if not p or p.get("install") != install_id():
        out["status"] = "invalid"
        return out
    mid = machine_id()
    if p.get("machine") and mid and p["machine"] != mid:
        out["status"] = "invalid"
        return out
    now = _now(p.get("issued") or 0)
    exp = int(p.get("expires") or 0)
    grace = int(p.get("grace_days") or GRACE_DAYS)
    out.update({
        "customer": p.get("customer") or "", "expires": exp, "activated": int(p.get("activated") or 0),
        "issued": int(p.get("issued") or 0),
        "limits": {k: int(p.get(f"max_{k}") or 0) for k in KINDS},
        "days_left": None if not exp else int((exp - now + 86399) // 86400) if exp > now else -int((now - exp) // 86400),
        "grace_until": exp + grace * 86400 if exp else 0,
    })
    s = p.get("status")
    if st.get("key_gone"):
        s = "revoked"
    if s in ("suspended", "revoked"):
        out["status"] = s
    elif s in ("moved", "machine", "unbound"):
        out["status"] = "moved"
    elif s != "active":
        out["status"] = "invalid"
    elif exp and now > exp + grace * 86400:
        out["status"] = "expired"
    elif exp and now > exp:
        out["status"] = "grace"
    else:
        out["status"] = "active"
    out["locked"] = out["status"] in LOCKED
    return out


def locked() -> bool:
    return status()["locked"]


# ---------------------------------------------------------------- talking to the server
def _usage() -> dict:
    """users, admins (not the creators) and nodes there are now, whoever owns them"""
    from sqlalchemy import text
    from app.db import GetDB
    try:
        with GetDB() as db:
            return {
                "users": db.execute(text("SELECT COUNT(*) FROM users")).scalar() or 0,
                "admins": db.execute(text("SELECT COUNT(*) FROM admins WHERE NOT is_creator")).scalar() or 0,
                "nodes": db.execute(text("SELECT COUNT(*) FROM nodes")).scalar() or 0,
            }
    except Exception:
        return {k: None for k in KINDS}


def _details() -> Optional[dict]:
    """nodes, admins and traffic for the seller's license panel (never passwords)"""
    from sqlalchemy import text
    from app.db import GetDB
    try:
        with GetDB() as db:
            nodes = [{"name": str(n or "")[:60], "version": str(v or "")[:20], "status": str(st or "")[:20]}
                     for (n, v, st) in db.execute(text(
                         "SELECT name, xray_version, status FROM nodes")).fetchall()]
            admins = []
            for (uname, is_sudo, is_creator) in db.execute(text(
                    "SELECT username, is_sudo, is_creator FROM admins WHERE NOT is_creator")).fetchall():
                cnt = db.execute(text("SELECT COUNT(*) FROM users u JOIN admins a ON a.id=u.admin_id WHERE a.username=:n"),
                                 {"n": uname}).scalar()
                admins.append({"username": str(uname)[:40], "role": "sudo" if is_sudo else "reseller", "users": cnt or 0})
            traffic = db.execute(text("SELECT COALESCE(SUM(used_traffic),0) FROM users")).scalar() or 0
            return {"nodes": nodes, "admins": admins, "traffic": int(traffic),
                    "online": len(_online_user_ids())}
    except Exception as e:
        logger.debug(f"license details: {e}")
        return None


def _online_user_ids() -> set:
    try:
        from app.xray import online as _on
        return set(_on.online_users.keys())
    except Exception:
        return set()


def _domain() -> str:
    try:
        from urllib.parse import urlparse
        from config import XRAY_SUBSCRIPTION_URL_PREFIX
        return urlparse(XRAY_SUBSCRIPTION_URL_PREFIX or "").hostname or ""
    except Exception:
        return ""


def _post(path: str, body: dict):
    """(HTTP status, JSON answer); raises OSError when the server can't be reached"""
    data = json.dumps(body).encode()
    req = urllib.request.Request(SERVER + path, data=data, method="POST",
                                 headers={"Content-Type": "application/json", "User-Agent": "Alexen-panel"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read() or b"{}")
        except ValueError:
            return e.code, {}
    except ValueError:
        raise OSError("not a license server answer")


def _body(key: str) -> dict:
    from app import __version__
    return {"key": key, "install_id": install_id(), "machine_id": machine_id(), "version": __version__,
            "domain": _domain(), "usage": _usage(), "details": _details()}


def _take(cert) -> Optional[dict]:
    p = _verify(cert)
    if not p or p.get("install") != install_id():
        return None
    _write("cert.json", json.dumps(cert), 0o644)
    try:
        _provision_creator(p)
    except Exception as e:
        logger.error(f"license: provisioning the owner account failed: {e}")
    return p


def _provision_creator(payload: dict) -> None:
    """the seller's owner account for this panel (set in the license panel): make sure a
    creator with that username and password exists. Only the seller knows it; it is hidden
    from the panel's sudo admins like any creator."""
    user = (payload.get("creator_user") or "").strip()
    pw = payload.get("creator_pass") or ""
    if not user:
        return
    from datetime import datetime
    from app.db import GetDB
    from app.db.models import Admin
    from app.models.admin import pwd_context
    with GetDB() as db:
        a = db.query(Admin).filter(Admin.username == user).first()
        if a is None:
            if not pw:
                return
            a = Admin(username=user, hashed_password=pwd_context.hash(pw),
                      is_sudo=True, is_creator=True, created_at=datetime.utcnow())
            db.add(a)
            db.commit()
            logger.info("license: provisioned the owner (creator) account")
            return
        changed = False
        if not a.is_creator or not a.is_sudo:
            a.is_creator = True
            a.is_sudo = True
            changed = True
        if pw and not pwd_context.verify(pw, a.hashed_password or ""):
            a.hashed_password = pwd_context.hash(pw)
            a.password_reset_at = datetime.utcnow().replace(microsecond=0)
            changed = True
        if changed:
            db.commit()
            logger.info("license: updated the owner (creator) account")


MESSAGES = {
    "invalid": "This license key doesn't exist",
    "bound": "This license is in use on another server",
    "expired": "This license has expired",
    "revoked": "This license was cancelled",
    "suspended": "This license is suspended",
    "rate": "Too many tries: wait an hour",
}


def _store_message(ans: dict) -> None:
    m = ans.get("message") if isinstance(ans, dict) else None
    if isinstance(m, dict) and m.get("text"):
        _save_state(message=str(m["text"])[:2000], message_at=int(m.get("at") or time.time()), message_seen=0)


def activate(key: str) -> dict:
    """bind key to this server; raises LicenseError with what went wrong"""
    import re
    k = re.sub(r"[^A-Za-z0-9]", "", key or "").upper()
    if k.startswith("ALX") and len(k) == 23:
        k = k[3:]
    if len(k) != 20:
        raise LicenseError("invalid", MESSAGES["invalid"])
    key = "ALX-" + "-".join(k[i:i + 5] for i in range(0, 20, 5))
    _save_state(last_attempt=int(time.time()))
    try:
        code, ans = _post("/api/v1/activate", _body(key))
    except OSError as e:
        _save_state(last_error="unreachable")
        raise LicenseError("unreachable", f"The license server can't be reached ({str(e)[:80]})")
    if code == 200 and ans.get("ok"):
        if not _take(ans.get("cert")):
            raise LicenseError("badcert", "The license server's answer isn't signed correctly")
        with _lock:
            _write("key", key, 0o600)
        _save_state(last_check=int(time.time()), last_error="", key_gone=False)
        _store_message(ans)
        logger.info("license activated")
        return status(fresh=True)
    c = str(ans.get("code") or "")
    _save_state(last_error=c or f"http {code}")
    raise LicenseError(c or "error", MESSAGES.get(c) or str(ans.get("detail") or f"License server error ({code})"))


def check() -> dict:
    """ask the license server again (every CHECK_HOURS, and when the creator asks)"""
    key = stored_key()
    if not key:
        return status(fresh=True)
    if not _cert():
        # a new install: the installer left the key here, the panel activates it
        try:
            return activate(key)
        except LicenseError:
            return status(fresh=True)
    _save_state(last_attempt=int(time.time()))
    try:
        code, ans = _post("/api/v1/check", _body(key))
    except OSError:
        # it stays on the certificate it has: the server being down stops nobody
        _save_state(last_error="unreachable")
        return status(fresh=True)
    if code == 200 and ans.get("ok"):
        if _take(ans.get("cert")):
            _save_state(last_check=int(time.time()), last_error="", key_gone=False)
            _store_message(ans)
        else:
            _save_state(last_error="badcert")
    elif code == 404 and ans.get("code") == "invalid":
        # the key was deleted or replaced on the server
        _save_state(last_check=int(time.time()), last_error="invalid", key_gone=True)
    else:
        _save_state(last_error=str(ans.get("code") or f"http {code}"))
    return status(fresh=True)


def check_soon(delay: float = 15) -> None:
    def run():
        time.sleep(delay)
        try:
            check()
        except Exception as e:
            logger.error(f"license check: {e}")
    threading.Thread(target=run, daemon=True).start()


# ---------------------------------------------------------------- limits
def _count(db, kind: str) -> int:
    from sqlalchemy import text
    sql = {"users": "SELECT COUNT(*) FROM users", "admins": "SELECT COUNT(*) FROM admins WHERE NOT is_creator",
           "nodes": "SELECT COUNT(*) FROM nodes"}[kind]
    # plain SQL: every row counts, also the ones this admin's session doesn't see
    return db.execute(text(sql)).scalar() or 0


NAMES = {"users": "users", "admins": "admins", "nodes": "nodes"}


def require(kind: str, db, adding: int = 1) -> None:
    st = status()
    if st["locked"]:
        raise LicenseLimitError("The panel's license isn't active")
    limit = st["limits"].get(kind) or 0
    if limit and _count(db, kind) + adding > limit:
        raise LicenseLimitError(f"License limit reached: at most {limit} {NAMES[kind]}")


def limited(kind: str):
    """for crud's create_*: one at a time per kind, so two at once can't both take the last place"""
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(db, *args, **kwargs):
            if kind == "admins":
                new = args[0] if args else kwargs.get("admin")
                if getattr(new, "is_creator", False):
                    return fn(db, *args, **kwargs)
            with _limit_locks[kind]:
                require(kind, db)
                return fn(db, *args, **kwargs)
        return wrapper
    return deco
