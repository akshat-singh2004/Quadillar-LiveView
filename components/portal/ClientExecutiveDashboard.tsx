"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  fetchDashboardSnapshot,
  subscribeToProjectRealtime,
  updateChangeOrderStatus,
} from "@/app/lib/services";
import { getClientExecutiveView } from "@/lib/auth/portalGate";
import { exportProjectSummaryCsv, exportProjectSummaryPdf } from "@/lib/export/summaryExporter";
import { TelemetryErrorBoundary } from "@/components/analytics/TelemetryErrorBoundary";
import type { DashboardSnapshot } from "@/types/construction";
import { ScheduleMetrics } from "@/components/dashboard/ScheduleMetrics";
import { VariationTourWidget } from "@/components/dashboard/VariationTourWidget";
import { ESGScorecardWidget } from "@/components/dashboard/ESGScorecardWidget";
import { HandoverSafetyKpiWidget } from "@/components/dashboard/HandoverSafetyKpiWidget";
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  IndianRupee,
} from "lucide-react";

function formatInrShort(value: number) {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2)} Lakh`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function ClientExecutiveDashboard() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

  const dashboard = useMemo(() => (snapshot ? getClientExecutiveView(snapshot) : null), [snapshot]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      const data = await fetchDashboardSnapshot("GOMTI-NAGAR-PH1-FITOUT");
      if (mounted) setSnapshot(data);
    }
    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return subscribeToProjectRealtime("GOMTI-NAGAR-PH1-FITOUT", {
      onCdeChange: (payload: any) =>
        setSnapshot((curr) =>
          curr
            ? { ...curr, cdeItems: curr.cdeItems.map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i)) }
            : curr
        ),
      onRfiChange: () => undefined,
      onChangeOrderChange: (payload: any) =>
        setSnapshot((curr) =>
          curr
            ? {
                ...curr,
                changeOrders: curr.changeOrders.map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i)),
              }
            : curr
        ),
    });
  }, []);

  const summary = dashboard;

  if (!summary) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center font-mono text-xs text-zinc-500">
        Loading Client Executive Telemetry...
      </div>
    );
  }

  return (
    <TelemetryErrorBoundary
      fallback={
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-mono text-xs">
          <div className="max-w-2xl mx-auto border border-zinc-800 bg-zinc-900 p-6 rounded-2xl">
            The executive dashboard is unavailable right now. Please refresh or verify connectivity.
          </div>
        </main>
      }
    >
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono text-xs select-none">
        <div className="max-w-[1400px] mx-auto space-y-6">
          {/* HEADER */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-800 pb-5">
            <div>
              <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                <span>Client &amp; Asset Owner Executive Clarity Portal</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
                Gomti Nagar Extension Hub Phase-1
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  exportProjectSummaryCsv({
                    projectName: "Quadillar Client Status Dossier",
                    drawingRevisions: snapshot?.cdeItems ?? [],
                    rfiLogs: snapshot?.rfis ?? [],
                    changeOrders: snapshot?.changeOrders ?? [],
                    fileName: "client-status-dossier",
                  })
                }
                className="px-3.5 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 font-bold uppercase rounded text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  exportProjectSummaryPdf({
                    projectName: "Quadillar Client Status Dossier",
                    drawingRevisions: snapshot?.cdeItems ?? [],
                    rfiLogs: snapshot?.rfis ?? [],
                    changeOrders: snapshot?.changeOrders ?? [],
                    fileName: "client-status-dossier",
                  })
                }
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded text-xs transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF Dossier</span>
              </button>
            </div>
          </header>

          {/* FINANCIAL SUMMARY TILES */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: "Total Contract Sum", value: formatInrShort(summary.totalContractSum), color: "text-white" },
              { label: "Certified Billed Amount", value: formatInrShort(summary.certifiedBilledAmount), color: "text-emerald-400" },
              { label: "Withheld Retainage Escrow", value: formatInrShort(summary.withheldRetainage), color: "text-amber-400" },
              { label: "Net Variation Impact", value: formatInrShort(summary.netVariation), color: "text-cyan-400" },
            ].map((metric) => (
              <div key={metric.label} className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4 space-y-1.5">
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-bold">
                  {metric.label}
                </span>
                <div className={`text-xl font-bold tracking-tight tabular-nums ${metric.color}`}>
                  {metric.value}
                </div>
              </div>
            ))}
          </section>

          {/* DPR STATUS CALLOUT */}
          <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Today&apos;s DPR Status</span>
              <strong className="text-amber-400 text-sm mt-0.5 block">Pending Consultant Sign-off</strong>
            </div>
            <a href="/site/dpr" className="text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1">
              <span>Inspect latest progress report</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* ROADMAP & APPROVALS */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Milestones */}
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white uppercase">Project Health &amp; Milestone Roadmap</h2>
              <div className="space-y-3">
                {summary.milestones.map((m) => (
                  <div key={m.milestone_id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">{m.title}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-950 border border-cyan-800 text-cyan-300">
                        {m.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
                      <div
                        style={{
                          width: m.status === "Certified_Completed" ? "100%" : m.status === "Under_Verification" ? "70%" : "45%",
                        }}
                        className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full"
                      />
                    </div>
                    <div className="text-[10px] text-zinc-500">Target completion: {m.target_completion_date}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Owner Approvals */}
            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white uppercase">Pending Owner Approvals</h2>
              <div className="space-y-3">
                {summary.pendingApprovals.length ? (
                  summary.pendingApprovals.map((order) => (
                    <div key={order.id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                      <div className="font-bold text-white">{order.title}</div>
                      <div className="text-[11px] text-zinc-400">
                        {formatInrShort(order.amount)} • {order.timeImpactDays} Days Time Impact
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => void updateChangeOrderStatus(order.id, "Approved", { role: "client" })}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold uppercase text-[10px]"
                        >
                          Authorize Variation
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-zinc-500 p-4 text-center">Zero pending variation orders.</div>
                )}
              </div>
            </div>
          </div>

          <ScheduleMetrics tasks={snapshot?.projectTasks ?? []} />
          <VariationTourWidget />
          <ESGScorecardWidget />
          <HandoverSafetyKpiWidget />
        </div>
      </main>
    </TelemetryErrorBoundary>
  );
}

export default ClientExecutiveDashboard;
