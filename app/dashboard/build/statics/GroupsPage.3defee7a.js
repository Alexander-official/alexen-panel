import { u as useTranslation, W as useToast, cn as useQueryClient, g as useQuery, c as react, h as jsxs, ah as VStack, N as Box, H as HStack, k as jsx, aG as RectangleGroupIcon, T as Text, K as SimpleGrid, a7 as Input, o as Button, cm as PlusIcon, cv as ServerIcon, bJ as Textarea, aj as Tooltip, a9 as IconButton, cf as PencilSquareIcon, V as TrashIcon, bT as UserIcon, bR as CheckIcon, az as Collapse, ax as Fragment, a0 as XMarkIcon } from "./vendor.0404bf65.js";
import { f as fetch } from "./index.e0e646b5.js";
const KEY = "host-groups";
const sm = {
  width: 16,
  height: 16
};
const errorText = (e) => {
  var _a;
  return ((_a = e == null ? void 0 : e.data) == null ? void 0 : _a.detail) || (e == null ? void 0 : e.message) || "";
};
const surface = {
  borderWidth: "1px",
  borderColor: "light-border",
  borderRadius: "16px",
  bg: "var(--app-surface)",
  boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.04)",
  _dark: {
    borderColor: "gray.700",
    bg: "gray.750",
    boxShadow: "none"
  }
};
const tint = "color-mix(in srgb, var(--chakra-colors-primary-500) 12%, transparent)";
const Pill = ({
  icon: Icon,
  children,
  strong
}) => /* @__PURE__ */ jsxs(HStack, {
  spacing: 1,
  px: 2.5,
  h: "24px",
  borderRadius: "full",
  fontSize: "xs",
  fontWeight: "medium",
  bg: strong ? tint : "blackAlpha.50",
  color: strong ? "primary.600" : "gray.600",
  _dark: {
    bg: strong ? tint : "whiteAlpha.100",
    color: strong ? "primary.200" : "gray.300"
  },
  flexShrink: 0,
  children: [Icon && /* @__PURE__ */ jsx(Icon, {
    width: 12,
    height: 12
  }), /* @__PURE__ */ jsx(Text, {
    as: "span",
    children
  })]
});
const GroupAvatar = ({
  name
}) => /* @__PURE__ */ jsx(Box, {
  w: "40px",
  h: "40px",
  borderRadius: "12px",
  bg: tint,
  color: "primary.600",
  _dark: {
    color: "primary.200"
  },
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: "bold",
  fontSize: "md",
  flexShrink: 0,
  textTransform: "uppercase",
  children: name.trim().charAt(0) || "#"
});
const HostOption = ({
  host,
  selected,
  others,
  onToggle
}) => {
  const {
    t
  } = useTranslation();
  return /* @__PURE__ */ jsxs(HStack, {
    as: "button",
    type: "button",
    w: "full",
    textAlign: "left",
    spacing: 3,
    px: 3,
    py: 2,
    borderRadius: "10px",
    borderWidth: "1px",
    borderColor: selected ? "primary.400" : "light-border",
    bg: selected ? tint : "transparent",
    _dark: {
      borderColor: selected ? "primary.300" : "gray.600"
    },
    _hover: {
      borderColor: "primary.300"
    },
    onClick: onToggle,
    children: [/* @__PURE__ */ jsx(Box, {
      w: "18px",
      h: "18px",
      borderRadius: "8px",
      borderWidth: "1.5px",
      borderColor: selected ? "primary.500" : "gray.400",
      bg: selected ? "primary.500" : "transparent",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      children: selected && /* @__PURE__ */ jsx(CheckIcon, {
        width: 12,
        height: 12,
        strokeWidth: 3
      })
    }), /* @__PURE__ */ jsxs(Box, {
      minW: 0,
      flex: 1,
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        isTruncated: true,
        children: host.remark
      }), /* @__PURE__ */ jsxs(Text, {
        fontSize: "xs",
        color: "gray.500",
        isTruncated: true,
        children: [host.address, host.is_disabled ? ` \xB7 ${t("groups.disabled")}` : ""]
      })]
    }), others.length > 0 && /* @__PURE__ */ jsxs(HStack, {
      spacing: 1,
      flexShrink: 0,
      display: {
        base: "none",
        sm: "flex"
      },
      children: [others.slice(0, 2).map((g) => /* @__PURE__ */ jsx(Pill, {
        children: g
      }, g)), others.length > 2 && /* @__PURE__ */ jsxs(Pill, {
        children: ["+", others.length - 2]
      })]
    })]
  });
};
const GroupCard = ({
  group,
  hosts,
  vpn
}) => {
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = react.exports.useState(false);
  const [name, setName] = react.exports.useState(group.name);
  const [note, setNote] = react.exports.useState(group.note);
  const [picking, setPicking] = react.exports.useState(false);
  const [selected, setSelected] = react.exports.useState(new Set(group.hosts));
  const [busy, setBusy] = react.exports.useState(false);
  react.exports.useEffect(() => setSelected(new Set(group.hosts)), [group.hosts.join(",")]);
  const byInbound = react.exports.useMemo(() => {
    const map = {};
    hosts.forEach((h) => {
      var _a;
      return (map[_a = h.inbound_tag] || (map[_a] = [])).push(h);
    });
    return map;
  }, [hosts]);
  const save = (body, done) => {
    setBusy(true);
    fetch(`/groups/${encodeURIComponent(group.name)}`, {
      method: "PUT",
      body
    }).then((data) => {
      qc.setQueryData(KEY, data);
      toast({
        status: "success",
        title: t("groups.saved"),
        duration: 1500
      });
      done == null ? void 0 : done();
    }).catch((e) => toast({
      status: "error",
      title: t("groups.error"),
      description: errorText(e),
      duration: 3e3
    })).finally(() => setBusy(false));
  };
  const remove = () => {
    if (!window.confirm(t("groups.confirmDelete", {
      name: group.name
    })))
      return;
    fetch(`/groups/${encodeURIComponent(group.name)}`, {
      method: "DELETE"
    }).then((data) => qc.setQueryData(KEY, data));
  };
  const toggle = (id) => setSelected((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const members = hosts.filter((h) => group.hosts.includes(h.id));
  return /* @__PURE__ */ jsxs(Box, {
    ...surface,
    p: {
      base: 4,
      md: 5
    },
    children: [editing ? /* @__PURE__ */ jsxs(VStack, {
      align: "stretch",
      spacing: 2,
      children: [/* @__PURE__ */ jsx(Input, {
        value: name,
        onChange: (e) => setName(e.target.value),
        placeholder: t("groups.name")
      }), /* @__PURE__ */ jsx(Textarea, {
        rows: 2,
        value: note,
        onChange: (e) => setNote(e.target.value),
        placeholder: t("groups.note")
      }), /* @__PURE__ */ jsxs(HStack, {
        justifyContent: "flex-end",
        children: [/* @__PURE__ */ jsx(Button, {
          size: "sm",
          variant: "ghost",
          onClick: () => setEditing(false),
          children: t("cancel")
        }), /* @__PURE__ */ jsx(Button, {
          size: "sm",
          colorScheme: "primary",
          isLoading: busy,
          onClick: () => save({
            name,
            note
          }, () => setEditing(false)),
          children: t("groups.save")
        })]
      })]
    }) : /* @__PURE__ */ jsxs(HStack, {
      alignItems: "flex-start",
      spacing: 3,
      children: [/* @__PURE__ */ jsx(GroupAvatar, {
        name: group.name
      }), /* @__PURE__ */ jsxs(Box, {
        minW: 0,
        flex: 1,
        children: [/* @__PURE__ */ jsx(Text, {
          fontWeight: "semibold",
          fontSize: "md",
          isTruncated: true,
          children: group.name
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          noOfLines: 2,
          children: group.note || t("groups.noNote")
        })]
      }), /* @__PURE__ */ jsxs(HStack, {
        spacing: 0,
        children: [/* @__PURE__ */ jsx(Tooltip, {
          label: t("groups.edit"),
          children: /* @__PURE__ */ jsx(IconButton, {
            size: "sm",
            variant: "ghost",
            borderRadius: "full",
            "aria-label": "edit",
            icon: /* @__PURE__ */ jsx(PencilSquareIcon, {
              ...sm
            }),
            onClick: () => setEditing(true)
          })
        }), /* @__PURE__ */ jsx(Tooltip, {
          label: t("groups.delete"),
          children: /* @__PURE__ */ jsx(IconButton, {
            size: "sm",
            variant: "ghost",
            borderRadius: "full",
            colorScheme: "red",
            "aria-label": "delete",
            icon: /* @__PURE__ */ jsx(TrashIcon, {
              ...sm
            }),
            onClick: remove
          })
        })]
      })]
    }), /* @__PURE__ */ jsxs(HStack, {
      mt: 4,
      spacing: 1.5,
      flexWrap: "wrap",
      rowGap: 1.5,
      children: [/* @__PURE__ */ jsx(Pill, {
        strong: true,
        icon: ServerIcon,
        children: t("groups.hostCount", {
          count: group.hosts.length
        })
      }), group.admins.map((a) => /* @__PURE__ */ jsx(Pill, {
        icon: UserIcon,
        children: a
      }, a))]
    }), !picking && /* @__PURE__ */ jsxs(VStack, {
      align: "stretch",
      spacing: 1,
      mt: 3,
      children: [members.length === 0 && /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        py: 1,
        children: t("groups.noMembers")
      }), members.slice(0, 5).map((h) => /* @__PURE__ */ jsxs(HStack, {
        px: 3,
        py: 1.5,
        borderRadius: "10px",
        bg: "blackAlpha.50",
        _dark: {
          bg: "whiteAlpha.50"
        },
        spacing: 2,
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          isTruncated: true,
          flex: 1,
          children: h.remark
        }), /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          flexShrink: 0,
          children: h.inbound_tag
        })]
      }, h.id)), members.length > 5 && /* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        color: "gray.500",
        px: 3,
        children: t("groups.more", {
          count: members.length - 5
        })
      })]
    }), vpn.length > 0 && /* @__PURE__ */ jsxs(Box, {
      mt: 4,
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "xs",
        fontWeight: "semibold",
        color: "gray.500",
        mb: 1.5,
        letterSpacing: "wide",
        children: t("groups.vpn")
      }), /* @__PURE__ */ jsx(HStack, {
        spacing: 1.5,
        flexWrap: "wrap",
        rowGap: 1.5,
        children: vpn.map((v) => {
          const on = (group.vpn || []).includes(v.id);
          return /* @__PURE__ */ jsx(Tooltip, {
            label: v.enabled ? t("groups.vpnHint") : t("groups.vpnOff"),
            hasArrow: true,
            openDelay: 300,
            children: /* @__PURE__ */ jsxs(Button, {
              size: "xs",
              h: "26px",
              borderRadius: "full",
              variant: on ? "solid" : "outline",
              colorScheme: "primary",
              opacity: v.enabled ? 1 : 0.55,
              isDisabled: busy,
              leftIcon: on ? /* @__PURE__ */ jsx(CheckIcon, {
                width: 12
              }) : void 0,
              onClick: () => save({
                vpn: on ? (group.vpn || []).filter((x) => x !== v.id) : [...group.vpn || [], v.id]
              }),
              children: [v.kind, " \xB7 ", v.server]
            })
          }, v.id);
        })
      })]
    }), /* @__PURE__ */ jsx(Collapse, {
      in: picking,
      animateOpacity: true,
      unmountOnExit: true,
      children: /* @__PURE__ */ jsxs(VStack, {
        align: "stretch",
        spacing: 4,
        mt: 4,
        children: [Object.keys(byInbound).length === 0 && /* @__PURE__ */ jsx(Text, {
          fontSize: "xs",
          color: "gray.500",
          children: t("groups.noHosts")
        }), Object.entries(byInbound).map(([tag, list]) => /* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            fontWeight: "semibold",
            color: "gray.500",
            mb: 1.5,
            letterSpacing: "wide",
            children: tag
          }), /* @__PURE__ */ jsx(VStack, {
            align: "stretch",
            spacing: 1.5,
            children: list.map((h) => /* @__PURE__ */ jsx(HostOption, {
              host: h,
              selected: selected.has(h.id),
              others: h.groups.filter((g) => g !== group.name),
              onToggle: () => toggle(h.id)
            }, h.id))
          })]
        }, tag))]
      })
    }), /* @__PURE__ */ jsx(HStack, {
      mt: 4,
      spacing: 2,
      children: picking ? /* @__PURE__ */ jsxs(Fragment, {
        children: [/* @__PURE__ */ jsx(Button, {
          flex: 1,
          variant: "ghost",
          leftIcon: /* @__PURE__ */ jsx(XMarkIcon, {
            ...sm
          }),
          onClick: () => setPicking(false),
          children: t("cancel")
        }), /* @__PURE__ */ jsx(Button, {
          flex: 1,
          colorScheme: "primary",
          leftIcon: /* @__PURE__ */ jsx(CheckIcon, {
            ...sm
          }),
          isLoading: busy,
          onClick: () => save({
            hosts: Array.from(selected)
          }, () => setPicking(false)),
          children: t("groups.save")
        })]
      }) : /* @__PURE__ */ jsx(Button, {
        flex: 1,
        variant: "outline",
        colorScheme: "primary",
        leftIcon: /* @__PURE__ */ jsx(PlusIcon, {
          ...sm
        }),
        onClick: () => {
          setSelected(new Set(group.hosts));
          setPicking(true);
        },
        children: t("groups.manageHosts")
      })
    })]
  });
};
const GroupsPage = () => {
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const {
    data
  } = useQuery({
    queryKey: KEY,
    queryFn: () => fetch("/groups")
  });
  const [name, setName] = react.exports.useState("");
  const [note, setNote] = react.exports.useState("");
  const [busy, setBusy] = react.exports.useState(false);
  const create = () => {
    if (!name.trim())
      return;
    setBusy(true);
    fetch("/groups", {
      method: "POST",
      body: {
        name: name.trim(),
        note
      }
    }).then((d) => {
      qc.setQueryData(KEY, d);
      setName("");
      setNote("");
    }).catch((e) => toast({
      status: "error",
      title: t("groups.error"),
      description: errorText(e),
      duration: 3e3
    })).finally(() => setBusy(false));
  };
  const ungrouped = ((data == null ? void 0 : data.hosts) || []).filter((h) => h.groups.length === 0).length;
  return /* @__PURE__ */ jsxs(VStack, {
    align: "stretch",
    spacing: {
      base: 3,
      md: 4
    },
    children: [/* @__PURE__ */ jsxs(Box, {
      ...surface,
      p: {
        base: 4,
        md: 5
      },
      children: [/* @__PURE__ */ jsxs(HStack, {
        spacing: 3,
        mb: 4,
        alignItems: "flex-start",
        children: [/* @__PURE__ */ jsx(Box, {
          w: "40px",
          h: "40px",
          borderRadius: "12px",
          bg: "primary.500",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          children: /* @__PURE__ */ jsx(RectangleGroupIcon, {
            width: 20,
            height: 20
          })
        }), /* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontWeight: "semibold",
            children: t("groups.create")
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "xs",
            color: "gray.500",
            children: t("groups.help")
          })]
        })]
      }), /* @__PURE__ */ jsxs(SimpleGrid, {
        columns: {
          base: 1,
          md: 3
        },
        spacing: 2,
        children: [/* @__PURE__ */ jsx(Input, {
          placeholder: t("groups.name"),
          value: name,
          onChange: (e) => setName(e.target.value),
          onKeyDown: (e) => e.key === "Enter" && create()
        }), /* @__PURE__ */ jsx(Input, {
          placeholder: t("groups.note"),
          value: note,
          onChange: (e) => setNote(e.target.value)
        }), /* @__PURE__ */ jsx(Button, {
          colorScheme: "primary",
          leftIcon: /* @__PURE__ */ jsx(PlusIcon, {
            ...sm
          }),
          isLoading: busy,
          onClick: create,
          isDisabled: !name.trim(),
          children: t("groups.create")
        })]
      }), data && /* @__PURE__ */ jsx(HStack, {
        mt: 3,
        spacing: 1.5,
        children: /* @__PURE__ */ jsx(Pill, {
          icon: ServerIcon,
          children: t("groups.ungrouped", {
            count: ungrouped
          })
        })
      })]
    }), data && data.groups.length === 0 && /* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      color: "gray.500",
      textAlign: "center",
      py: 8,
      children: t("groups.empty")
    }), /* @__PURE__ */ jsx(SimpleGrid, {
      columns: {
        base: 1,
        md: 2,
        xl: 3
      },
      spacing: {
        base: 3,
        md: 4
      },
      alignItems: "start",
      children: ((data == null ? void 0 : data.groups) || []).map((g) => /* @__PURE__ */ jsx(GroupCard, {
        group: g,
        hosts: data.hosts,
        vpn: data.vpn || []
      }, g.name))
    })]
  });
};
export {
  GroupsPage
};
