"use client";

import { useMemo, useState } from "react";
import { createPunchListItem } from "@/app/lib/services";
import type { PunchListItem, VisionDefectDetection, VisionDetectionStatus } from "@/types/construction";

const demoPhoto = "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1400&q=85";
const seedDetections: VisionDefectDetection[] = [
  { id: "vision-01", projectId: "proj-1", photoUrl: demoPhoto, defectType: "Concrete Honeycombing", confidence: 96, severity: "High", location: "North Tower / Level 04 / Grid C5", boundingBox: { x: 23, y: 29, width: 22, height: 18 }, status: "Unverified AI Flag", detectedAt: "2026-08-24T08:12:00.000Z" },
  { id: "vision-02", projectId: "proj-1", photoUrl: demoPhoto, defectType: "Missing Guardrails", confidence: 91, severity: "Critical", location: "North Tower / Level 07 / Edge B2", boundingBox: { x: 61, y: 18, width: 27, height: 25 }, status: "Unverified AI Flag", detectedAt: "2026-08-24T08:09:00.000Z" },
  { id: "vision-03", projectId: "proj-1", photoUrl: demoPhoto, defectType: "Exposed Rebar", confidence: 88, severity: "Medium", location: "Core / Level 03 / Column C2", boundingBox: { x: 42, y: 57, width: 18, height: 24 }, status: "Converted to Snag", punchItemId: "punch-vision-03", detectedAt: "2026-08-23T16:40:00.000Z" },
];

const tabs: Array<{ label: string; status?: VisionDetectionStatus }> = [{ label: "All Detections" }, { label: "Unverified AI Flags", status: "Unverified AI Flag" }, { label: "Converted to Snags", status: "Converted to Snag" }];
const severityColor: Record<string, string> = { Critical: "#fb7185", High: "#fb923c", Medium: "#facc15", Low: "#4ade80" };

export function VisionDefectCanvas() {
  const [detections, setDetections] = useState(seedDetections);
  const [activeTab, setActiveTab] = useState("All Detections");
  const [selectedId, setSelectedId] = useState(seedDetections[0].id);
  const [photoUrl, setPhotoUrl] = useState(demoPhoto);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const selected = detections.find((item) => item.id === selectedId) ?? detections[0];
  const visible = useMemo(() => { const tab = tabs.find((item) => item.label === activeTab); return tab?.status ? detections.filter((item) => item.status === tab.status) : detections; }, [activeTab, detections]);

  const uploadPhoto = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (file) setPhotoUrl(URL.createObjectURL(file)); };

  const convertToSnag = async (detection: VisionDefectDetection) => {
    setBusyId(detection.id); setMessage("");
    const team: PunchListItem["assignedTaskTeamId"] = detection.defectType === "Missing Guardrails" ? "Electrical" : "Drywall";
    const trade: PunchListItem["trade"] = detection.defectType === "Exposed Rebar" ? "Masonry" : detection.defectType === "Missing Guardrails" ? "Electrical" : "Finishing";
    const item = await createPunchListItem({ punchItemId: `punch-${detection.id}`, projectId: detection.projectId, spaceLocationCode: detection.location, assignedTaskTeamId: team, issueDescription: `AI detected ${detection.defectType} (${detection.confidence}% confidence).`, photoCdeItemId: detection.id, photoUrl: detection.photoUrl, rectificationStatus: "Open", priority: detection.severity === "Critical" || detection.severity === "High" ? "High Priority" : "Medium", createdAt: new Date().toISOString(), trade, locationZone: detection.location, assignee: "Site Quality Engineer", x: detection.boundingBox.x, y: detection.boundingBox.y, sheet: "AI site photo" });
    setBusyId(null);
    if (!item) { setMessage("The snag could not be saved. Check the project connection and retry."); return; }
    setDetections((current) => current.map((entry) => entry.id === detection.id ? { ...entry, status: "Converted to Snag", punchItemId: item.punchItemId } : entry));
    setMessage(`${detection.defectType} linked to ${item.punchItemId}.`);
  };

  return <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.25fr) minmax(300px, .75fr)", gap: 18 }}>
    <div style={panelStyle}>
      <div style={toolbarStyle}><div><div style={eyebrowStyle}>Computer vision / live review</div><h2 style={{ margin: "6px 0 0", fontSize: 23 }}>Site photo inspector</h2></div><label style={uploadStyle}>Load site photo<input type="file" accept="image/*" onChange={uploadPhoto} style={{ display: "none" }} /></label></div>
      <div style={{ position: "relative", marginTop: 18, overflow: "hidden", aspectRatio: "1.65", background: "#111827", border: "1px solid #334155" }}><img src={photoUrl} alt="Construction site inspected by computer vision" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: .82 }} />{visible.map((item) => <button type="button" key={item.id} onClick={() => setSelectedId(item.id)} aria-label={`Select ${item.defectType}`} style={{ position: "absolute", left: `${item.boundingBox.x}%`, top: `${item.boundingBox.y}%`, width: `${item.boundingBox.width}%`, height: `${item.boundingBox.height}%`, border: `2px solid ${severityColor[item.severity]}`, background: selectedId === item.id ? `${severityColor[item.severity]}2b` : "transparent", cursor: "pointer" }}><span style={{ position: "absolute", top: -25, left: -2, whiteSpace: "nowrap", background: severityColor[item.severity], color: "#111827", padding: "4px 6px", fontSize: 10, fontWeight: 800 }}>{item.defectType} · {item.confidence}%</span></button>)}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 16 }}>{tabs.map((tab) => <button type="button" key={tab.label} onClick={() => setActiveTab(tab.label)} style={{ ...tabStyle, background: activeTab === tab.label ? "#e2e8f0" : "#0f172a", color: activeTab === tab.label ? "#0f172a" : "#cbd5e1" }}>{tab.label} <span style={{ opacity: .65 }}>{tab.status ? detections.filter((item) => item.status === tab.status).length : detections.length}</span></button>)}</div>
    </div>
    <aside style={panelStyle}><div style={eyebrowStyle}>Selected detection</div>{selected ? <><div style={{ marginTop: 10, fontSize: 22, fontWeight: 800 }}>{selected.defectType}</div><div style={{ display: "inline-block", marginTop: 10, background: `${severityColor[selected.severity]}22`, color: severityColor[selected.severity], border: `1px solid ${severityColor[selected.severity]}66`, padding: "5px 8px", fontSize: 11, fontWeight: 800 }}>{selected.severity} · {selected.confidence}% confidence</div><dl style={{ display: "grid", gap: 12, margin: "20px 0", color: "#cbd5e1", fontSize: 13 }}><div><dt style={termStyle}>Location</dt><dd style={descStyle}>{selected.location}</dd></div><div><dt style={termStyle}>Detected</dt><dd style={descStyle}>{new Date(selected.detectedAt).toLocaleString()}</dd></div><div><dt style={termStyle}>Bounding box</dt><dd style={descStyle}>{selected.boundingBox.width}% × {selected.boundingBox.height}% of frame</dd></div></dl>{selected.status === "Converted to Snag" ? <div style={{ color: "#86efac", borderTop: "1px solid #263449", paddingTop: 14 }}>Linked punch item: {selected.punchItemId}</div> : <button type="button" disabled={busyId === selected.id} onClick={() => void convertToSnag(selected)} style={primaryButton}>{busyId === selected.id ? "Creating linked snag..." : "Convert to Punch List Snag"}</button>}</> : <div style={{ color: "#94a3b8", marginTop: 14 }}>No detections in this view.</div>}{message && <div style={{ marginTop: 14, color: message.includes("linked") ? "#86efac" : "#fca5a5", fontSize: 13 }}>{message}</div>}</aside>
  </section>;
}

const panelStyle: React.CSSProperties = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 14, padding: 18 };
const toolbarStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700 };
const uploadStyle: React.CSSProperties = { background: "#0ea5e9", color: "white", padding: "9px 12px", borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer" };
const tabStyle: React.CSSProperties = { border: "1px solid #334155", borderRadius: 999, padding: "8px 11px", fontWeight: 700, cursor: "pointer", fontSize: 12 };
const termStyle: React.CSSProperties = { color: "#64748b", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" };
const descStyle: React.CSSProperties = { margin: "4px 0 0" };
const primaryButton: React.CSSProperties = { width: "100%", background: "#f59e0b", color: "#111827", border: 0, borderRadius: 8, padding: "12px", fontWeight: 800, cursor: "pointer" };
