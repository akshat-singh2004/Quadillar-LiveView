// @refresh reset
"use client";
import { GovernorInterlockBanner } from "@/components/governor/GovernorInterlockBanner";

import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import { computeVanguardEvmMetrics } from "@/lib/calculations/cpmScheduleEngine";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";

interface MonthlyEvmPoint {
  monthLabel: string;
  pvCr: number;
  evCr: number;
  acCr: number;
  monthlyBillingCr: number;
  retentionHeldCr: number;
}

const CANONICAL_EVM_SERIES: MonthlyEvmPoint[] = [
  { monthLabel: "M01 (May 26)", pvCr: 48.20, evCr: 48.20, acCr: 47.90, monthlyBillingCr: 48.20, retentionHeldCr: 2.41 },
  { monthLabel: "M02 (Jun 26)", pvCr: 112.40, evCr: 112.40, acCr: 111.10, monthlyBillingCr: 64.20, retentionHeldCr: 5.62 },
  { monthLabel: "M03 (Jul 26)", pvCr: 189.60, evCr: 189.60, acCr: 187.20, monthlyBillingCr: 77.20, retentionHeldCr: 9.48 },
  { monthLabel: "M04 (Aug 26)", pvCr: 274.80, evCr: 274.80, acCr: 271.40, monthlyBillingCr: 85.20, retentionHeldCr: 13.74 },
  { monthLabel: "M05 (Sep 26)", pvCr: 362.10, evCr: 362.10, acCr: 357.50, monthlyBillingCr: 87.30, retentionHeldCr: 18.11 },
  { monthLabel: "M06 (Oct 26)", pvCr: 449.50, evCr: 449.50, acCr: 443.60, monthlyBillingCr: 87.40, retentionHeldCr: 22.48 },
  { monthLabel: "M07 (Nov 26)", pvCr: 534.26, evCr: 534.26, acCr: 526.88, monthlyBillingCr: 84.76, retentionHeldCr: 43.22 },
];

export default function CanonicalEvmScurvePage() {
  const { isLight } = useLiveviewTheme();
  const evmSummary = useMemo(() => computeVanguardEvmMetrics(), []);
  const [series, setSeries] = useState<MonthlyEvmPoint[]>(CANONICAL_EVM_SERIES);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(
    CANONICAL_EVM_SERIES.length - 1
  );
  const [dataSourceLabel, setDataSourceLabel] = useState<string>("VANGUARD_GENOME DETERMINISTIC");

  useEffect(() => {
    let active = true;
    const syncOptionalLedger = async () => {
      try {
        const { data, error } = await supabase
          .from("evm_monthly_snapshots")
          .select("*")
          .eq("project_id", VANGUARD_GENOME.projectId)
          .order("month_index", { ascending: true });

        if (!active) return;
        if (!error && Array.isArray(data) && data.length > 0) {
          const mapped: MonthlyEvmPoint[] = data.map((row: any, idx: number) => ({
            monthLabel: row.month_label || `M0${idx + 1}`,
            pvCr: Number(row.pv_cr ?? 0),
            evCr: Number(row.ev_cr ?? 0),
            acCr: Number(row.ac_cr ?? 0),
            monthlyBillingCr: Number(row.monthly_billing_cr ?? 0),
            retentionHeldCr: Number(row.retention_held_cr ?? 0),
          }));
          setSeries(mapped);
          setSelectedMonthIndex(mapped.length - 1);
          setDataSourceLabel("SUPABASE + GENOME SYNCED");
        }
      } catch {
        // Retain deterministic CANONICAL_EVM_SERIES without throwing console errors
      }
    };
    syncOptionalLedger();
    return () => {
      active = false;
    };
  }, []);

  const activePoint = series[selectedMonthIndex] || series[series.length - 1];
  const maxSeriesCr = Math.max(
    ...series.map((p) => Math.max(Number(p.pvCr) || 0, Number(p.evCr) || 0, Number(p.acCr) || 0)),
    600
  );
  const bac =
    Number.isFinite(Number(evmSummary?.bacCr)) && Number(evmSummary.bacCr) > 0
      ? Math.max(Number(evmSummary.bacCr), maxSeriesCr)
      : maxSeriesCr;

  // SVG S-Curve Coordinates (640 x 240 plot box)
  const plotW = 560;
  const plotH = 180;
  const padL = 52;
  const padT = 20;

  const toChartCoords = (idx: number, valCr: number): [number, number] => {
    const x = padL + (idx / Math.max(series.length - 1, 1)) * plotW;
    const safeVal = Number.isFinite(Number(valCr)) ? Number(valCr) : 0;
    const y = padT + plotH - (Math.min(safeVal, bac) / bac) * plotH;
    return [x, y];
  };

  const buildPolyline = (selector: (pt: MonthlyEvmPoint) => number) =>
    series
      .map((pt, idx) => toChartCoords(idx, selector(pt)).join(","))
      .join(" ");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              ISO 21508 EARNED VALUE & CASHFLOW S-CURVE
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              {VANGUARD_GENOME.projectId} • {dataSourceLabel}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            EVM S-CURVE CASHFLOW & ESCROW RETENTION TELEMETRY
          </h1>
          <p className="text-xs text-slate-400">
            {VANGUARD_GENOME.projectName} • EPC Baseline ₹{bac.toFixed(2)} Cr • UP-LDA 5% Retention ₹{VANGUARD_GENOME.financials.statutoryRetentionCr.toFixed(2)} Cr
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg transition">
            ← COMMAND CENTER
          </a>
          <a href="/schedule/gantt" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 rounded-lg transition">
            📊 MASTER CPM GANTT
          </a>
          <a href="/finance/ra-bills" className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 rounded-lg transition">
            💼 RA BILLING LEDGER
          </a>
        </div>
      </div>

      {/* Top 6 ISO 21508 KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">BUDGET AT COMPLETION</div>
          <div className="text-lg font-bold text-white mt-1">₹{bac.toFixed(2)} Cr</div>
          <div className="text-[10px] text-slate-500">6 Architectural Bits</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">EARNED VALUE (EV)</div>
          <div className="text-lg font-bold text-cyan-400 mt-1">₹{activePoint.evCr.toFixed(2)} Cr</div>
          <div className="text-[10px] text-slate-500">PV: ₹{activePoint.pvCr.toFixed(2)} Cr</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">ACTUAL COST (AC)</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">₹{activePoint.acCr.toFixed(2)} Cr</div>
          <div className="text-[10px] text-emerald-400">
            CV: +₹{(activePoint.evCr - activePoint.acCr).toFixed(2)} Cr
          </div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">COST PERF. INDEX (CPI)</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">{evmSummary.cpi.toFixed(3)}</div>
          <div className="text-[10px] text-slate-500">SPI: {evmSummary.spi.toFixed(3)} (0d Float)</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">EST. AT COMPLETION (EAC)</div>
          <div className="text-lg font-bold text-cyan-400 mt-1">₹{evmSummary.eacCr.toFixed(2)} Cr</div>
          <div className="text-[10px] text-emerald-400">Savings: ₹{evmSummary.vacCr.toFixed(2)} Cr</div>
        </div>
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400">UP-LDA RETENTION (5%)</div>
          <div className="text-lg font-bold text-amber-400 mt-1">₹{activePoint.retentionHeldCr.toFixed(2)} Cr</div>
          <div className="text-[10px] text-slate-500">Escrow Reserve</div>
        </div>
      </div>

      {/* Interactive S-Curve Chart + Monthly Cashflow Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex flex-wrap justify-between items-center border-b border-slate-800 pb-2 text-xs">
            <span className="font-bold text-white uppercase">
              CUMULATIVE EVM S-CURVE (PV / EV VS. ACTUAL COST)
            </span>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="text-cyan-400 font-bold">● EV / PV (₹534.26 Cr)</span>
              <span className="text-emerald-400 font-bold">● AC (₹526.88 Cr)</span>
            </div>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-2">
            <svg viewBox="0 0 640 235" className="w-full h-60">
              {/* Horizontal Y-Axis Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = padT + plotH - ratio * plotH;
                const val = (ratio * bac).toFixed(0);
                return (
                  <g key={ratio}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={padL + plotW}
                      y2={y}
                      stroke={isLight ? "#E2DDD2" : "#1e293b"}
                      strokeWidth="1"
                    />
                    <text
                      x={padL - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill={isLight ? "#78736A" : "#64748b"}
                      fontSize="8.5"
                      fontFamily="monospace"
                    >
                      ₹{val}
                    </text>
                  </g>
                );
              })}

              {/* Earned Value / Planned Value Curve */}
              <polyline
                fill="none"
                stroke={isLight ? "#C96442" : "#22d3ee"}
                strokeWidth="3"
                points={buildPolyline((pt) => pt.evCr)}
              />

              {/* Actual Cost Curve */}
              <polyline
                fill="none"
                stroke={isLight ? "#3B7A57" : "#34d399"}
                strokeWidth="2.5"
                strokeDasharray="5 3"
                points={buildPolyline((pt) => pt.acCr)}
              />

              {/* Interactive Data Nodes */}
              {series.map((pt, idx) => {
                const [cx, cy] = toChartCoords(idx, pt.evCr);
                const isSelected = idx === selectedMonthIndex;
                return (
                  <g
                    key={pt.monthLabel}
                    onClick={() => setSelectedMonthIndex(idx)}
                    className="cursor-pointer"
                  >
      <GovernorInterlockBanner module="EVM_SCURVE" />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={isSelected ? 6 : 4}
                      fill={isLight ? "#C96442" : "#22d3ee"}
                      stroke={isLight ? "#FDFCF9" : "#020617"}
                      strokeWidth="2"
                    />
                    <text
                      x={cx}
                      y={padT + plotH + 16}
                      textAnchor="middle"
                      fill={
                        isSelected
                          ? isLight
                            ? "#1F1E1B"
                            : "#f8fafc"
                          : isLight
                          ? "#78736A"
                          : "#64748b"
                      }
                      fontSize="8"
                      fontWeight={isSelected ? "bold" : "normal"}
                      fontFamily="monospace"
                    >
                      {pt.monthLabel.split(" ")[0]}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Monthly Billing & Retention Ledger */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="text-xs font-bold text-white uppercase border-b border-slate-800 pb-2">
            MONTHLY RA BILLING & ESCROW RETENTION SCHEDULE
          </div>
          <div className="overflow-y-auto max-h-64">
            <div className="w-full overflow-x-auto"><table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[10px] text-slate-500 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2 px-2">PERIOD</th>
                  <th className="py-2 px-2">CUM. EV</th>
                  <th className="py-2 px-2">CUM. AC</th>
                  <th className="py-2 px-2 text-right">ESCROW RET.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-[11px]">
                {series.map((row, idx) => (
                  <tr
                    key={row.monthLabel}
                    onClick={() => setSelectedMonthIndex(idx)}
                    className={`cursor-pointer transition ${
                      idx === selectedMonthIndex ? "bg-cyan-500/20" : "hover:bg-slate-900/40"
                    }`}
                  >
                    <td className="py-2 px-2 font-bold text-white">{row.monthLabel}</td>
                    <td className="py-2 px-2 text-cyan-400 font-bold">₹{row.evCr.toFixed(2)} Cr</td>
                    <td className="py-2 px-2 text-emerald-400">₹{row.acCr.toFixed(2)} Cr</td>
                    <td className="py-2 px-2 text-right text-amber-400 font-bold">
                      ₹{row.retentionHeldCr.toFixed(2)} Cr
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        </div>
      </div>
    </div>
  );
}
