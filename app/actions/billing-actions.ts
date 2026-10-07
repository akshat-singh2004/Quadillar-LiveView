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
