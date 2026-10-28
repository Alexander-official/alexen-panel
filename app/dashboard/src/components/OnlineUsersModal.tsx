import {
  Badge,
  Button,
  HStack,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from "@chakra-ui/react";
import { useDashboard } from "contexts/DashboardContext";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import { User } from "types/User";

export type OnlineUser = {
  username: string;
  admin: string | null;
  ip_count: number;
  device_count: number;
  ip_limit: number | null;
  blocked_ips: number;
  external: number;
  external_panels: string[];
};

type OnlineUsersModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const OnlineUsersModal: FC<OnlineUsersModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const [sort, setSort] = useState<"ip" | "devices" | "external">("ip");
  const { data } = useQuery<{ users: OnlineUser[]; external_online_users: number }>({
    queryKey: ["online-modal", sort],
    queryFn: () => fetch(`/online?sort=${sort}&limit=100`),
    enabled: isOpen,
    refetchInterval: isOpen ? 5000 : false,
  });
  const users = data?.users ?? [];
  const externalOnline = data?.external_online_users ?? 0;

  const openUser = (username: string) => {
    fetch<User>(`/user/${username}`).then((user) => {
      onClose();
      useDashboard.getState().onEditingUser(user);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay bg="blackAlpha.300" />
      <ModalContent mx="3">
        <ModalHeader pt={6}>
          <HStack justifyContent="space-between" pr={8}>
            <HStack spacing={2}>
              <Text fontWeight="semibold" fontSize="lg">
                {t("online.title")}
              </Text>
              {externalOnline > 0 && (
                <Badge colorScheme="purple" title={t("online.externalHint")}>
                  🌐 {externalOnline}
                </Badge>
              )}
            </HStack>
            <HStack spacing={1}>
              <Button
                size="xs"
                variant={sort === "ip" ? "solid" : "ghost"}
                onClick={() => setSort("ip")}
              >
                {t("online.sortByIp")}
              </Button>
              <Button
                size="xs"
                variant={sort === "devices" ? "solid" : "ghost"}
                onClick={() => setSort("devices")}
              >
                {t("online.sortByDevice")}
              </Button>
              <Button
                size="xs"
                variant={sort === "external" ? "solid" : "ghost"}
                onClick={() => setSort("external")}
              >
                {t("online.sortByExternal")}
              </Button>
            </HStack>
          </HStack>
        </ModalHeader>
        <ModalCloseButton mt={3} />
        <ModalBody pb={6}>
          {users.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              {t("online.empty")}
            </Text>
          ) : (
            <TableContainer>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>{t("username")}</Th>
                    <Th>{t("online.admin")}</Th>
                    <Th isNumeric>{t("online.ips")}</Th>
                    <Th isNumeric>{t("online.devices")}</Th>
                    <Th isNumeric>{t("online.external")}</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {users.map((user) => (
                    <Tr
                      key={user.username}
                      cursor="pointer"
                      _hover={{ bg: "gray.50", _dark: { bg: "gray.700" } }}
                      onClick={() => openUser(user.username)}
                    >
                      <Td>{user.username}</Td>
                      <Td>{user.admin ?? "-"}</Td>
                      <Td isNumeric>
                        <Badge
                          colorScheme={
                            user.blocked_ips > 0
                              ? "red"
                              : user.ip_count > 1
                              ? "orange"
                              : "green"
                          }
                        >
                          {user.ip_count}
                        </Badge>
                      </Td>
                      <Td isNumeric>{user.device_count}</Td>
                      <Td isNumeric>
                        {user.external > 0 ? (
                          <Badge
                            colorScheme="purple"
                            title={user.external_panels.join(", ")}
                          >
                            🌐 {user.external}
                          </Badge>
                        ) : (
                          <Text as="span" color="gray.400">
                            -
                          </Text>
                        )}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TableContainer>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};
