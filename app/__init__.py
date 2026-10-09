import logging

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from fastapi.routing import APIRoute

from config import ALLOWED_ORIGINS, DOCS, XRAY_SUBSCRIPTION_PATH

__version__ = "0.8.4"

app = FastAPI(
    title="MarzbanAPI",
    description="Unified GUI Censorship Resistant Solution Powered by Xray",
    version=__version__,
    docs_url="/docs" if DOCS else None,
    redoc_url="/redoc" if DOCS else None,
    # the API map is for developers only (DOCS=True), not for anyone who asks
    openapi_url="/openapi.json" if DOCS else None,
)

scheduler = BackgroundScheduler(
    {"apscheduler.job_defaults.max_instances": 20}, timezone="UTC"
)
logger = logging.getLogger("uvicorn.error")

# the dashboard bundle is ~2.8MB raw, ~0.8MB gzipped
app.add_middleware(GZipMiddleware, minimum_size=1024)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    # credentials only with named origins: "*" plus credentials is never right
    allow_credentials="*" not in ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)
class SecurityHeadersMiddleware:
    """basic browser protections on every answer: no framing by other sites
    (clickjacking), no MIME sniffing, no full URLs (with tokens) in Referer"""
    HEADERS = [(b"x-frame-options", b"SAMEORIGIN"), (b"x-content-type-options", b"nosniff"),
               (b"referrer-policy", b"strict-origin-when-cross-origin")]

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)

        async def send_with_headers(message):
            if message["type"] == "http.response.start":
                have = {k.lower() for k, _ in message.get("headers", [])}
                message["headers"] = list(message.get("headers", [])) + [h for h in self.HEADERS if h[0] not in have]
            await send(message)
        await self.app(scope, receive, send_with_headers)


app.add_middleware(SecurityHeadersMiddleware)


class SubPathMiddleware:
    """serves /<path>/... (Domain settings, app/subscription/domain.py) as
    /<XRAY_SUBSCRIPTION_PATH>/...; the default path keeps working too"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            from app.subscription import domain
            custom = domain.get().path
            if custom and custom != XRAY_SUBSCRIPTION_PATH:
                path = scope.get("path", "")
                if path == f"/{custom}" or path.startswith(f"/{custom}/"):
                    scope = dict(scope)
                    scope["path"] = f"/{XRAY_SUBSCRIPTION_PATH}" + path[len(custom) + 1:]
                    scope["raw_path"] = scope["path"].encode()
        await self.app(scope, receive, send)


app.add_middleware(SubPathMiddleware)

from app.activity import ActivityMiddleware  # noqa: E402

app.add_middleware(ActivityMiddleware)

from app import dashboard, jobs, routers, telegram  # noqa
from app.routers import api_router  # noqa

app.include_router(api_router)


def use_route_names_as_operation_ids(app: FastAPI) -> None:
    for route in app.routes:
        if isinstance(route, APIRoute):
            route.operation_id = route.name


use_route_names_as_operation_ids(app)


@app.on_event("startup")
def on_startup():
    # newer FastAPI also lists included routers here: they have no path of their own
    paths = [f"{r.path}/" for r in app.routes if getattr(r, "path", None)]
    paths.append("/api/")
    if f"/{XRAY_SUBSCRIPTION_PATH}/" in paths:
        raise ValueError(
            f"you can't use /{XRAY_SUBSCRIPTION_PATH}/ as subscription path it reserved for {app.title}"
        )
    from app.db import repair
    repair.users_without_proxies()
    repair.out_of_range_values()
    scheduler.start()


@app.on_event("shutdown")
def on_shutdown():
    scheduler.shutdown()


from sqlalchemy.orm.exc import ObjectDeletedError, StaleDataError  # noqa: E402


@app.exception_handler(StaleDataError)
@app.exception_handler(ObjectDeletedError)
def concurrent_change_handler(request: Request, exc: Exception):
    # another request deleted / changed the same row in the meantime (e.g. delete
    # and edit at once): a clear 409 instead of a 500
    return JSONResponse(status_code=status.HTTP_409_CONFLICT,
                        content={"detail": "It was changed or deleted at the same time: reload and try again"})


from sqlalchemy.exc import OperationalError as _DBOperationalError  # noqa: E402


@app.exception_handler(_DBOperationalError)
def database_unavailable_handler(request: Request, exc: Exception):
    # locked / unreachable database: a clear, retryable answer instead of a bare 500
    logger.error(f"database unavailable on {request.method} {request.url.path}: {str(exc).splitlines()[0][:200]}")
    return JSONResponse(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, headers={"Retry-After": "5"},
                        content={"detail": "The database is busy or unavailable: try again in a moment"})


@app.exception_handler(RequestValidationError)
def validation_exception_handler(request: Request, exc: RequestValidationError):
    details = {}
    for error in exc.errors():
        details[error["loc"][-1]] = error.get("msg")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=jsonable_encoder({"detail": details}),
    )
