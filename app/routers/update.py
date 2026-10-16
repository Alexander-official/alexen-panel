"""Panel updates from the panel.

The panel can't rebuild and restart itself from inside its container, so the server's
updater does it (scripts/alexen.sh: a systemd unit watching <data>/update/request).
Here the creator only asks for it and reads how it goes: the updater writes
<data>/update/status.json (current / latest version, the latest changelog, the step it is at)
and <data>/update/update.log."""
import json
import os
import time
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app import __version__
from app.backup import data_dir
from app.models.admin import Admin
from app.utils import responses

router = APIRouter(tags=["Update"], prefix="/api/update", responses={401: responses._401, 403: responses._403})

# the updater counts as not there when it hasn't answered a request for this long
REQUEST_TIMEOUT = 120
BUSY = ("checking", "updating")


def _dir() -> str:
    return os.path.join(data_dir(), "update")


def _read_json(name: str):
    try:
        with open(os.path.join(_dir(), name)) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def _changelog() -> list:
    try:
        with open(os.path.join(os.path.dirname(os.path.dirname(__file__)), "changelog.json")) as f:
            return json.load(f)
    except (OSError, ValueError):
        return []


def _key(v: str):
    out = []
    for part in (v or "0").lstrip("v").split("."):
        digits = "".join(ch for ch in part if ch.isdigit())
        out.append(int(digits or 0))
    return out


class Release(BaseModel):
    version: str
    date: str = ""
    tr: List[str] = []
    en: List[str] = []


class UpdateState(BaseModel):
    current: str
    installed: bool                    # the server's updater is set up
    state: str = "idle"                # idle | checking | updating | done | failed
    step: str = ""                     # backup | download | build | restart | verify | rollback
    latest: Optional[str] = None
    available: bool = False
    checked_at: Optional[int] = None
    started_at: Optional[int] = None
    finished_at: Optional[int] = None
    error: str = ""
    pending: Optional[str] = None      # a request the updater hasn't picked up yet
    log: List[str] = []
    news: List[Release] = []           # the releases after the current one
    history: List[Release] = []        # this version and the ones before


def _state() -> UpdateState:
    st = _read_json("status.json") or {}
    req = _read_json("request")
    pending = None
    if isinstance(req, dict) and req.get("action"):
        pending = req["action"]
        if time.time() - float(req.get("at") or 0) > REQUEST_TIMEOUT:
            pending = "stale"
    latest = st.get("latest")
    remote_log = [r for r in (st.get("changelog") or []) if isinstance(r, dict) and r.get("version")]
    news = [Release(**r) for r in remote_log if _key(r["version"]) > _key(__version__)]
    history = [Release(**r) for r in _changelog() if _key(r.get("version", "0")) <= _key(__version__)]
    log = []
    try:
        with open(os.path.join(_dir(), "update.log"), errors="replace") as f:
            log = [line.rstrip("\n") for line in f.readlines()[-40:]]
    except OSError:
        pass
    return UpdateState(
        current=__version__,
        installed=bool(st.get("updater")),
        state=st.get("state") or "idle",
        step=st.get("step") or "",
        latest=latest,
        available=bool(latest) and _key(latest) > _key(__version__),
        checked_at=st.get("checked_at"),
        started_at=st.get("started_at"),
        finished_at=st.get("finished_at"),
        error=st.get("error") or "",
        pending=pending,
        log=log,
        news=news,
        history=history,
    )


def _request(action: str) -> None:
    os.makedirs(_dir(), exist_ok=True)
    path = os.path.join(_dir(), "request")
    with open(path + ".tmp", "w") as f:
        json.dump({"action": action, "at": int(time.time())}, f)
    os.replace(path + ".tmp", path)


@router.get("", response_model=UpdateState)
def update_state(_: Admin = Depends(Admin.check_sudo_admin)):
    """the panel version, the latest one, and how an update goes"""
    return _state()


@router.post("/check", response_model=UpdateState)
def check_for_update(_: Admin = Depends(Admin.check_sudo_admin)):
    """ask the updater to look for a new version"""
    st = _state()
    if not st.installed:
        raise HTTPException(409, "The updater isn't set up on this server: run 'alexen update' once")
    if st.state in BUSY:
        return st
    _request("check")
    return _state()


@router.post("", response_model=UpdateState)
def start_update(_: Admin = Depends(Admin.check_sudo_admin)):
    """update the panel to the latest version (backup first, the old version back if it fails)"""
    st = _state()
    if not st.installed:
        raise HTTPException(409, "The updater isn't set up on this server: run 'alexen update' once")
    if st.state in BUSY:
        raise HTTPException(409, "An update is running already")
    _request("update")
    return _state()
