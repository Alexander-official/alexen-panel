import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Box,
  Checkbox,
  Code,
  Spinner,
  Text,
  useToast,
} from "@chakra-ui/react";
import { FetchNodesQueryKey, useNodes } from "contexts/NodesContext";
import { FC, useEffect, useState } from "react";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import { serverMessage } from "utils/serverMessage";
import { Trans, useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "react-query";
import {
  generateErrorMessage,
  generateSuccessMessage,
} from "utils/toastHandler";
import { DeleteIcon, DeleteUserModalProps } from "./DeleteUserModal";
import { Icon } from "./Icon";

export const DeleteNodeModal: FC<DeleteUserModalProps> = ({
  deleteCallback,
}) => {
  const { deleteNode, deletingNode, setDeletingNode } = useNodes();
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const onClose = () => {
    setDeletingNode(null);
  };
  // also clean the server: containers, firewall rules, tunnels (app/routers/node.py uninstall)
  const { data: extras } = useQuery<Record<string, any>>({ queryKey: "nodes-extras", queryFn: () => fetch("/nodes/extras"), enabled: !!deletingNode });
  const hasLogin = !!(deletingNode && extras?.[String(deletingNode.id)]?.ssh?.saved);
  const [clean, setClean] = useState(true);
  const [cleaning, setCleaning] = useState(false);
  useEffect(() => setClean(true), [deletingNode?.id]);
  const remove = async () => {
    if (deletingNode && hasLogin && clean) {
      setCleaning(true);
      try {
        await fetch(`/node/${deletingNode.id}/uninstall`, { method: "POST" });
        toast({ status: "success", title: t("deleteNode.cleaned"), position: "top", duration: 3000 });
      } catch (e: any) {
        setCleaning(false);
        // the server couldn't be cleaned: say why and keep the node, the user decides
        toast({ status: "error", title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic"), description: t("deleteNode.cleanFailed"), position: "top", duration: 9000 });
        return;
      }
      setCleaning(false);
    }
    onDelete();
  };

  const { isLoading, mutate: onDelete } = useMutation(deleteNode, {
    onSuccess: () => {
      generateSuccessMessage(
        t("deleteNode.deleteSuccess", {name: deletingNode && deletingNode.name}),
        toast
      );
      setDeletingNode(null);
      queryClient.invalidateQueries(FetchNodesQueryKey);
      deleteCallback && deleteCallback();
    },
    onError: (e) => {
      generateErrorMessage(e, toast);
    },
  });

  return (
    <Modal isCentered isOpen={!!deletingNode} onClose={onClose} size="sm">
      <ModalOverlay bg="blackAlpha.300" />
      <ModalContent mx="3">
        <ModalHeader pt={6}>
          <Icon color="red">
            <DeleteIcon />
          </Icon>
        </ModalHeader>
        <ModalCloseButton mt={3} />
        <ModalBody>
          <Text fontWeight="semibold" fontSize="lg">
            {t("deleteNode.title")}
          </Text>
          {deletingNode && (
            <Text
              mt={1}
              fontSize="sm"
              _dark={{ color: "gray.400" }}
              color="gray.600"
            >
              <Trans components={{ b: <b /> }}>
                {t("deleteNode.prompt", {name: deletingNode.name})}
              </Trans>
            </Text>
          )}
          {deletingNode && (
            <Box mt={4} p={3} borderRadius="12px" bg="var(--tier-2)">
              <Checkbox colorScheme="red" isChecked={hasLogin && clean} isDisabled={!hasLogin} onChange={(e) => setClean(e.target.checked)}>
                <Text fontSize="sm">{t("deleteNode.clean")}</Text>
              </Checkbox>
              <Text fontSize="xs" color="gray.500" mt={1.5}>
                {hasLogin ? t("deleteNode.cleanHelp") : t("deleteNode.cleanManual")}
              </Text>
              {!hasLogin && (
                <Code fontSize="2xs" mt={2} p={2} display="block" whiteSpace="pre-wrap" wordBreak="break-all">
                  {`curl -fsSL ${window.location.origin}/vpn-agent/uninstall.sh | sudo bash`}
                </Code>
              )}
            </Box>
          )}
        </ModalBody>
        <ModalFooter display="flex">
          <Button size="sm" onClick={onClose} mr={3} w="full" variant="outline">
            {t("cancel")}
          </Button>
          <Button
            size="sm"
            w="full"
            colorScheme="red"
            onClick={remove}
            isDisabled={cleaning || isLoading}
            leftIcon={isLoading || cleaning ? <Spinner size="xs" /> : undefined}
          >
            {t("delete")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
