"use client";

import { useState } from "react";
import { MaterialReconciliationDrawer } from "@/components/finance/MaterialReconciliationDrawer";
import type { MaterialReconciliationRecord } from "@/types/construction";

const seed: MaterialReconciliationRecord[] = [
  { id: "rec-steel", projectId: "proj-1", material: "Reinforcement Steel", boqReference: "BOQ 05.02 / BBS Core Frame", theoreticalQuantity: 118, actualIssuedQuantity: 124.8, unit: "MT", allowableWastagePercent: 3, recoveryUnitRate: 72000, reconciledAt: "2026-08-24T08:00:00.000Z" },
  { id: "rec-cement", projectId: "proj-1", material: "Cement", boqReference: "BOQ 03.01 / Structural Concrete", theoreticalQuantity: 1640, actualIssuedQuantity: 1661, unit: "Bags", allowableWastagePercent: 2, recoveryUnitRate: 410, reconciledAt: "2026-08-24T08:00:00.000Z" },
  { id: "rec-rmc", projectId: "proj-1", material: "RMC Concrete", boqReference: "BOQ 04.04 / Podium Slab", theoreticalQuantity: 680, actualIssuedQuantity: 688, unit: "m3", allowableWastagePercent: 2, recoveryUnitRate: 8500, reconciledAt: "2026-08-24T08:00:00.000Z" },
];

export default function MaterialReconciliationPage() {
  const [selected, setSelected] = useState<MaterialReconciliationRecord | null>(null);
  const [debit, setDebit] = useState<{ id: string; amount: number; material: string }>();
  return <main style={pageStyle}><div style={{ maxWidth: 1280, margin: "0 auto" }}><header style={{ marginBottom: 25 }}><div style={eyebrowStyle}>Finance / material controls</div><h1 style={{ margin: "8px 0 0", fontSize: 38 }}>Material yield & wastage reconciliation</h1><p style={mutedStyle}>Compare BBS and BOQ theoretical consumption against issued inward material, then recover excess wastage through the next IPC.</p></header>{debit && <div style={debitBanner}>Debit note {debit.id} queued for next IPC · {debit.material} · {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(debit.amount)}</div>}<section style={panelStyle}><div style={eyebrowStyle}>Consumption reconciliation sheet</div><div style={{ overflowX: "auto", marginTop: 15 }}><table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}><thead><tr>{["Material", "BOQ / BBS reference", "Theoretical", "Actual issued", "Allowable limit", "Status", "Action"].map((heading) => <th key={heading} style={thStyle}>{heading}</th>)}</tr></thead><tbody>{seed.map((item) => { const limit = item.theoreticalQuantity * (1 + item.allowableWastagePercent / 100); const excess = Math.max(0, item.actualIssuedQuantity - limit); return <tr key={item.id}><td style={tdStyle}><strong>{item.material}</strong><div style={mutedSmall}>{item.unit}</div></td><td style={tdStyle}>{item.boqReference}</td><td style={tdStyle}>{item.theoreticalQuantity.toFixed(2)}</td><td style={tdStyle}>{item.actualIssuedQuantity.toFixed(2)}</td><td style={tdStyle}>{limit.toFixed(2)}</td><td style={tdStyle}><span style={{ ...badgeStyle, color: excess ? "#fca5a5" : "#86efac", background: excess ? "#451a1a" : "#052e2b" }}>{excess ? "Excess Wastage" : "Within Limit"}</span></td><td style={tdStyle}><button type="button" onClick={() => setSelected(item)} style={actionButton}>Inspect formula</button></td></tr>; })}</tbody></table></div></section></div>{selected && <MaterialReconciliationDrawer record={selected} onClose={() => setSelected(null)} onDebitNote={(note) => { setDebit(note); setSelected(null); }} />}</main>;
}
const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: "44px 24px" };
const panelStyle: React.CSSProperties = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 15, padding: 20 };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700 };
const mutedStyle: React.CSSProperties = { color: "#94a3b8", margin: "9px 0 0", maxWidth: 700 };
const mutedSmall: React.CSSProperties = { color: "#64748b", fontSize: 11, marginTop: 4 };
const thStyle: React.CSSProperties = { padding: "12px 13px", textAlign: "left", color: "#94a3b8", fontSize: 10, textTransform: "uppercase", letterSpacing: ".1em", borderBottom: "1px solid #263449" };
const tdStyle: React.CSSProperties = { padding: "14px 13px", color: "#cbd5e1", borderBottom: "1px solid #1f2937", fontSize: 13 };
const badgeStyle: React.CSSProperties = { display: "inline-flex", padding: "6px 9px", borderRadius: 999, fontSize: 11, fontWeight: 800 };
const actionButton: React.CSSProperties = { background: "#0ea5e9", color: "white", border: 0, borderRadius: 8, padding: "8px 10px", fontWeight: 800, cursor: "pointer" };
const debitBanner: React.CSSProperties = { marginBottom: 18, padding: "13px 15px", border: "1px solid #f59e0b", borderRadius: 10, background: "#451a03", color: "#fde68a", fontWeight: 700 };
