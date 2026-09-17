"use client";

import { useMemo, useState } from "react";
import type { MaterialReconciliationRecord } from "@/types/construction";

interface MaterialReconciliationDrawerProps {
  record: MaterialReconciliationRecord;
  onClose: () => void;
  onDebitNote: (debitNote: { id: string; amount: number; material: string }) => void;
}

const inr = (value: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);

export function MaterialReconciliationDrawer({ record, onClose, onDebitNote }: MaterialReconciliationDrawerProps) {
  const [actual, setActual] = useState(record.actualIssuedQuantity);
  const [wastage, setWastage] = useState(record.allowableWastagePercent);
  const [unitRate, setUnitRate] = useState(record.recoveryUnitRate);
  const calculation = useMemo(() => {
    const allowableLimit = record.theoreticalQuantity * (1 + wastage / 100);
    const excessWastage = Math.max(0, actual - allowableLimit);
    return { allowableLimit, excessWastage, penalty: excessWastage * unitRate, variance: ((actual - record.theoreticalQuantity) / record.theoreticalQuantity) * 100 };
  }, [actual, record.theoreticalQuantity, unitRate, wastage]);
  const isExcess = calculation.excessWastage > 0;

  return <div role="dialog" aria-modal="true" aria-label="Material reconciliation drawer" style={overlayStyle}><aside style={drawerStyle}><header style={headerStyle}><div><div style={eyebrowStyle}>IS standard material control</div><h2 style={{ margin: "7px 0 0", fontSize: 25 }}>{record.material} reconciliation</h2><div style={{ color: "#94a3b8", marginTop: 5 }}>{record.boqReference} · {record.unit}</div></div><button type="button" onClick={onClose} style={closeStyle} aria-label="Close drawer">×</button></header><section style={{ ...statusStyle, borderColor: isExcess ? "#ef4444" : "#10b981", background: isExcess ? "#3b1118" : "#052e2b" }}><div style={labelStyle}>Consumption efficiency</div><div style={{ marginTop: 7, color: isExcess ? "#fca5a5" : "#a7f3d0", fontSize: 22, fontWeight: 900 }}>{isExcess ? "Excess Wastage" : "Within Limit"}</div><div style={{ marginTop: 5, color: "#cbd5e1", fontSize: 12 }}>Actual variance: {calculation.variance.toFixed(2)}%</div></section><section style={{ marginTop: 20, display: "grid", gap: 13 }}><label style={labelStyle}>Theoretical quantity<input value={record.theoreticalQuantity} readOnly style={inputStyle} /></label><label style={labelStyle}>Actual issued inward<input type="number" value={actual} onChange={(event) => setActual(Number(event.target.value))} style={inputStyle} /></label><label style={labelStyle}>Allowable wastage %<input type="number" value={wastage} onChange={(event) => setWastage(Number(event.target.value))} style={inputStyle} /></label><label style={labelStyle}>Recovery unit rate (₹)<input type="number" value={unitRate} onChange={(event) => setUnitRate(Number(event.target.value))} style={inputStyle} /></label></section><section style={{ marginTop: 20, borderTop: "1px solid #263449", paddingTop: 16, display: "grid", gap: 10 }}><Metric label="Allowable limit" value={`${calculation.allowableLimit.toFixed(2)} ${record.unit}`} /><Metric label="Excess wastage" value={`${calculation.excessWastage.toFixed(2)} ${record.unit}`} /><Metric label="Total penalty debit" value={inr(calculation.penalty)} accent={isExcess} /></section><button type="button" disabled={!isExcess} onClick={() => { const note = { id: `debit-${Date.now()}`, amount: calculation.penalty, material: record.material }; localStorage.setItem("quadillar-pending-material-debit", JSON.stringify(note)); onDebitNote(note); }} style={{ ...primaryButton, opacity: isExcess ? 1 : .45, cursor: isExcess ? "pointer" : "not-allowed" }}>Export Material Debit Note to IPC</button></aside></div>;
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) { return <div style={{ display: "flex", justifyContent: "space-between", gap: 12, color: "#cbd5e1", fontSize: 13 }}><span>{label}</span><strong style={{ color: accent ? "#fca5a5" : "#f8fafc" }}>{value}</strong></div>; }
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 60, background: "rgba(2,6,23,.82)", display: "flex", justifyContent: "flex-end" };
const drawerStyle: React.CSSProperties = { width: "min(560px, 100%)", height: "100%", overflowY: "auto", background: "#07111f", borderLeft: "1px solid #334155", padding: 24, color: "#f8fafc" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700 };
const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" };
const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 6, boxSizing: "border-box", background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", borderRadius: 8, padding: "10px" };
const closeStyle: React.CSSProperties = { background: "transparent", border: "1px solid #334155", color: "#cbd5e1", borderRadius: 8, fontSize: 22, width: 34, height: 34, cursor: "pointer" };
const statusStyle: React.CSSProperties = { marginTop: 20, border: "1px solid", borderRadius: 12, padding: 17 };
const primaryButton: React.CSSProperties = { width: "100%", marginTop: 24, background: "#f59e0b", color: "#111827", border: 0, borderRadius: 9, padding: 12, fontWeight: 900 };
