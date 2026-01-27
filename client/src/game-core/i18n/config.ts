import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import des traductions
import enTranslation from "./locales/en/translation.json";
import frTranslation from "./locales/fr/translation.json";
import esTranslation from "./locales/es/translation.json";
import deTranslation from "./locales/de/translation.json";
import itTranslation from "./locales/it/translation.json";
import ptTranslation from "./locales/pt/translation.json";
import jaTranslation from "./locales/ja/translation.json";
import hiTranslation from "./locales/hi/translation.json";
import koTranslation from "./locales/ko/translation.json";
import ruTranslation from "./locales/ru/translation.json";
import zhTranslation from "./locales/zh/translation.json";
import zhTWTranslation from "./locales/zh-TW/translation.json";
import arTranslation from "./locales/ar/translation.json";

const resources = {
  en: { translation: enTranslation },
  fr: { translation: frTranslation },
  es: { translation: esTranslation },
  de: { translation: deTranslation },
  it: { translation: itTranslation },
  pt: { translation: ptTranslation },
  ja: { translation: jaTranslation },
  hi: { translation: hiTranslation },
  ko: { translation: koTranslation },
  ru: { translation: ruTranslation },
  zh: { translation: zhTranslation },
  "zh-TW": { translation: zhTWTranslation },
  ar: { translation: arTranslation },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "fr",
    supportedLngs: [
      "fr",
      "en",
      "es",
      "de",
      "it",
      "pt",
      "ja",
      "hi",
      "ko",
      "ru",
      "zh",
      "zh-TW",
      "ar",
    ],
    debug: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
  });

export default i18n;
