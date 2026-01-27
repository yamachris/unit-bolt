"use client";

import React, { useEffect, useState } from "react";
import { cn } from "../utils/cn";
import { Globe } from "lucide-react";
import i18n from "i18next";

type Language = {
  code: string;
  name: string;
  flag: string;
};

const languages: Language[] = [
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "pt", name: "Português", flag: "🇵🇹" },
  { code: "ja", name: "日本語", flag: "🇯🇵" },
  { code: "ko", name: "한국어", flag: "🇰🇷" },
  { code: "ru", name: "Русский", flag: "🇷🇺" },
  { code: "zh", name: "简体中文", flag: "🇨🇳" },
  { code: "zh-TW", name: "繁體中文", flag: "🇹🇼" },
  { code: "hi", name: "हिन्दी", flag: "🇮🇳" },
  { code: "ar", name: "العربية", flag: "🇸🇦" },
];

interface LanguageSelectorProps {
  variant?: string;
}

export function LanguageSelector({ variant }: LanguageSelectorProps = {}) {
  // Utilisation de variant pour éviter les warnings
  console.debug("LanguageSelector variant:", variant);
  const [isOpen, setIsOpen] = useState(false);
  // Éviter le rendu côté serveur pour prévenir un mismatch d'hydratation
  const [mounted, setMounted] = useState(false);
  const [currentLang, setCurrentLang] = useState(
    () => languages.find((lang) => lang.code === i18n.language) || languages[0],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fermer le menu quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".language-selector")) {
        setIsOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    // Synchroniser avec la langue stockée côté client après le montage
    try {
      const storedLang =
        typeof window !== "undefined"
          ? window.localStorage.getItem("i18nextLng")
          : null;
      const langToUse = storedLang || i18n.language;
      if (langToUse && langToUse !== i18n.language) {
        i18n.changeLanguage(langToUse);
      }
      const found = languages.find((l) => l.code === langToUse) || languages[0];
      setCurrentLang(found);
    } catch (error) {
      console.error(
        "Erreur lors de la récupération de la langue stockée:",
        error,
      );
    }
  }, []);

  const handleLanguageChange = async (lang: string) => {
    try {
      await i18n.changeLanguage(lang);
      localStorage.setItem("i18nextLng", lang);
      const found = languages.find((l) => l.code === lang) || languages[0];
      setCurrentLang(found);
      setIsOpen(false);
    } catch (error) {
      console.error("Erreur lors du changement de langue:", error);
    }
  };

  // Éviter tout rendu SSR pour prévenir mismatch de texte/emoji
  if (!mounted) return null;

  return (
    <div className="fixed top-4 left-4 z-50 language-selector">
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
          className={cn(
            "group flex items-center gap-2 px-3 py-2 rounded-full",
            "bg-slate-800/80 backdrop-blur-sm",
            "shadow-lg hover:shadow-xl transition-all duration-300",
            "border border-slate-700/50",
            "hover:bg-slate-800/90",
            "transform hover:scale-105",
            isOpen && "ring-2 ring-blue-400 dark:ring-blue-500",
          )}
          title={currentLang.name}
        >
          <Globe
            className={cn(
              "w-4 h-4 transition-all duration-300",
              isOpen
                ? "text-blue-400 rotate-180"
                : "text-slate-300 group-hover:text-blue-400",
            )}
          />
          <span className="text-lg text-slate-100">{currentLang.flag}</span>
        </button>

        <div
          className={cn(
            "absolute top-12 left-0",
            "transform transition-all duration-300",
            "animate-in fade-in zoom-in-95",
            isOpen
              ? "opacity-100 scale-100 translate-y-0"
              : "opacity-0 scale-95 -translate-y-4 pointer-events-none",
          )}
        >
          <div
            className={cn(
              "bg-slate-900/90 backdrop-blur-sm",
              "rounded-2xl shadow-xl",
              "border border-slate-700/50",
              "p-2 min-w-[180px]",
              "divide-y divide-slate-700/50",
              "animate-in slide-in-from-top-2",
            )}
          >
            {languages.map((lang, index) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={cn(
                  "w-full px-4 py-2 flex items-center gap-3",
                  "transition-all duration-200",
                  "first:rounded-t-xl last:rounded-b-xl",
                  "hover:pl-6",
                  currentLang.code === lang.code
                    ? "bg-blue-500/20 text-blue-200"
                    : "hover:bg-slate-800/60 text-slate-200",
                )}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <span
                  className={cn(
                    "text-xl transition-all duration-200",
                    "transform hover:scale-110",
                    currentLang.code === lang.code && "animate-bounce",
                  )}
                >
                  {lang.flag}
                </span>
                <span
                  className={cn(
                    "font-medium transition-all duration-200",
                    currentLang.code === lang.code && "font-bold",
                  )}
                >
                  {lang.name}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
// LanguageSelector modifié pour thème visuel
