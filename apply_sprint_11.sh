#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Applying Sprint 11 fixes: Reality Capture, Site Weather Hindrance, and Material Inventory...\033[0m"

# -----------------------------------------------------------------------------
# 1. FIX: app/site/reality-capture/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_RC' > app/site/reality-capture/page.tsx
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
  Eye,
  Sliders,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface RealityCaptureRecord {
  id: string;
  project_id: string;
  capture_code: string;
  capture_date: string;
  zone_area: string;
  panoramic_url?: string;
  as_built_variance_detected: string;
  resolution_mp: number;
  status: "PROCESSED_ALIGNED" | "INGESTING" | "VARIANCE_FLAGGED";
  operator_name: string;
}

const FALLBACK_CAPTURES: RealityCaptureRecord[] = [
  {
    id: "rc-fb-1",
    project_id: "PRJ-01-LIVE",
    capture_code: "RC-2026-W38-01",
    capture_date: new Date().toISOString().slice(0, 10),
    zone_area: "Tower A - Level 14 Core Slab",
    as_built_variance_detected: "Zero spatial clash detected with GFC Rev-03 model.",
    resolution_mp: 72.0,
    status: "PROCESSED_ALIGNED",
    operator_name: "Site BIM Telemetry Team",
  },
  {
    id: "rc-fb-2",
    project_id: "PRJ-01-LIVE",
    capture_code: "RC-2026-W38-02",
    capture_date: new Date().toISOString().slice(0, 10),
    zone_area: "Basement 2 - Main Pump Room",
    as_built_variance_detected: "32mm pipe drop sleeve shift of 12mm noted.",
    resolution_mp: 72.0,
    status: "VARIANCE_FLAGGED",
    operator_name: "Site BIM Telemetry Team",
  },
];

export default function RealityCapturePage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [captures, setCaptures] = useState<RealityCaptureRecord[]>([]);
  const [selectedCapture, setSelectedCapture] = useState<RealityCaptureRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);

  const loadCaptures = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("site_reality_captures")
        .select("*")
        .eq("project_id", projectId)
        .order("capture_date", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setCaptures(FALLBACK_CAPTURES);
        setSelectedCapture(FALLBACK_CAPTURES[0]);
      } else {
        setIsFallbackMode(false);
        setCaptures(data);
        setSelectedCapture(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setCaptures(FALLBACK_CAPTURES);
      setSelectedCapture(FALLBACK_CAPTURES[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadCaptures();
  }, [loadCaptures]);

  const active = selectedCapture || FALLBACK_CAPTURES[0];

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>REALITY CAPTURE &bull; ISO 19650-2 / ASTM E57 AS-BUILT VERIFICATION</span>
              <StatutoryInfo
                standardRef="ISO 19650-2 / ASTM E57"
                title="360° Panoramic Reality Capture & BIM Progress Scrubber"
                idealRange="Tolerance: &plusmn; 5mm vs GFC Model"
                description="Scans field execution using 360° LiDAR and high-resolution spherical photogrammetry. Compares actual physical progress against 3D BIM design geometry."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Camera className="w-6 h-6 text-cyan-400" />
              <span>360&deg; Site Reality Capture &amp; As-Built Comparator</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Weekly panoramic scrubs, point-cloud alignment, and geometric variance audits.
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
              onClick={() => void loadCaptures()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <Link
              href="/engineering/4d-simulator"
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <span>4D BIM Simulator</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Scan Resolution</span>
            <div className="text-2xl font-bold text-white mt-1">{active.resolution_mp} MP HDR</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Calibrated dual-sensor camera</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Geometric Variance Status</span>
            <div className={`text-2xl font-bold mt-1 ${active.status === "VARIANCE_FLAGGED" ? "text-amber-400" : "text-emerald-400"}`}>
              {active.status.replace(/_/g, " ")}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Compared to Revit 2026 GFC model</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Coverage Zones Scanned</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{captures.length} Capture Zones</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">100% of critical casting elements</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Capture Timestamp</span>
            <div className="text-2xl font-bold text-zinc-200 mt-1">{active.capture_date}</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Operated by {active.operator_name}</span>
          </div>
        </div>

        {/* COMPARATOR WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* SCRUBBER SURFACE (8 cols) */}
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <span className="font-bold text-white block">{active.capture_code} &mdash; {active.zone_area}</span>
                <span className="text-[10px] text-zinc-400">Interactive Split-Pane: Planned BIM Model vs. As-Built Scan</span>
              </div>
              <span className="text-cyan-400 text-xs font-mono font-bold">Split: {sliderPosition}%</span>
            </div>

            {/* INTERACTIVE COMPARATOR VIEWER */}
            <div className="relative w-full h-[380px] bg-zinc-950 border border-zinc-800 rounded overflow-hidden select-none">
              {/* Left Side: As-Built Reality Scan */}
              <div
                className="absolute inset-0 bg-gradient-to-tr from-cyan-950/30 to-zinc-900 flex items-center justify-start p-6"
                style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
              >
                <div className="space-y-1">
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-bold uppercase">
                    Field As-Built Reality Scan
                  </span>
                  <p className="text-xs text-zinc-300 font-sans mt-2">
                    Visual photogrammetric capture of poured concrete and stripped shuttering.
                  </p>
                </div>
              </div>

              {/* Right Side: GFC Planned BIM Model */}
              <div
                className="absolute inset-0 bg-gradient-to-bl from-emerald-950/20 to-zinc-950 flex items-center justify-end p-6"
                style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
              >
                <div className="text-right space-y-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold uppercase">
                    GFC Architectural BIM Design
                  </span>
                  <p className="text-xs text-zinc-300 font-sans mt-2">
                    LOD 400 coordinated Navisworks geometric baseline.
                  </p>
                </div>
              </div>

              {/* Split Line Divider */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-white shadow-2xl z-20 pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -left-3 w-6 h-6 rounded-full bg-white text-zinc-950 flex items-center justify-center font-bold text-[10px] shadow-lg">
                  &harr;
                </div>
              </div>
            </div>

            {/* Slider Range Control */}
            <div className="space-y-1 pt-2">
              <div className="flex justify-between text-[10px] text-zinc-400">
                <span>&larr; As-Built Reality Scan</span>
                <span>GFC BIM Geometric Baseline &rarr;</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => setSliderPosition(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>

          {/* RIGHT: ZONE ROSTER & VARIANCE LOG (4 cols) */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm shadow-2xl">
            <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
              Reality Capture Zones ({captures.length})
            </span>

            <div className="space-y-3">
              {captures.map((c) => {
                const isSelected = active.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCapture(c)}
                    className={`p-4 rounded border transition cursor-pointer space-y-2 ${
                      isSelected ? "border-cyan-500/60 bg-cyan-950/20" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-xs">{c.capture_code}</span>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase border ${
                        c.status === "VARIANCE_FLAGGED"
                          ? "bg-amber-950 text-amber-400 border-amber-800"
                          : "bg-emerald-950 text-emerald-400 border-emerald-800"
                      }`}>
                        {c.status.replace(/_/g, " ")}
                      </span>
                    </div>

                    <div className="text-zinc-200 font-bold text-xs">{c.zone_area}</div>
                    <div className="p-2.5 bg-zinc-900/60 rounded text-[11px] text-zinc-400 font-sans leading-relaxed">
                      {c.as_built_variance_detected}
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
PAGE_RC

# -----------------------------------------------------------------------------
# 2. FIX: app/site/weather/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_WEATHER' > app/site/weather/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  CloudRain,
  Sun,
  Wind,
  Thermometer,
  ShieldAlert,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Database,
  Printer,
  Calendar,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface WeatherRecord {
  id: string;
  project_id: string;
  log_date: string;
  ambient_temp_c: number;
  relative_humidity_pct: number;
  wind_speed_kmh: number;
  wind_gust_kmh: number;
  rainfall_mm: number;
  heat_index_c: number;
  work_halt_issued: boolean;
  contractual_hindrance_hours: number;
  remarks?: string | null;
}

const FALLBACK_WEATHER: WeatherRecord[] = [
  {
    id: "wx-fb-1",
    project_id: "PRJ-01-LIVE",
    log_date: new Date().toISOString().slice(0, 10),
    ambient_temp_c: 33.2,
    relative_humidity_pct: 62.0,
    wind_speed_kmh: 18.5,
    wind_gust_kmh: 27.0,
    rainfall_mm: 0.0,
    heat_index_c: 37.4,
    work_halt_issued: false,
    contractual_hindrance_hours: 0.0,
    remarks: "Dry shift. Full concrete placement and crane operations clear.",
  },
  {
    id: "wx-fb-2",
    project_id: "PRJ-01-LIVE",
    log_date: "2026-09-28",
    ambient_temp_c: 28.4,
    relative_humidity_pct: 88.0,
    wind_speed_kmh: 24.0,
    wind_gust_kmh: 42.5,
    rainfall_mm: 34.5,
    heat_index_c: 31.0,
    work_halt_issued: true,
    contractual_hindrance_hours: 4.5,
    remarks: "Exceptional monsoon downpour (>25mm). Crane lifts and basement excavation halted under FIDIC 8.4.",
  },
];

export default function SiteWeatherPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [weatherLogs, setWeatherLogs] = useState<WeatherRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);

  const loadWeather = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("site_weather_telemetry")
        .select("*")
        .eq("project_id", projectId)
        .order("log_date", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setWeatherLogs(FALLBACK_WEATHER);
      } else {
        setIsFallbackMode(false);
        setWeatherLogs(data);
      }
    } catch {
      setIsFallbackMode(true);
      setWeatherLogs(FALLBACK_WEATHER);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadWeather();
  }, [loadWeather]);

  const current = weatherLogs[0] || FALLBACK_WEATHER[0];
  const totalHaltHours = useMemo(() => {
    return weatherLogs.reduce((sum, w) => sum + Number(w.contractual_hindrance_hours || 0), 0);
  }, [weatherLogs]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>METEOROLOGICAL TELEMETRY &bull; FIDIC CL. 8.4 / CPWD CL. 5.2 ADVERSE WEATHER</span>
              <StatutoryInfo
                standardRef="FIDIC CL. 8.4 / CPWD GCC CL. 5.2"
                title="Microclimate & Contractual Weather Hindrance Ledger"
                idealRange="Rainfall < 25mm/day &bull; Wind < 38 km/h"
                description="Records meteorological sensor data to substantiate statutory Extension of Time (EOT) claims. Automatically logs weather-induced work stoppages and dewatering halts."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <CloudRain className="w-6 h-6 text-cyan-400" />
              <span>Site Microclimate &amp; Weather Delay Logging</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Real-time anemometer feeds, rain gauge precipitation, and contractual hindrance audits.
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
              onClick={() => void loadWeather()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <Link
              href="/contracts/claims"
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <span>EOT Claims Desk</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Ambient Temperature &amp; Heat Index</span>
            <div className="text-2xl font-bold text-white mt-1">{current.ambient_temp_c}&deg;C / {current.heat_index_c}&deg;C</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Humidity: {current.relative_humidity_pct}% RH</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Masthead Wind Velocity</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{current.wind_speed_kmh} km/h</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Gust: {current.wind_gust_kmh} km/h (Limit: 38 km/h)</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Rain Gauge Precipitation</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{current.rainfall_mm} mm</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Adverse threshold: &ge; 25.0 mm</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Contractual Hindrance Stoppage</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{totalHaltHours} Hours</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Cumulative logged for EOT claim</span>
          </div>
        </div>

        {/* WEATHER HINDRANCE TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase text-xs">Meteorological Telemetry &amp; Stoppage Registry ({weatherLogs.length})</span>
            <span className="text-zinc-500 text-[10px]">Benchmarked against IMD Station Data</span>
          </div>

          <div className="overflow-x-auto border border-zinc-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                <tr>
                  <th className="p-3">Log Date</th>
                  <th className="p-3">Temp / Heat Index</th>
                  <th className="p-3">Wind / Max Gust</th>
                  <th className="p-3 text-right">Rainfall (mm)</th>
                  <th className="p-3 text-right">Work Stoppage</th>
                  <th className="p-3">Operational Findings &amp; Directive</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {weatherLogs.map((w) => (
                  <tr key={w.id} className="hover:bg-zinc-900/50 transition">
                    <td className="p-3 font-bold text-white font-mono">{w.log_date}</td>
                    <td className="p-3 text-zinc-300 font-mono">{w.ambient_temp_c}&deg;C / {w.heat_index_c}&deg;C</td>
                    <td className="p-3 text-cyan-300 font-mono">{w.wind_speed_kmh} / {w.wind_gust_kmh} km/h</td>
                    <td className="p-3 text-right font-bold font-mono text-zinc-200">{w.rainfall_mm} mm</td>
                    <td className="p-3 text-right font-bold font-mono text-amber-400">
                      {w.contractual_hindrance_hours > 0 ? `+${w.contractual_hindrance_hours} hrs` : "0.0 hrs"}
                    </td>
                    <td className="p-3 text-zinc-300 font-sans text-xs">{w.remarks}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        w.work_halt_issued
                          ? "bg-rose-950 text-rose-400 border-rose-800"
                          : "bg-emerald-950 text-emerald-400 border-emerald-800"
                      }`}>
                        {w.work_halt_issued ? "WORK HALT ISSUED" : "NORMAL CLEARANCE"}
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
PAGE_WEATHER

# -----------------------------------------------------------------------------
# 3. FIX: app/site/inventory/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_INVENTORY' > app/site/inventory/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Boxes,
  Truck,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface InventoryItem {
  id: string;
  project_id: string;
  item_code: string;
  material_name: string;
  category: string;
  unit: string;
  current_stock_qty: number;
  minimum_reorder_qty: number;
  storage_location: string;
  unit_rate_inr: number;
  last_inward_date: string;
  stock_health: "ADEQUATE" | "LOW_STOCK" | "CRITICAL_REORDER";
}

const FALLBACK_INVENTORY: InventoryItem[] = [
  {
    id: "inv-fb-1",
    project_id: "PRJ-01-LIVE",
    item_code: "MAT-STL-550",
    material_name: "TMT Steel Rebar Fe 550D (16mm to 32mm)",
    category: "STEEL_REBAR",
    unit: "MT",
    current_stock_qty: 142.50,
    minimum_reorder_qty: 40.00,
    storage_location: "Central Steel Yard Zone A",
    unit_rate_inr: 62500,
    last_inward_date: "2026-09-29",
    stock_health: "ADEQUATE",
  },
  {
    id: "inv-fb-2",
    project_id: "PRJ-01-LIVE",
    item_code: "MAT-CEM-OPC",
    material_name: "UltraTech OPC 53 Grade Cement Bags",
    category: "CEMENT_OPC",
    unit: "Bags",
    current_stock_qty: 2850,
    minimum_reorder_qty: 1000,
    storage_location: "Covered Cement Shed B",
    unit_rate_inr: 385,
    last_inward_date: "2026-09-28",
    stock_health: "ADEQUATE",
  },
  {
    id: "inv-fb-3",
    project_id: "PRJ-01-LIVE",
    item_code: "MAT-AGG-20",
    material_name: "Coarse Crushed Stone Aggregate (20mm)",
    category: "AGGREGATES",
    unit: "MT",
    current_stock_qty: 48.00,
    minimum_reorder_qty: 80.00,
    storage_location: "Batching Bunker 1",
    unit_rate_inr: 1150,
    last_inward_date: "2026-09-25",
    stock_health: "LOW_STOCK",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function SiteInventoryPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [search, setSearch] = useState("");

  const loadInventory = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("site_material_inventory")
        .select("*")
        .eq("project_id", projectId)
        .order("material_name", { ascending: true });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setItems(FALLBACK_INVENTORY);
      } else {
        setIsFallbackMode(false);
        setItems(data);
      }
    } catch {
      setIsFallbackMode(true);
      setItems(FALLBACK_INVENTORY);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const summary = useMemo(() => {
    const totalValuation = items.reduce((sum, i) => sum + Number(i.current_stock_qty * i.unit_rate_inr), 0);
    const lowStockCount = items.filter((i) => i.stock_health !== "ADEQUATE").length;
    return { count: items.length, totalValuation, lowStockCount };
  }, [items]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.toLowerCase();
    return items.filter(
      (i) =>
        i.item_code.toLowerCase().includes(term) ||
        i.material_name.toLowerCase().includes(term) ||
        i.category.toLowerCase().includes(term) ||
        i.storage_location.toLowerCase().includes(term)
    );
  }, [items, search]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>MATERIAL CONTROL &bull; CPWD STORES MANUAL SECTION 15 / IS 4082 STACKING</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 15 / IS 4082"
                title="Site Store Inventory & Bulk Material Stock"
                idealRange="Stock Health: Adequate (> Reorder Level)"
                description="Controls bulk raw materials on site: TMT steel bars, cement bags, and aggregates. Reconciles physical yard stock with digital weighbridge deliveries and pour card consumption."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Boxes className="w-6 h-6 text-cyan-400" />
              <span>Site Store Inventory &amp; Bulk Material Stock</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Real-time yard balances, minimum reorder alerts, and store valuation.
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
              onClick={() => void loadInventory()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <Link
              href="/operations/gate-register"
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <span>Gate Inward Register</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* 3 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Stock Valuation</span>
            <div className="text-2xl font-bold text-white mt-1">{formatInr(summary.totalValuation)}</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Live yard inventory balance</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Bulk Commodities</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{summary.count} Material Lines</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Steel, Cement, Aggregates &amp; Blocks</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Reorder Alerts</span>
            <div className={`text-2xl font-bold mt-1 ${summary.lowStockCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {summary.lowStockCount} Reorder Notice(s)
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Below safety stock threshold</span>
          </div>
        </div>

        {/* INVENTORY TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase text-xs">Site Inventory Roster ({filteredItems.length})</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search material, code, location..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 pl-8 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-zinc-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                <tr>
                  <th className="p-3">Item Code &amp; Description</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Storage Location</th>
                  <th className="p-3 text-right">Current Stock</th>
                  <th className="p-3 text-right">Minimum Reorder</th>
                  <th className="p-3 text-right">Valuation (₹)</th>
                  <th className="p-3 text-center">Stock Health</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {filteredItems.map((i) => (
                  <tr key={i.id} className="hover:bg-zinc-900/50 transition">
                    <td className="p-3">
                      <span className="font-bold text-white block">{i.material_name}</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{i.item_code}</span>
                    </td>
                    <td className="p-3 text-zinc-400 font-mono text-[11px]">{i.category.replace(/_/g, " ")}</td>
                    <td className="p-3 text-zinc-300">{i.storage_location}</td>
                    <td className="p-3 text-right font-mono font-bold text-white">
                      {i.current_stock_qty} {i.unit}
                    </td>
                    <td className="p-3 text-right font-mono text-zinc-500">
                      {i.minimum_reorder_qty} {i.unit}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-400 font-bold">
                      {formatInr(Number(i.current_stock_qty * i.unit_rate_inr))}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                        i.stock_health === "ADEQUATE"
                          ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                          : "bg-amber-950 text-amber-400 border-amber-800"
                      }`}>
                        {i.stock_health.replace(/_/g, " ")}
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
PAGE_INVENTORY

echo -e "\033[1;32m[✓] Sprint 11 patched successfully! All 3 files updated.\033[0m"
