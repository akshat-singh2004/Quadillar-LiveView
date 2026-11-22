// @refresh reset
"use client";

import React from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export default function CommercialBillingAndReconciliationPage() {
  const fin = VANGUARD_GENOME.financials;

  const materialReconRows = [
    {
      code: "MAT-01",
      material: "RMC M35 / M45 / M50 Structural Concrete",
      bit: "BIT-4",
      theoretical: "48,420 m³",
      actualIssued: "49,185 m³",
      variancePct: "+1.58%",
      cpwdLimit: "±2.00%",
      status: "WITHIN NORM",
    },
    {
      code: "MAT-02",
      material: "Fe 550D TMT Rebar & Diagrid Exoskeleton Steel",
      bit: "BIT-3",
      theoretical: "8,940 MT",
      actualIssued: "9,112 MT",
      variancePct: "+1.92%",
      cpwdLimit: "±2.50%",
      status: "WITHIN NORM",
    },
    {
      code: "MAT-03",
      material: "Kalzip 65/400 Standing-Seam Aluminum Shell",
      bit: "BIT-2",
      theoretical: "14,200 m²",
      actualIssued: "14,380 m²",
      variancePct: "+1.27%",
      cpwdLimit: "±2.00%",
      status: "CERTIFIED",
    },
    {
      code: "MAT-04",
      material: "Extruded Terracotta Louver Baguettes",
      bit: "BIT-1",
      theoretical: "9,850 m²",
      actualIssued: "9,990 m²",
      variancePct: "+1.42%",
      cpwdLimit: "±2.00%",
      status: "MIDAS RECONCILED",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              CPWD GCC CLAUSE 10CC & CLAUSE 42 RECONCILIATION
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              {VANGUARD_GENOME.projectId}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            COMMERCIAL RA BILLING, ESCROW RETENTION & MATERIAL RECON
          </h1>
          <p className="text-xs text-slate-400">
            {VANGUARD_GENOME.projectName} • Synchronized Financial & Quantity Ledger
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition">
            ← COMMAND CENTER
          </a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition">
            ��️ 3D BIM TWIN
          </a>
          <a href="/site/ndt" className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded-lg transition">
            🔬 NCR LIENS
          </a>
        </div>
      </div>

      {/* Financial KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] text-slate-400">EPC CONTRACT BASELINE</div>
          <div className="text-xl font-bold text-white mt-1">₹{fin.epcBaselineCr.toFixed(2)} Cr</div>
          <div className="text-[10px] text-slate-500">6 Architectural Bits</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] text-slate-400">CERTIFIED RA BILLING</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">₹{fin.certifiedToDateCr.toFixed(2)} Cr</div>
          <div className="text-[10px] text-slate-500">{fin.overallPhysicalProgressPct}% Certified</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] text-slate-400">UP-LDA RETENTION (5%)</div>
          <div className="text-xl font-bold text-amber-400 mt-1">₹{fin.statutoryRetentionCr.toFixed(2)} Cr</div>
          <div className="text-[10px] text-slate-500">Escrow Reserved</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] text-slate-400">NCR-009 LIEN STATUS</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">₹0 Held</div>
          <div className="text-[10px] text-emerald-400">₹2,08,720 Unblocked</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <div className="text-[10px] text-slate-400">EARNED VALUE CPI</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{fin.cpi}</div>
          <div className="text-[10px] text-slate-500">SPI: {fin.spi.toFixed(3)}</div>
        </div>
      </div>

      {/* 6-Zone Contract Allocation Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="text-xs font-bold text-white uppercase border-b border-slate-800 pb-2">
          6 ARCHITECTURAL BITS — CONTRACT VALUE & BILLING BREAKDOWN (₹{fin.epcBaselineCr.toFixed(2)} Cr)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[10px] text-slate-500 uppercase border-b border-slate-800">
              <tr>
                <th className="py-2 px-2">BIT CODE</th>
                <th className="py-2 px-2">PACKAGE NAME</th>
                <th className="py-2 px-2">ELEVATION</th>
                <th className="py-2 px-2">ALLOCATED</th>
                <th className="py-2 px-2">PROGRESS</th>
                <th className="py-2 px-2">CERTIFIED VALUE</th>
                <th className="py-2 px-2 text-right">3D BIM LINK</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-[11px]">
              {VANGUARD_GENOME.bits.map((b) => {
                const certCr = +((b.allocatedBudgetCr * b.completionPct) / 100).toFixed(2);
                return (
                  <tr key={b.bitId} className="hover:bg-slate-900/40">
                    <td className="py-2.5 px-2 font-bold text-cyan-400">{b.code}</td>
                    <td className="py-2.5 px-2 text-white font-bold">{b.name}</td>
                    <td className="py-2.5 px-2 text-slate-400">{b.elevationLabel}</td>
                    <td className="py-2.5 px-2 text-slate-300">₹{b.allocatedBudgetCr.toFixed(2)} Cr</td>
                    <td className="py-2.5 px-2 text-emerald-400 font-bold">{b.completionPct}%</td>
                    <td className="py-2.5 px-2 text-white font-bold">₹{certCr.toFixed(2)} Cr</td>
                    <td className="py-2.5 px-2 text-right">
                      <a
                        href={`/site/digital-twin?bit=${b.bitId}`}
                        className="px-2 py-1 rounded bg-slate-950 border border-cyan-500/40 text-cyan-300 text-[10px]"
                      >
                        OPEN {b.bitId} →
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CPWD Clause 42 Material Reconciliation Matrix */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
        <div className="text-xs font-bold text-white uppercase border-b border-slate-800 pb-2">
          CPWD CLAUSE 42 THEORETICAL VS. ACTUAL MATERIAL CONSUMPTION RECONCILIATION
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[10px] text-slate-500 uppercase border-b border-slate-800">
              <tr>
                <th className="py-2 px-2">CODE</th>
                <th className="py-2 px-2">MATERIAL DESCRIPTION</th>
                <th className="py-2 px-2">PRIMARY BIT</th>
                <th className="py-2 px-2">THEORETICAL</th>
                <th className="py-2 px-2">ACTUAL ISSUED</th>
                <th className="py-2 px-2">VARIANCE</th>
                <th className="py-2 px-2 text-right">AUDIT STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-[11px]">
              {materialReconRows.map((m) => (
                <tr key={m.code} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-2 font-bold text-cyan-400">{m.code}</td>
                  <td className="py-2.5 px-2 text-white">{m.material}</td>
                  <td className="py-2.5 px-2 text-slate-300">{m.bit}</td>
                  <td className="py-2.5 px-2 text-slate-400">{m.theoretical}</td>
                  <td className="py-2.5 px-2 text-white font-bold">{m.actualIssued}</td>
                  <td className="py-2.5 px-2 text-amber-400 font-bold">{m.variancePct}</td>
                  <td className="py-2.5 px-2 text-right font-bold text-emerald-400">{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
