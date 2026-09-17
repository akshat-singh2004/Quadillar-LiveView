import { useEffect, useState } from "react";
import { UploadModal } from "@/components/cde/UploadModal";
import { DocumentPreviewModal } from "@/components/cde/DocumentPreviewModal";
import type { AuditEvent, CdeItem, ChangeOrderRecord, RfiRecord } from "@/types/construction";

interface DetailDrawerProps {
  open: boolean;
  item: CdeItem | RfiRecord | ChangeOrderRecord | null;
  onClose: () => void;
  onCdeTransition?: (item: CdeItem) => Promise<void>;
  onRfiAction?: (item: RfiRecord, action: "answer" | "close" | "escalate", responseText?: string, estimatedCost?: number, delayDays?: number) => Promise<void>;
  onRfiAssignment?: (item: RfiRecord, ballInCourt: RfiRecord["ballInCourt"], currentOwner: string) => Promise<void>;
  onChangeOrderStatus?: (item: ChangeOrderRecord, status: ChangeOrderRecord["status"]) => Promise<void>;
  auditEvents?: AuditEvent[];
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

function getCdeNarrative(item: CdeItem) {
  const label =
    item.state === "Published"
      ? "GFC (Good For Construction / Site Ready)"
      : item.state === "Shared"
        ? "Under Coordination"
        : item.state === "WIP"
          ? "Draft (Not for Site)"
          : "Archived";

  if (item.state === "Published") {
    return `This drawing is ${label}. Site team can proceed with work without waiting for further review.`;
  }

  if (item.state === "Shared") {
    return `This drawing is ${label}. Coordination is still ongoing and site team should confirm before execution.`;
  }

  if (item.state === "WIP") {
    return `This drawing is still in ${label}. It is not approved for site use and should not be used on the ground.`;
  }

  return `This drawing has been archived and is no longer active for construction execution.`;
}

function getRfiNarrative(item: RfiRecord) {
  return `This site query is pending with ${item.ballInCourt}. The response is required to avoid delay to execution or procurement.`;
}

function getCoNarrative(item: ChangeOrderRecord) {
  const originalScope = Math.max(0, item.amount * 0.68);
  const addedWork = item.amount - originalScope;
  return `This extra work has been raised because the original scope is being revised. Client approval is required before execution.`;
}

export function DetailDrawer({ open, item, onClose, onCdeTransition, onRfiAction, onRfiAssignment, onChangeOrderStatus, auditEvents = [] }: DetailDrawerProps) {
  const [responseText, setResponseText] = useState("");
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [delayDays, setDelayDays] = useState(0);
  const [ballInCourt, setBallInCourt] = useState<RfiRecord["ballInCourt"]>("Consultant");
  const [currentOwner, setCurrentOwner] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ name: string; path: string; mimeType: string; fullPath?: string; publicUrl?: string; size: number; uploadedAt: string }>>([]);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const isCdeItem = Boolean(item && "container" in item);
  const isRfi = Boolean(item && "ballInCourt" in item);

  useEffect(() => {
    if (item && "ballInCourt" in item) {
      setBallInCourt(item.ballInCourt);
      setCurrentOwner(item.currentOwner);
    }
  }, [item]);

  if (!open || !item) return null;

  const isChangeOrder = "rfcId" in item;
  const cdeItem = item as CdeItem;
  const rfiItem = item as RfiRecord;
  const changeOrderItem = item as ChangeOrderRecord;

  const narrative = isCdeItem
    ? getCdeNarrative(cdeItem)
    : isRfi
      ? getRfiNarrative(rfiItem)
      : getCoNarrative(changeOrderItem);

  const statusTone = isCdeItem
    ? cdeItem.state === "Published"
      ? "green"
      : cdeItem.state === "Shared"
        ? "amber"
        : cdeItem.state === "WIP"
          ? "red"
          : "neutral"
    : isRfi
      ? rfiItem.status === "Closed"
        ? "green"
        : rfiItem.status === "PendingResponse"
          ? "amber"
          : "red"
      : changeOrderItem.status === "Approved"
        ? "green"
        : changeOrderItem.status === "AwaitingApproval"
          ? "amber"
          : "red";

  const toneColors: Record<string, string> = {
    green: "#e5e5e5",
    amber: "#d4d4d4",
    red: "#f5f5f5",
    neutral: "#a3a3a3",
  };

  const surfaceColors: Record<string, string> = {
    green: "rgba(255,255,255,0.06)",
    amber: "rgba(255,255,255,0.04)",
    red: "rgba(255,255,255,0.05)",
    neutral: "rgba(255,255,255,0.03)",
  };

  const changeOrderDetails = isChangeOrder
    ? {
        originalScope: Math.max(0, changeOrderItem.amount * 0.68),
        addedWork: changeOrderItem.amount - Math.max(0, changeOrderItem.amount * 0.68),
        delayDays: changeOrderItem.timeImpactDays,
      }
    : null;

  const runAction = async (action: () => Promise<void> | void) => {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  };

  const itemAuditEvents = auditEvents.filter((event) => event.documentReference === item.id);

  const openPreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  return (
    <>
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(9, 9, 11, 0.72)",
        backdropFilter: "blur(12px)",
        display: "flex",
        justifyContent: "flex-end",
        zIndex: 60,
      }}
      onClick={onClose}
    >
      <aside
        style={{
          width: "420px",
          maxWidth: "92vw",
          height: "100vh",
          background: "rgba(10, 10, 12, 0.96)",
          borderLeft: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "-24px 0 60px rgba(0,0,0,0.4)",
          padding: "18px 18px 22px",
          color: "#f5f5f5",
          overflowY: "auto",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: "#a1a1aa" }}>
            {isCdeItem ? "Drawing detail" : isRfi ? "Site inquiry" : "Extra work"}
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "#f5f5f5", borderRadius: 999, padding: "7px 12px", cursor: "pointer", fontSize: 11, fontWeight: 500 }}
          >
            Close
          </button>
        </div>

        <div
          style={{
            background: surfaceColors[statusTone] ?? "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: toneColors[statusTone] ?? "#f5f5f5",
            borderRadius: 18,
            padding: "14px 16px",
            marginBottom: 18,
            lineHeight: 1.5,
            fontSize: 14,
          }}
        >
          {narrative}
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 14 }}>
            <div style={{ color: "#a1a1aa", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Item</div>
            <div style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.04em" }}>{item.title}</div>
          </div>

          {isCdeItem && (
            <>
              <div style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 14 }}>
                <div style={{ color: "#a1a1aa", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Status</div>
                <div style={{ color: "#f5f5f5" }}>{cdeItem.state === "Published" ? "GFC / Site ready" : cdeItem.state === "Shared" ? "Under coordination" : cdeItem.state === "WIP" ? "Draft / not for site" : cdeItem.state}</div>
              </div>
              <div style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 14 }}>
                <div style={{ color: "#a1a1aa", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Impact</div>
                <div style={{ color: "#f5f5f5" }}>{cdeItem.state === "Published" ? "Proceed with execution." : cdeItem.state === "Shared" ? "Coordinate before execution." : "Do not use on site until approved."}</div>
              </div>
            </>
          )}

          {isRfi && (
            <>
              <div style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 14 }}>
                <div style={{ color: "#a1a1aa", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Pending with</div>
                <div style={{ color: "#f5f5f5" }}>{rfiItem.ballInCourt}</div>
              </div>
              <div style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 14 }}>
                <div style={{ color: "#a1a1aa", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Risk</div>
                <div style={{ color: "#f5f5f5" }}>{rfiItem.contractImpact} impact • Risk score {rfiItem.riskScore}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <select value={ballInCourt} onChange={(event) => setBallInCourt(event.target.value as RfiRecord["ballInCourt"])} style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f5f5", borderRadius: 10, padding: 10 }}>
                  {(["Contractor", "Consultant", "Client", "Supplier", "Designer"] as const).map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <input value={currentOwner} onChange={(event) => setCurrentOwner(event.target.value)} placeholder="Current owner" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f5f5", borderRadius: 10, padding: 10 }} />
              </div>
              <button disabled={busy || !currentOwner.trim()} type="button" onClick={() => void runAction(() => onRfiAssignment?.(rfiItem, ballInCourt, currentOwner.trim()))} style={{ background: "transparent", color: "#f5f5f5", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "9px 12px", cursor: "pointer", fontWeight: 700 }}>Save Ball-in-Court</button>
              <textarea value={responseText} onChange={(event) => setResponseText(event.target.value)} placeholder="Record the consultant or site response" rows={4} style={{ width: "100%", boxSizing: "border-box", background: "#111111", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f5f5", borderRadius: 10, padding: 12, resize: "vertical" }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <input type="number" min="0" value={estimatedCost || ""} onChange={(event) => setEstimatedCost(Number(event.target.value))} placeholder="Cost impact (INR)" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f5f5", borderRadius: 10, padding: 10 }} />
                <input type="number" min="0" value={delayDays || ""} onChange={(event) => setDelayDays(Number(event.target.value))} placeholder="Delay (days)" style={{ background: "#111111", border: "1px solid rgba(255,255,255,0.1)", color: "#f5f5f5", borderRadius: 10, padding: 10 }} />
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button disabled={busy} type="button" onClick={() => void runAction(() => onRfiAction?.(rfiItem, "answer", responseText, estimatedCost, delayDays))} style={{ background: "#f5f5f5", color: "#111111", border: "none", borderRadius: 10, padding: "9px 12px", cursor: "pointer", fontWeight: 700 }}>Submit response</button>
                <button disabled={busy} type="button" onClick={() => void runAction(() => onRfiAction?.(rfiItem, "close"))} style={{ background: "transparent", color: "#f5f5f5", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "9px 12px", cursor: "pointer", fontWeight: 700 }}>Close site query</button>
                <button disabled={busy} type="button" onClick={() => void runAction(() => onRfiAction?.(rfiItem, "escalate", responseText, estimatedCost, delayDays))} style={{ background: "transparent", color: "#f5f5f5", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, padding: "9px 12px", cursor: "pointer", fontWeight: 700 }}>Escalate variation</button>
              </div>
            </>
          )}

          {isChangeOrder && changeOrderDetails && (
            <>
              <div style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 14 }}>
                <div style={{ color: "#a1a1aa", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Original scope</div>
                <div style={{ color: "#f5f5f5" }}>{formatInrCurrency(changeOrderDetails.originalScope)}</div>
              </div>
              <div style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 14 }}>
                <div style={{ color: "#a1a1aa", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Added work</div>
                <div style={{ color: "#f5f5f5" }}>{formatInrCurrency(changeOrderDetails.addedWork)}</div>
              </div>
              <div style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 14 }}>
                <div style={{ color: "#a1a1aa", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Exact cost impact</div>
                <div style={{ color: "#f5f5f5" }}>{formatInrCurrency(item.amount)}</div>
              </div>
              <div style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)", borderRadius: 16, padding: 14 }}>
                <div style={{ color: "#a1a1aa", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}>Schedule delay</div>
                <div style={{ color: "#f5f5f5" }}>{changeOrderDetails.delayDays} days</div>
              </div>
            </>
          )}
        </div>

        <details style={{ marginTop: 18, border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14, padding: 12 }}>
          <summary style={{ cursor: "pointer", color: "#d4d4d8", fontWeight: 700 }}>ISO 19650 activity log ({itemAuditEvents.length})</summary>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {itemAuditEvents.length ? itemAuditEvents.map((event) => (
              <div key={event.id} style={{ borderLeft: "2px solid #52525b", paddingLeft: 10 }}>
                <div style={{ fontSize: 12, color: "#f5f5f5" }}>{event.action}</div>
                <div style={{ marginTop: 3, fontSize: 11, color: "#a1a1aa" }}>{event.actorName ?? event.role} • {new Date(event.timestamp).toLocaleString("en-IN")}</div>
                <div style={{ marginTop: 3, fontSize: 11, color: "#a1a1aa" }}>{event.previousStatus ?? "-"} → {event.nextStatus ?? "-"} {event.previousRevision || event.nextRevision ? `• ${event.previousRevision ?? "-"} → ${event.nextRevision ?? "-"}` : ""}</div>
              </div>
            )) : <div style={{ color: "#a1a1aa", fontSize: 12 }}>No recorded transitions for this item.</div>}
          </div>
        </details>

        <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
          <button type="button" onClick={() => setUploadOpen(true)} style={{ background: "#0ea5e9", color: "white", border: "none", borderRadius: 12, padding: "10px 14px", fontWeight: 700, cursor: "pointer" }}>Attach files</button>
          {attachments.length > 0 && (
            <div style={{ display: "grid", gap: 8 }}>
              {attachments.map((attachment) => (
                <button key={attachment.path} type="button" onClick={() => openPreview(attachment.publicUrl ?? attachment.fullPath ?? "")} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px", color: "#f5f5f5", textAlign: "left", cursor: "pointer" }}>
                  <div style={{ fontWeight: 700 }}>{attachment.name}</div>
                  <div style={{ marginTop: 4, color: "#a1a1aa", fontSize: 11 }}>{attachment.mimeType}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {isChangeOrder && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void runAction(() => onChangeOrderStatus?.(changeOrderItem, "Approved"))}
            style={{
              width: "100%",
              marginTop: 18,
              background: "rgba(255,255,255,0.08)",
              color: "#f5f5f5",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "12px 14px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Approve variation
          </button>
        )}
      </aside>
    </div>
    <UploadModal open={uploadOpen} bucket={isRfi ? "rfi-attachments" : "cde-documents"} onClose={() => setUploadOpen(false)} onUploadComplete={(entry) => { setAttachments((current) => [...current, entry]); setUploadOpen(false); }} />
    <DocumentPreviewModal open={previewOpen} url={previewUrl} onClose={() => setPreviewOpen(false)} fileName={attachments.find((item) => item.publicUrl === previewUrl || item.fullPath === previewUrl)?.name ?? "document-preview"} />
    </>
  );
}
