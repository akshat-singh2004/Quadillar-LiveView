// @refresh reset
"use client";

import React from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export default function PlantAndMachineryPage() {
  const fleet = [
    {
      id: "CRANE-01",
      name: `${VANGUARD_GENOME.craneTelemetry.model} High-Top Tower Crane`,
      zone: "BIT-2",
      spec: `65m Jib • +68m Hook • Azimuth ${VANGUARD_GENOME.craneTelemetry.azimuthDeg}°`,
      telemetry: "12ms WebRTC Radar Lock • Wind 4.2 m/s",
      health: "99.4% NOMINAL",
    },
    {
      id: "PUMP-01",
      name: "Schwing Stetter SP 1800 / 36m Concrete Boom Pump",
      zone: "BIT-4",
      spec: "Hydraulic Pressure 245 bar • 5.5h Shift Runtime",
      telemetry: "Fuel 68L • M45 Transfer Slab Pour",
      health: "96.8% NOMINAL",
    },
    {
      id: "POLE-SOLAR-01",
      name: "Quadillar Autonomous Edge Vision Pole #01",
      zone: "BIT-1",
      spec: "120W Solar PV + 24V 100Ah LiFePO4 (94% SoC) + 5G SA",
      telemetry: "MEMS Tilt 0.2° (< 3.5° Lock) • NPU PPE Active",
      health: "OFF-GRID ONLINE",
    },
    {
      id: "POLE-SOLAR-02",
      name: "Quadillar Autonomous Edge Vision Pole #02",
      zone: "BIT-3",
      spec: "120W Solar PV + 24V 100Ah LiFePO4 (91% SoC) + 5G SA",
      telemetry: "MEMS Tilt 0.1° • Monitoring 14F Diagrid Hoist",
      health: "OFF-GRID ONLINE",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              IEC 61215 / 3GPP 5G SA / IS 13367 FLEET TELEMETRY
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              {VANGUARD_GENOME.projectId}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            PLANT & MACHINERY (P&M) + AUTONOMOUS EDGE CAMERA POLES
          </h1>
          <p className="text-xs text-slate-400">
            Synchronized Heavy Lifting Fleet, Solar LiFePO4 Telemetry & MEMS Anti-Theft Guard
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition">
            ← COMMAND CENTER
          </a>
          <a href="/site/gis" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition">
            📡 CRANE RADAR GIS
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {fleet.map((item) => (
          <div key={item.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex justify-between items-center">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold text-[10px]">
                  {item.id} • {item.zone}
                </span>
                <span className="text-emerald-400 font-bold text-[10px]">{item.health}</span>
              </div>
              <div className="text-sm font-bold text-white mt-2">{item.name}</div>
              <div className="text-[11px] text-slate-300 mt-1">{item.spec}</div>
              <div className="text-[11px] text-cyan-400 mt-1">{item.telemetry}</div>
            </div>
            <div className="pt-2 border-t border-slate-800 flex justify-between items-center">
              <a href={`/site/digital-twin?bit=${item.zone}`} className="text-cyan-300 hover:underline">
                Inspect {item.zone} in 3D BIM →
              </a>
              <a href={`/site/360-tour?zone=${item.zone}`} className="text-purple-300 hover:underline">
                360° Reality Scan →
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
