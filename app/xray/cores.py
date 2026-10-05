"""Extra Xray core configs.

The main config (xray_config.json) runs on the master and on every node by
default. Extra cores are separate full Xray configs kept in the settings table;
a node can be pointed at one of them, e.g. to run the same inbounds on other
ports where the defaults are taken on that server.

Inbounds of every core are merged into ``xray.config``'s inbound maps, so users,
hosts and subscriptions see them like main inbounds. An inbound tag may appear
in several cores (with the same protocol): it is then one inbound for users and
hosts, served by whichever cores define it.
"""
from __future__ import annotations

import secrets
import threading
from typing import Dict, List, Optional, Union

from app import logger
from app.xray.config import XRayConfig

MAIN = "main"
SETTINGS_KEY = "xray_cores"

_lock = threading.RLock()

# core id -> {"name": str, "config": XRayConfig}
extra: Dict[str, dict] = {}
# node id -> core id, only for nodes that don't run the main core
node_cores: Dict[int, str] = {}


def _xray():
    from app import xray
    return xray


def _load_raw() -> dict:
    from app.db import GetDB, crud
    with GetDB() as db:
        data = crud.get_setting(db, SETTINGS_KEY) or {}
    return {"cores": list(data.get("cores") or []), "nodes": dict(data.get("nodes") or {})}


def _save_raw(data: dict):
    from app.db import GetDB, crud
    with GetDB() as db:
        crud.set_setting(db, SETTINGS_KEY, data)


def reload():
    """Read extra cores from the database and merge their inbounds into the main config"""
    with _lock:
        data = _load_raw()
        loaded = {}
        for core in data["cores"]:
            try:
                cfg = XRayConfig(core["config"], api_port=_xray().config.api_port)
            except Exception as exc:
                logger.warning(f"Core \"{core.get('name')}\" skipped, invalid config: {exc}")
                continue
            loaded[core["id"]] = {"name": core.get("name") or core["id"], "config": cfg}
        extra.clear()
        extra.update(loaded)
        node_cores.clear()
        node_cores.update({int(k): v for k, v in data["nodes"].items() if v in extra})
        attach()


def attach():
    """(Re)merge extra cores' inbounds into ``xray.config``. Call after replacing xray.config."""
    _xray().config.attach_extra([c["config"] for c in extra.values()])


def check_conflicts(config: XRayConfig, core_id: str):
    """Raise ValueError when an inbound tag is reused with another protocol"""
    others = [(MAIN, _xray().config.own_inbounds_by_tag)] + [
        (cid, c["config"].inbounds_by_tag) for cid, c in extra.items() if cid != core_id
    ]
    if core_id == MAIN:
        others = others[1:]
    for tag, inbound in config.inbounds_by_tag.items():
        for cid, by_tag in others:
            other = by_tag.get(tag)
            if other and other["protocol"] != inbound["protocol"]:
                name = "Main" if cid == MAIN else extra[cid]["name"]
                raise ValueError(
                    f"inbound tag \"{tag}\" is {other['protocol']} in core \"{name}\","
                    f" it can't be {inbound['protocol']} here")


def core_of(node_id: int) -> str:
    core_id = node_cores.get(node_id, MAIN)
    return core_id if core_id in extra else MAIN


def config_of(core_id: str) -> XRayConfig:
    if core_id != MAIN and core_id in extra:
        return extra[core_id]["config"]
    return _xray().config


def nodes_of(core_id: str) -> List[int]:
    """Ids of the loaded (enabled) nodes running this core"""
    return [nid for nid in _xray().nodes if core_of(nid) == core_id]


class ConfigSet:
    """Startup configs (with users) built once per core, for restarting many nodes at once"""

    def __init__(self, main: Optional[XRayConfig] = None):
        self._built: Dict[str, XRayConfig] = {}
        if main is not None:
            self._built[MAIN] = main

    def get(self, core_id: str) -> XRayConfig:
        if core_id not in self._built:
            self._built[core_id] = config_of(core_id).include_db_users()
        return self._built[core_id]

    def for_node(self, node_id: int) -> XRayConfig:
        return self.get(core_of(node_id))


def resolve(node_id: int, config: Union[None, XRayConfig, ConfigSet]) -> XRayConfig:
    """The startup config a node should run. A plain config passed in is taken as the
    main core's one and only used when the node runs the main core."""
    if isinstance(config, ConfigSet):
        return config.for_node(node_id)
    core_id = core_of(node_id)
    if core_id == MAIN and config is not None:
        return config
    return config_of(core_id).include_db_users()


# ------------------------------------------------------------------ storage

def list_cores() -> List[dict]:
    main = _xray().config
    result = [{
        "id": MAIN,
        "name": "Main",
        "inbounds": list(main.own_inbounds_by_tag),
    }]
    for cid, core in extra.items():
        result.append({
            "id": cid,
            "name": core["name"],
            "inbounds": list(core["config"].inbounds_by_tag),
        })
    return result


def raw_config(core_id: str) -> Optional[dict]:
    for core in _load_raw()["cores"]:
        if core["id"] == core_id:
            return core["config"]
    return None


def create(name: str, config: dict) -> str:
    with _lock:
        cfg = XRayConfig(config, api_port=_xray().config.api_port)
        core_id = secrets.token_hex(4)
        check_conflicts(cfg, core_id)
        _xray().core.test_config(cfg)
        data = _load_raw()
        data["cores"].append({"id": core_id, "name": name, "config": config})
        _save_raw(data)
        reload()
        return core_id


def update(core_id: str, name: Optional[str] = None, config: Optional[dict] = None):
    with _lock:
        if config is not None:
            cfg = XRayConfig(config, api_port=_xray().config.api_port)
            check_conflicts(cfg, core_id)
            _xray().core.test_config(cfg)
        data = _load_raw()
        for core in data["cores"]:
            if core["id"] == core_id:
                if name is not None:
                    core["name"] = name
                if config is not None:
                    core["config"] = config
                break
        else:
            raise KeyError(core_id)
        _save_raw(data)
        reload()


def delete(core_id: str) -> List[int]:
    """Remove a core; its nodes fall back to the main core. Returns those node ids."""
    with _lock:
        data = _load_raw()
        data["cores"] = [c for c in data["cores"] if c["id"] != core_id]
        moved = [int(k) for k, v in data["nodes"].items() if v == core_id]
        data["nodes"] = {k: v for k, v in data["nodes"].items() if v != core_id}
        _save_raw(data)
        reload()
        return moved


def set_node_core(node_id: int, core_id: Optional[str]) -> bool:
    """Point a node at a core. Returns True when it changed."""
    core_id = core_id or MAIN
    if core_id != MAIN and core_id not in extra:
        raise KeyError(core_id)
    with _lock:
        if core_of(node_id) == core_id:
            return False
        data = _load_raw()
        data["nodes"].pop(str(node_id), None)
        if core_id != MAIN:
            data["nodes"][str(node_id)] = core_id
        _save_raw(data)
        node_cores.pop(node_id, None)
        if core_id != MAIN:
            node_cores[node_id] = core_id
        return True


def forget_node(node_id: int):
    with _lock:
        if node_id not in node_cores:
            return
        data = _load_raw()
        data["nodes"].pop(str(node_id), None)
        _save_raw(data)
        node_cores.pop(node_id, None)
