// What a page shows while its first data is on the way: the shape of the
// page (cards) shimmering, instead of a blank screen that looks broken.
import { Box, SimpleGrid, Skeleton, VStack } from "@chakra-ui/react";
import { FC } from "react";

const card = { borderRadius: "16px", startColor: "var(--tier-item)", endColor: "var(--tier-2)" } as const;

export const PageLoading: FC<{ stats?: number; rows?: number }> = ({ stats = 0, rows = 2 }) => (
  <VStack align="stretch" spacing={4} aria-busy="true" aria-label="loading">
    {stats > 0 && (
      <SimpleGrid columns={{ base: 1, sm: 2, lg: Math.min(stats, 3) }} spacing={4}>
        {Array.from({ length: stats }).map((_, i) => (
          <Skeleton key={i} h="96px" {...card} />
        ))}
      </SimpleGrid>
    )}
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton key={i} h={i === 0 ? "280px" : "160px"} {...card} />
    ))}
  </VStack>
);

export const CardLoading: FC<{ h?: string }> = ({ h = "160px" }) => (
  <Box>
    <Skeleton h={h} {...card} />
  </Box>
);
