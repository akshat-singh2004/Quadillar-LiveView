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
  Unlock,
  Wrench,
  X,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type SecurityGuaranteeType =
  | "RETENTION_MONEY_ESCROW"
  | "PERFORMANCE_BANK_GUARANTEE"
  | "MOBILIZATION_ADVANCE_BG"
  | "LABOUR_WARRANTY_BOND";

export type GuaranteeReleaseStatus =
  | "HELD_IN_ESCROW"
  | "STAGE_1_RELEASED_50PCT"
  | "FULLY_RELEASED_DLP_END"
  | "INVOCATION_NOTICE_SERVED"
  | "FORFEITED_ENCASHED";

export interface RetentionRecord {
  id: string;
  project_id: string;
  security_code: string;
  contractor_name: string;
  trade_package: string;
  guarantee_type: SecurityGuaranteeType;
  instrument_reference?: string | null;
  issuing_financial_institution?: string | null;
  principal_amount_inr: number;
  released_amount_inr: number;
  retained_balance_inr: number;
  linked_ra_bill_no?: string | null;
  commencement_date: string;
  validity_expiry_date: string;
  claim_expiry_date?: string | null;
  dlp_period_months: number;
  stage_1_toc_released: boolean;
  stage_2_dlp_released: boolean;
  status: GuaranteeReleaseStatus;
  authorized_by?: string | null;
  released_at?: string | null;
  audit_remarks?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeRetention(d: any): RetentionRecord {
  const principal = Number(d?.principal_amount_inr ?? 0);
  const released = Number(d?.released_amount_inr ?? 0);
  const balance = Number(d?.retained_balance_inr ?? Math.max(0, principal - released));

  return {
    id: d?.id ?? `ret-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    security_code: d?.security_code ?? `RET-${Date.now().toString().slice(-4)}`,
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    guarantee_type: (d?.guarantee_type as SecurityGuaranteeType) ?? "RETENTION_MONEY_ESCROW",
    instrument_reference: d?.instrument_reference ?? null,
    issuing_financial_institution: d?.issuing_financial_institution ?? "State Bank of India",
    principal_amount_inr: principal,
    released_amount_inr: released,
    retained_balance_inr: balance,
    linked_ra_bill_no: d?.linked_ra_bill_no ?? null,
    commencement_date: d?.commencement_date ?? new Date().toISOString().slice(0, 10),
    validity_expiry_date: d?.validity_expiry_date ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    claim_expiry_date: d?.claim_expiry_date ?? null,
    dlp_period_months: Number(d?.dlp_period_months ?? 12),
    stage_1_toc_released: Boolean(d?.stage_1_toc_released),
    stage_2_dlp_released: Boolean(d?.stage_2_dlp_released),
    status: (d?.status as GuaranteeReleaseStatus) ?? "HELD_IN_ESCROW",
    authorized_by: d?.authorized_by ?? null,
    released_at: d?.released_at ?? null,
    audit_remarks: d?.audit_remarks ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalRetentionLedgerPage() {
  const { project, role, tier } = useActiveRole();
  const [records, setRecords] = useState<RetentionRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<RetentionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
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
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PROJECT_DIRECTOR" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Finance") ||
    roleLabel.includes("Accounts") ||
    roleLabel.includes("Director") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Surveyor");

  // Form State for Recording New Guarantee/Retention Line
  const [code, setCode] = useState(`RET-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [guaranteeType, setGuaranteeType] = useState<SecurityGuaranteeType>("RETENTION_MONEY_ESCROW");
  const [instrumentRef, setInstrumentRef] = useState(tier === "RESIDENTIAL" ? "ESCROW-RA-03" : "PBG-HDFC-99120");
  const [bank, setBank] = useState("HDFC Bank Ltd (Commercial Branch)");
  const [principal, setPrincipal] = useState<number>(tier === "RESIDENTIAL" ? 17250 : 425000);
  const [raBillRef, setRaBillRef] = useState(tier === "RESIDENTIAL" ? "RA-RES-03" : "RA-TWR-06");
  const [expiryDate, setExpiryDate] = useState(new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));
  const [dlpMonths, setDlpMonths] = useState<number>(12);

  const loadRetentionLedger = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("retention_and_bank_guarantees")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeRetention(d));
        setRecords(normalized);
        if (!selectedRecord) setSelectedRecord(normalized[0]);
      } else {
        const defaults: RetentionRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeRetention({
                  id: "ret-res-01",
                  project_id: projectId,
                  security_code: "RET-RES-03",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  guarantee_type: "RETENTION_MONEY_ESCROW",
                  instrument_reference: "ESCROW-RA-03-DEDUCTION",
                  issuing_financial_institution: "Quadillar Client Project Escrow",
                  principal_amount_inr: 17250,
                  released_amount_inr: 0,
                  retained_balance_inr: 17250,
                  linked_ra_bill_no: "RA-RES-03",
                  commencement_date: "2026-09-12",
                  validity_expiry_date: "2027-09-12",
                  dlp_period_months: 12,
                  stage_1_toc_released: false,
                  stage_2_dlp_released: false,
                  status: "HELD_IN_ESCROW",
                  audit_remarks: "5% statutory retainage withheld from RA-03 pending Taking-Over & DLP.",
                }),
              ]
            : [
                normalizeRetention({
                  id: "ret-twr-01",
                  project_id: projectId,
                  security_code: "PBG-TWR-001",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  guarantee_type: "PERFORMANCE_BANK_GUARANTEE",
                  instrument_reference: "BG/2026/TWR/99241",
                  issuing_financial_institution: "State Bank of India (CAG Branch)",
                  principal_amount_inr: 4250000,
                  released_amount_inr: 0,
                  retained_balance_inr: 4250000,
                  commencement_date: "2026-04-01",
                  validity_expiry_date: "2027-10-31",
                  claim_expiry_date: "2027-11-30",
                  dlp_period_months: 12,
                  stage_1_toc_released: false,
                  stage_2_dlp_released: false,
                  status: "HELD_IN_ESCROW",
                  audit_remarks: "5% Performance Security deposited per FIDIC Cl. 4.2 / CPWD GCC Cl. 1.",
                }),
                normalizeRetention({
                  id: "ret-twr-02",
                  project_id: projectId,
                  security_code: "RET-TWR-06",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  guarantee_type: "RETENTION_MONEY_ESCROW",
                  instrument_reference: "ESCROW-RA-06-RETAINAGE",
                  issuing_financial_institution: "Employer Escrow Account",
                  principal_amount_inr: 425000,
                  released_amount_inr: 0,
                  retained_balance_inr: 425000,
                  linked_ra_bill_no: "RA-TWR-06",
                  commencement_date: "2026-09-10",
                  validity_expiry_date: "2027-09-10",
                  dlp_period_months: 12,
                  stage_1_toc_released: false,
                  stage_2_dlp_released: false,
                  status: "HELD_IN_ESCROW",
                  audit_remarks: "Cumulative 5% retainage deducted under IPC-06.",
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
    void loadRetentionLedger();

    const channel = supabase
      .channel(`retention_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "retention_and_bank_guarantees" }, () => void loadRetentionLedger())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadRetentionLedger]);

  const summary = useMemo(() => {
    const totalInstruments = records.length;
    const totalRetainedInr = records.reduce((sum, r) => sum + Number(r.retained_balance_inr || 0), 0);
    const totalReleasedInr = records.reduce((sum, r) => sum + Number(r.released_amount_inr || 0), 0);
    const expiringCount = records.filter((r) => {
      const diffDays = (new Date(r.validity_expiry_date).getTime() - Date.now()) / 86400000;
      return diffDays > 0 && diffDays <= 45;
    }).length;

    return { totalInstruments, totalRetainedInr, totalReleasedInr, expiringCount };
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchType = filterType === "ALL" || r.guarantee_type === filterType;
      const matchStatus = filterStatus === "ALL" || r.status === filterStatus;
      const haystack = `${r.security_code} ${r.contractor_name} ${r.instrument_reference} ${r.issuing_financial_institution}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchType && matchStatus && matchSearch;
    });
  }, [records, filterType, filterStatus, search]);

  // Stage 1 Release: 50% on Taking-Over Certificate (TOC)
  const handleReleaseStage1 = async (rec: RetentionRecord) => {
    if (!isFinanceOrConsultant) return;
    setActionInProgress(`stage1_${rec.id}`);

    const releaseSum = Math.round(rec.principal_amount_inr * 0.5);
    const remainingBalance = Math.max(0, rec.principal_amount_inr - releaseSum);

    const updatePayload: Partial<RetentionRecord> = {
      stage_1_toc_released: true,
      released_amount_inr: releaseSum,
      retained_balance_inr: remainingBalance,
      status: "STAGE_1_RELEASED_50PCT",
      authorized_by: roleLabel || "Project Director",
      released_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("retention_and_bank_guarantees")
        .update(updatePayload)
        .eq("id", rec.id);
    } catch {
      // Local optimistic update
    }

    setRecords((prev) =>
      prev.map((r) => (r.id === rec.id ? ({ ...r, ...updatePayload } as RetentionRecord) : r))
    );
    if (selectedRecord && selectedRecord.id === rec.id) {
      setSelectedRecord((prev) => (prev ? ({ ...prev, ...updatePayload } as RetentionRecord) : null));
    }

    setFeedbackMessage(`Stage 1 (50% TOC) release sanctioned for ${rec.security_code}: ${formatInr(releaseSum)} disbursed.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Stage 2 Release: Final 50% on DLP Expiry & Defect Clearance
  const handleReleaseStage2 = async (rec: RetentionRecord) => {
    if (!isFinanceOrConsultant) return;
    setActionInProgress(`stage2_${rec.id}`);

    const updatePayload: Partial<RetentionRecord> = {
      stage_2_dlp_released: true,
      released_amount_inr: rec.principal_amount_inr,
      retained_balance_inr: 0,
      status: "FULLY_RELEASED_DLP_END",
      authorized_by: roleLabel || "Project Director",
      released_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("retention_and_bank_guarantees")
        .update(updatePayload)
        .eq("id", rec.id);
    } catch {
      // Local optimistic update
    }

    setRecords((prev) =>
      prev.map((r) => (r.id === rec.id ? ({ ...r, ...updatePayload } as RetentionRecord) : r))
    );
    if (selectedRecord && selectedRecord.id === rec.id) {
      setSelectedRecord((prev) => (prev ? ({ ...prev, ...updatePayload } as RetentionRecord) : null));
    }

    setFeedbackMessage(`Final DLP release approved for ${rec.security_code}. Security escrow closed.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Serve 30-Day Invocation Notice (Default Protection)
  const handleServeInvocationNotice = async (rec: RetentionRecord) => {
    if (!isFinanceOrConsultant) return;
    setActionInProgress(`invoke_${rec.id}`);

    const updatePayload: Partial<RetentionRecord> = {
      status: "INVOCATION_NOTICE_SERVED",
    };

    try {
      await (supabase as any)
        .from("retention_and_bank_guarantees")
        .update(updatePayload)
        .eq("id", rec.id);
    } catch {
      // Local optimistic update
    }

    setRecords((prev) =>
      prev.map((r) => (r.id === rec.id ? ({ ...r, ...updatePayload } as RetentionRecord) : r))
    );
    if (selectedRecord && selectedRecord.id === rec.id) {
      setSelectedRecord((prev) => (prev ? ({ ...prev, ...updatePayload } as RetentionRecord) : null));
    }

    setFeedbackMessage(`Official 30-day Bank Guarantee Invocation Notice issued to ${rec.issuing_financial_institution}.`);
    setTimeout(() => setFeedbackMessage(null), 4000);
    setActionInProgress(null);
  };

  // Register New Security Guarantee
  const handleCreateGuarantee = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_guarantee");

    const newDbRecord: Omit<RetentionRecord, "id"> = {
      project_id: projectId,
      security_code: code.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      guarantee_type: guaranteeType,
      instrument_reference: instrumentRef.trim(),
      issuing_financial_institution: bank.trim(),
      principal_amount_inr: Number(principal),
      released_amount_inr: 0,
      retained_balance_inr: Number(principal),
      linked_ra_bill_no: guaranteeType === "RETENTION_MONEY_ESCROW" ? raBillRef.trim() : null,
      commencement_date: new Date().toISOString().slice(0, 10),
      validity_expiry_date: expiryDate,
      dlp_period_months: Number(dlpMonths),
      stage_1_toc_released: false,
      stage_2_dlp_released: false,
      status: "HELD_IN_ESCROW",
      audit_remarks: "Registered under statutory contract security requirements.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("retention_and_bank_guarantees")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeRetention(data);
        setRecords((prev) => [normalized, ...prev]);
        setSelectedRecord(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeRetention({ ...newDbRecord, id: `ret-${Date.now()}` });
      setRecords((prev) => [fallback, ...prev]);
      setSelectedRecord(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Statutory FIDIC 14.9 / CPWD Cl. 17 Printable Release Certificate
  const handlePrintCertificate = (rec: RetentionRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Retention & Security Release Certificate (FIDIC Cl. 14.9 / CPWD Cl. 17) — ${rec.security_code}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .cleared { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .held { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · FIDIC Red Book Cl. 14.9 / CPWD GCC Cl. 17</div>
      <h1 class="title">Statutory Retention Escrow &amp; Guarantee Release Certificate</h1>
      <div class="meta">Certificate Ref: ${rec.security_code} · Issue Date: ${new Date().toLocaleDateString("en-IN")} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${rec.status === "FULLY_RELEASED_DLP_END" ? "cleared" : "held"}">${rec.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${rec.contractor_name}</strong></td><th>Trade Package</th><td>${rec.trade_package}</td></tr>
    <tr><th>Security Classification</th><td>${rec.guarantee_type.replace(/_/g, " ")}</td><th>Financial Institution</th><td>${rec.issuing_financial_institution || "Client Escrow"}</td></tr>
    <tr><th>Instrument Number</th><td><strong>${rec.instrument_reference || "Direct Retention Deductions"}</strong></td><th>Associated RA Bill</th><td>${rec.linked_ra_bill_no || "Contract Performance Security"}</td></tr>
    <tr><th>Validity Expiry Horizon</th><td>${rec.validity_expiry_date}</td><th>Defects Liability Period (DLP)</th><td><strong>${rec.dlp_period_months} Months</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Audited Ledger Notes</div>
    <div>${rec.audit_remarks || "Security instrument verified against original physical bank guarantee and IPC payment records."}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Statutory Release Milestone</th>
        <th>Contractual Release Trigger</th>
        <th class="tac">Status</th>
        <th class="tar">Amount Released (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Stage 1: Taking-Over Certificate (TOC)</td>
        <td>50% Release upon substantial completion of works (FIDIC 14.9a)</td>
        <td class="tac font-bold" style="color: ${rec.stage_1_toc_released ? "#15803d" : "#b91c1c"};">
          ${rec.stage_1_toc_released ? "SANCTIONED & RELEASED" : "HELD PENDING TOC"}
        </td>
        <td class="tar font-bold">₹${(rec.principal_amount_inr * 0.5).toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>2. Stage 2: Expiry of Defects Liability Period (DLP)</td>
        <td>Final 50% Release upon rectification of all punch list snags (FIDIC 14.9b)</td>
        <td class="tac font-bold" style="color: ${rec.stage_2_dlp_released ? "#15803d" : "#b91c1c"};">
          ${rec.stage_2_dlp_released ? "SANCTIONED & RELEASED" : "HELD PENDING DLP"}
        </td>
        <td class="tar font-bold">₹${(rec.principal_amount_inr * 0.5).toLocaleString("en-IN")}</td>
      </tr>
      <tr class="total-row" style="background: #e0f2fe;">
        <td colspan="3"><strong>TOTAL PRINCIPAL SECURITY DEPOSIT</strong></td>
        <td class="tar" style="color: #0369a1; font-size: 13px;"><strong>₹${rec.principal_amount_inr.toLocaleString("en-IN")}</strong></td>
      </tr>
      <tr class="total-row" style="background: ${rec.retained_balance_inr > 0 ? "#fee2e2" : "#dcfce7"};">
        <td colspan="3"><strong>RESIDUAL HELD ESCROW BALANCE</strong></td>
        <td class="tar" style="color: ${rec.retained_balance_inr > 0 ? "#b91c1c" : "#15803d"}; font-size: 14px;">
          <strong>₹${rec.retained_balance_inr.toLocaleString("en-IN")}</strong>
        </td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Lead Quantity Surveyor</div>
      <div style="color: #64748b;">Escrow reconciliations audited.</div>
      <div class="sig">QS Audit Seal</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">DLP snag rectification verified.</div>
      <div class="sig">Consultant Clearance</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">${rec.authorized_by || "Disbursement Sanctioned"}</div>
      <div class="sig">Employer Escrow Release Seal</div>
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
        INITIALIZING RETENTION ESCROW, BANK GUARANTEES &amp; DLP LEDGER...
      </div>
    );
  }

  const isFullyReleased = selectedRecord.status === "FULLY_RELEASED_DLP_END";
  const isExpiringSoon =
    (new Date(selectedRecord.validity_expiry_date).getTime() - Date.now()) / 86400000 <= 45 &&
    !isFullyReleased;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Commercial Escrow · FIDIC Cl. 14.9 &amp; 4.2 / CPWD GCC Clause 17</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Retention Money, Bank Guarantees &amp; DLP Ledger
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Commercial protection clearinghouse. Tracks 5% retainage withheld from interim bills and monitors Bank Guarantee expiration horizons. Enforces tripartite two-stage release (50% at Taking-Over / 50% at DLP expiry).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintCertificate(selectedRecord)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Release Certificate</span>
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
                setCode(`RET-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Register Security Instrument</span>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Retained in Escrow</span>
              <Lock className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-rose-400 mt-2">
              {formatInr(summary.totalRetainedInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Held under FIDIC Cl. 14.9 / CPWD Cl. 17</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Sanctioned Released Funds</span>
              <Coins className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {formatInr(summary.totalReleasedInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Stage 1 TOC &amp; Stage 2 DLP releases</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Expiring Within 45 Days</span>
              <AlertOctagon className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold font-mono mt-2 ${summary.expiringCount > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.expiringCount} Guarantees
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Requires extension or invocation notice</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Security Instruments</span>
              <FileCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.totalInstruments} Instruments
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">PBG, Retention Escrow &amp; Mobilization BGs</div>
          </div>
        </div>

        {/* EXPIRY WARNING BANNER */}
        {summary.expiringCount > 0 && (
          <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="text-amber-200 text-xs uppercase tracking-wider block font-mono">
                  Statutory 45-Day Bank Guarantee Expiry Watch
                </strong>
                <span className="text-xs text-amber-300/80">
                  {summary.expiringCount} bank guarantees are approaching their claim expiration date. If the contractor fails to furnish a valid renewal rider 30 days prior to expiry, serve the official invocation notice to encash the security into project escrow.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setFilterStatus("HELD_IN_ESCROW")}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shrink-0 transition font-mono"
            >
              Filter Expiring BGs
            </button>
          </div>
        )}

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Guarantees (${records.length})` },
              { key: "HELD_IN_ESCROW", label: "Held in Escrow" },
              { key: "STAGE_1_RELEASED_50PCT", label: "Stage 1 (50% TOC)" },
              { key: "FULLY_RELEASED_DLP_END", label: "Fully Released" },
              { key: "INVOCATION_NOTICE_SERVED", label: "Invocation Notice" },
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

          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-400 font-mono"
            >
              <option value="ALL">All Instrument Types</option>
              <option value="RETENTION_MONEY_ESCROW">Retention Money Escrow</option>
              <option value="PERFORMANCE_BANK_GUARANTEE">Performance Bank Guarantee (PBG)</option>
              <option value="MOBILIZATION_ADVANCE_BG">Mobilization Advance BG</option>
              <option value="LABOUR_WARRANTY_BOND">Labour Warranty Bond</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search code, contractor, bank..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: INSTRUMENTS ROSTER (7 cols) vs ESCROW CLEARANCE DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: INSTRUMENTS ROSTER (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Commercial Escrow Ledger (FIDIC 14.9)
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Security Deposit Registers</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredRecords.length} Records</span>
            </div>

            <div className="space-y-3">
              {filteredRecords.map((rec) => {
                const isSelected = selectedRecord.id === rec.id;
                const isHeld = rec.status === "HELD_IN_ESCROW";
                const isFull = rec.status === "FULLY_RELEASED_DLP_END";

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
                          {rec.security_code}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {rec.guarantee_type.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isFull
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : isHeld
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                            : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                        }`}>
                          {rec.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-rose-400">
                          {formatInr(rec.retained_balance_inr)} Held
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Total: {formatInr(rec.principal_amount_inr)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{rec.contractor_name}</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        {rec.issuing_financial_institution || "Client Escrow"} &bull; Ref: {rec.instrument_reference || "RA Retainage"}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Package: <strong className="text-zinc-300">{rec.trade_package}</strong></span>
                      <span>Expiry: <strong className="text-zinc-200">{rec.validity_expiry_date}</strong></span>
                      <span>DLP: <strong className="text-cyan-300">{rec.dlp_period_months}M</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: ESCROW CLEARANCE & RELEASE DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Escrow Release Stage Gate
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedRecord.security_code}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isFullyReleased
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : "bg-rose-950 text-rose-400 border border-rose-800/50"
              }`}>
                {selectedRecord.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>Contractor Entity:</span>
                <strong className="text-white font-sans">{selectedRecord.contractor_name}</strong>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Security Type:</span>
                <span className="text-zinc-200">{selectedRecord.guarantee_type.replace(/_/g, " ")}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Issuing Bank / Escrow:</span>
                <span className="text-white">{selectedRecord.issuing_financial_institution || "Client Escrow"}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Validity Horizon:</span>
                <span className={isExpiringSoon ? "text-amber-400 font-bold" : "text-cyan-300"}>
                  {selectedRecord.validity_expiry_date} {isExpiringSoon && "[EXPIRING SOON]"}
                </span>
              </div>
            </div>

            {/* FINANCIAL ESCROW RETENTION WATERFALL */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Statutory Escrow Balance Breakdown:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>1. Total Deposited Principal:</span>
                  <span className="text-white font-bold">{formatInr(selectedRecord.principal_amount_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>2. Stage 1 Released (TOC - 50%):</span>
                  <span className={selectedRecord.stage_1_toc_released ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                    {selectedRecord.stage_1_toc_released ? `-${formatInr(selectedRecord.principal_amount_inr * 0.5)}` : "Pending TOC"}
                  </span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>3. Stage 2 Released (DLP - 50%):</span>
                  <span className={selectedRecord.stage_2_dlp_released ? "text-emerald-400 font-bold" : "text-zinc-500"}>
                    {selectedRecord.stage_2_dlp_released ? `-${formatInr(selectedRecord.principal_amount_inr * 0.5)}` : "Pending DLP Expiry"}
                  </span>
                </div>
                <div className="flex justify-between text-rose-400 font-extrabold text-sm pt-2 border-t border-zinc-800">
                  <span>Residual Retained Balance:</span>
                  <span>{formatInr(selectedRecord.retained_balance_inr)}</span>
                </div>
              </div>
            </div>

            {/* FIDIC 14.9 TWO-STAGE STATUTORY RELEASE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Tripartite Release Authorizations:
              </span>

              {/* Action 1: Stage 1 TOC Release */}
              {!selectedRecord.stage_1_toc_released && (
                <button
                  type="button"
                  disabled={!isFinanceOrConsultant || actionInProgress === `stage1_${selectedRecord.id}`}
                  onClick={() => handleReleaseStage1(selectedRecord)}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Sanction Stage 1 Release (50% on Taking-Over)</span>
                </button>
              )}

              {/* Action 2: Stage 2 DLP Release */}
              {selectedRecord.stage_1_toc_released && !selectedRecord.stage_2_dlp_released && (
                <button
                  type="button"
                  disabled={!isFinanceOrConsultant || actionInProgress === `stage2_${selectedRecord.id}`}
                  onClick={() => handleReleaseStage2(selectedRecord)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Sanction Final Stage 2 Release (DLP Complete)</span>
                </button>
              )}

              {/* Action 3: Invocation Notice */}
              {isExpiringSoon && selectedRecord.status !== "INVOCATION_NOTICE_SERVED" && (
                <button
                  type="button"
                  disabled={!isFinanceOrConsultant || actionInProgress === `invoke_${selectedRecord.id}`}
                  onClick={() => handleServeInvocationNotice(selectedRecord)}
                  className="w-full py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 font-mono shadow-md shadow-rose-950/50"
                >
                  <AlertOctagon className="w-4 h-4" />
                  <span>Issue 30-Day BG Invocation Notice</span>
                </button>
              )}

              {isFullyReleased && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Security Fully Released &bull; DLP Concluded</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Authorized by {selectedRecord.authorized_by || "Project Director"} on {selectedRecord.released_at ? new Date(selectedRecord.released_at).toLocaleDateString("en-IN") : "Today"}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              FIDIC Red Book Clause 14.9 &amp; CPWD GCC Clause 17 Escrow Protocol
            </div>
          </div>

        </div>

        {/* REGISTER NEW GUARANTEE MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Register Commercial Security Instrument
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

              <form onSubmit={handleCreateGuarantee} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Security Code</label>
                    <input
                      type="text"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Security Classification</label>
                    <select
                      value={guaranteeType}
                      onChange={(e) => setGuaranteeType(e.target.value as SecurityGuaranteeType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="RETENTION_MONEY_ESCROW">Retention Money Escrow (5%)</option>
                      <option value="PERFORMANCE_BANK_GUARANTEE">Performance Bank Guarantee (PBG)</option>
                      <option value="MOBILIZATION_ADVANCE_BG">Mobilization Advance BG</option>
                      <option value="LABOUR_WARRANTY_BOND">Labour Warranty Bond</option>
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

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Instrument / BG Reference</label>
                    <input
                      type="text"
                      required
                      value={instrumentRef}
                      onChange={(e) => setInstrumentRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Principal Amount (₹)</label>
                    <input
                      type="number"
                      required
                      value={principal}
                      onChange={(e) => setPrincipal(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Issuing Financial Institution / Bank</label>
                  <input
                    type="text"
                    required
                    value={bank}
                    onChange={(e) => setBank(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Validity Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={expiryDate}
                      onChange={(e) => setExpiryDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">DLP Duration (Months)</label>
                    <input
                      type="number"
                      required
                      value={dlpMonths}
                      onChange={(e) => setDlpMonths(Number(e.target.value))}
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
                    disabled={actionInProgress === "creating_guarantee"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Register Instrument</span>
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