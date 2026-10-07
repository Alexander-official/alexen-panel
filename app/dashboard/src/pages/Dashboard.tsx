import { named } from "utils/lazyLoad";
import { Box, VStack } from "@chakra-ui/react";
import { DeleteUserModal } from "components/DeleteUserModal";
import { Filters } from "components/Filters";
import { Footer } from "components/Footer";
import { Header } from "components/Header";
import { Sidebar, useSidebarWidth } from "components/Sidebar";
import { ResetAllUsageModal } from "components/ResetAllUsageModal";
import { ResetUserUsageModal } from "components/ResetUserUsageModal";
import { RevokeSubscriptionModal } from "components/RevokeSubscriptionModal";
import { UserDialog } from "components/UserDialog";
import { UsersTable } from "components/UsersTable";
import { fetchInbounds, useDashboard } from "contexts/DashboardContext";
import { FC, ReactNode, Suspense, useEffect, useState } from "react";
import { Statistics } from "../components/Statistics";
import { Outlet } from "react-router-dom";

// the users list, the default page
export const UsersView: FC = () => (
  <>
    <Statistics mt={{ base: 3, md: 4 }} />
    <Filters />
    <UsersTable />
  </>
);

// The QR window pulls in a carousel; fetch it the first time it opens.
// Other sections are pages, see pages/sections.tsx.


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
  const sidebarWidth = useSidebarWidth();
  const s = {
    QRcodeLinks: useDashboard((d) => d.QRcodeLinks),
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
        pl={{ base: 3, md: 6, lg: `calc(${sidebarWidth} + 1.5rem)` }}
        rowGap={4}
      >
        <Box w="full">
          <Header />
          <Outlet />
          <UserDialog />
          <DeleteUserModal />
          <ResetUserUsageModal />
          <RevokeSubscriptionModal />
          <ResetAllUsageModal />
          <OnFirstOpen when={s.QRcodeLinks !== null}>
            <QRCodeDialog />
          </OnFirstOpen>
        </Box>
        <Footer />
      </VStack>
    </>
  );
};

export default Dashboard;
