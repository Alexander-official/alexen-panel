// The panel's license (app/routers/license.py): what it allows (users, admins and nodes at
// once, until when), the lock screen when it isn't active, the banner when it ends soon and
// the card on the overview. The VPN itself never stops for the license: only the management.
import { Badge, Box, Button, HStack, Icon, Input, SimpleGrid, Spinner, Text, useToast, VStack } from "@chakra-ui/react";
import {
  ArrowPathIcon,
  CheckBadgeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  KeyIcon,
  LockClosedIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import useGetUser from "hooks/useGetUser";
import { fetchInbounds, useDashboard } from "contexts/DashboardContext";
import dayjs from "dayjs";
import { FC, ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { useNavigate } from "react-router-dom";
import { fetch } from "service/http";
import { serverMessage } from "utils/serverMessage";
import { PageLoading } from "./PageLoading";

export type License = {
  status: "active" | "grace" | "expired" | "unlicensed" | "invalid" | "moved" | "suspended" | "revoked";
  locked: boolean;
  customer: string;
  expires: number;
  activated: number;
  days_left: number | null;
  grace_until: number;
  limits: Record<"users" | "admins" | "nodes", number>;
  usage: Record<"users" | "admins" | "nodes", number | null>;
  key?: string | null;
  install_id?: string | null;
  last_check?: number | null;
  last_attempt?: number | null;
  last_error?: string | null;
  server?: string | null;
  has_key?: boolean | null;
};

const KINDS = ["users", "admins", "nodes"] as const;
const card = { className: "alexen-page", borderRadius: "16px", borderWidth: "1px", p: { base: 3.5, md: 5 } } as const;
const STATUS_COLOR: Record<string, string> = {
  active: "green", grace: "orange", expired: "red", unlicensed: "gray", invalid: "red", moved: "red", suspended: "orange", revoked: "red",
};

// an API call answered "the panel's license isn't active": the gate looks again
export const LICENSE_EVENT = "alexen-license-locked";

export const useLicense = (enabled = true) =>
  useQuery<License>({
    queryKey: "license",
    queryFn: () => fetch("/license"),
    enabled,
    retry: 1,
    staleTime: 60000,
    refetchInterval: 10 * 60000,
  });

const day = (ts: number) => dayjs.unix(ts).format("DD.MM.YYYY");
const sinceText = (t: any, ts: number) => {
  const n = Math.max(0, Math.floor((Date.now() / 1000 - ts) / 86400));
  return n ? t("lic.forDays", { n }) : t("lic.sinceToday");
};

export const daysText = (t: any, l: License) => {
  if (!l.expires) return t("lic.noEnd");
  const d = l.days_left ?? 0;
  if (d > 0) return t("lic.daysLeft", { n: d });
  if (d === 0) return t("lic.endsToday");
  return t("lic.endedAgo", { n: -d });
};

const UsageBar: FC<{ label: string; used: number | null; max: number; hint?: string; icon: any }> = ({ label, used, max, hint, icon }) => {
  const { t } = useTranslation();
  const pct = max ? Math.min(100, Math.round(((used || 0) / max) * 100)) : 0;
  const over = !!max && (used || 0) > max;
  const color = over ? "red.400" : pct >= 85 ? "orange.400" : "primary.400";
  return (
    <Box>
      <HStack justify="space-between" spacing={2} mb={1}>
        <HStack spacing={1.5} minW={0}>
          <Icon as={icon} boxSize="15px" color="gray.500" />
          <Text fontSize="sm" isTruncated>
            {label}
            {hint && (
              <Text as="span" fontSize="2xs" color="gray.500" ml={1}>
                {hint}
              </Text>
            )}
          </Text>
        </HStack>
        <Text fontSize="sm" fontWeight="semibold" whiteSpace="nowrap" sx={{ fontVariantNumeric: "tabular-nums" }} color={over ? "red.400" : undefined}>
          {used ?? "—"} / {max ? max : t("lic.unlimited")}
        </Text>
      </HStack>
      <Box h="6px" borderRadius="full" bg="var(--tier-item)" overflow="hidden">
        <Box h="full" w={`${max ? pct : 0}%`} bg={color} borderRadius="full" transition="width .3s" />
      </Box>
    </Box>
  );
};

const Usage: FC<{ l: License }> = ({ l }) => {
  const { t } = useTranslation();
  const icons = { users: UsersIcon, admins: ShieldCheckIcon, nodes: ServerStackIcon };
  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 3, md: 5 }}>
      {KINDS.map((k) => (
        <UsageBar key={k} icon={icons[k]} label={t(`lic.${k}`)} hint={k === "admins" ? t("lic.adminsHint") : undefined} used={l.usage[k]} max={l.limits[k]} />
      ))}
    </SimpleGrid>
  );
};

const KeyForm: FC<{ onDone?: () => void; cta?: string; autoFocus?: boolean }> = ({ onDone, cta, autoFocus }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = () => {
    if (!key.trim()) return setErr(t("serverMsg.licNeedKey"));
    setBusy(true);
    setErr("");
    fetch("/license/activate", { method: "POST", body: { key: key.trim() } })
      .then((d: License) => {
        qc.setQueryData("license", d);
        toast({ status: "success", title: t("lic.activated"), position: "top", duration: 3000 });
        setKey("");
        onDone?.();
        if (!d.locked) qc.invalidateQueries();
      })
      .catch((e: any) => setErr(serverMessage(t, e?.response?._data?.detail) || t("errors.generic")))
      .finally(() => setBusy(false));
  };
  return (
    <VStack align="stretch" spacing={2}>
      <HStack spacing={2} align="stretch" flexDir={{ base: "column", sm: "row" }}>
        <Input
          value={key}
          onChange={(e) => setKey(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="ALX-XXXXX-XXXXX-XXXXX-XXXXX"
          fontFamily="mono"
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          isInvalid={!!err}
        />
        <Button colorScheme="primary" leftIcon={<KeyIcon width={16} />} onClick={submit} isLoading={busy} flexShrink={0}>
          {cta || t("lic.activate")}
        </Button>
      </HStack>
      {err && (
        <Text fontSize="sm" color="red.400">
          {err}
        </Text>
      )}
    </VStack>
  );
};

const useCheckNow = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const run = () => {
    setBusy(true);
    fetch("/license/check", { method: "POST" })
      .then((d: License) => {
        qc.setQueryData("license", d);
        toast({ status: d.last_error === "unreachable" ? "warning" : "success", title: d.last_error === "unreachable" ? t("lic.unreachableShort") : t("lic.checked"), position: "top", duration: 3000 });
        if (!d.locked) qc.invalidateQueries();
      })
      .catch((e: any) => toast({ status: "error", title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic"), position: "top" }))
      .finally(() => setBusy(false));
  };
  return { run, busy };
};

// ---------------------------------------------------------------- the lock screen
const LockScreen: FC<{ l: License; creator: boolean }> = ({ l, creator }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const check = useCheckNow();
  return (
    <Box w="full" display="flex" justifyContent="center" pt={{ base: 4, md: 10 }} pb={6}>
      <Box {...card} w="full" maxW="560px" p={{ base: 5, md: 7 }}>
        <VStack align="stretch" spacing={4}>
          <HStack spacing={3}>
            <Box p={2.5} borderRadius="14px" bg={l.status === "unlicensed" ? "primary.50" : "red.50"} _dark={{ bg: l.status === "unlicensed" ? "rgba(99,102,241,.15)" : "rgba(239,68,68,.14)" }}>
              <Icon as={l.status === "unlicensed" ? KeyIcon : LockClosedIcon} boxSize="24px" color={l.status === "unlicensed" ? "primary.400" : "red.400"} />
            </Box>
            <Box minW={0}>
              <Text fontWeight="bold" fontSize="lg">
                {t(`lic.lockTitle.${l.status}`)}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {t(`lic.lockText.${l.status}`, { date: l.expires ? day(l.expires) : "" })}
              </Text>
            </Box>
          </HStack>
          <HStack spacing={2} p={3} borderRadius="12px" bg="green.50" _dark={{ bg: "rgba(72,187,120,.1)" }} align="flex-start">
            <Icon as={CheckBadgeIcon} boxSize="18px" color="green.400" mt="1px" flexShrink={0} />
            <Text fontSize="sm" color="green.600" _dark={{ color: "green.300" }}>
              {t("lic.vpnWorks")}
            </Text>
          </HStack>
          {creator ? (
            <>
              <Box>
                <Text fontSize="sm" fontWeight="semibold" mb={2}>
                  {t("lic.enterKey")}
                </Text>
                <KeyForm autoFocus />
              </Box>
              {l.has_key && l.status !== "unlicensed" && (
                <Button variant="outline" size="sm" leftIcon={<ArrowPathIcon width={15} />} onClick={check.run} isLoading={check.busy} alignSelf="flex-start">
                  {t("lic.checkNowRenewed")}
                </Button>
              )}
            </>
          ) : (
            <Text fontSize="sm">{t("lic.askOwner")}</Text>
          )}
          <HStack justify="space-between" flexWrap="wrap" rowGap={2} pt={1}>
            <Text fontSize="xs" color="gray.500">
              {t("lic.support")}{" "}
              <Text as="a" href="https://t.me/alexvpns" target="_blank" rel="noreferrer" color="primary.400">
                @alexvpns
              </Text>
            </Text>
            <Button size="sm" variant="ghost" onClick={() => navigate("/login")}>
              {t("header.logout")}
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
};

// the dashboard's pages, or the lock screen when the license isn't active
export const LicenseGate: FC<{ children: ReactNode }> = ({ children }) => {
  const { data, refetch, isError } = useLicense();
  const { userData, getUserIsSuccess } = useGetUser();
  useEffect(() => {
    const on = () => refetch();
    window.addEventListener(LICENSE_EVENT, on);
    return () => window.removeEventListener(LICENSE_EVENT, on);
  }, [refetch]);
  // unlocked now (a key was entered): what the pages load at start, loaded again
  const wasLocked = useRef<boolean | null>(null);
  useEffect(() => {
    if (!data) return;
    if (wasLocked.current && !data.locked) {
      fetchInbounds();
      useDashboard.getState().refetchUsers();
    }
    wasLocked.current = data.locked;
  }, [data]);
  if (!data && !isError) return <PageLoading rows={3} />;
  if (data?.locked) return <LockScreen l={data} creator={getUserIsSuccess && !!(userData as any).is_creator} />;
  return (
    <>
      {data && <LicenseBanner l={data} creator={getUserIsSuccess && !!(userData as any).is_creator} sudo={getUserIsSuccess && !!userData.is_sudo} />}
      {children}
    </>
  );
};

// ---------------------------------------------------------------- the banner (ends soon / grace)
const LicenseBanner: FC<{ l: License; creator: boolean; sudo: boolean }> = ({ l, creator, sudo }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  if (!sudo) return null;
  let text = "";
  let color = "orange";
  if (l.status === "grace") {
    text = t("lic.graceBanner", { date: day(l.expires), until: day(l.grace_until) });
    color = "red";
  } else if (l.expires && l.days_left !== null && l.days_left <= 7) {
    text = t("lic.soonBanner", { n: l.days_left, date: day(l.expires) });
  } else return null;
  return (
    <HStack
      mt={{ base: 3, md: 4 }}
      p={3}
      borderRadius="12px"
      borderWidth="1px"
      borderColor={`${color}.300`}
      bg={`${color}.50`}
      _dark={{ bg: color === "red" ? "rgba(239,68,68,.12)" : "rgba(237,137,54,.12)", borderColor: `${color}.700` }}
      spacing={3}
      flexWrap="wrap"
      rowGap={2}
    >
      <Icon as={ClockIcon} boxSize="18px" color={`${color}.400`} flexShrink={0} />
      <Text fontSize="sm" flex="1" minW="200px">
        {text}
      </Text>
      {creator && (
        <Button size="xs" variant="outline" colorScheme={color} onClick={() => navigate("/license")}>
          {t("lic.open")}
        </Button>
      )}
    </HStack>
  );
};

// ---------------------------------------------------------------- the overview card
export const LicenseCard: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userData, getUserIsSuccess } = useGetUser();
  const sudo = getUserIsSuccess && !!userData.is_sudo;
  const creator = getUserIsSuccess && !!(userData as any).is_creator;
  const { data: l } = useLicense(sudo);
  if (!sudo || !l || l.locked) return null;
  return (
    <Box {...card}>
      <HStack justify="space-between" flexWrap="wrap" rowGap={2} mb={4}>
        <HStack spacing={2}>
          <Icon as={KeyIcon} boxSize="18px" color="primary.400" />
          <Text fontWeight="semibold">{t("lic.title")}</Text>
          <Badge colorScheme={STATUS_COLOR[l.status]}>{t(`lic.status.${l.status}`)}</Badge>
        </HStack>
        {creator && (
          <Button size="xs" variant="ghost" onClick={() => navigate("/license")}>
            {t("lic.details")}
          </Button>
        )}
      </HStack>
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={4}>
        <Fact label={t("lic.remaining")} value={daysText(t, l)} strong color={l.status === "grace" || (l.days_left !== null && l.days_left <= 7) ? "orange.400" : undefined} />
        <Fact label={t("lic.ends")} value={l.expires ? day(l.expires) : t("lic.noEnd")} />
        <Fact label={t("lic.activeSince")} value={l.activated ? day(l.activated) : "—"} sub={l.activated ? sinceText(t, l.activated) : undefined} />
        <Fact label={t("lic.customer")} value={l.customer || "—"} />
      </SimpleGrid>
      <Usage l={l} />
    </Box>
  );
};

const Fact: FC<{ label: string; value: string; sub?: string; strong?: boolean; color?: string }> = ({ label, value, sub, strong, color }) => (
  <Box minW={0}>
    <Text fontSize="2xs" color="gray.500" textTransform="uppercase" letterSpacing="wider">
      {label}
    </Text>
    <Text fontSize={strong ? "lg" : "md"} fontWeight={strong ? "bold" : "semibold"} isTruncated color={color}>
      {value}
    </Text>
    {sub && (
      <Text fontSize="2xs" color="gray.500">
        {sub}
      </Text>
    )}
  </Box>
);

// ---------------------------------------------------------------- the page (the creator)
export const LicensePage: FC = () => {
  const { t } = useTranslation();
  const { data: l, isError } = useLicense();
  const check = useCheckNow();
  const [changing, setChanging] = useState(false);
  if (!l && !isError) return <PageLoading rows={3} />;
  if (!l) return null;
  const old = l.last_check ? Date.now() / 1000 - l.last_check > 2 * 86400 : true;
  return (
    <VStack align="stretch" spacing={4} maxW="1000px">
      <Box {...card}>
        <HStack spacing={2} mb={1} flexWrap="wrap">
          <Icon as={KeyIcon} boxSize="18px" color="primary.400" />
          <Text fontWeight="semibold">{t("lic.title")}</Text>
          <Badge colorScheme={STATUS_COLOR[l.status]}>{t(`lic.status.${l.status}`)}</Badge>
        </HStack>
        <Text fontSize="xs" color="gray.500" mb={4}>
          {t("lic.help")}
        </Text>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4} mb={5}>
          <Fact label={t("lic.remaining")} value={daysText(t, l)} strong color={l.status === "grace" ? "red.400" : l.days_left !== null && l.days_left <= 7 ? "orange.400" : undefined} />
          <Fact label={t("lic.ends")} value={l.expires ? day(l.expires) : t("lic.noEnd")} sub={l.status === "grace" ? t("lic.graceUntil", { date: day(l.grace_until) }) : undefined} />
          <Fact label={t("lic.activeSince")} value={l.activated ? day(l.activated) : "—"} sub={l.activated ? sinceText(t, l.activated) : undefined} />
          <Fact label={t("lic.customer")} value={l.customer || "—"} />
        </SimpleGrid>
        <Text fontSize="sm" fontWeight="semibold" mb={3}>
          {t("lic.limits")}
        </Text>
        <Usage l={l} />
        {KINDS.some((k) => l.limits[k] && (l.usage[k] || 0) > l.limits[k]) && (
          <HStack mt={3} spacing={2} color="orange.400" align="flex-start">
            <Icon as={ExclamationTriangleIcon} boxSize="16px" mt="2px" />
            <Text fontSize="sm">{t("lic.over")}</Text>
          </HStack>
        )}
      </Box>

      <Box {...card}>
        <Text fontWeight="semibold" mb={3}>
          {t("lic.connection")}
        </Text>
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3} mb={4}>
          <Fact label={t("lic.key")} value={l.key || "—"} />
          <Fact label={t("lic.installId")} value={l.install_id ? `${l.install_id}…` : "—"} />
          <Fact label={t("lic.lastCheck")} value={l.last_check ? dayjs.unix(l.last_check).format("DD.MM.YYYY HH:mm") : t("lic.never")} />
          <Fact label={t("lic.server")} value={(l.server || "").replace(/^https?:\/\//, "")} />
        </SimpleGrid>
        {l.last_error === "unreachable" && (
          <HStack mb={3} p={3} borderRadius="12px" bg="orange.50" _dark={{ bg: "rgba(237,137,54,.12)" }} spacing={2} align="flex-start">
            <Icon as={ExclamationTriangleIcon} boxSize="16px" color="orange.400" mt="2px" flexShrink={0} />
            <Text fontSize="sm">{t("lic.unreachable")}</Text>
          </HStack>
        )}
        <HStack spacing={2} flexWrap="wrap" rowGap={2}>
          <Button variant="outline" leftIcon={check.busy ? <Spinner size="xs" /> : <ArrowPathIcon width={16} />} onClick={check.run} isDisabled={check.busy}>
            {t("lic.checkNow")}
          </Button>
          <Button variant="ghost" leftIcon={<KeyIcon width={16} />} onClick={() => setChanging(!changing)}>
            {t("lic.change")}
          </Button>
        </HStack>
        {old && !check.busy && l.last_error !== "unreachable" && (
          <Text fontSize="2xs" color="gray.500" mt={2}>
            {t("lic.checksEvery")}
          </Text>
        )}
        {changing && (
          <Box mt={4} pt={4} borderTopWidth="1px">
            <Text fontSize="xs" color="gray.500" mb={2}>
              {t("lic.changeHelp")}
            </Text>
            <KeyForm onDone={() => setChanging(false)} autoFocus />
          </Box>
        )}
      </Box>
    </VStack>
  );
};
