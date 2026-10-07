"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  calculateFinalBillAndRetention,
  FinalBillInput,
  Clause9_17Result,
} from "@/lib/statutory/clause9_17";
import {
  Scale,
  ShieldCheck,
  FileCheck2,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  Calendar,
  Coins,
  CheckCircle2,
  FileText,
  FileSpreadsheet,
} from "lucide-react";

export default function FinalBillRetentionPage() {
  const [isPending, startTransition] = useTransition();

  // Baseline Financial Coordinates
  const [measuredWorkValue, setMeasuredWorkValue] = useState<number>(425000000); // ₹42.50 Cr
  const [clause12VariationsValue, setClause12VariationsValue] = useState<number>(3875500); // +₹38.75 L
  const [clause10ccEscalationValue, setClause10ccEscalationValue] = useState<number>(5295500); // +₹52.95 L
  const [priorRaBillsPaid, setPriorRaBillsPaid] = useState<number>(385000000); // ₹38.50 Cr
  const [unrecoveredAdvances, setUnrecoveredAdvances] = useState<number>(0);
  const [leviedLiquidatedDamages, setLeviedLiquidatedDamages] = useState<number>(0);
  const [isTocCertified, setIsTocCertified] = useState<boolean>(true);
  const [tocDate, setTocDate] = useState<string>("2026-11-30");

  // Form 65 State
  const [acknowledgedNoClaims, setAcknowledgedNoClaims] = useState<boolean>(false);
  const [isForm65Signed, setIsForm65Signed] = useState<boolean>(false);
  const [signedTimestamp, setSignedTimestamp] = useState<string | null>(null);

  // Computed Statutory Result
  const [result, setResult] = useState<Clause9_17Result | null>(null);

  const runCalculation = () => {
    const payload: FinalBillInput = {
      measuredWorkValue,
      clause12VariationsValue,
      clause10ccEscalationValue,
      priorRaBillsPaid,
      unrecoveredAdvances,
      leviedLiquidatedDamages,
      retentionPercentage: 5,
      isTocCertified,
      tocCertificationDate: tocDate,
      dlpMonths: 12,
    };

    startTransition(async () => {
      const res = await calculateFinalBillAndRetention(payload);
      setResult(res);
    });
  };

  useEffect(() => {
    runCalculation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    measuredWorkValue,
    clause12VariationsValue,
    clause10ccEscalationValue,
    priorRaBillsPaid,
    unrecoveredAdvances,
    leviedLiquidatedDamages,
    isTocCertified,
    tocDate,
  ]);

  const handleSignForm65 = () => {
    if (!acknowledgedNoClaims) return;
    setIsForm65Signed(true);
    setSignedTimestamp(new Date().toISOString().replace("T", " ").substring(0, 19) + " IST");
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8 text-zinc-100">
      {/* =====================================================================
          HEADER: CPWD Works Manual 2024 Clause 9 & Clause 17
          ===================================================================== */}
      <header className="max-w-7xl mx-auto mb-6 bg-zinc-900 border border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-zinc-800/50">
          <div className="text-left">
            <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-zinc-400 uppercase">
              <span>STATUTORY COMMERCIAL SUITE</span>
              <span className="text-zinc-600">/</span>
              <span>CPWD WORKS MANUAL 2024 CLAUSE 9, 17 &amp; FORM 65</span>
            </div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight text-zinc-100 uppercase mt-0.5">
              Final Bill Settlement, 50/50 Retention &amp; No-Claims Discharge
            </h1>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-2">
            <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-mono text-zinc-400">
              PRJ: <span className="text-zinc-100">GOMTI-NAGAR-PH1</span>
            </div>
            <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 flex items-center gap-2 text-xs font-mono text-emerald-500 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>TOC CERTIFIED (STAGE 1 50% UNLOCKED)</span>
            </div>
          </div>
        </div>

        <div className="px-5 py-2.5 bg-zinc-950/60 text-xs text-zinc-400 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/50 font-mono">
          <div className="flex items-center gap-4">
            <span>TAKING-OVER CERTIFICATE: <span className="text-zinc-100">{tocDate}</span></span>
            <span className="text-zinc-600">|</span>
            <span>DLP EXPIRY DATE: <span className="text-amber-500">{result?.retention.stage2DlpReleaseDate}</span></span>
          </div>
          <div className="text-zinc-400 text-right">
            <span>DLP COUNTDOWN: </span>
            <span className="text-zinc-100 font-bold">{result?.retention.stage2DaysRemaining} DAYS REMAINING</span>
          </div>
        </div>
      </header>

      {/* =====================================================================
          TOP STATUTORY SUMMARY BAR (4 CARDS)
          ===================================================================== */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {/* Card 1: Final Gross Work Value */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
              Gross Final Value (Cl. 9)
            </span>
            <div className="text-right mt-3">
              <span className="font-mono tabular-nums tracking-tight text-xl font-bold text-zinc-100">
                ₹{result?.waterfall.grossFinalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="block text-right text-[11px] text-zinc-500 font-mono mt-1">
              BASE + CL.12 + CL.10CC
            </span>
          </div>
          <div className="pt-3 mt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs">
            <span className="text-zinc-400">Prior RA Bills Paid</span>
            <span className="font-mono tabular-nums text-right text-zinc-300">
              ₹{priorRaBillsPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 2: Terminal Net Payable Final Bill */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
              Terminal Net Payable (Final Bill)
            </span>
            <div className="text-right mt-3">
              <span className="font-mono tabular-nums tracking-tight text-2xl font-bold text-emerald-500">
                ₹{result?.waterfall.terminalNetPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="block text-right text-[11px] text-zinc-500 font-mono mt-1">
              POST DEDUCTIONS + 50% TOC CREDIT
            </span>
          </div>
          <div className="pt-3 mt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs">
            <span className="text-zinc-400">Final Settlement Status</span>
            <span className="font-mono text-right text-emerald-500 font-semibold">
              READY FOR DISBURSEMENT
            </span>
          </div>
        </div>

        {/* Card 3: Total Retention Escrow (Clause 17) */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
              Total 5% Retention Escrow
            </span>
            <div className="text-right mt-3">
              <span className="font-mono tabular-nums tracking-tight text-xl font-bold text-zinc-100">
                ₹{result?.retention.totalRetentionAccumulated.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="block text-right text-[11px] text-zinc-500 font-mono mt-1">
              5.00% STATUTORY SECURITY DEPOSIT
            </span>
          </div>
          <div className="pt-3 mt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs">
            <span className="text-zinc-400">Stage 1 (50% TOC) Released</span>
            <span className="font-mono tabular-nums text-right text-emerald-500 font-semibold">
              ₹{result?.retention.stage1TocRelease.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Card 4: Active Stage 2 DLP Escrow Holding */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
              Stage 2 DLP Escrow Withheld
            </span>
            <div className="text-right mt-3">
              <span className="font-mono tabular-nums tracking-tight text-xl font-bold text-amber-500">
                ₹{result?.retention.stage2DlpRelease.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className="block text-right text-[11px] text-zinc-500 font-mono mt-1">
              50% HELD TILL DEFECT LIABILITY EXPIRY
            </span>
          </div>
          <div className="pt-3 mt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs">
            <span className="text-zinc-400">Release Date</span>
            <span className="font-mono text-right text-amber-500 font-semibold">
              {result?.retention.stage2DlpReleaseDate}
            </span>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto space-y-6">
        {/* =====================================================================
            SECTION 1: TERMINAL PAYMENT WATERFALL CARD
            ===================================================================== */}
        <section className="bg-zinc-900 border border-zinc-800">
          <div className="px-5 py-3.5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40">
            <div className="text-left">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-zinc-400" />
                Terminal Payment Waterfall Ledger (CPWD Clause 9)
              </h2>
              <span className="text-[11px] text-zinc-400">
                Statutory reconciliation from gross executed work to final voucher certification
              </span>
            </div>
            <span className="font-mono text-xs text-zinc-400">CPWD FORM 7 FINAL</span>
          </div>

          <div className="p-5 space-y-3 font-mono text-xs">
            <div className="divide-y divide-zinc-800/50">
              {/* Row 1 */}
              <div className="flex justify-between items-center py-2.5">
                <div className="text-left">
                  <span className="text-zinc-200 font-medium">1. Base Measured Works (Physical Cumulative Measurement)</span>
                  <span className="block text-[10px] text-zinc-500">Recorded in Measurement Book MB #48-52</span>
                </div>
                <span className="tabular-nums text-right text-zinc-100 font-semibold">
                  +₹{measuredWorkValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Row 2 */}
              <div className="flex justify-between items-center py-2.5">
                <div className="text-left">
                  <span className="text-zinc-200 font-medium">2. Approved Extra Items &amp; Deviations (Clause 12)</span>
                  <span className="block text-[10px] text-zinc-500">Includes 15% CP&amp;OH market rate derivation</span>
                </div>
                <span className="tabular-nums text-right text-emerald-500 font-semibold">
                  +₹{clause12VariationsValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Row 3 */}
              <div className="flex justify-between items-center py-2.5">
                <div className="text-left">
                  <span className="text-zinc-200 font-medium">3. Certified Statutory Price Escalation (Clause 10CC)</span>
                  <span className="block text-[10px] text-zinc-500">Polynomial index comparison against base quarter</span>
                </div>
                <span className="tabular-nums text-right text-emerald-500 font-semibold">
                  +₹{clause10ccEscalationValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Row 4 - Subtotal Gross Final Value */}
              <div className="flex justify-between items-center py-3 bg-zinc-950/40 px-3 border-t border-b border-zinc-800">
                <span className="text-zinc-100 font-bold uppercase tracking-wider text-xs">
                  Gross Final Value of Work Executed
                </span>
                <span className="tabular-nums text-right text-zinc-100 font-bold text-sm">
                  ₹{result?.waterfall.grossFinalValue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Row 5 - Less Prior RA Bills */}
              <div className="flex justify-between items-center py-2.5">
                <div className="text-left">
                  <span className="text-zinc-400">4. Less: Cumulative Gross Paid in Previous RA Bills (RA-01 to RA-09)</span>
                  <span className="block text-[10px] text-zinc-500">Certified vouchers through Treasury/Bank UTRs</span>
                </div>
                <span className="tabular-nums text-right text-zinc-400">
                  -₹{priorRaBillsPaid.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Row 6 - Less BOCW Cess */}
              <div className="flex justify-between items-center py-2.5">
                <div className="text-left">
                  <span className="text-zinc-400">5. Less: 1.00% BOCW Welfare Labor Cess</span>
                  <span className="block text-[10px] text-zinc-500">Building and Other Construction Workers Welfare Cess Act</span>
                </div>
                <span className="tabular-nums text-right text-zinc-400">
                  -₹{result?.waterfall.bocwCess1Percent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Row 7 - Less GST TDS */}
              <div className="flex justify-between items-center py-2.5">
                <div className="text-left">
                  <span className="text-zinc-400">6. Less: 2.00% GST TDS Withholding</span>
                  <span className="block text-[10px] text-zinc-500">Section 51 CGST/UPGST Act (1% CGST + 1% SGST)</span>
                </div>
                <span className="tabular-nums text-right text-zinc-400">
                  -₹{result?.waterfall.gstTds2Percent.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Row 8 - Less 5% Retention on Increment */}
              <div className="flex justify-between items-center py-2.5">
                <div className="text-left">
                  <span className="text-zinc-400">7. Less: 5.00% Security Deposit / Retention Deducted on Bill Increment</span>
                  <span className="block text-[10px] text-zinc-500">CPWD Works Manual Clause 17</span>
                </div>
                <span className="tabular-nums text-right text-zinc-400">
                  -₹{result?.waterfall.retentionDeductionNet.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Row 9 - Plus 50% TOC Retention Credit */}
              <div className="flex justify-between items-center py-2.5 bg-emerald-950/20 px-3 border border-emerald-500/30">
                <div className="text-left">
                  <span className="text-emerald-400 font-medium">
                    8. Plus: Stage 1 Retention Released (50% of Accumulated Escrow)
                  </span>
                  <span className="block text-[10px] text-emerald-500">
                    Credited under Clause 17 upon Taking-Over Certificate Issuance
                  </span>
                </div>
                <span className="tabular-nums text-right text-emerald-500 font-bold text-sm">
                  +₹{result?.waterfall.stage1TocCredit.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Row 10 - Final Terminal Net Payable */}
              <div className="flex justify-between items-center py-4 bg-zinc-950 px-3 border-t-2 border-zinc-700 mt-2">
                <div className="text-left">
                  <span className="text-zinc-100 font-bold uppercase tracking-wider text-sm block">
                    Net Terminal Amount Payable on Final Bill:
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    Sanctioned for Electronic Fund Transfer via RTGS / Treasury Portal
                  </span>
                </div>
                <span className="tabular-nums text-right font-bold text-2xl text-emerald-500">
                  ₹{result?.waterfall.terminalNetPayable.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 2: CLAUSE 17 ESCROW TRACKER (50/50 STAGED RELEASE)
            ===================================================================== */}
        <section className="bg-zinc-900 border border-zinc-800">
          <div className="px-5 py-3.5 border-b border-zinc-800/50 flex justify-between items-center bg-zinc-900/40">
            <div className="text-left">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                <Coins className="h-4 w-4 text-zinc-400" />
                Clause 17 Retention Escrow Tracker (50/50 Staged Release)
              </h2>
              <span className="text-[11px] text-zinc-400">
                Total Security Deposit: 5.00% of Gross Final Value (₹{result?.retention.totalRetentionAccumulated.toLocaleString("en-IN")})
              </span>
            </div>
            <span className="font-mono text-xs text-zinc-400">FIDIC CL. 14.9</span>
          </div>

          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Stage 1 Card */}
            <div className="border border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2 mb-3">
                  <span className="text-xs font-semibold uppercase text-zinc-200">
                    Stage 1: Taking-Over Certificate (TOC)
                  </span>
                  <span className="text-emerald-500 font-mono text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    50% RELEASED
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Disbursed Amount:</span>
                    <span className="text-emerald-500 font-bold tabular-nums">
                      ₹{result?.retention.stage1TocRelease.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">TOC Issuance Date:</span>
                    <span className="text-zinc-200 tabular-nums">{tocDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Clearance Authority:</span>
                    <span className="text-zinc-200">Superintending Engineer</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-zinc-800/50 text-[11px] text-zinc-500 font-mono">
                Credited directly into Final Bill terminal settlement voucher.
              </div>
            </div>

            {/* Stage 2 Card */}
            <div className="border border-zinc-800 bg-zinc-950 p-4 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center border-b border-zinc-800/50 pb-2 mb-3">
                  <span className="text-xs font-semibold uppercase text-zinc-200">
                    Stage 2: Defect Liability Period (DLP)
                  </span>
                  <span className="text-amber-500 font-mono text-[11px] font-semibold flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    50% IN ESCROW
                  </span>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Escrow Balance Held:</span>
                    <span className="text-amber-500 font-bold tabular-nums">
                      ₹{result?.retention.stage2DlpRelease.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Scheduled DLP Expiry:</span>
                    <span className="text-zinc-200 tabular-nums">
                      {result?.retention.stage2DlpReleaseDate}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Countdown Remaining:</span>
                    <span className="text-amber-500 font-bold tabular-nums">
                      {result?.retention.stage2DaysRemaining} Days
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-zinc-800/50 text-[11px] text-zinc-500 font-mono flex justify-between items-center">
                <span>Latent Snag Audit: 0 Open Defects</span>
                <span className="text-emerald-500">CLEARANCE ACTIVE</span>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================================
            SECTION 3: FORM 65 NO-CLAIMS GATEWAY (SEVERE BOTTOM-ANCHORED)
            ===================================================================== */}
        <section className="bg-zinc-950 border border-rose-900/60 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-rose-900/40 pb-3 mb-4">
            <div className="text-left">
              <div className="flex items-center gap-2 text-xs font-mono text-rose-400 uppercase tracking-widest">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <span>CPWD FORM 65: ABSOLUTE DISCHARGE STATUTORY GATEWAY</span>
              </div>
              <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-tight mt-0.5">
                Irrevocable Undertaking &amp; Release of All Commercial Claims
              </h3>
            </div>
            <div className="font-mono text-xs text-rose-400">
              LEGAL BIND: SECTION 63 INDIAN CONTRACT ACT
            </div>
          </div>

          <div className="space-y-4 text-left">
            <p className="text-xs text-zinc-300 leading-relaxed font-mono bg-zinc-900/60 p-4 border border-zinc-800">
              {result?.noClaimsForm65.statutoryLegalStatement}
            </p>

            {/* Checkbox */}
            <div className="flex items-start gap-3 py-2">
              <input
                type="checkbox"
                id="no-claims-acknowledgement"
                checked={acknowledgedNoClaims}
                disabled={isForm65Signed}
                onChange={(e) => setAcknowledgedNoClaims(e.target.checked)}
                className="mt-0.5 h-4 w-4 bg-zinc-950 border-zinc-700 text-rose-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <label
                htmlFor="no-claims-acknowledgement"
                className="text-xs font-mono text-zinc-300 leading-normal cursor-pointer select-none"
              >
                I/We, the Authorised Signatory for the Contractor, unconditionally confirm that all
                variations, price escalations, hindrances, and payments under Contract Reference{" "}
                <span className="text-zinc-100 font-bold">CNT-2024-UP-0889</span> have been fully
                and finally determined. Upon execution, no further commercial claims shall be admissible.
              </label>
            </div>

            {/* Action Button / Verification Stamp */}
            <div className="pt-3 border-t border-zinc-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {!isForm65Signed ? (
                <button
                  type="button"
                  disabled={!acknowledgedNoClaims}
                  onClick={handleSignForm65}
                  className={`py-3 px-6 text-xs font-mono uppercase tracking-wider font-bold transition-colors border ${
                    acknowledgedNoClaims
                      ? "bg-rose-900 hover:bg-rose-800 text-zinc-100 border-rose-700 cursor-pointer"
                      : "bg-zinc-900 text-zinc-500 border-zinc-800 cursor-not-allowed"
                  }`}
                >
                  Sign &amp; Seal Final Settlement (Form 65)
                </button>
              ) : (
                <div className="flex items-center gap-3 p-3 bg-emerald-950/30 border border-emerald-500/50 text-emerald-400 font-mono text-xs">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-bold">FORM 65 IRREVOCABLY SEALED &amp; FILED</div>
                    <div className="text-[10px] text-zinc-400">
                      DSC Signature: {result?.noClaimsForm65.certificateHash} | {signedTimestamp}
                    </div>
                  </div>
                </div>
              )}

              <div className="text-right text-[11px] font-mono text-zinc-500">
                <span>Signatory Designation: </span>
                <span className="text-zinc-400">Principal Architect &amp; Lead Commercial Auditor</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
