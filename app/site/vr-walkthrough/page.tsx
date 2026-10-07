"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Boxes,
  Eye,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Database,
  Layers,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Maximize2,
  Activity,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface VRSessionRecord {
  id: string;
  project_id: string;
  session_code: string;
  model_bim_urn: string;
  active_viewpoint: string;
  headset_device: string;
  latency_ms: number;
  fps_rendered: number;
  spatial_pins_count: number;
  status: string;
}

const FALLBACK_VR: VRSessionRecord = {
  id: "vr-fb-1",
  project_id: "PRJ-01-LIVE",
  session_code: "VR-IMM-009",
  model_bim_urn: "urn:adsk.objects:os.object:model/quadillar_tower_lod400.ifc",
  active_viewpoint: "Tower A - Level 14 Mechanical Core",
  headset_device: "Meta Quest 3 / WebXR Standalone",
  latency_ms: 14,
  fps_rendered: 90,
  spatial_pins_count: 4,
  status: "SESSION_READY",
};

export default function VrWalkthroughPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [session, setSession] = useState<VRSessionRecord>(FALLBACK_VR);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [activeViewpoint, setActiveViewpoint] = useState("Tower A - Level 14 Mechanical Core");

  const loadVRSession = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("site_vr_walkthrough_sessions")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        setIsFallbackMode(true);
        setSession(FALLBACK_VR);
      } else {
        setIsFallbackMode(false);
        setSession(data);
      }
    } catch {
      setIsFallbackMode(true);
      setSession(FALLBACK_VR);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadVRSession();
  }, [loadVRSession]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>BIM &amp; IMMERSIVE COORDINATION &bull; WEBXR 1:1 SCALE SPATIAL TWIN</span>
              <StatutoryInfo
                standardRef="ISO 19650-2 / OPENXR SPEC"
                title="WebXR 1:1 Scale BIM Immersion Walkthrough"
                idealRange="Stereoscopic 90 FPS &bull; Latency < 20ms"
                description="Renders federated architectural, structural, and MEP models at 1:1 human scale in virtual reality headsets. Allows design teams to place spatial clash pins directly in 3D coordinate space."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Boxes className="w-6 h-6 text-cyan-400" />
              <span>WebXR 1:1 Scale BIM Walkthrough Cockpit</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Immersive architectural walkthrough, 6DOF tracking, and multi-user coordination.
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
              onClick={() => void loadVRSession()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <Link
              href="/engineering/4d-simulator"
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <span>4D Simulator</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Headset Rendering Rate</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{session.fps_rendered} FPS</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Comfortable motion profile</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Motion-to-Photon Latency</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{session.latency_ms} ms</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Nominal &lt; 20ms threshold</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Spatial Clash Pins</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{session.spatial_pins_count} Pinned</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Coordinate tagged in 3D</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Target Hardware</span>
            <div className="text-2xl font-bold text-white mt-1 truncate">{session.headset_device}</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">OpenXR 6DOF Tracking</span>
          </div>
        </div>

        {/* WORKBENCH & HUD CANVAS */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* VIEWPORT CANVAS (8 cols) */}
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs">WebXR Stereoscopic Model Viewport</span>
              <span className="text-cyan-400 text-[10px] font-mono font-bold">LOD 400 Federated IFC Surface</span>
            </div>

            {/* SIMULATED WEBXR HUD */}
            <div className="relative w-full h-[400px] bg-zinc-950 border border-zinc-800 rounded flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }}
              />

              <div className="text-center space-y-2 z-10">
                <Boxes className="w-12 h-12 text-cyan-400/40 mx-auto" />
                <span className="text-xs text-zinc-400 font-mono uppercase block">
                  WebXR 1:1 Scale Immersion Engine Active
                </span>
                <span className="text-[10px] text-zinc-600 font-sans">
                  Current Viewpoint: {activeViewpoint}
                </span>
              </div>

              {/* HUD OVERLAY CORNERS */}
              <div className="absolute top-4 left-4 p-2 bg-zinc-900/80 border border-zinc-800 rounded text-[10px] text-zinc-400 font-mono space-y-0.5">
                <div>X: +14.28m | Y: -04.12m | Z: +42.00m</div>
                <div>FOV: 110&deg; | IPD: 64mm</div>
              </div>

              <div className="absolute bottom-4 right-4">
                <button
                  type="button"
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded text-xs flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/30"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Enter Fullscreen VR</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEWPOINTS & ANNOTATIONS (4 cols) */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm shadow-2xl">
            <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
              Walkthrough Teleport Waypoints
            </span>

            <div className="space-y-2.5">
              {[
                "Tower A - Level 14 Mechanical Core",
                "Basement 2 - Main Pump & Chiller Station",
                "Podium Level - Entrance Atrium & Curtain Wall",
                "Roof Level 32 - Elevator Machine Room",
              ].map((point) => {
                const isSelected = activeViewpoint === point;
                return (
                  <div
                    key={point}
                    onClick={() => setActiveViewpoint(point)}
                    className={`p-3.5 rounded border transition cursor-pointer text-xs ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20 text-white font-bold"
                        : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className={`w-3.5 h-3.5 ${isSelected ? "text-cyan-400" : "text-zinc-500"}`} />
                      <span>{point}</span>
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
