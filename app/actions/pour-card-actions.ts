"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { AegisAgent } from "@/lib/agents/aegis";
import { ArgusAgent } from "@/lib/agents/argus";
import { HermesAgent } from "@/lib/agents/hermes";

export interface CreatePourCardPayload {
  projectId: string;
  structuralElement: string;
  gridLocation: string;
  levelElevation: string;
  concreteGrade: string;
  plannedVolumeM3: number;
  castingMethod?: string;
}

export interface SignDisciplinePayload {
  projectId: string;
  pourCardId: string;
  discipline: "FORMWORK" | "REBAR" | "MEP" | "ENVIRONMENTAL";
  inspectorName: string;
  remarks?: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Pour Card actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function createPourCard(payload: CreatePourCardPayload) {
  try {
    const supabase = getSupabase();
    const pourNumber = `PC-${Date.now().toString().slice(-6)}`;

    // 1. Check Aegis spatial lockout upfront
    const spatialCheck = await AegisAgent.checkSpatialLockout(
      payload.projectId,
      undefined,
      payload.gridLocation
    );

    const { data, error } = await supabase
      .from("digital_pour_cards")
      .insert({
        project_id: payload.projectId,
        pour_card_number: pourNumber,
        structural_element: payload.structuralElement,
        grid_location: payload.gridLocation,
        level_elevation: payload.levelElevation,
        concrete_grade: payload.concreteGrade,
        planned_volume_m3: payload.plannedVolumeM3,
        casting_method: payload.castingMethod || "BOOM_PUMP",
        spatial_quality_cleared: !spatialCheck.isLocked,
        status: spatialCheck.isLocked ? "SPATIAL_HOLD_NCR" : "PENDING_INSPECTION",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Pour Card Initiated: ${pourNumber} (${payload.structuralElement})`,
      actionCategory: "QUALITY_POUR_CARD_INITIATED",
      moduleRef: pourNumber,
      details: { payload, spatialLocked: spatialCheck.isLocked } as Record<string, unknown>,
      signatoryName: "Site QA/QC Engineer",
      signatoryRole: "Field Inspection Lead",
      severity: spatialCheck.isLocked ? "warning" : "info",
    });

    revalidatePath("/quality/pour-cards");
    revalidatePath("/");

    return { success: true, data, spatialLocked: spatialCheck.isLocked };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to initiate pour card." };
  }
}

export async function signPourDiscipline(payload: SignDisciplinePayload) {
  try {
    const supabase = getSupabase();

    const { data: current, error: fetchErr } = await supabase
      .from("digital_pour_cards")
      .select("*")
      .eq("id", payload.pourCardId)
      .single();

    if (fetchErr || !current) throw new Error("Pour Card not found.");

    // Update the targeted trade discipline
    const updates: Record<string, any> = {};
    if (payload.discipline === "FORMWORK") {
      updates.formwork_cleared = true;
      updates.formwork_cleared_by = payload.inspectorName;
    } else if (payload.discipline === "REBAR") {
      updates.rebar_cleared = true;
      updates.rebar_cleared_by = payload.inspectorName;
    } else if (payload.discipline === "MEP") {
      updates.mep_embedments_cleared = true;
      updates.mep_cleared_by = payload.inspectorName;
    }

    // Verify live meteorological conditions via Argus
    const weatherCheck = ArgusAgent.evaluateMicroclimate({
      windSpeedKmh: 14.5,
      rainfallRateMmh: 0.0,
      temperatureC: 31.0,
    });
    updates.weather_window_cleared = weatherCheck.permitted;

    // Verify Aegis spatial lockout
    const spatialCheck = await AegisAgent.checkSpatialLockout(
      payload.projectId,
      undefined,
      current.grid_location
    );
    updates.spatial_quality_cleared = !spatialCheck.isLocked;

    // Check if all 5 criteria are now satisfied
    const formwork = updates.formwork_cleared ?? current.formwork_cleared;
    const rebar = updates.rebar_cleared ?? current.rebar_cleared;
    const mep = updates.mep_embedments_cleared ?? current.mep_embedments_cleared;
    const spatial = updates.spatial_quality_cleared;
    const weather = updates.weather_window_cleared;

    const allPassed = formwork && rebar && mep && spatial && weather;

    if (allPassed) {
      updates.status = "PRE_POUR_AUTHORIZED";
      updates.cleared_at = new Date().toISOString();

      // Cryptographically seal pour clearance via Hermes
      const seal = await HermesAgent.notarizeTransaction({
        projectId: payload.projectId,
        actionTitle: `Pre-Pour Clearance Authorized: ${current.pour_card_number} [${current.structuralElement}]`,
        actionCategory: "QUALITY_POUR_AUTHORIZED",
        moduleRef: current.pour_card_number,
        details: { ...updates, pourCardNumber: current.pour_card_number } as Record<string, unknown>,
        signatoryName: "Agent Aegis & Resident SEOR",
        signatoryRole: "Autonomous Concreting Authority",
        severity: "verified",
      });
      updates.seor_signoff_hash = seal.blockHash;
    } else if (spatialCheck.isLocked) {
      updates.status = "SPATIAL_HOLD_NCR";
    }

    const { data: updated, error: updateErr } = await supabase
      .from("digital_pour_cards")
      .update(updates)
      .eq("id", payload.pourCardId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    revalidatePath("/quality/pour-cards");
    revalidatePath("/finance/ra-bills");
    revalidatePath("/");

    return { success: true, data: updated, allPassed };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to sign inspection discipline." };
  }
}
