#!/usr/bin/env bash
# Alexen panel — installer and CLI (Alexander LLC)
# Usage: sudo bash -c "$(curl -sL https://raw.githubusercontent.com/alexen-panel/alexen/master/scripts/alexen.sh)" @ install
set -e

APP_NAME="alexen"
IMAGE="${ALEXEN_IMAGE:-ghcr.io/alexen-panel/alexen:latest}"
REPO_RAW="https://raw.githubusercontent.com/alexen-panel/alexen/master"

APP_DIR="/opt/$APP_NAME"
DATA_DIR="/var/lib/$APP_NAME"
COMPOSE_FILE="$APP_DIR/docker-compose.yml"
ENV_FILE="$APP_DIR/.env"
CLI_PATH="/usr/local/bin/$APP_NAME"

RED=$'\e[91m'; GREEN=$'\e[92m'; BLUE=$'\e[94m'; YELLOW=$'\e[93m'; N=$'\e[0m'
say() { echo "${2:-$BLUE}$1${N}"; }
need_root() { [ "$(id -u)" = 0 ] || { say "Run as root." "$RED"; exit 1; }; }
compose() { docker compose -f "$COMPOSE_FILE" -p "$APP_NAME" "$@"; }

install_docker() {
    if ! command -v docker >/dev/null; then
        say "Installing Docker..."
        curl -fsSL https://get.docker.com | sh
        systemctl enable --now docker
    fi
}

write_files() {
    mkdir -p "$APP_DIR" "$DATA_DIR" "$DATA_DIR/certs" "$DATA_DIR/logs"
    cat > "$COMPOSE_FILE" <<EOF
services:
  $APP_NAME:
    image: $IMAGE
    restart: always
    env_file: .env
    network_mode: host
    volumes:
      - $DATA_DIR:/var/lib/marzban
      - $DATA_DIR/logs:/var/lib/marzban-node
EOF
    if [ ! -f "$ENV_FILE" ]; then
        curl -fsSL "$REPO_RAW/.env.example" -o "$ENV_FILE"
        {
            echo ''
            echo '# ---- Alexen defaults ----'
            echo 'UVICORN_HOST = "0.0.0.0"'
            echo 'UVICORN_PORT = 8000'
            echo 'XRAY_JSON = "/var/lib/marzban/xray_config.json"'
            echo 'SQLALCHEMY_DATABASE_URL = "sqlite:////var/lib/marzban/db.sqlite3"'
        } >> "$ENV_FILE"
    fi
    [ -f "$DATA_DIR/xray_config.json" ] || curl -fsSL "$REPO_RAW/xray_config.json" -o "$DATA_DIR/xray_config.json"
}

install_cli() {
    curl -fsSL "$REPO_RAW/scripts/alexen.sh" -o "$CLI_PATH"
    chmod +x "$CLI_PATH"
}

cmd_install() {
    need_root
    install_docker
    write_files
    install_cli
    say "Pulling image..."
    compose pull
    compose up -d
    say "Alexen installed." "$GREEN"
    say "Create your owner admin with: $APP_NAME cli admin create --sudo" "$YELLOW"
    say "Panel: http://<server>:8000/dashboard/   (set TLS cert in $ENV_FILE)" "$YELLOW"
}

cmd_update() { need_root; install_cli; compose pull; compose down; compose up -d; say "Updated." "$GREEN"; }
cmd_up() { need_root; compose up -d; }
cmd_down() { need_root; compose down; }
cmd_restart() { need_root; compose down; compose up -d; }
cmd_status() { compose ps; }
cmd_logs() { compose logs -f --tail 100; }
cmd_cli() { need_root; docker exec -it "$(compose ps -q $APP_NAME)" alexen-cli "$@"; }
cmd_uninstall() {
    need_root; compose down || true
    read -rp "Delete data in $DATA_DIR too? [y/N] " a
    rm -rf "$APP_DIR"; [ "$a" = y ] && rm -rf "$DATA_DIR"
    rm -f "$CLI_PATH"; say "Removed." "$GREEN"
}

core_update() {
    need_root
    say "Fetching latest Xray-core..."
    local arch; arch=$(uname -m)
    case "$arch" in x86_64) z=Xray-linux-64.zip;; aarch64) z=Xray-linux-arm64-v8a.zip;; *) say "Unsupported arch $arch" "$RED"; exit 1;; esac
    local url; url=$(curl -sL https://api.github.com/repos/XTLS/Xray-core/releases/latest | grep -o "https://[^\"]*$z" | head -1)
    mkdir -p "$DATA_DIR/xray-core"
    curl -fsSL "$url" -o /tmp/xray.zip
    (cd "$DATA_DIR/xray-core" && unzip -o /tmp/xray.zip >/dev/null) && chmod +x "$DATA_DIR/xray-core/xray"
    grep -q '^XRAY_EXECUTABLE_PATH' "$ENV_FILE" \
        && sed -i "s#^XRAY_EXECUTABLE_PATH.*#XRAY_EXECUTABLE_PATH = \"/var/lib/marzban/xray-core/xray\"#" "$ENV_FILE" \
        || echo 'XRAY_EXECUTABLE_PATH = "/var/lib/marzban/xray-core/xray"' >> "$ENV_FILE"
    cmd_restart
    say "Xray-core updated: $("$DATA_DIR/xray-core/xray" version | head -1)" "$GREEN"
}

case "${1:-help}" in
    install) cmd_install ;;
    update) cmd_update ;;
    up) cmd_up ;;
    down) cmd_down ;;
    restart) cmd_restart ;;
    status) cmd_status ;;
    logs) cmd_logs ;;
    cli) shift; cmd_cli "$@" ;;
    core-update) core_update ;;
    uninstall) cmd_uninstall ;;
    *) echo "Alexen — usage: $APP_NAME {install|update|up|down|restart|status|logs|cli|core-update|uninstall}" ;;
esac
