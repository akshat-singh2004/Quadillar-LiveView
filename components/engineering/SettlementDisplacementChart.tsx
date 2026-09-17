"use client";

import { useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { GeotechnicalReading, PileLoadReading } from "@/types/construction";

const readings: GeotechnicalReading[] = [
  { time: "06:00", wallDeflectionMm: 8, prismSettlementMm: 4, piezometerLevelM: 2.6 },
  { time: "09:00", wallDeflectionMm: 11, prismSettlementMm: 5, piezometerLevelM: 2.7 },
  { time: "12:00", wallDeflectionMm: 14, prismSettlementMm: 7, piezometerLevelM: 2.8 },
  { time: "15:00", wallDeflectionMm: 17, prismSettlementMm: 9, piezometerLevelM: 2.9 },
  { time: "18:00", wallDeflectionMm: 16, prismSettlementMm: 10, piezometerLevelM: 2.8 },
];
const pileCurve: PileLoadReading[] = [{ loadKN: 0, settlementMm: 0 }, { loadKN: 500, settlementMm: 2 }, { loadKN: 1000, settlementMm: 4 }, { loadKN: 1500, settlementMm: 7 }, { loadKN: 2000, settlementMm: 12 }, { loadKN: 2500, settlementMm: 20 }, { loadKN: 3000, settlementMm: 34 }];

export function SettlementDisplacementChart() {
  const [view, setView] = useState<"movement" | "pile">("movement");
  const latest = readings[readings.length - 1];
  const actionBreaches = readings.filter((item) => item.wallDeflectionMm >= 25 || item.prismSettlementMm >= 20).length;
  const ultimateLoad = pileCurve[pileCurve.length - 1].loadKN;
  const elasticReboundLimit = 10;
  return <section style={panel}><div style={header}><div><div style={eyebrow}>Instrument cluster / 15 min sync</div><h2 style={{ margin: "6px 0 0", fontSize: 22 }}>Settlement & displacement telemetry</h2></div><div style={tabs}><button type="button" onClick={() => setView("movement")} style={view === "movement" ? activeTab : tab}>Movement history</button><button type="button" onClick={() => setView("pile")} style={view === "pile" ? activeTab : tab}>IS 2911 pile analyzer</button></div></div>{view === "movement" ? <><div style={chart}><ResponsiveContainer width="100%" height="100%"><LineChart data={readings}><CartesianGrid stroke="#263449" strokeDasharray="3 3"/><XAxis dataKey="time" stroke="#94a3b8"/><YAxis stroke="#94a3b8"/><Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #334155" }}/><Legend/><ReferenceLine y={20} stroke="#f59e0b" strokeDasharray="5 5" label="Warning"/><ReferenceLine y={25} stroke="#ef4444" strokeDasharray="5 5" label="Action"/><Line type="monotone" dataKey="wallDeflectionMm" name="Wall deflection (mm)" stroke="#f97316" strokeWidth={3}/><Line type="monotone" dataKey="prismSettlementMm" name="Optical prism settlement (mm)" stroke="#38bdf8" strokeWidth={3}/><Line type="monotone" dataKey="piezometerLevelM" name="Water table (m)" stroke="#a78bfa" strokeWidth={3}/></LineChart></ResponsiveContainer></div><div style={metrics}><div><span>Latest wall deflection</span><strong>{latest.wallDeflectionMm} mm</strong></div><div><span>Latest prism settlement</span><strong>{latest.prismSettlementMm} mm</strong></div><div><span>Action breaches</span><strong style={{ color: actionBreaches ? "#f87171" : "#34d399" }}>{actionBreaches ? actionBreaches : "Zero"}</strong></div></div></> : <><div style={chart}><ResponsiveContainer width="100%" height="100%"><LineChart data={pileCurve}><CartesianGrid stroke="#263449" strokeDasharray="3 3"/><XAxis dataKey="loadKN" label={{ value: "Load (kN)", position: "insideBottom", offset: -5 }} stroke="#94a3b8"/><YAxis label={{ value: "Settlement (mm)", angle: -90, position: "insideLeft" }} stroke="#94a3b8"/><Tooltip contentStyle={{ background: "#0b1220", border: "1px solid #334155" }}/><ReferenceLine y={elasticReboundLimit} stroke="#f59e0b" strokeDasharray="5 5" label="Elastic rebound limit"/><Line type="monotone" dataKey="settlementMm" name="Pile settlement (mm)" stroke="#34d399" strokeWidth={3} dot/></LineChart></ResponsiveContainer></div><div style={metrics}><div><span>Ultimate load capacity</span><strong>{ultimateLoad.toLocaleString()} kN</strong></div><div><span>Elastic rebound limit</span><strong>{elasticReboundLimit} mm</strong></div><div><span>Standard</span><strong>IS 2911</strong></div></div></>}</section>;
}
const panel = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 };
const header = { display: "flex", justifyContent: "space-between", gap: 15, alignItems: "center", flexWrap: "wrap" as const };
const eyebrow = { color: "#7dd3fc", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase" as const };
const tabs = { display: "flex", gap: 6, flexWrap: "wrap" as const };
const tab = { border: "1px solid #334155", borderRadius: 8, background: "transparent", color: "#94a3b8", padding: "8px 10px", cursor: "pointer" };
const activeTab = { ...tab, background: "#0ea5e9", color: "#082f49" };
const chart = { height: 330, marginTop: 18 };
const metrics = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 1, marginTop: 15, background: "#1e293b" };
