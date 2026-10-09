// Runtime appearance: accent (bar) color, surface style, animated background,
// and an animations on/off switch. Applied by setting CSS variables and body
// classes, so it needs no theme rebuild and takes effect live. Saved per browser.

export type AccentName =
  | "periwinkle" | "lavender" | "orchid" | "blush" | "coral" | "honey" | "sage" | "mint" | "lagoonBlue" | "steel"
  | "blue" | "teal" | "purple" | "green" | "rose" | "amber"
  | "indigo" | "sky" | "cyan" | "emerald" | "lime" | "orange"
  | "red" | "pink" | "fuchsia" | "violet" | "slate" | "gold"
  | "electric" | "magenta" | "neonPurple" | "aqua";

// ---- color helpers: build a whole palette from one color ----
const hexToRgb = (hex: string) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgbToHex = (rgb: number[]) =>
  "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
/** mix `a` toward `b` by `t` (0..1) */
const mix = (a: string, b: string, t: number) => {
  const x = hexToRgb(a), y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * t));
};
const scale = (base: string): Record<number, string> => ({
  50: mix(base, "#ffffff", 0.55), 100: mix(base, "#ffffff", 0.45), 200: mix(base, "#ffffff", 0.33),
  300: mix(base, "#ffffff", 0.2), 400: mix(base, "#ffffff", 0.1), 500: base,
  600: mix(base, "#000000", 0.1), 700: mix(base, "#000000", 0.2), 800: mix(base, "#000000", 0.3),
  900: mix(base, "#000000", 0.4),
});
// minimal: soft cards · glass: liquid glass · clay: puffy claymorphism
export type Surface = "minimal" | "glass" | "clay";
export type Background =
  | "default" | "slate" | "midnight" | "aurora" | "sunset" | "amoled"
  | "ocean" | "forest" | "wine" | "mocha" | "graphite" | "nebula" | "dracula" | "nord"
  | "neon" | "lava" | "toxic" | "candy" | "electric" | "sunrise" | "cyber" | "lagoon"
  | "mist" | "lilac" | "peach" | "sand" | "moss" | "dusk";

export const ACCENTS: Record<AccentName, Record<number, string>> = {
  // the soft set offered in the menu: muted, easy on the eyes, white text stays readable
  periwinkle: scale("#5b7cfa"),
  lavender: scale("#7c6cf2"),
  orchid: scale("#a26cf0"),
  blush: scale("#e06c9a"),
  coral: scale("#ea7363"),
  honey: scale("#d99a2f"),
  sage: scale("#4fa47e"),
  mint: scale("#2ea894"),
  lagoonBlue: scale("#2c9fd0"),
  steel: scale("#62708a"),
  // older choices, still honoured when saved in a browser
  blue: {
    50: "#9cb7f2", 100: "#88a9ef", 200: "#749aec", 300: "#618ce9", 400: "#4d7de7",
    500: "#396fe4", 600: "#3364cd", 700: "#2e59b6", 800: "#284ea0", 900: "#224389",
  },
  teal: {
    50: "#8fe3dc", 100: "#6fdad1", 200: "#4fd1c5", 300: "#38c0b4", 400: "#2fa89d",
    500: "#2b998f", 600: "#258079", 700: "#1f6b65", 800: "#195650", 900: "#13413d",
  },
  purple: {
    50: "#c3a6f0", 100: "#b48fec", 200: "#a479e7", 300: "#9562e3", 400: "#854bde",
    500: "#7639d4", 600: "#6830bd", 700: "#5a2aa6", 800: "#4c238f", 900: "#3e1d78",
  },
  green: {
    50: "#9be3ab", 100: "#80db95", 200: "#63d27c", 300: "#46c964", 400: "#36b554",
    500: "#2fa04a", 600: "#288a3f", 700: "#227534", 800: "#1b5f2a", 900: "#154a20",
  },
  rose: {
    50: "#f4a6c0", 100: "#f08fb0", 200: "#ec79a0", 300: "#e76290", 400: "#e24b80",
    500: "#d43971", 600: "#bd3363", 700: "#a62e56", 800: "#8f2849", 900: "#78233c",
  },
  amber: {
    50: "#f8d79a", 100: "#f5c874", 200: "#f2b84e", 300: "#efa828", 400: "#e2991a",
    500: "#cb8916", 600: "#b47813", 700: "#9d6810", 800: "#86580d", 900: "#6f480a",
  },
  indigo: scale("#5a5fe0"),
  sky: scale("#1f9bd6"),
  cyan: scale("#0fa5b8"),
  emerald: scale("#12a37a"),
  lime: scale("#6aa51c"),
  orange: scale("#e5701f"),
  red: scale("#dc3a3a"),
  pink: scale("#e0408f"),
  fuchsia: scale("#c03bd1"),
  violet: scale("#8b4fe6"),
  slate: scale("#5f6f86"),
  gold: scale("#b8962e"),
  // vivid
  electric: scale("#2563eb"),
  magenta: scale("#db2777"),
  neonPurple: scale("#9333ea"),
  aqua: scale("#06b6d4"),
};

// Each background also retints the panel itself, not just the page behind it:
//  - dark mode: Chakra's gray scale (600 borders, 700 modals/menus/inputs,
//    750 table heads/stat cards, 800 page/cards, 900) is replaced by a tinted one
//  - light mode: gray 50-200 (hover/borders) and the surface colors are tinted
// Every component reads these through CSS variables, so all blocks follow.
/** a background built from one dark base and one light base color */
function themed(dark: string, light: string, swatch: string) {
  return {
  light: `linear-gradient(160deg,${mix(light, "#ffffff", 0.45)},${light})`,
  dark: `linear-gradient(160deg,${mix(dark, "#ffffff", 0.04)},${mix(dark, "#000000", 0.35)})`,
  swatch,
  tint: {
    light: {
      "gray-50": mix(light, "#ffffff", 0.6), "gray-100": mix(light, "#ffffff", 0.3),
      "gray-200": light, border: mix(light, "#000000", 0.1),
      surface: mix(light, "#ffffff", 0.86), "surface-2": mix(light, "#ffffff", 0.55),
    },
    dark: {
      "gray-600": mix(dark, "#ffffff", 0.18), "gray-700": mix(dark, "#ffffff", 0.08),
      "gray-750": mix(dark, "#ffffff", 0.04), "gray-800": dark, "gray-900": mix(dark, "#000000", 0.3),
    },
  },
};
}

/** a saturated two-color background; surfaces are tinted with its color so
 *  text stays readable on top of the strong gradient */
function vivid(darkA: string, darkB: string, lightA: string, lightB: string, swatch: string) {
  return {
    light: `linear-gradient(135deg,${lightA},${lightB})`,
    dark: `linear-gradient(135deg,${darkA},${darkB})`,
    swatch,
    tint: {
      light: {
        "gray-50": mix(lightA, "#ffffff", 0.82), "gray-100": mix(lightA, "#ffffff", 0.66),
        "gray-200": mix(lightA, "#ffffff", 0.45), border: mix(lightA, "#ffffff", 0.3),
        surface: mix(lightA, "#ffffff", 0.9), "surface-2": mix(lightA, "#ffffff", 0.78),
      },
      dark: {
        "gray-600": mix(darkA, "#ffffff", 0.2), "gray-700": mix(darkA, "#000000", 0.2),
        "gray-750": mix(darkA, "#000000", 0.32), "gray-800": mix(darkA, "#000000", 0.45),
        "gray-900": mix(darkA, "#000000", 0.6),
      },
    },
  };
}

type Tint = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

export const BACKGROUNDS: Record<
  Background,
  { light: string; dark: string; swatch: string; tint?: Tint }
> = {
  // the panel's own base: soft graphite-blue grays instead of the stock palette
  default: {
    light: "",
    dark: "",
    swatch: "#e2e8f0",
    tint: {
      light: { "gray-50": "#f5f6f9", "gray-100": "#eceef3", "gray-200": "#e1e4ec", border: "#e3e6ed",
               surface: "#ffffff", "surface-2": "#f7f8fb" },
      dark: { "gray-600": "#3a4254", "gray-700": "#232a38", "gray-750": "#1c2230", "gray-800": "#151a25",
              "gray-900": "#0f131b" },
    },
  },
  slate: {
    light: "linear-gradient(160deg,#eef2f7,#e2e8f0)",
    dark: "linear-gradient(160deg,#161b26,#0f1218)",
    swatch: "#64748b",
    tint: {
      light: { "gray-50": "#f4f6f9", "gray-100": "#e9edf2", "gray-200": "#dbe1e9",
               border: "#cfd6e0", surface: "#fbfcfd", "surface-2": "#f2f5f8" },
      dark: { "gray-600": "#3a4252", "gray-700": "#262c38", "gray-750": "#1f242e",
              "gray-800": "#181c24", "gray-900": "#111419" },
    },
  },
  midnight: {
    light: "linear-gradient(160deg,#e7edff,#dfe6fb)",
    dark: "linear-gradient(160deg,#0b1437,#0a0f26)",
    swatch: "#1e3a8a",
    tint: {
      light: { "gray-50": "#f2f5ff", "gray-100": "#e6ebfb", "gray-200": "#d5ddf5",
               border: "#c9d3ef", surface: "#fbfcff", "surface-2": "#eef2fd" },
      dark: { "gray-600": "#2b3a6b", "gray-700": "#18234a", "gray-750": "#141d3d",
              "gray-800": "#0f1631", "gray-900": "#0a0f24" },
    },
  },
  aurora: {
    light: "linear-gradient(135deg,#e0f7fa,#e8eaf6,#fce4ec)",
    dark: "linear-gradient(135deg,#0d2b2e,#141833,#2a1030)",
    swatch: "#2dd4bf",
    tint: {
      light: { "gray-50": "#f1fbfb", "gray-100": "#e3f4f4", "gray-200": "#cfe8ea",
               border: "#c3dfe2", surface: "#fbfefe", "surface-2": "#edf7f8" },
      dark: { "gray-600": "#2c4a52", "gray-700": "#1b2e38", "gray-750": "#17262f",
              "gray-800": "#121e26", "gray-900": "#0d161c" },
    },
  },
  sunset: {
    light: "linear-gradient(135deg,#fff1e6,#ffe3ec,#f3e8ff)",
    dark: "linear-gradient(135deg,#2a160f,#2a1020,#1a1030)",
    swatch: "#fb7185",
    tint: {
      light: { "gray-50": "#fff6f2", "gray-100": "#fdebe6", "gray-200": "#f6d8d3",
               border: "#efcac4", surface: "#fffcfb", "surface-2": "#fdf1ee" },
      dark: { "gray-600": "#553040", "gray-700": "#3a1f2c", "gray-750": "#301a25",
              "gray-800": "#26141e", "gray-900": "#1c0f16" },
    },
  },
  // pure black for OLED phones; in light mode it behaves like default
  amoled: {
    light: "",
    dark: "#000000",
    swatch: "#000000",
    tint: {
      light: {},
      dark: { "gray-600": "#2a2a2a", "gray-700": "#161616", "gray-750": "#0e0e0e",
              "gray-800": "#000000", "gray-900": "#000000" },
    },
  },
  ocean: themed("#0b2233", "#d4ebf5", "#0e7490"),
  forest: themed("#0f2418", "#d6eedd", "#15803d"),
  wine: themed("#2a0f1a", "#f5d9e1", "#9f1239"),
  mocha: themed("#241a14", "#eee0d3", "#92400e"),
  graphite: themed("#1b1d21", "#dde0e5", "#374151"),
  nebula: themed("#1a1033", "#e3dafa", "#6d28d9"),
  dracula: themed("#21222c", "#e2e2ef", "#bd93f9"),
  nord: themed("#242933", "#dde3ec", "#5e81ac"),
  // vivid
  neon: vivid("#4c1d95", "#0e7490", "#a78bfa", "#67e8f9", "#8b5cf6"),
  lava: vivid("#7f1d1d", "#9a3412", "#fca5a5", "#fdba74", "#ef4444"),
  toxic: vivid("#14532d", "#3f6212", "#86efac", "#bef264", "#22c55e"),
  candy: vivid("#831843", "#6b21a8", "#f9a8d4", "#c4b5fd", "#ec4899"),
  electric: vivid("#1e3a8a", "#312e81", "#93c5fd", "#a5b4fc", "#3b82f6"),
  sunrise: vivid("#7c2d12", "#713f12", "#fdba74", "#fde047", "#f97316"),
  cyber: vivid("#701a75", "#155e75", "#f0abfc", "#67e8f9", "#d946ef"),
  lagoon: vivid("#064e3b", "#164e63", "#6ee7b7", "#7dd3fc", "#10b981"),
  // soft set
  mist: themed("#161b26", "#e6ebf3", "#94a3b8"),
  lilac: themed("#1b1729", "#ebe6f7", "#a78bfa"),
  peach: themed("#251a17", "#f8e9e1", "#f4a582"),
  sand: themed("#211d16", "#f1ebdf", "#d6b98c"),
  moss: themed("#141d18", "#e3eee6", "#7fb08f"),
  dusk: themed("#1a1824", "#e9e4ee", "#8b7fa8"),

};


/** what the appearance panel offers (the rest stays valid for old saves) */
export const ACCENT_CHOICES: AccentName[] = [
  "periwinkle", "lavender", "orchid", "blush", "coral", "honey", "sage", "mint", "lagoonBlue", "steel",
];
export const BACKGROUND_CHOICES: Background[] = [
  "default", "mist", "slate", "midnight", "nord", "dusk", "lilac", "nebula", "ocean", "moss", "forest",
  "sand", "peach", "mocha", "aurora", "sunset", "amoled",
];

const TINT_VARS = [
  "gray-50", "gray-100", "gray-200", "gray-600", "gray-700", "gray-750", "gray-800", "gray-900",
];

export type Appearance = {
  accent: AccentName | "custom";
  surface: Surface;
  background: Background | "custom";
  animations: boolean;
  // colors picked by hand, used when accent / background is "custom"
  customAccent: string;
  customBackground: string;
  // the three tiers (page, layers, items): how far apart they are, and colors
  // picked by hand per color mode ("" = worked out from the background)
  tierContrast: number;
  tiers: { light: TierColors; dark: TierColors };
};
export type TierColors = { page: string; layer: string; item: string };
export const emptyTiers = (): { light: TierColors; dark: TierColors } => ({
  light: { page: "", layer: "", item: "" },
  dark: { page: "", layer: "", item: "" },
});

const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};

/** a background from one picked color: the color itself in the mode it suits,
 *  a darkened / lightened version of it in the other */
export const customBackground = (color: string) => {
  const light = luminance(color);
  const dark = light < 0.35 ? color : mix(color, "#000000", 0.78);
  const lightBase = light > 0.65 ? color : mix(color, "#ffffff", 0.78);
  return themed(dark, lightBase, color);
};

export const accentPalette = (a: Appearance) =>
  a.accent === "custom" ? scale(a.customAccent) : ACCENTS[a.accent] || ACCENTS.periwinkle;

const KEY = "alexen-appearance";
const DEFAULT: Appearance = {
  accent: "periwinkle",
  surface: "minimal",
  background: "default",
  animations: true,
  customAccent: "#5b7cfa",
  customBackground: "#1e293b",
  tierContrast: 1,
  tiers: emptyTiers(),
};

export const getAppearance = (): Appearance => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...DEFAULT, ...saved, tiers: { ...emptyTiers(), ...(saved.tiers || {}) } };
    }
  } catch {}
  return { ...DEFAULT };
};

export const applyAppearance = (a: Appearance) => {
  const root = document.documentElement;
  const palette = accentPalette(a);
  Object.entries(palette).forEach(([shade, hex]) =>
    root.style.setProperty(`--chakra-colors-primary-${shade}`, hex)
  );

  const bg =
    a.background === "custom"
      ? customBackground(a.customBackground)
      : BACKGROUNDS[a.background] || BACKGROUNDS.default;
  const dark = isDarkMode();
  const pageBg = (dark ? bg.dark : bg.light) || "";
  root.style.setProperty("--app-bg", pageBg);

  // reset, then apply this background's tint for the current color mode
  TINT_VARS.forEach((v) => root.style.removeProperty(`--chakra-colors-${v}`));
  root.style.removeProperty("--chakra-colors-light-border");
  root.style.removeProperty("--app-surface");
  root.style.removeProperty("--app-surface-2");
  ["gray-600", "gray-700", "gray-750", "gray-800", "gray-900"].forEach((v) => root.style.removeProperty(`--chakra-colors-${v}`));
  const tint = bg.tint ? (dark ? bg.tint.dark : bg.tint.light) : {};
  Object.entries(tint).forEach(([k, v]) => {
    if (k === "border") root.style.setProperty("--chakra-colors-light-border", v);
    else if (k === "surface" || k === "surface-2") root.style.setProperty(`--app-${k}`, v);
    else root.style.setProperty(`--chakra-colors-${k}`, v);
  });
  applyTiers(root, dark, tint, a);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && dark) meta.setAttribute("content", root.style.getPropertyValue("--tier-0") || "#1A202C");

  root.classList.toggle("theme-glass", a.surface === "glass");
  root.classList.toggle("theme-clay", a.surface === "clay");
  root.classList.toggle("theme-animated", a.animations);
  root.classList.toggle("has-bg", !!pageBg);

  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {}
};

/** Three clearly separate tiers, derived from the background's base color:
 *    tier 0  the page behind everything
 *    tier 1  layers on it: cards, panels, modals, menus, the sidebar, tables
 *    tier 2  sections inside a layer (and table heads)
 *    item    things you click or type in: fields, chips, outline buttons, rows on hover
 *  Dark mode rebuilds Chakra's gray scale from these, so every component follows. */
function applyTiers(root: HTMLElement, dark: boolean, tint: Record<string, string>, a: Appearance) {
  const set = (k: string, v: string) => root.style.setProperty(k, v);
  const k = Math.min(2.5, Math.max(0.4, a.tierContrast || 1));
  const own = (dark ? a.tiers?.dark : a.tiers?.light) || { page: "", layer: "", item: "" };
  if (dark) {
    const base = own.layer || tint["gray-800"] || "#151a25";
    const t0 = own.page || mix(base, "#000000", Math.min(0.9, 0.3 * k));
    const t1 = own.layer || mix(base, "#ffffff", 0.05 * k);
    const item = own.item || mix(t1, "#ffffff", 0.095 * k);
    const t2 = mix(t1, item, 0.5);
    set("--tier-0", t0); set("--tier-1", t1); set("--tier-2", t2);
    set("--tier-item", item); set("--tier-item-hover", mix(item, "#ffffff", 0.07));
    set("--tier-line", mix(item, "#ffffff", 0.03));
    // Chakra's grays: 900/800 the page, 750 layers, 700 inner parts, 600 lines
    set("--chakra-colors-gray-900", mix(t0, "#000000", 0.18));
    set("--chakra-colors-gray-800", t0);
    set("--chakra-colors-gray-750", t1);
    set("--chakra-colors-gray-700", t2);
    set("--chakra-colors-gray-600", mix(item, "#ffffff", 0.1));
  } else {
    const t1 = own.layer || tint.surface || "#ffffff";
    const t0 = own.page || mix(tint["gray-200"] || "#e1e4ec", "#ffffff", Math.max(0, 1 - 0.7 * k));
    const item = own.item || mix(t0, t1, Math.max(0, 1 - 0.7 * k));
    const t2 = mix(t1, item, 0.5);
    set("--tier-0", t0); set("--tier-1", t1); set("--tier-2", t2);
    set("--tier-item", item); set("--tier-item-hover", mix(item, "#000000", 0.04));
    set("--tier-line", mix(item, "#000000", 0.07));
    set("--app-surface", t1);
    set("--app-surface-2", t2);
  }
}

/** dark or light right now. Before React has rendered (the first paint, the
 *  login page) Chakra hasn't set its class yet: then its saved choice decides. */
export const isDarkMode = () => {
  const root = document.documentElement;
  if (root.classList.contains("chakra-ui-dark") || document.body?.classList.contains("chakra-ui-dark")) return true;
  if (root.classList.contains("chakra-ui-light") || document.body?.classList.contains("chakra-ui-light")) return false;
  const attr = root.getAttribute("data-theme");
  if (attr === "dark" || attr === "light") return attr === "dark";
  let saved: string | null = null;
  try {
    saved = localStorage.getItem("chakra-ui-color-mode");
  } catch {}
  if (saved === "dark" || saved === "light") return saved === "dark";
  return !!window.matchMedia?.("(prefers-color-scheme: dark)").matches;
};

let watching = false;
export const initAppearance = () => {
  applyAppearance(getAppearance());
  if (watching) return;
  watching = true;
  // the mode can change anywhere (header button, login page, another tab): follow it
  let last = isDarkMode();
  const follow = () => {
    const now = isDarkMode();
    if (now !== last) {
      last = now;
      applyAppearance(getAppearance());
    }
  };
  const obs = new MutationObserver(follow);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme", "style"] });
  if (document.body) obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
  else window.addEventListener("DOMContentLoaded", () => obs.observe(document.body, { attributes: true, attributeFilter: ["class"] }));
  window.addEventListener("storage", (e) => e.key === "chakra-ui-color-mode" && follow());
};

/** ready combinations: mode, card style, accent, background and layer colors together */
export type Preset = {
  id: string;
  mode: "light" | "dark";
  surface: Surface;
  accent: AccentName;
  background: Background;
  tierContrast: number;
  tiers?: Partial<TierColors>;
  // what the tile shows: page, layer, item
  look: [string, string, string];
};
export const PRESETS: Preset[] = [
  { id: "amoled", mode: "dark", surface: "minimal", accent: "periwinkle", background: "amoled", tierContrast: 1.3,
    tiers: { page: "#000000", layer: "#0c0d10", item: "#1b1d23" }, look: ["#000000", "#0c0d10", "#1b1d23"] },
  { id: "amoledNeon", mode: "dark", surface: "minimal", accent: "mint", background: "amoled", tierContrast: 1.3,
    tiers: { page: "#000000", layer: "#08100f", item: "#122422" }, look: ["#000000", "#08100f", "#122422"] },
  { id: "graphite", mode: "dark", surface: "minimal", accent: "periwinkle", background: "default", tierContrast: 1, look: ["#0f131b", "#1f2430", "#2c313b"] },
  { id: "midnight", mode: "dark", surface: "minimal", accent: "lagoonBlue", background: "midnight", tierContrast: 1.1, look: ["#0a0f24", "#141d3d", "#1d2a54"] },
  { id: "nord", mode: "dark", surface: "minimal", accent: "steel", background: "nord", tierContrast: 1.1, look: ["#1a1e26", "#2b303b", "#3b4252"] },
  { id: "dracula", mode: "dark", surface: "minimal", accent: "orchid", background: "dracula", tierContrast: 1.1, look: ["#181920", "#282a36", "#383a4a"] },
  { id: "forest", mode: "dark", surface: "minimal", accent: "sage", background: "forest", tierContrast: 1.1, look: ["#0a1910", "#16301f", "#21402c"] },
  { id: "sunset", mode: "dark", surface: "minimal", accent: "coral", background: "sunset", tierContrast: 1.1, look: ["#1c0f16", "#301a25", "#43263a"] },
  { id: "contrast", mode: "dark", surface: "minimal", accent: "honey", background: "default", tierContrast: 2.2, look: ["#090b10", "#232936", "#3a4252"] },
  { id: "paper", mode: "light", surface: "minimal", accent: "honey", background: "sand", tierContrast: 1, look: ["#ebe4d6", "#fbf9f5", "#efe9de"] },
  { id: "snow", mode: "light", surface: "minimal", accent: "periwinkle", background: "default", tierContrast: 1.2, look: ["#e4e7ee", "#ffffff", "#eef0f5"] },
  { id: "glassAurora", mode: "light", surface: "glass", accent: "mint", background: "aurora", tierContrast: 1, look: ["#e0f7fa", "#f6fdfd", "#e3f4f4"] },
  { id: "clayPeach", mode: "light", surface: "clay", accent: "blush", background: "peach", tierContrast: 1, look: ["#f3e0d6", "#f8e9e1", "#f1ddd2"] },
];

export const presetAppearance = (p: Preset, current: Appearance): Appearance => {
  const tiers = emptyTiers();
  if (p.tiers) tiers[p.mode] = { page: "", layer: "", item: "", ...p.tiers };
  return { ...current, surface: p.surface, accent: p.accent, background: p.background, tierContrast: p.tierContrast, tiers };
};
