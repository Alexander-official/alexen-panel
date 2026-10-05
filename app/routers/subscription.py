import re
from distutils.version import LooseVersion

from fastapi import HTTPException, APIRouter, Depends, Header, Path, Request, Response
from fastapi.responses import HTMLResponse

import time as _time
from app.db import Session, crud, get_db
from app.routers.settings import get_subscription_settings
from app.dependencies import get_validated_sub, validate_dates
from app.models.user import SubscriptionUserResponse, UserResponse
from app.subscription.json_sub import wants_json
from app.subscription.share import encode_title, generate_subscription
from app.subscription import webpage
from app.templates import render_template
from config import (
    HWID_LIMIT_REACHED_TEXT,
    SUB_PROFILE_TITLE,
    SUB_SUPPORT_URL,
    SUB_UPDATE_INTERVAL,
    SUBSCRIPTION_PAGE_TEMPLATE,
    USE_CUSTOM_JSON_DEFAULT,
    USE_CUSTOM_JSON_FOR_HAPP,
    USE_CUSTOM_JSON_FOR_STREISAND,
    USE_CUSTOM_JSON_FOR_V2RAYN,
    USE_CUSTOM_JSON_FOR_V2RAYNG,
    XRAY_SUBSCRIPTION_PATH,
)

client_config = {
    "clash-meta": {"config_format": "clash-meta", "media_type": "text/yaml", "as_base64": False, "reverse": False},
    "sing-box": {"config_format": "sing-box", "media_type": "application/json", "as_base64": False, "reverse": False},
    "clash": {"config_format": "clash", "media_type": "text/yaml", "as_base64": False, "reverse": False},
    "v2ray": {"config_format": "v2ray", "media_type": "text/plain", "as_base64": True, "reverse": False},
    "outline": {"config_format": "outline", "media_type": "application/json", "as_base64": False, "reverse": False},
    "v2ray-json": {"config_format": "v2ray-json", "media_type": "application/json", "as_base64": False,
                   "reverse": False}
}

router = APIRouter(tags=['Subscription'], prefix=f'/{XRAY_SUBSCRIPTION_PATH}')


def _pick_template(cfg, user) -> str:
    import time as _t
    status = getattr(user, "status", None)
    status = status.value if hasattr(status, "value") else status
    now = _t.time()
    is_expired = status == "expired" or (user.expire and user.expire < now)
    is_limited = status == "limited" or (
        user.data_limit and (user.used_traffic or 0) >= user.data_limit)
    if status == "disabled" and cfg.disabled_template:
        return cfg.disabled_template
    if is_expired and cfg.expired_template:
        return cfg.expired_template
    if is_limited and cfg.limited_template:
        return cfg.limited_template
    if user.expire and cfg.near_expire_template:
        days_left = (user.expire - now) / 86400
        if 0 < days_left <= max(0, cfg.near_expire_days):
            return cfg.near_expire_template
    return cfg.default_template or ""


def build_sub_page(db: Session, user: UserResponse):
    """Returns (prefix_lines, headers) from the admin's sub-page template for
    the user's current state."""
    from app.subscription.subpage import render
    cfg = get_subscription_settings(db)
    template = _pick_template(cfg, user)
    prefix_lines, directives = render(template, user.__dict__)
    headers = {}
    if directives.get("profile-title"):
        headers["profile-title"] = directives["profile-title"]
    else:
        headers["profile-title"] = encode_title(SUB_PROFILE_TITLE)
    if directives.get("announce"):
        headers["announce"] = directives["announce"]
    if directives.get("support-url"):
        headers["support-url"] = directives["support-url"]
    if cfg.update_interval:
        headers["profile-update-interval"] = str(cfg.update_interval)
    return prefix_lines, headers


def get_subscription_user_info(user: UserResponse) -> dict:
    """Retrieve user subscription information including upload, download, total data, and expiry."""
    return {
        "upload": 0,
        "download": user.used_traffic,
        "total": user.data_limit if user.data_limit is not None else 0,
        "expire": user.expire if user.expire is not None else 0,
    }


def register_device(request: Request, db: Session, dbuser, user_agent: str) -> bool:
    """Remembers the device (from the HWID headers Happ, v2rayNG, etc. send);
    False when it's a new device over the user's device limit. Clients without a HWID are let through."""
    hwid = request.headers.get("x-hwid", "").strip()
    if not hwid:
        return True
    return crud.register_hwid_device(
        db, dbuser, hwid,
        platform=request.headers.get("x-device-os"),
        os_version=request.headers.get("x-ver-os"),
        device_model=request.headers.get("x-device-model"),
        user_agent=user_agent,
    )


def _absolute_sub_url(request: Request, user: UserResponse) -> str:
    """the user's subscription URL with scheme and host (without a URL prefix
    in the config it is only a path: take the host the page was opened on)"""
    url = user.subscription_url or ""
    if url.startswith("http://") or url.startswith("https://"):
        return url
    base = str(request.base_url).rstrip("/")
    return base + (url if url.startswith("/") else "/" + url)


def device_limit_response(response_headers: dict) -> Response:
    headers = {**response_headers, "announce": encode_title(HWID_LIMIT_REACHED_TEXT), "x-hwid-limit": "true"}
    return Response(content="", media_type="text/plain", headers=headers)


@router.get("/{token}/")
@router.get("/{token}", include_in_schema=False)
def user_subscription(
    request: Request,
    db: Session = Depends(get_db),
    dbuser: UserResponse = Depends(get_validated_sub),
    user_agent: str = Header(default="")
):
    """Provides a subscription link based on the user agent (Clash, V2Ray, etc.)."""
    user: UserResponse = UserResponse.model_validate(dbuser)

    accept_header = request.headers.get("Accept", "")
    if "text/html" in accept_header:
        # the same links (order + external configs) the apps get
        links = generate_subscription(user=user, config_format="v2ray", as_base64=False, reverse=False)
        links = [l for l in links.splitlines() if l.strip()]
        page = webpage.load(db)
        # a custom SUBSCRIPTION_PAGE_TEMPLATE from .env still wins over the built-in page
        if page.enabled and SUBSCRIPTION_PAGE_TEMPLATE == "subscription/index.html":
            _, sub_headers = build_sub_page(db, user)
            data = webpage.page_data(db, page, user, _absolute_sub_url(request, user), links, sub_headers)
            return HTMLResponse(render_template("subscription/webpage.html", {"data": data}),
                                headers={"cache-control": "no-store"})
        return HTMLResponse(
            render_template(SUBSCRIPTION_PAGE_TEMPLATE, {"user": user, "links": links})
        )

    crud.update_user_sub(db, dbuser, user_agent)
    prefix_lines, sub_headers = build_sub_page(db, user)
    response_headers = {
        "content-disposition": f'attachment; filename="{user.username}"',
        "profile-web-page-url": str(request.url),
        "support-url": SUB_SUPPORT_URL,
        "profile-update-interval": SUB_UPDATE_INTERVAL,
        **sub_headers,
        "subscription-userinfo": "; ".join(
            f"{key}={val}"
            for key, val in get_subscription_user_info(user).items()
        )
    }

    if not register_device(request, db, dbuser, user_agent):
        return device_limit_response(response_headers)

    if re.match(r'^([Cc]lash-verge|[Cc]lash[-\.]?[Mm]eta|[Ff][Ll][Cc]lash|[Mm]ihomo)', user_agent):
        conf = generate_subscription(user=user, config_format="clash-meta", as_base64=False, reverse=False)
        return Response(content=conf, media_type="text/yaml", headers=response_headers)

    elif re.match(r'^([Cc]lash|[Ss]tash)', user_agent):
        conf = generate_subscription(user=user, config_format="clash", as_base64=False, reverse=False)
        return Response(content=conf, media_type="text/yaml", headers=response_headers)

    elif re.match(r'^(SFA|SFI|SFM|SFT|[Kk]aring|[Hh]iddify[Nn]ext)', user_agent):
        conf = generate_subscription(user=user, config_format="sing-box", as_base64=False, reverse=False)
        return Response(content=conf, media_type="application/json", headers=response_headers)

    elif re.match(r'^(SS|SSR|SSD|SSS|Outline|Shadowsocks|SSconf)', user_agent):
        conf = generate_subscription(user=user, config_format="outline", as_base64=False, reverse=False)
        return Response(content=conf, media_type="application/json", headers=response_headers)

    elif wants_json('v2rayn', USE_CUSTOM_JSON_DEFAULT or USE_CUSTOM_JSON_FOR_V2RAYN) and re.match(r'^v2rayN/(\d+\.\d+)', user_agent):
        version_str = re.match(r'^v2rayN/(\d+\.\d+)', user_agent).group(1)
        if LooseVersion(version_str) >= LooseVersion("6.40"):
            conf = generate_subscription(user=user, config_format="v2ray-json", as_base64=False, reverse=False)
            return Response(content=conf, media_type="application/json", headers=response_headers)
        else:
            conf = generate_subscription(user=user, config_format="v2ray", as_base64=True, reverse=False, prefix_lines=prefix_lines)
            return Response(content=conf, media_type="text/plain", headers=response_headers)

    elif wants_json('v2rayng', USE_CUSTOM_JSON_DEFAULT or USE_CUSTOM_JSON_FOR_V2RAYNG) and re.match(r'^v2rayNG/(\d+\.\d+\.\d+)', user_agent):
        version_str = re.match(r'^v2rayNG/(\d+\.\d+\.\d+)', user_agent).group(1)
        if LooseVersion(version_str) >= LooseVersion("1.8.29"):
            conf = generate_subscription(user=user, config_format="v2ray-json", as_base64=False, reverse=False)
            return Response(content=conf, media_type="application/json", headers=response_headers)
        elif LooseVersion(version_str) >= LooseVersion("1.8.18"):
            conf = generate_subscription(user=user, config_format="v2ray-json", as_base64=False, reverse=True)
            return Response(content=conf, media_type="application/json", headers=response_headers)
        else:
            conf = generate_subscription(user=user, config_format="v2ray", as_base64=True, reverse=False, prefix_lines=prefix_lines)
            return Response(content=conf, media_type="text/plain", headers=response_headers)

    elif re.match(r'^[Ss]treisand', user_agent):
        if wants_json('streisand', USE_CUSTOM_JSON_DEFAULT or USE_CUSTOM_JSON_FOR_STREISAND):
            conf = generate_subscription(user=user, config_format="v2ray-json", as_base64=False, reverse=False)
            return Response(content=conf, media_type="application/json", headers=response_headers)
        else:
            conf = generate_subscription(user=user, config_format="v2ray", as_base64=True, reverse=False, prefix_lines=prefix_lines)
            return Response(content=conf, media_type="text/plain", headers=response_headers)

    elif wants_json('happ', USE_CUSTOM_JSON_DEFAULT or USE_CUSTOM_JSON_FOR_HAPP) and re.match(r'^Happ/(\d+\.\d+\.\d+)', user_agent):
        version_str = re.match(r'^Happ/(\d+\.\d+\.\d+)', user_agent).group(1)
        if LooseVersion(version_str) >= LooseVersion("1.63.1"):
            conf = generate_subscription(user=user, config_format="v2ray-json", as_base64=False, reverse=False)
            return Response(content=conf, media_type="application/json", headers=response_headers)
        else:
            conf = generate_subscription(user=user, config_format="v2ray", as_base64=True, reverse=False, prefix_lines=prefix_lines)
            return Response(content=conf, media_type="text/plain", headers=response_headers)



    else:
        conf = generate_subscription(user=user, config_format="v2ray", as_base64=True, reverse=False, prefix_lines=prefix_lines)
        return Response(content=conf, media_type="text/plain", headers=response_headers)


@router.get("/{token}/info", response_model=SubscriptionUserResponse)
def user_subscription_info(
    dbuser: UserResponse = Depends(get_validated_sub),
):
    """Retrieves detailed information about the user's subscription."""
    return dbuser


@router.get("/{token}/usage")
def user_get_usage(
    dbuser: UserResponse = Depends(get_validated_sub),
    start: str = "",
    end: str = "",
    db: Session = Depends(get_db)
):
    """Fetches the usage statistics for the user within a specified date range."""
    start, end = validate_dates(start, end)

    usages = crud.get_user_usages(db, dbuser, start, end)

    return {"usages": usages, "username": dbuser.username}


@router.get("/{token}/vpn/{key}/{filename}")
def user_vpn_config(
    key: str,
    filename: str,
    db: Session = Depends(get_db),
    dbuser: UserResponse = Depends(get_validated_sub),
):
    """the user's AmneziaWG (.conf) or OpenVPN (.ovpn) file for one server (app/vpn)"""
    from app import vpn
    if not vpn.allowed(dbuser):
        raise HTTPException(status_code=403, detail="Subscription is not active")
    s = vpn.load(db)
    srv = s.servers.get(key)
    names = vpn.server_keys(db)
    if not srv or key not in names:
        raise HTTPException(status_code=404, detail="Not Found")
    base = re.sub(r"[^A-Za-z0-9_.-]+", "-", f"{dbuser.username}-{names[key]}").strip("-")
    perms = vpn.permissions(db)
    # amneziawg.conf is device 1; amneziawg-2.conf ... the user's other devices
    m = re.match(r"^amneziawg(?:-(\d+))?\.conf$", filename)
    slot = int(m.group(1)) - 1 if m and m.group(1) else 0
    if m and srv.awg.enabled and vpn.may_use(dbuser, "awg", key, perms) and 0 <= slot < s.awg_devices:
        body = vpn.awg_client_conf(db, s, key, dbuser, slot)
        name = f"{base}.conf" if slot == 0 else f"{base}-{slot + 1}.conf"
    elif filename.endswith(".ovpn") and srv.ovpn.enabled and vpn.may_use(dbuser, "ovpn", key, perms):
        body, name = vpn.ovpn_client_conf(db, s, key, dbuser), f"{base}.ovpn"
    else:
        raise HTTPException(status_code=404, detail="Not Found")
    return Response(content=body, media_type="application/octet-stream",
                    headers={"content-disposition": f'attachment; filename="{name}"', "cache-control": "no-store"})


@router.get("/{token}/{extra}")
def user_subscription_extra(
    request: Request,
    extra: str,
    db: Session = Depends(get_db),
    dbuser: UserResponse = Depends(get_validated_sub),
    user_agent: str = Header(default="")
):
    """/<token>/<client type> picks the format; anything else after the token (a
    username or any text, see Domain settings) is the normal subscription"""
    if extra in client_config:
        return _client_type_subscription(request, dbuser, extra, db, user_agent)
    return user_subscription(request, db, dbuser, user_agent)


@router.get("/{token}/{extra}/{client_type}")
def user_subscription_extra_client_type(
    request: Request,
    extra: str,
    client_type: str = Path(..., pattern="^(sing-box|clash-meta|clash|outline|v2ray|v2ray-json)$"),
    db: Session = Depends(get_db),
    dbuser: UserResponse = Depends(get_validated_sub),
    user_agent: str = Header(default="")
):
    """a link with a last part, plus a client type (e.g. Outline's /<token>/<name>/outline)"""
    return _client_type_subscription(request, dbuser, client_type, db, user_agent)


def _client_type_subscription(request: Request, dbuser, client_type: str, db: Session, user_agent: str):
    """Provides a subscription link based on the specified client type (e.g., Clash, V2Ray)."""
    user: UserResponse = UserResponse.model_validate(dbuser)

    prefix_lines, sub_headers = build_sub_page(db, user)
    response_headers = {
        "content-disposition": f'attachment; filename="{user.username}"',
        "profile-web-page-url": str(request.url),
        "support-url": SUB_SUPPORT_URL,
        "profile-update-interval": SUB_UPDATE_INTERVAL,
        **sub_headers,
        "subscription-userinfo": "; ".join(
            f"{key}={val}"
            for key, val in get_subscription_user_info(user).items()
        )
    }

    if not register_device(request, db, dbuser, user_agent):
        return device_limit_response(response_headers)

    config = client_config.get(client_type)
    conf = generate_subscription(user=user,
                                 config_format=config["config_format"],
                                 as_base64=config["as_base64"],
                                 reverse=config["reverse"])

    return Response(content=conf, media_type=config["media_type"], headers=response_headers)
