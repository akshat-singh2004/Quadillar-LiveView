"use client";

import React, { useEffect, useState } from "react";
import { UploadModal } from "@/components/cde/UploadModal";
import { DocumentPreviewModal } from "@/components/cde/DocumentPreviewModal";
import type { AuditEvent, CdeItem, ChangeOrderRecord, RfiRecord } from "@/types/construction";
import {
  X,
  Send,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ArrowRight,
  Upload,
  FileText,
  Clock,
  Layers,
  IndianRupee,
  FileCheck2,
  UserCheck,
} from "lucide-react";

interface DetailDrawerProps {
  open: boolean;
  item: CdeItem | RfiRecord | ChangeOrderRecord | null;
  onClose: () => void;
  onCdeTransition?: (item: CdeItem) => Promise<void>;
  onRfiAction?: (
    item: RfiRecord,
    action: "answer" | "close" | "escalate",
    responseText?: string,
    estimatedCost?: number,
    delayDays?: number
  ) => Promise<void>;
  onRfiAssignment?: (
    item: RfiRecord,
    ballInCourt: RfiRecord["ballInCourt"],
    currentOwner: string
  ) => Promise<void>;
  onChangeOrderStatus?: (
    item: ChangeOrderRecord,
    status: ChangeOrderRecord["status"]
  ) => Promise<void>;
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
  return `This extra work has been raised because the original scope is being revised. Client approval is required before execution.`;
}

export function DetailDrawer({
  open,
  item,
  onClose,
  onCdeTransition,
  onRfiAction,
  onRfiAssignment,
  onChangeOrderStatus,
  auditEvents = [],
}: DetailDrawerProps) {
  const [responseText, setResponseText] = useState("");
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [delayDays, setDelayDays] = useState(0);
  const [ballInCourt, setBallInCourt] = useState<RfiRecord["ballInCourt"]>("Consultant");
  const [currentOwner, setCurrentOwner] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [attachments, setAttachments] = useState<
    Array<{
      name: string;
      path: string;
      mimeType: string;
      fullPath?: string;
      publicUrl?: string;
      size: number;
      uploadedAt: string;
    }>
  >([]);
  const [previewUrl, setPreviewUrl] = useState<string>("");

  useEffect(() => {
    if (item && "ballInCourt" in item) {
      setBallInCourt(item.ballInCourt);
      setCurrentOwner(item.currentOwner);
    }
  }, [item]);

  if (!open || !item) return null;

  const isCdeItem = Boolean("container" in item);
  const isRfi = Boolean("ballInCourt" in item);
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

  const changeOrderDetails = isChangeOrder
    ? {
        originalScope: Math.max(0, changeOrderItem.amount * 0.68),
        addedWork: changeOrderItem.amount - Math.max(0, changeOrderItem.amount * 0.68),
        delayDays: changeOrderItem.timeImpactDays,
      }
    : null;

  const runAction = async (action: () => Promise<void> | void) => {
    setBusy(true);
    try {
      await action();
    } finally {
      setBusy(false);
    }
  };

  const itemAuditEvents = auditEvents.filter((event) => event.documentReference === item.id);

  const openPreview = (url: string) => {
    setPreviewUrl(url);
    setPreviewOpen(true);
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end font-mono text-xs select-none"
        onClick={onClose}
      >
        <aside
          className="w-full max-w-md h-full bg-zinc-950 border-l border-zinc-800 p-6 flex flex-col justify-between overflow-y-auto shadow-2xl text-zinc-100"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="space-y-4">
            {/* DRAWER HEADER */}
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">
                {isCdeItem ? "Drawing Specification" : isRfi ? "Field Technical Query" : "Contract Variation"}
              </span>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STATUS NARRATIVE BANNER */}
            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed font-sans ${
                statusTone === "green"
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-300"
                  : statusTone === "amber"
                  ? "bg-amber-950/60 border-amber-800 text-amber-300"
                  : statusTone === "red"
                  ? "bg-rose-950/60 border-rose-800 text-rose-300"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300"
              }`}
            >
              {narrative}
            </div>

            {/* TITLE & IDENTITY */}
            <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3.5 space-y-1">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">Entity Title</span>
              <h3 className="text-base font-bold text-white tracking-tight">{item.title}</h3>
            </div>

            {/* CDE SPECIFICS */}
            {isCdeItem && (
              <div className="space-y-3">
                <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Workflow State</span>
                  <div className="text-zinc-200 font-bold text-sm">
                    {cdeItem.state === "Published"
                      ? "GFC • Site Ready"
                      : cdeItem.state === "Shared"
                      ? "Under Coordination"
                      : cdeItem.state === "WIP"
                      ? "Draft • Not for Site"
                      : cdeItem.state}
                  </div>
                </div>

                <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3.5">
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Execution Directive</span>
                  <div className="text-zinc-300 text-xs">
                    {cdeItem.state === "Published"
                      ? "Proceed with fabrication, shuttering and execution."
                      : cdeItem.state === "Shared"
                      ? "Hold for final MEP coordination sign-off."
                      : "Strictly prohibited from site execution until approved."}
                  </div>
                </div>
              </div>
            )}

            {/* RFI SPECIFICS & CONTROLS */}
            {isRfi && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3">
                    <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Pending With</span>
                    <span className="text-cyan-400 font-bold">{rfiItem.ballInCourt}</span>
                  </div>
                  <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3">
                    <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Contract Impact</span>
                    <span className="text-amber-400 font-bold">{rfiItem.contractImpact}</span>
                  </div>
                </div>

                {/* Delegation Controls */}
                <div className="p-3.5 bg-zinc-900/70 border border-zinc-800 rounded-xl space-y-2.5">
                  <span className="text-[10px] uppercase text-zinc-400 font-bold block">Reassign Ball-in-Court</span>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={ballInCourt}
                      onChange={(e) => setBallInCourt(e.target.value as RfiRecord["ballInCourt"])}
                      className="bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-200 rounded outline-none"
                    >
                      {(["Contractor", "Consultant", "Client", "Supplier", "Designer"] as const).map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                    <input
                      value={currentOwner}
                      onChange={(e) => setCurrentOwner(e.target.value)}
                      placeholder="Current Owner Name"
                      className="bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-200 rounded outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    disabled={busy || !currentOwner.trim()}
                    onClick={() => void runAction(() => onRfiAssignment?.(rfiItem, ballInCourt, currentOwner.trim()))}
                    className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold uppercase rounded transition disabled:opacity-50"
                  >
                    Commit Assignment
                  </button>
                </div>

                {/* Response Input */}
                <div className="space-y-2">
                  <label className="block text-[10px] uppercase text-zinc-400 font-bold">Engineering Clarification</label>
                  <textarea
                    value={responseText}
                    onChange={(e) => setResponseText(e.target.value)}
                    rows={3}
                    placeholder="Record consultant directive or structural instruction..."
                    className="w-full bg-zinc-900 border border-zinc-800 p-2.5 text-zinc-100 rounded outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    min="0"
                    value={estimatedCost || ""}
                    onChange={(e) => setEstimatedCost(Number(e.target.value))}
                    placeholder="Cost Impact (₹)"
                    className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none tabular-nums text-right"
                  />
                  <input
                    type="number"
                    min="0"
                    value={delayDays || ""}
                    onChange={(e) => setDelayDays(Number(e.target.value))}
                    placeholder="Delay Impact (Days)"
                    className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none tabular-nums text-right"
                  />
                </div>

                <div className="flex gap-2 flex-wrap pt-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction(() => onRfiAction?.(rfiItem, "answer", responseText, estimatedCost, delayDays))}
                    className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded transition"
                  >
                    Submit Response
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void runAction(() => onRfiAction?.(rfiItem, "close"))}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded transition"
                  >
                    Close RFI
                  </button>
                </div>
              </div>
            )}

            {/* CHANGE ORDER SPECIFICS */}
            {isChangeOrder && changeOrderDetails && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3">
                  <span className="text-[10px] text-zinc-500 uppercase block font-bold mb-0.5">Original Scope</span>
                  <span className="text-zinc-200 font-bold">{formatInrCurrency(changeOrderDetails.originalScope)}</span>
                </div>
                <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3">
                  <span className="text-[10px] text-zinc-500 uppercase block font-bold mb-0.5">Added Scope</span>
                  <span className="text-cyan-400 font-bold">{formatInrCurrency(changeOrderDetails.addedWork)}</span>
                </div>
                <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3">
                  <span className="text-[10px] text-zinc-500 uppercase block font-bold mb-0.5">Exact Amount</span>
                  <span className="text-emerald-400 font-bold">{formatInrCurrency(changeOrderItem.amount)}</span>
                </div>
                <div className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3">
                  <span className="text-[10px] text-zinc-500 uppercase block font-bold mb-0.5">Time Impact</span>
                  <span className="text-amber-400 font-bold">{changeOrderDetails.delayDays} Days</span>
                </div>
              </div>
            )}

            {/* AUDIT LOG DISCLOSURE */}
            <details className="border border-zinc-800 bg-zinc-900/40 rounded-xl p-3 cursor-pointer">
              <summary className="text-zinc-300 font-bold uppercase text-[10px] tracking-wider">
                ISO 19650 Audit Trail ({itemAuditEvents.length})
              </summary>
              <div className="space-y-2.5 mt-3 pt-2 border-t border-zinc-800/80">
                {itemAuditEvents.length ? (
                  itemAuditEvents.map((event) => (
                    <div key={event.id} className="border-l-2 border-cyan-500 pl-2.5 py-0.5">
                      <div className="text-white font-semibold text-[11px]">{event.action}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">
                        {event.actorName ?? event.role} • {new Date(event.timestamp).toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-zinc-500 text-[10px]">Zero audit records for this item.</div>
                )}
              </div>
            </details>

            {/* ATTACHMENT INGRESS */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase text-zinc-400 font-bold">Attached Documents</span>
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-[10px] font-bold uppercase transition"
                >
                  + Add File
                </button>
              </div>

              {attachments.length > 0 && (
                <div className="space-y-1.5">
                  {attachments.map((att) => (
                    <div
                      key={att.path}
                      onClick={() => openPreview(att.publicUrl ?? att.fullPath ?? "")}
                      className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between cursor-pointer hover:border-zinc-700 transition"
                    >
                      <div className="truncate max-w-xs font-semibold text-zinc-200">{att.name}</div>
                      <span className="text-[10px] text-cyan-400 uppercase">{att.mimeType.split("/")[1] || "doc"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          {isChangeOrder && (
            <div className="pt-4 border-t border-zinc-800">
              <button
                type="button"
                disabled={busy}
                onClick={() => void runAction(() => onChangeOrderStatus?.(changeOrderItem, "Approved"))}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded transition shadow-lg shadow-emerald-950/50"
              >
                Authorize Contract Variation
              </button>
            </div>
          )}
        </aside>
      </div>

      <UploadModal
        open={uploadOpen}
        bucket={isRfi ? "rfi-attachments" : "cde-documents"}
        onClose={() => setUploadOpen(false)}
        onUploadComplete={(entry) => {
          setAttachments((curr) => [...curr, entry]);
          setUploadOpen(false);
        }}
      />

      <DocumentPreviewModal
        open={previewOpen}
        url={previewUrl}
        onClose={() => setPreviewOpen(false)}
        fileName={
          attachments.find((item) => item.publicUrl === previewUrl || item.fullPath === previewUrl)?.name ??
          "document-preview"
        }
      />
    </>
  );
}

export default DetailDrawer;
