import { BoxProps, HStack, Link, Text } from "@chakra-ui/react";
import { useDashboardPick } from "contexts/DashboardContext";
import useBrand from "hooks/useBrand";
import { FC } from "react";

export const Footer: FC<BoxProps> = (props) => {
  const { version } = useDashboardPick("version");
  const brand = useBrand();
  return (
    <HStack w="full" py="0" position="relative" {...props}>
      <Text
        display="inline-block"
        flexGrow={1}
        textAlign="center"
        color="gray.500"
        fontSize="xs"
      >
        {brand.name}
        {version ? ` v${version}` : ""}
        {brand.vendor ? ` · ${brand.vendor}` : ""}
        {brand.support_url && brand.support_telegram ? (
          <>
            {" · "}
            <Link color="primary.400" href={brand.support_url} isExternal>
              Telegram {brand.support_telegram}
            </Link>
          </>
        ) : null}
      </Text>
    </HStack>
  );
};
