import { u as useTranslation, g as useQuery, h as jsxs, ah as VStack, k as jsx, T as Text, W as useToast, c as react, N as Box, H as HStack, ai as Icon, aN as LockClosedIcon, ak as Switch, cr as ExclamationTriangleIcon, cq as CheckCircleIcon, cv as ServerIcon, F as UsersIcon, K as SimpleGrid, a7 as Input, o as Button, bQ as ChevronDownIcon, aj as Tooltip, cw as SparklesIcon, az as Collapse, aa as Select, a1 as ArrowPathIcon, b2 as NumberInput, bb as NumberInputField, cx as SignalSlashIcon, cy as useClipboard, cl as Code, a9 as IconButton, bR as CheckIcon, bP as ClipboardIcon } from "./vendor.0404bf65.js";
import { f as fetch } from "./index.e0e646b5.js";
import { s as serverMessage } from "./serverMessage.7228cafd.js";
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
const PARAMS = [["jc", "Jc"], ["jmin", "Jmin"], ["jmax", "Jmax"], ["s1", "S1"], ["s2", "S2"], ["h1", "H1"], ["h2", "H2"], ["h3", "H3"], ["h4", "H4"]];
const F = ({
  label,
  children,
  help
}) => /* @__PURE__ */ jsxs(Box, {
  children: [/* @__PURE__ */ jsx(Text, {
    fontSize: "xs",
    color: "gray.500",
    mb: 1,
    children: label
  }), children, help && /* @__PURE__ */ jsx(Text, {
    fontSize: "xs",
    color: "gray.500",
    mt: 1,
    children: help
  })]
});
const Num = ({
  value,
  onChange,
  min = 0,
  max
}) => /* @__PURE__ */ jsx(NumberInput, {
  size: "sm",
  min,
  max,
  value,
  onChange: (_, n) => onChange(Number.isNaN(n) ? min : n),
  children: /* @__PURE__ */ jsx(NumberInputField, {
    borderRadius: "10px",
    fontFamily: "mono"
  })
});
const Status = ({
  s
}) => {
  const {
    t
  } = useTranslation();
  const st = s.state || {};
  const on = s.awg.enabled || s.ovpn.enabled;
  let tone = "gray";
  let icon = SignalSlashIcon;
  let label = t("vpn.off");
  if (st.connected) {
    tone = st.error ? "orange" : "green";
    icon = st.error ? ExclamationTriangleIcon : CheckCircleIcon;
    label = t("vpn.agentOk", {
      version: st.version || ""
    });
  } else if (on || st.error) {
    tone = "red";
    icon = SignalSlashIcon;
    label = t("vpn.agentDown");
  }
  return /* @__PURE__ */ jsxs(HStack, {
    spacing: 1.5,
    px: 2.5,
    h: "24px",
    borderRadius: "full",
    fontSize: "xs",
    fontWeight: "medium",
    color: `${tone}.500`,
    sx: {
      background: `color-mix(in srgb, var(--chakra-colors-${tone}-500) 14%, transparent)`
    },
    whiteSpace: "nowrap",
    children: [/* @__PURE__ */ jsx(Icon, {
      as: icon,
      boxSize: "14px"
    }), /* @__PURE__ */ jsx(Text, {
      as: "span",
      children: label
    })]
  });
};
const Install = ({
  s
}) => {
  const {
    t
  } = useTranslation();
  const {
    data
  } = useQuery({
    queryKey: "vpn-install",
    queryFn: () => fetch("/vpn/install")
  });
  const command = data ? data.command + (s.agent_port !== 62060 ? ` ${s.agent_port}` : "") : "";
  const {
    onCopy,
    hasCopied,
    setValue
  } = useClipboard("");
  react.exports.useEffect(() => setValue(command), [command]);
  return /* @__PURE__ */ jsxs(Box, {
    ...soft,
    p: 4,
    children: [/* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      fontWeight: "medium",
      mb: 1,
      children: t("vpn.installTitle")
    }), /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      mb: 3,
      children: s.key === "master" ? t("vpn.installMaster") : t("vpn.installNode", {
        address: s.default_agent_address || "?"
      })
    }), /* @__PURE__ */ jsxs(HStack, {
      align: "flex-start",
      children: [/* @__PURE__ */ jsx(Code, {
        fontSize: "xs",
        p: 3,
        borderRadius: "10px",
        flex: "1",
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        maxH: "110px",
        overflowY: "auto",
        children: command || "\u2026"
      }), /* @__PURE__ */ jsx(Tooltip, {
        label: hasCopied ? t("domain.copied") : t("domain.copy"),
        hasArrow: true,
        children: /* @__PURE__ */ jsx(IconButton, {
          size: "sm",
          "aria-label": "copy",
          icon: hasCopied ? /* @__PURE__ */ jsx(CheckIcon, {
            width: 16
          }) : /* @__PURE__ */ jsx(ClipboardIcon, {
            width: 16
          }),
          onClick: onCopy
        })
      })]
    }), /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      mt: 2,
      children: t("vpn.installAfter", {
        port: s.agent_port
      })
    })]
  });
};
const ServerCard = ({
  s,
  onSaved
}) => {
  var _a, _b;
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const initial = () => ({
    agent_port: s.agent_port,
    agent_address: s.agent_address,
    public_address: s.public_address,
    awg: s.awg,
    ovpn: s.ovpn
  });
  const [form, setForm] = react.exports.useState(initial);
  const [dirty, setDirty] = react.exports.useState(false);
  const [saving, setSaving] = react.exports.useState(false);
  const [showConn, setShowConn] = react.exports.useState(false);
  const [showObf, setShowObf] = react.exports.useState(false);
  react.exports.useEffect(() => {
    if (!dirty)
      setForm(initial());
  }, [s]);
  const set = (p) => {
    setForm((f) => ({
      ...f,
      ...p
    }));
    setDirty(true);
  };
  const setAwg = (p) => set({
    awg: {
      ...form.awg,
      ...p
    }
  });
  const setOvpn = (p) => set({
    ovpn: {
      ...form.ovpn,
      ...p
    }
  });
  const st = s.state || {};
  const fail = (e) => {
    var _a2, _b2;
    return toast({
      title: serverMessage(t, (_b2 = (_a2 = e == null ? void 0 : e.response) == null ? void 0 : _a2._data) == null ? void 0 : _b2.detail) || (e == null ? void 0 : e.message) || t("errors.generic"),
      status: "error",
      position: "top",
      duration: 4500
    });
  };
  const save = () => {
    setSaving(true);
    fetch(`/vpn/servers/${s.key}`, {
      method: "PUT",
      body: form
    }).then(() => {
      setDirty(false);
      onSaved();
      toast({
        title: t("vpn.saved"),
        status: "success",
        position: "top",
        duration: 2500
      });
    }).catch(fail).finally(() => setSaving(false));
  };
  const randomize = () => fetch(`/vpn/servers/${s.key}/new-awg-params`, {
    method: "POST"
  }).then((p) => {
    setAwg({
      params: p
    });
    setShowObf(true);
  });
  const resetPin = () => fetch(`/vpn/servers/${s.key}/reset-pin`, {
    method: "POST"
  }).then(() => {
    onSaved();
    toast({
      title: t("vpn.pinReset"),
      status: "info",
      position: "top",
      duration: 2500
    });
  });
  const dns = (v) => v.split(/[\s,]+/).filter(Boolean);
  return /* @__PURE__ */ jsxs(Box, {
    ...card,
    p: {
      base: 4,
      md: 5
    },
    children: [/* @__PURE__ */ jsxs(HStack, {
      spacing: 3,
      mb: 4,
      flexWrap: "wrap",
      rowGap: 2,
      children: [/* @__PURE__ */ jsx(Box, {
        w: "36px",
        h: "36px",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "primary.500",
        sx: {
          background: "color-mix(in srgb, var(--chakra-colors-primary-500) 13%, transparent)"
        },
        children: /* @__PURE__ */ jsx(Icon, {
          as: ServerIcon,
          boxSize: "18px"
        })
      }), /* @__PURE__ */ jsxs(Box, {
        flex: "1",
        minW: "160px",
        children: [/* @__PURE__ */ jsx(Text, {
          fontWeight: "semibold",
          children: s.name
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          children: form.public_address || s.default_public_address || "\u2014"
        })]
      }), st.connected && /* @__PURE__ */ jsxs(HStack, {
        spacing: 1,
        fontSize: "xs",
        color: "gray.500",
        children: [/* @__PURE__ */ jsx(Icon, {
          as: UsersIcon,
          boxSize: "14px"
        }), /* @__PURE__ */ jsx(Text, {
          children: t("vpn.online", {
            n: st.online || 0
          })
        })]
      }), /* @__PURE__ */ jsx(Status, {
        s
      })]
    }), st.error && /* @__PURE__ */ jsxs(HStack, {
      ...soft,
      p: 3,
      mb: 4,
      spacing: 2,
      align: "flex-start",
      color: "orange.400",
      children: [/* @__PURE__ */ jsx(Icon, {
        as: ExclamationTriangleIcon,
        boxSize: "16px",
        mt: 0.5,
        flexShrink: 0
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        children: serverMessage(t, st.error)
      })]
    }), s.warnings.map((w) => /* @__PURE__ */ jsxs(HStack, {
      ...soft,
      p: 3,
      mb: 3,
      spacing: 2,
      align: "flex-start",
      color: "orange.400",
      children: [/* @__PURE__ */ jsx(Icon, {
        as: ExclamationTriangleIcon,
        boxSize: "16px",
        mt: 0.5,
        flexShrink: 0
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        children: w
      })]
    }, w)), !st.connected && (form.awg.enabled || form.ovpn.enabled || s.key !== "master") && /* @__PURE__ */ jsx(Box, {
      mb: 4,
      children: /* @__PURE__ */ jsx(Install, {
        s
      })
    }), /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        lg: 2
      },
      spacing: 4,
      children: [/* @__PURE__ */ jsxs(Box, {
        ...soft,
        p: 4,
        children: [/* @__PURE__ */ jsxs(HStack, {
          mb: 3,
          children: [/* @__PURE__ */ jsx(Switch, {
            colorScheme: "primary",
            isChecked: form.awg.enabled,
            onChange: (e) => setAwg({
              enabled: e.target.checked
            })
          }), /* @__PURE__ */ jsx(Text, {
            fontWeight: "semibold",
            flex: "1",
            children: "AmneziaWG"
          }), ((_a = st.awg) == null ? void 0 : _a.running) && /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "green.400",
            children: t("vpn.peers", {
              n: st.awg.peers
            })
          })]
        }), /* @__PURE__ */ jsxs(SimpleGrid, {
          columns: 3,
          spacing: 3,
          children: [/* @__PURE__ */ jsx(F, {
            label: t("vpn.port") + " (UDP)",
            children: /* @__PURE__ */ jsx(Num, {
              value: form.awg.port,
              min: 1,
              max: 65535,
              onChange: (port) => setAwg({
                port
              })
            })
          }), /* @__PURE__ */ jsx(F, {
            label: "MTU",
            children: /* @__PURE__ */ jsx(Num, {
              value: form.awg.mtu,
              min: 1200,
              max: 1500,
              onChange: (mtu) => setAwg({
                mtu
              })
            })
          }), /* @__PURE__ */ jsx(F, {
            label: "Keepalive",
            children: /* @__PURE__ */ jsx(Num, {
              value: form.awg.keepalive,
              min: 0,
              max: 300,
              onChange: (keepalive) => setAwg({
                keepalive
              })
            })
          })]
        }), /* @__PURE__ */ jsxs(SimpleGrid, {
          columns: 2,
          spacing: 3,
          mt: 3,
          children: [/* @__PURE__ */ jsx(F, {
            label: t("vpn.subnet"),
            children: /* @__PURE__ */ jsx(Input, {
              size: "sm",
              borderRadius: "10px",
              fontFamily: "mono",
              value: form.awg.subnet,
              onChange: (e) => setAwg({
                subnet: e.target.value
              })
            })
          }), /* @__PURE__ */ jsx(F, {
            label: "DNS",
            children: /* @__PURE__ */ jsx(Input, {
              size: "sm",
              borderRadius: "10px",
              fontFamily: "mono",
              value: form.awg.dns.join(", "),
              onChange: (e) => setAwg({
                dns: dns(e.target.value)
              })
            })
          })]
        }), /* @__PURE__ */ jsx(Box, {
          mt: 3,
          children: /* @__PURE__ */ jsx(F, {
            label: t("vpn.serviceAddress"),
            children: /* @__PURE__ */ jsx(Input, {
              size: "sm",
              borderRadius: "10px",
              fontFamily: "mono",
              placeholder: form.public_address || s.default_public_address,
              value: form.awg.address,
              onChange: (e) => setAwg({
                address: e.target.value.trim()
              })
            })
          })
        }), /* @__PURE__ */ jsxs(HStack, {
          mt: 3,
          spacing: 2,
          children: [/* @__PURE__ */ jsx(Button, {
            size: "xs",
            variant: "ghost",
            rightIcon: /* @__PURE__ */ jsx(ChevronDownIcon, {
              width: 14
            }),
            onClick: () => setShowObf((o) => !o),
            children: t("vpn.obfuscation")
          }), /* @__PURE__ */ jsx(Tooltip, {
            label: t("vpn.randomizeHelp"),
            hasArrow: true,
            children: /* @__PURE__ */ jsx(Button, {
              size: "xs",
              variant: "ghost",
              leftIcon: /* @__PURE__ */ jsx(SparklesIcon, {
                width: 14
              }),
              onClick: randomize,
              children: t("vpn.randomize")
            })
          })]
        }), /* @__PURE__ */ jsxs(Collapse, {
          in: showObf,
          animateOpacity: true,
          children: [/* @__PURE__ */ jsx(SimpleGrid, {
            columns: {
              base: 3,
              md: 5
            },
            spacing: 2,
            mt: 2,
            children: PARAMS.map(([k, label]) => {
              var _a2;
              return /* @__PURE__ */ jsx(F, {
                label,
                children: /* @__PURE__ */ jsx(Num, {
                  value: (_a2 = form.awg.params[k]) != null ? _a2 : 0,
                  onChange: (n) => setAwg({
                    params: {
                      ...form.awg.params,
                      [k]: n
                    }
                  })
                })
              }, k);
            })
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            mt: 2,
            children: t("vpn.obfuscationHelp")
          })]
        })]
      }), /* @__PURE__ */ jsxs(Box, {
        ...soft,
        p: 4,
        children: [/* @__PURE__ */ jsxs(HStack, {
          mb: 3,
          children: [/* @__PURE__ */ jsx(Switch, {
            colorScheme: "primary",
            isChecked: form.ovpn.enabled,
            onChange: (e) => setOvpn({
              enabled: e.target.checked
            })
          }), /* @__PURE__ */ jsx(Text, {
            fontWeight: "semibold",
            flex: "1",
            children: "OpenVPN"
          }), ((_b = st.ovpn) == null ? void 0 : _b.running) && /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "green.400",
            children: t("vpn.clients", {
              n: st.ovpn.clients
            })
          })]
        }), /* @__PURE__ */ jsxs(SimpleGrid, {
          columns: 2,
          spacing: 3,
          children: [/* @__PURE__ */ jsx(F, {
            label: t("vpn.port"),
            children: /* @__PURE__ */ jsx(Num, {
              value: form.ovpn.port,
              min: 1,
              max: 65535,
              onChange: (port) => setOvpn({
                port
              })
            })
          }), /* @__PURE__ */ jsx(F, {
            label: t("vpn.protocol"),
            children: /* @__PURE__ */ jsxs(Select, {
              size: "sm",
              borderRadius: "10px",
              value: form.ovpn.proto,
              onChange: (e) => setOvpn({
                proto: e.target.value
              }),
              children: [/* @__PURE__ */ jsx("option", {
                value: "udp",
                children: "UDP"
              }), /* @__PURE__ */ jsx("option", {
                value: "tcp",
                children: "TCP"
              })]
            })
          }), /* @__PURE__ */ jsx(F, {
            label: t("vpn.subnet"),
            children: /* @__PURE__ */ jsx(Input, {
              size: "sm",
              borderRadius: "10px",
              fontFamily: "mono",
              value: form.ovpn.subnet,
              onChange: (e) => setOvpn({
                subnet: e.target.value
              })
            })
          }), /* @__PURE__ */ jsx(F, {
            label: "DNS",
            children: /* @__PURE__ */ jsx(Input, {
              size: "sm",
              borderRadius: "10px",
              fontFamily: "mono",
              value: form.ovpn.dns.join(", "),
              onChange: (e) => setOvpn({
                dns: dns(e.target.value)
              })
            })
          })]
        }), /* @__PURE__ */ jsx(Box, {
          mt: 3,
          children: /* @__PURE__ */ jsx(F, {
            label: t("vpn.serviceAddress"),
            children: /* @__PURE__ */ jsx(Input, {
              size: "sm",
              borderRadius: "10px",
              fontFamily: "mono",
              placeholder: form.public_address || s.default_public_address,
              value: form.ovpn.address,
              onChange: (e) => setOvpn({
                address: e.target.value.trim()
              })
            })
          })
        }), form.ovpn.proto === "udp" && /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          mt: 2,
          children: t("vpn.tcpHint")
        }), /* @__PURE__ */ jsxs(HStack, {
          mt: 3,
          spacing: 2,
          color: "gray.500",
          fontSize: "xs",
          children: [/* @__PURE__ */ jsx(Icon, {
            as: LockClosedIcon,
            boxSize: "14px"
          }), /* @__PURE__ */ jsx(Text, {
            children: t("vpn.ovpnHelp")
          })]
        })]
      })]
    }), (s.sessions || []).length > 0 && /* @__PURE__ */ jsxs(Box, {
      ...soft,
      p: 4,
      mt: 4,
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        fontWeight: "medium",
        mb: 2,
        children: t("vpn.connected", {
          n: s.sessions.length
        })
      }), /* @__PURE__ */ jsx(VStack, {
        align: "stretch",
        spacing: 1.5,
        children: s.sessions.map((x) => /* @__PURE__ */ jsxs(HStack, {
          spacing: 3,
          fontSize: "sm",
          flexWrap: "wrap",
          rowGap: 1,
          children: [/* @__PURE__ */ jsx(Text, {
            fontWeight: "medium",
            minW: "120px",
            children: x.username
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            children: t("vpn.ipCount", {
              n: new Set(x.ips.map((i) => i.ip)).size
            })
          }), x.ips.map((i) => /* @__PURE__ */ jsxs(HStack, {
            spacing: 1.5,
            px: 2,
            h: "22px",
            borderRadius: "full",
            fontSize: "xs",
            fontFamily: "mono",
            bg: "blackAlpha.100",
            _dark: {
              bg: "whiteAlpha.100"
            },
            children: [/* @__PURE__ */ jsx(Text, {
              as: "span",
              children: i.ip
            }), /* @__PURE__ */ jsx(Text, {
              as: "span",
              color: "primary.400",
              fontFamily: "body",
              children: i.tag
            })]
          }, i.ip + i.tag))]
        }, x.username))
      })]
    }), /* @__PURE__ */ jsx(Button, {
      size: "xs",
      variant: "ghost",
      mt: 3,
      rightIcon: /* @__PURE__ */ jsx(ChevronDownIcon, {
        width: 14
      }),
      onClick: () => setShowConn((o) => !o),
      children: t("vpn.connection")
    }), /* @__PURE__ */ jsxs(Collapse, {
      in: showConn,
      animateOpacity: true,
      children: [/* @__PURE__ */ jsxs(SimpleGrid, {
        columns: {
          base: 1,
          md: 3
        },
        spacing: 3,
        mt: 2,
        children: [/* @__PURE__ */ jsx(F, {
          label: t("vpn.publicAddress"),
          help: t("vpn.publicAddressHelp"),
          children: /* @__PURE__ */ jsx(Input, {
            size: "sm",
            borderRadius: "10px",
            fontFamily: "mono",
            placeholder: s.default_public_address,
            value: form.public_address,
            onChange: (e) => set({
              public_address: e.target.value
            })
          })
        }), /* @__PURE__ */ jsx(F, {
          label: t("vpn.agentAddress"),
          children: /* @__PURE__ */ jsx(Input, {
            size: "sm",
            borderRadius: "10px",
            fontFamily: "mono",
            placeholder: s.default_agent_address,
            value: form.agent_address,
            onChange: (e) => set({
              agent_address: e.target.value
            })
          })
        }), /* @__PURE__ */ jsx(F, {
          label: t("vpn.agentPort"),
          children: /* @__PURE__ */ jsx(Num, {
            value: form.agent_port,
            min: 1,
            max: 65535,
            onChange: (agent_port) => set({
              agent_port
            })
          })
        })]
      }), s.pinned && /* @__PURE__ */ jsx(Button, {
        size: "xs",
        variant: "ghost",
        mt: 2,
        leftIcon: /* @__PURE__ */ jsx(ArrowPathIcon, {
          width: 14
        }),
        onClick: resetPin,
        children: t("vpn.resetPin")
      })]
    }), /* @__PURE__ */ jsxs(HStack, {
      justify: "flex-end",
      mt: 3,
      children: [dirty && /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "orange.400",
        children: t("autoChange.unsaved")
      }), /* @__PURE__ */ jsx(Button, {
        colorScheme: "primary",
        size: "sm",
        isLoading: saving,
        isDisabled: !dirty,
        onClick: save,
        children: t("vpn.save")
      })]
    })]
  });
};
const Devices = ({
  value,
  max,
  onSaved
}) => {
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const [n, setN] = react.exports.useState(value);
  react.exports.useEffect(() => setN(value), [value]);
  const save = () => fetch("/vpn/devices", {
    method: "PUT",
    body: {
      awg_devices: n
    }
  }).then(() => {
    onSaved();
    toast({
      title: t("vpn.saved"),
      status: "success",
      position: "top",
      duration: 2e3
    });
  }).catch((e) => {
    var _a, _b;
    return toast({
      title: serverMessage(t, (_b = (_a = e == null ? void 0 : e.response) == null ? void 0 : _a._data) == null ? void 0 : _b.detail) || t("errors.generic"),
      status: "error",
      position: "top"
    });
  });
  return /* @__PURE__ */ jsxs(HStack, {
    ...card,
    p: 4,
    spacing: 4,
    flexWrap: "wrap",
    rowGap: 3,
    children: [/* @__PURE__ */ jsxs(Box, {
      flex: "1",
      minW: "240px",
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        fontWeight: "medium",
        children: t("vpn.devices")
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        children: t("vpn.devicesHelp", {
          max
        })
      })]
    }), /* @__PURE__ */ jsx(Box, {
      w: "90px",
      children: /* @__PURE__ */ jsx(Num, {
        value: n,
        min: 1,
        max,
        onChange: setN
      })
    }), /* @__PURE__ */ jsx(Button, {
      size: "sm",
      colorScheme: "primary",
      isDisabled: n === value,
      onClick: save,
      children: t("vpn.save")
    })]
  });
};
const VpnPage = () => {
  const {
    t
  } = useTranslation();
  const {
    data,
    refetch
  } = useQuery({
    queryKey: "vpn",
    queryFn: () => fetch("/vpn"),
    refetchInterval: 1e4
  });
  if (!data)
    return null;
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 5,
    maxW: "1100px",
    children: [/* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      color: "gray.500",
      maxW: "820px",
      children: t("vpn.help")
    }), /* @__PURE__ */ jsx(Devices, {
      value: data.awg_devices,
      max: data.max_devices,
      onSaved: () => refetch()
    }), data.servers.map((s) => /* @__PURE__ */ jsx(ServerCard, {
      s,
      onSaved: () => refetch()
    }, s.key))]
  });
};
const NodeVpnToggles = ({
  nodeKey,
  value,
  onChange
}) => {
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const {
    data,
    refetch
  } = useQuery({
    queryKey: "vpn",
    queryFn: () => fetch("/vpn"),
    enabled: !!nodeKey
  });
  const s = nodeKey ? data == null ? void 0 : data.servers.find((x) => x.key === nodeKey) : void 0;
  const [busy, setBusy] = react.exports.useState("");
  const on = nodeKey ? {
    awg: !!(s == null ? void 0 : s.awg.enabled),
    ovpn: !!(s == null ? void 0 : s.ovpn.enabled)
  } : value || {
    awg: false,
    ovpn: false
  };
  const toggle = (kind, v) => {
    if (!nodeKey)
      return onChange == null ? void 0 : onChange({
        ...on,
        [kind]: v
      });
    if (!s)
      return;
    setBusy(kind);
    applyNodeVpn(nodeKey, {
      ...on,
      [kind]: v
    }, s).then(() => refetch()).catch((e) => {
      var _a, _b;
      return toast({
        title: serverMessage(t, (_b = (_a = e == null ? void 0 : e.response) == null ? void 0 : _a._data) == null ? void 0 : _b.detail) || t("errors.generic"),
        status: "error",
        position: "top"
      });
    }).finally(() => setBusy(""));
  };
  return /* @__PURE__ */ jsxs(Box, {
    w: "full",
    ...soft,
    p: 3,
    children: [/* @__PURE__ */ jsxs(HStack, {
      mb: 2,
      children: [/* @__PURE__ */ jsx(Icon, {
        as: LockClosedIcon,
        boxSize: "14px",
        color: "primary.500"
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        fontWeight: "medium",
        flex: "1",
        children: t("vpn.title")
      }), s && /* @__PURE__ */ jsx(Status, {
        s
      })]
    }), /* @__PURE__ */ jsxs(HStack, {
      spacing: 6,
      flexWrap: "wrap",
      rowGap: 2,
      children: [/* @__PURE__ */ jsxs(HStack, {
        children: [/* @__PURE__ */ jsx(Switch, {
          size: "sm",
          colorScheme: "primary",
          isChecked: on.awg,
          isDisabled: busy === "awg",
          onChange: (e) => toggle("awg", e.target.checked)
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          children: "AmneziaWG"
        })]
      }), /* @__PURE__ */ jsxs(HStack, {
        children: [/* @__PURE__ */ jsx(Switch, {
          size: "sm",
          colorScheme: "primary",
          isChecked: on.ovpn,
          isDisabled: busy === "ovpn",
          onChange: (e) => toggle("ovpn", e.target.checked)
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          children: "OpenVPN"
        })]
      })]
    }), /* @__PURE__ */ jsxs(Text, {
      fontSize: "xs",
      color: "gray.500",
      mt: 2,
      children: [t("vpn.nodeHelp"), " ", /* @__PURE__ */ jsx(Text, {
        as: "a",
        href: "#/vpn/",
        color: "primary.500",
        children: t("vpn.openPage")
      })]
    })]
  });
};
const applyNodeVpn = async (key, on, current) => {
  let s = current;
  if (!s) {
    const all = await fetch("/vpn");
    s = all.servers.find((x) => x.key === key);
  }
  if (!s)
    throw new Error("server not found");
  return fetch(`/vpn/servers/${key}`, {
    method: "PUT",
    body: {
      agent_port: s.agent_port,
      agent_address: s.agent_address,
      public_address: s.public_address,
      awg: {
        ...s.awg,
        enabled: on.awg
      },
      ovpn: {
        ...s.ovpn,
        enabled: on.ovpn
      }
    }
  });
};
export {
  NodeVpnToggles,
  VpnPage,
  applyNodeVpn
};
