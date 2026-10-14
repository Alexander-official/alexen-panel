#!/usr/bin/env bash
# Alexen panel: installer and command line (Alexander LLC)
#
# Install (as root):
#   bash <(curl -fsSL https://raw.githubusercontent.com/Alexander-official/alexen-panel/main/scripts/alexen.sh) install
#
# It asks for a domain (Let's Encrypt certificate, renewed by itself) or uses a
# self-signed certificate for the server's IP, and for the creator account.
# Without questions:  ALEXEN_DOMAIN=panel.example.com ALEXEN_EMAIL=me@example.com \
#                     ALEXEN_ADMIN=owner ALEXEN_PASSWORD='...' bash alexen.sh install
# Then:  alexen {status|logs|restart|update|backup|admin|uninstall|cli ...}
set -euo pipefail

APP=alexen
REPO="${ALEXEN_REPO:-https://github.com/Alexander-official/alexen-panel.git}"
BRANCH="${ALEXEN_BRANCH:-main}"
RAW="https://raw.githubusercontent.com/Alexander-official/alexen-panel/$BRANCH/scripts/alexen.sh"
APP_DIR=/opt/$APP
SRC_DIR=$APP_DIR/src
DATA_DIR=/var/lib/$APP
ENV_FILE=$APP_DIR/.env
COMPOSE=$APP_DIR/docker-compose.yml
IMAGE=alexen-panel:latest
CLI=/usr/local/bin/$APP

R=$'\e[91m'; G=$'\e[92m'; B=$'\e[94m'; Y=$'\e[93m'; N=$'\e[0m'
say()  { echo "${2:-$B}==> $1${N}"; }
fail() { echo "${R}!! $1${N}" >&2; exit 1; }
need_root() { [ "$(id -u)" -eq 0 ] || fail "run as root (sudo)"; }
# questions work even when the script comes through a pipe
ask() { local q="$1" def="${2:-}" a=""; if [ -r /dev/tty ]; then read -rp "$q" a </dev/tty || true; fi; echo "${a:-$def}"; }
ask_secret() { local q="$1" a=""; if [ -r /dev/tty ]; then read -rsp "$q" a </dev/tty || true; echo >&2; fi; echo "$a"; }
dc() { docker compose -f "$COMPOSE" -p "$APP" "$@"; }

pkg_install() {
    if command -v apt-get >/dev/null; then DEBIAN_FRONTEND=noninteractive apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq "$@" >/dev/null
    elif command -v dnf >/dev/null; then dnf install -y -q "$@" >/dev/null
    elif command -v yum >/dev/null; then yum install -y -q "$@" >/dev/null
    else fail "install $* yourself (no apt/dnf/yum)"; fi
}

install_deps() {
    for c in curl git openssl; do command -v $c >/dev/null || { say "installing $c"; pkg_install $c; }; done
    if ! command -v docker >/dev/null; then
        say "installing Docker"
        curl -fsSL https://get.docker.com | sh >/dev/null
    fi
    (systemctl enable --now docker >/dev/null 2>&1 || service docker start >/dev/null 2>&1 || true)
    for i in $(seq 1 30); do docker info >/dev/null 2>&1 && break; sleep 1; done
    docker info >/dev/null 2>&1 || fail "Docker isn't running"
    docker compose version >/dev/null 2>&1 || pkg_install docker-compose-plugin
}

public_ip() { curl -fsS -m 8 https://api.ipify.org 2>/dev/null || hostname -I | awk '{print $1}'; }

fetch_source() {
    mkdir -p "$APP_DIR"
    if [ -d "$REPO" ]; then                       # a local copy (testing)
        rm -rf "$SRC_DIR"; cp -a "$REPO" "$SRC_DIR"
    elif [ -d "$SRC_DIR/.git" ]; then
        git -C "$SRC_DIR" fetch -q origin "$BRANCH" && git -C "$SRC_DIR" reset -q --hard "origin/$BRANCH"
    else
        git clone -q --depth 1 -b "$BRANCH" "$REPO" "$SRC_DIR"
    fi
}

build_image() {
    say "building the panel (a few minutes the first time)"
    # a second try on the host's network: some servers' Docker bridge has no working DNS
    docker build -q -t "$IMAGE" "$SRC_DIR" >/dev/null 2>/tmp/$APP-build.log \
        || docker build -q --network host -t "$IMAGE" "$SRC_DIR" >/dev/null 2>>/tmp/$APP-build.log \
        || { tail -20 /tmp/$APP-build.log >&2; fail "the image didn't build (log above)"; }
}

certificates() {
    local domain="$1" email="$2"
    mkdir -p "$DATA_DIR/certs"
    if [ -n "$domain" ]; then
        say "getting a Let's Encrypt certificate for $domain (port 80 must be free and point here)"
        docker run --rm -p 80:80 -v "$DATA_DIR/certs/le:/etc/letsencrypt" certbot/certbot certonly --standalone \
            --non-interactive --agree-tos -m "${email:-admin@$domain}" -d "$domain" >/dev/null 2>&1 \
            || fail "no certificate for $domain: check that the domain points to this server and port 80 is open"
        CERT=/var/lib/marzban/certs/le/live/$domain/fullchain.pem
        KEY=/var/lib/marzban/certs/le/live/$domain/privkey.pem
        CA=public
        cat > /etc/cron.d/$APP-cert <<EOF
# Alexen: renew the panel certificate, restart the panel when it changed
17 3 * * * root docker run --rm -p 80:80 -v $DATA_DIR/certs/le:/etc/letsencrypt certbot/certbot renew --quiet --deploy-hook "touch /etc/letsencrypt/.renewed" && [ -f $DATA_DIR/certs/le/.renewed ] && rm -f $DATA_DIR/certs/le/.renewed && docker restart $APP >/dev/null
EOF
    else
        local ip; ip=$(public_ip)
        say "no domain: a self-signed certificate for $ip (the browser warns once; add a domain later for a real one)"
        openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=$ip" -addext "subjectAltName=IP:$ip" \
            -keyout "$DATA_DIR/certs/panel.key" -out "$DATA_DIR/certs/panel.crt" >/dev/null 2>&1
        CERT=/var/lib/marzban/certs/panel.crt; KEY=/var/lib/marzban/certs/panel.key; CA=private
    fi
}

write_config() {
    local host="$1" port="$2"
    mkdir -p "$DATA_DIR"
    [ -f "$DATA_DIR/xray_config.json" ] || cp "$SRC_DIR/xray_config.json" "$DATA_DIR/xray_config.json"
    if [ ! -f "$ENV_FILE" ]; then
        cp "$SRC_DIR/.env.example" "$ENV_FILE"
        cat >> "$ENV_FILE" <<EOF

# ---- Alexen (written by the installer) ----
UVICORN_HOST = "0.0.0.0"
UVICORN_PORT = $port
UVICORN_SSL_CERTFILE = "$CERT"
UVICORN_SSL_KEYFILE = "$KEY"
UVICORN_SSL_CA_TYPE = "$CA"
XRAY_JSON = "/var/lib/marzban/xray_config.json"
SQLALCHEMY_DATABASE_URL = "sqlite:////var/lib/marzban/db.sqlite3"
XRAY_SUBSCRIPTION_URL_PREFIX = "https://$host:$port"
EOF
        chmod 600 "$ENV_FILE"
    fi
    cat > "$COMPOSE" <<EOF
services:
  $APP:
    image: $IMAGE
    container_name: $APP
    restart: always
    env_file: .env
    network_mode: host
    logging:
      driver: json-file
      options: {max-size: "10m", max-file: "3"}
    volumes:
      - $DATA_DIR:/var/lib/marzban
EOF
}

wait_up() {
    local port="$1"
    for i in $(seq 1 90); do
        curl -fsk -o /dev/null "https://127.0.0.1:$port/dashboard/" && return 0
        sleep 2
    done
    dc logs --tail 40 || true
    fail "the panel didn't start (log above)"
}

open_port() {
    local port="$1"
    if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then ufw allow "$port/tcp" >/dev/null; fi
    if command -v firewall-cmd >/dev/null && firewall-cmd -q --state 2>/dev/null; then
        firewall-cmd -q --permanent --add-port="$port/tcp" && firewall-cmd -q --reload; fi
}

create_creator() {
    local user="${1:-}" pass="${2:-}"
    [ -n "$user" ] || user=$(ask "Creator (owner) username [admin]: " admin)
    while [ -z "$pass" ]; do
        pass=$(ask_secret "Password for $user (min. 8 characters): ")
        [ ${#pass} -ge 8 ] || { echo "${Y}too short${N}" >&2; pass=""; [ -r /dev/tty ] || fail "set ALEXEN_PASSWORD"; }
    done
    docker exec -e MARZBAN_ADMIN_PASSWORD="$pass" $APP marzban-cli admin create --sudo --creator -u "$user" -tg "" -dc "" >/dev/null \
        || fail "couldn't create $user (it may exist already: alexen cli admin update -u $user)"
    ADMIN_USER=$user
}

install_cli() {
    if [ -f "$SRC_DIR/scripts/alexen.sh" ]; then install -m 755 "$SRC_DIR/scripts/alexen.sh" "$CLI"
    else curl -fsSL "$RAW" -o "$CLI" && chmod 755 "$CLI"; fi
}

cmd_install() {
    need_root
    [ -f "$COMPOSE" ] && fail "Alexen is installed already (alexen update / alexen uninstall)"
    local domain="${ALEXEN_DOMAIN-__ask__}" email="${ALEXEN_EMAIL:-}" port="${ALEXEN_PORT:-8000}"
    [ "$domain" = "__ask__" ] && domain=$(ask "Panel domain (empty: use the server IP with a self-signed certificate): " "")
    if [ -n "$domain" ] && [ -z "$email" ]; then email=$(ask "E-mail for Let's Encrypt [admin@$domain]: " "admin@$domain"); fi
    install_deps
    say "downloading Alexen"
    fetch_source
    build_image
    certificates "$domain" "$email"
    local host="${domain:-$(public_ip)}"
    write_config "$host" "$port"
    install_cli
    say "starting"
    dc up -d >/dev/null
    wait_up "$port"
    open_port "$port"
    # installed again over kept data: its creator is still there
    ADMIN_USER=$(docker exec $APP python3 -c "from app.db import GetDB; from app.db.models import Admin
with GetDB() as db: a = db.query(Admin).filter(Admin.is_creator == True).first(); print(a.username if a else '')" 2>/dev/null | tail -1)
    if [ -n "$ADMIN_USER" ]; then say "keeping the existing creator: $ADMIN_USER"
    else create_creator "${ALEXEN_ADMIN:-}" "${ALEXEN_PASSWORD:-}"; fi
    echo
    say "Alexen is ready" "$G"
    echo "    Panel:    ${G}https://$host:$port/dashboard/${N}"
    echo "    Creator:  ${ADMIN_USER}"
    [ -z "$domain" ] && echo "    ${Y}Self-signed certificate: the browser asks once; for a real one: alexen uninstall, then install with a domain${N}"
    echo "    Commands: alexen status | logs | restart | update | backup | admin | uninstall"
}

cmd_update() {
    need_root
    say "updating"; fetch_source; build_image; install_cli
    dc up -d --force-recreate >/dev/null 2>&1
    wait_up "$(grep -E '^UVICORN_PORT' "$ENV_FILE" | tail -1 | tr -dc 0-9)"
    docker image prune -f >/dev/null 2>&1 || true
    say "updated" "$G"
}

cmd_backup() {
    need_root
    local f; f=$(docker exec $APP python3 -c "from app import backup; print(backup.save_to_disk())" 2>/dev/null | tail -1)
    [ -n "$f" ] || fail "backup failed"
    say "backup: $DATA_DIR/backups/$(basename "$f")" "$G"
}

cmd_uninstall() {
    need_root
    local a; a=$(ask "Remove Alexen? The data in $DATA_DIR is kept unless you also type 'data': [y/N/data] " n)
    case "$a" in y|Y|data) ;; *) echo "nothing removed"; exit 0;; esac
    [ -f "$COMPOSE" ] && dc down >/dev/null 2>&1 || true
    docker rmi "$IMAGE" >/dev/null 2>&1 || true
    rm -rf "$APP_DIR" /etc/cron.d/$APP-cert "$CLI"
    [ "$a" = data ] && rm -rf "$DATA_DIR" && echo "data removed"
    say "Alexen removed" "$G"
}

case "${1:-help}" in
    install)   cmd_install ;;
    update)    cmd_update ;;
    status)    dc ps ;;
    logs)      dc logs -f --tail 100 ;;
    restart)   need_root; dc restart ;;
    up)        need_root; dc up -d ;;
    down)      need_root; dc down ;;
    backup)    cmd_backup ;;
    admin)     need_root; create_creator "${2:-}" "${ALEXEN_PASSWORD:-}"; say "creator ${ADMIN_USER} added" "$G" ;;
    cli)       shift; need_root; docker exec -it $APP marzban-cli "$@" ;;
    uninstall) cmd_uninstall ;;
    *) echo "Alexen: alexen {install|update|status|logs|restart|up|down|backup|admin [name]|cli ...|uninstall}" ;;
esac
