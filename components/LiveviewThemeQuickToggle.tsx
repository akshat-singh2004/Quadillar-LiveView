"use client";

import React from "react";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";

export default function LiveviewThemeQuickToggle() {
  const { isLight, toggleTheme } = useLiveviewTheme();

  return (
    <div className="fixed top-2.5 right-36 z-40 hidden sm:flex items-center gap-1.5 font-mono">
      <button
        type="button"
        onClick={toggleTheme}
        title="Switch between Claude Matte Light and Obsidian Dark"
        className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900/90 hover:bg-slate-800 text-[10px] font-bold text-cyan-400 shadow-sm transition flex items-center gap-1.5"
      >
        <span>{isLight ? "☾ OBSIDIAN DARK" : "☀ CLAUDE PASTEL"}</span>
      </button>
    </div>
  );
}
