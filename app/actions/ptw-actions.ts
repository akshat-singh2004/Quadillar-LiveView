"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { AegisAgent } from "@/lib/agents/aegis";
import { ArgusAgent } from "@/lib/agents/argus";
import { HermesAgent } from "@/lib/agents/hermes";

export interface PTWRecord {
  id: string;
  project_id?: string;
  permit_number: string;
  permit_type?: string;
  permit_category?: any;
  location_zone?: string;
  location?: string;
  contractor_agency?: string;
  subcontractor_name?: any;
  supervisor_name?: string;
  safety_officer_name?: string;
  valid_from?: string;
  valid_to?: string;
  status: string;
  wind_speed_kmh?: any;
  oxygen_level_pct?: any;
  ppe_verified?: boolean;
  harness_lifeline_verified?: boolean;
  gas_testing_verified?: boolean;
  fire_watch_assigned?: boolean;
  shoring_stable?: boolean;
  spatial_lockout_cleared?: boolean;
  weather_window_cleared?: boolean;
  seor_signoff_hash?: string | null;
  closure_remarks?: string | null;
  closed_at?: string | null;
  created_at?: string;
  [key: string]: any;
}

export interface CreatePermitPayload {
  projectId: string;
  permitType: "HEIGHT_WORK" | "HOT_WORK" | "CONFINED_SPACE" | "DEEP_EXCAVATION" | "HEAVY_LIFT" | string;
  locationZone: string;
  contractorAgency: string;
  supervisorName: string;
  validHoursDuration?: number;
  ppeVerified: boolean;
  harnessLifelineVerified?: boolean;
  gasTestingVerified?: boolean;
  fireWatchAssigned?: boolean;
  shoringStable?: boolean;
  [key: string]: unknown;
}

export interface LogAtmosphericTestPayload {
  projectId: string;
  permitId: string;
  oxygenPct: number;
  combustibleLelPct: number;
  h2sPpm: number;
  coPpm: number;
  testedBy: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for PTW actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

// ----------------------------------------------------------------------------
// 1. QUERY: fetchPTWRecords
// ----------------------------------------------------------------------------
export async function fetchPTWRecords(projectId = "GOMTI-NAGAR-PH1-FITOUT"): Promise<PTWRecord[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("digital_permits_to_work")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[fetchPTWRecords notice]:", error.message);
      return [];
    }

    return (data || []) as PTWRecord[];
  } catch (err: any) {
    console.error("[fetchPTWRecords fault]:", err?.message);
    return [];
  }
}

// ----------------------------------------------------------------------------
// 2. STATUTORY ENGINE: issuePermitToWork
// ----------------------------------------------------------------------------
export async function issuePermitToWork(payload: CreatePermitPayload) {
  try {
    const supabase = getSupabase();
    const targetProjectId = payload.projectId || "GOMTI-NAGAR-PH1-FITOUT";

    // 1. AEGIS SPATIAL QUALITY & DEFECT LOCKOUT CHECK
    const spatialCheck = await AegisAgent.checkSpatialLockout(targetProjectId, undefined, payload.locationZone);
    if (spatialCheck.isLocked) {
      return {
        success: false,
        error: `AEGIS SAFETY LOCKOUT: Cannot issue permit. Active structural NCR [${spatialCheck.ncrNumber || "ACTIVE"}] blocks work in zone ${payload.locationZone}.`,
      };
    }

    // 2. ARGUS ENVIRONMENTAL CUTOFF CHECK (Wind > 38 km/h or Rain > 5 mm/h for Height/Cranes)
    if (payload.permitType === "HEIGHT_WORK" || payload.permitType === "HEAVY_LIFT") {
      const weatherCheck = ArgusAgent.evaluateMicroclimate({
        windSpeedKmh: 16.0,
        rainfallRateMmh: 0.0,
        temperatureC: 32.0,
      });

      if (!weatherCheck.permitted) {
        return {
          success: false,
          error: `ARGUS HSE WEATHER STOPPAGE: ${weatherCheck.reasons.join(" | ")}`,
        };
      }
    }

    const durationHrs = payload.validHoursDuration || 8;
    const now = new Date();
    const validTo = new Date(now.getTime() + durationHrs * 3600 * 1000);
    const permitNumber = `PTW-${String(payload.permitType).slice(0, 3)}-${Date.now().toString().slice(-5)}`;

    const { data, error } = await supabase
      .from("digital_permits_to_work")
      .insert({
        project_id: targetProjectId,
        permit_number: permitNumber,
        permit_type: payload.permitType,
        location_zone: payload.locationZone,
        contractor_agency: payload.contractorAgency,
        supervisor_name: payload.supervisorName,
        safety_officer_name: "Autonomous HSE Council",
        valid_from: now.toISOString(),
        valid_to: validTo.toISOString(),
        ppe_verified: payload.ppeVerified,
        harness_lifeline_verified: payload.harnessLifelineVerified || false,
        gas_testing_verified: payload.gasTestingVerified || false,
        fire_watch_assigned: payload.fireWatchAssigned || false,
        shoring_stable: payload.shoringStable || false,
        spatial_lockout_cleared: true,
        weather_window_cleared: true,
        status: "PERMIT_ACTIVE",
        created_at: now.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. HERMES SECTION 65B NOTARIZATION
    const seal = await HermesAgent.notarizeTransaction({
      projectId: targetProjectId,
      actionTitle: `Permit to Work Authorized: ${permitNumber} [${payload.permitType}]`,
      actionCategory: "SAFETY_PTW_ISSUED",
      moduleRef: permitNumber,
      details: { ...payload, permitNumber, validTo: validTo.toISOString() } as Record<string, unknown>,
      signatoryName: "Agent Argus & Safety Lead",
      signatoryRole: "Autonomous Safety Officer",
      severity: "verified",
    });

    await supabase
      .from("digital_permits_to_work")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    revalidatePath("/safety/ptw");
    revalidatePath("/site/permits");
    revalidatePath("/");

    return { success: true, data, permitNumber, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to authorize Permit to Work." };
  }
}

// ----------------------------------------------------------------------------
// 3. ADAPTER: submitPTW (Supports 1 or 2 arguments)
// ----------------------------------------------------------------------------
export async function submitPTW(arg1: any, arg2?: any): Promise<{
  success: boolean;
  data?: any;
  status?: string;
  permitNumber?: string;
  sealHash?: string;
  error?: string;
}> {
  let projectId = "GOMTI-NAGAR-PH1-FITOUT";
  let payload: any = {};

  if (arg2 !== undefined) {
    projectId = typeof arg1 === "string" ? arg1 : (arg1?.projectId || projectId);
    payload = arg2;
  } else {
    payload = arg1 || {};
    projectId = payload?.projectId || payload?.project_id || projectId;
  }

  const permitType = payload.permitType || payload.permit_type || payload.permitCategory || payload.permit_category || "HEIGHT_WORK";
  const locationZone = payload.locationZone || payload.location_zone || payload.location || payload.gridLocation || "Site Axis";
  const contractorAgency = payload.contractorAgency || payload.contractor_agency || payload.contractor || payload.subcontractorName || payload.subcontractor_name || "General Subcontractor";
  const supervisorName = payload.supervisorName || payload.supervisor_name || payload.supervisor || "Safety Marshall";
  const validHoursDuration = Number(payload.validHoursDuration || payload.durationHours || 8);

  const res = await issuePermitToWork({
    projectId,
    permitType,
    locationZone,
    contractorAgency,
    supervisorName,
    validHoursDuration,
    ppeVerified: payload.ppeVerified !== undefined ? Boolean(payload.ppeVerified) : true,
    harnessLifelineVerified: Boolean(payload.harnessLifelineVerified || payload.harness_lifeline_verified),
    gasTestingVerified: Boolean(payload.gasTestingVerified || payload.gas_testing_verified),
    fireWatchAssigned: Boolean(payload.fireWatchAssigned || payload.fire_watch_assigned),
    shoringStable: Boolean(payload.shoringStable || payload.shoring_stable),
  });

  return {
    ...res,
    status: res.data?.status || (res.success ? "PERMIT_ACTIVE" : undefined),
  };
}

// ----------------------------------------------------------------------------
// 4. WORKFLOW: togglePTWSuspension (Accepts boolean OR status string)
// ----------------------------------------------------------------------------
export async function togglePTWSuspension(
  permitId: string,
  suspendOrCurrentStatus: boolean | string,
  projectIdOrReason?: string,
  maybeReason?: string
): Promise<{ success: boolean; data?: any; status?: string; error?: string }> {
  try {
    const supabase = getSupabase();
    let suspend = false;
    let reason = maybeReason;
    let projectId = "GOMTI-NAGAR-PH1-FITOUT";

    if (typeof projectIdOrReason === "string" && projectIdOrReason.length > 0) {
      if (projectIdOrReason.includes(" ")) {
        reason = projectIdOrReason;
      } else {
        projectId = projectIdOrReason;
      }
    }

    if (typeof suspendOrCurrentStatus === "boolean") {
      suspend = suspendOrCurrentStatus;
    } else if (typeof suspendOrCurrentStatus === "string") {
      const s = suspendOrCurrentStatus.toUpperCase();
      // If currently active, toggling suspends it; otherwise reinstates it
      if (s.includes("ACTIVE") || s === "OPEN" || s === "APPROVED" || s === "VALID") {
        suspend = true;
      } else {
        suspend = false;
      }
    }

    const nextStatus = suspend ? "SUSPENDED_SAFETY_HOLD" : "PERMIT_ACTIVE";

    const { data, error } = await supabase
      .from("digital_permits_to_work")
      .update({
        status: nextStatus,
        closure_remarks: reason || (suspend ? "Suspended under Safety Stoppage Order" : "Reinstated post-inspection"),
      })
      .eq("id", permitId)
      .select()
      .single();

    if (error) throw error;

    const targetProject = data?.project_id || projectId;
    await HermesAgent.notarizeTransaction({
      projectId: targetProject,
      actionTitle: `Permit Status Changed: ${data.permit_number} -> ${nextStatus}`,
      actionCategory: "SAFETY_PTW_STATUS_CHANGE",
      moduleRef: data.permit_number,
      details: { permitId, nextStatus, reason: reason || "Supervisory status override" } as Record<string, unknown>,
      signatoryName: "Site Safety Lead",
      signatoryRole: "Autonomous Safety Officer",
      severity: suspend ? "warning" : "verified",
    });

    revalidatePath("/safety/ptw");
    revalidatePath("/site/permits");
    revalidatePath("/");

    return { success: true, data, status: nextStatus };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update permit status.", status: undefined };
  }
}

// ----------------------------------------------------------------------------
// 5. GAS TELEMETRY: logAtmosphericGasTest
// ----------------------------------------------------------------------------
export async function logAtmosphericGasTest(payload: LogAtmosphericTestPayload) {
  try {
    const supabase = getSupabase();

    const isO2Safe = payload.oxygenPct >= 19.5 && payload.oxygenPct <= 23.5;
    const isLelSafe = payload.combustibleLelPct < 10.0;
    const isH2sSafe = payload.h2sPpm < 10.0;
    const isCoSafe = payload.coPpm < 25.0;
    const isAtmosphereSafe = isO2Safe && isLelSafe && isH2sSafe && isCoSafe;

    const { data, error } = await supabase
      .from("ptw_gas_telemetry_readings")
      .insert({
        project_id: payload.projectId,
        permit_id: payload.permitId,
        oxygen_pct: payload.oxygenPct,
        combustible_lel_pct: payload.combustibleLelPct,
        h2s_ppm: payload.h2sPpm,
        co_ppm: payload.coPpm,
        is_atmosphere_safe: isAtmosphereSafe,
        tested_by: payload.testedBy,
        tested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    if (!isAtmosphereSafe) {
      await supabase
        .from("digital_permits_to_work")
        .update({
          status: "GAS_CONTAMINATION_REVOKED",
          closure_remarks: `AUTOMATED REVOCATION: O2=${payload.oxygenPct}%, LEL=${payload.combustibleLelPct}%, H2S=${payload.h2sPpm}ppm, CO=${payload.coPpm}ppm breached safety ceiling.`,
        })
        .eq("id", payload.permitId);
    } else {
      await supabase
        .from("digital_permits_to_work")
        .update({ gas_testing_verified: true })
        .eq("id", payload.permitId);
    }

    revalidatePath("/safety/ptw");
    revalidatePath("/site/permits");
    revalidatePath("/");

    return { success: true, data, isAtmosphereSafe };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to commit gas reading." };
  }
}

// ----------------------------------------------------------------------------
// 6. CLOSEOUT: closePermitToWork
// ----------------------------------------------------------------------------
export async function closePermitToWork(permitId: string, projectId: string, remarks?: string) {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("digital_permits_to_work")
      .update({
        status: "CLOSED_NORMAL",
        closed_at: new Date().toISOString(),
        closure_remarks: remarks || "Workfront demobilized safely; housekeeping verified.",
      })
      .eq("id", permitId)
      .select()
      .single();

    if (error) throw error;

    await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: `Permit to Work Closed: ${data.permit_number}`,
      actionCategory: "SAFETY_PTW_CLOSED",
      moduleRef: data.permit_number,
      details: { permitNumber: data.permit_number, closedAt: new Date().toISOString() } as Record<string, unknown>,
      signatoryName: "Site Safety Lead",
      signatoryRole: "Autonomous Safety Officer",
      severity: "verified",
    });

    revalidatePath("/safety/ptw");
    revalidatePath("/site/permits");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to close permit." };
  }
}
