// Node extras: flag, VPS login (SSH), installing over SSH and the VPS's state
import {
  Badge,
  Box,
  Button,
  ButtonGroup,
  Checkbox,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Select,
  SimpleGrid,
  Spinner,
  Text,
  Textarea,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { CheckCircleIcon, CommandLineIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { FC, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "react-query";
import { fetch } from "service/http";
import { serverMessage } from "utils/serverMessage";
import { formatBytes } from "utils/formatByte";
import { COUNTRIES, countryName, flagEmoji } from "utils/flags";
import { create } from "zustand";

export type SSHDraft = {
  host: string;
  port: number;
  username: string;
  auth: "password" | "key";
  password: string;
  private_key: string;
  passphrase: string;
};
export const emptySSH = (): SSHDraft => ({ host: "", port: 22, username: "root", auth: "password", password: "", private_key: "", passphrase: "" });
export const sshFilled = (s: SSHDraft) => (s.auth === "password" ? !!s.password : !!s.private_key.trim());

type ExtraOut = { flag: string; ssh: null | { host: string; port: number; username: string; auth: "password" | "key"; saved: boolean } };
export type SysInfo = {
  cpu?: number;
  cores?: number;
  load?: number[];
  mem_total?: number;
  mem_used?: number;
  disk_total?: number;
  disk_used?: number;
  uptime?: number;
  rx_rate?: number;
  tx_rate?: number;
  error?: string;
};

export const useNodesExtras = () =>
  useQuery<Record<string, ExtraOut>>({ queryKey: "nodes-extras", queryFn: () => fetch("/nodes/extras"), staleTime: 30000 });
export const useNodesSystem = (enabled = true) =>
  useQuery<Record<string, SysInfo>>({ queryKey: "nodes-system", queryFn: () => fetch("/nodes/system"), refetchInterval: 10000, enabled });

export const saveNodeExtra = (nodeId: number | string, body: { flag?: string; ssh?: SSHDraft | null; forget_ssh?: boolean }) =>
  fetch(`/node/${nodeId}/extra`, { method: "PUT", body });

// ---------------- flag ----------------
export const FlagSelect: FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language || "en";
  const list = COUNTRIES.map((c) => ({ c, name: countryName(c, lang) }));
  const rest = list.slice(18).sort((a, b) => a.name.localeCompare(b.name, lang));
  return (
    <FormControl>
      <FormLabel fontSize="sm" mb={1}>
        {t("nodeExtra.flag")}{" "}
        <Text as="span" color="gray.500" fontWeight="normal" fontSize="xs">
          ({t("userDialog.optional")})
        </Text>
      </FormLabel>
      <Select size="sm" borderRadius="md" value={value || ""} onChange={(e) => onChange(e.target.value)}>
        <option value="">— {t("nodeExtra.noFlag")} —</option>
        {[...list.slice(0, 18), ...rest].map(({ c, name }) => (
          <option key={c} value={c}>
            {flagEmoji(c)} {name}
          </option>
        ))}
      </Select>
    </FormControl>
  );
};

// ---------------- SSH login ----------------
export const SSHFields: FC<{ value: SSHDraft; onChange: (v: SSHDraft) => void; addressHint?: string; saved?: boolean }> = ({ value, onChange, addressHint, saved }) => {
  const { t } = useTranslation();
  const set = (p: Partial<SSHDraft>) => onChange({ ...value, ...p });
  return (
    <VStack align="stretch" spacing={2}>
      <SimpleGrid columns={3} spacing={2}>
        <FormControl gridColumn="span 2">
          <FormLabel fontSize="xs" mb={0.5}>
            {t("nodeExtra.sshHost")}
          </FormLabel>
          <Input size="sm" borderRadius="md" value={value.host} placeholder={addressHint || "1.2.3.4"} onChange={(e) => set({ host: e.target.value.trim() })} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="xs" mb={0.5}>
            {t("nodeExtra.sshPort")}
          </FormLabel>
          <Input size="sm" borderRadius="md" type="number" value={value.port} onChange={(e) => set({ port: parseInt(e.target.value) || 22 })} />
        </FormControl>
      </SimpleGrid>
      <SimpleGrid columns={2} spacing={2}>
        <FormControl>
          <FormLabel fontSize="xs" mb={0.5}>
            {t("nodeExtra.sshUser")}
          </FormLabel>
          <Input size="sm" borderRadius="md" value={value.username} onChange={(e) => set({ username: e.target.value.trim() })} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="xs" mb={0.5}>
            {t("nodeExtra.sshAuth")}
          </FormLabel>
          <ButtonGroup size="sm" isAttached variant="outline" w="full">
            <Button flex={1} colorScheme="primary" variant={value.auth === "password" ? "solid" : "outline"} onClick={() => set({ auth: "password" })}>
              {t("nodeExtra.authPassword")}
            </Button>
            <Button flex={1} colorScheme="primary" variant={value.auth === "key" ? "solid" : "outline"} onClick={() => set({ auth: "key" })}>
              {t("nodeExtra.authKey")}
            </Button>
          </ButtonGroup>
        </FormControl>
      </SimpleGrid>
      {value.auth === "password" ? (
        <FormControl>
          <FormLabel fontSize="xs" mb={0.5}>
            {t("password")}
          </FormLabel>
          <Input size="sm" borderRadius="md" type="password" autoComplete="new-password" value={value.password} placeholder={saved ? t("nodeExtra.savedKeep") : ""} onChange={(e) => set({ password: e.target.value })} />
        </FormControl>
      ) : (
        <>
          <FormControl>
            <FormLabel fontSize="xs" mb={0.5}>
              {t("nodeExtra.privateKey")}
            </FormLabel>
            <Textarea size="sm" borderRadius="md" rows={4} fontFamily="mono" fontSize="2xs" value={value.private_key} placeholder={saved ? t("nodeExtra.savedKeep") : "-----BEGIN OPENSSH PRIVATE KEY-----"} onChange={(e) => set({ private_key: e.target.value })} />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="xs" mb={0.5}>
              {t("nodeExtra.passphrase")}
            </FormLabel>
            <Input size="sm" borderRadius="md" type="password" autoComplete="new-password" value={value.passphrase} placeholder={t("userDialog.optional")} onChange={(e) => set({ passphrase: e.target.value })} />
          </FormControl>
        </>
      )}
      {value.username !== "root" && (
        <Text fontSize="2xs" color="gray.500">
          {t("nodeExtra.sudoHint")}
        </Text>
      )}
    </VStack>
  );
};

// ---------------- install over SSH ----------------
type Job = { id: string; done: boolean; ok: boolean; error: string; step: string; lines: string[]; total: number };
export const useInstall = create<{ job: string | null; title: string; open: (job: string, title: string) => void; close: () => void }>((set) => ({
  job: null,
  title: "",
  open: (job, title) => set({ job, title }),
  close: () => set({ job: null }),
}));

export const startInstall = (nodeId: number | string, body: { ssh?: SSHDraft | null; save: boolean; node: boolean; agent: boolean }) =>
  fetch(`/node/${nodeId}/install`, { method: "POST", body }).then((r: { job: string }) => r.job);

export const InstallProgress: FC = () => {
  const { t } = useTranslation();
  const { job, title, close } = useInstall();
  const queryClient = useQueryClient();
  const [state, setState] = useState<Job | null>(null);
  const lines = useRef<string[]>([]);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!job) return;
    lines.current = [];
    setState(null);
    let stop = false;
    const tick = (): Promise<unknown> =>
      fetch(`/node-install/${job}?offset=${lines.current.length}`)
        .then((j: Job) => {
          lines.current = [...lines.current, ...j.lines];
          setState({ ...j, lines: lines.current });
          if (j.done) {
            queryClient.invalidateQueries("fetch-nodes-query-key");
            queryClient.invalidateQueries("nodes-system");
          } else if (!stop) setTimeout(tick, 1200);
        })
        .catch(() => !stop && setTimeout(tick, 2500));
    tick();
    return () => {
      stop = true;
    };
  }, [job]);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [state?.lines.length]);
  return (
    <Modal isOpen={!!job} onClose={() => state?.done && close()} size="2xl" closeOnOverlayClick={!!state?.done}>
      <ModalOverlay bg="blackAlpha.300" backdropFilter="blur(10px)" />
      <ModalContent mx={3}>
        <ModalHeader>
          <HStack spacing={2}>
            <CommandLineIcon width={20} height={20} />
            <Text fontSize="md">{t("nodeExtra.installing", { name: title })}</Text>
          </HStack>
        </ModalHeader>
        {state?.done && <ModalCloseButton />}
        <ModalBody>
          <HStack mb={2} spacing={2}>
            {!state?.done ? (
              <>
                <Spinner size="sm" color="primary.500" />
                <Text fontSize="sm">{state?.step || t("nodeExtra.connecting")}</Text>
              </>
            ) : state.ok ? (
              <>
                <CheckCircleIcon width={18} height={18} color="var(--chakra-colors-green-400)" />
                <Text fontSize="sm" color="green.400">
                  {t("nodeExtra.installDone")}
                </Text>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon width={18} height={18} color="var(--chakra-colors-red-400)" />
                <Text fontSize="sm" color="red.400">
                  {serverMessage(t, state.error)}
                </Text>
              </>
            )}
          </HStack>
          {!state?.done && <Progress size="xs" isIndeterminate colorScheme="primary" borderRadius="full" mb={2} />}
          <Box ref={box} bg="gray.900" color="gray.100" borderRadius="10px" p={3} h="320px" overflowY="auto" fontFamily="mono" fontSize="11px" whiteSpace="pre-wrap" wordBreak="break-all">
            {(state?.lines || []).map((l, i) => (
              <Text key={i} color={l.startsWith("==>") ? "cyan.300" : l.startsWith("!!") ? "red.300" : undefined}>
                {l}
              </Text>
            ))}
          </Box>
        </ModalBody>
        <ModalFooter>
          <Button size="sm" isDisabled={!state?.done} onClick={close}>
            {t("external.done")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

// what to install (node / agent) and the login: for an existing node
export const InstallBox: FC<{ nodeId: number; name: string; address: string; saved?: ExtraOut["ssh"] }> = ({ nodeId, name, address, saved }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [ssh, setSsh] = useState<SSHDraft>(() => ({ ...emptySSH(), ...(saved ? { host: saved.host, port: saved.port, username: saved.username, auth: saved.auth } : {}) }));
  const [what, setWhat] = useState({ node: false, agent: true, save: true });
  const [busy, setBusy] = useState(false);
  const openJob = useInstall((s) => s.open);
  const canUseSaved = !!saved?.saved && !sshFilled(ssh);
  const go = () => {
    setBusy(true);
    startInstall(nodeId, { ssh: sshFilled(ssh) || !saved ? ssh : { ...ssh, password: "", private_key: "" }, save: what.save, node: what.node, agent: what.agent })
      .then((job) => {
        openJob(job, name);
        queryClient.invalidateQueries("nodes-extras");
      })
      .catch((e: any) => toast({ status: "error", title: serverMessage(t, e?.response?._data?.detail) || t("errors.generic"), position: "top" }))
      .finally(() => setBusy(false));
  };
  return (
    <VStack align="stretch" spacing={3} w="full" p={3} borderRadius="lg" borderWidth="1px" borderColor="light-border" _dark={{ borderColor: "gray.600" }}>
      <HStack justifyContent="space-between">
        <Text fontSize="sm" fontWeight="medium">
          {t("nodeExtra.vpsAccess")}
        </Text>
        {saved?.saved && (
          <HStack spacing={1}>
            <Badge colorScheme="green" variant="subtle">
              {t("nodeExtra.loginSaved")}
            </Badge>
            <Button
              size="xs"
              variant="ghost"
              colorScheme="red"
              onClick={() => saveNodeExtra(nodeId, { forget_ssh: true }).then(() => queryClient.invalidateQueries("nodes-extras"))}
            >
              {t("nodeExtra.forget")}
            </Button>
          </HStack>
        )}
      </HStack>
      <Text fontSize="xs" color="gray.500">
        {t("nodeExtra.vpsAccessHelp")}
      </Text>
      <SSHFields value={ssh} onChange={setSsh} addressHint={address} saved={saved?.saved} />
      <VStack align="stretch" spacing={1}>
        <Checkbox size="sm" isChecked={what.node} onChange={(e) => setWhat({ ...what, node: e.target.checked })}>
          <Text fontSize="sm">{t("nodeExtra.installNode")}</Text>
        </Checkbox>
        <Checkbox size="sm" isChecked={what.agent} onChange={(e) => setWhat({ ...what, agent: e.target.checked })}>
          <Text fontSize="sm">{t("nodeExtra.installAgent")}</Text>
        </Checkbox>
        <Checkbox size="sm" isChecked={what.save} onChange={(e) => setWhat({ ...what, save: e.target.checked })}>
          <Text fontSize="sm">{t("nodeExtra.saveLogin")}</Text>
        </Checkbox>
      </VStack>
      <Button size="sm" colorScheme="primary" leftIcon={<CommandLineIcon width={16} height={16} />} isLoading={busy} isDisabled={(!sshFilled(ssh) && !canUseSaved) || (!what.node && !what.agent)} onClick={go}>
        {t("nodeExtra.install")}
      </Button>
    </VStack>
  );
};

// ---------------- VPS state ----------------
const pct = (a?: number, b?: number) => (a && b ? Math.round((a / b) * 100) : 0);
const tone = (p: number) => (p >= 90 ? "red" : p >= 70 ? "orange" : "green");
export const uptimeText = (s: number | undefined, t: any) => {
  if (!s) return "";
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  return d ? t("nodeExtra.uptimeDays", { d, h }) : t("nodeExtra.uptimeHours", { h, m: Math.floor((s % 3600) / 60) });
};

export const VpsCompact: FC<{ sys?: SysInfo }> = ({ sys }) => {
  const { t } = useTranslation();
  if (!sys || sys.cpu === undefined) return null;
  const mem = pct(sys.mem_used, sys.mem_total);
  return (
    <Tooltip label={`${t("nodeExtra.cpu")} ${Math.round(sys.cpu)}% · ${t("nodeExtra.ram")} ${mem}% · ↓ ${formatBytes(sys.rx_rate || 0, 0)}/s ↑ ${formatBytes(sys.tx_rate || 0, 0)}/s`}>
      <HStack spacing={1} fontSize="2xs" color="gray.500">
        <Badge variant="subtle" colorScheme={tone(sys.cpu)} fontSize="2xs">
          {t("nodeExtra.cpu")} {Math.round(sys.cpu)}%
        </Badge>
        <Badge variant="subtle" colorScheme={tone(mem)} fontSize="2xs">
          {t("nodeExtra.ram")} {mem}%
        </Badge>
      </HStack>
    </Tooltip>
  );
};

const Bar: FC<{ label: string; value: number; text: string }> = ({ label, value, text }) => (
  <Box>
    <HStack justifyContent="space-between" fontSize="xs" mb={0.5}>
      <Text color="gray.500">{label}</Text>
      <Text>{text}</Text>
    </HStack>
    <Progress value={value} size="xs" borderRadius="full" colorScheme={tone(value)} />
  </Box>
);

export const VpsStatus: FC<{ sys?: SysInfo; hasAgent?: boolean }> = ({ sys }) => {
  const { t } = useTranslation();
  if (!sys) return null;
  if (sys.cpu === undefined)
    return (
      <Text fontSize="xs" color="gray.500">
        {sys.error === "agent too old" ? t("nodeExtra.agentOld") : t("nodeExtra.noAgentStatus")}
      </Text>
    );
  const mem = pct(sys.mem_used, sys.mem_total);
  const disk = pct(sys.disk_used, sys.disk_total);
  return (
    <VStack align="stretch" spacing={2} w="full" p={3} borderRadius="lg" bg="blackAlpha.50" _dark={{ bg: "whiteAlpha.50" }}>
      <HStack justifyContent="space-between">
        <Text fontSize="sm" fontWeight="medium">
          {t("nodeExtra.vps")}
        </Text>
        <Text fontSize="xs" color="gray.500">
          {uptimeText(sys.uptime, t)}
        </Text>
      </HStack>
      <Bar label={`${t("nodeExtra.cpu")} · ${sys.cores} ${t("nodeExtra.cores")}`} value={sys.cpu} text={`${Math.round(sys.cpu)}%${sys.load ? ` · ${sys.load[0].toFixed(2)}` : ""}`} />
      <Bar label={t("nodeExtra.ram")} value={mem} text={`${formatBytes(sys.mem_used || 0, 1)} / ${formatBytes(sys.mem_total || 0, 1)}`} />
      <Bar label={t("nodeExtra.disk")} value={disk} text={`${formatBytes(sys.disk_used || 0, 0)} / ${formatBytes(sys.disk_total || 0, 0)}`} />
      <HStack justifyContent="space-between" fontSize="xs">
        <Text color="gray.500">{t("nodeExtra.network")}</Text>
        <Text>
          ↓ {formatBytes(sys.rx_rate || 0, 1)}/s · ↑ {formatBytes(sys.tx_rate || 0, 1)}/s
        </Text>
      </HStack>
    </VStack>
  );
};
