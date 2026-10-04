import {
  Badge,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Text,
  Tooltip,
  VStack,
  chakra,
  useToast,
} from "@chakra-ui/react";
import {
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
} from "./PageSurface";
import { PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useDashboard } from "contexts/DashboardContext";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetch } from "service/http";
import { useQuery } from "react-query";
import { formatBytes } from "utils/formatByte";

const EditIcon = chakra(PencilIcon, { baseStyle: { w: 4, h: 4 } });
const DeleteIcon = chakra(TrashIcon, { baseStyle: { w: 4, h: 4 } });
const AddIcon = chakra(PlusIcon, { baseStyle: { w: 4, h: 4 } });

type AdminItem = {
  username: string;
  is_sudo: boolean;
  users_usage: number;
  users_limit: number | null;
  traffic_limit: number | null;
  expire_date: string | null;
  max_user_ip_limit: number | null;
  max_user_hwid_limit: number | null;
  host_groups: string[];
};

type FormState = {
  username: string;
  password: string;
  is_sudo: boolean;
  users_limit: string;
  traffic_limit: string; // in GB
  expire_date: string; // yyyy-mm-dd
  max_user_ip_limit: string;
  max_user_hwid_limit: string;
  host_groups: string; // comma separated
};

const emptyForm: FormState = {
  username: "",
  password: "",
  is_sudo: false,
  users_limit: "",
  traffic_limit: "",
  expire_date: "",
  max_user_ip_limit: "",
  max_user_hwid_limit: "",
  host_groups: "",
};

export const AdminsModal: FC = () => {
  const { data: groupNames } = useQuery<string[]>({
    queryKey: "host-group-names",
    queryFn: () => fetch("/groups").then((d: any) => d.groups.map((g: any) => g.name)),
  });
  const { isManagingAdmins, onManagingAdmins } = useDashboard();
  const { t } = useTranslation();
  const toast = useToast();
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const refresh = () =>
    fetch("/admins").then((data: AdminItem[]) => setAdmins(data));

  useEffect(() => {
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

  const startEdit = (admin: AdminItem) => {
    setForm({
      username: admin.username,
      password: "",
      is_sudo: admin.is_sudo,
      users_limit: admin.users_limit ? String(admin.users_limit) : "",
      traffic_limit: admin.traffic_limit
        ? String(admin.traffic_limit / 1073741824)
        : "",
      expire_date: admin.expire_date ? admin.expire_date.slice(0, 10) : "",
      max_user_ip_limit: admin.max_user_ip_limit
        ? String(admin.max_user_ip_limit)
        : "",
      max_user_hwid_limit: admin.max_user_hwid_limit
        ? String(admin.max_user_hwid_limit)
        : "",
      host_groups: (admin.host_groups || []).join(", "),
    });
    setEditing(admin.username);
    setShowForm(true);
  };

  const submit = () => {
    const body: any = {
      is_sudo: form.is_sudo,
      users_limit: form.users_limit ? parseInt(form.users_limit) : 0,
      traffic_limit: form.traffic_limit
        ? Math.round(parseFloat(form.traffic_limit) * 1073741824)
        : 0,
      expire_date: form.expire_date
        ? new Date(form.expire_date + "T00:00:00").toISOString()
        : null,
      max_user_ip_limit: form.max_user_ip_limit
        ? parseInt(form.max_user_ip_limit)
        : 0,
      max_user_hwid_limit: form.max_user_hwid_limit
        ? parseInt(form.max_user_hwid_limit)
        : 0,
      host_groups: form.host_groups
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
    };
    const req = editing
      ? fetch(`/admin/${editing}`, { method: "PUT", body })
      : fetch("/admin", {
          method: "POST",
          body: { ...body, username: form.username, password: form.password },
        });
    req
      .then(() => {
        toast({ status: "success", title: t("admins.saved"), duration: 2000 });
        setShowForm(false);
        refresh();
      })
      .catch((e) =>
        toast({
          status: "error",
          title: e?.response?._data?.detail || t("admins.error"),
          duration: 4000,
        })
      );
  };

  const remove = (username: string) => {
    fetch(`/admin/${username}`, { method: "DELETE" })
      .then(() => refresh())
      .catch((e) =>
        toast({
          status: "error",
          title: e?.response?._data?.detail || t("admins.error"),
          duration: 4000,
        })
      );
  };

  return (
    <Modal
      isOpen={isManagingAdmins}
      onClose={() => onManagingAdmins(false)}
      size="2xl"
    >
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent mx="3">
        <ModalHeader pt={6}>
          <HStack justifyContent="space-between" pr={8}>
            <Text fontWeight="semibold" fontSize="lg">
              {t("admins.title")}
            </Text>
            {!showForm && (
              <Button size="sm" leftIcon={<AddIcon />} onClick={startCreate}>
                {t("admins.add")}
              </Button>
            )}
          </HStack>
        </ModalHeader>
        <ModalCloseButton mt={3} />
        <ModalBody pb={6}>
          {showForm ? (
            <VStack spacing={3} align="stretch">
              <FormControl>
                <FormLabel fontSize="sm">{t("username")}</FormLabel>
                <Input
                  size="sm"
                  value={form.username}
                  isDisabled={!!editing}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                />
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">
                  {t("password")}{" "}
                  {editing && (
                    <Text as="span" fontSize="xs" color="gray.500">
                      ({t("admins.leaveBlankKeep")})
                    </Text>
                  )}
                </FormLabel>
                <Input
                  size="sm"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                />
              </FormControl>
              <Checkbox
                isChecked={form.is_sudo}
                onChange={(e) =>
                  setForm({ ...form, is_sudo: e.target.checked })
                }
              >
                {t("admins.isSudo")}
              </Checkbox>
              {!form.is_sudo && (
                <>
                  <HStack>
                    <FormControl>
                      <FormLabel fontSize="sm">
                        {t("admins.usersLimit")}
                      </FormLabel>
                      <Input
                        size="sm"
                        type="number"
                        placeholder="0 = ∞"
                        value={form.users_limit}
                        onChange={(e) =>
                          setForm({ ...form, users_limit: e.target.value })
                        }
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">
                        {t("admins.trafficLimit")} (GB)
                      </FormLabel>
                      <Input
                        size="sm"
                        type="number"
                        placeholder="0 = ∞"
                        value={form.traffic_limit}
                        onChange={(e) =>
                          setForm({ ...form, traffic_limit: e.target.value })
                        }
                      />
                    </FormControl>
                  </HStack>
                  <HStack>
                    <FormControl>
                      <FormLabel fontSize="sm">
                        {t("admins.maxUserIp")}
                      </FormLabel>
                      <Input
                        size="sm"
                        type="number"
                        placeholder="0 = ∞"
                        value={form.max_user_ip_limit}
                        onChange={(e) =>
                          setForm({ ...form, max_user_ip_limit: e.target.value })
                        }
                      />
                    </FormControl>
                    <FormControl>
                      <FormLabel fontSize="sm">
                        {t("admins.maxUserHwid")}
                      </FormLabel>
                      <Input
                        size="sm"
                        type="number"
                        placeholder="0 = ∞"
                        value={form.max_user_hwid_limit}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            max_user_hwid_limit: e.target.value,
                          })
                        }
                      />
                    </FormControl>
                  </HStack>
                  <FormControl>
                    <FormLabel fontSize="sm">{t("admins.expireDate")}</FormLabel>
                    <Input
                      size="sm"
                      type="date"
                      value={form.expire_date}
                      onChange={(e) =>
                        setForm({ ...form, expire_date: e.target.value })
                      }
                    />
                  </FormControl>
                  <FormControl>
                    <FormLabel fontSize="sm">
                      {t("admins.hostGroups")}
                    </FormLabel>
                    {/* pick from the groups created on the Groups page */}
                    <HStack spacing={2} flexWrap="wrap">
                      {(groupNames || []).map((g) => {
                        const list = form.host_groups
                          .split(",")
                          .map((x) => x.trim())
                          .filter(Boolean);
                        const on = list.includes(g);
                        return (
                          <Button
                            key={g}
                            size="xs"
                            borderRadius="full"
                            colorScheme="primary"
                            variant={on ? "solid" : "outline"}
                            onClick={() =>
                              setForm({
                                ...form,
                                host_groups: (on
                                  ? list.filter((x) => x !== g)
                                  : [...list, g]
                                ).join(", "),
                              })
                            }
                          >
                            {g}
                          </Button>
                        );
                      })}
                      {groupNames && groupNames.length === 0 && (
                        <Text fontSize="xs" color="gray.500">
                          {t("admins.noGroupsYet")}
                        </Text>
                      )}
                    </HStack>
                    <Text fontSize="xs" color="gray.500" mt={1}>
                      {t("admins.hostGroupsPlaceholder")}
                    </Text>
                  </FormControl>
                </>
              )}
              <HStack justifyContent="flex-end" pt={2}>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                  {t("cancel")}
                </Button>
                <Button size="sm" colorScheme="primary" onClick={submit}>
                  {t("admins.save")}
                </Button>
              </HStack>
            </VStack>
          ) : (
            <VStack spacing={2} align="stretch">
              {admins.map((admin) => (
                <Box
                  key={admin.username}
                  borderWidth="1px"
                  borderRadius="6px"
                  px={3}
                  py={2}
                  _dark={{ borderColor: "gray.600" }}
                >
                  <HStack justifyContent="space-between">
                    <VStack align="flex-start" spacing={0}>
                      <HStack>
                        <Text fontSize="sm" fontWeight="medium">
                          {admin.username}
                        </Text>
                        {admin.is_sudo && (
                          <Badge colorScheme="purple">{t("admins.sudo")}</Badge>
                        )}
                      </HStack>
                      {!admin.is_sudo && (
                        <Text fontSize="xs" color="gray.500">
                          {t("admins.users")}:{" "}
                          {admin.users_limit
                            ? `≤ ${admin.users_limit}`
                            : "∞"}{" "}
                          · {t("admins.traffic")}:{" "}
                          {formatBytes(admin.users_usage || 0)}
                          {admin.traffic_limit
                            ? ` / ${formatBytes(admin.traffic_limit)}`
                            : ""}
                          {admin.host_groups?.length
                            ? ` · ${admin.host_groups.join(", ")}`
                            : ""}
                        </Text>
                      )}
                    </VStack>
                    <HStack>
                      <Tooltip label={t("admins.edit")}>
                        <IconButton
                          aria-label="edit"
                          size="xs"
                          variant="ghost"
                          icon={<EditIcon />}
                          onClick={() => startEdit(admin)}
                        />
                      </Tooltip>
                      {!admin.is_sudo && (
                        <Tooltip label={t("admins.delete")}>
                          <IconButton
                            aria-label="delete"
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            icon={<DeleteIcon />}
                            onClick={() => remove(admin.username)}
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </HStack>
                </Box>
              ))}
            </VStack>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
