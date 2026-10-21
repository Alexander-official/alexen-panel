"""HTTP clients for the external panels Alexen can pull from (3x-ui and s-ui).

Both flows were verified against live panels:
  3x-ui 3.10.x : GET {base}{path}            -> csrf-token <meta> + session cookie
                 POST {base}{path}login      (JSON {username,password} + X-CSRF-Token)
                 GET  {base}{path}panel/api/inbounds/list
  s-ui 1.6.x   : POST {base}{path}api/login  (FORM user/pass, no csrf) -> cookie
                 GET  {base}{path}api/inbounds

`path` is the panel's web base path (3x-ui usually "/", s-ui "/app/").
"""
import re
from typing import List, Dict, Any

import requests

_CSRF_RE = re.compile(r'name="csrf-token"\s+content="([^"]+)"')


def _decrypt(enc: str) -> str:
    if not enc:
        return ""
    from app import node_extras  # lazy: keeps this module importable standalone (tests)
    return node_extras.decrypt(enc)


class PanelError(Exception):
    pass


class BaseClient:
    kind = ""

    def __init__(self, address: str, panel_path: str = "/", username: str = "",
                 password: str = "", password_enc: str = "", token: str = "", timeout: int = 20):
        self.base = (address or "").rstrip("/")
        p = "/" + (panel_path or "/").strip("/")
        self.path = p if p == "/" else p + "/"
        self.username = username or ""
        self.password = password or _decrypt(password_enc)
        self.token = token or ""
        self.timeout = timeout
        self.s = requests.Session()
        self.s.headers["User-Agent"] = "Alexen"
        self.s.verify = False  # self-signed panels are common

    @classmethod
    def from_panel(cls, panel) -> "BaseClient":
        """build the right client from an ExternalPanel row (or anything with the same attrs)"""
        kind = getattr(panel, "kind", "")
        impl = {"3xui": ThreeXUI, "sui": SUI}.get(kind)
        if not impl:
            raise PanelError(f"unknown panel kind: {kind!r}")
        return impl(
            address=panel.address, panel_path=getattr(panel, "panel_path", "/") or "/",
            username=getattr(panel, "username", ""), password_enc=getattr(panel, "password_enc", ""),
            token=getattr(panel, "token", "") or "",
        )

    def url(self, suffix: str) -> str:
        return self.base + self.path + suffix.lstrip("/")

    def login(self) -> None:
        raise NotImplementedError

    def raw_inbounds(self) -> List[dict]:
        raise NotImplementedError

    def test(self) -> Dict[str, Any]:
        """login + count inbounds; raises PanelError on failure"""
        self.login()
        inbs = self.raw_inbounds()
        return {"ok": True, "inbounds": len(inbs)}


class ThreeXUI(BaseClient):
    kind = "3xui"

    def login(self) -> None:
        try:
            r = self.s.get(self.base + self.path, timeout=self.timeout)
            m = _CSRF_RE.search(r.text or "")
            self.csrf = m.group(1) if m else ""
            r = self.s.post(
                self.url("login"),
                json={"username": self.username, "password": self.password},
                headers={"X-CSRF-Token": self.csrf, "Origin": self.base},
                timeout=self.timeout,
            )
        except requests.RequestException as e:
            raise PanelError(f"can't reach the panel: {e}")
        try:
            data = r.json()
        except ValueError:
            raise PanelError(f"unexpected login response ({r.status_code})")
        if not data.get("success"):
            raise PanelError(data.get("msg") or "wrong username or password")
        # a fresh csrf for the authed POST/GET calls
        try:
            r2 = self.s.get(self.url("panel/"), timeout=self.timeout)
            m2 = _CSRF_RE.search(r2.text or "")
            if m2:
                self.csrf = m2.group(1)
        except requests.RequestException:
            pass

    def raw_inbounds(self) -> List[dict]:
        r = self.s.get(self.url("panel/api/inbounds/list"),
                       headers={"X-CSRF-Token": getattr(self, "csrf", "")}, timeout=self.timeout)
        try:
            data = r.json()
        except ValueError:
            raise PanelError(f"unexpected inbounds response ({r.status_code})")
        if not data.get("success"):
            raise PanelError(data.get("msg") or "couldn't list inbounds")
        return data.get("obj") or []


class SUI(BaseClient):
    kind = "sui"

    def __init__(self, *a, **kw):
        super().__init__(*a, **kw)
        # s-ui's default base path is /app/
        if self.path == "/":
            self.path = "/app/"

    def login(self) -> None:
        try:
            r = self.s.post(self.url("api/login"), data={"user": self.username, "pass": self.password},
                            headers={"Origin": self.base}, timeout=self.timeout)
        except requests.RequestException as e:
            raise PanelError(f"can't reach the panel: {e}")
        try:
            data = r.json()
        except ValueError:
            raise PanelError(f"unexpected login response ({r.status_code})")
        if not data.get("success"):
            raise PanelError((data.get("msg") or "wrong username or password").strip(": "))

    def raw_inbounds(self) -> List[dict]:
        r = self.s.get(self.url("api/inbounds"), timeout=self.timeout)
        try:
            data = r.json()
        except ValueError:
            raise PanelError(f"unexpected inbounds response ({r.status_code})")
        if not data.get("success"):
            raise PanelError(data.get("msg") or "couldn't list inbounds")
        obj = data.get("obj") or {}
        if isinstance(obj, dict):
            return obj.get("inbounds") or []
        return obj or []
