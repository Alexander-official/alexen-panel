import { Box, Button, Text, VStack } from "@chakra-ui/react";
import { FC, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRouteError } from "react-router-dom";
import { isChunkError, reloadForUpdate } from "utils/lazyLoad";
import { Login } from "./Login";

// What the panel shows when a page fails: the sign-in only when the session
// really ended; a new version is loaded by itself; anything else can be retried.
export const RouteError: FC = () => {
  const error: any = useRouteError();
  const { t } = useTranslation();
  const status = error?.status ?? error?.response?.status ?? error?.statusCode;
  const chunk = isChunkError(error);
  useEffect(() => {
    if (chunk) reloadForUpdate();
  }, [chunk]);
  if (status === 401 || status === 403) return <Login />;
  return (
    <VStack minH="100vh" justifyContent="center" spacing={4} p={6} textAlign="center">
      <Text fontSize="lg" fontWeight="semibold">
        {chunk ? t("errors.updated") : t("errors.page")}
      </Text>
      <Text fontSize="sm" color="gray.500" maxW="420px">
        {chunk ? t("errors.updatedHelp") : String(error?.message || "").slice(0, 200)}
      </Text>
      <Box>
        <Button colorScheme="primary" onClick={() => window.location.reload()}>
          {t("errors.reload")}
        </Button>
      </Box>
    </VStack>
  );
};
