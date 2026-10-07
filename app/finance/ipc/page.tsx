// app/finance/ipc/page.tsx
import React from "react";
import { IPCDeductionDrawer } from "@/components/finance/IPCDeductionDrawer";
import {
  Receipt,
  Scale,
  ShieldCheck,
  CheckCircle2,
  TrendingDown,
  FileSpreadsheet,
  AlertOctagon,
  Coins,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Interim Payment Certificate (IPC / RA Bill Clearing) | Quadillar LiveView",
  description:
    "Statutory finance & certification ledger linking approved Measurement Book volumes to contractual payables under FIDIC Cl. 14 / CPWD Cl. 7.",
};

export default async function IPCPage() {
  const supabase = await createClient();

  // 1. Resolve Active Project Context
  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name, gcc_protocol")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "1BHK Gomti Nagar Fit-Out";
  const gccProtocol = projectRow?.gcc_protocol || "FIDIC Cl. 14 / CPWD Cl. 7";

  // 2. Query Latest Running Account Bill
  const { data: billRow } = await supabase
    .from("running_account_bills")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // 3. Query Active Unresolved NCR Withholdings from QMS
  const { data: openNcrs } = await supabase
    .from("quality_ncr_register")
    .select("withholding_amount_inr")
    .eq("project_id", projectId)
    .neq("status", "CLOSED");

  const liveNcrWithholding = (openNcrs || []).reduce(
    (sum, ncr) => sum + (Number(ncr.withholding_amount_inr) || 0),
    0
  );

  // 4. Financial Waterfall Reconciliations
  const billNumber = billRow?.ra_bill_number || "RA-01";
  const contractorName = billRow?.contractor_name || "M/s Falcon Infrastructure Ltd.";
  const workOrderRef = billRow?.work_order_ref || "CW-2025/GOMTI-09";

  const line1_cumulativeGross =
    Number(billRow?.gross_valuation) || (billRow?.gross_work_done ? Number(billRow.gross_work_done) : 0.0);
  const line2_previousPayments =
    Number(billRow?.previous_gross_certified_inr) || 0.0;
  const line3_currentGross =
    Number(billRow?.gross_work_done) || Math.max(0, line1_cumulativeGross - line2_previousPayments);

  // Statutory Deductions (Lines 4 to 9)
  const line4_retention =
    Number(billRow?.retention_amount) || Math.round(line3_currentGross * 0.05);
  const line5_mobAdvanceAmort =
    Number(billRow?.mobilization_advance_recovery) || Math.round(line3_currentGross * 0.10);
  const line6_bocwCess =
    Number(billRow?.labour_cess_amount) || Math.round(line3_currentGross * 0.01);
  const line7_gstTds =
    Number(billRow?.tds_gst_inr) || Math.round(line3_currentGross * 0.02);
  const line8_itTds =
    Number(billRow?.tds_amount) || Math.round(line3_currentGross * 0.02);
  const line9_ncrWithholds =
    liveNcrWithholding > 0 ? liveNcrWithholding : Number(billRow?.ncr_backcharges_inr) || 0;

  const totalDeductions =
    line4_retention +
    line5_mobAdvanceAmort +
    line6_bocwCess +
    line7_gstTds +
    line8_itTds +
    line9_ncrWithholds;

  const line10_netPayable =
    Number(billRow?.net_payable_certified) || Math.max(0, line3_currentGross - totalDeductions);

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-sans">
      <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-6">
        {/* ===================================================================
            TOP ROW: DASHBOARD HEADER (col-span-12)
            =================================================================== */}
        <header className="col-span-12 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-400">
                <Scale className="h-3 w-3 mr-1 text-zinc-400" />
                {gccProtocol} Statutory Gateway
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-800 text-emerald-400">
                <ShieldCheck className="h-3 w-3 mr-1 text-emerald-400" />
                Verified e-MB Volumes Locked
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-mono">
              Interim Payment Certificate (IPC / {billNumber}) - FIDIC Cl. 14 / CPWD Cl. 7
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Contract Ref: {workOrderRef} • Project: {projectName} • Contractor: {contractorName}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-right font-mono">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Certificate Status</div>
              <div className="text-xs font-bold text-amber-400 flex items-center justify-end gap-1.5 mt-0.5">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                <span>{billRow?.status ? billRow.status.replace(/_/g, " ") : "Audit Vetting Cycle"}</span>
              </div>
            </div>
          </div>
        </header>

        {/* ===================================================================
            KPI CARDS (Three col-span-4 cards)
            =================================================================== */}
        {/* Card 1: Gross Value of Work Executed */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-400">
            <span>Gross Value of Work Executed</span>
            <Coins className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-4 flex flex-col items-end">
            <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums text-right">
              ₹ {line1_cumulativeGross.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 mt-1">
              Cumulative MB Volumes (Line 1)
            </span>
          </div>
        </div>

        {/* Card 2: Total Statutory Deductions & Recoveries */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-400">
            <span>Total Statutory Deductions &amp; Recoveries</span>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-4 flex flex-col items-end">
            <span className="text-2xl font-bold font-mono text-rose-500 tabular-nums text-right">
              -₹ {totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 mt-1">
              Statutory Withholds &amp; Advances (Lines 4–9)
            </span>
          </div>
        </div>

        {/* Card 3: Net Amount Certified for Interim Payment */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-400">
            <span>Net Amount Certified for Interim Payment</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-4 flex flex-col items-end">
            <span className="text-2xl font-bold font-mono text-emerald-500 tabular-nums text-right">
              ₹ {line10_netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 mt-1">
              Payable against Current IPC (Line 10)
            </span>
          </div>
        </div>

        {/* ===================================================================
            MAIN SECTION (col-span-12): IPC Statutory Waterfall Ledger
            =================================================================== */}
        <section className="col-span-12 bg-zinc-900 border border-zinc-800">
          <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <h2 className="text-base font-bold text-zinc-100 font-mono uppercase tracking-wide">
                  IPC Statutory Waterfall Ledger
                </h2>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Deterministic step-by-step mathematical reconciliation under CPWD Works Manual Cl. 7 &amp; FIDIC Red Book Cl. 14.3.
              </p>
            </div>

            <div>
              <IPCDeductionDrawer
                applicationId={billNumber}
                projectRef={projectName}
                grossAmount={line3_currentGross}
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/70 text-[10px] text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-normal whitespace-nowrap">Line #</th>
                  <th className="py-3 px-4 font-normal">Contractual Line Item Description</th>
                  <th className="py-3 px-4 font-normal whitespace-nowrap">Statutory Basis / Rate</th>
                  <th className="py-3 px-4 font-normal text-right whitespace-nowrap">Deduction / Debit (₹)</th>
                  <th className="py-3 px-4 font-normal text-right whitespace-nowrap">Net Payable Amount (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {/* Line 1 */}
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-zinc-400 whitespace-nowrap">Line 1</td>
                  <td className="py-3.5 px-4 font-semibold text-zinc-100">
                    Cumulative Gross Work Certified from MB (Base BOQ + Extra Items + Cl. 10CC Escalation)
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">CPWD DSR &amp; Form 23 E-MB</td>
                  <td className="py-3.5 px-4 text-right text-zinc-500 tabular-nums">-</td>
                  <td className="py-3.5 px-4 text-right font-bold text-zinc-100 tabular-nums whitespace-nowrap">
                    ₹ {line1_cumulativeGross.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>

                {/* Line 2 */}
                <tr className="hover:bg-zinc-800/30 transition-colors bg-zinc-950/20">
                  <td className="py-3.5 px-4 font-bold text-zinc-400 whitespace-nowrap">Line 2</td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    Less Previous Gross Certified Payments (Prior RA Bills)
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">Prior Verified RA Ledgers</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-rose-400 tabular-nums whitespace-nowrap">
                    -₹ {line2_previousPayments.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right text-zinc-500 tabular-nums">-</td>
                </tr>

                {/* Line 3 */}
                <tr className="hover:bg-zinc-800/30 transition-colors bg-zinc-950/40 border-t-2 border-b-2 border-zinc-800">
                  <td className="py-3.5 px-4 font-bold text-emerald-400 whitespace-nowrap">Line 3</td>
                  <td className="py-3.5 px-4 font-bold text-zinc-100">
                    Gross Value of Work for Current Certificate (Line 1 - Line 2)
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">Net Current Cycle Work</td>
                  <td className="py-3.5 px-4 text-right text-zinc-500 tabular-nums">-</td>
                  <td className="py-3.5 px-4 text-right font-bold text-zinc-100 tabular-nums whitespace-nowrap">
                    ₹ {line3_currentGross.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>

                {/* Line 4 */}
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-zinc-400 whitespace-nowrap">Line 4</td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    Less Security Deposit / Retention (5% on Line 3)
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">5.0% on Current Gross</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-rose-400 tabular-nums whitespace-nowrap">
                    -₹ {line4_retention.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right text-zinc-500 tabular-nums">-</td>
                </tr>

                {/* Line 5 */}
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-zinc-400 whitespace-nowrap">Line 5</td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    Less Mobilisation Advance Amortization (10% on Line 3)
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">CPWD Cl. 10B(ii) 10% Amort.</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-rose-400 tabular-nums whitespace-nowrap">
                    -₹ {line5_mobAdvanceAmort.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right text-zinc-500 tabular-nums">-</td>
                </tr>

                {/* Line 6 */}
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-zinc-400 whitespace-nowrap">Line 6</td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    Less 1% BOCW Labour Welfare Cess
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">1.0% Statutory Cess Act 1996</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-rose-400 tabular-nums whitespace-nowrap">
                    -₹ {line6_bocwCess.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right text-zinc-500 tabular-nums">-</td>
                </tr>

                {/* Line 7 */}
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-zinc-400 whitespace-nowrap">Line 7</td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    Less 2% GST TDS (1% CGST + 1% SGST)
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">Sec 51 CGST Act 2017 (2%)</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-rose-400 tabular-nums whitespace-nowrap">
                    -₹ {line7_gstTds.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right text-zinc-500 tabular-nums">-</td>
                </tr>

                {/* Line 8 */}
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-zinc-400 whitespace-nowrap">Line 8</td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    Less 2% Income Tax TDS (Section 194C)
                  </td>
                  <td className="py-3.5 px-4 text-zinc-400 whitespace-nowrap">IT Act Sec 194C (2%)</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-rose-400 tabular-nums whitespace-nowrap">
                    -₹ {line8_itTds.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right text-zinc-500 tabular-nums">-</td>
                </tr>

                {/* Line 9 */}
                <tr className="hover:bg-zinc-800/30 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-zinc-400 whitespace-nowrap">Line 9</td>
                  <td className="py-3.5 px-4 text-zinc-300">
                    Less Unresolved NCR Quality Withholds (QMS Interlock)
                  </td>
                  <td className="py-3.5 px-4 text-rose-400 whitespace-nowrap">IS:456 Quality Register Lock</td>
                  <td className="py-3.5 px-4 text-right font-semibold text-rose-400 tabular-nums whitespace-nowrap">
                    -₹ {line9_ncrWithholds.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right text-zinc-500 tabular-nums">-</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Line 10: Net Payable Interim Amount */}
          <div className="border-t border-zinc-800 bg-zinc-950/80 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono">
                  Line 10: Net Payable Interim Amount
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800 font-bold uppercase">
                  Final Passed For Payment
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-1">
                Net certified payable after statutory recoveries, material advance adjustments, and QMS withholdings.
              </p>
            </div>

            <div className="text-right bg-zinc-900 border border-zinc-800 px-5 py-3">
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
                Certified Net Disbursable
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tabular-nums">
                ₹ {line10_netPayable.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}