import { u as useDashboardPick, m as createUsageConfig, M as Modal, d as ModalOverlay, e as ModalContent, h as ModalHeader, I as Icon, i as ModalCloseButton, j as ModalBody, U as UsageFilter, S as StableChart, n as ModalFooter } from "./index.e0e646b5.js";
import { u as useNodes } from "./NodesContext.620c0414.js";
import { E as chakra, I as ChartPieIcon, u as useTranslation, c as react, ad as useColorMode, d as dayjs, h as jsxs, k as jsx, H as HStack, T as Text, ah as VStack, N as Box, ci as CircularProgress } from "./vendor.0404bf65.js";
const UsageIcon = chakra(ChartPieIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const NodesUsage = () => {
  const {
    isShowingNodesUsage,
    onShowingNodesUsage
  } = useDashboardPick("isShowingNodesUsage", "onShowingNodesUsage");
  const {
    fetchNodesUsage
  } = useNodes();
  const {
    t
  } = useTranslation();
  const [loading, setLoading] = react.exports.useState(false);
  const {
    colorMode
  } = useColorMode();
  const usageTitle = t("userDialog.total");
  const [usage, setUsage] = react.exports.useState(createUsageConfig(colorMode, usageTitle));
  const [usageFilter, setUsageFilter] = react.exports.useState("1m");
  const fetchUsageWithFilter = (query) => {
    fetchNodesUsage(query).then((data) => {
      const labels = [];
      const series = [];
      for (const key in data.usages) {
        const entry = data.usages[key];
        series.push(entry.uplink + entry.downlink);
        labels.push(entry.node_name);
      }
      setUsage(createUsageConfig(colorMode, usageTitle, series, labels));
    });
  };
  react.exports.useEffect(() => {
    if (isShowingNodesUsage) {
      fetchUsageWithFilter({
        start: dayjs().utc().subtract(30, "day").format("YYYY-MM-DDTHH:00:00")
      });
    }
  }, [isShowingNodesUsage]);
  const onClose = () => {
    onShowingNodesUsage(false);
    setUsageFilter("1m");
  };
  const disabled = loading;
  return /* @__PURE__ */ jsxs(Modal, {
    isOpen: isShowingNodesUsage,
    onClose,
    size: "2xl",
    children: [/* @__PURE__ */ jsx(ModalOverlay, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent, {
      mx: "3",
      w: "full",
      children: [/* @__PURE__ */ jsx(ModalHeader, {
        pt: 6,
        children: /* @__PURE__ */ jsxs(HStack, {
          gap: 2,
          children: [/* @__PURE__ */ jsx(Icon, {
            color: "primary",
            children: /* @__PURE__ */ jsx(UsageIcon, {})
          }), /* @__PURE__ */ jsx(Text, {
            fontWeight: "semibold",
            fontSize: "lg",
            children: t("header.nodesUsage")
          })]
        })
      }), /* @__PURE__ */ jsx(ModalCloseButton, {
        mt: 3,
        disabled
      }), /* @__PURE__ */ jsx(ModalBody, {
        children: /* @__PURE__ */ jsxs(VStack, {
          gap: 4,
          children: [/* @__PURE__ */ jsx(UsageFilter, {
            defaultValue: usageFilter,
            onChange: (filter, query) => {
              setUsageFilter(filter);
              fetchUsageWithFilter(query);
            }
          }), /* @__PURE__ */ jsx(Box, {
            justifySelf: "center",
            w: "full",
            maxW: "300px",
            mt: "4",
            children: /* @__PURE__ */ jsx(react.exports.Suspense, {
              fallback: /* @__PURE__ */ jsx(CircularProgress, {
                isIndeterminate: true
              }),
              children: /* @__PURE__ */ jsx(StableChart, {
                options: usage.options,
                series: usage.series,
                type: "donut",
                height: "500px"
              })
            })
          })]
        })
      }), /* @__PURE__ */ jsx(ModalFooter, {
        mt: "3"
      })]
    })]
  });
};
export {
  NodesUsage
};
