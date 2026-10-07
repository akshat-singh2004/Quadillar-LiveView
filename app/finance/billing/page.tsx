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
