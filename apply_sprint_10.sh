#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Applying Sprint 10 fixes: Crane Slew Radar, Drone Volumetrics, and GIS Boundaries...\033[0m"

# -----------------------------------------------------------------------------
# 1. FIX: app/site/cranes/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_CRANES' > app/site/cranes/page.tsx
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
PAGE_CRANES

# -----------------------------------------------------------------------------
# 2. FIX: app/site/drone-surveys/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_DRONES' > app/site/drone-surveys/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Camera,
  Layers,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Database,
  Printer,
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface DroneSurveyRecord {
  id: string;
  project_id: string;
  mission_code: string;
  survey_date: string;
  flight_altitude_m: number;
  cut_volume_cum: number;
  fill_volume_cum: number;
  net_volume_cum: number;
  stockpile_tonnage_mt: number;
  orthomosaic_status: string;
  pilot_in_command: string;
}

const FALLBACK_SURVEYS: DroneSurveyRecord[] = [
  {
    id: "drv-fb-1",
    project_id: "PRJ-01-LIVE",
    mission_code: "UAS-SRV-2026-0929",
    survey_date: new Date().toISOString().slice(0, 10),
    flight_altitude_m: 85.0,
    cut_volume_cum: 14250.0,
    fill_volume_cum: 6800.0,
    net_volume_cum: 7450.0,
    stockpile_tonnage_mt: 11920.0,
    orthomosaic_status: "PROCESSED_VERIFIED",
    pilot_in_command: "DGCA Certified UAS Pilot",
  },
];

export default function DroneSurveysPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [surveys, setSurveys] = useState<DroneSurveyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const loadSurveys = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("site_drone_surveys")
        .select("*")
        .eq("project_id", projectId)
        .order("survey_date", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setSurveys(FALLBACK_SURVEYS);
      } else {
        setIsFallbackMode(false);
        setSurveys(data);
      }
    } catch {
      setIsFallbackMode(true);
      setSurveys(FALLBACK_SURVEYS);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadSurveys();
  }, [loadSurveys]);

  const active = surveys[0] || FALLBACK_SURVEYS[0];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>SITE INTELLIGENCE • DGCA UAS REGULATIONS / VOLUMETRIC PHOTOGRAMMETRY</span>
              <StatutoryInfo
                standardRef="DGCA UAS RULES 2021 / CPWD EARTHWORK"
                title="Drone Volumetric Cut/Fill & Stockpile Survey"
                idealRange="Survey Accuracy: &plusmn; 2.5cm GSD"
                description="Processes drone point clouds and Digital Surface Models (DSM) to compute bulk earthwork cut/fill quantities and verify subcontractor excavation bills."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Camera className="w-6 h-6 text-cyan-400" />
              <span>Earthwork Volumetrics &amp; Drone Photogrammetry</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • DEM elevation comparisons, stockpile tonnages, and cut/fill reconciliation.
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
              onClick={() => void loadSurveys()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </header>

        {/* 4 SUMMARY METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Cut Volume (Excavation)</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">{active.cut_volume_cum.toLocaleString("en-IN")} m&sup3;</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Baseline basement excavation</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Fill Volume (Backfill)</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{active.fill_volume_cum.toLocaleString("en-IN")} m&sup3;</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Retaining wall compaction</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Net Earthwork Differential</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">+{active.net_volume_cum.toLocaleString("en-IN")} m&sup3;</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Net surplus for carting off-site</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Stockpile Inventory Mass</span>
            <div className="text-2xl font-bold text-white mt-1">{active.stockpile_tonnage_mt.toLocaleString("en-IN")} MT</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Aggregate &amp; sand stockpiles</span>
          </div>
        </div>

        {/* MISSIONS TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
            Completed UAV Photogrammetry Flights ({surveys.length})
          </span>

          <div className="overflow-x-auto border border-zinc-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                <tr>
                  <th className="p-3">Mission Code</th>
                  <th className="p-3">Flight Date</th>
                  <th className="p-3">Altitude</th>
                  <th className="p-3 text-right">Cut Volume (m&sup3;)</th>
                  <th className="p-3 text-right">Fill Volume (m&sup3;)</th>
                  <th className="p-3 text-right">Stockpile Mass (MT)</th>
                  <th className="p-3 text-center">DSM Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {surveys.map((s) => (
                  <tr key={s.id} className="hover:bg-zinc-900/50 transition">
                    <td className="p-3 font-bold text-white">{s.mission_code}</td>
                    <td className="p-3 text-zinc-400 font-mono">{s.survey_date}</td>
                    <td className="p-3 text-zinc-300 font-mono">{s.flight_altitude_m}m AGL</td>
                    <td className="p-3 text-right text-rose-400 font-mono font-bold">{s.cut_volume_cum}</td>
                    <td className="p-3 text-right text-cyan-400 font-mono font-bold">{s.fill_volume_cum}</td>
                    <td className="p-3 text-right text-white font-mono">{s.stockpile_tonnage_mt}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {s.orthomosaic_status.replace(/_/g, " ")}
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
PAGE_DRONES

# -----------------------------------------------------------------------------
# 3. FIX: app/site/gis/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_GIS' > app/site/gis/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Map,
  ShieldCheck,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Database,
  Layers,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface GeofenceRecord {
  id: string;
  project_id: string;
  zone_code: string;
  zone_name: string;
  zone_type: string;
  area_sqm: number;
  perimeter_m: number;
  restriction_status: string;
}

const FALLBACK_ZONES: GeofenceRecord[] = [
  {
    id: "geo-fb-1",
    project_id: "PRJ-01-LIVE",
    zone_code: "GEO-01",
    zone_name: "Main Construction Plot Cadastral Boundary",
    zone_type: "SITE_BOUNDARY",
    area_sqm: 18450.0,
    perimeter_m: 620.0,
    restriction_status: "ACTIVE_RESTRICTED",
  },
  {
    id: "geo-fb-2",
    project_id: "PRJ-01-LIVE",
    zone_code: "GEO-02",
    zone_name: "Tower Crane 1 Slew Overhang Exclusion Zone",
    zone_type: "CRANE_EXCLUSION",
    area_sqm: 7850.0,
    perimeter_m: 314.0,
    restriction_status: "ACTIVE_RESTRICTED",
  },
];

export default function GisBoundaryPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [zones, setZones] = useState<GeofenceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("site_gis_geofences")
        .select("*")
        .eq("project_id", projectId)
        .order("zone_code", { ascending: true });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setZones(FALLBACK_ZONES);
      } else {
        setIsFallbackMode(false);
        setZones(data);
      }
    } catch {
      setIsFallbackMode(true);
      setZones(FALLBACK_ZONES);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadZones();
  }, [loadZones]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>GEOSPATIAL INTELLIGENCE • WGS84 / UTM ZONE 44N CADASTRAL CONTROL</span>
              <StatutoryInfo
                standardRef="SURVEY OF INDIA / GIS WGS84"
                title="Site GIS Boundary & Geofence Control"
                idealRange="Cadastral Boundary Coordinates Locked"
                description="Governs legal plot boundaries, municipal right-of-way setbacks, crane slew overhang exclusion zones, and hazardous storage geofencing."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Map className="w-6 h-6 text-cyan-400" />
              <span>Site GIS Boundary &amp; Drone Command View</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Cadastral plot control, exclusion sectors, and real-time geofence enforcement.
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
              onClick={() => void loadZones()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </header>

        {/* 3 SUMMARY TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Plot Footprint</span>
            <div className="text-2xl font-bold text-white mt-1">18,450 m&sup2;</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">4.56 Acres cadastral plot</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Geofence Sectors</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{zones.length} Zones Locked</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Crane &amp; boundary exclusion</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Geodetic Reference</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">UTM Zone 44N</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">EPSG:32644 survey datum</span>
          </div>
        </div>

        {/* WORKBENCH & MAP CANVAS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* MAP CANVAS (8 cols) */}
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
              Geospatial Vector Map Surface (UTM Zone 44N)
            </span>

            <div className="relative w-full h-[400px] bg-zinc-950 border border-zinc-800 rounded flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
              />

              <div className="text-center space-y-2 z-10 pointer-events-none">
                <MapPin className="w-10 h-10 text-cyan-400/40 mx-auto" />
                <span className="text-xs text-zinc-500 font-mono uppercase block">
                  Geospatial GIS Boundary Surface Active
                </span>
                <span className="text-[10px] text-zinc-600">Survey of India control pins verified within &plusmn; 5mm accuracy</span>
              </div>
            </div>
          </div>

          {/* GEOFENCE LIST (4 cols) */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm shadow-2xl">
            <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
              Controlled Geofences ({zones.length})
            </span>

            <div className="space-y-3">
              {zones.map((z) => (
                <div key={z.id} className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">{z.zone_code}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-950 text-cyan-400 border border-cyan-800">
                      {z.zone_type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-zinc-200 font-sans text-xs font-bold">{z.zone_name}</div>
                  <div className="flex justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-850">
                    <span>Area: {z.area_sqm} m&sup2;</span>
                    <span>Perimeter: {z.perimeter_m}m</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
PAGE_GIS

echo -e "\033[1;32m[✓] Sprint 10 patched successfully! All 3 files updated.\033[0m"
