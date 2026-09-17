"use client";

import { useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CarbonTelemetryEntry } from "@/types/construction";

export const carbonTotal = (entries: CarbonTelemetryEntry[]) => entries.reduce((sum, entry) => sum + entry.quantity * entry.emissionFactor / 1000, 0);

export function CarbonTelemetryChart({ entries }: { entries: CarbonTelemetryEntry[] }) {
  const [scope, setScope] = useState<"All" | CarbonTelemetryEntry["scope"]>("All");
  const filtered = scope === "All" ? entries : entries.filter((entry) => entry.scope === scope);
  const grouped = ["Scope 1", "Scope 2", "Scope 3"].map((name) => ({ name, tonnes: entries.filter((entry) => entry.scope === name).reduce((sum, entry) => sum + entry.quantity * entry.emissionFactor / 1000, 0), target: 420 }));
  return <div style={{ display: "grid", gap: 14 }}><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(["All", "Scope 1", "Scope 2", "Scope 3"] as const).map((value) => <button type="button" key={value} onClick={() => setScope(value)} style={{ ...buttonStyle, opacity: scope === value ? 1 : 0.65 }}>{value}</button>)}</div><div style={{ height: 300 }}><ResponsiveContainer><ComposedChart data={grouped}><CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} /><XAxis dataKey="name" tick={{ fill: "#cbd5e1" }} /><YAxis tick={{ fill: "#cbd5e1" }} /><Tooltip contentStyle={tooltipStyle} /><Legend /><Bar dataKey="tonnes" name="Cumulative tCO2e" fill="#22d3ee" /><Line dataKey="target" name="Benchmark reference" stroke="#fbbf24" strokeDasharray="5 5" /></ComposedChart></ResponsiveContainer></div><div style={{ color: "#94a3b8", fontSize: 12 }}>Showing {filtered.length} logged entries. Green building benchmark: &lt; 420 kg CO2e / m2.</div></div>;
}
const buttonStyle = { border: "1px solid rgba(103,232,249,0.35)", background: "rgba(34,211,238,0.1)", color: "#cffafe", borderRadius: 9, padding: "8px 12px", cursor: "pointer", fontWeight: 700 };
const tooltipStyle = { background: "#0f172a", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 10, color: "#f8fafc" };
