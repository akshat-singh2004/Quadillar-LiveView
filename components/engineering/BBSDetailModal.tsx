"use client";

import { useMemo, useState } from "react";
import type { BbsBarRecord, BbsShape } from "@/types/construction";

export function BBSDetailModal({ bar, onClose, onSave }: { bar: BbsBarRecord; onClose: () => void; onSave: (bar: BbsBarRecord) => void }) {
  const [quantity, setQuantity] = useState(bar.quantity);
  const [length, setLength] = useState(bar.cuttingLengthM);
  const [shape, setShape] = useState<BbsShape>(bar.shape);
  const weight = useMemo(() => (bar.diameterMm ** 2 / 162) * length * quantity, [bar.diameterMm, length, quantity]);
  return <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="BBS bar detail"><div style={modalStyle}><header style={headerStyle}><div><div style={eyebrowStyle}>Digital bar bending schedule</div><h2 style={{ margin: "7px 0 0", fontSize: 25 }}>{bar.barMark} · {bar.diameterMm}mm bar</h2><div style={mutedStyle}>{bar.drawingSheet}</div></div><button type="button" onClick={onClose} style={closeStyle}>×</button></header><div style={shapeGrid}>{(["Straight", "L-Bend", "Rectangular Stirrups", "Circular Rings", "Foundation Chairs"] as BbsShape[]).map((item) => <button type="button" key={item} onClick={() => setShape(item)} style={{ ...shapeButton, borderColor: shape === item ? "#22d3ee" : "#334155", color: shape === item ? "#67e8f9" : "#cbd5e1" }}>{item}</button>)}</div><div style={formGrid}><label style={labelStyle}>Quantity<input type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} style={inputStyle} /></label><label style={labelStyle}>Cutting length (m)<input type="number" min="0" step="0.01" value={length} onChange={(event) => setLength(Number(event.target.value))} style={inputStyle} /></label></div><div style={formulaStyle}><div style={eyebrowStyle}>Calculated steel weight</div><div style={{ marginTop: 8, fontSize: 34, fontWeight: 900, color: "#a7f3d0" }}>{weight.toFixed(2)} kg</div><div style={mutedStyle}>Weight = d² / 162 × length × quantity = {bar.diameterMm}² / 162 × {length} × {quantity}</div></div><button type="button" onClick={() => onSave({ ...bar, quantity, cuttingLengthM: length, shape, steelWeightKg: weight, status: "Cutting List Generated" })} style={primaryButton}>Save cutting list line</button></div></div>;
}
const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 50, display: "grid", placeItems: "center", padding: 18, background: "rgba(2,6,23,.82)" };
const modalStyle: React.CSSProperties = { width: "min(680px, 100%)", background: "#07111f", border: "1px solid #334155", borderRadius: 16, padding: 22, color: "#f8fafc" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 800 };
const mutedStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 12, marginTop: 5 };
const closeStyle: React.CSSProperties = { background: "transparent", border: "1px solid #334155", color: "#cbd5e1", borderRadius: 8, fontSize: 22, width: 34, height: 34, cursor: "pointer" };
const shapeGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(125px, 1fr))", gap: 8, marginTop: 20 };
const shapeButton: React.CSSProperties = { background: "#0f172a", border: "1px solid", borderRadius: 8, padding: "9px 7px", fontSize: 11, cursor: "pointer" };
const formGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 18 };
const labelStyle: React.CSSProperties = { display: "grid", gap: 6, color: "#94a3b8", fontSize: 11, textTransform: "uppercase", letterSpacing: ".08em" };
const inputStyle: React.CSSProperties = { background: "#0f172a", border: "1px solid #334155", color: "#f8fafc", borderRadius: 8, padding: 10 };
const formulaStyle: React.CSSProperties = { marginTop: 18, padding: 16, background: "#052e2b", border: "1px solid #10b981", borderRadius: 10 };
const primaryButton: React.CSSProperties = { width: "100%", marginTop: 20, background: "#34d399", color: "#052e16", border: 0, borderRadius: 8, padding: 12, fontWeight: 900, cursor: "pointer" };
