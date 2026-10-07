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
