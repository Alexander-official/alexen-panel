"""Installs Marzban-node and/or the Alexen agent on a VPS over SSH, so adding a
node is: address + login, press the button. Runs in a thread; the panel polls
the job's log. The node gets the panel's certificate and the same Xray binary
the panel runs (when the CPU type matches)."""
import base64
import io
import os
import re
import shlex
import tarfile
import threading
import time
import uuid
from typing import Dict, Optional

from app import logger

jobs: Dict[str, dict] = {}
_ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]|\r")
AGENT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "vpn-agent")
PANEL_XRAY = "/usr/local/bin/xray"

COMPOSE = """services:
  marzban-node:
    image: gozargah/marzban-node:latest
    restart: always
    network_mode: host
    environment:
      SERVICE_PORT: "{port}"
      XRAY_API_PORT: "{api_port}"
      SERVICE_PROTOCOL: "rest"
      SSL_CLIENT_CERT_FILE: "/var/lib/marzban-node/ssl_client_cert.pem"
{xray_env}    volumes:
      - /var/lib/marzban-node:/var/lib/marzban-node
"""


class InstallError(Exception):
    pass


def _key_from_text(text: str, passphrase: str):
    import paramiko
    errors = []
    for cls in (paramiko.Ed25519Key, paramiko.RSAKey, paramiko.ECDSAKey):
        try:
            return cls.from_private_key(io.StringIO(text.strip() + "\n"), password=passphrase or None)
        except paramiko.PasswordRequiredException:
            raise InstallError("The private key is encrypted: enter its passphrase")
        except Exception as e:
            errors.append(e)
    raise InstallError("Can't read the private key (OpenSSH / PEM, RSA / Ed25519 / ECDSA expected)")


def connect(host: str, port: int, username: str, password: str = "", key: str = "", passphrase: str = ""):
    import paramiko
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        client.connect(host, port=port, username=username, password=password or None,
                       pkey=_key_from_text(key, passphrase) if key else None,
                       timeout=15, banner_timeout=20, auth_timeout=20,
                       look_for_keys=False, allow_agent=False)
    except InstallError:
        raise
    except paramiko.AuthenticationException:
        raise InstallError("SSH login failed: wrong username, password or key")
    except Exception as e:
        raise InstallError(f"Can't connect to {host}:{port} over SSH ({e.__class__.__name__}: {e})")
    return client


class _Session:
    def __init__(self, client, username: str, password: str, log):
        self.client = client
        self.root = username == "root"
        self.password = password
        self.log = log

    def run(self, command: str, sudo: bool = True, check: bool = True, quiet: bool = False) -> str:
        full = command
        if sudo and not self.root:
            # with a key login there is no password to give sudo: it must not ask (NOPASSWD)
            flag = "-S -p ''" if self.password else "-n"
            full = f"sudo {flag} bash -c {shlex.quote(command)}"
        chan = self.client.get_transport().open_session()
        chan.get_pty()
        chan.exec_command(full)
        if sudo and not self.root and self.password:
            chan.sendall((self.password + "\n").encode())
        out, buf = [], b""
        deadline = time.time() + 1800
        while True:
            if time.time() > deadline:
                chan.close()
                raise InstallError(f"timed out: {command[:120]}")
            if chan.recv_ready():
                buf += chan.recv(4096)
                *lines, buf = buf.split(b"\n")
                for line in lines:
                    text = _ANSI.sub("", line.decode("utf-8", "replace")).rstrip()
                    if text and text != self.password:
                        out.append(text)
                        if not quiet:
                            self.log(text)
            elif chan.exit_status_ready() and not chan.recv_ready():
                break
            else:
                time.sleep(0.05)
        if buf.strip():
            text = _ANSI.sub("", buf.decode("utf-8", "replace")).rstrip()
            out.append(text)
            if not quiet:
                self.log(text)
        code = chan.recv_exit_status()
        if check and code != 0:
            raise InstallError(f"command failed ({code}): {command[:120]}")
        return "\n".join(out)

    def upload(self, data: bytes, path: str, mode: int = 0o644):
        """to a temp file as the login user, then moved into place as root"""
        tmp = f"/tmp/alexen-{uuid.uuid4().hex[:8]}"
        sftp = self.client.open_sftp()
        try:
            with sftp.file(tmp, "wb") as f:
                f.set_pipelined(True)
                f.write(data)
        finally:
            sftp.close()
        self.run(f"install -D -o root -g root -m {mode:o} {tmp} {shlex.quote(path)}; rc=$?; rm -f {tmp}; exit $rc",
                 quiet=True)


def _agent_bundle() -> bytes:
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        for name in ("Dockerfile", "agent.py"):
            tar.add(os.path.join(AGENT_DIR, name), arcname=name)
    return buf.getvalue()


def _panel_arch() -> str:
    return os.uname().machine


def install(job: dict, *, host: str, port: int, username: str, password: str, key: str, passphrase: str,
            node: Optional[dict], agent: bool, panel_url: str, cert: str):
    log = lambda line: job["lines"].append(line[-400:])
    step = lambda text: (job.update(step=text), log(f"==> {text}"))
    step(f"connecting to {username}@{host}:{port}")
    client = connect(host, port, username, password, key, passphrase)
    try:
        s = _Session(client, username, password, log)
        if not s.root:
            s.run("true", quiet=True)      # sudo works?
        arch = s.run("uname -m", sudo=False, quiet=True).strip().splitlines()[-1]
        osname = s.run(". /etc/os-release 2>/dev/null && echo \"$PRETTY_NAME\" || uname -sr",
                       sudo=False, quiet=True).strip().splitlines()[-1]
        log(f"{osname} · {arch}")
        step("checking Docker")
        s.run("command -v docker >/dev/null 2>&1 || (echo 'installing Docker...' && "
              "curl -fsSL https://get.docker.com | sh)")
        if node:
            step("installing Marzban-node")
            s.upload(cert.encode(), "/var/lib/marzban-node/ssl_client_cert.pem")
            xray_env = ""
            if os.path.exists(PANEL_XRAY) and arch == _panel_arch():
                log("copying the panel's Xray (same version as the panel)")
                with open(PANEL_XRAY, "rb") as f:
                    s.upload(f.read(), "/var/lib/marzban-node/xray-core/xray", 0o755)
                xray_env = '      XRAY_EXECUTABLE_PATH: "/var/lib/marzban-node/xray-core/xray"\n'
            else:
                log("the node's own Xray is used (different CPU type)")
            compose = COMPOSE.format(port=int(node["port"]), api_port=int(node["api_port"]), xray_env=xray_env)
            s.upload(compose.encode(), "/opt/marzban-node/docker-compose.yml")
            s.run("cd /opt/marzban-node && (docker compose pull -q || true) && "
                  "(docker compose up -d --force-recreate || docker-compose up -d --force-recreate)")
            s.run(f"if command -v ufw >/dev/null 2>&1 && ufw status | grep -q 'Status: active'; then "
                  f"ufw allow {int(node['port'])}/tcp >/dev/null; ufw allow {int(node['api_port'])}/tcp >/dev/null; "
                  f"echo 'ufw: opened {int(node['port'])}, {int(node['api_port'])}'; fi", check=False)
        if agent:
            step("installing the Alexen agent")
            s.upload(_agent_bundle(), "/tmp/alexen-agent.tar.gz")
            with open(os.path.join(AGENT_DIR, "install.sh"), "rb") as f:
                s.upload(f.read(), "/tmp/alexen-agent-install.sh", 0o755)
            b64 = base64.b64encode(cert.encode()).decode()
            s.run(f"AGENT_TARBALL=/tmp/alexen-agent.tar.gz bash /tmp/alexen-agent-install.sh "
                  f"{shlex.quote(panel_url)} {b64}; rc=$?; rm -f /tmp/alexen-agent.tar.gz /tmp/alexen-agent-install.sh; exit $rc")
        step("done")
    finally:
        client.close()


def start(**kwargs) -> str:
    job_id = uuid.uuid4().hex[:12]
    job = {"id": job_id, "lines": [], "done": False, "ok": False, "error": "", "step": "", "started": time.time()}
    jobs[job_id] = job
    on_done = kwargs.pop("on_done", None)

    def work():
        try:
            install(job, **kwargs)
            job["ok"] = True
            if on_done:
                on_done()
        except InstallError as e:
            job["error"] = str(e)
        except Exception as e:
            logger.exception("node install")
            job["error"] = f"{e.__class__.__name__}: {e}"
        finally:
            job["done"] = True
            # forget old jobs
            for k in [k for k, j in jobs.items() if time.time() - j["started"] > 6 * 3600]:
                jobs.pop(k, None)

    threading.Thread(target=work, daemon=True).start()
    return job_id
