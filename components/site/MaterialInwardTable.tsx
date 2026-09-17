"use client";

import { useMemo, useRef, useState } from "react";
import { createMaterialInwardRecord } from "@/app/lib/services";
import type { MaterialCategory, MaterialInwardRecord, MaterialQualityStatus } from "@/types/construction";

const categories: MaterialCategory[] = ["Cement", "Reinforcement Steel", "RMC Concrete", "Aggregates", "Finishes"];
const qualityStatuses: MaterialQualityStatus[] = ["Pending Lab Test", "Passed", "Failed", "Not Required"];

type MaterialInwardTableProps = {
  initialRecords: MaterialInwardRecord[];
};

export function MaterialInwardTable({ initialRecords }: MaterialInwardTableProps) {
  const [records, setRecords] = useState(initialRecords);
  const [category, setCategory] = useState<MaterialCategory | "All">("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [preview, setPreview] = useState<MaterialInwardRecord | null>(null);
  const [form, setForm] = useState({ challanNumber: "", supplier: "", category: "Cement" as MaterialCategory, materialName: "", quantity: "", unit: "Bags", qualityStatus: "Pending Lab Test" as MaterialQualityStatus, mtcFileName: "" });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const filtered = useMemo(() => category === "All" ? records : records.filter((item) => item.category === category), [category, records]);
  const steelTotal = records.filter((item) => item.category === "Reinforcement Steel" && item.unit === "MT").reduce((sum, item) => sum + item.quantity, 0);
  const cementStock = records.filter((item) => item.category === "Cement" && item.qualityStatus !== "Failed").reduce((sum, item) => sum + item.quantity, 0);
  const pendingTests = records.filter((item) => item.qualityStatus === "Pending Lab Test").length;

  const submit = async () => {
    const record: MaterialInwardRecord = {
      id: `mir-${Date.now()}`,
      projectId: "proj-1",
      inwardDate: new Date().toISOString(),
      challanNumber: form.challanNumber || `CH-${Date.now().toString().slice(-4)}`,
      supplier: form.supplier || "Unspecified supplier",
      category: form.category,
      materialName: form.materialName || form.category,
      quantity: Number(form.quantity) || 0,
      unit: form.unit,
      qualityStatus: form.qualityStatus,
      mtcFileName: form.mtcFileName || undefined,
      receivedBy: "Store Officer",
      createdAt: new Date().toISOString(),
    };
    const saved = await createMaterialInwardRecord(record);
    if (saved) setRecords((current) => [saved, ...current]);
    setModalOpen(false);
    setForm({ challanNumber: "", supplier: "", category: "Cement", materialName: "", quantity: "", unit: "Bags", qualityStatus: "Pending Lab Test", mtcFileName: "" });
  };

  return (
    <div style={{ display: "grid", gap: 20 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
        {[{ label: "Total Steel Inward", value: `${steelTotal.toFixed(1)} MT` }, { label: "Cement Stock", value: `${cementStock.toLocaleString()} Bags` }, { label: "Pending Quality Tests", value: String(pendingTests) }].map((card) => (
          <div key={card.label} style={cardStyle}><div style={eyebrowStyle}>{card.label}</div><div style={valueStyle}>{card.value}</div></div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {(["All", ...categories] as const).map((item) => <button type="button" key={item} onClick={() => setCategory(item)} style={{ ...tagStyle, background: category === item ? "#0ea5e9" : "rgba(255,255,255,0.04)", color: category === item ? "#082f49" : "#cbd5e1" }}>{item}</button>)}
        <button type="button" onClick={() => setModalOpen(true)} style={{ ...tagStyle, marginLeft: "auto", background: "#2563eb", color: "#eff6ff", borderColor: "transparent" }}>+ Log material inward</button>
      </div>

      <div style={{ overflowX: "auto", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 18 }}>
        <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
          <thead><tr>{["Date", "Challan", "Material / Category", "Supplier", "Quantity", "Quality", "MTC", "Received by"].map((heading) => <th key={heading} style={thStyle}>{heading}</th>)}</tr></thead>
          <tbody>{filtered.map((item) => <tr key={item.id}>
            <td style={tdStyle}>{new Date(item.inwardDate).toLocaleDateString("en-IN")}</td>
            <td style={{ ...tdStyle, fontWeight: 700, color: "#f8fafc" }}>{item.challanNumber}</td>
            <td style={tdStyle}><div style={{ color: "#f8fafc", fontWeight: 700 }}>{item.materialName}</div><div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{item.category}</div></td>
            <td style={tdStyle}>{item.supplier}</td><td style={tdStyle}>{item.quantity} {item.unit}</td>
            <td style={tdStyle}><span style={{ ...statusBadge, color: item.qualityStatus === "Passed" ? "#86efac" : item.qualityStatus === "Failed" ? "#fca5a5" : "#fde68a" }}>{item.qualityStatus}</span></td>
            <td style={tdStyle}>{item.mtcFileUrl || item.mtcFileName ? <button type="button" onClick={() => setPreview(item)} style={linkButton}>Preview MTC</button> : <span style={{ color: "#64748b" }}>Not attached</span>}</td>
            <td style={tdStyle}>{item.receivedBy}</td>
          </tr>)}</tbody>
        </table>
      </div>

      {modalOpen && <div style={overlayStyle}><div style={modalStyle}><div style={modalHeader}><div><div style={eyebrowStyle}>Material inward register</div><h2 style={{ margin: "6px 0 0", fontSize: 24 }}>Log delivery</h2></div><button type="button" onClick={() => setModalOpen(false)} style={closeButton}>×</button></div><div style={formGrid}>
        {[["Challan #", "challanNumber"], ["Supplier", "supplier"], ["Material name", "materialName"], ["Quantity", "quantity"], ["Unit", "unit"]].map(([label, key]) => <label key={key} style={labelStyle}>{label}<input value={form[key as keyof typeof form] as string} onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))} style={inputStyle} /></label>)}
        <label style={labelStyle}>Category<select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as MaterialCategory }))} style={inputStyle}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label style={labelStyle}>Quality inspection<select value={form.qualityStatus} onChange={(event) => setForm((current) => ({ ...current, qualityStatus: event.target.value as MaterialQualityStatus }))} style={inputStyle}>{qualityStatuses.map((item) => <option key={item}>{item}</option>)}</select></label>
        <label style={labelStyle}>Mill Test Certificate<input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(event) => setForm((current) => ({ ...current, mtcFileName: event.target.files?.[0]?.name ?? "" }))} style={{ ...inputStyle, padding: 8 }} /></label>
      </div><div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}><button type="button" onClick={() => setModalOpen(false)} style={secondaryButton}>Cancel</button><button type="button" onClick={() => void submit()} style={primaryButton}>Save inward entry</button></div></div></div>}
      {preview && <div style={overlayStyle} onClick={() => setPreview(null)}><div style={{ ...modalStyle, maxWidth: 720 }} onClick={(event) => event.stopPropagation()}><div style={modalHeader}><div><div style={eyebrowStyle}>Certificate preview</div><h2 style={{ margin: "6px 0 0", fontSize: 24 }}>{preview.mtcFileName ?? "MTC attachment"}</h2></div><button type="button" onClick={() => setPreview(null)} style={closeButton}>×</button></div>{preview.mtcFileUrl ? <iframe title="Mill Test Certificate" src={preview.mtcFileUrl} style={{ width: "100%", height: 440, border: "1px solid #334155", borderRadius: 12 }} /> : <div style={{ padding: 40, textAlign: "center", color: "#cbd5e1", background: "#111827", borderRadius: 12 }}>Local attachment recorded as <strong>{preview.mtcFileName}</strong>. Upload storage integration will provide a preview URL when connected.</div>}</div></div>}
    </div>
  );
}

const cardStyle = { background: "#111827", border: "1px solid #1e293b", borderRadius: 16, padding: 16 };
const eyebrowStyle = { color: "#94a3b8", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" as const };
const valueStyle = { marginTop: 12, color: "#f8fafc", fontSize: 26, fontWeight: 800 };
const tagStyle = { border: "1px solid rgba(148,163,184,0.2)", borderRadius: 999, padding: "9px 12px", fontSize: 12, cursor: "pointer" };
const thStyle = { padding: "13px 14px", textAlign: "left" as const, color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" as const, borderBottom: "1px solid rgba(148,163,184,0.18)" };
const tdStyle = { padding: "14px", color: "#cbd5e1", borderBottom: "1px solid rgba(148,163,184,0.1)", fontSize: 13 };
const statusBadge = { display: "inline-flex", padding: "6px 9px", borderRadius: 999, background: "rgba(255,255,255,0.05)", fontSize: 11 };
const linkButton = { background: "transparent", border: 0, color: "#7dd3fc", cursor: "pointer", padding: 0 };
const overlayStyle = { position: "fixed" as const, inset: 0, zIndex: 100, display: "grid", placeItems: "center", padding: 20, background: "rgba(2,6,23,0.78)" };
const modalStyle = { width: "min(820px, 100%)", maxHeight: "90vh", overflow: "auto" as const, background: "#0b1220", border: "1px solid #334155", borderRadius: 20, padding: 22, color: "#e2e8f0" };
const modalHeader = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 };
const closeButton = { width: 34, height: 34, borderRadius: 999, border: "1px solid #334155", background: "transparent", color: "#f8fafc", cursor: "pointer", fontSize: 20 };
const formGrid = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14, marginTop: 20 };
const labelStyle = { display: "grid", gap: 7, color: "#cbd5e1", fontSize: 12 };
const inputStyle = { width: "100%", boxSizing: "border-box" as const, border: "1px solid #334155", borderRadius: 10, background: "#111827", color: "#f8fafc", padding: "10px 11px" };
const primaryButton = { border: 0, borderRadius: 10, background: "#2563eb", color: "#eff6ff", padding: "10px 14px", fontWeight: 700, cursor: "pointer" };
const secondaryButton = { border: "1px solid #334155", borderRadius: 10, background: "transparent", color: "#cbd5e1", padding: "10px 14px", cursor: "pointer" };
