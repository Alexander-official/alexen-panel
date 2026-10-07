import { u as useTranslation, W as useToast, cn as useQueryClient, c as react, cy as useClipboard, h as jsxs, ah as VStack, N as Box, H as HStack, k as jsx, ai as Icon, aC as GlobeAltIcon, T as Text, ax as Fragment, cl as Code, a7 as Input, a5 as InputGroup, b5 as InputLeftAddon, o as Button, aj as Tooltip, a9 as IconButton, bR as CheckIcon, bP as ClipboardIcon, cC as InformationCircleIcon, b3 as FormControl, b4 as FormLabel } from "./vendor.0404bf65.js";
import { f as fetch } from "./index.e0e646b5.js";
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
    mt: 1.5,
    children: help
  })]
});
const DomainSettingsPage = ({
  embedded
}) => {
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [state, setState] = react.exports.useState(null);
  const [form, setForm] = react.exports.useState({
    url_prefix: "",
    path: "",
    suffix: ""
  });
  const [example, setExample] = react.exports.useState("");
  const [error, setError] = react.exports.useState("");
  const [saving, setSaving] = react.exports.useState(false);
  const {
    onCopy,
    hasCopied,
    setValue
  } = useClipboard("");
  const timer = react.exports.useRef();
  react.exports.useEffect(() => {
    fetch("/sub-domain").then((d) => {
      setState(d);
      setForm(d.settings);
      setExample(d.example);
    });
  }, []);
  react.exports.useEffect(() => {
    if (!state)
      return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      fetch("/sub-domain/example", {
        method: "POST",
        body: form
      }).then((d) => {
        setExample(d.example);
        setError("");
      }).catch((e) => setError(detail(e)));
    }, 300);
  }, [form]);
  react.exports.useEffect(() => setValue(example), [example]);
  const detail = (e) => {
    var _a, _b;
    const d = (_b = (_a = e == null ? void 0 : e.response) == null ? void 0 : _a._data) == null ? void 0 : _b.detail;
    if (Array.isArray(d))
      return d.map((x) => String(x.msg || "").replace(/^Value error, /, "")).join(" \xB7 ");
    if (d && typeof d === "object")
      return Object.values(d).map((x) => String(x).replace(/^Value error, /, "")).join(" \xB7 ");
    return typeof d === "string" ? d : (e == null ? void 0 : e.message) || "Error";
  };
  const set = (p) => setForm((f) => ({
    ...f,
    ...p
  }));
  const dirty = state && JSON.stringify(form) !== JSON.stringify(state.settings);
  const save = () => {
    setSaving(true);
    fetch("/sub-domain", {
      method: "PUT",
      body: form
    }).then((d) => {
      setState(d);
      setForm(d.settings);
      qc.invalidateQueries();
      toast({
        title: t("domain.saved"),
        status: "success",
        position: "top",
        duration: 2500
      });
    }).catch((e) => toast({
      title: detail(e),
      status: "error",
      position: "top",
      duration: 4e3
    })).finally(() => setSaving(false));
  };
  if (!state)
    return null;
  const suffixPresets = [["", t("domain.suffixNone")], ["{username}", "{username}"]];
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 5,
    maxW: embedded ? void 0 : "900px",
    children: [/* @__PURE__ */ jsxs(Box, {
      ...embedded ? {
        borderRadius: "14px",
        bg: "blackAlpha.50",
        _dark: {
          bg: "whiteAlpha.50"
        }
      } : card,
      p: {
        base: 4,
        md: 6
      },
      children: [/* @__PURE__ */ jsxs(HStack, {
        spacing: 3,
        mb: 1,
        children: [/* @__PURE__ */ jsx(Icon, {
          as: GlobeAltIcon,
          boxSize: "20px",
          color: "primary.500"
        }), /* @__PURE__ */ jsx(Text, {
          fontWeight: "semibold",
          children: t("domain.linkTitle")
        })]
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        color: "gray.500",
        mb: 5,
        children: t("domain.help")
      }), /* @__PURE__ */ jsxs(VStack, {
        align: "stretch",
        spacing: 5,
        children: [/* @__PURE__ */ jsx(Field, {
          label: t("domain.address"),
          help: /* @__PURE__ */ jsxs(Fragment, {
            children: [t("domain.addressHelp"), " ", t("domain.envNow"), ": ", /* @__PURE__ */ jsx(Code, {
              fontSize: "xs",
              children: state.env_url_prefix || "\u2014"
            })]
          }),
          children: /* @__PURE__ */ jsx(Input, {
            fontFamily: "mono",
            placeholder: state.env_url_prefix || "https://sub.example.com",
            value: form.url_prefix,
            onChange: (e) => set({
              url_prefix: e.target.value.trim()
            })
          })
        }), /* @__PURE__ */ jsx(Field, {
          label: t("domain.path"),
          help: t("domain.pathHelp", {
            path: state.env_path
          }),
          children: /* @__PURE__ */ jsxs(InputGroup, {
            maxW: "320px",
            children: [/* @__PURE__ */ jsx(InputLeftAddon, {
              fontFamily: "mono",
              children: "/"
            }), /* @__PURE__ */ jsx(Input, {
              fontFamily: "mono",
              placeholder: state.env_path,
              value: form.path,
              onChange: (e) => set({
                path: e.target.value.trim()
              })
            })]
          })
        }), /* @__PURE__ */ jsxs(Field, {
          label: t("domain.suffix"),
          help: t("domain.suffixHelp"),
          children: [/* @__PURE__ */ jsx(HStack, {
            spacing: 2,
            mb: 2,
            flexWrap: "wrap",
            rowGap: 2,
            children: suffixPresets.map(([v, label]) => /* @__PURE__ */ jsx(Button, {
              size: "xs",
              borderRadius: "full",
              colorScheme: "primary",
              variant: form.suffix === v ? "solid" : "outline",
              onClick: () => set({
                suffix: v
              }),
              fontFamily: v ? "mono" : void 0,
              children: label
            }, v || "none"))
          }), /* @__PURE__ */ jsx(Input, {
            fontFamily: "mono",
            maxW: "420px",
            placeholder: t("domain.suffixPlaceholder"),
            value: form.suffix,
            onChange: (e) => set({
              suffix: e.target.value
            })
          })]
        }), /* @__PURE__ */ jsxs(Box, {
          borderRadius: "14px",
          p: 4,
          bg: "blackAlpha.50",
          _dark: {
            bg: "whiteAlpha.50"
          },
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            mb: 1.5,
            children: t("domain.example")
          }), /* @__PURE__ */ jsxs(HStack, {
            spacing: 2,
            align: "center",
            children: [/* @__PURE__ */ jsx(Text, {
              fontFamily: "mono",
              fontSize: "sm",
              flex: "1",
              wordBreak: "break-all",
              color: error ? "red.400" : void 0,
              children: error || example
            }), !error && /* @__PURE__ */ jsx(Tooltip, {
              label: hasCopied ? t("domain.copied") : t("domain.copy"),
              hasArrow: true,
              children: /* @__PURE__ */ jsx(IconButton, {
                size: "sm",
                variant: "ghost",
                "aria-label": "copy",
                icon: hasCopied ? /* @__PURE__ */ jsx(CheckIcon, {
                  width: 16
                }) : /* @__PURE__ */ jsx(ClipboardIcon, {
                  width: 16
                }),
                onClick: onCopy
              })
            })]
          })]
        }), /* @__PURE__ */ jsxs(HStack, {
          justify: "flex-end",
          children: [dirty && /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "orange.400",
            children: t("autoChange.unsaved")
          }), /* @__PURE__ */ jsx(Button, {
            colorScheme: "primary",
            isLoading: saving,
            isDisabled: !dirty || !!error,
            onClick: save,
            children: t("domain.save")
          })]
        })]
      })]
    }), !embedded && /* @__PURE__ */ jsxs(HStack, {
      ...card,
      p: {
        base: 4,
        md: 5
      },
      spacing: 3,
      align: "flex-start",
      children: [/* @__PURE__ */ jsx(Icon, {
        as: InformationCircleIcon,
        boxSize: "20px",
        color: "primary.500",
        flexShrink: 0,
        mt: 0.5
      }), /* @__PURE__ */ jsxs(VStack, {
        align: "stretch",
        spacing: 2,
        fontSize: "sm",
        children: [/* @__PURE__ */ jsx(Text, {
          fontWeight: "semibold",
          children: t("domain.dnsTitle")
        }), /* @__PURE__ */ jsx(Text, {
          color: "gray.500",
          children: t("domain.dns1")
        }), /* @__PURE__ */ jsx(Text, {
          color: "gray.500",
          children: t("domain.dns2")
        }), /* @__PURE__ */ jsx(Text, {
          color: "gray.500",
          children: t("domain.dns3")
        })]
      })]
    })]
  });
};
export {
  DomainSettingsPage
};
