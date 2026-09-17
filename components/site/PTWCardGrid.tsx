"use client";

import { useEffect, useState } from "react";
import { updatePermitStatus } from "@/app/lib/services";
import type { PermitToWork, PTWStatus } from "@/types/construction";

const typeColors: Record<PermitToWork["type"], string> = { "Hot Work": "#ef4444", "Work at Height": "#f59e0b", "Confined Space": "#a855f7", "Crane / Lifting": "#3b82f6" };

export function PTWCardGrid({ initialPermits }: { initialPermits: PermitToWork[] }) {
  const [permits, setPermits] = useState(initialPermits);
  const [, setTick] = useState(0);
  useEffect(() => setPermits(initialPermits), [initialPermits]);
  useEffect(() => { const timer = window.setInterval(() => setTick((value) => value + 1), 1000); return () => window.clearInterval(timer); }, []);

  const transition = async (permit: PermitToWork, status: PTWStatus) => {
    if (status === "Active" && permit.prerequisites.some((item) => !item.completed)) return;
    const updated = await updatePermitStatus(permit.id, status, status === "Suspended" ? { suspendedReason: "Emergency suspension by Safety Officer" } : {});
    if (updated) setPermits((current) => current.map((item) => item.id === updated.id ? updated : item));
  };

  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>{permits.map((permit) => { const remaining = Math.max(0, new Date(permit.expiresAt).getTime() - Date.now()); const hours = Math.floor(remaining / 3600000); const minutes = Math.floor((remaining % 3600000) / 60000); const seconds = Math.floor((remaining % 60000) / 1000); const ready = permit.prerequisites.every((item) => item.completed); return <article key={permit.id} style={{ background: "#0b1220", border: `1px solid ${typeColors[permit.type]}66`, borderTop: `4px solid ${typeColors[permit.type]}`, borderRadius: 18, padding: 18, display: "grid", gap: 14 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={{ color: typeColors[permit.type], fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>{permit.type}</div><h2 style={{ margin: "7px 0 0", fontSize: 20 }}>{permit.title}</h2></div><span style={statusStyle(permit.status)}>{permit.status}</span></div><div style={{ color: "#94a3b8", fontSize: 13 }}>{permit.permitNumber} · {permit.location}</div><div style={{ background: "#111827", borderRadius: 12, padding: 12 }}><div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>Time remaining</div><div style={{ marginTop: 6, fontSize: 28, fontWeight: 800, color: remaining === 0 ? "#fca5a5" : "#f8fafc" }}>{remaining === 0 ? "Expired" : `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}</div></div><div style={{ display: "grid", gap: 7 }}>{permit.prerequisites.map((item) => <div key={item.id} style={{ display: "flex", gap: 8, color: item.completed ? "#bbf7d0" : "#fecaca", fontSize: 12 }}><span>{item.completed ? "✓" : "!"}</span>{item.label}</div>)}</div>{permit.suspendedReason && <div style={{ color: "#fca5a5", fontSize: 12 }}>Suspended: {permit.suspendedReason}</div>}<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{permit.status === "Pending Approval" && <button type="button" disabled={!ready} onClick={() => void transition(permit, "Active")} style={{ ...actionButton, opacity: ready ? 1 : 0.45 }}>Activate permit</button>}{permit.status === "Active" && <button type="button" onClick={() => void transition(permit, "Suspended")} style={{ ...actionButton, background: "#b91c1c" }}>Suspend permit</button>}{permit.status !== "Closed Out" && <button type="button" onClick={() => void transition(permit, "Closed Out")} style={{ ...actionButton, background: "#334155" }}>Close out</button>}</div></article>; })}</div>;
}

function statusStyle(status: PermitToWork["status"]) { return { borderRadius: 999, padding: "6px 9px", fontSize: 10, fontWeight: 700, color: status === "Active" ? "#bbf7d0" : status === "Suspended" ? "#fecaca" : "#fde68a", background: status === "Active" ? "rgba(34,197,94,0.12)" : status === "Suspended" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)", whiteSpace: "nowrap" as const }; }
const actionButton = { border: 0, borderRadius: 9, background: "#2563eb", color: "#eff6ff", padding: "9px 11px", fontSize: 12, fontWeight: 700, cursor: "pointer" };
