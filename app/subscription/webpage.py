"""The subscription web page: what a user sees when opening the sub link in a
browser. Account info, how to install an app per platform (Remnawave-style app
catalog with one-tap "add subscription" buttons), the link, its QR code and,
for Happ, an encrypted (happ://crypt5/) link.

Settings (title, logo, colors, which apps) live in the settings table under
"sub_webpage"; the app catalog can be replaced from the panel as JSON."""
import base64
import io
import threading
from typing import Dict, List, Optional
from urllib.parse import quote

from pydantic import BaseModel, Field

from app import logger

SETTINGS_KEY = "sub_webpage"
CRYPT_CACHE_KEY = "happ_crypt_cache"
CRYPT_API = "https://crypto.happ.su/api-v2.php"
CRYPT_CACHE_MAX = 5000

PLATFORMS = ["ios", "android", "windows", "macos", "linux", "androidTV", "appleTV"]


class Button(BaseModel):
    label: str
    url: str


class App(BaseModel):
    id: str
    name: str
    featured: bool = False
    # "add subscription" link. Placeholders: {url} {url_enc} {url_b64} {name}
    # {crypt} (Happ encrypted link). Empty: the user copies the link instead.
    deeplink: str = ""
    # use {crypt} when the encrypted link is available and turned on
    crypt: bool = False
    install: List[Button] = []
    # a line under the steps, per language ("" = any language)
    note: Dict[str, str] = {}


def _gh(repo: str) -> Button:
    return Button(label="GitHub", url=f"https://github.com/{repo}/releases/latest")


HAPP_IOS = [
    Button(label="App Store", url="https://apps.apple.com/us/app/happ-proxy-utility/id6504287215"),
    Button(label="App Store (RU)", url="https://apps.apple.com/ru/app/happ-proxy-utility-plus/id6746188973"),
]
HAPP_ANDROID = [
    Button(label="Google Play", url="https://play.google.com/store/apps/details?id=com.happproxy"),
    Button(label="APK", url="https://github.com/Happ-proxy/happ-android/releases/latest/download/Happ.apk"),
]
HIDDIFY = "hiddify://import/{url}#{name}"
# Outline: a dynamic access key; the app fetches /sub/<token>/outline over https
OUTLINE = "ssconf://{url_noscheme}/outline#{name}"
OUTLINE_NOTE = {"en": "Works with the Shadowsocks servers of your subscription.",
                "ru": "Работает с серверами Shadowsocks из вашей подписки.",
                "tr": "Aboneliğindeki Shadowsocks sunucularıyla çalışır.",
                "tk": "Abunaňyzdaky Shadowsocks serwerleri bilen işleýär.",
                "fa": "با سرورهای Shadowsocks اشتراک شما کار می‌کند.",
                "zh": "适用于订阅中的 Shadowsocks 服务器。"}
OUTLINE_DESKTOP = [Button(label="getoutline.org", url="https://getoutline.org/get-started/")]


def _outline(install: List[Button]) -> "App":
    return App(id="outline", name="Outline", deeplink=OUTLINE, install=install, note=OUTLINE_NOTE)


DEFAULT_APPS: Dict[str, List[App]] = {
    "ios": [
        App(id="happ", name="Happ", featured=True, deeplink="happ://add/{url}", crypt=True, install=HAPP_IOS),
        App(id="streisand", name="Streisand", deeplink="streisand://import/{url}#{name}",
            install=[Button(label="App Store", url="https://apps.apple.com/us/app/streisand/id6450534064")]),
        App(id="hiddify", name="Hiddify", deeplink=HIDDIFY,
            install=[Button(label="App Store", url="https://apps.apple.com/us/app/hiddify-proxy-vpn/id6596777532")]),
        App(id="shadowrocket", name="Shadowrocket", deeplink="sub://{url_b64}",
            install=[Button(label="App Store", url="https://apps.apple.com/us/app/shadowrocket/id932747118")]),
        App(id="stash", name="Stash", deeplink="stash://install-config?url={url_enc}",
            install=[Button(label="App Store", url="https://apps.apple.com/us/app/stash-rule-based-proxy/id1596063349")]),
        _outline([Button(label="App Store", url="https://apps.apple.com/us/app/outline-app/id1356177741")]),
    ],
    "android": [
        App(id="happ", name="Happ", featured=True, deeplink="happ://add/{url}", crypt=True, install=HAPP_ANDROID),
        App(id="hiddify", name="Hiddify", deeplink=HIDDIFY,
            install=[Button(label="Google Play", url="https://play.google.com/store/apps/details?id=app.hiddify.com"),
                     _gh("hiddify/hiddify-app")]),
        App(id="v2rayng", name="v2rayNG", deeplink="v2rayng://install-config?name={name}&url={url_enc}",
            install=[_gh("2dust/v2rayNG")]),
        App(id="flclashx", name="FlClashX", deeplink="flclashx://install-config?url={url_enc}",
            install=[_gh("pluralplay/FlClashX")]),
        App(id="clash-meta", name="Clash Meta", deeplink="clashmeta://install-config?name={name}&url={url_enc}",
            install=[_gh("MetaCubeX/ClashMetaForAndroid")]),
        _outline([Button(label="Google Play", url="https://play.google.com/store/apps/details?id=org.outline.android.client")]),
    ],
    "windows": [
        App(id="happ", name="Happ", featured=True, deeplink="happ://add/{url}", crypt=True,
            install=[Button(label="Windows x64",
                            url="https://github.com/Happ-proxy/happ-desktop/releases/latest/download/setup-Happ.x64.exe")]),
        App(id="hiddify", name="Hiddify", deeplink=HIDDIFY, install=[_gh("hiddify/hiddify-app")]),
        App(id="flclashx", name="FlClashX", deeplink="flclashx://install-config?url={url_enc}",
            install=[_gh("pluralplay/FlClashX")]),
        App(id="clash-verge", name="Clash Verge", deeplink="clash://install-config?url={url_enc}",
            install=[_gh("clash-verge-rev/clash-verge-rev")]),
        App(id="v2rayn", name="v2rayN", install=[_gh("2dust/v2rayN")]),
        _outline(OUTLINE_DESKTOP),
    ],
    "macos": [
        App(id="happ", name="Happ", featured=True, deeplink="happ://add/{url}", crypt=True, install=HAPP_IOS),
        App(id="hiddify", name="Hiddify", deeplink=HIDDIFY, install=[_gh("hiddify/hiddify-app")]),
        App(id="flclashx", name="FlClashX", deeplink="flclashx://install-config?url={url_enc}",
            install=[_gh("pluralplay/FlClashX")]),
        App(id="clash-verge", name="Clash Verge", deeplink="clash://install-config?url={url_enc}",
            install=[_gh("clash-verge-rev/clash-verge-rev")]),
        _outline([Button(label="App Store", url="https://apps.apple.com/us/app/outline-secure-internet-access/id1356178125")]),
    ],
    "linux": [
        App(id="hiddify", name="Hiddify", featured=True, deeplink=HIDDIFY, install=[_gh("hiddify/hiddify-app")]),
        App(id="flclashx", name="FlClashX", deeplink="flclashx://install-config?url={url_enc}",
            install=[_gh("pluralplay/FlClashX")]),
        App(id="clash-verge", name="Clash Verge", deeplink="clash://install-config?url={url_enc}",
            install=[_gh("clash-verge-rev/clash-verge-rev")]),
        App(id="v2rayn", name="v2rayN", install=[_gh("2dust/v2rayN")]),
        _outline(OUTLINE_DESKTOP),
    ],
    "androidTV": [
        App(id="happ", name="Happ", featured=True, deeplink="happ://add/{url}", crypt=True, install=HAPP_ANDROID),
        App(id="vpn4tv", name="vpn4tv (Hiddify)", deeplink="hiddify://import/{url}",
            install=[Button(label="Google Play", url="https://play.google.com/store/apps/details?id=com.vpn4tv.hiddify")]),
    ],
    "appleTV": [
        App(id="happ", name="Happ", featured=True, deeplink="happ://add/{url}", crypt=True,
            install=[Button(label="App Store",
                            url="https://apps.apple.com/us/app/happ-proxy-utility-for-tv/id6748297274")]),
        App(id="shadowrocket", name="Shadowrocket", deeplink="sub://{url_b64}",
            install=[Button(label="App Store", url="https://apps.apple.com/us/app/shadowrocket/id932747118")]),
    ],
}


SECTIONS = ["announce", "intro", "user", "devices", "install", "vpn", "link", "configs"]


class Section(BaseModel):
    id: str
    enabled: bool = True


class WebPageSettings(BaseModel):
    enabled: bool = True
    title: str = Field("", max_length=100)       # empty: the profile title
    logo_url: str = Field("", max_length=1000)
    support_url: str = Field("", max_length=1000)
    accent: str = Field("#5b7cfa", max_length=20)
    # "auto" follows the visitor's system
    theme: str = Field("auto", pattern="^(auto|dark|light)$")
    # soft | glass | clay: the look of the cards
    style: str = Field("soft", pattern="^(soft|glass|clay)$")
    default_lang: str = Field("auto", max_length=8)
    languages: List[str] = ["en", "tr", "tk", "ru", "fa", "zh"]
    happ_crypt: bool = True
    show_links: bool = True
    show_qr: bool = True
    # which blocks, in which order
    sections: List[Section] = [Section(id=x) for x in SECTIONS]
    # free text above the account card and at the bottom, per language ("" = any)
    intro: Dict[str, str] = {}
    footer: Dict[str, str] = {}
    # page texts replaced per language: {"tr": {"s1": "..."}}
    texts: Dict[str, Dict[str, str]] = {}
    custom_css: str = Field("", max_length=20000)
    # the address the page's links use (copy button, QR, app buttons, files);
    # empty: the link the page was opened with. e.g. https://sub.example.com
    link_domain: str = Field("", max_length=300)
    show_devices: bool = True
    # device limit full: show only the devices and "contact the admin"
    lock_on_device_limit: bool = True
    # None: the built-in catalog (DEFAULT_APPS)
    apps: Optional[Dict[str, List[App]]] = None


def load(db) -> WebPageSettings:
    from app.db import crud
    return WebPageSettings(**(crud.get_setting(db, SETTINGS_KEY) or {}))


def save(db, s: WebPageSettings) -> WebPageSettings:
    from app.db import crud
    crud.set_setting(db, SETTINGS_KEY, s.model_dump())
    return s


def default_apps() -> Dict[str, List[dict]]:
    return {p: [a.model_dump() for a in apps] for p, apps in DEFAULT_APPS.items()}


_TEXTS: Optional[Dict[str, Dict[str, str]]] = None


def default_texts() -> Dict[str, Dict[str, str]]:
    """the page's own wording per language (app/subscription/webpage_texts.json)"""
    global _TEXTS
    if _TEXTS is None:
        import json
        import os
        with open(os.path.join(os.path.dirname(__file__), "webpage_texts.json"), encoding="utf-8") as f:
            _TEXTS = json.load(f)
    return _TEXTS


# ---- Happ encrypted link ----
_crypt_lock = threading.Lock()


def happ_crypt(db, url: str, fetch: bool = True) -> Optional[str]:
    """happ://crypt5/... for the URL, from Happ's API (the key lives in the app,
    so it can't be made here). Cached in the settings table: the URL of a user
    only changes when the subscription is revoked."""
    from app.db import crud
    cache = crud.get_setting(db, CRYPT_CACHE_KEY) or {}
    if url in cache:
        return cache[url]
    if not fetch:
        return None
    import requests
    try:
        r = requests.post(CRYPT_API, json={"url": url}, timeout=6)
        link = (r.json() or {}).get("encrypted_link") if r.ok else None
    except Exception as e:
        logger.warning(f"Happ crypt link failed: {e}")
        return None
    if not link or not str(link).startswith("happ://"):
        return None
    with _crypt_lock:
        cache = crud.get_setting(db, CRYPT_CACHE_KEY) or {}
        cache[url] = link
        if len(cache) > CRYPT_CACHE_MAX:
            cache = dict(list(cache.items())[-CRYPT_CACHE_MAX:])
        crud.set_setting(db, CRYPT_CACHE_KEY, cache)
    return link


def qr_svg(text: str) -> str:
    import qrcode
    import qrcode.image.svg
    img = qrcode.make(text, image_factory=qrcode.image.svg.SvgPathImage, box_size=10, border=2)
    buf = io.BytesIO()
    img.save(buf)
    svg = buf.getvalue().decode()
    return svg[svg.index("<svg"):]


def fill(template: str, url: str, name: str, crypt: Optional[str]) -> str:
    return (template
            .replace("{url_enc}", quote(url, safe=""))
            .replace("{url_noscheme}", url.split("://", 1)[-1])
            .replace("{url_b64}", base64.urlsafe_b64encode(url.encode()).decode().rstrip("="))
            .replace("{url}", url)
            .replace("{name}", quote(name, safe=""))
            .replace("{crypt}", crypt or ""))


# apps for the AmneziaWG / OpenVPN files, per platform
_AMNEZIA_DESKTOP = [Button(label="amnezia.org", url="https://amnezia.org/downloads"),
                    Button(label="GitHub", url="https://github.com/amnezia-vpn/amnezia-client/releases/latest")]
_OVPN_SITE = [Button(label="openvpn.net", url="https://openvpn.net/client/")]
VPN_APPS: Dict[str, List[dict]] = {
    "ios": [{"name": "AmneziaWG", "kind": "awg", "install": [Button(label="App Store", url="https://apps.apple.com/us/app/amneziawg/id6478942365")]},
            {"name": "AmneziaVPN", "kind": "awg", "install": [Button(label="App Store", url="https://apps.apple.com/us/app/amneziavpn/id1600529900")]},
            {"name": "OpenVPN Connect", "kind": "ovpn", "install": _OVPN_SITE}],
    "android": [{"name": "AmneziaWG", "kind": "awg", "install": [Button(label="Google Play", url="https://play.google.com/store/apps/details?id=org.amnezia.awg")]},
                {"name": "AmneziaVPN", "kind": "awg", "install": [Button(label="Google Play", url="https://play.google.com/store/apps/details?id=org.amnezia.vpn")]},
                {"name": "OpenVPN Connect", "kind": "ovpn", "install": [Button(label="Google Play", url="https://play.google.com/store/apps/details?id=net.openvpn.openvpn")]}],
    "windows": [{"name": "AmneziaVPN", "kind": "awg", "install": _AMNEZIA_DESKTOP},
                {"name": "OpenVPN Connect", "kind": "ovpn", "install": _OVPN_SITE}],
    "macos": [{"name": "AmneziaVPN", "kind": "awg", "install": _AMNEZIA_DESKTOP},
              {"name": "OpenVPN Connect", "kind": "ovpn", "install": _OVPN_SITE}],
    "linux": [{"name": "AmneziaVPN", "kind": "awg", "install": _AMNEZIA_DESKTOP},
              {"name": "OpenVPN", "kind": "ovpn", "install": _OVPN_SITE}],
    "androidTV": [{"name": "AmneziaVPN", "kind": "awg", "install": [Button(label="Google Play", url="https://play.google.com/store/apps/details?id=org.amnezia.vpn")]}],
    "appleTV": [],
}


def vpn_data(db, user, sub_url: str, show_qr: bool) -> List[dict]:
    """the user's AmneziaWG / OpenVPN files per server, for the page"""
    try:
        from app import vpn
        from app.subscription import domain
        servers = vpn.offered(db, user)
        if not servers:
            return []
        # files hang off the token, not the optional last part of the link
        base = sub_url.rsplit("/", 1)[0] if domain.get().suffix else sub_url
        s = vpn.load(db)
        out = []
        for srv in servers:
            row = {"name": srv["name"], "awg": [], "ovpn": ""}
            if srv["awg"]:
                # one file per device, so several can be connected at once
                for slot in range(s.awg_devices):
                    fname = "amneziawg.conf" if slot == 0 else f"amneziawg-{slot + 1}.conf"
                    row["awg"].append({
                        "n": slot + 1,
                        "url": f"{base}/vpn/{srv['key']}/{fname}",
                        "qr": qr_svg(vpn.awg_client_conf(db, s, srv["key"], user, slot)) if show_qr else "",
                    })
            if srv["ovpn"]:
                row["ovpn"] = f"{base}/vpn/{srv['key']}/openvpn.ovpn"
            out.append(row)
        return out
    except Exception as e:
        logger.warning(f"sub page VPN block: {e}")
        return []


def merge_sections(saved) -> List[dict]:
    """the saved order, with blocks added later put where they belong by default
    (after the block that comes before them), not at the bottom"""
    order = [x.model_dump() if hasattr(x, "model_dump") else dict(x) for x in saved if (x.id if hasattr(x, "id") else x["id"]) in SECTIONS]
    ids = [x["id"] for x in order]
    for i, sid in enumerate(SECTIONS):
        if sid in ids:
            continue
        before = [p for p in SECTIONS[:i] if p in ids]
        pos = ids.index(before[-1]) + 1 if before else 0
        order.insert(pos, {"id": sid, "enabled": True})
        ids.insert(pos, sid)
    return order


def with_domain(url: str, domain: str) -> str:
    """the same link on another address: https://a.com:8000/sub/x -> https://b.com/sub/x"""
    from urllib.parse import urlparse
    domain = domain.strip().rstrip("/")
    if not domain:
        return url
    if "://" not in domain:
        domain = "https://" + domain
    p = urlparse(url)
    return domain + p.path + (("?" + p.query) if p.query else "")


def devices_of(db, user) -> List[dict]:
    """the user's registered devices (HWID), newest first"""
    from app.db.models import User, UserHWIDDevice
    uid = getattr(user, "id", None) or db.query(User.id).filter(User.username == user.username).scalar()
    rows = db.query(UserHWIDDevice).filter(UserHWIDDevice.user_id == uid).order_by(UserHWIDDevice.updated_at.desc()).all()
    return [{"platform": r.platform or "", "model": r.device_model or "", "os": r.os_version or "",
             "app": (r.user_agent or "").split(" ")[0][:40],
             "last_seen": int((r.updated_at or r.created_at).timestamp()) if (r.updated_at or r.created_at) else 0}
            for r in rows]


def page_data(db, s: WebPageSettings, user, sub_url: str, links: List[str], headers: dict,
              preview: bool = False) -> dict:
    """everything the page template shows, with the app links already filled in"""
    from app.subscription.subpage import decode_header
    # an admin's own domain wins over the page's link domain
    from app.subscription import domain as _domain
    owner = getattr(getattr(user, "admin", None), "username", "") or ""
    if not _domain.admin_prefix(owner):
        sub_url = with_domain(sub_url, s.link_domain)
    title = s.title or decode_header(headers.get("profile-title", "")) or "Subscription"
    devices = devices_of(db, user) if (s.show_devices or s.lock_on_device_limit) else []
    device_limit = getattr(user, "hwid_limit", None) or 0
    base_texts = default_texts()
    langs = [lang for lang in s.languages if lang in base_texts] or ["en"]
    texts = {lang: {**base_texts["en"], **base_texts[lang], **{k: v for k, v in s.texts.get(lang, {}).items() if v}}
             for lang in langs}
    look = {"title": title, "logo": s.logo_url, "support": s.support_url or headers.get("support-url", ""),
            "accent": s.accent, "theme": s.theme, "style": s.style, "lang": s.default_lang, "texts": texts,
            "css": s.custom_css, "footer": s.footer, "device_limit": device_limit}
    if s.lock_on_device_limit and device_limit and len(devices) >= device_limit:
        # nothing that lets one connect: no link, QR, configs, app buttons or files
        return {**look, "locked": True, "devices": devices, "sections": [], "intro": {}, "announce": "",
                "user": {"username": user.username}, "sub_url": "", "crypt": "", "qr": "", "crypt_qr": "",
                "links": [], "platforms": {}, "vpn": [], "vpn_apps": {}, "order": []}
    announce = decode_header(headers.get("announce", ""))
    # a preview never calls Happ's service: cached links only
    crypt = happ_crypt(db, sub_url, fetch=not preview) if s.happ_crypt else None
    if preview and s.happ_crypt and not crypt:
        crypt = "happ://crypt5/preview"
    catalog = s.apps if s.apps is not None else DEFAULT_APPS
    platforms = {}
    for p in PLATFORMS:
        apps = []
        for a in catalog.get(p, []):
            a = a if isinstance(a, App) else App(**a)
            tpl = "{crypt}" if (a.crypt and crypt) else a.deeplink
            apps.append({
                "id": a.id, "name": a.name, "featured": a.featured,
                "add": fill(tpl, sub_url, title, crypt) if tpl else "",
                "install": [b.model_dump() for b in a.install],
                "note": a.note,
            })
        if apps:
            platforms[p] = apps
    sections = merge_sections(s.sections)
    status = getattr(user.status, "value", str(user.status))
    return {
        **look,
        "locked": False,
        "devices": devices if s.show_devices else [],
        "sections": sections,
        "intro": s.intro,
        "announce": announce,
        "user": {
            "username": user.username,
            "status": status,
            "used": user.used_traffic or 0,
            "limit": user.data_limit or 0,
            "expire": user.expire or 0,
            "reset": getattr(user.data_limit_reset_strategy, "value", "no_reset"),
        },
        "sub_url": sub_url,
        "crypt": crypt or "",
        "qr": qr_svg(sub_url) if s.show_qr else "",
        "crypt_qr": qr_svg(crypt) if (s.show_qr and crypt) else "",
        "links": links if s.show_links and status == "active" else [],
        "platforms": platforms,
        "vpn": vpn_data(db, user, sub_url, s.show_qr),
        "vpn_apps": {p: [{**a, "install": [b.model_dump() for b in a["install"]]} for a in apps]
                     for p, apps in VPN_APPS.items()},
        # the template's tojson sorts keys: keep the platform order separately
        "order": list(platforms),
    }
