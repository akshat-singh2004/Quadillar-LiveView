"use client";

import React, { useMemo, useState } from "react";
import type { ReraQuarterlyProgressReport, StatutoryApproval } from "@/types/construction";

const badgeStyle: Record<string, { bg: string; border: string; text: string; pulse?: string }> = {
  active: { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.35)", text: "#a7f3d0" },
  expiring: { bg: "rgba(245,158,11,0.12)", border: "rgba(251,191,36,0.35)", text: "#fcd34d", pulse: "pulse 1.7s ease-in-out infinite" },
  expired: { bg: "rgba(239,68,68,0.12)", border: "rgba(248,113,113,0.35)", text: "#fca5a5" },
};

function calculateApprovalState(approval: StatutoryApproval): { label: string; tone: keyof typeof badgeStyle; daysText: string } {
  const targetDate = new Date(approval.validUntil).getTime();
  const now = Date.now();
  const diffDays = Math.ceil((targetDate - now) / (1000 * 60 * 60 * 24));

  if (targetDate < now) {
    return { label: "Expired / Action Required", tone: "expired", daysText: "Expired" };
  }

  if (diffDays < 60) {
    return { label: `Expiring in ${diffDays} Days`, tone: "expiring", daysText: `${diffDays} days left` };
  }

  return { label: "Sanctioned & Active", tone: "active", daysText: `${diffDays} days left` };
}

interface RERAReportGeneratorProps {
  approvals: StatutoryApproval[];
  projectName?: string;
  projectCode?: string;
  quarterLabel?: string;
  actualProgress?: number;
  constructionCostIncurred?: number;
  contractValue?: number;
}

export function RERAReportGenerator({
  approvals,
  projectName = "Gomti Nagar Extension Commercial Hub Ph-1",
  projectCode = "GOMTI-PH1",
  quarterLabel = "Q3 FY2026-27",
  actualProgress = 89.6,
  constructionCostIncurred = 45000000,
  contractValue = 450000000,
}: RERAReportGeneratorProps) {
  const [report, setReport] = useState<ReraQuarterlyProgressReport>(() => {
    const formattedCost = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(constructionCostIncurred);

    return {
      projectName,
      projectCode,
      quarterLabel,
      approvedProgress: 92.5,
      actualProgress,
      soldInventoryUnits: 64,
      unsoldInventoryUnits: 18,
      constructionCostIncurred,
      summary: `Actual physical progress is ${actualProgress}% against the approved RERA baseline of 92.5%. Capital incurred to date totals ${formattedCost} against the sanctioned contract sum.`,
      formOneSummary: `Form 1 — Architectural Progress Certification: The project has achieved ${actualProgress}% actual measured site progress against sanctioned drawings for ${quarterLabel}. All structural stages remain under certified supervision.`,
      formTwoSummary: `Form 2 — Financial & Inventory Certification: Total certified construction expenditure stands at ${formattedCost}. Escrow withdrawals comply strictly with Section 4(2)(l)(D) of the RERA Act.`,
      signedBy: "Principal Architect / Certified SEOR",
      signedAt: new Date().toISOString(),
    };
  });

  const timeline = useMemo(() => approvals.map((approval) => ({ ...approval, state: calculateApprovalState(approval) })), [approvals]);

  const autoGenerate = () => {
    const avgApprovalProgress = approvals.length > 0
      ? Number((approvals.reduce((sum, item) => sum + (item.progressPercent || 0), 0) / approvals.length).toFixed(1))
      : actualProgress;

    const formattedCost = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(constructionCostIncurred);

    const nextReport: ReraQuarterlyProgressReport = {
      projectName,
      projectCode,
      quarterLabel,
      approvedProgress: 92.5,
      actualProgress: avgApprovalProgress,
      soldInventoryUnits: 64,
      unsoldInventoryUnits: 18,
      constructionCostIncurred,
      summary: `Actual physical progress is ${avgApprovalProgress}% against the approved RERA sanction baseline of 92.5%. Certified construction expenditure totals ${formattedCost}.`,
      formOneSummary: `Form 1 — Architectural Progress Certification: Measured physical progress of ${avgApprovalProgress}% reported for ${quarterLabel}. Inspection records and cube tests conform to approved structural drawings.`,
      formTwoSummary: `Form 2 — Financial & Inventory Certification: Certified expenditure is ${formattedCost} out of contract baseline ₹${(contractValue / 10000000).toFixed(2)} Cr.`,
      signedBy: "Principal Architect / Certified SEOR",
      signedAt: new Date().toISOString(),
    };

    setReport(nextReport);
  };

  return (
    <div className="space-y-6">
      <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between border-b border-zinc-800 pb-4">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              Statutory Approvals Timeline • UP RERA Compliance
            </div>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-white uppercase">
              Municipal &amp; Environmental Clearances
            </h2>
          </div>
          <button
            type="button"
            onClick={autoGenerate}
            className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 px-4 py-2 text-xs font-bold text-cyan-300 uppercase transition cursor-pointer"
          >
            Auto-Generate RERA QPR from Live Data
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {timeline.map((approval) => {
            const tone = badgeStyle[approval.state.tone];
            return (
              <div key={approval.id} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono text-zinc-500 uppercase font-bold">{approval.approvalType}</div>
                    <div className="mt-1 text-sm font-bold text-white">{approval.authority}</div>
                  </div>
                  <span
                    className="rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
                    style={{
                      background: tone.bg,
                      borderColor: tone.border,
                      color: tone.text,
                      animation: tone.pulse,
                    }}
                  >
                    {approval.state.label}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-zinc-300 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Ref:</span>
                    <span className="font-mono text-zinc-200">{approval.referenceNumber}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Valid Until:</span>
                    <span className="font-mono text-zinc-200">{new Date(approval.validUntil).toLocaleDateString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-500">Execution Score:</span>
                    <span className="font-mono text-emerald-400 font-bold">{approval.progressPercent}%</span>
                  </div>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${approval.progressPercent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 shadow-xl space-y-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-zinc-800 pb-4">
          <div>
            <div className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
              Quarterly Filing Engine
            </div>
            <h3 className="mt-1 text-xl font-bold tracking-tight text-white uppercase">
              RERA QPR Filing (Form 1 Architect &amp; Form 2 Financial)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-bold uppercase transition cursor-pointer shadow-lg shadow-emerald-950/40"
          >
            Export Signed RERA Dossier (PDF)
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 font-mono">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Approved Baseline</span>
            <div className="mt-2 text-2xl font-bold text-white tabular-nums">{report.approvedProgress}%</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Actual Measured Progress</span>
            <div className="mt-2 text-2xl font-bold text-cyan-400 tabular-nums">{report.actualProgress}%</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block font-bold">Certified Capital Spend</span>
            <div className="mt-2 text-xl font-bold text-emerald-400 tabular-nums truncate">
              {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(report.constructionCostIncurred)}
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2">
            <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold block">Form 1 Certification Summary</span>
            <p className="text-xs leading-relaxed text-zinc-300 font-sans">{report.formOneSummary}</p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4 space-y-2">
            <span className="text-[10px] font-mono text-emerald-400 uppercase font-bold block">Form 2 Financial Summary</span>
            <p className="text-xs leading-relaxed text-zinc-300 font-sans">{report.formTwoSummary}</p>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
          <span className="text-[10px] font-mono text-zinc-400 uppercase font-bold block">Executive Attestation Record</span>
          <p className="text-xs leading-relaxed text-zinc-300 font-sans">{report.summary}</p>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-3 text-[10px] font-mono text-zinc-500">
            <span>{report.projectCode} • {report.quarterLabel}</span>
            <span className="text-zinc-300">Certified by: <strong>{report.signedBy}</strong></span>
            <span>{new Date(report.signedAt).toLocaleDateString("en-IN")}</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export default RERAReportGenerator;
