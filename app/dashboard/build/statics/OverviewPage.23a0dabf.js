import { u as useTranslation, c as react, g as useQuery, d as dayjs, h as jsxs, ah as VStack, H as HStack, k as jsx, T as Text, K as SimpleGrid, F as UsersIcon, S as SignalIcon, ch as ArrowTrendingUpIcon, aD as ClockIcon, bA as UserPlusIcon, I as ChartPieIcon, o as Button, ci as CircularProgress, N as Box, D as Badge, v as Table, w as Thead, x as Tr, y as Th, A as Tbody, C as Td, bO as ButtonGroup, G as ChartBarIcon, ad as useColorMode, a7 as Input } from "./vendor.0404bf65.js";
import { f as fetch, g as generateDistinctColors, S as StableChart, b as formatBytes$1 } from "./index.e0e646b5.js";
import { f as flagEmoji } from "./flags.7f331219.js";
const formatBytes = (v, d = 2) => String(formatBytes$1(v, d));
const PERIODS = ["24h", "7d", "30d", "90d", "365d"];
const STATUS_COLORS = {
  active: "#3fb68b",
  on_hold: "#2fb3c6",
  limited: "#e9a23b",
  expired: "#ef7a6b",
  disabled: "#62708a"
};
const PROTOCOL_LABEL = {
  "vless-reality": "VLESS Reality",
  "vless-tcp": "VLESS TCP",
  "vless-ws": "VLESS WS",
  "vless-grpc": "VLESS gRPC",
  "vless-xhttp": "VLESS XHTTP",
  "vless-httpupgrade": "VLESS HTTPUpgrade",
  "vmess-tcp": "VMess TCP",
  "vmess-ws": "VMess WS",
  "vmess-grpc": "VMess gRPC",
  "trojan-tcp": "Trojan TCP",
  "trojan-ws": "Trojan WS",
  "trojan-grpc": "Trojan gRPC",
  shadowsocks: "Shadowsocks",
  hysteria: "Hysteria2",
  hysteria2: "Hysteria2",
  wireguard: "WireGuard",
  amneziawg: "AmneziaWG",
  openvpn: "OpenVPN"
};
const protoLabel = (p) => PROTOCOL_LABEL[p] || p.replace(/-/g, " ").toUpperCase();
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
const Card = ({
  title,
  right,
  children,
  minH
}) => /* @__PURE__ */ jsxs(Box, {
  ...surface,
  p: {
    base: 4,
    md: 5
  },
  minW: 0,
  minH,
  children: [/* @__PURE__ */ jsxs(HStack, {
    justifyContent: "space-between",
    mb: 3,
    spacing: 2,
    children: [/* @__PURE__ */ jsx(Text, {
      fontWeight: "semibold",
      fontSize: "sm",
      children: title
    }), right]
  }), children]
});
const Stat = ({
  icon: I,
  label,
  value,
  sub,
  color = "primary"
}) => /* @__PURE__ */ jsx(Box, {
  ...surface,
  p: 4,
  minW: 0,
  children: /* @__PURE__ */ jsxs(HStack, {
    spacing: 3,
    alignItems: "flex-start",
    children: [/* @__PURE__ */ jsx(Box, {
      p: 2,
      borderRadius: "12px",
      bg: `${color}.50`,
      color: `${color}.500`,
      _dark: {
        bg: "whiteAlpha.100",
        color: `${color}.300`
      },
      children: /* @__PURE__ */ jsx(I, {
        width: 20,
        height: 20
      })
    }), /* @__PURE__ */ jsxs(Box, {
      minW: 0,
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        noOfLines: 2,
        children: label
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "xl",
        fontWeight: "bold",
        lineHeight: "1.3",
        children: value
      }), sub && /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        noOfLines: 1,
        children: sub
      })]
    })]
  })
});
const KindToggle = ({
  value,
  options,
  onChange
}) => /* @__PURE__ */ jsx(ButtonGroup, {
  size: "xs",
  isAttached: true,
  variant: "outline",
  children: options.map(({
    v,
    icon: I
  }) => /* @__PURE__ */ jsx(Button, {
    "aria-label": v,
    variant: value === v ? "solid" : "outline",
    colorScheme: "primary",
    onClick: () => onChange(v),
    children: /* @__PURE__ */ jsx(I, {
      width: 14,
      height: 14
    })
  }, v))
});
const DIST_KINDS = [{
  v: "donut",
  icon: ChartPieIcon
}, {
  v: "bar",
  icon: ChartBarIcon
}];
const TIME_KINDS = [{
  v: "area",
  icon: ArrowTrendingUpIcon
}, {
  v: "bar",
  icon: ChartBarIcon
}];
const useBase = () => {
  const {
    colorMode
  } = useColorMode();
  return (extra = {}) => ({
    chart: {
      background: "transparent",
      toolbar: {
        show: false
      },
      fontFamily: "inherit",
      animations: {
        enabled: true,
        speed: 350
      },
      ...extra.chart || {}
    },
    theme: {
      mode: colorMode === "dark" ? "dark" : "light"
    },
    grid: {
      borderColor: colorMode === "dark" ? "rgba(255,255,255,.07)" : "rgba(16,24,40,.07)",
      strokeDashArray: 4
    },
    dataLabels: {
      enabled: false
    },
    legend: {
      position: "bottom",
      fontSize: "12px",
      markers: {
        radius: 6
      }
    },
    stroke: {
      width: 2,
      curve: "smooth"
    },
    tooltip: {
      theme: colorMode === "dark" ? "dark" : "light"
    },
    ...extra
  });
};
const Distribution = ({
  labels,
  values,
  colors,
  kind,
  bytes,
  empty
}) => {
  const base = useBase();
  const fmt = (v) => bytes ? formatBytes(v, 1) : String(v);
  if (!values.some(Boolean))
    return /* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      color: "gray.500",
      py: 10,
      textAlign: "center",
      children: empty
    });
  const palette = colors || generateDistinctColors(labels.length);
  const options = kind === "donut" ? base({
    labels,
    colors: palette,
    stroke: {
      width: 0
    },
    plotOptions: {
      pie: {
        donut: {
          size: "68%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "",
              formatter: (w) => fmt(w.globals.seriesTotals.reduce((a, b) => a + b, 0))
            },
            value: {
              formatter: (v) => fmt(Number(v))
            }
          }
        }
      }
    },
    tooltip: {
      y: {
        formatter: (v) => fmt(v)
      }
    }
  }) : base({
    colors: palette,
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 6,
        distributed: true,
        barHeight: "62%"
      }
    },
    xaxis: {
      categories: labels,
      labels: {
        formatter: (v) => fmt(Number(v))
      }
    },
    legend: {
      show: false
    },
    tooltip: {
      y: {
        formatter: (v) => fmt(v)
      }
    }
  });
  const series = kind === "donut" ? values : [{
    name: "",
    data: values
  }];
  return /* @__PURE__ */ jsx(react.exports.Suspense, {
    fallback: /* @__PURE__ */ jsx(CircularProgress, {
      isIndeterminate: true,
      size: "24px"
    }),
    children: /* @__PURE__ */ jsx(StableChart, {
      type: kind,
      options,
      series,
      height: kind === "donut" ? 280 : Math.max(160, labels.length * 38)
    }, kind)
  });
};
const rangeQuery = (r, tz) => `/overview?period=${r.period}&tz=${tz}` + (r.period === "custom" && r.start && r.end ? `&start=${r.start}&end=${r.end}` : "");
const PeriodPicker = ({
  value,
  onChange,
  size = "sm"
}) => {
  const {
    t
  } = useTranslation();
  const day = (ts) => ts ? dayjs.unix(ts).format("YYYY-MM-DD") : "";
  const [from, setFrom] = react.exports.useState(day(value.start) || dayjs().subtract(14, "day").format("YYYY-MM-DD"));
  const [to, setTo] = react.exports.useState(day(value.end) || dayjs().format("YYYY-MM-DD"));
  const apply = (f, t2) => {
    const s = dayjs(f).startOf("day").unix();
    const e = dayjs(t2).endOf("day").unix();
    if (s && e && e > s)
      onChange({
        period: "custom",
        start: s,
        end: Math.min(e, dayjs().unix())
      });
  };
  return /* @__PURE__ */ jsxs(HStack, {
    spacing: 2,
    flexWrap: "wrap",
    rowGap: 2,
    justifyContent: "flex-end",
    children: [/* @__PURE__ */ jsx(ButtonGroup, {
      size,
      isAttached: true,
      variant: "outline",
      children: [...PERIODS, "custom"].map((p) => /* @__PURE__ */ jsx(Button, {
        colorScheme: "primary",
        variant: value.period === p ? "solid" : "outline",
        onClick: () => p === "custom" ? apply(from, to) : onChange({
          period: p
        }),
        children: t(`overview.period.${p}`)
      }, p))
    }), value.period === "custom" && /* @__PURE__ */ jsxs(HStack, {
      spacing: 1.5,
      children: [/* @__PURE__ */ jsx(Input, {
        size,
        type: "date",
        w: "150px",
        borderRadius: "10px",
        value: from,
        max: to,
        onChange: (e) => {
          setFrom(e.target.value);
          apply(e.target.value, to);
        }
      }), /* @__PURE__ */ jsx(Text, {
        color: "gray.500",
        children: "\u2013"
      }), /* @__PURE__ */ jsx(Input, {
        size,
        type: "date",
        w: "150px",
        borderRadius: "10px",
        value: to,
        min: from,
        max: dayjs().format("YYYY-MM-DD"),
        onChange: (e) => {
          setTo(e.target.value);
          apply(from, e.target.value);
        }
      })]
    })]
  });
};
const periodLabel = (t, r) => r.period === "custom" && r.start && r.end ? `${dayjs.unix(r.start).format("D MMM")} \u2013 ${dayjs.unix(r.end).format("D MMM")}` : t(`overview.period.${r.period}`);
const OverviewPage = () => {
  const {
    t
  } = useTranslation();
  const base = useBase();
  const [range, setRange] = react.exports.useState({
    period: "24h"
  });
  const period = range.period;
  const [trafficKind, setTrafficKind] = react.exports.useState("area");
  const [perServer, setPerServer] = react.exports.useState(true);
  const [statusKind, setStatusKind] = react.exports.useState("donut");
  const [protoKind, setProtoKind] = react.exports.useState("donut");
  const [serverKind, setServerKind] = react.exports.useState("donut");
  const tz = -new Date().getTimezoneOffset();
  const {
    data
  } = useQuery({
    queryKey: ["overview", range],
    queryFn: () => fetch(rangeQuery(range, tz)),
    refetchInterval: range.period === "custom" ? false : 6e4,
    keepPreviousData: true
  });
  const categories = react.exports.useMemo(() => ((data == null ? void 0 : data.points) || []).map((p) => dayjs.unix(p).format((data == null ? void 0 : data.unit) === "hour" ? period === "24h" ? "HH:mm" : "DD MMM HH:mm" : "DD MMM")), [data, period]);
  if (!data)
    return null;
  const by = data.users.by_status;
  const statuses = ["active", "on_hold", "limited", "expired", "disabled"];
  const isSudo = !!data.system;
  const trafficSeries = perServer && data.traffic.by_node.length > 1 ? data.traffic.by_node.map((n) => ({
    name: n.name,
    data: n.series
  })) : [{
    name: t("overview.traffic"),
    data: data.traffic.series
  }];
  const trafficOptions = base({
    chart: {
      type: trafficKind,
      stacked: true,
      toolbar: {
        show: false
      },
      background: "transparent",
      fontFamily: "inherit"
    },
    colors: generateDistinctColors(trafficSeries.length),
    xaxis: {
      categories,
      tickAmount: 8,
      labels: {
        rotate: 0,
        hideOverlappingLabels: true
      }
    },
    yaxis: {
      labels: {
        formatter: (v) => formatBytes(v, 0)
      }
    },
    tooltip: {
      y: {
        formatter: (v) => formatBytes(v, 2)
      }
    },
    fill: trafficKind === "area" ? {
      type: "gradient",
      gradient: {
        opacityFrom: 0.35,
        opacityTo: 0.02
      }
    } : {
      opacity: 0.9
    },
    plotOptions: {
      bar: {
        borderRadius: 3,
        columnWidth: "70%"
      }
    }
  });
  const onlineOptions = base({
    colors: ["#5b7cfa", "#2fb3c6"],
    xaxis: {
      categories,
      tickAmount: 8,
      labels: {
        rotate: 0,
        hideOverlappingLabels: true
      }
    },
    yaxis: {
      labels: {
        formatter: (v) => String(Math.round(v))
      }
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.3,
        opacityTo: 0.02
      }
    }
  });
  const protoSeriesOptions = base({
    chart: {
      type: "area",
      stacked: true,
      toolbar: {
        show: false
      },
      background: "transparent",
      fontFamily: "inherit"
    },
    colors: generateDistinctColors(data.protocol_series.length),
    xaxis: {
      categories,
      tickAmount: 8,
      labels: {
        rotate: 0,
        hideOverlappingLabels: true
      }
    },
    yaxis: {
      labels: {
        formatter: (v) => formatBytes(v, 0)
      }
    },
    tooltip: {
      y: {
        formatter: (v) => formatBytes(v, 2)
      }
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.35,
        opacityTo: 0.02
      }
    }
  });
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 4,
    children: [/* @__PURE__ */ jsxs(HStack, {
      justifyContent: "space-between",
      flexWrap: "wrap",
      rowGap: 2,
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        color: "gray.500",
        children: t("overview.help")
      }), /* @__PURE__ */ jsx(PeriodPicker, {
        value: range,
        onChange: setRange
      })]
    }), /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 2,
        md: 3,
        "2xl": 6
      },
      spacing: 3,
      children: [/* @__PURE__ */ jsx(Stat, {
        icon: UsersIcon,
        label: t("overview.users"),
        value: data.users.total,
        sub: t("overview.activeOf", {
          n: by.active || 0
        })
      }), /* @__PURE__ */ jsx(Stat, {
        icon: SignalIcon,
        color: "green",
        label: t("overview.onlineNow"),
        value: data.users.online,
        sub: t("overview.ips", {
          n: data.users.online_ips
        })
      }), /* @__PURE__ */ jsx(Stat, {
        icon: ArrowTrendingUpIcon,
        color: "purple",
        label: t("overview.trafficIn", {
          period: periodLabel(t, range)
        }),
        value: formatBytes(data.traffic.total, 1)
      }), /* @__PURE__ */ jsx(Stat, {
        icon: ClockIcon,
        color: "orange",
        label: t("overview.expiring"),
        value: data.users.expiring,
        sub: t("overview.expiringHelp")
      }), /* @__PURE__ */ jsx(Stat, {
        icon: UserPlusIcon,
        color: "cyan",
        label: t("overview.created"),
        value: data.users.created,
        sub: periodLabel(t, range)
      }), /* @__PURE__ */ jsx(Stat, {
        icon: ChartPieIcon,
        color: "red",
        label: t("overview.inactive"),
        value: (by.expired || 0) + (by.limited || 0) + (by.disabled || 0),
        sub: t("overview.inactiveHelp")
      })]
    }), /* @__PURE__ */ jsx(Card, {
      title: t("overview.trafficOverTime"),
      right: /* @__PURE__ */ jsxs(HStack, {
        spacing: 2,
        children: [data.traffic.by_node.length > 1 && /* @__PURE__ */ jsx(Button, {
          size: "xs",
          variant: perServer ? "solid" : "outline",
          colorScheme: "primary",
          onClick: () => setPerServer(!perServer),
          children: t("overview.perServer")
        }), /* @__PURE__ */ jsx(KindToggle, {
          value: trafficKind,
          options: TIME_KINDS,
          onChange: setTrafficKind
        })]
      }),
      children: /* @__PURE__ */ jsx(react.exports.Suspense, {
        fallback: /* @__PURE__ */ jsx(CircularProgress, {
          isIndeterminate: true,
          size: "24px"
        }),
        children: /* @__PURE__ */ jsx(StableChart, {
          type: trafficKind,
          options: trafficOptions,
          series: trafficSeries,
          height: 300
        }, trafficKind + String(perServer))
      })
    }), /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        lg: 3
      },
      spacing: 4,
      children: [/* @__PURE__ */ jsx(Card, {
        title: t("overview.usersByStatus"),
        right: /* @__PURE__ */ jsx(KindToggle, {
          value: statusKind,
          options: DIST_KINDS,
          onChange: setStatusKind
        }),
        children: /* @__PURE__ */ jsx(Distribution, {
          kind: statusKind,
          labels: statuses.map((s) => t(`status.${s}`)),
          values: statuses.map((s) => by[s] || 0),
          colors: statuses.map((s) => STATUS_COLORS[s]),
          empty: t("stats.noData")
        })
      }), /* @__PURE__ */ jsxs(Card, {
        title: t("overview.protocols"),
        right: /* @__PURE__ */ jsx(KindToggle, {
          value: protoKind,
          options: DIST_KINDS,
          onChange: setProtoKind
        }),
        children: [/* @__PURE__ */ jsx(Distribution, {
          kind: protoKind,
          bytes: true,
          labels: data.protocols.map((p) => protoLabel(p.protocol)),
          values: data.protocols.map((p) => p.traffic),
          empty: t("stats.noData")
        }), !data.protocols_from_history && data.protocols.length > 0 && /* @__PURE__ */ jsx(Text, {
          fontSize: "2xs",
          color: "gray.500",
          mt: 1,
          children: t("overview.protocolsLifetime")
        })]
      }), /* @__PURE__ */ jsx(Card, {
        title: t("overview.servers"),
        right: /* @__PURE__ */ jsx(KindToggle, {
          value: serverKind,
          options: DIST_KINDS,
          onChange: setServerKind
        }),
        children: /* @__PURE__ */ jsx(Distribution, {
          kind: serverKind,
          bytes: true,
          labels: data.traffic.by_node.map((n) => n.name),
          values: data.traffic.by_node.map((n) => n.total),
          empty: t("stats.noData")
        })
      })]
    }), isSudo && /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        xl: 2
      },
      spacing: 4,
      children: [/* @__PURE__ */ jsx(Card, {
        title: t("overview.onlineOverTime"),
        children: /* @__PURE__ */ jsx(react.exports.Suspense, {
          fallback: /* @__PURE__ */ jsx(CircularProgress, {
            isIndeterminate: true,
            size: "24px"
          }),
          children: /* @__PURE__ */ jsx(StableChart, {
            type: "area",
            options: onlineOptions,
            series: [{
              name: t("overview.onlineUsers"),
              data: data.online_series
            }, {
              name: t("overview.onlineIps"),
              data: data.online_ips_series
            }],
            height: 260
          })
        })
      }), /* @__PURE__ */ jsx(Card, {
        title: t("overview.protocolsOverTime"),
        children: data.protocol_series.length ? /* @__PURE__ */ jsx(react.exports.Suspense, {
          fallback: /* @__PURE__ */ jsx(CircularProgress, {
            isIndeterminate: true,
            size: "24px"
          }),
          children: /* @__PURE__ */ jsx(StableChart, {
            type: "area",
            options: protoSeriesOptions,
            series: data.protocol_series.map((p) => ({
              name: protoLabel(p.protocol),
              data: p.series
            })),
            height: 260
          })
        }) : /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          color: "gray.500",
          py: 10,
          textAlign: "center",
          children: t("overview.historyStarts")
        })
      })]
    }), /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: {
        base: 1,
        xl: isSudo ? 2 : 1
      },
      spacing: 4,
      alignItems: "start",
      children: [isSudo && /* @__PURE__ */ jsx(Card, {
        title: t("overview.serverList"),
        children: /* @__PURE__ */ jsxs(VStack, {
          align: "stretch",
          spacing: 2,
          children: [data.servers.map((s) => /* @__PURE__ */ jsxs(HStack, {
            px: 3,
            py: 2,
            borderRadius: "12px",
            bg: "blackAlpha.50",
            _dark: {
              bg: "whiteAlpha.50"
            },
            spacing: 3,
            children: [/* @__PURE__ */ jsx(Box, {
              w: "8px",
              h: "8px",
              borderRadius: "full",
              flexShrink: 0,
              bg: s.status === "connected" ? "green.400" : s.status === "disabled" ? "gray.400" : "red.400"
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "lg",
              lineHeight: 1,
              w: "22px",
              textAlign: "center",
              children: flagEmoji(s.flag) || ""
            }), /* @__PURE__ */ jsx(Text, {
              fontWeight: "medium",
              fontSize: "sm",
              flex: 1,
              isTruncated: true,
              children: s.name
            }), /* @__PURE__ */ jsx(Badge, {
              variant: "subtle",
              colorScheme: "green",
              children: t("overview.onlineN", {
                n: s.online
              })
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              color: "gray.500",
              w: "84px",
              textAlign: "right",
              children: formatBytes(s.traffic, 1)
            })]
          }, String(s.id))), data.system && /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            pt: 1,
            children: t("overview.masterSystem", {
              cpu: Math.round(data.system.cpu),
              cores: data.system.cores,
              mem: formatBytes(data.system.mem_used, 1),
              memTotal: formatBytes(data.system.mem_total, 1),
              disk: formatBytes(data.system.disk_used, 0),
              diskTotal: formatBytes(data.system.disk_total, 0)
            })
          })]
        })
      }), /* @__PURE__ */ jsx(Card, {
        title: t("overview.topUsers", {
          period: periodLabel(t, range)
        }),
        children: data.top_users.length ? /* @__PURE__ */ jsxs(Table, {
          size: "sm",
          variant: "simple",
          children: [/* @__PURE__ */ jsx(Thead, {
            children: /* @__PURE__ */ jsxs(Tr, {
              children: [/* @__PURE__ */ jsx(Th, {
                px: 2,
                children: "#"
              }), /* @__PURE__ */ jsx(Th, {
                px: 2,
                children: t("username")
              }), isSudo && /* @__PURE__ */ jsx(Th, {
                px: 2,
                children: t("online.admin")
              }), /* @__PURE__ */ jsx(Th, {
                px: 2,
                isNumeric: true,
                children: t("overview.traffic")
              })]
            })
          }), /* @__PURE__ */ jsx(Tbody, {
            children: data.top_users.map((u, i) => /* @__PURE__ */ jsxs(Tr, {
              children: [/* @__PURE__ */ jsx(Td, {
                px: 2,
                color: "gray.500",
                children: i + 1
              }), /* @__PURE__ */ jsx(Td, {
                px: 2,
                fontWeight: "medium",
                children: u.username
              }), isSudo && /* @__PURE__ */ jsx(Td, {
                px: 2,
                color: "gray.500",
                children: u.admin || "\u2014"
              }), /* @__PURE__ */ jsx(Td, {
                px: 2,
                isNumeric: true,
                children: formatBytes(u.traffic, 1)
              })]
            }, u.username))
          })]
        }) : /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          color: "gray.500",
          children: t("stats.noData")
        })
      })]
    })]
  });
};
const StatsHistory = () => {
  const {
    t
  } = useTranslation();
  const base = useBase();
  const [range, setRange] = react.exports.useState({
    period: "7d"
  });
  const period = range.period;
  const [kind, setKind] = react.exports.useState("bar");
  const tz = -new Date().getTimezoneOffset();
  const {
    data
  } = useQuery({
    queryKey: ["overview", range],
    queryFn: () => fetch(rangeQuery(range, tz)),
    keepPreviousData: true
  });
  const categories = react.exports.useMemo(() => ((data == null ? void 0 : data.points) || []).map((p) => dayjs.unix(p).format((data == null ? void 0 : data.unit) === "hour" ? period === "24h" ? "HH:mm" : "DD MMM HH:mm" : "DD MMM")), [data, period]);
  if (!data)
    return null;
  const opts = (n) => base({
    chart: {
      type: kind,
      stacked: true,
      toolbar: {
        show: false
      },
      background: "transparent",
      fontFamily: "inherit"
    },
    colors: generateDistinctColors(n),
    xaxis: {
      categories,
      tickAmount: 8,
      labels: {
        rotate: 0,
        hideOverlappingLabels: true
      }
    },
    yaxis: {
      labels: {
        formatter: (v) => formatBytes(v, 0)
      }
    },
    tooltip: {
      y: {
        formatter: (v) => formatBytes(v, 2)
      }
    },
    fill: kind === "area" ? {
      type: "gradient",
      gradient: {
        opacityFrom: 0.35,
        opacityTo: 0.02
      }
    } : {
      opacity: 0.9
    },
    plotOptions: {
      bar: {
        borderRadius: 3,
        columnWidth: "70%"
      }
    }
  });
  const servers = data.traffic.by_node.length ? data.traffic.by_node.map((n) => ({
    name: n.name,
    data: n.series
  })) : [{
    name: t("overview.traffic"),
    data: data.traffic.series
  }];
  const protos = data.protocol_series.map((p) => ({
    name: protoLabel(p.protocol),
    data: p.series
  }));
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 4,
    children: [/* @__PURE__ */ jsxs(HStack, {
      justifyContent: "space-between",
      flexWrap: "wrap",
      rowGap: 2,
      children: [/* @__PURE__ */ jsx(Text, {
        fontWeight: "semibold",
        children: t("overview.history")
      }), /* @__PURE__ */ jsxs(HStack, {
        spacing: 2,
        children: [/* @__PURE__ */ jsx(KindToggle, {
          value: kind,
          options: TIME_KINDS,
          onChange: setKind
        }), /* @__PURE__ */ jsx(PeriodPicker, {
          value: range,
          onChange: setRange,
          size: "xs"
        })]
      })]
    }), /* @__PURE__ */ jsx(Card, {
      title: t("overview.trafficIn", {
        period: periodLabel(t, range)
      }) + " \xB7 " + formatBytes(data.traffic.total, 1),
      children: /* @__PURE__ */ jsx(react.exports.Suspense, {
        fallback: /* @__PURE__ */ jsx(CircularProgress, {
          isIndeterminate: true,
          size: "24px"
        }),
        children: /* @__PURE__ */ jsx(StableChart, {
          type: kind,
          options: opts(servers.length),
          series: servers,
          height: 260
        }, "s" + kind)
      })
    }), protos.length > 0 && /* @__PURE__ */ jsx(Card, {
      title: t("overview.protocolsOverTime"),
      children: /* @__PURE__ */ jsx(react.exports.Suspense, {
        fallback: /* @__PURE__ */ jsx(CircularProgress, {
          isIndeterminate: true,
          size: "24px"
        }),
        children: /* @__PURE__ */ jsx(StableChart, {
          type: kind,
          options: opts(protos.length),
          series: protos,
          height: 260
        }, "p" + kind)
      })
    })]
  });
};
export {
  OverviewPage,
  StatsHistory
};
