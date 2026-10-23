import logging

from app import logger, scheduler
from app.db import GetDB, crud
from app.models.admin import Admin
from app.utils import report
from config import USER_AUTODELETE_INCLUDE_LIMITED_ACCOUNTS

SYSTEM_ADMIN = Admin(username='system', is_sudo=True, telegram_id=None, discord_webhook=None)


def remove_expired_users():
    with GetDB() as db:
        # panel setting (Settings > user cleanup) takes precedence: hour-granular grace period
        cfg = crud.get_setting(db, "user_cleanup") or {}
        if cfg.get("auto_delete_enabled"):
            deleted_users = crud.autodelete_expired_users_after(
                db, int(cfg.get("auto_delete_hours") or 24),
                bool(cfg.get("include_limited")), bool(cfg.get("include_disabled")))
        else:
            # legacy per-user auto_delete_in_days / USERS_AUTODELETE_DAYS (.env) path
            deleted_users = crud.autodelete_expired_users(db, USER_AUTODELETE_INCLUDE_LIMITED_ACCOUNTS)

        for user in deleted_users:
            report.user_deleted(user.username, SYSTEM_ADMIN,
                                user_admin=Admin.model_validate(user.admin) if user.admin else None
                                )
            logger.log(logging.INFO, "Expired user %s deleted." % user.username)


# every 15 min so an hour-based grace period is reasonably timely
scheduler.add_job(remove_expired_users, 'interval', coalesce=True, minutes=15, max_instances=1)
