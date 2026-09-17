"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  DollarSign,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HardHat,
  Layers,
  Lock,
  Receipt,
  Share2,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Truck,
  Users,
  Wrench
} from "lucide-react";
import { useActiveRole } from "@/context/RoleContext";

export default function DashboardPage() {
  const { project, role, tier } = useActiveRole();
  const [activeBottomTab, setActiveBottomTab] = useState<"CDE" | "EV" | "WORKFORCE" | "BIM">("EV");

  // Dynamic Metrics governed by Active Project Tier
  const telemetry = useMemo(() => {
    if (tier === "RESIDENTIAL") {
      return {
        submittalsCount: "14 Items",
        submittalsSubtext: "2 Pending Review",
        pourCardsCount: "3 Open",
        pourCardsSubtext: "Hold-Points Active",
        approvedVariations: "₹45,000",
        approvedVariationsSubtext: "1 Claim Active",
        handoverDays: "18 Days",
        handoverSubtext: "On Schedule",
        stageGateName: "STAGE 04 ACTIVE",
        strippingStatus: "Locked (7d Cube Pending)",
        strippingAlert: true,
        reraStatus: "Valid through Q3",
        scurveBac: "₹4.00 Lakh",
        scurveEv: "₹2.18 Lakh",
        scurveProgressPct: 54.5,
        workforceHeadcount: "7 Artisans",
        workforceEfficiency: "81.3%",
        stockRebarDays: "3 days",
        stockCementDays: "6 days",
      };
    }
    return {
      submittalsCount: "73 Items",
      submittalsSubtext: "12 Critical Rev B",
      pourCardsCount: "4 Active",
      pourCardsSubtext: "Level 04 Deck Ready",
      approvedVariations: "₹1.49 Cr",
      approvedVariationsSubtext: "Underwriter Certified",
      handoverDays: "86%",
      handoverSubtext: "Quality Index Cleared",
      stageGateName: "STAGE 08 ACTIVE",
      strippingStatus: "IS 456 Release Verified",
      strippingAlert: false,
      reraStatus: "RERA Certificate Valid",
      scurveBac: "₹39.50 Cr",
      scurveEv: "₹31.20 Cr",
      scurveProgressPct: 78.9,
      workforceHeadcount: "148 Men",
      workforceEfficiency: "94.2%",
      stockRebarDays: "14 days",
      stockCementDays: "9 days",
    };
  }, [tier]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP OVERVIEW BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Executive Command Center</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Operational Overview
            </h1>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/operations/dpr"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Flash DPR</span>
            </Link>
            <Link
              href="/drawings/redlines"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-sm"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Open CDE Sheets</span>
            </Link>
          </div>
        </div>

        {/* 4 PRIMARY TELEMETRY TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Link
            href="/submittals"
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition block group"
          >
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="group-hover:text-cyan-400 transition">Joinery & Finish Submittals</span>
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {telemetry.submittalsCount}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{telemetry.submittalsSubtext}</div>
          </Link>

          <Link
            href="/quality/pour-cards"
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition block group"
          >
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="group-hover:text-amber-400 transition">Active Pour Cards</span>
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
              {telemetry.pourCardsCount}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{telemetry.pourCardsSubtext}</div>
          </Link>

          <Link
            href="/contracts/variations"
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition block group"
          >
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="group-hover:text-emerald-400 transition">Approved Variations</span>
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {telemetry.approvedVariations}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{telemetry.approvedVariationsSubtext}</div>
          </Link>

          <Link
            href="/handover/punch-list"
            className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 transition block group"
          >
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span className="group-hover:text-cyan-400 transition">Handover Target</span>
              <Award className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {telemetry.handoverDays}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{telemetry.handoverSubtext}</div>
          </Link>
        </div>

        {/* 2-COLUMN ACTION DESK & GOVERNANCE STAGE-GATE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* ACTION DESK: PENDING SIGNATURE (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Action Desk · Pending Your Signature ({role.label})
                  </span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                  0 Active Holds
                </span>
              </div>

              <div className="py-12 text-center space-y-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-950/40 border border-emerald-800/60 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="text-xs font-semibold text-zinc-200">
                  All assigned design queries and cost clearances are up to date.
                </div>
                <div className="text-[11px] font-mono text-zinc-500">
                  No statutory hold-points require your signature at this milestone.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-zinc-800/80 text-[11px] font-mono text-zinc-500">
              <span>Authority: {role.category}</span>
              <span className="text-cyan-400">Audit Ledger Active</span>
            </div>
          </div>

          {/* GOVERNANCE STAGE-GATE (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Governance Stage-Gate
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50 font-bold uppercase">
                {telemetry.stageGateName}
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
                <span className="text-zinc-400">Pour-Release Hold Points</span>
                <span className="text-emerald-400 font-bold">01 Active Inspection</span>
              </div>

              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
                <span className="text-zinc-400">Formwork Stripping (IS 456)</span>
                <span className={`font-bold ${telemetry.strippingAlert ? "text-rose-400" : "text-emerald-400"}`}>
                  {telemetry.strippingStatus}
                </span>
              </div>

              <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
                <span className="text-zinc-400">Statutory RERA Filing</span>
                <span className="text-emerald-400 font-bold">{telemetry.reraStatus}</span>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono">
              <span className="text-zinc-500">Next risk gate: Virtual Handover</span>
              <Link href="/milestones" className="text-cyan-400 hover:underline flex items-center gap-1">
                <span>View Milestone Ledger</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

        </div>

        {/* BOTTOM MULTI-TAB WORKSPACE */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
            {[
              { key: "EV", label: "Cashflow & Earned Value (S-Curve)" },
              { key: "CDE", label: "CDE Document Register" },
              { key: "WORKFORCE", label: "Site Workforce & Logistics" },
              { key: "BIM", label: "BIM Coordination & ESG" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveBottomTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                  activeBottomTab === tab.key
                    ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: CASHFLOW & EARNED VALUE */}
          {activeBottomTab === "EV" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                    Earned Value Management (EVM) Telemetry
                  </h3>
                  <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                    Budget at Completion (BAC): <strong className="text-white">{telemetry.scurveBac}</strong> · Certified Earned Value: <strong className="text-cyan-400">{telemetry.scurveEv}</strong>
                  </div>
                </div>
                <Link href="/finance/ra-bills" className="text-xs text-cyan-400 font-mono hover:underline flex items-center gap-1">
                  <span>View Full Billing Ledger</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">Cumulative Earned Value Progress</span>
                  <span className="text-emerald-400 font-bold">{telemetry.scurveProgressPct}%</span>
                </div>
                <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${telemetry.scurveProgressPct}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CDE DOCUMENT REGISTER */}
          {activeBottomTab === "CDE" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  ISO 19650 Common Data Environment (CDE)
                </span>
                <Link href="/drawings/redlines" className="text-xs text-cyan-400 font-mono hover:underline">
                  Launch Spatial Viewer →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/30">
                  <span className="text-zinc-400 block mb-1">Architecture IFC</span>
                  <strong className="text-white">LOD 400 · Rev 03</strong>
                </div>
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/30">
                  <span className="text-zinc-400 block mb-1">Structural Rebar</span>
                  <strong className="text-white">BBS Approved · GFC</strong>
                </div>
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/30">
                  <span className="text-zinc-400 block mb-1">MEP Clash Review</span>
                  <strong className="text-emerald-400">Zero Hard Clashes</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: WORKFORCE & LOGISTICS */}
          {activeBottomTab === "WORKFORCE" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Site Workforce Roster & Inventory Runway
                </span>
                <Link href="/site/labor" className="text-xs text-cyan-400 font-mono hover:underline">
                  View Labor Gang Ledger →
                </Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/30">
                  <span className="text-zinc-400 block">Active Artisans</span>
                  <strong className="text-white text-base mt-1 block">{telemetry.workforceHeadcount}</strong>
                </div>
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/30">
                  <span className="text-zinc-400 block">Productivity Index</span>
                  <strong className="text-emerald-400 text-base mt-1 block">{telemetry.workforceEfficiency}</strong>
                </div>
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/30">
                  <span className="text-zinc-400 block">Rebar Runway</span>
                  <strong className="text-amber-400 text-base mt-1 block">{telemetry.stockRebarDays}</strong>
                </div>
                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/30">
                  <span className="text-zinc-400 block">Cement Runway</span>
                  <strong className="text-emerald-400 text-base mt-1 block">{telemetry.stockCementDays}</strong>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: BIM COORDINATION & ESG */}
          {activeBottomTab === "BIM" && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800/60 pb-3">
                <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  BIM Coordination Matrix & Embodied Carbon
                </span>
                <Link href="/sustainability/carbon" className="text-xs text-cyan-400 font-mono hover:underline">
                  Carbon Dashboard →
                </Link>
              </div>
              <div className="text-xs font-mono text-zinc-400 leading-relaxed">
                Heavy BIM coordination and carbon index monitoring are actively bypassed for Tier 1 Residential Fit-Out, preserving high-throughput execution cycles while maintaining full audit logging on superstructure packages.
              </div>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}