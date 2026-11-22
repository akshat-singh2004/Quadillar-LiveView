// @refresh reset
"use client";

import React, { useState } from "react";
import { VANGUARD_GENOME, ArchitecturalBitSpec } from "@/lib/project/vanguardGenome";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";

export default function SiteGisAndCraneRadarPage() {
  const { isLight } = useLiveviewTheme();
  const [selectedBitId, setSelectedBitId] = useState<ArchitecturalBitSpec["bitId"]>("BIT-2");
  const [azimuth, setAzimuth] = useState<number>(VANGUARD_GENOME.craneTelemetry.azimuthDeg);
  const [showLidarSectors, setShowLidarSectors] = useState<boolean>(true);

  const selectedBit =
    VANGUARD_GENOME.bits.find((b) => b.bitId === selectedBitId) || VANGUARD_GENOME.bits[1];

  // Map 3D worldPos [x, y, z] onto 600x420 SVG cadastral plot
  const toSvg = (wx: number, wz: number): [number, number] => [
    300 + wx * 6.2,
    210 + wz * 6.2,
  ];

  const [craneSvgX, craneSvgY] = toSvg(
    VANGUARD_GENOME.craneTelemetry.basePos[0],
    VANGUARD_GENOME.craneTelemetry.basePos[2]
  );
  const jibSvgLen = VANGUARD_GENOME.craneTelemetry.jibRadiusM * 3.1;
  const rad = (azimuth * Math.PI) / 180;
  const hookSvgX = craneSvgX + Math.cos(rad) * jibSvgLen;
  const hookSvgY = craneSvgY + Math.sin(rad) * jibSvgLen;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              WGS84 GEOSPATIAL GIS & ANTI-COLLISION RADAR
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              {VANGUARD_GENOME.coordinates.lat}° N, {VANGUARD_GENOME.coordinates.lng}° E • DATUM +{VANGUARD_GENOME.coordinates.datumRlM}M RL
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            SITE GIS CADASTRAL TWIN & CRANE RADAR — {VANGUARD_GENOME.projectName.toUpperCase()}
          </h1>
          <p className="text-xs text-slate-400">
            Gomti Nagar Extension, Lucknow • Real-Time {VANGUARD_GENOME.craneTelemetry.model} Slewing Envelope & 6-Zone Spatial Footprints
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition">
            ← COMMAND CENTER
          </a>
          <a
            href={`/site/digital-twin?bit=${selectedBit.bitId}`}
            className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition"
          >
            🏛️ {selectedBit.bitId} IN 3D BIM
          </a>
          <a
            href={`/site/360-tour?zone=${selectedBit.bitId}`}
            className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 rounded-lg transition"
          >
            🌐 {selectedBit.bitId} IN 360° TOUR
          </a>
        </div>
      </div>

      {/* Main Split: Geospatial Radar Map + Selected Bit & Crane Telemetry */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex flex-wrap justify-between items-center border-b border-slate-800 pb-2 text-xs">
            <span className="font-bold text-cyan-400 uppercase">
              UP-LDA CAMPUS CADASTRAL PLOT • 6 ARCHITECTURAL BITS & CRANE-01 RADAR
            </span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowLidarSectors((v) => !v)}
                className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-[10px] text-emerald-400 font-bold"
              >
                {showLidarSectors ? "● EDGE POLE FOV: ON" : "○ EDGE POLE FOV: OFF"}
              </button>
              <span className="text-[10px] text-slate-400">GRID: 10M × 10M UTM</span>
            </div>
          </div>

          <div className="bg-[#04070d] border border-slate-800 rounded-xl p-2 flex items-center justify-center">
            <svg viewBox="0 0 600 420" className="w-full h-[410px]">
              {/* UTM Coordinate Grid */}
              {Array.from({ length: 13 }).map((_, i) => (
                <line
                  key={`v-${i}`}
                  x1={i * 50}
                  y1={0}
                  x2={i * 50}
                  y2={420}
                  stroke={isLight ? "#E2DDD2" : "#0f172a"}
                  strokeWidth="1"
                />
              ))}
              {Array.from({ length: 9 }).map((_, i) => (
                <line
                  key={`h-${i}`}
                  x1={0}
                  y1={i * 52.5}
                  x2={600}
                  y2={i * 52.5}
                  stroke={isLight ? "#E2DDD2" : "#0f172a"}
                  strokeWidth="1"
                />
              ))}

              {/* Campus Plot Perimeter */}
              <rect
                x="42"
                y="24"
                width="516"
                height="372"
                rx="14"
                fill={isLight ? "rgba(253,252,249,0.75)" : "rgba(15,23,42,0.45)"}
                stroke={isLight ? "#CFC8B8" : "#1e293b"}
                strokeWidth="2"
                strokeDasharray="6 4"
              />
              <text x="54" y="42" fill="#64748b" fontSize="9" fontFamily="monospace">
                GOMTI NAGAR EXTENSION CAMPUS BOUNDARY • AREA: 42,800 SQ.M
              </text>

              {/* 6 Architectural Bit Footprints */}
              {VANGUARD_GENOME.bits.map((bit) => {
                const [bx, by] = toSvg(bit.worldPos[0], bit.worldPos[2]);
                const bw = bit.dimensionsM[0] * 3.4;
                const bh = bit.dimensionsM[2] * 3.4;
                const isSel = bit.bitId === selectedBitId;

                return (
                  <g
                    key={bit.bitId}
                    onClick={() => setSelectedBitId(bit.bitId)}
                    className="cursor-pointer"
                  >
                    {bit.bitId === "BIT-2" || bit.bitId === "BIT-6" ? (
                      <circle
                        cx={bx}
                        cy={by}
                        r={bw / 2}
                        fill={isSel ? "rgba(6,182,212,0.25)" : "rgba(56,189,248,0.10)"}
                        stroke={isSel ? "#22d3ee" : "#38bdf8"}
                        strokeWidth={isSel ? "2.5" : "1.2"}
                      />
                    ) : (
                      <rect
                        x={bx - bw / 2}
                        y={by - bh / 2}
                        width={bw}
                        height={bh}
                        rx="6"
                        fill={isSel ? "rgba(6,182,212,0.22)" : "rgba(30,41,59,0.55)"}
                        stroke={isSel ? "#22d3ee" : "#475569"}
                        strokeWidth={isSel ? "2.5" : "1.2"}
                      />
                    )}
                    <text
                      x={bx}
                      y={by - 3}
                      textAnchor="middle"
                      fill={isLight ? "#1F1E1B" : "#f8fafc"}
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                    >
                      {bit.bitId}
                    </text>
                    <text
                      x={bx}
                      y={by + 9}
                      textAnchor="middle"
                      fill={isLight ? "#4A4740" : "#94a3b8"}
                      fontSize="7.5"
                      fontFamily="monospace"
                    >
                      {bit.elevationLabel}
                    </text>
                  </g>
                );
              })}

              {/* Solar Edge Camera Pole Optical Cones */}
              {showLidarSectors && (
                <>
                  <circle cx="80" cy="365" r="5" fill="#10b981" />
                  <path
                    d="M 80 365 L 210 250 A 160 160 0 0 1 250 365 Z"
                    fill="rgba(16,185,129,0.08)"
                    stroke="#10b981"
                    strokeDasharray="3 3"
                  />
                  <text x="65" y="382" fill="#10b981" fontSize="8" fontFamily="monospace">
                    EDGE POLE #01 (SOLAR 5G)
                  </text>
                </>
              )}

              {/* Liebherr 280 EC-H 65m Slewing Radar Circle & Jib */}
              <circle
                cx={craneSvgX}
                cy={craneSvgY}
                r={jibSvgLen}
                fill="rgba(234,179,8,0.05)"
                stroke={isLight ? "#B27424" : "#eab308"}
                strokeWidth="1.2"
                strokeDasharray="5 4"
              />
              <line
                x1={craneSvgX}
                y1={craneSvgY}
                x2={hookSvgX}
                y2={hookSvgY}
                stroke={isLight ? "#B27424" : "#facc15"}
                strokeWidth="3.5"
              />
              <circle cx={craneSvgX} cy={craneSvgY} r="6" fill={isLight ? "#B27424" : "#facc15"} />
              <circle cx={hookSvgX} cy={hookSvgY} r="4.5" fill="#f43f5e" />
              <text
                x={craneSvgX - 42}
                y={craneSvgY - 12}
                fill={isLight ? "#B27424" : "#facc15"}
                fontSize="8.5"
                fontWeight="bold"
                fontFamily="monospace"
              >
                {VANGUARD_GENOME.craneTelemetry.model} ({azimuth.toFixed(1)}°)
              </text>
            </svg>
          </div>
        </div>

        {/* Right Telemetry Panel */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 text-xs">
            <div className="text-xs font-bold text-amber-400 uppercase border-b border-slate-800 pb-2">
              {VANGUARD_GENOME.craneTelemetry.model} SLEW CONTROLLER
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Jib Radius / Hook Datum:</span>
              <span className="text-white font-bold">
                {VANGUARD_GENOME.craneTelemetry.jibRadiusM}m / +{VANGUARD_GENOME.craneTelemetry.hookHeightM}m RL
              </span>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-slate-400">Live Slewing Azimuth:</span>
                <span className="text-cyan-400 font-bold">{azimuth.toFixed(1)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="0.5"
                value={azimuth}
                onChange={(e) => setAzimuth(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
              />
            </div>
            <div className="text-[11px] text-emerald-400 bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl">
              ✔ Anti-Collision Radar Active: 20.6m radial buffer maintained against BIT-3 (+54.0m) diagrid core.
            </div>
          </div>

          {/* Selected Architectural Bit GIS Inspector */}
          <div className="bg-slate-900/60 border border-cyan-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3 text-xs">
            <div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                {selectedBit.code} • {selectedBit.elevationLabel}
              </span>
              <h2 className="text-base font-bold text-white mt-2">{selectedBit.name}</h2>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                {selectedBit.structuralSystem} • {selectedBit.mepSystem}
              </p>
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">ALLOCATED BUDGET</span>
                  <span className="text-sm font-bold text-white">₹{selectedBit.allocatedBudgetCr.toFixed(2)} Cr</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">PHYSICAL PROGRESS</span>
                  <span className="text-sm font-bold text-emerald-400">{selectedBit.completionPct}%</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <a
                href={`/site/digital-twin?bit=${selectedBit.bitId}`}
                className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-center transition"
              >
                FLY TO {selectedBit.bitId} IN 3D BIM TWIN →
              </a>
              <a
                href={`/site/360-tour?zone=${selectedBit.bitId}`}
                className="w-full py-2 bg-slate-950 hover:bg-slate-900 border border-purple-500/50 text-purple-300 font-bold rounded-xl text-center transition"
              >
                INSPECT {selectedBit.bitId} POINT CLOUD →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
