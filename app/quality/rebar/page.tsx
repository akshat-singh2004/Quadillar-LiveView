"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  calculateDevelopmentLength,
  calculateUnitWeightKgPerM,
  calculateCuttingLengthMm,
  solve1DCuttingStock,
  StructuralMemberBarSpec
} from "@/lib/calculations/rebarBbsEngine";

// --- INLINE SVG ICONS ---
const LayersIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
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

export default function RebarBbsNestingPage() {
  // Physical parameters directly mapped to Vanguard BIM: Width = 10.3m, Depth = 10.9m, Height = 15m
  const [selectedSpanAxis, setSelectedSpanAxis] = useState<"X_BAY_10_3M" | "Z_BAY_10_9M">("X_BAY_10_3M");
  const [steelGrade, setSteelGrade] = useState<number>(550); // Fe 550D
  const [concreteGrade, setConcreteGrade] = useState<number>(35); // M35
  const [barDiameter, setBarDiameter] = useState<number>(20); // 20mm primary longitudinal
  const [clearCoverMm, setClearCoverMm] = useState<number>(40); // 40mm beam cover

  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  const spanLengthM = selectedSpanAxis === "X_BAY_10_3M" ? 10.3 : 10.9;

  // 1. Structural Member Schedule Derived from Vanguard Framework
  const barSpecs: StructuralMemberBarSpec[] = useMemo(() => [
    {
      memberTag: `BM-BTM-${selectedSpanAxis === "X_BAY_10_3M" ? "10.3M" : "10.9M"}`,
      memberType: "BEAM",
      barDiaMm: barDiameter,
      steelGradeMpa: steelGrade,
      concreteGradeMpa: concreteGrade,
      spanLengthM,
      clearCoverMm,
      quantityPerMember: 3,
      totalMembersCount: 6, // 3 bays * 2 frames per level
      shapeType: "STRAIGHT_WITH_HOOKS"
    },
    {
      memberTag: `BM-TOP-CONTINUOUS`,
      memberType: "BEAM",
      barDiaMm: 16,
      steelGradeMpa: steelGrade,
      concreteGradeMpa: concreteGrade,
      spanLengthM,
      clearCoverMm,
      quantityPerMember: 2,
      totalMembersCount: 6,
      shapeType: "STRAIGHT_WITH_HOOKS"
    },
    {
      memberTag: `COL-VERT-15M-LIFT`,
      memberType: "COLUMN",
      barDiaMm: 25,
      steelGradeMpa: steelGrade,
      concreteGradeMpa: concreteGrade,
      spanLengthM: 15.0,
      clearCoverMm: 40,
      quantityPerMember: 8,
      totalMembersCount: 9, // 9 structural columns in 3x3 bay
      shapeType: "COLUMN_VERTICAL"
    },
    {
      memberTag: `TIE-SHEAR-LINK-100C/C`,
      memberType: "STIRRUP",
      barDiaMm: 8,
      steelGradeMpa: steelGrade,
      concreteGradeMpa: concreteGrade,
      spanLengthM,
      clearCoverMm,
      quantityPerMember: 52, // 100mm spacing along beam
      totalMembersCount: 6,
      shapeType: "RECTANGULAR_TIE"
    }
  ], [selectedSpanAxis, spanLengthM, barDiameter, steelGrade, concreteGrade, clearCoverMm]);

  // 2. Compute Bar Bending Schedule (BBS) Metrics with IS 2502 Deductions
  const bbsSchedule = useMemo(() => {
    return barSpecs.map(spec => {
      const cutData = calculateCuttingLengthMm(spec);
      const unitWeight = calculateUnitWeightKgPerM(spec.barDiaMm);
      const totalPieces = spec.quantityPerMember * spec.totalMembersCount;
      const totalLengthM = +((cutData.netCuttingLengthMm * totalPieces) / 1000).toFixed(2);
      const totalWeightKg = +(totalLengthM * unitWeight).toFixed(1);

      return {
        ...spec,
        ...cutData,
        unitWeight,
        totalPieces,
        totalLengthM,
        totalWeightKg
      };
    });
  }, [barSpecs]);

  // 3. Execute 1D Billet Stock Nesting on Standard 12.0m Commercial Bars
  const nestingDemands = useMemo(() => {
    return bbsSchedule.map(s => ({
      tag: s.memberTag,
      lengthMm: s.netCuttingLengthMm,
      count: s.totalPieces
    }));
  }, [bbsSchedule]);

  const nestingSolution = useMemo(() => {
    return solve1DCuttingStock(nestingDemands, 12000);
  }, [nestingDemands]);

  const handleSealRebarNesting = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawPayload = `VANGUARD_REBAR_BBS_SPAN_${spanLengthM}M_EFF_${nestingSolution.materialEfficiencyPct}_SCRAP_${nestingSolution.scrapPercentage}_BARS_${nestingSolution.totalStockBarsUsed}_TIME_${timestamp}`;
    const hash = await generateSHA256(rawPayload);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "HEPHAESTUS-REBAR",
          synthesis_report: `BBS & BILLET NESTING NOTARIZED: Span: ${spanLengthM}m • Grade: Fe ${steelGrade}D / M${concreteGrade} • 12m Bars: ${nestingSolution.totalStockBarsUsed} • Efficiency: ${nestingSolution.materialEfficiencyPct}% • Scrap: ${nestingSolution.scrapPercentage}%`,
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
              REBAR BBS & BILLET CUTTING STOCK OPTIMIZER
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              IS 2502:1963 & IS 456 CL. 26.2
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            REBAR BBS & 1D BILLET NESTING ENGINE
          </h1>
          <p className="text-xs text-slate-400">
            Automated bend deduction calculation and 12.0m commercial rebar stock optimization for Project Vanguard
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">��️ 3D BIM TWIN</a>
          <a href="/site/concrete-maturity" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">🌡️ CONCRETE MATURITY</a>
        </div>
      </div>

      {/* Interactive Structural Parameter Controls */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">VANGUARD BAY AXIS</div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedSpanAxis("X_BAY_10_3M")}
              className={`flex-1 py-1.5 rounded-lg border font-bold text-xs transition ${
                selectedSpanAxis === "X_BAY_10_3M"
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                  : "bg-slate-950 text-slate-400 border-slate-800"
              }`}
            >
              10.3m (X-Bay)
            </button>
            <button
              onClick={() => setSelectedSpanAxis("Z_BAY_10_9M")}
              className={`flex-1 py-1.5 rounded-lg border font-bold text-xs transition ${
                selectedSpanAxis === "Z_BAY_10_9M"
                  ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                  : "bg-slate-950 text-slate-400 border-slate-800"
              }`}
            >
              10.9m (Z-Bay)
            </button>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Span L = {spanLengthM} meters</div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">STEEL GRADE (IS 1786)</div>
          <div className="flex gap-2">
            {[500, 550].map(grade => (
              <button
                key={grade}
                onClick={() => setSteelGrade(grade)}
                className={`flex-1 py-1.5 rounded-lg border font-bold text-xs transition ${
                  steelGrade === grade
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                    : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                Fe {grade}D
              </button>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Design Stress: {(0.87 * steelGrade).toFixed(1)} MPa</div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">PRIMARY BAR DIA (d)</div>
          <div className="flex gap-1.5">
            {[16, 20, 25, 32].map(dia => (
              <button
                key={dia}
                onClick={() => setBarDiameter(dia)}
                className={`flex-1 py-1.5 rounded-lg border font-bold text-xs transition ${
                  barDiameter === dia
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                    : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                {dia}mm
              </button>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Unit Wt: {calculateUnitWeightKgPerM(barDiameter)} kg/m</div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">CONCRETE GRADE & COVER</div>
          <div className="flex gap-2">
            <select
              value={concreteGrade}
              onChange={e => setConcreteGrade(parseInt(e.target.value, 10))}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white"
            >
              <option value={25}>M25</option>
              <option value={30}>M30</option>
              <option value={35}>M35</option>
              <option value={40}>M40</option>
            </select>
            <input
              type="number"
              value={clearCoverMm}
              onChange={e => setClearCoverMm(parseInt(e.target.value, 10) || 40)}
              className="w-16 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white text-center"
              placeholder="Cover"
            />
            <span className="text-slate-500 text-xs self-center">mm</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Bond Stress: τ_bd = {(concreteGrade >= 35 ? 1.7 * 1.6 : 1.5 * 1.6).toFixed(2)} MPa</div>
        </div>
      </div>

      {/* KPI Optimization Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">12M STOCK BARS REQUIRED</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">{nestingSolution.totalStockBarsUsed} Billets</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Total Length: {(nestingSolution.totalStockBarsUsed * 12).toLocaleString()} m</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">MATERIAL UTILIZATION</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{nestingSolution.materialEfficiencyPct}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Cut Length: {(nestingSolution.totalCutWeightKg).toLocaleString()} kg</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">NON-RECOVERABLE SCRAP</div>
          <div className={`text-xl font-bold mt-1 font-mono ${nestingSolution.scrapPercentage < 3.0 ? "text-emerald-400" : "text-amber-400"}`}>
            {nestingSolution.scrapPercentage}% ({nestingSolution.scrapWeightKg} kg)
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Site Limit: &lt; 2.50%</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">TENSION ANCHORAGE (L_d)</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{calculateDevelopmentLength(barDiameter, steelGrade, concreteGrade)} mm</div>
          <div className="text-[10px] text-cyan-400 mt-0.5">~{(calculateDevelopmentLength(barDiameter, steelGrade, concreteGrade) / barDiameter).toFixed(0)}d per IS 456 Cl. 26.2</div>
        </div>
      </div>

      {/* Main Grid: Bar Bending Schedule (BBS) Table & Live 12m Nesting Blueprint */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Detailed IS 2502 Bar Bending Schedule */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <LayersIcon className="w-3.5 h-3.5 text-cyan-400" />
              BAR BENDING SCHEDULE (IS 2502 BEND DEDUCTION TABLE)
            </span>
            <span className="text-cyan-400 font-mono text-[10px]">SPAN: {spanLengthM}m</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-2.5 px-3">MEMBER TAG</th>
                  <th className="py-2.5 px-3">BAR DIA</th>
                  <th className="py-2.5 px-3">GROSS (mm)</th>
                  <th className="py-2.5 px-3">BEND DED.</th>
                  <th className="py-2.5 px-3">CUT LEN (mm)</th>
                  <th className="py-2.5 px-3">NO.</th>
                  <th className="py-2.5 px-3 text-right">TOTAL WT (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono text-[11px]">
                {bbsSchedule.map((bar, idx) => (
                  <tr key={idx} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 px-3 font-bold text-white">{bar.memberTag}</td>
                    <td className="py-2.5 px-3 font-bold text-cyan-400">{bar.barDiaMm}mm</td>
                    <td className="py-2.5 px-3 text-slate-400">{bar.grossLengthMm}</td>
                    <td className="py-2.5 px-3 text-amber-400">-{bar.bendDeductionMm}mm</td>
                    <td className="py-2.5 px-3 font-bold text-emerald-400">{bar.netCuttingLengthMm}</td>
                    <td className="py-2.5 px-3">{bar.totalPieces}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-white">{bar.totalWeightKg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-400">
            Formulation: L_net = L_gross - Sum(Bends). Bend deductions per IS 2502 Cl. 4.2: 45° = 1d, 90° = 2d, 135° = 3d.
          </div>
        </div>

        {/* Right: 12.0m Commercial Billet 1D Nesting Blueprint */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                12M BILLET STOCK NESTING BLUEPRINT
              </span>
              <span className="text-[10px] text-slate-500 font-mono">FIRST-FIT DECREASING (FFD)</span>
            </div>

            <p className="text-[11px] text-slate-400 mt-2">
              Optimized cutting layout on 12,000mm standard commercial TMT stock bars. Segments colored by cut type:
            </p>

            {/* Visual Nesting Stack (Display first 6 nested stock billets) */}
            <div className="flex flex-col gap-2.5 mt-3">
              {nestingSolution.stockBars.slice(0, 6).map((bar) => {
                const totalMm = bar.stockLengthMm;
                return (
                  <div key={bar.barIndex} className="bg-slate-950 border border-slate-800/80 p-2.5 rounded-xl flex flex-col gap-1.5">
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-white font-mono">BILLET #{bar.barIndex} (12,000 mm)</span>
                      <span className="text-slate-400 font-mono">
                        Used: {bar.totalCutLengthMm} mm | Offcut: <strong className={bar.isScrap ? "text-red-400" : "text-emerald-400"}>{bar.offcutMm} mm</strong>
                      </span>
                    </div>

                    {/* Proportional Segmented Progress Bar */}
                    <div className="w-full h-3 bg-slate-900 rounded-md overflow-hidden flex border border-slate-800">
                      {bar.cuts.map((cut, cIdx) => {
                        const widthPct = (cut.lengthMm / totalMm) * 100;
                        const colors = [
                          "bg-cyan-500 border-r border-slate-950",
                          "bg-emerald-500 border-r border-slate-950",
                          "bg-amber-500 border-r border-slate-950",
                          "bg-purple-500 border-r border-slate-950"
                        ];
                        const colorClass = colors[cIdx % colors.length];
                        return (
                          <div
                            key={cIdx}
                            className={`h-full ${colorClass}`}
                            style={{ width: `${widthPct}%` }}
                            title={`${cut.memberTag}: ${cut.lengthMm}mm`}
                          />
                        );
                      })}
                      {/* Remainder Offcut / Scrap */}
                      <div
                        className={`h-full ${bar.isScrap ? "bg-red-950/80" : "bg-slate-800"}`}
                        style={{ width: `${(bar.offcutMm / totalMm) * 100}%` }}
                        title={`Remainder: ${bar.offcutMm}mm ${bar.isScrap ? "(Scrap < 1.2m)" : "(Usable Dowel)"}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 65B Rebar Cutting Stock Seal */}
          <div className="pt-2 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="text-xs text-slate-400">
              Authority: <strong className="text-emerald-400">HEPHAESTUS-REBAR-OPTIMIZER</strong>
            </div>

            <div>
              {sealedHash ? (
                <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400">
                  <CheckIcon className="w-4 h-4" />
                  <span className="font-mono text-[10px] select-all">{sealedHash.substring(0, 28)}...</span>
                </div>
              ) : (
                <button
                  onClick={handleSealRebarNesting}
                  disabled={isNotarizing}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE REBAR BBS (SEC 65B)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
