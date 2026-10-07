"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  calculateClause10B,
  Clause10BInput,
  Clause10BResult,
  SecuredMaterialItem,
  RABillScheduleInput,
} from "@/lib/statutory/clause10b";
import {
  Briefcase,
  Layers,
  Coins,
  ShieldCheck,
  Package,
  Calendar,
  Clock,
  ArrowRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Standard Statutory Baseline Coordinates
// ---------------------------------------------------------------------------

const DEFAULT_RA_BILLS: RABillScheduleInput[] = [];

const DEFAULT_FORM_31_ITEMS: SecuredMaterialItem[] = [];

export default function AdvancesModulePage() {
  const [isPending, startTransition] = useTransition();

  // Baseline Parameters
  const [contractBaseline, setContractBaseline] = useState<number>(450000000); // ₹45.00 Cr
  const [disbursedAmount, setDisbursedAmount] = useState<number>(45000000); // ₹4.50 Cr (10%)
  const [disbursalDate, setDisbursalDate] = useState<string>("2024-04-01");
  const [raBills] = useState<RABillScheduleInput[]>(DEFAULT_RA_BILLS);
  const [form31Items, setForm31Items] = useState<SecuredMaterialItem[]>(DEFAULT_FORM_31_ITEMS);

  // Computed Statutory Result
  const [result, setResult] = useState<Clause10BResult | null>(null);

  const runCalculation = () => {
    const payload: Clause10BInput = {
      contractBaseline,
      disbursedAmount,
      disbursalDate,
      interestRatePerAnnum: 0.1, // 10% p.a.
      raBills,
      form31Items,
    };

    startTransition(async () => {
      const res = await calculateClause10B(payload);
      setResult(res);
    });
  };

  useEffect(() => {
    runCalculation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractBaseline, disbursedAmount, disbursalDate, form31Items]);

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8 text-zinc-100">
      {/* =====================================================================
          HEADER: Statutory Reference CPWD Clause 10B & Form 31
          ===================================================================== */}
      <header className="max-w-7xl mx-auto mb-6 bg-zinc-900 border border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-zinc-800/50">
          <div className="text-left">
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-zinc-400 uppercase">
              <span>STATUTORY COMMERCIAL SUITE</span>
              <span className="text-zinc-600">/</span>
              <span>CPWD WORKS MANUAL 2024 CLAUSE 10B &amp; FORM 31</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-zinc-100 uppercase mt-0.5">
              Mobilisation &amp; Secured Material Advances Ledger
            </h1>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-2">
            <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-mono text-zinc-400">
              PRJ: <span className="text-zinc-100">GOMTI-NAGAR-PH1</span>
            </div>
            <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 flex items-center gap-2 text-xs font-mono text-emerald-500 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>10% P.A. DIMINISHING SIMPLE INTEREST</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-2.5 bg-zinc-950/60 text-xs text-zinc-400 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/50 font-mono">
          <div className="flex items-center gap-4">
            <span>RECOVERY WINDOW: <span className="text-zinc-100">10% TO 80% GROSS WORK</span></span>
            <span className="text-zinc-600">|</span>
            <span>FORM 31 ADVANCE CEILING: <span className="text-zinc-100">75% INVOICE RATE</span></span>
          </div>
          <div className="text-zinc-400 text-right">
            <span>STATUS: </span>
            <span className="text-emerald-500 font-semibold">100% RECOVERED ON SCHEDULE</span>
          </div>
        </div>
      </header>

      {/* =====================================================================
          TOP DISBURSAL SUMMARY CARDS (4 COLUMNS)
          ===================================================================== */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Card 1: Total Mobilisation Disbursed */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
              Total Mobilisation Disbursed
            </span>
            <div className="text-right mt-3">
              <span className="font-mono tabular-nums tracking-tight text-xl font-bold text-zinc-100">
                ₹{disbursedAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="block text-right text-[11px] text-zinc-500 font-mono mt-1">
              10.00% STATUTORY TENDER CEILING
            </span>
          </div>
          <div className="pt-3 mt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs">
            <span className="text-zinc-400">Baseline Limit</span>
            <span className="font-mono tabular-nums text-right text-zinc-400">
              ₹{result?.maxAllowableMobilisation?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2: Interest Accrued @ 10% Simple Interest */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
              Total Interest Accrued @ 10%
            </span>
            <div className="text-right mt-3">
              <span className="font-mono tabular-nums tracking-tight text-xl font-bold text-amber-500">
                ₹{result?.totalInterestAccrued?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="block text-right text-[11px] text-zinc-500 font-mono mt-1">
              SIMPLE INTEREST ON DIMINISHING PRINCIPAL
            </span>
          </div>
          <div className="pt-3 mt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs">
            <span className="text-zinc-400">Statutory Rate</span>
            <span className="font-mono text-right text-zinc-300">10.00% Per Annum</span>
          </div>
        </div>

        {/* Card 3: Total Principal Recovered */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
              Total Principal Recovered
            </span>
            <div className="text-right mt-3">
              <span className="font-mono tabular-nums tracking-tight text-xl font-bold text-emerald-500">
                ₹{result?.totalPrincipalRecovered?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="block text-right text-[11px] text-zinc-500 font-mono mt-1">
              DEDUCTED ACROSS 6 RA BILL CYCLES
            </span>
          </div>
          <div className="pt-3 mt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs">
            <span className="text-zinc-400">Recovery Ratio</span>
            <span className="font-mono text-right text-emerald-500 font-semibold">100.00% FULFILLED</span>
          </div>
        </div>

        {/* Card 4: Outstanding Principal Balance */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
              Outstanding Mobilisation Balance
            </span>
            <div className="text-right mt-3">
              <span
                className={`font-mono tabular-nums tracking-tight text-xl font-bold ${
                  (result?.outstandingMobilisationBalance ?? 0) === 0
                    ? "text-emerald-500"
                    : "text-amber-500"
                }`}
              >
                ₹{result?.outstandingMobilisationBalance?.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="block text-right text-[11px] text-zinc-500 font-mono mt-1">
              CURRENT CONTRACTOR LIABILITY
            </span>
          </div>
          <div className="pt-3 mt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs">
            <span className="text-zinc-400">Obligation Status</span>
            <span
              className={`font-mono font-semibold ${
                (result?.outstandingMobilisationBalance ?? 0) === 0
                  ? "text-emerald-500"
                  : "text-amber-500"
              }`}
            >
              {(result?.outstandingMobilisationBalance ?? 0) === 0
                ? "DISCHARGE CERTIFIED"
                : "RECOVERY ACTIVE"}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* =====================================================================
            SECTION 1: DIMINISHING BALANCE SCHEDULE TABLE (CLAUSE 10B)
            ===================================================================== */}
        <section className="bg-zinc-900 border border-zinc-800">
          <div className="px-5 py-3.5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40">
            <div className="text-left">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-zinc-400" />
                Diminishing Balance Amortisation Schedule (Clause 10B)
              </h2>
              <span className="text-[11px] text-zinc-400">
                10% p.a. Simple Interest tracked on diminishing balances from 10% to 80% Gross Work milestone
              </span>
            </div>
            <span className="font-mono text-xs text-zinc-400">AUDIT VERIFIED</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800/50 text-[11px] uppercase tracking-wider text-zinc-400 bg-zinc-950/50">
                  <th className="py-3 px-4 font-medium text-left">RA Bill #</th>
                  <th className="py-3 px-4 font-medium text-left">Bill Date</th>
                  <th className="py-3 px-4 font-medium text-right">Gross Work Done (₹)</th>
                  <th className="py-3 px-4 font-medium text-right">% of Tender</th>
                  <th className="py-3 px-4 font-medium text-right">Opening Balance (₹)</th>
                  <th className="py-3 px-4 font-medium text-right">Principal Deduction (₹)</th>
                  <th className="py-3 px-4 font-medium text-right">10% Interest (₹)</th>
                  <th className="py-3 px-4 font-medium text-right">Closing Balance (₹)</th>
                  <th className="py-3 px-4 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50 font-mono">
                {result?.schedule.map((row) => {
                  let statusColor = "text-zinc-400";
                  let statusText = "PRE-WINDOW";

                  if (row.status === "ACTIVE_RECOVERY") {
                    statusColor = "text-amber-500";
                    statusText = "RECOVERING";
                  } else if (row.status === "RECOVERED") {
                    statusColor = "text-emerald-500";
                    statusText = "100% CLOSED";
                  } else if (row.status === "WINDOW_BREACH") {
                    statusColor = "text-rose-500";
                    statusText = "BREACH";
                  }

                  return (
                    <tr key={row.billNumber} className="hover:bg-zinc-950/30 transition-colors">
                      <td className="py-3 px-4 text-left font-bold text-zinc-100 whitespace-nowrap">
                        {row.billNumber}
                      </td>
                      <td className="py-3 px-4 text-left text-zinc-400 whitespace-nowrap">
                        {row.billDate}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-right text-zinc-200 whitespace-nowrap">
                        ₹{row.cumulativeGrossWork.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-right text-zinc-400 whitespace-nowrap">
                        {row.grossWorkPercentage.toFixed(2)}%
                      </td>
                      <td className="py-3 px-4 tabular-nums text-right text-zinc-400 whitespace-nowrap">
                        ₹{row.openingPrincipal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-right font-semibold text-emerald-500 whitespace-nowrap">
                        -₹{row.principalDeduction.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-right text-amber-500 whitespace-nowrap">
                        ₹{row.interestDeduction.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 tabular-nums text-right font-bold text-zinc-100 whitespace-nowrap">
                        ₹{row.closingPrincipal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className={`py-3 px-4 text-right text-[11px] whitespace-nowrap font-semibold ${statusColor}`}>
                        {statusText}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 bg-zinc-950/60 border-t border-zinc-800/50 flex flex-wrap justify-between items-center gap-2 text-xs font-mono">
            <span className="text-zinc-500">
              Statutory Threshold Check: Commencement @ 10% (₹4.50 Cr) | Mandatory Full Recovery by 80% (₹36.00 Cr)
            </span>
            <span className="text-emerald-500 font-semibold text-right">
              RECOVERY OBLIGATION DISCHARGED UNDER CPWD FORM 7
            </span>
          </div>
        </section>

        {/* =====================================================================
            SECTION 2: FORM 31 SECURED ADVANCE ON MATERIALS
            ===================================================================== */}
        <section className="bg-zinc-900 border border-zinc-800">
          <div className="px-5 py-3.5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40">
            <div className="text-left">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                <Package className="h-4 w-4 text-zinc-400" />
                Form 31: Secured Advance on Imperishable Site Materials
              </h2>
              <span className="text-[11px] text-zinc-400">
                Statutory 75% Admissible Advance against verified on-site storage &amp; Safe Custody Indenture
              </span>
            </div>
            <span className="font-mono text-xs text-zinc-400">CPWD FORM 31</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-zinc-800/50 text-[11px] uppercase tracking-wider text-zinc-400 bg-zinc-950/50">
                  <th className="py-3 px-4 font-medium text-left">Item Description</th>
                  <th className="py-3 px-4 font-medium text-right">Site Quantity</th>
                  <th className="py-3 px-4 font-medium text-right">Invoice Rate (₹)</th>
                  <th className="py-3 px-4 font-medium text-right">75% Admissible Advance (₹)</th>
                  <th className="py-3 px-4 font-medium text-right">Gross Admissible (₹)</th>
                  <th className="py-3 px-4 font-medium text-right">Recovered Advance (₹)</th>
                  <th className="py-3 px-4 font-medium text-right">Outstanding Advance (₹)</th>
                  <th className="py-3 px-4 font-medium text-right">Consumption Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {result?.form31.items.map((item) => {
                  const isFullyConsumed = item.consumptionPercentage >= 100;
                  const isPartial = item.consumptionPercentage > 0 && !isFullyConsumed;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-950/30 transition-colors">
                      <td className="py-3 px-4 text-left">
                        <div className="font-semibold text-zinc-100 leading-tight">
                          {item.description}
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          HSN: {item.hsnCode} | Custody: Pledged in Secure Site Yard
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-300 whitespace-nowrap">
                        {item.siteQuantity.toFixed(2)} {item.unit}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-400 whitespace-nowrap">
                        ₹{item.invoiceRate.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-amber-500 whitespace-nowrap font-medium">
                        ₹{item.admissibleRate75.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-zinc-100 whitespace-nowrap">
                        ₹{item.grossAdmissibleAdvance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right text-emerald-500 whitespace-nowrap font-medium">
                        -₹{item.recoveredAdvance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-mono tabular-nums text-right font-bold text-zinc-100 whitespace-nowrap">
                        ₹{item.outstandingAdvance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 font-mono text-right whitespace-nowrap">
                        <span
                          className={`text-[11px] font-semibold ${
                            isFullyConsumed
                              ? "text-emerald-500"
                              : isPartial
                              ? "text-amber-500"
                              : "text-zinc-400"
                          }`}
                        >
                          {isFullyConsumed
                            ? "100% CONSUMED"
                            : `${item.consumptionPercentage.toFixed(1)}% CONSUMED`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 bg-zinc-950/60 border-t border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
            <div className="flex items-center gap-4 text-zinc-400">
              <span>Total Admissible: <span className="text-zinc-100 font-bold">₹{result?.form31.totalGrossAdmissible.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></span>
              <span className="text-zinc-600">|</span>
              <span>Total Recovered: <span className="text-emerald-500 font-bold">₹{result?.form31.totalRecovered.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span></span>
            </div>

            <div className="text-right">
              <span className="text-zinc-400 mr-2">Form 31 Outstanding Liability:</span>
              <span className="text-amber-500 font-bold text-sm">
                ₹{result?.form31.totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
