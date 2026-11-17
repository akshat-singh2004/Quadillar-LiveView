// @refresh reset
"use client";

import React from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";

export default function SystemSettingsAndGenomeLimitsPage() {
  const { theme, setThemeMode } = useLiveviewTheme();

  const claudePaletteSwatches = [
    { name: "Warm Alabaster Canvas", hex: "#F6F4EF", role: "Primary Viewport Backdrop" },
    { name: "Soft Ivory Linen", hex: "#FDFCF9", role: "Elevated Cards & Inspectors" },
    { name: "Matte Sandstone", hex: "#EFECE4", role: "Inset Tables, Code & 3D Floor" },
    { name: "Claude Terracotta Clay", hex: "#C96442", role: "Primary Interactive & Focus Accent" },
    { name: "Matte Sage Olive", hex: "#3B7A57", role: "IS 456 & Sec 65B Verified Pass" },
    { name: "Warm Ochre Honey", hex: "#B27424", role: "Escrow Retention & Snag Flags" },
    { name: "Dusty Lavender-Plum", hex: "#74569B", role: "Merkle Ledger & LiDAR Badges" },
    { name: "Charcoal Espresso Ink", hex: "#1F1E1B", role: "Primary Editorial Typography" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              LIVEVIEW.OS CORE • APPEARANCE & STATUTORY LIMITS
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              {VANGUARD_GENOME.projectId}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            SYSTEM SETTINGS, THEME STUDIO & GENOME LIMITS
          </h1>
          <p className="text-xs text-slate-400">
            Configure Global Interface Appearance (Claude Matte Light vs. Obsidian Dark) & Inspect Canonical Engineering Baselines
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition">
            ← COMMAND CENTER
          </a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition">
            🏛️ 3D BIM TWIN
          </a>
        </div>
      </div>

      {/* INTERFACE APPEARANCE & THEME ENGINE */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider">
              INTERFACE APPEARANCE & COLOR SYSTEM
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Persists across all 20 LiveView OS routes, 3D WebGL viewports, SVG radars, and agent consoles.
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
            ACTIVE: {theme === "claude-light" ? "CLAUDE MATTE LIGHT" : "OBSIDIAN DARK"}
          </span>
        </div>

        {/* Mode Selector Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Option A: Claude's Pick — Matte & Pastel Light */}
          <button
            type="button"
            onClick={() => setThemeMode("claude-light")}
            className={`p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between gap-3 ${
              theme === "claude-light"
                ? "border-cyan-400 bg-slate-950 shadow-md"
                : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    Claude Matte Light (Editorial Pastel)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-bold">
                    CLAUDE'S PICK
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Warm alabaster parchment (#F6F4EF), soft ivory linen cards (#FDFCF9), terracotta clay accents (#C96442), and sage/ochre/lavender matte pastels engineered for glare-free site & office review.
                </p>
              </div>
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  theme === "claude-light" ? "border-cyan-400" : "border-slate-600"
                }`}
              >
                {theme === "claude-light" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                )}
              </span>
            </div>

            {/* Mini Live Preview Strip */}
            <div
              className="p-3 rounded-xl border flex items-center justify-between gap-2"
              style={{ backgroundColor: "#F6F4EF", borderColor: "#E2DDD2" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#C96442" }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#3B7A57" }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#B27424" }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#74569B" }} />
                <span className="text-[10px] font-bold" style={{ color: "#1F1E1B" }}>
                  Alabaster • Linen • Terracotta • Sage
                </span>
              </div>
              <span
                className="px-2 py-0.5 rounded text-[9px] font-bold"
                style={{ backgroundColor: "#F9ECE6", color: "#C96442" }}
              >
                DAYLIGHT MODE
              </span>
            </div>
          </button>

          {/* Option B: Obsidian Dark */}
          <button
            type="button"
            onClick={() => setThemeMode("obsidian-dark")}
            className={`p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between gap-3 ${
              theme === "obsidian-dark"
                ? "border-cyan-400 bg-slate-950 shadow-md"
                : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
            }`}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">
                    Obsidian Command Dark (Control Room)
                  </span>
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[9px] font-bold">
                    DEFAULT
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Deep slate-obsidian canvas (#060911) with high-contrast cyan, emerald, and amber telemetry indicators built for low-light site cabins and nighttime crane radar monitoring.
                </p>
              </div>
              <span
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                  theme === "obsidian-dark" ? "border-cyan-400" : "border-slate-600"
                }`}
              >
                {theme === "obsidian-dark" && (
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                )}
              </span>
            </div>

            {/* Mini Live Preview Strip */}
            <div
              className="p-3 rounded-xl border flex items-center justify-between gap-2"
              style={{ backgroundColor: "#060911", borderColor: "#1E293B" }}
            >
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#22D3EE" }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#34D399" }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#FBBF24" }} />
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: "#C084FC" }} />
                <span className="text-[10px] font-bold" style={{ color: "#F8FAFC" }}>
                  Obsidian • Slate • Cyan • Emerald
                </span>
              </div>
              <span
                className="px-2 py-0.5 rounded text-[9px] font-bold"
                style={{ backgroundColor: "rgba(34,211,238,0.18)", color: "#22D3EE" }}
              >
                NIGHT CONTROL
              </span>
            </div>
          </button>
        </div>

        {/* Claude Matte & Pastel Swatch Matrix */}
        <div className="pt-2 border-t border-slate-800">
          <div className="text-[10px] text-slate-400 font-bold uppercase mb-2">
            CLAUDE LIGHT PALETTE TOKEN SPECIFICATION
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
            {claudePaletteSwatches.map((sw) => (
              <div
                key={sw.hex}
                className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2.5"
              >
                <span
                  className="w-7 h-7 rounded-lg border border-slate-700 shrink-0"
                  style={{ backgroundColor: sw.hex }}
                />
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-white truncate">{sw.name}</div>
                  <div className="text-[9px] text-slate-400 truncate">
                    {sw.hex} • {sw.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CANONICAL VANGUARD GENOME INSPECTOR */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs">
        <div className="font-bold text-cyan-400 uppercase mb-2">
          ACTIVE CANONICAL PROJECT GENOME (lib/project/vanguardGenome.ts)
        </div>
        <pre className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-[11px] text-emerald-300 overflow-x-auto max-h-[45vh]">
          {JSON.stringify(VANGUARD_GENOME, null, 2)}
        </pre>
      </div>
    </div>
  );
}
