import {
  Badge,
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
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { fetch } from "service/http";
import { User } from "types/User";

export type OnlineUser = {
  username: string;
  admin: string | null;
  ip_count: number;
  ip_limit: number | null;
  blocked_ips: number;
};

type OnlineUsersModalProps = {
  isOpen: boolean;
  onClose: () => void;
  users: OnlineUser[];
};

export const OnlineUsersModal: FC<OnlineUsersModalProps> = ({
  isOpen,
  onClose,
  users,
}) => {
  const { t } = useTranslation();
  const openUser = (username: string) => {
    fetch<User>(`/user/${username}`).then((user) => {
      onClose();
      useDashboard.getState().onEditingUser(user);
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent mx="3">
        <ModalHeader pt={6}>
          <Text fontWeight="semibold" fontSize="lg">
            {t("online.title")}
          </Text>
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
                          {user.ip_limit ? ` / ${user.ip_limit}` : ""}
                        </Badge>
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
