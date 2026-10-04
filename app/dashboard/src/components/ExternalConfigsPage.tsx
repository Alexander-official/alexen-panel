import {
  Badge,
  Box,
  Button,
  Card,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
  SimpleGrid,
  Switch,
  Text,
  Textarea,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { FC, ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";

type ExternalConfig = {
  id: string;
  name: string;
  links: string;
  enabled: boolean;
  position: "top" | "bottom";
  only_active: boolean;
  groups: string[];
};
type ExternalSettings = {
  configs: ExternalConfig[];
  generated_sort: string;
  external_sort: string;
};
type Preview = {
  username: string;
  items: { remark: string; link: string; source: "generated" | "external" }[];
};

const LINK_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/\S+$/;
const linkCount = (links: string) =>
  links.split("\n").filter((l) => LINK_RE.test(l.trim())).length;
const newId = () =>
  (window.crypto as any)?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
const empty = (): ExternalConfig => ({
  id: newId(),
  name: "",
  links: "",
  enabled: true,
  position: "bottom",
  only_active: true,
  groups: [],
});
const icon = { width: 16, height: 16 };

const Panel: FC<{ title: string; help?: string; children: ReactNode }> = ({ title, help, children }) => (
  <Card
    p={{ base: 3, md: 5 }}
    borderWidth="1px"
    borderColor="light-border"
    boxShadow="none"
    borderRadius="12px"
    _dark={{ borderColor: "gray.600" }}
  >
    <Text fontWeight="semibold">{title}</Text>
    {help && (
      <Text fontSize="xs" color="gray.500" mt={0.5}>
        {help}
      </Text>
    )}
    <Box mt={3}>{children}</Box>
  </Card>
);

const GroupPicker: FC<{ all: string[]; value: string[]; onChange: (v: string[]) => void }> = ({
  all,
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  if (all.length === 0)
    return (
      <Text fontSize="xs" color="gray.500">
        {t("external.noGroups")}
      </Text>
    );
  return (
    <HStack spacing={1.5} flexWrap="wrap">
      {all.map((g) => {
        const on = value.includes(g);
        return (
          <Button
            key={g}
            size="xs"
            borderRadius="full"
            colorScheme="primary"
            variant={on ? "solid" : "outline"}
            onClick={() => onChange(on ? value.filter((x) => x !== g) : [...value, g])}
          >
            {g}
          </Button>
        );
      })}
    </HStack>
  );
};

const ConfigForm: FC<{
  value: ExternalConfig;
  groups: string[];
  onChange: (v: ExternalConfig) => void;
}> = ({ value, groups, onChange }) => {
  const { t } = useTranslation();
  const set = (patch: Partial<ExternalConfig>) => onChange({ ...value, ...patch });
  const count = linkCount(value.links);
  const bad = value.links.trim() !== "" && count === 0;
  return (
    <VStack align="stretch" spacing={3}>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <FormControl>
          <FormLabel>{t("external.name")}</FormLabel>
          <Input size="sm" value={value.name} onChange={(e) => set({ name: e.target.value })} placeholder={t("external.namePlaceholder")} />
        </FormControl>
        <FormControl>
          <FormLabel>{t("external.position")}</FormLabel>
          <Select size="sm" value={value.position} onChange={(e) => set({ position: e.target.value as any })}>
            <option value="top">{t("external.top")}</option>
            <option value="bottom">{t("external.bottom")}</option>
          </Select>
        </FormControl>
      </SimpleGrid>
      <FormControl isInvalid={bad}>
        <FormLabel>
          {t("external.links")}{" "}
          <Text as="span" fontSize="xs" color={bad ? "red.400" : "gray.500"} fontWeight="normal">
            · {bad ? t("external.invalid") : t("external.linkCount", { count })}
          </Text>
        </FormLabel>
        <Textarea
          size="sm"
          rows={4}
          fontFamily="mono"
          fontSize="xs"
          value={value.links}
          onChange={(e) => set({ links: e.target.value })}
          placeholder={"vless://...#My server\nss://...#Backup"}
        />
        <Text fontSize="xs" color="gray.500" mt={1}>
          {t("external.linksHelp")}
        </Text>
      </FormControl>
      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <HStack justifyContent="space-between">
          <Box>
            <Text fontSize="sm">{t("external.onlyActive")}</Text>
            <Text fontSize="xs" color="gray.500">
              {t("external.onlyActiveHelp")}
            </Text>
          </Box>
          <Switch colorScheme="primary" isChecked={value.only_active} onChange={(e) => set({ only_active: e.target.checked })} />
        </HStack>
        <Box>
          <Text fontSize="sm" mb={1}>
            {t("external.groups")}
          </Text>
          <GroupPicker all={groups} value={value.groups} onChange={(g) => set({ groups: g })} />
          <Text fontSize="xs" color="gray.500" mt={1}>
            {t("external.groupsHelp")}
          </Text>
        </Box>
      </SimpleGrid>
    </VStack>
  );
};

export const ExternalConfigsPage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const { data: saved, refetch } = useQuery<ExternalSettings>({
    queryKey: "external-configs",
    queryFn: () => fetch("/external-configs"),
  });
  const { data: groupNames } = useQuery<string[]>({
    queryKey: "host-group-names",
    queryFn: () => fetch("/groups").then((d: any) => d.groups.map((g: any) => g.name)),
  });
  const groups = groupNames || [];

  const [draft, setDraft] = useState<ExternalSettings | null>(null);
  useEffect(() => {
    if (saved) setDraft(saved);
  }, [saved]);
  const [adding, setAdding] = useState<ExternalConfig>(empty());
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewUser, setPreviewUser] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState("");

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);

  // live preview of the final order, from the unsaved draft
  useEffect(() => {
    if (!draft) return;
    const h = setTimeout(() => {
      const q = previewUser.trim() ? `?username=${encodeURIComponent(previewUser.trim())}` : "";
      fetch(`/external-configs/preview${q}`, { method: "POST", body: draft })
        .then((p: Preview) => {
          setPreview(p);
          setPreviewError("");
        })
        .catch((e: any) => setPreviewError(e?.data?.detail || t("external.previewError")));
    }, 400);
    return () => clearTimeout(h);
  }, [draft, previewUser]);

  if (!draft) return null;

  const update = (patch: Partial<ExternalSettings>) => setDraft({ ...draft, ...patch });
  const setConfig = (id: string, c: ExternalConfig) =>
    update({ configs: draft.configs.map((x) => (x.id === id ? c : x)) });
  const move = (i: number, dir: -1 | 1) => {
    const list = [...draft.configs];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    update({ configs: list });
  };
  const add = () => {
    update({ configs: [...draft.configs, adding] });
    setAdding(empty());
  };
  const save = () => {
    setSaving(true);
    fetch("/external-configs", { method: "PUT", body: draft })
      .then(() => {
        toast({ status: "success", title: t("external.saved"), duration: 1500 });
        refetch();
      })
      .catch((e: any) =>
        toast({ status: "error", title: t("external.saveError"), description: e?.data?.detail, duration: 4000 })
      )
      .finally(() => setSaving(false));
  };

  return (
    <VStack align="stretch" spacing={4}>
      {/* sticky save bar while there are unsaved changes */}
      {dirty && (
        <HStack
          position="sticky"
          top={2}
          zIndex={5}
          p={2}
          pl={4}
          borderRadius="12px"
          bg="primary.500"
          color="white"
          justifyContent="space-between"
          boxShadow="lg"
        >
          <Text fontSize="sm" fontWeight="medium">
            {t("external.unsaved")}
          </Text>
          <HStack>
            <Button size="sm" variant="ghost" color="white" _hover={{ bg: "whiteAlpha.200" }} onClick={() => setDraft(saved!)}>
              {t("external.discard")}
            </Button>
            <Button size="sm" bg="white" color="primary.600" _hover={{ bg: "whiteAlpha.900" }} isLoading={saving} onClick={save}>
              {t("external.save")}
            </Button>
          </HStack>
        </HStack>
      )}

      <Panel title={t("external.sorting")} help={t("external.sortingHelp")}>
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
          <FormControl>
            <FormLabel>{t("external.generatedSort")}</FormLabel>
            <Select size="sm" value={draft.generated_sort} onChange={(e) => update({ generated_sort: e.target.value })}>
              <option value="default">{t("external.sort.default")}</option>
              <option value="remark">{t("external.sort.remark")}</option>
              <option value="remark_desc">{t("external.sort.remark_desc")}</option>
              <option value="protocol">{t("external.sort.protocol")}</option>
              <option value="reverse">{t("external.sort.reverse")}</option>
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel>{t("external.externalSort")}</FormLabel>
            <Select size="sm" value={draft.external_sort} onChange={(e) => update({ external_sort: e.target.value })}>
              <option value="manual">{t("external.sort.manual")}</option>
              <option value="name">{t("external.sort.name")}</option>
              <option value="name_desc">{t("external.sort.name_desc")}</option>
            </Select>
          </FormControl>
        </SimpleGrid>
      </Panel>

      <Panel title={t("external.add")} help={t("external.help")}>
        <ConfigForm value={adding} groups={groups} onChange={setAdding} />
        <HStack justifyContent="flex-end" mt={3}>
          <Button
            size="sm"
            colorScheme="primary"
            leftIcon={<PlusIcon {...icon} />}
            isDisabled={linkCount(adding.links) === 0}
            onClick={add}
          >
            {t("external.addButton")}
          </Button>
        </HStack>
      </Panel>

      <SimpleGrid columns={{ base: 1, xl: 2 }} spacing={4} alignItems="start">
        <Panel title={t("external.list")} help={draft.external_sort === "manual" ? t("external.listHelp") : t("external.listSortedHelp")}>
          <VStack align="stretch" spacing={2}>
            {draft.configs.length === 0 && (
              <Text fontSize="sm" color="gray.500">
                {t("external.empty")}
              </Text>
            )}
            {draft.configs.map((c, i) => (
              <Box
                key={c.id}
                p={3}
                borderWidth="1px"
                borderColor="light-border"
                borderRadius="10px"
                bg="var(--app-surface-2)"
                _dark={{ borderColor: "gray.600", bg: "gray.750" }}
                opacity={c.enabled ? 1 : 0.6}
              >
                {editing === c.id ? (
                  <>
                    <ConfigForm value={c} groups={groups} onChange={(v) => setConfig(c.id, v)} />
                    <HStack justifyContent="flex-end" mt={2}>
                      <Button size="sm" onClick={() => setEditing(null)}>
                        {t("external.done")}
                      </Button>
                    </HStack>
                  </>
                ) : (
                  <HStack spacing={2} alignItems="center">
                    <VStack spacing={0}>
                      <IconButton size="xs" variant="ghost" aria-label="up" icon={<ArrowUpIcon {...icon} />} isDisabled={i === 0} onClick={() => move(i, -1)} />
                      <IconButton size="xs" variant="ghost" aria-label="down" icon={<ArrowDownIcon {...icon} />} isDisabled={i === draft.configs.length - 1} onClick={() => move(i, 1)} />
                    </VStack>
                    <Box flex={1} minW={0}>
                      <Text fontWeight="medium" fontSize="sm" isTruncated>
                        {c.name || t("external.unnamed")}
                      </Text>
                      <HStack spacing={1.5} mt={1} flexWrap="wrap">
                        <Badge colorScheme={c.position === "top" ? "purple" : "primary"}>
                          {c.position === "top" ? t("external.top") : t("external.bottom")}
                        </Badge>
                        <Badge variant="outline">{t("external.linkCount", { count: linkCount(c.links) })}</Badge>
                        {c.only_active && <Badge variant="subtle">{t("external.activeOnlyBadge")}</Badge>}
                        {c.groups.map((g) => (
                          <Badge key={g} variant="outline" colorScheme="orange">
                            {g}
                          </Badge>
                        ))}
                      </HStack>
                    </Box>
                    <Tooltip label={c.enabled ? t("external.enabled") : t("external.disabled")}>
                      <Box>
                        <Switch size="sm" colorScheme="primary" isChecked={c.enabled} onChange={(e) => setConfig(c.id, { ...c, enabled: e.target.checked })} />
                      </Box>
                    </Tooltip>
                    <IconButton size="sm" variant="ghost" aria-label="edit" icon={<PencilIcon {...icon} />} onClick={() => setEditing(c.id)} />
                    <IconButton
                      size="sm"
                      variant="ghost"
                      colorScheme="red"
                      aria-label="delete"
                      icon={<TrashIcon {...icon} />}
                      onClick={() => update({ configs: draft.configs.filter((x) => x.id !== c.id) })}
                    />
                  </HStack>
                )}
              </Box>
            ))}
          </VStack>
        </Panel>

        <Panel title={t("external.preview")} help={t("external.previewHelp")}>
          <Input
            size="sm"
            mb={3}
            placeholder={t("external.previewUser")}
            value={previewUser}
            onChange={(e) => setPreviewUser(e.target.value)}
          />
          {previewError && (
            <Text fontSize="xs" color="red.400" mb={2}>
              {previewError}
            </Text>
          )}
          {preview && (
            <VStack align="stretch" spacing={1}>
              <Text fontSize="xs" color="gray.500" mb={1}>
                {t("external.previewFor", { username: preview.username })}
              </Text>
              {preview.items.map((it, i) => (
                <HStack key={i} spacing={2} fontSize="sm">
                  <Text color="gray.500" w="22px" textAlign="right" flexShrink={0}>
                    {i + 1}.
                  </Text>
                  <Badge colorScheme={it.source === "external" ? "orange" : "primary"} flexShrink={0}>
                    {it.source === "external" ? t("external.ext") : t("external.own")}
                  </Badge>
                  <Text isTruncated title={it.link}>
                    {it.remark}
                  </Text>
                </HStack>
              ))}
              {preview.items.length === 0 && (
                <Text fontSize="xs" color="gray.500">
                  {t("external.previewEmpty")}
                </Text>
              )}
            </VStack>
          )}
          <Text fontSize="xs" color="gray.500" mt={3}>
            {t("external.formatsNote")}
          </Text>
        </Panel>
      </SimpleGrid>
    </VStack>
  );
};
