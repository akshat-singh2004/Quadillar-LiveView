"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { ChronosAgent } from "@/lib/agents/chronos";
import { ThemisAgent } from "@/lib/agents/themis";
import { HermesAgent } from "@/lib/agents/hermes";
import { CouncilSynapse } from "@/lib/agents/synapse";

export interface LogHindrancePayload {
  projectId: string;
  delayCategory: "CLIENT_DESIGN_HOLD" | "WEATHER_STOPPAGE" | "SITE_ACCESS_DENIAL" | "FORCE_MAJEURE" | string;
  description: string;
  gridLocation: string;
  daysHindered: number;
}

export interface AdjudicateEotPayload {
  projectId: string;
  hindranceId: string;
  contractorAgency: string;
  claimedDaysExtension: number;
  noticeEventDateIso: string;
  noticeSubmissionDateIso: string;
  contractBaselineInr: number;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Hindrance/EOT actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function logContemporaneousHindrance(payload: LogHindrancePayload) {
  try {
    const supabase = getSupabase();
    const hindranceCode = `HND-${Date.now().toString().slice(-6)}`;

    // 1. Evaluate Time Impact Analysis (TIA) via Chronos
    const assessment = await ChronosAgent.assessHindranceImpact({
      projectId: payload.projectId,
      hindranceDays: payload.daysHindered,
      hindranceNumber: hindranceCode,
    });

    // 2. Commit to site_hindrance_register
    const { data, error } = await supabase
      .from("site_hindrance_register")
      .insert({
        project_id: payload.projectId,
        hindrance_code: hindranceCode,
        delay_category: payload.delayCategory,
        description: payload.description,
        grid_location: payload.gridLocation,
        days_hindered: payload.daysHindered,
        is_critical_path: assessment.criticalPathImpacted,
        logged_date: new Date().toISOString().slice(0, 10),
        status: "OPEN_CRITICAL_DELAY",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Hermes Section 65B Notarization
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Site Hindrance Event Registered: ${hindranceCode} (+${payload.daysHindered}d Delay)`,
      actionCategory: "COMMERCIAL_HINDRANCE_LOGGED",
      moduleRef: hindranceCode,
      details: { payload, assessment } as Record<string, unknown>,
      signatoryName: "Agent Chronos & Resident Planning Engineer",
      signatoryRole: "Contemporaneous Delay Specialist",
      severity: assessment.criticalPathImpacted ? "critical" : "warning",
    });

    await supabase
      .from("site_hindrance_register")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    // 4. Dispatch Synapse Directive: Chronos -> Themis
    if (assessment.criticalPathImpacted) {
      await CouncilSynapse.dispatch({
        projectId: payload.projectId,
        eventType: "CRITICAL_PATH_SLIPPAGE",
        sourceAgent: "Chronos (4D Schedule Governor)",
        targetAgent: "Themis (Contract Claims Governor)",
        payload: { hindranceCode, delayDays: payload.daysHindered, assessment },
        actionTaken: `Initiated 28-day notice time-bar tracking under FIDIC Cl. 20.1 / CPWD Cl. 5.`,
      });
    }

    revalidatePath("/commercial/hindrance-eot");
    revalidatePath("/schedule/gantt");
    revalidatePath("/");

    return { success: true, data, assessment, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to log hindrance event." };
  }
}

export async function adjudicateEotClaim(payload: AdjudicateEotPayload) {
  try {
    const supabase = getSupabase();
    const claimNumber = `EOT-${Date.now().toString().slice(-6)}`;

    // 1. Themis 28-Day Statutory Time-Bar Audit (FIDIC Cl. 20.1)
    const eventTime = new Date(payload.noticeEventDateIso).getTime();
    const noticeTime = new Date(payload.noticeSubmissionDateIso).getTime();
    const elapsedDays = Math.max(0, Math.round((noticeTime - eventTime) / (1000 * 3600 * 24)));
    const isNoticeTimeBarred = elapsedDays > 28;

    // 2. Liquidated Damages Shielding Derivation
    const ldShield = ThemisAgent.computeLiquidatedDamages({
      contractBaselineInr: payload.contractBaselineInr,
      unexcusedDelayDays: isNoticeTimeBarred ? 0 : payload.claimedDaysExtension,
    });

    const adjudicatedDays = isNoticeTimeBarred ? 0 : payload.claimedDaysExtension;
    const revisedDate = new Date();
    revisedDate.setDate(revisedDate.getDate() + Math.round(adjudicatedDays));

    const status = isNoticeTimeBarred
      ? "TIME_BARRED_FIDIC_REJECTED"
      : "EOT_APPROVED_CERTIFIED";

    // 3. Commit to eot_claim_dossiers
    const { data, error } = await supabase
      .from("eot_claim_dossiers")
      .insert({
        project_id: payload.projectId,
        claim_number: claimNumber,
        linked_hindrance_id: payload.hindranceId,
        contractor_agency: payload.contractorAgency,
        claimed_days_extension: payload.claimedDaysExtension,
        adjudicated_days_approved: adjudicatedDays,
        statutory_clause_ref: "CPWD GCC Cl. 5 / FIDIC Cl. 8.4",
        is_notice_time_barred: isNoticeTimeBarred,
        revised_completion_date: revisedDate.toISOString().slice(0, 10),
        liquidated_damages_shielded_inr: ldShield.computedLdInr,
        status,
        adjudicated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Update linked hindrance status to resolved
    await supabase
      .from("site_hindrance_register")
      .update({
        status: isNoticeTimeBarred ? "DISMISSED_TIME_BARRED" : "RESOLVED_EOT_GRANTED",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", payload.hindranceId);

    // 5. Hermes Section 65B Notarization
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `EOT Claim Adjudicated: ${claimNumber} [${status}]`,
      actionCategory: "COMMERCIAL_EOT_ADJUDICATED",
      moduleRef: claimNumber,
      details: { payload, isNoticeTimeBarred, ldShield, revisedDate: revisedDate.toISOString() } as Record<string, unknown>,
      signatoryName: "Agent Chronos & Themis",
      signatoryRole: "Council Arbitral Adjudicators",
      severity: isNoticeTimeBarred ? "critical" : "verified",
    });

    await supabase
      .from("eot_claim_dossiers")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    revalidatePath("/commercial/hindrance-eot");
    revalidatePath("/commercial/ra-bills");
    revalidatePath("/");

    return { success: true, data, isNoticeTimeBarred, ldShield, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to adjudicate EOT claim." };
  }
}
