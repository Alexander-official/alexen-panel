"""Reach a node through SSH when its own ports can't be reached reliably (e.g.
Russian servers whose filtering drops connections from abroad to unusual
ports, while SSH gets through). One SSH connection per node; the node's REST
port and Xray API port are forwarded to local ports on the panel, so the panel
talks to 127.0.0.1:<local> as if the node were here. The SSH connection is
kept alive and opened again when it drops."""
import select
import socket
import threading
import time
from typing import Dict, Optional, Tuple

from app import logger

_tunnels: Dict[int, "Tunnel"] = {}
_lock = threading.Lock()


class Tunnel:
    def __init__(self, node_id: int, login, remote_ports: Tuple[int, int]):
        self.node_id = node_id
        self.login = login
        self.remote_ports = remote_ports
        self.transport = None
        self.error = ""
        self._tlock = threading.Lock()
        self._servers = []
        self.local_ports = []
        self.by_remote: Dict[int, int] = {}
        self.closed = False
        for rport in remote_ports:
            self.local_ports.append(self.forward(rport))

    def forward(self, rport: int) -> int:
        """a local port that leads to this port on the node (made once)"""
        if rport in self.by_remote:
            return self.by_remote[rport]
        srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        srv.bind(("127.0.0.1", 0))
        srv.listen(64)
        self._servers.append(srv)
        local = srv.getsockname()[1]
        self.by_remote[rport] = local
        threading.Thread(target=self._accept, args=(srv, rport), daemon=True).start()
        return local

    # ---- the SSH connection ----
    def _connect(self):
        from app import node_extras, node_install
        lg = self.login
        secret = node_extras.decrypt(lg.secret)
        # filtered networks drop some connection attempts at random: several
        # short tries get through much sooner than one long wait
        last = None
        for attempt in range(6):
            try:
                client = node_install.connect(
                    lg.host, lg.port, lg.username,
                    password=secret if lg.auth == "password" else "",
                    key=secret if lg.auth == "key" else "",
                    passphrase=node_extras.decrypt(lg.passphrase), timeout=6)
                break
            except node_install.InstallError as e:
                last = e
                if "login failed" in str(e) or "private key" in str(e):
                    raise
                time.sleep(0.5)
        else:
            raise last
        t = client.get_transport()
        t.set_keepalive(15)
        self._client = client
        return t

    def transport_alive(self):
        with self._tlock:
            if self.transport is not None and self.transport.is_active():
                return self.transport
            # just failed: don't hammer the server (fail2ban & co. would ban the panel)
            if time.time() - getattr(self, "_failed_at", 0) < 15:
                return None
            try:
                self.transport = self._connect()
                self.error = ""
                logger.info(f"node {self.node_id}: SSH tunnel up")
            except Exception as e:
                self.transport = None
                self.error = str(e)
                self._failed_at = time.time()
                logger.warning(f"node {self.node_id}: SSH tunnel: {e}")
            return self.transport

    # ---- forwarding ----
    def _accept(self, srv, rport):
        while not getattr(self, "closed", False):
            try:
                conn, addr = srv.accept()
            except OSError:
                return
            threading.Thread(target=self._pipe, args=(conn, rport), daemon=True).start()

    def _pipe(self, conn, rport):
        chan = None
        try:
            t = self.transport_alive()
            if t is None:
                conn.close()
                return
            # the node runs on the host network: its ports are on 127.0.0.1 there
            chan = t.open_channel("direct-tcpip", ("127.0.0.1", rport), conn.getpeername(), timeout=15)
            while True:
                r, _, _ = select.select([conn, chan], [], [], 60)
                if conn in r:
                    data = conn.recv(65536)
                    if not data:
                        break
                    chan.sendall(data)
                if chan in r:
                    data = chan.recv(65536)
                    if not data:
                        break
                    conn.sendall(data)
                if not r and (chan.closed or not t.is_active()):
                    break
        except Exception as e:
            logger.debug(f"node {self.node_id}: tunnel channel: {e}")
        finally:
            for x in (chan, conn):
                try:
                    if x is not None:
                        x.close()
                except Exception:
                    pass

    def close(self):
        self.closed = True
        for s in self._servers:
            try:
                s.close()
            except Exception:
                pass
        try:
            if self.transport is not None:
                self.transport.close()
        except Exception:
            pass


def ensure(node_id: int, login, port: int, api_port: int) -> Tuple[int, int]:
    """local (rest port, api port) for this node, opening the tunnel if needed"""
    with _lock:
        t = _tunnels.get(node_id)
        same = t is not None and t.remote_ports == (port, api_port) and \
            (t.login.host, t.login.port, t.login.username, t.login.secret) == \
            (login.host, login.port, login.username, login.secret)
        if not same:
            if t is not None:
                t.close()
            t = Tunnel(node_id, login, (port, api_port))
            _tunnels[node_id] = t
    t.transport_alive()
    return t.local_ports[0], t.local_ports[1]


def local_for(node_id: int, rport: int) -> Optional[int]:
    """when the node is reached through SSH: the local port for one of its ports (e.g. the agent's)"""
    with _lock:
        t = _tunnels.get(node_id)
        return t.forward(rport) if t is not None and not t.closed else None


def stop(node_id: int):
    with _lock:
        t = _tunnels.pop(node_id, None)
    if t is not None:
        t.close()


def state(node_id: int) -> Optional[dict]:
    t = _tunnels.get(node_id)
    if t is None:
        return None
    return {"up": bool(t.transport is not None and t.transport.is_active()), "error": t.error,
            "local_ports": t.local_ports}
