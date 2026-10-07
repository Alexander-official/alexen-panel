import asyncio
import os
import time
from typing import List

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, WebSocket
from sqlalchemy.exc import IntegrityError
from starlette.websockets import WebSocketDisconnect

from app import logger, xray
from app.db import Session, crud, get_db
from app.db.models import Node as DBNode
from app.dependencies import get_dbnode, validate_dates
from app.models.admin import Admin
from app.models.node import (
    NodeCreate,
    NodeModify,
    NodeResponse,
    NodeSettings,
    NodeStatus,
    NodesUsageResponse,
)
from app.models.proxy import ProxyHost
from app.utils import responses
from app.xray import cores

router = APIRouter(
    tags=["Node"], prefix="/api", responses={401: responses._401, 403: responses._403}
)


def add_host_if_needed(new_node: NodeCreate, db: Session):
    """Add a host if specified in the new node settings."""
    if new_node.add_as_new_host:
        core_inbounds = cores.config_of(new_node.core_id).own_inbounds_by_tag
        for inbound_tag, inbound in core_inbounds.items():
            host = ProxyHost(
                remark=f"{new_node.name} ({{USERNAME}}) [{{PROTOCOL}} - {{TRANSPORT}}]",
                address=new_node.address,
                # an extra core may serve a shared inbound on its own port
                port=inbound.get("port") if new_node.core_id != cores.MAIN
                and isinstance(inbound.get("port"), int) else None,
            )
            crud.add_host(db, inbound_tag, host)
        xray.hosts.update()


@router.get("/node/settings", response_model=NodeSettings)
def get_node_settings(
    db: Session = Depends(get_db), admin: Admin = Depends(Admin.check_sudo_admin)
):
    """Retrieve the current node settings, including TLS certificate."""
    tls = crud.get_tls_certificate(db)
    return NodeSettings(certificate=tls.certificate)


@router.post("/node", response_model=NodeResponse, responses={409: responses._409})
def add_node(
    new_node: NodeCreate,
    bg: BackgroundTasks,
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Add a new node to the database and optionally add it as a host."""
    if new_node.core_id != cores.MAIN and new_node.core_id not in cores.extra:
        raise HTTPException(status_code=400, detail="Core not found")
    try:
        dbnode = crud.create_node(db, new_node)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409, detail=f'Node "{new_node.name}" already exists'
        )
    cores.set_node_core(dbnode.id, new_node.core_id)

    bg.add_task(xray.operations.connect_node, node_id=dbnode.id)
    bg.add_task(add_host_if_needed, new_node, db)

    logger.info(f'New node "{dbnode.name}" added')
    return dbnode


@router.get("/node/{node_id}", response_model=NodeResponse)
def get_node(
    dbnode: NodeResponse = Depends(get_dbnode),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Retrieve details of a specific node by its ID."""
    return dbnode


@router.websocket("/node/{node_id}/logs")
async def node_logs(node_id: int, websocket: WebSocket, db: Session = Depends(get_db)):
    token = websocket.query_params.get("token") or websocket.headers.get(
        "Authorization", ""
    ).removeprefix("Bearer ")
    admin = Admin.get_admin(token, db)
    if not admin:
        return await websocket.close(reason="Unauthorized", code=4401)

    if not admin.is_sudo:
        return await websocket.close(reason="You're not allowed", code=4403)

    if not xray.nodes.get(node_id):
        return await websocket.close(reason="Node not found", code=4404)

    if not xray.nodes[node_id].connected:
        return await websocket.close(reason="Node is not connected", code=4400)

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
    node = xray.nodes[node_id]
    with node.get_logs() as logs:
        while True:
            if not node == xray.nodes[node_id]:
                break

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


@router.get("/nodes", response_model=List[NodeResponse])
def get_nodes(
    db: Session = Depends(get_db), _: Admin = Depends(Admin.check_sudo_admin)
):
    """Retrieve a list of all nodes. Accessible only to sudo admins."""
    return crud.get_nodes(db)


@router.put("/node/{node_id}", response_model=NodeResponse)
def modify_node(
    modified_node: NodeModify,
    bg: BackgroundTasks,
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Update a node's details. Only accessible to sudo admins."""
    if modified_node.core_id is not None:
        try:
            cores.set_node_core(dbnode.id, modified_node.core_id)
        except KeyError:
            raise HTTPException(status_code=400, detail="Core not found")
    updated_node = crud.update_node(db, dbnode, modified_node)
    xray.operations.remove_node(updated_node.id)
    if updated_node.status != NodeStatus.disabled:
        bg.add_task(xray.operations.connect_node, node_id=updated_node.id)

    logger.info(f'Node "{dbnode.name}" modified')
    return dbnode


@router.post("/node/{node_id}/reconnect")
def reconnect_node(
    bg: BackgroundTasks,
    dbnode: NodeResponse = Depends(get_node),
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Trigger a reconnection for the specified node. Only accessible to sudo admins."""
    bg.add_task(xray.operations.connect_node, node_id=dbnode.id)
    return {"detail": "Reconnection task scheduled"}


@router.delete("/node/{node_id}")
def remove_node(
    dbnode: NodeResponse = Depends(get_node),
    db: Session = Depends(get_db),
    admin: Admin = Depends(Admin.check_sudo_admin),
):
    """Delete a node and remove it from xray in the background."""
    crud.remove_node(db, dbnode)
    xray.operations.remove_node(dbnode.id)
    cores.forget_node(dbnode.id)
    from app import node_extras
    node_extras.drop(db, dbnode.id)

    logger.info(f'Node "{dbnode.name}" deleted')
    return {}


@router.get("/nodes/usage", response_model=NodesUsageResponse)
def get_usage(
    db: Session = Depends(get_db),
    start: str = "",
    end: str = "",
    _: Admin = Depends(Admin.check_sudo_admin),
):
    """Retrieve usage statistics for nodes within a specified date range."""
    start, end = validate_dates(start, end)

    usages = crud.get_nodes_usage(db, start, end)

    return {"usages": usages}


# ---- flag, VPS login (SSH) and installing over SSH (app/node_extras.py, app/node_install.py) ----
from typing import Optional as _Optional

from fastapi import Request
from pydantic import BaseModel, Field

from app import node_extras


class SSHIn(BaseModel):
    host: str = Field("", max_length=255)
    port: int = Field(22, ge=1, le=65535)
    username: str = Field("root", min_length=1, max_length=64)
    auth: str = Field("password", pattern="^(password|key)$")
    password: str = ""            # empty: keep the saved one
    private_key: str = ""
    passphrase: str = ""


class NodeExtraIn(BaseModel):
    flag: str = Field("", max_length=8)
    ssh: _Optional[SSHIn] = None   # given: saved (secrets encrypted)
    forget_ssh: bool = False


def _extra_out(extra: node_extras.NodeExtra) -> dict:
    ssh = extra.ssh
    return {"flag": extra.flag, "ssh": None if not ssh else {
        "host": ssh.host, "port": ssh.port, "username": ssh.username, "auth": ssh.auth, "saved": bool(ssh.secret)}}


def _merge_ssh(old: _Optional[node_extras.SSHLogin], new: SSHIn) -> node_extras.SSHLogin:
    secret_plain = new.password if new.auth == "password" else new.private_key
    keep = old is not None and old.auth == new.auth
    return node_extras.SSHLogin(
        host=new.host.strip(), port=new.port, username=new.username.strip(), auth=new.auth,
        secret=node_extras.encrypt(secret_plain) if secret_plain else (old.secret if keep else ""),
        passphrase=node_extras.encrypt(new.passphrase) if new.passphrase else (old.passphrase if keep else ""))


@router.get("/nodes/extras")
def nodes_extras(db: Session = Depends(get_db), _: Admin = Depends(Admin.check_sudo_admin)):
    return {k: _extra_out(v) for k, v in node_extras.load(db).nodes.items()}


@router.put("/node/{node_id}/extra")
def put_node_extra(body: NodeExtraIn, dbnode: NodeResponse = Depends(get_node),
                   db: Session = Depends(get_db), _: Admin = Depends(Admin.check_sudo_admin)):
    extra = node_extras.get(db, dbnode.id)
    extra.flag = body.flag.strip().upper()[:2] if body.flag.strip() else ""
    if body.forget_ssh:
        extra.ssh = None
    elif body.ssh is not None:
        extra.ssh = _merge_ssh(extra.ssh, body.ssh)
    node_extras.put(db, dbnode.id, extra)
    return _extra_out(extra)


class InstallIn(BaseModel):
    ssh: _Optional[SSHIn] = None   # empty: the saved login
    save: bool = False             # keep this login for later
    node: bool = True              # Marzban-node
    agent: bool = True             # the Alexen agent (VPN services, preroute, VPS status)


@router.post("/node/{node_id}/install")
def install_node(body: InstallIn, request: Request, dbnode: NodeResponse = Depends(get_node),
                 db: Session = Depends(get_db), _: Admin = Depends(Admin.check_sudo_admin)):
    """install Marzban-node and/or the agent on the VPS over SSH (runs in the background)"""
    from app import node_install
    extra = node_extras.get(db, dbnode.id)
    saved = extra.ssh
    login = _merge_ssh(saved, body.ssh) if body.ssh else saved
    if not login or not login.secret:
        raise HTTPException(400, "Enter the VPS login (password or private key)")
    if body.save:
        extra.ssh = login
        node_extras.put(db, dbnode.id, extra)
    if not body.node and not body.agent:
        raise HTTPException(400, "Nothing to install")
    secret = node_extras.decrypt(login.secret)
    if not secret:
        raise HTTPException(400, "The saved login can't be read anymore: enter it again")
    cert = crud.get_tls_certificate(db).certificate
    node_id = dbnode.id

    def connected():
        try:
            time.sleep(3)
            xray.operations.connect_node(node_id)
        except Exception as e:
            logger.warning(f"node {node_id}: connect after install: {e}")

    job = node_install.start(
        host=login.host or dbnode.address, port=login.port, username=login.username,
        password=secret if login.auth == "password" else "",
        key=secret if login.auth == "key" else "",
        passphrase=node_extras.decrypt(login.passphrase),
        node={"port": dbnode.port, "api_port": dbnode.api_port} if body.node else None,
        agent=body.agent, panel_url=str(request.base_url).rstrip("/"), cert=cert,
        on_done=connected if body.node else None)
    return {"job": job}


@router.get("/node-install/{job_id}")
def install_status(job_id: str, offset: int = 0, _: Admin = Depends(Admin.check_sudo_admin)):
    from app import node_install
    job = node_install.jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return {**{k: v for k, v in job.items() if k != "lines"}, "lines": job["lines"][offset:],
            "total": len(job["lines"])}


# ---- VPS state of every server, from its agent (master: this machine) ----
_sys_cache: dict = {}


def _sys_of(key: str) -> dict:
    from app import vpn
    from app.db import GetDB
    with GetDB() as db:
        s = vpn.load(db)
        srv = s.servers.get(key) or vpn.ServerVPN()
        data = vpn.call(db, key, srv, "GET", "/sys", timeout=5)
    if "cpu" not in data:
        raise vpn.AgentError(data.get("detail") or "no data")
    return data


@router.get("/nodes/system")
def nodes_system(db: Session = Depends(get_db), _: Admin = Depends(Admin.check_sudo_admin)):
    """CPU, memory, disk, uptime and network speed of the master and every node"""
    import psutil
    from concurrent.futures import ThreadPoolExecutor
    from app import vpn
    now = time.time()
    keys = [str(n.id) for n in db.query(DBNode).all()]
    todo = [k for k in keys if now - _sys_cache.get(k, {}).get("_at", 0) > 8]
    if todo:
        with ThreadPoolExecutor(max_workers=8) as ex:
            futures = {k: ex.submit(_sys_of, k) for k in todo}
        for k, f in futures.items():
            prev = _sys_cache.get(k, {})
            try:
                d = f.result()
                d["_at"] = now
                if prev.get("time") and d["time"] > prev["time"]:
                    dt = d["time"] - prev["time"]
                    d["rx_rate"] = max(0, (d["net_rx"] - prev["net_rx"]) / dt)
                    d["tx_rate"] = max(0, (d["net_tx"] - prev["net_tx"]) / dt)
                else:
                    d["rx_rate"] = prev.get("rx_rate", 0)
                    d["tx_rate"] = prev.get("tx_rate", 0)
                _sys_cache[k] = d
            except Exception as e:
                text = str(e)
                if "404" in text or "not found" in text.lower():
                    text = "agent too old"
                _sys_cache[k] = {"_at": now, "error": text[:200]}
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    io = psutil.net_io_counters()
    prev = _sys_cache.get("master", {})
    rx_rate = (io.bytes_recv - prev["net_rx"]) / (now - prev["time"]) if prev.get("time") and now > prev["time"] else 0
    tx_rate = (io.bytes_sent - prev["net_tx"]) / (now - prev["time"]) if prev.get("time") and now > prev["time"] else 0
    master = {"cpu": psutil.cpu_percent(), "cores": psutil.cpu_count(), "load": list(os.getloadavg()),
              "mem_total": mem.total, "mem_used": mem.total - mem.available,
              "disk_total": disk.total, "disk_used": disk.used, "uptime": int(now - psutil.boot_time()),
              "net_rx": io.bytes_recv, "net_tx": io.bytes_sent, "time": now,
              "rx_rate": max(0, rx_rate) if prev else 0, "tx_rate": max(0, tx_rate) if prev else 0}
    _sys_cache["master"] = master
    out = {"master": master}
    for k in keys:
        out[k] = {kk: v for kk, v in _sys_cache.get(k, {}).items() if not kk.startswith("_")}
    return out
