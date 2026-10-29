// In-panel user guide + reference. An eye-catching, role-aware guide (reseller vs sudo)
// plus subscription/{token} and REST API help. Content is bilingual (TR/EN, by UI language)
// and kept here rather than in the per-key locale files, since it is long-form.
import {
  Badge,
  Box,
  Button,
  Code,
  Grid,
  GridItem,
  HStack,
  Heading,
  Icon,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  UserPlusIcon,
  LinkIcon,
  SignalIcon,
  ServerStackIcon,
  RectangleGroupIcon,
  ShieldCheckIcon,
  Cog6ToothIcon,
  CloudArrowDownIcon,
  DevicePhoneMobileIcon,
  NoSymbolIcon,
  DocumentDuplicateIcon,
  ClockIcon,
  ChartPieIcon,
  ShareIcon,
  CommandLineIcon,
} from "@heroicons/react/24/outline";
import useGetUser from "hooks/useGetUser";
import useBrand from "hooks/useBrand";
import { FC, useState } from "react";
import { useTranslation } from "react-i18next";

type Item = { icon: any; title: string; desc: string };
type Guide = {
  heroTitle: string;
  heroSub: string;
  roleAdmin: string;
  roleSudo: string;
  quickTitle: string;
  canTitle: string;
  quick: { admin: Item[]; sudo: Item[] };
  can: { admin: Item[]; sudo: Item[] };
  subTitle: string;
  subBody: string;
  subCode: string;
  tokens: string[];
  tokenNote: string;
  apiTitle: string;
  apiBody: string;
  apiCode: string;
  apiLinks: string;
};

const G: Record<"tr" | "en", Guide> = {
  tr: {
    heroTitle: "Kullanım Kılavuzu",
    heroSub: "Alexen'i rolüne göre nasıl kullanacağını birkaç adımda öğren. Rolünü aşağıdan seçebilirsin.",
    roleAdmin: "Bayi (Admin)",
    roleSudo: "Sudo yönetici",
    quickTitle: "Hızlı başlangıç",
    canTitle: "Neler yapabilirsin",
    quick: {
      admin: [
        { icon: UserPlusIcon, title: "Kullanıcı oluştur", desc: "Protokol, bitiş tarihi ve veri limitini seç. İstersen IP ve cihaz (HWID) limiti koy." },
        { icon: LinkIcon, title: "Abonelik linkini ver", desc: "Kullanıcı satırından sub adresini kopyala ya da QR'ı göster; müşteri kendi uygulamasına ekler." },
        { icon: SignalIcon, title: "Kullanımı izle", desc: "Online IP'leri, trafiği ve engellenen yeni IP/cihaz sayısını kullanıcı penceresinde gör." },
        { icon: NoSymbolIcon, title: "Gerekirse müdahale et", desc: "İznin varsa bir IP'yi düşürebilir, cihazı silebilir ya da limiti değiştirebilirsin." },
      ],
      sudo: [
        { icon: ServerStackIcon, title: "Node ekle", desc: "Trafiği taşıyan sunucuları panelden kur ve bağla; çekirdek ve outbound ayarları da burada." },
        { icon: RectangleGroupIcon, title: "Host ve grupları ayarla", desc: "Her inbound için adres/port/şablon belirle; host grupları ile bir bayinin hangi hostları vereceğini sınırla." },
        { icon: ShieldCheckIcon, title: "Bayi oluştur", desc: "Admin ekle; kullanıcı/trafik kotası, host grubu ve izinleri (config kopyalama, limit düzenleme) ver." },
        { icon: Cog6ToothIcon, title: "Abonelik ve domaini ayarla", desc: "Durum bazlı sub şablonları, domain/path ve external configler." },
        { icon: CloudArrowDownIcon, title: "Yedekle ve güncelle", desc: "Panelden yedek al/geri yükle ve yeni sürüme güncelle (önce yedek alır, başarısız olursa döner)." },
      ],
    },
    can: {
      admin: [
        { icon: DevicePhoneMobileIcon, title: "IP & cihaz limiti", desc: "Aynı anda bağlı IP ve cihaz sayısını kullanıcı başına sınırla." },
        { icon: SignalIcon, title: "Online IP'ler", desc: "Kimin, hangi node/inbound üzerinden bağlı olduğunu canlı gör." },
        { icon: DocumentDuplicateIcon, title: "Config / sub kopyala", desc: "İznin açıksa config linklerini; her durumda sub adresini kopyalayabilirsin." },
        { icon: LinkIcon, title: "Abonelik yönetimi", desc: "Sub linkini yenile (revoke), kullanımı sıfırla, sonraki planı aktif et." },
      ],
      sudo: [
        { icon: ShieldCheckIcon, title: "Roller & izinler", desc: "Sudo ve bayileri yönet; bayi izinlerini tek tek aç/kapat." },
        { icon: ShareIcon, title: "Preroute / tünel", desc: "Çıkışları zincirle, tüneller kur ve test et." },
        { icon: ChartPieIcon, title: "İstatistik & genel bakış", desc: "Trafik, online, node kullanımını izle." },
        { icon: ClockIcon, title: "Etkinlik günlüğü", desc: "Her giriş ve değişiklik; tür, kullanıcı veya IP ile ara." },
      ],
    },
    subTitle: "Abonelik mesajı ve yer tutucular",
    subBody: "Abonelik sayfasının başına kullanıcının durumuna göre bir mesaj koyabilirsin. Yönerge satırları aynı zamanda HTTP başlığı olur:",
    subCode: "#profile-title: Şirketim\n#announce: Merhaba {username}\nLimit: {used} / {limit} · Kalan: {remaining}\n#support-url: https://siten.com/destek?t={token}",
    tokens: ["{username}", "{used}", "{limit}", "{remaining}", "{expiretime}", "{days}", "{status}", "{token}"],
    tokenNote: "{token} kullanıcının kendi abonelik token'ıdır — kendi destek linkinde kullanıcıyı tanımlamak için idealdir.",
    apiTitle: "REST API",
    apiBody: "Panel tam bir REST API sunar. Çoğu uç bir bearer token ister: önce giriş yapıp token al, sonra Authorization başlığında gönder.",
    apiCode: "curl -X POST https://PANELINIZ/api/admin/token \\\n     -d 'username=<admin>&password=<sifre>'\n\ncurl https://PANELINIZ/api/users \\\n     -H 'Authorization: Bearer <access_token>'",
    apiLinks: "Tam referans ve şema:",
  },
  en: {
    heroTitle: "User Guide",
    heroSub: "Learn how to run Alexen for your role in a few steps. Pick your role below.",
    roleAdmin: "Reseller (Admin)",
    roleSudo: "Sudo admin",
    quickTitle: "Quick start",
    canTitle: "What you can do",
    quick: {
      admin: [
        { icon: UserPlusIcon, title: "Create a user", desc: "Choose protocols, expiry and data limit. Optionally set an IP and device (HWID) limit." },
        { icon: LinkIcon, title: "Hand over the sub link", desc: "Copy the sub address from the user's row or show the QR; the customer adds it to their app." },
        { icon: SignalIcon, title: "Watch usage", desc: "See online IPs, traffic, and how many new IPs/devices were blocked in the user dialog." },
        { icon: NoSymbolIcon, title: "Step in when needed", desc: "If allowed, kick an IP, remove a device, or change a limit." },
      ],
      sudo: [
        { icon: ServerStackIcon, title: "Add a node", desc: "Install and connect the servers that carry traffic; core and outbound settings live here too." },
        { icon: RectangleGroupIcon, title: "Set up hosts & groups", desc: "Define address/port/template per inbound; host groups limit which hosts a reseller can hand out." },
        { icon: ShieldCheckIcon, title: "Create a reseller", desc: "Add an admin; set the user/traffic quota, host group, and permissions (copy configs, edit limits)." },
        { icon: Cog6ToothIcon, title: "Configure subs & domain", desc: "Per-state sub templates, domain/path, and external configs." },
        { icon: CloudArrowDownIcon, title: "Back up & update", desc: "Back up/restore from the panel and update to a new version (it backs up first and rolls back on failure)." },
      ],
    },
    can: {
      admin: [
        { icon: DevicePhoneMobileIcon, title: "IP & device limits", desc: "Cap simultaneous IPs and devices per user." },
        { icon: SignalIcon, title: "Online IPs", desc: "See who is connected, on which node/inbound, live." },
        { icon: DocumentDuplicateIcon, title: "Copy config / sub", desc: "If permitted, copy config links; the sub address is always copyable." },
        { icon: LinkIcon, title: "Subscription actions", desc: "Revoke the sub link, reset usage, activate the next plan." },
      ],
      sudo: [
        { icon: ShieldCheckIcon, title: "Roles & permissions", desc: "Manage sudo admins and resellers; toggle reseller permissions." },
        { icon: ShareIcon, title: "Preroute / tunnels", desc: "Chain exits, build tunnels and test them." },
        { icon: ChartPieIcon, title: "Stats & overview", desc: "Track traffic, online counts and node usage." },
        { icon: ClockIcon, title: "Activity log", desc: "Every sign-in and change; search by type, user or IP." },
      ],
    },
    subTitle: "Subscription message & placeholders",
    subBody: "Prepend a message to the sub page per user state. Directive lines also become HTTP headers:",
    subCode: "#profile-title: My Company\n#announce: Hello {username}\nLimit: {used} / {limit} · Left: {remaining}\n#support-url: https://yoursite.com/help?t={token}",
    tokens: ["{username}", "{used}", "{limit}", "{remaining}", "{expiretime}", "{days}", "{status}", "{token}"],
    tokenNote: "{token} is the user's own subscription token — ideal for identifying the user inside your own support link.",
    apiTitle: "REST API",
    apiBody: "The panel exposes a full REST API. Most endpoints need a bearer token: log in, then send it in the Authorization header.",
    apiCode: "curl -X POST https://YOUR-PANEL/api/admin/token \\\n     -d 'username=<admin>&password=<password>'\n\ncurl https://YOUR-PANEL/api/users \\\n     -H 'Authorization: Bearer <access_token>'",
    apiLinks: "Full reference and schema:",
  },
};

const StepRow: FC<{ n: number; item: Item }> = ({ n, item }) => (
  <HStack align="flex-start" spacing={4}>
    <Box position="relative" flexShrink={0}>
      <Box
        w="40px"
        h="40px"
        borderRadius="12px"
        bg="color-mix(in srgb, var(--chakra-colors-primary-500) 14%, transparent)"
        color="primary.500"
        display="flex"
        alignItems="center"
        justifyContent="center"
        _dark={{ color: "primary.200" }}
      >
        <Icon as={item.icon} boxSize="20px" />
      </Box>
      <Box
        position="absolute"
        top="-6px"
        right="-6px"
        w="19px"
        h="19px"
        borderRadius="full"
        bg="primary.500"
        color="white"
        fontSize="11px"
        fontWeight="bold"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        {n}
      </Box>
    </Box>
    <Box pt={0.5}>
      <Text fontWeight="semibold" fontSize="sm">
        {item.title}
      </Text>
      <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }} lineHeight="tall">
        {item.desc}
      </Text>
    </Box>
  </HStack>
);

const Card: FC<{ item: Item }> = ({ item }) => (
  <GridItem
    className="alexen-page"
    borderWidth="1px"
    borderRadius="14px"
    p={4}
    _hover={{ borderColor: "primary.400" }}
    transition="border-color .15s"
  >
    <Icon as={item.icon} boxSize="22px" color="primary.500" _dark={{ color: "primary.200" }} mb={2} />
    <Text fontWeight="semibold" fontSize="sm">
      {item.title}
    </Text>
    <Text fontSize="xs" color="gray.600" _dark={{ color: "gray.400" }} lineHeight="tall">
      {item.desc}
    </Text>
  </GridItem>
);

const CodeBlock: FC<{ children: string }> = ({ children }) => (
  <Code display="block" whiteSpace="pre-wrap" p={3} borderRadius="10px" fontSize="xs" w="full" overflowX="auto">
    {children}
  </Code>
);

export const DocumentationPage: FC = () => {
  const { i18n } = useTranslation();
  const { userData } = useGetUser();
  const lang = (i18n.language || "en").slice(0, 2) === "tr" ? "tr" : "en";
  const g = G[lang as "tr" | "en"];
  const brand = useBrand();
  const isCreator = !!(userData as any)?.is_creator;
  // creators get BOTH guides + the token/API reference; sudos and resellers get only their own
  // usage guide (no token/API). A single-role user has no toggle.
  const roles: ("admin" | "sudo")[] = isCreator ? ["admin", "sudo"] : [userData?.is_sudo ? "sudo" : "admin"];
  const [role, setRole] = useState<"admin" | "sudo">(userData?.is_sudo ? "sudo" : "admin");

  return (
    <VStack align="stretch" spacing={5} maxW="960px">
      {/* hero */}
      <Box
        borderRadius="20px"
        p={{ base: 5, md: 7 }}
        color="white"
        bgGradient="linear(135deg, primary.600, primary.400)"
        position="relative"
        overflow="hidden"
      >
        <Box position="absolute" top="-40px" right="-30px" opacity={0.18}>
          <Icon as={ShieldCheckIcon} boxSize="170px" />
        </Box>
        <HStack spacing={3} mb={2}>
          <Box w="38px" h="38px" borderRadius="11px" bg="whiteAlpha.300" display="flex" alignItems="center" justifyContent="center">
            <Icon as={ShieldCheckIcon} boxSize="22px" />
          </Box>
          <Badge bg="whiteAlpha.300" color="white" borderRadius="full" px={2.5}>
            {brand.name}
          </Badge>
        </HStack>
        <Heading size="lg" letterSpacing="-0.01em">
          {g.heroTitle}
        </Heading>
        <Text mt={1.5} maxW="560px" opacity={0.92} fontSize="sm">
          {g.heroSub.replace(/Alexen/g, brand.name)}
        </Text>
        {/* role toggle — only when the user may see more than one guide (creator) */}
        {roles.length > 1 && (
        <HStack mt={4} spacing={1} bg="whiteAlpha.200" p={1} borderRadius="12px" w="fit-content">
          {roles.map((r) => (
            <Button
              key={r}
              size="sm"
              variant="unstyled"
              px={4}
              h="32px"
              borderRadius="9px"
              fontWeight="semibold"
              fontSize="sm"
              color={role === r ? "primary.600" : "white"}
              bg={role === r ? "white" : "transparent"}
              _hover={{ bg: role === r ? "white" : "whiteAlpha.300" }}
              onClick={() => setRole(r)}
            >
              {r === "admin" ? g.roleAdmin : g.roleSudo}
            </Button>
          ))}
        </HStack>
        )}
      </Box>

      {/* quick start — a real sequence, so numbered */}
      <Box className="alexen-page" borderWidth="1px" borderRadius="16px" p={{ base: 4, md: 6 }}>
        <Heading size="md" mb={4}>
          {g.quickTitle}
        </Heading>
        <VStack align="stretch" spacing={4}>
          {g.quick[role].map((it, i) => (
            <StepRow key={it.title} n={i + 1} item={it} />
          ))}
        </VStack>
      </Box>

      {/* what you can do */}
      <Box>
        <Heading size="md" mb={3}>
          {g.canTitle}
        </Heading>
        <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={3}>
          {g.can[role].map((it) => (
            <Card key={it.title} item={it} />
          ))}
        </Grid>
      </Box>

      {/* subscriptions & token + API — creators only */}
      {isCreator && (<>
      <Box className="alexen-page" borderWidth="1px" borderRadius="16px" p={{ base: 4, md: 6 }}>
        <HStack spacing={2} mb={2}>
          <Icon as={LinkIcon} boxSize="18px" color="primary.500" _dark={{ color: "primary.200" }} />
          <Heading size="md">{g.subTitle}</Heading>
        </HStack>
        <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }} mb={3} lineHeight="tall">
          {g.subBody}
        </Text>
        <CodeBlock>{g.subCode}</CodeBlock>
        <HStack mt={3} spacing={2} flexWrap="wrap">
          {g.tokens.map((p) => (
            <Code key={p} fontSize="xs" px={2} py={0.5} borderRadius="full">
              {p}
            </Code>
          ))}
        </HStack>
        <Text mt={2} fontSize="xs" color="gray.500">
          {g.tokenNote}
        </Text>
      </Box>

      {/* API */}
      <Box className="alexen-page" borderWidth="1px" borderRadius="16px" p={{ base: 4, md: 6 }}>
        <HStack spacing={2} mb={2}>
          <Icon as={CommandLineIcon} boxSize="18px" color="primary.500" _dark={{ color: "primary.200" }} />
          <Heading size="md">{g.apiTitle}</Heading>
        </HStack>
        <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }} mb={3} lineHeight="tall">
          {g.apiBody}
        </Text>
        <CodeBlock>{g.apiCode}</CodeBlock>
        <Text mt={3} fontSize="sm" color="gray.600" _dark={{ color: "gray.400" }}>
          {g.apiLinks} <Code fontSize="xs">/api/docs</Code>
        </Text>
      </Box>
      </>)}
    </VStack>
  );
};

export default DocumentationPage;
