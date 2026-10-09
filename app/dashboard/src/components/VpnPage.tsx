// VPN services: AmneziaWG and OpenVPN per server (app/vpn). Each server runs
// the Alexen VPN agent; the panel pushes who may connect and reads traffic.
import { PageLoading } from "./PageLoading";
import {
  Box,
  Button,
  Code,
  Collapse,
  HStack,
  Icon,
  IconButton,
  Input,
  NumberInput,
  NumberInputField,
  Select,
  SimpleGrid,
  Switch,
  Text,
  Tooltip,
  useClipboard,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ClipboardIcon,
  ExclamationTriangleIcon,
  LockClosedIcon,
  ServerIcon,
  SignalSlashIcon,
  SparklesIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { FC, ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import { serverMessage } from "utils/serverMessage";

type AWG = { enabled: boolean; address: string; port: number; subnet: string; mtu: number; dns: string[]; keepalive: number; params: Record<string, number> };
type OVPN = { enabled: boolean; address: string; port: number; proto: string; subnet: string; dns: string[] };
type ServerState = {
  connected?: boolean;
  error?: string;
  version?: string;
  online?: number;
  awg?: { running: boolean; peers: number };
  ovpn?: { running: boolean; clients: number };
};
type Server = {
  key: string;
  name: string;
  agent_port: number;
  agent_address: string;
  public_address: string;
  default_agent_address: string;
  default_public_address: string;
  pinned: boolean;
  awg: AWG;
  ovpn: OVPN;
  state: ServerState;
  warnings: string[];
  sessions: { username: string; ips: { ip: string; tag: string; last_seen: number }[] }[];
};
type Form = Pick<Server, "agent_port" | "agent_address" | "public_address" | "awg" | "ovpn">;

const card = {
  borderRadius: "20px",
  bg: "var(--app-surface)",
  boxShadow: "var(--alexen-shadow)",
  borderWidth: "1px",
  borderColor: "blackAlpha.50",
  _dark: { bg: "gray.750", borderColor: "var(--alexen-line)" },
} as const;
const soft = { borderRadius: "14px", bg: "blackAlpha.50", _dark: { bg: "whiteAlpha.50" } } as const;
const PARAMS: [string, string][] = [
  ["jc", "Jc"], ["jmin", "Jmin"], ["jmax", "Jmax"], ["s1", "S1"], ["s2", "S2"],
  ["h1", "H1"], ["h2", "H2"], ["h3", "H3"], ["h4", "H4"],
];

const F: FC<{ label: string; children: ReactNode; help?: string }> = ({ label, children, help }) => (
  <Box>
    <Text fontSize="xs" color="gray.500" mb={1}>
      {label}
    </Text>
    {children}
    {help && (
      <Text fontSize="xs" color="gray.500" mt={1}>
        {help}
      </Text>
    )}
  </Box>
);

const Num: FC<{ value: number; onChange: (n: number) => void; min?: number; max?: number }> = ({ value, onChange, min = 0, max }) => (
  <NumberInput size="sm" min={min} max={max} value={value} onChange={(_, n) => onChange(Number.isNaN(n) ? min : n)}>
    <NumberInputField borderRadius="10px" fontFamily="mono" />
  </NumberInput>
);

const Status: FC<{ s: Server }> = ({ s }) => {
  const { t } = useTranslation();
  const st = s.state || {};
  const on = s.awg.enabled || s.ovpn.enabled;
  let tone = "gray";
  let icon: any = SignalSlashIcon;
  let label = t("vpn.off");
  if (st.connected) {
    tone = st.error ? "orange" : "green";
    icon = st.error ? ExclamationTriangleIcon : CheckCircleIcon;
    label = t("vpn.agentOk", { version: st.version || "" });
  } else if (on || st.error) {
    tone = "red";
    icon = SignalSlashIcon;
    label = t("vpn.agentDown");
  }
  return (
    <HStack
      spacing={1.5}
      px={2.5}
      h="24px"
      borderRadius="full"
      fontSize="xs"
      fontWeight="medium"
      color={`${tone}.500`}
      sx={{ background: `color-mix(in srgb, var(--chakra-colors-${tone}-500) 14%, transparent)` }}
      whiteSpace="nowrap"
    >
      <Icon as={icon} boxSize="14px" />
      <Text as="span">{label}</Text>
    </HStack>
  );
};

const Install: FC<{ s: Server }> = ({ s }) => {
  const { t } = useTranslation();
  const { data } = useQuery<{ command: string }>({ queryKey: "vpn-install", queryFn: () => fetch("/vpn/install") });
  const command = data ? data.command + (s.agent_port !== 62060 ? ` ${s.agent_port}` : "") : "";
  const { onCopy, hasCopied, setValue } = useClipboard("");
  useEffect(() => setValue(command), [command]);
  return (
    <Box {...soft} p={4}>
      <Text fontSize="sm" fontWeight="medium" mb={1}>
        {t("vpn.installTitle")}
      </Text>
      <Text fontSize="xs" color="gray.500" mb={3}>
        {s.key === "master" ? t("vpn.installMaster") : t("vpn.installNode", { address: s.default_agent_address || "?" })}
      </Text>
      <HStack align="flex-start">
        <Code fontSize="xs" p={3} borderRadius="10px" flex="1" whiteSpace="pre-wrap" wordBreak="break-all" maxH="110px" overflowY="auto">
          {command || "…"}
        </Code>
        <Tooltip label={hasCopied ? t("domain.copied") : t("domain.copy")} hasArrow>
          <IconButton size="sm" aria-label="copy" icon={hasCopied ? <CheckIcon width={16} /> : <ClipboardIcon width={16} />} onClick={onCopy} />
        </Tooltip>
      </HStack>
      <Text fontSize="xs" color="gray.500" mt={2}>
        {t("vpn.installAfter", { port: s.agent_port })}
      </Text>
    </Box>
  );
};

const ServerCard: FC<{ s: Server; onSaved: () => void }> = ({ s, onSaved }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const initial = (): Form => ({
    agent_port: s.agent_port,
    agent_address: s.agent_address,
    public_address: s.public_address,
    awg: s.awg,
    ovpn: s.ovpn,
  });
  const [form, setForm] = useState<Form>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConn, setShowConn] = useState(false);
  const [showObf, setShowObf] = useState(false);
  useEffect(() => {
    if (!dirty) setForm(initial());
  }, [s]);
  const set = (p: Partial<Form>) => {
    setForm((f) => ({ ...f, ...p }));
    setDirty(true);
  };
  const setAwg = (p: Partial<AWG>) => set({ awg: { ...form.awg, ...p } });
  const setOvpn = (p: Partial<OVPN>) => set({ ovpn: { ...form.ovpn, ...p } });
  const st = s.state || {};
  const fail = (e: any) =>
    toast({ title: serverMessage(t, e?.response?._data?.detail) || e?.message || t("errors.generic"), status: "error", position: "top", duration: 4500 });
  const save = () => {
    setSaving(true);
    fetch(`/vpn/servers/${s.key}`, { method: "PUT", body: form })
      .then(() => {
        setDirty(false);
        onSaved();
        toast({ title: t("vpn.saved"), status: "success", position: "top", duration: 2500 });
      })
      .catch(fail)
      .finally(() => setSaving(false));
  };
  const randomize = () =>
    fetch(`/vpn/servers/${s.key}/new-awg-params`, { method: "POST" }).then((p: any) => {
      setAwg({ params: p });
      setShowObf(true);
    });
  const resetPin = () =>
    fetch(`/vpn/servers/${s.key}/reset-pin`, { method: "POST" }).then(() => {
      onSaved();
      toast({ title: t("vpn.pinReset"), status: "info", position: "top", duration: 2500 });
    });
  const dns = (v: string) => v.split(/[\s,]+/).filter(Boolean);

  return (
    <Box {...card} p={{ base: 4, md: 5 }}>
      <HStack spacing={3} mb={4} flexWrap="wrap" rowGap={2}>
        <Box
          w="36px"
          h="36px"
          borderRadius="12px"
          display="flex"
          alignItems="center"
          justifyContent="center"
          color="primary.500"
          sx={{ background: "color-mix(in srgb, var(--chakra-colors-primary-500) 13%, transparent)" }}
        >
          <Icon as={ServerIcon} boxSize="18px" />
        </Box>
        <Box flex="1" minW="160px">
          <Text fontWeight="semibold">{s.name}</Text>
          <Text fontSize="xs" color="gray.500">
            {form.public_address || s.default_public_address || "—"}
          </Text>
        </Box>
        {st.connected && (
          <HStack spacing={1} fontSize="xs" color="gray.500">
            <Icon as={UsersIcon} boxSize="14px" />
            <Text>{t("vpn.online", { n: st.online || 0 })}</Text>
          </HStack>
        )}
        <Status s={s} />
      </HStack>

      {st.error && (
        <HStack {...soft} p={3} mb={4} spacing={2} align="flex-start" color="orange.400">
          <Icon as={ExclamationTriangleIcon} boxSize="16px" mt={0.5} flexShrink={0} />
          <Text fontSize="xs">{serverMessage(t, st.error)}</Text>
        </HStack>
      )}
      {s.warnings.map((w) => (
        <HStack key={w} {...soft} p={3} mb={3} spacing={2} align="flex-start" color="orange.400">
          <Icon as={ExclamationTriangleIcon} boxSize="16px" mt={0.5} flexShrink={0} />
          <Text fontSize="xs">{w}</Text>
        </HStack>
      ))}

      {!st.connected && (form.awg.enabled || form.ovpn.enabled || s.key !== "master") && (
        <Box mb={4}>
          <Install s={s} />
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
        {/* AmneziaWG */}
        <Box {...soft} p={4}>
          <HStack mb={3}>
            <Switch colorScheme="primary" isChecked={form.awg.enabled} onChange={(e) => setAwg({ enabled: e.target.checked })} />
            <Text fontWeight="semibold" flex="1">
              AmneziaWG
            </Text>
            {st.awg?.running && (
              <Text fontSize="xs" color="green.400">
                {t("vpn.peers", { n: st.awg.peers })}
              </Text>
            )}
          </HStack>
          <SimpleGrid columns={3} spacing={3}>
            <F label={t("vpn.port") + " (UDP)"}>
              <Num value={form.awg.port} min={1} max={65535} onChange={(port) => setAwg({ port })} />
            </F>
            <F label="MTU">
              <Num value={form.awg.mtu} min={1200} max={1500} onChange={(mtu) => setAwg({ mtu })} />
            </F>
            <F label="Keepalive">
              <Num value={form.awg.keepalive} min={0} max={300} onChange={(keepalive) => setAwg({ keepalive })} />
            </F>
          </SimpleGrid>
          <SimpleGrid columns={2} spacing={3} mt={3}>
            <F label={t("vpn.subnet")}>
              <Input size="sm" borderRadius="10px" fontFamily="mono" value={form.awg.subnet} onChange={(e) => setAwg({ subnet: e.target.value })} />
            </F>
            <F label="DNS">
              <Input
                size="sm"
                borderRadius="10px"
                fontFamily="mono"
                value={form.awg.dns.join(", ")}
                onChange={(e) => setAwg({ dns: dns(e.target.value) })}
              />
            </F>
          </SimpleGrid>
          <Box mt={3}>
            <F label={t("vpn.serviceAddress")}>
              <Input
                size="sm"
                borderRadius="10px"
                fontFamily="mono"
                placeholder={form.public_address || s.default_public_address}
                value={form.awg.address}
                onChange={(e) => setAwg({ address: e.target.value.trim() })}
              />
            </F>
          </Box>
          <HStack mt={3} spacing={2}>
            <Button size="xs" variant="ghost" rightIcon={<ChevronDownIcon width={14} />} onClick={() => setShowObf((o) => !o)}>
              {t("vpn.obfuscation")}
            </Button>
            <Tooltip label={t("vpn.randomizeHelp")} hasArrow>
              <Button size="xs" variant="ghost" leftIcon={<SparklesIcon width={14} />} onClick={randomize}>
                {t("vpn.randomize")}
              </Button>
            </Tooltip>
          </HStack>
          <Collapse in={showObf} animateOpacity>
            <SimpleGrid columns={{ base: 3, md: 5 }} spacing={2} mt={2}>
              {PARAMS.map(([k, label]) => (
                <F key={k} label={label}>
                  <Num value={form.awg.params[k] ?? 0} onChange={(n) => setAwg({ params: { ...form.awg.params, [k]: n } })} />
                </F>
              ))}
            </SimpleGrid>
            <Text fontSize="xs" color="gray.500" mt={2}>
              {t("vpn.obfuscationHelp")}
            </Text>
          </Collapse>
        </Box>

        {/* OpenVPN */}
        <Box {...soft} p={4}>
          <HStack mb={3}>
            <Switch colorScheme="primary" isChecked={form.ovpn.enabled} onChange={(e) => setOvpn({ enabled: e.target.checked })} />
            <Text fontWeight="semibold" flex="1">
              OpenVPN
            </Text>
            {st.ovpn?.running && (
              <Text fontSize="xs" color="green.400">
                {t("vpn.clients", { n: st.ovpn.clients })}
              </Text>
            )}
          </HStack>
          <SimpleGrid columns={2} spacing={3}>
            <F label={t("vpn.port")}>
              <Num value={form.ovpn.port} min={1} max={65535} onChange={(port) => setOvpn({ port })} />
            </F>
            <F label={t("vpn.protocol")}>
              <Select size="sm" borderRadius="10px" value={form.ovpn.proto} onChange={(e) => setOvpn({ proto: e.target.value })}>
                <option value="udp">UDP</option>
                <option value="tcp">TCP</option>
              </Select>
            </F>
            <F label={t("vpn.subnet")}>
              <Input size="sm" borderRadius="10px" fontFamily="mono" value={form.ovpn.subnet} onChange={(e) => setOvpn({ subnet: e.target.value })} />
            </F>
            <F label="DNS">
              <Input
                size="sm"
                borderRadius="10px"
                fontFamily="mono"
                value={form.ovpn.dns.join(", ")}
                onChange={(e) => setOvpn({ dns: dns(e.target.value) })}
              />
            </F>
          </SimpleGrid>
          <Box mt={3}>
            <F label={t("vpn.serviceAddress")}>
              <Input
                size="sm"
                borderRadius="10px"
                fontFamily="mono"
                placeholder={form.public_address || s.default_public_address}
                value={form.ovpn.address}
                onChange={(e) => setOvpn({ address: e.target.value.trim() })}
              />
            </F>
          </Box>
          {form.ovpn.proto === "udp" && (
            <Text fontSize="xs" color="gray.500" mt={2}>
              {t("vpn.tcpHint")}
            </Text>
          )}
          <HStack mt={3} spacing={2} color="gray.500" fontSize="xs">
            <Icon as={LockClosedIcon} boxSize="14px" />
            <Text>{t("vpn.ovpnHelp")}</Text>
          </HStack>
        </Box>
      </SimpleGrid>

      {(s.sessions || []).length > 0 && (
        <Box {...soft} p={4} mt={4}>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            {t("vpn.connected", { n: s.sessions.length })}
          </Text>
          <VStack align="stretch" spacing={1.5}>
            {s.sessions.map((x) => (
              <HStack key={x.username} spacing={3} fontSize="sm" flexWrap="wrap" rowGap={1}>
                <Text fontWeight="medium" minW="120px">
                  {x.username}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  {t("vpn.ipCount", { n: new Set(x.ips.map((i) => i.ip)).size })}
                </Text>
                {x.ips.map((i) => (
                  <HStack
                    key={i.ip + i.tag}
                    spacing={1.5}
                    px={2}
                    h="22px"
                    borderRadius="full"
                    fontSize="xs"
                    fontFamily="mono"
                    bg="blackAlpha.100"
                    _dark={{ bg: "whiteAlpha.100" }}
                  >
                    <Text as="span">{i.ip}</Text>
                    <Text as="span" color="primary.400" fontFamily="body">
                      {i.tag}
                    </Text>
                  </HStack>
                ))}
              </HStack>
            ))}
          </VStack>
        </Box>
      )}

      <Button size="xs" variant="ghost" mt={3} rightIcon={<ChevronDownIcon width={14} />} onClick={() => setShowConn((o) => !o)}>
        {t("vpn.connection")}
      </Button>
      <Collapse in={showConn} animateOpacity>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mt={2}>
          <F label={t("vpn.publicAddress")} help={t("vpn.publicAddressHelp")}>
            <Input
              size="sm"
              borderRadius="10px"
              fontFamily="mono"
              placeholder={s.default_public_address}
              value={form.public_address}
              onChange={(e) => set({ public_address: e.target.value })}
            />
          </F>
          <F label={t("vpn.agentAddress")}>
            <Input
              size="sm"
              borderRadius="10px"
              fontFamily="mono"
              placeholder={s.default_agent_address}
              value={form.agent_address}
              onChange={(e) => set({ agent_address: e.target.value })}
            />
          </F>
          <F label={t("vpn.agentPort")}>
            <Num value={form.agent_port} min={1} max={65535} onChange={(agent_port) => set({ agent_port })} />
          </F>
        </SimpleGrid>
        {s.pinned && (
          <Button size="xs" variant="ghost" mt={2} leftIcon={<ArrowPathIcon width={14} />} onClick={resetPin}>
            {t("vpn.resetPin")}
          </Button>
        )}
      </Collapse>

      <HStack justify="flex-end" mt={3}>
        {dirty && (
          <Text fontSize="xs" color="orange.400">
            {t("autoChange.unsaved")}
          </Text>
        )}
        <Button colorScheme="primary" size="sm" isLoading={saving} isDisabled={!dirty} onClick={save}>
          {t("vpn.save")}
        </Button>
      </HStack>
    </Box>
  );
};

const Devices: FC<{ value: number; max: number; onSaved: () => void }> = ({ value, max, onSaved }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [n, setN] = useState(value);
  useEffect(() => setN(value), [value]);
  const save = () =>
    fetch("/vpn/devices", { method: "PUT", body: { awg_devices: n } })
      .then(() => {
        onSaved();
        toast({ title: t("vpn.saved"), status: "success", position: "top", duration: 2000 });
      })
      .catch((e: any) => toast({ title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic"), status: "error", position: "top" }));
  return (
    <HStack {...card} p={4} spacing={4} flexWrap="wrap" rowGap={3}>
      <Box flex="1" minW="240px">
        <Text fontSize="sm" fontWeight="medium">
          {t("vpn.devices")}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {t("vpn.devicesHelp", { max })}
        </Text>
      </Box>
      <Box w="90px">
        <Num value={n} min={1} max={max} onChange={setN} />
      </Box>
      <Button size="sm" colorScheme="primary" isDisabled={n === value} onClick={save}>
        {t("vpn.save")}
      </Button>
    </HStack>
  );
};

export const VpnPage: FC = () => {
  const { t } = useTranslation();
  const { data, refetch } = useQuery<{ servers: Server[]; awg_devices: number; max_devices: number }>({
    queryKey: "vpn",
    queryFn: () => fetch("/vpn"),
    refetchInterval: 10000,
  });
  if (!data) return <PageLoading rows={3} />;
  return (
    <VStack align="stretch" spacing={5} maxW="1100px">
      <Text fontSize="sm" color="gray.500" maxW="820px">
        {t("vpn.help")}
      </Text>
      <Devices value={data.awg_devices} max={data.max_devices} onSaved={() => refetch()} />
      {data.servers.map((s) => (
        <ServerCard key={s.key} s={s} onSaved={() => refetch()} />
      ))}
    </VStack>
  );
};

/** AmneziaWG / OpenVPN switches inside the node dialog. With a nodeKey they
 *  save at once; without one (a node being added) the parent keeps the choice
 *  and applies it once the node exists (applyNodeVpn). */
export const NodeVpnToggles: FC<{
  nodeKey?: string;
  value?: { awg: boolean; ovpn: boolean };
  onChange?: (v: { awg: boolean; ovpn: boolean }) => void;
}> = ({ nodeKey, value, onChange }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, refetch } = useQuery<{ servers: Server[] }>({
    queryKey: "vpn",
    queryFn: () => fetch("/vpn"),
    enabled: !!nodeKey,
  });
  const s = nodeKey ? data?.servers.find((x) => x.key === nodeKey) : undefined;
  const [busy, setBusy] = useState("");
  const on = nodeKey ? { awg: !!s?.awg.enabled, ovpn: !!s?.ovpn.enabled } : value || { awg: false, ovpn: false };
  const toggle = (kind: "awg" | "ovpn", v: boolean) => {
    if (!nodeKey) return onChange?.({ ...on, [kind]: v });
    if (!s) return;
    setBusy(kind);
    applyNodeVpn(nodeKey, { ...on, [kind]: v }, s)
      .then(() => refetch())
      .catch((e: any) => toast({ title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic"), status: "error", position: "top" }))
      .finally(() => setBusy(""));
  };
  return (
    <Box w="full" {...soft} p={3}>
      <HStack mb={2}>
        <Icon as={LockClosedIcon} boxSize="14px" color="primary.500" />
        <Text fontSize="sm" fontWeight="medium" flex="1">
          {t("vpn.title")}
        </Text>
        {s && <Status s={s} />}
      </HStack>
      <HStack spacing={6} flexWrap="wrap" rowGap={2}>
        <HStack>
          <Switch size="sm" colorScheme="primary" isChecked={on.awg} isDisabled={busy === "awg"} onChange={(e) => toggle("awg", e.target.checked)} />
          <Text fontSize="sm">AmneziaWG</Text>
        </HStack>
        <HStack>
          <Switch size="sm" colorScheme="primary" isChecked={on.ovpn} isDisabled={busy === "ovpn"} onChange={(e) => toggle("ovpn", e.target.checked)} />
          <Text fontSize="sm">OpenVPN</Text>
        </HStack>
      </HStack>
      <Text fontSize="xs" color="gray.500" mt={2}>
        {t("vpn.nodeHelp")}{" "}
        <Text as="a" href="#/vpn/" color="primary.500">
          {t("vpn.openPage")}
        </Text>
      </Text>
    </Box>
  );
};

/** turn a server's services on/off, keeping the rest of its settings */
export const applyNodeVpn = async (key: string, on: { awg: boolean; ovpn: boolean }, current?: Server) => {
  let s = current;
  if (!s) {
    const all: { servers: Server[] } = await fetch("/vpn");
    s = all.servers.find((x) => x.key === key);
  }
  if (!s) throw new Error("server not found");
  return fetch(`/vpn/servers/${key}`, {
    method: "PUT",
    body: {
      agent_port: s.agent_port,
      agent_address: s.agent_address,
      public_address: s.public_address,
      awg: { ...s.awg, enabled: on.awg },
      ovpn: { ...s.ovpn, enabled: on.ovpn },
    },
  });
};
