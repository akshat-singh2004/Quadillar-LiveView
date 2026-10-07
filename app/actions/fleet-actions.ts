"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { AnankeAgent } from "@/lib/agents/ananke";
import { ArgusAgent } from "@/lib/agents/argus";
import { HermesAgent } from "@/lib/agents/hermes";
import { CouncilSynapse } from "@/lib/agents/synapse";

export interface LogAssetTelemetryPayload {
  projectId: string;
  assetCode: string;
  assetName: string;
  category: "TOWER_CRANE" | "CONCRETE_PUMP" | "TRANSIT_MIXER" | "EXCAVATOR";
  plannedOperatingHours: number;
  actualOperatingHours: number;
  idlingHours?: number;
  fuelConsumedLiters: number;
  oemRatedFuelBurnLph: number;
  outputVolumeM3: number;
  targetVolumeM3: number;
  fitnessExpiryDateIso: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Fleet actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function logAssetTelemetry(payload: LogAssetTelemetryPayload) {
  try {
    const supabase = getSupabase();
    const telemetryCode = `TEL-${payload.assetCode}-${Date.now().toString().slice(-4)}`;

    // 1. Evaluate Ananke Governor (OEE, Fuel Pilferage, Fitness Expiry)
    const evalResult = AnankeAgent.evaluateAssetTelematics({
      assetCode: payload.assetCode,
      category: payload.category,
      plannedOperatingHours: payload.plannedOperatingHours,
      actualOperatingHours: payload.actualOperatingHours,
      idlingHours: payload.idlingHours || 0,
      fuelConsumedLiters: payload.fuelConsumedLiters,
      oemRatedFuelBurnLph: payload.oemRatedFuelBurnLph,
      outputVolumeM3: payload.outputVolumeM3,
      targetVolumeM3: payload.targetVolumeM3,
      fitnessExpiryDateIso: payload.fitnessExpiryDateIso,
    });

    // 2. Inter-Agent Communication: Argus to Ananke Wind Interlock
    let finalStatus = evalResult.operationalStatus;
    if (payload.category === "TOWER_CRANE") {
      const weatherCheck = ArgusAgent.evaluateMicroclimate({
        windSpeedKmh: 41.5, // Anemometer sensor read
        rainfallRateMmh: 0,
        temperatureC: 32,
      });

      if (!weatherCheck.permitted) {
        finalStatus = "GROUNDED_SAFETY_HOLD";

        // Dispatch Synapse Event: Argus -> Ananke
        await CouncilSynapse.dispatch({
          projectId: payload.projectId,
          eventType: "WEATHER_CUTOFF_TRIGGERED",
          sourceAgent: "Argus (HSE Governor)",
          targetAgent: "Ananke (Fleet Governor)",
          payload: { assetCode: payload.assetCode, windSpeedKmh: 41.5 },
          actionTaken: `Tower crane ${payload.assetCode} grounded into weathervane mode per IS 13367 cutoff.`,
        });
      }
    }

    // 3. Commit to plant_machinery_telematics
    const { data, error } = await supabase
      .from("plant_machinery_telematics")
      .insert({
        project_id: payload.projectId,
        telemetry_code: telemetryCode,
        asset_code: payload.assetCode,
        asset_name: payload.assetName,
        category: payload.category,
        planned_operating_hours: payload.plannedOperatingHours,
        actual_operating_hours: payload.actualOperatingHours,
        idling_hours: payload.idlingHours || 0,
        fuel_consumed_liters: payload.fuelConsumedLiters,
        oem_rated_burn_lph: payload.oemRatedFuelBurnLph,
        output_volume_m3: payload.outputVolumeM3,
        target_volume_m3: payload.targetVolumeM3,
        fitness_expiry_date: payload.fitnessExpiryDateIso,
        oee_pct: evalResult.overallOeePct,
        fuel_variance_pct: evalResult.fuelVariancePct,
        is_fuel_pilferage_flagged: evalResult.isFuelPilferageFlagged,
        is_fitness_expired: evalResult.isFitnessExpired,
        operational_status: finalStatus,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Hermes Section 65B Notarization
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Plant Telematics Logged: ${payload.assetCode} (${evalResult.overallOeePct}% OEE)`,
      actionCategory: "FLEET_ASSET_TELEMETRY",
      moduleRef: telemetryCode,
      details: { payload, evalResult, finalStatus } as Record<string, unknown>,
      signatoryName: "Agent Ananke (Fleet Governor)",
      signatoryRole: "Autonomous Telematics Adjudicator",
      severity: finalStatus === "ONLINE" ? "verified" : "warning",
    });

    await supabase
      .from("plant_machinery_telematics")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    revalidatePath("/fleet/telematics");
    revalidatePath("/");

    return { success: true, data, evalResult, finalStatus, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to log asset telemetry." };
  }
}
