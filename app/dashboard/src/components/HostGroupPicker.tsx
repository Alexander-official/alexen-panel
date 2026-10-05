import { Box, Button, HStack, Text } from "@chakra-ui/react";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";

export const useGroupNames = () =>
  useQuery<string[]>({
    queryKey: "host-group-names",
    queryFn: () => fetch("/groups").then((d: any) => d.groups.map((g: any) => g.name)),
    refetchOnWindowFocus: false,
  });

const splitGroups = (v?: string | null) =>
  (v || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

// a host's groups ("a, b" in group_name) picked from the groups created in Group Settings
export const HostGroupPicker: FC<{ value?: string | null; onChange: (v: string | null) => void }> = ({ value, onChange }) => {
  const { t } = useTranslation();
  const { data: all } = useGroupNames();
  const selected = splitGroups(value);
  // keep groups the host already has even if they aren't in the list
  const names = [...(all || []), ...selected.filter((g) => !(all || []).includes(g))];
  return (
    <Box>
      <Text fontSize="xs" opacity={0.75} mb={1}>
        {t("hostsDialog.groups")}
      </Text>
      {names.length === 0 ? (
        <Text fontSize="xs" color="gray.500">
          {t("hostsDialog.noGroups")}
        </Text>
      ) : (
        <HStack spacing={1.5} flexWrap="wrap" rowGap={1.5}>
          {names.map((g) => {
            const on = selected.includes(g);
            return (
              <Button
                key={g}
                size="xs"
                borderRadius="full"
                colorScheme="primary"
                variant={on ? "solid" : "outline"}
                onClick={() => {
                  const next = on ? selected.filter((x) => x !== g) : [...selected, g];
                  onChange(next.length ? next.join(", ") : null);
                }}
              >
                {g}
              </Button>
            );
          })}
        </HStack>
      )}
    </Box>
  );
};
