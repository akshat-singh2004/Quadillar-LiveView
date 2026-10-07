import React from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteStreamPlayer } from "@/components/site/SiteStreamPlayer";
import { CouncilStatusMatrix } from "@/components/governance/CouncilStatusMatrix";
import { evaluateAutonomousCouncil } from "@/app/actions/council-actions";
import {
  ShieldCheck,
  Video,
  Receipt,
  Layers,
  AlertCircle,
  Clock,
  Activity,
} from "lucide-react";

function formatInr(val: number): string {
  if (!val || val === 0) return "₹0.00";
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export default async function RealityCommandRootPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name, contract_value, active_stage")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";
  const contractBudget = Number(projectRow?.contract_value) || 450000000;

  // Run autonomous council evaluation server-side
  const initialAuditReport = await evaluateAutonomousCouncil(projectId);

  // 1. Digital Measurement Book turnover
  const { data: mbRows } = await supabase
    .from("digital_measurement_book_entries")
    .select("calculated_quantity")
    .eq("project_id", projectId)
    .eq("ae_test_checked", true);

  const certifiedMbLines = mbRows?.length || 0;

  // 2. Certified RA Bills
  const { data: bills } = await supabase
    .from("running_account_bills")
    .select("net_payable_certified, retention_amount, status")
    .eq("project_id", projectId);

  const totalRetentionEscrow = (bills || []).reduce(
    (sum, b) => sum + (Number(b.retention_amount) || 0),
    0
  );

  // 3. Quality Withholding Liens (NCRs)
  const { data: ncrs } = await supabase
    .from("quality_ncr_register")
    .select("withholding_amount_inr, status")
    .eq("project_id", projectId)
    .neq("status", "CLOSED");

  const totalNcrDebits = (ncrs || []).reduce(
    (sum, r) => sum + (Number(r.withholding_amount_inr) || 0),
    0
  );

  // 4. Contemporaneous Hindrances & Delay Float
  const { data: hindrances } = await supabase
    .from("site_hindrance_register")
    .select("days_hindered, status")
    .eq("project_id", projectId)
    .eq("status", "OPEN_CRITICAL_DELAY");

  const delayDays = (hindrances || []).reduce(
    (sum, r) => sum + (Number(r.days_hindered) || 0),
    0
  );

  // 5. Section 65B Audit Trail
  const { data: auditLogs } = await supabase
    .from("immutable_audit_logs")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(4);

  const logs = auditLogs || [];

  return (
    <div className="w-full bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-5">
      <header className="border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>STATUTORY PROJECT GOVERNANCE • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white uppercase mt-0.5">
            Master Command Center
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Contract Baseline: <strong className="text-zinc-200">{formatInr(contractBudget)}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold uppercase text-[10px]">
            POSTGRES RLS ENFORCED
          </div>
        </div>
      </header>

      {/* 5 EXECUTIVE TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] uppercase text-zinc-500 block font-bold">Contract Baseline</span>
          <div className="text-lg font-bold text-white tabular-nums">{formatInr(contractBudget)}</div>
          <span className="text-[10px] text-zinc-500 block">Sanctioned BOQ Value</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] uppercase text-zinc-500 block font-bold">Certified e-MB Measure</span>
          <div className="text-lg font-bold text-cyan-400 tabular-nums">
            {certifiedMbLines} Verified Lines
          </div>
          <span className="text-[10px] text-zinc-500 block">AE Test-Checked</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] uppercase text-zinc-500 block font-bold">Retained Escrow (5%)</span>
          <div className="text-lg font-bold text-amber-400 tabular-nums">{formatInr(totalRetentionEscrow)}</div>
          <span className="text-[10px] text-zinc-500 block">CPWD Cl. 1A / FIDIC 14.3</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-1">
          <span className="text-[10px] uppercase text-zinc-500 block font-bold">Active NCR Liens</span>
          <div className={`text-lg font-bold tabular-nums ${totalNcrDebits > 0 ? "text-rose-400" : "text-zinc-400"}`}>
            {formatInr(totalNcrDebits)}
          </div>
          <span className="text-[10px] text-zinc-500 block">{ncrs?.length || 0} Open Holds</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-3.5 rounded-xl space-y-1 col-span-2 lg:col-span-1">
          <span className="text-[10px] uppercase text-zinc-500 block font-bold">Critical Path Float</span>
          <div className={`text-lg font-bold tabular-nums ${delayDays > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {delayDays > 0 ? `+${delayDays} Days Delay` : "On Baseline (0d)"}
          </div>
          <span className="text-[10px] text-zinc-500 block">Clause 5 EOT Register</span>
        </div>
      </div>

      {/* AUTONOMOUS COUNCIL STATUS MATRIX (11 GOVERNORS) */}
      <CouncilStatusMatrix initialReport={initialAuditReport} projectId={projectId} />

      {/* OPERATIONS & AUDIT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Video className="w-4 h-4 text-zinc-400" />
              <span className="font-bold text-white uppercase">Site Video &amp; Reality Gateway</span>
            </div>
            <span className="text-[10px] text-zinc-500 font-bold uppercase">HARDWARE UNPAIRED</span>
          </div>

          <div className="w-full rounded-xl overflow-hidden border border-zinc-800">
            <SiteStreamPlayer />
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-1">
            <Link href="/quality/pour-cards" className="p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition rounded-xl block">
              <span className="text-[10px] text-zinc-500 uppercase block">Pour Cards</span>
              <span className="font-bold text-zinc-200 mt-0.5 block text-[11px]">IS 456 Clearance &rarr;</span>
            </Link>
            <Link href="/finance/ra-bills" className="p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition rounded-xl block">
              <span className="text-[10px] text-zinc-500 uppercase block">RA Bills</span>
              <span className="font-bold text-zinc-200 mt-0.5 block text-[11px]">IPC Certification &rarr;</span>
            </Link>
            <Link href="/handover/punch-list" className="p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition rounded-xl block">
              <span className="text-[10px] text-zinc-500 uppercase block">Taking-Over</span>
              <span className="font-bold text-zinc-200 mt-0.5 block text-[11px]">TOC Snag Check &rarr;</span>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase">Section 65B Notarized Audit Stream</span>
            <span className="text-[10px] text-zinc-500">HERMES MERKLE SEAL</span>
          </div>

          <div className="space-y-2.5">
            {logs.length === 0 ? (
              <div className="py-16 text-center text-zinc-600 font-sans text-xs">
                Zero transactions notarized yet.
              </div>
            ) : (
              logs.map((log: any) => (
                <div key={log.id} className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-zinc-200 font-bold text-xs">{log.action_title || log.action_category}</span>
                    <span className="text-[10px] text-zinc-500">{new Date(log.created_at).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-sans line-clamp-2">{log.details || log.action_description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
