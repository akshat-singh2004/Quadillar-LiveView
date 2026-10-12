"use client";

import { useState } from "react";
import type { GisFeatureKind, GisMapFeature, GisZoneTelemetry } from "@/types/construction";

const features: GisMapFeature[] = [];

const zones: any[] = [];

const kindColors: Record<GisFeatureKind, string> = { "Plot Boundary": "#67e8f9", "Building Footprint": "#f8fafc", "Crane Swing Radius": "#fbbf24" };

export function SiteGeospatialMap() {
  const [selectedZone, setSelectedZone] = useState<GisZoneTelemetry | null>(null);
  const [droneOpacity, setDroneOpacity] = useState(0.58);
  const [droneVisible, setDroneVisible] = useState(true);

  return <section style={panelStyle}><div style={toolbarStyle}><div><div style={eyebrowStyle}>GIS / reality capture</div><h2 style={titleStyle}>Site boundary & drone overlay</h2></div><div style={controlsStyle}><label style={controlLabel}>Drone opacity <input type="range" min="0" max="1" step="0.05" value={droneOpacity} onChange={(event) => setDroneOpacity(Number(event.target.value))} /></label><button type="button" onClick={() => setDroneVisible((current) => !current)} style={toggleButton}>{droneVisible ? "Hide orthomosaic" : "Show orthomosaic"}</button></div></div>
    <div style={mapStyle}><div style={{ ...droneStyle, opacity: droneVisible ? droneOpacity : 0 }} /><svg viewBox="0 0 100 60" role="img" aria-label="Satellite site map with plot, building, crane and telemetry overlays" style={svgStyle}>{features.length === 0 && zones.length === 0 && (
        <g>
          <line x1="0" y1="30" x2="100" y2="30" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="2 2" />
          <line x1="50" y1="0" x2="50" y2="60" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="2 2" />
          <circle cx="50" cy="30" r="14" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="2 2" />
          <circle cx="50" cy="30" r="24" fill="none" stroke="#1e293b" strokeWidth="0.3" strokeDasharray="2 2" />
          <text x="50" y="31" textAnchor="middle" fill="#64748b" fontSize="2.8" fontWeight="600" letterSpacing="0.08em">
            NO ACTIVE GEOFENCES OR TELEMETRY PINS
          </text>
        </g>
      )}{features.map((feature) => <polygon key={feature.id} points={feature.coordinates.map((point) => `${point.x},${point.y}`).join(" ")} fill={feature.fillColor} stroke={feature.strokeColor} strokeWidth={feature.kind === "Crane Swing Radius" ? 0.6 : 0.45} strokeDasharray={feature.strokeDasharray} />)}{zones.map((zone) => <g key={zone.id} onMouseEnter={() => setSelectedZone(zone)} onFocus={() => setSelectedZone(zone)} tabIndex={0} role="button" aria-label={`Telemetry for ${zone.zoneName}`}><circle cx={zone.coordinates.x} cy={zone.coordinates.y} r="2.2" fill={zone.status === "Watch" ? "#fbbf24" : "#34d399"} stroke="#020617" strokeWidth=".7" /><circle cx={zone.coordinates.x} cy={zone.coordinates.y} r="4" fill="none" stroke={zone.status === "Watch" ? "#fbbf24" : "#34d399"} strokeWidth=".35" opacity=".7" /></g>)}</svg>{selectedZone && <aside style={telemetryCard} onMouseLeave={() => setSelectedZone(null)}><div style={eyebrowStyle}>{selectedZone.status} telemetry</div><h3 style={{ margin: "7px 0 12px", fontSize: 18 }}>{selectedZone.zoneName}</h3><div style={detailGrid}><span>Active workers <strong>{selectedZone.activeWorkers}</strong></span><span>Open punch items <strong>{selectedZone.openPunchListItems}</strong></span><span>Equipment <strong>{selectedZone.equipment.join(", ")}</strong></span></div></aside>}</div>
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
const mapStyle: React.CSSProperties = { position: "relative", overflow: "hidden", marginTop: 18, aspectRatio: "16 / 8", minHeight: 300, border: "1px solid #334155", backgroundColor: "#09090b", backgroundImage: "linear-gradient(135deg, rgba(23,54,44,.55), rgba(112,92,51,.35)), none", backgroundSize: "cover", backgroundPosition: "center" };
const droneStyle: React.CSSProperties = { position: "absolute", inset: 0, backgroundImage: "linear-gradient(135deg, rgba(14,116,144,.3), rgba(22,163,74,.2)), repeating-linear-gradient(30deg, transparent 0 14px, rgba(125,211,252,.14) 15px 16px)" };
const svgStyle: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%" };
const telemetryCard: React.CSSProperties = { position: "absolute", right: 14, top: 14, width: "min(270px, calc(100% - 28px))", background: "rgba(7,17,31,.94)", border: "1px solid #38bdf8", borderRadius: 10, padding: 14, color: "#f8fafc" };
const detailGrid: React.CSSProperties = { display: "grid", gap: 8, color: "#cbd5e1", fontSize: 12 };
const legendStyle: React.CSSProperties = { display: "flex", gap: 16, flexWrap: "wrap", marginTop: 14, color: "#94a3b8", fontSize: 11 };