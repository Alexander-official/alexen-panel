import {
  Avatar,
  Box,
  chakra,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import {
  ArrowLeftOnRectangleIcon,
  ChartBarIcon,
  ChartPieIcon,
  Cog6ToothIcon,
  DocumentMinusIcon,
  DocumentTextIcon,
  LinkIcon,
  RectangleGroupIcon,
  ShieldCheckIcon,
  SquaresPlusIcon,
  UsersIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { BRAND_NAME } from "constants/Project";
import { useDashboard } from "contexts/DashboardContext";
import useGetUser from "hooks/useGetUser";
import { FC, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { create } from "zustand";

export const SIDEBAR_WIDTH = "240px";

export const useSidebar = create<{ isOpen: boolean; setOpen: (v: boolean) => void }>(
  (set) => ({ isOpen: false, setOpen: (isOpen) => set({ isOpen }) })
);

const icon = (Icon: any) => chakra(Icon, { baseStyle: { w: 5, h: 5 } });
const UsersNavIcon = icon(UsersIcon);
const StatsNavIcon = icon(ChartBarIcon);
const HostsNavIcon = icon(LinkIcon);
const GroupsNavIcon = icon(RectangleGroupIcon);
const SubNavIcon = icon(DocumentTextIcon);
const NodesNavIcon = icon(SquaresPlusIcon);
const NodesUsageNavIcon = icon(ChartPieIcon);
const AdminsNavIcon = icon(UserGroupIcon);
const CoreNavIcon = icon(Cog6ToothIcon);
const ResetNavIcon = icon(DocumentMinusIcon);
const LogoutNavIcon = icon(ArrowLeftOnRectangleIcon);
const BrandIcon = icon(ShieldCheckIcon);

const NavItem: FC<{
  icon: ReactNode;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}> = ({ icon, label, active, danger, onClick }) => (
  <HStack
    as="button"
    w="full"
    px={3}
    py={2}
    spacing={3}
    borderRadius="lg"
    fontSize="sm"
    fontWeight={active ? "semibold" : "medium"}
    textAlign="left"
    color={active ? "primary.600" : danger ? "red.500" : "gray.600"}
    bg={active ? "primary.50" : "transparent"}
    _dark={{
      color: active ? "primary.200" : danger ? "red.300" : "gray.300",
      bg: active ? "whiteAlpha.100" : "transparent",
    }}
    _hover={{ bg: "blackAlpha.50", _dark: { bg: "whiteAlpha.100" } }}
    onClick={onClick}
  >
    {icon}
    <Text isTruncated>{label}</Text>
  </HStack>
);

const SectionTitle: FC<{ children: ReactNode }> = ({ children }) => (
  <Text
    px={3}
    pt={3}
    pb={1}
    fontSize="xs"
    fontWeight="semibold"
    textTransform="uppercase"
    letterSpacing="wider"
    color="gray.400"
  >
    {children}
  </Text>
);

const SidebarContent: FC<{ onNavigate?: () => void }> = ({ onNavigate }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { userData, getUserIsSuccess } = useGetUser();
  const isSudo = getUserIsSuccess && userData.is_sudo;
  const {
    onEditingHosts,
    onResetAllUsage,
    onEditingNodes,
    onManagingAdmins,
    onShowingStats,
    onManagingGroups,
    onEditingSubSettings,
    onShowingNodesUsage,
  } = useDashboard();

  const go = (fn: () => void) => () => {
    onNavigate?.();
    fn();
  };

  return (
    <VStack h="full" align="stretch" spacing={1} p={3}>
      <HStack px={3} py={3} spacing={2}>
        <BrandIcon color="primary.500" />
        <Text fontWeight="bold" fontSize="lg" isTruncated>
          {BRAND_NAME}
        </Text>
      </HStack>

      <SectionTitle>{t("sidebar.main")}</SectionTitle>
      <NavItem
        icon={<UsersNavIcon />}
        label={t("users")}
        active
        onClick={go(() => window.scrollTo({ top: 0, behavior: "smooth" }))}
      />
      <NavItem
        icon={<StatsNavIcon />}
        label={t("stats.title")}
        onClick={go(() => onShowingStats(true))}
      />

      {isSudo && (
        <>
          <SectionTitle>{t("sidebar.management")}</SectionTitle>
          <NavItem
            icon={<AdminsNavIcon />}
            label={t("header.adminsSettings")}
            onClick={go(() => onManagingAdmins(true))}
          />
          <NavItem
            icon={<NodesNavIcon />}
            label={t("header.nodeSettings")}
            onClick={go(() => onEditingNodes(true))}
          />
          <NavItem
            icon={<NodesUsageNavIcon />}
            label={t("header.nodesUsage")}
            onClick={go(() => onShowingNodesUsage(true))}
          />
          <NavItem
            icon={<HostsNavIcon />}
            label={t("header.hostSettings")}
            onClick={go(() => onEditingHosts(true))}
          />
          <NavItem
            icon={<GroupsNavIcon />}
            label={t("header.groupSettings")}
            onClick={go(() => onManagingGroups(true))}
          />

          <SectionTitle>{t("sidebar.settings")}</SectionTitle>
          <NavItem
            icon={<SubNavIcon />}
            label={t("header.subSettings")}
            onClick={go(() => onEditingSubSettings(true))}
          />
          <NavItem
            icon={<CoreNavIcon />}
            label={t("sidebar.coreSettings")}
            onClick={go(() => useDashboard.setState({ isEditingCore: true }))}
          />
          <NavItem
            icon={<ResetNavIcon />}
            label={t("resetAllUsage")}
            danger
            onClick={go(() => onResetAllUsage(true))}
          />
        </>
      )}

      <Box flexGrow={1} />
      <Divider />
      <HStack px={2} py={2} spacing={3}>
        <Avatar size="sm" name={userData.username || "?"} bg="primary.500" color="white" />
        <Box minW={0} flexGrow={1}>
          <Text fontSize="sm" fontWeight="semibold" isTruncated>
            {userData.username}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {isSudo ? t("sidebar.sudo") : t("sidebar.reseller")}
          </Text>
        </Box>
      </HStack>
      <NavItem
        icon={<LogoutNavIcon />}
        label={t("header.logout")}
        onClick={go(() => navigate("/login"))}
      />
    </VStack>
  );
};

export const Sidebar: FC = () => {
  const { isOpen, setOpen } = useSidebar();
  return (
    <>
      <Box
        className="alexen-sidebar"
        display={{ base: "none", lg: "block" }}
        position="fixed"
        top={0}
        left={0}
        h="100vh"
        w={SIDEBAR_WIDTH}
        overflowY="auto"
        zIndex={20}
        bg="white"
        borderRight="1px solid"
        borderColor="gray.200"
        _dark={{ bg: "gray.800", borderColor: "gray.700" }}
      >
        <SidebarContent />
      </Box>
      <Drawer isOpen={isOpen} placement="left" onClose={() => setOpen(false)}>
        <DrawerOverlay bg="blackAlpha.300" backdropFilter="blur(6px)" />
        <DrawerContent maxW="270px" className="alexen-sidebar">
          <DrawerCloseButton mt={2} />
          <DrawerBody p={0}>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  );
};
