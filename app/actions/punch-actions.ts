"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";
import { AegisAgent } from "@/lib/agents/aegis";

export interface PunchItemRecord {
  id: string;
  project_id: string;
  ticket_id: string;
  location_room: string;
  trade_discipline: string;
  defect_description: string;
  severity_tier: "CATEGORY_A" | "CATEGORY_B" | "CATEGORY_C";
  evidence_status: string;
  subcontractor_name: string;
  status: "OPEN" | "RECTIFIED" | "CLOSED";
  reported_by: string;
  target_rectification_date?: string;
  closure_date?: string;
  created_at: string;
}

export interface CreateSnagInput {
  projectId: string;
  locationRoom: string;
  tradeDiscipline: string;
  defectDescription: string;
  severityTier: "CATEGORY_A" | "CATEGORY_B" | "CATEGORY_C";
  assignedSubcontractor: string;
  reportedBy?: string;
  ifcGuid?: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function fetchPunchListItems(projectId: string): Promise<PunchItemRecord[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("punch_list_items")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[PUNCH ACTION] Fetch error:", error.message);
      return [];
    }
    return (data as PunchItemRecord[]) || [];
  } catch {
    return [];
  }
}

export async function logSnagTicket(input: CreateSnagInput) {
  try {
    const supabase = getSupabase();
    const timestamp = new Date().toISOString();
    const ticketId = `SNG-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const targetDate = new Date(
      Date.now() + (input.severityTier === "CATEGORY_A" ? 2 : 7) * 86400000
    ).toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("punch_list_items")
      .insert({
        project_id: input.projectId,
        ticket_id: ticketId,
        location_room: input.locationRoom,
        trade_discipline: input.tradeDiscipline,
        defect_description: input.defectDescription,
        severity_tier: input.severityTier,
        evidence_status: "LOGGED_WITHOUT_PHOTOS",
        subcontractor_name: input.assignedSubcontractor,
        status: "OPEN",
        reported_by: input.reportedBy || "PMC Snagging Inspector",
        target_rectification_date: targetDate,
        ifc_guid: input.ifcGuid || null,
        created_at: timestamp,
      })
      .select()
      .single();

    if (error) throw error;

    // If Category A, engage Aegis to lock geometry and notify Midas
    if (input.severityTier === "CATEGORY_A") {
      await AegisAgent.issueNCR({
        projectId: input.projectId,
        title: `Critical Category A Snag: ${ticketId} at ${input.locationRoom}`,
        description: input.defectDescription,
        severity: "CRITICAL",
        structuralGrid: input.locationRoom,
        ifcGuid: input.ifcGuid,
        statutoryClause: "FIDIC Cl. 11.2 / CPWD Sec. 20 (Defect Withholding Gate)",
        withholdingAmountInr: 75000,
        contractorName: input.assignedSubcontractor,
        tradePackage: input.tradeDiscipline,
        issuedByName: input.reportedBy || "PMC Snagging Inspector",
      });
    }

    // Seal audit trail via Hermes
    await HermesAgent.notarizeTransaction({
      projectId: input.projectId,
      actionTitle: `Logged Snag Ticket: ${ticketId} [${input.severityTier}]`,
      actionCategory: "QUALITY_SNAG_LOGGED",
      moduleRef: ticketId,
      details: { ticketId, ...input },
      signatoryName: input.reportedBy || "Lead Handover Architect",
      signatoryRole: "Commissioning & Handover Auditor",
      severity: input.severityTier === "CATEGORY_A" ? "critical" : "warning",
    });

    revalidatePath("/site/punch-list");
    revalidatePath("/handover/punch-list");
    revalidatePath("/dashboard");

    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to log defect ticket.";
    return { success: false, error: message };
  }
}

export async function updateSnagStatus(
  snagId: string,
  projectId: string,
  ticketId: string,
  nextStatus: "RECTIFIED" | "CLOSED"
) {
  try {
    const supabase = getSupabase();
    const timestamp = new Date().toISOString();

    const updatePayload: Record<string, unknown> = {
      status: nextStatus,
      updated_at: timestamp,
    };

    if (nextStatus === "CLOSED") {
      updatePayload.closure_date = timestamp.slice(0, 10);
    }

    const { error } = await supabase
      .from("punch_list_items")
      .update(updatePayload)
      .eq("id", snagId);

    if (error) throw error;

    await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: `Snag ${ticketId} Status -> ${nextStatus}`,
      actionCategory: "QUALITY_SNAG_CLOSED",
      moduleRef: ticketId,
      details: { snagId, ticketId, nextStatus },
      signatoryName: "Er. S. P. Verma",
      signatoryRole: "Resident SEOR / Consultant",
      severity: nextStatus === "CLOSED" ? "verified" : "warning",
    });

    revalidatePath("/site/punch-list");
    revalidatePath("/handover/punch-list");
    revalidatePath("/dashboard");

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update defect status.";
    return { success: false, error: message };
  }
}

export async function sanctionTakingOverCertificate(projectId: string, projectName: string) {
  try {
    const supabase = getSupabase();

    // HARD STATUTORY GATE: Ensure zero unresolved Category A snags
    const { data: openCatA, error: checkError } = await supabase
      .from("punch_list_items")
      .select("ticket_id")
      .eq("project_id", projectId)
      .eq("severity_tier", "CATEGORY_A")
      .neq("status", "CLOSED");

    if (checkError) throw checkError;

    if (openCatA && openCatA.length > 0) {
      return {
        success: false,
        error: `TOC ISSUANCE BLOCKED: ${openCatA.length} Category A critical defect(s) unresolved. FIDIC Cl. 11.2 mandates zero critical defects before Taking-Over Certificate sanction.`,
      };
    }

    const timestamp = new Date().toISOString();
    const tocRef = `TOC-${projectId}-SANCTIONED`;

    await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: `Taking-Over Certificate (TOC) Sanctioned: ${projectName}`,
      actionCategory: "HANDOVER_TOC_SANCTION",
      moduleRef: tocRef,
      details: { tocRef, projectName },
      signatoryName: "Ar. Akshat Singh Rathore",
      signatoryRole: "Principal Architect & SEOR",
      severity: "verified",
    });

    revalidatePath("/handover/punch-list");
    revalidatePath("/dashboard");

    return { success: true, tocRef, timestamp };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to sanction TOC.";
    return { success: false, error: message };
  }
}
