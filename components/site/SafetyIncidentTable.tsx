"use client";

import { useMemo, useState } from "react";
import { updateSafetyIncident } from "@/app/lib/services";
import type { SafetyIncidentRecord, SafetyIncidentStatus, SafetyIncidentType } from "@/types/construction";

const types: SafetyIncidentType[] = ["Near Miss", "Unsafe Condition", "LTI"];
const statuses: SafetyIncidentStatus[] = ["Reported", "Under Investigation", "CAPA Implemented", "Closed"];

export function SafetyIncidentTable({ initialIncidents }: { initialIncidents: SafetyIncidentRecord[] }) {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [typeFilter, setTypeFilter] = useState<SafetyIncidentType | "All">("All");
  const [selected, setSelected] = useState<SafetyIncidentRecord | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportForm, setReportForm] = useState({ type: "Near Miss" as SafetyIncidentType, title: "", description: "", location: "", severity: "Medium" as SafetyIncidentRecord["severity"] });

  const filtered = useMemo(() => typeFilter === "All" ? incidents : incidents.filter((item) => item.type === typeFilter), [incidents, typeFilter]);
  const lastLti = incidents.filter((item) => item.type === "LTI").sort((a, b) => new Date(b.incidentDate).getTime() - new Date(a.incidentDate).getTime())[0];
  const safeDays = lastLti ? Math.max(0, Math.floor((Date.now() - new Date(lastLti.incidentDate).getTime()) / 86400000)) : 0;

  const changeStatus = async (incident: SafetyIncidentRecord, status: SafetyIncidentStatus) => {
    const updated = await updateSafetyIncident(incident.id, { status, closedAt: status === "Closed" ? new Date().toISOString() : incident.closedAt });
    if (!updated) return;
    setIncidents((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelected(updated);
  };

  const reportIncident = () => {
    const incident: SafetyIncidentRecord = { id: `hse-${Date.now()}`, projectId: "proj-1", incidentDate: new Date().toISOString(), type: reportForm.type, title: reportForm.title || "New site safety report", description: reportForm.description || "No description provided.", location: reportForm.location || "Site-wide", reportedBy: "Current user", severity: reportForm.severity, status: "Reported", createdAt: new Date().toISOString() };
    setIncidents((current) => [incident, ...current]);
    setReporting(false);
    setReportForm({ type: "Near Miss", title: "", description: "", location: "", severity: "Medium" });
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ background: "linear-gradient(120deg, #7f1d1d, #172554 70%)", border: "1px solid rgba(248,113,113,0.28)", borderRadius: 20, padding: 22 }}><div style={eyebrowStyle}>Safety telemetry</div><div style={{ marginTop: 8, fontSize: 38, fontWeight: 900, color: "#fff1f2" }}>{safeDays} days</div><div style={{ marginTop: 5, color: "#fecdd3" }}>Safe man-hours without LTI are tracking from {lastLti ? new Date(lastLti.incidentDate).toLocaleDateString("en-IN") : "project start"}.</div></div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{(["All", ...types] as const).map((item) => <button type="button" key={item} onClick={() => setTypeFilter(item)} style={{ ...tagStyle, background: typeFilter === item ? "#f59e0b" : "rgba(255,255,255,0.04)", color: typeFilter === item ? "#451a03" : "#cbd5e1" }}>{item}</button>)}<button type="button" onClick={() => setReporting(true)} style={{ ...tagStyle, marginLeft: "auto", background: "#b91c1c", color: "#fff1f2", borderColor: "transparent" }}>+ Report incident</button></div>
      <div style={{ overflowX: "auto", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 18 }}><table style={{ width: "100%", minWidth: 1000, borderCollapse: "collapse" }}><thead><tr>{["Date", "Incident", "Type", "Severity", "Location", "CAPA status", "Action"].map((heading) => <th key={heading} style={thStyle}>{heading}</th>)}</tr></thead><tbody>{filtered.map((item) => <tr key={item.id}>
        <td style={tdStyle}>{new Date(item.incidentDate).toLocaleDateString("en-IN")}</td><td style={{ ...tdStyle, color: "#f8fafc", fontWeight: 700 }}>{item.title}<div style={{ marginTop: 5, color: "#94a3b8", fontSize: 12, fontWeight: 400 }}>{item.reportedBy}</div></td><td style={tdStyle}>{item.type}</td><td style={tdStyle}><span style={{ ...severityBadge, background: severityColors[item.severity] }}>{item.severity}</span></td><td style={tdStyle}>{item.location}</td><td style={tdStyle}><span style={{ color: item.status === "Closed" ? "#86efac" : item.status === "CAPA Implemented" ? "#7dd3fc" : "#fde68a" }}>{item.status}</span></td><td style={tdStyle}><button type="button" onClick={() => setSelected(item)} style={linkButton}>Open console</button></td>
      </tr>)}</tbody></table></div>
      {selected && <div style={overlayStyle} onClick={() => setSelected(null)}><div style={modalStyle} onClick={(event) => event.stopPropagation()}><div style={modalHeader}><div><div style={eyebrowStyle}>HSE incident console</div><h2 style={{ margin: "6px 0 0", fontSize: 24 }}>{selected.title}</h2></div><button type="button" onClick={() => setSelected(null)} style={closeButton}>×</button></div><p style={{ color: "#cbd5e1", lineHeight: 1.65 }}>{selected.description}</p><div style={detailGrid}><div><span style={eyebrowStyle}>Location</span><div style={detailValue}>{selected.location}</div></div><div><span style={eyebrowStyle}>Severity</span><div style={detailValue}>{selected.severity}</div></div><div><span style={eyebrowStyle}>Corrective action</span><div style={detailValue}>{selected.correctiveAction ?? "Pending assignment"}</div></div><div><span style={eyebrowStyle}>Preventive action</span><div style={detailValue}>{selected.preventiveAction ?? "Pending assignment"}</div></div></div><label style={{ ...labelStyle, marginTop: 20 }}>CAPA workflow<select value={selected.status} onChange={(event) => void changeStatus(selected, event.target.value as SafetyIncidentStatus)} style={inputStyle}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label></div></div>}
      {reporting && <div style={overlayStyle}><div style={modalStyle}><div style={modalHeader}><div><div style={eyebrowStyle}>New HSE record</div><h2 style={{ margin: "6px 0 0", fontSize: 24 }}>Report safety event</h2></div><button type="button" onClick={() => setReporting(false)} style={closeButton}>×</button></div><div style={detailGrid}><label style={labelStyle}>Event type<select value={reportForm.type} onChange={(event) => setReportForm((current) => ({ ...current, type: event.target.value as SafetyIncidentType }))} style={inputStyle}>{types.map((item) => <option key={item}>{item}</option>)}</select></label><label style={labelStyle}>Severity<select value={reportForm.severity} onChange={(event) => setReportForm((current) => ({ ...current, severity: event.target.value as SafetyIncidentRecord["severity"] }))} style={inputStyle}>{["Critical", "High", "Medium", "Low"].map((item) => <option key={item}>{item}</option>)}</select></label><label style={labelStyle}>Title<input value={reportForm.title} onChange={(event) => setReportForm((current) => ({ ...current, title: event.target.value }))} style={inputStyle} /></label><label style={labelStyle}>Location<input value={reportForm.location} onChange={(event) => setReportForm((current) => ({ ...current, location: event.target.value }))} style={inputStyle} /></label></div><label style={{ ...labelStyle, marginTop: 14 }}>Description<textarea value={reportForm.description} onChange={(event) => setReportForm((current) => ({ ...current, description: event.target.value }))} style={{ ...inputStyle, minHeight: 100, resize: "vertical" }} /></label><div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}><button type="button" onClick={reportIncident} style={{ border: 0, borderRadius: 10, background: "#b91c1c", color: "#fff1f2", padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>Create reported incident</button></div></div></div>}
    </div>
  );
}

const severityColors: Record<SafetyIncidentRecord["severity"], string> = { Critical: "rgba(239,68,68,0.25)", High: "rgba(249,115,22,0.25)", Medium: "rgba(245,158,11,0.25)", Low: "rgba(59,130,246,0.25)" };
const eyebrowStyle = { color: "#94a3b8", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" as const };
const tagStyle = { border: "1px solid rgba(148,163,184,0.2)", borderRadius: 999, padding: "9px 12px", fontSize: 12, cursor: "pointer" };
const thStyle = { padding: "13px 14px", textAlign: "left" as const, color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, borderBottom: "1px solid rgba(148,163,184,0.18)" };
const tdStyle = { padding: "14px", color: "#cbd5e1", borderBottom: "1px solid rgba(148,163,184,0.1)", fontSize: 13 };
const severityBadge = { display: "inline-flex", borderRadius: 999, padding: "6px 10px", color: "#fff", fontSize: 11, fontWeight: 700 };
const linkButton = { background: "transparent", border: 0, color: "#7dd3fc", cursor: "pointer", padding: 0 };
const overlayStyle = { position: "fixed" as const, inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 20, background: "rgba(2,6,23,0.78)" };
const modalStyle = { width: "min(680px, 100%)", background: "#0b1220", border: "1px solid #334155", borderRadius: 20, padding: 22, color: "#e2e8f0" };
const modalHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 };
const closeButton = { width: 34, height: 34, borderRadius: 999, border: "1px solid #334155", background: "transparent", color: "#f8fafc", cursor: "pointer", fontSize: 20 };
const detailGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 };
const detailValue = { marginTop: 7, color: "#f8fafc", lineHeight: 1.5 };
const labelStyle = { display: "grid", gap: 7, color: "#cbd5e1", fontSize: 12 };
const inputStyle = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #334155", borderRadius: 10, background: "#111827", color: "#f8fafc", padding: "10px 11px" };
