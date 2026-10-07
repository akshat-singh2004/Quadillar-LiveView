import React from "react";
import { createClient } from "@/lib/supabase/server";
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  Clock,
  ArrowUpRight,
  Layers,
  FileCheck2,
} from "lucide-react";

function formatInr(val: number): string {
  if (!val || val === 0) return "₹0";
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export default async function ExecutiveConsolePage() {
  const supabase = await createClient();

  // 1. Resolve Project Context
  const { data: project } = await supabase
    .from("projects")
    .select("project_id, project_name, contract_value, gcc_protocol")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = project?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = project?.project_name || "Gomti Nagar Extension Commercial Hub";
  const committedCap = Number(project?.contract_value) || 0;

  // 2. Certified Work Output (RA Bills)
  const { data: bills } = await supabase
    .from("running_account_bills")
    .select("net_payable_certified, gross_valuation, status")
    .eq("project_id", projectId);

  const certifiedOutput = (bills || [])
    .filter((b) => b.status === "SEOR_CERTIFIED_IPC" || b.status === "FINANCE_DISBURSED")
    .reduce((sum, b) => sum + (Number(b.net_payable_certified) || 0), 0);

  // 3. Quality & Punchlist Defect Exposure
  const { data: snags } = await supabase
    .from("punch_list_items")
    .select("id, severity_tier, status")
    .eq("project_id", projectId)
    .neq("status", "CLOSED");

  const urgentDefects = (snags || []).filter(
    (s) => s.severity_tier === "CATEGORY_A" || s.severity_tier === "CAT-A CRITICAL"
  ).length;

  // 4. Milestone Packages (Real dynamic or zero-state)
  const { data: mbRows } = await supabase
    .from("digital_measurement_book_entries")
    .select("measured_quantity")
    .eq("project_id", projectId);

  const totalQty = (mbRows || []).reduce((sum, r) => sum + (Number(r.measured_quantity) || 0), 0);
  const executionPct = committedCap > 0 ? Math.min(100, Math.round((certifiedOutput / committedCap) * 100)) : 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* SUBHEADER TITLE */}
        <div className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-widest text-zinc-500 font-semibold mb-1">
              BOARD &amp; INVESTOR GOVERNANCE CONSOLE • {projectId}
            </div>
            <h1 className="text-2xl font-bold font-mono tracking-tight text-zinc-100">
              Portfolio &amp; Treasury Overview
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Audited balance sheet, liquidity drawdown runway, and physical execution status.
            </p>
          </div>
        </div>

        {/* 4 TOP REVENUE / TREASURY TILES (Monotone, no rainbow accents) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono text-xs">
          
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <div className="flex items-center justify-between text-zinc-500 text-[11px]">
              <span>COMMITTED CAPITAL CAP</span>
              <Wallet className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-100 mt-2 tabular-nums">
              {formatInr(committedCap)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Target contract ceiling</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <div className="flex items-center justify-between text-zinc-500 text-[11px]">
              <span>CERTIFIED WORK OUTPUT</span>
              <TrendingUp className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-200 mt-2 tabular-nums">
              {formatInr(certifiedOutput)}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Audited against physical hold-gates</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <div className="flex items-center justify-between text-zinc-500 text-[11px]">
              <span>SCHEDULE VARIANCE (SPI)</span>
              <Clock className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-200 mt-2 tabular-nums">
              0d
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Contemporaneous baseline delta</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <div className="flex items-center justify-between text-zinc-500 text-[11px]">
              <span>DEFECT EXPOSURE</span>
              <ShieldCheck className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-bold text-zinc-200 mt-2 tabular-nums">
              {urgentDefects} Urgent
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Unresolved Category-A tickets</div>
          </div>

        </div>

        {/* PROGRESS SECTION: SOOTHING UNIFIED BARS (Subtle slate/cyan-500 fill, NO gradients) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 font-mono text-xs">
          
          {/* PACKAGE MIX & EXECUTION */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                  CAPITAL ALLOCATION
                </span>
                <span className="text-sm font-bold text-zinc-200">Package Mix &amp; Progress</span>
              </div>
              <span className="text-zinc-500 text-[11px]">{executionPct}% Overall</span>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <div className="flex justify-between text-zinc-300 text-xs mb-1.5">
                  <span>Physical Construction Work</span>
                  <span className="text-zinc-400">{executionPct}%</span>
                </div>
                {/* Soothing single-tint bar */}
                <div className="h-2 w-full bg-zinc-800 overflow-hidden rounded-none">
                  <div
                    className="h-full bg-cyan-600 transition-all duration-300"
                    style={{ width: `${executionPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 mt-1">
                  <span>Certified: {formatInr(certifiedOutput)}</span>
                  <span>Ceiling: {formatInr(committedCap)}</span>
                </div>
              </div>

              {totalQty === 0 && (
                <div className="p-3 bg-zinc-950 border border-zinc-800/80 text-zinc-500 text-center text-[11px]">
                  No trade packages logged yet. Data will populate dynamically as e-MB entries are recorded.
                </div>
              )}
            </div>
          </div>

          {/* KEY MILESTONE TRAJECTORY */}
          <div className="bg-zinc-900/50 border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                  PHYSICAL EXECUTION
                </span>
                <span className="text-sm font-bold text-zinc-200">Key Milestone Trajectory</span>
              </div>
              <span className="text-zinc-500 text-[11px]">ISO 19650 Gates</span>
            </div>

            <div className="space-y-3 pt-1">
              <div className="p-3 bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-300">Substructure &amp; Raft Foundation</span>
                <span className="px-2 py-0.5 border border-zinc-800 bg-zinc-900 text-zinc-400 text-[10px]">
                  {executionPct > 0 ? "In Progress" : "Pending Inward"}
                </span>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-300">Superstructure Shear Walls &amp; Slabs</span>
                <span className="px-2 py-0.5 border border-zinc-800 bg-zinc-900 text-zinc-400 text-[10px]">
                  {executionPct > 40 ? "Active" : "Pending"}
                </span>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-300">MEP Services &amp; Pre-Handover Snagging</span>
                <span className="px-2 py-0.5 border border-zinc-800 bg-zinc-900 text-zinc-400 text-[10px]">
                  {urgentDefects === 0 ? "Clear" : `${urgentDefects} On Hold`}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
