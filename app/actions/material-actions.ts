"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { VulcanAgent } from "@/lib/agents/vulcan";
import { HermesAgent } from "@/lib/agents/hermes";

export interface ReconcileMaterialPayload {
  projectId: string;
  materialType: "STEEL" | "CEMENT";
  structuralElement: string;
  theoreticalQty: number;
  actualConsumedQty: number;
  stipulatedRateInr: number;
}

export interface OptimizeBbsPayload {
  projectId: string;
  structuralElement: string;
  barDiameterMm: number;
  cutLengthsM: number[];
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Material actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function reconcileMaterialConsumption(payload: ReconcileMaterialPayload) {
  try {
    const supabase = getSupabase();
    const reconciliationCode = `REC-${payload.materialType.slice(0, 3)}-${Date.now().toString().slice(-5)}`;

    // 1. Execute deterministic CPWD Cl. 42 evaluation via Vulcan Sub-Agent
    const evaluation = VulcanAgent.reconcileMaterials({
      material: payload.materialType,
      theoretical: payload.theoreticalQty,
      actual: payload.actualConsumedQty,
      rate: payload.stipulatedRateInr,
    });

    const permissibleVariationPct = payload.materialType === "STEEL" ? 3.0 : 2.0;
    const status = evaluation.isWithinTolerance
      ? "RECONCILED_WITHIN_TOLERANCE"
      : "PENAL_RECOVERY_DEBITED";

    // 2. Commit audit record to material_reconciliation_records
    const { data, error } = await supabase
      .from("material_reconciliation_records")
      .insert({
        project_id: payload.projectId,
        reconciliation_code: reconciliationCode,
        material_type: payload.materialType,
        structural_element: payload.structuralElement,
        theoretical_qty: payload.theoreticalQty,
        actual_consumed_qty: payload.actualConsumedQty,
        unit_of_measure: "MT",
        stipulated_rate_inr: payload.stipulatedRateInr,
        permissible_variation_pct: permissibleVariationPct,
        excess_consumption_qty: evaluation.excessQty,
        penal_recovery_inr: evaluation.penalDebitInr,
        status,
        reconciled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Cryptographic Section 65B Notarization via Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `CPWD Cl. 42 Reconciliation: ${reconciliationCode} [${payload.materialType}]`,
      actionCategory: "MATERIALS_CL42_RECONCILIATION",
      moduleRef: reconciliationCode,
      details: {
        payload,
        evaluation,
        penalDebitInr: evaluation.penalDebitInr,
      } as Record<string, unknown>,
      signatoryName: "Agent Vulcan (Metallurgy & Materials Governor)",
      signatoryRole: "Autonomous Materials Adjudicator",
      severity: evaluation.isWithinTolerance ? "verified" : "critical",
    });

    await supabase
      .from("material_reconciliation_records")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    revalidatePath("/materials/reconciliation");
    revalidatePath("/commercial/ra-bills");
    revalidatePath("/");

    return { success: true, data, evaluation, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reconcile materials." };
  }
}

export async function optimizeRebarCuttingSchedule(payload: OptimizeBbsPayload) {
  try {
    const supabase = getSupabase();
    const scheduleCode = `BBS-${payload.barDiameterMm}MM-${Date.now().toString().slice(-5)}`;

    // 1. Execute deterministic 1D nesting optimization via Vulcan Sub-Agent
    const nesting = VulcanAgent.optimizeRebarNesting(payload.cutLengthsM);

    // 2. Commit cutting schedule to rebar_cutting_schedules
    const { data, error } = await supabase
      .from("rebar_cutting_schedules")
      .insert({
        project_id: payload.projectId,
        schedule_code: scheduleCode,
        structural_element: payload.structuralElement,
        bar_diameter_mm: payload.barDiameterMm,
        cut_lengths_json: payload.cutLengthsM,
        stock_billet_length_m: 12.0,
        billets_required_count: nesting.billetsNeeded,
        total_waste_m: nesting.totalWasteM,
        salvaged_offcut_m: nesting.salvagedM,
        true_scrap_pct: nesting.trueScrapPct,
        is_compliant: nesting.isCompliant,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Cryptographic Section 65B Notarization via Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Rebar BBS 1D Nesting Certified: ${scheduleCode} (${nesting.billetsNeeded} Billets)`,
      actionCategory: "MATERIALS_REBAR_BBS_OPTIMIZED",
      moduleRef: scheduleCode,
      details: { payload, nesting } as Record<string, unknown>,
      signatoryName: "Agent Vulcan (Metallurgy & Materials Governor)",
      signatoryRole: "Autonomous Materials Adjudicator",
      severity: nesting.isCompliant ? "verified" : "warning",
    });

    await supabase
      .from("rebar_cutting_schedules")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    revalidatePath("/materials/reconciliation");
    revalidatePath("/");

    return { success: true, data, nesting, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to optimize rebar schedule." };
  }
}
