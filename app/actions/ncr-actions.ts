"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import {
    AegisAgent,
    NCRIssuancePayload,
    SpatialLockoutCheckResult,
} from "@/lib/agents/aegis";

// ---------------------------------------------------------------------------
// Supabase Client Initializer (Direct Action Queries)
// ---------------------------------------------------------------------------

function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
        throw new Error(
            "NCR-ACTIONS FATAL: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing."
        );
    }

    return createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
}

// ---------------------------------------------------------------------------
// Action: submitNCRRecord
// Mandate: Issue statutory Non-Conformance Report, place 3D BIM & grid lock,
// attach Midas commercial withholding lien, and hash via Hermes Section 65B.
// ---------------------------------------------------------------------------

export async function submitNCRRecord(payload: NCRIssuancePayload) {
    try {
        if (!payload.projectId) {
            return { success: false, error: "Validation Error: projectId is mandatory." };
        }

        if (!payload.title?.trim() || !payload.description?.trim()) {
            return {
                success: false,
                error: "Validation Error: Non-conformance Title and Description are mandatory.",
            };
        }

        // 1. Delegate spatial lockdown, lien attachment, and hashing to Agent Aegis & Hermes
        const result = await AegisAgent.issueNCR({
            projectId: payload.projectId,
            title: payload.title.trim(),
            description: payload.description.trim(),
            severity: payload.severity || "MAJOR",
            structuralGrid: payload.structuralGrid?.trim() || undefined,
            ifcGuid: payload.ifcGuid?.trim() || undefined,
            statutoryClause: payload.statutoryClause?.trim() || "IS 456 Cl. 26.4 / CPWD Cl. 14",
            withholdingAmountInr: Number(payload.withholdingAmountInr) || 0,
            contractorName: payload.contractorName || "Lead EPC Contractor",
            tradePackage: payload.tradePackage || "Civil & Structural",
            issuedByName: payload.issuedByName || "Aegis Sentinel / Resident QA Lead",
            evidence: payload.evidence,
        });

        if (!result.success) {
            return { success: false, error: result.error || "Aegis failed to issue NCR." };
        }

        // 2. Invalidate dependent application caches
        revalidatePath("/quality/ncr");
        revalidatePath("/quality");
        revalidatePath("/finance/ra-bills");
        revalidatePath("/finance/measurement-book");
        revalidatePath("/finance/ipc");
        revalidatePath("/site/digital-twin");
        revalidatePath("/");

        return {
            success: true,
            ncrId: result.ncrId,
            ncrNumber: result.ncrNumber,
            spatialLocked: result.spatialLocked,
            financialLienInr: result.financialLienInr,
            cryptographicHash: result.cryptographicHash,
            auditBlockId: result.auditBlockId,
        };
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "Internal error while registering statutory NCR.";
        return { success: false, error: message };
    }
}

// ---------------------------------------------------------------------------
// Action: closeNCRRecord
// Mandate: Sign off rectification, release 3D BIM lock, and lift Midas billing lien.
// ---------------------------------------------------------------------------

export async function closeNCRRecord(params: {
    projectId: string;
    ncrId: string;
    ncrNumber: string;
    closingEngineerName: string;
    rectificationMethod: string;
}) {
    try {
        if (!params.projectId || !params.ncrId || !params.ncrNumber) {
            return { success: false, error: "Validation Error: Missing NCR reference keys." };
        }

        if (!params.rectificationMethod?.trim()) {
            return {
                success: false,
                error: "Validation Error: Rectification and inspection sign-off description is required.",
            };
        }

        // Delegate closure and spatial release to Aegis & Hermes
        const result = await AegisAgent.closeNCR({
            projectId: params.projectId,
            ncrId: params.ncrId,
            ncrNumber: params.ncrNumber,
            closingEngineerName: params.closingEngineerName || "Superintending Engineer / SEOR",
            rectificationMethod: params.rectificationMethod.trim(),
        });

        // Revalidate quality and finance ledgers
        revalidatePath("/quality/ncr");
        revalidatePath("/quality");
        revalidatePath("/finance/ra-bills");
        revalidatePath("/finance/measurement-book");
        revalidatePath("/site/digital-twin");
        revalidatePath("/");

        return { success: true, auditBlockId: result.auditBlockId };
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "Internal error while releasing NCR hold.";
        return { success: false, error: message };
    }
}

// ---------------------------------------------------------------------------
// Action: checkSpatialHoldStatus
// Mandate: Query if an IFC GUID or Structural Grid is blocked before executing
// pour cards, stripping formwork, or certifying measurements.
// ---------------------------------------------------------------------------

export async function checkSpatialHoldStatus(
    projectId: string,
    ifcGuid?: string,
    locationGrid?: string
): Promise<SpatialLockoutCheckResult> {
    try {
        return await AegisAgent.checkSpatialLockout(projectId, ifcGuid, locationGrid);
    } catch (err: unknown) {
        console.error("Spatial lockout check failed:", err);
        return {
        isLocked: true,
        activeNcrCount: 1,
        reasons: ["System Interlock: Unable to verify geometry lockout status with Aegis."],
        ncrs: [],
        lockReason: "System Interlock: Unable to verify geometry lockout status with Aegis.",
      };
    }
}

// ---------------------------------------------------------------------------
// Action: getActiveNCRRegister
// Mandate: Direct server action to fetch all open/pending NCRs with financial liens
// and geofenced evidence for quality dashboards.
// ---------------------------------------------------------------------------

export async function getActiveNCRRegister(projectId: string) {
    try {
        const supabase = getSupabaseClient();

        const { data, error } = await supabase
            .from("quality_ncr_register")
            .select(
                `
        id,
        ncr_number,
        drawing_code,
        grid_location,
        severity,
        issue_description,
        corrective_action_required,
        withholding_amount_inr,
        status,
        ifc_guid,
        created_at,
        updated_at
      `
            )
            .eq("project_id", projectId)
            .order("created_at", { ascending: false });

        if (error) {
            return { success: false, error: error.message, data: [] };
        }

        return { success: true, data: data || [] };
    } catch (err: unknown) {
        const message =
            err instanceof Error ? err.message : "Failed to load project NCR register.";
        return { success: false, error: message, data: [] };
    }
}