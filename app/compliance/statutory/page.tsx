"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Landmark,
  Layers,
  Lock,
  Printer,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Unlock,
  Wrench,
  X
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type ReraFormType = "FORM_1_ARCHITECT" | "FORM_2_ENGINEER" | "FORM_3_CA";
export type ReraFormStatus = "DRAFT_PENDING" | "AUDITED" | "DIGITALLY_SEALED";

export interface ReraFormRecord {
  id: string;
  project_id: string;
  quarter_label: string;
  form_type: ReraFormType;
  title: string;
  authority_persona: string;
  physical_completion_pct: number;
  total_estimated_cost_inr: number;
  incurred_cost_inr: number;
  permissible_withdrawal_inr: number;
  actual_withdrawn_inr: number;
  statutory_code_reference: string;
  status: ReraFormStatus;
  sealed_by?: string | null;
  sealed_at?: string | null;
  registration_number: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

const RERA_CONFIG: Record<ReraFormType, { name: string; section: string; badgeColor: string }> = {
  FORM_1_ARCHITECT: {
    name: "RERA Form 1 (Architect's Certificate)",
    section: "RERA Rule 3(4) / Percentage Completion of Work",
    badgeColor: "bg-cyan-950 text-cyan-400 border-cyan-800/50",
  },
  FORM_2_ENGINEER: {
    name: "RERA Form 2 (Engineer's Certificate)",
    section: "RERA Rule 4(2) / Structural Integrity & Cost Verification",
    badgeColor: "bg-amber-950 text-amber-400 border-amber-800/50",
  },
  FORM_3_CA: {
    name: "RERA Form 3 (Chartered Accountant Certificate)",
    section: "Section 4(2)(l)(D) / 70% Designated Escrow Withdrawal",
    badgeColor: "bg-emerald-950 text-emerald-400 border-emerald-800/50",
  },
};

export default function CanonicalStatutoryCompliancePage() {
  const { project, role, tier } = useActiveRole();
  const [forms, setForms] = useState<ReraFormRecord[]>([]);
  const [selectedForm, setSelectedForm] = useState<ReraFormRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"ALL" | ReraFormType>("ALL");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Safe Role Checking (avoids TS2367 strict union errors)
  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = role?.label || "";

  const isArchitect =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleLabel.includes("Architect");

  const isEngineer =
    roleId === "RESIDENT_SEOR" ||
    roleId === "PMC_LEAD" ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Engineer");

  const isCaOrFinance =
    roleId === "QS_BILLING" ||
    roleLabel.includes("Surveyor") ||
    roleLabel.includes("Finance") ||
    roleLabel.includes("Lead");

  const reraRegNo = tier === "RESIDENTIAL" ? "UPRERA/PRJ/2026/GOMTI-081" : "UPRERA/PRJ/2025/TWR-A-441";

  const loadReraData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("rera_statutory_filings")
        .select("*")
        .eq("project_id", project.id)
        .order("form_type", { ascending: true });

      if (data && data.length > 0) {
        setForms(data as ReraFormRecord[]);
        if (!selectedForm) setSelectedForm(data[0] as ReraFormRecord);
      } else {
        const defaults: ReraFormRecord[] =
          tier === "RESIDENTIAL"
            ? [
                {
                  id: "rera-res-01",
                  project_id: project.id,
                  quarter_label: "Q2 2026",
                  form_type: "FORM_1_ARCHITECT",
                  title: "Architectural Percentage Completion Certificate",
                  authority_persona: "Principal Architect",
                  physical_completion_pct: 78.5,
                  total_estimated_cost_inr: 400000,
                  incurred_cost_inr: 314000,
                  permissible_withdrawal_inr: 314000,
                  actual_withdrawn_inr: 285000,
                  statutory_code_reference: "UP-RERA Form 1 / Fit-Out Stage",
                  status: "DIGITALLY_SEALED",
                  sealed_by: "Principal Architect",
                  sealed_at: "2026-09-08T11:00:00Z",
                  registration_number: reraRegNo,
                },
                {
                  id: "rera-res-02",
                  project_id: project.id,
                  quarter_label: "Q2 2026",
                  form_type: "FORM_2_ENGINEER",
                  title: "Structural Engineer MEP & Finish Stability Certificate",
                  authority_persona: "Resident SEOR / Consultant",
                  physical_completion_pct: 81.2,
                  total_estimated_cost_inr: 400000,
                  incurred_cost_inr: 324800,
                  permissible_withdrawal_inr: 324800,
                  actual_withdrawn_inr: 285000,
                  statutory_code_reference: "UP-RERA Form 2 / Engineering Sign-Off",
                  status: "DIGITALLY_SEALED",
                  sealed_by: "Consultant Lead",
                  sealed_at: "2026-09-09T14:30:00Z",
                  registration_number: reraRegNo,
                },
                {
                  id: "rera-res-03",
                  project_id: project.id,
                  quarter_label: "Q2 2026",
                  form_type: "FORM_3_CA",
                  title: "Chartered Accountant Certificate for Escrow Withdrawal",
                  authority_persona: "Auditor / Chartered Accountant",
                  physical_completion_pct: 78.5,
                  total_estimated_cost_inr: 400000,
                  incurred_cost_inr: 314000,
                  permissible_withdrawal_inr: 314000,
                  actual_withdrawn_inr: 285000,
                  statutory_code_reference: "RERA Section 4(2)(l)(D) / 70% Rule",
                  status: "AUDITED",
                  registration_number: reraRegNo,
                },
              ]
            : [
                {
                  id: "rera-twr-01",
                  project_id: project.id,
                  quarter_label: "Q2 2026",
                  form_type: "FORM_1_ARCHITECT",
                  title: "Architect's Certificate of Superstructure Completion",
                  authority_persona: "Principal Architect",
                  physical_completion_pct: 64.2,
                  total_estimated_cost_inr: 395000000,
                  incurred_cost_inr: 253590000,
                  permissible_withdrawal_inr: 253590000,
                  actual_withdrawn_inr: 242000000,
                  statutory_code_reference: "UP-RERA Rule 3(4) / Wing A Superstructure",
                  status: "DIGITALLY_SEALED",
                  sealed_by: "Principal Architect",
                  sealed_at: "2026-09-05T16:00:00Z",
                  registration_number: reraRegNo,
                },
                {
                  id: "rera-twr-02",
                  project_id: project.id,
                  quarter_label: "Q2 2026",
                  form_type: "FORM_2_ENGINEER",
                  title: "Structural Engineer Cost to Complete & Stability Audit",
                  authority_persona: "Resident SEOR",
                  physical_completion_pct: 65.0,
                  total_estimated_cost_inr: 395000000,
                  incurred_cost_inr: 256750000,
                  permissible_withdrawal_inr: 256750000,
                  actual_withdrawn_inr: 242000000,
                  statutory_code_reference: "IS 456 Structural Integrity Certification",
                  status: "DIGITALLY_SEALED",
                  sealed_by: "Resident SEOR",
                  sealed_at: "2026-09-07T10:00:00Z",
                  registration_number: reraRegNo,
                },
                {
                  id: "rera-twr-03",
                  project_id: project.id,
                  quarter_label: "Q2 2026",
                  form_type: "FORM_3_CA",
                  title: "CA Certificate of Incurred Expenditure & Escrow Release",
                  authority_persona: "Chartered Accountant (FCA)",
                  physical_completion_pct: 64.2,
                  total_estimated_cost_inr: 395000000,
                  incurred_cost_inr: 253590000,
                  permissible_withdrawal_inr: 253590000,
                  actual_withdrawn_inr: 242000000,
                  statutory_code_reference: "Section 4(2)(l)(D) 70% Bank Account Audit",
                  status: "AUDITED",
                  registration_number: reraRegNo,
                },
              ];

        setForms(defaults);
        if (!selectedForm) setSelectedForm(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [project.id, selectedForm, tier, reraRegNo]);

  useEffect(() => {
    void loadReraData();

    const channel = supabase
      .channel(`rera_sync_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rera_statutory_filings" }, () => void loadReraData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadReraData]);

  const summary = useMemo(() => {
    const form1Sealed = forms.some((f) => f.form_type === "FORM_1_ARCHITECT" && f.status === "DIGITALLY_SEALED");
    const form2Sealed = forms.some((f) => f.form_type === "FORM_2_ENGINEER" && f.status === "DIGITALLY_SEALED");
    const form3Sealed = forms.some((f) => f.form_type === "FORM_3_CA" && f.status === "DIGITALLY_SEALED");

    const caForm = forms.find((f) => f.form_type === "FORM_3_CA");
    const permissible = caForm ? caForm.permissible_withdrawal_inr : 0;
    const withdrawn = caForm ? caForm.actual_withdrawn_inr : 0;
    const balanceWithdrawalAvailable = Math.max(0, permissible - withdrawn);

    const isEscrowReleasePermitted = form1Sealed && form2Sealed;

    return { form1Sealed, form2Sealed, form3Sealed, balanceWithdrawalAvailable, isEscrowReleasePermitted };
  }, [forms]);

  const filteredForms = useMemo(() => {
    if (activeTab === "ALL") return forms;
    return forms.filter((f) => f.form_type === activeTab);
  }, [forms, activeTab]);

  // Digital Seal Handler
  const handleSealForm = async (formId: string, formType: ReraFormType) => {
    setActionInProgress(formId);

    const updatePayload: Partial<ReraFormRecord> = {
      status: "DIGITALLY_SEALED",
      sealed_by: role.label,
      sealed_at: new Date().toISOString(),
    };

    try {
      await (supabase as any).from("rera_statutory_filings").update(updatePayload).eq("id", formId);
    } catch {
      // Optimistic update
    }

    setForms((prev) =>
      prev.map((f) => (f.id === formId ? { ...f, ...updatePayload } : f))
    );
    if (selectedForm && selectedForm.id === formId) {
      setSelectedForm((prev) => (prev ? { ...prev, ...updatePayload } : null));
    }
    setActionInProgress(null);
  };

  // Printable Statutory RERA Filing Certificate
  const handlePrintReraForm = (record: ReraFormRecord) => {
    const printWin = window.open("", "_blank", "width=1000,height=850");
    if (!printWin) return;

    const cfg = RERA_CONFIG[record.form_type];

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Statutory RERA Filing Certificate — ${record.title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 19px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
    .sealed { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .pending { background: #fef3c7; color: #b45309; border: 1px solid #f59e0b; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 16px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 36px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">UP-RERA Statutory Return · Real Estate (Regulation & Development) Act</div>
      <h1 class="title">${cfg.name}</h1>
      <div class="meta">RERA Registration: <strong>${record.registration_number}</strong> · Project: ${project.name}</div>
    </div>
    <span class="badge ${record.status === 'DIGITALLY_SEALED' ? 'sealed' : 'pending'}">${record.status.replace(/_/g, ' ')}</span>
  </div>

  <table>
    <tr><th>Statutory Scope</th><td colspan="3"><strong>${record.title}</strong></td></tr>
    <tr><th>Regulatory Clause</th><td>${cfg.section}</td><th>Reporting Quarter</th><td><strong>${record.quarter_label}</strong></td></tr>
    <tr><th>Physical Progress Certified</th><td><strong>${record.physical_completion_pct}% Completed</strong></td><th>Total Estimated Project Cost</th><td class="tar">₹${record.total_estimated_cost_inr.toLocaleString("en-IN")}</td></tr>
  </table>

  <table>
    <thead>
      <tr><th>70:30 Escrow Account Audit Item</th><th>Statutory Formula / Source</th><th class="tar">Certified Amount (INR)</th></tr>
    </thead>
    <tbody>
      <tr><td>Actual Expenditure Incurred</td><td>Certified by Quantity Surveyor / Form 2</td><td class="tar">₹${record.incurred_cost_inr.toLocaleString("en-IN")}</td></tr>
      <tr><td>Percentage of Cost Incurred</td><td>Incurred / Total Estimated Cost</td><td class="tar">${((record.incurred_cost_inr / record.total_estimated_cost_inr) * 100).toFixed(2)}%</td></tr>
      <tr><td>Maximum Permissible Withdrawal from Escrow</td><td>Section 4(2)(l)(D) Ceiling</td><td class="tar" style="color: #0284c7; font-weight: bold;">₹${record.permissible_withdrawal_inr.toLocaleString("en-IN")}</td></tr>
      <tr><td>Cumulative Withdrawal to Date</td><td>Bank Statement of 70% Account</td><td class="tar">₹${record.actual_withdrawn_inr.toLocaleString("en-IN")}</td></tr>
      <tr style="background: #f1f5f9; font-weight: bold;">
        <td>BALANCE WITHDRAWAL AVAILABLE FOR RELEASE</td>
        <td>Permissible - Actual Withdrawn</td>
        <td class="tar" style="color: #15803d; font-size: 13px;">₹${Math.max(0, record.permissible_withdrawal_inr - record.actual_withdrawn_inr).toLocaleString("en-IN")}</td>
      </tr>
    </tbody>
  </table>

  <div class="box">
    <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 4px;">Statutory Declaration & Professional Liability</div>
    <div>I hereby declare that the figures certified above have been physically reconciled on site and extracted from certified books of account in strict compliance with the Real Estate (Regulation and Development) Act, 2016 and State Authority Rules.</div>
  </div>

  <div class="footer">
    <div>
      <div>Principal Architect (CA No)</div>
      <div style="color: #64748b;">Council of Architecture Reg.</div>
      <div class="sig">Form 1 Seal</div>
    </div>
    <div>
      <div>Chartered Structural Engineer</div>
      <div style="color: #64748b;">Institution of Engineers Seal.</div>
      <div class="sig">Form 2 Seal</div>
    </div>
    <div>
      <div>Chartered Accountant (ICAI)</div>
      <div style="color: #64748b;">${record.sealed_by || 'Awaiting Digital Stamp'}</div>
      <div class="sig">UDIN Certified Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedForm) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING RERA STATUTORY COMPLIANCE &amp; 70:30 ESCROW DIRECTIVES...
      </div>
    );
  }

  const activeCfg = RERA_CONFIG[selectedForm.form_type];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Statutory Disclosures · Real Estate (Regulation and Development) Act</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              RERA Compliance &amp; 70:30 Escrow Ledger
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Strict legal gatekeeping. Form 1 (Architect) and Form 2 (Engineer) certificates must be digitally sealed before Form 3 (CA) can release funds from the 70% designated RERA escrow account.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintReraForm(selectedForm)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Form Slip</span>
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs font-semibold">
              RERA Reg: <strong className="text-cyan-400">{reraRegNo}</strong>
            </span>
          </div>
        </div>

        {/* 4 PRIMARY RERA GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>RERA Form 1 (Architect)</span>
              <Building2 className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.form1Sealed ? "Sealed (78.5%)" : "Pending Seal"}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Physical percentage certified</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>RERA Form 2 (Engineer)</span>
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
              {summary.form2Sealed ? "Sealed (IS 456)" : "Pending Review"}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Structural stability confirmed</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>70% Escrow Draw Available</span>
              <Landmark className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {formatInr(summary.balanceWithdrawalAvailable)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Sec 4(2)(l)(D) compliant balance</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Governance Interlock</span>
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-2">
              {summary.isEscrowReleasePermitted ? "Unlocked" : "Locked"}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {summary.isEscrowReleasePermitted ? "Form 1 & 2 cleared" : "Requires tri-party seal"}
            </div>
          </div>
        </div>

        {/* INTERLOCK BANNER */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between font-mono text-xs ${
          summary.isEscrowReleasePermitted
            ? "border-emerald-800/80 bg-emerald-950/20 text-emerald-300"
            : "border-amber-800/80 bg-amber-950/20 text-amber-300"
        }`}>
          <div className="flex items-center gap-2">
            {summary.isEscrowReleasePermitted ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>
              {summary.isEscrowReleasePermitted
                ? "RERA STAGE-GATE SATISFIED: Architect (Form 1) and Engineer (Form 2) have verified work progress. Form 3 Escrow draw is legally authorized."
                : "RERA STAGE-GATE ON HOLD: Form 1 & Form 2 must be digitally sealed before CA can certify Form 3."}
            </span>
          </div>
          <span className="text-[10px] text-zinc-400">RERA Section 4(2)(l)(D)</span>
        </div>

        {/* TOOLBAR TABS */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
          {[
            { key: "ALL", label: `All Certificates (${forms.length})` },
            { key: "FORM_1_ARCHITECT", label: "Form 1 (Architect)" },
            { key: "FORM_2_ENGINEER", label: "Form 2 (Engineer)" },
            { key: "FORM_3_CA", label: "Form 3 (CA Escrow)" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                activeTab === tab.key
                  ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 2-COLUMN WORKBENCH: FORM QUEUE (7 cols) vs STATUTORY CERTIFICATION DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: FORM QUEUE (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Statutory Return Schedule
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">RERA Quarterly Filings ({reraRegNo})</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredForms.length} Documents</span>
            </div>

            <div className="space-y-3">
              {filteredForms.map((form) => {
                const isSelected = selectedForm.id === form.id;
                const isSealed = form.status === "DIGITALLY_SEALED";
                const cfg = RERA_CONFIG[form.form_type];

                return (
                  <div
                    key={form.id}
                    onClick={() => setSelectedForm(form)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {form.quarter_label}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase border ${cfg.badgeColor}`}>
                          {cfg.name.split(" ")[1]}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isSealed
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {form.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <span className="text-xs font-mono text-emerald-400 font-bold">
                        {form.physical_completion_pct}% Certified
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-zinc-100">{form.title}</div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{cfg.section}</div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Certifier: <strong className="text-zinc-300">{form.authority_persona}</strong></span>
                      <span>Permissible Draw: <strong className="text-cyan-400">{formatInr(form.permissible_withdrawal_inr)}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: STATUTORY CERTIFICATION DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Professional Seal Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{activeCfg.name}</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {selectedForm.quarter_label}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">Certificate Purpose:</span>
              <strong className="text-white text-sm font-sans block leading-snug">{selectedForm.title}</strong>
              <div className="text-cyan-400 text-[11px]">{activeCfg.section}</div>
              <div className="pt-2 border-t border-zinc-800/60 text-[11px] text-zinc-400">
                Designated Signatory: <strong className="text-zinc-200">{selectedForm.authority_persona}</strong>
              </div>
            </div>

            {/* 70:30 ESCROW CALCULATION BOX */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                Statutory Escrow Withdrawal Computation:
              </span>

              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Estimated Total Cost:</span>
                  <span className="text-zinc-200">{formatInr(selectedForm.total_estimated_cost_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Incurred Actual Spend:</span>
                  <span className="text-zinc-200">{formatInr(selectedForm.incurred_cost_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Physical Completion:</span>
                  <span className="text-cyan-400 font-bold">{selectedForm.physical_completion_pct}%</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-1 border-t border-zinc-800">
                  <span>Max Permissible Draw:</span>
                  <span className="text-cyan-400">{formatInr(selectedForm.permissible_withdrawal_inr)}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Cumulative Withdrawn:</span>
                  <span className="text-zinc-200">{formatInr(selectedForm.actual_withdrawn_inr)}</span>
                </div>
                <div className="flex justify-between text-emerald-400 font-extrabold text-sm pt-1 border-t border-zinc-800">
                  <span>Available for Release:</span>
                  <span>{formatInr(Math.max(0, selectedForm.permissible_withdrawal_inr - selectedForm.actual_withdrawn_inr))}</span>
                </div>
              </div>
            </div>

            {/* SEAL ACTION BUTTONS */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              {selectedForm.status !== "DIGITALLY_SEALED" ? (
                <>
                  {/* Form 1: Sealed by Architect */}
                  {selectedForm.form_type === "FORM_1_ARCHITECT" && (
                    <button
                      type="button"
                      disabled={!isArchitect || actionInProgress === selectedForm.id}
                      onClick={() => handleSealForm(selectedForm.id, "FORM_1_ARCHITECT")}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs font-mono transition flex items-center justify-center gap-1.5 shadow-md ${
                        !isArchitect
                          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                          : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-cyan-950/50"
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Affix Principal Architect Digital Seal</span>
                    </button>
                  )}

                  {/* Form 2: Sealed by Engineer */}
                  {selectedForm.form_type === "FORM_2_ENGINEER" && (
                    <button
                      type="button"
                      disabled={!isEngineer || actionInProgress === selectedForm.id}
                      onClick={() => handleSealForm(selectedForm.id, "FORM_2_ENGINEER")}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs font-mono transition flex items-center justify-center gap-1.5 shadow-md ${
                        !isEngineer
                          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                          : "bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-950/50"
                      }`}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Affix Structural Engineer Digital Seal</span>
                    </button>
                  )}

                  {/* Form 3: Sealed by CA (Dependent on Form 1 and 2) */}
                  {selectedForm.form_type === "FORM_3_CA" && (
                    <button
                      type="button"
                      disabled={
                        !summary.isEscrowReleasePermitted ||
                        !isCaOrFinance ||
                        actionInProgress === selectedForm.id
                      }
                      onClick={() => handleSealForm(selectedForm.id, "FORM_3_CA")}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs font-mono transition flex items-center justify-center gap-1.5 shadow-md ${
                        !summary.isEscrowReleasePermitted || !isCaOrFinance
                          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                          : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/50"
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                      <span>
                        {!summary.isEscrowReleasePermitted
                          ? "Locked (Awaiting Form 1 & Form 2 Seals)"
                          : "Certify Form 3 & Release Escrow Tranche"}
                      </span>
                    </button>
                  )}
                </>
              ) : (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Digitally Sealed &amp; Lodged with RERA Authority</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              RERA Act 2016 Section 4(2)(l)(D) Escrow Interlock Protocol
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}