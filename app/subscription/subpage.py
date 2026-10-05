"""Renders the user-defined "sub page" header block that is prepended to a
subscription (PasarGuard style). The admin writes a template per user state,
e.g.:

    #profile-title: base64: Alexander LLC
    #announce: base64: Hos geldiniz {username}
    Limit: {used} / {limit}  ·  Kalan: {remaining} / {expiretime}
    #support-url: https://t.me/alexvpns

Directives (#profile-title, #announce, #support-url) also become HTTP headers;
everything is rendered with the user's values. A `base64:` right after the
directive encodes that value. {lowercase} aliases map to Marzban's variables.
"""
import base64
import re
from typing import Dict, List, Tuple

from app.subscription.share import setup_format_variables

DIRECTIVES = ("profile-title", "announce", "support-url")
_DIRECTIVE_RE = re.compile(r"^#(profile-title|announce|support-url)\s*:\s*", re.IGNORECASE)

# lowercase aliases -> Marzban format variable names
ALIASES = {
    "username": "USERNAME",
    "used": "DATA_USAGE",
    "limit": "DATA_LIMIT",
    "remaining": "DATA_LEFT",
    "data_left": "DATA_LEFT",
    "expiretime": "EXPIRE_DATE",
    "expire": "EXPIRE_DATE",
    "timeleft": "TIME_LEFT",
    "remainingtime": "TIME_LEFT",
    "days": "DAYS_LEFT",
    "status": "STATUS_TEXT",
}


def _substitute(text: str, variables: dict) -> str:
    def repl(m):
        key = m.group(1)
        mapped = ALIASES.get(key.lower(), key)
        return str(variables.get(mapped, m.group(0)))
    return re.sub(r"\{([A-Za-z_]+)\}", repl, text)


def _encode_if_b64(value: str) -> Tuple[str, bool]:
    """Returns (output_value, is_base64). A leading 'base64:' means encode the rest."""
    stripped = value.lstrip()
    if stripped.lower().startswith("base64:"):
        raw = stripped[stripped.lower().index("base64:") + len("base64:"):].lstrip()
        return "base64:" + base64.b64encode(raw.encode()).decode(), True
    return value, False


def render(template: str, extra_data: dict) -> Tuple[List[str], Dict[str, str]]:
    """Returns (prefix_lines, headers). prefix_lines go at the top of a v2ray
    subscription; headers are set on the HTTP response."""
    if not template or not template.strip():
        return [], {}

    variables = setup_format_variables(extra_data)
    lines = template.splitlines()

    # group content: each directive captures following non-directive lines too
    blocks: List[Tuple[str, str]] = []  # (directive|"", value)
    current_key = None
    current_val: List[str] = []

    def flush():
        if current_key is not None or current_val:
            blocks.append((current_key or "", "\n".join(current_val)))

    for line in lines:
        m = _DIRECTIVE_RE.match(line)
        if m:
            flush()
            current_key = m.group(1).lower()
            current_val = [line[m.end():]]
        else:
            current_val.append(line)
    flush()

    prefix_lines: List[str] = []
    headers: Dict[str, str] = {}

    for key, value in blocks:
        value = _substitute(value, variables)
        if key == "":
            # free text (no directive) is shown as a plain comment line
            for ln in value.splitlines():
                if ln.strip():
                    prefix_lines.append(f"# {ln}")
            continue
        out_value, _ = _encode_if_b64(value)
        prefix_lines.append(f"#{key}: {out_value}")
        headers[key] = out_value

    return prefix_lines, headers


def decode_header(value: str) -> str:
    """header value back to text ("base64:..." as made above, or plain)"""
    if not value:
        return ""
    if value.startswith("base64:"):
        try:
            return base64.b64decode(value[len("base64:"):]).decode("utf-8", "replace")
        except Exception:
            return ""
    return value
