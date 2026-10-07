// Preroute: rules "relay VPS port -> exit VPS port" (app/vpn/preroute.py).
// A diagram on top shows every rule; below, each rule can be edited.
import {
  Box,
  Button,
  Collapse,
  HStack,
  Icon,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Switch,
  Text,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowLongRightIcon,
  ChevronDownIcon,
  ExclamationTriangleIcon,
  GlobeAltIcon,
  LockClosedIcon,
  PlusIcon,
  ServerIcon,
  TrashIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { FC, ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import { formatBytes } from "utils/formatByte";

type Proto = "tcp" | "udp" | "both";
type Fwd = { proto: Proto; port: number; to_port?: number | null };
type Inbound = { tag: string; port: number; protocol: string; proto: "tcp" | "udp" };
type Server = {
  key: string;
  name: string;
  address: string;
  role: "" | "relay" | "exit";
  agent: { connected?: boolean | null; version: string; error: string };
  inbounds: Inbound[];
};
type Tunnel = {
  id: number;
  relay: string;
  exit: string;
  kind: "wg" | "awg";
  port: number;
  mtu: number;
  all_ports: boolean;
  forwards: Fwd[];
  forwarding: Fwd[];
  handshake: number;
  rx: number;
  tx: number;
};
type Data = { servers: Server[]; tunnels: Tunnel[] };
type Draft = { relay: string; exit: string; kind: "wg" | "awg"; all_ports: boolean; forwards: Fwd[] };

const card = {
  borderRadius: "20px",
  bg: "var(--app-surface)",
  boxShadow: "var(--alexen-shadow)",
  borderWidth: "1px",
  borderColor: "blackAlpha.50",
  _dark: { bg: "gray.750", borderColor: "var(--alexen-line)" },
} as const;
const soft = { borderRadius: "14px", bg: "blackAlpha.50", _dark: { bg: "whiteAlpha.50" } } as const;
const tint = (c: string, p = 13) => ({ background: `color-mix(in srgb, var(--chakra-colors-${c}-500) ${p}%, transparent)` });

const linkUp = (t: Tunnel) => !!t.handshake && Date.now() / 1000 - t.handshake < 180;
const portText = (f: Fwd) => {
  const to = f.to_port || f.port;
  const p = f.proto === "both" ? "" : ` ${f.proto}`;
  return to === f.port ? `${f.port}${p}` : `${f.port} → ${to}${p}`;
};

/** one box of the diagram */
const Node: FC<{ icon: any; title: string; sub?: string; tone?: string; children?: ReactNode }> = ({ icon, title, sub, tone = "primary", children }) => (
  <VStack {...soft} spacing={1} px={4} py={3} minW="150px" maxW="230px" align="center" textAlign="center">
    <Box w="36px" h="36px" borderRadius="12px" display="flex" alignItems="center" justifyContent="center" color={`${tone}.500`} sx={tint(tone)}>
      <Icon as={icon} boxSize="18px" />
    </Box>
    <Text fontSize="sm" fontWeight="semibold" noOfLines={1}>
      {title}
    </Text>
    {sub && (
      <Text fontSize="xs" color="gray.500" fontFamily="mono" noOfLines={1} title={sub}>
        {sub}
      </Text>
    )}
    {children}
  </VStack>
);

/** a line with an arrow and something on it */
const Wire: FC<{ tone: string; children?: ReactNode; dashed?: boolean }> = ({ tone, children, dashed }) => (
  <VStack flex="1" minW={{ base: "auto", md: "90px" }} spacing={1} align="stretch" py={{ base: 1, md: 0 }}>
    <Box display={{ base: "none", md: "flex" }} alignItems="center">
      <Box flex="1" borderTopWidth="2px" borderStyle={dashed ? "dashed" : "solid"} borderColor={`${tone}.400`} />
      <Icon as={ArrowLongRightIcon} boxSize="18px" color={`${tone}.400`} ml="-4px" />
    </Box>
    <Box display={{ base: "flex", md: "none" }} justifyContent="center">
      <Box h="18px" borderLeftWidth="2px" borderStyle={dashed ? "dashed" : "solid"} borderColor={`${tone}.400`} />
    </Box>
    <Box textAlign="center">{children}</Box>
  </VStack>
);

const Dot: FC<{ ok?: boolean | null }> = ({ ok }) => (
  <Box w="8px" h="8px" borderRadius="full" bg={ok ? "green.400" : ok === false ? "red.400" : "gray.400"} />
);

const Diagram: FC<{ data: Data }> = ({ data }) => {
  const { t } = useTranslation();
  const by = (k: string) => data.servers.find((s) => s.key === k);
  if (!data.tunnels.length)
    return (
      <VStack {...card} py={10} spacing={3} color="gray.500">
        <Icon as={ArrowLongRightIcon} boxSize="28px" />
        <Text fontSize="sm" textAlign="center" maxW="420px">
          {t("preroutePage.empty")}
        </Text>
      </VStack>
    );
  return (
    <VStack {...card} p={{ base: 4, md: 6 }} spacing={5} align="stretch">
      {data.tunnels.map((tn) => {
        const r = by(tn.relay);
        const e = by(tn.exit);
        const up = linkUp(tn);
        const tone = up ? "green" : "orange";
        return (
          <Box key={tn.id}>
            <Box display="flex" flexDirection={{ base: "column", md: "row" }} alignItems="center">
              <Node icon={UsersIcon} title={t("preroutePage.users")} tone="gray" />
              <Wire tone="primary">
                <HStack spacing={1} justify="center" flexWrap="wrap" rowGap={1}>
                  {tn.forwarding.slice(0, 8).map((f) => (
                    <Text key={`${f.proto}${f.port}`} fontSize="10px" fontFamily="mono" px={1.5} borderRadius="6px" sx={tint("primary", 14)} color="primary.500" _dark={{ color: "primary.200" }}>
                      {f.port}
                    </Text>
                  ))}
                  {tn.forwarding.length > 8 && (
                    <Text fontSize="10px" color="gray.500">
                      +{tn.forwarding.length - 8}
                    </Text>
                  )}
                </HStack>
              </Wire>
              <Node icon={ServerIcon} title={r?.name || tn.relay} sub={r?.address}>
                <HStack spacing={1.5} fontSize="10px" color="gray.500">
                  <Dot ok={r?.agent.connected} />
                  <Text>{t("preroutePage.relay")}</Text>
                </HStack>
              </Node>
              <Wire tone={tone} dashed={!up}>
                <VStack spacing={0}>
                  <HStack spacing={1} fontSize="xs" fontWeight="medium" color={`${tone}.500`}>
                    <Icon as={LockClosedIcon} boxSize="12px" />
                    <Text>{tn.kind === "awg" ? "AmneziaWG" : "WireGuard"}</Text>
                  </HStack>
                  <Text fontSize="10px" color="gray.500" whiteSpace="nowrap">
                    {up ? `↓ ${formatBytes(tn.rx)} ↑ ${formatBytes(tn.tx)}` : t("preroutePage.linkDown")}
                  </Text>
                </VStack>
              </Wire>
              <Node icon={GlobeAltIcon} title={e?.name || tn.exit} sub={e?.address} tone="green">
                <HStack spacing={1.5} fontSize="10px" color="gray.500">
                  <Dot ok={e?.agent.connected} />
                  <Text>{t("preroutePage.exit")}</Text>
                </HStack>
              </Node>
            </Box>
            <HStack mt={3} spacing={1.5} flexWrap="wrap" rowGap={1.5} justify="center">
              {tn.forwarding.map((f) => (
                <Text key={`${f.proto}${f.port}m`} fontSize="xs" fontFamily="mono" px={2} py={0.5} borderRadius="8px" bg="blackAlpha.50" _dark={{ bg: "whiteAlpha.100" }}>
                  {r?.name}:{portText(f)} → {e?.name}
                </Text>
              ))}
            </HStack>
          </Box>
        );
      })}
    </VStack>
  );
};

const RuleEditor: FC<{ data: Data; tunnel?: Tunnel; onDone: () => void; startOpen?: boolean }> = ({ data, tunnel, onDone, startOpen }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const fresh = (): Draft => ({
    relay: tunnel?.relay || data.servers.find((s) => s.key !== "master")?.key || "",
    exit: tunnel?.exit || "master",
    kind: tunnel?.kind || "wg",
    all_ports: tunnel ? tunnel.all_ports : true,
    forwards: tunnel?.forwards?.map((f) => ({ ...f, to_port: f.to_port || f.port })) || [],
  });
  const [d, setD] = useState<Draft>(fresh);
  const [open, setOpen] = useState(!!startOpen);
  const [busy, setBusy] = useState(false);
  useEffect(() => setD(fresh()), [tunnel?.id, JSON.stringify(tunnel?.forwards), tunnel?.relay, tunnel?.exit, tunnel?.kind, tunnel?.all_ports]);
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }));
  const exitInbounds = data.servers.find((s) => s.key === d.exit)?.inbounds || [];
  const name = (k: string) => data.servers.find((s) => s.key === k)?.name || k;
  const fail = (e: any) => toast({ title: e?.response?._data?.detail || "Error", status: "error", position: "top", duration: 5000 });
  const save = () => {
    setBusy(true);
    fetch(`/preroute/tunnels/${tunnel ? tunnel.id : "new"}`, {
      method: "PUT",
      body: { ...d, forwards: d.all_ports ? [] : d.forwards.map((f) => ({ ...f, to_port: f.to_port || f.port })) },
    })
      .then(() => {
        toast({ title: t("preroutePage.saved"), status: "success", position: "top", duration: 3000 });
        onDone();
      })
      .catch(fail)
      .finally(() => setBusy(false));
  };
  const remove = () => {
    if (!tunnel || !window.confirm(t("preroutePage.confirmDelete"))) return;
    fetch(`/preroute/tunnels/${tunnel.id}`, { method: "DELETE" }).then(onDone).catch(fail);
  };
  const hosts = () =>
    tunnel &&
    fetch(`/preroute/tunnels/${tunnel.id}/hosts`, { method: "POST" })
      .then((r: any) => toast({ title: t("preroutePage.hostsMade", { n: r.created }), status: "success", position: "top" }))
      .catch(fail);
  const setFwd = (i: number, p: Partial<Fwd>) => set({ forwards: d.forwards.map((f, n) => (n === i ? { ...f, ...p } : f)) });
  const relayAgent = data.servers.find((s) => s.key === d.relay)?.agent;
  const exitAgent = data.servers.find((s) => s.key === d.exit)?.agent;

  return (
    <Box {...card} overflow="hidden">
      <HStack px={5} py={3.5} spacing={3} cursor="pointer" onClick={() => setOpen((o) => !o)}>
        <Text fontWeight="semibold" fontSize="sm" flex="1">
          {tunnel ? `${name(tunnel.relay)} → ${name(tunnel.exit)}` : t("preroutePage.newRule")}
        </Text>
        {tunnel && (
          <Text fontSize="xs" color={linkUp(tunnel) ? "green.400" : "orange.400"}>
            {linkUp(tunnel) ? t("preroutePage.linkUp") : t("preroutePage.linkDown")}
          </Text>
        )}
        <Icon as={ChevronDownIcon} boxSize="16px" transform={open ? "rotate(180deg)" : undefined} transition="transform .2s" />
      </HStack>
      <Collapse in={open} animateOpacity unmountOnExit>
        <VStack align="stretch" spacing={4} px={5} pb={5}>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                {t("preroutePage.relayVps")}
              </Text>
              <Select size="sm" borderRadius="10px" value={d.relay} onChange={(e) => set({ relay: e.target.value })}>
                {data.servers.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name} · {s.address}
                  </option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                {t("preroutePage.exitVps")}
              </Text>
              <Select size="sm" borderRadius="10px" value={d.exit} onChange={(e) => set({ exit: e.target.value })}>
                {data.servers
                  .filter((s) => s.key !== d.relay)
                  .map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name} · {s.address}
                    </option>
                  ))}
              </Select>
            </Box>
            <Box>
              <Text fontSize="xs" color="gray.500" mb={1}>
                {t("preroutePage.link")}
              </Text>
              <Select size="sm" borderRadius="10px" value={d.kind} onChange={(e) => set({ kind: e.target.value as any })}>
                <option value="wg">{t("preroute.kindWg")}</option>
                <option value="awg">{t("preroute.kindAwg")}</option>
              </Select>
            </Box>
          </SimpleGrid>

          <HStack {...soft} p={3} spacing={3}>
            <Switch size="sm" colorScheme="primary" isChecked={d.all_ports} onChange={(e) => set({ all_ports: e.target.checked })} />
            <Box>
              <Text fontSize="sm">{t("preroutePage.allPorts")}</Text>
              <Text fontSize="xs" color="gray.500">
                {t("preroutePage.allPortsHelp")}
              </Text>
            </Box>
          </HStack>

          {!d.all_ports && (
            <Box>
              <Text fontSize="xs" color="gray.500" mb={2}>
                {t("preroutePage.ports")}
              </Text>
              <VStack align="stretch" spacing={2}>
                {d.forwards.map((f, i) => (
                  <HStack key={i} spacing={2} flexWrap="wrap" rowGap={2}>
                    <Text fontSize="xs" color="gray.500" w="70px" isTruncated>
                      {name(d.relay)}
                    </Text>
                    <Input
                      size="sm"
                      w="90px"
                      borderRadius="10px"
                      fontFamily="mono"
                      value={f.port || ""}
                      onChange={(e) => setFwd(i, { port: Number(e.target.value.replace(/\D/g, "")) || 0 })}
                    />
                    <Select size="sm" w="90px" borderRadius="10px" value={f.proto} onChange={(e) => setFwd(i, { proto: e.target.value as Proto })}>
                      <option value="both">TCP+UDP</option>
                      <option value="tcp">TCP</option>
                      <option value="udp">UDP</option>
                    </Select>
                    <Icon as={ArrowLongRightIcon} boxSize="18px" color="gray.400" />
                    <Text fontSize="xs" color="gray.500" w="70px" isTruncated>
                      {name(d.exit)}
                    </Text>
                    <Input
                      size="sm"
                      w="90px"
                      borderRadius="10px"
                      fontFamily="mono"
                      value={f.to_port || ""}
                      onChange={(e) => setFwd(i, { to_port: Number(e.target.value.replace(/\D/g, "")) || null })}
                    />
                    <IconButton size="sm" variant="ghost" aria-label="remove" icon={<TrashIcon width={14} />} onClick={() => set({ forwards: d.forwards.filter((_, n) => n !== i) })} />
                  </HStack>
                ))}
                <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
                  <Button size="xs" variant="ghost" leftIcon={<PlusIcon width={12} />} onClick={() => set({ forwards: [...d.forwards, { proto: "both", port: 0, to_port: null }] })}>
                    {t("preroutePage.addPort")}
                  </Button>
                  {exitInbounds
                    .filter((ib) => !d.forwards.some((f) => (f.to_port || f.port) === ib.port))
                    .map((ib) => (
                      <Tooltip key={ib.tag + ib.port} label={`${ib.protocol} · ${ib.proto.toUpperCase()}`} hasArrow>
                        <Button size="xs" variant="outline" borderRadius="full" onClick={() => set({ forwards: [...d.forwards, { proto: ib.proto, port: ib.port, to_port: ib.port }] })}>
                          + {ib.tag} :{ib.port}
                        </Button>
                      </Tooltip>
                    ))}
                </HStack>
              </VStack>
            </Box>
          )}

          {(relayAgent?.connected === false || exitAgent?.connected === false || relayAgent?.connected == null || exitAgent?.connected == null) && (
            <HStack {...soft} p={3} spacing={2} align="flex-start" color="orange.400">
              <Icon as={ExclamationTriangleIcon} boxSize="16px" mt={0.5} flexShrink={0} />
              <Text fontSize="xs">
                {t("preroutePage.needAgent")}{" "}
                <Text as="a" href="#/vpn/" color="primary.500" textDecoration="underline">
                  {t("vpn.title")}
                </Text>
              </Text>
            </HStack>
          )}

          <HStack justify="space-between" flexWrap="wrap" rowGap={2}>
            <HStack>
              {tunnel && (
                <Button size="sm" variant="ghost" colorScheme="red" leftIcon={<TrashIcon width={14} />} onClick={remove}>
                  {t("preroutePage.delete")}
                </Button>
              )}
              {tunnel && (
                <Tooltip label={t("preroute.hostsHelp")} hasArrow>
                  <Button size="sm" variant="outline" onClick={hosts}>
                    {t("preroute.makeHosts")}
                  </Button>
                </Tooltip>
              )}
            </HStack>
            <Button size="sm" colorScheme="primary" isLoading={busy} onClick={save} isDisabled={!d.relay || !d.exit || d.relay === d.exit}>
              {t("preroutePage.save")}
            </Button>
          </HStack>
        </VStack>
      </Collapse>
    </Box>
  );
};

export const PreroutePage: FC = () => {
  const { t } = useTranslation();
  const { data, refetch } = useQuery<Data>({ queryKey: "preroute", queryFn: () => fetch("/preroute"), refetchInterval: 8000 });
  const [adding, setAdding] = useState(false);
  if (!data) return null;
  return (
    <VStack align="stretch" spacing={5} maxW="1150px">
      <HStack spacing={4} flexWrap="wrap" rowGap={3}>
        <Text fontSize="sm" color="gray.500" flex="1" minW="260px">
          {t("preroutePage.help")}
        </Text>
        <Button size="sm" colorScheme="primary" leftIcon={<PlusIcon width={16} />} onClick={() => setAdding(true)} isDisabled={adding}>
          {t("preroutePage.addRule")}
        </Button>
      </HStack>
      <Diagram data={data} />
      {adding && (
        <RuleEditor
          data={data}
          startOpen
          onDone={() => {
            setAdding(false);
            refetch();
          }}
        />
      )}
      {data.tunnels.map((tn) => (
        <RuleEditor key={tn.id} data={data} tunnel={tn} onDone={() => refetch()} />
      ))}
    </VStack>
  );
};
