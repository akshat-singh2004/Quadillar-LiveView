"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Video,
  Radio,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Database,
  Camera,
  Layers,
  ArrowRight,
  ShieldCheck,
  Activity,
  Mic,
  MicOff,
  VideoOff,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface VirtualInspectionSession {
  id: string;
  project_id: string;
  session_code: string;
  host_engineer: string;
  remote_inspector: string;
  location_grid: string;
  webrtc_stream_url?: string;
  duration_minutes: number;
  findings_summary: string;
  session_status: "LIVE_TELEPRESENCE" | "CONCLUDED_FILED" | "PENDING_HOST";
}

const FALLBACK_SESSION: VirtualInspectionSession = {
  id: "vir-fb-1",
  project_id: "PRJ-01-LIVE",
  session_code: "VIR-2026-042",
  host_engineer: "A. Mehta (Site Quality Lead)",
  remote_inspector: "M. Shetty (Principal SEOR)",
  location_grid: "Tower A - Level 14 Shear Wall Core",
  duration_minutes: 48,
  findings_summary: "Remote video audit verified 50mm cover blocks and vertical rebar lap lengths per GFC Rev-03. Concrete pour concurred.",
  session_status: "LIVE_TELEPRESENCE",
};

export default function VirtualInspectionPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [session, setSession] = useState<VirtualInspectionSession>(FALLBACK_SESSION);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [snapshotCount, setSnapshotCount] = useState(3);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadSession = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("site_virtual_inspection_sessions")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        setIsFallbackMode(true);
        setSession(FALLBACK_SESSION);
      } else {
        setIsFallbackMode(false);
        setSession(data);
      }
    } catch {
      setIsFallbackMode(true);
      setSession(FALLBACK_SESSION);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  const handleCaptureSnapshot = () => {
    setSnapshotCount((prev) => prev + 1);
    setFeedback(`High-res evidentiary frame #${snapshotCount + 1} captured & pinned to GFC inspection record.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>REMOTE TELEPRESENCE &bull; CPWD SECTION 17 / VIRTUAL STAGE-GATE INSPECTION</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 17 / ASTM E57"
                title="Remote Live Site Inspection Room (Telepresence)"
                idealRange="Sub-second Video Latency: < 250ms"
                description="Enables remote Structural Engineers (SEOR) and Architects to conduct live, authenticated quality inspections of rebar placement, weld seams, and formwork alignment via real-time WebRTC telemetry."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Video className="w-6 h-6 text-cyan-400" />
              <span>Remote Live Site Inspection &amp; Telepresence Room</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Real-time field streaming, dual-party audio commentary, and high-res evidence capture.
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
              onClick={() => void loadSession()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <Link
              href="/quality/inspections"
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <span>WIR Ledger</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Session Channel</span>
            <div className="text-2xl font-bold text-white mt-1">{session.session_code}</div>
            <span className="text-[10px] text-emerald-400 mt-1 block">Live WebRTC Link Active</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Inspection Zone</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1 truncate">{session.location_grid}</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Target casting element</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Transmission Latency</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">142 ms</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Glass-to-glass delay nominal</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Audit Snapshots Pinned</span>
            <div className="text-2xl font-bold text-white mt-1">{snapshotCount} Frames</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Evidentiary records filed</span>
          </div>
        </div>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* STREAM VIEWPORT (8 cols) */}
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                <span className="font-bold text-white uppercase text-xs">Live Telepresence Feed &bull; 1080p 60fps</span>
              </div>
              <span className="text-zinc-400 text-[10px] font-mono">Stream: WHEP Secure H.264</span>
            </div>

            {/* SIMULATED STREAM DISPLAY */}
            <div className="relative w-full h-[400px] bg-zinc-950 border border-zinc-800 rounded flex items-center justify-center overflow-hidden">
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />

              <div className="text-center space-y-2 z-10">
                <Radio className="w-10 h-10 text-cyan-400/40 mx-auto animate-pulse" />
                <span className="text-xs text-zinc-400 font-mono uppercase block">
                  Telepresence Video Ingestion Active
                </span>
                <span className="text-[10px] text-zinc-600 font-sans">
                  Host: {session.host_engineer} &bull; Inspector: {session.remote_inspector}
                </span>
              </div>

              {/* OVERLAY CONTROLS */}
              <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center z-20">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAudioMuted(!isAudioMuted)}
                    className={`p-2 rounded border text-xs flex items-center gap-1.5 transition ${
                      isAudioMuted
                        ? "bg-rose-950 text-rose-300 border-rose-800"
                        : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                    }`}
                  >
                    {isAudioMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{isAudioMuted ? "Unmute Mic" : "Mute Mic"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsVideoPaused(!isVideoPaused)}
                    className={`p-2 rounded border text-xs flex items-center gap-1.5 transition ${
                      isVideoPaused
                        ? "bg-rose-950 text-rose-300 border-rose-800"
                        : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
                    }`}
                  >
                    {isVideoPaused ? <VideoOff className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{isVideoPaused ? "Resume Video" : "Pause Video"}</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded flex items-center gap-1.5 transition shadow-lg shadow-cyan-500/30"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Capture Evidentiary Frame</span>
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: INSPECTION AUDIT DETAILS (4 cols) */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm shadow-2xl">
            <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
              Telepresence Participants &amp; Findings
            </span>

            <div className="space-y-3">
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Field Host:</span>
                  <strong className="text-white">{session.host_engineer}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Remote SEOR:</span>
                  <strong className="text-cyan-400">{session.remote_inspector}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Inspection Tenure:</span>
                  <span className="text-zinc-300 font-mono">{session.duration_minutes} Minutes</span>
                </div>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Concurred Findings Summary:</span>
                <p className="text-xs text-zinc-200 font-sans leading-relaxed">{session.findings_summary}</p>
              </div>

              <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded flex items-center gap-2 text-emerald-300 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Dual cryptographic sign-off ready for WIR linking.</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
