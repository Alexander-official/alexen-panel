// Turn a protocol on or off for many users at once (app/routers/user.py bulk/protocol).
// Sudo admins only. The main use: give every user a newly added protocol (e.g. Hysteria),
// since a user only gets a protocol in their subscription if it's on their account.
import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { useDashboard } from "contexts/DashboardContext";
import { FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import { serverMessage } from "utils/serverMessage";

const PROTOCOLS = ["vless", "vmess", "trojan", "shadowsocks", "hysteria"] as const;
const LABEL: Record<string, string> = {
  vless: "VLESS", vmess: "VMess", trojan: "Trojan", shadowsocks: "Shadowsocks", hysteria: "Hysteria2",
};

export const BulkProtocolModal: FC<{ isOpen: boolean; onClose: () => void; adminFilter?: string }> = ({ isOpen, onClose, adminFilter }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const inbounds = useDashboard((s) => s.inbounds);
  const refetchUsers = useDashboard((s) => s.refetchUsers);
  // protocols that actually have an inbound on this server
  const available = useMemo(() => PROTOCOLS.filter((p) => (inbounds.get(p as any)?.length || 0) > 0), [inbounds]);
  const [protocol, setProtocol] = useState<string>("hysteria");
  const [action, setAction] = useState<"enable" | "disable">("enable");
  const [scope, setScope] = useState<"all" | "admin">(adminFilter ? "admin" : "all");
  const [busy, setBusy] = useState(false);

  const { data: admins } = useQuery<{ username: string }[]>({
    queryKey: "filter-admins",
    queryFn: () => fetch("/admins"),
    enabled: isOpen,
    staleTime: 60000,
  });

  const pick = available.includes(protocol as any) ? protocol : available[0] || "hysteria";

  const run = () => {
    setBusy(true);
    const body: any = { protocol: pick, enable: action === "enable" };
    if (scope === "admin" && adminFilter) body.admin = adminFilter;
    fetch("/users/bulk/protocol", { method: "POST", body })
      .then((r: { matched: number; changed: number }) => {
        toast({
          status: "success",
          position: "top",
          duration: 5000,
          title: t("bulkProto.done", { changed: r.changed, matched: r.matched, protocol: LABEL[pick] || pick }),
        });
        refetchUsers();
        onClose();
      })
      .catch((e: any) => toast({ status: "error", position: "top", title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic") }))
      .finally(() => setBusy(false));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent mx="3">
        <ModalHeader>{t("bulkProto.title")}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <Text fontSize="sm" color="gray.500">
              {t("bulkProto.help")}
            </Text>
            <Stack direction={{ base: "column", sm: "row" }} spacing={3}>
              <VStack align="stretch" spacing={1} flex={1}>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  {t("bulkProto.protocol")}
                </Text>
                <Select value={pick} onChange={(e) => setProtocol(e.target.value)}>
                  {available.map((p) => (
                    <option key={p} value={p}>
                      {LABEL[p]}
                    </option>
                  ))}
                </Select>
              </VStack>
              <VStack align="stretch" spacing={1} flex={1}>
                <Text fontSize="xs" color="gray.500" fontWeight="medium">
                  {t("bulkProto.action")}
                </Text>
                <Select value={action} onChange={(e) => setAction(e.target.value as any)}>
                  <option value="enable">{t("bulkProto.enable")}</option>
                  <option value="disable">{t("bulkProto.disable")}</option>
                </Select>
              </VStack>
            </Stack>
            <VStack align="stretch" spacing={1}>
              <Text fontSize="xs" color="gray.500" fontWeight="medium">
                {t("bulkProto.scope")}
              </Text>
              <RadioGroup value={scope} onChange={(v) => setScope(v as any)}>
                <Stack spacing={2}>
                  <Radio value="all">{t("bulkProto.allUsers")}</Radio>
                  {adminFilter && <Radio value="admin">{t("bulkProto.onlyAdmin", { admin: adminFilter })}</Radio>}
                </Stack>
              </RadioGroup>
            </VStack>
            {available.length === 0 && (
              <Text fontSize="sm" color="orange.400">
                {t("bulkProto.noInbound")}
              </Text>
            )}
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button colorScheme={action === "disable" ? "red" : "primary"} onClick={run} isLoading={busy} isDisabled={available.length === 0}>
            {action === "enable" ? t("bulkProto.applyEnable") : t("bulkProto.applyDisable")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default BulkProtocolModal;
