"""The creator accounts, their users and everything about those users are hidden from the
sudo admins (like the sudo admins' users are from the regular ones).

Admin.get_admin marks the request's session of a sudo admin that isn't a creator; every ORM
query that session runs then leaves those rows out: lists, counts, sums, a user looked up by
name (so it answers 404), bulk changes. One place, so a new endpoint can't forget it.
Jobs and the core config use their own sessions and still see everything.

A removed creator stays hidden: its users go to the creator who removed it (app/db/crud.py
remove_admin) and its name, still in the activity log, is remembered (settings
"former_creators") until a new admin gets that name."""
from sqlalchemy import column, event, false, or_, select, table, true
from sqlalchemy.orm import Session, with_loader_criteria

from .models import (ActivityLog, Admin, AdminProfile, AdminUsageLogs, Alert, NextPlan, NodeUserUsage,
                     NotificationReminder, Proxy, User, UserHWIDDevice, UserInboundUsage,
                     UserUsageResetLogs)

KEY = "hide_creators"
FORMER = "former_creators"

# plain tables, not the mapped classes: the criteria below must not filter their own subqueries
_admins = table("admins", column("id"), column("username"), column("is_creator"))
_users = table("users", column("id"), column("admin_id"))
_settings = table("settings", column("key"), column("data"))
_creator_names = select(_admins.c.username).where(_admins.c.is_creator == true())
_creator_ids = select(_admins.c.id).where(_admins.c.is_creator == true())


def _former(db: Session) -> dict:
    import json
    row = db.execute(select(_settings.c.data).where(_settings.c.key == FORMER)).first()
    data = row[0] if row else None
    if isinstance(data, str):
        try:
            data = json.loads(data)
        except ValueError:
            data = None
    data = data if isinstance(data, dict) else {}
    return {"names": [str(n) for n in data.get("names") or []]}


def _save_former(db: Session, former: dict) -> None:
    from . import crud
    crud.set_setting(db, FORMER, former)


def creator_removed(db: Session, dbadmin) -> None:
    """call before a creator account is deleted: it stays hidden from the sudo admins"""
    f = _former(db)
    if dbadmin.username not in f["names"]:
        f["names"].append(dbadmin.username)
    _save_former(db, f)


def admin_added(db: Session, dbadmin) -> None:
    """a new admin with a removed creator's name is someone else: no longer hidden"""
    f = _former(db)
    if dbadmin.username in f["names"]:
        f["names"] = [n for n in f["names"] if n != dbadmin.username]
        _save_former(db, f)


def hidden_names(db: Session) -> set:
    """the creator names (now and removed) this session mustn't show, empty when it sees all"""
    if not db.info.get(KEY):
        return set()
    return {n for (n,) in db.execute(_creator_names).all()} | set(db.info.get(FORMER, {}).get("names", []))


def hide_creators(db: Session) -> None:
    db.info[FORMER] = _former(db)
    db.info[KEY] = True


def _options(former: dict):
    names = former.get("names") or [""]
    hidden_user_ids = select(_users.c.id).where(_users.c.admin_id.in_(_creator_ids))
    by_user = [with_loader_criteria(m, m.user_id.notin_(hidden_user_ids), include_aliases=True)
               for m in (NodeUserUsage, UserUsageResetLogs, UserInboundUsage, UserHWIDDevice, Proxy,
                         NextPlan, NotificationReminder)]
    return [
        with_loader_criteria(Admin, or_(Admin.is_creator.is_(None), Admin.is_creator == false()),
                             include_aliases=True),
        with_loader_criteria(User, or_(User.admin_id.is_(None), User.admin_id.notin_(_creator_ids)),
                             include_aliases=True),
        with_loader_criteria(AdminUsageLogs, AdminUsageLogs.admin_id.notin_(_creator_ids), include_aliases=True),
        with_loader_criteria(AdminProfile, AdminProfile.admin_id.notin_(_creator_ids), include_aliases=True),
        with_loader_criteria(ActivityLog, or_(ActivityLog.admin.is_(None),
                                              ActivityLog.admin.notin_(_creator_names) & ActivityLog.admin.notin_(names)),
                             include_aliases=True),
        with_loader_criteria(Alert, or_(Alert.admin.is_(None),
                                        Alert.admin.notin_(_creator_names) & Alert.admin.notin_(names)),
                             include_aliases=True),
        *by_user,
    ]


@event.listens_for(Session, "do_orm_execute")
def _hide(state):
    if not state.session.info.get(KEY):
        return
    # lazy / column loads carry the criteria of the statement that loaded the parent already
    if state.is_select and (state.is_column_load or state.is_relationship_load):
        return
    if state.is_select or state.is_update or state.is_delete:
        state.statement = state.statement.options(*_options(state.session.info.get(FORMER) or {}))
