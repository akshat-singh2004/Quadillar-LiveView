"use client";

import { useMemo, useState } from "react";
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

function buildDefaultQpr(projectName: string, projectCode: string, quarterLabel: string): ReraQuarterlyProgressReport {
  return {
    projectName,
    projectCode,
    quarterLabel,
    approvedProgress: 92.5,
    actualProgress: 89.6,
    soldInventoryUnits: 64,
    unsoldInventoryUnits: 18,
    constructionCostIncurred: 126500000,
    summary: "Actual physical progress remains below the approved RERA baseline by 2.9%. Sales inventory is 64 units sold and 18 unsold. Construction cost incurred totals INR 12.65 Cr.",
    formOneSummary: "Form 1 — Progress summary: The project has achieved 89.6% actual physical progress against a sanctioned 92.5% baseline. Progress variance is tracked under RERA schedule compliance and remains subject to consultant review.",
    formTwoSummary: "Form 2 — Inventory and cost summary: 64 units sold, 18 unsold, and INR 12.65 Cr has been incurred against committed project cost. All cost and sales data have been reconciled to the latest project ledger and sales register.",
    signedBy: "A. Mehta | Project Director",
    signedAt: new Date().toISOString(),
  };
}

export function RERAReportGenerator({
  approvals,
  projectName = "Project 01 / Core Shell",
  projectCode = "P01-CORE",
  quarterLabel = "Q3 FY2026",
}: {
  approvals: StatutoryApproval[];
  projectName?: string;
  projectCode?: string;
  quarterLabel?: string;
}) {
  const [report, setReport] = useState<ReraQuarterlyProgressReport>(() => buildDefaultQpr(projectName, projectCode, quarterLabel));

  const timeline = useMemo(() => approvals.map((approval) => ({ ...approval, state: calculateApprovalState(approval) })), [approvals]);

  const autoGenerate = () => {
    const actualProgress = Math.max(0, Math.min(100, Number(((approvals.reduce((sum, item) => sum + item.progressPercent, 0) / Math.max(1, approvals.length)) || 0).toFixed(1))));
    const nextReport = {
      projectName,
      projectCode,
      quarterLabel,
      approvedProgress: 92.5,
      actualProgress,
      soldInventoryUnits: 64,
      unsoldInventoryUnits: 18,
      constructionCostIncurred: 126500000,
      summary: `Actual physical progress is ${actualProgress}% against the approved RERA sanction baseline of 92.5%. The project has 64 units sold, 18 units unsold, and capital incurred of INR 12.65 Cr.`,
      formOneSummary: `Form 1 — Progress summary: Actual site progress of ${actualProgress}% has been measured against the sanctioned RERA target of 92.5% for ${quarterLabel}. Variance is documented and subject to regular monitoring.`,
      formTwoSummary: `Form 2 — Inventory and cost summary: The project currently records 64 sold units, 18 unsold units, and construction cost incurred of INR ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(126500000)}.`,
      signedBy: "A. Mehta | Project Director",
      signedAt: new Date().toISOString(),
    };

    setReport(nextReport);
  };

  return (
    <div className="space-y-6">
      <section className="surface-shell p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Approval timeline</div>
            <h2 className="mt-2 text-2xl font-medium tracking-tight text-neutral-100">Municipal & statutory compliance</h2>
          </div>
          <button type="button" onClick={autoGenerate} className="rounded-full border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-[11px] font-medium tracking-[0.12em] text-sky-200 uppercase transition-all duration-200 hover:bg-sky-500/20">
            Auto-Generate RERA QPR
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {timeline.map((approval) => {
            const tone = badgeStyle[approval.state.tone];
            return (
              <div key={approval.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-mono tracking-[0.14em] text-neutral-400 uppercase">{approval.approvalType}</div>
                    <div className="mt-3 text-lg font-medium tracking-tight text-neutral-100">{approval.authority}</div>
                  </div>
                  <span
                    className="rounded-full border px-2 py-1 text-[10px] font-medium tracking-[0.12em] uppercase"
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

                <div className="mt-4 space-y-3 text-sm text-neutral-300">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-neutral-400">Reference</span>
                    <span className="font-medium text-neutral-200">{approval.referenceNumber}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-neutral-400">Valid until</span>
                    <span className="font-medium text-neutral-200">{new Date(approval.validUntil).toLocaleDateString("en-IN")}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-neutral-400">Progress</span>
                    <span className="font-medium text-neutral-200">{approval.progressPercent}%</span>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/[0.06]">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-amber-400" style={{ width: `${approval.progressPercent}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="surface-shell p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Quarterly reporting</div>
            <h3 className="mt-2 text-2xl font-medium tracking-tight text-neutral-100">RERA QPR (Form 1 & Form 2)</h3>
          </div>
          <button type="button" onClick={() => window.print()} className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-[11px] font-medium tracking-[0.12em] text-emerald-200 uppercase transition-all duration-200 hover:bg-emerald-500/20">
            Export signed summary
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[11px] font-mono tracking-[0.12em] text-neutral-400 uppercase">Approved baseline</div>
            <div className="mt-3 text-3xl font-medium tracking-tight text-neutral-100">{report.approvedProgress}%</div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[11px] font-mono tracking-[0.12em] text-neutral-400 uppercase">Actual physical progress</div>
            <div className="mt-3 text-3xl font-medium tracking-tight text-neutral-100">{report.actualProgress}%</div>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[11px] font-mono tracking-[0.12em] text-neutral-400 uppercase">Construction cost incurred</div>
            <div className="mt-3 text-2xl font-medium tracking-tight text-neutral-100">{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(report.constructionCostIncurred)}</div>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Form 1</div>
            <p className="mt-3 text-sm leading-6 text-neutral-300">{report.formOneSummary}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Form 2</div>
            <p className="mt-3 text-sm leading-6 text-neutral-300">{report.formTwoSummary}</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/[0.06] bg-neutral-950/70 p-4">
          <div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Submission summary</div>
          <p className="mt-3 text-sm leading-6 text-neutral-300">{report.summary}</p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-4 text-[11px] font-mono tracking-[0.12em] text-neutral-400">
            <span>{report.projectCode} • {report.quarterLabel}</span>
            <span>Signed by {report.signedBy}</span>
            <span>{new Date(report.signedAt).toLocaleDateString("en-IN")}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
