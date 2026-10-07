"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Receipt,
  FileCheck2,
  Scale,
  RefreshCw,
  Search,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Database,
  Building2,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface PaymentAppSummary {
  id: string;
  project_id: string;
  application_no: number;
  period_to: string;
  contractor_name: string;
  trade_package: string;
  contract_sum_to_date: number;
  total_completed_and_stored: number;
  retainage_amount: number;
  current_payment_due: number;
  status: string;
}

const FALLBACK_APPS: PaymentAppSummary[] = [
  {
    id: "pa-fb-1",
    project_id: "PRJ-01-LIVE",
    application_no: 6,
    period_to: "2026-09-30",
    contractor_name: "Apex Structural Formworks Ltd.",
    trade_package: "Civil & Superstructure",
    contract_sum_to_date: 15992000,
    total_completed_and_stored: 9450000,
    retainage_amount: 472500,
    current_payment_due: 1777500,
    status: "CERTIFIED",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function BillingMasterPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [apps, setApps] = useState<PaymentAppSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const loadBillingData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("billing_payment_applications")
        .select("*")
        .eq("project_id", projectId)
        .order("application_no", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setApps(FALLBACK_APPS);
      } else {
        setIsFallbackMode(false);
        setApps(data);
      }
    } catch {
      setIsFallbackMode(true);
      setApps(FALLBACK_APPS);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadBillingData();
  }, [loadBillingData]);

  const summary = useMemo(() => {
    const totalDue = apps.reduce((sum, a) => sum + Number(a.current_payment_due || 0), 0);
    const totalRetainage = apps.reduce((sum, a) => sum + Number(a.retainage_amount || 0), 0);
    const totalCompleted = apps.reduce((sum, a) => sum + Number(a.total_completed_and_stored || 0), 0);
    return { totalDue, totalRetainage, totalCompleted, count: apps.length };
  }, [apps]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>COMMERCIAL MANAGEMENT • PROGRESS BILLING &amp; PAYMENT CLEARINGHOUSE</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 16 / AIA G702"
                title="Progress Billing & Payment Application Control"
                idealRange="5% Mandatory Retention Deducted"
                description="Governs intermediate billing cycles, AIA Document G702 payment certification, e-MB quantity reconciliations, and Running Account (RA) disbursement audits."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-cyan-400" />
              <span>Commercial Billing &amp; Payment Applications</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Central billing pipeline, certified work applications, and statutory retention tracking.
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
              href="/billing/g702"
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <span>Open AIA G702 Certificate</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* 4 SUMMARY TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Work Completed to Date</span>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? "--" : formatInr(summary.totalCompleted)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Certified completed &amp; stored items</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Net Payment Due (Current Cycle)</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "--" : formatInr(summary.totalDue)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Certified for immediate disbursement</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Cumulative Retainage Held</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {loading ? "--" : formatInr(summary.totalRetainage)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">5.0% contract security withheld</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Payment Applications</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {loading ? "--" : `${summary.count} Applications`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Under AIA G702 / CPWD Form 26</span>
          </div>
        </div>

        {/* WORKBENCH & LINKS */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase text-xs">Payment Applications Ledger ({apps.length})</span>
            <div className="flex gap-2">
              <Link href="/finance/ra-bills" className="text-xs text-cyan-400 hover:underline">Running Account Bills &rarr;</Link>
              <span className="text-zinc-600">|</span>
              <Link href="/finance/ipc" className="text-xs text-cyan-400 hover:underline">IPC Reconciler &rarr;</Link>
            </div>
          </div>

          <div className="overflow-x-auto border border-zinc-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                <tr>
                  <th className="p-3">Application Ref</th>
                  <th className="p-3">Trade Package &amp; Contractor</th>
                  <th className="p-3 text-right">Contract Sum</th>
                  <th className="p-3 text-right">Completed to Date</th>
                  <th className="p-3 text-right">5% Retainage</th>
                  <th className="p-3 text-right">Current Due</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-zinc-900/50 transition">
                    <td className="p-3">
                      <span className="font-bold text-white block">Application #{a.application_no}</span>
                      <span className="text-[10px] text-cyan-400 font-mono">Period: {a.period_to}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-zinc-200 block font-bold">{a.trade_package}</span>
                      <span className="text-[10px] text-zinc-400">{a.contractor_name}</span>
                    </td>
                    <td className="p-3 text-right font-mono text-zinc-400">{formatInr(Number(a.contract_sum_to_date))}</td>
                    <td className="p-3 text-right font-mono text-zinc-200">{formatInr(Number(a.total_completed_and_stored))}</td>
                    <td className="p-3 text-right font-mono text-amber-400">{formatInr(Number(a.retainage_amount))}</td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400 text-sm">{formatInr(Number(a.current_payment_due))}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {a.status}
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
