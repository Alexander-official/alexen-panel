// In-panel documentation: a complete guide to the panel's features plus API usage.
// Content is kept here (bilingual TR/EN, picked by the UI language) rather than in the
// per-key locale files, since it is long-form prose.
import {
  Badge,
  Box,
  Code,
  Divider,
  Heading,
  Link,
  ListItem,
  Text,
  UnorderedList,
  VStack,
} from "@chakra-ui/react";
import { FC, Fragment } from "react";
import { useTranslation } from "react-i18next";

type Block =
  | { h: string }
  | { p: string }
  | { ul: string[] }
  | { code: string };

type Doc = { title: string; intro: string; sections: { id: string; title: string; blocks: Block[] }[] };

const DOC: Record<"tr" | "en", Doc> = {
  tr: {
    title: "Dokümantasyon",
    intro:
      "Alexen panelinin tüm bölümleri ve REST API kullanımı. Bir konuyu soldaki içindekilerden seçebilir ya da sayfada gezinebilirsin.",
    sections: [
      {
        id: "roller",
        title: "Roller ve izinler",
        blocks: [
          { p: "Üç rol vardır: creator (sunucunun sahibi), sudo yöneticiler ve bayiler (reseller)." },
          {
            ul: [
              "Creator: her şeyi yapabilir; lisans ve tehlikeli/kaldırma işlemleri yalnızca creator'a özeldir. Creator ve kullanıcıları sudo'lardan gizlidir.",
              "Sudo: creator ile aynı yetkilere sahiptir (lisans ve uninstall hariç); diğer sudo'ları da yönetebilir.",
              "Bayi (admin): kendi kullanıcılarını yönetir; kullanıcı sayısı/trafik kotası ve host-grupları ile sınırlanır.",
            ],
          },
          { h: "Bayi izinleri (sudo/creator açar-kapatır)" },
          {
            ul: [
              "Config kopyalayabilir: kapalıyken bayi kullanıcıların config (kod) linklerini kopyalayamaz — ama abonelik (sub) adresini yine kopyalayabilir.",
              "IP/cihaz limitini değiştirebilir: kapalıyken limitler salt-okunur olur ve bayi bir kullanıcının cihazını/IP'sini silemez, engelini kaldıramaz.",
            ],
          },
          { p: "Bayi listesinde her bayinin kaç kullanıcı açtığı/sildiği gösterilir." },
        ],
      },
      {
        id: "kullanicilar",
        title: "Kullanıcılar",
        blocks: [
          { p: "Kullanıcı oluştururken protokolleri, bitiş tarihini, veri limitini ve isteğe bağlı IP/cihaz limitini belirlersin." },
          {
            ul: [
              "IP limiti: aynı anda bağlı IP sayısını sınırlar; fazlası, öncekilerden biri düşene kadar engellenir.",
              "Cihaz (HWID) limiti: aboneliği kaç cihazın kullanabileceğini sınırlar; cihazlar kullanıcı bazında yönetilir.",
              "Her kullanıcı için engellenen yeni IP ve reddedilen yeni cihaz sayıları kullanıcı penceresinde görünür.",
              "Online IP'ler: kimin, hangi node ve inbound üzerinden bağlı olduğunu canlı görürsün; bir IP'yi tek tıkla düşürebilirsin.",
            ],
          },
        ],
      },
      {
        id: "abonelik",
        title: "Abonelik ve sub sayfası",
        blocks: [
          { p: "Her kullanıcının bir abonelik (sub) linki vardır. Abonelik sayfasının başına, kullanıcının durumuna göre (varsayılan, süresi dolmuş, limitli, devre dışı, yakında dolacak) bir mesaj şablonu koyabilirsin." },
          { p: "Şablonlarda yönergeler ve yer tutucular kullanılır. Yönerge satırları aynı zamanda HTTP başlığı olur:" },
          { code: "#profile-title: Şirketim\n#announce: Merhaba {username}\nLimit: {used} / {limit} · Kalan: {remaining}\n#support-url: https://siten.com/destek?t={token}" },
          { p: "Kullanılabilir yer tutucular:" },
          {
            ul: [
              "{username} {used} {limit} {remaining} {expiretime} {days} {status}",
              "{token}: kullanıcının kendi abonelik token'ı — kendi destek linkinde kullanıcıyı tanımlamak için idealdir.",
            ],
          },
          { p: "Yönergenin başına base64: yazarsan değer base64 olarak kodlanır. Domain ayarlarından abonelik linkinin domain, path ve son ekini özelleştirebilirsin." },
        ],
      },
      {
        id: "sunucular",
        title: "Node'lar, host'lar ve gruplar",
        blocks: [
          {
            ul: [
              "Node: trafiği taşıyan uzak sunucular; panelden kurulur/yönetilir.",
              "Host'lar: her inbound için istemcilere verilecek adres/port/şablon ayarları.",
              "Host grupları: bir bayinin yalnızca izin verdiğin host'ları dağıtmasını sağlar.",
              "Core ve outbound ayarları, preroute (tünelleme) ve otomatik-değişim de node bölümündedir.",
            ],
          },
        ],
      },
      {
        id: "diger",
        title: "External config, etkinlik, yedek ve güncelleme",
        blocks: [
          {
            ul: [
              "External config: her abonelik linkinin altına eklenen ek config'ler; yedek URL'ler, rastgele URL ve protokol filtresi desteklenir. Bayi bazında da ayarlanabilir.",
              "Etkinlik günlüğü: her giriş ve her değişiklik (kim, ne zaman, hangi cihaz/IP). Tür (ör. 'başarısız giriş'), kullanıcı veya IP ile aranabilir.",
              "Yedek ve güncelleme: panelden yedek alıp geri yükleyebilir, yeni sürüme güncelleyebilirsin (güncelleme önce yedek alır, başarısız olursa eskiye döner).",
            ],
          },
        ],
      },
      {
        id: "api",
        title: "REST API",
        blocks: [
          { p: "Panel tam bir REST API sunar. Çoğu uç bir bearer token ister. Önce giriş yapıp token al, sonra Authorization başlığında gönder:" },
          { code: "curl -X POST https://PANELINIZ/api/admin/token \\\n     -d 'username=<admin>&password=<sifre>'\n# -> {\"access_token\": \"...\", \"token_type\": \"bearer\"}\n\ncurl https://PANELINIZ/api/users \\\n     -H 'Authorization: Bearer <access_token>'" },
          { p: "/sub/... altındaki abonelik uçları herkese açıktır ve URL'deki token ile doğrulanır." },
          { p: "Tam uç listesi ve makine-okur şema GitHub deposundadır: docs/API.md ve docs/openapi.json (Postman/Insomnia veya Redoc'a aktarabilirsin). İnteraktif Swagger arayüzünü açmak için paneli DOCS=True ile başlatın (/docs ve /redoc)." },
        ],
      },
    ],
  },
  en: {
    title: "Documentation",
    intro:
      "A complete guide to every part of the Alexen panel plus REST API usage. Pick a topic from the table of contents or scroll through.",
    sections: [
      {
        id: "roles",
        title: "Roles & permissions",
        blocks: [
          { p: "There are three roles: creator (the server owner), sudo admins, and resellers (admins)." },
          {
            ul: [
              "Creator: can do everything; license and dangerous/uninstall actions are creator-only. The creator and its users are hidden from sudo admins.",
              "Sudo: same powers as the creator (except license and uninstall); can also manage other sudo admins.",
              "Reseller (admin): manages its own users; bounded by a user-count/traffic quota and host groups.",
            ],
          },
          { h: "Reseller permissions (toggled by a sudo/creator)" },
          {
            ul: [
              "Can copy configs: when off, the reseller cannot copy users' config links — but can still copy the subscription (sub) link.",
              "Can edit IP/device limits: when off, the limits are read-only and the reseller cannot delete a user's devices/IPs or unblock them.",
            ],
          },
          { p: "The admins list shows how many users each reseller created/deleted." },
        ],
      },
      {
        id: "users",
        title: "Users",
        blocks: [
          { p: "When creating a user you set the protocols, expiry, data limit, and optional IP/device limits." },
          {
            ul: [
              "IP limit: caps simultaneously connected IPs; extra ones are blocked until an earlier one disconnects.",
              "Device (HWID) limit: caps how many devices can use a subscription; devices are managed per user.",
              "Each user shows how many new IPs were blocked and new devices rejected.",
              "Online IPs: see who is connected, on which node and inbound, in real time; kick one IP with a click.",
            ],
          },
        ],
      },
      {
        id: "subscription",
        title: "Subscription & sub page",
        blocks: [
          { p: "Every user has a subscription (sub) link. You can prepend a message template to the sub page per user state (default, expired, limited, disabled, near-expire)." },
          { p: "Templates use directives and placeholders; directive lines also become HTTP headers:" },
          { code: "#profile-title: My Company\n#announce: Hello {username}\nLimit: {used} / {limit} · Left: {remaining}\n#support-url: https://yoursite.com/help?t={token}" },
          { p: "Available placeholders:" },
          {
            ul: [
              "{username} {used} {limit} {remaining} {expiretime} {days} {status}",
              "{token}: the user's own subscription token — ideal for identifying the user inside your own support link.",
            ],
          },
          { p: "Prefix a directive value with base64: to base64-encode it. Customize the sub link's domain, path and suffix from Domain settings." },
        ],
      },
      {
        id: "servers",
        title: "Nodes, hosts & groups",
        blocks: [
          {
            ul: [
              "Node: the remote servers that carry traffic; installed/managed from the panel.",
              "Hosts: the address/port/template clients are given for each inbound.",
              "Host groups: let a reseller hand out only the hosts you allow.",
              "Core & outbound settings, preroute (tunneling) and auto-change also live under the node area.",
            ],
          },
        ],
      },
      {
        id: "other",
        title: "External configs, activity, backup & update",
        blocks: [
          {
            ul: [
              "External configs: extra configs appended to each link subscription; fallback URLs, a random URL and a protocol filter are supported. Can be set per reseller too.",
              "Activity log: every sign-in and change (who, when, which device/IP). Search by type (e.g. 'failed login'), user or IP.",
              "Backup & update: back up and restore from the panel, and update to a new version (it backs up first and rolls back if an update fails).",
            ],
          },
        ],
      },
      {
        id: "api",
        title: "REST API",
        blocks: [
          { p: "The panel exposes a full REST API. Most endpoints need a bearer token: log in, then send it in the Authorization header:" },
          { code: "curl -X POST https://YOUR-PANEL/api/admin/token \\\n     -d 'username=<admin>&password=<password>'\n# -> {\"access_token\": \"...\", \"token_type\": \"bearer\"}\n\ncurl https://YOUR-PANEL/api/users \\\n     -H 'Authorization: Bearer <access_token>'" },
          { p: "Subscription endpoints under /sub/... are public and authenticated by the token in the URL." },
          { p: "The full endpoint list and machine-readable schema live in the GitHub repo: docs/API.md and docs/openapi.json (import into Postman/Insomnia or Redoc). To enable the interactive Swagger UI, start the panel with DOCS=True (/docs and /redoc)." },
        ],
      },
    ],
  },
};

const RenderBlock: FC<{ block: Block }> = ({ block }) => {
  if ("h" in block)
    return (
      <Heading size="sm" mt={3} mb={1}>
        {block.h}
      </Heading>
    );
  if ("p" in block)
    return (
      <Text fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }} lineHeight="tall">
        {block.p}
      </Text>
    );
  if ("ul" in block)
    return (
      <UnorderedList spacing={1.5} pl={2}>
        {block.ul.map((li, i) => (
          <ListItem key={i} fontSize="sm" color="gray.600" _dark={{ color: "gray.300" }} lineHeight="tall">
            {li}
          </ListItem>
        ))}
      </UnorderedList>
    );
  return (
    <Code
      display="block"
      whiteSpace="pre-wrap"
      p={3}
      borderRadius="10px"
      fontSize="xs"
      w="full"
      overflowX="auto"
    >
      {block.code}
    </Code>
  );
};

export const DocumentationPage: FC = () => {
  const { i18n } = useTranslation();
  const lang = (i18n.language || "en").slice(0, 2);
  const doc = DOC[(lang === "tr" ? "tr" : "en") as "tr" | "en"];

  return (
    <VStack align="stretch" spacing={5} maxW="900px">
      <Box>
        <Heading size="lg" mb={1}>
          {doc.title}
        </Heading>
        <Text fontSize="sm" color="gray.500">
          {doc.intro}
        </Text>
      </Box>

      {/* table of contents */}
      <Box className="alexen-page" borderWidth="1px" borderRadius="16px" p={4}>
        <VStack align="stretch" spacing={1}>
          {doc.sections.map((s, i) => (
            <Link key={s.id} href={`#${s.id}`} fontSize="sm" color="primary.500" fontWeight="medium">
              {i + 1}. {s.title}
            </Link>
          ))}
        </VStack>
      </Box>

      {doc.sections.map((s) => (
        <Box key={s.id} id={s.id} className="alexen-page" borderWidth="1px" borderRadius="16px" p={5} scrollMarginTop="80px">
          <Heading size="md" mb={3}>
            {s.title}
          </Heading>
          <VStack align="stretch" spacing={2.5}>
            {s.blocks.map((b, i) => (
              <Fragment key={i}>
                <RenderBlock block={b} />
              </Fragment>
            ))}
          </VStack>
        </Box>
      ))}

      <Text fontSize="xs" color="gray.500" textAlign="center">
        <Badge colorScheme="primary" variant="subtle" mr={2}>
          Alexen
        </Badge>
        github.com/Alexander-official/alexen-panel · docs/API.md
      </Text>
    </VStack>
  );
};

export default DocumentationPage;
