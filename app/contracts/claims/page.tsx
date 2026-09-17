"use client";

import { useMemo, useState } from "react";
import { ClaimReviewModal } from "@/components/contracts/ClaimReviewModal";
import type { ClaimCauseCategory, ContractClaim } from "@/types/construction";

const initialClaims: ContractClaim[] = [
  { id: "claim-1", projectId: "proj-1", claimNumber: "CLM-024", title: "Late structural IFC drawings", claimant: "CoreBuild Contractors", clauseCitation: "FIDIC 8.4", causeCategory: "Late Information", claimedDelayDays: 21, claimedCost: 18.5, costUnit: "₹ Lakhs", submittedAt: "2026-08-12", status: "Under Assessment" },
  { id: "claim-2", projectId: "proj-1", claimNumber: "CLM-023", title: "Monsoon disruption", claimant: "SteelSpan India", clauseCitation: "FIDIC 8.5", causeCategory: "Force Majeure", claimedDelayDays: 14, claimedCost: 0.42, costUnit: "₹ Crores", submittedAt: "2026-08-05", status: "Determined", determination: "Exceptional rainfall accepted for affected lift operations.", approvedDelayDays: 8, approvedCost: 0.18, determinedAt: "2026-08-18" },
];

const statusColors = { Submitted: "#fbbf24", "Under Assessment": "#60a5fa", Determined: "#34d399", Disputed: "#f87171" };
const causes: ClaimCauseCategory[] = ["Variation", "Delay / Disruption", "Late Information", "Force Majeure", "Payment"];

export default function ClaimsPage() {
  const [claims, setClaims] = useState(initialClaims);
  const [selectedClaim, setSelectedClaim] = useState<ContractClaim | null>(null);
  const [targetDate, setTargetDate] = useState("2026-12-31");
  const [form, setForm] = useState({ title: "", clauseCitation: "FIDIC 8.4", causeCategory: "Delay / Disruption" as ClaimCauseCategory, claimedDelayDays: 0, claimedCost: 0, costUnit: "₹ Lakhs" as ContractClaim["costUnit"] });
  const approvedDays = useMemo(() => claims.reduce((total, claim) => total + (claim.approvedDelayDays ?? 0), 0), [claims]);
  const revisedDate = useMemo(() => { const date = new Date(targetDate); date.setUTCDate(date.getUTCDate() + approvedDays); return date.toISOString().slice(0, 10); }, [approvedDays, targetDate]);
  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((current) => ({ ...current, [key]: value }));
  const submitClaim = () => { if (!form.title.trim()) return; setClaims((current) => [{ id: `claim-${Date.now()}`, projectId: "proj-1", claimNumber: `CLM-${current.length + 25}`, title: form.title, claimant: "Current Contractor", clauseCitation: form.clauseCitation, causeCategory: form.causeCategory, claimedDelayDays: form.claimedDelayDays, claimedCost: form.claimedCost, costUnit: form.costUnit, submittedAt: new Date().toISOString().slice(0, 10), status: "Submitted" }, ...current]); setForm({ title: "", clauseCitation: "FIDIC 8.4", causeCategory: "Delay / Disruption", claimedDelayDays: 0, claimedCost: 0, costUnit: "₹ Lakhs" }); };
  const saveClaim = (updated: ContractClaim) => { setClaims((current) => current.map((claim) => claim.id === updated.id ? updated : claim)); setSelectedClaim(null); };

  return <main style={pageStyle}><div style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gap: 22 }}>
    <header><div style={eyebrow}>Contracts / Dispute Management</div><h1 style={heading}>Claims & Extension of Time</h1><p style={muted}>Assess entitlement, compensation, and the contractual completion target in one ledger.</p></header>
    <section style={gridStyle}><div style={panelStyle}><div style={eyebrow}>New claim intake</div><div style={formGrid}>
      <label>Claim title<input value={form.title} onChange={(event) => updateForm("title", event.target.value)} placeholder="Describe the event" style={inputStyle} /></label>
      <label>Contract clause<input value={form.clauseCitation} onChange={(event) => updateForm("clauseCitation", event.target.value)} style={inputStyle} /></label>
      <label>Cause category<select value={form.causeCategory} onChange={(event) => updateForm("causeCategory", event.target.value as ClaimCauseCategory)} style={inputStyle}>{causes.map((cause) => <option key={cause}>{cause}</option>)}</select></label>
      <label>Claimed delay days<input type="number" min="0" value={form.claimedDelayDays} onChange={(event) => updateForm("claimedDelayDays", Number(event.target.value))} style={inputStyle} /></label>
      <label>Cost implication<input type="number" min="0" value={form.claimedCost} onChange={(event) => updateForm("claimedCost", Number(event.target.value))} style={inputStyle} /></label>
      <label>Cost unit<select value={form.costUnit} onChange={(event) => updateForm("costUnit", event.target.value as ContractClaim["costUnit"])} style={inputStyle}><option>₹ Lakhs</option><option>₹ Crores</option></select></label>
    </div><button type="button" onClick={submitClaim} style={buttonStyle}>Log claim</button></div>
    <div style={panelStyle}><div style={eyebrow}>EOT control</div><label>Baseline completion target<input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} style={inputStyle} /></label><div style={{ marginTop: 22, fontSize: 13, color: "#94a3b8" }}>Granted EOT days</div><div style={metric}>{approvedDays} days</div><div style={{ marginTop: 12, color: "#bbf7d0", fontWeight: 800 }}>Revised target: {revisedDate}</div></div></section>
    <section style={panelStyle}><div style={eyebrow}>Determination ledger</div><div style={{ overflowX: "auto" }}><table style={{ width: "100%", minWidth: 850, borderCollapse: "collapse" }}><thead><tr>{["Claim", "Clause / Cause", "Claimed", "Approved", "Status", "Review"].map((headingText) => <th key={headingText} style={thStyle}>{headingText}</th>)}</tr></thead><tbody>{claims.map((claim) => <tr key={claim.id}><td style={tdStyle}><strong>{claim.claimNumber} · {claim.title}</strong><div style={muted}>{claim.claimant}</div></td><td style={tdStyle}>{claim.clauseCitation}<div style={muted}>{claim.causeCategory}</div></td><td style={tdStyle}>{claim.claimedDelayDays} days<br />{claim.costUnit} {claim.claimedCost}</td><td style={tdStyle}>{claim.approvedDelayDays ?? "-"} days<br />{claim.approvedCost == null ? "-" : `${claim.costUnit} ${claim.approvedCost}`}</td><td style={tdStyle}><span style={{ ...badgeStyle, color: statusColors[claim.status], borderColor: `${statusColors[claim.status]}66`, background: `${statusColors[claim.status]}1f` }}>{claim.status}</span></td><td style={tdStyle}><button type="button" onClick={() => setSelectedClaim(claim)} style={secondaryButton}>Open review</button></td></tr>)}</tbody></table></div></section>
    {selectedClaim ? <ClaimReviewModal claim={selectedClaim} onClose={() => setSelectedClaim(null)} onSave={saveClaim} /> : null}
  </div></main>;
}

const pageStyle = { minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: "32px 24px 64px" };
const heading = { margin: "8px 0 0", fontSize: 42 };
const eyebrow = { color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" as const };
const muted = { color: "#94a3b8", fontSize: 13, lineHeight: 1.5 };
const panelStyle = { background: "rgba(15,23,42,0.82)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 18, padding: 20 };
const gridStyle = { display: "grid", gridTemplateColumns: "1.6fr 0.8fr", gap: 18 };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, margin: "18px 0" };
const inputStyle = { display: "block", width: "100%", boxSizing: "border-box" as const, marginTop: 7, background: "#020817", color: "#f8fafc", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 10, padding: "10px 12px", font: "inherit" };
const buttonStyle = { border: "1px solid rgba(52,211,153,0.4)", background: "rgba(52,211,153,0.12)", color: "#ecfdf5", borderRadius: 10, padding: "10px 16px", fontWeight: 800, cursor: "pointer" };
const secondaryButton = { ...buttonStyle, borderColor: "rgba(96,165,250,0.4)", background: "rgba(96,165,250,0.12)" };
const metric = { fontSize: 34, fontWeight: 800, marginTop: 8 };
const thStyle = { textAlign: "left" as const, padding: "12px 10px", color: "#a5f3fc", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, borderBottom: "1px solid rgba(148,163,184,0.2)" };
const tdStyle = { padding: "14px 10px", borderBottom: "1px solid rgba(148,163,184,0.12)", verticalAlign: "top" as const };
const badgeStyle = { display: "inline-block", border: "1px solid", borderRadius: 999, padding: "6px 9px", fontSize: 11, fontWeight: 800 };
