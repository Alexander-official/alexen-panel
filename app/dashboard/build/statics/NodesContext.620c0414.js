import { bC as z, O as create, g as useQuery } from "./vendor.0404bf65.js";
import { f as fetch, l as useDashboard } from "./index.e0e646b5.js";
const NodeSchema = z.object({
  name: z.string().min(1),
  address: z.string().min(1),
  port: z.number().min(1).or(z.string().transform((v) => parseFloat(v))),
  api_port: z.number().min(1).or(z.string().transform((v) => parseFloat(v))),
  xray_version: z.string().nullable().optional(),
  id: z.number().nullable().optional(),
  status: z.enum(["connected", "connecting", "error", "disabled"]).nullable().optional(),
  message: z.string().nullable().optional(),
  add_as_new_host: z.boolean().optional(),
  core_id: z.string().optional(),
  usage_coefficient: z.number().or(z.string().transform((v) => parseFloat(v)))
});
const getNodeDefaultValues = () => ({
  name: "",
  address: "",
  port: 62050,
  api_port: 62051,
  xray_version: "",
  usage_coefficient: 1,
  core_id: "main"
});
const FetchNodesQueryKey = "fetch-nodes-query-key";
const useNodesQuery = () => {
  const isEditingNodes = useDashboard((s) => s.isEditingNodes);
  return useQuery({
    queryKey: FetchNodesQueryKey,
    queryFn: useNodes.getState().fetchNodes,
    refetchInterval: (data) => !isEditingNodes ? false : Array.isArray(data) && data.some((n) => n.status === "connecting") ? 3e3 : 15e3,
    refetchOnWindowFocus: false
  });
};
const useNodes = create((set, get) => ({
  nodes: [],
  addNode(body) {
    return fetch("/node", {
      method: "POST",
      body
    });
  },
  fetchNodes() {
    return fetch("/nodes");
  },
  fetchNodesUsage(query) {
    return fetch("/nodes/usage", {
      query
    });
  },
  updateNode(body) {
    return fetch(`/node/${body.id}`, {
      method: "PUT",
      body
    });
  },
  setDeletingNode(node) {
    set({
      deletingNode: node
    });
  },
  reconnectNode(body) {
    return fetch(`/node/${body.id}/reconnect`, {
      method: "POST"
    });
  },
  deleteNode: () => {
    var _a;
    return fetch(`/node/${(_a = get().deletingNode) == null ? void 0 : _a.id}`, {
      method: "DELETE"
    });
  }
}));
export {
  FetchNodesQueryKey as F,
  NodeSchema as N,
  useNodesQuery as a,
  getNodeDefaultValues as g,
  useNodes as u
};
