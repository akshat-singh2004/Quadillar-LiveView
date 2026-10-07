"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function dispatchIPCApplication(
    applicationId: string,
    payload: {
        gstin: string;
        bocwOrderNo: string;
        tanRef: string;
    }
) {
    try {
        const supabase = await createClient();
        const timestamp = new Date().toISOString();

        // 1. Update bill status in running_account_bills
        const { error: billError } = await supabase
            .from("running_account_bills")
            .update({
                status: "SEOR_CERTIFIED_IPC",
                pmc_engineer: "Ar. Akshat Singh Rathore",
                approved_at: timestamp,
            })
            .or(`ra_bill_number.eq.${applicationId},id.eq.${applicationId}`);

        if (billError) {
            console.error("[IPC ACTION] Bill update error:", billError.message);
        }

        // 2. Append to immutable audit trail if table exists
        await supabase.from("immutable_audit_logs").insert({
            signatory_name: "Ar. Akshat Singh Rathore",
            signatory_role: "Principal Architect & SEOR",
            action_category: `IPC ${applicationId} Sanctioned & Dispatched`,
            module_ref: applicationId,
            status: "SEALED",
            severity: "verified",
        });

        revalidatePath("/finance/ipc");
        revalidatePath("/finance/ra-bills");

        return { success: true, timestamp };
    } catch (err: any) {
        return { success: false, error: err?.message || "Internal server error" };
    }
}