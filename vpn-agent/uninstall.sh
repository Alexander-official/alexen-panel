#!/usr/bin/env bash
# Removes everything Alexen put on this server, and nothing else:
#   - the node (alexen-node container, /opt/alexen-node, /var/lib/alexen-node; an old /opt/marzban-node too)
#   - the agent (alexen-vpn container, /opt/alexen-vpn, /var/lib/alexen-vpn)
#   - its iptables chains and rules (preroute DNAT / MASQUERADE / FORWARD, VPN NAT), in nft and legacy tables
#   - its tunnel interfaces (alxt*, awg0, tun-alexen), WireGuard files, policy routing rules 7000-7999
#   - the UDP buffer tuning file
# Other panels (3x-ui, ...) and Docker itself stay as they are.
# Usage: curl -fsSL https://<panel>/vpn-agent/uninstall.sh | sudo bash
set -u
[ "$(id -u)" -eq 0 ] || { echo "run as root (sudo)"; exit 1; }
say() { echo "==> $*"; }

say "stopping and removing the Alexen containers"
for c in alexen-node alexen-vpn marzban-node marzban-node-marzban-node-1; do
  if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$c"; then
    # only Alexen's / Marzban-node's own containers (by their image), never another panel's
    img=$(docker inspect -f '{{.Config.Image}}' "$c" 2>/dev/null)
    case "$img" in
      *marzban-node*|*alexen*) docker rm -f "$c" >/dev/null && echo "   removed $c ($img)";;
      *) echo "   kept $c ($img): not an Alexen container";;
    esac
  fi
done
for d in /opt/alexen-node /opt/marzban-node; do
  [ -f "$d/docker-compose.yml" ] && (cd "$d" && docker compose down >/dev/null 2>&1 || docker-compose down >/dev/null 2>&1 || true)
done
docker rmi alexen-vpn-agent:latest >/dev/null 2>&1 || true

say "removing Alexen's firewall rules"
for ipt in iptables iptables-legacy; do
  command -v $ipt >/dev/null 2>&1 || continue
  for table in nat mangle filter; do
    for chain in ALEXEN-PREROUTE ALEXEN-PREROUTE-OUT ALEXEN-PREROUTE-POST ALEXEN-PREROUTE-FILTER ALEXEN-PREROUTE-FWD; do
      # the jumps into the chain, then the chain itself
      $ipt -t $table -S 2>/dev/null | grep -- "-j $chain\$" | sed 's/^-A /-D /' | while read -r rule; do
        eval "$ipt -t $table $rule" 2>/dev/null
      done
      $ipt -t $table -F $chain 2>/dev/null && $ipt -t $table -X $chain 2>/dev/null && echo "   $ipt $table: $chain removed"
    done
  done
  # the VPN services' NAT / FORWARD rules (AmneziaWG awg0, OpenVPN tun-alexen, link alxt*)
  for table in nat filter; do
    $ipt -t $table -S 2>/dev/null | grep -E -- "(-i|-o) (awg0|tun-alexen|alxt[0-9]+)( |\$)|-s 10\.6[67]\.0\.0/16" | sed 's/^-A /-D /' | while read -r rule; do
      eval "$ipt -t $table $rule" 2>/dev/null && echo "   $ipt $table: removed $rule"
    done
  done
done

say "removing Alexen's tunnel interfaces and routing rules"
for ifc in $(ip -o link show 2>/dev/null | awk -F': ' '{print $2}' | cut -d@ -f1 | grep -E '^(alxt[0-9]+|awg0|tun-alexen)$'); do
  ip link del "$ifc" 2>/dev/null && echo "   interface $ifc removed"
done
for pref in $(ip rule show 2>/dev/null | awk -F: '$1>=7000 && $1<8000 {print $1}'); do
  ip rule del pref "$pref" 2>/dev/null && echo "   ip rule $pref removed"
done
rm -f /etc/wireguard/alxt*.conf

say "removing Alexen's files"
rm -rf /opt/alexen-node /var/lib/alexen-node /opt/alexen-vpn /var/lib/alexen-vpn /etc/sysctl.d/99-alexen-udp.conf
[ -d /opt/marzban-node ] && [ ! -f /opt/marzban-node/docker-compose.yml ] && rmdir /opt/marzban-node 2>/dev/null

say "done: Alexen is removed from this server (other panels and Docker are untouched)"
if docker ps --format '{{.Names}}' 2>/dev/null | grep -qE '^(alexen-node|alexen-vpn)$'; then echo "   !! an Alexen container is still running"; exit 1; fi
