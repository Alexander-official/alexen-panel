"""The panel's Telegram bot, set up from the panel (Settings > Telegram), not from .env.

It answers the admins it is given (their Telegram user ids): the panel's state, who is
online, a user's details, a backup on request; and it sends a backup to them on a schedule.
Anyone else who writes to it only learns their own id (to be added in the panel).

It talks to the Bot API over plain HTTPS (long polling in one thread), so a new token or
proxy takes effect at once: apply() stops the old loop and starts a new one. A token used
by another program at the same time (409), a wrong token (401) or no network is shown on
the panel page instead of failing silently.

The old Marzban bot (TELEGRAM_API_TOKEN in .env) still works when this one is off; with
both on the same token Telegram would give the updates to only one of them, so that one
doesn't start then (app/telegram)."""
import html
import io
import re
import threading
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional

import requests
from pydantic import BaseModel, Field, field_validator

from app import logger

KEY = "telegram_bot"
import os  # noqa: E402
API = os.getenv("ALEXEN_TELEGRAM_API", "https://api.telegram.org").rstrip("/")   # another one for tests
TOKEN_RE = re.compile(r"^\d{5,15}:[A-Za-z0-9_-]{30,64}$")
MAX_DOCUMENT = 50 * 1024 * 1024          # what a bot may send
INTERVALS = (1, 2, 3, 4, 6, 8, 12, 24, 48, 72, 168)


class BackupSchedule(BaseModel):
    enabled: bool = False
    every_hours: int = Field(24, ge=1, le=168)


class BotSettings(BaseModel):
    enabled: bool = False
    token: str = ""
    admin_ids: List[int] = Field(default_factory=list)
    language: str = "tr"
    proxy: str = ""
    backup: BackupSchedule = Field(default_factory=BackupSchedule)
    # written by the bot itself
    last_backup_at: Optional[float] = None
    last_backup_error: str = ""

    @field_validator("admin_ids")
    @classmethod
    def _ids(cls, v):
        out = []
        for i in v:
            if not isinstance(i, int) or i <= 0 or i > 10 ** 15:
                raise ValueError("A Telegram id is a positive number")
            if i not in out:
                out.append(i)
        if len(out) > 20:
            raise ValueError("20 admins at most")
        return out

    @field_validator("language")
    @classmethod
    def _lang(cls, v):
        return v if v in TEXTS else "tr"

    @field_validator("proxy")
    @classmethod
    def _proxy(cls, v):
        v = (v or "").strip()
        if v and not re.match(r"^(https?|socks5h?)://[^\s]+$", v):
            raise ValueError("The proxy is like socks5://host:port or http://host:port")
        return v


# ---------------- texts ----------------
TEXTS: Dict[str, Dict[str, str]] = {
    "tr": {
        "menu": "<b>Alexen</b> · v{version}\nNe yapalım?",
        "status": "📊 Durum", "online": "👥 Online", "backup": "💾 Yedek al", "help": "❔ Yardım",
        "help_text": "/status — panelin durumu\n/online — şu an bağlı olanlar\n/user <i>ad</i> — bir kullanıcı\n/backup — yedeği şimdi gönder\n/id — Telegram ID'n",
        "not_admin": "Bu bot sadece panelin yöneticilerine cevap veriyor.\nTelegram ID'n: <code>{id}</code>\nPanelde Ayarlar → Telegram'a bu ID'yi ekle.",
        "your_id": "Telegram ID'n: <code>{id}</code>",
        "status_text": "<b>Alexen</b> v{version}\n\n👥 Kullanıcı: <b>{total}</b>\n  ✅ aktif {active} · ⏸ kapalı {disabled}\n  ⌛ süresi dolmuş {expired} · 📦 limiti dolmuş {limited} · 🕓 beklemede {on_hold}\n🟢 Şu an online: <b>{online}</b> kullanıcı, {ips} IP\n\n🖥 CPU %{cpu} · RAM %{mem} · Disk %{disk}\n⏱ Çalışma süresi: {uptime}",
        "online_none": "Şu an kimse bağlı değil.",
        "online_title": "🟢 <b>Online: {n} kullanıcı</b>",
        "online_more": "… ve {n} kişi daha",
        "user_usage": "Kullanım: /user <i>kullanıcı adı</i>",
        "user_none": "Böyle bir kullanıcı yok: {name}",
        "user_text": "👤 <b>{name}</b>\nDurum: {status}\nTrafik: {used} / {limit}\nBitiş: {expire}\nŞu an: {ips} IP\nSahibi: {owner}",
        "unlimited": "sınırsız", "never": "yok",
        "backup_wait": "💾 Yedek hazırlanıyor…",
        "backup_caption": "💾 Alexen yedeği · v{version}\n{date}",
        "backup_big": "Yedek {size} MB: Telegram botları en fazla 50 MB gönderebiliyor. Panelden indirin (Ayarlar → Yedekleme).",
        "backup_fail": "Yedek alınamadı: {error}",
        "test": "✅ Alexen paneline bağlandı. Bu sohbete bildirimler ve yedekler gelecek.",
        "unknown": "Bilmediğim bir komut. /help",
    },
    "en": {
        "menu": "<b>Alexen</b> · v{version}\nWhat shall we do?",
        "status": "📊 Status", "online": "👥 Online", "backup": "💾 Backup", "help": "❔ Help",
        "help_text": "/status — the panel's state\n/online — who is connected now\n/user <i>name</i> — one user\n/backup — send a backup now\n/id — your Telegram id",
        "not_admin": "This bot answers the panel's admins only.\nYour Telegram id: <code>{id}</code>\nAdd it in the panel: Settings → Telegram.",
        "your_id": "Your Telegram id: <code>{id}</code>",
        "status_text": "<b>Alexen</b> v{version}\n\n👥 Users: <b>{total}</b>\n  ✅ active {active} · ⏸ disabled {disabled}\n  ⌛ expired {expired} · 📦 limited {limited} · 🕓 on hold {on_hold}\n🟢 Online now: <b>{online}</b> users, {ips} IPs\n\n🖥 CPU {cpu}% · RAM {mem}% · Disk {disk}%\n⏱ Uptime: {uptime}",
        "online_none": "Nobody is connected right now.",
        "online_title": "🟢 <b>Online: {n} users</b>",
        "online_more": "… and {n} more",
        "user_usage": "Usage: /user <i>username</i>",
        "user_none": "No such user: {name}",
        "user_text": "👤 <b>{name}</b>\nStatus: {status}\nTraffic: {used} / {limit}\nExpires: {expire}\nNow: {ips} IPs\nOwner: {owner}",
        "unlimited": "unlimited", "never": "never",
        "backup_wait": "💾 Making the backup…",
        "backup_caption": "💾 Alexen backup · v{version}\n{date}",
        "backup_big": "The backup is {size} MB: bots can send 50 MB at most. Download it from the panel (Settings → Backup).",
        "backup_fail": "The backup failed: {error}",
        "test": "✅ Connected to the Alexen panel. Notifications and backups come to this chat.",
        "unknown": "I don't know that command. /help",
    },
    "ru": {
        "menu": "<b>Alexen</b> · v{version}\nЧто делаем?",
        "status": "📊 Статус", "online": "👥 Онлайн", "backup": "💾 Бэкап", "help": "❔ Помощь",
        "help_text": "/status — состояние панели\n/online — кто подключён сейчас\n/user <i>имя</i> — пользователь\n/backup — отправить бэкап сейчас\n/id — ваш Telegram ID",
        "not_admin": "Этот бот отвечает только администраторам панели.\nВаш Telegram ID: <code>{id}</code>\nДобавьте его в панели: Настройки → Telegram.",
        "your_id": "Ваш Telegram ID: <code>{id}</code>",
        "status_text": "<b>Alexen</b> v{version}\n\n👥 Пользователи: <b>{total}</b>\n  ✅ активны {active} · ⏸ отключены {disabled}\n  ⌛ истекли {expired} · 📦 лимит {limited} · 🕓 ожидание {on_hold}\n🟢 Сейчас онлайн: <b>{online}</b>, IP: {ips}\n\n🖥 CPU {cpu}% · RAM {mem}% · Диск {disk}%\n⏱ Работает: {uptime}",
        "online_none": "Сейчас никто не подключён.",
        "online_title": "🟢 <b>Онлайн: {n}</b>",
        "online_more": "… и ещё {n}",
        "user_usage": "Использование: /user <i>имя</i>",
        "user_none": "Нет такого пользователя: {name}",
        "user_text": "👤 <b>{name}</b>\nСтатус: {status}\nТрафик: {used} / {limit}\nИстекает: {expire}\nСейчас: {ips} IP\nВладелец: {owner}",
        "unlimited": "без лимита", "never": "никогда",
        "backup_wait": "💾 Готовлю бэкап…",
        "backup_caption": "💾 Бэкап Alexen · v{version}\n{date}",
        "backup_big": "Бэкап {size} МБ: боты могут отправлять не больше 50 МБ. Скачайте его в панели (Настройки → Бэкап).",
        "backup_fail": "Бэкап не удался: {error}",
        "test": "✅ Подключено к панели Alexen. Уведомления и бэкапы будут приходить сюда.",
        "unknown": "Не знаю такой команды. /help",
    },
}


# ---------------- settings ----------------
_settings_lock = threading.Lock()


def load(db=None) -> BotSettings:
    from app.db import GetDB, crud
    if db is None:
        with GetDB() as s:
            return load(s)
    try:
        return BotSettings(**(crud.get_setting(db, KEY) or {}))
    except Exception:
        return BotSettings()


def save(db, s: BotSettings) -> BotSettings:
    from app.db import crud
    with _settings_lock:
        crud.set_setting(db, KEY, s.model_dump())
    return s


def _record_backup(at: Optional[float], error: str) -> None:
    """the bot's own fields only, on top of what is stored now (the page may have saved meanwhile)"""
    from app.db import GetDB
    with GetDB() as db:
        s = load(db)
        if at is not None:
            s.last_backup_at = at
        s.last_backup_error = error
        save(db, s)


# ---------------- the Bot API ----------------
class TelegramError(Exception):
    def __init__(self, code: int, text: str):
        super().__init__(text)
        self.code = code


def _call(token: str, method: str, proxy: str = "", wait: float = 20, files=None, params: Optional[dict] = None):
    """one Bot API call; wait is the HTTP timeout (params may have Telegram's own "timeout")"""
    proxies = {"http": proxy, "https": proxy} if proxy else None
    params = params or {}
    try:
        if files:
            r = requests.post(f"{API}/bot{token}/{method}", data=params, files=files, timeout=wait, proxies=proxies)
        else:
            r = requests.post(f"{API}/bot{token}/{method}", json=params, timeout=wait, proxies=proxies)
    except requests.RequestException as e:
        # never the URL in the message: it holds the token
        raise TelegramError(0, f"can't reach Telegram ({type(e).__name__})")
    try:
        data = r.json()
    except ValueError:
        raise TelegramError(r.status_code, f"Telegram answered {r.status_code}")
    if not data.get("ok"):
        raise TelegramError(int(data.get("error_code") or r.status_code), str(data.get("description") or "error"))
    return data.get("result")


def check_token(token: str, proxy: str = "") -> dict:
    """the bot behind a token (getMe)"""
    return _call(token, "getMe", proxy, wait=15)


# ---------------- the running bot ----------------
class _Runner:
    def __init__(self):
        self.lock = threading.Lock()
        self.thread: Optional[threading.Thread] = None
        self.stop = threading.Event()
        self.settings: Optional[BotSettings] = None
        self.username = ""
        self.error = ""
        self.running = False
        # the next update to ask for: kept across restarts, so none is answered twice
        self.offset = 0


runner = _Runner()
POLL = 20   # seconds Telegram holds a getUpdates open


def status() -> dict:
    return {"running": runner.running, "username": runner.username, "error": runner.error}


def apply(s: Optional[BotSettings] = None) -> None:
    """(re)start the bot with the stored settings, or stop it; waits for the old loop to end
    (at most one long poll), so two never poll the same token"""
    s = s or load()
    with runner.lock:
        if runner.thread and runner.thread.is_alive():
            runner.stop.set()
            runner.thread.join(timeout=POLL + 15)
        runner.stop = threading.Event()
        runner.settings = s
        runner.running = False
        runner.username = ""
        runner.error = ""
        if not (s.enabled and s.token):
            runner.thread = None
            return
        runner.thread = threading.Thread(target=_loop, args=(s, runner.stop), name="alexen-telegram", daemon=True)
        runner.thread.start()


def apply_soon() -> None:
    """apply() without making the caller (a page saving the settings) wait for the old loop"""
    threading.Thread(target=apply, name="alexen-telegram-apply", daemon=True).start()


def _loop(s: BotSettings, stop: threading.Event) -> None:
    backoff = 2
    try:
        me = check_token(s.token, s.proxy)
        runner.username = me.get("username", "")
        _call(s.token, "setMyCommands", s.proxy, params={"commands": [
            {"command": "start", "description": "Menu"},
            {"command": "status", "description": "Status"},
            {"command": "online", "description": "Online"},
            {"command": "user", "description": "User"},
            {"command": "backup", "description": "Backup"},
            {"command": "id", "description": "Telegram ID"},
        ]})
    except TelegramError as e:
        if e.code == 401:
            runner.error = "Telegram rejected the token"
            return
        runner.error = str(e)
    while not stop.is_set():
        try:
            updates = _call(s.token, "getUpdates", s.proxy, wait=POLL + 10, params={
                "offset": runner.offset, "timeout": POLL, "allowed_updates": ["message", "callback_query"]}) or []
            runner.running, runner.error, backoff = True, "", 2
            for u in updates:
                if stop.is_set():
                    break
                runner.offset = max(runner.offset, int(u.get("update_id", 0)) + 1)
                try:
                    _handle(s, u)
                except Exception as e:  # one bad update never stops the bot
                    logger.error(f"telegram bot: an update failed: {type(e).__name__}: {e}")
        except TelegramError as e:
            runner.running = False
            if e.code == 401:
                runner.error = "Telegram rejected the token"
                return
            if e.code == 409:
                runner.error = "another program uses this bot token at the same time"
            else:
                runner.error = str(e)
            stop.wait(backoff)
            backoff = min(backoff * 2, 60)
        except Exception as e:
            runner.running = False
            runner.error = f"{type(e).__name__}"
            logger.error(f"telegram bot: {type(e).__name__}: {e}")
            stop.wait(backoff)
            backoff = min(backoff * 2, 60)
    runner.running = False


# ---------------- answers ----------------
def _t(s: BotSettings, key: str, **kw) -> str:
    text = TEXTS.get(s.language, TEXTS["tr"]).get(key) or TEXTS["en"][key]
    return text.format(**kw) if kw else text


def _send(s: BotSettings, chat_id: int, text: str, keyboard=None) -> None:
    params = {"chat_id": chat_id, "text": text, "parse_mode": "HTML", "disable_web_page_preview": True}
    if keyboard:
        params["reply_markup"] = {"inline_keyboard": keyboard}
    _call(s.token, "sendMessage", s.proxy, params=params)


def _menu(s: BotSettings):
    return [[{"text": _t(s, "status"), "callback_data": "status"}, {"text": _t(s, "online"), "callback_data": "online"}],
            [{"text": _t(s, "backup"), "callback_data": "backup"}, {"text": _t(s, "help"), "callback_data": "help"}]]


def _handle(s: BotSettings, u: dict) -> None:
    if "callback_query" in u:
        q = u["callback_query"]
        uid = int(q.get("from", {}).get("id", 0))
        chat = int((q.get("message") or {}).get("chat", {}).get("id", uid))
        try:
            _call(s.token, "answerCallbackQuery", s.proxy, params={"callback_query_id": q.get("id")})
        except TelegramError:
            pass
        if uid not in s.admin_ids:
            return _send(s, chat, _t(s, "not_admin", id=uid))
        return _command(s, chat, (q.get("data") or "").split(":", 1)[0], "")
    m = u.get("message") or {}
    uid = int(m.get("from", {}).get("id", 0))
    chat = int(m.get("chat", {}).get("id", uid))
    text = (m.get("text") or "").strip()
    if not text or not uid:
        return
    cmd, _, arg = text.partition(" ")
    cmd = cmd.split("@", 1)[0].lstrip("/").lower()
    if cmd == "id":
        return _send(s, chat, _t(s, "your_id", id=uid))
    if uid not in s.admin_ids:
        return _send(s, chat, _t(s, "not_admin", id=uid))
    _command(s, chat, cmd, arg.strip())


def _command(s: BotSettings, chat: int, cmd: str, arg: str) -> None:
    from app import __version__
    if cmd in ("start", "menu"):
        return _send(s, chat, _t(s, "menu", version=__version__), _menu(s))
    if cmd == "help":
        return _send(s, chat, _t(s, "help_text"))
    if cmd == "status":
        return _send(s, chat, _status_text(s), _menu(s))
    if cmd == "online":
        return _send(s, chat, _online_text(s))
    if cmd == "user":
        return _send(s, chat, _user_text(s, arg) if arg else _t(s, "user_usage"))
    if cmd == "backup":
        _send(s, chat, _t(s, "backup_wait"))
        err = send_backup(s, [chat])
        if err:
            _send(s, chat, err)
        return
    _send(s, chat, _t(s, "unknown"))


def _uptime(seconds: float) -> str:
    seconds = int(seconds)
    d, h, m = seconds // 86400, seconds % 86400 // 3600, seconds % 3600 // 60
    return f"{d}d {h}h {m}m" if d else f"{h}h {m}m"


def _size(n: Optional[int]) -> str:
    n = float(n or 0)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if n < 1024 or unit == "TB":
            return f"{n:.1f} {unit}" if unit != "B" else f"{int(n)} B"
        n /= 1024


def _status_text(s: BotSettings) -> str:
    import psutil
    from app import __version__
    from app.db import GetDB, crud
    from app.models.user import UserStatus
    from app.xray import online
    with GetDB() as db:
        counts = {st: crud.get_users_count(db, status=st) for st in UserStatus}
        total = crud.get_users_count(db)
    users = online.online_users
    return _t(s, "status_text", version=__version__, total=total,
              active=counts.get(UserStatus.active, 0), disabled=counts.get(UserStatus.disabled, 0),
              expired=counts.get(UserStatus.expired, 0), limited=counts.get(UserStatus.limited, 0),
              on_hold=counts.get(UserStatus.on_hold, 0), online=len(users),
              ips=sum(len(v) for v in users.values()),
              cpu=round(psutil.cpu_percent()), mem=round(psutil.virtual_memory().percent),
              disk=round(psutil.disk_usage("/").percent), uptime=_uptime(time.time() - psutil.boot_time()))


def _online_text(s: BotSettings) -> str:
    from app.db import GetDB
    from app.db.models import User
    from app.xray import online
    users = online.online_users
    if not users:
        return _t(s, "online_none")
    with GetDB() as db:
        names = dict(db.query(User.id, User.username).filter(User.id.in_(list(users))).all())
    rows = sorted(((names.get(uid, f"#{uid}"), len(ips)) for uid, ips in users.items()), key=lambda r: -r[1])
    lines = [_t(s, "online_title", n=len(rows))]
    lines += [f"• <code>{html.escape(n)}</code> — {c} IP" for n, c in rows[:40]]
    if len(rows) > 40:
        lines.append(_t(s, "online_more", n=len(rows) - 40))
    return "\n".join(lines)


def _user_text(s: BotSettings, name: str) -> str:
    from app.db import GetDB, crud
    from app.xray import online
    with GetDB() as db:
        u = crud.get_user(db, name)
        if not u:
            return _t(s, "user_none", name=html.escape(name[:64]))
        expire = datetime.fromtimestamp(u.expire, timezone.utc).strftime("%Y-%m-%d %H:%M UTC") if u.expire else _t(s, "never")
        return _t(s, "user_text", name=html.escape(u.username), status=getattr(u.status, "value", u.status),
                  used=_size(u.used_traffic), limit=_size(u.data_limit) if u.data_limit else _t(s, "unlimited"),
                  expire=expire, ips=len(online.online_users.get(u.id, {})),
                  owner=html.escape(u.admin.username) if u.admin else "—")


# ---------------- backups ----------------
_backup_lock = threading.Lock()


def send_backup(s: BotSettings, chats: Optional[List[int]] = None, sent: Optional[list] = None) -> str:
    """a backup to the given chats (all admins by default); "" when it went to all, else why not
    (sent, when given, gets the chats it reached)"""
    from app import __version__, backup
    chats = chats or s.admin_ids
    if not (s.token and chats):
        return "no token or admins"
    with _backup_lock:
        try:
            data = backup.create()
        except Exception as e:
            return _t(s, "backup_fail", error=html.escape(str(e))[:300])
        if len(data) > MAX_DOCUMENT:
            msg = _t(s, "backup_big", size=round(len(data) / 1048576, 1))
            for c in chats:
                try:
                    _send(s, c, msg)
                except TelegramError:
                    pass
            return msg
        name = backup.file_name()
        caption = _t(s, "backup_caption", version=__version__,
                     date=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))
        failed = []
        for c in chats:
            try:
                _call(s.token, "sendDocument", s.proxy, wait=180, params={"chat_id": c, "caption": caption},
                      files={"document": (name, io.BytesIO(data), "application/zip")})
                if sent is not None:
                    sent.append(c)
            except TelegramError as e:
                failed.append(f"{c}: {e}")
        return "; ".join(failed)[:500]


def backup_job() -> None:
    """scheduler, every minute: the scheduled backup when it is due"""
    s = load()
    if not (s.enabled and s.token and s.admin_ids and s.backup.enabled):
        return
    now = time.time()
    if s.last_backup_at and now - s.last_backup_at < s.backup.every_hours * 3600 - 30:
        return
    sent: list = []
    err = send_backup(s, sent=sent)
    if err:
        logger.warning(f"telegram backup: {err}")
    if sent:
        # it reached someone: the next one at the usual time (the error still shows for the others)
        _record_backup(now, err)
    else:
        # it reached nobody: tried again in 10 minutes, not only at the next full interval
        _record_backup(now - s.backup.every_hours * 3600 + 600, err)


def next_backup_at(s: BotSettings) -> Optional[float]:
    if not (s.enabled and s.backup.enabled):
        return None
    if not s.last_backup_at:
        return time.time()
    return s.last_backup_at + s.backup.every_hours * 3600


def send_test(s: BotSettings) -> Dict[str, str]:
    """a message to every admin: their id -> "" or why it didn't go"""
    out = {}
    for c in s.admin_ids:
        try:
            _send(s, c, _t(s, "test"))
            out[str(c)] = ""
        except TelegramError as e:
            out[str(c)] = "start the bot first (open it and press Start)" if e.code in (400, 403) else str(e)
    return out


def mask(token: str) -> str:
    if not token:
        return ""
    head, _, tail = token.partition(":")
    return f"{head}:…{tail[-4:]}" if tail else "…"
