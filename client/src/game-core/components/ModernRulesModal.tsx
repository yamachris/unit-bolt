"use client";

import React, { useState, useEffect } from "react";

export type RuleSection = {
  id: string;
  icon: string;
  title: string;
  subtitle?: string;
  content: string[];
  highlight?: string;
  warning?: string;
};

export type RuleChapter = {
  key: string;
  title: string;
  subtitle: string;
  sections: RuleSection[];
};

type Props = {
  open: boolean;
  title: string;
  chapters: RuleChapter[];
  onClose: () => void;
};

export default function ModernRulesModal({
  open,
  title,
  chapters,
  onClose,
}: Props) {
  const [activeChapter, setActiveChapter] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset to first chapter when opened
  useEffect(() => {
    if (open && isMounted) {
      setActiveChapter(0);
    }
  }, [open, isMounted]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!isMounted || !open) return null;
  if (!chapters || !chapters.length) return null;

  const currentChapter = chapters[activeChapter];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal */}
      <div className="relative w-full max-w-5xl h-full max-h-[90vh] mx-4 bg-slate-900/95 rounded-3xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/70 bg-slate-900/90">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100">
              {title}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              {currentChapter?.subtitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-slate-200 bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors"
            aria-label="Fermer"
          >
            ✕ Fermer
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Chapter Navigation */}
          <div className="w-64 border-r border-slate-700/70 bg-slate-900/50 p-4 overflow-y-auto">
            <h3 className="text-sm font-semibold text-slate-300 mb-3 uppercase tracking-wide">
              Chapitres
            </h3>
            <nav className="space-y-2">
              {(chapters || []).map((chapter, index) => (
                <button
                  key={`chapter-nav-${index}-${chapter.key}`}
                  onClick={() => setActiveChapter(index)}
                  className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 ${
                    index === activeChapter
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-300 hover:bg-slate-800/60 hover:text-slate-100"
                  }`}
                >
                  <div className="font-medium text-sm">
                    {chapter?.title || ""}
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    {(chapter?.subtitle || "").replace(
                      "Chapitre " + (index + 1) + " • ",
                      "",
                    )}
                  </div>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-8 space-y-8 max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-100 mb-3">
                  {currentChapter?.title}
                </h2>
                <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full" />
              </div>

              {(currentChapter?.sections || []).map((section, sectionIndex) => (
                <div
                  key={`${activeChapter}-${sectionIndex}-${section.id}`}
                  className="bg-slate-800/30 rounded-2xl p-8 border border-slate-700/40 hover:border-slate-600/60 transition-all duration-200 hover:bg-slate-800/40"
                >
                  <div className="flex items-start gap-4 mb-6">
                    <div className="flex-shrink-0 w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">{section.icon}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-100 mb-2 leading-tight">
                        {section.title}
                      </h3>
                      {section.subtitle && (
                        <p className="text-slate-400 text-base">
                          {section.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 text-slate-200 leading-relaxed ml-16">
                    {(section.content || []).map((line, idx) => (
                      <p
                        key={`${activeChapter}-${sectionIndex}-content-${idx}`}
                        className="text-base leading-7"
                      >
                        {line}
                      </p>
                    ))}
                  </div>

                  {section.highlight && (
                    <div className="mt-6 ml-16 p-5 bg-emerald-900/25 border border-emerald-700/40 rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="text-emerald-400 text-lg">💡</span>
                        <p className="text-emerald-200 text-base font-medium leading-relaxed">
                          {section.highlight}
                        </p>
                      </div>
                    </div>
                  )}

                  {section.warning && (
                    <div className="mt-6 ml-16 p-5 bg-amber-900/25 border border-amber-700/40 rounded-xl">
                      <div className="flex items-start gap-3">
                        <span className="text-amber-400 text-lg">⚠️</span>
                        <p className="text-amber-200 text-base font-medium leading-relaxed">
                          {section.warning}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Navigation Footer */}
            <div className="sticky bottom-0 bg-slate-900/90 border-t border-slate-700/70 p-4">
              <div className="flex items-center justify-between">
                <button
                  onClick={() =>
                    setActiveChapter(Math.max(0, activeChapter - 1))
                  }
                  disabled={activeChapter === 0}
                  className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  ← Chapitre précédent
                </button>

                <span className="text-slate-400 text-sm">
                  {activeChapter + 1} / {chapters.length}
                </span>

                <button
                  onClick={() =>
                    setActiveChapter(
                      Math.min(chapters.length - 1, activeChapter + 1),
                    )
                  }
                  disabled={activeChapter === chapters.length - 1}
                  className="px-4 py-2 rounded-xl bg-slate-800 border border-slate-600 text-slate-200 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Chapitre suivant →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
