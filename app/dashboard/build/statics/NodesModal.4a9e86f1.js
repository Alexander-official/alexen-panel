import { I as Icon, D as DeleteIcon, r as relativeExpiryDate, s as statusColors, b as formatBytes, f as fetch, k as Input$1, R as ReloadIcon, u as useDashboardPick, M as Modal$1, d as ModalOverlay$1, e as ModalContent$1, h as ModalHeader$1, i as ModalCloseButton$1, j as ModalBody$1 } from "./index.e0e646b5.js";
import { i as instance, u as useTranslation, W as useToast, cn as useQueryClient, co as useMutation, h as jsxs, M as Modal, k as jsx, l as ModalOverlay, m as ModalContent, n as ModalHeader, p as ModalCloseButton, q as ModalBody, T as Text, X as Trans, Y as ModalFooter, o as Button, Z as Spinner, ax as Fragment, D as Badge, O as create, g as useQuery, b3 as FormControl, b4 as FormLabel, aa as Select, c as react, H as HStack, cp as CommandLineIcon, cq as CheckCircleIcon, cr as ExclamationTriangleIcon, cj as Progress, N as Box, ah as VStack, bm as Checkbox, aj as Tooltip, K as SimpleGrid, a7 as Input, bO as ButtonGroup, bJ as Textarea, E as chakra, aY as SquaresPlusIcon, cm as PlusIcon$1, bD as useForm, bi as AccordionItem, bj as AccordionButton, cs as AccordionIcon, bk as AccordionPanel, bK as Alert, bL as AlertIcon, a9 as IconButton, ct as EyeIcon, cu as EyeSlashIcon, az as Collapse, bH as Controller, ak as Switch, bf as Accordion, bE as s } from "./vendor.0404bf65.js";
import { u as useNodes, F as FetchNodesQueryKey, a as useNodesQuery, g as getNodeDefaultValues, N as NodeSchema } from "./NodesContext.620c0414.js";
/* empty css                */import { NodeVpnToggles, applyNodeVpn } from "./VpnPage.91037de5.js";
import { u as useCoresQuery, a as useCoreSettings, F as FetchCoresQueryKey } from "./CoreSettingsContext.ae7a60ef.js";
import { s as serverMessage } from "./serverMessage.7228cafd.js";
import { C as COUNTRIES, c as countryName, f as flagEmoji } from "./flags.7f331219.js";
const generateErrorMessage = (e, toast, form) => {
  if (e.response && e.response._data) {
    if (typeof e.response._data.detail === "string")
      return toast({
        title: e.response._data.detail,
        status: "error",
        isClosable: true,
        position: "top",
        duration: 3e3
      });
    if (typeof e.response._data.detail === "object") {
      if (form) {
        Object.keys(e.response._data.detail).forEach(
          (errorKey) => form.setError(errorKey, {
            message: e.response._data.detail[errorKey]
          })
        );
        return;
      }
    }
  }
  return toast({
    title: instance.t("errors.generic"),
    status: "error",
    isClosable: true,
    position: "top",
    duration: 3e3
  });
};
const generateSuccessMessage = (message, toast) => {
  return toast({
    title: message,
    status: "success",
    isClosable: true,
    position: "top",
    duration: 3e3
  });
};
const DeleteNodeModal = ({
  deleteCallback
}) => {
  const {
    deleteNode,
    deletingNode,
    setDeletingNode
  } = useNodes();
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const onClose = () => {
    setDeletingNode(null);
  };
  const {
    isLoading,
    mutate: onDelete
  } = useMutation(deleteNode, {
    onSuccess: () => {
      generateSuccessMessage(t("deleteNode.deleteSuccess", {
        name: deletingNode && deletingNode.name
      }), toast);
      setDeletingNode(null);
      queryClient.invalidateQueries(FetchNodesQueryKey);
      deleteCallback && deleteCallback();
    },
    onError: (e) => {
      generateErrorMessage(e, toast);
    }
  });
  return /* @__PURE__ */ jsxs(Modal, {
    isCentered: true,
    isOpen: !!deletingNode,
    onClose,
    size: "sm",
    children: [/* @__PURE__ */ jsx(ModalOverlay, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent, {
      mx: "3",
      children: [/* @__PURE__ */ jsx(ModalHeader, {
        pt: 6,
        children: /* @__PURE__ */ jsx(Icon, {
          color: "red",
          children: /* @__PURE__ */ jsx(DeleteIcon, {})
        })
      }), /* @__PURE__ */ jsx(ModalCloseButton, {
        mt: 3
      }), /* @__PURE__ */ jsxs(ModalBody, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontWeight: "semibold",
          fontSize: "lg",
          children: t("deleteNode.title")
        }), deletingNode && /* @__PURE__ */ jsx(Text, {
          mt: 1,
          fontSize: "sm",
          _dark: {
            color: "gray.400"
          },
          color: "gray.600",
          children: /* @__PURE__ */ jsx(Trans, {
            components: {
              b: /* @__PURE__ */ jsx("b", {})
            },
            children: t("deleteNode.prompt", {
              name: deletingNode.name
            })
          })
        })]
      }), /* @__PURE__ */ jsxs(ModalFooter, {
        display: "flex",
        children: [/* @__PURE__ */ jsx(Button, {
          size: "sm",
          onClick: onClose,
          mr: 3,
          w: "full",
          variant: "outline",
          children: t("cancel")
        }), /* @__PURE__ */ jsx(Button, {
          size: "sm",
          w: "full",
          colorScheme: "red",
          onClick: () => onDelete(),
          leftIcon: isLoading ? /* @__PURE__ */ jsx(Spinner, {
            size: "xs"
          }) : void 0,
          children: t("delete")
        })]
      })]
    })]
  });
};
const NodeModalStatusBadge = ({
  expiryDate,
  status: userStatus,
  compact = false,
  showDetail = true,
  extraText
}) => {
  const {
    t
  } = useTranslation();
  const dateInfo = relativeExpiryDate(expiryDate);
  const Icon2 = statusColors[userStatus].icon;
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [/* @__PURE__ */ jsxs(Badge, {
      colorScheme: statusColors[userStatus].statusColor,
      rounded: "full",
      display: "inline-flex",
      px: 3,
      py: 1,
      columnGap: compact ? 1 : 2,
      alignItems: "center",
      children: [/* @__PURE__ */ jsx(Icon2, {
        w: compact ? 3 : 4
      }), showDetail && /* @__PURE__ */ jsxs(Text, {
        textTransform: "capitalize",
        fontSize: compact ? ".7rem" : ".875rem",
        lineHeight: compact ? "1rem" : "1.25rem",
        fontWeight: "medium",
        letterSpacing: "tighter",
        children: [userStatus && t(`nodeModal.status.${userStatus}`), extraText && `: ${extraText}`]
      })]
    }), showDetail && expiryDate && /* @__PURE__ */ jsx(Text, {
      display: "inline-block",
      fontSize: "xs",
      fontWeight: "medium",
      ml: "2",
      color: "gray.600",
      _dark: {
        color: "gray.400"
      },
      children: t(dateInfo.status, {
        time: dateInfo.time
      })
    })]
  });
};
const emptySSH = () => ({
  host: "",
  port: 22,
  username: "root",
  auth: "password",
  password: "",
  private_key: "",
  passphrase: ""
});
const sshFilled = (s2) => s2.auth === "password" ? !!s2.password : !!s2.private_key.trim();
const useNodesExtras = () => useQuery({
  queryKey: "nodes-extras",
  queryFn: () => fetch("/nodes/extras"),
  staleTime: 3e4
});
const useNodesSystem = (enabled = true) => useQuery({
  queryKey: "nodes-system",
  queryFn: () => fetch("/nodes/system"),
  refetchInterval: 1e4,
  enabled
});
const saveNodeExtra = (nodeId, body) => fetch(`/node/${nodeId}/extra`, {
  method: "PUT",
  body
});
const FlagSelect = ({
  value,
  onChange
}) => {
  const {
    t,
    i18n
  } = useTranslation();
  const lang = i18n.language || "en";
  const list = COUNTRIES.map((c) => ({
    c,
    name: countryName(c, lang)
  }));
  const rest = list.slice(18).sort((a, b) => a.name.localeCompare(b.name, lang));
  return /* @__PURE__ */ jsxs(FormControl, {
    children: [/* @__PURE__ */ jsxs(FormLabel, {
      fontSize: "sm",
      mb: 1,
      children: [t("nodeExtra.flag"), " ", /* @__PURE__ */ jsxs(Text, {
        as: "span",
        color: "gray.500",
        fontWeight: "normal",
        fontSize: "xs",
        children: ["(", t("userDialog.optional"), ")"]
      })]
    }), /* @__PURE__ */ jsxs(Select, {
      size: "sm",
      borderRadius: "md",
      value: value || "",
      onChange: (e) => onChange(e.target.value),
      children: [/* @__PURE__ */ jsxs("option", {
        value: "",
        children: ["\u2014 ", t("nodeExtra.noFlag"), " \u2014"]
      }), [...list.slice(0, 18), ...rest].map(({
        c,
        name
      }) => /* @__PURE__ */ jsxs("option", {
        value: c,
        children: [flagEmoji(c), " ", name]
      }, c))]
    })]
  });
};
const SSHFields = ({
  value,
  onChange,
  addressHint,
  saved
}) => {
  const {
    t
  } = useTranslation();
  const set = (p) => onChange({
    ...value,
    ...p
  });
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 2,
    children: [/* @__PURE__ */ jsxs(SimpleGrid, {
      columns: 3,
      spacing: 2,
      children: [/* @__PURE__ */ jsxs(FormControl, {
        gridColumn: "span 2",
        children: [/* @__PURE__ */ jsx(FormLabel, {
          fontSize: "xs",
          mb: 0.5,
          children: t("nodeExtra.sshHost")
        }), /* @__PURE__ */ jsx(Input, {
          size: "sm",
          borderRadius: "md",
          value: value.host,
          placeholder: addressHint || "1.2.3.4",
          onChange: (e) => set({
            host: e.target.value.trim()
          })
        })]
      }), /* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          fontSize: "xs",
          mb: 0.5,
          children: t("nodeExtra.sshPort")
        }), /* @__PURE__ */ jsx(Input, {
          size: "sm",
          borderRadius: "md",
          type: "number",
          value: value.port,
          onChange: (e) => set({
            port: parseInt(e.target.value) || 22
          })
        })]
      })]
    }), /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: 2,
      spacing: 2,
      children: [/* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          fontSize: "xs",
          mb: 0.5,
          children: t("nodeExtra.sshUser")
        }), /* @__PURE__ */ jsx(Input, {
          size: "sm",
          borderRadius: "md",
          value: value.username,
          onChange: (e) => set({
            username: e.target.value.trim()
          })
        })]
      }), /* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          fontSize: "xs",
          mb: 0.5,
          children: t("nodeExtra.sshAuth")
        }), /* @__PURE__ */ jsxs(ButtonGroup, {
          size: "sm",
          isAttached: true,
          variant: "outline",
          w: "full",
          children: [/* @__PURE__ */ jsx(Button, {
            flex: 1,
            colorScheme: "primary",
            variant: value.auth === "password" ? "solid" : "outline",
            onClick: () => set({
              auth: "password"
            }),
            children: t("nodeExtra.authPassword")
          }), /* @__PURE__ */ jsx(Button, {
            flex: 1,
            colorScheme: "primary",
            variant: value.auth === "key" ? "solid" : "outline",
            onClick: () => set({
              auth: "key"
            }),
            children: t("nodeExtra.authKey")
          })]
        })]
      })]
    }), value.auth === "password" ? /* @__PURE__ */ jsxs(FormControl, {
      children: [/* @__PURE__ */ jsx(FormLabel, {
        fontSize: "xs",
        mb: 0.5,
        children: t("password")
      }), /* @__PURE__ */ jsx(Input, {
        size: "sm",
        borderRadius: "md",
        type: "password",
        autoComplete: "new-password",
        value: value.password,
        placeholder: saved ? t("nodeExtra.savedKeep") : "",
        onChange: (e) => set({
          password: e.target.value
        })
      })]
    }) : /* @__PURE__ */ jsxs(Fragment, {
      children: [/* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          fontSize: "xs",
          mb: 0.5,
          children: t("nodeExtra.privateKey")
        }), /* @__PURE__ */ jsx(Textarea, {
          size: "sm",
          borderRadius: "md",
          rows: 4,
          fontFamily: "mono",
          fontSize: "2xs",
          value: value.private_key,
          placeholder: saved ? t("nodeExtra.savedKeep") : "-----BEGIN OPENSSH PRIVATE KEY-----",
          onChange: (e) => set({
            private_key: e.target.value
          })
        })]
      }), /* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          fontSize: "xs",
          mb: 0.5,
          children: t("nodeExtra.passphrase")
        }), /* @__PURE__ */ jsx(Input, {
          size: "sm",
          borderRadius: "md",
          type: "password",
          autoComplete: "new-password",
          value: value.passphrase,
          placeholder: t("userDialog.optional"),
          onChange: (e) => set({
            passphrase: e.target.value
          })
        })]
      })]
    }), value.username !== "root" && /* @__PURE__ */ jsx(Text, {
      fontSize: "2xs",
      color: "gray.500",
      children: t("nodeExtra.sudoHint")
    })]
  });
};
const useInstall = create((set) => ({
  job: null,
  title: "",
  open: (job, title) => set({
    job,
    title
  }),
  close: () => set({
    job: null
  })
}));
const startInstall = (nodeId, body) => fetch(`/node/${nodeId}/install`, {
  method: "POST",
  body
}).then((r) => r.job);
const InstallProgress = () => {
  const {
    t
  } = useTranslation();
  const {
    job,
    title,
    close
  } = useInstall();
  const queryClient = useQueryClient();
  const [state, setState] = react.exports.useState(null);
  const lines = react.exports.useRef([]);
  const box = react.exports.useRef(null);
  react.exports.useEffect(() => {
    if (!job)
      return;
    lines.current = [];
    setState(null);
    let stop = false;
    const tick = () => fetch(`/node-install/${job}?offset=${lines.current.length}`).then((j) => {
      lines.current = [...lines.current, ...j.lines];
      setState({
        ...j,
        lines: lines.current
      });
      if (j.done) {
        queryClient.invalidateQueries("fetch-nodes-query-key");
        queryClient.invalidateQueries("nodes-system");
      } else if (!stop)
        setTimeout(tick, 1200);
    }).catch(() => !stop && setTimeout(tick, 2500));
    tick();
    return () => {
      stop = true;
    };
  }, [job]);
  react.exports.useEffect(() => {
    var _a;
    (_a = box.current) == null ? void 0 : _a.scrollTo({
      top: box.current.scrollHeight
    });
  }, [state == null ? void 0 : state.lines.length]);
  return /* @__PURE__ */ jsxs(Modal, {
    isOpen: !!job,
    onClose: () => (state == null ? void 0 : state.done) && close(),
    size: "2xl",
    closeOnOverlayClick: !!(state == null ? void 0 : state.done),
    children: [/* @__PURE__ */ jsx(ModalOverlay, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent, {
      mx: 3,
      children: [/* @__PURE__ */ jsx(ModalHeader, {
        children: /* @__PURE__ */ jsxs(HStack, {
          spacing: 2,
          children: [/* @__PURE__ */ jsx(CommandLineIcon, {
            width: 20,
            height: 20
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "md",
            children: t("nodeExtra.installing", {
              name: title
            })
          })]
        })
      }), (state == null ? void 0 : state.done) && /* @__PURE__ */ jsx(ModalCloseButton, {}), /* @__PURE__ */ jsxs(ModalBody, {
        children: [/* @__PURE__ */ jsx(HStack, {
          mb: 2,
          spacing: 2,
          children: !(state == null ? void 0 : state.done) ? /* @__PURE__ */ jsxs(Fragment, {
            children: [/* @__PURE__ */ jsx(Spinner, {
              size: "sm",
              color: "primary.500"
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              children: (state == null ? void 0 : state.step) || t("nodeExtra.connecting")
            })]
          }) : state.ok ? /* @__PURE__ */ jsxs(Fragment, {
            children: [/* @__PURE__ */ jsx(CheckCircleIcon, {
              width: 18,
              height: 18,
              color: "var(--chakra-colors-green-400)"
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              color: "green.400",
              children: t("nodeExtra.installDone")
            })]
          }) : /* @__PURE__ */ jsxs(Fragment, {
            children: [/* @__PURE__ */ jsx(ExclamationTriangleIcon, {
              width: 18,
              height: 18,
              color: "var(--chakra-colors-red-400)"
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              color: "red.400",
              children: serverMessage(t, state.error)
            })]
          })
        }), /* @__PURE__ */ jsxs(HStack, {
          spacing: 3,
          mb: 2,
          children: [/* @__PURE__ */ jsx(Progress, {
            flex: "1",
            size: "sm",
            value: (state == null ? void 0 : state.percent) || 0,
            colorScheme: (state == null ? void 0 : state.done) && !state.ok ? "red" : (state == null ? void 0 : state.done) ? "green" : "primary",
            borderRadius: "full",
            hasStripe: !(state == null ? void 0 : state.done),
            isAnimated: !(state == null ? void 0 : state.done)
          }), /* @__PURE__ */ jsxs(Text, {
            fontSize: "sm",
            fontWeight: "semibold",
            w: "44px",
            textAlign: "right",
            children: [(state == null ? void 0 : state.percent) || 0, "%"]
          })]
        }), /* @__PURE__ */ jsx(HStack, {
          spacing: 1.5,
          mb: 3,
          flexWrap: "wrap",
          rowGap: 1.5,
          children: ((state == null ? void 0 : state.steps) || []).map((k) => {
            const idx = state.steps.indexOf(k);
            const cur = state.steps.indexOf(state.step_key);
            const doneStep = state.ok || idx < cur;
            const failed = state.done && !state.ok && idx === cur;
            return /* @__PURE__ */ jsxs(Badge, {
              variant: "subtle",
              colorScheme: failed ? "red" : doneStep ? "green" : idx === cur ? "primary" : "gray",
              fontSize: "2xs",
              px: 2,
              py: 0.5,
              children: [doneStep ? "\u2713 " : failed ? "\u2715 " : "", t(`nodeExtra.step.${k}`)]
            }, k);
          })
        }), /* @__PURE__ */ jsx(Box, {
          ref: box,
          bg: "gray.900",
          color: "gray.100",
          borderRadius: "10px",
          p: 3,
          h: "320px",
          overflowY: "auto",
          fontFamily: "mono",
          fontSize: "11px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          children: ((state == null ? void 0 : state.lines) || []).map((l, i) => /* @__PURE__ */ jsx(Text, {
            color: l.startsWith("==>") ? "cyan.300" : l.startsWith("!!") ? "red.300" : void 0,
            children: l
          }, i))
        })]
      }), /* @__PURE__ */ jsx(ModalFooter, {
        children: /* @__PURE__ */ jsx(Button, {
          size: "sm",
          isDisabled: !(state == null ? void 0 : state.done),
          onClick: close,
          children: t("external.done")
        })
      })]
    })]
  });
};
const InstallBox = ({
  nodeId,
  name,
  address,
  saved,
  nodeOk,
  agentOk
}) => {
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [ssh, setSsh] = react.exports.useState(() => ({
    ...emptySSH(),
    ...saved ? {
      host: saved.host,
      port: saved.port,
      username: saved.username,
      auth: saved.auth
    } : {}
  }));
  const [what, setWhat] = react.exports.useState({
    node: !nodeOk,
    agent: !agentOk,
    save: true
  });
  const [busy, setBusy] = react.exports.useState(false);
  const openJob = useInstall((s2) => s2.open);
  const canUseSaved = !!(saved == null ? void 0 : saved.saved) && !sshFilled(ssh);
  const go = () => {
    setBusy(true);
    startInstall(nodeId, {
      ssh: sshFilled(ssh) || !saved ? ssh : {
        ...ssh,
        password: "",
        private_key: ""
      },
      save: what.save,
      node: what.node,
      agent: what.agent
    }).then((job) => {
      openJob(job, name);
      queryClient.invalidateQueries("nodes-extras");
    }).catch((e) => {
      var _a, _b;
      return toast({
        status: "error",
        title: serverMessage(t, (_b = (_a = e == null ? void 0 : e.response) == null ? void 0 : _a._data) == null ? void 0 : _b.detail) || t("errors.generic"),
        position: "top"
      });
    }).finally(() => setBusy(false));
  };
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 3,
    w: "full",
    p: 3,
    borderRadius: "lg",
    borderWidth: "1px",
    borderColor: "light-border",
    _dark: {
      borderColor: "gray.600"
    },
    children: [/* @__PURE__ */ jsxs(HStack, {
      justifyContent: "space-between",
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        fontWeight: "medium",
        children: t("nodeExtra.vpsAccess")
      }), (saved == null ? void 0 : saved.saved) && /* @__PURE__ */ jsxs(HStack, {
        spacing: 1,
        children: [/* @__PURE__ */ jsx(Badge, {
          colorScheme: "green",
          variant: "subtle",
          children: t("nodeExtra.loginSaved")
        }), /* @__PURE__ */ jsx(Button, {
          size: "xs",
          variant: "ghost",
          colorScheme: "red",
          onClick: () => saveNodeExtra(nodeId, {
            forget_ssh: true
          }).then(() => queryClient.invalidateQueries("nodes-extras")),
          children: t("nodeExtra.forget")
        })]
      })]
    }), /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      children: t("nodeExtra.vpsAccessHelp")
    }), /* @__PURE__ */ jsx(SSHFields, {
      value: ssh,
      onChange: setSsh,
      addressHint: address,
      saved: saved == null ? void 0 : saved.saved
    }), /* @__PURE__ */ jsxs(VStack, {
      align: "stretch",
      spacing: 1,
      children: [/* @__PURE__ */ jsx(Checkbox, {
        size: "sm",
        isChecked: what.node,
        onChange: (e) => setWhat({
          ...what,
          node: e.target.checked
        }),
        children: /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          children: t("nodeExtra.installNode")
        })
      }), /* @__PURE__ */ jsx(Checkbox, {
        size: "sm",
        isChecked: what.agent,
        onChange: (e) => setWhat({
          ...what,
          agent: e.target.checked
        }),
        children: /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          children: t("nodeExtra.installAgent")
        })
      }), /* @__PURE__ */ jsx(Checkbox, {
        size: "sm",
        isChecked: what.save,
        onChange: (e) => setWhat({
          ...what,
          save: e.target.checked
        }),
        children: /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          children: t("nodeExtra.saveLogin")
        })
      })]
    }), /* @__PURE__ */ jsx(Button, {
      size: "sm",
      colorScheme: "primary",
      leftIcon: /* @__PURE__ */ jsx(CommandLineIcon, {
        width: 16,
        height: 16
      }),
      isLoading: busy,
      isDisabled: !sshFilled(ssh) && !canUseSaved || !what.node && !what.agent,
      onClick: go,
      children: t("nodeExtra.install")
    })]
  });
};
const pct = (a, b) => a && b ? Math.round(a / b * 100) : 0;
const tone = (p) => p >= 90 ? "red" : p >= 70 ? "orange" : "green";
const uptimeText = (s2, t) => {
  if (!s2)
    return "";
  const d = Math.floor(s2 / 86400);
  const h = Math.floor(s2 % 86400 / 3600);
  return d ? t("nodeExtra.uptimeDays", {
    d,
    h
  }) : t("nodeExtra.uptimeHours", {
    h,
    m: Math.floor(s2 % 3600 / 60)
  });
};
const VpsCompact = ({
  sys
}) => {
  const {
    t
  } = useTranslation();
  if (!sys || sys.cpu === void 0)
    return null;
  const mem = pct(sys.mem_used, sys.mem_total);
  return /* @__PURE__ */ jsx(Tooltip, {
    label: `${t("nodeExtra.cpu")} ${Math.round(sys.cpu)}% \xB7 ${t("nodeExtra.ram")} ${mem}% \xB7 \u2193 ${formatBytes(sys.rx_rate || 0, 0)}/s \u2191 ${formatBytes(sys.tx_rate || 0, 0)}/s`,
    children: /* @__PURE__ */ jsxs(HStack, {
      spacing: 1,
      fontSize: "2xs",
      color: "gray.500",
      children: [/* @__PURE__ */ jsxs(Badge, {
        variant: "subtle",
        colorScheme: tone(sys.cpu),
        fontSize: "2xs",
        children: [t("nodeExtra.cpu"), " ", Math.round(sys.cpu), "%"]
      }), /* @__PURE__ */ jsxs(Badge, {
        variant: "subtle",
        colorScheme: tone(mem),
        fontSize: "2xs",
        children: [t("nodeExtra.ram"), " ", mem, "%"]
      })]
    })
  });
};
const Bar = ({
  label,
  value,
  text
}) => /* @__PURE__ */ jsxs(Box, {
  children: [/* @__PURE__ */ jsxs(HStack, {
    justifyContent: "space-between",
    fontSize: "xs",
    mb: 0.5,
    children: [/* @__PURE__ */ jsx(Text, {
      color: "gray.500",
      children: label
    }), /* @__PURE__ */ jsx(Text, {
      children: text
    })]
  }), /* @__PURE__ */ jsx(Progress, {
    value,
    size: "xs",
    borderRadius: "full",
    colorScheme: tone(value)
  })]
});
const VpsStatus = ({
  sys
}) => {
  const {
    t
  } = useTranslation();
  if (!sys)
    return null;
  if (sys.cpu === void 0)
    return /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      children: sys.error === "agent too old" ? t("nodeExtra.agentOld") : t("nodeExtra.noAgentStatus")
    });
  const mem = pct(sys.mem_used, sys.mem_total);
  const disk = pct(sys.disk_used, sys.disk_total);
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 2,
    w: "full",
    p: 3,
    borderRadius: "lg",
    bg: "blackAlpha.50",
    _dark: {
      bg: "whiteAlpha.50"
    },
    children: [/* @__PURE__ */ jsxs(HStack, {
      justifyContent: "space-between",
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        fontWeight: "medium",
        children: t("nodeExtra.vps")
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        children: uptimeText(sys.uptime, t)
      })]
    }), /* @__PURE__ */ jsx(Bar, {
      label: `${t("nodeExtra.cpu")} \xB7 ${sys.cores} ${t("nodeExtra.cores")}`,
      value: sys.cpu,
      text: `${Math.round(sys.cpu)}%${sys.load ? ` \xB7 ${sys.load[0].toFixed(2)}` : ""}`
    }), /* @__PURE__ */ jsx(Bar, {
      label: t("nodeExtra.ram"),
      value: mem,
      text: `${formatBytes(sys.mem_used || 0, 1)} / ${formatBytes(sys.mem_total || 0, 1)}`
    }), /* @__PURE__ */ jsx(Bar, {
      label: t("nodeExtra.disk"),
      value: disk,
      text: `${formatBytes(sys.disk_used || 0, 0)} / ${formatBytes(sys.disk_total || 0, 0)}`
    }), /* @__PURE__ */ jsxs(HStack, {
      justifyContent: "space-between",
      fontSize: "xs",
      children: [/* @__PURE__ */ jsx(Text, {
        color: "gray.500",
        children: t("nodeExtra.network")
      }), /* @__PURE__ */ jsxs(Text, {
        children: ["\u2193 ", formatBytes(sys.rx_rate || 0, 1), "/s \xB7 \u2191 ", formatBytes(sys.tx_rate || 0, 1), "/s"]
      })]
    })]
  });
};
const CustomInput = chakra(Input$1, {
  baseStyle: {
    bg: "var(--app-surface)",
    _dark: {
      bg: "gray.700"
    }
  }
});
const ModalIcon = chakra(SquaresPlusIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const PlusIcon = chakra(PlusIcon$1, {
  baseStyle: {
    w: 5,
    h: 5,
    strokeWidth: 2
  }
});
const NEW_CORE = "__new__";
const CoreSelect = ({
  form
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
    createCore
  } = useCoreSettings();
  const [naming, setNaming] = react.exports.useState(false);
  const [name, setName] = react.exports.useState("");
  const [busy, setBusy] = react.exports.useState(false);
  const value = form.watch("core_id") || "main";
  const create2 = () => {
    if (!name.trim())
      return;
    setBusy(true);
    createCore(name.trim()).then((c) => {
      queryClient.invalidateQueries(FetchCoresQueryKey);
      form.setValue("core_id", c.id, {
        shouldDirty: true
      });
      setNaming(false);
      setName("");
    }).catch((e) => {
      var _a, _b;
      return toast({
        title: serverMessage(t, (_b = (_a = e == null ? void 0 : e.response) == null ? void 0 : _a._data) == null ? void 0 : _b.detail) || t("errors.generic"),
        status: "error",
        position: "top",
        duration: 4e3
      });
    }).finally(() => setBusy(false));
  };
  return /* @__PURE__ */ jsxs(FormControl, {
    children: [/* @__PURE__ */ jsx(FormLabel, {
      fontSize: "sm",
      mb: 1,
      children: t("cores.nodeCore")
    }), /* @__PURE__ */ jsxs(Select, {
      size: "sm",
      borderRadius: "md",
      value: naming ? NEW_CORE : value,
      onChange: (e) => {
        if (e.target.value === NEW_CORE)
          setNaming(true);
        else {
          setNaming(false);
          form.setValue("core_id", e.target.value, {
            shouldDirty: true
          });
        }
      },
      children: [(cores || [{
        id: "main",
        name: "Main",
        inbounds: []
      }]).map((c) => /* @__PURE__ */ jsxs("option", {
        value: c.id,
        children: [c.id === "main" ? t("cores.main") : c.name, c.inbounds.length ? ` \xB7 ${c.inbounds.length} inbound` : ""]
      }, c.id)), /* @__PURE__ */ jsxs("option", {
        value: NEW_CORE,
        children: ["+ ", t("cores.newForNode")]
      })]
    }), naming && /* @__PURE__ */ jsxs(HStack, {
      mt: 2,
      children: [/* @__PURE__ */ jsx(Input, {
        size: "sm",
        borderRadius: "md",
        autoFocus: true,
        placeholder: t("cores.namePlaceholder"),
        value: name,
        onChange: (e) => setName(e.target.value),
        onKeyDown: (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            create2();
          }
        }
      }), /* @__PURE__ */ jsx(Button, {
        size: "sm",
        colorScheme: "primary",
        flexShrink: 0,
        isLoading: busy,
        onClick: create2,
        children: t("cores.create")
      })]
    }), /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      mt: 1,
      children: t(naming ? "cores.newForNodeHelp" : "cores.nodeCoreHelp")
    })]
  });
};
const NodeAccordion = react.exports.memo(({
  toggleAccordion,
  node
}) => {
  const {
    updateNode,
    reconnectNode,
    setDeletingNode
  } = useNodes();
  const {
    t
  } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const form = useForm({
    defaultValues: node,
    resolver: s(NodeSchema)
  });
  const handleDeleteNode = setDeletingNode.bind(null, node);
  const {
    isLoading,
    mutate
  } = useMutation(updateNode, {
    onSuccess: () => {
      generateSuccessMessage("Node updated successfully", toast);
      queryClient.invalidateQueries(FetchNodesQueryKey);
    },
    onError: (e) => {
      generateErrorMessage(e, toast, form);
    }
  });
  const {
    isLoading: isReconnecting,
    mutate: reconnect
  } = useMutation(reconnectNode.bind(null, node), {
    onSuccess: () => {
      queryClient.invalidateQueries(FetchNodesQueryKey);
    }
  });
  const {
    data: extras
  } = useNodesExtras();
  const {
    data: system
  } = useNodesSystem();
  const extra = node.id ? extras == null ? void 0 : extras[String(node.id)] : void 0;
  const sys = node.id ? system == null ? void 0 : system[String(node.id)] : void 0;
  const setFlag = (flag) => node.id && saveNodeExtra(node.id, {
    flag
  }).then(() => queryClient.invalidateQueries("nodes-extras"));
  const nodeStatus = isReconnecting ? "connecting" : node.status ? node.status : "error";
  return /* @__PURE__ */ jsxs(AccordionItem, {
    border: "1px solid",
    _dark: {
      borderColor: "gray.600",
      bg: "gray.750"
    },
    _light: {
      borderColor: "light-border"
    },
    borderRadius: "lg",
    bg: "var(--app-surface)",
    p: 1,
    w: "full",
    children: [/* @__PURE__ */ jsxs(AccordionButton, {
      px: 2,
      borderRadius: "md",
      _hover: {
        bg: "var(--app-surface-2)",
        _dark: {
          bg: "gray.700"
        }
      },
      _expanded: {
        bg: "transparent"
      },
      onClick: toggleAccordion,
      children: [/* @__PURE__ */ jsxs(HStack, {
        w: "full",
        justifyContent: "space-between",
        pr: 2,
        children: [/* @__PURE__ */ jsxs(Text, {
          as: "span",
          fontWeight: "medium",
          fontSize: "sm",
          flex: "1",
          textAlign: "left",
          color: "gray.700",
          _dark: {
            color: "gray.300"
          },
          children: [(extra == null ? void 0 : extra.flag) ? `${flagEmoji(extra.flag)} ` : "", node.name]
        }), /* @__PURE__ */ jsxs(HStack, {
          children: [/* @__PURE__ */ jsx(VpsCompact, {
            sys
          }), node.xray_version && /* @__PURE__ */ jsx(Badge, {
            colorScheme: "primary",
            rounded: "full",
            display: "inline-flex",
            px: 3,
            py: 1,
            children: /* @__PURE__ */ jsxs(Text, {
              textTransform: "capitalize",
              fontSize: "0.7rem",
              fontWeight: "medium",
              letterSpacing: "tighter",
              children: ["Xray ", node.xray_version]
            })
          }), node.status && /* @__PURE__ */ jsx(NodeModalStatusBadge, {
            status: nodeStatus,
            compact: true
          })]
        })]
      }), /* @__PURE__ */ jsx(AccordionIcon, {})]
    }), /* @__PURE__ */ jsxs(AccordionPanel, {
      px: 2,
      pb: 2,
      children: [/* @__PURE__ */ jsx(VStack, {
        pb: 3,
        alignItems: "flex-start",
        children: nodeStatus === "error" && /* @__PURE__ */ jsx(Alert, {
          status: "error",
          size: "xs",
          children: /* @__PURE__ */ jsxs(Box, {
            children: [/* @__PURE__ */ jsxs(HStack, {
              w: "full",
              children: [/* @__PURE__ */ jsx(AlertIcon, {
                w: 4
              }), /* @__PURE__ */ jsx(Text, {
                marginInlineEnd: 0,
                children: node.message
              })]
            }), /* @__PURE__ */ jsx(HStack, {
              justifyContent: "flex-end",
              w: "full",
              children: /* @__PURE__ */ jsx(Button, {
                size: "sm",
                "aria-label": "reconnect node",
                leftIcon: /* @__PURE__ */ jsx(ReloadIcon, {}),
                onClick: () => reconnect(),
                disabled: isReconnecting,
                children: isReconnecting ? t("nodes.reconnecting") : t("nodes.reconnect")
              })
            })]
          })
        })
      }), /* @__PURE__ */ jsx(NodeForm, {
        form,
        mutate,
        isLoading,
        submitBtnText: t("nodes.editNode"),
        vpnSlot: node.id ? /* @__PURE__ */ jsxs(VStack, {
          w: "full",
          align: "stretch",
          spacing: 3,
          children: [/* @__PURE__ */ jsx(FlagSelect, {
            value: (extra == null ? void 0 : extra.flag) || "",
            onChange: setFlag
          }), /* @__PURE__ */ jsx(NodeVpnToggles, {
            nodeKey: String(node.id)
          }), /* @__PURE__ */ jsx(VpsStatus, {
            sys
          }), /* @__PURE__ */ jsx(InstallBox, {
            nodeId: node.id,
            name: node.name,
            address: node.address,
            saved: extra == null ? void 0 : extra.ssh,
            nodeOk: node.status === "connected",
            agentOk: !!sys && sys.cpu !== void 0
          })]
        }) : null,
        btnLeftAdornment: /* @__PURE__ */ jsx(Tooltip, {
          label: t("delete"),
          placement: "top",
          children: /* @__PURE__ */ jsx(IconButton, {
            colorScheme: "red",
            variant: "ghost",
            size: "sm",
            "aria-label": "delete node",
            onClick: handleDeleteNode,
            children: /* @__PURE__ */ jsx(DeleteIcon, {})
          })
        })
      })]
    })]
  });
}, (a, b) => a.node === b.node);
const AddNodeForm = ({
  toggleAccordion,
  resetAccordions
}) => {
  const toast = useToast();
  const {
    t
  } = useTranslation();
  const queryClient = useQueryClient();
  const {
    addNode
  } = useNodes();
  const form = useForm({
    resolver: s(NodeSchema),
    defaultValues: {
      ...getNodeDefaultValues(),
      add_as_new_host: false
    }
  });
  const [vpnChoice, setVpnChoice] = react.exports.useState({
    awg: false,
    ovpn: false
  });
  const [flag, setFlag] = react.exports.useState("");
  const [ssh, setSsh] = react.exports.useState(emptySSH());
  const [install, setInstall] = react.exports.useState({
    on: true,
    node: true,
    agent: true,
    save: true
  });
  const openJob = useInstall((s2) => s2.open);
  const randomPorts = () => {
    const a = 2e4 + Math.floor(Math.random() * 4e4);
    form.setValue("port", a, {
      shouldDirty: true
    });
    form.setValue("api_port", a + 1 + Math.floor(Math.random() * 500), {
      shouldDirty: true
    });
  };
  react.exports.useEffect(() => {
    if (install.on && Number(form.getValues("port")) === 62050 && Number(form.getValues("api_port")) === 62051)
      randomPorts();
  }, [install.on]);
  const {
    isLoading,
    mutate
  } = useMutation(addNode, {
    onSuccess: (created) => {
      if (created == null ? void 0 : created.id) {
        const name = form.getValues("name");
        const withLogin = install.on && sshFilled(ssh);
        saveNodeExtra(created.id, {
          flag,
          ...withLogin && install.save ? {
            ssh
          } : {}
        }).catch(() => {
        }).finally(() => {
          queryClient.invalidateQueries("nodes-extras");
          if (withLogin)
            startInstall(created.id, {
              ssh,
              save: install.save,
              node: install.node,
              agent: install.agent
            }).then((job) => openJob(job, name)).catch((e) => {
              var _a, _b;
              return toast({
                status: "error",
                title: serverMessage(t, (_b = (_a = e == null ? void 0 : e.response) == null ? void 0 : _a._data) == null ? void 0 : _b.detail) || t("errors.generic"),
                position: "top"
              });
            });
        });
        setFlag("");
        setSsh(emptySSH());
        setInstall({
          on: true,
          node: true,
          agent: true,
          save: true
        });
      }
      if ((created == null ? void 0 : created.id) && (vpnChoice.awg || vpnChoice.ovpn)) {
        applyNodeVpn(String(created.id), vpnChoice).catch(() => {
        });
        setVpnChoice({
          awg: false,
          ovpn: false
        });
      }
      generateSuccessMessage(t("nodes.addNodeSuccess", {
        name: form.getValues("name")
      }), toast);
      queryClient.invalidateQueries(FetchNodesQueryKey);
      form.reset();
      resetAccordions();
    },
    onError: (e) => {
      generateErrorMessage(e, toast, form);
    }
  });
  return /* @__PURE__ */ jsxs(AccordionItem, {
    border: "1px solid",
    _dark: {
      borderColor: "gray.600",
      bg: "gray.750"
    },
    _light: {
      borderColor: "light-border"
    },
    borderRadius: "lg",
    bg: "var(--app-surface)",
    p: 1,
    w: "full",
    children: [/* @__PURE__ */ jsx(AccordionButton, {
      px: 2,
      borderRadius: "md",
      _hover: {
        bg: "var(--app-surface-2)",
        _dark: {
          bg: "gray.700"
        }
      },
      _expanded: {
        bg: "transparent"
      },
      onClick: toggleAccordion,
      children: /* @__PURE__ */ jsxs(Text, {
        as: "span",
        fontWeight: "medium",
        fontSize: "sm",
        flex: "1",
        textAlign: "left",
        color: "gray.700",
        _dark: {
          color: "gray.300"
        },
        display: "flex",
        gap: 1,
        children: [/* @__PURE__ */ jsx(PlusIcon, {
          display: "inline-block"
        }), " ", /* @__PURE__ */ jsx("span", {
          children: t("nodes.addNewMarzbanNode")
        })]
      })
    }), /* @__PURE__ */ jsx(AccordionPanel, {
      px: 2,
      py: 4,
      children: /* @__PURE__ */ jsx(NodeForm, {
        form,
        mutate,
        isLoading,
        submitBtnText: t("nodes.addNode"),
        btnProps: {
          variant: "solid"
        },
        addAsHost: true,
        portTools: install.on ? /* @__PURE__ */ jsxs(HStack, {
          w: "full",
          spacing: 2,
          children: [/* @__PURE__ */ jsx(Button, {
            size: "xs",
            variant: "outline",
            onClick: randomPorts,
            children: t("nodeExtra.randomPorts")
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "2xs",
            color: "gray.500",
            children: t("nodeExtra.randomPortsHelp")
          })]
        }) : null,
        vpnSlot: /* @__PURE__ */ jsxs(VStack, {
          w: "full",
          align: "stretch",
          spacing: 3,
          children: [/* @__PURE__ */ jsx(FlagSelect, {
            value: flag,
            onChange: setFlag
          }), /* @__PURE__ */ jsx(NodeVpnToggles, {
            value: vpnChoice,
            onChange: setVpnChoice
          }), /* @__PURE__ */ jsxs(Box, {
            p: 3,
            borderRadius: "lg",
            borderWidth: "1px",
            borderColor: "light-border",
            _dark: {
              borderColor: "gray.600"
            },
            children: [/* @__PURE__ */ jsxs(HStack, {
              justifyContent: "space-between",
              children: [/* @__PURE__ */ jsxs(Box, {
                children: [/* @__PURE__ */ jsx(Text, {
                  fontSize: "sm",
                  fontWeight: "medium",
                  children: t("nodeExtra.installOnAdd")
                }), /* @__PURE__ */ jsx(Text, {
                  fontSize: "xs",
                  color: "gray.500",
                  children: t("nodeExtra.installOnAddHelp")
                })]
              }), /* @__PURE__ */ jsx(Switch, {
                colorScheme: "primary",
                isChecked: install.on,
                onChange: (e) => setInstall({
                  ...install,
                  on: e.target.checked
                })
              })]
            }), /* @__PURE__ */ jsx(Collapse, {
              in: install.on,
              animateOpacity: true,
              children: /* @__PURE__ */ jsxs(VStack, {
                align: "stretch",
                spacing: 2,
                pt: 3,
                children: [/* @__PURE__ */ jsx(SSHFields, {
                  value: ssh,
                  onChange: setSsh,
                  addressHint: form.watch("address")
                }), /* @__PURE__ */ jsx(Checkbox, {
                  size: "sm",
                  isChecked: install.node,
                  onChange: (e) => setInstall({
                    ...install,
                    node: e.target.checked
                  }),
                  children: /* @__PURE__ */ jsx(Text, {
                    fontSize: "sm",
                    children: t("nodeExtra.installNode")
                  })
                }), /* @__PURE__ */ jsx(Checkbox, {
                  size: "sm",
                  isChecked: install.agent,
                  onChange: (e) => setInstall({
                    ...install,
                    agent: e.target.checked
                  }),
                  children: /* @__PURE__ */ jsx(Text, {
                    fontSize: "sm",
                    children: t("nodeExtra.installAgent")
                  })
                }), /* @__PURE__ */ jsx(Checkbox, {
                  size: "sm",
                  isChecked: install.save,
                  onChange: (e) => setInstall({
                    ...install,
                    save: e.target.checked
                  }),
                  children: /* @__PURE__ */ jsx(Text, {
                    fontSize: "sm",
                    children: t("nodeExtra.saveLogin")
                  })
                })]
              })
            })]
          })]
        })
      })
    })]
  });
};
const NodeForm = ({
  form,
  mutate,
  isLoading,
  submitBtnText,
  btnProps = {},
  btnLeftAdornment,
  addAsHost = false,
  vpnSlot,
  portTools
}) => {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o;
  const {
    t
  } = useTranslation();
  const [showCertificate, setShowCertificate] = react.exports.useState(false);
  const {
    data: nodeSettings,
    isLoading: nodeSettingsLoading
  } = useQuery({
    queryKey: "node-settings",
    queryFn: () => fetch("/node/settings")
  });
  function selectText(node) {
    if (document.body.createTextRange) {
      const range = document.body.createTextRange();
      range.moveToElementText(node);
      range.select();
    } else if (window.getSelection) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(node);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      console.warn("Could not select text in node: Unsupported browser.");
    }
  }
  return /* @__PURE__ */ jsx("form", {
    onSubmit: form.handleSubmit((v) => mutate(v)),
    children: /* @__PURE__ */ jsxs(VStack, {
      children: [nodeSettings && nodeSettings.certificate && /* @__PURE__ */ jsx(Box, {
        w: "full",
        p: 3,
        borderRadius: "lg",
        border: "1px solid",
        borderColor: "light-border",
        bg: "var(--app-surface-2)",
        _dark: {
          borderColor: "gray.600",
          bg: "gray.700"
        },
        children: /* @__PURE__ */ jsxs(Box, {
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontSize: "sm",
          children: [/* @__PURE__ */ jsx("span", {
            children: t("nodes.connection-hint")
          }), /* @__PURE__ */ jsxs(HStack, {
            justify: "end",
            py: 2,
            children: [/* @__PURE__ */ jsx(Button, {
              as: "a",
              colorScheme: "primary",
              size: "xs",
              download: "ssl_client_cert.pem",
              href: URL.createObjectURL(new Blob([nodeSettings.certificate], {
                type: "text/plain"
              })),
              children: t("nodes.download-certificate")
            }), /* @__PURE__ */ jsx(Tooltip, {
              placement: "top",
              label: t(!showCertificate ? "nodes.show-certificate" : "nodes.show-certificate"),
              children: /* @__PURE__ */ jsx(IconButton, {
                "aria-label": t(!showCertificate ? "nodes.show-certificate" : "nodes.show-certificate"),
                onClick: setShowCertificate.bind(null, !showCertificate),
                variant: "ghost",
                size: "xs",
                children: !showCertificate ? /* @__PURE__ */ jsx(EyeIcon, {
                  width: "15px"
                }) : /* @__PURE__ */ jsx(EyeSlashIcon, {
                  width: "15px"
                })
              })
            })]
          }), /* @__PURE__ */ jsx(Collapse, {
            in: showCertificate,
            animateOpacity: true,
            children: /* @__PURE__ */ jsx(Text, {
              bg: "var(--app-surface)",
              _dark: {
                bg: "blackAlpha.300"
              },
              rounded: "md",
              p: "2",
              lineHeight: "1.2",
              fontSize: "10px",
              fontFamily: "Courier",
              whiteSpace: "pre",
              overflow: "auto",
              onClick: (e) => {
                selectText(e.target);
              },
              children: nodeSettings.certificate
            })
          })]
        })
      }), /* @__PURE__ */ jsxs(HStack, {
        w: "full",
        children: [/* @__PURE__ */ jsx(FormControl, {
          children: /* @__PURE__ */ jsx(CustomInput, {
            label: t("nodes.nodeName"),
            size: "sm",
            placeholder: "Node-2",
            ...form.register("name"),
            error: (_c = (_b = (_a = form.formState) == null ? void 0 : _a.errors) == null ? void 0 : _b.name) == null ? void 0 : _c.message
          })
        }), /* @__PURE__ */ jsx(HStack, {
          px: 1,
          children: /* @__PURE__ */ jsx(Controller, {
            name: "status",
            control: form.control,
            render: ({
              field
            }) => {
              return /* @__PURE__ */ jsx(Tooltip, {
                placement: "top",
                label: `${t("usersTable.status")}: ` + (field.value !== "disabled" ? t("active") : t("disabled")),
                textTransform: "capitalize",
                children: /* @__PURE__ */ jsx(Box, {
                  mt: "6",
                  children: /* @__PURE__ */ jsx(Switch, {
                    colorScheme: "primary",
                    isChecked: field.value !== "disabled",
                    onChange: (e) => {
                      if (e.target.checked) {
                        field.onChange("connecting");
                      } else {
                        field.onChange("disabled");
                      }
                    }
                  })
                })
              }, field.value);
            }
          })
        })]
      }), /* @__PURE__ */ jsx(HStack, {
        alignItems: "flex-start",
        w: "100%",
        children: /* @__PURE__ */ jsx(Box, {
          w: "100%",
          children: /* @__PURE__ */ jsx(CustomInput, {
            label: t("nodes.nodeAddress"),
            size: "sm",
            placeholder: "51.20.12.13",
            ...form.register("address"),
            error: (_f = (_e = (_d = form.formState) == null ? void 0 : _d.errors) == null ? void 0 : _e.address) == null ? void 0 : _f.message
          })
        })
      }), /* @__PURE__ */ jsxs(HStack, {
        alignItems: "flex-start",
        w: "100%",
        children: [/* @__PURE__ */ jsx(Box, {
          children: /* @__PURE__ */ jsx(CustomInput, {
            label: t("nodes.nodePort"),
            size: "sm",
            placeholder: "62050",
            ...form.register("port"),
            error: (_i = (_h = (_g = form.formState) == null ? void 0 : _g.errors) == null ? void 0 : _h.port) == null ? void 0 : _i.message
          })
        }), /* @__PURE__ */ jsx(Box, {
          children: /* @__PURE__ */ jsx(CustomInput, {
            label: t("nodes.nodeAPIPort"),
            size: "sm",
            placeholder: "62051",
            ...form.register("api_port"),
            error: (_l = (_k = (_j = form.formState) == null ? void 0 : _j.errors) == null ? void 0 : _k.api_port) == null ? void 0 : _l.message
          })
        }), /* @__PURE__ */ jsx(Box, {
          children: /* @__PURE__ */ jsx(CustomInput, {
            label: t("nodes.usageCoefficient"),
            size: "sm",
            placeholder: "1",
            ...form.register("usage_coefficient"),
            error: (_o = (_n = (_m = form.formState) == null ? void 0 : _m.errors) == null ? void 0 : _n.usage_coefficient) == null ? void 0 : _o.message
          })
        })]
      }), portTools, /* @__PURE__ */ jsx(CoreSelect, {
        form
      }), vpnSlot, addAsHost && /* @__PURE__ */ jsx(FormControl, {
        py: 1,
        children: /* @__PURE__ */ jsx(Checkbox, {
          ...form.register("add_as_new_host"),
          children: /* @__PURE__ */ jsx(FormLabel, {
            m: 0,
            children: t("nodes.addHostForEveryInbound")
          })
        })
      }), /* @__PURE__ */ jsxs(HStack, {
        w: "full",
        children: [btnLeftAdornment, /* @__PURE__ */ jsx(Button, {
          flexGrow: 1,
          type: "submit",
          colorScheme: "primary",
          size: "sm",
          px: 5,
          w: "full",
          isLoading,
          ...btnProps,
          children: submitBtnText
        })]
      })]
    })
  });
};
const NodesDialog = () => {
  const {
    isEditingNodes,
    onEditingNodes
  } = useDashboardPick("isEditingNodes", "onEditingNodes");
  const {
    t
  } = useTranslation();
  const [openAccordions, setOpenAccordions] = react.exports.useState({});
  const {
    data: nodes,
    isLoading
  } = useNodesQuery();
  const onClose = () => {
    setOpenAccordions({});
    onEditingNodes(false);
  };
  const toggleAccordion = (index) => {
    if (openAccordions[String(index)]) {
      delete openAccordions[String(index)];
    } else
      openAccordions[String(index)] = {};
    setOpenAccordions({
      ...openAccordions
    });
  };
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [/* @__PURE__ */ jsxs(Modal$1, {
      isOpen: isEditingNodes,
      onClose,
      children: [/* @__PURE__ */ jsx(ModalOverlay$1, {
        bg: "blackAlpha.300",
        backdropFilter: "blur(10px)"
      }), /* @__PURE__ */ jsxs(ModalContent$1, {
        mx: "3",
        w: "fit-content",
        maxW: "3xl",
        children: [/* @__PURE__ */ jsx(ModalHeader$1, {
          pt: 6,
          children: /* @__PURE__ */ jsx(Icon, {
            color: "primary",
            children: /* @__PURE__ */ jsx(ModalIcon, {})
          })
        }), /* @__PURE__ */ jsx(ModalCloseButton$1, {
          mt: 3
        }), /* @__PURE__ */ jsxs(ModalBody$1, {
          w: "440px",
          pb: 6,
          pt: 3,
          children: [/* @__PURE__ */ jsx(Text, {
            mb: 3,
            opacity: 0.8,
            fontSize: "sm",
            children: t("nodes.title")
          }), isLoading && "loading...", /* @__PURE__ */ jsx(Accordion, {
            w: "full",
            allowToggle: true,
            index: Object.keys(openAccordions).map((i) => parseInt(i)),
            children: /* @__PURE__ */ jsxs(VStack, {
              w: "full",
              children: [!isLoading && nodes && nodes.map((node, index) => {
                return /* @__PURE__ */ jsx(NodeAccordion, {
                  toggleAccordion: () => toggleAccordion(index),
                  node
                }, node.name);
              }), /* @__PURE__ */ jsx(AddNodeForm, {
                toggleAccordion: () => toggleAccordion((nodes || []).length),
                resetAccordions: () => setOpenAccordions({})
              })]
            })
          })]
        })]
      })]
    }), /* @__PURE__ */ jsx(DeleteNodeModal, {
      deleteCallback: () => setOpenAccordions({})
    }), /* @__PURE__ */ jsx(InstallProgress, {})]
  });
};
export {
  NodesDialog
};
