import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  ButtonProps,
  chakra,
  Checkbox,
  Collapse,
  FormControl,
  FormLabel,
  Select,
  HStack,
  Input as ChakraInput,
  IconButton,
  Switch,
  Text,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "./PageSurface";
import {
  EyeIcon,
  EyeSlashIcon,
  PlusIcon as HeroIconPlusIcon,
  SquaresPlusIcon,
} from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  FetchNodesQueryKey,
  getNodeDefaultValues,
  NodeSchema,
  NodeType,
  useNodes,
  useNodesQuery,
} from "contexts/NodesContext";
import { FC, ReactNode, useState } from "react";
import { Controller, useForm, UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import {
  UseMutateFunction,
  useMutation,
  useQuery,
  useQueryClient,
} from "react-query";
import "slick-carousel/slick/slick-theme.css";
import "slick-carousel/slick/slick.css";
import { Status } from "types/User";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";
import { useDashboard, useDashboardPick } from "../contexts/DashboardContext";
import { applyNodeVpn, NodeVpnToggles } from "./VpnPage";
import { FetchCoresQueryKey, useCoreSettings, useCoresQuery } from "contexts/CoreSettingsContext";
import { DeleteNodeModal } from "./DeleteNodeModal";
import { DeleteIcon } from "./DeleteUserModal";
import { ReloadIcon } from "./Filters";
import { Icon } from "./Icon";
import { NodeModalStatusBadge } from "./NodeModalStatusBadge";
import {
  emptySSH,
  FlagSelect,
  InstallBox,
  InstallProgress,
  saveNodeExtra,
  SSHFields,
  sshFilled,
  startInstall,
  useInstall,
  useNodesExtras,
  useNodesSystem,
  VpsCompact,
  VpsStatus,
} from "./NodeExtras";
import { flagEmoji } from "utils/flags";

import { fetch } from "service/http";
import { serverMessage } from "utils/serverMessage";
import { Input } from "./Input";

const CustomInput = chakra(Input, {
  baseStyle: {
    bg: "var(--app-surface)",
    _dark: {
      bg: "gray.700",
    },
  },
});

const ModalIcon = chakra(SquaresPlusIcon, {
  baseStyle: {
    w: 5,
    h: 5,
  },
});

const PlusIcon = chakra(HeroIconPlusIcon, {
  baseStyle: {
    w: 5,
    h: 5,
    strokeWidth: 2,
  },
});

// which Xray core config (Core settings → cores) the node runs; a new core
// (a copy of the main one) can be made right here for this node
const NEW_CORE = "__new__";
const CoreSelect: FC<{ form: UseFormReturn<NodeType> }> = ({ form }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: cores } = useCoresQuery();
  const { createCore } = useCoreSettings();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const value = form.watch("core_id") || "main";

  const create = () => {
    if (!name.trim()) return;
    setBusy(true);
    createCore(name.trim())
      .then((c) => {
        queryClient.invalidateQueries(FetchCoresQueryKey);
        form.setValue("core_id", c.id, { shouldDirty: true });
        setNaming(false);
        setName("");
      })
      .catch((e: any) =>
        toast({ title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic"), status: "error", position: "top", duration: 4000 })
      )
      .finally(() => setBusy(false));
  };

  return (
    <FormControl>
      <FormLabel fontSize="sm" mb={1}>
        {t("cores.nodeCore")}
      </FormLabel>
      <Select
        size="sm"
        borderRadius="md"
        value={naming ? NEW_CORE : value}
        onChange={(e) => {
          if (e.target.value === NEW_CORE) setNaming(true);
          else {
            setNaming(false);
            form.setValue("core_id", e.target.value, { shouldDirty: true });
          }
        }}
      >
        {(cores || [{ id: "main", name: "Main", inbounds: [] }]).map((c) => (
          <option key={c.id} value={c.id}>
            {c.id === "main" ? t("cores.main") : c.name}
            {c.inbounds.length ? ` · ${c.inbounds.length} inbound` : ""}
          </option>
        ))}
        <option value={NEW_CORE}>+ {t("cores.newForNode")}</option>
      </Select>
      {naming && (
        <HStack mt={2}>
          <ChakraInput
            size="sm"
            borderRadius="md"
            autoFocus
            placeholder={t("cores.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                create();
              }
            }}
          />
          <Button size="sm" colorScheme="primary" flexShrink={0} isLoading={busy} onClick={create}>
            {t("cores.create")}
          </Button>
        </HStack>
      )}
      <Text fontSize="xs" color="gray.500" mt={1}>
        {t(naming ? "cores.newForNodeHelp" : "cores.nodeCoreHelp")}
      </Text>
    </FormControl>
  );
};

type AccordionInboundType = {
  toggleAccordion: () => void;
  node: NodeType;
};

const NodeAccordion: FC<AccordionInboundType> = ({ toggleAccordion, node }) => {
  const { updateNode, reconnectNode, setDeletingNode } = useNodes();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const form = useForm<NodeType>({
    defaultValues: node,
    resolver: zodResolver(NodeSchema),
  });
  const handleDeleteNode = setDeletingNode.bind(null, node);

  const { isLoading, mutate } = useMutation(updateNode, {
    onSuccess: () => {
      generateSuccessMessage("Node updated successfully", toast);
      queryClient.invalidateQueries(FetchNodesQueryKey);
    },
    onError: (e) => {
      generateErrorMessage(e, toast, form);
    },
  });

  const { isLoading: isReconnecting, mutate: reconnect } = useMutation(
    reconnectNode.bind(null, node),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(FetchNodesQueryKey);
      },
    }
  );

  const { data: extras } = useNodesExtras();
  const { data: system } = useNodesSystem();
  const extra = node.id ? extras?.[String(node.id)] : undefined;
  const sys = node.id ? system?.[String(node.id)] : undefined;
  const setFlag = (flag: string) =>
    node.id && saveNodeExtra(node.id, { flag }).then(() => queryClient.invalidateQueries("nodes-extras"));

  const nodeStatus: Status = isReconnecting
    ? "connecting"
    : node.status
    ? node.status
    : "error";

  return (
    <AccordionItem
      border="1px solid"
      _dark={{ borderColor: "gray.600", bg: "gray.750" }}
      _light={{ borderColor: "light-border" }}
      borderRadius="lg"
      bg="var(--app-surface)"
      p={1}
      w="full"
    >
      <AccordionButton
        px={2}
        borderRadius="md"
        _hover={{ bg: "var(--app-surface-2)", _dark: { bg: "gray.700" } }}
        _expanded={{ bg: "transparent" }}
        onClick={toggleAccordion}
      >
        <HStack w="full" justifyContent="space-between" pr={2}>
          <Text
            as="span"
            fontWeight="medium"
            fontSize="sm"
            flex="1"
            textAlign="left"
            color="gray.700"
            _dark={{ color: "gray.300" }}
          >
            {extra?.flag ? `${flagEmoji(extra.flag)} ` : ""}
            {node.name}
          </Text>
          <HStack>
            <VpsCompact sys={sys} />
            {node.xray_version && (
              <Badge
                colorScheme="primary"
                rounded="full"
                display="inline-flex"
                px={3}
                py={1}
              >
                <Text
                  textTransform="capitalize"
                  fontSize="0.7rem"
                  fontWeight="medium"
                  letterSpacing="tighter"
                >
                  Xray {node.xray_version}
                </Text>
              </Badge>
            )}
            {node.status && <NodeModalStatusBadge status={nodeStatus} compact />}
          </HStack>
        </HStack>
        <AccordionIcon />
      </AccordionButton>
      <AccordionPanel px={2} pb={2}>
        <VStack pb={3} alignItems="flex-start">
          {nodeStatus === "error" && (
            <Alert status="error" size="xs">
              <Box>
                <HStack w="full">
                  <AlertIcon w={4} />
                  <Text marginInlineEnd={0}>{node.message}</Text>
                </HStack>
                <HStack justifyContent="flex-end" w="full">
                  <Button
                    size="sm"
                    aria-label="reconnect node"
                    leftIcon={<ReloadIcon />}
                    onClick={() => reconnect()}
                    disabled={isReconnecting}
                  >
                    {isReconnecting
                      ? t("nodes.reconnecting")
                      : t("nodes.reconnect")}
                  </Button>
                </HStack>
              </Box>
            </Alert>
          )}
        </VStack>
        <NodeForm
          form={form}
          mutate={mutate}
          isLoading={isLoading}
          submitBtnText={t("nodes.editNode")}
          vpnSlot={
            node.id ? (
              <VStack w="full" align="stretch" spacing={3}>
                <FlagSelect value={extra?.flag || ""} onChange={setFlag} />
                <NodeVpnToggles nodeKey={String(node.id)} />
                <VpsStatus sys={sys} />
                <InstallBox nodeId={node.id} name={node.name} address={node.address} saved={extra?.ssh} />
              </VStack>
            ) : null
          }
          btnLeftAdornment={
            <Tooltip label={t("delete")} placement="top">
              <IconButton
                colorScheme="red"
                variant="ghost"
                size="sm"
                aria-label="delete node"
                onClick={handleDeleteNode}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          }
        />
      </AccordionPanel>
    </AccordionItem>
  );
};

type AddNodeFormType = {
  toggleAccordion: () => void;
  resetAccordions: () => void;
};

const AddNodeForm: FC<AddNodeFormType> = ({
  toggleAccordion,
  resetAccordions,
}) => {
  const toast = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { addNode } = useNodes();
  const form = useForm<NodeType>({
    resolver: zodResolver(NodeSchema),
    defaultValues: {
      ...getNodeDefaultValues(),
      add_as_new_host: false,
    },
  });
  const [vpnChoice, setVpnChoice] = useState({ awg: false, ovpn: false });
  const [flag, setFlag] = useState("");
  const [ssh, setSsh] = useState(emptySSH());
  const [install, setInstall] = useState({ on: false, node: true, agent: true, save: true });
  const openJob = useInstall((s) => s.open);
  const { isLoading, mutate } = useMutation(addNode, {
    onSuccess: (created: any) => {
      if (created?.id) {
        const name = form.getValues("name");
        const withLogin = install.on && sshFilled(ssh);
        // the flag (and the login, if it should be kept), then the install over SSH
        saveNodeExtra(created.id, { flag, ...(withLogin && install.save ? { ssh } : {}) })
          .catch(() => {})
          .finally(() => {
            queryClient.invalidateQueries("nodes-extras");
            if (withLogin)
              startInstall(created.id, { ssh, save: install.save, node: install.node, agent: install.agent })
                .then((job) => openJob(job, name))
                .catch((e: any) => toast({ status: "error", title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic"), position: "top" }));
          });
        setFlag("");
        setSsh(emptySSH());
        setInstall({ on: false, node: true, agent: true, save: true });
      }
      // the VPN choice needs the node's id: apply it once the node exists
      if (created?.id && (vpnChoice.awg || vpnChoice.ovpn)) {
        applyNodeVpn(String(created.id), vpnChoice).catch(() => {});
        setVpnChoice({ awg: false, ovpn: false });
      }
      generateSuccessMessage(
        t("nodes.addNodeSuccess", { name: form.getValues("name") }),
        toast
      );
      queryClient.invalidateQueries(FetchNodesQueryKey);
      form.reset();
      resetAccordions();
    },
    onError: (e) => {
      generateErrorMessage(e, toast, form);
    },
  });
  return (
    <AccordionItem
      border="1px solid"
      _dark={{ borderColor: "gray.600", bg: "gray.750" }}
      _light={{ borderColor: "light-border" }}
      borderRadius="lg"
      bg="var(--app-surface)"
      p={1}
      w="full"
    >
      <AccordionButton
        px={2}
        borderRadius="md"
        _hover={{ bg: "var(--app-surface-2)", _dark: { bg: "gray.700" } }}
        _expanded={{ bg: "transparent" }}
        onClick={toggleAccordion}
      >
        <Text
          as="span"
          fontWeight="medium"
          fontSize="sm"
          flex="1"
          textAlign="left"
          color="gray.700"
          _dark={{ color: "gray.300" }}
          display="flex"
          gap={1}
        >
          <PlusIcon display={"inline-block"} />{" "}
          <span>{t("nodes.addNewMarzbanNode")}</span>
        </Text>
      </AccordionButton>
      <AccordionPanel px={2} py={4}>
        <NodeForm
          form={form}
          mutate={mutate}
          isLoading={isLoading}
          submitBtnText={t("nodes.addNode")}
          btnProps={{ variant: "solid" }}
          addAsHost
          vpnSlot={
            <VStack w="full" align="stretch" spacing={3}>
              <FlagSelect value={flag} onChange={setFlag} />
              <NodeVpnToggles value={vpnChoice} onChange={setVpnChoice} />
              <Box p={3} borderRadius="lg" borderWidth="1px" borderColor="light-border" _dark={{ borderColor: "gray.600" }}>
                <HStack justifyContent="space-between">
                  <Box>
                    <Text fontSize="sm" fontWeight="medium">
                      {t("nodeExtra.installOnAdd")}
                    </Text>
                    <Text fontSize="xs" color="gray.500">
                      {t("nodeExtra.installOnAddHelp")}
                    </Text>
                  </Box>
                  <Switch colorScheme="primary" isChecked={install.on} onChange={(e) => setInstall({ ...install, on: e.target.checked })} />
                </HStack>
                <Collapse in={install.on} animateOpacity>
                  <VStack align="stretch" spacing={2} pt={3}>
                    <SSHFields value={ssh} onChange={setSsh} addressHint={form.watch("address")} />
                    <Checkbox size="sm" isChecked={install.node} onChange={(e) => setInstall({ ...install, node: e.target.checked })}>
                      <Text fontSize="sm">{t("nodeExtra.installNode")}</Text>
                    </Checkbox>
                    <Checkbox size="sm" isChecked={install.agent} onChange={(e) => setInstall({ ...install, agent: e.target.checked })}>
                      <Text fontSize="sm">{t("nodeExtra.installAgent")}</Text>
                    </Checkbox>
                    <Checkbox size="sm" isChecked={install.save} onChange={(e) => setInstall({ ...install, save: e.target.checked })}>
                      <Text fontSize="sm">{t("nodeExtra.saveLogin")}</Text>
                    </Checkbox>
                  </VStack>
                </Collapse>
              </Box>
            </VStack>
          }
        />
      </AccordionPanel>
    </AccordionItem>
  );
};

type NodeFormType = FC<{
  form: UseFormReturn<NodeType>;
  mutate: UseMutateFunction<unknown, unknown, any>;
  isLoading: boolean;
  submitBtnText: string;
  btnProps?: Partial<ButtonProps>;
  btnLeftAdornment?: ReactNode;
  addAsHost?: boolean;
  vpnSlot?: ReactNode;
}>;

const NodeForm: NodeFormType = ({
  form,
  mutate,
  isLoading,
  submitBtnText,
  btnProps = {},
  btnLeftAdornment,
  addAsHost = false,
  vpnSlot,
}) => {
  const { t } = useTranslation();
  const [showCertificate, setShowCertificate] = useState(false);
  const { data: nodeSettings, isLoading: nodeSettingsLoading } = useQuery({
    queryKey: "node-settings",
    queryFn: () =>
      fetch<{
        min_node_version: string;
        certificate: string;
      }>("/node/settings"),
  });
  function selectText(node: HTMLElement) {
    // @ts-ignore
    if (document.body.createTextRange) {
      // @ts-ignore
      const range = document.body.createTextRange();
      range.moveToElementText(node);
      range.select();
    } else if (window.getSelection) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(node);
      selection!.removeAllRanges();
      selection!.addRange(range);
    } else {
      console.warn("Could not select text in node: Unsupported browser.");
    }
  }

  return (
    <form onSubmit={form.handleSubmit((v) => mutate(v))}>
      <VStack>
        {nodeSettings && nodeSettings.certificate && (
          <Box
            w="full"
            p={3}
            borderRadius="lg"
            border="1px solid"
            borderColor="light-border"
            bg="var(--app-surface-2)"
            _dark={{ borderColor: "gray.600", bg: "gray.700" }}
          >
            <Box display="flex" flexDirection="column" overflow="hidden" fontSize="sm">
              <span>{t("nodes.connection-hint")}</span>
              <HStack justify="end" py={2}>
                <Button
                  as="a"
                  colorScheme="primary"
                  size="xs"
                  download="ssl_client_cert.pem"
                  href={URL.createObjectURL(
                    new Blob([nodeSettings.certificate], { type: "text/plain" })
                  )}
                >
                  {t("nodes.download-certificate")}
                </Button>
                <Tooltip
                  placement="top"
                  label={t(
                    !showCertificate
                      ? "nodes.show-certificate"
                      : "nodes.show-certificate"
                  )}
                >
                  <IconButton
                    aria-label={t(
                      !showCertificate
                        ? "nodes.show-certificate"
                        : "nodes.show-certificate"
                    )}
                    onClick={setShowCertificate.bind(null, !showCertificate)}
                    variant="ghost"
                    size="xs"
                  >
                    {!showCertificate ? (
                      <EyeIcon width="15px" />
                    ) : (
                      <EyeSlashIcon width="15px" />
                    )}
                  </IconButton>
                </Tooltip>
              </HStack>
              <Collapse in={showCertificate} animateOpacity>
                <Text
                  bg="var(--app-surface)"
                  _dark={{
                    bg: "blackAlpha.300",
                  }}
                  rounded="md"
                  p="2"
                  lineHeight="1.2"
                  fontSize="10px"
                  fontFamily="Courier"
                  whiteSpace="pre"
                  overflow="auto"
                  onClick={(e) => {
                    selectText(e.target as HTMLElement);
                  }}
                >
                  {nodeSettings.certificate}
                </Text>
              </Collapse>
            </Box>
          </Box>
        )}

        <HStack w="full">
          <FormControl>
            <CustomInput
              label={t("nodes.nodeName")}
              size="sm"
              placeholder="Node-2"
              {...form.register("name")}
              error={form.formState?.errors?.name?.message}
            />
          </FormControl>
          <HStack px={1}>
            <Controller
              name="status"
              control={form.control}
              render={({ field }) => {
                return (
                  <Tooltip
                    key={field.value}
                    placement="top"
                    label={
                      `${t("usersTable.status")}: ` +
                      (field.value !== "disabled" ? t("active") : t("disabled"))
                    }
                    textTransform="capitalize"
                  >
                    <Box mt="6">
                      <Switch
                        colorScheme="primary"
                        isChecked={field.value !== "disabled"}
                        onChange={(e) => {
                          if (e.target.checked) {
                            field.onChange("connecting");
                          } else {
                            field.onChange("disabled");
                          }
                        }}
                      />
                    </Box>
                  </Tooltip>
                );
              }}
            />
          </HStack>
        </HStack>
        <HStack alignItems="flex-start" w="100%">
          <Box w="100%">
            <CustomInput
              label={t("nodes.nodeAddress")}
              size="sm"
              placeholder="51.20.12.13"
              {...form.register("address")}
              error={form.formState?.errors?.address?.message}
            />
          </Box>
        </HStack>
        <HStack alignItems="flex-start" w="100%">
        <Box>
            <CustomInput
              label={t("nodes.nodePort")}
              size="sm"
              placeholder="62050"
              {...form.register("port")}
              error={form.formState?.errors?.port?.message}
            />
          </Box>
          <Box>
            <CustomInput
              label={t("nodes.nodeAPIPort")}
              size="sm"
              placeholder="62051"
              {...form.register("api_port")}
              error={form.formState?.errors?.api_port?.message}
            />
          </Box>
          <Box>
            <CustomInput
              label={t("nodes.usageCoefficient")}
              size="sm"
              placeholder="1"
              {...form.register("usage_coefficient")}
              error={form.formState?.errors?.usage_coefficient?.message}
            />
          </Box>
        </HStack>
        <CoreSelect form={form} />
        {vpnSlot}
        {addAsHost && (
          <FormControl py={1}>
            <Checkbox {...form.register("add_as_new_host")}>
              <FormLabel m={0}>{t("nodes.addHostForEveryInbound")}</FormLabel>
            </Checkbox>
          </FormControl>
        )}
        <HStack w="full">
          {btnLeftAdornment}
          <Button
            flexGrow={1}
            type="submit"
            colorScheme="primary"
            size="sm"
            px={5}
            w="full"
            isLoading={isLoading}
            {...btnProps}
          >
            {submitBtnText}
          </Button>
        </HStack>
      </VStack>
    </form>
  );
};

export const NodesDialog: FC = () => {
  const { isEditingNodes, onEditingNodes } = useDashboardPick("isEditingNodes", "onEditingNodes");
  const { t } = useTranslation();
  const [openAccordions, setOpenAccordions] = useState<any>({});
  const { data: nodes, isLoading } = useNodesQuery();

  const onClose = () => {
    setOpenAccordions({});
    onEditingNodes(false);
  };

  const toggleAccordion = (index: number | string) => {
    if (openAccordions[String(index)]) {
      delete openAccordions[String(index)];
    } else openAccordions[String(index)] = {};

    setOpenAccordions({ ...openAccordions });
  };

  return (
    <>
      <Modal isOpen={isEditingNodes} onClose={onClose}>
        <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
        <ModalContent mx="3" w="fit-content" maxW="3xl">
          <ModalHeader pt={6}>
            <Icon color="primary">
              <ModalIcon />
            </Icon>
          </ModalHeader>
          <ModalCloseButton mt={3} />
          <ModalBody w="440px" pb={6} pt={3}>
            <Text mb={3} opacity={0.8} fontSize="sm">
              {t("nodes.title")}
            </Text>
            {isLoading && "loading..."}

            <Accordion
              w="full"
              allowToggle
              index={Object.keys(openAccordions).map((i) => parseInt(i))}
            >
              <VStack w="full">
                {!isLoading &&
                  nodes &&
                  nodes.map((node, index) => {
                    return (
                      <NodeAccordion
                        toggleAccordion={() => toggleAccordion(index)}
                        key={node.name}
                        node={node}
                      />
                    );
                  })}

                <AddNodeForm
                  toggleAccordion={() => toggleAccordion((nodes || []).length)}
                  resetAccordions={() => setOpenAccordions({})}
                />
              </VStack>
            </Accordion>
          </ModalBody>
        </ModalContent>
      </Modal>
      <DeleteNodeModal deleteCallback={() => setOpenAccordions({})} />
      <InstallProgress />
    </>
  );
};
