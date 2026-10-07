import { u as useTranslation, c as react, d as dayjs, h as jsxs, ah as VStack, k as jsx, T as Text, H as HStack, bO as ButtonGroup, o as Button, aa as Select, a7 as Input, Z as Spinner, N as Box, bU as DevicePhoneMobileIcon, cd as DeviceTabletIcon, ag as ComputerDesktopIcon, ai as Icon, D as Badge, az as Collapse, aU as ArrowLeftOnRectangleIcon, a$ as NoSymbolIcon, V as TrashIcon, a1 as ArrowPathIcon, ce as PlusCircleIcon, cf as PencilSquareIcon, cg as WrenchScrewdriverIcon } from "./vendor.0404bf65.js";
import { a as useGetUser, f as fetch } from "./index.e0e646b5.js";
const RULES = [["POST", /^\/api\/user$/, "userCreate", []], ["PUT", /^\/api\/user\/([^/]+)$/, "userEdit", ["name"]], ["DELETE", /^\/api\/user\/([^/]+)$/, "userDelete", ["name"]], ["POST", /^\/api\/user\/([^/]+)\/reset$/, "userReset", ["name"]], ["POST", /^\/api\/user\/([^/]+)\/revoke_sub$/, "userRevoke", ["name"]], ["POST", /^\/api\/user\/([^/]+)\/active-next$/, "userNext", ["name"]], ["DELETE", /^\/api\/user\/([^/]+)\/devices/, "userDevices", ["name"]], ["POST", /^\/api\/users\/reset$/, "usersReset", []], ["DELETE", /^\/api\/users\/expired/, "usersExpired", []], ["PUT", /^\/api\/admin\/([^/]+)\/sub-profile$/, "adminSubProfile", ["name"]], ["POST", /^\/api\/admin$/, "adminCreate", []], ["PUT", /^\/api\/admin\/([^/]+)$/, "adminEdit", ["name"]], ["DELETE", /^\/api\/admin\/([^/]+)$/, "adminDelete", ["name"]], ["POST", /^\/api\/node$/, "nodeCreate", []], ["PUT", /^\/api\/node\/(\d+)$/, "nodeEdit", ["id"]], ["DELETE", /^\/api\/node\/(\d+)$/, "nodeDelete", ["id"]], ["POST", /^\/api\/node\/(\d+)\/reconnect$/, "nodeReconnect", ["id"]], ["POST", /^\/api\/node\/(\d+)\/install$/, "nodeInstall", ["id"]], ["PUT", /^\/api\/node\/(\d+)\/extra$/, "nodeExtra", ["id"]], ["PUT", /^\/api\/hosts$/, "hosts", []], ["PUT", /^\/api\/core\/config/, "coreConfig", []], ["POST", /^\/api\/core\/restart$/, "coreRestart", []], ["PUT", /^\/api\/preroute\/tunnels\/new$/, "prerouteCreate", []], ["PUT", /^\/api\/preroute\/tunnels\/(\d+)$/, "prerouteEdit", ["id"]], ["DELETE", /^\/api\/preroute\/tunnels\/(\d+)$/, "prerouteDelete", ["id"]], ["PUT", /^\/api\/sub-settings$/, "subSettings", []], ["PUT", /^\/api\/sub-webpage$/, "subWebpage", []], ["PUT", /^\/api\/json-sub-settings$/, "jsonSub", []], ["PUT", /^\/api\/external-configs(\/mine)?$/, "external", []], ["PUT", /^\/api\/sub-domain$/, "domain", []], ["DELETE", /^\/api\/user\/([^/]+)\/online-ips\/([^/]+)$/, "ipCut", ["name", "ip"]], ["POST", /^\/api\/user\/([^/]+)\/online-ips\/([^/]+)\/unblock$/, "ipUnblock", ["name", "ip"]], ["PUT", /^\/api\/user\/([^/]+)\/set-owner$/, "userOwner", ["name"]], ["POST", /^\/api\/admin\/([^/]+)\/users\/disable$/, "adminUsersOff", ["name"]], ["POST", /^\/api\/admin\/([^/]+)\/users\/activate$/, "adminUsersOn", ["name"]], ["", /^\/api\/cores/, "cores", []], ["", /^\/api\/devices$/, "devices", []], ["", /^\/api\/groups/, "groups", []], ["", /^\/api\/vpn/, "vpn", []], ["", /^\/api\/auto-change|^\/api\/traffic\/auto/, "autoChange", []], ["", /^\/api\/user_template/, "template", []]];
const describe = (t, it, detail) => {
  if (it.action === "login")
    return t("activity.do.login");
  if (it.action === "login_failed")
    return t("activity.do.loginFailed");
  for (const [m, re, key, names] of RULES) {
    if (m && m !== it.method)
      continue;
    const hit = it.path.match(re);
    if (hit) {
      const p = {};
      names.forEach((n, i) => p[n] = decodeURIComponent(hit[i + 1] || ""));
      if (!p.name && (detail == null ? void 0 : detail.username))
        p.name = detail.username;
      if (!p.name && (detail == null ? void 0 : detail.name))
        p.name = detail.name;
      return t(`activity.do.${key}`, {
        ...p,
        name: p.name || "",
        id: p.id || "",
        ip: p.ip || ""
      });
    }
  }
  return `${it.method} ${it.path}`;
};
const iconOf = (it) => it.action === "login" ? ArrowLeftOnRectangleIcon : it.action === "login_failed" ? NoSymbolIcon : it.method === "DELETE" ? TrashIcon : it.method === "POST" && /reset|restart|reconnect|install/.test(it.path) ? ArrowPathIcon : it.method === "POST" ? PlusCircleIcon : it.method === "PUT" ? PencilSquareIcon : WrenchScrewdriverIcon;
const deviceOf = (ua) => {
  var _a, _b, _c;
  if (!ua)
    return {
      kind: "desktop",
      text: "\u2014"
    };
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? ((_a = ua.match(/Android [\d.]+/)) == null ? void 0 : _a[0]) || "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const model = /Android/.test(ua) ? (_c = (_b = ua.match(/Android [\d.]+; ([^;)]+)/)) == null ? void 0 : _b[1]) == null ? void 0 : _c.replace(/ Build.*/, "") : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /YaBrowser/.test(ua) ? "Yandex" : /SamsungBrowser/.test(ua) ? "Samsung" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /python|curl|wget|okhttp|Go-http/i.test(ua) ? ua.split(" ")[0] : "";
  const kind = /iPad|Tablet/.test(ua) ? "tablet" : /Mobile|iPhone|Android/.test(ua) ? "phone" : "desktop";
  const text = [browser, [os, model].filter(Boolean).join(" \xB7 ")].filter(Boolean).join(" \u2014 ") || ua.slice(0, 40);
  return {
    kind,
    text
  };
};
const ActivityPage = () => {
  const {
    t
  } = useTranslation();
  const {
    userData
  } = useGetUser();
  const [kind, setKind] = react.exports.useState("all");
  const [admin, setAdmin] = react.exports.useState("");
  const [q, setQ] = react.exports.useState("");
  const [items, setItems] = react.exports.useState([]);
  const [admins, setAdmins] = react.exports.useState([]);
  const [more, setMore] = react.exports.useState(false);
  const [loading, setLoading] = react.exports.useState(false);
  const [open, setOpen] = react.exports.useState(null);
  const load = (before) => {
    setLoading(true);
    const qs = new URLSearchParams({
      kind,
      limit: "100"
    });
    if (admin)
      qs.set("admin", admin);
    if (q.trim())
      qs.set("q", q.trim());
    if (before)
      qs.set("before", String(before));
    fetch(`/activity?${qs}`).then((p) => {
      setItems((old) => before ? [...old, ...p.items] : p.items);
      setAdmins(p.admins);
      setMore(p.more);
    }).finally(() => setLoading(false));
  };
  react.exports.useEffect(() => {
    const h = setTimeout(() => load(), q ? 350 : 0);
    return () => clearTimeout(h);
  }, [kind, admin, q]);
  const days = react.exports.useMemo(() => {
    const out = [];
    items.forEach((it) => {
      const day = dayjs.unix(it.time).format("YYYY-MM-DD");
      if (!out.length || out[out.length - 1].day !== day)
        out.push({
          day,
          items: []
        });
      out[out.length - 1].items.push(it);
    });
    return out;
  }, [items]);
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: 4,
    maxW: "1100px",
    children: [/* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      color: "gray.500",
      children: t("activity.help")
    }), /* @__PURE__ */ jsxs(HStack, {
      spacing: 2,
      flexWrap: "wrap",
      rowGap: 2,
      children: [/* @__PURE__ */ jsx(ButtonGroup, {
        size: "sm",
        isAttached: true,
        variant: "outline",
        children: ["all", "logins", "changes", "failed"].map((k) => /* @__PURE__ */ jsx(Button, {
          colorScheme: "primary",
          variant: kind === k ? "solid" : "outline",
          onClick: () => setKind(k),
          children: t(`activity.kind.${k}`)
        }, k))
      }), userData.is_sudo && /* @__PURE__ */ jsxs(Select, {
        size: "sm",
        w: "180px",
        borderRadius: "10px",
        value: admin,
        onChange: (e) => setAdmin(e.target.value),
        children: [/* @__PURE__ */ jsx("option", {
          value: "",
          children: t("activity.allAdmins")
        }), admins.map((a) => /* @__PURE__ */ jsx("option", {
          value: a,
          children: a
        }, a))]
      }), /* @__PURE__ */ jsx(Input, {
        size: "sm",
        w: "220px",
        borderRadius: "10px",
        placeholder: t("activity.search"),
        value: q,
        onChange: (e) => setQ(e.target.value)
      }), loading && /* @__PURE__ */ jsx(Spinner, {
        size: "sm",
        color: "primary.500"
      })]
    }), !items.length && !loading && /* @__PURE__ */ jsx(Box, {
      className: "alexen-page",
      borderRadius: "16px",
      borderWidth: "1px",
      p: 8,
      textAlign: "center",
      color: "gray.500",
      fontSize: "sm",
      children: t("activity.empty")
    }), days.map((d) => /* @__PURE__ */ jsxs(Box, {
      className: "alexen-page",
      borderRadius: "16px",
      borderWidth: "1px",
      overflow: "hidden",
      children: [/* @__PURE__ */ jsx(Text, {
        px: 4,
        py: 2.5,
        fontSize: "xs",
        fontWeight: "semibold",
        color: "gray.500",
        textTransform: "uppercase",
        letterSpacing: "wider",
        bg: "var(--tier-2)",
        children: dayjs(d.day).format("dddd, D MMMM YYYY")
      }), d.items.map((it) => {
        let detail = null;
        try {
          detail = it.detail ? JSON.parse(it.detail) : null;
        } catch {
        }
        const dev = deviceOf(it.user_agent);
        const bad = it.action === "login_failed" || it.status >= 400;
        const DevIcon = dev.kind === "phone" ? DevicePhoneMobileIcon : dev.kind === "tablet" ? DeviceTabletIcon : ComputerDesktopIcon;
        return /* @__PURE__ */ jsxs(Box, {
          borderTopWidth: "1px",
          borderColor: "var(--tier-line)",
          children: [/* @__PURE__ */ jsxs(HStack, {
            px: 4,
            py: 2.5,
            spacing: 3,
            cursor: detail ? "pointer" : void 0,
            _hover: {
              bg: "var(--tier-item)"
            },
            onClick: () => detail && setOpen(open === it.id ? null : it.id),
            children: [/* @__PURE__ */ jsx(Box, {
              w: "32px",
              h: "32px",
              flexShrink: 0,
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: bad ? "red.400" : it.action === "login" ? "green.400" : it.method === "DELETE" ? "orange.400" : "primary.400",
              bg: "var(--tier-item)",
              children: /* @__PURE__ */ jsx(Icon, {
                as: iconOf(it),
                boxSize: "17px"
              })
            }), /* @__PURE__ */ jsxs(Box, {
              flex: "1",
              minW: 0,
              children: [/* @__PURE__ */ jsxs(HStack, {
                spacing: 2,
                children: [/* @__PURE__ */ jsx(Text, {
                  fontSize: "sm",
                  fontWeight: "medium",
                  isTruncated: true,
                  children: describe(t, it, detail)
                }), bad && it.action !== "login_failed" && /* @__PURE__ */ jsx(Badge, {
                  colorScheme: "red",
                  variant: "subtle",
                  fontSize: "2xs",
                  children: t("activity.failedBadge", {
                    code: it.status
                  })
                })]
              }), /* @__PURE__ */ jsxs(HStack, {
                spacing: 2,
                fontSize: "xs",
                color: "gray.500",
                flexWrap: "wrap",
                rowGap: 0,
                children: [/* @__PURE__ */ jsx(Text, {
                  fontWeight: "medium",
                  children: it.admin || "\u2014"
                }), /* @__PURE__ */ jsx(Text, {
                  children: "\xB7"
                }), /* @__PURE__ */ jsxs(HStack, {
                  spacing: 1,
                  children: [/* @__PURE__ */ jsx(Icon, {
                    as: DevIcon,
                    boxSize: "13px"
                  }), /* @__PURE__ */ jsx(Text, {
                    isTruncated: true,
                    maxW: "280px",
                    title: it.user_agent,
                    children: dev.text
                  })]
                }), /* @__PURE__ */ jsx(Text, {
                  children: "\xB7"
                }), /* @__PURE__ */ jsx(Text, {
                  fontFamily: "mono",
                  children: it.ip || "\u2014"
                })]
              })]
            }), /* @__PURE__ */ jsxs(Box, {
              textAlign: "right",
              flexShrink: 0,
              children: [/* @__PURE__ */ jsx(Text, {
                fontSize: "sm",
                children: dayjs.unix(it.time).format("HH:mm:ss")
              }), /* @__PURE__ */ jsx(Text, {
                fontSize: "2xs",
                color: "gray.500",
                children: dayjs.unix(it.time).fromNow()
              })]
            })]
          }), /* @__PURE__ */ jsx(Collapse, {
            in: open === it.id,
            animateOpacity: true,
            unmountOnExit: true,
            children: /* @__PURE__ */ jsxs(Box, {
              mx: 4,
              mb: 3,
              p: 3,
              borderRadius: "10px",
              bg: "var(--tier-2)",
              fontFamily: "mono",
              fontSize: "11px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxH: "320px",
              overflowY: "auto",
              children: [/* @__PURE__ */ jsxs(Text, {
                color: "gray.500",
                mb: 1,
                children: [it.method, " ", it.path]
              }), JSON.stringify(detail, null, 2)]
            })
          })]
        }, it.id);
      })]
    }, d.day)), more && /* @__PURE__ */ jsx(Button, {
      size: "sm",
      variant: "outline",
      alignSelf: "center",
      isLoading: loading,
      onClick: () => {
        var _a;
        return load((_a = items[items.length - 1]) == null ? void 0 : _a.id);
      },
      children: t("activity.more")
    })]
  });
};
export {
  ActivityPage,
  deviceOf
};
