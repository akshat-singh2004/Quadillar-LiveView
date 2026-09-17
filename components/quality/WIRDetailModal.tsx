"use client";

import { useState } from "react";
import { updateWorkInspectionRequest } from "@/app/lib/services";
import type { WIRChecklistStatus, WIRStatus, WorkInspectionRequest } from "@/types/construction";

export function WIRDetailModal({ request, onClose, onUpdated }: { request: WorkInspectionRequest | null; onClose: () => void; onUpdated: (request: WorkInspectionRequest) => void }) {
  const [checklist, setChecklist] = useState(request?.checklist ?? []);
  const [verdict, setVerdict] = useState<WIRStatus>(request?.status === "Pending Inspection" ? "Approved" : request?.status ?? "Approved");
  const [remarks, setRemarks] = useState(request?.verdictRemarks ?? "");
  if (!request) return null;

  const saveReview = async () => {
    const updated = await updateWorkInspectionRequest(request.id, { checklist, status: verdict, verdictRemarks: remarks, inspectedBy: "Architect / Consultant", inspectedAt: new Date().toISOString() });
    if (updated) { onUpdated(updated); onClose(); }
  };

  const printSlip = () => {
    const slip = `<html><head><title>${request.wirNumber} Clearance Slip</title><style>body{font-family:Arial;padding:36px;color:#172033}h1{margin-bottom:4px}.stamp{border:3px solid #166534;color:#166534;padding:12px;text-align:center;font-weight:700;margin:24px 0}.row{margin:8px 0}li{margin:8px 0}</style></head><body><h1>Quadillar LiveView</h1><div>Inspection Clearance Slip / ${request.wirNumber}</div><div class='stamp'>DIGITALLY STAMPED: ${verdict}</div><div class='row'><b>Work:</b> ${request.title}</div><div class='row'><b>Target grid:</b> ${request.targetGridLocation}</div><div class='row'><b>Inspected by:</b> Architect / Consultant</div><h3>Checklist</h3><ul>${checklist.map((item) => `<li>${item.label}: <b>${item.status}</b>${item.remarks ? ` - ${item.remarks}` : ""}</li>`).join("")}</ul><h3>Remarks</h3><p>${remarks || "No remarks recorded."}</p></body></html>`;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(slip);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return <div style={overlayStyle}><div style={modalStyle}><div style={headerStyle}><div><div style={eyebrowStyle}>WIR / QA-QC review</div><h2 style={{ margin: "6px 0 0", fontSize: 24 }}>{request.wirNumber} · {request.title}</h2><div style={{ marginTop: 6, color: "#94a3b8", fontSize: 13 }}>{request.discipline} / {request.targetGridLocation}</div></div><button type="button" onClick={onClose} style={closeStyle}>×</button></div><div style={{ display: "grid", gap: 10, marginTop: 20 }}>{checklist.map((item, index) => <div key={item.id} style={itemStyle}><div style={{ flex: 1, color: "#f8fafc", fontWeight: 600 }}>{item.label}</div><select value={item.status} onChange={(event) => setChecklist((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, status: event.target.value as WIRChecklistStatus } : entry))} style={inputStyle}>{(["Pass", "Fail", "N/A", "Pending"] as const).map((status) => <option key={status}>{status}</option>)}</select><input value={item.remarks ?? ""} placeholder="Item remark" onChange={(event) => setChecklist((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, remarks: event.target.value } : entry))} style={{ ...inputStyle, maxWidth: 220 }} /></div>)}</div><label style={labelStyle}>Digital inspection verdict<select value={verdict} onChange={(event) => setVerdict(event.target.value as WIRStatus)} style={inputStyle}>{(["Approved", "Approved with Comments", "Revise and Resubmit", "Rejected"] as const).map((status) => <option key={status}>{status}</option>)}</select></label><label style={labelStyle}>Consultant remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} /></label><div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><button type="button" onClick={printSlip} style={secondaryButton}>Print clearance slip</button><button type="button" onClick={() => void saveReview()} style={primaryButton}>Save inspection verdict</button></div></div></div>;
}

const overlayStyle = { position: "fixed" as const, inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 20, background: "rgba(2,6,23,0.8)" };
const modalStyle = { width: "min(940px, 100%)", maxHeight: "90vh", overflow: "auto" as const, background: "#0b1220", border: "1px solid #334155", borderRadius: 20, padding: 22, color: "#e2e8f0", display: "grid", gap: 16 };
const headerStyle = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const eyebrowStyle = { color: "#7dd3fc", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" as const };
const closeStyle = { width: 34, height: 34, borderRadius: 999, border: "1px solid #334155", background: "transparent", color: "#f8fafc", cursor: "pointer", fontSize: 20 };
const itemStyle = { display: "flex", alignItems: "center", gap: 10, background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 12 };
const labelStyle = { display: "grid", gap: 7, color: "#cbd5e1", fontSize: 12 };
const inputStyle = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #334155", borderRadius: 9, background: "#111827", color: "#f8fafc", padding: "9px 10px" };
const primaryButton = { border: 0, borderRadius: 10, background: "#2563eb", color: "#eff6ff", padding: "10px 14px", fontWeight: 700, cursor: "pointer" };
const secondaryButton = { border: "1px solid #334155", borderRadius: 10, background: "transparent", color: "#cbd5e1", padding: "10px 14px", cursor: "pointer" };
