import { useMemo } from "react";

export interface WhatsAppShareMetrics {
  activeGfcDrawings: number;
  openQueries: Array<{ title: string; dueAt: string; owner: string }>;
  pendingVariationTotal: number;
  concreteStatus: string;
}

interface WhatsAppShareModalProps {
  open: boolean;
  onClose: () => void;
  metrics: WhatsAppShareMetrics;
}

function formatInrCurrency(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function WhatsAppShareModal({ open, onClose, metrics }: WhatsAppShareModalProps) {
  const summaryText = useMemo(() => {
    const queryLines = metrics.openQueries.length
      ? metrics.openQueries.map((entry) => `- ${entry.title} (${entry.owner}) — due ${new Date(entry.dueAt).toLocaleDateString("en-IN")}`).join("\n")
      : "- No open queries";

    return [
      "*Project Status Update — Quadillar LiveView*",
      `*Active GFC Drawings:* ${metrics.activeGfcDrawings}`,
      `*Action Pending With:*\n${queryLines}`,
      `*Extra Work / Variations Pending Owner Sign-off:* ${formatInrCurrency(metrics.pendingVariationTotal)}`,
      `*Concrete Cube Test Status:* ${metrics.concreteStatus}`,
      "",
      "Please review the latest site status and approval queue before execution.",
    ].join("\n");
  }, [metrics]);

  if (!open) return null;

  const sendOnWhatsApp = () => {
    const url = `https://wa.me/?text=${encodeURIComponent(summaryText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(2, 6, 23, 0.7)",
        display: "grid",
        placeItems: "center",
        zIndex: 60,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(680px, 92vw)",
          background: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 20,
          padding: 24,
          color: "#e2e8f0",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.5)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 26 }}>Daily Site Summary</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "#111827", border: "1px solid #334155", color: "#f8fafc", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
          >
            Close
          </button>
        </div>

        <pre style={{ whiteSpace: "pre-wrap", background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 16, color: "#dbeafe", fontFamily: "inherit", overflowX: "auto" }}>
          {summaryText}
        </pre>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 18, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "#111827", border: "1px solid #334155", color: "#f8fafc", borderRadius: 10, padding: "10px 14px", cursor: "pointer" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={sendOnWhatsApp}
            style={{ background: "#22c55e", color: "#052e16", border: "none", borderRadius: 10, padding: "10px 16px", cursor: "pointer", fontWeight: 800 }}
          >
            Share via WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}
