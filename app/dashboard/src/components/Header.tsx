import {
  Box,
  chakra,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuGroup,
  MenuItem,
  MenuList,
  Text,
  Tooltip,
  useColorMode,
} from "@chakra-ui/react";
import {
  ArrowLeftOnRectangleIcon,
  Bars3Icon,
  ChartPieIcon,
  Cog6ToothIcon,
  CurrencyDollarIcon,
  DocumentMinusIcon,
  LinkIcon,
  MoonIcon,
  DocumentTextIcon,
  RectangleGroupIcon,
  SquaresPlusIcon,
  SunIcon,
  SwatchIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";
import { useDashboard, useDashboardPick } from "contexts/DashboardContext";
import { FC, ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppearancePanel } from "./AppearancePanel";
import { useNotifyCounts } from "./NotificationsPage";
import { BellIcon as BellIconOutline } from "@heroicons/react/24/outline";
import { updateThemeColor } from "utils/themeColor";
import { applyAppearance, getAppearance } from "utils/appearance";
import { Language } from "./Language";
import useGetUser from "hooks/useGetUser";
import { useSidebar } from "./Sidebar";
import { sectionByPath } from "pages/sections";
import { useLocation, useNavigate } from "react-router-dom";

type HeaderProps = {
  actions?: ReactNode;
};
const iconProps = {
  baseStyle: {
    w: 4,
    h: 4,
  },
};

const DarkIcon = chakra(MoonIcon, iconProps);
const LightIcon = chakra(SunIcon, iconProps);
const CoreSettingsIcon = chakra(Cog6ToothIcon, iconProps);
const SettingsIcon = chakra(SwatchIcon, iconProps);
const MenuIcon = chakra(Bars3Icon, { baseStyle: { w: 5, h: 5 } });
const LogoutIcon = chakra(ArrowLeftOnRectangleIcon, iconProps);
const DonationIcon = chakra(CurrencyDollarIcon, iconProps);
const HostsIcon = chakra(LinkIcon, iconProps);
const NodesIcon = chakra(SquaresPlusIcon, iconProps);
const NodesUsageIcon = chakra(ChartPieIcon, iconProps);
const ResetUsageIcon = chakra(DocumentMinusIcon, iconProps);
const AdminsIcon = chakra(UsersIcon, iconProps);
const StatsIcon = chakra(ChartPieIcon, iconProps);
const GroupsIcon = chakra(RectangleGroupIcon, iconProps);
const SubIcon = chakra(DocumentTextIcon, iconProps);
const NotificationCircle = chakra(Box, {
  baseStyle: {
    bg: "yellow.500",
    w: "2",
    h: "2",
    rounded: "full",
    position: "absolute",
  },
});

export const Header: FC<HeaderProps> = ({ actions }) => {
  const { userData, getUserIsSuccess, getUserIsPending } = useGetUser();

  const isSudo = () => {
    if (!getUserIsPending && getUserIsSuccess) {
      return userData.is_sudo;
    }
    return false;
  };

  const {
    onEditingHosts,
    onResetAllUsage,
    onEditingNodes,
    onManagingAdmins,
    onShowingStats,
    onManagingGroups,
    onEditingSubSettings,
    onShowingNodesUsage,
  } = useDashboardPick("onEditingHosts", "onResetAllUsage", "onEditingNodes", "onManagingAdmins", "onShowingStats", "onManagingGroups", "onEditingSubSettings", "onShowingNodesUsage");
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const { colorMode } = useColorMode();
  useEffect(() => {
    applyAppearance(getAppearance());
  }, [colorMode]);

  return (
    <HStack
      gap={2}
      justifyContent="space-between"
      __css={{
        "& .menuList": {
          direction: "ltr",
        },
      }}
      position="relative"
    >
      <HStack spacing={2}>
        <IconButton
          display={{ base: "inline-flex", lg: "none" }}
          size="sm"
          variant="ghost"
          aria-label="menu"
          icon={<MenuIcon />}
          onClick={() => useSidebar.getState().setOpen(true)}
        />
        <Text as="h1" fontWeight="semibold" fontSize={{ base: "xl", md: "2xl" }} isTruncated>
          {t(sectionByPath(pathname)?.title || "users")}
        </Text>
      </HStack>

      <HStack spacing={2}>
      <NotifyBell />
      <Tooltip label={t("appearance.title")} hasArrow>
        <IconButton
          size="sm"
          variant="outline"
          borderRadius="full"
          aria-label={t("appearance.title")}
          icon={<SettingsIcon />}
          onClick={() => setAppearanceOpen(true)}
        />
      </Tooltip>
      </HStack>
      <AppearancePanel isOpen={appearanceOpen} onClose={() => setAppearanceOpen(false)} />
    </HStack>
  );
};


// unread alerts, messages and warnings; opens the page that has the news
const BellIcon = chakra(BellIconOutline, { baseStyle: { w: 4, h: 4 } });
const NotifyBell: FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data } = useNotifyCounts();
  const total = (data?.alerts || 0) + (data?.messages || 0) + (data?.warnings || 0);
  return (
    <Tooltip label={t("alerts.bell", { alerts: (data?.alerts || 0) + (data?.warnings || 0), messages: data?.messages || 0 })} hasArrow>
      <Box position="relative">
        <IconButton
          size="sm"
          variant="outline"
          borderRadius="full"
          aria-label={t("alerts.title")}
          icon={<BellIcon />}
          onClick={() => navigate(data?.messages && !data?.alerts && !data?.warnings ? "/messages" : "/alerts")}
        />
        {total > 0 && (
          <Box position="absolute" top="-4px" right="-4px" minW="18px" h="18px" px={1} borderRadius="full" bg="red.400" color="white" fontSize="10px" fontWeight="bold" display="flex" alignItems="center" justifyContent="center" pointerEvents="none">
            {total > 99 ? "99+" : total}
          </Box>
        )}
      </Box>
    </Tooltip>
  );
};
