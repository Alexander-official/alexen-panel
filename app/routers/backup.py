"""Backups (app/backup.py): download now, the automatic ones, restore"""
import io

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from app import backup
from app.models.admin import Admin
from app.utils import responses

router = APIRouter(tags=["Backup"], prefix="/api/backup", responses={401: responses._401, 403: responses._403})


def _zip(data: bytes, name: str) -> StreamingResponse:
    return StreamingResponse(io.BytesIO(data), media_type="application/zip",
                             headers={"Content-Disposition": f'attachment; filename="{name}"'})


@router.get("")
def download_backup(_: Admin = Depends(Admin.check_sudo_admin)):
    """a backup of the panel as it is now (zip)"""
    try:
        return _zip(backup.create(), backup.file_name())
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/list")
def list_backups(_: Admin = Depends(Admin.check_sudo_admin)):
    return {"keep": backup.KEEP, "backups": backup.listing()}


@router.post("/now")
def backup_now(_: Admin = Depends(Admin.check_sudo_admin)):
    """write a backup to the server's backups folder"""
    try:
        import os
        return {"name": os.path.basename(backup.save_to_disk()), "backups": backup.listing()}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/file/{name}")
def download_saved(name: str, _: Admin = Depends(Admin.check_sudo_admin)):
    try:
        path = backup.safe_name(name)
    except ValueError as e:
        raise HTTPException(404, str(e))
    with open(path, "rb") as f:
        return _zip(f.read(), name)


@router.delete("/file/{name}")
def delete_saved(name: str, _: Admin = Depends(Admin.check_sudo_admin)):
    try:
        import os
        os.remove(backup.safe_name(name))
    except ValueError as e:
        raise HTTPException(404, str(e))
    return {"backups": backup.listing()}


@router.post("/check")
def check_backup(file: UploadFile = File(...), _: Admin = Depends(Admin.check_sudo_admin)):
    """what a backup file contains (nothing is changed)"""
    try:
        return backup.check(file.file.read(backup.MAX_UPLOAD + 1))
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/restore")
def restore_backup(file: UploadFile = File(...), _: Admin = Depends(Admin.check_sudo_admin)):
    """replace the panel's data with a backup, then restart (the current state is saved first)"""
    try:
        out = backup.restore(file.file.read(backup.MAX_UPLOAD + 1))
    except ValueError as e:
        raise HTTPException(400, str(e))
    backup.restart_soon()
    return out
