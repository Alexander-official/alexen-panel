import { Badge, Box, HStack, Text, VStack, Wrap } from "@chakra-ui/react";
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
  blocked: boolean;
};

export const UserOnlineIPs: FC<{ username: string }> = ({ username }) => {
  const { t } = useTranslation();
  const { data } = useQuery<{ ips: OnlineIP[]; ip_limit: number | null }>({
    queryKey: ["user-online-ips", username],
    queryFn: () => fetch(`/user/${username}/online-ips`),
    refetchInterval: 10000,
  });
  const ips = data?.ips ?? [];

  return (
    <VStack alignItems="flex-start" w="full" spacing={2}>
      <Text fontSize="sm" fontWeight="medium">
        {t("online.connectedIps")} ({ips.length}
        {data?.ip_limit ? ` / ${data.ip_limit}` : ""})
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
          borderRadius="6px"
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
            <Text fontSize="xs" color="gray.500">
              {dayjs.utc(ip.last_seen).local().format("HH:mm:ss")}
            </Text>
          </HStack>
          <Wrap mt={1} spacing={1}>
            {ip.nodes.map((node) => (
              <Badge key={node} colorScheme="purple" fontSize="2xs">
                {node}
              </Badge>
            ))}
            {ip.inbounds.map((inbound) => (
              <Badge key={inbound} colorScheme="blue" fontSize="2xs">
                {inbound}
              </Badge>
            ))}
          </Wrap>
        </Box>
      ))}
    </VStack>
  );
};
