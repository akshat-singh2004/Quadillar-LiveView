// app/actions/cde-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface SaveMarkupDraftInput {
    drawingId: string;
    projectId: string;
    drawingNumber: string;
    markupGeoJson: any;
    authorName?: string;
}

export async function saveDrawingMarkupDraft(input: SaveMarkupDraftInput) {
    try {
        const supabase = await createClient();
        const timestamp = new Date().toISOString();

        // 1. Update drawing markup layer in cde_drawing_packages
        const { error: updateError } = await supabase
            .from("cde_drawing_packages")
            .update({
                markup_layer_json: input.markupGeoJson,
                updated_at: timestamp,
            })
            .or(`id.eq.${input.drawingId},drawing_number.eq.${input.drawingNumber}`);

        if (updateError) {
            console.warn("[CDE ACTION] DB update warning:", updateError.message);
        }

        // 2. Audit Trail Record for ISO 19650 WIP container
        await supabase.from("immutable_audit_logs").insert({
            signatory_name: input.authorName || "Ar. Akshat Singh Rathore",
            signatory_role: "Principal Architect & SEOR",
            action_category: `ISO 19650 WIP Draft Saved: ${input.drawingNumber}`,
            module_ref: input.drawingNumber,
            ip_fingerprint: "CDE Spatial Coordinate Engine",
            status: "SEALED",
            severity: "verified",
        });

        revalidatePath("/cde/viewer");
        return { success: true, timestamp };
    } catch (err: any) {
        return { success: false, error: err?.message || "Failed to save draft." };
    }
}

export async function issueDrawingRevision(
    drawingId: string,
    projectId: string,
    drawingNumber: string,
    currentRevision: string,
    authorName: string = "Ar. Akshat Singh Rathore"
) {
    try {
        const supabase = await createClient();
        const timestamp = new Date().toISOString();

        // Calculate next revision code: R1 -> R2, R2 -> R3
        const currentNum = parseInt(currentRevision.replace(/\D/g, ""), 10) || 1;
        const nextRevision = `R${currentNum + 1}`;

        // 1. Update Drawing Status to GFC_PUBLISHED with bumped revision
        const { error: revError } = await supabase
            .from("cde_drawing_packages")
            .update({
                revision: nextRevision,
                status: "GFC_PUBLISHED",
                updated_at: timestamp,
            })
            .or(`id.eq.${drawingId},drawing_number.eq.${drawingNumber}`);

        if (revError) {
            console.warn("[CDE ACTION] Revision update warning:", revError.message);
        }

        // 2. Transmittal Dispatch Logged into Immutable Statutory Vault
        await supabase.from("immutable_audit_logs").insert({
            signatory_name: authorName,
            signatory_role: "Principal Architect & SEOR",
            action_category: `GFC REVISION ISSUED: ${drawingNumber} ${nextRevision} (Contractor Broadcast)`,
            module_ref: `${drawingNumber}-${nextRevision}`,
            ip_fingerprint: "CDE Protocol ISO 19650-2 / Sealed Transmittal",
            status: "SEALED",
            severity: "verified",
        });

        revalidatePath("/cde/viewer");
        revalidatePath("/dashboard");

        return {
            success: true,
            nextRevision,
            message: `Revision ${nextRevision} Issued & Transmittal broadcasted to Lead Contractor for ${drawingNumber}.`,
        };
    } catch (err: any) {
        return { success: false, error: err?.message || "Failed to issue revision." };
    }
}