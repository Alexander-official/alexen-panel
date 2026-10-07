from functools import lru_cache
from typing import TYPE_CHECKING

from sqlalchemy.exc import SQLAlchemyError

from app import logger, xray
from app.db import GetDB, crud
from app.models.node import NodeStatus
from app.models.user import UserResponse
from app.utils.concurrency import threaded_function
from app.xray import cores
from app.xray.config import user_email
from app.xray.node import XRayNode
from xray_api import XRay as XRayAPI
from xray_api.types.account import Account, XTLSFlows

if TYPE_CHECKING:
    from app.db import User as DBUser
    from app.db.models import Node as DBNode


@lru_cache(maxsize=None)
def get_tls():
    from app.db import GetDB, get_tls_certificate
    with GetDB() as db:
        tls = get_tls_certificate(db)
        return {
            "key": tls.key,
            "certificate": tls.certificate
        }


@threaded_function
def _add_user_to_inbound(api: XRayAPI, inbound_tag: str, account: Account):
    try:
        api.add_inbound_user(tag=inbound_tag, user=account, timeout=30)
    except (xray.exc.EmailExistsError, xray.exc.TagNotFoundError, xray.exc.ConnectionError):
        pass


@threaded_function
def _remove_user_from_inbound(api: XRayAPI, inbound_tag: str, email: str):
    try:
        api.remove_inbound_user(tag=inbound_tag, email=email, timeout=30)
    except (xray.exc.EmailNotFoundError, xray.exc.TagNotFoundError, xray.exc.ConnectionError):
        pass


@threaded_function
def _alter_inbound_user(api: XRayAPI, inbound_tag: str, account: Account):
    try:
        api.remove_inbound_user(tag=inbound_tag, email=account.email, timeout=30)
    except (xray.exc.EmailNotFoundError, xray.exc.TagNotFoundError, xray.exc.ConnectionError):
        pass
    try:
        api.add_inbound_user(tag=inbound_tag, user=account, timeout=30)
    except (xray.exc.EmailExistsError, xray.exc.TagNotFoundError, xray.exc.ConnectionError):
        pass


def add_user(dbuser: "DBUser"):
    user = UserResponse.model_validate(dbuser)

    for proxy_type, inbound_tags in user.inbounds.items():
        for inbound_tag in inbound_tags:
            inbound = xray.config.inbounds_by_tag.get(inbound_tag, {})

            try:
                proxy_settings = user.proxies[proxy_type].dict(no_obj=True)
            except KeyError:
                pass
            account = proxy_type.account_model(
                email=user_email(dbuser.id, dbuser.username, inbound_tag), **proxy_settings)

            # XTLS currently only supports transmission methods of TCP and mKCP
            if getattr(account, 'flow', None) and (
                inbound.get('network', 'tcp') not in ('tcp', 'kcp')
                or
                (
                    inbound.get('network', 'tcp') in ('tcp', 'kcp')
                    and
                    inbound.get('tls') not in ('tls', 'reality')
                )
                or
                inbound.get('header_type') == 'http'
            ):
                account.flow = XTLSFlows.NONE

            _add_user_to_inbound(xray.api, inbound_tag, account)  # main core
            for node in list(xray.nodes.values()):
                if node.connected and node.started:
                    _add_user_to_inbound(node.api, inbound_tag, account)


def remove_user(dbuser: "DBUser"):
    for inbound_tag in xray.config.inbounds_by_tag:
        email = user_email(dbuser.id, dbuser.username, inbound_tag)
        _remove_user_from_inbound(xray.api, inbound_tag, email)
        for node in list(xray.nodes.values()):
            if node.connected and node.started:
                _remove_user_from_inbound(node.api, inbound_tag, email)
    # Xray keeps sessions that are already open (Hysteria2 especially): cut them
    kick_user(dbuser.id)


# ---- cutting live sessions of users that were disabled / deleted / limited ----
import threading as _threading

_kick_lock = _threading.Lock()
_kick_pending: set = set()
_kick_timer = None
KICK_DELAY = 2.0   # seconds: users switched off together share one restart


def kick_user(user_id: int):
    """drop the open connections of this user soon (batched)"""
    global _kick_timer
    with _kick_lock:
        _kick_pending.add(user_id)
        if _kick_timer is None:
            _kick_timer = _threading.Timer(KICK_DELAY, _do_kick)
            _kick_timer.daemon = True
            _kick_timer.start()


_known_servers: dict = {}   # user id -> servers, saved before a delete wipes its usage rows


def remember_servers(user_id: int):
    """call before deleting a user: afterwards nothing in the DB says where it was"""
    try:
        _known_servers[user_id] = _servers_of([user_id])
    except Exception as exc:
        logger.warning(f"kick: {exc}")


def _servers_of(user_ids) -> set:
    """names of the servers these users are connected to right now (or were, a
    moment ago: the online list is refreshed every few seconds)"""
    from datetime import datetime, timedelta
    from app.xray import online
    from app.db.models import Node, NodeUserUsage, User
    names = set()
    recent = []
    for uid in user_ids:
        names |= _known_servers.pop(uid, set())
        for entry in online.get_user_ips(uid).values():
            names.update(entry.get("nodes") or [])
        recent.append(uid)
    with GetDB() as db:
        since = datetime.utcnow() - timedelta(minutes=3)
        rows = dict(db.query(User.id, User.online_at).filter(User.id.in_(recent)).all())
        # online lately, or just deleted (no row left to tell)
        active = [uid for uid in recent if uid not in rows or (rows[uid] and rows[uid] >= since)]
        if active:
            node_names = dict(db.query(Node.id, Node.name).all())
            # usage rows are hourly buckets stamped with the hour they start
            hour = datetime.utcnow() - timedelta(hours=2)
            for (nid,) in db.query(NodeUserUsage.node_id).filter(
                    NodeUserUsage.user_id.in_(active), NodeUserUsage.created_at >= hour).distinct():
                names.add(online.MASTER_NAME if nid is None else node_names.get(nid, ""))
    names.discard("")
    return names


def _do_kick():
    global _kick_timer
    with _kick_lock:
        users = set(_kick_pending)
        _kick_pending.clear()
        _kick_timer = None
    if not users:
        return
    # VPN peers / clients go away at once instead of on the next sync
    try:
        from app import vpn
        _threading.Thread(target=vpn.sync, daemon=True).start()
    except Exception as exc:
        logger.warning(f"kick: VPN sync failed: {exc}")
    try:
        names = _servers_of(users)
    except Exception as exc:
        logger.warning(f"kick: {exc}")
        return
    if not names:
        return
    from app.xray import online
    logger.info(f"Cutting live sessions of {len(users)} user(s) on: {', '.join(sorted(names))}")
    configs = cores.ConfigSet()
    if online.MASTER_NAME in names:
        try:
            xray.core.restart(configs.get(cores.MAIN))
        except Exception as exc:
            logger.warning(f"kick: master core restart failed: {exc}")
    with GetDB() as db:
        from app.db.models import Node
        ids = {name: nid for nid, name in db.query(Node.id, Node.name).all()}
    for name in names:
        nid = ids.get(name)
        if nid is not None:
            try:
                restart_node(nid, configs)
            except Exception as exc:
                logger.warning(f"kick: node {name} restart failed: {exc}")


def update_user(dbuser: "DBUser"):
    user = UserResponse.model_validate(dbuser)

    active_inbounds = []
    for proxy_type, inbound_tags in user.inbounds.items():
        for inbound_tag in inbound_tags:
            active_inbounds.append(inbound_tag)
            inbound = xray.config.inbounds_by_tag.get(inbound_tag, {})

            try:
                proxy_settings = user.proxies[proxy_type].dict(no_obj=True)
            except KeyError:
                pass
            account = proxy_type.account_model(
                email=user_email(dbuser.id, dbuser.username, inbound_tag), **proxy_settings)

            # XTLS currently only supports transmission methods of TCP and mKCP
            if getattr(account, 'flow', None) and (
                inbound.get('network', 'tcp') not in ('tcp', 'kcp')
                or
                (
                    inbound.get('network', 'tcp') in ('tcp', 'kcp')
                    and
                    inbound.get('tls') not in ('tls', 'reality')
                )
                or
                inbound.get('header_type') == 'http'
            ):
                account.flow = XTLSFlows.NONE

            _alter_inbound_user(xray.api, inbound_tag, account)  # main core
            for node in list(xray.nodes.values()):
                if node.connected and node.started:
                    _alter_inbound_user(node.api, inbound_tag, account)

    for inbound_tag in xray.config.inbounds_by_tag:
        if inbound_tag in active_inbounds:
            continue
        # remove disabled inbounds
        email = user_email(dbuser.id, dbuser.username, inbound_tag)
        _remove_user_from_inbound(xray.api, inbound_tag, email)
        for node in list(xray.nodes.values()):
            if node.connected and node.started:
                _remove_user_from_inbound(node.api, inbound_tag, email)


def remove_node(node_id: int):
    if node_id in xray.nodes:
        try:
            xray.nodes[node_id].disconnect()
        except Exception:
            pass
        finally:
            try:
                del xray.nodes[node_id]
            except KeyError:
                pass


def add_node(dbnode: "DBNode"):
    remove_node(dbnode.id)

    tls = get_tls()
    xray.nodes[dbnode.id] = XRayNode(address=dbnode.address,
                                     port=dbnode.port,
                                     api_port=dbnode.api_port,
                                     ssl_key=tls['key'],
                                     ssl_cert=tls['certificate'],
                                     usage_coefficient=dbnode.usage_coefficient)

    return xray.nodes[dbnode.id]


def _change_node_status(node_id: int, status: NodeStatus, message: str = None, version: str = None):
    with GetDB() as db:
        try:
            dbnode = crud.get_node_by_id(db, node_id)
            if not dbnode:
                return

            if dbnode.status == NodeStatus.disabled:
                remove_node(dbnode.id)
                return

            crud.update_node_status(db, dbnode, status, message, version)
        except SQLAlchemyError:
            db.rollback()


global _connecting_nodes
_connecting_nodes = {}


@threaded_function
def connect_node(node_id, config=None):
    global _connecting_nodes

    if _connecting_nodes.get(node_id):
        return

    with GetDB() as db:
        dbnode = crud.get_node_by_id(db, node_id)

    if not dbnode:
        return

    try:
        node = xray.nodes[dbnode.id]
        assert node.connected
    except (KeyError, AssertionError):
        node = xray.operations.add_node(dbnode)

    try:
        _connecting_nodes[node_id] = True

        _change_node_status(node_id, NodeStatus.connecting)
        logger.info(f"Connecting to \"{dbnode.name}\" node")

        config = cores.resolve(node_id, config)

        node.start(config)
        version = node.get_version()
        _change_node_status(node_id, NodeStatus.connected, version=version)
        logger.info(f"Connected to \"{dbnode.name}\" node, xray run on v{version}")

    except Exception as e:
        _change_node_status(node_id, NodeStatus.error, message=str(e))
        logger.info(f"Unable to connect to \"{dbnode.name}\" node")

    finally:
        try:
            del _connecting_nodes[node_id]
        except KeyError:
            pass


@threaded_function
def restart_node(node_id, config=None):
    with GetDB() as db:
        dbnode = crud.get_node_by_id(db, node_id)

    if not dbnode:
        return

    try:
        node = xray.nodes[dbnode.id]
    except KeyError:
        node = xray.operations.add_node(dbnode)

    if not node.connected:
        return connect_node(node_id, config)

    try:
        logger.info(f"Restarting Xray core of \"{dbnode.name}\" node")

        config = cores.resolve(node_id, config)

        node.restart(config)
        logger.info(f"Xray core of \"{dbnode.name}\" node restarted")
    except Exception as e:
        _change_node_status(node_id, NodeStatus.error, message=str(e))
        logger.info(f"Unable to restart node {node_id}")
        try:
            node.disconnect()
        except Exception:
            pass


def terminate_ip(dbuser: "DBUser", ip: str):
    """Hard-kick one IP: block it, then restart the cores it's connected to so the
    live session is dropped, then re-apply the block. Other users reconnect in ~1s."""
    import time
    from app import xray
    from app.xray import ip_limit, online

    ip_limit.ban_ip(dbuser.id, ip)
    ip_limit.enforce_now()

    node_names = {e for e in online.get_user_ips(dbuser.id).get(ip, {}).get("nodes", [])}

    # IP isn't connected anywhere right now: just keep the block, no core restart needed
    if not node_names:
        return

    configs = cores.ConfigSet()
    config = configs.get(cores.MAIN)

    if online.MASTER_NAME in node_names:
        try:
            xray.core.restart(config)
        except Exception as exc:
            logger.warning(f"terminate: master core restart failed: {exc}")

    if node_names:
        with GetDB() as db:
            from app.db.models import Node
            ids = {name: nid for nid, name in db.query(Node.id, Node.name).all()}
        for name in node_names:
            if name == online.MASTER_NAME:
                continue
            nid = ids.get(name)
            if nid is not None:
                try:
                    xray.operations.restart_node(nid, configs)
                except Exception as exc:
                    logger.warning(f"terminate: node {name} restart failed: {exc}")

    time.sleep(2)
    ip_limit.enforce_now()


__all__ = [
    "add_user",
    "remove_user",
    "kick_user",
    "remember_servers",
    "terminate_ip",
    "add_node",
    "remove_node",
    "connect_node",
    "restart_node",
]
