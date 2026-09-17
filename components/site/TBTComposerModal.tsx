"use client";

import { useMemo, useRef, useState } from "react";
import type { TbtTopic, ToolboxTalkRecord } from "@/types/construction";

interface TBTComposerModalProps { open: boolean; onClose: () => void; onSaved: (record: ToolboxTalkRecord) => void; }
const templates: Record<TbtTopic, string[]> = { "Height Safety": ["Full body harness and double lanyard inspected", "Edge protection and lifeline secured", "Tool tethering and exclusion zone confirmed", "Weather and wind conditions reviewed"], "Electrical LOTO": ["Isolation points identified and locked", "Zero-energy test completed", "Lockout tags and authorized persons briefed", "Insulated tools and PPE checked"], "Deep Excavation": ["Shoring and batter slope inspected", "Access ladder secured and clear", "Spoil setback and plant exclusion zone marked", "Gas and water ingress checks completed"] };

export function TBTComposerModal({ open, onClose, onSaved }: TBTComposerModalProps) {
  const [topic, setTopic] = useState<TbtTopic>("Height Safety");
  const [checks, setChecks] = useState(() => templates["Height Safety"].map((label) => ({ label, completed: false })));
  const [workers, setWorkers] = useState<string[]>(["R. Kumar", "S. Patil", "M. Das"]);
  const [workerName, setWorkerName] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string>();
  const fileRef = useRef<HTMLInputElement>(null);
  const completed = useMemo(() => checks.filter((item) => item.completed).length, [checks]);
  if (!open) return null;
  const changeTopic = (next: TbtTopic) => { setTopic(next); setChecks(templates[next].map((label) => ({ label, completed: false }))); };
  const addWorker = () => { if (workerName.trim()) { setWorkers((current) => [...current, workerName.trim()]); setWorkerName(""); } };
  const save = () => onSaved({ id: `tbt-${Date.now()}`, projectId: "proj-1", briefingDate: new Date().toISOString().slice(0, 10), topic, checklist: checks, attendees: workers, photoUrl, loggedAt: new Date().toISOString() });
  return <div role="dialog" aria-modal="true" style={overlayStyle}><div style={modalStyle}><header style={headerStyle}><div><div style={eyebrowStyle}>Daily site briefing</div><h2 style={{ margin: "7px 0 0", fontSize: 25 }}>Log toolbox talk</h2></div><button type="button" onClick={onClose} style={closeStyle}>×</button></header><label style={labelStyle}>High-risk topic<select value={topic} onChange={(event) => changeTopic(event.target.value as TbtTopic)} style={inputStyle}>{Object.keys(templates).map((item) => <option key={item}>{item}</option>)}</select></label><div style={{ marginTop: 18 }}><div style={eyebrowStyle}>Safety checklist · {completed}/{checks.length}</div><div style={{ display: "grid", gap: 8, marginTop: 10 }}>{checks.map((item, index) => <label key={item.label} style={checkStyle}><input type="checkbox" checked={item.completed} onChange={() => setChecks((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, completed: !entry.completed } : entry))} />{item.label}</label>)}</div></div><div style={{ marginTop: 18 }}><div style={eyebrowStyle}>Worker attendance · {workers.length} present</div><div style={{ display: "flex", gap: 7, marginTop: 9 }}><input value={workerName} onChange={(event) => setWorkerName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addWorker(); } }} placeholder="Worker name or ID" style={{ ...inputStyle, marginTop: 0 }} /><button type="button" onClick={addWorker} style={secondaryButton}>Add</button></div><div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>{workers.map((worker) => <button type="button" key={worker} onClick={() => setWorkers((current) => current.filter((item) => item !== worker))} style={workerStyle}>{worker} ×</button>)}</div></div><div style={{ marginTop: 18 }}><div style={eyebrowStyle}>Muster briefing photo</div>{photoUrl ? <img src={photoUrl} alt="Muster briefing preview" style={{ width: "100%", maxHeight: 150, objectFit: "cover", marginTop: 9, borderRadius: 10 }} /> : <button type="button" onClick={() => fileRef.current?.click()} style={uploadStyle}>Upload photo preview</button>}<input ref={fileRef} type="file" accept="image/*" onChange={(event) => { const file = event.target.files?.[0]; if (file) setPhotoUrl(URL.createObjectURL(file)); }} style={{ display: "none" }} /></div><button type="button" onClick={save} disabled={!workers.length} style={primaryButton}>Save today's TBT briefing</button></div></div>;
}
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 60, display: "grid", placeItems: "center", padding: 18, background: "rgba(2,6,23,.82)" };
const modalStyle: React.CSSProperties = { width: "min(680px, 100%)", maxHeight: "92vh", overflowY: "auto", background: "#07111f", border: "1px solid #334155", borderRadius: 16, padding: 22, color: "#f8fafc" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 20 };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700 };
const labelStyle: React.CSSProperties = { display: "grid", gap: 7, color: "#94a3b8", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" };
const inputStyle: React.CSSProperties = { display: "block", width: "100%", boxSizing: "border-box", marginTop: 6, background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", borderRadius: 8, padding: "10px" };
const closeStyle: React.CSSProperties = { background: "transparent", border: "1px solid #334155", color: "#cbd5e1", borderRadius: 8, fontSize: 22, width: 34, height: 34, cursor: "pointer" };
const checkStyle: React.CSSProperties = { display: "flex", gap: 9, alignItems: "center", color: "#cbd5e1", background: "#111827", border: "1px solid #1f2937", borderRadius: 8, padding: 10, fontSize: 13 };
const workerStyle: React.CSSProperties = { border: "1px solid #334155", background: "#111827", color: "#cbd5e1", borderRadius: 999, padding: "6px 9px", cursor: "pointer" };
const uploadStyle: React.CSSProperties = { marginTop: 9, background: "#0ea5e9", color: "white", border: 0, borderRadius: 8, padding: "10px 12px", fontWeight: 800, cursor: "pointer" };
const primaryButton: React.CSSProperties = { width: "100%", marginTop: 22, background: "#34d399", color: "#052e16", border: 0, borderRadius: 8, padding: 12, fontWeight: 900, cursor: "pointer" };
const secondaryButton: React.CSSProperties = { background: "#0ea5e9", color: "white", border: 0, borderRadius: 8, padding: "0 13px", fontWeight: 800, cursor: "pointer" };
