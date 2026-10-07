// Panel sections that open as their own page (tab) instead of a pop-up.
// Each one reuses the existing window component inside <AsPage>.
import { Box } from "@chakra-ui/react";
import { AsPage } from "components/PageSurface";
import { useDashboard } from "contexts/DashboardContext";
import useGetUser from "hooks/useGetUser";
import { FC, lazy, Suspense, useEffect } from "react";
import { Navigate } from "react-router-dom";

const named = <T extends string>(loader: () => Promise<Record<T, any>>, name: T) =>
  lazy(() => loader().then((m) => ({ default: m[name] })));

type Flag =
  | "isShowingStats"
  | "isManagingAdmins"
  | "isEditingNodes"
  | "isShowingNodesUsage"
  | "isEditingHosts"
  | "isEditingSubSettings"
  | "isEditingCore";

export type Section = {
  path: string;
  title: string; // i18n key
  sudo: boolean;
  flag?: Flag;
  Component: FC;
};

export const SECTIONS: Section[] = [
  {
    path: "theme",
    title: "appearance.title",
    sudo: false,
    Component: named(() => import("components/AppearancePanel"), "ThemePage"),
  },
  {
    path: "activity",
    title: "activity.title",
    sudo: false,
    Component: named(() => import("components/ActivityPage"), "ActivityPage"),
  },
  {
    path: "overview",
    title: "overview.title",
    sudo: false,
    Component: named(() => import("components/OverviewPage"), "OverviewPage"),
  },
  {
    path: "statistics",
    title: "stats.title",
    sudo: false,
    flag: "isShowingStats",
    Component: named(() => import("components/StatisticsModal"), "StatisticsModal"),
  },
  {
    path: "admins",
    title: "header.adminsSettings",
    sudo: true,
    flag: "isManagingAdmins",
    Component: named(() => import("components/AdminsModal"), "AdminsModal"),
  },
  {
    path: "nodes",
    title: "header.nodeSettings",
    sudo: true,
    flag: "isEditingNodes",
    Component: named(() => import("components/NodesModal"), "NodesDialog"),
  },
  {
    path: "nodes-usage",
    title: "header.nodesUsage",
    sudo: true,
    flag: "isShowingNodesUsage",
    Component: named(() => import("components/NodesUsage"), "NodesUsage"),
  },
  {
    path: "hosts",
    title: "header.hostSettings",
    sudo: true,
    flag: "isEditingHosts",
    Component: named(() => import("components/HostsDialog"), "HostsDialog"),
  },
  {
    path: "groups",
    title: "header.groupSettings",
    sudo: true,
    Component: named(() => import("components/GroupsPage"), "GroupsPage"),
  },
  {
    path: "sub",
    title: "header.subSettings",
    sudo: true,
    flag: "isEditingSubSettings",
    Component: named(() => import("components/SubSettingsModal"), "SubSettingsModal"),
  },
  {
    path: "domain",
    title: "domain.title",
    sudo: true,
    Component: named(() => import("components/DomainSettingsPage"), "DomainSettingsPage"),
  },
  {
    path: "external",
    title: "external.title",
    sudo: false, // admins allowed by the sudo admin edit their own list
    Component: named(() => import("components/ExternalConfigsPage"), "ExternalConfigsPage"),
  },
  {
    path: "auto-change",
    title: "autoChange.title",
    sudo: true,
    Component: named(() => import("components/AutoChangePage"), "AutoChangePage"),
  },
  {
    path: "preroute",
    title: "preroutePage.title",
    sudo: true,
    Component: named(() => import("components/PreroutePage"), "PreroutePage"),
  },
  {
    path: "vpn",
    title: "vpn.title",
    sudo: true,
    Component: named(() => import("components/VpnPage"), "VpnPage"),
  },
  {
    path: "core",
    title: "sidebar.coreSettings",
    sudo: true,
    flag: "isEditingCore",
    Component: named(() => import("components/CoreSettingsModal"), "CoreSettingsModal"),
  },
];

export const sectionByPath = (pathname: string) =>
  SECTIONS.find((s) => pathname.replace(/^\/+|\/+$/g, "") === s.path);

// The window components fetch data and render only while their store flag is
// on, so a page holds the flag on for as long as it is shown (a window that
// "closes itself" after saving is simply reopened) and turns it off on leave.
const HoldFlag: FC<{ flag: Flag }> = ({ flag }) => {
  const on = useDashboard((s) => s[flag]);
  useEffect(() => {
    if (!on) useDashboard.setState({ [flag]: true } as any);
  }, [on, flag]);
  useEffect(() => () => useDashboard.setState({ [flag]: false } as any), [flag]);
  return null;
};

export const SectionPage: FC<{ section: Section }> = ({ section }) => {
  const { Component, flag } = section;
  const { userData, getUserIsSuccess } = useGetUser();
  // admins (non-sudo) only get the sections meant for them
  if (section.sudo && getUserIsSuccess && !userData.is_sudo) return <Navigate to="/" replace />;
  if (section.sudo && !getUserIsSuccess) return null;
  return (
    <Box w="full" mt={{ base: 3, md: 4 }}>
      {flag && <HoldFlag flag={flag} />}
      <Suspense fallback={null}>
        <AsPage>
          <Component />
        </AsPage>
      </Suspense>
    </Box>
  );
};
