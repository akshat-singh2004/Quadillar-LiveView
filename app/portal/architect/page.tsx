"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  fetchDashboardSnapshot,
  subscribeToProjectRealtime,
  updateCdeItemState,
} from "@/app/lib/services";
import { getArchitectView } from "@/lib/auth/portalGate";
import { exportProjectSummaryCsv, exportProjectSummaryPdf } from "@/lib/export/summaryExporter";
import { TelemetryErrorBoundary } from "@/components/analytics/TelemetryErrorBoundary";
import type { CdeItem, DashboardSnapshot, WorkInspectionRequest } from "@/types/construction";
import { VerificationTelemetry } from "@/components/governance/VerificationTelemetry";
import { QualityGovernanceTelemetry } from "@/components/quality/QualityGovernanceTelemetry";
import { MeasurementItpWidget } from "@/components/dashboard/MeasurementItpWidget";
import { BackchargeVrWidget } from "@/components/dashboard/BackchargeVrWidget";
import { QualityTelemetryWidget } from "@/components/dashboard/QualityTelemetryWidget";
import {
  Layers,
  FileSpreadsheet,
  Download,
  CheckCircle2,
  AlertTriangle,
  Send,
  CloudSun,
  ShieldCheck,
  Building2,
} from "lucide-react";

export default function ArchitectPortalPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

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
      onRfiChange: (payload: any) =>
        setSnapshot((curr) =>
          curr
            ? { ...curr, rfis: curr.rfis.map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i)) }
            : curr
        ),
      onChangeOrderChange: (payload: any) =>
        setSnapshot((curr) =>
          curr
            ? {
                ...curr,
                changeOrders: curr.changeOrders.map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i)),
              }
            : curr
        ),
      onWirChange: (payload: any) =>
        setSnapshot((curr) =>
          curr
            ? {
                ...curr,
                workInspectionRequests:
                  payload.eventType === "DELETE"
                    ? (curr.workInspectionRequests ?? []).filter((i) => i.id !== payload.old.id)
                    : (curr.workInspectionRequests ?? []).some((i) => i.id === payload.new.id)
                    ? (curr.workInspectionRequests ?? []).map((i) => (i.id === payload.new.id ? { ...i, ...payload.new } : i))
                    : [...(curr.workInspectionRequests ?? []), payload.new as WorkInspectionRequest],
              }
            : curr
        ),
    });
  }, []);

  const view = useMemo(() => (snapshot ? getArchitectView(snapshot) : null), [snapshot]);

  const publishGfc = async (item: CdeItem) => {
    if (!snapshot) return;
    const updated = await updateCdeItemState(
      item.id,
      "Published",
      { status: "Approved", approved: true },
      { role: "architect", name: "Architect Portal" }
    );
    if (updated) {
      setSnapshot((curr) =>
        curr ? { ...curr, cdeItems: curr.cdeItems.map((entry) => (entry.id === updated.id ? updated : entry)) } : curr
      );
    }
  };

  const pendingInspections = (snapshot?.workInspectionRequests ?? []).filter(
    (item) => item.status === "Pending Inspection"
  );

  const clashHealth = useMemo(() => {
    const total = Math.max(1, (snapshot?.bimClashes ?? []).length || 1);
    const resolved = (snapshot?.bimClashes ?? []).filter((item) => item.status === "Resolved").length;
    return { health: Math.round((resolved / total) * 100), open: total - resolved };
  }, [snapshot?.bimClashes]);

  if (!view) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center font-mono text-xs">
        Loading Design Governance Portal...
      </main>
    );
  }

  return (
    <TelemetryErrorBoundary
      fallback={
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-mono text-xs">
          <div className="max-w-2xl mx-auto border border-zinc-800 bg-zinc-900 p-6 rounded-2xl">
            Design governance portal unavailable. Check telemetry connection.
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
                <span>Principal Consultant / Architect Portal</span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white uppercase">
                Design Governance &amp; CDE State Control
              </h1>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  exportProjectSummaryCsv({
                    projectName: "Quadillar Architect Summary",
                    drawingRevisions: snapshot?.cdeItems ?? [],
                    rfiLogs: snapshot?.rfis ?? [],
                    changeOrders: snapshot?.changeOrders ?? [],
                    fileName: "architect-summary",
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
                    projectName: "Quadillar Architect Summary",
                    drawingRevisions: snapshot?.cdeItems ?? [],
                    rfiLogs: snapshot?.rfis ?? [],
                    changeOrders: snapshot?.changeOrders ?? [],
                    fileName: "architect-summary",
                  })
                }
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded text-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download PDF</span>
              </button>
            </div>
          </header>

          {/* VITAL METRICS */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-2">
              <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-widest block">
                BIM Clash Resolution Index
              </span>
              <div className="text-3xl font-bold text-white tabular-nums">{clashHealth.health}%</div>
              <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
                <div style={{ width: `${clashHealth.health}%` }} className="h-full bg-cyan-500 rounded-full" />
              </div>
              <div className="text-[11px] text-zinc-500">{clashHealth.open} clashes under coordination.</div>
            </div>

            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 space-y-2">
              <span className="text-[10px] text-amber-400 uppercase font-bold tracking-widest block">
                Site Operating Weather Envelope
              </span>
              <div className="text-2xl font-bold text-emerald-400">Normal Site Ops Cleared</div>
              <div className="text-[11px] text-zinc-500">Telemetry: Wind 14 km/h • Rain 0.0 mm/hr</div>
            </div>
          </section>

          <VerificationTelemetry />
          <QualityGovernanceTelemetry />
          <MeasurementItpWidget />
          <BackchargeVrWidget />
          <QualityTelemetryWidget />

          {/* CDE PROMOTION & ACTIVE RFIs */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white uppercase">CDE State Promotion Center</h2>
              <div className="space-y-3">
                {view.cdeItems.map((item) => (
                  <div key={item.id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">{item.title}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">{item.container}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-zinc-900 border border-zinc-700 text-zinc-300">
                        {item.state}
                      </span>
                      <button
                        type="button"
                        disabled={item.state === "Published"}
                        onClick={() => void publishGfc(item)}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold uppercase text-[10px] disabled:opacity-50"
                      >
                        Approve to GFC
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-3.5">
              <h2 className="text-sm font-bold text-white uppercase">Active Inquiries (RFIs)</h2>
              <div className="space-y-3">
                {view.activeRfis.map((rfi) => (
                  <div key={rfi.id} className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                    <div className="font-bold text-white">{rfi.title}</div>
                    <div className="text-[11px] text-zinc-400">
                      Pending with: <strong className="text-cyan-400">{rfi.ballInCourt}</strong> ({rfi.currentOwner})
                    </div>
                    <div className="text-[10px] text-zinc-500">SLA: {rfi.slaHoursRemaining ?? 0}h remaining</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </TelemetryErrorBoundary>
  );
}
