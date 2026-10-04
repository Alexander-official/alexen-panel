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
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import classNames from "classnames";
import { useDashboard } from "contexts/DashboardContext";
import debounce from "lodash.debounce";
import React, { FC, useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { loading, filters, onFilterChange, refetchUsers, onCreateUser } =
    useDashboard();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
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
        <HStack justifyContent="flex-end" alignItems="center" h="full">
          <Select
            size="sm"
            maxW={{ base: "none", md: "190px" }}
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
    </Grid>
  );
};
