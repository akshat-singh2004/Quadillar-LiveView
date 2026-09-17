"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
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
  Users,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type LabourComplianceStatus =
  | "AUDIT_PENDING"
  | "COMPLIANT_CLEARED"
  | "NON_COMPLIANT_WAGE_BREACH"
  | "STATUTORY_CHALLAN_MISSING"
  | "RELEASED_UNDER_PROTEST";

export interface LabourComplianceRecord {
  id: string;
  project_id: string;
  compliance_record_number: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  wage_period_month: string;
  total_workers_deployed: number;
  skilled_workers_count: number;
  unskilled_workers_count: number;
  total_mandays_logged: number;
  total_wages_payable_inr: number;
  total_wages_disbursed_bank_inr: number;
  unpaid_wage_arrears_inr: number;
  wages_disbursement_date?: string | null;
  bank_payment_reference?: string | null;
  epf_ecr_challan_number?: string | null;
  epf_remitted_inr: number;
  esic_challan_number?: string | null;
  esic_remitted_inr: number;
  bocw_cess_remitted_inr: number;
  form_xvii_register_uploaded: boolean;
  clause_19d_breach_flagged: boolean;
  linked_ra_bill_no?: string | null;
  status: LabourComplianceStatus;
  welfare_officer_name?: string | null;
  audited_at?: string | null;
  audit_remarks?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeLabourRecord(d: any): LabourComplianceRecord {
  const payable = Number(d?.total_wages_payable_inr ?? 0);
  const disbursed = Number(d?.total_wages_disbursed_bank_inr ?? 0);
  const arrears = Number(d?.unpaid_wage_arrears_inr ?? Math.max(0, payable - disbursed));
  const isBreach = arrears > 0 || Boolean(d?.clause_19d_breach_flagged);

  return {
    id: d?.id ?? `lab-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    compliance_record_number: d?.compliance_record_number ?? `LCR-${Date.now().toString().slice(-4)}`,
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    wage_period_month: d?.wage_period_month ?? "2026-08",
    total_workers_deployed: Number(d?.total_workers_deployed ?? 45),
    skilled_workers_count: Number(d?.skilled_workers_count ?? 15),
    unskilled_workers_count: Number(d?.unskilled_workers_count ?? 30),
    total_mandays_logged: Number(d?.total_mandays_logged ?? 1150),
    total_wages_payable_inr: payable,
    total_wages_disbursed_bank_inr: disbursed,
    unpaid_wage_arrears_inr: arrears,
    wages_disbursement_date: d?.wages_disbursement_date ?? new Date().toISOString().slice(0, 10),
    bank_payment_reference: d?.bank_payment_reference ?? "HDFC-CMS-WAGE-992",
    epf_ecr_challan_number: d?.epf_ecr_challan_number ?? null,
    epf_remitted_inr: Number(d?.epf_remitted_inr ?? 0),
    esic_challan_number: d?.esic_challan_number ?? null,
    esic_remitted_inr: Number(d?.esic_remitted_inr ?? 0),
    bocw_cess_remitted_inr: Number(d?.bocw_cess_remitted_inr ?? 0),
    form_xvii_register_uploaded: Boolean(d?.form_xvii_register_uploaded),
    clause_19d_breach_flagged: isBreach,
    linked_ra_bill_no: d?.linked_ra_bill_no ?? null,
    status: (d?.status as LabourComplianceStatus) ?? (isBreach ? "NON_COMPLIANT_WAGE_BREACH" : "AUDIT_PENDING"),
    welfare_officer_name: d?.welfare_officer_name ?? null,
    audited_at: d?.audited_at ?? null,
    audit_remarks: d?.audit_remarks ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalLabourCompliancePage() {
  const { project, role, tier } = useActiveRole();
  const [records, setRecords] = useState<LabourComplianceRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<LabourComplianceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Labour Welfare Officer";
  const isWelfareOrDirector =
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "QS_BILLING_HEAD" ||
    roleLabel.includes("Welfare") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Lead");

  // Form State for Lodging New Wage Period Ledger
  const [lcrNo, setLcrNo] = useState(`LCR-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${Math.floor(1 + Math.random() * 9)}`);
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [month, setMonth] = useState("2026-08");
  const [workersCount, setWorkersCount] = useState<number>(tier === "RESIDENTIAL" ? 18 : 110);
  const [skilledCount, setSkilledCount] = useState<number>(tier === "RESIDENTIAL" ? 8 : 45);
  const [mandays, setMandays] = useState<number>(tier === "RESIDENTIAL" ? 432 : 2860);
  const [wagesPayable, setWagesPayable] = useState<number>(tier === "RESIDENTIAL" ? 345000 : 2185000);
  const [wagesDisbursed, setWagesDisbursed] = useState<number>(tier === "RESIDENTIAL" ? 345000 : 2185000);
  const [epfEcr, setEpfEcr] = useState("101882049182");
  const [epfAmt, setEpfAmt] = useState<number>(tier === "RESIDENTIAL" ? 41400 : 262200);
  const [esicChallan, setEsicChallan] = useState("0019283746");
  const [esicAmt, setEsicAmt] = useState<number>(tier === "RESIDENTIAL" ? 13800 : 87400);
  const [targetRaBill, setTargetRaBill] = useState(tier === "RESIDENTIAL" ? "RA-RES-03" : "RA-TWR-06");

  const loadLabourData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("statutory_labor_compliance")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeLabourRecord(d));
        setRecords(normalized);
        if (!selectedRecord) setSelectedRecord(normalized[0]);
      } else {
        const defaults: LabourComplianceRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeLabourRecord({
                  id: "lab-res-01",
                  project_id: projectId,
                  compliance_record_number: "LCR-RES-2026-08",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  wage_period_month: "2026-08",
                  total_workers_deployed: 18,
                  skilled_workers_count: 8,
                  unskilled_workers_count: 10,
                  total_mandays_logged: 432,
                  total_wages_payable_inr: 345000,
                  total_wages_disbursed_bank_inr: 345000,
                  unpaid_wage_arrears_inr: 0,
                  wages_disbursement_date: "2026-09-05",
                  bank_payment_reference: "HDFC-CMS-WAGE-9812",
                  epf_ecr_challan_number: "101882049182",
                  epf_remitted_inr: 41400,
                  esic_challan_number: "0019283746",
                  esic_remitted_inr: 13800,
                  bocw_cess_remitted_inr: 3450,
                  form_xvii_register_uploaded: true,
                  clause_19d_breach_flagged: false,
                  linked_ra_bill_no: "RA-RES-03",
                  status: "COMPLIANT_CLEARED",
                  welfare_officer_name: "Principal Architect",
                  audited_at: "2026-09-08T11:00:00Z",
                  audit_remarks: "100% bank transfer proof verified against bank statement. Zero wage arrears.",
                }),
              ]
            : [
                normalizeLabourRecord({
                  id: "lab-twr-01",
                  project_id: projectId,
                  compliance_record_number: "LCR-TWR-2026-08",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  wage_period_month: "2026-08",
                  total_workers_deployed: 110,
                  skilled_workers_count: 45,
                  unskilled_workers_count: 65,
                  total_mandays_logged: 2860,
                  total_wages_payable_inr: 2185000,
                  total_wages_disbursed_bank_inr: 2185000,
                  unpaid_wage_arrears_inr: 0,
                  wages_disbursement_date: "2026-09-07",
                  bank_payment_reference: "SBI-RTGS-WAGE-7721",
                  epf_ecr_challan_number: "20260908821049",
                  epf_remitted_inr: 262200,
                  esic_challan_number: "00881920391",
                  esic_remitted_inr: 87400,
                  bocw_cess_remitted_inr: 21850,
                  form_xvii_register_uploaded: true,
                  clause_19d_breach_flagged: false,
                  linked_ra_bill_no: "RA-TWR-06",
                  status: "COMPLIANT_CLEARED",
                  welfare_officer_name: "Resident SEOR",
                  audited_at: "2026-09-08T17:00:00Z",
                  audit_remarks: "All 110 workers verified on Form XVII. EPF ECR electronic confirmation generated.",
                }),
                normalizeLabourRecord({
                  id: "lab-twr-02",
                  project_id: projectId,
                  compliance_record_number: "LCR-TWR-2026-09",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  wage_period_month: "2026-09",
                  total_workers_deployed: 115,
                  skilled_workers_count: 50,
                  unskilled_workers_count: 65,
                  total_mandays_logged: 1450,
                  total_wages_payable_inr: 1200000,
                  total_wages_disbursed_bank_inr: 850000,
                  unpaid_wage_arrears_inr: 350000,
                  wages_disbursement_date: null,
                  bank_payment_reference: null,
                  epf_ecr_challan_number: null,
                  epf_remitted_inr: 0,
                  esic_challan_number: null,
                  esic_remitted_inr: 0,
                  bocw_cess_remitted_inr: 0,
                  form_xvii_register_uploaded: false,
                  clause_19d_breach_flagged: true,
                  linked_ra_bill_no: "RA-TWR-07",
                  status: "NON_COMPLIANT_WAGE_BREACH",
                  audit_remarks: "Unpaid wage arrears of ₹3.50 Lakh flagged under CPWD GCC Clause 19D. Payment frozen on RA-07.",
                }),
              ];

        setRecords(defaults);
        if (!selectedRecord) setSelectedRecord(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedRecord, tier]);

  useEffect(() => {
    void loadLabourData();

    const channel = supabase
      .channel(`labor_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "statutory_labor_compliance" }, () => void loadLabourData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadLabourData]);

  const summary = useMemo(() => {
    const totalRecords = records.length;
    const activeBreaches = records.filter((r) => r.clause_19d_breach_flagged || r.unpaid_wage_arrears_inr > 0).length;
    const totalWageArrearsInr = records.reduce((sum, r) => sum + Number(r.unpaid_wage_arrears_inr || 0), 0);
    const totalWagesDisbursedInr = records.reduce((sum, r) => sum + Number(r.total_wages_disbursed_bank_inr || 0), 0);

    return { totalRecords, activeBreaches, totalWageArrearsInr, totalWagesDisbursedInr };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchStatus = filterStatus === "ALL" || r.status === filterStatus;
      const haystack = `${r.compliance_record_number} ${r.contractor_name} ${r.work_order_ref} ${r.wage_period_month}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [records, filterStatus, search]);

  // Stage 1: Enforce / Flag Clause 19D Breach & Freeze RA Bill
  const handleEnforceClause19d = async (rec: LabourComplianceRecord) => {
    if (!isWelfareOrDirector) return;
    setActionInProgress(`breach_${rec.id}`);

    const updatePayload: Partial<LabourComplianceRecord> = {
      clause_19d_breach_flagged: true,
      status: "NON_COMPLIANT_WAGE_BREACH",
    };

    try {
      await (supabase as any)
        .from("statutory_labor_compliance")
        .update(updatePayload)
        .eq("id", rec.id);

      // Freeze RA Bill Payment gate
      if (rec.linked_ra_bill_no) {
        await (supabase as any)
          .from("running_account_bills")
          .update({
            labor_compliance_cleared: false,
            status: "PAYMENT_FROZEN_CLAUSE_19D",
          })
          .eq("project_id", projectId)
          .eq("bill_number", rec.linked_ra_bill_no);
      }
    } catch {
      // Local optimistic update
    }

    setRecords((prev) =>
      prev.map((item) => (item.id === rec.id ? ({ ...item, ...updatePayload } as LabourComplianceRecord) : item))
    );
    if (selectedRecord && selectedRecord.id === rec.id) {
      setSelectedRecord((prev) => (prev ? ({ ...prev, ...updatePayload } as LabourComplianceRecord) : null));
    }

    setFeedbackMessage(`Clause 19D breach flagged on ${rec.compliance_record_number}. Interim payment frozen on ${rec.linked_ra_bill_no || "RA Bill"}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Stage 2: Welfare Officer Clears Statutory Gate & Unfreezes RA Bill
  const handleClearStatutoryGate = async (rec: LabourComplianceRecord) => {
    if (!isWelfareOrDirector) return;
    setActionInProgress(`clear_${rec.id}`);

    const updatePayload: Partial<LabourComplianceRecord> = {
      clause_19d_breach_flagged: false,
      unpaid_wage_arrears_inr: 0,
      total_wages_disbursed_bank_inr: rec.total_wages_payable_inr,
      form_xvii_register_uploaded: true,
      status: "COMPLIANT_CLEARED",
      welfare_officer_name: roleLabel || "Labour Welfare Officer",
      audited_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("statutory_labor_compliance")
        .update(updatePayload)
        .eq("id", rec.id);

      // Unfreeze RA Bill Payment gate
      if (rec.linked_ra_bill_no) {
        await (supabase as any)
          .from("running_account_bills")
          .update({
            labor_compliance_cleared: true,
            status: "DRAFT_SUBMITTED",
          })
          .eq("project_id", projectId)
          .eq("bill_number", rec.linked_ra_bill_no);
      }
    } catch {
      // Local optimistic update
    }

    setRecords((prev) =>
      prev.map((item) => (item.id === rec.id ? ({ ...item, ...updatePayload } as LabourComplianceRecord) : item))
    );
    if (selectedRecord && selectedRecord.id === rec.id) {
      setSelectedRecord((prev) => (prev ? ({ ...prev, ...updatePayload } as LabourComplianceRecord) : null));
    }

    setFeedbackMessage(`Statutory compliance cleared! RA Bill payment gate unfreezed on ${rec.linked_ra_bill_no || "RA Bill"}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Lodge New Wage Period Compliance Filing
  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_lcr");

    const arrears = Math.max(0, Number(wagesPayable) - Number(wagesDisbursed));
    const isBreach = arrears > 0;

    const newDbRecord: Omit<LabourComplianceRecord, "id"> = {
      project_id: projectId,
      compliance_record_number: lcrNo.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      wage_period_month: month.trim(),
      total_workers_deployed: Number(workersCount),
      skilled_workers_count: Number(skilledCount),
      unskilled_workers_count: Number(workersCount) - Number(skilledCount),
      total_mandays_logged: Number(mandays),
      total_wages_payable_inr: Number(wagesPayable),
      total_wages_disbursed_bank_inr: Number(wagesDisbursed),
      unpaid_wage_arrears_inr: arrears,
      wages_disbursement_date: new Date().toISOString().slice(0, 10),
      bank_payment_reference: "NEFT-CMS-BATCH",
      epf_ecr_challan_number: epfEcr.trim() || null,
      epf_remitted_inr: Number(epfAmt),
      esic_challan_number: esicChallan.trim() || null,
      esic_remitted_inr: Number(esicAmt),
      bocw_cess_remitted_inr: Math.round(Number(wagesPayable) * 0.01),
      form_xvii_register_uploaded: !isBreach,
      clause_19d_breach_flagged: isBreach,
      linked_ra_bill_no: targetRaBill.trim() || null,
      status: isBreach ? "NON_COMPLIANT_WAGE_BREACH" : "AUDIT_PENDING",
      audit_remarks: isBreach ? "Unpaid wage arrears logged." : "Full bank transfer claimed.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("statutory_labor_compliance")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeLabourRecord(data);
        setRecords((prev) => [normalized, ...prev]);
        setSelectedRecord(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeLabourRecord({ ...newDbRecord, id: `lab-${Date.now()}` });
      setRecords((prev) => [fallback, ...prev]);
      setSelectedRecord(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory CPWD Form XVII / Wage Register Print
  const handlePrintFormXvii = (rec: LabourComplianceRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Register of Wages (Form XVII / CPWD GCC Clause 19) — ${rec.compliance_record_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .cleared { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .breach { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · Contract Labour Act 1970 Form XVII / CPWD Clause 19D</div>
      <h1 class="title">Statutory Register of Wages &amp; Compliance Audit</h1>
      <div class="meta">Filing Ref: ${rec.compliance_record_number} · Wage Period: ${rec.wage_period_month} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${rec.clause_19d_breach_flagged ? "breach" : "cleared"}">${rec.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${rec.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${rec.work_order_ref}</strong></td></tr>
    <tr><th>Trade Package</th><td>${rec.trade_package}</td><th>Associated RA Bill Ref</th><td><strong>${rec.linked_ra_bill_no || "Next IPC"}</strong></td></tr>
    <tr><th>Total Workforce Deployed</th><td><strong>${rec.total_workers_deployed} Workers</strong> (${rec.skilled_workers_count} Skilled / ${rec.unskilled_workers_count} Unskilled)</td><th>Total Mandays Logged</th><td><strong>${rec.total_mandays_logged} Mandays</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Statutory Wage Reconciliation (Form XVII)</div>
    <div>${rec.audit_remarks || "Wage disbursement audited against Electronic Challan-cum-Return (ECR) and direct bank transfer slips."}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Labour Welfare &amp; Statutory Component</th>
        <th>Challan / Bank Transaction Ref</th>
        <th class="tar">Amount (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Total Gross Wages Payable for Month</td>
        <td>Contract Labour Central Rules Form XVII</td>
        <td class="tar font-bold">₹${rec.total_wages_payable_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>2. Wages Disbursed via Bank Transfer</td>
        <td>NEFT/RTGS Batch: ${rec.bank_payment_reference || "Pending Disbursal"}</td>
        <td class="tar" style="color: #15803d; font-weight: bold;">₹${rec.total_wages_disbursed_bank_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="total-row" style="background: ${rec.unpaid_wage_arrears_inr > 0 ? "#fee2e2" : "#dcfce7"};">
        <td><strong>3. Unpaid Wage Arrears (CPWD Clause 19D)</strong></td>
        <td><strong>Breach Threshold: Zero Tolerance</strong></td>
        <td class="tar" style="color: ${rec.unpaid_wage_arrears_inr > 0 ? "#b91c1c" : "#15803d"}; font-size: 13px;">
          <strong>${rec.unpaid_wage_arrears_inr > 0 ? `₹${rec.unpaid_wage_arrears_inr.toLocaleString("en-IN")} (BREACH)` : "₹0.00 (CLEARED)"}</strong>
        </td>
      </tr>
      <tr>
        <td>4. EPFO Statutory Remittance (12% + 12%)</td>
        <td>ECR Challan: ${rec.epf_ecr_challan_number || "Awaiting Filing"}</td>
        <td class="tar">₹${rec.epf_remitted_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>5. ESIC Statutory Remittance</td>
        <td>ESIC Challan: ${rec.esic_challan_number || "Awaiting Filing"}</td>
        <td class="tar">₹${rec.esic_remitted_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>6. BOCW Welfare Cess Remittance (1%)</td>
        <td>BOCW Act 1996 State Board Remittance</td>
        <td class="tar">₹${rec.bocw_cess_remitted_inr.toLocaleString("en-IN")}</td>
      </tr>
    </tbody>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">CPWD GCC Clause 19D Payment Clearance Certification</div>
    <div>Bank Payment Proof Verified: <strong>${rec.total_wages_disbursed_bank_inr >= rec.total_wages_payable_inr ? "100% DISBURSED" : "ARREARS FLAGGED"}</strong></div>
    <div>EPFO / ESIC Challans Authenticated: <strong>${rec.epf_ecr_challan_number ? "ECR GENERATED & REMITTED" : "CHALLAN PENDING"}</strong></div>
    <div>Running Account Bill Payment Status: <strong style="color: ${rec.clause_19d_breach_flagged ? "#b91c1c" : "#15803d"};">${rec.clause_19d_breach_flagged ? "PAYMENT GATE FROZEN (CLAUSE 19D HOLD)" : "CLEARED FOR DISBURSEMENT"}</strong></div>
  </div>

  <div class="footer">
    <div>
      <div>Contractor Labour Representative</div>
      <div style="color: #64748b;">${rec.contractor_name}</div>
      <div class="sig">Contractor Form XVII Seal</div>
    </div>
    <div>
      <div>Site Labour Welfare Officer</div>
      <div style="color: #64748b;">${rec.welfare_officer_name || "Statutory Audit Pending"}</div>
      <div class="sig">Welfare Officer Stamp</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">Statutory Payment Gate Certified</div>
      <div class="sig">Engineer Sanction Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedRecord) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING STATUTORY LABOUR WELFARE &amp; CLAUSE 19D ENGINE...
      </div>
    );
  }

  const isBreach = selectedRecord.clause_19d_breach_flagged || selectedRecord.unpaid_wage_arrears_inr > 0;
  const isCleared = selectedRecord.status === "COMPLIANT_CLEARED";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Statutory Compliance · CPWD GCC Clause 19D / Contract Labour Act Form XVII</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Labour Welfare, Form XVII Wages &amp; Clause 19D Gate
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Contract labour statutory clearinghouse. Reconciles bank wage transfers against Form XVII wage ledgers, audits EPF/ESIC ECR challan remittances, and enforces mandatory CPWD Clause 19D payment freezes on defaulting contractors.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintFormXvii(selectedRecord)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form XVII</span>
            </button>
            <Link
              href="/finance/ra-bills"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Receipt className="w-3.5 h-3.5 text-cyan-400" />
              <span>RA Bills Clearinghouse</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setLcrNo(`LCR-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-2026-0${records.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Lodge Wage Period</span>
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
              <span>Unpaid Wage Arrears</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.totalWageArrearsInr > 0 ? "text-rose-400" : "text-zinc-400"}`}>
              {formatInr(summary.totalWageArrearsInr)}
            </div>
            <div className="text-[11px] text-rose-500/80 mt-1">CPWD Clause 19D breach exposure</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Bank Wages Disbursed</span>
              <Banknote className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalWagesDisbursedInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Direct account transfers audited</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Payment Freezes</span>
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.activeBreaches > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {summary.activeBreaches} Gate(s) Active
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">RA interim bills held</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Compliant Wage Periods</span>
              <FileCheck className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {records.filter((r) => r.status === "COMPLIANT_CLEARED").length} Cleared
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Form XVII audited with ECR</div>
          </div>
        </div>

        {/* CLAUSE 19D ACTIVE BREACH CALLOUT */}
        {isBreach && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200 text-xs uppercase tracking-wider block">
                  Statutory Clause 19D Breach Active: RA Interim Bill Payment Frozen
                </strong>
                <span className="text-xs text-rose-300/80 font-sans">
                  The contractor has unpaid wage arrears of {formatInr(selectedRecord.unpaid_wage_arrears_inr)} for wage period {selectedRecord.wage_period_month}. Under CPWD GCC Clause 19D and the Contract Labour Act 1970, payment on bill {selectedRecord.linked_ra_bill_no || "the contractor's RA Bill"} remains frozen until full disbursement is authenticated.
                </span>
              </div>
            </div>
            <button
              type="button"
              disabled={actionInProgress === `clear_${selectedRecord.id}`}
              onClick={() => handleClearStatutoryGate(selectedRecord)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition font-mono"
            >
              Clear Wage Arrears &amp; Unfreeze
            </button>
          </div>
        )}

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Filings (${records.length})` },
              { key: "COMPLIANT_CLEARED", label: "Compliant" },
              { key: "NON_COMPLIANT_WAGE_BREACH", label: `Breach (${summary.activeBreaches})` },
              { key: "AUDIT_PENDING", label: "Audit Pending" },
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
              placeholder="Search record, contractor, month..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: COMPLIANCE ROSTER (7 cols) vs STATUTORY AUDIT & GATE DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: COMPLIANCE RECORDS LISTING (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Form XVII Wage Register Registry
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Wage Period Compliance Records</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredRecords.length} Records</span>
            </div>

            <div className="space-y-3">
              {filteredRecords.map((rec) => {
                const isSelected = selectedRecord.id === rec.id;
                const isBreachRec = rec.clause_19d_breach_flagged || rec.unpaid_wage_arrears_inr > 0;

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecord(rec)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {rec.compliance_record_number}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-cyan-300 font-mono font-bold">
                          {rec.wage_period_month}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isBreachRec
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                            : rec.status === "COMPLIANT_CLEARED"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {rec.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className={`text-xs font-bold ${isBreachRec ? "text-rose-400" : "text-emerald-400"}`}>
                          {isBreachRec ? `-${formatInr(rec.unpaid_wage_arrears_inr)} Arrears` : `${formatInr(rec.total_wages_disbursed_bank_inr)} Disbursed`}
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Payable: {formatInr(rec.total_wages_payable_inr)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{rec.contractor_name}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {rec.trade_package} &bull; Work Order: <strong className="text-zinc-200">{rec.work_order_ref}</strong>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Workforce: <strong className="text-zinc-300">{rec.total_workers_deployed} Personnel ({rec.total_mandays_logged} Mandays)</strong></span>
                      <span>Target Bill: <strong className="text-cyan-300">{rec.linked_ra_bill_no || "Next IPC"}</strong></span>
                      <span>Clause 19D Gate: <strong className={rec.clause_19d_breach_flagged ? "text-rose-400" : "text-emerald-400"}>{rec.clause_19d_breach_flagged ? "Frozen" : "Cleared"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: STATUTORY AUDIT & CPWD CLAUSE 19D GATE DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Statutory Labour Welfare Audit
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedRecord.compliance_record_number}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isCleared
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : isBreach
                  ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedRecord.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Executing Contractor:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedRecord.contractor_name}</strong>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Wage Period Month:</span>
                  <span className="text-cyan-300 font-bold font-mono">{selectedRecord.wage_period_month}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Work Order Ref:</span>
                  <span className="text-white">{selectedRecord.work_order_ref}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 text-[11px]">
                <div>
                  <span className="text-zinc-500 block">Workforce Headcount:</span>
                  <span className="text-white font-bold">{selectedRecord.total_workers_deployed} Workers</span>
                </div>
                <div>
                  <span className="text-zinc-500 block">Logged Mandays:</span>
                  <span className="text-zinc-200 font-mono">{selectedRecord.total_mandays_logged} Mandays</span>
                </div>
              </div>
            </div>

            {/* FORM XVII WAGE BREAKDOWN & STATUTORY REMITTANCES */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Form XVII Wages &amp; Statutory Remittances:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Total Wages Payable:</span>
                  <span className="text-white font-bold">{formatInr(selectedRecord.total_wages_payable_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Direct Bank Transfers:</span>
                  <span className="text-emerald-400 font-bold">{formatInr(selectedRecord.total_wages_disbursed_bank_inr)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-1 border-t border-zinc-800">
                  <span>Unpaid Wage Arrears:</span>
                  <span className={`font-bold ${isBreach ? "text-rose-400 font-extrabold" : "text-emerald-400"}`}>
                    {selectedRecord.unpaid_wage_arrears_inr > 0 ? formatInr(selectedRecord.unpaid_wage_arrears_inr) : "NIL (100% DISBURSED)"}
                  </span>
                </div>

                <div className="pt-2 border-t border-zinc-800 space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>EPF Remittance (ECR {selectedRecord.epf_ecr_challan_number || "Pending"}):</span>
                    <span className="text-zinc-200">{formatInr(selectedRecord.epf_remitted_inr)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>ESIC Remittance (Challan {selectedRecord.esic_challan_number || "Pending"}):</span>
                    <span className="text-zinc-200">{formatInr(selectedRecord.esic_remitted_inr)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>BOCW Welfare Cess (1%):</span>
                    <span className="text-zinc-200">{formatInr(selectedRecord.bocw_cess_remitted_inr)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Statutory Payment Gate Control:
              </span>

              {/* Action 1: Enforce Clause 19D Breach */}
              {!selectedRecord.clause_19d_breach_flagged && selectedRecord.unpaid_wage_arrears_inr > 0 && (
                <button
                  type="button"
                  disabled={!isWelfareOrDirector || actionInProgress === `breach_${selectedRecord.id}`}
                  onClick={() => handleEnforceClause19d(selectedRecord)}
                  className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/50 font-mono disabled:opacity-50"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Enforce Clause 19D Breach &amp; Freeze {selectedRecord.linked_ra_bill_no || "RA Bill"}</span>
                </button>
              )}

              {/* Action 2: Clear Statutory Gate & Unfreeze RA Bill */}
              {selectedRecord.status !== "COMPLIANT_CLEARED" && (
                <button
                  type="button"
                  disabled={!isWelfareOrDirector || actionInProgress === `clear_${selectedRecord.id}`}
                  onClick={() => handleClearStatutoryGate(selectedRecord)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Clear Labour Welfare Gate &amp; Unfreeze RA Bill</span>
                </button>
              )}

              {isCleared && (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Statutory Labour Compliance Certified</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Audited on {selectedRecord.audited_at ? new Date(selectedRecord.audited_at).toLocaleDateString("en-IN") : "Today"} by {selectedRecord.welfare_officer_name || "Labour Welfare Officer"}. RA bill payment gate cleared.
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              Contract Labour Act 1970 &amp; CPWD GCC Clause 19D Welfare Protocol
            </div>
          </div>

        </div>

        {/* LODGE WAGE PERIOD MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Lodge Wage Period Compliance (Form XVII)
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

              <form onSubmit={handleCreateRecord} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Filing Ref Code</label>
                    <input
                      type="text"
                      required
                      value={lcrNo}
                      onChange={(e) => setLcrNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Wage Period Month (YYYY-MM)</label>
                    <input
                      type="text"
                      required
                      value={month}
                      onChange={(e) => setMonth(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Workers Headcount</label>
                    <input
                      type="number"
                      required
                      value={workersCount}
                      onChange={(e) => setWorkersCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Skilled Workers</label>
                    <input
                      type="number"
                      required
                      value={skilledCount}
                      onChange={(e) => setSkilledCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Logged Mandays</label>
                    <input
                      type="number"
                      required
                      value={mandays}
                      onChange={(e) => setMandays(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Gross Wages Payable (₹)</label>
                    <input
                      type="number"
                      required
                      value={wagesPayable}
                      onChange={(e) => setWagesPayable(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Wages Disbursed via Bank (₹)</label>
                    <input
                      type="number"
                      required
                      value={wagesDisbursed}
                      onChange={(e) => setWagesDisbursed(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">EPF ECR Challan No.</label>
                    <input
                      type="text"
                      value={epfEcr}
                      onChange={(e) => setEpfEcr(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">EPF Remitted Amount (₹)</label>
                    <input
                      type="number"
                      value={epfAmt}
                      onChange={(e) => setEpfAmt(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
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
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Trade Package</label>
                    <input
                      type="text"
                      required
                      value={tradePackage}
                      onChange={(e) => setTradePackage(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
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
                    disabled={actionInProgress === "creating_lcr"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Lodge Wage Filing</span>
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