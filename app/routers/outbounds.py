"""Outbounds page (app/outbound_tools.py): test outbounds from the panel or a
node, and the traffic each outbound has carried"""
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app import outbound_tools
from app.models.admin import Admin
from app.utils import responses

router = APIRouter(tags=["Outbounds"], prefix="/api/outbounds", responses={401: responses._401, 403: responses._403})


class TestIn(BaseModel):
    outbounds: List[dict] = Field(..., min_length=1, max_length=64)
    server: str = "master"          # "master" or a node id: where the test runs
    url: Optional[str] = None       # the delay URL (default: Google's 204 page)
    sites: bool = True              # also try YouTube, Instagram, ...


@router.post("/test")
def test_outbounds(body: TestIn, _: Admin = Depends(Admin.check_sudo_admin)):
    if body.server != "master" and not body.server.isdigit():
        raise HTTPException(400, "Unknown server")
    first = (body.url or "").strip() or outbound_tools.SITES[0][1]
    if not first.startswith(("http://", "https://")):
        raise HTTPException(400, "The test URL must start with http:// or https://")
    urls = [first] + ([u for _, u in outbound_tools.SITES[1:]] if body.sites else [])
    names = ["URL"] + ([n for n, _ in outbound_tools.SITES[1:]] if body.sites else [])
    try:
        res = outbound_tools.test(body.outbounds, body.server, urls)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {"sites": names, "results": res}


@router.get("/traffic")
def get_traffic(_: Admin = Depends(Admin.check_sudo_admin)):
    return outbound_tools.traffic()


class ResetIn(BaseModel):
    tag: Optional[str] = None   # None: everything


@router.post("/traffic/reset")
def reset_traffic(body: ResetIn, _: Admin = Depends(Admin.check_sudo_admin)):
    outbound_tools.reset(body.tag)
    return outbound_tools.traffic()
