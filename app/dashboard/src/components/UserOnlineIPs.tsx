import {
  Badge,
  Box,
  HStack,
  IconButton,
  Text,
  Tooltip,
  VStack,
  Wrap,
  chakra,
} from "@chakra-ui/react";
import { ArrowPathIcon, XMarkIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";

type OnlineIP = {
  ip: string;
  nodes: string[];
  inbounds: string[];
  last_seen: string;
  connected_seconds: number;
  provider: string | null;
  blocked: boolean;
};

const KickIcon = chakra(XMarkIcon, { baseStyle: { w: 4, h: 4 } });
const UnblockIcon = chakra(ArrowPathIcon, { baseStyle: { w: 4, h: 4 } });

export const UserOnlineIPs: FC<{ username: string }> = ({ username }) => {
  const { t } = useTranslation();
  const { data, refetch } = useQuery<{ ips: OnlineIP[]; ip_limit: number | null }>({
    queryKey: ["user-online-ips", username],
    queryFn: () => fetch(`/user/${username}/online-ips`),
    refetchInterval: 10000,
  });
  const ips = data?.ips ?? [];
  const kick = (ip: string) =>
    fetch(`/user/${username}/online-ips/${ip}`, { method: "DELETE" }).then(() =>
      refetch()
    );
  const unblock = (ip: string) =>
    fetch(`/user/${username}/online-ips/${ip}/unblock`, {
      method: "POST",
    }).then(() => refetch());

  return (
    <VStack alignItems="flex-start" w="full" spacing={2}>
      <Text fontSize="sm" fontWeight="medium">
        {t("online.connectedIps")} ({ips.length})
      </Text>
      {ips.length === 0 && (
        <Text fontSize="xs" color="gray.500">
          {t("online.notConnected")}
        </Text>
      )}
      {ips.map((ip) => (
        <Box
          key={ip.ip}
          w="full"
          borderWidth="1px"
          borderRadius="8px"
          px={3}
          py={2}
          _dark={{ borderColor: "gray.600" }}
        >
          <HStack justifyContent="space-between">
            <HStack>
              <Text fontSize="sm" fontFamily="mono">
                {ip.ip}
              </Text>
              {ip.blocked && (
                <Badge colorScheme="red" fontSize="2xs">
                  {t("online.blocked")}
                </Badge>
              )}
            </HStack>
            <HStack>
              <Text fontSize="xs" color="gray.500">
                {dayjs.utc(ip.last_seen).local().format("HH:mm:ss")}
              </Text>
              {ip.blocked ? (
                <Tooltip label={t("online.unblock")}>
                  <IconButton
                    aria-label="unblock"
                    size="xs"
                    variant="ghost"
                    colorScheme="green"
                    icon={<UnblockIcon />}
                    onClick={() => unblock(ip.ip)}
                  />
                </Tooltip>
              ) : (
                <Tooltip label={t("online.disconnect")}>
                  <IconButton
                    aria-label="disconnect"
                    size="xs"
                    variant="ghost"
                    colorScheme="red"
                    icon={<KickIcon />}
                    onClick={() => kick(ip.ip)}
                  />
                </Tooltip>
              )}
            </HStack>
          </HStack>
          {(ip.provider || ip.connected_seconds > 0) && (
            <Text fontSize="xs" color="gray.500">
              {ip.provider || ""}
              {ip.provider && ip.connected_seconds > 0 ? " · " : ""}
              {ip.connected_seconds > 0
                ? `${Math.floor(ip.connected_seconds / 60)}m ${
                    ip.connected_seconds % 60
                  }s`
                : ""}
            </Text>
          )}
          <Wrap mt={1} spacing={1}>
            {ip.nodes.map((node) => (
              <Badge key={node} colorScheme="purple" fontSize="2xs">
                {node}
              </Badge>
            ))}
            {ip.inbounds.map((inbound) => (
              <Badge key={inbound} colorScheme="primary" fontSize="2xs">
                {inbound}
              </Badge>
            ))}
          </Wrap>
        </Box>
      ))}
    </VStack>
  );
};
