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

```bash
alexen status | logs | restart
alexen update          # the latest version (also from the panel: Settings > Update)
alexen check-update    # look for a new version
alexen backup          # a backup into /var/lib/alexen/backups
alexen admin [name]    # add a creator account
alexen cli ...         # the admin command line
alexen uninstall       # the data in /var/lib/alexen stays unless you ask
```

## Nodes

Add nodes from the panel (Nodes). Hysteria2 inbounds need an Xray core
**v26.3.27 or newer** on the node; older nodes keep working but skip Hysteria2.

## License

Fork of Marzban (AGPL-3.0); see [LICENSE](LICENSE).
