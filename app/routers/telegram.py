"""The panel's Telegram bot settings (app/tgbot.py): the creator's only, the backups it sends
hold the whole panel. The token never comes back whole: only its masked form."""
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app import tgbot
from app.db import Session, get_db
from app.models.admin import Admin
from app.utils import responses

router = APIRouter(tags=["Telegram"], prefix="/api/telegram", responses={401: responses._401, 403: responses._403})


class BotView(BaseModel):
    enabled: bool
    has_token: bool
    token_masked: str
    admin_ids: List[int]
    language: str
    proxy: str
    backup: tgbot.BackupSchedule
    intervals: List[int]
    last_backup_at: Optional[float]
    last_backup_error: str
    next_backup_at: Optional[float]
    running: bool
    username: str
    error: str


class BotUpdate(BaseModel):
    enabled: bool = False
    token: Optional[str] = None          # None / "": keep the stored one
    clear_token: bool = False
    admin_ids: List[int] = Field(default_factory=list)
    language: str = "tr"
    proxy: str = ""
    backup: tgbot.BackupSchedule = Field(default_factory=tgbot.BackupSchedule)


def _view(s: tgbot.BotSettings) -> BotView:
    st = tgbot.status() if s.enabled else {"running": False, "username": "", "error": ""}
    return BotView(enabled=s.enabled, has_token=bool(s.token), token_masked=tgbot.mask(s.token),
                   admin_ids=s.admin_ids, language=s.language, proxy=s.proxy, backup=s.backup,
                   intervals=list(tgbot.INTERVALS), last_backup_at=s.last_backup_at,
                   last_backup_error=s.last_backup_error, next_backup_at=tgbot.next_backup_at(s), **st)


@router.get("", response_model=BotView)
def read_bot(db: Session = Depends(get_db), _: Admin = Depends(Admin.check_creator_admin)):
    return _view(tgbot.load(db))


@router.put("", response_model=BotView)
def update_bot(body: BotUpdate, db: Session = Depends(get_db), _: Admin = Depends(Admin.check_creator_admin)):
    """save and (re)start the bot; a new token is checked with Telegram first"""
    old = tgbot.load(db)
    token = "" if body.clear_token else ((body.token or "").strip() or old.token)
    if token and not tgbot.TOKEN_RE.match(token):
        raise HTTPException(400, "This doesn't look like a bot token (123456789:AA...)")
    if body.enabled and not token:
        raise HTTPException(400, "Enter the bot token first")
    if body.enabled and not body.admin_ids:
        raise HTTPException(400, "Add at least one admin Telegram ID")
    try:
        new = tgbot.BotSettings(enabled=body.enabled, token=token, admin_ids=body.admin_ids, language=body.language,
                                proxy=body.proxy, backup=body.backup,
                                last_backup_at=old.last_backup_at, last_backup_error=old.last_backup_error)
    except ValueError as e:
        msg = e.errors()[0].get("msg", str(e)) if hasattr(e, "errors") else str(e)
        raise HTTPException(400, msg.replace("Value error, ", ""))
    if token and (token != old.token or new.proxy != old.proxy):
        try:
            tgbot.check_token(token, new.proxy)
        except tgbot.TelegramError as e:
            if e.code == 401 or e.code == 404:
                raise HTTPException(400, "Telegram rejected this token")
            if e.code:   # another answer from Telegram: say it
                raise HTTPException(400, f"Telegram: {e}")
            # no network to Telegram (yet): saved anyway, the page shows the error
    tgbot.save(db, new)
    tgbot.apply_soon()
    return _view(new)


@router.post("/test")
def test_bot(db: Session = Depends(get_db), _: Admin = Depends(Admin.check_creator_admin)) -> Dict[str, str]:
    """a message to every admin id: id -> "" when it went, else why not"""
    s = tgbot.load(db)
    if not s.token:
        raise HTTPException(400, "Enter the bot token first")
    if not s.admin_ids:
        raise HTTPException(400, "Add at least one admin Telegram ID")
    return tgbot.send_test(s)


@router.post("/backup")
def send_backup_now(db: Session = Depends(get_db), _: Admin = Depends(Admin.check_creator_admin)) -> Dict[str, str]:
    """a backup to every admin now"""
    s = tgbot.load(db)
    if not s.token:
        raise HTTPException(400, "Enter the bot token first")
    if not s.admin_ids:
        raise HTTPException(400, "Add at least one admin Telegram ID")
    import time
    sent: list = []
    err = tgbot.send_backup(s, sent=sent)
    if sent:
        tgbot._record_backup(time.time(), err)
    if err:
        raise HTTPException(502, err)
    return {"detail": "sent"}
