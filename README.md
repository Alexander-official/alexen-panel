# Alexen

A multi-protocol proxy management panel by **Alexander LLC**, built on the Xray
core. Alexen is a hardened fork of [Marzban](https://github.com/Gozargah/Marzban)
with these additions:

- **Hysteria2** protocol (native Xray core, works on nodes too), with **Salamander obfs**
- **Online IPs** view — see who is connected, on which node and inbound, in real time
- **Per-user IP limit** — extra IPs are blocked until an earlier one disconnects
- **Terminate a session** — kick one online IP with a click
- **Device (HWID) limit** — cap how many devices can use a subscription, manage them per user
- **Roles** — creator (the owner), sudo admins and resellers with user-count and traffic quotas, and **host groups** so each reseller only hands out the hosts you allow
- **Per-inbound traffic** — see how much went through each inbound per user
- **Backups** and **updates from the panel** (a backup first, the old version back if a new one fails)

Support: Telegram [@alexvpns](https://t.me/alexvpns)

## Install

On a fresh Debian / Ubuntu server, as root:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Alexander-official/alexen-panel/main/scripts/alexen.sh) install
```

It installs Docker, builds the panel, asks for a domain (a Let's Encrypt
certificate, renewed by itself) or uses a self-signed certificate for the
server's IP, and creates the creator (owner) account. Without questions:

```bash
ALEXEN_DOMAIN=panel.example.com ALEXEN_EMAIL=me@example.com \
ALEXEN_ADMIN=owner ALEXEN_PASSWORD='a-strong-password' \
bash <(curl -fsSL https://raw.githubusercontent.com/Alexander-official/alexen-panel/main/scripts/alexen.sh) install
```

Then open `https://<domain or server IP>:8000/dashboard/`.

## Manage

`alexen` alone opens a menu; `alexen help` lists everything:

```bash
alexen status          # version, address, certificate, users, last backup
alexen doctor          # check everything and say what's wrong
alexen logs [-n 200] [--no-follow]
alexen restart | up | down
alexen update          # the latest version (also from the panel: Settings > Update)
alexen backup [list]   # a backup now / the saved ones
alexen restore [FILE]  # put a backup back (the data now is saved first)
alexen env [list|get|set|unset]   # the panel's settings; alexen edit opens them in an editor
alexen core [list|latest|VERSION|reset]   # the Xray core version (back to the old one if it fails)
alexen cert [renew]    # the certificate
alexen passwd [NAME]   # a new password for an admin
alexen admins | admin [NAME] | cli ...
alexen completion      # tab completion
alexen uninstall       # the data in /var/lib/alexen stays unless you ask
```

## Telegram bot

Settings > Telegram in the panel: paste a token from @BotFather and your Telegram ID
(write `/id` to the bot to see it). The bot shows the panel's state, who is online and a
user's details, sends a backup on request, and backups on a schedule if you turn it on.

## Nodes

Add nodes from the panel (Nodes). Hysteria2 inbounds need an Xray core
**v26.3.27 or newer** on the node; older nodes keep working but skip Hysteria2.

## License

Fork of Marzban (AGPL-3.0); see [LICENSE](LICENSE).
