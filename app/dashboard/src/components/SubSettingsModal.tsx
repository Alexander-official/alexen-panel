import {
  Button,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useDashboard } from "contexts/DashboardContext";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetch } from "service/http";

type SubSettings = {
  profile_title: string;
  announce: string;
  expired_title: string;
  expired_announce: string;
  disabled_title: string;
  disabled_announce: string;
  limited_title: string;
  limited_announce: string;
  near_expire_days: number;
  near_expire_title: string;
  near_expire_announce: string;
};

const empty: SubSettings = {
  profile_title: "",
  announce: "",
  expired_title: "",
  expired_announce: "",
  disabled_title: "",
  disabled_announce: "",
  limited_title: "",
  limited_announce: "",
  near_expire_days: 1,
  near_expire_title: "",
  near_expire_announce: "",
};

export const SubSettingsModal: FC = () => {
  const { isEditingSubSettings, onEditingSubSettings } = useDashboard();
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState<SubSettings>(empty);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isEditingSubSettings) {
      fetch("/sub-settings").then((d: SubSettings) => setForm({ ...empty, ...d }));
    }
  }, [isEditingSubSettings]);

  const set = (k: keyof SubSettings, v: string | number) =>
    setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    setLoading(true);
    fetch("/sub-settings", { method: "PUT", body: form })
      .then(() => {
        toast({ status: "success", title: t("admins.saved"), duration: 2000 });
        onEditingSubSettings(false);
      })
      .catch(() =>
        toast({ status: "error", title: t("admins.error"), duration: 3000 })
      )
      .finally(() => setLoading(false));
  };

  const Pair: FC<{ label: string; titleKey: keyof SubSettings; annKey: keyof SubSettings }> = ({
    label,
    titleKey,
    annKey,
  }) => (
    <>
      <Text fontSize="sm" fontWeight="medium">
        {label}
      </Text>
      <FormControl>
        <FormLabel fontSize="xs" mb={1}>
          {t("sub.title")}
        </FormLabel>
        <Input
          size="sm"
          value={form[titleKey] as string}
          onChange={(e) => set(titleKey, e.target.value)}
          placeholder="Alexander LLC  /  base64:..."
        />
      </FormControl>
      <FormControl>
        <FormLabel fontSize="xs" mb={1}>
          {t("sub.announce")}
        </FormLabel>
        <Textarea
          size="sm"
          rows={2}
          value={form[annKey] as string}
          onChange={(e) => set(annKey, e.target.value)}
          placeholder={t("sub.announcePlaceholder")}
        />
      </FormControl>
    </>
  );

  return (
    <Modal isOpen={isEditingSubSettings} onClose={() => onEditingSubSettings(false)} size="xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent mx="3">
        <ModalHeader pt={6}>
          <Text fontWeight="semibold" fontSize="lg">
            {t("header.subSettings")}
          </Text>
          <Text fontSize="xs" color="gray.500" fontWeight="normal">
            {t("sub.help")}
          </Text>
        </ModalHeader>
        <ModalCloseButton mt={3} />
        <ModalBody>
          <VStack align="stretch" spacing={3}>
            <Pair label={t("sub.default")} titleKey="profile_title" annKey="announce" />
            <Divider />
            <Pair label={t("sub.expired")} titleKey="expired_title" annKey="expired_announce" />
            <Divider />
            <Pair label={t("sub.disabled")} titleKey="disabled_title" annKey="disabled_announce" />
            <Divider />
            <Pair label={t("sub.limited")} titleKey="limited_title" annKey="limited_announce" />
            <Divider />
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>
                {t("sub.nearExpireDays")}
              </FormLabel>
              <Input
                size="sm"
                type="number"
                maxW="120px"
                value={form.near_expire_days}
                onChange={(e) => set("near_expire_days", parseInt(e.target.value) || 0)}
              />
            </FormControl>
            <Pair
              label={t("sub.nearExpire")}
              titleKey="near_expire_title"
              annKey="near_expire_announce"
            />
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={() => onEditingSubSettings(false)}>
            {t("cancel")}
          </Button>
          <Button colorScheme="primary" isLoading={loading} onClick={save}>
            {t("admins.save")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
