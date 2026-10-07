"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Compass,
  Wind,
  ShieldAlert,
  CheckCircle2,
  Clock,
  RefreshCw,
  Database,
  Radio,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface CraneTelemetryRecord {
  id: string;
  project_id: string;
  crane_tag: string;
  model: string;
  location_grid: string;
  slew_angle_deg: number;
  jib_radius_m: number;
  hook_height_m: number;
  hook_load_mt: number;
  safe_load_capacity_mt: number;
  capacity_utilization_pct: number;
  mast_wind_speed_kmh: number;
  interlock_status: "SAFE_OPERATING" | "WARNING_APPROACH" | "WIND_LOCKOUT" | "ANTI_COLLISION_STOP";
  operator_name: string;
}

const FALLBACK_CRANES: CraneTelemetryRecord[] = [
  {
    id: "crane-fb-1",
    project_id: "PRJ-01-LIVE",
    crane_tag: "TC-01 (Stationary Core)",
    model: "Potain MCi 85 A",
    location_grid: "Tower A Core Grid C3",
    slew_angle_deg: 142.5,
    jib_radius_m: 38.0,
    hook_height_m: 72.4,
    hook_load_mt: 3.40,
    safe_load_capacity_mt: 5.50,
    capacity_utilization_pct: 61.8,
    mast_wind_speed_kmh: 18.2,
    interlock_status: "SAFE_OPERATING",
    operator_name: "Rajesh Kumar (Grade A)",
  },
  {
    id: "crane-fb-2",
    project_id: "PRJ-01-LIVE",
    crane_tag: "TC-02 (Perimeter Rail)",
    model: "Liebherr 280 EC-H",
    location_grid: "Podium East Grid G8",
    slew_angle_deg: 285.0,
    jib_radius_m: 42.0,
    hook_height_m: 48.0,
    hook_load_mt: 5.20,
    safe_load_capacity_mt: 6.00,
    capacity_utilization_pct: 86.6,
    mast_wind_speed_kmh: 21.4,
    interlock_status: "WARNING_APPROACH",
    operator_name: "Manoj Sharma (Grade A)",
  },
];

export default function CraneSlewRadarPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [cranes, setCranes] = useState<CraneTelemetryRecord[]>([]);
  const [selectedCrane, setSelectedCrane] = useState<CraneTelemetryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const loadCranes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("site_crane_telemetry")
        .select("*")
        .eq("project_id", projectId)
        .order("crane_tag", { ascending: true });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setCranes(FALLBACK_CRANES);
        setSelectedCrane(FALLBACK_CRANES[0]);
      } else {
        setIsFallbackMode(false);
        setCranes(data);
        setSelectedCrane(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setCranes(FALLBACK_CRANES);
      setSelectedCrane(FALLBACK_CRANES[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadCranes();
  }, [loadCranes]);

  const active = selectedCrane || FALLBACK_CRANES[0];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>HEAVY RIGGING SAFETY • IS 4573 / BS 7121 SLEW &amp; ANTI-COLLISION RADAR</span>
              <StatutoryInfo
                standardRef="IS 4573 / BS 7121 CODE"
                title="Tower Crane Slew & Anti-Collision Telemetry"
                idealRange="Wind < 38 km/h • SLI Utilization < 90%"
                description="Live telemetry gate for tower cranes. Tracks masthead anemometer wind velocity, Safe Load Indicator (SLI) capacity percentage, and dual-jib overlapping collision radii."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-cyan-400" />
              <span>Tower Crane Slew Radar &amp; Rigging Telemetry</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Real-time jib positioning, hook load monitoring, and mast wind cutoff interlocking.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              onClick={() => void loadCranes()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <Link
              href="/operations/plant-machinery"
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded flex items-center gap-1.5 transition"
            >
              <span>P&amp;M Fleet Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Crane Hook Load</span>
            <div className="text-2xl font-bold text-white mt-1">{active.hook_load_mt} MT</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Safe Limit: {active.safe_load_capacity_mt} MT</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">SLI Capacity Utilization</span>
            <div className={`text-2xl font-bold mt-1 ${active.capacity_utilization_pct > 85 ? "text-amber-400" : "text-emerald-400"}`}>
              {active.capacity_utilization_pct}%
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Cutoff at &ge; 90% (IS 4573)</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Masthead Wind Velocity</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{active.mast_wind_speed_kmh} km/h</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Safety Lockout: &gt; 38.0 km/h</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Interlock Gate Status</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{active.interlock_status.replace(/_/g, " ")}</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Anti-collision radar synced</span>
          </div>
        </div>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* RADAR CANVAS (7 cols) */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 p-6 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs">Simulated Slew Radar &bull; Top-Down Overlap Plane</span>
              <span className="text-cyan-400 text-[10px] font-mono">Radial Range: 50m Jib</span>
            </div>

            {/* RADAR DISPLAY */}
            <div className="relative w-full h-[380px] bg-zinc-950 border border-zinc-800 rounded flex items-center justify-center overflow-hidden">
              {/* Polar Grid Rings */}
              <div className="absolute w-[300px] h-[300px] rounded-full border border-cyan-500/10 pointer-events-none" />
              <div className="absolute w-[200px] h-[200px] rounded-full border border-cyan-500/15 pointer-events-none" />
              <div className="absolute w-[100px] h-[100px] rounded-full border border-cyan-500/20 pointer-events-none" />
              <div className="absolute w-full h-[1px] bg-cyan-500/10 pointer-events-none" />
              <div className="absolute h-full w-[1px] bg-cyan-500/10 pointer-events-none" />

              {/* JIB LINE */}
              <div
                className="absolute w-[140px] h-[2px] bg-cyan-400 origin-left transition-all duration-500 shadow-md shadow-cyan-400/50"
                style={{
                  left: "50%",
                  top: "50%",
                  transform: `rotate(${active.slew_angle_deg}deg)`,
                }}
              >
                <div className="absolute right-0 -top-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <div className="absolute right-0 -top-1 w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>

              {/* CENTER MAST */}
              <div className="w-5 h-5 rounded-full bg-cyan-500 text-zinc-950 flex items-center justify-center font-bold text-[9px] z-10 shadow-lg shadow-cyan-500/50">
                TC
              </div>

              <div className="absolute bottom-3 left-4 text-[10px] text-zinc-500 font-mono space-y-0.5">
                <div>Azimuth: <strong className="text-white">{active.slew_angle_deg}&deg;</strong></div>
                <div>Radius: <strong className="text-white">{active.jib_radius_m}m</strong></div>
                <div>Hook Height: <strong className="text-cyan-400">{active.hook_height_m}m</strong></div>
              </div>
            </div>
          </div>

          {/* CRANE ROSTER & SPECIFICATIONS (5 cols) */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm shadow-2xl">
            <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
              Site Crane Fleet ({cranes.length})
            </span>

            <div className="space-y-3">
              {cranes.map((c) => {
                const isSelected = active.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCrane(c)}
                    className={`p-4 rounded border transition cursor-pointer space-y-2 ${
                      isSelected ? "border-cyan-500/60 bg-cyan-950/20" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-xs">{c.crane_tag}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        c.interlock_status === "SAFE_OPERATING"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : "bg-amber-950 text-amber-400 border-amber-800"
                      }`}>
                        {c.interlock_status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="text-zinc-300 font-sans text-xs">{c.model} &bull; {c.location_grid}</div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] text-zinc-500 border-t border-zinc-850 pt-2 font-mono">
                      <div>Load: <strong className="text-white">{c.hook_load_mt} / {c.safe_load_capacity_mt} MT</strong></div>
                      <div>SLI: <strong className="text-cyan-400">{c.capacity_utilization_pct}%</strong></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
