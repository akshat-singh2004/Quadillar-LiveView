// @refresh reset
"use client";

import React, { useState, useMemo } from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export default function ConcreteMaturityAndStrippingPage() {
  const [curingHours, setCuringHours] = useState<number>(96);
  const [coreTempC, setCoreTempC] = useState<number>(44.5);
  const [surfaceTempC, setSurfaceTempC] = useState<number>(31.0);
  const designFck = 45; // BIT-1 Bridge Arch & BIT-4 Transfer Deck (M45)

  const mat = useMemo(() => {
    const avgTemp = (coreTempC + surfaceTempC) / 2;
    const ttfNurseSaul = Math.round((avgTemp + 10) * curingHours);
    const estStrengthMpa = +(
      designFck *
      1.16 *
      ((0.00042 * ttfNurseSaul) / (1 + 0.00042 * ttfNurseSaul))
    ).toFixed(2);
    const thermalDeltaC = +(Math.abs(coreTempC - surfaceTempC)).toFixed(1);
    const thermalSafe = thermalDeltaC <= 20.0;
    const verticalCleared = estStrengthMpa >= 10.0;
    const slabPropsIntactCleared = estStrengthMpa >= 0.7 * designFck; // 31.5 MPa
    const bridgeBeamCleared = estStrengthMpa >= 0.85 * designFck; // 38.25 MPa

    return {
      ttfNurseSaul,
      estStrengthMpa,
      thermalDeltaC,
      thermalSafe,
      verticalCleared,
      slabPropsIntactCleared,
      bridgeBeamCleared,
    };
  }, [curingHours, coreTempC, surfaceTempC]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
            ASTM C1074-19 / IS 456 TABLE 11.3 / ACI 207.2R THERMAL GUARD
          </span>
          <h1 className="text-xl font-bold text-white mt-1">
            CONCRETE MATURITY & FORMWORK DE-SHUTTERING ENGINE — BIT-1 & BIT-4 (M45)
          </h1>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 border border-slate-700 text-slate-300 rounded-lg">
            ← COMMAND CENTER
          </a>
          <a href="/site/digital-twin?bit=BIT-1" className="px-3 py-1.5 bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 rounded-lg">
            🏛️ BIT-1 ARCH IN BIM
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400">NURSE-SAUL TTF</span>
          <div className="text-xl font-bold text-cyan-400 mt-1">{mat.ttfNurseSaul.toLocaleString()} °C·hr</div>
          <div className="text-[10px] text-slate-500">Datum T_0 = -10.0°C</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400">IN-SITU STRENGTH</span>
          <div className="text-xl font-bold text-emerald-400 mt-1">{mat.estStrengthMpa} MPa</div>
          <div className="text-[10px] text-slate-500">M45 Hyperbolic Gain</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400">CORE–SURFACE ΔT</span>
          <div className={`text-xl font-bold mt-1 ${mat.thermalSafe ? "text-emerald-400" : "text-rose-400"}`}>
            {mat.thermalDeltaC} °C
          </div>
          <div className="text-[10px] text-slate-500">ACI 207.2R Limit: ≤ 20.0°C</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl">
          <span className="text-[10px] text-slate-400">ARCH / BEAM STRIPPING</span>
          <div className={`text-base font-bold mt-1.5 ${mat.bridgeBeamCleared ? "text-emerald-400" : "text-amber-400"}`}>
            {mat.bridgeBeamCleared ? "CLEARED (≥ 38.25 MPa)" : "HOLD PROPS"}
          </div>
          <div className="text-[10px] text-slate-500">IS 456 Table 11.3 (0.85 f_ck)</div>
        </div>
      </div>

      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Elapsed Pour Age (Hours):</span>
            <span className="text-cyan-400 font-bold">{curingHours} hrs</span>
          </div>
          <input type="range" min="12" max="336" step="6" value={curingHours} onChange={(e) => setCuringHours(parseInt(e.target.value, 10))} className="w-full h-1.5 bg-slate-800 rounded accent-cyan-400" />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Core Thermocouple (°C):</span>
            <span className="text-amber-400 font-bold">{coreTempC.toFixed(1)} °C</span>
          </div>
          <input type="range" min="25" max="65" step="0.5" value={coreTempC} onChange={(e) => setCoreTempC(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded accent-amber-400" />
        </div>
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-slate-400">Surface Thermocouple (°C):</span>
            <span className="text-white font-bold">{surfaceTempC.toFixed(1)} °C</span>
          </div>
          <input type="range" min="18" max="45" step="0.5" value={surfaceTempC} onChange={(e) => setSurfaceTempC(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded accent-cyan-400" />
        </div>
      </div>
    </div>
  );
}
