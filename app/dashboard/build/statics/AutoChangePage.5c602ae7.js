import { c as react, u as useTranslation, h as jsxs, N as Box, H as HStack, k as jsx, ai as Icon, cv as ServerIcon, T as Text, aj as Tooltip, ah as VStack, cQ as BoltIcon, aD as ClockIcon, W as useToast, g as useQuery, o as Button, cm as PlusIcon, aM as ArrowsRightLeftIcon, d as dayjs, cR as ArrowRightIcon, cq as CheckCircleIcon, cx as SignalSlashIcon, cS as PauseCircleIcon, ak as Switch, a7 as Input, a9 as IconButton, cT as ArrowUturnLeftIcon, V as TrashIcon, bQ as ChevronDownIcon, az as Collapse, bR as CheckIcon, cU as PlayIcon, a0 as XMarkIcon, b2 as NumberInput, bb as NumberInputField } from "./vendor.0404bf65.js";
import { v as formatRate, f as fetch } from "./index.e0e646b5.js";
const newStage = (prev) => {
  var _a, _b;
  return {
    ip: "",
    threshold_kbps: (_a = prev == null ? void 0 : prev.threshold_kbps) != null ? _a : 1,
    minutes: (_b = prev == null ? void 0 : prev.minutes) != null ? _b : 5,
    start_kbps: 0,
    start_minutes: 0
  };
};
const newRule = () => ({
  id: "",
  name: "",
  enabled: true,
  host_ids: [],
  nodes: [],
  require_online: false,
  stages: [newStage()],
  stage: 0,
  armed_at: 0,
  last_change: 0
});
const card = {
  borderRadius: "20px",
  bg: "var(--app-surface)",
  boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.05)",
  borderWidth: "1px",
  borderColor: "blackAlpha.100",
  _dark: {
    bg: "gray.750",
    borderColor: "whiteAlpha.100",
    boxShadow: "0 4px 18px rgba(0,0,0,0.25)"
  }
};
const soft = {
  borderRadius: "14px",
  bg: "blackAlpha.50",
  _dark: {
    bg: "whiteAlpha.50"
  }
};
const clock = (s) => {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor(s % 3600 / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? h + ":" : ""}${mm}:${String(sec).padStart(2, "0")}`;
};
const useServerNow = (offset) => {
  const [now, setNow] = react.exports.useState(() => Date.now() / 1e3 + offset);
  react.exports.useEffect(() => {
    setNow(Date.now() / 1e3 + offset);
    const id = window.setInterval(() => setNow(Date.now() / 1e3 + offset), 1e3);
    return () => window.clearInterval(id);
  }, [offset]);
  return now;
};
const Label = ({
  children,
  help
}) => /* @__PURE__ */ jsxs(Box, {
  mb: 2,
  children: [/* @__PURE__ */ jsx(Text, {
    fontSize: "sm",
    fontWeight: "medium",
    children
  }), help && /* @__PURE__ */ jsx(Text, {
    fontSize: "xs",
    color: "gray.500",
    children: help
  })]
});
const Chip = ({
  on,
  onClick,
  children,
  title
}) => /* @__PURE__ */ jsx(Button, {
  size: "xs",
  h: "26px",
  px: 3,
  borderRadius: "full",
  fontWeight: "medium",
  variant: "unstyled",
  display: "inline-flex",
  onClick,
  title,
  maxW: "100%",
  transition: "background-color .15s, color .15s",
  bg: on ? "primary.500" : "blackAlpha.50",
  color: on ? "white" : void 0,
  _hover: {
    bg: on ? "primary.600" : "blackAlpha.100"
  },
  _dark: {
    bg: on ? "primary.500" : "whiteAlpha.100",
    _hover: {
      bg: on ? "primary.400" : "whiteAlpha.200"
    }
  },
  children: /* @__PURE__ */ jsx(Text, {
    as: "span",
    isTruncated: true,
    children
  })
});
const toneColor = {
  green: "green.400",
  orange: "orange.400",
  red: "red.400",
  gray: "gray.400",
  primary: "primary.400"
};
const Pill = ({
  tone,
  icon,
  children
}) => /* @__PURE__ */ jsxs(HStack, {
  spacing: 1.5,
  px: 2.5,
  h: "24px",
  borderRadius: "full",
  fontSize: "xs",
  fontWeight: "medium",
  sx: {
    background: `color-mix(in srgb, var(--chakra-colors-${tone}-500) 14%, transparent)`
  },
  color: `${tone}.600`,
  _dark: {
    color: `${tone}.200`
  },
  flexShrink: 0,
  whiteSpace: "nowrap",
  children: [/* @__PURE__ */ jsx(Icon, {
    as: icon,
    boxSize: "14px"
  }), /* @__PURE__ */ jsx(Text, {
    as: "span",
    children
  })]
});
const Bar = ({
  value,
  color,
  dim
}) => /* @__PURE__ */ jsx(Box, {
  h: "6px",
  borderRadius: "full",
  bg: "blackAlpha.100",
  _dark: {
    bg: "whiteAlpha.100"
  },
  overflow: "hidden",
  children: /* @__PURE__ */ jsx(Box, {
    h: "100%",
    borderRadius: "full",
    bg: color,
    w: "100%",
    transformOrigin: "left",
    transform: `scaleX(${Math.min(1, Math.max(0.02, value))})`,
    opacity: dim ? 0.35 : 1,
    transition: "transform 1s linear, background-color .3s"
  })
});
const NodeTimer = react.exports.memo(({
  s,
  stage,
  paused,
  offset
}) => {
  const {
    t
  } = useTranslation();
  const now = useServerNow(offset);
  const window2 = stage.minutes * 60;
  const low = s.low_since !== null;
  const elapsed = low ? Math.min(window2, now - s.low_since) : 0;
  const left = window2 - elapsed;
  const progress = low ? elapsed / window2 : 0;
  let tone = "green";
  let label = t("autoChange.trafficOk");
  let icon = CheckCircleIcon;
  if (!s.connected || !s.answering) {
    tone = "gray";
    label = t("autoChange.notAnswering");
    icon = SignalSlashIcon;
  } else if (low && paused) {
    tone = "gray";
    label = t(`autoChange.paused.${paused}`);
    icon = PauseCircleIcon;
  } else if (low && left <= 0) {
    tone = "red";
    label = t("autoChange.switching");
    icon = BoltIcon;
  } else if (low) {
    tone = progress > 0.66 ? "red" : "orange";
    label = t("autoChange.lowFor", {
      time: clock(elapsed)
    });
    icon = ClockIcon;
  }
  const counting = low && !paused && s.connected && s.answering;
  return /* @__PURE__ */ jsxs(Box, {
    ...soft,
    px: 4,
    py: 3,
    children: [/* @__PURE__ */ jsxs(HStack, {
      spacing: 3,
      flexWrap: "wrap",
      rowGap: 2,
      children: [/* @__PURE__ */ jsxs(HStack, {
        spacing: 2,
        minW: "140px",
        flex: "1",
        children: [/* @__PURE__ */ jsx(Box, {
          w: "8px",
          h: "8px",
          borderRadius: "full",
          bg: s.connected && s.answering ? "green.400" : "gray.400"
        }), /* @__PURE__ */ jsx(Icon, {
          as: ServerIcon,
          boxSize: "16px",
          opacity: 0.7
        }), /* @__PURE__ */ jsx(Text, {
          fontWeight: "medium",
          fontSize: "sm",
          isTruncated: true,
          children: s.node
        })]
      }), /* @__PURE__ */ jsx(Tooltip, {
        label: t("autoChange.liveHelp", {
          threshold: stage.threshold_kbps
        }),
        hasArrow: true,
        children: /* @__PURE__ */ jsxs(Text, {
          fontSize: "sm",
          fontFamily: "mono",
          color: low ? toneColor[tone] : void 0,
          whiteSpace: "nowrap",
          children: [formatRate(s.live_rate), /* @__PURE__ */ jsxs(Text, {
            as: "span",
            color: "gray.500",
            fontSize: "xs",
            children: [" ", "/ ", stage.threshold_kbps, " KB/s"]
          })]
        })
      }), /* @__PURE__ */ jsx(Pill, {
        tone,
        icon,
        children: label
      }), counting && /* @__PURE__ */ jsxs(Box, {
        textAlign: "right",
        minW: "84px",
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "lg",
          fontWeight: "semibold",
          fontFamily: "mono",
          lineHeight: "1",
          color: toneColor[tone],
          children: left > 0 ? clock(left) : "0:00"
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "10px",
          color: "gray.500",
          textTransform: "uppercase",
          letterSpacing: "wider",
          children: t("autoChange.untilSwitch")
        })]
      })]
    }), /* @__PURE__ */ jsx(Box, {
      mt: 3,
      children: /* @__PURE__ */ jsx(Bar, {
        value: low ? progress : 1,
        color: toneColor[tone],
        dim: !low
      })
    })]
  });
});
const StartProgress = react.exports.memo(({
  stage,
  start,
  lastChange,
  offset
}) => {
  const {
    t
  } = useTranslation();
  const now = useServerNow(offset);
  const elapsed = lastChange ? now - lastChange : start.elapsed;
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 2,
    children: [stage.start_kbps > 0 && /* @__PURE__ */ jsxs(Box, {
      ...soft,
      px: 4,
      py: 3,
      children: [/* @__PURE__ */ jsxs(HStack, {
        spacing: 3,
        mb: 2,
        flexWrap: "wrap",
        fontSize: "sm",
        children: [/* @__PURE__ */ jsx(Icon, {
          as: BoltIcon,
          boxSize: "16px",
          color: "primary.400"
        }), /* @__PURE__ */ jsx(Text, {
          flex: "1",
          children: t("autoChange.startWhenRate", {
            rate: stage.start_kbps
          })
        }), /* @__PURE__ */ jsxs(Text, {
          fontFamily: "mono",
          children: [formatRate(start.best_rate), /* @__PURE__ */ jsxs(Text, {
            as: "span",
            color: "gray.500",
            fontSize: "xs",
            children: [" ", "/ ", stage.start_kbps, " KB/s"]
          })]
        })]
      }), /* @__PURE__ */ jsx(Bar, {
        value: start.best_rate / (stage.start_kbps * 1024),
        color: "primary.400"
      })]
    }), stage.start_minutes > 0 && /* @__PURE__ */ jsxs(Box, {
      ...soft,
      px: 4,
      py: 3,
      children: [/* @__PURE__ */ jsxs(HStack, {
        spacing: 3,
        mb: 2,
        flexWrap: "wrap",
        fontSize: "sm",
        children: [/* @__PURE__ */ jsx(Icon, {
          as: ClockIcon,
          boxSize: "16px",
          color: "primary.400"
        }), /* @__PURE__ */ jsx(Text, {
          flex: "1",
          children: t("autoChange.startAfter", {
            minutes: stage.start_minutes
          })
        }), /* @__PURE__ */ jsx(Text, {
          fontFamily: "mono",
          fontSize: "lg",
          fontWeight: "semibold",
          lineHeight: "1",
          color: "primary.400",
          children: clock(stage.start_minutes * 60 - elapsed)
        })]
      }), /* @__PURE__ */ jsx(Bar, {
        value: elapsed / (stage.start_minutes * 60),
        color: "primary.400"
      })]
    })]
  });
});
const conditionText = (t, st) => t("autoChange.stageCondition", {
  threshold: st.threshold_kbps,
  minutes: st.minutes
});
const startText = (t, st) => {
  const parts = [];
  if (st.start_kbps > 0)
    parts.push(t("autoChange.startWhenRate", {
      rate: st.start_kbps
    }));
  if (st.start_minutes > 0)
    parts.push(t("autoChange.startAfter", {
      minutes: st.start_minutes
    }));
  return parts.length ? parts.join(` ${t("autoChange.or")} `) : t("autoChange.startAtOnce");
};
const Timeline = ({
  rule,
  st,
  offset
}) => {
  var _a, _b;
  const {
    t
  } = useTranslation();
  const at = (_a = st == null ? void 0 : st.stage) != null ? _a : rule.stage;
  const phase = (_b = st == null ? void 0 : st.phase) != null ? _b : at >= rule.stages.length ? "finished" : "watching";
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 0,
    children: [rule.stages.map((stage, i) => {
      const done = i < at;
      const active = i === at && phase !== "finished";
      const last = i === rule.stages.length - 1;
      const dot = done ? "green.400" : active ? "primary.500" : "blackAlpha.200";
      return /* @__PURE__ */ jsxs(HStack, {
        align: "stretch",
        spacing: 3,
        children: [/* @__PURE__ */ jsxs(VStack, {
          spacing: 0,
          w: "26px",
          flexShrink: 0,
          children: [/* @__PURE__ */ jsx(Box, {
            w: "26px",
            h: "26px",
            borderRadius: "full",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "xs",
            fontWeight: "semibold",
            bg: dot,
            color: done || active ? "white" : "gray.500",
            _dark: !done && !active ? {
              bg: "whiteAlpha.200"
            } : {},
            boxShadow: active ? "0 0 0 4px color-mix(in srgb, var(--chakra-colors-primary-500) 22%, transparent)" : void 0,
            children: done ? /* @__PURE__ */ jsx(CheckIcon, {
              width: 14,
              strokeWidth: 2.5
            }) : i + 1
          }), !last && /* @__PURE__ */ jsx(Box, {
            flex: "1",
            w: "2px",
            minH: "14px",
            bg: done ? "green.400" : "blackAlpha.100",
            _dark: !done ? {
              bg: "whiteAlpha.100"
            } : {}
          })]
        }), /* @__PURE__ */ jsxs(Box, {
          flex: "1",
          pb: last ? 0 : 4,
          minW: 0,
          children: [/* @__PURE__ */ jsxs(HStack, {
            spacing: 2,
            flexWrap: "wrap",
            rowGap: 1,
            minH: "26px",
            children: [/* @__PURE__ */ jsx(Text, {
              fontWeight: "semibold",
              fontSize: "sm",
              children: t("autoChange.stageN", {
                n: i + 1
              })
            }), /* @__PURE__ */ jsxs(HStack, {
              spacing: 1,
              fontFamily: "mono",
              fontSize: "sm",
              children: [/* @__PURE__ */ jsx(ArrowRightIcon, {
                width: 12
              }), /* @__PURE__ */ jsx(Text, {
                children: stage.ip || "\u2014"
              })]
            }), done && /* @__PURE__ */ jsx(Pill, {
              tone: "green",
              icon: CheckCircleIcon,
              children: t("autoChange.stageDone")
            }), active && phase === "watching" && /* @__PURE__ */ jsx(Pill, {
              tone: "primary",
              icon: PlayIcon,
              children: t("autoChange.stageWatching")
            }), active && phase === "starting" && /* @__PURE__ */ jsx(Pill, {
              tone: "orange",
              icon: ClockIcon,
              children: t("autoChange.stageStarting")
            })]
          }), /* @__PURE__ */ jsxs(Text, {
            fontSize: "xs",
            color: "gray.500",
            children: [conditionText(t, stage), i > 0 && ` \xB7 ${t("autoChange.starts")}: ${startText(t, stage)}`]
          }), active && st && /* @__PURE__ */ jsx(Box, {
            mt: 3,
            children: phase === "starting" && st.start ? /* @__PURE__ */ jsx(StartProgress, {
              stage,
              start: st.start,
              lastChange: rule.last_change,
              offset
            }) : st.nodes.length === 0 ? /* @__PURE__ */ jsxs(HStack, {
              ...soft,
              px: 4,
              py: 3,
              spacing: 2,
              fontSize: "sm",
              color: "gray.500",
              children: [/* @__PURE__ */ jsx(Icon, {
                as: st.paused ? PauseCircleIcon : ClockIcon,
                boxSize: "16px"
              }), /* @__PURE__ */ jsx(Text, {
                children: st.paused ? t(`autoChange.paused.${st.paused}`) : t("autoChange.noData")
              })]
            }) : /* @__PURE__ */ jsx(VStack, {
              align: "stretch",
              spacing: 2,
              children: st.nodes.map((s) => /* @__PURE__ */ jsx(NodeTimer, {
                s,
                stage,
                paused: st.paused,
                offset
              }, s.key))
            })
          })]
        })]
      }, i);
    }), phase === "finished" && rule.stages.length > 0 && /* @__PURE__ */ jsxs(HStack, {
      ...soft,
      mt: 4,
      px: 4,
      py: 3,
      spacing: 2,
      fontSize: "sm",
      children: [/* @__PURE__ */ jsx(Icon, {
        as: CheckCircleIcon,
        boxSize: "18px",
        color: "green.400"
      }), /* @__PURE__ */ jsx(Text, {
        children: t("autoChange.finished")
      })]
    })]
  });
};
const Num = ({
  value,
  onChange,
  min = 0,
  max,
  w = "80px"
}) => /* @__PURE__ */ jsx(NumberInput, {
  size: "sm",
  w,
  min,
  max,
  value,
  onChange: (_, n) => onChange(Number.isNaN(n) ? min : n),
  children: /* @__PURE__ */ jsx(NumberInputField, {
    borderRadius: "10px"
  })
});
const StageEditor = ({
  stage,
  index,
  onChange,
  onDelete
}) => {
  const {
    t
  } = useTranslation();
  const set = (p) => onChange({
    ...stage,
    ...p
  });
  return /* @__PURE__ */ jsxs(Box, {
    ...soft,
    p: 4,
    children: [/* @__PURE__ */ jsxs(HStack, {
      mb: 3,
      children: [/* @__PURE__ */ jsx(Box, {
        w: "22px",
        h: "22px",
        borderRadius: "full",
        bg: "primary.500",
        color: "white",
        fontSize: "xs",
        fontWeight: "semibold",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        children: index + 1
      }), /* @__PURE__ */ jsx(Text, {
        fontWeight: "semibold",
        fontSize: "sm",
        flex: "1",
        children: t("autoChange.stageN", {
          n: index + 1
        })
      }), onDelete && /* @__PURE__ */ jsx(IconButton, {
        size: "xs",
        variant: "ghost",
        borderRadius: "full",
        "aria-label": "remove",
        icon: /* @__PURE__ */ jsx(XMarkIcon, {
          width: 16
        }),
        onClick: onDelete
      })]
    }), /* @__PURE__ */ jsxs(VStack, {
      align: "stretch",
      spacing: 3,
      fontSize: "sm",
      children: [index > 0 && /* @__PURE__ */ jsxs(Box, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          mb: 1.5,
          children: t("autoChange.startsWhen")
        }), /* @__PURE__ */ jsxs(HStack, {
          spacing: 2,
          flexWrap: "wrap",
          rowGap: 2,
          children: [/* @__PURE__ */ jsx(Text, {
            children: t("autoChange.prevIpCarries")
          }), /* @__PURE__ */ jsx(Num, {
            value: stage.start_kbps,
            onChange: (n) => set({
              start_kbps: n
            })
          }), /* @__PURE__ */ jsx(Text, {
            children: "KB/s"
          }), /* @__PURE__ */ jsx(Text, {
            color: "gray.500",
            children: t("autoChange.or")
          }), /* @__PURE__ */ jsx(Num, {
            value: stage.start_minutes,
            max: 1440,
            onChange: (n) => set({
              start_minutes: n
            })
          }), /* @__PURE__ */ jsx(Text, {
            children: t("autoChange.minutesPassed")
          })]
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          mt: 1,
          children: t("autoChange.startsHelp")
        })]
      }), /* @__PURE__ */ jsxs(Box, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          mb: 1.5,
          children: t("autoChange.firesWhen")
        }), /* @__PURE__ */ jsxs(HStack, {
          spacing: 2,
          flexWrap: "wrap",
          rowGap: 2,
          children: [/* @__PURE__ */ jsx(Text, {
            children: t("autoChange.under")
          }), /* @__PURE__ */ jsx(Num, {
            w: "90px",
            value: stage.threshold_kbps,
            onChange: (n) => set({
              threshold_kbps: n
            })
          }), /* @__PURE__ */ jsx(Text, {
            children: "KB/s"
          }), /* @__PURE__ */ jsx(Text, {
            children: t("autoChange.for")
          }), /* @__PURE__ */ jsx(Num, {
            value: stage.minutes,
            min: 1,
            max: 1440,
            onChange: (n) => set({
              minutes: n
            })
          }), /* @__PURE__ */ jsx(Text, {
            children: t("autoChange.minutes")
          })]
        })]
      }), /* @__PURE__ */ jsxs(Box, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          mb: 1.5,
          children: t("autoChange.switchTo")
        }), /* @__PURE__ */ jsx(Input, {
          size: "sm",
          borderRadius: "10px",
          fontFamily: "mono",
          placeholder: "1.2.3.4 / cdn.example.com",
          value: stage.ip,
          onChange: (e) => set({
            ip: e.target.value
          })
        })]
      })]
    })]
  });
};
const RuleCard = ({
  rule,
  state,
  status,
  offset,
  onChange,
  onDelete,
  onSwitch,
  onReset,
  busy
}) => {
  var _a;
  const {
    t
  } = useTranslation();
  const [open, setOpen] = react.exports.useState(!rule.id);
  const set = (p) => onChange({
    ...rule,
    ...p
  });
  const byTag = react.exports.useMemo(() => {
    const m = {};
    state.hosts.forEach((h) => m[h.inbound_tag] = [...m[h.inbound_tag] || [], h]);
    return m;
  }, [state.hosts]);
  const toggle = (list, v) => list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  const finished = ((_a = status == null ? void 0 : status.phase) != null ? _a : "") === "finished";
  const setStage = (i, s) => set({
    stages: rule.stages.map((x, n) => n === i ? s : x)
  });
  return /* @__PURE__ */ jsxs(Box, {
    ...card,
    overflow: "hidden",
    opacity: rule.enabled ? 1 : 0.75,
    transition: "opacity .2s",
    children: [/* @__PURE__ */ jsxs(HStack, {
      spacing: 2,
      px: 5,
      pt: 4,
      pb: 3,
      children: [/* @__PURE__ */ jsx(Switch, {
        colorScheme: "primary",
        isChecked: rule.enabled,
        onChange: (e) => set({
          enabled: e.target.checked
        }),
        mr: 1
      }), /* @__PURE__ */ jsx(Input, {
        variant: "unstyled",
        fontWeight: "semibold",
        fontSize: "md",
        placeholder: t("autoChange.namePlaceholder"),
        value: rule.name,
        onChange: (e) => set({
          name: e.target.value
        })
      }), /* @__PURE__ */ jsx(Tooltip, {
        label: t("autoChange.switchNow"),
        hasArrow: true,
        children: /* @__PURE__ */ jsx(IconButton, {
          size: "sm",
          variant: "ghost",
          borderRadius: "full",
          "aria-label": "switch",
          icon: /* @__PURE__ */ jsx(ArrowsRightLeftIcon, {
            width: 18
          }),
          isLoading: busy,
          isDisabled: !rule.id || finished,
          onClick: onSwitch
        })
      }), /* @__PURE__ */ jsx(Tooltip, {
        label: t("autoChange.reset"),
        hasArrow: true,
        children: /* @__PURE__ */ jsx(IconButton, {
          size: "sm",
          variant: "ghost",
          borderRadius: "full",
          "aria-label": "reset",
          icon: /* @__PURE__ */ jsx(ArrowUturnLeftIcon, {
            width: 18
          }),
          isDisabled: !rule.id || busy,
          onClick: onReset
        })
      }), /* @__PURE__ */ jsx(IconButton, {
        size: "sm",
        variant: "ghost",
        borderRadius: "full",
        colorScheme: "red",
        "aria-label": "delete",
        icon: /* @__PURE__ */ jsx(TrashIcon, {
          width: 18
        }),
        onClick: onDelete
      })]
    }), /* @__PURE__ */ jsxs(Box, {
      px: 5,
      pb: 5,
      children: [/* @__PURE__ */ jsxs(Text, {
        fontSize: "xs",
        color: "gray.500",
        mb: 4,
        children: [t("autoChange.summary", {
          hosts: rule.host_ids.length
        }), rule.last_change > 0 && ` \xB7 ${t("autoChange.lastSwitch")} ${dayjs.unix(rule.last_change).fromNow()}`]
      }), rule.id ? /* @__PURE__ */ jsx(Timeline, {
        rule,
        st: status,
        offset
      }) : /* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        color: "gray.500",
        children: t("autoChange.saveToStart")
      })]
    }), /* @__PURE__ */ jsxs(Button, {
      variant: "unstyled",
      w: "full",
      h: "auto",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      px: 5,
      py: 2.5,
      borderTopWidth: "1px",
      borderColor: "blackAlpha.100",
      _dark: {
        borderColor: "whiteAlpha.100"
      },
      borderRadius: 0,
      fontSize: "sm",
      fontWeight: "medium",
      color: "gray.500",
      _hover: {
        color: "primary.500"
      },
      onClick: () => setOpen((o) => !o),
      children: [/* @__PURE__ */ jsx(Text, {
        as: "span",
        children: t("autoChange.settings")
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
        spacing: 5,
        px: 5,
        pb: 5,
        pt: 1,
        children: [/* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Label, {
            help: t("autoChange.hostsHelp"),
            children: t("autoChange.hosts")
          }), /* @__PURE__ */ jsx(VStack, {
            align: "stretch",
            spacing: 3,
            children: Object.entries(byTag).map(([tag, hosts]) => /* @__PURE__ */ jsxs(Box, {
              children: [/* @__PURE__ */ jsx(Text, {
                fontSize: "xs",
                color: "gray.500",
                mb: 1.5,
                children: tag
              }), /* @__PURE__ */ jsx(HStack, {
                spacing: 1.5,
                flexWrap: "wrap",
                rowGap: 1.5,
                children: hosts.map((h) => /* @__PURE__ */ jsxs(Chip, {
                  on: rule.host_ids.includes(h.id),
                  title: `${h.remark}
${h.address}`,
                  onClick: () => set({
                    host_ids: toggle(rule.host_ids, h.id)
                  }),
                  children: [h.remark.length > 28 ? h.remark.slice(0, 28) + "\u2026" : h.remark, " \xB7 ", h.address]
                }, h.id))
              })]
            }, tag))
          })]
        }), /* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Label, {
            help: t("autoChange.nodesHelp"),
            children: t("autoChange.nodes")
          }), /* @__PURE__ */ jsxs(HStack, {
            spacing: 1.5,
            flexWrap: "wrap",
            rowGap: 1.5,
            children: [/* @__PURE__ */ jsx(Chip, {
              on: rule.nodes.length === 0,
              onClick: () => set({
                nodes: []
              }),
              children: t("autoChange.anyNode")
            }), state.nodes.map((n) => /* @__PURE__ */ jsx(Chip, {
              on: rule.nodes.includes(n.key),
              onClick: () => set({
                nodes: toggle(rule.nodes, n.key)
              }),
              children: n.name
            }, n.key))]
          })]
        }), /* @__PURE__ */ jsxs(HStack, {
          ...soft,
          p: 3,
          spacing: 3,
          align: "flex-start",
          children: [/* @__PURE__ */ jsx(Switch, {
            size: "sm",
            mt: 0.5,
            colorScheme: "primary",
            isChecked: rule.require_online,
            onChange: (e) => set({
              require_online: e.target.checked
            })
          }), /* @__PURE__ */ jsxs(Box, {
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              children: t("autoChange.requireOnline")
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "xs",
              color: "gray.500",
              children: t("autoChange.requireOnlineHelp")
            })]
          })]
        }), /* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Label, {
            help: t("autoChange.stagesHelp"),
            children: t("autoChange.stages")
          }), /* @__PURE__ */ jsxs(VStack, {
            align: "stretch",
            spacing: 3,
            children: [rule.stages.map((s, i) => /* @__PURE__ */ jsx(StageEditor, {
              stage: s,
              index: i,
              onChange: (next) => setStage(i, next),
              onDelete: rule.stages.length > 1 ? () => set({
                stages: rule.stages.filter((_, n) => n !== i)
              }) : void 0
            }, i)), /* @__PURE__ */ jsx(Button, {
              size: "sm",
              variant: "ghost",
              borderRadius: "full",
              alignSelf: "flex-start",
              leftIcon: /* @__PURE__ */ jsx(PlusIcon, {
                width: 16
              }),
              onClick: () => set({
                stages: [...rule.stages, newStage(rule.stages[rule.stages.length - 1])]
              }),
              children: t("autoChange.addStage")
            })]
          })]
        })]
      })
    })]
  });
};
const AutoChangePage = () => {
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const {
    data,
    refetch
  } = useQuery({
    queryKey: "auto-change",
    queryFn: () => fetch("/auto-change"),
    refetchOnWindowFocus: false
  });
  const {
    data: live,
    refetch: refetchLive
  } = useQuery({
    queryKey: "auto-change-status",
    queryFn: () => fetch("/auto-change/status"),
    refetchInterval: 4e3,
    refetchOnWindowFocus: false
  });
  const [rules, setRules] = react.exports.useState(null);
  const [dirty, setDirty] = react.exports.useState(false);
  const [saving, setSaving] = react.exports.useState(false);
  const [switching, setSwitching] = react.exports.useState("");
  react.exports.useEffect(() => {
    if (data && !dirty)
      setRules(data.rules);
  }, [data]);
  const logSize = react.exports.useRef();
  react.exports.useEffect(() => {
    if ((live == null ? void 0 : live.log_size) === void 0)
      return;
    if (logSize.current !== void 0 && logSize.current !== live.log_size && !dirty)
      refetch();
    logSize.current = live.log_size;
  }, [live == null ? void 0 : live.log_size]);
  const status = live || (data == null ? void 0 : data.status);
  const offset = react.exports.useMemo(() => status ? Math.round(status.now - Date.now() / 1e3) : 0, [status == null ? void 0 : status.now]);
  const fail = (e) => {
    var _a, _b;
    return toast({
      title: ((_b = (_a = e == null ? void 0 : e.response) == null ? void 0 : _a._data) == null ? void 0 : _b.detail) || (e == null ? void 0 : e.message) || "Error",
      status: "error",
      position: "top",
      duration: 4e3
    });
  };
  const update = (list) => {
    setRules(list);
    setDirty(true);
  };
  const save = () => {
    setSaving(true);
    fetch("/auto-change", {
      method: "PUT",
      body: {
        rules
      }
    }).then((d) => {
      setDirty(false);
      setRules(d.rules);
      refetch();
      toast({
        title: t("autoChange.saved"),
        status: "success",
        position: "top",
        duration: 2e3
      });
    }).catch(fail).finally(() => setSaving(false));
  };
  const act = (id, what) => {
    setSwitching(id);
    fetch(`/auto-change/${id}/${what}`, {
      method: "POST"
    }).then(() => {
      refetch();
      refetchLive();
    }).catch(fail).finally(() => setSwitching(""));
  };
  if (!data || !rules)
    return null;
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 5,
    maxW: "1100px",
    children: [/* @__PURE__ */ jsxs(HStack, {
      spacing: 4,
      align: "center",
      flexWrap: "wrap",
      rowGap: 3,
      children: [/* @__PURE__ */ jsx(Box, {
        flex: "1",
        minW: "240px",
        children: /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          color: "gray.500",
          maxW: "720px",
          children: t("autoChange.help")
        })
      }), /* @__PURE__ */ jsx(Button, {
        size: "sm",
        variant: "ghost",
        borderRadius: "full",
        leftIcon: /* @__PURE__ */ jsx(PlusIcon, {
          width: 16
        }),
        onClick: () => update([...rules, newRule()]),
        children: t("autoChange.addRule")
      }), /* @__PURE__ */ jsx(Button, {
        size: "sm",
        colorScheme: "primary",
        borderRadius: "full",
        px: 5,
        isLoading: saving,
        isDisabled: !dirty,
        onClick: save,
        children: dirty ? t("autoChange.saveChanges") : t("autoChange.save")
      })]
    }), rules.length === 0 && /* @__PURE__ */ jsxs(VStack, {
      ...card,
      py: 10,
      spacing: 3,
      color: "gray.500",
      children: [/* @__PURE__ */ jsx(Icon, {
        as: ArrowsRightLeftIcon,
        boxSize: "28px"
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        children: t("autoChange.empty")
      }), /* @__PURE__ */ jsx(Button, {
        size: "sm",
        colorScheme: "primary",
        borderRadius: "full",
        leftIcon: /* @__PURE__ */ jsx(PlusIcon, {
          width: 16
        }),
        onClick: () => update([newRule()]),
        children: t("autoChange.addRule")
      })]
    }), rules.map((r, i) => {
      var _a;
      return /* @__PURE__ */ jsx(RuleCard, {
        rule: {
          ...r,
          ...((_a = live == null ? void 0 : live.current) == null ? void 0 : _a[r.id]) || {}
        },
        state: data,
        status: status == null ? void 0 : status.rules[r.id],
        offset,
        busy: switching === r.id,
        onChange: (next) => update(rules.map((x, n) => n === i ? next : x)),
        onDelete: () => update(rules.filter((_, n) => n !== i)),
        onSwitch: () => act(r.id, "switch"),
        onReset: () => act(r.id, "reset")
      }, r.id || `new-${i}`);
    }), /* @__PURE__ */ jsxs(Box, {
      ...card,
      p: 5,
      children: [/* @__PURE__ */ jsx(Text, {
        fontWeight: "semibold",
        fontSize: "sm",
        mb: 3,
        children: t("autoChange.log")
      }), data.log.length === 0 ? /* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        color: "gray.500",
        children: t("autoChange.noLog")
      }) : /* @__PURE__ */ jsx(VStack, {
        align: "stretch",
        spacing: 0,
        children: data.log.slice(0, 30).map((e, i) => /* @__PURE__ */ jsxs(HStack, {
          spacing: 3,
          py: 2.5,
          fontSize: "sm",
          flexWrap: "wrap",
          rowGap: 1,
          borderTopWidth: i ? "1px" : 0,
          borderColor: "blackAlpha.100",
          _dark: {
            borderColor: "whiteAlpha.100"
          },
          children: [/* @__PURE__ */ jsx(Box, {
            w: "8px",
            h: "8px",
            borderRadius: "full",
            bg: e.reason === "manual" ? "primary.400" : "orange.400",
            flexShrink: 0
          }), /* @__PURE__ */ jsx(Text, {
            color: "gray.500",
            fontSize: "xs",
            minW: "96px",
            title: dayjs.unix(e.time).format("YYYY-MM-DD HH:mm:ss"),
            children: dayjs.unix(e.time).format("DD.MM HH:mm")
          }), /* @__PURE__ */ jsxs(Text, {
            fontWeight: "medium",
            children: [e.rule, e.stage ? /* @__PURE__ */ jsxs(Text, {
              as: "span",
              color: "gray.500",
              fontWeight: "normal",
              children: [" ", "\xB7 ", t("autoChange.stageN", {
                n: e.stage
              })]
            }) : null]
          }), /* @__PURE__ */ jsxs(HStack, {
            spacing: 1.5,
            fontFamily: "mono",
            fontSize: "xs",
            children: [/* @__PURE__ */ jsx(Text, {
              opacity: 0.7,
              children: e.old
            }), /* @__PURE__ */ jsx(ArrowRightIcon, {
              width: 12
            }), /* @__PURE__ */ jsx(Text, {
              fontWeight: "semibold",
              children: e.new
            })]
          }), /* @__PURE__ */ jsx(Text, {
            color: "gray.500",
            fontSize: "xs",
            flex: "1",
            textAlign: "right",
            minW: "120px",
            children: e.reason === "manual" ? t("autoChange.manual") : e.reason
          })]
        }, i))
      })]
    })]
  });
};
export {
  AutoChangePage
};
