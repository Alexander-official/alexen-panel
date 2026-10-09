"""Backups of the whole panel, and restoring one.

A backup is one zip:
  manifest.json      what it is: panel version, database revision, time, sizes
  db.sqlite3         a consistent snapshot (SQLite's online backup, safe while the panel runs)
  xray_config.json   the main core config
  certs/...          the certificate files the cores point to (from the data folder)

The database holds everything else: users, admins, hosts, nodes, settings, extra
cores, and the JWT key that the saved SSH logins are encrypted with, so a
restored panel can still use them. The .env file is not included (server
specific, it can hold secrets of its own).

Every day a backup is also written to <data>/backups (the last KEEP are kept).
Restoring checks the zip, saves the current state as a backup first, puts the
files in place and restarts the panel; at start the migrations bring an older
database up to date."""
import io
import json
import os
import shutil
import sqlite3
import tempfile
import threading
import time
import zipfile
from datetime import datetime, timezone
from typing import List, Optional

from app import logger

KEEP = int(os.getenv("BACKUP_KEEP", "7"))
MAX_UPLOAD = 512 * 1024 * 1024
_lock = threading.RLock()   # restore() takes it and then makes a backup (create) too


def _db_path() -> Optional[str]:
    from config import SQLALCHEMY_DATABASE_URL
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite:///"):
        return None
    return SQLALCHEMY_DATABASE_URL[len("sqlite:///"):]


def data_dir() -> str:
    p = _db_path()
    return os.path.dirname(p) if p else "/var/lib/marzban"


def backups_dir() -> str:
    d = os.path.join(data_dir(), "backups")
    os.makedirs(d, exist_ok=True)
    return d


def _xray_json() -> str:
    from config import XRAY_JSON
    return XRAY_JSON


def _revision(db_file: str) -> str:
    try:
        c = sqlite3.connect(f"file:{db_file}?mode=ro", uri=True)
        try:
            return c.execute("select version_num from alembic_version").fetchone()[0]
        finally:
            c.close()
    except Exception:
        return ""


def _known_revisions() -> set:
    try:
        from alembic.config import Config
        from alembic.script import ScriptDirectory
        root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cfg = Config(os.path.join(root, "alembic.ini"))
        cfg.set_main_option("script_location", os.path.join(root, "app", "db", "migrations"))
        return {r.revision for r in ScriptDirectory.from_config(cfg).walk_revisions()}
    except Exception as e:
        logger.warning(f"backup: can't list migrations: {e}")
        return set()


def create() -> bytes:
    """the zip of the panel as it is now"""
    src = _db_path()
    if not src or not os.path.exists(src):
        raise ValueError("Backups work with the SQLite database only")
    from app import __version__
    with _lock, tempfile.TemporaryDirectory() as tmp:
        snap = os.path.join(tmp, "db.sqlite3")
        a, b = sqlite3.connect(src), sqlite3.connect(snap)
        try:
            a.backup(b)          # consistent even while the panel writes
        finally:
            b.close()
            a.close()
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
            z.write(snap, "db.sqlite3")
            files = ["db.sqlite3"]
            xj = _xray_json()
            if os.path.exists(xj):
                z.write(xj, "xray_config.json")
                files.append("xray_config.json")
            certs = os.path.join(data_dir(), "certs")
            if os.path.isdir(certs):
                for root, _, names in os.walk(certs):
                    for n in names:
                        full = os.path.join(root, n)
                        arc = os.path.join("certs", os.path.relpath(full, certs))
                        z.write(full, arc)
                        files.append(arc)
            z.writestr("manifest.json", json.dumps({
                "kind": "alexen-backup", "format": 1, "panel_version": __version__,
                "db_revision": _revision(snap), "created_at": datetime.now(timezone.utc).isoformat(),
                "files": files, "db_size": os.path.getsize(snap)}, indent=2))
        return buf.getvalue()


def file_name(prefix: str = "alexen-backup") -> str:
    return f"{prefix}-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}.zip"


def save_to_disk(prefix: str = "alexen-backup") -> str:
    data = create()
    path = os.path.join(backups_dir(), file_name(prefix))
    with open(path + ".tmp", "wb") as f:
        f.write(data)
    os.replace(path + ".tmp", path)
    _prune()
    return path


def _prune():
    names = sorted((n for n in os.listdir(backups_dir()) if n.startswith("alexen-backup-") and n.endswith(".zip")),
                   reverse=True)
    for n in names[KEEP:]:
        try:
            os.remove(os.path.join(backups_dir(), n))
        except OSError:
            pass


def listing() -> List[dict]:
    out = []
    for n in sorted(os.listdir(backups_dir()), reverse=True):
        if n.endswith(".zip"):
            p = os.path.join(backups_dir(), n)
            out.append({"name": n, "size": os.path.getsize(p), "time": int(os.path.getmtime(p))})
    return out


def safe_name(name: str) -> str:
    """a file name from the backups folder only (no paths)"""
    base = os.path.basename(name or "")
    if base != name or not base.endswith(".zip") or base.startswith("."):
        raise ValueError("Unknown backup")
    if not os.path.exists(os.path.join(backups_dir(), base)):
        raise ValueError("Unknown backup")
    return os.path.join(backups_dir(), base)


def check(data: bytes) -> dict:
    """the manifest of a valid backup, or ValueError saying what is wrong with it"""
    if len(data) > MAX_UPLOAD:
        raise ValueError("The file is too big for a backup")
    try:
        z = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile:
        raise ValueError("Not an Alexen backup: the file isn't a zip")
    names = z.namelist()
    if "manifest.json" not in names or "db.sqlite3" not in names:
        raise ValueError("Not an Alexen backup: manifest.json or db.sqlite3 is missing")
    for n in names:   # no absolute paths, no ../ escapes
        if n.startswith("/") or ".." in n.replace("\\", "/").split("/"):
            raise ValueError("The backup contains an unsafe file path")
        if n not in ("manifest.json", "db.sqlite3", "xray_config.json") and not n.startswith("certs/"):
            raise ValueError(f"Unexpected file in the backup: {n}")
    try:
        manifest = json.loads(z.read("manifest.json"))
    except ValueError:
        raise ValueError("The backup's manifest.json is damaged")
    if manifest.get("kind") != "alexen-backup":
        raise ValueError("Not an Alexen backup")
    with tempfile.TemporaryDirectory() as tmp:
        db = os.path.join(tmp, "db.sqlite3")
        with open(db, "wb") as f:
            f.write(z.read("db.sqlite3"))
        try:
            c = sqlite3.connect(db)
            try:
                if c.execute("pragma integrity_check").fetchone()[0] != "ok":
                    raise ValueError("The backup's database is damaged")
                tables = {r[0] for r in c.execute("select name from sqlite_master where type='table'")}
            finally:
                c.close()
        except sqlite3.DatabaseError:
            raise ValueError("The backup's database is damaged")
        for t in ("users", "admins", "proxies", "alembic_version"):
            if t not in tables:
                raise ValueError(f"The backup's database has no {t} table")
        rev = _revision(db)
        known = _known_revisions()
        if known and rev not in known:
            raise ValueError("This backup comes from a newer panel version: update the panel first")
    if "xray_config.json" in names:
        try:
            json.loads(z.read("xray_config.json"))
        except ValueError:
            try:
                import commentjson
                commentjson.loads(z.read("xray_config.json").decode())
            except Exception:
                raise ValueError("The backup's xray_config.json is damaged")
    return manifest


def restore(data: bytes) -> dict:
    """put a backup in place (the current state is saved first); the caller restarts the panel"""
    manifest = check(data)
    with _lock:
        before = save_to_disk("alexen-backup-before-restore")
        z = zipfile.ZipFile(io.BytesIO(data))
        dst = _db_path()
        tmp = dst + ".restore"
        with open(tmp, "wb") as f:
            f.write(z.read("db.sqlite3"))
        # the running engine keeps no lock between requests: swap the file atomically
        for ext in ("-wal", "-shm", "-journal"):
            try:
                os.remove(dst + ext)
            except OSError:
                pass
        os.replace(tmp, dst)
        if "xray_config.json" in z.namelist():
            xj = _xray_json()
            with open(xj + ".restore", "wb") as f:
                f.write(z.read("xray_config.json"))
            os.replace(xj + ".restore", xj)
        certs = os.path.join(data_dir(), "certs")
        for n in z.namelist():
            if n.startswith("certs/") and not n.endswith("/"):
                target = os.path.join(certs, os.path.relpath(n, "certs"))
                os.makedirs(os.path.dirname(target), exist_ok=True)
                with open(target, "wb") as f:
                    f.write(z.read(n))
    logger.warning(f"backup restored (from {manifest.get('created_at')}); the state before it: {before}")
    return {"manifest": manifest, "saved_before": os.path.basename(before)}


def restart_soon(delay: float = 1.5):
    """end the process so the container (restart: always) starts it again with the restored files"""
    def go():
        time.sleep(delay)
        logger.warning("restarting the panel after a restore")
        os._exit(3)
    threading.Thread(target=go, daemon=True).start()


def daily_job():
    try:
        last = max((b["time"] for b in listing() if b["name"].startswith("alexen-backup-2")), default=0)
        if time.time() - last >= 23 * 3600:
            p = save_to_disk()
            logger.info(f"daily backup written: {os.path.basename(p)}")
    except Exception as e:
        logger.error(f"daily backup failed: {e}")
