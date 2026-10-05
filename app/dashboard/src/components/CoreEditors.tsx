// Visual editors for parts of an Xray config: inbounds, outbounds, routing.
// They all edit the same config object as the JSON tab of the core settings.
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Collapse,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Text,
  Textarea,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { FC, ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetch } from "service/http";
import { addInboundToConfig, defaultInboundOptions, InboundOptions, validateInbound } from "utils/inboundBuilder";
import { inboundErrorText, InboundBuilderForm } from "./InboundBuilder";

type EditorProps = {
  config: any;
  onChange: (config: any) => void;
};

const clone = (v: any) => JSON.parse(JSON.stringify(v ?? {}));

const move = <T,>(list: T[], from: number, to: number) => {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
};

const Row: FC<{ children: ReactNode }> = ({ children }) => (
  <Box
    border="1px solid"
    borderColor="light-border"
    _dark={{ borderColor: "gray.600" }}
    borderRadius="md"
    px={3}
    py={2}
  >
    {children}
  </Box>
);

const MoveButtons: FC<{ index: number; count: number; onMove: (to: number) => void }> = ({ index, count, onMove }) => (
  <ButtonGroup size="xs" variant="ghost" spacing={0}>
    <IconButton aria-label="up" icon={<ArrowUpIcon width={14} />} isDisabled={index === 0} onClick={() => onMove(index - 1)} />
    <IconButton aria-label="down" icon={<ArrowDownIcon width={14} />} isDisabled={index === count - 1} onClick={() => onMove(index + 1)} />
  </ButtonGroup>
);

// edit one JSON object in a textarea, applied when it parses
const JsonItemEditor: FC<{ value: any; onApply: (v: any) => void; onCancel: () => void }> = ({ value, onApply, onCancel }) => {
  const { t } = useTranslation();
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState("");
  return (
    <VStack align="stretch" mt={2} spacing={2}>
      <Textarea
        fontFamily="mono"
        fontSize="xs"
        rows={Math.min(18, text.split("\n").length + 1)}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          setError("");
        }}
      />
      <HStack justify="flex-end">
        {error && (
          <Text fontSize="xs" color="red.400" flex={1}>
            {error}
          </Text>
        )}
        <Button size="xs" variant="ghost" onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button
          size="xs"
          colorScheme="primary"
          onClick={() => {
            try {
              onApply(JSON.parse(text));
            } catch (e: any) {
              setError(e.message);
            }
          }}
        >
          {t("coreEditors.apply")}
        </Button>
      </HStack>
    </VStack>
  );
};

// ------------------------------------------------------------------ inbounds

const inboundSummary = (i: any) => {
  const s = i.streamSettings || {};
  const parts = [i.protocol];
  if (s.network) parts.push(s.network);
  if (s.security && s.security !== "none") parts.push(s.security);
  if (i.protocol === "dokodemo-door" || i.protocol === "tunnel")
    parts.push(`${i.settings?.address}:${i.settings?.port}`);
  return parts.join(" · ");
};

export const InboundsEditor: FC<EditorProps> = ({ config, onChange }) => {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [opts, setOpts] = useState<InboundOptions>(defaultInboundOptions());
  const inbounds: any[] = config?.inbounds || [];
  const portCount = new Map<string, number>();
  inbounds.forEach((i) => portCount.set(String(i.port), (portCount.get(String(i.port)) || 0) + 1));
  const errors = validateInbound(opts, config);

  const update = (list: any[]) => onChange({ ...clone(config), inbounds: list });

  const missingKeys = realityMissing(config).length;
  const [filling, setFilling] = useState(false);
  const toast = useToast();

  return (
    <VStack align="stretch" spacing={2}>
      <Text fontSize="xs" color="gray.500">
        {t("coreEditors.inboundsHelp")}
      </Text>
      {missingKeys > 0 && (
        <HStack
          p={2}
          borderRadius="md"
          bg="var(--app-surface-2)"
          border="1px solid"
          borderColor="light-border"
          _dark={{ borderColor: "gray.600", bg: "gray.750" }}
          justify="space-between"
        >
          <Text fontSize="xs">{t("coreEditors.realityMissing", { count: missingKeys })}</Text>
          <Button
            size="xs"
            colorScheme="primary"
            isLoading={filling}
            onClick={() => {
              setFilling(true);
              fillRealityKeys(config)
                .then(onChange)
                .catch((e: any) => toast({ title: e?.response?._data?.detail || e.message, status: "error", position: "top" }))
                .finally(() => setFilling(false));
            }}
          >
            {t("coreEditors.tool.fillReality", { count: missingKeys })}
          </Button>
        </HStack>
      )}
      {inbounds.map((i, index) => (
        <Row key={`${i.tag}-${index}`}>
          <HStack justify="space-between" spacing={2}>
            <Box minW={0}>
              <HStack spacing={2}>
                <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                  {i.tag}
                </Text>
                <Badge colorScheme={(portCount.get(String(i.port)) || 0) > 1 ? "red" : "gray"}>:{i.port ?? "fallback"}</Badge>
              </HStack>
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {inboundSummary(i)}
              </Text>
            </Box>
            <HStack spacing={0}>
              <MoveButtons index={index} count={inbounds.length} onMove={(to) => update(move(inbounds, index, to))} />
              <IconButton size="xs" variant="ghost" aria-label="edit" icon={<PencilSquareIcon width={14} />} onClick={() => setEditing(editing === index ? null : index)} />
              <IconButton
                size="xs"
                variant="ghost"
                colorScheme="red"
                aria-label="delete"
                icon={<TrashIcon width={14} />}
                onClick={() => update(inbounds.filter((_, x) => x !== index))}
              />
            </HStack>
          </HStack>
          <Collapse in={editing === index} unmountOnExit>
            <JsonItemEditor
              value={i}
              onCancel={() => setEditing(null)}
              onApply={(v) => {
                update(inbounds.map((x, n) => (n === index ? v : x)));
                setEditing(null);
              }}
            />
          </Collapse>
        </Row>
      ))}
      <Button
        size="sm"
        variant="outline"
        leftIcon={<PlusIcon width={16} />}
        onClick={() => {
          setOpts(defaultInboundOptions());
          setAdding(true);
        }}
      >
        {t("coreEditors.addInbound")}
      </Button>

      <Modal isOpen={adding} onClose={() => setAdding(false)} size="2xl" scrollBehavior="inside">
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent mx="3">
          <ModalHeader fontSize="lg">{t("coreEditors.addInbound")}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <InboundBuilderForm value={opts} onChange={setOpts} config={config} />
          </ModalBody>
          <ModalFooter gap={3}>
            {errors.length > 0 && (
              <Text fontSize="xs" color="red.400" flex={1}>
                {inboundErrorText(t, errors)}
              </Text>
            )}
            <Button
              size="sm"
              colorScheme="primary"
              isDisabled={errors.length > 0}
              onClick={() => {
                onChange(addInboundToConfig(config, opts).config);
                setAdding(false);
              }}
            >
              {t("inboundBuilder.add")}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  );
};

// ------------------------------------------------------------------ outbounds

const OUTBOUND_KINDS = ["link", "freedom", "blackhole", "socks", "http", "wireguard", "json"] as const;
type OutboundKind = (typeof OUTBOUND_KINDS)[number];

const outboundSummary = (o: any) => {
  const s = o.settings || {};
  const server = s.vnext?.[0] || s.servers?.[0] || s.peers?.[0];
  const addr = s.address
    ? `${s.address}:${s.port}`
    : server
    ? server.endpoint || `${server.address}:${server.port}`
    : "";
  const net = o.streamSettings?.network;
  const sec = o.streamSettings?.security;
  return [o.protocol, addr, net, sec && sec !== "none" ? sec : ""].filter(Boolean).join(" · ");
};

const AddOutbound: FC<{ existing: string[]; onAdd: (o: any) => void; onCancel: () => void }> = ({ existing, onAdd, onCancel }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [kind, setKind] = useState<OutboundKind>("link");
  const [tag, setTag] = useState("");
  const [link, setLink] = useState("");
  const [address, setAddress] = useState("");
  const [port, setPort] = useState("");
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [strategy, setStrategy] = useState("AsIs");
  const [wg, setWg] = useState({ secretKey: "", address: "10.0.0.2/32", publicKey: "", endpoint: "" });
  const [json, setJson] = useState('{\n  "protocol": "freedom",\n  "tag": "",\n  "settings": {}\n}');
  const [busy, setBusy] = useState(false);

  const defaultTag = kind === "freedom" ? "DIRECT" : kind === "blackhole" ? "BLOCK" : "";
  const finalTag = tag.trim() || defaultTag;
  const tagTaken = !!finalTag && existing.includes(finalTag);

  const submit = async () => {
    try {
      let out: any;
      if (kind === "link") {
        setBusy(true);
        out = await fetch("/core/outbound-from-link", { method: "POST", body: { link, tag: finalTag || undefined } });
        if (existing.includes(out.tag)) out.tag = `${out.tag}-${existing.length}`;
      } else if (kind === "freedom") {
        out = { protocol: "freedom", tag: finalTag, settings: strategy !== "AsIs" ? { domainStrategy: strategy } : {} };
      } else if (kind === "blackhole") {
        out = { protocol: "blackhole", tag: finalTag };
      } else if (kind === "socks" || kind === "http") {
        const server: any = { address: address.trim(), port: Number(port) };
        if (user) server.users = [{ user, pass }];
        out = { protocol: kind, tag: finalTag, settings: { servers: [server] } };
      } else if (kind === "wireguard") {
        out = {
          protocol: "wireguard",
          tag: finalTag,
          settings: {
            secretKey: wg.secretKey.trim(),
            address: wg.address.split(",").map((x) => x.trim()).filter(Boolean),
            peers: [{ publicKey: wg.publicKey.trim(), endpoint: wg.endpoint.trim() }],
          },
        };
      } else {
        out = JSON.parse(json);
      }
      if (!out.tag) throw new Error(t("coreEditors.tagRequired"));
      onAdd(out);
    } catch (e: any) {
      toast({ title: e?.response?._data?.detail || e.message, status: "error", position: "top", duration: 4000 });
    } finally {
      setBusy(false);
    }
  };

  const needsTag = kind !== "link" && kind !== "json";
  return (
    <Row>
      <VStack align="stretch" spacing={3}>
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
          <Select size="sm" value={kind} onChange={(e) => setKind(e.target.value as OutboundKind)}>
            {OUTBOUND_KINDS.map((k) => (
              <option key={k} value={k}>
                {t(`coreEditors.outboundKind.${k}`)}
              </option>
            ))}
          </Select>
          {kind !== "json" && (
            <Input
              size="sm"
              placeholder={kind === "link" ? t("coreEditors.tagOptional") : defaultTag || "tag"}
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              isInvalid={tagTaken}
            />
          )}
        </SimpleGrid>
        {kind === "link" && (
          <Textarea size="sm" fontFamily="mono" fontSize="xs" rows={3} placeholder="vless://… vmess://… trojan://… ss://… hysteria2://…" value={link} onChange={(e) => setLink(e.target.value)} />
        )}
        {kind === "freedom" && (
          <Select size="sm" value={strategy} onChange={(e) => setStrategy(e.target.value)}>
            {["AsIs", "UseIP", "UseIPv4", "UseIPv6", "UseIPv4v6", "UseIPv6v4"].map((s) => (
              <option key={s} value={s}>
                domainStrategy: {s}
              </option>
            ))}
          </Select>
        )}
        {(kind === "socks" || kind === "http") && (
          <SimpleGrid columns={{ base: 2, sm: 4 }} spacing={2}>
            <Input size="sm" placeholder={t("coreEditors.address")} value={address} onChange={(e) => setAddress(e.target.value)} />
            <Input size="sm" type="number" placeholder={t("inboundBuilder.port")} value={port} onChange={(e) => setPort(e.target.value)} />
            <Input size="sm" placeholder={t("inboundBuilder.authUser")} value={user} onChange={(e) => setUser(e.target.value)} />
            <Input size="sm" placeholder={t("inboundBuilder.authPass")} value={pass} onChange={(e) => setPass(e.target.value)} />
          </SimpleGrid>
        )}
        {kind === "wireguard" && (
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
            <Input size="sm" fontFamily="mono" placeholder="secretKey (private key)" value={wg.secretKey} onChange={(e) => setWg({ ...wg, secretKey: e.target.value })} />
            <Input size="sm" placeholder="address: 10.0.0.2/32" value={wg.address} onChange={(e) => setWg({ ...wg, address: e.target.value })} />
            <Input size="sm" fontFamily="mono" placeholder="peer publicKey" value={wg.publicKey} onChange={(e) => setWg({ ...wg, publicKey: e.target.value })} />
            <Input size="sm" placeholder="endpoint: 1.2.3.4:51820" value={wg.endpoint} onChange={(e) => setWg({ ...wg, endpoint: e.target.value })} />
          </SimpleGrid>
        )}
        {kind === "json" && (
          <Textarea fontFamily="mono" fontSize="xs" rows={8} value={json} onChange={(e) => setJson(e.target.value)} />
        )}
        <HStack justify="flex-end">
          {tagTaken && (
            <Text fontSize="xs" color="red.400" flex={1}>
              {t("coreEditors.tagTaken")}
            </Text>
          )}
          <Button size="xs" variant="ghost" onClick={onCancel}>
            {t("cancel")}
          </Button>
          <Button size="xs" colorScheme="primary" isLoading={busy} isDisabled={tagTaken || (needsTag && !finalTag)} onClick={submit}>
            {t("coreEditors.add")}
          </Button>
        </HStack>
      </VStack>
    </Row>
  );
};

export const OutboundsEditor: FC<EditorProps> = ({ config, onChange }) => {
  const { t } = useTranslation();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const outbounds: any[] = config?.outbounds || [];
  const rules: any[] = config?.routing?.rules || [];
  const update = (list: any[]) => onChange({ ...clone(config), outbounds: list });
  const usedBy = (tag: string) => rules.filter((r) => r.outboundTag === tag).length;

  return (
    <VStack align="stretch" spacing={2}>
      <Text fontSize="xs" color="gray.500">
        {t("coreEditors.outboundsHelp")}
      </Text>
      {outbounds.map((o, index) => (
        <Row key={`${o.tag}-${index}`}>
          <HStack justify="space-between" spacing={2}>
            <Box minW={0}>
              <HStack spacing={2}>
                <Text fontWeight="semibold" fontSize="sm" noOfLines={1}>
                  {o.tag || "—"}
                </Text>
                {index === 0 && <Badge colorScheme="green">{t("coreEditors.default")}</Badge>}
                {usedBy(o.tag) > 0 && <Badge>{t("coreEditors.rulesCount", { count: usedBy(o.tag) })}</Badge>}
              </HStack>
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {outboundSummary(o)}
              </Text>
            </Box>
            <HStack spacing={0}>
              <MoveButtons index={index} count={outbounds.length} onMove={(to) => update(move(outbounds, index, to))} />
              <IconButton size="xs" variant="ghost" aria-label="edit" icon={<PencilSquareIcon width={14} />} onClick={() => setEditing(editing === index ? null : index)} />
              <Tooltip label={usedBy(o.tag) ? t("coreEditors.usedByRules") : ""}>
                <IconButton
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  aria-label="delete"
                  icon={<TrashIcon width={14} />}
                  isDisabled={outbounds.length <= 1 || usedBy(o.tag) > 0}
                  onClick={() => update(outbounds.filter((_, x) => x !== index))}
                />
              </Tooltip>
            </HStack>
          </HStack>
          <Collapse in={editing === index} unmountOnExit>
            <JsonItemEditor
              value={o}
              onCancel={() => setEditing(null)}
              onApply={(v) => {
                update(outbounds.map((x, n) => (n === index ? v : x)));
                setEditing(null);
              }}
            />
          </Collapse>
        </Row>
      ))}
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
        <Button size="sm" variant="outline" leftIcon={<PlusIcon width={16} />} onClick={() => setAdding(true)}>
          {t("coreEditors.addOutbound")}
        </Button>
      )}
    </VStack>
  );
};

// ------------------------------------------------------------------ routing

// rule fields edited as comma / newline separated lists
const LIST_FIELDS = ["domain", "ip", "inboundTag", "source", "user", "protocol"] as const;
// rule fields that are a plain string in Xray
const TEXT_FIELDS = ["port", "sourcePort", "network"] as const;

const toText = (v: any) => (Array.isArray(v) ? v.join("\n") : v ?? "");
const toList = (v: string) =>
  v
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);

const hasMatcher = (r: any) =>
  [...LIST_FIELDS, ...TEXT_FIELDS].some((f) => (Array.isArray(r[f]) ? r[f].length : r[f])) || r.attrs;

const RULE_PRESETS: { key: string; rule: (out: string) => any; out: "block" | "direct" }[] = [
  { key: "ads", out: "block", rule: (o) => ({ type: "field", domain: ["geosite:category-ads-all"], outboundTag: o }) },
  { key: "torrent", out: "block", rule: (o) => ({ type: "field", protocol: ["bittorrent"], outboundTag: o }) },
  { key: "private", out: "block", rule: (o) => ({ type: "field", ip: ["geoip:private"], outboundTag: o }) },
];

const RuleEditor: FC<{
  rule: any;
  outbounds: string[];
  balancers: string[];
  inbounds: string[];
  onChange: (r: any) => void;
}> = ({ rule, outbounds, balancers, inbounds, onChange }) => {
  const { t } = useTranslation();
  // keep raw text while typing so separators aren't eaten
  const [texts, setTexts] = useState<Record<string, string>>(() =>
    Object.fromEntries(LIST_FIELDS.map((f) => [f, toText(rule[f])]))
  );
  useEffect(() => {
    setTexts(Object.fromEntries(LIST_FIELDS.map((f) => [f, toText(rule[f])])));
  }, [JSON.stringify(LIST_FIELDS.map((f) => rule[f]))]);

  const setList = (field: string, text: string) => {
    setTexts({ ...texts, [field]: text });
    const next = { ...rule };
    const list = toList(text);
    if (list.length) next[field] = list;
    else delete next[field];
    onChange(next);
  };
  const setText = (field: string, value: string) => {
    const next = { ...rule };
    if (value.trim()) next[field] = value.trim();
    else delete next[field];
    onChange(next);
  };
  const target = rule.balancerTag ? `balancer:${rule.balancerTag}` : rule.outboundTag || "";

  const toggleIn = (field: string, value: string) => {
    const list: string[] = Array.isArray(rule[field]) ? rule[field] : [];
    const nextList = list.includes(value) ? list.filter((x) => x !== value) : [...list, value];
    setList(field, nextList.join("\n"));
  };
  const chips = (field: string, options: string[]) => {
    const current: string[] = Array.isArray(rule[field]) ? rule[field] : [];
    const all = [...options, ...current.filter((x) => !options.includes(x))];
    return (
      <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
        {all.map((o) => (
          <Button
            key={o}
            size="xs"
            borderRadius="full"
            colorScheme="primary"
            variant={current.includes(o) ? "solid" : "outline"}
            onClick={() => toggleIn(field, o)}
          >
            {o}
          </Button>
        ))}
      </HStack>
    );
  };
  const label = (text: string) => (
    <Text fontSize="xs" opacity={0.75} mb={1}>
      {text}
    </Text>
  );

  return (
    <VStack align="stretch" spacing={3} mt={2}>
      <Box>
        {label(t("coreEditors.ruleOutbound"))}
        <Select
          size="sm"
          value={target}
          onChange={(e) => {
            const next = { ...rule };
            delete next.outboundTag;
            delete next.balancerTag;
            if (e.target.value.startsWith("balancer:")) next.balancerTag = e.target.value.slice(9);
            else next.outboundTag = e.target.value;
            onChange(next);
          }}
        >
          {!target && <option value="">{t("coreEditors.pickOutbound")}</option>}
          <optgroup label={t("coreEditors.tab.outbounds")}>
            {outbounds.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </optgroup>
          {balancers.length > 0 && (
            <optgroup label={t("coreEditors.balancers")}>
              {balancers.map((b) => (
                <option key={b} value={`balancer:${b}`}>
                  {b}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
      </Box>
      {inbounds.length > 0 && (
        <Box>
          {label(t("coreEditors.ruleInbounds"))}
          {chips("inboundTag", inbounds)}
        </Box>
      )}
      <Box>
        {label(t("coreEditors.ruleProtocols"))}
        {chips("protocol", ["http", "tls", "quic", "bittorrent"])}
      </Box>
      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={2}>
        {LIST_FIELDS.filter((f) => f !== "inboundTag" && f !== "protocol").map((f) => (
          <Box key={f}>
            {label(f)}
            <Textarea
              size="sm"
              fontFamily="mono"
              fontSize="xs"
              rows={f === "domain" || f === "ip" ? 3 : 2}
              placeholder={t(`coreEditors.placeholder.${f}`)}
              value={texts[f] || ""}
              onChange={(e) => setList(f, e.target.value)}
            />
          </Box>
        ))}
      </SimpleGrid>
      <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={2}>
        <Box>
          <Text fontSize="xs" opacity={0.75} mb={0.5}>
            port
          </Text>
          <Input size="sm" placeholder="53,443,1000-2000" value={rule.port ?? ""} onChange={(e) => setText("port", e.target.value)} />
        </Box>
        <Box>
          <Text fontSize="xs" opacity={0.75} mb={0.5}>
            sourcePort
          </Text>
          <Input size="sm" value={rule.sourcePort ?? ""} onChange={(e) => setText("sourcePort", e.target.value)} />
        </Box>
        <Box>
          <Text fontSize="xs" opacity={0.75} mb={0.5}>
            network
          </Text>
          <Select size="sm" value={rule.network ?? ""} onChange={(e) => setText("network", e.target.value)}>
            <option value="">{t("coreEditors.any")}</option>
            <option value="tcp">tcp</option>
            <option value="udp">udp</option>
            <option value="tcp,udp">tcp,udp</option>
          </Select>
        </Box>
      </SimpleGrid>
    </VStack>
  );
};

const ruleSummary = (r: any) =>
  [...LIST_FIELDS, ...TEXT_FIELDS]
    .filter((f) => (Array.isArray(r[f]) ? r[f].length : r[f]))
    .map((f) => {
      const v = Array.isArray(r[f]) ? r[f] : [r[f]];
      return `${f}: ${v.slice(0, 3).join(", ")}${v.length > 3 ? ` +${v.length - 3}` : ""}`;
    })
    .join("  ·  ");

export const RoutingEditor: FC<EditorProps> = ({ config, onChange }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);
  const [country, setCountry] = useState("");
  const routing = config?.routing || {};
  const rules: any[] = routing.rules || [];
  const outbounds: string[] = (config?.outbounds || []).map((o: any) => o.tag).filter(Boolean);
  const balancers: string[] = (routing.balancers || []).map((b: any) => b.tag).filter(Boolean);
  const inbounds: string[] = (config?.inbounds || []).map((i: any) => i.tag).filter(Boolean);
  const blockTag = (config?.outbounds || []).find((o: any) => o.protocol === "blackhole")?.tag;
  const directTag = (config?.outbounds || []).find((o: any) => o.protocol === "freedom")?.tag;

  const setRouting = (patch: any) => {
    const next = clone(config);
    next.routing = { ...(next.routing || {}), ...patch };
    onChange(next);
  };
  const setRules = (list: any[]) => setRouting({ rules: list });
  const addRule = (rule: any, openIt = false) => {
    setRules([...rules, rule]);
    if (openIt) setOpen(rules.length);
  };

  return (
    <VStack align="stretch" spacing={3}>
      <HStack spacing={3} flexWrap="wrap" rowGap={2}>
        <Text fontSize="sm">domainStrategy</Text>
        <Select size="sm" w="auto" value={routing.domainStrategy || "AsIs"} onChange={(e) => setRouting({ domainStrategy: e.target.value })}>
          {["AsIs", "IPIfNonMatch", "IPOnDemand"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </HStack>
      <InboundToOutbound
        inbounds={inbounds}
        outbounds={outbounds}
        balancers={balancers}
        onAdd={(rule) => setRules([rule, ...rules])}
      />
      <Text fontSize="xs" color="gray.500">
        {t("coreEditors.routingHelp")}
      </Text>

      {rules.map((r, index) => (
        <Row key={index}>
          <HStack justify="space-between" spacing={2}>
            <Box minW={0} flex={1} cursor="pointer" onClick={() => setOpen(open === index ? null : index)}>
              <HStack spacing={2}>
                <Badge>{index + 1}</Badge>
                <HStack spacing={1} fontWeight="semibold" fontSize="sm">
                  <ArrowRightIcon width={14} />
                  <Text as="span">{r.outboundTag || r.balancerTag || "?"}</Text>
                  {r.balancerTag && <Badge colorScheme="purple">balancer</Badge>}
                </HStack>
                {(!hasMatcher(r) || (r.outboundTag && !outbounds.includes(r.outboundTag))) && (
                  <Badge colorScheme="red">{t("coreEditors.invalidRule")}</Badge>
                )}
              </HStack>
              <Text fontSize="xs" color="gray.500" noOfLines={1}>
                {ruleSummary(r) || t("coreEditors.noMatchers")}
              </Text>
            </Box>
            <HStack spacing={0}>
              <MoveButtons index={index} count={rules.length} onMove={(to) => setRules(move(rules, index, to))} />
              <IconButton size="xs" variant="ghost" aria-label="edit" icon={<PencilSquareIcon width={14} />} onClick={() => setOpen(open === index ? null : index)} />
              <IconButton
                size="xs"
                variant="ghost"
                colorScheme="red"
                aria-label="delete"
                icon={<TrashIcon width={14} />}
                onClick={() => {
                  setRules(rules.filter((_, x) => x !== index));
                  setOpen(null);
                }}
              />
            </HStack>
          </HStack>
          <Collapse in={open === index} unmountOnExit>
            <RuleEditor
              rule={r}
              outbounds={outbounds}
              balancers={balancers}
              inbounds={inbounds}
              onChange={(next) => setRules(rules.map((x, n) => (n === index ? next : x)))}
            />
          </Collapse>
        </Row>
      ))}

      <Button
        size="sm"
        variant="outline"
        leftIcon={<PlusIcon width={16} />}
        onClick={() => addRule({ type: "field", outboundTag: directTag || outbounds[0] || "" }, true)}
      >
        {t("coreEditors.addRule")}
      </Button>

      <Box>
        <Text fontSize="xs" opacity={0.75} mb={1.5}>
          {t("coreEditors.presets")}
        </Text>
        <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
          {RULE_PRESETS.map((p) => {
            const out = p.out === "block" ? blockTag : directTag;
            return (
              <Tooltip key={p.key} label={!out ? t(`coreEditors.needs.${p.out}`) : ""}>
                <Button size="xs" borderRadius="full" variant="outline" isDisabled={!out} onClick={() => addRule(p.rule(out!))}>
                  + {t(`coreEditors.preset.${p.key}`)}
                </Button>
              </Tooltip>
            );
          })}
          <HStack spacing={1}>
            <Input
              size="xs"
              w="64px"
              borderRadius="full"
              placeholder="ru"
              maxLength={2}
              value={country}
              onChange={(e) => setCountry(e.target.value.toLowerCase().replace(/[^a-z]/g, ""))}
            />
            <Tooltip label={!directTag ? t("coreEditors.needs.direct") : ""}>
              <Button
                size="xs"
                borderRadius="full"
                variant="outline"
                isDisabled={!directTag || country.length !== 2}
                onClick={() => {
                  // "domain:ru" matches the whole .ru zone; geoip has every country code
                  setRules([
                    ...rules,
                    { type: "field", domain: [`domain:${country}`], outboundTag: directTag },
                    { type: "field", ip: [`geoip:${country}`], outboundTag: directTag },
                  ]);
                  setCountry("");
                }}
              >
                + {t("coreEditors.preset.country")}
              </Button>
            </Tooltip>
          </HStack>
        </HStack>
      </Box>
      <BalancersEditor config={config} onChange={onChange} />
    </VStack>
  );
};

// pick inbounds, pick where their traffic goes: one rule, added on top
const InboundToOutbound: FC<{
  inbounds: string[];
  outbounds: string[];
  balancers: string[];
  onAdd: (rule: any) => void;
}> = ({ inbounds, outbounds, balancers, onAdd }) => {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const toggle = (tag: string) => setPicked(picked.includes(tag) ? picked.filter((x) => x !== tag) : [...picked, tag]);
  return (
    <Row>
      <Text fontSize="sm" fontWeight="semibold" mb={2}>
        <HStack as="span" spacing={1}>
          <Text as="span">{t("coreEditors.inboundWord")}</Text>
          <ArrowRightIcon width={14} />
          <Text as="span">{t("coreEditors.outboundWord")}</Text>
        </HStack>
      </Text>
      <Text fontSize="xs" opacity={0.75} mb={1}>
        {t("coreEditors.pickInbounds")}
      </Text>
      <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5} mb={2}>
        {inbounds.map((tag) => (
          <Button
            key={tag}
            size="xs"
            borderRadius="full"
            colorScheme="primary"
            variant={picked.includes(tag) ? "solid" : "outline"}
            onClick={() => toggle(tag)}
          >
            {tag}
          </Button>
        ))}
      </HStack>
      <HStack spacing={2}>
        <Select size="sm" value={target} onChange={(e) => setTarget(e.target.value)}>
          <option value="">{t("coreEditors.pickOutbound")}</option>
          <optgroup label={t("coreEditors.tab.outbounds")}>
            {outbounds.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </optgroup>
          {balancers.length > 0 && (
            <optgroup label={t("coreEditors.balancers")}>
              {balancers.map((b) => (
                <option key={b} value={`balancer:${b}`}>
                  {b}
                </option>
              ))}
            </optgroup>
          )}
        </Select>
        <Button
          size="sm"
          colorScheme="primary"
          flexShrink={0}
          isDisabled={!picked.length || !target}
          onClick={() => {
            const rule: any = { type: "field", inboundTag: picked };
            if (target.startsWith("balancer:")) rule.balancerTag = target.slice(9);
            else rule.outboundTag = target;
            onAdd(rule);
            setPicked([]);
            setTarget("");
          }}
        >
          {t("coreEditors.add")}
        </Button>
      </HStack>
    </Row>
  );
};

const STRATEGIES = ["random", "roundRobin", "leastPing", "leastLoad"];

// balancers spread traffic over several outbounds; leastPing / leastLoad need
// the observatory, which is kept in sync with the balancers here
const BalancersEditor: FC<EditorProps> = ({ config, onChange }) => {
  const { t } = useTranslation();
  const balancers: any[] = config?.routing?.balancers || [];
  const outbounds: string[] = (config?.outbounds || []).map((o: any) => o.tag).filter(Boolean);
  const rules: any[] = config?.routing?.rules || [];

  const save = (list: any[]) => {
    const next = clone(config);
    next.routing = { ...(next.routing || {}), balancers: list };
    if (!list.length) delete next.routing.balancers;
    const probed = list.filter((b) => ["leastPing", "leastLoad"].includes(b.strategy?.type));
    const selectors = Array.from(new Set(probed.flatMap((b) => b.selector || [])));
    if (selectors.length) {
      const key = probed.some((b) => b.strategy?.type === "leastLoad") ? "burstObservatory" : "observatory";
      const other = key === "observatory" ? "burstObservatory" : "observatory";
      delete next[other];
      next[key] =
        key === "observatory"
          ? { ...(next.observatory || {}), subjectSelector: selectors, probeUrl: next.observatory?.probeUrl || "https://www.gstatic.com/generate_204", probeInterval: next.observatory?.probeInterval || "1m", enableConcurrency: true }
          : { ...(next.burstObservatory || {}), subjectSelector: selectors, pingConfig: next.burstObservatory?.pingConfig || { destination: "https://www.gstatic.com/generate_204", interval: "1m", sampling: 3, timeout: "5s" } };
    } else {
      delete next.observatory;
      delete next.burstObservatory;
    }
    onChange(next);
  };
  const patch = (i: number, p: any) => save(balancers.map((b, n) => (n === i ? { ...b, ...p } : b)));

  return (
    <VStack align="stretch" spacing={2} pt={2}>
      <Text fontSize="sm" fontWeight="semibold">
        {t("coreEditors.balancers")}
      </Text>
      <Text fontSize="xs" color="gray.500">
        {t("coreEditors.balancersHelp")}
      </Text>
      {balancers.map((b, i) => {
        const used = rules.some((r) => r.balancerTag === b.tag);
        return (
          <Row key={i}>
            <VStack align="stretch" spacing={2}>
              <HStack>
                <Input size="sm" placeholder="tag" value={b.tag || ""} onChange={(e) => patch(i, { tag: e.target.value })} />
                <Select size="sm" w="160px" flexShrink={0} value={b.strategy?.type || "random"} onChange={(e) => patch(i, { strategy: { type: e.target.value } })}>
                  {STRATEGIES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
                <Tooltip label={used ? t("coreEditors.usedByRules") : ""}>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    colorScheme="red"
                    aria-label="delete"
                    icon={<TrashIcon width={14} />}
                    isDisabled={used}
                    onClick={() => save(balancers.filter((_, n) => n !== i))}
                  />
                </Tooltip>
              </HStack>
              <Text fontSize="xs" opacity={0.75}>
                {t("coreEditors.balancerOutbounds")}
              </Text>
              <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
                {outbounds.map((o) => {
                  const on = (b.selector || []).includes(o);
                  return (
                    <Button
                      key={o}
                      size="xs"
                      borderRadius="full"
                      colorScheme="primary"
                      variant={on ? "solid" : "outline"}
                      onClick={() => patch(i, { selector: on ? b.selector.filter((x: string) => x !== o) : [...(b.selector || []), o] })}
                    >
                      {o}
                    </Button>
                  );
                })}
              </HStack>
              <HStack>
                <Text fontSize="xs" opacity={0.75} flexShrink={0}>
                  fallbackTag
                </Text>
                <Select size="xs" value={b.fallbackTag || ""} onChange={(e) => {
                  const next = { ...b, fallbackTag: e.target.value };
                  if (!e.target.value) delete next.fallbackTag;
                  save(balancers.map((x, n) => (n === i ? next : x)));
                }}>
                  <option value="">—</option>
                  {outbounds.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              </HStack>
            </VStack>
          </Row>
        );
      })}
      <Button
        size="sm"
        variant="outline"
        leftIcon={<PlusIcon width={16} />}
        onClick={() => save([...balancers, { tag: `balancer-${balancers.length + 1}`, selector: [], strategy: { type: "leastPing" } }])}
      >
        {t("coreEditors.addBalancer")}
      </Button>
    </VStack>
  );
};

// ------------------------------------------------------------------ JSON toolbar

export const newUUID = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
        (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
      );

const randomShortId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

// REALITY inbounds without a privateKey / shortIds
export const realityMissing = (config: any) =>
  (config?.inbounds || []).filter(
    (i: any) =>
      i?.streamSettings?.security === "reality" &&
      (!i.streamSettings.realitySettings?.privateKey || !(i.streamSettings.realitySettings?.shortIds || []).filter(Boolean).length)
  );

// fills missing REALITY keys and shortIds; returns the new config
export const fillRealityKeys = async (config: any) => {
  const next = clone(config);
  for (const i of realityMissing(next)) {
    const r = (i.streamSettings.realitySettings = i.streamSettings.realitySettings || {});
    if (!r.privateKey) {
      const k: any = await fetch("/core/x25519");
      r.privateKey = k.private_key;
      r.publicKey = k.public_key;
    }
    if (!(r.shortIds || []).filter(Boolean).length) r.shortIds = [randomShortId()];
    if (!r.dest && !r.target) r.dest = "www.google.com:443";
    if (!(r.serverNames || []).length) r.serverNames = ["www.google.com"];
  }
  return next;
};

type ToolbarProps = {
  config: any;
  // insert text at the JSON editor's cursor
  insert: (text: string) => void;
  onFormat: () => void;
  onChange: (config: any) => void;
};

export const JsonToolbar: FC<ToolbarProps> = ({ config, insert, onFormat, onChange }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [keys, setKeys] = useState<{ private_key: string; public_key: string } | null>(null);
  const [busy, setBusy] = useState("");
  const missing = realityMissing(config).length;

  const run = (name: string, fn: () => Promise<any>) => {
    setBusy(name);
    fn()
      .catch((e: any) => toast({ title: e?.response?._data?.detail || e.message, status: "error", position: "top", duration: 4000 }))
      .finally(() => setBusy(""));
  };
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast({ title: t("coreEditors.copied"), status: "success", position: "top", duration: 1500 });
  };

  return (
    <VStack align="stretch" spacing={2} mb={2}>
      <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
        <Button size="xs" variant="outline" isLoading={busy === "keys"} onClick={() => run("keys", () => fetch("/core/x25519").then(setKeys))}>
          {t("coreEditors.tool.x25519")}
        </Button>
        <Button size="xs" variant="outline" onClick={() => insert(`"${randomShortId()}"`)}>
          + shortId
        </Button>
        <Button size="xs" variant="outline" onClick={() => insert(`"${newUUID()}"`)}>
          + UUID
        </Button>
        <Button size="xs" variant="outline" onClick={onFormat}>
          {t("coreEditors.tool.format")}
        </Button>
        {missing > 0 && (
          <Button
            size="xs"
            colorScheme="primary"
            isLoading={busy === "fill"}
            onClick={() => run("fill", () => fillRealityKeys(config).then(onChange))}
          >
            {t("coreEditors.tool.fillReality", { count: missing })}
          </Button>
        )}
      </HStack>
      {keys && (
        <Row>
          <VStack align="stretch" spacing={1} fontSize="xs">
            {[
              ["privateKey", keys.private_key],
              ["publicKey", keys.public_key],
            ].map(([label, value]) => (
              <HStack key={label} spacing={2}>
                <Text w="72px" flexShrink={0} opacity={0.7}>
                  {label}
                </Text>
                <Text fontFamily="mono" flex={1} noOfLines={1}>
                  {value}
                </Text>
                <Button size="xs" variant="ghost" onClick={() => copy(value)}>
                  {t("coreEditors.tool.copy")}
                </Button>
                {label === "privateKey" && (
                  <Button size="xs" variant="ghost" onClick={() => insert(`"${value}"`)}>
                    {t("coreEditors.tool.insert")}
                  </Button>
                )}
              </HStack>
            ))}
            <Text color="gray.500">{t("coreEditors.tool.x25519Help")}</Text>
          </VStack>
        </Row>
      )}
    </VStack>
  );
};
