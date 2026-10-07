"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  calculateClause12Rate,
  Clause12Input,
  Clause12Result,
  WorkType,
} from "@/lib/statutory/clause12";
import {
  AlertTriangle,
  CheckCircle2,
  Calculator,
  Layers,
  Scale,
  FileSpreadsheet,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";

export default function VariationsModulePage() {
  const [isPending, startTransition] = useTransition();

  // -------------------------------------------------------------------------
  // Input State for Rate Analysis Builder
  // -------------------------------------------------------------------------
  const [workType, setWorkType] = useState<WorkType>("superstructure");
  const [baseRate, setBaseRate] = useState<number>(6500);
  const [boqQuantity, setBoqQuantity] = useState<number>(500);
  const [executedQuantity, setExecutedQuantity] = useState<number>(720); // Default to breach +30%

  // Cost Elements (Material, Labour, T&P)
  const [materialCost, setMaterialCost] = useState<number>(4800);
  const [labourCost, setLabourCost] = useState<number>(1950);
  const [tpCost, setTpCost] = useState<number>(450);

  // Computed Statutory Result
  const [result, setResult] = useState<Clause12Result | null>(null);

  // -------------------------------------------------------------------------
  // Server Action Computation Hook
  // -------------------------------------------------------------------------
  const runCalculation = (inputOverride?: Partial<Clause12Input>) => {
    const payload: Clause12Input = {
      baseRate,
      boqQuantity,
      executedQuantity,
      workType,
      materialCost,
      labourCost,
      tpCost,
      ...inputOverride,
    };

    startTransition(async () => {
      const res = await calculateClause12Rate(payload);
      setResult(res);
    });
  };

  useEffect(() => {
    runCalculation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    workType,
    baseRate,
    boqQuantity,
    executedQuantity,
    materialCost,
    labourCost,
    tpCost,
  ]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8 text-zinc-100">
      {/* =====================================================================
          HEADER: Module Identifier & CPWD Statutory Protocols
          ===================================================================== */}
      <header className="max-w-7xl mx-auto mb-6 bg-zinc-900 border border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-zinc-800/50">
          <div className="text-left">
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-zinc-400 uppercase">
              <span>STATUTORY COMMERCIAL SUITE</span>
              <span className="text-zinc-600">/</span>
              <span>CPWD WORKS MANUAL 2024 &amp; FIDIC CL. 13</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-zinc-100 uppercase mt-0.5">
              Clause 12: Rate Analysis &amp; Deviation Engine
            </h1>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-2">
            <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-mono text-zinc-400">
              PRJ: <span className="text-zinc-100">GOMTI-NAGAR-PH1</span>
            </div>
            <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 flex items-center gap-2 text-xs font-mono text-emerald-500 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>15% CP&amp;OH STATUTORY</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-2.5 bg-zinc-950/60 text-xs text-zinc-400 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/50 font-mono">
          <div className="flex items-center gap-4">
            <span>SUPERSTRUCTURE LIMIT: <span className="text-zinc-100">±30.00%</span></span>
            <span className="text-zinc-600">|</span>
            <span>FOUNDATION / SUBSTRUCTURE LIMIT: <span className="text-zinc-100">100.00%</span></span>
          </div>
          <div className="text-zinc-500">
            DERIVATION FORMULA: (MATERIAL + LABOUR + T&amp;P) × 1.15
          </div>
        </div>
      </header>

      {/* =====================================================================
          MAIN CSS GRID: 2-Column Data-Dense Rate Analysis Builder
          ===================================================================== */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* ===================================================================
            COLUMN 1 (LEFT, 7 cols): Input Parameters & Cost Elements
            =================================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Card 1: Work Classification & Quantity Parameters */}
          <section className="bg-zinc-900 border border-zinc-800">
            <div className="px-5 py-3.5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                <Layers className="h-4 w-4 text-zinc-400" />
                1. Work Classification &amp; Contract Quantities
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                CPWD CL. 12.2 / 12.3
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Work Type Selector Buttons */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-2 font-medium text-left">
                  Statutory Work Classification
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setWorkType("superstructure");
                      runCalculation({ workType: "superstructure" });
                    }}
                    className={`py-2.5 px-4 text-left border transition-colors ${
                      workType === "superstructure"
                        ? "bg-zinc-800 border-zinc-100 text-zinc-100"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <div className="font-semibold text-xs uppercase tracking-wider">
                      Superstructure Work
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      Statutory Deviation Limit: ±30%
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setWorkType("foundation");
                      runCalculation({ workType: "foundation" });
                    }}
                    className={`py-2.5 px-4 text-left border transition-colors ${
                      workType === "foundation"
                        ? "bg-zinc-800 border-zinc-100 text-zinc-100"
                        : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <div className="font-semibold text-xs uppercase tracking-wider">
                      Foundation / Substructure
                    </div>
                    <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      Statutory Deviation Limit: 100%
                    </div>
                  </button>
                </div>
              </div>

              {/* Numerical Quantity & Base Rate Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-zinc-800/50">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium text-left">
                    Base Agreement Rate (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={baseRate}
                    onChange={(e) => setBaseRate(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs font-mono tabular-nums text-right text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                  <span className="block text-[10px] text-zinc-500 font-mono mt-1 text-left">
                    Contract BOQ Rate
                  </span>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium text-left">
                    Sanctioned BOQ Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={boqQuantity}
                    onChange={(e) => setBoqQuantity(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs font-mono tabular-nums text-right text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                  <span className="block text-[10px] text-zinc-500 font-mono mt-1 text-left">
                    Initial Agreement Baseline
                  </span>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium text-left">
                    Executed / Proposed Quantity
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={executedQuantity}
                    onChange={(e) => setExecutedQuantity(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs font-mono tabular-nums text-right text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                  <span className="block text-[10px] text-zinc-500 font-mono mt-1 text-left">
                    Cumulative Field Inward
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Card 2: Cost Elements Input (Material, Labour, T&P) */}
          <section className="bg-zinc-900 border border-zinc-800">
            <div className="px-5 py-3.5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                <Calculator className="h-4 w-4 text-zinc-400" />
                2. Market Cost Elements (For Rate Analysis)
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                CPWD DSR / MARKET SURVEY
              </span>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-400 text-left">
                Provide certified voucher-backed unit rates for actual site inputs under CPWD Clause 12.3 rate formulation.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Material Cost */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium text-left">
                    Material Component (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={materialCost}
                    onChange={(e) => setMaterialCost(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs font-mono tabular-nums text-right text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                  <span className="block text-[10px] text-zinc-500 font-mono mt-1 text-left">
                    At Delivery Site Gate
                  </span>
                </div>

                {/* Labour Cost */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium text-left">
                    Labour Component (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={labourCost}
                    onChange={(e) => setLabourCost(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs font-mono tabular-nums text-right text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                  <span className="block text-[10px] text-zinc-500 font-mono mt-1 text-left">
                    Skilled &amp; Unskilled Output
                  </span>
                </div>

                {/* Tools & Plant (T&P) Cost */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-zinc-400 mb-1.5 font-medium text-left">
                    Tools &amp; Plant (T&amp;P) (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={tpCost}
                    onChange={(e) => setTpCost(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs font-mono tabular-nums text-right text-zinc-100 focus:outline-none focus:border-zinc-600"
                  />
                  <span className="block text-[10px] text-zinc-500 font-mono mt-1 text-left">
                    Machinery, Fuel &amp; Depreciation
                  </span>
                </div>
              </div>

              {/* Prime Cost Sub-Total Bar */}
              <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs">
                <span className="text-zinc-400 text-left font-medium">
                  Direct Prime Cost (Material + Labour + T&amp;P):
                </span>
                <span className="font-mono tabular-nums text-right text-zinc-100 font-bold text-sm">
                  ₹{(materialCost + labourCost + tpCost).toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            </div>

            <div className="px-5 py-3 bg-zinc-950/60 border-t border-zinc-800/50 flex justify-between items-center">
              <span className="text-[11px] text-zinc-500 font-mono">
                ENGINE STATE: {isPending ? "COMPUTING VIA SERVER ACTION..." : "SYNCHRONIZED"}
              </span>
              <button
                type="button"
                onClick={() => runCalculation()}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 font-mono text-xs uppercase tracking-wider transition-colors"
              >
                Recalculate
              </button>
            </div>
          </section>
        </div>

        {/* ===================================================================
            COLUMN 2 (RIGHT, 5 cols): Statutory Audit Output & Warnings
            =================================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Output Card 1: Statutory Deviation Warning / Status */}
          <section className="bg-zinc-900 border border-zinc-800">
            <div className="px-5 py-3.5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                <Scale className="h-4 w-4 text-zinc-400" />
                3. Statutory Deviation Audit Check
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                LIMIT: {result?.deviationLimitPercentage ?? 30}%
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Quantities Comparison Grid */}
              <div className="divide-y divide-zinc-800/50 text-xs">
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-400 text-left">Quantity Deviation Variance</span>
                  <span
                    className={`font-mono tabular-nums text-right font-bold ${
                      (result?.quantityVariance ?? 0) >= 0
                        ? "text-zinc-100"
                        : "text-zinc-400"
                    }`}
                  >
                    {(result?.quantityVariance ?? 0) > 0 ? "+" : ""}
                    {result?.quantityVariance?.toFixed(2)} units
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-400 text-left">Actual Deviation Percentage</span>
                  <span
                    className={`font-mono tabular-nums text-right font-bold text-sm ${
                      result?.isDeviationExceeded
                        ? "text-rose-500 font-bold"
                        : "text-emerald-500 font-bold"
                    }`}
                  >
                    {(result?.deviationPercentage ?? 0) > 0 ? "+" : ""}
                    {result?.deviationPercentage?.toFixed(2)}%
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-400 text-left">Statutory Ceiling Quantity</span>
                  <span className="font-mono tabular-nums text-right text-zinc-100">
                    {result?.thresholdQuantity?.toFixed(2)} units
                  </span>
                </div>

                {result?.isDeviationExceeded && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-rose-400 text-left font-medium">
                      Excess Quantity Exceeding Limit
                    </span>
                    <span className="font-mono tabular-nums text-right text-rose-500 font-bold">
                      {result?.excessQuantity?.toFixed(2)} units
                    </span>
                  </div>
                )}
              </div>

              {/* BOLD STATUTORY WARNING BANNER */}
              {result?.isDeviationExceeded ? (
                <div className="border border-rose-500/50 bg-rose-950/20 p-4 text-left">
                  <div className="flex items-center gap-2 mb-1.5">
                    <AlertTriangle className="h-4 w-4 text-rose-500 shrink-0" />
                    <span className="font-mono font-bold text-xs uppercase tracking-wider text-rose-500">
                      STATUTORY DEVIATION LIMIT BREACHED
                    </span>
                  </div>
                  <p className="text-xs text-rose-400 font-medium leading-relaxed">
                    {result?.statutoryWarning}
                  </p>
                  <div className="mt-3 pt-2 border-t border-rose-500/30 text-[11px] font-mono text-rose-300">
                    MANDATE: Principal Architect approval required under CPWD Form 7.
                  </div>
                </div>
              ) : (
                <div className="border border-emerald-500/40 bg-emerald-950/20 p-4 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span className="font-mono font-bold text-xs uppercase tracking-wider text-emerald-500">
                      WITHIN STATUTORY DEVIATION LIMIT
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    Executed quantity variance is within the allowed{" "}
                    {result?.deviationLimitPercentage}% threshold. Base agreement rate of
                    ₹{result?.baseRate?.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    remains legally applicable for all executed units.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Output Card 2: Derived Rate Analysis Result */}
          <section className="bg-zinc-900 border border-zinc-800">
            <div className="px-5 py-3.5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-zinc-400" />
                4. Final Derived Rate Formulation
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                15% CP&amp;OH
              </span>
            </div>

            <div className="p-5 space-y-4">
              <div className="divide-y divide-zinc-800/50 text-xs">
                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-400 text-left">Direct Prime Cost Subtotal</span>
                  <span className="font-mono tabular-nums text-right text-zinc-100">
                    ₹{result?.primeCost?.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-zinc-400 text-left">
                    Contractor&apos;s Profit &amp; Overhead (15%)
                  </span>
                  <span className="font-mono tabular-nums text-right text-amber-500 font-medium">
                    +₹{result?.cpOhAmount?.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between items-center py-3 bg-zinc-950/40 px-3 border-t border-zinc-800">
                  <span className="text-zinc-100 text-left font-semibold uppercase tracking-wider text-xs">
                    Final Derived Rate:
                  </span>
                  <span className="font-mono tabular-nums text-right font-bold text-xl text-emerald-500">
                    ₹{result?.derivedRate?.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Commercial Exposure Assessment */}
              <div className="border border-zinc-800 bg-zinc-950 p-4 text-xs space-y-2">
                <span className="text-zinc-400 uppercase tracking-wider text-[11px] font-medium block text-left">
                  Commercial Financial Exposure Comparison
                </span>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-left">Cost at Agreement Base Rate:</span>
                  <span className="font-mono tabular-nums text-right text-zinc-100">
                    ₹{result?.costAtBaseRate?.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 text-left">Cost with Clause 12 Bifurcation:</span>
                  <span className="font-mono tabular-nums text-right text-zinc-100 font-bold">
                    ₹{result?.costWithClause12?.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>

                <div className="pt-2 border-t border-zinc-800/50 flex justify-between items-center">
                  <span className="text-left font-semibold text-zinc-300">
                    Statutory Net Financial Impact:
                  </span>
                  <span
                    className={`font-mono tabular-nums text-right font-bold text-sm ${
                      (result?.financialImpact ?? 0) > 0
                        ? "text-rose-500"
                        : "text-zinc-100"
                    }`}
                  >
                    {(result?.financialImpact ?? 0) > 0 ? "+₹" : "₹"}
                    {result?.financialImpact?.toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3 bg-zinc-950/60 border-t border-zinc-800/50 flex justify-between items-center text-[11px]">
              <span className="text-zinc-500 text-left">Formula: (M + L + T&amp;P) × 1.15</span>
              <span className="font-mono text-zinc-400 text-right">
                VERIFIED BY SERVER ACTION
              </span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
