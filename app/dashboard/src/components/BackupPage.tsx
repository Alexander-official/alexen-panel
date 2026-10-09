// Backups (app/backup.py): download one now, the daily ones kept on the
// server, and restoring one (checked first, the current state saved before).
import { Badge, Box, Button, HStack, Icon, IconButton, Input, Text, Tooltip, useToast, VStack } from "@chakra-ui/react";
import { ArchiveBoxArrowDownIcon, ArrowDownTrayIcon, ArrowUturnLeftIcon, CircleStackIcon, TrashIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { FC, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";
import { getAuthToken } from "utils/authStorage";
import { formatBytes } from "utils/formatByte";
import { serverMessage } from "utils/serverMessage";
import { PageLoading } from "./PageLoading";

type Saved = { name: string; size: number; time: number };
type Manifest = { panel_version: string; db_revision: string; created_at: string; files: string[]; db_size: number };

const card = { className: "alexen-page", borderRadius: "16px", borderWidth: "1px", p: { base: 3.5, md: 5 } } as const;

const download = async (path: string, name: string) => {
  const r = await window.fetch("/api" + path, { headers: { Authorization: `Bearer ${getAuthToken()}` } });
  if (!r.ok) {
    let detail = "";
    try {
      detail = (await r.json()).detail;
    } catch {}
    throw { response: { _data: { detail } } };
  }
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};

export const BackupPage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery<{ keep: number; backups: Saved[] }>({ queryKey: "backups", queryFn: () => fetch("/backup/list") });
  const [busy, setBusy] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [restarting, setRestarting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const fail = (e: any) =>
    toast({ status: "error", title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic"), position: "top", duration: 6000 });

  const now = () => {
    setBusy("download");
    download("/backup", `alexen-backup-${dayjs().format("YYYYMMDD-HHmmss")}.zip`)
      .then(() => toast({ status: "success", title: t("backup.downloaded"), position: "top", duration: 2500 }))
      .catch(fail)
      .finally(() => setBusy(""));
  };
  const saveOnServer = () => {
    setBusy("save");
    fetch("/backup/now", { method: "POST" })
      .then(() => {
        queryClient.invalidateQueries("backups");
        toast({ status: "success", title: t("backup.saved"), position: "top", duration: 2500 });
      })
      .catch(fail)
      .finally(() => setBusy(""));
  };
  const pick = (f: File) => {
    setFile(f);
    setManifest(null);
    setBusy("check");
    const fd = new FormData();
    fd.append("file", f);
    fetch("/backup/check", { method: "POST", body: fd })
      .then(setManifest)
      .catch((e) => {
        setFile(null);
        fail(e);
      })
      .finally(() => setBusy(""));
  };
  const restore = () => {
    if (!file || !window.confirm(t("backup.confirmRestore"))) return;
    setBusy("restore");
    const fd = new FormData();
    fd.append("file", file);
    fetch("/backup/restore", { method: "POST", body: fd })
      .then(() => {
        setRestarting(true);
        // the panel restarts with the restored data: wait for it, then load it fresh
        const started = Date.now();
        const poll = (): void => {
          window
            .fetch("/api/admin", { headers: { Authorization: `Bearer ${getAuthToken()}` } })
            .then((r) => (r.status < 500 ? window.location.reload() : Promise.reject()))
            .catch(() => {
              if (Date.now() - started < 180000) setTimeout(poll, 2000);
            });
        };
        setTimeout(poll, 4000);
      })
      .catch(fail)
      .finally(() => setBusy(""));
  };

  if (restarting)
    return (
      <Box {...card} textAlign="center" py={12}>
        <Icon as={ArrowUturnLeftIcon} boxSize="28px" color="primary.400" mb={3} />
        <Text fontWeight="semibold">{t("backup.restarting")}</Text>
        <Text fontSize="sm" color="gray.500" mt={1}>
          {t("backup.restartingHelp")}
        </Text>
      </Box>
    );
  if (!data) return <PageLoading rows={3} />;
  return (
    <VStack align="stretch" spacing={4} maxW="1000px">
      <Box {...card}>
        <HStack spacing={2} mb={1}>
          <Icon as={ArchiveBoxArrowDownIcon} boxSize="18px" color="primary.400" />
          <Text fontWeight="semibold">{t("backup.title")}</Text>
        </HStack>
        <Text fontSize="xs" color="gray.500" mb={4}>
          {t("backup.help")}
        </Text>
        <HStack spacing={2} flexWrap="wrap" rowGap={2}>
          <Button colorScheme="primary" leftIcon={<ArrowDownTrayIcon width={16} />} isLoading={busy === "download"} onClick={now}>
            {t("backup.downloadNow")}
          </Button>
          <Button variant="outline" leftIcon={<CircleStackIcon width={16} />} isLoading={busy === "save"} onClick={saveOnServer}>
            {t("backup.saveOnServer")}
          </Button>
        </HStack>
      </Box>

      <Box {...card}>
        <HStack justifyContent="space-between" mb={1} flexWrap="wrap" rowGap={1}>
          <Text fontWeight="semibold">{t("backup.saved_title")}</Text>
          <Badge variant="subtle" fontSize="2xs">
            {t("backup.keep", { n: data.keep })}
          </Badge>
        </HStack>
        <Text fontSize="xs" color="gray.500" mb={3}>
          {t("backup.dailyHelp")}
        </Text>
        {!data.backups.length && (
          <Text fontSize="sm" color="gray.500" py={4} textAlign="center">
            {t("backup.none")}
          </Text>
        )}
        <VStack align="stretch" spacing={1.5}>
          {data.backups.map((b) => (
            <HStack key={b.name} px={3} py={2} borderRadius="12px" bg="var(--tier-item)" spacing={3}>
              <Box flex="1" minW={0}>
                <Text fontSize="sm" fontFamily="mono" noOfLines={1}>
                  {b.name}
                </Text>
                <Text fontSize="2xs" color="gray.500">
                  {dayjs.unix(b.time).format("YYYY-MM-DD HH:mm")} · {String(formatBytes(b.size, 1))}
                  {b.name.includes("before-restore") ? ` · ${t("backup.beforeRestore")}` : ""}
                </Text>
              </Box>
              <Tooltip label={t("backup.download")} hasArrow>
                <IconButton size="sm" variant="ghost" aria-label="download" icon={<ArrowDownTrayIcon width={16} />} onClick={() => download(`/backup/file/${encodeURIComponent(b.name)}`, b.name).catch(fail)} />
              </Tooltip>
              <Tooltip label={t("backup.delete")} hasArrow>
                <IconButton
                  size="sm"
                  variant="ghost"
                  colorScheme="red"
                  aria-label="delete"
                  icon={<TrashIcon width={16} />}
                  onClick={() =>
                    window.confirm(t("backup.confirmDelete", { name: b.name })) &&
                    fetch(`/backup/file/${encodeURIComponent(b.name)}`, { method: "DELETE" })
                      .then(() => queryClient.invalidateQueries("backups"))
                      .catch(fail)
                  }
                />
              </Tooltip>
            </HStack>
          ))}
        </VStack>
      </Box>

      <Box {...card}>
        <HStack spacing={2} mb={1}>
          <Icon as={ArrowUturnLeftIcon} boxSize="18px" color="orange.400" />
          <Text fontWeight="semibold">{t("backup.restoreTitle")}</Text>
        </HStack>
        <Text fontSize="xs" color="gray.500" mb={3}>
          {t("backup.restoreHelp")}
        </Text>
        <Input ref={input} type="file" accept=".zip" size="sm" p={1} onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        {busy === "check" && (
          <Text fontSize="sm" color="gray.500" mt={3}>
            {t("backup.checking")}
          </Text>
        )}
        {manifest && file && (
          <Box mt={3} p={3} borderRadius="12px" bg="var(--tier-2)">
            <Text fontSize="sm" fontWeight="semibold" color="green.400" mb={1}>
              ✓ {t("backup.valid")}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {t("backup.made", { date: dayjs(manifest.created_at).format("YYYY-MM-DD HH:mm"), version: manifest.panel_version })} ·{" "}
              {t("backup.files", { n: manifest.files.length })} · {String(formatBytes(manifest.db_size, 1))}
            </Text>
            <HStack justifyContent="flex-end" mt={3}>
              <Button size="sm" variant="ghost" onClick={() => { setFile(null); setManifest(null); if (input.current) input.current.value = ""; }}>
                {t("cancel")}
              </Button>
              <Button size="sm" colorScheme="orange" isLoading={busy === "restore"} onClick={restore}>
                {t("backup.restore")}
              </Button>
            </HStack>
          </Box>
        )}
      </Box>
    </VStack>
  );
};
