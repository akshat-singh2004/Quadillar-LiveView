"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { ConcreteMaturityEngine } from "@/lib/engineering/maturity-engine";
import { HermesAgent } from "@/lib/agents/hermes";

export interface PairNodePayload {
  projectId: string;
  nodeTag: string;
  structuralElement: string;
  gridLocation: string;
  mixDesignGrade: string;
  targetFckMpa: number;
  elementType: "VERTICAL_WALL_COL" | "SLAB_SOFFIT" | "BEAM_SOFFIT_PROPS" | "LONG_SPAN_OVER_6M";
  pourTimestamp?: string;
}

export interface LogReadingPayload {
  projectId: string;
  nodeId: string;
  hoursSincePour: number;
  coreTempC: number;
  surfaceTempC: number;
  ambientTempC: number;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Maturity actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function pairSacrificialNode(payload: PairNodePayload) {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("concrete_maturity_nodes")
      .insert({
        project_id: payload.projectId,
        node_tag: payload.nodeTag,
        structural_element: payload.structuralElement,
        grid_location: payload.gridLocation,
        mix_design_grade: payload.mixDesignGrade,
        target_fck_mpa: payload.targetFckMpa,
        element_type: payload.elementType,
        pour_timestamp: payload.pourTimestamp || new Date().toISOString(),
        status: "ACTIVE_LOGGING",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Sacrificial Thermocouple Paired: ${payload.nodeTag} (${payload.gridLocation})`,
      actionCategory: "CONCRETE_MATURITY_NODE_PAIRED",
      moduleRef: String(data.id),
      details: { ...payload } as Record<string, unknown>,
      signatoryName: "Agent Daedalus (Thermal Governor)",
      signatoryRole: "Autonomous Concrete Technologist",
      severity: "info",
    });

    revalidatePath("/engineering/concrete-maturity");
    revalidatePath("/quality/pour-cards");
    revalidatePath("/");

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to pair thermocouple node." };
  }
}

export async function logThermocoupleReading(payload: LogReadingPayload) {
  try {
    const supabase = getSupabase();

    // 1. Fetch node parameters
    const { data: node, error: nodeError } = await supabase
      .from("concrete_maturity_nodes")
      .select("*")
      .eq("id", payload.nodeId)
      .single();

    if (nodeError || !node) throw new Error("Node not found.");

    // 2. Compute maturity & stripping gate
    const evalResult = ConcreteMaturityEngine.evaluateStrippingGate({
      targetFckMpa: Number(node.target_fck_mpa || 35),
      elementType: node.element_type,
      coreTempC: payload.coreTempC,
      surfaceTempC: payload.surfaceTempC,
      ambientTempC: payload.ambientTempC,
      hoursSincePour: payload.hoursSincePour,
    });

    // 3. Commit reading
    const { data: reading, error: readingError } = await supabase
      .from("concrete_maturity_readings")
      .insert({
        project_id: payload.projectId,
        node_id: payload.nodeId,
        hours_since_pour: payload.hoursSincePour,
        core_temp_c: payload.coreTempC,
        surface_temp_c: payload.surfaceTempC,
        ambient_temp_c: payload.ambientTempC,
        maturity_index: evalResult.maturityIndexCdegHours,
        estimated_strength_mpa: evalResult.estimatedStrengthMpa,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (readingError) throw readingError;

    // 4. Update node status if stripping authorized
    if (evalResult.strippingPermitted) {
      await supabase
        .from("concrete_maturity_nodes")
        .update({ status: "STRIPPING_AUTHORIZED" })
        .eq("id", payload.nodeId);

      await HermesAgent.notarizeTransaction({
        projectId: payload.projectId,
        actionTitle: `Formwork Stripping Clearance Issued: Node ${node.node_tag} (${evalResult.estimatedStrengthMpa} MPa)`,
        actionCategory: "FORMWORK_STRIPPING_PERMIT_GRANTED",
        moduleRef: String(payload.nodeId),
        details: { evalResult, node },
        signatoryName: "Agent Daedalus (Thermal Governor)",
        signatoryRole: "Autonomous Concrete Technologist",
        severity: "verified",
      });
    }

    revalidatePath("/engineering/concrete-maturity");
    revalidatePath("/");

    return { success: true, reading, evalResult };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to commit telemetry reading." };
  }
}
