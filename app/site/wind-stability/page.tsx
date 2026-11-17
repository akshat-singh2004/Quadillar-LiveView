// @refresh reset
"use client";

import React, { useState, useMemo } from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import { evaluateVanguardTowerWind } from "@/lib/calculations/windStabilityEngine";

export default function WindStabilityPage() {
  const [windVb, setWindVb] = useState<number>(47.0); // Lucknow Basic Wind Speed = 47 m/s
  const report = useMemo(() => evaluateVanguardTowerWind(windVb, 54.0), [windVb]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              IS 875 (PART 3): 2015 / IS 456 CL. 20.5
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              BIT-3 HOTEL CORE (+54.00M RL) • {VANGUARD_GENOME.projectId}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            AERODYNAMIC WIND LOAD & DIAGRID OVERTURNING STABILITY
          </h1>
          <p className="text-xs text-slate-400">
            Gomti Nagar Extension, Lucknow • 14-Storey Diagrid Tower & 2,100-Ton Kalzip Space-Frame Envelope
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition">
            ← COMMAND CENTER
          </a>
          <a href="/site/digital-twin?bit=BIT-3" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition">
            🏛️ INSPECT BIT-3 IN 3D BIM
          </a>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">PEAK WIND SPEED (54M)</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">{report.maxDesignSpeedMs} m/s</div>
          <div className="text-[10px] text-slate-500">Lucknow V_b = {windVb} m/s</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">CROWN DESIGN PRESSURE</div>
          <div className="text-xl font-bold text-white mt-1">{report.peakPressureKpa} kN/m²</div>
          <div className="text-[10px] text-slate-500">p_z = 0.6 × V_z²</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">TOTAL BASE SHEAR</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{report.totalBaseShearKn} kN</div>
          <div className="text-[10px] text-slate-500">OTM: {report.totalOverturningMomentKnm.toLocaleString()} kNm</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">OVERTURNING FOS</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{report.overturningFos}×</div>
          <div className="text-[10px] text-slate-500">Statutory Minimum: ≥ 1.50×</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">ROOF LATERAL SWAY</div>
          <div className={`text-xl font-bold mt-1 ${report.isStableAndCompliant ? "text-emerald-400" : "text-rose-400"}`}>
            {report.topLateralSwayMm} mm
          </div>
          <div className="text-[10px] text-slate-500">Limit H/500: ≤ {report.allowableSwayMm} mm</div>
        </div>
      </div>

      {/* Interactive Gust Simulator & Elevation Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-3 text-xs">
          <span className="font-bold text-white uppercase">
            ELEVATION-ZONED WIND PROFILE — BIT-3 DIAGRID TOWER (+54.00M RL)
          </span>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">GUST VELOCITY SIMULATOR:</span>
            <input
              type="range"
              min="33"
              max="65"
              step="1"
              value={windVb}
              onChange={(e) => setWindVb(parseFloat(e.target.value))}
              className="w-40 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
            />
            <span className="text-cyan-400 font-bold">{windVb} m/s</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[10px] text-slate-500 uppercase border-b border-slate-800">
              <tr>
                <th className="py-2 px-2">STOREY ZONE</th>
                <th className="py-2 px-2">ELEVATION (z)</th>
                <th className="py-2 px-2">TERRAIN k2</th>
                <th className="py-2 px-2">DESIGN V_z</th>
                <th className="py-2 px-2">PRESSURE p_z</th>
                <th className="py-2 px-2">LATERAL SHEAR</th>
                <th className="py-2 px-2 text-right">OVERTURNING MOMENT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-[11px]">
              {report.slices.map((s) => (
                <tr key={s.storeyLabel} className="hover:bg-slate-900/40">
                  <td className="py-2.5 px-2 font-bold text-white">{s.storeyLabel}</td>
                  <td className="py-2.5 px-2 text-slate-300">+{s.elevationM.toFixed(1)} m</td>
                  <td className="py-2.5 px-2 text-slate-400">{s.k2Factor.toFixed(2)}</td>
                  <td className="py-2.5 px-2 text-cyan-400 font-bold">{s.designWindSpeedMs} m/s</td>
                  <td className="py-2.5 px-2 text-white">{s.windPressureKpa} kN/m²</td>
                  <td className="py-2.5 px-2 text-amber-400 font-bold">{s.lateralForceKn} kN</td>
                  <td className="py-2.5 px-2 text-right text-slate-300">{s.overturningMomentKnm.toLocaleString()} kNm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
