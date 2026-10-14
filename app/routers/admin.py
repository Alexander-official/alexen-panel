from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.exc import IntegrityError

from app import xray
from app.db import Session, crud, get_db
from app.dependencies import get_admin_by_username, validate_admin
from app.models.admin import Admin, AdminCreate, AdminModify, Token
from app.utils import report, responses
from app.utils.jwt import create_admin_token
from config import LOGIN_NOTIFY_WHITE_LIST

def _creators(db) -> int:
    from app.db.models import Admin as DBAdmin
    return db.query(DBAdmin).filter(DBAdmin.is_creator == True).count()  # noqa: E712


router = APIRouter(tags=["Admin"], prefix="/api", responses={401: responses._401})


def get_visible_admin(
    dbadmin: Admin = Depends(get_admin_by_username),
    current_admin: Admin = Depends(Admin.check_sudo_admin),
):
    """The admin in the path, as far as the caller may see it: the creator accounts
    are hidden from the sudo admins (like the sudo ones are from the regular admins)."""
    if getattr(dbadmin, "is_creator", False) and not current_admin.is_creator \
            and dbadmin.username != current_admin.username:
        raise HTTPException(status_code=404, detail="Admin not found")
    return dbadmin


def get_client_ip(request: Request) -> str:
    """The client's IP; X-Forwarded-For only counts when a trusted proxy sent it (app/login_guard.py)."""
    from app import login_guard
    return login_guard.client_ip(request.client.host if request.client else "",
                                 request.headers.get("X-Forwarded-For"))


@router.post("/admin/token", response_model=Token)
def admin_token(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authenticate an admin and issue a token."""
    from app import login_guard
    client_ip = get_client_ip(request)

    wait = login_guard.blocked_for(client_ip, form_data.username)
    if wait:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Too many failed logins: try again in {max(1, round(wait / 60))} minutes",
            headers={"Retry-After": str(wait)},
        )

    dbadmin = validate_admin(db, form_data.username, form_data.password)
    if not dbadmin:
        login_guard.failed(client_ip, form_data.username)
        # never pass on the password that was tried: it is often the real one with a typo
        report.login(form_data.username, "🔒", client_ip, False)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    login_guard.succeeded(client_ip, form_data.username)

    if client_ip not in LOGIN_NOTIFY_WHITE_LIST:
        report.login(form_data.username, "🔒", client_ip, True)

    return Token(access_token=create_admin_token(form_data.username, dbadmin.is_sudo))


@router.post(
    "/admin",
    response_model=Admin,
    responses={403: responses._403, 409: responses._409},
)
def create_admin(
    new_admin: AdminCreate,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Create a new admin if the current admin has sudo privileges (a sudo / creator one: creator only)."""
    if (new_admin.is_sudo or new_admin.is_creator) and not admin.is_creator:
        raise HTTPException(status_code=403, detail="Only the creator can add sudo admins")
    try:
        dbadmin = crud.create_admin(db, new_admin)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="Admin already exists")

    return dbadmin


@router.put(
    "/admin/{username}",
    response_model=Admin,
    responses={403: responses._403},
)
def modify_admin(
    modified_admin: AdminModify,
    dbadmin: Admin = Depends(get_visible_admin),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Modify an existing admin's details. Sudo admins change regular admins (and themselves);
    sudo / creator accounts and roles are the creator's."""
    target_privileged = dbadmin.is_sudo or getattr(dbadmin, "is_creator", False)
    self_edit = dbadmin.username == current_admin.username
    if not current_admin.is_creator:
        if target_privileged and not self_edit:
            raise HTTPException(status_code=403, detail="Only the creator can change another sudo admin")
        if modified_admin.is_creator or (modified_admin.is_sudo and not dbadmin.is_sudo):
            raise HTTPException(status_code=403, detail="Only the creator can make sudo admins")
    elif getattr(dbadmin, "is_creator", False) and (modified_admin.is_creator is False or not modified_admin.is_sudo) \
            and _creators(db) <= 1:
        raise HTTPException(status_code=400, detail="The panel needs at least one creator: make another one first")

    updated_admin = crud.update_admin(db, dbadmin, modified_admin)

    return updated_admin


@router.delete(
    "/admin/{username}",
    responses={403: responses._403},
)
def remove_admin(
    dbadmin: Admin = Depends(get_visible_admin),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Remove an admin from the database (a sudo / creator one: creator only)."""
    if dbadmin.username == current_admin.username:
        raise HTTPException(status_code=400, detail="You can't delete your own account")
    if dbadmin.is_sudo or getattr(dbadmin, "is_creator", False):
        if not current_admin.is_creator:
            raise HTTPException(status_code=403, detail="Only the creator can delete sudo admins")
        if getattr(dbadmin, "is_creator", False) and _creators(db) <= 1:
            raise HTTPException(status_code=400, detail="The panel needs at least one creator: make another one first")

    crud.remove_admin(db, dbadmin)
    return {"detail": "Admin removed successfully"}


@router.get("/admin", response_model=Admin)
def get_current_admin(admin: Admin = Depends(Admin.get_current)):
    """Retrieve the current authenticated admin."""
    return admin


@router.get(
    "/admins",
    response_model=List[Admin],
    responses={403: responses._403},
)
def get_admins(
    offset: Optional[int] = None,
    limit: Optional[int] = None,
    username: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Fetch a list of admins with optional filters for pagination and username
    (the creator accounts only for a creator)."""
    return crud.get_admins(db, offset, limit, username, with_creators=admin.is_creator)


@router.post("/admin/{username}/users/disable", responses={403: responses._403, 404: responses._404})
def disable_all_active_users(
    dbadmin: Admin = Depends(get_visible_admin),
    db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Disable all active users under a specific admin"""
    if (dbadmin.is_sudo or getattr(dbadmin, "is_creator", False)) and not admin.is_creator \
            and dbadmin.username != admin.username:
        raise HTTPException(status_code=403, detail="Only the creator can change another sudo admin")
    crud.disable_all_active_users(db=db, admin=dbadmin)
    startup_config = xray.config.include_db_users()
    xray.core.restart(startup_config)
    for node_id, node in list(xray.nodes.items()):
        if node.connected:
            xray.operations.restart_node(node_id, startup_config)
    return {"detail": "Users successfully disabled"}


@router.post("/admin/{username}/users/activate", responses={403: responses._403, 404: responses._404})
def activate_all_disabled_users(
    dbadmin: Admin = Depends(get_visible_admin),
    db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Activate all disabled users under a specific admin"""
    if (dbadmin.is_sudo or getattr(dbadmin, "is_creator", False)) and not admin.is_creator \
            and dbadmin.username != admin.username:
        raise HTTPException(status_code=403, detail="Only the creator can change another sudo admin")
    crud.activate_all_disabled_users(db=db, admin=dbadmin)
    startup_config = xray.config.include_db_users()
    xray.core.restart(startup_config)
    for node_id, node in list(xray.nodes.items()):
        if node.connected:
            xray.operations.restart_node(node_id, startup_config)
    return {"detail": "Users successfully activated"}


@router.post(
    "/admin/usage/reset/{username}",
    response_model=Admin,
    responses={403: responses._403},
)
def reset_admin_usage(
    dbadmin: Admin = Depends(get_visible_admin),
    db: Session = Depends(get_db),
    current_admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Resets usage of admin."""
    return crud.reset_admin_usage(db, dbadmin)


@router.get(
    "/admin/usage/{username}",
    response_model=int,
    responses={403: responses._403},
)
def get_admin_usage(
    dbadmin: Admin = Depends(get_visible_admin),
    current_admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Retrieve the usage of given admin."""
    return dbadmin.users_usage
