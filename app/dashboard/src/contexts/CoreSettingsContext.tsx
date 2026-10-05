import { useQuery } from "react-query";
import { fetch } from "service/http";
import { create } from "zustand";

export type CoreInfo = {
  id: string;
  name: string;
  inbounds: string[];
};

export const MAIN_CORE = "main";
export const FetchCoresQueryKey = "fetch-cores-query-key";

export const useCoresQuery = () =>
  useQuery<CoreInfo[]>({
    queryKey: FetchCoresQueryKey,
    queryFn: () => fetch("/cores"),
    refetchOnWindowFocus: false,
  });

export const fetchCoreConfig = (coreId: string): Promise<any> =>
  fetch(`/cores/${coreId}/config`);

export const saveCoreConfig = (coreId: string, config: any): Promise<any> =>
  fetch(`/cores/${coreId}/config`, { method: "PUT", body: config });

type CoreSettingsStore = {
  isLoading: boolean;
  isPostLoading: boolean;
  // the core whose config is open in the editor
  coreId: string;
  setCoreId: (coreId: string) => void;
  fetchCoreSettings: () => void;
  updateConfig: (json: any) => Promise<void>;
  restartCore: () => Promise<void>;
  createCore: (name: string, copyFrom?: string) => Promise<CoreInfo>;
  renameCore: (coreId: string, name: string) => Promise<CoreInfo>;
  deleteCore: (coreId: string) => Promise<void>;
  version: string | null;
  started: boolean | null;
  logs_websocket: string | null;
  config: any;
};

export const useCoreSettings = create<CoreSettingsStore>((set, get) => ({
  isLoading: true,
  isPostLoading: false,
  coreId: MAIN_CORE,
  version: null,
  started: false,
  logs_websocket: null,
  config: "",
  setCoreId: (coreId) => {
    set({ coreId });
    get().fetchCoreSettings();
  },
  fetchCoreSettings: () => {
    const coreId = get().coreId;
    set({ isLoading: true });
    Promise.all([
      fetch("/core").then(({ version, started, logs_websocket }) =>
        set({ version, started, logs_websocket })
      ),
      fetchCoreConfig(coreId).then((config) => {
        // ignore a late answer for a core that's no longer selected
        if (get().coreId === coreId) set({ config });
      }),
    ]).finally(() => set({ isLoading: false }));
  },
  updateConfig: (body) => {
    set({ isPostLoading: true });
    return saveCoreConfig(get().coreId, body).finally(() => {
      set({ isPostLoading: false });
    });
  },
  restartCore: () => {
    return fetch("/core/restart", { method: "POST" });
  },
  createCore: (name, copyFrom = MAIN_CORE) =>
    fetch("/cores", { method: "POST", body: { name, copy_from: copyFrom } }),
  renameCore: (coreId, name) =>
    fetch(`/cores/${coreId}`, { method: "PUT", body: { name } }),
  deleteCore: (coreId) => fetch(`/cores/${coreId}`, { method: "DELETE" }),
}));
