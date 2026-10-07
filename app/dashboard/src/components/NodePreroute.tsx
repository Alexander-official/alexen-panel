// "Preroute" in the node dialog (app/vpn/preroute.py): this node forwards ports
// to another server through a WireGuard / AmneziaWG link; the exit sees the
// users' real IPs. Both servers need the Alexen agent.
import { Box, Button, Checkbox, HStack, Icon, Input, Select, Text, Tooltip, useToast, VStack } from "@chakra-ui/react";
import { ArrowsRightLeftIcon, CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import { formatBytes } from "utils/formatByte";

type Fwd = { proto: "tcp" | "udp" | "both"; port: number };
type Server = {
  key: string;
  name: string;
  relays: string[];
  link: null | {
    exit: string;
    exit_name: string;
    kind: "wg" | "awg";
    port: number;
    mtu: number;
    all_ports: boolean;
    forwards: Fwd[];
    forwarding: Fwd[];
    relay_address: string;
    handshake: number;
    rx: number;
    tx: number;
    relay_agent?: boolean;
    exit_agent?: boolean;
    relay_error: string;
    exit_error: string;
  };
};

const parsePorts = (text: string): Fwd[] =>
  text
    .split(/[\s,]+/)
    .filter(Boolean)
    .map((x) => {
      const m = x.match(/^(\d+)(?:\/(tcp|udp))?$/i);
      return m ? { port: Number(m[1]), proto: ((m[2] || "both").toLowerCase() as Fwd["proto"]) } : null;
    })
    .filter((x): x is Fwd => !!x && x.port > 0 && x.port < 65536);
const showPorts = (list: Fwd[]) => list.map((f) => (f.proto === "both" ? `${f.port}` : `${f.port}/${f.proto}`)).join(", ");

export const NodePreroute: FC<{ nodeKey: string }> = ({ nodeKey }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const { data, refetch } = useQuery<{ servers: Server[] }>({
    queryKey: "preroute",
    queryFn: () => fetch("/preroute"),
    refetchInterval: 10000,
  });
  const me = data?.servers.find((s) => s.key === nodeKey);
  const [exit, setExit] = useState("");
  const [kind, setKind] = useState<"wg" | "awg">("wg");
  const [all, setAll] = useState(true);
  const [ports, setPorts] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!me) return;
    setExit(me.link?.exit || "");
    setKind(me.link?.kind || "wg");
    setAll(me.link ? me.link.all_ports : true);
    setPorts(me.link ? showPorts(me.link.forwards) : "");
  }, [me?.link?.exit, me?.link?.kind, me?.link?.all_ports, JSON.stringify(me?.link?.forwards)]);
  if (!me) return null;
  const l = me.link;
  const dirty =
    exit !== (l?.exit || "") || (exit && (kind !== (l?.kind || "wg") || all !== (l ? l.all_ports : true) || (!all && ports !== showPorts(l?.forwards || []))));
  const fail = (e: any) => toast({ title: e?.response?._data?.detail || "Error", status: "error", position: "top", duration: 5000 });
  const save = () => {
    setBusy(true);
    fetch(`/preroute/${nodeKey}`, {
      method: "PUT",
      body: { exit: exit || null, kind, all_ports: all, forwards: all ? [] : parsePorts(ports) },
    })
      .then(() => {
        refetch();
        toast({ title: t("preroute.saved"), status: "success", position: "top", duration: 3000 });
      })
      .catch(fail)
      .finally(() => setBusy(false));
  };
  const makeHosts = () =>
    fetch(`/preroute/${nodeKey}/hosts`, { method: "POST" })
      .then((r: any) => toast({ title: t("preroute.hostsMade", { n: r.created }), status: "success", position: "top" }))
      .catch(fail);
  const up = l && l.handshake && Date.now() / 1000 - l.handshake < 180;

  return (
    <Box w="full" borderRadius="14px" bg="blackAlpha.50" _dark={{ bg: "whiteAlpha.50" }} p={3}>
      <HStack mb={1}>
        <Icon as={ArrowsRightLeftIcon} boxSize="14px" color="primary.500" />
        <Text fontSize="sm" fontWeight="medium" flex="1">
          {t("preroute.title")}
        </Text>
        {l && (
          <HStack spacing={1} fontSize="xs" color={up ? "green.400" : "orange.400"}>
            <Icon as={up ? CheckCircleIcon : ExclamationTriangleIcon} boxSize="14px" />
            <Text>{up ? t("preroute.up", { rx: formatBytes(l.rx), tx: formatBytes(l.tx) }) : t("preroute.down")}</Text>
          </HStack>
        )}
      </HStack>
      <Text fontSize="xs" color="gray.500" mb={2}>
        {t("preroute.help")}
      </Text>
      <VStack align="stretch" spacing={2}>
        <Select size="sm" borderRadius="10px" value={exit} onChange={(e) => setExit(e.target.value)}>
          <option value="">{t("preroute.none")}</option>
          {data!.servers
            .filter((s) => s.key !== nodeKey)
            .map((s) => (
              <option key={s.key} value={s.key}>
                {t("preroute.to", { name: s.name })}
              </option>
            ))}
        </Select>
        {exit && (
          <>
            <Select size="sm" borderRadius="10px" value={kind} onChange={(e) => setKind(e.target.value as any)}>
              <option value="wg">{t("preroute.kindWg")}</option>
              <option value="awg">{t("preroute.kindAwg")}</option>
            </Select>
            <Checkbox size="sm" isChecked={all} onChange={(e) => setAll(e.target.checked)}>
              <Text fontSize="sm">{t("preroute.allPorts")}</Text>
            </Checkbox>
            {!all && (
              <Input
                size="sm"
                borderRadius="10px"
                fontFamily="mono"
                placeholder="443, 8443/udp, 2053/tcp"
                value={ports}
                onChange={(e) => setPorts(e.target.value)}
              />
            )}
          </>
        )}
        {l && (
          <Text fontSize="xs" color="gray.500">
            {t("preroute.forwarding", { ports: showPorts(l.forwarding) || "—", address: l.relay_address })}
          </Text>
        )}
        {l && (l.relay_agent === false || l.exit_agent === false) && (
          <Text fontSize="xs" color="orange.400">
            {t("preroute.needAgent")} {l.relay_agent === false ? l.relay_error : l.exit_error}
          </Text>
        )}
        <HStack>
          {dirty && (
            <Button size="xs" colorScheme="primary" isLoading={busy} onClick={save}>
              {t("preroute.apply")}
            </Button>
          )}
          {l && !dirty && (
            <Tooltip label={t("preroute.hostsHelp")} hasArrow>
              <Button size="xs" variant="outline" onClick={makeHosts}>
                {t("preroute.makeHosts")}
              </Button>
            </Tooltip>
          )}
        </HStack>
      </VStack>
    </Box>
  );
};
