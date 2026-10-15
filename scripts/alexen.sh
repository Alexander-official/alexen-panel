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
#
# Updates also run from the panel (Settings > Update): the panel writes a request into
# <data>/update/, the updater unit (systemd, set up here) does the update and writes how it
# goes next to it. A server laid out differently sets the paths in /etc/alexen.conf.
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
CONTAINER=$APP
PROJECT=$APP
# a panel set up by hand (other paths, container, image): override the lines above here
CONF=${ALEXEN_CONF:-/etc/$APP.conf}
# shellcheck source=/dev/null
[ -f "$CONF" ] && . "$CONF"
UPD_DIR=$DATA_DIR/update
UPD_LOG=$UPD_DIR/update.log

R=$'\e[91m'; G=$'\e[92m'; B=$'\e[94m'; Y=$'\e[93m'; N=$'\e[0m'
say()  { echo "${2:-$B}==> $1${N}"; }
fail() { echo "${R}!! $1${N}" >&2; exit 1; }
need_root() { [ "$(id -u)" -eq 0 ] || fail "run as root (sudo)"; }
# questions work even when the script comes through a pipe
ask() { local q="$1" def="${2:-}" a=""; if [ -r /dev/tty ]; then read -rp "$q" a </dev/tty || true; fi; echo "${a:-$def}"; }
ask_secret() { local q="$1" a=""; if [ -r /dev/tty ]; then read -rsp "$q" a </dev/tty || true; echo >&2; fi; echo "$a"; }
dc() { docker compose -f "$COMPOSE" -p "$PROJECT" "$@"; }

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

try_build() {
    # a second try on the host's network: some servers' Docker bridge has no working DNS
    docker build -q -t "$IMAGE" "$SRC_DIR" >/dev/null 2>/tmp/$APP-build.log \
        || docker build -q --network host -t "$IMAGE" "$SRC_DIR" >/dev/null 2>>/tmp/$APP-build.log
}

build_image() {
    say "building the panel (a few minutes the first time)"
    try_build || { tail -20 /tmp/$APP-build.log >&2; fail "the image didn't build (log above)"; }
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
17 3 * * * root docker run --rm -p 80:80 -v $DATA_DIR/certs/le:/etc/letsencrypt certbot/certbot renew --quiet --deploy-hook "touch /etc/letsencrypt/.renewed" && [ -f $DATA_DIR/certs/le/.renewed ] && rm -f $DATA_DIR/certs/le/.renewed && docker restart $CONTAINER >/dev/null
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

panel_port() { { grep -E '^UVICORN_PORT' "$ENV_FILE" || echo 8000; } | tail -1 | tr -dc 0-9; }

is_up() {
    local port="$1"
    for i in $(seq 1 90); do
        curl -fsk -o /dev/null "https://127.0.0.1:$port/dashboard/" && return 0
        sleep 2
    done
    return 1
}

wait_up() {
    is_up "$1" && return 0
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
    docker exec -e MARZBAN_ADMIN_PASSWORD="$pass" $CONTAINER marzban-cli admin create --sudo --creator -u "$user" -tg "" -dc "" \
        >/tmp/$APP-admin.log 2>&1 && grep -q "created successfully" /tmp/$APP-admin.log \
        || { tail -5 /tmp/$APP-admin.log >&2; fail "couldn't create $user (it may exist already: alexen cli admin update -u $user)"; }
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
    dc up -d >/dev/null 2>&1 || { dc up -d; fail "the panel didn't start"; }
    wait_up "$port"
    open_port "$port"
    # installed again over kept data: its creator is still there
    ADMIN_USER=$(docker exec $CONTAINER python3 -c "from app.db import GetDB; from app.db.models import Admin
with GetDB() as db: a = db.query(Admin).filter(Admin.is_creator == True).first(); print(a.username if a else '')" 2>/dev/null | tail -1)
    if [ -n "$ADMIN_USER" ]; then say "keeping the existing creator: $ADMIN_USER"
    else create_creator "${ALEXEN_ADMIN:-}" "${ALEXEN_PASSWORD:-}"; fi
    install_updater
    echo
    say "Alexen is ready" "$G"
    echo "    Panel:    ${G}https://$host:$port/dashboard/${N}"
    echo "    Creator:  ${ADMIN_USER}"
    [ -z "$domain" ] && echo "    ${Y}Self-signed certificate: the browser asks once; for a real one: alexen uninstall, then install with a domain${N}"
    echo "    Commands: alexen status | logs | restart | update | backup | admin | uninstall"
}

# ---------------- updates (also from the panel) ----------------
# <data>/update/status.json is what the panel shows: written here only, as whole files
U_STATE=idle; U_STEP=""; U_LATEST=""; U_CHECKED=""; U_STARTED=""; U_FINISHED=""; U_ERROR=""

jstr() { printf '"%s"' "$(printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g' | tr -d '\000-\037')"; }
jnum() { [ -n "$1" ] && echo "$1" || echo null; }

load_state() {
    [ -f "$UPD_DIR/state" ] || return 0
    # only our own U_* lines, values quoted by save_state
    while IFS='=' read -r k v; do
        case "$k" in U_LATEST|U_CHECKED|U_STARTED|U_FINISHED|U_ERROR|U_STATE|U_STEP) printf -v "$k" '%s' "$(printf '%s' "$v" | base64 -d 2>/dev/null)";; esac
    done < "$UPD_DIR/state"
    # a run that died half way (the server rebooted) isn't running any more
    case "$U_STATE" in checking|updating) U_STATE=idle; U_STEP="";; esac
}

save_state() {
    mkdir -p "$UPD_DIR"
    # one writer at a time (the timer's check can start while something else writes)
    exec 8>"$UPD_DIR/status.lock"; flock -w 10 8 || true
    local k st js cl="[]"
    st=$(mktemp "$UPD_DIR/.state.XXXXXX"); js=$(mktemp "$UPD_DIR/.status.XXXXXX")
    for k in U_STATE U_STEP U_LATEST U_CHECKED U_STARTED U_FINISHED U_ERROR; do
        printf '%s=%s\n' "$k" "$(printf '%s' "${!k}" | base64 -w0)" >> "$st"
    done
    mv "$st" "$UPD_DIR/state"
    if [ -s "$UPD_DIR/changelog.json" ] && head -c1 "$UPD_DIR/changelog.json" | grep -q '\['; then cl=$(cat "$UPD_DIR/changelog.json"); fi
    cat > "$js" <<EOF
{"updater": 1, "state": $(jstr "$U_STATE"), "step": $(jstr "$U_STEP"), "latest": $(jstr "$U_LATEST"),
 "checked_at": $(jnum "$U_CHECKED"), "started_at": $(jnum "$U_STARTED"), "finished_at": $(jnum "$U_FINISHED"),
 "error": $(jstr "$U_ERROR"), "changelog": $cl}
EOF
    chmod 644 "$js"
    mv "$js" "$UPD_DIR/status.json"
    flock -u 8 || true
}

ulog() { echo "$(date '+%F %T') $*" >> "$UPD_LOG"; [ -t 1 ] && say "$*" || true; }
step() { U_STEP="$1"; save_state; ulog "$2"; }

version_of() { sed -n 's/^__version__ = "\(.*\)"/\1/p'; }
running_version() { docker exec "$CONTAINER" sed -n 's/^__version__ = "\(.*\)"/\1/p' /code/app/__init__.py 2>/dev/null || true; }

# the latest version on GitHub, and its changelog; the source itself stays as it is
fetch_latest() {
    [ -d "$SRC_DIR/.git" ] || git clone -q --depth 1 -b "$BRANCH" "$REPO" "$SRC_DIR" 2>>"$UPD_LOG" || return 1
    git -C "$SRC_DIR" fetch -q --depth 1 origin "$BRANCH" 2>>"$UPD_LOG" || return 1
    U_LATEST=$(git -C "$SRC_DIR" show FETCH_HEAD:app/__init__.py 2>/dev/null | version_of)
    git -C "$SRC_DIR" show FETCH_HEAD:app/changelog.json > "$UPD_DIR/.changelog.tmp" 2>/dev/null || echo "[]" > "$UPD_DIR/.changelog.tmp"
    mv "$UPD_DIR/.changelog.tmp" "$UPD_DIR/changelog.json"
    [ -n "$U_LATEST" ]
}

upd_check() {
    mkdir -p "$UPD_DIR"
    # not while an update runs (it holds the lock), nor twice at once
    exec 9>"$UPD_DIR/lock"
    flock -n 9 || return 0
    load_state
    # a check doesn't hide how the last update went (done / failed): the panel still shows it
    local was=$U_STATE keep=""
    [ "$was" = failed ] && keep=$U_ERROR
    U_STATE=checking; U_ERROR=$keep; save_state
    U_STATE=$was
    fetch_latest || { [ "$was" = failed ] || U_ERROR="couldn't reach the update server"; }
    U_CHECKED=$(date +%s); save_state
    [ -t 1 ] && echo "running: $(running_version)  latest: ${U_LATEST:-?}" || true
}

# the database and core config as they are now: a failed update puts them back
snapshot_data() {
    rm -f "$UPD_DIR/db-before.sqlite3" "$UPD_DIR/xray_config-before.json"
    [ -f "$DATA_DIR/xray_config.json" ] && cp -p "$DATA_DIR/xray_config.json" "$UPD_DIR/xray_config-before.json"
    grep -qE '^SQLALCHEMY_DATABASE_URL *= *"?sqlite' "$ENV_FILE" || return 0
    docker exec "$CONTAINER" python3 -c "
import sqlite3; s = sqlite3.connect('/var/lib/marzban/db.sqlite3'); d = sqlite3.connect('/var/lib/marzban/update/db-before.sqlite3')
s.backup(d); d.close()" 2>>"$UPD_LOG"
}

restore_data() {
    if [ -f "$UPD_DIR/db-before.sqlite3" ]; then
        rm -f "$DATA_DIR/db.sqlite3-wal" "$DATA_DIR/db.sqlite3-shm" "$DATA_DIR/db.sqlite3-journal"
        cp -p "$UPD_DIR/db-before.sqlite3" "$DATA_DIR/db.sqlite3"
    fi
    [ -f "$UPD_DIR/xray_config-before.json" ] && cp -p "$UPD_DIR/xray_config-before.json" "$DATA_DIR/xray_config.json"
    return 0
}

upd_fail() {
    U_STATE=failed; U_ERROR="$1"; U_FINISHED=$(date +%s); U_STEP=""; save_state; ulog "FAILED: $1"
    [ -t 1 ] && echo "${R}!! $1 (log: $UPD_LOG)${N}" >&2 || true
    return 1
}

upd_update() {
    mkdir -p "$UPD_DIR"
    exec 9>"$UPD_DIR/lock"
    flock -n 9 || { echo "an update is running already"; return 1; }
    load_state
    : > "$UPD_LOG"
    U_STATE=updating; U_STARTED=$(date +%s); U_FINISHED=""; U_ERROR=""
    local port old_commit old_version prev="${IMAGE%:*}:previous"
    port=$(panel_port); old_version=$(running_version)
    ulog "updating from ${old_version:-?}"

    step backup "backup of the panel data"
    docker exec "$CONTAINER" python3 -c "from app import backup; print(backup.save_to_disk('alexen-backup-before-update'))" >>"$UPD_LOG" 2>&1 \
        || { upd_fail "the backup failed: nothing was changed"; return 1; }
    snapshot_data || { upd_fail "the backup failed: nothing was changed"; return 1; }

    step download "downloading the latest version"
    fetch_latest || { upd_fail "couldn't download the update: nothing was changed"; return 1; }
    old_commit=$(git -C "$SRC_DIR" rev-parse HEAD 2>/dev/null || echo "")
    git -C "$SRC_DIR" reset -q --hard FETCH_HEAD 2>>"$UPD_LOG" || { upd_fail "couldn't download the update: nothing was changed"; return 1; }
    ulog "version ${U_LATEST}"

    step build "building (a few minutes)"
    docker image inspect "$IMAGE" >/dev/null 2>&1 && docker tag "$IMAGE" "$prev"
    if ! try_build; then
        cat /tmp/$APP-build.log >> "$UPD_LOG" 2>/dev/null
        [ -n "$old_commit" ] && git -C "$SRC_DIR" reset -q --hard "$old_commit" 2>/dev/null
        upd_fail "the new version didn't build: the panel keeps running the old one"; return 1
    fi

    step restart "restarting the panel"
    dc up -d --force-recreate >>"$UPD_LOG" 2>&1 || true

    step verify "checking that it works"
    local now=""
    if is_up "$port"; then now=$(running_version); fi
    if [ -z "$now" ] || [ "$now" != "$U_LATEST" ]; then
        dc logs --tail 60 >> "$UPD_LOG" 2>&1 || true
        step rollback "it didn't start: going back to ${old_version:-the old version}"
        if docker image inspect "$prev" >/dev/null 2>&1; then
            dc stop >>"$UPD_LOG" 2>&1 || true
            restore_data
            docker tag "$prev" "$IMAGE"
            [ -n "$old_commit" ] && git -C "$SRC_DIR" reset -q --hard "$old_commit" 2>/dev/null
            dc up -d --force-recreate >>"$UPD_LOG" 2>&1 || true
            if is_up "$port"; then upd_fail "the new version didn't start: back on ${old_version:-the old version}, data as before the update"
            else upd_fail "the new version didn't start and the old one didn't either: see the log"; fi
        else
            upd_fail "the new version didn't start (no old image to go back to): see the log"
        fi
        return 1
    fi

    install_cli
    install_updater quiet
    docker image prune -f >/dev/null 2>&1 || true
    U_STATE="done"; U_STEP=""; U_FINISHED=$(date +%s); U_CHECKED=$U_FINISHED; save_state
    ulog "updated to $now"
    [ -t 1 ] && say "updated to $now" "$G" || true
}

# the panel's request: {"action": "check"|"update", ...}; nothing else in it is read
upd_run() {
    local f="$UPD_DIR/request" action=""
    [ -f "$f" ] || return 0
    action=$(grep -o '"action": *"[a-z]*"' "$f" | head -1 | sed 's/.*"\([a-z]*\)"$/\1/')
    rm -f "$f"
    case "$action" in
        check)  upd_check ;;
        update) upd_update || true ;;
    esac
}

install_updater() {
    command -v systemctl >/dev/null && [ -d /run/systemd/system ] || { [ "${1:-}" = quiet ] || say "no systemd: updates from the panel are off (alexen update still works)" "$Y"; return 0; }
    mkdir -p "$UPD_DIR"
    # the paths of this server, for the units (they have no environment of their own)
    if [ ! -f "$CONF" ]; then
        cat > "$CONF" <<EOF
# Alexen: where this panel lives (read by the alexen command and the updater)
REPO="$REPO"
BRANCH="$BRANCH"
EOF
    fi
    cat > /etc/systemd/system/$APP-updater.service <<EOF
[Unit]
Description=Alexen panel updater (requests from the panel)
After=docker.service

[Service]
Type=oneshot
Environment=ALEXEN_CONF=$CONF
# a copy: an update replaces the alexen command while this runs
ExecStart=/bin/bash -c 'cp $CLI /run/$APP-updater.sh && exec /bin/bash /run/$APP-updater.sh updater-run'
TimeoutStartSec=3600
EOF
    cat > /etc/systemd/system/$APP-updater.path <<EOF
[Unit]
Description=Alexen panel updater: watches for the panel's requests

[Path]
PathExists=$UPD_DIR/request
Unit=$APP-updater.service

[Install]
WantedBy=multi-user.target
EOF
    cat > /etc/systemd/system/$APP-update-check.service <<EOF
[Unit]
Description=Alexen panel: look for a new version
After=docker.service network-online.target

[Service]
Type=oneshot
Environment=ALEXEN_CONF=$CONF
ExecStart=/bin/bash -c 'cp $CLI /run/$APP-update-check.sh && exec /bin/bash /run/$APP-update-check.sh check-update'
TimeoutStartSec=600
EOF
    cat > /etc/systemd/system/$APP-update-check.timer <<EOF
[Unit]
Description=Alexen panel: look for a new version twice a day

[Timer]
OnBootSec=10min
OnUnitActiveSec=12h
RandomizedDelaySec=30min

[Install]
WantedBy=timers.target
EOF
    systemctl daemon-reload || true
    systemctl enable --now $APP-updater.path $APP-update-check.timer >/dev/null 2>&1 || true
    if ( exec 9>"$UPD_DIR/lock"; flock -n 9 ); then load_state; save_state; fi
    systemctl start --no-block $APP-update-check.service >/dev/null 2>&1 || true
    [ "${1:-}" = quiet ] || say "updates from the panel: on" "$G"
}

remove_updater() {
    command -v systemctl >/dev/null || return 0
    systemctl disable --now $APP-updater.path $APP-update-check.timer >/dev/null 2>&1 || true
    rm -f /etc/systemd/system/$APP-updater.service /etc/systemd/system/$APP-updater.path \
          /etc/systemd/system/$APP-update-check.service /etc/systemd/system/$APP-update-check.timer
    systemctl daemon-reload >/dev/null 2>&1 || true
}

cmd_update() {
    need_root
    upd_update || exit 1
}

cmd_backup() {
    need_root
    local f; f=$(docker exec $CONTAINER python3 -c "from app import backup; print(backup.save_to_disk())" 2>/dev/null | tail -1)
    [ -n "$f" ] || fail "backup failed"
    say "backup: $DATA_DIR/backups/$(basename "$f")" "$G"
}

cmd_uninstall() {
    need_root
    local a; a=$(ask "Remove Alexen? The data in $DATA_DIR is kept unless you also type 'data': [y/N/data] " n)
    case "$a" in y|Y|data) ;; *) echo "nothing removed"; exit 0;; esac
    [ -f "$COMPOSE" ] && dc down >/dev/null 2>&1 || true
    docker rmi "$IMAGE" >/dev/null 2>&1 || true
    remove_updater
    rm -rf "$APP_DIR" /etc/cron.d/$APP-cert "$CLI" "$CONF"
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
    cli)       shift; need_root; docker exec -it $CONTAINER marzban-cli "$@" ;;
    check-update)     need_root; upd_check ;;
    updater-install)  need_root; install_updater ;;
    updater-run)      need_root; upd_run ;;
    uninstall) cmd_uninstall ;;
    *) echo "Alexen: alexen {install|update|check-update|status|logs|restart|up|down|backup|admin [name]|cli ...|uninstall}" ;;
esac
