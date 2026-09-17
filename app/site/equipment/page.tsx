"use client";

import { useMemo, useState } from "react";
import { EquipmentFleetDrawer } from "@/components/site/EquipmentFleetDrawer";
import type { EquipmentFleetRecord, FleetMaintenanceStatus } from "@/types/construction";

const initialFleet: EquipmentFleetRecord[] = [
  { id: "fleet-01", projectId: "proj-1", assetNumber: "EXC-07", machineType: "35T Excavator", operator: "R. Kumar", location: "North Tower excavation", operatingHours: 148, idleHours: 22, fuelIssuedLitres: 1260, standardNormLph: 7.8, serviceDueInHours: 34, lastTelemetryAt: "2026-08-25T08:42:00Z", status: "Active" },
  { id: "fleet-02", projectId: "proj-1", assetNumber: "CRN-02", machineType: "Tower Crane", operator: "S. Patil", location: "Core shell / Grid C", operatingHours: 92, idleHours: 31, fuelIssuedLitres: 390, standardNormLph: 4.1, serviceDueInHours: 112, lastTelemetryAt: "2026-08-25T08:39:00Z", status: "Active" },
  { id: "fleet-03", projectId: "proj-1", assetNumber: "DZR-03", machineType: "Crawler Dozer", operator: "M. Singh", location: "East service road", operatingHours: 206, idleHours: 58, fuelIssuedLitres: 2010, standardNormLph: 8.6, serviceDueInHours: -12, lastTelemetryAt: "2026-08-25T08:31:00Z", status: "Idle" },
  { id: "fleet-04", projectId: "proj-1", assetNumber: "GEN-11", machineType: "250 kVA Generator", operator: "A. Das", location: "Temporary power yard", operatingHours: 166, idleHours: 14, fuelIssuedLitres: 740, standardNormLph: 4.7, serviceDueInHours: 68, lastTelemetryAt: "2026-08-25T08:20:00Z", status: "Active" },
];

function maintenanceStatus(hours: number): FleetMaintenanceStatus { return hours < 0 ? "Service Overdue" : hours < 50 ? "Service Due Soon" : "Healthy"; }
function variance(item: EquipmentFleetRecord) { const actual = item.operatingHours ? item.fuelIssuedLitres / item.operatingHours : 0; return item.standardNormLph ? ((actual - item.standardNormLph) / item.standardNormLph) * 100 : 0; }

export default function EquipmentPage() {
  const [fleet, setFleet] = useState(initialFleet);
  const [selected, setSelected] = useState<EquipmentFleetRecord | null>(null);
  const metrics = useMemo(() => ({ active: fleet.filter((item) => item.status === "Active").length, idle: fleet.filter((item) => item.status === "Idle").length, idleHours: fleet.reduce((sum, item) => sum + item.idleHours, 0), operatingHours: fleet.reduce((sum, item) => sum + item.operatingHours, 0) }), [fleet]);
  const maxIdle = Math.max(...fleet.map((item) => item.idleHours), 1);

  return <main style={pageStyle}><div style={containerStyle}><header style={headerStyle}><div><div style={eyebrowStyle}>Site operations / live telemetry</div><h1 style={titleStyle}>Heavy machinery fleet monitor</h1><p style={mutedStyle}>Fuel issue logs, utilization signals, and maintenance readiness for the active site fleet.</p></div><a href="/site/dpr" style={linkStyle}>Open DPR telemetry</a></header>
    <section style={statGridStyle}>{[{ label: "Fleet assets", value: fleet.length, detail: `${metrics.active} active / ${metrics.idle} idle` }, { label: "Operating hours", value: `${metrics.operatingHours} h`, detail: "Current reporting period" }, { label: "Idle hours", value: `${metrics.idleHours} h`, detail: `${Math.round((metrics.idleHours / Math.max(metrics.idleHours + metrics.operatingHours, 1)) * 100)}% of tracked time` }, { label: "Service alerts", value: fleet.filter((item) => maintenanceStatus(item.serviceDueInHours) !== "Healthy").length, detail: "Due soon or overdue" }].map((item) => <div key={item.label} style={panelStyle}><div style={termStyle}>{item.label}</div><div style={bigValueStyle}>{item.value}</div><div style={mutedStyle}>{item.detail}</div></div>)}</section>
    <section style={twoColumnStyle}><div style={panelStyle}><div style={sectionHeader}><div><div style={eyebrowStyle}>Asset ledger</div><h2 style={sectionTitle}>Fuel efficiency variance</h2></div><span style={mutedStyle}>Actual LPH vs norm</span></div><div style={{ display: "grid", gap: 10, marginTop: 18 }}>{fleet.map((item) => { const service = maintenanceStatus(item.serviceDueInHours); const itemVariance = variance(item); return <button key={item.id} type="button" onClick={() => setSelected(item)} style={rowStyle}><div style={{ minWidth: 0, textAlign: "left" }}><div style={{ fontWeight: 800 }}>{item.assetNumber} · {item.machineType}</div><div style={mutedStyle}>{item.location} · {item.operatingHours} operating h / {item.idleHours} idle h</div></div><div style={{ textAlign: "right" }}><div style={{ color: itemVariance > 10 ? "#fca5a5" : "#86efac", fontWeight: 800 }}>{itemVariance >= 0 ? "+" : ""}{itemVariance.toFixed(1)}%</div><div className={service === "Service Overdue" ? "animate-pulse" : undefined} style={{ color: service === "Healthy" ? "#86efac" : service === "Service Due Soon" ? "#fcd34d" : "#fca5a5", fontSize: 11, fontWeight: 800 }}>{service === "Service Overdue" ? "● SERVICE OVERDUE" : service}</div></div></button>; })}</div></div>
      <div style={panelStyle}><div style={eyebrowStyle}>Utilization signal</div><h2 style={sectionTitle}>Idle-time wastage</h2><p style={mutedStyle}>Unutilized machine hours by asset. Select an asset to update its telemetry log.</p><div style={{ display: "grid", gap: 16, marginTop: 24 }}>{fleet.map((item) => <div key={item.id}><div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 7 }}><span>{item.assetNumber}</span><span style={{ color: "#fcd34d" }}>{item.idleHours} h idle</span></div><div style={barTrack}><div style={{ ...bar, width: `${(item.idleHours / maxIdle) * 100}%`, background: item.idleHours > 45 ? "#f59e0b" : "#38bdf8" }} /></div></div>)}</div><div style={{ marginTop: 24, borderTop: "1px solid #263449", paddingTop: 16, color: "#94a3b8", fontSize: 12 }}>Total idle exposure: <strong style={{ color: "#fcd34d" }}>{metrics.idleHours} hours</strong></div></div></section>
    {selected && <EquipmentFleetDrawer equipment={selected} onClose={() => setSelected(null)} onSave={(updated) => { setFleet((current) => current.map((item) => item.id === updated.id ? updated : item)); setSelected(null); }} />}
  </div></main>;
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 };
const containerStyle: React.CSSProperties = { maxWidth: 1400, margin: "0 auto" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap", marginBottom: 24 };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800 };
const titleStyle: React.CSSProperties = { margin: "7px 0 0", fontSize: 38, letterSpacing: "-0.04em" };
const sectionTitle: React.CSSProperties = { margin: "7px 0 0", fontSize: 22 };
const mutedStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 12, marginTop: 6 };
const linkStyle: React.CSSProperties = { color: "#7dd3fc", fontSize: 12, fontWeight: 800, textDecoration: "none" };
const statGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginBottom: 18 };
const twoColumnStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, .8fr)", gap: 18 };
const panelStyle: React.CSSProperties = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 16, padding: 20 };
const termStyle: React.CSSProperties = { color: "#64748b", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" };
const bigValueStyle: React.CSSProperties = { marginTop: 12, fontSize: 30, fontWeight: 800 };
const sectionHeader: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const rowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, width: "100%", background: "#111827", color: "#f8fafc", border: "1px solid #1f2937", borderRadius: 12, padding: 14, cursor: "pointer" };
const barTrack: React.CSSProperties = { height: 10, background: "#111827", borderRadius: 999, overflow: "hidden" };
const bar: React.CSSProperties = { height: "100%", borderRadius: 999 };
