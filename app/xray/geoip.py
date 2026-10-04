"""Best-effort ISP/ASN lookup for online IPs, cached in memory.

Uses the free ip-api.com endpoint. Private/LAN addresses and failures just
return None, so the panel works the same with no internet. Disable with
GEOIP_LOOKUP=False.
"""
import ipaddress
import threading
from typing import Dict, Optional

import requests

from config import config

GEOIP_LOOKUP = config("GEOIP_LOOKUP", cast=bool, default=True)

_cache: Dict[str, Optional[str]] = {}
_lock = threading.Lock()


def _is_public(ip: str) -> bool:
    try:
        addr = ipaddress.ip_address(ip)
        return not (addr.is_private or addr.is_loopback or addr.is_link_local or addr.is_reserved)
    except ValueError:
        return False


def provider(ip: str) -> Optional[str]:
    """ISP/org name for an IP, or None. Cached; first lookup per IP hits the network once."""
    if not GEOIP_LOOKUP or not _is_public(ip):
        return None
    if ip in _cache:
        return _cache[ip]
    name = None
    try:
        r = requests.get(f"http://ip-api.com/json/{ip}",
                         params={"fields": "status,isp,org,as,countryCode"}, timeout=4)
        data = r.json()
        if data.get("status") == "success":
            cc = data.get("countryCode")
            name = data.get("isp") or data.get("org") or data.get("as")
            if name and cc:
                name = f"{name} ({cc})"
    except (requests.RequestException, ValueError):
        name = None
    with _lock:
        _cache[ip] = name
    return name
