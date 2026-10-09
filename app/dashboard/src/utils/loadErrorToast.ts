// A failed load (server error, database busy, no connection) is said once in a
// toast instead of leaving a silently empty page. At most one every 5 seconds.
import { createStandaloneToast } from "@chakra-ui/react";
import i18n from "i18next";
import { theme } from "../../chakra.config";

export const { ToastContainer, toast } = createStandaloneToast({ theme });

let last = 0;
export const notifyLoadError = (status?: number) => {
  if (Date.now() - last < 5000) return;
  last = Date.now();
  const key = !status ? "errors.network" : status === 503 ? "serverMsg.dbBusy" : "errors.loadFailed";
  if (!toast.isActive("load-error"))
    toast({ id: "load-error", status: "error", title: i18n.t(key), position: "top", duration: 4500, isClosable: true });
};
