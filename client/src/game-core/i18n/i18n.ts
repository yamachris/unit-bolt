import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import translationEN from "./locales/en/translation.json";
import translationFR from "./locales/fr/translation.json";
import translationES from "./locales/es/translation.json";
import translationDE from "./locales/de/translation.json";
import translationIT from "./locales/it/translation.json";
import translationPT from "./locales/pt/translation.json";
import translationJA from "./locales/ja/translation.json";
import translationHI from "./locales/hi/translation.json";

const resources = {
  en: {
    translation: translationEN,
  },
  fr: {
    translation: translationFR,
  },
  es: {
    translation: translationES,
  },
  de: {
    translation: translationDE,
  },
  it: {
    translation: translationIT,
  },
  pt: {
    translation: translationPT,
  },
  ja: {
    translation: translationJA,
  },
  hi: {
    translation: translationHI,
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "fr",
    supportedLngs: ["fr", "en", "es", "de", "it", "pt", "ja", "hi"],
    debug: false, // Set to false in production to avoid console spam
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
  });

// Function to reload translations - useful when translations are not loading correctly
export const reloadTranslations = () => {
  // Force reload all namespaces for the current language
  const currentLang = i18n.language;
  // Check if the language exists in resources
  if (currentLang && resources[currentLang as keyof typeof resources]) {
    // Type assertion to handle the index signature issue
    const langResources = resources[currentLang as keyof typeof resources];
    Object.keys(langResources).forEach((namespace) => {
      i18n.reloadResources(currentLang, namespace);
    });
  }
};

export default i18n;
