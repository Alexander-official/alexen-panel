// Outbounds page: where each server's traffic leaves (direct, through another
// server, or through an outbound such as a relay), the core's outbounds with a
// delay / site test (from the panel or from a node) and their traffic, and the
// routing rules. The board is also the Outbounds tab of the core settings.
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  HStack,
  Icon,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Select,
  Spinner,
  Switch,
  Text,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowPathIcon,
  ArrowsRightLeftIcon,
  BoltIcon,
  DocumentDuplicateIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  PlusIcon,
  ServerStackIcon,
  StarIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { FC, ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";
import { flagEmoji } from "utils/flags";
import { formatBytes } from "utils/formatByte";
import { serverMessage } from "utils/serverMessage";
import { AddOutbound, JsonItemEditor, outboundSummary, RoutingEditor } from "./CoreEditors";

type Exit = { ip: string; country: string; cc: string; city: string } | null;
export type TestResult = { error: string; delay: number | null; connect: number | null; sites: (number | null)[]; exit: Exit; ok?: number; total?: number };
// some requests answered, some not: a shaky link, not a dead or blocked one
const unstable = (r: TestResult) => !!r.total && !!r.ok && r.ok < r.total;
type ChainServer = {
  key: string;
  name: string;
  flag: string;
  can_test: boolean;
  exit_tag: string;
  default_out: { tag: string; protocol: string };
  choices: { tag: string; kind: "outbound" | "balancer"; protocol: string }[];
  link: null | { exit: string; exit_name: string; port: number; address: string; default_address: string; sni: string };
  relays: string[];
};
type Traffic = { since: number; servers: Record<string, Record<string, { up: number; down: number }>> };

const card = { className: "alexen-page", borderRadius: "16px", borderWidth: "1px", p: { base: 3.5, md: 5 } } as const;
const clone = (v: any) => JSON.parse(JSON.stringify(v ?? {}));
const errText = (t: any, e: any) => serverMessage(t, e?.response?._data?.detail) || e?.message || t("errors.generic");

const PROTO_COLOR: Record<string, string> = {
  vless: "purple",
  vmess: "blue",
  trojan: "red",
  shadowsocks: "teal",
  hysteria: "orange",
  hysteria2: "orange",
  wireguard: "cyan",
  freedom: "green",
  blackhole: "gray",
  socks: "yellow",
  http: "yellow",
  dns: "gray",
  balancer: "pink",
};
const UNTESTABLE = new Set(["blackhole", "dns", "loopback"]);

export const useChainServers = () =>
  useQuery<{ servers: ChainServer[] }>({ queryKey: "chain-servers", queryFn: () => fetch("/chain"), staleTime: 10000 });

const delayColor = (ms: number) => (ms < 300 ? "green" : ms < 800 ? "yellow" : "red");

export const DelayPill: FC<{ r?: TestResult; busy?: boolean }> = ({ r, busy }) => {
  const { t } = useTranslation();
  if (busy) return <Spinner size="xs" color="primary.400" />;
  if (!r)
    return (
      <Text fontSize="xs" color="gray.500">
        —
      </Text>
    );
  if (r.error)
    return (
      <Tooltip label={r.error} hasArrow>
        <Badge colorScheme="red" variant="subtle" fontSize="2xs" cursor="help">
          {t("outb.invalid")}
        </Badge>
      </Tooltip>
    );
  if (unstable(r))
    return (
      <Tooltip label={t("outb.unstableHelp", { ok: r.ok, total: r.total })} hasArrow>
        <Badge colorScheme="orange" variant="subtle" fontSize="2xs" cursor="help" textTransform="none">
          {r.delay != null ? `${r.delay} ms · ` : ""}
          {t("outb.unstableShort")} {r.ok}/{r.total}
        </Badge>
      </Tooltip>
    );
  if (r.delay == null && !r.sites?.some((x) => x != null))
    return (
      <Badge colorScheme="red" variant="subtle" fontSize="2xs">
        {t("outb.failed")}
      </Badge>
    );
  if (r.delay == null)
    return (
      <Badge colorScheme="orange" variant="subtle" fontSize="2xs">
        {t("outb.urlFailed")}
      </Badge>
    );
  return (
    <Tooltip label={r.connect != null ? t("outb.firstRequest", { ms: r.connect }) : ""} hasArrow>
      <Badge colorScheme={delayColor(r.delay)} variant="subtle" fontSize="xs" fontFamily="mono">
        {r.delay} ms
      </Badge>
    </Tooltip>
  );
};

// what opened through it and where it came out
export const SiteChips: FC<{ r?: TestResult; names: string[] }> = ({ r, names }) => {
  const { t } = useTranslation();
  if (!r || r.error || !r.sites?.length) return null;
  return (
    <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5} mt={2}>
      {r.exit && (
        <Badge variant="outline" fontSize="2xs" textTransform="none" title={r.exit.city}>
          {flagEmoji(r.exit.cc)} {r.exit.country || r.exit.cc} · {r.exit.ip}
        </Badge>
      )}
      {r.sites.map((ms, i) =>
        i === 0 && names[0] === "URL" ? null : (
          <Badge key={i} variant="subtle" colorScheme={ms == null ? "red" : "green"} fontSize="2xs" textTransform="none">
            {ms == null ? "✕" : "✓"} {names[i] === "URL" ? "URL" : names[i]}
            {ms != null ? ` ${ms} ms` : ""}
          </Badge>
        )
      )}
      {unstable(r) ? (
        <Text fontSize="2xs" color="orange.400">
          {t("outb.unstableHelp", { ok: r.ok, total: r.total })}
        </Text>
      ) : (
        r.sites.some((x, i) => x == null && !(i === 0 && names[0] === "URL")) &&
        r.sites.some((x) => x != null) && (
          <Text fontSize="2xs" color="orange.400">
            {t("outb.someBlocked")}
          </Text>
        )
      )}
    </HStack>
  );
};

const ProtoBadge: FC<{ p: string }> = ({ p }) => (
  <Badge colorScheme={PROTO_COLOR[p] || "gray"} variant="solid" fontSize="2xs" textTransform="lowercase" flexShrink={0}>
    {p || "?"}
  </Badge>
);

// ------------------------------------------------------------------ outbounds

export const OutboundsBoard: FC<{ config: any; onChange: (c: any) => void }> = ({ config, onChange }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: chain } = useChainServers();
  const { data: traffic } = useQuery<Traffic>({ queryKey: "outbound-traffic", queryFn: () => fetch("/outbounds/traffic"), refetchInterval: 30000 });
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [server, setServer] = useState("master");
  const [url, setUrl] = useState("");
  const [sites, setSites] = useState(true);
  const [results, setResults] = useState<Record<string, { r: TestResult; names: string[]; server: string }>>({});
  const [busy, setBusy] = useState<Set<string>>(new Set());

  const outbounds: any[] = config?.outbounds || [];
  const rules: any[] = config?.routing?.rules || [];
  const balancers: any[] = config?.routing?.balancers || [];
  const servers = chain?.servers || [];
  const update = (list: any[]) => onChange({ ...clone(config), outbounds: list });

  const usage = (tag: string) => {
    const r = rules.filter((x) => x.outboundTag === tag).length;
    const b = balancers.filter((x) => (x.selector || []).some((p: string) => tag.startsWith(p))).length;
    const ex = servers.filter((s) => s.exit_tag === tag).map((s) => s.name);
    return { rules: r, balancers: b, exits: ex };
  };
  const trafficOf = (tag: string) => {
    let up = 0,
      down = 0;
    const per: string[] = [];
    Object.entries(traffic?.servers || {}).forEach(([key, tags]) => {
      const x = tags[tag];
      if (!x) return;
      up += x.up;
      down += x.down;
      const name = key === "master" ? "Master" : servers.find((s) => s.key === key)?.name || key;
      per.push(`${name}: ↑${formatBytes(x.up, 1)} ↓${formatBytes(x.down, 1)}`);
    });
    return { up, down, per };
  };

  const run = (idx: number[]) => {
    const list = idx.filter((i) => !UNTESTABLE.has(outbounds[i]?.protocol));
    if (!list.length) return;
    const tags = list.map((i) => outbounds[i].tag || `#${i}`);
    setBusy((old) => new Set([...old, ...tags]));
    fetch("/outbounds/test", { method: "POST", body: { outbounds: list.map((i) => outbounds[i]), server, url: url.trim() || undefined, sites } })
      .then((res: { sites: string[]; results: TestResult[] }) => {
        setResults((old) => {
          const next = { ...old };
          tags.forEach((tag, n) => (next[tag] = { r: res.results[n], names: res.sites, server }));
          return next;
        });
      })
      .catch((e: any) => toast({ status: "error", title: errText(t, e), position: "top", duration: 6000 }))
      .finally(() => setBusy((old) => new Set([...old].filter((x) => !tags.includes(x)))));
  };

  const resetTraffic = (tag?: string) =>
    fetch("/outbounds/traffic/reset", { method: "POST", body: { tag: tag ?? null } }).then(() => queryClient.invalidateQueries("outbound-traffic"));

  const serverName = (key: string) => (key === "master" ? t("outb.panel") : servers.find((s) => s.key === key)?.name || key);
  const editingOb = editing != null ? outbounds[editing] : null;

  return (
    <VStack align="stretch" spacing={3}>
      <HStack spacing={2} flexWrap="wrap" rowGap={2} p={2.5} borderRadius="12px" bg="var(--tier-2)">
        <HStack spacing={1.5}>
          <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
            {t("outb.testFrom")}
          </Text>
          <Select size="xs" w="auto" borderRadius="md" value={server} onChange={(e) => setServer(e.target.value)}>
            <option value="master">{t("outb.panel")}</option>
            {servers
              .filter((s) => s.key !== "master")
              .map((s) => (
                <option key={s.key} value={s.key} disabled={!s.can_test}>
                  {flagEmoji(s.flag)} {s.name}
                  {!s.can_test ? ` (${t("outb.needsSsh")})` : ""}
                </option>
              ))}
          </Select>
        </HStack>
        <Input size="xs" flex="1" minW="160px" borderRadius="md" placeholder="https://www.gstatic.com/generate_204" value={url} onChange={(e) => setUrl(e.target.value)} />
        <HStack spacing={1.5}>
          <Switch size="sm" colorScheme="primary" isChecked={sites} onChange={(e) => setSites(e.target.checked)} />
          <Text fontSize="xs" whiteSpace="nowrap">
            {t("outb.checkSites")}
          </Text>
        </HStack>
        <Button size="xs" colorScheme="primary" leftIcon={<BoltIcon width={14} />} isLoading={busy.size > 0} onClick={() => run(outbounds.map((_, i) => i))}>
          {t("outb.testAll")}
        </Button>
      </HStack>
      <Text fontSize="xs" color="gray.500">
        {t("outb.help")}
      </Text>

      {outbounds.map((o, index) => {
        const tag = o.tag || `#${index}`;
        const u = usage(o.tag);
        const tr = trafficOf(o.tag);
        const res = results[tag];
        const testable = !UNTESTABLE.has(o.protocol);
        const locked = u.rules > 0 || u.exits.length > 0;
        return (
          <Box key={`${tag}-${index}`} p={3} borderRadius="12px" bg="var(--tier-item)" borderWidth="1px" borderColor="var(--tier-line)">
            <HStack spacing={3} alignItems="center" flexWrap={{ base: "wrap", md: "nowrap" }} rowGap={2}>
              <Text fontSize="xs" color="gray.500" fontFamily="mono" w="18px" flexShrink={0}>
                {index + 1}
              </Text>
              <ProtoBadge p={o.protocol} />
              <Box minW={0} flex="1" flexBasis={{ base: "calc(100% - 110px)", md: "auto" }}>
                <HStack spacing={1.5} flexWrap="wrap" rowGap={1}>
                  <Text fontWeight="semibold" fontSize="sm" noOfLines={1} wordBreak="break-all">
                    {o.tag || "—"}
                  </Text>
                  {index === 0 && (
                    <Tooltip label={t("outb.defaultHelp")} hasArrow>
                      <Badge colorScheme="green" fontSize="2xs">
                        {t("coreEditors.default")}
                      </Badge>
                    </Tooltip>
                  )}
                  {u.rules > 0 && <Badge fontSize="2xs">{t("coreEditors.rulesCount", { count: u.rules })}</Badge>}
                  {u.balancers > 0 && (
                    <Badge fontSize="2xs" colorScheme="pink" variant="subtle">
                      {t("outb.inBalancer")}
                    </Badge>
                  )}
                  {u.exits.map((n) => (
                    <Badge key={n} fontSize="2xs" colorScheme="primary" variant="subtle" textTransform="none">
                      {t("outb.exitOf", { name: n })}
                    </Badge>
                  ))}
                </HStack>
                <Text fontSize="xs" color="gray.500" noOfLines={1} wordBreak="break-all">
                  {outboundSummary(o) || o.protocol}
                </Text>
              </Box>
              <Tooltip label={tr.per.length ? tr.per.join("\n") : t("outb.noTraffic")} hasArrow whiteSpace="pre-line">
                <VStack spacing={0} alignItems={{ base: "flex-start", md: "flex-end" }} minW="92px" flexShrink={0} ml={{ base: "30px", md: 0 }}>
                  <Text fontSize="2xs" color="gray.500" fontFamily="mono">
                    ↑ {formatBytes(tr.up, 1)}
                  </Text>
                  <Text fontSize="2xs" color="gray.500" fontFamily="mono">
                    ↓ {formatBytes(tr.down, 1)}
                  </Text>
                </VStack>
              </Tooltip>
              <Box minW="76px" textAlign="center" flexShrink={0}>
                {testable ? <DelayPill r={res?.r} busy={busy.has(tag)} /> : <Text fontSize="xs" color="gray.500">—</Text>}
                {res && res.server !== "master" && !busy.has(tag) && (
                  <Text fontSize="2xs" color="gray.500" noOfLines={1}>
                    {serverName(res.server)}
                  </Text>
                )}
              </Box>
              <ButtonGroup size="xs" variant="ghost" spacing={0} flexShrink={0} ml={{ base: "auto", md: 0 }}>
                <Tooltip label={t("outb.test")} hasArrow>
                  <IconButton aria-label="test" icon={<BoltIcon width={15} />} isDisabled={!testable || busy.has(tag)} onClick={() => run([index])} />
                </Tooltip>
                <Tooltip label={t("outb.edit")} hasArrow>
                  <IconButton aria-label="edit" icon={<PencilSquareIcon width={15} />} onClick={() => setEditing(index)} />
                </Tooltip>
                <Tooltip label={t("outb.duplicate")} hasArrow>
                  <IconButton
                    aria-label="duplicate"
                    icon={<DocumentDuplicateIcon width={15} />}
                    onClick={() => {
                      const taken = new Set(outbounds.map((x) => x.tag));
                      let n = 2;
                      while (taken.has(`${o.tag}-${n}`)) n++;
                      const next = [...outbounds];
                      next.splice(index + 1, 0, { ...clone(o), tag: `${o.tag}-${n}` });
                      update(next);
                    }}
                  />
                </Tooltip>
                <Tooltip label={t("outb.makeDefault")} hasArrow>
                  <IconButton
                    aria-label="default"
                    icon={<StarIcon width={15} />}
                    isDisabled={index === 0}
                    onClick={() => update([o, ...outbounds.filter((_, x) => x !== index)])}
                  />
                </Tooltip>
                <Tooltip label={locked ? t("outb.inUse") : t("outb.delete")} hasArrow>
                  <IconButton
                    aria-label="delete"
                    colorScheme="red"
                    icon={<TrashIcon width={15} />}
                    isDisabled={outbounds.length <= 1 || locked}
                    onClick={() => update(outbounds.filter((_, x) => x !== index))}
                  />
                </Tooltip>
              </ButtonGroup>
            </HStack>
            {res && !busy.has(tag) && <SiteChips r={res.r} names={res.names} />}
          </Box>
        );
      })}

      {adding ? (
        <AddOutbound
          existing={outbounds.map((o) => o.tag)}
          onCancel={() => setAdding(false)}
          onAdd={(o) => {
            update([...outbounds, o]);
            setAdding(false);
          }}
        />
      ) : (
        <HStack spacing={2} flexWrap="wrap" rowGap={2}>
          <Button size="sm" variant="outline" leftIcon={<PlusIcon width={16} />} onClick={() => setAdding(true)}>
            {t("coreEditors.addOutbound")}
          </Button>
          <Button size="sm" variant="ghost" leftIcon={<ArrowPathIcon width={15} />} onClick={() => resetTraffic()}>
            {t("outb.resetTraffic")}
          </Button>
        </HStack>
      )}

      <Modal isOpen={editingOb != null} onClose={() => setEditing(null)} size="2xl" scrollBehavior="inside">
        <ModalOverlay />
        <ModalContent mx={3}>
          <ModalHeader fontSize="md">
            <HStack spacing={2}>
              {editingOb && <ProtoBadge p={editingOb.protocol} />}
              <Text>{editingOb?.tag}</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={4}>
            {editingOb && (
              <JsonItemEditor
                value={editingOb}
                onCancel={() => setEditing(null)}
                onApply={(v) => {
                  update(outbounds.map((x, n) => (n === editing ? v : x)));
                  setEditing(null);
                }}
              />
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

// ------------------------------------------------------------------ server exits

const ServerExitRow: FC<{ s: ChainServer; all: ChainServer[]; dirty: boolean }> = ({ s, all, dirty }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [check, setCheck] = useState<null | { sites: string[]; exits: (TestResult & { tag: string; protocol: string })[] }>(null);
  const value = s.link ? `link:${s.link.exit}` : s.exit_tag ? `out:${s.exit_tag}` : "";
  const apply = async (v: string) => {
    setSaving(true);
    setCheck(null);
    try {
      if (v.startsWith("link:")) {
        await fetch(`/chain/${s.key}`, { method: "PUT", body: { exit: v.slice(5) } });
      } else {
        if (s.link) await fetch(`/chain/${s.key}`, { method: "PUT", body: { exit: null } });
        await fetch(`/chain/${s.key}/exit`, { method: "PUT", body: { tag: v.startsWith("out:") ? v.slice(4) : "" } });
      }
      toast({ status: "success", title: t("outb.exitSaved"), position: "top", duration: 2500 });
    } catch (e: any) {
      toast({ status: "error", title: errText(t, e), position: "top", duration: 6000 });
    } finally {
      queryClient.invalidateQueries("chain-servers");
      setSaving(false);
    }
  };
  const runCheck = () => {
    setChecking(true);
    fetch(`/chain/${s.key}/check`, { method: "POST" })
      .then(setCheck)
      .catch((e: any) => toast({ status: "error", title: errText(t, e), position: "top", duration: 6000 }))
      .finally(() => setChecking(false));
  };
  const others = all.filter((x) => x.key !== s.key);
  return (
    <Box p={3} borderRadius="12px" bg="var(--tier-item)" borderWidth="1px" borderColor="var(--tier-line)">
      <HStack spacing={3} flexWrap={{ base: "wrap", md: "nowrap" }} rowGap={2}>
        <HStack spacing={2} minW={{ md: "170px" }} w={{ base: "full", md: "auto" }} flex={{ base: "none", md: "0 0 auto" }}>
          <Icon as={ServerStackIcon} boxSize="18px" color="primary.400" />
          <Box minW={0}>
            <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
              {flagEmoji(s.flag)} {s.key === "master" ? t("outb.panel") : s.name}
            </Text>
            {s.relays.length > 0 && (
              <Text fontSize="2xs" color="gray.500" noOfLines={1}>
                {t("outb.exitFor", { names: s.relays.join(", ") })}
              </Text>
            )}
          </Box>
        </HStack>
        <Icon as={ArrowsRightLeftIcon} boxSize="16px" color="gray.500" display={{ base: "none", md: "block" }} />
        <Select size="sm" flex="1" minW={{ base: 0, md: "200px" }} borderRadius="md" value={value} isDisabled={saving} onChange={(e) => apply(e.target.value)}>
          <option value="">
            {t("outb.exitDefault", { tag: s.default_out.tag || "DIRECT", protocol: s.default_out.protocol || "freedom" })}
          </option>
          {others.length > 0 && (
            <optgroup label={t("outb.viaServer")}>
              {others.map((x) => (
                <option key={x.key} value={`link:${x.key}`}>
                  → {x.key === "master" ? t("outb.panel") : x.name} ({t("outb.internalLink")})
                </option>
              ))}
            </optgroup>
          )}
          {s.choices.length > 0 && (
            <optgroup label={t("outb.viaOutbound")}>
              {s.choices.map((c) => (
                <option key={c.tag} value={`out:${c.tag}`}>
                  {c.tag} · {c.protocol}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
        <Tooltip label={!s.can_test ? t("outb.needsSshLong") : dirty ? t("outb.saveFirst") : ""} hasArrow>
          <Button size="sm" variant="outline" leftIcon={<GlobeAltIcon width={15} />} isLoading={checking || saving} isDisabled={!s.can_test} onClick={runCheck} flexShrink={0}>
            {t("outb.checkExit")}
          </Button>
        </Tooltip>
      </HStack>
      {s.link && (
        <Text fontSize="2xs" color="gray.500" mt={1.5}>
          {t("outb.linkInfo", { port: s.link.port, address: s.link.address || s.link.default_address })}
        </Text>
      )}
      {check && (
        <VStack align="stretch" spacing={1} mt={2}>
          {check.exits.map((r, i) => (
            <Box key={i}>
              <HStack spacing={2}>
                <ProtoBadge p={r.protocol} />
                <Text fontSize="xs" fontWeight="medium">
                  {r.tag}
                </Text>
                <DelayPill r={r} />
              </HStack>
              <SiteChips r={r} names={check.sites} />
            </Box>
          ))}
        </VStack>
      )}
    </Box>
  );
};

const ServerExits: FC<{ dirty: boolean }> = ({ dirty }) => {
  const { t } = useTranslation();
  const { data } = useChainServers();
  return (
    <Box {...card}>
      <HStack spacing={2} mb={1}>
        <Icon as={ArrowsRightLeftIcon} boxSize="18px" color="primary.400" />
        <Text fontWeight="semibold">{t("outb.exitsTitle")}</Text>
      </HStack>
      <Text fontSize="xs" color="gray.500" mb={3}>
        {t("outb.exitsHelp")}
      </Text>
      {!data ? (
        <Spinner size="sm" />
      ) : (
        <VStack align="stretch" spacing={2}>
          {data.servers.map((s) => (
            <ServerExitRow key={s.key} s={s} all={data.servers} dirty={dirty} />
          ))}
        </VStack>
      )}
    </Box>
  );
};

// ------------------------------------------------------------------ page

const Tab: FC<{ active: boolean; onClick: () => void; children: ReactNode }> = ({ active, onClick, children }) => (
  <Button size="sm" borderRadius="full" variant={active ? "solid" : "ghost"} colorScheme={active ? "primary" : undefined} onClick={onClick}>
    {children}
  </Button>
);

export const OutboundsPage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [config, setConfig] = useState<any>(null);
  const [saved, setSaved] = useState("");
  const [tab, setTab] = useState<"outbounds" | "routing">("outbounds");
  const [saving, setSaving] = useState(false);
  const load = () =>
    fetch("/core/config").then((c: any) => {
      setConfig(c);
      setSaved(JSON.stringify(c));
    });
  useEffect(() => {
    load();
  }, []);
  const dirty = useMemo(() => !!config && JSON.stringify(config) !== saved, [config, saved]);
  const save = () => {
    setSaving(true);
    fetch("/core/config", { method: "PUT", body: config })
      .then((c: any) => {
        setConfig(c);
        setSaved(JSON.stringify(c));
        queryClient.invalidateQueries("chain-servers");
        toast({ status: "success", title: t("outb.savedRestarted"), position: "top", duration: 2500 });
      })
      .catch((e: any) => toast({ status: "error", title: errText(t, e), position: "top", duration: 8000 }))
      .finally(() => setSaving(false));
  };
  if (!config) return <Spinner />;
  return (
    <VStack align="stretch" spacing={4} maxW="1200px" pb={dirty ? 20 : 0}>
      <ServerExits dirty={dirty} />
      <Box {...card}>
        <HStack spacing={1} mb={3} flexWrap="wrap">
          <Tab active={tab === "outbounds"} onClick={() => setTab("outbounds")}>
            {t("outb.tabOutbounds")} ({(config.outbounds || []).length})
          </Tab>
          <Tab active={tab === "routing"} onClick={() => setTab("routing")}>
            {t("outb.tabRouting")} ({(config.routing?.rules || []).length})
          </Tab>
        </HStack>
        {tab === "outbounds" ? <OutboundsBoard config={config} onChange={setConfig} /> : <RoutingEditor config={config} onChange={setConfig} />}
      </Box>
      {dirty && (
        <HStack
          position="fixed"
          bottom={{ base: 3, md: 5 }}
          left="50%"
          transform="translateX(-50%)"
          zIndex={20}
          spacing={3}
          px={4}
          py={2.5}
          borderRadius="full"
          bg="var(--tier-1)"
          borderWidth="1px"
          borderColor="primary.400"
          boxShadow="lg"
          maxW="calc(100vw - 24px)"
        >
          <Text fontSize="sm" display={{ base: "none", sm: "block" }}>
            {t("outb.unsaved")}
          </Text>
          <Button size="sm" variant="ghost" onClick={() => setConfig(JSON.parse(saved))} isDisabled={saving}>
            {t("outb.discard")}
          </Button>
          <Button size="sm" colorScheme="primary" isLoading={saving} onClick={save}>
            {t("outb.saveRestart")}
          </Button>
        </HStack>
      )}
    </VStack>
  );
};
