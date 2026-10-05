"""Relay ("chain") servers: a server whose users' traffic leaves through another
server. The relay runs the normal inbounds, so it sees users' real IPs (for
every protocol, UDP included) and counts their traffic; it forwards everything
to the exit server over an internal VLESS + REALITY link.

Nothing of this is stored in the cores: when a config is about to be sent to a
server (cores.resolve for nodes, XRayCore.start for the master), apply() adds
  - on the exit:  an inbound "chain-in-<relay>" for each relay using it
  - on the relay: an outbound "chain-out" in front, so all traffic not routed
                  elsewhere by a rule goes through the exit
The link's client sits on policy level 1, which has no user stats, so it never
shows up as a user and its traffic isn't counted twice.

Settings live in the settings table under "chain"."""
import base64
import copy
import secrets
import uuid as uuidlib
from typing import Dict, Optional

from pydantic import BaseModel, Field

from app import logger

SETTINGS_KEY = "chain"
MASTER = "master"
OUT_TAG = "chain-out"
IN_PREFIX = "chain-in-"
LINK_LEVEL = 1  # no statsUser* on this level (only level 0 has them)


def _reality_keys():
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric import x25519
    k = x25519.X25519PrivateKey.generate()
    raw = k.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
    pub = k.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    enc = lambda b: base64.urlsafe_b64encode(b).decode().rstrip("=")
    return enc(raw), enc(pub)


class Link(BaseModel):
    exit: str                                  # "master" or a node id
    port: int = Field(..., ge=1, le=65535)     # the exit's internal inbound port
    # where the relay reaches the exit; empty: the exit's own address
    address: str = Field("", max_length=255)
    sni: str = Field("www.microsoft.com", max_length=255)
    uuid: str = ""
    private_key: str = ""
    public_key: str = ""
    short_id: str = ""


class ChainSettings(BaseModel):
    links: Dict[str, Link] = {}   # relay key -> link


def load(db=None) -> ChainSettings:
    from app.db import GetDB, crud
    if db is not None:
        return ChainSettings(**(crud.get_setting(db, SETTINGS_KEY) or {}))
    with GetDB() as db:
        return ChainSettings(**(crud.get_setting(db, SETTINGS_KEY) or {}))


def save(db, s: ChainSettings) -> ChainSettings:
    from app.db import crud
    for link in s.links.values():
        if not link.uuid:
            link.uuid = str(uuidlib.uuid4())
        if not link.private_key:
            link.private_key, link.public_key = _reality_keys()
        if not link.short_id:
            link.short_id = secrets.token_hex(8)
    crud.set_setting(db, SETTINGS_KEY, s.model_dump())
    return s


def exit_address(db, link: Link) -> str:
    if link.address:
        return link.address
    if link.exit == MASTER:
        from app.vpn import master_public_address
        return master_public_address()
    from app.db.models import Node
    node = db.query(Node).filter(Node.id == int(link.exit)).first()
    return node.address if node else ""


def check(s: ChainSettings, relay: str, link: Optional[Link]) -> None:
    """refuse a link to itself and loops (a -> b -> a)"""
    if link is None:
        return
    if link.exit == relay:
        raise ValueError("A server can't exit through itself")
    seen, cur = {relay}, link.exit
    while cur in s.links and cur != relay:
        if cur in seen:
            break
        seen.add(cur)
        cur = s.links[cur].exit
        if cur == relay:
            raise ValueError("That makes a loop: the exit server already exits through this one")


def _inbound(relay: str, link: Link) -> dict:
    return {
        "tag": IN_PREFIX + relay,
        "listen": "0.0.0.0",
        "port": link.port,
        "protocol": "vless",
        "settings": {
            "clients": [{"id": link.uuid, "flow": "xtls-rprx-vision", "level": LINK_LEVEL,
                         "email": f"chain.{relay}"}],
            "decryption": "none",
        },
        "streamSettings": {
            "network": "tcp",
            "security": "reality",
            "realitySettings": {
                "show": False,
                "dest": f"{link.sni}:443",
                "serverNames": [link.sni],
                "privateKey": link.private_key,
                "shortIds": [link.short_id],
            },
        },
        "sniffing": {"enabled": True, "destOverride": ["http", "tls", "quic"], "routeOnly": True},
    }


def _outbound(address: str, link: Link) -> dict:
    return {
        "tag": OUT_TAG,
        "protocol": "vless",
        "settings": {"vnext": [{"address": address, "port": link.port, "users": [
            {"id": link.uuid, "flow": "xtls-rprx-vision", "encryption": "none", "level": LINK_LEVEL}]}]},
        "streamSettings": {
            "network": "tcp",
            "security": "reality",
            "realitySettings": {"serverName": link.sni, "fingerprint": "chrome",
                                "publicKey": link.public_key, "shortId": link.short_id},
        },
    }


def apply(key: str, config):
    """the config a server should run, with its chain links added (a copy; the
    stored config is left alone). Any failure leaves the config as it was."""
    try:
        from app.db import GetDB
        with GetDB() as db:
            s = load(db)
            if not s.links:
                return config
            as_exit = {relay: link for relay, link in s.links.items() if link.exit == key}
            as_relay = s.links.get(key)
            if not as_exit and not as_relay:
                return config
            config = copy.deepcopy(config)
            inbounds = config.setdefault("inbounds", [])
            used = {i.get("port") for i in inbounds}
            for relay, link in as_exit.items():
                if link.port in used:
                    logger.warning(f"chain: port {link.port} for relay {relay} is taken on {key}; link skipped")
                    continue
                inbounds.append(_inbound(relay, link))
            if as_relay:
                address = exit_address(db, as_relay)
                if address:
                    outbounds = [o for o in config.get("outbounds", []) if o.get("tag") != OUT_TAG]
                    # first outbound = where traffic goes when no rule picks another
                    config["outbounds"] = [_outbound(address, as_relay)] + outbounds
            return config
    except Exception as e:
        logger.warning(f"chain: not applied to {key}: {e}")
        return config


def restart_servers(keys) -> None:
    """restart the cores of these servers (exits first, so relays find them up)"""
    from app import xray
    for key in keys:
        try:
            if key == MASTER:
                xray.core.restart(xray.config.include_db_users())
            elif int(key) in xray.nodes:
                xray.operations.restart_node(int(key))
        except Exception as e:
            logger.warning(f"chain: restarting {key} failed: {e}")
