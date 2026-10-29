// The panel's brand (name, vendor, support), editable by the creator at /brand.
// Public endpoint, so it also works on the login page before sign-in. Falls back
// to the built-in defaults while loading or if the request fails.
import { BRAND_NAME, BRAND_VENDOR, SUPPORT_TELEGRAM, SUPPORT_URL } from "constants/Project";
import i18n from "locales/i18n";
import { useQuery } from "react-query";
import { fetch } from "service/http";
import { setBrandName } from "utils/brandState";

export type Brand = {
  name: string;
  vendor: string;
  support_telegram: string;
  support_url: string;
};

export const DEFAULT_BRAND: Brand = {
  name: BRAND_NAME,
  vendor: BRAND_VENDOR,
  support_telegram: SUPPORT_TELEGRAM,
  support_url: SUPPORT_URL,
};

export default function useBrand(): Brand {
  const { data } = useQuery<Brand>({
    queryKey: "brand",
    queryFn: () => fetch("/brand"),
    staleTime: Infinity,
    cacheTime: Infinity,
    retry: false,
    onSuccess: (d) => {
      // feed the i18n brand post-processor; refresh strings only if the name changed
      if (d?.name && setBrandName(d.name)) i18n.changeLanguage(i18n.language);
      if (d?.name) document.title = d.name; // browser tab / bookmark
    },
  });
  return data ?? DEFAULT_BRAND;
}
