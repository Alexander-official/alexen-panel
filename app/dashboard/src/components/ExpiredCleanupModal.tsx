// Auto-delete expired users after a configurable grace period, and a one-shot button to delete
// all currently expired users. Sudo admins only. Backend: GET/PUT /user-cleanup,
// POST /users/delete-expired (app/routers/settings.py, app/routers/user.py).
import {
  Box,
  Button,
  Checkbox,
  Divider,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Switch,
  Text,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetch } from "service/http";
import { serverMessage } from "utils/serverMessage";

type Cleanup = { auto_delete_enabled: boolean; auto_delete_hours: number; include_limited: boolean };

export const ExpiredCleanupModal: FC<{ isOpen: boolean; onClose: () => void; onDeleted?: () => void }> = ({
  isOpen,
  onClose,
  onDeleted,
}) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [cfg, setCfg] = useState<Cleanup>({ auto_delete_enabled: false, auto_delete_hours: 24, include_limited: false });
  const [savingBusy, setSaving] = useState(false);
  const [delBusy, setDel] = useState(false);
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setConfirm(false);
    fetch("/user-cleanup").then((d: Cleanup) => d && setCfg(d)).catch(() => {});
  }, [isOpen]);

  const err = (e: any) =>
    toast({ status: "error", position: "top", title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic") });

  const save = () => {
    setSaving(true);
    fetch("/user-cleanup", { method: "PUT", body: cfg })
      .then((d: Cleanup) => {
        setCfg(d);
        toast({ status: "success", position: "top", duration: 3000, title: t("cleanup.saved") });
      })
      .catch(err)
      .finally(() => setSaving(false));
  };

  const deleteNow = () => {
    setDel(true);
    fetch(`/users/delete-expired?include_limited=${cfg.include_limited}`, { method: "POST" })
      .then((names: string[]) => {
        toast({ status: "success", position: "top", duration: 5000, title: t("cleanup.deleted", { count: names.length }) });
        setConfirm(false);
        onDeleted?.();
        onClose();
      })
      .catch(err)
      .finally(() => setDel(false));
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="md">
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent>
        <ModalHeader>{t("cleanup.title")}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <HStack align="flex-start">
              <Switch isChecked={cfg.auto_delete_enabled} onChange={(e) => setCfg({ ...cfg, auto_delete_enabled: e.target.checked })} />
              <Box>
                <Text fontSize="sm" fontWeight="medium">{t("cleanup.autoEnable")}</Text>
                <Text fontSize="xs" color="gray.500">{t("cleanup.autoHelp")}</Text>
              </Box>
            </HStack>
            <HStack opacity={cfg.auto_delete_enabled ? 1 : 0.5} pointerEvents={cfg.auto_delete_enabled ? "auto" : "none"}>
              <Text fontSize="sm">{t("cleanup.after")}</Text>
              <Input
                size="sm" type="number" min={1} max={8760} w="90px"
                value={cfg.auto_delete_hours}
                onChange={(e) => setCfg({ ...cfg, auto_delete_hours: Math.max(1, +e.target.value || 0) })}
              />
              <Text fontSize="sm" color="gray.500">{t("cleanup.hours")}</Text>
            </HStack>
            <Checkbox size="sm" isChecked={cfg.include_limited} onChange={(e) => setCfg({ ...cfg, include_limited: e.target.checked })}>
              {t("cleanup.includeLimited")}
            </Checkbox>
            <Divider />
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1}>{t("cleanup.manualTitle")}</Text>
              <Text fontSize="xs" color="gray.500" mb={2}>{t("cleanup.manualHelp")}</Text>
              {!confirm ? (
                <Button size="sm" colorScheme="red" variant="outline" onClick={() => setConfirm(true)}>
                  {t("cleanup.deleteNow")}
                </Button>
              ) : (
                <HStack>
                  <Button size="sm" colorScheme="red" isLoading={delBusy} onClick={deleteNow}>
                    {t("cleanup.confirmDelete")}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirm(false)}>{t("cleanup.cancel")}</Button>
                </HStack>
              )}
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button size="sm" variant="ghost" mr={2} onClick={onClose}>{t("cleanup.close")}</Button>
          <Button size="sm" colorScheme="primary" isLoading={savingBusy} onClick={save}>{t("cleanup.save")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default ExpiredCleanupModal;
