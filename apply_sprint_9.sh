#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Applying Sprint 9 fixes: Finance Billing Hub, Meeting Minutes (MOM), and Predictive Risks...\033[0m"

# -----------------------------------------------------------------------------
# 1. FIX: app/finance/billing/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_FIN_BILLING' > app/finance/billing/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Receipt,
  Scale,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  ArrowRight,
  TrendingUp,
  FileSpreadsheet,
  Building2,
  DollarSign,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface BillingPipelineRecord {
  id: string;
  project_id: string;
  bill_number: string;
  bill_type: string;
  contractor_name: string;
  trade_package: string;
  period_start: string;
  period_end: string;
  gross_claimed_amount: number;
  gross_certified_amount: number;
  retention_deduction: number;
  advance_recovery: number;
  net_payable_amount: number;
  status: string;
}

const FALLBACK_BILLS: BillingPipelineRecord[] = [
  {
    id: "bill-fb-1",
    project_id: "PRJ-01-LIVE",
    bill_number: "RA-BILL-006",
    bill_type: "RUNNING_ACCOUNT",
    contractor_name: "Apex Structural Formworks Ltd.",
    trade_package: "Civil & Superstructure",
    period_start: "2026-09-01",
    period_end: "2026-09-25",
    gross_claimed_amount: 4200000,
    gross_certified_amount: 3950000,
    retention_deduction: 197500,
    advance_recovery: 395000,
    net_payable_amount: 3357500,
    status: "CERTIFIED_FOR_PAYMENT",
  },
  {
    id: "bill-fb-2",
    project_id: "PRJ-01-LIVE",
    bill_number: "RA-BILL-004",
    bill_type: "RUNNING_ACCOUNT",
    contractor_name: "Thermax MEP Solutions",
    trade_package: "MEP / HVAC",
    period_start: "2026-09-05",
    period_end: "2026-09-28",
    gross_claimed_amount: 2150000,
    gross_certified_amount: 2050000,
    retention_deduction: 102500,
    advance_recovery: 205000,
    net_payable_amount: 1742500,
    status: "UNDER_SCRUTINY",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function FinanceBillingPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [bills, setBills] = useState<BillingPipelineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const loadBillingPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("finance_billing_pipeline")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setBills(FALLBACK_BILLS);
      } else {
        setIsFallbackMode(false);
        setBills(data);
      }
    } catch {
      setIsFallbackMode(true);
      setBills(FALLBACK_BILLS);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadBillingPipeline();
  }, [loadBillingPipeline]);

  const summary = useMemo(() => {
    const totalGross = bills.reduce((sum, b) => sum + Number(b.gross_certified_amount || 0), 0);
    const totalRetention = bills.reduce((sum, b) => sum + Number(b.retention_deduction || 0), 0);
    const totalPayable = bills.reduce((sum, b) => sum + Number(b.net_payable_amount || 0), 0);
    return { totalGross, totalRetention, totalPayable, count: bills.length };
  }, [bills]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>FINANCE &amp; ACCOUNTS • CPWD WORKS MANUAL SECTION 16 / IPC RECONCILER</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 16 / FORM 26"
                title="Running Account Billing & Financial Recovery Pipeline"
                idealRange="5% Retention &bull; Form 31 Amortization"
                description="Governs the audit, certification, and disbursement of intermediate contractor bills. Enforces statutory retention deduction, mobilization advance amortization, and measurement book verification."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-cyan-400" />
              <span>Commercial Billing &amp; IPC Payment Pipeline</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Certified gross valuations, statutory withholdings, advance recovery, and net IPC disbursements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <Link
              href="/finance/ra-bills"
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <span>Detailed RA Bills Ledger</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Gross Certified Work</span>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? "--" : formatInr(summary.totalGross)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Cumulative verified measurement</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Net Certified for Disbursement</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "--" : formatInr(summary.totalPayable)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">After all deductions &amp; recoveries</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Statutory Retention Deducted</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {loading ? "--" : formatInr(summary.totalRetention)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">5.0% contract security pool</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Billing Cycles</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {loading ? "--" : `${summary.count} Bills`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Running Account IPC records</span>
          </div>
        </div>

        {/* BILLING TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase text-xs">Certified Billing Applications ({bills.length})</span>
            <div className="flex gap-2 text-xs">
              <Link href="/finance/measurement-book" className="text-cyan-400 hover:underline">e-MB Ledger &rarr;</Link>
              <span className="text-zinc-600">|</span>
              <Link href="/finance/advance-recovery" className="text-cyan-400 hover:underline">Form 31 Advances &rarr;</Link>
            </div>
          </div>

          <div className="overflow-x-auto border border-zinc-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                <tr>
                  <th className="p-3">Bill Ref &amp; Cycle</th>
                  <th className="p-3">Contractor Entity</th>
                  <th className="p-3 text-right">Gross Claimed</th>
                  <th className="p-3 text-right">Gross Certified</th>
                  <th className="p-3 text-right">Retention (5%)</th>
                  <th className="p-3 text-right">Advance Recovery</th>
                  <th className="p-3 text-right">Net Payable</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {bills.map((b) => (
                  <tr key={b.id} className="hover:bg-zinc-900/50 transition">
                    <td className="p-3 font-bold text-white">
                      <span>{b.bill_number}</span>
                      <span className="text-[10px] text-cyan-400 block">{b.period_start} &rarr; {b.period_end}</span>
                    </td>
                    <td className="p-3 text-zinc-300">
                      <div>{b.contractor_name}</div>
                      <div className="text-[10px] text-zinc-500 font-sans">{b.trade_package}</div>
                    </td>
                    <td className="p-3 text-right font-mono text-zinc-400">{formatInr(Number(b.gross_claimed_amount))}</td>
                    <td className="p-3 text-right font-mono text-zinc-200">{formatInr(Number(b.gross_certified_amount))}</td>
                    <td className="p-3 text-right font-mono text-amber-400">-{formatInr(Number(b.retention_deduction))}</td>
                    <td className="p-3 text-right font-mono text-zinc-400">-{formatInr(Number(b.advance_recovery))}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400 text-sm">{formatInr(Number(b.net_payable_amount))}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        b.status === "CERTIFIED_FOR_PAYMENT"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : "bg-amber-950 text-amber-400 border-amber-800"
                      }`}>
                        {b.status.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
PAGE_FIN_BILLING

# -----------------------------------------------------------------------------
# 2. FIX: app/coordination/meetings/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_MEETINGS' > app/coordination/meetings/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  Printer,
  Calendar,
  Layers,
  X,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface MOMRecord {
  id: string;
  project_id: string;
  meeting_number: string;
  title: string;
  meeting_date: string;
  meeting_type: string;
  attendees_count: number;
  open_actions_count: number;
  agenda_notes: string;
  status: "DRAFT" | "PUBLISHED" | "ACTIONED_CLOSED";
  chairperson: string;
}

const FALLBACK_MOMS: MOMRecord[] = [
  {
    id: "mom-fb-1",
    project_id: "PRJ-01-LIVE",
    meeting_number: "MOM-043",
    title: "Superstructure Level 14 Coordination & MEP Sleeves Review",
    meeting_date: "2026-09-28",
    meeting_type: "WEEKLY_SITE_COORDINATION",
    attendees_count: 8,
    open_actions_count: 3,
    agenda_notes: "Reviewed Level 14 core shuttering timeline. Directed MEP contractor to complete 400x300mm duct penetrations prior to 04-Oct concrete pour gate. Structural consultant authenticated shear key reinforcement.",
    status: "PUBLISHED",
    chairperson: "Resident SEOR / Consultant",
  },
  {
    id: "mom-fb-2",
    project_id: "PRJ-01-LIVE",
    meeting_number: "MOM-042",
    title: "Façade Procurement & Crane Tandem Rigging Planning",
    meeting_date: "2026-09-21",
    meeting_type: "ARCHITECTURAL_REVIEW",
    attendees_count: 6,
    open_actions_count: 0,
    agenda_notes: "Cleared unitized curtain wall sample mock-ups. Reviewed tower crane slew path and anemometer interlock protocol with safety director.",
    status: "ACTIONED_CLOSED",
    chairperson: "Principal Architect",
  },
];

export default function MeetingsCoordinationPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [meetings, setMeetings] = useState<MOMRecord[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MOMRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [mType, setMType] = useState("WEEKLY_SITE_COORDINATION");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState("6");

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("coordination_meeting_minutes")
        .select("*")
        .eq("project_id", projectId)
        .order("meeting_date", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setMeetings(FALLBACK_MOMS);
        setSelectedMeeting(FALLBACK_MOMS[0]);
      } else {
        setIsFallbackMode(false);
        setMeetings(data);
        setSelectedMeeting(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setMeetings(FALLBACK_MOMS);
      setSelectedMeeting(FALLBACK_MOMS[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !notes.trim()) return;

    const code = `MOM-${(meetings.length + 44).toString().padStart(3, "0")}`;
    const payload: Partial<MOMRecord> = {
      project_id: projectId,
      meeting_number: code,
      title: title.trim(),
      meeting_date: new Date().toISOString().slice(0, 10),
      meeting_type: mType,
      attendees_count: parseInt(attendees, 10) || 6,
      open_actions_count: 2,
      agenda_notes: notes.trim(),
      status: "PUBLISHED",
      chairperson: "Project Director / SEOR",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("coordination_meeting_minutes")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setMeetings((prev) => [data, ...prev]);
      setSelectedMeeting(data);
      setFeedback(`Minutes of Meeting ${code} recorded & published.`);
    } catch {
      const fallback = { ...payload, id: `mom-${Date.now()}` } as MOMRecord;
      setMeetings((prev) => [fallback, ...prev]);
      setSelectedMeeting(fallback);
      setFeedback(`MOM recorded: ${code}`);
    } finally {
      setModalOpen(false);
      setTitle("");
      setNotes("");
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handlePrintMOM = (m: MOMRecord) => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Minutes of Meeting — ${m.meeting_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #09090b; font-size: 12px; line-height: 1.6; }
    h1 { margin: 0; font-size: 20px; font-weight: 800; }
    .badge { display: inline-block; padding: 4px 10px; background: #e0f2fe; color: #0369a1; font-weight: bold; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; }
  </style>
</head>
<body>
  <div style="border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px;">
    <div style="font-size: 10px; text-transform: uppercase; color: #0284c7; font-weight: bold;">Quadillar LiveView · Site Coordination Protocol</div>
    <h1>Minutes of Meeting (MOM): ${m.title}</h1>
    <div>Ref: <strong>${m.meeting_number}</strong> &bull; Date: <strong>${m.meeting_date}</strong> &bull; Chair: <strong>${m.chairperson}</strong></div>
    <div>Project: <strong>${projectName}</strong> (${projectId})</div>
  </div>

  <table>
    <tr><th>Meeting Classification</th><td>${m.meeting_type.replace(/_/g, " ")}</td><th>Attendees Count</th><td>${m.attendees_count} Stakeholders Present</td></tr>
  </table>

  <h3 style="margin-top: 24px; font-size: 14px;">Summary of Deliberations &amp; Site Directives</h3>
  <div style="padding: 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
    ${m.agenda_notes}
  </div>

  <div style="margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
    <div><div style="border-top: 1px dashed #000; padding-top: 4px; font-weight: bold;">Lead Structural Consultant</div></div>
    <div><div style="border-top: 1px dashed #000; padding-top: 4px; font-weight: bold;">General Contractor Representative</div></div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>PROJECT COORDINATION • MULTI-STAKEHOLDER SITE PROTOCOL</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 18 / FIDIC CL. 3.2"
                title="Minutes of Meeting (MOM) & Technical Directives"
                idealRange="Formal Circulation within 24 Hours"
                description="Governs weekly site progress reviews, coordination meetings with architects and contractors, formal directives recording, and action-item tracking."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              <span>Site Coordination &amp; Minutes of Meeting (MOM)</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Weekly progress records, architectural coordination agendas, and action items.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              onClick={() => void loadMeetings()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Record New MOM</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* LEFT: MEETING ROSTER (5 cols) */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase">Coordination Sessions ({meetings.length})</span>
            </div>

            <div className="space-y-3">
              {meetings.map((m) => {
                const isSelected = selectedMeeting?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMeeting(m)}
                    className={`p-4 rounded border transition cursor-pointer space-y-2 ${
                      isSelected ? "border-cyan-500/60 bg-cyan-950/20" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{m.meeting_number}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{m.meeting_date}</span>
                    </div>
                    <div className="text-zinc-200 font-bold text-xs">{m.title}</div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-850 pt-2">
                      <span>Attendees: <strong className="text-zinc-300">{m.attendees_count}</strong></span>
                      <span className={`font-bold ${m.open_actions_count > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                        {m.open_actions_count} Open Actions
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: MOM VIEWER & DIRECTIVES (7 cols) */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 p-6 space-y-5 rounded-sm shadow-2xl">
            {selectedMeeting ? (
              <>
                <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase text-cyan-400 font-bold block">{selectedMeeting.meeting_number}</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedMeeting.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintMOM(selectedMeeting)}
                      className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print MOM</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Meeting Date:</span>
                    <strong className="text-white">{selectedMeeting.meeting_date}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Classification:</span>
                    <strong className="text-cyan-300">{selectedMeeting.meeting_type.replace(/_/g, " ")}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Chairperson:</span>
                    <span className="text-zinc-300">{selectedMeeting.chairperson}</span>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Directives &amp; Action Notes:</span>
                  <p className="text-xs text-zinc-200 font-sans leading-relaxed">{selectedMeeting.agenda_notes}</p>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-zinc-500">Select a meeting to inspect minutes and directives.</div>
            )}
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Record Site Minutes of Meeting (MOM)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateMeeting} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Meeting Agenda Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tower A Podium Slab Formwork & Rebar Concurrence"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Meeting Type</label>
                    <select
                      value={mType}
                      onChange={(e) => setMType(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                    >
                      <option value="WEEKLY_SITE_COORDINATION">Weekly Site Coordination</option>
                      <option value="ARCHITECTURAL_REVIEW">Architectural / MEP Review</option>
                      <option value="COMMERCIAL_AUDIT">Commercial &amp; Billing Audit</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Attendees Present</label>
                    <input
                      type="number"
                      value={attendees}
                      onChange={(e) => setAttendees(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Summary of Deliberations &amp; Directives *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Document decisions, designated contractors, and milestone dates agreed..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Publish MOM Protocol
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
PAGE_MEETINGS

# -----------------------------------------------------------------------------
# 3. FIX: app/intelligence/risks/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_RISKS' > app/intelligence/risks/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  TrendingDown,
  ShieldAlert,
  Flame,
  Zap,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface PredictiveRiskItem {
  id: string;
  project_id: string;
  risk_code: string;
  title: string;
  category: "Quality" | "Weather" | "Schedule" | "Commercial" | "Safety";
  probability: number;
  impact: number;
  estimated_cost_exposure: number;
  signal_description: string;
  mitigation_directive: string;
  status: "ACTIVE_MONITORING" | "MITIGATION_SCHEDULED" | "RESOLVED";
}

const FALLBACK_RISKS: PredictiveRiskItem[] = [
  {
    id: "rsk-fb-1",
    project_id: "PRJ-01-LIVE",
    risk_code: "RSK-001",
    title: "Quality Rejection & Cube Strength Deviation",
    category: "Quality",
    probability: 0.72,
    impact: 4,
    estimated_cost_exposure: 18500000,
    signal_description: "WIR rejection rate 18%; 7-day cube breaks trending 8% below characteristic target.",
    mitigation_directive: "Increase batching plant silt content tests and enforce IS 456 Clause 15 28-day accelerated water curing.",
    status: "ACTIVE_MONITORING",
  },
  {
    id: "rsk-fb-2",
    project_id: "PRJ-01-LIVE",
    risk_code: "RSK-002",
    title: "Monsoon Precipitation & High Wind Rigging Interlock",
    category: "Weather",
    probability: 0.55,
    impact: 3,
    estimated_cost_exposure: 9200000,
    signal_description: "Anemometer telemetry forecast projects wind speed > 38 km/h over the next 48 hours.",
    mitigation_directive: "Re-sequence facade installation to leeward podium sectors and pause tower crane tandem lifts.",
    status: "ACTIVE_MONITORING",
  },
  {
    id: "rsk-fb-3",
    project_id: "PRJ-01-LIVE",
    risk_code: "RSK-003",
    title: "Aging Design RFIs & Architectural Revisions",
    category: "Schedule",
    probability: 0.81,
    impact: 4,
    estimated_cost_exposure: 12400000,
    signal_description: "Open RFI aging exceeds 72 hours across Level 15 shear key details.",
    mitigation_directive: "Convene urgent BIM clash session with Principal Architect to sign off GFC Rev-04.",
    status: "ACTIVE_MONITORING",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function PredictiveRisksPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [risks, setRisks] = useState<PredictiveRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadRisks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("predictive_risk_register")
        .select("*")
        .eq("project_id", projectId)
        .order("impact", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setRisks(FALLBACK_RISKS);
      } else {
        setIsFallbackMode(false);
        setRisks(data);
      }
    } catch {
      setIsFallbackMode(true);
      setRisks(FALLBACK_RISKS);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadRisks();
  }, [loadRisks]);

  const summary = useMemo(() => {
    const totalExposure = risks.reduce((sum, r) => sum + Number(r.estimated_cost_exposure || 0), 0);
    const highRisks = risks.filter((r) => r.impact >= 4).length;
    return { count: risks.length, totalExposure, highRisks };
  }, [risks]);

  const handleMitigate = async (id: string) => {
    try {
      await (supabase as any)
        .from("predictive_risk_register")
        .update({ status: "MITIGATION_SCHEDULED" })
        .eq("id", id);
    } catch {
      // optimistic
    }

    setRisks((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "MITIGATION_SCHEDULED" } : r))
    );
    setFeedback("Mitigation directive dispatched to critical path schedule.");
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>PREDICTIVE INTELLIGENCE • RISK FORECAST &amp; ANOMALY TELEMETRY</span>
              <StatutoryInfo
                standardRef="ISO 31000 / PMI EVM RISK"
                title="Predictive Construction Risk Matrix"
                idealRange="Critical Exposure < 10% Contract Sum"
                description="Cross-references leading indicators: WIR rejections, concrete maturity curves, RFI turnaround latencies, and weather forecasts to predict schedule slippage."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-cyan-400" />
              <span>Predictive Risk Intelligence &amp; Anomaly Engine</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Leading risk signals, 5x5 severity matrix, and automated mitigation directives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              onClick={() => void loadRisks()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 3 SUMMARY TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Estimated Exposure</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{formatInr(summary.totalExposure)}</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Quantified commercial liability</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">High Severity Threats (Impact &ge; 4)</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">{summary.highRisks} Critical Risks</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Immediate mitigation required</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Monitored Signals</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{summary.count} Leading Indicators</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Quality, Weather &amp; Schedule loops</span>
          </div>
        </div>

        {/* 5x5 RISK MATRIX */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
            5 &times; 5 Probability / Impact Risk Heatmap
          </span>

          <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto">
            {Array.from({ length: 25 }, (_, idx) => {
              const impact = 5 - Math.floor(idx / 5);
              const prob = (idx % 5) + 1;
              const matches = risks.filter(
                (r) => r.impact === impact && Math.ceil(r.probability * 5) === prob
              );
              const score = impact * prob;

              return (
                <div
                  key={idx}
                  className={`h-12 rounded flex items-center justify-center font-bold text-xs border ${
                    score >= 16
                      ? "bg-rose-950/80 border-rose-800 text-rose-300"
                      : score >= 9
                      ? "bg-amber-950/80 border-amber-800 text-amber-300"
                      : "bg-cyan-950/60 border-cyan-800 text-cyan-300"
                  }`}
                  title={`Impact: ${impact}/5 &bull; Prob: ${prob}/5`}
                >
                  {matches.length > 0 ? `${matches.length} RSK` : ""}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 max-w-lg mx-auto">
            <span>Low Probability &bull; Low Impact</span>
            <span>High Probability &bull; Severe Impact</span>
          </div>
        </div>

        {/* RISK CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {risks.map((r) => {
            const isMitigated = r.status === "MITIGATION_SCHEDULED";
            return (
              <div key={r.id} className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">{r.risk_code}</span>
                    <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase border ${
                      r.impact >= 4 ? "bg-rose-950 text-rose-400 border-rose-800" : "bg-amber-950 text-amber-400 border-amber-800"
                    }`}>
                      {r.category} &bull; Imp: {r.impact}/5
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-100 font-sans">{r.title}</h3>

                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Signal:</span>
                    <p className="text-[11px] text-zinc-300 font-sans">{r.signal_description}</p>
                  </div>

                  <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded space-y-1">
                    <span className="text-[10px] text-cyan-400 uppercase font-bold block">Mitigation Directive:</span>
                    <p className="text-[11px] text-zinc-300 font-sans">{r.mitigation_directive}</p>
                  </div>

                  <div className="text-[11px] text-zinc-400 font-mono pt-1">
                    Exposure: <strong className="text-amber-400">{formatInr(Number(r.estimated_cost_exposure))}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isMitigated}
                  onClick={() => handleMitigate(r.id)}
                  className={`w-full py-2 rounded text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 ${
                    isMitigated
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950"
                  }`}
                >
                  {isMitigated ? "Mitigation Queued" : "Dispatch Mitigation"}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
PAGE_RISKS

echo -e "\033[1;32m[✓] Sprint 9 patched successfully! All 3 files updated.\033[0m"
