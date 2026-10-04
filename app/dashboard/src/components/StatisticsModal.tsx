import {
  Box,
  Card,
  Divider,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Progress,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useDashboard } from "contexts/DashboardContext";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import { formatBytes } from "utils/formatByte";

type Overview = {
  total_users: number;
  active_users: number;
  total_traffic: number;
  inbounds: { inbound_tag: string; protocol: string | null; used_traffic: number }[];
  top_users: { username: string; admin: string | null; used_traffic: number }[];
};

const Stat: FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <Card p={4} borderWidth="1px" _dark={{ borderColor: "gray.600" }}>
    <Text fontSize="xs" color="gray.500">
      {label}
    </Text>
    <Text fontSize="2xl" fontWeight="semibold">
      {value}
    </Text>
  </Card>
);

export const StatisticsModal: FC = () => {
  const { isShowingStats, onShowingStats } = useDashboard();
  const { t } = useTranslation();
  const { data } = useQuery<Overview>({
    queryKey: "stats-overview",
    queryFn: () => fetch("/stats/overview"),
    enabled: isShowingStats,
    refetchInterval: isShowingStats ? 10000 : false,
  });

  const maxInbound = Math.max(1, ...(data?.inbounds || []).map((i) => i.used_traffic));

  return (
    <Modal isOpen={isShowingStats} onClose={() => onShowingStats(false)} size="2xl">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent mx="3">
        <ModalHeader pt={6}>
          <Text fontWeight="semibold" fontSize="lg">
            {t("stats.title")}
          </Text>
        </ModalHeader>
        <ModalCloseButton mt={3} />
        <ModalBody pb={6}>
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3} mb={5}>
            <Stat label={t("stats.totalUsers")} value={data?.total_users ?? "—"} />
            <Stat label={t("stats.activeUsers")} value={data?.active_users ?? "—"} />
            <Stat
              label={t("stats.totalTraffic")}
              value={data ? (formatBytes(data.total_traffic) as string) : "—"}
            />
          </SimpleGrid>

          <Text fontSize="sm" fontWeight="medium" mb={2}>
            {t("stats.byInbound")}
          </Text>
          <VStack align="stretch" spacing={2} mb={5}>
            {(data?.inbounds || []).map((i) => (
              <Box key={i.inbound_tag}>
                <HStack justifyContent="space-between" mb={1}>
                  <Text fontSize="xs">
                    {i.inbound_tag}
                    {i.protocol ? ` · ${i.protocol}` : ""}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {formatBytes(i.used_traffic)}
                  </Text>
                </HStack>
                <Progress
                  value={(i.used_traffic / maxInbound) * 100}
                  size="sm"
                  borderRadius="full"
                  colorScheme="primary"
                />
              </Box>
            ))}
            {data && data.inbounds.length === 0 && (
              <Text fontSize="xs" color="gray.500">
                {t("stats.noData")}
              </Text>
            )}
          </VStack>

          <Divider mb={4} />

          <Text fontSize="sm" fontWeight="medium" mb={2}>
            {t("stats.topUsers")}
          </Text>
          <VStack align="stretch" spacing={1}>
            {(data?.top_users || []).map((u, idx) => (
              <HStack key={u.username} justifyContent="space-between">
                <Text fontSize="sm">
                  {idx + 1}. {u.username}
                  {u.admin ? (
                    <Text as="span" fontSize="xs" color="gray.500">
                      {" "}
                      · {u.admin}
                    </Text>
                  ) : null}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {formatBytes(u.used_traffic)}
                </Text>
              </HStack>
            ))}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
