import { BoxProps, HStack, Link, Text } from "@chakra-ui/react";
import { BRAND_NAME, BRAND_VENDOR, SUPPORT_TELEGRAM, SUPPORT_URL } from "constants/Project";
import { useDashboard, useDashboardPick } from "contexts/DashboardContext";
import { FC } from "react";

export const Footer: FC<BoxProps> = (props) => {
  const { version } = useDashboardPick("version");
  return (
    <HStack w="full" py="0" position="relative" {...props}>
      <Text
        display="inline-block"
        flexGrow={1}
        textAlign="center"
        color="gray.500"
        fontSize="xs"
      >
        {BRAND_NAME}
        {version ? ` v${version}` : ""} · {BRAND_VENDOR} ·{" "}
        <Link color="primary.400" href={SUPPORT_URL} isExternal>
          Telegram {SUPPORT_TELEGRAM}
        </Link>
      </Text>
    </HStack>
  );
};
