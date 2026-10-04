// Runtime appearance: accent (bar) color, surface style, animated background,
// and an animations on/off switch. Applied by setting CSS variables and body
// classes, so it needs no theme rebuild and takes effect live. Saved per browser.

export type AccentName = "blue" | "teal" | "purple" | "green" | "rose" | "amber";
export type Surface = "minimal" | "glass";
export type Background = "default" | "slate" | "midnight" | "aurora" | "sunset";

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
};

export const BACKGROUNDS: Record<Background, { light: string; dark: string; swatch: string }> = {
  default: { light: "", dark: "", swatch: "#e2e8f0" },
  slate: {
    light: "linear-gradient(160deg,#eef2f7,#e2e8f0)",
    dark: "linear-gradient(160deg,#161b26,#0f1218)",
    swatch: "#64748b",
  },
  midnight: {
    light: "linear-gradient(160deg,#e7edff,#dfe6fb)",
    dark: "linear-gradient(160deg,#0b1437,#0a0f26)",
    swatch: "#1e3a8a",
  },
  aurora: {
    light: "linear-gradient(135deg,#e0f7fa,#e8eaf6,#fce4ec)",
    dark: "linear-gradient(135deg,#0d2b2e,#141833,#2a1030)",
    swatch: "#2dd4bf",
  },
  sunset: {
    light: "linear-gradient(135deg,#fff1e6,#ffe3ec,#f3e8ff)",
    dark: "linear-gradient(135deg,#2a160f,#2a1020,#1a1030)",
    swatch: "#fb7185",
  },
};

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
  root.style.setProperty("--app-bg", (dark ? bg.dark : bg.light) || "");

  root.classList.toggle("theme-glass", a.surface === "glass");
  root.classList.toggle("theme-animated", a.animations);
  root.classList.toggle("has-bg", a.background !== "default");

  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {}
};

export const initAppearance = () => applyAppearance(getAppearance());
