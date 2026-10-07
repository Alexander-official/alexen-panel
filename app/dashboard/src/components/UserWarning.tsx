// A warning the sudo admin puts on a user: the sudo admin edits it, the
// user's admin sees it (users list and the user window).
import { Box, Button, HStack, Icon, Text, Textarea, Tooltip, useToast } from "@chakra-ui/react";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { FC, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "react-query";
import { useDashboard } from "contexts/DashboardContext";
import { fetch } from "service/http";

export const WarningMark: FC<{ text?: string | null }> = ({ text }) =>
  text ? (
    <Tooltip label={text} hasArrow placement="top">
      <Box as="span" display="inline-flex" color="red.400" ml={1} onClick={(e) => e.stopPropagation()}>
        <Icon as={ExclamationTriangleIcon} boxSize="15px" />
      </Box>
    </Tooltip>
  ) : null;

export const UserWarningBox: FC<{ username: string; warning?: string | null; editable: boolean }> = ({ username, warning, editable }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [text, setText] = useState(warning || "");
  const [busy, setBusy] = useState(false);
  useEffect(() => setText(warning || ""), [warning, username]);
  if (!editable && !warning) return null;
  const save = (value: string) => {
    setBusy(true);
    fetch(`/user/${encodeURIComponent(username)}/warning`, { method: "PUT", body: { text: value } })
      .then(() => {
        toast({ status: "success", title: value ? t("warning.saved") : t("warning.removed"), duration: 1500, position: "top" });
        useDashboard.getState().refetchUsers();
        queryClient.invalidateQueries("notify-counts");
      })
      .finally(() => setBusy(false));
  };
  return (
    <Box p={3} borderRadius="12px" borderWidth="1px" borderColor={warning ? "red.300" : "var(--tier-line)"} bg={warning ? "color-mix(in srgb, var(--chakra-colors-red-500) 9%, var(--tier-2))" : "var(--tier-2)"} w="full">
      <HStack spacing={2} mb={editable ? 2 : 0} alignItems="flex-start">
        <Icon as={ExclamationTriangleIcon} boxSize="16px" color="red.400" mt={0.5} />
        <Box flex="1">
          <Text fontSize="sm" fontWeight="semibold">
            {t("warning.title")}
          </Text>
          {!editable && <Text fontSize="sm" whiteSpace="pre-wrap">{warning}</Text>}
          {editable && (
            <Text fontSize="xs" color="gray.500">
              {t("warning.help")}
            </Text>
          )}
        </Box>
      </HStack>
      {editable && (
        <>
          <Textarea size="sm" rows={2} value={text} maxLength={500} placeholder={t("warning.placeholder")} onChange={(e) => setText(e.target.value)} />
          <HStack justifyContent="flex-end" mt={2} spacing={2}>
            {warning && (
              <Button size="xs" variant="ghost" colorScheme="red" isLoading={busy} onClick={() => save("")}>
                {t("warning.remove")}
              </Button>
            )}
            <Button size="xs" colorScheme="primary" isLoading={busy} isDisabled={text.trim() === (warning || "")} onClick={() => save(text.trim())}>
              {t("warning.save")}
            </Button>
          </HStack>
        </>
      )}
    </Box>
  );
};
