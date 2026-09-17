"use client";

import { useState } from "react";
import type { CommissioningTestPack } from "@/types/construction";

export function isCommissioningPass(pack: CommissioningTestPack) {
  if (pack.testType === "Hydrostatic Pressure") return pack.values.measured <= pack.values.allowable;
  return pack.values.measured >= pack.values.allowable;
}

export function CommissioningPackModal({ pack, onClose, onSave }: { pack: CommissioningTestPack; onClose: () => void; onSave: (pack: CommissioningTestPack) => void }) {
  const [record, setRecord] = useState(pack);
  const passes = isCommissioningPass(record);
  const updateMeasured = (value: number) => setRecord((current) => ({ ...current, values: { ...current.values, measured: value }, status: isCommissioningPass({ ...current, values: { ...current.values, measured: value } }) ? "Passed" : "Failed / Re-test Required" }));
  const stamp = () => onSave({ ...record, status: "Passed", consultantStamp: `CONSULTANT-WITNESS-${record.packNumber}-${new Date().toISOString()}`, executedAt: new Date().toISOString() });

  return <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Commissioning test execution sheet"><div style={modalStyle}><header style={headerStyle}><div><div style={eyebrowStyle}>T&C / FAT-SAT certification · {record.packNumber}</div><h2 style={{ margin: "7px 0 0", fontSize: 24 }}>{record.testType}</h2><div style={mutedStyle}>{record.system} · {record.location}</div></div><button type="button" onClick={onClose} style={closeStyle} aria-label="Close modal">×</button></header>
    <section style={instructionStyle}><strong>Execution rule:</strong> {record.testType === "Hydrostatic Pressure" ? "pressure drop must remain at or below the allowable tolerance" : "measured result must meet or exceed the acceptance threshold"}.</section>
    <div style={fieldGridStyle}><label style={labelStyle}>Measured result<input type="number" min="0" step="0.1" value={record.values.measured} onChange={(event) => updateMeasured(Number(event.target.value))} style={inputStyle} /></label><div style={readoutStyle}><div style={termStyle}>Acceptance threshold</div><div style={{ marginTop: 8, fontSize: 21, fontWeight: 800 }}>{record.values.allowable} {record.values.unit}</div></div></div>
    <div style={{ ...statusStyle, color: passes ? "#86efac" : "#fca5a5", borderColor: passes ? "#166534" : "#7f1d1d", background: passes ? "#052e1622" : "#450a0a33" }}>{passes ? "PASS · Ready for consultant witness" : "FAILED / RE-TEST REQUIRED"}</div>
    <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20, flexWrap: "wrap" }}><button type="button" onClick={onClose} style={secondaryButton}>Close sheet</button><button type="button" disabled={!passes} onClick={stamp} style={{ ...primaryButton, opacity: passes ? 1 : .45, cursor: passes ? "pointer" : "not-allowed" }}>Apply consultant digital witness stamp</button></div>
  </div></div>;
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 70, display: "grid", placeItems: "center", padding: 20, background: "rgba(2,6,23,.82)" };
const modalStyle: React.CSSProperties = { width: "min(680px, 100%)", background: "#0b1220", border: "1px solid #334155", borderRadius: 18, padding: 24, color: "#e2e8f0" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800 };
const mutedStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 12, marginTop: 6 };
const termStyle: React.CSSProperties = { color: "#64748b", fontSize: 10, letterSpacing: ".12em", textTransform: "uppercase" };
const labelStyle: React.CSSProperties = { display: "grid", gap: 7, color: "#cbd5e1", fontSize: 12 };
const inputStyle: React.CSSProperties = { width: "100%", boxSizing: "border-box", border: "1px solid #334155", borderRadius: 9, background: "#111827", color: "#f8fafc", padding: "10px" };
const readoutStyle: React.CSSProperties = { background: "#111827", border: "1px solid #263449", borderRadius: 10, padding: 12 };
const closeStyle: React.CSSProperties = { width: 34, height: 34, borderRadius: 8, border: "1px solid #334155", background: "transparent", color: "#f8fafc", cursor: "pointer", fontSize: 20 };
const instructionStyle: React.CSSProperties = { marginTop: 20, borderLeft: "3px solid #38bdf8", background: "#082f4933", padding: 12, color: "#bae6fd", fontSize: 13 };
const fieldGridStyle: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 };
const statusStyle: React.CSSProperties = { marginTop: 18, border: "1px solid", borderRadius: 10, padding: 13, fontSize: 12, fontWeight: 900, letterSpacing: ".08em" };
const primaryButton: React.CSSProperties = { border: 0, borderRadius: 9, background: "#34d399", color: "#052e16", padding: "10px 14px", fontWeight: 800 };
const secondaryButton: React.CSSProperties = { border: "1px solid #334155", borderRadius: 9, background: "transparent", color: "#cbd5e1", padding: "10px 14px", cursor: "pointer" };