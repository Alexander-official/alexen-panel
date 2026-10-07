import { k as Input$1, u as useDashboardPick, M as Modal, d as ModalOverlay, e as ModalContent, h as ModalHeader, I as Icon, i as ModalCloseButton, j as ModalBody, D as DeleteIcon, p as proxyHostSecurity, o as proxyALPN, q as proxyFingerprint, t as useLiveTraffic, v as formatRate } from "./index.e0e646b5.js";
import { E as chakra, cz as DocumentDuplicateIcon, cA as ArrowUpIcon, cB as ArrowDownIcon, aa as Select$1, aQ as LinkIcon, cC as InformationCircleIcon, bC as z, ba as FormErrorMessage, W as useToast, u as useTranslation, c as react, bD as useForm, h as jsxs, k as jsx, bF as FormProvider, H as HStack, T as Text, o as Button, cD as PlusSmallIcon, bf as Accordion, ah as VStack, bd as useFormContext, cE as useFieldArray, bi as AccordionItem, bj as AccordionButton, cs as AccordionIcon, bk as AccordionPanel, cF as motion, b3 as FormControl, a5 as InputGroup, a8 as InputRightElement, cG as Popover, cH as PopoverTrigger, N as Box, cI as Portal, cJ as PopoverContent, cK as PopoverArrow, cL as PopoverCloseButton, cM as PopoverBody, D as Badge, bH as Controller, cN as Container, ak as Switch, aj as Tooltip, a9 as IconButton, b4 as FormLabel, X as Trans, bm as Checkbox, bE as s, by as ArrowsUpDownIcon } from "./vendor.0404bf65.js";
import { u as useHosts, A as AddHostModal, H as HostGroupPicker } from "./InboundBuilder.0d437d98.js";
/* empty css                */import "./CoreSettingsContext.ae7a60ef.js";
const DuplicateIcon = chakra(DocumentDuplicateIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const UpIcon = chakra(ArrowUpIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const DownIcon = chakra(ArrowDownIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const Select = chakra(Select$1, {
  baseStyle: {
    bg: "var(--app-surface)",
    _dark: {
      bg: "gray.700"
    }
  }
});
const Input = chakra(Input$1, {
  baseStyle: {
    bg: "var(--app-surface)",
    _dark: {
      bg: "gray.700"
    }
  }
});
const ModalIcon = chakra(LinkIcon, {
  baseStyle: {
    w: 5,
    h: 5
  }
});
const InfoIcon = chakra(InformationCircleIcon, {
  baseStyle: {
    w: 4,
    h: 4,
    color: "gray.400",
    cursor: "pointer"
  }
});
const hostsSchema = z.record(z.string().min(1), z.array(z.object({
  remark: z.string().min(1, "Remark is required"),
  address: z.string().min(1, "Address is required"),
  port: z.string().or(z.number()).nullable().transform((value) => {
    if (typeof value === "number")
      return value;
    if (value !== null && !isNaN(parseInt(value)))
      return Number(parseInt(value));
    return null;
  }),
  path: z.string().nullable(),
  sni: z.string().nullable(),
  host: z.string().nullable(),
  mux_enable: z.boolean().default(false),
  allowinsecure: z.boolean().nullable().default(false),
  is_disabled: z.boolean().default(true),
  fragment_setting: z.string().nullable(),
  noise_setting: z.string().nullable(),
  random_user_agent: z.boolean().default(false),
  security: z.string(),
  alpn: z.string(),
  fingerprint: z.string(),
  use_sni_as_host: z.boolean().default(false),
  group_name: z.string().nullable()
})));
const Error = chakra(FormErrorMessage, {
  baseStyle: {
    color: "red.400",
    display: "block",
    textAlign: "left",
    w: "100%"
  }
});
const InboundRate = ({
  tag
}) => {
  var _a;
  const {
    data
  } = useLiveTraffic();
  const entry = (_a = data == null ? void 0 : data.inbounds) == null ? void 0 : _a[tag];
  const nodes = Object.entries((entry == null ? void 0 : entry.nodes) || {}).sort((a, b) => b[1] - a[1]);
  return /* @__PURE__ */ jsx(Tooltip, {
    label: nodes.length ? /* @__PURE__ */ jsx(Text, {
      whiteSpace: "pre",
      children: nodes.map(([n, r]) => `${n}: ${formatRate(r)}`).join("\n")
    }) : "",
    hasArrow: true,
    children: /* @__PURE__ */ jsxs(HStack, {
      spacing: 1,
      mr: 2,
      fontSize: "xs",
      color: entry && entry.rate >= 1 ? "primary.500" : "gray.500",
      children: [/* @__PURE__ */ jsx(ArrowsUpDownIcon, {
        width: 13
      }), /* @__PURE__ */ jsx(Text, {
        as: "span",
        whiteSpace: "nowrap",
        children: formatRate((entry == null ? void 0 : entry.rate) || 0)
      })]
    })
  });
};
const AccordionInbound = ({
  hostKey,
  isOpen,
  toggleAccordion
}) => {
  const {
    inbounds
  } = useDashboardPick("inbounds");
  const inbound = [...inbounds.values()].flat().filter((inbound2) => inbound2.tag === hostKey)[0];
  const form = useFormContext();
  const {
    fields: hosts,
    append: addHost,
    remove: removeHost,
    insert: insertHost,
    move: moveHost
  } = useFieldArray({
    control: form.control,
    name: hostKey
  });
  const {
    errors
  } = form.formState;
  const {
    t
  } = useTranslation();
  const accordionErrors = errors[hostKey];
  const handleAddHost = () => {
    addHost({
      host: "",
      group_name: "",
      sni: "",
      port: null,
      path: null,
      address: "",
      remark: "",
      mux_enable: false,
      allowinsecure: false,
      is_disabled: false,
      fragment_setting: "",
      noise_setting: "",
      random_user_agent: false,
      security: "inbound_default",
      alpn: "",
      fingerprint: "",
      use_sni_as_host: false
    });
  };
  const duplicateHost = (index) => {
    if (index < 0 || index >= hosts.length)
      return;
    const hostToDuplicate = hosts[index];
    insertHost(index + 1, hostToDuplicate);
  };
  react.exports.useEffect(() => {
    if (accordionErrors && !isOpen) {
      toggleAccordion();
    }
  }, [accordionErrors]);
  const moveHostPosition = (index, direction) => {
    if (direction === "up" && index > 0) {
      moveHost(index, index - 1);
    } else if (direction === "down" && index < hosts.length - 1) {
      moveHost(index, index + 1);
    }
  };
  return /* @__PURE__ */ jsxs(AccordionItem, {
    border: "1px solid",
    _dark: {
      borderColor: "var(--alexen-line)",
      bg: "whiteAlpha.50"
    },
    _light: {
      borderColor: "blackAlpha.100",
      bg: "var(--app-surface)"
    },
    borderRadius: "14px",
    p: 1,
    w: "full",
    children: [/* @__PURE__ */ jsxs(AccordionButton, {
      px: 3,
      py: 2.5,
      borderRadius: "11px",
      onClick: toggleAccordion,
      children: [/* @__PURE__ */ jsx(Text, {
        as: "span",
        fontWeight: "medium",
        fontSize: "sm",
        flex: "1",
        textAlign: "left",
        color: "gray.700",
        _dark: {
          color: "gray.300"
        },
        children: hostKey
      }), /* @__PURE__ */ jsx(InboundRate, {
        tag: hostKey
      }), /* @__PURE__ */ jsx(AccordionIcon, {})]
    }), /* @__PURE__ */ jsx(AccordionPanel, {
      px: 2,
      pb: 2,
      children: /* @__PURE__ */ jsxs(VStack, {
        gap: 3,
        children: [hosts.map((host, index) => {
          var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k, _l, _m, _n, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _A, _B, _C, _D, _E, _F, _G, _H, _I, _J, _K, _L, _M, _N, _O, _P, _Q, _R, _S;
          return /* @__PURE__ */ jsx(motion.div, {
            layout: true,
            initial: false,
            animate: {
              opacity: 1
            },
            exit: {
              opacity: 0
            },
            transition: {
              layout: {
                type: "spring",
                stiffness: 500,
                damping: 30
              },
              opacity: {
                duration: 0.1
              }
            },
            id: host.id,
            whileDrag: {
              scale: 1.05,
              zIndex: 10
            },
            style: {
              width: "100%"
            },
            children: /* @__PURE__ */ jsxs(VStack, {
              id: host.id,
              border: "1px solid",
              _dark: {
                borderColor: "var(--alexen-line)",
                bg: "gray.750"
              },
              _light: {
                borderColor: "blackAlpha.100",
                bg: "var(--app-surface-2)"
              },
              p: 3,
              w: "full",
              borderRadius: "12px",
              children: [/* @__PURE__ */ jsx(HStack, {
                w: "100%",
                alignItems: "flex-start",
                children: /* @__PURE__ */ jsxs(FormControl, {
                  position: "relative",
                  zIndex: 10,
                  isInvalid: !!(accordionErrors && ((_a = accordionErrors[index]) == null ? void 0 : _a.remark)),
                  children: [/* @__PURE__ */ jsxs(InputGroup, {
                    children: [/* @__PURE__ */ jsx(Input, {
                      ...form.register(hostKey + "." + index + ".remark"),
                      size: "sm",
                      borderRadius: "4px",
                      placeholder: t("hostsDialog.remark")
                    }), /* @__PURE__ */ jsx(InputRightElement, {
                      children: /* @__PURE__ */ jsxs(Popover, {
                        isLazy: true,
                        placement: "right",
                        children: [/* @__PURE__ */ jsx(PopoverTrigger, {
                          children: /* @__PURE__ */ jsx(Box, {
                            mt: "-8px",
                            children: /* @__PURE__ */ jsx(InfoIcon, {})
                          })
                        }), /* @__PURE__ */ jsx(Portal, {
                          children: /* @__PURE__ */ jsxs(PopoverContent, {
                            children: [/* @__PURE__ */ jsx(PopoverArrow, {}), /* @__PURE__ */ jsx(PopoverCloseButton, {}), /* @__PURE__ */ jsx(PopoverBody, {
                              children: /* @__PURE__ */ jsxs(Box, {
                                fontSize: "xs",
                                children: [/* @__PURE__ */ jsx(Text, {
                                  pr: "20px",
                                  children: t("hostsDialog.desc")
                                }), /* @__PURE__ */ jsxs(Text, {
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "SERVER_IP", "}"]
                                  }), " ", t("hostsDialog.currentServer")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "SERVER_IPV6", "}"]
                                  }), " ", t("hostsDialog.currentServerv6")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "USERNAME", "}"]
                                  }), " ", t("hostsDialog.username")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "DATA_USAGE", "}"]
                                  }), " ", t("hostsDialog.dataUsage")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "DATA_LEFT", "}"]
                                  }), " ", t("hostsDialog.remainingData")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "DATA_LIMIT", "}"]
                                  }), " ", t("hostsDialog.dataLimit")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "DAYS_LEFT", "}"]
                                  }), " ", t("hostsDialog.remainingDays")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "EXPIRE_DATE", "}"]
                                  }), " ", t("hostsDialog.expireDate")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "JALALI_EXPIRE_DATE", "}"]
                                  }), " ", t("hostsDialog.jalaliExpireDate")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "TIME_LEFT", "}"]
                                  }), " ", t("hostsDialog.remainingTime")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "STATUS_TEXT", "}"]
                                  }), " ", t("hostsDialog.statusText")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "STATUS_EMOJI", "}"]
                                  }), " ", t("hostsDialog.statusEmoji")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "PROTOCOL", "}"]
                                  }), " ", t("hostsDialog.proxyProtocol")]
                                }), /* @__PURE__ */ jsxs(Text, {
                                  mt: 1,
                                  children: [/* @__PURE__ */ jsxs(Badge, {
                                    children: ["{", "TRANSPORT", "}"]
                                  }), " ", t("hostsDialog.proxyMethod")]
                                })]
                              })
                            })]
                          })
                        })]
                      })
                    })]
                  }), accordionErrors && ((_b = accordionErrors[index]) == null ? void 0 : _b.remark) && /* @__PURE__ */ jsx(Error, {
                    children: (_d = (_c = accordionErrors[index]) == null ? void 0 : _c.remark) == null ? void 0 : _d.message
                  })]
                })
              }), /* @__PURE__ */ jsxs(FormControl, {
                isInvalid: !!(accordionErrors && ((_e = accordionErrors[index]) == null ? void 0 : _e.address)),
                children: [/* @__PURE__ */ jsxs(InputGroup, {
                  children: [/* @__PURE__ */ jsx(Input, {
                    size: "sm",
                    borderRadius: "4px",
                    placeholder: "Address (e.g. example.com)",
                    ...form.register(hostKey + "." + index + ".address")
                  }), /* @__PURE__ */ jsx(InputRightElement, {
                    children: /* @__PURE__ */ jsxs(Popover, {
                      isLazy: true,
                      placement: "right",
                      children: [/* @__PURE__ */ jsx(PopoverTrigger, {
                        children: /* @__PURE__ */ jsx(Box, {
                          mt: "-8px",
                          children: /* @__PURE__ */ jsx(InfoIcon, {})
                        })
                      }), /* @__PURE__ */ jsx(Portal, {
                        children: /* @__PURE__ */ jsxs(PopoverContent, {
                          children: [/* @__PURE__ */ jsx(PopoverArrow, {}), /* @__PURE__ */ jsx(PopoverCloseButton, {}), /* @__PURE__ */ jsx(PopoverBody, {
                            children: /* @__PURE__ */ jsxs(Box, {
                              fontSize: "xs",
                              children: [/* @__PURE__ */ jsx(Text, {
                                pr: "20px",
                                children: t("hostsDialog.desc")
                              }), /* @__PURE__ */ jsxs(Text, {
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "SERVER_IP", "}"]
                                }), " ", t("hostsDialog.currentServer")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "SERVER_IPV6", "}"]
                                }), " ", t("hostsDialog.currentServerv6")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "USERNAME", "}"]
                                }), " ", t("hostsDialog.username")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "DATA_USAGE", "}"]
                                }), " ", t("hostsDialog.dataUsage")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "DATA_LEFT", "}"]
                                }), " ", t("hostsDialog.remainingData")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "DATA_LIMIT", "}"]
                                }), " ", t("hostsDialog.dataLimit")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "DAYS_LEFT", "}"]
                                }), " ", t("hostsDialog.remainingDays")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "EXPIRE_DATE", "}"]
                                }), " ", t("hostsDialog.expireDate")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "JALALI_EXPIRE_DATE", "}"]
                                }), " ", t("hostsDialog.jalaliExpireDate")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "TIME_LEFT", "}"]
                                }), " ", t("hostsDialog.remainingTime")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "STATUS_TEXT", "}"]
                                }), " ", t("hostsDialog.statusText")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "STATUS_EMOJI", "}"]
                                }), " ", t("hostsDialog.statusEmoji")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "PROTOCOL", "}"]
                                }), " ", t("hostsDialog.proxyProtocol")]
                              }), /* @__PURE__ */ jsxs(Text, {
                                mt: 1,
                                children: [/* @__PURE__ */ jsxs(Badge, {
                                  children: ["{", "TRANSPORT", "}"]
                                }), " ", t("hostsDialog.proxyMethod")]
                              })]
                            })
                          })]
                        })
                      })]
                    })
                  })]
                }), accordionErrors && ((_f = accordionErrors[index]) == null ? void 0 : _f.address) && /* @__PURE__ */ jsx(Error, {
                  children: (_h = (_g = accordionErrors[index]) == null ? void 0 : _g.address) == null ? void 0 : _h.message
                })]
              }), /* @__PURE__ */ jsx(FormControl, {
                children: /* @__PURE__ */ jsx(Controller, {
                  control: form.control,
                  name: hostKey + "." + index + ".group_name",
                  render: ({
                    field
                  }) => /* @__PURE__ */ jsx(HostGroupPicker, {
                    value: field.value,
                    onChange: field.onChange
                  })
                })
              }), /* @__PURE__ */ jsx(Accordion, {
                w: "full",
                allowToggle: true,
                children: /* @__PURE__ */ jsxs(AccordionItem, {
                  border: "0",
                  children: [/* @__PURE__ */ jsxs("div", {
                    style: {
                      display: "flex",
                      alignItems: "center"
                    },
                    children: [/* @__PURE__ */ jsxs(AccordionButton, {
                      display: "flex",
                      px: 0,
                      py: 1,
                      borderRadius: 3,
                      _hover: {
                        bg: "transparent"
                      },
                      children: [/* @__PURE__ */ jsxs(Text, {
                        flex: "3",
                        align: "start",
                        fontSize: "xs",
                        color: "gray.600",
                        _dark: {
                          color: "gray.500"
                        },
                        pl: 1,
                        children: [t("hostsDialog.advancedOptions"), /* @__PURE__ */ jsx(AccordionIcon, {
                          fontSize: "sm",
                          ml: 1
                        })]
                      }), /* @__PURE__ */ jsxs(Container, {
                        flex: "1",
                        px: "0",
                        display: "contents",
                        children: [/* @__PURE__ */ jsx(Controller, {
                          control: form.control,
                          name: `${hostKey}.${index}.is_disabled`,
                          render: ({
                            field
                          }) => {
                            return /* @__PURE__ */ jsx(Switch, {
                              mx: "1.5",
                              colorScheme: "primary",
                              ...field,
                              value: void 0,
                              isChecked: !field.value,
                              onChange: (e) => {
                                console.log(e.target.checked);
                                field.onChange(!e.target.checked);
                              }
                            });
                          }
                        }), /* @__PURE__ */ jsx(Tooltip, {
                          label: t("delete"),
                          placement: "top",
                          children: /* @__PURE__ */ jsx(IconButton, {
                            "aria-label": "Delete",
                            size: "sm",
                            colorScheme: "red",
                            variant: "ghost",
                            onClick: removeHost.bind(null, index),
                            children: /* @__PURE__ */ jsx(DeleteIcon, {})
                          })
                        })]
                      })]
                    }), /* @__PURE__ */ jsx(Tooltip, {
                      label: t("hostsDialog.duplicate"),
                      placement: "top",
                      children: /* @__PURE__ */ jsx(IconButton, {
                        "aria-label": t("hostsDialog.duplicate"),
                        size: "sm",
                        colorScheme: "white",
                        variant: "ghost",
                        onClick: () => duplicateHost(index),
                        children: /* @__PURE__ */ jsx(DuplicateIcon, {})
                      })
                    }), index < hosts.length - 1 && /* @__PURE__ */ jsx(Tooltip, {
                      label: "Move Down",
                      placement: "top",
                      children: /* @__PURE__ */ jsx(IconButton, {
                        "aria-label": "DownIcon",
                        size: "sm",
                        colorScheme: "white",
                        variant: "ghost",
                        onClick: () => moveHostPosition(index, "down"),
                        children: /* @__PURE__ */ jsx(DownIcon, {})
                      })
                    }), index > 0 && /* @__PURE__ */ jsx(Tooltip, {
                      label: "Move Up",
                      placement: "top",
                      children: /* @__PURE__ */ jsx(IconButton, {
                        "aria-label": "UpIcon",
                        size: "sm",
                        colorScheme: "white",
                        variant: "ghost",
                        onClick: () => moveHostPosition(index, "up"),
                        children: /* @__PURE__ */ jsx(UpIcon, {})
                      })
                    })]
                  }), /* @__PURE__ */ jsx(AccordionPanel, {
                    w: "full",
                    p: 1,
                    children: /* @__PURE__ */ jsxs(VStack, {
                      w: "full",
                      borderRadius: "4px",
                      children: [/* @__PURE__ */ jsxs(FormControl, {
                        isInvalid: !!(accordionErrors && ((_i = accordionErrors[index]) == null ? void 0 : _i.port)),
                        children: [/* @__PURE__ */ jsxs(FormLabel, {
                          display: "flex",
                          pb: 1,
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 1,
                          m: "0",
                          children: [/* @__PURE__ */ jsx("span", {
                            children: t("hostsDialog.port")
                          }), /* @__PURE__ */ jsxs(Popover, {
                            isLazy: true,
                            placement: "right",
                            children: [/* @__PURE__ */ jsx(PopoverTrigger, {
                              children: /* @__PURE__ */ jsx(InfoIcon, {})
                            }), /* @__PURE__ */ jsx(Portal, {
                              children: /* @__PURE__ */ jsxs(PopoverContent, {
                                p: 2,
                                children: [/* @__PURE__ */ jsx(PopoverArrow, {}), /* @__PURE__ */ jsx(PopoverCloseButton, {}), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  children: t("hostsDialog.port.info")
                                })]
                              })
                            })]
                          })]
                        }), /* @__PURE__ */ jsx(Input, {
                          size: "sm",
                          borderRadius: "4px",
                          placeholder: String(inbound.port || "8080"),
                          type: "number",
                          ...form.register(hostKey + "." + index + ".port")
                        })]
                      }), /* @__PURE__ */ jsxs(FormControl, {
                        isInvalid: !!(accordionErrors && ((_j = accordionErrors[index]) == null ? void 0 : _j.sni)),
                        children: [/* @__PURE__ */ jsxs(FormLabel, {
                          display: "flex",
                          pb: 1,
                          alignItems: "center",
                          gap: 1,
                          justifyContent: "space-between",
                          m: "0",
                          children: [/* @__PURE__ */ jsx("span", {
                            children: t("hostsDialog.sni")
                          }), /* @__PURE__ */ jsxs(Popover, {
                            isLazy: true,
                            placement: "right",
                            children: [/* @__PURE__ */ jsx(PopoverTrigger, {
                              children: /* @__PURE__ */ jsx(InfoIcon, {})
                            }), /* @__PURE__ */ jsx(Portal, {
                              children: /* @__PURE__ */ jsxs(PopoverContent, {
                                p: 2,
                                children: [/* @__PURE__ */ jsx(PopoverArrow, {}), /* @__PURE__ */ jsx(PopoverCloseButton, {}), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  children: t("hostsDialog.sni.info")
                                }), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  mt: "2",
                                  children: /* @__PURE__ */ jsx(Trans, {
                                    i18nKey: "hostsDialog.host.wildcard",
                                    components: {
                                      badge: /* @__PURE__ */ jsx(Badge, {})
                                    }
                                  })
                                }), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  children: /* @__PURE__ */ jsx(Trans, {
                                    i18nKey: "hostsDialog.host.multiHost",
                                    components: {
                                      badge: /* @__PURE__ */ jsx(Badge, {})
                                    }
                                  })
                                })]
                              })
                            })]
                          })]
                        }), /* @__PURE__ */ jsx(Input, {
                          size: "sm",
                          borderRadius: "4px",
                          placeholder: "SNI (e.g. example.com)",
                          ...form.register(hostKey + "." + index + ".sni")
                        }), accordionErrors && ((_k = accordionErrors[index]) == null ? void 0 : _k.sni) && /* @__PURE__ */ jsx(Error, {
                          children: (_m = (_l = accordionErrors[index]) == null ? void 0 : _l.sni) == null ? void 0 : _m.message
                        })]
                      }), /* @__PURE__ */ jsxs(FormControl, {
                        isInvalid: !!(accordionErrors && ((_n = accordionErrors[index]) == null ? void 0 : _n.host)),
                        children: [/* @__PURE__ */ jsxs(FormLabel, {
                          display: "flex",
                          pb: 1,
                          alignItems: "center",
                          gap: 1,
                          justifyContent: "space-between",
                          m: "0",
                          children: [/* @__PURE__ */ jsx("span", {
                            children: t("hostsDialog.host")
                          }), /* @__PURE__ */ jsxs(Popover, {
                            isLazy: true,
                            placement: "right",
                            children: [/* @__PURE__ */ jsx(PopoverTrigger, {
                              children: /* @__PURE__ */ jsx(InfoIcon, {})
                            }), /* @__PURE__ */ jsx(Portal, {
                              children: /* @__PURE__ */ jsxs(PopoverContent, {
                                p: 2,
                                children: [/* @__PURE__ */ jsx(PopoverArrow, {}), /* @__PURE__ */ jsx(PopoverCloseButton, {}), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  children: t("hostsDialog.host.info")
                                }), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  mt: "2",
                                  children: /* @__PURE__ */ jsx(Trans, {
                                    i18nKey: "hostsDialog.host.wildcard",
                                    components: {
                                      badge: /* @__PURE__ */ jsx(Badge, {})
                                    }
                                  })
                                }), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  children: /* @__PURE__ */ jsx(Trans, {
                                    i18nKey: "hostsDialog.host.multiHost",
                                    components: {
                                      badge: /* @__PURE__ */ jsx(Badge, {})
                                    }
                                  })
                                })]
                              })
                            })]
                          })]
                        }), /* @__PURE__ */ jsx(Input, {
                          size: "sm",
                          borderRadius: "4px",
                          placeholder: "Host (e.g. example.com)",
                          ...form.register(hostKey + "." + index + ".host")
                        }), accordionErrors && ((_o = accordionErrors[index]) == null ? void 0 : _o.host) && /* @__PURE__ */ jsx(Error, {
                          children: (_q = (_p = accordionErrors[index]) == null ? void 0 : _p.host) == null ? void 0 : _q.message
                        })]
                      }), /* @__PURE__ */ jsxs(FormControl, {
                        isInvalid: !!(accordionErrors && ((_r = accordionErrors[index]) == null ? void 0 : _r.path)),
                        children: [/* @__PURE__ */ jsxs(FormLabel, {
                          display: "flex",
                          pb: 1,
                          alignItems: "center",
                          gap: 1,
                          justifyContent: "space-between",
                          m: "0",
                          children: [/* @__PURE__ */ jsx("span", {
                            children: t("hostsDialog.path")
                          }), /* @__PURE__ */ jsxs(Popover, {
                            isLazy: true,
                            placement: "right",
                            children: [/* @__PURE__ */ jsx(PopoverTrigger, {
                              children: /* @__PURE__ */ jsx(InfoIcon, {})
                            }), /* @__PURE__ */ jsx(Portal, {
                              children: /* @__PURE__ */ jsxs(PopoverContent, {
                                p: 2,
                                children: [/* @__PURE__ */ jsx(PopoverArrow, {}), /* @__PURE__ */ jsx(PopoverCloseButton, {}), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  children: t("hostsDialog.path.info")
                                })]
                              })
                            })]
                          })]
                        }), /* @__PURE__ */ jsx(Input, {
                          size: "sm",
                          borderRadius: "4px",
                          placeholder: "path (e.g. /vless)",
                          ...form.register(hostKey + "." + index + ".path")
                        }), accordionErrors && ((_s = accordionErrors[index]) == null ? void 0 : _s.path) && /* @__PURE__ */ jsx(Error, {
                          children: (_u = (_t = accordionErrors[index]) == null ? void 0 : _t.path) == null ? void 0 : _u.message
                        })]
                      }), /* @__PURE__ */ jsxs(FormControl, {
                        height: "66px",
                        children: [/* @__PURE__ */ jsxs(FormLabel, {
                          display: "flex",
                          pb: 1,
                          alignItems: "center",
                          gap: 1,
                          justifyContent: "space-between",
                          m: "0",
                          children: [/* @__PURE__ */ jsx("span", {
                            children: t("hostsDialog.security")
                          }), /* @__PURE__ */ jsxs(Popover, {
                            isLazy: true,
                            placement: "right",
                            children: [/* @__PURE__ */ jsx(PopoverTrigger, {
                              children: /* @__PURE__ */ jsx(InfoIcon, {})
                            }), /* @__PURE__ */ jsx(Portal, {
                              children: /* @__PURE__ */ jsxs(PopoverContent, {
                                p: 2,
                                children: [/* @__PURE__ */ jsx(PopoverArrow, {}), /* @__PURE__ */ jsx(PopoverCloseButton, {}), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  children: t("hostsDialog.security.info")
                                })]
                              })
                            })]
                          })]
                        }), /* @__PURE__ */ jsx(Select, {
                          size: "sm",
                          ...form.register(hostKey + "." + index + ".security"),
                          children: proxyHostSecurity.map((s2) => {
                            return /* @__PURE__ */ jsx("option", {
                              value: s2.value,
                              children: s2.title
                            }, s2.value);
                          })
                        })]
                      }), /* @__PURE__ */ jsxs(FormControl, {
                        height: "66px",
                        children: [/* @__PURE__ */ jsx(FormLabel, {
                          display: "flex",
                          pb: 1,
                          alignItems: "center",
                          gap: 1,
                          justifyContent: "space-between",
                          m: "0",
                          children: /* @__PURE__ */ jsx("span", {
                            children: t("hostsDialog.alpn")
                          })
                        }), /* @__PURE__ */ jsx(Select, {
                          size: "sm",
                          ...form.register(hostKey + "." + index + ".alpn"),
                          children: proxyALPN.map((s2) => {
                            return /* @__PURE__ */ jsx("option", {
                              value: s2.value,
                              children: s2.title
                            }, s2.value);
                          })
                        })]
                      }), /* @__PURE__ */ jsxs(FormControl, {
                        height: "66px",
                        children: [/* @__PURE__ */ jsx(FormLabel, {
                          display: "flex",
                          pb: 1,
                          alignItems: "center",
                          gap: 1,
                          justifyContent: "space-between",
                          m: "0",
                          children: /* @__PURE__ */ jsx("span", {
                            children: t("hostsDialog.fingerprint")
                          })
                        }), /* @__PURE__ */ jsx(Select, {
                          size: "sm",
                          ...form.register(hostKey + "." + index + ".fingerprint"),
                          children: proxyFingerprint.map((s2) => {
                            return /* @__PURE__ */ jsx("option", {
                              value: s2.value,
                              children: s2.title
                            }, s2.value);
                          })
                        })]
                      }), /* @__PURE__ */ jsxs(FormControl, {
                        isInvalid: !!(accordionErrors && ((_v = accordionErrors[index]) == null ? void 0 : _v.fragment_setting)),
                        children: [/* @__PURE__ */ jsxs(FormLabel, {
                          display: "flex",
                          pb: 1,
                          alignItems: "center",
                          gap: 1,
                          justifyContent: "space-between",
                          m: "0",
                          children: [/* @__PURE__ */ jsx("span", {
                            children: t("hostsDialog.fragment")
                          }), /* @__PURE__ */ jsxs(Popover, {
                            isLazy: true,
                            placement: "right",
                            children: [/* @__PURE__ */ jsx(PopoverTrigger, {
                              children: /* @__PURE__ */ jsx(InfoIcon, {})
                            }), /* @__PURE__ */ jsx(Portal, {
                              children: /* @__PURE__ */ jsxs(PopoverContent, {
                                p: 2,
                                children: [/* @__PURE__ */ jsx(PopoverArrow, {}), /* @__PURE__ */ jsx(PopoverCloseButton, {}), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  children: t("hostsDialog.fragment.info")
                                }), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  pt: 2,
                                  pb: 1,
                                  children: t("hostsDialog.fragment.info.examples")
                                }), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  children: "100-200,10-20,tlshello"
                                }), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  children: "100-200,10-20,1-3"
                                }), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  pt: "3",
                                  children: t("hostsDialog.fragment.info.attention")
                                })]
                              })
                            })]
                          })]
                        }), /* @__PURE__ */ jsx(Input, {
                          size: "sm",
                          borderRadius: "4px",
                          placeholder: t("hostsDialog.fragment.placeholder"),
                          ...form.register(hostKey + "." + index + ".fragment_setting")
                        }), accordionErrors && ((_w = accordionErrors[index]) == null ? void 0 : _w.fragment_setting) && /* @__PURE__ */ jsx(Error, {
                          children: (_y = (_x = accordionErrors[index]) == null ? void 0 : _x.fragment_setting) == null ? void 0 : _y.message
                        })]
                      }), /* @__PURE__ */ jsxs(FormControl, {
                        isInvalid: !!(accordionErrors && ((_z = accordionErrors[index]) == null ? void 0 : _z.noise_setting)),
                        children: [/* @__PURE__ */ jsxs(FormLabel, {
                          display: "flex",
                          pb: 1,
                          alignItems: "center",
                          gap: 1,
                          justifyContent: "space-between",
                          m: "0",
                          children: [/* @__PURE__ */ jsx("span", {
                            children: t("hostsDialog.noise")
                          }), /* @__PURE__ */ jsxs(Popover, {
                            isLazy: true,
                            placement: "right",
                            children: [/* @__PURE__ */ jsx(PopoverTrigger, {
                              children: /* @__PURE__ */ jsx(InfoIcon, {})
                            }), /* @__PURE__ */ jsx(Portal, {
                              children: /* @__PURE__ */ jsxs(PopoverContent, {
                                p: 2,
                                children: [/* @__PURE__ */ jsx(PopoverArrow, {}), /* @__PURE__ */ jsx(PopoverCloseButton, {}), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  children: t("hostsDialog.noise.info")
                                }), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  pt: 2,
                                  pb: 1,
                                  children: t("hostsDialog.noise.info.examples")
                                }), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  children: "rand:10-20,10-20"
                                }), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  children: "rand:10-20,10-20&base64:7nQBAAABAAAAAAAABnQtcmluZwZtc2VkZ2UDbmV0AAABAAE=,10-25"
                                }), /* @__PURE__ */ jsx(Text, {
                                  fontSize: "xs",
                                  pr: 5,
                                  pt: "3",
                                  children: t("hostsDialog.noise.info.attention")
                                })]
                              })
                            })]
                          })]
                        }), /* @__PURE__ */ jsx(Input, {
                          size: "sm",
                          borderRadius: "4px",
                          placeholder: t("hostsDialog.noise.placeholder"),
                          ...form.register(hostKey + "." + index + ".noise_setting")
                        }), accordionErrors && ((_A = accordionErrors[index]) == null ? void 0 : _A.noise_setting) && /* @__PURE__ */ jsx(Error, {
                          children: (_C = (_B = accordionErrors[index]) == null ? void 0 : _B.noise_setting) == null ? void 0 : _C.message
                        })]
                      }), /* @__PURE__ */ jsxs(FormControl, {
                        isInvalid: !!(accordionErrors && ((_D = accordionErrors[index]) == null ? void 0 : _D.use_sni_as_host)),
                        children: [/* @__PURE__ */ jsx(Checkbox, {
                          ...form.register(hostKey + "." + index + ".use_sni_as_host"),
                          children: /* @__PURE__ */ jsx(FormLabel, {
                            children: t("hostsDialog.useSniAsHost")
                          })
                        }), accordionErrors && ((_E = accordionErrors[index]) == null ? void 0 : _E.use_sni_as_host) && /* @__PURE__ */ jsx(Error, {
                          children: (_G = (_F = accordionErrors[index]) == null ? void 0 : _F.use_sni_as_host) == null ? void 0 : _G.message
                        })]
                      }), /* @__PURE__ */ jsx(FormControl, {
                        isInvalid: !!(accordionErrors && ((_H = accordionErrors[index]) == null ? void 0 : _H.allowinsecure)),
                        children: /* @__PURE__ */ jsxs(Checkbox, {
                          ...form.register(hostKey + "." + index + ".allowinsecure"),
                          name: hostKey + "." + index + ".allowinsecure",
                          children: [/* @__PURE__ */ jsx(FormLabel, {
                            children: t("hostsDialog.allowinsecure")
                          }), accordionErrors && ((_I = accordionErrors[index]) == null ? void 0 : _I.allowinsecure) && /* @__PURE__ */ jsx(Error, {
                            children: (_K = (_J = accordionErrors[index]) == null ? void 0 : _J.allowinsecure) == null ? void 0 : _K.message
                          })]
                        })
                      }), /* @__PURE__ */ jsxs(FormControl, {
                        isInvalid: !!(accordionErrors && ((_L = accordionErrors[index]) == null ? void 0 : _L.mux_enable)),
                        children: [/* @__PURE__ */ jsx(Checkbox, {
                          ...form.register(hostKey + "." + index + ".mux_enable"),
                          children: /* @__PURE__ */ jsx(FormLabel, {
                            children: t("hostsDialog.muxEnable")
                          })
                        }), accordionErrors && ((_M = accordionErrors[index]) == null ? void 0 : _M.mux_enable) && /* @__PURE__ */ jsx(Error, {
                          children: (_O = (_N = accordionErrors[index]) == null ? void 0 : _N.mux_enable) == null ? void 0 : _O.message
                        })]
                      }), /* @__PURE__ */ jsxs(FormControl, {
                        isInvalid: !!(accordionErrors && ((_P = accordionErrors[index]) == null ? void 0 : _P.random_user_agent)),
                        children: [/* @__PURE__ */ jsx(Checkbox, {
                          ...form.register(hostKey + "." + index + ".random_user_agent"),
                          children: /* @__PURE__ */ jsx(FormLabel, {
                            children: t("hostsDialog.randomUserAgent")
                          })
                        }), accordionErrors && ((_Q = accordionErrors[index]) == null ? void 0 : _Q.random_user_agent) && /* @__PURE__ */ jsx(Error, {
                          children: (_S = (_R = accordionErrors[index]) == null ? void 0 : _R.random_user_agent) == null ? void 0 : _S.message
                        })]
                      })]
                    }, index)
                  })]
                })
              })]
            }, host.id)
          }, host.id);
        }), /* @__PURE__ */ jsx(Button, {
          variant: "outline",
          w: "full",
          size: "sm",
          color: "",
          fontWeight: "normal",
          onClick: handleAddHost,
          children: t("hostsDialog.addHost")
        })]
      })
    })]
  });
};
const HostsDialog = () => {
  const {
    isEditingHosts,
    onEditingHosts,
    refetchUsers,
    inbounds
  } = useDashboardPick("isEditingHosts", "onEditingHosts", "refetchUsers", "inbounds");
  const {
    isLoading,
    hosts,
    fetchHosts,
    isPostLoading,
    setHosts
  } = useHosts();
  const toast = useToast();
  const {
    t
  } = useTranslation();
  const [openAccordions, setOpenAccordions] = react.exports.useState({});
  const [addingHost, setAddingHost] = react.exports.useState(false);
  react.exports.useEffect(() => {
    if (isEditingHosts)
      fetchHosts();
  }, [isEditingHosts]);
  const form = useForm({
    resolver: s(hostsSchema)
  });
  react.exports.useEffect(() => {
    if (hosts && isEditingHosts) {
      form.reset(hosts);
    }
  }, [hosts]);
  const onClose = () => {
    setOpenAccordions({});
    onEditingHosts(false);
  };
  const handleFormSubmit = (hosts2) => {
    setHosts(hosts2).then(() => {
      toast({
        title: t("hostsDialog.savedSuccess"),
        status: "success",
        isClosable: true,
        position: "top",
        duration: 3e3
      });
      refetchUsers();
    }).catch((err) => {
      var _a, _b, _c, _d, _e;
      if (((_a = err == null ? void 0 : err.response) == null ? void 0 : _a.status) === 409 || ((_b = err == null ? void 0 : err.response) == null ? void 0 : _b.status) === 400) {
        toast({
          title: (_d = (_c = err.response) == null ? void 0 : _c._data) == null ? void 0 : _d.detail,
          status: "error",
          isClosable: true,
          position: "top",
          duration: 3e3
        });
      }
      if (((_e = err == null ? void 0 : err.response) == null ? void 0 : _e.status) === 422) {
        Object.keys(err.response._data.detail).forEach((key) => {
          toast({
            title: err.response._data.detail[key] + " (" + key + ")",
            status: "error",
            isClosable: true,
            position: "top",
            duration: 3e3
          });
        });
      }
    });
  };
  const toggleAccordion = (index) => {
    if (openAccordions[String(index)]) {
      delete openAccordions[String(index)];
    } else
      openAccordions[String(index)] = {};
    setOpenAccordions({
      ...openAccordions
    });
  };
  return /* @__PURE__ */ jsxs(Modal, {
    isOpen: isEditingHosts,
    onClose,
    children: [/* @__PURE__ */ jsx(ModalOverlay, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent, {
      mx: "3",
      w: "fit-content",
      maxW: "3xl",
      children: [/* @__PURE__ */ jsx(ModalHeader, {
        pt: 6,
        children: /* @__PURE__ */ jsx(Icon, {
          color: "primary",
          children: /* @__PURE__ */ jsx(ModalIcon, {})
        })
      }), /* @__PURE__ */ jsx(ModalCloseButton, {
        mt: 3
      }), /* @__PURE__ */ jsxs(ModalBody, {
        w: "440px",
        pb: 3,
        pt: 3,
        children: [/* @__PURE__ */ jsx(FormProvider, {
          ...form,
          children: /* @__PURE__ */ jsxs("form", {
            onSubmit: form.handleSubmit(handleFormSubmit),
            children: [/* @__PURE__ */ jsxs(HStack, {
              mb: 3,
              justifyContent: "space-between",
              alignItems: "center",
              children: [/* @__PURE__ */ jsx(Text, {
                opacity: 0.8,
                fontSize: "sm",
                children: t("hostsDialog.title")
              }), /* @__PURE__ */ jsx(Button, {
                size: "sm",
                colorScheme: "primary",
                flexShrink: 0,
                leftIcon: /* @__PURE__ */ jsx(PlusSmallIcon, {
                  width: 16
                }),
                onClick: () => setAddingHost(true),
                children: t("inboundBuilder.addHostButton")
              })]
            }), isLoading && t("hostsDialog.loading"), !isLoading && hosts && (Object.keys(hosts).length > 0 ? /* @__PURE__ */ jsx(Accordion, {
              w: "full",
              allowToggle: true,
              allowMultiple: true,
              index: Object.keys(openAccordions).map((i) => parseInt(i)),
              children: /* @__PURE__ */ jsx(VStack, {
                w: "full",
                children: Object.keys(hosts).map((hostKey, index) => {
                  return /* @__PURE__ */ jsx(AccordionInbound, {
                    toggleAccordion: () => toggleAccordion(index),
                    isOpen: openAccordions[String(index)],
                    hostKey
                  }, hostKey);
                })
              })
            }) : "No inbound found. Please check your Xray config file."), /* @__PURE__ */ jsx(HStack, {
              justifyContent: "flex-end",
              py: 2,
              children: /* @__PURE__ */ jsx(Button, {
                variant: "solid",
                mt: "2",
                type: "submit",
                colorScheme: "primary",
                size: "sm",
                px: 5,
                isLoading: isPostLoading,
                disabled: isPostLoading,
                children: t("hostsDialog.apply")
              })
            })]
          })
        }), /* @__PURE__ */ jsx(AddHostModal, {
          isOpen: addingHost,
          onClose: () => setAddingHost(false)
        })]
      })]
    })]
  });
};
export {
  DownIcon,
  DuplicateIcon,
  HostsDialog,
  UpIcon
};
