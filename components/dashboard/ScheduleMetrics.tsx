"use client";

import { useMemo } from "react";
import type { ProjectScheduleTask } from "@/types/construction";

export function ScheduleMetrics({ tasks }: { tasks: ProjectScheduleTask[] }) {
  const metrics = useMemo(() => {
    const planned = tasks.reduce((sum, task) => sum + task.plannedValue, 0);
    const earned = tasks.reduce((sum, task) => sum + task.earnedValue, 0);
    const actual = tasks.reduce((sum, task) => sum + task.actualCost, 0);
    const spi = planned ? earned / planned : 0;
    const cpi = actual ? earned / actual : 0;
    const critical = tasks.filter((task) => task.criticalPath);
    const scheduleVariance = critical.reduce((sum, task) => {
      const end = new Date(task.actualFinish ?? (task.completionPercent >= 100 ? task.baselineFinish : new Date().toISOString())).getTime();
      return sum + Math.round((end - new Date(task.baselineFinish).getTime()) / 86400000);
    }, 0);
    return { spi, cpi, scheduleVariance };
  }, [tasks]);

  const hasBaseline = metrics.spi !== 0 || metrics.cpi !== 0;
  const spiLabel = !hasBaseline ? "Baseline Pending" : metrics.spi >= 1 ? "On Track" : `${Math.round((1 - metrics.spi) * 100)}% Behind Baseline`;
  const varianceLabel = metrics.scheduleVariance > 0 ? `${metrics.scheduleVariance} Days Behind` : metrics.scheduleVariance < 0 ? `${Math.abs(metrics.scheduleVariance)} Days Ahead` : "On Baseline";

  return <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}><MetricDial label="Schedule Performance Index" value={!hasBaseline ? "—" : metrics.spi.toFixed(2)} detail={spiLabel} tone={!hasBaseline ? "neutral" : metrics.spi >= 1 ? "good" : "warn"} /><MetricDial label="Cost Performance Index" value={!hasBaseline ? "—" : metrics.cpi.toFixed(2)} detail={!hasBaseline ? "Baseline Pending" : `CPI: ${metrics.cpi.toFixed(2)} - ${metrics.cpi >= 1 ? "Cost efficient" : "Cost pressure"}`} tone={!hasBaseline ? "neutral" : metrics.cpi >= 1 ? "good" : "warn"} /><MetricDial label="Schedule Variance" value={metrics.scheduleVariance === 0 ? "0d" : `${metrics.scheduleVariance > 0 ? "+" : "-"}${Math.abs(metrics.scheduleVariance)}d`} detail={varianceLabel} tone={metrics.scheduleVariance <= 0 ? "good" : "risk"} /></section>;
}

function MetricDial({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: "good" | "warn" | "risk" | "neutral" }) {
  const color = tone === "good" ? "#86efac" : tone === "warn" ? "#fde68a" : tone === "risk" ? "#fca5a5" : "#a1a1aa";
  return <div style={{ background: "#111827", border: "1px solid #1e293b", borderRadius: 16, padding: 16 }}><div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>{label}</div><div style={{ marginTop: 10, fontSize: 32, fontWeight: 900, color }}>{value}</div><div style={{ marginTop: 6, color, fontSize: 12 }}>{detail}</div></div>;
}
