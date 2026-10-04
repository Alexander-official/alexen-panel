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
    """Serve hashed assets with long cache, but never let the browser cache
    index.html / html pages — otherwise a deployed update is invisible until a
    manual hard refresh."""
    async def get_response(self, path, scope):
        response: Response = await super().get_response(path, scope)
        media = response.headers.get("content-type", "")
        if path.endswith(".html") or media.startswith("text/html"):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        elif path.startswith("statics/") and "/locales/" not in path:
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
    app.mount(
        '/statics/',
        StaticFiles(directory=statics_dir, html=True),
        name="statics"
    )


@app.on_event("startup")
def startup():
    if DEBUG:
        run_dev()
    else:
        run_build()
