import {
  Box,
  BoxProps,
  Card,
  chakra,
  HStack,
  SimpleGrid,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import {
  ChartBarIcon,
  ChartPieIcon,
  SignalIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useDashboard } from "contexts/DashboardContext";
import { FC, PropsWithChildren, ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import { formatBytes, numberWithCommas } from "utils/formatByte";
import { OnlineUsersModal } from "./OnlineUsersModal";

const TotalUsersIcon = chakra(UsersIcon, {
  baseStyle: {
    w: 5,
    h: 5,
    position: "relative",
    zIndex: "2",
  },
});

const NetworkIcon = chakra(ChartBarIcon, {
  baseStyle: {
    w: 5,
    h: 5,
    position: "relative",
    zIndex: "2",
  },
});

const OnlineIcon = chakra(SignalIcon, {
  baseStyle: {
    w: 5,
    h: 5,
    position: "relative",
    zIndex: "2",
  },
});

const MemoryIcon = chakra(ChartPieIcon, {
  baseStyle: {
    w: 5,
    h: 5,
    position: "relative",
    zIndex: "2",
  },
});

type StatisticCardProps = {
  title: string;
  content: ReactNode;
  icon: ReactElement;
  onClick?: () => void;
};

const StatisticCard: FC<PropsWithChildren<StatisticCardProps>> = ({
  title,
  content,
  icon,
  onClick,
}) => {
  return (
    <Card
      onClick={onClick}
      cursor={onClick ? "pointer" : undefined}
      p={{ base: 3, md: 6 }}
      borderWidth="1px"
      borderColor="light-border"
      bg="var(--app-surface-2)"
      _dark={{ borderColor: "gray.600", bg: "gray.750" }}
      borderStyle="solid"
      boxShadow="none"
      borderRadius="12px"
      width="full"
      display="flex"
      justifyContent="space-between"
      flexDirection={{ base: "column", md: "row" }}
      alignItems={{ base: "flex-start", md: "stretch" }}
      gap={{ base: 1, md: 0 }}
      minW={0}
    >
      <HStack alignItems="center" columnGap={{ base: 3, md: 4 }} minW={0}>
        <Box
          p="2"
          position="relative"
          color="white"
          _before={{
            content: `""`,
            position: "absolute",
            top: 0,
            left: 0,
            bg: "primary.400",
            display: "block",
            w: "full",
            h: "full",
            borderRadius: "5px",
            opacity: ".5",
            z: "1",
          }}
          _after={{
            content: `""`,
            position: "absolute",
            top: "-5px",
            left: "-5px",
            bg: "primary.400",
            display: "block",
            w: "calc(100% + 10px)",
            h: "calc(100% + 10px)",
            borderRadius: "8px",
            opacity: ".4",
            z: "1",
          }}
        >
          {icon}
        </Box>
        <Text
          color="gray.600"
          _dark={{
            color: "gray.300",
          }}
          fontWeight="medium"
          textTransform="capitalize"
          fontSize={{ base: "xs", md: "sm" }}
          isTruncated
        >
          {title}
        </Text>
      </HStack>
      <Box fontSize={{ base: "xl", md: "3xl" }} fontWeight="semibold" mt={{ base: 0, md: 2 }}>
        {content}
      </Box>
    </Card>
  );
};
export const StatisticsQueryKey = "statistics-query-key";
export const Statistics: FC<BoxProps> = (props) => {
  const { version } = useDashboard();
  const { data: systemData } = useQuery({
    queryKey: StatisticsQueryKey,
    queryFn: () => fetch("/system"),
    refetchInterval: 10000,
    onSuccess: ({ version: currentVersion }) => {
      if (version !== currentVersion)
        useDashboard.setState({ version: currentVersion });
    },
  });
  const { data: onlineData } = useQuery<{
    online_users: number;
    online_ips: number;
    users: any[];
  }>({
    queryKey: "online-query-key",
    queryFn: () => fetch("/online"),
    refetchInterval: 10000,
  });
  const onlineModal = useDisclosure();
  const { t } = useTranslation();
  return (
    <SimpleGrid
      columns={{ base: 2, lg: 4 }}
      spacing={{ base: 2, md: 4 }}
      {...props}
    >
      <StatisticCard
        title={t("activeUsers")}
        content={
          systemData && (
            <HStack alignItems="flex-end" spacing={1} flexWrap="wrap">
              <Text>{numberWithCommas(systemData.users_active)}</Text>
              <Text
                fontWeight="normal"
                fontSize={{ base: "xs", md: "lg" }}
                as="span"
                display="inline-block"
                pb={{ base: "3px", md: "5px" }}
              >
                / {numberWithCommas(systemData.total_user)}
              </Text>
            </HStack>
          )
        }
        icon={<TotalUsersIcon />}
      />
      <StatisticCard
        title={t("dataUsage")}
        content={
          systemData && (
            <HStack alignItems="flex-end" spacing={1} flexWrap="wrap">
              <Text>
                {formatBytes(
                  systemData.incoming_bandwidth + systemData.outgoing_bandwidth
                )}
              </Text>
              {systemData.traffic_limit ? (
                <Text
                  fontWeight="normal"
                  fontSize={{ base: "xs", md: "lg" }}
                  as="span"
                  display="inline-block"
                  pb={{ base: "3px", md: "5px" }}
                >
                  / {formatBytes(systemData.traffic_limit)}
                </Text>
              ) : null}
            </HStack>
          )
        }
        icon={<NetworkIcon />}
      />
      <StatisticCard
        title={t("online.title")}
        onClick={onlineModal.onOpen}
        content={
          onlineData && (
            <HStack alignItems="flex-end" spacing={1} flexWrap="wrap">
              <Text>{numberWithCommas(onlineData.online_users)}</Text>
            </HStack>
          )
        }
        icon={<OnlineIcon />}
      />
      <StatisticCard
        title={t("memoryUsage")}
        content={
          systemData && (
            <HStack alignItems="flex-end" spacing={1} flexWrap="wrap">
              <Text>{formatBytes(systemData.mem_used, 1, true)[0]}</Text>
              <Text
                fontWeight="normal"
                fontSize={{ base: "xs", md: "lg" }}
                as="span"
                display="inline-block"
                pb={{ base: "3px", md: "5px" }}
              >
                {formatBytes(systemData.mem_used, 1, true)[1]} /{" "}
                {formatBytes(systemData.mem_total, 1)}
              </Text>
            </HStack>
          )
        }
        icon={<MemoryIcon />}
      />
      <OnlineUsersModal
        isOpen={onlineModal.isOpen}
        onClose={onlineModal.onClose}
      />
    </SimpleGrid>
  );
};
