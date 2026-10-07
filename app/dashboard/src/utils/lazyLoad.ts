import { lazy } from "react";

// After an update the old page files are gone; a tab opened before it then
// fails to load a page. Reload once to get the new version (not in a loop).
const KEY = "alexen-chunk-reload";
export const isChunkError = (e: any) =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk/i.test(
    String(e?.message || e)
  );
export const reloadForUpdate = () => {
  try {
    const last = Number(sessionStorage.getItem(KEY) || 0);
    if (Date.now() - last < 15000) return false;
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {}
  window.location.reload();
  return true;
};

export const named = <T extends string>(loader: () => Promise<Record<T, any>>, name: T) =>
  lazy(() =>
    loader()
      .then((m) => ({ default: m[name] }))
      .catch((e) => {
        if (isChunkError(e) && reloadForUpdate()) return new Promise<never>(() => {});
        throw e;
      })
  );
