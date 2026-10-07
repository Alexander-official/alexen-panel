import { u as useDashboardPick, c as useOnlineProviders, M as Modal, d as ModalOverlay, e as ModalContent, h as ModalHeader, i as ModalCloseButton, j as ModalBody, b as formatBytes, f as fetch } from "./index.e0e646b5.js";
import { StatsHistory } from "./OverviewPage.23a0dabf.js";
import { u as useTranslation, g as useQuery, h as jsxs, k as jsx, T as Text, K as SimpleGrid, N as Box, H as HStack, cj as Progress, ah as VStack, ck as Divider } from "./vendor.0404bf65.js";
import "./flags.7f331219.js";
const Stat = ({
  label,
  value
}) => /* @__PURE__ */ jsxs(Box, {
  p: 4,
  borderRadius: "14px",
  bg: "blackAlpha.50",
  _dark: {
    bg: "whiteAlpha.50"
  },
  children: [/* @__PURE__ */ jsx(Text, {
    fontSize: "xs",
    color: "gray.500",
    children: label
  }), /* @__PURE__ */ jsx(Text, {
    fontSize: "2xl",
    fontWeight: "semibold",
    children: value
  })]
});
const StatisticsModal = () => {
  var _a, _b;
  const {
    isShowingStats,
    onShowingStats
  } = useDashboardPick("isShowingStats", "onShowingStats");
  const {
    t
  } = useTranslation();
  const {
    data
  } = useQuery({
    queryKey: "stats-overview",
    queryFn: () => fetch("/stats/overview"),
    enabled: isShowingStats,
    refetchInterval: isShowingStats ? 1e4 : false
  });
  const {
    data: providerData
  } = useOnlineProviders();
  const providers = (providerData == null ? void 0 : providerData.providers) || [];
  const maxProviderUsers = Math.max(1, ...providers.map((p) => p.users));
  const transports = (data == null ? void 0 : data.transports) || [];
  const maxTransport = Math.max(1, ...transports.map((x) => x.used_traffic));
  const maxInbound = Math.max(1, ...((data == null ? void 0 : data.inbounds) || []).map((i) => i.used_traffic));
  return /* @__PURE__ */ jsxs(Modal, {
    isOpen: isShowingStats,
    onClose: () => onShowingStats(false),
    size: "2xl",
    children: [/* @__PURE__ */ jsx(ModalOverlay, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent, {
      mx: "3",
      children: [/* @__PURE__ */ jsx(ModalHeader, {
        pt: 6,
        children: /* @__PURE__ */ jsx(Text, {
          fontWeight: "semibold",
          fontSize: "lg",
          children: t("stats.title")
        })
      }), /* @__PURE__ */ jsx(ModalCloseButton, {
        mt: 3
      }), /* @__PURE__ */ jsxs(ModalBody, {
        pb: 6,
        children: [/* @__PURE__ */ jsxs(SimpleGrid, {
          columns: {
            base: 1,
            sm: 3
          },
          spacing: 3,
          mb: 5,
          children: [/* @__PURE__ */ jsx(Stat, {
            label: t("stats.totalUsers"),
            value: (_a = data == null ? void 0 : data.total_users) != null ? _a : "\u2014"
          }), /* @__PURE__ */ jsx(Stat, {
            label: t("stats.activeUsers"),
            value: (_b = data == null ? void 0 : data.active_users) != null ? _b : "\u2014"
          }), /* @__PURE__ */ jsx(Stat, {
            label: t("stats.totalTraffic"),
            value: data ? formatBytes(data.total_traffic) : "\u2014"
          })]
        }), /* @__PURE__ */ jsx(Box, {
          mb: 6,
          children: /* @__PURE__ */ jsx(StatsHistory, {})
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          fontWeight: "medium",
          mb: 2,
          children: t("stats.byTransport")
        }), /* @__PURE__ */ jsx(SimpleGrid, {
          columns: {
            base: 1,
            sm: 2
          },
          spacing: 2,
          mb: 5,
          children: transports.map((x) => /* @__PURE__ */ jsxs(Box, {
            p: 3,
            borderRadius: "14px",
            bg: "blackAlpha.50",
            _dark: {
              bg: "whiteAlpha.50"
            },
            children: [/* @__PURE__ */ jsxs(HStack, {
              justifyContent: "space-between",
              mb: 1,
              children: [/* @__PURE__ */ jsx(Text, {
                fontSize: "sm",
                fontWeight: "semibold",
                textTransform: "uppercase",
                children: x.transport
              }), /* @__PURE__ */ jsx(Text, {
                fontSize: "sm",
                fontWeight: "semibold",
                children: formatBytes(x.used_traffic)
              })]
            }), /* @__PURE__ */ jsx(Progress, {
              value: x.used_traffic / maxTransport * 100,
              size: "xs",
              borderRadius: "full",
              colorScheme: "primary",
              mb: 2
            }), /* @__PURE__ */ jsxs(Text, {
              fontSize: "xs",
              color: "gray.500",
              children: [x.protocols.join(", "), " \xB7", " ", t("stats.transportMeta", {
                inbounds: x.inbounds,
                ips: x.online_ips
              })]
            })]
          }, x.transport))
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          fontWeight: "medium",
          mb: 2,
          children: t("stats.byInbound")
        }), /* @__PURE__ */ jsxs(VStack, {
          align: "stretch",
          spacing: 2,
          mb: 5,
          children: [((data == null ? void 0 : data.inbounds) || []).map((i) => /* @__PURE__ */ jsxs(Box, {
            children: [/* @__PURE__ */ jsxs(HStack, {
              justifyContent: "space-between",
              mb: 1,
              children: [/* @__PURE__ */ jsxs(Text, {
                fontSize: "xs",
                children: [i.inbound_tag, i.protocol ? ` \xB7 ${i.protocol}` : ""]
              }), /* @__PURE__ */ jsx(Text, {
                fontSize: "xs",
                color: "gray.500",
                children: formatBytes(i.used_traffic)
              })]
            }), /* @__PURE__ */ jsx(Progress, {
              value: i.used_traffic / maxInbound * 100,
              size: "sm",
              borderRadius: "full",
              colorScheme: "primary"
            })]
          }, i.inbound_tag)), data && data.inbounds.length === 0 && /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            children: t("stats.noData")
          })]
        }), /* @__PURE__ */ jsx(Divider, {
          mb: 4
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          fontWeight: "medium",
          mb: 2,
          children: t("stats.byProvider")
        }), /* @__PURE__ */ jsxs(VStack, {
          align: "stretch",
          spacing: 2,
          mb: 5,
          children: [providers.map((p) => /* @__PURE__ */ jsxs(Box, {
            children: [/* @__PURE__ */ jsxs(HStack, {
              justifyContent: "space-between",
              mb: 1,
              children: [/* @__PURE__ */ jsx(Text, {
                fontSize: "xs",
                isTruncated: true,
                children: p.name
              }), /* @__PURE__ */ jsx(Text, {
                fontSize: "xs",
                color: "gray.500",
                flexShrink: 0,
                children: t("stats.providerUsers", {
                  users: p.users,
                  ips: p.ips
                })
              })]
            }), /* @__PURE__ */ jsx(Progress, {
              value: p.users / maxProviderUsers * 100,
              size: "sm",
              borderRadius: "full",
              colorScheme: "primary"
            })]
          }, p.name)), providerData && providers.length === 0 && /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            children: t("stats.noOnline")
          })]
        }), /* @__PURE__ */ jsx(Divider, {
          mb: 4
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          fontWeight: "medium",
          mb: 2,
          children: t("stats.topUsers")
        }), /* @__PURE__ */ jsx(VStack, {
          align: "stretch",
          spacing: 1,
          children: ((data == null ? void 0 : data.top_users) || []).map((u, idx) => /* @__PURE__ */ jsxs(HStack, {
            justifyContent: "space-between",
            children: [/* @__PURE__ */ jsxs(Text, {
              fontSize: "sm",
              children: [idx + 1, ". ", u.username, u.admin ? /* @__PURE__ */ jsxs(Text, {
                as: "span",
                fontSize: "xs",
                color: "gray.500",
                children: [" ", "\xB7 ", u.admin]
              }) : null]
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              color: "gray.500",
              children: formatBytes(u.used_traffic)
            })]
          }, u.username))
        })]
      })]
    })]
  });
};
export {
  StatisticsModal
};
