"use client";

import { useMemo, useState } from "react";
import type { MicroclimateTelemetryReading } from "@/types/construction";

const defaultTelemetry: MicroclimateTelemetryReading[] = [
  {
    id: "micro-1",
    projectId: "proj-1",
    location: "North Tower / Level 03",
    temperatureC: 29.4,
    windKmH: 36,
    rainfallMmHr: 4.2,
    humidityPercent: 71,
    capturedAt: new Date().toISOString(),
    status: "Restricted Weather Ops",
    trigger: ["Wind alert: crane suspension watch"],
  },
  {
    id: "micro-2",
    projectId: "proj-1",
    location: "West Facade / L04",
    temperatureC: 31.1,
    windKmH: 42,
    rainfallMmHr: 6.8,
    humidityPercent: 88,
    capturedAt: new Date(Date.now() - 1800000).toISOString(),
    status: "Full Stoppage",
    trigger: ["Wind >= 38 km/h", "Rain >= 5 mm/hr"],
  },
];

export function MicroclimateGauges() {
  const [reading, setReading] = useState<MicroclimateTelemetryReading>(defaultTelemetry[0]);

  const statusColor = useMemo(() => {
    if (reading.windKmH >= 38 || reading.rainfallMmHr >= 5) return { label: "Full Stoppage", tone: "#ef4444", bg: "rgba(239,68,68,0.12)" };
    if (reading.windKmH >= 30 || reading.rainfallMmHr >= 3) return { label: "Restricted Weather Ops", tone: "#f59e0b", bg: "rgba(245,158,11,0.12)" };
    return { label: "Normal Site Ops", tone: "#22c55e", bg: "rgba(34,197,94,0.12)" };
  }, [reading]);

  const convertStoppage = () => {
    const timestamp = new Date().toISOString();
    const claimText = `Weather Delay Claim – ${timestamp}\nCause: Adverse weather telemetry breached safety controls.\nWind: ${reading.windKmH} km/h | Rainfall: ${reading.rainfallMmHr} mm/hr | Humidity: ${reading.humidityPercent}% | Temperature: ${reading.temperatureC}°C.\nImpact: crane and work-at-height operations paused; external painting and concreting ceased pending safe recommencement.`;
    window.alert(claimText);
  };

  const updateTelemetry = () => {
    setReading((current) => {
      const next = current.id === defaultTelemetry[0].id ? defaultTelemetry[1] : defaultTelemetry[0];
      return { ...next, capturedAt: new Date().toISOString() };
    });
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Microclimate telemetry</div>
          <div style={{ marginTop: 6, fontSize: 28, fontWeight: 700 }}>{reading.location}</div>
        </div>
        <div style={{ borderRadius: 999, padding: "8px 12px", background: statusColor.bg, color: statusColor.tone, border: `1px solid ${statusColor.tone}44`, fontWeight: 700 }}>{statusColor.label}</div>
      </div>

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {[
          { label: "Site Temperature", value: `${reading.temperatureC.toFixed(1)}°C`, accent: "#38bdf8" },
          { label: "Wind Speed", value: `${reading.windKmH.toFixed(0)} km/h`, accent: "#fbbf24" },
          { label: "Precipitation Rate", value: `${reading.rainfallMmHr.toFixed(1)} mm/hr`, accent: "#60a5fa" },
          { label: "Humidity", value: `${reading.humidityPercent.toFixed(0)}%`, accent: "#34d399" },
        ].map((metric) => (
          <div key={metric.label} style={{ padding: 18, borderRadius: 16, border: "1px solid rgba(148,163,184,0.18)", background: "rgba(15,23,42,0.77)" }}>
            <div style={{ color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.12em" }}>{metric.label}</div>
            <div style={{ marginTop: 18, fontSize: 32, fontWeight: 700, color: metric.accent }}>{metric.value}</div>
            <div style={{ marginTop: 8, height: 8, borderRadius: 999, background: "rgba(148,163,184,0.12)", overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, Math.max(10, reading.windKmH / 50 * 100))}%`, height: "100%", background: metric.accent, borderRadius: 999 }} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
        <button type="button" onClick={updateTelemetry} style={{ background: "#0ea5e9", color: "white", border: "none", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>Simulate telemetry refresh</button>
        <button type="button" onClick={convertStoppage} style={{ background: "#f59e0b", color: "#111827", border: "none", borderRadius: 12, padding: "10px 16px", cursor: "pointer", fontWeight: 700 }}>Convert Stoppage into EOT Claim Evidence</button>
      </div>

      <div style={{ border: "1px solid rgba(148,163,184,0.18)", borderRadius: 16, padding: 16, background: "rgba(2,6,23,0.9)" }}>
        <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Adverse weather trigger</div>
        <ul style={{ margin: "12px 0 0", paddingLeft: 18, color: "#e2e8f0", lineHeight: 1.8 }}>
          <li>Wind ≥ 38 km/h → crane and work-at-height stoppage.</li>
          <li>Rainfall ≥ 5 mm/hr → external painting and concreting stoppage.</li>
          <li>Current event: {reading.trigger.join(" • ") || "No active trigger"}</li>
        </ul>
      </div>
    </div>
  );
}
