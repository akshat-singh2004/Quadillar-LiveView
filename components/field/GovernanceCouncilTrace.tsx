"use client";

import React from "react";
import { ShieldAlert, Lock, FileCheck2, CheckCircle2 } from "lucide-react";
import { FieldGroundingRecord } from "@/lib/grounding/fieldGroundingSchema";

interface GovernanceCouncilTraceProps {
  record: FieldGroundingRecord;
}

export default function GovernanceCouncilTrace({ record }: GovernanceCouncilTraceProps) {
  const { structural_qa_agent, commercial_escrow_agent, section_65b_vault_agent } =
    record.governance_council;

  const qaIsHold = structural_qa_agent.hold_status === "HOLD_ENFORCED";
  const escrowIsLocked = commercial_escrow_agent.milestone_lock === "LOCKED";

  return (
    <div className="bg-zinc-950/90 border border-zinc-800 rounded-2xl p-3.5 flex flex-col gap-2.5 text-xs font-mono">
      <div className="flex items-center justify-between border-b border-zinc-800/90 pb-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-200">
          3-AGENT GOVERNANCE COUNCIL CONSENSUS TRACE
        </span>
        <span className="text-[10px] text-zinc-400">{record.linked_ncr_id}</span>
      </div>

      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-bold text-zinc-100 text-[11px]">
            {qaIsHold ? (
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            )}
            1. STRUCTURAL QA AGENT
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
              qaIsHold
                ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                : record.severity === "MODERATE_NCR"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {structural_qa_agent.hold_status} • {structural_qa_agent.is_456_clause}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">{structural_qa_agent.verdict}</p>
      </div>

      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-bold text-zinc-100 text-[11px]">
            <Lock className={`w-3.5 h-3.5 ${escrowIsLocked ? "text-amber-500" : "text-emerald-500"}`} />
            2. COMMERCIAL ESCROW AGENT
          </span>
          <span
            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
              escrowIsLocked
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            }`}
          >
            {commercial_escrow_agent.milestone_lock} • ₹{record.withholding_amount_inr.toLocaleString("en-IN")}
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">{commercial_escrow_agent.verdict}</p>
      </div>

      <div className="p-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 font-bold text-zinc-100 text-[11px]">
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-500" />
            3. BSA Section 63 / BSA VAULT AGENT
          </span>
          <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            SEALED UTC
          </span>
        </div>
        <p className="text-[11px] text-zinc-400 leading-relaxed">{section_65b_vault_agent.verdict}</p>
        <div className="text-[10px] text-zinc-300 bg-zinc-950 border border-zinc-800/90 rounded px-2 py-1 truncate">
          SHA-256: {record.canonical_65b_sha256}
        </div>
      </div>
    </div>
  );
}
