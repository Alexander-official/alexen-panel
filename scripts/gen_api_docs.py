"""Regenerate docs/openapi.json and docs/API.md from the FastAPI app.

Run from the repo root (needs the app importable):  PYTHONPATH=. python scripts/gen_api_docs.py
Inside the running container:  docker exec -e PYTHONPATH=/code alexen python /code/scripts/gen_api_docs.py
"""
import json, os, re

from app import app, __version__

import os as _os
OUT = _os.path.join(_os.path.dirname(_os.path.dirname(_os.path.abspath(__file__))), "docs")
os.makedirs(OUT, exist_ok=True)

spec = app.openapi()
# pin a clean version/description
spec["info"]["version"] = __version__
with open(os.path.join(OUT, "openapi.json"), "w", encoding="utf-8") as f:
    json.dump(spec, f, ensure_ascii=False, indent=2, sort_keys=False)

paths = spec.get("paths", {})
comps = spec.get("components", {}).get("schemas", {})

# group operations by tag, preserving a sensible order
TAG_ORDER = ["Admin", "User", "User Template", "Subscription", "Node", "Core", "Chain",
             "Preroute", "Outbounds", "Groups", "Settings", "Online", "Traffic", "Stats",
             "Overview", "Activity", "Backup", "Telegram", "Notifications", "Profile",
             "System", "Update", "VPN", "License"]

ops = {}  # tag -> list of (method, path, op)
for path, methods in paths.items():
    for method, op in methods.items():
        if not isinstance(op, dict):
            continue
        tag = (op.get("tags") or ["Other"])[0]
        ops.setdefault(tag, []).append((method.upper(), path, op))

ordered_tags = [t for t in TAG_ORDER if t in ops] + sorted(t for t in ops if t not in TAG_ORDER)


def ref_name(ref):
    return ref.rsplit("/", 1)[-1] if ref else ""


def type_of(schema):
    if not isinstance(schema, dict):
        return "any"
    if "$ref" in schema:
        return ref_name(schema["$ref"])
    if "anyOf" in schema or "oneOf" in schema:
        return " | ".join(type_of(s) for s in schema.get("anyOf", schema.get("oneOf", [])))
    if schema.get("type") == "array":
        return f"[{type_of(schema.get('items', {}))}]"
    t = schema.get("type", "object")
    if schema.get("enum"):
        return f"{t} ({', '.join(map(str, schema['enum']))})"
    return t


def anchor(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


lines = []
lines.append(f"# Alexen API reference\n")
lines.append(f"Generated from the OpenAPI schema of **{spec['info']['title']} v{spec['info']['version']}** "
             f"({len(paths)} paths). The machine-readable spec is [`openapi.json`](./openapi.json) — "
             f"import it into Postman/Insomnia or a Redoc/Swagger viewer.\n")
lines.append("## Authentication\n")
lines.append("Most endpoints need a bearer token. Get one with the admin login, then send it as "
             "`Authorization: Bearer <token>`:\n")
lines.append("```bash\n"
             "curl -X POST https://YOUR-PANEL/api/admin/token \\\n"
             "     -d 'username=<admin>&password=<password>'\n"
             "# -> {\"access_token\": \"...\", \"token_type\": \"bearer\"}\n\n"
             "curl https://YOUR-PANEL/api/users \\\n"
             "     -H 'Authorization: Bearer <access_token>'\n```\n")
lines.append("Subscription endpoints under `/sub/...` are public and authenticated by the token in the URL.\n")
lines.append("> Interactive docs (Swagger UI at `/docs`, Redoc at `/redoc`) are off by default; start the "
             "panel with the `DOCS=True` environment variable to enable them.\n")

# index
lines.append("## Endpoints by area\n")
for tag in ordered_tags:
    lines.append(f"- [{tag}](#{anchor(tag)}) — {len(ops[tag])} endpoint(s)")
lines.append("")

for tag in ordered_tags:
    lines.append(f"\n## {tag}\n")
    # stable order: by path then method
    for method, path, op in sorted(ops[tag], key=lambda x: (x[1], x[0])):
        summary = op.get("summary") or op.get("description", "").strip().split("\n")[0] or ""
        lines.append(f"### `{method} {path}`")
        if summary:
            lines.append(f"\n{summary}\n")
        # parameters
        params = op.get("parameters", [])
        if params:
            lines.append("**Parameters**\n")
            lines.append("| name | in | type | required |")
            lines.append("| --- | --- | --- | --- |")
            for p in params:
                lines.append(f"| `{p.get('name')}` | {p.get('in')} | {type_of(p.get('schema', {}))} | "
                             f"{'yes' if p.get('required') else 'no'} |")
            lines.append("")
        # request body
        rb = op.get("requestBody", {})
        content = rb.get("content", {}) if isinstance(rb, dict) else {}
        js = content.get("application/json", {}).get("schema") if content else None
        if js is not None:
            lines.append(f"**Request body**: `{type_of(js)}`\n")
        # responses
        resp = op.get("responses", {})
        if resp:
            codes = ", ".join(f"`{c}`" for c in sorted(resp.keys()))
            lines.append(f"**Responses**: {codes}\n")

with open(os.path.join(OUT, "API.md"), "w", encoding="utf-8") as f:
    f.write("\n".join(lines) + "\n")

print("wrote", os.path.join(OUT, "openapi.json"))
print("wrote", os.path.join(OUT, "API.md"))
print("API.md lines:", len(lines))
