import { Box } from "@chakra-ui/react";
import { FC, PropsWithChildren } from "react";

export type IconType = {
  color: string;
};

// the icon tile at the top of a window or page: one soft tinted square
// (it replaced the original double-square badge)
export const Icon: FC<PropsWithChildren<IconType>> = ({ children, color }) => {
  const c = color === "primary" ? "primary" : color;
  return (
    <Box
      w="40px"
      h="40px"
      flexShrink={0}
      borderRadius="12px"
      display="flex"
      alignItems="center"
      justifyContent="center"
      color={`${c}.500`}
      sx={{ background: `color-mix(in srgb, var(--chakra-colors-${c}-500) 13%, transparent)` }}
      _dark={{ color: `${c}.300` }}
    >
      {children}
    </Box>
  );
};
