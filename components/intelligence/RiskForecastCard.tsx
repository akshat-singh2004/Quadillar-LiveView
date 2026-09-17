"use client";

import type { PredictiveRisk } from "@/types/construction";

export function riskExposure(risk: PredictiveRisk) { return risk.probability * risk.estimatedCostExposure; }
export function RiskForecastCard({ risk, onAccept }: { risk: PredictiveRisk; onAccept: () => void }) {
  const exposure = riskExposure(risk);
  const color = risk.impact >= 4 ? "#f87171" : risk.impact >= 3 ? "#fbbf24" : "#60a5fa";
  return <article style={{ background: "rgba(15,23,42,.82)", border: `1px solid ${color}55`, borderRadius: 16, padding: 18, display: "grid", gap: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={{ color, fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>{risk.category}</div><h3 style={{ margin: "7px 0 0", fontSize: 19 }}>{risk.title}</h3></div><strong style={{ color, fontSize: 18 }}>₹{(exposure / 10000000).toFixed(2)} Cr</strong></div><div style={{ color: "#cbd5e1", fontSize: 13 }}>{risk.signal}</div><div style={{ color: "#94a3b8", fontSize: 13 }}>Mitigation: {risk.mitigation}</div><button type="button" onClick={onAccept} style={{ border: `1px solid ${color}66`, background: `${color}1f`, color: "#f8fafc", borderRadius: 9, padding: "10px 12px", fontWeight: 800, cursor: "pointer" }}>Accept Mitigation Strategy</button></article>;
}
