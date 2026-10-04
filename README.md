# Alexen

A multi-protocol proxy management panel by **Alexander LLC**, built on the Xray
core. Alexen is a hardened fork of [Marzban](https://github.com/Gozargah/Marzban)
with these additions:

- **Hysteria2** protocol (native Xray core, works on nodes too), with **Salamander obfs**
- **Online IPs** view — see who is connected, on which node and inbound, in real time
- **Per-user IP limit** — extra IPs are blocked until an earlier one disconnects
- **Terminate a session** — kick one online IP with a click
- **Device (HWID) limit** — cap how many devices can use a subscription, manage them per user
- **Resellers** — non-sudo admins with user-count and traffic quotas, and **host groups** so each reseller only hands out the hosts you allow
- **Per-inbound traffic** — see how much went through each inbound per user

## Install

```bash
sudo bash -c "$(curl -sL https://raw.githubusercontent.com/alexen-panel/alexen/master/scripts/alexen.sh)" @ install
```

Then create your owner (super admin):

```bash
alexen cli admin create --sudo
```

Open `http://<server>:8000/dashboard/`. For HTTPS, point
`UVICORN_SSL_CERTFILE` / `UVICORN_SSL_KEYFILE` in `/opt/alexen/.env` to your
certificate (e.g. issued with acme.sh into `/var/lib/alexen/certs/`).

## Manage

```bash
alexen up | down | restart | status | logs
alexen update          # pull the latest image and restart
alexen core-update     # update the Xray core
alexen cli ...         # admin CLI
```

## Nodes

Add nodes from the panel (Admins → Nodes). Hysteria2 inbounds need an Xray core
**v26.3.27 or newer** on the node; older nodes keep working but skip Hysteria2.

## License

Fork of Marzban (AGPL-3.0); see [LICENSE](LICENSE).
