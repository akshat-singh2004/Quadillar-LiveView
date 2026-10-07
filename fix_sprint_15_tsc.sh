#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Resolving Sprint 15 TypeScript compilation errors...\033[0m"

# -----------------------------------------------------------------------------
# 1. FIX: components/quality/LogCubeTestModal.tsx ($f_{ck}$ JSX expression bug)
# -----------------------------------------------------------------------------
if [ -f "components/quality/LogCubeTestModal.tsx" ]; then
  node -e '
    const fs = require("fs");
    const file = "components/quality/LogCubeTestModal.tsx";
    let content = fs.readFileSync(file, "utf8");
    content = content.replace(/\$f_\{ck\}\$/g, "f_ck");
    content = content.replace(/\$f_ck\$/g, "f_ck");
    fs.writeFileSync(file, content, "utf8");
    console.log("  ✓ Fixed JSX expressions in components/quality/LogCubeTestModal.tsx");
  '
fi

# -----------------------------------------------------------------------------
# 2. FIX: app/actions/ptw-actions.ts (Flexible function signatures for PTWCardGrid)
# -----------------------------------------------------------------------------
cat << 'ACTION_PTW' > app/actions/ptw-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";
import { AegisAgent } from "@/lib/agents/aegis";

export interface PTWRecord {
  id: string;
  project_id: string;
  permit_number: string;
  permit_category: string;
  hazard_classification: string;
  location_zone: string;
  subcontractor_name: string;
  valid_from_time: string;
  valid_until_time: string;
  safety_officer_cleared: boolean;
  engineer_cleared: boolean;
  wind_speed_kmh: number;
  oxygen_level_pct: number;
  status: "APPROVED_ACTIVE" | "PENDING_CLEARANCE" | "SUSPENDED" | "CLOSED_SAFE";
  created_at: string;
}

export interface PTWPayload {
  projectId?: string;
  serialId: string;
  permitType: string;
  hazardCategory: string;
  locationZone: string;
  subcontractor: string;
  durationHours: number;
  windSpeedKmh?: number;
  oxygenLevelPct?: number;
  safetyOfficerClearance: "Verified" | "Pending";
  residentEngineerClearance: "Verified" | "Pending";
  safetyChecks?: { id: string; label: string; passed: boolean }[];
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase environment variables.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function fetchPTWRecords(projectId: string): Promise<PTWRecord[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("safety_ptw_register")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[PTW ACTION] Fetch error:", error.message);
      return [];
    }
    return (data as PTWRecord[]) || [];
  } catch {
    return [];
  }
}

export async function submitPTW(projectId: string, payload: PTWPayload) {
  try {
    const supabase = getSupabase();
    const targetProjectId = payload.projectId || projectId || "GOMTI-NAGAR-PH1-FITOUT";
    const now = new Date();
    const validUntil = new Date(now.getTime() + (payload.durationHours || 8) * 3600 * 1000);

    // Aegis Spatial Sentinel: Verify location is not under active structural hold
    const spatialCheck = await AegisAgent.checkSpatialLockout(targetProjectId, undefined, payload.locationZone);
    if (spatialCheck.isLocked) {
      return {
        success: false,
        error: `AEGIS SAFETY LOCKOUT: Cannot issue permit. Active structural NCR [${spatialCheck.ncrNumber}] blocks work in zone ${payload.locationZone}.`,
      };
    }

    const isDualVerified =
      payload.safetyOfficerClearance === "Verified" &&
      payload.residentEngineerClearance === "Verified";

    const dbPayload = {
      project_id: targetProjectId,
      permit_number: payload.serialId,
      permit_category: payload.permitType,
      hazard_classification: payload.hazardCategory,
      location_zone: payload.locationZone,
      subcontractor_name: payload.subcontractor,
      valid_from_time: now.toISOString(),
      valid_until_time: validUntil.toISOString(),
      safety_officer_cleared: payload.safetyOfficerClearance === "Verified",
      engineer_cleared: payload.residentEngineerClearance === "Verified",
      wind_speed_kmh: payload.windSpeedKmh || 12.0,
      oxygen_level_pct: payload.oxygenLevelPct || 20.9,
      checklist_json: payload.safetyChecks || [],
      status: isDualVerified ? "APPROVED_ACTIVE" : "PENDING_CLEARANCE",
      created_at: now.toISOString(),
    };

    const { data, error } = await supabase
      .from("safety_ptw_register")
      .insert([dbPayload])
      .select()
      .single();

    if (error) throw error;

    // Seal legal custody via Hermes
    await HermesAgent.notarizeTransaction({
      projectId: targetProjectId,
      actionTitle: `Issued High-Risk Permit: ${payload.serialId} [${payload.permitType}]`,
      actionCategory: "SAFETY_PTW_ISSUANCE",
      moduleRef: payload.serialId,
      details: dbPayload,
      signatoryName: "A. K. Srivastava (RLI Cert)",
      signatoryRole: "Chief Safety Officer (HSE)",
      severity: isDualVerified ? "verified" : "warning",
    });

    revalidatePath("/site/permits");
    revalidatePath("/safety/ptw");
    revalidatePath("/dashboard");

    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to issue permit.";
    return { success: false, error: message };
  }
}

export async function togglePTWSuspension(
  id: string,
  currentStatus: string,
  projectId: string = "GOMTI-NAGAR-PH1-FITOUT"
) {
  try {
    const supabase = getSupabase();
    const nextStatus = currentStatus === "APPROVED_ACTIVE" ? "SUSPENDED" : "APPROVED_ACTIVE";
    const timestamp = new Date().toISOString();

    const { error } = await supabase
      .from("safety_ptw_register")
      .update({
        status: nextStatus,
        safety_officer_cleared: nextStatus === "APPROVED_ACTIVE",
        engineer_cleared: nextStatus === "APPROVED_ACTIVE",
        updated_at: timestamp,
      })
      .eq("id", id);

    if (error) throw error;

    await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: `PTW ${id} State Transition -> ${nextStatus}`,
      actionCategory: "SAFETY_PTW_STATE_CHANGE",
      moduleRef: id,
      details: { permitId: id, previousStatus: currentStatus, nextStatus },
      signatoryName: "Er. S. P. Verma",
      signatoryRole: "Resident Safety Engineer",
      severity: nextStatus === "SUSPENDED" ? "critical" : "verified",
    });

    revalidatePath("/site/permits");
    revalidatePath("/safety/ptw");
    return { success: true, status: nextStatus };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to transition permit status.";
    return { success: false, error: message };
  }
}
ACTION_PTW
echo "  ✓ Updated app/actions/ptw-actions.ts with flexible signatures"

# -----------------------------------------------------------------------------
# 3. VERIFY COMPILATION
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Running 'npx tsc --noEmit' to verify compilation health...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Zero TypeScript errors! System build fully clean.\033[0m"
