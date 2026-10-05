// "Exit through" in the node dialog (app/xray/chain.py): the node keeps
// receiving users (so their real IPs are seen) and forwards their traffic to
// another server over an internal VLESS + REALITY link.
import { Box, Button, HStack, Icon, Input, Select, Text, useToast } from "@chakra-ui/react";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";

type Server = {
  key: string;
  name: string;
  link: null | { exit: string; exit_name: string; port: number; address: string; default_address: string; sni: string };
  relays: string[];
};

export const NodeChain: FC<{ nodeKey: string }> = ({ nodeKey }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, refetch } = useQuery<{ servers: Server[] }>({ queryKey: "chain", queryFn: () => fetch("/chain") });
  const me = data?.servers.find((s) => s.key === nodeKey);
  const [exit, setExit] = useState("");
  const [port, setPort] = useState("");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setExit(me?.link?.exit || "");
    setPort(me?.link ? String(me.link.port) : "");
    setAddress(me?.link?.address || "");
  }, [me?.link?.exit, me?.link?.port, me?.link?.address]);
  if (!me) return null;
  const dirty = exit !== (me.link?.exit || "") || (exit && port !== String(me.link?.port || "")) || address !== (me.link?.address || "");
  const save = () => {
    setBusy(true);
    fetch(`/chain/${nodeKey}`, {
      method: "PUT",
      body: { exit: exit || null, port: port ? Number(port) : null, address },
    })
      .then(() => {
        refetch();
        toast({ title: t("chain.saved"), status: "success", position: "top", duration: 3000 });
      })
      .catch((e: any) => toast({ title: e?.response?._data?.detail || "Error", status: "error", position: "top" }))
      .finally(() => setBusy(false));
  };
  return (
    <Box w="full" borderRadius="14px" bg="blackAlpha.50" _dark={{ bg: "whiteAlpha.50" }} p={3}>
      <HStack mb={1}>
        <Icon as={ArrowRightIcon} boxSize="14px" color="primary.500" />
        <Text fontSize="sm" fontWeight="medium" flex="1">
          {t("chain.title")}
        </Text>
      </HStack>
      <Text fontSize="xs" color="gray.500" mb={2}>
        {t("chain.help")}
      </Text>
      <Select size="sm" borderRadius="10px" value={exit} onChange={(e) => setExit(e.target.value)}>
        <option value="">{t("chain.direct")}</option>
        {data!.servers
          .filter((s) => s.key !== nodeKey)
          .map((s) => (
            <option key={s.key} value={s.key}>
              {s.name}
            </option>
          ))}
      </Select>
      {exit && (
        <HStack mt={2} spacing={2}>
          <Input
            size="sm"
            borderRadius="10px"
            w="110px"
            fontFamily="mono"
            placeholder={t("chain.portAuto")}
            value={port}
            onChange={(e) => setPort(e.target.value.replace(/\D/g, ""))}
          />
          <Input
            size="sm"
            borderRadius="10px"
            fontFamily="mono"
            placeholder={me.link?.default_address || t("chain.addressAuto")}
            value={address}
            onChange={(e) => setAddress(e.target.value.trim())}
          />
        </HStack>
      )}
      {exit && (
        <Text fontSize="xs" color="gray.500" mt={2}>
          {t("chain.portHelp")}
        </Text>
      )}
      {me.relays.length > 0 && (
        <Text fontSize="xs" color="primary.400" mt={2}>
          {t("chain.isExit", { names: me.relays.join(", ") })}
        </Text>
      )}
      {dirty && (
        <Button mt={2} size="xs" colorScheme="primary" isLoading={busy} onClick={save}>
          {t("chain.apply")}
        </Button>
      )}
    </Box>
  );
};
