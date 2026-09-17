"use client";

import { useEffect, useState } from "react";
import type { CraneTelemetry } from "@/types/construction";

const cranes: CraneTelemetry[] = [
  { id: "crane-01", name: "TC-01 / North Tower", x: 35, y: 48, radiusM: 62, jibAngleDeg: 42, hookLoadMt: 8.4, safeWorkingLoadMt: 12, windKph: 31 },
  { id: "crane-02", name: "TC-02 / South Tower", x: 68, y: 58, radiusM: 58, jibAngleDeg: 218, hookLoadMt: 5.8, safeWorkingLoadMt: 10, windKph: 39 },
  { id: "crane-03", name: "TC-03 / Podium", x: 51, y: 30, radiusM: 43, jibAngleDeg: 126, hookLoadMt: 2.2, safeWorkingLoadMt: 8, windKph: 26 },
];

export function CraneSlewRadar() {
  const [angle, setAngle] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setAngle((value) => (value + 2) % 360), 1000); return () => window.clearInterval(timer); }, []);
  const overlap = cranes[0].radiusM + cranes[1].radiusM > Math.hypot(cranes[0].x - cranes[1].x, cranes[0].y - cranes[1].y);
  return <section style={panel}><div style={header}><div><div style={eyebrow}>Site telemetry / 1 sec refresh</div><h2 style={{ margin: "6px 0 0", fontSize: 22 }}>Tower crane anti-collision radar</h2></div><span style={{ color: overlap ? "#fbbf24" : "#34d399", fontWeight: 800 }}>{overlap ? "PROXIMITY ENVELOPE ACTIVE" : "Clear separation"}</span></div><div style={radar}><svg viewBox="0 0 100 80" role="img" aria-label="Top-down tower crane radar"><rect width="100" height="80" fill="#07111f"/><path d="M0 20H100M0 40H100M0 60H100M25 0V80M50 0V80M75 0V80" stroke="#1e3a4a" strokeWidth=".25"/>{cranes.map((crane, index) => <g key={crane.id}><circle cx={crane.x} cy={crane.y} r={crane.radiusM / 3} fill={overlap && index < 2 ? "rgba(245,158,11,.16)" : "rgba(56,189,248,.10)"} stroke={overlap && index < 2 ? "#f59e0b" : "#38bdf8"} strokeWidth=".6" className={overlap && index < 2 ? "radar-pulse" : ""}/><circle cx={crane.x} cy={crane.y} r="1.8" fill="#f8fafc"/><line x1={crane.x} y1={crane.y} x2={crane.x + Math.cos(((crane.jibAngleDeg + angle) * Math.PI) / 180) * crane.radiusM / 3} y2={crane.y + Math.sin(((crane.jibAngleDeg + angle) * Math.PI) / 180) * crane.radiusM / 3} stroke={crane.windKph >= 38 ? "#ef4444" : "#34d399"} strokeWidth="1.2"/><text x={crane.x + 3} y={crane.y - 3} fill="#e2e8f0" fontSize="2.7">{crane.name.split(" /")[0]}</text></g>)}<text x="3" y="76" fill="#94a3b8" fontSize="2.5">N ↑ · radius envelopes · live slew {angle}°</text></svg></div><div style={table}>{cranes.map((crane) => { const utilization = Math.round((crane.hookLoadMt / crane.safeWorkingLoadMt) * 100); return <div key={crane.id} style={row}><div><strong>{crane.name}</strong><div style={small}>Hook {crane.hookLoadMt} MT · SWL {crane.safeWorkingLoadMt} MT · radius {crane.radiusM} m</div></div><div style={right}><span style={{ color: utilization >= 80 ? "#f87171" : "#86efac" }}>{utilization}% LMI</span><span style={{ color: crane.windKph >= 38 ? "#f87171" : "#94a3b8" }}>{crane.windKph >= 38 ? "WIND LOCKOUT" : `${crane.windKph} km/h wind`}</span></div></div>})}</div></section>;
}
const panel = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 };
const header = { display: "flex", justifyContent: "space-between", gap: 15, alignItems: "center", flexWrap: "wrap" as const };
const eyebrow = { color: "#7dd3fc", fontSize: 11, letterSpacing: ".15em", textTransform: "uppercase" as const };
const radar = { marginTop: 18, border: "1px solid #1e3a4a", borderRadius: 12, overflow: "hidden" };
const table = { display: "grid", gap: 8, marginTop: 15 };
const row = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#111827", border: "1px solid #1f2937", borderRadius: 10, padding: 12 };
const small = { marginTop: 5, color: "#94a3b8", fontSize: 11 };
const right = { display: "grid", justifyItems: "end", gap: 5, fontSize: 12, fontWeight: 700 };
