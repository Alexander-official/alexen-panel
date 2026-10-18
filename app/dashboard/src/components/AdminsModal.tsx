import {
  Avatar,
  Badge,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Select,
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
  ModalFooter,
  ModalHeader,
  ModalOverlay,
} from "./PageSurface";
import { ArrowsRightLeftIcon, PencilIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { useDashboard, useDashboardPick } from "contexts/DashboardContext";
import { FC, useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { fetch } from "service/http";
import { serverMessage } from "utils/serverMessage";
import { AdminSubProfile } from "./AdminSubProfile";
import { useQuery } from "react-query";
import { formatBytes } from "utils/formatByte";
import useGetUser from "hooks/useGetUser";

const EditIcon = chakra(PencilIcon, { baseStyle: { w: 4, h: 4 } });
const DeleteIcon = chakra(TrashIcon, { baseStyle: { w: 4, h: 4 } });
const TransferIcon = chakra(ArrowsRightLeftIcon, { baseStyle: { w: 4, h: 4 } });
const AddIcon = chakra(PlusIcon, { baseStyle: { w: 4, h: 4 } });

type AdminItem = {
  username: string;
  is_sudo: boolean;
  is_creator?: boolean;
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
  is_creator: boolean;
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
  is_creator: false,
  users_limit: "",
  traffic_limit: "",
  expire_date: "",
  max_user_ip_limit: "",
  max_user_hwid_limit: "",
  host_groups: "",
};

// expire_date comes as UTC without a zone ("2026-10-14T18:59:59")
const utcDate = (v: string) => new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(v) ? v : v + "Z");
const localDay = (v: string) => {
  const d = utcDate(v);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const AdminsModal: FC = () => {
  const { data: groupNames } = useQuery<string[]>({
    queryKey: "host-group-names",
    queryFn: () => fetch("/groups").then((d: any) => d.groups.map((g: any) => g.name)),
  });
  const { isManagingAdmins, onManagingAdmins } = useDashboardPick("isManagingAdmins", "onManagingAdmins");
  const { t } = useTranslation();
  const toast = useToast();
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [transferFrom, setTransferFrom] = useState<AdminItem | null>(null);
  const [confirmDel, setConfirmDel] = useState<AdminItem | null>(null);
  const [showForm, setShowForm] = useState(false);
  const profileSave = useRef<((name: string) => Promise<unknown>) | null>(null);
  const [subFirst, setSubFirst] = useState(false);
  const { data: profiles, refetch: refetchProfiles } = useQuery<Record<string, any>>({
    queryKey: "admin-sub-profiles",
    queryFn: () => fetch("/admins/sub-profiles"),
    enabled: isManagingAdmins,
  });

  // each admin's own picture and name (Profile page)
  const { data: people } = useQuery<Record<string, { display_name: string; avatar: string | null }>>({
    queryKey: "admin-people",
    queryFn: () => fetch("/profiles"),
    enabled: isManagingAdmins,
    staleTime: 60000,
  });

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

  const { userData: me } = useGetUser();
  const iAmCreator = !!(me as any)?.is_creator;
  const myName = (me as any)?.username;
  // a creator account: only a creator changes it (the server doesn't even list it for the others)
  const canManage = (a: AdminItem) => !a.is_creator || iAmCreator || a.username === myName;
  const role = form.is_creator ? "creator" : form.is_sudo ? "sudo" : "admin";
  // same rules as the server (app/models/admin.py)
  const nameError =
    !editing && form.username.length > 0 && !/^[A-Za-z0-9_.@-]{3,32}$/.test(form.username.trim());
  const passError =
    form.password.length > 0 && (form.password.length < 6 || !form.password.trim());
  const canSave =
    (!!editing || (/^[A-Za-z0-9_.@-]{3,32}$/.test(form.username.trim()) && form.password.length >= 6)) &&
    !nameError && !passError;

  const startCreate = () => {
    setForm(emptyForm);
    setEditing(null);
    setShowForm(true);
  };

  const startEdit = (admin: AdminItem, sub = false) => {
    setSubFirst(sub);
    setForm({
      username: admin.username,
      password: "",
      is_sudo: admin.is_sudo,
      is_creator: !!admin.is_creator,
      users_limit: admin.users_limit ? String(admin.users_limit) : "",
      traffic_limit: admin.traffic_limit
        ? String(admin.traffic_limit / 1073741824)
        : "",
      expire_date: admin.expire_date ? localDay(admin.expire_date) : "",
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

  // a 422 lists the fields: show the first message
  const errorText = (e: any) => {
    const d = e?.response?._data?.detail;
    if (Array.isArray(d)) return String(d[0]?.msg || "").replace(/^Value error, /, "");
    return serverMessage(t, d);
  };

  const submit = () => {
    if (!canSave) return;
    const body: any = {
      is_sudo: form.is_sudo || form.is_creator,
      // roles above sudo are the creator's to give (the server checks it too)
      ...(iAmCreator ? { is_creator: form.is_creator } : {}),
      ...(editing && form.password ? { password: form.password } : {}),
      users_limit: form.users_limit ? parseInt(form.users_limit) : 0,
      traffic_limit: form.traffic_limit
        ? Math.round(parseFloat(form.traffic_limit) * 1073741824)
        : 0,
      // the chosen day counts whole: the account works until its end (local time)
      expire_date: form.expire_date
        ? new Date(form.expire_date + "T23:59:59").toISOString()
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
          body: { ...body, username: form.username.trim(), password: form.password },
        });
    req
      .then(() => (!form.is_sudo && profileSave.current ? profileSave.current(editing || form.username.trim()) : null))
      .then(() => {
        toast({ status: "success", title: t("admins.saved"), duration: 2000 });
        setShowForm(false);
        refresh();
        refetchProfiles();
      })
      .catch((e) =>
        toast({
          status: "error",
          title: errorText(e) || t("admins.error"),
          duration: 4000,
        })
      )
      .finally(() => setDeleting(false));
  };

  const [deleting, setDeleting] = useState(false);
  const remove = (username: string) => {
    setDeleting(true);
    fetch(`/admin/${username}`, { method: "DELETE" })
      .then(() => { refresh(); setConfirmDel(null); })
      .catch((e) =>
        toast({
          status: "error",
          title: serverMessage(t, e?.response?._data?.detail) || t("admins.error"),
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
      <ModalOverlay bg="blackAlpha.300" />
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
              <FormControl isInvalid={nameError} isRequired={!editing}>
                <FormLabel fontSize="sm">{t("username")}</FormLabel>
                <Input
                  size="sm"
                  value={form.username}
                  isDisabled={!!editing}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                />
                {!editing && (
                  <Text fontSize="xs" color={nameError ? "red.400" : "gray.500"} mt={1}>
                    {t("admins.usernameRule")}
                  </Text>
                )}
              </FormControl>
              <FormControl isInvalid={passError} isRequired={!editing}>
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
                {passError && (
                  <Text fontSize="xs" color="red.400" mt={1}>
                    {t("admins.passwordRule")}
                  </Text>
                )}
              </FormControl>
              <FormControl>
                <FormLabel fontSize="sm">{t("admins.role")}</FormLabel>
                <ButtonGroup size="sm" isAttached variant="outline" w="full">
                  {(iAmCreator ? (["admin", "sudo", "creator"] as const) : (["admin", "sudo"] as const)).map((r) => (
                    <Button
                      key={r}
                      flex="1"
                      colorScheme={role === r ? "primary" : undefined}
                      variant={role === r ? "solid" : "outline"}
                      onClick={() => setForm({ ...form, is_sudo: r !== "admin", is_creator: r === "creator" })}
                    >
                      {t(`admins.roleName.${r}`)}
                    </Button>
                  ))}
                </ButtonGroup>
                <Text fontSize="2xs" color="gray.500" mt={1}>
                  {t(`admins.roleHelp.${role}`)}
                </Text>
              </FormControl>
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
              {!form.is_sudo && <AdminSubProfile name={editing || ""} saveRef={profileSave} focus={subFirst} />}
              <HStack justifyContent="flex-end" pt={2}>
                <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                  {t("cancel")}
                </Button>
                <Button size="sm" colorScheme="primary" onClick={submit} isDisabled={!canSave}>
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
                  borderRadius="8px"
                  px={3}
                  py={2}
                  _dark={{ borderColor: "gray.600" }}
                >
                  <HStack justifyContent="space-between" flexWrap="wrap" rowGap={2}>
                    <Avatar
                      size="sm"
                      name={people?.[admin.username]?.display_name || admin.username}
                      src={people?.[admin.username]?.avatar || undefined}
                      bg="primary.500"
                      color="white"
                      flexShrink={0}
                    />
                    <VStack align="flex-start" spacing={0} minW={0} flex="1">
                      <HStack flexWrap="wrap" rowGap={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {admin.username}
                        </Text>
                        {people?.[admin.username]?.display_name && (
                          <Text fontSize="xs" color="gray.500" isTruncated maxW="160px">
                            {people[admin.username].display_name}
                          </Text>
                        )}
                        {admin.is_creator ? (
                          <Badge colorScheme="yellow">{t("admins.roleName.creator")}</Badge>
                        ) : (
                          admin.is_sudo && <Badge colorScheme="purple">{t("admins.sudo")}</Badge>
                        )}
                        {!admin.is_sudo && admin.expire_date && utcDate(admin.expire_date) < new Date() && (
                          <Badge colorScheme="red" fontSize="2xs">
                            {t("admins.expired")}
                          </Badge>
                        )}
                        {admin.username === myName && (
                          <Badge variant="outline" fontSize="2xs">
                            {t("admins.you")}
                          </Badge>
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
                      {!admin.is_sudo && (() => {
                        const pr = profiles?.[admin.username];
                        return (
                          <HStack spacing={1} mt={1} flexWrap="wrap" rowGap={1}>
                            <Badge variant="subtle" colorScheme={pr?.domain ? "primary" : "gray"} fontSize="2xs" title={pr?.domain || ""}>
                              {t("adminSub.badgeDomain")}: {pr?.domain ? pr.domain.replace(/^https?:\/\//, "") : t("adminSub.general")}
                            </Badge>
                            <Badge variant="subtle" colorScheme={pr?.texts ? "primary" : "gray"} fontSize="2xs">
                              {t("adminSub.badgeTexts")}: {pr?.texts ? t("adminSub.ownN", { n: pr.texts }) : t("adminSub.general")}
                            </Badge>
                            <Badge variant="subtle" colorScheme={pr?.external ? "primary" : "gray"} fontSize="2xs">
                              {t("adminSub.badgeExternal")}: {pr?.external || 0}
                              {pr?.include_general === false ? ` · ${t("adminSub.noGeneral")}` : ""}
                              {pr?.self_edit ? ` · ${t("adminSub.selfEditShort")}` : ""}
                            </Badge>
                          </HStack>
                        );
                      })()}
                    </VStack>
                    <HStack flexShrink={0} ml="auto">
                      {!admin.is_sudo && (
                        <Button size="xs" variant="outline" colorScheme="primary" onClick={() => startEdit(admin, true)}>
                          {t("adminSub.button")}
                        </Button>
                      )}
                      <Tooltip label={canManage(admin) ? t("admins.edit") : t("admins.onlyCreatorEdit")}>
                        <IconButton
                          aria-label="edit"
                          size="xs"
                          variant="ghost"
                          icon={<EditIcon />}
                          isDisabled={!canManage(admin)}
                          onClick={() => startEdit(admin)}
                        />
                      </Tooltip>
                      {canManage(admin) && (
                        <Tooltip label={t("transfer.moveUsers")}>
                          <IconButton
                            aria-label="transfer"
                            size="xs"
                            variant="ghost"
                            icon={<TransferIcon />}
                            onClick={() => setTransferFrom(admin)}
                          />
                        </Tooltip>
                      )}
                      {admin.username !== myName && canManage(admin) && (
                        <Tooltip label={t("admins.delete")}>
                          <IconButton
                            aria-label="delete"
                            size="xs"
                            variant="ghost"
                            colorScheme="red"
                            icon={<DeleteIcon />}
                            onClick={() => setConfirmDel(admin)}
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
      {confirmDel && (
        <Modal isOpen onClose={() => !deleting && setConfirmDel(null)} isCentered size="sm">
          <ModalOverlay backdropFilter="blur(3px)" />
          <ModalContent mx="3">
            <ModalHeader>{t("admins.deleteTitle")}</ModalHeader>
            <ModalCloseButton isDisabled={deleting} />
            <ModalBody>
              <VStack align="stretch" spacing={3}>
                <Text fontSize="sm">
                  {t("admins.deleteConfirm", { name: confirmDel.username })}
                </Text>
                {!confirmDel.is_sudo && (confirmDel.users_usage || 0) >= 0 && (
                  <Box p={2.5} borderRadius="8px" bg="orange.50" _dark={{ bg: "rgba(237,137,54,.12)" }}>
                    <Text fontSize="xs" color="orange.600" _dark={{ color: "orange.300" }}>
                      {t("admins.deleteUsersWarn")}
                    </Text>
                  </Box>
                )}
              </VStack>
            </ModalBody>
            <ModalFooter gap={2}>
              <Button variant="ghost" onClick={() => setConfirmDel(null)} isDisabled={deleting}>
                {t("cancel")}
              </Button>
              <Button colorScheme="red" leftIcon={<DeleteIcon />} isLoading={deleting} onClick={() => remove(confirmDel.username)}>
                {t("admins.delete")}
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
      {transferFrom && (
        <TransferUsersModal
          from={transferFrom}
          admins={admins}
          onClose={() => setTransferFrom(null)}
          onDone={refresh}
        />
      )}
    </Modal>
  );
};

const TransferUsersModal: FC<{ from: AdminItem; admins: AdminItem[]; onClose: () => void; onDone: () => void }> = ({ from, admins, onClose, onDone }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const targets = admins.filter((a) => a.username !== from.username);
  const go = () => {
    if (!to) return;
    setBusy(true);
    fetch("/users/transfer", { method: "POST", body: { from_admin: from.username, to_admin: to } })
      .then((r: { moved: number }) => {
        toast({ status: "success", position: "top", duration: 4000, title: t("transfer.done", { n: r.moved, to }) });
        onDone();
        onClose();
      })
      .catch((e: any) => toast({ status: "error", position: "top", title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic") }))
      .finally(() => setBusy(false));
  };
  return (
    <Modal isOpen onClose={onClose} isCentered size="sm">
      <ModalOverlay backdropFilter="blur(3px)" />
      <ModalContent mx="3">
        <ModalHeader>{t("transfer.title")}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={3}>
            <Text fontSize="sm" color="gray.500">
              {t("transfer.help", { from: from.username })}
            </Text>
            <FormControl>
              <FormLabel fontSize="sm">{t("transfer.target")}</FormLabel>
              <Select size="sm" placeholder={t("transfer.pickTarget")} value={to} onChange={(e) => setTo(e.target.value)}>
                {targets.map((a) => (
                  <option key={a.username} value={a.username}>
                    {a.username}
                    {a.is_sudo ? " · sudo" : ""}
                  </option>
                ))}
              </Select>
            </FormControl>
          </VStack>
        </ModalBody>
        <ModalFooter gap={2}>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button colorScheme="primary" isDisabled={!to} isLoading={busy} onClick={go} leftIcon={<TransferIcon />}>
            {t("transfer.move")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
