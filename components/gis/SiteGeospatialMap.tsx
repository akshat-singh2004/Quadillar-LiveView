"use client";

import { useState } from "react";
import type { GisFeatureKind, GisMapFeature, GisZoneTelemetry } from "@/types/construction";

const features: GisMapFeature[] = [
  { id: "plot", projectId: "proj-1", kind: "Plot Boundary", label: "Plot 01 boundary", coordinates: [{ x: 7, y: 8 }, { x: 91, y: 8 }, { x: 95, y: 52 }, { x: 11, y: 56 }], fillColor: "#38bdf822", strokeColor: "#67e8f9" },
  { id: "north", projectId: "proj-1", kind: "Building Footprint", label: "North Tower footprint", coordinates: [{ x: 25, y: 14 }, { x: 50, y: 13 }, { x: 52, y: 35 }, { x: 26, y: 36 }], fillColor: "#f8fafc33", strokeColor: "#f8fafc" },
  { id: "south", projectId: "proj-1", kind: "Building Footprint", label: "South podium footprint", coordinates: [{ x: 58, y: 25 }, { x: 83, y: 23 }, { x: 85, y: 46 }, { x: 59, y: 47 }], fillColor: "#f8fafc33", strokeColor: "#f8fafc" },
  { id: "crane", projectId: "proj-1", kind: "Crane Swing Radius", label: "Tower crane 02 swing radius", coordinates: [{ x: 63, y: 17 }, { x: 69, y: 16 }, { x: 75, y: 21 }, { x: 77, y: 29 }, { x: 74, y: 36 }, { x: 67, y: 37 }, { x: 61, y: 31 }, { x: 59, y: 23 }], fillColor: "#f59e0b2b", strokeColor: "#fbbf24", strokeDasharray: "2 1" },
];

const zones: GisZoneTelemetry[] = [
  { id: "zone-a", projectId: "proj-1", zoneName: "North Tower / excavation", coordinates: { x: 18, y: 25 }, activeWorkers: 32, openPunchListItems: 4, equipment: ["EXC-07", "DZR-03"], status: "Watch" },
  { id: "zone-b", projectId: "proj-1", zoneName: "Core shell / Grid C", coordinates: { x: 55, y: 14 }, activeWorkers: 24, openPunchListItems: 1, equipment: ["CRN-02"], status: "Normal" },
  { id: "zone-c", projectId: "proj-1", zoneName: "Temporary power yard", coordinates: { x: 82, y: 48 }, activeWorkers: 8, openPunchListItems: 0, equipment: ["GEN-11"], status: "Normal" },
];

const kindColors: Record<GisFeatureKind, string> = { "Plot Boundary": "#67e8f9", "Building Footprint": "#f8fafc", "Crane Swing Radius": "#fbbf24" };

export function SiteGeospatialMap() {
  const [selectedZone, setSelectedZone] = useState<GisZoneTelemetry | null>(null);
  const [droneOpacity, setDroneOpacity] = useState(0.58);
  const [droneVisible, setDroneVisible] = useState(true);

  return <section style={panelStyle}><div style={toolbarStyle}><div><div style={eyebrowStyle}>GIS / reality capture</div><h2 style={titleStyle}>Site boundary & drone overlay</h2></div><div style={controlsStyle}><label style={controlLabel}>Drone opacity <input type="range" min="0" max="1" step="0.05" value={droneOpacity} onChange={(event) => setDroneOpacity(Number(event.target.value))} /></label><button type="button" onClick={() => setDroneVisible((current) => !current)} style={toggleButton}>{droneVisible ? "Hide orthomosaic" : "Show orthomosaic"}</button></div></div>
    <div style={mapStyle}><div style={{ ...droneStyle, opacity: droneVisible ? droneOpacity : 0 }} /><svg viewBox="0 0 100 60" role="img" aria-label="Satellite site map with plot, building, crane and telemetry overlays" style={svgStyle}>{features.map((feature) => <polygon key={feature.id} points={feature.coordinates.map((point) => `${point.x},${point.y}`).join(" ")} fill={feature.fillColor} stroke={feature.strokeColor} strokeWidth={feature.kind === "Crane Swing Radius" ? 0.6 : 0.45} strokeDasharray={feature.strokeDasharray} />)}{zones.map((zone) => <g key={zone.id} onMouseEnter={() => setSelectedZone(zone)} onFocus={() => setSelectedZone(zone)} tabIndex={0} role="button" aria-label={`Telemetry for ${zone.zoneName}`}><circle cx={zone.coordinates.x} cy={zone.coordinates.y} r="2.2" fill={zone.status === "Watch" ? "#fbbf24" : "#34d399"} stroke="#020617" strokeWidth=".7" /><circle cx={zone.coordinates.x} cy={zone.coordinates.y} r="4" fill="none" stroke={zone.status === "Watch" ? "#fbbf24" : "#34d399"} strokeWidth=".35" opacity=".7" /></g>)}</svg>{selectedZone && <aside style={telemetryCard} onMouseLeave={() => setSelectedZone(null)}><div style={eyebrowStyle}>{selectedZone.status} telemetry</div><h3 style={{ margin: "7px 0 12px", fontSize: 18 }}>{selectedZone.zoneName}</h3><div style={detailGrid}><span>Active workers <strong>{selectedZone.activeWorkers}</strong></span><span>Open punch items <strong>{selectedZone.openPunchListItems}</strong></span><span>Equipment <strong>{selectedZone.equipment.join(", ")}</strong></span></div></aside>}</div>
    <div style={legendStyle}>{Object.entries(kindColors).map(([kind, color]) => <span key={kind}><i style={{ background: color }} />{kind}</span>)}<span><i style={{ background: "#34d399" }} />Live telemetry pin</span></div>
  </section>;
}

const panelStyle: React.CSSProperties = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 16, padding: 20 };
const toolbarStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-end", flexWrap: "wrap" };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800 };
const titleStyle: React.CSSProperties = { margin: "7px 0 0", fontSize: 22 };
const controlsStyle: React.CSSProperties = { display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" };
const controlLabel: React.CSSProperties = { display: "flex", gap: 8, alignItems: "center", color: "#cbd5e1", fontSize: 12 };
const toggleButton: React.CSSProperties = { background: "#0ea5e9", color: "white", border: 0, borderRadius: 8, padding: "9px 12px", fontWeight: 800, cursor: "pointer" };
const mapStyle: React.CSSProperties = { position: "relative", overflow: "hidden", marginTop: 18, aspectRatio: "16 / 8", minHeight: 300, border: "1px solid #334155", backgroundColor: "#365b4b", backgroundImage: "linear-gradient(135deg, rgba(23,54,44,.55), rgba(112,92,51,.35)), url(https://images.unsplash.com/photo-1473445361085-b9a07f55608b?auto=format&fit=crop&w=1800&q=80)", backgroundSize: "cover", backgroundPosition: "center" };
const droneStyle: React.CSSProperties = { position: "absolute", inset: 0, backgroundImage: "linear-gradient(135deg, rgba(14,116,144,.3), rgba(22,163,74,.2)), repeating-linear-gradient(30deg, transparent 0 14px, rgba(125,211,252,.14) 15px 16px)" };
const svgStyle: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };
const telemetryCard: React.CSSProperties = { position: "absolute", right: 14, top: 14, width: "min(270px, calc(100% - 28px))", background: "rgba(7,17,31,.94)", border: "1px solid #38bdf8", borderRadius: 10, padding: 14, color: "#f8fafc" };
const detailGrid: React.CSSProperties = { display: "grid", gap: 8, color: "#cbd5e1", fontSize: 12 };
const legendStyle: React.CSSProperties = { display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, color: "#94a3b8", fontSize: 11 };