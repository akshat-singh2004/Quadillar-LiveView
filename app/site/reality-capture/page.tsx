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
