"""Host groups, PasarGuard/Remnawave style: create a group first, then put
hosts in it. A host belongs to at most one group (hosts.group_name); resellers
limited to some groups (admins.host_groups) only get those groups' hosts plus
ungrouped ones. The list of groups itself lives in the settings table."""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import xray
from app.db import crud, get_db
from app.db.models import Admin as DBAdmin
from app.db.models import ProxyHost
from app.models.admin import Admin
from app.utils import responses

router = APIRouter(tags=["Groups"], prefix="/api", responses={401: responses._401, 403: responses._403})

GROUPS_KEY = "host_groups"


class GroupHost(BaseModel):
    id: int
    remark: str
    address: str
    inbound_tag: str
    group_name: Optional[str] = None
    is_disabled: bool = False


class Group(BaseModel):
    name: str
    note: Optional[str] = ""
    hosts: List[int] = []
    admins: List[str] = []


class GroupsResponse(BaseModel):
    groups: List[Group]
    hosts: List[GroupHost]


class GroupCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    note: Optional[str] = ""


class GroupModify(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=64)
    note: Optional[str] = None
    hosts: Optional[List[int]] = None


def _stored(db: Session) -> List[dict]:
    """saved groups, plus any group name hosts already use (from before groups existed)"""
    groups = list(crud.get_setting(db, GROUPS_KEY, []) or [])
    names = {g["name"] for g in groups}
    for (name,) in db.query(ProxyHost.group_name).filter(ProxyHost.group_name.isnot(None)).distinct():
        name = (name or "").strip()
        if name and name not in names:
            groups.append({"name": name, "note": ""})
            names.add(name)
    return groups


def _save(db: Session, groups: List[dict]):
    crud.set_setting(db, GROUPS_KEY, [{"name": g["name"], "note": g.get("note") or ""} for g in groups])


def _response(db: Session) -> GroupsResponse:
    groups = _stored(db)
    hosts = db.query(ProxyHost).order_by(ProxyHost.inbound_tag, ProxyHost.id).all()
    admins = db.query(DBAdmin.username, DBAdmin.host_groups).all()
    out = []
    for g in groups:
        out.append(Group(
            name=g["name"], note=g.get("note") or "",
            hosts=[h.id for h in hosts if h.group_name == g["name"]],
            admins=[u for u, hg in admins if hg and g["name"] in hg],
        ))
    return GroupsResponse(
        groups=out,
        hosts=[GroupHost(id=h.id, remark=h.remark, address=h.address, inbound_tag=h.inbound_tag,
                         group_name=h.group_name, is_disabled=bool(h.is_disabled)) for h in hosts],
    )


@router.get("/groups", response_model=GroupsResponse)
def list_groups(db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)):
    """All host groups with their hosts and the admins limited to them"""
    return _response(db)


@router.post("/groups", response_model=GroupsResponse)
def create_group(body: GroupCreate, db: Session = Depends(get_db),
                 admin: Admin = Depends(Admin.check_sudo_admin)):
    groups = _stored(db)
    name = body.name.strip()
    if any(g["name"] == name for g in groups):
        raise HTTPException(409, "Group already exists")
    groups.append({"name": name, "note": body.note or ""})
    _save(db, groups)
    return _response(db)


@router.put("/groups/{name}", response_model=GroupsResponse)
def modify_group(name: str, body: GroupModify, db: Session = Depends(get_db),
                 admin: Admin = Depends(Admin.check_sudo_admin)):
    groups = _stored(db)
    group = next((g for g in groups if g["name"] == name), None)
    if group is None:
        raise HTTPException(404, "Group not found")

    new_name = (body.name or name).strip()
    if new_name != name:
        if any(g["name"] == new_name for g in groups):
            raise HTTPException(409, "Group already exists")
        group["name"] = new_name
        db.query(ProxyHost).filter(ProxyHost.group_name == name).update({ProxyHost.group_name: new_name})
        for dbadmin in db.query(DBAdmin).all():
            if dbadmin.host_groups and name in dbadmin.host_groups:
                dbadmin.host_groups = [new_name if x == name else x for x in dbadmin.host_groups]
    if body.note is not None:
        group["note"] = body.note

    if body.hosts is not None:
        wanted = set(body.hosts)
        # hosts taken out of the group become ungrouped; hosts put in move here
        db.query(ProxyHost).filter(ProxyHost.group_name == new_name, ProxyHost.id.notin_(wanted or {-1})) \
            .update({ProxyHost.group_name: None}, synchronize_session=False)
        if wanted:
            db.query(ProxyHost).filter(ProxyHost.id.in_(wanted)) \
                .update({ProxyHost.group_name: new_name}, synchronize_session=False)

    db.commit()
    _save(db, groups)
    xray.hosts.update()
    return _response(db)


@router.delete("/groups/{name}", response_model=GroupsResponse)
def delete_group(name: str, db: Session = Depends(get_db),
                 admin: Admin = Depends(Admin.check_sudo_admin)):
    """Delete a group. Its hosts become ungrouped and admins lose the group."""
    groups = [g for g in _stored(db) if g["name"] != name]
    db.query(ProxyHost).filter(ProxyHost.group_name == name).update({ProxyHost.group_name: None})
    for dbadmin in db.query(DBAdmin).all():
        if dbadmin.host_groups and name in dbadmin.host_groups:
            dbadmin.host_groups = [x for x in dbadmin.host_groups if x != name]
    db.commit()
    _save(db, groups)
    xray.hosts.update()
    return _response(db)
