"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FastForward,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Maximize2,
  Milestone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  X
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type TaskStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "DELAYED";

export interface ScheduleTask {
  id: string;
  project_id: string;
  wbs_code: string;
  task_name: string;
  trade_package: string;
  contractor_name: string;
  start_day_offset: number; // 0 to 60 days
  duration_days: number;
  progress_pct: number;
  is_critical_path: boolean;
  total_float_days: number;
  baseline_finish_date: string;
  actual_finish_date: string;
  variance_days: number;
  status: TaskStatus;
}

export default function CanonicalGanttPage() {
  const { project, role, tier } = useActiveRole();
  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<ScheduleTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterCriticalOnly, setFilterCriticalOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Safe Role Check (avoids TS2367 union error)
  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = role?.label || "";
  const isPmcOrArchitect =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Lead");

  const projectDurationDays = tier === "RESIDENTIAL" ? 45 : 180;

  const loadTasks = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("project_schedule_tasks")
        .select("*")
        .eq("project_id", project.id)
        .order("start_day_offset", { ascending: true });

      if (data && data.length > 0) {
        setTasks(data as ScheduleTask[]);
        if (!selectedTask) setSelectedTask(data[0] as ScheduleTask);
      } else {
        const defaults: ScheduleTask[] =
          tier === "RESIDENTIAL"
            ? [
                {
                  id: "tsk-res-01",
                  project_id: project.id,
                  wbs_code: "1.1",
                  task_name: "Site Demolition, Chasing & 1st Fix MEP",
                  trade_package: "First-Fix Plumbing & Electrical",
                  contractor_name: "Avadh MEP Solutions",
                  start_day_offset: 0,
                  duration_days: 10,
                  progress_pct: 100,
                  is_critical_path: true,
                  total_float_days: 0,
                  baseline_finish_date: "2026-08-25",
                  actual_finish_date: "2026-08-25",
                  variance_days: 0,
                  status: "COMPLETED",
                },
                {
                  id: "tsk-res-02",
                  project_id: project.id,
                  wbs_code: "1.2",
                  task_name: "Sunken Bath Micro-Concrete & Waterproofing",
                  trade_package: "Civil & Waterproofing",
                  contractor_name: "Avadh MEP Solutions",
                  start_day_offset: 8,
                  duration_days: 7,
                  progress_pct: 100,
                  is_critical_path: true,
                  total_float_days: 0,
                  baseline_finish_date: "2026-09-02",
                  actual_finish_date: "2026-09-02",
                  variance_days: 0,
                  status: "COMPLETED",
                },
                {
                  id: "tsk-res-03",
                  project_id: project.id,
                  wbs_code: "2.1",
                  task_name: "False Ceiling Perimeter Channel Grid & Shadow Gap",
                  trade_package: "Surface Finishes & Polish",
                  contractor_name: "Royal Woodworks & Interiors",
                  start_day_offset: 14,
                  duration_days: 12,
                  progress_pct: 85,
                  is_critical_path: false,
                  total_float_days: 4,
                  baseline_finish_date: "2026-09-14",
                  actual_finish_date: "2026-09-15",
                  variance_days: 1,
                  status: "IN_PROGRESS",
                },
                {
                  id: "tsk-res-04",
                  project_id: project.id,
                  wbs_code: "2.2",
                  task_name: "Boilo HDHMR Modular Wardrobe Carcass Assembly",
                  trade_package: "Custom Joinery & Millwork",
                  contractor_name: "Royal Woodworks & Interiors",
                  start_day_offset: 18,
                  duration_days: 16,
                  progress_pct: 70,
                  is_critical_path: true,
                  total_float_days: 0,
                  baseline_finish_date: "2026-09-22",
                  actual_finish_date: "2026-09-24",
                  variance_days: 2,
                  status: "IN_PROGRESS",
                },
                {
                  id: "tsk-res-05",
                  project_id: project.id,
                  wbs_code: "3.1",
                  task_name: "High-Gloss PU Polish & Asian Paints Royale Primer",
                  trade_package: "Surface Finishes & Polish",
                  contractor_name: "Royal Woodworks & Interiors",
                  start_day_offset: 32,
                  duration_days: 8,
                  progress_pct: 0,
                  is_critical_path: true,
                  total_float_days: 0,
                  baseline_finish_date: "2026-09-30",
                  actual_finish_date: "2026-10-02",
                  variance_days: 2,
                  status: "NOT_STARTED",
                },
                {
                  id: "tsk-res-06",
                  project_id: project.id,
                  wbs_code: "3.2",
                  task_name: "Final Fixtures, Snag Rectification & TOC Handover",
                  trade_package: "Turnkey Handover",
                  contractor_name: "Quadillar ConTech PMC",
                  start_day_offset: 38,
                  duration_days: 7,
                  progress_pct: 0,
                  is_critical_path: true,
                  total_float_days: 0,
                  baseline_finish_date: "2026-10-06",
                  actual_finish_date: "2026-10-08",
                  variance_days: 2,
                  status: "NOT_STARTED",
                },
              ]
            : [
                {
                  id: "tsk-twr-01",
                  project_id: project.id,
                  wbs_code: "1.1",
                  task_name: "Basement B2 Raft Foundation M40 Concrete Casting",
                  trade_package: "Civil & Superstructure",
                  contractor_name: "Narmada Concrete Works",
                  start_day_offset: 0,
                  duration_days: 24,
                  progress_pct: 100,
                  is_critical_path: true,
                  total_float_days: 0,
                  baseline_finish_date: "2026-06-15",
                  actual_finish_date: "2026-06-15",
                  variance_days: 0,
                  status: "COMPLETED",
                },
                {
                  id: "tsk-twr-02",
                  project_id: project.id,
                  wbs_code: "1.2",
                  task_name: "Levels 01-04 Core Shear Walls & PT Slab Decks",
                  trade_package: "Civil & Superstructure",
                  contractor_name: "Narmada Concrete Works",
                  start_day_offset: 22,
                  duration_days: 45,
                  progress_pct: 100,
                  is_critical_path: true,
                  total_float_days: 0,
                  baseline_finish_date: "2026-07-30",
                  actual_finish_date: "2026-08-02",
                  variance_days: 3,
                  status: "COMPLETED",
                },
                {
                  id: "tsk-twr-03",
                  project_id: project.id,
                  wbs_code: "2.1",
                  task_name: "Levels 05-08 Core Shear Walls Hydraulic Shuttering",
                  trade_package: "Civil & Superstructure",
                  contractor_name: "Narmada Concrete Works",
                  start_day_offset: 65,
                  duration_days: 40,
                  progress_pct: 82,
                  is_critical_path: true,
                  total_float_days: 0,
                  baseline_finish_date: "2026-09-18",
                  actual_finish_date: "2026-09-22",
                  variance_days: 4,
                  status: "IN_PROGRESS",
                },
                {
                  id: "tsk-twr-04",
                  project_id: project.id,
                  wbs_code: "2.2",
                  task_name: "Unitized Glass Facade Transom & Mullion Installation",
                  trade_package: "Facade & Glazing",
                  contractor_name: "Apex Glass & Façades",
                  start_day_offset: 80,
                  duration_days: 50,
                  progress_pct: 45,
                  is_critical_path: false,
                  total_float_days: 12,
                  baseline_finish_date: "2026-10-15",
                  actual_finish_date: "2026-10-16",
                  variance_days: 1,
                  status: "IN_PROGRESS",
                },
                {
                  id: "tsk-twr-05",
                  project_id: project.id,
                  wbs_code: "3.1",
                  task_name: "Core MEP Heavy Chiller Risers & Pressure Testing",
                  trade_package: "MEP Engineering",
                  contractor_name: "Avadh MEP Solutions",
                  start_day_offset: 90,
                  duration_days: 35,
                  progress_pct: 20,
                  is_critical_path: false,
                  total_float_days: 6,
                  baseline_finish_date: "2026-10-25",
                  actual_finish_date: "2026-10-26",
                  variance_days: 1,
                  status: "IN_PROGRESS",
                },
              ];

        setTasks(defaults);
        if (!selectedTask) setSelectedTask(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [project.id, selectedTask, tier]);

  useEffect(() => {
    void loadTasks();

    const channel = supabase
      .channel(`schedule_tasks_sync_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "project_schedule_tasks" }, () => void loadTasks())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadTasks]);

  const summary = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => t.status === "COMPLETED").length;
    const inProgress = tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const criticalTasks = tasks.filter((t) => t.is_critical_path).length;
    const maxDelay = tasks.reduce((max, t) => Math.max(max, t.variance_days), 0);

    const overallPct =
      tasks.length > 0
        ? Math.round(tasks.reduce((sum, t) => sum + t.progress_pct, 0) / tasks.length)
        : 0;

    return { total, completed, inProgress, criticalTasks, maxDelay, overallPct };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesCritical = !filterCriticalOnly || t.is_critical_path;
      const haystack = `${t.wbs_code} ${t.task_name} ${t.contractor_name} ${t.trade_package}`.toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchesCritical && matchesSearch;
    });
  }, [tasks, filterCriticalOnly, search]);

  const handleUpdateProgress = async (taskId: string, nextPct: number) => {
    setActionInProgress(taskId);
    const nextStatus: TaskStatus = nextPct >= 100 ? "COMPLETED" : nextPct > 0 ? "IN_PROGRESS" : "NOT_STARTED";
    const updatePayload = { progress_pct: nextPct, status: nextStatus };

    try {
      await (supabase as any).from("project_schedule_tasks").update(updatePayload).eq("id", taskId);
    } catch {
      // Optimistic update
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updatePayload } : t))
    );
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask((prev) => (prev ? { ...prev, ...updatePayload } : null));
    }
    setActionInProgress(null);
  };

  const handlePrintGantt = () => {
    const printWin = window.open("", "_blank", "width=1000,height=850");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Master Schedule & CPM Programme — ${project.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
    .ontrack { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .delayed { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .critical-tag { color: #b91c1c; font-weight: bold; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 36px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · FIDIC Clause 8.3 Programme of Work</div>
      <h1 class="title">Master Construction Schedule & CPM Baseline</h1>
      <div class="meta">Project: ${project.name} (${project.id}) · Governed Duration: ${projectDurationDays} Days</div>
    </div>
    <span class="badge ${summary.maxDelay > 0 ? 'delayed' : 'ontrack'}">${summary.maxDelay > 0 ? `MAX DELAY: +${summary.maxDelay} DAYS` : 'ON SCHEDULE BASELINE'}</span>
  </div>

  <table>
    <thead>
      <tr><th>WBS</th><th>Work Task Description</th><th>Trade Entity</th><th>Duration</th><th class="tar">Progress</th><th class="tar">Float</th><th>Critical Path</th><th>Variance</th></tr>
    </thead>
    <tbody>
      ${tasks.map((t) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${t.wbs_code}</td>
          <td><strong>${t.task_name}</strong></td>
          <td>${t.contractor_name}</td>
          <td>${t.duration_days} Days</td>
          <td class="tar">${t.progress_pct}%</td>
          <td class="tar">${t.total_float_days}d</td>
          <td class="${t.is_critical_path ? 'critical-tag' : ''}">${t.is_critical_path ? 'CRITICAL (0 Float)' : 'Non-Critical'}</td>
          <td style="color: ${t.variance_days > 0 ? '#b91c1c' : '#15803d'}; font-weight: bold;">${t.variance_days > 0 ? `+${t.variance_days}d lag` : 'On Target'}</td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Contractor Project Planner</div>
      <div style="color: #64748b;">Schedule inputs updated weekly.</div>
      <div class="sig">Planning Engineer Signature</div>
    </div>
    <div>
      <div>Project Management Consultant (PMC)</div>
      <div style="color: #64748b;">Critical path impact verified.</div>
      <div class="sig">PMC Schedule Seal</div>
    </div>
    <div>
      <div>Principal Architect / Consultant SEOR</div>
      <div style="color: #64748b;">Clause 8.3 Programme Approved.</div>
      <div class="sig">Consultant Authorization</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedTask) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        CALCULATING CRITICAL PATH METHOD (CPM) &amp; SCHEDULE BASELINE...
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
              <span>Time Control Desk · FIDIC Clause 8.3 Programme &amp; Clause 8.4 EOT</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Master Schedule &amp; CPM Gantt
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Critical Path Method (CPM) analytics. Visualizes zero-float activities, schedule lag variance against the approved baseline, and links directly to Earned Value (EVM) cashflows.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintGantt}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Master Programme</span>
            </button>
            <Link
              href="/executive/evm-scurve"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-sm"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Open EVM S-Curve</span>
            </Link>
          </div>
        </div>

        {/* 4 PRIMARY SCHEDULE METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Cumulative Progress</span>
              <Milestone className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.overallPct}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Across all WBS milestone packages</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Critical Path (0 Float)</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-rose-400 mt-2">
              {summary.criticalTasks} Tasks
            </div>
            <div className="text-[11px] text-rose-500/80 mt-1">Any delay pushes contractual handover</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Maximum Schedule Lag</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${summary.maxDelay > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {summary.maxDelay > 0 ? `+${summary.maxDelay} Days` : "0 Days (On Target)"}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Variance against approved baseline</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Completed Milestones</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {summary.completed} / {summary.total}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Verified work packages closed</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & CRITICAL PATH TOGGLE */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterCriticalOnly(!filterCriticalOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                filterCriticalOnly
                  ? "bg-rose-600 text-white shadow-md shadow-rose-950/50"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>{filterCriticalOnly ? "Showing Critical Path Only" : "Show All Schedule Items"}</span>
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search WBS code, task, trade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* INTERACTIVE GANTT BAR CANVAS (VECTOR RENDERED) */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-2">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Time-Scaled Bar Chart
              </span>
              <h2 className="text-sm font-bold text-white mt-0.5">
                CPM Schedule Horizon ({projectDurationDays} Day Baseline)
              </h2>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-rose-400">
                <span className="h-2 w-3 bg-rose-500 rounded-sm" /> Critical Path
              </span>
              <span className="flex items-center gap-1.5 text-cyan-400">
                <span className="h-2 w-3 bg-cyan-500 rounded-sm" /> Non-Critical
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-3 bg-emerald-500 rounded-sm" /> 100% Completed
              </span>
            </div>
          </div>

          {/* GANTT BARS CONTAINER */}
          <div className="space-y-3 pt-2">
            {filteredTasks.map((t) => {
              const isSelected = selectedTask.id === t.id;
              const leftPct = Math.min(90, (t.start_day_offset / projectDurationDays) * 100);
              const widthPct = Math.max(8, Math.min(100 - leftPct, (t.duration_days / projectDurationDays) * 100));
              const isCompleted = t.status === "COMPLETED";
              const isCritical = t.is_critical_path;

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className={`p-3 rounded-xl border transition cursor-pointer space-y-2 ${
                    isSelected
                      ? "border-cyan-500/50 bg-cyan-950/20 shadow-md shadow-cyan-950/30"
                      : "border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-cyan-400">{t.wbs_code}</span>
                      <strong className="text-white">{t.task_name}</strong>
                      {isCritical && (
                        <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-400 border border-rose-800/50 text-[9px] font-mono font-bold uppercase">
                          Critical
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[11px] text-zinc-400">
                      <span>{t.duration_days} Days</span>
                      <span className="text-white font-bold">{t.progress_pct}%</span>
                      {t.variance_days > 0 ? (
                        <span className="text-amber-400 font-bold">+{t.variance_days}d lag</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">0d</span>
                      )}
                    </div>
                  </div>

                  {/* VISUAL TIMELINE BAR */}
                  <div className="w-full h-3 rounded-full bg-zinc-800/80 relative overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 relative ${
                        isCompleted
                          ? "bg-emerald-500"
                          : isCritical
                          ? "bg-rose-500 shadow-md shadow-rose-950/50"
                          : "bg-cyan-500"
                      }`}
                      style={{
                        marginLeft: `${leftPct}%`,
                        width: `${widthPct}%`,
                      }}
                    >
                      {/* Inner progress fill */}
                      <div
                        className="h-full bg-white/30 rounded-full"
                        style={{ width: `${t.progress_pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: TASK INSPECTION (6 cols) vs WBS MILESTONE LOG (6 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: TASK INSPECTION & UPDATE (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Task Control Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">
                  WBS {selectedTask.wbs_code}: {selectedTask.task_name}
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                selectedTask.status === "COMPLETED"
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : selectedTask.is_critical_path
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                  : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
              }`}>
                {selectedTask.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>Contractor: <strong className="text-white block">{selectedTask.contractor_name}</strong></div>
                <div>Trade Package: <strong className="text-zinc-300 block">{selectedTask.trade_package}</strong></div>
              </div>
              <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2">
                <div>Baseline Finish: <strong className="text-zinc-200 block">{selectedTask.baseline_finish_date}</strong></div>
                <div>Projected Finish: <strong className={selectedTask.variance_days > 0 ? "text-amber-400 block" : "text-emerald-400 block"}>{selectedTask.actual_finish_date}</strong></div>
              </div>
            </div>

            {/* CRITICAL PATH & FLOAT SUMMARY */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Total Float (Slack):</span>
                <strong className={selectedTask.total_float_days === 0 ? "text-rose-400" : "text-emerald-400"}>
                  {selectedTask.total_float_days} Days ({selectedTask.is_critical_path ? "Critical Path Constraint" : "Free Float Available"})
                </strong>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
                <span className="text-zinc-400">Schedule Variance:</span>
                <strong className={selectedTask.variance_days > 0 ? "text-amber-400" : "text-emerald-400"}>
                  {selectedTask.variance_days > 0 ? `+${selectedTask.variance_days} Days Lag` : "On Schedule"}
                </strong>
              </div>
            </div>

            {/* QUICK PROGRESS SLIDER BUTTONS */}
            <div className="space-y-2 pt-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Quick Update Physical Progress:
              </span>
              <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    disabled={actionInProgress === selectedTask.id}
                    onClick={() => handleUpdateProgress(selectedTask.id, pct)}
                    className={`py-2 rounded-xl font-bold transition ${
                      selectedTask.progress_pct === pct
                        ? "bg-cyan-500 text-zinc-950 shadow-md"
                        : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              FIDIC Clause 8.3 Programme of Work &amp; CPM Control
            </div>
          </div>

          {/* RIGHT: WBS MILESTONE TABLE (6 cols) */}
          <div className="lg:col-span-6 rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
            <div className="border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Work Breakdown Structure
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">WBS Milestone Schedule</h3>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredTasks.length} Work Packages</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-900/60 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">WBS</th>
                    <th className="px-4 py-3">Task Name</th>
                    <th className="px-4 py-3 text-center">Duration</th>
                    <th className="px-4 py-3 text-right">Progress</th>
                    <th className="px-4 py-3 text-right">Variance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                  {filteredTasks.map((t) => {
                    const isSelected = selectedTask.id === t.id;

                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className={`cursor-pointer transition ${
                          isSelected
                            ? "bg-cyan-950/40 border-l-2 border-l-cyan-400 text-white font-bold"
                            : "hover:bg-zinc-900/30"
                        }`}
                      >
                        <td className="px-4 py-3 text-cyan-400 font-bold">{t.wbs_code}</td>
                        <td className="px-4 py-3 font-sans">
                          <strong className="text-white block">{t.task_name}</strong>
                          <span className="text-[10px] text-zinc-500">{t.contractor_name}</span>
                        </td>
                        <td className="px-4 py-3 text-center text-zinc-400">{t.duration_days}d</td>
                        <td className="px-4 py-3 text-right font-bold text-white">{t.progress_pct}%</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${t.variance_days > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                            {t.variance_days > 0 ? `+${t.variance_days}d` : "0d"}
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

      </div>
    </main>
  );
}