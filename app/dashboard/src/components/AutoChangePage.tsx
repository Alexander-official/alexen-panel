// Auto IP change: a rule is a chain of stages. Each stage fires once: when the
// hosts' traffic on a node stays under its threshold for its time (usually: IP
// blocked), the hosts move to the stage's IP. The next stage starts watching at
// once, or after the new IP carried some traffic / some time passed.
// The live part (/auto-change/status) is polled every few seconds and the
// countdowns tick locally, so only the small timer components re-render each second.
import {
  Box,
  Button,
  Collapse,
  HStack,
  Icon,
  IconButton,
  Input,
  NumberInput,
  NumberInputField,
  Switch,
  Text,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowRightIcon,
  ArrowsRightLeftIcon,
  ArrowUturnLeftIcon,
  BoltIcon,
  CheckCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  ClockIcon,
  PauseCircleIcon,
  PlayIcon,
  PlusIcon,
  ServerIcon,
  SignalSlashIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { FC, memo, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import { formatRate } from "./LiveTraffic";

type Stage = {
  ip: string;
  threshold_kbps: number;
  minutes: number;
  start_kbps: number;
  start_minutes: number;
};
type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  host_ids: number[];
  nodes: string[];
  require_online: boolean;
  stages: Stage[];
  stage: number;
  armed_at: number;
  last_change: number;
};
type Host = { id: number; remark: string; address: string; inbound_tag: string; disabled: boolean };
type NodeStatus = {
  node: string;
  key: string;
  connected: boolean;
  answering: boolean;
  live_rate: number;
  low_since: number | null;
  low_for: number;
};
type RuleStatus = {
  paused: string | null;
  stage: number;
  phase: "watching" | "starting" | "finished";
  start: { elapsed: number; best_rate: number; ready: boolean } | null;
  nodes: NodeStatus[];
};
type Status = {
  now: number;
  rules: Record<string, RuleStatus>;
  current?: Record<string, { stage: number; armed_at: number; last_change: number }>;
  log_size?: number;
};
type State = {
  rules: Rule[];
  log: { time: number; rule: string; node: string; old: string; new: string; reason: string; stage?: number }[];
  hosts: Host[];
  nodes: { key: string; name: string }[];
  status: Status;
};

const newStage = (prev?: Stage): Stage => ({
  ip: "",
  threshold_kbps: prev?.threshold_kbps ?? 1,
  minutes: prev?.minutes ?? 5,
  start_kbps: 0,
  start_minutes: 0,
});
const newRule = (): Rule => ({
  id: "",
  name: "",
  enabled: true,
  host_ids: [],
  nodes: [],
  require_online: false,
  stages: [newStage()],
  stage: 0,
  armed_at: 0,
  last_change: 0,
});

const card = {
  borderRadius: "20px",
  bg: "var(--app-surface)",
  boxShadow: "0 1px 2px rgba(16,24,40,0.04), 0 4px 16px rgba(16,24,40,0.05)",
  borderWidth: "1px",
  borderColor: "blackAlpha.100",
  _dark: { bg: "gray.750", borderColor: "whiteAlpha.100", boxShadow: "0 4px 18px rgba(0,0,0,0.25)" },
} as const;

const soft = {
  borderRadius: "14px",
  bg: "blackAlpha.50",
  _dark: { bg: "whiteAlpha.50" },
} as const;

const clock = (s: number) => {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  return `${h ? h + ":" : ""}${mm}:${String(sec).padStart(2, "0")}`;
};

/** seconds on the server clock, ticking every second */
const useServerNow = (offset: number) => {
  const [now, setNow] = useState(() => Date.now() / 1000 + offset);
  useEffect(() => {
    setNow(Date.now() / 1000 + offset);
    const id = window.setInterval(() => setNow(Date.now() / 1000 + offset), 1000);
    return () => window.clearInterval(id);
  }, [offset]);
  return now;
};

const Label: FC<{ children: ReactNode; help?: string }> = ({ children, help }) => (
  <Box mb={2}>
    <Text fontSize="sm" fontWeight="medium">
      {children}
    </Text>
    {help && (
      <Text fontSize="xs" color="gray.500">
        {help}
      </Text>
    )}
  </Box>
);

const Chip: FC<{ on: boolean; onClick: () => void; children: ReactNode; title?: string }> = ({ on, onClick, children, title }) => (
  <Button
    size="xs"
    h="26px"
    px={3}
    borderRadius="full"
    fontWeight="medium"
    variant="unstyled"
    display="inline-flex"
    onClick={onClick}
    title={title}
    maxW="100%"
    transition="background-color .15s, color .15s"
    bg={on ? "primary.500" : "blackAlpha.50"}
    color={on ? "white" : undefined}
    _hover={{ bg: on ? "primary.600" : "blackAlpha.100" }}
    _dark={{ bg: on ? "primary.500" : "whiteAlpha.100", _hover: { bg: on ? "primary.400" : "whiteAlpha.200" } }}
  >
    <Text as="span" isTruncated>
      {children}
    </Text>
  </Button>
);

type Tone = "green" | "orange" | "red" | "gray" | "primary";
const toneColor: Record<Tone, string> = {
  green: "green.400",
  orange: "orange.400",
  red: "red.400",
  gray: "gray.400",
  primary: "primary.400",
};

const Pill: FC<{ tone: Tone; icon: any; children: ReactNode }> = ({ tone, icon, children }) => (
  <HStack
    spacing={1.5}
    px={2.5}
    h="24px"
    borderRadius="full"
    fontSize="xs"
    fontWeight="medium"
    // the accent palette is built at runtime and its light shades are strong,
    // so tint with a mix instead of primary.50 / primary.900
    sx={{ background: `color-mix(in srgb, var(--chakra-colors-${tone}-500) 14%, transparent)` }}
    color={`${tone}.600`}
    _dark={{ color: `${tone}.200` }}
    flexShrink={0}
    whiteSpace="nowrap"
  >
    <Icon as={icon} boxSize="14px" />
    <Text as="span">{children}</Text>
  </HStack>
);

const Bar: FC<{ value: number; color: string; dim?: boolean }> = ({ value, color, dim }) => (
  <Box h="6px" borderRadius="full" bg="blackAlpha.100" _dark={{ bg: "whiteAlpha.100" }} overflow="hidden">
    <Box
      h="100%"
      borderRadius="full"
      bg={color}
      w="100%"
      transformOrigin="left"
      transform={`scaleX(${Math.min(1, Math.max(0.02, value))})`}
      opacity={dim ? 0.35 : 1}
      transition="transform 1s linear, background-color .3s"
    />
  </Box>
);

/** one watched node of the active stage: live speed and, while under the
 *  threshold, the countdown to the switch */
const NodeTimer: FC<{ s: NodeStatus; stage: Stage; paused: string | null; offset: number }> = memo(
  ({ s, stage, paused, offset }) => {
    const { t } = useTranslation();
    const now = useServerNow(offset);
    const window = stage.minutes * 60;
    const low = s.low_since !== null;
    const elapsed = low ? Math.min(window, now - (s.low_since as number)) : 0;
    const left = window - elapsed;
    const progress = low ? elapsed / window : 0;
    let tone: Tone = "green";
    let label = t("autoChange.trafficOk");
    let icon: any = CheckCircleIcon;
    if (!s.connected || !s.answering) {
      tone = "gray";
      label = t("autoChange.notAnswering");
      icon = SignalSlashIcon;
    } else if (low && paused) {
      tone = "gray";
      label = t(`autoChange.paused.${paused}`);
      icon = PauseCircleIcon;
    } else if (low && left <= 0) {
      tone = "red";
      label = t("autoChange.switching");
      icon = BoltIcon;
    } else if (low) {
      tone = progress > 0.66 ? "red" : "orange";
      label = t("autoChange.lowFor", { time: clock(elapsed) });
      icon = ClockIcon;
    }
    const counting = low && !paused && s.connected && s.answering;
    return (
      <Box {...soft} px={4} py={3}>
        <HStack spacing={3} flexWrap="wrap" rowGap={2}>
          <HStack spacing={2} minW="140px" flex="1">
            <Box w="8px" h="8px" borderRadius="full" bg={s.connected && s.answering ? "green.400" : "gray.400"} />
            <Icon as={ServerIcon} boxSize="16px" opacity={0.7} />
            <Text fontWeight="medium" fontSize="sm" isTruncated>
              {s.node}
            </Text>
          </HStack>
          <Tooltip label={t("autoChange.liveHelp", { threshold: stage.threshold_kbps })} hasArrow>
            <Text fontSize="sm" fontFamily="mono" color={low ? toneColor[tone] : undefined} whiteSpace="nowrap">
              {formatRate(s.live_rate)}
              <Text as="span" color="gray.500" fontSize="xs">
                {" "}
                / {stage.threshold_kbps} KB/s
              </Text>
            </Text>
          </Tooltip>
          <Pill tone={tone} icon={icon}>
            {label}
          </Pill>
          {counting && (
            <Box textAlign="right" minW="84px">
              <Text fontSize="lg" fontWeight="semibold" fontFamily="mono" lineHeight="1" color={toneColor[tone]}>
                {left > 0 ? clock(left) : "0:00"}
              </Text>
              <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                {t("autoChange.untilSwitch")}
              </Text>
            </Box>
          )}
        </HStack>
        <Box mt={3}>
          <Bar value={low ? progress : 1} color={toneColor[tone]} dim={!low} />
        </Box>
      </Box>
    );
  }
);

/** a stage waiting to start: its start conditions, live */
const StartProgress: FC<{ stage: Stage; start: NonNullable<RuleStatus["start"]>; lastChange: number; offset: number }> = memo(
  ({ stage, start, lastChange, offset }) => {
    const { t } = useTranslation();
    const now = useServerNow(offset);
    const elapsed = lastChange ? now - lastChange : start.elapsed;
    return (
      <VStack align="stretch" spacing={2}>
        {stage.start_kbps > 0 && (
          <Box {...soft} px={4} py={3}>
            <HStack spacing={3} mb={2} flexWrap="wrap" fontSize="sm">
              <Icon as={BoltIcon} boxSize="16px" color="primary.400" />
              <Text flex="1">{t("autoChange.startWhenRate", { rate: stage.start_kbps })}</Text>
              <Text fontFamily="mono">
                {formatRate(start.best_rate)}
                <Text as="span" color="gray.500" fontSize="xs">
                  {" "}
                  / {stage.start_kbps} KB/s
                </Text>
              </Text>
            </HStack>
            <Bar value={start.best_rate / (stage.start_kbps * 1024)} color="primary.400" />
          </Box>
        )}
        {stage.start_minutes > 0 && (
          <Box {...soft} px={4} py={3}>
            <HStack spacing={3} mb={2} flexWrap="wrap" fontSize="sm">
              <Icon as={ClockIcon} boxSize="16px" color="primary.400" />
              <Text flex="1">{t("autoChange.startAfter", { minutes: stage.start_minutes })}</Text>
              <Text fontFamily="mono" fontSize="lg" fontWeight="semibold" lineHeight="1" color="primary.400">
                {clock(stage.start_minutes * 60 - elapsed)}
              </Text>
            </HStack>
            <Bar value={elapsed / (stage.start_minutes * 60)} color="primary.400" />
          </Box>
        )}
      </VStack>
    );
  }
);

const conditionText = (t: (k: string, o?: any) => string, st: Stage) =>
  t("autoChange.stageCondition", { threshold: st.threshold_kbps, minutes: st.minutes });

const startText = (t: (k: string, o?: any) => string, st: Stage) => {
  const parts = [];
  if (st.start_kbps > 0) parts.push(t("autoChange.startWhenRate", { rate: st.start_kbps }));
  if (st.start_minutes > 0) parts.push(t("autoChange.startAfter", { minutes: st.start_minutes }));
  return parts.length ? parts.join(` ${t("autoChange.or")} `) : t("autoChange.startAtOnce");
};

/** the chain of stages with where the rule stands */
const Timeline: FC<{ rule: Rule; st?: RuleStatus; offset: number }> = ({ rule, st, offset }) => {
  const { t } = useTranslation();
  const at = st?.stage ?? rule.stage;
  const phase = st?.phase ?? (at >= rule.stages.length ? "finished" : "watching");
  return (
    <VStack align="stretch" spacing={0}>
      {rule.stages.map((stage, i) => {
        const done = i < at;
        const active = i === at && phase !== "finished";
        const last = i === rule.stages.length - 1;
        const dot = done ? "green.400" : active ? "primary.500" : "blackAlpha.200";
        return (
          <HStack key={i} align="stretch" spacing={3}>
            <VStack spacing={0} w="26px" flexShrink={0}>
              <Box
                w="26px"
                h="26px"
                borderRadius="full"
                display="flex"
                alignItems="center"
                justifyContent="center"
                fontSize="xs"
                fontWeight="semibold"
                bg={dot}
                color={done || active ? "white" : "gray.500"}
                _dark={!done && !active ? { bg: "whiteAlpha.200" } : {}}
                boxShadow={
                  active ? "0 0 0 4px color-mix(in srgb, var(--chakra-colors-primary-500) 22%, transparent)" : undefined
                }
              >
                {done ? <CheckIcon width={14} strokeWidth={2.5} /> : i + 1}
              </Box>
              {!last && <Box flex="1" w="2px" minH="14px" bg={done ? "green.400" : "blackAlpha.100"} _dark={!done ? { bg: "whiteAlpha.100" } : {}} />}
            </VStack>
            <Box flex="1" pb={last ? 0 : 4} minW={0}>
              <HStack spacing={2} flexWrap="wrap" rowGap={1} minH="26px">
                <Text fontWeight="semibold" fontSize="sm">
                  {t("autoChange.stageN", { n: i + 1 })}
                </Text>
                <HStack spacing={1} fontFamily="mono" fontSize="sm">
                  <ArrowRightIcon width={12} />
                  <Text>{stage.ip || "—"}</Text>
                </HStack>
                {done && <Pill tone="green" icon={CheckCircleIcon}>{t("autoChange.stageDone")}</Pill>}
                {active && phase === "watching" && (
                  <Pill tone="primary" icon={PlayIcon}>{t("autoChange.stageWatching")}</Pill>
                )}
                {active && phase === "starting" && (
                  <Pill tone="orange" icon={ClockIcon}>{t("autoChange.stageStarting")}</Pill>
                )}
              </HStack>
              <Text fontSize="xs" color="gray.500">
                {conditionText(t, stage)}
                {i > 0 && ` · ${t("autoChange.starts")}: ${startText(t, stage)}`}
              </Text>
              {active && st && (
                <Box mt={3}>
                  {phase === "starting" && st.start ? (
                    <StartProgress stage={stage} start={st.start} lastChange={rule.last_change} offset={offset} />
                  ) : st.nodes.length === 0 ? (
                    <HStack {...soft} px={4} py={3} spacing={2} fontSize="sm" color="gray.500">
                      <Icon as={st.paused ? PauseCircleIcon : ClockIcon} boxSize="16px" />
                      <Text>{st.paused ? t(`autoChange.paused.${st.paused}`) : t("autoChange.noData")}</Text>
                    </HStack>
                  ) : (
                    <VStack align="stretch" spacing={2}>
                      {st.nodes.map((s) => (
                        <NodeTimer key={s.key} s={s} stage={stage} paused={st.paused} offset={offset} />
                      ))}
                    </VStack>
                  )}
                </Box>
              )}
            </Box>
          </HStack>
        );
      })}
      {phase === "finished" && rule.stages.length > 0 && (
        <HStack {...soft} mt={4} px={4} py={3} spacing={2} fontSize="sm">
          <Icon as={CheckCircleIcon} boxSize="18px" color="green.400" />
          <Text>{t("autoChange.finished")}</Text>
        </HStack>
      )}
    </VStack>
  );
};

const Num: FC<{ value: number; onChange: (n: number) => void; min?: number; max?: number; w?: string }> = ({
  value,
  onChange,
  min = 0,
  max,
  w = "80px",
}) => (
  <NumberInput size="sm" w={w} min={min} max={max} value={value} onChange={(_, n) => onChange(Number.isNaN(n) ? min : n)}>
    <NumberInputField borderRadius="10px" />
  </NumberInput>
);

const StageEditor: FC<{ stage: Stage; index: number; onChange: (s: Stage) => void; onDelete?: () => void }> = ({
  stage,
  index,
  onChange,
  onDelete,
}) => {
  const { t } = useTranslation();
  const set = (p: Partial<Stage>) => onChange({ ...stage, ...p });
  return (
    <Box {...soft} p={4}>
      <HStack mb={3}>
        <Box
          w="22px"
          h="22px"
          borderRadius="full"
          bg="primary.500"
          color="white"
          fontSize="xs"
          fontWeight="semibold"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          {index + 1}
        </Box>
        <Text fontWeight="semibold" fontSize="sm" flex="1">
          {t("autoChange.stageN", { n: index + 1 })}
        </Text>
        {onDelete && (
          <IconButton size="xs" variant="ghost" borderRadius="full" aria-label="remove" icon={<XMarkIcon width={16} />} onClick={onDelete} />
        )}
      </HStack>
      <VStack align="stretch" spacing={3} fontSize="sm">
        {index > 0 && (
          <Box>
            <Text fontSize="xs" color="gray.500" mb={1.5}>
              {t("autoChange.startsWhen")}
            </Text>
            <HStack spacing={2} flexWrap="wrap" rowGap={2}>
              <Text>{t("autoChange.prevIpCarries")}</Text>
              <Num value={stage.start_kbps} onChange={(n) => set({ start_kbps: n })} />
              <Text>KB/s</Text>
              <Text color="gray.500">{t("autoChange.or")}</Text>
              <Num value={stage.start_minutes} max={1440} onChange={(n) => set({ start_minutes: n })} />
              <Text>{t("autoChange.minutesPassed")}</Text>
            </HStack>
            <Text fontSize="xs" color="gray.500" mt={1}>
              {t("autoChange.startsHelp")}
            </Text>
          </Box>
        )}
        <Box>
          <Text fontSize="xs" color="gray.500" mb={1.5}>
            {t("autoChange.firesWhen")}
          </Text>
          <HStack spacing={2} flexWrap="wrap" rowGap={2}>
            <Text>{t("autoChange.under")}</Text>
            <Num w="90px" value={stage.threshold_kbps} onChange={(n) => set({ threshold_kbps: n })} />
            <Text>KB/s</Text>
            <Text>{t("autoChange.for")}</Text>
            <Num value={stage.minutes} min={1} max={1440} onChange={(n) => set({ minutes: n })} />
            <Text>{t("autoChange.minutes")}</Text>
          </HStack>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.500" mb={1.5}>
            {t("autoChange.switchTo")}
          </Text>
          <Input
            size="sm"
            borderRadius="10px"
            fontFamily="mono"
            placeholder="1.2.3.4 / cdn.example.com"
            value={stage.ip}
            onChange={(e) => set({ ip: e.target.value })}
          />
        </Box>
      </VStack>
    </Box>
  );
};

const RuleCard: FC<{
  rule: Rule;
  state: State;
  status?: RuleStatus;
  offset: number;
  onChange: (r: Rule) => void;
  onDelete: () => void;
  onSwitch: () => void;
  onReset: () => void;
  busy: boolean;
}> = ({ rule, state, status, offset, onChange, onDelete, onSwitch, onReset, busy }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(!rule.id);
  const set = (p: Partial<Rule>) => onChange({ ...rule, ...p });
  const byTag = useMemo(() => {
    const m: Record<string, Host[]> = {};
    state.hosts.forEach((h) => (m[h.inbound_tag] = [...(m[h.inbound_tag] || []), h]));
    return m;
  }, [state.hosts]);
  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const finished = (status?.phase ?? "") === "finished";
  const setStage = (i: number, s: Stage) => set({ stages: rule.stages.map((x, n) => (n === i ? s : x)) });

  return (
    <Box {...card} overflow="hidden" opacity={rule.enabled ? 1 : 0.75} transition="opacity .2s">
      <HStack spacing={2} px={5} pt={4} pb={3}>
        <Switch colorScheme="primary" isChecked={rule.enabled} onChange={(e) => set({ enabled: e.target.checked })} mr={1} />
        <Input
          variant="unstyled"
          fontWeight="semibold"
          fontSize="md"
          placeholder={t("autoChange.namePlaceholder")}
          value={rule.name}
          onChange={(e) => set({ name: e.target.value })}
        />
        <Tooltip label={t("autoChange.switchNow")} hasArrow>
          <IconButton
            size="sm"
            variant="ghost"
            borderRadius="full"
            aria-label="switch"
            icon={<ArrowsRightLeftIcon width={18} />}
            isLoading={busy}
            isDisabled={!rule.id || finished}
            onClick={onSwitch}
          />
        </Tooltip>
        <Tooltip label={t("autoChange.reset")} hasArrow>
          <IconButton
            size="sm"
            variant="ghost"
            borderRadius="full"
            aria-label="reset"
            icon={<ArrowUturnLeftIcon width={18} />}
            isDisabled={!rule.id || busy}
            onClick={onReset}
          />
        </Tooltip>
        <IconButton
          size="sm"
          variant="ghost"
          borderRadius="full"
          colorScheme="red"
          aria-label="delete"
          icon={<TrashIcon width={18} />}
          onClick={onDelete}
        />
      </HStack>

      <Box px={5} pb={5}>
        <Text fontSize="xs" color="gray.500" mb={4}>
          {t("autoChange.summary", { hosts: rule.host_ids.length })}
          {rule.last_change > 0 && ` · ${t("autoChange.lastSwitch")} ${dayjs.unix(rule.last_change).fromNow()}`}
        </Text>
        {rule.id ? (
          <Timeline rule={rule} st={status} offset={offset} />
        ) : (
          <Text fontSize="sm" color="gray.500">
            {t("autoChange.saveToStart")}
          </Text>
        )}
      </Box>

      <Button
        variant="unstyled"
        w="full"
        h="auto"
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        px={5}
        py={2.5}
        borderTopWidth="1px"
        borderColor="blackAlpha.100"
        _dark={{ borderColor: "whiteAlpha.100" }}
        borderRadius={0}
        fontSize="sm"
        fontWeight="medium"
        color="gray.500"
        _hover={{ color: "primary.500" }}
        onClick={() => setOpen((o) => !o)}
      >
        <Text as="span">{t("autoChange.settings")}</Text>
        <Icon as={ChevronDownIcon} boxSize="16px" transform={open ? "rotate(180deg)" : undefined} transition="transform .2s" />
      </Button>

      <Collapse in={open} animateOpacity unmountOnExit>
        <VStack align="stretch" spacing={5} px={5} pb={5} pt={1}>
          <Box>
            <Label help={t("autoChange.hostsHelp")}>{t("autoChange.hosts")}</Label>
            <VStack align="stretch" spacing={3}>
              {Object.entries(byTag).map(([tag, hosts]) => (
                <Box key={tag}>
                  <Text fontSize="xs" color="gray.500" mb={1.5}>
                    {tag}
                  </Text>
                  <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
                    {hosts.map((h) => (
                      <Chip
                        key={h.id}
                        on={rule.host_ids.includes(h.id)}
                        title={`${h.remark}\n${h.address}`}
                        onClick={() => set({ host_ids: toggle(rule.host_ids, h.id) })}
                      >
                        {h.remark.length > 28 ? h.remark.slice(0, 28) + "…" : h.remark} · {h.address}
                      </Chip>
                    ))}
                  </HStack>
                </Box>
              ))}
            </VStack>
          </Box>

          <Box>
            <Label help={t("autoChange.nodesHelp")}>{t("autoChange.nodes")}</Label>
            <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
              <Chip on={rule.nodes.length === 0} onClick={() => set({ nodes: [] })}>
                {t("autoChange.anyNode")}
              </Chip>
              {state.nodes.map((n) => (
                <Chip key={n.key} on={rule.nodes.includes(n.key)} onClick={() => set({ nodes: toggle(rule.nodes, n.key) })}>
                  {n.name}
                </Chip>
              ))}
            </HStack>
          </Box>

          <HStack {...soft} p={3} spacing={3} align="flex-start">
            <Switch
              size="sm"
              mt={0.5}
              colorScheme="primary"
              isChecked={rule.require_online}
              onChange={(e) => set({ require_online: e.target.checked })}
            />
            <Box>
              <Text fontSize="sm">{t("autoChange.requireOnline")}</Text>
              <Text fontSize="xs" color="gray.500">
                {t("autoChange.requireOnlineHelp")}
              </Text>
            </Box>
          </HStack>

          <Box>
            <Label help={t("autoChange.stagesHelp")}>{t("autoChange.stages")}</Label>
            <VStack align="stretch" spacing={3}>
              {rule.stages.map((s, i) => (
                <StageEditor
                  key={i}
                  stage={s}
                  index={i}
                  onChange={(next) => setStage(i, next)}
                  onDelete={rule.stages.length > 1 ? () => set({ stages: rule.stages.filter((_, n) => n !== i) }) : undefined}
                />
              ))}
              <Button
                size="sm"
                variant="ghost"
                borderRadius="full"
                alignSelf="flex-start"
                leftIcon={<PlusIcon width={16} />}
                onClick={() => set({ stages: [...rule.stages, newStage(rule.stages[rule.stages.length - 1])] })}
              >
                {t("autoChange.addStage")}
              </Button>
            </VStack>
          </Box>
        </VStack>
      </Collapse>
    </Box>
  );
};

export const AutoChangePage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, refetch } = useQuery<State>({
    queryKey: "auto-change",
    queryFn: () => fetch("/auto-change"),
    refetchOnWindowFocus: false,
  });
  const { data: live, refetch: refetchLive } = useQuery<Status>({
    queryKey: "auto-change-status",
    queryFn: () => fetch("/auto-change/status"),
    refetchInterval: 4000,
    refetchOnWindowFocus: false,
  });
  const [rules, setRules] = useState<Rule[] | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState("");

  useEffect(() => {
    if (data && !dirty) setRules(data.rules);
  }, [data]);

  // a switch happened (the job or someone else): reload the rules and the log
  const logSize = useRef<number | undefined>();
  useEffect(() => {
    if (live?.log_size === undefined) return;
    if (logSize.current !== undefined && logSize.current !== live.log_size && !dirty) refetch();
    logSize.current = live.log_size;
  }, [live?.log_size]);

  const status = live || data?.status;
  // server clock minus ours, so countdowns don't drift with a wrong local clock
  const offset = useMemo(() => (status ? Math.round(status.now - Date.now() / 1000) : 0), [status?.now]);

  const fail = (e: any) =>
    toast({ title: e?.response?._data?.detail || e?.message || "Error", status: "error", position: "top", duration: 4000 });
  const update = (list: Rule[]) => {
    setRules(list);
    setDirty(true);
  };
  const save = () => {
    setSaving(true);
    fetch("/auto-change", { method: "PUT", body: { rules } })
      .then((d: State) => {
        setDirty(false);
        setRules(d.rules);
        refetch();
        toast({ title: t("autoChange.saved"), status: "success", position: "top", duration: 2000 });
      })
      .catch(fail)
      .finally(() => setSaving(false));
  };
  const act = (id: string, what: "switch" | "reset") => {
    setSwitching(id);
    fetch(`/auto-change/${id}/${what}`, { method: "POST" })
      .then(() => {
        refetch();
        refetchLive();
      })
      .catch(fail)
      .finally(() => setSwitching(""));
  };

  if (!data || !rules) return null;

  return (
    <VStack align="stretch" spacing={5} maxW="1100px">
      <HStack spacing={4} align="center" flexWrap="wrap" rowGap={3}>
        <Box flex="1" minW="240px">
          <Text fontSize="sm" color="gray.500" maxW="720px">
            {t("autoChange.help")}
          </Text>
        </Box>
        <Button
          size="sm"
          variant="ghost"
          borderRadius="full"
          leftIcon={<PlusIcon width={16} />}
          onClick={() => update([...rules, newRule()])}
        >
          {t("autoChange.addRule")}
        </Button>
        <Button
          size="sm"
          colorScheme="primary"
          borderRadius="full"
          px={5}
          isLoading={saving}
          isDisabled={!dirty}
          onClick={save}
        >
          {dirty ? t("autoChange.saveChanges") : t("autoChange.save")}
        </Button>
      </HStack>

      {rules.length === 0 && (
        <VStack {...card} py={10} spacing={3} color="gray.500">
          <Icon as={ArrowsRightLeftIcon} boxSize="28px" />
          <Text fontSize="sm">{t("autoChange.empty")}</Text>
          <Button size="sm" colorScheme="primary" borderRadius="full" leftIcon={<PlusIcon width={16} />} onClick={() => update([newRule()])}>
            {t("autoChange.addRule")}
          </Button>
        </VStack>
      )}

      {rules.map((r, i) => (
        <RuleCard
          key={r.id || `new-${i}`}
          rule={{ ...r, ...(live?.current?.[r.id] || {}) }}
          state={data}
          status={status?.rules[r.id]}
          offset={offset}
          busy={switching === r.id}
          onChange={(next) => update(rules.map((x, n) => (n === i ? next : x)))}
          onDelete={() => update(rules.filter((_, n) => n !== i))}
          onSwitch={() => act(r.id, "switch")}
          onReset={() => act(r.id, "reset")}
        />
      ))}

      <Box {...card} p={5}>
        <Text fontWeight="semibold" fontSize="sm" mb={3}>
          {t("autoChange.log")}
        </Text>
        {data.log.length === 0 ? (
          <Text fontSize="sm" color="gray.500">
            {t("autoChange.noLog")}
          </Text>
        ) : (
          <VStack align="stretch" spacing={0}>
            {data.log.slice(0, 30).map((e, i) => (
              <HStack
                key={i}
                spacing={3}
                py={2.5}
                fontSize="sm"
                flexWrap="wrap"
                rowGap={1}
                borderTopWidth={i ? "1px" : 0}
                borderColor="blackAlpha.100"
                _dark={{ borderColor: "whiteAlpha.100" }}
              >
                <Box
                  w="8px"
                  h="8px"
                  borderRadius="full"
                  bg={e.reason === "manual" ? "primary.400" : "orange.400"}
                  flexShrink={0}
                />
                <Text color="gray.500" fontSize="xs" minW="96px" title={dayjs.unix(e.time).format("YYYY-MM-DD HH:mm:ss")}>
                  {dayjs.unix(e.time).format("DD.MM HH:mm")}
                </Text>
                <Text fontWeight="medium">
                  {e.rule}
                  {e.stage ? (
                    <Text as="span" color="gray.500" fontWeight="normal">
                      {" "}
                      · {t("autoChange.stageN", { n: e.stage })}
                    </Text>
                  ) : null}
                </Text>
                <HStack spacing={1.5} fontFamily="mono" fontSize="xs">
                  <Text opacity={0.7}>{e.old}</Text>
                  <ArrowRightIcon width={12} />
                  <Text fontWeight="semibold">{e.new}</Text>
                </HStack>
                <Text color="gray.500" fontSize="xs" flex="1" textAlign="right" minW="120px">
                  {e.reason === "manual" ? t("autoChange.manual") : e.reason}
                </Text>
              </HStack>
            ))}
          </VStack>
        )}
      </Box>
    </VStack>
  );
};
