"use client";

import { useState } from "react";
import type { ContractClaim, ContractClaimStatus } from "@/types/construction";

interface ClaimReviewModalProps {
  claim: ContractClaim | null;
  onClose: () => void;
  onSave: (claim: ContractClaim) => void;
}

export function ClaimReviewModal({ claim, onClose, onSave }: ClaimReviewModalProps) {
  const [form, setForm] = useState<ContractClaim | null>(claim);
  if (!claim || !form) return null;

  const update = <K extends keyof ContractClaim>(key: K, value: ContractClaim[K]) => setForm((current) => current ? { ...current, [key]: value } : current);
  const determine = () => update("status", "Determined" as ContractClaimStatus);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 20, background: "rgba(2,6,23,0.82)" }}>
      <div style={{ width: "min(680px, 100%)", maxHeight: "90vh", overflowY: "auto", background: "#0f172a", color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.28)", borderRadius: 20, padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "start" }}>
          <div><div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Claim review</div><h2 style={{ margin: "8px 0 0", fontSize: 26 }}>{claim.claimNumber}: {claim.title}</h2></div>
          <button type="button" onClick={onClose} aria-label="Close claim review" style={{ border: 0, background: "transparent", color: "#cbd5e1", fontSize: 24, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ display: "grid", gap: 12, marginTop: 22 }}>
          <label>Engineer determination<textarea value={form.determination ?? ""} onChange={(event) => update("determination", event.target.value)} placeholder="Record the Architect / Client determination" rows={4} style={fieldStyle} /></label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <label>Approved delay days<input type="number" min="0" value={form.approvedDelayDays ?? ""} onChange={(event) => update("approvedDelayDays", Number(event.target.value))} style={fieldStyle} /></label>
            <label>Approved cost ({form.costUnit})<input type="number" min="0" value={form.approvedCost ?? ""} onChange={(event) => update("approvedCost", Number(event.target.value))} style={fieldStyle} /></label>
          </div>
          <label>Status<select value={form.status} onChange={(event) => update("status", event.target.value as ContractClaimStatus)} style={fieldStyle}><option>Submitted</option><option>Under Assessment</option><option>Determined</option><option>Disputed</option></select></label>
        </div>
        <div style={{ display: "flex", justifyContent: "end", gap: 10, marginTop: 22, flexWrap: "wrap" }}>
          <button type="button" onClick={determine} style={buttonStyle("#38bdf8")}>Mark Under Assessment</button>
          <button type="button" onClick={() => onSave({ ...form, status: "Determined", determinedAt: new Date().toISOString() })} style={buttonStyle("#34d399")}>Save Determination</button>
        </div>
      </div>
    </div>
  );
}

const fieldStyle = { display: "block", width: "100%", marginTop: 7, boxSizing: "border-box" as const, background: "#020817", color: "#f8fafc", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 10, padding: "10px 12px", font: "inherit" };
const buttonStyle = (color: string) => ({ border: `1px solid ${color}66`, background: `${color}1f`, color: "#f8fafc", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer" });
