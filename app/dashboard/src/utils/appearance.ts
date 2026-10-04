// Runtime appearance: accent color + surface style (minimalist | glass).
// Works by overriding Chakra's --chakra-colors-primary-* CSS variables and
// toggling a body class, so it needs no theme rebuild and applies live.

export type AccentName = "blue" | "teal" | "purple" | "green" | "rose";
export type Surface = "minimal" | "glass";

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
};

const KEY = "alexen-appearance";

export const getAppearance = (): { accent: AccentName; surface: Surface } => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { accent: "blue", surface: "minimal" };
};

export const applyAppearance = (accent: AccentName, surface: Surface) => {
  const root = document.documentElement;
  const palette = ACCENTS[accent] || ACCENTS.blue;
  Object.entries(palette).forEach(([shade, hex]) =>
    root.style.setProperty(`--chakra-colors-primary-${shade}`, hex)
  );
  if (surface === "glass") root.classList.add("theme-glass");
  else root.classList.remove("theme-glass");
  try {
    localStorage.setItem(KEY, JSON.stringify({ accent, surface }));
  } catch {}
};

export const initAppearance = () => {
  const { accent, surface } = getAppearance();
  applyAppearance(accent, surface);
};
