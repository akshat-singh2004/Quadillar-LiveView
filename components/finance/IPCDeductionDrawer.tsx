"use client";

import { useMemo, useState } from "react";
import type { IpcCalculation, PaymentApplication } from "@/types/construction";

interface IPCDeductionDrawerProps { application: PaymentApplication; onClose: () => void; }
function inr(value: number) { if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`; return `₹${(value / 100000).toFixed(2)} Lakh`; }

export function IPCDeductionDrawer({ application, onClose }: IPCDeductionDrawerProps) {
  const gross = application.currentWorkCompleted + application.storedMaterials;
  const [mobilization, setMobilization] = useState(180000);
  const [materialDebit, setMaterialDebit] = useState(() => {
    if (typeof window === "undefined") return 45000;
    try { return JSON.parse(window.localStorage.getItem("quadillar-pending-material-debit") ?? "null")?.amount ?? 45000; } catch { return 45000; }
  });
  const [gstRate, setGstRate] = useState(18);
  const [utr, setUtr] = useState("HDFC-UTR-20260824-IPC08");
  const [stampedAt, setStampedAt] = useState<string | undefined>();
  const deductions = useMemo(() => [{ type: "Retention" as const, rate: 5, amount: gross * .05, note: "Contract retention held in escrow" }, { type: "Mobilization Advance Amortization" as const, amount: mobilization, note: "Recovery against advance ledger" }, { type: "Section 194C TDS" as const, rate: 2, amount: gross * .02, note: "Income tax withholding" }, { type: "GST TDS" as const, rate: 2, amount: gross * .02, note: "GST statutory withholding" }, { type: "Site Material Reconciliation Debits" as const, amount: materialDebit, note: "Unreconciled site-issued material" }], [gross, materialDebit, mobilization]);
  const gst = gross * (gstRate / (100 + gstRate));
  const net = Math.max(0, gross - deductions.reduce((sum, item) => sum + item.amount, 0));
  const stamp = async () => { const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${application.paymentApplicationId}|${net}|${utr}|${new Date().toISOString()}`)); void bytes; setStampedAt(new Date().toISOString()); };
  const printSlip = () => window.print();
  const calculation: IpcCalculation = { applicationId: application.paymentApplicationId, projectId: application.projectId, contractor: "Quadillar Civil Works JV", grossCertifiedAmount: gross, deductions, netPayable: net, utrReference: utr, stampedAt };

  return <div role="dialog" aria-modal="true" aria-label="IPC statutory deduction drawer" style={overlayStyle}><aside style={drawerStyle}><div style={headerStyle}><div><div style={eyebrowStyle}>Finance / statutory reconciliation</div><h2 style={{ margin: "7px 0 0", fontSize: 25 }}>IPC / RA Bill {application.paymentApplicationId}</h2><div style={{ color: "#94a3b8", marginTop: 5 }}>{application.tradePackage} · Quadillar Civil Works JV</div></div><button type="button" onClick={onClose} style={closeStyle}>×</button></div><section style={{ marginTop: 20, background: "#052e2b", border: "1px solid #10b981", borderRadius: 12, padding: 18 }}><div style={labelStyle}>Live net payable</div><div style={{ marginTop: 8, fontSize: 34, fontWeight: 900, color: "#a7f3d0" }}>{inr(net)}</div><div style={{ marginTop: 5, color: "#99f6e4", fontSize: 12 }}>Gross certified {inr(gross)} · statutory and reconciliation deductions applied</div></section><section style={{ marginTop: 18 }}><div style={eyebrowStyle}>Deduction schedule</div><div style={{ display: "grid", gap: 8, marginTop: 10 }}>{deductions.map((item) => <div key={item.type} style={rowStyle}><div><strong>{item.type}{item.rate ? ` (${item.rate}%)` : ""}</strong><div style={mutedStyle}>{item.note}</div></div><span style={{ color: "#fda4af", fontWeight: 800 }}>-{inr(item.amount)}</span></div>)}</div></section><section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 18 }}><label style={labelStyle}>Mobilization recovery<input type="number" value={mobilization} onChange={(event) => setMobilization(Number(event.target.value))} style={inputStyle} /></label><label style={labelStyle}>Material debit<input type="number" value={materialDebit} onChange={(event) => setMaterialDebit(Number(event.target.value))} style={inputStyle} /></label><label style={labelStyle}>GST rate (%)<input type="number" value={gstRate} onChange={(event) => setGstRate(Number(event.target.value))} style={inputStyle} /></label><div style={{ paddingTop: 19, color: "#cbd5e1", fontSize: 12 }}>GST component reconciled: <strong>{inr(gst)}</strong></div></section><section style={{ marginTop: 18, borderTop: "1px solid #263449", paddingTop: 16 }}><div style={eyebrowStyle}>Interim payment recommendation slip</div><div style={{ display: "grid", gap: 10, marginTop: 10 }}><label style={labelStyle}>UTR bank disbursement reference<input value={utr} onChange={(event) => setUtr(event.target.value)} style={inputStyle} /></label><div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}><button type="button" onClick={() => void stamp()} style={primaryButton}>{stampedAt ? "✓ Slip digitally stamped" : "Apply digital stamp"}</button><button type="button" onClick={printSlip} style={secondaryButton}>Print recommendation slip</button></div>{stampedAt && <div style={{ color: "#86efac", fontSize: 12 }}>Stamped {new Date(stampedAt).toLocaleString()} · UTR {calculation.utrReference} · net {inr(calculation.netPayable)}</div>}</div></section></aside></div>;
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 40, background: "rgba(2,6,23,.82)", display: "flex", justifyContent: "flex-end" };
const drawerStyle: React.CSSProperties = { width: "min(650px, 100%)", height: "100%", overflowY: "auto", background: "#07111f", borderLeft: "1px solid #334155", padding: 24, color: "#f8fafc" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "flex-start" };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700 };
const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" };
const mutedStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 11, marginTop: 5 };
const closeStyle: React.CSSProperties = { background: "transparent", border: "1px solid #334155", color: "#cbd5e1", borderRadius: 8, fontSize: 22, width: 34, height: 34, cursor: "pointer" };
const rowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "#111827", border: "1px solid #1f2937", borderRadius: 9, padding: 11, fontSize: 13 };
const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 6, background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", borderRadius: 8, padding: "9px" };
const primaryButton: React.CSSProperties = { background: "#34d399", color: "#052e16", border: 0, borderRadius: 8, padding: "10px 12px", fontWeight: 800, cursor: "pointer" };
const secondaryButton: React.CSSProperties = { background: "#0ea5e9", color: "white", border: 0, borderRadius: 8, padding: "10px 12px", fontWeight: 800, cursor: "pointer" };
