// Manage external panels (3x-ui / s-ui): add a connection, test it, and view its inbounds.
// Importing those inbounds into users' subs and showing their live traffic comes next.
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Switch,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import {
  ArrowPathIcon,
  PencilSquareIcon,
  PlusIcon,
  ServerStackIcon,
  TrashIcon,
  QueueListIcon,
  ChartBarIcon,
  ArrowUpTrayIcon,
} from "@heroicons/react/24/outline";
import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";
import { formatBytes } from "utils/formatByte";

type Scope = { admins: string[]; groups: string[] };
type Panel = {
  id: number;
  name: string;
  kind: "3xui" | "sui";
  address: string;
  panel_path: string;
  scope: Scope;
  enabled: boolean;
  username: string;
  has_password: boolean;
  has_token: boolean;
  sync_interval: number;
  live: boolean;
  count_traffic: boolean;
  auto_provision: boolean;
  prov_config: { auto?: boolean; inbounds?: number[]; scope_all?: boolean; admins?: string[]; name_mode?: string; name_template?: string; port_map?: Record<string, number>; host_over?: string };
  last_error: string | null;
  last_sync: string | null;
};
type Form = {
  id?: number;
  name: string;
  kind: "3xui" | "sui";
  address: string;
  panel_path: string;
  username: string;
  password: string;
  token: string;
  admins: string[];
  enabled: boolean;
  syncMode: "off" | "interval" | "live";
  syncInterval: number;
  countTraffic: boolean;
};

const emptyForm: Form = {
  name: "",
  kind: "3xui",
  address: "",
  panel_path: "/",
  username: "",
  password: "",
  token: "",
  admins: [],
  enabled: true,
  syncMode: "off",
  syncInterval: 60,
  countTraffic: false,
};

// "39319:443, 22983:443" -> {"39319":443}
const parsePortMap = (s: string): Record<string, number> => {
  const m: Record<string, number> = {};
  (s || "").split(/[,\n]/).forEach((pair) => {
    const [a, b] = pair.split(":").map((x) => x.trim());
    if (a && b && !isNaN(+a) && !isNaN(+b)) m[a] = +b;
  });
  return m;
};

const fmtUptime = (sec: number): string => {
  sec = Math.max(0, Math.floor(sec || 0));
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return (d ? `${d}g ` : "") + (h || d ? `${h}s ` : "") + `${m}d`;
};

const Meter: FC<{ label: string; used: number; total: number }> = ({ label, used, total }) => {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  const color = pct >= 90 ? "red.400" : pct >= 70 ? "orange.400" : "green.400";
  return (
    <Box minW="130px" flex="1">
      <HStack justify="space-between" mb={0.5}>
        <Text fontSize="xs" color="gray.500">{label}</Text>
        <Text fontSize="xs" fontWeight="semibold">{pct}%</Text>
      </HStack>
      <Box h="5px" borderRadius="full" bg="blackAlpha.200" _dark={{ bg: "whiteAlpha.200" }} overflow="hidden">
        <Box h="100%" w={`${pct}%`} bg={color} borderRadius="full" />
      </Box>
      <Text fontSize="2xs" color="gray.500" mt={0.5}>{formatBytes(used)} / {formatBytes(total)}</Text>
    </Box>
  );
};

const ServerStatus: FC<{ s: any }> = ({ s }) => {
  const { t } = useTranslation();
  const xrayUp = s.xray?.state === "running";
  const loads = Array.isArray(s.loads) ? s.loads : [];
  return (
    <Box {...{ borderWidth: "1px", borderRadius: "12px" }} p={3} mb={3} borderColor="light-border" _dark={{ borderColor: "gray.700" }}>
      <HStack mb={2} flexWrap="wrap" spacing={3}>
        <Text fontSize="xs" fontWeight="bold" color="gray.500">{t("extPanel.srvTitle")}</Text>
        <Badge colorScheme={xrayUp ? "green" : "red"}>Xray {xrayUp ? t("extPanel.srvRunning") : t("extPanel.srvStopped")}{s.xray?.version ? ` ${s.xray.version}` : ""}</Badge>
        {s.panelVersion && <Badge variant="subtle">3x-ui {s.panelVersion}</Badge>}
        {s.publicIP?.ipv4 && s.publicIP.ipv4 !== "N/A" && <Text fontSize="xs" fontFamily="mono" color="gray.500">{s.publicIP.ipv4}</Text>}
        {s.uptime != null && <Text fontSize="xs" color="gray.500" ml="auto">{t("extPanel.srvUptime")}: {fmtUptime(s.uptime)}</Text>}
      </HStack>
      <HStack spacing={4} flexWrap="wrap" align="flex-start">
        <Box minW="110px">
          <Text fontSize="xs" color="gray.500">CPU{s.cpuCores ? ` (${s.cpuCores})` : ""}</Text>
          <Text fontSize="md" fontWeight="bold">{Math.round(s.cpu || 0)}%</Text>
        </Box>
        <Meter label="RAM" used={s.mem?.current || 0} total={s.mem?.total || 0} />
        <Meter label={t("extPanel.srvDisk")} used={s.disk?.current || 0} total={s.disk?.total || 0} />
        <Box minW="110px">
          <Text fontSize="xs" color="gray.500">{t("extPanel.srvLoad")}</Text>
          <Text fontSize="sm" fontFamily="mono">{loads.map((x: number) => (+x).toFixed(2)).join(" ") || "—"}</Text>
        </Box>
        <Box minW="120px">
          <Text fontSize="xs" color="gray.500">{t("extPanel.srvNet")}</Text>
          <Text fontSize="sm" fontFamily="mono">↑{formatBytes(s.netIO?.up || 0)}/s ↓{formatBytes(s.netIO?.down || 0)}/s</Text>
        </Box>
        {(s.tcpCount != null || s.udpCount != null) && (
          <Box minW="90px">
            <Text fontSize="xs" color="gray.500">TCP / UDP</Text>
            <Text fontSize="sm" fontFamily="mono">{s.tcpCount ?? 0} / {s.udpCount ?? 0}</Text>
          </Box>
        )}
      </HStack>
    </Box>
  );
};

export const ExternalPanelsPage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [inbounds, setInbounds] = useState<{ panel: Panel; items: any[] } | null>(null);
  const [stats, setStats] = useState<{ panel: Panel; data: any | null; error?: string } | null>(null);
  const [busy, setBusy] = useState<number | "form" | null>(null);
  const [prov, setProv] = useState<
    { panel: Panel; inbounds: any[]; inboundIds: number[]; all: boolean; admins: string[]; nameMode: string; nameTemplate: string; auto: boolean; portMap: string; hostOver: string } | null
  >(null);
  const statsRef = useRef<Panel | null>(null);

  const openProvision = (p: Panel) => {
    setBusy(p.id);
    fetch(`/external-panels/${p.id}/inbounds`)
      .then((r: any) => {
        const pc = p.prov_config || {};
        setProv({
          panel: p, inbounds: r.inbounds || [],
          inboundIds: pc.inbounds || [],
          all: pc.scope_all ?? false,
          admins: pc.admins || p.scope?.admins || [],
          nameMode: pc.name_mode || "original",
          nameTemplate: pc.name_template || "",
          auto: pc.auto ?? false,
          portMap: Object.entries(pc.port_map || {}).map(([k, v]) => `${k}:${v}`).join(", "),
          hostOver: pc.host_over || "",
        });
      })
      .catch(err)
      .finally(() => setBusy(null));
  };


  // poll the open panel's live traffic/online; refresh rate follows the panel's own sync
  // setting (live ~3s, interval = its seconds, off = a relaxed 15s just while the tab is open)
  useEffect(() => {
    statsRef.current = stats?.panel || null;
    if (!stats) return;
    let stop = false;
    const tick = () => {
      const p = statsRef.current;
      if (!p) return;
      fetch(`/external-panels/${p.id}/stats`)
        .then((d: any) => !stop && setStats((s) => (s && s.panel.id === p.id ? { panel: p, data: d } : s)))
        .catch((e) => !stop && setStats((s) => (s && s.panel.id === p.id ? { panel: p, data: s.data, error: e?.response?._data?.detail || "error" } : s)));
    };
    tick();
    const p = stats.panel;
    const ms = p.live ? 3000 : p.sync_interval > 0 ? p.sync_interval * 1000 : 15000;
    const id = setInterval(tick, ms);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [stats?.panel?.id]);

  const { data: panels = [], isLoading } = useQuery<Panel[]>("external-panels", () => fetch("/external-panels"));
  const { data: admins = [] } = useQuery<any[]>("admins-for-ext", () => fetch("/admins"));
  // every admin is selectable (incl. sudo/own account like alex77), so you can scope to your own users too
  const resellers = admins.map((a) => a.username);

  const ok = (title: string): void => {
    toast({ status: "success", title, position: "top", duration: 3000 });
  };
  const err = (e: any): void => {
    toast({ status: "error", title: e?.response?._data?.detail || e?.message || t("errors.generic"), position: "top", duration: 6000 });
  };

  const save = useMutation(
    (f: Form) => {
      const body: any = {
        name: f.name.trim(),
        kind: f.kind,
        address: f.address.trim(),
        panel_path: f.panel_path.trim() || "/",
        username: f.username,
        token: f.token || null,
        scope: { admins: f.admins, groups: [] },
        enabled: f.enabled,
        sync_interval: f.syncMode === "interval" ? f.syncInterval : 0,
        live: f.syncMode === "live",
        count_traffic: f.countTraffic,
      };
      if (f.password) body.password = f.password;
      return f.id
        ? fetch(`/external-panels/${f.id}`, { method: "PUT", body })
        : fetch("/external-panels", { method: "POST", body: { ...body, password: f.password } });
    },
    {
      onSuccess: () => {
        ok(t("extPanel.saved"));
        setForm(null);
        qc.invalidateQueries("external-panels");
      },
      onError: err,
    }
  );

  const test = (p: Panel) => {
    setBusy(p.id);
    fetch(`/external-panels/${p.id}/test`, { method: "POST" })
      .then((r: any) => ok(t("extPanel.testOk", { count: r.inbounds })))
      .catch(err)
      .finally(() => {
        setBusy(null);
        qc.invalidateQueries("external-panels");
      });
  };

  const showInbounds = (p: Panel) => {
    setBusy(p.id);
    fetch(`/external-panels/${p.id}/inbounds`)
      .then((r: any) => setInbounds({ panel: p, items: r.inbounds || [] }))
      .catch(err)
      .finally(() => setBusy(null));
  };

  const remove = (p: Panel) => {
    if (!window.confirm(t("extPanel.confirmDelete", { name: p.name }))) return;
    fetch(`/external-panels/${p.id}`, { method: "DELETE" })
      .then(() => {
        ok(t("extPanel.deleted"));
        qc.invalidateQueries("external-panels");
      })
      .catch(err);
  };

  const startEdit = (p: Panel) =>
    setForm({
      id: p.id,
      name: p.name,
      kind: p.kind,
      address: p.address,
      panel_path: p.panel_path,
      username: p.username,
      password: "",
      token: "",
      admins: p.scope?.admins || [],
      enabled: p.enabled,
      syncMode: p.live ? "live" : p.sync_interval > 0 ? "interval" : "off",
      syncInterval: p.sync_interval > 0 ? p.sync_interval : 60,
      countTraffic: !!p.count_traffic,
    });

  const canSave = form && form.name.trim() && form.address.trim();

  return (
    <VStack align="stretch" spacing={4} maxW="900px">
      <Flex align="center" gap={3} wrap="wrap">
        <Box>
          <Heading size="md">{t("extPanel.title")}</Heading>
          <Text fontSize="sm" color="gray.500">
            {t("extPanel.help")}
          </Text>
        </Box>
        <Button
          ml="auto"
          size="sm"
          colorScheme="primary"
          leftIcon={<PlusIcon width={16} />}
          onClick={() => setForm({ ...emptyForm })}
        >
          {t("extPanel.add")}
        </Button>
      </Flex>

      {form && (
        <Box className="alexen-page" borderWidth="1px" borderRadius="16px" p={5}>
          <Heading size="sm" mb={4}>
            {form.id ? t("extPanel.editTitle") : t("extPanel.add")}
          </Heading>
          <VStack align="stretch" spacing={3}>
            <HStack spacing={3} align="flex-start" flexWrap="wrap">
              <FormControl flex="1" minW="200px">
                <FormLabel fontSize="sm">{t("extPanel.name")}</FormLabel>
                <Input size="sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormControl>
              <FormControl w="140px">
                <FormLabel fontSize="sm">{t("extPanel.kind")}</FormLabel>
                <Select
                  size="sm"
                  value={form.kind}
                  onChange={(e) => {
                    const kind = e.target.value as "3xui" | "sui";
                    setForm({ ...form, kind, panel_path: kind === "sui" ? "/app/" : "/" });
                  }}
                >
                  <option value="3xui">3x-ui</option>
                  <option value="sui">s-ui</option>
                </Select>
              </FormControl>
            </HStack>
            <HStack spacing={3} align="flex-start" flexWrap="wrap">
              <FormControl flex="1" minW="240px">
                <FormLabel fontSize="sm">{t("extPanel.address")}</FormLabel>
                <Input size="sm" placeholder="http://1.2.3.4:2053" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </FormControl>
              <FormControl w="140px">
                <FormLabel fontSize="sm">{t("extPanel.path")}</FormLabel>
                <Input size="sm" value={form.panel_path} onChange={(e) => setForm({ ...form, panel_path: e.target.value })} />
              </FormControl>
            </HStack>
            <HStack spacing={3} align="flex-start" flexWrap="wrap">
              <FormControl flex="1" minW="180px">
                <FormLabel fontSize="sm">{t("extPanel.username")}</FormLabel>
                <Input size="sm" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </FormControl>
              <FormControl flex="1" minW="180px">
                <FormLabel fontSize="sm">{t("extPanel.password")}</FormLabel>
                <Input
                  size="sm"
                  type="password"
                  placeholder={form.id ? t("extPanel.passwordKeep") : ""}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </FormControl>
            </HStack>
            <FormControl>
              <FormLabel fontSize="sm">{t("extPanel.token")}</FormLabel>
              <Input size="sm" placeholder={t("extPanel.tokenHelp")} value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">{t("extPanel.scope")}</FormLabel>
              <Text fontSize="xs" color="gray.500" mb={2}>
                {t("extPanel.scopeHelp")}
              </Text>
              <Box maxH="140px" overflowY="auto" borderWidth="1px" borderRadius="10px" p={2}>
                {resellers.length === 0 ? (
                  <Text fontSize="xs" color="gray.500">
                    {t("extPanel.noResellers")}
                  </Text>
                ) : (
                  <VStack align="stretch" spacing={1}>
                    {resellers.map((u) => (
                      <Checkbox
                        key={u}
                        size="sm"
                        isChecked={form.admins.includes(u)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            admins: e.target.checked ? [...form.admins, u] : form.admins.filter((x) => x !== u),
                          })
                        }
                      >
                        {u}
                      </Checkbox>
                    ))}
                  </VStack>
                )}
              </Box>
            </FormControl>
            <HStack>
              <Switch isChecked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              <Text fontSize="sm">{t("extPanel.enabled")}</Text>
            </HStack>
            <FormControl>
              <FormLabel fontSize="sm">{t("extPanel.sync")}</FormLabel>
              <HStack spacing={2} flexWrap="wrap">
                {([["off", t("extPanel.syncOff")], ["interval", t("extPanel.syncInterval")], ["live", t("extPanel.syncLive")]] as [Form["syncMode"], string][]).map(([v, label]) => (
                  <Button key={v} size="xs" borderRadius="full" colorScheme={v === "live" ? "green" : "primary"}
                    variant={form.syncMode === v ? "solid" : "outline"} onClick={() => setForm({ ...form, syncMode: v })}>
                    {label}
                  </Button>
                ))}
                {form.syncMode === "interval" && (
                  <HStack spacing={1}>
                    <Input size="xs" w="70px" type="number" min={10} value={form.syncInterval}
                      onChange={(e) => setForm({ ...form, syncInterval: Math.max(10, +e.target.value || 0) })} />
                    <Text fontSize="xs" color="gray.500">{t("extPanel.seconds")}</Text>
                  </HStack>
                )}
              </HStack>
              <Text fontSize="xs" color="gray.500" mt={1}>{t("extPanel.syncHelp")}</Text>
            </FormControl>
            {form.syncMode !== "off" && (
              <HStack>
                <Switch isChecked={form.countTraffic} onChange={(e) => setForm({ ...form, countTraffic: e.target.checked })} />
                <Box>
                  <Text fontSize="sm">{t("extPanel.countTraffic")}</Text>
                  <Text fontSize="xs" color="gray.500">{t("extPanel.countTrafficHelp")}</Text>
                </Box>
              </HStack>
            )}
            <HStack justify="flex-end" pt={1}>
              <Button size="sm" variant="ghost" onClick={() => setForm(null)}>
                {t("extPanel.cancel")}
              </Button>
              <Button size="sm" colorScheme="primary" isDisabled={!canSave} isLoading={save.isLoading} onClick={() => save.mutate(form)}>
                {t("extPanel.save")}
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {isLoading ? (
        <HStack justify="center" py={8}>
          <Spinner color="primary.500" />
        </HStack>
      ) : panels.length === 0 && !form ? (
        <Box className="alexen-page" borderWidth="1px" borderRadius="16px" p={8} textAlign="center" color="gray.500">
          <ServerStackIcon width={32} style={{ margin: "0 auto 10px" }} />
          <Text fontSize="sm">{t("extPanel.empty")}</Text>
        </Box>
      ) : (
        <VStack align="stretch" spacing={2}>
          {panels.map((p) => (
            <Box key={p.id} className="alexen-page" borderWidth="1px" borderRadius="14px" p={4}>
              <Flex align="center" gap={3} wrap="wrap">
                <Badge colorScheme={p.kind === "3xui" ? "purple" : "teal"}>{p.kind === "3xui" ? "3x-ui" : "s-ui"}</Badge>
                <Box minW={0}>
                  <HStack spacing={2}>
                    <Text fontWeight="semibold" fontSize="sm">
                      {p.name}
                    </Text>
                    {!p.enabled && (
                      <Badge colorScheme="gray" variant="subtle">
                        {t("extPanel.disabled")}
                      </Badge>
                    )}
                    {p.auto_provision && (
                      <Badge colorScheme="green" variant="subtle">{t("extPanel.autoBadge")}</Badge>
                    )}
                    {p.live && (
                      <Badge colorScheme="green">{t("extPanel.syncLive")}</Badge>
                    )}
                  </HStack>
                  <Text fontSize="xs" color="gray.500" isTruncated maxW="360px">
                    {p.address}
                    {p.panel_path !== "/" ? p.panel_path : ""} · {p.scope?.admins?.length ? p.scope.admins.join(", ") : t("extPanel.allAdmins")}
                  </Text>
                  {p.last_error && (
                    <Text fontSize="xs" color="red.400" isTruncated maxW="360px">
                      {p.last_error}
                    </Text>
                  )}
                </Box>
                <HStack ml="auto" spacing={1}>
                  <Button size="xs" variant="outline" leftIcon={<ArrowPathIcon width={14} />} isLoading={busy === p.id} onClick={() => test(p)}>
                    {t("extPanel.test")}
                  </Button>
                  <Button size="xs" variant="outline" leftIcon={<QueueListIcon width={14} />} onClick={() => showInbounds(p)}>
                    {t("extPanel.inbounds")}
                  </Button>
                  <Button size="xs" variant="outline" leftIcon={<ChartBarIcon width={14} />} onClick={() => setStats({ panel: p, data: null })}>
                    {t("extPanel.traffic")}
                  </Button>
                  <Button size="xs" colorScheme="green" variant="outline" leftIcon={<ArrowUpTrayIcon width={14} />}
                    isLoading={busy === p.id} onClick={() => openProvision(p)}>
                    {t("extPanel.provision")}
                  </Button>
                  <IconButton aria-label="edit" size="xs" variant="ghost" icon={<PencilSquareIcon width={16} />} onClick={() => startEdit(p)} />
                  <IconButton aria-label="delete" size="xs" variant="ghost" colorScheme="red" icon={<TrashIcon width={16} />} onClick={() => remove(p)} />
                </HStack>
              </Flex>
            </Box>
          ))}
        </VStack>
      )}

      {inbounds && (
        <Box className="alexen-page" borderWidth="1px" borderRadius="16px" p={5}>
          <HStack mb={3}>
            <Heading size="sm">
              {inbounds.panel.name} — {t("extPanel.inboundsCount", { count: inbounds.items.length })}
            </Heading>
            <Button size="xs" variant="ghost" ml="auto" onClick={() => setInbounds(null)}>
              {t("close")}
            </Button>
          </HStack>
          {inbounds.items.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              {t("extPanel.noInbounds")}
            </Text>
          ) : (
            <VStack align="stretch" spacing={1}>
              {inbounds.items.map((ib, i) => {
                const name = ib.remark || ib.tag || ib.listen || `#${ib.id ?? i}`;
                const proto = ib.protocol || ib.type || "";
                const port = ib.port || ib.listen_port || "";
                return (
                  <HStack key={i} fontSize="sm" borderWidth="1px" borderRadius="8px" px={3} py={2}>
                    <Text fontWeight="medium" isTruncated>
                      {name}
                    </Text>
                    {proto && <Badge>{proto}</Badge>}
                    {port && <Text color="gray.500" ml="auto" fontFamily="mono">:{port}</Text>}
                  </HStack>
                );
              })}
            </VStack>
          )}
        </Box>
      )}

      {stats && (
        <Box className="alexen-page" borderWidth="1px" borderRadius="16px" p={5}>
          <HStack mb={3}>
            <Heading size="sm">{stats.panel.name} — {t("extPanel.traffic")}</Heading>
            <Spinner size="xs" color="primary.400" />
            <Button size="xs" variant="ghost" ml="auto" onClick={() => setStats(null)}>
              {t("close")}
            </Button>
          </HStack>
          {stats.error && !stats.data ? (
            <Text fontSize="sm" color="red.400">{stats.error}</Text>
          ) : !stats.data ? (
            <Text fontSize="sm" color="gray.500">…</Text>
          ) : (
            <>
              <HStack spacing={6} mb={3} flexWrap="wrap">
                <Box>
                  <Text fontSize="xs" color="gray.500">{t("extPanel.online")}</Text>
                  <Text fontSize="lg" fontWeight="bold" color="green.400">{stats.data.online ?? 0}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">↑ {t("extPanel.up")}</Text>
                  <Text fontSize="lg" fontWeight="bold">{formatBytes(stats.data.total_up || 0)}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="gray.500">↓ {t("extPanel.down")}</Text>
                  <Text fontSize="lg" fontWeight="bold">{formatBytes(stats.data.total_down || 0)}</Text>
                </Box>
              </HStack>
              {stats.data.server && Object.keys(stats.data.server).length > 0 && (
                <ServerStatus s={stats.data.server} />
              )}
              {(stats.data.clients || []).length > 0 && (
                <VStack align="stretch" spacing={1} maxH="300px" overflowY="auto">
                  {stats.data.clients.map((c: any, i: number) => (
                    <HStack key={i} fontSize="sm" borderWidth="1px" borderRadius="8px" px={3} py={1.5}>
                      <Box w="8px" h="8px" borderRadius="full" bg={c.online ? "green.400" : "gray.400"} flexShrink={0} />
                      <Text isTruncated>{c.name || "—"}</Text>
                      <Text ml="auto" color="gray.500" fontFamily="mono" fontSize="xs">
                        {formatBytes(c.total || 0)}
                      </Text>
                    </HStack>
                  ))}
                </VStack>
              )}
              <Text mt={3} fontSize="xs" color="gray.500">{t("extPanel.liveHint")}</Text>
            </>
          )}
        </Box>
      )}

      {prov && (
        <Box className="alexen-page" borderWidth="1px" borderRadius="16px" p={5}>
          <HStack mb={3}>
            <Heading size="sm">{prov.panel.name} — {t("extPanel.provision")}</Heading>
            <Button size="xs" variant="ghost" ml="auto" onClick={() => setProv(null)}>{t("close")}</Button>
          </HStack>
          <Text fontSize="xs" color="gray.500" mb={3}>{t("extPanel.provisionHelp")}</Text>
          <FormControl mb={3}>
            <FormLabel fontSize="sm">{t("extPanel.chooseInbounds")}</FormLabel>
            <Box maxH="150px" overflowY="auto" borderWidth="1px" borderRadius="10px" p={2}>
              {prov.inbounds.length === 0 ? (
                <Text fontSize="xs" color="gray.500">{t("extPanel.noInbounds")}</Text>
              ) : (
                <VStack align="stretch" spacing={1}>
                  {prov.inbounds.map((ib: any) => (
                    <Checkbox key={ib.id} size="sm" isChecked={prov.inboundIds.includes(ib.id)}
                      onChange={(e) => setProv({ ...prov, inboundIds: e.target.checked ? [...prov.inboundIds, ib.id] : prov.inboundIds.filter((x) => x !== ib.id) })}>
                      {ib.remark || ib.tag || `#${ib.id}`} <Badge ml={1}>{ib.protocol}</Badge>{" "}
                      <Text as="span" color="gray.500" fontFamily="mono">:{ib.port}</Text>
                    </Checkbox>
                  ))}
                </VStack>
              )}
            </Box>
          </FormControl>
          <FormControl mb={3}>
            <FormLabel fontSize="sm">{t("extPanel.importScope")}</FormLabel>
            <Checkbox size="sm" isChecked={prov.all} onChange={(e) => setProv({ ...prov, all: e.target.checked })} mb={1}>
              {t("extPanel.everyone")}
            </Checkbox>
            {!prov.all && (
              <Box maxH="120px" overflowY="auto" borderWidth="1px" borderRadius="10px" p={2}>
                {resellers.length === 0 ? (
                  <Text fontSize="xs" color="gray.500">{t("extPanel.noResellers")}</Text>
                ) : (
                  <VStack align="stretch" spacing={1}>
                    {resellers.map((u) => (
                      <Checkbox key={u} size="sm" isChecked={prov.admins.includes(u)}
                        onChange={(e) => setProv({ ...prov, admins: e.target.checked ? [...prov.admins, u] : prov.admins.filter((x) => x !== u) })}>
                        {u}
                      </Checkbox>
                    ))}
                  </VStack>
                )}
              </Box>
            )}
          </FormControl>
          <FormControl mb={3}>
            <FormLabel fontSize="sm">{t("external.nameMode")}</FormLabel>
            <Select size="sm" value={prov.nameMode} onChange={(e) => setProv({ ...prov, nameMode: e.target.value })}>
              <option value="original">{t("external.nameModeOriginal")}</option>
              <option value="random_geo">🇩🇪 {t("external.nameModeGeo")}</option>
              <option value="custom">{t("external.nameModeCustom")}</option>
            </Select>
            {prov.nameMode === "custom" && (
              <>
                <Input mt={2} size="sm" maxLength={128} placeholder="🇺🇸 Premium {RANDOM}" value={prov.nameTemplate} onChange={(e) => setProv({ ...prov, nameTemplate: e.target.value })} />
                <Text fontSize="xs" color="gray.500" mt={1}>{t("external.nameTemplateHelp")}</Text>
              </>
            )}
          </FormControl>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3} mb={3}>
            <FormControl>
              <FormLabel fontSize="sm">{t("extPanel.portMap")}</FormLabel>
              <Input size="sm" placeholder="39319:443, 22983:443" value={prov.portMap} onChange={(e) => setProv({ ...prov, portMap: e.target.value })} />
              <Text fontSize="xs" color="gray.500" mt={1}>{t("extPanel.portMapHelp")}</Text>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">{t("extPanel.hostOver")}</FormLabel>
              <Input size="sm" placeholder={prov.panel.address.replace(/^https?:\/\//, "").split(":")[0]} value={prov.hostOver} onChange={(e) => setProv({ ...prov, hostOver: e.target.value })} />
              <Text fontSize="xs" color="gray.500" mt={1}>{t("extPanel.hostOverHelp")}</Text>
            </FormControl>
          </SimpleGrid>
          <HStack mb={3} align="flex-start">
            <Switch isChecked={prov.auto} onChange={(e) => setProv({ ...prov, auto: e.target.checked })} />
            <Box>
              <Text fontSize="sm">{t("extPanel.autoProvision")}</Text>
              <Text fontSize="xs" color="gray.500">{t("extPanel.autoProvisionHelp")}</Text>
            </Box>
          </HStack>
          <HStack justify="flex-end">
            <Button size="sm" colorScheme="green"
              isDisabled={prov.inboundIds.length === 0 || (!prov.all && prov.admins.length === 0)}
              isLoading={busy === "form"}
              onClick={() => {
                setBusy("form");
                fetch(`/external-panels/${prov.panel.id}/provision`, { method: "POST", body: { inbound_ids: prov.inboundIds, scope_all: prov.all, scope_admins: prov.all ? [] : prov.admins, name_mode: prov.nameMode, name_template: prov.nameTemplate, auto: prov.auto, port_map: parsePortMap(prov.portMap), host_over: prov.hostOver.trim() } })
                  .then((r: any) => { ok(t("extPanel.provisioned", { created: r.created, exists: r.exists, failed: r.failed })); setProv(null); })
                  .catch(err)
                  .finally(() => setBusy(null));
              }}>
              {t("extPanel.provision")}
            </Button>
          </HStack>
        </Box>
      )}
    </VStack>
  );
};

export default ExternalPanelsPage;
