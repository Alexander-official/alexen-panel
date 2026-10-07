import {
  Alert,
  AlertIcon,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  IconButton,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
  SimpleGrid,
  Switch,
  Text,
  Textarea,
  Tooltip,
  useToast,
  VStack,
} from "@chakra-ui/react";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import {
  FetchCoresQueryKey,
  fetchCoreConfig,
  MAIN_CORE,
  saveCoreConfig,
  useCoresQuery,
} from "contexts/CoreSettingsContext";
import { fetchInbounds } from "contexts/DashboardContext";
import { useHosts } from "contexts/HostsContext";
import { HostGroupPicker } from "./HostGroupPicker";
import { FC, ReactNode, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "react-query";
import { fetch } from "service/http";
import {
  addInboundToConfig,
  buildInbound,
  canProxyProtocol,
  canRealIpHeader,
  defaultInboundOptions,
  FINGERPRINTS,
  HOST_ALPNS,
  hostFor,
  tlsModesFor,
  INBOUND_PROTOCOLS,
  InboundOptions,
  knownCertificates,
  portUsers,
  randomHex,
  securitiesFor,
  suggestTag,
  transportsFor,
  USER_PROTOCOLS,
  validateInbound,
} from "utils/inboundBuilder";

const PROTOCOL_LABELS: Record<string, string> = {
  vless: "VLESS",
  vmess: "VMess",
  trojan: "Trojan",
  shadowsocks: "Shadowsocks",
  hysteria: "Hysteria2",
  tunnel: "Tunnel (dokodemo-door)",
  socks: "SOCKS5",
  http: "HTTP proxy",
};

const TRANSPORT_LABELS: Record<string, string> = {
  tcp: "TCP (raw)",
  ws: "WebSocket",
  grpc: "gRPC",
  xhttp: "XHTTP",
  httpupgrade: "HTTPUpgrade",
  kcp: "mKCP",
};

const Field: FC<{ label: string; help?: string; children: ReactNode }> = ({ label, help, children }) => (
  <FormControl>
    <FormLabel fontSize="xs" mb={1} opacity={0.8}>
      {label}
    </FormLabel>
    {children}
    {help && (
      <Text fontSize="xs" color="gray.500" mt={1}>
        {help}
      </Text>
    )}
  </FormControl>
);

type BuilderProps = {
  value: InboundOptions;
  onChange: (v: InboundOptions) => void;
  // the core config the inbound goes into: port clashes, outbounds, known certificates
  config: any;
  // "Add host" also asks the client side (fingerprint, SNI...) for the host it makes
  withHost?: boolean;
};

const Seg: FC<{ value: string; options: [string, string][]; onChange: (v: string) => void }> = ({ value, options, onChange }) => (
  <HStack spacing={1} flexWrap="wrap" rowGap={1}>
    {options.map(([v, label]) => (
      <Button key={v} size="xs" borderRadius="full" colorScheme="primary" variant={value === v ? "solid" : "outline"} onClick={() => onChange(v)}>
        {label}
      </Button>
    ))}
  </HStack>
);

// the form: protocol, transport, security and their settings
export const InboundBuilderForm: FC<BuilderProps> = ({ value: o, onChange, config, withHost }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const set = (patch: Partial<InboundOptions>) => onChange({ ...o, ...patch });
  const transports = transportsFor(o.protocol);
  const securities = securitiesFor(o.protocol, o.network);
  const security = securities.includes(o.security) ? o.security : securities[0];
  const clash = portUsers(config, o.port, o.listen);
  const certs = useMemo(() => knownCertificates(config), [config]);
  const outbounds: string[] = (config?.outbounds || []).map((x: any) => x.tag).filter(Boolean);
  const hasPath =
    ["ws", "xhttp", "httpupgrade"].includes(o.network) || (o.network === "tcp" && o.tcpHttpHeader && security === "none");
  const [generating, setGenerating] = useState(false);
  const tlsModes = tlsModesFor(o.protocol, o.network);
  const tlsMode = tlsModes.includes(o.tlsMode) ? o.tlsMode : "file";

  // prefill the certificate the config already uses
  useEffect(() => {
    if (security === "tls" && !o.certFile && certs[0]) set(certs[0]);
  }, [security]);

  // REALITY needs a key pair and a shortId: make them as soon as it's picked
  useEffect(() => {
    if (security === "reality" && !o.realityPrivateKey && !generating) generateKeys();
  }, [security]);

  const generateKeys = () => {
    setGenerating(true);
    fetch("/core/x25519")
      .then((k: any) =>
        set({
          realityPrivateKey: k.private_key,
          realityPublicKey: k.public_key,
          realityShortId: o.realityShortId || randomHex(8),
        })
      )
      .catch(() => toast({ title: t("inboundBuilder.keysFailed"), status: "error", position: "top" }))
      .finally(() => setGenerating(false));
  };

  return (
    <VStack align="stretch" spacing={3}>
      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
        <Field label={t("inboundBuilder.protocol")}>
          <Select size="sm" value={o.protocol} onChange={(e) => set({ protocol: e.target.value as any })}>
            {INBOUND_PROTOCOLS.map((p) => (
              <option key={p} value={p}>
                {PROTOCOL_LABELS[p]}
              </option>
            ))}
          </Select>
        </Field>
        {transports.length > 0 && (
          <Field label={t("inboundBuilder.transport")}>
            <Select size="sm" value={o.network} onChange={(e) => set({ network: e.target.value as any })}>
              {transports.map((n) => (
                <option key={n} value={n}>
                  {TRANSPORT_LABELS[n]}
                </option>
              ))}
            </Select>
          </Field>
        )}
        {securities.length > 1 && (
          <Field label={t("inboundBuilder.security")}>
            <Select size="sm" value={security} onChange={(e) => set({ security: e.target.value as any })}>
              {securities.map((s) => (
                <option key={s} value={s}>
                  {s === "none" ? t("inboundBuilder.none") : s.toUpperCase()}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label={t("inboundBuilder.port")}>
          <Input
            size="sm"
            type="number"
            placeholder="443"
            value={o.port}
            onChange={(e) => set({ port: e.target.value === "" ? "" : Number(e.target.value) })}
          />
        </Field>
        <Field label={t("inboundBuilder.tag")} help={t("inboundBuilder.tagHelp")}>
          <Input size="sm" placeholder={suggestTag(o)} value={o.tag} onChange={(e) => set({ tag: e.target.value })} />
        </Field>
        <Field label={t("inboundBuilder.listen")}>
          <Input size="sm" value={o.listen} onChange={(e) => set({ listen: e.target.value })} />
        </Field>
      </SimpleGrid>

      {clash.length > 0 && (
        <Alert status="warning" borderRadius="md" py={2} fontSize="sm">
          <AlertIcon />
          {t("inboundBuilder.portClash", { port: o.port, tags: clash.join(", ") })}
        </Alert>
      )}

      {/* transport settings */}
      {transports.length > 0 && (
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
          {o.network === "tcp" && security === "none" && (
            <HStack gridColumn="1 / -1">
              <Switch size="sm" isChecked={o.tcpHttpHeader} onChange={(e) => set({ tcpHttpHeader: e.target.checked })} />
              <Text fontSize="sm">{t("inboundBuilder.httpHeader")}</Text>
            </HStack>
          )}
          {hasPath && (
            <Field label={t("inboundBuilder.path")}>
              <Input size="sm" value={o.path} onChange={(e) => set({ path: e.target.value })} />
            </Field>
          )}
          {hasPath && (
            <Field label={t("inboundBuilder.host")}>
              <Input size="sm" placeholder="example.com" value={o.host} onChange={(e) => set({ host: e.target.value })} />
            </Field>
          )}
          {o.network === "grpc" && (
            <Field label="serviceName">
              <Input size="sm" value={o.serviceName} onChange={(e) => set({ serviceName: e.target.value })} />
            </Field>
          )}
          {o.network === "xhttp" && (
            <Field label={t("inboundBuilder.xhttpMode")}>
              <Select size="sm" value={o.xhttpMode} onChange={(e) => set({ xhttpMode: e.target.value as any })}>
                {["auto", "packet-up", "stream-up", "stream-one"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </SimpleGrid>
      )}

      {/* security settings */}
      {security === "tls" && (
        <VStack align="stretch" spacing={3}>
          <Field label={t("inboundBuilder.tlsMode")} help={t(`inboundBuilder.tlsModeHelp.${tlsMode}`)}>
            <Seg
              value={tlsMode}
              options={tlsModes.map((m) => [m, t(`inboundBuilder.tlsModeName.${m}`)] as [string, string])}
              onChange={(v) => set({ tlsMode: v as any })}
            />
          </Field>
          {tlsMode === "file" && (
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
              {certs.length > 1 && (
                <Box gridColumn="1 / -1">
                  <Field label={t("inboundBuilder.knownCert")}>
                    <Select
                      size="sm"
                      value={o.certFile}
                      onChange={(e) => {
                        const c = certs.find((x) => x.certFile === e.target.value);
                        if (c) set(c);
                      }}
                    >
                      {certs.map((c) => (
                        <option key={c.certFile} value={c.certFile}>
                          {c.certFile}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </Box>
              )}
              <Field label={t("inboundBuilder.certFile")}>
                <Input size="sm" placeholder="/var/lib/marzban/certs/fullchain.pem" value={o.certFile} onChange={(e) => set({ certFile: e.target.value })} />
              </Field>
              <Field label={t("inboundBuilder.keyFile")}>
                <Input size="sm" placeholder="/var/lib/marzban/certs/key.pem" value={o.keyFile} onChange={(e) => set({ keyFile: e.target.value })} />
              </Field>
            </SimpleGrid>
          )}
          {tlsMode === "paste" && (
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
              <Field label={t("inboundBuilder.certPem")}>
                <Textarea size="sm" rows={4} fontFamily="mono" fontSize="2xs" placeholder="-----BEGIN CERTIFICATE-----" value={o.certPem} onChange={(e) => set({ certPem: e.target.value })} />
              </Field>
              <Field label={t("inboundBuilder.keyPem")}>
                <Textarea size="sm" rows={4} fontFamily="mono" fontSize="2xs" placeholder="-----BEGIN PRIVATE KEY-----" value={o.keyPem} onChange={(e) => set({ keyPem: e.target.value })} />
              </Field>
            </SimpleGrid>
          )}
          {tlsMode !== "edge" && (
            <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
              {o.protocol !== "hysteria" && (
                <Field label="ALPN">
                  <Input size="sm" value={o.alpn} onChange={(e) => set({ alpn: e.target.value })} />
                </Field>
              )}
              <Field label="SNI (serverName)">
                <Input size="sm" placeholder={t("inboundBuilder.optional")} value={o.serverName} onChange={(e) => set({ serverName: e.target.value })} />
              </Field>
              <Field label={t("inboundBuilder.minVersion")}>
                <Select size="sm" value={o.tlsMinVersion} onChange={(e) => set({ tlsMinVersion: e.target.value as any })}>
                  <option value="">{t("inboundBuilder.default")}</option>
                  <option value="1.2">TLS 1.2</option>
                  <option value="1.3">TLS 1.3</option>
                </Select>
              </Field>
              <HStack alignSelf="end" pb={1}>
                <Switch size="sm" isChecked={o.rejectUnknownSni} onChange={(e) => set({ rejectUnknownSni: e.target.checked })} />
                <Text fontSize="sm">{t("inboundBuilder.rejectUnknownSni")}</Text>
              </HStack>
            </SimpleGrid>
          )}
        </VStack>
      )}
      {security === "reality" && (
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
          <Field label={t("inboundBuilder.realityTarget")}>
            <Input size="sm" value={o.realityTarget} onChange={(e) => set({ realityTarget: e.target.value })} />
          </Field>
          <Field label="serverNames">
            <Input size="sm" value={o.realityServerNames} onChange={(e) => set({ realityServerNames: e.target.value })} />
          </Field>
          <Box gridColumn="1 / -1">
            <Field label="privateKey" help={o.realityPublicKey ? `publicKey: ${o.realityPublicKey}` : undefined}>
              <HStack>
                <Input size="sm" fontFamily="mono" value={o.realityPrivateKey} onChange={(e) => set({ realityPrivateKey: e.target.value, realityPublicKey: "" })} />
                <Tooltip label={t("inboundBuilder.generateKeys")}>
                  <IconButton
                    size="sm"
                    aria-label="generate"
                    icon={<ArrowPathIcon width={16} />}
                    isLoading={generating}
                    onClick={generateKeys}
                  />
                </Tooltip>
              </HStack>
            </Field>
          </Box>
          <Field label="spiderX">
            <Input size="sm" fontFamily="mono" value={o.realitySpiderX} onChange={(e) => set({ realitySpiderX: e.target.value })} />
          </Field>
          <Field label="shortIds">
            <HStack>
              <Input size="sm" fontFamily="mono" value={o.realityShortId} onChange={(e) => set({ realityShortId: e.target.value })} />
              <IconButton size="sm" aria-label="random" icon={<ArrowPathIcon width={16} />} onClick={() => set({ realityShortId: randomHex(8) })} />
            </HStack>
          </Field>
        </SimpleGrid>
      )}

      {o.protocol === "hysteria" && (
        <Field label={t("inboundBuilder.obfs")} help={t("inboundBuilder.obfsHelp")}>
          <HStack>
            <Input size="sm" value={o.obfsPassword} onChange={(e) => set({ obfsPassword: e.target.value })} />
            <IconButton size="sm" aria-label="random" icon={<ArrowPathIcon width={16} />} onClick={() => set({ obfsPassword: randomHex(8) })} />
          </HStack>
        </Field>
      )}

      {o.protocol === "tunnel" && (
        <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3}>
          <Field label={t("inboundBuilder.tunnelAddress")}>
            <Input size="sm" placeholder="1.2.3.4" value={o.tunnelAddress} onChange={(e) => set({ tunnelAddress: e.target.value })} />
          </Field>
          <Field label={t("inboundBuilder.tunnelPort")}>
            <Input
              size="sm"
              type="number"
              placeholder="443"
              value={o.tunnelPort}
              onChange={(e) => set({ tunnelPort: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </Field>
          <Field label={t("inboundBuilder.network")}>
            <Select size="sm" value={o.tunnelNetwork} onChange={(e) => set({ tunnelNetwork: e.target.value as any })}>
              <option value="tcp,udp">TCP + UDP</option>
              <option value="tcp">TCP</option>
              <option value="udp">UDP</option>
            </Select>
          </Field>
          <HStack gridColumn="1 / -1">
            <Switch size="sm" isChecked={o.followRedirect} onChange={(e) => set({ followRedirect: e.target.checked })} />
            <Text fontSize="sm">followRedirect</Text>
          </HStack>
        </SimpleGrid>
      )}

      {(o.protocol === "socks" || o.protocol === "http") && (
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
          <Field label={t("inboundBuilder.authUser")} help={t("inboundBuilder.authHelp")}>
            <Input size="sm" value={o.authUser} onChange={(e) => set({ authUser: e.target.value })} />
          </Field>
          <Field label={t("inboundBuilder.authPass")}>
            <Input size="sm" value={o.authPass} onChange={(e) => set({ authPass: e.target.value })} />
          </Field>
        </SimpleGrid>
      )}

      {withHost && USER_PROTOCOLS.includes(o.protocol) && (security === "tls" || security === "reality") && (
        <Box p={3} borderRadius="12px" bg="var(--tier-2)" borderWidth="1px" borderColor="var(--tier-line)">
          <Text fontSize="sm" fontWeight="semibold" mb={0.5}>
            {t("inboundBuilder.client")}
          </Text>
          <Text fontSize="xs" color="gray.500" mb={3}>
            {t("inboundBuilder.clientHelp")}
          </Text>
          <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
            <Field label={t("inboundBuilder.fingerprint")} help={t("inboundBuilder.fingerprintHelp")}>
              <Select size="sm" value={o.fingerprint} onChange={(e) => set({ fingerprint: e.target.value })}>
                <option value="">{t("inboundBuilder.none")}</option>
                {FINGERPRINTS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </Select>
            </Field>
            {security === "tls" && (
              <Field label={t("inboundBuilder.hostSni")} help={tlsMode === "edge" ? t("inboundBuilder.hostSniEdge") : undefined}>
                <Input size="sm" placeholder={tlsMode === "edge" ? o.host || "sub.example.com" : t("inboundBuilder.optional")} value={o.hostSni} onChange={(e) => set({ hostSni: e.target.value.trim() })} />
              </Field>
            )}
            {security === "tls" && o.protocol !== "hysteria" && (
              <Field label={t("inboundBuilder.hostAlpn")}>
                <Select size="sm" value={o.hostAlpn} onChange={(e) => set({ hostAlpn: e.target.value })}>
                  {HOST_ALPNS.map((a) => (
                    <option key={a || "-"} value={a}>
                      {a || t("inboundBuilder.default")}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {o.protocol !== "hysteria" && (
              <HStack alignSelf="end" pb={1}>
                <Switch size="sm" isChecked={o.mux} onChange={(e) => set({ mux: e.target.checked })} />
                <Text fontSize="sm">Mux</Text>
              </HStack>
            )}
          </SimpleGrid>
        </Box>
      )}

      {canProxyProtocol(o.protocol, o.network) && (
        <Box p={3} borderRadius="12px" bg="var(--tier-2)" borderWidth="1px" borderColor="var(--tier-line)">
          <Text fontSize="sm" fontWeight="semibold" mb={2}>
            {t("inboundBuilder.realIp")}
          </Text>
          <VStack align="stretch" spacing={2}>
            <HStack alignItems="flex-start">
              <Switch size="sm" mt={0.5} isChecked={o.proxyProtocol} onChange={(e) => set({ proxyProtocol: e.target.checked })} />
              <Box>
                <Text fontSize="sm">{t("inboundBuilder.proxyProtocol")}</Text>
                <Text fontSize="xs" color="gray.500">
                  {t("inboundBuilder.proxyProtocolHelp")}
                </Text>
              </Box>
            </HStack>
            {canRealIpHeader(o.network) && (
              <HStack alignItems="flex-start">
                <Switch size="sm" mt={0.5} isChecked={o.realIpHeader} onChange={(e) => set({ realIpHeader: e.target.checked })} />
                <Box>
                  <Text fontSize="sm">{t("inboundBuilder.realIpHeader")}</Text>
                  <Text fontSize="xs" color="gray.500">
                    {t("inboundBuilder.realIpHeaderHelp")}
                  </Text>
                </Box>
              </HStack>
            )}
          </VStack>
        </Box>
      )}

      <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
        <Field label={t("inboundBuilder.routeTo")} help={t("inboundBuilder.routeToHelp")}>
          <Select size="sm" value={o.routeTo} onChange={(e) => set({ routeTo: e.target.value })}>
            <option value="">{t("inboundBuilder.noRule")}</option>
            {outbounds.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </Select>
        </Field>
        {o.protocol !== "tunnel" && (
          <HStack alignSelf="center">
            <Switch size="sm" isChecked={o.sniffing} onChange={(e) => set({ sniffing: e.target.checked })} />
            <Text fontSize="sm">{t("inboundBuilder.sniffing")}</Text>
          </HStack>
        )}
      </SimpleGrid>

      {!USER_PROTOCOLS.includes(o.protocol) && (
        <Text fontSize="xs" color="gray.500">
          {t("inboundBuilder.noUsersNote")}
        </Text>
      )}
    </VStack>
  );
};

export const inboundErrorText = (t: (k: string) => string, errors: string[]) =>
  errors.map((e) => t(`inboundBuilder.error.${e}`)).join(" · ");

type AddHostModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

// "Add host": builds an inbound, puts it into the chosen core's config and
// gives it a host with the given address
export const AddHostModal: FC<AddHostModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data: cores } = useCoresQuery();
  const { fetchHosts } = useHosts();
  const [coreId, setCoreId] = useState(MAIN_CORE);
  const [config, setConfig] = useState<any>(null);
  const [opts, setOpts] = useState<InboundOptions>(defaultInboundOptions());
  const [remark, setRemark] = useState("");
  const [address, setAddress] = useState("");
  const [groups, setGroups] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showJson, setShowJson] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setConfig(null);
    fetchCoreConfig(coreId).then(setConfig);
  }, [isOpen, coreId]);

  useEffect(() => {
    if (isOpen) {
      setOpts(defaultInboundOptions());
      setRemark("");
      setAddress("");
      setGroups(null);
      setShowJson(false);
    }
  }, [isOpen]);

  const errors = config ? validateInbound(opts, config) : [];
  const isUserInbound = USER_PROTOCOLS.includes(opts.protocol);

  const submit = async () => {
    if (!config || errors.length) return;
    setSaving(true);
    try {
      // re-read so a change made elsewhere in the meantime isn't overwritten
      const fresh = await fetchCoreConfig(coreId);
      const { config: next, inbound } = addInboundToConfig(fresh, opts);
      await saveCoreConfig(coreId, next);
      if (isUserInbound) {
        const hosts: any = await fetch("/hosts");
        const current = hosts?.[inbound.tag] || [];
        const host = hostFor(opts, {
          ...(current[0] || {}),
          remark: remark.trim() || current[0]?.remark || "🚀 {USERNAME} [{PROTOCOL} - {TRANSPORT}]",
          address: address.trim() || current[0]?.address || "{SERVER_IP}",
          port: coreId === MAIN_CORE ? null : inbound.port,
          group_name: groups,
        });
        await fetch("/hosts", { method: "PUT", body: { [inbound.tag]: [host] } });
      }
      toast({ title: t("inboundBuilder.added", { tag: inbound.tag }), status: "success", position: "top", duration: 3000 });
      queryClient.invalidateQueries(FetchCoresQueryKey);
      fetchHosts();
      fetchInbounds();
      onClose();
    } catch (e: any) {
      toast({
        title: e?.response?._data?.detail || t("core.generalErrorMessage"),
        status: "error",
        position: "top",
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.300" />
      <ModalContent mx="3">
        <ModalHeader fontSize="lg">{t("inboundBuilder.addHostTitle")}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack align="stretch" spacing={4}>
            {cores && cores.length > 1 && (
              <Field label={t("cores.core")} help={t("inboundBuilder.coreHelp")}>
                <Select size="sm" value={coreId} onChange={(e) => setCoreId(e.target.value)}>
                  {cores.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id === MAIN_CORE ? t("cores.main") : c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <InboundBuilderForm value={opts} onChange={setOpts} config={config} withHost />
            {isUserInbound && (
              <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
                <Field label={t("inboundBuilder.hostRemark")}>
                  <Input size="sm" placeholder="🚀 {USERNAME} [{PROTOCOL} - {TRANSPORT}]" value={remark} onChange={(e) => setRemark(e.target.value)} />
                </Field>
                <Field label={t("inboundBuilder.hostAddress")} help={t("inboundBuilder.hostAddressHelp")}>
                  <Input size="sm" placeholder="{SERVER_IP}" value={address} onChange={(e) => setAddress(e.target.value)} />
                </Field>
              </SimpleGrid>
            )}
            {isUserInbound && (
              <HostGroupPicker value={groups} onChange={setGroups} />
            )}
            <Box>
              <Button size="xs" variant="ghost" onClick={() => setShowJson(!showJson)}>
                {t(showJson ? "inboundBuilder.hideJson" : "inboundBuilder.showJson")}
              </Button>
              {showJson && (
                <Box
                  as="pre"
                  fontSize="xs"
                  p={3}
                  mt={1}
                  borderRadius="md"
                  bg="var(--app-surface-2)"
                  _dark={{ bg: "gray.750" }}
                  maxH="260px"
                  overflow="auto"
                >
                  {JSON.stringify(buildInbound(opts), null, 2)}
                </Box>
              )}
            </Box>
          </VStack>
        </ModalBody>
        <ModalFooter gap={3}>
          {errors.length > 0 && (
            <Text fontSize="xs" color="red.400" flex={1}>
              {inboundErrorText(t, errors)}
            </Text>
          )}
          <Button size="sm" colorScheme="primary" onClick={submit} isLoading={saving} isDisabled={!config || errors.length > 0}>
            {t("inboundBuilder.add")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
