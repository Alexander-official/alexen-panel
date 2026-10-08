// App sidebar, laid out like PasarGuard's: brand + version and a collapse
// button on top, a "Platform" group of compact nav rows (some with collapsible
// sub-menus), language/theme at the bottom and the signed-in admin as footer.
// Desktop: fixed, collapsible to an icon rail (remembered). Mobile: a drawer.
import {
  Avatar,
  Box,
  chakra,
  Collapse,
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerOverlay,
  HStack,
  IconButton,
  Text,
  Tooltip,
  useColorMode,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowTopRightOnSquareIcon,
  ArrowLeftOnRectangleIcon,
  ArrowPathIcon,
  ChartBarIcon,
  ChartPieIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  ChevronRightIcon,
  Cog6ToothIcon,
  CpuChipIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LinkIcon,
  ShareIcon,
  LockClosedIcon,
  ListBulletIcon,
  MoonIcon,
  RectangleGroupIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  Square3Stack3DIcon,
  SunIcon,
  UsersIcon,
  ArrowsRightLeftIcon,
  Squares2X2Icon,
  ClockIcon,
  SwatchIcon,
  BellAlertIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { BRAND_NAME } from "constants/Project";
import { useDashboard } from "contexts/DashboardContext";
import useGetUser from "hooks/useGetUser";
import { FC, ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import { useLocation, useNavigate } from "react-router-dom";
import { updateThemeColor } from "utils/themeColor";
import { create } from "zustand";
import { Language } from "./Language";
import { useNotifyCounts } from "./NotificationsPage";

export const SIDEBAR_WIDTH = "256px";
export const SIDEBAR_WIDTH_ICON = "56px";

const COLLAPSE_KEY = "alexen-sidebar-collapsed";
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
};

export const useSidebar = create<{
  isOpen: boolean;
  collapsed: boolean;
  setOpen: (v: boolean) => void;
  toggleCollapsed: () => void;
}>((set, get) => ({
  isOpen: false,
  collapsed: readCollapsed(),
  setOpen: (isOpen) => set({ isOpen }),
  toggleCollapsed: () => {
    const collapsed = !get().collapsed;
    try {
      localStorage.setItem(COLLAPSE_KEY, collapsed ? "1" : "0");
    } catch {}
    set({ collapsed });
  },
}));

/** current sidebar width on desktop, for the page padding */
export const useSidebarWidth = () =>
  useSidebar((s) => (s.collapsed ? SIDEBAR_WIDTH_ICON : SIDEBAR_WIDTH));

const ic = (Icon: any) => chakra(Icon, { baseStyle: { w: 4, h: 4, flexShrink: 0 } });

type NavLeaf = { title: string; path?: string; icon: any; action?: () => void; danger?: boolean; badge?: number };
type NavNode = NavLeaf & { items?: NavLeaf[] };

const activeBg = "color-mix(in srgb, var(--chakra-colors-primary-500) 14%, transparent)";

const Row: FC<{
  icon: any;
  label: string;
  active?: boolean;
  danger?: boolean;
  collapsed?: boolean;
  sub?: boolean;
  right?: ReactNode;
  badge?: number;
  onClick: () => void;
}> = ({ icon: Icon, label, active, danger, collapsed, sub, right, badge, onClick }) => {
  const row = (
    <HStack
      as="button"
      w="full"
      h={sub ? "30px" : "32px"}
      px={collapsed ? 0 : 2}
      justifyContent={collapsed ? "center" : "flex-start"}
      spacing={2}
      borderRadius="md"
      fontSize="sm"
      fontWeight={active ? "medium" : "normal"}
      textAlign="left"
      color={danger ? "red.500" : active ? "primary.600" : "gray.700"}
      bg={active ? activeBg : "transparent"}
      _dark={{ color: danger ? "red.300" : active ? "primary.200" : "gray.300" }}
      _hover={{ bg: active ? activeBg : "blackAlpha.50", _dark: { bg: active ? activeBg : "whiteAlpha.100" } }}
      onClick={onClick}
    >
      <Box position="relative" display="flex">
        <Icon />
        {collapsed && badge ? <Box position="absolute" top="-3px" right="-4px" w="8px" h="8px" borderRadius="full" bg="red.400" /> : null}
      </Box>
      {!collapsed && (
        <Text as="span" flex={1} isTruncated>
          {label}
        </Text>
      )}
      {!collapsed && badge ? (
        <Box as="span" minW="18px" h="18px" px={1} borderRadius="full" bg="red.400" color="white" fontSize="10px" fontWeight="bold" display="flex" alignItems="center" justifyContent="center">
          {badge > 99 ? "99+" : badge}
        </Box>
      ) : null}
      {!collapsed && right}
    </HStack>
  );
  return collapsed ? (
    <Tooltip label={label} placement="right" openDelay={200}>
      {row}
    </Tooltip>
  ) : (
    row
  );
};

const SidebarContent: FC<{ collapsed?: boolean; onNavigate?: () => void }> = ({ collapsed, onNavigate }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const here = pathname.replace(/^\/+|\/+$/g, "");
  const { userData, getUserIsSuccess } = useGetUser();
  const isSudo = getUserIsSuccess && userData.is_sudo;
  const version = useDashboard((s) => s.version);
  const onResetAllUsage = useDashboard((s) => s.onResetAllUsage);
  const { colorMode, toggleColorMode } = useColorMode();
  const toggleCollapsed = useSidebar((s) => s.toggleCollapsed);

  const go = (path: string) => {
    onNavigate?.();
    navigate(`/${path}`);
    window.scrollTo({ top: 0 });
  };

  // an admin the sudo admin lets edit its own external configs gets that page
  const { data: ownExternal } = useQuery({
    queryKey: "own-external",
    queryFn: () => fetch("/external-configs/mine"),
    enabled: getUserIsSuccess && !userData.is_sudo,
    retry: false,
    staleTime: 60000,
  });

  const { data: counts } = useNotifyCounts(getUserIsSuccess);
  const nav: NavNode[] = [
    { title: t("overview.title"), path: "overview", icon: ic(Squares2X2Icon) },
    { title: t("users"), path: "", icon: ic(UsersIcon) },
    { title: t("stats.title"), path: "statistics", icon: ic(ChartPieIcon) },
    ...(!isSudo && ownExternal ? [{ title: t("external.title"), path: "external", icon: ic(GlobeAltIcon) }] : []),
    { title: t("alerts.title"), path: "alerts", icon: ic(BellAlertIcon), badge: (counts?.alerts || 0) + (counts?.warnings || 0) },
    { title: t("messages.title"), path: "messages", icon: ic(ChatBubbleLeftRightIcon), badge: counts?.messages || 0 },
    { title: t("activity.title"), path: "activity", icon: ic(ClockIcon) },
    { title: t("appearance.title"), path: "theme", icon: ic(SwatchIcon) },
    ...(isSudo
      ? [
          { title: t("header.hostSettings"), path: "hosts", icon: ic(ListBulletIcon) },
          { title: t("header.groupSettings"), path: "groups", icon: ic(RectangleGroupIcon) },
          { title: t("header.adminsSettings"), path: "admins", icon: ic(ShieldCheckIcon) },
          { title: t("preroutePage.title"), path: "preroute", icon: ic(ShareIcon) },
          {
            title: t("sidebar.nodes"),
            path: "nodes",
            icon: ic(ServerStackIcon),
            items: [
              { title: t("header.nodeSettings"), path: "nodes", icon: ic(Square3Stack3DIcon) },
              { title: t("header.nodesUsage"), path: "nodes-usage", icon: ic(ChartBarIcon) },
              { title: t("sidebar.coreSettings"), path: "core", icon: ic(CpuChipIcon) },
              { title: t("outb.title"), path: "outbounds", icon: ic(ArrowTopRightOnSquareIcon) },
              { title: t("autoChange.title"), path: "auto-change", icon: ic(ArrowsRightLeftIcon) },
              { title: t("vpn.title"), path: "vpn", icon: ic(LockClosedIcon) },
            ],
          },
          {
            title: t("sidebar.settings"),
            path: "sub",
            icon: ic(Cog6ToothIcon),
            items: [
              { title: t("header.subSettings"), path: "sub", icon: ic(DocumentTextIcon) },
              { title: t("domain.title"), path: "domain", icon: ic(LinkIcon) },
              { title: t("external.title"), path: "external", icon: ic(GlobeAltIcon) },
              {
                title: t("resetAllUsage"),
                icon: ic(ArrowPathIcon),
                danger: true,
                action: () => {
                  onNavigate?.();
                  onResetAllUsage(true);
                },
              },
            ],
          },
        ]
      : []),
  ];

  // sub-menus start open when one of their pages is shown
  const [open, setOpen] = useState<Record<string, boolean>>({});
  useEffect(() => {
    nav.forEach((n) => {
      if (n.items?.some((i) => i.path === here)) setOpen((o) => ({ ...o, [n.title]: true }));
    });
  }, [here, isSudo]);

  const Logo = ic(ShieldCheckIcon);
  const Chevron = ic(ChevronRightIcon);
  const CollapseIcon = ic(ChevronDoubleLeftIcon);
  const ExpandIcon = ic(ChevronDoubleRightIcon);
  const ThemeIcon = ic(colorMode === "light" ? MoonIcon : SunIcon);
  const LogoutIcon = ic(ArrowLeftOnRectangleIcon);

  return (
    <VStack h="full" align="stretch" spacing={0}>
      {/* header: brand, version, collapse */}
      <HStack px={collapsed ? 2 : 3} py={3} spacing={2} justifyContent={collapsed ? "center" : "space-between"}>
        {collapsed ? (
          <Tooltip label={t("sidebar.expand")} placement="right">
            <IconButton
              aria-label="expand sidebar"
              size="sm"
              variant="ghost"
              icon={<ExpandIcon />}
              onClick={toggleCollapsed}
            />
          </Tooltip>
        ) : (
          <>
            <HStack spacing={2} minW={0}>
              <Box
                w="32px"
                h="32px"
                borderRadius="lg"
                bg="primary.500"
                color="white"
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexShrink={0}
              >
                <Logo w={5} h={5} />
              </Box>
              <Box minW={0} lineHeight="short">
                <Text fontSize="sm" fontWeight="semibold" isTruncated>
                  {BRAND_NAME}
                </Text>
                {version && (
                  <Text fontSize="xs" opacity={0.5} isTruncated>
                    v{version}
                  </Text>
                )}
              </Box>
            </HStack>
            {!onNavigate && (
              <Tooltip label={t("sidebar.collapse")} placement="right">
                <IconButton
                  aria-label="collapse sidebar"
                  size="sm"
                  variant="ghost"
                  borderRadius="full"
                  icon={<CollapseIcon />}
                  onClick={toggleCollapsed}
                />
              </Tooltip>
            )}
          </>
        )}
      </HStack>

      {/* main nav */}
      <Box flex={1} overflowY="auto" px={2} pb={2}>
        {!collapsed && (
          <Text px={2} pt={1} pb={1.5} fontSize="xs" fontWeight="medium" color="gray.500">
            {t("sidebar.platform")}
          </Text>
        )}
        <VStack align="stretch" spacing={0.5}>
          {nav.map((n) => {
            const childActive = n.items?.some((i) => i.path === here);
            if (!n.items) {
              return (
                <Row
                  key={n.title}
                  icon={n.icon}
                  label={n.title}
                  collapsed={collapsed}
                  badge={n.badge}
                  active={here === n.path}
                  onClick={() => go(n.path!)}
                />
              );
            }
            const isOpen = !!open[n.title];
            return (
              <Box key={n.title}>
                <Row
                  icon={n.icon}
                  label={n.title}
                  collapsed={collapsed}
                  active={collapsed && childActive}
                  right={
                    <Chevron
                      transition="transform .2s"
                      transform={isOpen ? "rotate(90deg)" : "none"}
                      opacity={0.6}
                    />
                  }
                  onClick={() =>
                    collapsed ? go(n.path!) : setOpen((o) => ({ ...o, [n.title]: !isOpen }))
                  }
                />
                {!collapsed && (
                  <Collapse in={isOpen} animateOpacity>
                    <VStack
                      align="stretch"
                      spacing={0.5}
                      ml="15px"
                      pl="10px"
                      my={0.5}
                      borderLeft="1px solid"
                      borderColor="light-border"
                      _dark={{ borderColor: "gray.600" }}
                    >
                      {n.items.map((i) => (
                        <Row
                          key={i.title}
                          sub
                          icon={i.icon}
                          label={i.title}
                          danger={i.danger}
                          active={!!i.path && here === i.path}
                          onClick={() => (i.action ? i.action() : go(i.path!))}
                        />
                      ))}
                    </VStack>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </VStack>
      </Box>

      {/* language + theme */}
      <HStack
        px={collapsed ? 0 : 3}
        py={2}
        spacing={2}
        justifyContent={collapsed ? "center" : "flex-end"}
        flexDirection={collapsed ? "column" : "row"}
      >
        <Language />
        <IconButton
          size="sm"
          variant="outline"
          aria-label="switch theme"
          icon={<ThemeIcon />}
          onClick={() => {
            updateThemeColor(colorMode == "dark" ? "light" : "dark");
            toggleColorMode();
          }}
        />
      </HStack>

      {/* signed-in admin */}
      <Box p={2} borderTop="1px solid" borderColor="light-border" _dark={{ borderColor: "gray.600" }}>
        <HStack
          spacing={2}
          p={collapsed ? 0 : 1.5}
          borderRadius="md"
          justifyContent={collapsed ? "center" : "flex-start"}
          flexDirection={collapsed ? "column" : "row"}
        >
          <Avatar size="sm" name={userData.username || "?"} bg="primary.500" color="white" />
          {!collapsed && (
            <Box minW={0} flex={1} lineHeight="short">
              <Text fontSize="sm" fontWeight="semibold" isTruncated>
                {userData.username}
              </Text>
              <Text fontSize="xs" color="gray.500" isTruncated>
                {isSudo ? t("sidebar.sudo") : t("sidebar.reseller")}
              </Text>
            </Box>
          )}
          <Tooltip label={t("header.logout")} placement={collapsed ? "right" : "top"}>
            <IconButton
              aria-label="logout"
              size="sm"
              variant="ghost"
              icon={<LogoutIcon />}
              onClick={() => {
                onNavigate?.();
                navigate("/login");
              }}
            />
          </Tooltip>
        </HStack>
      </Box>
    </VStack>
  );
};

export const Sidebar: FC = () => {
  const isOpen = useSidebar((s) => s.isOpen);
  const setOpen = useSidebar((s) => s.setOpen);
  const collapsed = useSidebar((s) => s.collapsed);
  const width = useSidebarWidth();
  return (
    <>
      <Box
        className="alexen-sidebar"
        display={{ base: "none", lg: "block" }}
        position="fixed"
        top={0}
        left={0}
        h="100dvh"
        w={width}
        zIndex={20}
        borderRight="1px solid"
        borderColor="light-border"
        _dark={{ borderColor: "gray.700" }}
      >
        <SidebarContent collapsed={collapsed} />
      </Box>
      <Drawer isOpen={isOpen} placement="left" onClose={() => setOpen(false)}>
        <DrawerOverlay bg="blackAlpha.400" />
        <DrawerContent maxW="288px" className="alexen-sidebar">
          <DrawerBody p={0} pt="env(safe-area-inset-top)">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};
