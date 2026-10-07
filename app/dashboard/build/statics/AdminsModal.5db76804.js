import { f as fetch, u as useDashboardPick, M as Modal, d as ModalOverlay, e as ModalContent, h as ModalHeader, i as ModalCloseButton, j as ModalBody, b as formatBytes } from "./index.e0e646b5.js";
import { u as useTranslation, al as useNavigate, c as react, h as jsxs, ah as VStack, H as HStack, k as jsx, aC as GlobeAltIcon, T as Text, b3 as FormControl, b4 as FormLabel, a7 as Input, N as Box, cl as Code, bJ as Textarea, ak as Switch, o as Button, D as Badge, bQ as ChevronDownIcon, az as Collapse, E as chakra, bB as PencilIcon, V as TrashIcon, cm as PlusIcon, g as useQuery, W as useToast, bm as Checkbox, ax as Fragment, aj as Tooltip, a9 as IconButton } from "./vendor.0404bf65.js";
import { s as serverMessage } from "./serverMessage.7228cafd.js";
const empty = {
  url_prefix: "",
  suffix: null,
  templates: {
    default_template: "",
    expired_template: "",
    disabled_template: "",
    limited_template: "",
    near_expire_template: ""
  },
  external_enabled: true,
  external_label: "",
  external_self_edit: false,
  external_include_general: true,
  external_count: 0,
  example: ""
};
const STATES = [["default_template", "sub.default"], ["expired_template", "sub.expired"], ["disabled_template", "sub.disabled"], ["limited_template", "sub.limited"], ["near_expire_template", "sub.nearExpire"]];
const Section = ({
  title,
  open,
  onToggle,
  badge,
  children
}) => /* @__PURE__ */ jsxs(Box, {
  borderRadius: "12px",
  borderWidth: "1px",
  borderColor: "var(--tier-line)",
  bg: "var(--tier-2)",
  children: [/* @__PURE__ */ jsxs(HStack, {
    px: 3,
    py: 2.5,
    cursor: "pointer",
    onClick: onToggle,
    spacing: 2,
    children: [/* @__PURE__ */ jsx(Text, {
      fontSize: "sm",
      fontWeight: "medium",
      flex: "1",
      children: title
    }), badge && /* @__PURE__ */ jsx(Badge, {
      variant: "subtle",
      colorScheme: "primary",
      fontSize: "2xs",
      children: badge
    }), /* @__PURE__ */ jsx(ChevronDownIcon, {
      width: 16,
      style: {
        transform: open ? "rotate(180deg)" : void 0,
        transition: "transform .2s"
      }
    })]
  }), /* @__PURE__ */ jsx(Collapse, {
    in: open,
    animateOpacity: true,
    children: /* @__PURE__ */ jsx(VStack, {
      align: "stretch",
      spacing: 3,
      px: 3,
      pb: 3,
      children
    })
  })]
});
const AdminSubProfile = ({
  name,
  saveRef,
  focus
}) => {
  var _a;
  const {
    t
  } = useTranslation();
  const navigate = useNavigate();
  const [p, setP] = react.exports.useState(empty);
  const [general, setGeneral] = react.exports.useState(null);
  const [open, setOpen] = react.exports.useState(focus ? "domain" : "");
  const box = react.exports.useRef(null);
  react.exports.useEffect(() => {
    if (focus)
      setTimeout(() => {
        var _a2;
        return (_a2 = box.current) == null ? void 0 : _a2.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }, 150);
  }, [focus]);
  const set = (patch) => setP((x) => ({
    ...x,
    ...patch
  }));
  react.exports.useEffect(() => {
    if (name)
      fetch(`/admin/${encodeURIComponent(name)}/sub-profile`).then((d) => setP({
        ...empty,
        ...d
      })).catch(() => {
      });
    fetch("/sub-settings").then((d) => setGeneral(d)).catch(() => {
    });
  }, [name]);
  react.exports.useEffect(() => {
    saveRef.current = (who) => fetch(`/admin/${encodeURIComponent(who)}/sub-profile`, {
      method: "PUT",
      body: {
        ...p,
        suffix: p.suffix === "" ? null : p.suffix
      }
    });
  }, [p]);
  const ownTexts = STATES.filter(([k]) => {
    var _a2;
    return (_a2 = p.templates[k]) == null ? void 0 : _a2.trim();
  }).length;
  return /* @__PURE__ */ jsxs(VStack, {
    ref: box,
    align: "stretch",
    spacing: 2,
    p: 4,
    borderRadius: "16px",
    borderWidth: "1.5px",
    borderColor: "primary.400",
    bg: "var(--tier-1)",
    children: [/* @__PURE__ */ jsxs(HStack, {
      spacing: 2,
      children: [/* @__PURE__ */ jsx(GlobeAltIcon, {
        width: 16
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "sm",
        fontWeight: "semibold",
        children: t("adminSub.title")
      })]
    }), /* @__PURE__ */ jsx(Text, {
      fontSize: "xs",
      color: "gray.500",
      mt: -1,
      children: t("adminSub.help")
    }), /* @__PURE__ */ jsxs(Section, {
      title: t("adminSub.domain"),
      open: open === "domain",
      onToggle: () => setOpen(open === "domain" ? "" : "domain"),
      badge: p.url_prefix ? t("adminSub.own") : void 0,
      children: [/* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          fontSize: "xs",
          children: t("domain.address")
        }), /* @__PURE__ */ jsx(Input, {
          size: "sm",
          fontFamily: "mono",
          value: p.url_prefix,
          placeholder: t("adminSub.domainPlaceholder"),
          onChange: (e) => set({
            url_prefix: e.target.value.trim()
          })
        })]
      }), /* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          fontSize: "xs",
          children: t("domain.suffix")
        }), /* @__PURE__ */ jsx(Input, {
          size: "sm",
          fontFamily: "mono",
          value: (_a = p.suffix) != null ? _a : "",
          placeholder: t("adminSub.suffixPlaceholder"),
          onChange: (e) => set({
            suffix: e.target.value
          })
        })]
      }), p.example && /* @__PURE__ */ jsxs(Box, {
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "2xs",
          color: "gray.500",
          children: t("adminSub.savedExample")
        }), /* @__PURE__ */ jsx(Code, {
          fontSize: "2xs",
          display: "block",
          whiteSpace: "normal",
          wordBreak: "break-all",
          p: 2,
          borderRadius: "8px",
          children: p.example
        })]
      }), /* @__PURE__ */ jsx(Text, {
        fontSize: "2xs",
        color: "gray.500",
        children: t("adminSub.domainHelp")
      })]
    }), /* @__PURE__ */ jsxs(Section, {
      title: t("adminSub.texts"),
      open: open === "texts",
      onToggle: () => setOpen(open === "texts" ? "" : "texts"),
      badge: ownTexts ? t("adminSub.ownN", {
        n: ownTexts
      }) : void 0,
      children: [/* @__PURE__ */ jsx(Text, {
        fontSize: "2xs",
        color: "gray.500",
        children: t("sub.scopeAdminHelp", {
          name
        })
      }), STATES.map(([k, label]) => /* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          fontSize: "xs",
          children: t(label)
        }), /* @__PURE__ */ jsx(Textarea, {
          size: "sm",
          rows: 3,
          fontFamily: "mono",
          fontSize: "xs",
          value: p.templates[k] || "",
          placeholder: (general == null ? void 0 : general[k]) || t("sub.inheritsGeneral"),
          onChange: (e) => set({
            templates: {
              ...p.templates,
              [k]: e.target.value
            }
          })
        })]
      }, k))]
    }), /* @__PURE__ */ jsxs(Section, {
      title: t("adminSub.external"),
      open: open === "external",
      onToggle: () => setOpen(open === "external" ? "" : "external"),
      badge: p.external_count ? t("external.linkCount", {
        count: p.external_count
      }) : void 0,
      children: [/* @__PURE__ */ jsxs(HStack, {
        justifyContent: "space-between",
        alignItems: "flex-start",
        children: [/* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "sm",
            children: t("adminSub.includeGeneral")
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "2xs",
            color: "gray.500",
            children: t("adminSub.includeGeneralHelp")
          })]
        }), /* @__PURE__ */ jsx(Switch, {
          size: "sm",
          colorScheme: "primary",
          isChecked: p.external_include_general,
          onChange: (e) => set({
            external_include_general: e.target.checked
          })
        })]
      }), /* @__PURE__ */ jsxs(HStack, {
        justifyContent: "space-between",
        children: [/* @__PURE__ */ jsx(Text, {
          fontSize: "sm",
          children: t("external.adminEnabled")
        }), /* @__PURE__ */ jsx(Switch, {
          size: "sm",
          colorScheme: "primary",
          isChecked: p.external_enabled,
          onChange: (e) => set({
            external_enabled: e.target.checked
          })
        })]
      }), /* @__PURE__ */ jsxs(HStack, {
        justifyContent: "space-between",
        alignItems: "flex-start",
        children: [/* @__PURE__ */ jsxs(Box, {
          children: [/* @__PURE__ */ jsx(Text, {
            fontSize: "sm",
            children: t("external.selfEdit")
          }), /* @__PURE__ */ jsx(Text, {
            fontSize: "2xs",
            color: "gray.500",
            children: t("external.selfEditHelp")
          })]
        }), /* @__PURE__ */ jsx(Switch, {
          size: "sm",
          colorScheme: "primary",
          isChecked: p.external_self_edit,
          onChange: (e) => set({
            external_self_edit: e.target.checked
          })
        })]
      }), /* @__PURE__ */ jsxs(FormControl, {
        children: [/* @__PURE__ */ jsx(FormLabel, {
          fontSize: "xs",
          children: t("external.label")
        }), /* @__PURE__ */ jsxs(HStack, {
          children: [/* @__PURE__ */ jsx(Input, {
            size: "sm",
            value: p.external_label,
            placeholder: t("external.labelPlaceholder"),
            onChange: (e) => set({
              external_label: e.target.value
            })
          }), /* @__PURE__ */ jsx(Button, {
            size: "sm",
            variant: "outline",
            flexShrink: 0,
            onClick: () => set({
              external_label: name
            }),
            children: t("external.useAdminName")
          })]
        })]
      }), name && /* @__PURE__ */ jsx(Button, {
        size: "sm",
        variant: "outline",
        colorScheme: "primary",
        onClick: () => navigate(`/external?admin=${encodeURIComponent(name)}`),
        children: t("adminSub.editExternal", {
          n: p.external_count
        })
      })]
    })]
  });
};
const EditIcon = chakra(PencilIcon, {
  baseStyle: {
    w: 4,
    h: 4
  }
});
const DeleteIcon = chakra(TrashIcon, {
  baseStyle: {
    w: 4,
    h: 4
  }
});
const AddIcon = chakra(PlusIcon, {
  baseStyle: {
    w: 4,
    h: 4
  }
});
const emptyForm = {
  username: "",
  password: "",
  is_sudo: false,
  users_limit: "",
  traffic_limit: "",
  expire_date: "",
  max_user_ip_limit: "",
  max_user_hwid_limit: "",
  host_groups: ""
};
const AdminsModal = () => {
  const {
    data: groupNames
  } = useQuery({
    queryKey: "host-group-names",
    queryFn: () => fetch("/groups").then((d) => d.groups.map((g) => g.name))
  });
  const {
    isManagingAdmins,
    onManagingAdmins
  } = useDashboardPick("isManagingAdmins", "onManagingAdmins");
  const {
    t
  } = useTranslation();
  const toast = useToast();
  const [admins, setAdmins] = react.exports.useState([]);
  const [form, setForm] = react.exports.useState(emptyForm);
  const [editing, setEditing] = react.exports.useState(null);
  const [showForm, setShowForm] = react.exports.useState(false);
  const profileSave = react.exports.useRef(null);
  const [subFirst, setSubFirst] = react.exports.useState(false);
  const {
    data: profiles,
    refetch: refetchProfiles
  } = useQuery({
    queryKey: "admin-sub-profiles",
    queryFn: () => fetch("/admins/sub-profiles"),
    enabled: isManagingAdmins
  });
  const refresh = () => fetch("/admins").then((data) => setAdmins(data));
  react.exports.useEffect(() => {
    if (isManagingAdmins) {
      refresh();
      setShowForm(false);
      setForm(emptyForm);
      setEditing(null);
    }
  }, [isManagingAdmins]);
  const startCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(true);
  };
  const startEdit = (admin, sub = false) => {
    setSubFirst(sub);
    setForm({
      username: admin.username,
      password: "",
      is_sudo: admin.is_sudo,
      users_limit: admin.users_limit ? String(admin.users_limit) : "",
      traffic_limit: admin.traffic_limit ? String(admin.traffic_limit / 1073741824) : "",
      expire_date: admin.expire_date ? admin.expire_date.slice(0, 10) : "",
      max_user_ip_limit: admin.max_user_ip_limit ? String(admin.max_user_ip_limit) : "",
      max_user_hwid_limit: admin.max_user_hwid_limit ? String(admin.max_user_hwid_limit) : "",
      host_groups: (admin.host_groups || []).join(", ")
    });
    setEditing(admin.username);
    setShowForm(true);
  };
  const submit = () => {
    const body = {
      is_sudo: form.is_sudo,
      users_limit: form.users_limit ? parseInt(form.users_limit) : 0,
      traffic_limit: form.traffic_limit ? Math.round(parseFloat(form.traffic_limit) * 1073741824) : 0,
      expire_date: form.expire_date ? new Date(form.expire_date + "T00:00:00").toISOString() : null,
      max_user_ip_limit: form.max_user_ip_limit ? parseInt(form.max_user_ip_limit) : 0,
      max_user_hwid_limit: form.max_user_hwid_limit ? parseInt(form.max_user_hwid_limit) : 0,
      host_groups: form.host_groups.split(",").map((g) => g.trim()).filter(Boolean)
    };
    const req = editing ? fetch(`/admin/${editing}`, {
      method: "PUT",
      body
    }) : fetch("/admin", {
      method: "POST",
      body: {
        ...body,
        username: form.username,
        password: form.password
      }
    });
    req.then(() => !form.is_sudo && profileSave.current ? profileSave.current(editing || form.username) : null).then(() => {
      toast({
        status: "success",
        title: t("admins.saved"),
        duration: 2e3
      });
      setShowForm(false);
      refresh();
      refetchProfiles();
    }).catch((e) => {
      var _a, _b;
      return toast({
        status: "error",
        title: serverMessage(t, (_b = (_a = e == null ? void 0 : e.response) == null ? void 0 : _a._data) == null ? void 0 : _b.detail) || t("admins.error"),
        duration: 4e3
      });
    });
  };
  const remove = (username) => {
    fetch(`/admin/${username}`, {
      method: "DELETE"
    }).then(() => refresh()).catch((e) => {
      var _a, _b;
      return toast({
        status: "error",
        title: serverMessage(t, (_b = (_a = e == null ? void 0 : e.response) == null ? void 0 : _a._data) == null ? void 0 : _b.detail) || t("admins.error"),
        duration: 4e3
      });
    });
  };
  return /* @__PURE__ */ jsxs(Modal, {
    isOpen: isManagingAdmins,
    onClose: () => onManagingAdmins(false),
    size: "2xl",
    children: [/* @__PURE__ */ jsx(ModalOverlay, {
      bg: "blackAlpha.300",
      backdropFilter: "blur(10px)"
    }), /* @__PURE__ */ jsxs(ModalContent, {
      mx: "3",
      children: [/* @__PURE__ */ jsx(ModalHeader, {
        pt: 6,
        children: /* @__PURE__ */ jsxs(HStack, {
          justifyContent: "space-between",
          pr: 8,
          children: [/* @__PURE__ */ jsx(Text, {
            fontWeight: "semibold",
            fontSize: "lg",
            children: t("admins.title")
          }), !showForm && /* @__PURE__ */ jsx(Button, {
            size: "sm",
            leftIcon: /* @__PURE__ */ jsx(AddIcon, {}),
            onClick: startCreate,
            children: t("admins.add")
          })]
        })
      }), /* @__PURE__ */ jsx(ModalCloseButton, {
        mt: 3
      }), /* @__PURE__ */ jsx(ModalBody, {
        pb: 6,
        children: showForm ? /* @__PURE__ */ jsxs(VStack, {
          spacing: 3,
          align: "stretch",
          children: [/* @__PURE__ */ jsxs(FormControl, {
            children: [/* @__PURE__ */ jsx(FormLabel, {
              fontSize: "sm",
              children: t("username")
            }), /* @__PURE__ */ jsx(Input, {
              size: "sm",
              value: form.username,
              isDisabled: !!editing,
              onChange: (e) => setForm({
                ...form,
                username: e.target.value
              })
            })]
          }), /* @__PURE__ */ jsxs(FormControl, {
            children: [/* @__PURE__ */ jsxs(FormLabel, {
              fontSize: "sm",
              children: [t("password"), " ", editing && /* @__PURE__ */ jsxs(Text, {
                as: "span",
                fontSize: "xs",
                color: "gray.500",
                children: ["(", t("admins.leaveBlankKeep"), ")"]
              })]
            }), /* @__PURE__ */ jsx(Input, {
              size: "sm",
              type: "password",
              value: form.password,
              onChange: (e) => setForm({
                ...form,
                password: e.target.value
              })
            })]
          }), /* @__PURE__ */ jsx(Checkbox, {
            isChecked: form.is_sudo,
            onChange: (e) => setForm({
              ...form,
              is_sudo: e.target.checked
            }),
            children: t("admins.isSudo")
          }), !form.is_sudo && /* @__PURE__ */ jsxs(Fragment, {
            children: [/* @__PURE__ */ jsxs(HStack, {
              children: [/* @__PURE__ */ jsxs(FormControl, {
                children: [/* @__PURE__ */ jsx(FormLabel, {
                  fontSize: "sm",
                  children: t("admins.usersLimit")
                }), /* @__PURE__ */ jsx(Input, {
                  size: "sm",
                  type: "number",
                  placeholder: "0 = \u221E",
                  value: form.users_limit,
                  onChange: (e) => setForm({
                    ...form,
                    users_limit: e.target.value
                  })
                })]
              }), /* @__PURE__ */ jsxs(FormControl, {
                children: [/* @__PURE__ */ jsxs(FormLabel, {
                  fontSize: "sm",
                  children: [t("admins.trafficLimit"), " (GB)"]
                }), /* @__PURE__ */ jsx(Input, {
                  size: "sm",
                  type: "number",
                  placeholder: "0 = \u221E",
                  value: form.traffic_limit,
                  onChange: (e) => setForm({
                    ...form,
                    traffic_limit: e.target.value
                  })
                })]
              })]
            }), /* @__PURE__ */ jsxs(HStack, {
              children: [/* @__PURE__ */ jsxs(FormControl, {
                children: [/* @__PURE__ */ jsx(FormLabel, {
                  fontSize: "sm",
                  children: t("admins.maxUserIp")
                }), /* @__PURE__ */ jsx(Input, {
                  size: "sm",
                  type: "number",
                  placeholder: "0 = \u221E",
                  value: form.max_user_ip_limit,
                  onChange: (e) => setForm({
                    ...form,
                    max_user_ip_limit: e.target.value
                  })
                })]
              }), /* @__PURE__ */ jsxs(FormControl, {
                children: [/* @__PURE__ */ jsx(FormLabel, {
                  fontSize: "sm",
                  children: t("admins.maxUserHwid")
                }), /* @__PURE__ */ jsx(Input, {
                  size: "sm",
                  type: "number",
                  placeholder: "0 = \u221E",
                  value: form.max_user_hwid_limit,
                  onChange: (e) => setForm({
                    ...form,
                    max_user_hwid_limit: e.target.value
                  })
                })]
              })]
            }), /* @__PURE__ */ jsxs(FormControl, {
              children: [/* @__PURE__ */ jsx(FormLabel, {
                fontSize: "sm",
                children: t("admins.expireDate")
              }), /* @__PURE__ */ jsx(Input, {
                size: "sm",
                type: "date",
                value: form.expire_date,
                onChange: (e) => setForm({
                  ...form,
                  expire_date: e.target.value
                })
              })]
            }), /* @__PURE__ */ jsxs(FormControl, {
              children: [/* @__PURE__ */ jsx(FormLabel, {
                fontSize: "sm",
                children: t("admins.hostGroups")
              }), /* @__PURE__ */ jsxs(HStack, {
                spacing: 2,
                flexWrap: "wrap",
                children: [(groupNames || []).map((g) => {
                  const list = form.host_groups.split(",").map((x) => x.trim()).filter(Boolean);
                  const on = list.includes(g);
                  return /* @__PURE__ */ jsx(Button, {
                    size: "xs",
                    borderRadius: "full",
                    colorScheme: "primary",
                    variant: on ? "solid" : "outline",
                    onClick: () => setForm({
                      ...form,
                      host_groups: (on ? list.filter((x) => x !== g) : [...list, g]).join(", ")
                    }),
                    children: g
                  }, g);
                }), groupNames && groupNames.length === 0 && /* @__PURE__ */ jsx(Text, {
                  fontSize: "xs",
                  color: "gray.500",
                  children: t("admins.noGroupsYet")
                })]
              }), /* @__PURE__ */ jsx(Text, {
                fontSize: "xs",
                color: "gray.500",
                mt: 1,
                children: t("admins.hostGroupsPlaceholder")
              })]
            })]
          }), !form.is_sudo && /* @__PURE__ */ jsx(AdminSubProfile, {
            name: editing || "",
            saveRef: profileSave,
            focus: subFirst
          }), /* @__PURE__ */ jsxs(HStack, {
            justifyContent: "flex-end",
            pt: 2,
            children: [/* @__PURE__ */ jsx(Button, {
              size: "sm",
              variant: "ghost",
              onClick: () => setShowForm(false),
              children: t("cancel")
            }), /* @__PURE__ */ jsx(Button, {
              size: "sm",
              colorScheme: "primary",
              onClick: submit,
              children: t("admins.save")
            })]
          })]
        }) : /* @__PURE__ */ jsx(VStack, {
          spacing: 2,
          align: "stretch",
          children: admins.map((admin) => {
            var _a;
            return /* @__PURE__ */ jsx(Box, {
              borderWidth: "1px",
              borderRadius: "8px",
              px: 3,
              py: 2,
              _dark: {
                borderColor: "gray.600"
              },
              children: /* @__PURE__ */ jsxs(HStack, {
                justifyContent: "space-between",
                children: [/* @__PURE__ */ jsxs(VStack, {
                  align: "flex-start",
                  spacing: 0,
                  children: [/* @__PURE__ */ jsxs(HStack, {
                    children: [/* @__PURE__ */ jsx(Text, {
                      fontSize: "sm",
                      fontWeight: "medium",
                      children: admin.username
                    }), admin.is_sudo && /* @__PURE__ */ jsx(Badge, {
                      colorScheme: "purple",
                      children: t("admins.sudo")
                    })]
                  }), !admin.is_sudo && /* @__PURE__ */ jsxs(Text, {
                    fontSize: "xs",
                    color: "gray.500",
                    children: [t("admins.users"), ":", " ", admin.users_limit ? `\u2264 ${admin.users_limit}` : "\u221E", " ", "\xB7 ", t("admins.traffic"), ":", " ", formatBytes(admin.users_usage || 0), admin.traffic_limit ? ` / ${formatBytes(admin.traffic_limit)}` : "", ((_a = admin.host_groups) == null ? void 0 : _a.length) ? ` \xB7 ${admin.host_groups.join(", ")}` : ""]
                  }), !admin.is_sudo && (() => {
                    const pr = profiles == null ? void 0 : profiles[admin.username];
                    return /* @__PURE__ */ jsxs(HStack, {
                      spacing: 1,
                      mt: 1,
                      flexWrap: "wrap",
                      rowGap: 1,
                      children: [/* @__PURE__ */ jsxs(Badge, {
                        variant: "subtle",
                        colorScheme: (pr == null ? void 0 : pr.domain) ? "primary" : "gray",
                        fontSize: "2xs",
                        title: (pr == null ? void 0 : pr.domain) || "",
                        children: [t("adminSub.badgeDomain"), ": ", (pr == null ? void 0 : pr.domain) ? pr.domain.replace(/^https?:\/\//, "") : t("adminSub.general")]
                      }), /* @__PURE__ */ jsxs(Badge, {
                        variant: "subtle",
                        colorScheme: (pr == null ? void 0 : pr.texts) ? "primary" : "gray",
                        fontSize: "2xs",
                        children: [t("adminSub.badgeTexts"), ": ", (pr == null ? void 0 : pr.texts) ? t("adminSub.ownN", {
                          n: pr.texts
                        }) : t("adminSub.general")]
                      }), /* @__PURE__ */ jsxs(Badge, {
                        variant: "subtle",
                        colorScheme: (pr == null ? void 0 : pr.external) ? "primary" : "gray",
                        fontSize: "2xs",
                        children: [t("adminSub.badgeExternal"), ": ", (pr == null ? void 0 : pr.external) || 0, (pr == null ? void 0 : pr.include_general) === false ? ` \xB7 ${t("adminSub.noGeneral")}` : "", (pr == null ? void 0 : pr.self_edit) ? ` \xB7 ${t("adminSub.selfEditShort")}` : ""]
                      })]
                    });
                  })()]
                }), /* @__PURE__ */ jsxs(HStack, {
                  children: [!admin.is_sudo && /* @__PURE__ */ jsx(Button, {
                    size: "xs",
                    variant: "outline",
                    colorScheme: "primary",
                    onClick: () => startEdit(admin, true),
                    children: t("adminSub.button")
                  }), /* @__PURE__ */ jsx(Tooltip, {
                    label: t("admins.edit"),
                    children: /* @__PURE__ */ jsx(IconButton, {
                      "aria-label": "edit",
                      size: "xs",
                      variant: "ghost",
                      icon: /* @__PURE__ */ jsx(EditIcon, {}),
                      onClick: () => startEdit(admin)
                    })
                  }), !admin.is_sudo && /* @__PURE__ */ jsx(Tooltip, {
                    label: t("admins.delete"),
                    children: /* @__PURE__ */ jsx(IconButton, {
                      "aria-label": "delete",
                      size: "xs",
                      variant: "ghost",
                      colorScheme: "red",
                      icon: /* @__PURE__ */ jsx(DeleteIcon, {}),
                      onClick: () => remove(admin.username)
                    })
                  })]
                })]
              })
            }, admin.username);
          })
        })
      })]
    })]
  });
};
export {
  AdminsModal
};
