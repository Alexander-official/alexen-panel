#!/usr/bin/env bash
# Alexen panel: installer and command line (Alexander LLC)
#
# Install (as root), with a license key from the seller:
#   bash <(curl -fsSL https://admin.alexateam.ru/install.sh) install
#
# It checks the server, asks for the license key, a domain (a Let's Encrypt certificate,
# renewed by itself; Enter skips it: the server's IP with a self-signed one) and the owner.
# A certificate that can't be had never stops the install: the panel starts on the IP and
# the domain can be added later (alexen cert domain DOMAIN).
# Without questions:  ALEXEN_LICENSE=ALX-... ALEXEN_DOMAIN=panel.example.com ALEXEN_EMAIL=me@example.com \
#                     ALEXEN_ADMIN=owner ALEXEN_PASSWORD='...' bash alexen.sh install
#   ALEXEN_DOMAIN=""         no domain (the IP)        ALEXEN_PORT=8443   another panel port
#   ALEXEN_ENV_FILE=/path    your own .env (no domain or certificate questions)
# Then:  alexen (a menu) or alexen help
#
# Updates also run from the panel (Settings > Update): the panel writes a request into
# <data>/update/, the updater unit (systemd, set up here) does the update and writes how it
# goes next to it. A server laid out differently sets the paths in /etc/alexen.conf.
set -euo pipefail

APP=alexen
# the panel comes from the license server (licensed servers only); a local folder for testing
LICENSE_SERVER="${ALEXEN_LICENSE_SERVER:-https://admin.alexateam.ru}"
REPO="${ALEXEN_REPO:-}"
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
LICENSE_SERVER=${LICENSE_SERVER%/}
RAW="$LICENSE_SERVER/install.sh"
UPD_DIR=$DATA_DIR/update
UPD_LOG=$UPD_DIR/update.log
LIC_DIR=$DATA_DIR/license
LICENSE_HAS_CREATOR=""
# the license server's signing key: a release it didn't sign isn't installed
LIC_PUBKEY='-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAme9Yq1wS0MRKqsRdM7lAOQV2W3yP3C2L+Yr+ovnkp6I=
-----END PUBLIC KEY-----'

# colours on a terminal only (NO_COLOR=1 turns them off)
if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ "${TERM:-}" != dumb ]; then
    R=$'\e[91m'; G=$'\e[92m'; B=$'\e[94m'; Y=$'\e[93m'; C=$'\e[96m'; M=$'\e[95m'; D=$'\e[2m'; W=$'\e[1m'; N=$'\e[0m'
else
    R=""; G=""; B=""; Y=""; C=""; M=""; D=""; W=""; N=""
fi
LINE="──────────────────────────────────────────────────────"
say()  {
    local c="${2:-$C}" m="›"
    if [ -n "$G" ]; then case "$c" in "$G") m="✓";; "$Y") m="!";; "$R") m="✗";; esac; fi
    echo "  ${c}${m}${N} $1"
}
fail() { echo "  ${R}✗ $1${N}" >&2; exit 1; }
banner() {
    echo
    echo "  ${C}${W}▲ ALEXEN${N}  ${D}${1:-panel · Alexander LLC}${N}"
    echo "  ${D}${LINE}${N}"
}
# an install step: [2/6] Title
phase() { echo; echo "  ${M}${W}[$1/$2]${N} ${W}$3${N}"; }
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
    for c in curl tar openssl; do command -v $c >/dev/null || { say "installing $c"; pkg_install $c; }; done
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

# ---------------- the license (the panel checks it; here only for downloads)
lic_key() { cat "$LIC_DIR/key" 2>/dev/null | tr -dc 'A-Z0-9-' || true; }
lic_install() {
    if [ ! -s "$LIC_DIR/install_id" ]; then
        mkdir -p "$LIC_DIR"
        cat /proc/sys/kernel/random/uuid > "$LIC_DIR/install_id" 2>/dev/null || openssl rand -hex 16 > "$LIC_DIR/install_id"
        chmod 644 "$LIC_DIR/install_id"
    fi
    tr -dc 'A-Za-z0-9-' < "$LIC_DIR/install_id"
}
# a key as the seller wrote it (spaces, small letters): ALX-XXXXX-XXXXX-XXXXX-XXXXX, or nothing
norm_key() {
    local k; k=$(printf '%s' "$1" | tr 'a-z' 'A-Z' | tr -dc 'A-Z0-9')
    [ "${k:0:3}" = ALX ] && [ ${#k} -eq 23 ] && k=${k:3}
    [ ${#k} -eq 20 ] || return 0
    echo "ALX-${k:0:5}-${k:5:5}-${k:10:5}-${k:15:5}"
}
# the license server the panel uses: its .env can name another one (testing)
license_server() {
    local e=""
    [ -n "${ALEXEN_LICENSE_SERVER:-}" ] || e=$(env_get ALEXEN_LICENSE_SERVER 2>/dev/null)
    e=${e%/}
    echo "${e:-$LICENSE_SERVER}"
}
# GET from the license server with this server's license: LS_CODE, the body in $2 (or LS_BODY)
LS_CODE=""; LS_BODY=""
ls_get() {
    local path="$1" out="${2:-}" tmp log=/dev/null
    tmp=$(mktemp)
    # curl's own errors in the update log, once there is one (not on a new install)
    [ -d "$UPD_DIR" ] && log=$UPD_LOG
    LS_CODE=$(curl -sS -m "${LS_TIMEOUT:-60}" -o "$tmp" -w '%{http_code}' -H "X-License-Key: $(lic_key)" \
        -H "X-Install-Id: $(lic_install)" -H "User-Agent: Alexen-updater" "$(license_server)$path" 2>>"$log") || LS_CODE=000
    if [ -n "$out" ] && [ "$LS_CODE" = 200 ]; then mv "$tmp" "$out"; LS_BODY=""
    else LS_BODY=$(head -c 4000 "$tmp"); rm -f "$tmp"; fi
}
# the server's reason in an error answer ({"detail": "..."})
ls_error() {
    case "$LS_CODE" in
        000) echo "couldn't reach the license server" ;;
        *)  local d; d=$(printf '%s' "$LS_BODY" | grep -o '"detail": *"[^"]*"' | head -1 | sed 's/.*"\([^"]*\)"$/\1/')
            echo "${d:-the license server answered $LS_CODE}" ;;
    esac
}
# openssl 3 checks Ed25519 signatures; an older one leaves it to HTTPS and the checksum
verify_sig() {
    local msg="$1" sig="$2" d; d=$(mktemp -d)
    openssl pkeyutl -help 2>&1 | grep -q rawin || { rm -rf "$d"; return 0; }
    printf '%s' "$LIC_PUBKEY" > "$d/pub.pem"; printf '%s' "$msg" > "$d/msg"
    printf '%s' "$sig" | base64 -d > "$d/sig" 2>/dev/null
    openssl pkeyutl -verify -pubin -inkey "$d/pub.pem" -rawin -in "$d/msg" -sigfile "$d/sig" >/dev/null 2>&1
    local r=$?; rm -rf "$d"; return $r
}
# the latest release, checked, unpacked into $1: R_VERSION is its version; R_ERROR why not
R_VERSION=""; R_ERROR=""
fetch_release() {
    local dest="$1" info sha sig tar; R_ERROR=""
    ls_get /api/v1/update
    [ "$LS_CODE" = 200 ] || { R_ERROR=$(ls_error); return 1; }
    info=$LS_BODY
    R_VERSION=$(printf '%s\n' "$info" | sed -n 's/^VERSION=//p'); sha=$(printf '%s\n' "$info" | sed -n 's/^SHA256=//p')
    sig=$(printf '%s\n' "$info" | sed -n 's/^SIG=//p')
    [[ "$R_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] && [[ "$sha" =~ ^[0-9a-f]{64}$ ]] || { R_ERROR="the license server's answer isn't right"; return 1; }
    verify_sig "alexen-release:$R_VERSION:$sha" "$sig" || { R_ERROR="the release isn't signed by the license server: not installed"; return 1; }
    tar=$(mktemp --suffix=.tar.gz)
    LS_TIMEOUT=900 ls_get "/api/v1/download?version=$R_VERSION" "$tar"
    [ "$LS_CODE" = 200 ] || { rm -f "$tar"; R_ERROR=$(ls_error); return 1; }
    [ "$(sha256sum "$tar" | cut -d' ' -f1)" = "$sha" ] || { rm -f "$tar"; R_ERROR="the download is damaged (checksum): try again"; return 1; }
    rm -rf "$dest"; mkdir -p "$dest"
    tar -xzf "$tar" -C "$dest" --strip-components=1 --no-same-owner || { rm -f "$tar"; rm -rf "$dest"; R_ERROR="couldn't unpack the release"; return 1; }
    rm -f "$tar"
    [ -f "$dest/Dockerfile" ] && [ -f "$dest/app/__init__.py" ] || { rm -rf "$dest"; R_ERROR="the release is incomplete"; return 1; }
}

# the key for a new install: asked, checked with the license server, kept in the data folder
ask_license() {
    local k="${ALEXEN_LICENSE:-}" n
    while true; do
        [ -n "$k" ] || k=$(ask "License key (from the seller, ALX-...): " "")
        n=$(norm_key "$k")
        [ -n "$n" ] || { has_tty && [ -z "${ALEXEN_LICENSE:-}" ] && { echo "${Y}that isn't a license key (ALX-XXXXX-XXXXX-XXXXX-XXXXX)${N}" >&2; k=""; continue; }; fail "a license key is needed (ALEXEN_LICENSE=ALX-...)"; }
        mkdir -p "$LIC_DIR"; chmod 755 "$LIC_DIR"
        ( umask 077; printf '%s' "$n" > "$LIC_DIR/key" )
        lic_install >/dev/null
        ls_get /api/v1/precheck
        if [ "$LS_CODE" = 200 ]; then
            printf '%s' "$LS_BODY" | grep -q '"creator_set": *true' && LICENSE_HAS_CREATOR=1 || LICENSE_HAS_CREATOR=""
            say "license OK" "$G"; return 0
        fi
        local why; why=$(ls_error)
        rm -f "$LIC_DIR/key"
        if has_tty && [ -z "${ALEXEN_LICENSE:-}" ] && [ "$LS_CODE" != 000 ]; then echo "${Y}$why${N}" >&2; k=""; continue; fi
        fail "$why"
    done
}

fetch_source() {
    mkdir -p "$APP_DIR"
    if [ -n "$REPO" ] && [ -d "$REPO" ]; then     # a local copy (testing)
        rm -rf "$SRC_DIR"; cp -a "$REPO" "$SRC_DIR"
    else
        fetch_release "$SRC_DIR.new" || fail "$R_ERROR"
        rm -rf "$SRC_DIR"; mv "$SRC_DIR.new" "$SRC_DIR"
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

# a self-signed certificate for the server's IP (no domain, or Let's Encrypt couldn't be had)
self_signed() {
    local ip; ip=$(public_ip)
    openssl req -x509 -newkey rsa:2048 -nodes -days 3650 -subj "/CN=$ip" -addext "subjectAltName=IP:$ip" \
        -keyout "$DATA_DIR/certs/panel.key" -out "$DATA_DIR/certs/panel.crt" >/dev/null 2>&1
    CERT=/var/lib/marzban/certs/panel.crt; KEY=/var/lib/marzban/certs/panel.key; CA=private
}

# run a certbot command that must bind port 80; if a reverse proxy (nginx) already
# holds it on this host, free it just for the moment and put it back afterwards
certbot_80() {
    local freed="" rc
    if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE ':80$'; then
        if command -v systemctl >/dev/null 2>&1 && systemctl is-active --quiet nginx 2>/dev/null; then
            systemctl stop nginx && freed=nginx
        fi
    fi
    docker run --rm -p 80:80 "$@"; rc=$?
    [ -n "$freed" ] && systemctl start "$freed" >/dev/null 2>&1
    return $rc
}

le_cert() {
    local domain="$1" email="$2" le="$DATA_DIR/certs/le"
    # reuse a certificate we already hold for this domain (no port 80 needed)
    if [ -f "$le/live/$domain/fullchain.pem" ] && [ -f "$le/live/$domain/privkey.pem" ]; then
        say "reusing the existing certificate for $domain" "$G"
    else
        certbot_80 -v "$le:/etc/letsencrypt" certbot/certbot certonly --standalone \
            --non-interactive --agree-tos -m "${email:-admin@$domain}" -d "$domain" >/dev/null 2>&1 || return 1
    fi
    CERT=/var/lib/marzban/certs/le/live/$domain/fullchain.pem
    KEY=/var/lib/marzban/certs/le/live/$domain/privkey.pem
    CA=public
    # renew wrapper: binds port 80 (freeing nginx briefly) only when the certificate is
    # actually near expiry, so the daily check never disturbs a reverse proxy on port 80
    cat > "$DATA_DIR/renew-cert.sh" <<EOF
#!/bin/sh
le="$DATA_DIR/certs/le"; domain="$domain"; container="$CONTAINER"
openssl x509 -checkend 2592000 -noout -in "\$le/live/\$domain/fullchain.pem" >/dev/null 2>&1 && exit 0
freed=""
if ss -ltn 2>/dev/null | awk '{print \$4}' | grep -qE ':80\$'; then
    if systemctl is-active --quiet nginx 2>/dev/null; then systemctl stop nginx && freed=nginx; fi
fi
docker run --rm -p 80:80 -v "\$le:/etc/letsencrypt" certbot/certbot renew --quiet --deploy-hook "touch /etc/letsencrypt/.renewed"
[ -n "\$freed" ] && systemctl start "\$freed" >/dev/null 2>&1
[ -f "\$le/.renewed" ] && rm -f "\$le/.renewed" && docker restart "\$container" >/dev/null 2>&1
exit 0
EOF
    chmod +x "$DATA_DIR/renew-cert.sh"
    cat > /etc/cron.d/$APP-cert <<EOF
# Alexen: renew the panel certificate when it nears expiry, restart the panel when it changed
17 3 * * * root sh $DATA_DIR/renew-cert.sh >/dev/null 2>&1
EOF
}

# a certificate for the panel. A domain that can't get one never stops the install:
# it falls back to the IP (self-signed) and USED_IP is set, so the install says so.
USED_IP=""
certificates() {
    local domain="$1" email="$2"
    mkdir -p "$DATA_DIR/certs"
    if [ -n "$domain" ]; then
        say "getting a Let's Encrypt certificate for $domain" "$C"
        if le_cert "$domain" "$email"; then say "certificate ready" "$G"; return 0; fi
        say "couldn't get a certificate for $domain (does it point here? is port 80 free?)" "$Y"
        say "starting on the server's IP for now — add the domain later with: alexen cert domain $domain" "$Y"
        USED_IP=1
    fi
    self_signed
}

write_config() {
    local host="$1" port="$2"
    mkdir -p "$DATA_DIR"
    [ -f "$DATA_DIR/xray_config.json" ] || cp "$SRC_DIR/xray_config.json" "$DATA_DIR/xray_config.json"
    # your own .env: ALEXEN_ENV_FILE=/path (copied as-is, no certificate/domain lines added)
    if [ ! -f "$ENV_FILE" ] && [ -n "${ALEXEN_ENV_FILE:-}" ]; then
        [ -f "$ALEXEN_ENV_FILE" ] || fail "ALEXEN_ENV_FILE: no such file: $ALEXEN_ENV_FILE"
        install -m 600 "$ALEXEN_ENV_FILE" "$ENV_FILE"
        grep -q '^ALEXEN_LICENSE_SERVER' "$ENV_FILE" || [ "$LICENSE_SERVER" = https://admin.alexateam.ru ] \
            || printf '\nALEXEN_LICENSE_SERVER = "%s"\n' "$LICENSE_SERVER" >> "$ENV_FILE"
        say "using your .env ($ALEXEN_ENV_FILE)" "$C"
    fi
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
        # another license server (testing): the panel asks the same one
        [ "$LICENSE_SERVER" = https://admin.alexateam.ru ] || printf 'ALEXEN_LICENSE_SERVER = "%s"\n' "$LICENSE_SERVER" >> "$ENV_FILE"
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
    local user="${1:-}" pass="${2:-}" role="--creator" what="Creator (owner)"
    # the license panel sets the owner (creator) for this panel: the installer makes the
    # customer's own admin a sudo instead, and the owner is provisioned from the license
    if [ "$LICENSE_HAS_CREATOR" = 1 ]; then role=""; what="Admin"; fi
    [ -z "$pass" ] || [ ${#pass} -ge 8 ] || fail "ALEXEN_PASSWORD is too short (8 characters or more)"
    [ -n "$user" ] || user=$(ask "$what username [admin]: " admin)
    while [ -z "$pass" ]; do
        has_tty || fail "set ALEXEN_PASSWORD (8 characters or more)"
        pass=$(ask_secret "Password for $user (min. 8 characters): ")
        [ ${#pass} -ge 8 ] || { echo "${Y}too short${N}" >&2; pass=""; has_tty || fail "set ALEXEN_PASSWORD (8 characters or more)"; }
    done
    docker exec -e MARZBAN_ADMIN_PASSWORD="$pass" $CONTAINER marzban-cli admin create --sudo $role -u "$user" -tg "" -dc "" \
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
    banner "install"
    local domain="${ALEXEN_DOMAIN-__ask__}" email="${ALEXEN_EMAIL:-}" port="${ALEXEN_PORT:-8000}"
    if [ "$domain" = "__ask__" ]; then
        echo "  ${D}A domain gives a real certificate (no browser warning). Press Enter to skip${N}"
        echo "  ${D}and use the server's IP with a self-signed one — you can add a domain later.${N}"
        domain=$(ask "  ${W}Panel domain${N} ${D}(Enter = skip)${N}: " "")
    fi
    if [ -n "$domain" ] && [ -z "$email" ]; then email=$(ask "  ${W}E-mail for Let's Encrypt${N} [admin@$domain]: " "admin@$domain"); fi

    phase 1 6 "Checking the server and installing Docker"
    install_deps
    phase 2 6 "Checking the license"
    ask_license
    phase 3 6 "Downloading Alexen"
    fetch_source
    phase 4 6 "Building the panel ${D}(a few minutes the first time)${N}"
    build_image
    phase 5 6 "Certificate and settings"
    certificates "$domain" "$email"
    local host="${domain:-$(public_ip)}"; [ -n "$USED_IP" ] && host=$(public_ip)
    write_config "$host" "$port"
    install_cli
    phase 6 6 "Starting"
    dc up -d >/dev/null 2>&1 || { dc up -d; fail "the panel didn't start"; }
    wait_up "$port"
    open_port "$port"
    # installed again over kept data: its creator is still there
    ADMIN_USER=$(docker exec $CONTAINER python3 -c "from app.db import GetDB; from app.db.models import Admin
with GetDB() as db: a = db.query(Admin).filter(Admin.is_creator == True).first(); print(a.username if a else '')" 2>/dev/null | tail -1)
    if [ -n "$ADMIN_USER" ]; then say "keeping the existing creator: $ADMIN_USER" "$C"
    else create_creator "${ALEXEN_ADMIN:-}" "${ALEXEN_PASSWORD:-}"; fi
    install_updater quiet
    local lst; lst=$(license_wait)

    echo
    echo "  ${G}${W}✓ Alexen is ready${N}"
    echo "  ${D}${LINE}${N}"
    printf "  %-10s ${G}%s${N}\n" "Panel" "https://$host:$port/dashboard/"
    printf "  %-10s %s\n" "Owner" "$ADMIN_USER"
    case "$lst" in
        active|grace) printf "  %-10s ${G}%s${N}\n" "License" "active" ;;
        *) printf "  %-10s ${Y}%s${N}\n" "License" "enter the key in the panel ($(license_text "$lst"))" ;;
    esac
    { [ -z "$domain" ] || [ -n "$USED_IP" ]; } && printf "  %-10s ${Y}%s${N}\n" "Note" "self-signed certificate (the browser warns once); add a domain: alexen cert domain <domain>"
    echo "  ${D}${LINE}${N}"
    echo "  ${D}alexen${N}  — a menu     ${D}alexen help${N}  — every command"
    echo
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

# the latest version on the license server, and its changelog (FETCH_ERROR: why not)
FETCH_ERROR=""
fetch_latest() {
    FETCH_ERROR=""
    [ -n "$(lic_key)" ] || { FETCH_ERROR="no license key on this server: enter it in the panel"; return 1; }
    ls_get /api/v1/update
    [ "$LS_CODE" = 200 ] || { FETCH_ERROR=$(ls_error); return 1; }
    local v; v=$(printf '%s\n' "$LS_BODY" | sed -n 's/^VERSION=//p')
    [[ "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { FETCH_ERROR="the license server's answer isn't right"; return 1; }
    U_LATEST=$v
    ls_get /api/v1/changelog "$UPD_DIR/.changelog.tmp"
    if [ "$LS_CODE" = 200 ] && head -c1 "$UPD_DIR/.changelog.tmp" | grep -q '\['; then mv "$UPD_DIR/.changelog.tmp" "$UPD_DIR/changelog.json"
    else rm -f "$UPD_DIR/.changelog.tmp"; fi
    return 0
}

# the panel's license as it sees it (active, grace, expired, unlicensed, ...)
license_state() {
    docker exec "$CONTAINER" python3 -c "from app import license; print(license.status(fresh=True)['status'])" 2>/dev/null | tail -1
}
license_text() {
    case "$1" in
        active) echo "active" ;; grace) echo "ended, still working for a few days: renew it" ;;
        expired) echo "expired" ;; unlicensed) echo "no license entered" ;; suspended) echo "suspended" ;;
        revoked) echo "cancelled" ;; moved) echo "in use on another server" ;; invalid) echo "not valid for this server" ;;
        "") echo "unknown (the panel isn't running)" ;; *) echo "$1" ;;
    esac
}
# after an install: the panel activates the key itself in its first seconds
license_wait() {
    local st=""
    for i in $(seq 1 30); do
        st=$(license_state)
        case "$st" in active|grace|invalid|moved|revoked|suspended|expired) break;; esac
        [ -s "$LIC_DIR/key" ] || break
        sleep 2
    done
    echo "$st"
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
    fetch_latest || { [ "$was" = failed ] || U_ERROR="$FETCH_ERROR"; }
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

# the source as it was before the update (a failed one)
src_back() {
    [ -d "$1" ] || return 0
    rm -rf "$SRC_DIR"; mv "$1" "$SRC_DIR"
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
    local port old_version prev="${IMAGE%:*}:previous" old_src="$SRC_DIR.old"
    port=$(panel_port); old_version=$(running_version)
    ulog "updating from ${old_version:-?}"

    step backup "backup of the panel data"
    docker exec "$CONTAINER" python3 -c "from app import backup; print(backup.save_to_disk('alexen-backup-before-update'))" >>"$UPD_LOG" 2>&1 \
        || { upd_fail "the backup failed: nothing was changed"; return 1; }
    snapshot_data || { upd_fail "the backup failed: nothing was changed"; return 1; }

    step download "downloading the latest version"
    fetch_latest || { upd_fail "couldn't download the update ($FETCH_ERROR): nothing was changed"; return 1; }
    fetch_release "$SRC_DIR.new" || { upd_fail "couldn't download the update ($R_ERROR): nothing was changed"; return 1; }
    U_LATEST=$R_VERSION
    # the source before stays next to it until the new version runs
    rm -rf "$old_src"
    [ -d "$SRC_DIR" ] && mv "$SRC_DIR" "$old_src"
    mv "$SRC_DIR.new" "$SRC_DIR"
    ulog "version ${U_LATEST}"

    step build "building (a few minutes)"
    docker image inspect "$IMAGE" >/dev/null 2>&1 && docker tag "$IMAGE" "$prev"
    if ! try_build; then
        cat /tmp/$APP-build.log >> "$UPD_LOG" 2>/dev/null
        src_back "$old_src"
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
            src_back "$old_src"
            dc up -d --force-recreate >>"$UPD_LOG" 2>&1 || true
            if is_up "$port"; then upd_fail "the new version didn't start: back on ${old_version:-the old version}, data as before the update"
            else upd_fail "the new version didn't start and the old one didn't either: see the log"; fi
        else
            upd_fail "the new version didn't start (no old image to go back to): see the log"
        fi
        return 1
    fi

    rm -rf "$old_src"
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
    banner "$(running_version 2>/dev/null || true)"
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
    if container_up; then
        local ls; ls=$(license_state)
        case "$ls" in active) row "License" "${G}active${N} $(license_days)";; grace) row "License" "${Y}$(license_text grace)${N}";;
            *) row "License" "${R}$(license_text "$ls")${N} (alexen license)";; esac
    fi
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
    echo
}

cmd_doctor() {
    need_root
    local problems=0 port; port=$(panel_port)
    banner "checking this server"
    if docker info >/dev/null 2>&1; then ok "Docker is running"; else bad "Docker isn't running (systemctl start docker)"; problems=$((problems+1)); fi
    if container_up; then
        local rc; rc=$(docker inspect -f '{{.RestartCount}}' "$CONTAINER" 2>/dev/null)
        if [ "${rc:-0}" -gt 3 ]; then warn "the panel has restarted $rc times (alexen logs)"; else ok "the panel container runs"; fi
    else bad "the panel container isn't running (alexen up; alexen logs)"; problems=$((problems+1)); fi
    if curl -fsk -m 8 -o /dev/null "https://127.0.0.1:$port/dashboard/"; then ok "the panel answers on port $port"
    else bad "the panel doesn't answer on port $port"; problems=$((problems+1)); fi
    if pgrep -x xray >/dev/null 2>&1; then ok "Xray core runs ($(core_version))"; else bad "Xray core isn't running (alexen logs)"; problems=$((problems+1)); fi
    if container_up; then
        local ls; ls=$(license_state)
        case "$ls" in
            active) ok "the license is active $(license_days)" ;;
            grace) warn "the license has ended: it still works a few days, renew it" ;;
            *) bad "the license: $(license_text "$ls") (alexen license KEY)"; problems=$((problems+1)) ;;
        esac
        local le; le=$(docker exec "$CONTAINER" python3 -c "from app import license; print(license.status()['last_error'])" 2>/dev/null | tail -1)
        [ "$le" = unreachable ] && warn "the license server couldn't be reached at the last check (the panel keeps working)"
    fi
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
            certbot_80 -v "$DATA_DIR/certs/le:/etc/letsencrypt" certbot/certbot renew --force-renewal --quiet \
                || fail "renewing failed: port 80 must be free and the domain must point here"
            restart_and_wait; say "renewed: $(cert_days) days" "$G" ;;
        domain)
            # switch a panel that runs on its IP (self-signed) to a real certificate for a domain
            local domain="${2:-}" email="${3:-}" port; port=$(panel_port)
            [ -n "$domain" ] || domain=$(ask "Domain (it must point to this server, port 80 free): " "")
            [ -n "$domain" ] || fail "a domain is needed (alexen cert domain panel.example.com)"
            [ -n "$email" ] || email="admin@$domain"
            mkdir -p "$DATA_DIR/certs"
            say "getting a Let's Encrypt certificate for $domain" "$C"
            le_cert "$domain" "$email" || fail "no certificate for $domain: does it point here? is port 80 free? (the panel keeps running as it is)"
            env_set UVICORN_SSL_CERTFILE "$CERT"; env_set UVICORN_SSL_KEYFILE "$KEY"; env_set UVICORN_SSL_CA_TYPE public
            env_set XRAY_SUBSCRIPTION_URL_PREFIX "https://$domain:$port"
            restart_and_wait; say "the panel now uses https://$domain:$port — set it as your subscription domain too" "$G" ;;
        *)
            [ -f "$f" ] || fail "no certificate file ($f)"
            row "File" "$f"
            row "For" "$(openssl x509 -noout -subject -in "$f" 2>/dev/null | sed 's/^subject= *//')"
            row "Issuer" "$(openssl x509 -noout -issuer -in "$f" 2>/dev/null | sed 's/^issuer= *//')"
            row "Ends" "$(openssl x509 -noout -enddate -in "$f" 2>/dev/null | cut -d= -f2) ($(cert_days) days)"
            [ -f /etc/cron.d/$APP-cert ] && row "Renewal" "automatic (alexen cert renew to do it now)" ;;
    esac
}

license_days() {
    docker exec "$CONTAINER" python3 -c "
from app import license; s = license.status()
print('(no end date)' if not s['expires'] else '(%s days left)' % s['days_left'] if s['days_left'] >= 0 else '')" 2>/dev/null | tail -1
}

cmd_license() {
    need_root
    container_up || fail "the panel isn't running (alexen up)"
    local key="${1:-}"
    if [ -n "$key" ]; then
        local n; n=$(norm_key "$key")
        [ -n "$n" ] || fail "that isn't a license key (ALX-XXXXX-XXXXX-XXXXX-XXXXX)"
        local r; r=$(docker exec -e K="$n" "$CONTAINER" python3 -c "
import os; from app import license
try: license.activate(os.environ['K']); print('OK')
except license.LicenseError as e: print('ERR', e)" 2>&1 | tail -1)
        case "$r" in OK) say "the license is active" "$G";; ERR*) fail "${r#ERR }";; *) fail "couldn't activate: $r";; esac
    else
        docker exec "$CONTAINER" python3 -c "from app import license; license.check()" >/dev/null 2>&1 || true
    fi
    docker exec "$CONTAINER" python3 -c "
import time; from app import license
s = license.status(fresh=True); k = license.stored_key()
def d(t): return time.strftime('%Y-%m-%d', time.localtime(t)) if t else '-'
lim = lambda v: str(v) if v else 'no limit'
u = license._usage()
print('  %-16s %s' % ('Status', s['status'].upper()))
if k: print('  %-16s %s' % ('Key', k[:9] + '...' + k[-5:]))
if s['customer']: print('  %-16s %s' % ('For', s['customer']))
if s['activated']: print('  %-16s %s' % ('Active since', d(s['activated'])))
if s['activated']: print('  %-16s %s' % ('Ends', d(s['expires']) + ('  (%s days left)' % s['days_left'] if s['expires'] and s['days_left'] >= 0 else '') if s['expires'] else 'no end date'))
for n in ('users', 'admins', 'nodes'):
    if s['activated']: print('  %-16s %s / %s' % (n.capitalize(), u.get(n), lim(s['limits'][n])))
print('  %-16s %s' % ('Last check', time.strftime('%Y-%m-%d %H:%M', time.localtime(s['last_check'])) if s['last_check'] else 'never') + ('  (last try: ' + s['last_error'] + ')' if s['last_error'] else ''))
" 2>/dev/null
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
        cert) COMPREPLY=($(compgen -W "renew domain" -- "$cur")); return;;
    esac
    [ "$COMP_CWORD" -eq 1 ] && COMPREPLY=($(compgen -W "status doctor logs restart up down update check-update backup restore env edit core passwd admins admin cert license cli version uninstall help" -- "$cur"))
}
complete -F _alexen alexen
EOF
    say "tab completion on (a new shell has it)" "$G"
}

cmd_help() {
    banner "$(running_version 2>/dev/null || true)"
    local h="  ${D}%-22s${N} %s\n"
    echo "  ${W}EVERYDAY${N}"
    printf "$h" "status"            "how the panel is doing"
    printf "$h" "doctor"            "check everything, say what's wrong"
    printf "$h" "logs [-n N] [-N]"  "the panel log (-N: don't follow)"
    printf "$h" "restart / up / down" "stop and start the panel"
    echo
    echo "  ${W}VERSIONS & BACKUPS${N}"
    printf "$h" "update"            "update to the latest (safe: rolls back on failure)"
    printf "$h" "backup [list]"     "a backup now, or the saved ones"
    printf "$h" "restore [FILE]"    "put a backup back (saves the data now first)"
    printf "$h" "core [list|latest|VER|reset]" "the Xray core version"
    echo
    echo "  ${W}SETTINGS${N}"
    printf "$h" "env [list|get|set|unset]" "the panel's .env settings"
    printf "$h" "edit"              "open the .env in an editor"
    printf "$h" "cert [renew|domain D]" "the certificate (domain: switch to a real one)"
    printf "$h" "license [KEY]"     "the license (a key activates it here)"
    echo
    echo "  ${W}ACCOUNTS${N}"
    printf "$h" "admins"            "the admin accounts"
    printf "$h" "passwd [NAME]"     "a new password for an admin"
    printf "$h" "admin [NAME]"      "add an owner (creator) account"
    printf "$h" "cli ..."           "the admin command line"
    echo
    printf "$h" "completion"        "tab completion"
    printf "$h" "uninstall"         "remove the panel (the data stays unless you ask)"
    echo
    echo "  ${D}Run ${N}${G}alexen${N}${D} with no command for a menu.  Support: Telegram ${C}@alexvpns${N}"
    echo
}

cmd_menu() {
    local items=("status" "doctor" "logs" "update" "backup" "backup list" "restore" "license" "env list" "edit" "core" "admins" "passwd" "cert" "restart" "help")
    local labels=("Status" "Doctor" "Logs" "Update" "Backup now" "Backups" "Restore" "License" "Settings (.env)" "Edit .env" "Xray core" "Admins" "Change password" "Certificate" "Restart" "Help")
    while true; do
        banner "$(running_version 2>/dev/null || true)"
        local i=1; for it in "${labels[@]}"; do printf "   ${C}%2d${N}) %s\n" $i "$it"; i=$((i+1)); done
        printf "    ${D}0${N}) exit\n\n"
        local c; c=$(ask "  ${W}>${N} " 0)
        [ "$c" = 0 ] || [ -z "$c" ] && { echo; return 0; }
        [[ "$c" =~ ^[0-9]+$ ]] && [ "$c" -ge 1 ] && [ "$c" -le ${#items[@]} ] || { echo "  ${Y}pick 1-${#items[@]} or 0${N}"; continue; }
        echo
        # a command that fails returns here, not out of the menu
        ( set +e; main ${items[$((c-1))]} ) || true
        [ -t 0 ] && { read -rp "  ${D}press Enter${N} " _ </dev/tty || true; }
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
        license|licence) cmd_license "$@" ;;
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
