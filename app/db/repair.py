"""Fix rows an older version could leave broken, before anything reads them.

A user without any proxy (possible before UserCreate required one) makes the
user model fail to load, so every list containing it answered 500. At start
such users get a proxy of each protocol the core has inbounds for (fresh
credentials, like a new user), and a log line says who was repaired."""
from app import logger


def users_without_proxies() -> None:
    try:
        from app import xray
        from app.db import GetDB
        from app.db.models import Proxy, User
        from app.models.proxy import ProxySettings
        with GetDB() as db:
            broken = db.query(User).filter(~User.proxies.any()).all()
            if not broken:
                return
            protocols = [p for p, tags in xray.config.inbounds_by_protocol.items() if tags]
            if not protocols:
                logger.warning(f"{len(broken)} users have no proxy and the core has no inbounds to give them")
                return
            for user in broken:
                for proto in protocols:
                    settings = ProxySettings.from_dict(proto, {})
                    db.add(Proxy(user_id=user.id, type=proto, settings=settings.dict(no_obj=True)))
                logger.warning(f'User "{user.username}" had no proxy: gave it {", ".join(map(str, protocols))}')
            db.commit()
    except Exception as e:
        logger.error(f"repairing users without proxies failed: {e}")


def out_of_range_values() -> None:
    """values the user model no longer accepts (year > 9999 and the like) are clamped"""
    try:
        from sqlalchemy import update
        from app.db import GetDB
        from app.db.models import User
        from app.models.user import MAX_EXPIRE, MAX_SECONDS
        with GetDB() as db:
            fixes = [
                (User.expire > MAX_EXPIRE, {"expire": MAX_EXPIRE}),
                (User.ip_limit > 100000, {"ip_limit": 100000}),
                (User.hwid_limit > 100000, {"hwid_limit": 100000}),
                (User.on_hold_expire_duration > MAX_SECONDS, {"on_hold_expire_duration": MAX_SECONDS}),
                (User.on_hold_expire_duration < 0, {"on_hold_expire_duration": 0}),
                (User.auto_delete_in_days > 36500, {"auto_delete_in_days": 36500}),
            ]
            for cond, values in fixes:
                n = db.execute(update(User).where(cond).values(**values)).rowcount
                if n:
                    logger.warning(f"{n} users had {list(values)[0]} out of range: clamped")
            db.commit()
    except Exception as e:
        logger.error(f"clamping out-of-range user values failed: {e}")
