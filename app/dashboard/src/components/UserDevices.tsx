import {
  Box,
  HStack,
  IconButton,
  Text,
  Tooltip,
  VStack,
  chakra,
} from "@chakra-ui/react";
import { TrashIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import { FC } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";

const DeleteIcon = chakra(TrashIcon, { baseStyle: { w: 4, h: 4 } });

type Device = {
  id: number;
  hwid: string;
  platform: string | null;
  os_version: string | null;
  device_model: string | null;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};

export const UserDevices: FC<{ username: string }> = ({ username }) => {
  const { t } = useTranslation();
  const { data, refetch } = useQuery<{
    devices: Device[];
    hwid_limit: number | null;
  }>({
    queryKey: ["user-devices", username],
    queryFn: () => fetch(`/user/${username}/devices`),
  });
  const devices = data?.devices ?? [];
  const removeDevice = (id: number) =>
    fetch(`/user/${username}/devices/${id}`, { method: "DELETE" }).then(() =>
      refetch()
    );

  return (
    <VStack alignItems="flex-start" w="full" spacing={2}>
      <Text fontSize="sm" fontWeight="medium">
        {t("devices.title")} ({devices.length}
        {data?.hwid_limit ? ` / ${data.hwid_limit}` : ""})
      </Text>
      {devices.length === 0 && (
        <Text fontSize="xs" color="gray.500">
          {t("devices.empty")}
        </Text>
      )}
      {devices.map((device) => (
        <Box
          key={device.id}
          w="full"
          borderWidth="1px"
          borderRadius="6px"
          px={3}
          py={2}
          _dark={{ borderColor: "gray.600" }}
        >
          <HStack justifyContent="space-between" alignItems="flex-start">
            <VStack alignItems="flex-start" spacing={0}>
              <Text fontSize="sm">
                {device.device_model || t("devices.unknownModel")}
                {device.platform &&
                  ` · ${device.platform} ${device.os_version ?? ""}`}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {device.user_agent}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {t("devices.lastSeen")}:{" "}
                {dayjs.utc(device.updated_at).local().format("YYYY-MM-DD HH:mm")}
              </Text>
            </VStack>
            <Tooltip label={t("devices.remove")}>
              <IconButton
                aria-label={t("devices.remove")}
                size="xs"
                variant="ghost"
                colorScheme="red"
                icon={<DeleteIcon />}
                onClick={() => removeDevice(device.id)}
              />
            </Tooltip>
          </HStack>
        </Box>
      ))}
    </VStack>
  );
};
