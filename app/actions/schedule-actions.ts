"use server";

import crypto from "crypto";
import { supabase } from "@/lib/supabaseClient";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import { computeVanguardCpmNetwork } from "@/lib/calculations/cpmScheduleEngine";

export interface CpmActivityRecord {
  id: string;
  project_id: string;
  activity_code: string;
  wbs_code: string;
  wbs_element: string;
  bit_id: string;
  activity_name: string;
  planned_start: string;
  planned_finish: string;
  duration_days: number;
  predecessors: string[];
  early_start: number;
  early_finish: number;
  late_start: number;
  late_finish: number;
  total_float: number;
  total_float_days: number;
  free_float: number;
  is_critical: boolean;
  is_critical_path: boolean;
  delay_variance_days: number;
  percent_complete: number;
  budget_cr: number;
}

export interface TimeImpactAnalysisResult {
  success: boolean;
  data: CpmActivityRecord;
  newFloat: number;
  isCritical: boolean;
  sealHash: string;
  activityCode: string;
  activity_code: string;
  injectedDelayDays: number;
  injected_delay_days: number;
  totalFloatDays: number;
  total_float_days: number;
  absorbedByFloatDays: number;
  absorbed_by_float_days: number;
  netExtensionDays: number;
  net_extension_days: number;
  criticalPathShifted: boolean;
  critical_path_shifted: boolean;
  hudsonProlongationInr: number;
  hudson_prolongation_inr: number;
  verdict: string;
  clauseRef: string;
}

function addDaysIso(baseIso: string, days: number): string {
  const d = new Date(baseIso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function buildCanonicalCpmFallback(): CpmActivityRecord[] {
  const baselineStart = "2026-05-01";
  return computeVanguardCpmNetwork().map((t) => ({
    id: `${VANGUARD_GENOME.projectId}-${t.wbsId}`,
    project_id: VANGUARD_GENOME.projectId,
    activity_code: t.wbsId,
    wbs_code: t.wbsId,
    wbs_element: `${t.bitId} • ${t.name}`,
    bit_id: t.bitId,
    activity_name: t.name,
    planned_start: addDaysIso(baselineStart, t.earlyStart),
    planned_finish: addDaysIso(baselineStart, t.earlyFinish),
    duration_days: t.durationDays,
    predecessors: t.predecessors,
    early_start: t.earlyStart,
    early_finish: t.earlyFinish,
    late_start: t.lateStart,
    late_finish: t.lateFinish,
    total_float: t.totalFloat,
    total_float_days: t.totalFloat,
    free_float: t.freeFloat,
    is_critical: t.isCritical,
    is_critical_path: t.isCritical,
    delay_variance_days: 0,
    percent_complete: t.percentComplete,
    budget_cr: t.budgetCr,
  }));
}

export async function fetchCpmActivities(
  projectId: string = VANGUARD_GENOME.projectId
): Promise<CpmActivityRecord[]> {
  const fallback = buildCanonicalCpmFallback();

  try {
    const { data, error } = await supabase
      .from("cpm_schedule_activities")
      .select("*")
      .eq("project_id", projectId)
      .order("early_start", { ascending: true });

    if (error || !data || data.length === 0) {
      return fallback;
    }

    return (data as any[]).map((row, idx) => {
      const fb = fallback[idx] || fallback[0];
      const tf = Number(row.total_float_days ?? row.total_float ?? fb.total_float_days);
      const crit = Boolean(row.is_critical_path ?? row.is_critical ?? tf <= 0);
      return {
        ...fb,
        ...row,
        activity_code: row.activity_code || row.wbs_code || fb.activity_code,
        wbs_code: row.wbs_code || row.activity_code || fb.wbs_code,
        wbs_element: row.wbs_element || fb.wbs_element,
        planned_start: row.planned_start || fb.planned_start,
        planned_finish: row.planned_finish || fb.planned_finish,
        total_float: tf,
        total_float_days: tf,
        is_critical: crit,
        is_critical_path: crit,
        delay_variance_days: Number(row.delay_variance_days ?? 0),
      };
    });
  } catch {
    return fallback;
  }
}

export async function evaluateTimeImpactAnalysis(
  ...args: any[]
): Promise<TimeImpactAnalysisResult> {
  // Supports 2-arg (activityCode, delayDays), 3-arg (projectId, activityCode, delayDays),
  // 4-arg (projectId, activityCode, currentFloat, delayDays), and 5-arg (+ reason) calls
  const projectId =
    args.length >= 3 && typeof args[0] === "string"
      ? args[0]
      : VANGUARD_GENOME.projectId;
  const activityCode =
    args.length >= 2 && typeof args[1] === "string"
      ? args[1]
      : String(args[0] ?? "WBS-01");

  const numericArgs = args.filter((v): v is number => typeof v === "number" && !Number.isNaN(v));
  const delayDays = numericArgs.length > 0 ? numericArgs[numericArgs.length - 1] : 0;
  const reason =
    typeof args[args.length - 1] === "string" && args.length >= 4
      ? args[args.length - 1]
      : "SCL Time Impact Analysis Simulation";

  const activities = buildCanonicalCpmFallback();
  const baseTarget =
    activities.find(
      (a) => a.activity_code === activityCode || a.wbs_code === activityCode
    ) || activities[0];

  const priorFloat =
    numericArgs.length >= 2 ? numericArgs[0] : baseTarget.total_float_days;
  const absorbed = Math.min(Math.max(0, delayDays), Math.max(0, priorFloat));
  const postFloat = priorFloat - delayDays;
  const netExtension = Math.max(0, delayDays - Math.max(0, priorFloat));
  const shifted = postFloat <= 0;

  // Hudson prolongation overhead: 15% overhead over 1095 days on Rs 864.50 Cr EPC baseline
  const dailyOverheadInr = Math.round(
    (0.15 * (VANGUARD_GENOME.financials.epcBaselineCr * 1e7)) / 1095
  );
  const prolongationInr = dailyOverheadInr * netExtension;

  const updatedActivity: CpmActivityRecord = {
    ...baseTarget,
    project_id: projectId,
    total_float: postFloat,
    total_float_days: postFloat,
    is_critical: shifted,
    is_critical_path: shifted,
    delay_variance_days: delayDays,
    planned_finish: addDaysIso(baseTarget.planned_finish, netExtension),
  };

  const sealHash = crypto
    .createHash("sha256")
    .update(`${projectId}_${baseTarget.activity_code}_DELAY_${delayDays}_${reason}`)
    .digest("hex");

  return {
    success: true,
    data: updatedActivity,
    newFloat: postFloat,
    isCritical: shifted,
    sealHash,
    activityCode: baseTarget.activity_code,
    activity_code: baseTarget.activity_code,
    injectedDelayDays: delayDays,
    injected_delay_days: delayDays,
    totalFloatDays: postFloat,
    total_float_days: postFloat,
    absorbedByFloatDays: absorbed,
    absorbed_by_float_days: absorbed,
    netExtensionDays: netExtension,
    net_extension_days: netExtension,
    criticalPathShifted: shifted,
    critical_path_shifted: shifted,
    hudsonProlongationInr: prolongationInr,
    hudson_prolongation_inr: prolongationInr,
    verdict: shifted
      ? `CRITICAL PATH SHIFT: +${netExtension}d EOT entitlement under CPWD Clause 5 / SCL TIA`
      : `ABSORBED BY FLOAT: ${absorbed}d absorbed within ${priorFloat}d Total Float (0d EOT)`,
    clauseRef: "CPWD GCC Clause 5 & SCL Delay Protocol (2nd Ed.)",
  };
}
