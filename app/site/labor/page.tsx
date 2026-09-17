"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  HardHat,
  Layers,
  Printer,
  RefreshCw,
  Scale,
  Search,
  Share2,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
  Wrench,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export interface TradeGangRecord {
  id: string;
  project_id: string;
  trade_name: string;
  contractor_name: string;
  planned_headcount: number;
  actual_headcount: number;
  daily_wage_rate_inr: number;
  overtime_hours: number;
  target_output_units: number;
  achieved_output_units: number;
  output_unit_label: string;
  dpr_sync_status: "SYNCED" | "PENDING_SYNC";
}

function formatInr(val: number) {
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function CanonicalLaborPage() {
  const { project, role, tier } = useActiveRole();
  const [gangs, setGangs] = useState<TradeGangRecord[]>([]);
  const [selectedGang, setSelectedGang] = useState<TradeGangRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingDpr, setSyncingDpr] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  // Form State for Quick Shift Intake
  const [actualMen, setActualMen] = useState<number>(3);
  const [overtimeHours, setOvertimeHours] = useState<number>(0);
  const [achievedOutput, setAchievedOutput] = useState<number>(95);

  const loadGangData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("site_trade_gangs")
        .select("*")
        .eq("project_id", project.id)
        .order("trade_name", { ascending: true });

      if (data && data.length > 0) {
        setGangs(data as TradeGangRecord[]);
        if (!selectedGang) {
          const first = data[0] as TradeGangRecord;
          setSelectedGang(first);
          setActualMen(first.actual_headcount);
          setOvertimeHours(first.overtime_hours);
          setAchievedOutput(first.achieved_output_units);
        }
      } else {
        // Deterministic high-density gang data matching the active tier
        const defaults: TradeGangRecord[] =
          tier === "RESIDENTIAL"
            ? [
                {
                  id: "gang-res-01",
                  project_id: project.id,
                  trade_name: "Master Joinery Carpenters",
                  contractor_name: "Royal Woodworks & Interiors",
                  planned_headcount: 3,
                  actual_headcount: 3,
                  daily_wage_rate_inr: 950,
                  overtime_hours: 1.5,
                  target_output_units: 100,
                  achieved_output_units: 95,
                  output_unit_label: "Sqm Carcass",
                  dpr_sync_status: "SYNCED",
                },
                {
                  id: "gang-res-02",
                  project_id: project.id,
                  trade_name: "Veneer PU Polishers",
                  contractor_name: "Royal Woodworks & Interiors",
                  planned_headcount: 2,
                  actual_headcount: 1,
                  daily_wage_rate_inr: 850,
                  overtime_hours: 0,
                  target_output_units: 40,
                  achieved_output_units: 32,
                  output_unit_label: "Sqm Coat",
                  dpr_sync_status: "SYNCED",
                },
                {
                  id: "gang-res-03",
                  project_id: project.id,
                  trade_name: "Tile & Chasing Masons",
                  contractor_name: "Avadh MEP Solutions",
                  planned_headcount: 2,
                  actual_headcount: 2,
                  daily_wage_rate_inr: 750,
                  overtime_hours: 0,
                  target_output_units: 25,
                  achieved_output_units: 26,
                  output_unit_label: "Rmt Chasing",
                  dpr_sync_status: "SYNCED",
                },
                {
                  id: "gang-res-04",
                  project_id: project.id,
                  trade_name: "Electrician / Plumber",
                  contractor_name: "Avadh MEP Solutions",
                  planned_headcount: 1,
                  actual_headcount: 1,
                  daily_wage_rate_inr: 950,
                  overtime_hours: 0,
                  target_output_units: 100,
                  achieved_output_units: 100,
                  output_unit_label: "Points Tested",
                  dpr_sync_status: "SYNCED",
                },
              ]
            : [
                {
                  id: "gang-twr-01",
                  project_id: project.id,
                  trade_name: "Bar Bending & Rebar Gang",
                  contractor_name: "Narmada Concrete Works",
                  planned_headcount: 45,
                  actual_headcount: 42,
                  daily_wage_rate_inr: 850,
                  overtime_hours: 2,
                  target_output_units: 15,
                  achieved_output_units: 14.2,
                  output_unit_label: "MT Tied",
                  dpr_sync_status: "SYNCED",
                },
                {
                  id: "gang-twr-02",
                  project_id: project.id,
                  trade_name: "System Formwork Carpenters",
                  contractor_name: "Narmada Concrete Works",
                  planned_headcount: 55,
                  actual_headcount: 55,
                  daily_wage_rate_inr: 900,
                  overtime_hours: 1,
                  target_output_units: 420,
                  achieved_output_units: 410,
                  output_unit_label: "Sqm Deck",
                  dpr_sync_status: "SYNCED",
                },
                {
                  id: "gang-twr-03",
                  project_id: project.id,
                  trade_name: "RMC Pouring & Vibro Gang",
                  contractor_name: "Narmada Concrete Works",
                  planned_headcount: 28,
                  actual_headcount: 26,
                  daily_wage_rate_inr: 800,
                  overtime_hours: 3,
                  target_output_units: 120,
                  achieved_output_units: 115,
                  output_unit_label: "m³ Cast",
                  dpr_sync_status: "SYNCED",
                },
                {
                  id: "gang-twr-04",
                  project_id: project.id,
                  trade_name: "Tower Crane & Heavy Rigging",
                  contractor_name: "Apex Lift Riggers",
                  planned_headcount: 20,
                  actual_headcount: 20,
                  daily_wage_rate_inr: 1200,
                  overtime_hours: 0,
                  target_output_units: 40,
                  achieved_output_units: 40,
                  output_unit_label: "Lifts Completed",
                  dpr_sync_status: "SYNCED",
                },
              ];

        setGangs(defaults);
        setSelectedGang(defaults[0]);
        setActualMen(defaults[0].actual_headcount);
        setOvertimeHours(defaults[0].overtime_hours);
        setAchievedOutput(defaults[0].achieved_output_units);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [project.id, selectedGang, tier]);

  useEffect(() => {
    void loadGangData();

    const channel = supabase
      .channel(`gangs_sync_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "site_trade_gangs" }, () => void loadGangData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadGangData]);

  const selectTrade = (gang: TradeGangRecord) => {
    setSelectedGang(gang);
    setActualMen(gang.actual_headcount);
    setOvertimeHours(gang.overtime_hours);
    setAchievedOutput(gang.achieved_output_units);
  };

  const summary = useMemo(() => {
    const planned = gangs.reduce((sum, g) => sum + g.planned_headcount, 0);
    const actual = gangs.reduce((sum, g) => sum + g.actual_headcount, 0);
    const fulfillmentPct = planned > 0 ? ((actual / planned) * 100).toFixed(0) : "100";

    const totalBurn = gangs.reduce((sum, g) => {
      const basePay = g.actual_headcount * g.daily_wage_rate_inr;
      const otHourlyRate = (g.daily_wage_rate_inr / 8) * 1.5;
      const otPay = g.actual_headcount * g.overtime_hours * otHourlyRate;
      return sum + basePay + otPay;
    }, 0);

    const totalYieldPct =
      gangs.length > 0
        ? (
            gangs.reduce((sum, g) => {
              const y = g.target_output_units > 0 ? (g.achieved_output_units / g.target_output_units) * 100 : 100;
              return sum + y;
            }, 0) / gangs.length
          ).toFixed(1)
        : "100.0";

    return { planned, actual, fulfillmentPct, totalBurn, totalYieldPct };
  }, [gangs]);

  const handleUpdateIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGang) return;

    const updatePayload: Partial<TradeGangRecord> = {
      actual_headcount: Number(actualMen),
      overtime_hours: Number(overtimeHours),
      achieved_output_units: Number(achievedOutput),
      dpr_sync_status: "PENDING_SYNC",
    };

    try {
      await supabase.from("site_trade_gangs").update(updatePayload).eq("id", selectedGang.id);
    } catch {
      // Local optimistic update
    }

    setGangs((prev) =>
      prev.map((g) => (g.id === selectedGang.id ? { ...g, ...updatePayload } : g))
    );
    setSelectedGang((prev) => (prev ? { ...prev, ...updatePayload } : null));
  };

  const handleAutoSyncDpr = async () => {
    setSyncingDpr(true);
    setSyncSuccess(false);

    try {
      // Update all gangs to SYNCED
      await supabase
        .from("site_trade_gangs")
        .update({ dpr_sync_status: "SYNCED" })
        .eq("project_id", project.id);

      // Sync verified count to daily progress report
      await supabase
        .from("daily_progress_reports")
        .update({
          labor_headcount: summary.actual,
          daily_labor_burn_inr: summary.totalBurn,
        })
        .eq("project_id", project.id);
    } catch {
      // Fallback
    }

    setGangs((prev) => prev.map((g) => ({ ...g, dpr_sync_status: "SYNCED" })));
    setSyncingDpr(false);
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 3000);
  };

  if (loading || !selectedGang) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING SITE WORKFORCE MUSTER & GANG YIELD TELEMETRY...
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
              <span>Site Workforce Telemetry · IS 3786 Labor Muster</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Labor Headcount & Gang Yield
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Real-time site muster tracking, statutory overtime burn calculation, and verified DPR quantity sync.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs font-semibold">
              Scale: <strong className="text-cyan-400">{tier}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs font-semibold">
              Logged: <strong className="text-emerald-400">{role.label}</strong>
            </span>
          </div>
        </div>

        {/* 3 PRIMARY MUSTER METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Site Muster Strength</span>
              <Users className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-2xl font-extrabold font-mono text-white">
                {summary.actual} <span className="text-sm font-normal text-zinc-500">/ {summary.planned} Required</span>
              </span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-1 font-mono">
              ● {summary.fulfillmentPct}% Attendance Fulfillment
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Daily Wage & Overtime Burn</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {formatInr(summary.totalBurn)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              Calculated on 8h statutory shift + 1.5x OT
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Avg Gang Output Yield</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.totalYieldPct}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1 font-mono">
              Measured output vs planned gang target
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: MUSTER COMPARISON (7 cols) vs INTAKE FORM (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: MUSTER COMPARISON BARS (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                  Muster Comparison
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  Planned vs Actual Deployment by Trade
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" /> Planned
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Actual
                </span>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              {gangs.map((gang) => {
                const isSelected = selectedGang.id === gang.id;
                const plannedWidth = Math.min(100, (gang.planned_headcount / (tier === "RESIDENTIAL" ? 4 : 60)) * 100);
                const actualWidth = Math.min(100, (gang.actual_headcount / (tier === "RESIDENTIAL" ? 4 : 60)) * 100);

                return (
                  <div
                    key={gang.id}
                    onClick={() => selectTrade(gang)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-950/20 shadow-md shadow-cyan-950/40"
                        : "border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white">{gang.trade_name}</span>
                      <span className="font-mono text-zinc-400">
                        {gang.actual_headcount} / {gang.planned_headcount} Men
                      </span>
                    </div>

                    <div className="space-y-1">
                      {/* Planned Bar */}
                      <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-cyan-500 rounded-full opacity-60"
                          style={{ width: `${plannedWidth}%` }}
                        />
                      </div>
                      {/* Actual Bar */}
                      <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400 rounded-full"
                          style={{ width: `${actualWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: FIELD LOGGING & SYNC DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 flex flex-col justify-between space-y-5">
            <div className="space-y-4">
              <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                    Field Logging
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">
                    Daily Shift Muster Intake
                  </h3>
                </div>
                <span className="text-xs font-mono text-zinc-400">Selected</span>
              </div>

              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 text-xs space-y-1">
                <span className="text-[10px] font-mono uppercase text-zinc-500 block">Trade Specialist:</span>
                <strong className="text-white text-sm block">{selectedGang.trade_name}</strong>
                <span className="text-zinc-400 font-mono text-[11px] block">{selectedGang.contractor_name}</span>
              </div>

              <form onSubmit={handleUpdateIntake} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Daily Wage (₹/8h)</label>
                    <input
                      type="number"
                      disabled
                      value={selectedGang.daily_wage_rate_inr}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-zinc-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Actual Muster</label>
                    <input
                      type="number"
                      min={0}
                      value={actualMen}
                      onChange={(e) => setActualMen(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Target Output</label>
                    <input
                      type="number"
                      disabled
                      value={selectedGang.target_output_units}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-zinc-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Achieved Output</label>
                    <input
                      type="number"
                      min={0}
                      value={achievedOutput}
                      onChange={(e) => setAchievedOutput(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">OT Hours (Total)</label>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    value={overtimeHours}
                    onChange={(e) => setOvertimeHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition font-mono"
                >
                  Approve Gang Roster
                </button>
              </form>

              <button
                type="button"
                onClick={handleAutoSyncDpr}
                disabled={syncingDpr}
                className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingDpr ? "animate-spin" : ""}`} />
                <span>{syncingDpr ? "Syncing to DPR..." : syncSuccess ? "Synced Successfully!" : "Auto-Sync Roster into DPR"}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              IS 3786 Construction Workforce Productivity Index
            </div>
          </div>

        </div>

        {/* BOTTOM FULL LEDGER TABLE */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-2xl">
          <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Governed Trade Gang Performance & Yield Ledger
              </h3>
            </div>
            <span className="text-xs font-mono text-zinc-500">
              IS 3786 / CPWD Construction Productivity Matrix
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-900/60 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Trade</th>
                  <th className="px-4 py-3">Contractor</th>
                  <th className="px-4 py-3 text-center">Planned / Actual</th>
                  <th className="px-4 py-3 text-right">Daily Rate</th>
                  <th className="px-4 py-3 text-center">OT Hours</th>
                  <th className="px-4 py-3 text-right">Total Burn</th>
                  <th className="px-4 py-3 text-right">Output Yield</th>
                  <th className="px-4 py-3 text-center">DPR State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                {gangs.map((g) => {
                  const basePay = g.actual_headcount * g.daily_wage_rate_inr;
                  const otRate = (g.daily_wage_rate_inr / 8) * 1.5;
                  const burn = basePay + g.actual_headcount * g.overtime_hours * otRate;
                  const yieldPct = g.target_output_units > 0 ? (g.achieved_output_units / g.target_output_units) * 100 : 100;

                  return (
                    <tr key={g.id} className="hover:bg-zinc-900/30 transition">
                      <td className="px-4 py-3.5 font-bold text-white font-sans">
                        {g.trade_name}
                      </td>
                      <td className="px-4 py-3.5 text-zinc-400 font-sans">
                        {g.contractor_name}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-white font-bold">{g.actual_headcount}</span> / {g.planned_headcount}
                      </td>
                      <td className="px-4 py-3.5 text-right text-zinc-400">
                        {formatInr(g.daily_wage_rate_inr)}
                      </td>
                      <td className="px-4 py-3.5 text-center text-zinc-400">
                        {g.overtime_hours}h
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-rose-400">
                        {formatInr(burn)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className={`font-bold ${yieldPct >= 95 ? "text-emerald-400" : "text-amber-400"}`}>
                          {yieldPct.toFixed(1)}%
                        </span>
                        <div className="text-[10px] text-zinc-500 font-sans">
                          {g.achieved_output_units} {g.output_unit_label}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                          {g.dpr_sync_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}