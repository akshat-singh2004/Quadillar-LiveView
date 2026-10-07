"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { DaedalusAgent } from "@/lib/agents/daedalus";
import { HermesAgent } from "@/lib/agents/hermes";

export interface LogHydrationReadingPayload {
  projectId: string;
  pourCardId: string;
  structuralElement: string;
  sensorNodeCode: string;
  coreTempC: number;
  surfaceTempC: number;
  ambientTempC: number;
  hoursSincePour: number;
  targetFckMpa: number;
}

export interface AuthorizeStrippingPayload {
  projectId: string;
  pourCardId: string;
  structuralElement: string;
  gridLocation: string;
  targetFckMpa: number;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Hydration actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function logHydrationReading(payload: LogHydrationReadingPayload) {
  try {
    const supabase = getSupabase();

    // 1. Execute deterministic hydration kinetics & CIRIA C766 evaluation via Daedalus
    const evalResult = DaedalusAgent.evaluateHydrationKinetics({
      coreTempC: payload.coreTempC,
      surfaceTempC: payload.surfaceTempC,
      ambientTempC: payload.ambientTempC,
      hoursSincePour: payload.hoursSincePour,
      targetFckMpa: payload.targetFckMpa,
    });

    // 2. Commit telemetry record to concrete_hydration_telemetry
    const { data, error } = await supabase
      .from("concrete_hydration_telemetry")
      .insert({
        project_id: payload.projectId,
        pour_card_id: payload.pourCardId,
        structural_element: payload.structuralElement,
        sensor_node_code: payload.sensorNodeCode,
        core_temp_c: payload.coreTempC,
        surface_temp_c: payload.surfaceTempC,
        ambient_temp_c: payload.ambientTempC,
        hours_since_pour: payload.hoursSincePour,
        target_fck_mpa: payload.targetFckMpa,
        differential_temp_c: evalResult.differentialTempC,
        maturity_index_deg_hrs: evalResult.maturityIndexCdegHours,
        estimated_strength_mpa: evalResult.estimatedStrengthMpa,
        is_def_risk: evalResult.isDefRisk,
        is_thermal_crack_risk: evalResult.isThermalCrackRisk,
        stripping_permitted: evalResult.strippingPermitted,
        evaluation_verdict: evalResult.verdict,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Notarize critical thermal anomalies if gradient breached
    if (evalResult.isThermalCrackRisk || evalResult.isDefRisk) {
      await HermesAgent.notarizeTransaction({
        projectId: payload.projectId,
        actionTitle: `CIRIA C766 Thermal Hold: ${payload.pourCardId} (ΔT=${evalResult.differentialTempC}°C)`,
        actionCategory: "QUALITY_THERMAL_GRADIENT_BREACH",
        moduleRef: payload.pourCardId,
        details: { payload, evalResult } as Record<string, unknown>,
        signatoryName: "Agent Daedalus (Hydration Governor)",
        signatoryRole: "Autonomous Thermodynamic Adjudicator",
        severity: "critical",
      });
    }

    revalidatePath("/quality/thermal-hydration");
    revalidatePath("/");

    return { success: true, data, evalResult };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to commit hydration telemetry." };
  }
}

export async function authorizeFormworkStripping(payload: AuthorizeStrippingPayload) {
  try {
    const supabase = getSupabase();
    const permitNumber = `STRIP-${Date.now().toString().slice(-6)}`;

    // 1. Fetch latest telemetry reading for this pour
    const { data: latestReading, error: fetchErr } = await supabase
      .from("concrete_hydration_telemetry")
      .select("*")
      .eq("pour_card_id", payload.pourCardId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !latestReading) {
      return { success: false, error: "No thermal telemetry recorded for this pour card." };
    }

    if (!latestReading.stripping_permitted) {
      return {
        success: false,
        error: `STRIPPING REJECTED: In-situ strength ${latestReading.estimated_strength_mpa} MPa has not reached 70% threshold (${payload.targetFckMpa * 0.70} MPa) or thermal gradient ΔT=${latestReading.differential_temp_c}°C exceeds 20°C limit.`,
      };
    }

    const strengthRatioPct = parseFloat(
      ((latestReading.estimated_strength_mpa / payload.targetFckMpa) * 100).toFixed(1)
    );

    // 2. Cryptographic Section 65B Notarization via Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Formwork Stripping Authorized: ${permitNumber} [${strengthRatioPct}% f_ck]`,
      actionCategory: "QUALITY_FORMWORK_STRIPPING_AUTHORIZED",
      moduleRef: permitNumber,
      details: {
        payload,
        latestReading,
        strengthRatioPct,
      } as Record<string, unknown>,
      signatoryName: "Agent Daedalus (Hydration Governor)",
      signatoryRole: "Autonomous Thermodynamic Adjudicator",
      severity: "verified",
    });

    // 3. Commit Permit Record
    const { data, error } = await supabase
      .from("formwork_stripping_permits")
      .insert({
        project_id: payload.projectId,
        permit_number: permitNumber,
        pour_card_id: payload.pourCardId,
        structural_element: payload.structuralElement,
        grid_location: payload.gridLocation,
        target_fck_mpa: payload.targetFckMpa,
        achieved_strength_mpa: latestReading.estimated_strength_mpa,
        strength_ratio_pct: strengthRatioPct,
        differential_temp_c: latestReading.differential_temp_c,
        status: "STRIPPING_AUTHORIZED",
        seor_signoff_hash: seal.blockHash,
        cleared_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/quality/thermal-hydration");
    revalidatePath("/quality/pour-cards");
    revalidatePath("/");

    return { success: true, data, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to authorize formwork stripping." };
  }
}
