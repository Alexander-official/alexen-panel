// "Web page" tab of the subscription settings: everything about the page users
// see when they open their sub link in a browser (app/subscription/webpage.py):
// branding, look, which blocks in which order, every text per language, the
// apps per platform, custom CSS, and a live preview of unsaved changes.
import {
  Box,
  Button,
  Collapse,
  FormControl,
  FormLabel,
  HStack,
  Icon,
  IconButton,
  Input,
  InputGroup,
  InputLeftElement,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Select,
  SimpleGrid,
  Switch,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Textarea,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowDownIcon,
  ArrowPathIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  StarIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { FC, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetch } from "service/http";

export type WebApp = {
  id: string;
  name: string;
  featured: boolean;
  deeplink: string;
  crypt: boolean;
  install: { label: string; url: string }[];
  note: Record<string, string>;
};
export type Catalog = Record<string, WebApp[]>;
type Section = { id: string; enabled: boolean };
export type WebPageSettings = {
  enabled: boolean;
  title: string;
  logo_url: string;
  support_url: string;
  accent: string;
  theme: "auto" | "dark" | "light";
  style: "soft" | "glass" | "clay";
  default_lang: string;
  languages: string[];
  happ_crypt: boolean;
  show_links: boolean;
  show_qr: boolean;
  sections: Section[];
  intro: Record<string, string>;
  footer: Record<string, string>;
  texts: Record<string, Record<string, string>>;
  custom_css: string;
  apps: Catalog | null;
  link_domain: string;
  show_devices: boolean;
  lock_on_device_limit: boolean;
};
export type WebPageDefaults = {
  apps: Catalog;
  texts: Record<string, Record<string, string>>;
  sections: string[];
  platforms: string[];
};

export const emptyDefaults: WebPageDefaults = { apps: {}, texts: {}, sections: [], platforms: [] };
export const emptyWebPage: WebPageSettings = {
  enabled: true,
  title: "",
  logo_url: "",
  support_url: "",
  accent: "#5b7cfa",
  theme: "auto",
  style: "soft",
  default_lang: "auto",
  languages: ["en", "tr", "ru", "fa", "zh"],
  happ_crypt: true,
  show_links: true,
  show_qr: true,
  sections: ["announce", "intro", "user", "devices", "install", "vpn", "link", "configs"].map((id) => ({ id, enabled: true })),
  intro: {},
  footer: {},
  texts: {},
  custom_css: "",
  apps: null,
  link_domain: "",
  show_devices: true,
  lock_on_device_limit: true,
};

const LANGS: [string, string][] = [
  ["en", "English"],
  ["tr", "Türkçe"],
  ["ru", "Русский"],
  ["fa", "فارسی"],
  ["zh", "中文"],
];
const PLATFORM_NAMES: Record<string, string> = {
  ios: "iOS",
  android: "Android",
  windows: "Windows",
  macos: "macOS",
  linux: "Linux",
  androidTV: "Android TV",
  appleTV: "Apple TV",
};
// soft, easy on the eyes, all readable with white text
const ACCENTS = ["#5b7cfa", "#7c6cf2", "#a26cf0", "#e46f9f", "#ef7a6b", "#e9a23b", "#3fb68b", "#2fb3c6", "#64748b"];

const soft = { borderRadius: "14px", bg: "blackAlpha.50", _dark: { bg: "whiteAlpha.50" } } as const;

const Toggle: FC<{ label: string; help?: string; on: boolean; onChange: (v: boolean) => void }> = ({ label, help, on, onChange }) => (
  <HStack {...soft} p={3} spacing={3} align="flex-start">
    <Switch size="sm" mt={0.5} colorScheme="primary" isChecked={on} onChange={(e) => onChange(e.target.checked)} />
    <Box>
      <Text fontSize="sm">{label}</Text>
      {help && (
        <Text fontSize="xs" color="gray.500">
          {help}
        </Text>
      )}
    </Box>
  </HStack>
);

const Field: FC<{ label: string; help?: string; children: ReactNode }> = ({ label, help, children }) => (
  <FormControl>
    <FormLabel fontSize="sm" mb={1}>
      {label}
    </FormLabel>
    {children}
    {help && (
      <Text fontSize="xs" color="gray.500" mt={1}>
        {help}
      </Text>
    )}
  </FormControl>
);

const LangSelect: FC<{ value: string; onChange: (v: string) => void; any?: boolean; langs?: string[] }> = ({
  value,
  onChange,
  any,
  langs,
}) => {
  const { t } = useTranslation();
  return (
    <Select size="sm" w="auto" borderRadius="10px" value={value} onChange={(e) => onChange(e.target.value)}>
      {any && <option value="">{t("webpage.anyLang")}</option>}
      {LANGS.filter(([k]) => !langs || langs.includes(k)).map(([k, n]) => (
        <option key={k} value={k}>
          {n}
        </option>
      ))}
    </Select>
  );
};

/** text per language: { "": all languages, "tr": ... } */
const PerLang: FC<{ value: Record<string, string>; onChange: (v: Record<string, string>) => void; rows?: number; placeholder?: string }> = ({
  value,
  onChange,
  rows = 3,
  placeholder,
}) => {
  const [lang, setLang] = useState("");
  const filled = Object.keys(value).filter((k) => value[k]);
  return (
    <Box>
      <HStack mb={2} spacing={2} flexWrap="wrap">
        <LangSelect value={lang} onChange={setLang} any />
        {filled.length > 0 && (
          <Text fontSize="xs" color="gray.500">
            {filled.map((k) => (k === "" ? "*" : k)).join(" · ")}
          </Text>
        )}
      </HStack>
      <Textarea
        size="sm"
        rows={rows}
        borderRadius="12px"
        placeholder={placeholder}
        value={value[lang] || ""}
        onChange={(e) => onChange({ ...value, [lang]: e.target.value })}
      />
    </Box>
  );
};

const Mini: FC<{ kind: "soft" | "glass" | "clay"; on: boolean; label: string; onClick: () => void }> = ({ kind, on, label, onClick }) => {
  const look = {
    soft: { bg: "white", boxShadow: "0 4px 14px rgba(16,24,40,.08)", border: "1px solid rgba(15,23,42,.06)" },
    glass: {
      bg: "rgba(255,255,255,.45)",
      boxShadow: "0 8px 24px rgba(31,38,135,.15), inset 0 1px 0 rgba(255,255,255,.8)",
      border: "1px solid rgba(255,255,255,.6)",
      backdropFilter: "blur(8px)",
    },
    clay: { bg: "#eef1f6", boxShadow: "6px 6px 14px rgba(15,23,42,.12), -6px -6px 14px #fff, inset 2px 2px 3px #fff" },
  }[kind];
  return (
    <Box
      as="button"
      type="button"
      onClick={onClick}
      borderRadius="16px"
      p={3}
      textAlign="left"
      borderWidth="2px"
      borderColor={on ? "primary.400" : "transparent"}
      bg={kind === "glass" ? "linear-gradient(135deg,#c7d2fe,#fbcfe8,#a5f3fc)" : "#eef1f6"}
      transition="border-color .15s"
    >
      <Box h="54px" borderRadius={kind === "clay" ? "18px" : "12px"} {...look} p={2}>
        <Box h="8px" w="60%" borderRadius="full" bg="rgba(15,23,42,.18)" mb={2} />
        <Box h="8px" w="40%" borderRadius="full" bg="var(--chakra-colors-primary-400)" />
      </Box>
      <Text fontSize="sm" fontWeight="medium" mt={2} color="gray.700">
        {label}
      </Text>
    </Box>
  );
};

/** one app of a platform, editable */
const AppEditor: FC<{
  app: WebApp;
  presets: string[];
  crypt: boolean;
  first: boolean;
  last: boolean;
  onChange: (a: WebApp) => void;
  onMove: (d: number) => void;
  onDelete: () => void;
}> = ({ app, presets, crypt, first, last, onChange, onMove, onDelete }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const set = (p: Partial<WebApp>) => onChange({ ...app, ...p });
  return (
    <Box {...soft}>
      <HStack px={3} py={2} spacing={2}>
        <Tooltip label={t("webpage.featured")} hasArrow>
          <IconButton
            size="xs"
            variant="ghost"
            borderRadius="full"
            aria-label="featured"
            color={app.featured ? "orange.400" : "gray.400"}
            icon={app.featured ? <StarSolid width={16} /> : <StarIcon width={16} />}
            onClick={() => set({ featured: !app.featured })}
          />
        </Tooltip>
        <Box flex="1" minW={0} cursor="pointer" onClick={() => setOpen((o) => !o)}>
          <Text fontSize="sm" fontWeight="medium">
            {app.name || "—"}
          </Text>
          <Text fontSize="xs" color="gray.500" fontFamily="mono" isTruncated>
            {app.crypt && crypt ? "happ://crypt5/…" : app.deeplink || t("webpage.copyOnly")}
          </Text>
        </Box>
        <IconButton size="xs" variant="ghost" aria-label="up" icon={<ArrowUpIcon width={14} />} isDisabled={first} onClick={() => onMove(-1)} />
        <IconButton size="xs" variant="ghost" aria-label="down" icon={<ArrowDownIcon width={14} />} isDisabled={last} onClick={() => onMove(1)} />
        <IconButton
          size="xs"
          variant="ghost"
          aria-label="edit"
          icon={<ChevronDownIcon width={16} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .2s" }} />}
          onClick={() => setOpen((o) => !o)}
        />
        <IconButton size="xs" variant="ghost" colorScheme="red" aria-label="hide" icon={<XMarkIcon width={16} />} onClick={onDelete} />
      </HStack>
      <Collapse in={open} animateOpacity unmountOnExit>
        <VStack align="stretch" spacing={3} px={3} pb={3}>
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            <Field label={t("webpage.appName")}>
              <Input size="sm" borderRadius="10px" value={app.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="ID">
              <Input size="sm" borderRadius="10px" fontFamily="mono" value={app.id} onChange={(e) => set({ id: e.target.value })} />
            </Field>
          </SimpleGrid>
          <Field label={t("webpage.deeplink")} help={t("webpage.deeplinkHelp")}>
            <HStack>
              <Input
                size="sm"
                borderRadius="10px"
                fontFamily="mono"
                placeholder={t("webpage.copyOnly")}
                value={app.deeplink}
                onChange={(e) => set({ deeplink: e.target.value })}
              />
              <Menu isLazy placement="bottom-end">
                <MenuButton as={Button} size="sm" variant="outline" rightIcon={<ChevronDownIcon width={14} />} flexShrink={0}>
                  {t("webpage.presets")}
                </MenuButton>
                <MenuList maxH="300px" overflowY="auto" fontSize="xs" fontFamily="mono">
                  {presets.map((p) => (
                    <MenuItem key={p} onClick={() => set({ deeplink: p })}>
                      {p}
                    </MenuItem>
                  ))}
                </MenuList>
              </Menu>
            </HStack>
          </Field>
          <HStack spacing={3}>
            <Switch size="sm" colorScheme="primary" isChecked={app.crypt} onChange={(e) => set({ crypt: e.target.checked })} />
            <Text fontSize="sm">{t("webpage.appCrypt")}</Text>
          </HStack>
          <Box>
            <Text fontSize="sm" mb={1}>
              {t("webpage.installButtons")}
            </Text>
            <VStack align="stretch" spacing={2}>
              {app.install.map((b, i) => (
                <HStack key={i}>
                  <Input
                    size="sm"
                    w="150px"
                    borderRadius="10px"
                    placeholder="App Store"
                    value={b.label}
                    onChange={(e) => set({ install: app.install.map((x, n) => (n === i ? { ...x, label: e.target.value } : x)) })}
                  />
                  <Input
                    size="sm"
                    borderRadius="10px"
                    fontFamily="mono"
                    placeholder="https://"
                    value={b.url}
                    onChange={(e) => set({ install: app.install.map((x, n) => (n === i ? { ...x, url: e.target.value } : x)) })}
                  />
                  <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="remove"
                    icon={<TrashIcon width={14} />}
                    onClick={() => set({ install: app.install.filter((_, n) => n !== i) })}
                  />
                </HStack>
              ))}
              <Button
                size="xs"
                variant="ghost"
                alignSelf="flex-start"
                leftIcon={<PlusIcon width={12} />}
                onClick={() => set({ install: [...app.install, { label: "", url: "" }] })}
              >
                {t("webpage.addButton")}
              </Button>
            </VStack>
          </Box>
          <Field label={t("webpage.note")} help={t("webpage.noteHelp")}>
            <PerLang value={app.note || {}} onChange={(note) => set({ note })} rows={2} />
          </Field>
        </VStack>
      </Collapse>
    </Box>
  );
};

const Preview: FC<{ value: WebPageSettings }> = ({ value }) => {
  const { t } = useTranslation();
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [width, setWidth] = useState<"phone" | "desktop">("phone");
  const [tick, setTick] = useState(0);
  const timer = useRef<number>();
  useEffect(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      fetch("/sub-webpage/preview", { method: "POST", body: { settings: value, username: username || null } })
        .then((h: any) => {
          setHtml(String(h));
          setError("");
        })
        .catch((e: any) => setError(e?.response?._data?.detail || e?.message || "Error"));
    }, 400);
    return () => window.clearTimeout(timer.current);
  }, [value, username, tick]);
  return (
    <VStack align="stretch" spacing={3}>
      <HStack spacing={2} flexWrap="wrap" rowGap={2}>
        <Input
          size="sm"
          w="220px"
          borderRadius="10px"
          placeholder={t("webpage.previewUser")}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <IconButton
          size="sm"
          aria-label="phone"
          variant={width === "phone" ? "solid" : "ghost"}
          icon={<DevicePhoneMobileIcon width={16} />}
          onClick={() => setWidth("phone")}
        />
        <IconButton
          size="sm"
          aria-label="desktop"
          variant={width === "desktop" ? "solid" : "ghost"}
          icon={<ComputerDesktopIcon width={16} />}
          onClick={() => setWidth("desktop")}
        />
        <IconButton size="sm" variant="ghost" aria-label="reload" icon={<ArrowPathIcon width={16} />} onClick={() => setTick((x) => x + 1)} />
        <Text fontSize="xs" color="gray.500">
          {t("webpage.previewHelp")}
        </Text>
      </HStack>
      {error ? (
        <Text fontSize="sm" color="red.400">
          {error}
        </Text>
      ) : (
        <Box
          alignSelf="center"
          w={width === "phone" ? "390px" : "100%"}
          maxW="100%"
          h="720px"
          borderRadius={width === "phone" ? "32px" : "16px"}
          overflow="hidden"
          borderWidth={width === "phone" ? "8px" : "1px"}
          borderColor="blackAlpha.200"
          _dark={{ borderColor: "whiteAlpha.200" }}
          boxShadow="var(--alexen-shadow)"
          bg="white"
        >
          <iframe title="preview" srcDoc={html} sandbox="allow-scripts" style={{ width: "100%", height: "100%", border: 0 }} />
        </Box>
      )}
    </VStack>
  );
};

export const SubWebPagePanel: FC<{
  value: WebPageSettings;
  defaults: WebPageDefaults;
  onChange: (v: WebPageSettings) => void;
}> = ({ value, defaults, onChange }) => {
  const { t } = useTranslation();
  const set = (p: Partial<WebPageSettings>) => onChange({ ...value, ...p });
  const platforms = defaults.platforms.length ? defaults.platforms : Object.keys(PLATFORM_NAMES);

  // ---- apps ----
  const [plat, setPlat] = useState(0);
  const catalog: Catalog = value.apps ?? defaults.apps;
  const key = platforms[plat] || "ios";
  const list = catalog[key] || [];
  const setList = (next: WebApp[]) => set({ apps: { ...catalog, [key]: next } });
  const move = (i: number, d: number) => {
    const n = [...list];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    setList(n);
  };
  // every app of the built-in catalog once, to add to any platform
  const allApps = useMemo(() => {
    const seen: Record<string, WebApp> = {};
    Object.values(defaults.apps).forEach((apps) => apps.forEach((a) => (seen[a.id] = seen[a.id] || a)));
    return Object.values(seen);
  }, [defaults.apps]);
  const presets = useMemo(
    () => Array.from(new Set(allApps.map((a) => a.deeplink).filter(Boolean))).concat(["happ://add/{url}", "{crypt}"]).filter((v, i, a) => a.indexOf(v) === i),
    [allApps]
  );

  // ---- texts ----
  const [textLang, setTextLang] = useState("tr");
  const [search, setSearch] = useState("");
  const baseTexts = { ...(defaults.texts.en || {}), ...(defaults.texts[textLang] || {}) };
  const overrides = value.texts[textLang] || {};
  const setText = (k: string, v: string) => {
    const next = { ...overrides, [k]: v };
    if (!v) delete next[k];
    set({ texts: { ...value.texts, [textLang]: next } });
  };
  const textKeys = Object.keys(defaults.texts.en || {}).filter(
    (k) => !search || k.toLowerCase().includes(search.toLowerCase()) || (baseTexts[k] || "").toLowerCase().includes(search.toLowerCase())
  );

  // ---- sections ----
  // blocks added in a later version go where they belong by default, not last
  const sections = useMemo(() => {
    const order = value.sections.filter((x) => defaults.sections.includes(x.id));
    defaults.sections.forEach((id, i) => {
      if (order.some((x) => x.id === id)) return;
      const before = defaults.sections.slice(0, i).filter((p) => order.some((x) => x.id === p));
      const pos = before.length ? order.findIndex((x) => x.id === before[before.length - 1]) + 1 : 0;
      order.splice(pos, 0, { id, enabled: true });
    });
    return order;
  }, [value.sections, defaults.sections]);
  const moveSection = (i: number, d: number) => {
    const n = [...sections];
    const [x] = n.splice(i, 1);
    n.splice(i + d, 0, x);
    set({ sections: n });
  };

  // ---- advanced: apps as JSON ----
  const [json, setJson] = useState("");
  const [jsonError, setJsonError] = useState("");

  return (
    <Tabs size="sm" variant="enclosed-colored" colorScheme="primary" isLazy onChange={(i) => i === 4 && setJson(JSON.stringify(catalog, null, 2))}>
      <TabList flexWrap="wrap" borderBottomWidth={0} gap={1} mb={4}>
        {["general", "look", "content", "apps", "advanced", "preview"].map((k) => (
          <Tab key={k} borderRadius="10px" border="0" _selected={{ bg: "primary.500", color: "white" }}>
            {t(`webpage.tab.${k}`)}
          </Tab>
        ))}
      </TabList>
      <TabPanels>
        {/* general */}
        <TabPanel p={0}>
          <VStack align="stretch" spacing={5}>
            <Toggle label={t("webpage.enabled")} help={t("webpage.enabledHelp")} on={value.enabled} onChange={(v) => set({ enabled: v })} />
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Field label={t("webpage.title")} help={t("webpage.titleHelp")}>
                <Input size="sm" borderRadius="10px" value={value.title} onChange={(e) => set({ title: e.target.value })} />
              </Field>
              <Field label={t("webpage.support")} help={t("webpage.supportHelp")}>
                <Input
                  size="sm"
                  borderRadius="10px"
                  placeholder="https://t.me/..."
                  value={value.support_url}
                  onChange={(e) => set({ support_url: e.target.value })}
                />
              </Field>
              <Field label={t("webpage.logo")}>
                <Input
                  size="sm"
                  borderRadius="10px"
                  placeholder="https://.../logo.png"
                  value={value.logo_url}
                  onChange={(e) => set({ logo_url: e.target.value })}
                />
              </Field>
              <Field label={t("webpage.lang")}>
                <Select size="sm" borderRadius="10px" value={value.default_lang} onChange={(e) => set({ default_lang: e.target.value })}>
                  <option value="auto">{t("webpage.langAuto")}</option>
                  {LANGS.filter(([k]) => value.languages.includes(k)).map(([k, n]) => (
                    <option key={k} value={k}>
                      {n}
                    </option>
                  ))}
                </Select>
              </Field>
            </SimpleGrid>
            <Field label={t("webpage.languages")} help={t("webpage.languagesHelp")}>
              <HStack spacing={2} flexWrap="wrap" rowGap={2}>
                {LANGS.map(([k, n]) => {
                  const on = value.languages.includes(k);
                  return (
                    <Button
                      key={k}
                      size="xs"
                      borderRadius="full"
                      variant={on ? "solid" : "outline"}
                      colorScheme="primary"
                      onClick={() =>
                        set({ languages: on ? value.languages.filter((x) => x !== k) : [...value.languages, k] })
                      }
                      isDisabled={on && value.languages.length === 1}
                    >
                      {n}
                    </Button>
                  );
                })}
              </HStack>
            </Field>
            <Field label={t("webpage.linkDomain")} help={t("webpage.linkDomainHelp")}>
              <Input
                size="sm"
                borderRadius="10px"
                fontFamily="mono"
                placeholder="https://sub.example.com"
                value={value.link_domain}
                onChange={(e) => set({ link_domain: e.target.value.trim() })}
              />
            </Field>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
              <Toggle label={t("webpage.devices")} help={t("webpage.devicesHelp")} on={value.show_devices} onChange={(v) => set({ show_devices: v })} />
              <Toggle
                label={t("webpage.lock")}
                help={t("webpage.lockHelp")}
                on={value.lock_on_device_limit}
                onChange={(v) => set({ lock_on_device_limit: v })}
              />
            </SimpleGrid>
            <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
              <Toggle label={t("webpage.crypt")} help={t("webpage.cryptHelp")} on={value.happ_crypt} onChange={(v) => set({ happ_crypt: v })} />
              <Toggle label={t("webpage.qr")} on={value.show_qr} onChange={(v) => set({ show_qr: v })} />
              <Toggle label={t("webpage.links")} help={t("webpage.linksHelp")} on={value.show_links} onChange={(v) => set({ show_links: v })} />
            </SimpleGrid>
          </VStack>
        </TabPanel>

        {/* look */}
        <TabPanel p={0}>
          <VStack align="stretch" spacing={5}>
            <Field label={t("webpage.style")}>
              <SimpleGrid columns={3} spacing={3} maxW="520px">
                {(["soft", "glass", "clay"] as const).map((k) => (
                  <Mini key={k} kind={k} on={value.style === k} label={t(`webpage.style.${k}`)} onClick={() => set({ style: k })} />
                ))}
              </SimpleGrid>
            </Field>
            <Field label={t("webpage.theme")}>
              <Select size="sm" maxW="260px" borderRadius="10px" value={value.theme} onChange={(e) => set({ theme: e.target.value as any })}>
                <option value="auto">{t("webpage.themeAuto")}</option>
                <option value="dark">{t("webpage.themeDark")}</option>
                <option value="light">{t("webpage.themeLight")}</option>
              </Select>
            </Field>
            <Field label={t("webpage.accent")}>
              <HStack spacing={2} flexWrap="wrap" rowGap={2}>
                {ACCENTS.map((c) => (
                  <Box
                    key={c}
                    as="button"
                    type="button"
                    w="28px"
                    h="28px"
                    borderRadius="full"
                    bg={c}
                    onClick={() => set({ accent: c })}
                    boxShadow={value.accent.toLowerCase() === c ? `0 0 0 2px var(--app-surface), 0 0 0 4px ${c}` : undefined}
                    aria-label={c}
                  />
                ))}
                <Input
                  type="color"
                  size="sm"
                  w="44px"
                  h="30px"
                  p={0.5}
                  borderRadius="8px"
                  value={value.accent}
                  onChange={(e) => set({ accent: e.target.value })}
                />
              </HStack>
            </Field>
          </VStack>
        </TabPanel>

        {/* content */}
        <TabPanel p={0}>
          <VStack align="stretch" spacing={6}>
            <Box>
              <Text fontSize="sm" fontWeight="medium">
                {t("webpage.sections")}
              </Text>
              <Text fontSize="xs" color="gray.500" mb={2}>
                {t("webpage.sectionsHelp")}
              </Text>
              <VStack align="stretch" spacing={2}>
                {sections.map((s, i) => (
                  <HStack key={s.id} {...soft} px={3} py={2}>
                    <Switch
                      size="sm"
                      colorScheme="primary"
                      isChecked={s.enabled}
                      onChange={(e) => set({ sections: sections.map((x, n) => (n === i ? { ...x, enabled: e.target.checked } : x)) })}
                    />
                    <Text fontSize="sm" flex="1">
                      {t(`webpage.section.${s.id}`)}
                    </Text>
                    <IconButton size="xs" variant="ghost" aria-label="up" icon={<ArrowUpIcon width={14} />} isDisabled={i === 0} onClick={() => moveSection(i, -1)} />
                    <IconButton
                      size="xs"
                      variant="ghost"
                      aria-label="down"
                      icon={<ArrowDownIcon width={14} />}
                      isDisabled={i === sections.length - 1}
                      onClick={() => moveSection(i, 1)}
                    />
                  </HStack>
                ))}
              </VStack>
            </Box>
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
              <Field label={t("webpage.intro")} help={t("webpage.introHelp")}>
                <PerLang value={value.intro} onChange={(intro) => set({ intro })} rows={4} />
              </Field>
              <Field label={t("webpage.footer")} help={t("webpage.footerHelp")}>
                <PerLang value={value.footer} onChange={(footer) => set({ footer })} rows={4} />
              </Field>
            </SimpleGrid>
            <Box>
              <HStack justify="space-between" flexWrap="wrap" rowGap={2} mb={2}>
                <Box>
                  <Text fontSize="sm" fontWeight="medium">
                    {t("webpage.texts")}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {t("webpage.textsHelp")}
                  </Text>
                </Box>
                <HStack>
                  <InputGroup size="sm" w="180px">
                    <InputLeftElement pointerEvents="none">
                      <Icon as={MagnifyingGlassIcon} boxSize="14px" color="gray.400" />
                    </InputLeftElement>
                    <Input borderRadius="10px" value={search} onChange={(e) => setSearch(e.target.value)} />
                  </InputGroup>
                  <LangSelect value={textLang} onChange={setTextLang} />
                </HStack>
              </HStack>
              <VStack align="stretch" spacing={2} maxH="460px" overflowY="auto" pr={1}>
                {textKeys.map((k) => (
                  <HStack key={k} spacing={3} align="center">
                    <Text fontSize="xs" color="gray.500" fontFamily="mono" w="130px" flexShrink={0} isTruncated title={k}>
                      {k}
                    </Text>
                    <Input
                      size="sm"
                      borderRadius="10px"
                      placeholder={baseTexts[k]}
                      value={overrides[k] || ""}
                      onChange={(e) => setText(k, e.target.value)}
                      borderColor={overrides[k] ? "primary.300" : undefined}
                    />
                  </HStack>
                ))}
              </VStack>
            </Box>
          </VStack>
        </TabPanel>

        {/* apps */}
        <TabPanel p={0}>
          <HStack mb={3} justify="space-between" flexWrap="wrap" rowGap={2}>
            <Text fontSize="xs" color="gray.500">
              {t("webpage.appsHelp")}
            </Text>
            <Button size="xs" variant="ghost" isDisabled={value.apps === null} onClick={() => set({ apps: null })}>
              {t("webpage.restore")}
            </Button>
          </HStack>
          <Tabs size="sm" variant="soft-rounded" colorScheme="primary" index={plat} onChange={setPlat}>
            <TabList flexWrap="wrap" gap={1} mb={3}>
              {platforms.map((k) => (
                <Tab key={k}>
                  {PLATFORM_NAMES[k] || k}
                  <Text as="span" ml={1.5} opacity={0.6} fontSize="xs">
                    {(catalog[k] || []).length}
                  </Text>
                </Tab>
              ))}
            </TabList>
          </Tabs>
          <VStack align="stretch" spacing={2}>
            {list.length === 0 && (
              <Text fontSize="sm" color="gray.500" {...soft} p={3}>
                {t("webpage.noApps")}
              </Text>
            )}
            {list.map((a, i) => (
              <AppEditor
                key={key + i}
                app={{ ...a, note: a.note || {} }}
                presets={presets}
                crypt={value.happ_crypt}
                first={i === 0}
                last={i === list.length - 1}
                onChange={(next) => setList(list.map((x, n) => (n === i ? next : x)))}
                onMove={(d) => move(i, d)}
                onDelete={() => setList(list.filter((_, n) => n !== i))}
              />
            ))}
            <Menu isLazy>
              <MenuButton as={Button} size="sm" variant="ghost" alignSelf="flex-start" leftIcon={<PlusIcon width={16} />}>
                {t("webpage.addApp")}
              </MenuButton>
              <MenuList maxH="320px" overflowY="auto">
                <MenuItem
                  onClick={() =>
                    setList([...list, { id: `app-${list.length + 1}`, name: "", featured: false, deeplink: "", crypt: false, install: [], note: {} }])
                  }
                >
                  {t("webpage.emptyApp")}
                </MenuItem>
                {allApps
                  .filter((a) => !list.some((x) => x.id === a.id))
                  .map((a) => (
                    <MenuItem key={a.id} onClick={() => setList([...list, a])}>
                      {a.name}
                    </MenuItem>
                  ))}
              </MenuList>
            </Menu>
          </VStack>
        </TabPanel>

        {/* advanced */}
        <TabPanel p={0}>
          <VStack align="stretch" spacing={5}>
            <Field label={t("webpage.css")} help={t("webpage.cssHelp")}>
              <Textarea
                size="sm"
                rows={8}
                fontFamily="mono"
                fontSize="xs"
                borderRadius="12px"
                placeholder={".card { border-radius: 28px; }\n:root { --accent: #ff7a59; }"}
                value={value.custom_css}
                onChange={(e) => set({ custom_css: e.target.value })}
              />
            </Field>
            <Field label={t("webpage.appsJson")} help={jsonError || t("webpage.jsonHelp")}>
              <Textarea
                size="sm"
                rows={16}
                fontFamily="mono"
                fontSize="xs"
                borderRadius="12px"
                borderColor={jsonError ? "red.400" : undefined}
                value={json}
                onChange={(e) => {
                  setJson(e.target.value);
                  try {
                    const parsed = JSON.parse(e.target.value);
                    if (typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("{ platform: [apps] }");
                    setJsonError("");
                    set({ apps: parsed });
                  } catch (err: any) {
                    setJsonError(err.message);
                  }
                }}
              />
            </Field>
          </VStack>
        </TabPanel>

        {/* preview */}
        <TabPanel p={0}>
          <Preview value={value} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
};
