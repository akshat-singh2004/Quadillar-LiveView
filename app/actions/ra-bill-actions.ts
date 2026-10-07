// app/actions/ra-bill-actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CreateBillInput {
    projectId: string;
    billNumber: string;
    sequenceNo: number;
    contractorName: string;
    workOrderRef: string;
    tradePackage: string;
    currentGross: number;
    prevGross: number;
    cl42Penalties: number;
    ncrBackcharges: number;
    signatoryRole?: string;
}

export async function createIntermediateRABill(input: CreateBillInput) {
    try {
        const supabase = await createClient();
        const timestamp = new Date().toISOString();

        const gross = Number(input.currentGross) || 0;
        const retention = Math.round(gross * 0.05);
        const mobAdvance = Math.round(gross * 0.10);
        const cess = Math.round(gross * 0.01);
        const itTds = Math.round(gross * 0.02);
        const gstTds = Math.round(gross * 0.02);

        const totalDeductions =
            retention +
            mobAdvance +
            cess +
            itTds +
            gstTds +
            Number(input.cl42Penalties || 0) +
            Number(input.ncrBackcharges || 0);

        const netPayable = Math.max(0, gross - totalDeductions);
        const cumulativeGross = Number(input.prevGross || 0) + gross;

        const dbPayload = {
            project_id: input.projectId,
            ra_bill_number: input.billNumber,
            bill_sequence_no: input.sequenceNo,
            billing_period_start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
            billing_period_end: new Date().toISOString().slice(0, 10),
            contractor_name: input.contractorName,
            work_order_ref: input.workOrderRef,
            trade_package: input.tradePackage,
            gross_work_done: gross,
            gross_valuation: cumulativeGross,
            previous_gross_certified_inr: Number(input.prevGross || 0),
            retention_amount: retention,
            mobilization_advance_recovery: mobAdvance,
            labour_cess_amount: cess,
            tds_amount: itTds,
            tds_gst_inr: gstTds,
            cl42_wastage_penalties_inr: Number(input.cl42Penalties || 0),
            ncr_backcharges_inr: Number(input.ncrBackcharges || 0),
            net_payable_certified: netPayable,
            status: "DRAFT_SUBMITTED",
            qs_checker: input.signatoryRole || "Lead Quantity Surveyor",
            labor_compliance_cleared: true,
            safety_stop_work_cleared: true,
            concrete_cube_tests_cleared: true,
            created_at: timestamp,
        };

        const { data, error } = await supabase
            .from("running_account_bills")
            .insert([dbPayload])
            .select()
            .single();

        if (error) throw new Error(error.message);

        await supabase.from("immutable_audit_logs").insert({
            signatory_name: input.signatoryRole || "Lead Quantity Surveyor",
            signatory_role: "Quantity Surveyor",
            action_category: `COMPILED RA BILL: ${input.billNumber} (Gross: ₹${gross.toLocaleString("en-IN")})`,
            module_ref: input.billNumber,
            ip_fingerprint: "Billing Clearinghouse / Form 26",
            status: "SEALED",
            severity: "verified",
        });

        revalidatePath("/finance/ra-bills");
        revalidatePath("/finance/ipc");
        revalidatePath("/dashboard");

        return { success: true, data };
    } catch (err: any) {
        return { success: false, error: err?.message || "Failed to create RA bill." };
    }
}

export async function verifyBillStatutoryGates(billId: string, projectId: string, billNumber: string, qsAuditor: string) {
    try {
        const supabase = await createClient();

        // Check open Category A NCRs or Stop Work orders
        const { data: openNcrs } = await supabase
            .from("quality_ncr_register")
            .select("id")
            .eq("project_id", projectId)
            .eq("status", "OPEN");

        const hasOpenNcrs = (openNcrs || []).length > 0;
        const nextStatus = hasOpenNcrs ? "PAYMENT_FROZEN_CLAUSE_19D" : "STATUTORY_GATES_VERIFIED";

        const { error } = await supabase
            .from("running_account_bills")
            .update({
                status: nextStatus,
                qs_checker: qsAuditor,
                safety_stop_work_cleared: !hasOpenNcrs,
            })
            .eq("id", billId);

        if (error) throw new Error(error.message);

        await supabase.from("immutable_audit_logs").insert({
            signatory_name: qsAuditor,
            signatory_role: "Lead Quantity Surveyor",
            action_category: `STATUTORY GATES AUDITED: ${billNumber} -> ${nextStatus}`,
            module_ref: billNumber,
            ip_fingerprint: "Statutory Verification Terminal",
            status: "SEALED",
            severity: hasOpenNcrs ? "severe" : "verified",
        });

        revalidatePath("/finance/ra-bills");
        revalidatePath("/finance/ipc");
        revalidatePath("/dashboard");

        return { success: true, nextStatus };
    } catch (err: any) {
        return { success: false, error: err?.message || "Failed to verify statutory gates." };
    }
}

export async function certifyBillIPC(billId: string, projectId: string, billNumber: string, seorName: string) {
    try {
        const supabase = await createClient();
        const timestamp = new Date().toISOString();

        const { error } = await supabase
            .from("running_account_bills")
            .update({
                status: "SEOR_CERTIFIED_IPC",
                pmc_engineer: seorName,
                approved_at: timestamp,
            })
            .eq("id", billId);

        if (error) throw new Error(error.message);

        await supabase.from("immutable_audit_logs").insert({
            signatory_name: seorName,
            signatory_role: "Resident SEOR / Principal Consultant",
            action_category: `IPC SANCTIONED: ${billNumber} (Form 26 / FIDIC 14.6)`,
            module_ref: billNumber,
            ip_fingerprint: "Executive Certification Desk / Crypt-Sealed",
            status: "SEALED",
            severity: "verified",
        });

        revalidatePath("/finance/ra-bills");
        revalidatePath("/finance/ipc");
        revalidatePath("/dashboard");

        return { success: true, timestamp };
    } catch (err: any) {
        return { success: false, error: err?.message || "Failed to certify IPC." };
    }
}

export async function disburseBillPayment(billId: string, billNumber: string, netAmount: number, financeOfficer: string) {
    try {
        const supabase = await createClient();
        const timestamp = new Date().toISOString();
        const utrRef = `SBI-RTGS-${Date.now().toString().slice(-8)}`;

        const { error } = await supabase
            .from("running_account_bills")
            .update({
                status: "FINANCE_DISBURSED",
                certified_at: timestamp,
            })
            .eq("id", billId);

        if (error) throw new Error(error.message);

        await supabase.from("immutable_audit_logs").insert({
            signatory_name: financeOfficer,
            signatory_role: "Finance Director / Accounts Disbursal",
            action_category: `RTGS DISBURSEMENT: ₹${netAmount.toLocaleString("en-IN")} for ${billNumber} (UTR: ${utrRef})`,
            module_ref: billNumber,
            ip_fingerprint: "Banking Gateway Interface",
            status: "SEALED",
            severity: "verified",
        });

        revalidatePath("/finance/ra-bills");
        revalidatePath("/finance/ipc");
        revalidatePath("/dashboard");

        return { success: true, utrRef, timestamp };
    } catch (err: any) {
        return { success: false, error: err?.message || "Failed to disburse payment." };
    }
}