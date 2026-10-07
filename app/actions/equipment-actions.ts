"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { AnankeAgent } from "@/lib/agents/ananke";
import { HermesAgent } from "@/lib/agents/hermes";

export interface RegisterPlantAssetPayload {
  projectId: string;
  equipmentCode: string;
  equipmentName: string;
  category: string;
  makeAndModel: string;
  registrationNumber?: string;
  oemRatedFuelBurnLph: number;
  operatorName: string;
  operatorLicenseNumber?: string;
  gridCoordinate: string;
  fitnessCertificateExpiry: string;
}

export interface LogEquipmentShiftPayload {
  projectId: string;
  equipmentId: string;
  operatingHours: number;
  idlingHours: number;
  fuelIssuedLiters: number;
  outputAchievedM3: number;
  targetOutputM3: number;
  logNotes?: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Equipment actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function registerPlantAsset(payload: RegisterPlantAssetPayload) {
  try {
    const supabase = getSupabase();

    const isExpired = new Date(payload.fitnessCertificateExpiry).getTime() < Date.now();
    const initialStatus = isExpired ? "GROUNDED_SAFETY_HOLD" : "OPERATIONAL_ACTIVE";

    const { data, error } = await supabase
      .from("equipment_fleet_telematics")
      .insert({
        project_id: payload.projectId,
        equipment_code: payload.equipmentCode.toUpperCase(),
        equipment_name: payload.equipmentName,
        category: payload.category,
        make_and_model: payload.makeAndModel,
        registration_number: payload.registrationNumber || null,
        oem_rated_fuel_burn_lph: payload.oemRatedFuelBurnLph,
        operator_name: payload.operatorName,
        operator_license_number: payload.operatorLicenseNumber || null,
        grid_coordinate: payload.gridCoordinate,
        fitness_certificate_expiry: payload.fitnessCertificateExpiry,
        status: initialStatus,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Plant Asset Registered: ${payload.equipmentName} [${payload.equipmentCode}]`,
      actionCategory: "EQUIPMENT_ASSET_ENROLLED",
      moduleRef: String(data.id),
      details: { ...payload } as Record<string, unknown>,
      signatoryName: "Agent Ananke (Fleet Governor)",
      signatoryRole: "Autonomous Plant & Machinery Auditor",
      severity: initialStatus === "GROUNDED_SAFETY_HOLD" ? "warning" : "info",
    });

    revalidatePath("/operations/plant-machinery");
    revalidatePath("/");

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to register plant asset." };
  }
}

export async function logEquipmentShift(payload: LogEquipmentShiftPayload) {
  try {
    const supabase = getSupabase();

    // 1. Fetch equipment profile
    const { data: asset, error: fetchErr } = await supabase
      .from("equipment_fleet_telematics")
      .select("*")
      .eq("id", payload.equipmentId)
      .single();

    if (fetchErr || !asset) throw new Error("Equipment asset not found.");

    // 2. Evaluate via Agent Ananke (ISO 22400 OEE & Fuel Variance)
    const evalResult = AnankeAgent.evaluateAssetTelematics({
      assetCode: asset.equipment_code,
      category: asset.category,
      plannedOperatingHours: payload.operatingHours + payload.idlingHours,
      actualOperatingHours: payload.operatingHours,
      idlingHours: payload.idlingHours,
      fuelConsumedLiters: payload.fuelIssuedLiters,
      oemRatedFuelBurnLph: Number(asset.oem_rated_fuel_burn_lph || 14.5),
      outputVolumeM3: payload.outputAchievedM3,
      targetVolumeM3: payload.targetOutputM3,
      fitnessExpiryDateIso: asset.fitness_certificate_expiry,
    });

    // 3. Commit shift log (CPWD Form 31)
    const { data: log, error: logErr } = await supabase
      .from("equipment_shift_logs")
      .insert({
        project_id: payload.projectId,
        equipment_id: payload.equipmentId,
        shift_date: new Date().toISOString().slice(0, 10),
        operating_hours: payload.operatingHours,
        idling_hours: payload.idlingHours,
        fuel_issued_liters: payload.fuelIssuedLiters,
        output_achieved_m3: payload.outputAchievedM3,
        target_output_m3: payload.targetOutputM3,
        fuel_variance_pct: evalResult.fuelVariancePct,
        oee_pct: evalResult.overallOeePct,
        log_notes: payload.logNotes || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (logErr) throw logErr;

    // 4. Update asset cumulative totals and operational status
    const newTotalHours = Number(asset.cumulative_hours || 0) + payload.operatingHours;
    const newTotalFuel = Number(asset.cumulative_fuel_liters || 0) + payload.fuelIssuedLiters;

    await supabase
      .from("equipment_fleet_telematics")
      .update({
        cumulative_hours: newTotalHours,
        cumulative_fuel_liters: newTotalFuel,
        status: evalResult.operationalStatus,
      })
      .eq("id", payload.equipmentId);

    // 5. Notarize transaction via Hermes
    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `P&M Shift Logged: ${asset.equipment_code} (${evalResult.overallOeePct}% OEE)`,
      actionCategory: "EQUIPMENT_SHIFT_LOGGED",
      moduleRef: String(log.id),
      details: { ...evalResult } as Record<string, unknown>,
      signatoryName: "Agent Ananke (Fleet Governor)",
      signatoryRole: "Autonomous Plant & Machinery Auditor",
      severity: evalResult.isFuelPilferageFlagged || evalResult.isFitnessExpired ? "warning" : "verified",
    });

    revalidatePath("/operations/plant-machinery");
    revalidatePath("/");

    return { success: true, log, evalResult };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to commit shift log." };
  }
}

export async function toggleGroundEquipment(equipmentId: string, projectId: string, enforceGround: boolean, reason?: string) {
  try {
    const supabase = getSupabase();
    const newStatus = enforceGround ? "GROUNDED_SAFETY_HOLD" : "OPERATIONAL_ACTIVE";

    const { error } = await supabase
      .from("equipment_fleet_telematics")
      .update({ status: newStatus })
      .eq("id", equipmentId);

    if (error) throw error;

    await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: `Equipment Status Override: ${newStatus}`,
      actionCategory: "EQUIPMENT_SAFETY_GROUNDING",
      moduleRef: equipmentId,
      details: { status: newStatus, reason: reason || "Manual supervisory override." },
      signatoryName: "Resident Plant Engineer",
      signatoryRole: "Superintending Engineer",
      severity: enforceGround ? "critical" : "verified",
    });

    revalidatePath("/operations/plant-machinery");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to override equipment status." };
  }
}
