"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";

export interface IssueCureNoticePayload {
  projectId: string;
  defaultingAgency: string;
  tradeClassification: string;
  clauseInvoked: string;
  defaultReason: "CRITICAL_PATH_ABANDONMENT" | "QUALITY_NCR_NON_RECTIFICATION" | "BOCW_WAGE_BREACH" | string;
  curePeriodDays: number;
  contractValuationInr: number;
  specificDefaultDetails: string;
  issuedBy?: string;
}

export interface CureNoticeRecord {
  id: string;
  project_id: string;
  notice_code: string;
  defaulting_agency: string;
  trade_classification: string;
  clause_invoked: string;
  default_reason: string;
  cure_period_days: number;
  cure_deadline: string;
  liquidated_damages_exposure_inr: number;
  security_deposit_at_risk_inr: number;
  notice_text_markdown: string;
  status: string;
  seor_signoff_hash?: string | null;
  issued_by: string;
  issued_at: string;
  created_at: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-service-key";
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function issueStatutoryCureNotice(payload: IssueCureNoticePayload) {
  try {
    const supabase = getSupabase();
    const noticeCode = `NOTICE-CURE-${Date.now().toString().slice(-6)}`;
    const issuer = payload.issuedBy || "Head of Project Commercial & Legal";

    // 1. Calculate Statutory Financial Exposures
    const ldExposureInr = Math.round(payload.contractValuationInr * 0.10); // Capped at 10% per CPWD Cl. 2
    const securityDepositAtRiskInr = Math.round(payload.contractValuationInr * 0.05); // 5% standard security deposit

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + payload.curePeriodDays);
    const deadlineIso = deadlineDate.toISOString().slice(0, 10);

    // 2. Draft Court-Ready Statutory Notice to Correct Text
    const noticeTextMarkdown = `
# FORMAL STATUTORY NOTICE TO CORRECT & CURE PERIOD DEMAND
**ISSUED UNDER ${payload.clauseInvoked.toUpperCase()}**
*In accordance with Section 65B of the Indian Evidence Act, 1872*

---

**NOTICE REFERENCE:** ${noticeCode}  
**DATE OF ISSUANCE:** ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}  
**TO:** ${payload.defaultingAgency} (${payload.tradeClassification})  
**PROJECT IDENTIFIER:** ${payload.projectId}  

### 1. SUBJECT MATTER: NOTICE OF DEFAULT & IMPOSITION OF CURE PERIOD
You are hereby formally notified that you are in material default of your contractual obligations under the covenants governing Project [${payload.projectId}].

### 2. SPECIFICATION OF DEFAULT
- **Category of Default:** ${payload.defaultReason.replace(/_/g, " ")}
- **Factual Particulars:** ${payload.specificDefaultDetails}
- **Governing Contractual Clause:** ${payload.clauseInvoked}

### 3. MANDATORY STATUTORY CURE PERIOD
In terms of ${payload.clauseInvoked}, you are granted a peremptory cure period of **${payload.curePeriodDays} CALENDAR DAYS**, expiring on **${deadlineIso}** at 18:00 Hours IST, to remedy the defaults cited herein.

### 4. CONSEQUENCES OF NON-COMPLIANCE & RISK-PURCHASE
Take notice that upon your failure to cure the defaults within the stipulated deadline:
1. **Liquidated Damages:** Clause 2 recovery shall be levied at 1.0% per week, up to the contractual cap of **₹${ldExposureInr.toLocaleString("en-IN")}**.
2. **Security Deposit Forfeiture:** Your performance bank guarantee / retention escrow amounting to **₹${securityDepositAtRiskInr.toLocaleString("en-IN")}** shall be forfeited.
3. **Execution at Risk & Cost (Clause 3):** The balance works shall be executed through third-party agencies at your sole risk, cost, and consequence.

---
**ISSUED BY:**  
${issuer}  
*For and on behalf of the Principal Employer / Main Contractor*
    `.trim();

    // 3. Commit record to statutory_cure_notices
    const { data, error } = await supabase
      .from("statutory_cure_notices")
      .insert({
        project_id: payload.projectId,
        notice_code: noticeCode,
        defaulting_agency: payload.defaultingAgency,
        trade_classification: payload.tradeClassification,
        clause_invoked: payload.clauseInvoked,
        default_reason: payload.defaultReason,
        cure_period_days: payload.curePeriodDays,
        cure_deadline: deadlineIso,
        liquidated_damages_exposure_inr: ldExposureInr,
        security_deposit_at_risk_inr: securityDepositAtRiskInr,
        notice_text_markdown: noticeTextMarkdown,
        status: "CURE_PERIOD_ACTIVE",
        issued_by: issuer,
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Hermes Section 65B Notarization
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Statutory Cure Notice Issued: ${noticeCode} -> ${payload.defaultingAgency}`,
      actionCategory: "COMMERCIAL_CURE_NOTICE_SERVED",
      moduleRef: noticeCode,
      details: { payload, noticeCode, deadlineIso, ldExposureInr } as unknown as Record<string, unknown>,
      signatoryName: issuer,
      signatoryRole: "Lead Contracts Adjudicator",
      severity: "critical",
    });

    await supabase
      .from("statutory_cure_notices")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    revalidatePath("/commercial/cure-notices");
    revalidatePath("/commercial/ra-bills");
    revalidatePath("/");

    return { success: true, data, noticeCode, deadlineIso, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to issue statutory cure notice." };
  }
}

export async function fetchStatutoryCureNotices(projectId = "GOMTI-NAGAR-PH1-FITOUT"): Promise<CureNoticeRecord[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("statutory_cure_notices")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as CureNoticeRecord[];
  } catch (err: any) {
    console.error("[fetchStatutoryCureNotices notice]:", err.message);
    return [];
  }
}
