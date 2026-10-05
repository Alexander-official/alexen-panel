"""Settings for the Xray JSON subscription (v2rayN/NG, Happ, Streisand):
which clients get JSON, sites that go direct instead of through the VPN,
external configs in the JSON too, and an extra "auto" config that balances
over all servers by ping. Stored in the settings table, edited in Sub settings."""
import copy
import json
from typing import List, Optional

from pydantic import BaseModel, Field

SETTINGS_KEY = "json_subscription"

CLIENTS = ("v2rayn", "v2rayng", "happ", "streisand")


class JsonSubSettings(BaseModel):
    # clients that get the JSON format (on top of the USE_CUSTOM_JSON_* env vars)
    clients: List[str] = []
    # domains / IPs sent direct (not through the VPN): geosite:, domain:, full:, geoip:, CIDR...
    direct_domains: List[str] = []
    direct_ips: List[str] = []
    block_ads: bool = False
    include_external: bool = True
    # one more config that picks the fastest server by itself
    balancer: bool = False
    balancer_name: str = Field("⚡ Auto (fastest)", max_length=100)
    balancer_strategy: str = "leastPing"
    balancer_position: str = "top"
    probe_url: str = "https://www.gstatic.com/generate_204"
    probe_interval: str = "1m"


def load(db=None) -> JsonSubSettings:
    from app.db import GetDB, crud
    if db is not None:
        return JsonSubSettings(**(crud.get_setting(db, SETTINGS_KEY) or {}))
    with GetDB() as db:
        return JsonSubSettings(**(crud.get_setting(db, SETTINGS_KEY) or {}))


def save(db, settings: JsonSubSettings) -> JsonSubSettings:
    from app.db import crud
    crud.set_setting(db, SETTINGS_KEY, settings.model_dump())
    return settings


def wants_json(client: str, env_flag: bool) -> bool:
    if env_flag:
        return True
    try:
        return client in load().clients
    except Exception:
        return False


# ------------------------------------------------------------------ building

def _rules(s: JsonSubSettings) -> List[dict]:
    rules = []
    if s.block_ads:
        rules.append({"type": "field", "domain": ["geosite:category-ads-all"], "outboundTag": "block"})
    if s.direct_domains:
        rules.append({"type": "field", "domain": list(s.direct_domains), "outboundTag": "direct"})
    if s.direct_ips:
        rules.append({"type": "field", "ip": list(s.direct_ips), "outboundTag": "direct"})
    return rules


def _with_routing(config: dict, rules: List[dict]) -> dict:
    """add direct/block outbounds (after the proxy, so it stays the default) and the rules"""
    if not rules:
        return config
    tags = {o.get("tag") for o in config.get("outbounds", [])}
    if "direct" not in tags:
        config["outbounds"].append({"tag": "direct", "protocol": "freedom"})
    if "block" not in tags:
        config["outbounds"].append({"tag": "block", "protocol": "blackhole"})
    routing = config.setdefault("routing", {})
    routing["rules"] = rules + [r for r in routing.get("rules", []) if r not in rules]
    return config


def _external_configs(conf, s: JsonSubSettings, *, active: bool, host_groups, variables):
    """(top, bottom) JSON configs for the external links the user would get"""
    from app.subscription import external, external_sources
    marker = "panel://marker"
    ordered = external.apply([marker], active=active, host_groups=host_groups, variables=variables)
    if marker not in ordered:
        return [], []
    cut = ordered.index(marker)
    out = ([], [])
    for side, links in enumerate((ordered[:cut], ordered[cut + 1:])):
        for link in links:
            parsed = external_sources.parse(link)
            if not parsed:
                continue  # info entries and links Xray can't use
            outbound = dict(parsed["outbound"], tag="proxy")
            remark = external._remark(link)
            template = json.loads(conf.template)
            template["remarks"] = remark
            template["outbounds"] = [outbound] + template["outbounds"]
            out[side].append(template)
    return out


def _balancer_config(conf, configs: List[dict], s: JsonSubSettings) -> Optional[dict]:
    proxies = []
    for c in configs:
        for o in c.get("outbounds", []):
            if o.get("tag") != "proxy":
                continue
            o = copy.deepcopy(o)
            o["tag"] = f"proxy-{len(proxies) + 1}"
            # fragment/noise dialers belong to their own config; drop the link to them
            (o.get("streamSettings") or {}).get("sockopt", {}).pop("dialerProxy", None)
            proxies.append(o)
    if len(proxies) < 2:
        return None
    template = json.loads(conf.template)
    template["remarks"] = s.balancer_name or "⚡ Auto"
    template["outbounds"] = proxies + template["outbounds"]
    probe = s.balancer_strategy in ("leastPing", "leastLoad")
    template.setdefault("routing", {})["balancers"] = [{
        "tag": "auto",
        "selector": ["proxy-"],
        "strategy": {"type": s.balancer_strategy},
        "fallbackTag": "proxy-1",
    }]
    if s.balancer_strategy == "leastLoad":
        template["burstObservatory"] = {
            "subjectSelector": ["proxy-"],
            "pingConfig": {"destination": s.probe_url, "interval": s.probe_interval, "sampling": 3, "timeout": "5s"},
        }
    elif probe:
        template["observatory"] = {
            "subjectSelector": ["proxy-"], "probeUrl": s.probe_url,
            "probeInterval": s.probe_interval, "enableConcurrency": True,
        }
    rules = template["routing"].get("rules", [])
    template["routing"]["rules"] = rules + [{"type": "field", "network": "tcp,udp", "balancerTag": "auto"}]
    return template


def finish(conf, *, active: bool, host_groups, variables, reverse: bool) -> str:
    """Turn the panel's JSON configs (already in conf.config) into the final subscription"""
    from app.subscription.v2ray import UUIDEncoder
    s = load()
    configs = list(conf.config)
    if s.include_external:
        try:
            top, bottom = _external_configs(conf, s, active=active, host_groups=host_groups, variables=variables)
            configs = top + configs + bottom
        except Exception:
            pass
    if s.balancer:
        auto = _balancer_config(conf, configs, s)
        if auto:
            configs = [auto] + configs if s.balancer_position == "top" else configs + [auto]
    rules = _rules(s)
    configs = [_with_routing(c, rules) for c in configs]
    if reverse:
        configs.reverse()
    return json.dumps(configs, indent=4, cls=UUIDEncoder)
