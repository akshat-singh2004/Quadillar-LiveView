"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { WeighbridgeEngine } from "@/lib/logistics/weighbridge-engine";
import { HermesAgent } from "@/lib/agents/hermes";

export interface InwardTruckPayload {
  projectId: string;
  vehicleNumber: string;
  vendorName: string;
  materialCategory: string;
  challanNumber: string;
  challanWeightMt: number;
  grossWeightMt: number;
  tareWeightMt: number;
  mtcBatchNumber?: string;
  hasMtcCertificate: boolean;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Gate Inward actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function logInwardTruckRecord(payload: InwardTruckPayload) {
  try {
    const supabase = getSupabase();

    // 1. Run algorithmic weighbridge verification
    const evalResult = WeighbridgeEngine.verifyConsignment({
      challanWeightMt: payload.challanWeightMt,
      grossWeightMt: payload.grossWeightMt,
      tareWeightMt: payload.tareWeightMt,
      materialCategory: payload.materialCategory,
      hasMtcCertificate: payload.hasMtcCertificate,
    });

    const now = new Date();
    const grsNumber = `GRS-${now.getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;

    // 2. Commit record into gate_inward_records table
    const { data, error } = await supabase
      .from("gate_inward_records")
      .insert({
        project_id: payload.projectId,
        grs_number: grsNumber,
        vehicle_number: payload.vehicleNumber.toUpperCase(),
        vendor_name: payload.vendorName,
        material_category: payload.materialCategory,
        challan_number: payload.challanNumber,
        challan_weight_mt: payload.challanWeightMt,
        gross_weight_mt: payload.grossWeightMt,
        tare_weight_mt: payload.tareWeightMt,
        net_weight_mt: evalResult.netWeightMt,
        weight_variance_pct: evalResult.variancePct,
        mtc_batch_number: payload.mtcBatchNumber || null,
        mtc_verified: payload.hasMtcCertificate,
        status: evalResult.status,
        rejection_reason: evalResult.rejectionReason || null,
        security_officer: "Security Gate Ingress",
        weighbridge_operator: "Digital Scale Telemetry",
        created_at: now.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Cryptographic Section 65B Audit Trail
    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Gate Inward GRS Issued: ${grsNumber} [${payload.vehicleNumber}]`,
      actionCategory: "MATERIALS_GATE_INWARD_RECEIPT",
      moduleRef: String(data.id),
      details: { payload, evalResult } as Record<string, unknown>,
      signatoryName: "Agent Argus (Site Telemetry Governor)",
      signatoryRole: "Autonomous Weighbridge Auditor",
      severity: evalResult.isVehicleDiverted ? "warning" : "verified",
    });

    revalidatePath("/site/gate-inward");
    revalidatePath("/materials/reconciliation");
    revalidatePath("/");

    return { success: true, data, evalResult };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to commit gate inward record." };
  }
}
