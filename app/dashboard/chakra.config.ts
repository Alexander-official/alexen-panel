import { extendTheme } from "@chakra-ui/react";
export const theme = extendTheme({
  // softer corners everywhere (Chakra defaults: sm 2px, md 6px, lg 8px)
  radii: { sm: "6px", md: "10px", lg: "12px", xl: "16px" },
  shadows: { outline: "0 0 0 2px var(--chakra-colors-primary-200)" },
  fonts: {
    body: `Inter,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Fira Sans,Droid Sans,Helvetica Neue,sans-serif`,
  },
  colors: {
    // soft hairlines: cards and tables are told apart by fill and shadow, not lines
    "light-border": "#e6e8ec",
    // the default accent (periwinkle); utils/appearance.ts swaps it at runtime
    primary: {
      50: "#b3c2fd", 100: "#a6b8fc", 200: "#96aafc", 300: "#7c96fb", 400: "#6b89fa",
      500: "#5b7cfa", 600: "#5270e1", 700: "#4963c8", 800: "#4057af", 900: "#374a96",
    },
    gray: {
      750: "#222C3B",
    },
  },
  components: {
    // the panel's own component look (instead of Chakra's stock one): soft fills,
    // hairline borders, a colored glow on primary buttons, rounder corners
    Button: {
      baseStyle: { borderRadius: "12px", fontWeight: "semibold", transitionProperty: "background-color, box-shadow, transform, color", transitionDuration: ".15s" },
      variants: {
        solid: (p: any) =>
          p.colorScheme === "primary"
            ? {
                bg: "primary.500",
                color: "white",
                boxShadow: "0 4px 14px color-mix(in srgb, var(--chakra-colors-primary-500) 32%, transparent), inset 0 1px 0 rgba(255,255,255,.18)",
                _hover: { bg: "primary.600", _disabled: { bg: "primary.500" } },
                _active: { bg: "primary.700", transform: "translateY(1px)" },
                _dark: { bg: "primary.500", color: "white", _hover: { bg: "primary.400" } },
              }
            : p.colorScheme === "gray"
            ? { bg: "blackAlpha.50", _hover: { bg: "blackAlpha.100" }, _dark: { bg: "whiteAlpha.100", _hover: { bg: "whiteAlpha.200" } } }
            : {},
        // items sit a tier above the layer they are on (see utils/appearance.ts)
        outline: (p: any) => ({
          bg: "var(--tier-item)",
          borderColor: p.colorScheme === "primary" ? "color-mix(in srgb, var(--chakra-colors-primary-500) 45%, var(--tier-line))" : "var(--tier-line)",
          _hover: { bg: "var(--tier-item-hover)" },
          _dark: {
            bg: "var(--tier-item)",
            borderColor: p.colorScheme === "primary" ? "color-mix(in srgb, var(--chakra-colors-primary-400) 45%, var(--tier-line))" : "var(--tier-line)",
            _hover: { bg: "var(--tier-item-hover)" },
          },
        }),
        ghost: () => ({ _hover: { bg: "blackAlpha.50" }, _dark: { _hover: { bg: "whiteAlpha.100" } } }),
      },
    },
    Tooltip: {
      baseStyle: { borderRadius: "8px", px: 2.5, py: 1.5, fontSize: "xs", fontWeight: "medium", bg: "gray.800", color: "white", boxShadow: "0 6px 20px rgba(0,0,0,.18)" },
    },
    Badge: {
      baseStyle: { borderRadius: "full", px: 2, textTransform: "none", fontWeight: "semibold" },
      variants: {
        // a tint of the color with readable text (the stock 100-shade is too strong
        // with the generated accent palettes)
        subtle: (p: any) => ({
          bg: `color-mix(in srgb, var(--chakra-colors-${p.colorScheme}-500) 14%, transparent)`,
          color: `${p.colorScheme}.600`,
          _dark: { bg: `color-mix(in srgb, var(--chakra-colors-${p.colorScheme}-400) 20%, transparent)`, color: `${p.colorScheme}.200` },
        }),
      },
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
              _dark: { bg: "color-mix(in srgb, var(--chakra-colors-primary-400) 20%, transparent)", color: "primary.200" },
            },
          },
        },
      },
    },
    Switch: {
      baseStyle: {
        track: { bg: "blackAlpha.300", _dark: { bg: "whiteAlpha.300" }, _checked: { bg: "primary.500", _dark: { bg: "primary.500" } } },
      },
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
          _dark: { borderColor: "var(--alexen-field-border)", bg: "var(--alexen-field)" },
        },
      },
    },
    NumberInput: {
      variants: {
        outline: {
          field: {
            bg: "var(--alexen-field)",
            borderColor: "var(--alexen-field-border)",
            _hover: { borderColor: "var(--alexen-field-hover)" },
            _focusVisible: { borderColor: "primary.400", boxShadow: "0 0 0 3px color-mix(in srgb, var(--chakra-colors-primary-500) 18%, transparent)" },
            _dark: { borderColor: "var(--alexen-field-border)", bg: "var(--alexen-field)" },
          },
        },
      },
    },
    // softer corners across the panel
    Card: { baseStyle: { container: { borderRadius: "14px" } } },
    Modal: {
      baseStyle: {
        dialog: { borderRadius: "22px", boxShadow: "0 24px 64px rgba(16,24,40,.18)", _dark: { boxShadow: "0 24px 64px rgba(0,0,0,.5)" } },
        overlay: { bg: "blackAlpha.400" },
      },
    },
    Menu: {
      baseStyle: {
        list: { borderRadius: "14px", p: 1.5, boxShadow: "0 12px 40px rgba(16,24,40,.14)", borderColor: "blackAlpha.100", _dark: { borderColor: "whiteAlpha.100", boxShadow: "0 12px 40px rgba(0,0,0,.45)" } },
        item: { borderRadius: "10px", _hover: { bg: "blackAlpha.50" }, _focus: { bg: "blackAlpha.50" }, _dark: { _hover: { bg: "whiteAlpha.100" }, _focus: { bg: "whiteAlpha.100" } } },
      },
    },
    Alert: {
      baseStyle: {
        container: {
          borderRadius: "8px",
          fontSize: "sm",
        },
      },
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
            _dark: { borderColor: "var(--alexen-field-border)", bg: "var(--alexen-field)" },
          },
        },
      },
    },
    FormHelperText: {
      baseStyle: {
        fontSize: "xs",
      },
    },
    FormLabel: {
      baseStyle: {
        fontSize: "sm",
        fontWeight: "medium",
        mb: "1",
        _dark: { color: "gray.300" },
      },
    },
    Input: {
      variants: {
        outline: {
          field: {
            bg: "var(--alexen-field)",
            borderColor: "var(--alexen-field-border)",
            _hover: { borderColor: "var(--alexen-field-hover)" },
            _dark: { bg: "var(--alexen-field)" },
          },
        },
      },
      baseStyle: {
        addon: {
          _dark: {
            borderColor: "gray.600",
            _placeholder: {
              color: "gray.500",
            },
          },
        },
        field: {
          borderRadius: "10px",
          _focusVisible: {
            boxShadow: "0 0 0 3px color-mix(in srgb, var(--chakra-colors-primary-500) 18%, transparent)",
            borderColor: "primary.400",
            outline: "none",
          },
          _dark: {
            borderColor: "var(--alexen-field-border)",
            _disabled: {
              color: "gray.400",
              borderColor: "gray.500",
            },
            _placeholder: {
              color: "gray.500",
            },
          },
        },
      },
    },
    Table: {
      baseStyle: {
        table: {
          borderCollapse: "separate",
          borderSpacing: 0,
        },
        thead: {
          borderBottomColor: "light-border",
        },
        th: {
          background: "var(--app-surface-2)",
          borderColor: "light-border !important",
          borderBottomColor: "light-border !important",
          borderTop: "1px solid ",
          borderTopColor: "light-border !important",
          _first: {
            borderLeft: "1px solid",
            borderColor: "light-border !important",
          },
          _last: {
            borderRight: "1px solid",
            borderColor: "light-border !important",
          },
          _dark: {
            borderColor: "var(--alexen-line) !important",
            background: "gray.750",
          },
        },
        td: {
          transition: "background-color .12s ease-out",
          borderColor: "light-border",
          borderBottomColor: "light-border !important",
          _first: {
            borderLeft: "1px solid",
            borderColor: "light-border",
            _dark: {
              borderColor: "var(--alexen-line)",
            },
          },
          _last: {
            borderRight: "1px solid",
            borderColor: "light-border",
            _dark: {
              borderColor: "var(--alexen-line)",
            },
          },
          _dark: {
            borderColor: "var(--alexen-line)",
            borderBottomColor: "var(--alexen-line) !important",
          },
        },
        tr: {
          "&.interactive": {
            cursor: "pointer",
            _hover: {
              "& > td": {
                bg: "gray.200",
              },
              _dark: {
                "& > td": {
                  bg: "gray.750",
                },
              },
            },
          },
          _last: {
            "& > td": {
              _first: {
                borderBottomLeftRadius: "14px",
              },
              _last: {
                borderBottomRightRadius: "14px",
              },
            },
          },
        },
      },
    },
  },
});
