from fastapi import APIRouter, Depends, Header, HTTPException, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from config import HOME_PAGE_TEMPLATE, SUB_GATEWAY_PATHS
from app.db import get_db
from app.templates import render_template

router = APIRouter()


@router.get("/", response_class=HTMLResponse)
def base():
    return render_template(HOME_PAGE_TEMPLATE)


def _sub_gateway(
    request: Request,
    url: str = None,
    db: Session = Depends(get_db),
    user_agent: str = Header(default=""),
):
    """Re-serve a subscription addressed as /<gateway>?url=<...>/sub/<token>.

    Some panels were fronted by an external service (an aggregator, a happ/macros
    gateway) that handed clients links of this shape; when the panel takes that job
    over, this keeps the already-issued links working. Enabled per panel through the
    SUB_GATEWAY_PATHS env setting; with it unset no such route is registered."""
    if not url:
        raise HTTPException(status_code=400, detail="url parameter missing")
    from app.dependencies import get_validated_sub
    from app.routers.subscription import (
        client_config, user_subscription, _client_type_subscription)
    # the part after /sub/ is "<token>" or "<token>/.../<client type>": Outline's
    # ssconf deeplink appends /outline to the whole link, so keep the token (first
    # segment) and honour a trailing client type instead of folding it into the token
    rest = url.split("/sub/", 1)[-1].split("?", 1)[0].strip("/")
    parts = [p for p in rest.split("/") if p]
    token = parts[0] if parts else ""
    client_type = next((p for p in parts[1:] if p in client_config), None)
    dbuser = get_validated_sub(token=token, db=db)
    request.scope.setdefault("path_params", {})["token"] = token
    if client_type:
        return _client_type_subscription(request, dbuser, client_type, db, user_agent)
    return user_subscription(request=request, db=db, dbuser=dbuser, user_agent=user_agent)


for _gateway_path in SUB_GATEWAY_PATHS:
    router.add_api_route(f"/{_gateway_path}", _sub_gateway, methods=["GET"])
