import { u as useCoresQuery, M as MAIN_CORE, f as fetchCoreConfig, s as saveCoreConfig, F as FetchCoresQueryKey } from "./CoreSettingsContext.ae7a60ef.js";
import { f as fetch, w as fetchInbounds } from "./index.e0e646b5.js";
import { O as create, u as useTranslation, h as jsxs, N as Box, k as jsx, T as Text, H as HStack, o as Button, g as useQuery, W as useToast, cn as useQueryClient, c as react, M as Modal, l as ModalOverlay, m as ModalContent, n as ModalHeader, p as ModalCloseButton, q as ModalBody, ah as VStack, aa as Select, K as SimpleGrid, a7 as Input, Y as ModalFooter, b3 as FormControl, b4 as FormLabel, bK as Alert, bL as AlertIcon, ak as Switch, aj as Tooltip, a9 as IconButton, a1 as ArrowPathIcon } from "./vendor.0404bf65.js";
const useHosts = create((set) => ({
  isLoading: false,
  isPostLoading: false,
  hosts: {},
  fetchHosts: () => {
    set({
      isLoading: true
    });
    fetch("/hosts").then((hosts) => set({
      hosts
    })).finally(() => set({
      isLoading: false
    }));
  },
  setHosts: (body) => {
    set({
      isPostLoading: true
    });
    return fetch("/hosts", {
      method: "PUT",
      body
    }).finally(() => {
      set({
        isPostLoading: false
      });
    });
  }
}));
const useGroupNames = () => useQuery({
  queryKey: "host-group-names",
  queryFn: () => fetch("/groups").then((d) => d.groups.map((g) => g.name)),
  refetchOnWindowFocus: false
});
const splitGroups = (v) => (v || "").split(",").map((x) => x.trim()).filter(Boolean);
const HostGroupPicker = ({
  value,
  onChange
}) => {
  const {
    t
  } = useTranslation();
  const {
    data: all
  } = useGroupNames();
  const selected = splitGroups(value);
  const names = [...all || [], ...selected.filter((g) => !(all || []).includes(g))];
  return /* @__PURE__ */ jsxs(Box, {
    children: [/* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      opacity: 0.75,
      mb: 1,
      children: t("hostsDialog.groups")
    }), names.length === 0 ? /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      children: t("hostsDialog.noGroups")
    }) : /* @__PURE__ */ jsx(HStack, {
      spacing: 1.5,
      flexWrap: "wrap",
      rowGap: 1.5,
      children: names.map((g) => {
        const on = selected.includes(g);
        return /* @__PURE__ */ jsx(Button, {
          size: "xs",
          borderRadius: "full",
          colorScheme: "primary",
          variant: on ? "solid" : "outline",
          onClick: () => {
            const next = on ? selected.filter((x) => x !== g) : [...selected, g];
            onChange(next.length ? next.join(", ") : null);
          },
          children: g
        }, g);
      })
    })]
  });
};
const INBOUND_PROTOCOLS = [
  "vless",
  "vmess",
  "trojan",
  "shadowsocks",
  "hysteria",
  "tunnel",
  "socks",
  "http"
];
const TRANSPORTS = ["tcp", "ws", "grpc", "xhttp", "httpupgrade", "kcp"];
const USER_PROTOCOLS = ["vless", "vmess", "trojan", "shadowsocks", "hysteria"];
const defaultInboundOptions = () => ({
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
  routeTo: ""
});
const transportsFor = (p) => {
  if (p === "vless" || p === "vmess" || p === "trojan")
    return [...TRANSPORTS];
  return [];
};
const securitiesFor = (p, n) => {
  if (p === "hysteria")
    return ["tls"];
  if (!transportsFor(p).length)
    return ["none"];
  const list = ["none", "tls"];
  if ((p === "vless" || p === "trojan") && ["tcp", "grpc", "xhttp"].includes(n))
    list.push("reality");
  return list;
};
const split = (v) => v.split(",").map((x) => x.trim()).filter(Boolean);
const randomHex = (bytes) => Array.from(crypto.getRandomValues(new Uint8Array(bytes))).map((b) => b.toString(16).padStart(2, "0")).join("");
const suggestTag = (o) => {
  const name = { tunnel: "Tunnel", socks: "SOCKS", http: "HTTP", hysteria: "Hysteria2", shadowsocks: "Shadowsocks" }[o.protocol] || o.protocol.toUpperCase();
  const parts = [name];
  if (transportsFor(o.protocol).length)
    parts.push(o.network.toUpperCase());
  if (o.security !== "none" && o.protocol !== "hysteria")
    parts.push(o.security.toUpperCase());
  if (o.port)
    parts.push(String(o.port));
  return parts.join(" ");
};
const buildInbound = (o) => {
  const inbound = {
    tag: o.tag.trim() || suggestTag(o),
    listen: o.listen.trim() || "0.0.0.0",
    port: Number(o.port),
    protocol: o.protocol,
    settings: {}
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
      inbound.protocol = "dokodemo-door";
      inbound.settings = {
        address: o.tunnelAddress.trim(),
        port: Number(o.tunnelPort),
        network: o.tunnelNetwork,
        followRedirect: o.followRedirect
      };
      break;
    case "socks":
      inbound.settings = o.authUser ? { auth: "password", accounts: [{ user: o.authUser, pass: o.authPass }], udp: true } : { auth: "noauth", udp: true };
      break;
    case "http":
      inbound.settings = o.authUser ? { accounts: [{ user: o.authUser, pass: o.authPass }] } : {};
      break;
  }
  const stream = {};
  if (o.protocol === "hysteria") {
    stream.network = "hysteria";
    stream.hysteriaSettings = { version: 2 };
    if (o.obfsPassword)
      stream.finalmask = { udp: [{ type: "salamander", settings: { password: o.obfsPassword } }] };
  } else if (transportsFor(o.protocol).length) {
    stream.network = o.network;
    const host = o.host.trim();
    switch (o.network) {
      case "tcp":
        if (o.tcpHttpHeader && o.security === "none")
          stream.tcpSettings = {
            header: {
              type: "http",
              request: { path: [o.path || "/"], headers: host ? { Host: split(host) } : {} }
            }
          };
        break;
      case "ws":
        stream.wsSettings = { path: o.path || "/", ...host ? { host } : {} };
        break;
      case "grpc":
        stream.grpcSettings = { serviceName: o.serviceName };
        break;
      case "xhttp":
        stream.xhttpSettings = { path: o.path || "/", mode: o.xhttpMode, ...host ? { host } : {} };
        break;
      case "httpupgrade":
        stream.httpupgradeSettings = { path: o.path || "/", ...host ? { host } : {} };
        break;
      case "kcp":
        stream.kcpSettings = {};
        break;
    }
  }
  const security = securitiesFor(o.protocol, o.network).includes(o.security) ? o.security : securitiesFor(o.protocol, o.network)[0];
  if (security === "tls") {
    stream.security = "tls";
    stream.tlsSettings = {
      ...o.serverName ? { serverName: o.serverName.trim() } : {},
      alpn: o.protocol === "hysteria" ? ["h3"] : split(o.alpn),
      certificates: [{ certificateFile: o.certFile.trim(), keyFile: o.keyFile.trim() }]
    };
  } else if (security === "reality") {
    stream.security = "reality";
    stream.realitySettings = {
      show: false,
      dest: o.realityTarget.trim(),
      xver: 0,
      serverNames: split(o.realityServerNames),
      privateKey: o.realityPrivateKey.trim(),
      shortIds: split(o.realityShortId)
    };
  }
  if (Object.keys(stream).length)
    inbound.streamSettings = stream;
  if (o.sniffing && o.protocol !== "tunnel")
    inbound.sniffing = { enabled: true, destOverride: ["http", "tls", "quic"] };
  return inbound;
};
const validateInbound = (o, config) => {
  const errors = [];
  const tag = o.tag.trim() || suggestTag(o);
  const port = Number(o.port);
  if (!port || port < 1 || port > 65535)
    errors.push("port");
  if (tag.includes(","))
    errors.push("tagComma");
  if (((config == null ? void 0 : config.inbounds) || []).some((i) => i.tag === tag))
    errors.push("tagExists");
  if (o.protocol === "tunnel" && (!o.tunnelAddress.trim() || !Number(o.tunnelPort)))
    errors.push("tunnelTarget");
  const sec = securitiesFor(o.protocol, o.network).includes(o.security) ? o.security : securitiesFor(o.protocol, o.network)[0];
  if (sec === "tls" && (!o.certFile.trim() || !o.keyFile.trim()))
    errors.push("tlsCert");
  if (sec === "reality" && (!o.realityPrivateKey.trim() || !split(o.realityShortId).length || !o.realityTarget.trim()))
    errors.push("reality");
  return errors;
};
const portUsers = (config, port, listen = "0.0.0.0") => {
  if (!port)
    return [];
  const wild = (l) => !l || l === "0.0.0.0" || l === "::";
  return ((config == null ? void 0 : config.inbounds) || []).filter((i) => Number(i.port) === Number(port) && (wild(i.listen) || wild(listen) || i.listen === listen)).map((i) => i.tag);
};
const knownCertificates = (config) => {
  var _a, _b;
  const seen = /* @__PURE__ */ new Map();
  for (const i of (config == null ? void 0 : config.inbounds) || [])
    for (const c of ((_b = (_a = i == null ? void 0 : i.streamSettings) == null ? void 0 : _a.tlsSettings) == null ? void 0 : _b.certificates) || [])
      if (c.certificateFile && c.keyFile)
        seen.set(c.certificateFile, { certFile: c.certificateFile, keyFile: c.keyFile });
  return [...seen.values()];
};
const addInboundToConfig = (config, o) => {
  const next = JSON.parse(JSON.stringify(config || {}));
  const inbound = buildInbound(o);
  next.inbounds = [...next.inbounds || [], inbound];
  if (o.routeTo) {
    next.routing = next.routing || {};
    const rule = { type: "field", inboundTag: [inbound.tag], outboundTag: o.routeTo };
    next.routing.rules = [rule, ...next.routing.rules || []];
  }
  return { config: next, inbound };
};
const PROTOCOL_LABELS = {
  vless: "VLESS",
  vmess: "VMess",
  trojan: "Trojan",
  shadowsocks: "Shadowsocks",
  hysteria: "Hysteria2",
  tunnel: "Tunnel (dokodemo-door)",
  socks: "SOCKS5",
  http: "HTTP proxy"
};
const TRANSPORT_LABELS = {
  tcp: "TCP (raw)",
  ws: "WebSocket",
  grpc: "gRPC",
  xhttp: "XHTTP",
  httpupgrade: "HTTPUpgrade",
  kcp: "mKCP"
};
const Field = ({
  label,
  help,
  children
}) => /* @__PURE__ */ jsxs(FormControl, {
  children: [/* @__PURE__ */ jsx(FormLabel, {
    fontSize: "xs",
    mb: 1,
    opacity: 0.8,
    children: label
  }), children, help && /* @__PURE__ */ jsx(Text, {
    fontSize: "xs",
    color: "gray.500",
    mt: 1,
    children: help
  })]
});
const InboundBuilderForm = ({
  value: o,
  onChange,
  config
}) => {
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const set = (patch) => onChange({
    ...o,
    ...patch
  });
  const transports = transportsFor(o.protocol);
  const securities = securitiesFor(o.protocol, o.network);
  const security = securities.includes(o.security) ? o.security : securities[0];
  const clash = portUsers(config, o.port, o.listen);
  const certs = react.exports.useMemo(() => knownCertificates(config), [config]);
  const outbounds = ((config == null ? void 0 : config.outbounds) || []).map((x) => x.tag).filter(Boolean);
  const hasPath = ["ws", "xhttp", "httpupgrade"].includes(o.network) || o.network === "tcp" && o.tcpHttpHeader && security === "none";
  const [generating, setGenerating] = react.exports.useState(false);
  react.exports.useEffect(() => {
    if (security === "tls" && !o.certFile && certs[0])
      set(certs[0]);
  }, [security]);
  react.exports.useEffect(() => {
    if (security === "reality" && !o.realityPrivateKey && !generating)
      generateKeys();
  }, [security]);
  const generateKeys = () => {
    setGenerating(true);
    fetch("/core/x25519").then((k) => set({
      realityPrivateKey: k.private_key,
      realityPublicKey: k.public_key,
      realityShortId: o.realityShortId || randomHex(8)
    })).catch(() => toast({
      title: t("inboundBuilder.keysFailed"),
      status: "error",
      position: "top"
    })).finally(() => setGenerating(false));
  };
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 3,
    children: [/* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        sm: 2
      },
      spacing: 3,
      children: [/* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.protocol"),
        children: /* @__PURE__ */ jsx(Select, {
          size: "sm",
          value: o.protocol,
          onChange: (e) => set({
            protocol: e.target.value
          }),
          children: INBOUND_PROTOCOLS.map((p) => /* @__PURE__ */ jsx("option", {
            value: p,
            children: PROTOCOL_LABELS[p]
          }, p))
        })
      }), transports.length > 0 && /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.transport"),
        children: /* @__PURE__ */ jsx(Select, {
          size: "sm",
          value: o.network,
          onChange: (e) => set({
            network: e.target.value
          }),
          children: transports.map((n) => /* @__PURE__ */ jsx("option", {
            value: n,
            children: TRANSPORT_LABELS[n]
          }, n))
        })
      }), securities.length > 1 && /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.security"),
        children: /* @__PURE__ */ jsx(Select, {
          size: "sm",
          value: security,
          onChange: (e) => set({
            security: e.target.value
          }),
          children: securities.map((s) => /* @__PURE__ */ jsx("option", {
            value: s,
            children: s === "none" ? t("inboundBuilder.none") : s.toUpperCase()
          }, s))
        })
      }), /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.port"),
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          type: "number",
          placeholder: "443",
          value: o.port,
          onChange: (e) => set({
            port: e.target.value === "" ? "" : Number(e.target.value)
          })
        })
      }), /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.tag"),
        help: t("inboundBuilder.tagHelp"),
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          placeholder: suggestTag(o),
          value: o.tag,
          onChange: (e) => set({
            tag: e.target.value
          })
        })
      }), /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.listen"),
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          value: o.listen,
          onChange: (e) => set({
            listen: e.target.value
          })
        })
      })]
    }), clash.length > 0 && /* @__PURE__ */ jsxs(Alert, {
      status: "warning",
      borderRadius: "md",
      py: 2,
      fontSize: "sm",
      children: [/* @__PURE__ */ jsx(AlertIcon, {}), t("inboundBuilder.portClash", {
        port: o.port,
        tags: clash.join(", ")
      })]
    }), transports.length > 0 && /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        sm: 2
      },
      spacing: 3,
      children: [o.network === "tcp" && security === "none" && /* @__PURE__ */ jsxs(HStack, {
        gridColumn: "1 / -1",
        children: [/* @__PURE__ */ jsx(Switch, {
          size: "sm",
          isChecked: o.tcpHttpHeader,
          onChange: (e) => set({
            tcpHttpHeader: e.target.checked
          })
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          children: t("inboundBuilder.httpHeader")
        })]
      }), hasPath && /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.path"),
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          value: o.path,
          onChange: (e) => set({
            path: e.target.value
          })
        })
      }), hasPath && /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.host"),
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          placeholder: "example.com",
          value: o.host,
          onChange: (e) => set({
            host: e.target.value
          })
        })
      }), o.network === "grpc" && /* @__PURE__ */ jsx(Field, {
        label: "serviceName",
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          value: o.serviceName,
          onChange: (e) => set({
            serviceName: e.target.value
          })
        })
      }), o.network === "xhttp" && /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.xhttpMode"),
        children: /* @__PURE__ */ jsx(Select, {
          size: "sm",
          value: o.xhttpMode,
          onChange: (e) => set({
            xhttpMode: e.target.value
          }),
          children: ["auto", "packet-up", "stream-up", "stream-one"].map((m) => /* @__PURE__ */ jsx("option", {
            value: m,
            children: m
          }, m))
        })
      })]
    }), security === "tls" && /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        sm: 2
      },
      spacing: 3,
      children: [certs.length > 1 && /* @__PURE__ */ jsx(Box, {
        gridColumn: "1 / -1",
        children: /* @__PURE__ */ jsx(Field, {
          label: t("inboundBuilder.knownCert"),
          children: /* @__PURE__ */ jsx(Select, {
            size: "sm",
            value: o.certFile,
            onChange: (e) => {
              const c = certs.find((x) => x.certFile === e.target.value);
              if (c)
                set(c);
            },
            children: certs.map((c) => /* @__PURE__ */ jsx("option", {
              value: c.certFile,
              children: c.certFile
            }, c.certFile))
          })
        })
      }), /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.certFile"),
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          placeholder: "/var/lib/marzban/certs/fullchain.pem",
          value: o.certFile,
          onChange: (e) => set({
            certFile: e.target.value
          })
        })
      }), /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.keyFile"),
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          placeholder: "/var/lib/marzban/certs/key.pem",
          value: o.keyFile,
          onChange: (e) => set({
            keyFile: e.target.value
          })
        })
      }), o.protocol !== "hysteria" && /* @__PURE__ */ jsx(Field, {
        label: "ALPN",
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          value: o.alpn,
          onChange: (e) => set({
            alpn: e.target.value
          })
        })
      }), /* @__PURE__ */ jsx(Field, {
        label: "SNI (serverName)",
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          placeholder: t("inboundBuilder.optional"),
          value: o.serverName,
          onChange: (e) => set({
            serverName: e.target.value
          })
        })
      })]
    }), security === "reality" && /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        sm: 2
      },
      spacing: 3,
      children: [/* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.realityTarget"),
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          value: o.realityTarget,
          onChange: (e) => set({
            realityTarget: e.target.value
          })
        })
      }), /* @__PURE__ */ jsx(Field, {
        label: "serverNames",
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          value: o.realityServerNames,
          onChange: (e) => set({
            realityServerNames: e.target.value
          })
        })
      }), /* @__PURE__ */ jsx(Box, {
        gridColumn: "1 / -1",
        children: /* @__PURE__ */ jsx(Field, {
          label: "privateKey",
          help: o.realityPublicKey ? `publicKey: ${o.realityPublicKey}` : void 0,
          children: /* @__PURE__ */ jsxs(HStack, {
            children: [/* @__PURE__ */ jsx(Input, {
              size: "sm",
              fontFamily: "mono",
              value: o.realityPrivateKey,
              onChange: (e) => set({
                realityPrivateKey: e.target.value,
                realityPublicKey: ""
              })
            }), /* @__PURE__ */ jsx(Tooltip, {
              label: t("inboundBuilder.generateKeys"),
              children: /* @__PURE__ */ jsx(IconButton, {
                size: "sm",
                "aria-label": "generate",
                icon: /* @__PURE__ */ jsx(ArrowPathIcon, {
                  width: 16
                }),
                isLoading: generating,
                onClick: generateKeys
              })
            })]
          })
        })
      }), /* @__PURE__ */ jsx(Field, {
        label: "shortIds",
        children: /* @__PURE__ */ jsxs(HStack, {
          children: [/* @__PURE__ */ jsx(Input, {
            size: "sm",
            fontFamily: "mono",
            value: o.realityShortId,
            onChange: (e) => set({
              realityShortId: e.target.value
            })
          }), /* @__PURE__ */ jsx(IconButton, {
            size: "sm",
            "aria-label": "random",
            icon: /* @__PURE__ */ jsx(ArrowPathIcon, {
              width: 16
            }),
            onClick: () => set({
              realityShortId: randomHex(8)
            })
          })]
        })
      })]
    }), o.protocol === "hysteria" && /* @__PURE__ */ jsx(Field, {
      label: t("inboundBuilder.obfs"),
      help: t("inboundBuilder.obfsHelp"),
      children: /* @__PURE__ */ jsxs(HStack, {
        children: [/* @__PURE__ */ jsx(Input, {
          size: "sm",
          value: o.obfsPassword,
          onChange: (e) => set({
            obfsPassword: e.target.value
          })
        }), /* @__PURE__ */ jsx(IconButton, {
          size: "sm",
          "aria-label": "random",
          icon: /* @__PURE__ */ jsx(ArrowPathIcon, {
            width: 16
          }),
          onClick: () => set({
            obfsPassword: randomHex(8)
          })
        })]
      })
    }), o.protocol === "tunnel" && /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        sm: 3
      },
      spacing: 3,
      children: [/* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.tunnelAddress"),
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          placeholder: "1.2.3.4",
          value: o.tunnelAddress,
          onChange: (e) => set({
            tunnelAddress: e.target.value
          })
        })
      }), /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.tunnelPort"),
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          type: "number",
          placeholder: "443",
          value: o.tunnelPort,
          onChange: (e) => set({
            tunnelPort: e.target.value === "" ? "" : Number(e.target.value)
          })
        })
      }), /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.network"),
        children: /* @__PURE__ */ jsxs(Select, {
          size: "sm",
          value: o.tunnelNetwork,
          onChange: (e) => set({
            tunnelNetwork: e.target.value
          }),
          children: [/* @__PURE__ */ jsx("option", {
            value: "tcp,udp",
            children: "TCP + UDP"
          }), /* @__PURE__ */ jsx("option", {
            value: "tcp",
            children: "TCP"
          }), /* @__PURE__ */ jsx("option", {
            value: "udp",
            children: "UDP"
          })]
        })
      }), /* @__PURE__ */ jsxs(HStack, {
        gridColumn: "1 / -1",
        children: [/* @__PURE__ */ jsx(Switch, {
          size: "sm",
          isChecked: o.followRedirect,
          onChange: (e) => set({
            followRedirect: e.target.checked
          })
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          children: "followRedirect"
        })]
      })]
    }), (o.protocol === "socks" || o.protocol === "http") && /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        sm: 2
      },
      spacing: 3,
      children: [/* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.authUser"),
        help: t("inboundBuilder.authHelp"),
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          value: o.authUser,
          onChange: (e) => set({
            authUser: e.target.value
          })
        })
      }), /* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.authPass"),
        children: /* @__PURE__ */ jsx(Input, {
          size: "sm",
          value: o.authPass,
          onChange: (e) => set({
            authPass: e.target.value
          })
        })
      })]
    }), /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        sm: 2
      },
      spacing: 3,
      children: [/* @__PURE__ */ jsx(Field, {
        label: t("inboundBuilder.routeTo"),
        help: t("inboundBuilder.routeToHelp"),
        children: /* @__PURE__ */ jsxs(Select, {
          size: "sm",
          value: o.routeTo,
          onChange: (e) => set({
            routeTo: e.target.value
          }),
          children: [/* @__PURE__ */ jsx("option", {
            value: "",
            children: t("inboundBuilder.noRule")
          }), outbounds.map((tag) => /* @__PURE__ */ jsx("option", {
            value: tag,
            children: tag
          }, tag))]
        })
      }), o.protocol !== "tunnel" && /* @__PURE__ */ jsxs(HStack, {
        alignSelf: "center",
        children: [/* @__PURE__ */ jsx(Switch, {
          size: "sm",
          isChecked: o.sniffing,
          onChange: (e) => set({
            sniffing: e.target.checked
          })
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          children: t("inboundBuilder.sniffing")
        })]
      })]
    }), !USER_PROTOCOLS.includes(o.protocol) && /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      children: t("inboundBuilder.noUsersNote")
    })]
  });
};
const inboundErrorText = (t, errors) => errors.map((e) => t(`inboundBuilder.error.${e}`)).join(" \xB7 ");
const AddHostModal = ({
  isOpen,
  onClose
}) => {
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const {
    data: cores
  } = useCoresQuery();
  const {
    fetchHosts
  } = useHosts();
  const [coreId, setCoreId] = react.exports.useState(MAIN_CORE);
  const [config, setConfig] = react.exports.useState(null);
  const [opts, setOpts] = react.exports.useState(defaultInboundOptions());
  const [remark, setRemark] = react.exports.useState("");
  const [address, setAddress] = react.exports.useState("");
  const [groups, setGroups] = react.exports.useState(null);
  const [saving, setSaving] = react.exports.useState(false);
  const [showJson, setShowJson] = react.exports.useState(false);
  react.exports.useEffect(() => {
    if (!isOpen)
      return;
    setConfig(null);
    fetchCoreConfig(coreId).then(setConfig);
  }, [isOpen, coreId]);
  react.exports.useEffect(() => {
    if (isOpen) {
      setOpts(defaultInboundOptions());
      setRemark("");
      setAddress("");
      setGroups(null);
      setShowJson(false);
    }
  }, [isOpen]);
  const errors = config ? validateInbound(opts, config) : [];
  const isUserInbound = USER_PROTOCOLS.includes(opts.protocol);
  const submit = async () => {
    var _a, _b, _c, _d;
    if (!config || errors.length)
      return;
    setSaving(true);
    try {
      const fresh = await fetchCoreConfig(coreId);
      const {
        config: next,
        inbound
      } = addInboundToConfig(fresh, opts);
      await saveCoreConfig(coreId, next);
      if (isUserInbound && (remark.trim() || address.trim() || groups)) {
        const hosts = await fetch("/hosts");
        const current = (hosts == null ? void 0 : hosts[inbound.tag]) || [];
        const host = {
          ...current[0] || {},
          remark: remark.trim() || ((_a = current[0]) == null ? void 0 : _a.remark) || "\u{1F680} Marz ({USERNAME}) [{PROTOCOL} - {TRANSPORT}]",
          address: address.trim() || ((_b = current[0]) == null ? void 0 : _b.address) || "{SERVER_IP}",
          port: coreId === MAIN_CORE ? null : inbound.port,
          group_name: groups
        };
        await fetch("/hosts", {
          method: "PUT",
          body: {
            [inbound.tag]: [host]
          }
        });
      }
      toast({
        title: t("inboundBuilder.added", {
          tag: inbound.tag
        }),
        status: "success",
        position: "top",
        duration: 3e3
      });
      queryClient.invalidateQueries(FetchCoresQueryKey);
      fetchHosts();
      fetchInbounds();
      onClose();
    } catch (e) {
      toast({
        title: ((_d = (_c = e == null ? void 0 : e.response) == null ? void 0 : _c._data) == null ? void 0 : _d.detail) || t("core.generalErrorMessage"),
        status: "error",
        position: "top",
        duration: 5e3
      });
    } finally {
      setSaving(false);
    }
  };
  return /* @__PURE__ */ jsxs(Modal, {
    isOpen,
    onClose,
    size: "2xl",
    scrollBehavior: "inside",
    children: [/* @__PURE__ */ jsx(ModalOverlay, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent, {
      mx: "3",
      children: [/* @__PURE__ */ jsx(ModalHeader, {
        fontSize: "lg",
        children: t("inboundBuilder.addHostTitle")
      }), /* @__PURE__ */ jsx(ModalCloseButton, {}), /* @__PURE__ */ jsx(ModalBody, {
        children: /* @__PURE__ */ jsxs(VStack, {
          align: "stretch",
          spacing: 4,
          children: [cores && cores.length > 1 && /* @__PURE__ */ jsx(Field, {
            label: t("cores.core"),
            help: t("inboundBuilder.coreHelp"),
            children: /* @__PURE__ */ jsx(Select, {
              size: "sm",
              value: coreId,
              onChange: (e) => setCoreId(e.target.value),
              children: cores.map((c) => /* @__PURE__ */ jsx("option", {
                value: c.id,
                children: c.id === MAIN_CORE ? t("cores.main") : c.name
              }, c.id))
            })
          }), /* @__PURE__ */ jsx(InboundBuilderForm, {
            value: opts,
            onChange: setOpts,
            config
          }), isUserInbound && /* @__PURE__ */ jsxs(SimpleGrid, {
            columns: {
              base: 1,
              sm: 2
            },
            spacing: 3,
            children: [/* @__PURE__ */ jsx(Field, {
              label: t("inboundBuilder.hostRemark"),
              children: /* @__PURE__ */ jsx(Input, {
                size: "sm",
                placeholder: "\u{1F680} {USERNAME} [{PROTOCOL} - {TRANSPORT}]",
                value: remark,
                onChange: (e) => setRemark(e.target.value)
              })
            }), /* @__PURE__ */ jsx(Field, {
              label: t("inboundBuilder.hostAddress"),
              help: t("inboundBuilder.hostAddressHelp"),
              children: /* @__PURE__ */ jsx(Input, {
                size: "sm",
                placeholder: "{SERVER_IP}",
                value: address,
                onChange: (e) => setAddress(e.target.value)
              })
            })]
          }), isUserInbound && /* @__PURE__ */ jsx(HostGroupPicker, {
            value: groups,
            onChange: setGroups
          }), /* @__PURE__ */ jsxs(Box, {
            children: [/* @__PURE__ */ jsx(Button, {
              size: "xs",
              variant: "ghost",
              onClick: () => setShowJson(!showJson),
              children: t(showJson ? "inboundBuilder.hideJson" : "inboundBuilder.showJson")
            }), showJson && /* @__PURE__ */ jsx(Box, {
              as: "pre",
              fontSize: "xs",
              p: 3,
              mt: 1,
              borderRadius: "md",
              bg: "var(--app-surface-2)",
              _dark: {
                bg: "gray.750"
              },
              maxH: "260px",
              overflow: "auto",
              children: JSON.stringify(buildInbound(opts), null, 2)
            })]
          })]
        })
      }), /* @__PURE__ */ jsxs(ModalFooter, {
        gap: 3,
        children: [errors.length > 0 && /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "red.400",
          flex: 1,
          children: inboundErrorText(t, errors)
        }), /* @__PURE__ */ jsx(Button, {
          size: "sm",
          colorScheme: "primary",
          onClick: submit,
          isLoading: saving,
          isDisabled: !config || errors.length > 0,
          children: t("inboundBuilder.add")
        })]
      })]
    })]
  });
};
export {
  AddHostModal as A,
  HostGroupPicker as H,
  InboundBuilderForm as I,
  addInboundToConfig as a,
  defaultInboundOptions as d,
  inboundErrorText as i,
  useHosts as u,
  validateInbound as v
};
