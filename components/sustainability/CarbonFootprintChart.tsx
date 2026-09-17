"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CarbonTelemetryEntry } from "@/types/construction";

export function CarbonFootprintChart({ entries, areaM2 }: { entries: CarbonTelemetryEntry[]; areaM2: number }) {
  const scopes = (["Scope 1", "Scope 2", "Scope 3"] as const).map((scope) => ({ scope, tonnes: entries.filter((entry) => entry.scope === scope).reduce((total, entry) => total + entry.quantity * entry.emissionFactor / 1000, 0) }));
  const totalTonnes = scopes.reduce((total, entry) => total + entry.tonnes, 0);
  const intensity = areaM2 > 0 ? totalTonnes * 1000 / areaM2 : 0;
  const chartData = [{ name: "Current design", intensity }, { name: "Standard RCC frame", intensity: 450 }];
  return <div style={{ display: "grid", gap: 16 }}><div style={{ height: 280 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={scopes}><CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false}/><XAxis dataKey="scope" tick={{ fill: "#cbd5e1" }}/><YAxis tick={{ fill: "#cbd5e1" }} /><Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}/><Legend/><Bar dataKey="tonnes" name="tCO2e" fill="#34d399" radius={[5, 5, 0, 0]}/></BarChart></ResponsiveContainer></div><div><div style={label}>Carbon intensity benchmark / kg CO2e per m2</div><div style={{ height: 220 }}><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData} layout="vertical" margin={{ left: 20, right: 20 }}><CartesianGrid stroke="rgba(148,163,184,.12)" horizontal={false}/><XAxis type="number" tick={{ fill: "#cbd5e1" }}/><YAxis type="category" dataKey="name" width={125} tick={{ fill: "#cbd5e1", fontSize: 11 }}/><Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}/><Bar dataKey="intensity" name="kg CO2e/m2" fill="#38bdf8" radius={[0, 5, 5, 0]}/><Line dataKey="intensity" stroke="#f59e0b" strokeDasharray="5 5"/></BarChart></ResponsiveContainer></div></div><div style={summary}><strong>{intensity.toFixed(1)} kg CO2e/m2</strong><span style={{ color: intensity <= 450 ? "#86efac" : "#fbbf24" }}>{intensity <= 450 ? "Below industry baseline" : "Above industry baseline"} · baseline 450 kg CO2e/m2</span></div></div>;
}
const label = { color: "#94a3b8", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase" as const };
const summary = { display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" as const, borderTop: "1px solid #1f2937", paddingTop: 14, fontSize: 13 };