import {
  Button,
  HStack,
  Code,
  Divider,
  FormControl,
  FormLabel,
  Input,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  VStack,
  useToast,
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
import { useDashboard, useDashboardPick } from "contexts/DashboardContext";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetch } from "service/http";
import { emptyJsonSub, JsonSubSettings, JsonSubSettingsPanel } from "./JsonSubSettings";
import { emptyDefaults, emptyWebPage, SubWebPagePanel, WebPageDefaults, WebPageSettings } from "./SubWebPage";

type SubSettings = {
  default_template: string;
  expired_template: string;
  disabled_template: string;
  limited_template: string;
  near_expire_template: string;
  near_expire_days: number;
  update_interval: number | null;
  admins: Record<string, Partial<Record<TemplateKey, string>>>;
};
type TemplateKey = "default_template" | "expired_template" | "disabled_template" | "limited_template" | "near_expire_template";

const PLACEHOLDER =
  "#profile-title: base64: Alexander LLC\n#announce: base64: Hos geldin {username}\n#support-url: https://t.me/alexvpns";

const empty: SubSettings = {
  default_template: "",
  expired_template: "",
  disabled_template: "",
  limited_template: "",
  near_expire_template: "",
  near_expire_days: 1,
  update_interval: null,
  admins: {},
};

export const SubSettingsModal: FC = () => {
  const { isEditingSubSettings, onEditingSubSettings } = useDashboardPick("isEditingSubSettings", "onEditingSubSettings");
  const { t } = useTranslation();
  const toast = useToast();
  const [form, setForm] = useState<SubSettings>(empty);
  const [loading, setLoading] = useState(false);
  const [jsonSub, setJsonSub] = useState<JsonSubSettings>(emptyJsonSub);
  const [webPage, setWebPage] = useState<WebPageSettings>(emptyWebPage);
  const [defaults, setDefaults] = useState<WebPageDefaults>(emptyDefaults);

  useEffect(() => {
    if (isEditingSubSettings) {
      fetch("/sub-settings").then((d: SubSettings) => setForm({ ...empty, ...d }));
      fetch("/json-sub-settings").then((d: JsonSubSettings) => setJsonSub({ ...emptyJsonSub, ...d }));
      fetch("/sub-webpage").then((d: WebPageSettings) => setWebPage({ ...emptyWebPage, ...d }));
      fetch("/sub-webpage/defaults").then((d: WebPageDefaults) => setDefaults(d));
    }
  }, [isEditingSubSettings]);

  const set = (k: keyof SubSettings, v: string | number | null) =>
    setForm((f) => ({ ...f, [k]: v }));
  // whose texts are edited: "" = everyone, else one admin's own (empty = the general text)
  const [scope, setScope] = useState("");
  const [adminNames, setAdminNames] = useState<string[]>([]);
  useEffect(() => {
    if (isEditingSubSettings)
      fetch("/admins").then((list: any[]) => setAdminNames(list.map((a) => a.username))).catch(() => {});
  }, [isEditingSubSettings]);
  const tpl = (k: TemplateKey) => (scope ? form.admins?.[scope]?.[k] ?? "" : form[k]);
  const setTpl = (k: TemplateKey, v: string) =>
    scope
      ? setForm((f) => {
          const mine = { ...(f.admins?.[scope] || {}), [k]: v };
          const admins = { ...(f.admins || {}) };
          if (Object.values(mine).some(Boolean)) admins[scope] = mine;
          else delete admins[scope];
          return { ...f, admins };
        })
      : set(k, v);
  const ph = (k: TemplateKey) => (scope ? form[k] || t("sub.inheritsGeneral") : PLACEHOLDER);

  const save = () => {
    setLoading(true);
    Promise.all([
      fetch("/sub-settings", { method: "PUT", body: form }),
      fetch("/json-sub-settings", { method: "PUT", body: jsonSub }),
      fetch("/sub-webpage", { method: "PUT", body: webPage }),
    ])
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
      <ModalOverlay bg="blackAlpha.300" />
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
          <Tabs size="sm" variant="soft-rounded" colorScheme="primary" isLazy>
            <TabList mb={4} gap={1} flexWrap="wrap">
              <Tab>{t("webpage.tab")}</Tab>
              <Tab>{t("jsonSub.tabPage")}</Tab>
              <Tab>JSON</Tab>
            </TabList>
            <TabPanels>
            <TabPanel p={0}>
              <SubWebPagePanel value={webPage} defaults={defaults} onChange={setWebPage} />
            </TabPanel>
            <TabPanel p={0}>
          <VStack align="stretch" spacing={4}>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>{t("sub.scope")}</FormLabel>
              <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
                {["", ...adminNames].map((name) => (
                  <Button
                    key={name || "-"}
                    size="xs"
                    borderRadius="full"
                    colorScheme="primary"
                    variant={scope === name ? "solid" : "outline"}
                    onClick={() => setScope(name)}
                  >
                    {name || t("sub.scopeAll")}
                    {name && form.admins?.[name] ? " •" : ""}
                  </Button>
                ))}
              </HStack>
              <Text fontSize="xs" color="gray.500" mt={1}>
                {scope ? t("sub.scopeAdminHelp", { name: scope }) : t("sub.scopeAllHelp")}
              </Text>
            </FormControl>
            {!scope && (
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>{t("sub.updateInterval")}</FormLabel>
              <Input
                size="sm"
                type="number"
                maxW="120px"
                placeholder="12"
                value={form.update_interval ?? ""}
                onChange={(e) => set("update_interval", e.target.value ? parseInt(e.target.value) || null : null)}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>{t("sub.updateIntervalHelp")}</Text>
            </FormControl>
            )}
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>{t("sub.default")}</FormLabel>
              <Textarea
                size="sm" rows={5} fontFamily="mono" fontSize="xs"
                value={tpl("default_template")}
                onChange={(e) => setTpl("default_template", e.target.value)}
                placeholder={ph("default_template")}
              />
            </FormControl>
            <Divider />
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>{t("sub.expired")}</FormLabel>
              <Textarea
                size="sm" rows={5} fontFamily="mono" fontSize="xs"
                value={tpl("expired_template")}
                onChange={(e) => setTpl("expired_template", e.target.value)}
                placeholder={ph("expired_template")}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>{t("sub.disabled")}</FormLabel>
              <Textarea
                size="sm" rows={5} fontFamily="mono" fontSize="xs"
                value={tpl("disabled_template")}
                onChange={(e) => setTpl("disabled_template", e.target.value)}
                placeholder={ph("disabled_template")}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" mb={1}>{t("sub.limited")}</FormLabel>
              <Textarea
                size="sm" rows={5} fontFamily="mono" fontSize="xs"
                value={tpl("limited_template")}
                onChange={(e) => setTpl("limited_template", e.target.value)}
                placeholder={ph("limited_template")}
              />
            </FormControl>
            <Divider />
            <FormControl isDisabled={!!scope}>
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
                value={tpl("near_expire_template")}
                onChange={(e) => setTpl("near_expire_template", e.target.value)}
                placeholder={ph("near_expire_template")}
              />
            </FormControl>
          </VStack>
            </TabPanel>
            <TabPanel p={0}>
              <JsonSubSettingsPanel value={jsonSub} onChange={setJsonSub} />
            </TabPanel>
            </TabPanels>
          </Tabs>
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
