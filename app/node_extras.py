"""Things the panel keeps about a node besides the Marzban columns: its flag
(country, optional) and, if the admin saved them, the VPS's SSH login (used
to install the node and the agent). Stored in the settings table; the SSH
secrets are encrypted with a key derived from the panel's JWT secret."""
import base64
import hashlib
from typing import Dict, Optional

from pydantic import BaseModel, Field

SETTINGS_KEY = "node_extras"


class SSHLogin(BaseModel):
    host: str = ""                 # empty: the node's address
    port: int = Field(22, ge=1, le=65535)
    username: str = "root"
    auth: str = Field("password", pattern="^(password|key)$")
    secret: str = ""               # encrypted password or private key
    passphrase: str = ""           # encrypted key passphrase


class NodeExtra(BaseModel):
    flag: str = Field("", max_length=8)    # ISO country code, e.g. "DE"
    ssh: Optional[SSHLogin] = None
    # how the panel reaches the node: its own ports, or through SSH (app/node_tunnel.py)
    transport: str = Field("direct", pattern="^(direct|ssh)$")


class Extras(BaseModel):
    nodes: Dict[str, NodeExtra] = {}


def load(db=None) -> Extras:
    from app.db import GetDB, crud
    if db is None:
        with GetDB() as session:
            return Extras(**(crud.get_setting(session, SETTINGS_KEY) or {}))
    return Extras(**(crud.get_setting(db, SETTINGS_KEY) or {}))


def save(db, e: Extras):
    from app.db import crud
    crud.set_setting(db, SETTINGS_KEY, e.model_dump())


def get(db, node_id) -> NodeExtra:
    return load(db).nodes.get(str(node_id)) or NodeExtra()


def put(db, node_id, extra: NodeExtra):
    e = load(db)
    e.nodes[str(node_id)] = extra
    save(db, e)


def drop(db, node_id):
    e = load(db)
    if e.nodes.pop(str(node_id), None) is not None:
        save(db, e)


def flags(db=None) -> Dict[int, str]:
    return {int(k): v.flag for k, v in load(db).nodes.items() if v.flag and k.isdigit()}


# ---- secrets ----

def _fernet():
    from cryptography.fernet import Fernet
    from app.db import GetDB, crud
    with GetDB() as db:
        secret = crud.get_jwt_secret_key(db)
    key = base64.urlsafe_b64encode(hashlib.sha256(("alexen-node-ssh:" + secret).encode()).digest())
    return Fernet(key)


def encrypt(text: str) -> str:
    return _fernet().encrypt(text.encode()).decode() if text else ""


def decrypt(token: str) -> str:
    if not token:
        return ""
    try:
        return _fernet().decrypt(token.encode()).decode()
    except Exception:
        return ""
