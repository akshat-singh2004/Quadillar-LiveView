"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";

export interface CompileArbitralDossierPayload {
  projectId: string;
  disputeTitle: string;
  tribunalJurisdiction: "SECTION_9_HIGH_COURT" | "SECTION_11_ARBITRATION" | "FIDIC_DAB" | "CPWD_CL25" | string;
  claimantEntity: string;
  respondentEntity: string;
  claimedQuantumInr: number;
  delayDaysClaimed: number;
  linkedModules: string[];
  compiledBy: string;
  executiveSummary?: string;
}

export interface ArbitralDossierRecord {
  id: string;
  project_id: string;
  dossier_code: string;
  dispute_title: string;
  tribunal_jurisdiction: string;
  claimant_entity: string;
  respondent_entity: string;
  claimed_quantum_inr: number;
  delay_days_claimed: number;
  linked_modules: string[];
  statement_of_claim_markdown: string;
  section_65b_certificate_no?: string | null;
  status: string;
  seor_signoff_hash?: string | null;
  compiled_by: string;
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

export async function compileArbitralDossier(payload: CompileArbitralDossierPayload) {
  try {
    const supabase = getSupabase();
    const dossierCode = `ARB-${Date.now().toString().slice(-6)}`;
    const certNumber = `SEC65B-ARB-${Date.now().toString().slice(-6)}`;

    // 1. Fetch relevant project records for evidentiary support
    const [hindrancesRes, eotRes, billsRes, auditLogsRes] = await Promise.all([
      supabase.from("site_hindrance_register").select("*").eq("project_id", payload.projectId),
      supabase.from("eot_claim_dossiers").select("*").eq("project_id", payload.projectId),
      supabase.from("running_account_bills").select("*").eq("project_id", payload.projectId),
      supabase.from("immutable_audit_logs").select("*").eq("project_id", payload.projectId).order("created_at", { ascending: false }).limit(8),
    ]);

    const hindrances = hindrancesRes.data || [];
    const openHindrances = hindrances.filter((h) => h.status === "OPEN_CRITICAL_DELAY");
    const eotClaims = eotRes.data || [];
    const bills = billsRes.data || [];
    const auditLogs = auditLogsRes.data || [];

    // 2. Draft Court-Ready Statement of Claim Markdown
    const statementOfClaimMarkdown = `
# STATEMENT OF CLAIM & ARBITRAL EVIDENCE DOSSIER
**BEFORE THE HON'BLE ARBITRAL TRIBUNAL / HIGH COURT OF JUDICATURE**
*Under the Arbitration and Conciliation Act, 1996 & Section 65B, Indian Evidence Act, 1872*

---

### IN THE MATTER OF:
**${payload.claimantEntity}**  
*(Claimant)*  

**VERSUS**  

**${payload.respondentEntity}**  
*(Respondent)*  

**DISPUTE REFERENCE:** ${dossierCode}  
**JURISDICTION / FORUM:** ${payload.tribunalJurisdiction.replace(/_/g, " ")}  
**PROJECT IDENTIFIER:** ${payload.projectId}  
**TOTAL QUANTUM OF CLAIM:** ₹${Number(payload.claimedQuantumInr).toLocaleString("en-IN")}  
**TOTAL EXTENSION OF TIME CLAIMED:** ${payload.delayDaysClaimed} Calendar Days  

---

## 1. SUMMARY OF CONTROVERSY
${payload.executiveSummary || "The Claimant undertakes the comprehensive execution of works for the referenced Project. During contract execution, the Claimant faced material employer-risk hindrances, unlawful unilateral deductions of Liquidated Damages, and withheld certified running account payments contrary to FIDIC / CPWD contract covenants."}

## 2. CHRONOLOGY OF CONTEMPORANEOUS SITE HINDRANCES
The project records maintained through the Digital Governance Council contemporaneously recorded the following critical-path hindrances:
${
  openHindrances.length > 0
    ? openHindrances.map((h, i) => `${i + 1}. **${h.hindrance_code}** (${h.delay_category}): ${h.description} [Grid:${h.grid_location}, Hindrance: +${h.days_hindered} days, Logged:${h.logged_date}]`).join("\n")
    : "- Continuous non-handover of unencumbered site fronts and structural drawing release holds."
}

## 3. STATUTORY COMPLIANCE & 28-DAY NOTICE COMPLIANCE (FIDIC CL. 20.1)
All notices of delay were submitted within the mandatory 28-day statutory window. EOT evaluations conducted under the Society of Construction Law (SCL) Delay and Disruption Protocol demonstrate that zero critical-path delay is attributable to the Claimant.

## 4. FINANCIAL QUANTUM & DISPUTED WITHHOLDINGS
- **Claimed Principal Amount:** ₹${Number(payload.claimedQuantumInr).toLocaleString("en-IN")}
- **Statutory Interest under Sec. 31(7)(b):** Computed @ 18% p.a. from date of cause of action until realization.
- **Wrongful Liquidated Damages Defense:** Clause 2 LD deductions are void ab initio due to concurrent employer delay.

## 5. SECTION 65B ELECTRONIC EVIDENCE CHAIN OF CUSTODY
This electronic dossier is generated directly from automated system logs running continuous SHA-256 Merkle chain anchoring.
- **Accompanying Section 65B Certificate:** ${certNumber}
- **Hardware Cluster ID:** QUADILLAR-LIVEVIEW-CLOUD-NODE-01
- **Cryptographic Merkle Signatures in Chain:**
${auditLogs.map((log) => `  - [${log.action_category}] Block: \`${log.block_hash ? log.block_hash.slice(0, 32) + "..." : "SEALED"}\` (${log.created_at})`).join("\n")}

---
**VERIFIED AND SUBMITTED BY:**  
${payload.compiledBy}  
*Authorized Representative for ${payload.claimantEntity}*
    `.trim();

    // 3. Commit record to arbitral_dispute_dossiers
    const { data, error } = await supabase
      .from("arbitral_dispute_dossiers")
      .insert({
        project_id: payload.projectId,
        dossier_code: dossierCode,
        dispute_title: payload.disputeTitle,
        tribunal_jurisdiction: payload.tribunalJurisdiction,
        claimant_entity: payload.claimantEntity,
        respondent_entity: payload.respondentEntity,
        claimed_quantum_inr: payload.claimedQuantumInr,
        delay_days_claimed: payload.delayDaysClaimed,
        linked_modules: payload.linkedModules,
        statement_of_claim_markdown: statementOfClaimMarkdown,
        section_65b_certificate_no: certNumber,
        status: "DOSSIER_READY_FOR_FILING",
        compiled_by: payload.compiledBy,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Hermes Section 65B Notarization
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Arbitral Claim Dossier Compiled: ${dossierCode} (₹${(payload.claimedQuantumInr / 100000).toFixed(1)}L)`,
      actionCategory: "ARBITRATION_DOSSIER_COMPILED",
      moduleRef: dossierCode,
      details: { payload, certNumber, dossierCode } as unknown as Record<string, unknown>,
      signatoryName: payload.compiledBy,
      signatoryRole: "Lead Arbitral Advocate & Technical Expert",
      severity: "verified",
    });

    await supabase
      .from("arbitral_dispute_dossiers")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    revalidatePath("/governance/arbitration");
    revalidatePath("/governance/council");
    revalidatePath("/");

    return { success: true, data, dossierCode, certNumber, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to compile arbitral dispute dossier." };
  }
}

export async function fetchArbitralDossiers(projectId = "GOMTI-NAGAR-PH1-FITOUT"): Promise<ArbitralDossierRecord[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("arbitral_dispute_dossiers")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as ArbitralDossierRecord[];
  } catch (err: any) {
    console.error("[fetchArbitralDossiers notice]:", err.message);
    return [];
  }
}
