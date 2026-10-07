"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";

export interface CpmActivityRecord {
  id: string;
  project_id: string;
  activity_code: string;
  activity_name: string;
  wbs_element: string;
  planned_start: string;
  planned_finish: string;
  actual_start?: string | null;
  actual_finish?: string | null;
  duration_days: number;
  total_float_days: number;
  is_critical_path: boolean;
  predecessor_codes: string[];
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "CRITICALLY_DELAYED" | string;
  hindrance_ref?: string | null;
  delay_variance_days: number;
  created_at: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-service-key";
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function fetchCpmActivities(projectId = "GOMTI-NAGAR-PH1-FITOUT"): Promise<CpmActivityRecord[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("schedule_cpm_activities")
      .select("*")
      .eq("project_id", projectId)
      .order("planned_start", { ascending: true });

    if (error) throw error;
    return (data || []) as CpmActivityRecord[];
  } catch (err: any) {
    console.error("[fetchCpmActivities notice]:", err.message);
    return [];
  }
}

export async function evaluateTimeImpactAnalysis(
  projectId: string,
  activityCode: string,
  hindranceCode: string,
  delayDays: number,
  notes = "Client drawing turnaround delay impacting critical path raft concrete."
) {
  try {
    const supabase = getSupabase();

    // 1. Fetch target CPM activity
    const { data: act, error: actErr } = await supabase
      .from("schedule_cpm_activities")
      .select("*")
      .eq("project_id", projectId)
      .eq("activity_code", activityCode)
      .single();

    if (actErr || !act) throw new Error("Activity not found in baseline CPM network.");

    // 2. Perform SCL Time Impact Analysis (TIA)
    const newVariance = Number(act.delay_variance_days || 0) + delayDays;
    const previousFloat = Number(act.total_float_days || 0);
    const newFloat = Math.max(-30, previousFloat - delayDays);
    const isCritical = newFloat <= 0.0;
    const newStatus = isCritical ? "CRITICALLY_DELAYED" : act.status;

    // 3. Update activity record
    const { data: updated, error: updateErr } = await supabase
      .from("schedule_cpm_activities")
      .update({
        total_float_days: newFloat,
        delay_variance_days: newVariance,
        is_critical_path: isCritical,
        hindrance_ref: hindranceCode,
        status: newStatus,
      })
      .eq("id", act.id)
      .select()
      .single();

    if (updateErr) throw updateErr;

    // 4. Notarize Time Impact Analysis via Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: `SCL Time Impact Analysis: ${activityCode} +${delayDays}d (${hindranceCode})`,
      actionCategory: "SCHEDULE_TIA_DELAY_NOTARIZED",
      moduleRef: activityCode,
      details: {
        activityCode,
        hindranceCode,
        delayDays,
        previousFloat,
        newFloat,
        isCritical,
        notes,
      } as unknown as Record<string, unknown>,
      signatoryName: "Agent Chronos",
      signatoryRole: "4D Forensic Delay & Scheduling Governor",
      severity: isCritical ? "critical" : "warning",
    });

    revalidatePath("/schedule/gantt");
    revalidatePath("/commercial/hindrance-eot");
    revalidatePath("/");

    return {
      success: true,
      data: updated,
      newFloat,
      isCritical,
      sealHash: seal.blockHash,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to execute Time Impact Analysis." };
  }
}
