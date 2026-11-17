// @refresh reset
"use client";

import React, { useState, useMemo } from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export default function GeotechnicalPileTestingPage() {
  const [testLoadKn, setTestLoadKn] = useState<number>(1650); // 150% of 1,100 kN working load
  const pileDiaMm = 600;
  const pileLenM = 18.0;
  const fck = 35;

  const pileMetrics = useMemo(() => {
    const areaMm2 = (Math.PI * pileDiaMm * pileDiaMm) / 4;
    const ecMpa = 5000 * Math.sqrt(fck);
    const elasticShorteningMm = +((testLoadKn * 1000 * (pileLenM * 1000)) / (areaMm2 * ecMpa)).toFixed(2);
    const grossSettlementMm = +(elasticShorteningMm + (testLoadKn / 1650) * 4.1).toFixed(2);
    const netResidualMm = +(grossSettlementMm - elasticShorteningMm).toFixed(2);
    const isCompliant = grossSettlementMm <= 18.0 && netResidualMm <= 6.0;
    return { elasticShorteningMm, grossSettlementMm, netResidualMm, isCompliant };
  }, [testLoadKn]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
            IS 2911 (PART 4): 2013 / ASTM D1143 • BIT-4 PODIUM FOUNDATION
          </span>
          <h1 className="text-xl font-bold text-white mt-1">
            GEOTECHNICAL STATIC AXIAL PILE LOAD TEST (TP-BIT4-01) — {VANGUARD_GENOME.projectId}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg">
            ← COMMAND CENTER
          </a>
          <a href="/site/digital-twin?bit=BIT-4" className="px-3 py-1.5 bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 rounded-lg">
            🏛️ BIT-4 PODIUM IN BIM
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400">APPLIED AXIAL LOAD</span>
          <div className="text-xl font-bold text-cyan-400 mt-1">{testLoadKn} kN</div>
          <div className="text-[10px] text-slate-500">600mm × 18m M35 Bored Pile</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400">ELASTIC SHORTENING</span>
          <div className="text-xl font-bold text-white mt-1">{pileMetrics.elasticShorteningMm} mm</div>
          <div className="text-[10px] text-slate-500">PL / AE_c Theoretical</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400">GROSS SETTLEMENT</span>
          <div className="text-xl font-bold text-amber-400 mt-1">{pileMetrics.grossSettlementMm} mm</div>
          <div className="text-[10px] text-slate-500">IS 2911 Limit: ≤ 18.0 mm</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400">NET PLASTIC RESIDUAL</span>
          <div className={`text-xl font-bold mt-1 ${pileMetrics.isCompliant ? "text-emerald-400" : "text-rose-400"}`}>
            {pileMetrics.netResidualMm} mm
          </div>
          <div className="text-[10px] text-slate-500">IS 2911 Limit: ≤ 6.0 mm</div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-xs">
        <div className="flex justify-between mb-2">
          <span className="text-slate-300 font-bold">HYDRAULIC JACK LOAD STAGE CONTROLLER (0 to 1,650 kN Proof Load):</span>
          <span className="text-cyan-400 font-bold">{testLoadKn} kN ({Math.round((testLoadKn / 1100) * 100)}% Working Load)</span>
        </div>
        <input
          type="range"
          min="275"
          max="1650"
          step="55"
          value={testLoadKn}
          onChange={(e) => setTestLoadKn(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-slate-800 rounded accent-cyan-400"
        />
      </div>
    </div>
  );
}
