"use client";

import React from "react";
import dynamic from "next/dynamic";

const FullBimSimulationEngine = dynamic(
  () => import("@/components/bim/FullBimSimulationEngine"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[520px] bg-slate-950 flex flex-col items-center justify-center border border-slate-800 rounded-xl">
        <div className="w-12 h-12 border-4 border-cyan-900 border-t-cyan-400 rounded-full animate-spin mb-3"></div>
        <div className="text-cyan-400 font-mono text-xs tracking-widest animate-pulse">
          INITIALIZING VANGUARD 6D DIGITAL TWIN...
        </div>
      </div>
    ),
  }
);

export default function SiteDigitalTwinPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              VANGUARD-ARCHOHM-LOD350.ifc
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              6 BITS ACTIVE
            </span>
          </div>
          <h1 className="text-lg font-bold tracking-tight mt-1">
            Project Vanguard Commercial Hub • 6D BIM Engine
          </h1>
        </div>
        <span className="px-3 py-1 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono rounded">
          Edge Stream: Optimal (60 FPS)
        </span>
      </div>
      <FullBimSimulationEngine />
    </div>
  );
}
