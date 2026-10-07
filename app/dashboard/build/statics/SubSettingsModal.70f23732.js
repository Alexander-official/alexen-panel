import { f as fetch, u as useDashboardPick, M as Modal, d as ModalOverlay, e as ModalContent, h as ModalHeader, i as ModalCloseButton, j as ModalBody, n as ModalFooter } from "./index.e0e646b5.js";
import { u as useTranslation, c as react, h as jsxs, ah as VStack, k as jsx, T as Text, H as HStack, o as Button, K as SimpleGrid, N as Box, bJ as Textarea, a7 as Input, aa as Select, ak as Switch, br as Tabs, bs as TabList, bt as Tab, bu as TabPanels, bv as TabPanel, a9 as IconButton, cA as ArrowUpIcon, cB as ArrowDownIcon, a5 as InputGroup, a6 as InputLeftElement, ai as Icon, _ as MagnifyingGlassIcon, at as Menu, au as MenuButton, cm as PlusIcon, av as MenuList, aw as MenuItem, b3 as FormControl, b4 as FormLabel, aj as Tooltip, cO as StarIcon$1, bQ as ChevronDownIcon, a0 as XMarkIcon, az as Collapse, V as TrashIcon, bU as DevicePhoneMobileIcon, ag as ComputerDesktopIcon, a1 as ArrowPathIcon, W as useToast, cl as Code, ck as Divider } from "./vendor.0404bf65.js";
import { DomainSettingsPage } from "./DomainSettingsPage.24c465f6.js";
const emptyJsonSub = {
  clients: [],
  direct_domains: [],
  direct_ips: [],
  block_ads: false,
  include_external: true,
  balancer: false,
  balancer_external: true,
  balancer_name: "\u26A1 Auto (fastest)",
  balancer_strategy: "leastPing",
  balancer_position: "top",
  probe_url: "https://www.gstatic.com/generate_204",
  probe_interval: "1m"
};
const CLIENTS = [{
  id: "v2rayng",
  label: "v2rayNG"
}, {
  id: "v2rayn",
  label: "v2rayN"
}, {
  id: "happ",
  label: "Happ"
}, {
  id: "streisand",
  label: "Streisand"
}];
const PRESETS = [{
  key: "private",
  domains: [],
  ips: ["geoip:private"]
}, {
  key: "ru",
  domains: ["geosite:category-ru", "domain:ru", "domain:su", "domain:xn--p1ai"],
  ips: ["geoip:ru"]
}, {
  key: "ir",
  domains: ["geosite:category-ir", "domain:ir"],
  ips: ["geoip:ir"]
}, {
  key: "cn",
  domains: ["geosite:cn"],
  ips: ["geoip:cn"]
}, {
  key: "tr",
  domains: ["domain:tr"],
  ips: ["geoip:tr"]
}];
const lines = (v) => v.split(/[\n,]/).map((x) => x.trim()).filter(Boolean);
const Toggle$1 = ({
  label,
  help,
  value,
  onChange
}) => /* @__PURE__ */ jsxs(HStack, {
  justify: "space-between",
  align: "flex-start",
  spacing: 4,
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
    isChecked: value,
    onChange: (e) => onChange(e.target.checked)
  })]
});
const Section = ({
  title,
  children
}) => /* @__PURE__ */ jsxs(Box, {
  p: 3,
  borderRadius: "lg",
  border: "1px solid",
  borderColor: "light-border",
  _dark: {
    borderColor: "gray.600"
  },
  children: [/* @__PURE__ */ jsx(Text, {
    fontSize: "sm",
    fontWeight: "semibold",
    mb: 2,
    children: title
  }), /* @__PURE__ */ jsx(VStack, {
    align: "stretch",
    spacing: 3,
    children
  })]
});
const JsonSubSettingsPanel = ({
  value,
  onChange
}) => {
  const {
    t
  } = useTranslation();
  const set = (p) => onChange({
    ...value,
    ...p
  });
  const [domains, setDomains] = react.exports.useState(value.direct_domains.join("\n"));
  const [ips, setIps] = react.exports.useState(value.direct_ips.join("\n"));
  react.exports.useEffect(() => {
    if (lines(domains).join() !== value.direct_domains.join())
      setDomains(value.direct_domains.join("\n"));
    if (lines(ips).join() !== value.direct_ips.join())
      setIps(value.direct_ips.join("\n"));
  }, [value.direct_domains, value.direct_ips]);
  const addPreset = (p) => {
    const d = Array.from(/* @__PURE__ */ new Set([...value.direct_domains, ...p.domains]));
    const i = Array.from(/* @__PURE__ */ new Set([...value.direct_ips, ...p.ips]));
    set({
      direct_domains: d,
      direct_ips: i
    });
  };
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 4,
    children: [/* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      children: t("jsonSub.help")
    }), /* @__PURE__ */ jsxs(Section, {
      title: t("jsonSub.clients"),
      children: [/* @__PURE__ */ jsx(HStack, {
        spacing: 1.5,
        flexWrap: "wrap",
        rowGap: 1.5,
        children: CLIENTS.map((c) => {
          const on = value.clients.includes(c.id);
          return /* @__PURE__ */ jsx(Button, {
            size: "xs",
            borderRadius: "full",
            colorScheme: "primary",
            variant: on ? "solid" : "outline",
            onClick: () => set({
              clients: on ? value.clients.filter((x) => x !== c.id) : [...value.clients, c.id]
            }),
            children: c.label
          }, c.id);
        })
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        children: t("jsonSub.clientsHelp")
      })]
    }), /* @__PURE__ */ jsxs(Section, {
      title: t("jsonSub.direct"),
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        children: t("jsonSub.directHelp")
      }), /* @__PURE__ */ jsx(HStack, {
        spacing: 1.5,
        flexWrap: "wrap",
        rowGap: 1.5,
        children: PRESETS.map((p) => /* @__PURE__ */ jsxs(Button, {
          size: "xs",
          borderRadius: "full",
          variant: "outline",
          onClick: () => addPreset(p),
          children: ["+ ", t(`jsonSub.preset.${p.key}`)]
        }, p.key))
      }), /* @__PURE__ */ jsxs(SimpleGrid, {
        columns: {
          base: 1,
          sm: 2
        },
        spacing: 3,
        children: [/* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            opacity: 0.75,
            mb: 1,
            children: t("jsonSub.domains")
          }), /* @__PURE__ */ jsx(Textarea, {
            size: "sm",
            rows: 6,
            fontFamily: "mono",
            fontSize: "xs",
            placeholder: "geosite:category-ru\ndomain:example.com\nfull:www.site.com",
            value: domains,
            onChange: (e) => {
              setDomains(e.target.value);
              set({
                direct_domains: lines(e.target.value)
              });
            }
          })]
        }), /* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            opacity: 0.75,
            mb: 1,
            children: t("jsonSub.ips")
          }), /* @__PURE__ */ jsx(Textarea, {
            size: "sm",
            rows: 6,
            fontFamily: "mono",
            fontSize: "xs",
            placeholder: "geoip:private\ngeoip:ru\n1.2.3.0/24",
            value: ips,
            onChange: (e) => {
              setIps(e.target.value);
              set({
                direct_ips: lines(e.target.value)
              });
            }
          })]
        })]
      }), /* @__PURE__ */ jsx(Toggle$1, {
        label: t("jsonSub.blockAds"),
        value: value.block_ads,
        onChange: (v) => set({
          block_ads: v
        })
      })]
    }), /* @__PURE__ */ jsxs(Section, {
      title: t("jsonSub.configs"),
      children: [/* @__PURE__ */ jsx(Toggle$1, {
        label: t("jsonSub.includeExternal"),
        help: t("jsonSub.includeExternalHelp"),
        value: value.include_external,
        onChange: (v) => set({
          include_external: v
        })
      }), /* @__PURE__ */ jsx(Toggle$1, {
        label: t("jsonSub.balancer"),
        help: t("jsonSub.balancerHelp"),
        value: value.balancer,
        onChange: (v) => set({
          balancer: v
        })
      }), value.balancer && value.include_external && /* @__PURE__ */ jsx(Toggle$1, {
        label: t("jsonSub.balancerExternal"),
        help: t("jsonSub.balancerExternalHelp"),
        value: value.balancer_external !== false,
        onChange: (v) => set({
          balancer_external: v
        })
      }), value.balancer && /* @__PURE__ */ jsxs(SimpleGrid, {
        columns: {
          base: 1,
          sm: 2
        },
        spacing: 3,
        children: [/* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            opacity: 0.75,
            mb: 1,
            children: t("jsonSub.balancerName")
          }), /* @__PURE__ */ jsx(Input, {
            size: "sm",
            value: value.balancer_name,
            onChange: (e) => set({
              balancer_name: e.target.value
            })
          })]
        }), /* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            opacity: 0.75,
            mb: 1,
            children: t("jsonSub.strategy")
          }), /* @__PURE__ */ jsx(Select, {
            size: "sm",
            value: value.balancer_strategy,
            onChange: (e) => set({
              balancer_strategy: e.target.value
            }),
            children: ["leastPing", "leastLoad", "roundRobin", "random"].map((s) => /* @__PURE__ */ jsx("option", {
              value: s,
              children: t(`jsonSub.strategyName.${s}`)
            }, s))
          })]
        }), /* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            opacity: 0.75,
            mb: 1,
            children: t("jsonSub.position")
          }), /* @__PURE__ */ jsxs(Select, {
            size: "sm",
            value: value.balancer_position,
            onChange: (e) => set({
              balancer_position: e.target.value
            }),
            children: [/* @__PURE__ */ jsx("option", {
              value: "top",
              children: t("jsonSub.top")
            }), /* @__PURE__ */ jsx("option", {
              value: "bottom",
              children: t("jsonSub.bottom")
            })]
          })]
        }), /* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            opacity: 0.75,
            mb: 1,
            children: t("jsonSub.probeInterval")
          }), /* @__PURE__ */ jsx(Select, {
            size: "sm",
            value: value.probe_interval,
            onChange: (e) => set({
              probe_interval: e.target.value
            }),
            children: ["30s", "1m", "2m", "5m", "10m"].map((s) => /* @__PURE__ */ jsx("option", {
              value: s,
              children: s
            }, s))
          })]
        }), /* @__PURE__ */ jsxs(Box, {
          gridColumn: "1 / -1",
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            opacity: 0.75,
            mb: 1,
            children: t("jsonSub.probeUrl")
          }), /* @__PURE__ */ jsx(Input, {
            size: "sm",
            fontFamily: "mono",
            fontSize: "xs",
            value: value.probe_url,
            onChange: (e) => set({
              probe_url: e.target.value
            })
          })]
        })]
      })]
    })]
  });
};
function StarIcon({
  title,
  titleId,
  ...props
}, svgRef) {
  return /* @__PURE__ */ jsxs("svg", {
    ...Object.assign({
      xmlns: "http://www.w3.org/2000/svg",
      viewBox: "0 0 24 24",
      fill: "currentColor",
      "aria-hidden": "true",
      ref: svgRef,
      "aria-labelledby": titleId
    }, props),
    children: [title ? /* @__PURE__ */ jsx("title", {
      id: titleId,
      children: title
    }) : null, /* @__PURE__ */ jsx("path", {
      fillRule: "evenodd",
      d: "M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z",
      clipRule: "evenodd"
    })]
  });
}
const ForwardRef = react.exports.forwardRef(StarIcon);
const StarSolid = ForwardRef;
const emptyDefaults = {
  apps: {},
  texts: {},
  sections: [],
  platforms: []
};
const emptyWebPage = {
  enabled: true,
  title: "",
  logo_url: "",
  support_url: "",
  accent: "#5b7cfa",
  theme: "auto",
  style: "soft",
  default_lang: "auto",
  languages: ["en", "tr", "tk", "ru", "fa", "zh"],
  happ_crypt: true,
  show_links: true,
  show_qr: true,
  sections: ["announce", "intro", "user", "devices", "install", "vpn", "link", "configs"].map((id) => ({
    id,
    enabled: true
  })),
  intro: {},
  footer: {},
  texts: {},
  custom_css: "",
  apps: null,
  link_domain: "",
  show_devices: true,
  lock_on_device_limit: true
};
const LANGS = [["en", "English"], ["tr", "T\xFCrk\xE7e"], ["tk", "T\xFCrkmen\xE7e"], ["ru", "\u0420\u0443\u0441\u0441\u043A\u0438\u0439"], ["fa", "\u0641\u0627\u0631\u0633\u06CC"], ["zh", "\u4E2D\u6587"]];
const PLATFORM_NAMES = {
  ios: "iOS",
  android: "Android",
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  androidTV: "Android TV",
  appleTV: "Apple TV"
};
const ACCENTS = ["#5b7cfa", "#7c6cf2", "#a26cf0", "#e46f9f", "#ef7a6b", "#e9a23b", "#3fb68b", "#2fb3c6", "#64748b"];
const soft = {
  borderRadius: "14px",
  bg: "blackAlpha.50",
  _dark: {
    bg: "whiteAlpha.50"
  }
};
const Toggle = ({
  label,
  help,
  on,
  onChange
}) => /* @__PURE__ */ jsxs(HStack, {
  ...soft,
  p: 3,
  spacing: 3,
  align: "flex-start",
  children: [/* @__PURE__ */ jsx(Switch, {
    size: "sm",
    mt: 0.5,
    colorScheme: "primary",
    isChecked: on,
    onChange: (e) => onChange(e.target.checked)
  }), /* @__PURE__ */ jsxs(Box, {
    children: [/* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      children: label
    }), help && /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      children: help
    })]
  })]
});
const Field = ({
  label,
  help,
  children
}) => /* @__PURE__ */ jsxs(FormControl, {
  children: [/* @__PURE__ */ jsx(FormLabel, {
    fontSize: "sm",
    mb: 1,
    children: label
  }), children, help && /* @__PURE__ */ jsx(Text, {
    fontSize: "xs",
    color: "gray.500",
    mt: 1,
    children: help
  })]
});
const LangSelect = ({
  value,
  onChange,
  any,
  langs
}) => {
  const {
    t
  } = useTranslation();
  return /* @__PURE__ */ jsxs(Select, {
    size: "sm",
    w: "auto",
    borderRadius: "10px",
    value,
    onChange: (e) => onChange(e.target.value),
    children: [any && /* @__PURE__ */ jsx("option", {
      value: "",
      children: t("webpage.anyLang")
    }), LANGS.filter(([k]) => !langs || langs.includes(k)).map(([k, n]) => /* @__PURE__ */ jsx("option", {
      value: k,
      children: n
    }, k))]
  });
};
const PerLang = ({
  value,
  onChange,
  rows = 3,
  placeholder
}) => {
  const [lang, setLang] = react.exports.useState("");
  const filled = Object.keys(value).filter((k) => value[k]);
  return /* @__PURE__ */ jsxs(Box, {
    children: [/* @__PURE__ */ jsxs(HStack, {
      mb: 2,
      spacing: 2,
      flexWrap: "wrap",
      children: [/* @__PURE__ */ jsx(LangSelect, {
        value: lang,
        onChange: setLang,
        any: true
      }), filled.length > 0 && /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        children: filled.map((k) => k === "" ? "*" : k).join(" \xB7 ")
      })]
    }), /* @__PURE__ */ jsx(Textarea, {
      size: "sm",
      rows,
      borderRadius: "12px",
      placeholder,
      value: value[lang] || "",
      onChange: (e) => onChange({
        ...value,
        [lang]: e.target.value
      })
    })]
  });
};
const Mini = ({
  kind,
  on,
  label,
  onClick
}) => {
  const look = {
    soft: {
      bg: "white",
      boxShadow: "0 4px 14px rgba(16,24,40,.08)",
      border: "1px solid rgba(15,23,42,.06)"
    },
    glass: {
      bg: "rgba(255,255,255,.45)",
      boxShadow: "0 8px 24px rgba(31,38,135,.15), inset 0 1px 0 rgba(255,255,255,.8)",
      border: "1px solid rgba(255,255,255,.6)",
      backdropFilter: "blur(8px)"
    },
    clay: {
      bg: "#eef1f6",
      boxShadow: "6px 6px 14px rgba(15,23,42,.12), -6px -6px 14px #fff, inset 2px 2px 3px #fff"
    }
  }[kind];
  return /* @__PURE__ */ jsxs(Box, {
    as: "button",
    type: "button",
    onClick,
    borderRadius: "16px",
    p: 3,
    textAlign: "left",
    borderWidth: "2px",
    borderColor: on ? "primary.400" : "transparent",
    bg: kind === "glass" ? "linear-gradient(135deg,#c7d2fe,#fbcfe8,#a5f3fc)" : "#eef1f6",
    transition: "border-color .15s",
    children: [/* @__PURE__ */ jsxs(Box, {
      h: "54px",
      borderRadius: kind === "clay" ? "18px" : "12px",
      ...look,
      p: 2,
      children: [/* @__PURE__ */ jsx(Box, {
        h: "8px",
        w: "60%",
        borderRadius: "full",
        bg: "rgba(15,23,42,.18)",
        mb: 2
      }), /* @__PURE__ */ jsx(Box, {
        h: "8px",
        w: "40%",
        borderRadius: "full",
        bg: "var(--chakra-colors-primary-400)"
      })]
    }), /* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      fontWeight: "medium",
      mt: 2,
      color: "gray.700",
      children: label
    })]
  });
};
const AppEditor = ({
  app,
  presets,
  crypt,
  first,
  last,
  onChange,
  onMove,
  onDelete
}) => {
  const {
    t
  } = useTranslation();
  const [open, setOpen] = react.exports.useState(false);
  const set = (p) => onChange({
    ...app,
    ...p
  });
  return /* @__PURE__ */ jsxs(Box, {
    ...soft,
    children: [/* @__PURE__ */ jsxs(HStack, {
      px: 3,
      py: 2,
      spacing: 2,
      children: [/* @__PURE__ */ jsx(Tooltip, {
        label: t("webpage.featured"),
        hasArrow: true,
        children: /* @__PURE__ */ jsx(IconButton, {
          size: "xs",
          variant: "ghost",
          borderRadius: "full",
          "aria-label": "featured",
          color: app.featured ? "orange.400" : "gray.400",
          icon: app.featured ? /* @__PURE__ */ jsx(StarSolid, {
            width: 16
          }) : /* @__PURE__ */ jsx(StarIcon$1, {
            width: 16
          }),
          onClick: () => set({
            featured: !app.featured
          })
        })
      }), /* @__PURE__ */ jsxs(Box, {
        flex: "1",
        minW: 0,
        cursor: "pointer",
        onClick: () => setOpen((o) => !o),
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          fontWeight: "medium",
          children: app.name || "\u2014"
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          fontFamily: "mono",
          isTruncated: true,
          children: app.crypt && crypt ? "happ://crypt5/\u2026" : app.deeplink || t("webpage.copyOnly")
        })]
      }), /* @__PURE__ */ jsx(IconButton, {
        size: "xs",
        variant: "ghost",
        "aria-label": "up",
        icon: /* @__PURE__ */ jsx(ArrowUpIcon, {
          width: 14
        }),
        isDisabled: first,
        onClick: () => onMove(-1)
      }), /* @__PURE__ */ jsx(IconButton, {
        size: "xs",
        variant: "ghost",
        "aria-label": "down",
        icon: /* @__PURE__ */ jsx(ArrowDownIcon, {
          width: 14
        }),
        isDisabled: last,
        onClick: () => onMove(1)
      }), /* @__PURE__ */ jsx(IconButton, {
        size: "xs",
        variant: "ghost",
        "aria-label": "edit",
        icon: /* @__PURE__ */ jsx(ChevronDownIcon, {
          width: 16,
          style: {
            transform: open ? "rotate(180deg)" : void 0,
            transition: "transform .2s"
          }
        }),
        onClick: () => setOpen((o) => !o)
      }), /* @__PURE__ */ jsx(IconButton, {
        size: "xs",
        variant: "ghost",
        colorScheme: "red",
        "aria-label": "hide",
        icon: /* @__PURE__ */ jsx(XMarkIcon, {
          width: 16
        }),
        onClick: onDelete
      })]
    }), /* @__PURE__ */ jsx(Collapse, {
      in: open,
      animateOpacity: true,
      unmountOnExit: true,
      children: /* @__PURE__ */ jsxs(VStack, {
        align: "stretch",
        spacing: 3,
        px: 3,
        pb: 3,
        children: [/* @__PURE__ */ jsxs(SimpleGrid, {
          columns: {
            base: 1,
            md: 2
          },
          spacing: 3,
          children: [/* @__PURE__ */ jsx(Field, {
            label: t("webpage.appName"),
            children: /* @__PURE__ */ jsx(Input, {
              size: "sm",
              borderRadius: "10px",
              value: app.name,
              onChange: (e) => set({
                name: e.target.value
              })
            })
          }), /* @__PURE__ */ jsx(Field, {
            label: "ID",
            children: /* @__PURE__ */ jsx(Input, {
              size: "sm",
              borderRadius: "10px",
              fontFamily: "mono",
              value: app.id,
              onChange: (e) => set({
                id: e.target.value
              })
            })
          })]
        }), /* @__PURE__ */ jsx(Field, {
          label: t("webpage.deeplink"),
          help: t("webpage.deeplinkHelp"),
          children: /* @__PURE__ */ jsxs(HStack, {
            children: [/* @__PURE__ */ jsx(Input, {
              size: "sm",
              borderRadius: "10px",
              fontFamily: "mono",
              placeholder: t("webpage.copyOnly"),
              value: app.deeplink,
              onChange: (e) => set({
                deeplink: e.target.value
              })
            }), /* @__PURE__ */ jsxs(Menu, {
              isLazy: true,
              placement: "bottom-end",
              children: [/* @__PURE__ */ jsx(MenuButton, {
                as: Button,
                size: "sm",
                variant: "outline",
                rightIcon: /* @__PURE__ */ jsx(ChevronDownIcon, {
                  width: 14
                }),
                flexShrink: 0,
                children: t("webpage.presets")
              }), /* @__PURE__ */ jsx(MenuList, {
                maxH: "300px",
                overflowY: "auto",
                fontSize: "xs",
                fontFamily: "mono",
                children: presets.map((p) => /* @__PURE__ */ jsx(MenuItem, {
                  onClick: () => set({
                    deeplink: p
                  }),
                  children: p
                }, p))
              })]
            })]
          })
        }), /* @__PURE__ */ jsxs(HStack, {
          spacing: 3,
          children: [/* @__PURE__ */ jsx(Switch, {
            size: "sm",
            colorScheme: "primary",
            isChecked: app.crypt,
            onChange: (e) => set({
              crypt: e.target.checked
            })
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "sm",
            children: t("webpage.appCrypt")
          })]
        }), /* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "sm",
            mb: 1,
            children: t("webpage.installButtons")
          }), /* @__PURE__ */ jsxs(VStack, {
            align: "stretch",
            spacing: 2,
            children: [app.install.map((b, i) => /* @__PURE__ */ jsxs(HStack, {
              children: [/* @__PURE__ */ jsx(Input, {
                size: "sm",
                w: "150px",
                borderRadius: "10px",
                placeholder: "App Store",
                value: b.label,
                onChange: (e) => set({
                  install: app.install.map((x, n) => n === i ? {
                    ...x,
                    label: e.target.value
                  } : x)
                })
              }), /* @__PURE__ */ jsx(Input, {
                size: "sm",
                borderRadius: "10px",
                fontFamily: "mono",
                placeholder: "https://",
                value: b.url,
                onChange: (e) => set({
                  install: app.install.map((x, n) => n === i ? {
                    ...x,
                    url: e.target.value
                  } : x)
                })
              }), /* @__PURE__ */ jsx(IconButton, {
                size: "sm",
                variant: "ghost",
                "aria-label": "remove",
                icon: /* @__PURE__ */ jsx(TrashIcon, {
                  width: 14
                }),
                onClick: () => set({
                  install: app.install.filter((_, n) => n !== i)
                })
              })]
            }, i)), /* @__PURE__ */ jsx(Button, {
              size: "xs",
              variant: "ghost",
              alignSelf: "flex-start",
              leftIcon: /* @__PURE__ */ jsx(PlusIcon, {
                width: 12
              }),
              onClick: () => set({
                install: [...app.install, {
                  label: "",
                  url: ""
                }]
              }),
              children: t("webpage.addButton")
            })]
          })]
        }), /* @__PURE__ */ jsx(Field, {
          label: t("webpage.note"),
          help: t("webpage.noteHelp"),
          children: /* @__PURE__ */ jsx(PerLang, {
            value: app.note || {},
            onChange: (note) => set({
              note
            }),
            rows: 2
          })
        })]
      })
    })]
  });
};
const Preview = ({
  value
}) => {
  const {
    t
  } = useTranslation();
  const [html, setHtml] = react.exports.useState("");
  const [error, setError] = react.exports.useState("");
  const [username, setUsername] = react.exports.useState("");
  const [width, setWidth] = react.exports.useState("phone");
  const [tick, setTick] = react.exports.useState(0);
  const timer = react.exports.useRef();
  react.exports.useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      fetch("/sub-webpage/preview", {
        method: "POST",
        body: {
          settings: value,
          username: username || null
        }
      }).then((h) => {
        setHtml(String(h));
        setError("");
      }).catch((e) => {
        var _a, _b;
        return setError(((_b = (_a = e == null ? void 0 : e.response) == null ? void 0 : _a._data) == null ? void 0 : _b.detail) || (e == null ? void 0 : e.message) || "Error");
      });
    }, 400);
    return () => window.clearTimeout(timer.current);
  }, [value, username, tick]);
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 3,
    children: [/* @__PURE__ */ jsxs(HStack, {
      spacing: 2,
      flexWrap: "wrap",
      rowGap: 2,
      children: [/* @__PURE__ */ jsx(Input, {
        size: "sm",
        w: "220px",
        borderRadius: "10px",
        placeholder: t("webpage.previewUser"),
        value: username,
        onChange: (e) => setUsername(e.target.value)
      }), /* @__PURE__ */ jsx(IconButton, {
        size: "sm",
        "aria-label": "phone",
        variant: width === "phone" ? "solid" : "ghost",
        icon: /* @__PURE__ */ jsx(DevicePhoneMobileIcon, {
          width: 16
        }),
        onClick: () => setWidth("phone")
      }), /* @__PURE__ */ jsx(IconButton, {
        size: "sm",
        "aria-label": "desktop",
        variant: width === "desktop" ? "solid" : "ghost",
        icon: /* @__PURE__ */ jsx(ComputerDesktopIcon, {
          width: 16
        }),
        onClick: () => setWidth("desktop")
      }), /* @__PURE__ */ jsx(IconButton, {
        size: "sm",
        variant: "ghost",
        "aria-label": "reload",
        icon: /* @__PURE__ */ jsx(ArrowPathIcon, {
          width: 16
        }),
        onClick: () => setTick((x) => x + 1)
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        children: t("webpage.previewHelp")
      })]
    }), error ? /* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      color: "red.400",
      children: error
    }) : /* @__PURE__ */ jsx(Box, {
      alignSelf: "center",
      w: width === "phone" ? "390px" : "100%",
      maxW: "100%",
      h: "720px",
      borderRadius: width === "phone" ? "32px" : "16px",
      overflow: "hidden",
      borderWidth: width === "phone" ? "8px" : "1px",
      borderColor: "blackAlpha.200",
      _dark: {
        borderColor: "whiteAlpha.200"
      },
      boxShadow: "var(--alexen-shadow)",
      bg: "white",
      children: /* @__PURE__ */ jsx("iframe", {
        title: "preview",
        srcDoc: html,
        sandbox: "allow-scripts",
        style: {
          width: "100%",
          height: "100%",
          border: 0
        }
      })
    })]
  });
};
const SubWebPagePanel = ({
  value,
  defaults,
  onChange
}) => {
  var _a, _b;
  const {
    t
  } = useTranslation();
  const set = (p) => onChange({
    ...value,
    ...p
  });
  const platforms = defaults.platforms.length ? defaults.platforms : Object.keys(PLATFORM_NAMES);
  const [plat, setPlat] = react.exports.useState(0);
  const catalog = (_a = value.apps) != null ? _a : defaults.apps;
  const key = platforms[plat] || "ios";
  const list = catalog[key] || [];
  const setList = (next) => set({
    apps: {
      ...catalog,
      [key]: next
    }
  });
  const move = (i, d) => {
    const n = [...list];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    setList(n);
  };
  const allApps = react.exports.useMemo(() => {
    const seen = {};
    Object.values(defaults.apps).forEach((apps) => apps.forEach((a) => seen[a.id] = seen[a.id] || a));
    return Object.values(seen);
  }, [defaults.apps]);
  const presets = react.exports.useMemo(() => Array.from(new Set(allApps.map((a) => a.deeplink).filter(Boolean))).concat(["happ://add/{url}", "{crypt}"]).filter((v, i, a) => a.indexOf(v) === i), [allApps]);
  const [textLang, setTextLang] = react.exports.useState("tr");
  const [search, setSearch] = react.exports.useState("");
  const baseTexts = {
    ...defaults.texts.en || {},
    ...defaults.texts[textLang] || {}
  };
  const overrides = value.texts[textLang] || {};
  const setText = (k, v) => {
    const next = {
      ...overrides,
      [k]: v
    };
    if (!v)
      delete next[k];
    set({
      texts: {
        ...value.texts,
        [textLang]: next
      }
    });
  };
  const textKeys = Object.keys(defaults.texts.en || {}).filter((k) => !search || k.toLowerCase().includes(search.toLowerCase()) || (baseTexts[k] || "").toLowerCase().includes(search.toLowerCase()));
  const sections = react.exports.useMemo(() => {
    const order = value.sections.filter((x) => defaults.sections.includes(x.id));
    defaults.sections.forEach((id, i) => {
      if (order.some((x) => x.id === id))
        return;
      const before = defaults.sections.slice(0, i).filter((p) => order.some((x) => x.id === p));
      const pos = before.length ? order.findIndex((x) => x.id === before[before.length - 1]) + 1 : 0;
      order.splice(pos, 0, {
        id,
        enabled: true
      });
    });
    return order;
  }, [value.sections, defaults.sections]);
  const moveSection = (i, d) => {
    const n = [...sections];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    set({
      sections: n
    });
  };
  const [json, setJson] = react.exports.useState("");
  const [jsonError, setJsonError] = react.exports.useState("");
  return /* @__PURE__ */ jsxs(Tabs, {
    size: "sm",
    variant: "enclosed-colored",
    colorScheme: "primary",
    isLazy: true,
    onChange: (i) => i === 4 && setJson(JSON.stringify(catalog, null, 2)),
    children: [/* @__PURE__ */ jsx(TabList, {
      flexWrap: "wrap",
      borderBottomWidth: 0,
      gap: 1,
      mb: 4,
      children: ["general", "look", "content", "apps", "advanced", "preview"].map((k) => /* @__PURE__ */ jsx(Tab, {
        borderRadius: "10px",
        border: "0",
        _selected: {
          bg: "primary.500",
          color: "white"
        },
        children: t(`webpage.tab.${k}`)
      }, k))
    }), /* @__PURE__ */ jsxs(TabPanels, {
      children: [/* @__PURE__ */ jsx(TabPanel, {
        p: 0,
        children: /* @__PURE__ */ jsxs(VStack, {
          align: "stretch",
          spacing: 5,
          children: [/* @__PURE__ */ jsx(Toggle, {
            label: t("webpage.enabled"),
            help: t("webpage.enabledHelp"),
            on: value.enabled,
            onChange: (v) => set({
              enabled: v
            })
          }), /* @__PURE__ */ jsxs(SimpleGrid, {
            columns: {
              base: 1,
              md: 2
            },
            spacing: 4,
            children: [/* @__PURE__ */ jsx(Field, {
              label: t("webpage.title"),
              help: t("webpage.titleHelp"),
              children: /* @__PURE__ */ jsx(Input, {
                size: "sm",
                borderRadius: "10px",
                value: value.title,
                onChange: (e) => set({
                  title: e.target.value
                })
              })
            }), /* @__PURE__ */ jsx(Field, {
              label: t("webpage.support"),
              help: t("webpage.supportHelp"),
              children: /* @__PURE__ */ jsx(Input, {
                size: "sm",
                borderRadius: "10px",
                placeholder: "https://t.me/...",
                value: value.support_url,
                onChange: (e) => set({
                  support_url: e.target.value
                })
              })
            }), /* @__PURE__ */ jsx(Field, {
              label: t("webpage.logo"),
              children: /* @__PURE__ */ jsx(Input, {
                size: "sm",
                borderRadius: "10px",
                placeholder: "https://.../logo.png",
                value: value.logo_url,
                onChange: (e) => set({
                  logo_url: e.target.value
                })
              })
            }), /* @__PURE__ */ jsx(Field, {
              label: t("webpage.lang"),
              children: /* @__PURE__ */ jsxs(Select, {
                size: "sm",
                borderRadius: "10px",
                value: value.default_lang,
                onChange: (e) => set({
                  default_lang: e.target.value
                }),
                children: [/* @__PURE__ */ jsx("option", {
                  value: "auto",
                  children: t("webpage.langAuto")
                }), LANGS.filter(([k]) => value.languages.includes(k)).map(([k, n]) => /* @__PURE__ */ jsx("option", {
                  value: k,
                  children: n
                }, k))]
              })
            })]
          }), /* @__PURE__ */ jsx(Field, {
            label: t("webpage.languages"),
            help: t("webpage.languagesHelp"),
            children: /* @__PURE__ */ jsx(HStack, {
              spacing: 2,
              flexWrap: "wrap",
              rowGap: 2,
              children: LANGS.map(([k, n]) => {
                const on = value.languages.includes(k);
                return /* @__PURE__ */ jsx(Button, {
                  size: "xs",
                  borderRadius: "full",
                  variant: on ? "solid" : "outline",
                  colorScheme: "primary",
                  onClick: () => set({
                    languages: on ? value.languages.filter((x) => x !== k) : [...value.languages, k]
                  }),
                  isDisabled: on && value.languages.length === 1,
                  children: n
                }, k);
              })
            })
          }), /* @__PURE__ */ jsx(DomainSettingsPage, {
            embedded: true
          }), /* @__PURE__ */ jsx(Toggle, {
            label: t("webpage.showLink"),
            help: t("webpage.showLinkHelp"),
            on: ((_b = sections.find((x) => x.id === "link")) == null ? void 0 : _b.enabled) !== false,
            onChange: (v) => set({
              sections: sections.map((x) => x.id === "link" ? {
                ...x,
                enabled: v
              } : x)
            })
          }), /* @__PURE__ */ jsx(Field, {
            label: t("webpage.linkDomain"),
            help: t("webpage.linkDomainHelp"),
            children: /* @__PURE__ */ jsx(Input, {
              size: "sm",
              borderRadius: "10px",
              fontFamily: "mono",
              placeholder: "https://sub.example.com",
              value: value.link_domain,
              onChange: (e) => set({
                link_domain: e.target.value.trim()
              })
            })
          }), /* @__PURE__ */ jsxs(SimpleGrid, {
            columns: {
              base: 1,
              md: 2
            },
            spacing: 3,
            children: [/* @__PURE__ */ jsx(Toggle, {
              label: t("webpage.devices"),
              help: t("webpage.devicesHelp"),
              on: value.show_devices,
              onChange: (v) => set({
                show_devices: v
              })
            }), /* @__PURE__ */ jsx(Toggle, {
              label: t("webpage.lock"),
              help: t("webpage.lockHelp"),
              on: value.lock_on_device_limit,
              onChange: (v) => set({
                lock_on_device_limit: v
              })
            })]
          }), /* @__PURE__ */ jsxs(SimpleGrid, {
            columns: {
              base: 1,
              md: 3
            },
            spacing: 3,
            children: [/* @__PURE__ */ jsx(Toggle, {
              label: t("webpage.crypt"),
              help: t("webpage.cryptHelp"),
              on: value.happ_crypt,
              onChange: (v) => set({
                happ_crypt: v
              })
            }), /* @__PURE__ */ jsx(Toggle, {
              label: t("webpage.qr"),
              on: value.show_qr,
              onChange: (v) => set({
                show_qr: v
              })
            }), /* @__PURE__ */ jsx(Toggle, {
              label: t("webpage.links"),
              help: t("webpage.linksHelp"),
              on: value.show_links,
              onChange: (v) => set({
                show_links: v
              })
            })]
          })]
        })
      }), /* @__PURE__ */ jsx(TabPanel, {
        p: 0,
        children: /* @__PURE__ */ jsxs(VStack, {
          align: "stretch",
          spacing: 5,
          children: [/* @__PURE__ */ jsx(Field, {
            label: t("webpage.style"),
            children: /* @__PURE__ */ jsx(SimpleGrid, {
              columns: 3,
              spacing: 3,
              maxW: "520px",
              children: ["soft", "glass", "clay"].map((k) => /* @__PURE__ */ jsx(Mini, {
                kind: k,
                on: value.style === k,
                label: t(`webpage.style.${k}`),
                onClick: () => set({
                  style: k
                })
              }, k))
            })
          }), /* @__PURE__ */ jsx(Field, {
            label: t("webpage.theme"),
            children: /* @__PURE__ */ jsxs(Select, {
              size: "sm",
              maxW: "260px",
              borderRadius: "10px",
              value: value.theme,
              onChange: (e) => set({
                theme: e.target.value
              }),
              children: [/* @__PURE__ */ jsx("option", {
                value: "auto",
                children: t("webpage.themeAuto")
              }), /* @__PURE__ */ jsx("option", {
                value: "dark",
                children: t("webpage.themeDark")
              }), /* @__PURE__ */ jsx("option", {
                value: "light",
                children: t("webpage.themeLight")
              })]
            })
          }), /* @__PURE__ */ jsx(Field, {
            label: t("webpage.accent"),
            children: /* @__PURE__ */ jsxs(HStack, {
              spacing: 2,
              flexWrap: "wrap",
              rowGap: 2,
              children: [ACCENTS.map((c) => /* @__PURE__ */ jsx(Box, {
                as: "button",
                type: "button",
                w: "28px",
                h: "28px",
                borderRadius: "full",
                bg: c,
                onClick: () => set({
                  accent: c
                }),
                boxShadow: value.accent.toLowerCase() === c ? `0 0 0 2px var(--app-surface), 0 0 0 4px ${c}` : void 0,
                "aria-label": c
              }, c)), /* @__PURE__ */ jsx(Input, {
                type: "color",
                size: "sm",
                w: "44px",
                h: "30px",
                p: 0.5,
                borderRadius: "8px",
                value: value.accent,
                onChange: (e) => set({
                  accent: e.target.value
                })
              })]
            })
          })]
        })
      }), /* @__PURE__ */ jsx(TabPanel, {
        p: 0,
        children: /* @__PURE__ */ jsxs(VStack, {
          align: "stretch",
          spacing: 6,
          children: [/* @__PURE__ */ jsxs(Box, {
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              fontWeight: "medium",
              children: t("webpage.sections")
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "xs",
              color: "gray.500",
              mb: 2,
              children: t("webpage.sectionsHelp")
            }), /* @__PURE__ */ jsx(VStack, {
              align: "stretch",
              spacing: 2,
              children: sections.map((s, i) => /* @__PURE__ */ jsxs(HStack, {
                ...soft,
                px: 3,
                py: 2,
                children: [/* @__PURE__ */ jsx(Switch, {
                  size: "sm",
                  colorScheme: "primary",
                  isChecked: s.enabled,
                  onChange: (e) => set({
                    sections: sections.map((x, n) => n === i ? {
                      ...x,
                      enabled: e.target.checked
                    } : x)
                  })
                }), /* @__PURE__ */ jsx(Text, {
                  fontSize: "sm",
                  flex: "1",
                  children: t(`webpage.section.${s.id}`)
                }), /* @__PURE__ */ jsx(IconButton, {
                  size: "xs",
                  variant: "ghost",
                  "aria-label": "up",
                  icon: /* @__PURE__ */ jsx(ArrowUpIcon, {
                    width: 14
                  }),
                  isDisabled: i === 0,
                  onClick: () => moveSection(i, -1)
                }), /* @__PURE__ */ jsx(IconButton, {
                  size: "xs",
                  variant: "ghost",
                  "aria-label": "down",
                  icon: /* @__PURE__ */ jsx(ArrowDownIcon, {
                    width: 14
                  }),
                  isDisabled: i === sections.length - 1,
                  onClick: () => moveSection(i, 1)
                })]
              }, s.id))
            })]
          }), /* @__PURE__ */ jsxs(SimpleGrid, {
            columns: {
              base: 1,
              md: 2
            },
            spacing: 4,
            children: [/* @__PURE__ */ jsx(Field, {
              label: t("webpage.intro"),
              help: t("webpage.introHelp"),
              children: /* @__PURE__ */ jsx(PerLang, {
                value: value.intro,
                onChange: (intro) => set({
                  intro
                }),
                rows: 4
              })
            }), /* @__PURE__ */ jsx(Field, {
              label: t("webpage.footer"),
              help: t("webpage.footerHelp"),
              children: /* @__PURE__ */ jsx(PerLang, {
                value: value.footer,
                onChange: (footer) => set({
                  footer
                }),
                rows: 4
              })
            })]
          }), /* @__PURE__ */ jsxs(Box, {
            children: [/* @__PURE__ */ jsxs(HStack, {
              justify: "space-between",
              flexWrap: "wrap",
              rowGap: 2,
              mb: 2,
              children: [/* @__PURE__ */ jsxs(Box, {
                children: [/* @__PURE__ */ jsx(Text, {
                  fontSize: "sm",
                  fontWeight: "medium",
                  children: t("webpage.texts")
                }), /* @__PURE__ */ jsx(Text, {
                  fontSize: "xs",
                  color: "gray.500",
                  children: t("webpage.textsHelp")
                })]
              }), /* @__PURE__ */ jsxs(HStack, {
                children: [/* @__PURE__ */ jsxs(InputGroup, {
                  size: "sm",
                  w: "180px",
                  children: [/* @__PURE__ */ jsx(InputLeftElement, {
                    pointerEvents: "none",
                    children: /* @__PURE__ */ jsx(Icon, {
                      as: MagnifyingGlassIcon,
                      boxSize: "14px",
                      color: "gray.400"
                    })
                  }), /* @__PURE__ */ jsx(Input, {
                    borderRadius: "10px",
                    value: search,
                    onChange: (e) => setSearch(e.target.value)
                  })]
                }), /* @__PURE__ */ jsx(LangSelect, {
                  value: textLang,
                  onChange: setTextLang
                })]
              })]
            }), /* @__PURE__ */ jsx(VStack, {
              align: "stretch",
              spacing: 2,
              maxH: "460px",
              overflowY: "auto",
              pr: 1,
              children: textKeys.map((k) => /* @__PURE__ */ jsxs(HStack, {
                spacing: 3,
                align: "center",
                children: [/* @__PURE__ */ jsx(Text, {
                  fontSize: "xs",
                  color: "gray.500",
                  fontFamily: "mono",
                  w: "130px",
                  flexShrink: 0,
                  isTruncated: true,
                  title: k,
                  children: k
                }), /* @__PURE__ */ jsx(Input, {
                  size: "sm",
                  borderRadius: "10px",
                  placeholder: baseTexts[k],
                  value: overrides[k] || "",
                  onChange: (e) => setText(k, e.target.value),
                  borderColor: overrides[k] ? "primary.300" : void 0
                })]
              }, k))
            })]
          })]
        })
      }), /* @__PURE__ */ jsxs(TabPanel, {
        p: 0,
        children: [/* @__PURE__ */ jsxs(HStack, {
          mb: 3,
          justify: "space-between",
          flexWrap: "wrap",
          rowGap: 2,
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            children: t("webpage.appsHelp")
          }), /* @__PURE__ */ jsx(Button, {
            size: "xs",
            variant: "ghost",
            isDisabled: value.apps === null,
            onClick: () => set({
              apps: null
            }),
            children: t("webpage.restore")
          })]
        }), /* @__PURE__ */ jsx(Tabs, {
          size: "sm",
          variant: "soft-rounded",
          colorScheme: "primary",
          index: plat,
          onChange: setPlat,
          children: /* @__PURE__ */ jsx(TabList, {
            flexWrap: "wrap",
            gap: 1,
            mb: 3,
            children: platforms.map((k) => /* @__PURE__ */ jsxs(Tab, {
              children: [PLATFORM_NAMES[k] || k, /* @__PURE__ */ jsx(Text, {
                as: "span",
                ml: 1.5,
                opacity: 0.6,
                fontSize: "xs",
                children: (catalog[k] || []).length
              })]
            }, k))
          })
        }), /* @__PURE__ */ jsxs(VStack, {
          align: "stretch",
          spacing: 2,
          children: [list.length === 0 && /* @__PURE__ */ jsx(Text, {
            fontSize: "sm",
            color: "gray.500",
            ...soft,
            p: 3,
            children: t("webpage.noApps")
          }), list.map((a, i) => /* @__PURE__ */ jsx(AppEditor, {
            app: {
              ...a,
              note: a.note || {}
            },
            presets,
            crypt: value.happ_crypt,
            first: i === 0,
            last: i === list.length - 1,
            onChange: (next) => setList(list.map((x, n) => n === i ? next : x)),
            onMove: (d) => move(i, d),
            onDelete: () => setList(list.filter((_, n) => n !== i))
          }, key + i)), /* @__PURE__ */ jsxs(Menu, {
            isLazy: true,
            children: [/* @__PURE__ */ jsx(MenuButton, {
              as: Button,
              size: "sm",
              variant: "ghost",
              alignSelf: "flex-start",
              leftIcon: /* @__PURE__ */ jsx(PlusIcon, {
                width: 16
              }),
              children: t("webpage.addApp")
            }), /* @__PURE__ */ jsxs(MenuList, {
              maxH: "320px",
              overflowY: "auto",
              children: [/* @__PURE__ */ jsx(MenuItem, {
                onClick: () => setList([...list, {
                  id: `app-${list.length + 1}`,
                  name: "",
                  featured: false,
                  deeplink: "",
                  crypt: false,
                  install: [],
                  note: {}
                }]),
                children: t("webpage.emptyApp")
              }), allApps.filter((a) => !list.some((x) => x.id === a.id)).map((a) => /* @__PURE__ */ jsx(MenuItem, {
                onClick: () => setList([...list, a]),
                children: a.name
              }, a.id))]
            })]
          })]
        })]
      }), /* @__PURE__ */ jsx(TabPanel, {
        p: 0,
        children: /* @__PURE__ */ jsxs(VStack, {
          align: "stretch",
          spacing: 5,
          children: [/* @__PURE__ */ jsx(Field, {
            label: t("webpage.css"),
            help: t("webpage.cssHelp"),
            children: /* @__PURE__ */ jsx(Textarea, {
              size: "sm",
              rows: 8,
              fontFamily: "mono",
              fontSize: "xs",
              borderRadius: "12px",
              placeholder: ".card { border-radius: 28px; }\n:root { --accent: #ff7a59; }",
              value: value.custom_css,
              onChange: (e) => set({
                custom_css: e.target.value
              })
            })
          }), /* @__PURE__ */ jsx(Field, {
            label: t("webpage.appsJson"),
            help: jsonError || t("webpage.jsonHelp"),
            children: /* @__PURE__ */ jsx(Textarea, {
              size: "sm",
              rows: 16,
              fontFamily: "mono",
              fontSize: "xs",
              borderRadius: "12px",
              borderColor: jsonError ? "red.400" : void 0,
              value: json,
              onChange: (e) => {
                setJson(e.target.value);
                try {
                  const parsed = JSON.parse(e.target.value);
                  if (typeof parsed !== "object" || Array.isArray(parsed))
                    throw new Error("{ platform: [apps] }");
                  setJsonError("");
                  set({
                    apps: parsed
                  });
                } catch (err) {
                  setJsonError(err.message);
                }
              }
            })
          })]
        })
      }), /* @__PURE__ */ jsx(TabPanel, {
        p: 0,
        children: /* @__PURE__ */ jsx(Preview, {
          value
        })
      })]
    })]
  });
};
const PLACEHOLDER = "#profile-title: base64: Alexander LLC\n#announce: base64: Hos geldin {username}\n#support-url: https://t.me/alexvpns";
const empty = {
  default_template: "",
  expired_template: "",
  disabled_template: "",
  limited_template: "",
  near_expire_template: "",
  near_expire_days: 1,
  update_interval: null,
  admins: {}
};
const SubSettingsModal = () => {
  var _a;
  const {
    isEditingSubSettings,
    onEditingSubSettings
  } = useDashboardPick("isEditingSubSettings", "onEditingSubSettings");
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const [form, setForm] = react.exports.useState(empty);
  const [loading, setLoading] = react.exports.useState(false);
  const [jsonSub, setJsonSub] = react.exports.useState(emptyJsonSub);
  const [webPage, setWebPage] = react.exports.useState(emptyWebPage);
  const [defaults, setDefaults] = react.exports.useState(emptyDefaults);
  react.exports.useEffect(() => {
    if (isEditingSubSettings) {
      fetch("/sub-settings").then((d) => setForm({
        ...empty,
        ...d
      }));
      fetch("/json-sub-settings").then((d) => setJsonSub({
        ...emptyJsonSub,
        ...d
      }));
      fetch("/sub-webpage").then((d) => setWebPage({
        ...emptyWebPage,
        ...d
      }));
      fetch("/sub-webpage/defaults").then((d) => setDefaults(d));
    }
  }, [isEditingSubSettings]);
  const set = (k, v) => setForm((f) => ({
    ...f,
    [k]: v
  }));
  const [scope, setScope] = react.exports.useState("");
  const [adminNames, setAdminNames] = react.exports.useState([]);
  react.exports.useEffect(() => {
    if (isEditingSubSettings)
      fetch("/admins").then((list) => setAdminNames(list.map((a) => a.username))).catch(() => {
      });
  }, [isEditingSubSettings]);
  const tpl = (k) => {
    var _a2, _b, _c;
    return scope ? (_c = (_b = (_a2 = form.admins) == null ? void 0 : _a2[scope]) == null ? void 0 : _b[k]) != null ? _c : "" : form[k];
  };
  const setTpl = (k, v) => scope ? setForm((f) => {
    var _a2;
    const mine = {
      ...((_a2 = f.admins) == null ? void 0 : _a2[scope]) || {},
      [k]: v
    };
    const admins = {
      ...f.admins || {}
    };
    if (Object.values(mine).some(Boolean))
      admins[scope] = mine;
    else
      delete admins[scope];
    return {
      ...f,
      admins
    };
  }) : set(k, v);
  const ph = (k) => scope ? form[k] || t("sub.inheritsGeneral") : PLACEHOLDER;
  const save = () => {
    setLoading(true);
    Promise.all([fetch("/sub-settings", {
      method: "PUT",
      body: form
    }), fetch("/json-sub-settings", {
      method: "PUT",
      body: jsonSub
    }), fetch("/sub-webpage", {
      method: "PUT",
      body: webPage
    })]).then(() => {
      toast({
        status: "success",
        title: t("admins.saved"),
        duration: 2e3
      });
      onEditingSubSettings(false);
    }).catch(() => toast({
      status: "error",
      title: t("admins.error"),
      duration: 3e3
    })).finally(() => setLoading(false));
  };
  return /* @__PURE__ */ jsxs(Modal, {
    isOpen: isEditingSubSettings,
    onClose: () => onEditingSubSettings(false),
    size: "2xl",
    scrollBehavior: "inside",
    children: [/* @__PURE__ */ jsx(ModalOverlay, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent, {
      mx: "3",
      children: [/* @__PURE__ */ jsxs(ModalHeader, {
        pt: 6,
        children: [/* @__PURE__ */ jsx(Text, {
          fontWeight: "semibold",
          fontSize: "lg",
          children: t("header.subSettings")
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          fontWeight: "normal",
          mt: 1,
          children: t("sub.help")
        }), /* @__PURE__ */ jsxs(Text, {
          fontSize: "xs",
          color: "gray.500",
          fontWeight: "normal",
          mt: 1,
          children: [t("sub.directives"), ":", " ", /* @__PURE__ */ jsx(Code, {
            fontSize: "xs",
            children: "#profile-title:"
          }), " ", /* @__PURE__ */ jsx(Code, {
            fontSize: "xs",
            children: "#announce:"
          }), " ", /* @__PURE__ */ jsx(Code, {
            fontSize: "xs",
            children: "#support-url:"
          }), " \xB7", " ", /* @__PURE__ */ jsx(Code, {
            fontSize: "xs",
            children: "base64:"
          }), " ", t("sub.base64Hint")]
        }), /* @__PURE__ */ jsxs(Text, {
          fontSize: "xs",
          color: "gray.500",
          fontWeight: "normal",
          mt: 1,
          children: [t("sub.placeholders"), ":", " ", /* @__PURE__ */ jsx(Code, {
            fontSize: "xs",
            children: "{username}"
          }), " ", /* @__PURE__ */ jsx(Code, {
            fontSize: "xs",
            children: "{used}"
          }), " ", /* @__PURE__ */ jsx(Code, {
            fontSize: "xs",
            children: "{limit}"
          }), " ", /* @__PURE__ */ jsx(Code, {
            fontSize: "xs",
            children: "{remaining}"
          }), " ", /* @__PURE__ */ jsx(Code, {
            fontSize: "xs",
            children: "{expiretime}"
          }), " ", /* @__PURE__ */ jsx(Code, {
            fontSize: "xs",
            children: "{days}"
          })]
        })]
      }), /* @__PURE__ */ jsx(ModalCloseButton, {
        mt: 3
      }), /* @__PURE__ */ jsx(ModalBody, {
        children: /* @__PURE__ */ jsxs(Tabs, {
          size: "sm",
          variant: "soft-rounded",
          colorScheme: "primary",
          isLazy: true,
          children: [/* @__PURE__ */ jsxs(TabList, {
            mb: 4,
            gap: 1,
            flexWrap: "wrap",
            children: [/* @__PURE__ */ jsx(Tab, {
              children: t("webpage.tab")
            }), /* @__PURE__ */ jsx(Tab, {
              children: t("jsonSub.tabPage")
            }), /* @__PURE__ */ jsx(Tab, {
              children: "JSON"
            })]
          }), /* @__PURE__ */ jsxs(TabPanels, {
            children: [/* @__PURE__ */ jsx(TabPanel, {
              p: 0,
              children: /* @__PURE__ */ jsx(SubWebPagePanel, {
                value: webPage,
                defaults,
                onChange: setWebPage
              })
            }), /* @__PURE__ */ jsx(TabPanel, {
              p: 0,
              children: /* @__PURE__ */ jsxs(VStack, {
                align: "stretch",
                spacing: 4,
                children: [/* @__PURE__ */ jsxs(FormControl, {
                  children: [/* @__PURE__ */ jsx(FormLabel, {
                    fontSize: "sm",
                    mb: 1,
                    children: t("sub.scope")
                  }), /* @__PURE__ */ jsx(HStack, {
                    spacing: 1.5,
                    flexWrap: "wrap",
                    rowGap: 1.5,
                    children: ["", ...adminNames].map((name) => {
                      var _a2;
                      return /* @__PURE__ */ jsxs(Button, {
                        size: "xs",
                        borderRadius: "full",
                        colorScheme: "primary",
                        variant: scope === name ? "solid" : "outline",
                        onClick: () => setScope(name),
                        children: [name || t("sub.scopeAll"), name && ((_a2 = form.admins) == null ? void 0 : _a2[name]) ? " \u2022" : ""]
                      }, name || "-");
                    })
                  }), /* @__PURE__ */ jsx(Text, {
                    fontSize: "xs",
                    color: "gray.500",
                    mt: 1,
                    children: scope ? t("sub.scopeAdminHelp", {
                      name: scope
                    }) : t("sub.scopeAllHelp")
                  })]
                }), !scope && /* @__PURE__ */ jsxs(FormControl, {
                  children: [/* @__PURE__ */ jsx(FormLabel, {
                    fontSize: "sm",
                    mb: 1,
                    children: t("sub.updateInterval")
                  }), /* @__PURE__ */ jsx(Input, {
                    size: "sm",
                    type: "number",
                    maxW: "120px",
                    placeholder: "12",
                    value: (_a = form.update_interval) != null ? _a : "",
                    onChange: (e) => set("update_interval", e.target.value ? parseInt(e.target.value) || null : null)
                  }), /* @__PURE__ */ jsx(Text, {
                    fontSize: "xs",
                    color: "gray.500",
                    mt: 1,
                    children: t("sub.updateIntervalHelp")
                  })]
                }), /* @__PURE__ */ jsxs(FormControl, {
                  children: [/* @__PURE__ */ jsx(FormLabel, {
                    fontSize: "sm",
                    mb: 1,
                    children: t("sub.default")
                  }), /* @__PURE__ */ jsx(Textarea, {
                    size: "sm",
                    rows: 5,
                    fontFamily: "mono",
                    fontSize: "xs",
                    value: tpl("default_template"),
                    onChange: (e) => setTpl("default_template", e.target.value),
                    placeholder: ph("default_template")
                  })]
                }), /* @__PURE__ */ jsx(Divider, {}), /* @__PURE__ */ jsxs(FormControl, {
                  children: [/* @__PURE__ */ jsx(FormLabel, {
                    fontSize: "sm",
                    mb: 1,
                    children: t("sub.expired")
                  }), /* @__PURE__ */ jsx(Textarea, {
                    size: "sm",
                    rows: 5,
                    fontFamily: "mono",
                    fontSize: "xs",
                    value: tpl("expired_template"),
                    onChange: (e) => setTpl("expired_template", e.target.value),
                    placeholder: ph("expired_template")
                  })]
                }), /* @__PURE__ */ jsxs(FormControl, {
                  children: [/* @__PURE__ */ jsx(FormLabel, {
                    fontSize: "sm",
                    mb: 1,
                    children: t("sub.disabled")
                  }), /* @__PURE__ */ jsx(Textarea, {
                    size: "sm",
                    rows: 5,
                    fontFamily: "mono",
                    fontSize: "xs",
                    value: tpl("disabled_template"),
                    onChange: (e) => setTpl("disabled_template", e.target.value),
                    placeholder: ph("disabled_template")
                  })]
                }), /* @__PURE__ */ jsxs(FormControl, {
                  children: [/* @__PURE__ */ jsx(FormLabel, {
                    fontSize: "sm",
                    mb: 1,
                    children: t("sub.limited")
                  }), /* @__PURE__ */ jsx(Textarea, {
                    size: "sm",
                    rows: 5,
                    fontFamily: "mono",
                    fontSize: "xs",
                    value: tpl("limited_template"),
                    onChange: (e) => setTpl("limited_template", e.target.value),
                    placeholder: ph("limited_template")
                  })]
                }), /* @__PURE__ */ jsx(Divider, {}), /* @__PURE__ */ jsxs(FormControl, {
                  isDisabled: !!scope,
                  children: [/* @__PURE__ */ jsx(FormLabel, {
                    fontSize: "sm",
                    mb: 1,
                    children: t("sub.nearExpireDays")
                  }), /* @__PURE__ */ jsx(Input, {
                    size: "sm",
                    type: "number",
                    maxW: "120px",
                    value: form.near_expire_days,
                    onChange: (e) => set("near_expire_days", parseInt(e.target.value) || 0)
                  })]
                }), /* @__PURE__ */ jsxs(FormControl, {
                  children: [/* @__PURE__ */ jsx(FormLabel, {
                    fontSize: "sm",
                    mb: 1,
                    children: t("sub.nearExpire")
                  }), /* @__PURE__ */ jsx(Textarea, {
                    size: "sm",
                    rows: 5,
                    fontFamily: "mono",
                    fontSize: "xs",
                    value: tpl("near_expire_template"),
                    onChange: (e) => setTpl("near_expire_template", e.target.value),
                    placeholder: ph("near_expire_template")
                  })]
                })]
              })
            }), /* @__PURE__ */ jsx(TabPanel, {
              p: 0,
              children: /* @__PURE__ */ jsx(JsonSubSettingsPanel, {
                value: jsonSub,
                onChange: setJsonSub
              })
            })]
          })]
        })
      }), /* @__PURE__ */ jsxs(ModalFooter, {
        children: [/* @__PURE__ */ jsx(Button, {
          variant: "ghost",
          mr: 3,
          onClick: () => onEditingSubSettings(false),
          children: t("cancel")
        }), /* @__PURE__ */ jsx(Button, {
          colorScheme: "primary",
          isLoading: loading,
          onClick: save,
          children: t("admins.save")
        })]
      })]
    })]
  });
};
export {
  SubSettingsModal
};
