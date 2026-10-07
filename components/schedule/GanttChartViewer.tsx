"use client";

import React, { useState, useMemo, useTransition } from "react";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Layers,
  Activity,
  X,
  Loader2,
  AlertOctagon,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { updateProjectTask } from "@/app/lib/services";
import type { ProjectScheduleTask } from "@/types/construction";

// ---------------------------------------------------------------------------
// Extended CPM Task Interface
// ---------------------------------------------------------------------------

export interface CPMVisualTask extends ProjectScheduleTask {
  totalFloatDays?: number;
  freeFloatDays?: number;
  earlyStartDay?: number;
  earlyFinishDay?: number;
  lateStartDay?: number;
  lateFinishDay?: number;
  isCritical?: boolean;
}

export interface GanttChartViewerProps {
  initialTasks: (ProjectScheduleTask | CPMVisualTask)[];
  projectId?: string;
  onRefreshSchedule?: () => Promise<void> | void;
}

const DISCIPLINES = ["All", "Civil", "Structural", "MEP", "Finishes"] as const;
type DisciplineFilter = (typeof DISCIPLINES)[number];

// ---------------------------------------------------------------------------
// Component: GanttChartViewer
// ---------------------------------------------------------------------------

export function GanttChartViewer({
  initialTasks = [],
  projectId = "GOMTI-NAGAR-PH1-FITOUT",
  onRefreshSchedule,
}: GanttChartViewerProps) {
  const [tasks, setTasks] = useState<CPMVisualTask[]>(initialTasks as CPMVisualTask[]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<DisciplineFilter>("All");
  const [criticalOnly, setCriticalOnly] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  // Task Editing & Hindrance State
  const [editingTask, setEditingTask] = useState<CPMVisualTask | null>(null);
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [actualFinishDate, setActualFinishDate] = useState<string>("");

  // Delay / Hindrance Logging Form inside Edit Modal
  const [isLoggingHindrance, setIsLoggingHindrance] = useState(false);
  const [hindranceCategory, setHindranceCategory] = useState("CLIENT_DRAWING_DELAY");
  const [delayDays, setDelayDays] = useState("3");
  const [hindranceReason, setHindranceReason] = useState("");
  const [hindranceNotice, setHindranceNotice] = useState<string | null>(null);

  // Filter tasks based on discipline and critical path toggle
  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchDiscipline =
        selectedDiscipline === "All" || task.discipline === selectedDiscipline;
      const isCritical =
        task.isCritical ??
        task.criticalPath ??
        (task.totalFloatDays !== undefined && task.totalFloatDays <= 0);
      const matchCritical = criticalOnly ? isCritical : true;
      return matchDiscipline && matchCritical;
    });
  }, [tasks, selectedDiscipline, criticalOnly]);

  // Dynamic Timeline Range Calculation
  const { minTimestamp, maxTimestamp, totalTimespanMs, timelineMonths } = useMemo(() => {
    if (tasks.length === 0) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      const end = new Date(now.getFullYear(), now.getMonth() + 6, 1).getTime();
      return {
        minTimestamp: start,
        maxTimestamp: end,
        totalTimespanMs: end - start,
        timelineMonths: [],
      };
    }

    let min = Infinity;
    let max = -Infinity;

    tasks.forEach((t) => {
      const start = new Date(t.baselineStart || Date.now()).getTime();
      const finish = new Date(
        t.actualFinish || t.baselineFinish || Date.now() + 86400000 * 30
      ).getTime();

      if (start < min) min = start;
      if (finish > max) max = finish;
    });

    // Pad 7 days before start and 14 days after finish
    const paddedMin = min - 7 * 86400000;
    const paddedMax = max + 14 * 86400000;
    const timespan = Math.max(86400000, paddedMax - paddedMin);

    // Compute month intervals across range
    const months: { label: string; leftPercent: number; widthPercent: number }[] = [];
    const startDate = new Date(paddedMin);
    const endDate = new Date(paddedMax);

    let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (current.getTime() < endDate.getTime()) {
      const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      const mStart = Math.max(paddedMin, current.getTime());
      const mEnd = Math.min(paddedMax, nextMonth.getTime());

      if (mEnd > mStart) {
        const leftPercent = ((mStart - paddedMin) / timespan) * 100;
        const widthPercent = ((mEnd - mStart) / timespan) * 100;
        months.push({
          label: current.toLocaleString("default", { month: "short", year: "2-digit" }),
          leftPercent,
          widthPercent,
        });
      }
      current = nextMonth;
    }

    return {
      minTimestamp: paddedMin,
      maxTimestamp: paddedMax,
      totalTimespanMs: timespan,
      timelineMonths: months,
    };
  }, [tasks]);

  // Today marker percentage calculation
  const todayMarkerPercent = useMemo(() => {
    const now = Date.now();
    if (now < minTimestamp || now > maxTimestamp) return null;
    return ((now - minTimestamp) / totalTimespanMs) * 100;
  }, [minTimestamp, maxTimestamp, totalTimespanMs]);

  // Critical Path Health & Cumulative Variance
  const { criticalCount, cumulativeVarianceDays } = useMemo(() => {
    let crit = 0;
    let variance = 0;

    tasks.forEach((t) => {
      const isCritical =
        t.isCritical ??
        t.criticalPath ??
        (t.totalFloatDays !== undefined && t.totalFloatDays <= 0);

      if (isCritical) {
        crit++;
        const finish = t.actualFinish
          ? new Date(t.actualFinish).getTime()
          : t.completionPercent >= 100
            ? new Date(t.baselineFinish).getTime()
            : Date.now();
        const baseline = new Date(t.baselineFinish).getTime();
        variance += Math.round((finish - baseline) / 86400000);
      }
    });

    return { criticalCount: crit, cumulativeVarianceDays: variance };
  }, [tasks]);

  // Modal Handlers
  const handleOpenEdit = (task: CPMVisualTask) => {
    setEditingTask(task);
    setProgressPercent(task.completionPercent || 0);
    setActualFinishDate(task.actualFinish || "");
    setIsLoggingHindrance(false);
    setHindranceNotice(null);
  };

  const handleSaveProgress = () => {
    if (!editingTask) return;

    startTransition(async () => {
      const nextStatus =
        progressPercent >= 100
          ? "Complete"
          : progressPercent > 0
            ? "In Progress"
            : "Not Started";

      const updated = await updateProjectTask(editingTask.id, {
        completionPercent: progressPercent,
        actualFinish: actualFinishDate || undefined,
        status: nextStatus,
      });

      if (updated) {
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? { ...t, ...updated } : t))
        );
      }
      setEditingTask(null);
    });
  };

  const handleDispatchHindrance = async () => {
    if (!editingTask || !hindranceReason.trim()) return;

    startTransition(async () => {
      try {
        const { ChronosAgent } = await import("@/lib/agents/chronos");
        const assessment = await ChronosAgent.assessHindranceImpact({
          projectId,
          hindranceId: `HND-${Date.now().toString(36)}`,
          affectedTaskId: editingTask.wbsCode || editingTask.id,
          delayDays: parseFloat(delayDays) || 1,
          hindranceCategory,
          causeDescription: hindranceReason.trim(),
        });

        setHindranceNotice(
          `Chronos Logged: ${assessment.hindranceNumber}. Total float consumed: ${assessment.consumedFloatDays}d. Critical Path Impact: ${assessment.criticalPathImpacted ? "YES (Notice Served)" : "NO"
          }.`
        );

        if (onRefreshSchedule) {
          await onRefreshSchedule();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to record hindrance";
        setHindranceNotice(`Chronos Assessment Error: ${msg}`);
      }
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 font-mono text-xs select-none">
      {/* HEADER CONTROLS */}
      <div className="p-4 border-b border-zinc-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
            <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-bold">
              CHRONOS CPM NETWORK ENGINE • MASTER CONSTRUCTION SCHEDULE
            </span>
          </div>
          <h2 className="text-base font-bold text-zinc-100 mt-0.5 flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <span>Interactive CPM Gantt &amp; Float Ledger</span>
          </h2>
        </div>

        {/* METRICS & FILTERS */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Discipline Badges */}
          <div className="flex items-center bg-zinc-950 border border-zinc-800 p-0.5">
            {DISCIPLINES.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setSelectedDiscipline(item)}
                className={`px-2.5 py-1 text-[11px] font-bold uppercase transition-colors cursor-pointer ${selectedDiscipline === item
                    ? "bg-zinc-800 text-cyan-400"
                    : "text-zinc-500 hover:text-zinc-300"
                  }`}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Critical Path Toggle */}
          <button
            type="button"
            onClick={() => setCriticalOnly(!criticalOnly)}
            className={`px-3 py-1.5 border text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${criticalOnly
                ? "bg-rose-950/60 border-rose-800 text-rose-300"
                : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
          >
            <AlertOctagon className="h-3.5 w-3.5 text-rose-500" />
            <span>Critical Only ({criticalCount})</span>
          </button>

          {/* Variance Status Pill */}
          <div
            className={`px-3 py-1.5 border text-[11px] font-bold uppercase tracking-wider ${cumulativeVarianceDays > 0
                ? "bg-rose-950/50 border-rose-800 text-rose-400"
                : cumulativeVarianceDays < 0
                  ? "bg-emerald-950/50 border-emerald-800 text-emerald-400"
                  : "bg-zinc-950 border-zinc-800 text-zinc-400"
              }`}
          >
            {cumulativeVarianceDays > 0
              ? `${cumulativeVarianceDays} Days Behind Baseline`
              : cumulativeVarianceDays < 0
                ? `${Math.abs(cumulativeVarianceDays)} Days Ahead`
                : "On Schedule Baseline"}
          </div>
        </div>
      </div>

      {/* GANTT TIMELINE CANVAS */}
      <div className="overflow-x-auto">
        <div className="min-w-[1100px]">
          {/* Calendar Months Header */}
          <div className="grid grid-cols-[340px_1fr] bg-zinc-950/90 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider">
            <div className="p-3 border-r border-zinc-800 font-bold flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5 text-zinc-500" />
              <span>WBS Node / Activity Name</span>
            </div>
            <div className="relative h-10 flex items-center">
              {timelineMonths.map((m, idx) => (
                <div
                  key={idx}
                  style={{ left: `${m.leftPercent}%`, width: `${m.widthPercent}%` }}
                  className="absolute border-r border-zinc-800/80 px-2 text-zinc-400 truncate text-center"
                >
                  {m.label}
                </div>
              ))}
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-zinc-800/50">
            {visibleTasks.length === 0 ? (
              <div className="py-12 text-center text-zinc-600 font-sans text-xs">
                Zero schedule activities matching the selected filter criteria.
              </div>
            ) : (
              visibleTasks.map((task) => {
                const isCritical =
                  task.isCritical ??
                  task.criticalPath ??
                  (task.totalFloatDays !== undefined && task.totalFloatDays <= 0);

                const startMs = new Date(task.baselineStart).getTime();
                const finishMs = new Date(task.baselineFinish).getTime();

                const leftPercent = Math.max(
                  0,
                  ((startMs - minTimestamp) / totalTimespanMs) * 100
                );
                const widthPercent = Math.max(
                  1.5,
                  ((finishMs - startMs) / totalTimespanMs) * 100
                );

                // Total Float Buffer Visualization
                const floatDays = task.totalFloatDays ?? (isCritical ? 0 : 5);
                const floatWidthPercent = Math.max(
                  0,
                  ((floatDays * 86400000) / totalTimespanMs) * 100
                );

                return (
                  <div
                    key={task.id}
                    onClick={() => handleOpenEdit(task)}
                    className="grid grid-cols-[340px_1fr] hover:bg-zinc-800/30 transition-colors cursor-pointer group"
                  >
                    {/* Activity WBS & Name */}
                    <div className="p-3 border-r border-zinc-800/80 flex items-center justify-between gap-2 overflow-hidden">
                      <div className="truncate">
                        <div className="text-[10px] text-zinc-500 flex items-center gap-1.5">
                          <span className="font-bold text-zinc-400">{task.wbsCode}</span>
                          <span>•</span>
                          <span className="text-zinc-500">{task.discipline}</span>
                          {isCritical && (
                            <span className="px-1 py-0.2 bg-rose-950/80 border border-rose-800 text-rose-400 font-bold text-[9px]">
                              CRITICAL
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-zinc-200 mt-0.5 truncate group-hover:text-cyan-300 transition-colors">
                          {task.title}
                        </div>
                      </div>

                      {/* Float Pill */}
                      <div className="shrink-0 text-right">
                        <span
                          className={`text-[10px] px-1.5 py-0.5 border font-bold tabular-nums ${isCritical
                              ? "bg-rose-950/50 border-rose-800 text-rose-400"
                              : "bg-zinc-950 border-zinc-800 text-zinc-400"
                            }`}
                        >
                          TF: {floatDays}d
                        </span>
                      </div>
                    </div>

                    {/* Gantt Bar Lane */}
                    <div className="relative h-14 flex items-center bg-zinc-950/30">
                      {/* Grid Guide Marks */}
                      {timelineMonths.map((m, idx) => (
                        <div
                          key={idx}
                          style={{ left: `${m.leftPercent}%` }}
                          className="absolute inset-y-0 border-r border-zinc-800/30 pointer-events-none"
                        />
                      ))}

                      {/* Today Vertical Line Marker */}
                      {todayMarkerPercent !== null && (
                        <div
                          style={{ left: `${todayMarkerPercent}%` }}
                          className="absolute inset-y-0 w-px bg-amber-500/60 z-10 pointer-events-none"
                        />
                      )}

                      {/* Total Float Buffer (Dashed Indicator) */}
                      {!isCritical && floatWidthPercent > 0 && (
                        <div
                          style={{
                            left: `${leftPercent + widthPercent}%`,
                            width: `${floatWidthPercent}%`,
                          }}
                          className="absolute h-4 border-t border-b border-dashed border-zinc-700/60 bg-zinc-800/20 top-5 pointer-events-none"
                        />
                      )}

                      {/* Planned/Actual Gantt Bar */}
                      <div
                        style={{ left: `${leftPercent}%`, width: `${widthPercent}%` }}
                        className={`absolute h-5 border transition-all ${isCritical
                            ? "bg-rose-950/90 border-rose-600 shadow-[0_0_10px_rgba(225,29,72,0.35)]"
                            : "bg-sky-950/80 border-sky-600"
                          }`}
                      >
                        {/* Progress Fill */}
                        <div
                          style={{ width: `${task.completionPercent}%` }}
                          className={`h-full transition-all ${isCritical ? "bg-rose-600" : "bg-sky-500"
                            }`}
                        />

                        {/* Progress Label */}
                        <span className="absolute left-full ml-2 top-0.5 text-[10px] text-zinc-300 font-bold tabular-nums whitespace-nowrap">
                          {task.completionPercent}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* FOOTER LEGEND */}
      <div className="p-3 bg-zinc-950 border-t border-zinc-800 text-[10px] text-zinc-500 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-5 bg-rose-600 border border-rose-500 inline-block" />
            <span className="text-zinc-300 font-bold">Critical Path (Total Float ≤ 0d)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-5 bg-sky-500 border border-sky-400 inline-block" />
            <span className="text-zinc-400">Non-Critical Activity</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-4 border-t border-b border-dashed border-zinc-500 inline-block" />
            <span>Available Total Float Buffer</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-1 bg-amber-500 inline-block" />
            <span>Today Telemetry Line</span>
          </div>
        </div>

        <div className="text-zinc-400">
          Total Displayed Activities: <strong className="text-zinc-200">{visibleTasks.length}</strong>
        </div>
      </div>

      {/* MODAL: Update Activity & Log Hindrance */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 p-6 shadow-2xl text-xs space-y-4">
            <div className="flex items-start justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                  Update Schedule Node • {editingTask.wbsCode}
                </span>
                <h3 className="text-sm font-bold text-zinc-100 mt-0.5">{editingTask.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-zinc-500 hover:text-zinc-300 p-1 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {hindranceNotice && (
              <div className="p-3 bg-cyan-950/70 border border-cyan-800 text-cyan-300 text-[11px] flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
                <span>{hindranceNotice}</span>
              </div>
            )}

            {/* Progress Update Controls */}
            <div className="space-y-3 bg-zinc-950/60 p-3.5 border border-zinc-800/80">
              <label className="block text-zinc-400 text-[11px]">
                Completion Progress: <strong className="text-cyan-400 font-bold">{progressPercent}%</strong>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={progressPercent}
                onChange={(e) => setProgressPercent(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />

              <div className="pt-2">
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Actual Finish Date (Optional)
                </label>
                <input
                  type="date"
                  value={actualFinishDate}
                  onChange={(e) => setActualFinishDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 outline-none"
                />
              </div>
            </div>

            {/* Toggle: Contemporaneous Delay Hindrance */}
            <div className="border border-zinc-800 p-3 bg-zinc-950/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-zinc-300 uppercase flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  <span>Log Contemporaneous Delay / Hindrance</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsLoggingHindrance(!isLoggingHindrance)}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 uppercase font-bold"
                >
                  {isLoggingHindrance ? "Collapse" : "+ Expand"}
                </button>
              </div>

              {isLoggingHindrance && (
                <div className="space-y-2.5 pt-2 border-t border-zinc-800">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase mb-1">
                        Hindrance Cause
                      </label>
                      <select
                        value={hindranceCategory}
                        onChange={(e) => setHindranceCategory(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-200 outline-none"
                      >
                        <option value="CLIENT_DRAWING_DELAY">Client Drawing / RFI Delay</option>
                        <option value="UNWORKABLE_WEATHER">Adverse Weather / Rain</option>
                        <option value="SITE_ACCESS_DENIAL">Site Access Denial</option>
                        <option value="MATERIAL_SHORTAGE">Supply Chain Stockout</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] text-zinc-500 uppercase mb-1">
                        Days Hindered
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={delayDays}
                        onChange={(e) => setDelayDays(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-zinc-200 outline-none tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-zinc-500 uppercase mb-1">
                      Event Description &amp; Root Cause
                    </label>
                    <textarea
                      rows={2}
                      value={hindranceReason}
                      onChange={(e) => setHindranceReason(e.target.value)}
                      placeholder="e.g. Structural revision drawing delayed by consultant..."
                      className="w-full bg-zinc-900 border border-zinc-800 p-2 text-zinc-200 outline-none text-xs"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={isPending || !hindranceReason.trim()}
                    onClick={handleDispatchHindrance}
                    className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold uppercase text-[10px] transition-colors"
                  >
                    Assess Delay with Chronos &amp; Seal Notice
                  </button>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                disabled={isPending}
                className="px-3.5 py-1.5 border border-zinc-700 text-zinc-300 hover:text-zinc-100 uppercase text-xs"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleSaveProgress}
                disabled={isPending}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase text-xs flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Sync Task Update</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GanttChartViewer;