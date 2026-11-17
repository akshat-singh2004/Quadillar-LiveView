// @refresh reset
"use client";

import React from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export default function GovernedMilestonesPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
            UP-LDA ESCROW & STAGE-PAYMENT MILESTONE GATES • ₹864.50 Cr
          </span>
          <h1 className="text-xl font-bold text-white mt-1">
            GOVERNED CONTRACT MILESTONES — {VANGUARD_GENOME.projectName.toUpperCase()}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg">
            ← COMMAND CENTER
          </a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 rounded-lg">
            🏛️ 3D BIM TWIN
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {VANGUARD_GENOME.bits.map((b) => (
          <div key={b.bitId} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex justify-between items-center">
                <span className="font-bold text-cyan-400">{b.code}</span>
                <span className="text-emerald-400 font-bold">{b.completionPct}%</span>
              </div>
              <div className="text-sm font-bold text-white mt-1">{b.name}</div>
              <div className="text-[11px] text-slate-400 mt-1">{b.structuralSystem}</div>
              <div className="w-full h-2 bg-slate-950 rounded-full overflow-hidden mt-3 border border-slate-800">
                <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400" style={{ width: `${b.completionPct}%` }} />
              </div>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[11px]">
              <span className="text-white font-bold">₹{b.allocatedBudgetCr.toFixed(2)} Cr</span>
              <a href={`/site/digital-twin?bit=${b.bitId}`} className="text-cyan-300 hover:underline">
                Verify {b.bitId} in BIM →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
