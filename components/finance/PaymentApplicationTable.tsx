"use client";

import React, { useState, useTransition } from "react";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Download,
  Share2,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  Lock,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Type Definitions (Compatible with ra_bills & running_account_bills tables)
// ---------------------------------------------------------------------------

export type RABillStatus =
  | "Draft"
  | "Submitted"
  | "Under_Review"
  | "Certified"
  | "Approved"
  | "Paid"
  | "Held";

export interface RABillApplication {
  id: string;
  billNumber: string;
  project_id?: string;
  contractorName: string;
  tradePackage: string;
  periodStart?: string;
  periodEnd?: string;
  scheduledValueInr: number;
  previousBilledInr: number;
  currentWorkCompletedInr: number;
  storedMaterialsInr: number;
  retainageRate: number; // e.g. 0.05
  retainageAmountInr: number;
  laborCessInr: number; // 1% BOCW
  advanceRecoveryInr: number;
  ncrDebitRecoveryInr: number;
  netPayableInr: number;
  qualityGatePassed: boolean;
  concreteCubesPassed: boolean;
  status: RABillStatus;
  certifiedBy?: string;
  certifiedAt?: string;
  sha256Hash?: string;
}

export interface PaymentApplicationTableProps {
  applications: (RABillApplication | Record<string, unknown>)[];
  onStatusChange?: (applicationId: string, nextStatus: RABillStatus) => Promise<void> | void;
  onViewDetails?: (applicationId: string) => void;
}

// ---------------------------------------------------------------------------
// Indian Currency Formatter
// ---------------------------------------------------------------------------

function formatINR(val?: number | null): string {
  if (val === undefined || val === null || isNaN(val)) return "₹0.00";
  return (
    "₹" +
    Number(val).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

// ---------------------------------------------------------------------------
// Component: PaymentApplicationTable
// ---------------------------------------------------------------------------

export function PaymentApplicationTable({
  applications,
  onStatusChange,
  onViewDetails,
}: PaymentApplicationTableProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);

  // Normalize input objects across schema variations
  const normalizedApplications: RABillApplication[] = applications.map((item) => {
    const raw = item as Record<string, unknown>;
    const currentWork = Number(raw.current_work_completed_inr ?? raw.currentWorkCompleted ?? raw.gross_work_done ?? 0);
    const storedMat = Number(raw.stored_materials_inr ?? raw.storedMaterials ?? 0);
    const retRate = Number(raw.retainage_rate ?? raw.retainageRate ?? 0.05);
    const retAmt = Number(raw.retainage_amount_inr ?? raw.retainage_amount ?? (currentWork + storedMat) * retRate);
    const cess = Number(raw.labor_cess_inr ?? raw.labour_cess_amount ?? (currentWork + storedMat) * 0.01);
    const advRec = Number(raw.advance_recovery_inr ?? raw.mobilization_advance_recovery ?? 0);
    const ncrDebit = Number(raw.ncr_debit_recovery_inr ?? raw.ncr_backcharges_inr ?? 0);

    const gross = currentWork + storedMat;
    const computedNet = Math.max(0, gross - (retAmt + cess + advRec + ncrDebit));

    return {
      id: String(raw.id ?? raw.paymentApplicationId ?? ""),
      billNumber: String(raw.bill_number ?? raw.ra_bill_number ?? raw.paymentApplicationId ?? "RA-BILL"),
      project_id: String(raw.project_id ?? "GOMTI-NAGAR-PH1-FITOUT"),
      contractorName: String(raw.contractor_name ?? raw.contractorName ?? "Lead EPC Contractor"),
      tradePackage: String(raw.trade_package ?? raw.tradePackage ?? "General Civil"),
      periodStart: raw.period_start ? String(raw.period_start) : undefined,
      periodEnd: raw.period_end ? String(raw.period_end) : undefined,
      scheduledValueInr: Number(raw.scheduled_value_inr ?? raw.scheduledValue ?? 0),
      previousBilledInr: Number(raw.previous_billed_inr ?? 0),
      currentWorkCompletedInr: currentWork,
      storedMaterialsInr: storedMat,
      retainageRate: retRate,
      retainageAmountInr: retAmt,
      laborCessInr: cess,
      advanceRecoveryInr: advRec,
      ncrDebitRecoveryInr: ncrDebit,
      netPayableInr: Number(raw.net_payable_inr ?? raw.net_payable_certified ?? computedNet),
      qualityGatePassed: Boolean(raw.quality_gate_passed ?? true),
      concreteCubesPassed: Boolean(raw.concrete_cubes_passed ?? true),
      status: (raw.status as RABillStatus) || "Draft",
      certifiedBy: raw.certified_by ? String(raw.certified_by) : undefined,
      certifiedAt: raw.certified_at ? String(raw.certified_at) : undefined,
      sha256Hash: raw.sha256_deed_hash ? String(raw.sha256_deed_hash) : undefined,
    };
  });

  const handleStatusSelect = (app: RABillApplication, newStatus: RABillStatus) => {
    // Quality Interlock: Block certification if quality gates or concrete cubes failed
    if (newStatus === "Certified" || newStatus === "Approved") {
      if (!app.qualityGatePassed || !app.concreteCubesPassed) {
        alert(
          `ENGINEERING HOLD: Cannot certify ${app.billNumber}. Active QA/QC interlock: Concrete cube test or statutory inspection hold open.`
        );
        return;
      }
    }

    if (!onStatusChange) return;

    startTransition(async () => {
      setSelectedAppId(app.id);
      try {
        await onStatusChange(app.id, newStatus);
      } finally {
        setSelectedAppId(null);
      }
    });
  };

  const handleWhatsAppDispatch = (app: RABillApplication) => {
    const text = `*QUADILLAR LIVEVIEW - RA BILL CERTIFICATION*
Bill Ref: ${app.billNumber}
Contractor: ${app.contractorName} (${app.tradePackage})
----------------------------------------
*Gross Work Done:* ${formatINR(app.currentWorkCompletedInr + app.storedMaterialsInr)}
*Statutory Deductions:*
• Retention (5%): -${formatINR(app.retainageAmountInr)}
• BOCW Cess (1%): -${formatINR(app.laborCessInr)}
• Mobilization Advance: -${formatINR(app.advanceRecoveryInr)}
• NCR Debit Liens: -${formatINR(app.ncrDebitRecoveryInr)}
----------------------------------------
*NET CERTIFIED PAYABLE:* ${formatINR(app.netPayableInr)}
*Status:* ${app.status.toUpperCase()}
Quality Interlock: ${app.concreteCubesPassed ? "IS 456 Cleared ✓" : "CUBES FAILED ❌"}`;

    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 font-mono text-xs select-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-[10px] text-zinc-500 uppercase tracking-wider">
              <th className="py-3 px-3.5 font-normal whitespace-nowrap">Bill Ref</th>
              <th className="py-3 px-3 font-normal min-w-[160px]">Contractor &amp; Package</th>
              <th className="py-3 px-3 font-normal text-right whitespace-nowrap">Gross Executed</th>
              <th className="py-3 px-3 font-normal text-right whitespace-nowrap text-rose-400">
                Retention (5%)
              </th>
              <th className="py-3 px-3 font-normal text-right whitespace-nowrap text-amber-400">
                Adv. / NCR Liens
              </th>
              <th className="py-3 px-3.5 font-normal text-right whitespace-nowrap text-emerald-400 font-bold">
                Net Payable (₹)
              </th>
              <th className="py-3 px-3 font-normal text-center whitespace-nowrap">Quality Gate</th>
              <th className="py-3 px-3 font-normal text-center whitespace-nowrap">Workflow Status</th>
              <th className="py-3 px-3 font-normal text-center whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {normalizedApplications.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-zinc-600 font-sans text-xs">
                  Zero running account bills compiled. Freeze E-MB lines to generate an RA Bill.
                </td>
              </tr>
            ) : (
              normalizedApplications.map((app) => {
                const grossWork = app.currentWorkCompletedInr + app.storedMaterialsInr;
                const totalLiabilities = app.advanceRecoveryInr + app.ncrDebitRecoveryInr;
                const isLocked = !app.qualityGatePassed || !app.concreteCubesPassed;

                return (
                  <tr key={app.id} className="hover:bg-zinc-800/20 transition-colors">
                    {/* Bill Reference */}
                    <td className="py-3 px-3.5 font-bold text-zinc-100 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-zinc-500" />
                        <span>{app.billNumber}</span>
                      </div>
                      {app.periodEnd && (
                        <span className="text-[10px] text-zinc-500 font-normal block mt-0.5">
                          Upto: {app.periodEnd}
                        </span>
                      )}
                    </td>

                    {/* Contractor & Trade */}
                    <td className="py-3 px-3 text-zinc-300">
                      <div className="font-semibold text-zinc-200">{app.contractorName}</div>
                      <div className="text-[10px] text-zinc-500 truncate">{app.tradePackage}</div>
                    </td>

                    {/* Gross Work Executed */}
                    <td className="py-3 px-3 text-right font-bold text-zinc-200 tabular-nums whitespace-nowrap">
                      {formatINR(grossWork)}
                      {app.storedMaterialsInr > 0 && (
                        <span className="text-[10px] text-zinc-500 block font-normal">
                          Mat: +{formatINR(app.storedMaterialsInr)}
                        </span>
                      )}
                    </td>

                    {/* Retention (5%) */}
                    <td className="py-3 px-3 text-right text-rose-400 tabular-nums whitespace-nowrap">
                      -{formatINR(app.retainageAmountInr)}
                      <span className="text-[9px] text-zinc-600 block">Cess: -{formatINR(app.laborCessInr)}</span>
                    </td>

                    {/* Advance Recovery & NCR Debit Liens */}
                    <td className="py-3 px-3 text-right text-amber-400 tabular-nums whitespace-nowrap">
                      {totalLiabilities > 0 ? (
                        <>
                          -{formatINR(totalLiabilities)}
                          {app.ncrDebitRecoveryInr > 0 && (
                            <span className="text-[9px] text-rose-500 font-bold block">
                              NCR: -{formatINR(app.ncrDebitRecoveryInr)}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-zinc-600">₹0.00</span>
                      )}
                    </td>

                    {/* Net Payable Certified */}
                    <td className="py-3 px-3.5 text-right font-bold text-emerald-400 text-sm tabular-nums whitespace-nowrap">
                      {formatINR(app.netPayableInr)}
                    </td>

                    {/* Quality & Strength Gate */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {isLocked ? (
                        <span
                          title="Quality hold: 28-day concrete cube test below fck or open structural NCR."
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-950/60 border border-rose-800 text-rose-400 text-[10px] font-bold"
                        >
                          <ShieldAlert className="h-3 w-3" />
                          <span>QA LOCK</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-950/60 border border-emerald-800 text-emerald-400 text-[10px] font-bold">
                          <ShieldCheck className="h-3 w-3" />
                          <span>IS 456 ✓</span>
                        </span>
                      )}
                    </td>

                    {/* Workflow Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="relative inline-block text-left">
                        {onStatusChange ? (
                          <div className="flex items-center">
                            <select
                              aria-label={`Update status for ${app.billNumber}`}
                              value={app.status}
                              disabled={isPending && selectedAppId === app.id}
                              onChange={(e) =>
                                handleStatusSelect(app, e.target.value as RABillStatus)
                              }
                              className={`appearance-none text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 pr-6 border cursor-pointer outline-none bg-zinc-950 transition-colors ${app.status === "Certified" || app.status === "Approved"
                                  ? "border-emerald-700 text-emerald-400"
                                  : app.status === "Paid"
                                    ? "border-sky-700 text-sky-400"
                                    : app.status === "Held"
                                      ? "border-rose-700 text-rose-400"
                                      : "border-zinc-700 text-zinc-400 hover:text-zinc-200"
                                }`}
                            >
                              <option value="Draft">Draft</option>
                              <option value="Submitted">Submitted</option>
                              <option value="Under_Review">Under Review</option>
                              <option value="Certified" disabled={isLocked}>
                                {isLocked ? "Certified (QA Locked)" : "Certified"}
                              </option>
                              <option value="Approved" disabled={isLocked}>
                                {isLocked ? "Approved (QA Locked)" : "Approved"}
                              </option>
                              <option value="Paid">Paid (Disbursed)</option>
                              <option value="Held">Held (Disputed)</option>
                            </select>
                            <ChevronDown className="h-3 w-3 text-zinc-500 absolute right-1.5 pointer-events-none" />
                          </div>
                        ) : (
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold uppercase border ${app.status === "Certified"
                                ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                                : app.status === "Paid"
                                  ? "bg-sky-950/60 border-sky-800 text-sky-400"
                                  : "bg-zinc-950 border-zinc-800 text-zinc-400"
                              }`}
                          >
                            {app.status}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* WhatsApp Commercial Dispatch */}
                        <button
                          type="button"
                          onClick={() => handleWhatsAppDispatch(app)}
                          title="Share Statutory RA Bill via WhatsApp"
                          className="p-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 transition-colors cursor-pointer"
                        >
                          <Share2 className="h-3 w-3" />
                        </button>

                        {/* Print / Export Document */}
                        <button
                          type="button"
                          onClick={() => window.print()}
                          title="Print CPWD Form 26"
                          className="p-1.5 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                        >
                          <Download className="h-3 w-3" />
                        </button>

                        {/* View Detailed Breakdown */}
                        {onViewDetails && (
                          <button
                            type="button"
                            onClick={() => onViewDetails(app.id)}
                            className="text-[10px] px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 uppercase font-semibold"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER STATUTORY LEDGER LEGEND */}
      <div className="p-3 bg-zinc-950/80 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-zinc-500">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <Lock className="h-3 w-3 text-zinc-600" />
            <span>Statutory Retentions: 5% Contract Value (CPWD Cl. 1A)</span>
          </span>
          <span className="hidden md:inline text-zinc-700">•</span>
          <span className="hidden md:inline">1% BOCW Welfare Cess Deducted At Source</span>
        </div>
        <div className="text-zinc-400 font-bold">
          Total Active RA Applications: {normalizedApplications.length}
        </div>
      </div>
    </div>
  );
}

export default PaymentApplicationTable;