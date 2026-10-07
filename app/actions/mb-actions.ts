"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface MBEntryRecord {
  id: string;
  project_id: string;
  item_code: string;
  description: string;
  multiplier: number;
  length_m: number;
  breadth_m: number;
  depth_m: number;
  computed_quantity: number;
  unit: string;
  is_verified: boolean;
  created_at: string;
}

export async function fetchMBEntries(projectId: string): Promise<MBEntryRecord[]> {
  if (!projectId) return [];

  const supabase = await createClient();

  // Querying the correct table and using SQL aliases to match the frontend types
  const { data, error } = await supabase
    .from("digital_measurement_book_entries")
    .select(`
      id,
      project_id,
      item_code:boq_item_ref,
      description:entry_description,
      multiplier:multiplier_count,
      length_m:length_meters,
      breadth_m:breadth_meters,
      depth_m:depth_height_meters,
      computed_quantity:measured_quantity,
      unit:unit_of_measure,
      is_verified:consultant_qs_verified,
      created_at
    `)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[MB ACTION] Error fetching MB entries:", error.message);
    return [];
  }

  return (data as MBEntryRecord[]) || [];
}

export async function recordMBEntry(formData: FormData): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized: Active session required." };
    }

    const projectId = formData.get("projectId") as string;
    const itemCode = (formData.get("itemCode") as string) || "CPWD-DSR";
    const description = formData.get("description") as string;
    const multiplier = parseFloat((formData.get("multiplier") as string) || "1");
    const lengthM = parseFloat((formData.get("lengthM") as string) || "0");
    const breadthM = parseFloat((formData.get("breadthM") as string) || "0");
    const depthM = parseFloat((formData.get("depthM") as string) || "0");
    const unit = (formData.get("unit") as string) || "cum";

    if (!projectId || !description) {
      return { success: false, error: "Missing required fields: Project ID and Description." };
    }

    // Calculate quantity based on unit matching frontend logic
    let qty = 0;
    const nos = multiplier > 0 ? multiplier : 1;
    const l = lengthM || 0;
    const b = breadthM > 0 ? breadthM : 1;
    const d = depthM > 0 ? depthM : 1;

    if (unit === "cum") {
      qty = nos * l * (breadthM || 1) * (depthM || 1);
    } else if (unit === "sqm") {
      qty = nos * l * (breadthM || 1);
    } else if (unit === "MT" || unit === "m") {
      qty = nos * l;
    } else {
      qty = nos * l * b * d;
    }

    const { error: insertError } = await supabase
      .from("digital_measurement_book_entries")
      .insert({
        project_id: projectId,
        boq_item_ref: itemCode,
        entry_description: description,
        multiplier_count: nos,
        length_meters: lengthM,
        breadth_meters: breadthM,
        depth_height_meters: depthM,
        unit_of_measure: unit,
        measured_quantity: parseFloat(qty.toFixed(3)),
        contractor_verified: true,
        consultant_qs_verified: false,
        status: "DRAFT"
      });

    if (insertError) {
      return { success: false, error: insertError.message };
    }

    revalidatePath("/finance/measurement-book");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Internal server error." };
  }
}

export async function verifyMBEntry(entryId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: "Unauthorized: Active session required." };
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("default_role")
      .eq("id", user.id)
      .maybeSingle();

    const userRole = profile?.default_role;

    const allowedRoles = [
      "principal_architect",
      "client_employer",
      "project_management_consultant",
      "pmc_lead",
    ];

    if (userRole && !allowedRoles.includes(userRole.toLowerCase())) {
      return {
        success: false,
        error:
          "Statutory Interlock: Check-measurement requires Principal Architect or Employer verification.",
      };
    }

    const { error: updateError } = await supabase
      .from("digital_measurement_book_entries")
      .update({
        consultant_qs_verified: true,
        status: "VERIFIED",
      })
      .eq("id", entryId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/finance/measurement-book");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Internal server error." };
  }
}