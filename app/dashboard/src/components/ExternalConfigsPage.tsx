import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Collapse,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  NumberInput,
  NumberInputField,
  Select,
  SimpleGrid,
  Spinner,
  Switch,
  Text,
  Textarea,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  CloudArrowDownIcon,
  LinkIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { FC, ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import useGetUser from "hooks/useGetUser";
import { useLocation } from "react-router-dom";
import { fetch } from "service/http";

type ExternalConfig = {
  id: string;
  name: string;
  kind: "links" | "subscription";
  links: string;
  url: string;
  user_agent: string;
  range_start: number;
  range_end: number;
  rename: "none" | "country" | "country_city";
  test: boolean;
  test_timeout: number;
  ws_rename: boolean;
  ws_label: string;
  refresh_minutes: number;
  enabled: boolean;
  position: "top" | "bottom";
  only_active: boolean;
  groups: string[];
};
type AdminExternal = { enabled: boolean; label: string; self_edit: boolean; include_general: boolean; configs: ExternalConfig[] };
type ExternalSettings = {
  configs: ExternalConfig[];
  admins: Record<string, AdminExternal>;
  generated_sort: string;
  external_sort: string;
  protocol_order: string[];
  test_url: string;
};
type SourceItem = {
  link: string;
  name: string;
  protocol: string;
  kind?: string;
  latency: number | null;
  exit_ip?: string;
};
type SourceStatus = {
  id: string;
  running: boolean;
  updated_at: number;
  error: string;
  stats: { fetched?: number; in_range?: number; tested?: number; working?: number };
  items: SourceItem[];
};
type Preview = {
  username: string;
  items: { remark: string; link: string; source: "generated" | "external" | "admin" }[];
};

const LINK_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s#]+(#.*)?$/;
const linkCount = (links: string) => links.split("\n").filter((l) => LINK_RE.test(l.trim())).length;
const newId = () =>
  (window.crypto as any)?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const empty = (kind: ExternalConfig["kind"] = "subscription"): ExternalConfig => ({
  id: newId(),
  name: "",
  kind,
  links: "",
  url: "",
  user_agent: "",
  range_start: 1,
  range_end: 0,
  rename: "country",
  test: true,
  test_timeout: 5,
  ws_rename: true,
  ws_label: "4G/WiFi",
  refresh_minutes: 60,
  enabled: true,
  position: "bottom",
  only_active: true,
  groups: [],
});
const icon = { width: 16, height: 16 };
const PROTOCOL_LABEL: Record<string, string> = {
  vless: "VLESS",
  "vless-reality": "VLESS Reality",
  "vless-tcp": "VLESS TCP",
  "vless-ws": "VLESS WS",
  "vless-grpc": "VLESS gRPC",
  "vless-xhttp": "VLESS XHTTP",
  "vless-httpupgrade": "VLESS HTTPUpgrade",
  vmess: "VMess",
  trojan: "Trojan",
  ss: "Shadowsocks",
  hysteria2: "Hysteria2",
  tuic: "TUIC",
  wireguard: "WireGuard",
};

const surface = {
  borderWidth: "1px",
  borderColor: "light-border",
  borderRadius: "16px",
  bg: "var(--app-surface)",
  boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.04)",
  _dark: { borderColor: "gray.700", bg: "gray.750", boxShadow: "none" },
} as const;

const Panel: FC<{ title: string; help?: string; children: ReactNode; right?: ReactNode }> = ({
  title,
  help,
  children,
  right,
}) => (
  <Box {...surface} p={{ base: 4, md: 5 }}>
    <HStack justifyContent="space-between" alignItems="flex-start">
      <Box>
        <Text fontWeight="semibold">{title}</Text>
        {help && (
          <Text fontSize="xs" color="gray.500" mt={0.5}>
            {help}
          </Text>
        )}
      </Box>
      {right}
    </HStack>
    <Box mt={4}>{children}</Box>
  </Box>
);

const Toggle: FC<{ label: string; help?: string; value: boolean; onChange: (v: boolean) => void }> = ({
  label,
  help,
  value,
  onChange,
}) => (
  <HStack justifyContent="space-between" spacing={3}>
    <Box>
      <Text fontSize="sm">{label}</Text>
      {help && (
        <Text fontSize="xs" color="gray.500">
          {help}
        </Text>
      )}
    </Box>
    <Switch colorScheme="primary" isChecked={value} onChange={(e) => onChange(e.target.checked)} />
  </HStack>
);

const Num: FC<{ value: number; min?: number; max?: number; onChange: (v: number) => void; placeholder?: string }> = ({
  value,
  min = 0,
  max,
  onChange,
  placeholder,
}) => (
  <NumberInput size="sm" min={min} max={max} value={value || ""} onChange={(_, n) => onChange(Number.isNaN(n) ? 0 : n)}>
    <NumberInputField placeholder={placeholder} />
  </NumberInput>
);

const GroupPicker: FC<{ all: string[]; value: string[]; onChange: (v: string[]) => void }> = ({ all, value, onChange }) => {
  const { t } = useTranslation();
  if (all.length === 0)
    return (
      <Text fontSize="xs" color="gray.500">
        {t("external.noGroups")}
      </Text>
    );
  return (
    <HStack spacing={1.5} flexWrap="wrap">
      {all.map((g) => {
        const on = value.includes(g);
        return (
          <Button
            key={g}
            size="xs"
            borderRadius="full"
            colorScheme="primary"
            variant={on ? "solid" : "outline"}
            onClick={() => onChange(on ? value.filter((x) => x !== g) : [...value, g])}
          >
            {g}
          </Button>
        );
      })}
    </HStack>
  );
};

const ConfigForm: FC<{ value: ExternalConfig; groups: string[] | null; onChange: (v: ExternalConfig) => void }> = ({
  value,
  groups,
  onChange,
}) => {
  const { t } = useTranslation();
  const set = (patch: Partial<ExternalConfig>) => onChange({ ...value, ...patch });
  const count = linkCount(value.links);
  const bad = value.kind === "links" && value.links.trim() !== "" && count === 0;
  const isSub = value.kind === "subscription";
  return (
    <VStack align="stretch" spacing={4}>
      <ButtonGroup size="sm" isAttached variant="outline" colorScheme="primary">
        <Button leftIcon={<CloudArrowDownIcon {...icon} />} variant={isSub ? "solid" : "outline"} onClick={() => set({ kind: "subscription" })}>
          {t("external.kindSub")}
        </Button>
        <Button leftIcon={<LinkIcon {...icon} />} variant={!isSub ? "solid" : "outline"} onClick={() => set({ kind: "links" })}>
          {t("external.kindLinks")}
        </Button>
      </ButtonGroup>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <FormControl>
          <FormLabel>{t("external.name")}</FormLabel>
          <Input size="sm" value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder={t("external.namePlaceholder")} />
        </FormControl>
        <FormControl>
          <FormLabel>{t("external.position")}</FormLabel>
          <Select size="sm" value={value.position} onChange={(e) => set({ position: e.target.value as any })}>
            <option value="top">{t("external.top")}</option>
            <option value="bottom">{t("external.bottom")}</option>
          </Select>
        </FormControl>
      </SimpleGrid>

      {isSub ? (
        <>
          <FormControl>
            <FormLabel>{t("external.url")}</FormLabel>
            <Input size="sm" fontFamily="mono" fontSize="xs" value={value.url} onChange={(e) => set({ url: e.target.value.trim() })} placeholder="https://example.com/sub/xxxx" />
          </FormControl>
          <SimpleGrid columns={{ base: 2, md: 3 }} spacing={3}>
            <FormControl>
              <FormLabel>{t("external.rangeFrom")}</FormLabel>
              <Num min={1} value={value.range_start} onChange={(n) => set({ range_start: Math.max(1, n) })} />
            </FormControl>
            <FormControl>
              <FormLabel>{t("external.rangeTo")}</FormLabel>
              <Num min={0} value={value.range_end} onChange={(n) => set({ range_end: n })} placeholder={t("external.rangeAll")} />
            </FormControl>
            <FormControl>
              <FormLabel>{t("external.rename")}</FormLabel>
              <Select size="sm" value={value.rename} onChange={(e) => set({ rename: e.target.value as any })}>
                <option value="country">🇩🇪 {t("external.renameCountry")}</option>
                <option value="country_city">🇩🇪 {t("external.renameCity")}</option>
                <option value="none">{t("external.renameNone")}</option>
              </Select>
            </FormControl>
          </SimpleGrid>
          <Text fontSize="xs" color="gray.500" mt={-2}>
            {t("external.rangeHelp")}
          </Text>
          {value.rename !== "none" && (
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              <Toggle label={t("external.wsRename")} help={t("external.wsRenameHelp")} value={value.ws_rename} onChange={(v) => set({ ws_rename: v })} />
              <FormControl isDisabled={!value.ws_rename}>
                <FormLabel>{t("external.wsLabel")}</FormLabel>
                <Input size="sm" maxLength={32} value={value.ws_label} onChange={(e) => set({ ws_label: e.target.value })} placeholder="4G/WiFi" />
              </FormControl>
            </SimpleGrid>
          )}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            <Toggle label={t("external.test")} help={t("external.testHelp")} value={value.test} onChange={(v) => set({ test: v })} />
            <FormControl isDisabled={!value.test}>
              <FormLabel>{t("external.testTimeout")}</FormLabel>
              <Num min={1} max={30} value={value.test_timeout} onChange={(n) => set({ test_timeout: Math.min(30, Math.max(1, n)) })} />
            </FormControl>
          </SimpleGrid>
          <FormControl>
            <FormLabel>{t("external.userAgent")}</FormLabel>
            <Input size="sm" value={value.user_agent} onChange={(e) => set({ user_agent: e.target.value })} placeholder="v2rayNG/1.8.5" />
          </FormControl>
        </>
      ) : (
        <FormControl isInvalid={bad}>
          <FormLabel>
            {t("external.links")}{" "}
            <Text as="span" fontSize="xs" color={bad ? "red.400" : "gray.500"} fontWeight="normal">
              · {bad ? t("external.invalid") : t("external.linkCount", { count })}
            </Text>
          </FormLabel>
          <Textarea size="sm" rows={4} fontFamily="mono" fontSize="xs" value={value.links} onChange={(e) => set({ links: e.target.value })} placeholder={"vless://...#My server\nss://...#Backup"} />
          <Text fontSize="xs" color="gray.500" mt={1}>
            {t("external.linksHelp")}
          </Text>
        </FormControl>
      )}

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <Toggle label={t("external.onlyActive")} help={t("external.onlyActiveHelp")} value={value.only_active} onChange={(v) => set({ only_active: v })} />
        {groups && <Box>
          <Text fontSize="sm" mb={1}>
            {t("external.groups")}
          </Text>
          <GroupPicker all={groups} value={value.groups} onChange={(g) => set({ groups: g })} />
          <Text fontSize="xs" color="gray.500" mt={1}>
            {t("external.groupsHelp")}
          </Text>
        </Box>}
      </SimpleGrid>

      {isSub && (
        <Box>
          <Text fontSize="sm" mb={1.5}>
            {t("external.refresh")}
          </Text>
          <RefreshInterval value={value.refresh_minutes} onChange={(m) => set({ refresh_minutes: m })} />
        </Box>
      )}
    </VStack>
  );
};

const REFRESH_PRESETS = [15, 30, 60, 180, 360, 720, 1440];
const REFRESH_UNITS = [
  { key: "minutes", factor: 1 },
  { key: "hours", factor: 60 },
  { key: "days", factor: 1440 },
];
const MAX_REFRESH_MINUTES = 43200;

// quick buttons for the common intervals, plus a free "every N minutes/hours/days" input
const RefreshInterval: FC<{ value: number; onChange: (minutes: number) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const bestUnit = (m: number) => [...REFRESH_UNITS].reverse().find((u) => m % u.factor === 0) || REFRESH_UNITS[0];
  const [unit, setUnit] = useState(() => bestUnit(value || 60));
  const [amount, setAmount] = useState(() => String((value || 60) / bestUnit(value || 60).factor));
  const [custom, setCustom] = useState(() => !REFRESH_PRESETS.includes(value));

  // keep the input in sync when the value changes from outside (preset click, form reset)
  useEffect(() => {
    if (Math.round(Number(amount) * unit.factor) === value) return;
    const u = bestUnit(value || 60);
    setUnit(u);
    setAmount(String((value || 60) / u.factor));
  }, [value]);

  const apply = (raw: string, u = unit) => {
    setAmount(raw);
    const n = Math.round(Number(raw) * u.factor);
    if (Number.isFinite(n) && n >= 1) onChange(Math.min(n, MAX_REFRESH_MINUTES));
  };

  return (
    <VStack align="stretch" spacing={2}>
      <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
        {REFRESH_PRESETS.map((m) => (
          <Button
            key={m}
            size="xs"
            borderRadius="full"
            colorScheme="primary"
            variant={!custom && value === m ? "solid" : "outline"}
            onClick={() => {
              setCustom(false);
              onChange(m);
            }}
          >
            {m < 60 ? t("external.minutes", { count: m }) : t("external.hours", { count: m / 60 })}
          </Button>
        ))}
        <Button
          size="xs"
          borderRadius="full"
          colorScheme="primary"
          variant={custom ? "solid" : "outline"}
          onClick={() => setCustom(true)}
        >
          {t("external.customInterval")}
        </Button>
      </HStack>
      {custom && (
        <HStack spacing={2} maxW="260px">
          <NumberInput size="sm" min={1} value={amount} onChange={(v) => apply(v)}>
            <NumberInputField borderRadius="md" />
          </NumberInput>
          <Select
            size="sm"
            borderRadius="md"
            value={unit.key}
            onChange={(e) => {
              const u = REFRESH_UNITS.find((x) => x.key === e.target.value)!;
              setUnit(u);
              apply(amount, u);
            }}
          >
            {REFRESH_UNITS.map((u) => (
              <option key={u.key} value={u.key}>
                {t(`external.unit.${u.key}`)}
              </option>
            ))}
          </Select>
        </HStack>
      )}
    </VStack>
  );
};

const canAdd = (c: ExternalConfig) =>
  c.kind === "subscription" ? /^https?:\/\/\S+$/.test(c.url) : linkCount(c.links) > 0;

const SourceResult: FC<{ status?: SourceStatus; saved: boolean; onRefresh: () => void }> = ({ status, saved, onRefresh }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const s = status?.stats || {};
  return (
    <Box mt={3}>
      <HStack spacing={2} flexWrap="wrap" rowGap={1.5}>
        {status?.running ? (
          <HStack spacing={1.5} fontSize="xs" color="primary.500">
            <Spinner size="xs" />
            <Text>{t("external.running")}</Text>
          </HStack>
        ) : status?.updated_at ? (
          <>
            <Badge variant="subtle">{t("external.fetched", { count: s.fetched || 0 })}</Badge>
            <Badge variant="subtle">{t("external.inRange", { count: s.in_range || 0 })}</Badge>
            <Badge colorScheme="green">{t("external.working", { count: s.working || 0 })}</Badge>
            <Text fontSize="xs" color="gray.500">
              {dayjs.unix(status.updated_at).fromNow()}
            </Text>
          </>
        ) : (
          <Text fontSize="xs" color="gray.500">
            {saved ? t("external.notFetched") : t("external.saveFirst")}
          </Text>
        )}
        <Box flex={1} />
        <Button size="xs" variant="ghost" leftIcon={<ArrowPathIcon width={14} height={14} />} isDisabled={!saved || status?.running} onClick={onRefresh}>
          {t("external.refreshNow")}
        </Button>
        {!!status?.items?.length && (
          <Button size="xs" variant="ghost" rightIcon={<ChevronDownIcon width={14} height={14} style={{ transform: open ? "rotate(180deg)" : undefined }} />} onClick={() => setOpen(!open)}>
            {t("external.showConfigs")}
          </Button>
        )}
      </HStack>
      {status?.error && (
        <Text fontSize="xs" color="red.400" mt={1}>
          {status.error}
        </Text>
      )}
      <Collapse in={open} animateOpacity unmountOnExit>
        <VStack align="stretch" spacing={1} mt={2} maxH="280px" overflowY="auto">
          {(status?.items || []).map((it, i) => (
            <HStack key={i} px={2.5} py={1.5} borderRadius="8px" bg="blackAlpha.50" _dark={{ bg: "whiteAlpha.50" }} fontSize="sm" spacing={2}>
              <Box flex={1} minW={0}>
                <Text isTruncated title={it.link}>
                  {it.name}
                </Text>
                {it.exit_ip && (
                  <Text fontSize="2xs" color="gray.500" isTruncated>
                    {t("external.exitIp", { ip: it.exit_ip })}
                  </Text>
                )}
              </Box>
              <Badge variant="outline" fontSize="2xs">
                {PROTOCOL_LABEL[it.kind || it.protocol] || it.kind || it.protocol}
              </Badge>
              {it.latency != null && (
                <Text fontSize="xs" color={it.latency < 400 ? "green.400" : it.latency < 1000 ? "orange.400" : "red.400"} w="56px" textAlign="right">
                  {it.latency} ms
                </Text>
              )}
            </HStack>
          ))}
        </VStack>
      </Collapse>
    </Box>
  );
};


const ConfigList: FC<{
  configs: ExternalConfig[];
  onChange: (v: ExternalConfig[]) => void;
  groups: string[] | null;
  statusOf: (id: string) => SourceStatus | undefined;
  savedIds: Set<string>;
  onRefresh: (id: string) => void;
}> = ({ configs, onChange, groups, statusOf, savedIds, onRefresh }) => {
  const { t } = useTranslation();
  const [editing, setEditing] = useState<string | null>(null);
  const setOne = (id: string, c: ExternalConfig) => onChange(configs.map((x) => (x.id === id ? c : x)));
  const move = (i: number, dir: -1 | 1) => {
    const list = [...configs];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    onChange(list);
  };
  const refreshSource = onRefresh;
  return (
          <VStack align="stretch" spacing={2}>
      {configs.length === 0 && (
        <Text fontSize="sm" color="gray.500">
          {t("external.empty")}
        </Text>
      )}
      {configs.map((c, i) => (
        <Box key={c.id} p={3} borderWidth="1px" borderColor="light-border" borderRadius="12px" bg="var(--app-surface-2)" _dark={{ borderColor: "gray.600", bg: "gray.800" }} opacity={c.enabled ? 1 : 0.6}>
          {editing === c.id ? (
            <>
              <ConfigForm value={c} groups={groups} onChange={(v) => setOne(c.id, v)} />
              <HStack justifyContent="flex-end" mt={3}>
                <Button size="sm" onClick={() => setEditing(null)}>
                  {t("external.done")}
                </Button>
              </HStack>
            </>
          ) : (
            <>
              <HStack spacing={2} alignItems="center">
                <VStack spacing={0}>
                  <IconButton size="xs" variant="ghost" aria-label="up" icon={<ArrowUpIcon {...icon} />} isDisabled={i === 0} onClick={() => move(i, -1)} />
                  <IconButton size="xs" variant="ghost" aria-label="down" icon={<ArrowDownIcon {...icon} />} isDisabled={i === configs.length - 1} onClick={() => move(i, 1)} />
                </VStack>
                <Box flex={1} minW={0}>
                  <HStack spacing={1.5}>
                    {c.kind === "subscription" ? <CloudArrowDownIcon width={16} height={16} /> : <LinkIcon width={16} height={16} />}
                    <Text fontWeight="medium" fontSize="sm" isTruncated>
                      {c.name || (c.kind === "subscription" ? c.url : t("external.unnamed"))}
                    </Text>
                  </HStack>
                  <HStack spacing={1.5} mt={1.5} flexWrap="wrap" rowGap={1}>
                    <Badge colorScheme={c.position === "top" ? "purple" : "primary"}>{c.position === "top" ? t("external.top") : t("external.bottom")}</Badge>
                    {c.kind === "subscription" ? (
                      <>
                        <Badge variant="outline">{c.range_end ? `${c.range_start}–${c.range_end}` : `${c.range_start}–∞`}</Badge>
                        {c.test && <Badge variant="outline" colorScheme="green">{t("external.testBadge")}</Badge>}
                        {c.rename !== "none" && <Badge variant="outline">{c.rename === "country" ? t("external.renameCountry") : t("external.renameCity")}</Badge>}
                      </>
                    ) : (
                      <Badge variant="outline">{t("external.linkCount", { count: linkCount(c.links) })}</Badge>
                    )}
                    {c.only_active && <Badge variant="subtle">{t("external.activeOnlyBadge")}</Badge>}
                    {c.groups.map((g) => (
                      <Badge key={g} variant="outline" colorScheme="orange">
                        {g}
                      </Badge>
                    ))}
                  </HStack>
                </Box>
                <Tooltip label={c.enabled ? t("external.enabled") : t("external.disabled")}>
                  <Box>
                    <Switch size="sm" colorScheme="primary" isChecked={c.enabled} onChange={(e) => setOne(c.id, { ...c, enabled: e.target.checked })} />
                  </Box>
                </Tooltip>
                <IconButton size="sm" variant="ghost" borderRadius="full" aria-label="edit" icon={<PencilSquareIcon {...icon} />} onClick={() => setEditing(c.id)} />
                <IconButton size="sm" variant="ghost" borderRadius="full" colorScheme="red" aria-label="delete" icon={<TrashIcon {...icon} />} onClick={() => onChange(configs.filter((x) => x.id !== c.id))} />
              </HStack>
              {c.kind === "subscription" && <SourceResult status={statusOf(c.id)} saved={savedIds.has(c.id)} onRefresh={() => refreshSource(c.id)} />}
            </>
          )}
        </Box>
      ))}
    </VStack>
  );
};

export const ExternalConfigsPage: FC = () => {
  const { userData, getUserIsSuccess } = useGetUser();
  if (!getUserIsSuccess) return null;
  return userData.is_sudo ? <SudoExternalPage /> : <OwnExternalPage />;
};

const emptyAdmin = (): AdminExternal => ({ enabled: true, label: "", self_edit: false, include_general: true, configs: [] });

const SudoExternalPage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  // "" = the general list, else one admin's own list
  const location = useLocation();
  const [scope, setScope] = useState(() => new URLSearchParams(location.search).get("admin") || "");
  const { data: adminNames } = useQuery<string[]>({
    queryKey: "admin-names",
    queryFn: () => fetch("/admins").then((list: any[]) => list.filter((a) => !a.is_sudo).map((a) => a.username)),
  });
  const { data: saved, refetch } = useQuery<ExternalSettings>({
    queryKey: "external-configs",
    queryFn: () => fetch("/external-configs"),
  });
  const { data: groupNames } = useQuery<string[]>({
    queryKey: "host-group-names",
    queryFn: () => fetch("/groups").then((d: any) => d.groups.map((g: any) => g.name)),
  });
  const { data: sources, refetch: refetchSources } = useQuery<SourceStatus[]>({
    queryKey: "external-sources",
    queryFn: () => fetch("/external-configs/sources"),
    refetchInterval: (d) => (d?.some((x) => x.running) ? 2500 : 30000),
  });
  const groups = groupNames || [];
  const statusOf = (id: string) => sources?.find((s) => s.id === id);

  const [draft, setDraft] = useState<ExternalSettings | null>(null);
  useEffect(() => {
    if (saved) setDraft(saved);
  }, [saved]);
  const [adding, setAdding] = useState<ExternalConfig>(empty());
  const [saving, setSaving] = useState(false);
  const [previewUser, setPreviewUser] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState("");

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const savedIds = new Set([
    ...(saved?.configs || []),
    ...Object.values(saved?.admins || {}).flatMap((a) => a.configs),
  ].map((c) => c.id));
  const anyRunning = sources?.some((s) => s.running);

  useEffect(() => {
    if (!draft) return;
    const h = setTimeout(() => {
      const q = previewUser.trim() ? `?username=${encodeURIComponent(previewUser.trim())}` : "";
      fetch(`/external-configs/preview${q}`, { method: "POST", body: draft })
        .then((p: Preview) => {
          setPreview(p);
          setPreviewError("");
        })
        .catch((e: any) => setPreviewError(e?.data?.detail || t("external.previewError")));
    }, 400);
    return () => clearTimeout(h);
  }, [draft, previewUser, sources]);

  if (!draft) return null;

  const update = (patch: Partial<ExternalSettings>) => setDraft({ ...draft, ...patch });
  const mine: AdminExternal = (scope && draft.admins?.[scope]) || emptyAdmin();
  const setMine = (patch: Partial<AdminExternal>) =>
    update({ admins: { ...(draft.admins || {}), [scope]: { ...mine, ...patch } } });
  const list = scope ? mine.configs : draft.configs;
  const setList = (configs: ExternalConfig[]) => (scope ? setMine({ configs }) : update({ configs }));
  const moveProtocol = (i: number, dir: -1 | 1) => {
    const list = [...draft.protocol_order];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    update({ protocol_order: list });
  };
  const add = () => {
    setList([...list, adding]);
    setAdding(empty(adding.kind));
  };
  const save = () => {
    setSaving(true);
    fetch("/external-configs", { method: "PUT", body: draft })
      .then(() => {
        toast({ status: "success", title: t("external.saved"), duration: 1500 });
        refetch();
        refetchSources();
      })
      .catch((e: any) => toast({ status: "error", title: t("external.saveError"), description: e?.data?.detail, duration: 4000 }))
      .finally(() => setSaving(false));
  };
  const refreshSource = (id: string) =>
    fetch(`/external-configs/sources/${id}/refresh`, { method: "POST" })
      .then(() => setTimeout(() => refetchSources(), 300))
      .catch((e: any) => toast({ status: "error", title: e?.data?.detail || "error", duration: 3000 }));

  return (
    <VStack align="stretch" spacing={4}>
      {dirty && (
        <HStack position="sticky" top={2} zIndex={5} p={2} pl={4} borderRadius="12px" bg="primary.500" color="white" justifyContent="space-between" boxShadow="lg">
          <Text fontSize="sm" fontWeight="medium">
            {t("external.unsaved")}
          </Text>
          <HStack>
            <Button size="sm" variant="ghost" color="white" _hover={{ bg: "whiteAlpha.200" }} onClick={() => setDraft(saved!)}>
              {t("external.discard")}
            </Button>
            <Button size="sm" bg="white" color="primary.600" _hover={{ bg: "whiteAlpha.900" }} isLoading={saving} onClick={save}>
              {t("external.save")}
            </Button>
          </HStack>
        </HStack>
      )}

      <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
        {["", ...(adminNames || [])].map((name) => (
          <Button
            key={name || "-"}
            size="sm"
            borderRadius="full"
            colorScheme="primary"
            variant={scope === name ? "solid" : "outline"}
            onClick={() => setScope(name)}
          >
            {name || t("external.scopeMine")}
            {name && draft.admins?.[name]?.configs?.length ? ` · ${draft.admins[name].configs.length}` : ""}
          </Button>
        ))}
      </HStack>

      {scope && (
        <Panel title={t("external.adminTitle", { name: scope })} help={t("external.adminHelp")}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <Toggle label={t("adminSub.includeGeneral")} help={t("adminSub.includeGeneralHelp")} value={mine.include_general !== false} onChange={(v) => setMine({ include_general: v })} />
            <Toggle label={t("external.adminEnabled")} value={mine.enabled} onChange={(v) => setMine({ enabled: v })} />
            <Toggle label={t("external.selfEdit")} help={t("external.selfEditHelp")} value={mine.self_edit} onChange={(v) => setMine({ self_edit: v })} />
            <FormControl>
              <FormLabel>{t("external.label")}</FormLabel>
              <HStack>
                <Input size="sm" maxLength={64} value={mine.label} onChange={(e) => setMine({ label: e.target.value })} placeholder={t("external.labelPlaceholder")} />
                <Button size="sm" variant="outline" onClick={() => setMine({ label: scope })}>
                  {t("external.useAdminName")}
                </Button>
              </HStack>
              <Text fontSize="xs" color="gray.500" mt={1}>
                {t("external.labelHelp")}
              </Text>
            </FormControl>
          </SimpleGrid>
        </Panel>
      )}

      {!scope && (
      <Panel title={t("external.sorting")} help={t("external.sortingHelp")}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
          <VStack align="stretch" spacing={3}>
            <FormControl>
              <FormLabel>{t("external.generatedSort")}</FormLabel>
              <Select size="sm" value={draft.generated_sort} onChange={(e) => update({ generated_sort: e.target.value })}>
                <option value="default">{t("external.sort.default")}</option>
                <option value="remark">{t("external.sort.remark")}</option>
                <option value="remark_desc">{t("external.sort.remark_desc")}</option>
                <option value="protocol">{t("external.sort.protocol")}</option>
                <option value="reverse">{t("external.sort.reverse")}</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>{t("external.externalSort")}</FormLabel>
              <Select size="sm" value={draft.external_sort} onChange={(e) => update({ external_sort: e.target.value })}>
                <option value="manual">{t("external.sort.manual")}</option>
                <option value="protocol">{t("external.sort.byProtocolOrder")}</option>
                <option value="name">{t("external.sort.name")}</option>
                <option value="name_desc">{t("external.sort.name_desc")}</option>
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel>{t("external.testUrl")}</FormLabel>
              <Input size="sm" fontFamily="mono" fontSize="xs" value={draft.test_url} onChange={(e) => update({ test_url: e.target.value.trim() })} />
            </FormControl>
          </VStack>
          <Box opacity={draft.external_sort === "protocol" || draft.generated_sort === "protocol" ? 1 : 0.5}>
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              {t("external.protocolOrder")}
            </Text>
            <Text fontSize="xs" color="gray.500" mb={2}>
              {t("external.protocolOrderHelp")}
            </Text>
            <VStack align="stretch" spacing={1}>
              {draft.protocol_order.map((p, i) => (
                <HStack key={p} px={3} py={1} borderRadius="8px" borderWidth="1px" borderColor="light-border" _dark={{ borderColor: "gray.600" }}>
                  <Text fontSize="xs" color="gray.500" w="16px">
                    {i + 1}
                  </Text>
                  <Text fontSize="sm" flex={1}>
                    {PROTOCOL_LABEL[p] || p}
                  </Text>
                  <IconButton size="xs" variant="ghost" aria-label="up" icon={<ArrowUpIcon width={14} height={14} />} isDisabled={i === 0} onClick={() => moveProtocol(i, -1)} />
                  <IconButton size="xs" variant="ghost" aria-label="down" icon={<ArrowDownIcon width={14} height={14} />} isDisabled={i === draft.protocol_order.length - 1} onClick={() => moveProtocol(i, 1)} />
                </HStack>
              ))}
            </VStack>
          </Box>
        </SimpleGrid>
      </Panel>
      )}

      <Panel title={t("external.add")} help={scope ? t("external.adminAddHelp", { name: scope }) : t("external.help")}>
        <ConfigForm value={adding} groups={scope ? null : groups} onChange={setAdding} />
        <HStack justifyContent="flex-end" mt={4}>
          <Button colorScheme="primary" leftIcon={<PlusIcon {...icon} />} isDisabled={!canAdd(adding)} onClick={add}>
            {t("external.addButton")}
          </Button>
        </HStack>
      </Panel>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4} alignItems="start">
        <Panel
          title={t("external.list")}
          help={draft.external_sort === "manual" ? t("external.listHelp") : t("external.listSortedHelp")}
          right={anyRunning ? <Spinner size="sm" color="primary.500" /> : undefined}
        >
          <ConfigList
            configs={list}
            onChange={setList}
            groups={scope ? null : groups}
            statusOf={statusOf}
            savedIds={savedIds}
            onRefresh={refreshSource}
          />
        </Panel>

        <Panel title={t("external.preview")} help={t("external.previewHelp")}>
          <Input size="sm" mb={3} placeholder={t("external.previewUser")} value={previewUser} onChange={(e) => setPreviewUser(e.target.value)} />
          {previewError && (
            <Text fontSize="xs" color="red.400" mb={2}>
              {previewError}
            </Text>
          )}
          {preview && (
            <VStack align="stretch" spacing={1}>
              <Text fontSize="xs" color="gray.500" mb={1}>
                {t("external.previewFor", { username: preview.username })}
              </Text>
              {preview.items.map((it, i) => (
                <HStack key={i} spacing={2} fontSize="sm">
                  <Text color="gray.500" w="26px" textAlign="right" flexShrink={0}>
                    {i + 1}.
                  </Text>
                  <Badge colorScheme={it.source === "admin" ? "purple" : it.source === "external" ? "orange" : "primary"} flexShrink={0}>
                    {it.source === "admin" ? t("external.adminBadge") : it.source === "external" ? t("external.ext") : t("external.own")}
                  </Badge>
                  <Text isTruncated title={it.link}>
                    {it.remark}
                  </Text>
                </HStack>
              ))}
              {preview.items.length === 0 && (
                <Text fontSize="xs" color="gray.500">
                  {t("external.previewEmpty")}
                </Text>
              )}
            </VStack>
          )}
          <Text fontSize="xs" color="gray.500" mt={3}>
            {t("external.formatsNote")}
          </Text>
        </Panel>
      </SimpleGrid>
    </VStack>
  );
};

type OwnExternal = { label: string; enabled: boolean; configs: ExternalConfig[] };

// an admin's own list (when the sudo admin allows it): its users get these below the general ones
const OwnExternalPage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: saved, refetch, isError } = useQuery<OwnExternal>({
    queryKey: "own-external",
    queryFn: () => fetch("/external-configs/mine"),
    retry: false,
  });
  const { data: sources, refetch: refetchSources } = useQuery<SourceStatus[]>({
    queryKey: "external-sources",
    queryFn: () => fetch("/external-configs/sources"),
    refetchInterval: (d) => (d?.some((x) => x.running) ? 2500 : 30000),
  });
  const [draft, setDraft] = useState<ExternalConfig[] | null>(null);
  const [adding, setAdding] = useState<ExternalConfig>(empty());
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (saved) setDraft(saved.configs);
  }, [saved]);
  if (isError)
    return (
      <Text fontSize="sm" color="gray.500">
        {t("external.notAllowed")}
      </Text>
    );
  if (!draft || !saved) return null;
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved.configs);
  const save = () => {
    setSaving(true);
    fetch("/external-configs/mine", { method: "PUT", body: { ...saved, configs: draft } })
      .then(() => {
        toast({ status: "success", title: t("external.saved"), duration: 1500 });
        refetch();
        refetchSources();
      })
      .catch((e: any) => toast({ status: "error", title: t("external.saveError"), description: e?.data?.detail, duration: 4000 }))
      .finally(() => setSaving(false));
  };
  const refreshSource = (id: string) =>
    fetch(`/external-configs/sources/${id}/refresh`, { method: "POST" })
      .then(() => setTimeout(() => refetchSources(), 300))
      .catch((e: any) => toast({ status: "error", title: e?.data?.detail || t("external.saveError"), duration: 3000 }));
  return (
    <VStack align="stretch" spacing={4}>
      {!saved.enabled && (
        <Text fontSize="sm" color="orange.400">
          {t("external.ownOff")}
        </Text>
      )}
      <Panel title={t("external.add")} help={t("external.ownHelp")}>
        <ConfigForm value={adding} groups={null} onChange={setAdding} />
        <HStack justifyContent="flex-end" mt={4}>
          <Button
            colorScheme="primary"
            leftIcon={<PlusIcon {...icon} />}
            isDisabled={!canAdd(adding)}
            onClick={() => {
              setDraft([...draft, adding]);
              setAdding(empty(adding.kind));
            }}
          >
            {t("external.addButton")}
          </Button>
        </HStack>
      </Panel>
      <Panel
        title={t("external.list")}
        help={t("external.listHelp")}
        right={
          <Button size="sm" colorScheme="primary" isDisabled={!dirty} isLoading={saving} onClick={save}>
            {t("external.save")}
          </Button>
        }
      >
        <ConfigList
          configs={draft}
          onChange={setDraft}
          groups={null}
          statusOf={(id) => sources?.find((x) => x.id === id)}
          savedIds={new Set(saved.configs.map((c) => c.id))}
          onRefresh={refreshSource}
        />
      </Panel>
    </VStack>
  );
};
