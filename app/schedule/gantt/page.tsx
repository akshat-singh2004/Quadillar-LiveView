// @refresh reset
"use client";
import { GovernorInterlockBanner } from "@/components/governor/GovernorInterlockBanner";

import React, { useMemo } from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import {
  computeVanguardCpmNetwork,
  computeVanguardEvmMetrics,
} from "@/lib/calculations/cpmScheduleEngine";

export default function MasterCpmAndEvmPage() {
  const tasks = useMemo(() => computeVanguardCpmNetwork(), []);
  const evm = useMemo(() => computeVanguardEvmMetrics(), []);
  const maxDays = Math.max(...tasks.map((t) => t.earlyFinish));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              IS 15883 (PART 2) CPM & ISO 21508 EVM
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              {VANGUARD_GENOME.projectId} • ₹{evm.bacCr.toFixed(2)} Cr
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            MASTER CPM NETWORK & EARNED VALUE S-CURVE
          </h1>
          <p className="text-xs text-slate-400">
            {VANGUARD_GENOME.projectName} • Topological Critical Path & 6-Zone Financial Earned Value Baseline
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition">
            ← COMMAND CENTER
          </a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition">
            🏛️ 3D BIM TWIN
          </a>
          <a href="/site/dpr" className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded-lg transition">
            📋 DPR #084
          </a>
        </div>
      </div>

      {/* ISO 21508 EVM KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">BUDGET AT COMPLETION (BAC)</div>
          <div className="text-lg font-bold text-white mt-1">₹{evm.bacCr.toFixed(2)} Cr</div>
          <div className="text-[10px] text-slate-500">6 Architectural Bits</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">EARNED VALUE (EV)</div>
          <div className="text-lg font-bold text-cyan-400 mt-1">₹{evm.evCr.toFixed(2)} Cr</div>
          <div className="text-[10px] text-slate-500">61.8% Certified Work</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">ACTUAL COST (AC)</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">₹{evm.acCr.toFixed(2)} Cr</div>
          <div className="text-[10px] text-emerald-400">CV: +₹{evm.cvCr.toFixed(2)} Cr</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">COST PERF. INDEX (CPI)</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">{evm.cpi.toFixed(3)}</div>
          <div className="text-[10px] text-slate-500">SPI: {evm.spi.toFixed(3)} (On Baseline)</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">EST. AT COMPLETION (EAC)</div>
          <div className="text-lg font-bold text-cyan-400 mt-1">₹{evm.eacCr.toFixed(2)} Cr</div>
          <div className="text-[10px] text-emerald-400">VAC: +₹{evm.vacCr.toFixed(2)} Cr</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">CRITICAL PATH FLOAT</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">On Baseline (0d)</div>
          <div className="text-[10px] text-slate-500">TCPI: {evm.tcpi.toFixed(3)}</div>
        </div>
      </div>

      {/* CPM Gantt & Topological Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex justify-between items-center border-b border-slate-800 pb-2 text-xs">
          <span className="font-bold text-white uppercase">
            TOPOLOGICAL CPM NETWORK & 6-BIT WBS FLOAT MATRIX ({maxDays} DAYS TOTAL DURATION)
          </span>
          <span className="text-[10px] text-rose-400 font-bold">■ CRITICAL PATH (TF = 0d)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[10px] text-slate-500 uppercase border-b border-slate-800">
              <tr>
                <th className="py-2 px-2">WBS</th>
                <th className="py-2 px-2">BIT</th>
                <th className="py-2 px-2">ACTIVITY DESCRIPTION</th>
                <th className="py-2 px-2">BUDGET</th>
                <th className="py-2 px-2">DUR.</th>
                <th className="py-2 px-2">ES–EF</th>
                <th className="py-2 px-2">TOTAL FLOAT</th>
                <th className="py-2 px-2 w-48">GANTT TIMELINE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-[11px]">
              {tasks.map((t) => {
                const leftPct = (t.earlyStart / maxDays) * 100;
                const widthPct = Math.max(4, (t.durationDays / maxDays) * 100);
                return (
                  <tr key={t.wbsId} className="hover:bg-slate-900/40">
      <GovernorInterlockBanner module="GANTT_EVM" />
                    <td className="py-2.5 px-2 font-bold text-cyan-400">{t.wbsId}</td>
                    <td className="py-2.5 px-2">
                      <a
                        href={`/site/digital-twin?bit=${t.bitId}`}
                        className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-cyan-300 text-[10px] hover:border-cyan-400"
                      >
                        {t.bitId}
                      </a>
                    </td>
                    <td className="py-2.5 px-2 text-white font-bold">{t.name}</td>
                    <td className="py-2.5 px-2 text-slate-300">₹{t.budgetCr.toFixed(2)} Cr</td>
                    <td className="py-2.5 px-2 text-slate-400">{t.durationDays}d</td>
                    <td className="py-2.5 px-2 text-slate-300">
                      D{t.earlyStart}–D{t.earlyFinish}
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className={`font-bold ${
                          t.isCritical ? "text-rose-400" : "text-emerald-400"
                        }`}
                      >
                        {t.totalFloat}d {t.isCritical ? "(CRITICAL)" : ""}
                      </span>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden relative border border-slate-800">
                        <div
                          className={`h-full rounded-full ${
                            t.isCritical ? "bg-rose-500" : "bg-cyan-500"
                          }`}
                          style={{ marginLeft: `${leftPct}%`, width: `${widthPct}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
