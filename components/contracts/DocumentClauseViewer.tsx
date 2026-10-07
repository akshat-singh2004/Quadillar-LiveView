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
