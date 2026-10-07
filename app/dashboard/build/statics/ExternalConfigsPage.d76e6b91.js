import { k as jsx, u as useTranslation, W as useToast, ay as useLocation, c as react, g as useQuery, h as jsxs, ah as VStack, H as HStack, T as Text, o as Button, K as SimpleGrid, b3 as FormControl, b4 as FormLabel, a7 as Input, aa as Select, N as Box, a9 as IconButton, cA as ArrowUpIcon, cB as ArrowDownIcon, cm as PlusIcon, Z as Spinner, D as Badge, ak as Switch, bO as ButtonGroup, cP as CloudArrowDownIcon, aQ as LinkIcon, ax as Fragment, bJ as Textarea, b2 as NumberInput, bb as NumberInputField, aj as Tooltip, cf as PencilSquareIcon, V as TrashIcon, d as dayjs, a1 as ArrowPathIcon, bQ as ChevronDownIcon, az as Collapse } from "./vendor.0404bf65.js";
import { a as useGetUser, f as fetch } from "./index.e0e646b5.js";
const LINK_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s#]+(#.*)?$/;
const linkCount = (links) => links.split("\n").filter((l) => LINK_RE.test(l.trim())).length;
const newId = () => {
  var _a, _b;
  return ((_b = (_a = window.crypto) == null ? void 0 : _a.randomUUID) == null ? void 0 : _b.call(_a)) || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};
const empty = (kind = "subscription") => ({
  id: newId(),
  name: "",
  kind,
  links: "",
  url: "",
  user_agent: "",
  range_start: 1,
  range_end: 0,
  rename: "country",
  test: true,
  test_timeout: 5,
  ws_rename: true,
  ws_label: "4G/WiFi",
  refresh_minutes: 60,
  enabled: true,
  position: "bottom",
  only_active: true,
  groups: []
});
const icon = {
  width: 16,
  height: 16
};
const PROTOCOL_LABEL = {
  vless: "VLESS",
  "vless-reality": "VLESS Reality",
  "vless-tcp": "VLESS TCP",
  "vless-ws": "VLESS WS",
  "vless-grpc": "VLESS gRPC",
  "vless-xhttp": "VLESS XHTTP",
  "vless-httpupgrade": "VLESS HTTPUpgrade",
  vmess: "VMess",
  trojan: "Trojan",
  ss: "Shadowsocks",
  hysteria2: "Hysteria2",
  tuic: "TUIC",
  wireguard: "WireGuard"
};
const surface = {
  borderWidth: "1px",
  borderColor: "light-border",
  borderRadius: "16px",
  bg: "var(--app-surface)",
  boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.04)",
  _dark: {
    borderColor: "gray.700",
    bg: "gray.750",
    boxShadow: "none"
  }
};
const Panel = ({
  title,
  help,
  children,
  right
}) => /* @__PURE__ */ jsxs(Box, {
  ...surface,
  p: {
    base: 4,
    md: 5
  },
  children: [/* @__PURE__ */ jsxs(HStack, {
    justifyContent: "space-between",
    alignItems: "flex-start",
    children: [/* @__PURE__ */ jsxs(Box, {
      children: [/* @__PURE__ */ jsx(Text, {
        fontWeight: "semibold",
        children: title
      }), help && /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        mt: 0.5,
        children: help
      })]
    }), right]
  }), /* @__PURE__ */ jsx(Box, {
    mt: 4,
    children
  })]
});
const Toggle = ({
  label,
  help,
  value,
  onChange
}) => /* @__PURE__ */ jsxs(HStack, {
  justifyContent: "space-between",
  spacing: 3,
  children: [/* @__PURE__ */ jsxs(Box, {
    children: [/* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      children: label
    }), help && /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      children: help
    })]
  }), /* @__PURE__ */ jsx(Switch, {
    colorScheme: "primary",
    isChecked: value,
    onChange: (e) => onChange(e.target.checked)
  })]
});
const Num = ({
  value,
  min = 0,
  max,
  onChange,
  placeholder
}) => /* @__PURE__ */ jsx(NumberInput, {
  size: "sm",
  min,
  max,
  value: value || "",
  onChange: (_, n) => onChange(Number.isNaN(n) ? 0 : n),
  children: /* @__PURE__ */ jsx(NumberInputField, {
    placeholder
  })
});
const GroupPicker = ({
  all,
  value,
  onChange
}) => {
  const {
    t
  } = useTranslation();
  if (all.length === 0)
    return /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      children: t("external.noGroups")
    });
  return /* @__PURE__ */ jsx(HStack, {
    spacing: 1.5,
    flexWrap: "wrap",
    children: all.map((g) => {
      const on = value.includes(g);
      return /* @__PURE__ */ jsx(Button, {
        size: "xs",
        borderRadius: "full",
        colorScheme: "primary",
        variant: on ? "solid" : "outline",
        onClick: () => onChange(on ? value.filter((x) => x !== g) : [...value, g]),
        children: g
      }, g);
    })
  });
};
const ConfigForm = ({
  value,
  groups,
  onChange
}) => {
  const {
    t
  } = useTranslation();
  const set = (patch) => onChange({
    ...value,
    ...patch
  });
  const count = linkCount(value.links);
  const bad = value.kind === "links" && value.links.trim() !== "" && count === 0;
  const isSub = value.kind === "subscription";
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 4,
    children: [/* @__PURE__ */ jsxs(ButtonGroup, {
      size: "sm",
      isAttached: true,
      variant: "outline",
      colorScheme: "primary",
      children: [/* @__PURE__ */ jsx(Button, {
        leftIcon: /* @__PURE__ */ jsx(CloudArrowDownIcon, {
          ...icon
        }),
        variant: isSub ? "solid" : "outline",
        onClick: () => set({
          kind: "subscription"
        }),
        children: t("external.kindSub")
      }), /* @__PURE__ */ jsx(Button, {
        leftIcon: /* @__PURE__ */ jsx(LinkIcon, {
          ...icon
        }),
        variant: !isSub ? "solid" : "outline",
        onClick: () => set({
          kind: "links"
        }),
        children: t("external.kindLinks")
      })]
    }), /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        md: 2
      },
      spacing: 3,
      children: [/* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          children: t("external.name")
        }), /* @__PURE__ */ jsx(Input, {
          size: "sm",
          value: value.name,
          onChange: (e) => set({
            name: e.target.value
          }),
          placeholder: t("external.namePlaceholder")
        })]
      }), /* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          children: t("external.position")
        }), /* @__PURE__ */ jsxs(Select, {
          size: "sm",
          value: value.position,
          onChange: (e) => set({
            position: e.target.value
          }),
          children: [/* @__PURE__ */ jsx("option", {
            value: "top",
            children: t("external.top")
          }), /* @__PURE__ */ jsx("option", {
            value: "bottom",
            children: t("external.bottom")
          })]
        })]
      })]
    }), isSub ? /* @__PURE__ */ jsxs(Fragment, {
      children: [/* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          children: t("external.url")
        }), /* @__PURE__ */ jsx(Input, {
          size: "sm",
          fontFamily: "mono",
          fontSize: "xs",
          value: value.url,
          onChange: (e) => set({
            url: e.target.value.trim()
          }),
          placeholder: "https://example.com/sub/xxxx"
        })]
      }), /* @__PURE__ */ jsxs(SimpleGrid, {
        columns: {
          base: 2,
          md: 3
        },
        spacing: 3,
        children: [/* @__PURE__ */ jsxs(FormControl, {
          children: [/* @__PURE__ */ jsx(FormLabel, {
            children: t("external.rangeFrom")
          }), /* @__PURE__ */ jsx(Num, {
            min: 1,
            value: value.range_start,
            onChange: (n) => set({
              range_start: Math.max(1, n)
            })
          })]
        }), /* @__PURE__ */ jsxs(FormControl, {
          children: [/* @__PURE__ */ jsx(FormLabel, {
            children: t("external.rangeTo")
          }), /* @__PURE__ */ jsx(Num, {
            min: 0,
            value: value.range_end,
            onChange: (n) => set({
              range_end: n
            }),
            placeholder: t("external.rangeAll")
          })]
        }), /* @__PURE__ */ jsxs(FormControl, {
          children: [/* @__PURE__ */ jsx(FormLabel, {
            children: t("external.rename")
          }), /* @__PURE__ */ jsxs(Select, {
            size: "sm",
            value: value.rename,
            onChange: (e) => set({
              rename: e.target.value
            }),
            children: [/* @__PURE__ */ jsxs("option", {
              value: "country",
              children: ["\u{1F1E9}\u{1F1EA} ", t("external.renameCountry")]
            }), /* @__PURE__ */ jsxs("option", {
              value: "country_city",
              children: ["\u{1F1E9}\u{1F1EA} ", t("external.renameCity")]
            }), /* @__PURE__ */ jsx("option", {
              value: "none",
              children: t("external.renameNone")
            })]
          })]
        })]
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        mt: -2,
        children: t("external.rangeHelp")
      }), value.rename !== "none" && /* @__PURE__ */ jsxs(SimpleGrid, {
        columns: {
          base: 1,
          md: 2
        },
        spacing: 3,
        children: [/* @__PURE__ */ jsx(Toggle, {
          label: t("external.wsRename"),
          help: t("external.wsRenameHelp"),
          value: value.ws_rename,
          onChange: (v) => set({
            ws_rename: v
          })
        }), /* @__PURE__ */ jsxs(FormControl, {
          isDisabled: !value.ws_rename,
          children: [/* @__PURE__ */ jsx(FormLabel, {
            children: t("external.wsLabel")
          }), /* @__PURE__ */ jsx(Input, {
            size: "sm",
            maxLength: 32,
            value: value.ws_label,
            onChange: (e) => set({
              ws_label: e.target.value
            }),
            placeholder: "4G/WiFi"
          })]
        })]
      }), /* @__PURE__ */ jsxs(SimpleGrid, {
        columns: {
          base: 1,
          md: 2
        },
        spacing: 3,
        children: [/* @__PURE__ */ jsx(Toggle, {
          label: t("external.test"),
          help: t("external.testHelp"),
          value: value.test,
          onChange: (v) => set({
            test: v
          })
        }), /* @__PURE__ */ jsxs(FormControl, {
          isDisabled: !value.test,
          children: [/* @__PURE__ */ jsx(FormLabel, {
            children: t("external.testTimeout")
          }), /* @__PURE__ */ jsx(Num, {
            min: 1,
            max: 30,
            value: value.test_timeout,
            onChange: (n) => set({
              test_timeout: Math.min(30, Math.max(1, n))
            })
          })]
        })]
      }), /* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          children: t("external.userAgent")
        }), /* @__PURE__ */ jsx(Input, {
          size: "sm",
          value: value.user_agent,
          onChange: (e) => set({
            user_agent: e.target.value
          }),
          placeholder: "v2rayNG/1.8.5"
        })]
      })]
    }) : /* @__PURE__ */ jsxs(FormControl, {
      isInvalid: bad,
      children: [/* @__PURE__ */ jsxs(FormLabel, {
        children: [t("external.links"), " ", /* @__PURE__ */ jsxs(Text, {
          as: "span",
          fontSize: "xs",
          color: bad ? "red.400" : "gray.500",
          fontWeight: "normal",
          children: ["\xB7 ", bad ? t("external.invalid") : t("external.linkCount", {
            count
          })]
        })]
      }), /* @__PURE__ */ jsx(Textarea, {
        size: "sm",
        rows: 4,
        fontFamily: "mono",
        fontSize: "xs",
        value: value.links,
        onChange: (e) => set({
          links: e.target.value
        }),
        placeholder: "vless://...#My server\nss://...#Backup"
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        mt: 1,
        children: t("external.linksHelp")
      })]
    }), /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        md: 2
      },
      spacing: 3,
      children: [/* @__PURE__ */ jsx(Toggle, {
        label: t("external.onlyActive"),
        help: t("external.onlyActiveHelp"),
        value: value.only_active,
        onChange: (v) => set({
          only_active: v
        })
      }), groups && /* @__PURE__ */ jsxs(Box, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          mb: 1,
          children: t("external.groups")
        }), /* @__PURE__ */ jsx(GroupPicker, {
          all: groups,
          value: value.groups,
          onChange: (g) => set({
            groups: g
          })
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          mt: 1,
          children: t("external.groupsHelp")
        })]
      })]
    }), isSub && /* @__PURE__ */ jsxs(Box, {
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        mb: 1.5,
        children: t("external.refresh")
      }), /* @__PURE__ */ jsx(RefreshInterval, {
        value: value.refresh_minutes,
        onChange: (m) => set({
          refresh_minutes: m
        })
      })]
    })]
  });
};
const REFRESH_PRESETS = [15, 30, 60, 180, 360, 720, 1440];
const REFRESH_UNITS = [{
  key: "minutes",
  factor: 1
}, {
  key: "hours",
  factor: 60
}, {
  key: "days",
  factor: 1440
}];
const MAX_REFRESH_MINUTES = 43200;
const RefreshInterval = ({
  value,
  onChange
}) => {
  const {
    t
  } = useTranslation();
  const bestUnit = (m) => [...REFRESH_UNITS].reverse().find((u) => m % u.factor === 0) || REFRESH_UNITS[0];
  const [unit, setUnit] = react.exports.useState(() => bestUnit(value || 60));
  const [amount, setAmount] = react.exports.useState(() => String((value || 60) / bestUnit(value || 60).factor));
  const [custom, setCustom] = react.exports.useState(() => !REFRESH_PRESETS.includes(value));
  react.exports.useEffect(() => {
    if (Math.round(Number(amount) * unit.factor) === value)
      return;
    const u = bestUnit(value || 60);
    setUnit(u);
    setAmount(String((value || 60) / u.factor));
  }, [value]);
  const apply = (raw, u = unit) => {
    setAmount(raw);
    const n = Math.round(Number(raw) * u.factor);
    if (Number.isFinite(n) && n >= 1)
      onChange(Math.min(n, MAX_REFRESH_MINUTES));
  };
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 2,
    children: [/* @__PURE__ */ jsxs(HStack, {
      spacing: 1.5,
      flexWrap: "wrap",
      rowGap: 1.5,
      children: [REFRESH_PRESETS.map((m) => /* @__PURE__ */ jsx(Button, {
        size: "xs",
        borderRadius: "full",
        colorScheme: "primary",
        variant: !custom && value === m ? "solid" : "outline",
        onClick: () => {
          setCustom(false);
          onChange(m);
        },
        children: m < 60 ? t("external.minutes", {
          count: m
        }) : t("external.hours", {
          count: m / 60
        })
      }, m)), /* @__PURE__ */ jsx(Button, {
        size: "xs",
        borderRadius: "full",
        colorScheme: "primary",
        variant: custom ? "solid" : "outline",
        onClick: () => setCustom(true),
        children: t("external.customInterval")
      })]
    }), custom && /* @__PURE__ */ jsxs(HStack, {
      spacing: 2,
      maxW: "260px",
      children: [/* @__PURE__ */ jsx(NumberInput, {
        size: "sm",
        min: 1,
        value: amount,
        onChange: (v) => apply(v),
        children: /* @__PURE__ */ jsx(NumberInputField, {
          borderRadius: "md"
        })
      }), /* @__PURE__ */ jsx(Select, {
        size: "sm",
        borderRadius: "md",
        value: unit.key,
        onChange: (e) => {
          const u = REFRESH_UNITS.find((x) => x.key === e.target.value);
          setUnit(u);
          apply(amount, u);
        },
        children: REFRESH_UNITS.map((u) => /* @__PURE__ */ jsx("option", {
          value: u.key,
          children: t(`external.unit.${u.key}`)
        }, u.key))
      })]
    })]
  });
};
const canAdd = (c) => c.kind === "subscription" ? /^https?:\/\/\S+$/.test(c.url) : linkCount(c.links) > 0;
const SourceResult = ({
  status,
  saved,
  onRefresh
}) => {
  var _a;
  const {
    t
  } = useTranslation();
  const [open, setOpen] = react.exports.useState(false);
  const s = (status == null ? void 0 : status.stats) || {};
  return /* @__PURE__ */ jsxs(Box, {
    mt: 3,
    children: [/* @__PURE__ */ jsxs(HStack, {
      spacing: 2,
      flexWrap: "wrap",
      rowGap: 1.5,
      children: [(status == null ? void 0 : status.running) ? /* @__PURE__ */ jsxs(HStack, {
        spacing: 1.5,
        fontSize: "xs",
        color: "primary.500",
        children: [/* @__PURE__ */ jsx(Spinner, {
          size: "xs"
        }), /* @__PURE__ */ jsx(Text, {
          children: t("external.running")
        })]
      }) : (status == null ? void 0 : status.updated_at) ? /* @__PURE__ */ jsxs(Fragment, {
        children: [/* @__PURE__ */ jsx(Badge, {
          variant: "subtle",
          children: t("external.fetched", {
            count: s.fetched || 0
          })
        }), /* @__PURE__ */ jsx(Badge, {
          variant: "subtle",
          children: t("external.inRange", {
            count: s.in_range || 0
          })
        }), /* @__PURE__ */ jsx(Badge, {
          colorScheme: "green",
          children: t("external.working", {
            count: s.working || 0
          })
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          children: dayjs.unix(status.updated_at).fromNow()
        })]
      }) : /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        children: saved ? t("external.notFetched") : t("external.saveFirst")
      }), /* @__PURE__ */ jsx(Box, {
        flex: 1
      }), /* @__PURE__ */ jsx(Button, {
        size: "xs",
        variant: "ghost",
        leftIcon: /* @__PURE__ */ jsx(ArrowPathIcon, {
          width: 14,
          height: 14
        }),
        isDisabled: !saved || (status == null ? void 0 : status.running),
        onClick: onRefresh,
        children: t("external.refreshNow")
      }), !!((_a = status == null ? void 0 : status.items) == null ? void 0 : _a.length) && /* @__PURE__ */ jsx(Button, {
        size: "xs",
        variant: "ghost",
        rightIcon: /* @__PURE__ */ jsx(ChevronDownIcon, {
          width: 14,
          height: 14,
          style: {
            transform: open ? "rotate(180deg)" : void 0
          }
        }),
        onClick: () => setOpen(!open),
        children: t("external.showConfigs")
      })]
    }), (status == null ? void 0 : status.error) && /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "red.400",
      mt: 1,
      children: status.error
    }), /* @__PURE__ */ jsx(Collapse, {
      in: open,
      animateOpacity: true,
      unmountOnExit: true,
      children: /* @__PURE__ */ jsx(VStack, {
        align: "stretch",
        spacing: 1,
        mt: 2,
        maxH: "280px",
        overflowY: "auto",
        children: ((status == null ? void 0 : status.items) || []).map((it, i) => /* @__PURE__ */ jsxs(HStack, {
          px: 2.5,
          py: 1.5,
          borderRadius: "8px",
          bg: "blackAlpha.50",
          _dark: {
            bg: "whiteAlpha.50"
          },
          fontSize: "sm",
          spacing: 2,
          children: [/* @__PURE__ */ jsxs(Box, {
            flex: 1,
            minW: 0,
            children: [/* @__PURE__ */ jsx(Text, {
              isTruncated: true,
              title: it.link,
              children: it.name
            }), it.exit_ip && /* @__PURE__ */ jsx(Text, {
              fontSize: "2xs",
              color: "gray.500",
              isTruncated: true,
              children: t("external.exitIp", {
                ip: it.exit_ip
              })
            })]
          }), /* @__PURE__ */ jsx(Badge, {
            variant: "outline",
            fontSize: "2xs",
            children: PROTOCOL_LABEL[it.kind || it.protocol] || it.kind || it.protocol
          }), it.latency != null && /* @__PURE__ */ jsxs(Text, {
            fontSize: "xs",
            color: it.latency < 400 ? "green.400" : it.latency < 1e3 ? "orange.400" : "red.400",
            w: "56px",
            textAlign: "right",
            children: [it.latency, " ms"]
          })]
        }, i))
      })
    })]
  });
};
const ConfigList = ({
  configs,
  onChange,
  groups,
  statusOf,
  savedIds,
  onRefresh
}) => {
  const {
    t
  } = useTranslation();
  const [editing, setEditing] = react.exports.useState(null);
  const setOne = (id, c) => onChange(configs.map((x) => x.id === id ? c : x));
  const move = (i, dir) => {
    const list = [...configs];
    const j = i + dir;
    if (j < 0 || j >= list.length)
      return;
    [list[i], list[j]] = [list[j], list[i]];
    onChange(list);
  };
  const refreshSource = onRefresh;
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 2,
    children: [configs.length === 0 && /* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      color: "gray.500",
      children: t("external.empty")
    }), configs.map((c, i) => /* @__PURE__ */ jsx(Box, {
      p: 3,
      borderWidth: "1px",
      borderColor: "light-border",
      borderRadius: "12px",
      bg: "var(--app-surface-2)",
      _dark: {
        borderColor: "gray.600",
        bg: "gray.800"
      },
      opacity: c.enabled ? 1 : 0.6,
      children: editing === c.id ? /* @__PURE__ */ jsxs(Fragment, {
        children: [/* @__PURE__ */ jsx(ConfigForm, {
          value: c,
          groups,
          onChange: (v) => setOne(c.id, v)
        }), /* @__PURE__ */ jsx(HStack, {
          justifyContent: "flex-end",
          mt: 3,
          children: /* @__PURE__ */ jsx(Button, {
            size: "sm",
            onClick: () => setEditing(null),
            children: t("external.done")
          })
        })]
      }) : /* @__PURE__ */ jsxs(Fragment, {
        children: [/* @__PURE__ */ jsxs(HStack, {
          spacing: 2,
          alignItems: "center",
          children: [/* @__PURE__ */ jsxs(VStack, {
            spacing: 0,
            children: [/* @__PURE__ */ jsx(IconButton, {
              size: "xs",
              variant: "ghost",
              "aria-label": "up",
              icon: /* @__PURE__ */ jsx(ArrowUpIcon, {
                ...icon
              }),
              isDisabled: i === 0,
              onClick: () => move(i, -1)
            }), /* @__PURE__ */ jsx(IconButton, {
              size: "xs",
              variant: "ghost",
              "aria-label": "down",
              icon: /* @__PURE__ */ jsx(ArrowDownIcon, {
                ...icon
              }),
              isDisabled: i === configs.length - 1,
              onClick: () => move(i, 1)
            })]
          }), /* @__PURE__ */ jsxs(Box, {
            flex: 1,
            minW: 0,
            children: [/* @__PURE__ */ jsxs(HStack, {
              spacing: 1.5,
              children: [c.kind === "subscription" ? /* @__PURE__ */ jsx(CloudArrowDownIcon, {
                width: 16,
                height: 16
              }) : /* @__PURE__ */ jsx(LinkIcon, {
                width: 16,
                height: 16
              }), /* @__PURE__ */ jsx(Text, {
                fontWeight: "medium",
                fontSize: "sm",
                isTruncated: true,
                children: c.name || (c.kind === "subscription" ? c.url : t("external.unnamed"))
              })]
            }), /* @__PURE__ */ jsxs(HStack, {
              spacing: 1.5,
              mt: 1.5,
              flexWrap: "wrap",
              rowGap: 1,
              children: [/* @__PURE__ */ jsx(Badge, {
                colorScheme: c.position === "top" ? "purple" : "primary",
                children: c.position === "top" ? t("external.top") : t("external.bottom")
              }), c.kind === "subscription" ? /* @__PURE__ */ jsxs(Fragment, {
                children: [/* @__PURE__ */ jsx(Badge, {
                  variant: "outline",
                  children: c.range_end ? `${c.range_start}\u2013${c.range_end}` : `${c.range_start}\u2013\u221E`
                }), c.test && /* @__PURE__ */ jsx(Badge, {
                  variant: "outline",
                  colorScheme: "green",
                  children: t("external.testBadge")
                }), c.rename !== "none" && /* @__PURE__ */ jsx(Badge, {
                  variant: "outline",
                  children: c.rename === "country" ? t("external.renameCountry") : t("external.renameCity")
                })]
              }) : /* @__PURE__ */ jsx(Badge, {
                variant: "outline",
                children: t("external.linkCount", {
                  count: linkCount(c.links)
                })
              }), c.only_active && /* @__PURE__ */ jsx(Badge, {
                variant: "subtle",
                children: t("external.activeOnlyBadge")
              }), c.groups.map((g) => /* @__PURE__ */ jsx(Badge, {
                variant: "outline",
                colorScheme: "orange",
                children: g
              }, g))]
            })]
          }), /* @__PURE__ */ jsx(Tooltip, {
            label: c.enabled ? t("external.enabled") : t("external.disabled"),
            children: /* @__PURE__ */ jsx(Box, {
              children: /* @__PURE__ */ jsx(Switch, {
                size: "sm",
                colorScheme: "primary",
                isChecked: c.enabled,
                onChange: (e) => setOne(c.id, {
                  ...c,
                  enabled: e.target.checked
                })
              })
            })
          }), /* @__PURE__ */ jsx(IconButton, {
            size: "sm",
            variant: "ghost",
            borderRadius: "full",
            "aria-label": "edit",
            icon: /* @__PURE__ */ jsx(PencilSquareIcon, {
              ...icon
            }),
            onClick: () => setEditing(c.id)
          }), /* @__PURE__ */ jsx(IconButton, {
            size: "sm",
            variant: "ghost",
            borderRadius: "full",
            colorScheme: "red",
            "aria-label": "delete",
            icon: /* @__PURE__ */ jsx(TrashIcon, {
              ...icon
            }),
            onClick: () => onChange(configs.filter((x) => x.id !== c.id))
          })]
        }), c.kind === "subscription" && /* @__PURE__ */ jsx(SourceResult, {
          status: statusOf(c.id),
          saved: savedIds.has(c.id),
          onRefresh: () => refreshSource(c.id)
        })]
      })
    }, c.id))]
  });
};
const ExternalConfigsPage = () => {
  const {
    userData,
    getUserIsSuccess
  } = useGetUser();
  if (!getUserIsSuccess)
    return null;
  return userData.is_sudo ? /* @__PURE__ */ jsx(SudoExternalPage, {}) : /* @__PURE__ */ jsx(OwnExternalPage, {});
};
const emptyAdmin = () => ({
  enabled: true,
  label: "",
  self_edit: false,
  include_general: true,
  configs: []
});
const SudoExternalPage = () => {
  var _a;
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const location = useLocation();
  const [scope, setScope] = react.exports.useState(() => new URLSearchParams(location.search).get("admin") || "");
  const {
    data: adminNames
  } = useQuery({
    queryKey: "admin-names",
    queryFn: () => fetch("/admins").then((list2) => list2.filter((a) => !a.is_sudo).map((a) => a.username))
  });
  const {
    data: saved,
    refetch
  } = useQuery({
    queryKey: "external-configs",
    queryFn: () => fetch("/external-configs")
  });
  const {
    data: groupNames
  } = useQuery({
    queryKey: "host-group-names",
    queryFn: () => fetch("/groups").then((d) => d.groups.map((g) => g.name))
  });
  const {
    data: sources,
    refetch: refetchSources
  } = useQuery({
    queryKey: "external-sources",
    queryFn: () => fetch("/external-configs/sources"),
    refetchInterval: (d) => (d == null ? void 0 : d.some((x) => x.running)) ? 2500 : 3e4
  });
  const groups = groupNames || [];
  const statusOf = (id) => sources == null ? void 0 : sources.find((s) => s.id === id);
  const [draft, setDraft] = react.exports.useState(null);
  react.exports.useEffect(() => {
    if (saved)
      setDraft(saved);
  }, [saved]);
  const [adding, setAdding] = react.exports.useState(empty());
  const [saving, setSaving] = react.exports.useState(false);
  const [previewUser, setPreviewUser] = react.exports.useState("");
  const [preview, setPreview] = react.exports.useState(null);
  const [previewError, setPreviewError] = react.exports.useState("");
  const dirty = react.exports.useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const savedIds = new Set([...(saved == null ? void 0 : saved.configs) || [], ...Object.values((saved == null ? void 0 : saved.admins) || {}).flatMap((a) => a.configs)].map((c) => c.id));
  const anyRunning = sources == null ? void 0 : sources.some((s) => s.running);
  react.exports.useEffect(() => {
    if (!draft)
      return;
    const h = setTimeout(() => {
      const q = previewUser.trim() ? `?username=${encodeURIComponent(previewUser.trim())}` : "";
      fetch(`/external-configs/preview${q}`, {
        method: "POST",
        body: draft
      }).then((p) => {
        setPreview(p);
        setPreviewError("");
      }).catch((e) => {
        var _a2;
        return setPreviewError(((_a2 = e == null ? void 0 : e.data) == null ? void 0 : _a2.detail) || t("external.previewError"));
      });
    }, 400);
    return () => clearTimeout(h);
  }, [draft, previewUser, sources]);
  if (!draft)
    return null;
  const update = (patch) => setDraft({
    ...draft,
    ...patch
  });
  const mine = scope && ((_a = draft.admins) == null ? void 0 : _a[scope]) || emptyAdmin();
  const setMine = (patch) => update({
    admins: {
      ...draft.admins || {},
      [scope]: {
        ...mine,
        ...patch
      }
    }
  });
  const list = scope ? mine.configs : draft.configs;
  const setList = (configs) => scope ? setMine({
    configs
  }) : update({
    configs
  });
  const moveProtocol = (i, dir) => {
    const list2 = [...draft.protocol_order];
    const j = i + dir;
    if (j < 0 || j >= list2.length)
      return;
    [list2[i], list2[j]] = [list2[j], list2[i]];
    update({
      protocol_order: list2
    });
  };
  const add = () => {
    setList([...list, adding]);
    setAdding(empty(adding.kind));
  };
  const save = () => {
    setSaving(true);
    fetch("/external-configs", {
      method: "PUT",
      body: draft
    }).then(() => {
      toast({
        status: "success",
        title: t("external.saved"),
        duration: 1500
      });
      refetch();
      refetchSources();
    }).catch((e) => {
      var _a2;
      return toast({
        status: "error",
        title: t("external.saveError"),
        description: (_a2 = e == null ? void 0 : e.data) == null ? void 0 : _a2.detail,
        duration: 4e3
      });
    }).finally(() => setSaving(false));
  };
  const refreshSource = (id) => fetch(`/external-configs/sources/${id}/refresh`, {
    method: "POST"
  }).then(() => setTimeout(() => refetchSources(), 300)).catch((e) => {
    var _a2;
    return toast({
      status: "error",
      title: ((_a2 = e == null ? void 0 : e.data) == null ? void 0 : _a2.detail) || "error",
      duration: 3e3
    });
  });
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 4,
    children: [dirty && /* @__PURE__ */ jsxs(HStack, {
      position: "sticky",
      top: 2,
      zIndex: 5,
      p: 2,
      pl: 4,
      borderRadius: "12px",
      bg: "primary.500",
      color: "white",
      justifyContent: "space-between",
      boxShadow: "lg",
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        fontWeight: "medium",
        children: t("external.unsaved")
      }), /* @__PURE__ */ jsxs(HStack, {
        children: [/* @__PURE__ */ jsx(Button, {
          size: "sm",
          variant: "ghost",
          color: "white",
          _hover: {
            bg: "whiteAlpha.200"
          },
          onClick: () => setDraft(saved),
          children: t("external.discard")
        }), /* @__PURE__ */ jsx(Button, {
          size: "sm",
          bg: "white",
          color: "primary.600",
          _hover: {
            bg: "whiteAlpha.900"
          },
          isLoading: saving,
          onClick: save,
          children: t("external.save")
        })]
      })]
    }), /* @__PURE__ */ jsx(HStack, {
      spacing: 1.5,
      flexWrap: "wrap",
      rowGap: 1.5,
      children: ["", ...adminNames || []].map((name) => {
        var _a2, _b, _c;
        return /* @__PURE__ */ jsxs(Button, {
          size: "sm",
          borderRadius: "full",
          colorScheme: "primary",
          variant: scope === name ? "solid" : "outline",
          onClick: () => setScope(name),
          children: [name || t("external.scopeMine"), name && ((_c = (_b = (_a2 = draft.admins) == null ? void 0 : _a2[name]) == null ? void 0 : _b.configs) == null ? void 0 : _c.length) ? ` \xB7 ${draft.admins[name].configs.length}` : ""]
        }, name || "-");
      })
    }), scope && /* @__PURE__ */ jsx(Panel, {
      title: t("external.adminTitle", {
        name: scope
      }),
      help: t("external.adminHelp"),
      children: /* @__PURE__ */ jsxs(SimpleGrid, {
        columns: {
          base: 1,
          md: 2
        },
        spacing: 4,
        children: [/* @__PURE__ */ jsx(Toggle, {
          label: t("adminSub.includeGeneral"),
          help: t("adminSub.includeGeneralHelp"),
          value: mine.include_general !== false,
          onChange: (v) => setMine({
            include_general: v
          })
        }), /* @__PURE__ */ jsx(Toggle, {
          label: t("external.adminEnabled"),
          value: mine.enabled,
          onChange: (v) => setMine({
            enabled: v
          })
        }), /* @__PURE__ */ jsx(Toggle, {
          label: t("external.selfEdit"),
          help: t("external.selfEditHelp"),
          value: mine.self_edit,
          onChange: (v) => setMine({
            self_edit: v
          })
        }), /* @__PURE__ */ jsxs(FormControl, {
          children: [/* @__PURE__ */ jsx(FormLabel, {
            children: t("external.label")
          }), /* @__PURE__ */ jsxs(HStack, {
            children: [/* @__PURE__ */ jsx(Input, {
              size: "sm",
              maxLength: 64,
              value: mine.label,
              onChange: (e) => setMine({
                label: e.target.value
              }),
              placeholder: t("external.labelPlaceholder")
            }), /* @__PURE__ */ jsx(Button, {
              size: "sm",
              variant: "outline",
              onClick: () => setMine({
                label: scope
              }),
              children: t("external.useAdminName")
            })]
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            mt: 1,
            children: t("external.labelHelp")
          })]
        })]
      })
    }), !scope && /* @__PURE__ */ jsx(Panel, {
      title: t("external.sorting"),
      help: t("external.sortingHelp"),
      children: /* @__PURE__ */ jsxs(SimpleGrid, {
        columns: {
          base: 1,
          md: 2
        },
        spacing: 4,
        children: [/* @__PURE__ */ jsxs(VStack, {
          align: "stretch",
          spacing: 3,
          children: [/* @__PURE__ */ jsxs(FormControl, {
            children: [/* @__PURE__ */ jsx(FormLabel, {
              children: t("external.generatedSort")
            }), /* @__PURE__ */ jsxs(Select, {
              size: "sm",
              value: draft.generated_sort,
              onChange: (e) => update({
                generated_sort: e.target.value
              }),
              children: [/* @__PURE__ */ jsx("option", {
                value: "default",
                children: t("external.sort.default")
              }), /* @__PURE__ */ jsx("option", {
                value: "remark",
                children: t("external.sort.remark")
              }), /* @__PURE__ */ jsx("option", {
                value: "remark_desc",
                children: t("external.sort.remark_desc")
              }), /* @__PURE__ */ jsx("option", {
                value: "protocol",
                children: t("external.sort.protocol")
              }), /* @__PURE__ */ jsx("option", {
                value: "reverse",
                children: t("external.sort.reverse")
              })]
            })]
          }), /* @__PURE__ */ jsxs(FormControl, {
            children: [/* @__PURE__ */ jsx(FormLabel, {
              children: t("external.externalSort")
            }), /* @__PURE__ */ jsxs(Select, {
              size: "sm",
              value: draft.external_sort,
              onChange: (e) => update({
                external_sort: e.target.value
              }),
              children: [/* @__PURE__ */ jsx("option", {
                value: "manual",
                children: t("external.sort.manual")
              }), /* @__PURE__ */ jsx("option", {
                value: "protocol",
                children: t("external.sort.byProtocolOrder")
              }), /* @__PURE__ */ jsx("option", {
                value: "name",
                children: t("external.sort.name")
              }), /* @__PURE__ */ jsx("option", {
                value: "name_desc",
                children: t("external.sort.name_desc")
              })]
            })]
          }), /* @__PURE__ */ jsxs(FormControl, {
            children: [/* @__PURE__ */ jsx(FormLabel, {
              children: t("external.testUrl")
            }), /* @__PURE__ */ jsx(Input, {
              size: "sm",
              fontFamily: "mono",
              fontSize: "xs",
              value: draft.test_url,
              onChange: (e) => update({
                test_url: e.target.value.trim()
              })
            })]
          })]
        }), /* @__PURE__ */ jsxs(Box, {
          opacity: draft.external_sort === "protocol" || draft.generated_sort === "protocol" ? 1 : 0.5,
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "sm",
            fontWeight: "medium",
            mb: 1,
            children: t("external.protocolOrder")
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            mb: 2,
            children: t("external.protocolOrderHelp")
          }), /* @__PURE__ */ jsx(VStack, {
            align: "stretch",
            spacing: 1,
            children: draft.protocol_order.map((p, i) => /* @__PURE__ */ jsxs(HStack, {
              px: 3,
              py: 1,
              borderRadius: "8px",
              borderWidth: "1px",
              borderColor: "light-border",
              _dark: {
                borderColor: "gray.600"
              },
              children: [/* @__PURE__ */ jsx(Text, {
                fontSize: "xs",
                color: "gray.500",
                w: "16px",
                children: i + 1
              }), /* @__PURE__ */ jsx(Text, {
                fontSize: "sm",
                flex: 1,
                children: PROTOCOL_LABEL[p] || p
              }), /* @__PURE__ */ jsx(IconButton, {
                size: "xs",
                variant: "ghost",
                "aria-label": "up",
                icon: /* @__PURE__ */ jsx(ArrowUpIcon, {
                  width: 14,
                  height: 14
                }),
                isDisabled: i === 0,
                onClick: () => moveProtocol(i, -1)
              }), /* @__PURE__ */ jsx(IconButton, {
                size: "xs",
                variant: "ghost",
                "aria-label": "down",
                icon: /* @__PURE__ */ jsx(ArrowDownIcon, {
                  width: 14,
                  height: 14
                }),
                isDisabled: i === draft.protocol_order.length - 1,
                onClick: () => moveProtocol(i, 1)
              })]
            }, p))
          })]
        })]
      })
    }), /* @__PURE__ */ jsxs(Panel, {
      title: t("external.add"),
      help: scope ? t("external.adminAddHelp", {
        name: scope
      }) : t("external.help"),
      children: [/* @__PURE__ */ jsx(ConfigForm, {
        value: adding,
        groups: scope ? null : groups,
        onChange: setAdding
      }), /* @__PURE__ */ jsx(HStack, {
        justifyContent: "flex-end",
        mt: 4,
        children: /* @__PURE__ */ jsx(Button, {
          colorScheme: "primary",
          leftIcon: /* @__PURE__ */ jsx(PlusIcon, {
            ...icon
          }),
          isDisabled: !canAdd(adding),
          onClick: add,
          children: t("external.addButton")
        })
      })]
    }), /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        xl: 2
      },
      spacing: 4,
      alignItems: "start",
      children: [/* @__PURE__ */ jsx(Panel, {
        title: t("external.list"),
        help: draft.external_sort === "manual" ? t("external.listHelp") : t("external.listSortedHelp"),
        right: anyRunning ? /* @__PURE__ */ jsx(Spinner, {
          size: "sm",
          color: "primary.500"
        }) : void 0,
        children: /* @__PURE__ */ jsx(ConfigList, {
          configs: list,
          onChange: setList,
          groups: scope ? null : groups,
          statusOf,
          savedIds,
          onRefresh: refreshSource
        })
      }), /* @__PURE__ */ jsxs(Panel, {
        title: t("external.preview"),
        help: t("external.previewHelp"),
        children: [/* @__PURE__ */ jsx(Input, {
          size: "sm",
          mb: 3,
          placeholder: t("external.previewUser"),
          value: previewUser,
          onChange: (e) => setPreviewUser(e.target.value)
        }), previewError && /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "red.400",
          mb: 2,
          children: previewError
        }), preview && /* @__PURE__ */ jsxs(VStack, {
          align: "stretch",
          spacing: 1,
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            mb: 1,
            children: t("external.previewFor", {
              username: preview.username
            })
          }), preview.items.map((it, i) => /* @__PURE__ */ jsxs(HStack, {
            spacing: 2,
            fontSize: "sm",
            children: [/* @__PURE__ */ jsxs(Text, {
              color: "gray.500",
              w: "26px",
              textAlign: "right",
              flexShrink: 0,
              children: [i + 1, "."]
            }), /* @__PURE__ */ jsx(Badge, {
              colorScheme: it.source === "admin" ? "purple" : it.source === "external" ? "orange" : "primary",
              flexShrink: 0,
              children: it.source === "admin" ? t("external.adminBadge") : it.source === "external" ? t("external.ext") : t("external.own")
            }), /* @__PURE__ */ jsx(Text, {
              isTruncated: true,
              title: it.link,
              children: it.remark
            })]
          }, i)), preview.items.length === 0 && /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            children: t("external.previewEmpty")
          })]
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          mt: 3,
          children: t("external.formatsNote")
        })]
      })]
    })]
  });
};
const OwnExternalPage = () => {
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const {
    data: saved,
    refetch,
    isError
  } = useQuery({
    queryKey: "own-external",
    queryFn: () => fetch("/external-configs/mine"),
    retry: false
  });
  const {
    data: sources,
    refetch: refetchSources
  } = useQuery({
    queryKey: "external-sources",
    queryFn: () => fetch("/external-configs/sources"),
    refetchInterval: (d) => (d == null ? void 0 : d.some((x) => x.running)) ? 2500 : 3e4
  });
  const [draft, setDraft] = react.exports.useState(null);
  const [adding, setAdding] = react.exports.useState(empty());
  const [saving, setSaving] = react.exports.useState(false);
  react.exports.useEffect(() => {
    if (saved)
      setDraft(saved.configs);
  }, [saved]);
  if (isError)
    return /* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      color: "gray.500",
      children: t("external.notAllowed")
    });
  if (!draft || !saved)
    return null;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved.configs);
  const save = () => {
    setSaving(true);
    fetch("/external-configs/mine", {
      method: "PUT",
      body: {
        ...saved,
        configs: draft
      }
    }).then(() => {
      toast({
        status: "success",
        title: t("external.saved"),
        duration: 1500
      });
      refetch();
      refetchSources();
    }).catch((e) => {
      var _a;
      return toast({
        status: "error",
        title: t("external.saveError"),
        description: (_a = e == null ? void 0 : e.data) == null ? void 0 : _a.detail,
        duration: 4e3
      });
    }).finally(() => setSaving(false));
  };
  const refreshSource = (id) => fetch(`/external-configs/sources/${id}/refresh`, {
    method: "POST"
  }).then(() => setTimeout(() => refetchSources(), 300)).catch((e) => {
    var _a;
    return toast({
      status: "error",
      title: ((_a = e == null ? void 0 : e.data) == null ? void 0 : _a.detail) || t("external.saveError"),
      duration: 3e3
    });
  });
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 4,
    children: [!saved.enabled && /* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      color: "orange.400",
      children: t("external.ownOff")
    }), /* @__PURE__ */ jsxs(Panel, {
      title: t("external.add"),
      help: t("external.ownHelp"),
      children: [/* @__PURE__ */ jsx(ConfigForm, {
        value: adding,
        groups: null,
        onChange: setAdding
      }), /* @__PURE__ */ jsx(HStack, {
        justifyContent: "flex-end",
        mt: 4,
        children: /* @__PURE__ */ jsx(Button, {
          colorScheme: "primary",
          leftIcon: /* @__PURE__ */ jsx(PlusIcon, {
            ...icon
          }),
          isDisabled: !canAdd(adding),
          onClick: () => {
            setDraft([...draft, adding]);
            setAdding(empty(adding.kind));
          },
          children: t("external.addButton")
        })
      })]
    }), /* @__PURE__ */ jsx(Panel, {
      title: t("external.list"),
      help: t("external.listHelp"),
      right: /* @__PURE__ */ jsx(Button, {
        size: "sm",
        colorScheme: "primary",
        isDisabled: !dirty,
        isLoading: saving,
        onClick: save,
        children: t("external.save")
      }),
      children: /* @__PURE__ */ jsx(ConfigList, {
        configs: draft,
        onChange: setDraft,
        groups: null,
        statusOf: (id) => sources == null ? void 0 : sources.find((x) => x.id === id),
        savedIds: new Set(saved.configs.map((c) => c.id)),
        onRefresh: refreshSource
      })
    })]
  });
};
export {
  ExternalConfigsPage
};
