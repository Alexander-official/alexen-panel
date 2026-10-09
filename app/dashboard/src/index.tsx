import { ChakraProvider, localStorageManager } from "@chakra-ui/react";
import dayjs from "dayjs";
import Duration from "dayjs/plugin/duration";
import LocalizedFormat from "dayjs/plugin/localizedFormat";
import RelativeTime from "dayjs/plugin/relativeTime";
import Timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import "locales/i18n";
import { reloadForUpdate } from "utils/lazyLoad";

// a page file of an older build is gone: load the new version
window.addEventListener("vite:preloadError", (e) => {
  if (reloadForUpdate()) e.preventDefault();
});
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "react-query";
import { queryClient } from "utils/react-query";
import { ToastContainer } from "utils/loadErrorToast";
import { updateThemeColor } from "utils/themeColor";
import { initAppearance } from "utils/appearance";
import { theme } from "../chakra.config";
import App from "./App";
import "index.scss";

dayjs.extend(Timezone);
dayjs.extend(LocalizedFormat);
dayjs.extend(utc);
dayjs.extend(RelativeTime);
dayjs.extend(Duration);

updateThemeColor(localStorageManager.get() || "light");
initAppearance();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
      <ToastContainer />
    </ChakraProvider>
  </React.StrictMode>
);
