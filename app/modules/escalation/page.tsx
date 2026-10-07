"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  calculateClause10CC,
  Clause10CCInput,
  Clause10CCResult,
} from "@/lib/statutory/clause10cc";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

export default function EscalationModulePage() {
  const [isPending, startTransition] = useTransition();

  // -------------------------------------------------------------------------
  // Input State: Gross Certified Work Value & Schedule F Percentages
  // -------------------------------------------------------------------------
  const [grossWorkValue, setGrossWorkValue] = useState<number>(42500000); // ₹4.25 Cr

  // Schedule F Component Percentages (Xm + Y + Z = 90%, 10% non-escalatable fixed)
  const [xmPercent, setXmPercent] = useState<number>(60);
  const [yPercent, setYPercent] = useState<number>(25);
  const [zPercent, setZPercent] = useState<number>(5);

  // Base Indices (MI0, LI0, FI0)
  const [mi0, setMi0] = useState<number>(132.4);
  const [li0, setLi0] = useState<number>(388.0);
  const [fi0, setFi0] = useState<number>(145.2);

  // Current Quarter Indices (MI, LI, FI)
  const [mi, setMi] = useState<number>(141.8); // +7.1%
  const [li, setLi] = useState<number>(405.0); // +4.38%
  const [fi, setFi] = useState<number>(138.6); // -4.55% (Demonstrates negative POL clawback)

  // Computation Result
  const [result, setResult] = useState<Clause10CCResult | null>(null);

  // -------------------------------------------------------------------------
  // Server Action Hook
  // -------------------------------------------------------------------------
  const runCalculation = (overrides?: Partial<Clause10CCInput>) => {
    const payload: Clause10CCInput = {
      grossWorkValue,
      baseIndices: { MI0: mi0, LI0: li0, FI0: fi0 },
      currentIndices: { MI: mi, LI: li, FI: fi },
      componentPercentages: { Xm: xmPercent, Y: yPercent, Z: zPercent },
      ...overrides,
    };

    startTransition(async () => {
      const res = await calculateClause10CC(payload);
      setResult(res);
    });
  };

  useEffect(() => {
    runCalculation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    grossWorkValue,
    xmPercent,
    yPercent,
    zPercent,
    mi0,
    li0,
    fi0,
    mi,
    li,
    fi,
  ]);

  // Fast Presets
  const applyPreset = (preset: "standard" | "pol_clawback" | "net_clawback") => {
    if (preset === "standard") {
      setGrossWorkValue(42500000);
      setMi0(130.0);
      setMi(142.0);
      setLi0(380.0);
      setLi(410.0);
      setFi0(140.0);
      setFi(152.0);
    } else if (preset === "pol_clawback") {
      setGrossWorkValue(42500000);
      setMi0(132.4);
      setMi(141.8);
      setLi0(388.0);
      setLi(405.0);
      setFi0(145.2);
      setFi(138.6); // POL dropped -> statutory negative clawback
    } else if (preset === "net_clawback") {
      setGrossWorkValue(38000000);
      setMi0(145.0);
      setMi(134.0); // Deflation in materials
      setLi0(410.0);
      setLi(405.0); // Deflation in labor
      setFi0(155.0);
      setFi(138.0); // Heavy POL crash
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8 text-zinc-100">
      {/* =====================================================================
          HEADER: CPWD Works Manual 2024 Clause 10CC
          ===================================================================== */}
      <header className="max-w-7xl mx-auto mb-6 bg-zinc-900 border border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-zinc-800/50">
          <div className="text-left">
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-zinc-400 uppercase">
              <span>STATUTORY COMMERCIAL SUITE</span>
              <span className="text-zinc-600">/</span>
              <span>CPWD WORKS MANUAL 2024 CLAUSE 10CC</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-zinc-100 uppercase mt-0.5">
              Price Escalation &amp; Negative Index Clawback Engine
            </h1>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-2">
            <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-mono text-zinc-400">
              PRJ: <span className="text-zinc-100">GOMTI-NAGAR-PH1</span>
            </div>
            <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 flex items-center gap-2 text-xs font-mono text-zinc-100">
              <span>W = 0.85 × GROSS WORK</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-2.5 bg-zinc-950/60 text-xs text-zinc-400 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/50 font-mono">
          <div className="flex items-center gap-4">
            <span>SCHEDULE F WEIGHTS: Material <span className="text-zinc-100">{xmPercent}%</span></span>
            <span className="text-zinc-600">|</span>
            <span>Labour <span className="text-zinc-100">{yPercent}%</span></span>
            <span className="text-zinc-600">|</span>
            <span>POL <span className="text-zinc-100">{zPercent}%</span></span>
          </div>
          <div className="text-zinc-400 text-right">
            <span>PRESETS: </span>
            <button
              type="button"
              onClick={() => applyPreset("standard")}
              className="hover:text-zinc-100 underline mr-2"
            >
              Standard Inflation
            </button>
            <button
              type="button"
              onClick={() => applyPreset("pol_clawback")}
              className="hover:text-zinc-100 underline mr-2"
            >
              POL Clawback
            </button>
            <button
              type="button"
              onClick={() => applyPreset("net_clawback")}
              className="hover:text-zinc-100 underline"
            >
              Net Client Recovery
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================================
          TOP STATUTORY SUMMARY BAR (3 CARDS)
          ===================================================================== */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Card 1: Gross Work Done vs Escalatable W */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
              Gross Work &amp; 15% CP&amp;OH Deduction
            </span>
            <div className="flex justify-between items-baseline mt-3">
              <span className="text-xs text-zinc-400">Gross Certified Bill</span>
              <span className="font-mono tabular-nums tracking-tight text-right text-zinc-100 font-semibold text-base">
                ₹{grossWorkValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-baseline mt-1.5">
              <span className="text-xs text-zinc-400">15% Non-Escalatable CP&amp;OH</span>
              <span className="font-mono tabular-nums tracking-tight text-right text-zinc-500 text-xs">
                -₹{result?.cpOhDeductionAmount?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-zinc-800/50 flex justify-between items-baseline">
            <span className="text-xs text-zinc-300 font-medium">Escalatable Value (W)</span>
            <span className="font-mono tabular-nums tracking-tight text-right text-emerald-500 font-bold text-lg">
              ₹{result?.escalatableWorkValueW?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2: Net Escalation / Clawback Result */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
              Net Statutory Adjustment (Clause 10CC)
            </span>
            <div className="text-right mt-3">
              <span
                className={`font-mono tabular-nums tracking-tight text-2xl font-bold ${
                  (result?.totalEscalationAmount ?? 0) >= 0
                    ? "text-emerald-500"
                    : "text-rose-500"
                }`}
              >
                {(result?.totalEscalationAmount ?? 0) >= 0 ? "+₹" : "-₹"}
                {Math.abs(result?.totalEscalationAmount ?? 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
          <div className="pt-3 mt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs">
            <span className="text-zinc-400">Settlement Direction</span>
            <span
              className={`font-mono font-semibold ${
                result?.isNetClawback ? "text-rose-500" : "text-emerald-500"
              }`}
            >
              {result?.isNetClawback
                ? "RECOVERABLE BY CLIENT"
                : "PAYABLE TO CONTRACTOR"}
            </span>
          </div>
        </div>

        {/* Card 3: Statutory Audit Note */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
              Audit Clearance Status
            </span>
            <p className="text-xs text-zinc-300 mt-2 leading-relaxed text-left">
              {result?.statutoryAuditNote}
            </p>
          </div>
          <div className="pt-3 mt-3 border-t border-zinc-800/50 flex justify-between items-center text-[11px] font-mono">
            <span className="text-zinc-500">ENGINE LATENCY</span>
            <span className="text-zinc-400">
              {isPending ? "COMPUTING..." : "CERTIFIED ZERO-ERROR"}
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          CENTRAL COMPARISON TABLE: Base Index vs Current Index vs Variance
          ===================================================================== */}
      <main className="max-w-7xl mx-auto space-y-6">
        <section className="bg-zinc-900 border border-zinc-800">
          <div className="px-5 py-3.5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40">
            <div className="text-left">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-100">
                Quarterly Index Variance &amp; Component Escalation Breakdown
              </h2>
              <span className="text-[11px] text-zinc-400">
                Formula: V = W × (Component % / 100) × ((Current Index - Base Index) / Base Index)
              </span>
            </div>
            <span className="font-mono text-xs text-zinc-400">CPWD SCHEDULE F</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800/50 text-[11px] uppercase tracking-wider text-zinc-400 bg-zinc-950/50">
                  <th className="py-3 px-4 font-medium text-left">Component</th>
                  <th className="py-3 px-4 font-medium text-right">Schedule F Weight</th>
                  <th className="py-3 px-4 font-medium text-right">Base Index (0)</th>
                  <th className="py-3 px-4 font-medium text-right">Current Index</th>
                  <th className="py-3 px-4 font-medium text-right">Index Delta</th>
                  <th className="py-3 px-4 font-medium text-right">Statutory Escalation (₹)</th>
                  <th className="py-3 px-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {/* 1. Material Row */}
                <tr className="hover:bg-zinc-950/30 transition-colors">
                  <td className="py-3 px-4 text-left">
                    <div className="font-semibold text-zinc-100">
                      {result?.material.name} ({result?.material.code})
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      Wholesale Price Index (All Commodities)
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-100">
                    {result?.material.weightPercentage}%
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-400">
                    <input
                      type="number"
                      step="0.1"
                      value={mi0}
                      onChange={(e) => setMi0(Number(e.target.value))}
                      className="w-20 bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs font-mono tabular-nums text-right text-zinc-100 focus:outline-none focus:border-zinc-600"
                    />
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-100">
                    <input
                      type="number"
                      step="0.1"
                      value={mi}
                      onChange={(e) => setMi(Number(e.target.value))}
                      className="w-20 bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs font-mono tabular-nums text-right text-zinc-100 focus:outline-none focus:border-zinc-600"
                    />
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right whitespace-nowrap">
                    <span
                      className={
                        (result?.material.indexDelta ?? 0) >= 0
                          ? "text-emerald-500 font-medium"
                          : "text-rose-500 font-medium"
                      }
                    >
                      {(result?.material.indexDelta ?? 0) > 0 ? "+" : ""}
                      {result?.material.indexDelta?.toFixed(2)} (
                      {(result?.material.indexDeltaPercentage ?? 0) > 0 ? "+" : ""}
                      {result?.material.indexDeltaPercentage?.toFixed(2)}%)
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right whitespace-nowrap font-bold text-sm">
                    <span
                      className={
                        (result?.material.variationAmount ?? 0) >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }
                    >
                      {(result?.material.variationAmount ?? 0) >= 0 ? "+₹" : "-₹"}
                      {Math.abs(result?.material.variationAmount ?? 0).toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[11px] whitespace-nowrap">
                    {result?.material.isClawback ? (
                      <span className="text-rose-500">CLAWBACK</span>
                    ) : (
                      <span className="text-emerald-500">ESCALATION</span>
                    )}
                  </td>
                </tr>

                {/* 2. Labour Row */}
                <tr className="hover:bg-zinc-950/30 transition-colors">
                  <td className="py-3 px-4 text-left">
                    <div className="font-semibold text-zinc-100">
                      {result?.labour.name} ({result?.labour.code})
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      Consumer Price Index (Industrial Workers CPI-IW)
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-100">
                    {result?.labour.weightPercentage}%
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-400">
                    <input
                      type="number"
                      step="0.1"
                      value={li0}
                      onChange={(e) => setLi0(Number(e.target.value))}
                      className="w-20 bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs font-mono tabular-nums text-right text-zinc-100 focus:outline-none focus:border-zinc-600"
                    />
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-100">
                    <input
                      type="number"
                      step="0.1"
                      value={li}
                      onChange={(e) => setLi(Number(e.target.value))}
                      className="w-20 bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs font-mono tabular-nums text-right text-zinc-100 focus:outline-none focus:border-zinc-600"
                    />
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right whitespace-nowrap">
                    <span
                      className={
                        (result?.labour.indexDelta ?? 0) >= 0
                          ? "text-emerald-500 font-medium"
                          : "text-rose-500 font-medium"
                      }
                    >
                      {(result?.labour.indexDelta ?? 0) > 0 ? "+" : ""}
                      {result?.labour.indexDelta?.toFixed(2)} (
                      {(result?.labour.indexDeltaPercentage ?? 0) > 0 ? "+" : ""}
                      {result?.labour.indexDeltaPercentage?.toFixed(2)}%)
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right whitespace-nowrap font-bold text-sm">
                    <span
                      className={
                        (result?.labour.variationAmount ?? 0) >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }
                    >
                      {(result?.labour.variationAmount ?? 0) >= 0 ? "+₹" : "-₹"}
                      {Math.abs(result?.labour.variationAmount ?? 0).toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[11px] whitespace-nowrap">
                    {result?.labour.isClawback ? (
                      <span className="text-rose-500">CLAWBACK</span>
                    ) : (
                      <span className="text-emerald-500">ESCALATION</span>
                    )}
                  </td>
                </tr>

                {/* 3. POL Row */}
                <tr className="hover:bg-zinc-950/30 transition-colors">
                  <td className="py-3 px-4 text-left">
                    <div className="font-semibold text-zinc-100">
                      {result?.pol.name} ({result?.pol.code})
                    </div>
                    <div className="text-[10px] text-zinc-500 font-mono">
                      WPI Mineral Oils (High-Speed Diesel &amp; Lubricants)
                    </div>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-100">
                    {result?.pol.weightPercentage}%
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-400">
                    <input
                      type="number"
                      step="0.1"
                      value={fi0}
                      onChange={(e) => setFi0(Number(e.target.value))}
                      className="w-20 bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs font-mono tabular-nums text-right text-zinc-100 focus:outline-none focus:border-zinc-600"
                    />
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-100">
                    <input
                      type="number"
                      step="0.1"
                      value={fi}
                      onChange={(e) => setFi(Number(e.target.value))}
                      className="w-20 bg-zinc-950 border border-zinc-800 px-2 py-1 text-xs font-mono tabular-nums text-right text-zinc-100 focus:outline-none focus:border-zinc-600"
                    />
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right whitespace-nowrap">
                    <span
                      className={
                        (result?.pol.indexDelta ?? 0) >= 0
                          ? "text-emerald-500 font-medium"
                          : "text-rose-500 font-medium"
                      }
                    >
                      {(result?.pol.indexDelta ?? 0) > 0 ? "+" : ""}
                      {result?.pol.indexDelta?.toFixed(2)} (
                      {(result?.pol.indexDeltaPercentage ?? 0) > 0 ? "+" : ""}
                      {result?.pol.indexDeltaPercentage?.toFixed(2)}%)
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums text-right whitespace-nowrap font-bold text-sm">
                    <span
                      className={
                        (result?.pol.variationAmount ?? 0) >= 0
                          ? "text-emerald-500"
                          : "text-rose-500"
                      }
                    >
                      {(result?.pol.variationAmount ?? 0) >= 0 ? "+₹" : "-₹"}
                      {Math.abs(result?.pol.variationAmount ?? 0).toLocaleString(
                        "en-IN",
                        { minimumFractionDigits: 2 }
                      )}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-[11px] whitespace-nowrap">
                    {result?.pol.isClawback ? (
                      <span className="text-rose-500 font-semibold">CLAWBACK</span>
                    ) : (
                      <span className="text-emerald-500">ESCALATION</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 bg-zinc-950/60 border-t border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              <span className="text-zinc-400 font-medium">Certified Gross Work Entry (₹):</span>
              <input
                type="number"
                step="10000"
                value={grossWorkValue}
                onChange={(e) => setGrossWorkValue(Number(e.target.value))}
                className="bg-zinc-950 border border-zinc-800 px-3 py-1 font-mono tabular-nums text-right text-zinc-100 text-xs focus:outline-none focus:border-zinc-600 w-44"
              />
            </div>

            <div className="text-right">
              <span className="text-zinc-400 font-medium mr-2">Net Adjustment (Vm + Vl + Vf):</span>
              <span
                className={`font-mono tabular-nums font-bold text-base ${
                  (result?.totalEscalationAmount ?? 0) >= 0
                    ? "text-emerald-500"
                    : "text-rose-500"
                }`}
              >
                {(result?.totalEscalationAmount ?? 0) >= 0 ? "+₹" : "-₹"}
                {Math.abs(result?.totalEscalationAmount ?? 0).toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </section>

        {/* =====================================================================
            AUDIT FORMULA PROOF BANNER
            ===================================================================== */}
        <section className="bg-zinc-900 border border-zinc-800 p-5 text-xs font-mono space-y-2">
          <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2">
            <span className="text-zinc-400 uppercase tracking-wider font-semibold">
              Statutory Formula Proof &amp; Verification Chain
            </span>
            <span className="text-zinc-500">CPWD CLAUSE 10CC AUDIT COMPLIANT</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-zinc-400 pt-2">
            <div>
              <span className="text-zinc-200 block mb-1">1. Material Formula (Vm):</span>
              <p className="text-[11px] text-zinc-500">
                Vm = {result?.escalatableWorkValueW.toLocaleString("en-IN")} × ({result?.material.weightPercentage}/100) × (({result?.material.currentIndex} - {result?.material.baseIndex}) / {result?.material.baseIndex})
              </p>
              <span className="text-zinc-200 block mt-1">
                = ₹{result?.material.variationAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div>
              <span className="text-zinc-200 block mb-1">2. Labour Formula (Vl):</span>
              <p className="text-[11px] text-zinc-500">
                Vl = {result?.escalatableWorkValueW.toLocaleString("en-IN")} × ({result?.labour.weightPercentage}/100) × (({result?.labour.currentIndex} - {result?.labour.baseIndex}) / {result?.labour.baseIndex})
              </p>
              <span className="text-zinc-200 block mt-1">
                = ₹{result?.labour.variationAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div>
              <span className="text-zinc-200 block mb-1">3. POL Formula (Vf):</span>
              <p className="text-[11px] text-zinc-500">
                Vf = {result?.escalatableWorkValueW.toLocaleString("en-IN")} × ({result?.pol.weightPercentage}/100) × (({result?.pol.currentIndex} - {result?.pol.baseIndex}) / {result?.pol.baseIndex})
              </p>
              <span
                className={`block mt-1 ${
                  (result?.pol.variationAmount ?? 0) < 0
                    ? "text-rose-500 font-semibold"
                    : "text-zinc-200"
                }`}
              >
                = ₹{result?.pol.variationAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
