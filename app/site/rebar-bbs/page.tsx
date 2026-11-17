// @refresh reset
"use client";

import React from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export default function RebarBbsAndBilletNestingPage() {
  const bbsSchedule = [
    { mark: "VGD-B3-25", bit: "BIT-3", member: "14F Shear Core Verticals (Fe 550D)", dia: "25 mm", cutLenM: "7.85 m", qty: 420, weightMt: "12.71 MT", scrapPct: "1.4%" },
    { mark: "VGD-B4-32", bit: "BIT-4", member: "Podium Transfer Girder Bottom Bars", dia: "32 mm", cutLenM: "11.60 m", qty: 280, weightMt: "20.51 MT", scrapPct: "1.1%" },
    { mark: "VGD-B1-20", bit: "BIT-1", member: "48m Bridge Arch Rib Stirrups & Ties", dia: "20 mm", cutLenM: "5.90 m", qty: 640, weightMt: "9.32 MT", scrapPct: "1.6%" },
    { mark: "VGD-B2-16", bit: "BIT-2", member: "Auditorium Tension Ring Hoop Bars", dia: "16 mm", cutLenM: "11.80 m", qty: 350, weightMt: "6.53 MT", scrapPct: "0.9%" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
            IS 2502:1963 / IS 1786 FE 550D BILLET CUTTING-STOCK OPTIMIZER
          </span>
          <h1 className="text-xl font-bold text-white mt-1">
            REBAR BAR BENDING SCHEDULE (BBS) & BILLET NESTING — {VANGUARD_GENOME.projectId}
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

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-[10px] text-slate-500 uppercase border-b border-slate-800">
            <tr>
              <th className="py-2 px-2">BAR MARK</th>
              <th className="py-2 px-2">BIT</th>
              <th className="py-2 px-2">STRUCTURAL ELEMENT</th>
              <th className="py-2 px-2">DIA</th>
              <th className="py-2 px-2">IS 2502 CUT LEN</th>
              <th className="py-2 px-2">TOTAL MT</th>
              <th className="py-2 px-2 text-right">OFFCUT SCRAP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80 text-[11px]">
            {bbsSchedule.map((r) => (
              <tr key={r.mark} className="hover:bg-slate-900/40">
                <td className="py-2.5 px-2 font-bold text-cyan-400">{r.mark}</td>
                <td className="py-2.5 px-2">
                  <a href={`/site/digital-twin?bit=${r.bit}`} className="text-cyan-300 underline">
                    {r.bit}
                  </a>
                </td>
                <td className="py-2.5 px-2 text-white font-bold">{r.member}</td>
                <td className="py-2.5 px-2 text-slate-300">{r.dia}</td>
                <td className="py-2.5 px-2 text-slate-300">{r.cutLenM} (×{r.qty})</td>
                <td className="py-2.5 px-2 text-white font-bold">{r.weightMt}</td>
                <td className="py-2.5 px-2 text-right font-bold text-emerald-400">{r.scrapPct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
