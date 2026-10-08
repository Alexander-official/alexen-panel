from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from operator import attrgetter
from typing import Union

from pymysql.err import OperationalError
from sqlalchemy import and_, bindparam, insert, select, update
from sqlalchemy.orm import Session
from sqlalchemy.sql.dml import Insert

from app import scheduler, xray
from app.xray import traffic
from app.db import GetDB
from app import logger
from app.db.models import Admin, NodeUsage, NodeUserUsage, System, User, UserInboundUsage
from config import (
    DISABLE_RECORDING_NODE_USAGE,
    JOB_RECORD_NODE_USAGES_INTERVAL,
    JOB_RECORD_USER_USAGES_INTERVAL,
)
from xray_api import XRay as XRayAPI
from xray_api import exc as xray_exc


def safe_execute(db: Session, stmt, params=None):
    if db.bind.name == 'mysql':
        if isinstance(stmt, Insert):
            stmt = stmt.prefix_with('IGNORE')

        tries = 0
        done = False
        while not done:
            try:
                db.connection().execute(stmt, params)
                db.commit()
                done = True
            except OperationalError as err:
                if err.args[0] == 1213 and tries < 3:  # Deadlock
                    db.rollback()
                    tries += 1
                    continue
                raise err

    else:
        db.connection().execute(stmt, params)
        db.commit()


def record_user_stats(params: list, node_id: Union[int, None],
                      consumption_factor: int = 1):
    if not params:
        return

    created_at = datetime.fromisoformat(datetime.utcnow().strftime('%Y-%m-%dT%H:00:00'))

    with GetDB() as db:
        # make user usage row if doesn't exist
        select_stmt = select(NodeUserUsage.user_id) \
            .where(and_(NodeUserUsage.node_id == node_id, NodeUserUsage.created_at == created_at))
        existings = [r[0] for r in db.execute(select_stmt).fetchall()]
        uids_to_insert = set()

        for p in params:
            uid = int(p['uid'])
            if uid in existings:
                continue
            uids_to_insert.add(uid)

        if uids_to_insert:
            stmt = insert(NodeUserUsage).values(
                user_id=bindparam('uid'),
                created_at=created_at,
                node_id=node_id,
                used_traffic=0
            )
            safe_execute(db, stmt, [{'uid': uid} for uid in uids_to_insert])

        # record
        stmt = update(NodeUserUsage) \
            .values(used_traffic=NodeUserUsage.used_traffic + bindparam('value') * consumption_factor) \
            .where(and_(NodeUserUsage.user_id == bindparam('uid'),
                        NodeUserUsage.node_id == node_id,
                        NodeUserUsage.created_at == created_at))
        safe_execute(db, stmt, params)


def record_node_stats(params: dict, node_id: Union[int, None]):
    if not params:
        return

    created_at = datetime.fromisoformat(datetime.utcnow().strftime('%Y-%m-%dT%H:00:00'))

    with GetDB() as db:

        # make node usage row if doesn't exist
        select_stmt = select(NodeUsage.node_id). \
            where(and_(NodeUsage.node_id == node_id, NodeUsage.created_at == created_at))
        notfound = db.execute(select_stmt).first() is None
        if notfound:
            stmt = insert(NodeUsage).values(created_at=created_at, node_id=node_id, uplink=0, downlink=0)
            safe_execute(db, stmt)

        # record
        stmt = update(NodeUsage). \
            values(uplink=NodeUsage.uplink + bindparam('up'), downlink=NodeUsage.downlink + bindparam('down')). \
            where(and_(NodeUsage.node_id == node_id, NodeUsage.created_at == created_at))

        safe_execute(db, stmt, params)


def get_users_stats(api: XRayAPI):
    """Returns users usage, and the same usage split per inbound (from the «|<inbound tag>» part of the email)"""
    try:
        params = defaultdict(int)
        inbound_params = defaultdict(int)
        for stat in filter(attrgetter('value'), api.get_users_stats(reset=True, timeout=30)):
            uid = stat.name.split('.', 1)[0]
            params[uid] += stat.value
            if '|' in stat.name:
                inbound_params[(uid, stat.name.split('|', 1)[1])] += stat.value
        params = list({"uid": uid, "value": value} for uid, value in params.items())
        inbound_params = list({"uid": uid, "tag": tag, "value": value}
                              for (uid, tag), value in inbound_params.items())
        return params, inbound_params
    except xray_exc.XrayError:
        return None


def record_user_inbound_stats(params: list):
    if not params:
        return

    with GetDB() as db:
        select_stmt = select(UserInboundUsage.user_id, UserInboundUsage.inbound_tag) \
            .where(UserInboundUsage.user_id.in_({int(p['uid']) for p in params}))
        existings = set(db.execute(select_stmt).fetchall())
        rows_to_insert = {(int(p['uid']), p['tag']) for p in params} - existings
        if rows_to_insert:
            stmt = insert(UserInboundUsage).values(
                user_id=bindparam('uid'),
                inbound_tag=bindparam('tag'),
                used_traffic=0
            )
            safe_execute(db, stmt, [{'uid': uid, 'tag': tag} for uid, tag in rows_to_insert])

        stmt = update(UserInboundUsage) \
            .values(used_traffic=UserInboundUsage.used_traffic + bindparam('value')) \
            .where(and_(UserInboundUsage.user_id == bindparam('uid'),
                        UserInboundUsage.inbound_tag == bindparam('tag')))
        safe_execute(db, stmt, params)


def get_outbounds_stats(api: XRayAPI, server: str = "master"):
    try:
        stats = list(filter(attrgetter('value'), api.get_outbounds_stats(reset=True, timeout=10)))
        try:  # per-outbound totals for the Outbounds page
            from app import outbound_tools
            outbound_tools.add(server, [(stat.name, stat.link, stat.value) for stat in stats])
        except Exception:
            pass
        # a relay's link to its exit (app/xray/chain.py) is counted on the exit already
        params = [{"up": stat.value, "down": 0} if stat.link == "uplink" else {"up": 0, "down": stat.value}
                  for stat in stats if stat.name != "chain-out"]
        return params
    except xray_exc.XrayError:
        return []


def record_user_usages():
    api_instances = {None: xray.api}
    usage_coefficient = {None: 1}  # default usage coefficient for the main api instance

    for node_id, node in list(xray.nodes.items()):
        if node.connected and node.started:
            api_instances[node_id] = node.api
            usage_coefficient[node_id] = node.usage_coefficient  # fetch the usage coefficient

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {node_id: executor.submit(get_users_stats, api) for node_id, api in api_instances.items()}
    results = {node_id: future.result() for node_id, future in futures.items()}
    # live speeds; cores that didn't answer are left out rather than counted as idle
    answered = [node_id for node_id, result in results.items() if result is not None]
    results = {node_id: result or ([], []) for node_id, result in results.items()}
    # AmneziaWG / OpenVPN traffic (app/vpn) counts like any inbound of that server
    try:
        from app import vpn
        for node_id, (user_params, inbound_params) in vpn.collect_usage().items():
            got = results.setdefault(node_id, ([], []))
            results[node_id] = (list(got[0]) + user_params, list(got[1]) + inbound_params)
            if node_id not in answered:
                answered.append(node_id)
    except Exception as e:
        logger.warning(f"VPN usage: {e}")
    try:
        traffic.record({node_id: result[1] for node_id, result in results.items()}, answered)
    except Exception:
        pass
    api_params = {node_id: result[0] for node_id, result in results.items()}

    inbounds_usage = defaultdict(int)
    for node_id, (_, inbound_params) in results.items():
        coefficient = usage_coefficient.get(node_id, 1)
        for param in inbound_params:
            inbounds_usage[(int(param['uid']), param['tag'])] += int(param['value'] * coefficient)

    users_usage = defaultdict(int)
    for node_id, params in api_params.items():
        coefficient = usage_coefficient.get(node_id, 1)  # get the usage coefficient for the node
        for param in params:
            users_usage[param['uid']] += int(param['value'] * coefficient)  # apply the usage coefficient
    users_usage = list({"uid": uid, "value": value} for uid, value in users_usage.items())
    if not users_usage:
        return
    from app import antitheft
    antitheft.feed(users_usage)

    with GetDB() as db:
        user_admin_map = dict(db.query(User.id, User.admin_id).all())

    admin_usage = defaultdict(int)
    for user_usage in users_usage:
        admin_id = user_admin_map.get(int(user_usage["uid"]))
        if admin_id:
            admin_usage[admin_id] += user_usage["value"]

    # record users usage
    with GetDB() as db:
        stmt = update(User). \
            where(User.id == bindparam('uid')). \
            values(
                used_traffic=User.used_traffic + bindparam('value'),
                online_at=datetime.utcnow()
        )

        safe_execute(db, stmt, users_usage)

        # users that got deleted meanwhile have no row to reference
        existing_uids = {uid for (uid,) in db.query(User.id).filter(
            User.id.in_({uid for uid, _ in inbounds_usage})).all()}

        admin_data = [{"admin_id": admin_id, "value": value} for admin_id, value in admin_usage.items()]
        if admin_data:
            admin_update_stmt = update(Admin). \
                where(Admin.id == bindparam('admin_id')). \
                values(users_usage=Admin.users_usage + bindparam('value'))
            safe_execute(db, admin_update_stmt, admin_data)

    record_user_inbound_stats([{"uid": uid, "tag": tag, "value": value}
                               for (uid, tag), value in inbounds_usage.items() if uid in existing_uids])
    try:
        from app import stats_history
        per_inbound = defaultdict(int)
        for (_, tag), value in inbounds_usage.items():
            per_inbound[tag] += value
        stats_history.record_inbounds(per_inbound)
    except Exception as e:
        logger.warning(f"stat history: {e}")

    if DISABLE_RECORDING_NODE_USAGE:
        return

    for node_id, params in api_params.items():
        record_user_stats(params, node_id, usage_coefficient.get(node_id, 1))


def record_node_usages():
    api_instances = {None: xray.api}
    for node_id, node in list(xray.nodes.items()):
        if node.connected and node.started:
            api_instances[node_id] = node.api

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {node_id: executor.submit(get_outbounds_stats, api, "master" if node_id is None else str(node_id))
                   for node_id, api in api_instances.items()}
    api_params = {node_id: future.result() for node_id, future in futures.items()}

    total_up = 0
    total_down = 0
    for node_id, params in api_params.items():
        for param in params:
            total_up += param['up']
            total_down += param['down']
    if not (total_up or total_down):
        return

    # record nodes usage
    with GetDB() as db:
        stmt = update(System).values(
            uplink=System.uplink + total_up,
            downlink=System.downlink + total_down
        )
        safe_execute(db, stmt)

    if DISABLE_RECORDING_NODE_USAGE:
        return

    for node_id, params in api_params.items():
        record_node_stats(params, node_id)


scheduler.add_job(record_user_usages, 'interval',
                  seconds=JOB_RECORD_USER_USAGES_INTERVAL,
                  coalesce=True, max_instances=1)
scheduler.add_job(record_node_usages, 'interval',
                  seconds=JOB_RECORD_NODE_USAGES_INTERVAL,
                  coalesce=True, max_instances=1)
