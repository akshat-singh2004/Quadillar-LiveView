// components/quality/ConcreteMaturityChart.tsx
"use client";

import React, { useState } from "react";
import { Activity, CheckCircle2, AlertTriangle, ShieldCheck, Thermometer, Info } from "lucide-react";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface MaturityPoint {
  timeHour: number;
  temperatureC: number;
  surfaceTemperatureC?: number;
  ambientTemperatureC?: number;
}

export interface ConcreteMaturityChartProps {
  pourName?: string;
  points?: MaturityPoint[];
  datumTemperatureC?: number;
  designStrengthMpa?: number;
  targetFck?: number;
}

interface ProgressionStage {
  dayLabel: string;
  nominalPct: number;
  strengthMpa: number;
  achievedPct: number;
  maturityDegreeHours: number;
  passed: boolean;
}

// ---------------------------------------------------------------------------
// Client Component: ConcreteMaturityChart
// ---------------------------------------------------------------------------

export function ConcreteMaturityChart({
  pourName = "Level 04 Shear Wall & Deck Bay C",
  targetFck = 30.0,
  designStrengthMpa = 30.0,
}: ConcreteMaturityChartProps) {
  const [activeStage, setActiveStage] = useState<number | null>(null);

  const fck = targetFck || designStrengthMpa || 30.0;
  // IS:456 characteristic mean target: fm = fck + 1.65 * sigma
  const sigma = 2.4; // standard deviation for M30-M40 with strict site control (IS:456 Table 8)
  const targetFm = parseFloat((fck + 1.65 * sigma).toFixed(2));
  const current28DayMean = 34.2;

  // Nurse-Saul Maturity progression stages (ASTM C1074 / IS:516)
  const stages: ProgressionStage[] = [
    {
      dayLabel: "Day 3",
      nominalPct: 40,
      strengthMpa: 12.8,
      achievedPct: 42.7,
      maturityDegreeHours: 2450,
      passed: true,
    },
    {
      dayLabel: "Day 7",
      nominalPct: 67,
      strengthMpa: 22.4,
      achievedPct: 74.7,
      maturityDegreeHours: 5120,
      passed: true, // >= 70% threshold reached (21.0 N/mm2)
    },
    {
      dayLabel: "Day 14",
      nominalPct: 90,
      strengthMpa: 28.1,
      achievedPct: 93.7,
      maturityDegreeHours: 9240,
      passed: true,
    },
    {
      dayLabel: "Day 28",
      nominalPct: 100,
      strengthMpa: 34.2,
      achievedPct: 114.0,
      maturityDegreeHours: 16800,
      passed: true,
    },
  ];

  const strippingThresholdMpa = parseFloat((fck * 0.7).toFixed(1)); // 70% design strength = 21.0 N/mm2
  const day7Strength = stages[1].strengthMpa;
  const isStrippingPermissible = day7Strength >= strippingThresholdMpa;

  // Chart Dimensions for SVG
  const chartHeight = 220;
  const chartWidth = 380;
  const maxScaleMpa = 40.0;

  // Y-coordinate helper (0 at bottom, maxScaleMpa at top)
  const getY = (valMpa: number) => {
    return chartHeight - (valMpa / maxScaleMpa) * (chartHeight - 30) - 15;
  };

  const targetY = getY(fck);
  const strippingY = getY(strippingThresholdMpa);

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-none flex flex-col justify-between h-full font-sans">
      {/* ===================================================================
          CARD HEADER
          =================================================================== */}
      <div className="border-b border-zinc-800/60 pb-3.5">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" />
          <span className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
            ASTM C1074 / IS:516 MATURITY TELEMETRY
          </span>
        </div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100 font-mono mt-1">
          Maturity Index (Nurse-Saul Function) vs. Strength Gain
        </h2>
        <p className="text-xs text-zinc-400 font-mono mt-0.5">
          Pour Ref: {pourName} • Datum T₀ = -10°C
        </p>
      </div>

      {/* ===================================================================
          SYNTHETIC SVG & BAR VISUALIZATION
          =================================================================== */}
      <div className="my-4 relative">
        {/* SVG Visualization */}
        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-[220px] overflow-visible"
          >
            {/* Background horizontal gridlines */}
            {[10, 20, 30, 40].map((val) => {
              const y = getY(val);
              return (
                <g key={val}>
                  <line
                    x1="35"
                    y1={y}
                    x2={chartWidth}
                    y2={y}
                    stroke="#27272a"
                    strokeWidth="1"
                  />
                  <text
                    x="28"
                    y={y + 3}
                    fill="#71717a"
                    fontSize="9"
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Horizontal Dotted Reference Line: Target f_ck (30.0 N/mm²) */}
            <line
              x1="35"
              y1={targetY}
              x2={chartWidth}
              y2={targetY}
              stroke="#10b981"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text
              x={chartWidth - 5}
              y={targetY - 5}
              fill="#10b981"
              fontSize="9"
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="end"
            >
              Target f_ck ({fck.toFixed(1)} N/mm²)
            </text>

            {/* Horizontal Dotted Line: 70% Stripping Threshold */}
            <line
              x1="35"
              y1={strippingY}
              x2={chartWidth - 110}
              y2={strippingY}
              stroke="#f59e0b"
              strokeWidth="1"
              strokeDasharray="2 3"
            />
            <text
              x="40"
              y={strippingY - 4}
              fill="#f59e0b"
              fontSize="8"
              fontFamily="monospace"
            >
              70% Stripping Gate ({strippingThresholdMpa} N/mm²)
            </text>

            {/* Maturity Gain Curve Path */}
            <path
              d={`M 75 ${getY(stages[0].strengthMpa)} L 155 ${getY(
                stages[1].strengthMpa
              )} L 240 ${getY(stages[2].strengthMpa)} L 325 ${getY(
                stages[3].strengthMpa
              )}`}
              fill="none"
              stroke="#38bdf8"
              strokeWidth="2"
            />

            {/* Stage Data Points & Bars */}
            {stages.map((stage, idx) => {
              const xPositions = [75, 155, 240, 325];
              const x = xPositions[idx];
              const y = getY(stage.strengthMpa);
              const isHovered = activeStage === idx;

              return (
                <g
                  key={stage.dayLabel}
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveStage(idx)}
                  onMouseLeave={() => setActiveStage(null)}
                >
                  {/* Vertical bar from bottom to strength point */}
                  <rect
                    x={x - 14}
                    y={y}
                    width="28"
                    height={chartHeight - y - 15}
                    fill={isHovered ? "#3b82f6" : "#27272a"}
                    fillOpacity={isHovered ? 0.4 : 0.6}
                    stroke={isHovered ? "#60a5fa" : "#3f3f46"}
                    strokeWidth="1"
                  />

                  {/* Node Circle */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 5 : 3.5}
                    fill={stage.strengthMpa >= fck ? "#10b981" : "#38bdf8"}
                    stroke="#09090b"
                    strokeWidth="2"
                  />

                  {/* Top Strength Value Label */}
                  <text
                    x={x}
                    y={y - 8}
                    fill={stage.strengthMpa >= fck ? "#34d399" : "#e4e4e7"}
                    fontSize="10"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {stage.strengthMpa.toFixed(1)}
                  </text>

                  {/* Day Label at Bottom */}
                  <text
                    x={x}
                    y={chartHeight - 2}
                    fill="#a1a1aa"
                    fontSize="10"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    {stage.dayLabel}
                  </text>
                  <text
                    x={x}
                    y={chartHeight + 11}
                    fill="#71717a"
                    fontSize="8"
                    fontFamily="monospace"
                    textAnchor="middle"
                  >
                    ({stage.achievedPct.toFixed(0)}%)
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-5 pt-2 border-t border-zinc-800/50">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 bg-emerald-500 inline-block" />
            <span>Target f_ck (100%): 30.0 N/mm²</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-3 bg-amber-500 inline-block" />
            <span>Stripping Gate (70%): 21.0 N/mm²</span>
          </div>
        </div>
      </div>

      {/* ===================================================================
          SUMMARY TELEMETRY FOOTER
          =================================================================== */}
      <div className="border-t border-zinc-800/60 pt-3.5 space-y-3 font-mono text-xs">
        {/* Monospace Readings */}
        <div className="bg-zinc-950 p-3 border border-zinc-800 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400 text-[11px]">Average 28-Day Mean (f_m):</span>
            <span className="text-emerald-400 font-bold tabular-nums">
              {current28DayMean.toFixed(1)} N/mm²{" "}
              <span className="text-zinc-500 font-normal text-[10px]">
                (Target f_m: {targetFm.toFixed(1)})
              </span>
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400 text-[11px]">Standard Deviation (σ):</span>
            <span className="text-zinc-200 tabular-nums">
              {sigma.toFixed(2)} N/mm²{" "}
              <span className="text-emerald-500 text-[10px]">● Strict Control</span>
            </span>
          </div>
          <div className="flex justify-between items-center border-t border-zinc-800/80 pt-1.5">
            <span className="text-zinc-400 text-[11px]">Formwork Stripping Status:</span>
            <span className="text-zinc-100 font-semibold text-[11px]">
              {isStrippingPermissible ? "Confirmed Permissible" : "Hold Under Prop"}
            </span>
          </div>
        </div>

        {/* Stripping Status Pill */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400 text-[11px]">De-Shutter Gate:</span>
            <span className="bg-emerald-950/30 text-emerald-400 border border-emerald-500/40 text-xs px-2 py-1 font-bold inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>70% Design Strength Confirmed ({day7Strength} N/mm²)</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConcreteMaturityChart;
