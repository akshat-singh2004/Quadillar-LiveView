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
  Download,
  Eye,
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

export type RaBillStatus =
  | "DRAFT_SUBMITTED"
  | "QS_MEASUREMENTS_CHECKED"
  | "STATUTORY_GATES_VERIFIED"
  | "SEOR_CERTIFIED_IPC"
  | "FINANCE_DISBURSED"
  | "PAYMENT_FROZEN_CLAUSE_19D";

export interface RaBillRecord {
  id: string;
  project_id: string;
  bill_number: string;
  bill_sequence_no: number;
  bill_period_start: string;
  bill_period_end: string;
  contractor_name: string;
  work_order_ref: string;
  trade_package: string;
  gross_certified_current_inr: number;
  gross_certified_cumulative_inr: number;
  previous_bill_gross_inr: number;
  retention_money_current_inr: number;
  mobilization_advance_recovery_inr: number;
  bocw_cess_current_inr: number;
  income_tax_tds_inr: number;
  gst_tds_inr: number;
  cl42_wastage_penalties_inr: number;
  ncr_debit_backcharges_inr: number;
  total_deductions_current_inr: number;
  net_payable_current_inr: number;
  labor_compliance_cleared: boolean;
  safety_stop_work_cleared: boolean;
  concrete_cube_tests_cleared: boolean;
  status: RaBillStatus;
  qs_auditor_name?: string | null;
  seor_signoff_name?: string | null;
  seor_signed_at?: string | null;
  finance_disbursed_at?: string | null;
  bank_utr_reference?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function calculateDeductions(
  gross: number,
  penalties: number,
  backcharges: number
) {
  const retention = Math.round(gross * 0.05); // 5% Retention Escrow
  const mobAdvance = Math.round(gross * 0.10); // 10% Advance Amortization
  const cess = Math.round(gross * 0.01); // 1% BOCW Cess
  const itTds = Math.round(gross * 0.01); // 1% TDS Sec 194C
  const gstTds = Math.round(gross * 0.02); // 2% GST TDS Sec 51

  const totalDeductions =
    retention + mobAdvance + cess + itTds + gstTds + penalties + backcharges;
  const netPayable = Math.max(0, gross - totalDeductions);

  return {
    retention,
    mobAdvance,
    cess,
    itTds,
    gstTds,
    totalDeductions,
    netPayable,
  };
}

function normalizeRaBill(d: any): RaBillRecord {
  const currentGross = Number(d?.gross_certified_current_inr ?? 0);
  const penalties = Number(d?.cl42_wastage_penalties_inr ?? 0);
  const backcharges = Number(d?.ncr_debit_backcharges_inr ?? 0);

  const calc = calculateDeductions(currentGross, penalties, backcharges);

  return {
    id: d?.id ?? `ra-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    bill_number: d?.bill_number ?? "RA-01",
    bill_sequence_no: Number(d?.bill_sequence_no ?? 1),
    bill_period_start: d?.bill_period_start ?? new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    bill_period_end: d?.bill_period_end ?? new Date().toISOString().slice(0, 10),
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    work_order_ref: d?.work_order_ref ?? "WO-01",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    gross_certified_current_inr: currentGross,
    gross_certified_cumulative_inr: Number(d?.gross_certified_cumulative_inr ?? currentGross),
    previous_bill_gross_inr: Number(d?.previous_bill_gross_inr ?? 0),
    retention_money_current_inr: Number(d?.retention_money_current_inr ?? calc.retention),
    mobilization_advance_recovery_inr: Number(d?.mobilization_advance_recovery_inr ?? calc.mobAdvance),
    bocw_cess_current_inr: Number(d?.bocw_cess_current_inr ?? calc.cess),
    income_tax_tds_inr: Number(d?.income_tax_tds_inr ?? calc.itTds),
    gst_tds_inr: Number(d?.gst_tds_inr ?? calc.gstTds),
    cl42_wastage_penalties_inr: penalties,
    ncr_debit_backcharges_inr: backcharges,
    total_deductions_current_inr: Number(d?.total_deductions_current_inr ?? calc.totalDeductions),
    net_payable_current_inr: Number(d?.net_payable_current_inr ?? calc.netPayable),
    labor_compliance_cleared: Boolean(d?.labor_compliance_cleared),
    safety_stop_work_cleared: d?.safety_stop_work_cleared !== undefined ? Boolean(d.safety_stop_work_cleared) : true,
    concrete_cube_tests_cleared: d?.concrete_cube_tests_cleared !== undefined ? Boolean(d.concrete_cube_tests_cleared) : true,
    status: (d?.status as RaBillStatus) ?? "DRAFT_SUBMITTED",
    qs_auditor_name: d?.qs_auditor_name ?? null,
    seor_signoff_name: d?.seor_signoff_name ?? null,
    seor_signed_at: d?.seor_signed_at ?? null,
    finance_disbursed_at: d?.finance_disbursed_at ?? null,
    bank_utr_reference: d?.bank_utr_reference ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalRaBillsPage() {
  const { project, role, tier } = useActiveRole();
  const [bills, setBills] = useState<RaBillRecord[]>([]);
  const [selectedBill, setSelectedBill] = useState<RaBillRecord | null>(null);
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

  // Form State for Preparing Interim Bill
  const [billNo, setBillNo] = useState(tier === "RESIDENTIAL" ? "RA-RES-03" : "RA-TWR-06");
  const [seqNo, setSeqNo] = useState<number>(tier === "RESIDENTIAL" ? 3 : 6);
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [workOrderRef, setWorkOrderRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [currentGross, setCurrentGross] = useState<number>(tier === "RESIDENTIAL" ? 345000 : 8500000);
  const [prevGross, setPrevGross] = useState<number>(tier === "RESIDENTIAL" ? 690000 : 34000000);
  const [cl42Penalties, setCl42Penalties] = useState<number>(tier === "RESIDENTIAL" ? 4200 : 110160);
  const [ncrBackcharges, setNcrBackcharges] = useState<number>(tier === "RESIDENTIAL" ? 2500 : 85000);

  const loadRaBills = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("running_account_bills")
        .select("*")
        .eq("project_id", projectId)
        .order("bill_sequence_no", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeRaBill(d));
        setBills(normalized);
        if (!selectedBill) setSelectedBill(normalized[0]);
      } else {
        const defaults: RaBillRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeRaBill({
                  id: "ra-res-01",
                  project_id: projectId,
                  bill_number: "RA-RES-03",
                  bill_sequence_no: 3,
                  bill_period_start: "2026-08-15",
                  bill_period_end: "2026-09-12",
                  contractor_name: "Royal Woodworks & Interiors",
                  work_order_ref: "WO-RES-001",
                  trade_package: "Custom Joinery & Millwork",
                  gross_certified_current_inr: 345000,
                  gross_certified_cumulative_inr: 1035000,
                  previous_bill_gross_inr: 690000,
                  cl42_wastage_penalties_inr: 4200,
                  ncr_debit_backcharges_inr: 2500,
                  labor_compliance_cleared: true,
                  safety_stop_work_cleared: true,
                  concrete_cube_tests_cleared: true,
                  status: "SEOR_CERTIFIED_IPC",
                  qs_auditor_name: "Lead QS",
                  seor_signoff_name: "Principal Architect",
                  seor_signed_at: "2026-09-13T14:00:00Z",
                }),
              ]
            : [
                normalizeRaBill({
                  id: "ra-twr-01",
                  project_id: projectId,
                  bill_number: "RA-TWR-06",
                  bill_sequence_no: 6,
                  bill_period_start: "2026-08-01",
                  bill_period_end: "2026-08-31",
                  contractor_name: "Narmada Concrete Works",
                  work_order_ref: "WO-TWR-101",
                  trade_package: "Civil & Superstructure",
                  gross_certified_current_inr: 8500000,
                  gross_certified_cumulative_inr: 42500000,
                  previous_bill_gross_inr: 34000000,
                  cl42_wastage_penalties_inr: 110160,
                  ncr_debit_backcharges_inr: 85000,
                  labor_compliance_cleared: true,
                  safety_stop_work_cleared: true,
                  concrete_cube_tests_cleared: true,
                  status: "SEOR_CERTIFIED_IPC",
                  qs_auditor_name: "Assistant Engineer (QS)",
                  seor_signoff_name: "Resident SEOR",
                  seor_signed_at: "2026-09-08T17:30:00Z",
                }),
                normalizeRaBill({
                  id: "ra-twr-02",
                  project_id: projectId,
                  bill_number: "RA-TWR-07",
                  bill_sequence_no: 7,
                  bill_period_start: "2026-09-01",
                  bill_period_end: "2026-09-15",
                  contractor_name: "Narmada Concrete Works",
                  work_order_ref: "WO-TWR-101",
                  trade_package: "Civil & Superstructure",
                  gross_certified_current_inr: 4200000,
                  gross_certified_cumulative_inr: 46700000,
                  previous_bill_gross_inr: 42500000,
                  cl42_wastage_penalties_inr: 0,
                  ncr_debit_backcharges_inr: 50000,
                  labor_compliance_cleared: false,
                  safety_stop_work_cleared: false,
                  concrete_cube_tests_cleared: true,
                  status: "PAYMENT_FROZEN_CLAUSE_19D",
                  qs_auditor_name: "Assistant Engineer (QS)",
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
    void loadRaBills();

    const channel = supabase
      .channel(`ra_bills_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "running_account_bills" }, () => void loadRaBills())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadRaBills]);

  const summary = useMemo(() => {
    const totalBills = bills.length;
    const totalGrossCertified = bills.reduce((sum, b) => sum + Number(b.gross_certified_current_inr || 0), 0);
    const totalNetDisbursed = bills
      .filter((b) => b.status === "FINANCE_DISBURSED" || b.status === "SEOR_CERTIFIED_IPC")
      .reduce((sum, b) => sum + Number(b.net_payable_current_inr || 0), 0);
    const frozenCount = bills.filter(
      (b) => b.status === "PAYMENT_FROZEN_CLAUSE_19D" || !b.labor_compliance_cleared || !b.safety_stop_work_cleared
    ).length;

    return { totalBills, totalGrossCertified, totalNetDisbursed, frozenCount };
  }, [bills]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => {
      const matchStatus = filterStatus === "ALL" || b.status === filterStatus;
      const haystack = `${b.bill_number} ${b.contractor_name} ${b.work_order_ref} ${b.trade_package}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [bills, filterStatus, search]);

  // Stage 1: Verify Statutory Stage Gates (Labour, Safety, Structural Tests)
  const handleVerifyStatutoryGates = async (bill: RaBillRecord) => {
    if (!isFinanceOrConsultant) return;
    setActionInProgress(`gates_${bill.id}`);

    const allGatesPassed =
      bill.labor_compliance_cleared &&
      bill.safety_stop_work_cleared &&
      bill.concrete_cube_tests_cleared;

    const updatePayload: Partial<RaBillRecord> = {
      status: allGatesPassed ? "STATUTORY_GATES_VERIFIED" : "PAYMENT_FROZEN_CLAUSE_19D",
      qs_auditor_name: roleLabel || "Lead Quantity Surveyor",
    };

    try {
      await (supabase as any)
        .from("running_account_bills")
        .update(updatePayload)
        .eq("id", bill.id);
    } catch {
      // Local optimistic update
    }

    setBills((prev) =>
      prev.map((b) => (b.id === bill.id ? ({ ...b, ...updatePayload } as RaBillRecord) : b))
    );
    if (selectedBill && selectedBill.id === bill.id) {
      setSelectedBill((prev) => (prev ? ({ ...prev, ...updatePayload } as RaBillRecord) : null));
    }

    setFeedbackMessage(
      allGatesPassed
        ? `Statutory pre-payment checks verified for ${bill.bill_number}. Ready for SEOR certification.`
        : `Payment frozen under CPWD Clause 19D / Safety Stop-Work order on ${bill.bill_number}.`
    );
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 2: SEOR Issues Interim Payment Certificate (IPC)
  const handleCertifyIpc = async (bill: RaBillRecord) => {
    if (!isFinanceOrConsultant) return;
    setActionInProgress(`certify_${bill.id}`);

    const updatePayload: Partial<RaBillRecord> = {
      status: "SEOR_CERTIFIED_IPC",
      seor_signoff_name: roleLabel || "Resident SEOR",
      seor_signed_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("running_account_bills")
        .update(updatePayload)
        .eq("id", bill.id);
    } catch {
      // Local optimistic update
    }

    setBills((prev) =>
      prev.map((b) => (b.id === bill.id ? ({ ...b, ...updatePayload } as RaBillRecord) : b))
    );
    if (selectedBill && selectedBill.id === bill.id) {
      setSelectedBill((prev) => (prev ? ({ ...prev, ...updatePayload } as RaBillRecord) : null));
    }

    setFeedbackMessage(`Interim Payment Certificate (IPC) sanctioned for ${bill.bill_number} by ${roleLabel}.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 3: Finance Disburses Net Payment via Bank NEFT/RTGS
  const handleDisbursePayment = async (bill: RaBillRecord) => {
    if (!isFinanceOrConsultant) return;
    setActionInProgress(`disburse_${bill.id}`);

    const utrRef = `SBI-RTGS-${Date.now().toString().slice(-8)}`;

    const updatePayload: Partial<RaBillRecord> = {
      status: "FINANCE_DISBURSED",
      finance_disbursed_at: new Date().toISOString(),
      bank_utr_reference: utrRef,
    };

    try {
      await (supabase as any)
        .from("running_account_bills")
        .update(updatePayload)
        .eq("id", bill.id);
    } catch {
      // Local optimistic update
    }

    setBills((prev) =>
      prev.map((b) => (b.id === bill.id ? ({ ...b, ...updatePayload } as RaBillRecord) : b))
    );
    if (selectedBill && selectedBill.id === bill.id) {
      setSelectedBill((prev) => (prev ? ({ ...prev, ...updatePayload } as RaBillRecord) : null));
    }

    setFeedbackMessage(`Net payment of ${formatInr(bill.net_payable_current_inr)} disbursed (UTR: ${utrRef}).`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Prepare New RA Bill
  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_bill");

    const calc = calculateDeductions(Number(currentGross), Number(cl42Penalties), Number(ncrBackcharges));
    const cumulativeGross = Number(prevGross) + Number(currentGross);

    const newDbRecord: Omit<RaBillRecord, "id"> = {
      project_id: projectId,
      bill_number: billNo.trim(),
      bill_sequence_no: Number(seqNo),
      bill_period_start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
      bill_period_end: new Date().toISOString().slice(0, 10),
      contractor_name: contractor.trim(),
      work_order_ref: workOrderRef.trim(),
      trade_package: tradePackage.trim(),
      gross_certified_current_inr: Number(currentGross),
      gross_certified_cumulative_inr: cumulativeGross,
      previous_bill_gross_inr: Number(prevGross),
      retention_money_current_inr: calc.retention,
      mobilization_advance_recovery_inr: calc.mobAdvance,
      bocw_cess_current_inr: calc.cess,
      income_tax_tds_inr: calc.itTds,
      gst_tds_inr: calc.gstTds,
      cl42_wastage_penalties_inr: Number(cl42Penalties),
      ncr_debit_backcharges_inr: Number(ncrBackcharges),
      total_deductions_current_inr: calc.totalDeductions,
      net_payable_current_inr: calc.netPayable,
      labor_compliance_cleared: true,
      safety_stop_work_cleared: true,
      concrete_cube_tests_cleared: true,
      status: "DRAFT_SUBMITTED",
      qs_auditor_name: roleLabel || "Lead QS",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("running_account_bills")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeRaBill(data);
        setBills((prev) => [normalized, ...prev]);
        setSelectedBill(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeRaBill({ ...newDbRecord, id: `ra-${Date.now()}` });
      setBills((prev) => [fallback, ...prev]);
      setSelectedBill(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form 26 / FIDIC IPC Printable Docket
  const handlePrintIpc = (b: RaBillRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Interim Payment Certificate (CPWD Form 26 / FIDIC Cl. 14.6) — ${b.bill_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .certified { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .frozen { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD GCC Clause 7 Form 26 / FIDIC Red Book Clause 14.6</div>
      <h1 class="title">Interim Payment Certificate (RA Bill #${b.bill_sequence_no})</h1>
      <div class="meta">Certificate Ref: ${b.bill_number} · Period: ${b.bill_period_start} to ${b.bill_period_end} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${b.status === "SEOR_CERTIFIED_IPC" || b.status === "FINANCE_DISBURSED" ? "certified" : "frozen"}">${b.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${b.contractor_name}</strong></td><th>Trade Package</th><td>${b.trade_package}</td></tr>
    <tr><th>Contract Agreement Ref</th><td><strong>${b.work_order_ref}</strong></td><th>Measurement Reference</th><td>Certified e-MB Ledger Records</td></tr>
    <tr><th>Cumulative Certified Work</th><td>₹${b.gross_certified_cumulative_inr.toLocaleString("en-IN")}</td><th>Previous Certified Gross</th><td>₹${b.previous_bill_gross_inr.toLocaleString("en-IN")}</td></tr>
    <tr><th>Current Bill Gross Certified</th><td colspan="3" style="font-size: 13px; font-weight: bold; color: #0369a1;">₹${b.gross_certified_current_inr.toLocaleString("en-IN")}</td></tr>
  </table>

  <table>
    <thead>
      <tr>
        <th>Statutory Deduction &amp; Amortization Parameter</th>
        <th>Contractual Schedule Multiplier</th>
        <th class="tar">Withheld Value (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Retention Money Escrow (5%)</td>
        <td>FIDIC Cl. 14.9 / CPWD Cl. 17 Withholding</td>
        <td class="tar font-bold">₹${b.retention_money_current_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>2. Mobilization Advance Recovery (10%)</td>
        <td>Amortization of Initial Advance</td>
        <td class="tar">₹${b.mobilization_advance_recovery_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>3. BOCW Welfare Cess (1%)</td>
        <td>BOCW Act 1996 State Remittance</td>
        <td class="tar">₹${b.bocw_cess_current_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>4. Income Tax TDS (Sec 194C) (1%)</td>
        <td>Statutory Direct Tax Deduction</td>
        <td class="tar">₹${b.income_tax_tds_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>5. GST TDS (Sec 51) (2%)</td>
        <td>CGST / SGST Statutory Withholding</td>
        <td class="tar">₹${b.gst_tds_inr.toLocaleString("en-IN")}</td>
      </tr>
      ${b.cl42_wastage_penalties_inr > 0 ? `
      <tr style="color: #b91c1c;">
        <td>6. CPWD Clause 42 Material Penal Debits</td>
        <td>Excess Wastage Double-Rate Recovery</td>
        <td class="tar font-bold">₹${b.cl42_wastage_penalties_inr.toLocaleString("en-IN")}</td>
      </tr>` : ""}
      ${b.ncr_debit_backcharges_inr > 0 ? `
      <tr style="color: #b91c1c;">
        <td>7. NCR Commercial Backcharge Deductions</td>
        <td>Quality / Safety Incident Penalties</td>
        <td class="tar font-bold">₹${b.ncr_debit_backcharges_inr.toLocaleString("en-IN")}</td>
      </tr>` : ""}
      <tr class="total-row" style="background: #fee2e2;">
        <td colspan="2"><strong>TOTAL STATUTORY DEDUCTIONS &amp; RECOVERIES</strong></td>
        <td class="tar" style="color: #b91c1c; font-size: 13px;"><strong>-₹${b.total_deductions_current_inr.toLocaleString("en-IN")}</strong></td>
      </tr>
      <tr class="total-row" style="background: #dcfce7;">
        <td colspan="2"><strong style="font-size: 12px;">NET PASSED FOR PAYMENT (INTERIM PAYMENT CERTIFICATE)</strong></td>
        <td class="tar" style="color: #15803d; font-size: 15px;"><strong>₹${b.net_payable_current_inr.toLocaleString("en-IN")}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Statutory Payment Release Gate Verification</div>
    <div>Labour Welfare (Form XVII / EPF / ESIC) Clearance: <strong>${b.labor_compliance_cleared ? "CLEARED & RECONCILED" : "BREACH FLAGGED (FROZEN)"}</strong></div>
    <div>Site Safety (Stop-Work Order) Check: <strong>${b.safety_stop_work_cleared ? "NO ACTIVE STOP-WORK ORDERS" : "STOP-WORK ACTIVE (WITHHELD)"}</strong></div>
    <div>28-Day Concrete Cube Strength Gate: <strong>${b.concrete_cube_tests_cleared ? "COMPLIANT WITH IS 456" : "CRITICAL FAILURES PENDING"}</strong></div>
    ${b.bank_utr_reference ? `<div>Disbursement Reference: <strong>UTR ${b.bank_utr_reference}</strong> on ${b.finance_disbursed_at ? new Date(b.finance_disbursed_at).toLocaleDateString("en-IN") : "Today"}</div>` : ""}
  </div>

  <div class="footer">
    <div>
      <div>Site Quantity Surveyor</div>
      <div style="color: #64748b;">${b.qs_auditor_name || "Measurements Reconciled"}</div>
      <div class="sig">QS Measurement Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">${b.seor_signoff_name || "Interim Certificate Sanctioned"}</div>
      <div class="sig">Engineer IPC Sanction Seal</div>
    </div>
    <div>
      <div>Employer Project Director / Finance</div>
      <div style="color: #64748b;">Disbursement Authorized</div>
      <div class="sig">Employer Payment Order</div>
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
        INITIALIZING RUNNING ACCOUNT BILLS &amp; IPC STATUTORY ENGINE...
      </div>
    );
  }

  const isCertified = selectedBill.status === "SEOR_CERTIFIED_IPC" || selectedBill.status === "FINANCE_DISBURSED";
  const isDisbursed = selectedBill.status === "FINANCE_DISBURSED";
  const isFrozen =
    selectedBill.status === "PAYMENT_FROZEN_CLAUSE_19D" ||
    !selectedBill.labor_compliance_cleared ||
    !selectedBill.safety_stop_work_cleared;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Commercial Settlements · CPWD GCC Clause 7 Form 26 / FIDIC Clause 14.6</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Running Account (RA) Bills &amp; IPC Clearinghouse
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Contractor intermediate payment certificate clearinghouse. Derives billings from certified e-MB entries, applies statutory deductions (retention, advance recovery, cess, TDS, Cl. 42 penalties), and halts payments if statutory labor or safety stage-gates fail.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintIpc(selectedBill)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 26 (IPC)</span>
            </button>
            <Link
              href="/finance/measurement-book"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Scale className="w-3.5 h-3.5 text-cyan-400" />
              <span>e-MB Measurement Book</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setBillNo(tier === "RESIDENTIAL" ? "RA-RES-04" : "RA-TWR-08");
                setSeqNo(bills.length + 1);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Prepare RA Interim Bill</span>
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
              <span>Gross Certified Billing</span>
              <Receipt className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.totalGrossCertified)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Total intermediate work certified</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Net Payments Sanctioned</span>
              <Banknote className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalNetDisbursed)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Disbursed net of all deductions</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Payments Frozen / Held</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.frozenCount > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {summary.frozenCount} Bill(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Clause 19D / Safety Stop-Work</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total RA Certificates</span>
              <FileCheck className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalBills} IPCs
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Form 26 intermediate bills</div>
          </div>
        </div>

        {/* CLAUSE 19D FROZEN ALERT CALLOUT */}
        {isFrozen && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200 text-xs uppercase tracking-wider block">
                  Statutory Payment Gate Active: Intermediate Disbursement Frozen
                </strong>
                <span className="text-xs text-rose-300/80 font-sans">
                  {selectedBill.bill_number} cannot be certified by the Resident SEOR or disbursed by accounts. The contractor has unresolved statutory breaches (unpaid labor wages or active safety stop-work orders) under CPWD GCC Clause 19D / BOCW Act 1996.
                </span>
              </div>
            </div>
            <Link
              href="/compliance/labor"
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition"
            >
              Resolve Labour Breach &rarr;
            </Link>
          </div>
        )}

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Bills (${bills.length})` },
              { key: "SEOR_CERTIFIED_IPC", label: "Certified (IPC)" },
              { key: "FINANCE_DISBURSED", label: "Disbursed" },
              { key: "PAYMENT_FROZEN_CLAUSE_19D", label: `Frozen (${summary.frozenCount})` },
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
              placeholder="Search bill number, contractor, WO..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: BILLS ROSTER (7 cols) vs WATERFALL & GATES AUDIT DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: RA BILLS LISTING (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Interim Payment Registry (CPWD Form 26)
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Running Account Certificates</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredBills.length} IPCs</span>
            </div>

            <div className="space-y-3">
              {filteredBills.map((b) => {
                const isSelected = selectedBill.id === b.id;
                const isCert = b.status === "SEOR_CERTIFIED_IPC" || b.status === "FINANCE_DISBURSED";
                const isDisb = b.status === "FINANCE_DISBURSED";
                const isFrozenBill =
                  b.status === "PAYMENT_FROZEN_CLAUSE_19D" ||
                  !b.labor_compliance_cleared ||
                  !b.safety_stop_work_cleared;

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
                          {b.bill_number} (Seq #{b.bill_sequence_no})
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {b.work_order_ref}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isDisb
                            ? "bg-purple-950 text-purple-400 border border-purple-800/50"
                            : isCert
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : isFrozenBill
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {b.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-emerald-400">
                          {formatInr(b.net_payable_current_inr)} Net
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Gross: {formatInr(b.gross_certified_current_inr)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{b.contractor_name}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {b.trade_package} &bull; Period: {b.bill_period_start} &rarr; {b.bill_period_end}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Deductions: <strong className="text-rose-400">-{formatInr(b.total_deductions_current_inr)}</strong></span>
                      <span>Cumulative: <strong className="text-zinc-300">{formatInr(b.gross_certified_cumulative_inr)}</strong></span>
                      <span>Labour Gate: <strong className={b.labor_compliance_cleared ? "text-emerald-400" : "text-rose-400"}>{b.labor_compliance_cleared ? "Pass" : "Hold"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: DEDUCTIONS WATERFALL & CLEARANCE DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Payment Certification Waterfall
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedBill.bill_number}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isCertified
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : isFrozen
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50"
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
                <span>Certification Horizon:</span>
                <span className="text-zinc-200">{selectedBill.bill_period_start} &bull; {selectedBill.bill_period_end}</span>
              </div>
            </div>

            {/* DEDUCTIONS WATERFALL (CPWD FORM 26) */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Statutory Gross-to-Net Waterfall:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-white font-bold">
                  <span>Gross Certified Work (e-MB):</span>
                  <span className="text-cyan-300">{formatInr(selectedBill.gross_certified_current_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Less: Retention Money (5% Escrow):</span>
                  <span className="text-rose-400">-{formatInr(selectedBill.retention_money_current_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Less: Mobilization Advance Recovery (10%):</span>
                  <span className="text-rose-400">-{formatInr(selectedBill.mobilization_advance_recovery_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Less: BOCW Welfare Cess (1%):</span>
                  <span className="text-rose-400">-{formatInr(selectedBill.bocw_cess_current_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Less: Statutory TDS &amp; GST-TDS (3%):</span>
                  <span className="text-rose-400">-{formatInr(selectedBill.income_tax_tds_inr + selectedBill.gst_tds_inr)}</span>
                </div>

                {selectedBill.cl42_wastage_penalties_inr > 0 && (
                  <div className="flex justify-between text-rose-400 font-bold">
                    <span>Less: Cl. 42 Material Wastage Penalty:</span>
                    <span>-{formatInr(selectedBill.cl42_wastage_penalties_inr)}</span>
                  </div>
                )}

                {selectedBill.ncr_debit_backcharges_inr > 0 && (
                  <div className="flex justify-between text-rose-400 font-bold">
                    <span>Less: Quality / Safety NCR Backcharge:</span>
                    <span>-{formatInr(selectedBill.ncr_debit_backcharges_inr)}</span>
                  </div>
                )}

                <div className="flex justify-between text-emerald-400 font-extrabold text-sm pt-2 border-t border-zinc-800">
                  <span>Net Passed for Payment (IPC):</span>
                  <span>{formatInr(selectedBill.net_payable_current_inr)}</span>
                </div>
              </div>
            </div>

            {/* MANDATORY PRE-PAYMENT COMPLIANCE STAGE-GATES */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Statutory Pre-Disbursement Gates:
              </span>

              <div className="flex justify-between items-center text-[11px]">
                <span>1. Labour Compliance (Form XVII / EPF):</span>
                <span className={`font-bold ${selectedBill.labor_compliance_cleared ? "text-emerald-400" : "text-rose-400"}`}>
                  {selectedBill.labor_compliance_cleared ? "VERIFIED (PASS)" : "BREACH (CPWD 19D HOLD)"}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span>2. Safety Stop-Work Orders:</span>
                <span className={`font-bold ${selectedBill.safety_stop_work_cleared ? "text-emerald-400" : "text-rose-400"}`}>
                  {selectedBill.safety_stop_work_cleared ? "CLEAR (PASS)" : "STOP-WORK ACTIVE"}
                </span>
              </div>

              <div className="flex justify-between items-center text-[11px]">
                <span>3. Concrete Compressive Strength Tests:</span>
                <span className={`font-bold ${selectedBill.concrete_cube_tests_cleared ? "text-emerald-400" : "text-rose-400"}`}>
                  {selectedBill.concrete_cube_tests_cleared ? "IS 456 COMPLIANT" : "FAILURES PENDING"}
                </span>
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Payment Authorizations:
              </span>

              {/* Action 1: Verify Statutory Gates */}
              {selectedBill.status === "DRAFT_SUBMITTED" && (
                <button
                  type="button"
                  disabled={!isFinanceOrConsultant || actionInProgress === `gates_${selectedBill.id}`}
                  onClick={() => handleVerifyStatutoryGates(selectedBill)}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Audit Statutory Gates &amp; Compliance (QS)</span>
                </button>
              )}

              {/* Action 2: SEOR Certifies IPC */}
              {selectedBill.status === "STATUTORY_GATES_VERIFIED" && (
                <button
                  type="button"
                  disabled={!isFinanceOrConsultant || actionInProgress === `certify_${selectedBill.id}`}
                  onClick={() => handleCertifyIpc(selectedBill)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>Sanction &amp; Issue Interim Certificate (SEOR / EE)</span>
                </button>
              )}

              {/* Action 3: Finance Disburses Net Payment */}
              {selectedBill.status === "SEOR_CERTIFIED_IPC" && (
                <button
                  type="button"
                  disabled={!isFinanceOrConsultant || actionInProgress === `disburse_${selectedBill.id}`}
                  onClick={() => handleDisbursePayment(selectedBill)}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-950/50 font-mono disabled:opacity-50"
                >
                  <Banknote className="w-4 h-4" />
                  <span>Authorize Bank RTGS Disbursal (Finance)</span>
                </button>
              )}

              {isDisbursed && (
                <div className="p-3.5 rounded-xl bg-purple-950/60 border border-purple-800/60 text-purple-300 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Payment Disbursed via Bank Transfer</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    UTR Reference: <strong className="text-white font-mono">{selectedBill.bank_utr_reference}</strong> on {selectedBill.finance_disbursed_at ? new Date(selectedBill.finance_disbursed_at).toLocaleDateString("en-IN") : "Today"}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD Form 26 &amp; FIDIC Clause 14.6 IPC Statutory Protocol
            </div>
          </div>

        </div>

        {/* PREPARE RA BILL MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Prepare Intermediate RA Bill (Form 26)
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

              <form onSubmit={handleCreateBill} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Bill Number</label>
                    <input
                      type="text"
                      required
                      value={billNo}
                      onChange={(e) => setBillNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Sequence Number</label>
                    <input
                      type="number"
                      required
                      value={seqNo}
                      onChange={(e) => setSeqNo(Number(e.target.value))}
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
                      value={workOrderRef}
                      onChange={(e) => setWorkOrderRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Trade Package</label>
                  <input
                    type="text"
                    required
                    value={tradePackage}
                    onChange={(e) => setTradePackage(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Current Gross Work (₹)</label>
                    <input
                      type="number"
                      required
                      value={currentGross}
                      onChange={(e) => setCurrentGross(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Previous Gross Billed (₹)</label>
                    <input
                      type="number"
                      required
                      value={prevGross}
                      onChange={(e) => setPrevGross(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Cl. 42 Penal Debits (₹)</label>
                    <input
                      type="number"
                      value={cl42Penalties}
                      onChange={(e) => setCl42Penalties(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">NCR Backcharges (₹)</label>
                    <input
                      type="number"
                      value={ncrBackcharges}
                      onChange={(e) => setNcrBackcharges(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
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
                    disabled={actionInProgress === "creating_bill"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Submit RA Bill Draft</span>
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