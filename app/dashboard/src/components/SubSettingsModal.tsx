import {
  Button,
  Code,
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
  default_template: string;
  expired_template: string;
  disabled_template: string;
  limited_template: string;
  near_expire_template: string;
  near_expire_days: number;
};

const PLACEHOLDER =
  "#profile-title: base64: Alexander LLC\n#announce: base64: Hos geldin {username}\n#support-url: https://t.me/alexvpns";

const empty: SubSettings = {
  default_template: "",
  expired_template: "",
  disabled_template: "",
  limited_template: "",
  near_expire_template: "",
  near_expire_days: 1,
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

  return (
    <Modal
      isOpen={isEditingSubSettings}
      onClose={() => onEditingSubSettings(false)}
      size="2xl"
      scrollBehavior="inside"
    >
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent mx="3">
        <ModalHeader pt={6}>
          <Text fontWeight="semibold" fontSize="lg">
            {t("header.subSettings")}
          </Text>
          <Text fontSize="xs" color="gray.500" fontWeight="normal" mt={1}>
            {t("sub.help")}
          </Text>
          <Text fontSize="xs" color="gray.500" fontWeight="normal" mt={1}>
            {t("sub.directives")}:{" "}
            <Code fontSize="xs">#profile-title:</Code>{" "}
            <Code fontSize="xs">#announce:</Code>{" "}
            <Code fontSize="xs">#support-url:</Code> ·{" "}
            <Code fontSize="xs">base64:</Code> {t("sub.base64Hint")}
          </Text>
          <Text fontSize="xs" color="gray.500" fontWeight="normal" mt={1}>
            {t("sub.placeholders")}:{" "}
            <Code fontSize="xs">{"{username}"}</Code>{" "}
            <Code fontSize="xs">{"{used}"}</Code>{" "}
            <Code fontSize="xs">{"{limit}"}</Code>{" "}
            <Code fontSize="xs">{"{remaining}"}</Code>{" "}
            <Code fontSize="xs">{"{expiretime}"}</Code>{" "}
            <Code fontSize="xs">{"{days}"}</Code>
          </Text>
        </ModalHeader>
        <ModalCloseButton mt={3} />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>{t("sub.default")}</FormLabel>
              <Textarea
                size="sm" rows={5} fontFamily="mono" fontSize="xs"
                value={form.default_template}
                onChange={(e) => set("default_template", e.target.value)}
                placeholder={PLACEHOLDER}
              />
            </FormControl>
            <Divider />
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>{t("sub.expired")}</FormLabel>
              <Textarea
                size="sm" rows={5} fontFamily="mono" fontSize="xs"
                value={form.expired_template}
                onChange={(e) => set("expired_template", e.target.value)}
                placeholder={PLACEHOLDER}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>{t("sub.disabled")}</FormLabel>
              <Textarea
                size="sm" rows={5} fontFamily="mono" fontSize="xs"
                value={form.disabled_template}
                onChange={(e) => set("disabled_template", e.target.value)}
                placeholder={PLACEHOLDER}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>{t("sub.limited")}</FormLabel>
              <Textarea
                size="sm" rows={5} fontFamily="mono" fontSize="xs"
                value={form.limited_template}
                onChange={(e) => set("limited_template", e.target.value)}
                placeholder={PLACEHOLDER}
              />
            </FormControl>
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
                onChange={(e) =>
                  set("near_expire_days", parseInt(e.target.value) || 0)
                }
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>{t("sub.nearExpire")}</FormLabel>
              <Textarea
                size="sm" rows={5} fontFamily="mono" fontSize="xs"
                value={form.near_expire_template}
                onChange={(e) => set("near_expire_template", e.target.value)}
                placeholder={PLACEHOLDER}
              />
            </FormControl>
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
