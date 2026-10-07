// The appearance drawer: color mode, card style (soft / liquid glass / clay),
// accent color, background and motion. Everything applies live and is saved
// per browser (utils/appearance.ts).
import {
  Box,
  Button,
  Slider,
  SliderFilledTrack,
  SliderThumb,
  SliderTrack,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  HStack,
  Icon,
  SimpleGrid,
  Switch,
  Text,
  Tooltip,
  useColorMode,
  VStack,
} from "@chakra-ui/react";
import { ComputerDesktopIcon, MoonIcon, SunIcon } from "@heroicons/react/24/outline";
import { FC, ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ACCENT_CHOICES,
  ACCENTS,
  applyAppearance,
  Appearance,
  BACKGROUND_CHOICES,
  BACKGROUNDS,
  emptyTiers,
  getAppearance,
  Surface,
  TierColors,
} from "utils/appearance";
import { useNavigate } from "react-router-dom";
import { ColorPicker } from "./ColorPicker";

const Group: FC<{ title: string; children: ReactNode }> = ({ title, children }) => (
  <Box>
    <Text fontSize="xs" fontWeight="semibold" textTransform="uppercase" letterSpacing="wider" color="gray.500" mb={2.5}>
      {title}
    </Text>
    {children}
  </Box>
);

const Choice: FC<{ on: boolean; onClick: () => void; children: ReactNode }> = ({ on, onClick, children }) => (
  <Box
    as="button"
    type="button"
    onClick={onClick}
    borderRadius="16px"
    p={2.5}
    borderWidth="2px"
    borderColor={on ? "primary.400" : "transparent"}
    bg="blackAlpha.50"
    _dark={{ bg: "whiteAlpha.50" }}
    transition="border-color .15s, transform .15s"
    _hover={{ transform: "translateY(-1px)" }}
    textAlign="left"
  >
    {children}
  </Box>
);

/** a small picture of what each card style looks like */
const StyleSample: FC<{ kind: Surface; dark: boolean }> = ({ kind, dark }) => {
  const page = dark ? "#151a25" : "#eceef3";
  const card = {
    minimal: {
      bg: dark ? "#1c2230" : "#fff",
      boxShadow: dark ? "0 4px 12px rgba(0,0,0,.35)" : "0 4px 12px rgba(16,24,40,.08)",
      border: `1px solid ${dark ? "rgba(255,255,255,.06)" : "rgba(15,23,42,.05)"}`,
    },
    glass: {
      bg: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.5)",
      boxShadow: "0 6px 18px rgba(31,38,135,.18), inset 0 1px 0 rgba(255,255,255,.6)",
      border: "1px solid rgba(255,255,255,.5)",
      backdropFilter: "blur(6px)",
    },
    clay: {
      bg: page,
      boxShadow: dark
        ? "5px 5px 12px rgba(0,0,0,.55), -4px -4px 10px rgba(255,255,255,.04)"
        : "5px 5px 12px rgba(112,124,156,.25), -5px -5px 12px #fff",
      border: "0",
    },
  }[kind];
  return (
    <Box
      h="64px"
      borderRadius="12px"
      p={2.5}
      style={{
        background:
          kind === "glass"
            ? "linear-gradient(135deg, var(--chakra-colors-primary-300), #f0abfc 55%, #67e8f9)"
            : page,
      }}
    >
      <Box h="100%" borderRadius={kind === "clay" ? "14px" : "10px"} p={2} {...card}>
        <Box h="6px" w="55%" borderRadius="full" bg={dark ? "whiteAlpha.400" : "blackAlpha.300"} mb={1.5} />
        <Box h="6px" w="35%" borderRadius="full" bg="primary.400" />
      </Box>
    </Box>
  );
};

export const AppearanceSettings: FC<{ wide?: boolean }> = ({ wide }) => {
  const { t } = useTranslation();
  const { colorMode, setColorMode } = useColorMode();
  const [a, setA] = useState<Appearance>(getAppearance());
  const [picking, setPicking] = useState<"" | "accent" | "background">("");
  const [mode, setMode] = useState<string>(() => {
    try {
      return localStorage.getItem("alexen-mode") || colorMode;
    } catch {
      return colorMode;
    }
  });
  const update = (patch: Partial<Appearance>) => {
    const next = { ...a, ...patch };
    applyAppearance(next);
    setA(next);
  };
  // "system" follows the device and keeps following it
  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setColorMode(mq.matches ? "dark" : "light");
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, [mode]);
  useEffect(() => {
    applyAppearance(getAppearance());
  }, [colorMode]);
  const pickMode = (m: string) => {
    setMode(m);
    try {
      localStorage.setItem("alexen-mode", m);
    } catch {}
    if (m !== "system") setColorMode(m);
  };
  const dark = colorMode === "dark";

  return (
          <SimpleGrid columns={wide ? { base: 1, xl: 2 } : 1} spacing={7} pt={3} alignItems="start">
            <Group title={t("appearance.mode")}>
              <SimpleGrid columns={3} spacing={2}>
                {[
                  ["light", SunIcon],
                  ["dark", MoonIcon],
                  ["system", ComputerDesktopIcon],
                ].map(([m, icon]: any) => (
                  <Choice key={m} on={mode === m} onClick={() => pickMode(m)}>
                    <VStack spacing={1} py={1}>
                      <Icon as={icon} boxSize="20px" />
                      <Text fontSize="sm">{t(`appearance.mode.${m}`)}</Text>
                    </VStack>
                  </Choice>
                ))}
              </SimpleGrid>
            </Group>

            <Group title={t("appearance.style")}>
              <SimpleGrid columns={3} spacing={2}>
                {(["minimal", "glass", "clay"] as Surface[]).map((k) => (
                  <Choice key={k} on={a.surface === k} onClick={() => update({ surface: k })}>
                    <StyleSample kind={k} dark={dark} />
                    <Text fontSize="sm" mt={2} fontWeight="medium">
                      {t(`appearance.style.${k}`)}
                    </Text>
                  </Choice>
                ))}
              </SimpleGrid>
            </Group>

            <Group title={t("appearance.accent")}>
              <SimpleGrid columns={6} spacing={2.5}>
                {ACCENT_CHOICES.map((name) => (
                  <Tooltip key={name} label={t(`appearance.color.${name}`)} hasArrow openDelay={300}>
                    <Box
                      as="button"
                      type="button"
                      aria-label={name}
                      w="100%"
                      style={{ aspectRatio: "1" }}
                      borderRadius="full"
                      bg={ACCENTS[name][500]}
                      boxShadow={
                        a.accent === name
                          ? `0 0 0 3px var(--chakra-colors-chakra-body-bg), 0 0 0 5px ${ACCENTS[name][500]}`
                          : `0 4px 10px ${ACCENTS[name][500]}55`
                      }
                      transition="transform .15s"
                      _hover={{ transform: "scale(1.08)" }}
                      onClick={() => {
                        setPicking("");
                        update({ accent: name });
                      }}
                    />
                  </Tooltip>
                ))}
                <Tooltip label={t("appearance.custom")} hasArrow>
                  <Box
                    as="button"
                    type="button"
                    aria-label="custom"
                    w="100%"
                    style={{ aspectRatio: "1", background: "conic-gradient(#f87171,#fbbf24,#4ade80,#22d3ee,#818cf8,#e879f9,#f87171)" }}
                    borderRadius="full"
                    p="4px"
                    boxShadow={a.accent === "custom" ? "0 0 0 3px var(--chakra-colors-chakra-body-bg), 0 0 0 5px var(--chakra-colors-primary-500)" : undefined}
                    onClick={() => {
                      setPicking(picking === "accent" ? "" : "accent");
                      update({ accent: "custom" });
                    }}
                  >
                    <Box w="full" h="full" borderRadius="full" style={{ background: a.customAccent }} />
                  </Box>
                </Tooltip>
              </SimpleGrid>
              {picking === "accent" && (
                <Box mt={3}>
                  <ColorPicker value={a.customAccent} onChange={(c) => update({ accent: "custom", customAccent: c })} />
                </Box>
              )}
            </Group>

            <Group title={t("appearance.background")}>
              <SimpleGrid columns={6} spacing={2.5}>
                {BACKGROUND_CHOICES.map((name) => {
                  const bg = BACKGROUNDS[name];
                  const page = (dark ? bg.dark : bg.light) || (dark ? "#151a25" : "#f5f6f9");
                  // the tile shows the background with its own color glowing in a corner,
                  // so dark backgrounds can still be told apart
                  const fill = `radial-gradient(circle at 78% 78%, ${bg.swatch}cc, transparent 62%), ${page}`;
                  return (
                    <Tooltip key={name} label={t(`appearance.bg.${name}`)} hasArrow openDelay={300}>
                      <Box
                        as="button"
                        type="button"
                        aria-label={name}
                        w="100%"
                        style={{ aspectRatio: "1", background: fill }}
                        borderRadius="12px"
                        borderWidth="2px"
                        borderColor={a.background === name ? "primary.400" : dark ? "whiteAlpha.200" : "blackAlpha.100"}
                        position="relative"
                        overflow="hidden"
                        onClick={() => {
                          setPicking("");
                          update({ background: name });
                        }}
                      >
                      </Box>
                    </Tooltip>
                  );
                })}
                <Tooltip label={t("appearance.custom")} hasArrow>
                  <Box
                    as="button"
                    type="button"
                    aria-label="custom background"
                    w="100%"
                    style={{ aspectRatio: "1", background: "conic-gradient(#f87171,#fbbf24,#4ade80,#22d3ee,#818cf8,#e879f9,#f87171)" }}
                    borderRadius="12px"
                    p="4px"
                    borderWidth="2px"
                    borderColor={a.background === "custom" ? "primary.400" : "transparent"}
                    onClick={() => {
                      setPicking(picking === "background" ? "" : "background");
                      update({ background: "custom" });
                    }}
                  >
                    <Box w="full" h="full" borderRadius="8px" style={{ background: a.customBackground }} />
                  </Box>
                </Tooltip>
              </SimpleGrid>
              {picking === "background" && (
                <Box mt={3}>
                  <ColorPicker value={a.customBackground} onChange={(c) => update({ background: "custom", customBackground: c })} />
                </Box>
              )}
            </Group>

            <Group title={t("appearance.motion")}>
              <HStack borderRadius="14px" bg="blackAlpha.50" _dark={{ bg: "whiteAlpha.50" }} p={3} spacing={3} align="flex-start">
                <Switch size="sm" mt={0.5} colorScheme="primary" isChecked={a.animations} onChange={(e) => update({ animations: e.target.checked })} />
                <Box>
                  <Text fontSize="sm">{t("appearance.animations")}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {t("appearance.animationsHelp")}
                  </Text>
                </Box>
              </HStack>
            </Group>

            <TierSettings a={a} dark={dark} update={update} />
          </SimpleGrid>
  );
};

export const AppearancePanel: FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <Drawer isOpen={isOpen} onClose={onClose} placement="right" size="sm">
      <DrawerOverlay bg="blackAlpha.300" />
      <DrawerContent borderLeftRadius={{ base: 0, sm: "24px" }} className="alexen-drawer">
        <DrawerCloseButton mt={2} borderRadius="full" />
        <DrawerHeader pb={1}>
          <Text fontSize="lg">{t("appearance.title")}</Text>
          <Text fontSize="xs" color="gray.500" fontWeight="normal">
            {t("appearance.help")}
          </Text>
          <Button
            size="xs"
            mt={2}
            variant="outline"
            colorScheme="primary"
            onClick={() => {
              onClose();
              navigate("/theme");
            }}
          >
            {t("appearance.openPage")}
          </Button>
        </DrawerHeader>
        <DrawerBody pb={8}>
          <AppearanceSettings />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
};

// the three tiers: a live picture, how far apart they are, and a color per tier
const TierSettings: FC<{ a: Appearance; dark: boolean; update: (p: Partial<Appearance>) => void }> = ({ a, dark, update }) => {
  const { t } = useTranslation();
  const [picking, setPicking] = useState<"" | keyof TierColors>("");
  const mode = dark ? "dark" : "light";
  const own = a.tiers[mode];
  const cssVar = (v: string) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const current: Record<keyof TierColors, string> = {
    page: own.page || cssVar("--tier-0"),
    layer: own.layer || cssVar("--tier-1"),
    item: own.item || cssVar("--tier-item"),
  };
  const setTier = (k: keyof TierColors, v: string) =>
    update({ tiers: { ...a.tiers, [mode]: { ...own, [k]: v } } });
  return (
    <Group title={t("appearance.tiers")}>
      <Text fontSize="xs" color="gray.500" mb={3}>
        {t("appearance.tiersHelp")}
      </Text>
      {/* live picture: page > layer > items */}
      <Box borderRadius="14px" p={3} style={{ background: "var(--tier-0)" }} borderWidth="1px" borderColor="var(--tier-line)" mb={3}>
        <Text fontSize="2xs" color="gray.500" mb={1.5}>
          {t("appearance.tier.page")}
        </Text>
        <Box borderRadius="12px" p={3} style={{ background: "var(--tier-1)" }} borderWidth="1px" borderColor="var(--tier-line)">
          <Text fontSize="2xs" color="gray.500" mb={1.5}>
            {t("appearance.tier.layer")}
          </Text>
          <HStack spacing={1.5}>
            {["7h", "1d", "1w"].map((x, i) => (
              <Box key={x} px={2.5} py={1} borderRadius="8px" fontSize="xs" style={{ background: i === 1 ? "var(--chakra-colors-primary-500)" : "var(--tier-item)" }} color={i === 1 ? "white" : undefined} borderWidth="1px" borderColor={i === 1 ? "transparent" : "var(--tier-line)"}>
                {x}
              </Box>
            ))}
            <Text fontSize="2xs" color="gray.500">
              ← {t("appearance.tier.item")}
            </Text>
          </HStack>
        </Box>
      </Box>
      <Box mb={3}>
        <HStack justifyContent="space-between" mb={1}>
          <Text fontSize="sm">{t("appearance.tierContrast")}</Text>
          <Text fontSize="xs" color="gray.500">
            {Math.round((a.tierContrast || 1) * 100)}%
          </Text>
        </HStack>
        <Slider min={0.4} max={2.5} step={0.05} value={a.tierContrast || 1} onChange={(v) => update({ tierContrast: v })}>
          <SliderTrack>
            <SliderFilledTrack bg="primary.500" />
          </SliderTrack>
          <SliderThumb />
        </Slider>
      </Box>
      <SimpleGrid columns={3} spacing={2}>
        {(["page", "layer", "item"] as (keyof TierColors)[]).map((k) => (
          <Choice key={k} on={picking === k} onClick={() => setPicking(picking === k ? "" : k)}>
            <Box h="28px" borderRadius="8px" mb={1.5} borderWidth="1px" borderColor="var(--tier-line)" style={{ background: current[k] }} />
            <Text fontSize="xs" fontWeight="medium">
              {t(`appearance.tier.${k}`)}
            </Text>
            <Text fontSize="2xs" color="gray.500">
              {own[k] ? own[k] : t("appearance.tierAuto")}
            </Text>
          </Choice>
        ))}
      </SimpleGrid>
      {picking && (
        <Box mt={3}>
          <ColorPicker value={current[picking] || "#888888"} onChange={(c) => setTier(picking, c)} />
          <Button size="xs" mt={2} variant="ghost" onClick={() => setTier(picking, "")}>
            {t("appearance.tierReset")}
          </Button>
        </Box>
      )}
      <Button size="xs" mt={3} variant="outline" onClick={() => update({ tierContrast: 1, tiers: emptyTiers() })}>
        {t("appearance.tiersResetAll")}
      </Button>
    </Group>
  );
};

export const ThemePage: FC = () => (
  <Box>
    <AppearanceSettings wide />
  </Box>
);
