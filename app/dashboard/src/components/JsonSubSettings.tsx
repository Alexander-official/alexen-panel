// Sub settings > JSON: which apps get the Xray JSON subscription, sites that go
// direct (not through the VPN), external configs in it, and the auto (balancer) config.
import {
  Box,
  Button,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Switch,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import { FC, ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export type JsonSubSettings = {
  clients: string[];
  direct_domains: string[];
  direct_ips: string[];
  block_ads: boolean;
  include_external: boolean;
  balancer: boolean;
  balancer_name: string;
  balancer_strategy: string;
  balancer_position: string;
  probe_url: string;
  probe_interval: string;
};

export const emptyJsonSub: JsonSubSettings = {
  clients: [],
  direct_domains: [],
  direct_ips: [],
  block_ads: false,
  include_external: true,
  balancer: false,
  balancer_name: "⚡ Auto (fastest)",
  balancer_strategy: "leastPing",
  balancer_position: "top",
  probe_url: "https://www.gstatic.com/generate_204",
  probe_interval: "1m",
};

const CLIENTS = [
  { id: "v2rayng", label: "v2rayNG" },
  { id: "v2rayn", label: "v2rayN" },
  { id: "happ", label: "Happ" },
  { id: "streisand", label: "Streisand" },
];

// ready-made "go direct" lists
const PRESETS: { key: string; domains: string[]; ips: string[] }[] = [
  { key: "private", domains: [], ips: ["geoip:private"] },
  { key: "ru", domains: ["geosite:category-ru", "domain:ru", "domain:su", "domain:xn--p1ai"], ips: ["geoip:ru"] },
  { key: "ir", domains: ["geosite:category-ir", "domain:ir"], ips: ["geoip:ir"] },
  { key: "cn", domains: ["geosite:cn"], ips: ["geoip:cn"] },
  { key: "tr", domains: ["domain:tr"], ips: ["geoip:tr"] },
];

const lines = (v: string) =>
  v
    .split(/[\n,]/)
    .map((x) => x.trim())
    .filter(Boolean);

const Toggle: FC<{ label: string; help?: string; value: boolean; onChange: (v: boolean) => void }> = ({
  label,
  help,
  value,
  onChange,
}) => (
  <HStack justify="space-between" align="flex-start" spacing={4}>
    <Box>
      <Text fontSize="sm">{label}</Text>
      {help && (
        <Text fontSize="xs" color="gray.500">
          {help}
        </Text>
      )}
    </Box>
    <Switch isChecked={value} onChange={(e) => onChange(e.target.checked)} />
  </HStack>
);

const Section: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <Box
    p={3}
    borderRadius="lg"
    border="1px solid"
    borderColor="light-border"
    _dark={{ borderColor: "gray.600" }}
  >
    <Text fontSize="sm" fontWeight="semibold" mb={2}>
      {title}
    </Text>
    <VStack align="stretch" spacing={3}>
      {children}
    </VStack>
  </Box>
);

export const JsonSubSettingsPanel: FC<{ value: JsonSubSettings; onChange: (v: JsonSubSettings) => void }> = ({
  value,
  onChange,
}) => {
  const { t } = useTranslation();
  const set = (p: Partial<JsonSubSettings>) => onChange({ ...value, ...p });
  // raw text while typing; lists are built from it
  const [domains, setDomains] = useState(value.direct_domains.join("\n"));
  const [ips, setIps] = useState(value.direct_ips.join("\n"));
  useEffect(() => {
    if (lines(domains).join() !== value.direct_domains.join()) setDomains(value.direct_domains.join("\n"));
    if (lines(ips).join() !== value.direct_ips.join()) setIps(value.direct_ips.join("\n"));
  }, [value.direct_domains, value.direct_ips]);

  const addPreset = (p: (typeof PRESETS)[number]) => {
    const d = Array.from(new Set([...value.direct_domains, ...p.domains]));
    const i = Array.from(new Set([...value.direct_ips, ...p.ips]));
    set({ direct_domains: d, direct_ips: i });
  };

  return (
    <VStack align="stretch" spacing={4}>
      <Text fontSize="xs" color="gray.500">
        {t("jsonSub.help")}
      </Text>

      <Section title={t("jsonSub.clients")}>
        <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
          {CLIENTS.map((c) => {
            const on = value.clients.includes(c.id);
            return (
              <Button
                key={c.id}
                size="xs"
                borderRadius="full"
                colorScheme="primary"
                variant={on ? "solid" : "outline"}
                onClick={() => set({ clients: on ? value.clients.filter((x) => x !== c.id) : [...value.clients, c.id] })}
              >
                {c.label}
              </Button>
            );
          })}
        </HStack>
        <Text fontSize="xs" color="gray.500">
          {t("jsonSub.clientsHelp")}
        </Text>
      </Section>

      <Section title={t("jsonSub.direct")}>
        <Text fontSize="xs" color="gray.500">
          {t("jsonSub.directHelp")}
        </Text>
        <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
          {PRESETS.map((p) => (
            <Button key={p.key} size="xs" borderRadius="full" variant="outline" onClick={() => addPreset(p)}>
              + {t(`jsonSub.preset.${p.key}`)}
            </Button>
          ))}
        </HStack>
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
          <Box>
            <Text fontSize="xs" opacity={0.75} mb={1}>
              {t("jsonSub.domains")}
            </Text>
            <Textarea
              size="sm"
              rows={6}
              fontFamily="mono"
              fontSize="xs"
              placeholder={"geosite:category-ru\ndomain:example.com\nfull:www.site.com"}
              value={domains}
              onChange={(e) => {
                setDomains(e.target.value);
                set({ direct_domains: lines(e.target.value) });
              }}
            />
          </Box>
          <Box>
            <Text fontSize="xs" opacity={0.75} mb={1}>
              {t("jsonSub.ips")}
            </Text>
            <Textarea
              size="sm"
              rows={6}
              fontFamily="mono"
              fontSize="xs"
              placeholder={"geoip:private\ngeoip:ru\n1.2.3.0/24"}
              value={ips}
              onChange={(e) => {
                setIps(e.target.value);
                set({ direct_ips: lines(e.target.value) });
              }}
            />
          </Box>
        </SimpleGrid>
        <Toggle label={t("jsonSub.blockAds")} value={value.block_ads} onChange={(v) => set({ block_ads: v })} />
      </Section>

      <Section title={t("jsonSub.configs")}>
        <Toggle
          label={t("jsonSub.includeExternal")}
          help={t("jsonSub.includeExternalHelp")}
          value={value.include_external}
          onChange={(v) => set({ include_external: v })}
        />
        <Toggle
          label={t("jsonSub.balancer")}
          help={t("jsonSub.balancerHelp")}
          value={value.balancer}
          onChange={(v) => set({ balancer: v })}
        />
        {value.balancer && (
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
            <Box>
              <Text fontSize="xs" opacity={0.75} mb={1}>
                {t("jsonSub.balancerName")}
              </Text>
              <Input size="sm" value={value.balancer_name} onChange={(e) => set({ balancer_name: e.target.value })} />
            </Box>
            <Box>
              <Text fontSize="xs" opacity={0.75} mb={1}>
                {t("jsonSub.strategy")}
              </Text>
              <Select size="sm" value={value.balancer_strategy} onChange={(e) => set({ balancer_strategy: e.target.value })}>
                {["leastPing", "leastLoad", "roundRobin", "random"].map((s) => (
                  <option key={s} value={s}>
                    {t(`jsonSub.strategyName.${s}`)}
                  </option>
                ))}
              </Select>
            </Box>
            <Box>
              <Text fontSize="xs" opacity={0.75} mb={1}>
                {t("jsonSub.position")}
              </Text>
              <Select size="sm" value={value.balancer_position} onChange={(e) => set({ balancer_position: e.target.value })}>
                <option value="top">{t("jsonSub.top")}</option>
                <option value="bottom">{t("jsonSub.bottom")}</option>
              </Select>
            </Box>
            <Box>
              <Text fontSize="xs" opacity={0.75} mb={1}>
                {t("jsonSub.probeInterval")}
              </Text>
              <Select size="sm" value={value.probe_interval} onChange={(e) => set({ probe_interval: e.target.value })}>
                {["30s", "1m", "2m", "5m", "10m"].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Box>
            <Box gridColumn="1 / -1">
              <Text fontSize="xs" opacity={0.75} mb={1}>
                {t("jsonSub.probeUrl")}
              </Text>
              <Input size="sm" fontFamily="mono" fontSize="xs" value={value.probe_url} onChange={(e) => set({ probe_url: e.target.value })} />
            </Box>
          </SimpleGrid>
        )}
      </Section>
    </VStack>
  );
};
