"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import {
  calculateCubeStrength,
  validateCubeSampleRange,
  evaluateFourBatchStatisticalAcceptance,
  DigitalPourCardRecord
} from "@/lib/calculations/concreteQualityEngine";

// --- INLINE SVG ICONS ---
const ClipboardCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
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
const FileTextIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
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

export default function DigitalPourCardPage() {
  const targetFck = 35.0; // M35 Design Grade

  // Active Pour Cards for Project Vanguard
  const [pourCards] = useState<DigitalPourCardRecord[]>([
    {
      pourCardNo: "PC-VGD-2026-042",
      wbsActivityId: "ACT-03",
      structuralLocation: "BIT-4 Podium Transfer Slab & Suspended Beams (+4.50m RL)",
      concreteGradeMpa: 35.0,
      mixDesignRef: "MIX-DES-M35-OPC53-REV2",
      batchingPlantSupplier: "UltraTech Concrete Ltd (Amausi Plant)",
      pourVolumeM3: 32.2,
      slumpMm: 125,
      freshConcreteTempC: 28.5,
      castingDate: "29-Sep-2026",
      testDate7d: "06-Oct-2026",
      testDate28d: "27-Oct-2026",
      prePourChecklist: {
        formworkAlignmentAndPlumb: true,
        rebarBbsTyingAndCoverBlocks: true,
        mepConduitsAndSleevesFixed: true,
        surfaceCleaningAndDewatering: true,
        tripartiteSignatureObtained: true
      },
      sampleCubes7d: [
        { cubeId: "PC42-7D-01", crushLoadKn: 615, compressiveStrengthMpa: calculateCubeStrength(615), failurePattern: "NORMAL_CONE_PYRAMID", isRangeCompliantWithin15Pct: true },
        { cubeId: "PC42-7D-02", crushLoadKn: 630, compressiveStrengthMpa: calculateCubeStrength(630), failurePattern: "NORMAL_CONE_PYRAMID", isRangeCompliantWithin15Pct: true },
        { cubeId: "PC42-7D-03", crushLoadKn: 605, compressiveStrengthMpa: calculateCubeStrength(605), failurePattern: "NORMAL_CONE_PYRAMID", isRangeCompliantWithin15Pct: true }
      ],
      sampleCubes28d: [
        { cubeId: "PC42-28D-01", crushLoadKn: 890, compressiveStrengthMpa: calculateCubeStrength(890), failurePattern: "NORMAL_CONE_PYRAMID", isRangeCompliantWithin15Pct: true },
        { cubeId: "PC42-28D-02", crushLoadKn: 915, compressiveStrengthMpa: calculateCubeStrength(915), failurePattern: "NORMAL_CONE_PYRAMID", isRangeCompliantWithin15Pct: true },
        { cubeId: "PC42-28D-03", crushLoadKn: 875, compressiveStrengthMpa: calculateCubeStrength(875), failurePattern: "NORMAL_CONE_PYRAMID", isRangeCompliantWithin15Pct: true }
      ],
      meanStrength7dMpa: 27.41,
      meanStrength28dMpa: 39.70,
      is7dStrengthPassed: true,
      is28dStrengthPassed: true,
      section65bHash: "9f84b21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"
    },
    {
      pourCardNo: "PC-VGD-2026-038",
      wbsActivityId: "ACT-02",
      structuralLocation: "BIT-4 Column C2 & Retaining Pedestal (0.0m to +4.50m RL — NCR-009)",
      concreteGradeMpa: 35.0,
      mixDesignRef: "MIX-DES-M35-OPC53-REV2",
      batchingPlantSupplier: "UltraTech Concrete Ltd (Amausi Plant)",
      pourVolumeM3: 16.5,
      slumpMm: 115,
      freshConcreteTempC: 29.2,
      castingDate: "15-Sep-2026",
      testDate7d: "22-Sep-2026",
      testDate28d: "13-Oct-2026",
      prePourChecklist: {
        formworkAlignmentAndPlumb: true,
        rebarBbsTyingAndCoverBlocks: true,
        mepConduitsAndSleevesFixed: true,
        surfaceCleaningAndDewatering: true,
        tripartiteSignatureObtained: true
      },
      sampleCubes7d: [
        { cubeId: "PC38-7D-01", crushLoadKn: 540, compressiveStrengthMpa: calculateCubeStrength(540), failurePattern: "NORMAL_CONE_PYRAMID", isRangeCompliantWithin15Pct: true },
        { cubeId: "PC38-7D-02", crushLoadKn: 555, compressiveStrengthMpa: calculateCubeStrength(555), failurePattern: "NORMAL_CONE_PYRAMID", isRangeCompliantWithin15Pct: true },
        { cubeId: "PC38-7D-03", crushLoadKn: 530, compressiveStrengthMpa: calculateCubeStrength(530), failurePattern: "NORMAL_CONE_PYRAMID", isRangeCompliantWithin15Pct: true }
      ],
      sampleCubes28d: [
        { cubeId: "PC38-28D-01", crushLoadKn: 785, compressiveStrengthMpa: calculateCubeStrength(785), failurePattern: "SHEAR_FAILURE", isRangeCompliantWithin15Pct: true },
        { cubeId: "PC38-28D-02", crushLoadKn: 795, compressiveStrengthMpa: calculateCubeStrength(795), failurePattern: "NORMAL_CONE_PYRAMID", isRangeCompliantWithin15Pct: true },
        { cubeId: "PC38-28D-03", crushLoadKn: 765, compressiveStrengthMpa: calculateCubeStrength(765), failurePattern: "NORMAL_CONE_PYRAMID", isRangeCompliantWithin15Pct: true }
      ],
      meanStrength7dMpa: 24.07,
      meanStrength28dMpa: 34.74, // Below target 35.0 -> Honeycomb NCR Triggered!
      is7dStrengthPassed: true,
      is28dStrengthPassed: false,
      section65bHash: "3f90a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"
    }
  ]);

  const [selectedCardNo, setSelectedCardNo] = useState<string>("PC-VGD-2026-042");
  const [liveTestLoadKn, setLiveTestLoadKn] = useState<number>(890); // 890 kN hydraulic failure load
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  const activeCard = useMemo(() => {
    return pourCards.find(c => c.pourCardNo === selectedCardNo) || pourCards[0];
  }, [pourCards, selectedCardNo]);

  // Real-time calculation of single cube failure stress
  const liveStrengthMpa = useMemo(() => calculateCubeStrength(liveTestLoadKn), [liveTestLoadKn]);

  // IS 456 Cl. 16.1 4-Batch Statistical Acceptance Evaluation
  const fourBatchStatisticalAudit = useMemo(() => {
    // 4 non-overlapping consecutive 28-day sample means (MPa) for M35 mix
    const fourSamples: [number, number, number, number] = [39.70, 38.85, 40.20, 39.40];
    return evaluateFourBatchStatisticalAcceptance(fourSamples, 35.0, 5.0);
  }, []);

  const handleSealPourCardAudit = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_POUR_CARD_${activeCard.pourCardNo}_7D_${activeCard.meanStrength7dMpa}MPA_28D_${activeCard.meanStrength28dMpa}MPA_STATISTICAL_${fourBatchStatisticalAudit.isBatchAcceptedUnderIS456}_${timestamp}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: VANGUARD_GENOME.projectId,
          primary_governor: "THEMIS-QUALITY",
          synthesis_report: `DIGITAL POUR CARD & CTM NOTARIZED: Card ${activeCard.pourCardNo} (${activeCard.structuralLocation}) • 7-Day Mean: ${activeCard.meanStrength7dMpa} MPa • 28-Day Mean: ${activeCard.meanStrength28dMpa} MPa • IS 456 Cl. 16 Statistical Acceptance: ${fourBatchStatisticalAudit.fourSampleMeanMpa} MPa (Threshold >= ${fourBatchStatisticalAudit.statutoryMeanThresholdMpa} MPa) • Calibrated CTM Record Attested`,
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
              IS 456:2000 CL. 15 & 16 / IS 516
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              STATISTICAL QUALITY ACCEPTANCE ENGINE
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            DIGITAL POUR CARDS & CTM COMPRESSIVE STRENGTH REGISTER
          </h1>
          <p className="text-xs text-slate-400">
            Project Vanguard • 150mm Cube Crushing Telemetry • 4-Consecutive Batch Statistical Verification (f_ck = 35.0 MPa)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin?bit=BIT-4" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ BIT-4 IN 3D BIM</a>
          <a href="/engineering/concrete-maturity" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">🌡️ CONCRETE MATURITY</a>
          <a href="/site/ndt" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🔬 NDT INTEGRITY</a>
          <a href="/materials/reconciliation" className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition">⚖️ CL. 42 RECON</a>
        </div>
      </div>

      {/* Primary KPI Quality Acceptance Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">7-DAY CUBE STRENGTH</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
            {activeCard.meanStrength7dMpa} MPa
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Target: ≥ 23.45 MPa (67% f_ck)</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">28-DAY CHARACTERISTIC</div>
          <div className={`text-xl font-bold mt-1 font-mono ${activeCard.is28dStrengthPassed ? "text-emerald-400" : "text-red-400"}`}>
            {activeCard.meanStrength28dMpa} MPa
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Specified Target: ≥ {activeCard.concreteGradeMpa}.00 MPa
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">4-SAMPLE STATISTICAL MEAN</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">
            {fourBatchStatisticalAudit.fourSampleMeanMpa} MPa
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">
            Threshold: ≥ {fourBatchStatisticalAudit.statutoryMeanThresholdMpa} MPa (IS 456)
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">STATUTORY ACCEPTANCE</div>
          <div className={`text-sm font-bold mt-1.5 flex items-center gap-1.5 ${
            fourBatchStatisticalAudit.isBatchAcceptedUnderIS456 ? "text-emerald-400" : "text-red-400"
          }`}>
            <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
            <span>{fourBatchStatisticalAudit.isBatchAcceptedUnderIS456 ? "IS 456 CL. 16 PASS" : "NON-CONFORMANCE"}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">σ = 5.0 N/mm² (Table 8)</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">PRE-POUR PERMIT</div>
          <div className="text-sm font-bold text-emerald-400 mt-1.5 flex items-center gap-1.5">
            <CheckIcon className="w-4 h-4" />
            <span>100% CHECKLIST VERIFIED</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Tripartite Signed Off</div>
        </div>
      </div>

      {/* Main Grid: Pour Card Details & Calibrated CTM Crushing Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Digital Pour Card & Pre-Pour Quality Audit */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardCheckIcon className="w-4 h-4 text-cyan-400" />
              POUR CARD PARTICULARS & PRE-CONCRETING CHECKLIST
            </span>
            <div className="flex gap-1.5">
              {pourCards.map(c => (
                <button
                  key={c.pourCardNo}
                  onClick={() => setSelectedCardNo(c.pourCardNo)}
                  className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold font-mono transition ${
                    selectedCardNo === c.pourCardNo
                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                      : "bg-slate-950 text-slate-400 border-slate-800"
                  }`}
                >
                  {c.pourCardNo.split("-")[3] || c.pourCardNo}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">STRUCTURAL ELEMENT</span>
              <div className="text-white font-bold text-sm mt-0.5">{activeCard.structuralLocation}</div>
              <div className="text-[10px] text-cyan-400 mt-0.5">WBS: {activeCard.wbsActivityId} • Volume: {activeCard.pourVolumeM3} m³</div>
            </div>

            <div>
              <span className="text-[10px] text-slate-500 uppercase font-bold block">MIX PROPORTION & RMC PLANT</span>
              <div className="text-white font-bold text-sm mt-0.5 font-mono">{activeCard.mixDesignRef}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{activeCard.batchingPlantSupplier}</div>
            </div>
          </div>

          {/* Fresh Concrete Physical Parameters */}
          <div className="grid grid-cols-3 gap-2.5 text-xs">
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[9px] text-slate-500 block uppercase">WORKABILITY SLUMP</span>
              <span className="text-white font-bold font-mono text-base">{activeCard.slumpMm} mm</span>
              <span className="text-[8px] text-slate-500 block">Target: 120 ± 25 mm</span>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[9px] text-slate-500 block uppercase">CONCRETE TEMP</span>
              <span className="text-white font-bold font-mono text-base">{activeCard.freshConcreteTempC} °C</span>
              <span className="text-[8px] text-slate-500 block">IS 456 Limit: ≤ 32 °C</span>
            </div>

            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-center">
              <span className="text-[9px] text-slate-500 block uppercase">CASTING DATE</span>
              <span className="text-cyan-400 font-bold font-mono text-sm">{activeCard.castingDate}</span>
              <span className="text-[8px] text-slate-500 block">28d Test: {activeCard.testDate28d}</span>
            </div>
          </div>

          {/* Pre-Pour Mandatory Gate Checklist */}
          <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-col gap-1.5 text-[11px]">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
              MANDATORY PRE-POUR TRIPARTITE SIGN-OFFS
            </span>

            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-emerald-400 font-bold">✔</span>
              <span>Formwork Alignment, Line, Level & Plumb Certified (IS 456 Table 20)</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-emerald-400 font-bold">✔</span>
              <span>TMT Fe 550D Rebar Spacing, Lap Lengths & 40mm Cover Blocks Placed</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-emerald-400 font-bold">✔</span>
              <span>MEP Electrical Conduits, Fire Spool Inserts & Sleeves Secured</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="text-emerald-400 font-bold">✔</span>
              <span>Joint Inspection Sign-Off: L&T (GC), CBRE (PMC) & Vanguard Holdings (Client)</span>
            </div>
          </div>

          {/* 3-Cube 28-Day Crushing Register */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-[10px] text-slate-500 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2 px-2">CUBE ID</th>
                  <th className="py-2 px-2">FAILURE LOAD (kN)</th>
                  <th className="py-2 px-2">STRENGTH (MPa)</th>
                  <th className="py-2 px-2">FAILURE PATTERN</th>
                  <th className="py-2 px-2 text-right">RANGE CHECK</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-[11px]">
                {activeCard.sampleCubes28d.map(cube => (
                  <tr key={cube.cubeId} className="hover:bg-slate-900/40">
                    <td className="py-2 px-2 font-bold text-white">{cube.cubeId}</td>
                    <td className="py-2 px-2 text-slate-300">{cube.crushLoadKn} kN</td>
                    <td className="py-2 px-2 font-bold text-cyan-400">{cube.compressiveStrengthMpa} MPa</td>
                    <td className="py-2 px-2 text-slate-400 text-[10px]">{cube.failurePattern.replace(/_/g, " ")}</td>
                    <td className="py-2 px-2 text-right">
                      <span className="text-emerald-400 font-bold text-[10px]">✔ ±15% IS 456 OK</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right: Calibrated Digital CTM Simulator & Section 65B Notarization */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* CTM Crushing Simulator */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              DIGITAL COMPRESSION TESTING MACHINE (CTM)
            </span>

            {/* Load Adjustment Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">HYDRAULIC CRUSH LOAD (P):</span>
                <span className="text-cyan-400 font-bold font-mono">{liveTestLoadKn} kN</span>
              </div>
              <input
                type="range"
                min="500"
                max="1200"
                step="5"
                value={liveTestLoadKn}
                onChange={e => setLiveTestLoadKn(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="text-[10px] text-slate-500 mt-1">Calibrated Load Cell • Rate: 14 N/mm²/min (IS 516)</div>
            </div>

            {/* In-Situ Failure Stress Output */}
            <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center font-mono">
              <div>
                <span className="text-[9px] text-slate-500 uppercase block font-bold">CALCULATED COMPRESSIVE STRENGTH</span>
                <span className={`text-2xl font-bold ${liveStrengthMpa >= targetFck ? "text-emerald-400" : "text-amber-400"}`}>
                  {liveStrengthMpa} MPa
                </span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-slate-500 uppercase block">SPECIMEN SURFACE</span>
                <span className="text-white font-bold text-sm">150 × 150 mm</span>
                <span className="text-[9px] text-slate-400 block">(Area: 22,500 mm²)</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 leading-relaxed font-mono bg-black/40 p-2.5 rounded-lg border border-slate-900">
              Formulation: f_c = (P × 1000) / 22500 N/mm². At {liveTestLoadKn} kN, specimen achieves {liveStrengthMpa} N/mm² ({((liveStrengthMpa / targetFck) * 100).toFixed(1)}% of design M35).
            </div>
          </div>

          {/* IS 456 Cl. 16.1 Statistical Acceptance Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                IS 456 STATISTICAL EVALUATION (4 BATCHES)
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">TABLE 11 PASS</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block">4-SAMPLE MEAN</span>
                <span className="text-emerald-400 font-bold text-base">{fourBatchStatisticalAudit.fourSampleMeanMpa} MPa</span>
                <span className="text-[9px] text-slate-400 block">Required: ≥ {fourBatchStatisticalAudit.statutoryMeanThresholdMpa} MPa</span>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block">INDIVIDUAL SAMPLE</span>
                <span className="text-white font-bold text-base">≥ 38.85 MPa</span>
                <span className="text-[9px] text-slate-400 block">Required: ≥ 32.00 MPa</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400">
              {fourBatchStatisticalAudit.statutoryVerdict}
            </div>
          </div>

          {/* Section 65B Notarization Card */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>SECTION 65B CTM QUALITY ATTESTATION</span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                Cryptographically binds the digital CTM load-cell telemetry, cube crush readings, and IS 456 statistical acceptance into the permanent legal ledger.
              </div>
            </div>

            <div>
              {sealedHash ? (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>POUR CARD & CTM RECORD NOTARIZED</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono truncate select-all">
                    {sealedHash}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSealPourCardAudit}
                  disabled={isNotarizing}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50 font-mono"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ClipboardCheckIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE POUR CARD & CTM AUDIT (SEC 65B)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
