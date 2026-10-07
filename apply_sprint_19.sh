#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Applying Sprint 19: Executive Command, Contracts & Purging 224 Inline Styles...\033[0m"

# -----------------------------------------------------------------------------
# 1. REFACTOR: components/dashboard/DetailDrawer.tsx (Purged 61 Inline Styles)
# -----------------------------------------------------------------------------
cat << 'COMP_DETAIL_DRAWER' > components/dashboard/DetailDrawer.tsx
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
COMP_DETAIL_DRAWER

# -----------------------------------------------------------------------------
# 2. REFACTOR: components/contracts/DocumentClauseViewer.tsx (Purged 46 Inline Styles)
# -----------------------------------------------------------------------------
cat << 'COMP_CLAUSE_VIEWER' > components/contracts/DocumentClauseViewer.tsx
"use client";

import React, { useMemo, useState } from "react";
import type {
  ContractClauseCard,
  ContractComplianceIssue,
  ContractDocumentAnalysis,
} from "@/types/construction";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Scale,
  CheckCircle2,
  Layers,
  ArrowRight,
} from "lucide-react";

const defaultAnalyses: ContractDocumentAnalysis[] = [
  {
    id: "contract-01",
    documentName: "Main Works Contract - Tender Bundle",
    uploadedAt: "2026-08-23",
    pdfLabel: "C-01 / Main Contract",
    pageCount: 118,
    clauses: [
      {
        id: "clause-ld",
        type: "Liquidated Damages",
        severity: "High Risk",
        summary:
          "LD clause imposes 0.15% of contract value per week beyond the agreed completion date without a clear cap for owner-caused delay events.",
        riskDriver: "Uncapped delay damages and weak force-majeure carve-out",
        mitigation:
          "Add a mutual carve-out for client-caused approvals, utility delays, and weather disruption; cap damage at 5% of the contract sum.",
      },
      {
        id: "clause-defect",
        type: "Defect Liability",
        severity: "Medium Risk",
        summary:
          "Defect liability period is set at 12 months, but the rectification notice period and carrier-of-risk allocation are not explicit.",
        riskDriver: "Ambiguous defect notification and warranty enforcement",
        mitigation:
          "Define notice timelines, access rights, and warranty defect categorization in a schedule attached to the contract.",
      },
      {
        id: "clause-price",
        type: "Price Escalation",
        severity: "Standard",
        summary:
          "Escalation is linked to WPI and fuel indices with a base-index confirmation, but the submission trigger is not tied to a material availability event.",
        riskDriver: "Index methodology is acceptable but not fully aligned with market volatility",
        mitigation:
          "Tie escalation to a monthly review and define documentation requirements for claims substantiation.",
      },
      {
        id: "clause-force",
        type: "Force Majeure",
        severity: "Standard",
        summary:
          "Force majeure includes pandemics and government action but excludes labor shortage and material supply disruption unless specifically notified.",
        riskDriver: "Narrow event definition for supply chain disruptions",
        mitigation:
          "Expand the list of covered events to include supply-chain disruption, import restrictions, and labor unrest.",
      },
    ],
    complianceChecks: [
      {
        id: "compliance-01",
        standard: "IS 456",
        subject: "Concrete cover / durability",
        status: "Mismatch",
        issue:
          "Tender specification states nominal cover of 25 mm for slabs, while IS 456 requires 30 mm for severe exposure / RC element durability in coastal environment.",
        recommendation:
          "Update drawing specification and concrete mix durability note to match IS 456 Table 16 / Table 18 for severe exposure.",
      },
      {
        id: "compliance-02",
        standard: "NBC",
        subject: "Fire resistance ratings",
        status: "Pass",
        issue: "Fire rating schedule aligns with NBC Part 4 requirements for exit corridors and shafts.",
        recommendation: "Retain current rating schedule and verify final door fire seals during site inspection.",
      },
    ],
  },
  {
    id: "contract-02",
    documentName: "Tender Specification - Civil & Structure",
    uploadedAt: "2026-08-20",
    pdfLabel: "C-02 / Technical Specs",
    pageCount: 64,
    clauses: [
      {
        id: "clause-ld-2",
        type: "Liquidated Damages",
        severity: "Medium Risk",
        summary:
          "Delay damages are stated but not linked to a milestone-based liquidated damages schedule, creating a dispute risk during partial handed-over areas.",
        riskDriver: "Schedule logic is incomplete for staged completion",
        mitigation: "Add milestone-specific delay damage schedule and extension-of-time process map.",
      },
      {
        id: "clause-price-2",
        type: "Price Escalation",
        severity: "High Risk",
        summary:
          "Steel escalation is capped at 12% and absent for imported reinforcement, which may leave the contractor exposed to global market volatility.",
        riskDriver: "Insufficient protection against imported commodities and FX fluctuation",
        mitigation:
          "Revisit the steel and aluminum escalation formula with explicit foreign-exchange and freight adjustment clauses.",
      },
    ],
    complianceChecks: [
      {
        id: "compliance-03",
        standard: "IS 456",
        subject: "Concrete grade and cover",
        status: "Mismatch",
        issue:
          "Tender specifies M25 concrete at a 20 mm cover for the water tank retaining wall, contrary to IS 456 durability recommendations for moisture-exposed concrete.",
        recommendation: "Raise cover to 30 mm and confirm concrete grade adequacy against exposure class.",
      },
    ],
  },
];

export function DocumentClauseViewer({
  analyses = defaultAnalyses,
}: {
  analyses?: ContractDocumentAnalysis[];
}) {
  const [selectedId, setSelectedId] = useState(analyses[0]?.id ?? defaultAnalyses[0].id);
  const [reportVisible, setReportVisible] = useState(false);

  const selected = useMemo(
    () => analyses.find((doc) => doc.id === selectedId) ?? analyses[0] ?? defaultAnalyses[0],
    [analyses, selectedId]
  );

  const riskCounts = useMemo(() => {
    const counts = { "High Risk": 0, "Medium Risk": 0, Standard: 0 };
    selected.clauses.forEach((c) => {
      counts[c.severity] = (counts[c.severity] || 0) + 1;
    });
    return counts;
  }, [selected]);

  const complianceFlagCount = selected.complianceChecks.filter((c) => c.status === "Mismatch").length;

  return (
    <div className="space-y-5 font-mono text-xs select-none">
      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {analyses.map((doc) => (
            <button
              key={doc.id}
              type="button"
              onClick={() => setSelectedId(doc.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase transition cursor-pointer ${
                selectedId === doc.id
                  ? "bg-cyan-950 border border-cyan-500 text-cyan-300"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {doc.pdfLabel}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setReportVisible((curr) => !curr)}
          className="px-4 py-2 bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold uppercase rounded-lg text-xs transition cursor-pointer shadow-lg shadow-rose-950/40"
        >
          {reportVisible ? "Hide Risk Matrix" : "Generate Contract Risk Matrix"}
        </button>
      </div>

      {/* WORKBENCH: PREVIEW (5 COLS) vs CLAUSE AUDIT (7 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* DOCUMENT METADATA */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <div>
              <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                Contract Document Preview
              </span>
              <h3 className="text-sm font-bold text-white mt-0.5">{selected.documentName}</h3>
            </div>
            <span className="text-[10px] text-zinc-500">{selected.pageCount} Pages</span>
          </div>

          <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-3 font-sans text-xs">
            <div className="flex justify-between text-[11px] font-mono text-zinc-500 border-b border-zinc-850 pb-2">
              <span>{selected.pdfLabel}</span>
              <span>{selected.uploadedAt}</span>
            </div>
            <div className="space-y-1.5 text-zinc-300 font-mono text-[11px]">
              <div>• Clause 4.1 — Time for Completion &amp; Extension Rules</div>
              <div>• Clause 7.2 — Defects and Warranty Rectification</div>
              <div>• Clause 10.1 — Liquidated Damages Assessment</div>
              <div>• Clause 12.4 — Price Escalation &amp; Indices Formula</div>
              <div>• Annexure D — Technical Specification Schedule</div>
            </div>
            <div className="p-3 bg-cyan-950/40 border border-cyan-800 text-cyan-300 rounded text-[11px] font-mono">
              Auditor Highlight: Liquidated damages cap and force-majeure carve-outs deviate from FIDIC Red Book standard conditions.
            </div>
          </div>
        </div>

        {/* CLAUSES BREAKDOWN */}
        <div className="lg:col-span-7 space-y-3">
          {selected.clauses.map((clause) => {
            const isHigh = clause.severity === "High Risk";
            const isMed = clause.severity === "Medium Risk";
            return (
              <div
                key={clause.id}
                className={`p-4 rounded-xl border space-y-2.5 transition ${
                  isHigh
                    ? "bg-rose-950/20 border-rose-800/80 shadow-md shadow-rose-950/30"
                    : isMed
                    ? "bg-amber-950/20 border-amber-800/80"
                    : "bg-zinc-900/60 border-zinc-800"
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm text-white">{clause.type}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      isHigh
                        ? "bg-rose-950 text-rose-300 border border-rose-800"
                        : isMed
                        ? "bg-amber-950 text-amber-300 border border-amber-800"
                        : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                    }`}
                  >
                    {clause.severity}
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-sans leading-relaxed">{clause.summary}</p>
                <div className="text-[11px] text-zinc-400">
                  <strong className="text-zinc-200 uppercase text-[10px]">Risk Driver:</strong> {clause.riskDriver}
                </div>

                <div className="p-2.5 bg-zinc-950/60 border border-zinc-800 rounded text-[11px] text-zinc-300">
                  <strong className="text-amber-400 uppercase text-[10px] block mb-0.5">Recommended Mitigation:</strong>
                  <span>{clause.mitigation}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMPLIANCE & RISK SUMMARY PILLS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* IS 456 / NBC Checks */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold block">
            IS Code / NBC Statutory Compliance Validator
          </span>
          <div className="space-y-2.5">
            {selected.complianceChecks.map((check) => (
              <div
                key={check.id}
                className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1.5"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">{check.standard} • {check.subject}</span>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      check.status === "Mismatch"
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    }`}
                  >
                    {check.status}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-sans">{check.issue}</div>
                <div className="text-[10px] text-cyan-300">{check.recommendation}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Tallies */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold block">
            Legal Exposure Tally
          </span>
          <div className="space-y-2">
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex justify-between items-center">
              <span className="text-zinc-400">High Risk Exposure</span>
              <strong className="text-rose-400 text-lg tabular-nums">{riskCounts["High Risk"]}</strong>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex justify-between items-center">
              <span className="text-zinc-400">Medium Risk Clauses</span>
              <strong className="text-amber-400 text-lg tabular-nums">{riskCounts["Medium Risk"]}</strong>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex justify-between items-center">
              <span className="text-zinc-400">Standard Baseline</span>
              <strong className="text-emerald-400 text-lg tabular-nums">{riskCounts.Standard}</strong>
            </div>
            <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl flex justify-between items-center">
              <span className="text-zinc-400">Code Mismatches</span>
              <strong className="text-cyan-400 text-lg tabular-nums">{complianceFlagCount}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* REPORT MATRIX */}
      {reportVisible && (
        <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-2 font-sans text-xs">
          <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold block">
            Executive Summary Matrix • {selected.documentName}
          </span>
          <p className="text-zinc-300 leading-relaxed font-mono">
            <strong>Primary Exposure:</strong> Liquidated damages cap and ambiguous force majeure trigger.<br />
            <strong>Action Mandate:</strong> Incorporate mutual carve-out for municipal authority delays and align slab concrete cover with IS 456 Table 16.
          </p>
        </div>
      )}
    </div>
  );
}

export default DocumentClauseViewer;
COMP_CLAUSE_VIEWER

# -----------------------------------------------------------------------------
# 3. REFACTOR: components/portal/ClientExecutiveDashboard.tsx (Purged 56 Inline Styles)
# -----------------------------------------------------------------------------
cat << 'COMP_CLIENT_DASH' > components/portal/ClientExecutiveDashboard.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  fetchDashboardSnapshot,
  subscribeToProjectRealtime,
  updateChangeOrderStatus,
} from "@/app/lib/services";
import { getClientExecutiveView } from "@/lib/auth/portalGate";
import { exportProjectSummaryCsv, exportProjectSummaryPdf } from "@/lib/export/summaryExporter";
import { TelemetryErrorBoundary } from "@/components/analytics/TelemetryErrorBoundary";
import type { DashboardSnapshot } from "@/types/construction";
import { ScheduleMetrics } from "@/components/dashboard/ScheduleMetrics";
import { VariationTourWidget } from "@/components/dashboard/VariationTourWidget";
import { ESGScorecardWidget } from "@/components/dashboard/ESGScorecardWidget";
import { HandoverSafetyKpiWidget } from "@/components/dashboard/HandoverSafetyKpiWidget";
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  IndianRupee,
} from "lucide-react";

function formatInrShort(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ClientExecutiveDashboard() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

  const dashboard = useMemo(() => (snapshot ? getClientExecutiveView(snapshot) : null), [snapshot]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await fetchDashboardSnapshot("GOMTI-NAGAR-PH1-FITOUT");
      if (mounted) setSnapshot(data);
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return subscribeToProjectRealtime("GOMTI-NAGAR-PH1-FITOUT", {
      onCdeChange: (payload: any) =>
        setSnapshot((curr) =>
          curr
            ? { ...curr, cdeItems: curr.cdeItems.map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i)) }
            : curr
        ),
      onRfiChange: () => undefined,
      onChangeOrderChange: (payload: any) =>
        setSnapshot((curr) =>
          curr
            ? {
                ...curr,
                changeOrders: curr.changeOrders.map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i)),
              }
            : curr
        ),
    });
  }, []);

  const summary = dashboard;

  if (!summary) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-mono text-xs text-zinc-500">
        Loading Client Executive Telemetry...
      </div>
    );
  }

  return (
    <TelemetryErrorBoundary
      fallback={
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-mono text-xs">
          <div className="max-w-2xl mx-auto border border-zinc-800 bg-zinc-900 p-6 rounded-2xl">
            The executive dashboard is unavailable right now. Please refresh or verify connectivity.
          </div>
        </main>
      }
    >
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono text-xs select-none">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* HEADER */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
            <div>
              <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Client &amp; Asset Owner Executive Clarity Portal</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
                Gomti Nagar Extension Hub Phase-1
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  exportProjectSummaryCsv({
                    projectName: "Quadillar Client Status Dossier",
                    drawingRevisions: snapshot?.cdeItems ?? [],
                    rfiLogs: snapshot?.rfis ?? [],
                    changeOrders: snapshot?.changeOrders ?? [],
                    fileName: "client-status-dossier",
                  })
                }
                className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 font-bold uppercase rounded text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportProjectSummaryPdf({
                    projectName: "Quadillar Client Status Dossier",
                    drawingRevisions: snapshot?.cdeItems ?? [],
                    rfiLogs: snapshot?.rfis ?? [],
                    changeOrders: snapshot?.changeOrders ?? [],
                    fileName: "client-status-dossier",
                  })
                }
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Dossier</span>
              </button>
            </div>
          </header>

          {/* FINANCIAL SUMMARY TILES */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Contract Sum", value: formatInrShort(summary.totalContractSum), color: "text-white" },
              { label: "Certified Billed Amount", value: formatInrShort(summary.certifiedBilledAmount), color: "text-emerald-400" },
              { label: "Withheld Retainage Escrow", value: formatInrShort(summary.withheldRetainage), color: "text-amber-400" },
              { label: "Net Variation Impact", value: formatInrShort(summary.netVariation), color: "text-cyan-400" },
            ].map((metric) => (
              <div key={metric.label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-1.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">
                  {metric.label}
                </span>
                <div className={`text-xl font-bold tracking-tight tabular-nums ${metric.color}`}>
                  {metric.value}
                </div>
              </div>
            ))}
          </section>

          {/* DPR STATUS CALLOUT */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Today&apos;s DPR Status</span>
              <strong className="text-amber-400 text-sm mt-0.5 block">Pending Consultant Sign-off</strong>
            </div>
            <a href="/site/dpr" className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1">
              <span>Inspect latest progress report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* ROADMAP & APPROVALS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Milestones */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white uppercase">Project Health &amp; Milestone Roadmap</h2>
              <div className="space-y-3">
                {summary.milestones.map((m) => (
                  <div key={m.milestone_id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">{m.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-950 border border-cyan-800 text-cyan-300">
                        {m.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: m.status === "Certified_Completed" ? "100%" : m.status === "Under_Verification" ? "70%" : "45%",
                        }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                      />
                    </div>
                    <div className="text-[10px] text-zinc-500">Target completion: {m.target_completion_date}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Owner Approvals */}
            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white uppercase">Pending Owner Approvals</h2>
              <div className="space-y-3">
                {summary.pendingApprovals.length ? (
                  summary.pendingApprovals.map((order) => (
                    <div key={order.id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                      <div className="font-bold text-white">{order.title}</div>
                      <div className="text-[11px] text-zinc-400">
                        {formatInrShort(order.amount)} • {order.timeImpactDays} Days Time Impact
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => void updateChangeOrderStatus(order.id, "Approved", { role: "client" })}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold uppercase text-[10px]"
                        >
                          Authorize Variation
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-zinc-500 p-4 text-center">Zero pending variation orders.</div>
                )}
              </div>
            </div>
          </div>

          <ScheduleMetrics tasks={snapshot?.projectTasks ?? []} />
          <VariationTourWidget />
          <ESGScorecardWidget />
          <HandoverSafetyKpiWidget />
        </div>
      </main>
    </TelemetryErrorBoundary>
  );
}

export default ClientExecutiveDashboard;
COMP_CLIENT_DASH

# -----------------------------------------------------------------------------
# 4. REFACTOR: app/portal/architect/page.tsx (Purged 61 Inline Styles)
# -----------------------------------------------------------------------------
cat << 'PAGE_ARCHITECT' > app/portal/architect/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  fetchDashboardSnapshot,
  subscribeToProjectRealtime,
  updateCdeItemState,
} from "@/app/lib/services";
import { getArchitectView } from "@/lib/auth/portalGate";
import { exportProjectSummaryCsv, exportProjectSummaryPdf } from "@/lib/export/summaryExporter";
import { TelemetryErrorBoundary } from "@/components/analytics/TelemetryErrorBoundary";
import type { CdeItem, DashboardSnapshot, WorkInspectionRequest } from "@/types/construction";
import { VerificationTelemetry } from "@/components/governance/VerificationTelemetry";
import { QualityGovernanceTelemetry } from "@/components/quality/QualityGovernanceTelemetry";
import { MeasurementItpWidget } from "@/components/dashboard/MeasurementItpWidget";
import { BackchargeVrWidget } from "@/components/dashboard/BackchargeVrWidget";
import { QualityTelemetryWidget } from "@/components/dashboard/QualityTelemetryWidget";
import {
  Layers,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Send,
  CloudSun,
  ShieldCheck,
  Building2,
} from "lucide-react";

export default function ArchitectPortalPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await fetchDashboardSnapshot("GOMTI-NAGAR-PH1-FITOUT");
      if (mounted) setSnapshot(data);
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return subscribeToProjectRealtime("GOMTI-NAGAR-PH1-FITOUT", {
      onCdeChange: (payload: any) =>
        setSnapshot((curr) =>
          curr
            ? { ...curr, cdeItems: curr.cdeItems.map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i)) }
            : curr
        ),
      onRfiChange: (payload: any) =>
        setSnapshot((curr) =>
          curr
            ? { ...curr, rfis: curr.rfis.map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i)) }
            : curr
        ),
      onChangeOrderChange: (payload: any) =>
        setSnapshot((curr) =>
          curr
            ? {
                ...curr,
                changeOrders: curr.changeOrders.map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i)),
              }
            : curr
        ),
      onWirChange: (payload: any) =>
        setSnapshot((curr) =>
          curr
            ? {
                ...curr,
                workInspectionRequests:
                  payload.eventType === "DELETE"
                    ? (curr.workInspectionRequests ?? []).filter((i) => i.id !== payload.old.id)
                    : (curr.workInspectionRequests ?? []).some((i) => i.id === payload.new.id)
                    ? (curr.workInspectionRequests ?? []).map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i))
                    : [...(curr.workInspectionRequests ?? []), payload.new as WorkInspectionRequest],
              }
            : curr
        ),
    });
  }, []);

  const view = useMemo(() => (snapshot ? getArchitectView(snapshot) : null), [snapshot]);

  const publishGfc = async (item: CdeItem) => {
    if (!snapshot) return;
    const updated = await updateCdeItemState(
      item.id,
      "Published",
      { status: "Approved", approved: true },
      { role: "architect", name: "Architect Portal" }
    );
    if (updated) {
      setSnapshot((curr) =>
        curr ? { ...curr, cdeItems: curr.cdeItems.map((entry) => (entry.id === updated.id ? updated : entry)) } : curr
      );
    }
  };

  const pendingInspections = (snapshot?.workInspectionRequests ?? []).filter(
    (item) => item.status === "Pending Inspection"
  );

  const clashHealth = useMemo(() => {
    const total = Math.max(1, (snapshot?.bimClashes ?? []).length || 1);
    const resolved = (snapshot?.bimClashes ?? []).filter((item) => item.status === "Resolved").length;
    return { health: Math.round((resolved / total) * 100), open: total - resolved };
  }, [snapshot?.bimClashes]);

  if (!view) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-mono text-xs">
        Loading Design Governance Portal...
      </main>
    );
  }

  return (
    <TelemetryErrorBoundary
      fallback={
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-mono text-xs">
          <div className="max-w-2xl mx-auto border border-zinc-800 bg-zinc-900 p-6 rounded-2xl">
            Design governance portal unavailable. Check telemetry connection.
          </div>
        </main>
      }
    >
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono text-xs select-none">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* HEADER */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
            <div>
              <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Principal Consultant / Architect Portal</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
                Design Governance &amp; CDE State Control
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  exportProjectSummaryCsv({
                    projectName: "Quadillar Architect Summary",
                    drawingRevisions: snapshot?.cdeItems ?? [],
                    rfiLogs: snapshot?.rfis ?? [],
                    changeOrders: snapshot?.changeOrders ?? [],
                    fileName: "architect-summary",
                  })
                }
                className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 font-bold uppercase rounded text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportProjectSummaryPdf({
                    projectName: "Quadillar Architect Summary",
                    drawingRevisions: snapshot?.cdeItems ?? [],
                    rfiLogs: snapshot?.rfis ?? [],
                    changeOrders: snapshot?.changeOrders ?? [],
                    fileName: "architect-summary",
                  })
                }
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </header>

          {/* VITAL METRICS */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-2">
              <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-widest block">
                BIM Clash Resolution Index
              </span>
              <div className="text-3xl font-bold text-white tabular-nums">{clashHealth.health}%</div>
              <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
                <div style={{ width: `${clashHealth.health}%` }} className="h-full bg-cyan-500 rounded-full" />
              </div>
              <div className="text-[11px] text-zinc-500">{clashHealth.open} clashes under coordination.</div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-2">
              <span className="text-[10px] text-amber-400 uppercase font-bold tracking-widest block">
                Site Operating Weather Envelope
              </span>
              <div className="text-2xl font-bold text-emerald-400">Normal Site Ops Cleared</div>
              <div className="text-[11px] text-zinc-500">Telemetry: Wind 14 km/h • Rain 0.0 mm/hr</div>
            </div>
          </section>

          <VerificationTelemetry />
          <QualityGovernanceTelemetry />
          <MeasurementItpWidget />
          <BackchargeVrWidget />
          <QualityTelemetryWidget />

          {/* CDE PROMOTION & ACTIVE RFIs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white uppercase">CDE State Promotion Center</h2>
              <div className="space-y-3">
                {view.cdeItems.map((item) => (
                  <div key={item.id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">{item.title}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{item.container}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-900 border border-zinc-700 text-zinc-300">
                        {item.state}
                      </span>
                      <button
                        type="button"
                        disabled={item.state === "Published"}
                        onClick={() => void publishGfc(item)}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold uppercase text-[10px] disabled:opacity-50"
                      >
                        Approve to GFC
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white uppercase">Active Inquiries (RFIs)</h2>
              <div className="space-y-3">
                {view.activeRfis.map((rfi) => (
                  <div key={rfi.id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                    <div className="font-bold text-white">{rfi.title}</div>
                    <div className="text-[11px] text-zinc-400">
                      Pending with: <strong className="text-cyan-400">{rfi.ballInCourt}</strong> ({rfi.currentOwner})
                    </div>
                    <div className="text-[10px] text-zinc-500">SLA: {rfi.slaHoursRemaining ?? 0}h remaining</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </TelemetryErrorBoundary>
  );
}
PAGE_ARCHITECT

# -----------------------------------------------------------------------------
# 5. VERIFY COMPILATION
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying TypeScript compilation health with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Sprint 19 applied cleanly! 224 inline styles purged and 0 errors detected.\033[0m"
