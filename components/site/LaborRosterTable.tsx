"use client";

export interface LaborRosterTableProps {
  initialRoster?: any[];
  projectId?: string;
  [key: string]: any;
}
import React, { useEffect, useState, useMemo, useCallback, useTransition } from "react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  HardHat,
  Plus,
  RefreshCw,
  Users,
  Loader2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { addLaborRosterEntry, syncRosterEntriesToDPR } from "@/app/actions/labor-actions";

export interface LaborRosterItem {
  id: string;
  project_id: string;
  work_date: string;
  trade: string;
  contractor_name: string;
  planned_headcount: number;
  actual_headcount: number;
  wage_rate_per_day: number;
  overtime_hours: number;
  target_output_unit: string;
  target_output_qty: number;
  achieved_output_qty: number;
  synced_to_dpr: boolean;
}

function formatInr(val: number) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Number(val).toLocaleString("en-IN")}`;
}

export function LaborRosterTable({ initialRoster = [], projectId: propProjectId, ...props }: LaborRosterTableProps) {
  const { project, tier } = useActiveRole();
  const projectId = propProjectId || project?.id || "GOMTI-NAGAR-PH1-FITOUT";

  const [roster, setRoster] = useState<LaborRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State for Adding New Roster Entries
  const [form, setForm] = useState({
    trade: tier === "RESIDENTIAL" ? "Master Joinery Carpenters" : "Rebar Steel Fixers",
    contractor_name: tier === "RESIDENTIAL" ? "Royal Woodworks" : "Falcon Structural RCC Works",
    planned_headcount: 12,
    actual_headcount: 10,
    wage_rate_per_day: 1050,
    overtime_hours: 0,
    target_output_unit: "MT",
    target_output_qty: 4.5,
    achieved_output_qty: 4.2,
  });

  const loadRoster = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("labor_roster_entries")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (data) setRoster(data as LaborRosterItem[]);
    } catch {
      // Graceful error trap
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadRoster();

    const channel = supabase
      .channel(`labor_realtime_${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "labor_roster_entries", filter: `project_id=eq.${projectId}` },
        () => void loadRoster()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadRoster]);

  // Overtime & Daily Cash Burn Math per CPWD Labor Regulations
  const metrics = useMemo(() => {
    const totalActual = roster.reduce((sum, i) => sum + Number(i.actual_headcount), 0);
    const totalPlanned = roster.reduce((sum, i) => sum + Number(i.planned_headcount), 0);

    // Standard hourly overtime: (Daily Wage / 8 hrs) * OT Hours * 1.5
    const totalDailyBurn = roster.reduce((sum, i) => {
      const basePay = Number(i.actual_headcount) * Number(i.wage_rate_per_day);
      const hourlyRate = Number(i.wage_rate_per_day) / 8;
      const otPay = Number(i.overtime_hours) * hourlyRate * 1.5;
      return sum + basePay + otPay;
    }, 0);

    // True Productivity (Achieved Output vs Target Output)
    const avgYield =
      roster.length > 0
        ? roster.reduce((sum, i) => {
            const ratio =
              Number(i.target_output_qty) > 0
                ? (Number(i.achieved_output_qty) / Number(i.target_output_qty)) * 100
                : 100;
            return sum + ratio;
          }, 0) / roster.length
        : 100;

    const allSynced = roster.length > 0 && roster.every((i) => i.synced_to_dpr);

    return { totalActual, totalPlanned, totalDailyBurn, avgYield, allSynced };
  }, [roster]);

  const chartData = useMemo(() => {
    return roster.map((item) => ({
      trade: item.trade.length > 14 ? item.trade.slice(0, 14) + "…" : item.trade,
      Planned: item.planned_headcount,
      Actual: item.actual_headcount,
    }));
  }, [roster]);

  const handleAddRoster = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await addLaborRosterEntry({
        projectId,
        workDate: new Date().toISOString().slice(0, 10),
        trade: form.trade,
        contractorName: form.contractor_name,
        plannedHeadcount: form.planned_headcount,
        actualHeadcount: form.actual_headcount,
        wageRatePerDay: form.wage_rate_per_day,
        overtimeHours: form.overtime_hours,
        targetOutputUnit: form.target_output_unit,
        targetOutputQty: form.target_output_qty,
        achievedOutputQty: form.achieved_output_qty,
      });

      if (res.success) {
        setFeedback({ type: "success", text: `Trade gang [${form.trade}] appended to site muster.` });
        await loadRoster();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to add trade gang." });
      }
    });
  };

  const handleSyncToDpr = () => {
    startTransition(async () => {
      const res = await syncRosterEntriesToDPR(projectId);
      if (res.success) {
        setFeedback({
          type: "success",
          text: `Synchronized ${res.syncedCount} muster lines to official DPR (Hermes sealed).`,
        });
        await loadRoster();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to sync muster." });
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING MUSTER TELEMETRY...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono text-xs select-none">
      {feedback && (
        <div
          className={`p-3 border flex items-center justify-between gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
              : "bg-rose-950/80 border-rose-800 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-zinc-200 uppercase text-[10px]">
            Dismiss
          </button>
        </div>
      )}

      {/* TOP 3 VITAL METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Site Muster Strength</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-white">
            {metrics.totalActual} <span className="text-xs text-zinc-500 font-sans">/ {metrics.totalPlanned} planned</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                metrics.totalActual >= metrics.totalPlanned ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span>
              {((metrics.totalActual / Math.max(metrics.totalPlanned, 1)) * 100).toFixed(0)}% attendance fulfillment
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Daily Wage &amp; Overtime Burn</span>
            <Banknote className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-rose-400">
            {formatInr(metrics.totalDailyBurn)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Calculated on 8h statutory shift + 1.5x OT rate
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Avg Gang Output Yield</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-emerald-400">
            {metrics.avgYield.toFixed(1)}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Measured output vs planned gang target
          </div>
        </div>
      </div>

      {/* 2-COLUMN SPLIT: RECHARTS (LEFT) vs DAILY MUSTER INTAKE (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: MUSTER BAR CHART */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Muster Comparison
              </span>
              <h2 className="text-sm font-bold text-white mt-0.5">
                Planned vs Actual Deployment by Trade
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-500">Shift Date: {new Date().toISOString().slice(0, 10)}</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid stroke="#27272a" vertical={false} />
                <XAxis dataKey="trade" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: "#fafafa" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="Planned" fill="#52525b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT: DAILY MUSTER INTAKE FORM */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Field Logging
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">
                  Daily Shift Muster Intake
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono text-[10px] border border-zinc-800">
                Live Input
              </span>
            </div>

            <form onSubmit={handleAddRoster} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Trade Specialization</label>
                <input
                  type="text"
                  value={form.trade}
                  onChange={(e) => setForm({ ...form, trade: e.target.value })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Planned Men</label>
                  <input
                    type="number"
                    min="0"
                    value={form.planned_headcount}
                    onChange={(e) => setForm({ ...form, planned_headcount: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Actual Muster</label>
                  <input
                    type="number"
                    min="0"
                    value={form.actual_headcount}
                    onChange={(e) => setForm({ ...form, actual_headcount: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Daily Wage (₹/day)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.wage_rate_per_day}
                    onChange={(e) => setForm({ ...form, wage_rate_per_day: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">OT Hours (Total)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.overtime_hours}
                    onChange={(e) => setForm({ ...form, overtime_hours: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Target Output ({form.target_output_unit})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.target_output_qty}
                    onChange={(e) => setForm({ ...form, target_output_qty: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Achieved Output</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.achieved_output_qty}
                    onChange={(e) => setForm({ ...form, achieved_output_qty: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 py-2 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>+ Append Gang Roster</span>
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800">
            <button
              type="button"
              disabled={metrics.allSynced || isPending}
              onClick={handleSyncToDpr}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                metrics.allSynced
                  ? "bg-zinc-900 border border-zinc-800 text-emerald-400 cursor-default"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{metrics.allSynced ? "Muster Synced to Official DPR" : "Auto-Sync Roster into DPR"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* DETAILED GANG PRODUCTIVITY & YIELD LEDGER */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="border-b border-zinc-800/80 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHat className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Governed Trade Gang Performance &amp; Yield Ledger
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            IS 7272 Construction Gang Productivity Index
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Trade</th>
                <th className="px-5 py-3">Contractor</th>
                <th className="px-5 py-3 text-center">Planned / Actual</th>
                <th className="px-5 py-3 text-right">Daily Rate</th>
                <th className="px-5 py-3 text-right">OT Hours</th>
                <th className="px-5 py-3 text-right">Total Burn</th>
                <th className="px-5 py-3 text-right">Output Yield</th>
                <th className="px-5 py-3 text-center">DPR State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-600 font-sans">
                    Zero muster logs recorded for this project shift.
                  </td>
                </tr>
              ) : (
                roster.map((item) => {
                  const hourlyRate = Number(item.wage_rate_per_day) / 8;
                  const totalItemBurn =
                    Number(item.actual_headcount) * Number(item.wage_rate_per_day) +
                    Number(item.overtime_hours) * hourlyRate * 1.5;
                  const yieldPct =
                    Number(item.target_output_qty) > 0
                      ? (Number(item.achieved_output_qty) / Number(item.target_output_qty)) * 100
                      : 100;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-900/40 transition">
                      <td className="px-5 py-3.5 font-sans font-bold text-white">{item.trade}</td>
                      <td className="px-5 py-3.5 font-sans text-zinc-400">{item.contractor_name}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-bold text-white">{item.actual_headcount}</span>
                        <span className="text-zinc-500"> / {item.planned_headcount}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-zinc-400">
                        ₹{Number(item.wage_rate_per_day).toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5 text-right text-amber-400">{item.overtime_hours}h</td>
                      <td className="px-5 py-3.5 text-right font-bold text-rose-400">
                        ₹{Math.round(totalItemBurn).toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold">
                        <span
                          className={
                            yieldPct >= 100
                              ? "text-emerald-400"
                              : yieldPct >= 85
                              ? "text-amber-400"
                              : "text-rose-400"
                          }
                        >
                          {yieldPct.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-zinc-500 block font-normal">
                          {item.achieved_output_qty}/{item.target_output_qty} {item.target_output_unit}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.synced_to_dpr
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                              : "bg-amber-950 text-amber-400 border border-amber-800/50"
                          }`}
                        >
                          {item.synced_to_dpr ? "Synced" : "Draft"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LaborRosterTable;
