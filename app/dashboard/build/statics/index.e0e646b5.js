import { i as instance, B as Browser, a as initReactI18next, b as Backend, j as joinPaths, d as dayjs, U as Ue, z as zh, r as ru, f as fa, t as tr, c as react, Q as QueryClient, e as extendTheme, $ as $fetch$1, u as useTranslation, g as useQuery, h as jsxs, M as Modal$1, k as jsx, l as ModalOverlay$1, m as ModalContent$1, n as ModalHeader$1, H as HStack, T as Text, o as Button, p as ModalCloseButton$1, q as ModalBody$1, s as TableContainer, v as Table, w as Thead, x as Tr, y as Th, A as Tbody, C as Td, D as Badge, E as chakra, F as UsersIcon, G as ChartBarIcon, S as SignalIcon, I as ChartPieIcon, J as useDisclosure, K as SimpleGrid, L as Card, N as Box, O as create, P as subscribeWithSelector, R as useShallow, V as TrashIcon, W as useToast, X as Trans, Y as ModalFooter$1, Z as Spinner, _ as MagnifyingGlassIcon, a0 as XMarkIcon, a1 as ArrowPathIcon, a2 as lodash_debounce, a3 as Grid, a4 as GridItem, a5 as InputGroup, a6 as InputLeftElement, a7 as Input$1, a8 as InputRightElement, a9 as IconButton, aa as Select, ab as classNames, ac as Link, ad as useColorMode, ae as SunIcon, af as MoonIcon, ag as ComputerDesktopIcon, ah as VStack, ai as Icon$1, aj as Tooltip, ak as Switch, al as useNavigate, am as Drawer, an as DrawerContent, ao as Slider, ap as SliderTrack, aq as SliderFilledTrack, ar as SliderThumb, as as LanguageIcon, at as Menu, au as MenuButton, av as MenuList, aw as MenuItem, ax as Fragment, ay as useLocation, az as Collapse, aA as Avatar, aB as Squares2X2Icon, aC as GlobeAltIcon, aD as ClockIcon, aE as SwatchIcon, aF as ListBulletIcon, aG as RectangleGroupIcon, aH as ShieldCheckIcon, aI as ShareIcon, aJ as ServerStackIcon, aK as Square3Stack3DIcon, aL as CpuChipIcon, aM as ArrowsRightLeftIcon, aN as LockClosedIcon, aO as Cog6ToothIcon, aP as DocumentTextIcon, aQ as LinkIcon, aR as ChevronRightIcon, aS as ChevronDoubleLeftIcon, aT as ChevronDoubleRightIcon, aU as ArrowLeftOnRectangleIcon, aV as Navigate, aW as Bars3Icon, aX as CurrencyDollarIcon, aY as SquaresPlusIcon, aZ as DocumentMinusIcon, a_ as WifiIcon, a$ as NoSymbolIcon, b0 as ExclamationCircleIcon, b1 as React, b2 as NumberInput, b3 as FormControl, b4 as FormLabel, b5 as InputLeftAddon, b6 as NumberInputStepper, b7 as NumberIncrementStepper, b8 as NumberDecrementStepper, b9 as InputRightAddon, ba as FormErrorMessage, bb as NumberInputField, bc as EllipsisVerticalIcon, bd as useFormContext, be as useCheckboxGroup, bf as Accordion, bg as useCheckbox, bh as useWatch, bi as AccordionItem, bj as AccordionButton, bk as AccordionPanel, bl as t, bm as Checkbox, bn as useBreakpointValue, bo as useRadioGroup, bp as useOutsideClick, bq as CalendarIcon, br as Tabs, bs as TabList, bt as Tab, bu as TabPanels, bv as TabPanel, bw as Ht, bx as useRadio, by as ArrowsUpDownIcon, bz as Wrap, bA as UserPlusIcon, bB as PencilIcon, bC as z, bD as useForm, bE as s, bF as FormProvider, bG as Flex, bH as Controller, bI as FormHelperText, bJ as Textarea, bK as Alert, bL as AlertIcon, bM as ArrowLongLeftIcon, bN as ArrowLongRightIcon, bO as ButtonGroup, bP as ClipboardIcon, bQ as ChevronDownIcon, bR as CheckIcon, bS as QrCodeIcon, bT as UserIcon, bU as DevicePhoneMobileIcon, bV as lib, bW as Outlet, bX as ArrowRightOnRectangleIcon, bY as AlertDescription, bZ as useRouteError, b_ as createHashRouter, b$ as RouterProvider, c0 as Timezone, c1 as LocalizedFormat, c2 as utc, c3 as RelativeTime, c4 as Duration, c5 as localStorageManager, c6 as client, c7 as ChakraProvider, c8 as QueryClientProvider } from "./vendor.0404bf65.js";
(function polyfill() {
  const relList = document.createElement("link").relList;
  if (relList && relList.supports && relList.supports("modulepreload")) {
    return;
  }
  for (const link of document.querySelectorAll('link[rel="modulepreload"]')) {
    processPreload(link);
  }
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type !== "childList") {
        continue;
      }
      for (const node of mutation.addedNodes) {
        if (node.tagName === "LINK" && node.rel === "modulepreload")
          processPreload(node);
      }
    }
  }).observe(document, { childList: true, subtree: true });
  function getFetchOpts(script) {
    const fetchOpts = {};
    if (script.integrity)
      fetchOpts.integrity = script.integrity;
    if (script.referrerpolicy)
      fetchOpts.referrerPolicy = script.referrerpolicy;
    if (script.crossorigin === "use-credentials")
      fetchOpts.credentials = "include";
    else if (script.crossorigin === "anonymous")
      fetchOpts.credentials = "omit";
    else
      fetchOpts.credentials = "same-origin";
    return fetchOpts;
  }
  function processPreload(link) {
    if (link.ep)
      return;
    link.ep = true;
    const fetchOpts = getFetchOpts(link);
    fetch(link.href, fetchOpts);
  }
})();
instance.use(Browser).use(initReactI18next).use(Backend).init(
  {
    debug: {}.NODE_ENV === "development",
    returnNull: false,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false
    },
    react: {
      useSuspense: false
    },
    load: "languageOnly",
    detection: {
      caches: ["localStorage", "sessionStorage", "cookie"]
    },
    backend: {
      loadPath: joinPaths([
        "/",
        `statics/locales/{{lng}}.json`
      ]),
      queryStringParams: { v: "muycw2xb" }
    }
  },
  function(err, t2) {
    dayjs.locale(dayjsLocale(instance.language));
  }
);
function dayjsLocale(lng) {
  const l = (lng || "en").toLowerCase();
  return l.startsWith("zh") ? "zh-cn" : l.split("-")[0];
}
instance.on("languageChanged", (lng) => {
  dayjs.locale(dayjsLocale(lng));
  document.documentElement.lang = lng;
});
Ue("zh-cn", zh);
Ue("ru", ru);
Ue("fa", fa);
Ue("tr", tr);
const KEY$1 = "alexen-chunk-reload";
const isChunkError = (e) => /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk/i.test(
  String((e == null ? void 0 : e.message) || e)
);
const reloadForUpdate = () => {
  try {
    const last = Number(sessionStorage.getItem(KEY$1) || 0);
    if (Date.now() - last < 15e3)
      return false;
    sessionStorage.setItem(KEY$1, String(Date.now()));
  } catch {
  }
  window.location.reload();
  return true;
};
const named = (loader, name) => react.exports.lazy(
  () => loader().then((m) => ({ default: m[name] })).catch((e) => {
    if (isChunkError(e) && reloadForUpdate())
      return new Promise(() => {
      });
    throw e;
  })
);
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } }
});
const updateThemeColor = (colorMode) => {
  const el = document.querySelector('meta[name="theme-color"]');
  el == null ? void 0 : el.setAttribute("content", colorMode == "dark" ? "#1A202C" : "#3B81F6");
};
const hexToRgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
};
const rgbToHex = (rgb) => "#" + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
const mix = (a, b, t2) => {
  const x = hexToRgb(a), y = hexToRgb(b);
  return rgbToHex(x.map((v, i) => v + (y[i] - v) * t2));
};
const scale = (base) => ({
  50: mix(base, "#ffffff", 0.55),
  100: mix(base, "#ffffff", 0.45),
  200: mix(base, "#ffffff", 0.33),
  300: mix(base, "#ffffff", 0.2),
  400: mix(base, "#ffffff", 0.1),
  500: base,
  600: mix(base, "#000000", 0.1),
  700: mix(base, "#000000", 0.2),
  800: mix(base, "#000000", 0.3),
  900: mix(base, "#000000", 0.4)
});
const ACCENTS = {
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
  blue: {
    50: "#9cb7f2",
    100: "#88a9ef",
    200: "#749aec",
    300: "#618ce9",
    400: "#4d7de7",
    500: "#396fe4",
    600: "#3364cd",
    700: "#2e59b6",
    800: "#284ea0",
    900: "#224389"
  },
  teal: {
    50: "#8fe3dc",
    100: "#6fdad1",
    200: "#4fd1c5",
    300: "#38c0b4",
    400: "#2fa89d",
    500: "#2b998f",
    600: "#258079",
    700: "#1f6b65",
    800: "#195650",
    900: "#13413d"
  },
  purple: {
    50: "#c3a6f0",
    100: "#b48fec",
    200: "#a479e7",
    300: "#9562e3",
    400: "#854bde",
    500: "#7639d4",
    600: "#6830bd",
    700: "#5a2aa6",
    800: "#4c238f",
    900: "#3e1d78"
  },
  green: {
    50: "#9be3ab",
    100: "#80db95",
    200: "#63d27c",
    300: "#46c964",
    400: "#36b554",
    500: "#2fa04a",
    600: "#288a3f",
    700: "#227534",
    800: "#1b5f2a",
    900: "#154a20"
  },
  rose: {
    50: "#f4a6c0",
    100: "#f08fb0",
    200: "#ec79a0",
    300: "#e76290",
    400: "#e24b80",
    500: "#d43971",
    600: "#bd3363",
    700: "#a62e56",
    800: "#8f2849",
    900: "#78233c"
  },
  amber: {
    50: "#f8d79a",
    100: "#f5c874",
    200: "#f2b84e",
    300: "#efa828",
    400: "#e2991a",
    500: "#cb8916",
    600: "#b47813",
    700: "#9d6810",
    800: "#86580d",
    900: "#6f480a"
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
  electric: scale("#2563eb"),
  magenta: scale("#db2777"),
  neonPurple: scale("#9333ea"),
  aqua: scale("#06b6d4")
};
function themed(dark, light, swatch) {
  return {
    light: `linear-gradient(160deg,${mix(light, "#ffffff", 0.45)},${light})`,
    dark: `linear-gradient(160deg,${mix(dark, "#ffffff", 0.04)},${mix(dark, "#000000", 0.35)})`,
    swatch,
    tint: {
      light: {
        "gray-50": mix(light, "#ffffff", 0.6),
        "gray-100": mix(light, "#ffffff", 0.3),
        "gray-200": light,
        border: mix(light, "#000000", 0.1),
        surface: mix(light, "#ffffff", 0.86),
        "surface-2": mix(light, "#ffffff", 0.55)
      },
      dark: {
        "gray-600": mix(dark, "#ffffff", 0.18),
        "gray-700": mix(dark, "#ffffff", 0.08),
        "gray-750": mix(dark, "#ffffff", 0.04),
        "gray-800": dark,
        "gray-900": mix(dark, "#000000", 0.3)
      }
    }
  };
}
function vivid(darkA, darkB, lightA, lightB, swatch) {
  return {
    light: `linear-gradient(135deg,${lightA},${lightB})`,
    dark: `linear-gradient(135deg,${darkA},${darkB})`,
    swatch,
    tint: {
      light: {
        "gray-50": mix(lightA, "#ffffff", 0.82),
        "gray-100": mix(lightA, "#ffffff", 0.66),
        "gray-200": mix(lightA, "#ffffff", 0.45),
        border: mix(lightA, "#ffffff", 0.3),
        surface: mix(lightA, "#ffffff", 0.9),
        "surface-2": mix(lightA, "#ffffff", 0.78)
      },
      dark: {
        "gray-600": mix(darkA, "#ffffff", 0.2),
        "gray-700": mix(darkA, "#000000", 0.2),
        "gray-750": mix(darkA, "#000000", 0.32),
        "gray-800": mix(darkA, "#000000", 0.45),
        "gray-900": mix(darkA, "#000000", 0.6)
      }
    }
  };
}
const BACKGROUNDS = {
  default: {
    light: "",
    dark: "",
    swatch: "#e2e8f0",
    tint: {
      light: {
        "gray-50": "#f5f6f9",
        "gray-100": "#eceef3",
        "gray-200": "#e1e4ec",
        border: "#e3e6ed",
        surface: "#ffffff",
        "surface-2": "#f7f8fb"
      },
      dark: {
        "gray-600": "#3a4254",
        "gray-700": "#232a38",
        "gray-750": "#1c2230",
        "gray-800": "#151a25",
        "gray-900": "#0f131b"
      }
    }
  },
  slate: {
    light: "linear-gradient(160deg,#eef2f7,#e2e8f0)",
    dark: "linear-gradient(160deg,#161b26,#0f1218)",
    swatch: "#64748b",
    tint: {
      light: {
        "gray-50": "#f4f6f9",
        "gray-100": "#e9edf2",
        "gray-200": "#dbe1e9",
        border: "#cfd6e0",
        surface: "#fbfcfd",
        "surface-2": "#f2f5f8"
      },
      dark: {
        "gray-600": "#3a4252",
        "gray-700": "#262c38",
        "gray-750": "#1f242e",
        "gray-800": "#181c24",
        "gray-900": "#111419"
      }
    }
  },
  midnight: {
    light: "linear-gradient(160deg,#e7edff,#dfe6fb)",
    dark: "linear-gradient(160deg,#0b1437,#0a0f26)",
    swatch: "#1e3a8a",
    tint: {
      light: {
        "gray-50": "#f2f5ff",
        "gray-100": "#e6ebfb",
        "gray-200": "#d5ddf5",
        border: "#c9d3ef",
        surface: "#fbfcff",
        "surface-2": "#eef2fd"
      },
      dark: {
        "gray-600": "#2b3a6b",
        "gray-700": "#18234a",
        "gray-750": "#141d3d",
        "gray-800": "#0f1631",
        "gray-900": "#0a0f24"
      }
    }
  },
  aurora: {
    light: "linear-gradient(135deg,#e0f7fa,#e8eaf6,#fce4ec)",
    dark: "linear-gradient(135deg,#0d2b2e,#141833,#2a1030)",
    swatch: "#2dd4bf",
    tint: {
      light: {
        "gray-50": "#f1fbfb",
        "gray-100": "#e3f4f4",
        "gray-200": "#cfe8ea",
        border: "#c3dfe2",
        surface: "#fbfefe",
        "surface-2": "#edf7f8"
      },
      dark: {
        "gray-600": "#2c4a52",
        "gray-700": "#1b2e38",
        "gray-750": "#17262f",
        "gray-800": "#121e26",
        "gray-900": "#0d161c"
      }
    }
  },
  sunset: {
    light: "linear-gradient(135deg,#fff1e6,#ffe3ec,#f3e8ff)",
    dark: "linear-gradient(135deg,#2a160f,#2a1020,#1a1030)",
    swatch: "#fb7185",
    tint: {
      light: {
        "gray-50": "#fff6f2",
        "gray-100": "#fdebe6",
        "gray-200": "#f6d8d3",
        border: "#efcac4",
        surface: "#fffcfb",
        "surface-2": "#fdf1ee"
      },
      dark: {
        "gray-600": "#553040",
        "gray-700": "#3a1f2c",
        "gray-750": "#301a25",
        "gray-800": "#26141e",
        "gray-900": "#1c0f16"
      }
    }
  },
  amoled: {
    light: "",
    dark: "#000000",
    swatch: "#000000",
    tint: {
      light: {},
      dark: {
        "gray-600": "#2a2a2a",
        "gray-700": "#161616",
        "gray-750": "#0e0e0e",
        "gray-800": "#000000",
        "gray-900": "#000000"
      }
    }
  },
  ocean: themed("#0b2233", "#d4ebf5", "#0e7490"),
  forest: themed("#0f2418", "#d6eedd", "#15803d"),
  wine: themed("#2a0f1a", "#f5d9e1", "#9f1239"),
  mocha: themed("#241a14", "#eee0d3", "#92400e"),
  graphite: themed("#1b1d21", "#dde0e5", "#374151"),
  nebula: themed("#1a1033", "#e3dafa", "#6d28d9"),
  dracula: themed("#21222c", "#e2e2ef", "#bd93f9"),
  nord: themed("#242933", "#dde3ec", "#5e81ac"),
  neon: vivid("#4c1d95", "#0e7490", "#a78bfa", "#67e8f9", "#8b5cf6"),
  lava: vivid("#7f1d1d", "#9a3412", "#fca5a5", "#fdba74", "#ef4444"),
  toxic: vivid("#14532d", "#3f6212", "#86efac", "#bef264", "#22c55e"),
  candy: vivid("#831843", "#6b21a8", "#f9a8d4", "#c4b5fd", "#ec4899"),
  electric: vivid("#1e3a8a", "#312e81", "#93c5fd", "#a5b4fc", "#3b82f6"),
  sunrise: vivid("#7c2d12", "#713f12", "#fdba74", "#fde047", "#f97316"),
  cyber: vivid("#701a75", "#155e75", "#f0abfc", "#67e8f9", "#d946ef"),
  lagoon: vivid("#064e3b", "#164e63", "#6ee7b7", "#7dd3fc", "#10b981"),
  mist: themed("#161b26", "#e6ebf3", "#94a3b8"),
  lilac: themed("#1b1729", "#ebe6f7", "#a78bfa"),
  peach: themed("#251a17", "#f8e9e1", "#f4a582"),
  sand: themed("#211d16", "#f1ebdf", "#d6b98c"),
  moss: themed("#141d18", "#e3eee6", "#7fb08f"),
  dusk: themed("#1a1824", "#e9e4ee", "#8b7fa8")
};
const ACCENT_CHOICES = [
  "periwinkle",
  "lavender",
  "orchid",
  "blush",
  "coral",
  "honey",
  "sage",
  "mint",
  "lagoonBlue",
  "steel"
];
const BACKGROUND_CHOICES = [
  "default",
  "mist",
  "slate",
  "midnight",
  "nord",
  "dusk",
  "lilac",
  "nebula",
  "ocean",
  "moss",
  "forest",
  "sand",
  "peach",
  "mocha",
  "aurora",
  "sunset",
  "amoled"
];
const TINT_VARS = [
  "gray-50",
  "gray-100",
  "gray-200",
  "gray-600",
  "gray-700",
  "gray-750",
  "gray-800",
  "gray-900"
];
const emptyTiers = () => ({
  light: { page: "", layer: "", item: "" },
  dark: { page: "", layer: "", item: "" }
});
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
};
const customBackground = (color) => {
  const light = luminance(color);
  const dark = light < 0.35 ? color : mix(color, "#000000", 0.78);
  const lightBase = light > 0.65 ? color : mix(color, "#ffffff", 0.78);
  return themed(dark, lightBase, color);
};
const accentPalette = (a) => a.accent === "custom" ? scale(a.customAccent) : ACCENTS[a.accent] || ACCENTS.periwinkle;
const KEY = "alexen-appearance";
const DEFAULT = {
  accent: "periwinkle",
  surface: "minimal",
  background: "default",
  animations: true,
  customAccent: "#5b7cfa",
  customBackground: "#1e293b",
  tierContrast: 1,
  tiers: emptyTiers()
};
const getAppearance = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return { ...DEFAULT, ...saved, tiers: { ...emptyTiers(), ...saved.tiers || {} } };
    }
  } catch {
  }
  return { ...DEFAULT };
};
const applyAppearance = (a) => {
  const root = document.documentElement;
  const palette = accentPalette(a);
  Object.entries(palette).forEach(
    ([shade, hex]) => root.style.setProperty(`--chakra-colors-primary-${shade}`, hex)
  );
  const bg = a.background === "custom" ? customBackground(a.customBackground) : BACKGROUNDS[a.background] || BACKGROUNDS.default;
  const dark = root.classList.contains("chakra-ui-dark") || document.body.classList.contains("chakra-ui-dark") || document.documentElement.getAttribute("data-theme") === "dark";
  const pageBg = (dark ? bg.dark : bg.light) || "";
  root.style.setProperty("--app-bg", pageBg);
  TINT_VARS.forEach((v) => root.style.removeProperty(`--chakra-colors-${v}`));
  root.style.removeProperty("--chakra-colors-light-border");
  root.style.removeProperty("--app-surface");
  root.style.removeProperty("--app-surface-2");
  ["gray-600", "gray-700", "gray-750", "gray-800", "gray-900"].forEach((v) => root.style.removeProperty(`--chakra-colors-${v}`));
  const tint = bg.tint ? dark ? bg.tint.dark : bg.tint.light : {};
  Object.entries(tint).forEach(([k, v]) => {
    if (k === "border")
      root.style.setProperty("--chakra-colors-light-border", v);
    else if (k === "surface" || k === "surface-2")
      root.style.setProperty(`--app-${k}`, v);
    else
      root.style.setProperty(`--chakra-colors-${k}`, v);
  });
  applyTiers(root, dark, tint, a);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta && dark)
    meta.setAttribute("content", root.style.getPropertyValue("--tier-0") || "#1A202C");
  root.classList.toggle("theme-glass", a.surface === "glass");
  root.classList.toggle("theme-clay", a.surface === "clay");
  root.classList.toggle("theme-animated", a.animations);
  root.classList.toggle("has-bg", !!pageBg);
  try {
    localStorage.setItem(KEY, JSON.stringify(a));
  } catch {
  }
};
function applyTiers(root, dark, tint, a) {
  var _a, _b;
  const set = (k2, v) => root.style.setProperty(k2, v);
  const k = Math.min(2.5, Math.max(0.4, a.tierContrast || 1));
  const own = (dark ? (_a = a.tiers) == null ? void 0 : _a.dark : (_b = a.tiers) == null ? void 0 : _b.light) || { page: "", layer: "", item: "" };
  if (dark) {
    const base = own.layer || tint["gray-800"] || "#151a25";
    const t0 = own.page || mix(base, "#000000", Math.min(0.9, 0.3 * k));
    const t1 = own.layer || mix(base, "#ffffff", 0.05 * k);
    const item = own.item || mix(t1, "#ffffff", 0.095 * k);
    const t2 = mix(t1, item, 0.5);
    set("--tier-0", t0);
    set("--tier-1", t1);
    set("--tier-2", t2);
    set("--tier-item", item);
    set("--tier-item-hover", mix(item, "#ffffff", 0.07));
    set("--tier-line", mix(item, "#ffffff", 0.03));
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
    set("--tier-0", t0);
    set("--tier-1", t1);
    set("--tier-2", t2);
    set("--tier-item", item);
    set("--tier-item-hover", mix(item, "#000000", 0.04));
    set("--tier-line", mix(item, "#000000", 0.07));
    set("--app-surface", t1);
    set("--app-surface-2", t2);
  }
}
const initAppearance = () => applyAppearance(getAppearance());
const PRESETS = [
  {
    id: "amoled",
    mode: "dark",
    surface: "minimal",
    accent: "periwinkle",
    background: "amoled",
    tierContrast: 1.3,
    tiers: { page: "#000000", layer: "#0c0d10", item: "#1b1d23" },
    look: ["#000000", "#0c0d10", "#1b1d23"]
  },
  {
    id: "amoledNeon",
    mode: "dark",
    surface: "minimal",
    accent: "mint",
    background: "amoled",
    tierContrast: 1.3,
    tiers: { page: "#000000", layer: "#08100f", item: "#122422" },
    look: ["#000000", "#08100f", "#122422"]
  },
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
  { id: "clayPeach", mode: "light", surface: "clay", accent: "blush", background: "peach", tierContrast: 1, look: ["#f3e0d6", "#f8e9e1", "#f1ddd2"] }
];
const presetAppearance = (p, current) => {
  const tiers = emptyTiers();
  if (p.tiers)
    tiers[p.mode] = { page: "", layer: "", item: "", ...p.tiers };
  return { ...current, surface: p.surface, accent: p.accent, background: p.background, tierContrast: p.tierContrast, tiers };
};
const theme = extendTheme({
  radii: { sm: "6px", md: "10px", lg: "12px", xl: "16px" },
  shadows: { outline: "0 0 0 2px var(--chakra-colors-primary-200)" },
  fonts: {
    body: `Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Fira Sans,Droid Sans,Helvetica Neue,sans-serif`
  },
  colors: {
    "light-border": "#e6e8ec",
    primary: {
      50: "#b3c2fd",
      100: "#a6b8fc",
      200: "#96aafc",
      300: "#7c96fb",
      400: "#6b89fa",
      500: "#5b7cfa",
      600: "#5270e1",
      700: "#4963c8",
      800: "#4057af",
      900: "#374a96"
    },
    gray: {
      750: "#222C3B"
    }
  },
  components: {
    Button: {
      baseStyle: { borderRadius: "12px", fontWeight: "semibold", transitionProperty: "background-color, box-shadow, transform, color", transitionDuration: ".15s" },
      variants: {
        solid: (p) => p.colorScheme === "primary" ? {
          bg: "primary.500",
          color: "white",
          boxShadow: "0 4px 14px color-mix(in srgb, var(--chakra-colors-primary-500) 32%, transparent), inset 0 1px 0 rgba(255,255,255,.18)",
          _hover: { bg: "primary.600", _disabled: { bg: "primary.500" } },
          _active: { bg: "primary.700", transform: "translateY(1px)" },
          _dark: { bg: "primary.500", color: "white", _hover: { bg: "primary.400" } }
        } : p.colorScheme === "gray" ? { bg: "blackAlpha.50", _hover: { bg: "blackAlpha.100" }, _dark: { bg: "whiteAlpha.100", _hover: { bg: "whiteAlpha.200" } } } : {},
        outline: (p) => ({
          bg: "var(--tier-item)",
          borderColor: p.colorScheme === "primary" ? "color-mix(in srgb, var(--chakra-colors-primary-500) 45%, var(--tier-line))" : "var(--tier-line)",
          _hover: { bg: "var(--tier-item-hover)" },
          _dark: {
            bg: "var(--tier-item)",
            borderColor: p.colorScheme === "primary" ? "color-mix(in srgb, var(--chakra-colors-primary-400) 45%, var(--tier-line))" : "var(--tier-line)",
            _hover: { bg: "var(--tier-item-hover)" }
          }
        }),
        ghost: () => ({ _hover: { bg: "blackAlpha.50" }, _dark: { _hover: { bg: "whiteAlpha.100" } } })
      }
    },
    Tooltip: {
      baseStyle: { borderRadius: "8px", px: 2.5, py: 1.5, fontSize: "xs", fontWeight: "medium", bg: "gray.800", color: "white", boxShadow: "0 6px 20px rgba(0,0,0,.18)" }
    },
    Badge: {
      baseStyle: { borderRadius: "full", px: 2, textTransform: "none", fontWeight: "semibold" },
      variants: {
        subtle: (p) => ({
          bg: `color-mix(in srgb, var(--chakra-colors-${p.colorScheme}-500) 14%, transparent)`,
          color: `${p.colorScheme}.600`,
          _dark: { bg: `color-mix(in srgb, var(--chakra-colors-${p.colorScheme}-400) 20%, transparent)`, color: `${p.colorScheme}.200` }
        })
      }
    },
    Tabs: {
      variants: {
        "soft-rounded": {
          tab: {
            borderRadius: "10px",
            fontWeight: "medium",
            bg: "var(--tier-item)",
            _hover: { bg: "var(--tier-item-hover)" },
            _selected: {
              bg: "color-mix(in srgb, var(--chakra-colors-primary-500) 14%, transparent)",
              color: "primary.600",
              _dark: { bg: "color-mix(in srgb, var(--chakra-colors-primary-400) 20%, transparent)", color: "primary.200" }
            }
          }
        }
      }
    },
    Switch: {
      baseStyle: {
        track: { bg: "blackAlpha.300", _dark: { bg: "whiteAlpha.300" }, _checked: { bg: "primary.500", _dark: { bg: "primary.500" } } }
      }
    },
    Popover: { baseStyle: { content: { borderRadius: "14px", boxShadow: "0 12px 40px rgba(16,24,40,.14)", borderColor: "blackAlpha.100", _dark: { borderColor: "whiteAlpha.100" } } } },
    Textarea: {
      variants: {
        outline: {
          borderRadius: "12px",
          bg: "var(--alexen-field)",
          borderColor: "var(--alexen-field-border)",
          _hover: { borderColor: "var(--alexen-field-hover)" },
          _focusVisible: { borderColor: "primary.400", boxShadow: "0 0 0 3px color-mix(in srgb, var(--chakra-colors-primary-500) 18%, transparent)" },
          _dark: { borderColor: "var(--alexen-field-border)", bg: "var(--alexen-field)" }
        }
      }
    },
    NumberInput: {
      variants: {
        outline: {
          field: {
            bg: "var(--alexen-field)",
            borderColor: "var(--alexen-field-border)",
            _hover: { borderColor: "var(--alexen-field-hover)" },
            _focusVisible: { borderColor: "primary.400", boxShadow: "0 0 0 3px color-mix(in srgb, var(--chakra-colors-primary-500) 18%, transparent)" },
            _dark: { borderColor: "var(--alexen-field-border)", bg: "var(--alexen-field)" }
          }
        }
      }
    },
    Card: { baseStyle: { container: { borderRadius: "14px" } } },
    Modal: {
      baseStyle: {
        dialog: { borderRadius: "22px", boxShadow: "0 24px 64px rgba(16,24,40,.18)", _dark: { boxShadow: "0 24px 64px rgba(0,0,0,.5)" } },
        overlay: { bg: "blackAlpha.400" }
      }
    },
    Menu: {
      baseStyle: {
        list: { borderRadius: "14px", p: 1.5, boxShadow: "0 12px 40px rgba(16,24,40,.14)", borderColor: "blackAlpha.100", _dark: { borderColor: "whiteAlpha.100", boxShadow: "0 12px 40px rgba(0,0,0,.45)" } },
        item: { borderRadius: "10px", _hover: { bg: "blackAlpha.50" }, _focus: { bg: "blackAlpha.50" }, _dark: { _hover: { bg: "whiteAlpha.100" }, _focus: { bg: "whiteAlpha.100" } } }
      }
    },
    Alert: {
      baseStyle: {
        container: {
          borderRadius: "8px",
          fontSize: "sm"
        }
      }
    },
    Select: {
      baseStyle: { field: { borderRadius: "10px" } },
      variants: {
        outline: {
          field: {
            bg: "var(--alexen-field)",
            borderColor: "var(--alexen-field-border)",
            _hover: { borderColor: "var(--alexen-field-hover)" },
            _focusVisible: { borderColor: "primary.400", boxShadow: "0 0 0 3px color-mix(in srgb, var(--chakra-colors-primary-500) 18%, transparent)" },
            _dark: { borderColor: "var(--alexen-field-border)", bg: "var(--alexen-field)" }
          }
        }
      }
    },
    FormHelperText: {
      baseStyle: {
        fontSize: "xs"
      }
    },
    FormLabel: {
      baseStyle: {
        fontSize: "sm",
        fontWeight: "medium",
        mb: "1",
        _dark: { color: "gray.300" }
      }
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: "var(--alexen-field)",
            borderColor: "var(--alexen-field-border)",
            _hover: { borderColor: "var(--alexen-field-hover)" },
            _dark: { bg: "var(--alexen-field)" }
          }
        }
      },
      baseStyle: {
        addon: {
          _dark: {
            borderColor: "gray.600",
            _placeholder: {
              color: "gray.500"
            }
          }
        },
        field: {
          borderRadius: "10px",
          _focusVisible: {
            boxShadow: "0 0 0 3px color-mix(in srgb, var(--chakra-colors-primary-500) 18%, transparent)",
            borderColor: "primary.400",
            outline: "none"
          },
          _dark: {
            borderColor: "var(--alexen-field-border)",
            _disabled: {
              color: "gray.400",
              borderColor: "gray.500"
            },
            _placeholder: {
              color: "gray.500"
            }
          }
        }
      }
    },
    Table: {
      baseStyle: {
        table: {
          borderCollapse: "separate",
          borderSpacing: 0
        },
        thead: {
          borderBottomColor: "light-border"
        },
        th: {
          background: "var(--app-surface-2)",
          borderColor: "light-border !important",
          borderBottomColor: "light-border !important",
          borderTop: "1px solid ",
          borderTopColor: "light-border !important",
          _first: {
            borderLeft: "1px solid",
            borderColor: "light-border !important"
          },
          _last: {
            borderRight: "1px solid",
            borderColor: "light-border !important"
          },
          _dark: {
            borderColor: "var(--alexen-line) !important",
            background: "gray.750"
          }
        },
        td: {
          transition: "background-color .12s ease-out",
          borderColor: "light-border",
          borderBottomColor: "light-border !important",
          _first: {
            borderLeft: "1px solid",
            borderColor: "light-border",
            _dark: {
              borderColor: "var(--alexen-line)"
            }
          },
          _last: {
            borderRight: "1px solid",
            borderColor: "light-border",
            _dark: {
              borderColor: "var(--alexen-line)"
            }
          },
          _dark: {
            borderColor: "var(--alexen-line)",
            borderBottomColor: "var(--alexen-line) !important"
          }
        },
        tr: {
          "&.interactive": {
            cursor: "pointer",
            _hover: {
              "& > td": {
                bg: "gray.200"
              },
              _dark: {
                "& > td": {
                  bg: "gray.750"
                }
              }
            }
          },
          _last: {
            "& > td": {
              _first: {
                borderBottomLeftRadius: "14px"
              },
              _last: {
                borderBottomRightRadius: "14px"
              }
            }
          }
        }
      }
    }
  }
});
const reactDatepicker = "";
const skeleton = "";
const getAuthToken = () => {
  return localStorage.getItem("token");
};
const setAuthToken = (token) => {
  localStorage.setItem("token", token);
};
const removeAuthToken = () => {
  localStorage.removeItem("token");
};
const $fetch = $fetch$1.create({
  baseURL: "/api/"
});
const fetcher = (url, ops = {}) => {
  const token = getAuthToken();
  if (token) {
    ops["headers"] = {
      ...(ops == null ? void 0 : ops.headers) || {},
      Authorization: `Bearer ${getAuthToken()}`
    };
  }
  return $fetch(url, ops);
};
const fetch$1 = fetcher;
const scriptRel = "modulepreload";
const assetsURL = function(dep) {
  return "/" + dep;
};
const seen = {};
const __vitePreload = function preload(baseModule, deps, importerUrl) {
  if (!deps || deps.length === 0) {
    return baseModule();
  }
  const links = document.getElementsByTagName("link");
  return Promise.all(deps.map((dep) => {
    dep = assetsURL(dep);
    if (dep in seen)
      return;
    seen[dep] = true;
    const isCss = dep.endsWith(".css");
    const cssSelector = isCss ? '[rel="stylesheet"]' : "";
    const isBaseRelative = !!importerUrl;
    if (isBaseRelative) {
      for (let i = links.length - 1; i >= 0; i--) {
        const link2 = links[i];
        if (link2.href === dep && (!isCss || link2.rel === "stylesheet")) {
          return;
        }
      }
    } else if (document.querySelector(`link[href="${dep}"]${cssSelector}`)) {
      return;
    }
    const link = document.createElement("link");
    link.rel = isCss ? "stylesheet" : scriptRel;
    if (!isCss) {
      link.as = "script";
      link.crossOrigin = "";
    }
    link.href = dep;
    document.head.appendChild(link);
    if (isCss) {
      return new Promise((res, rej) => {
        link.addEventListener("load", res);
        link.addEventListener("error", () => rej(new Error(`Unable to preload CSS for ${dep}`)));
      });
    }
  })).then(() => baseModule());
};
function formatBytes(bytes, decimals = 2, asArray = false) {
  if (!+bytes)
    return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  if (!asArray)
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  else
    return [parseFloat((bytes / Math.pow(k, i)).toFixed(dm)), sizes[i]];
}
const numberWithCommas = (x) => {
  if (x !== null)
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};
const OnlineUsersModal = ({
  isOpen,
  onClose
}) => {
  var _a;
  const {
    t: t2
  } = useTranslation();
  const [sort, setSort] = react.exports.useState("ip");
  const {
    data
  } = useQuery({
    queryKey: ["online-modal", sort],
    queryFn: () => fetch$1(`/online?sort=${sort}&limit=100`),
    enabled: isOpen,
    refetchInterval: isOpen ? 5e3 : false
  });
  const users = (_a = data == null ? void 0 : data.users) != null ? _a : [];
  const openUser = (username) => {
    fetch$1(`/user/${username}`).then((user) => {
      onClose();
      useDashboard.getState().onEditingUser(user);
    });
  };
  return /* @__PURE__ */ jsxs(Modal$1, {
    isOpen,
    onClose,
    size: "lg",
    children: [/* @__PURE__ */ jsx(ModalOverlay$1, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent$1, {
      mx: "3",
      children: [/* @__PURE__ */ jsx(ModalHeader$1, {
        pt: 6,
        children: /* @__PURE__ */ jsxs(HStack, {
          justifyContent: "space-between",
          pr: 8,
          children: [/* @__PURE__ */ jsx(Text, {
            fontWeight: "semibold",
            fontSize: "lg",
            children: t2("online.title")
          }), /* @__PURE__ */ jsxs(HStack, {
            spacing: 1,
            children: [/* @__PURE__ */ jsx(Button, {
              size: "xs",
              variant: sort === "ip" ? "solid" : "ghost",
              onClick: () => setSort("ip"),
              children: t2("online.sortByIp")
            }), /* @__PURE__ */ jsx(Button, {
              size: "xs",
              variant: sort === "devices" ? "solid" : "ghost",
              onClick: () => setSort("devices"),
              children: t2("online.sortByDevice")
            })]
          })]
        })
      }), /* @__PURE__ */ jsx(ModalCloseButton$1, {
        mt: 3
      }), /* @__PURE__ */ jsx(ModalBody$1, {
        pb: 6,
        children: users.length === 0 ? /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          color: "gray.500",
          children: t2("online.empty")
        }) : /* @__PURE__ */ jsx(TableContainer, {
          children: /* @__PURE__ */ jsxs(Table, {
            size: "sm",
            children: [/* @__PURE__ */ jsx(Thead, {
              children: /* @__PURE__ */ jsxs(Tr, {
                children: [/* @__PURE__ */ jsx(Th, {
                  children: t2("username")
                }), /* @__PURE__ */ jsx(Th, {
                  children: t2("online.admin")
                }), /* @__PURE__ */ jsx(Th, {
                  isNumeric: true,
                  children: t2("online.ips")
                }), /* @__PURE__ */ jsx(Th, {
                  isNumeric: true,
                  children: t2("online.devices")
                })]
              })
            }), /* @__PURE__ */ jsx(Tbody, {
              children: users.map((user) => {
                var _a2;
                return /* @__PURE__ */ jsxs(Tr, {
                  cursor: "pointer",
                  _hover: {
                    bg: "gray.50",
                    _dark: {
                      bg: "gray.700"
                    }
                  },
                  onClick: () => openUser(user.username),
                  children: [/* @__PURE__ */ jsx(Td, {
                    children: user.username
                  }), /* @__PURE__ */ jsx(Td, {
                    children: (_a2 = user.admin) != null ? _a2 : "-"
                  }), /* @__PURE__ */ jsx(Td, {
                    isNumeric: true,
                    children: /* @__PURE__ */ jsx(Badge, {
                      colorScheme: user.blocked_ips > 0 ? "red" : user.ip_count > 1 ? "orange" : "green",
                      children: user.ip_count
                    })
                  }), /* @__PURE__ */ jsx(Td, {
                    isNumeric: true,
                    children: user.device_count
                  })]
                }, user.username);
              })
            })]
          })
        })
      })]
    })]
  });
};
const TotalUsersIcon = chakra(UsersIcon, {
  baseStyle: {
    w: 5,
    h: 5,
    position: "relative",
    zIndex: "2"
  }
});
const NetworkIcon = chakra(ChartBarIcon, {
  baseStyle: {
    w: 5,
    h: 5,
    position: "relative",
    zIndex: "2"
  }
});
const OnlineIcon = chakra(SignalIcon, {
  baseStyle: {
    w: 5,
    h: 5,
    position: "relative",
    zIndex: "2"
  }
});
const MemoryIcon = chakra(ChartPieIcon, {
  baseStyle: {
    w: 5,
    h: 5,
    position: "relative",
    zIndex: "2"
  }
});
const StatisticCard = ({
  title,
  content,
  icon,
  onClick
}) => {
  return /* @__PURE__ */ jsxs(Card, {
    onClick,
    cursor: onClick ? "pointer" : void 0,
    p: {
      base: 3,
      md: 5
    },
    borderWidth: "1px",
    borderColor: "blackAlpha.50",
    bg: "var(--app-surface)",
    _dark: {
      borderColor: "var(--alexen-line)",
      bg: "gray.750"
    },
    borderStyle: "solid",
    boxShadow: "var(--alexen-shadow)",
    borderRadius: "18px",
    width: "full",
    display: "flex",
    justifyContent: "space-between",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: {
      base: 1,
      md: 3
    },
    minW: 0,
    children: [/* @__PURE__ */ jsxs(HStack, {
      alignItems: "center",
      columnGap: {
        base: 3,
        md: 4
      },
      minW: 0,
      children: [/* @__PURE__ */ jsx(Box, {
        p: "2",
        position: "relative",
        borderRadius: "14px",
        color: "primary.500",
        bg: "color-mix(in srgb, var(--chakra-colors-primary-500) 13%, transparent)",
        _dark: {
          color: "primary.300",
          bg: "color-mix(in srgb, var(--chakra-colors-primary-400) 18%, transparent)"
        },
        children: icon
      }), /* @__PURE__ */ jsx(Text, {
        color: "gray.600",
        _dark: {
          color: "gray.300"
        },
        fontWeight: "medium",
        textTransform: "capitalize",
        fontSize: {
          base: "xs",
          md: "sm"
        },
        isTruncated: true,
        children: title
      })]
    }), /* @__PURE__ */ jsx(Box, {
      fontSize: {
        base: "xl",
        md: "2xl",
        xl: "3xl"
      },
      fontWeight: "semibold",
      lineHeight: "short",
      whiteSpace: "nowrap",
      children: content
    })]
  });
};
const StatisticsQueryKey = "statistics-query-key";
const Statistics = (props) => {
  const {
    version
  } = useDashboardPick("version");
  const {
    data: systemData
  } = useQuery({
    queryKey: StatisticsQueryKey,
    queryFn: () => fetch$1("/system"),
    refetchInterval: 1e4,
    onSuccess: ({
      version: currentVersion
    }) => {
      if (version !== currentVersion)
        useDashboard.setState({
          version: currentVersion
        });
    }
  });
  const {
    data: onlineData
  } = useQuery({
    queryKey: "online-query-key",
    queryFn: () => fetch$1("/online"),
    refetchInterval: 1e4
  });
  const onlineModal = useDisclosure();
  const {
    t: t2
  } = useTranslation();
  return /* @__PURE__ */ jsxs(SimpleGrid, {
    columns: {
      base: 2,
      lg: 4
    },
    spacing: {
      base: 2,
      md: 4
    },
    ...props,
    children: [/* @__PURE__ */ jsx(StatisticCard, {
      title: t2("activeUsers"),
      content: systemData && /* @__PURE__ */ jsxs(HStack, {
        alignItems: "flex-end",
        spacing: 1,
        flexWrap: "wrap",
        children: [/* @__PURE__ */ jsx(Text, {
          children: numberWithCommas(systemData.users_active)
        }), /* @__PURE__ */ jsxs(Text, {
          fontWeight: "normal",
          fontSize: {
            base: "xs",
            md: "lg"
          },
          as: "span",
          display: "inline-block",
          pb: {
            base: "3px",
            md: "5px"
          },
          children: ["/ ", numberWithCommas(systemData.total_user)]
        })]
      }),
      icon: /* @__PURE__ */ jsx(TotalUsersIcon, {})
    }), /* @__PURE__ */ jsx(StatisticCard, {
      title: t2("dataUsage"),
      content: systemData && /* @__PURE__ */ jsxs(HStack, {
        alignItems: "flex-end",
        spacing: 1,
        flexWrap: "wrap",
        children: [/* @__PURE__ */ jsx(Text, {
          children: formatBytes(systemData.incoming_bandwidth + systemData.outgoing_bandwidth)
        }), systemData.traffic_limit ? /* @__PURE__ */ jsxs(Text, {
          fontWeight: "normal",
          fontSize: {
            base: "xs",
            md: "lg"
          },
          as: "span",
          display: "inline-block",
          pb: {
            base: "3px",
            md: "5px"
          },
          children: ["/ ", formatBytes(systemData.traffic_limit)]
        }) : null]
      }),
      icon: /* @__PURE__ */ jsx(NetworkIcon, {})
    }), /* @__PURE__ */ jsx(StatisticCard, {
      title: t2("online.title"),
      onClick: onlineModal.onOpen,
      content: onlineData && /* @__PURE__ */ jsx(HStack, {
        alignItems: "flex-end",
        spacing: 1,
        flexWrap: "wrap",
        children: /* @__PURE__ */ jsx(Text, {
          children: numberWithCommas(onlineData.online_users)
        })
      }),
      icon: /* @__PURE__ */ jsx(OnlineIcon, {})
    }), /* @__PURE__ */ jsx(StatisticCard, {
      title: t2("memoryUsage"),
      content: systemData && /* @__PURE__ */ jsxs(HStack, {
        alignItems: "flex-end",
        spacing: 1,
        flexWrap: "wrap",
        children: [/* @__PURE__ */ jsx(Text, {
          children: formatBytes(systemData.mem_used, 1, true)[0]
        }), /* @__PURE__ */ jsxs(Text, {
          fontWeight: "normal",
          fontSize: {
            base: "xs",
            md: "lg"
          },
          as: "span",
          display: "inline-block",
          pb: {
            base: "3px",
            md: "5px"
          },
          children: [formatBytes(systemData.mem_used, 1, true)[1], " /", " ", formatBytes(systemData.mem_total, 1)]
        })]
      }),
      icon: /* @__PURE__ */ jsx(MemoryIcon, {})
    }), /* @__PURE__ */ jsx(OnlineUsersModal, {
      isOpen: onlineModal.isOpen,
      onClose: onlineModal.onClose
    })]
  });
};
const NUM_USERS_PER_PAGE_LOCAL_STORAGE_KEY = "marzban-num-users-per-page";
const NUM_USERS_PER_PAGE_DEFAULT = 10;
const getUsersPerPageLimitSize = () => {
  const numUsersPerPage = localStorage.getItem(NUM_USERS_PER_PAGE_LOCAL_STORAGE_KEY) || NUM_USERS_PER_PAGE_DEFAULT.toString();
  return parseInt(numUsersPerPage) || NUM_USERS_PER_PAGE_DEFAULT;
};
const setUsersPerPageLimitSize = (value) => {
  return localStorage.setItem(NUM_USERS_PER_PAGE_LOCAL_STORAGE_KEY, value);
};
const fetchUsers = (query) => {
  for (const key in query) {
    if (!query[key])
      delete query[key];
  }
  useDashboard.setState({
    loading: true
  });
  return fetch$1("/users", {
    query
  }).then((users) => {
    useDashboard.setState({
      users
    });
    return users;
  }).finally(() => {
    useDashboard.setState({
      loading: false
    });
  });
};
const fetchInbounds = () => {
  return fetch$1("/inbounds").then((inbounds) => {
    useDashboard.setState({
      inbounds: new Map(Object.entries(inbounds))
    });
  }).finally(() => {
    useDashboard.setState({
      loading: false
    });
  });
};
const useDashboard = create(subscribeWithSelector((set, get) => ({
  version: null,
  editingUser: null,
  deletingUser: null,
  isCreatingNewUser: false,
  QRcodeLinks: null,
  subscribeUrl: null,
  users: {
    users: [],
    total: 0
  },
  loading: true,
  isResetingAllUsage: false,
  isEditingHosts: false,
  isEditingNodes: false,
  isManagingAdmins: false,
  isShowingStats: false,
  isManagingGroups: false,
  isEditingSubSettings: false,
  isShowingNodesUsage: false,
  resetUsageUser: null,
  revokeSubscriptionUser: null,
  filters: {
    username: "",
    limit: getUsersPerPageLimitSize(),
    sort: "-created_at"
  },
  inbounds: /* @__PURE__ */ new Map(),
  isEditingCore: false,
  refetchUsers: () => {
    fetchUsers(get().filters);
  },
  resetAllUsage: () => {
    return fetch$1(`/users/reset`, {
      method: "POST"
    }).then(() => {
      get().onResetAllUsage(false);
      get().refetchUsers();
    });
  },
  onResetAllUsage: (isResetingAllUsage) => set({
    isResetingAllUsage
  }),
  onCreateUser: (isCreatingNewUser) => set({
    isCreatingNewUser
  }),
  onEditingUser: (editingUser) => {
    set({
      editingUser
    });
  },
  onDeletingUser: (deletingUser) => {
    set({
      deletingUser
    });
  },
  onFilterChange: (filters) => {
    set({
      filters: {
        ...get().filters,
        ...filters
      }
    });
    get().refetchUsers();
  },
  setQRCode: (QRcodeLinks) => {
    set({
      QRcodeLinks
    });
  },
  deleteUser: (user) => {
    set({
      editingUser: null
    });
    return fetch$1(`/user/${user.username}`, {
      method: "DELETE"
    }).then(() => {
      set({
        deletingUser: null
      });
      get().refetchUsers();
      queryClient.invalidateQueries(StatisticsQueryKey);
    });
  },
  createUser: (body) => {
    return fetch$1(`/user`, {
      method: "POST",
      body
    }).then(() => {
      set({
        editingUser: null
      });
      get().refetchUsers();
      queryClient.invalidateQueries(StatisticsQueryKey);
    });
  },
  editUser: (body) => {
    return fetch$1(`/user/${body.username}`, {
      method: "PUT",
      body
    }).then(() => {
      get().onEditingUser(null);
      get().refetchUsers();
    });
  },
  fetchUserUsage: (body, query) => {
    for (const key in query) {
      if (!query[key])
        delete query[key];
    }
    return fetch$1(`/user/${body.username}/usage`, {
      method: "GET",
      query
    });
  },
  fetchUserInboundUsage: (body) => {
    return fetch$1(`/user/${body.username}/inbound-usage`, {
      method: "GET"
    });
  },
  onEditingHosts: (isEditingHosts) => {
    set({
      isEditingHosts
    });
  },
  onEditingNodes: (isEditingNodes) => {
    set({
      isEditingNodes
    });
  },
  onManagingAdmins: (isManagingAdmins) => {
    set({
      isManagingAdmins
    });
  },
  onShowingStats: (isShowingStats) => {
    set({
      isShowingStats
    });
  },
  onManagingGroups: (isManagingGroups) => {
    set({
      isManagingGroups
    });
  },
  onEditingSubSettings: (isEditingSubSettings) => {
    set({
      isEditingSubSettings
    });
  },
  onShowingNodesUsage: (isShowingNodesUsage) => {
    set({
      isShowingNodesUsage
    });
  },
  setSubLink: (subscribeUrl) => {
    set({
      subscribeUrl
    });
  },
  resetDataUsage: (user) => {
    return fetch$1(`/user/${user.username}/reset`, {
      method: "POST"
    }).then(() => {
      set({
        resetUsageUser: null
      });
      get().refetchUsers();
    });
  },
  revokeSubscription: (user) => {
    return fetch$1(`/user/${user.username}/revoke_sub`, {
      method: "POST"
    }).then((user2) => {
      set({
        revokeSubscriptionUser: null,
        editingUser: user2
      });
      get().refetchUsers();
    });
  }
})));
const useDashboardPick = (...keys) => useDashboard(useShallow((s2) => {
  const out = {};
  keys.forEach((k) => out[k] = s2[k]);
  return out;
}));
const Icon = ({
  children,
  color
}) => {
  const c = color === "primary" ? "primary" : color;
  return /* @__PURE__ */ jsx(Box, {
    w: "40px",
    h: "40px",
    flexShrink: 0,
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: `${c}.500`,
    sx: {
      background: `color-mix(in srgb, var(--chakra-colors-${c}-500) 13%, transparent)`
    },
    _dark: {
      color: `${c}.300`
    },
    children
  });
};
const DeleteIcon$1 = chakra(TrashIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const DeleteUserModal = () => {
  const [loading, setLoading] = react.exports.useState(false);
  const {
    deletingUser: user,
    onDeletingUser,
    deleteUser
  } = useDashboardPick("deletingUser", "onDeletingUser", "deleteUser");
  const {
    t: t2
  } = useTranslation();
  const toast = useToast();
  const onClose = () => {
    onDeletingUser(null);
  };
  const onDelete = () => {
    if (user) {
      setLoading(true);
      deleteUser(user).then(() => {
        toast({
          title: t2("deleteUser.deleteSuccess", {
            username: user.username
          }),
          status: "success",
          isClosable: true,
          position: "top",
          duration: 3e3
        });
      }).then(onClose).finally(setLoading.bind(null, false));
    }
  };
  return /* @__PURE__ */ jsxs(Modal$1, {
    isCentered: true,
    isOpen: !!user,
    onClose,
    size: "sm",
    children: [/* @__PURE__ */ jsx(ModalOverlay$1, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent$1, {
      mx: "3",
      children: [/* @__PURE__ */ jsx(ModalHeader$1, {
        pt: 6,
        children: /* @__PURE__ */ jsx(Icon, {
          color: "red",
          children: /* @__PURE__ */ jsx(DeleteIcon$1, {})
        })
      }), /* @__PURE__ */ jsx(ModalCloseButton$1, {
        mt: 3
      }), /* @__PURE__ */ jsxs(ModalBody$1, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontWeight: "semibold",
          fontSize: "lg",
          children: t2("deleteUser.title")
        }), user && /* @__PURE__ */ jsx(Text, {
          mt: 1,
          fontSize: "sm",
          _dark: {
            color: "gray.400"
          },
          color: "gray.600",
          children: /* @__PURE__ */ jsx(Trans, {
            components: {
              b: /* @__PURE__ */ jsx("b", {})
            },
            children: t2("deleteUser.prompt", {
              username: user.username
            })
          })
        })]
      }), /* @__PURE__ */ jsxs(ModalFooter$1, {
        display: "flex",
        children: [/* @__PURE__ */ jsx(Button, {
          size: "sm",
          onClick: onClose,
          mr: 3,
          w: "full",
          variant: "outline",
          children: t2("cancel")
        }), /* @__PURE__ */ jsx(Button, {
          size: "sm",
          w: "full",
          colorScheme: "red",
          onClick: onDelete,
          leftIcon: loading ? /* @__PURE__ */ jsx(Spinner, {
            size: "xs"
          }) : void 0,
          children: t2("delete")
        })]
      })]
    })]
  });
};
const iconProps$3 = {
  baseStyle: {
    w: 4,
    h: 4
  }
};
const SearchIcon = chakra(MagnifyingGlassIcon, iconProps$3);
const ClearIcon$1 = chakra(XMarkIcon, iconProps$3);
const ReloadIcon = chakra(ArrowPathIcon, iconProps$3);
const setSearchField = lodash_debounce((search) => {
  useDashboard.getState().onFilterChange({
    ...useDashboard.getState().filters,
    offset: 0,
    search
  });
}, 300);
const Filters = ({
  ...props
}) => {
  const {
    loading,
    filters,
    onFilterChange,
    refetchUsers,
    onCreateUser
  } = useDashboardPick("loading", "filters", "onFilterChange", "refetchUsers", "onCreateUser");
  const {
    t: t2
  } = useTranslation();
  const [search, setSearch] = react.exports.useState("");
  const onChange = (e) => {
    setSearch(e.target.value);
    setSearchField(e.target.value);
  };
  const clear = () => {
    setSearch("");
    onFilterChange({
      ...filters,
      offset: 0,
      search: ""
    });
  };
  return /* @__PURE__ */ jsxs(Grid, {
    id: "filters",
    templateColumns: {
      lg: "repeat(3, 1fr)",
      md: "repeat(4, 1fr)",
      base: "repeat(1, 1fr)"
    },
    position: "relative",
    rowGap: {
      base: 2,
      md: 4
    },
    gap: {
      lg: 4,
      base: 0
    },
    py: {
      base: 2,
      md: 4
    },
    zIndex: "docked",
    ...props,
    children: [/* @__PURE__ */ jsx(GridItem, {
      colSpan: {
        base: 1,
        md: 2,
        lg: 1
      },
      order: {
        base: 2,
        md: 1
      },
      children: /* @__PURE__ */ jsxs(InputGroup, {
        children: [/* @__PURE__ */ jsx(InputLeftElement, {
          pointerEvents: "none",
          children: /* @__PURE__ */ jsx(SearchIcon, {})
        }), /* @__PURE__ */ jsx(Input$1, {
          placeholder: t2("search"),
          value: search,
          borderColor: "light-border",
          onChange
        }), /* @__PURE__ */ jsxs(InputRightElement, {
          children: [loading && /* @__PURE__ */ jsx(Spinner, {
            size: "xs"
          }), filters.search && filters.search.length > 0 && /* @__PURE__ */ jsx(IconButton, {
            onClick: clear,
            "aria-label": "clear",
            size: "xs",
            variant: "ghost",
            children: /* @__PURE__ */ jsx(ClearIcon$1, {})
          })]
        })]
      })
    }), /* @__PURE__ */ jsx(GridItem, {
      colSpan: 2,
      order: {
        base: 1,
        md: 2
      },
      children: /* @__PURE__ */ jsxs(HStack, {
        justifyContent: "flex-end",
        alignItems: "center",
        h: "full",
        children: [/* @__PURE__ */ jsxs(Select, {
          size: "sm",
          maxW: {
            base: "none",
            md: "190px"
          },
          flex: {
            base: 1,
            md: "initial"
          },
          minW: 0,
          borderColor: "light-border",
          value: filters.sort || "-created_at",
          onChange: (e) => onFilterChange({
            sort: e.target.value,
            offset: 0
          }),
          children: [/* @__PURE__ */ jsx("option", {
            value: "-created_at",
            children: t2("sort.newest")
          }), /* @__PURE__ */ jsx("option", {
            value: "username",
            children: t2("sort.username")
          }), /* @__PURE__ */ jsx("option", {
            value: "-used_traffic",
            children: t2("sort.usage")
          }), /* @__PURE__ */ jsx("option", {
            value: "expire",
            children: t2("sort.expire")
          }), /* @__PURE__ */ jsx("option", {
            value: "-online_ip_count",
            children: t2("sort.onlineIps")
          }), /* @__PURE__ */ jsx("option", {
            value: "-hwid_count",
            children: t2("sort.devices")
          })]
        }), /* @__PURE__ */ jsx(IconButton, {
          "aria-label": "refresh users",
          disabled: loading,
          onClick: refetchUsers,
          size: "sm",
          variant: "outline",
          children: /* @__PURE__ */ jsx(ReloadIcon, {
            className: classNames({
              "animate-spin": loading
            })
          })
        }), /* @__PURE__ */ jsx(Button, {
          colorScheme: "primary",
          size: "sm",
          onClick: () => onCreateUser(true),
          px: {
            base: 3,
            md: 5
          },
          flexShrink: 0,
          children: t2("createUser")
        })]
      })
    })]
  });
};
const BRAND_NAME = "Alexen";
const BRAND_VENDOR = "Alexander LLC";
const REPO_URL = "https://github.com/alexen-panel/alexen";
const Footer = (props) => {
  const {
    version
  } = useDashboardPick("version");
  return /* @__PURE__ */ jsx(HStack, {
    w: "full",
    py: "0",
    position: "relative",
    ...props,
    children: /* @__PURE__ */ jsxs(Text, {
      display: "inline-block",
      flexGrow: 1,
      textAlign: "center",
      color: "gray.500",
      fontSize: "xs",
      children: [/* @__PURE__ */ jsx(Link, {
        color: "primary.400",
        href: REPO_URL,
        children: BRAND_NAME
      }), version ? ` (v${version})` : "", " \xB7 ", BRAND_VENDOR]
    })
  });
};
const clamp = (n) => Math.min(1, Math.max(0, n));
const hexToHsv = (hex) => {
  const n = parseInt((hex || "#000000").replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d) {
    if (max === r)
      h = (g - b) / d % 6;
    else if (max === g)
      h = (b - r) / d + 2;
    else
      h = (r - g) / d + 4;
    h *= 60;
    if (h < 0)
      h += 360;
  }
  return {
    h,
    s: max ? d / max : 0,
    v: max
  };
};
const hsvToHex = ({
  h,
  s: s2,
  v
}) => {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s2 * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return "#" + [f(5), f(3), f(1)].map((x) => Math.round(x * 255).toString(16).padStart(2, "0")).join("");
};
const useDrag = (onMove) => {
  const ref = react.exports.useRef(null);
  const move = (e) => {
    const r = ref.current.getBoundingClientRect();
    onMove(clamp((e.clientX - r.left) / r.width), clamp((e.clientY - r.top) / r.height));
  };
  return {
    ref,
    onPointerDown: (e) => {
      var _a, _b;
      e.preventDefault();
      e.stopPropagation();
      (_b = (_a = e.target).setPointerCapture) == null ? void 0 : _b.call(_a, e.pointerId);
      move(e);
    },
    onPointerMove: (e) => {
      if (e.buttons)
        move(e);
    }
  };
};
const ColorPicker = ({
  value,
  onChange
}) => {
  const [hsv, setHsv] = react.exports.useState(() => hexToHsv(value));
  const [text, setText] = react.exports.useState(value);
  react.exports.useEffect(() => {
    if (value.toLowerCase() !== hsvToHex(hsv).toLowerCase())
      setHsv(hexToHsv(value));
    setText(value);
  }, [value]);
  const set = (next) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setText(hex);
    onChange(hex);
  };
  const area = useDrag((x, y) => set({
    ...hsv,
    s: x,
    v: 1 - y
  }));
  const hue = useDrag((x) => set({
    ...hsv,
    h: x * 359.9
  }));
  const hueColor = hsvToHex({
    h: hsv.h,
    s: 1,
    v: 1
  });
  return /* @__PURE__ */ jsxs(Box, {
    w: "full",
    onClick: (e) => e.stopPropagation(),
    children: [/* @__PURE__ */ jsx(Box, {
      ...area,
      position: "relative",
      h: "110px",
      borderRadius: "md",
      cursor: "crosshair",
      style: {
        background: `linear-gradient(to top,#000,transparent),linear-gradient(to right,#fff,${hueColor})`,
        touchAction: "none"
      },
      children: /* @__PURE__ */ jsx(Box, {
        position: "absolute",
        w: "12px",
        h: "12px",
        borderRadius: "full",
        border: "2px solid white",
        boxShadow: "0 0 0 1px rgba(0,0,0,.4)",
        pointerEvents: "none",
        style: {
          left: `calc(${hsv.s * 100}% - 6px)`,
          top: `calc(${(1 - hsv.v) * 100}% - 6px)`
        }
      })
    }), /* @__PURE__ */ jsx(Box, {
      ...hue,
      position: "relative",
      h: "12px",
      mt: 2,
      borderRadius: "full",
      cursor: "pointer",
      style: {
        background: "linear-gradient(to right,#f00,#ff0,#0f0,#0ff,#00f,#f0f,#f00)",
        touchAction: "none"
      },
      children: /* @__PURE__ */ jsx(Box, {
        position: "absolute",
        top: "-2px",
        w: "16px",
        h: "16px",
        borderRadius: "full",
        border: "2px solid white",
        boxShadow: "0 0 0 1px rgba(0,0,0,.4)",
        pointerEvents: "none",
        style: {
          left: `calc(${hsv.h / 360 * 100}% - 8px)`,
          background: hueColor
        }
      })
    }), /* @__PURE__ */ jsxs(HStack, {
      mt: 2,
      spacing: 2,
      children: [/* @__PURE__ */ jsx(Box, {
        w: "22px",
        h: "22px",
        borderRadius: "md",
        flexShrink: 0,
        border: "1px solid",
        borderColor: "blackAlpha.300",
        style: {
          background: value
        }
      }), /* @__PURE__ */ jsx(Input$1, {
        size: "xs",
        fontFamily: "mono",
        value: text,
        onKeyDown: (e) => e.stopPropagation(),
        onChange: (e) => {
          setText(e.target.value);
          const v = e.target.value.trim();
          if (/^#?[0-9a-fA-F]{6}$/.test(v))
            onChange(v.startsWith("#") ? v : "#" + v);
        }
      })]
    })]
  });
};
const Wide = react.exports.createContext(false);
const Group = ({
  title,
  children,
  full
}) => {
  const wide = react.exports.useContext(Wide);
  return /* @__PURE__ */ jsxs(Box, {
    gridColumn: full && wide ? "1 / -1" : void 0,
    ...wide ? {
      className: "alexen-page",
      p: 5,
      borderRadius: "18px",
      borderWidth: "1px",
      boxShadow: "var(--alexen-shadow)"
    } : {},
    children: [/* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      fontWeight: "semibold",
      textTransform: "uppercase",
      letterSpacing: "wider",
      color: "gray.500",
      mb: 2.5,
      children: title
    }), children]
  });
};
const Choice = ({
  on,
  onClick,
  children
}) => /* @__PURE__ */ jsx(Box, {
  as: "button",
  type: "button",
  onClick,
  borderRadius: "16px",
  p: 2.5,
  borderWidth: "2px",
  borderColor: on ? "primary.400" : "transparent",
  bg: "blackAlpha.50",
  _dark: {
    bg: "whiteAlpha.50"
  },
  transition: "border-color .15s, transform .15s",
  _hover: {
    transform: "translateY(-1px)"
  },
  textAlign: "left",
  children
});
const StyleSample = ({
  kind,
  dark
}) => {
  const page = dark ? "#151a25" : "#eceef3";
  const card = {
    minimal: {
      bg: dark ? "#1c2230" : "#fff",
      boxShadow: dark ? "0 4px 12px rgba(0,0,0,.35)" : "0 4px 12px rgba(16,24,40,.08)",
      border: `1px solid ${dark ? "rgba(255,255,255,.06)" : "rgba(15,23,42,.05)"}`
    },
    glass: {
      bg: dark ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.5)",
      boxShadow: "0 6px 18px rgba(31,38,135,.18), inset 0 1px 0 rgba(255,255,255,.6)",
      border: "1px solid rgba(255,255,255,.5)",
      backdropFilter: "blur(6px)"
    },
    clay: {
      bg: page,
      boxShadow: dark ? "5px 5px 12px rgba(0,0,0,.55), -4px -4px 10px rgba(255,255,255,.04)" : "5px 5px 12px rgba(112,124,156,.25), -5px -5px 12px #fff",
      border: "0"
    }
  }[kind];
  return /* @__PURE__ */ jsx(Box, {
    h: "64px",
    borderRadius: "12px",
    p: 2.5,
    style: {
      background: kind === "glass" ? "linear-gradient(135deg, var(--chakra-colors-primary-300), #f0abfc 55%, #67e8f9)" : page
    },
    children: /* @__PURE__ */ jsxs(Box, {
      h: "100%",
      borderRadius: kind === "clay" ? "14px" : "10px",
      p: 2,
      ...card,
      children: [/* @__PURE__ */ jsx(Box, {
        h: "6px",
        w: "55%",
        borderRadius: "full",
        bg: dark ? "whiteAlpha.400" : "blackAlpha.300",
        mb: 1.5
      }), /* @__PURE__ */ jsx(Box, {
        h: "6px",
        w: "35%",
        borderRadius: "full",
        bg: "primary.400"
      })]
    })
  });
};
const AppearanceSettings = ({
  wide
}) => {
  const {
    t: t2
  } = useTranslation();
  const {
    colorMode,
    setColorMode
  } = useColorMode();
  const [a, setA] = react.exports.useState(getAppearance());
  const [picking, setPicking] = react.exports.useState("");
  const [mode, setMode] = react.exports.useState(() => {
    try {
      return localStorage.getItem("alexen-mode") || colorMode;
    } catch {
      return colorMode;
    }
  });
  const keepScroll = () => {
    const y = window.scrollY;
    const back = () => window.scrollTo({
      top: y
    });
    requestAnimationFrame(() => requestAnimationFrame(back));
    [60, 200, 450].forEach((ms) => setTimeout(back, ms));
  };
  const update = (patch) => {
    keepScroll();
    setA((cur) => {
      const next = {
        ...cur,
        ...patch
      };
      applyAppearance(next);
      return next;
    });
  };
  react.exports.useEffect(() => {
    var _a;
    if (mode !== "system")
      return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => setColorMode(mq.matches ? "dark" : "light");
    apply();
    (_a = mq.addEventListener) == null ? void 0 : _a.call(mq, "change", apply);
    return () => {
      var _a2;
      return (_a2 = mq.removeEventListener) == null ? void 0 : _a2.call(mq, "change", apply);
    };
  }, [mode]);
  react.exports.useEffect(() => {
    applyAppearance(getAppearance());
  }, [colorMode]);
  const pickMode = (m) => {
    keepScroll();
    setMode(m);
    try {
      localStorage.setItem("alexen-mode", m);
    } catch {
    }
    if (m !== "system")
      setColorMode(m);
  };
  const dark = colorMode === "dark";
  const isOn = (p) => a.background === p.background && a.accent === p.accent && a.surface === p.surface && colorMode === p.mode && Math.abs((a.tierContrast || 1) - p.tierContrast) < 0.01;
  return /* @__PURE__ */ jsx(Wide.Provider, {
    value: !!wide,
    children: /* @__PURE__ */ jsxs(SimpleGrid, {
      columns: wide ? {
        base: 1,
        xl: 2
      } : 1,
      spacing: wide ? 5 : 7,
      pt: 3,
      alignItems: "start",
      children: [/* @__PURE__ */ jsx(Group, {
        title: t2("appearance.presets"),
        full: true,
        children: /* @__PURE__ */ jsx(SimpleGrid, {
          columns: wide ? {
            base: 2,
            md: 4,
            xl: 7
          } : 3,
          spacing: 2.5,
          children: PRESETS.map((p) => /* @__PURE__ */ jsxs(Box, {
            as: "button",
            type: "button",
            textAlign: "left",
            borderRadius: "16px",
            p: 2,
            borderWidth: "2px",
            borderColor: isOn(p) ? "primary.400" : "transparent",
            bg: "var(--tier-item)",
            _hover: {
              transform: "translateY(-2px)"
            },
            transition: "transform .15s, border-color .15s",
            onClick: () => {
              pickMode(p.mode);
              update(presetAppearance(p, getAppearance()));
            },
            children: [/* @__PURE__ */ jsx(Box, {
              h: "58px",
              borderRadius: "11px",
              p: 2,
              style: {
                background: p.look[0]
              },
              position: "relative",
              overflow: "hidden",
              children: /* @__PURE__ */ jsxs(Box, {
                h: "100%",
                borderRadius: "8px",
                p: 1.5,
                style: {
                  background: p.look[1]
                },
                boxShadow: "0 2px 8px rgba(0,0,0,.18)",
                children: [/* @__PURE__ */ jsxs(HStack, {
                  spacing: 1,
                  children: [/* @__PURE__ */ jsx(Box, {
                    h: "10px",
                    w: "16px",
                    borderRadius: "4px",
                    style: {
                      background: p.look[2]
                    }
                  }), /* @__PURE__ */ jsx(Box, {
                    h: "10px",
                    w: "16px",
                    borderRadius: "4px",
                    style: {
                      background: ACCENTS[p.accent][500]
                    }
                  }), /* @__PURE__ */ jsx(Box, {
                    h: "10px",
                    w: "16px",
                    borderRadius: "4px",
                    style: {
                      background: p.look[2]
                    }
                  })]
                }), /* @__PURE__ */ jsx(Box, {
                  mt: 1.5,
                  h: "4px",
                  w: "70%",
                  borderRadius: "full",
                  style: {
                    background: p.mode === "dark" ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.25)"
                  }
                })]
              })
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "xs",
              fontWeight: "semibold",
              mt: 1.5,
              noOfLines: 1,
              children: t2(`appearance.preset.${p.id}`)
            })]
          }, p.id))
        })
      }), /* @__PURE__ */ jsx(Group, {
        title: t2("appearance.mode"),
        children: /* @__PURE__ */ jsx(SimpleGrid, {
          columns: 3,
          spacing: 2,
          children: [["light", SunIcon], ["dark", MoonIcon], ["system", ComputerDesktopIcon]].map(([m, icon]) => /* @__PURE__ */ jsx(Choice, {
            on: mode === m,
            onClick: () => pickMode(m),
            children: /* @__PURE__ */ jsxs(VStack, {
              spacing: 1,
              py: 1,
              children: [/* @__PURE__ */ jsx(Icon$1, {
                as: icon,
                boxSize: "20px"
              }), /* @__PURE__ */ jsx(Text, {
                fontSize: "sm",
                children: t2(`appearance.mode.${m}`)
              })]
            })
          }, m))
        })
      }), /* @__PURE__ */ jsx(Group, {
        title: t2("appearance.style"),
        children: /* @__PURE__ */ jsx(SimpleGrid, {
          columns: 3,
          spacing: 2,
          children: ["minimal", "glass", "clay"].map((k) => /* @__PURE__ */ jsxs(Choice, {
            on: a.surface === k,
            onClick: () => update({
              surface: k
            }),
            children: [/* @__PURE__ */ jsx(StyleSample, {
              kind: k,
              dark
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              mt: 2,
              fontWeight: "medium",
              children: t2(`appearance.style.${k}`)
            })]
          }, k))
        })
      }), /* @__PURE__ */ jsxs(Group, {
        title: t2("appearance.accent"),
        children: [/* @__PURE__ */ jsxs(SimpleGrid, {
          columns: 6,
          spacing: 2.5,
          children: [ACCENT_CHOICES.map((name) => /* @__PURE__ */ jsx(Tooltip, {
            label: t2(`appearance.color.${name}`),
            hasArrow: true,
            openDelay: 300,
            children: /* @__PURE__ */ jsx(Box, {
              as: "button",
              type: "button",
              "aria-label": name,
              w: "100%",
              style: {
                aspectRatio: "1"
              },
              borderRadius: "full",
              bg: ACCENTS[name][500],
              boxShadow: a.accent === name ? `0 0 0 3px var(--chakra-colors-chakra-body-bg), 0 0 0 5px ${ACCENTS[name][500]}` : `0 4px 10px ${ACCENTS[name][500]}55`,
              transition: "transform .15s",
              _hover: {
                transform: "scale(1.08)"
              },
              onClick: () => {
                setPicking("");
                update({
                  accent: name
                });
              }
            })
          }, name)), /* @__PURE__ */ jsx(Tooltip, {
            label: t2("appearance.custom"),
            hasArrow: true,
            children: /* @__PURE__ */ jsx(Box, {
              as: "button",
              type: "button",
              "aria-label": "custom",
              w: "100%",
              style: {
                aspectRatio: "1",
                background: "conic-gradient(#f87171,#fbbf24,#4ade80,#22d3ee,#818cf8,#e879f9,#f87171)"
              },
              borderRadius: "full",
              p: "4px",
              boxShadow: a.accent === "custom" ? "0 0 0 3px var(--chakra-colors-chakra-body-bg), 0 0 0 5px var(--chakra-colors-primary-500)" : void 0,
              onClick: () => {
                setPicking(picking === "accent" ? "" : "accent");
                update({
                  accent: "custom"
                });
              },
              children: /* @__PURE__ */ jsx(Box, {
                w: "full",
                h: "full",
                borderRadius: "full",
                style: {
                  background: a.customAccent
                }
              })
            })
          })]
        }), picking === "accent" && /* @__PURE__ */ jsx(Box, {
          mt: 3,
          children: /* @__PURE__ */ jsx(ColorPicker, {
            value: a.customAccent,
            onChange: (c) => update({
              accent: "custom",
              customAccent: c
            })
          })
        })]
      }), /* @__PURE__ */ jsxs(Group, {
        title: t2("appearance.background"),
        children: [/* @__PURE__ */ jsxs(SimpleGrid, {
          columns: 6,
          spacing: 2.5,
          children: [BACKGROUND_CHOICES.map((name) => {
            const bg = BACKGROUNDS[name];
            const page = (dark ? bg.dark : bg.light) || (dark ? "#151a25" : "#f5f6f9");
            const fill = `radial-gradient(circle at 78% 78%, ${bg.swatch}cc, transparent 62%), ${page}`;
            return /* @__PURE__ */ jsx(Tooltip, {
              label: t2(`appearance.bg.${name}`),
              hasArrow: true,
              openDelay: 300,
              children: /* @__PURE__ */ jsx(Box, {
                as: "button",
                type: "button",
                "aria-label": name,
                w: "100%",
                style: {
                  aspectRatio: "1",
                  background: fill
                },
                borderRadius: "12px",
                borderWidth: "2px",
                borderColor: a.background === name ? "primary.400" : dark ? "whiteAlpha.200" : "blackAlpha.100",
                position: "relative",
                overflow: "hidden",
                onClick: () => {
                  setPicking("");
                  update({
                    background: name
                  });
                }
              })
            }, name);
          }), /* @__PURE__ */ jsx(Tooltip, {
            label: t2("appearance.custom"),
            hasArrow: true,
            children: /* @__PURE__ */ jsx(Box, {
              as: "button",
              type: "button",
              "aria-label": "custom background",
              w: "100%",
              style: {
                aspectRatio: "1",
                background: "conic-gradient(#f87171,#fbbf24,#4ade80,#22d3ee,#818cf8,#e879f9,#f87171)"
              },
              borderRadius: "12px",
              p: "4px",
              borderWidth: "2px",
              borderColor: a.background === "custom" ? "primary.400" : "transparent",
              onClick: () => {
                setPicking(picking === "background" ? "" : "background");
                update({
                  background: "custom"
                });
              },
              children: /* @__PURE__ */ jsx(Box, {
                w: "full",
                h: "full",
                borderRadius: "8px",
                style: {
                  background: a.customBackground
                }
              })
            })
          })]
        }), picking === "background" && /* @__PURE__ */ jsx(Box, {
          mt: 3,
          children: /* @__PURE__ */ jsx(ColorPicker, {
            value: a.customBackground,
            onChange: (c) => update({
              background: "custom",
              customBackground: c
            })
          })
        })]
      }), /* @__PURE__ */ jsx(Group, {
        title: t2("appearance.motion"),
        children: /* @__PURE__ */ jsxs(HStack, {
          borderRadius: "14px",
          bg: "blackAlpha.50",
          _dark: {
            bg: "whiteAlpha.50"
          },
          p: 3,
          spacing: 3,
          align: "flex-start",
          children: [/* @__PURE__ */ jsx(Switch, {
            size: "sm",
            mt: 0.5,
            colorScheme: "primary",
            isChecked: a.animations,
            onChange: (e) => update({
              animations: e.target.checked
            })
          }), /* @__PURE__ */ jsxs(Box, {
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              children: t2("appearance.animations")
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "xs",
              color: "gray.500",
              children: t2("appearance.animationsHelp")
            })]
          })]
        })
      }), /* @__PURE__ */ jsx(TierSettings, {
        a,
        dark,
        update
      })]
    })
  });
};
const AppearancePanel = ({
  isOpen,
  onClose
}) => {
  const {
    t: t2
  } = useTranslation();
  const navigate = useNavigate();
  return /* @__PURE__ */ jsxs(Drawer, {
    isOpen,
    onClose,
    placement: "right",
    size: "sm",
    children: [/* @__PURE__ */ jsx(ModalOverlay$1, {
      bg: "blackAlpha.300"
    }), /* @__PURE__ */ jsxs(DrawerContent, {
      borderLeftRadius: {
        base: 0,
        sm: "24px"
      },
      className: "alexen-drawer",
      children: [/* @__PURE__ */ jsx(ModalCloseButton$1, {
        mt: 2,
        borderRadius: "full"
      }), /* @__PURE__ */ jsxs(ModalHeader$1, {
        pb: 1,
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "lg",
          children: t2("appearance.title")
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          fontWeight: "normal",
          children: t2("appearance.help")
        }), /* @__PURE__ */ jsx(Button, {
          size: "xs",
          mt: 2,
          variant: "outline",
          colorScheme: "primary",
          onClick: () => {
            onClose();
            navigate("/theme");
          },
          children: t2("appearance.openPage")
        })]
      }), /* @__PURE__ */ jsx(ModalBody$1, {
        pb: 8,
        children: /* @__PURE__ */ jsx(AppearanceSettings, {})
      })]
    })]
  });
};
const TierSettings = ({
  a,
  dark,
  update
}) => {
  const {
    t: t2
  } = useTranslation();
  const [picking, setPicking] = react.exports.useState("");
  const mode = dark ? "dark" : "light";
  const own = a.tiers[mode];
  const cssVar = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const current = {
    page: own.page || cssVar("--tier-0"),
    layer: own.layer || cssVar("--tier-1"),
    item: own.item || cssVar("--tier-item")
  };
  const setTier = (k, v) => update({
    tiers: {
      ...a.tiers,
      [mode]: {
        ...own,
        [k]: v
      }
    }
  });
  return /* @__PURE__ */ jsxs(Group, {
    title: t2("appearance.tiers"),
    children: [/* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      mb: 3,
      children: t2("appearance.tiersHelp")
    }), /* @__PURE__ */ jsxs(Box, {
      borderRadius: "14px",
      p: 3,
      style: {
        background: "var(--tier-0)"
      },
      borderWidth: "1px",
      borderColor: "var(--tier-line)",
      mb: 3,
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "2xs",
        color: "gray.500",
        mb: 1.5,
        children: t2("appearance.tier.page")
      }), /* @__PURE__ */ jsxs(Box, {
        borderRadius: "12px",
        p: 3,
        style: {
          background: "var(--tier-1)"
        },
        borderWidth: "1px",
        borderColor: "var(--tier-line)",
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "2xs",
          color: "gray.500",
          mb: 1.5,
          children: t2("appearance.tier.layer")
        }), /* @__PURE__ */ jsxs(HStack, {
          spacing: 1.5,
          children: [["7h", "1d", "1w"].map((x, i) => /* @__PURE__ */ jsx(Box, {
            px: 2.5,
            py: 1,
            borderRadius: "8px",
            fontSize: "xs",
            style: {
              background: i === 1 ? "var(--chakra-colors-primary-500)" : "var(--tier-item)"
            },
            color: i === 1 ? "white" : void 0,
            borderWidth: "1px",
            borderColor: i === 1 ? "transparent" : "var(--tier-line)",
            children: x
          }, x)), /* @__PURE__ */ jsxs(Text, {
            fontSize: "2xs",
            color: "gray.500",
            children: ["\u2190 ", t2("appearance.tier.item")]
          })]
        })]
      })]
    }), /* @__PURE__ */ jsxs(Box, {
      mb: 3,
      children: [/* @__PURE__ */ jsxs(HStack, {
        justifyContent: "space-between",
        mb: 1,
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          children: t2("appearance.tierContrast")
        }), /* @__PURE__ */ jsxs(Text, {
          fontSize: "xs",
          color: "gray.500",
          children: [Math.round((a.tierContrast || 1) * 100), "%"]
        })]
      }), /* @__PURE__ */ jsxs(Slider, {
        min: 0.4,
        max: 2.5,
        step: 0.05,
        value: a.tierContrast || 1,
        onChange: (v) => update({
          tierContrast: v
        }),
        children: [/* @__PURE__ */ jsx(SliderTrack, {
          children: /* @__PURE__ */ jsx(SliderFilledTrack, {
            bg: "primary.500"
          })
        }), /* @__PURE__ */ jsx(SliderThumb, {})]
      })]
    }), /* @__PURE__ */ jsx(SimpleGrid, {
      columns: 3,
      spacing: 2,
      children: ["page", "layer", "item"].map((k) => /* @__PURE__ */ jsxs(Choice, {
        on: picking === k,
        onClick: () => setPicking(picking === k ? "" : k),
        children: [/* @__PURE__ */ jsx(Box, {
          h: "28px",
          borderRadius: "8px",
          mb: 1.5,
          borderWidth: "1px",
          borderColor: "var(--tier-line)",
          style: {
            background: current[k]
          }
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          fontWeight: "medium",
          children: t2(`appearance.tier.${k}`)
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "2xs",
          color: "gray.500",
          children: own[k] ? own[k] : t2("appearance.tierAuto")
        })]
      }, k))
    }), picking && /* @__PURE__ */ jsxs(Box, {
      mt: 3,
      children: [/* @__PURE__ */ jsx(ColorPicker, {
        value: current[picking] || "#888888",
        onChange: (c) => setTier(picking, c)
      }), /* @__PURE__ */ jsx(Button, {
        size: "xs",
        mt: 2,
        variant: "ghost",
        onClick: () => setTier(picking, ""),
        children: t2("appearance.tierReset")
      })]
    }), /* @__PURE__ */ jsx(Button, {
      size: "xs",
      mt: 3,
      variant: "outline",
      onClick: () => update({
        tierContrast: 1,
        tiers: emptyTiers()
      }),
      children: t2("appearance.tiersResetAll")
    })]
  });
};
const ThemePage = () => /* @__PURE__ */ jsx(Box, {
  children: /* @__PURE__ */ jsx(AppearanceSettings, {
    wide: true
  })
});
const AppearancePanel$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AppearanceSettings,
  AppearancePanel,
  ThemePage
}, Symbol.toStringTag, { value: "Module" }));
const fetchUser = async () => {
  return await fetch$1("/admin");
};
const useGetUser = () => {
  const {
    data,
    isError,
    isLoading,
    isSuccess,
    error
  } = useQuery({
    queryFn: () => fetchUser()
  });
  const userDataEmpty = {
    discord_webook: "",
    is_sudo: false,
    telegram_id: "",
    username: ""
  };
  return {
    userData: data || userDataEmpty,
    getUserIsPending: isLoading,
    getUserIsSuccess: isSuccess,
    getUserIsError: isError,
    getUserError: error
  };
};
const LangIcon = chakra(LanguageIcon, {
  baseStyle: {
    w: 4,
    h: 4
  }
});
const Language = ({
  actions
}) => {
  const {
    i18n
  } = useTranslation();
  var changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
  };
  return /* @__PURE__ */ jsxs(Menu, {
    placement: "bottom-end",
    children: [/* @__PURE__ */ jsx(MenuButton, {
      as: IconButton,
      size: "sm",
      variant: "outline",
      icon: /* @__PURE__ */ jsx(LangIcon, {}),
      position: "relative"
    }), /* @__PURE__ */ jsxs(MenuList, {
      minW: "100px",
      zIndex: 9999,
      children: [/* @__PURE__ */ jsx(MenuItem, {
        maxW: "100px",
        fontSize: "sm",
        onClick: () => changeLanguage("en"),
        children: "English"
      }), /* @__PURE__ */ jsx(MenuItem, {
        maxW: "100px",
        fontSize: "sm",
        onClick: () => changeLanguage("fa"),
        children: "\u0641\u0627\u0631\u0633\u06CC"
      }), /* @__PURE__ */ jsx(MenuItem, {
        maxW: "100px",
        fontSize: "sm",
        onClick: () => changeLanguage("zh-cn"),
        children: "\u7B80\u4F53\u4E2D\u6587"
      }), /* @__PURE__ */ jsx(MenuItem, {
        maxW: "100px",
        fontSize: "sm",
        onClick: () => changeLanguage("ru"),
        children: "\u0420\u0443\u0441\u0441\u043A\u0438\u0439"
      }), /* @__PURE__ */ jsx(MenuItem, {
        maxW: "100px",
        fontSize: "sm",
        onClick: () => changeLanguage("tr"),
        children: "T\xFCrk\xE7e"
      }), /* @__PURE__ */ jsx(MenuItem, {
        maxW: "100px",
        fontSize: "sm",
        onClick: () => changeLanguage("tk"),
        children: "T\xFCrkmen\xE7e"
      })]
    })]
  });
};
const SIDEBAR_WIDTH = "256px";
const SIDEBAR_WIDTH_ICON = "56px";
const COLLAPSE_KEY = "alexen-sidebar-collapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};
const useSidebar = create((set, get) => ({
  isOpen: false,
  collapsed: readCollapsed(),
  setOpen: (isOpen) => set({
    isOpen
  }),
  toggleCollapsed: () => {
    const collapsed = !get().collapsed;
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {
    }
    set({
      collapsed
    });
  }
}));
const useSidebarWidth = () => useSidebar((s2) => s2.collapsed ? SIDEBAR_WIDTH_ICON : SIDEBAR_WIDTH);
const ic = (Icon2) => chakra(Icon2, {
  baseStyle: {
    w: 4,
    h: 4,
    flexShrink: 0
  }
});
const activeBg = "color-mix(in srgb, var(--chakra-colors-primary-500) 14%, transparent)";
const Row = ({
  icon: Icon2,
  label,
  active,
  danger,
  collapsed,
  sub,
  right,
  onClick
}) => {
  const row = /* @__PURE__ */ jsxs(HStack, {
    as: "button",
    w: "full",
    h: sub ? "30px" : "32px",
    px: collapsed ? 0 : 2,
    justifyContent: collapsed ? "center" : "flex-start",
    spacing: 2,
    borderRadius: "md",
    fontSize: "sm",
    fontWeight: active ? "medium" : "normal",
    textAlign: "left",
    color: danger ? "red.500" : active ? "primary.600" : "gray.700",
    bg: active ? activeBg : "transparent",
    _dark: {
      color: danger ? "red.300" : active ? "primary.200" : "gray.300"
    },
    _hover: {
      bg: active ? activeBg : "blackAlpha.50",
      _dark: {
        bg: active ? activeBg : "whiteAlpha.100"
      }
    },
    onClick,
    children: [/* @__PURE__ */ jsx(Icon2, {}), !collapsed && /* @__PURE__ */ jsx(Text, {
      as: "span",
      flex: 1,
      isTruncated: true,
      children: label
    }), !collapsed && right]
  });
  return collapsed ? /* @__PURE__ */ jsx(Tooltip, {
    label,
    placement: "right",
    openDelay: 200,
    children: row
  }) : row;
};
const SidebarContent = ({
  collapsed,
  onNavigate
}) => {
  const {
    t: t2
  } = useTranslation();
  const navigate = useNavigate();
  const {
    pathname
  } = useLocation();
  const here = pathname.replace(/^\/+|\/+$/g, "");
  const {
    userData,
    getUserIsSuccess
  } = useGetUser();
  const isSudo = getUserIsSuccess && userData.is_sudo;
  const version = useDashboard((s2) => s2.version);
  const onResetAllUsage = useDashboard((s2) => s2.onResetAllUsage);
  const {
    colorMode,
    toggleColorMode
  } = useColorMode();
  const toggleCollapsed = useSidebar((s2) => s2.toggleCollapsed);
  const go = (path) => {
    onNavigate == null ? void 0 : onNavigate();
    navigate(`/${path}`);
    window.scrollTo({
      top: 0
    });
  };
  const {
    data: ownExternal
  } = useQuery({
    queryKey: "own-external",
    queryFn: () => fetch$1("/external-configs/mine"),
    enabled: getUserIsSuccess && !userData.is_sudo,
    retry: false,
    staleTime: 6e4
  });
  const nav = [{
    title: t2("overview.title"),
    path: "overview",
    icon: ic(Squares2X2Icon)
  }, {
    title: t2("users"),
    path: "",
    icon: ic(UsersIcon)
  }, {
    title: t2("stats.title"),
    path: "statistics",
    icon: ic(ChartPieIcon)
  }, ...!isSudo && ownExternal ? [{
    title: t2("external.title"),
    path: "external",
    icon: ic(GlobeAltIcon)
  }] : [], {
    title: t2("activity.title"),
    path: "activity",
    icon: ic(ClockIcon)
  }, {
    title: t2("appearance.title"),
    path: "theme",
    icon: ic(SwatchIcon)
  }, ...isSudo ? [{
    title: t2("header.hostSettings"),
    path: "hosts",
    icon: ic(ListBulletIcon)
  }, {
    title: t2("header.groupSettings"),
    path: "groups",
    icon: ic(RectangleGroupIcon)
  }, {
    title: t2("header.adminsSettings"),
    path: "admins",
    icon: ic(ShieldCheckIcon)
  }, {
    title: t2("preroutePage.title"),
    path: "preroute",
    icon: ic(ShareIcon)
  }, {
    title: t2("sidebar.nodes"),
    path: "nodes",
    icon: ic(ServerStackIcon),
    items: [{
      title: t2("header.nodeSettings"),
      path: "nodes",
      icon: ic(Square3Stack3DIcon)
    }, {
      title: t2("header.nodesUsage"),
      path: "nodes-usage",
      icon: ic(ChartBarIcon)
    }, {
      title: t2("sidebar.coreSettings"),
      path: "core",
      icon: ic(CpuChipIcon)
    }, {
      title: t2("autoChange.title"),
      path: "auto-change",
      icon: ic(ArrowsRightLeftIcon)
    }, {
      title: t2("vpn.title"),
      path: "vpn",
      icon: ic(LockClosedIcon)
    }]
  }, {
    title: t2("sidebar.settings"),
    path: "sub",
    icon: ic(Cog6ToothIcon),
    items: [{
      title: t2("header.subSettings"),
      path: "sub",
      icon: ic(DocumentTextIcon)
    }, {
      title: t2("domain.title"),
      path: "domain",
      icon: ic(LinkIcon)
    }, {
      title: t2("external.title"),
      path: "external",
      icon: ic(GlobeAltIcon)
    }, {
      title: t2("resetAllUsage"),
      icon: ic(ArrowPathIcon),
      danger: true,
      action: () => {
        onNavigate == null ? void 0 : onNavigate();
        onResetAllUsage(true);
      }
    }]
  }] : []];
  const [open, setOpen] = react.exports.useState({});
  react.exports.useEffect(() => {
    nav.forEach((n) => {
      var _a;
      if ((_a = n.items) == null ? void 0 : _a.some((i) => i.path === here))
        setOpen((o) => ({
          ...o,
          [n.title]: true
        }));
    });
  }, [here, isSudo]);
  const Logo = ic(ShieldCheckIcon);
  const Chevron = ic(ChevronRightIcon);
  const CollapseIcon = ic(ChevronDoubleLeftIcon);
  const ExpandIcon = ic(ChevronDoubleRightIcon);
  const ThemeIcon = ic(colorMode === "light" ? MoonIcon : SunIcon);
  const LogoutIcon = ic(ArrowLeftOnRectangleIcon);
  return /* @__PURE__ */ jsxs(VStack, {
    h: "full",
    align: "stretch",
    spacing: 0,
    children: [/* @__PURE__ */ jsx(HStack, {
      px: collapsed ? 2 : 3,
      py: 3,
      spacing: 2,
      justifyContent: collapsed ? "center" : "space-between",
      children: collapsed ? /* @__PURE__ */ jsx(Tooltip, {
        label: t2("sidebar.expand"),
        placement: "right",
        children: /* @__PURE__ */ jsx(IconButton, {
          "aria-label": "expand sidebar",
          size: "sm",
          variant: "ghost",
          icon: /* @__PURE__ */ jsx(ExpandIcon, {}),
          onClick: toggleCollapsed
        })
      }) : /* @__PURE__ */ jsxs(Fragment, {
        children: [/* @__PURE__ */ jsxs(HStack, {
          spacing: 2,
          minW: 0,
          children: [/* @__PURE__ */ jsx(Box, {
            w: "32px",
            h: "32px",
            borderRadius: "lg",
            bg: "primary.500",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            children: /* @__PURE__ */ jsx(Logo, {
              w: 5,
              h: 5
            })
          }), /* @__PURE__ */ jsxs(Box, {
            minW: 0,
            lineHeight: "short",
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              fontWeight: "semibold",
              isTruncated: true,
              children: BRAND_NAME
            }), version && /* @__PURE__ */ jsxs(Text, {
              fontSize: "xs",
              opacity: 0.5,
              isTruncated: true,
              children: ["v", version]
            })]
          })]
        }), !onNavigate && /* @__PURE__ */ jsx(Tooltip, {
          label: t2("sidebar.collapse"),
          placement: "right",
          children: /* @__PURE__ */ jsx(IconButton, {
            "aria-label": "collapse sidebar",
            size: "sm",
            variant: "ghost",
            borderRadius: "full",
            icon: /* @__PURE__ */ jsx(CollapseIcon, {}),
            onClick: toggleCollapsed
          })
        })]
      })
    }), /* @__PURE__ */ jsxs(Box, {
      flex: 1,
      overflowY: "auto",
      px: 2,
      pb: 2,
      children: [!collapsed && /* @__PURE__ */ jsx(Text, {
        px: 2,
        pt: 1,
        pb: 1.5,
        fontSize: "xs",
        fontWeight: "medium",
        color: "gray.500",
        children: t2("sidebar.platform")
      }), /* @__PURE__ */ jsx(VStack, {
        align: "stretch",
        spacing: 0.5,
        children: nav.map((n) => {
          var _a;
          const childActive = (_a = n.items) == null ? void 0 : _a.some((i) => i.path === here);
          if (!n.items) {
            return /* @__PURE__ */ jsx(Row, {
              icon: n.icon,
              label: n.title,
              collapsed,
              active: here === n.path,
              onClick: () => go(n.path)
            }, n.title);
          }
          const isOpen = !!open[n.title];
          return /* @__PURE__ */ jsxs(Box, {
            children: [/* @__PURE__ */ jsx(Row, {
              icon: n.icon,
              label: n.title,
              collapsed,
              active: collapsed && childActive,
              right: /* @__PURE__ */ jsx(Chevron, {
                transition: "transform .2s",
                transform: isOpen ? "rotate(90deg)" : "none",
                opacity: 0.6
              }),
              onClick: () => collapsed ? go(n.path) : setOpen((o) => ({
                ...o,
                [n.title]: !isOpen
              }))
            }), !collapsed && /* @__PURE__ */ jsx(Collapse, {
              in: isOpen,
              animateOpacity: true,
              children: /* @__PURE__ */ jsx(VStack, {
                align: "stretch",
                spacing: 0.5,
                ml: "15px",
                pl: "10px",
                my: 0.5,
                borderLeft: "1px solid",
                borderColor: "light-border",
                _dark: {
                  borderColor: "gray.600"
                },
                children: n.items.map((i) => /* @__PURE__ */ jsx(Row, {
                  sub: true,
                  icon: i.icon,
                  label: i.title,
                  danger: i.danger,
                  active: !!i.path && here === i.path,
                  onClick: () => i.action ? i.action() : go(i.path)
                }, i.title))
              })
            })]
          }, n.title);
        })
      })]
    }), /* @__PURE__ */ jsxs(HStack, {
      px: collapsed ? 0 : 3,
      py: 2,
      spacing: 2,
      justifyContent: collapsed ? "center" : "flex-end",
      flexDirection: collapsed ? "column" : "row",
      children: [/* @__PURE__ */ jsx(Language, {}), /* @__PURE__ */ jsx(IconButton, {
        size: "sm",
        variant: "outline",
        "aria-label": "switch theme",
        icon: /* @__PURE__ */ jsx(ThemeIcon, {}),
        onClick: () => {
          updateThemeColor(colorMode == "dark" ? "light" : "dark");
          toggleColorMode();
        }
      })]
    }), /* @__PURE__ */ jsx(Box, {
      p: 2,
      borderTop: "1px solid",
      borderColor: "light-border",
      _dark: {
        borderColor: "gray.600"
      },
      children: /* @__PURE__ */ jsxs(HStack, {
        spacing: 2,
        p: collapsed ? 0 : 1.5,
        borderRadius: "md",
        justifyContent: collapsed ? "center" : "flex-start",
        flexDirection: collapsed ? "column" : "row",
        children: [/* @__PURE__ */ jsx(Avatar, {
          size: "sm",
          name: userData.username || "?",
          bg: "primary.500",
          color: "white"
        }), !collapsed && /* @__PURE__ */ jsxs(Box, {
          minW: 0,
          flex: 1,
          lineHeight: "short",
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "sm",
            fontWeight: "semibold",
            isTruncated: true,
            children: userData.username
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            isTruncated: true,
            children: isSudo ? t2("sidebar.sudo") : t2("sidebar.reseller")
          })]
        }), /* @__PURE__ */ jsx(Tooltip, {
          label: t2("header.logout"),
          placement: collapsed ? "right" : "top",
          children: /* @__PURE__ */ jsx(IconButton, {
            "aria-label": "logout",
            size: "sm",
            variant: "ghost",
            icon: /* @__PURE__ */ jsx(LogoutIcon, {}),
            onClick: () => {
              onNavigate == null ? void 0 : onNavigate();
              navigate("/login");
            }
          })
        })]
      })
    })]
  });
};
const Sidebar = () => {
  const isOpen = useSidebar((s2) => s2.isOpen);
  const setOpen = useSidebar((s2) => s2.setOpen);
  const collapsed = useSidebar((s2) => s2.collapsed);
  const width = useSidebarWidth();
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [/* @__PURE__ */ jsx(Box, {
      className: "alexen-sidebar",
      display: {
        base: "none",
        lg: "block"
      },
      position: "fixed",
      top: 0,
      left: 0,
      h: "100dvh",
      w: width,
      zIndex: 20,
      borderRight: "1px solid",
      borderColor: "light-border",
      _dark: {
        borderColor: "gray.700"
      },
      children: /* @__PURE__ */ jsx(SidebarContent, {
        collapsed
      })
    }), /* @__PURE__ */ jsxs(Drawer, {
      isOpen,
      placement: "left",
      onClose: () => setOpen(false),
      children: [/* @__PURE__ */ jsx(ModalOverlay$1, {
        bg: "blackAlpha.400"
      }), /* @__PURE__ */ jsx(DrawerContent, {
        maxW: "288px",
        className: "alexen-sidebar",
        children: /* @__PURE__ */ jsx(ModalBody$1, {
          p: 0,
          pt: "env(safe-area-inset-top)",
          children: /* @__PURE__ */ jsx(SidebarContent, {
            onNavigate: () => setOpen(false)
          })
        })
      })]
    })]
  });
};
const PageModeContext = react.exports.createContext(false);
const usePageMode = () => react.exports.useContext(PageModeContext);
const AsPage = ({
  children
}) => /* @__PURE__ */ jsx(PageModeContext.Provider, {
  value: true,
  children
});
const Modal = (props) => usePageMode() ? /* @__PURE__ */ jsx(Fragment, {
  children: props.children
}) : /* @__PURE__ */ jsx(Modal$1, {
  ...props
});
const ModalOverlay = (props) => usePageMode() ? null : /* @__PURE__ */ jsx(ModalOverlay$1, {
  ...props
});
const ModalCloseButton = (props) => usePageMode() ? null : /* @__PURE__ */ jsx(ModalCloseButton$1, {
  ...props
});
const ModalContent = ({
  children,
  ...props
}) => {
  if (!usePageMode())
    return /* @__PURE__ */ jsx(ModalContent$1, {
      ...props,
      children
    });
  const {
    mx,
    my,
    m,
    maxW,
    maxWidth,
    w,
    width,
    h,
    height,
    ...rest
  } = props;
  return /* @__PURE__ */ jsx(Card, {
    className: "alexen-page",
    w: "full",
    borderWidth: "1px",
    borderColor: "blackAlpha.50",
    bg: "var(--app-surface)",
    boxShadow: "var(--alexen-shadow)",
    borderRadius: "20px",
    _dark: {
      borderColor: "var(--alexen-line)",
      bg: "gray.750"
    },
    ...rest,
    children
  });
};
const ModalHeader = (props) => usePageMode() ? /* @__PURE__ */ jsx(Box, {
  px: {
    base: 4,
    md: 6
  },
  pt: {
    base: 4,
    md: 5
  },
  pb: 2,
  fontWeight: "semibold",
  ...props
}) : /* @__PURE__ */ jsx(ModalHeader$1, {
  ...props
});
const ModalBody = (props) => {
  if (!usePageMode())
    return /* @__PURE__ */ jsx(ModalBody$1, {
      ...props
    });
  const {
    w,
    width,
    minW,
    maxW,
    ...rest
  } = props;
  return /* @__PURE__ */ jsx(Box, {
    px: {
      base: 4,
      md: 6
    },
    py: 3,
    w: "full",
    ...rest
  });
};
const ModalFooter = (props) => usePageMode() ? /* @__PURE__ */ jsx(HStack, {
  px: {
    base: 4,
    md: 6
  },
  py: 4,
  justifyContent: "flex-end",
  flexWrap: "wrap",
  gap: 2,
  ...props
}) : /* @__PURE__ */ jsx(ModalFooter$1, {
  ...props
});
const SECTIONS = [{
  path: "theme",
  title: "appearance.title",
  sudo: false,
  Component: named(() => __vitePreload(() => Promise.resolve().then(() => AppearancePanel$1), true ? void 0 : void 0), "ThemePage")
}, {
  path: "activity",
  title: "activity.title",
  sudo: false,
  Component: named(() => __vitePreload(() => import("./ActivityPage.5b56310f.js"), true ? ["statics/ActivityPage.5b56310f.js","statics/vendor.0404bf65.js"] : void 0), "ActivityPage")
}, {
  path: "overview",
  title: "overview.title",
  sudo: false,
  Component: named(() => __vitePreload(() => import("./OverviewPage.23a0dabf.js"), true ? ["statics/OverviewPage.23a0dabf.js","statics/vendor.0404bf65.js","statics/flags.7f331219.js"] : void 0), "OverviewPage")
}, {
  path: "statistics",
  title: "stats.title",
  sudo: false,
  flag: "isShowingStats",
  Component: named(() => __vitePreload(() => import("./StatisticsModal.2e92067f.js"), true ? ["statics/StatisticsModal.2e92067f.js","statics/OverviewPage.23a0dabf.js","statics/vendor.0404bf65.js","statics/flags.7f331219.js"] : void 0), "StatisticsModal")
}, {
  path: "admins",
  title: "header.adminsSettings",
  sudo: true,
  flag: "isManagingAdmins",
  Component: named(() => __vitePreload(() => import("./AdminsModal.5db76804.js"), true ? ["statics/AdminsModal.5db76804.js","statics/vendor.0404bf65.js","statics/serverMessage.7228cafd.js"] : void 0), "AdminsModal")
}, {
  path: "nodes",
  title: "header.nodeSettings",
  sudo: true,
  flag: "isEditingNodes",
  Component: named(() => __vitePreload(() => import("./NodesModal.4a9e86f1.js"), true ? ["statics/NodesModal.4a9e86f1.js","statics/vendor.0404bf65.js","statics/NodesContext.620c0414.js","statics/VpnPage.91037de5.js","statics/serverMessage.7228cafd.js","statics/CoreSettingsContext.ae7a60ef.js","statics/flags.7f331219.js","statics/slick.76e767b4.css"] : void 0), "NodesDialog")
}, {
  path: "nodes-usage",
  title: "header.nodesUsage",
  sudo: true,
  flag: "isShowingNodesUsage",
  Component: named(() => __vitePreload(() => import("./NodesUsage.057a3a17.js"), true ? ["statics/NodesUsage.057a3a17.js","statics/NodesContext.620c0414.js","statics/vendor.0404bf65.js"] : void 0), "NodesUsage")
}, {
  path: "hosts",
  title: "header.hostSettings",
  sudo: true,
  flag: "isEditingHosts",
  Component: named(() => __vitePreload(() => import("./HostsDialog.6381661f.js"), true ? ["statics/HostsDialog.6381661f.js","statics/vendor.0404bf65.js","statics/InboundBuilder.0d437d98.js","statics/CoreSettingsContext.ae7a60ef.js","statics/slick.76e767b4.css"] : void 0), "HostsDialog")
}, {
  path: "groups",
  title: "header.groupSettings",
  sudo: true,
  Component: named(() => __vitePreload(() => import("./GroupsPage.3defee7a.js"), true ? ["statics/GroupsPage.3defee7a.js","statics/vendor.0404bf65.js"] : void 0), "GroupsPage")
}, {
  path: "sub",
  title: "header.subSettings",
  sudo: true,
  flag: "isEditingSubSettings",
  Component: named(() => __vitePreload(() => import("./SubSettingsModal.70f23732.js"), true ? ["statics/SubSettingsModal.70f23732.js","statics/vendor.0404bf65.js","statics/DomainSettingsPage.24c465f6.js"] : void 0), "SubSettingsModal")
}, {
  path: "domain",
  title: "domain.title",
  sudo: true,
  Component: named(() => __vitePreload(() => import("./DomainSettingsPage.24c465f6.js"), true ? ["statics/DomainSettingsPage.24c465f6.js","statics/vendor.0404bf65.js"] : void 0), "DomainSettingsPage")
}, {
  path: "external",
  title: "external.title",
  sudo: false,
  Component: named(() => __vitePreload(() => import("./ExternalConfigsPage.d76e6b91.js"), true ? ["statics/ExternalConfigsPage.d76e6b91.js","statics/vendor.0404bf65.js"] : void 0), "ExternalConfigsPage")
}, {
  path: "auto-change",
  title: "autoChange.title",
  sudo: true,
  Component: named(() => __vitePreload(() => import("./AutoChangePage.5c602ae7.js"), true ? ["statics/AutoChangePage.5c602ae7.js","statics/vendor.0404bf65.js"] : void 0), "AutoChangePage")
}, {
  path: "preroute",
  title: "preroutePage.title",
  sudo: true,
  Component: named(() => __vitePreload(() => import("./PreroutePage.307e8a03.js"), true ? ["statics/PreroutePage.307e8a03.js","statics/vendor.0404bf65.js","statics/serverMessage.7228cafd.js"] : void 0), "PreroutePage")
}, {
  path: "vpn",
  title: "vpn.title",
  sudo: true,
  Component: named(() => __vitePreload(() => import("./VpnPage.91037de5.js"), true ? ["statics/VpnPage.91037de5.js","statics/vendor.0404bf65.js","statics/serverMessage.7228cafd.js"] : void 0), "VpnPage")
}, {
  path: "core",
  title: "sidebar.coreSettings",
  sudo: true,
  flag: "isEditingCore",
  Component: named(() => __vitePreload(() => import("./CoreSettingsModal.ba2275d5.js"), true ? ["statics/CoreSettingsModal.ba2275d5.js","statics/vendor.0404bf65.js","statics/CoreSettingsContext.ae7a60ef.js","statics/NodesContext.620c0414.js","statics/InboundBuilder.0d437d98.js","statics/CoreSettingsModal.a1a1c91c.css"] : void 0), "CoreSettingsModal")
}];
const sectionByPath = (pathname) => SECTIONS.find((s2) => pathname.replace(/^\/+|\/+$/g, "") === s2.path);
const HoldFlag = ({
  flag
}) => {
  const on = useDashboard((s2) => s2[flag]);
  react.exports.useEffect(() => {
    if (!on)
      useDashboard.setState({
        [flag]: true
      });
  }, [on, flag]);
  react.exports.useEffect(() => () => useDashboard.setState({
    [flag]: false
  }), [flag]);
  return null;
};
const SectionPage = ({
  section
}) => {
  const {
    Component,
    flag
  } = section;
  const {
    userData,
    getUserIsSuccess
  } = useGetUser();
  if (section.sudo && getUserIsSuccess && !userData.is_sudo)
    return /* @__PURE__ */ jsx(Navigate, {
      to: "/",
      replace: true
    });
  if (section.sudo && !getUserIsSuccess)
    return null;
  return /* @__PURE__ */ jsxs(Box, {
    w: "full",
    mt: {
      base: 3,
      md: 4
    },
    children: [flag && /* @__PURE__ */ jsx(HoldFlag, {
      flag
    }), /* @__PURE__ */ jsx(react.exports.Suspense, {
      fallback: null,
      children: /* @__PURE__ */ jsx(AsPage, {
        children: /* @__PURE__ */ jsx(Component, {})
      })
    })]
  });
};
const iconProps$2 = {
  baseStyle: {
    w: 4,
    h: 4
  }
};
chakra(MoonIcon, iconProps$2);
chakra(SunIcon, iconProps$2);
chakra(Cog6ToothIcon, iconProps$2);
const SettingsIcon$1 = chakra(SwatchIcon, iconProps$2);
const MenuIcon = chakra(Bars3Icon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
chakra(ArrowLeftOnRectangleIcon, iconProps$2);
chakra(CurrencyDollarIcon, iconProps$2);
chakra(LinkIcon, iconProps$2);
chakra(SquaresPlusIcon, iconProps$2);
chakra(ChartPieIcon, iconProps$2);
chakra(DocumentMinusIcon, iconProps$2);
chakra(UsersIcon, iconProps$2);
chakra(ChartPieIcon, iconProps$2);
chakra(RectangleGroupIcon, iconProps$2);
chakra(DocumentTextIcon, iconProps$2);
chakra(Box, {
  baseStyle: {
    bg: "yellow.500",
    w: "2",
    h: "2",
    rounded: "full",
    position: "absolute"
  }
});
const Header = ({
  actions
}) => {
  var _a;
  useGetUser();
  useDashboardPick("onEditingHosts", "onResetAllUsage", "onEditingNodes", "onManagingAdmins", "onShowingStats", "onManagingGroups", "onEditingSubSettings", "onShowingNodesUsage");
  const {
    t: t2
  } = useTranslation();
  const {
    pathname
  } = useLocation();
  const [appearanceOpen, setAppearanceOpen] = react.exports.useState(false);
  const {
    colorMode
  } = useColorMode();
  react.exports.useEffect(() => {
    applyAppearance(getAppearance());
  }, [colorMode]);
  return /* @__PURE__ */ jsxs(HStack, {
    gap: 2,
    justifyContent: "space-between",
    __css: {
      "& .menuList": {
        direction: "ltr"
      }
    },
    position: "relative",
    children: [/* @__PURE__ */ jsxs(HStack, {
      spacing: 2,
      children: [/* @__PURE__ */ jsx(IconButton, {
        display: {
          base: "inline-flex",
          lg: "none"
        },
        size: "sm",
        variant: "ghost",
        "aria-label": "menu",
        icon: /* @__PURE__ */ jsx(MenuIcon, {}),
        onClick: () => useSidebar.getState().setOpen(true)
      }), /* @__PURE__ */ jsx(Text, {
        as: "h1",
        fontWeight: "semibold",
        fontSize: {
          base: "xl",
          md: "2xl"
        },
        isTruncated: true,
        children: t2(((_a = sectionByPath(pathname)) == null ? void 0 : _a.title) || "users")
      })]
    }), /* @__PURE__ */ jsx(Tooltip, {
      label: t2("appearance.title"),
      hasArrow: true,
      children: /* @__PURE__ */ jsx(IconButton, {
        size: "sm",
        variant: "outline",
        borderRadius: "full",
        "aria-label": t2("appearance.title"),
        icon: /* @__PURE__ */ jsx(SettingsIcon$1, {}),
        onClick: () => setAppearanceOpen(true)
      })
    }), /* @__PURE__ */ jsx(AppearancePanel, {
      isOpen: appearanceOpen,
      onClose: () => setAppearanceOpen(false)
    })]
  });
};
const ResetIcon$2 = chakra(DocumentMinusIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const ResetAllUsageModal = () => {
  const [loading, setLoading] = react.exports.useState(false);
  const {
    isResetingAllUsage,
    onResetAllUsage,
    resetAllUsage
  } = useDashboardPick("isResetingAllUsage", "onResetAllUsage", "resetAllUsage");
  const {
    t: t2
  } = useTranslation();
  const toast = useToast();
  const onClose = () => {
    onResetAllUsage(false);
  };
  const onReset = () => {
    setLoading(true);
    resetAllUsage().then(() => {
      toast({
        title: t2("resetAllUsage.success"),
        status: "success",
        isClosable: true,
        position: "top",
        duration: 3e3
      });
    }).catch(() => {
      toast({
        title: t2("resetAllUsage.error"),
        status: "error",
        isClosable: true,
        position: "top",
        duration: 3e3
      });
    }).finally(() => {
      setLoading(false);
    });
  };
  return /* @__PURE__ */ jsxs(Modal$1, {
    isCentered: true,
    isOpen: isResetingAllUsage,
    onClose,
    size: "sm",
    children: [/* @__PURE__ */ jsx(ModalOverlay$1, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent$1, {
      mx: "3",
      children: [/* @__PURE__ */ jsx(ModalHeader$1, {
        pt: 6,
        children: /* @__PURE__ */ jsx(Icon, {
          color: "red",
          children: /* @__PURE__ */ jsx(ResetIcon$2, {})
        })
      }), /* @__PURE__ */ jsx(ModalCloseButton$1, {
        mt: 3
      }), /* @__PURE__ */ jsxs(ModalBody$1, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontWeight: "semibold",
          fontSize: "lg",
          children: t2("resetAllUsage.title")
        }), isResetingAllUsage && /* @__PURE__ */ jsx(Text, {
          mt: 1,
          fontSize: "sm",
          _dark: {
            color: "gray.400"
          },
          color: "gray.600",
          children: t2("resetAllUsage.prompt")
        })]
      }), /* @__PURE__ */ jsxs(ModalFooter$1, {
        display: "flex",
        children: [/* @__PURE__ */ jsx(Button, {
          size: "sm",
          onClick: onClose,
          mr: 3,
          w: "full",
          variant: "outline",
          children: t2("cancel")
        }), /* @__PURE__ */ jsx(Button, {
          size: "sm",
          w: "full",
          colorScheme: "red",
          onClick: onReset,
          leftIcon: loading ? /* @__PURE__ */ jsx(Spinner, {
            size: "xs"
          }) : void 0,
          children: t2("reset")
        })]
      })]
    })]
  });
};
const ResetIcon$1 = chakra(ArrowPathIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const ResetUserUsageModal = () => {
  const [loading, setLoading] = react.exports.useState(false);
  const {
    resetUsageUser: user,
    resetDataUsage
  } = useDashboardPick("resetUsageUser", "resetDataUsage");
  const {
    t: t2
  } = useTranslation();
  const toast = useToast();
  const onClose = () => {
    useDashboard.setState({
      resetUsageUser: null
    });
  };
  const onReset = () => {
    if (user) {
      setLoading(true);
      resetDataUsage(user).then(() => {
        toast({
          title: t2("resetUserUsage.success", {
            username: user.username
          }),
          status: "success",
          isClosable: true,
          position: "top",
          duration: 3e3
        });
      }).catch(() => {
        toast({
          title: t2("resetUserUsage.error"),
          status: "error",
          isClosable: true,
          position: "top",
          duration: 3e3
        });
      }).finally(() => {
        setLoading(false);
      });
    }
  };
  return /* @__PURE__ */ jsxs(Modal$1, {
    isCentered: true,
    isOpen: !!user,
    onClose,
    size: "sm",
    children: [/* @__PURE__ */ jsx(ModalOverlay$1, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent$1, {
      mx: "3",
      children: [/* @__PURE__ */ jsx(ModalHeader$1, {
        pt: 6,
        children: /* @__PURE__ */ jsx(Icon, {
          color: "primary",
          children: /* @__PURE__ */ jsx(ResetIcon$1, {})
        })
      }), /* @__PURE__ */ jsx(ModalCloseButton$1, {
        mt: 3
      }), /* @__PURE__ */ jsxs(ModalBody$1, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontWeight: "semibold",
          fontSize: "lg",
          children: t2("resetUserUsage.title")
        }), user && /* @__PURE__ */ jsx(Text, {
          mt: 1,
          fontSize: "sm",
          _dark: {
            color: "gray.400"
          },
          color: "gray.600",
          children: /* @__PURE__ */ jsx(Trans, {
            components: {
              b: /* @__PURE__ */ jsx("b", {})
            },
            children: t2("resetUserUsage.prompt", {
              username: user.username
            })
          })
        })]
      }), /* @__PURE__ */ jsxs(ModalFooter$1, {
        display: "flex",
        children: [/* @__PURE__ */ jsx(Button, {
          size: "sm",
          onClick: onClose,
          mr: 3,
          w: "full",
          variant: "outline",
          children: t2("cancel")
        }), /* @__PURE__ */ jsx(Button, {
          size: "sm",
          w: "full",
          colorScheme: "primary",
          onClick: onReset,
          leftIcon: loading ? /* @__PURE__ */ jsx(Spinner, {
            size: "xs"
          }) : void 0,
          children: t2("reset")
        })]
      })]
    })]
  });
};
const ResetIcon = chakra(ArrowPathIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const RevokeSubscriptionModal = () => {
  const [loading, setLoading] = react.exports.useState(false);
  const {
    revokeSubscriptionUser: user,
    revokeSubscription
  } = useDashboardPick("revokeSubscriptionUser", "revokeSubscription");
  const {
    t: t2
  } = useTranslation();
  const toast = useToast();
  const onClose = () => {
    useDashboard.setState({
      revokeSubscriptionUser: null
    });
  };
  const onReset = () => {
    if (user) {
      setLoading(true);
      revokeSubscription(user).then(() => {
        toast({
          title: t2("revokeUserSub.success", {
            username: user.username
          }),
          status: "success",
          isClosable: true,
          position: "top",
          duration: 3e3
        });
      }).catch(() => {
        toast({
          title: t2("revokeUserSub.error"),
          status: "error",
          isClosable: true,
          position: "top",
          duration: 3e3
        });
      }).finally(() => {
        setLoading(false);
      });
    }
  };
  return /* @__PURE__ */ jsxs(Modal$1, {
    isCentered: true,
    isOpen: !!user,
    onClose,
    size: "sm",
    children: [/* @__PURE__ */ jsx(ModalOverlay$1, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent$1, {
      mx: "3",
      children: [/* @__PURE__ */ jsx(ModalHeader$1, {
        pt: 6,
        children: /* @__PURE__ */ jsx(Icon, {
          color: "primary",
          children: /* @__PURE__ */ jsx(ResetIcon, {})
        })
      }), /* @__PURE__ */ jsx(ModalCloseButton$1, {
        mt: 3
      }), /* @__PURE__ */ jsxs(ModalBody$1, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontWeight: "semibold",
          fontSize: "lg",
          children: t2("revokeUserSub.title")
        }), user && /* @__PURE__ */ jsx(Text, {
          mt: 1,
          fontSize: "sm",
          _dark: {
            color: "gray.400"
          },
          color: "gray.600",
          children: /* @__PURE__ */ jsx(Trans, {
            components: {
              b: /* @__PURE__ */ jsx("b", {})
            },
            children: t2("revokeUserSub.prompt", {
              username: user.username
            })
          })
        })]
      }), /* @__PURE__ */ jsxs(ModalFooter$1, {
        display: "flex",
        children: [/* @__PURE__ */ jsx(Button, {
          size: "sm",
          onClick: onClose,
          mr: 3,
          w: "full",
          variant: "outline",
          children: t2("cancel")
        }), /* @__PURE__ */ jsx(Button, {
          size: "sm",
          w: "full",
          colorScheme: "primary",
          onClick: onReset,
          leftIcon: loading ? /* @__PURE__ */ jsx(Spinner, {
            size: "xs"
          }) : void 0,
          children: t2("revoke")
        })]
      })]
    })]
  });
};
const iconProps$1 = {
  baseStyle: {
    strokeWidth: "2px",
    w: 4,
    h: 4
  }
};
const ActiveStatusIcon = chakra(WifiIcon, iconProps$1);
const DisabledStatusIcon = chakra(NoSymbolIcon, iconProps$1);
const LimitedStatusIcon = chakra(ExclamationCircleIcon, iconProps$1);
const ExpiredStatusIcon = chakra(ClockIcon, iconProps$1);
const On_holdStatusIcon = chakra(ClockIcon, iconProps$1);
const resetStrategy = [{
  title: "No",
  value: "no_reset"
}, {
  title: "Daily",
  value: "day"
}, {
  title: "Weekly",
  value: "week"
}, {
  title: "Monthly",
  value: "month"
}, {
  title: "Annually",
  value: "year"
}];
const statusColors = {
  active: {
    statusColor: "green",
    bandWidthColor: "primary",
    icon: ActiveStatusIcon
  },
  connected: {
    statusColor: "green",
    bandWidthColor: "primary",
    icon: ActiveStatusIcon
  },
  disabled: {
    statusColor: "gray",
    bandWidthColor: "gray",
    icon: DisabledStatusIcon
  },
  expired: {
    statusColor: "orange",
    bandWidthColor: "orange",
    icon: ExpiredStatusIcon
  },
  on_hold: {
    statusColor: "purple",
    bandWidthColor: "purple",
    icon: On_holdStatusIcon
  },
  connecting: {
    statusColor: "orange",
    bandWidthColor: "orange",
    icon: ExpiredStatusIcon
  },
  limited: {
    statusColor: "red",
    bandWidthColor: "red",
    icon: LimitedStatusIcon
  },
  error: {
    statusColor: "red",
    bandWidthColor: "red",
    icon: LimitedStatusIcon
  }
};
const ApexChart = react.exports.lazy(() => __vitePreload(() => import("./react-apexcharts.min.626ba0e7.js").then((n) => n.r), true ? ["statics/react-apexcharts.min.626ba0e7.js","statics/vendor.0404bf65.js"] : void 0));
const sig = (v) => JSON.stringify(v, (_k, x) => typeof x === "function" ? String(x) : x);
const StableChart = react.exports.memo(({
  options,
  series,
  type,
  height
}) => {
  const many = Array.isArray(series) && series.some((x) => Array.isArray(x == null ? void 0 : x.data) && x.data.length * series.length > 120);
  const opts = react.exports.useMemo(() => ({
    ...options,
    chart: {
      ...(options == null ? void 0 : options.chart) || {},
      animations: {
        enabled: !many,
        speed: 300,
        dynamicAnimation: {
          enabled: false
        }
      }
    }
  }), [sig(options), many]);
  return /* @__PURE__ */ jsx(ApexChart, {
    type,
    options: opts,
    series,
    height
  });
}, (a, b) => a.type === b.type && a.height === b.height && sig(a.series) === sig(b.series) && sig(a.options) === sig(b.options));
const unit = (name, n) => instance.t(`duration.${name}`, { count: Math.abs(n) });
const relativeExpiryDate = (expiryDate) => {
  let dateInfo = { status: "", time: "" };
  if (expiryDate) {
    if (dayjs(expiryDate * 1e3).utc().isAfter(dayjs().utc())) {
      dateInfo.status = "expires";
    } else {
      dateInfo.status = "expired";
    }
    const durationSlots = [];
    const duration = dayjs.duration(
      dayjs(expiryDate * 1e3).utc().diff(dayjs())
    );
    if (duration.years() != 0)
      durationSlots.push(unit("year", duration.years()));
    if (duration.months() != 0)
      durationSlots.push(unit("month", duration.months()));
    if (duration.days() != 0)
      durationSlots.push(unit("day", duration.days()));
    if (durationSlots.length === 0) {
      if (duration.hours() != 0)
        durationSlots.push(unit("hour", duration.hours()));
      if (duration.minutes() != 0)
        durationSlots.push(unit("min", duration.minutes()));
    }
    dateInfo.time = durationSlots.join(", ");
  }
  return dateInfo;
};
const ClearIcon = chakra(XMarkIcon, {
  baseStyle: {
    w: 4,
    h: 4
  }
});
const Input = React.forwardRef(({
  disabled,
  step,
  label,
  className,
  startAdornment,
  endAdornment,
  type = "text",
  placeholder,
  onChange,
  onBlur,
  name,
  value,
  onClick,
  error,
  clearable = false,
  ...props
}, ref) => {
  const clear = () => {
    if (onChange)
      onChange({
        target: {
          value: "",
          name
        }
      });
  };
  const {
    size = "md"
  } = props;
  const Component = type == "number" ? NumberInputField : Input$1;
  const Wrapper = type == "number" ? NumberInput : React.Fragment;
  const wrapperProps = type == "number" ? {
    keepWithinRange: true,
    precision: 5,
    format: (value2) => {
      return isNaN(parseFloat(String(value2))) ? value2 : Number(parseFloat(String(value2)).toFixed(5)) === 0 ? value2 : Number(parseFloat(String(value2)).toFixed(5));
    },
    min: 0,
    step,
    name,
    type,
    placeholder,
    onChange: (v) => {
      if (onChange)
        onChange(v);
    },
    onBlur,
    value,
    onClick,
    disabled,
    flexGrow: 1,
    size
  } : {};
  return /* @__PURE__ */ jsxs(FormControl, {
    isInvalid: !!error,
    children: [label && /* @__PURE__ */ jsx(FormLabel, {
      children: label
    }), /* @__PURE__ */ jsxs(InputGroup, {
      size,
      w: "full",
      rounded: "md",
      _focusWithin: {
        outline: "2px solid",
        outlineColor: "primary.200"
      },
      bg: disabled ? "gray.100" : "transparent",
      _dark: {
        bg: disabled ? "gray.600" : "transparent"
      },
      children: [startAdornment && /* @__PURE__ */ jsx(InputLeftAddon, {
        children: startAdornment
      }), /* @__PURE__ */ jsxs(Wrapper, {
        ...wrapperProps,
        children: [/* @__PURE__ */ jsx(Component, {
          name,
          ref,
          step,
          className: classNames(className),
          type,
          placeholder,
          onChange,
          onBlur,
          value,
          onClick,
          disabled,
          flexGrow: 1,
          _focusVisible: {
            outline: "none",
            borderTopColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: "transparent"
          },
          _disabled: {
            cursor: "not-allowed"
          },
          ...props,
          roundedLeft: startAdornment ? "0" : "md",
          roundedRight: endAdornment ? "0" : "md"
        }), type == "number" && /* @__PURE__ */ jsx(Fragment, {
          children: /* @__PURE__ */ jsxs(NumberInputStepper, {
            children: [/* @__PURE__ */ jsx(NumberIncrementStepper, {}), /* @__PURE__ */ jsx(NumberDecrementStepper, {})]
          })
        })]
      }), endAdornment && /* @__PURE__ */ jsx(InputRightAddon, {
        borderLeftRadius: 0,
        borderRightRadius: "6px",
        bg: "transparent",
        children: endAdornment
      }), clearable && value && value.length && /* @__PURE__ */ jsx(InputRightElement, {
        borderLeftRadius: 0,
        borderRightRadius: "6px",
        bg: "transparent",
        onClick: clear,
        cursor: "pointer",
        children: /* @__PURE__ */ jsx(ClearIcon, {})
      })]
    }), !!error && /* @__PURE__ */ jsx(FormErrorMessage, {
      children: error
    })]
  });
});
const proxyHostSecurity = [{
  title: "Inbound's default",
  value: "inbound_default"
}, {
  title: "TLS",
  value: "tls"
}, {
  title: "None",
  value: "none"
}];
const proxyALPN = [{
  title: "",
  value: ""
}, {
  title: "h3",
  value: "h3"
}, {
  title: "h2",
  value: "h2"
}, {
  title: "http/1.1",
  value: "http/1.1"
}, {
  title: "h3,h2,http/1.1",
  value: "h3,h2,http/1.1"
}, {
  title: "h3,h2",
  value: "h3,h2"
}, {
  title: "h2,http/1.1",
  value: "h2,http/1.1"
}];
const proxyFingerprint = [{
  title: "",
  value: ""
}, ...["chrome", "firefox", "safari", "ios", "android", "edge", "360", "qq", "random", "randomized"].map((key) => ({
  title: key,
  value: key
}))];
const XTLSFlows = [{
  title: "none",
  value: ""
}, {
  title: "xtls-rprx-vision",
  value: "xtls-rprx-vision"
}];
const shadowsocksMethods = ["aes-128-gcm", "aes-256-gcm", "chacha20-ietf-poly1305"];
const SettingsIcon = chakra(EllipsisVerticalIcon, {
  baseStyle: {
    strokeWidth: "2px",
    w: 5,
    h: 5
  }
});
const InboundCard = ({
  inbound,
  ...props
}) => {
  const {
    getCheckboxProps,
    getInputProps,
    getLabelProps,
    htmlProps
  } = useCheckbox(props);
  const inputProps = getInputProps();
  return /* @__PURE__ */ jsxs(Box, {
    as: "label",
    children: [/* @__PURE__ */ jsx("input", {
      ...inputProps
    }), /* @__PURE__ */ jsxs(Box, {
      w: "fll",
      position: "relative",
      ...htmlProps,
      cursor: "pointer",
      borderRadius: "sm",
      border: "1px solid",
      borderColor: "gray.200",
      _dark: {
        borderColor: "gray.600"
      },
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      overflow: "hidden",
      _checked: {
        bg: "gray.50",
        outline: "2px",
        boxShadow: "outline",
        outlineColor: "primary.500",
        borderColor: "transparent",
        fontWeight: "medium",
        _dark: {
          bg: "gray.750",
          borderColor: "transparent"
        },
        "& p": {
          opacity: 1
        }
      },
      __css: {
        "& p": {
          opacity: 0.8
        }
      },
      textTransform: "capitalize",
      px: 3,
      py: 2,
      fontWeight: "medium",
      ...getCheckboxProps(),
      children: [/* @__PURE__ */ jsx(Checkbox, {
        size: "sm",
        w: "full",
        maxW: "full",
        color: "gray.700",
        _dark: {
          color: "gray.300"
        },
        textTransform: "uppercase",
        colorScheme: "primary",
        className: "inbound-item",
        isChecked: inputProps.checked,
        pointerEvents: "none",
        flexGrow: 1,
        children: /* @__PURE__ */ jsx(HStack, {
          justify: "space-between",
          w: "full",
          maxW: "calc(100% - 20px)",
          spacing: 0,
          gap: 2,
          overflow: "hidden",
          children: /* @__PURE__ */ jsxs(Text, {
            isTruncated: true,
            ...getLabelProps(),
            fontSize: "xs",
            children: [inbound.tag, " ", /* @__PURE__ */ jsxs(Text, {
              as: "span",
              children: ["(", inbound.network, ")"]
            })]
          })
        })
      }), inbound.tls && inbound.tls != "none" && /* @__PURE__ */ jsx(Badge, {
        fontSize: "xs",
        opacity: ".8",
        size: "xs",
        children: inbound.tls
      })]
    })]
  });
};
const RadioCard = ({
  disabled,
  title,
  label,
  description,
  toggleAccordion,
  isSelected,
  ...props
}) => {
  const form = useFormContext();
  const {
    inbounds
  } = useDashboardPick("inbounds");
  const {
    getCheckboxProps,
    getInputProps,
    getLabelProps,
    htmlProps
  } = useCheckbox(props);
  const inputProps = getInputProps();
  const [inBoundDefaultValue] = useWatch({
    name: [`inbounds.${title}`],
    control: form.control
  });
  const {
    getCheckboxProps: getInboundCheckboxProps
  } = useCheckboxGroup({
    value: inBoundDefaultValue,
    onChange: (selectedInbounds) => {
      form.setValue(`inbounds.${title}`, selectedInbounds);
      if (selectedInbounds.length === 0) {
        const selected_proxies = form.getValues("selected_proxies");
        form.setValue(`selected_proxies`, selected_proxies.filter((p) => p !== title));
        toggleAccordion();
      }
    }
  });
  const isPartialSelected = inBoundDefaultValue && isSelected && (useDashboard.getState().inbounds.get(title) || []).length !== inBoundDefaultValue.length;
  const protocolHasInbound = (useDashboard.getState().inbounds.get(title) || []).length > 0;
  const shouldBeDisabled = !isSelected && !protocolHasInbound;
  return /* @__PURE__ */ jsxs(AccordionItem, {
    isDisabled: !protocolHasInbound,
    borderRadius: "md",
    borderStyle: "solid",
    border: "1px",
    borderColor: "gray.200",
    bg: shouldBeDisabled ? "gray.100" : "transparent",
    _dark: {
      borderColor: "gray.600",
      bg: shouldBeDisabled ? "gray.600" : "transparent"
    },
    _checked: {
      bg: "gray.50",
      outline: "2px",
      boxShadow: "outline",
      outlineColor: "primary.500",
      borderColor: "transparent"
    },
    ...getCheckboxProps(),
    children: [/* @__PURE__ */ jsxs(Box, {
      as: shouldBeDisabled ? "span" : "label",
      position: "relative",
      children: [isPartialSelected && /* @__PURE__ */ jsx(Box, {
        position: "absolute",
        w: "2",
        h: "2",
        bg: "yellow.500",
        top: "-1",
        right: "-1",
        rounded: "full",
        zIndex: 999
      }), /* @__PURE__ */ jsx("input", {
        ...inputProps
      }), /* @__PURE__ */ jsxs(Box, {
        w: "fll",
        position: "relative",
        ...htmlProps,
        borderRadius: "md",
        cursor: shouldBeDisabled ? "not-allowed" : "pointer",
        _checked: {
          fontWeight: "medium",
          _dark: {
            bg: "gray.750",
            borderColor: "transparent"
          },
          "& > svg": {
            opacity: 1,
            "&.checked": {
              display: "block"
            },
            "&.unchecked": {
              display: "none"
            }
          },
          "& p": {
            opacity: 1
          }
        },
        __css: {
          "& > svg": {
            opacity: 0.3,
            "&.checked": {
              display: "none"
            },
            "&.unchecked": {
              display: "block"
            }
          },
          "& p": {
            opacity: 0.8
          }
        },
        textTransform: "capitalize",
        px: 3,
        py: 2,
        fontWeight: "medium",
        ...getCheckboxProps(),
        children: [/* @__PURE__ */ jsx(AccordionButton, {
          display: inputProps.checked && protocolHasInbound ? "block" : "none",
          as: "span",
          className: "checked",
          color: "primary.200",
          position: "absolute",
          right: "3",
          top: "3",
          w: "auto",
          p: 0,
          onClick: toggleAccordion,
          children: /* @__PURE__ */ jsx(IconButton, {
            size: "sm",
            "aria-label": "inbound settings",
            children: /* @__PURE__ */ jsx(SettingsIcon, {})
          })
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          color: shouldBeDisabled ? "gray.400" : "gray.700",
          _dark: {
            color: shouldBeDisabled ? "gray.500" : "gray.300"
          },
          ...getLabelProps(),
          children: label != null ? label : title
        }), /* @__PURE__ */ jsx(Text, {
          fontWeight: "medium",
          color: shouldBeDisabled ? "gray.400" : "gray.600",
          _dark: {
            color: shouldBeDisabled ? "gray.500" : "gray.400"
          },
          fontSize: "xs",
          children: description
        })]
      })]
    }), /* @__PURE__ */ jsx(AccordionPanel, {
      px: 2,
      pb: 3,
      roundedBottom: "5px",
      pt: 3,
      _dark: {
        bg: inputProps.checked && "gray.750"
      },
      children: /* @__PURE__ */ jsxs(VStack, {
        w: "full",
        rowGap: 2,
        borderStyle: "solid",
        borderWidth: "1px",
        borderRadius: "md",
        pl: 3,
        pr: 3,
        pt: 1.5,
        _dark: {
          bg: "gray.700"
        },
        children: [/* @__PURE__ */ jsxs(VStack, {
          alignItems: "flex-start",
          w: "full",
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "sm",
            children: t("inbound")
          }), /* @__PURE__ */ jsx(SimpleGrid, {
            gap: 2,
            alignItems: "flex-start",
            w: "full",
            columns: 1,
            spacing: 1,
            children: (inbounds.get(title) || []).map((inbound) => {
              return /* @__PURE__ */ jsx(InboundCard, {
                ...getInboundCheckboxProps({
                  value: inbound.tag
                }),
                inbound
              }, inbound.tag);
            })
          })]
        }), title === "vmess" && isSelected && /* @__PURE__ */ jsx(VStack, {
          alignItems: "flex-start",
          w: "full",
          children: /* @__PURE__ */ jsxs(FormControl, {
            height: "66px",
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              pb: 1,
              children: "ID"
            }), /* @__PURE__ */ jsx(Input$1, {
              fontSize: "xs",
              size: "sm",
              borderRadius: "8px",
              pl: 2,
              pr: 2,
              placeholder: t("userDialog.generatedByDefault"),
              ...form.register("proxies.vmess.id")
            })]
          })
        }), title === "vless" && isSelected && /* @__PURE__ */ jsxs(VStack, {
          alignItems: "flex-start",
          w: "full",
          children: [/* @__PURE__ */ jsxs(FormControl, {
            height: "66px",
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              pb: 1,
              children: "ID"
            }), /* @__PURE__ */ jsx(Input$1, {
              fontSize: "xs",
              size: "sm",
              borderRadius: "8px",
              pl: 2,
              pr: 2,
              placeholder: t("userDialog.generatedByDefault"),
              ...form.register("proxies.vless.id")
            })]
          }), /* @__PURE__ */ jsxs(FormControl, {
            height: "66px",
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              pb: 1,
              children: "Flow"
            }), /* @__PURE__ */ jsx(Select, {
              fontSize: "xs",
              size: "sm",
              borderRadius: "8px",
              ...form.register("proxies.vless.flow"),
              children: XTLSFlows.map((entry) => /* @__PURE__ */ jsx("option", {
                value: entry.value,
                children: entry.title
              }, entry.title))
            })]
          })]
        }), title === "trojan" && isSelected && /* @__PURE__ */ jsx(VStack, {
          alignItems: "flex-start",
          w: "full",
          children: /* @__PURE__ */ jsxs(FormControl, {
            height: "66px",
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              pb: 1,
              children: t("password")
            }), /* @__PURE__ */ jsx(Input$1, {
              fontSize: "xs",
              size: "sm",
              borderRadius: "8px",
              pl: 2,
              pr: 2,
              placeholder: t("userDialog.generatedByDefault"),
              ...form.register("proxies.trojan.password")
            })]
          })
        }), title === "hysteria" && isSelected && /* @__PURE__ */ jsx(VStack, {
          alignItems: "flex-start",
          w: "full",
          children: /* @__PURE__ */ jsxs(FormControl, {
            height: "66px",
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              pb: 1,
              children: t("password")
            }), /* @__PURE__ */ jsx(Input$1, {
              fontSize: "xs",
              size: "sm",
              borderRadius: "8px",
              pl: 2,
              pr: 2,
              placeholder: t("userDialog.generatedByDefault"),
              ...form.register("proxies.hysteria.auth")
            })]
          })
        }), title === "shadowsocks" && isSelected && /* @__PURE__ */ jsxs(VStack, {
          alignItems: "flex-start",
          w: "full",
          children: [/* @__PURE__ */ jsxs(FormControl, {
            height: "66px",
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              pb: 1,
              children: t("password")
            }), /* @__PURE__ */ jsx(Input$1, {
              fontSize: "xs",
              size: "sm",
              borderRadius: "8px",
              pl: 2,
              pr: 2,
              placeholder: t("userDialog.generatedByDefault"),
              ...form.register("proxies.shadowsocks.password")
            })]
          }), /* @__PURE__ */ jsxs(FormControl, {
            height: "66px",
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              pb: 1,
              children: t("userDialog.method")
            }), /* @__PURE__ */ jsx(Select, {
              fontSize: "xs",
              size: "sm",
              borderRadius: "8px",
              ...form.register("proxies.shadowsocks.method"),
              children: shadowsocksMethods.map((method) => /* @__PURE__ */ jsx("option", {
                value: method,
                children: method
              }, method))
            })]
          })]
        })]
      })
    })]
  });
};
const RadioGroup = react.exports.forwardRef(({
  name,
  list,
  onChange,
  disabled,
  ...props
}, ref) => {
  const form = useFormContext();
  const [expandedAccordions, setExpandedAccordions] = react.exports.useState([]);
  const toggleAccordion = (i) => {
    if (expandedAccordions.includes(i))
      expandedAccordions.splice(expandedAccordions.indexOf(i), 1);
    else
      expandedAccordions.push(i);
    setExpandedAccordions([...expandedAccordions]);
  };
  const {
    getCheckboxProps
  } = useCheckboxGroup({
    value: props.value,
    onChange: (value) => {
      var _a;
      const selectedItem = value.filter((el) => !props.value.includes(el));
      if (selectedItem[0]) {
        form.setValue(`inbounds.${selectedItem[0]}`, (_a = useDashboard.getState().inbounds.get(selectedItem[0])) == null ? void 0 : _a.map((i) => i.tag));
      }
      setExpandedAccordions(expandedAccordions.filter((i) => {
        return value.find((title) => title === list[i].title);
      }));
      onChange({
        target: {
          value,
          name
        }
      });
    }
  });
  return /* @__PURE__ */ jsx(Accordion, {
    allowToggle: true,
    index: expandedAccordions,
    children: /* @__PURE__ */ jsx(SimpleGrid, {
      ref,
      gap: 2,
      alignItems: "flex-start",
      columns: 1,
      spacing: 1,
      children: list.map((value, index2) => {
        return /* @__PURE__ */ jsx(RadioCard, {
          toggleAccordion: toggleAccordion.bind(null, index2),
          disabled,
          title: value.title,
          label: value.label,
          description: value.description,
          isSelected: !!props.value.find((v) => v === value.title),
          ...getCheckboxProps({
            value: value.title
          })
        }, value.title);
      })
    })
  });
});
const SOFT = ["#5b7cfa", "#3fb68b", "#e9a23b", "#e46f9f", "#2fb3c6", "#a26cf0", "#ef7a6b", "#62708a"];
function generateDistinctColors(numColors) {
  const colors = SOFT.slice(0, numColors);
  const extra = numColors - colors.length;
  for (let i = 0; i < extra; i++) {
    colors.push(hslToHex(i * 360 / Math.max(extra, 1) + 20, 55, 60));
  }
  return colors;
}
function hslToHex(h, s2, l) {
  h /= 360;
  s2 /= 100;
  l /= 100;
  let r, g, b;
  if (s2 === 0) {
    r = g = b = l;
  } else {
    const hueToRgb = (p2, q2, t2) => {
      if (t2 < 0)
        t2 += 1;
      if (t2 > 1)
        t2 -= 1;
      if (t2 < 1 / 6)
        return p2 + (q2 - p2) * 6 * t2;
      if (t2 < 1 / 2)
        return q2;
      if (t2 < 2 / 3)
        return p2 + (q2 - p2) * (2 / 3 - t2) * 6;
      return p2;
    };
    const q = l < 0.5 ? l * (1 + s2) : l + s2 - l * s2;
    const p = 2 * l - q;
    r = Math.round(hueToRgb(p, q, h + 1 / 3) * 255);
    g = Math.round(hueToRgb(p, q, h) * 255);
    b = Math.round(hueToRgb(p, q, h - 1 / 3) * 255);
  }
  const toHex = (c) => {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
const FilterItem = ({
  border,
  ...props
}) => {
  const {
    getInputProps,
    getRadioProps
  } = useRadio(props);
  const fontSize = useBreakpointValue({
    base: "xs",
    md: "sm"
  });
  return /* @__PURE__ */ jsxs(Box, {
    as: "label",
    children: [/* @__PURE__ */ jsx("input", {
      ...getInputProps()
    }), /* @__PURE__ */ jsx(Box, {
      ...getRadioProps(),
      className: "alexen-chip",
      minW: "48px",
      w: "full",
      h: "full",
      textAlign: "center",
      cursor: "pointer",
      fontSize,
      borderWidth: border ? "1px" : "0px",
      borderRadius: "md",
      _checked: {
        bg: "primary.500",
        color: "white",
        borderColor: "primary.500"
      },
      _focus: {
        boxShadow: "outline"
      },
      px: 3,
      py: 1,
      children: props.children
    })]
  });
};
const UsageFilter = ({
  onChange,
  defaultValue,
  ...props
}) => {
  const {
    t: t2,
    i18n
  } = useTranslation();
  useColorMode();
  const filterOptions = useBreakpointValue({
    base: ["7h", "1d", "3d", "1w"],
    md: ["7h", "1d", "3d", "1w", "1m", "3m"]
  });
  const filterOptionTypes = {
    h: "hour",
    d: "day",
    w: "week",
    m: "month",
    y: "year"
  };
  const customFilterOptions = useBreakpointValue({
    base: [{
      title: "hours",
      options: ["1h", "3h", "6h", "12h"]
    }, {
      title: "days",
      options: ["1d", "2d", "3d", "4d"]
    }, {
      title: "weeks",
      options: ["1w", "2w", "3w", "4w"]
    }, {
      title: "months",
      options: ["1m", "2m", "3m", "6m"]
    }],
    md: [{
      title: "hours",
      options: ["1h", "2h", "3h", "6h", "8h", "12h"]
    }, {
      title: "days",
      options: ["1d", "2d", "3d", "4d", "5d", "6d"]
    }, {
      title: "weeks",
      options: ["1w", "2w", "3w", "4w"]
    }, {
      title: "months",
      options: ["1m", "2m", "3m", "6m", "8m"]
    }]
  });
  const {
    getRootProps,
    getRadioProps,
    setValue: setDefaultFilter
  } = useRadioGroup({
    name: "filter",
    defaultValue,
    onChange: (value) => {
      if (value === "custom") {
        return;
      }
      closeCustom();
      if (filterOptions.indexOf(value) >= 0) {
        setCustomLabel(t2("userDialog.custom"));
        setCustom(false);
      } else {
        setCustomLabel(t2("userDialog.custom") + ` (${value})`);
        setCustom(true);
      }
      const num = Number(value.substring(0, value.length - 1));
      const unit2 = filterOptionTypes[value[value.length - 1]];
      onChange(value, {
        start: dayjs().utc().subtract(num, unit2).format("YYYY-MM-DDTHH:00:00")
      });
    }
  });
  const {
    isOpen: isCustomOpen,
    onOpen: openCustom,
    onClose: closeCustom
  } = useDisclosure();
  const customRef = react.exports.useRef(null);
  useOutsideClick({
    ref: customRef,
    handler: closeCustom
  });
  const [customLabel, setCustomLabel] = react.exports.useState(t2("userDialog.custom"));
  const [custom, setCustom] = react.exports.useState(false);
  const [tabIndex, setTabIndex] = react.exports.useState(0);
  const monthsShown = useBreakpointValue({
    base: 1,
    md: 2
  });
  const fontSize = useBreakpointValue({
    base: "xs",
    md: "sm"
  });
  const [startDate, setStartDate] = react.exports.useState(null);
  const [endDate, setEndDate] = react.exports.useState(null);
  const onDateChange = (dates) => {
    const [start, end] = dates;
    if (endDate && !end) {
      setStartDate(null);
      setEndDate(null);
    } else {
      setStartDate(start);
      setEndDate(end);
      if (start && end) {
        closeCustom();
        onChange("custom", {
          start: dayjs(start).format("YYYY-MM-DDT00:00:00"),
          end: dayjs(end).format("YYYY-MM-DDT23:59:59")
        });
      }
    }
  };
  return /* @__PURE__ */ jsxs(VStack, {
    ...props,
    children: [tabIndex == 0 && /* @__PURE__ */ jsxs(SimpleGrid, {
      ...getRootProps(),
      gap: 0,
      display: "flex",
      borderWidth: "1px",
      borderRadius: "md",
      minW: {
        base: "320px",
        md: "400px"
      },
      children: [filterOptions.map((value) => {
        return /* @__PURE__ */ jsx(FilterItem, {
          ...getRadioProps({
            value
          }),
          children: value
        }, value);
      }), /* @__PURE__ */ jsx(Box, {
        onClick: () => {
          setStartDate(null);
          setEndDate(null);
          openCustom();
        },
        cursor: "pointer",
        borderRadius: "md",
        w: "full",
        fontSize,
        px: 3,
        py: 1,
        bg: custom ? "primary.500" : "unset",
        color: custom ? "white" : "unset",
        borderColor: custom ? "primary.500" : "unset",
        children: /* @__PURE__ */ jsxs(HStack, {
          children: [/* @__PURE__ */ jsx(Text, {
            children: customLabel
          }), /* @__PURE__ */ jsx(Icon$1, {
            as: CalendarIcon,
            boxSize: "18px"
          })]
        })
      })]
    }), tabIndex == 1 && /* @__PURE__ */ jsxs(HStack, {
      onClick: openCustom,
      cursor: "pointer",
      fontSize,
      borderRadius: "md",
      px: 3,
      py: 1,
      minW: {
        base: "320px",
        md: "400px"
      },
      borderWidth: "1px",
      children: [/* @__PURE__ */ jsx(Text, {
        w: "full",
        color: startDate ? "unset" : "gray.500",
        children: startDate ? dayjs(startDate).format("YYYY-MM-DD (00:00)") : t2("userDialog.startDate")
      }), /* @__PURE__ */ jsx(Icon$1, {
        as: ChevronRightIcon,
        boxSize: "18px"
      }), /* @__PURE__ */ jsx(Text, {
        w: "full",
        color: endDate ? "unset" : "gray.500",
        children: endDate ? dayjs(endDate).format("YYYY-MM-DD (23:59)") : t2("userDialog.endDate")
      }), /* @__PURE__ */ jsx(Icon$1, {
        as: CalendarIcon,
        boxSize: "18px"
      })]
    }), /* @__PURE__ */ jsx(VStack, {
      ref: customRef,
      marginTop: "40px !important",
      borderRadius: "md",
      borderWidth: "1px",
      position: "absolute",
      zIndex: "1",
      backgroundColor: "var(--app-surface)",
      _dark: {
        backgroundColor: "gray.700"
      },
      display: isCustomOpen ? "unset" : "none",
      children: /* @__PURE__ */ jsxs(Tabs, {
        onChange: (index2) => setTabIndex(index2),
        children: [/* @__PURE__ */ jsxs(TabList, {
          children: [/* @__PURE__ */ jsx(Tab, {
            fontSize,
            children: t2("userDialog.relative")
          }), /* @__PURE__ */ jsx(Tab, {
            fontSize,
            children: t2("userDialog.absolute")
          })]
        }), /* @__PURE__ */ jsxs(TabPanels, {
          children: [/* @__PURE__ */ jsx(TabPanel, {
            children: customFilterOptions.map((row) => {
              return /* @__PURE__ */ jsx(VStack, {
                alignItems: "start",
                pl: 2,
                pr: 2,
                children: /* @__PURE__ */ jsxs(HStack, {
                  justifyItems: "flex-start",
                  mb: 4,
                  children: [/* @__PURE__ */ jsx(Text, {
                    fontSize,
                    minW: "60px",
                    children: t2("userDialog." + row.title)
                  }), row.options.map((value) => {
                    return /* @__PURE__ */ jsx(FilterItem, {
                      border: true,
                      ...getRadioProps({
                        value
                      }),
                      children: value
                    }, value + ".custom");
                  })]
                })
              }, row.title);
            })
          }), /* @__PURE__ */ jsx(TabPanel, {
            className: "datepicker-panel",
            children: /* @__PURE__ */ jsx(VStack, {
              children: /* @__PURE__ */ jsx(Ht, {
                locale: i18n.language.toLocaleLowerCase(),
                selected: startDate,
                onChange: onDateChange,
                startDate,
                endDate,
                selectsRange: true,
                maxDate: new Date(),
                monthsShown,
                peekNextMonth: false,
                inline: true
              })
            })
          })]
        })]
      })
    })]
  });
};
function createUsageConfig(colorMode, title, series = [], labels = []) {
  const total = formatBytes(series.reduce((t2, c) => t2 += c, 0));
  return {
    series,
    options: {
      labels,
      chart: {
        width: "100%",
        height: "100%",
        type: "donut",
        animations: {
          enabled: false
        }
      },
      title: {
        text: `${title}${total}`,
        align: "center",
        style: {
          fontWeight: "var(--chakra-fontWeights-medium)",
          color: colorMode === "dark" ? "var(--chakra-colors-gray-300)" : void 0
        }
      },
      legend: {
        position: "bottom",
        labels: {
          colors: colorMode === "dark" ? "#CBD5E0" : void 0,
          useSeriesColors: false
        }
      },
      stroke: {
        width: 1,
        colors: void 0
      },
      dataLabels: {
        formatter: (val, {
          seriesIndex,
          w
        }) => {
          return formatBytes(w.config.series[seriesIndex], 1);
        }
      },
      tooltip: {
        custom: ({
          series: series2,
          seriesIndex,
          dataPointIndex,
          w
        }) => {
          const readable = formatBytes(series2[seriesIndex], 1);
          const total2 = Math.max(series2.reduce((t2, c) => t2 += c), 1);
          const percent = Math.round(series2[seriesIndex] / total2 * 1e3) / 10 + "%";
          return `
            <div style="
                    background-color: ${w.globals.colors[seriesIndex]};
                    padding-left:12px;
                    padding-right:12px;
                    padding-top:6px;
                    padding-bottom:6px;
                    font-size:0.725rem;
                  "
            >
              ${w.config.labels[seriesIndex]}: <b>${percent}, ${readable}</b>
            </div>
          `;
        }
      },
      colors: generateDistinctColors(series.length)
    }
  };
}
const DeleteIcon = chakra(TrashIcon, {
  baseStyle: {
    w: 4,
    h: 4
  }
});
const UserDevices = ({
  username
}) => {
  var _a;
  const {
    t: t2
  } = useTranslation();
  const {
    data,
    refetch
  } = useQuery({
    queryKey: ["user-devices", username],
    queryFn: () => fetch$1(`/user/${username}/devices`)
  });
  const devices = (_a = data == null ? void 0 : data.devices) != null ? _a : [];
  const removeDevice = (id) => fetch$1(`/user/${username}/devices/${id}`, {
    method: "DELETE"
  }).then(() => refetch());
  return /* @__PURE__ */ jsxs(VStack, {
    alignItems: "flex-start",
    w: "full",
    spacing: 2,
    children: [/* @__PURE__ */ jsxs(Text, {
      fontSize: "sm",
      fontWeight: "medium",
      children: [t2("devices.title"), " (", devices.length, (data == null ? void 0 : data.hwid_limit) ? ` / ${data.hwid_limit}` : "", ")"]
    }), devices.length === 0 && /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      children: t2("devices.empty")
    }), devices.map((device) => {
      var _a2;
      return /* @__PURE__ */ jsx(Box, {
        w: "full",
        borderWidth: "1px",
        borderRadius: "8px",
        px: 3,
        py: 2,
        _dark: {
          borderColor: "gray.600"
        },
        children: /* @__PURE__ */ jsxs(HStack, {
          justifyContent: "space-between",
          alignItems: "flex-start",
          children: [/* @__PURE__ */ jsxs(VStack, {
            alignItems: "flex-start",
            spacing: 0,
            children: [/* @__PURE__ */ jsxs(Text, {
              fontSize: "sm",
              children: [device.device_model || t2("devices.unknownModel"), device.platform && ` \xB7 ${device.platform} ${(_a2 = device.os_version) != null ? _a2 : ""}`]
            }), /* @__PURE__ */ jsx(Text, {
              fontSize: "xs",
              color: "gray.500",
              children: device.user_agent
            }), /* @__PURE__ */ jsxs(Text, {
              fontSize: "xs",
              color: "gray.500",
              children: [t2("devices.lastSeen"), ":", " ", dayjs.utc(device.updated_at).local().format("YYYY-MM-DD HH:mm")]
            })]
          }), /* @__PURE__ */ jsx(Tooltip, {
            label: t2("devices.remove"),
            children: /* @__PURE__ */ jsx(IconButton, {
              "aria-label": t2("devices.remove"),
              size: "xs",
              variant: "ghost",
              colorScheme: "red",
              icon: /* @__PURE__ */ jsx(DeleteIcon, {}),
              onClick: () => removeDevice(device.id)
            })
          })]
        })
      }, device.id);
    })]
  });
};
const useLiveTraffic = (enabled = true) => useQuery({
  queryKey: "live-traffic",
  queryFn: () => fetch$1("/traffic/live"),
  refetchInterval: 1e4,
  enabled
});
const useUserLive = (username) => useQuery({
  queryKey: "live-traffic",
  queryFn: () => fetch$1("/traffic/live"),
  refetchInterval: 1e4,
  select: (d) => {
    var _a;
    return (_a = d.users) == null ? void 0 : _a[username];
  },
  notifyOnChangeProps: ["data"]
}).data;
const formatRate = (bytesPerSecond) => {
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let v = bytesPerSecond || 0;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
};
const IconText = ({
  icon,
  children,
  title,
  ...props
}) => /* @__PURE__ */ jsxs(HStack, {
  spacing: 1,
  title,
  minW: 0,
  children: [/* @__PURE__ */ jsx(Icon$1, {
    as: icon,
    boxSize: "13px",
    flexShrink: 0,
    opacity: 0.8
  }), /* @__PURE__ */ jsx(Text, {
    as: "span",
    isTruncated: true,
    ...props,
    children
  })]
});
const UserLiveTag = ({
  username
}) => {
  const u = useUserLive(username);
  if (!u || u.rate < 1)
    return null;
  const tags = Object.entries(u.inbounds).filter(([, r]) => r >= 1).sort((a, b) => b[1] - a[1]);
  const detail = tags.map(([tag, r]) => `${tag}: ${formatRate(r)}`).join("\n");
  return /* @__PURE__ */ jsx(Tooltip, {
    label: /* @__PURE__ */ jsx(Text, {
      whiteSpace: "pre",
      children: detail
    }),
    placement: "top",
    hasArrow: true,
    children: /* @__PURE__ */ jsxs(HStack, {
      spacing: 1,
      fontSize: "xs",
      color: "primary.500",
      minW: 0,
      children: [/* @__PURE__ */ jsx(Icon$1, {
        as: ArrowsUpDownIcon,
        boxSize: "13px",
        flexShrink: 0
      }), /* @__PURE__ */ jsx(Text, {
        as: "span",
        whiteSpace: "nowrap",
        fontWeight: "medium",
        children: formatRate(u.rate)
      }), tags[0] && /* @__PURE__ */ jsxs(Text, {
        as: "span",
        color: "gray.500",
        isTruncated: true,
        maxW: "160px",
        children: ["\xB7 ", tags[0][0], tags.length > 1 ? ` +${tags.length - 1}` : ""]
      })]
    })
  });
};
const KickIcon = chakra(XMarkIcon, {
  baseStyle: {
    w: 4,
    h: 4
  }
});
const UnblockIcon = chakra(ArrowPathIcon, {
  baseStyle: {
    w: 4,
    h: 4
  }
});
const UserOnlineIPs = ({
  username
}) => {
  var _a;
  const {
    t: t2
  } = useTranslation();
  const {
    data,
    refetch
  } = useQuery({
    queryKey: ["user-online-ips", username],
    queryFn: () => fetch$1(`/user/${username}/online-ips`),
    refetchInterval: 1e4
  });
  const ips = (_a = data == null ? void 0 : data.ips) != null ? _a : [];
  const uniqueIps = new Set(ips.map((i) => i.ip)).size;
  const perIp = ips.reduce((m, i) => ({
    ...m,
    [i.ip]: (m[i.ip] || 0) + 1
  }), {});
  const kick = (ip) => fetch$1(`/user/${username}/online-ips/${ip}`, {
    method: "DELETE"
  }).then(() => refetch());
  const unblock = (ip) => fetch$1(`/user/${username}/online-ips/${ip}/unblock`, {
    method: "POST"
  }).then(() => refetch());
  return /* @__PURE__ */ jsxs(VStack, {
    alignItems: "flex-start",
    w: "full",
    spacing: 2,
    children: [/* @__PURE__ */ jsxs(Text, {
      fontSize: "sm",
      fontWeight: "medium",
      children: [t2("online.connectedIps"), " (", uniqueIps, ")"]
    }), ips.length === 0 && /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      children: t2("online.notConnected")
    }), ips.map((ip) => {
      var _a2, _b;
      return /* @__PURE__ */ jsxs(Box, {
        w: "full",
        borderWidth: "1px",
        borderRadius: "8px",
        px: 3,
        py: 2,
        _dark: {
          borderColor: "gray.600"
        },
        children: [/* @__PURE__ */ jsxs(HStack, {
          justifyContent: "space-between",
          children: [/* @__PURE__ */ jsxs(HStack, {
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "sm",
              fontFamily: "mono",
              children: ip.ip
            }), ip.blocked && /* @__PURE__ */ jsx(Badge, {
              colorScheme: "red",
              fontSize: "2xs",
              children: t2("online.blocked")
            }), perIp[ip.ip] > 1 && /* @__PURE__ */ jsx(Tooltip, {
              label: t2("online.sharedIp", {
                count: perIp[ip.ip]
              }),
              children: /* @__PURE__ */ jsxs(Badge, {
                colorScheme: "orange",
                fontSize: "2xs",
                children: ["\xD7", perIp[ip.ip]]
              })
            })]
          }), /* @__PURE__ */ jsxs(HStack, {
            children: [/* @__PURE__ */ jsx(Text, {
              fontSize: "xs",
              color: "gray.500",
              children: dayjs.utc(ip.last_seen).local().format("HH:mm:ss")
            }), ip.blocked ? /* @__PURE__ */ jsx(Tooltip, {
              label: t2("online.unblock"),
              children: /* @__PURE__ */ jsx(IconButton, {
                "aria-label": "unblock",
                size: "xs",
                variant: "ghost",
                colorScheme: "green",
                icon: /* @__PURE__ */ jsx(UnblockIcon, {}),
                onClick: () => unblock(ip.ip)
              })
            }) : /* @__PURE__ */ jsx(Tooltip, {
              label: t2("online.disconnect"),
              children: /* @__PURE__ */ jsx(IconButton, {
                "aria-label": "disconnect",
                size: "xs",
                variant: "ghost",
                colorScheme: "red",
                icon: /* @__PURE__ */ jsx(KickIcon, {}),
                onClick: () => kick(ip.ip)
              })
            })]
          })]
        }), (ip.provider || ip.connected_seconds > 0) && /* @__PURE__ */ jsxs(Text, {
          fontSize: "xs",
          color: "gray.500",
          children: [ip.provider || "", ip.provider && ip.connected_seconds > 0 ? " \xB7 " : "", ip.connected_seconds > 0 ? `${Math.floor(ip.connected_seconds / 60)}m ${ip.connected_seconds % 60}s` : ""]
        }), (ip.protocol || ((_a2 = ip.rate) != null ? _a2 : 0) >= 1) && /* @__PURE__ */ jsxs(HStack, {
          mt: 1,
          spacing: 3,
          fontSize: "xs",
          children: [ip.protocol && /* @__PURE__ */ jsx(Text, {
            color: "gray.500",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
            children: ip.protocol
          }), ((_b = ip.rate) != null ? _b : 0) >= 1 && /* @__PURE__ */ jsx(Text, {
            color: "primary.500",
            fontWeight: "medium",
            children: formatRate(ip.rate)
          })]
        }), /* @__PURE__ */ jsxs(Wrap, {
          mt: 1,
          spacing: 1,
          children: [ip.nodes.map((node) => /* @__PURE__ */ jsx(Badge, {
            colorScheme: "purple",
            fontSize: "2xs",
            children: node
          }, node)), ip.inbounds.map((inbound) => /* @__PURE__ */ jsx(Badge, {
            colorScheme: "primary",
            fontSize: "2xs",
            children: inbound
          }, inbound))]
        })]
      }, `${ip.ip}-${ip.inbounds[0] || ""}`);
    })]
  });
};
const AddUserIcon = chakra(UserPlusIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const EditUserIcon = chakra(PencilIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const UserUsageIcon = chakra(ChartPieIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const formatUser = (user) => {
  return {
    ...user,
    data_limit: user.data_limit ? Number((user.data_limit / 1073741824).toFixed(5)) : user.data_limit,
    on_hold_expire_duration: user.on_hold_expire_duration ? Number(user.on_hold_expire_duration / (24 * 60 * 60)) : user.on_hold_expire_duration,
    selected_proxies: Object.keys(user.proxies)
  };
};
const getDefaultValues = () => {
  const defaultInbounds = Object.fromEntries(useDashboard.getState().inbounds);
  const inbounds = {};
  for (const key in defaultInbounds) {
    inbounds[key] = defaultInbounds[key].map((i) => i.tag);
  }
  return {
    selected_proxies: Object.keys(defaultInbounds),
    data_limit: null,
    expire: null,
    username: "",
    data_limit_reset_strategy: "no_reset",
    ip_limit: null,
    hwid_limit: null,
    status: "active",
    on_hold_expire_duration: null,
    note: "",
    inbounds,
    proxies: {
      vless: {
        id: "",
        flow: ""
      },
      vmess: {
        id: ""
      },
      trojan: {
        password: ""
      },
      shadowsocks: {
        password: "",
        method: "chacha20-ietf-poly1305"
      },
      hysteria: {
        auth: ""
      }
    }
  };
};
const mergeProxies = (proxyKeys, proxyType) => {
  const proxies = proxyKeys.reduce((ac, a) => ({
    ...ac,
    [a]: {}
  }), {});
  if (!proxyType)
    return proxies;
  proxyKeys.forEach((proxy) => {
    if (proxyType[proxy]) {
      proxies[proxy] = proxyType[proxy];
    }
  });
  return proxies;
};
const baseSchema = {
  username: z.string().min(1, {
    message: "Required"
  }),
  selected_proxies: z.array(z.string()).refine((value) => value.length > 0, {
    message: "userDialog.selectOneProtocol"
  }),
  note: z.string().nullable(),
  proxies: z.record(z.string(), z.record(z.string(), z.any())).transform((ins) => {
    const deleteIfEmpty = (obj, key) => {
      if (obj && obj[key] === "") {
        delete obj[key];
      }
    };
    deleteIfEmpty(ins.vmess, "id");
    deleteIfEmpty(ins.vless, "id");
    deleteIfEmpty(ins.trojan, "password");
    deleteIfEmpty(ins.shadowsocks, "password");
    deleteIfEmpty(ins.shadowsocks, "method");
    deleteIfEmpty(ins.hysteria, "auth");
    return ins;
  }),
  data_limit: z.string().min(0).or(z.number()).nullable().transform((str) => {
    if (str)
      return Number((parseFloat(String(str)) * 1073741824).toFixed(5));
    return 0;
  }),
  expire: z.number().nullable(),
  data_limit_reset_strategy: z.string(),
  ip_limit: z.string().or(z.number()).nullable().transform((value) => value ? parseInt(String(value)) || 0 : 0),
  hwid_limit: z.string().or(z.number()).nullable().transform((value) => value ? parseInt(String(value)) || 0 : 0),
  inbounds: z.record(z.string(), z.array(z.string())).transform((ins) => {
    Object.keys(ins).forEach((protocol) => {
      var _a;
      if (Array.isArray(ins[protocol]) && !((_a = ins[protocol]) == null ? void 0 : _a.length))
        delete ins[protocol];
    });
    return ins;
  })
};
const schema$1 = z.discriminatedUnion("status", [z.object({
  status: z.literal("active"),
  ...baseSchema
}), z.object({
  status: z.literal("disabled"),
  ...baseSchema
}), z.object({
  status: z.literal("limited"),
  ...baseSchema
}), z.object({
  status: z.literal("expired"),
  ...baseSchema
}), z.object({
  status: z.literal("on_hold"),
  on_hold_expire_duration: z.coerce.number().min(0.1, "Required").transform((d) => {
    return d * (24 * 60 * 60);
  }),
  ...baseSchema
})]);
const UserDialog = () => {
  var _a, _b, _c, _d, _e, _f;
  const {
    userData
  } = useGetUser();
  const maxIp = !(userData == null ? void 0 : userData.is_sudo) && (userData == null ? void 0 : userData.max_user_ip_limit) ? userData.max_user_ip_limit : void 0;
  const maxHwid = !(userData == null ? void 0 : userData.is_sudo) && (userData == null ? void 0 : userData.max_user_hwid_limit) ? userData.max_user_hwid_limit : void 0;
  const {
    editingUser,
    isCreatingNewUser,
    onCreateUser,
    editUser,
    fetchUserUsage,
    fetchUserInboundUsage,
    onEditingUser,
    createUser,
    onDeletingUser
  } = useDashboardPick("editingUser", "isCreatingNewUser", "onCreateUser", "editUser", "fetchUserUsage", "fetchUserInboundUsage", "onEditingUser", "createUser", "onDeletingUser");
  const isEditing = !!editingUser;
  const isOpen = isCreatingNewUser || isEditing;
  const [loading, setLoading] = react.exports.useState(false);
  const [error, setError] = react.exports.useState("");
  const toast = useToast();
  const {
    t: t2,
    i18n
  } = useTranslation();
  const {
    colorMode
  } = useColorMode();
  const [usageVisible, setUsageVisible] = react.exports.useState(false);
  const handleUsageToggle = () => {
    setUsageVisible((current) => !current);
  };
  const form = useForm({
    defaultValues: getDefaultValues(),
    resolver: s(schema$1)
  });
  react.exports.useEffect(() => useDashboard.subscribe((state) => state.inbounds, () => {
    form.reset(getDefaultValues());
  }), []);
  const [dataLimit, userStatus] = useWatch({
    control: form.control,
    name: ["data_limit", "status"]
  });
  const usageTitle = t2("userDialog.total");
  const [usage, setUsage] = react.exports.useState(createUsageConfig(colorMode, usageTitle));
  const [usageFilter, setUsageFilter] = react.exports.useState("1m");
  const fetchUsageWithFilter = (query) => {
    fetchUserUsage(editingUser, query).then((data) => {
      const labels = [];
      const series = [];
      for (const key in data.usages) {
        series.push(data.usages[key].used_traffic);
        labels.push(data.usages[key].node_name);
      }
      setUsage(createUsageConfig(colorMode, usageTitle, series, labels));
    });
  };
  const [inboundUsage, setInboundUsage] = react.exports.useState(createUsageConfig(colorMode, usageTitle));
  const fetchInboundUsage = () => {
    fetchUserInboundUsage(editingUser).then((data) => {
      const labels = [];
      const series = [];
      for (const usage2 of data.usages) {
        series.push(usage2.used_traffic);
        labels.push(usage2.inbound_tag);
      }
      setInboundUsage(createUsageConfig(colorMode, usageTitle, series, labels));
    });
  };
  react.exports.useEffect(() => {
    if (editingUser) {
      form.reset(formatUser(editingUser));
      fetchUsageWithFilter({
        start: dayjs().utc().subtract(30, "day").format("YYYY-MM-DDTHH:00:00")
      });
      fetchInboundUsage();
    }
  }, [editingUser]);
  const submit = (values) => {
    setLoading(true);
    const methods = {
      edited: editUser,
      created: createUser
    };
    const method = isEditing ? "edited" : "created";
    setError(null);
    const {
      selected_proxies,
      ...rest
    } = values;
    let body = {
      ...rest,
      data_limit: values.data_limit,
      proxies: mergeProxies(selected_proxies, values.proxies),
      data_limit_reset_strategy: values.data_limit && values.data_limit > 0 ? values.data_limit_reset_strategy : "no_reset",
      status: values.status === "active" || values.status === "disabled" || values.status === "on_hold" ? values.status : "active"
    };
    methods[method](body).then(() => {
      toast({
        title: t2(isEditing ? "userDialog.userEdited" : "userDialog.userCreated", {
          username: values.username
        }),
        status: "success",
        isClosable: true,
        position: "top",
        duration: 3e3
      });
      onClose();
    }).catch((err) => {
      var _a2, _b2, _c2, _d2, _e2;
      if (((_a2 = err == null ? void 0 : err.response) == null ? void 0 : _a2.status) === 409 || ((_b2 = err == null ? void 0 : err.response) == null ? void 0 : _b2.status) === 400)
        setError((_d2 = (_c2 = err == null ? void 0 : err.response) == null ? void 0 : _c2._data) == null ? void 0 : _d2.detail);
      if (((_e2 = err == null ? void 0 : err.response) == null ? void 0 : _e2.status) === 422) {
        Object.keys(err.response._data.detail).forEach((key) => {
          setError(err == null ? void 0 : err.response._data.detail[key]);
          form.setError(key, {
            type: "custom",
            message: err.response._data.detail[key]
          });
        });
      }
    }).finally(() => {
      setLoading(false);
    });
  };
  const onClose = () => {
    form.reset(getDefaultValues());
    onCreateUser(false);
    onEditingUser(null);
    setError(null);
    setUsageVisible(false);
    setUsageFilter("1m");
  };
  const handleResetUsage = () => {
    useDashboard.setState({
      resetUsageUser: editingUser
    });
  };
  const handleRevokeSubscription = () => {
    useDashboard.setState({
      revokeSubscriptionUser: editingUser
    });
  };
  const disabled = loading;
  const isOnHold = userStatus === "on_hold";
  const [randomUsernameLoading, setrandomUsernameLoading] = react.exports.useState(false);
  const createRandomUsername = () => {
    setrandomUsernameLoading(true);
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < 6) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  };
  return /* @__PURE__ */ jsxs(Modal$1, {
    isOpen,
    onClose,
    size: "2xl",
    children: [/* @__PURE__ */ jsx(ModalOverlay$1, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsx(FormProvider, {
      ...form,
      children: /* @__PURE__ */ jsx(ModalContent$1, {
        mx: "3",
        children: /* @__PURE__ */ jsxs("form", {
          onSubmit: form.handleSubmit(submit),
          children: [/* @__PURE__ */ jsx(ModalHeader$1, {
            pt: 6,
            children: /* @__PURE__ */ jsxs(HStack, {
              gap: 2,
              children: [/* @__PURE__ */ jsx(Icon, {
                color: "primary",
                children: isEditing ? /* @__PURE__ */ jsx(EditUserIcon, {}) : /* @__PURE__ */ jsx(AddUserIcon, {})
              }), /* @__PURE__ */ jsx(Text, {
                fontWeight: "semibold",
                fontSize: "lg",
                children: isEditing ? t2("userDialog.editUserTitle") : t2("createNewUser")
              })]
            })
          }), /* @__PURE__ */ jsx(ModalCloseButton$1, {
            mt: 3,
            disabled
          }), /* @__PURE__ */ jsxs(ModalBody$1, {
            children: [/* @__PURE__ */ jsxs(Grid, {
              templateColumns: {
                base: "repeat(1, 1fr)",
                md: "repeat(2, 1fr)"
              },
              gap: 3,
              children: [/* @__PURE__ */ jsx(GridItem, {
                children: /* @__PURE__ */ jsxs(VStack, {
                  justifyContent: "space-between",
                  children: [/* @__PURE__ */ jsxs(Flex, {
                    flexDirection: "column",
                    gridAutoRows: "min-content",
                    w: "full",
                    children: [/* @__PURE__ */ jsxs(Flex, {
                      flexDirection: "row",
                      w: "full",
                      gap: 2,
                      children: [/* @__PURE__ */ jsxs(FormControl, {
                        mb: "10px",
                        children: [/* @__PURE__ */ jsx(FormLabel, {
                          children: /* @__PURE__ */ jsxs(Flex, {
                            gap: 2,
                            alignItems: "center",
                            children: [t2("username"), !isEditing && /* @__PURE__ */ jsx(ReloadIcon, {
                              cursor: "pointer",
                              className: classNames({
                                "animate-spin": randomUsernameLoading
                              }),
                              onClick: () => {
                                const randomUsername = createRandomUsername();
                                form.setValue("username", randomUsername);
                                setTimeout(() => {
                                  setrandomUsernameLoading(false);
                                }, 350);
                              }
                            })]
                          })
                        }), /* @__PURE__ */ jsxs(HStack, {
                          children: [/* @__PURE__ */ jsx(Input, {
                            size: "sm",
                            type: "text",
                            borderRadius: "8px",
                            error: (_a = form.formState.errors.username) == null ? void 0 : _a.message,
                            disabled: disabled || isEditing,
                            ...form.register("username")
                          }), isEditing && /* @__PURE__ */ jsx(HStack, {
                            px: 1,
                            children: /* @__PURE__ */ jsx(Controller, {
                              name: "status",
                              control: form.control,
                              render: ({
                                field
                              }) => {
                                return /* @__PURE__ */ jsx(Tooltip, {
                                  placement: "top",
                                  label: "status: " + t2(`status.${field.value}`),
                                  textTransform: "capitalize",
                                  children: /* @__PURE__ */ jsx(Box, {
                                    children: /* @__PURE__ */ jsx(Switch, {
                                      colorScheme: "primary",
                                      isChecked: field.value === "active",
                                      onChange: (e) => {
                                        if (e.target.checked) {
                                          field.onChange("active");
                                        } else {
                                          field.onChange("disabled");
                                        }
                                      }
                                    })
                                  })
                                });
                              }
                            })
                          })]
                        })]
                      }), !isEditing && /* @__PURE__ */ jsxs(FormControl, {
                        flex: "1",
                        children: [/* @__PURE__ */ jsx(FormLabel, {
                          whiteSpace: "nowrap",
                          children: t2("userDialog.onHold")
                        }), /* @__PURE__ */ jsx(Controller, {
                          name: "status",
                          control: form.control,
                          render: ({
                            field
                          }) => {
                            const status = field.value;
                            return /* @__PURE__ */ jsx(Fragment, {
                              children: status ? /* @__PURE__ */ jsx(Switch, {
                                colorScheme: "primary",
                                isChecked: status === "on_hold",
                                onChange: (e) => {
                                  if (e.target.checked) {
                                    field.onChange("on_hold");
                                  } else {
                                    field.onChange("active");
                                  }
                                }
                              }) : ""
                            });
                          }
                        })]
                      })]
                    }), /* @__PURE__ */ jsxs(FormControl, {
                      mb: "10px",
                      children: [/* @__PURE__ */ jsx(FormLabel, {
                        children: t2("userDialog.dataLimit")
                      }), /* @__PURE__ */ jsx(Controller, {
                        control: form.control,
                        name: "data_limit",
                        render: ({
                          field
                        }) => {
                          var _a2;
                          return /* @__PURE__ */ jsx(Input, {
                            endAdornment: "GB",
                            type: "number",
                            size: "sm",
                            borderRadius: "8px",
                            onChange: field.onChange,
                            disabled,
                            error: (_a2 = form.formState.errors.data_limit) == null ? void 0 : _a2.message,
                            value: field.value ? String(field.value) : ""
                          });
                        }
                      })]
                    }), /* @__PURE__ */ jsx(Collapse, {
                      in: !!(dataLimit && dataLimit > 0),
                      animateOpacity: true,
                      style: {
                        width: "100%"
                      },
                      children: /* @__PURE__ */ jsxs(FormControl, {
                        height: "66px",
                        children: [/* @__PURE__ */ jsx(FormLabel, {
                          children: t2("userDialog.periodicUsageReset")
                        }), /* @__PURE__ */ jsx(Controller, {
                          control: form.control,
                          name: "data_limit_reset_strategy",
                          render: ({
                            field
                          }) => {
                            return /* @__PURE__ */ jsx(Select, {
                              size: "sm",
                              ...field,
                              disabled,
                              bg: disabled ? "gray.100" : "transparent",
                              _dark: {
                                bg: disabled ? "gray.600" : "transparent"
                              },
                              sx: {
                                option: {
                                  backgroundColor: colorMode === "dark" ? "var(--chakra-colors-gray-750)" : "var(--app-surface)"
                                }
                              },
                              children: resetStrategy.map((s2) => {
                                return /* @__PURE__ */ jsx("option", {
                                  value: s2.value,
                                  children: t2("userDialog.resetStrategy" + s2.title)
                                }, s2.value);
                              })
                            });
                          }
                        })]
                      })
                    }), /* @__PURE__ */ jsxs(FormControl, {
                      mb: "10px",
                      children: [/* @__PURE__ */ jsx(FormLabel, {
                        children: isOnHold ? t2("userDialog.onHoldExpireDuration") : t2("userDialog.expiryDate")
                      }), isOnHold && /* @__PURE__ */ jsx(Controller, {
                        control: form.control,
                        name: "on_hold_expire_duration",
                        render: ({
                          field
                        }) => {
                          var _a2;
                          return /* @__PURE__ */ jsx(Input, {
                            endAdornment: "Days",
                            type: "number",
                            size: "sm",
                            borderRadius: "8px",
                            onChange: (on_hold) => {
                              form.setValue("expire", null);
                              field.onChange({
                                target: {
                                  value: on_hold
                                }
                              });
                            },
                            disabled,
                            error: (_a2 = form.formState.errors.on_hold_expire_duration) == null ? void 0 : _a2.message,
                            value: field.value ? String(field.value) : ""
                          });
                        }
                      }), !isOnHold && /* @__PURE__ */ jsx(Controller, {
                        name: "expire",
                        control: form.control,
                        render: ({
                          field
                        }) => {
                          var _a2;
                          function createDateAsUTC(num) {
                            return dayjs(
                              dayjs(num * 1e3).utc()
                            ).toDate();
                          }
                          const {
                            status,
                            time
                          } = relativeExpiryDate(field.value);
                          return /* @__PURE__ */ jsxs(Fragment, {
                            children: [/* @__PURE__ */ jsx(Ht, {
                              locale: i18n.language.toLocaleLowerCase(),
                              dateFormat: t2("dateFormat"),
                              minDate: new Date(),
                              selected: field.value ? createDateAsUTC(field.value) : void 0,
                              onChange: (date) => {
                                form.setValue("on_hold_expire_duration", null);
                                field.onChange({
                                  target: {
                                    value: date ? dayjs(dayjs(date).set("hour", 23).set("minute", 59).set("second", 59)).utc().valueOf() / 1e3 : 0,
                                    name: "expire"
                                  }
                                });
                              },
                              customInput: /* @__PURE__ */ jsx(Input, {
                                size: "sm",
                                type: "text",
                                borderRadius: "8px",
                                clearable: true,
                                disabled,
                                error: (_a2 = form.formState.errors.expire) == null ? void 0 : _a2.message
                              })
                            }), field.value ? /* @__PURE__ */ jsx(FormHelperText, {
                              children: t2(status, {
                                time
                              })
                            }) : ""]
                          });
                        }
                      })]
                    }), /* @__PURE__ */ jsxs(FormControl, {
                      mb: "10px",
                      children: [/* @__PURE__ */ jsx(FormLabel, {
                        children: t2("userDialog.ipLimit")
                      }), /* @__PURE__ */ jsx(Controller, {
                        control: form.control,
                        name: "ip_limit",
                        render: ({
                          field
                        }) => /* @__PURE__ */ jsx(Input, {
                          type: "number",
                          size: "sm",
                          borderRadius: "8px",
                          placeholder: maxIp ? `0-${maxIp}` : t2("userDialog.ipLimitPlaceholder"),
                          max: maxIp,
                          onChange: (e) => {
                            let v = e.target.value;
                            if (maxIp && Number(v) > maxIp)
                              v = String(maxIp);
                            field.onChange(v);
                          },
                          disabled,
                          value: field.value ? String(field.value) : ""
                        })
                      })]
                    }), /* @__PURE__ */ jsxs(FormControl, {
                      mb: "10px",
                      children: [/* @__PURE__ */ jsx(FormLabel, {
                        children: t2("userDialog.hwidLimit")
                      }), /* @__PURE__ */ jsx(Controller, {
                        control: form.control,
                        name: "hwid_limit",
                        render: ({
                          field
                        }) => /* @__PURE__ */ jsx(Input, {
                          type: "number",
                          size: "sm",
                          borderRadius: "8px",
                          placeholder: maxHwid ? `0-${maxHwid}` : t2("userDialog.ipLimitPlaceholder"),
                          max: maxHwid,
                          onChange: (e) => {
                            let v = e.target.value;
                            if (maxHwid && Number(v) > maxHwid)
                              v = String(maxHwid);
                            field.onChange(v);
                          },
                          disabled,
                          value: field.value ? String(field.value) : ""
                        })
                      })]
                    }), /* @__PURE__ */ jsxs(FormControl, {
                      mb: "10px",
                      isInvalid: !!form.formState.errors.note,
                      children: [/* @__PURE__ */ jsx(FormLabel, {
                        children: t2("userDialog.note")
                      }), /* @__PURE__ */ jsx(Textarea, {
                        ...form.register("note")
                      }), /* @__PURE__ */ jsx(FormErrorMessage, {
                        children: (_c = (_b = form.formState.errors) == null ? void 0 : _b.note) == null ? void 0 : _c.message
                      })]
                    })]
                  }), error && /* @__PURE__ */ jsxs(Alert, {
                    status: "error",
                    display: {
                      base: "none",
                      md: "flex"
                    },
                    children: [/* @__PURE__ */ jsx(AlertIcon, {}), error]
                  })]
                })
              }), /* @__PURE__ */ jsx(GridItem, {
                children: /* @__PURE__ */ jsxs(FormControl, {
                  isInvalid: !!((_d = form.formState.errors.selected_proxies) == null ? void 0 : _d.message),
                  children: [/* @__PURE__ */ jsx(FormLabel, {
                    children: t2("userDialog.protocols")
                  }), /* @__PURE__ */ jsx(Controller, {
                    control: form.control,
                    name: "selected_proxies",
                    render: ({
                      field
                    }) => {
                      return /* @__PURE__ */ jsx(RadioGroup, {
                        list: [{
                          title: "vmess",
                          description: t2("userDialog.vmessDesc")
                        }, {
                          title: "vless",
                          description: t2("userDialog.vlessDesc")
                        }, {
                          title: "trojan",
                          description: t2("userDialog.trojanDesc")
                        }, {
                          title: "shadowsocks",
                          description: t2("userDialog.shadowsocksDesc")
                        }, {
                          title: "hysteria",
                          label: "hysteria2",
                          description: t2("userDialog.hysteria2Desc")
                        }],
                        disabled,
                        ...field
                      });
                    }
                  }), /* @__PURE__ */ jsx(FormErrorMessage, {
                    children: t2((_e = form.formState.errors.selected_proxies) == null ? void 0 : _e.message)
                  })]
                })
              }), isEditing && editingUser && /* @__PURE__ */ jsxs(GridItem, {
                pt: 4,
                colSpan: {
                  base: 1,
                  md: 2
                },
                children: [/* @__PURE__ */ jsxs(Text, {
                  fontSize: "xs",
                  color: "gray.500",
                  mb: 2,
                  children: [t2("userDialog.subUpdatedCount"), ":", " ", (_f = editingUser.sub_request_count) != null ? _f : 0]
                }), /* @__PURE__ */ jsxs(SimpleGrid, {
                  columns: {
                    base: 1,
                    md: 2
                  },
                  spacing: 4,
                  children: [/* @__PURE__ */ jsx(UserOnlineIPs, {
                    username: editingUser.username
                  }), /* @__PURE__ */ jsx(UserDevices, {
                    username: editingUser.username
                  })]
                })]
              }), isEditing && usageVisible && /* @__PURE__ */ jsx(GridItem, {
                pt: 6,
                colSpan: {
                  base: 1,
                  md: 2
                },
                children: /* @__PURE__ */ jsxs(VStack, {
                  gap: 4,
                  children: [/* @__PURE__ */ jsx(UsageFilter, {
                    defaultValue: usageFilter,
                    onChange: (filter, query) => {
                      setUsageFilter(filter);
                      fetchUsageWithFilter(query);
                    }
                  }), /* @__PURE__ */ jsx(react.exports.Suspense, {
                    fallback: null,
                    children: /* @__PURE__ */ jsxs(SimpleGrid, {
                      columns: {
                        base: 1,
                        md: 2
                      },
                      spacing: 4,
                      w: "full",
                      children: [/* @__PURE__ */ jsxs(VStack, {
                        children: [/* @__PURE__ */ jsx(Text, {
                          fontSize: "sm",
                          fontWeight: "medium",
                          children: t2("userDialog.usageByNode")
                        }), /* @__PURE__ */ jsx(Box, {
                          w: "full",
                          children: /* @__PURE__ */ jsx(StableChart, {
                            options: usage.options,
                            series: usage.series,
                            type: "donut"
                          })
                        })]
                      }), /* @__PURE__ */ jsxs(VStack, {
                        children: [/* @__PURE__ */ jsx(Text, {
                          fontSize: "sm",
                          fontWeight: "medium",
                          children: t2("userDialog.usageByInbound")
                        }), /* @__PURE__ */ jsx(Box, {
                          w: "full",
                          children: /* @__PURE__ */ jsx(StableChart, {
                            options: inboundUsage.options,
                            series: inboundUsage.series,
                            type: "donut"
                          })
                        })]
                      })]
                    })
                  })]
                })
              })]
            }), error && /* @__PURE__ */ jsxs(Alert, {
              mt: "3",
              status: "error",
              display: {
                base: "flex",
                md: "none"
              },
              children: [/* @__PURE__ */ jsx(AlertIcon, {}), error]
            })]
          }), /* @__PURE__ */ jsx(ModalFooter$1, {
            mt: "3",
            children: /* @__PURE__ */ jsxs(HStack, {
              justifyContent: "space-between",
              w: "full",
              gap: 3,
              flexDirection: {
                base: "column",
                sm: "row"
              },
              children: [/* @__PURE__ */ jsx(HStack, {
                justifyContent: "flex-start",
                w: {
                  base: "full",
                  sm: "unset"
                },
                children: isEditing && /* @__PURE__ */ jsxs(Fragment, {
                  children: [/* @__PURE__ */ jsx(Tooltip, {
                    label: t2("delete"),
                    placement: "top",
                    children: /* @__PURE__ */ jsx(IconButton, {
                      "aria-label": "Delete",
                      size: "sm",
                      onClick: () => {
                        onDeletingUser(editingUser);
                        onClose();
                      },
                      children: /* @__PURE__ */ jsx(DeleteIcon$1, {})
                    })
                  }), /* @__PURE__ */ jsx(Tooltip, {
                    label: t2("userDialog.usage"),
                    placement: "top",
                    children: /* @__PURE__ */ jsx(IconButton, {
                      "aria-label": "usage",
                      size: "sm",
                      onClick: handleUsageToggle,
                      children: /* @__PURE__ */ jsx(UserUsageIcon, {})
                    })
                  }), /* @__PURE__ */ jsx(Button, {
                    onClick: handleResetUsage,
                    size: "sm",
                    children: t2("userDialog.resetUsage")
                  }), /* @__PURE__ */ jsx(Button, {
                    onClick: handleRevokeSubscription,
                    size: "sm",
                    children: t2("userDialog.revokeSubscription")
                  })]
                })
              }), /* @__PURE__ */ jsx(HStack, {
                w: "full",
                maxW: {
                  md: "50%",
                  base: "full"
                },
                justify: "end",
                children: /* @__PURE__ */ jsx(Button, {
                  type: "submit",
                  size: "sm",
                  px: "8",
                  colorScheme: "primary",
                  leftIcon: loading ? /* @__PURE__ */ jsx(Spinner, {
                    size: "xs"
                  }) : void 0,
                  disabled,
                  children: isEditing ? t2("userDialog.editUser") : t2("createUser")
                })
              })]
            })
          })]
        })
      })
    })]
  });
};
const SvgAddFile = (props) => /* @__PURE__ */ react.exports.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", "data-name": "Layer 1", width: 782.04441, height: 701.88002, viewBox: "0 0 782.04441 701.88002", xmlnsXlink: "http://www.w3.org/1999/xlink", ...props }, /* @__PURE__ */ react.exports.createElement("path", { d: "M609.48783,100.59015l-25.44631,6.56209L270.53735,187.9987,245.091,194.56079A48.17927,48.17927,0,0,0,210.508,253.17865L320.849,681.05606a48.17924,48.17924,0,0,0,58.61776,34.58317l.06572-.01695,364.26536-93.93675.06572-.01695a48.17923,48.17923,0,0,0,34.58309-58.6178l-110.341-427.87741A48.17928,48.17928,0,0,0,609.48783,100.59015Z", transform: "translate(-208.9778 -99.05999)", fill: "#f2f2f2" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M612.94784,114.00532l-30.13945,7.77236L278.68955,200.20385l-30.139,7.77223a34.30949,34.30949,0,0,0-24.6275,41.74308l110.341,427.87741a34.30946,34.30946,0,0,0,41.7431,24.62736l.06572-.01695,364.26536-93.93674.06619-.01707a34.30935,34.30935,0,0,0,24.627-41.7429l-110.341-427.87741A34.30938,34.30938,0,0,0,612.94784,114.00532Z", transform: "translate(-208.9778 -99.05999)", fill: "#fff" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M590.19,252.56327,405.917,300.08359a8.01411,8.01411,0,0,1-4.00241-15.52046l184.273-47.52033A8.01412,8.01412,0,0,1,590.19,252.56327Z", transform: "translate(-208.9778 -99.05999)", fill: "#f2f2f2" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M628.955,270.49906,412.671,326.27437a8.01411,8.01411,0,1,1-4.00241-15.52046l216.284-55.77531a8.01411,8.01411,0,0,1,4.00242,15.52046Z", transform: "translate(-208.9778 -99.05999)", fill: "#f2f2f2" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M620.45825,369.93676l-184.273,47.52032a8.01411,8.01411,0,1,1-4.00242-15.52046l184.273-47.52032a8.01411,8.01411,0,1,1,4.00241,15.52046Z", transform: "translate(-208.9778 -99.05999)", fill: "#f2f2f2" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M659.22329,387.87255l-216.284,55.77531a8.01411,8.01411,0,1,1-4.00242-15.52046l216.284-55.77531a8.01411,8.01411,0,0,1,4.00242,15.52046Z", transform: "translate(-208.9778 -99.05999)", fill: "#f2f2f2" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M650.72653,487.31025l-184.273,47.52033a8.01412,8.01412,0,0,1-4.00242-15.52047l184.273-47.52032a8.01411,8.01411,0,0,1,4.00242,15.52046Z", transform: "translate(-208.9778 -99.05999)", fill: "#f2f2f2" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M689.49156,505.246l-216.284,55.77532a8.01412,8.01412,0,1,1-4.00241-15.52047l216.284-55.77531a8.01411,8.01411,0,0,1,4.00242,15.52046Z", transform: "translate(-208.9778 -99.05999)", fill: "#f2f2f2" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M374.45884,348.80871l-65.21246,16.817a3.847,3.847,0,0,1-4.68062-2.76146L289.5963,304.81607a3.847,3.847,0,0,1,2.76145-4.68061l65.21247-16.817a3.847,3.847,0,0,1,4.68061,2.76145l14.96947,58.04817A3.847,3.847,0,0,1,374.45884,348.80871Z", transform: "translate(-208.9778 -99.05999)", fill: "#e6e6e6" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M404.72712,466.1822l-65.21247,16.817a3.847,3.847,0,0,1-4.68062-2.76146l-14.96946-58.04816A3.847,3.847,0,0,1,322.626,417.509l65.21246-16.817a3.847,3.847,0,0,1,4.68062,2.76145l14.96946,58.04817A3.847,3.847,0,0,1,404.72712,466.1822Z", transform: "translate(-208.9778 -99.05999)", fill: "#e6e6e6" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M434.99539,583.55569l-65.21246,16.817a3.847,3.847,0,0,1-4.68062-2.76145l-14.96946-58.04817a3.847,3.847,0,0,1,2.76145-4.68062l65.21247-16.817a3.847,3.847,0,0,1,4.68061,2.76146l14.96947,58.04816A3.847,3.847,0,0,1,434.99539,583.55569Z", transform: "translate(-208.9778 -99.05999)", fill: "#e6e6e6" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M863.63647,209.0517H487.31811a48.17928,48.17928,0,0,0-48.125,48.12512V699.05261a48.17924,48.17924,0,0,0,48.125,48.12507H863.63647a48.17924,48.17924,0,0,0,48.125-48.12507V257.17682A48.17928,48.17928,0,0,0,863.63647,209.0517Z", transform: "translate(-208.9778 -99.05999)", fill: "#e6e6e6" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M863.637,222.90589H487.31811a34.30948,34.30948,0,0,0-34.271,34.27093V699.05261a34.30947,34.30947,0,0,0,34.271,34.27088H863.637a34.30936,34.30936,0,0,0,34.27051-34.27088V257.17682A34.30937,34.30937,0,0,0,863.637,222.90589Z", transform: "translate(-208.9778 -99.05999)", fill: "#fff" }), /* @__PURE__ */ react.exports.createElement("circle", { cx: 694.19401, cy: 614.02963, r: 87.85039, fill: "#3182CE" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M945.18722,701.63087H914.63056V671.07421a11.45875,11.45875,0,0,0-22.9175,0v30.55666H861.1564a11.45875,11.45875,0,0,0,0,22.9175h30.55666V755.105a11.45875,11.45875,0,1,0,22.9175,0V724.54837h30.55666a11.45875,11.45875,0,0,0,0-22.9175Z", transform: "translate(-208.9778 -99.05999)", fill: "#fff" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M807.00068,465.71551H616.699a8.01412,8.01412,0,1,1,0-16.02823H807.00068a8.01412,8.01412,0,0,1,0,16.02823Z", transform: "translate(-208.9778 -99.05999)", fill: "#e6e6e6" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M840.05889,492.76314H616.699a8.01412,8.01412,0,1,1,0-16.02823H840.05889a8.01411,8.01411,0,1,1,0,16.02823Z", transform: "translate(-208.9778 -99.05999)", fill: "#e6e6e6" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M807.00068,586.929H616.699a8.01412,8.01412,0,1,1,0-16.02823H807.00068a8.01411,8.01411,0,0,1,0,16.02823Z", transform: "translate(-208.9778 -99.05999)", fill: "#e6e6e6" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M840.05889,613.97661H616.699a8.01412,8.01412,0,1,1,0-16.02823H840.05889a8.01412,8.01412,0,1,1,0,16.02823Z", transform: "translate(-208.9778 -99.05999)", fill: "#e6e6e6" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M574.07028,505.04162H506.72434a3.847,3.847,0,0,1-3.84278-3.84278V441.25158a3.847,3.847,0,0,1,3.84278-3.84278h67.34594a3.847,3.847,0,0,1,3.84278,3.84278v59.94726A3.847,3.847,0,0,1,574.07028,505.04162Z", transform: "translate(-208.9778 -99.05999)", fill: "#e6e6e6" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M574.07028,626.25509H506.72434a3.847,3.847,0,0,1-3.84278-3.84278V562.46505a3.847,3.847,0,0,1,3.84278-3.84278h67.34594a3.847,3.847,0,0,1,3.84278,3.84278v59.94726A3.847,3.847,0,0,1,574.07028,626.25509Z", transform: "translate(-208.9778 -99.05999)", fill: "#e6e6e6" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M807.21185,330.781H666.91017a8.01411,8.01411,0,0,1,0-16.02823H807.21185a8.01411,8.01411,0,0,1,0,16.02823Z", transform: "translate(-208.9778 -99.05999)", fill: "#ccc" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M840.27007,357.82862H666.91017a8.01411,8.01411,0,1,1,0-16.02822h173.3599a8.01411,8.01411,0,0,1,0,16.02822Z", transform: "translate(-208.9778 -99.05999)", fill: "#ccc" }), /* @__PURE__ */ react.exports.createElement("path", { d: "M635.85911,390.6071H506.51316a3.847,3.847,0,0,1-3.84277-3.84277V285.81706a3.847,3.847,0,0,1,3.84277-3.84277H635.85911a3.847,3.847,0,0,1,3.84277,3.84277V386.76433A3.847,3.847,0,0,1,635.85911,390.6071Z", transform: "translate(-208.9778 -99.05999)", fill: "#ccc" }));
const convertDateFormat$1 = (lastOnline) => {
  if (!lastOnline)
    return null;
  const date = new Date(`${lastOnline}Z`);
  return Math.floor(date.getTime() / 1e3);
};
const OnlineBadge = ({
  lastOnline
}) => {
  const currentTimeInSeconds = Math.floor(Date.now() / 1e3);
  const unixTime = convertDateFormat$1(lastOnline);
  if (!lastOnline || unixTime === null) {
    return /* @__PURE__ */ jsx(Box, {
      border: "1px solid",
      borderColor: "gray.400",
      _dark: {
        borderColor: "gray.600"
      },
      className: "circle"
    });
  }
  const timeDifferenceInSeconds = currentTimeInSeconds - unixTime;
  if (timeDifferenceInSeconds <= 60) {
    return /* @__PURE__ */ jsx(Box, {
      bg: "green.300",
      _dark: {
        bg: "green.500"
      },
      className: "circle pulse green"
    });
  }
  return /* @__PURE__ */ jsx(Box, {
    bg: "gray.400",
    _dark: {
      bg: "gray.600"
    },
    className: "circle"
  });
};
const convertDateFormat = (lastOnline) => {
  if (!lastOnline) {
    return null;
  }
  const date = new Date(lastOnline + "Z");
  return Math.floor(date.getTime() / 1e3);
};
const OnlineStatus = ({
  lastOnline
}) => {
  const {
    t: t2
  } = useTranslation();
  const currentTimeInSeconds = Math.floor(Date.now() / 1e3);
  const unixTime = convertDateFormat(lastOnline);
  const timeDifferenceInSeconds = unixTime ? currentTimeInSeconds - unixTime : null;
  const dateInfo = unixTime ? relativeExpiryDate(unixTime) : {
    status: "",
    time: t2("lastOnline.never")
  };
  return /* @__PURE__ */ jsx(Text, {
    display: "inline-block",
    fontSize: "xs",
    fontWeight: "medium",
    ml: "2",
    color: "gray.600",
    _dark: {
      color: "gray.400"
    },
    children: timeDifferenceInSeconds && timeDifferenceInSeconds <= 60 ? t2("lastOnline.now") : timeDifferenceInSeconds ? t2("lastOnline.ago", {
      time: dateInfo.time
    }) : dateInfo.time
  });
};
const PrevIcon = chakra(ArrowLongLeftIcon, {
  baseStyle: {
    w: 4,
    h: 4
  }
});
const NextIcon = chakra(ArrowLongRightIcon, {
  baseStyle: {
    w: 4,
    h: 4
  }
});
const MINIMAL_PAGE_ITEM_COUNT = 5;
function generatePageItems(total, current, width) {
  if (width < MINIMAL_PAGE_ITEM_COUNT) {
    throw new Error(`Must allow at least ${MINIMAL_PAGE_ITEM_COUNT} page items`);
  }
  if (width % 2 === 0) {
    throw new Error(`Must allow odd number of page items`);
  }
  if (total < width) {
    return [...new Array(total).keys()];
  }
  const left = Math.max(0, Math.min(total - width, current - Math.floor(width / 2)));
  const items = new Array(width);
  for (let i = 0; i < width; i += 1) {
    items[i] = i + left;
  }
  if (items[0] > 0) {
    items[0] = 0;
    items[1] = "prev-more";
  }
  if (items[items.length - 1] < total - 1) {
    items[items.length - 1] = total - 1;
    items[items.length - 2] = "next-more";
  }
  return items;
}
const Pagination = () => {
  const {
    filters,
    onFilterChange,
    users: {
      total
    }
  } = useDashboardPick("filters", "onFilterChange", "users");
  const {
    limit: perPage,
    offset
  } = filters;
  const page = (offset || 0) / (perPage || 1);
  const noPages = Math.ceil(total / (perPage || 1));
  const pages = generatePageItems(noPages, page, 7);
  const changePage = (page2) => {
    onFilterChange({
      ...filters,
      offset: page2 * perPage
    });
  };
  const handlePageSizeChange = (e) => {
    onFilterChange({
      ...filters,
      limit: parseInt(e.target.value)
    });
    setUsersPerPageLimitSize(e.target.value);
  };
  const {
    t: t2
  } = useTranslation();
  return /* @__PURE__ */ jsxs(HStack, {
    justifyContent: "space-between",
    mt: 4,
    w: "full",
    display: "flex",
    columnGap: {
      lg: 4,
      md: 0
    },
    rowGap: {
      md: 0,
      base: 4
    },
    flexDirection: {
      md: "row",
      base: "column"
    },
    children: [/* @__PURE__ */ jsx(Box, {
      order: {
        base: 2,
        md: 1
      },
      children: /* @__PURE__ */ jsxs(HStack, {
        children: [/* @__PURE__ */ jsxs(Select, {
          minW: "60px",
          value: perPage,
          onChange: handlePageSizeChange,
          size: "sm",
          rounded: "md",
          children: [/* @__PURE__ */ jsx("option", {
            children: "10"
          }), /* @__PURE__ */ jsx("option", {
            children: "20"
          }), /* @__PURE__ */ jsx("option", {
            children: "30"
          })]
        }), /* @__PURE__ */ jsx(Text, {
          whiteSpace: "nowrap",
          fontSize: "sm",
          children: t2("itemsPerPage")
        })]
      })
    }), /* @__PURE__ */ jsxs(ButtonGroup, {
      size: "sm",
      isAttached: true,
      variant: "outline",
      order: {
        base: 1,
        md: 2
      },
      children: [/* @__PURE__ */ jsx(Button, {
        leftIcon: /* @__PURE__ */ jsx(PrevIcon, {}),
        onClick: changePage.bind(null, page - 1),
        isDisabled: page === 0 || noPages === 0,
        children: t2("previous")
      }), pages.map((pageIndex) => {
        if (typeof pageIndex === "string")
          return /* @__PURE__ */ jsx(Button, {
            children: "..."
          }, pageIndex);
        return /* @__PURE__ */ jsx(Button, {
          variant: pageIndex === page ? "solid" : "outline",
          onClick: changePage.bind(null, pageIndex),
          children: pageIndex + 1
        }, pageIndex);
      }), /* @__PURE__ */ jsx(Button, {
        rightIcon: /* @__PURE__ */ jsx(NextIcon, {}),
        onClick: changePage.bind(null, page + 1),
        isDisabled: page + 1 === noPages || noPages === 0,
        children: t2("next")
      })]
    })]
  });
};
const StatusBadge = ({
  expiryDate,
  status: userStatus,
  compact = false,
  showDetail = true,
  extraText
}) => {
  const {
    t: t2
  } = useTranslation();
  const dateInfo = relativeExpiryDate(expiryDate);
  const Icon2 = statusColors[userStatus].icon;
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [/* @__PURE__ */ jsxs(Badge, {
      colorScheme: statusColors[userStatus].statusColor,
      rounded: "full",
      display: "inline-flex",
      px: 3,
      py: 1,
      columnGap: compact ? 1 : 2,
      alignItems: "center",
      children: [/* @__PURE__ */ jsx(Icon2, {
        w: compact ? 3 : 4
      }), showDetail && /* @__PURE__ */ jsxs(Text, {
        textTransform: "capitalize",
        fontSize: compact ? ".7rem" : ".875rem",
        lineHeight: compact ? "1rem" : "1.25rem",
        fontWeight: "medium",
        letterSpacing: "tighter",
        children: [userStatus && t2(`status.${userStatus}`), extraText && `: ${extraText}`]
      })]
    }), showDetail && expiryDate && /* @__PURE__ */ jsx(Text, {
      display: "inline-block",
      fontSize: "xs",
      fontWeight: "medium",
      ml: "2",
      color: "gray.600",
      _dark: {
        color: "gray.400"
      },
      children: t2(dateInfo.status, {
        time: dateInfo.time
      })
    })]
  });
};
const useOnlineProviders = () => useQuery({
  queryKey: "online-providers",
  queryFn: () => fetch$1("/online/providers"),
  refetchInterval: 1e4
});
const ProviderTag = ({
  username
}) => {
  const {
    data: all
  } = useQuery({
    queryKey: "online-providers",
    queryFn: () => fetch$1("/online/providers"),
    refetchInterval: 1e4,
    select: (d) => {
      var _a;
      return (_a = d.users) == null ? void 0 : _a[username];
    },
    notifyOnChangeProps: ["data"]
  });
  const names = (all || []).filter((n) => n !== "Unknown");
  if (names.length === 0)
    return null;
  const label = names[0] + (names.length > 1 ? ` +${names.length - 1}` : "");
  return /* @__PURE__ */ jsx(Text, {
    fontSize: "xs",
    color: "gray.500",
    isTruncated: true,
    maxW: "220px",
    title: names.join("\n"),
    children: /* @__PURE__ */ jsx(IconText, {
      icon: GlobeAltIcon,
      children: label
    })
  });
};
const EmptySectionIcon = chakra(SvgAddFile);
const iconProps = {
  baseStyle: {
    w: {
      base: 4,
      md: 5
    },
    h: {
      base: 4,
      md: 5
    }
  }
};
const CopyIcon = chakra(ClipboardIcon, iconProps);
const AccordionArrowIcon = chakra(ChevronDownIcon, iconProps);
const CopiedIcon = chakra(CheckIcon, iconProps);
const SubscriptionLinkIcon = chakra(LinkIcon, iconProps);
const QRIcon = chakra(QrCodeIcon, iconProps);
const EditIcon = chakra(PencilIcon, iconProps);
const SortIcon = chakra(ChevronDownIcon, {
  baseStyle: {
    width: "15px",
    height: "15px"
  }
});
const getResetStrategy = (strategy) => {
  for (var i = 0; i < resetStrategy.length; i++) {
    const entry = resetStrategy[i];
    if (entry.value == strategy) {
      return entry.title;
    }
  }
  return "No";
};
const UsageSliderCompact = (props) => {
  const {
    used,
    total,
    dataLimitResetStrategy,
    totalUsedTraffic
  } = props;
  const isUnlimited = total === 0 || total === null;
  return /* @__PURE__ */ jsx(HStack, {
    justifyContent: "space-between",
    fontSize: "xs",
    fontWeight: "medium",
    color: "gray.600",
    _dark: {
      color: "gray.400"
    },
    children: /* @__PURE__ */ jsxs(Text, {
      children: [formatBytes(used), " /", " ", isUnlimited ? /* @__PURE__ */ jsx(Text, {
        as: "span",
        fontFamily: "system-ui",
        children: "\u221E"
      }) : formatBytes(total)]
    })
  });
};
const UsageSlider = (props) => {
  const {
    used,
    total,
    dataLimitResetStrategy,
    totalUsedTraffic,
    ...restOfProps
  } = props;
  const isUnlimited = total === 0 || total === null;
  const isReached = !isUnlimited && used / total * 100 >= 100;
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [/* @__PURE__ */ jsx(Slider, {
      orientation: "horizontal",
      value: isUnlimited ? 100 : Math.min(used / total * 100, 100),
      colorScheme: isReached ? "red" : "primary",
      ...restOfProps,
      children: /* @__PURE__ */ jsx(SliderTrack, {
        h: "6px",
        borderRadius: "full",
        children: /* @__PURE__ */ jsx(SliderFilledTrack, {
          borderRadius: "full"
        })
      })
    }), /* @__PURE__ */ jsxs(HStack, {
      justifyContent: "space-between",
      fontSize: "xs",
      fontWeight: "medium",
      color: "gray.600",
      _dark: {
        color: "gray.400"
      },
      whiteSpace: "nowrap",
      spacing: 2,
      children: [/* @__PURE__ */ jsxs(Text, {
        isTruncated: true,
        children: [formatBytes(used), " /", " ", isUnlimited ? /* @__PURE__ */ jsx(Text, {
          as: "span",
          fontFamily: "system-ui",
          children: "\u221E"
        }) : formatBytes(total) + (dataLimitResetStrategy && dataLimitResetStrategy !== "no_reset" ? " " + t("userDialog.resetStrategy" + getResetStrategy(dataLimitResetStrategy)) : "")]
      }), /* @__PURE__ */ jsxs(Text, {
        children: [t("usersTable.total"), ": ", formatBytes(totalUsedTraffic)]
      })]
    })]
  });
};
const Sort = ({
  sort,
  column
}) => {
  if (sort.includes(column))
    return /* @__PURE__ */ jsx(SortIcon, {
      transform: sort.startsWith("-") ? void 0 : "rotate(180deg)"
    });
  return null;
};
const UsersTable = (props) => {
  const {
    filters,
    users: {
      users
    },
    users: totalUsers,
    onEditingUser,
    onFilterChange
  } = useDashboardPick("filters", "users", "onEditingUser", "onFilterChange");
  const {
    t: t2
  } = useTranslation();
  const {
    userData
  } = useGetUser();
  const isSudo = !!(userData == null ? void 0 : userData.is_sudo);
  const [selectedRow, setSelectedRow] = react.exports.useState(void 0);
  const top = "0px";
  const useTable = useBreakpointValue({
    base: false,
    md: true
  });
  const isFiltered = users.length !== totalUsers.total;
  const handleSort = (column) => {
    let newSort = filters.sort;
    if (newSort.includes(column)) {
      if (newSort.startsWith("-")) {
        newSort = "-created_at";
      } else {
        newSort = "-" + column;
      }
    } else {
      newSort = column;
    }
    onFilterChange({
      sort: newSort
    });
  };
  const handleStatusFilter = (e) => {
    onFilterChange({
      status: e.target.value.length > 0 ? e.target.value : void 0
    });
  };
  const toggleAccordion = (index2) => {
    setSelectedRow(index2 === selectedRow ? void 0 : index2);
  };
  return /* @__PURE__ */ jsxs(Box, {
    id: "users-table",
    overflowX: {
      base: "unset",
      md: "unset"
    },
    children: [/* @__PURE__ */ jsx(Accordion, {
      allowMultiple: true,
      display: {
        base: "block",
        md: "none"
      },
      index: selectedRow,
      children: /* @__PURE__ */ jsxs(Table, {
        orientation: "vertical",
        zIndex: "docked",
        ...props,
        children: [/* @__PURE__ */ jsx(Thead, {
          zIndex: "docked",
          position: "relative",
          children: /* @__PURE__ */ jsxs(Tr, {
            children: [/* @__PURE__ */ jsx(Th, {
              position: "sticky",
              top,
              minW: "120px",
              pl: 4,
              pr: 4,
              cursor: "pointer",
              onClick: handleSort.bind(null, "username"),
              children: /* @__PURE__ */ jsxs(HStack, {
                children: [/* @__PURE__ */ jsx("span", {
                  children: t2("users")
                }), /* @__PURE__ */ jsx(Sort, {
                  sort: filters.sort,
                  column: "username"
                })]
              })
            }), /* @__PURE__ */ jsx(Th, {
              position: "sticky",
              top,
              minW: "50px",
              pl: 0,
              pr: 0,
              w: "140px",
              cursor: "pointer",
              children: /* @__PURE__ */ jsxs(HStack, {
                spacing: 0,
                position: "relative",
                children: [/* @__PURE__ */ jsxs(Text, {
                  position: "absolute",
                  _dark: {
                    bg: "gray.750"
                  },
                  _light: {
                    bg: "var(--app-surface-2)"
                  },
                  userSelect: "none",
                  pointerEvents: "none",
                  zIndex: 1,
                  w: "100%",
                  children: [t2("usersTable.status"), filters.status ? ": " + filters.status : ""]
                }), /* @__PURE__ */ jsxs(Select, {
                  value: filters.sort,
                  fontSize: "xs",
                  fontWeight: "extrabold",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  p: 0,
                  border: 0,
                  h: "auto",
                  w: "auto",
                  icon: /* @__PURE__ */ jsx(Fragment, {}),
                  _focusVisible: {
                    border: "0 !important"
                  },
                  onChange: handleStatusFilter,
                  children: [/* @__PURE__ */ jsx("option", {}), /* @__PURE__ */ jsx("option", {
                    children: "active"
                  }), /* @__PURE__ */ jsx("option", {
                    children: "on_hold"
                  }), /* @__PURE__ */ jsx("option", {
                    children: "disabled"
                  }), /* @__PURE__ */ jsx("option", {
                    children: "limited"
                  }), /* @__PURE__ */ jsx("option", {
                    children: "expired"
                  })]
                })]
              })
            }), /* @__PURE__ */ jsx(Th, {
              position: "sticky",
              top,
              minW: "100px",
              cursor: "pointer",
              pr: 0,
              onClick: handleSort.bind(null, "used_traffic"),
              children: /* @__PURE__ */ jsxs(HStack, {
                children: [/* @__PURE__ */ jsx("span", {
                  children: t2("usersTable.dataUsage")
                }), /* @__PURE__ */ jsx(Sort, {
                  sort: filters.sort,
                  column: "used_traffic"
                })]
              })
            }), /* @__PURE__ */ jsx(Th, {
              position: "sticky",
              top,
              minW: "32px",
              w: "32px",
              p: 0,
              cursor: "pointer"
            })]
          })
        }), /* @__PURE__ */ jsx(Tbody, {
          children: !useTable && (users == null ? void 0 : users.map((user, i) => {
            var _a, _b, _c;
            return /* @__PURE__ */ jsxs(react.exports.Fragment, {
              children: [/* @__PURE__ */ jsxs(Tr, {
                onClick: toggleAccordion.bind(null, i),
                cursor: "pointer",
                children: [/* @__PURE__ */ jsxs(Td, {
                  borderBottom: 0,
                  minW: "100px",
                  pl: 4,
                  pr: 4,
                  maxW: "calc(100vw - 50px - 32px - 100px - 48px)",
                  children: [/* @__PURE__ */ jsxs("div", {
                    className: "flex-status",
                    children: [/* @__PURE__ */ jsx(OnlineBadge, {
                      lastOnline: user.online_at
                    }), /* @__PURE__ */ jsx(Text, {
                      isTruncated: true,
                      children: user.username
                    })]
                  }), /* @__PURE__ */ jsxs(HStack, {
                    pl: "20px",
                    spacing: 2,
                    mt: "1px",
                    flexWrap: "wrap",
                    rowGap: 0,
                    children: [isSudo && ((_a = user.admin) == null ? void 0 : _a.username) && /* @__PURE__ */ jsx(Text, {
                      as: "div",
                      fontSize: "xs",
                      color: "gray.500",
                      children: /* @__PURE__ */ jsx(IconText, {
                        icon: UserIcon,
                        children: user.admin.username
                      })
                    }), /* @__PURE__ */ jsx(Text, {
                      as: "div",
                      fontSize: "xs",
                      color: "gray.500",
                      children: /* @__PURE__ */ jsx(IconText, {
                        icon: SignalIcon,
                        children: (_b = user.online_ip_count) != null ? _b : 0
                      })
                    }), /* @__PURE__ */ jsx(Text, {
                      as: "div",
                      fontSize: "xs",
                      color: "gray.500",
                      children: /* @__PURE__ */ jsxs(IconText, {
                        icon: DevicePhoneMobileIcon,
                        children: [(_c = user.hwid_count) != null ? _c : 0, user.hwid_limit ? `/${user.hwid_limit}` : ""]
                      })
                    }), /* @__PURE__ */ jsx(ProviderTag, {
                      username: user.username
                    }), /* @__PURE__ */ jsx(UserLiveTag, {
                      username: user.username
                    })]
                  })]
                }), /* @__PURE__ */ jsx(Td, {
                  borderBottom: 0,
                  minW: "50px",
                  pl: 0,
                  pr: 0,
                  children: /* @__PURE__ */ jsx(StatusBadge, {
                    compact: true,
                    showDetail: false,
                    expiryDate: user.expire,
                    status: user.status
                  })
                }), /* @__PURE__ */ jsx(Td, {
                  borderBottom: 0,
                  minW: "100px",
                  pr: 0,
                  children: /* @__PURE__ */ jsx(UsageSliderCompact, {
                    totalUsedTraffic: user.lifetime_used_traffic,
                    dataLimitResetStrategy: user.data_limit_reset_strategy,
                    used: user.used_traffic,
                    total: user.data_limit,
                    colorScheme: statusColors[user.status].bandWidthColor
                  })
                }), /* @__PURE__ */ jsx(Td, {
                  p: 0,
                  borderBottom: 0,
                  w: "32px",
                  minW: "32px",
                  children: /* @__PURE__ */ jsx(AccordionArrowIcon, {
                    color: "gray.600",
                    _dark: {
                      color: "gray.400"
                    },
                    transition: "transform .2s ease-out",
                    transform: selectedRow === i ? "rotate(180deg)" : "0deg"
                  })
                })]
              }), /* @__PURE__ */ jsx(Tr, {
                className: "collapsible",
                onClick: toggleAccordion.bind(null, i),
                children: /* @__PURE__ */ jsx(Td, {
                  p: 0,
                  colSpan: 4,
                  children: /* @__PURE__ */ jsxs(AccordionItem, {
                    border: 0,
                    children: [/* @__PURE__ */ jsx(AccordionButton, {
                      display: "none"
                    }), /* @__PURE__ */ jsx(AccordionPanel, {
                      border: 0,
                      cursor: "pointer",
                      px: 6,
                      py: 3,
                      children: /* @__PURE__ */ jsxs(VStack, {
                        justifyContent: "space-between",
                        spacing: "4",
                        children: [/* @__PURE__ */ jsxs(VStack, {
                          alignItems: "flex-start",
                          w: "full",
                          spacing: -1,
                          children: [/* @__PURE__ */ jsx(Text, {
                            textTransform: "capitalize",
                            fontSize: "xs",
                            fontWeight: "bold",
                            color: "gray.600",
                            _dark: {
                              color: "gray.400"
                            },
                            children: t2("usersTable.dataUsage")
                          }), /* @__PURE__ */ jsx(Box, {
                            width: "full",
                            minW: "230px",
                            children: /* @__PURE__ */ jsx(UsageSlider, {
                              totalUsedTraffic: user.lifetime_used_traffic,
                              dataLimitResetStrategy: user.data_limit_reset_strategy,
                              used: user.used_traffic,
                              total: user.data_limit,
                              colorScheme: statusColors[user.status].bandWidthColor
                            })
                          })]
                        }), /* @__PURE__ */ jsxs(HStack, {
                          w: "full",
                          justifyContent: "space-between",
                          children: [/* @__PURE__ */ jsxs(Box, {
                            width: "full",
                            children: [/* @__PURE__ */ jsx(StatusBadge, {
                              compact: true,
                              expiryDate: user.expire,
                              status: user.status
                            }), /* @__PURE__ */ jsx(OnlineStatus, {
                              lastOnline: user.online_at
                            })]
                          }), /* @__PURE__ */ jsxs(HStack, {
                            children: [/* @__PURE__ */ jsx(ActionButtons, {
                              user
                            }), /* @__PURE__ */ jsx(Tooltip, {
                              label: t2("userDialog.editUser"),
                              placement: "top",
                              children: /* @__PURE__ */ jsx(IconButton, {
                                p: "0 !important",
                                "aria-label": "Edit user",
                                bg: "transparent",
                                _dark: {
                                  _hover: {
                                    bg: "gray.700"
                                  }
                                },
                                size: {
                                  base: "sm",
                                  md: "md"
                                },
                                onClick: (e) => {
                                  e.stopPropagation();
                                  onEditingUser(user);
                                },
                                children: /* @__PURE__ */ jsx(EditIcon, {})
                              })
                            })]
                          })]
                        })]
                      })
                    })]
                  })
                })
              })]
            }, user.username);
          }))
        })]
      })
    }), /* @__PURE__ */ jsxs(Table, {
      orientation: "vertical",
      display: {
        base: "none",
        md: "table"
      },
      sx: {
        "th, td": {
          px: {
            md: 3,
            xl: 5
          }
        }
      },
      ...props,
      children: [/* @__PURE__ */ jsx(Thead, {
        zIndex: "docked",
        position: "relative",
        children: /* @__PURE__ */ jsxs(Tr, {
          children: [/* @__PURE__ */ jsx(Th, {
            position: "sticky",
            top: {
              base: "unset",
              md: top
            },
            minW: "140px",
            cursor: "pointer",
            onClick: handleSort.bind(null, "username"),
            children: /* @__PURE__ */ jsxs(HStack, {
              children: [/* @__PURE__ */ jsx("span", {
                children: t2("username")
              }), /* @__PURE__ */ jsx(Sort, {
                sort: filters.sort,
                column: "username"
              })]
            })
          }), /* @__PURE__ */ jsx(Th, {
            position: "sticky",
            top: {
              base: "unset",
              md: top
            },
            width: "90px",
            minW: "80px",
            cursor: "pointer",
            onClick: handleSort.bind(null, "hwid_count"),
            children: /* @__PURE__ */ jsxs(HStack, {
              children: [/* @__PURE__ */ jsx("span", {
                children: t2("usersTable.devices")
              }), /* @__PURE__ */ jsx(Sort, {
                sort: filters.sort,
                column: "hwid_count"
              })]
            })
          }), /* @__PURE__ */ jsx(Th, {
            position: "sticky",
            top: {
              base: "unset",
              md: top
            },
            width: "90px",
            minW: "80px",
            cursor: "pointer",
            onClick: handleSort.bind(null, "online_ip_count"),
            children: /* @__PURE__ */ jsxs(HStack, {
              children: [/* @__PURE__ */ jsx("span", {
                children: t2("usersTable.activeIps")
              }), /* @__PURE__ */ jsx(Sort, {
                sort: filters.sort,
                column: "online_ip_count"
              })]
            })
          }), /* @__PURE__ */ jsx(Th, {
            position: "sticky",
            top: {
              base: "unset",
              md: top
            },
            width: "150px",
            minW: "130px",
            children: /* @__PURE__ */ jsxs(HStack, {
              gap: "4px",
              children: [/* @__PURE__ */ jsx(Text, {
                children: t2("usersTable.status")
              }), /* @__PURE__ */ jsxs(Select, {
                size: "xs",
                variant: "unstyled",
                w: "auto",
                minW: "68px",
                maxW: "88px",
                cursor: "pointer",
                value: filters.status || "",
                onChange: handleStatusFilter,
                children: [/* @__PURE__ */ jsx("option", {
                  value: "",
                  children: t2("all") || "all"
                }), /* @__PURE__ */ jsx("option", {
                  value: "active",
                  children: t2("status.active")
                }), /* @__PURE__ */ jsx("option", {
                  value: "on_hold",
                  children: t2("status.on_hold")
                }), /* @__PURE__ */ jsx("option", {
                  value: "disabled",
                  children: t2("status.disabled")
                }), /* @__PURE__ */ jsx("option", {
                  value: "limited",
                  children: t2("status.limited")
                }), /* @__PURE__ */ jsx("option", {
                  value: "expired",
                  children: t2("status.expired")
                })]
              })]
            })
          }), /* @__PURE__ */ jsx(Th, {
            position: "sticky",
            top: {
              base: "unset",
              md: top
            },
            width: "350px",
            minW: "230px",
            cursor: "pointer",
            onClick: handleSort.bind(null, "used_traffic"),
            children: /* @__PURE__ */ jsxs(HStack, {
              children: [/* @__PURE__ */ jsx("span", {
                children: t2("usersTable.dataUsage")
              }), /* @__PURE__ */ jsx(Sort, {
                sort: filters.sort,
                column: "used_traffic"
              })]
            })
          }), /* @__PURE__ */ jsx(Th, {
            position: "sticky",
            top: {
              base: "unset",
              md: top
            },
            width: "168px",
            minW: "150px"
          })]
        })
      }), /* @__PURE__ */ jsxs(Tbody, {
        children: [useTable && (users == null ? void 0 : users.map((user, i) => {
          var _a, _b, _c;
          return /* @__PURE__ */ jsxs(Tr, {
            className: classNames("interactive", {
              "last-row": i === users.length - 1
            }),
            onClick: () => onEditingUser(user),
            children: [/* @__PURE__ */ jsx(Td, {
              minW: "140px",
              children: /* @__PURE__ */ jsxs(HStack, {
                justifyContent: "space-between",
                spacing: 3,
                children: [/* @__PURE__ */ jsxs(Box, {
                  minW: 0,
                  children: [/* @__PURE__ */ jsxs("div", {
                    className: "flex-status",
                    children: [/* @__PURE__ */ jsx(OnlineBadge, {
                      lastOnline: user.online_at
                    }), /* @__PURE__ */ jsx(Text, {
                      as: "span",
                      fontWeight: "medium",
                      isTruncated: true,
                      children: user.username
                    })]
                  }), /* @__PURE__ */ jsxs(HStack, {
                    pl: "20px",
                    spacing: 2,
                    fontSize: "xs",
                    color: "gray.500",
                    whiteSpace: "nowrap",
                    mt: "1px",
                    children: [/* @__PURE__ */ jsx(Box, {
                      sx: {
                        "& > p": {
                          ml: 0
                        }
                      },
                      children: /* @__PURE__ */ jsx(OnlineStatus, {
                        lastOnline: user.online_at
                      })
                    }), isSudo && ((_a = user.admin) == null ? void 0 : _a.username) && /* @__PURE__ */ jsx(Text, {
                      as: "div",
                      children: /* @__PURE__ */ jsx(IconText, {
                        icon: UserIcon,
                        children: user.admin.username
                      })
                    })]
                  })]
                }), /* @__PURE__ */ jsxs(VStack, {
                  align: "flex-end",
                  spacing: 0,
                  minW: 0,
                  children: [/* @__PURE__ */ jsx(ProviderTag, {
                    username: user.username
                  }), /* @__PURE__ */ jsx(UserLiveTag, {
                    username: user.username
                  })]
                })]
              })
            }), /* @__PURE__ */ jsx(Td, {
              width: "90px",
              minW: "80px",
              children: /* @__PURE__ */ jsx(Text, {
                as: "div",
                fontSize: "sm",
                children: /* @__PURE__ */ jsxs(IconText, {
                  icon: DevicePhoneMobileIcon,
                  children: [(_b = user.hwid_count) != null ? _b : 0, user.hwid_limit ? `/${user.hwid_limit}` : ""]
                })
              })
            }), /* @__PURE__ */ jsx(Td, {
              width: "90px",
              minW: "80px",
              children: /* @__PURE__ */ jsx(Text, {
                as: "div",
                fontSize: "sm",
                children: /* @__PURE__ */ jsx(IconText, {
                  icon: SignalIcon,
                  children: (_c = user.online_ip_count) != null ? _c : 0
                })
              })
            }), /* @__PURE__ */ jsx(Td, {
              width: "150px",
              minW: "130px",
              children: /* @__PURE__ */ jsx(StatusBadge, {
                expiryDate: user.expire,
                status: user.status
              })
            }), /* @__PURE__ */ jsx(Td, {
              width: "350px",
              minW: "230px",
              children: /* @__PURE__ */ jsx(UsageSlider, {
                totalUsedTraffic: user.lifetime_used_traffic,
                dataLimitResetStrategy: user.data_limit_reset_strategy,
                used: user.used_traffic,
                total: user.data_limit,
                colorScheme: statusColors[user.status].bandWidthColor
              })
            }), /* @__PURE__ */ jsx(Td, {
              width: "168px",
              minW: "150px",
              children: /* @__PURE__ */ jsx(ActionButtons, {
                user
              })
            })]
          }, user.username);
        })), users.length == 0 && /* @__PURE__ */ jsx(Tr, {
          children: /* @__PURE__ */ jsx(Td, {
            colSpan: 6,
            children: /* @__PURE__ */ jsx(EmptySection, {
              isFiltered
            })
          })
        })]
      })]
    }), /* @__PURE__ */ jsx(Pagination, {})]
  });
};
const ActionButtons = ({
  user
}) => {
  const {
    setQRCode,
    setSubLink
  } = useDashboardPick("setQRCode", "setSubLink");
  const proxyLinks = user.links.join("\r\n");
  const [copied, setCopied] = react.exports.useState([-1, false]);
  react.exports.useEffect(() => {
    if (copied[1]) {
      setTimeout(() => {
        setCopied([-1, false]);
      }, 1e3);
    }
  }, [copied]);
  return /* @__PURE__ */ jsxs(HStack, {
    justifyContent: "flex-end",
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
    },
    children: [/* @__PURE__ */ jsx(lib, {
      text: user.subscription_url.startsWith("/") ? window.location.origin + user.subscription_url : user.subscription_url,
      onCopy: () => {
        setCopied([0, true]);
      },
      children: /* @__PURE__ */ jsx("div", {
        children: /* @__PURE__ */ jsx(Tooltip, {
          label: copied[0] == 0 && copied[1] ? t("usersTable.copied") : t("usersTable.copyLink"),
          placement: "top",
          children: /* @__PURE__ */ jsx(IconButton, {
            p: "0 !important",
            "aria-label": "copy subscription link",
            bg: "transparent",
            _dark: {
              _hover: {
                bg: "gray.700"
              }
            },
            size: {
              base: "sm",
              md: "md"
            },
            children: copied[0] == 0 && copied[1] ? /* @__PURE__ */ jsx(CopiedIcon, {}) : /* @__PURE__ */ jsx(SubscriptionLinkIcon, {})
          })
        })
      })
    }), /* @__PURE__ */ jsx(lib, {
      text: proxyLinks,
      onCopy: () => {
        setCopied([1, true]);
      },
      children: /* @__PURE__ */ jsx("div", {
        children: /* @__PURE__ */ jsx(Tooltip, {
          label: copied[0] == 1 && copied[1] ? t("usersTable.copied") : t("usersTable.copyConfigs"),
          placement: "top",
          children: /* @__PURE__ */ jsx(IconButton, {
            p: "0 !important",
            "aria-label": "copy configs",
            bg: "transparent",
            _dark: {
              _hover: {
                bg: "gray.700"
              }
            },
            size: {
              base: "sm",
              md: "md"
            },
            children: copied[0] == 1 && copied[1] ? /* @__PURE__ */ jsx(CopiedIcon, {}) : /* @__PURE__ */ jsx(CopyIcon, {})
          })
        })
      })
    }), /* @__PURE__ */ jsx(Tooltip, {
      label: "QR Code",
      placement: "top",
      children: /* @__PURE__ */ jsx(IconButton, {
        p: "0 !important",
        "aria-label": "qr code",
        bg: "transparent",
        _dark: {
          _hover: {
            bg: "gray.700"
          }
        },
        size: {
          base: "sm",
          md: "md"
        },
        onClick: () => {
          setQRCode(user.links);
          setSubLink(user.subscription_url);
        },
        children: /* @__PURE__ */ jsx(QRIcon, {})
      })
    })]
  });
};
const EmptySection = ({
  isFiltered
}) => {
  const {
    onCreateUser
  } = useDashboardPick("onCreateUser");
  return /* @__PURE__ */ jsxs(Box, {
    padding: "5",
    py: "8",
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    gap: 4,
    w: "full",
    children: [/* @__PURE__ */ jsx(EmptySectionIcon, {
      maxHeight: "200px",
      maxWidth: "200px",
      _dark: {
        'path[fill="#fff"]': {
          fill: "gray.800"
        },
        'path[fill="#f2f2f2"], path[fill="#e6e6e6"], path[fill="#ccc"]': {
          fill: "gray.700"
        },
        'circle[fill="#3182CE"]': {
          fill: "primary.300"
        }
      },
      _light: {
        'path[fill="#f2f2f2"], path[fill="#e6e6e6"], path[fill="#ccc"]': {
          fill: "gray.300"
        },
        'circle[fill="#3182CE"]': {
          fill: "primary.500"
        }
      }
    }), /* @__PURE__ */ jsx(Text, {
      fontWeight: "medium",
      color: "gray.600",
      _dark: {
        color: "gray.400"
      },
      children: isFiltered ? t("usersTable.noUserMatched") : t("usersTable.noUser")
    }), !isFiltered && /* @__PURE__ */ jsx(Button, {
      size: "sm",
      colorScheme: "primary",
      onClick: () => onCreateUser(true),
      children: t("createUser")
    })]
  });
};
const UsersView = () => /* @__PURE__ */ jsxs(Fragment, {
  children: [/* @__PURE__ */ jsx(Statistics, {
    mt: {
      base: 3,
      md: 4
    }
  }), /* @__PURE__ */ jsx(Filters, {}), /* @__PURE__ */ jsx(UsersTable, {})]
});
const QRCodeDialog = named(() => __vitePreload(() => import("./QRCodeDialog.5ff41c2f.js"), true ? ["statics/QRCodeDialog.5ff41c2f.js","statics/vendor.0404bf65.js","statics/slick.76e767b4.css"] : void 0), "QRCodeDialog");
const OnFirstOpen = ({
  when,
  children
}) => {
  const [seen2, setSeen] = react.exports.useState(when);
  react.exports.useEffect(() => {
    if (when)
      setSeen(true);
  }, [when]);
  return seen2 || when ? /* @__PURE__ */ jsx(react.exports.Suspense, {
    fallback: null,
    children
  }) : null;
};
const Dashboard = () => {
  react.exports.useEffect(() => {
    useDashboard.getState().refetchUsers();
    fetchInbounds();
  }, []);
  const sidebarWidth = useSidebarWidth();
  const s2 = {
    QRcodeLinks: useDashboard((d) => d.QRcodeLinks)
  };
  return /* @__PURE__ */ jsxs(Fragment, {
    children: [/* @__PURE__ */ jsx(Sidebar, {}), /* @__PURE__ */ jsxs(VStack, {
      justifyContent: "space-between",
      minH: "100dvh",
      px: {
        base: 3,
        md: 6
      },
      pt: {
        base: 3,
        md: 6
      },
      pb: {
        base: "calc(12px + env(safe-area-inset-bottom))",
        md: 6
      },
      pl: {
        base: 3,
        md: 6,
        lg: `calc(${sidebarWidth} + 1.5rem)`
      },
      rowGap: 4,
      children: [/* @__PURE__ */ jsxs(Box, {
        w: "full",
        children: [/* @__PURE__ */ jsx(Header, {}), /* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(UserDialog, {}), /* @__PURE__ */ jsx(DeleteUserModal, {}), /* @__PURE__ */ jsx(ResetUserUsageModal, {}), /* @__PURE__ */ jsx(RevokeSubscriptionModal, {}), /* @__PURE__ */ jsx(ResetAllUsageModal, {}), /* @__PURE__ */ jsx(OnFirstOpen, {
          when: s2.QRcodeLinks !== null,
          children: /* @__PURE__ */ jsx(QRCodeDialog, {})
        })]
      }), /* @__PURE__ */ jsx(Footer, {})]
    })]
  });
};
const SvgLogo = (props) => /* @__PURE__ */ react.exports.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 64 64", ...props }, /* @__PURE__ */ react.exports.createElement("defs", null, /* @__PURE__ */ react.exports.createElement("linearGradient", { id: "ag", x1: 0, y1: 0, x2: 1, y2: 1 }, /* @__PURE__ */ react.exports.createElement("stop", { offset: 0, stopColor: "#7c96fb" }), /* @__PURE__ */ react.exports.createElement("stop", { offset: 1, stopColor: "#7c6cf2" })), /* @__PURE__ */ react.exports.createElement("linearGradient", { id: "as", x1: 0, y1: 0, x2: 0, y2: 1 }, /* @__PURE__ */ react.exports.createElement("stop", { offset: 0, stopColor: "#ffffff", stopOpacity: 0.28 }), /* @__PURE__ */ react.exports.createElement("stop", { offset: 0.5, stopColor: "#ffffff", stopOpacity: 0 }))), /* @__PURE__ */ react.exports.createElement("rect", { width: 64, height: 64, rx: 16, fill: "url(#ag)" }), /* @__PURE__ */ react.exports.createElement("rect", { width: 64, height: 64, rx: 16, fill: "url(#as)" }), /* @__PURE__ */ react.exports.createElement("g", { transform: "translate(14 14) scale(1.5)", fill: "none", stroke: "#fff", strokeWidth: 1.7, strokeLinecap: "round", strokeLinejoin: "round" }, /* @__PURE__ */ react.exports.createElement("path", { d: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" })));
const schema = z.object({
  username: z.string().min(1, "login.fieldRequired"),
  password: z.string().min(1, "login.fieldRequired")
});
const LogoIcon = chakra(SvgLogo, {
  baseStyle: {
    w: 14,
    h: 14,
    borderRadius: "18px",
    boxShadow: "0 10px 30px color-mix(in srgb, var(--chakra-colors-primary-500) 40%, transparent)"
  }
});
const LoginIcon = chakra(ArrowRightOnRectangleIcon, {
  baseStyle: {
    w: 5,
    h: 5,
    strokeWidth: "2px"
  }
});
const Login = () => {
  var _a, _b;
  const [error, setError] = react.exports.useState("");
  const [loading, setLoading] = react.exports.useState(false);
  const navigate = useNavigate();
  const {
    t: t2
  } = useTranslation();
  let location = useLocation();
  const {
    register,
    formState: {
      errors
    },
    handleSubmit
  } = useForm({
    resolver: s(schema)
  });
  react.exports.useEffect(() => {
    removeAuthToken();
    if (location.pathname !== "/login") {
      navigate("/login", {
        replace: true
      });
    }
  }, []);
  const login = (values) => {
    setError("");
    const formData = new FormData();
    formData.append("username", values.username);
    formData.append("password", values.password);
    formData.append("grant_type", "password");
    setLoading(true);
    fetch$1("/admin/token", {
      method: "post",
      body: formData
    }).then(({
      access_token: token
    }) => {
      setAuthToken(token);
      navigate("/");
    }).catch((err) => {
      setError(err.response._data.detail);
    }).finally(setLoading.bind(null, false));
  };
  return /* @__PURE__ */ jsxs(VStack, {
    justifyContent: "space-between",
    minH: "100dvh",
    p: {
      base: 4,
      md: 6
    },
    w: "full",
    className: "alexen-login",
    children: [/* @__PURE__ */ jsx(HStack, {
      justifyContent: "end",
      w: "full",
      children: /* @__PURE__ */ jsx(Language, {})
    }), /* @__PURE__ */ jsxs(Box, {
      className: "chakra-card alexen-login-card",
      w: "full",
      maxW: "400px",
      p: {
        base: 6,
        md: 8
      },
      borderRadius: "28px",
      bg: "var(--app-surface)",
      borderWidth: "1px",
      borderColor: "blackAlpha.50",
      boxShadow: "0 24px 64px rgba(16,24,40,.10)",
      _dark: {
        bg: "gray.750",
        borderColor: "var(--alexen-line)",
        boxShadow: "0 24px 64px rgba(0,0,0,.45)"
      },
      children: [/* @__PURE__ */ jsxs(VStack, {
        spacing: 2,
        mb: 6,
        children: [/* @__PURE__ */ jsx(LogoIcon, {}), /* @__PURE__ */ jsx(Text, {
          fontSize: "2xl",
          fontWeight: "bold",
          letterSpacing: "-0.02em",
          pt: 2,
          children: t2("login.loginYourAccount")
        }), /* @__PURE__ */ jsx(Text, {
          color: "gray.500",
          fontSize: "sm",
          textAlign: "center",
          children: t2("login.welcomeBack")
        })]
      }), /* @__PURE__ */ jsx("form", {
        onSubmit: handleSubmit(login),
        children: /* @__PURE__ */ jsxs(VStack, {
          spacing: 3,
          children: [/* @__PURE__ */ jsx(FormControl, {
            children: /* @__PURE__ */ jsx(Input, {
              w: "full",
              size: "lg",
              placeholder: t2("username"),
              autoComplete: "username",
              ...register("username"),
              error: t2((_a = errors == null ? void 0 : errors.username) == null ? void 0 : _a.message)
            })
          }), /* @__PURE__ */ jsx(FormControl, {
            children: /* @__PURE__ */ jsx(Input, {
              w: "full",
              size: "lg",
              type: "password",
              placeholder: t2("password"),
              autoComplete: "current-password",
              ...register("password"),
              error: t2((_b = errors == null ? void 0 : errors.password) == null ? void 0 : _b.message)
            })
          }), error && /* @__PURE__ */ jsxs(Alert, {
            status: "error",
            borderRadius: "12px",
            children: [/* @__PURE__ */ jsx(AlertIcon, {}), /* @__PURE__ */ jsx(AlertDescription, {
              children: error
            })]
          }), /* @__PURE__ */ jsxs(Button, {
            isLoading: loading,
            type: "submit",
            w: "full",
            size: "lg",
            colorScheme: "primary",
            mt: 1,
            children: [/* @__PURE__ */ jsx(LoginIcon, {
              marginRight: 2
            }), t2("login")]
          })]
        })
      })]
    }), /* @__PURE__ */ jsx(Footer, {})]
  });
};
const RouteError = () => {
  var _a, _b, _c;
  const error = useRouteError();
  const {
    t: t2
  } = useTranslation();
  const status = (_c = (_b = error == null ? void 0 : error.status) != null ? _b : (_a = error == null ? void 0 : error.response) == null ? void 0 : _a.status) != null ? _c : error == null ? void 0 : error.statusCode;
  const chunk = isChunkError(error);
  react.exports.useEffect(() => {
    if (chunk)
      reloadForUpdate();
  }, [chunk]);
  if (status === 401 || status === 403)
    return /* @__PURE__ */ jsx(Login, {});
  return /* @__PURE__ */ jsxs(VStack, {
    minH: "100vh",
    justifyContent: "center",
    spacing: 4,
    p: 6,
    textAlign: "center",
    children: [/* @__PURE__ */ jsx(Text, {
      fontSize: "lg",
      fontWeight: "semibold",
      children: chunk ? t2("errors.updated") : t2("errors.page")
    }), /* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      color: "gray.500",
      maxW: "420px",
      children: chunk ? t2("errors.updatedHelp") : String((error == null ? void 0 : error.message) || "").slice(0, 200)
    }), /* @__PURE__ */ jsx(Box, {
      children: /* @__PURE__ */ jsx(Button, {
        colorScheme: "primary",
        onClick: () => window.location.reload(),
        children: t2("errors.reload")
      })
    })]
  });
};
const fetchAdminLoader = () => {
  return fetch$1("/admin", {
    headers: {
      Authorization: `Bearer ${getAuthToken()}`
    }
  });
};
const router = createHashRouter([{
  path: "/",
  element: /* @__PURE__ */ jsx(Dashboard, {}),
  errorElement: /* @__PURE__ */ jsx(RouteError, {}),
  loader: fetchAdminLoader,
  children: [{
    index: true,
    element: /* @__PURE__ */ jsx(UsersView, {})
  }, ...SECTIONS.map((section) => ({
    path: section.path,
    element: /* @__PURE__ */ jsx(SectionPage, {
      section
    }, section.path)
  }))]
}, {
  path: "/login/",
  element: /* @__PURE__ */ jsx(Login, {})
}]);
function App() {
  return /* @__PURE__ */ jsx("main", {
    className: "p-8",
    children: /* @__PURE__ */ jsx(RouterProvider, {
      router
    })
  });
}
const index = "";
window.addEventListener("vite:preloadError", (e) => {
  if (reloadForUpdate())
    e.preventDefault();
});
dayjs.extend(Timezone);
dayjs.extend(LocalizedFormat);
dayjs.extend(utc);
dayjs.extend(RelativeTime);
dayjs.extend(Duration);
updateThemeColor(localStorageManager.get() || "light");
initAppearance();
client.createRoot(document.getElementById("root")).render(/* @__PURE__ */ jsx(React.StrictMode, {
  children: /* @__PURE__ */ jsx(ChakraProvider, {
    theme,
    children: /* @__PURE__ */ jsx(QueryClientProvider, {
      client: queryClient,
      children: /* @__PURE__ */ jsx(App, {})
    })
  })
}));
export {
  DeleteIcon$1 as D,
  Icon as I,
  Modal as M,
  ReloadIcon as R,
  StableChart as S,
  UsageFilter as U,
  useGetUser as a,
  formatBytes as b,
  useOnlineProviders as c,
  ModalOverlay as d,
  ModalContent as e,
  fetch$1 as f,
  generateDistinctColors as g,
  ModalHeader as h,
  ModalCloseButton as i,
  ModalBody as j,
  Input as k,
  useDashboard as l,
  createUsageConfig as m,
  ModalFooter as n,
  proxyALPN as o,
  proxyHostSecurity as p,
  proxyFingerprint as q,
  relativeExpiryDate as r,
  statusColors as s,
  useLiveTraffic as t,
  useDashboardPick as u,
  formatRate as v,
  fetchInbounds as w,
  getAuthToken as x
};
