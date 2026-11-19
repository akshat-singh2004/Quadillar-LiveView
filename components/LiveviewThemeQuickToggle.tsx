"use client";

import React from "react";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";

export default function LiveviewThemeQuickToggle() {
  const { isLight, toggleTheme } = useLiveviewTheme();

  return (
    <div className="fixed top-3 right-6 z-40 hidden sm:flex items-center">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label="Toggle theme"
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors duration-200 focus:outline-none ${
          isLight
            ? "border-stone-300 bg-stone-200/90"
            : "border-zinc-700 bg-zinc-900/90"
        }`}
      >
        <span
          className={`flex h-4 w-4 transform items-center justify-center rounded-full shadow-sm transition-transform duration-200 ${
            isLight
              ? "translate-x-0 bg-white text-stone-800"
              : "translate-x-5 bg-zinc-100 text-zinc-900"
          }`}
        >
          {isLight ? (
            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}
