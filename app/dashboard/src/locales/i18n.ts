import { joinPaths } from "@remix-run/router";

import fa from "date-fns/locale/fa-IR";
import ru from "date-fns/locale/ru";
import tr from "date-fns/locale/tr";
import zh from "date-fns/locale/zh-CN";
import dayjs from "dayjs";
import "dayjs/locale/fa";
import "dayjs/locale/ru";
import "dayjs/locale/tk";
import "dayjs/locale/tr";
import "dayjs/locale/zh-cn";
import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import HttpApi from "i18next-http-backend";
import { registerLocale } from "react-datepicker";
import { initReactI18next } from "react-i18next";

declare module "i18next" {
    interface CustomTypeOptions {
        returnNull: false;
    }
}

i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .use(HttpApi)
    .init(
        {
            debug: import.meta.env.NODE_ENV === "development",
            returnNull: false,
            fallbackLng: "en",
            interpolation: {
                escapeValue: false,
            },
            react: {
                useSuspense: false,
            },
            load: "languageOnly",
            detection: {
                caches: ["localStorage", "sessionStorage", "cookie"],
            },
            backend: {
                loadPath: joinPaths([
                    import.meta.env.BASE_URL,
                    `statics/locales/{{lng}}.json`,
                ]),
                queryStringParams: { v: __BUILD_ID__ },
            },
        },
        function (err, t) {
            dayjs.locale(dayjsLocale(i18n.language));
        }
    );

// i18next codes -> dayjs locale names
function dayjsLocale(lng: string) {
    const l = (lng || "en").toLowerCase();
    return l.startsWith("zh") ? "zh-cn" : l.split("-")[0];
}

i18n.on("languageChanged", (lng) => {
    dayjs.locale(dayjsLocale(lng));
    document.documentElement.lang = lng;
});

// DataPicker
registerLocale("zh-cn", zh);
registerLocale("ru", ru);
registerLocale("fa", fa);
registerLocale("tr", tr);

export default i18n;