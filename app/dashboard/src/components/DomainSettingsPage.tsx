// Domain settings: the address, path and last part of every subscription link
// (app/subscription/domain.py). Old links keep working after a change.
import {
  Box,
  Button,
  Code,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftAddon,
  Text,
  Tooltip,
  useClipboard,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { CheckIcon, ClipboardIcon, GlobeAltIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { FC, ReactNode, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "react-query";
import { fetch } from "service/http";

type Settings = { url_prefix: string; path: string; suffix: string };
type State = { settings: Settings; env_url_prefix: string; env_path: string; example: string };

const card = {
  borderRadius: "20px",
  bg: "var(--app-surface)",
  boxShadow: "var(--alexen-shadow)",
  borderWidth: "1px",
  borderColor: "blackAlpha.50",
  _dark: { bg: "gray.750", borderColor: "var(--alexen-line)" },
} as const;

const Field: FC<{ label: string; help?: ReactNode; children: ReactNode }> = ({ label, help, children }) => (
  <FormControl>
    <FormLabel fontSize="sm" mb={1}>
      {label}
    </FormLabel>
    {children}
    {help && (
      <Text fontSize="xs" color="gray.500" mt={1.5}>
        {help}
      </Text>
    )}
  </FormControl>
);

export const DomainSettingsPage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [state, setState] = useState<State | null>(null);
  const [form, setForm] = useState<Settings>({ url_prefix: "", path: "", suffix: "" });
  const [example, setExample] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const { onCopy, hasCopied, setValue } = useClipboard("");
  const timer = useRef<number>();

  useEffect(() => {
    fetch("/sub-domain").then((d: State) => {
      setState(d);
      setForm(d.settings);
      setExample(d.example);
    });
  }, []);
  // the link a user would get, as you type
  useEffect(() => {
    if (!state) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      fetch("/sub-domain/example", { method: "POST", body: form })
        .then((d: State) => {
          setExample(d.example);
          setError("");
        })
        .catch((e: any) => setError(detail(e)));
    }, 300);
  }, [form]);
  useEffect(() => setValue(example), [example]);

  const detail = (e: any) => {
    const d = e?.response?._data?.detail;
    if (Array.isArray(d)) return d.map((x: any) => String(x.msg || "").replace(/^Value error, /, "")).join(" · ");
    if (d && typeof d === "object") return Object.values(d).map((x: any) => String(x).replace(/^Value error, /, "")).join(" · ");
    return typeof d === "string" ? d : e?.message || "Error";
  };
  const set = (p: Partial<Settings>) => setForm((f) => ({ ...f, ...p }));
  const dirty = state && JSON.stringify(form) !== JSON.stringify(state.settings);
  const save = () => {
    setSaving(true);
    fetch("/sub-domain", { method: "PUT", body: form })
      .then((d: State) => {
        setState(d);
        setForm(d.settings);
        // user lists hold the old links
        qc.invalidateQueries();
        toast({ title: t("domain.saved"), status: "success", position: "top", duration: 2500 });
      })
      .catch((e) => toast({ title: detail(e), status: "error", position: "top", duration: 4000 }))
      .finally(() => setSaving(false));
  };

  if (!state) return null;
  const suffixPresets: [string, string][] = [
    ["", t("domain.suffixNone")],
    ["{username}", "{username}"],
  ];

  return (
    <VStack align="stretch" spacing={5} maxW="900px">
      <Box {...card} p={{ base: 4, md: 6 }}>
        <HStack spacing={3} mb={1}>
          <Icon as={GlobeAltIcon} boxSize="20px" color="primary.500" />
          <Text fontWeight="semibold">{t("domain.linkTitle")}</Text>
        </HStack>
        <Text fontSize="sm" color="gray.500" mb={5}>
          {t("domain.help")}
        </Text>

        <VStack align="stretch" spacing={5}>
          <Field
            label={t("domain.address")}
            help={
              <>
                {t("domain.addressHelp")} {t("domain.envNow")}: <Code fontSize="xs">{state.env_url_prefix || "—"}</Code>
              </>
            }
          >
            <Input
              fontFamily="mono"
              placeholder={state.env_url_prefix || "https://sub.example.com"}
              value={form.url_prefix}
              onChange={(e) => set({ url_prefix: e.target.value.trim() })}
            />
          </Field>

          <Field label={t("domain.path")} help={t("domain.pathHelp", { path: state.env_path })}>
            <InputGroup maxW="320px">
              <InputLeftAddon fontFamily="mono">/</InputLeftAddon>
              <Input
                fontFamily="mono"
                placeholder={state.env_path}
                value={form.path}
                onChange={(e) => set({ path: e.target.value.trim() })}
              />
            </InputGroup>
          </Field>

          <Field label={t("domain.suffix")} help={t("domain.suffixHelp")}>
            <HStack spacing={2} mb={2} flexWrap="wrap" rowGap={2}>
              {suffixPresets.map(([v, label]) => (
                <Button
                  key={v || "none"}
                  size="xs"
                  borderRadius="full"
                  colorScheme="primary"
                  variant={form.suffix === v ? "solid" : "outline"}
                  onClick={() => set({ suffix: v })}
                  fontFamily={v ? "mono" : undefined}
                >
                  {label}
                </Button>
              ))}
            </HStack>
            <Input
              fontFamily="mono"
              maxW="420px"
              placeholder={t("domain.suffixPlaceholder")}
              value={form.suffix}
              onChange={(e) => set({ suffix: e.target.value })}
            />
          </Field>

          <Box borderRadius="14px" p={4} bg="blackAlpha.50" _dark={{ bg: "whiteAlpha.50" }}>
            <Text fontSize="xs" color="gray.500" mb={1.5}>
              {t("domain.example")}
            </Text>
            <HStack spacing={2} align="center">
              <Text fontFamily="mono" fontSize="sm" flex="1" wordBreak="break-all" color={error ? "red.400" : undefined}>
                {error || example}
              </Text>
              {!error && (
                <Tooltip label={hasCopied ? t("domain.copied") : t("domain.copy")} hasArrow>
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="copy"
                    icon={hasCopied ? <CheckIcon width={16} /> : <ClipboardIcon width={16} />}
                    onClick={onCopy}
                  />
                </Tooltip>
              )}
            </HStack>
          </Box>

          <HStack justify="flex-end">
            {dirty && (
              <Text fontSize="xs" color="orange.400">
                {t("autoChange.unsaved")}
              </Text>
            )}
            <Button colorScheme="primary" isLoading={saving} isDisabled={!dirty || !!error} onClick={save}>
              {t("domain.save")}
            </Button>
          </HStack>
        </VStack>
      </Box>

      <HStack {...card} p={{ base: 4, md: 5 }} spacing={3} align="flex-start">
        <Icon as={InformationCircleIcon} boxSize="20px" color="primary.500" flexShrink={0} mt={0.5} />
        <VStack align="stretch" spacing={2} fontSize="sm">
          <Text fontWeight="semibold">{t("domain.dnsTitle")}</Text>
          <Text color="gray.500">{t("domain.dns1")}</Text>
          <Text color="gray.500">{t("domain.dns2")}</Text>
          <Text color="gray.500">{t("domain.dns3")}</Text>
        </VStack>
      </HStack>
    </VStack>
  );
};
