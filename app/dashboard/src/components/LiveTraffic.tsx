// Live speeds from /traffic/live (bytes/s over the last ~30 s), and small
// icon + text labels used in tables instead of emojis.
import { HStack, Icon, Text, TextProps, Tooltip } from "@chakra-ui/react";
import { ArrowsUpDownIcon } from "@heroicons/react/24/outline";
import { ComponentType, FC, ReactNode } from "react";
import { useQuery } from "react-query";
import { fetch } from "service/http";

export type LiveTraffic = {
  window: number;
  users: Record<string, { rate: number; inbounds: Record<string, number> }>;
  inbounds?: Record<string, { rate: number; nodes: Record<string, number> }>;
  nodes?: Record<string, number>;
};

export const useLiveTraffic = (enabled = true) =>
  useQuery<LiveTraffic>({
    queryKey: "live-traffic",
    queryFn: () => fetch("/traffic/live"),
    refetchInterval: 10000,
    enabled,
  });

/** one user's live speed; the row re-renders only when that user's numbers change */
export const useUserLive = (username: string) =>
  useQuery<LiveTraffic, unknown, LiveTraffic["users"][string] | undefined>({
    queryKey: "live-traffic",
    queryFn: () => fetch("/traffic/live"),
    refetchInterval: 10000,
    select: (d) => d.users?.[username],
    notifyOnChangeProps: ["data"],
  }).data;

export const formatRate = (bytesPerSecond: number) => {
  const units = ["B/s", "KB/s", "MB/s", "GB/s"];
  let v = bytesPerSecond || 0;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
};

export const IconText: FC<
  { icon: ComponentType<any>; children: ReactNode; title?: string } & TextProps
> = ({ icon, children, title, ...props }) => (
  <HStack spacing={1} title={title} minW={0}>
    <Icon as={icon} boxSize="13px" flexShrink={0} opacity={0.8} />
    <Text as="span" isTruncated {...props}>
      {children}
    </Text>
  </HStack>
);

// "↕ 1.2 MB/s · <inbound>" for a user that is moving traffic right now
export const UserLiveTag: FC<{ username: string }> = ({ username }) => {
  const u = useUserLive(username);
  if (!u || u.rate < 1) return null;
  const tags = Object.entries(u.inbounds)
    .filter(([, r]) => r >= 1)
    .sort((a, b) => b[1] - a[1]);
  const detail = tags.map(([tag, r]) => `${tag}: ${formatRate(r)}`).join("\n");
  return (
    <Tooltip label={<Text whiteSpace="pre">{detail}</Text>} placement="top" hasArrow>
      <HStack spacing={1} fontSize="xs" color="primary.500" minW={0}>
        <Icon as={ArrowsUpDownIcon} boxSize="13px" flexShrink={0} />
        <Text as="span" whiteSpace="nowrap" fontWeight="medium">
          {formatRate(u.rate)}
        </Text>
        {tags[0] && (
          <Text as="span" color="gray.500" isTruncated maxW="160px">
            · {tags[0][0]}
            {tags.length > 1 ? ` +${tags.length - 1}` : ""}
          </Text>
        )}
      </HStack>
    </Tooltip>
  );
};
