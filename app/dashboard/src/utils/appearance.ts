// Runtime appearance: accent (bar) color, surface style, animated background,
// and an animations on/off switch. Applied by setting CSS variables and body
// classes, so it needs no theme rebuild and takes effect live. Saved per browser.

export type AccentName =
  | "blue" | "teal" | "purple" | "green" | "rose" | "amber"
  | "indigo" | "sky" | "cyan" | "emerald" | "lime" | "orange"
  | "red" | "pink" | "fuchsia" | "violet" | "slate" | "gold";

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
export type Surface = "minimal" | "glass";
export type Background =
  | "default" | "slate" | "midnight" | "aurora" | "sunset" | "amoled"
  | "ocean" | "forest" | "wine" | "mocha" | "graphite" | "nebula" | "dracula" | "nord";

export const ACCENTS: Record<AccentName, Record<number, string>> = {
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

type Tint = {
  light: Record<string, string>;
  dark: Record<string, string>;
};

export const BACKGROUNDS: Record<
  Background,
  { light: string; dark: string; swatch: string; tint?: Tint }
> = {
  default: { light: "", dark: "", swatch: "#e2e8f0" },
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

};


const TINT_VARS = [
  "gray-50", "gray-100", "gray-200", "gray-600", "gray-700", "gray-750", "gray-800", "gray-900",
];

export type Appearance = {
  accent: AccentName;
  surface: Surface;
  background: Background;
  animations: boolean;
};

const KEY = "alexen-appearance";
const DEFAULT: Appearance = {
  accent: "blue",
  surface: "minimal",
  background: "default",
  animations: true,
};

export const getAppearance = (): Appearance => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT };
};

export const applyAppearance = (a: Appearance) => {
  const root = document.documentElement;
  const palette = ACCENTS[a.accent] || ACCENTS.blue;
  Object.entries(palette).forEach(([shade, hex]) =>
    root.style.setProperty(`--chakra-colors-primary-${shade}`, hex)
  );

  const bg = BACKGROUNDS[a.background] || BACKGROUNDS.default;
  const dark =
    root.classList.contains("chakra-ui-dark") ||
    document.body.classList.contains("chakra-ui-dark") ||
    document.documentElement.getAttribute("data-theme") === "dark";
  const pageBg = (dark ? bg.dark : bg.light) || "";
  root.style.setProperty("--app-bg", pageBg);

  // reset, then apply this background's tint for the current color mode
  TINT_VARS.forEach((v) => root.style.removeProperty(`--chakra-colors-${v}`));
  root.style.removeProperty("--chakra-colors-light-border");
  root.style.removeProperty("--app-surface");
  root.style.removeProperty("--app-surface-2");
  const tint = bg.tint ? (dark ? bg.tint.dark : bg.tint.light) : {};
  Object.entries(tint).forEach(([k, v]) => {
    if (k === "border") root.style.setProperty("--chakra-colors-light-border", v);
    else if (k === "surface" || k === "surface-2") root.style.setProperty(`--app-${k}`, v);
    else root.style.setProperty(`--chakra-colors-${k}`, v);
  });
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && dark) meta.setAttribute("content", tint["gray-800"] || "#1A202C");

  root.classList.toggle("theme-glass", a.surface === "glass");
  root.classList.toggle("theme-animated", a.animations);
  root.classList.toggle("has-bg", !!pageBg);

  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {}
};

export const initAppearance = () => applyAppearance(getAppearance());
