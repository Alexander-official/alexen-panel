import { FetchOptions, $fetch as ohMyFetch } from "ofetch";
import { getAuthToken } from "utils/authStorage";
import { notifyLoadError } from "utils/loadErrorToast";

export const $fetch = ohMyFetch.create({
  baseURL: import.meta.env.VITE_BASE_API,
});

export const fetcher = <T = any>(
  url: string,
  ops: FetchOptions<"json"> = {}
) => {
  const token = getAuthToken();
  if (token) {
    ops["headers"] = {
      ...(ops?.headers || {}),
      Authorization: `Bearer ${getAuthToken()}`,
    };
  }
  return $fetch<T>(url, ops).catch((err: any) => {
    const status = err?.response?.status;
    const method = String(ops?.method || "GET").toUpperCase();
    // loads only: a failed save already shows its own message where it happened
    const aborted = err?.name === "AbortError" || err?.cause?.name === "AbortError";
    if (method === "GET" && !aborted && (!status || status >= 500)) notifyLoadError(status);
    throw err;
  }) as Promise<T>;
};

export const fetch = fetcher;
