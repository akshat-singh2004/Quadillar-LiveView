"use client";

import { useState } from "react";
import type { DlpWarrantyTicket } from "@/types/construction";

export function DLPServiceModal({ ticket, onClose, onUpdated }: { ticket: DlpWarrantyTicket | null; onClose: () => void; onUpdated: (ticket: DlpWarrantyTicket) => void }) {
  const [otp, setOtp] = useState("");
  if (!ticket) return null;
  const verify = () => { if (otp === "2468") onUpdated({ ...ticket, status: "Resolved", occupantVerifiedAt: new Date().toISOString() }); };
  const debit = () => onUpdated({ ...ticket, retentionDebitRaised: true, status: "Assigned" });
  return <div style={overlay}><div style={modal}><div style={header}><div><div style={eyebrow}>DLP service desk / {ticket.id}</div><h2 style={{ margin: "6px 0 0", fontSize: 24 }}>{ticket.unitRef} · {ticket.category}</h2><div style={muted}>{ticket.description}</div></div><button type="button" onClick={onClose} style={close} aria-label="Close ticket">×</button></div><div style={detailGrid}><div><span>Assigned subcontractor</span><strong>{ticket.subcontractor}</strong></div><div><span>Priority SLA</span><strong style={{ color: ticket.priority === "Emergency" ? "#f87171" : ticket.priority === "Urgent" ? "#fbbf24" : "#60a5fa" }}>{ticket.priority}</strong></div><div><span>Disputed repair cost</span><strong>₹{(ticket.disputedRepairCost ?? 0).toLocaleString("en-IN")}</strong></div></div><section style={workflow}><div style={eyebrow}>Occupant verification / digital sign-off</div><p style={muted}>Confirm rectification with the occupant before this warranty ticket becomes resolved.</p><div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><input inputMode="numeric" value={otp} onChange={(event) => setOtp(event.target.value)} placeholder="Enter 4-digit OTP" style={input} /><button type="button" onClick={verify} style={primary}>Verify OTP & close</button></div>{ticket.status === "Resolved" && <div style={{ color: "#86efac", fontSize: 13 }}>Digitally signed off by occupant.</div>}</section><button type="button" onClick={debit} disabled={ticket.retentionDebitRaised} style={debitButton}>{ticket.retentionDebitRaised ? "Retention debit forwarded" : "Apply to Contractor Retention Debit"}</button><div style={small}>Routes a disputed repair cost to <strong>subcontractor_backcharges</strong>.</div></div></div>;
}

const overlay = { position: "fixed" as const, inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 20, background: "rgba(2,6,23,.82)" };
const modal = { width: "min(700px,100%)", background: "#0b1220", border: "1px solid #334155", borderRadius: 20, padding: 24, color: "#e2e8f0", display: "grid", gap: 18 };
const header = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const eyebrow = { color: "#7dd3fc", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" as const };
const muted = { color: "#94a3b8", fontSize: 13, lineHeight: 1.5 };
const close = { width: 34, height: 34, borderRadius: 999, border: "1px solid #334155", background: "transparent", color: "#f8fafc", cursor: "pointer", fontSize: 20 };
const detailGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10 };
const workflow = { display: "grid", gap: 10, background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 16 };
const input = { border: "1px solid #334155", borderRadius: 9, background: "#0b1220", color: "#f8fafc", padding: "10px 12px" };
const primary = { border: 0, borderRadius: 9, background: "#22c55e", color: "#052e16", padding: "10px 13px", fontWeight: 800, cursor: "pointer" };
const debitButton = { border: "1px solid #f59e0b", borderRadius: 10, background: "rgba(245,158,11,.1)", color: "#fcd34d", padding: "11px 14px", fontWeight: 800, cursor: "pointer" };
const small = { color: "#64748b", fontSize: 11 };
