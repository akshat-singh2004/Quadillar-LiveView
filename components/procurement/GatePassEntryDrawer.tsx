"use client";

import { useState } from "react";
import type { GateMaterialCategory, GatePassRecord, GatePassStatus } from "@/types/construction";

export function GatePassEntryDrawer({ entry, onClose, onSave }: { entry: GatePassRecord; onClose: () => void; onSave: (entry: GatePassRecord) => void }) {
  const [record, setRecord] = useState(entry);
  const update = <K extends keyof GatePassRecord>(key: K, value: GatePassRecord[K]) => setRecord((current) => ({ ...current, [key]: value }));
  const netWeight = Math.max(0, record.grossWeightMt - record.tareWeightMt);
  const variance = record.challanQuantityMt ? ((netWeight - record.challanQuantityMt) / record.challanQuantityMt) * 100 : 0;
  const warning = Math.abs(variance) > 1.5;
  const save = (status: GatePassStatus) => onSave({ ...record, status, stockyardBin: record.stockyardBin?.trim() || undefined, qaClearedAt: new Date().toISOString() });

  return <div style={overlay} role="dialog" aria-modal="true" aria-label="Gate pass entry drawer"><aside style={drawer}><header style={header}><div><div style={eyebrow}>Security gate / weighbridge</div><h2 style={{ margin: "7px 0 0", fontSize: 24 }}>{record.vehicleNumber}</h2><div style={muted}>{record.supplier} · {record.materialCategory}</div></div><button type="button" onClick={onClose} style={close} aria-label="Close drawer">×</button></header><div style={grid}>{(["vehicleNumber", "driverName", "supplier", "poReference"] as const).map((key) => <label key={key} style={label}>{key.replace(/([A-Z])/g, " $1")}<input value={record[key]} onChange={(event) => update(key, event.target.value)} style={input} /></label>)}<label style={label}>Material category<select value={record.materialCategory} onChange={(event) => update("materialCategory", event.target.value as GateMaterialCategory)} style={input}>{["Cement", "Reinforcement Steel", "RMC Concrete", "Aggregates", "Finishes"].map((value) => <option key={value}>{value}</option>)}</select></label>{(["challanQuantityMt", "grossWeightMt", "tareWeightMt"] as const).map((key) => <label key={key} style={label}>{key.replace(/([A-Z])/g, " $1")} (MT)<input type="number" min="0" step="0.01" value={record[key]} onChange={(event) => update(key, Number(event.target.value))} style={input} /></label>)}<label style={label}>Stockyard bin<input value={record.stockyardBin ?? ""} onChange={(event) => update("stockyardBin", event.target.value)} placeholder="Required for accepted loads" style={input} /></label></div><section style={weightPanel}><div><span style={term}>Net weight</span><strong style={value}>{netWeight.toFixed(2)} MT</strong></div><div><span style={term}>Challan variance</span><strong style={{ ...value, color: warning ? "#fca5a5" : "#86efac" }}>{variance >= 0 ? "+" : ""}{variance.toFixed(2)}%</strong></div></section>{warning && <div style={warningStyle}>Weight variance exceeds ±1.5%. Hold load for QA verification.</div>}<div style={actions}><button type="button" onClick={() => save("Rejected at Gate")} style={reject}>Rejected at Gate</button><button type="button" disabled={!record.stockyardBin?.trim() || warning} onClick={() => save("Accepted & Unloaded")} style={{ ...accept, opacity: !record.stockyardBin?.trim() || warning ? .45 : 1 }}>Accepted & Unloaded</button></div></aside></div>;
}

const overlay: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 70, display: "flex", justifyContent: "flex-end", background: "rgba(2,6,23,.82)" };
const drawer: React.CSSProperties = { width: "min(620px, 100%)", height: "100%", overflowY: "auto", background: "#07111f", borderLeft: "1px solid #334155", padding: 24, color: "#f8fafc" };
const header: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const eyebrow: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800 };
const muted: React.CSSProperties = { color: "#94a3b8", fontSize: 12, marginTop: 6 };
const close: React.CSSProperties = { width: 34, height: 34, border: "1px solid #334155", borderRadius: 8, background: "transparent", color: "#f8fafc", fontSize: 20, cursor: "pointer" };
const grid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 22 };
const label: React.CSSProperties = { display: "grid", gap: 6, color: "#cbd5e1", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" };
const input: React.CSSProperties = { width: "100%", boxSizing: "border-box", background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", borderRadius: 8, padding: 10 };
const weightPanel: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18, padding: 14, background: "#0f172a", border: "1px solid #263449", borderRadius: 10 };
const term: React.CSSProperties = { display: "block", color: "#64748b", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" };
const value: React.CSSProperties = { display: "block", marginTop: 7, color: "#86efac", fontSize: 21 };
const warningStyle: React.CSSProperties = { marginTop: 14, border: "1px solid #92400e", borderRadius: 9, background: "#451a0333", color: "#fcd34d", padding: 12, fontSize: 12, fontWeight: 800 };
const actions: React.CSSProperties = { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 };
const reject: React.CSSProperties = { border: "1px solid #7f1d1d", borderRadius: 8, background: "#450a0a", color: "#fca5a5", padding: "10px 12px", fontWeight: 800, cursor: "pointer" };
const accept: React.CSSProperties = { border: 0, borderRadius: 8, background: "#34d399", color: "#052e16", padding: "10px 12px", fontWeight: 900, cursor: "pointer" };