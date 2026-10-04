import {
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
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
  PencilIcon,
  PlusIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { FC, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";

type GroupHost = {
  id: number;
  remark: string;
  address: string;
  inbound_tag: string;
  group_name: string | null;
  is_disabled: boolean;
};
type Group = { name: string; note: string; hosts: number[]; admins: string[] };
type GroupsData = { groups: Group[]; hosts: GroupHost[] };

const KEY = "host-groups";
const iconSize = { width: 16, height: 16 };

const errorText = (e: any) => e?.data?.detail || e?.message || "";

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

  const memberHosts = hosts.filter((h) => group.hosts.includes(h.id));

  return (
    <Card p={{ base: 3, md: 4 }} borderWidth="1px" borderColor="light-border" boxShadow="none" borderRadius="12px" _dark={{ borderColor: "gray.600" }}>
      {editing ? (
        <VStack align="stretch" spacing={2}>
          <Input size="sm" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("groups.name")} />
          <Textarea size="sm" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("groups.note")} />
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
        <HStack justifyContent="space-between" alignItems="flex-start" spacing={2}>
          <Box minW={0}>
            <Text fontWeight="semibold" isTruncated>
              {group.name}
            </Text>
            {group.note && (
              <Text fontSize="xs" color="gray.500" noOfLines={2}>
                {group.note}
              </Text>
            )}
          </Box>
          <HStack spacing={1} flexShrink={0}>
            <Tooltip label={t("groups.edit")}>
              <IconButton size="sm" variant="ghost" aria-label="edit" icon={<PencilIcon {...iconSize} />} onClick={() => setEditing(true)} />
            </Tooltip>
            <Tooltip label={t("groups.delete")}>
              <IconButton size="sm" variant="ghost" colorScheme="red" aria-label="delete" icon={<TrashIcon {...iconSize} />} onClick={remove} />
            </Tooltip>
          </HStack>
        </HStack>
      )}

      <HStack mt={3} spacing={2} flexWrap="wrap">
        <Badge colorScheme="primary">{t("groups.hostCount", { count: group.hosts.length })}</Badge>
        {group.admins.map((a) => (
          <Badge key={a} variant="outline">
            👤 {a}
          </Badge>
        ))}
      </HStack>

      {!picking && memberHosts.length > 0 && (
        <VStack align="stretch" spacing={0} mt={2}>
          {memberHosts.slice(0, 6).map((h) => (
            <Text key={h.id} fontSize="xs" color="gray.500" isTruncated>
              • {h.remark} <Text as="span" opacity={0.7}>· {h.inbound_tag}</Text>
            </Text>
          ))}
          {memberHosts.length > 6 && (
            <Text fontSize="xs" color="gray.500">
              +{memberHosts.length - 6}
            </Text>
          )}
        </VStack>
      )}

      <Button
        mt={3}
        size="sm"
        variant={picking ? "solid" : "outline"}
        colorScheme="primary"
        leftIcon={picking ? <XMarkIcon {...iconSize} /> : <PlusIcon {...iconSize} />}
        onClick={() => {
          setSelected(new Set(group.hosts));
          setPicking(!picking);
        }}
      >
        {picking ? t("cancel") : t("groups.manageHosts")}
      </Button>

      <Collapse in={picking} animateOpacity unmountOnExit>
        <VStack align="stretch" spacing={3} mt={3}>
          {Object.keys(byInbound).length === 0 && (
            <Text fontSize="xs" color="gray.500">
              {t("groups.noHosts")}
            </Text>
          )}
          {Object.entries(byInbound).map(([tag, list]) => (
            <Box key={tag}>
              <Text fontSize="xs" fontWeight="semibold" color="gray.500" mb={1} textTransform="uppercase">
                {tag}
              </Text>
              <VStack align="stretch" spacing={1}>
                {list.map((h) => {
                  const elsewhere = h.group_name && h.group_name !== group.name ? h.group_name : null;
                  return (
                    <Checkbox
                      key={h.id}
                      colorScheme="primary"
                      isChecked={selected.has(h.id)}
                      onChange={() => toggle(h.id)}
                      size="md"
                    >
                      <Text fontSize="sm" as="span">
                        {h.remark}
                      </Text>
                      <Text as="span" fontSize="xs" color="gray.500">
                        {" "}
                        · {h.address}
                        {h.is_disabled ? ` · ${t("groups.disabled")}` : ""}
                      </Text>
                      {elsewhere && (
                        <Badge ml={2} fontSize="2xs" colorScheme="orange">
                          {t("groups.inGroup", { name: elsewhere })}
                        </Badge>
                      )}
                    </Checkbox>
                  );
                })}
              </VStack>
            </Box>
          ))}
          <Button
            size="sm"
            colorScheme="primary"
            leftIcon={<CheckIcon {...iconSize} />}
            isLoading={busy}
            onClick={() => save({ hosts: Array.from(selected) }, () => setPicking(false))}
          >
            {t("groups.save")}
          </Button>
        </VStack>
      </Collapse>
    </Card>
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

  const ungrouped = (data?.hosts || []).filter((h) => !h.group_name).length;

  return (
    <VStack align="stretch" spacing={4}>
      <Card p={{ base: 3, md: 4 }} borderWidth="1px" borderColor="light-border" boxShadow="none" borderRadius="12px" _dark={{ borderColor: "gray.600" }}>
        <Text fontWeight="semibold" mb={1}>
          {t("groups.create")}
        </Text>
        <Text fontSize="xs" color="gray.500" mb={3}>
          {t("groups.help")}
        </Text>
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={2}>
          <Input
            size="sm"
            placeholder={t("groups.name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && create()}
          />
          <Input size="sm" placeholder={t("groups.note")} value={note} onChange={(e) => setNote(e.target.value)} />
          <Button size="sm" colorScheme="primary" leftIcon={<PlusIcon {...iconSize} />} isLoading={busy} onClick={create} isDisabled={!name.trim()}>
            {t("groups.create")}
          </Button>
        </SimpleGrid>
        {data && (
          <Text fontSize="xs" color="gray.500" mt={3}>
            {t("groups.ungrouped", { count: ungrouped })}
          </Text>
        )}
      </Card>

      {data && data.groups.length === 0 && (
        <Text fontSize="sm" color="gray.500" textAlign="center" py={6}>
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
