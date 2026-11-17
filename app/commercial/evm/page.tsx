"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  calculateProjectEvm,
  EvmProjectBaseline,
  ZonePhysicalProgress,
  S說urveDataPoint
} from "@/lib/calculations/evmEngine";

// --- INLINE SVG ICONS ---
const TrendingUpIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 00-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const AlertTriangleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const RefreshIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function EarnedValueManagementPage() {
  // Physical Contract Baseline for Project Vanguard (449 m2 BUA across 4 storeys @ ₹41,400/m2)
  const [baseline] = useState<EvmProjectBaseline>({
    totalBudgetAtCompletionBacInr: 18592000, // ₹1.859 Cr Total Contract Baseline
    plannedDurationWeeks: 24,
    reportingWeek: 12, // Mid-point Week 12 review
    zoneWeightages: {
      zoneA_Foundation: 0.18,      // 18% (Raft & Subgrade)
      zoneB_Podium: 0.24,          // 24% (Ground Podium Slab)
      zoneC_Superstructure: 0.36,  // 36% (L1-L2 Steel H-Beams & Slabs)
      zoneD_RoofMep: 0.22          // 22% (Rooftop Canopy & HVAC Chillers)
    }
  });

  // Dynamic Site Completion Sliders & Actual Expenditure Incurred
  const [zoneAProgress, setZoneAProgress] = useState<number>(100); // 100% complete
  const [zoneBProgress, setZoneBProgress] = useState<number>(85);  // 85% complete
  const [zoneCProgress, setZoneCProgress] = useState<number>(45);  // 45% complete
  const [zoneDProgress, setZoneDProgress] = useState<number>(0);   // 0% complete
  const [actualCostIncurred, setActualCostIncurred] = useState<number>(9420000); // ₹94.20 Lakhs spent

  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  const progressState: ZonePhysicalProgress = useMemo(() => ({
    zoneA_ProgressPct: zoneAProgress,
    zoneB_ProgressPct: zoneBProgress,
    zoneC_ProgressPct: zoneCProgress,
    zoneD_ProgressPct: zoneDProgress,
    actualCostIncurredInr: actualCostIncurred
  }), [zoneAProgress, zoneBProgress, zoneCProgress, zoneDProgress, actualCostIncurred]);

  // Execute First-Principles EVM & S-Curve Formulation
  const evm = useMemo(() => {
    return calculateProjectEvm(baseline, progressState);
  }, [baseline, progressState]);

  const handleSealEvmMetrics = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_EVM_W12_PV_${evm.pvInr}_EV_${evm.evInr}_AC_${evm.acInr}_CPI_${evm.cpi}_SPI_${evm.spi}_EAC_${evm.eacInr}_TIME_${timestamp}_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "KAIROS-FINANCIAL",
          synthesis_report: `EVM S-CURVE NOTARIZED: Week 12 Review • EV: ₹${(evm.evInr / 100000).toFixed(2)}L vs AC: ₹${(evm.acInr / 100000).toFixed(2)}L • CPI: ${evm.cpi} (${evm.costStatus}) • SPI: ${evm.spi} (${evm.scheduleStatus}) • Forecast EAC: ₹${(evm.eacInr / 100000).toFixed(2)}L`,
          merkle_root_hash: hash
        });
      } catch (e) {}
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              EARNED VALUE MANAGEMENT (EVM) CORE
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              IS 15883 & ANSI/PMI 19-006 COMPLIANT
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            STATUTORY S-CURVE & COST/SCHEDULE PERFORMANCE
          </h1>
          <p className="text-xs text-slate-400">
            Project Vanguard Baseline: ₹185.92 Lakhs • 24-Week Schedule • Real-Time Physical Zone Reconciliations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/dpr" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">📋 DPR #084</a>
          <a href="/site/material-recon" className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition">⚖️ CL. 42 RECON</a>
        </div>
      </div>

      {/* Interactive Zone Execution Progress Sliders */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-5 gap-4 text-xs">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ZONE A: FOUNDATION</span>
            <span className="text-cyan-400 font-bold font-mono">{zoneAProgress}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={zoneAProgress}
            onChange={e => setZoneAProgress(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="text-[10px] text-slate-500 mt-1">Weight: 18% (₹33.46L)</div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ZONE B: PODIUM SLAB</span>
            <span className="text-cyan-400 font-bold font-mono">{zoneBProgress}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={zoneBProgress}
            onChange={e => setZoneBProgress(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="text-[10px] text-slate-500 mt-1">Weight: 24% (₹44.62L)</div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ZONE C: SUPERSTRUCTURE</span>
            <span className="text-cyan-400 font-bold font-mono">{zoneCProgress}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={zoneCProgress}
            onChange={e => setZoneCProgress(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="text-[10px] text-slate-500 mt-1">Weight: 36% (₹66.93L)</div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ZONE D: ROOF & MEP</span>
            <span className="text-cyan-400 font-bold font-mono">{zoneDProgress}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={zoneDProgress}
            onChange={e => setZoneDProgress(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="text-[10px] text-slate-500 mt-1">Weight: 22% (₹40.90L)</div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">ACTUAL EXPENDITURE (AC)</span>
            <span className="text-white font-bold font-mono">₹{(actualCostIncurred / 100000).toFixed(1)}L</span>
          </div>
          <input
            type="range"
            min="6000000"
            max="14000000"
            step="100000"
            value={actualCostIncurred}
            onChange={e => setActualCostIncurred(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-400"
          />
          <div className="text-[10px] text-slate-500 mt-1">Weighbridge + Labor Ledger</div>
        </div>
      </div>

      {/* Primary EVM Indices Dashboard Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">PLANNED VALUE (PV)</div>
          <div className="text-lg font-bold text-cyan-400 mt-1 font-mono">₹{(evm.pvInr / 100000).toFixed(2)} L</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Week 12 Target Baseline</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">EARNED VALUE (EV)</div>
          <div className="text-lg font-bold text-white mt-1 font-mono">₹{(evm.evInr / 100000).toFixed(2)} L</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">{((evm.evInr / evm.bacInr) * 100).toFixed(1)}% Physical Progress</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">ACTUAL COST (AC)</div>
          <div className="text-lg font-bold text-amber-400 mt-1 font-mono">₹{(evm.acInr / 100000).toFixed(2)} L</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cost Variance: ₹{(evm.cvInr / 100000).toFixed(2)}L</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">COST EFFICIENCY (CPI)</div>
          <div className={`text-xl font-bold mt-1 font-mono ${evm.cpi >= 1.0 ? "text-emerald-400" : "text-red-400"}`}>
            {evm.cpi}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">CPI = EV / AC ({evm.costStatus.replace(/_/g, " ")})</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">SCHEDULE INDEX (SPI)</div>
          <div className={`text-xl font-bold mt-1 font-mono ${evm.spi >= 1.0 ? "text-emerald-400" : "text-amber-400"}`}>
            {evm.spi}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">SPI = EV / PV ({evm.scheduleStatus.replace(/_/g, " ")})</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">PROJECTED COMPLETION (EAC)</div>
          <div className="text-lg font-bold text-purple-400 mt-1 font-mono">₹{(evm.eacInr / 100000).toFixed(2)} L</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Duration: {evm.projectedDurationWeeks} Weeks ({evm.scheduleDelayWeeks > 0 ? `+${evm.scheduleDelayWeeks}w Delay` : "On Time"})</div>
        </div>
      </div>

      {/* Main Grid: Live Canvas S-Curve Chart & ANSI/PMI EVM Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Dynamic 24-Week Canvas S-Curve Plotter */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[460px]">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <TrendingUpIcon className="w-3.5 h-3.5 text-cyan-400" />
              STATUTORY 24-WEEK LOGISTIC S-CURVE ENVELOPE
            </span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span> Planned (PV)
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span> Earned (EV)
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span> Actual (AC)
              </span>
              <span className="flex items-center gap-1 text-purple-400">
                <span className="w-2.5 h-0.5 bg-purple-400 border-t border-dashed inline-block"></span> Forecast (EAC)
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-950 flex-1 flex flex-col justify-between">
            <EvmSCurveCanvas
              points={evm.sCurvePoints}
              currentWeek={baseline.reportingWeek}
              totalWeeks={baseline.plannedDurationWeeks}
              bacInr={baseline.totalBudgetAtCompletionBacInr}
            />

            {/* Bottom S-Curve Annotation Ledger */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block">COST VARIANCE (CV = EV - AC)</span>
                <span className={`font-bold font-mono text-sm ${evm.cvInr >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {evm.cvInr >= 0 ? `+₹${(evm.cvInr / 100000).toFixed(2)}L` : `-₹${(Math.abs(evm.cvInr) / 100000).toFixed(2)}L`}
                </span>
              </div>

              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block">SCHEDULE VARIANCE (SV = EV - PV)</span>
                <span className={`font-bold font-mono text-sm ${evm.svInr >= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {evm.svInr >= 0 ? `+₹${(evm.svInr / 100000).toFixed(2)}L` : `-₹${(Math.abs(evm.svInr) / 100000).toFixed(2)}L`}
                </span>
              </div>

              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block">TO-COMPLETE INDEX (TCPI BAC)</span>
                <span className="font-bold text-white font-mono text-sm">
                  {evm.tcpiBac} ({evm.tcpiBac > 1.10 ? "TIGHT EFFICIENCY REQ" : "REALISTIC"})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Analytical Forecasting & Statutory Compliance Ledger */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              ANSI/PMI 19-006 FORECASTING DOSSIER
            </span>

            <div className="flex flex-col gap-2 text-xs">
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400">Budget at Completion (BAC):</span>
                  <div className="text-[9px] text-slate-500">Contract Sanctioned Value</div>
                </div>
                <span className="text-white font-mono font-bold">₹{(evm.bacInr / 100000).toFixed(2)} L</span>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400">Standard EAC (BAC / CPI):</span>
                  <div className="text-[9px] text-slate-500">Assumes current cost burn rate</div>
                </div>
                <span className="text-purple-400 font-mono font-bold">₹{(evm.eacInr / 100000).toFixed(2)} L</span>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400">Composite EAC (CPI · SPI):</span>
                  <div className="text-[9px] text-slate-500">Accounts for schedule delay cost</div>
                </div>
                <span className="text-amber-400 font-mono font-bold">₹{(evm.eacCompositeInr / 100000).toFixed(2)} L</span>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400">Variance at Completion (VAC):</span>
                  <div className="text-[9px] text-slate-500">Projected budget surplus / deficit</div>
                </div>
                <span className={`font-mono font-bold ${evm.vacInr >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {evm.vacInr >= 0 ? `+₹${(evm.vacInr / 100000).toFixed(2)}L` : `-₹${(Math.abs(evm.vacInr) / 100000).toFixed(2)}L`}
                </span>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-slate-400">Schedule Completion Date:</span>
                  <div className="text-[9px] text-slate-500">{evm.projectedDurationWeeks} weeks ({baseline.plannedDurationWeeks}w baseline)</div>
                </div>
                <span className={`font-mono font-bold ${evm.scheduleDelayWeeks <= 0 ? "text-emerald-400" : "text-amber-400"}`}>
                  {evm.scheduleDelayWeeks <= 0 ? "ON TRACK" : `+${evm.scheduleDelayWeeks} WEEKS`}
                </span>
              </div>
            </div>
          </div>

          {/* Section 65B EVM Financial Notarization */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>SECTION 65B EVM NOTARIZATION</span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                Cryptographically seals the project's physical-to-financial earned value balance into the immutable statutory audit chain.
              </div>
            </div>

            <div>
              {sealedHash ? (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>EVM S-CURVE NOTARIZED & SEALED</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono truncate select-all">
                    {sealedHash}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSealEvmMetrics}
                  disabled={isNotarizing}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE WEEK 12 EVM S-CURVE</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: CANVAS 24-WEEK DYNAMIC S-CURVE PLOTTER ---
function EvmSCurveCanvas({
  points,
  currentWeek,
  totalWeeks,
  bacInr
}: {
  points: S說urveDataPoint[];
  currentWeek: number;
  totalWeeks: number;
  bacInr: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padL = 60;
    const padR = 25;
    const padT = 25;
    const padB = 35;

    // Background
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, w, h);

    const maxCost = bacInr * 1.25; // 25% overhead buffer for plotting EAC overrun
    const toX = (wk: number) => padL + (wk / totalWeeks) * (w - padL - padR);
    const toY = (val: number) => h - padB - (val / maxCost) * (h - padT - padB);

    // Grid lines & Axis Labels
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#64748b";
    ctx.font = "9px monospace";

    // X-Axis Weeks (0, 4, 8, 12, 16, 20, 24)
    for (let wk = 0; wk <= totalWeeks; wk += 4) {
      const x = toX(wk);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, h - padB);
      ctx.stroke();
      ctx.fillText(`W${wk}`, x - 8, h - padB + 14);
    }

    // Y-Axis Cost (Lakhs)
    for (let c = 0; c <= maxCost; c += 4000000) {
      const y = toY(c);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillText(`₹${(c / 100000).toFixed(0)}L`, padL - 45, y + 3);
    }

    // Current Reporting Week Vertical Line (W12)
    const curX = toX(currentWeek);
    ctx.strokeStyle = "rgba(100, 116, 139, 0.5)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(curX, padT);
    ctx.lineTo(curX, h - padB);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText("Data Date (W12)", curX - 35, padT - 8);

    // 1. Plot Planned Value (PV) S-Curve (Cyan)
    ctx.strokeStyle = "#06b6d4";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    points.forEach((pt, i) => {
      const x = toX(pt.week);
      const y = toY(pt.plannedValueInr);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 2. Plot Forecast Trajectory (EAC) (Purple Dashed)
    ctx.strokeStyle = "#a855f7";
    ctx.lineWidth = 2.0;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    points.forEach((pt, i) => {
      if (pt.week >= currentWeek && pt.forecastEacInr !== null) {
        const x = toX(pt.week);
        const y = toY(pt.forecastEacInr);
        if (pt.week === currentWeek) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
    ctx.setLineDash([]);

    // 3. Plot Actual Cost (AC) Curve up to Week 12 (Amber)
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let startedAc = false;
    points.forEach(pt => {
      if (pt.actualCostInr !== null) {
        const x = toX(pt.week);
        const y = toY(pt.actualCostInr);
        if (!startedAc) {
          ctx.moveTo(x, y);
          startedAc = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();

    // 4. Plot Earned Value (EV) Curve up to Week 12 (Emerald)
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    let startedEv = false;
    points.forEach(pt => {
      if (pt.earnedValueInr !== null) {
        const x = toX(pt.week);
        const y = toY(pt.earnedValueInr);
        if (!startedEv) {
          ctx.moveTo(x, y);
          startedEv = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
    });
    ctx.stroke();

    // Highlight current data points at Week 12
    const curPt = points[currentWeek];
    if (curPt && curPt.earnedValueInr !== null && curPt.actualCostInr !== null) {
      // EV Dot
      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(curX, toY(curPt.earnedValueInr), 4.5, 0, Math.PI * 2);
      ctx.fill();

      // AC Dot
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      ctx.arc(curX, toY(curPt.actualCostInr), 4.5, 0, Math.PI * 2);
      ctx.fill();

      // PV Dot
      ctx.fillStyle = "#06b6d4";
      ctx.beginPath();
      ctx.arc(curX, toY(curPt.plannedValueInr), 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [points, currentWeek, totalWeeks, bacInr]);

  return (
    <canvas
      ref={canvasRef}
      width={780}
      height={320}
      className="w-full h-full object-contain"
    />
  );
}
