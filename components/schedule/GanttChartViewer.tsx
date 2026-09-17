"use client";

import { useMemo, useState } from "react";
import { updateProjectTask } from "@/app/lib/services";
import type { ProjectScheduleTask } from "@/types/construction";

const disciplines: Array<ProjectScheduleTask["discipline"] | "All"> = ["All", "Civil", "Structural", "MEP", "Finishes"];

export function GanttChartViewer({ initialTasks }: { initialTasks: ProjectScheduleTask[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [discipline, setDiscipline] = useState<(typeof disciplines)[number]>("All");
  const [editing, setEditing] = useState<ProjectScheduleTask | null>(null);
  const [percent, setPercent] = useState(0);
  const [finish, setFinish] = useState("");
  const visible = useMemo(() => discipline === "All" ? tasks : tasks.filter((task) => task.discipline === discipline), [discipline, tasks]);
  const rangeStart = new Date("2026-04-01").getTime();
  const rangeEnd = new Date("2026-11-01").getTime();
  const range = rangeEnd - rangeStart;
  const variance = tasks.filter((task) => task.criticalPath).reduce((sum, task) => sum + Math.round((new Date(task.actualFinish ?? (task.completionPercent >= 100 ? task.baselineFinish : new Date().toISOString())).getTime() - new Date(task.baselineFinish).getTime()) / 86400000), 0);

  const openEdit = (task: ProjectScheduleTask) => { setEditing(task); setPercent(task.completionPercent); setFinish(task.actualFinish ?? ""); };
  const save = async () => { if (!editing) return; const updated = await updateProjectTask(editing.id, { completionPercent: percent, actualFinish: finish || undefined, status: percent >= 100 ? "Complete" : percent > 0 ? "In Progress" : "Not Started" }); if (updated) setTasks((current) => current.map((task) => task.id === updated.id ? updated : task)); setEditing(null); };

  return <div style={{ display: "grid", gap: 18 }}><div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{disciplines.map((item) => <button type="button" key={item} onClick={() => setDiscipline(item)} style={{ ...filterButton, background: discipline === item ? "#0ea5e9" : "rgba(255,255,255,0.04)", color: discipline === item ? "#082f49" : "#cbd5e1" }}>{item}</button>)}<span style={{ marginLeft: "auto", color: variance > 0 ? "#fca5a5" : "#86efac", fontSize: 13, fontWeight: 700 }}>{variance > 0 ? `${variance} days behind` : variance < 0 ? `${Math.abs(variance)} days ahead` : "On baseline"}</span></div><div style={{ overflowX: "auto", border: "1px solid #1e293b", borderRadius: 16 }}><div style={{ minWidth: 980 }}><div style={{ display: "grid", gridTemplateColumns: "280px 1fr", background: "#111827", color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em" }}><div style={headCell}>WBS / Task</div><div style={{ ...headCell, display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>{["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"].map((month) => <span key={month}>{month}</span>)}</div></div>{visible.map((task) => { const left = Math.max(0, ((new Date(task.baselineStart).getTime() - rangeStart) / range) * 100); const width = Math.max(2, ((new Date(task.baselineFinish).getTime() - new Date(task.baselineStart).getTime()) / range) * 100); return <button type="button" key={task.id} onClick={() => openEdit(task)} style={taskRow}><div style={{ padding: "13px 14px", paddingLeft: task.parentId ? 30 : 14 }}><div style={{ color: "#94a3b8", fontSize: 11 }}>{task.wbsCode} · {task.discipline}</div><div style={{ marginTop: 4, color: "#f8fafc", fontWeight: 700 }}>{task.title}</div></div><div style={{ position: "relative", height: 58, borderLeft: "1px solid #1e293b", background: "repeating-linear-gradient(90deg, transparent 0, transparent calc(14.28% - 1px), rgba(148,163,184,0.1) 14.28%)" }}><div style={{ position: "absolute", left: `${left}%`, width: `${width}%`, top: 20, height: 18, borderRadius: 7, background: task.criticalPath ? "#dc2626" : "#2563eb", boxShadow: task.criticalPath ? "0 0 12px rgba(239,68,68,0.5)" : "none" }}><div style={{ width: `${task.completionPercent}%`, height: "100%", borderRadius: 7, background: task.criticalPath ? "#f59e0b" : "#67e8f9" }} /><span style={{ position: "absolute", left: "100%", marginLeft: 8, top: 1, color: "#cbd5e1", fontSize: 11, whiteSpace: "nowrap" }}>{task.completionPercent}%</span></div></div></button>; })}</div></div>{editing && <div style={overlayStyle}><div style={modalStyle}><div style={headerStyle}><div><div style={eyebrowStyle}>Update schedule task</div><h2 style={{ margin: "6px 0 0", fontSize: 23 }}>{editing.title}</h2></div><button type="button" onClick={() => setEditing(null)} style={closeButton}>×</button></div><label style={labelStyle}>Completion percentage<input type="range" min="0" max="100" value={percent} onChange={(event) => setPercent(Number(event.target.value))} /><strong style={{ color: "#7dd3fc" }}>{percent}%</strong></label><label style={labelStyle}>Actual finish date<input type="date" value={finish} onChange={(event) => setFinish(event.target.value)} style={inputStyle} /></label><div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" onClick={() => void save()} style={primaryButton}>Sync task update</button></div></div></div>}</div>;
}

const filterButton = { border: "1px solid rgba(148,163,184,0.2)", borderRadius: 999, padding: "9px 12px", cursor: "pointer" };
const headCell = { padding: "13px 14px", borderBottom: "1px solid #1e293b" };
const taskRow = { width: "100%", display: "grid", gridTemplateColumns: "280px 1fr", padding: 0, textAlign: "left" as const, color: "#e2e8f0", background: "#0b1220", border: 0, borderBottom: "1px solid #1e293b", cursor: "pointer" };
const overlayStyle = { position: "fixed" as const, inset: 0, zIndex: 100, display: "grid", placeItems: "center", background: "rgba(2,6,23,0.8)", padding: 20 };
const modalStyle = { width: "min(520px, 100%)", background: "#0b1220", border: "1px solid #334155", borderRadius: 20, padding: 22, color: "#e2e8f0", display: "grid", gap: 18 };
const headerStyle = { display: "flex", justifyContent: "space-between", gap: 12 };
const eyebrowStyle = { color: "#7dd3fc", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" as const };
const closeButton = { width: 34, height: 34, borderRadius: 999, border: "1px solid #334155", background: "transparent", color: "#f8fafc", cursor: "pointer", fontSize: 20 };
const labelStyle = { display: "grid", gap: 8, color: "#cbd5e1", fontSize: 12 };
const inputStyle = { border: "1px solid #334155", borderRadius: 9, background: "#111827", color: "#f8fafc", padding: "10px" };
const primaryButton = { border: 0, borderRadius: 10, background: "#2563eb", color: "#eff6ff", padding: "10px 14px", fontWeight: 700, cursor: "pointer" };
