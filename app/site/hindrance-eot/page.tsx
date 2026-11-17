// @refresh reset
"use client";

import React, { useState, useMemo } from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export default function HindranceRegisterAndEotPage() {
  const [hindranceDays, setHindranceDays] = useState<number>(12);
  const [activityTotalFloat, setActivityTotalFloat] = useState<number>(18); // Non-critical WBS-05 float

  const analysis = useMemo(() => {
    const criticalDelayDays = Math.max(0, hindranceDays - activityTotalFloat);
    const bacCr = VANGUARD_GENOME.financials.epcBaselineCr; // 864.50 Cr
    const contractDurationDays = 1095;
    const overheadPct = 15.0;
    const dailyOverheadCr = +((overheadPct / 100) * (bacCr / contractDurationDays)).toFixed(4);
    const hudsonClaimCr = +(dailyOverheadCr * criticalDelayDays).toFixed(3);
    return {
      criticalDelayDays,
      dailyOverheadCr,
      hudsonClaimCr,
    };
  }, [hindranceDays, activityTotalFloat]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              CPWD GCC CLAUSES 2 & 5 / SCL DELAY PROTOCOL (2ND ED.)
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              EPC BASELINE ₹{VANGUARD_GENOME.financials.epcBaselineCr.toFixed(2)} Cr
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            STATUTORY HINDRANCE REGISTER (FORM 24) & EOT / HUDSON SHIELD
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg">
            ← COMMAND CENTER
          </a>
          <a href="/site/master-schedule" className="px-3 py-1.5 bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 rounded-lg">
            📊 MASTER CPM (0D FLOAT)
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
          <div className="font-bold text-white uppercase border-b border-slate-800 pb-2">
            SCL TIME IMPACT ANALYSIS (TIA) & HUDSON PROLONGATION SIMULATOR
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">Logged External Hindrance Duration (Days):</span>
              <span className="text-cyan-400 font-bold">{hindranceDays} Days</span>
            </div>
            <input
              type="range"
              min="0"
              max="45"
              value={hindranceDays}
              onChange={(e) => setHindranceDays(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded accent-cyan-400"
            />
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-slate-400">Affected WBS Activity Total Float (Days):</span>
              <span className="text-emerald-400 font-bold">{activityTotalFloat} Days</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              value={activityTotalFloat}
              onChange={(e) => setActivityTotalFloat(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-slate-800 rounded accent-emerald-400"
            />
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">NET CRITICAL EOT DELAY</span>
              <span
                className={`text-lg font-bold ${
                  analysis.criticalDelayDays === 0 ? "text-emerald-400" : "text-amber-400"
                }`}
              >
                {analysis.criticalDelayDays} Days
              </span>
              <span className="text-[10px] text-slate-500 block">
                {analysis.criticalDelayDays === 0 ? "Absorbed by WBS Float" : "Critical Spine Impacted"}
              </span>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <span className="text-[10px] text-slate-400 block">HUDSON PROLONGATION</span>
              <span className="text-lg font-bold text-cyan-400">₹{analysis.hudsonClaimCr.toFixed(3)} Cr</span>
              <span className="text-[10px] text-slate-500 block">Rate: ₹{analysis.dailyOverheadCr} Cr/d</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px]">
            ✔ Master CPM Spine remains On Baseline (0d) • CPWD Clause 2 Liquidated Damages Shield Active.
          </div>
        </div>
      </div>
    </div>
  );
}
