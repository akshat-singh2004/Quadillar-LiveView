"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";

export interface BBSchedulePayload {
  projectId: string;
  elementTag: string;
  memberType: string;
  diameterMm: number;
  barShape: string;
  numberOfBars: number;
  spacingCcMm?: number;
  clearCoverMm?: number;
  cutLengthPerBarM: number;
  bendDeductionMm?: number;
  residualScrapLengthM?: number;
  scrapRatePct: number;
  totalLengthM: number;
  totalWeightMt: number;
  status?: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function saveBBSchedule(payload: BBSchedulePayload) {
  try {
    const supabase = getSupabase();
    const timestamp = new Date().toISOString();

    const { data, error } = await supabase
      .from("bar_bending_schedules")
      .insert({
        project_id: payload.projectId,
        element_tag: payload.elementTag,
        member_type: payload.memberType,
        bar_diameter_mm: payload.diameterMm,
        bar_shape: payload.barShape,
        number_of_bars: payload.numberOfBars,
        cut_length_m: payload.cutLengthPerBarM,
        total_length_m: payload.totalLengthM,
        total_weight_mt: payload.totalWeightMt,
        scrap_pct: payload.scrapRatePct,
        status: payload.status || (payload.scrapRatePct <= 3.0 ? "Approved for Bending" : "Excess Wastage Flag"),
        created_at: timestamp,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/engineering/bbs");
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to commit BBS schedule." };
  }
}
