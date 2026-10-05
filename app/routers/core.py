import asyncio
import json
import time

from typing import List, Optional

import commentjson
from fastapi import APIRouter, Depends, HTTPException, WebSocket
from pydantic import BaseModel, Field
from starlette.websockets import WebSocketDisconnect

from app import xray
from app.db import Session, get_db
from app.models.admin import Admin
from app.models.core import CoreStats
from app.utils import responses
from app.xray import XRayConfig, cores
from config import XRAY_JSON

router = APIRouter(tags=["Core"], prefix="/api", responses={401: responses._401})


@router.websocket("/core/logs")
async def core_logs(websocket: WebSocket, db: Session = Depends(get_db)):
    token = websocket.query_params.get("token") or websocket.headers.get(
        "Authorization", ""
    ).removeprefix("Bearer ")
    admin = Admin.get_admin(token, db)
    if not admin:
        return await websocket.close(reason="Unauthorized", code=4401)

    if not admin.is_sudo:
        return await websocket.close(reason="You're not allowed", code=4403)

    interval = websocket.query_params.get("interval")
    if interval:
        try:
            interval = float(interval)
        except ValueError:
            return await websocket.close(reason="Invalid interval value", code=4400)
        if interval > 10:
            return await websocket.close(
                reason="Interval must be more than 0 and at most 10 seconds", code=4400
            )

    await websocket.accept()

    cache = ""
    last_sent_ts = 0
    with xray.core.get_logs() as logs:
        while True:
            if interval and time.time() - last_sent_ts >= interval and cache:
                try:
                    await websocket.send_text(cache)
                except (WebSocketDisconnect, RuntimeError):
                    break
                cache = ""
                last_sent_ts = time.time()

            if not logs:
                try:
                    await asyncio.wait_for(websocket.receive(), timeout=0.2)
                    continue
                except asyncio.TimeoutError:
                    continue
                except (WebSocketDisconnect, RuntimeError):
                    break

            log = logs.popleft()

            if interval:
                cache += f"{log}\n"
                continue

            try:
                await websocket.send_text(log)
            except (WebSocketDisconnect, RuntimeError):
                break


@router.get("/core", response_model=CoreStats)
def get_core_stats(admin: Admin = Depends(Admin.get_current)):
    """Retrieve core statistics such as version and uptime."""
    return CoreStats(
        version=xray.core.version,
        started=xray.core.started,
        logs_websocket=router.url_path_for("core_logs"),
    )


def _restart_nodes(node_ids=None, configs=None):
    """Restart connected nodes (all, or the given ids) with their own core's config"""
    configs = configs or cores.ConfigSet()
    for node_id, node in list(xray.nodes.items()):
        if node_ids is not None and node_id not in node_ids:
            continue
        if node.connected:
            xray.operations.restart_node(node_id, configs)


@router.get("/core/x25519", responses={403: responses._403})
def generate_x25519(admin: Admin = Depends(Admin.check_sudo_admin)) -> dict:
    """A fresh x25519 key pair for a REALITY inbound."""
    keys = xray.core.get_x25519()
    if not keys:
        raise HTTPException(status_code=500, detail="Unable to generate keys")
    return keys


class OutboundLink(BaseModel):
    link: str
    tag: Optional[str] = None


@router.post("/core/outbound-from-link", responses={403: responses._403})
def outbound_from_link(payload: OutboundLink, admin: Admin = Depends(Admin.check_sudo_admin)) -> dict:
    """Turn a vless/vmess/trojan/ss/hysteria2 share link into an Xray outbound."""
    from app.subscription.external_sources import parse
    parsed = parse(payload.link.strip())
    if not parsed:
        raise HTTPException(status_code=400, detail="Unsupported or invalid link")
    outbound = parsed["outbound"]
    outbound["tag"] = payload.tag or f"{parsed['protocol']}-{parsed['address']}"
    return outbound


@router.post("/core/restart", responses={403: responses._403})
def restart_core(admin: Admin = Depends(Admin.check_sudo_admin)):
    """Restart the core and all connected nodes."""
    configs = cores.ConfigSet()
    xray.core.restart(configs.get(cores.MAIN))
    _restart_nodes(configs=configs)

    return {}


@router.get("/core/config", responses={403: responses._403})
def get_core_config(admin: Admin = Depends(Admin.check_sudo_admin)) -> dict:
    """Get the current core configuration."""
    with open(XRAY_JSON, "r") as f:
        config = commentjson.loads(f.read())

    return config


@router.put("/core/config", responses={403: responses._403})
def modify_core_config(
    payload: dict, admin: Admin = Depends(Admin.check_sudo_admin)
) -> dict:
    """Modify the core configuration and restart the core."""
    try:
        config = XRayConfig(payload, api_port=xray.config.api_port)
        cores.check_conflicts(config, cores.MAIN)
        xray.core.test_config(config)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))

    xray.config = config
    cores.attach()
    with open(XRAY_JSON, "w") as f:
        f.write(json.dumps(payload, indent=4))

    configs = cores.ConfigSet()
    xray.core.restart(configs.get(cores.MAIN))
    _restart_nodes(cores.nodes_of(cores.MAIN), configs)

    xray.hosts.update()

    return payload


# ------------------------------------------------- extra cores (app/xray/cores.py)

class CoreInfo(BaseModel):
    id: str
    name: str
    inbounds: List[str]


class CoreCreate(BaseModel):
    name: str = Field(min_length=1, max_length=64)
    config: Optional[dict] = None
    # start from a copy of another core's config when no config is given
    copy_from: Optional[str] = cores.MAIN


class CoreModify(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=64)


def _core_config(core_id: str) -> dict:
    if core_id == cores.MAIN:
        return get_core_config()
    config = cores.raw_config(core_id)
    if config is None:
        raise HTTPException(status_code=404, detail="Core not found")
    return config


@router.get("/cores", response_model=List[CoreInfo], responses={403: responses._403})
def list_cores(admin: Admin = Depends(Admin.check_sudo_admin)):
    """List the main core and the extra cores nodes can run."""
    return cores.list_cores()


@router.post("/cores", response_model=CoreInfo, responses={403: responses._403})
def create_core(payload: CoreCreate, admin: Admin = Depends(Admin.check_sudo_admin)):
    """Add an extra core, from a given config or a copy of another core."""
    config = payload.config if payload.config is not None else _core_config(payload.copy_from or cores.MAIN)
    try:
        core_id = cores.create(payload.name, config)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    xray.hosts.update()
    return next(c for c in cores.list_cores() if c["id"] == core_id)


@router.put("/cores/{core_id}", response_model=CoreInfo, responses={403: responses._403})
def rename_core(core_id: str, payload: CoreModify, admin: Admin = Depends(Admin.check_sudo_admin)):
    if core_id == cores.MAIN or core_id not in cores.extra:
        raise HTTPException(status_code=404, detail="Core not found")
    cores.update(core_id, name=payload.name)
    return next(c for c in cores.list_cores() if c["id"] == core_id)


@router.delete("/cores/{core_id}", responses={403: responses._403})
def delete_core(core_id: str, admin: Admin = Depends(Admin.check_sudo_admin)):
    """Delete an extra core; its nodes go back to the main core."""
    if core_id == cores.MAIN or core_id not in cores.extra:
        raise HTTPException(status_code=404, detail="Core not found")
    moved = cores.delete(core_id)
    xray.hosts.update()
    _restart_nodes(moved)
    return {}


@router.get("/cores/{core_id}/config", responses={403: responses._403})
def get_extra_core_config(core_id: str, admin: Admin = Depends(Admin.check_sudo_admin)) -> dict:
    return _core_config(core_id)


@router.put("/cores/{core_id}/config", responses={403: responses._403})
def modify_extra_core_config(core_id: str, payload: dict,
                             admin: Admin = Depends(Admin.check_sudo_admin)) -> dict:
    """Save a core's config and restart the nodes running it."""
    if core_id == cores.MAIN:
        return modify_core_config(payload, admin)
    if core_id not in cores.extra:
        raise HTTPException(status_code=404, detail="Core not found")
    try:
        cores.update(core_id, config=payload)
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    xray.hosts.update()
    _restart_nodes(cores.nodes_of(core_id))
    return payload
