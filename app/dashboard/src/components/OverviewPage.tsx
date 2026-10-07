import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  CircularProgress,
  HStack,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorMode,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowTrendingUpIcon,
  ChartBarIcon,
  ChartPieIcon,
  ClockIcon,
  SignalIcon,
  UserPlusIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { ApexOptions } from "apexcharts";
import dayjs from "dayjs";
import { FC, lazy, ReactNode, Suspense, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import { generateDistinctColors } from "utils/color";
import { formatBytes as rawFormatBytes } from "utils/formatByte";
const formatBytes = (v: number, d = 2) => String(rawFormatBytes(v, d));
import { flagEmoji } from "utils/flags";

const Chart = lazy(() => import("react-apexcharts"));

type Series = number[];
type Overview = {
  period: string;
  unit: "hour" | "day";
  points: number[];
  users: { total: number; by_status: Record<string, number>; online: number; online_ips: number; expiring: number; created: number };
  traffic: { total: number; series: Series; by_node: { name: string; total: number; series: Series }[] };
  protocols: { protocol: string; traffic: number }[];
  protocols_from_history: boolean;
  protocol_series: { protocol: string; series: Series }[];
  online_series: Series;
  online_ips_series: Series;
  status_series: Record<string, (number | null)[]>;
  top_users: { username: string; admin: string | null; traffic: number }[];
  servers: { id: number | null; name: string; status: string; flag: string; traffic: number; online: number }[];
  system: null | { cpu: number; cores: number; mem_used: number; mem_total: number; disk_used: number; disk_total: number; uptime: number };
};

const PERIODS = ["24h", "7d", "30d", "90d", "365d"];
const STATUS_COLORS: Record<string, string> = {
  active: "#3fb68b",
  on_hold: "#2fb3c6",
  limited: "#e9a23b",
  expired: "#ef7a6b",
  disabled: "#62708a",
};
const PROTOCOL_LABEL: Record<string, string> = {
  "vless-reality": "VLESS Reality",
  "vless-tcp": "VLESS TCP",
  "vless-ws": "VLESS WS",
  "vless-grpc": "VLESS gRPC",
  "vless-xhttp": "VLESS XHTTP",
  "vless-httpupgrade": "VLESS HTTPUpgrade",
  "vmess-tcp": "VMess TCP",
  "vmess-ws": "VMess WS",
  "vmess-grpc": "VMess gRPC",
  "trojan-tcp": "Trojan TCP",
  "trojan-ws": "Trojan WS",
  "trojan-grpc": "Trojan gRPC",
  shadowsocks: "Shadowsocks",
  hysteria: "Hysteria2",
  hysteria2: "Hysteria2",
  wireguard: "WireGuard",
  amneziawg: "AmneziaWG",
  openvpn: "OpenVPN",
};
const protoLabel = (p: string) => PROTOCOL_LABEL[p] || p.replace(/-/g, " ").toUpperCase();

const surface = {
  borderWidth: "1px",
  borderColor: "light-border",
  borderRadius: "16px",
  bg: "var(--app-surface)",
  boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.04)",
  _dark: { borderColor: "gray.700", bg: "gray.750", boxShadow: "none" },
} as const;

const Card: FC<{ title: string; right?: ReactNode; children: ReactNode; minH?: string }> = ({ title, right, children, minH }) => (
  <Box {...surface} p={{ base: 4, md: 5 }} minW={0} minH={minH}>
    <HStack justifyContent="space-between" mb={3} spacing={2}>
      <Text fontWeight="semibold" fontSize="sm">
        {title}
      </Text>
      {right}
    </HStack>
    {children}
  </Box>
);

const Stat: FC<{ icon: any; label: string; value: ReactNode; sub?: ReactNode; color?: string }> = ({ icon: I, label, value, sub, color = "primary" }) => (
  <Box {...surface} p={4} minW={0}>
    <HStack spacing={3} alignItems="flex-start">
      <Box p={2} borderRadius="12px" bg={`${color}.50`} color={`${color}.500`} _dark={{ bg: "whiteAlpha.100", color: `${color}.300` }}>
        <I width={20} height={20} />
      </Box>
      <Box minW={0}>
        <Text fontSize="xs" color="gray.500" noOfLines={2}>
          {label}
        </Text>
        <Text fontSize="xl" fontWeight="bold" lineHeight="1.3">
          {value}
        </Text>
        {sub && (
          <Text fontSize="xs" color="gray.500" noOfLines={1}>
            {sub}
          </Text>
        )}
      </Box>
    </HStack>
  </Box>
);

type Kind = "donut" | "bar";
const KindToggle: FC<{ value: string; options: { v: string; icon: any }[]; onChange: (v: any) => void }> = ({ value, options, onChange }) => (
  <ButtonGroup size="xs" isAttached variant="outline">
    {options.map(({ v, icon: I }) => (
      <Button key={v} aria-label={v} variant={value === v ? "solid" : "outline"} colorScheme="primary" onClick={() => onChange(v)}>
        <I width={14} height={14} />
      </Button>
    ))}
  </ButtonGroup>
);
const DIST_KINDS = [
  { v: "donut", icon: ChartPieIcon },
  { v: "bar", icon: ChartBarIcon },
];
const TIME_KINDS = [
  { v: "area", icon: ArrowTrendingUpIcon },
  { v: "bar", icon: ChartBarIcon },
];

const useBase = () => {
  const { colorMode } = useColorMode();
  return (extra: ApexOptions = {}): ApexOptions => ({
    chart: { background: "transparent", toolbar: { show: false }, fontFamily: "inherit", animations: { enabled: true, speed: 350 }, ...(extra.chart || {}) },
    theme: { mode: colorMode === "dark" ? "dark" : "light" },
    grid: { borderColor: colorMode === "dark" ? "rgba(255,255,255,.07)" : "rgba(16,24,40,.07)", strokeDashArray: 4 },
    dataLabels: { enabled: false },
    legend: { position: "bottom", fontSize: "12px", markers: { radius: 6 } as any },
    stroke: { width: 2, curve: "smooth" },
    tooltip: { theme: colorMode === "dark" ? "dark" : "light" },
    ...extra,
  });
};

// pie / donut or horizontal bars for a share (users per status, protocols, servers)
const Distribution: FC<{ labels: string[]; values: number[]; colors?: string[]; kind: Kind; bytes?: boolean; empty: string }> = ({ labels, values, colors, kind, bytes, empty }) => {
  const base = useBase();
  const fmt = (v: number) => (bytes ? formatBytes(v, 1) : String(v));
  if (!values.some(Boolean))
    return (
      <Text fontSize="sm" color="gray.500" py={10} textAlign="center">
        {empty}
      </Text>
    );
  const palette = colors || generateDistinctColors(labels.length);
  const options =
    kind === "donut"
      ? base({
          labels,
          colors: palette,
          stroke: { width: 0 },
          plotOptions: { pie: { donut: { size: "68%", labels: { show: true, total: { show: true, label: "", formatter: (w: any) => fmt(w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0)) }, value: { formatter: (v: any) => fmt(Number(v)) } } } } },
          tooltip: { y: { formatter: (v: number) => fmt(v) } },
        })
      : base({
          colors: palette,
          plotOptions: { bar: { horizontal: true, borderRadius: 6, distributed: true, barHeight: "62%" } },
          xaxis: { categories: labels, labels: { formatter: (v: any) => fmt(Number(v)) } },
          legend: { show: false },
          tooltip: { y: { formatter: (v: number) => fmt(v) } },
        });
  const series = kind === "donut" ? values : [{ name: "", data: values }];
  return (
    <Suspense fallback={<CircularProgress isIndeterminate size="24px" />}>
      <Chart key={kind} type={kind} options={options} series={series as any} height={kind === "donut" ? 280 : Math.max(160, labels.length * 38)} />
    </Suspense>
  );
};

export const OverviewPage: FC = () => {
  const { t } = useTranslation();
  const base = useBase();
  const [period, setPeriod] = useState("24h");
  const [trafficKind, setTrafficKind] = useState<"area" | "bar">("area");
  const [perServer, setPerServer] = useState(true);
  const [statusKind, setStatusKind] = useState<Kind>("donut");
  const [protoKind, setProtoKind] = useState<Kind>("donut");
  const [serverKind, setServerKind] = useState<Kind>("donut");
  const tz = -new Date().getTimezoneOffset();
  const { data } = useQuery<Overview>({
    queryKey: ["overview", period],
    queryFn: () => fetch(`/overview?period=${period}&tz=${tz}`),
    refetchInterval: 60000,
    keepPreviousData: true,
  });

  const categories = useMemo(
    () => (data?.points || []).map((p) => dayjs.unix(p).format(data?.unit === "hour" ? (period === "24h" ? "HH:mm" : "DD MMM HH:mm") : "DD MMM")),
    [data, period]
  );

  if (!data) return null;
  const by = data.users.by_status;
  const statuses = ["active", "on_hold", "limited", "expired", "disabled"];
  const isSudo = !!data.system;

  const trafficSeries = perServer && data.traffic.by_node.length > 1
    ? data.traffic.by_node.map((n) => ({ name: n.name, data: n.series }))
    : [{ name: t("overview.traffic"), data: data.traffic.series }];
  const trafficOptions = base({
    chart: { type: trafficKind, stacked: true, toolbar: { show: false }, background: "transparent", fontFamily: "inherit" },
    colors: generateDistinctColors(trafficSeries.length),
    xaxis: { categories, tickAmount: 8, labels: { rotate: 0, hideOverlappingLabels: true } },
    yaxis: { labels: { formatter: (v: number) => formatBytes(v, 0) } },
    tooltip: { y: { formatter: (v: number) => formatBytes(v, 2) } },
    fill: trafficKind === "area" ? { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.02 } } : { opacity: 0.9 },
    plotOptions: { bar: { borderRadius: 3, columnWidth: "70%" } },
  });
  const onlineOptions = base({
    colors: ["#5b7cfa", "#2fb3c6"],
    xaxis: { categories, tickAmount: 8, labels: { rotate: 0, hideOverlappingLabels: true } },
    yaxis: { labels: { formatter: (v: number) => String(Math.round(v)) } },
    fill: { type: "gradient", gradient: { opacityFrom: 0.3, opacityTo: 0.02 } },
  });
  const protoSeriesOptions = base({
    chart: { type: "area", stacked: true, toolbar: { show: false }, background: "transparent", fontFamily: "inherit" },
    colors: generateDistinctColors(data.protocol_series.length),
    xaxis: { categories, tickAmount: 8, labels: { rotate: 0, hideOverlappingLabels: true } },
    yaxis: { labels: { formatter: (v: number) => formatBytes(v, 0) } },
    tooltip: { y: { formatter: (v: number) => formatBytes(v, 2) } },
    fill: { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.02 } },
  });

  return (
    <VStack align="stretch" spacing={4}>
      <HStack justifyContent="space-between" flexWrap="wrap" rowGap={2}>
        <Text fontSize="sm" color="gray.500">
          {t("overview.help")}
        </Text>
        <ButtonGroup size="sm" isAttached variant="outline">
          {PERIODS.map((p) => (
            <Button key={p} colorScheme="primary" variant={period === p ? "solid" : "outline"} onClick={() => setPeriod(p)}>
              {t(`overview.period.${p}`)}
            </Button>
          ))}
        </ButtonGroup>
      </HStack>

      <SimpleGrid columns={{ base: 2, md: 3, "2xl": 6 }} spacing={3}>
        <Stat icon={UsersIcon} label={t("overview.users")} value={data.users.total} sub={t("overview.activeOf", { n: by.active || 0 })} />
        <Stat icon={SignalIcon} color="green" label={t("overview.onlineNow")} value={data.users.online} sub={t("overview.ips", { n: data.users.online_ips })} />
        <Stat icon={ArrowTrendingUpIcon} color="purple" label={t("overview.trafficIn", { period: t(`overview.period.${period}`) })} value={formatBytes(data.traffic.total, 1)} />
        <Stat icon={ClockIcon} color="orange" label={t("overview.expiring")} value={data.users.expiring} sub={t("overview.expiringHelp")} />
        <Stat icon={UserPlusIcon} color="cyan" label={t("overview.created")} value={data.users.created} sub={t(`overview.period.${period}`)} />
        <Stat icon={ChartPieIcon} color="red" label={t("overview.inactive")} value={(by.expired || 0) + (by.limited || 0) + (by.disabled || 0)} sub={t("overview.inactiveHelp")} />
      </SimpleGrid>

      <Card
        title={t("overview.trafficOverTime")}
        right={
          <HStack spacing={2}>
            {data.traffic.by_node.length > 1 && (
              <Button size="xs" variant={perServer ? "solid" : "outline"} colorScheme="primary" onClick={() => setPerServer(!perServer)}>
                {t("overview.perServer")}
              </Button>
            )}
            <KindToggle value={trafficKind} options={TIME_KINDS} onChange={setTrafficKind} />
          </HStack>
        }
      >
        <Suspense fallback={<CircularProgress isIndeterminate size="24px" />}>
          <Chart key={trafficKind + String(perServer)} type={trafficKind} options={trafficOptions} series={trafficSeries} height={300} />
        </Suspense>
      </Card>

      <SimpleGrid columns={{ base: 1, lg: 3 }} spacing={4}>
        <Card title={t("overview.usersByStatus")} right={<KindToggle value={statusKind} options={DIST_KINDS} onChange={setStatusKind} />}>
          <Distribution
            kind={statusKind}
            labels={statuses.map((s) => t(`status.${s}`))}
            values={statuses.map((s) => by[s] || 0)}
            colors={statuses.map((s) => STATUS_COLORS[s])}
            empty={t("stats.noData")}
          />
        </Card>
        <Card
          title={t("overview.protocols")}
          right={<KindToggle value={protoKind} options={DIST_KINDS} onChange={setProtoKind} />}
        >
          <Distribution
            kind={protoKind}
            bytes
            labels={data.protocols.map((p) => protoLabel(p.protocol))}
            values={data.protocols.map((p) => p.traffic)}
            empty={t("stats.noData")}
          />
          {!data.protocols_from_history && data.protocols.length > 0 && (
            <Text fontSize="2xs" color="gray.500" mt={1}>
              {t("overview.protocolsLifetime")}
            </Text>
          )}
        </Card>
        <Card title={t("overview.servers")} right={<KindToggle value={serverKind} options={DIST_KINDS} onChange={setServerKind} />}>
          <Distribution
            kind={serverKind}
            bytes
            labels={data.traffic.by_node.map((n) => n.name)}
            values={data.traffic.by_node.map((n) => n.total)}
            empty={t("stats.noData")}
          />
        </Card>
      </SimpleGrid>

      {isSudo && (
        <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4}>
          <Card title={t("overview.onlineOverTime")}>
            <Suspense fallback={<CircularProgress isIndeterminate size="24px" />}>
              <Chart
                type="area"
                options={onlineOptions}
                series={[
                  { name: t("overview.onlineUsers"), data: data.online_series },
                  { name: t("overview.onlineIps"), data: data.online_ips_series },
                ]}
                height={260}
              />
            </Suspense>
          </Card>
          <Card title={t("overview.protocolsOverTime")}>
            {data.protocol_series.length ? (
              <Suspense fallback={<CircularProgress isIndeterminate size="24px" />}>
                <Chart
                  type="area"
                  options={protoSeriesOptions}
                  series={data.protocol_series.map((p) => ({ name: protoLabel(p.protocol), data: p.series }))}
                  height={260}
                />
              </Suspense>
            ) : (
              <Text fontSize="sm" color="gray.500" py={10} textAlign="center">
                {t("overview.historyStarts")}
              </Text>
            )}
          </Card>
        </SimpleGrid>
      )}

      <SimpleGrid columns={{ base: 1, xl: isSudo ? 2 : 1 }} spacing={4} alignItems="start">
        {isSudo && (
          <Card title={t("overview.serverList")}>
            <VStack align="stretch" spacing={2}>
              {data.servers.map((s) => (
                <HStack key={String(s.id)} px={3} py={2} borderRadius="12px" bg="blackAlpha.50" _dark={{ bg: "whiteAlpha.50" }} spacing={3}>
                  <Box w="8px" h="8px" borderRadius="full" flexShrink={0} bg={s.status === "connected" ? "green.400" : s.status === "disabled" ? "gray.400" : "red.400"} />
                  <Text fontSize="lg" lineHeight={1} w="22px" textAlign="center">
                    {flagEmoji(s.flag) || ""}
                  </Text>
                  <Text fontWeight="medium" fontSize="sm" flex={1} isTruncated>
                    {s.name}
                  </Text>
                  <Badge variant="subtle" colorScheme="green">
                    {t("overview.onlineN", { n: s.online })}
                  </Badge>
                  <Text fontSize="sm" color="gray.500" w="84px" textAlign="right">
                    {formatBytes(s.traffic, 1)}
                  </Text>
                </HStack>
              ))}
              {data.system && (
                <Text fontSize="xs" color="gray.500" pt={1}>
                  {t("overview.masterSystem", {
                    cpu: Math.round(data.system.cpu),
                    cores: data.system.cores,
                    mem: formatBytes(data.system.mem_used, 1),
                    memTotal: formatBytes(data.system.mem_total, 1),
                    disk: formatBytes(data.system.disk_used, 0),
                    diskTotal: formatBytes(data.system.disk_total, 0),
                  })}
                </Text>
              )}
            </VStack>
          </Card>
        )}
        <Card title={t("overview.topUsers", { period: t(`overview.period.${period}`) })}>
          {data.top_users.length ? (
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th px={2}>#</Th>
                  <Th px={2}>{t("username")}</Th>
                  {isSudo && <Th px={2}>{t("online.admin")}</Th>}
                  <Th px={2} isNumeric>
                    {t("overview.traffic")}
                  </Th>
                </Tr>
              </Thead>
              <Tbody>
                {data.top_users.map((u, i) => (
                  <Tr key={u.username}>
                    <Td px={2} color="gray.500">
                      {i + 1}
                    </Td>
                    <Td px={2} fontWeight="medium">
                      {u.username}
                    </Td>
                    {isSudo && (
                      <Td px={2} color="gray.500">
                        {u.admin || "—"}
                      </Td>
                    )}
                    <Td px={2} isNumeric>
                      {formatBytes(u.traffic, 1)}
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          ) : (
            <Text fontSize="sm" color="gray.500">
              {t("stats.noData")}
            </Text>
          )}
        </Card>
      </SimpleGrid>
    </VStack>
  );
};

// the history part for the statistics page: traffic and protocols over a chosen period
export const StatsHistory: FC = () => {
  const { t } = useTranslation();
  const base = useBase();
  const [period, setPeriod] = useState("7d");
  const [kind, setKind] = useState<"area" | "bar">("bar");
  const tz = -new Date().getTimezoneOffset();
  const { data } = useQuery<Overview>({
    queryKey: ["overview", period],
    queryFn: () => fetch(`/overview?period=${period}&tz=${tz}`),
    keepPreviousData: true,
  });
  const categories = useMemo(
    () => (data?.points || []).map((p) => dayjs.unix(p).format(data?.unit === "hour" ? (period === "24h" ? "HH:mm" : "DD MMM HH:mm") : "DD MMM")),
    [data, period]
  );
  if (!data) return null;
  const opts = (n: number): ApexOptions =>
    base({
      chart: { type: kind, stacked: true, toolbar: { show: false }, background: "transparent", fontFamily: "inherit" },
      colors: generateDistinctColors(n),
      xaxis: { categories, tickAmount: 8, labels: { rotate: 0, hideOverlappingLabels: true } },
      yaxis: { labels: { formatter: (v: number) => formatBytes(v, 0) } },
      tooltip: { y: { formatter: (v: number) => formatBytes(v, 2) } },
      fill: kind === "area" ? { type: "gradient", gradient: { opacityFrom: 0.35, opacityTo: 0.02 } } : { opacity: 0.9 },
      plotOptions: { bar: { borderRadius: 3, columnWidth: "70%" } },
    });
  const servers = data.traffic.by_node.length ? data.traffic.by_node.map((n) => ({ name: n.name, data: n.series })) : [{ name: t("overview.traffic"), data: data.traffic.series }];
  const protos = data.protocol_series.map((p) => ({ name: protoLabel(p.protocol), data: p.series }));
  return (
    <VStack align="stretch" spacing={4}>
      <HStack justifyContent="space-between" flexWrap="wrap" rowGap={2}>
        <Text fontWeight="semibold">{t("overview.history")}</Text>
        <HStack spacing={2}>
          <KindToggle value={kind} options={TIME_KINDS} onChange={setKind} />
          <ButtonGroup size="xs" isAttached variant="outline">
            {PERIODS.map((p) => (
              <Button key={p} colorScheme="primary" variant={period === p ? "solid" : "outline"} onClick={() => setPeriod(p)}>
                {t(`overview.period.${p}`)}
              </Button>
            ))}
          </ButtonGroup>
        </HStack>
      </HStack>
      <Card title={t("overview.trafficIn", { period: t(`overview.period.${period}`) }) + " · " + formatBytes(data.traffic.total, 1)}>
        <Suspense fallback={<CircularProgress isIndeterminate size="24px" />}>
          <Chart key={"s" + kind} type={kind} options={opts(servers.length)} series={servers} height={260} />
        </Suspense>
      </Card>
      {protos.length > 0 && (
        <Card title={t("overview.protocolsOverTime")}>
          <Suspense fallback={<CircularProgress isIndeterminate size="24px" />}>
            <Chart key={"p" + kind} type={kind} options={opts(protos.length)} series={protos} height={260} />
          </Suspense>
        </Card>
      )}
    </VStack>
  );
};
