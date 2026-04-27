import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import uzLatn from "./locales/uz-latn.json";
import uzCyrl from "./locales/uz-cyrl.json";
import ru from "./locales/ru.json";
import en from "./locales/en.json";

export const SUPPORTED_LOCALES = ["uz-latn", "uz-cyrl", "ru", "en"] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: SupportedLocale = "uz-latn";

export const resources = {
  "uz-latn": { translation: uzLatn },
  "uz-cyrl": { translation: uzCyrl },
  ru: { translation: ru },
  en: { translation: en },
} as const;

export function initI18n(language: SupportedLocale = DEFAULT_LOCALE) {
  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources,
      lng: language,
      fallbackLng: DEFAULT_LOCALE,
      interpolation: {
        escapeValue: false,
      },
      compatibilityJSON: "v3",
    });
  } else {
    void i18n.changeLanguage(language);
  }
  return i18n;
}

export { i18n };
export { useTranslation } from "react-i18next";
