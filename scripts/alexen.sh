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
# Then:  alexen (a menu) or alexen help: status, doctor, logs, update, backup, restore, env, core, cert, passwd ...
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
# a terminal to ask in: /dev/tty can exist without one (cron, systemd, ssh without -t)
has_tty() { { : </dev/tty; } 2>/dev/null; }
ask() { local q="$1" def="${2:-}" a=""; if has_tty; then read -rp "$q" a </dev/tty || true; fi; echo "${a:-$def}"; }
# a yes/no question; ALEXEN_YES=1 answers yes (scripts, automation)
confirm() { [ "${ALEXEN_YES:-}" = 1 ] && return 0; case "$(ask "$1 [y/N] " n)" in y|Y|yes) return 0;; *) return 1;; esac; }
ask_secret() { local q="$1" a=""; if has_tty; then read -rsp "$q" a </dev/tty || true; echo >&2; fi; echo "$a"; }
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
    [ -z "$pass" ] || [ ${#pass} -ge 8 ] || fail "ALEXEN_PASSWORD is too short (8 characters or more)"
    [ -n "$user" ] || user=$(ask "Creator (owner) username [admin]: " admin)
    while [ -z "$pass" ]; do
        has_tty || fail "set ALEXEN_PASSWORD (8 characters or more)"
        pass=$(ask_secret "Password for $user (min. 8 characters): ")
        [ ${#pass} -ge 8 ] || { echo "${Y}too short${N}" >&2; pass=""; has_tty || fail "set ALEXEN_PASSWORD (8 characters or more)"; }
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

cmd_backup() {
    need_root
    case "${1:-now}" in
        list|ls)
            local dir="$DATA_DIR/backups" n=0
            [ -d "$dir" ] || { echo "no backups yet"; return 0; }
            printf "  %-52s %10s  %s\n" "NAME" "SIZE" "DATE"
            while read -r f; do
                [ -n "$f" ] || continue
                n=$((n + 1))
                printf "  %-52s %10s  %s\n" "$(basename "$f")" "$(du -h "$f" | cut -f1)" "$(date -r "$f" '+%F %T')"
            done < <(ls -t "$dir"/*.zip 2>/dev/null)
            [ "$n" -gt 0 ] || echo "no backups yet"
            ;;
        now|"")
            container_up || fail "the panel isn't running (alexen up)"
            local f; f=$(docker exec "$CONTAINER" python3 -c "from app import backup; print(backup.save_to_disk())" 2>/dev/null | tail -1)
            [ -n "$f" ] || fail "backup failed"
            say "backup: $DATA_DIR/backups/$(basename "$f") ($(du -h "$DATA_DIR/backups/$(basename "$f")" | cut -f1))" "$G"
            ;;
        *) fail "alexen backup [now|list]" ;;
    esac
}

# ---------------- the command line, beyond install / update ----------------
ok()   { echo "  ${G}✓${N} $*"; }
warn() { echo "  ${Y}!${N} $*"; }
bad()  { echo "  ${R}✗${N} $*"; }
row()  { printf "  %-16s %s\n" "$1" "$2"; }

tty_flags() { if [ -t 0 ] && [ -t 1 ]; then echo -it; else echo -i; fi; }

# a newer than b (1.10.0 > 1.9.2)
ver_gt() { [ -n "$1" ] && [ -n "$2" ] && [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | tail -1)" = "$1" ]; }

container_up() { [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" = true ]; }

# KEY = value lines of .env (the last one that isn't a comment wins, like the panel reads it)
env_get() {
    [ -f "$ENV_FILE" ] || return 0
    { grep -E "^[[:space:]]*$1[[:space:]]*=" "$ENV_FILE" || true; } | tail -1 \
        | sed -E 's/^[^=]*=[[:space:]]*//; s/[[:space:]]+$//; s/^"(.*)"$/\1/; s/^'"'"'(.*)'"'"'$/\1/'
}

env_set() {
    local key="$1" value="$2"
    [[ "$key" =~ ^[A-Z][A-Z0-9_]*$ ]] || fail "a setting name is like UVICORN_PORT"
    case "$value" in *$'\n'*|*'"'*) fail "the value can't have a newline or a double quote";; esac
    cp -p "$ENV_FILE" "$ENV_FILE.bak"
    local line="$key = \"$value\""
    if grep -qE "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE"; then
        # every line that sets it (an .env can have it twice): the new value
        awk -v k="$key" -v l="$line" '
            { if ($0 ~ "^[[:space:]]*" k "[[:space:]]*=") print l; else print }' "$ENV_FILE.bak" > "$ENV_FILE.tmp"
        cat "$ENV_FILE.tmp" > "$ENV_FILE"; rm -f "$ENV_FILE.tmp"
    else
        printf '\n%s\n' "$line" >> "$ENV_FILE"
    fi
}

env_unset() {
    local key="$1"
    grep -qE "^[[:space:]]*${key}[[:space:]]*=" "$ENV_FILE" || return 0
    cp -p "$ENV_FILE" "$ENV_FILE.bak"
    awk -v k="$key" '{ if ($0 ~ "^[[:space:]]*" k "[[:space:]]*=") print "# " $0; else print }' "$ENV_FILE.bak" > "$ENV_FILE.tmp"
    cat "$ENV_FILE.tmp" > "$ENV_FILE"; rm -f "$ENV_FILE.tmp"
}

secret_key() { [[ "$1" =~ PASS|SECRET|TOKEN|KEY|WEBHOOK|DATABASE_URL ]]; }

ask_restart() {
    local a; a=$(ask "Restart the panel now to use it? [Y/n] " y)
    case "$a" in n|N) echo "  later: alexen restart";; *) restart_and_wait;; esac
}

restart_and_wait() {
    say "restarting"
    dc up -d --force-recreate >/dev/null 2>&1 || dc up -d
    if is_up "$(panel_port)"; then say "the panel is up" "$G"; else dc logs --tail 30 || true; fail "the panel didn't come back (log above)"; fi
}

cmd_env() {
    need_root
    [ -f "$ENV_FILE" ] || fail "no $ENV_FILE"
    case "${1:-list}" in
        list|ls)
            local k v
            while IFS= read -r k; do
                v=$(env_get "$k")
                secret_key "$k" && [ -n "$v" ] && v="••••••"
                printf "  %-34s %s\n" "$k" "$v"
            done < <(grep -E '^[[:space:]]*[A-Z][A-Z0-9_]*[[:space:]]*=' "$ENV_FILE" | sed -E 's/^[[:space:]]*([A-Z0-9_]+).*/\1/' | awk '!seen[$0]++')
            ;;
        get) [ -n "${2:-}" ] || fail "alexen env get NAME"; env_get "$2" ;;
        set)
            [ -n "${2:-}" ] && [ $# -ge 3 ] || fail "alexen env set NAME VALUE"
            env_set "$2" "$3"; say "$2 set (the old file: $ENV_FILE.bak)" "$G"; ask_restart ;;
        unset|del)
            [ -n "${2:-}" ] || fail "alexen env unset NAME"
            env_unset "$2"; say "$2 off (commented out)" "$G"; ask_restart ;;
        *) fail "alexen env [list|get NAME|set NAME VALUE|unset NAME]" ;;
    esac
}

cmd_edit() {
    need_root
    local ed="${EDITOR:-}"
    [ -n "$ed" ] || for e in nano vim vi; do command -v $e >/dev/null && { ed=$e; break; }; done
    [ -n "$ed" ] || fail "no editor (set EDITOR, or: alexen env set NAME VALUE)"
    local before; before=$(md5sum "$ENV_FILE" | cut -d' ' -f1)
    cp -p "$ENV_FILE" "$ENV_FILE.bak"
    $ed "$ENV_FILE" </dev/tty >/dev/tty
    [ "$(md5sum "$ENV_FILE" | cut -d' ' -f1)" = "$before" ] && { echo "  no change"; return 0; }
    say "saved (the old file: $ENV_FILE.bak)" "$G"; ask_restart
}

# a host path for a path inside the container (/var/lib/marzban/... is the data folder)
host_path() { case "$1" in /var/lib/marzban/*) echo "$DATA_DIR/${1#/var/lib/marzban/}";; *) echo "$1";; esac; }

cert_days() {
    local f; f=$(host_path "$(env_get UVICORN_SSL_CERTFILE)")
    [ -n "$f" ] && [ -f "$f" ] || return 1
    local end; end=$(openssl x509 -enddate -noout -in "$f" 2>/dev/null | cut -d= -f2) || return 1
    echo $(( ($(date -d "$end" +%s) - $(date +%s)) / 86400 ))
}

panel_url() {
    local p; p=$(env_get XRAY_SUBSCRIPTION_URL_PREFIX)
    [ -n "$p" ] && echo "${p%/}/dashboard/" || echo "https://$(public_ip):$(panel_port)/dashboard/"
}

core_version() { docker exec "$CONTAINER" sh -c "\"\${XRAY_EXECUTABLE_PATH:-/usr/local/bin/xray}\" version 2>/dev/null | head -1" 2>/dev/null | awk '{print $2}'; }

cmd_status() {
    local run up started restarts
    echo "${B}Alexen${N}"
    if container_up; then
        started=$(docker inspect -f '{{.State.StartedAt}}' "$CONTAINER" 2>/dev/null | cut -d. -f1)
        restarts=$(docker inspect -f '{{.RestartCount}}' "$CONTAINER" 2>/dev/null)
        up="${G}running${N} since $(date -d "${started}Z" '+%F %T' 2>/dev/null || echo "$started")"
        [ "${restarts:-0}" -gt 0 ] && up="$up ${Y}(restarted $restarts times)${N}"
    else
        up="${R}stopped${N} (alexen up)"
    fi
    row "Panel" "$up"
    row "Version" "$(running_version || true)"
    if [ -f "$UPD_DIR/status.json" ]; then
        local latest; latest=$(grep -o '"latest": *"[^"]*"' "$UPD_DIR/status.json" | sed 's/.*"\([^"]*\)"$/\1/')
        ver_gt "$latest" "$(running_version)" && row "Update" "${G}$latest available${N} (alexen update)"
    fi
    row "Address" "$(panel_url)"
    container_up && row "Xray" "$(core_version)"
    local days; if days=$(cert_days); then
        if [ "$days" -lt 7 ]; then row "Certificate" "${R}$days days left${N}"; else row "Certificate" "$days days left"; fi
    fi
    if container_up; then
        local counts; counts=$(docker exec "$CONTAINER" python3 -c "
from app.db import GetDB; from app.db.models import User, Admin
with GetDB() as db: print(db.query(User).count(), db.query(Admin).count())" 2>/dev/null | tail -1)
        [ -n "$counts" ] && row "Users" "${counts% *} (admins: ${counts#* })"
    fi
    row "Data" "$DATA_DIR ($(du -sh "$DATA_DIR" 2>/dev/null | cut -f1), disk $(df -h "$DATA_DIR" | awk 'NR==2{print $5" used"}'))"
    local last; last=$(ls -t "$DATA_DIR"/backups/*.zip 2>/dev/null | head -1)
    [ -n "$last" ] && row "Last backup" "$(date -r "$last" '+%F %T')"
    if command -v systemctl >/dev/null; then
        systemctl is-active -q $APP-updater.path 2>/dev/null && row "Panel updates" "on" || row "Panel updates" "${Y}off${N} (alexen updater-install)"
    fi
}

cmd_doctor() {
    need_root
    local problems=0 port; port=$(panel_port)
    echo "${B}Alexen: checking this server${N}"
    if docker info >/dev/null 2>&1; then ok "Docker is running"; else bad "Docker isn't running (systemctl start docker)"; problems=$((problems+1)); fi
    if container_up; then
        local rc; rc=$(docker inspect -f '{{.RestartCount}}' "$CONTAINER" 2>/dev/null)
        if [ "${rc:-0}" -gt 3 ]; then warn "the panel has restarted $rc times (alexen logs)"; else ok "the panel container runs"; fi
    else bad "the panel container isn't running (alexen up; alexen logs)"; problems=$((problems+1)); fi
    if curl -fsk -m 8 -o /dev/null "https://127.0.0.1:$port/dashboard/"; then ok "the panel answers on port $port"
    else bad "the panel doesn't answer on port $port"; problems=$((problems+1)); fi
    if pgrep -x xray >/dev/null 2>&1; then ok "Xray core runs ($(core_version))"; else bad "Xray core isn't running (alexen logs)"; problems=$((problems+1)); fi
    local days; if days=$(cert_days); then
        if [ "$days" -lt 0 ]; then bad "the certificate has expired"; problems=$((problems+1))
        elif [ "$days" -lt 14 ]; then warn "the certificate ends in $days days (alexen cert renew)"
        else ok "the certificate is valid for $days days"; fi
    else warn "no certificate file found (UVICORN_SSL_CERTFILE)"; fi
    if container_up; then
        local qc; qc=$(docker exec "$CONTAINER" python3 -c "
import sqlite3; print(sqlite3.connect('/var/lib/marzban/db.sqlite3').execute('PRAGMA quick_check').fetchone()[0])" 2>/dev/null | tail -1)
        if [ "$qc" = ok ]; then ok "the database is healthy"
        elif [ -n "$qc" ]; then bad "the database reports: $qc (restore a backup: alexen restore)"; problems=$((problems+1))
        else warn "the database couldn't be checked (not SQLite?)"; fi
    fi
    local use; use=$(df -P "$DATA_DIR" | awk 'NR==2{gsub("%","",$5); print $5}')
    if [ "${use:-0}" -ge 95 ]; then bad "the disk is ${use}% full"; problems=$((problems+1))
    elif [ "${use:-0}" -ge 85 ]; then warn "the disk is ${use}% full"
    else ok "disk ${use}% used"; fi
    local mem; mem=$(free | awk '/Mem:/{printf "%d", ($2-$7)*100/$2}')
    if [ "${mem:-0}" -ge 95 ]; then warn "memory ${mem}% used"; else ok "memory ${mem}% used"; fi
    local last; last=$(ls -t "$DATA_DIR"/backups/*.zip 2>/dev/null | head -1)
    if [ -z "$last" ]; then warn "no backup yet (alexen backup)"
    elif [ $(( $(date +%s) - $(date -r "$last" +%s) )) -gt 172800 ]; then warn "the last backup is older than 2 days ($(date -r "$last" '+%F'))"
    else ok "last backup $(date -r "$last" '+%F %T')"; fi
    if command -v systemctl >/dev/null && [ -d /run/systemd/system ]; then
        if systemctl is-active -q $APP-updater.path && systemctl is-active -q $APP-update-check.timer; then ok "updates from the panel are on"
        else warn "updates from the panel are off (alexen updater-install)"; fi
    fi
    if command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q "Status: active"; then
        if ufw status | grep -qE "^$port(/tcp)?[[:space:]]+ALLOW"; then ok "the firewall lets port $port in"
        else warn "the firewall (ufw) may block port $port (ufw allow $port/tcp)"; fi
    fi
    if [ -f "$UPD_DIR/status.json" ]; then
        local latest now; latest=$(grep -o '"latest": *"[^"]*"' "$UPD_DIR/status.json" | sed 's/.*"\([^"]*\)"$/\1/'); now=$(running_version)
        if ver_gt "$latest" "$now"; then warn "version $latest is out (alexen update)"; else ok "version ${now:-?} is the latest"; fi
    fi
    echo
    if [ "$problems" -eq 0 ]; then say "all good" "$G"; else say "$problems problem(s) above" "$R"; return 1; fi
}

cmd_restore() {
    need_root
    local src="${1:-}"
    if [ -z "$src" ]; then
        cmd_backup list
        src=$(ask "Backup to restore (a name above, or a .zip path): " "")
        [ -n "$src" ] || { echo "nothing restored"; return 0; }
    fi
    [ -f "$src" ] || src="$DATA_DIR/backups/$(basename "$src")"
    [ -f "$src" ] || fail "no such backup: ${1:-$src}"
    container_up || fail "the panel isn't running (alexen up)"
    # the container reads it from the data folder
    local inside="/var/lib/marzban/backups/$(basename "$src")"
    [ "$(readlink -f "$src")" = "$(readlink -f "$DATA_DIR/backups/$(basename "$src")")" ] || cp -p "$src" "$DATA_DIR/backups/"
    local info; info=$(docker exec -e F="$inside" "$CONTAINER" python3 -c "
import os; from app import backup
m = backup.check(open(os.environ['F'], 'rb').read()); print(m.get('created_at', '?')[:19].replace('T', ' '), m.get('panel_version', '?'))" 2>&1 | tail -1)
    case "$info" in *Error*|*error*|"") fail "not a usable backup: $info";; esac
    echo "  made ${info% *} by version ${info##* }"
    confirm "Restore it? The panel's data now is saved first, then replaced." || { echo "nothing restored"; return 0; }
    docker exec -e F="$inside" "$CONTAINER" python3 -c "
import os; from app import backup; r = backup.restore(open(os.environ['F'], 'rb').read()); print('  the data before:', r['saved_before'])" 2>&1 | tail -1
    restart_and_wait
    say "restored" "$G"
}

cmd_core() {
    need_root
    container_up || fail "the panel isn't running (alexen up)"
    local want="${1:-}" arch
    case "$(uname -m)" in x86_64|amd64) arch=64;; aarch64|arm64) arch=arm64-v8a;; armv7l) arch=arm32-v7a;; *) fail "no Xray build for $(uname -m)";; esac
    case "$want" in
        ""|current) row "Xray now" "$(core_version)"; echo "  alexen core list | alexen core <version> | alexen core latest | alexen core reset"; return 0 ;;
        list)
            curl -fsSL -m 15 "https://api.github.com/repos/XTLS/Xray-core/releases?per_page=12" \
                | grep -o '"tag_name": *"[^"]*"' | sed 's/.*"\(v[^"]*\)"$/  \1/' || fail "couldn't reach GitHub"
            return 0 ;;
        reset)
            env_unset XRAY_EXECUTABLE_PATH; env_unset XRAY_ASSETS_PATH
            restart_and_wait
            rm -rf "$DATA_DIR/xray-core" "$DATA_DIR/xray-core.old" "$DATA_DIR/xray-core.new"
            say "back on the panel's own Xray $(core_version)" "$G"; return 0 ;;
        latest)
            want=$(curl -fsSL -m 15 https://api.github.com/repos/XTLS/Xray-core/releases/latest | grep -o '"tag_name": *"[^"]*"' | sed 's/.*"\(v[^"]*\)"$/\1/')
            [ -n "$want" ] || fail "couldn't reach GitHub" ;;
    esac
    [[ "$want" =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]] || fail "a version is like v26.3.27 (alexen core list)"
    want="v${want#v}"
    say "downloading Xray $want"
    # into the data folder, by the panel's own Python (nothing to install on the server)
    docker exec -i "$CONTAINER" python3 - "$want" "$arch" <<'PYEOF' || fail "couldn't get Xray $want"
import io, os, shutil, stat, subprocess, sys, urllib.request, zipfile
ver, arch = sys.argv[1], sys.argv[2]
url = f"https://github.com/XTLS/Xray-core/releases/download/{ver}/Xray-linux-{arch}.zip"
try:
    data = urllib.request.urlopen(url, timeout=120).read()
except Exception as e:
    sys.exit(f"  {ver}: {getattr(e, 'code', '') and 'no such version' or e}")
tmp = "/var/lib/marzban/xray-core.new"
shutil.rmtree(tmp, ignore_errors=True)
os.makedirs(tmp)
zipfile.ZipFile(io.BytesIO(data)).extractall(tmp)
xray = os.path.join(tmp, "xray")
os.chmod(xray, os.stat(xray).st_mode | stat.S_IEXEC)
out = subprocess.run([xray, "version"], capture_output=True, text=True, timeout=20).stdout.split("\n")[0]
if not out.startswith("Xray"):
    sys.exit("the download doesn't run")
dst = "/var/lib/marzban/xray-core"
shutil.rmtree(dst + ".old", ignore_errors=True)
if os.path.isdir(dst):
    os.rename(dst, dst + ".old")
os.rename(tmp, dst)
print(out)
PYEOF
    local old_exec old_assets; old_exec=$(env_get XRAY_EXECUTABLE_PATH); old_assets=$(env_get XRAY_ASSETS_PATH)
    env_set XRAY_EXECUTABLE_PATH /var/lib/marzban/xray-core/xray
    env_set XRAY_ASSETS_PATH /var/lib/marzban/xray-core
    dc up -d --force-recreate >/dev/null 2>&1 || true
    local got=""
    if is_up "$(panel_port)"; then sleep 5; pgrep -x xray >/dev/null && got=$(core_version); fi
    if [ "$got" = "${want#v}" ]; then rm -rf "$DATA_DIR/xray-core.old"; say "Xray $got is running" "$G"; return 0; fi
    # it didn't come up with that core: the one before
    warn "Xray ${want#v} didn't start: going back"
    if [ -n "$old_exec" ]; then env_set XRAY_EXECUTABLE_PATH "$old_exec"; else env_unset XRAY_EXECUTABLE_PATH; fi
    if [ -n "$old_assets" ]; then env_set XRAY_ASSETS_PATH "$old_assets"; else env_unset XRAY_ASSETS_PATH; fi
    if [ -d "$DATA_DIR/xray-core.old" ]; then rm -rf "$DATA_DIR/xray-core"; mv "$DATA_DIR/xray-core.old" "$DATA_DIR/xray-core"; fi
    restart_and_wait
    fail "kept Xray $(core_version) (alexen logs shows why the new one didn't start)"
}

cmd_passwd() {
    need_root
    container_up || fail "the panel isn't running (alexen up)"
    local user="${1:-}" pass="${ALEXEN_PASSWORD:-}"
    [ -z "$pass" ] || [ ${#pass} -ge 8 ] || fail "ALEXEN_PASSWORD is too short (8 characters or more)"
    [ -n "$user" ] || user=$(ask "Admin username: " "")
    [ -n "$user" ] || fail "alexen passwd USERNAME"
    [[ "$user" =~ ^[A-Za-z0-9_.@-]{1,34}$ ]] || fail "no such admin: $user"
    while [ -z "$pass" ]; do
        has_tty || fail "set ALEXEN_PASSWORD (8 characters or more)"
        pass=$(ask_secret "New password for $user (min. 8 characters): ")
        [ ${#pass} -ge 8 ] || { echo "${Y}too short${N}" >&2; pass=""; has_tty || fail "set ALEXEN_PASSWORD (8 characters or more)"; }
    done
    local r; r=$(docker exec -e U="$user" -e P="$pass" "$CONTAINER" python3 -c "
import os
from datetime import datetime
from app.db import GetDB; from app.db.models import Admin; from app.models.admin import pwd_context
with GetDB() as db:
    a = db.query(Admin).filter(Admin.username == os.environ['U']).first()
    if not a: print('NOADMIN')
    else:
        a.hashed_password = pwd_context.hash(os.environ['P'])
        a.password_reset_at = datetime.utcnow().replace(microsecond=0)
        db.commit(); print('OK')" 2>/dev/null | tail -1)
    case "$r" in OK) say "the password of $user is changed (its open sessions end)" "$G";; NOADMIN) fail "no such admin: $user";; *) fail "couldn't change it";; esac
}

cmd_cert() {
    need_root
    local f; f=$(host_path "$(env_get UVICORN_SSL_CERTFILE)")
    case "${1:-}" in
        renew)
            [ -f /etc/cron.d/$APP-cert ] || fail "this panel has no Let's Encrypt certificate (a self-signed one doesn't need renewing)"
            say "renewing"
            docker run --rm -p 80:80 -v "$DATA_DIR/certs/le:/etc/letsencrypt" certbot/certbot renew --force-renewal --quiet \
                || fail "renewing failed: port 80 must be free and the domain must point here"
            restart_and_wait; say "renewed: $(cert_days) days" "$G" ;;
        *)
            [ -f "$f" ] || fail "no certificate file ($f)"
            row "File" "$f"
            row "For" "$(openssl x509 -noout -subject -in "$f" 2>/dev/null | sed 's/^subject= *//')"
            row "Issuer" "$(openssl x509 -noout -issuer -in "$f" 2>/dev/null | sed 's/^issuer= *//')"
            row "Ends" "$(openssl x509 -noout -enddate -in "$f" 2>/dev/null | cut -d= -f2) ($(cert_days) days)"
            [ -f /etc/cron.d/$APP-cert ] && row "Renewal" "automatic (alexen cert renew to do it now)" ;;
    esac
}

cmd_completion() {
    need_root
    cat > /etc/bash_completion.d/$APP <<'EOF'
_alexen() {
    local cur=${COMP_WORDS[COMP_CWORD]} prev=${COMP_WORDS[COMP_CWORD-1]}
    case "$prev" in
        env) COMPREPLY=($(compgen -W "list get set unset" -- "$cur")); return;;
        backup) COMPREPLY=($(compgen -W "now list" -- "$cur")); return;;
        core) COMPREPLY=($(compgen -W "list latest reset" -- "$cur")); return;;
        cert) COMPREPLY=($(compgen -W "renew" -- "$cur")); return;;
    esac
    [ "$COMP_CWORD" -eq 1 ] && COMPREPLY=($(compgen -W "status doctor logs restart up down update check-update backup restore env edit core passwd admins admin cert cli version uninstall help" -- "$cur"))
}
complete -F _alexen alexen
EOF
    say "tab completion on (a new shell has it)" "$G"
}

cmd_help() {
    cat <<EOF
${B}Alexen${N} $(running_version 2>/dev/null || true) — the panel's command line

  ${G}status${N}                 version, address, certificate, users, last backup
  ${G}doctor${N}                 check everything and say what's wrong
  ${G}logs${N} [-n LINES] [--no-follow]
  ${G}restart${N} | ${G}up${N} | ${G}down${N}

  ${G}update${N}                 the latest version (a backup first, the old one back if it fails)
  ${G}check-update${N}           only look for a new version

  ${G}backup${N} [list]          a backup now / the saved ones
  ${G}restore${N} [FILE|NAME]    put a backup back (the data now is saved first)

  ${G}env${N} [list|get|set|unset]   the panel's settings (.env); ${G}edit${N} opens it in an editor
  ${G}core${N} [list|latest|VERSION|reset]   the Xray core version
  ${G}cert${N} [renew]           the certificate

  ${G}admins${N}                 the admin accounts
  ${G}admin${N} [NAME]           add a creator (owner) account
  ${G}passwd${N} [NAME]          a new password for an admin
  ${G}cli${N} ...                the admin command line (marzban-cli)

  ${G}completion${N}             tab completion for alexen
  ${G}uninstall${N}              remove the panel (the data stays unless you ask)
  ${G}version${N}

  Without a command (in a terminal): a menu.  Support: Telegram @alexvpns
EOF
}

cmd_menu() {
    local items=("status" "doctor" "logs" "restart" "update" "backup" "backup list" "restore" "env list" "edit" "core" "admins" "passwd" "cert" "help")
    while true; do
        echo
        echo "${B}Alexen${N} $(running_version 2>/dev/null || true)"
        local i=1; for it in "${items[@]}"; do printf "  %2d) %s\n" $i "$it"; i=$((i+1)); done
        printf "   0) exit\n"
        local c; c=$(ask "> " 0)
        [ "$c" = 0 ] || [ -z "$c" ] && return 0
        [[ "$c" =~ ^[0-9]+$ ]] && [ "$c" -ge 1 ] && [ "$c" -le ${#items[@]} ] || { echo "  1-${#items[@]} or 0"; continue; }
        # a command that fails returns here, not out of the menu
        ( set +e; main ${items[$((c-1))]} ) || true
    done
}

cmd_logs() {
    local n=100 follow=-f
    while [ $# -gt 0 ]; do
        case "$1" in -n|--tail) n="${2:-100}"; shift;; --no-follow|-N) follow="";; [0-9]*) n="$1";; esac
        shift
    done
    [[ "$n" =~ ^[0-9]+$ ]] || n=100
    dc logs $follow --tail "$n"
}

main() {
    local cmd="${1:-}"; [ $# -gt 0 ] && shift
    # install / update / uninstall stop at the first error; the other commands check what
    # matters themselves and go on past an empty answer (a grep that finds nothing)
    case "$cmd" in install|update|uninstall|updater-run|check-update|updater-install) ;; *) set +e +o pipefail;; esac
    case "$cmd" in
        install)   cmd_install ;;
        update)    cmd_update ;;
        status)    cmd_status ;;
        doctor|check) cmd_doctor ;;
        logs|log)  cmd_logs "$@" ;;
        restart)   need_root; restart_and_wait ;;
        up|start)  need_root; dc up -d ;;
        down|stop) need_root; dc down ;;
        backup)    cmd_backup "$@" ;;
        restore)   cmd_restore "$@" ;;
        env)       cmd_env "$@" ;;
        edit|edit-env) cmd_edit ;;
        core|core-update|xray) cmd_core "$@" ;;
        passwd|password) cmd_passwd "$@" ;;
        admins)    need_root; docker exec $(tty_flags) "$CONTAINER" marzban-cli admin list ;;
        admin)     need_root; create_creator "${1:-}" "${ALEXEN_PASSWORD:-}"; say "creator ${ADMIN_USER} added" "$G" ;;
        cert|ssl)  cmd_cert "$@" ;;
        cli)       need_root; docker exec $(tty_flags) "$CONTAINER" marzban-cli "$@" ;;
        check-update)     need_root; upd_check ;;
        updater-install)  need_root; install_updater ;;
        updater-run)      need_root; upd_run ;;
        completion) cmd_completion ;;
        version|-v|--version) echo "Alexen $(running_version 2>/dev/null || echo '?')" ;;
        uninstall) cmd_uninstall ;;
        help|-h|--help) cmd_help ;;
        "")        if [ -t 0 ] && [ -t 1 ]; then cmd_menu; else cmd_help; fi ;;
        *)         echo "${R}unknown command: $cmd${N}" >&2; cmd_help; return 1 ;;
    esac
}

main "$@"
