"use client";

import { useMemo, useState } from "react";

interface DocumentPreviewModalProps {
  open: boolean;
  url: string;
  fileName?: string;
  onClose: () => void;
}

export function DocumentPreviewModal({ open, url, fileName = "document-preview", onClose }: DocumentPreviewModalProps) {
  const [zoom, setZoom] = useState(1);
  const isImage = /(png|jpe?g|gif|webp)/i.test(url || "") || /image\//i.test(url || "");

  const objectUrl = useMemo(() => {
    if (!url) return "";
    return url.startsWith("http") ? url : url;
  }, [url]);

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(9,9,11,0.82)", backdropFilter: "blur(10px)", zIndex: 90, display: "grid", placeItems: "center", padding: 20 }} onClick={onClose}>
      <div style={{ width: 980, maxWidth: "100%", height: "86vh", background: "rgba(15,23,42,0.98)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 22, overflow: "hidden", color: "#e2e8f0" }} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: 16, borderBottom: "1px solid rgba(148,163,184,0.18)" }}>
          <div style={{ fontWeight: 700 }}>{fileName}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={() => setZoom((value) => Math.max(0.6, Number((value - 0.2).toFixed(1))))} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.18)", color: "#e2e8f0", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>-</button>
            <span style={{ fontSize: 12, color: "#cbd5e1" }}>{zoom.toFixed(1)}x</span>
            <button type="button" onClick={() => setZoom((value) => Math.min(3, Number((value + 0.2).toFixed(1))))} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.18)", color: "#e2e8f0", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>+</button>
            <button type="button" onClick={onClose} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.18)", color: "#e2e8f0", borderRadius: 10, padding: "8px 10px", cursor: "pointer" }}>Close</button>
          </div>
        </div>

        <div style={{ height: "calc(100% - 68px)", overflow: "auto", background: "rgba(15,23,42,0.7)", display: "grid", placeItems: "center", padding: 18 }}>
          {objectUrl ? (
            isImage ? (
              <img src={objectUrl} alt={fileName} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", transform: `scale(${zoom})`, transformOrigin: "center center", transition: "transform 0.15s ease" }} />
            ) : (
              <iframe src={objectUrl} title={fileName} style={{ width: "100%", height: "100%", border: "none", background: "white" }} />
            )
          ) : (
            <div style={{ color: "#94a3b8" }}>No preview available for this document.</div>
          )}
        </div>
      </div>
    </div>
  );
}
