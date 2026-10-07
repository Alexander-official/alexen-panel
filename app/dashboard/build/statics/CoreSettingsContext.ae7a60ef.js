import { O as create, g as useQuery } from "./vendor.0404bf65.js";
import { f as fetch } from "./index.e0e646b5.js";
const MAIN_CORE = "main";
const FetchCoresQueryKey = "fetch-cores-query-key";
const useCoresQuery = () => useQuery({
  queryKey: FetchCoresQueryKey,
  queryFn: () => fetch("/cores"),
  refetchOnWindowFocus: false
});
const fetchCoreConfig = (coreId) => fetch(`/cores/${coreId}/config`);
const saveCoreConfig = (coreId, config) => fetch(`/cores/${coreId}/config`, {
  method: "PUT",
  body: config
});
const useCoreSettings = create((set, get) => ({
  isLoading: true,
  isPostLoading: false,
  coreId: MAIN_CORE,
  version: null,
  started: false,
  logs_websocket: null,
  config: "",
  setCoreId: (coreId) => {
    set({
      coreId
    });
    get().fetchCoreSettings();
  },
  fetchCoreSettings: () => {
    const coreId = get().coreId;
    set({
      isLoading: true
    });
    Promise.all([fetch("/core").then(({
      version,
      started,
      logs_websocket
    }) => set({
      version,
      started,
      logs_websocket
    })), fetchCoreConfig(coreId).then((config) => {
      if (get().coreId === coreId)
        set({
          config
        });
    })]).finally(() => set({
      isLoading: false
    }));
  },
  updateConfig: (body) => {
    set({
      isPostLoading: true
    });
    return saveCoreConfig(get().coreId, body).finally(() => {
      set({
        isPostLoading: false
      });
    });
  },
  restartCore: () => {
    return fetch("/core/restart", {
      method: "POST"
    });
  },
  createCore: (name, copyFrom = MAIN_CORE) => fetch("/cores", {
    method: "POST",
    body: {
      name,
      copy_from: copyFrom
    }
  }),
  renameCore: (coreId, name) => fetch(`/cores/${coreId}`, {
    method: "PUT",
    body: {
      name
    }
  }),
  deleteCore: (coreId) => fetch(`/cores/${coreId}`, {
    method: "DELETE"
  })
}));
export {
  FetchCoresQueryKey as F,
  MAIN_CORE as M,
  useCoreSettings as a,
  fetchCoreConfig as f,
  saveCoreConfig as s,
  useCoresQuery as u
};
