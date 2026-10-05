import { QueryClient } from "react-query";

// no refetch burst every time the tab gets focus: the live parts poll anyway
export const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});
