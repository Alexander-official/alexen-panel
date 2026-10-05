from fastapi import APIRouter
from . import (
    admin, 
    core, 
    groups,
    node, 
    online,
    stats,
    settings as settings_router,
    subscription, 
    system, 
    traffic,
    user_template, 
    user,
    home,
    vpn,
)

api_router = APIRouter()

routers = [
    admin.router,
    core.router,
    groups.router,
    node.router,
    online.router,
    stats.router,
    settings_router.router,
    subscription.router,
    system.router,
    traffic.router,
    user_template.router,
    user.router,
    home.router,
    vpn.router,
    vpn.files_router,
]

for router in routers:
    api_router.include_router(router)

__all__ = ["api_router"]