"use client";

import React from "react";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";

export default function LiveviewThemeQuickToggle() {
  const { isLight, toggleTheme } = useLiveviewTheme();

  return (
    <div className="print:hidden fixed top-2.5 right-3 z-50 flex items-center">
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isLight ? "Switch to Dark Mode" : "Switch to Light Mode"}
        title={isLight ? "Switch to Matte Dark Mode" : "Switch to Daylight Light Mode"}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium shadow-sm transition-colors cursor-pointer focus:outline-none ${
          isLight
            ? "border-stone-300 bg-white/95 text-stone-800 hover:bg-stone-100"
            : "border-zinc-700 bg-zinc-900/95 text-zinc-100 hover:bg-zinc-800"
        }`}
      >
        <span className="flex h-3.5 w-3.5 items-center justify-center">
          {isLight ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </span>
        <span className="hidden sm:inline">{isLight ? "Light" : "Dark"}</span>
      </button>
    </div>
  );
}
