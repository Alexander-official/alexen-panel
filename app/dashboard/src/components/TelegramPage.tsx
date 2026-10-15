// The panel's Telegram bot (app/routers/telegram.py): token, the admins it answers, its
// language, a proxy, and backups sent on a schedule. The token never comes back whole.
import {
  Badge,
  Box,
  Button,
  Collapse,
  FormControl,
  FormHelperText,
  FormLabel,
  HStack,
  Icon,
  Input,
  Select,
  Switch,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { ArchiveBoxArrowDownIcon, ChatBubbleOvalLeftEllipsisIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";
import { serverMessage } from "utils/serverMessage";
import { PageLoading } from "./PageLoading";

type Bot = {
  enabled: boolean;
  has_token: boolean;
  token_masked: string;
  admin_ids: number[];
  language: string;
  proxy: string;
  backup: { enabled: boolean; every_hours: number };
  intervals: number[];
  last_backup_at: number | null;
  last_backup_error: string;
  next_backup_at: number | null;
  running: boolean;
  username: string;
  error: string;
};

const card = { className: "alexen-page", borderRadius: "16px", borderWidth: "1px", p: { base: 3.5, md: 5 } } as const;
const TOKEN_RE = /^\d{5,15}:[A-Za-z0-9_-]{30,64}$/;

const parseIds = (text: string): number[] | null => {
  const parts = text.split(/[\s,;]+/).map((p) => p.trim()).filter(Boolean);
  if (parts.some((p) => !/^\d{1,15}$/.test(p) || p === "0")) return null;
  return Array.from(new Set(parts.map(Number)));
};

export const TelegramPage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState("");
  const [watch, setWatch] = useState(0);
  const { data } = useQuery<Bot>({
    queryKey: "telegram-bot",
    queryFn: () => fetch("/telegram"),
    // a moment after saving the bot starts: ask again until it says how it went
    refetchInterval: watch ? 2000 : 30000,
  });
  const [form, setForm] = useState({
    enabled: false,
    token: "",
    ids: "",
    language: "tr",
    proxy: "",
    backup: false,
    every: 24,
  });
  const [showProxy, setShowProxy] = useState(false);
  useEffect(() => {
    if (!data || saving) return;
    setForm((f) => ({
      ...f,
      enabled: data.enabled,
      ids: data.admin_ids.join(", "),
      language: data.language,
      proxy: data.proxy,
      backup: data.backup.enabled,
      every: data.backup.every_hours,
      token: "",
    }));
    setShowProxy((v) => v || !!data.proxy);
  }, [data?.enabled, data?.admin_ids.join(","), data?.language, data?.proxy, data?.backup.enabled, data?.backup.every_hours]);
  useEffect(() => {
    if (!watch) return;
    if (data && (data.running || data.error || !data.enabled) && Date.now() - watch > 2500) setWatch(0);
    const id = setTimeout(() => setWatch(0), 40000);
    return () => clearTimeout(id);
  }, [watch, data?.running, data?.error, data?.enabled]);

  const fail = (e: any) =>
    toast({ status: "error", title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic"), position: "top", duration: 6000 });

  if (!data) return <PageLoading rows={3} />;

  const ids = parseIds(form.ids);
  const tokenBad = !!form.token && !TOKEN_RE.test(form.token.trim());
  const proxyBad = !!form.proxy && !/^(https?|socks5h?):\/\/\S+$/.test(form.proxy.trim());
  const needToken = form.enabled && !form.token && !data.has_token;
  const needIds = form.enabled && (!ids || !ids.length);
  const canSave = !tokenBad && !proxyBad && ids !== null && !needToken && !needIds;

  const save = () => {
    if (!canSave) return;
    setSaving(true);
    fetch("/telegram", {
      method: "PUT",
      body: {
        enabled: form.enabled,
        token: form.token.trim() || null,
        admin_ids: ids || [],
        language: form.language,
        proxy: form.proxy.trim(),
        backup: { enabled: form.backup, every_hours: form.every },
      },
    })
      .then((d: Bot) => {
        queryClient.setQueryData("telegram-bot", d);
        setForm((f) => ({ ...f, token: "" }));
        setWatch(Date.now());
        toast({ status: "success", title: t("tg.saved"), position: "top", duration: 2500 });
      })
      .catch(fail)
      .finally(() => setSaving(false));
  };
  const test = () => {
    setBusy("test");
    fetch("/telegram/test", { method: "POST" })
      .then((r: Record<string, string>) => {
        const bad = Object.entries(r).filter(([, v]) => v);
        if (!bad.length) toast({ status: "success", title: t("tg.testSent"), position: "top", duration: 3000 });
        else
          toast({
            status: "warning",
            title: t("tg.testSome"),
            description: bad.map(([id, why]) => `${id}: ${why.startsWith("start the bot") ? t("tg.pressStart") : why}`).join("\n"),
            position: "top",
            duration: 8000,
          });
      })
      .catch(fail)
      .finally(() => setBusy(""));
  };
  const backupNow = () => {
    setBusy("backup");
    fetch("/telegram/backup", { method: "POST" })
      .then(() => {
        queryClient.invalidateQueries("telegram-bot");
        toast({ status: "success", title: t("tg.backupSent"), position: "top", duration: 3000 });
      })
      .catch(fail)
      .finally(() => setBusy(""));
  };

  const state = !data.enabled
    ? { color: "gray", text: t("tg.off") }
    : data.running
    ? { color: "green", text: t("tg.running") }
    : data.error
    ? { color: "red", text: t("tg.problem") }
    : { color: "yellow", text: t("tg.starting") };
  const errorText = (e: string) =>
    /rejected the token/.test(e) ? t("tg.errToken") : /another program/.test(e) ? t("tg.errConflict") : /reach Telegram/.test(e) ? t("tg.errNetwork") : e;
  const dirty =
    form.enabled !== data.enabled ||
    !!form.token ||
    (ids || []).join(",") !== data.admin_ids.join(",") ||
    form.language !== data.language ||
    form.proxy.trim() !== data.proxy ||
    form.backup !== data.backup.enabled ||
    form.every !== data.backup.every_hours;

  return (
    <VStack align="stretch" spacing={4} maxW="1000px">
      <Box {...card}>
        <HStack spacing={2} mb={1} justifyContent="space-between" flexWrap="wrap" rowGap={1}>
          <HStack spacing={2}>
            <Icon as={ChatBubbleOvalLeftEllipsisIcon} boxSize="18px" color="primary.400" />
            <Text fontWeight="semibold">{t("tg.title")}</Text>
          </HStack>
          <HStack spacing={2}>
            {data.username && data.enabled && (
              <Text fontSize="sm" color="gray.500">
                @{data.username}
              </Text>
            )}
            <Badge colorScheme={state.color}>{state.text}</Badge>
          </HStack>
        </HStack>
        <Text fontSize="xs" color="gray.500" mb={4}>
          {t("tg.help")}
        </Text>
        {data.enabled && data.error && (
          <Box p={3} mb={4} borderRadius="12px" bg="red.50" _dark={{ bg: "rgba(245,101,101,.12)" }}>
            <Text fontSize="sm" color="red.400">
              {errorText(data.error)}
            </Text>
          </Box>
        )}

        <VStack align="stretch" spacing={4}>
          <FormControl display="flex" alignItems="center">
            <Switch id="tg-on" isChecked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} mr={3} />
            <FormLabel htmlFor="tg-on" mb={0} fontSize="sm">
              {t("tg.enable")}
            </FormLabel>
          </FormControl>

          <FormControl isInvalid={tokenBad || needToken}>
            <FormLabel fontSize="sm">{t("tg.token")}</FormLabel>
            <Input
              size="sm"
              type="password"
              autoComplete="off"
              value={form.token}
              placeholder={data.has_token ? t("tg.tokenKept", { token: data.token_masked }) : "123456789:AA..."}
              onChange={(e) => setForm({ ...form, token: e.target.value })}
            />
            <FormHelperText fontSize="xs" color={tokenBad ? "red.400" : undefined}>
              {tokenBad ? t("tg.tokenBad") : t("tg.tokenHelp")}
            </FormHelperText>
          </FormControl>

          <FormControl isInvalid={ids === null || needIds}>
            <FormLabel fontSize="sm">{t("tg.admins")}</FormLabel>
            <Input size="sm" value={form.ids} placeholder="123456789, 987654321" onChange={(e) => setForm({ ...form, ids: e.target.value })} />
            <FormHelperText fontSize="xs" color={ids === null ? "red.400" : undefined}>
              {ids === null ? t("tg.idsBad") : t("tg.adminsHelp")}
            </FormHelperText>
          </FormControl>

          <HStack spacing={4} alignItems="flex-start" flexWrap="wrap" rowGap={3}>
            <FormControl maxW="220px">
              <FormLabel fontSize="sm">{t("tg.language")}</FormLabel>
              <Select size="sm" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })}>
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="ru">Русский</option>
              </Select>
            </FormControl>
          </HStack>

          <Box>
            <Button size="xs" variant="link" onClick={() => setShowProxy(!showProxy)}>
              {showProxy ? "▾" : "▸"} {t("tg.proxy")}
            </Button>
            <Collapse in={showProxy} animateOpacity>
              <FormControl mt={2} isInvalid={proxyBad}>
                <Input size="sm" value={form.proxy} placeholder="socks5://127.0.0.1:1080" onChange={(e) => setForm({ ...form, proxy: e.target.value })} />
                <FormHelperText fontSize="xs" color={proxyBad ? "red.400" : undefined}>
                  {proxyBad ? t("tg.proxyBad") : t("tg.proxyHelp")}
                </FormHelperText>
              </FormControl>
            </Collapse>
          </Box>
        </VStack>
      </Box>

      <Box {...card}>
        <HStack spacing={2} mb={1}>
          <Icon as={ArchiveBoxArrowDownIcon} boxSize="18px" color="primary.400" />
          <Text fontWeight="semibold">{t("tg.backupTitle")}</Text>
        </HStack>
        <Text fontSize="xs" color="gray.500" mb={4}>
          {t("tg.backupHelp")}
        </Text>
        <VStack align="stretch" spacing={4}>
          <FormControl display="flex" alignItems="center">
            <Switch id="tg-backup" isChecked={form.backup} onChange={(e) => setForm({ ...form, backup: e.target.checked })} mr={3} />
            <FormLabel htmlFor="tg-backup" mb={0} fontSize="sm">
              {t("tg.backupEnable")}
            </FormLabel>
          </FormControl>
          <FormControl maxW="260px" isDisabled={!form.backup}>
            <FormLabel fontSize="sm">{t("tg.every")}</FormLabel>
            <Select size="sm" value={form.every} onChange={(e) => setForm({ ...form, every: Number(e.target.value) })}>
              {data.intervals.map((h) => (
                <option key={h} value={h}>
                  {h % 24 === 0 ? t("tg.days", { count: h / 24 }) : t("tg.hours", { count: h })}
                </option>
              ))}
            </Select>
          </FormControl>
          <Text fontSize="xs" color="gray.500">
            {data.last_backup_at ? t("tg.lastBackup", { time: dayjs.unix(data.last_backup_at).format("YYYY-MM-DD HH:mm") }) : t("tg.noBackupYet")}
            {data.next_backup_at && data.enabled && data.backup.enabled
              ? ` · ${t("tg.nextBackup", { time: dayjs.unix(Math.max(data.next_backup_at, Date.now() / 1000)).format("YYYY-MM-DD HH:mm") })}`
              : ""}
          </Text>
          {data.last_backup_error && (
            <Text fontSize="xs" color="red.400">
              {t("tg.lastBackupFailed")}:{" "}
              {data.last_backup_error.replace(/(\d+): (Forbidden[^;]*|Bad Request: chat not found[^;]*)/g, (_m, id) => `${id}: ${t("tg.pressStart")}`)}
            </Text>
          )}
          <Text fontSize="2xs" color="orange.400">
            {t("tg.backupWarn")}
          </Text>
        </VStack>
      </Box>

      <HStack spacing={2} flexWrap="wrap" rowGap={2} justifyContent="flex-end">
        <Button size="sm" variant="outline" leftIcon={<PaperAirplaneIcon width={16} />} isLoading={busy === "test"} isDisabled={!data.has_token || dirty} onClick={test}>
          {t("tg.test")}
        </Button>
        <Button size="sm" variant="outline" leftIcon={<ArchiveBoxArrowDownIcon width={16} />} isLoading={busy === "backup"} isDisabled={!data.has_token || dirty} onClick={backupNow}>
          {t("tg.backupNow")}
        </Button>
        <Button size="sm" colorScheme="primary" isLoading={saving} isDisabled={!canSave || !dirty} onClick={save}>
          {t("tg.save")}
        </Button>
      </HStack>
    </VStack>
  );
};
