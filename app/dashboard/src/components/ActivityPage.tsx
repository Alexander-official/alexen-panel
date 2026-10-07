// Recent actions: every sign-in and every change in the panel, who, when, from
// which device and IP (app/activity.py). Sudo admins see everyone.
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Collapse,
  HStack,
  Icon,
  Input,
  Select,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowLeftOnRectangleIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  DeviceTabletIcon,
  NoSymbolIcon,
  PencilSquareIcon,
  PlusCircleIcon,
  TrashIcon,
  ArrowPathIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import useGetUser from "hooks/useGetUser";
import { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetch } from "service/http";

type Item = {
  id: number;
  time: number;
  admin: string | null;
  action: string;
  method: string;
  path: string;
  status: number;
  ip: string;
  user_agent: string;
  detail: string | null;
};
type Page = { items: Item[]; admins: string[]; more: boolean };

// what a request did: [method, path, i18n key, names of the path parts]
const RULES: [string, RegExp, string, string[]][] = [
  ["PUT", /^\/api\/user\/([^/]+)\/warning$/, "userWarning", ["name"]],
  ["POST", /^\/api\/messages\/([^/]+)$/, "message", ["name"]],
  ["PUT", /^\/api\/anti-theft$/, "antiTheft", []],
  ["POST", /^\/api\/alerts\/read$/, "alertsRead", []],
  ["POST", /^\/api\/user$/, "userCreate", []],
  ["PUT", /^\/api\/user\/([^/]+)$/, "userEdit", ["name"]],
  ["DELETE", /^\/api\/user\/([^/]+)$/, "userDelete", ["name"]],
  ["POST", /^\/api\/user\/([^/]+)\/reset$/, "userReset", ["name"]],
  ["POST", /^\/api\/user\/([^/]+)\/revoke_sub$/, "userRevoke", ["name"]],
  ["POST", /^\/api\/user\/([^/]+)\/active-next$/, "userNext", ["name"]],
  ["DELETE", /^\/api\/user\/([^/]+)\/devices/, "userDevices", ["name"]],
  ["POST", /^\/api\/users\/reset$/, "usersReset", []],
  ["DELETE", /^\/api\/users\/expired/, "usersExpired", []],
  ["PUT", /^\/api\/admin\/([^/]+)\/sub-profile$/, "adminSubProfile", ["name"]],
  ["POST", /^\/api\/admin$/, "adminCreate", []],
  ["PUT", /^\/api\/admin\/([^/]+)$/, "adminEdit", ["name"]],
  ["DELETE", /^\/api\/admin\/([^/]+)$/, "adminDelete", ["name"]],
  ["POST", /^\/api\/node$/, "nodeCreate", []],
  ["PUT", /^\/api\/node\/(\d+)$/, "nodeEdit", ["id"]],
  ["DELETE", /^\/api\/node\/(\d+)$/, "nodeDelete", ["id"]],
  ["POST", /^\/api\/node\/(\d+)\/reconnect$/, "nodeReconnect", ["id"]],
  ["POST", /^\/api\/node\/(\d+)\/install$/, "nodeInstall", ["id"]],
  ["PUT", /^\/api\/node\/(\d+)\/extra$/, "nodeExtra", ["id"]],
  ["PUT", /^\/api\/hosts$/, "hosts", []],
  ["PUT", /^\/api\/core\/config/, "coreConfig", []],
  ["POST", /^\/api\/core\/restart$/, "coreRestart", []],
  ["PUT", /^\/api\/preroute\/tunnels\/new$/, "prerouteCreate", []],
  ["PUT", /^\/api\/preroute\/tunnels\/(\d+)$/, "prerouteEdit", ["id"]],
  ["DELETE", /^\/api\/preroute\/tunnels\/(\d+)$/, "prerouteDelete", ["id"]],
  ["PUT", /^\/api\/sub-settings$/, "subSettings", []],
  ["PUT", /^\/api\/sub-webpage$/, "subWebpage", []],
  ["PUT", /^\/api\/json-sub-settings$/, "jsonSub", []],
  ["PUT", /^\/api\/external-configs(\/mine)?$/, "external", []],
  ["PUT", /^\/api\/sub-domain$/, "domain", []],
  ["DELETE", /^\/api\/user\/([^/]+)\/online-ips\/([^/]+)$/, "ipCut", ["name", "ip"]],
  ["POST", /^\/api\/user\/([^/]+)\/online-ips\/([^/]+)\/unblock$/, "ipUnblock", ["name", "ip"]],
  ["PUT", /^\/api\/user\/([^/]+)\/set-owner$/, "userOwner", ["name"]],
  ["POST", /^\/api\/admin\/([^/]+)\/users\/disable$/, "adminUsersOff", ["name"]],
  ["POST", /^\/api\/admin\/([^/]+)\/users\/activate$/, "adminUsersOn", ["name"]],
  ["", /^\/api\/cores/, "cores", []],
  ["", /^\/api\/devices$/, "devices", []],
  ["", /^\/api\/groups/, "groups", []],
  ["", /^\/api\/vpn/, "vpn", []],
  ["", /^\/api\/auto-change|^\/api\/traffic\/auto/, "autoChange", []],
  ["", /^\/api\/user_template/, "template", []],
];

const describe = (t: any, it: Item, detail: any) => {
  if (it.action === "login") return t("activity.do.login");
  if (it.action === "login_failed") return t("activity.do.loginFailed");
  for (const [m, re, key, names] of RULES) {
    if (m && m !== it.method) continue;
    const hit = it.path.match(re);
    if (hit) {
      const p: Record<string, string> = {};
      names.forEach((n, i) => (p[n] = decodeURIComponent(hit[i + 1] || "")));
      if (!p.name && detail?.username) p.name = detail.username;
      if (!p.name && detail?.name) p.name = detail.name;
      return t(`activity.do.${key}`, { ...p, name: p.name || "", id: p.id || "", ip: p.ip || "" });
    }
  }
  return `${it.method} ${it.path}`;
};

const iconOf = (it: Item) =>
  it.action === "login" ? ArrowLeftOnRectangleIcon
  : it.action === "login_failed" ? NoSymbolIcon
  : it.method === "DELETE" ? TrashIcon
  : it.method === "POST" && /reset|restart|reconnect|install/.test(it.path) ? ArrowPathIcon
  : it.method === "POST" ? PlusCircleIcon
  : it.method === "PUT" ? PencilSquareIcon
  : WrenchScrewdriverIcon;

// "Chrome on Android" from the user agent
export const deviceOf = (ua: string) => {
  if (!ua) return { kind: "desktop", text: "—" };
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? (ua.match(/Android [\d.]+/)?.[0] || "Android")
    : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  const model = /Android/.test(ua) ? ua.match(/Android [\d.]+; ([^;)]+)/)?.[1]?.replace(/ Build.*/, "") : "";
  const browser = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /YaBrowser/.test(ua) ? "Yandex" : /SamsungBrowser/.test(ua) ? "Samsung"
    : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari"
    : /python|curl|wget|okhttp|Go-http/i.test(ua) ? ua.split(" ")[0] : "";
  const kind = /iPad|Tablet/.test(ua) ? "tablet" : /Mobile|iPhone|Android/.test(ua) ? "phone" : "desktop";
  const text = [browser, [os, model].filter(Boolean).join(" · ")].filter(Boolean).join(" — ") || ua.slice(0, 40);
  return { kind, text };
};

export const ActivityPage: FC = () => {
  const { t } = useTranslation();
  const { userData } = useGetUser();
  const [kind, setKind] = useState("all");
  const [admin, setAdmin] = useState("");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<Item[]>([]);
  const [admins, setAdmins] = useState<string[]>([]);
  const [more, setMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState<number | null>(null);

  const load = (before?: number) => {
    setLoading(true);
    const qs = new URLSearchParams({ kind, limit: "100" });
    if (admin) qs.set("admin", admin);
    if (q.trim()) qs.set("q", q.trim());
    if (before) qs.set("before", String(before));
    fetch(`/activity?${qs}`)
      .then((p: Page) => {
        setItems((old) => (before ? [...old, ...p.items] : p.items));
        setAdmins(p.admins);
        setMore(p.more);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    const h = setTimeout(() => load(), q ? 350 : 0);
    return () => clearTimeout(h);
  }, [kind, admin, q]);

  const days = useMemo(() => {
    const out: { day: string; items: Item[] }[] = [];
    items.forEach((it) => {
      const day = dayjs.unix(it.time).format("YYYY-MM-DD");
      if (!out.length || out[out.length - 1].day !== day) out.push({ day, items: [] });
      out[out.length - 1].items.push(it);
    });
    return out;
  }, [items]);

  return (
    <VStack align="stretch" spacing={4} maxW="1100px">
      <Text fontSize="sm" color="gray.500">
        {t("activity.help")}
      </Text>
      <HStack spacing={2} flexWrap="wrap" rowGap={2}>
        <ButtonGroup size="sm" isAttached variant="outline">
          {["all", "logins", "changes", "failed"].map((k) => (
            <Button key={k} colorScheme="primary" variant={kind === k ? "solid" : "outline"} onClick={() => setKind(k)}>
              {t(`activity.kind.${k}`)}
            </Button>
          ))}
        </ButtonGroup>
        {userData.is_sudo && (
          <Select size="sm" w="180px" borderRadius="10px" value={admin} onChange={(e) => setAdmin(e.target.value)}>
            <option value="">{t("activity.allAdmins")}</option>
            {admins.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        )}
        <Input size="sm" w="220px" borderRadius="10px" placeholder={t("activity.search")} value={q} onChange={(e) => setQ(e.target.value)} />
        {loading && <Spinner size="sm" color="primary.500" />}
      </HStack>

      {!items.length && !loading && (
        <Box className="alexen-page" borderRadius="16px" borderWidth="1px" p={8} textAlign="center" color="gray.500" fontSize="sm">
          {t("activity.empty")}
        </Box>
      )}

      {days.map((d) => (
        <Box key={d.day} className="alexen-page" borderRadius="16px" borderWidth="1px" overflow="hidden">
          <Text px={4} py={2.5} fontSize="xs" fontWeight="semibold" color="gray.500" textTransform="uppercase" letterSpacing="wider" bg="var(--tier-2)">
            {dayjs(d.day).format("dddd, D MMMM YYYY")}
          </Text>
          {d.items.map((it) => {
            let detail: any = null;
            try {
              detail = it.detail ? JSON.parse(it.detail) : null;
            } catch {}
            const dev = deviceOf(it.user_agent);
            const bad = it.action === "login_failed" || it.status >= 400;
            const DevIcon = dev.kind === "phone" ? DevicePhoneMobileIcon : dev.kind === "tablet" ? DeviceTabletIcon : ComputerDesktopIcon;
            return (
              <Box key={it.id} borderTopWidth="1px" borderColor="var(--tier-line)">
                <HStack
                  px={4}
                  py={2.5}
                  spacing={3}
                  cursor={detail ? "pointer" : undefined}
                  _hover={{ bg: "var(--tier-item)" }}
                  onClick={() => detail && setOpen(open === it.id ? null : it.id)}
                >
                  <Box
                    w="32px"
                    h="32px"
                    flexShrink={0}
                    borderRadius="10px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    color={bad ? "red.400" : it.action === "login" ? "green.400" : it.method === "DELETE" ? "orange.400" : "primary.400"}
                    bg="var(--tier-item)"
                  >
                    <Icon as={iconOf(it)} boxSize="17px" />
                  </Box>
                  <Box flex="1" minW={0}>
                    <HStack spacing={2}>
                      <Text fontSize="sm" fontWeight="medium" isTruncated>
                        {describe(t, it, detail)}
                      </Text>
                      {bad && it.action !== "login_failed" && (
                        <Badge colorScheme="red" variant="subtle" fontSize="2xs">
                          {t("activity.failedBadge", { code: it.status })}
                        </Badge>
                      )}
                    </HStack>
                    <HStack spacing={2} fontSize="xs" color="gray.500" flexWrap="wrap" rowGap={0}>
                      <Text fontWeight="medium">{it.admin || "—"}</Text>
                      <Text>·</Text>
                      <HStack spacing={1}>
                        <Icon as={DevIcon} boxSize="13px" />
                        <Text isTruncated maxW="280px" title={it.user_agent}>
                          {dev.text}
                        </Text>
                      </HStack>
                      <Text>·</Text>
                      <Text fontFamily="mono">{it.ip || "—"}</Text>
                    </HStack>
                  </Box>
                  <Box textAlign="right" flexShrink={0}>
                    <Text fontSize="sm">{dayjs.unix(it.time).format("HH:mm:ss")}</Text>
                    <Text fontSize="2xs" color="gray.500">
                      {dayjs.unix(it.time).fromNow()}
                    </Text>
                  </Box>
                </HStack>
                <Collapse in={open === it.id} animateOpacity unmountOnExit>
                  <Box mx={4} mb={3} p={3} borderRadius="10px" bg="var(--tier-2)" fontFamily="mono" fontSize="11px" whiteSpace="pre-wrap" wordBreak="break-all" maxH="320px" overflowY="auto">
                    <Text color="gray.500" mb={1}>
                      {it.method} {it.path}
                    </Text>
                    {JSON.stringify(detail, null, 2)}
                  </Box>
                </Collapse>
              </Box>
            );
          })}
        </Box>
      ))}
      {more && (
        <Button size="sm" variant="outline" alignSelf="center" isLoading={loading} onClick={() => load(items[items.length - 1]?.id)}>
          {t("activity.more")}
        </Button>
      )}
    </VStack>
  );
};
