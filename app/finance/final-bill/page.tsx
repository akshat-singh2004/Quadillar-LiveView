"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Banknote,
  Boxes,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Flame,
  HardHat,
  Layers,
  Lock,
  MinusCircle,
  Percent,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Truck,
  Unlock,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type FinalBillStatus =
  | "DRAFT_SUBMITTED"
  | "AUDITED_BY_QS"
  | "DISCHARGE_VOUCHER_SIGNED"
  | "SEOR_CERTIFIED_FINAL"
  | "SETTLED_DISBURSED"
  | "DISPUTED_ARBITRATION_HOLD";

export interface FinalBillRecord {
  id: string;
  project_id: string;
  final_bill_number: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  toc_reference: string;
  original_contract_sum_inr: number;
  sanctioned_variations_total_inr: number;
  final_measured_gross_inr: number;
  total_previous_ra_gross_inr: number;
  gross_difference_payable_inr: number;
  stage_2_retention_released_inr: number;
  pbg_returned_to_contractor: boolean;
  terminal_unresolved_ncrs_debit_inr: number;
  terminal_cl42_penal_debit_inr: number;
  net_final_payable_inr: number;
  no_claims_declaration_signed: boolean;
  no_claims_signed_date?: string | null;
  discharge_voucher_ref?: string | null;
  status: FinalBillStatus;
  qs_auditor_name?: string | null;
  seor_signoff_name?: string | null;
  seor_signed_at?: string | null;
  finance_disbursed_at?: string | null;
  bank_utr_reference?: string | null;
  audit_notes?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function calculateFinalBillSettlement(
  finalMeasuredGross: number,
  previousRaGross: number,
  stage2Retention: number,
  terminalNcrs: number,
  terminalCl42: number
) {
  const grossDiff = Math.max(0, finalMeasuredGross - previousRaGross);
  const netPayable = Math.max(0, grossDiff + stage2Retention - terminalNcrs - terminalCl42);
  return { grossDiff, netPayable };
}

function normalizeFinalBill(d: any): FinalBillRecord {
  const finalMeasured = Number(d?.final_measured_gross_inr ?? 0);
  const prevGross = Number(d?.total_previous_ra_gross_inr ?? 0);
  const stage2 = Number(d?.stage_2_retention_released_inr ?? 0);
  const ncrs = Number(d?.terminal_unresolved_ncrs_debit_inr ?? 0);
  const cl42 = Number(d?.terminal_cl42_penal_debit_inr ?? 0);

  const calc = calculateFinalBillSettlement(finalMeasured, prevGross, stage2, ncrs, cl42);

  return {
    id: d?.id ?? `fb-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    final_bill_number: d?.final_bill_number ?? "FB-2026-01",
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    toc_reference: d?.toc_reference ?? "TOC-01",
    original_contract_sum_inr: Number(d?.original_contract_sum_inr ?? 0),
    sanctioned_variations_total_inr: Number(d?.sanctioned_variations_total_inr ?? 0),
    final_measured_gross_inr: finalMeasured,
    total_previous_ra_gross_inr: prevGross,
    gross_difference_payable_inr: Number(d?.gross_difference_payable_inr ?? calc.grossDiff),
    stage_2_retention_released_inr: stage2,
    pbg_returned_to_contractor: Boolean(d?.pbg_returned_to_contractor),
    terminal_unresolved_ncrs_debit_inr: ncrs,
    terminal_cl42_penal_debit_inr: cl42,
    net_final_payable_inr: Number(d?.net_final_payable_inr ?? calc.netPayable),
    no_claims_declaration_signed: Boolean(d?.no_claims_declaration_signed),
    no_claims_signed_date: d?.no_claims_signed_date ?? null,
    discharge_voucher_ref: d?.discharge_voucher_ref ?? null,
    status: (d?.status as FinalBillStatus) ?? "DRAFT_SUBMITTED",
    qs_auditor_name: d?.qs_auditor_name ?? null,
    seor_signoff_name: d?.seor_signoff_name ?? null,
    seor_signed_at: d?.seor_signed_at ?? null,
    finance_disbursed_at: d?.finance_disbursed_at ?? null,
    bank_utr_reference: d?.bank_utr_reference ?? null,
    audit_notes: d?.audit_notes ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalFinalBillPage() {
  const { project, role, tier } = useActiveRole();
  const [bills, setBills] = useState<FinalBillRecord[]>([]);
  const [selectedBill, setSelectedBill] = useState<FinalBillRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Lead Quantity Surveyor";
  const isFinanceOrConsultant =
    roleId === "QS_BILLING" ||
    roleId === "QS_BILLING_HEAD" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Finance") ||
    roleLabel.includes("Accounts") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Surveyor");

  // Form State for Preparing Final Bill
  const [billNo, setBillNo] = useState(`FB-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-01`);
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [tocRef, setTocRef] = useState(tier === "RESIDENTIAL" ? "TOC-RES-01" : "TOC-TWR-01");
  const [contractSum, setContractSum] = useState<number>(tier === "RESIDENTIAL" ? 2450000 : 85000000);
  const [variationsTotal, setVariationsTotal] = useState<number>(tier === "RESIDENTIAL" ? 167325 : 4440800);
  const [finalMeasuredGross, setFinalMeasuredGross] = useState<number>(tier === "RESIDENTIAL" ? 2617325 : 89440800);
  const [prevRaGross, setPrevRaGross] = useState<number>(tier === "RESIDENTIAL" ? 2450000 : 85000000);
  const [stage2Retention, setStage2Retention] = useState<number>(tier === "RESIDENTIAL" ? 65433 : 2236020);
  const [unresolvedNcrs, setUnresolvedNcrs] = useState<number>(0);
  const [cl42Penalties, setCl42Penalties] = useState<number>(0);
  const [auditNotes, setAuditNotes] = useState(
    tier === "RESIDENTIAL"
      ? "Terminal settlement for joinery package. All snags cleared, DLP concluded, and 100% measurement reconciliation sealed."
      : "Terminal settlement for Tower A superstructure. Clause 12 variations incorporated, 12-month DLP expired, and PBG bond released."
  );

  const loadFinalBills = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("contract_final_bills")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeFinalBill(d));
        setBills(normalized);
        if (!selectedBill) setSelectedBill(normalized[0]);
      } else {
        const defaults: FinalBillRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeFinalBill({
                  id: "fb-res-01",
                  project_id: projectId,
                  final_bill_number: "FB-RES-01",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  toc_reference: "TOC-RES-01",
                  original_contract_sum_inr: 2450000,
                  sanctioned_variations_total_inr: 167325,
                  final_measured_gross_inr: 2617325,
                  total_previous_ra_gross_inr: 2450000,
                  gross_difference_payable_inr: 167325,
                  stage_2_retention_released_inr: 65433,
                  pbg_returned_to_contractor: true,
                  terminal_unresolved_ncrs_debit_inr: 0,
                  terminal_cl42_penal_debit_inr: 0,
                  net_final_payable_inr: 232758,
                  no_claims_declaration_signed: true,
                  no_claims_signed_date: "2026-09-12",
                  discharge_voucher_ref: "DV-RES-JOINERY-FINAL",
                  status: "SEOR_CERTIFIED_FINAL",
                  qs_auditor_name: "Lead QS",
                  seor_signoff_name: "Principal Architect",
                  seor_signed_at: "2026-09-13T16:00:00Z",
                  audit_notes: "100% final measurement audited against e-MB Form 23. Discharged per FIDIC 14.12.",
                }),
              ]
            : [
                normalizeFinalBill({
                  id: "fb-twr-01",
                  project_id: projectId,
                  final_bill_number: "FB-TWR-01",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  toc_reference: "TOC-TWR-01",
                  original_contract_sum_inr: 85000000,
                  sanctioned_variations_total_inr: 4440800,
                  final_measured_gross_inr: 89440800,
                  total_previous_ra_gross_inr: 85000000,
                  gross_difference_payable_inr: 4440800,
                  stage_2_retention_released_inr: 2236020,
                  pbg_returned_to_contractor: true,
                  terminal_unresolved_ncrs_debit_inr: 0,
                  terminal_cl42_penal_debit_inr: 0,
                  net_final_payable_inr: 6676820,
                  no_claims_declaration_signed: true,
                  no_claims_signed_date: "2026-09-10",
                  discharge_voucher_ref: "DV-TWR-STR-FINAL-01",
                  status: "SEOR_CERTIFIED_FINAL",
                  qs_auditor_name: "Assistant Engineer (QS)",
                  seor_signoff_name: "Resident SEOR",
                  seor_signed_at: "2026-09-11T17:30:00Z",
                  audit_notes: "Defects Liability Period completed. Clause 12 variations reconciled. All snags verified closed.",
                }),
              ];

        setBills(defaults);
        if (!selectedBill) setSelectedBill(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedBill, tier]);

  useEffect(() => {
    void loadFinalBills();

    const channel = supabase
      .channel(`final_bills_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_final_bills" }, () => void loadFinalBills())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadFinalBills]);

  const summary = useMemo(() => {
    const totalBills = bills.length;
    const totalFinalGross = bills.reduce((sum, b) => sum + Number(b.final_measured_gross_inr || 0), 0);
    const totalNetDisbursed = bills
      .filter((b) => b.status === "SETTLED_DISBURSED" || b.status === "SEOR_CERTIFIED_FINAL")
      .reduce((sum, b) => sum + Number(b.net_final_payable_inr || 0), 0);
    const totalStage2RetentionReleased = bills
      .filter((b) => b.status === "SETTLED_DISBURSED" || b.status === "SEOR_CERTIFIED_FINAL")
      .reduce((sum, b) => sum + Number(b.stage_2_retention_released_inr || 0), 0);

    return { totalBills, totalFinalGross, totalNetDisbursed, totalStage2RetentionReleased };
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchStatus = filterStatus === "ALL" || b.status === filterStatus;
      const haystack = `${b.final_bill_number} ${b.contractor_name} ${b.work_order_ref} ${b.trade_package}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [bills, filterStatus, search]);

  // Stage 1: Execute Contractor No-Claims Discharge Declaration (FIDIC 14.12)
  const handleSignNoClaims = async (bill: FinalBillRecord) => {
    setActionInProgress(`discharge_${bill.id}`);

    const voucherCode = `DV-${bill.contractor_name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6)}-FINAL`;

    const updatePayload: Partial<FinalBillRecord> = {
      no_claims_declaration_signed: true,
      no_claims_signed_date: new Date().toISOString().slice(0, 10),
      discharge_voucher_ref: voucherCode,
      status: "DISCHARGE_VOUCHER_SIGNED",
    };

    try {
      await (supabase as any)
        .from("contract_final_bills")
        .update(updatePayload)
        .eq("id", bill.id);
    } catch {
      // Local optimistic update
    }

    setBills((prev) =>
      prev.map((b) => (b.id === bill.id ? ({ ...b, ...updatePayload } as FinalBillRecord) : b))
    );
    if (selectedBill && selectedBill.id === bill.id) {
      setSelectedBill((prev) => (prev ? ({ ...prev, ...updatePayload } as FinalBillRecord) : null));
    }

    setFeedbackMessage(`Unconditional No-Claims Discharge Voucher (${voucherCode}) legally executed.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 2: SEOR Issues Final Payment Certificate & Unlocks Stage 2 Retention
  const handleCertifyFinalCertificate = async (bill: FinalBillRecord) => {
    if (!isFinanceOrConsultant) return;
    setActionInProgress(`certify_${bill.id}`);

    const updatePayload: Partial<FinalBillRecord> = {
      status: "SEOR_CERTIFIED_FINAL",
      seor_signoff_name: roleLabel || "Resident SEOR",
      seor_signed_at: new Date().toISOString(),
      pbg_returned_to_contractor: true,
    };

    try {
      await (supabase as any)
        .from("contract_final_bills")
        .update(updatePayload)
        .eq("id", bill.id);

      // Unlock Stage 2 (Final 50%) Retention and mark PBG released in Retention Ledger
      await (supabase as any)
        .from("retention_and_bank_guarantees")
        .update({
          stage_2_dlp_released: true,
          retained_balance_inr: 0,
          status: "FULLY_RELEASED_DLP_END",
        })
        .eq("project_id", projectId)
        .eq("linked_ra_bill_no", tier === "RESIDENTIAL" ? "RA-RES-03" : "RA-TWR-06");

      // Mark parent Work Order as CLOSED_FINAL_BILL
      await (supabase as any)
        .from("contract_work_orders")
        .update({ status: "CLOSED_FINAL_BILL" })
        .eq("project_id", projectId)
        .eq("work_order_number", bill.work_order_ref);
    } catch {
      // Local optimistic update
    }

    setBills((prev) =>
      prev.map((b) => (b.id === bill.id ? ({ ...b, ...updatePayload } as FinalBillRecord) : b))
    );
    if (selectedBill && selectedBill.id === bill.id) {
      setSelectedBill((prev) => (prev ? ({ ...prev, ...updatePayload } as FinalBillRecord) : null));
    }

    setFeedbackMessage(`Final Payment Certificate issued! Stage 2 Retention unlocked & PBG bond released.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Stage 3: Finance Disburses Net Final Settlement via Bank RTGS
  const handleDisburseFinalSettlement = async (bill: FinalBillRecord) => {
    if (!isFinanceOrConsultant) return;
    setActionInProgress(`disburse_${bill.id}`);

    const utrRef = `SBI-RTGS-FINAL-${Date.now().toString().slice(-6)}`;

    const updatePayload: Partial<FinalBillRecord> = {
      status: "SETTLED_DISBURSED",
      finance_disbursed_at: new Date().toISOString(),
      bank_utr_reference: utrRef,
    };

    try {
      await (supabase as any)
        .from("contract_final_bills")
        .update(updatePayload)
        .eq("id", bill.id);
    } catch {
      // Local optimistic update
    }

    setBills((prev) =>
      prev.map((b) => (b.id === bill.id ? ({ ...b, ...updatePayload } as FinalBillRecord) : b))
    );
    if (selectedBill && selectedBill.id === bill.id) {
      setSelectedBill((prev) => (prev ? ({ ...prev, ...updatePayload } as FinalBillRecord) : null));
    }

    setFeedbackMessage(`Net terminal settlement (${formatInr(bill.net_final_payable_inr)}) disbursed (UTR: ${utrRef}).`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Prepare New Final Bill Entry
  const handleCreateFinalBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_fb");

    const calc = calculateFinalBillSettlement(
      Number(finalMeasuredGross),
      Number(prevRaGross),
      Number(stage2Retention),
      Number(unresolvedNcrs),
      Number(cl42Penalties)
    );

    const newDbRecord: Omit<FinalBillRecord, "id"> = {
      project_id: projectId,
      final_bill_number: billNo.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      toc_reference: tocRef.trim(),
      original_contract_sum_inr: Number(contractSum),
      sanctioned_variations_total_inr: Number(variationsTotal),
      final_measured_gross_inr: Number(finalMeasuredGross),
      total_previous_ra_gross_inr: Number(prevRaGross),
      gross_difference_payable_inr: calc.grossDiff,
      stage_2_retention_released_inr: Number(stage2Retention),
      pbg_returned_to_contractor: false,
      terminal_unresolved_ncrs_debit_inr: Number(unresolvedNcrs),
      terminal_cl42_penal_debit_inr: Number(cl42Penalties),
      net_final_payable_inr: calc.netPayable,
      no_claims_declaration_signed: false,
      status: "DRAFT_SUBMITTED",
      qs_auditor_name: roleLabel || "Lead QS",
      audit_notes: auditNotes.trim(),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("contract_final_bills")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeFinalBill(data);
        setBills((prev) => [normalized, ...prev]);
        setSelectedBill(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeFinalBill({ ...newDbRecord, id: `fb-${Date.now()}` });
      setBills((prev) => [fallback, ...prev]);
      setSelectedBill(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Printable CPWD Form 27 / FIDIC Final Certificate Docket
  const handlePrintFinalBill = (b: FinalBillRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Final Payment Certificate &amp; Discharge (CPWD Form 27 / FIDIC Cl. 14.11 &amp; 14.12) — ${b.final_bill_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .settled { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .review { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .tac { text-align: center; font-family: monospace; }
    .total-row { background: #f1f5f9; font-weight: bold; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 14px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD GCC Clause 9 Form 27 / FIDIC Red Book Clause 14.11 &amp; 14.12</div>
      <h1 class="title">Statutory Final Payment Certificate &amp; Contract Discharge</h1>
      <div class="meta">Certificate Ref: ${b.final_bill_number} · Parent Work Order: ${b.work_order_ref} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${b.status === "SEOR_CERTIFIED_FINAL" || b.status === "SETTLED_DISBURSED" ? "settled" : "review"}">${b.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${b.contractor_name}</strong></td><th>Trade Package</th><td>${b.trade_package}</td></tr>
    <tr><th>Taking-Over Certificate Ref</th><td><strong>${b.toc_reference}</strong></td><th>Contract Agreement Sum</th><td>₹${b.original_contract_sum_inr.toLocaleString("en-IN")}</td></tr>
    <tr><th>Sanctioned Variations (VO)</th><td>+₹${b.sanctioned_variations_total_inr.toLocaleString("en-IN")}</td><th>Revised Final Contract Value</th><td><strong>₹${(b.original_contract_sum_inr + b.sanctioned_variations_total_inr).toLocaleString("en-IN")}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Audited Terminal Ledger Notes</div>
    <div>${b.audit_notes || "All 100% final measurements verified against e-MB Form 23. Defects Liability Period completed with zero outstanding snags."}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Terminal Financial Reconciliation Parameter</th>
        <th>Contractual Schedule Reference</th>
        <th class="tar">Value (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Total Final Certified Measured Valuation</td>
        <td>100% Final e-MB Audit Output</td>
        <td class="tar font-bold">₹${b.final_measured_gross_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>2. Less: Total Cumulative Disbursed via Prior RA Bills</td>
        <td>Gross Prior RA Bills 1 to Final-1</td>
        <td class="tar">-₹${b.total_previous_ra_gross_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="total-row" style="background: #e0f2fe;">
        <td><strong>3. Gross Work Difference Payable</strong></td>
        <td><strong>Unbilled Residual Measured Work</strong></td>
        <td class="tar font-bold" style="color: #0369a1; font-size: 12px;">₹${b.gross_difference_payable_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>4. Add: Stage 2 Retention Money Release (Final 50%)</td>
        <td>FIDIC Cl. 14.9 / CPWD Cl. 17 DLP Expiry</td>
        <td class="tar font-bold" style="color: #15803d;">+₹${b.stage_2_retention_released_inr.toLocaleString("en-IN")}</td>
      </tr>
      ${b.terminal_unresolved_ncrs_debit_inr > 0 ? `
      <tr style="color: #b91c1c;">
        <td>5. Less: Terminal NCR Backcharge Deductions</td>
        <td>Defect Rectification Debits</td>
        <td class="tar font-bold">-₹${b.terminal_unresolved_ncrs_debit_inr.toLocaleString("en-IN")}</td>
      </tr>` : ""}
      ${b.terminal_cl42_penal_debit_inr > 0 ? `
      <tr style="color: #b91c1c;">
        <td>6. Less: Terminal Cl. 42 Material Wastage Penalties</td>
        <td>Final Store Reconciliation Debits</td>
        <td class="tar font-bold">-₹${b.terminal_cl42_penal_debit_inr.toLocaleString("en-IN")}</td>
      </tr>` : ""}
      <tr class="total-row" style="background: #dcfce7;">
        <td><strong style="font-size: 13px;">NET FINAL PAYMENT PASSED FOR DISBURSEMENT</strong></td>
        <td><strong>Conclusive Settlement of Contract</strong></td>
        <td class="tar" style="color: #15803d; font-size: 16px;"><strong>₹${b.net_final_payable_inr.toLocaleString("en-IN")}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="box" style="background: #f0fdf4; border-color: #86efac;">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #166534; margin-bottom: 4px;">
      FIDIC 14.12 / CPWD Clause 9A Unconditional Discharge Declaration
    </div>
    <div style="font-size: 11px; line-height: 1.5; color: #15803d;">
      The Contractor confirms that the net payment of <strong>₹${b.net_final_payable_inr.toLocaleString("en-IN")}</strong> constitutes full and final settlement of all moneys due under the Contract. The Contractor irrevocably waives all rights to assert further claims, arbitrations, or monetary demands. Discharge Voucher Ref: <strong>${b.discharge_voucher_ref || "DV-LEGAL-EXECUTED"}</strong> signed on <strong>${b.no_claims_signed_date || "Today"}</strong>.
    </div>
  </div>

  <div class="footer">
    <div>
      <div>Contractor Authorized Signatory</div>
      <div style="color: #64748b;">${b.contractor_name}</div>
      <div class="sig">No-Claims Legal Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${b.seor_signoff_name || "Final Verification Complete"}</div>
      <div class="sig">Engineer Final Certificate Seal</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">Contract Closed &amp; PBG Released</div>
      <div class="sig">Employer Final Discharge Order</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedBill) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING STATUTORY CONTRACTOR FINAL BILL &amp; DISCHARGE CLEARINGHOUSE...
      </div>
    );
  }

  const isCertified = selectedBill.status === "SEOR_CERTIFIED_FINAL" || selectedBill.status === "SETTLED_DISBURSED";
  const isDisbursed = selectedBill.status === "SETTLED_DISBURSED";
  const isDischargeSigned = selectedBill.no_claims_declaration_signed;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Contract Closeout · CPWD GCC Clause 9 Form 27 / FIDIC Clause 14.11 &amp; 14.12</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Contractor Final Bill &amp; No-Claims Discharge
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Terminal commercial settlement clearinghouse. Reconciles 100% final e-MB measurements against previous intermediate RA billings, executes the statutory No-Claims Discharge Voucher, and unlocks final Stage 2 retention escrow.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintFinalBill(selectedBill)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 27 (Final)</span>
            </button>
            <Link
              href="/finance/retention-ledger"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Coins className="w-3.5 h-3.5 text-rose-400" />
              <span>Retention Escrow</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setBillNo(`FB-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${bills.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Draft Final Bill</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK BANNER */}
        {feedbackMessage && (
          <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 text-xs font-mono flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* 4 PRIMARY GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Final Contract Valuation</span>
              <Receipt className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.totalFinalGross)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">100% final e-MB + Variations</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Net Final Settlements</span>
              <Banknote className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalNetDisbursed)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Net terminal cash disbursed</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Stage 2 Retention Released</span>
              <Coins className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              {formatInr(summary.totalStage2RetentionReleased)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Remaining 50% DLP escrow closed</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Final Bills Docket</span>
              <FileCheck className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalBills} Package(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Form 27 terminal dockets</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Final Bills (${bills.length})` },
              { key: "SEOR_CERTIFIED_FINAL", label: "SEOR Certified" },
              { key: "SETTLED_DISBURSED", label: "Settled & Disbursed" },
              { key: "DISCHARGE_VOUCHER_SIGNED", label: "Discharge Signed" },
              { key: "DRAFT_SUBMITTED", label: "Draft" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                  filterStatus === tab.key
                    ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search bill, contractor, WO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: FINAL BILLS LISTING (7 cols) vs TERMINAL SETTLEMENT DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: FINAL BILLS LISTING (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Terminal Payment Registry (CPWD Form 27)
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Executed Final Contract Bills</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredBills.length} Settlements</span>
            </div>

            <div className="space-y-3">
              {filteredBills.map((b) => {
                const isSelected = selectedBill.id === b.id;
                const isFinalSettled = b.status === "SETTLED_DISBURSED";
                const isCert = b.status === "SEOR_CERTIFIED_FINAL" || isFinalSettled;

                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBill(b)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {b.final_bill_number}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {b.work_order_ref}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isFinalSettled
                            ? "bg-purple-950 text-purple-400 border border-purple-800/50"
                            : isCert
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : b.no_claims_declaration_signed
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-emerald-400">
                          {formatInr(b.net_final_payable_inr)} Net Final
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Gross: {formatInr(b.final_measured_gross_inr)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{b.contractor_name}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {b.trade_package} &bull; Taking-Over: {b.toc_reference}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Prior RA Disbursals: <strong className="text-zinc-300">{formatInr(b.total_previous_ra_gross_inr)}</strong></span>
                      <span>Stage 2 Retention: <strong className="text-emerald-400">+{formatInr(b.stage_2_retention_released_inr)}</strong></span>
                      <span>Discharge: <strong className={b.no_claims_declaration_signed ? "text-emerald-400" : "text-amber-400"}>{b.no_claims_declaration_signed ? "Signed" : "Pending"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: TERMINAL SETTLEMENT & DISCHARGE AUDIT DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Final Settlement &amp; Discharge Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedBill.final_bill_number}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isCertified
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedBill.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Contractor:</span>
                <strong className="text-white font-sans">{selectedBill.contractor_name}</strong>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Work Order Reference:</span>
                <span className="text-cyan-300 font-bold">{selectedBill.work_order_ref}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Handover TOC Reference:</span>
                <span className="text-white font-bold">{selectedBill.toc_reference}</span>
              </div>
            </div>

            {/* TERMINAL SETTLEMENT WATERFALL (CPWD FORM 27) */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Final Bill Reconciliation Waterfall:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-white font-bold">
                  <span>1. 100% Final Measured Gross (e-MB):</span>
                  <span className="text-cyan-300">{formatInr(selectedBill.final_measured_gross_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>2. Less: Prior Running Bill Gross Disbursals:</span>
                  <span className="text-zinc-300">-{formatInr(selectedBill.total_previous_ra_gross_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-200 font-bold pt-1 border-t border-zinc-800">
                  <span>3. Gross Unbilled Work Difference:</span>
                  <span className="text-white">{formatInr(selectedBill.gross_difference_payable_inr)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-bold">
                  <span>4. Add: Stage 2 (Final 50%) Retention Release:</span>
                  <span>+{formatInr(selectedBill.stage_2_retention_released_inr)}</span>
                </div>

                {selectedBill.terminal_unresolved_ncrs_debit_inr > 0 && (
                  <div className="flex justify-between text-rose-400 font-bold">
                    <span>5. Less: Terminal NCR Backcharges:</span>
                    <span>-{formatInr(selectedBill.terminal_unresolved_ncrs_debit_inr)}</span>
                  </div>
                )}

                {selectedBill.terminal_cl42_penal_debit_inr > 0 && (
                  <div className="flex justify-between text-rose-400 font-bold">
                    <span>6. Less: Terminal Cl. 42 Material Penalties:</span>
                    <span>-{formatInr(selectedBill.terminal_cl42_penal_debit_inr)}</span>
                  </div>
                )}

                <div className="flex justify-between text-emerald-400 font-extrabold text-sm pt-2 border-t border-zinc-800">
                  <span>Net Terminal Settlement (INR):</span>
                  <span>{formatInr(selectedBill.net_final_payable_inr)}</span>
                </div>
              </div>
            </div>

            {/* STATUTORY NO-CLAIMS DISCHARGE VOUCHER STATUS */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                FIDIC 14.12 No-Claims Legal Discharge Gate:
              </span>

              <div className="flex justify-between items-center text-[11px]">
                <span>Discharge Voucher Executed:</span>
                <span className={`font-bold ${isDischargeSigned ? "text-emerald-400" : "text-amber-400"}`}>
                  {isDischargeSigned ? `SIGNED (${selectedBill.discharge_voucher_ref})` : "AWAITING CONTRACTOR SIGN"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span>PBG Bond Return Clearance:</span>
                <span className={`font-bold ${selectedBill.pbg_returned_to_contractor ? "text-emerald-400" : "text-zinc-400"}`}>
                  {selectedBill.pbg_returned_to_contractor ? "PBG RELEASED TO CONTRACTOR" : "HELD IN ESCROW"}
                </span>
              </div>
            </div>

            {/* ACTIONS: SIGN DISCHARGE, SEOR CERTIFY, FINANCE DISBURSE */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Execution Protocol:
              </span>

              {/* Action 1: Sign No-Claims Discharge Voucher */}
              {!isDischargeSigned && (
                <button
                  type="button"
                  disabled={actionInProgress === `discharge_${selectedBill.id}`}
                  onClick={() => handleSignNoClaims(selectedBill)}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Execute No-Claims Discharge Voucher (FIDIC 14.12)</span>
                </button>
              )}

              {/* Action 2: SEOR Final Certification */}
              {isDischargeSigned && selectedBill.status !== "SEOR_CERTIFIED_FINAL" && selectedBill.status !== "SETTLED_DISBURSED" && (
                <button
                  type="button"
                  disabled={!isFinanceOrConsultant || actionInProgress === `certify_${selectedBill.id}`}
                  onClick={() => handleCertifyFinalCertificate(selectedBill)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Issue Final Payment Certificate &amp; Release PBG (SEOR)</span>
                </button>
              )}

              {/* Action 3: Finance Terminal RTGS Disbursal */}
              {selectedBill.status === "SEOR_CERTIFIED_FINAL" && (
                <button
                  type="button"
                  disabled={!isFinanceOrConsultant || actionInProgress === `disburse_${selectedBill.id}`}
                  onClick={() => handleDisburseFinalSettlement(selectedBill)}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/50 font-mono disabled:opacity-50"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Disburse Net Final Settlement via Bank RTGS</span>
                </button>
              )}

              {isDisbursed && (
                <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Contract Package Conclusively Closed &amp; Settled</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Disbursed on {selectedBill.finance_disbursed_at ? new Date(selectedBill.finance_disbursed_at).toLocaleDateString("en-IN") : "Today"} via UTR: <strong className="text-white font-mono">{selectedBill.bank_utr_reference}</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD Form 27 &amp; FIDIC Clause 14.11 / 14.12 Final Settlement Protocol
            </div>
          </div>

        </div>

        {/* PREPARE FINAL BILL MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Prepare Contractor Final Bill (Form 27)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateFinalBill} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Final Bill Number</label>
                    <input
                      type="text"
                      required
                      value={billNo}
                      onChange={(e) => setBillNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Taking-Over TOC Ref</label>
                    <input
                      type="text"
                      required
                      value={tocRef}
                      onChange={(e) => setTocRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Name</label>
                    <input
                      type="text"
                      required
                      value={contractor}
                      onChange={(e) => setContractor(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Work Order Ref</label>
                    <input
                      type="text"
                      required
                      value={woRef}
                      onChange={(e) => setWoRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Original Contract Sum (₹)</label>
                    <input
                      type="number"
                      required
                      value={contractSum}
                      onChange={(e) => setContractSum(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Sanctioned Variations (₹)</label>
                    <input
                      type="number"
                      required
                      value={variationsTotal}
                      onChange={(e) => setVariationsTotal(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">100% Measured Gross (₹)</label>
                    <input
                      type="number"
                      required
                      value={finalMeasuredGross}
                      onChange={(e) => setFinalMeasuredGross(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Total Prior RA Gross (₹)</label>
                    <input
                      type="number"
                      required
                      value={prevRaGross}
                      onChange={(e) => setPrevRaGross(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Stage 2 Retention (₹)</label>
                    <input
                      type="number"
                      required
                      value={stage2Retention}
                      onChange={(e) => setStage2Retention(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Unresolved NCRs (₹)</label>
                    <input
                      type="number"
                      value={unresolvedNcrs}
                      onChange={(e) => setUnresolvedNcrs(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Cl. 42 Penalties (₹)</label>
                    <input
                      type="number"
                      value={cl42Penalties}
                      onChange={(e) => setCl42Penalties(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Audit Summary Notes</label>
                  <textarea
                    rows={2}
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "creating_fb"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit Final Bill Draft</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}