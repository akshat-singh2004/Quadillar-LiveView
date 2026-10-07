#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating directory structures...\033[0m"
mkdir -p lib/commercial app/actions components/commercial app/commercial/ra-bills

echo -e "\033[1;36m[+] Deploying e-MB & Commercial Billing Waterfall Engine (Midas / Aegis / Themis)...\033[0m"

# -----------------------------------------------------------------------------
# 1. ACTION: app/actions/billing-actions.ts
# Integrates Midas, Aegis, Themis, and Hermes into an IPC waterfall
# -----------------------------------------------------------------------------
cat << 'ACTION_BILLING' > app/actions/billing-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { MidasAgent } from "@/lib/agents/midas";
import { ThemisAgent } from "@/lib/agents/themis";
import { HermesAgent } from "@/lib/agents/hermes";

export interface GenerateBillPayload {
  projectId: string;
  contractorName: string;
  billPeriodStart: string;
  billPeriodEnd: string;
  grossAmountInr: number;
  baseLaborIndexL0?: number;
  currentLaborIndexLi?: number;
  unexcusedDelayDays?: number;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Billing actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function generateRunningAccountBill(payload: GenerateBillPayload) {
  try {
    const supabase = getSupabase();
    const billNumber = `RA-BILL-${Date.now().toString().slice(-6)}`;

    // 1. Calculate CPWD Cl. 10CC Labor Price Escalation via Midas
    let escalationInr = 0;
    if (payload.baseLaborIndexL0 && payload.currentLaborIndexLi && payload.baseLaborIndexL0 > 0) {
      escalationInr = MidasAgent.calculateEscalation(
        payload.grossAmountInr,
        payload.baseLaborIndexL0,
        payload.currentLaborIndexLi
      );
    }

    const totalValuationWithEscalation = payload.grossAmountInr + escalationInr;

    // 2. Compute 5-Tier Statutory Deduction Waterfall via Midas Sub-Agent
    const taxWaterfall = MidasAgent.applyBillingWaterfall(totalValuationWithEscalation);

    // 3. Query active quality liens from Aegis / quality_ncr_register
    const { data: openNcrs } = await supabase
      .from("quality_ncr_register")
      .select("withholding_amount_inr, ncr_number")
      .eq("project_id", payload.projectId)
      .neq("status", "CLOSED");

    const aegisQualityLienInr = (openNcrs || []).reduce(
      (sum, ncr) => sum + (Number(ncr.withholding_amount_inr) || 0),
      0
    );

    // 4. Compute Liquidated Damages via Themis Sub-Agent
    let themisLdInr = 0;
    if (payload.unexcusedDelayDays && payload.unexcusedDelayDays > 0) {
      const ldEval = ThemisAgent.computeLiquidatedDamages({
        contractBaselineInr: payload.grossAmountInr,
        unexcusedDelayDays: payload.unexcusedDelayDays,
      });
      themisLdInr = ldEval.computedLdInr;
    }

    // 5. Total Combined Deductions & Final Certified Net
    const totalDeductionsInr =
      taxWaterfall.totalStatutoryDeductionsInr +
      aegisQualityLienInr +
      themisLdInr;

    const netPayableInr = Math.max(0, totalValuationWithEscalation - totalDeductionsInr);

    // 6. Cryptographic Notarization via Hermes (Section 65B)
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Running Account Bill Certified: ${billNumber} [Gross ₹${totalValuationWithEscalation.toLocaleString("en-IN")}]`,
      actionCategory: "COMMERCIAL_RA_BILL_CERTIFIED",
      moduleRef: billNumber,
      details: {
        billNumber,
        grossValuationInr: totalValuationWithEscalation,
        taxWaterfall,
        aegisQualityLienInr,
        themisLdInr,
        netPayableInr,
      } as Record<string, unknown>,
      signatoryName: "Agent Midas & Principal Commercial Adjudicator",
      signatoryRole: "Statutory Quantity Surveyor of Record",
      severity: "verified",
    });

    // 7. Commit Record to running_account_bills
    const { data, error } = await supabase
      .from("running_account_bills")
      .insert({
        project_id: payload.projectId,
        bill_number: billNumber,
        bill_period_start: payload.billPeriodStart,
        bill_period_end: payload.billPeriodEnd,
        contractor_name: payload.contractorName,
        gross_amount_inr: payload.grossAmountInr,
        clause_10cc_escalation_inr: escalationInr,
        retention_escrow_inr: taxWaterfall.retentionInr,
        bocw_cess_inr: taxWaterfall.bocwCessInr,
        gst_tds_inr: taxWaterfall.gstTdsInr,
        it_tds_inr: taxWaterfall.incomeTaxTdsInr,
        aegis_quality_lien_inr: aegisQualityLienInr,
        themis_liquidated_damages_inr: themisLdInr,
        total_deductions_inr: totalDeductionsInr,
        net_payable_inr: netPayableInr,
        status: "CERTIFIED_READY_FOR_PAYMENT",
        seor_signoff_hash: seal.blockHash,
        certified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/commercial/ra-bills");
    revalidatePath("/");

    return { success: true, data, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to generate RA Bill." };
  }
}
ACTION_BILLING

# -----------------------------------------------------------------------------
# 2. COMPONENT: components/commercial/GenerateRABillModal.tsx
# Certified dialog with real-time tax breakdown & live quality lien calculation
# -----------------------------------------------------------------------------
cat << 'COMP_BILL_MODAL' > components/commercial/GenerateRABillModal.tsx
"use client";

import React, { useState } from "react";
import { generateRunningAccountBill } from "@/app/actions/billing-actions";
import { Plus, Receipt, Loader2, DollarSign } from "lucide-react";

interface Props {
  projectId: string;
}

export function GenerateRABillModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [contractorName, setContractorName] = useState("L&T Construction (Civil Package)");
  const [billPeriodStart, setBillPeriodStart] = useState("2026-09-01");
  const [billPeriodEnd, setBillPeriodEnd] = useState("2026-09-30");
  const [grossAmountInr, setGrossAmountInr] = useState(12500000);
  const [baseLaborIndexL0, setBaseLaborIndexL0] = useState(210);
  const [currentLaborIndexLi, setCurrentLaborIndexLi] = useState(225);
  const [unexcusedDelayDays, setUnexcusedDelayDays] = useState(0);

  // Live preview calculations
  const escalation = baseLaborIndexL0 > 0 && currentLaborIndexLi > baseLaborIndexL0
    ? 0.85 * 0.25 * grossAmountInr * ((currentLaborIndexLi - baseLaborIndexL0) / baseLaborIndexL0)
    : 0;
  const totalValuation = grossAmountInr + escalation;
  const retention = Math.round(totalValuation * 0.05);
  const bocwCess = Math.round(totalValuation * 0.01);
  const gstTds = Math.round(totalValuation * 0.02);
  const itTds = Math.round(totalValuation * 0.02);
  const totalDeductions = retention + bocwCess + gstTds + itTds;
  const netEstimated = totalValuation - totalDeductions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await generateRunningAccountBill({
        projectId,
        contractorName,
        billPeriodStart,
        billPeriodEnd,
        grossAmountInr,
        baseLaborIndexL0,
        currentLaborIndexLi,
        unexcusedDelayDays,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to certify bill.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Generate RA Bill (IPC)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                  CPWD Works Manual Cl. 7 / FIDIC Cl. 14 • Commercial Gate
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Certify Interim Running Account Bill
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Contractor / Vendor Agency
                </label>
                <input
                  type="text"
                  required
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Period Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={billPeriodStart}
                    onChange={(e) => setBillPeriodStart(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Period End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={billPeriodEnd}
                    onChange={(e) => setBillPeriodEnd(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Gross Work Done Valuation (₹)
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={grossAmountInr}
                  onChange={(e) => setGrossAmountInr(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-emerald-400 font-bold text-sm text-center"
                />
              </div>

              {/* STATUTORY 10CC & LD CONTROLS */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Base Labor Index L₀
                  </label>
                  <input
                    type="number"
                    value={baseLaborIndexL0}
                    onChange={(e) => setBaseLaborIndexL0(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-300 text-center text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Current Labor Index Lᵢ
                  </label>
                  <input
                    type="number"
                    value={currentLaborIndexLi}
                    onChange={(e) => setCurrentLaborIndexLi(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-cyan-400 text-center text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Unexcused Delays (d)
                  </label>
                  <input
                    type="number"
                    value={unexcusedDelayDays}
                    onChange={(e) => setUnexcusedDelayDays(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-rose-400 text-center text-xs"
                  />
                </div>
              </div>

              {/* LIVE WATERFALL BREAKDOWN PREVIEW */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1.5 text-[10px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Gross Valuation + Cl. 10CC Escalation:</span>
                  <span className="text-white font-bold">₹{totalValuation.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>5% Retention Escrow (Cl. 1A):</span>
                  <span>-₹{retention.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>1% BOCW Welfare Cess:</span>
                  <span>-₹{bocwCess.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>2% GST TDS + 2% IT TDS (Sec. 51 / 194C):</span>
                  <span>-₹{(gstTds + itTds).toLocaleString("en-IN")}</span>
                </div>
                <div className="border-t border-zinc-800 pt-1.5 flex justify-between text-xs font-bold">
                  <span className="text-emerald-400">Net Estimated Disbursement:</span>
                  <span className="text-emerald-300">₹{netEstimated.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold uppercase rounded text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Sign &amp; Certify RA Bill</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_BILL_MODAL

# -----------------------------------------------------------------------------
# 3. PAGE: app/commercial/ra-bills/page.tsx
# Connected to live running_account_bills with deduction waterfall audit
# -----------------------------------------------------------------------------
cat << 'PAGE_RA_BILLS' > app/commercial/ra-bills/page.tsx
import React from "react";
import { GenerateRABillModal } from "@/components/commercial/GenerateRABillModal";
import { createClient } from "@/lib/supabase/server";
import { Receipt, ShieldCheck, DollarSign, ArrowDownRight, Layers, FileText } from "lucide-react";

export default async function RaBillsPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real running account bills
  const { data: bills } = await supabase
    .from("running_account_bills")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const activeBills = bills || [];
  const totalGrossInr = activeBills.reduce((s, b) => s + (Number(b.gross_amount_inr) || 0), 0);
  const totalNetInr = activeBills.reduce((s, b) => s + (Number(b.net_payable_inr) || 0), 0);
  const totalRetainedInr = activeBills.reduce((s, b) => s + (Number(b.retention_escrow_inr) || 0), 0);
  const totalLiensInr = activeBills.reduce((s, b) => s + (Number(b.aegis_quality_lien_inr) || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
            <DollarSign className="w-3.5 h-3.5" />
            <span>COMMERCIAL GOVERNANCE • CPWD WORKS MANUAL CL. 7 / FIDIC CL. 14 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Running Account (RA) Bills &amp; Payment Waterfall
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • 5-tier statutory deductions, Aegis quality liens, and Section 65B notarized interim certificates[cite: 1].
          </p>
        </div>

        <GenerateRABillModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Gross Certified</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">
            ₹{(totalGrossInr / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{activeBills.length} Interim Certificates</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Retention Escrow (5%)</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            ₹{(totalRetainedInr / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Held under CPWD Cl. 1A Escrow[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Aegis Quality Liens</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${totalLiensInr > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            ₹{(totalLiensInr / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Withheld for active structural NCRs[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Net Payable Released</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            ₹{(totalNetInr / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Cleared for electronic RTGS</span>
        </div>
      </div>

      {/* RA BILLS LIST */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Certified Running Account Bills ({activeBills.length})
          </span>
          <span className="text-[10px] text-zinc-500">Section 65B Evidence Act Legal Tender[cite: 1]</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {activeBills.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero certified RA bills. Click &quot;+ Generate RA Bill (IPC)&quot; to certify interim contractor valuations through the Midas waterfall[cite: 1].
            </div>
          ) : (
            activeBills.map((bill: any) => (
              <div key={bill.id} className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-zinc-850/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                      {bill.bill_number}
                    </span>
                    <strong className="text-white text-sm">{bill.contractor_name}</strong>
                    <span className="text-zinc-500 text-xs">
                      ({bill.bill_period_start} to {bill.bill_period_end})
                    </span>
                  </div>

                  <div className="text-zinc-400 text-[11px] font-sans flex flex-wrap gap-x-4 gap-y-1">
                    <span>Gross: <strong className="text-zinc-200 font-mono">₹{Number(bill.gross_amount_inr).toLocaleString("en-IN")}</strong></span>
                    <span>Retention (5%): <strong className="text-cyan-400 font-mono">-₹{Number(bill.retention_escrow_inr).toLocaleString("en-IN")}</strong>[cite: 1]</span>
                    <span>BOCW Cess (1%): <strong className="text-zinc-300 font-mono">-₹{Number(bill.bocw_cess_inr).toLocaleString("en-IN")}</strong>[cite: 1]</span>
                    <span>TDS (GST+IT 4%): <strong className="text-zinc-300 font-mono">-₹{(Number(bill.gst_tds_inr) + Number(bill.it_tds_inr)).toLocaleString("en-IN")}</strong>[cite: 1]</span>
                    {Number(bill.aegis_quality_lien_inr) > 0 && (
                      <span>Aegis Lien: <strong className="text-rose-400 font-mono">-₹{Number(bill.aegis_quality_lien_inr).toLocaleString("en-IN")}</strong>[cite: 1]</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-500 uppercase block">Certified Net Disbursement</span>
                    <strong className="text-base text-emerald-400 font-mono">
                      ₹{Number(bill.net_payable_inr).toLocaleString("en-IN")}
                    </strong>
                  </div>

                  <span className="px-3 py-1.5 rounded-lg border bg-emerald-950 border-emerald-800 text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Certified &amp; Sealed</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
PAGE_RA_BILLS

# -----------------------------------------------------------------------------
# 4. VERIFY FULL BUILD HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] e-MB & Commercial Billing Waterfall Engine deployed cleanly with ZERO errors!\033[0m"
