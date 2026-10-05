// Builds Xray inbound JSON from a few choices (protocol, transport, security...),
// used by "Add host" and the core settings inbound list.

export const INBOUND_PROTOCOLS = [
  "vless",
  "vmess",
  "trojan",
  "shadowsocks",
  "hysteria",
  "tunnel",
  "socks",
  "http",
] as const;
export type InboundProtocol = (typeof INBOUND_PROTOCOLS)[number];

export const TRANSPORTS = ["tcp", "ws", "grpc", "xhttp", "httpupgrade", "kcp"] as const;
export type Transport = (typeof TRANSPORTS)[number];

export type Security = "none" | "tls" | "reality";

// protocols users get accounts on; the others (tunnel, socks, http) are plain
// listeners, e.g. a tunnel that forwards a port to another server
export const USER_PROTOCOLS: InboundProtocol[] = ["vless", "vmess", "trojan", "shadowsocks", "hysteria"];

export type InboundOptions = {
  protocol: InboundProtocol;
  tag: string;
  listen: string;
  port: number | "";
  network: Transport;
  security: Security;
  // transport
  path: string;
  host: string;
  serviceName: string;
  xhttpMode: "auto" | "packet-up" | "stream-up" | "stream-one";
  tcpHttpHeader: boolean;
  // tls
  certFile: string;
  keyFile: string;
  serverName: string;
  alpn: string;
  // reality
  realityTarget: string;
  realityServerNames: string;
  realityPrivateKey: string;
  realityPublicKey: string;
  realityShortId: string;
  // hysteria
  obfsPassword: string;
  // tunnel
  tunnelAddress: string;
  tunnelPort: number | "";
  tunnelNetwork: "tcp" | "udp" | "tcp,udp";
  followRedirect: boolean;
  // socks / http
  authUser: string;
  authPass: string;
  sniffing: boolean;
  // add a routing rule sending this inbound's traffic to an outbound
  routeTo: string;
};

export const defaultInboundOptions = (): InboundOptions => ({
  protocol: "vless",
  tag: "",
  listen: "0.0.0.0",
  port: "",
  network: "tcp",
  security: "none",
  path: "/",
  host: "",
  serviceName: "grpc",
  xhttpMode: "auto",
  tcpHttpHeader: false,
  certFile: "",
  keyFile: "",
  serverName: "",
  alpn: "h2,http/1.1",
  realityTarget: "www.google.com:443",
  realityServerNames: "www.google.com",
  realityPrivateKey: "",
  realityPublicKey: "",
  realityShortId: "",
  obfsPassword: "",
  tunnelAddress: "",
  tunnelPort: "",
  tunnelNetwork: "tcp,udp",
  followRedirect: false,
  authUser: "",
  authPass: "",
  sniffing: true,
  routeTo: "",
});

// which transports / securities make sense for a protocol
export const transportsFor = (p: InboundProtocol): Transport[] => {
  if (p === "vless" || p === "vmess" || p === "trojan") return [...TRANSPORTS];
  return [];
};

export const securitiesFor = (p: InboundProtocol, n: Transport): Security[] => {
  if (p === "hysteria") return ["tls"];
  if (!transportsFor(p).length) return ["none"];
  const list: Security[] = ["none", "tls"];
  if ((p === "vless" || p === "trojan") && ["tcp", "grpc", "xhttp"].includes(n)) list.push("reality");
  return list;
};

const split = (v: string) =>
  v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

export const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

export const suggestTag = (o: InboundOptions) => {
  const name = { tunnel: "Tunnel", socks: "SOCKS", http: "HTTP", hysteria: "Hysteria2", shadowsocks: "Shadowsocks" }[
    o.protocol as string
  ] || o.protocol.toUpperCase();
  const parts = [name];
  if (transportsFor(o.protocol).length) parts.push(o.network.toUpperCase());
  if (o.security !== "none" && o.protocol !== "hysteria") parts.push(o.security.toUpperCase());
  if (o.port) parts.push(String(o.port));
  return parts.join(" ");
};

export const buildInbound = (o: InboundOptions): any => {
  const inbound: any = {
    tag: o.tag.trim() || suggestTag(o),
    listen: o.listen.trim() || "0.0.0.0",
    port: Number(o.port),
    protocol: o.protocol,
    settings: {},
  };

  switch (o.protocol) {
    case "vless":
      inbound.settings = { clients: [], decryption: "none" };
      break;
    case "vmess":
    case "trojan":
      inbound.settings = { clients: [] };
      break;
    case "shadowsocks":
      inbound.settings = { clients: [], network: "tcp,udp" };
      break;
    case "hysteria":
      inbound.settings = { version: 2, clients: [] };
      break;
    case "tunnel":
      // "dokodemo-door" is the name every Xray version knows ("tunnel" only in new ones)
      inbound.protocol = "dokodemo-door";
      inbound.settings = {
        address: o.tunnelAddress.trim(),
        port: Number(o.tunnelPort),
        network: o.tunnelNetwork,
        followRedirect: o.followRedirect,
      };
      break;
    case "socks":
      inbound.settings = o.authUser
        ? { auth: "password", accounts: [{ user: o.authUser, pass: o.authPass }], udp: true }
        : { auth: "noauth", udp: true };
      break;
    case "http":
      inbound.settings = o.authUser ? { accounts: [{ user: o.authUser, pass: o.authPass }] } : {};
      break;
  }

  const stream: any = {};
  if (o.protocol === "hysteria") {
    stream.network = "hysteria";
    stream.hysteriaSettings = { version: 2 };
    if (o.obfsPassword) stream.finalmask = { udp: [{ type: "salamander", settings: { password: o.obfsPassword } }] };
  } else if (transportsFor(o.protocol).length) {
    stream.network = o.network;
    const host = o.host.trim();
    switch (o.network) {
      case "tcp":
        if (o.tcpHttpHeader && o.security === "none")
          stream.tcpSettings = {
            header: {
              type: "http",
              request: { path: [o.path || "/"], headers: host ? { Host: split(host) } : {} },
            },
          };
        break;
      case "ws":
        stream.wsSettings = { path: o.path || "/", ...(host ? { host } : {}) };
        break;
      case "grpc":
        stream.grpcSettings = { serviceName: o.serviceName };
        break;
      case "xhttp":
        stream.xhttpSettings = { path: o.path || "/", mode: o.xhttpMode, ...(host ? { host } : {}) };
        break;
      case "httpupgrade":
        stream.httpupgradeSettings = { path: o.path || "/", ...(host ? { host } : {}) };
        break;
      case "kcp":
        // header/seed moved to finalmask in Xray 26, plain mKCP works everywhere
        stream.kcpSettings = {};
        break;
    }
  }

  const security = securitiesFor(o.protocol, o.network).includes(o.security)
    ? o.security
    : securitiesFor(o.protocol, o.network)[0];
  if (security === "tls") {
    stream.security = "tls";
    stream.tlsSettings = {
      ...(o.serverName ? { serverName: o.serverName.trim() } : {}),
      alpn: o.protocol === "hysteria" ? ["h3"] : split(o.alpn),
      certificates: [{ certificateFile: o.certFile.trim(), keyFile: o.keyFile.trim() }],
    };
  } else if (security === "reality") {
    stream.security = "reality";
    stream.realitySettings = {
      show: false,
      dest: o.realityTarget.trim(),
      xver: 0,
      serverNames: split(o.realityServerNames),
      privateKey: o.realityPrivateKey.trim(),
      shortIds: split(o.realityShortId),
    };
  }

  if (Object.keys(stream).length) inbound.streamSettings = stream;
  if (o.sniffing && o.protocol !== "tunnel")
    inbound.sniffing = { enabled: true, destOverride: ["http", "tls", "quic"] };
  return inbound;
};

// problems that would make Xray or the panel reject the inbound
export const validateInbound = (o: InboundOptions, config: any): string[] => {
  const errors: string[] = [];
  const tag = o.tag.trim() || suggestTag(o);
  const port = Number(o.port);
  if (!port || port < 1 || port > 65535) errors.push("port");
  if (tag.includes(",")) errors.push("tagComma");
  if ((config?.inbounds || []).some((i: any) => i.tag === tag)) errors.push("tagExists");
  if (o.protocol === "tunnel" && (!o.tunnelAddress.trim() || !Number(o.tunnelPort))) errors.push("tunnelTarget");
  const sec = securitiesFor(o.protocol, o.network).includes(o.security) ? o.security : securitiesFor(o.protocol, o.network)[0];
  if (sec === "tls" && (!o.certFile.trim() || !o.keyFile.trim())) errors.push("tlsCert");
  if (sec === "reality" && (!o.realityPrivateKey.trim() || !split(o.realityShortId).length || !o.realityTarget.trim()))
    errors.push("reality");
  return errors;
};

// inbounds of the config already listening on this port (same listen address or a wildcard)
export const portUsers = (config: any, port: number | "", listen = "0.0.0.0"): string[] => {
  if (!port) return [];
  const wild = (l?: string) => !l || l === "0.0.0.0" || l === "::";
  return (config?.inbounds || [])
    .filter((i: any) => Number(i.port) === Number(port) && (wild(i.listen) || wild(listen) || i.listen === listen))
    .map((i: any) => i.tag);
};

// cert/key files already used by the config's TLS inbounds, to prefill new ones
export const knownCertificates = (config: any): { certFile: string; keyFile: string }[] => {
  const seen = new Map<string, { certFile: string; keyFile: string }>();
  for (const i of config?.inbounds || [])
    for (const c of i?.streamSettings?.tlsSettings?.certificates || [])
      if (c.certificateFile && c.keyFile) seen.set(c.certificateFile, { certFile: c.certificateFile, keyFile: c.keyFile });
  return [...seen.values()];
};

// adds the inbound (and its routing rule) to a config, returns the new config
export const addInboundToConfig = (config: any, o: InboundOptions) => {
  const next = JSON.parse(JSON.stringify(config || {}));
  const inbound = buildInbound(o);
  next.inbounds = [...(next.inbounds || []), inbound];
  if (o.routeTo) {
    next.routing = next.routing || {};
    const rule = { type: "field", inboundTag: [inbound.tag], outboundTag: o.routeTo };
    next.routing.rules = [rule, ...(next.routing.rules || [])];
  }
  return { config: next, inbound };
};
