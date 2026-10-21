// Panel updates (app/routers/update.py): the version, what a new one brings, and an update
// from here. The server's updater does the work (backup, download, build, restart, check,
// the old version back if it fails); this page asks for it and shows how it goes. The panel
// restarts during an update, so the page keeps asking until it answers again.
import { Badge, Box, Button, HStack, Icon, IconButton, Spinner, Text, useToast, VStack } from "@chakra-ui/react";
import {
  ArrowPathIcon,
  CheckCircleIcon,
  CloudArrowDownIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";
import { quietLoadErrors } from "utils/loadErrorToast";
import { serverMessage } from "utils/serverMessage";
import { PageLoading } from "./PageLoading";

type Release = { version: string; date: string; tr: string[]; en: string[] };
type UpdateState = {
  current: string;
  installed: boolean;
  state: "idle" | "checking" | "updating" | "done" | "failed";
  step: string;
  latest: string | null;
  available: boolean;
  checked_at: number | null;
  started_at: number | null;
  finished_at: number | null;
  error: string;
  pending: string | null;
  log: string[];
  news: Release[];
  history: Release[];
};

const card = { className: "alexen-page", borderRadius: "16px", borderWidth: "1px", p: { base: 3.5, md: 5 } } as const;
const STEPS = ["backup", "download", "build", "restart", "verify"];

const Notes: FC<{ r: Release; lang: string }> = ({ r, lang }) => {
  const lines = (lang.startsWith("tr") ? r.tr : r.en)?.length ? (lang.startsWith("tr") ? r.tr : r.en) : r.en || r.tr || [];
  return (
    <Box>
      <HStack spacing={2} mb={1}>
        <Text fontWeight="semibold" fontSize="sm">
          v{r.version}
        </Text>
        {r.date && (
          <Text fontSize="2xs" color="gray.500">
            {r.date}
          </Text>
        )}
      </HStack>
      <VStack align="stretch" spacing={0.5} pl={1}>
        {lines.map((l, i) => (
          <Text key={i} fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }}>
            • {l}
          </Text>
        ))}
      </VStack>
    </Box>
  );
};

export const UpdatePage: FC = () => {
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [asked, setAsked] = useState<"" | "check" | "update">("");
  const [restarting, setRestarting] = useState(false);
  // the "updated to vX" confirmation clears itself after an hour; let it be closed now too
  const [doneHidden, setDoneHidden] = useState(false);
  const loaded = useRef<string | null>(null);

  const busy = (d?: UpdateState) => !!d && (d.state === "checking" || d.state === "updating" || !!d.pending);
  const { data, isError } = useQuery<UpdateState>({
    queryKey: "update-state",
    queryFn: () => fetch("/update"),
    retry: false,
    // fast while something runs (or the panel restarts), slow otherwise
    refetchInterval: (d) => (busy(d) || asked || restarting ? 2500 : 60000),
    refetchIntervalInBackground: true,
    onSuccess: (d) => {
      if (loaded.current === null) loaded.current = d.current;
      if (!busy(d)) setAsked("");
      setRestarting(false);
    },
    onError: () => {
      // the panel is down for a moment while the updater restarts it
      if (asked === "update" || data?.state === "updating") setRestarting(true);
    },
  });

  // the panel came back with another version: load the new page
  const updatedTo = data && loaded.current && data.current !== loaded.current ? data.current : null;
  useEffect(() => {
    if (!updatedTo) return;
    const id = setTimeout(() => window.location.reload(), 4000);
    return () => clearTimeout(id);
  }, [updatedTo]);

  const fail = (e: any) =>
    toast({ status: "error", title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic"), position: "top", duration: 6000 });

  const check = () => {
    setAsked("check");
    fetch("/update/check", { method: "POST" })
      .then((d) => queryClient.setQueryData("update-state", d))
      .catch((e) => {
        setAsked("");
        fail(e);
      });
  };
  const update = () => {
    if (!data || !window.confirm(t("update.confirm", { version: data.latest }))) return;
    setAsked("update");
    fetch("/update", { method: "POST" })
      .then((d) => queryClient.setQueryData("update-state", d))
      .catch((e) => {
        setAsked("");
        fail(e);
      });
  };

  // the panel goes away for a moment during an update: no "no answer" toasts for that
  const inUpdate = asked === "update" || restarting || data?.state === "updating" || data?.pending === "update";
  useEffect(() => {
    if (inUpdate) quietLoadErrors(15000);
  });

  if (!data && !isError) return <PageLoading rows={3} />;
  if (!data) return null;

  const updating = data.state === "updating" || data.pending === "update" || asked === "update" || restarting;
  const checking = data.state === "checking" || data.pending === "check" || asked === "check";
  const stepAt = restarting ? STEPS.indexOf("restart") : STEPS.indexOf(data.step);
  const recent = (ts: number | null) => !!ts && Date.now() / 1000 - ts < 3600;

  return (
    <VStack align="stretch" spacing={4} maxW="1000px">
      <Box {...card}>
        <HStack spacing={2} mb={1}>
          <Icon as={CloudArrowDownIcon} boxSize="18px" color="primary.400" />
          <Text fontWeight="semibold">{t("update.title")}</Text>
        </HStack>
        <Text fontSize="xs" color="gray.500" mb={4}>
          {t("update.help")}
        </Text>

        <HStack spacing={6} flexWrap="wrap" rowGap={3} mb={4}>
          <Box>
            <Text fontSize="2xs" color="gray.500" textTransform="uppercase" letterSpacing="wider">
              {t("update.current")}
            </Text>
            <Text fontSize="2xl" fontWeight="bold">
              v{data.current}
            </Text>
          </Box>
          <Box>
            <Text fontSize="2xs" color="gray.500" textTransform="uppercase" letterSpacing="wider">
              {t("update.latest")}
            </Text>
            <HStack spacing={2}>
              <Text fontSize="2xl" fontWeight="bold">
                {data.latest ? `v${data.latest}` : "—"}
              </Text>
              {data.available ? (
                <Badge colorScheme="green">{t("update.new")}</Badge>
              ) : data.latest ? (
                <Badge variant="subtle">{t("update.upToDate")}</Badge>
              ) : null}
            </HStack>
          </Box>
        </HStack>

        {!data.installed && (
          <Box p={3} borderRadius="12px" bg="orange.50" _dark={{ bg: "rgba(237,137,54,.12)" }} mb={3}>
            <Text fontSize="sm" fontWeight="semibold" color="orange.500" mb={1}>
              {t("update.noUpdater")}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {t("update.noUpdaterHelp")}
            </Text>
            <Text as="code" display="block" mt={2} fontSize="xs" p={2} borderRadius="8px" bg="var(--tier-item)">
              alexen update
            </Text>
          </Box>
        )}

        {data.installed && (
          <>
            <HStack spacing={2} flexWrap="wrap" rowGap={2}>
              <Button
                variant="outline"
                leftIcon={<ArrowPathIcon width={16} />}
                isLoading={checking && !updating}
                isDisabled={updating}
                onClick={check}
              >
                {t("update.check")}
              </Button>
              {data.available && (
                <Button colorScheme="primary" leftIcon={<CloudArrowDownIcon width={16} />} isLoading={updating} isDisabled={checking} onClick={update}>
                  {t("update.now", { version: data.latest })}
                </Button>
              )}
            </HStack>
            <Text fontSize="2xs" color="gray.500" mt={2}>
              {data.checked_at ? t("update.checkedAt", { time: dayjs.unix(data.checked_at).format("YYYY-MM-DD HH:mm") }) : t("update.neverChecked")}
              {data.pending === "stale" ? ` · ${t("update.stale")}` : ""}
            </Text>
            {data.error && data.state !== "failed" && (
              <Text fontSize="xs" color="orange.400" mt={1}>
                {data.error === "couldn't reach the update server" ? t("update.checkFailed") : serverMessage(t, data.error)}
              </Text>
            )}
          </>
        )}
      </Box>

      {updatedTo && (
        <Box {...card} borderColor="green.400">
          <HStack spacing={2}>
            <Icon as={CheckCircleIcon} boxSize="20px" color="green.400" />
            <Text fontWeight="semibold">{t("update.doneReload", { version: updatedTo })}</Text>
          </HStack>
          <Button size="sm" mt={3} colorScheme="green" onClick={() => window.location.reload()}>
            {t("update.reload")}
          </Button>
        </Box>
      )}

      {updating && !updatedTo && (
        <Box {...card}>
          <HStack spacing={2} mb={3}>
            <Spinner size="sm" color="primary.400" />
            <Text fontWeight="semibold">{restarting ? t("update.restarting") : t("update.running")}</Text>
          </HStack>
          <VStack align="stretch" spacing={1.5}>
            {STEPS.map((s, i) => (
              <HStack key={s} spacing={2} opacity={stepAt >= 0 && i > stepAt ? 0.45 : 1}>
                {stepAt > i ? (
                  <Icon as={CheckCircleIcon} boxSize="16px" color="green.400" />
                ) : stepAt === i ? (
                  <Spinner size="xs" color="primary.400" />
                ) : (
                  <Box w="16px" h="16px" borderRadius="full" borderWidth="1px" />
                )}
                <Text fontSize="sm">{t(`update.step.${s}`)}</Text>
              </HStack>
            ))}
          </VStack>
          <Text fontSize="2xs" color="gray.500" mt={3}>
            {t("update.runningHelp")}
          </Text>
        </Box>
      )}

      {data.state === "failed" && !updating && recent(data.finished_at) && (
        <Box {...card} borderColor="red.400">
          <HStack spacing={2} mb={1}>
            <Icon as={ExclamationTriangleIcon} boxSize="20px" color="red.400" />
            <Text fontWeight="semibold">{t("update.failed")}</Text>
          </HStack>
          <Text fontSize="sm" color="gray.500">
            {data.error}
          </Text>
          {!!data.log.length && (
            <Box as="pre" mt={3} p={2} borderRadius="8px" bg="var(--tier-item)" fontSize="2xs" maxH="220px" overflow="auto" whiteSpace="pre-wrap">
              {data.log.join("\n")}
            </Box>
          )}
        </Box>
      )}

      {data.state === "done" && !updating && !updatedTo && !doneHidden && recent(data.finished_at) && (
        <Box {...card} borderColor="green.400">
          <HStack spacing={2}>
            <Icon as={CheckCircleIcon} boxSize="20px" color="green.400" />
            <Text fontWeight="semibold" flex={1}>{t("update.done", { version: data.current })}</Text>
            <Text fontSize="xs" color="gray.500">{t("update.doneHint")}</Text>
            <IconButton aria-label={t("close")} size="xs" variant="ghost" icon={<Icon as={XMarkIcon} boxSize="16px" />} onClick={() => setDoneHidden(true)} />
          </HStack>
        </Box>
      )}

      {!!data.news.length && (
        <Box {...card}>
          <HStack spacing={2} mb={3}>
            <Icon as={SparklesIcon} boxSize="18px" color="green.400" />
            <Text fontWeight="semibold">{t("update.whatsNew")}</Text>
          </HStack>
          <VStack align="stretch" spacing={4}>
            {data.news.map((r) => (
              <Notes key={r.version} r={r} lang={i18n.language || "en"} />
            ))}
          </VStack>
        </Box>
      )}

      <Box {...card}>
        <Text fontWeight="semibold" mb={3}>
          {t("update.history")}
        </Text>
        <VStack align="stretch" spacing={4}>
          {data.history.map((r) => (
            <Notes key={r.version} r={r} lang={i18n.language || "en"} />
          ))}
        </VStack>
      </Box>
    </VStack>
  );
};
