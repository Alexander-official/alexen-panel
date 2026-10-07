// Messages between the sudo admins and each admin: the sudo admin picks an
// admin on the left, an admin only has its own conversation.
import { Badge, Box, Button, HStack, Text, Textarea, VStack } from "@chakra-ui/react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";
import dayjs from "dayjs";
import useGetUser from "hooks/useGetUser";
import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";

type Thread = { thread: string; unread: number; last: null | { text: string; time: number; sender: string } };
type Msg = { id: number; time: number; sender: string; from_sudo: boolean; text: string; read: boolean };

const Chat: FC<{ thread: string; mine: (m: Msg) => boolean }> = ({ thread, mine }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const last = useRef(0);
  const load = (reset = false) =>
    fetch(`/messages/${encodeURIComponent(thread)}?after=${reset ? 0 : last.current}`).then((list: Msg[]) => {
      if (list.length) last.current = list[list.length - 1].id;
      setMsgs((old) => (reset ? list : [...old, ...list.filter((m) => !old.some((o) => o.id === m.id))]));
      if (list.length) queryClient.invalidateQueries("notify-counts");
    });
  useEffect(() => {
    last.current = 0;
    setMsgs([]);
    load(true);
    const h = setInterval(() => load(), 6000);
    return () => clearInterval(h);
  }, [thread]);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [msgs.length]);
  const send = () => {
    if (!text.trim()) return;
    setBusy(true);
    fetch(`/messages/${encodeURIComponent(thread)}`, { method: "POST", body: { text } })
      .then(() => {
        setText("");
        load();
        queryClient.invalidateQueries("message-threads");
      })
      .finally(() => setBusy(false));
  };
  let day = "";
  return (
    <VStack align="stretch" spacing={0} h={{ base: "calc(100dvh - 210px)", md: "calc(100dvh - 190px)" }} minH="360px">
      <Box ref={box} flex="1" overflowY="auto" p={3} bg="var(--tier-2)" borderRadius="14px">
        {!msgs.length && (
          <Text fontSize="sm" color="gray.500" textAlign="center" py={10}>
            {t("messages.empty")}
          </Text>
        )}
        {msgs.map((m) => {
          const d = dayjs.unix(m.time).format("D MMMM YYYY");
          const showDay = d !== day;
          day = d;
          const me = mine(m);
          return (
            <Box key={m.id}>
              {showDay && (
                <Text fontSize="2xs" color="gray.500" textAlign="center" my={2}>
                  {d}
                </Text>
              )}
              <HStack justifyContent={me ? "flex-end" : "flex-start"} mb={1.5}>
                <Box
                  maxW="78%"
                  px={3}
                  py={2}
                  borderRadius="14px"
                  borderBottomRightRadius={me ? "4px" : "14px"}
                  borderBottomLeftRadius={me ? "14px" : "4px"}
                  bg={me ? "primary.500" : "var(--tier-item)"}
                  color={me ? "white" : undefined}
                >
                  {!me && (
                    <Text fontSize="2xs" fontWeight="semibold" opacity={0.75}>
                      {m.sender}
                    </Text>
                  )}
                  <Text fontSize="sm" whiteSpace="pre-wrap" wordBreak="break-word">
                    {m.text}
                  </Text>
                  <Text fontSize="2xs" opacity={0.7} textAlign="right">
                    {dayjs.unix(m.time).format("HH:mm")}
                    {me ? (m.read ? " ✓✓" : " ✓") : ""}
                  </Text>
                </Box>
              </HStack>
            </Box>
          );
        })}
      </Box>
      <HStack pt={2} alignItems="flex-end">
        <Textarea
          rows={2}
          resize="none"
          value={text}
          placeholder={t("messages.placeholder")}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <Button colorScheme="primary" isLoading={busy} onClick={send} leftIcon={<PaperAirplaneIcon width={16} />} flexShrink={0}>
          {t("messages.send")}
        </Button>
      </HStack>
    </VStack>
  );
};

export const MessagesPage: FC = () => {
  const { t } = useTranslation();
  const { userData } = useGetUser();
  const isSudo = !!userData.is_sudo;
  const { data: threads } = useQuery<Thread[]>({ queryKey: "message-threads", queryFn: () => fetch("/messages/threads"), refetchInterval: 15000 });
  const [open, setOpen] = useState("");
  useEffect(() => {
    if (!open && threads?.length) setOpen(isSudo ? "" : threads[0].thread);
  }, [threads]);
  const mine = (m: Msg) => (isSudo ? m.from_sudo : !m.from_sudo);
  if (!threads) return null;
  if (!isSudo) return threads[0] ? <Chat thread={threads[0].thread} mine={mine} /> : null;
  return (
    <HStack align="stretch" spacing={4}>
      <VStack align="stretch" spacing={1.5} w={{ base: open ? "0" : "full", md: "260px" }} display={{ base: open ? "none" : "flex", md: "flex" }} flexShrink={0}>
        {!threads.length && (
          <Text fontSize="sm" color="gray.500">
            {t("messages.noAdmins")}
          </Text>
        )}
        {threads.map((th) => (
          <Box
            key={th.thread}
            as="button"
            textAlign="left"
            p={3}
            borderRadius="12px"
            bg={open === th.thread ? "color-mix(in srgb, var(--chakra-colors-primary-500) 14%, var(--tier-item))" : "var(--tier-item)"}
            borderWidth="1px"
            borderColor={open === th.thread ? "primary.400" : "var(--tier-line)"}
            onClick={() => setOpen(th.thread)}
          >
            <HStack justifyContent="space-between">
              <Text fontWeight="semibold" fontSize="sm">
                {th.thread}
              </Text>
              {th.unread > 0 && <Badge colorScheme="red">{th.unread}</Badge>}
            </HStack>
            <Text fontSize="xs" color="gray.500" noOfLines={1}>
              {th.last ? `${th.last.sender}: ${th.last.text}` : t("messages.noMessages")}
            </Text>
          </Box>
        ))}
      </VStack>
      <Box flex="1" minW={0} display={{ base: open ? "block" : "none", md: "block" }}>
        {open ? (
          <>
            <HStack mb={2} display={{ base: "flex", md: "none" }}>
              <Button size="xs" variant="ghost" onClick={() => setOpen("")}>
                ← {t("messages.back")}
              </Button>
              <Text fontWeight="semibold">{open}</Text>
            </HStack>
            <Chat thread={open} mine={mine} />
          </>
        ) : (
          <Text fontSize="sm" color="gray.500" pt={10} textAlign="center">
            {t("messages.pick")}
          </Text>
        )}
      </Box>
    </HStack>
  );
};
