// Important notifications (suspicious traffic and the like) and, for the sudo
// admin, the anti-theft rules that raise them (app/antitheft.py).
import { CardLoading } from "./PageLoading";
import { Badge, Box, Button, HStack, Icon, IconButton, Input, Select, SimpleGrid, Switch, Text, Textarea, useToast, VStack } from "@chakra-ui/react";
import { BellAlertIcon, CheckIcon, PlusIcon, ShieldExclamationIcon, TrashIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import useGetUser from "hooks/useGetUser";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";
import { formatBytes } from "utils/formatByte";
import { serverMessage } from "utils/serverMessage";

type Alert = { id: number; time: number; kind: string; username: string | null; admin: string | null; title: string; detail: string | null; read: boolean };
type Rule = { id: string; name: string; window_minutes: number; max_gb: number; action: "notify" | "disable"; enabled: boolean };
type Theft = { enabled: boolean; rules: Rule[]; ignore: string[] };

export const useNotifyCounts = (enabled = true) =>
  useQuery<{ alerts: number; messages: number; warnings: number }>({
    queryKey: "notify-counts",
    queryFn: () => fetch("/notify/counts"),
    refetchInterval: 30000,
    enabled,
    staleTime: 15000,
  });

const card = { className: "alexen-page", borderRadius: "16px", borderWidth: "1px", p: { base: 3.5, md: 5 } } as const;
const newId = () => Math.random().toString(36).slice(2, 10);
const fmtWindow = (t: any, m: number) => (m % 60 === 0 ? t("external.hours", { count: m / 60 }) : t("external.minutes", { count: m }));

const TheftSettings: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const [s, setS] = useState<Theft | null>(null);
  const [saved, setSaved] = useState("");
  const [ignore, setIgnore] = useState("");
  useEffect(() => {
    fetch("/anti-theft").then((d: Theft) => {
      setS(d);
      setSaved(JSON.stringify(d));
      setIgnore(d.ignore.join(", "));
    });
  }, []);
  if (!s) return <CardLoading h="220px" />;
  const draft = { ...s, ignore: ignore.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean) };
  const dirty = JSON.stringify(draft) !== saved;
  const setRule = (id: string, p: Partial<Rule>) => setS({ ...s, rules: s.rules.map((r) => (r.id === id ? { ...r, ...p } : r)) });
  const save = () =>
    fetch("/anti-theft", { method: "PUT", body: draft })
      .then((d: Theft) => {
        setS(d);
        setSaved(JSON.stringify(d));
        toast({ status: "success", title: t("admins.saved"), duration: 1500, position: "top" });
      })
      .catch((e: any) => toast({ status: "error", title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic"), position: "top" }));
  return (
    <Box {...card}>
      <HStack justifyContent="space-between" mb={1}>
        <HStack spacing={2}>
          <Icon as={ShieldExclamationIcon} boxSize="18px" color="primary.400" />
          <Text fontWeight="semibold">{t("theft.title")}</Text>
        </HStack>
        <Switch colorScheme="primary" isChecked={s.enabled} onChange={(e) => setS({ ...s, enabled: e.target.checked })} />
      </HStack>
      <Text fontSize="xs" color="gray.500" mb={4}>
        {t("theft.help")}
      </Text>
      <VStack align="stretch" spacing={2} opacity={s.enabled ? 1 : 0.55}>
        {s.rules.map((r) => (
          <SimpleGrid key={r.id} columns={{ base: 2, md: 6 }} spacing={2} alignItems="center" p={2.5} borderRadius="12px" bg="var(--tier-2)">
            <Input size="sm" gridColumn={{ base: "span 2", md: "span 2" }} value={r.name} placeholder={t("theft.namePlaceholder")} onChange={(e) => setRule(r.id, { name: e.target.value })} />
            <HStack spacing={1}>
              <Input size="sm" type="number" value={r.max_gb} onChange={(e) => setRule(r.id, { max_gb: Number(e.target.value) || 0 })} />
              <Text fontSize="xs" color="gray.500">GB</Text>
            </HStack>
            <HStack spacing={1}>
              <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">{t("theft.in")}</Text>
              <Input size="sm" type="number" value={r.window_minutes} onChange={(e) => setRule(r.id, { window_minutes: Math.max(1, Number(e.target.value) || 1) })} />
              <Text fontSize="xs" color="gray.500">{t("autoChange.minutes")}</Text>
            </HStack>
            <Select size="sm" value={r.action} onChange={(e) => setRule(r.id, { action: e.target.value as any })}>
              <option value="notify">{t("theft.notify")}</option>
              <option value="disable">{t("theft.disable")}</option>
            </Select>
            <HStack justifyContent="flex-end">
              <Switch size="sm" colorScheme="primary" isChecked={r.enabled} onChange={(e) => setRule(r.id, { enabled: e.target.checked })} />
              <IconButton size="xs" variant="ghost" colorScheme="red" aria-label="delete" icon={<TrashIcon width={14} />} onClick={() => setS({ ...s, rules: s.rules.filter((x) => x.id !== r.id) })} />
            </HStack>
          </SimpleGrid>
        ))}
        <HStack spacing={2} flexWrap="wrap" rowGap={2}>
          <Button size="sm" variant="outline" leftIcon={<PlusIcon width={14} />} onClick={() => setS({ ...s, rules: [...s.rules, { id: newId(), name: "", window_minutes: 60, max_gb: 30, action: "notify", enabled: true }] })}>
            {t("theft.addRule")}
          </Button>
          {[
            [10, 5],
            [60, 30],
            [1440, 200],
          ].map(([m, g]) => (
            <Button key={m} size="xs" variant="ghost" onClick={() => setS({ ...s, rules: [...s.rules, { id: newId(), name: t("theft.presetName", { gb: g, time: fmtWindow(t, m) }), window_minutes: m, max_gb: g, action: "notify", enabled: true }] })}>
              + {g} GB / {fmtWindow(t, m)}
            </Button>
          ))}
        </HStack>
        <Box>
          <Text fontSize="xs" color="gray.500" mb={1}>
            {t("theft.ignore")}
          </Text>
          <Textarea size="sm" rows={2} value={ignore} placeholder="user1, user2" onChange={(e) => setIgnore(e.target.value)} />
        </Box>
      </VStack>
      <HStack justifyContent="flex-end" mt={3}>
        <Button size="sm" colorScheme="primary" isDisabled={!dirty} onClick={save}>
          {t("admins.save")}
        </Button>
      </HStack>
    </Box>
  );
};

export const NotificationsPage: FC = () => {
  const { t } = useTranslation();
  const { userData } = useGetUser();
  const queryClient = useQueryClient();
  const [onlyUnread, setOnlyUnread] = useState(false);
  const { data, refetch } = useQuery<{ items: Alert[]; more: boolean }>({
    queryKey: ["alerts", onlyUnread],
    queryFn: () => fetch(`/alerts?limit=200${onlyUnread ? "&unread=true" : ""}`),
    refetchInterval: 30000,
  });
  const markRead = (body: any) =>
    fetch("/alerts/read", { method: "POST", body }).then(() => {
      refetch();
      queryClient.invalidateQueries("notify-counts");
    });
  const items = data?.items || [];
  return (
    <VStack align="stretch" spacing={4} maxW="1100px">
      {userData.is_sudo && <TheftSettings />}
      <Box {...card}>
        <HStack justifyContent="space-between" mb={3} flexWrap="wrap" rowGap={2}>
          <HStack spacing={2}>
            <Icon as={BellAlertIcon} boxSize="18px" color="primary.400" />
            <Text fontWeight="semibold">{t("alerts.title")}</Text>
          </HStack>
          <HStack spacing={2}>
            <Button size="xs" variant={onlyUnread ? "solid" : "outline"} colorScheme="primary" onClick={() => setOnlyUnread(!onlyUnread)}>
              {t("alerts.onlyUnread")}
            </Button>
            <Button size="xs" variant="outline" leftIcon={<CheckIcon width={12} />} onClick={() => markRead({ all: true })}>
              {t("alerts.readAll")}
            </Button>
          </HStack>
        </HStack>
        {!items.length && (
          <Text fontSize="sm" color="gray.500" py={6} textAlign="center">
            {t("alerts.empty")}
          </Text>
        )}
        <VStack align="stretch" spacing={2}>
          {items.map((a) => {
            let d: any = {};
            try {
              d = a.detail ? JSON.parse(a.detail) : {};
            } catch {}
            return (
              <HStack key={a.id} p={3} borderRadius="12px" bg="var(--tier-2)" spacing={3} alignItems="flex-start" opacity={a.read ? 0.7 : 1} borderLeftWidth="3px" borderLeftColor={a.read ? "transparent" : d.disabled ? "red.400" : "orange.400"}>
                <Icon as={ShieldExclamationIcon} boxSize="20px" mt={0.5} color={d.disabled ? "red.400" : "orange.400"} />
                <Box flex="1" minW={0}>
                  <HStack spacing={2} flexWrap="wrap" rowGap={1}>
                    <Text fontWeight="semibold" fontSize="sm">
                      {a.title}
                    </Text>
                    {a.username && <Badge colorScheme="primary" variant="subtle">{a.username}</Badge>}
                    {a.admin && userData.is_sudo && <Badge variant="subtle">{a.admin}</Badge>}
                    {d.disabled && <Badge colorScheme="red" variant="subtle">{t("theft.wasDisabled")}</Badge>}
                  </HStack>
                  {a.kind === "theft" && (
                    <Text fontSize="xs" color="gray.500" mt={0.5}>
                      {t("theft.detail", { used: String(formatBytes(d.used || 0, 1)), max: d.max_gb, time: fmtWindow(t, d.window_minutes || 0) })}
                      {d.ips?.length ? ` · IP: ${d.ips.slice(0, 5).join(", ")}${d.ips.length > 5 ? " …" : ""}` : ""}
                    </Text>
                  )}
                </Box>
                <VStack spacing={1} alignItems="flex-end" flexShrink={0}>
                  <Text fontSize="xs" color="gray.500" title={dayjs.unix(a.time).format("YYYY-MM-DD HH:mm:ss")}>
                    {dayjs.unix(a.time).fromNow()}
                  </Text>
                  {!a.read && (
                    <Button size="xs" variant="ghost" onClick={() => markRead({ ids: [a.id] })}>
                      {t("alerts.markRead")}
                    </Button>
                  )}
                </VStack>
              </HStack>
            );
          })}
        </VStack>
      </Box>
    </VStack>
  );
};
