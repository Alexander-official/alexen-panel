import { u as useTranslation, g as useQuery, c as react, h as jsxs, ah as VStack, H as HStack, k as jsx, T as Text, o as Button, cm as PlusIcon, ai as Icon, bN as ArrowLongRightIcon, N as Box, F as UsersIcon, cv as ServerIcon, aN as LockClosedIcon, aC as GlobeAltIcon, W as useToast, bQ as ChevronDownIcon, az as Collapse, K as SimpleGrid, aa as Select, ak as Switch, a7 as Input, a9 as IconButton, V as TrashIcon, aj as Tooltip, cr as ExclamationTriangleIcon, ax as Fragment } from "./vendor.0404bf65.js";
import { b as formatBytes, f as fetch } from "./index.e0e646b5.js";
import { s as serverMessage } from "./serverMessage.7228cafd.js";
const LINK = (k) => k === "wg" || k === "awg";
const KIND_LABEL = {
  wg: "WireGuard",
  awg: "AmneziaWG",
  iptables: "iptables",
  xray: "Xray tunnel"
};
const card = {
  borderRadius: "20px",
  bg: "var(--app-surface)",
  boxShadow: "var(--alexen-shadow)",
  borderWidth: "1px",
  borderColor: "blackAlpha.50",
  _dark: {
    bg: "gray.750",
    borderColor: "var(--alexen-line)"
  }
};
const soft = {
  borderRadius: "14px",
  bg: "blackAlpha.50",
  _dark: {
    bg: "whiteAlpha.50"
  }
};
const tint = (c, p = 13) => ({
  background: `color-mix(in srgb, var(--chakra-colors-${c}-500) ${p}%, transparent)`
});
const linkUp = (t) => !!t.handshake && Date.now() / 1e3 - t.handshake < 180;
const portText = (f) => {
  const to = f.to_port || f.port;
  const p = f.proto === "both" ? "" : ` ${f.proto}`;
  return to === f.port ? `${f.port}${p}` : `${f.port} \u2192 ${to}${p}`;
};
const Node = ({
  icon,
  title,
  sub,
  tone = "primary",
  children
}) => /* @__PURE__ */ jsxs(VStack, {
  ...soft,
  spacing: 1,
  px: 4,
  py: 3,
  minW: "150px",
  maxW: "230px",
  align: "center",
  textAlign: "center",
  children: [/* @__PURE__ */ jsx(Box, {
    w: "36px",
    h: "36px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: `${tone}.500`,
    sx: tint(tone),
    children: /* @__PURE__ */ jsx(Icon, {
      as: icon,
      boxSize: "18px"
    })
  }), /* @__PURE__ */ jsx(Text, {
    fontSize: "sm",
    fontWeight: "semibold",
    noOfLines: 1,
    children: title
  }), sub && /* @__PURE__ */ jsx(Text, {
    fontSize: "xs",
    color: "gray.500",
    fontFamily: "mono",
    noOfLines: 1,
    title: sub,
    children: sub
  }), children]
});
const Wire = ({
  tone,
  children,
  dashed
}) => /* @__PURE__ */ jsxs(VStack, {
  flex: "1",
  minW: {
    base: "auto",
    md: "90px"
  },
  spacing: 1,
  align: "stretch",
  py: {
    base: 1,
    md: 0
  },
  children: [/* @__PURE__ */ jsxs(Box, {
    display: {
      base: "none",
      md: "flex"
    },
    alignItems: "center",
    children: [/* @__PURE__ */ jsx(Box, {
      flex: "1",
      borderTopWidth: "2px",
      borderStyle: dashed ? "dashed" : "solid",
      borderColor: `${tone}.400`
    }), /* @__PURE__ */ jsx(Icon, {
      as: ArrowLongRightIcon,
      boxSize: "18px",
      color: `${tone}.400`,
      ml: "-4px"
    })]
  }), /* @__PURE__ */ jsx(Box, {
    display: {
      base: "flex",
      md: "none"
    },
    justifyContent: "center",
    children: /* @__PURE__ */ jsx(Box, {
      h: "18px",
      borderLeftWidth: "2px",
      borderStyle: dashed ? "dashed" : "solid",
      borderColor: `${tone}.400`
    })
  }), /* @__PURE__ */ jsx(Box, {
    textAlign: "center",
    children
  })]
});
const Dot = ({
  ok
}) => /* @__PURE__ */ jsx(Box, {
  w: "8px",
  h: "8px",
  borderRadius: "full",
  bg: ok ? "green.400" : ok === false ? "red.400" : "gray.400"
});
const Diagram = ({
  data
}) => {
  const {
    t
  } = useTranslation();
  const by = (k) => data.servers.find((s) => s.key === k);
  if (!data.tunnels.length)
    return /* @__PURE__ */ jsxs(VStack, {
      ...card,
      py: 10,
      spacing: 3,
      color: "gray.500",
      children: [/* @__PURE__ */ jsx(Icon, {
        as: ArrowLongRightIcon,
        boxSize: "28px"
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        textAlign: "center",
        maxW: "420px",
        children: t("preroutePage.empty")
      })]
    });
  return /* @__PURE__ */ jsx(VStack, {
    ...card,
    p: {
      base: 4,
      md: 6
    },
    spacing: 5,
    align: "stretch",
    children: data.tunnels.map((tn) => {
      const r = by(tn.relay);
      const e = tn.exit ? by(tn.exit) : void 0;
      const link = LINK(tn.kind);
      const up = link ? linkUp(tn) : true;
      const tone = up ? "green" : "orange";
      const targets = Array.from(new Set(tn.forwarding.map((f) => f.to_addr || (e == null ? void 0 : e.address) || "")));
      const exitName = (e == null ? void 0 : e.name) || (targets.length === 1 ? targets[0] : t("preroutePage.customTargets", {
        n: targets.length
      }));
      return /* @__PURE__ */ jsxs(Box, {
        children: [/* @__PURE__ */ jsxs(Box, {
          display: "flex",
          flexDirection: {
            base: "column",
            md: "row"
          },
          alignItems: "center",
          children: [/* @__PURE__ */ jsx(Node, {
            icon: UsersIcon,
            title: t("preroutePage.users"),
            tone: "gray"
          }), /* @__PURE__ */ jsx(Wire, {
            tone: "primary",
            children: /* @__PURE__ */ jsxs(HStack, {
              spacing: 1,
              justify: "center",
              flexWrap: "wrap",
              rowGap: 1,
              children: [tn.forwarding.slice(0, 8).map((f) => /* @__PURE__ */ jsx(Text, {
                fontSize: "10px",
                fontFamily: "mono",
                px: 1.5,
                borderRadius: "6px",
                sx: tint("primary", 14),
                color: "primary.500",
                _dark: {
                  color: "primary.200"
                },
                children: f.port
              }, `${f.proto}${f.port}`)), tn.forwarding.length > 8 && /* @__PURE__ */ jsxs(Text, {
                fontSize: "10px",
                color: "gray.500",
                children: ["+", tn.forwarding.length - 8]
              })]
            })
          }), /* @__PURE__ */ jsx(Node, {
            icon: ServerIcon,
            title: (r == null ? void 0 : r.name) || tn.relay,
            sub: r == null ? void 0 : r.address,
            children: /* @__PURE__ */ jsxs(HStack, {
              spacing: 1.5,
              fontSize: "10px",
              color: "gray.500",
              children: [/* @__PURE__ */ jsx(Dot, {
                ok: r == null ? void 0 : r.agent.connected
              }), /* @__PURE__ */ jsx(Text, {
                children: t("preroutePage.relay")
              })]
            })
          }), /* @__PURE__ */ jsx(Wire, {
            tone,
            dashed: !up,
            children: /* @__PURE__ */ jsxs(VStack, {
              spacing: 0,
              children: [/* @__PURE__ */ jsxs(HStack, {
                spacing: 1,
                fontSize: "xs",
                fontWeight: "medium",
                color: `${tone}.500`,
                children: [link && /* @__PURE__ */ jsx(Icon, {
                  as: LockClosedIcon,
                  boxSize: "12px"
                }), /* @__PURE__ */ jsx(Text, {
                  children: KIND_LABEL[tn.kind]
                })]
              }), /* @__PURE__ */ jsx(Text, {
                fontSize: "10px",
                color: "gray.500",
                whiteSpace: "nowrap",
                children: !link ? t("preroutePage.noRealIp") : up ? `\u2193 ${formatBytes(tn.rx)} \u2191 ${formatBytes(tn.tx)}` : t("preroutePage.linkDown")
              })]
            })
          }), /* @__PURE__ */ jsx(Node, {
            icon: GlobeAltIcon,
            title: exitName,
            sub: (e == null ? void 0 : e.address) || (targets.length > 1 ? targets.join(", ") : void 0),
            tone: "green",
            children: /* @__PURE__ */ jsxs(HStack, {
              spacing: 1.5,
              fontSize: "10px",
              color: "gray.500",
              children: [link && /* @__PURE__ */ jsx(Dot, {
                ok: e == null ? void 0 : e.agent.connected
              }), /* @__PURE__ */ jsx(Text, {
                children: t("preroutePage.exit")
              })]
            })
          })]
        }), /* @__PURE__ */ jsx(HStack, {
          mt: 3,
          spacing: 1.5,
          flexWrap: "wrap",
          rowGap: 1.5,
          justify: "center",
          children: tn.forwarding.map((f) => /* @__PURE__ */ jsxs(Text, {
            fontSize: "xs",
            fontFamily: "mono",
            px: 2,
            py: 0.5,
            borderRadius: "8px",
            bg: "blackAlpha.50",
            _dark: {
              bg: "whiteAlpha.100"
            },
            children: [r == null ? void 0 : r.name, ":", portText(f), " \u2192 ", f.to_addr || (e == null ? void 0 : e.name)]
          }, `${f.proto}${f.port}m`))
        })]
      }, tn.id);
    })
  });
};
const RuleEditor = ({
  data,
  tunnel,
  onDone,
  startOpen
}) => {
  var _a, _b, _c;
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const fresh = () => {
    var _a2, _b2;
    return {
      relay: (tunnel == null ? void 0 : tunnel.relay) || ((_a2 = data.servers.find((s) => s.key !== "master")) == null ? void 0 : _a2.key) || "",
      exit: (tunnel == null ? void 0 : tunnel.exit) || "master",
      kind: (tunnel == null ? void 0 : tunnel.kind) || "wg",
      all_ports: tunnel ? tunnel.all_ports : true,
      forwards: ((_b2 = tunnel == null ? void 0 : tunnel.forwards) == null ? void 0 : _b2.map((f) => ({
        ...f,
        to_port: f.to_port || f.port,
        to_addr: f.to_addr || ""
      }))) || []
    };
  };
  const [d, setD] = react.exports.useState(fresh);
  const [open, setOpen] = react.exports.useState(!!startOpen);
  const [busy, setBusy] = react.exports.useState(false);
  react.exports.useEffect(() => setD(fresh()), [tunnel == null ? void 0 : tunnel.id, JSON.stringify(tunnel == null ? void 0 : tunnel.forwards), tunnel == null ? void 0 : tunnel.relay, tunnel == null ? void 0 : tunnel.exit, tunnel == null ? void 0 : tunnel.kind, tunnel == null ? void 0 : tunnel.all_ports]);
  const set = (p) => setD((x) => ({
    ...x,
    ...p
  }));
  const exitInbounds = ((_a = data.servers.find((s) => s.key === d.exit)) == null ? void 0 : _a.inbounds) || [];
  const name = (k) => {
    var _a2;
    return ((_a2 = data.servers.find((s) => s.key === k)) == null ? void 0 : _a2.name) || k;
  };
  const fail = (e) => {
    var _a2, _b2;
    return toast({
      title: serverMessage(t, (_b2 = (_a2 = e == null ? void 0 : e.response) == null ? void 0 : _a2._data) == null ? void 0 : _b2.detail) || t("errors.generic"),
      status: "error",
      position: "top",
      duration: 5e3
    });
  };
  const link = LINK(d.kind);
  const allPorts = d.all_ports && !!d.exit;
  const save = () => {
    setBusy(true);
    fetch(`/preroute/tunnels/${tunnel ? tunnel.id : "new"}`, {
      method: "PUT",
      body: {
        ...d,
        all_ports: allPorts,
        forwards: allPorts ? [] : d.forwards.map((f) => ({
          ...f,
          to_port: f.to_port || f.port,
          to_addr: link ? "" : (f.to_addr || "").trim()
        }))
      }
    }).then(() => {
      toast({
        title: t("preroutePage.saved"),
        status: "success",
        position: "top",
        duration: 3e3
      });
      onDone();
    }).catch(fail).finally(() => setBusy(false));
  };
  const remove = () => {
    if (!tunnel || !window.confirm(t("preroutePage.confirmDelete")))
      return;
    fetch(`/preroute/tunnels/${tunnel.id}`, {
      method: "DELETE"
    }).then(onDone).catch(fail);
  };
  const hosts = () => tunnel && fetch(`/preroute/tunnels/${tunnel.id}/hosts`, {
    method: "POST"
  }).then((r) => toast({
    title: t("preroutePage.hostsMade", {
      n: r.created
    }),
    status: "success",
    position: "top"
  })).catch(fail);
  const setFwd = (i, p) => set({
    forwards: d.forwards.map((f, n) => n === i ? {
      ...f,
      ...p
    } : f)
  });
  const relayAgent = (_b = data.servers.find((s) => s.key === d.relay)) == null ? void 0 : _b.agent;
  const exitAgent = (_c = data.servers.find((s) => s.key === d.exit)) == null ? void 0 : _c.agent;
  const agentMissing = d.kind === "xray" ? false : d.kind === "iptables" ? !(relayAgent == null ? void 0 : relayAgent.connected) : !(relayAgent == null ? void 0 : relayAgent.connected) || !(exitAgent == null ? void 0 : exitAgent.connected);
  return /* @__PURE__ */ jsxs(Box, {
    ...card,
    overflow: "hidden",
    children: [/* @__PURE__ */ jsxs(HStack, {
      px: 5,
      py: 3.5,
      spacing: 3,
      cursor: "pointer",
      onClick: () => setOpen((o) => !o),
      children: [/* @__PURE__ */ jsx(Text, {
        fontWeight: "semibold",
        fontSize: "sm",
        flex: "1",
        children: tunnel ? `${name(tunnel.relay)} \u2192 ${tunnel.exit ? name(tunnel.exit) : t("preroutePage.customTargets", {
          n: new Set(tunnel.forwards.map((f) => f.to_addr)).size
        })} \xB7 ${KIND_LABEL[tunnel.kind]}` : t("preroutePage.newRule")
      }), tunnel && LINK(tunnel.kind) && /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: linkUp(tunnel) ? "green.400" : "orange.400",
        children: linkUp(tunnel) ? t("preroutePage.linkUp") : t("preroutePage.linkDown")
      }), /* @__PURE__ */ jsx(Icon, {
        as: ChevronDownIcon,
        boxSize: "16px",
        transform: open ? "rotate(180deg)" : void 0,
        transition: "transform .2s"
      })]
    }), /* @__PURE__ */ jsx(Collapse, {
      in: open,
      animateOpacity: true,
      unmountOnExit: true,
      children: /* @__PURE__ */ jsxs(VStack, {
        align: "stretch",
        spacing: 4,
        px: 5,
        pb: 5,
        children: [/* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            mb: 1.5,
            children: t("preroutePage.mode")
          }), /* @__PURE__ */ jsx(SimpleGrid, {
            columns: {
              base: 1,
              sm: 2,
              lg: 4
            },
            spacing: 2,
            children: ["wg", "awg", "iptables", "xray"].map((k) => /* @__PURE__ */ jsxs(Box, {
              as: "button",
              type: "button",
              textAlign: "left",
              p: 3,
              borderRadius: "12px",
              borderWidth: "1.5px",
              borderColor: d.kind === k ? "primary.400" : "var(--tier-line)",
              bg: d.kind === k ? "color-mix(in srgb, var(--chakra-colors-primary-500) 12%, var(--tier-item))" : "var(--tier-item)",
              _hover: {
                bg: d.kind === k ? void 0 : "var(--tier-item-hover)"
              },
              onClick: () => {
                var _a2;
                return set({
                  kind: k,
                  ...LINK(k) && !d.exit ? {
                    exit: ((_a2 = data.servers.find((s) => s.key !== d.relay)) == null ? void 0 : _a2.key) || ""
                  } : {}
                });
              },
              children: [/* @__PURE__ */ jsx(Text, {
                fontSize: "sm",
                fontWeight: "semibold",
                children: KIND_LABEL[k]
              }), /* @__PURE__ */ jsx(Text, {
                fontSize: "xs",
                color: "gray.500",
                children: t(`preroutePage.modeHelp.${k}`)
              })]
            }, k))
          })]
        }), /* @__PURE__ */ jsxs(SimpleGrid, {
          columns: {
            base: 1,
            md: 2
          },
          spacing: 3,
          children: [/* @__PURE__ */ jsxs(Box, {
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "xs",
              color: "gray.500",
              mb: 1,
              children: t("preroutePage.relayVps")
            }), /* @__PURE__ */ jsx(Select, {
              size: "sm",
              borderRadius: "10px",
              value: d.relay,
              onChange: (e) => set({
                relay: e.target.value
              }),
              children: data.servers.map((s) => /* @__PURE__ */ jsxs("option", {
                value: s.key,
                children: [s.name, " \xB7 ", s.address]
              }, s.key))
            })]
          }), /* @__PURE__ */ jsxs(Box, {
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "xs",
              color: "gray.500",
              mb: 1,
              children: t("preroutePage.exitVps")
            }), /* @__PURE__ */ jsxs(Select, {
              size: "sm",
              borderRadius: "10px",
              value: d.exit,
              onChange: (e) => set({
                exit: e.target.value
              }),
              children: [!link && /* @__PURE__ */ jsx("option", {
                value: "",
                children: t("preroutePage.customTarget")
              }), data.servers.filter((s) => s.key !== d.relay).map((s) => /* @__PURE__ */ jsxs("option", {
                value: s.key,
                children: [s.name, " \xB7 ", s.address]
              }, s.key))]
            })]
          })]
        }), !!d.exit && /* @__PURE__ */ jsxs(HStack, {
          ...soft,
          p: 3,
          spacing: 3,
          children: [/* @__PURE__ */ jsx(Switch, {
            size: "sm",
            colorScheme: "primary",
            isChecked: d.all_ports,
            onChange: (e) => set({
              all_ports: e.target.checked
            })
          }), /* @__PURE__ */ jsxs(Box, {
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              children: t("preroutePage.allPorts")
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "xs",
              color: "gray.500",
              children: t("preroutePage.allPortsHelp")
            })]
          })]
        }), !allPorts && /* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            mb: 2,
            children: t("preroutePage.ports")
          }), /* @__PURE__ */ jsxs(VStack, {
            align: "stretch",
            spacing: 2,
            children: [d.forwards.map((f, i) => {
              var _a2;
              return /* @__PURE__ */ jsxs(HStack, {
                spacing: 2,
                flexWrap: "wrap",
                rowGap: 2,
                children: [/* @__PURE__ */ jsx(Text, {
                  fontSize: "xs",
                  color: "gray.500",
                  w: "70px",
                  isTruncated: true,
                  children: name(d.relay)
                }), /* @__PURE__ */ jsx(Input, {
                  size: "sm",
                  w: "90px",
                  borderRadius: "10px",
                  fontFamily: "mono",
                  value: f.port || "",
                  onChange: (e) => setFwd(i, {
                    port: Number(e.target.value.replace(/\D/g, "")) || 0
                  })
                }), /* @__PURE__ */ jsxs(Select, {
                  size: "sm",
                  w: "90px",
                  borderRadius: "10px",
                  value: f.proto,
                  onChange: (e) => setFwd(i, {
                    proto: e.target.value
                  }),
                  children: [/* @__PURE__ */ jsx("option", {
                    value: "both",
                    children: "TCP+UDP"
                  }), /* @__PURE__ */ jsx("option", {
                    value: "tcp",
                    children: "TCP"
                  }), /* @__PURE__ */ jsx("option", {
                    value: "udp",
                    children: "UDP"
                  })]
                }), /* @__PURE__ */ jsx(Icon, {
                  as: ArrowLongRightIcon,
                  boxSize: "18px",
                  color: "gray.400"
                }), link ? /* @__PURE__ */ jsx(Text, {
                  fontSize: "xs",
                  color: "gray.500",
                  w: "70px",
                  isTruncated: true,
                  children: name(d.exit)
                }) : /* @__PURE__ */ jsx(Input, {
                  size: "sm",
                  w: "170px",
                  borderRadius: "10px",
                  fontFamily: "mono",
                  placeholder: d.exit ? (_a2 = data.servers.find((s) => s.key === d.exit)) == null ? void 0 : _a2.address : t("preroutePage.targetIp"),
                  value: f.to_addr || "",
                  onChange: (e) => setFwd(i, {
                    to_addr: e.target.value.trim()
                  })
                }), /* @__PURE__ */ jsx(Text, {
                  color: "gray.400",
                  children: ":"
                }), /* @__PURE__ */ jsx(Input, {
                  size: "sm",
                  w: "90px",
                  borderRadius: "10px",
                  fontFamily: "mono",
                  value: f.to_port || "",
                  onChange: (e) => setFwd(i, {
                    to_port: Number(e.target.value.replace(/\D/g, "")) || null
                  })
                }), /* @__PURE__ */ jsx(IconButton, {
                  size: "sm",
                  variant: "ghost",
                  "aria-label": "remove",
                  icon: /* @__PURE__ */ jsx(TrashIcon, {
                    width: 14
                  }),
                  onClick: () => set({
                    forwards: d.forwards.filter((_, n) => n !== i)
                  })
                })]
              }, i);
            }), /* @__PURE__ */ jsxs(HStack, {
              spacing: 1.5,
              flexWrap: "wrap",
              rowGap: 1.5,
              children: [/* @__PURE__ */ jsx(Button, {
                size: "xs",
                variant: "ghost",
                leftIcon: /* @__PURE__ */ jsx(PlusIcon, {
                  width: 12
                }),
                onClick: () => set({
                  forwards: [...d.forwards, {
                    proto: "both",
                    port: 0,
                    to_port: null
                  }]
                }),
                children: t("preroutePage.addPort")
              }), exitInbounds.filter((ib) => !d.forwards.some((f) => (f.to_port || f.port) === ib.port)).map((ib) => /* @__PURE__ */ jsx(Tooltip, {
                label: `${ib.protocol} \xB7 ${ib.proto.toUpperCase()}`,
                hasArrow: true,
                children: /* @__PURE__ */ jsxs(Button, {
                  size: "xs",
                  variant: "outline",
                  borderRadius: "full",
                  onClick: () => set({
                    forwards: [...d.forwards, {
                      proto: ib.proto,
                      port: ib.port,
                      to_port: ib.port
                    }]
                  }),
                  children: ["+ ", ib.tag, " :", ib.port]
                })
              }, ib.tag + ib.port))]
            })]
          })]
        }), agentMissing && /* @__PURE__ */ jsxs(HStack, {
          ...soft,
          p: 3,
          spacing: 2,
          align: "flex-start",
          color: "orange.400",
          children: [/* @__PURE__ */ jsx(Icon, {
            as: ExclamationTriangleIcon,
            boxSize: "16px",
            mt: 0.5,
            flexShrink: 0
          }), /* @__PURE__ */ jsxs(Text, {
            fontSize: "xs",
            children: [t("preroutePage.needAgent"), " ", /* @__PURE__ */ jsx(Text, {
              as: "a",
              href: "#/vpn/",
              color: "primary.500",
              textDecoration: "underline",
              children: t("vpn.title")
            })]
          })]
        }), /* @__PURE__ */ jsxs(HStack, {
          justify: "space-between",
          flexWrap: "wrap",
          rowGap: 2,
          children: [/* @__PURE__ */ jsxs(HStack, {
            children: [tunnel && /* @__PURE__ */ jsx(Button, {
              size: "sm",
              variant: "ghost",
              colorScheme: "red",
              leftIcon: /* @__PURE__ */ jsx(TrashIcon, {
                width: 14
              }),
              onClick: remove,
              children: t("preroutePage.delete")
            }), tunnel && !!tunnel.exit && /* @__PURE__ */ jsx(Tooltip, {
              label: t("preroute.hostsHelp"),
              hasArrow: true,
              children: /* @__PURE__ */ jsx(Button, {
                size: "sm",
                variant: "outline",
                onClick: hosts,
                children: t("preroute.makeHosts")
              })
            })]
          }), /* @__PURE__ */ jsx(Button, {
            size: "sm",
            colorScheme: "primary",
            isLoading: busy,
            onClick: save,
            isDisabled: !d.relay || link && !d.exit || d.relay === d.exit,
            children: t("preroutePage.save")
          })]
        })]
      })
    })]
  });
};
const FromHosts = ({
  data,
  onDone,
  onClose
}) => {
  var _a, _b, _c, _d, _e;
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const {
    data: hosts
  } = useQuery({
    queryKey: "preroute-hosts",
    queryFn: () => fetch("/hosts")
  });
  const [tag, setTag] = react.exports.useState("");
  const [relay, setRelay] = react.exports.useState(((_a = data.servers.find((s) => s.key !== "master")) == null ? void 0 : _a.key) || ((_b = data.servers[0]) == null ? void 0 : _b.key) || "");
  const [kind, setKind] = react.exports.useState("iptables");
  const [start, setStart] = react.exports.useState(0);
  const [custom, setCustom] = react.exports.useState(false);
  const [ports, setPorts] = react.exports.useState({});
  const [picked, setPicked] = react.exports.useState({});
  const [makeHosts, setMakeHosts] = react.exports.useState(true);
  const [busy, setBusy] = react.exports.useState(false);
  const tags = Object.keys(hosts || {}).filter((k) => (hosts[k] || []).length);
  const list = tag && (hosts == null ? void 0 : hosts[tag]) || [];
  const inboundPort = ((_c = data.servers.flatMap((s) => s.inbounds).find((ib) => ib.tag === tag)) == null ? void 0 : _c.port) || 0;
  const proto = ((_d = data.servers.flatMap((s) => s.inbounds).find((ib) => ib.tag === tag)) == null ? void 0 : _d.proto) || "tcp";
  react.exports.useEffect(() => {
    setPicked(Object.fromEntries(list.map((_, i) => [i, true])));
    setStart(inboundPort ? inboundPort + 1 : 0);
    setPorts({});
  }, [tag, hosts]);
  const target = (h) => (h.address || "").split(",")[0].trim();
  const usable = (h) => !!target(h) && !/[{}*]/.test(target(h));
  const chosen = list.map((h, i) => ({
    h,
    i
  })).filter(({
    h,
    i
  }) => picked[i] && usable(h));
  const relayPort = (i, n) => custom ? ports[i] || 0 : start ? start + n : 0;
  const relayAddr = ((_e = data.servers.find((s) => s.key === relay)) == null ? void 0 : _e.address) || "";
  const ok = !!tag && !!relay && chosen.length > 0 && chosen.every(({
    i
  }, n) => relayPort(i, n) > 0);
  const go = async () => {
    var _a2, _b2, _c2;
    setBusy(true);
    try {
      const forwards = chosen.map(({
        h,
        i
      }, n) => ({
        proto: proto === "udp" ? "udp" : "both",
        port: relayPort(i, n),
        to_port: h.port || inboundPort,
        to_addr: target(h)
      }));
      await fetch("/preroute/tunnels/new", {
        method: "PUT",
        body: {
          relay,
          exit: "",
          kind,
          all_ports: false,
          forwards
        }
      });
      if (makeHosts) {
        const all = await fetch("/hosts");
        const relayName = ((_a2 = data.servers.find((s) => s.key === relay)) == null ? void 0 : _a2.name) || relay;
        const copies = chosen.map(({
          h,
          i
        }, n) => {
          const {
            id,
            ...rest
          } = h;
          return {
            ...rest,
            address: relayAddr,
            port: relayPort(i, n),
            remark: `${h.remark} (${relayName})`
          };
        });
        await fetch("/hosts", {
          method: "PUT",
          body: {
            ...all,
            [tag]: [...all[tag] || [], ...copies]
          }
        });
      }
      toast({
        title: t("preroutePage.bulkDone", {
          n: chosen.length
        }),
        status: "success",
        position: "top",
        duration: 3500
      });
      onDone();
    } catch (e) {
      toast({
        title: serverMessage(t, (_c2 = (_b2 = e == null ? void 0 : e.response) == null ? void 0 : _b2._data) == null ? void 0 : _c2.detail) || t("errors.generic"),
        status: "error",
        position: "top",
        duration: 6e3
      });
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsxs(Box, {
    ...card,
    p: 5,
    children: [/* @__PURE__ */ jsxs(HStack, {
      justify: "space-between",
      mb: 1,
      children: [/* @__PURE__ */ jsx(Text, {
        fontWeight: "semibold",
        fontSize: "sm",
        children: t("preroutePage.bulkTitle")
      }), /* @__PURE__ */ jsx(Button, {
        size: "xs",
        variant: "ghost",
        onClick: onClose,
        children: t("cancel")
      })]
    }), /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      mb: 4,
      children: t("preroutePage.bulkHelp")
    }), /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        md: 3
      },
      spacing: 3,
      mb: 3,
      children: [/* @__PURE__ */ jsxs(Box, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          mb: 1,
          children: t("preroutePage.bulkInbound")
        }), /* @__PURE__ */ jsx(Select, {
          size: "sm",
          borderRadius: "10px",
          value: tag,
          onChange: (e) => setTag(e.target.value),
          placeholder: "\u2014",
          children: tags.map((k) => /* @__PURE__ */ jsxs("option", {
            value: k,
            children: [k, " \xB7 ", t("groups.hostCount", {
              count: hosts[k].length
            })]
          }, k))
        })]
      }), /* @__PURE__ */ jsxs(Box, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          mb: 1,
          children: t("preroutePage.relayVps")
        }), /* @__PURE__ */ jsx(Select, {
          size: "sm",
          borderRadius: "10px",
          value: relay,
          onChange: (e) => setRelay(e.target.value),
          children: data.servers.map((s) => /* @__PURE__ */ jsxs("option", {
            value: s.key,
            children: [s.name, " \xB7 ", s.address]
          }, s.key))
        })]
      }), /* @__PURE__ */ jsxs(Box, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          mb: 1,
          children: t("preroutePage.mode")
        }), /* @__PURE__ */ jsxs(Select, {
          size: "sm",
          borderRadius: "10px",
          value: kind,
          onChange: (e) => setKind(e.target.value),
          children: [/* @__PURE__ */ jsx("option", {
            value: "iptables",
            children: KIND_LABEL.iptables
          }), /* @__PURE__ */ jsx("option", {
            value: "xray",
            children: KIND_LABEL.xray
          })]
        })]
      })]
    }), tag && /* @__PURE__ */ jsxs(Fragment, {
      children: [/* @__PURE__ */ jsxs(HStack, {
        spacing: 3,
        mb: 3,
        flexWrap: "wrap",
        rowGap: 2,
        children: [/* @__PURE__ */ jsxs(HStack, {
          ...soft,
          px: 3,
          py: 2,
          spacing: 2,
          children: [/* @__PURE__ */ jsx(Switch, {
            size: "sm",
            colorScheme: "primary",
            isChecked: custom,
            onChange: (e) => setCustom(e.target.checked)
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "sm",
            children: t("preroutePage.bulkCustom")
          })]
        }), !custom && /* @__PURE__ */ jsxs(HStack, {
          spacing: 2,
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            children: t("preroutePage.bulkStart")
          }), /* @__PURE__ */ jsx(Input, {
            size: "sm",
            w: "100px",
            borderRadius: "10px",
            fontFamily: "mono",
            value: start || "",
            onChange: (e) => setStart(Number(e.target.value.replace(/\D/g, "")) || 0)
          })]
        })]
      }), /* @__PURE__ */ jsx(VStack, {
        align: "stretch",
        spacing: 1.5,
        mb: 3,
        children: list.map((h, i) => {
          var _a2;
          const n = chosen.findIndex((c) => c.i === i);
          return /* @__PURE__ */ jsxs(HStack, {
            ...soft,
            px: 3,
            py: 2,
            spacing: 3,
            opacity: usable(h) ? 1 : 0.5,
            children: [/* @__PURE__ */ jsx(Switch, {
              size: "sm",
              colorScheme: "primary",
              isDisabled: !usable(h),
              isChecked: !!picked[i] && usable(h),
              onChange: (e) => setPicked({
                ...picked,
                [i]: e.target.checked
              })
            }), /* @__PURE__ */ jsxs(Box, {
              flex: "1",
              minW: 0,
              children: [/* @__PURE__ */ jsx(Text, {
                fontSize: "sm",
                isTruncated: true,
                children: h.remark
              }), /* @__PURE__ */ jsx(Text, {
                fontSize: "xs",
                color: "gray.500",
                fontFamily: "mono",
                isTruncated: true,
                children: usable(h) ? `${target(h)}:${h.port || inboundPort}` : t("preroutePage.bulkNoIp")
              })]
            }), picked[i] && usable(h) && /* @__PURE__ */ jsxs(HStack, {
              spacing: 1.5,
              fontFamily: "mono",
              fontSize: "xs",
              children: [/* @__PURE__ */ jsxs(Text, {
                color: "gray.500",
                children: [(_a2 = data.servers.find((s) => s.key === relay)) == null ? void 0 : _a2.name, ":"]
              }), custom ? /* @__PURE__ */ jsx(Input, {
                size: "xs",
                w: "80px",
                borderRadius: "8px",
                value: ports[i] || "",
                onChange: (e) => setPorts({
                  ...ports,
                  [i]: Number(e.target.value.replace(/\D/g, "")) || 0
                })
              }) : /* @__PURE__ */ jsx(Text, {
                fontWeight: "semibold",
                children: relayPort(i, n) || "\u2014"
              }), /* @__PURE__ */ jsx(Icon, {
                as: ArrowLongRightIcon,
                boxSize: "14px",
                color: "gray.400"
              }), /* @__PURE__ */ jsx(Text, {
                children: h.port || inboundPort
              })]
            })]
          }, i);
        })
      }), /* @__PURE__ */ jsxs(HStack, {
        justify: "space-between",
        flexWrap: "wrap",
        rowGap: 2,
        children: [/* @__PURE__ */ jsxs(HStack, {
          spacing: 2,
          children: [/* @__PURE__ */ jsx(Switch, {
            size: "sm",
            colorScheme: "primary",
            isChecked: makeHosts,
            onChange: (e) => setMakeHosts(e.target.checked)
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "sm",
            children: t("preroutePage.bulkHosts", {
              address: relayAddr
            })
          })]
        }), /* @__PURE__ */ jsx(Button, {
          size: "sm",
          colorScheme: "primary",
          isLoading: busy,
          isDisabled: !ok,
          onClick: go,
          children: t("preroutePage.bulkCreate", {
            n: chosen.length
          })
        })]
      })]
    })]
  });
};
const PreroutePage = () => {
  const {
    t
  } = useTranslation();
  const {
    data,
    refetch
  } = useQuery({
    queryKey: "preroute",
    queryFn: () => fetch("/preroute"),
    refetchInterval: 8e3
  });
  const [adding, setAdding] = react.exports.useState(false);
  const [bulk, setBulk] = react.exports.useState(false);
  if (!data)
    return null;
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 5,
    maxW: "1150px",
    children: [/* @__PURE__ */ jsxs(HStack, {
      spacing: 4,
      flexWrap: "wrap",
      rowGap: 3,
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        color: "gray.500",
        flex: "1",
        minW: "260px",
        children: t("preroutePage.help")
      }), /* @__PURE__ */ jsx(Button, {
        size: "sm",
        variant: "outline",
        onClick: () => setBulk(true),
        isDisabled: bulk,
        children: t("preroutePage.bulkButton")
      }), /* @__PURE__ */ jsx(Button, {
        size: "sm",
        colorScheme: "primary",
        leftIcon: /* @__PURE__ */ jsx(PlusIcon, {
          width: 16
        }),
        onClick: () => setAdding(true),
        isDisabled: adding,
        children: t("preroutePage.addRule")
      })]
    }), /* @__PURE__ */ jsx(Diagram, {
      data
    }), bulk && /* @__PURE__ */ jsx(FromHosts, {
      data,
      onClose: () => setBulk(false),
      onDone: () => {
        setBulk(false);
        refetch();
      }
    }), adding && /* @__PURE__ */ jsx(RuleEditor, {
      data,
      startOpen: true,
      onDone: () => {
        setAdding(false);
        refetch();
      }
    }), data.tunnels.map((tn) => /* @__PURE__ */ jsx(RuleEditor, {
      data,
      tunnel: tn,
      onDone: () => refetch()
    }, tn.id))]
  });
};
export {
  PreroutePage
};
