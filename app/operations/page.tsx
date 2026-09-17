"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Flame,
  Layers,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sofa,
  Wrench,
  Zap
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { AIMEventManager, type FacilityAssetRecord } from "@/components/operations/AIMEventManager";

interface WorkOrderItem {
  id: string;
  project_id: string;
  work_order_number: string;
  event_type: string;
  description: string;
  priority: string;
  status: string;
  technician_name: string;
  scheduled_date: string;
  parts_cost_inr: number;
}

function formatInr(val: number) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Number(val).toLocaleString("en-IN")}`;
}

export default function OperationsPage() {
  const { project, role, tier } = useActiveRole();
  const [assets, setAssets] = useState<FacilityAssetRecord[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrderItem[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<FacilityAssetRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAimData = useCallback(async () => {
    try {
      const [{ data: assetData }, { data: woData }] = await Promise.all([
        supabase.from("facility_assets").select("*").eq("project_id", project.id).order("asset_tag", { ascending: true }),
        supabase.from("aim_work_orders").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
      ]);

      if (assetData) setAssets(assetData as FacilityAssetRecord[]);
      if (woData) setWorkOrders(woData as WorkOrderItem[]);
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    void loadAimData();

    const channel = supabase
      .channel(`aim_sync_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "facility_assets" }, () => void loadAimData())
      .on("postgres_changes", { event: "*", schema: "public", table: "aim_work_orders" }, () => void loadAimData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadAimData]);

  const vitals = useMemo(() => {
    const total = assets.length;
    const maintenanceDue = assets.filter((a) => a.status === "Maintenance_Due" || a.status === "Critical_Failure").length;
    const healthIndex = total > 0 ? Math.round(((total - maintenanceDue) / total) * 100) : 100;
    const pendingOrders = workOrders.filter((w) => w.status !== "Completed").length;
    const totalMaintenanceCost = workOrders.reduce((sum, w) => sum + Number(w.parts_cost_inr || 0), 0);

    return { total, maintenanceDue, healthIndex, pendingOrders, totalMaintenanceCost };
  }, [assets, workOrders]);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING ASSET INFORMATION MODEL (AIM)...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>ISO 19650-3 Asset Information Model (AIM)</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Facility Operations & Lifecycle Management
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Post-handover digital twin registry. Real-time run-hour telemetry, O&M manual linking, and preventative maintenance triggers.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadAimData()}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition"
              title="Refresh AIM Register"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs font-semibold">
              Scale: <strong className="text-cyan-400">{tier}</strong>
            </span>
          </div>
        </div>

        {/* 4 PRIMARY AIM GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Facility Health Index</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {vitals.healthIndex}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {vitals.maintenanceDue === 0 ? "All assets operating in spec" : `${vitals.maintenanceDue} systems require maintenance`}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Governed Assets</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {vitals.total} Units
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Commissioned with verified CDE O&M packs
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Work Orders</span>
              <Wrench className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
              {vitals.pendingOrders} Open
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Dispatched to maintenance technicians
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Cumulative O&M Outflow</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {formatInr(vitals.totalMaintenanceCost)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Parts & preventative maintenance expenses
            </div>
          </div>
        </div>

        {/* 2-COLUMN SPLIT: ASSET REGISTRY (LEFT) vs ACTIVE WORK ORDERS (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: ASSET REGISTRY WITH SIMULATOR ACCESS (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  As-Built Asset Register
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">
                  Commissioned Systems ({tier})
                </h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{assets.length} Registered</span>
            </div>

            <div className="space-y-3">
              {assets.map((asset) => {
                const isDue = asset.status === "Maintenance_Due";
                const runPct = asset.maintenance_interval_hours > 0
                  ? Math.min(100, Math.round((asset.run_hours / asset.maintenance_interval_hours) * 100))
                  : 0;

                return (
                  <div
                    key={asset.id}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 hover:border-zinc-700 transition flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {asset.asset_tag}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {asset.category.replace("_", " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          asset.status === "Operational"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50 animate-pulse"
                        }`}>
                          {asset.status.replace("_", " ")}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-zinc-200">
                        {asset.asset_name}
                      </div>
                      <div className="text-[11px] text-zinc-500 font-mono">
                        {asset.location_zone} · {asset.run_hours}h run-time ({runPct}%)
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedAsset(asset)}
                      className="shrink-0 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
                    >
                      Lifecycle Inspector
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: LIVE WORK ORDER DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                    Preventative Maintenance
                  </span>
                  <h2 className="text-sm font-bold text-white mt-0.5">
                    Field Work Orders
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  Automated Triggers
                </span>
              </div>

              <div className="space-y-3">
                {workOrders.length === 0 ? (
                  <div className="p-8 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                    No active maintenance work orders. All assets are operating within schedule tolerances.
                  </div>
                ) : (
                  workOrders.map((wo) => (
                    <div
                      key={wo.id}
                      className="p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/40 space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono font-bold text-white">{wo.work_order_number}</span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          wo.priority === "High"
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                            : "bg-blue-950 text-blue-400 border border-blue-800/50"
                        }`}>
                          {wo.priority}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 font-medium leading-snug">
                        {wo.description}
                      </p>
                      <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pt-1 border-t border-zinc-800/60">
                        <span>Lead: {wo.technician_name}</span>
                        <span className="text-emerald-400">Est. {formatInr(wo.parts_cost_inr)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
              <span>ISO 19650-3 Compliant Record</span>
              <Link href="/cde/viewer/1" className="text-cyan-400 hover:text-cyan-300 font-semibold">
                Open As-Built CDE →
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* AIM LIFECYCLE EVENT INSPECTOR MODAL */}
      <AIMEventManager
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onAssetUpdated={(updated) => {
          setAssets((prev) => prev.map((a) => a.id === updated.id ? updated : a));
          void loadAimData();
        }}
      />
    </main>
  );
}