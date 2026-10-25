"use client";

import React from "react";
import FullBimSimulationEngine from "@/components/bim/FullBimSimulationEngine";

export default function SiteDigitalTwinPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              IFC-Tower-A-Structural-LOD350.ifc
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              LOD 350/500 PARAMETRIC
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight mt-1">
            3D BIM & MULTI-DISCIPLINARY SPATIAL VIEWPORT
          </h1>
          <p className="text-xs text-slate-400">
            Lucknow IT City Technology Park - Tower A • Floorplate dissections, MEP/HVAC isolation & geofenced defect pins
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="px-3 py-1.5 bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono rounded">
            Live Stream: 100% Optimal
          </span>
        </div>
      </div>

      {/* Main 4D Simulation Engine (Interactive 3D + BOQ + 4D Slider) */}
      <FullBimSimulationEngine />
    </div>
  );
}
