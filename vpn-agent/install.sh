#!/usr/bin/env bash
# Installs (or updates) the Alexen VPN agent on a server. The panel shows the
# full command under Nodes > VPN services:
#   curl -fsSL <panel>/vpn-agent/install.sh | sudo bash -s -- <panel url> <panel certificate, base64> [agent port]
set -euo pipefail
PANEL="${1:?panel url missing}"
CERT_B64="${2:?panel certificate missing}"
PORT="${3:-62060}"
DIR=/opt/alexen-vpn

echo "==> Alexen VPN agent (port $PORT)"
if ! command -v docker >/dev/null 2>&1; then
  echo "==> installing Docker"
  curl -fsSL https://get.docker.com | sh
fi
modprobe tun 2>/dev/null || true
mkdir -p "$DIR/build" /var/lib/alexen-vpn
echo "==> downloading the agent from $PANEL"
curl -fsSL "$PANEL/vpn-agent/agent.tar.gz" | tar -xz -C "$DIR/build"
echo "$CERT_B64" | base64 -d > "$DIR/panel.pem"
echo "==> building (compiles AmneziaWG, takes a few minutes the first time)"
docker build -q -t alexen-vpn-agent:latest "$DIR/build"
docker rm -f alexen-vpn >/dev/null 2>&1 || true
docker run -d --name alexen-vpn --restart always --network host --privileged \
  -e AGENT_PORT="$PORT" \
  -v "$DIR/panel.pem:/etc/alexen-vpn/panel.pem:ro" \
  -v /var/lib/alexen-vpn:/var/lib/alexen-vpn \
  alexen-vpn-agent:latest >/dev/null
sleep 2
if docker ps --filter name=alexen-vpn --filter status=running -q | grep -q .; then
  echo "==> running. Open TCP $PORT for the panel, and the AmneziaWG / OpenVPN ports you pick in the panel."
  if command -v ufw >/dev/null 2>&1 && ufw status | grep -q "Status: active"; then
    ufw allow "$PORT/tcp" >/dev/null && echo "    (ufw: opened $PORT/tcp)"
  fi
else
  echo "!! the agent did not start:"; docker logs alexen-vpn 2>&1 | tail -20; exit 1
fi
