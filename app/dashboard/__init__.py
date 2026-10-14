import atexit
import os
import subprocess
from pathlib import Path

from app import app
from config import DEBUG, VITE_BASE_API, DASHBOARD_PATH
from fastapi.staticfiles import StaticFiles
from starlette.responses import Response

base_dir = Path(__file__).parent
build_dir = base_dir / 'build'
statics_dir = build_dir / 'statics'


def build():
    proc = subprocess.Popen(
        ['npm', 'run', 'build', '--',  '--outDir', build_dir, '--assetsDir', 'statics'],
        env={**os.environ, 'VITE_BASE_API': VITE_BASE_API},
        cwd=base_dir
    )
    proc.wait()
    with open(build_dir / 'index.html', 'r') as file:
        html = file.read()
    with open(build_dir / '404.html', 'w') as file:
        file.write(html)


def run_dev():
    proc = subprocess.Popen(
        ['npm', 'run', 'dev', '--', '--host', '0.0.0.0', '--clearScreen', 'false', '--base', os.path.join(DASHBOARD_PATH, '')],
        env={**os.environ, 'VITE_BASE_API': VITE_BASE_API},
        cwd=base_dir
    )

    atexit.register(proc.terminate)


class NoCacheHTMLStatics(StaticFiles):
    # set for a mount that only holds content-hashed build files (/statics/)
    hashed_assets = False

    """Serve hashed assets with long cache, but never let the browser cache
    index.html / html pages — otherwise a deployed update is invisible until a
    manual hard refresh."""
    PRECOMPRESSED = (".js", ".css", ".html", ".json", ".svg")

    def _precompressed(self, path, scope):
        """the build's ready .br / .gz copy of this file (build_dashboard.sh), if the browser takes it"""
        if not path.endswith(self.PRECOMPRESSED):
            return None
        accept = dict(scope.get("headers") or []).get(b"accept-encoding", b"").decode().lower()
        source, source_stat = self.lookup_path(path)
        if not source_stat:
            return None
        for encoding, ext in (("br", ".br"), ("gzip", ".gz")):
            if encoding not in accept:
                continue
            full, stat = self.lookup_path(path + ext)
            if stat and stat.st_mtime >= source_stat.st_mtime:
                import mimetypes
                from starlette.responses import FileResponse
                media = mimetypes.guess_type(path)[0] or "application/octet-stream"
                if media.startswith("text/") or media in ("application/javascript", "application/json"):
                    media += "; charset=utf-8"
                r = FileResponse(full, stat_result=stat, media_type=media)
                r.headers["content-encoding"] = encoding
                r.headers["vary"] = "Accept-Encoding"
                return r
        return None

    async def get_response(self, path, scope):
        response: Response = self._precompressed(path, scope) or await super().get_response(path, scope)
        # app routes like /dashboard/login/ have no file: they get the app itself with 200
        # (the 404 page is the same html, but its status upset monitors and proxies);
        # a missing asset (a name with an extension) stays a real 404
        if response.status_code == 404 and not self.hashed_assets and "." not in path.rsplit("/", 1)[-1] and not path.startswith("statics"):
            response = await super().get_response("index.html", scope)
        media = response.headers.get("content-type", "")
        if path.endswith(".html") or media.startswith("text/html"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        elif (path.startswith("statics/") or self.hashed_assets) and "locales/" not in path:
            # vite puts a content hash in these names, so they never change
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        return response


def run_build():
    if not build_dir.is_dir():
        build()

    app.mount(
        DASHBOARD_PATH,
        NoCacheHTMLStatics(directory=build_dir, html=True),
        name="dashboard"
    )
    assets = NoCacheHTMLStatics(directory=statics_dir, html=True)
    assets.hashed_assets = True
    app.mount('/statics/', assets, name="statics")


@app.on_event("startup")
def startup():
    if DEBUG:
        run_dev()
    else:
        run_build()
