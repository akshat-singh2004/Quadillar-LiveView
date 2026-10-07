"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import crypto from "crypto";

// ---------------------------------------------------------------------------
// Supabase Server Client Initializer
// ---------------------------------------------------------------------------

function getSupabaseClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
        process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceKey) {
        throw new Error(
            "Missing Supabase configuration: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables."
        );
    }

    return createClient(supabaseUrl, serviceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}

// ---------------------------------------------------------------------------
// Action: generateRABillFromMB
// ---------------------------------------------------------------------------

export async function generateRABillFromMB(
    projectId: string,
    explicitBillSequence?: number
) {
    try {
        if (!projectId) {
            return { success: false, error: "Validation Error: projectId is required." };
        }

        const supabase = getSupabaseClient();
        const timestamp = new Date().toISOString();

        // 1. Resolve Bill Sequence Number Dynamically if not supplied
        let billSequence = explicitBillSequence;
        if (!billSequence) {
            const { data: latestBill } = await supabase
                .from("running_account_bills")
                .select("bill_sequence_no")
                .eq("project_id", projectId)
                .order("bill_sequence_no", { ascending: false })
                .limit(1)
                .maybeSingle();

            billSequence = (latestBill?.bill_sequence_no || 0) + 1;
        }

        const billNumber = `RA-${String(billSequence).padStart(2, "0")}`;

        // 2. Fetch Unbilled & Verified Lines from electronic_measurement_book
        const { data: mbLines, error: mbError } = await supabase
            .from("electronic_measurement_book")
            .select(
                "id, net_quantity, sanctioned_rate_inr, total_amount_inr, trade_package, contractor_entity, contractor_name"
            )
            .eq("project_id", projectId)
            .is("linked_ra_bill_no", null)
            .eq("ae_test_checked", true);

        if (mbError) {
            return {
                success: false,
                error: `Database error querying Measurement Book: ${mbError.message}`,
            };
        }

        if (!mbLines || mbLines.length === 0) {
            return {
                success: false,
                error:
                    "Zero eligible measurements found. All lines are either already billed or pending Assistant Engineer (AE) 10% test-check verification.",
            };
        }

        // 3. Compute Real Contract Gross from Actual Field Measurements
        const calculatedCurrentGross = mbLines.reduce((acc, line) => {
            const lineTotal =
                Number(line.total_amount_inr) ||
                Number(line.net_quantity || 0) * Number(line.sanctioned_rate_inr || 0);
            return acc + lineTotal;
        }, 0);

        const primaryContractor =
            mbLines[0]?.contractor_name ||
            mbLines[0]?.contractor_entity ||
            "Lead EPC Contractor";
        const primaryTrade = mbLines[0]?.trade_package || "Civil & Superstructure";

        // 4. Fetch Previous Billed Cumulative Value
        const { data: previousBills } = await supabase
            .from("running_account_bills")
            .select("gross_work_done")
            .eq("project_id", projectId)
            .lt("bill_sequence_no", billSequence);

        const previousCumulativeGross = (previousBills || []).reduce(
            (acc, b) => acc + Number(b.gross_work_done || 0),
            0
        );

        // 5. Fetch Active Unresolved Quality Withholdings (quality_ncr_register)
        let totalNcrWithholding = 0;
        const linkedNcrCodes: string[] = [];

        const { data: openNcrs } = await supabase
            .from("quality_ncr_register")
            .select("ncr_number, withholding_amount_inr, status")
            .eq("project_id", projectId)
            .neq("status", "CLOSED");

        if (openNcrs && openNcrs.length > 0) {
            openNcrs.forEach((ncr) => {
                totalNcrWithholding += Number(ncr.withholding_amount_inr || 0);
                if (ncr.ncr_number) linkedNcrCodes.push(ncr.ncr_number);
            });
        }

        // 6. Check Quality & Concrete Strength Hold Gates
        let concreteCubesPassed = true;
        let qualityGatePassed = true;

        // Check failed concrete cube breaks for this project
        const { data: failedCubes } = await supabase
            .from("concrete_cube_tests")
            .select("id")
            .eq("project_id", projectId)
            .eq("status", "STRENGTH_DEFICIT_REJECTED")
            .limit(1);

        if (failedCubes && failedCubes.length > 0) {
            concreteCubesPassed = false;
        }

        if (openNcrs && openNcrs.some((n) => n.status === "OPEN_STRUCTURAL_HOLD")) {
            qualityGatePassed = false;
        }

        // 7. Material Reconciliation Variance Debits (CPWD Clause 42)
        let materialReconciliationDebits = 0;
        const { data: reconciliations } = await supabase
            .from("material_reconciliations")
            .select("recovery_unit_rate, actual_issued_quantity, theoretical_quantity")
            .eq("project_id", projectId);

        if (reconciliations && reconciliations.length > 0) {
            materialReconciliationDebits = reconciliations.reduce((acc, rec) => {
                const variance =
                    Number(rec.actual_issued_quantity || 0) -
                    Number(rec.theoretical_quantity || 0);
                if (variance > 0) {
                    return acc + variance * Number(rec.recovery_unit_rate || 0);
                }
                return acc;
            }, 0);
        }

        // 8. Mobilization Advance Recovery Calculation (subcontractor_advances)
        let mobAdvanceRecovery = 0;
        const { data: activeAdvance } = await supabase
            .from("subcontractor_advances")
            .select("id, original_advance_inr, total_recovered_inr, recovery_deduction_rate_pct")
            .eq("project_id", projectId)
            .eq("status", "AMORTIZING")
            .limit(1)
            .maybeSingle();

        if (activeAdvance) {
            const outstanding =
                Number(activeAdvance.original_advance_inr || 0) -
                Number(activeAdvance.total_recovered_inr || 0);
            const ratePct = Number(activeAdvance.recovery_deduction_rate_pct || 10) / 100;
            const scheduledDeduction = calculatedCurrentGross * ratePct;
            mobAdvanceRecovery = Math.min(outstanding, Math.round(scheduledDeduction));
        } else {
            // Default standard 10% mobilization amortization
            mobAdvanceRecovery = Math.round(calculatedCurrentGross * 0.10);
        }

        // 9. Statutory Deductions Stack (CPWD Standard Schedule)
        const retention = Math.round(calculatedCurrentGross * 0.05); // 5% Retention (CPWD Cl. 1A)
        const bocwCess = Math.round(calculatedCurrentGross * 0.01); // 1% BOCW Welfare Cess Act 1996
        const gstTds = Math.round(calculatedCurrentGross * 0.02); // 2% TDS under GST Section 51
        const itTds = Math.round(calculatedCurrentGross * 0.02); // 2% TDS under Income Tax Sec 194C

        const totalStatutoryDeductions =
            retention +
            bocwCess +
            gstTds +
            itTds +
            mobAdvanceRecovery +
            totalNcrWithholding +
            materialReconciliationDebits;

        const netPayable = Math.max(0, calculatedCurrentGross - totalStatutoryDeductions);

        // 10. Generate Server-Side Cryptographic Checksum (Section 65B Audit Trail)
        const deedPayload = `${projectId}|${billNumber}|${calculatedCurrentGross}|${netPayable}|${timestamp}`;
        const sha256DeedHash = crypto
            .createHash("sha256")
            .update(deedPayload)
            .digest("hex");

        // 11. Upsert into Primary Ledger (running_account_bills)
        const { data: bill, error: billError } = await supabase
            .from("running_account_bills")
            .upsert(
                {
                    project_id: projectId,
                    ra_bill_number: billNumber,
                    bill_sequence_no: billSequence,
                    gross_work_done: calculatedCurrentGross,
                    gross_valuation: calculatedCurrentGross,
                    retention_amount: retention,
                    mobilization_advance_recovery: mobAdvanceRecovery,
                    labour_cess_amount: bocwCess,
                    tds_gst_inr: gstTds,
                    tds_amount: itTds,
                    ncr_backcharges_inr: totalNcrWithholding,
                    net_payable_certified: netPayable,
                    sha256_deed_hash: sha256DeedHash,
                    status: "DRAFT_SUBMITTED",
                    created_at: timestamp,
                },
                { onConflict: "project_id,ra_bill_number" }
            )
            .select()
            .single();

        if (billError) {
            return {
                success: false,
                error: `Database error inserting running_account_bills: ${billError.message}`,
            };
        }

        // 12. Concurrently Upsert into Secondary ra_bills Table for Unified Compatibility
        await supabase.from("ra_bills").upsert(
            {
                project_id: projectId,
                bill_number: billNumber,
                contractor_name: primaryContractor,
                trade_package: primaryTrade,
                scheduled_value_inr: calculatedCurrentGross,
                previous_billed_inr: previousCumulativeGross,
                current_work_completed_inr: calculatedCurrentGross,
                stored_materials_inr: 0.0,
                retainage_rate: 0.05,
                retainage_amount_inr: retention,
                labor_cess_inr: bocwCess,
                advance_recovery_inr: mobAdvanceRecovery,
                ncr_debit_recovery_inr: totalNcrWithholding,
                linked_ncr_codes: linkedNcrCodes,
                net_payable_inr: netPayable,
                status: "Draft",
                quality_gate_passed: qualityGatePassed,
                concrete_cubes_passed: concreteCubesPassed,
                period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                period_end: new Date().toISOString().split("T")[0],
                created_at: timestamp,
                updated_at: timestamp,
            },
            { onConflict: "id" }
        );

        // 13. Freeze Measured Lines in electronic_measurement_book
        const lineIds = mbLines.map((l) => l.id);
        await supabase
            .from("electronic_measurement_book")
            .update({
                linked_ra_bill_no: billNumber,
                status: "BILLED",
            })
            .in("id", lineIds);

        // 14. Append Sealed Transaction to immutable_audit_logs (All NOT-NULL Columns Satisfied)
        await supabase.from("immutable_audit_logs").insert({
            project_id: projectId,
            action_title: `Generated Running Account Bill ${billNumber}`,
            details: `Frozen ${mbLines.length} E-MB lines. Gross: ₹${calculatedCurrentGross.toFixed(
                2
            )}, Statutory Deductions: ₹${totalStatutoryDeductions.toFixed(
                2
            )}, Net Payable: ₹${netPayable.toFixed(2)}.`,
            signatory_name: "Chief Quantity Surveyor",
            signatory_role: "Lead Billing Engineer",
            action_category: "COMMERCIAL_BILLING_FREEZE",
            module_ref: billNumber,
            ip_fingerprint: `SHA256:${sha256DeedHash}`,
            status: "SEALED",
            severity: "verified",
            created_at: timestamp,
        });

        // 15. Invalidate Stale Client Views
        revalidatePath("/finance/ra-bills");
        revalidatePath("/finance/measurement-book");
        revalidatePath("/finance/ipc");
        revalidatePath("/reports/audit");
        revalidatePath("/");

        return {
            success: true,
            bill,
            sha256DeedHash,
            linesBilledCount: mbLines.length,
            netPayable,
            grossWorkDone: calculatedCurrentGross,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error";
        return { success: false, error: message };
    }
}