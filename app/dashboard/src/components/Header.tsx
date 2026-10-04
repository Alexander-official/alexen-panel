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
import { DONATION_URL, REPO_URL } from "constants/Project";
import { useDashboard } from "contexts/DashboardContext";
import differenceInDays from "date-fns/differenceInDays";
import isValid from "date-fns/isValid";
import { FC, ReactNode, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { updateThemeColor } from "utils/themeColor";
import {
  ACCENTS,
  AccentName,
  applyAppearance,
  Appearance,
  BACKGROUNDS,
  Background,
  getAppearance,
  Surface,
} from "utils/appearance";
import { Language } from "./Language";
import useGetUser from "hooks/useGetUser";
import { useSidebar } from "./Sidebar";

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

const NOTIFICATION_KEY = "marzban-menu-notification";

export const shouldShowDonation = (): boolean => {
  const date = localStorage.getItem(NOTIFICATION_KEY);
  if (!date) return true;
  try {
    if (date && isValid(parseInt(date))) {
      if (differenceInDays(new Date(), new Date(parseInt(date))) >= 7)
        return true;
      return false;
    }
    return true;
  } catch (err) {
    return true;
  }
};

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
  } = useDashboard();
  const { t } = useTranslation();
  const [appearance, setAppearance] = useState(getAppearance());
  const update = (patch: Partial<Appearance>) => {
    const next = { ...appearance, ...patch };
    applyAppearance(next);
    setAppearance(next);
  };
  const { colorMode, toggleColorMode } = useColorMode();
  useEffect(() => {
    applyAppearance(getAppearance());
  }, [colorMode]);
  const [showDonationNotif, setShowDonationNotif] = useState(
    shouldShowDonation()
  );

  const handleOnClose = () => {
    localStorage.setItem(NOTIFICATION_KEY, new Date().getTime().toString());
    setShowDonationNotif(false);
  };

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
        <Text as="h1" fontWeight="semibold" fontSize="2xl">
          {t("users")}
        </Text>
      </HStack>
      {showDonationNotif && (
        <NotificationCircle top="0" right="0" zIndex={9999} />
      )}
      <Box overflow="auto" css={{ direction: "rtl" }}>
        <HStack alignItems="center">
          <Menu>
            <MenuButton
              as={IconButton}
              size="sm"
              variant="outline"
              icon={
                <>
                  <SettingsIcon />
                </>
              }
              position="relative"
            ></MenuButton>
            <MenuList minW="170px" zIndex={99999} className="menuList">
              <MenuGroup title={t("header.accentColor")} fontSize="xs">
                <Box px={3} py={1} display="flex" gap={2}>
                  {(Object.keys(ACCENTS) as AccentName[]).map((name) => (
                    <Box
                      key={name}
                      as="button"
                      w="18px"
                      h="18px"
                      borderRadius="full"
                      bg={ACCENTS[name][500]}
                      border="2px solid"
                      borderColor={
                        appearance.accent === name ? "gray.500" : "transparent"
                      }
                      onClick={() => update({ accent: name })}
                    />
                  ))}
                </Box>
              </MenuGroup>
              <MenuGroup title={t("header.background")} fontSize="xs">
                <Box px={3} py={1} display="flex" gap={2}>
                  {(Object.keys(BACKGROUNDS) as Background[]).map((name) => (
                    <Box
                      key={name}
                      as="button"
                      w="18px"
                      h="18px"
                      borderRadius="md"
                      bg={BACKGROUNDS[name].swatch}
                      border="2px solid"
                      borderColor={
                        appearance.background === name
                          ? "gray.500"
                          : "transparent"
                      }
                      onClick={() => update({ background: name })}
                    />
                  ))}
                </Box>
              </MenuGroup>
              <MenuItem
                fontSize="sm"
                onClick={() =>
                  update({
                    surface:
                      appearance.surface === "glass" ? "minimal" : "glass",
                  })
                }
              >
                {appearance.surface === "glass"
                  ? t("header.styleMinimal")
                  : t("header.styleGlass")}
              </MenuItem>
              <MenuItem
                fontSize="sm"
                onClick={() => update({ animations: !appearance.animations })}
              >
                {appearance.animations
                  ? t("header.animationsOff")
                  : t("header.animationsOn")}
              </MenuItem>
              <MenuDivider />
              <Link to={DONATION_URL} target="_blank">
                <MenuItem
                  maxW="170px"
                  fontSize="sm"
                  icon={<DonationIcon />}
                  position="relative"
                  onClick={handleOnClose}
                >
                  {t("header.donation")}{" "}
                  {showDonationNotif && (
                    <NotificationCircle top="3" right="2" />
                  )}
                </MenuItem>
              </Link>
              <Link to="/login">
                <MenuItem maxW="170px" fontSize="sm" icon={<LogoutIcon />}>
                  {t("header.logout")}
                </MenuItem>
              </Link>
            </MenuList>
          </Menu>

          <Language />

          <IconButton
            size="sm"
            variant="outline"
            aria-label="switch theme"
            onClick={() => {
              updateThemeColor(colorMode == "dark" ? "light" : "dark");
              toggleColorMode();
            }}
          >
            {colorMode === "light" ? <DarkIcon /> : <LightIcon />}
          </IconButton>

          {/* vendor brand badge intentionally minimal */}
        </HStack>
      </Box>
    </HStack>
  );
};
