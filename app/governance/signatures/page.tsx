"use client";

import { useState } from "react";
import { DocumentSignatureModal } from "@/components/cde/DocumentSignatureModal";
import type { DocumentSignatureRecord, SignatureDocumentType } from "@/types/construction";

const initialRecords: DocumentSignatureRecord[] = [
  { id: "sig-demo-1", projectId: "proj-1", documentName: "GFC-STR-04 / Level 04 Slab", documentType: "GFC Drawing", signer: "Ananya Mehta", stakeholder: "Architect", organization: "Mehta Design Associates", credential: "COA / AOR-1184", signedAt: "2026-08-24T07:40:00.000Z", certificateHash: "a8e0e0a8b4c177e09580bf4d4a2df21d9c3f7b9fbd6a6b590ef6ec457e7798d1", verificationStatus: "Verified", x: 72, y: 72 },
  { id: "sig-demo-2", projectId: "proj-1", documentName: "RA-08 / Interim Payment Certificate", documentType: "RA Billing Certificate", signer: "Nikhil Shah", stakeholder: "Client", organization: "Quadillar Asset Holdings", credential: "Authorized Client Signatory", signedAt: "2026-08-23T15:20:00.000Z", certificateHash: "47f851b64cdb4f7f4b77e3fdcbeb3f1dd9fb55fbc89f6793ecf4be5e62ae9fb0", verificationStatus: "Verified", x: 72, y: 72 },
];

export default function SignatureGovernancePage() {
  const [records, setRecords] = useState(initialRecords);
  const [open, setOpen] = useState(false);
  const [documentType, setDocumentType] = useState<SignatureDocumentType>("GFC Drawing");

  return <main style={pageStyle}><div style={{ maxWidth: 1240, margin: "0 auto" }}><header style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", alignItems: "end" }}><div><div style={eyebrowStyle}>Governance / trust registry</div><h1 style={{ margin: "8px 0 0", fontSize: 38 }}>Digital signature vault</h1><p style={{ color: "#94a3b8", margin: "8px 0 0" }}>Immutable certificate stamps for GFC drawings and RA payment certificates.</p></div><div style={{ display: "flex", gap: 8 }}><select value={documentType} onChange={(event) => setDocumentType(event.target.value as SignatureDocumentType)} style={inputStyle}><option>GFC Drawing</option><option>RA Billing Certificate</option></select><button type="button" onClick={() => setOpen(true)} style={buttonStyle}>Open stamping canvas</button></div></header><section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, margin: "28px 0" }}>{[{ label: "Verified certificates", value: records.length }, { label: "Authorized roles", value: 3 }, { label: "Integrity state", value: "100% valid" }].map((item) => <div key={item.label} style={panelStyle}><div style={labelStyle}>{item.label}</div><div style={{ marginTop: 12, fontSize: 25, fontWeight: 800, color: "#a7f3d0" }}>{item.value}</div></div>)}</section><section style={panelStyle}><div style={eyebrowStyle}>Signed document verification ledger</div><div style={{ display: "grid", gap: 10, marginTop: 16 }}>{records.map((record) => <div key={record.id} style={rowStyle}><div><strong>{record.documentName}</strong><div style={mutedStyle}>{record.documentType} · {record.signer} · {record.organization}</div></div><div style={{ textAlign: "right" }}><span style={verifiedStyle}>✓ {record.verificationStatus}</span><div style={mutedStyle}>{new Date(record.signedAt).toLocaleString()}</div></div></div>)}</div></section></div><DocumentSignatureModal open={open} documentName={documentType === "GFC Drawing" ? "GFC-STR-05 / Level 05 Frame" : "RA-09 / Interim Payment Certificate"} documentType={documentType} onClose={() => setOpen(false)} onSigned={(record) => setRecords((current) => [record, ...current])} /></main>;
}

const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: "48px 24px" };
const panelStyle: React.CSSProperties = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 14, padding: 20 };
const rowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", padding: 14, background: "#111827", border: "1px solid #1f2937", borderRadius: 10 };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700 };
const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" };
const mutedStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 12, marginTop: 6 };
const verifiedStyle: React.CSSProperties = { color: "#86efac", fontSize: 11, fontWeight: 800 };
const inputStyle: React.CSSProperties = { background: "#0f172a", color: "#f8fafc", border: "1px solid #334155", borderRadius: 8, padding: "10px" };
const buttonStyle: React.CSSProperties = { background: "#34d399", color: "#052e16", border: 0, borderRadius: 8, padding: "10px 14px", fontWeight: 800, cursor: "pointer" };
