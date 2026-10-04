import { Box, VStack } from "@chakra-ui/react";
import { DeleteUserModal } from "components/DeleteUserModal";
import { Filters } from "components/Filters";
import { Footer } from "components/Footer";
import { Header } from "components/Header";
import { Sidebar, SIDEBAR_WIDTH } from "components/Sidebar";
import { ResetAllUsageModal } from "components/ResetAllUsageModal";
import { ResetUserUsageModal } from "components/ResetUserUsageModal";
import { RevokeSubscriptionModal } from "components/RevokeSubscriptionModal";
import { UserDialog } from "components/UserDialog";
import { UsersTable } from "components/UsersTable";
import { fetchInbounds, useDashboard } from "contexts/DashboardContext";
import { FC, lazy, ReactNode, Suspense, useEffect, useState } from "react";
import { Statistics } from "../components/Statistics";

// Rarely used windows pull in heavy libraries (json editor, charts, carousel).
// They are split into their own chunks and only fetched the first time they open.
const named = <T extends string>(loader: () => Promise<Record<T, any>>, name: T) =>
  lazy(() => loader().then((m) => ({ default: m[name] })));

const AdminsModal = named(() => import("components/AdminsModal"), "AdminsModal");
const StatisticsModal = named(() => import("components/StatisticsModal"), "StatisticsModal");
const GroupSettingsModal = named(() => import("components/GroupSettingsModal"), "GroupSettingsModal");
const SubSettingsModal = named(() => import("components/SubSettingsModal"), "SubSettingsModal");
const CoreSettingsModal = named(() => import("components/CoreSettingsModal"), "CoreSettingsModal");
const HostsDialog = named(() => import("components/HostsDialog"), "HostsDialog");
const NodesDialog = named(() => import("components/NodesModal"), "NodesDialog");
const NodesUsage = named(() => import("components/NodesUsage"), "NodesUsage");
const QRCodeDialog = named(() => import("components/QRCodeDialog"), "QRCodeDialog");

// mounts its children the first time `when` is true, then keeps them mounted
// so the close animation still plays
const OnFirstOpen: FC<{ when: boolean; children: ReactNode }> = ({ when, children }) => {
  const [seen, setSeen] = useState(when);
  useEffect(() => {
    if (when) setSeen(true);
  }, [when]);
  return seen || when ? <Suspense fallback={null}>{children}</Suspense> : null;
};

export const Dashboard: FC = () => {
  useEffect(() => {
    useDashboard.getState().refetchUsers();
    fetchInbounds();
  }, []);
  // per-flag selectors so the page doesn't re-render on every store change
  const s = {
    QRcodeLinks: useDashboard((d) => d.QRcodeLinks),
    isEditingHosts: useDashboard((d) => d.isEditingHosts),
    isManagingAdmins: useDashboard((d) => d.isManagingAdmins),
    isShowingStats: useDashboard((d) => d.isShowingStats),
    isManagingGroups: useDashboard((d) => d.isManagingGroups),
    isEditingSubSettings: useDashboard((d) => d.isEditingSubSettings),
    isEditingNodes: useDashboard((d) => d.isEditingNodes),
    isShowingNodesUsage: useDashboard((d) => d.isShowingNodesUsage),
    isEditingCore: useDashboard((d) => d.isEditingCore),
  };
  return (
    <>
      <Sidebar />
      <VStack
        justifyContent="space-between"
        minH="100dvh"
        px={{ base: 3, md: 6 }}
        pt={{ base: 3, md: 6 }}
        pb={{ base: "calc(12px + env(safe-area-inset-bottom))", md: 6 }}
        pl={{ base: 3, md: 6, lg: `calc(${SIDEBAR_WIDTH} + 1.5rem)` }}
        rowGap={4}
      >
        <Box w="full">
          <Header />
          <Statistics mt={{ base: 3, md: 4 }} />
          <Filters />
          <UsersTable />
          <UserDialog />
          <DeleteUserModal />
          <ResetUserUsageModal />
          <RevokeSubscriptionModal />
          <ResetAllUsageModal />
          <OnFirstOpen when={s.QRcodeLinks !== null}>
            <QRCodeDialog />
          </OnFirstOpen>
          <OnFirstOpen when={s.isEditingHosts}>
            <HostsDialog />
          </OnFirstOpen>
          <OnFirstOpen when={s.isManagingAdmins}>
            <AdminsModal />
          </OnFirstOpen>
          <OnFirstOpen when={s.isShowingStats}>
            <StatisticsModal />
          </OnFirstOpen>
          <OnFirstOpen when={s.isManagingGroups}>
            <GroupSettingsModal />
          </OnFirstOpen>
          <OnFirstOpen when={s.isEditingSubSettings}>
            <SubSettingsModal />
          </OnFirstOpen>
          <OnFirstOpen when={s.isEditingNodes}>
            <NodesDialog />
          </OnFirstOpen>
          <OnFirstOpen when={s.isShowingNodesUsage}>
            <NodesUsage />
          </OnFirstOpen>
          <OnFirstOpen when={s.isEditingCore}>
            <CoreSettingsModal />
          </OnFirstOpen>
        </Box>
        <Footer />
      </VStack>
    </>
  );
};

export default Dashboard;
