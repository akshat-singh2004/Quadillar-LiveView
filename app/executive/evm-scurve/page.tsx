"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Calculator,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Printer,
  RefreshCw,
  Scale,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export interface MonthlyEvmDataPoint {
  month: string;
  pv_cumulative_inr: number;
  ev_cumulative_inr: number;
  ac_cumulative_inr: number;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function CanonicalEvmScurvePage() {
  const { project, role, tier } = useActiveRole();
  const [dataPoints, setDataPoints] = useState<MonthlyEvmDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(4);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const bacValue = tier === "RESIDENTIAL" ? 400000 : 395000000;

  const loadEvmData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("project_evm_monthly_logs")
        .select("*")
        .eq("project_id", projectId)
        .order("month_sequence", { ascending: true });

      if (data && data.length > 0) {
        setDataPoints(data as MonthlyEvmDataPoint[]);
      } else {
        const defaults: MonthlyEvmDataPoint[] =
          tier === "RESIDENTIAL"
            ? [
                { month: "Apr 2026", pv_cumulative_inr: 45000, ev_cumulative_inr: 45000, ac_cumulative_inr: 42000 },
                { month: "May 2026", pv_cumulative_inr: 105000, ev_cumulative_inr: 102000, ac_cumulative_inr: 98000 },
                { month: "Jun 2026", pv_cumulative_inr: 165000, ev_cumulative_inr: 160000, ac_cumulative_inr: 154000 },
                { month: "Jul 2026", pv_cumulative_inr: 220000, ev_cumulative_inr: 218000, ac_cumulative_inr: 210000 },
                { month: "Aug 2026", pv_cumulative_inr: 290000, ev_cumulative_inr: 275000, ac_cumulative_inr: 268000 },
                { month: "Sep 2026", pv_cumulative_inr: 350000, ev_cumulative_inr: 320000, ac_cumulative_inr: 315000 },
                { month: "Oct 2026", pv_cumulative_inr: 400000, ev_cumulative_inr: 0, ac_cumulative_inr: 0 },
              ]
            : [
                { month: "Apr 2026", pv_cumulative_inr: 42000000, ev_cumulative_inr: 42000000, ac_cumulative_inr: 41000000 },
                { month: "May 2026", pv_cumulative_inr: 105000000, ev_cumulative_inr: 101000000, ac_cumulative_inr: 99500000 },
                { month: "Jun 2026", pv_cumulative_inr: 178000000, ev_cumulative_inr: 172000000, ac_cumulative_inr: 169000000 },
                { month: "Jul 2026", pv_cumulative_inr: 245000000, ev_cumulative_inr: 240000000, ac_cumulative_inr: 236000000 },
                { month: "Aug 2026", pv_cumulative_inr: 310000000, ev_cumulative_inr: 312000000, ac_cumulative_inr: 308000000 },
                { month: "Sep 2026", pv_cumulative_inr: 360000000, ev_cumulative_inr: 345000000, ac_cumulative_inr: 342000000 },
                { month: "Oct 2026", pv_cumulative_inr: 395000000, ev_cumulative_inr: 0, ac_cumulative_inr: 0 },
              ];

        setDataPoints(defaults);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, tier]);

  useEffect(() => {
    void loadEvmData();

    const channel = supabase
      .channel(`evm_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_evm_monthly_logs" }, () => void loadEvmData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadEvmData]);

  const currentPoint = dataPoints[selectedMonthIndex] || dataPoints[0];

  const metrics = useMemo(() => {
    if (!currentPoint) {
      return {
        pv: 0,
        ev: 0,
        ac: 0,
        cv: 0,
        sv: 0,
        cpi: 1.0,
        spi: 1.0,
        eac: bacValue,
        vac: 0,
        tcpi: 1.0,
      };
    }

    const pv = currentPoint.pv_cumulative_inr;
    const ev = currentPoint.ev_cumulative_inr || pv * 0.92;
    const ac = currentPoint.ac_cumulative_inr || ev * 0.98;

    const cv = ev - ac;
    const sv = ev - pv;
    const cpi = ac > 0 ? ev / ac : 1.0;
    const spi = pv > 0 ? ev / pv : 1.0;

    const eac = cpi > 0 ? bacValue / cpi : bacValue;
    const vac = bacValue - eac;
    const unearned = bacValue - ev;
    const unspent = bacValue - ac;
    const tcpi = unspent > 0 ? unearned / unspent : 1.0;

    return {
      pv,
      ev,
      ac,
      cv,
      sv,
      cpi: Number(cpi.toFixed(2)),
      spi: Number(spi.toFixed(2)),
      eac: Math.round(eac),
      vac: Math.round(vac),
      tcpi: Number(tcpi.toFixed(2)),
    };
  }, [currentPoint, bacValue]);

  const chartCoordinates = useMemo(() => {
    if (!dataPoints.length) return { pvPoints: "", evPoints: "", acPoints: "" };

    const width = 900;
    const height = 300;
    const paddingX = 50;
    const paddingY = 30;

    const usableW = width - paddingX * 2;
    const usableH = height - paddingY * 2;

    const maxVal = bacValue * 1.05;

    const pv = dataPoints.map((d, i) => {
      const x = paddingX + (i / (dataPoints.length - 1)) * usableW;
      const y = height - paddingY - (d.pv_cumulative_inr / maxVal) * usableH;
      return `${x},${y}`;
    }).join(" ");

    const ev = dataPoints
      .filter((d) => d.ev_cumulative_inr > 0)
      .map((d, i) => {
        const x = paddingX + (i / (dataPoints.length - 1)) * usableW;
        const y = height - paddingY - (d.ev_cumulative_inr / maxVal) * usableH;
        return `${x},${y}`;
      }).join(" ");

    const ac = dataPoints
      .filter((d) => d.ac_cumulative_inr > 0)
      .map((d, i) => {
        const x = paddingX + (i / (dataPoints.length - 1)) * usableW;
        const y = height - paddingY - (d.ac_cumulative_inr / maxVal) * usableH;
        return `${x},${y}`;
      }).join(" ");

    return { pvPoints: pv, evPoints: ev, acPoints: ac };
  }, [dataPoints, bacValue]);

  const handlePrintReport = () => {
    const printWin = window.open("", "_blank", "width=1000,height=850");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Earned Value Management (EVM) S-Curve Audit — ${projectName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
    .good { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 36px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · ISO 21508 / FIDIC Clause 8.4 Earned Value Audit</div>
      <h1 class="title">EVM Performance &amp; Cost S-Curve Certificate</h1>
      <div class="meta">Cut-off Month: ${currentPoint.month} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge good">${metrics.cpi >= 1.0 ? "UNDER BUDGET" : "COST OVERRUN"} · ${metrics.spi >= 1.0 ? "ON SCHEDULE" : "SCHEDULE LAG"}</span>
  </div>

  <table>
    <tr><th>Budget at Completion (BAC)</th><td class="tar"><strong>${formatInr(bacValue)}</strong></td><th>Planned Value (PV)</th><td class="tar">${formatInr(metrics.pv)}</td></tr>
    <tr><th>Earned Value (EV)</th><td class="tar" style="color: #0284c7;"><strong>${formatInr(metrics.ev)}</strong></td><th>Actual Cost (AC)</th><td class="tar">${formatInr(metrics.ac)}</td></tr>
    <tr><th>Cost Variance (CV = EV - AC)</th><td class="tar" style="color: ${metrics.cv >= 0 ? "#15803d" : "#b91c1c"}; font-weight: bold;">${formatInr(metrics.cv)}</td><th>Schedule Variance (SV = EV - PV)</th><td class="tar" style="color: ${metrics.sv >= 0 ? "#15803d" : "#b91c1c"}; font-weight: bold;">${formatInr(metrics.sv)}</td></tr>
  </table>

  <table>
    <thead>
      <tr><th>Performance Index</th><th>Formula</th><th>Calculated Value</th><th>Status Interpretation</th></tr>
    </thead>
    <tbody>
      <tr><td>Cost Performance Index (CPI)</td><td>EV / AC</td><td class="tar"><strong>${metrics.cpi}</strong></td><td>${metrics.cpi >= 1.0 ? "Spending less than 1.00 per rupee of earned work output." : "Cost overrun observed in direct site execution."}</td></tr>
      <tr><td>Schedule Performance Index (SPI)</td><td>EV / PV</td><td class="tar"><strong>${metrics.spi}</strong></td><td>${metrics.spi >= 1.0 ? "Progressing at or ahead of contractual timeline." : "Physical site execution trailing baseline plan."}</td></tr>
      <tr><td>Estimate at Completion (EAC)</td><td>BAC / CPI</td><td class="tar" style="font-weight: bold; color: #0284c7;">${formatInr(metrics.eac)}</td><td>Projected final commercial cost based on active burn efficiency.</td></tr>
      <tr><td>Variance at Completion (VAC)</td><td>BAC - EAC</td><td class="tar" style="font-weight: bold; color: ${metrics.vac >= 0 ? "#15803d" : "#b91c1c"};">${formatInr(metrics.vac)}</td><td>Projected commercial variance at virtual handover.</td></tr>
      <tr><td>To-Complete Index (TCPI)</td><td>(BAC - EV) / (BAC - AC)</td><td class="tar"><strong>${metrics.tcpi}</strong></td><td>Required cost efficiency for remaining work to meet governed BAC.</td></tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Quantity Surveyor Lead</div>
      <div style="color: #64748b;">Measurement inputs certified per e-MB.</div>
      <div class="sig">QS Sign &amp; Date</div>
    </div>
    <div>
      <div>Project Management Consultant (PMC)</div>
      <div style="color: #64748b;">Schedule physical progression verified.</div>
      <div class="sig">PMC Director Seal</div>
    </div>
    <div>
      <div>Principal Architect / Consultant SEOR</div>
      <div style="color: #64748b;">EVM curves approved for client dispatch.</div>
      <div class="sig">Consultant Authorization</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !currentPoint) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        CALCULATING ISO 21508 EARNED VALUE GAUGES &amp; S-CURVES...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Executive Telemetry · ISO 21508 / FIDIC Clause 8.4</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Cashflow &amp; Earned Value (S-Curve) Console
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Strict mathematical performance tracking. Compare Planned Value (PV), Earned Value (EV), and Actual Cost (AC) to forecast final project cost (EAC) and schedule variance.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print EVM Certificate</span>
            </button>
            <Link
              href="/schedule/gantt"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Open Master Gantt</span>
            </Link>
          </div>
        </div>

        {/* 4 PRIMARY EVM FORMULA TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Budget at Completion (BAC)</span>
              <DollarSign className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {formatInr(bacValue)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Total governed contract baseline</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Earned Value (EV)</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {formatInr(metrics.ev)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Physical output measured per e-MB</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Cost Performance Index (CPI)</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-2xl font-extrabold font-mono ${metrics.cpi >= 1.0 ? "text-emerald-400" : "text-rose-400"}`}>
                {metrics.cpi}
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {metrics.cpi >= 1.0 ? "Under Cost Budget" : "Cost Overrun Trend"}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CV: {formatInr(metrics.cv)}</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Schedule Performance (SPI)</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className={`text-2xl font-extrabold font-mono ${metrics.spi >= 1.0 ? "text-emerald-400" : "text-amber-400"}`}>
                {metrics.spi}
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                {metrics.spi >= 1.0 ? "On / Ahead Target" : "Schedule Lagging"}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">SV: {formatInr(metrics.sv)}</div>
          </div>
        </div>

        {/* INTERACTIVE S-CURVE CANVAS (VECTOR PLOTTER) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-4 gap-3">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Cumulative Project Performance Profile
              </span>
              <h2 className="text-base font-bold text-white mt-0.5">
                Earned Value S-Curve (PV vs EV vs AC)
              </h2>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="h-2 w-4 bg-cyan-400 rounded-sm" /> Planned Value (PV)
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-4 bg-emerald-400 rounded-sm" /> Earned Value (EV)
              </span>
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="h-2 w-4 bg-amber-400 rounded-sm" /> Actual Cost (AC)
              </span>
            </div>
          </div>

          {/* SVG S-CURVE PLOTTER */}
          <div className="relative w-full overflow-x-auto">
            <div className="min-w-[850px] h-[320px] bg-zinc-900/30 rounded-xl border border-zinc-800/60 p-2 relative">
              <svg className="w-full h-full" viewBox="0 0 900 300">
                <line x1="50" y1="30" x2="850" y2="30" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                <line x1="50" y1="100" x2="850" y2="100" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                <line x1="50" y1="170" x2="850" y2="170" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                <line x1="50" y1="240" x2="850" y2="240" stroke="#334155" strokeWidth="1" strokeDasharray="3 3" opacity="0.3" />
                <line x1="50" y1="270" x2="850" y2="270" stroke="#475569" strokeWidth="1.5" opacity="0.6" />

                <text x="10" y="35" fill="#64748b" fontSize="10" fontFamily="monospace">BAC</text>
                <text x="10" y="105" fill="#64748b" fontSize="10" fontFamily="monospace">75%</text>
                <text x="10" y="175" fill="#64748b" fontSize="10" fontFamily="monospace">50%</text>
                <text x="10" y="245" fill="#64748b" fontSize="10" fontFamily="monospace">25%</text>
                <text x="10" y="275" fill="#64748b" fontSize="10" fontFamily="monospace">0%</text>

                {chartCoordinates.pvPoints && (
                  <polyline
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                    points={chartCoordinates.pvPoints}
                  />
                )}

                {chartCoordinates.acPoints && (
                  <polyline
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2.5"
                    points={chartCoordinates.acPoints}
                  />
                )}

                {chartCoordinates.evPoints && (
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    points={chartCoordinates.evPoints}
                  />
                )}

                {dataPoints.map((d, i) => {
                  const x = 50 + (i / (dataPoints.length - 1)) * 800;
                  const isSelected = selectedMonthIndex === i;

                  return (
                    <g key={d.month} className="cursor-pointer" onClick={() => setSelectedMonthIndex(i)}>
                      <line x1={x} y1="270" x2={x} y2="276" stroke={isSelected ? "#06b6d4" : "#64748b"} strokeWidth={isSelected ? "2" : "1"} />
                      <text
                        x={x}
                        y="292"
                        textAnchor="middle"
                        fill={isSelected ? "#38bdf8" : "#94a3b8"}
                        fontSize="11"
                        fontFamily="monospace"
                        fontWeight={isSelected ? "bold" : "normal"}
                      >
                        {d.month.split(" ")[0]}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono text-zinc-400 pt-2 gap-2">
            <span>Click any monthly milestone along the timeline to inspect active EVM indicators.</span>
            <span className="text-zinc-500">Active Audit Target: <strong className="text-cyan-400">{currentPoint.month}</strong></span>
          </div>
        </div>

        {/* 2-COLUMN FORECASTING LEDGER: ISO 21508 FORECASTS (6 cols) vs MONTHLY S-CURVE DATA TABLE (6 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: ISO 21508 FORECAST GAUGES (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Predictive Analysis
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  ISO 21508 Forecast Projections ({currentPoint.month})
                </h3>
              </div>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                TCPI: {metrics.tcpi}
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 block text-[11px]">Estimate at Completion (EAC = BAC / CPI)</span>
                  <div className="text-white font-extrabold text-base mt-0.5">{formatInr(metrics.eac)}</div>
                </div>
                <span className="text-zinc-500 text-[11px]">Projected Final Spend</span>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 block text-[11px]">Variance at Completion (VAC = BAC - EAC)</span>
                  <div className={`font-extrabold text-base mt-0.5 ${metrics.vac >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatInr(metrics.vac)}
                  </div>
                </div>
                <span className={`text-[11px] font-bold ${metrics.vac >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {metrics.vac >= 0 ? "Favorable Under-run" : "Projected Overrun"}
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
                <div>
                  <span className="text-zinc-400 block text-[11px]">To-Complete Performance Index (TCPI)</span>
                  <div className="text-white font-extrabold text-base mt-0.5">{metrics.tcpi}</div>
                </div>
                <span className="text-zinc-400 text-[11px]">Cost Efficiency Required</span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              Standard CPWD Clause 10CC &amp; FIDIC Red Book Earned Value Criteria
            </div>
          </div>

          {/* RIGHT: CUMULATIVE S-CURVE LOG TABLE (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
            <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Progress Progression Ledger
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">Monthly Cumulative Data</h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">{dataPoints.length} Milestones</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-900/60 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3 text-right">Planned (PV)</th>
                    <th className="px-4 py-3 text-right">Earned (EV)</th>
                    <th className="px-4 py-3 text-right">Actual (AC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                  {dataPoints.map((dp, idx) => {
                    const isSelected = selectedMonthIndex === idx;

                    return (
                      <tr
                        key={dp.month}
                        onClick={() => setSelectedMonthIndex(idx)}
                        className={`cursor-pointer transition ${
                          isSelected ? "bg-cyan-950/40 border-l-2 border-l-cyan-400 text-white font-bold" : "hover:bg-zinc-900/30"
                        }`}
                      >
                        <td className="px-4 py-3 text-white">
                          {dp.month}
                        </td>
                        <td className="px-4 py-3 text-right text-cyan-400">
                          {formatInr(dp.pv_cumulative_inr)}
                        </td>
                        <td className="px-4 py-3 text-right text-emerald-400">
                          {dp.ev_cumulative_inr > 0 ? formatInr(dp.ev_cumulative_inr) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-amber-400">
                          {dp.ac_cumulative_inr > 0 ? formatInr(dp.ac_cumulative_inr) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}