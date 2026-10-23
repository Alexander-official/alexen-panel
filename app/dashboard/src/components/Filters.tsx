import {
  BoxProps,
  Button,
  chakra,
  Grid,
  GridItem,
  HStack,
  IconButton,
  Input,
  InputGroup,
  Select,
  InputLeftElement,
  InputRightElement,
  Spinner,
} from "@chakra-ui/react";
import {
  ArrowPathIcon,
  Bars3BottomLeftIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { lazy, Suspense } from "react";
import classNames from "classnames";
import { useDashboard, useDashboardPick } from "contexts/DashboardContext";
import debounce from "lodash.debounce";
import React, { FC, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import useGetUser from "hooks/useGetUser";

const iconProps = {
  baseStyle: {
    w: 4,
    h: 4,
  },
};

const SearchIcon = chakra(MagnifyingGlassIcon, iconProps);
const ClearIcon = chakra(XMarkIcon, iconProps);
export const ReloadIcon = chakra(ArrowPathIcon, iconProps);

export type FilterProps = {} & BoxProps;
const setSearchField = debounce((search: string) => {
  useDashboard.getState().onFilterChange({
    ...useDashboard.getState().filters,
    offset: 0,
    search,
  });
}, 300);

export const Filters: FC<FilterProps> = ({ ...props }) => {
  const { loading, filters, onFilterChange, refetchUsers, onCreateUser } = useDashboardPick("loading", "filters", "onFilterChange", "refetchUsers", "onCreateUser");
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const { userData } = useGetUser();
  const isSudo = !!userData?.is_sudo;
  const [bulkOpen, setBulkOpen] = useState(false);
  const [cleanupOpen, setCleanupOpen] = useState(false);
  // the admins a sudo may filter by (names only); regular admins don't see this
  const { data: admins } = useQuery<{ username: string; is_sudo: boolean }[]>({
    queryKey: "filter-admins",
    queryFn: () => fetch("/admins"),
    enabled: isSudo,
    staleTime: 60000,
  });
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
    setSearchField(e.target.value);
  };
  const clear = () => {
    setSearch("");
    onFilterChange({
      ...filters,
      offset: 0,
      search: "",
    });
  };
  return (
    <Grid
      id="filters"
      templateColumns={{
        lg: "repeat(3, 1fr)",
        md: "repeat(4, 1fr)",
        base: "repeat(1, 1fr)",
      }}
      position="relative"
      rowGap={{ base: 2, md: 4 }}
      gap={{
        lg: 4,
        base: 0,
      }}
      py={{ base: 2, md: 4 }}
      zIndex="docked"
      {...props}
    >
      <GridItem colSpan={{ base: 1, md: 2, lg: 1 }} order={{ base: 2, md: 1 }}>
        <InputGroup>
          <InputLeftElement pointerEvents="none" children={<SearchIcon />} />
          <Input
            placeholder={t("search")}
            value={search}
            borderColor="light-border"
            onChange={onChange}
          />

          <InputRightElement>
            {loading && <Spinner size="xs" />}
            {filters.search && filters.search.length > 0 && (
              <IconButton
                onClick={clear}
                aria-label="clear"
                size="xs"
                variant="ghost"
              >
                <ClearIcon />
              </IconButton>
            )}
          </InputRightElement>
        </InputGroup>
      </GridItem>
      <GridItem colSpan={2} order={{ base: 1, md: 2 }}>
        <HStack justifyContent="flex-end" alignItems="center" h="full" flexWrap={{ base: "wrap", md: "nowrap" }} gap={2}>
          <Select
            size="sm"
            flex={{ base: 1, md: "initial" }}
            minW={{ base: "120px", md: "auto" }}
            maxW={{ base: "none", md: "150px" }}
            borderColor="light-border"
            value={filters.status || ""}
            onChange={(e) => onFilterChange({ status: (e.target.value || undefined) as any, offset: 0 })}
          >
            <option value="">{t("filters.allStatus")}</option>
            <option value="active">{t("status.active")}</option>
            <option value="on_hold">{t("status.on_hold")}</option>
            <option value="disabled">{t("status.disabled")}</option>
            <option value="limited">{t("status.limited")}</option>
            <option value="expired">{t("status.expired")}</option>
          </Select>
          {isSudo && (admins?.length || 0) > 0 && (
            <Select
              size="sm"
              flex={{ base: 1, md: "initial" }}
              minW={{ base: "120px", md: "auto" }}
              maxW={{ base: "none", md: "170px" }}
              borderColor="light-border"
              value={filters.admin || ""}
              onChange={(e) => onFilterChange({ admin: e.target.value || undefined, offset: 0 })}
            >
              <option value="">{t("filters.allAdmins")}</option>
              {admins!.map((a) => (
                <option key={a.username} value={a.username}>
                  {a.username}
                </option>
              ))}
            </Select>
          )}
          <Select
            size="sm"
            maxW={{ base: "none", md: "160px" }}
            flex={{ base: 1, md: "initial" }}
            minW={0}
            borderColor="light-border"
            value={filters.sort || "-created_at"}
            onChange={(e) => onFilterChange({ sort: e.target.value, offset: 0 })}
          >
            <option value="-created_at">{t("sort.newest")}</option>
            <option value="username">{t("sort.username")}</option>
            <option value="-used_traffic">{t("sort.usage")}</option>
            <option value="expire">{t("sort.expire")}</option>
            <option value="-online_ip_count">{t("sort.onlineIps")}</option>
            <option value="-hwid_count">{t("sort.devices")}</option>
          </Select>
          <IconButton
            aria-label="refresh users"
            disabled={loading}
            onClick={refetchUsers}
            size="sm"
            variant="outline"
          >
            <ReloadIcon
              className={classNames({
                "animate-spin": loading,
              })}
            />
          </IconButton>
          {isSudo && (
            <IconButton
              aria-label={t("bulkProto.title")}
              title={t("bulkProto.title")}
              size="sm"
              variant="outline"
              onClick={() => setBulkOpen(true)}
            >
              <chakra.span display="inline-flex"><Bars3BottomLeftIcon width={18} /></chakra.span>
            </IconButton>
          )}
          {isSudo && (
            <IconButton
              aria-label={t("cleanup.title")}
              title={t("cleanup.title")}
              size="sm"
              variant="outline"
              onClick={() => setCleanupOpen(true)}
            >
              <chakra.span display="inline-flex"><TrashIcon width={18} /></chakra.span>
            </IconButton>
          )}
          <Button
            colorScheme="primary"
            size="sm"
            onClick={() => onCreateUser(true)}
            px={{ base: 3, md: 5 }}
            flexShrink={0}
          >
            {t("createUser")}
          </Button>
        </HStack>
      </GridItem>
      {bulkOpen && (
        <Suspense fallback={null}>
          <BulkProtocol isOpen={bulkOpen} onClose={() => setBulkOpen(false)} adminFilter={filters.admin} />
        </Suspense>
      )}
      {cleanupOpen && (
        <Suspense fallback={null}>
          <ExpiredCleanup isOpen={cleanupOpen} onClose={() => setCleanupOpen(false)} onDeleted={refetchUsers} />
        </Suspense>
      )}
    </Grid>
  );
};

const BulkProtocol = lazy(() => import("components/BulkProtocolModal"));
const ExpiredCleanup = lazy(() => import("components/ExpiredCleanupModal"));
