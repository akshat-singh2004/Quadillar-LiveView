"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  PileGeometry,
  SoilStratumLayer,
  LoadTestObservation,
  calculateStaticPileCapacity,
  calculateDavissonElasticOffset,
  evaluateIS2911Compliance,
  calculateGroupEfficiency
} from "@/lib/calculations/geotechPileEngine";

// --- INLINE SVG ICONS ---
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 00-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const GaugeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
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

export default function GeotechnicalPileLoadPage() {
  // 1. Physical Bored Pile Configuration mapped to Vanguard Sub-Structure
  const [pileDiameterMm, setPileDiameterMm] = useState<number>(500); // 500mm bored cast-in-situ
  const [embeddedLengthM, setEmbeddedLengthM] = useState<number>(18.0); // 18m depth into Gomti alluvium
  const [concreteGradeMpa] = useState<number>(35); // M35

  // 2. Active Test Point Controls (Simulates Kentledge hydraulic jack up to 2.5x working load)
  const [testStagePct, setTestStagePct] = useState<number>(150); // 150% Routine Test
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  // 3. Lucknow Alluvial Geotechnical Stratification (Gomti Basin Borehole BH-01)
  const soilStrata: SoilStratumLayer[] = useMemo(() => [
    { layerName: "Upper Silty Clay Fill", depthFromM: 0.0, depthToM: 3.5, soilType: "CLAY_SILT", cohesionCuKpa: 45, adhesionFactorAlpha: 0.70, effectiveFrictionAngleDeg: 12, sptNValue: 8 },
    { layerName: "Medium Stiff Yellowish Clay", depthFromM: 3.5, depthToM: 9.0, soilType: "CLAY_SILT", cohesionCuKpa: 65, adhesionFactorAlpha: 0.55, effectiveFrictionAngleDeg: 15, sptNValue: 14 },
    { layerName: "Dense Fine Silty Sand", depthFromM: 9.0, depthToM: 14.5, soilType: "SAND", cohesionCuKpa: 15, adhesionFactorAlpha: 0.35, effectiveFrictionAngleDeg: 32, sptNValue: 26 },
    { layerName: "Very Dense Sand / Gravel Tip", depthFromM: 14.5, depthToM: 22.0, soilType: "DENSE_SAND", cohesionCuKpa: 0, adhesionFactorAlpha: 0.20, effectiveFrictionAngleDeg: 38, sptNValue: 42 }
  ], []);

  const pileGeometry: PileGeometry = useMemo(() => ({
    diameterMm: pileDiameterMm,
    embeddedLengthM,
    concreteGradeMpa,
    modulusOfElasticityGpa: +(5 * Math.sqrt(concreteGradeMpa)).toFixed(2)
  }), [pileDiameterMm, embeddedLengthM, concreteGradeMpa]);

  // Derived Static Capacity per IS 2911 (Part 1/Sec 2)
  const staticCapacity = useMemo(() => {
    return calculateStaticPileCapacity(pileGeometry, soilStrata, 2.5);
  }, [pileGeometry, soilStrata]);

  const specifiedWorkingLoadKn = staticCapacity.safeWorkingLoadKn;

  // 4. Multi-Stage Static Load Test Curve Data (IS 2911 Part 4 Protocol)
  const loadTestCurve: LoadTestObservation[] = useMemo(() => {
    const swl = specifiedWorkingLoadKn;
    const stages = [0, 0.25, 0.50, 0.75, 1.0, 1.25, 1.50, 1.75, 2.0, 2.25, 2.50];

    return stages.map((factor, idx) => {
      const load = +(swl * factor).toFixed(1);
      // Hyperbolic settlement model: delta = (load / (a - b * load)) + elastic
      const elastic = (load * (0.75 * embeddedLengthM)) / (staticCapacity.baseAreaM2 * 29580 * 1000) * 1000;
      const plastic = factor > 1.0 ? Math.pow(factor - 1.0, 1.85) * 4.2 : 0;
      const settlement = +(elastic * 1.6 + plastic + factor * 1.2).toFixed(2);

      const d1 = +(settlement * (1 + (Math.sin(idx) * 0.04))).toFixed(2);
      const d2 = +(settlement * (1 - (Math.cos(idx) * 0.03))).toFixed(2);
      const d3 = +(settlement * (1 + (Math.cos(idx) * 0.05))).toFixed(2);
      const d4 = +(settlement * (1 - (Math.sin(idx) * 0.02))).toFixed(2);

      return {
        loadKn: load,
        settlementMm: settlement,
        timeMins: idx * 60,
        gaugeReadingsMm: [d1, d2, d3, d4]
      };
    });
  }, [specifiedWorkingLoadKn, embeddedLengthM, staticCapacity.baseAreaM2]);

  // Active Test Observations filtered up to selected test stage
  const activeObservations = useMemo(() => {
    const maxAllowedLoad = specifiedWorkingLoadKn * (testStagePct / 100);
    return loadTestCurve.filter(pt => pt.loadKn <= maxAllowedLoad + 1.0);
  }, [loadTestCurve, specifiedWorkingLoadKn, testStagePct]);

  const currentReading = activeObservations[activeObservations.length - 1];

  // IS 2911 Acceptance Compliance
  const is2911Report = useMemo(() => {
    return evaluateIS2911Compliance(activeObservations, pileGeometry, specifiedWorkingLoadKn);
  }, [activeObservations, pileGeometry, specifiedWorkingLoadKn]);

  // Converse-Labarre Pile Group Efficiency (3x3 grid under main core column)
  const groupEfficiency = useMemo(() => {
    // 3 x 3 group, spacing = 3 * diameter (standard 1500mm c/c)
    return calculateGroupEfficiency(3, 3, pileDiameterMm, pileDiameterMm * 3);
  }, [pileDiameterMm]);

  // Handle Section 65B Notarization
  const handleSealGeotechTest = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_PILETEST_D${pileDiameterMm}_L${embeddedLengthM}_LOAD_${currentReading.loadKn}KN_SETTLE_${currentReading.settlementMm}MM_SAFE_${is2911Report.safeLoadBasedOn12mmLimitKn}KN_${timestamp}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "TERRA-GEOTECH",
          synthesis_report: `STATIC PILE LOAD TEST NOTARIZED: Pile Dia ${pileDiameterMm}mm x ${embeddedLengthM}m Depth • Tested: ${currentReading.loadKn} kN (Settlement: ${currentReading.settlementMm} mm) • IS 2911 Safe Capacity: ${is2911Report.safeLoadBasedOn12mmLimitKn} kN • Group Efficiency: ${groupEfficiency}`,
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
              GEOTECHNICAL & PILE FOUNDATION ANALYSIS
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              IS 2911 (PART 4):2010 ACTIVE
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            STATIC AXIAL PILE LOAD TEST & DAVISSON CRITERIA
          </h1>
          <p className="text-xs text-slate-400">
            Project Vanguard Subgrade Foundation • Borehole BH-01 Stratigraphy • 4-Gauge Kentledge Telemetry
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/pour-cards" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">📋 POUR CARDS</a>
        </div>
      </div>

      {/* Parameter Adjustment Deck */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">PILE DIAMETER (D)</div>
          <div className="flex gap-2">
            {[450, 500, 600].map(dia => (
              <button
                key={dia}
                onClick={() => setPileDiameterMm(dia)}
                className={`flex-1 py-1.5 rounded-lg border font-bold text-xs transition ${
                  pileDiameterMm === dia
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50"
                    : "bg-slate-950 text-slate-400 border-slate-800"
                }`}
              >
                {dia}mm
              </button>
            ))}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Base Area: {staticCapacity.baseAreaM2} m²</div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">EMBEDDED DEPTH (L)</span>
            <span className="text-cyan-400 font-bold font-mono">{embeddedLengthM} meters</span>
          </div>
          <input
            type="range"
            min="12"
            max="24"
            step="1"
            value={embeddedLengthM}
            onChange={e => setEmbeddedLengthM(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="text-[10px] text-slate-500 mt-1">Tip reaches Dense Sand Layer 4</div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">TEST STAGE (JACK LOAD)</span>
            <span className="text-emerald-400 font-bold font-mono">{testStagePct}% SWL</span>
          </div>
          <input
            type="range"
            min="50"
            max="250"
            step="25"
            value={testStagePct}
            onChange={e => setTestStagePct(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-emerald-400"
          />
          <div className="text-[10px] text-slate-500 mt-1">Current Applied: {currentReading.loadKn} kN</div>
        </div>

        <div>
          <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1">CONVERSE-LABARRE EFFICIENCY</div>
          <div className="text-lg font-bold text-white font-mono mt-0.5">η = {groupEfficiency}</div>
          <div className="text-[10px] text-slate-500 mt-1">3x3 Pile Group (s = {pileDiameterMm * 3}mm c/c)</div>
        </div>
      </div>

      {/* KPI Load Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">SPECIFIED WORKING LOAD (SWL)</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">{specifiedWorkingLoadKn} kN</div>
          <div className="text-[10px] text-slate-500 mt-0.5">IS 2911 Static FOS = 2.50</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">ACTIVE HYDRAULIC TEST LOAD</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{currentReading.loadKn} kN</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Settlement: {currentReading.settlementMm} mm</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">STATIC LOAD PROPORTION</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
            {((staticCapacity.skinFrictionCapacityKn / staticCapacity.ultimateCapacityKn) * 100).toFixed(0)}% Friction
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Base Bearing: {staticCapacity.endBearingCapacityKn} kN</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">IS 2911 SETTLEMENT VERDICT</div>
          <div className={`text-sm font-bold mt-1.5 ${is2911Report.isOverallAccepted ? "text-emerald-400" : "text-red-400"}`}>
            {is2911Report.isOverallAccepted ? "PASSED (≤ 12mm LIMIT)" : "EXCESSIVE SETTLEMENT"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">At SWL: {is2911Report.settlementAtWorkingLoadMm} mm</div>
        </div>
      </div>

      {/* Main Grid: Interactive P-Delta Curve Canvas & Geotechnical Soil Stratum */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Dynamic HTML5 Load-Settlement Curve with Davisson Offset */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[460px]">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <GaugeIcon className="w-3.5 h-3.5 text-cyan-400" />
              LOAD-SETTLEMENT (P - Δ) CURVE & DAVISSON'S FAILURE ENVELOPE
            </span>
            <span className="text-cyan-400 font-mono text-[10px]">L = {embeddedLengthM}m | D = {pileDiameterMm}mm</span>
          </div>

          <div className="p-4 bg-slate-950 flex-1 flex flex-col justify-between">
            <PileLoadCurveCanvas
              observations={activeObservations}
              allCurve={loadTestCurve}
              pile={pileGeometry}
              swlKn={specifiedWorkingLoadKn}
            />

            {/* In-Canvas Dial Gauge Readings Panel */}
            <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs">
              {currentReading.gaugeReadingsMm.map((reading, idx) => (
                <div key={idx} className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 text-center">
                  <span className="text-[9px] text-slate-500 block">DIAL GAUGE DG-0{idx + 1}</span>
                  <span className="font-bold text-white text-xs font-mono">{reading} mm</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Lucknow Soil Stratification & IS 2911 Acceptance Matrix */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Soil Boring Log BH-01 */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                BOREHOLE LOG (BH-01 GOMTI ALLUVIUM)
              </span>
              <span className="text-[10px] text-slate-500 font-mono">18.0m PILE EMBEDMENT</span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              {soilStrata.map((stratum, idx) => {
                const isPileInLayer = embeddedLengthM >= stratum.depthFromM;
                return (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex justify-between items-center ${
                      isPileInLayer
                        ? "bg-slate-950/80 border-slate-800 text-slate-200"
                        : "bg-slate-950/30 border-slate-900 text-slate-600"
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white">{stratum.layerName}</div>
                      <div className="text-[10px] text-slate-500">
                        {stratum.depthFromM}m to {stratum.depthToM}m | Cu: {stratum.cohesionCuKpa} kPa | SPT N: {stratum.sptNValue}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">
                      α = {stratum.adhesionFactorAlpha}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* IS 2911 Statutory Acceptance Audit */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                IS 2911 CL. 7.1.1 STATUTORY ACCEPTANCE
              </span>

              <div className="flex flex-col gap-2 mt-3 text-xs">
                <div className="flex justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Total Settlement under Safe Working Load:</span>
                  <span className={`font-bold ${is2911Report.isWorkingLoadSettlementPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {is2911Report.settlementAtWorkingLoadMm} mm (Limit ≤ 12.0 mm)
                  </span>
                </div>

                <div className="flex justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Total Settlement under 1.5x SWL ({specifiedWorkingLoadKn * 1.5} kN):</span>
                  <span className={`font-bold ${is2911Report.isOverloadSettlementPassed ? "text-emerald-400" : "text-red-400"}`}>
                    {is2911Report.settlementAt150PctWorkingLoadMm} mm (Limit ≤ {(0.02 * pileDiameterMm).toFixed(1)} mm)
                  </span>
                </div>

                <div className="flex justify-between p-2 bg-slate-950/60 rounded-lg border border-slate-800">
                  <span className="text-slate-400">Derived Safe Capacity (2/3 of 12mm load):</span>
                  <span className="font-bold text-cyan-400 font-mono">
                    {is2911Report.safeLoadBasedOn12mmLimitKn} kN
                  </span>
                </div>
              </div>
            </div>

            {/* Section 65B Static Load Test Seal */}
            <div className="pt-2 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-[10px] text-slate-500">
                Auditor: <strong className="text-emerald-400">TERRA-GEOTECH-DIRECTOR</strong>
              </div>

              <div>
                {sealedHash ? (
                  <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-400">
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span className="font-mono text-[9px] select-all">{sealedHash.substring(0, 24)}...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSealGeotechTest}
                    disabled={isNotarizing}
                    className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50"
                  >
                    {isNotarizing ? <RefreshIcon className="w-3.5 h-3.5 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-950" />}
                    <span>NOTARIZE PILE LOAD TEST (SEC 65B)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: CANVAS P-DELTA & DAVISSON CURVE ---
function PileLoadCurveCanvas({
  observations,
  allCurve,
  pile,
  swlKn
}: {
  observations: LoadTestObservation[];
  allCurve: LoadTestObservation[];
  pile: PileGeometry;
  swlKn: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padL = 55;
    const padR = 25;
    const padT = 30;
    const padB = 40;

    // Background
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, w, h);

    const maxLoad = swlKn * 2.5;
    const maxSettle = 25.0; // 25mm max scale

    const toX = (load: number) => padL + (load / maxLoad) * (w - padL - padR);
    const toY = (settle: number) => padT + (settle / maxSettle) * (h - padT - padB);

    // Grid lines & Axis Labels
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#64748b";
    ctx.font = "9px monospace";

    for (let l = 0; l <= maxLoad; l += 500) {
      const x = toX(l);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, h - padB);
      ctx.stroke();
      ctx.fillText(`${l}kN`, x - 12, h - padB + 14);
    }

    for (let s = 0; s <= maxSettle; s += 5) {
      const y = toY(s);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillText(`${s}mm`, padL - 32, y + 3);
    }

    // 12mm Statutory Threshold line
    const y12 = toY(12.0);
    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, y12);
    ctx.lineTo(w - padR, y12);
    ctx.stroke();
    ctx.fillStyle = "#ef4444";
    ctx.fillText("12mm IS 2911 Permissible Limit", w - padR - 165, y12 - 4);
    ctx.setLineDash([]);

    // Davisson Failure Line: Delta_davisson = Elastic + (3.81 + D/120)
    ctx.strokeStyle = "rgba(245, 158, 11, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    for (let l = 0; l <= maxLoad; l += 50) {
      const offset = calculateDavissonElasticOffset(l, pile);
      const x = toX(l);
      const y = toY(offset.davissonOffsetLineMm);
      if (l === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#f59e0b";
    ctx.fillText("Davisson Limit Line", toX(maxLoad * 0.45), toY(10.5));

    // Observed Load-Settlement Curve
    if (observations.length > 1) {
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      observations.forEach((pt, i) => {
        const x = toX(pt.loadKn);
        const y = toY(pt.settlementMm);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Points
      observations.forEach((pt) => {
        const x = toX(pt.loadKn);
        const y = toY(pt.settlementMm);
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // SWL Indicator Line
    const xSwl = toX(swlKn);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.6)";
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xSwl, padT);
    ctx.lineTo(xSwl, h - padB);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#10b981";
    ctx.fillText(`SWL (${swlKn}kN)`, xSwl - 20, padT - 8);

  }, [observations, allCurve, pile, swlKn]);

  return (
    <canvas
      ref={canvasRef}
      width={720}
      height={320}
      className="w-full h-full object-contain"
    />
  );
}
