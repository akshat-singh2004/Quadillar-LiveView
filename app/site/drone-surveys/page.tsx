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
