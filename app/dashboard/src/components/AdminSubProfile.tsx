// One admin's own subscription setup, inside the admin form: the domain its
// users' links use, its own sub texts per user state, and its external configs.
import { Badge, Box, Button, Code, Collapse, FormControl, FormLabel, HStack, Input, Switch, Text, Textarea, VStack } from "@chakra-ui/react";
import { ChevronDownIcon, GlobeAltIcon } from "@heroicons/react/24/outline";
import { FC, MutableRefObject, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { fetch } from "service/http";

type Templates = {
  default_template: string;
  expired_template: string;
  disabled_template: string;
  limited_template: string;
  near_expire_template: string;
};
type Profile = {
  url_prefix: string;
  suffix: string | null;
  templates: Templates;
  external_enabled: boolean;
  external_label: string;
  external_self_edit: boolean;
  external_count: number;
  example: string;
};
const empty: Profile = {
  url_prefix: "",
  suffix: null,
  templates: { default_template: "", expired_template: "", disabled_template: "", limited_template: "", near_expire_template: "" },
  external_enabled: true,
  external_label: "",
  external_self_edit: false,
  external_count: 0,
  example: "",
};
const STATES: [keyof Templates, string][] = [
  ["default_template", "sub.default"],
  ["expired_template", "sub.expired"],
  ["disabled_template", "sub.disabled"],
  ["limited_template", "sub.limited"],
  ["near_expire_template", "sub.nearExpire"],
];

const Section: FC<{ title: string; open: boolean; onToggle: () => void; badge?: string; children: any }> = ({ title, open, onToggle, badge, children }) => (
  <Box borderRadius="12px" borderWidth="1px" borderColor="var(--tier-line)" bg="var(--tier-2)">
    <HStack px={3} py={2.5} cursor="pointer" onClick={onToggle} spacing={2}>
      <Text fontSize="sm" fontWeight="medium" flex="1">
        {title}
      </Text>
      {badge && (
        <Badge variant="subtle" colorScheme="primary" fontSize="2xs">
          {badge}
        </Badge>
      )}
      <ChevronDownIcon width={16} style={{ transform: open ? "rotate(180deg)" : undefined, transition: "transform .2s" }} />
    </HStack>
    <Collapse in={open} animateOpacity>
      <VStack align="stretch" spacing={3} px={3} pb={3}>
        {children}
      </VStack>
    </Collapse>
  </Box>
);

export const AdminSubProfile: FC<{ name: string; saveRef: MutableRefObject<((name: string) => Promise<unknown>) | null> }> = ({ name, saveRef }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [p, setP] = useState<Profile>(empty);
  const [general, setGeneral] = useState<Templates | null>(null);
  const [open, setOpen] = useState<string>("");
  const set = (patch: Partial<Profile>) => setP((x) => ({ ...x, ...patch }));

  useEffect(() => {
    if (name) fetch(`/admin/${encodeURIComponent(name)}/sub-profile`).then((d: Profile) => setP({ ...empty, ...d })).catch(() => {});
    fetch("/sub-settings").then((d: any) => setGeneral(d)).catch(() => {});
  }, [name]);
  useEffect(() => {
    saveRef.current = (who: string) =>
      fetch(`/admin/${encodeURIComponent(who)}/sub-profile`, { method: "PUT", body: { ...p, suffix: p.suffix === "" ? null : p.suffix } });
  }, [p]);

  const ownTexts = STATES.filter(([k]) => p.templates[k]?.trim()).length;

  return (
    <VStack align="stretch" spacing={2}>
      <HStack spacing={2}>
        <GlobeAltIcon width={16} />
        <Text fontSize="sm" fontWeight="semibold">
          {t("adminSub.title")}
        </Text>
      </HStack>
      <Text fontSize="xs" color="gray.500" mt={-1}>
        {t("adminSub.help")}
      </Text>

      <Section title={t("adminSub.domain")} open={open === "domain"} onToggle={() => setOpen(open === "domain" ? "" : "domain")} badge={p.url_prefix ? t("adminSub.own") : undefined}>
        <FormControl>
          <FormLabel fontSize="xs">{t("domain.address")}</FormLabel>
          <Input size="sm" fontFamily="mono" value={p.url_prefix} placeholder={t("adminSub.domainPlaceholder")} onChange={(e) => set({ url_prefix: e.target.value.trim() })} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="xs">{t("domain.suffix")}</FormLabel>
          <Input size="sm" fontFamily="mono" value={p.suffix ?? ""} placeholder={t("adminSub.suffixPlaceholder")} onChange={(e) => set({ suffix: e.target.value })} />
        </FormControl>
        {p.example && (
          <Box>
            <Text fontSize="2xs" color="gray.500">
              {t("adminSub.savedExample")}
            </Text>
            <Code fontSize="2xs" display="block" whiteSpace="normal" wordBreak="break-all" p={2} borderRadius="8px">
              {p.example}
            </Code>
          </Box>
        )}
        <Text fontSize="2xs" color="gray.500">
          {t("adminSub.domainHelp")}
        </Text>
      </Section>

      <Section title={t("adminSub.texts")} open={open === "texts"} onToggle={() => setOpen(open === "texts" ? "" : "texts")} badge={ownTexts ? t("adminSub.ownN", { n: ownTexts }) : undefined}>
        <Text fontSize="2xs" color="gray.500">
          {t("sub.scopeAdminHelp", { name })}
        </Text>
        {STATES.map(([k, label]) => (
          <FormControl key={k}>
            <FormLabel fontSize="xs">{t(label)}</FormLabel>
            <Textarea
              size="sm"
              rows={3}
              fontFamily="mono"
              fontSize="xs"
              value={p.templates[k] || ""}
              placeholder={(general as any)?.[k] || t("sub.inheritsGeneral")}
              onChange={(e) => set({ templates: { ...p.templates, [k]: e.target.value } })}
            />
          </FormControl>
        ))}
      </Section>

      <Section title={t("adminSub.external")} open={open === "external"} onToggle={() => setOpen(open === "external" ? "" : "external")} badge={p.external_count ? t("external.linkCount", { count: p.external_count }) : undefined}>
        <HStack justifyContent="space-between">
          <Text fontSize="sm">{t("external.adminEnabled")}</Text>
          <Switch size="sm" colorScheme="primary" isChecked={p.external_enabled} onChange={(e) => set({ external_enabled: e.target.checked })} />
        </HStack>
        <HStack justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Text fontSize="sm">{t("external.selfEdit")}</Text>
            <Text fontSize="2xs" color="gray.500">
              {t("external.selfEditHelp")}
            </Text>
          </Box>
          <Switch size="sm" colorScheme="primary" isChecked={p.external_self_edit} onChange={(e) => set({ external_self_edit: e.target.checked })} />
        </HStack>
        <FormControl>
          <FormLabel fontSize="xs">{t("external.label")}</FormLabel>
          <HStack>
            <Input size="sm" value={p.external_label} placeholder={t("external.labelPlaceholder")} onChange={(e) => set({ external_label: e.target.value })} />
            <Button size="sm" variant="outline" flexShrink={0} onClick={() => set({ external_label: name })}>
              {t("external.useAdminName")}
            </Button>
          </HStack>
        </FormControl>
        {name && (
          <Button size="sm" variant="outline" colorScheme="primary" onClick={() => navigate(`/external?admin=${encodeURIComponent(name)}`)}>
            {t("adminSub.editExternal", { n: p.external_count })}
          </Button>
        )}
      </Section>
    </VStack>
  );
};
