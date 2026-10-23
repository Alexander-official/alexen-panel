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


class SavedKey(BaseModel):
    """a reusable SSH private key in the panel's key library (encrypted at rest)"""
    id: str = ""
    name: str = Field("", max_length=64)
    key_enc: str = ""          # encrypted private key (PEM/OpenSSH)
    passphrase_enc: str = ""   # encrypted passphrase (if any)
    public: str = ""           # the public key (safe to show), for authorized_keys
    created: str = ""


class Extras(BaseModel):
    nodes: Dict[str, NodeExtra] = {}
    keys: list = []            # List[SavedKey] (dicts); the SSH key library


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


# ---- SSH key library ----

def list_keys(db=None) -> list:
    """saved keys without the private part (id, name, public, created)"""
    out = []
    for k in load(db).keys:
        k = k if isinstance(k, dict) else k
        out.append({"id": k.get("id"), "name": k.get("name"), "public": k.get("public", ""),
                    "created": k.get("created", "")})
    return out


def get_key(db, key_id: str):
    """(private_key, passphrase) in plaintext for a saved key, or (None, None)"""
    for k in load(db).keys:
        if k.get("id") == key_id:
            return decrypt(k.get("key_enc", "")), decrypt(k.get("passphrase_enc", ""))
    return None, None


def _derive_public(private_key: str, passphrase: str = "") -> str:
    try:
        import paramiko, io
        for cls in (paramiko.Ed25519Key, paramiko.RSAKey, paramiko.ECDSAKey):
            try:
                k = cls.from_private_key(io.StringIO(private_key), password=passphrase or None)
                return f"{k.get_name()} {k.get_base64()}"
            except Exception:
                continue
    except Exception:
        pass
    return ""


def add_key(db, name: str, private_key: str, passphrase: str = "") -> dict:
    import uuid as _uuid
    from datetime import datetime
    e = load(db)
    pub = _derive_public(private_key, passphrase)
    if not pub:
        raise ValueError("Could not read this private key (unsupported or wrong passphrase).")
    entry = {"id": _uuid.uuid4().hex[:12], "name": (name or "key").strip()[:64],
             "key_enc": encrypt(private_key), "passphrase_enc": encrypt(passphrase or ""),
             "public": pub, "created": datetime.utcnow().isoformat(timespec="seconds")}
    e.keys = list(e.keys) + [entry]
    save(db, e)
    return {"id": entry["id"], "name": entry["name"], "public": pub, "created": entry["created"]}


def generate_key(db, name: str) -> dict:
    """create a new Ed25519 keypair, store it, return the public key to add on the VPS"""
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
    from cryptography.hazmat.primitives import serialization
    pk = Ed25519PrivateKey.generate()
    priv = pk.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.OpenSSH,
                            serialization.NoEncryption()).decode()
    return add_key(db, name, priv, "")


def delete_key(db, key_id: str) -> bool:
    e = load(db)
    kept = [k for k in e.keys if k.get("id") != key_id]
    if len(kept) == len(e.keys):
        return False
    e.keys = kept
    save(db, e)
    return True
