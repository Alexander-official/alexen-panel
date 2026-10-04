import {
  Box,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Button,
  HStack,
  Text,
  VStack,
  useToast,
} from "@chakra-ui/react";
import { useDashboard } from "contexts/DashboardContext";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetch } from "service/http";

type Host = { remark: string; group_name?: string | null; [k: string]: any };
type Hosts = Record<string, Host[]>;

export const GroupSettingsModal: FC = () => {
  const { isManagingGroups, onManagingGroups } = useDashboard();
  const { t } = useTranslation();
  const toast = useToast();
  const [hosts, setHosts] = useState<Hosts>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isManagingGroups) {
      fetch("/hosts").then((data: Hosts) => setHosts(data));
    }
  }, [isManagingGroups]);

  const setGroup = (tag: string, idx: number, value: string) => {
    setHosts((prev) => {
      const copy: Hosts = { ...prev, [tag]: [...prev[tag]] };
      copy[tag][idx] = { ...copy[tag][idx], group_name: value };
      return copy;
    });
  };

  const save = () => {
    setLoading(true);
    fetch("/hosts", { method: "PUT", body: hosts })
      .then(() => {
        toast({ status: "success", title: t("admins.saved"), duration: 2000 });
        onManagingGroups(false);
      })
      .catch(() =>
        toast({ status: "error", title: t("admins.error"), duration: 3000 })
      )
      .finally(() => setLoading(false));
  };

  const groupsInUse = Array.from(
    new Set(
      Object.values(hosts)
        .flat()
        .map((h) => (h.group_name || "").trim())
        .filter(Boolean)
    )
  );

  return (
    <Modal isOpen={isManagingGroups} onClose={() => onManagingGroups(false)} size="2xl">
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent mx="3">
        <ModalHeader pt={6}>
          <Text fontWeight="semibold" fontSize="lg">
            {t("header.groupSettings")}
          </Text>
          <Text fontSize="xs" color="gray.500" fontWeight="normal">
            {t("groups.help")}
          </Text>
          {groupsInUse.length > 0 && (
            <Text fontSize="xs" color="gray.500" fontWeight="normal" mt={1}>
              {t("groups.inUse")}: {groupsInUse.join(", ")}
            </Text>
          )}
        </ModalHeader>
        <ModalCloseButton mt={3} />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            {Object.entries(hosts).map(([tag, list]) => (
              <Box key={tag}>
                <Text fontSize="sm" fontWeight="medium" mb={1}>
                  {tag}
                </Text>
                <VStack align="stretch" spacing={2}>
                  {list.map((host, idx) => (
                    <HStack key={idx}>
                      <Text fontSize="sm" flex={1} isTruncated>
                        {host.remark}
                      </Text>
                      <Input
                        size="sm"
                        maxW="220px"
                        placeholder={t("groups.noGroup")}
                        value={host.group_name || ""}
                        list="alexen-groups"
                        onChange={(e) => setGroup(tag, idx, e.target.value)}
                      />
                    </HStack>
                  ))}
                </VStack>
              </Box>
            ))}
            <datalist id="alexen-groups">
              {groupsInUse.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={() => onManagingGroups(false)}>
            {t("cancel")}
          </Button>
          <Button colorScheme="primary" isLoading={loading} onClick={save}>
            {t("admins.save")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
