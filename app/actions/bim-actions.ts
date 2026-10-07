"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";

export interface BimClashRecord {
  id: string;
  project_id: string;
  clash_code: string;
  grid_location: string;
  structural_element: string;
  mep_service_element: string;
  clash_category: "HARD_CLASH" | "CLEARANCE_BUFFER" | "SLEEVE_DEFICIT" | string;
  penetration_depth_mm: number;
  aabb_coordinates: {
    min: [number, number, number];
    max: [number, number, number];
  };
  seor_waiver_status: "UNAPPROVED_HOLD" | "SEOR_SLEEVED" | "REROUTED" | string;
  pour_card_lock_engaged: boolean;
  seor_signoff_hash?: string | null;
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

export async function fetchSpatialClashes(projectId = "GOMTI-NAGAR-PH1-FITOUT"): Promise<BimClashRecord[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("bim_spatial_clashes")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as BimClashRecord[];
  } catch (err: any) {
    console.error("[fetchSpatialClashes notice]:", err.message);
    return [];
  }
}

export async function resolveSpatialClash(
  clashId: string,
  resolution: "SEOR_SLEEVED" | "REROUTED",
  signatoryName = "Lead Structural Engineer (SEOR)",
  notes = "Approved reinforced pipe sleeve detail as per drawing S-402."
) {
  try {
    const supabase = getSupabase();

    // 1. Fetch target clash record
    const { data: clash, error: fetchErr } = await supabase
      .from("bim_spatial_clashes")
      .select("*")
      .eq("id", clashId)
      .single();

    if (fetchErr || !clash) throw new Error("Clash record not found.");

    // 2. Notarize SEOR waiver via Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId: clash.project_id,
      actionTitle: `3D Clash Resolved: ${clash.clash_code} (${resolution})`,
      actionCategory: "BIM_CLASH_SEOR_RELEASE",
      moduleRef: clash.clash_code,
      details: { clashId, resolution, notes, grid: clash.grid_location } as unknown as Record<string, unknown>,
      signatoryName,
      signatoryRole: "Structural Engineer of Record (SEOR)",
      severity: "verified",
    });

    // 3. Update clash status & lift pre-pour lockout
    const { data, error } = await supabase
      .from("bim_spatial_clashes")
      .update({
        seor_waiver_status: resolution,
        pour_card_lock_engaged: false,
        seor_signoff_hash: seal.blockHash,
      })
      .eq("id", clashId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/spatial/clashes");
    revalidatePath("/site/pour-cards");
    revalidatePath("/");

    return { success: true, data, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to resolve spatial clash." };
  }
}


export interface DetectClashPayload {
  projectId?: string;
  project_id?: string;
  clashCode?: string;
  clash_code?: string;
  gridLocation?: string;
  grid_location?: string;
  structuralElement?: string;
  structural_element?: string;
  mepServiceElement?: string;
  mep_service_element?: string;
  clashCategory?: string;
  clash_category?: string;
  penetrationDepthMm?: number;
  penetration_depth_mm?: number;
  aabbCoordinates?: any;
  aabb_coordinates?: any;
  [key: string]: any;
}

export async function detectAndLogBimClash(arg1: any, arg2?: any) {
  try {
    const supabase = getSupabase();
    let payload: DetectClashPayload = {};

    if (typeof arg1 === "object" && arg1 !== null) {
      payload = arg1;
    } else if (typeof arg2 === "object" && arg2 !== null) {
      payload = { ...arg2, projectId: typeof arg1 === "string" ? arg1 : arg2.projectId };
    }

    const projectId = payload.projectId || payload.project_id || "GOMTI-NAGAR-PH1-FITOUT";
    const clashCode = payload.clashCode || payload.clash_code || ("CLASH-" + Date.now().toString().slice(-6));
    const gridLocation = payload.gridLocation || payload.grid_location || "Grid SW-02 / Level-03 Core";
    const structuralMember = payload.structuralElement || payload.structural_element || "RC Transfer Beam TB-04";
    const mepService = payload.mepServiceElement || payload.mep_service_element || "HVAC Primary Supply Duct";
    const category = payload.clashCategory || payload.clash_category || "HARD_CLASH";
    const depth = Number(payload.penetrationDepthMm || payload.penetration_depth_mm || 120.0);
    const aabb = payload.aabbCoordinates || payload.aabb_coordinates || { min: [-2, 1, 0], max: [2, 3, 4] };

    const { data, error } = await supabase
      .from("bim_spatial_clashes")
      .insert({
        project_id: projectId,
        clash_code: clashCode,
        grid_location: gridLocation,
        structural_element: structuralMember,
        mep_service_element: mepService,
        clash_category: category,
        penetration_depth_mm: depth,
        aabb_coordinates: aabb,
        seor_waiver_status: "UNAPPROVED_HOLD",
        pour_card_lock_engaged: true,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.warn("[bim_spatial_clashes insert notice]:", error.message);
    }

    const seal = await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: "3D BIM Hard Clash Logged: " + clashCode + " (" + gridLocation + ")",
      actionCategory: "BIM_SPATIAL_COLLISION_LOGGED",
      moduleRef: clashCode,
      details: { clashCode, gridLocation, structuralMember, mepService, depth } as unknown as Record<string, unknown>,
      signatoryName: "Agent Minerva",
      signatoryRole: "Autonomous Spatial BIM Governor",
      severity: "critical",
    });

    if (data?.id) {
      await supabase
        .from("bim_spatial_clashes")
        .update({ seor_signoff_hash: seal.blockHash })
        .eq("id", data.id);
    }

    revalidatePath("/spatial/clashes");
    revalidatePath("/site/pour-cards");
    revalidatePath("/");

    return {
      success: true,
      data: data || { clash_code: clashCode, grid_location: gridLocation },
      clashCode,
      sealHash: seal.blockHash,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Failed to log 3D BIM spatial clash.",
    };
  }
}
