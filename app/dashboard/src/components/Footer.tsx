import { BoxProps, HStack, Link, Text } from "@chakra-ui/react";
import { BRAND_NAME, BRAND_VENDOR, REPO_URL } from "constants/Project";
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
        <Link color="primary.400" href={REPO_URL}>
          {BRAND_NAME}
        </Link>
        {version ? ` (v${version})` : ""} · {BRAND_VENDOR}
      </Text>
    </HStack>
  );
};
