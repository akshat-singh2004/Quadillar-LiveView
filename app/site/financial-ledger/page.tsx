"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  computeVanguardFinancialState,
  VanguardProjectFinancialState
} from "@/lib/calculations/commercialFinanceEngine";

// --- INLINE SVG ICONS ---
const IndianRupeeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 3h12M6 8h12M6 13l7.5 8M6 13h3a4.5 4.5 0 000-9H6" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 00-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const LockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const FileTextIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const RefreshIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function VanguardCommercialMasterPage() {
  const [activeTab, setActiveTab] = useState<"BOQ_PACKAGES" | "RA_BILLS" | "TAX_RECONCILIATION">("BOQ_PACKAGES");
  const [ncrLienDeduction, setNcrLienDeduction] = useState<number>(208720); // Beam C2 Honeycombing Lien
  const [clause42Debit, setClause42Debit] = useState<number>(37740);       // Cement Over-consumption
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  // Compute live project financial ledger
  const finances: VanguardProjectFinancialState = useMemo(() => {
    return computeVanguardFinancialState({
      customNcrLienInr: ncrLienDeduction,
      customClause42DebitInr: clause42Debit
    });
  }, [ncrLienDeduction, clause42Debit]);

  const handleSealCommercialLedger = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_FINANCE_BAC_${finances.contractBacInr}_EV_${finances.totalEarnedValueInr}_DISBURSED_${finances.totalNetDisbursedToContractorInr}_ESCROW_${finances.currentEscrowAccountBalanceInr}_${timestamp}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "PLUTUS-COMMERCIAL",
          synthesis_report: `COMMERCIAL LEDGER NOTARIZED: BAC ₹${(finances.contractBacInr / 100000).toFixed(2)}L • Gross Work Done: ₹${(finances.grossCertifiedWorkDoneInr / 100000).toFixed(2)}L • Total Disbursed: ₹${(finances.totalNetDisbursedToContractorInr / 100000).toFixed(2)}L • Retentions & Liens: ₹${((finances.totalRetentionWithheldInr + finances.totalContractualLiensAndPenaltiesInr) / 100000).toFixed(2)}L • Escrow Balance: ₹${(finances.currentEscrowAccountBalanceInr / 100000).toFixed(2)}L`,
          merkle_root_hash: hash
        });
      } catch (e) {}
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              PROJECT VANGUARD COMMERCIAL ENGINE
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              CPWD GCC / FIDIC CL. 14 / GST-TDS
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            STATUTORY COMMERCIAL BILLING & ESCROW DISBURSEMENT
          </h1>
          <p className="text-xs text-slate-400">
            Total Sanctioned BAC: ₹1,85,92,000 (₹1.859 Cr) • 449 m² BUA • Multi-Tier Tax Withholding & Milestone Escrow Ledger
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/emb" className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs rounded-lg transition">📑 e-MB BILLING</a>
          <a href="/site/material-recon" className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition">⚖️ CL. 42 RECON</a>
        </div>
      </div>

      {/* Primary KPI Commercial Strip */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">TOTAL CONTRACT BAC</div>
          <div className="text-lg font-bold text-white mt-1 font-mono">
            ₹{(finances.contractBacInr / 100000).toFixed(2)} L
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">₹41,400 / m² Baseline</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">EARNED VALUE (PHYSICAL)</div>
          <div className="text-lg font-bold text-cyan-400 mt-1 font-mono">
            ₹{(finances.totalEarnedValueInr / 100000).toFixed(2)} L
          </div>
          <div className="text-[10px] text-emerald-400 mt-0.5">{finances.financialProgressPct}% Complete</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">GROSS BILLING (e-MB)</div>
          <div className="text-lg font-bold text-white mt-1 font-mono">
            ₹{(finances.grossCertifiedWorkDoneInr / 100000).toFixed(2)} L
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Bills RA-01 to RA-05</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">STATUTORY TAXES & CESS</div>
          <div className="text-lg font-bold text-red-400 mt-1 font-mono">
            -₹{(finances.totalStatutoryTaxDeductionsInr / 100000).toFixed(2)} L
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">TDS 2% + GST 2% + Cess 1%</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">NET DISBURSED</div>
          <div className="text-lg font-bold text-emerald-400 mt-1 font-mono">
            ₹{(finances.totalNetDisbursedToContractorInr / 100000).toFixed(2)} L
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Transferred to L&T A/C</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">ESCROW REMAINING</div>
          <div className="text-lg font-bold text-purple-400 mt-1 font-mono">
            ₹{(finances.currentEscrowAccountBalanceInr / 100000).toFixed(2)} L
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">ICICI Bank Escrow Vault</div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 text-xs">
        <button
          onClick={() => setActiveTab("BOQ_PACKAGES")}
          className={`py-2 px-4 border-b-2 font-bold transition ${
            activeTab === "BOQ_PACKAGES"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          BOQ WORK BREAKDOWN STRUCTURE (5 PACKAGES)
        </button>
        <button
          onClick={() => setActiveTab("RA_BILLS")}
          className={`py-2 px-4 border-b-2 font-bold transition ${
            activeTab === "RA_BILLS"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          INTERIM PAYMENT CERTIFICATES (RA-01 TO RA-05)
        </button>
        <button
          onClick={() => setActiveTab("TAX_RECONCILIATION")}
          className={`py-2 px-4 border-b-2 font-bold transition ${
            activeTab === "TAX_RECONCILIATION"
              ? "border-cyan-400 text-cyan-400"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          TAX, LIEN & WITHHOLDING BREAKDOWN
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === "BOQ_PACKAGES" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <IndianRupeeIcon className="w-3.5 h-3.5 text-cyan-400" />
              ITEMIZED BILL OF QUANTITIES (BOQ) SCHEDULE RATE BREAKDOWN
            </span>
            <span className="text-cyan-400 font-mono text-[10px]">TOTAL BAC: ₹1.859 CR</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">PACKAGE & WBS</th>
                  <th className="py-2.5 px-3">DISCIPLINE</th>
                  <th className="py-2.5 px-3 text-right">BUDGET (INR)</th>
                  <th className="py-2.5 px-3 text-center">WEIGHT</th>
                  <th className="py-2.5 px-3">PHYSICAL COMPLETION</th>
                  <th className="py-2.5 px-3 text-right">EARNED VALUE</th>
                  <th className="py-2.5 px-3 text-right">ACTUAL SPENT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 text-[11px]">
                {finances.boqPackages.map(pkg => (
                  <tr key={pkg.packageId} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{pkg.packageName}</div>
                      <div className="text-[10px] text-slate-500">{pkg.packageId} • {pkg.wbsCode}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-950 text-cyan-400 border border-cyan-500/20">
                        {pkg.category.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white">
                      ₹{pkg.sanctionedBudgetInr.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center text-slate-400">
                      {pkg.weightagePct}%
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-cyan-500 h-full rounded-full"
                            style={{ width: `${pkg.measuredCompletedQty}%` }}
                          />
                        </div>
                        <span className="font-bold text-white">{pkg.measuredCompletedQty}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">
                      ₹{pkg.earnedValueInr.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-amber-400">
                      ₹{pkg.spentValueInr.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-400 flex flex-col md:flex-row justify-between gap-2">
            <span>
              Cumulative Cost Performance Index (CPI = EV / AC): <strong className="text-emerald-400">{finances.costPerformanceIndex}</strong> (Project is on budget).
            </span>
            <span className="font-bold text-cyan-400">
              Total Work Executed: ₹{finances.totalEarnedValueInr.toLocaleString()} of ₹{finances.contractBacInr.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {activeTab === "RA_BILLS" && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileTextIcon className="w-3.5 h-3.5 text-cyan-400" />
              RUNNING ACCOUNT BILL LEDGER & STATUTORY WITHHOLDINGS (RA-01 TO RA-05)
            </span>
            <span className="text-cyan-400 font-mono text-[10px]">5 BILLS AUDITED</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">BILL #</th>
                  <th className="py-2.5 px-3">PERIOD DESCRIPTION</th>
                  <th className="py-2.5 px-3 text-right">GROWD (INR)</th>
                  <th className="py-2.5 px-3 text-right">RETENTION (5%)</th>
                  <th className="py-2.5 px-3 text-right">ADVANCE (10%)</th>
                  <th className="py-2.5 px-3 text-right">TAXES (5%)</th>
                  <th className="py-2.5 px-3 text-right">LIENS / DEBITS</th>
                  <th className="py-2.5 px-3 text-right">NET CERTIFIED</th>
                  <th className="py-2.5 px-3 text-center">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 text-[11px]">
                {finances.historicalBills.map(bill => (
                  <tr key={bill.billNumber} className="hover:bg-slate-900/40">
                    <td className="py-3 px-3 font-bold text-white">{bill.billNumber}</td>
                    <td className="py-3 px-3">
                      <div className="text-white font-semibold">{bill.periodName}</div>
                      <div className="text-[10px] text-slate-500">Period End: {bill.periodEndDate}</div>
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-white">
                      ₹{bill.grossValueWorkDoneInr.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-red-400">
                      -₹{bill.retentionWithheldInr.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-red-400">
                      -₹{bill.mobilizationAdvanceRepaidInr.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right text-red-400">
                      -₹{(bill.incomeTaxTdsInr + bill.gstTdsInr + bill.bocwLaborCessInr).toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right font-bold">
                      {bill.contractualDebitsInr > 0 ? (
                        <span className="text-amber-400">-₹{bill.contractualDebitsInr.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-500">₹0</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-400">
                      ₹{bill.netCertifiedAmountInr.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        bill.disbursementStatus === "DISBURSED"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-950 text-amber-400 border border-amber-500/30"
                      }`}>
                        {bill.disbursementStatus.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
            <span>Bill RA-05 is currently held under Section 65B Audit review due to Open Quality Lien on Beam C2.</span>
            <span className="font-bold text-emerald-400">
              Total Disbursed to Date: ₹{finances.totalNetDisbursedToContractorInr.toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {activeTab === "TAX_RECONCILIATION" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Statutory Tax Breakdown */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              STATUTORY GOVERNMENT TAX REMITTANCE SUMMARY
            </span>

            <div className="flex flex-col gap-2 text-xs">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">Income Tax TDS u/s 194C (2.0%)</div>
                  <div className="text-[10px] text-slate-500">Deposited under Form 26AS with NSDL</div>
                </div>
                <span className="font-mono font-bold text-red-400 text-sm">
                  ₹{(finances.grossCertifiedWorkDoneInr * 0.02).toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">GST-TDS u/s 51 (2.0% Total)</div>
                  <div className="text-[10px] text-slate-500">1.0% CGST + 1.0% SGST (Uttar Pradesh GSTN)</div>
                </div>
                <span className="font-mono font-bold text-red-400 text-sm">
                  ₹{(finances.grossCertifiedWorkDoneInr * 0.02).toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">BOCW Labor Welfare Cess (1.0%)</div>
                  <div className="text-[10px] text-slate-500">UP Building & Other Construction Workers Board</div>
                </div>
                <span className="font-mono font-bold text-red-400 text-sm">
                  ₹{(finances.grossCertifiedWorkDoneInr * 0.01).toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">Security Deposit / Retention (5.0%)</div>
                  <div className="text-[10px] text-slate-500">Held until 12-Month Defect Liability Expiry</div>
                </div>
                <span className="font-mono font-bold text-amber-400 text-sm">
                  ₹{finances.totalRetentionWithheldInr.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Contractual Liens & Recoveries */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              CONTRACTUAL LIENS & PENAL DEBITS (BILL RA-05)
            </span>

            <div className="flex flex-col gap-2 text-xs">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">Beam C2 Honeycombing Defect Lien (NCR #009)</div>
                  <div className="text-[10px] text-slate-500">Withheld pending in-situ UPV NDT clearance (85% f_ck)</div>
                </div>
                <span className="font-mono font-bold text-red-400 text-sm">
                  -₹{ncrLienDeduction.toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">CPWD Clause 42 Material Penal Debit</div>
                  <div className="text-[10px] text-slate-500">Excess cement wastage charged at double schedule rate</div>
                </div>
                <span className="font-mono font-bold text-red-400 text-sm">
                  -₹{clause42Debit.toLocaleString()}
                </span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <div className="font-bold text-white">Mobilization Advance Repayment (Cumulative)</div>
                  <div className="text-[10px] text-slate-500">Amortized at 10.0% of gross work done</div>
                </div>
                <span className="font-mono font-bold text-white text-sm">
                  -₹{(finances.grossCertifiedWorkDoneInr * 0.10).toLocaleString()}
                </span>
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-slate-800 text-[10px] text-slate-400">
                All withholdings remain locked in the sovereign escrow pool until joint tripartite clearance is executed by CBRE (PMC) and Vanguard Holdings.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 65B Commercial Notarization Bar */}
      <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
            <span>SECTION 65B COMMERCIAL AUDIT NOTARIZATION</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            Cryptographically attests the BAC, BOQ schedule valuations, tax withholdings, and net contractor disbursements.
          </div>
        </div>

        <div>
          {sealedHash ? (
            <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400">
              <CheckIcon className="w-4 h-4" />
              <span className="font-mono text-[10px] select-all">{sealedHash.substring(0, 28)}...</span>
            </div>
          ) : (
            <button
              onClick={handleSealCommercialLedger}
              disabled={isNotarizing}
              className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
            >
              {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <LockIcon className="w-4 h-4 text-slate-950" />}
              <span>SEAL & NOTARIZE COMMERCIAL LEDGER</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
