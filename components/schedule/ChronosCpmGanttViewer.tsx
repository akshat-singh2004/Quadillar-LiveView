"use client";

import React, { useState } from "react";
import { CpmActivityRecord, evaluateTimeImpactAnalysis } from "@/app/actions/schedule-actions";
import {
  Calendar,
  AlertTriangle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ChevronRight,
  TrendingDown,
  Loader2,
  Filter,
} from "lucide-react";

interface Props {
  activities: CpmActivityRecord[];
  projectId?: string;
}

export function ChronosCpmGanttViewer({ activities, projectId = "GOMTI-NAGAR-PH1-FITOUT" }: Props) {
  const [selectedActivity, setSelectedActivity] = useState<CpmActivityRecord | null>(activities[0] || null);
  const [delayInput, setDelayInput] = useState<number>(7);
  const [loading, setLoading] = useState<boolean>(false);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState<boolean>(false);

  const displayed = filterCriticalOnly
    ? activities.filter((a) => a.is_critical_path)
    : activities;

  // Timeline coordinate metrics (October 2026 Baseline Horizon)
  const timelineStart = new Date("2026-10-01").getTime();
  const timelineEnd = new Date("2026-12-15").getTime();
  const totalDurationMs = timelineEnd - timelineStart;

  const getBarCoordinates = (startIso: string, finishIso: string) => {
    const s = new Date(startIso).getTime();
    const f = new Date(finishIso).getTime();
    const leftPct = Math.max(0, Math.min(100, ((s - timelineStart) / totalDurationMs) * 100));
    const widthPct = Math.max(3, Math.min(100 - leftPct, ((f - s) / totalDurationMs) * 100));
    return { leftPct, widthPct };
  };

  const handleSimulateTia = async () => {
    if (!selectedActivity) return;
    setLoading(true);
    try {
      const res = await evaluateTimeImpactAnalysis(
        projectId,
        selectedActivity.activity_code,
        `HND-AUTONOMOUS-${Date.now().toString().slice(-4)}`,
        Number(delayInput)
      );
      if (res.success && res.data) {
        setSelectedActivity(res.data as CpmActivityRecord);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 font-mono text-xs select-none">
      {/* TIMELINE CONTROL & HORIZON BAR */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shadow-xl">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-cyan-400" />
          <div>
            <strong className="text-white text-xs uppercase block">
              SCL Delay Protocol • Critical Path Method Baseline
            </strong>
            <span className="text-[10px] text-zinc-400 font-sans">
              Horizon: Q4 2026 (Oct 01 – Dec 15, 2026) • Contemporaneous TIA Float Tracking
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
            className={`px-3 py-1.5 rounded-lg border font-bold uppercase text-[10px] transition cursor-pointer flex items-center gap-1.5 ${
              filterCriticalOnly
                ? "bg-rose-950 border-rose-800 text-rose-300"
                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white"
            }`}
          >
            <Filter className="w-3 h-3" />
            <span>{filterCriticalOnly ? "Showing Critical Path Only" : "Show All Activities"}</span>
          </button>
        </div>
      </div>

      {/* 2-COLUMN LAYOUT: GANTT CHART + TIA FORENSIC PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMN 1: INTERACTIVE SVG/CSS GANTT NETWORK */}
        <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl flex flex-col justify-between">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80">
            <span className="font-bold text-white uppercase text-xs">
              4D CPM Network Schedule ({displayed.length} Activities)
            </span>
            <div className="flex items-center gap-3 text-[10px] text-zinc-400">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block" />
                <span>Critical Path (Float &le; 0d)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-cyan-500 inline-block" />
                <span>Sub-Critical Float</span>
              </span>
            </div>
          </div>

          {/* GANTT HEADER CALENDAR TICKS */}
          <div className="border-b border-zinc-800 bg-zinc-950 px-4 py-2 grid grid-cols-4 text-center text-[10px] text-zinc-500 font-bold uppercase">
            <div>Oct 01 - Oct 15</div>
            <div>Oct 16 - Oct 31</div>
            <div>Nov 01 - Nov 15</div>
            <div>Nov 16 - Dec 15</div>
          </div>

          {/* GANTT BARS LIST */}
          <div className="divide-y divide-zinc-800/80 p-2 overflow-y-auto max-h-[420px]">
            {displayed.length === 0 ? (
              <div className="p-12 text-center text-zinc-600 font-sans">
                No activities match filter.
              </div>
            ) : (
              displayed.map((act) => {
                const { leftPct, widthPct } = getBarCoordinates(act.planned_start, act.planned_finish);
                const isSelected = selectedActivity?.id === act.id;

                return (
                  <div
                    key={act.id}
                    onClick={() => setSelectedActivity(act)}
                    className={`p-2.5 rounded-xl transition cursor-pointer space-y-1.5 ${
                      isSelected ? "bg-zinc-850 border border-zinc-700 shadow" : "hover:bg-zinc-850/50"
                    }`}
                  >
                    <div className="flex justify-between items-center text-[11px]">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          act.is_critical_path
                            ? "bg-rose-950 border border-rose-800 text-rose-300"
                            : "bg-zinc-950 border border-zinc-800 text-zinc-400"
                        }`}>
                          {act.activity_code}
                        </span>
                        <strong className="text-white text-xs">{act.activity_name}</strong>
                      </div>

                      <div className="flex items-center gap-3 text-[10px] font-mono">
                        <span className="text-zinc-500">Duration: {act.duration_days}d</span>
                        <span className={act.total_float_days <= 0 ? "text-rose-400 font-bold" : "text-cyan-400"}>
                          Float: {act.total_float_days}d
                        </span>
                      </div>
                    </div>

                    {/* SVG GANTT BAR TRACK */}
                    <div className="w-full bg-zinc-950 rounded-full h-3 relative overflow-hidden">
                      <div
                        style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                        className={`absolute top-0 bottom-0 rounded-full transition-all duration-300 ${
                          act.is_critical_path
                            ? "bg-gradient-to-r from-rose-500 to-amber-500 shadow-sm shadow-rose-500/50"
                            : "bg-cyan-500/80"
                        }`}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 bg-zinc-950 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
            <span>SCL Delay Protocol Method: Time Impact Analysis</span>
            <span className="text-cyan-400">Total Float Monitored Contemporaneously</span>
          </div>
        </div>

        {/* COLUMN 2: TIME IMPACT ANALYSIS (TIA) FORENSICS & SIMULATOR */}
        <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-cyan-400 text-[10px] uppercase tracking-wider font-bold mb-1">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>Contemporaneous TIA Forensic Engine</span>
            </div>
            <h3 className="text-sm font-bold text-white uppercase">
              {selectedActivity ? selectedActivity.activity_name : "Select Activity"}
            </h3>
            <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
              Simulate employer hindrance impact on critical path float consumption.
            </p>

            {selectedActivity && (
              <div className="mt-4 space-y-3">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Activity Code:</span>
                    <strong className="text-white font-mono">{selectedActivity.activity_code}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">WBS Element:</span>
                    <strong className="text-zinc-300">{selectedActivity.wbs_element}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Planned Dates:</span>
                    <span className="text-zinc-400 font-mono text-[10px]">
                      {selectedActivity.planned_start} &rarr; {selectedActivity.planned_finish}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Available Total Float:</span>
                    <strong className={`font-mono text-xs ${selectedActivity.total_float_days <= 0 ? "text-rose-400" : "text-emerald-400"}`}>
                      {selectedActivity.total_float_days} Days
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Current Variance:</span>
                    <strong className="text-amber-400 font-mono">+{selectedActivity.delay_variance_days} Days</strong>
                  </div>
                </div>

                {/* SCL TIA SIMULATION CONTROLS */}
                <div className="p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl space-y-3">
                  <span className="text-[10px] text-zinc-400 uppercase font-bold block">
                    Simulate Employer Delay Impact:
                  </span>

                  <div>
                    <label className="text-[9px] text-zinc-500 block mb-1">
                      Hindrance Duration (Calendar Days)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={45}
                      value={delayInput}
                      onChange={(e) => setDelayInput(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-mono font-bold text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleSimulateTia}
                    className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold uppercase text-[10px] transition cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-950/40"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                    <span>Inject Delay &amp; Notarize TIA</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-500">
            <span>FIDIC Cl. 20.1: 28-day notice window auto-initiated upon float breach.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
