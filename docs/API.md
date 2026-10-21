# Alexen API reference

Generated from the OpenAPI schema of **AlexenAPI v1.15.2** (132 paths). The machine-readable spec is [`openapi.json`](./openapi.json) — import it into Postman/Insomnia or a Redoc/Swagger viewer.

## Authentication

Most endpoints need a bearer token. Get one with the admin login, then send it as `Authorization: Bearer <token>`:

```bash
curl -X POST https://YOUR-PANEL/api/admin/token \
     -d 'username=<admin>&password=<password>'
# -> {"access_token": "...", "token_type": "bearer"}

curl https://YOUR-PANEL/api/users \
     -H 'Authorization: Bearer <access_token>'
```

Subscription endpoints under `/sub/...` are public and authenticated by the token in the URL.

> Interactive docs (Swagger UI at `/docs`, Redoc at `/redoc`) are off by default; start the panel with the `DOCS=True` environment variable to enable them.

## Endpoints by area

- [Admin](#admin) — 10 endpoint(s)
- [User](#user) — 20 endpoint(s)
- [User Template](#user-template) — 5 endpoint(s)
- [Subscription](#subscription) — 6 endpoint(s)
- [Node](#node) — 16 endpoint(s)
- [Core](#core) — 12 endpoint(s)
- [Chain](#chain) — 4 endpoint(s)
- [Preroute](#preroute) — 7 endpoint(s)
- [Outbounds](#outbounds) — 3 endpoint(s)
- [Groups](#groups) — 4 endpoint(s)
- [Settings](#settings) — 22 endpoint(s)
- [Online](#online) — 5 endpoint(s)
- [Traffic](#traffic) — 6 endpoint(s)
- [Stats](#stats) — 1 endpoint(s)
- [Overview](#overview) — 1 endpoint(s)
- [Activity](#activity) — 1 endpoint(s)
- [Backup](#backup) — 7 endpoint(s)
- [Telegram](#telegram) — 4 endpoint(s)
- [Notifications](#notifications) — 9 endpoint(s)
- [Profile](#profile) — 4 endpoint(s)
- [System](#system) — 4 endpoint(s)
- [Update](#update) — 3 endpoint(s)
- [VPN](#vpn) — 6 endpoint(s)
- [License](#license) — 4 endpoint(s)
- [Other](#other) — 1 endpoint(s)


## Admin

### `GET /api/admin`

Get Current Admin

**Responses**: `200`, `401`

### `POST /api/admin`

Create Admin

**Request body**: `AdminCreate`

**Responses**: `200`, `401`, `403`, `409`, `422`

### `POST /api/admin/token`

Admin Token

**Responses**: `200`, `401`, `422`

### `POST /api/admin/usage/reset/{username}`

Reset Admin Usage

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `GET /api/admin/usage/{username}`

Get Admin Usage

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `DELETE /api/admin/{username}`

Remove Admin

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `PUT /api/admin/{username}`

Modify Admin

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Request body**: `AdminModify`

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/admin/{username}/users/activate`

Activate All Disabled Users

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `POST /api/admin/{username}/users/disable`

Disable All Active Users

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `GET /api/admins`

Get Admins

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `offset` | query | integer | null | no |
| `limit` | query | integer | null | no |
| `username` | query | string | null | no |

**Responses**: `200`, `401`, `403`, `422`


## User

### `POST /api/user`

Add User

**Request body**: `UserCreate`

**Responses**: `200`, `400`, `401`, `409`, `422`

### `DELETE /api/user/{username}`

Remove User

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `GET /api/user/{username}`

Get User

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `PUT /api/user/{username}`

Modify User

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Request body**: `UserModify`

**Responses**: `200`, `400`, `401`, `403`, `404`, `422`

### `POST /api/user/{username}/active-next`

Active Next Plan

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `DELETE /api/user/{username}/devices`

Remove User Devices

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `GET /api/user/{username}/devices`

Get User Devices

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `DELETE /api/user/{username}/devices/{device_id}`

Remove User Device

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `device_id` | path | integer | yes |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `GET /api/user/{username}/inbound-usage`

Get User Inbound Usage

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `POST /api/user/{username}/reset`

Reset User Data Usage

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `POST /api/user/{username}/revoke_sub`

Revoke User Subscription

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `PUT /api/user/{username}/set-owner`

Set Owner

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |
| `admin_username` | query | string | yes |

**Responses**: `200`, `401`, `422`

### `GET /api/user/{username}/usage`

Get User Usage

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |
| `start` | query | string | no |
| `end` | query | string | no |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `GET /api/users`

Get Users

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `offset` | query | integer | no |
| `limit` | query | integer | no |
| `username` | query | [string] | no |
| `search` | query | string | null | no |
| `admin` | query | [string] | null | no |
| `status` | query | UserStatus | no |
| `sort` | query | string | no |

**Responses**: `200`, `400`, `401`, `403`, `404`, `422`

### `POST /api/users/bulk/protocol`

Bulk Protocol

**Request body**: `BulkProtocol`

**Responses**: `200`, `400`, `401`, `403`, `422`

### `DELETE /api/users/expired`

Delete Expired Users

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `expired_after` | query | string | null | no |
| `expired_before` | query | string | null | no |

**Responses**: `200`, `401`, `422`

### `GET /api/users/expired`

Get Expired Users

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `expired_after` | query | string | null | no |
| `expired_before` | query | string | null | no |

**Responses**: `200`, `401`, `422`

### `POST /api/users/reset`

Reset Users Data Usage

**Responses**: `200`, `401`, `403`, `404`

### `POST /api/users/transfer`

Transfer Users

**Request body**: `TransferUsers`

**Responses**: `200`, `400`, `401`, `403`, `404`, `422`

### `GET /api/users/usage`

Get Users Usage

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `start` | query | string | no |
| `end` | query | string | no |
| `admin` | query | [string] | null | no |

**Responses**: `200`, `401`, `422`


## User Template

### `GET /api/user_template`

Get User Templates

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `offset` | query | integer | no |
| `limit` | query | integer | no |

**Responses**: `200`, `422`

### `POST /api/user_template`

Add User Template

**Request body**: `UserTemplateCreate`

**Responses**: `200`, `422`

### `DELETE /api/user_template/{template_id}`

Remove User Template

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `template_id` | path | integer | yes |

**Responses**: `200`, `422`

### `GET /api/user_template/{template_id}`

Get User Template Endpoint

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `template_id` | path | integer | yes |

**Responses**: `200`, `422`

### `PUT /api/user_template/{template_id}`

Modify User Template

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `template_id` | path | integer | yes |

**Request body**: `UserTemplateModify`

**Responses**: `200`, `422`


## Subscription

### `GET /sub/{token}/`

User Subscription

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `token` | path | string | yes |
| `user-agent` | header | string | no |

**Responses**: `200`, `422`

### `GET /sub/{token}/info`

User Subscription Info

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `token` | path | string | yes |

**Responses**: `200`, `422`

### `GET /sub/{token}/usage`

User Get Usage

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `token` | path | string | yes |
| `start` | query | string | no |
| `end` | query | string | no |

**Responses**: `200`, `422`

### `GET /sub/{token}/vpn/{key}/{filename}`

User Vpn Config

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `key` | path | string | yes |
| `filename` | path | string | yes |
| `token` | path | string | yes |

**Responses**: `200`, `422`

### `GET /sub/{token}/{extra}`

User Subscription Extra

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `extra` | path | string | yes |
| `token` | path | string | yes |
| `user-agent` | header | string | no |

**Responses**: `200`, `422`

### `GET /sub/{token}/{extra}/{client_type}`

User Subscription Extra Client Type

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `extra` | path | string | yes |
| `client_type` | path | string | yes |
| `token` | path | string | yes |
| `user-agent` | header | string | no |

**Responses**: `200`, `422`


## Node

### `POST /api/node`

Add Node

**Request body**: `NodeCreate`

**Responses**: `200`, `401`, `403`, `409`, `422`

### `GET /api/node-install/{job_id}`

Install Status

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `job_id` | path | string | yes |
| `offset` | query | integer | no |

**Responses**: `200`, `401`, `403`, `422`

### `GET /api/node/settings`

Get Node Settings

**Responses**: `200`, `401`, `403`

### `DELETE /api/node/{node_id}`

Remove Node

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `node_id` | path | integer | yes |

**Responses**: `200`, `401`, `403`, `422`

### `GET /api/node/{node_id}`

Get Node

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `node_id` | path | integer | yes |

**Responses**: `200`, `401`, `403`, `422`

### `PUT /api/node/{node_id}`

Modify Node

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `node_id` | path | integer | yes |

**Request body**: `NodeModify`

**Responses**: `200`, `401`, `403`, `422`

### `PUT /api/node/{node_id}/extra`

Put Node Extra

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `node_id` | path | integer | yes |

**Request body**: `NodeExtraIn`

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/node/{node_id}/install`

Install Node

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `node_id` | path | integer | yes |

**Request body**: `InstallIn`

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/node/{node_id}/reconnect`

Reconnect Node

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `node_id` | path | integer | yes |

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/node/{node_id}/restart`

Restart Node Core

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `node_id` | path | integer | yes |

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/node/{node_id}/uninstall`

Uninstall Node

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `node_id` | path | integer | yes |

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/node/{node_id}/update-xray`

Update Node Xray

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `node_id` | path | integer | yes |

**Responses**: `200`, `401`, `403`, `422`

### `GET /api/nodes`

Get Nodes

**Responses**: `200`, `401`, `403`

### `GET /api/nodes/extras`

Nodes Extras

**Responses**: `200`, `401`, `403`

### `GET /api/nodes/system`

Nodes System

**Responses**: `200`, `401`, `403`

### `GET /api/nodes/usage`

Get Usage

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `start` | query | string | no |
| `end` | query | string | no |

**Responses**: `200`, `401`, `403`, `422`


## Core

### `GET /api/core`

Get Core Stats

**Responses**: `200`, `401`

### `GET /api/core/config`

Get Core Config

**Responses**: `200`, `401`, `403`

### `PUT /api/core/config`

Modify Core Config

**Request body**: `object`

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/core/outbound-from-link`

Outbound From Link

**Request body**: `OutboundLink`

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/core/restart`

Restart Core

**Responses**: `200`, `401`, `403`

### `GET /api/core/x25519`

Generate X25519

**Responses**: `200`, `401`, `403`

### `GET /api/cores`

List Cores

**Responses**: `200`, `401`, `403`

### `POST /api/cores`

Create Core

**Request body**: `CoreCreate`

**Responses**: `200`, `401`, `403`, `422`

### `DELETE /api/cores/{core_id}`

Delete Core

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `core_id` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `PUT /api/cores/{core_id}`

Rename Core

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `core_id` | path | string | yes |

**Request body**: `CoreModify`

**Responses**: `200`, `401`, `403`, `422`

### `GET /api/cores/{core_id}/config`

Get Extra Core Config

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `core_id` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `PUT /api/cores/{core_id}/config`

Modify Extra Core Config

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `core_id` | path | string | yes |

**Request body**: `object`

**Responses**: `200`, `401`, `403`, `422`


## Chain

### `GET /api/chain`

Get Chain

**Responses**: `200`, `401`, `403`

### `POST /api/chain/{key}/check`

Check Exit

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `key` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `PUT /api/chain/{key}/exit`

Put Exit

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `key` | path | string | yes |

**Request body**: `ExitIn`

**Responses**: `200`, `401`, `403`, `422`

### `PUT /api/chain/{relay}`

Put Chain

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `relay` | path | string | yes |

**Request body**: `LinkIn`

**Responses**: `200`, `401`, `403`, `422`


## Preroute

### `GET /api/preroute`

Get Preroute

**Responses**: `200`, `401`, `403`

### `POST /api/preroute/import-3xui`

Import 3Xui

**Responses**: `200`, `401`, `403`, `422`

### `DELETE /api/preroute/tunnels/{tid}`

Delete Tunnel

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `tid` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `PUT /api/preroute/tunnels/{tid}`

Put Tunnel

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `tid` | path | string | yes |

**Request body**: `TunnelIn`

**Responses**: `200`, `401`, `403`, `422`

### `PUT /api/preroute/tunnels/{tid}/enabled`

Set Tunnel Enabled

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `tid` | path | string | yes |

**Request body**: `EnabledIn`

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/preroute/tunnels/{tid}/hosts`

Make Hosts

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `tid` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/preroute/tunnels/{tid}/test`

Test Tunnel

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `tid` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`


## Outbounds

### `POST /api/outbounds/test`

Test Outbounds

**Request body**: `TestIn`

**Responses**: `200`, `401`, `403`, `422`

### `GET /api/outbounds/traffic`

Get Traffic

**Responses**: `200`, `401`, `403`

### `POST /api/outbounds/traffic/reset`

Reset Traffic

**Request body**: `ResetIn`

**Responses**: `200`, `401`, `403`, `422`


## Groups

### `GET /api/groups`

List Groups

**Responses**: `200`, `401`, `403`

### `POST /api/groups`

Create Group

**Request body**: `GroupCreate`

**Responses**: `200`, `401`, `403`, `422`

### `DELETE /api/groups/{name}`

Delete Group

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `name` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `PUT /api/groups/{name}`

Modify Group

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `name` | path | string | yes |

**Request body**: `GroupModify`

**Responses**: `200`, `401`, `403`, `422`


## Settings

### `GET /api/admin/{name}/sub-profile`

Read Admin Sub Profile

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `name` | path | string | yes |

**Responses**: `200`, `401`, `422`

### `PUT /api/admin/{name}/sub-profile`

Update Admin Sub Profile

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `name` | path | string | yes |

**Request body**: `AdminSubProfile`

**Responses**: `200`, `401`, `422`

### `GET /api/admins/sub-profiles`

Admins Sub Profiles

**Responses**: `200`, `401`

### `GET /api/external-configs`

Read External Configs

**Responses**: `200`, `401`

### `PUT /api/external-configs`

Update External Configs

**Request body**: `ExternalSettings-Input`

**Responses**: `200`, `401`, `422`

### `GET /api/external-configs/mine`

Read Own External

**Responses**: `200`, `401`

### `PUT /api/external-configs/mine`

Update Own External

**Request body**: `OwnExternal`

**Responses**: `200`, `401`, `422`

### `POST /api/external-configs/preview`

Preview External Configs

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | query | string | null | no |

**Request body**: `ExternalSettings-Input`

**Responses**: `200`, `401`, `422`

### `GET /api/external-configs/sources`

External Sources Status

**Responses**: `200`, `401`

### `POST /api/external-configs/sources/{source_id}/refresh`

Refresh External Source

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `source_id` | path | string | yes |

**Responses**: `200`, `401`, `422`

### `GET /api/json-sub-settings`

Read Json Sub Settings

**Responses**: `200`, `401`

### `PUT /api/json-sub-settings`

Update Json Sub Settings

**Request body**: `JsonSubSettings`

**Responses**: `200`, `401`, `422`

### `GET /api/sub-domain`

Read Sub Domain

**Responses**: `200`, `401`

### `PUT /api/sub-domain`

Update Sub Domain

**Request body**: `DomainSettings`

**Responses**: `200`, `401`, `422`

### `POST /api/sub-domain/example`

Example Sub Domain

**Request body**: `DomainSettings`

**Responses**: `200`, `401`, `422`

### `GET /api/sub-settings`

Read Sub Settings

**Responses**: `200`, `401`

### `PUT /api/sub-settings`

Update Sub Settings

**Request body**: `SubscriptionSettings`

**Responses**: `200`, `401`, `422`

### `GET /api/sub-webpage`

Read Sub Webpage

**Responses**: `200`, `401`

### `PUT /api/sub-webpage`

Update Sub Webpage

**Request body**: `WebPageSettings-Input`

**Responses**: `200`, `401`, `422`

### `GET /api/sub-webpage/default-apps`

Read Sub Webpage Default Apps

**Responses**: `200`, `401`

### `GET /api/sub-webpage/defaults`

Read Sub Webpage Defaults

**Responses**: `200`, `401`

### `POST /api/sub-webpage/preview`

Preview Sub Webpage

**Request body**: `WebPagePreview`

**Responses**: `200`, `401`, `422`


## Online

### `GET /api/online`

Get Online Summary

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `limit` | query | integer | no |
| `sort` | query | string | no |

**Responses**: `200`, `401`, `422`

### `GET /api/online/providers`

Get Online Providers

**Responses**: `200`, `401`

### `GET /api/user/{username}/online-ips`

Get User Online Ips

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `DELETE /api/user/{username}/online-ips/{ip}`

Disconnect User Ip

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `ip` | path | string | yes |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`

### `POST /api/user/{username}/online-ips/{ip}/unblock`

Unblock User Ip

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `ip` | path | string | yes |
| `username` | path | string | yes |

**Responses**: `200`, `401`, `403`, `404`, `422`


## Traffic

### `GET /api/auto-change`

Get Auto Change

**Responses**: `200`, `401`, `403`

### `PUT /api/auto-change`

Put Auto Change

**Request body**: `RulesPayload`

**Responses**: `200`, `401`, `403`, `422`

### `GET /api/auto-change/status`

Get Auto Change Status

**Responses**: `200`, `401`, `403`

### `POST /api/auto-change/{rule_id}/reset`

Reset Rule

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `rule_id` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/auto-change/{rule_id}/switch`

Switch Now

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `rule_id` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `GET /api/traffic/live`

Live Traffic

**Responses**: `200`, `401`, `403`


## Stats

### `GET /api/stats/overview`

Stats Overview

**Responses**: `200`, `401`


## Overview

### `GET /api/overview`

Overview

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `period` | query | string | no |
| `tz` | query | integer | no |
| `start` | query | integer | null | no |
| `end` | query | integer | null | no |

**Responses**: `200`, `401`, `422`


## Activity

### `GET /api/activity`

Activity

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `kind` | query | string | no |
| `admin` | query | string | null | no |
| `q` | query | string | no |
| `before` | query | integer | null | no |
| `limit` | query | integer | no |

**Responses**: `200`, `401`, `422`


## Backup

### `GET /api/backup`

Download Backup

**Responses**: `200`, `401`, `403`

### `POST /api/backup/check`

Check Backup

**Responses**: `200`, `401`, `403`, `422`

### `DELETE /api/backup/file/{name}`

Delete Saved

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `name` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `GET /api/backup/file/{name}`

Download Saved

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `name` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `GET /api/backup/list`

List Backups

**Responses**: `200`, `401`, `403`

### `POST /api/backup/now`

Backup Now

**Responses**: `200`, `401`, `403`

### `POST /api/backup/restore`

Restore Backup

**Responses**: `200`, `401`, `403`, `422`


## Telegram

### `GET /api/telegram`

Read Bot

**Responses**: `200`, `401`, `403`

### `PUT /api/telegram`

Update Bot

**Request body**: `BotUpdate`

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/telegram/backup`

Send Backup Now

**Responses**: `200`, `401`, `403`

### `POST /api/telegram/test`

Test Bot

**Responses**: `200`, `401`, `403`


## Notifications

### `GET /api/alerts`

List Alerts

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `unread` | query | boolean | no |
| `before` | query | integer | null | no |
| `limit` | query | integer | no |

**Responses**: `200`, `401`, `422`

### `POST /api/alerts/read`

Read Alerts

**Request body**: `ReadBody`

**Responses**: `200`, `401`, `422`

### `GET /api/anti-theft`

Read Anti Theft

**Responses**: `200`, `401`

### `PUT /api/anti-theft`

Update Anti Theft

**Request body**: `TheftSettings`

**Responses**: `200`, `401`, `422`

### `GET /api/messages/threads`

Message Threads

**Responses**: `200`, `401`

### `GET /api/messages/{thread}`

Read Messages

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `thread` | path | string | yes |
| `after` | query | integer | no |

**Responses**: `200`, `401`, `422`

### `POST /api/messages/{thread}`

Send Message

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `thread` | path | string | yes |

**Request body**: `MessageIn`

**Responses**: `200`, `401`, `422`

### `GET /api/notify/counts`

Notify Counts

**Responses**: `200`, `401`

### `PUT /api/user/{username}/warning`

Set User Warning

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `username` | path | string | yes |

**Request body**: `WarningIn`

**Responses**: `200`, `401`, `422`


## Profile

### `GET /api/profile`

Get Profile

**Responses**: `200`, `401`

### `PUT /api/profile`

Edit Profile

**Request body**: `ProfileEdit`

**Responses**: `200`, `401`, `422`

### `POST /api/profile/password`

Change Password

**Request body**: `PasswordChange`

**Responses**: `200`, `401`, `422`

### `GET /api/profiles`

List Profiles

**Responses**: `200`, `401`


## System

### `GET /api/hosts`

Get Hosts

**Responses**: `200`, `401`, `403`

### `PUT /api/hosts`

Modify Hosts

**Request body**: `object`

**Responses**: `200`, `401`, `403`, `422`

### `GET /api/inbounds`

Get Inbounds

**Responses**: `200`, `401`

### `GET /api/system`

Get System Stats

**Responses**: `200`, `401`


## Update

### `GET /api/update`

Update State

**Responses**: `200`, `401`, `403`

### `POST /api/update`

Start Update

**Responses**: `200`, `401`, `403`

### `POST /api/update/check`

Check For Update

**Responses**: `200`, `401`, `403`


## VPN

### `GET /api/vpn`

Get Vpn

**Responses**: `200`, `401`, `403`

### `PUT /api/vpn/devices`

Put Devices

**Request body**: `DevicesIn`

**Responses**: `200`, `401`, `403`, `422`

### `GET /api/vpn/install`

Install Command

**Responses**: `200`, `401`, `403`

### `PUT /api/vpn/servers/{key}`

Put Server

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `key` | path | string | yes |

**Request body**: `ServerIn`

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/vpn/servers/{key}/new-awg-params`

New Awg Params

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `key` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`

### `POST /api/vpn/servers/{key}/reset-pin`

Reset Pin

**Parameters**

| name | in | type | required |
| --- | --- | --- | --- |
| `key` | path | string | yes |

**Responses**: `200`, `401`, `403`, `422`


## License

### `GET /api/license`

Get License

**Responses**: `200`, `401`

### `POST /api/license/activate`

Activate

**Request body**: `ActivateBody`

**Responses**: `200`, `401`, `422`

### `POST /api/license/check`

Check Now

**Responses**: `200`, `401`

### `POST /api/license/dismiss-message`

Dismiss Message

**Responses**: `200`, `401`


## Other

### `GET /`

Base

**Responses**: `200`

