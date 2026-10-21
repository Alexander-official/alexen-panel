// Manage external panels (3x-ui / s-ui): add a connection, test it, and view its inbounds.
// Importing those inbounds into users' subs and showing their live traffic comes next.
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Heading,
  IconButton,
  Input,
  Select,
  Spinner,
  Switch,
  Text,
  Textarea,
  VStack,
  useToast,
} from "@chakra-ui/react";
import {
  ArrowPathIcon,
  PencilSquareIcon,
  PlusIcon,
  ServerStackIcon,
  TrashIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";

type Scope = { admins: string[]; groups: string[] };
type Panel = {
  id: number;
  name: string;
  kind: "3xui" | "sui";
  address: string;
  panel_path: string;
  scope: Scope;
  enabled: boolean;
  username: string;
  has_password: boolean;
  has_token: boolean;
  last_error: string | null;
  last_sync: string | null;
};
type Form = {
  id?: number;
  name: string;
  kind: "3xui" | "sui";
  address: string;
  panel_path: string;
  username: string;
  password: string;
  token: string;
  admins: string[];
  enabled: boolean;
};

const emptyForm: Form = {
  name: "",
  kind: "3xui",
  address: "",
  panel_path: "/",
  username: "",
  password: "",
  token: "",
  admins: [],
  enabled: true,
};

export const ExternalPanelsPage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [inbounds, setInbounds] = useState<{ panel: Panel; items: any[] } | null>(null);
  const [busy, setBusy] = useState<number | "form" | null>(null);

  const { data: panels = [], isLoading } = useQuery<Panel[]>("external-panels", () => fetch("/external-panels"));
  const { data: admins = [] } = useQuery<any[]>("admins-for-ext", () => fetch("/admins"));
  const resellers = admins.filter((a) => !a.is_sudo).map((a) => a.username);

  const ok = (title: string): void => {
    toast({ status: "success", title, position: "top", duration: 3000 });
  };
  const err = (e: any): void => {
    toast({ status: "error", title: e?.response?._data?.detail || e?.message || t("errors.generic"), position: "top", duration: 6000 });
  };

  const save = useMutation(
    (f: Form) => {
      const body: any = {
        name: f.name.trim(),
        kind: f.kind,
        address: f.address.trim(),
        panel_path: f.panel_path.trim() || "/",
        username: f.username,
        token: f.token || null,
        scope: { admins: f.admins, groups: [] },
        enabled: f.enabled,
      };
      if (f.password) body.password = f.password;
      return f.id
        ? fetch(`/external-panels/${f.id}`, { method: "PUT", body })
        : fetch("/external-panels", { method: "POST", body: { ...body, password: f.password } });
    },
    {
      onSuccess: () => {
        ok(t("extPanel.saved"));
        setForm(null);
        qc.invalidateQueries("external-panels");
      },
      onError: err,
    }
  );

  const test = (p: Panel) => {
    setBusy(p.id);
    fetch(`/external-panels/${p.id}/test`, { method: "POST" })
      .then((r: any) => ok(t("extPanel.testOk", { count: r.inbounds })))
      .catch(err)
      .finally(() => {
        setBusy(null);
        qc.invalidateQueries("external-panels");
      });
  };

  const showInbounds = (p: Panel) => {
    setBusy(p.id);
    fetch(`/external-panels/${p.id}/inbounds`)
      .then((r: any) => setInbounds({ panel: p, items: r.inbounds || [] }))
      .catch(err)
      .finally(() => setBusy(null));
  };

  const remove = (p: Panel) => {
    if (!window.confirm(t("extPanel.confirmDelete", { name: p.name }))) return;
    fetch(`/external-panels/${p.id}`, { method: "DELETE" })
      .then(() => {
        ok(t("extPanel.deleted"));
        qc.invalidateQueries("external-panels");
      })
      .catch(err);
  };

  const startEdit = (p: Panel) =>
    setForm({
      id: p.id,
      name: p.name,
      kind: p.kind,
      address: p.address,
      panel_path: p.panel_path,
      username: p.username,
      password: "",
      token: "",
      admins: p.scope?.admins || [],
      enabled: p.enabled,
    });

  const canSave = form && form.name.trim() && form.address.trim();

  return (
    <VStack align="stretch" spacing={4} maxW="900px">
      <Flex align="center" gap={3} wrap="wrap">
        <Box>
          <Heading size="md">{t("extPanel.title")}</Heading>
          <Text fontSize="sm" color="gray.500">
            {t("extPanel.help")}
          </Text>
        </Box>
        <Button
          ml="auto"
          size="sm"
          colorScheme="primary"
          leftIcon={<PlusIcon width={16} />}
          onClick={() => setForm({ ...emptyForm })}
        >
          {t("extPanel.add")}
        </Button>
      </Flex>

      {form && (
        <Box className="alexen-page" borderWidth="1px" borderRadius="16px" p={5}>
          <Heading size="sm" mb={4}>
            {form.id ? t("extPanel.editTitle") : t("extPanel.add")}
          </Heading>
          <VStack align="stretch" spacing={3}>
            <HStack spacing={3} align="flex-start" flexWrap="wrap">
              <FormControl flex="1" minW="200px">
                <FormLabel fontSize="sm">{t("extPanel.name")}</FormLabel>
                <Input size="sm" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </FormControl>
              <FormControl w="140px">
                <FormLabel fontSize="sm">{t("extPanel.kind")}</FormLabel>
                <Select
                  size="sm"
                  value={form.kind}
                  onChange={(e) => {
                    const kind = e.target.value as "3xui" | "sui";
                    setForm({ ...form, kind, panel_path: kind === "sui" ? "/app/" : "/" });
                  }}
                >
                  <option value="3xui">3x-ui</option>
                  <option value="sui">s-ui</option>
                </Select>
              </FormControl>
            </HStack>
            <HStack spacing={3} align="flex-start" flexWrap="wrap">
              <FormControl flex="1" minW="240px">
                <FormLabel fontSize="sm">{t("extPanel.address")}</FormLabel>
                <Input size="sm" placeholder="http://1.2.3.4:2053" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              </FormControl>
              <FormControl w="140px">
                <FormLabel fontSize="sm">{t("extPanel.path")}</FormLabel>
                <Input size="sm" value={form.panel_path} onChange={(e) => setForm({ ...form, panel_path: e.target.value })} />
              </FormControl>
            </HStack>
            <HStack spacing={3} align="flex-start" flexWrap="wrap">
              <FormControl flex="1" minW="180px">
                <FormLabel fontSize="sm">{t("extPanel.username")}</FormLabel>
                <Input size="sm" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
              </FormControl>
              <FormControl flex="1" minW="180px">
                <FormLabel fontSize="sm">{t("extPanel.password")}</FormLabel>
                <Input
                  size="sm"
                  type="password"
                  placeholder={form.id ? t("extPanel.passwordKeep") : ""}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
              </FormControl>
            </HStack>
            <FormControl>
              <FormLabel fontSize="sm">{t("extPanel.token")}</FormLabel>
              <Input size="sm" placeholder={t("extPanel.tokenHelp")} value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">{t("extPanel.scope")}</FormLabel>
              <Text fontSize="xs" color="gray.500" mb={2}>
                {t("extPanel.scopeHelp")}
              </Text>
              <Box maxH="140px" overflowY="auto" borderWidth="1px" borderRadius="10px" p={2}>
                {resellers.length === 0 ? (
                  <Text fontSize="xs" color="gray.500">
                    {t("extPanel.noResellers")}
                  </Text>
                ) : (
                  <VStack align="stretch" spacing={1}>
                    {resellers.map((u) => (
                      <Checkbox
                        key={u}
                        size="sm"
                        isChecked={form.admins.includes(u)}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            admins: e.target.checked ? [...form.admins, u] : form.admins.filter((x) => x !== u),
                          })
                        }
                      >
                        {u}
                      </Checkbox>
                    ))}
                  </VStack>
                )}
              </Box>
            </FormControl>
            <HStack>
              <Switch isChecked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              <Text fontSize="sm">{t("extPanel.enabled")}</Text>
            </HStack>
            <HStack justify="flex-end" pt={1}>
              <Button size="sm" variant="ghost" onClick={() => setForm(null)}>
                {t("extPanel.cancel")}
              </Button>
              <Button size="sm" colorScheme="primary" isDisabled={!canSave} isLoading={save.isLoading} onClick={() => save.mutate(form)}>
                {t("extPanel.save")}
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}

      {isLoading ? (
        <HStack justify="center" py={8}>
          <Spinner color="primary.500" />
        </HStack>
      ) : panels.length === 0 && !form ? (
        <Box className="alexen-page" borderWidth="1px" borderRadius="16px" p={8} textAlign="center" color="gray.500">
          <ServerStackIcon width={32} style={{ margin: "0 auto 10px" }} />
          <Text fontSize="sm">{t("extPanel.empty")}</Text>
        </Box>
      ) : (
        <VStack align="stretch" spacing={2}>
          {panels.map((p) => (
            <Box key={p.id} className="alexen-page" borderWidth="1px" borderRadius="14px" p={4}>
              <Flex align="center" gap={3} wrap="wrap">
                <Badge colorScheme={p.kind === "3xui" ? "purple" : "teal"}>{p.kind === "3xui" ? "3x-ui" : "s-ui"}</Badge>
                <Box minW={0}>
                  <HStack spacing={2}>
                    <Text fontWeight="semibold" fontSize="sm">
                      {p.name}
                    </Text>
                    {!p.enabled && (
                      <Badge colorScheme="gray" variant="subtle">
                        {t("extPanel.disabled")}
                      </Badge>
                    )}
                  </HStack>
                  <Text fontSize="xs" color="gray.500" isTruncated maxW="360px">
                    {p.address}
                    {p.panel_path !== "/" ? p.panel_path : ""} · {p.scope?.admins?.length ? p.scope.admins.join(", ") : t("extPanel.allAdmins")}
                  </Text>
                  {p.last_error && (
                    <Text fontSize="xs" color="red.400" isTruncated maxW="360px">
                      {p.last_error}
                    </Text>
                  )}
                </Box>
                <HStack ml="auto" spacing={1}>
                  <Button size="xs" variant="outline" leftIcon={<ArrowPathIcon width={14} />} isLoading={busy === p.id} onClick={() => test(p)}>
                    {t("extPanel.test")}
                  </Button>
                  <Button size="xs" variant="outline" leftIcon={<QueueListIcon width={14} />} onClick={() => showInbounds(p)}>
                    {t("extPanel.inbounds")}
                  </Button>
                  <IconButton aria-label="edit" size="xs" variant="ghost" icon={<PencilSquareIcon width={16} />} onClick={() => startEdit(p)} />
                  <IconButton aria-label="delete" size="xs" variant="ghost" colorScheme="red" icon={<TrashIcon width={16} />} onClick={() => remove(p)} />
                </HStack>
              </Flex>
            </Box>
          ))}
        </VStack>
      )}

      {inbounds && (
        <Box className="alexen-page" borderWidth="1px" borderRadius="16px" p={5}>
          <HStack mb={3}>
            <Heading size="sm">
              {inbounds.panel.name} — {t("extPanel.inboundsCount", { count: inbounds.items.length })}
            </Heading>
            <Button size="xs" variant="ghost" ml="auto" onClick={() => setInbounds(null)}>
              {t("close")}
            </Button>
          </HStack>
          {inbounds.items.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              {t("extPanel.noInbounds")}
            </Text>
          ) : (
            <VStack align="stretch" spacing={1}>
              {inbounds.items.map((ib, i) => {
                const name = ib.remark || ib.tag || ib.listen || `#${ib.id ?? i}`;
                const proto = ib.protocol || ib.type || "";
                const port = ib.port || ib.listen_port || "";
                return (
                  <HStack key={i} fontSize="sm" borderWidth="1px" borderRadius="8px" px={3} py={2}>
                    <Text fontWeight="medium" isTruncated>
                      {name}
                    </Text>
                    {proto && <Badge>{proto}</Badge>}
                    {port && <Text color="gray.500" ml="auto" fontFamily="mono">:{port}</Text>}
                  </HStack>
                );
              })}
            </VStack>
          )}
          <Divider my={3} />
          <Text fontSize="xs" color="gray.500">
            {t("extPanel.importSoon")}
          </Text>
        </Box>
      )}
    </VStack>
  );
};

export default ExternalPanelsPage;
