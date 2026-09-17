"use client";

import { useState } from "react";
import { createOrUpdateSubmittal } from "@/app/lib/services";
import type { ApprovedSubmittal } from "@/types/construction";

export function SubmittalReviewDrawer({ submittal, onClose, onUpdated }: { submittal: ApprovedSubmittal | null; onClose: () => void; onUpdated: (items: ApprovedSubmittal[]) => void }) {
  const [verdict, setVerdict] = useState<ApprovedSubmittal["status"]>(submittal?.status === "Pending" ? "Approved" : submittal?.status ?? "Approved");
  const [remarks, setRemarks] = useState(submittal?.reviewRemarks ?? "");
  if (!submittal) return null;

  const save = async () => {
    const reviewed = { ...submittal, status: verdict, reviewRemarks: remarks, approvalDate: new Date().toISOString() };
    if (verdict === "Revise and Resubmit") {
      const nextRevision = Number((submittal.revisionCode ?? "Rev 0").replace(/\D/g, "")) + 1;
      const next: ApprovedSubmittal = { ...submittal, id: `${submittal.id}-r${nextRevision}`, revisionCode: `Rev ${nextRevision}`, status: "Pending", actionCode: "Revise_Resubmit", approvalDate: undefined, reviewRemarks: undefined, submittedAt: new Date().toISOString() };
      const [savedReviewed, savedNext] = await Promise.all([createOrUpdateSubmittal(reviewed), createOrUpdateSubmittal(next)]);
      if (savedReviewed && savedNext) onUpdated([savedReviewed, savedNext]);
    } else {
      const saved = await createOrUpdateSubmittal(reviewed);
      if (saved) onUpdated([saved]);
    }
    onClose();
  };

  const printSlip = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`<html><head><title>Submittal ${submittal.revisionCode ?? "Rev 0"}</title><style>body{font-family:Arial;padding:40px;color:#172033}.stamp{border:3px solid #166534;color:#166534;padding:14px;text-align:center;font-weight:700;margin:24px 0}</style></head><body><h1>Quadillar LiveView</h1><p>Technical Submittal Review</p><div class='stamp'>${verdict}</div><p><b>${submittal.title}</b> / ${submittal.category ?? "Technical Submittal"} / ${submittal.revisionCode ?? "Rev 0"}</p><p>Trade: ${submittal.trade}</p><h3>Remarks</h3><p>${remarks || "No comments recorded."}</p></body></html>`);
    printWindow.document.close(); printWindow.focus(); printWindow.print();
  };

  return <div style={overlay}><aside style={drawer}><div style={header}><div><div style={eyebrow}>Architect review console</div><h2 style={{ margin: "7px 0 0", fontSize: 24 }}>{submittal.title}</h2><div style={{ marginTop: 6, color: "#94a3b8", fontSize: 12 }}>{submittal.category ?? "Technical Submittal"} / {submittal.revisionCode ?? "Rev 0"}</div></div><button type="button" onClick={onClose} style={close}>×</button></div><div style={attachmentBox}><div style={eyebrow}>Attachments</div>{(submittal.attachments ?? []).length ? submittal.attachments?.map((file) => <div key={file.id} style={{ marginTop: 8, color: "#cbd5e1" }}>{file.fileName}</div>) : <div style={{ marginTop: 8, color: "#64748b" }}>No files attached in fallback mode.</div>}</div><label style={labelStyle}>Definitive verdict<select value={verdict} onChange={(event) => setVerdict(event.target.value as ApprovedSubmittal["status"])} style={inputStyle}>{["Approved", "Approved with Comments", "Revise and Resubmit", "Rejected"].map((item) => <option key={item}>{item}</option>)}</select></label><label style={labelStyle}>Review remarks<textarea value={remarks} onChange={(event) => setRemarks(event.target.value)} style={{ ...inputStyle, minHeight: 120, resize: "vertical" }} /></label><div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}><button type="button" onClick={printSlip} style={secondary}>Print review slip</button><button type="button" onClick={() => void save()} style={primary}>Stamp verdict</button></div></aside></div>;
}

const overlay = { position: "fixed" as const, inset: 0, zIndex: 100, background: "rgba(2,6,23,0.75)", display: "flex", justifyContent: "flex-end" };
const drawer = { width: "min(560px, 100%)", height: "100%", overflow: "auto" as const, background: "#0b1220", borderLeft: "1px solid #334155", padding: 24, color: "#e2e8f0", display: "grid", alignContent: "start", gap: 18 };
const header = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 };
const eyebrow = { color: "#7dd3fc", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" as const };
const close = { width: 34, height: 34, borderRadius: 999, border: "1px solid #334155", background: "transparent", color: "#f8fafc", cursor: "pointer", fontSize: 20 };
const attachmentBox = { background: "#111827", border: "1px solid #1e293b", borderRadius: 12, padding: 14 };
const labelStyle = { display: "grid", gap: 7, color: "#cbd5e1", fontSize: 12 };
const inputStyle = { width: "100%", boxSizing: "border-box" as const, background: "#111827", border: "1px solid #334155", borderRadius: 9, color: "#f8fafc", padding: "10px" };
const primary = { border: 0, borderRadius: 10, background: "#2563eb", color: "#eff6ff", padding: "10px 14px", fontWeight: 700, cursor: "pointer" };
const secondary = { border: "1px solid #334155", borderRadius: 10, background: "transparent", color: "#cbd5e1", padding: "10px 14px", cursor: "pointer" };