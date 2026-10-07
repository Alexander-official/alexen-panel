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


class _Progress:
    """percent for the panel: each step has a weight; inside a long step the
    bar creeps toward the step's end (it can't know how long apt or a build takes)"""

    def __init__(self, job: dict, plan: list):
        self.job, self.total = job, float(sum(w for _, w in plan)) or 1.0
        self.weights = dict(plan)
        self.done = 0.0
        self.cur = None
        self.started = time.time()
        job["percent"] = 0
        job["steps"] = [k for k, _ in plan]
        threading.Thread(target=self._tick, daemon=True).start()

    def step(self, key: str):
        if self.cur:
            self.done += self.weights.get(self.cur, 0)
        self.cur, self.started = key, time.time()
        self.job["step_key"] = key
        self._set(0)

    def _set(self, frac: float):
        w = self.weights.get(self.cur, 0) if self.cur else 0
        self.job["percent"] = min(99, int(100 * (self.done + w * frac) / self.total))

    def _tick(self):
        while not self.job.get("done"):
            if self.cur:
                # half way after ~40 s, never quite reaching the end of the step
                elapsed = time.time() - self.started
                self._set(min(0.95, elapsed / (elapsed + 40)))
            time.sleep(1)

    def finish(self):
        self.job["percent"] = 100


def install(job: dict, *, host: str, port: int, username: str, password: str, key: str, passphrase: str,
            node: Optional[dict], agent: bool, panel_url: str, cert: str, open_ports=()):
    log = lambda line: job["lines"].append(line[-400:])
    plan = [("connect", 4), ("system", 6), ("docker", 25), ("firewall", 3)]
    if node:
        plan += [("node", 25)]
    if agent:
        plan += [("agent", 35)]
    plan += [("finish", 2)]
    prog = _Progress(job, plan)

    def step(key: str, text: str):
        prog.step(key)
        job.update(step=text)
        log(f"==> {text}")

    step("connect", f"connecting to {username}@{host}:{port}")
    client = connect(host, port, username, password, key, passphrase)
    try:
        s = _Session(client, username, password, log)
        if not s.root:
            s.run("true", quiet=True)      # sudo works?
        step("system", "checking the system")
        arch = s.run("uname -m", sudo=False, quiet=True).strip().splitlines()[-1]
        osname = s.run(". /etc/os-release 2>/dev/null && echo \"$PRETTY_NAME\" || uname -sr",
                       sudo=False, quiet=True).strip().splitlines()[-1]
        log(f"{osname} · {arch}")
        # the tools the rest needs (curl, ca-certificates, tar), on Debian/Ubuntu, RHEL-likes and Alpine
        s.run("command -v curl >/dev/null 2>&1 && command -v tar >/dev/null 2>&1 || "
              "(command -v apt-get >/dev/null && (apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq curl ca-certificates tar)) || "
              "(command -v dnf >/dev/null && dnf install -y -q curl ca-certificates tar) || "
              "(command -v yum >/dev/null && yum install -y -q curl ca-certificates tar) || "
              "(command -v apk >/dev/null && apk add -q curl ca-certificates tar)", check=False)
        s.run("modprobe tun 2>/dev/null; modprobe wireguard 2>/dev/null; true", check=False, quiet=True)
        step("docker", "checking Docker")
        s.run("command -v docker >/dev/null 2>&1 || (echo 'installing Docker...' && "
              "curl -fsSL https://get.docker.com | sh)")
        s.run("systemctl enable --now docker >/dev/null 2>&1 || service docker start >/dev/null 2>&1 || true",
              check=False, quiet=True)
        s.run("docker compose version >/dev/null 2>&1 || command -v docker-compose >/dev/null 2>&1 || "
              "(command -v apt-get >/dev/null && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker-compose-plugin) || true",
              check=False)
        step("firewall", "opening the ports in the firewall")
        ports = sorted(set(open_ports) | ({(int(node["port"]), "tcp"), (int(node["api_port"]), "tcp")} if node else set())
                       | ({(62060, "tcp")} if agent else set()))
        if ports:
            ufw = " ".join(f"ufw allow {p}/{proto} >/dev/null;" for p, proto in ports)
            fwd = " ".join(f"firewall-cmd -q --permanent --add-port={p}/{proto};" for p, proto in ports)
            s.run(f"if command -v ufw >/dev/null 2>&1 && ufw status | grep -q 'Status: active'; then {ufw} echo 'ufw: ports opened'; fi; "
                  f"if command -v firewall-cmd >/dev/null 2>&1 && firewall-cmd -q --state 2>/dev/null; then {fwd} firewall-cmd -q --reload; echo 'firewalld: ports opened'; fi; true",
                  check=False)
            log("ports: " + ", ".join(f"{p}/{proto}" for p, proto in ports))
        if node:
            step("node", "installing Marzban-node")
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
            s.run("cd /opt/marzban-node && (docker compose pull -q || docker-compose pull -q || true) && "
                  "(docker compose up -d --force-recreate || docker-compose up -d --force-recreate)")
        if agent:
            step("agent", "installing the Alexen agent (the first build takes a few minutes)")
            s.upload(_agent_bundle(), "/tmp/alexen-agent.tar.gz")
            with open(os.path.join(AGENT_DIR, "install.sh"), "rb") as f:
                s.upload(f.read(), "/tmp/alexen-agent-install.sh", 0o755)
            b64 = base64.b64encode(cert.encode()).decode()
            s.run(f"AGENT_TARBALL=/tmp/alexen-agent.tar.gz bash /tmp/alexen-agent-install.sh "
                  f"{shlex.quote(panel_url)} {b64}; rc=$?; rm -f /tmp/alexen-agent.tar.gz /tmp/alexen-agent-install.sh; exit $rc")
        step("finish", "done")
        prog.finish()
    finally:
        client.close()


def start(**kwargs) -> str:
    job_id = uuid.uuid4().hex[:12]
    job = {"id": job_id, "lines": [], "done": False, "ok": False, "error": "", "step": "", "step_key": "",
           "percent": 0, "steps": [], "started": time.time()}
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
