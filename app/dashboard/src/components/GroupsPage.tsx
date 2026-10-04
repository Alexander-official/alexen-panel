import {
  Box,
  Button,
  Collapse,
  HStack,
  IconButton,
  Input,
  SimpleGrid,
  Text,
  Textarea,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import {
  CheckIcon,
  PencilSquareIcon,
  PlusIcon,
  RectangleGroupIcon,
  ServerIcon,
  TrashIcon,
  UserIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { FC, ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";

type GroupHost = {
  id: number;
  remark: string;
  address: string;
  inbound_tag: string;
  groups: string[];
  is_disabled: boolean;
};
type Group = { name: string; note: string; hosts: number[]; admins: string[] };
type GroupsData = { groups: Group[]; hosts: GroupHost[] };

const KEY = "host-groups";
const sm = { width: 16, height: 16 };
const errorText = (e: any) => e?.data?.detail || e?.message || "";

// soft surfaces shared by the cards on this page
const surface = {
  borderWidth: "1px",
  borderColor: "light-border",
  borderRadius: "16px",
  bg: "var(--app-surface)",
  boxShadow: "0 1px 2px rgba(16,24,40,.04), 0 4px 16px rgba(16,24,40,.04)",
  _dark: { borderColor: "gray.700", bg: "gray.750", boxShadow: "none" },
} as const;
const tint = "color-mix(in srgb, var(--chakra-colors-primary-500) 12%, transparent)";

const Pill: FC<{ icon?: any; children: ReactNode; strong?: boolean }> = ({ icon: Icon, children, strong }) => (
  <HStack
    spacing={1}
    px={2.5}
    h="24px"
    borderRadius="full"
    fontSize="xs"
    fontWeight="medium"
    bg={strong ? tint : "blackAlpha.50"}
    color={strong ? "primary.600" : "gray.600"}
    _dark={{ bg: strong ? tint : "whiteAlpha.100", color: strong ? "primary.200" : "gray.300" }}
    flexShrink={0}
  >
    {Icon && <Icon width={12} height={12} />}
    <Text as="span">{children}</Text>
  </HStack>
);

const GroupAvatar: FC<{ name: string }> = ({ name }) => (
  <Box
    w="40px"
    h="40px"
    borderRadius="12px"
    bg={tint}
    color="primary.600"
    _dark={{ color: "primary.200" }}
    display="flex"
    alignItems="center"
    justifyContent="center"
    fontWeight="bold"
    fontSize="md"
    flexShrink={0}
    textTransform="uppercase"
  >
    {name.trim().charAt(0) || "#"}
  </Box>
);

const HostOption: FC<{ host: GroupHost; selected: boolean; others: string[]; onToggle: () => void }> = ({
  host,
  selected,
  others,
  onToggle,
}) => {
  const { t } = useTranslation();
  return (
    <HStack
      as="button"
      type="button"
      w="full"
      textAlign="left"
      spacing={3}
      px={3}
      py={2}
      borderRadius="10px"
      borderWidth="1px"
      borderColor={selected ? "primary.400" : "light-border"}
      bg={selected ? tint : "transparent"}
      _dark={{ borderColor: selected ? "primary.300" : "gray.600" }}
      _hover={{ borderColor: "primary.300" }}
      onClick={onToggle}
    >
      <Box
        w="18px"
        h="18px"
        borderRadius="8px"
        borderWidth="1.5px"
        borderColor={selected ? "primary.500" : "gray.400"}
        bg={selected ? "primary.500" : "transparent"}
        color="white"
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexShrink={0}
      >
        {selected && <CheckIcon width={12} height={12} strokeWidth={3} />}
      </Box>
      <Box minW={0} flex={1}>
        <Text fontSize="sm" isTruncated>
          {host.remark}
        </Text>
        <Text fontSize="xs" color="gray.500" isTruncated>
          {host.address}
          {host.is_disabled ? ` · ${t("groups.disabled")}` : ""}
        </Text>
      </Box>
      {others.length > 0 && (
        <HStack spacing={1} flexShrink={0} display={{ base: "none", sm: "flex" }}>
          {others.slice(0, 2).map((g) => (
            <Pill key={g}>{g}</Pill>
          ))}
          {others.length > 2 && <Pill>+{others.length - 2}</Pill>}
        </HStack>
      )}
    </HStack>
  );
};

const GroupCard: FC<{ group: Group; hosts: GroupHost[] }> = ({ group, hosts }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(group.name);
  const [note, setNote] = useState(group.note);
  const [picking, setPicking] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set(group.hosts));
  const [busy, setBusy] = useState(false);

  useEffect(() => setSelected(new Set(group.hosts)), [group.hosts.join(",")]);

  const byInbound = useMemo(() => {
    const map: Record<string, GroupHost[]> = {};
    hosts.forEach((h) => (map[h.inbound_tag] ||= []).push(h));
    return map;
  }, [hosts]);

  const save = (body: object, done?: () => void) => {
    setBusy(true);
    fetch(`/groups/${encodeURIComponent(group.name)}`, { method: "PUT", body })
      .then((data: GroupsData) => {
        qc.setQueryData(KEY, data);
        toast({ status: "success", title: t("groups.saved"), duration: 1500 });
        done?.();
      })
      .catch((e) =>
        toast({ status: "error", title: t("groups.error"), description: errorText(e), duration: 3000 })
      )
      .finally(() => setBusy(false));
  };

  const remove = () => {
    if (!window.confirm(t("groups.confirmDelete", { name: group.name }))) return;
    fetch(`/groups/${encodeURIComponent(group.name)}`, { method: "DELETE" }).then((data: GroupsData) =>
      qc.setQueryData(KEY, data)
    );
  };

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const members = hosts.filter((h) => group.hosts.includes(h.id));

  return (
    <Box {...surface} p={{ base: 4, md: 5 }}>
      {editing ? (
        <VStack align="stretch" spacing={2}>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("groups.name")} />
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("groups.note")} />
          <HStack justifyContent="flex-end">
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              {t("cancel")}
            </Button>
            <Button size="sm" colorScheme="primary" isLoading={busy} onClick={() => save({ name, note }, () => setEditing(false))}>
              {t("groups.save")}
            </Button>
          </HStack>
        </VStack>
      ) : (
        <HStack alignItems="flex-start" spacing={3}>
          <GroupAvatar name={group.name} />
          <Box minW={0} flex={1}>
            <Text fontWeight="semibold" fontSize="md" isTruncated>
              {group.name}
            </Text>
            <Text fontSize="xs" color="gray.500" noOfLines={2}>
              {group.note || t("groups.noNote")}
            </Text>
          </Box>
          <HStack spacing={0}>
            <Tooltip label={t("groups.edit")}>
              <IconButton size="sm" variant="ghost" borderRadius="full" aria-label="edit" icon={<PencilSquareIcon {...sm} />} onClick={() => setEditing(true)} />
            </Tooltip>
            <Tooltip label={t("groups.delete")}>
              <IconButton size="sm" variant="ghost" borderRadius="full" colorScheme="red" aria-label="delete" icon={<TrashIcon {...sm} />} onClick={remove} />
            </Tooltip>
          </HStack>
        </HStack>
      )}

      <HStack mt={4} spacing={1.5} flexWrap="wrap" rowGap={1.5}>
        <Pill strong icon={ServerIcon}>
          {t("groups.hostCount", { count: group.hosts.length })}
        </Pill>
        {group.admins.map((a) => (
          <Pill key={a} icon={UserIcon}>
            {a}
          </Pill>
        ))}
      </HStack>

      {!picking && (
        <VStack align="stretch" spacing={1} mt={3}>
          {members.length === 0 && (
            <Text fontSize="xs" color="gray.500" py={1}>
              {t("groups.noMembers")}
            </Text>
          )}
          {members.slice(0, 5).map((h) => (
            <HStack
              key={h.id}
              px={3}
              py={1.5}
              borderRadius="10px"
              bg="blackAlpha.50"
              _dark={{ bg: "whiteAlpha.50" }}
              spacing={2}
            >
              <Text fontSize="sm" isTruncated flex={1}>
                {h.remark}
              </Text>
              <Text fontSize="xs" color="gray.500" flexShrink={0}>
                {h.inbound_tag}
              </Text>
            </HStack>
          ))}
          {members.length > 5 && (
            <Text fontSize="xs" color="gray.500" px={3}>
              {t("groups.more", { count: members.length - 5 })}
            </Text>
          )}
        </VStack>
      )}

      <Collapse in={picking} animateOpacity unmountOnExit>
        <VStack align="stretch" spacing={4} mt={4}>
          {Object.keys(byInbound).length === 0 && (
            <Text fontSize="xs" color="gray.500">
              {t("groups.noHosts")}
            </Text>
          )}
          {Object.entries(byInbound).map(([tag, list]) => (
            <Box key={tag}>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1.5} letterSpacing="wide">
                {tag}
              </Text>
              <VStack align="stretch" spacing={1.5}>
                {list.map((h) => (
                  <HostOption
                    key={h.id}
                    host={h}
                    selected={selected.has(h.id)}
                    others={h.groups.filter((g) => g !== group.name)}
                    onToggle={() => toggle(h.id)}
                  />
                ))}
              </VStack>
            </Box>
          ))}
        </VStack>
      </Collapse>

      <HStack mt={4} spacing={2}>
        {picking ? (
          <>
            <Button flex={1} variant="ghost" leftIcon={<XMarkIcon {...sm} />} onClick={() => setPicking(false)}>
              {t("cancel")}
            </Button>
            <Button
              flex={1}
              colorScheme="primary"
              leftIcon={<CheckIcon {...sm} />}
              isLoading={busy}
              onClick={() => save({ hosts: Array.from(selected) }, () => setPicking(false))}
            >
              {t("groups.save")}
            </Button>
          </>
        ) : (
          <Button
            flex={1}
            variant="outline"
            colorScheme="primary"
            leftIcon={<PlusIcon {...sm} />}
            onClick={() => {
              setSelected(new Set(group.hosts));
              setPicking(true);
            }}
          >
            {t("groups.manageHosts")}
          </Button>
        )}
      </HStack>
    </Box>
  );
};

export const GroupsPage: FC = () => {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const { data } = useQuery<GroupsData>({ queryKey: KEY, queryFn: () => fetch("/groups") });
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const create = () => {
    if (!name.trim()) return;
    setBusy(true);
    fetch("/groups", { method: "POST", body: { name: name.trim(), note } })
      .then((d: GroupsData) => {
        qc.setQueryData(KEY, d);
        setName("");
        setNote("");
      })
      .catch((e) =>
        toast({ status: "error", title: t("groups.error"), description: errorText(e), duration: 3000 })
      )
      .finally(() => setBusy(false));
  };

  const ungrouped = (data?.hosts || []).filter((h) => h.groups.length === 0).length;

  return (
    <VStack align="stretch" spacing={{ base: 3, md: 4 }}>
      <Box {...surface} p={{ base: 4, md: 5 }}>
        <HStack spacing={3} mb={4} alignItems="flex-start">
          <Box
            w="40px"
            h="40px"
            borderRadius="12px"
            bg="primary.500"
            color="white"
            display="flex"
            alignItems="center"
            justifyContent="center"
            flexShrink={0}
          >
            <RectangleGroupIcon width={20} height={20} />
          </Box>
          <Box>
            <Text fontWeight="semibold">{t("groups.create")}</Text>
            <Text fontSize="xs" color="gray.500">
              {t("groups.help")}
            </Text>
          </Box>
        </HStack>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={2}>
          <Input
            placeholder={t("groups.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <Input placeholder={t("groups.note")} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button colorScheme="primary" leftIcon={<PlusIcon {...sm} />} isLoading={busy} onClick={create} isDisabled={!name.trim()}>
            {t("groups.create")}
          </Button>
        </SimpleGrid>
        {data && (
          <HStack mt={3} spacing={1.5}>
            <Pill icon={ServerIcon}>{t("groups.ungrouped", { count: ungrouped })}</Pill>
          </HStack>
        )}
      </Box>

      {data && data.groups.length === 0 && (
        <Text fontSize="sm" color="gray.500" textAlign="center" py={8}>
          {t("groups.empty")}
        </Text>
      )}

      <SimpleGrid columns={{ base: 1, md: 2, xl: 3 }} spacing={{ base: 3, md: 4 }} alignItems="start">
        {(data?.groups || []).map((g) => (
          <GroupCard key={g.name} group={g} hosts={data!.hosts} />
        ))}
      </SimpleGrid>
    </VStack>
  );
};
