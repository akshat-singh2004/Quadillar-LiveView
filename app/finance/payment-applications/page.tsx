"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  PaymentApplicationManager,
  PaymentApplicationRecord,
} from "@/components/billing/PaymentApplicationManager";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { Loader2, Receipt } from "lucide-react";
import Link from "next/link";

export default function PaymentApplicationsPage() {
  const { project } = useActiveRole();
  const projectId = project?.id || "GOMTI-NAGAR-PH1-FITOUT";

  const [apps, setApps] = useState<PaymentApplicationRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadBills = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("running_account_bills")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const mapped: PaymentApplicationRecord[] = data.map((b: any) => ({
          id: String(b.id),
          project_id: b.project_id,
          bill_number: b.ra_bill_number || `RA-${b.bill_sequence_no || "01"}`,
          contractor_name: b.contractor_name || "Lead EPC Contractor",
          trade_package: b.trade_package || "General Civil & Structural",
          scheduled_value_inr: Number(b.gross_valuation || 0),
          previous_billed_inr: Number(b.previous_gross_certified_inr || 0),
          current_work_completed_inr: Number(b.gross_work_done || 0),
          stored_materials_inr: Number(b.stored_materials || 0),
          retainage_rate: 0.05,
          retainage_amount_inr: Number(b.retention_amount || 0),
          labor_cess_inr: Number(b.labour_cess_amount || 0),
          net_payable_inr: Number(b.net_payable_certified || 0),
          status:
            b.status === "FINANCE_DISBURSED"
              ? "Disbursed"
              : b.status === "SEOR_CERTIFIED_IPC"
              ? "Certified"
              : b.status === "STATUTORY_GATES_VERIFIED"
              ? "QS_Audited"
              : b.status === "PAYMENT_FROZEN_CLAUSE_19D"
              ? "Held"
              : "Draft",
          quality_gate_passed: Boolean(b.concrete_cube_tests_cleared ?? true),
          concrete_cubes_passed: Boolean(b.safety_stop_work_cleared ?? true),
          certified_by: b.pmc_engineer || null,
          certified_at: b.approved_at || null,
          created_at: b.created_at || new Date().toISOString(),
        }));
        setApps(mapped);
      } else {
        setApps([]);
      }
    } catch {
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadBills();
  }, [loadBills]);

  const handleStatusChange = async (
    id: string,
    nextStatus: PaymentApplicationRecord["status"]
  ) => {
    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a))
    );

    const dbStatus =
      nextStatus === "Disbursed"
        ? "FINANCE_DISBURSED"
        : nextStatus === "Certified"
        ? "SEOR_CERTIFIED_IPC"
        : nextStatus === "QS_Audited"
        ? "STATUTORY_GATES_VERIFIED"
        : nextStatus === "Held"
        ? "PAYMENT_FROZEN_CLAUSE_19D"
        : "DRAFT_SUBMITTED";

    await (supabase as any)
      .from("running_account_bills")
      .update({ status: dbStatus })
      .eq("id", id);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
          <span>COMMERCIAL VALUATION • CPWD CLAUSE 10CC / FIDIC CL. 14 • {projectId}</span>
        </div>
        <h1 className="text-xl font-bold text-white uppercase mt-0.5">
          Running Account Payment Applications &amp; Retainage Waterfall
        </h1>
        <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
          Five-stage deduction waterfall from verified joint measurements to bank disbursals.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-zinc-500 gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Synchronizing Running Account Bill Ledger...</span>
        </div>
      ) : apps.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center space-y-3">
          <Receipt className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-bold text-white uppercase">No Payment Applications Registered</h3>
          <p className="text-zinc-500 font-sans text-xs max-w-md mx-auto">
            Zero interim payment certificates exist for [{projectId}]. Freeze measurements in the e-MB ledger to generate Form 26 bills.
          </p>
          <div className="pt-2">
            <Link
              href="/finance/measurement-book"
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 uppercase font-bold text-xs rounded transition inline-block"
            >
              Open Measurement Book (e-MB)
            </Link>
          </div>
        </div>
      ) : (
        <PaymentApplicationManager
          applications={apps}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
}
