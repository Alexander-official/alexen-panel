import {
  Badge,
  Box,
  Button,
  chakra,
  CircularProgress,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  useToast,
  useColorMode,
} from "@chakra-ui/react";
import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "./PageSurface";
import {
  ArrowPathIcon,
  ArrowsPointingInIcon,
  ArrowsPointingOutIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { joinPaths } from "@remix-run/router";
import classNames from "classnames";
import {
  FetchCoresQueryKey,
  MAIN_CORE,
  useCoreSettings,
  useCoresQuery,
} from "contexts/CoreSettingsContext";
import { fetchInbounds } from "contexts/DashboardContext";
import { FetchNodesQueryKey } from "contexts/NodesContext";
import { InboundsEditor, JsonToolbar, OutboundsEditor, RoutingEditor } from "./CoreEditors";
import { useDashboard, useDashboardPick } from "contexts/DashboardContext";
import debounce from "lodash.debounce";
import { FC, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "react-query";
import { ReadyState } from "react-use-websocket";
import { useWebSocket } from "react-use-websocket/dist/lib/use-websocket";
import { getAuthToken } from "utils/authStorage";
import { Icon } from "./Icon";
import { JsonEditor } from "./JsonEditor";
import "./JsonEditor/themes.js";
import { useNodesQuery } from "contexts/NodesContext";

export const MAX_NUMBER_OF_LOGS = 500;

const UsageIcon = chakra(Cog6ToothIcon, {
  baseStyle: {
    w: 5,
    h: 5,
  },
});
export const ReloadIcon = chakra(ArrowPathIcon, {
  baseStyle: {
    w: 4,
    h: 4,
  },
});

export const FullScreenIcon = chakra(ArrowsPointingOutIcon, {
  baseStyle: {
    w: 4,
    h: 4,
  },
});
export const ExitFullScreenIcon = chakra(ArrowsPointingInIcon, {
  baseStyle: {
    w: 3,
    h: 3,
  },
});

const getStatus = (status: string) => {
  return {
    [ReadyState.CONNECTING]: "connecting",
    [ReadyState.OPEN]: "connected",
    [ReadyState.CLOSING]: "closed",
    [ReadyState.CLOSED]: "closed",
    [ReadyState.UNINSTANTIATED]: "closed",
  }[status];
};

const getWebsocketUrl = (nodeID: string) => {
  try {
    let baseURL = new URL(
      import.meta.env.VITE_BASE_API.startsWith("/")
        ? window.location.origin + import.meta.env.VITE_BASE_API
        : import.meta.env.VITE_BASE_API
    );

    return (
      (baseURL.protocol === "https:" ? "wss://" : "ws://") +
      joinPaths([
        baseURL.host + baseURL.pathname,
        !nodeID ? "/core/logs" : `/node/${nodeID}/logs`,
      ]) +
      "?interval=1&token=" +
      getAuthToken()
    );
  } catch (e) {
    console.error("Unable to generate websocket url");
    console.error(e);
    return null;
  }
};

// pick which core config is being edited; add, rename and delete extra cores
const CoreSwitcher: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: cores } = useCoresQuery();
  const { data: nodes } = useNodesQuery();
  const { coreId, setCoreId, createCore, renameCore, deleteCore } = useCoreSettings();
  const [mode, setMode] = useState<"" | "new" | "rename">("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const current = cores?.find((c) => c.id === coreId);
  const coreNodes = (nodes || []).filter((n: any) => (n.core_id || MAIN_CORE) === coreId);

  const fail = (e: any) =>
    toast({ title: e?.response?._data?.detail || t("core.generalErrorMessage"), status: "error", position: "top", duration: 4000 });
  const done = () => {
    queryClient.invalidateQueries(FetchCoresQueryKey);
    queryClient.invalidateQueries(FetchNodesQueryKey);
    setMode("");
    setName("");
  };
  const submit = () => {
    if (!name.trim()) return;
    setBusy(true);
    const req =
      mode === "new"
        ? createCore(name.trim(), coreId).then((c) => {
            done();
            setCoreId(c.id);
          })
        : renameCore(coreId, name.trim()).then(done);
    req.catch(fail).finally(() => setBusy(false));
  };
  const remove = () => {
    if (!window.confirm(t("cores.deleteConfirm", { name: current?.name }))) return;
    setBusy(true);
    deleteCore(coreId)
      .then(() => {
        done();
        setCoreId(MAIN_CORE);
      })
      .catch(fail)
      .finally(() => setBusy(false));
  };

  return (
    <Box mb={4} p={3} borderRadius="md" border="1px solid" borderColor="light-border" _dark={{ borderColor: "gray.600" }}>
      <HStack spacing={2} flexWrap="wrap" rowGap={2}>
        <Text fontSize="sm" fontWeight="semibold">
          {t("cores.core")}
        </Text>
        <Select size="sm" w="auto" minW="160px" value={coreId} onChange={(e) => setCoreId(e.target.value)}>
          {(cores || [{ id: MAIN_CORE, name: "Main", inbounds: [] }]).map((c) => (
            <option key={c.id} value={c.id}>
              {c.id === MAIN_CORE ? t("cores.main") : c.name}
            </option>
          ))}
        </Select>
        <Button size="sm" variant="outline" onClick={() => { setMode(mode === "new" ? "" : "new"); setName(""); }}>
          + {t("cores.new")}
        </Button>
        {coreId !== MAIN_CORE && (
          <>
            <Button size="sm" variant="ghost" onClick={() => { setMode(mode === "rename" ? "" : "rename"); setName(current?.name || ""); }}>
              {t("cores.rename")}
            </Button>
            <Button size="sm" variant="ghost" colorScheme="red" isLoading={busy && !mode} onClick={remove}>
              {t("cores.delete")}
            </Button>
          </>
        )}
      </HStack>
      {mode && (
        <HStack mt={2} spacing={2}>
          <Input
            size="sm"
            autoFocus
            placeholder={t("cores.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          <Button size="sm" colorScheme="primary" flexShrink={0} isLoading={busy} onClick={submit}>
            {mode === "new" ? t("cores.create") : t("cores.rename")}
          </Button>
        </HStack>
      )}
      {mode === "new" && (
        <Text fontSize="xs" color="gray.500" mt={1}>
          {t("cores.newHelp", { name: coreId === MAIN_CORE ? t("cores.main") : current?.name })}
        </Text>
      )}
      <Text fontSize="xs" color="gray.500" mt={2}>
        {coreId === MAIN_CORE
          ? t("cores.mainHelp")
          : t("cores.extraHelp")}{" "}
        {coreNodes.length > 0
          ? t("cores.runningOn", { nodes: coreNodes.map((n: any) => n.name).join(", ") })
          : coreId !== MAIN_CORE && t("cores.noNodes")}
      </Text>
    </Box>
  );
};

let logsTmp: string[] = [];
const CoreSettingModalContent: FC = () => {

  const { colorMode } = useColorMode();

  const { data: nodes } = useNodesQuery();
  const disabled = false;
  const [selectedNode, setNode] = useState<string>("");

  const handleLog = (id: string, title: string) => {
    if (id === selectedNode) return;
    else if (id === "host") {
      setNode("");
      setLogs([]);
    } else {
      setNode(id);
      setLogs([]);
    }
  };

  const { isEditingCore } = useDashboardPick("isEditingCore");
  const {
    fetchCoreSettings,
    updateConfig,
    isLoading,
    config,
    isPostLoading,
    version,
    restartCore,
    coreId,
  } = useCoreSettings();
  const queryClient = useQueryClient();
  // the config being edited, shared by the visual tabs and the JSON tab
  const [draft, setDraft] = useState<any>(null);
  // what the JSON editor shows; only replaced when the change didn't come from it
  const [editorJson, setEditorJson] = useState<any>(null);
  const [jsonError, setJsonError] = useState(false);
  const [tab, setTab] = useState(0);
  const jsonApi = useRef<any>(null);
  const logsDiv = useRef<HTMLDivElement | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const { t } = useTranslation();
  const toast = useToast();
  useEffect(() => {
    if (config && typeof config === "object") {
      setDraft(config);
      setEditorJson(config);
      setJsonError(false);
    }
  }, [config]);

  const changeFromVisual = (next: any) => {
    setDraft(next);
    setEditorJson(next);
    setJsonError(false);
  };
  const changeFromJson = (text: string) => {
    try {
      setDraft(JSON.parse(text));
      setJsonError(false);
    } catch {
      setJsonError(true);
    }
  };

  useEffect(() => {
    if (isEditingCore) fetchCoreSettings();
  }, [isEditingCore]);
  "".startsWith;
  const scrollShouldStayOnEnd = useRef(true);
  const updateLogs = useCallback(
    debounce((logs: string[]) => {
      const isScrollOnEnd =
        Math.abs(
          (logsDiv.current?.scrollTop || 0) -
            (logsDiv.current?.scrollHeight || 0) +
            (logsDiv.current?.offsetHeight || 0)
        ) < 10;
      if (logsDiv.current && isScrollOnEnd)
        scrollShouldStayOnEnd.current = true;
      else scrollShouldStayOnEnd.current = false;
      if (logs.length < 40) setLogs(logs);
    }, 300),
    []
  );

  const { readyState } = useWebSocket(getWebsocketUrl(selectedNode), {
    onMessage: (e: any) => {
      logsTmp.push(e.data);
      if (logsTmp.length > MAX_NUMBER_OF_LOGS)
        logsTmp = logsTmp.splice(0, logsTmp.length - MAX_NUMBER_OF_LOGS);
      updateLogs([...logsTmp]);
    },
    shouldReconnect: () => true,
    reconnectAttempts: 10,
    reconnectInterval: 1000,
  });

  useEffect(() => {
    if (logsDiv.current && scrollShouldStayOnEnd.current)
      logsDiv.current.scrollTop = logsDiv.current?.scrollHeight;
  }, [logs]);

  useEffect(() => {
    return () => {
      logsTmp = [];
    };
  }, []);

  const status = getStatus(readyState.toString());

  const { mutate: handleRestartCore, isLoading: isRestarting } =
    useMutation(restartCore);

  const handleOnSave = (e?: any) => {
    e?.preventDefault?.();
    if (jsonError || !draft) return;
    updateConfig(draft)
      .then(() => {
        queryClient.invalidateQueries(FetchCoresQueryKey);
        queryClient.invalidateQueries(FetchNodesQueryKey);
        fetchInbounds();
        toast({
          title: t("core.successMessage"),
          status: "success",
          isClosable: true,
          position: "top",
          duration: 3000,
        });
      })
      .catch((e) => {
        let message = t("core.generalErrorMessage");
        if (typeof e.response._data.detail === "object")
          message =
            e.response._data.detail[Object.keys(e.response._data.detail)[0]];
        if (typeof e.response._data.detail === "string")
          message = e.response._data.detail;

        toast({
          title: message,
          status: "error",
          isClosable: true,
          position: "top",
          duration: 3000,
        });
      });
  };
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFullScreen, setFullScreen] = useState(false);
  const handleFullScreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setFullScreen(false);
    } else {
      editorRef.current?.requestFullscreen();
      setFullScreen(true);
    }
  };
  return (
    <form onSubmit={handleOnSave}>
      <ModalBody>
        <CoreSwitcher />
        <FormControl>
          <HStack justifyContent="space-between" alignItems="flex-start">
            <FormLabel>
              {t("core.configuration")}{" "}
              {isLoading && <CircularProgress isIndeterminate size="15px" />}
            </FormLabel>
            <HStack gap={0}>
              <Tooltip label="Xray Version" placement="top">
                <Badge height="100%" textTransform="lowercase">
                  {version && `v${version}`}
                </Badge>
              </Tooltip>
            </HStack>
          </HStack>
          <Tabs
            index={tab}
            onChange={(i) => {
              // leaving the JSON tab: keep its text unless it doesn't parse
              if (jsonError) return;
              setEditorJson(draft);
              setTab(i);
            }}
            size="sm" variant="soft-rounded" colorScheme="primary" isLazy>
            <TabList flexWrap="wrap" gap={1} mb={3}>
              <Tab>{t("coreEditors.tab.inbounds")}</Tab>
              <Tab>{t("coreEditors.tab.outbounds")}</Tab>
              <Tab>{t("coreEditors.tab.routing")}</Tab>
              <Tab>JSON</Tab>
            </TabList>
            <TabPanels>
              <TabPanel p={0}>
                {draft && <InboundsEditor config={draft} onChange={changeFromVisual} />}
              </TabPanel>
              <TabPanel p={0}>
                {draft && <OutboundsEditor config={draft} onChange={changeFromVisual} />}
              </TabPanel>
              <TabPanel p={0}>
                {draft && <RoutingEditor config={draft} onChange={changeFromVisual} />}
              </TabPanel>
              <TabPanel p={0}>
                {draft && (
                  <JsonToolbar
                    config={draft}
                    onChange={changeFromVisual}
                    insert={(text) => {
                      const ace = (jsonApi.current as any)?.aceEditor;
                      if (ace) {
                        ace.insert(text);
                        ace.focus();
                      }
                    }}
                    onFormat={() => !jsonError && setEditorJson({ ...draft })}
                  />
                )}
                <Box position="relative" ref={editorRef} h="520px">
                  <JsonEditor json={editorJson} onChange={changeFromJson} onReady={(e) => (jsonApi.current = e)} />
                  <IconButton
                    size="xs"
                    aria-label="full screen"
                    variant="ghost"
                    position="absolute"
                    top="2"
                    right="4"
                    onClick={handleFullScreen}
                  >
                    {!isFullScreen ? <FullScreenIcon /> : <ExitFullScreenIcon />}
                  </IconButton>
                </Box>
              </TabPanel>
            </TabPanels>
          </Tabs>
          {jsonError && (
            <Text fontSize="xs" color="red.400" mt={1}>
              {t("coreEditors.jsonInvalid")}
            </Text>
          )}
        </FormControl>
        <FormControl mt="4">
          <HStack
            justifyContent="space-between"
            style={{ paddingBottom: "1rem" }}
          >
            <HStack>
              {nodes?.[0] && (
                <Select
                  size="sm"
                  style={{ width: "auto" }}
                  disabled={disabled}
                  bg={disabled ? "gray.100" : "transparent"}
                  _dark={{
                    bg: disabled ? "gray.600" : "transparent",
                  }}
                  sx={{
                    option: {
                      backgroundColor: colorMode === "dark" ? "var(--chakra-colors-gray-750)" : "var(--app-surface)"
                    }
                  }}
                  onChange={(v) =>
                    handleLog(
                      v.currentTarget.value,
                      v.currentTarget.selectedOptions[0].text
                    )
                  }
                >
                  <option key={"host"} value={"host"} defaultChecked>
                    Master
                  </option>
                  {nodes &&
                    nodes.map((s) => {
                      return (
                        <option key={s.address} value={String(s.id)}>
                          {t(s.name)}
                        </option>
                      );
                    })}
                </Select>
              )}
              <FormLabel className="w-au">{t("core.logs")}</FormLabel>
            </HStack>
            <Text as={FormLabel}>{t(`core.socket.${status}`)}</Text>
          </HStack>
          <Box
            border="1px solid"
            borderColor="light-border"
            bg="var(--app-surface-2)"
            _dark={{
              borderColor: "gray.600",
              bg: "gray.750",
            }}
            borderRadius={5}
            minHeight="200px"
            maxHeight={"250px"}
            p={2}
            overflowY="auto"
            ref={logsDiv}
          >
            {logs.map((message, i) => (
              <Text fontSize="xs" opacity={0.8} key={i} whiteSpace="pre-line">
                {message}
              </Text>
            ))}
          </Box>
        </FormControl>
      </ModalBody>
      <ModalFooter>
        <HStack w="full" justifyContent="space-between">
          <HStack>
            <Box>
              <Button
                size="sm"
                leftIcon={
                  <ReloadIcon
                    className={classNames({
                      "animate-spin": isRestarting,
                    })}
                  />
                }
                onClick={() => handleRestartCore()}
              >
                {t(isRestarting ? "core.restarting" : "core.restartCore")}
              </Button>
            </Box>
          </HStack>

          <HStack>
            <Button
              size="sm"
              variant="solid"
              colorScheme="primary"
              px="5"
              type="submit"
              isDisabled={isLoading || isPostLoading || jsonError}
              isLoading={isPostLoading}
            >
              {coreId === MAIN_CORE ? t("core.save") : t("cores.saveCore")}
            </Button>
          </HStack>
        </HStack>
      </ModalFooter>
    </form>
  );
};
export const CoreSettingsModal: FC = () => {
  const { isEditingCore } = useDashboardPick("isEditingCore");
  const onClose = useDashboard.setState.bind(null, { isEditingCore: false });
  const { t } = useTranslation();

  return (
    <Modal isOpen={isEditingCore} onClose={onClose} size="3xl">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent mx="3" w="full">
        <ModalHeader pt={6}>
          <HStack gap={2}>
            <Icon color="primary">
              <UsageIcon color="white" />
            </Icon>
            <Text fontWeight="semibold" fontSize="lg">
              {t("core.title")}
            </Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton mt={3} />
        <CoreSettingModalContent />
      </ModalContent>
    </Modal>
  );
};
