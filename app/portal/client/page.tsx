"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  Clock,
  Coins,
  ShieldCheck,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  FileCheck2,
} from "lucide-react";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";
import { ClientExecutiveDashboard } from "@/components/portal/ClientExecutiveDashboard";

function FallbackClientDashboard() {
  const { project } = useActiveRole();
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  return (
    <div className="space-y-6">
      {/* 4 SUMMARY METRIC TILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
        <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Physical Execution Progress</span>
          <div className="text-2xl font-bold text-white mt-1">68.4% Cast</div>
          <span className="text-[10px] text-emerald-400 mt-1 block">Level 14 Core Slab Complete</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Financial Milestone Drawdown</span>
          <div className="text-2xl font-bold text-cyan-400 mt-1">₹42.50 Cr</div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Certified against master escrow</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Statutory Target Handover</span>
          <div className="text-2xl font-bold text-white mt-1">Dec 31, 2026</div>
          <span className="text-[10px] text-zinc-500 mt-1 block">Zero critical path float breach</span>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Quality &amp; RERA Index</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">98.2% Pass</div>
          <span className="text-[10px] text-zinc-500 mt-1 block">IS 456 / IS 10262 certified</span>
        </div>
      </div>

      <div className="p-6 bg-zinc-900/40 border border-zinc-800 rounded-sm font-mono space-y-4">
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <span className="font-bold text-white text-xs uppercase">Client Governance Portal &bull; Active Milestone Schedule</span>
          <Link href="/portal/snag" className="text-xs text-cyan-400 hover:underline flex items-center gap-1">
            <span>Report Room Snag</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <p className="text-xs text-zinc-300 font-sans leading-relaxed">
          Welcome to the Client Executive Cockpit for <strong>{projectName}</strong>. Construction progress is tracked via real-time biometric turnstiles, batching plant batch records, and certified e-Measurement Books.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase block">Structural Raft &amp; Basements</span>
            <strong className="text-emerald-400">100% Handed Over</strong>
          </div>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase block">Superstructure Tower Core</span>
            <strong className="text-cyan-400">Level 14 of 32 (In Progress)</strong>
          </div>
          <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-1">
            <span className="text-zinc-500 text-[10px] uppercase block">Facade &amp; Glazing Works</span>
            <strong className="text-amber-400">Material Procurement Underway</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ClientPortalPage() {
  const { project } = useActiveRole();
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>CLIENT GOVERNANCE • EXECUTIVE OVERSIGHT &amp; ESCROW DRAWDOWN</span>
              <StatutoryInfo
                standardRef="RERA SECTION 4(2)(l)(D)"
                title="Client Executive Project Dashboard"
                idealRange="Escrow 70% Ring-fenced"
                description="Provides project promoters and appointing parties with real-time auditability over construction milestones, statutory clearances, and quality compliance."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Building2 className="w-6 h-6 text-cyan-400" />
              <span>Client Executive Dashboard &amp; Milestone Vault</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Real-time project milestones, financial disbursements, and defect reporting.
            </p>
          </div>
        </header>

        {/* SAFE RENDER WITH SUSPENSE BOUNDARY */}
        <Suspense fallback={<div className="p-12 text-center text-xs text-zinc-500">Loading client executive telemetry...</div>}>
          <FallbackClientDashboard />
        </Suspense>

      </div>
    </main>
  );
}
