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

export type SecurityInstrumentType =
  | "PERFORMANCE_BANK_GUARANTEE_5PCT"
  | "SECURITY_DEPOSIT_DEDUCTION"
  | "MOBILIZATION_ADVANCE_BG"
  | "PLANT_AND_MACHINERY_ADVANCE_BG";

export type SecurityInstrumentStatus =
  | "PENDING_VERIFICATION"
  | "ACTIVE_SECURED"
  | "AMORTIZING_ADVANCE"
  | "INVOCATION_NOTICE_ACTIVE"
  | "RETURNED_DISCHARGED";

export interface PerformanceSecurityRecord {
  id: string;
  project_id: string;
  instrument_code: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  instrument_type: SecurityInstrumentType;
  issuing_bank_name: string;
  bank_branch_location: string;
  instrument_reference_no: string;
  sanctioned_amount_inr: number;
  recovered_or_released_inr: number;
  outstanding_exposure_inr: number;
  issue_date: string;
  validity_expiry_date: string;
  claim_expiry_deadline: string;
  recovery_rate_pct: number;
  status: SecurityInstrumentStatus;
  verified_by_finance?: string | null;
  verified_at?: string | null;
  audit_remarks?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function normalizeSecurityRecord(d: any): PerformanceSecurityRecord {
  const sanctioned = Number(d?.sanctioned_amount_inr ?? 0);
  const recovered = Number(d?.recovered_or_released_inr ?? 0);
  const outstanding = Number(d?.outstanding_exposure_inr ?? Math.max(0, sanctioned - recovered));

  return {
    id: d?.id ?? `sec-${Date.now()}`,
    project_id: d?.project_id ?? "proj-default",
    instrument_code: d?.instrument_code ?? `SEC-${Date.now().toString().slice(-4)}`,
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    instrument_type: (d?.instrument_type as SecurityInstrumentType) ?? "PERFORMANCE_BANK_GUARANTEE_5PCT",
    issuing_bank_name: d?.issuing_bank_name ?? "HDFC Bank Ltd",
    bank_branch_location: d?.bank_branch_location ?? "Commercial Branch",
    instrument_reference_no: d?.instrument_reference_no ?? "BG/2026/001",
    sanctioned_amount_inr: sanctioned,
    recovered_or_released_inr: recovered,
    outstanding_exposure_inr: outstanding,
    issue_date: d?.issue_date ?? new Date().toISOString().slice(0, 10),
    validity_expiry_date: d?.validity_expiry_date ?? new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
    claim_expiry_deadline: d?.claim_expiry_deadline ?? new Date(Date.now() + 395 * 86400000).toISOString().slice(0, 10),
    recovery_rate_pct: Number(d?.recovery_rate_pct ?? 10.0),
    status: (d?.status as SecurityInstrumentStatus) ?? "ACTIVE_SECURED",
    verified_by_finance: d?.verified_by_finance ?? null,
    verified_at: d?.verified_at ?? null,
    audit_remarks: d?.audit_remarks ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalPerformanceSecurityPage() {
  const { project, role, tier } = useActiveRole();
  const [securities, setSecurities] = useState<PerformanceSecurityRecord[]>([]);
  const [selectedSec, setSelectedSec] = useState<PerformanceSecurityRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterType, setFilterType] = useState<string>("ALL");
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

  // Form State for Registering New Security Instrument
  const [secCode, setSecCode] = useState(`SEC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-01`);
  const [woRef, setWoRef] = useState(tier === "RESIDENTIAL" ? "WO-RES-001" : "WO-TWR-101");
  const [contractor, setContractor] = useState(
    tier === "RESIDENTIAL" ? "Royal Woodworks & Interiors" : "Narmada Concrete Works"
  );
  const [tradePackage, setTradePackage] = useState(
    tier === "RESIDENTIAL" ? "Custom Joinery & Millwork" : "Civil & Superstructure"
  );
  const [instType, setInstType] = useState<SecurityInstrumentType>("PERFORMANCE_BANK_GUARANTEE_5PCT");
  const [bankName, setBankName] = useState("State Bank of India (CAG Branch)");
  const [branch, setBranch] = useState("Lucknow Main Branch");
  const [bgRef, setBgRef] = useState("BG/2026/TWR/99241");
  const [sanctionedAmt, setSanctionedAmt] = useState<number>(tier === "RESIDENTIAL" ? 122500 : 4250000);
  const [validityDate, setValidityDate] = useState(
    new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10)
  );
  const [claimDate, setClaimDate] = useState(
    new Date(Date.now() + 395 * 86400000).toISOString().slice(0, 10)
  );

  const loadSecuritiesData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("contract_performance_securities")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeSecurityRecord(d));
        setSecurities(normalized);
        if (!selectedSec) setSelectedSec(normalized[0]);
      } else {
        const defaults: PerformanceSecurityRecord[] =
          tier === "RESIDENTIAL"
            ? [
                normalizeSecurityRecord({
                  id: "sec-res-01",
                  project_id: projectId,
                  instrument_code: "SEC-RES-01",
                  work_order_ref: "WO-RES-001",
                  contractor_name: "Royal Woodworks & Interiors",
                  trade_package: "Custom Joinery & Millwork",
                  instrument_type: "PERFORMANCE_BANK_GUARANTEE_5PCT",
                  issuing_bank_name: "HDFC Bank Ltd",
                  bank_branch_location: "Gomti Nagar Branch",
                  instrument_reference_no: "BG/HDFC/2026/8812",
                  sanctioned_amount_inr: 122500,
                  recovered_or_released_inr: 0,
                  outstanding_exposure_inr: 122500,
                  issue_date: "2026-08-01",
                  validity_expiry_date: "2027-08-01",
                  claim_expiry_deadline: "2027-08-31",
                  status: "ACTIVE_SECURED",
                  verified_by_finance: "Finance Head",
                  verified_at: "2026-08-02T10:00:00Z",
                  audit_remarks: "5% Performance Security deposited per FIDIC Cl. 4.2 / CPWD GCC Cl. 1.",
                }),
              ]
            : [
                normalizeSecurityRecord({
                  id: "sec-twr-01",
                  project_id: projectId,
                  instrument_code: "SEC-TWR-01",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  instrument_type: "PERFORMANCE_BANK_GUARANTEE_5PCT",
                  issuing_bank_name: "State Bank of India",
                  bank_branch_location: "CAG Branch, New Delhi",
                  instrument_reference_no: "BG/2026/TWR/99241",
                  sanctioned_amount_inr: 4250000,
                  recovered_or_released_inr: 0,
                  outstanding_exposure_inr: 4250000,
                  issue_date: "2026-04-01",
                  validity_expiry_date: "2027-10-31",
                  claim_expiry_deadline: "2027-11-30",
                  status: "ACTIVE_SECURED",
                  verified_by_finance: "Lead Finance Auditor",
                  verified_at: "2026-04-03T11:00:00Z",
                  audit_remarks: "Original bank guarantee physically authenticated with issuing SBI branch.",
                }),
                normalizeSecurityRecord({
                  id: "sec-twr-02",
                  project_id: projectId,
                  instrument_code: "SEC-TWR-02",
                  work_order_ref: "WO-TWR-101",
                  contractor_name: "Narmada Concrete Works",
                  trade_package: "Civil & Superstructure",
                  instrument_type: "MOBILIZATION_ADVANCE_BG",
                  issuing_bank_name: "State Bank of India",
                  bank_branch_location: "CAG Branch, New Delhi",
                  instrument_reference_no: "MOB-BG/2026/041",
                  sanctioned_amount_inr: 8500000,
                  recovered_or_released_inr: 4250000,
                  outstanding_exposure_inr: 4250000,
                  issue_date: "2026-04-05",
                  validity_expiry_date: "2027-04-05",
                  claim_expiry_deadline: "2027-05-05",
                  recovery_rate_pct: 10.0,
                  status: "AMORTIZING_ADVANCE",
                  verified_by_finance: "Lead Finance Auditor",
                  verified_at: "2026-04-06T14:00:00Z",
                  audit_remarks: "Mobilization advance under FIDIC Cl. 14.2. Amortized at 10% gross RA bill deductions.",
                }),
              ];

        setSecurities(defaults);
        if (!selectedSec) setSelectedSec(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSec, tier]);

  useEffect(() => {
    void loadSecuritiesData();

    const channel = supabase
      .channel(`securities_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "contract_performance_securities" }, () => void loadSecuritiesData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadSecuritiesData]);

  const summary = useMemo(() => {
    const totalInstruments = securities.length;
    const totalSanctionedInr = securities.reduce((sum, s) => sum + Number(s.sanctioned_amount_inr || 0), 0);
    const totalOutstandingInr = securities.reduce((sum, s) => sum + Number(s.outstanding_exposure_inr || 0), 0);
    const expiringSoonCount = securities.filter((s) => {
      const diffDays = (new Date(s.claim_expiry_deadline).getTime() - Date.now()) / 86400000;
      return diffDays > 0 && diffDays <= 45;
    }).length;

    return { totalInstruments, totalSanctionedInr, totalOutstandingInr, expiringSoonCount };
  }, [securities]);

  const filteredSecurities = useMemo(() => {
    return securities.filter((s) => {
      const matchStatus = filterStatus === "ALL" || s.status === filterStatus;
      const matchType = filterType === "ALL" || s.instrument_type === filterType;
      const haystack = `${s.instrument_code} ${s.contractor_name} ${s.instrument_reference_no} ${s.issuing_bank_name}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchType && matchSearch;
    });
  }, [securities, filterStatus, filterType, search]);

  // Finance Verification Sign-Off
  const handleVerifySecurity = async (sec: PerformanceSecurityRecord) => {
    if (!isFinanceOrConsultant) return;
    setActionInProgress(`verify_${sec.id}`);

    const updatePayload: Partial<PerformanceSecurityRecord> = {
      status: "ACTIVE_SECURED",
      verified_by_finance: roleLabel || "Finance Head",
      verified_at: new Date().toISOString(),
    };

    try {
      await (supabase as any)
        .from("contract_performance_securities")
        .update(updatePayload)
        .eq("id", sec.id);
    } catch {
      // Local optimistic update
    }

    setSecurities((prev) =>
      prev.map((item) => (item.id === sec.id ? ({ ...item, ...updatePayload } as PerformanceSecurityRecord) : item))
    );
    if (selectedSec && selectedSec.id === sec.id) {
      setSelectedSec((prev) => (prev ? ({ ...prev, ...updatePayload } as PerformanceSecurityRecord) : null));
    }

    setFeedbackMessage(`Security Instrument ${sec.instrument_code} verified and authenticated by finance.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setActionInProgress(null);
  };

  // Register New Security Instrument
  const handleCreateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_sec");

    const newDbRecord: Omit<PerformanceSecurityRecord, "id"> = {
      project_id: projectId,
      instrument_code: secCode.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      instrument_type: instType,
      issuing_bank_name: bankName.trim(),
      bank_branch_location: branch.trim(),
      instrument_reference_no: bgRef.trim(),
      sanctioned_amount_inr: Number(sanctionedAmt),
      recovered_or_released_inr: 0,
      outstanding_exposure_inr: Number(sanctionedAmt),
      issue_date: new Date().toISOString().slice(0, 10),
      validity_expiry_date: validityDate,
      claim_expiry_deadline: claimDate,
      recovery_rate_pct: 10.0,
      status: "PENDING_VERIFICATION",
      audit_remarks: "Newly lodged security bond awaiting bank branch authentication.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("contract_performance_securities")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeSecurityRecord(data);
        setSecurities((prev) => [normalized, ...prev]);
        setSelectedSec(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeSecurityRecord({ ...newDbRecord, id: `sec-${Date.now()}` });
      setSecurities((prev) => [fallback, ...prev]);
      setSelectedSec(fallback);
    }

    setModalOpen(false);
    setActionInProgress(null);
  };

  // Printable CPWD Form 32 / Bank Guarantee Register Docket
  const handlePrintSecurity = (s: PerformanceSecurityRecord) => {
    const printWin = window.open("", "_blank", "width=1050,height=900");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Bank Guarantee &amp; Performance Security Register (CPWD Form 32) — ${s.instrument_code}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 11px; }
    .active { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .pending { background: #fef3c7; color: #b45309; border: 1px solid #f59e0b; }
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
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Works Manual Section 14 / FIDIC Red Book Clause 4.2</div>
      <h1 class="title">Bank Guarantee &amp; Performance Security Register (Form 32)</h1>
      <div class="meta">Instrument Ref: ${s.instrument_code} · Issue Date: ${s.issue_date} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${s.status === "ACTIVE_SECURED" || s.status === "AMORTIZING_ADVANCE" ? "active" : "pending"}">${s.status.replace(/_/g, " ")}</span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${s.contractor_name}</strong></td><th>Parent Work Order Ref</th><td><strong>${s.work_order_ref}</strong></td></tr>
    <tr><th>Instrument Classification</th><td>${s.instrument_type.replace(/_/g, " ")}</td><th>Trade Package</th><td>${s.trade_package}</td></tr>
    <tr><th>Issuing Commercial Bank</th><td><strong>${s.issuing_bank_name}</strong></td><th>Branch Location</th><td>${s.bank_branch_location}</td></tr>
    <tr><th>Instrument Bond / BG No.</th><td><code>${s.instrument_reference_no}</code></td><th>Claim Expiry Deadline</th><td><strong>${s.claim_expiry_deadline}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Financial Exposure &amp; Amortization Audit</div>
    <div>${s.audit_remarks || "Bank guarantee authenticated and recorded in permanent financial security register."}</div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Security &amp; Amortization Parameter</th>
        <th>Contract Schedule Basis</th>
        <th class="tar">Value (INR)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Total Sanctioned Instrument Face Value</td>
        <td>5% Performance Security / Mobilization Advance</td>
        <td class="tar font-bold">₹${s.sanctioned_amount_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr>
        <td>2. Less: Cumulative Recovered / Amortized Amount</td>
        <td>Deducted via RA Bill amortization waterfall</td>
        <td class="tar" style="color: #15803d;">-₹${s.recovered_or_released_inr.toLocaleString("en-IN")}</td>
      </tr>
      <tr class="total-row" style="background: #e0f2fe;">
        <td colspan="2"><strong>NET OUTSTANDING FINANCIAL EXPOSURE</strong></td>
        <td class="tar" style="color: #0369a1; font-size: 13px;"><strong>₹${s.outstanding_exposure_inr.toLocaleString("en-IN")}</strong></td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Lead Quantity Surveyor</div>
      <div style="color: #64748b;">Instrument values audited.</div>
      <div class="sig">QS Audit Seal</div>
    </div>
    <div>
      <div>Finance &amp; Accounts Head</div>
      <div style="color: #64748b;">${s.verified_by_finance || "Bank Branch Authenticated"}</div>
      <div class="sig">Finance Verification Seal</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">Performance Security Accepted</div>
      <div class="sig">Project Director Approval</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedSec) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING BANK GUARANTEE &amp; PERFORMANCE SECURITY REGISTER...
      </div>
    );
  }

  const isVerified = selectedSec.status === "ACTIVE_SECURED" || selectedSec.status === "AMORTIZING_ADVANCE";
  const isExpiringSoon =
    (new Date(selectedSec.claim_expiry_deadline).getTime() - Date.now()) / 86400000 <= 45 &&
    selectedSec.status !== "RETURNED_DISCHARGED";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Financial Security · CPWD GCC Clause 1 / FIDIC Clause 4.2 &amp; 14.2</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Performance Security &amp; Bank Guarantee Register
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Subcontract financial risk clearinghouse. Audits 5% performance bank guarantees, tracks mobilization advance amortization waterfalls, and monitors 45-day claim expiry horizons.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintSecurity(selectedSec)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form 32 Register</span>
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
                setSecCode(`SEC-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-0${securities.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 font-mono"
            >
              <Plus className="w-4 h-4" />
              <span>Register Security Bond</span>
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
              <span>Total Sanctioned Exposure</span>
              <Coins className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {formatInr(summary.totalSanctionedInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Total active bank bond guarantees</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Net Outstanding Exposure</span>
              <Lock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2">
              {formatInr(summary.totalOutstandingInr)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Net exposure after amortizations</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Claim Expiry Watch (&le; 45D)</span>
              <AlertOctagon className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 ${summary.expiringSoonCount > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.expiringSoonCount} Bond(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Requires renewal or invocation notice</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Registered Instruments</span>
              <FileCheck className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2">
              {summary.totalInstruments} Bonds
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">CPWD Form 32 register records</div>
          </div>
        </div>

        {/* EXPIRY WARNING CALLOUT */}
        {summary.expiringSoonCount > 0 && (
          <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-mono">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong className="text-amber-200 text-xs uppercase tracking-wider block">
                  Statutory 45-Day Bank Guarantee Claim Expiry Watch
                </strong>
                <span className="text-xs text-amber-300/80 font-sans">
                  {summary.expiringSoonCount} bank bond guarantees are approaching their claim expiry deadline. Ensure the contractor furnishes an extension rider or institute invocation proceedings immediately.
                </span>
              </div>
            </div>
            <span className="px-3 py-1.5 rounded-lg bg-amber-950 text-amber-300 border border-amber-800 text-xs font-bold shrink-0">
              EXPIRY DEADLINE WATCH
            </span>
          </div>
        )}

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Bonds (${securities.length})` },
              { key: "ACTIVE_SECURED", label: "Active Secured" },
              { key: "AMORTIZING_ADVANCE", label: "Amortizing Advance" },
              { key: "PENDING_VERIFICATION", label: "Pending Verification" },
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
              <option value="PERFORMANCE_BANK_GUARANTEE_5PCT">Performance BG (5%)</option>
              <option value="MOBILIZATION_ADVANCE_BG">Mobilization Advance BG</option>
              <option value="SECURITY_DEPOSIT_DEDUCTION">Security Deposit Deduction</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                placeholder="Search bond, contractor, bank..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: SECURITIES ROSTER (7 cols) vs BANK VERIFICATION DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: SECURITIES LISTING (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Form 32 Security Register
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Lodged Bank Bonds &amp; Guarantees</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredSecurities.length} Instruments</span>
            </div>

            <div className="space-y-3">
              {filteredSecurities.map((sec) => {
                const isSelected = selectedSec.id === sec.id;
                const isSecured = sec.status === "ACTIVE_SECURED" || sec.status === "AMORTIZING_ADVANCE";

                return (
                  <div
                    key={sec.id}
                    onClick={() => setSelectedSec(sec)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {sec.instrument_code}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {sec.instrument_type.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isSecured
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {sec.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right font-mono">
                        <span className="text-xs font-bold text-emerald-400">
                          {formatInr(sec.outstanding_exposure_inr)} Net
                        </span>
                        <div className="text-[10px] text-zinc-500">
                          Face Value: {formatInr(sec.sanctioned_amount_inr)}
                        </div>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-white">{sec.issuing_bank_name} ({sec.instrument_reference_no})</div>
                      <div className="text-[11px] text-cyan-400 font-mono mt-0.5">
                        Contractor: <strong className="text-zinc-200">{sec.contractor_name}</strong> &bull; {sec.work_order_ref}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Branch: <strong className="text-zinc-300">{sec.bank_branch_location}</strong></span>
                      <span>Claim Expiry: <strong className="text-zinc-200">{sec.claim_expiry_deadline}</strong></span>
                      <span>Verified: <strong className={sec.verified_by_finance ? "text-emerald-400" : "text-amber-400"}>{sec.verified_by_finance ? "Authenticated" : "Pending"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: BANK VERIFICATION & AMORTIZATION DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Security Authentication Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedSec.instrument_code}</h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                isVerified
                  ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                  : "bg-amber-950 text-amber-400 border border-amber-800/50"
              }`}>
                {selectedSec.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2.5 text-xs font-mono">
              <div>
                <span className="text-zinc-500 text-[10px] uppercase block">Issuing Bank &amp; Branch:</span>
                <strong className="text-white text-sm font-sans block mt-0.5">{selectedSec.issuing_bank_name} ({selectedSec.bank_branch_location})</strong>
              </div>

              <div className="pt-2 border-t border-zinc-800/60 flex justify-between text-[11px] text-zinc-400">
                <span>Instrument Reference:</span>
                <span className="text-cyan-300 font-bold font-mono">{selectedSec.instrument_reference_no}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Contractor Entity:</span>
                <span className="text-white font-sans">{selectedSec.contractor_name}</span>
              </div>
              <div className="flex justify-between text-[11px] text-zinc-400">
                <span>Work Order Reference:</span>
                <span className="text-zinc-200">{selectedSec.work_order_ref}</span>
              </div>
            </div>

            {/* FINANCIAL EXPOSURE & AMORTIZATION WATERFALL */}
            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2.5">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Financial Exposure &amp; Amortization:
              </span>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Sanctioned Face Value:</span>
                  <span className="text-white font-bold">{formatInr(selectedSec.sanctioned_amount_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Amortized / Recovered Amount:</span>
                  <span className="text-emerald-400 font-bold">-{formatInr(selectedSec.recovered_or_released_inr)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-extrabold text-sm pt-2 border-t border-zinc-800">
                  <span>Net Outstanding Exposure:</span>
                  <span>{formatInr(selectedSec.outstanding_exposure_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400 pt-1">
                  <span>Validity Expiry Date:</span>
                  <span className="text-zinc-200">{selectedSec.validity_expiry_date}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Claim Expiry Deadline:</span>
                  <span className="text-cyan-300 font-bold">{selectedSec.claim_expiry_deadline}</span>
                </div>
              </div>
            </div>

            {/* ACTION STAGE BUTTONS */}
            <div className="space-y-2 pt-1 border-t border-zinc-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Finance Verification Gate:
              </span>

              {!selectedSec.verified_by_finance ? (
                <button
                  type="button"
                  disabled={!isFinanceOrConsultant || actionInProgress === `verify_${selectedSec.id}`}
                  onClick={() => handleVerifySecurity(selectedSec)}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authenticate &amp; Verify Bank Bond (Finance)</span>
                </button>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs space-y-1">
                  <div className="font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Bank Instrument Authenticated &amp; Secured</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 font-sans">
                    Verified by {selectedSec.verified_by_finance} on {selectedSec.verified_at ? new Date(selectedSec.verified_at).toLocaleDateString("en-IN") : "Today"}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD Works Manual Section 14 &amp; FIDIC Clause 4.2 Security Protocol
            </div>
          </div>

        </div>

        {/* REGISTER SECURITY BOND MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Register Performance Security / BG (Form 32)
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

              <form onSubmit={handleCreateSecurity} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Instrument Code</label>
                    <input
                      type="text"
                      required
                      value={secCode}
                      onChange={(e) => setSecCode(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Instrument Type</label>
                    <select
                      value={instType}
                      onChange={(e) => setInstType(e.target.value as SecurityInstrumentType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white outline-none focus:border-cyan-400 font-sans"
                    >
                      <option value="PERFORMANCE_BANK_GUARANTEE_5PCT">Performance Bank Guarantee (5%)</option>
                      <option value="MOBILIZATION_ADVANCE_BG">Mobilization Advance BG</option>
                      <option value="SECURITY_DEPOSIT_DEDUCTION">Security Deposit Deduction</option>
                      <option value="PLANT_AND_MACHINERY_ADVANCE_BG">P&amp;M Advance BG</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
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
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Contractor Name</label>
                    <input
                      type="text"
                      required
                      value={contractor}
                      onChange={(e) => setContractor(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400 font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Issuing Bank &amp; Branch</label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">BG / Bond Reference No.</label>
                    <input
                      type="text"
                      required
                      value={bgRef}
                      onChange={(e) => setBgRef(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Sanctioned Face Value (₹)</label>
                    <input
                      type="number"
                      required
                      value={sanctionedAmt}
                      onChange={(e) => setSanctionedAmt(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Validity Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={validityDate}
                      onChange={(e) => setValidityDate(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Claim Expiry Deadline</label>
                    <input
                      type="date"
                      required
                      value={claimDate}
                      onChange={(e) => setClaimDate(e.target.value)}
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
                    disabled={actionInProgress === "creating_sec"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5 font-mono"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Register Security Bond</span>
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