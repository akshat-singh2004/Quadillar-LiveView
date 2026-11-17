// @refresh reset
"use client";

import React from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export default function BiometricLaborMusterPage() {
  const gates = [
    { gate: "GATE-A (North Podium)", crew: 24, zone: "BIT-4 & BIT-3", status: "BIOMETRIC + PPE VERIFIED" },
    { gate: "GATE-B (East Dome Access)", crew: 26, zone: "BIT-2 & BIT-5", status: "BIOMETRIC + PPE VERIFIED" },
    { gate: "GATE-C (Green Wedge Ramp)", crew: 16, zone: "BIT-1 & BIT-6", status: "BIOMETRIC + PPE VERIFIED" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
            BOCW ACT 1996 / CLRA BIOMETRIC MUSTER • 66 ACTIVE WORKERS
          </span>
          <h1 className="text-xl font-bold text-white mt-1">
            BIOMETRIC LABOR MUSTER & ZONE ACCESS TELEMETRY — {VANGUARD_GENOME.projectId}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg">
            ← COMMAND CENTER
          </a>
          <a href="/site/dpr" className="px-3 py-1.5 bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 rounded-lg">
            📋 DPR #084 (66 WORKERS)
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {gates.map((g) => (
          <div key={g.gate} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
            <div className="text-cyan-400 font-bold">{g.gate}</div>
            <div className="text-2xl font-bold text-white">{g.crew} Personnel</div>
            <div className="text-[11px] text-slate-300">Assigned Zones: {g.zone}</div>
            <div className="text-[10px] text-emerald-400 font-bold mt-1">{g.status}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
