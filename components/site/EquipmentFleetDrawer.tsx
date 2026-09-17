"use client";

import { useState } from "react";
import type { EquipmentFleetRecord } from "@/types/construction";

export function EquipmentFleetDrawer({ equipment, onClose, onSave }: { equipment: EquipmentFleetRecord; onClose: () => void; onSave: (equipment: EquipmentFleetRecord) => void }) {
  const [record, setRecord] = useState(equipment);
  const update = <K extends keyof EquipmentFleetRecord>(key: K, value: EquipmentFleetRecord[K]) => setRecord((current) => ({ ...current, [key]: value }));
  const actualLph = record.operatingHours > 0 ? record.fuelIssuedLitres / record.operatingHours : 0;
  const variance = record.standardNormLph > 0 ? ((actualLph - record.standardNormLph) / record.standardNormLph) * 100 : 0;

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Fleet telemetry drawer">
      <aside style={drawerStyle}>
        <header style={headerStyle}><div><div style={eyebrowStyle}>Fleet telemetry / {record.assetNumber}</div><h2 style={{ margin: "7px 0 0", fontSize: 24 }}>{record.machineType}</h2><div style={mutedStyle}>{record.location} · {record.status}</div></div><button type="button" onClick={onClose} style={closeStyle} aria-label="Close drawer">×</button></header>
        <section style={metricGridStyle}>
          <Metric label="Actual LPH" value={`${actualLph.toFixed(1)} L/h`} />
          <Metric label="Consumption variance" value={`${variance >= 0 ? "+" : ""}${variance.toFixed(1)}%`} tone={variance > 10 ? "#fca5a5" : "#86efac"} />
        </section>
        <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
          {(["operatingHours", "idleHours", "fuelIssuedLitres", "standardNormLph", "serviceDueInHours"] as const).map((key) => (
            <label key={key} style={labelStyle}>{key.replace(/([A-Z])/g, " $1").trim()}<input type="number" min="0" step="0.1" value={record[key]} onChange={(event) => update(key, Number(event.target.value))} style={inputStyle} /></label>
          ))}
          <label style={labelStyle}>Operator<input value={record.operator} onChange={(event) => update("operator", event.target.value)} style={inputStyle} /></label>
          <label style={labelStyle}>Location<input value={record.location} onChange={(event) => update("location", event.target.value)} style={inputStyle} /></label>
        </div>
        <div style={{ display: "flex", gap: 9, marginTop: 22 }}><button type="button" onClick={onClose} style={secondaryButton}>Cancel</button><button type="button" onClick={() => onSave({ ...record, lastTelemetryAt: new Date().toISOString() })} style={primaryButton}>Save telemetry</button></div>
      </aside>
    </div>
  );
}

function Metric({ label, value, tone = "#e2e8f0" }: { label: string; value: string; tone?: string }) {
  return <div style={{ background: "#0f172a", border: "1px solid #263449", borderRadius: 10, padding: 12 }}><div style={termStyle}>{label}</div><div style={{ marginTop: 7, color: tone, fontSize: 20, fontWeight: 800 }}>{value}</div></div>;
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "flex-end", background: "rgba(2,6,23,.82)" };
const drawerStyle: React.CSSProperties = { width: "min(520px, 100%)", height: "100%", overflowY: "auto", background: "#07111f", borderLeft: "1px solid #334155", padding: 24, color: "#f8fafc" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800 };
const mutedStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 12, marginTop: 5 };
const termStyle: React.CSSProperties = { color: "#64748b", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" };
const labelStyle: React.CSSProperties = { display: "grid", gap: 6, color: "#94a3b8", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", borderRadius: 8, padding: 10 };
const closeStyle: React.CSSProperties = { background: "transparent", border: "1px solid #334155", color: "#cbd5e1", borderRadius: 8, fontSize: 22, width: 34, height: 34, cursor: "pointer" };
const metricGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 20 };
const primaryButton: React.CSSProperties = { background: "#34d399", color: "#052e16", border: 0, borderRadius: 8, padding: "10px 12px", fontWeight: 900, cursor: "pointer" };
const secondaryButton: React.CSSProperties = { background: "#0ea5e9", color: "white", border: 0, borderRadius: 8, padding: "10px 12px", fontWeight: 800, cursor: "pointer" };