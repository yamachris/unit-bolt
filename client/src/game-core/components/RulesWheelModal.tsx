"use client";

import React, { useState, useEffect } from "react";

export type TutorialSection = {
  key: string;
  title: string;
  items: string[];
};

type Props = {
  open: boolean;
  title: string;
  sections: TutorialSection[];
  onClose: () => void;
};

export default function RulesWheelModal({
  open,
  title,
  sections,
  onClose,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Reset active index when reopened or sections change
  React.useEffect(() => {
    if (open) {
      setActiveIndex(0);
    }
  }, [open, sections]);

  if (!isMounted || !open) return null;
  if (!sections || !sections.length) return null;

  const radius = 160; // px from center
  const size = 420; // wheel container size

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />

      {/* Modal container */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-6xl rounded-3xl border border-slate-700 bg-slate-900/90 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/70 bg-slate-900/80">
            <h2 className="text-xl md:text-2xl font-bold text-slate-100">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="rounded-lg px-3 py-1.5 text-slate-200 bg-slate-800 border border-slate-600 hover:bg-slate-700 transition"
              aria-label="Fermer"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Wheel */}
            <div className="flex items-center justify-center">
              <div className="relative" style={{ width: size, height: size }}>
                <div className="absolute inset-0 rounded-full bg-slate-800/60 border border-slate-700" />
                <div className="absolute inset-8 rounded-full border-2 border-dashed border-slate-600 animate-[spin_24s_linear_infinite]" />

                {/* Center label */}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center select-none">
                  <div className="px-5 py-3 rounded-2xl bg-slate-900/85 border border-slate-700 text-slate-100 shadow">
                    <div className="text-xs opacity-70">
                      {sections[activeIndex]?.key}
                    </div>
                    <div className="text-base md:text-lg font-semibold mt-1 max-w-[240px]">
                      {sections[activeIndex]?.title}
                    </div>
                  </div>
                </div>

                {/* Buttons around the circle */}
                {sections.map((s, i) => {
                  const angle =
                    (i / sections.length) * 2 * Math.PI - Math.PI / 2; // start at top
                  const x = Math.cos(angle) * radius;
                  const y = Math.sin(angle) * radius;
                  const isActive = i === activeIndex;
                  return (
                    <button
                      key={s.key}
                      onClick={() => setActiveIndex(i)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 px-4 py-2 rounded-full border text-sm transition-all duration-200 shadow ${
                        isActive
                          ? "bg-blue-600 text-white border-blue-400"
                          : "bg-slate-900/85 text-slate-200 border-slate-600 hover:bg-slate-800"
                      }`}
                      style={{ left: size / 2 + x, top: size / 2 + y }}
                      aria-current={isActive}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Content */}
            <div className="min-h-[360px]">
              <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 p-5 text-slate-200">
                <h3 className="text-lg font-semibold mb-3">
                  {sections[activeIndex]?.title}
                </h3>
                <ul className="space-y-2 list-disc pl-5">
                  {sections[activeIndex]?.items?.map((line, idx) => (
                    <li
                      key={`${activeIndex}-${idx}`}
                      className="leading-relaxed whitespace-pre-line"
                    >
                      {line}
                    </li>
                  )) || []}
                </ul>
              </div>

              {/* Prev/Next */}
              <div className="mt-4 flex items-center justify-between">
                <button
                  onClick={() =>
                    setActiveIndex(
                      (i) => (i - 1 + sections.length) % sections.length,
                    )
                  }
                  className="rounded-lg px-3 py-2 text-slate-200 bg-slate-800 border border-slate-600 hover:bg-slate-700 transition"
                >
                  ← Précédent
                </button>
                <button
                  onClick={() =>
                    setActiveIndex((i) => (i + 1) % sections.length)
                  }
                  className="rounded-lg px-3 py-2 text-slate-200 bg-slate-800 border border-slate-600 hover:bg-slate-700 transition"
                >
                  Suivant →
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
