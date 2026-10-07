"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";

export interface EmbLinePayload {
  projectId: string;
  itemCode: string;
  description: string;
  gridLocation: string;
  numbersCount: number;
  lengthM: number;
  breadthM: number;
  depthM: number;
  grossQty: number;
  deductionQty: number;
  netQty: number;
  unit: string;
  rateInr: number;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for e-MB actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function addMeasurementEntry(payload: EmbLinePayload) {
  try {
    const supabase = getSupabase();
    const amountInr = Math.round(payload.netQty * payload.rateInr);

    const { data, error } = await supabase
      .from("digital_measurement_book_entries")
      .insert({
        project_id: payload.projectId,
        item_code: payload.itemCode,
        description: payload.description,
        grid_location: payload.gridLocation,
        length_m: payload.lengthM,
        breadth_m: payload.breadthM,
        depth_m: payload.depthM,
        gross_quantity: payload.grossQty,
        deduction_quantity: payload.deductionQty,
        net_quantity: payload.netQty,
        calculated_quantity: payload.netQty,
        unit: payload.unit,
        rate_inr: payload.rateInr,
        ae_test_checked: false,
        consultant_qs_verified: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Cryptographically seal new field measurement line
    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `e-MB Entry Logged: ${payload.itemCode} (${payload.gridLocation})`,
      actionCategory: "EMB_FIELD_MEASUREMENT",
      moduleRef: String(data.id),
      details: { payload, amountInr },
      signatoryName: "Site Measurement Engineer",
      signatoryRole: "Field Surveyor",
      severity: "info",
    });

    revalidatePath("/finance/measurement-book");
    revalidatePath("/finance/ra-bills");
    revalidatePath("/");

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to commit e-MB entry." };
  }
}

export async function toggleAeTestCheck(id: string, projectId: string, nextState: boolean) {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from("digital_measurement_book_entries")
      .update({
        ae_test_checked: nextState,
      })
      .eq("id", id);

    if (error) throw error;

    if (nextState) {
      await HermesAgent.notarizeTransaction({
        projectId,
        actionTitle: `CPWD Mandatory 10% Check Measurement Verified`,
        actionCategory: "EMB_AE_TEST_CHECK_PASSED",
        moduleRef: String(id),
        details: { verifiedAt: new Date().toISOString() },
        signatoryName: "Assistant Engineer (Civil)",
        signatoryRole: "Statutory Check Officer",
        severity: "verified",
      });
    }

    revalidatePath("/finance/measurement-book");
    revalidatePath("/finance/ra-bills");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update AE sign-off." };
  }
}

export async function deleteMeasurementEntry(id: string) {
  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from("digital_measurement_book_entries")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/finance/measurement-book");
    revalidatePath("/finance/ra-bills");
    revalidatePath("/");

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to delete line." };
  }
}
