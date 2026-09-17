"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  Banknote,
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
  Gavel,
  HardHat,
  Landmark,
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
  Users,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type AdvanceType =
  | "MOBILIZATION_ADVANCE_CL10B"
  | "PLANT_MACHINERY_ADVANCE_CL10B"
  | "SECURED_MATERIAL_ADVANCE_75PCT";

export type AdvanceRecoveryStatus =
  | "SANCTIONED_DISBURSED"
  | "RECOVERY_IN_PROGRESS"
  | "FULLY_RECOVERED_CLOSED"
  | "RECOVERY_DEFAULT_BG_INVOKE";

export interface AdvanceLedgerRecord {
  id: string;
  project_id: string;
  advance_sanction_ref: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  advance_type: AdvanceType;
  contract_value_inr: number;
  sanctioned_advance_inr: number;
  simple_interest_rate_pct: number;
  disbursement_date: string;
  bg_reference_no: string;
  bg_bank_name: string;
  bg_amount_inr: number;
  bg_expiry_date: string;
  recovery_start_threshold_pct: number;
  recovery_amortization_pct: number;
  recovery_completion_threshold_pct: number;
  cumulative_recovered_principal_inr: number;
  cumulative_recovered_interest_inr: number;
  outstanding_principal_inr: number;
  status: AdvanceRecoveryStatus;
  sanctioned_by: string;
  remarks?: string | null;
  created_at?: string;
}

export interface RecoveryInstallmentRecord {
  id: string;
  project_id: string;
  advance_sanction_ref: string;
  ra_bill_number: string;
  installment_number: number;
  recovery_date: string;
  gross_bill_amount_inr: number;
  principal_recovered_inr: number;
  interest_recovered_inr: number;
  total_recovered_inr: number;
  closing_balance_principal_inr: number;
  bg_eligible_reduction_inr: number;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeAdvanceLedger(d: any): AdvanceLedgerRecord {
  const sanctioned = Number(d?.sanctioned_advance_inr ?? 0);
  const recPrincipal = Number(d?.cumulative_recovered_principal_inr ?? 0);
  const outstanding = Math.max(0, Number(d?.outstanding_principal_inr ?? (sanctioned - recPrincipal)));

  let derivedStatus: AdvanceRecoveryStatus = (d?.status as AdvanceRecoveryStatus) ?? "SANCTIONED_DISBURSED";
  if (outstanding <= 0 && sanctioned > 0) {
    derivedStatus = "FULLY_RECOVERED_CLOSED";
  } else if (recPrincipal > 0) {
    derivedStatus = "RECOVERY_IN_PROGRESS";
  }

  return {
    id: d?.id ?? `adv-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    advance_sanction_ref: d?.advance_sanction_ref ?? `ADV-${Date.now().toString().slice(-4)}`,
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    advance_type: (d?.advance_type as AdvanceType) ?? "MOBILIZATION_ADVANCE_CL10B",
    contract_value_inr: Number(d?.contract_value_inr ?? 0),
    sanctioned_advance_inr: sanctioned,
    simple_interest_rate_pct: Number(d?.simple_interest_rate_pct ?? 10.0),
    disbursement_date: d?.disbursement_date ?? new Date().toISOString().slice(0, 10),
    bg_reference_no: d?.bg_reference_no ?? "BG-MOB-2026-001",
    bg_bank_name: d?.bg_bank_name ?? "State Bank of India",
    bg_amount_inr: Number(d?.bg_amount_inr ?? (sanctioned * 1.1)),
    bg_expiry_date: d?.bg_expiry_date ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    recovery_start_threshold_pct: Number(d?.recovery_start_threshold_pct ?? 10.0),
    recovery_amortization_pct: Number(d?.recovery_amortization_pct ?? 15.0),
    recovery_completion_threshold_pct: Number(d?.recovery_completion_threshold_pct ?? 80.0),
    cumulative_recovered_principal_inr: recPrincipal,
    cumulative_recovered_interest_inr: Number(d?.cumulative_recovered_interest_inr ?? 0),
    outstanding_principal_inr: outstanding,
    status: derivedStatus,
    sanctioned_by: d?.sanctioned_by ?? "Project Director",
    remarks: d?.remarks ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalAdvanceRecoveryPage() {
  const { project, role, tier } = useActiveRole();
  const [advances, setAdvances] = useState<AdvanceLedgerRecord[]>([]);
  const [installments, setInstallments] = useState<RecoveryInstallmentRecord[]>([]);
  const [selectedAdvance, setSelectedAdvance] = useState<AdvanceLedgerRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [sanctionModalOpen, setSanctionModalOpen] = useState(false);
  const [installmentModalOpen, setInstallmentModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Lead Quantity Surveyor";
  const isFinanceOrDirector =
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "QS_BILLING_HEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Finance") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Surveyor") ||
    roleLabel.includes("Lead");

  // Form State for Sanctioning Advance
  const [advRef, setAdvRef] = useState(`ADV-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-10${Math.floor(1 + Math.random() * 9)}`);
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [advType, setAdvType] = useState<AdvanceType>("MOBILIZATION_ADVANCE_CL10B");
  const [contractVal, setContractVal] = useState<number>(tier === "RESIDENTIAL" ? 2745000 : 83200000);
  const [advAmount, setAdvAmount] = useState<number>(tier === "RESIDENTIAL" ? 274500 : 8320000); // 10%
  const [intRate, setIntRate] = useState<number>(tier === "RESIDENTIAL" ? 0 : 10.0);
  const [bgRef, setBgRef] = useState("BG-SBI-ADV-2026-8812");
  const [bgBank, setBgBank] = useState("State Bank of India (Commercial Branch)");
  const [bgAmount, setBgAmount] = useState<number>(tier === "RESIDENTIAL" ? 274500 : 9152000); // 110%
  const [amortizationPct, setAmortizationPct] = useState<number>(15.0);

  // Form State for Recording Installment
  const [targetRaBill, setTargetRaBill] = useState(tier === "RESIDENTIAL" ? "RA-RES-03" : "RA-TWR-06");
  const [grossBillAmount, setGrossBillAmount] = useState<number>(tier === "RESIDENTIAL" ? 650000 : 16500000);
  const [principalDeduction, setPrincipalDeduction] = useState<number>(tier === "RESIDENTIAL" ? 97500 : 2475000); // 15%

  const loadAdvanceData = useCallback(async () => {
    try {
      const [{ data: advData }, { data: instData }] = await Promise.all([
        (supabase as any)
          .from("subcontractor_advance_ledgers")
          .select("*")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("advance_recovery_installments")
          .select("*")
          .eq("project_id", projectId)
          .order("recovery_date", { ascending: false }),
      ]);

      if (advData && advData.length > 0) {
        const normalized = advData.map((d: any) => normalizeAdvanceLedger(d));
        setAdvances(normalized);
        if (!selectedAdvance) setSelectedAdvance(normalized[0]);
      } else {
        const defaults: AdvanceLedgerRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeAdvanceLedger({
                  id: "adv-res-01",
                  project_id: projectId,
                  advance_sanction_ref: "ADV-RES-101",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  advance_type: "MOBILIZATION_ADVANCE_CL10B",
                  contract_value_inr: 2745000,
                  sanctioned_advance_inr: 274500,
                  simple_interest_rate_pct: 0.0,
                  disbursement_date: "2026-08-22",
                  bg_reference_no: "BG-HDFC-RES-9912",
                  bg_bank_name: "HDFC Bank (Hazratganj Branch)",
                  bg_amount_inr: 274500,
                  recovery_start_threshold_pct: 10.0,
                  recovery_amortization_pct: 15.0,
                  recovery_completion_threshold_pct: 80.0,
                  cumulative_recovered_principal_inr: 97500,
                  outstanding_principal_inr: 177000,
                  status: "RECOVERY_IN_PROGRESS",
                  sanctioned_by: "Principal Architect",
                  remarks: "Interest-free residential mobilization advance. Amortizing across interim bills.",
                }),
              ]
            : [
                normalizeAdvanceLedger({
                  id: "adv-twr-01",
                  project_id: projectId,
                  advance_sanction_ref: "ADV-TWR-101",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  advance_type: "MOBILIZATION_ADVANCE_CL10B",
                  contract_value_inr: 83200000,
                  sanctioned_advance_inr: 8320000,
                  simple_interest_rate_pct: 10.0,
                  disbursement_date: "2026-04-10",
                  bg_reference_no: "BG-SBI-ADV-2026-8812",
                  bg_bank_name: "State Bank of India (CAG Lucknow)",
                  bg_amount_inr: 9152000,
                  recovery_start_threshold_pct: 10.0,
                  recovery_amortization_pct: 15.0,
                  recovery_completion_threshold_pct: 80.0,
                  cumulative_recovered_principal_inr: 4950000,
                  cumulative_recovered_interest_inr: 345000,
                  outstanding_principal_inr: 3370000,
                  status: "RECOVERY_IN_PROGRESS",
                  sanctioned_by: "Project Director",
                  remarks: "Mobilization advance under CPWD Clause 10B. 110% BG active with pro-rata replacement clause.",
                }),
              ];

        setAdvances(defaults);
        if (!selectedAdvance) setSelectedAdvance(defaults[0]);
      }

      if (instData && instData.length > 0) {
        setInstallments(instData as RecoveryInstallmentRecord[]);
      } else {
        const defaultInst: RecoveryInstallmentRecord[] = [
          {
            id: "inst-01",
            project_id: projectId,
            advance_sanction_ref: tier === "RESIDENTIAL" ? "ADV-RES-101" : "ADV-TWR-101",
            ra_bill_number: tier === "RESIDENTIAL" ? "RA-RES-02" : "RA-TWR-05",
            installment_number: 1,
            recovery_date: "2026-08-15",
            gross_bill_amount_inr: tier === "RESIDENTIAL" ? 650000 : 16500000,
            principal_recovered_inr: tier === "RESIDENTIAL" ? 97500 : 2475000,
            interest_recovered_inr: tier === "RESIDENTIAL" ? 0 : 172500,
            total_recovered_inr: tier === "RESIDENTIAL" ? 97500 : 2647500,
            closing_balance_principal_inr: tier === "RESIDENTIAL" ? 177000 : 5845000,
            bg_eligible_reduction_inr: tier === "RESIDENTIAL" ? 97500 : 2722500,
            created_at: new Date().toISOString(),
          },
          {
            id: "inst-02",
            project_id: projectId,
            advance_sanction_ref: "ADV-TWR-101",
            ra_bill_number: "RA-TWR-06",
            installment_number: 2,
            recovery_date: "2026-09-08",
            gross_bill_amount_inr: 16500000,
            principal_recovered_inr: 2475000,
            interest_recovered_inr: 172500,
            total_recovered_inr: 2647500,
            closing_balance_principal_inr: 3370000,
            bg_eligible_reduction_inr: 2722500,
            created_at: new Date().toISOString(),
          },
        ];
        setInstallments(defaultInst);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedAdvance, tier]);

  useEffect(() => {
    void loadAdvanceData();

    const channel = supabase
      .channel(`advances_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "subcontractor_advance_ledgers" }, () => void loadAdvanceData())
      .on("postgres_changes", { event: "*", schema: "public", table: "advance_recovery_installments" }, () => void loadAdvanceData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadAdvanceData]);

  const currentAdvanceInstallments = useMemo(() => {
    if (!selectedAdvance) return [];
    return installments.filter((i) => i.advance_sanction_ref === selectedAdvance.advance_sanction_ref);
  }, [installments, selectedAdvance]);

  const summary = useMemo(() => {
    const totalAdvances = advances.length;
    const totalSanctionedInr = advances.reduce((sum, a) => sum + Number(a.sanctioned_advance_inr || 0), 0);
    const totalRecoveredPrincipalInr = advances.reduce((sum, a) => sum + Number(a.cumulative_recovered_principal_inr || 0), 0);
    const totalOutstandingPrincipalInr = advances.reduce((sum, a) => sum + Number(a.outstanding_principal_inr || 0), 0);
    const totalBgCoverInr = advances
      .filter((a) => a.status !== "FULLY_RECOVERED_CLOSED")
      .reduce((sum, a) => sum + Number(a.bg_amount_inr || 0), 0);

    return { totalAdvances, totalSanctionedInr, totalRecoveredPrincipalInr, totalOutstandingPrincipalInr, totalBgCoverInr };
  }, [advances]);

  const filteredAdvances = useMemo(() => {
    return advances.filter((a) => {
      const matchStatus = filterStatus === "ALL" || a.status === filterStatus;
      const haystack = `${a.advance_sanction_ref} ${a.contractor_name} ${a.work_order_ref} ${a.bg_reference_no}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [advances, filterStatus, search]);

  // Sanction New Advance (CPWD Form 10B)
  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_adv");

    const newDbRecord: Omit<AdvanceLedgerRecord, "id"> = {
      project_id: projectId,
      advance_sanction_ref: advRef.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      advance_type: advType,
      contract_value_inr: Number(contractVal),
      sanctioned_advance_inr: Number(advAmount),
      simple_interest_rate_pct: Number(intRate),
      disbursement_date: new Date().toISOString().slice(0, 10),
      bg_reference_no: bgRef.trim(),
      bg_bank_name: bgBank.trim(),
      bg_amount_inr: Number(bgAmount),
      bg_expiry_date: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
      recovery_start_threshold_pct: 10.0,
      recovery_amortization_pct: Number(amortizationPct),
      recovery_completion_threshold_pct: 80.0,
      cumulative_recovered_principal_inr: 0,
      cumulative_recovered_interest_inr: 0,
      outstanding_principal_inr: Number(advAmount),
      status: "SANCTIONED_DISBURSED",
      sanctioned_by: roleLabel || "Project Director",
      remarks: "Mobilization advance sanctioned per CPWD Clause 10B / FIDIC 14.2.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("subcontractor_advance_ledgers")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeAdvanceLedger(data);
        setAdvances((prev) => [normalized, ...prev]);
        setSelectedAdvance(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeAdvanceLedger({ ...newDbRecord, id: `adv-${Date.now()}` });
      setAdvances((prev) => [fallback, ...prev]);
      setSelectedAdvance(fallback);
    }

    setSanctionModalOpen(false);
    setActionInProgress(null);
  };

  // Record Amortization Installment from RA Bill
  const handleRecordInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvance) return;
    setActionInProgress("recording_inst");

    const pDeduct = Number(principalDeduction);
    const intDeduct = selectedAdvance.simple_interest_rate_pct > 0 ? Math.round(pDeduct * 0.07) : 0;
    const totalRec = pDeduct + intDeduct;
    const newOut = Math.max(0, selectedAdvance.outstanding_principal_inr - pDeduct);
    const newCumPrinc = selectedAdvance.cumulative_recovered_principal_inr + pDeduct;
    const newCumInt = selectedAdvance.cumulative_recovered_interest_inr + intDeduct;
    const nextStatus: AdvanceRecoveryStatus = newOut <= 0 ? "FULLY_RECOVERED_CLOSED" : "RECOVERY_IN_PROGRESS";

    const newInstRecord: Omit<RecoveryInstallmentRecord, "id"> = {
      project_id: projectId,
      advance_sanction_ref: selectedAdvance.advance_sanction_ref,
      ra_bill_number: targetRaBill.trim(),
      installment_number: currentAdvanceInstallments.length + 1,
      recovery_date: new Date().toISOString().slice(0, 10),
      gross_bill_amount_inr: Number(grossBillAmount),
      principal_recovered_inr: pDeduct,
      interest_recovered_inr: intDeduct,
      total_recovered_inr: totalRec,
      closing_balance_principal_inr: newOut,
      bg_eligible_reduction_inr: Math.round(pDeduct * 1.1),
    };

    try {
      await (supabase as any)
        .from("advance_recovery_installments")
        .insert([newInstRecord]);

      await (supabase as any)
        .from("subcontractor_advance_ledgers")
        .update({
          cumulative_recovered_principal_inr: newCumPrinc,
          cumulative_recovered_interest_inr: newCumInt,
          outstanding_principal_inr: newOut,
          status: nextStatus,
        })
        .eq("id", selectedAdvance.id);
    } catch {
      // Local optimistic update
    }

    const updatedAdv: AdvanceLedgerRecord = {
      ...selectedAdvance,
      cumulative_recovered_principal_inr: newCumPrinc,
      cumulative_recovered_interest_inr: newCumInt,
      outstanding_principal_inr: newOut,
      status: nextStatus,
    };

    setSelectedAdvance(updatedAdv);
    setAdvances((prev) => prev.map((a) => (a.id === selectedAdvance.id ? updatedAdv : a)));
    setInstallments((prev) => [{ ...newInstRecord, id: `inst-${Date.now()}` }, ...prev]);

    setFeedbackMessage(`Installment recorded from ${targetRaBill}. ${formatInr(pDeduct)} amortized.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setInstallmentModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form 10B / Advance Statement Print
  const handlePrintAdvanceStatement = (adv: AdvanceLedgerRecord, instList: RecoveryInstallmentRecord[]) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Subcontractor Mobilization Advance &amp; Recovery Statement (CPWD Clause 10B) — ${adv.advance_sanction_ref}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .active { background: #e0f2fe; color: #0369a1; border: 1px solid #0284c7; }
    .closed { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD GCC Clause 10B / FIDIC Red Book Clause 14.2</div>
      <h1 class="title">Statutory Mobilization Advance &amp; Recovery Ledger</h1>
      <div class="meta">Sanction Ref: ${adv.advance_sanction_ref} · Disbursed: ${adv.disbursement_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${adv.status === "FULLY_RECOVERED_CLOSED" ? "closed" : "active"}">${adv.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Subcontractor</th><td><strong>${adv.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${adv.work_order_ref}</strong></td></tr>
    <tr><th>Advance Classification</th><td><strong>${adv.advance_type.replace(/_/g, " ")}</strong></td><th>Simple Interest Rate</th><td><strong>${adv.simple_interest_rate_pct}% per annum</strong></td></tr>
    <tr><th>Original Contract Value</th><td>₹${adv.contract_value_inr.toLocaleString("en-IN")}</td><th>Sanctioned Advance Quantum</th><td class="tar" style="font-size: 13px; font-weight: bold; color: #0369a1;">₹${adv.sanctioned_advance_inr.toLocaleString("en-IN")}</td></tr>
    <tr><th>Bank Guarantee Ref (BGMA)</th><td><code>${adv.bg_reference_no}</code> (${adv.bg_bank_name})</td><th>Bank Guarantee Amount</th><td class="tar font-bold">₹${adv.bg_amount_inr.toLocaleString("en-IN")} (110%)</td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">CPWD Clause 10B Amortization Milestone Terms</div>
    <div>Recovery Start Milestone: <strong>${adv.recovery_start_threshold_pct}% Gross Work Done</strong> &bull; Amortization Rate: <strong>${adv.recovery_amortization_pct}% per Running Account Bill</strong> &bull; Completion Target: <strong>Prior to ${adv.recovery_completion_threshold_pct}% Work Completion</strong></div>
  </div>

  <table>
    <thead>
      <tr>
        <th class="tac">Inst #</th>
        <th>Recovery Date</th>
        <th>Target RA Bill</th>
        <th class="tar">Gross Bill Value (INR)</th>
        <th class="tar">Principal Amortized (INR)</th>
        <th class="tar">Interest Deducted (INR)</th>
        <th class="tar">Closing Principal Balance</th>
      </tr>
    </thead>
    <tbody>
      ${instList.map((i) => `
        <tr>
          <td class="tac font-bold">${i.installment_number}</td>
          <td>${i.recovery_date}</td>
          <td><strong>${i.ra_bill_number}</strong></td>
          <td class="tar">₹${i.gross_bill_amount_inr.toLocaleString("en-IN")}</td>
          <td class="tar font-bold" style="color: #15803d;">-₹${i.principal_recovered_inr.toLocaleString("en-IN")}</td>
          <td class="tar">-₹${i.interest_recovered_inr.toLocaleString("en-IN")}</td>
          <td class="tar font-bold" style="color: #0369a1;">₹${i.closing_balance_principal_inr.toLocaleString("en-IN")}</td>
        </tr>
      `).join("")}
      <tr class="total-row" style="background: #e0f2fe;">
        <td colspan="4"><strong>CUMULATIVE ADVANCE RECOVERY TOTALS</strong></td>
        <td class="tar font-bold" style="color: #15803d; font-size: 12px;">₹${adv.cumulative_recovered_principal_inr.toLocaleString("en-IN")}</td>
        <td class="tar font-bold">₹${adv.cumulative_recovered_interest_inr.toLocaleString("en-IN")}</td>
        <td class="tar font-bold" style="color: #b91c1c; font-size: 13px;">₹${adv.outstanding_principal_inr.toLocaleString("en-IN")} Outstanding</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Lead Quantity Surveyor</div>
      <div style="color: #64748b;">Amortization Deductions Reconciled</div>
      <div class="sig">QS Audit Seal</div>
    </div>
    <div>
      <div>Subcontractor Representative</div>
      <div style="color: #64748b;">${adv.contractor_name}</div>
      <div class="sig">Contractor Acknowledgment</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">Clause 10B Ledger Certified</div>
      <div class="sig">Director Sanction Order</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedAdvance) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING MOBILIZATION ADVANCE &amp; RECOVERY WATERFALL ENGINE...
      </div>
    );
  }

  const recoveryPct = selectedAdvance.sanctioned_advance_inr > 0
    ? Math.round((selectedAdvance.cumulative_recovered_principal_inr / selectedAdvance.sanctioned_advance_inr) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Financial Governance · CPWD GCC Clause 10B / FIDIC Red Book Clause 14.2</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Subcontractor Mobilization Advance &amp; Recovery Waterfall
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Capital advance and amortization waterfall clearinghouse. Governs 10% mobilization advances against 110% Bank Guarantees, calculates simple interest accruals, enforces automated 15% deductions from intermediate RA Bills, and manages pro-rata BG reductions.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintAdvanceStatement(selectedAdvance, currentAdvanceInstallments)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 10B Statement</span>
            </button>
            <Link
              href="/finance/ra-bills"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              <span>Running Account Bills</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setAdvRef(`ADV-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-10${advances.length + 1}`);
                setSanctionModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Sanction Advance</span>
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
              <span>Outstanding Advance Principal</span>
              <AlertOctagon className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold text-amber-400 mt-2">
              {formatInr(summary.totalOutstandingPrincipalInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Remaining capital exposure</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Cumulative Principal Recovered</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalRecoveredPrincipalInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Amortized from intermediate RA bills</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Bank Guarantee Cover</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-cyan-300 mt-2">
              {formatInr(summary.totalBgCoverInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">110% BG collateral security active</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Sanctioned Advances</span>
              <Coins className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.totalSanctionedInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{summary.totalAdvances} advances disbursed</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Advances (${advances.length})` },
              { key: "RECOVERY_IN_PROGRESS", label: "Recovery in Progress" },
              { key: "SANCTIONED_DISBURSED", label: "Disbursed (Pre-Recovery)" },
              { key: "FULLY_RECOVERED_CLOSED", label: "Fully Recovered" },
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
              placeholder="Search sanction ref, contractor, BG..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: ADVANCES ROSTER (5 cols) vs AMORTIZATION WATERFALL DESK (7 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: ADVANCES LISTING (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  CPWD Form 10B Ledger
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Sanctioned Mobilization Advances</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredAdvances.length} Records</span>
            </div>

            <div className="space-y-3">
              {filteredAdvances.map((adv) => {
                const isSelected = selectedAdvance.id === adv.id;
                const isRecovering = adv.status === "RECOVERY_IN_PROGRESS";

                return (
                  <div
                    key={adv.id}
                    onClick={() => setSelectedAdvance(adv)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {adv.advance_sanction_ref}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          adv.status === "FULLY_RECOVERED_CLOSED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : isRecovering
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {adv.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-amber-400">
                          {formatInr(adv.outstanding_principal_inr)} Out
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Total: {formatInr(adv.sanctioned_advance_inr)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{adv.contractor_name}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {adv.trade_package} &bull; Work Order: <strong className="text-zinc-200">{adv.work_order_ref}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>BG Ref: <strong className="text-zinc-300">{adv.bg_reference_no}</strong></span>
                      <span>Recovered: <strong className="text-emerald-400">{Math.round((adv.cumulative_recovered_principal_inr / adv.sanctioned_advance_inr) * 100)}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: WATERFALL AMORTIZATION & DEDUCTION DESK (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Amortization Waterfall Telemetry
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedAdvance.advance_sanction_ref} &mdash; {selectedAdvance.contractor_name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTargetRaBill(tier === "RESIDENTIAL" ? "RA-RES-03" : "RA-TWR-06");
                    setGrossBillAmount(tier === "RESIDENTIAL" ? 650000 : 16500000);
                    setPrincipalDeduction(tier === "RESIDENTIAL" ? 97500 : 2475000);
                    setInstallmentModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-mono font-bold flex items-center gap-1 shadow-md shadow-cyan-950/50"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Deduct Installment</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-zinc-500 block">Sanctioned Advance:</span>
                  <strong className="text-white text-sm font-bold block mt-0.5">{formatInr(selectedAdvance.sanctioned_advance_inr)} ({selectedAdvance.simple_interest_rate_pct}% p.a.)</strong>
                </div>
                <div>
                  <span className="text-zinc-500 block">Collateral Bank Guarantee:</span>
                  <span className="text-cyan-300 font-bold block mt-0.5">{formatInr(selectedAdvance.bg_amount_inr)} ({selectedAdvance.bg_bank_name})</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Amortization Rate:</span>
                  <span className="text-white font-bold">{selectedAdvance.recovery_amortization_pct}% per RA Bill</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Completion Target:</span>
                  <span className="text-zinc-200">Prior to {selectedAdvance.recovery_completion_threshold_pct}% Work Done</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">BG Expiry Date:</span>
                  <span className="text-amber-400 font-bold">{selectedAdvance.bg_expiry_date}</span>
                </div>
              </div>
            </div>

            {/* PROGRESS WATERFALL BAR */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-zinc-400">Cumulative Recovery Progress:</span>
                <span className="text-emerald-400 font-bold">{recoveryPct}% Recovered ({formatInr(selectedAdvance.cumulative_recovered_principal_inr)})</span>
              </div>
              <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, recoveryPct)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
                <span>Start: 10% Work Done</span>
                <span>Outstanding: <strong className="text-amber-400">{formatInr(selectedAdvance.outstanding_principal_inr)}</strong></span>
                <span>Ceiling: 80% Work Done</span>
              </div>
            </div>

            {/* RECOVERY INSTALLMENTS SCHEDULE */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                  Executed Amortization Installments:
                </span>
                <span className="text-[10px] text-zinc-400">{currentAdvanceInstallments.length} Installments Logged</span>
              </div>

              <div className="space-y-2.5">
                {currentAdvanceInstallments.map((inst) => (
                  <div
                    key={inst.id}
                    className="p-3 rounded-xl border border-zinc-800 bg-zinc-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Inst #{inst.installment_number}</span>
                        <span className="text-cyan-300 font-bold">{inst.ra_bill_number}</span>
                        <span className="text-zinc-500 text-[10px]">({inst.recovery_date})</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        Gross Bill: {formatInr(inst.gross_bill_amount_inr)} &bull; Eligible BG Reduction: <strong className="text-emerald-400">{formatInr(inst.bg_eligible_reduction_inr)}</strong>
                      </div>
                    </div>

                    <div className="text-right font-mono">
                      <span className="text-xs font-bold text-emerald-400">
                        -{formatInr(inst.principal_recovered_inr)}
                      </span>
                      <div className="text-[10px] text-zinc-500">
                        Closing: {formatInr(inst.closing_balance_principal_inr)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD GCC Clause 10B &amp; FIDIC Red Book Clause 14.2 Protocol
            </div>
          </div>

        </div>

        {/* SANCTION ADVANCE MODAL */}
        {sanctionModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Sanction Subcontractor Advance (Clause 10B)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSanctionModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateAdvance} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Sanction Ref Code</label>
                    <input
                      type="text"
                      required
                      value={advRef}
                      onChange={(e) => setAdvRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Advance Type</label>
                    <select
                      value={advType}
                      onChange={(e) => setAdvType(e.target.value as AdvanceType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="MOBILIZATION_ADVANCE_CL10B">Mobilization Advance (Clause 10B)</option>
                      <option value="PLANT_MACHINERY_ADVANCE_CL10B">Plant &amp; Machinery Advance</option>
                      <option value="SECURED_MATERIAL_ADVANCE_75PCT">Secured Material Advance (75%)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Entity</label>
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

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contract Value (₹)</label>
                    <input
                      type="number"
                      required
                      value={contractVal}
                      onChange={(e) => setContractVal(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Advance Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={advAmount}
                      onChange={(e) => setAdvAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Interest (% p.a.)</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={intRate}
                      onChange={(e) => setIntRate(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Bank Guarantee Ref No.</label>
                    <input
                      type="text"
                      required
                      value={bgRef}
                      onChange={(e) => setBgRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">BG Amount (110% Cover) (₹)</label>
                    <input
                      type="number"
                      required
                      value={bgAmount}
                      onChange={(e) => setBgAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Issuing Commercial Bank</label>
                  <input
                    type="text"
                    required
                    value={bgBank}
                    onChange={(e) => setBgBank(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setSanctionModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "creating_adv"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Disburse Advance</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DEDUCT INSTALLMENT MODAL */}
        {installmentModalOpen && selectedAdvance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Deduct Advance Installment from RA Bill
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setInstallmentModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleRecordInstallment} className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-zinc-900/60 border border-zinc-800 font-mono text-[11px] space-y-1">
                  <div className="text-zinc-400">Advance Ref: <strong className="text-white">{selectedAdvance.advance_sanction_ref}</strong></div>
                  <div className="text-zinc-400">Outstanding Balance: <strong className="text-amber-400">{formatInr(selectedAdvance.outstanding_principal_inr)}</strong></div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Target RA Bill Ref</label>
                    <input
                      type="text"
                      required
                      value={targetRaBill}
                      onChange={(e) => setTargetRaBill(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Gross Bill Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={grossBillAmount}
                      onChange={(e) => setGrossBillAmount(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Principal Amortization Deduction (₹)</label>
                  <input
                    type="number"
                    required
                    value={principalDeduction}
                    onChange={(e) => setPrincipalDeduction(Number(e.target.value))}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setInstallmentModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "recording_inst"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Commit Amortization</span>
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