"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Printer,
  RefreshCw,
  Search,
  CheckCircle2,
  Scale,
  ShieldCheck,
  Database,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface G702Application {
  id: string;
  project_id: string;
  application_no: number;
  period_to: string;
  contractor_name: string;
  trade_package: string;
  original_contract_sum: number;
  net_change_orders: number;
  contract_sum_to_date: number;
  total_completed_and_stored: number;
  retainage_amount: number;
  total_earned_less_retainage: number;
  less_previous_certificates: number;
  current_payment_due: number;
  status: "DRAFT" | "SUBMITTED" | "CERTIFIED" | "PAID";
}

const FALLBACK_G702: G702Application = {
  id: "g702-fb-1",
  project_id: "PRJ-01-LIVE",
  application_no: 6,
  period_to: "2026-09-30",
  contractor_name: "Apex Structural Formworks Ltd.",
  trade_package: "Civil & Superstructure",
  original_contract_sum: 13800000,
  net_change_orders: 2192000,
  contract_sum_to_date: 15992000,
  total_completed_and_stored: 9450000,
  retainage_amount: 472500,
  total_earned_less_retainage: 8977500,
  less_previous_certificates: 7200000,
  current_payment_due: 1777500,
  status: "CERTIFIED",
};

function formatInr(val: number) {
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function AIA_G702Page() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [cert, setCert] = useState<G702Application>(FALLBACK_G702);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const loadCert = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("billing_payment_applications")
        .select("*")
        .eq("project_id", projectId)
        .order("application_no", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        setIsFallbackMode(true);
        setCert(FALLBACK_G702);
      } else {
        setIsFallbackMode(false);
        setCert(data);
      }
    } catch {
      setIsFallbackMode(true);
      setCert(FALLBACK_G702);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadCert();
  }, [loadCert]);

  const balanceToFinish = Math.max(0, cert.contract_sum_to_date - cert.total_completed_and_stored);

  const handlePrintG702 = () => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>AIA Document G702 — Application &amp; Certificate for Payment</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 36px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px; }
    .title { font-size: 18px; font-weight: bold; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
    .tar { text-align: right; font-family: monospace; }
    .highlight { background: #f1f5f9; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div style="font-size: 10px; text-transform: uppercase; color: #0284c7; font-weight: bold;">AIA Document G702 / CPWD Form 26 Equivalent</div>
    <h1 class="title">Application and Certificate for Payment</h1>
    <div>Project: <strong>${projectName}</strong> (${projectId}) &bull; Contractor: <strong>${cert.contractor_name}</strong></div>
    <div>Application No: <strong>#${cert.application_no}</strong> &bull; Period To: <strong>${cert.period_to}</strong></div>
  </div>

  <table>
    <tr><td>1. ORIGINAL CONTRACT SUM</td><td class="tar">${formatInr(cert.original_contract_sum)}</td></tr>
    <tr><td>2. Net change by Change Orders (Variations)</td><td class="tar">${formatInr(cert.net_change_orders)}</td></tr>
    <tr class="highlight"><td>3. CONTRACT SUM TO DATE (Line 1 &plusmn; 2)</td><td class="tar">${formatInr(cert.contract_sum_to_date)}</td></tr>
    <tr><td>4. TOTAL COMPLETED &amp; STORED TO DATE</td><td class="tar">${formatInr(cert.total_completed_and_stored)}</td></tr>
    <tr><td>5. RETAINAGE (5% of Completed Work)</td><td class="tar">${formatInr(cert.retainage_amount)}</td></tr>
    <tr class="highlight"><td>6. TOTAL EARNED LESS RETAINAGE (Line 4 less Line 5)</td><td class="tar">${formatInr(cert.total_earned_less_retainage)}</td></tr>
    <tr><td>7. LESS PREVIOUS CERTIFICATES FOR PAYMENT</td><td class="tar">${formatInr(cert.less_previous_certificates)}</td></tr>
    <tr class="highlight" style="font-size: 13px; color: #15803d;"><td>8. CURRENT PAYMENT DUE (Line 6 less Line 7)</td><td class="tar"><strong>${formatInr(cert.current_payment_due)}</strong></td></tr>
    <tr><td>9. BALANCE TO FINISH, INCLUDING RETAINAGE</td><td class="tar">${formatInr(balanceToFinish)}</td></tr>
  </table>

  <div style="margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
    <div>
      <div>Contractor Certification:</div>
      <div style="border-top: 1px dashed #000; margin-top: 36px; padding-top: 4px; font-weight: bold;">Authorized Contractor Officer</div>
    </div>
    <div>
      <div>Architect / Engineer Certification:</div>
      <div style="border-top: 1px dashed #000; margin-top: 36px; padding-top: 4px; font-weight: bold;">Resident SEOR / Consultant Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <Link href="/billing" className="text-xs text-cyan-400 hover:underline flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Billing Overview</span>
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-cyan-400" />
              <span>AIA Document G702 &mdash; Certificate for Payment</span>
            </h1>
            <p className="text-xs text-zinc-400 font-sans">
              Contractor: <strong className="text-zinc-200">{cert.contractor_name}</strong> &bull; Package: {cert.trade_package} &bull; Application #{cert.application_no}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrintG702}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print G702 Docket</span>
            </button>
          </div>
        </header>

        {/* 9-LINE AIA G702 SUMMARY FORM */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-6 space-y-4 rounded-sm shadow-2xl">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="text-white font-bold text-xs uppercase">Contractor&apos;s Signed Payment Application</span>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
              {cert.status}
            </span>
          </div>

          <div className="divide-y divide-zinc-800/80 text-xs">
            <div className="py-3 flex justify-between">
              <span className="text-zinc-400">1. Original Contract Sum</span>
              <strong className="text-white font-mono">{formatInr(cert.original_contract_sum)}</strong>
            </div>

            <div className="py-3 flex justify-between">
              <span className="text-zinc-400">2. Net change by Change Orders (Variations)</span>
              <strong className="text-cyan-400 font-mono">+{formatInr(cert.net_change_orders)}</strong>
            </div>

            <div className="py-3 flex justify-between bg-zinc-950/60 px-2 rounded font-bold">
              <span className="text-zinc-200">3. Contract Sum to Date (Line 1 &plusmn; 2)</span>
              <span className="text-white font-mono text-sm">{formatInr(cert.contract_sum_to_date)}</span>
            </div>

            <div className="py-3 flex justify-between">
              <span className="text-zinc-400">4. Total Completed &amp; Stored to Date</span>
              <strong className="text-zinc-200 font-mono">{formatInr(cert.total_completed_and_stored)}</strong>
            </div>

            <div className="py-3 flex justify-between">
              <span className="text-zinc-400">5. Retainage (5.0% of Completed Work)</span>
              <strong className="text-amber-400 font-mono">-{formatInr(cert.retainage_amount)}</strong>
            </div>

            <div className="py-3 flex justify-between bg-zinc-950/60 px-2 rounded font-bold">
              <span className="text-zinc-200">6. Total Earned Less Retainage (Line 4 less Line 5)</span>
              <span className="text-white font-mono">{formatInr(cert.total_earned_less_retainage)}</span>
            </div>

            <div className="py-3 flex justify-between">
              <span className="text-zinc-400">7. Less Previous Certificates for Payment</span>
              <strong className="text-zinc-400 font-mono">-{formatInr(cert.less_previous_certificates)}</strong>
            </div>

            <div className="py-4 flex justify-between bg-emerald-950/30 border border-emerald-800/60 px-3 rounded font-extrabold text-sm">
              <span className="text-emerald-300">8. CURRENT PAYMENT DUE (Line 6 less Line 7)</span>
              <span className="text-emerald-400 font-mono text-base">{formatInr(cert.current_payment_due)}</span>
            </div>

            <div className="py-3 flex justify-between">
              <span className="text-zinc-500">9. Balance to Finish, Including Retainage</span>
              <span className="text-zinc-400 font-mono">{formatInr(balanceToFinish)}</span>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
