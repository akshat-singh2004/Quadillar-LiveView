#!/usr/bin/env bash
set -euo pipefail

cat << 'PAGE_EOF' > app/site/digital-twin/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import * as THREE from "three";
import { supabase } from "@/lib/supabaseClient";

// --- INLINE SVG ICONS ---
const BoxIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 00-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const LayersIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);
const AlertTriangleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const RefreshIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface ArchitecturalBit {
  id: string;
  bitNumber: number;
  name: string;
  tag: string;
  height: string;
  area: string;
  materials: string;
  status: "COMPLETED" | "ACTIVE_EXECUTION" | "SCHEDULED";
  progressPct: number;
  clashesCount: number;
}

const ARCHITECTURAL_BITS: ArchitecturalBit[] = [
  {
    id: "BIT_1",
    bitNumber: 1,
    name: "Stepped Green Wedge & Dual Portals",
    tag: "PODIUM LANDSCAPE & MUSEUM",
    height: "+18.0m RL",
    area: "18,450 m²",
    materials: "Green Turf Ramp, Fair-faced RCC & 48m Terracotta Arches",
    status: "COMPLETED",
    progressPct: 100,
    clashesCount: 0
  },
  {
    id: "BIT_2",
    bitNumber: 2,
    name: "Kalzip Silver Auditorium Dome",
    tag: "2,100T ACOUSTIC SHELL",
    height: "+28.5m RL",
    area: "3,820 m²",
    materials: "Kalzip 65/400 Standing Seam Aluminium & Acoustic Space-Frame",
    status: "ACTIVE_EXECUTION",
    progressPct: 92,
    clashesCount: 0
  },
  {
    id: "BIT_3",
    bitNumber: 3,
    name: "18-Story Tower Core & Diagonal Curtain",
    tag: "HOTEL & CONVENTION TOWER",
    height: "+78.0m RL",
    area: "34,200 m²",
    materials: "Post-Tensioned Waffle Slab, Brise-Soleil Grids & Glass Curtain",
    status: "ACTIVE_EXECUTION",
    progressPct: 88,
    clashesCount: 1
  },
  {
    id: "BIT_4",
    bitNumber: 4,
    name: "East Triangular Prow Facade",
    tag: "MONUMENTAL PROW WEDGE",
    height: "+94.0m RL",
    area: "8,950 m²",
    materials: "Imported Terreal Terracotta Rain-Screen & SS316 Anchors",
    status: "ACTIVE_EXECUTION",
    progressPct: 74,
    clashesCount: 0
  },
  {
    id: "BIT_5",
    bitNumber: 5,
    name: "5 Swooping Terracotta Buttress Ribs",
    tag: "STRUCTURAL ARCH BRACES",
    height: "+65.0m RL",
    area: "5 Arches",
    materials: "Pre-cast Reinforced Concrete encased in Terracotta Baguettes",
    status: "ACTIVE_EXECUTION",
    progressPct: 68,
    clashesCount: 0
  },
  {
    id: "BIT_6",
    bitNumber: 6,
    name: "38m Cantilevered Rooftop Helipad",
    tag: "AVIATION CROWN & POOL",
    height: "+90.5m RL",
    area: "1,134 m²",
    materials: "M40 Grade Self-Compacting Concrete on Radial PT Tendons",
    status: "SCHEDULED",
    progressPct: 45,
    clashesCount: 0
  }
];

export interface BimClashItem {
  id: string;
  disciplineA: string;
  disciplineB: string;
  location: string;
  clearanceMm: number;
  severity: "CRITICAL" | "MINOR";
  coordinates: [number, number, number];
  status: "OPEN" | "RESOLVED";
}

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function JpnicDigitalTwinPage() {
  const [selectedBit, setSelectedBit] = useState<ArchitecturalBit | null>(null);
  const [renderMode, setRenderMode] = useState<"REALISTIC" | "XRAY_WIREFRAME" | "MINERVA_CLASH">("REALISTIC");
  const [explodedViewOffset, setExplodedViewOffset] = useState(0);
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [modelHash, setModelHash] = useState("e6d8a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4");
  const [notarizedTime, setNotarizedTime] = useState<string | null>(null);

  const [clashes] = useState<BimClashItem[]>([
    {
      id: "CLASH-MIN-104",
      disciplineA: "MEP: Primary Chilled Water Supply Riser (600mm dia)",
      disciplineB: "Structural: Level 14 Post-Tensioned Transfer Girder",
      location: "Bit 3 Hotel Core (Grid C4-D4, FL14)",
      clearanceMm: -85,
      severity: "CRITICAL",
      coordinates: [12, 48, -4],
      status: "OPEN"
    }
  ]);

  const handleAuthorizeBimRevision = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `JPNIC_6D_BIM_REVISION_LOD400_IFC_ARCHOHM_DATE_2026-10-27_TIME_${timestamp}_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setModelHash(hash);
      setNotarizedTime(timestamp);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "UP-LDA-JPNIC-CAMPUS",
          primary_governor: "MINERVA",
          synthesis_report: `LOD-400 DIGITAL TWIN NOTARIZED: Archohm 6-Bit Master Model Certified • Zero Critical Structure Clashes • Revision R-4.2 Sealed`,
          merkle_root_hash: hash
        });
      } catch (e) {}
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              LOD-400 IFC MASTER DIGITAL TWIN
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              MINERVA 3D SPATIAL ENGINE ACTIVE
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            JPNIC 6-BIT PARAMETRIC 3D DIGITAL TWIN
          </h1>
          <p className="text-xs text-slate-400">
            Jai Prakash Narayan International Centre • Archohm Architectural Model, Volumetric Meshes & Multi-Discipline Clash Analytics
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition"
          >
            ← COMMAND CENTER
          </a>
          <a
            href="/site/360-tour"
            className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition"
          >
            📸 360° REALITY TOUR
          </a>
          <a
            href="/site/gis"
            className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs rounded-lg transition"
          >
            📡 CRANE RADAR
          </a>
          <a
            href="/site/emb"
            className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition"
          >
            📑 e-MB BILL #42
          </a>
        </div>
      </div>

      {/* 6-Bit Architectural Selector Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5">
        {ARCHITECTURAL_BITS.map(bit => {
          const isSelected = selectedBit?.id === bit.id;
          return (
            <button
              key={bit.id}
              onClick={() => setSelectedBit(isSelected ? null : bit)}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? "bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)]"
                  : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-cyan-400">BIT #{bit.bitNumber}</span>
                <span className="text-slate-500">{bit.height}</span>
              </div>
              <div className="text-xs font-bold text-white truncate">{bit.name}</div>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full ${
                    bit.progressPct === 100 ? "bg-emerald-400" : bit.progressPct > 70 ? "bg-cyan-400" : "bg-amber-400"
                  }`}
                  style={{ width: `${bit.progressPct}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[9px] text-slate-400 mt-0.5">
                <span>{bit.progressPct}% Executed</span>
                {bit.clashesCount > 0 ? (
                  <span className="text-red-400 font-bold">1 Clash</span>
                ) : (
                  <span className="text-emerald-400">0 Clashes</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Grid: 3D Viewport & Analytical HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 3D WebGL Digital Twin Canvas */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          {/* Controls Bar */}
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex flex-wrap justify-between items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <BoxIcon className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white uppercase tracking-wider">
                {selectedBit ? selectedBit.name : "COMPLETE 6-BIT JPNIC MONOLITH"}
              </span>
              <span className="text-slate-500 text-[10px]">• LEFT-CLICK TO ORBIT • RIGHT-CLICK TO PAN • WHEEL TO ZOOM</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setRenderMode("REALISTIC")}
                className={`px-2.5 py-1 text-xs rounded-lg border font-bold transition ${
                  renderMode === "REALISTIC"
                    ? "bg-cyan-950 text-cyan-300 border-cyan-500/50"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
              >
                REALISTIC LOD-400
              </button>

              <button
                onClick={() => setRenderMode("XRAY_WIREFRAME")}
                className={`px-2.5 py-1 text-xs rounded-lg border font-bold transition flex items-center gap-1.5 ${
                  renderMode === "XRAY_WIREFRAME"
                    ? "bg-purple-950 text-purple-300 border-purple-500/50"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
              >
                <LayersIcon className="w-3.5 h-3.5" />
                <span>X-RAY CAD</span>
              </button>

              <button
                onClick={() => setRenderMode("MINERVA_CLASH")}
                className={`px-2.5 py-1 text-xs rounded-lg border font-bold transition flex items-center gap-1.5 ${
                  renderMode === "MINERVA_CLASH"
                    ? "bg-red-950 text-red-300 border-red-500/50"
                    : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                }`}
              >
                <AlertTriangleIcon className="w-3.5 h-3.5 text-red-400" />
                <span>CLASH DETECTION</span>
              </button>
            </div>
          </div>

          {/* 3D WebGL Canvas */}
          <div className="relative bg-slate-950 flex-1 min-h-[520px] overflow-hidden select-none">
            <JpnicHighFidelity3DCanvas
              selectedBit={selectedBit}
              renderMode={renderMode}
              explodedOffset={explodedViewOffset}
              clashes={clashes}
            />

            {/* Exploded View Slider Overlay */}
            <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 px-3 py-2 rounded-xl backdrop-blur-md flex items-center gap-3 z-10 text-[10px]">
              <span className="text-slate-400 font-bold uppercase">EXPLODED MODEL VIEW</span>
              <input
                type="range"
                min="0"
                max="35"
                value={explodedViewOffset}
                onChange={e => setExplodedViewOffset(parseInt(e.target.value, 10))}
                className="w-24 h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-cyan-400 font-bold font-mono">{explodedViewOffset}m</span>
              {explodedViewOffset > 0 && (
                <button
                  onClick={() => setExplodedViewOffset(0)}
                  className="px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px]"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Viewport Floating HUD Badge */}
            <div className="absolute bottom-4 left-4 bg-slate-950/90 border border-slate-800 p-3 rounded-xl backdrop-blur-md text-[10px] flex flex-col gap-1 max-w-sm pointer-events-none z-10">
              <span className="text-cyan-400 font-bold uppercase tracking-wider">
                {selectedBit ? selectedBit.tag : "JPNIC MASTER CAMPUS ENVELOPE"}
              </span>
              <div className="text-slate-300 leading-snug">
                {selectedBit ? selectedBit.materials : "Integrated 6-Bit Archohm Complex • 18.6 Acres in Gomti Nagar"}
              </div>
              <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-800">
                <span>Elevation: <strong className="text-white">{selectedBit ? selectedBit.height : "0m to +94m RL"}</strong></span>
                <span>Area: <strong className="text-white">{selectedBit ? selectedBit.area : "75,270 m²"}</strong></span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Architectural Specifications & MINERVA Clash Analysis */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Active Architectural Bit Deep Dive */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                {selectedBit ? `BIT #${selectedBit.bitNumber} SPECIFICATIONS` : "CAMPUS OVERVIEW"}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-500/30">
                {selectedBit ? selectedBit.status : "ACTIVE EPC"}
              </span>
            </div>

            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Component:</span>
                <span className="text-white font-bold">{selectedBit ? selectedBit.name : "All 6 Architectural Bits"}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Peak Height:</span>
                <span className="text-cyan-400 font-bold">{selectedBit ? selectedBit.height : "+94.0m RL (East Prow)"}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Surface Footprint:</span>
                <span className="text-white">{selectedBit ? selectedBit.area : "66,554 m² Net Envelope"}</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800/80">
                <span className="text-slate-400">Execution Progress:</span>
                <span className="text-emerald-400 font-bold">{selectedBit ? `${selectedBit.progressPct}%` : "78% Avg Across All Bits"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">IFC Data Layer:</span>
                <span className="text-slate-300 font-mono text-[11px]">IFC4_JPNIC_LOD400</span>
              </div>
            </div>
          </div>

          {/* MINERVA Spatial Clash Analysis */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangleIcon className="w-3.5 h-3.5 text-red-400" />
                MINERVA CLASH DETECTION ({clashes.length})
              </span>
              <span className="text-[10px] text-red-400 font-mono">1 HARD COLLISION</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {clashes.map(clash => (
                <div
                  key={clash.id}
                  className="bg-slate-950/80 border border-red-500/40 p-3 rounded-xl flex flex-col gap-1.5 text-xs shadow-[0_0_12px_rgba(239,68,68,0.1)]"
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-red-400">{clash.id}</span>
                    <span className="px-1.5 py-0.2 rounded bg-red-950 text-red-400 border border-red-500/40 font-bold">
                      {clash.severity}
                    </span>
                  </div>

                  <div className="text-slate-200 font-semibold leading-snug">{clash.location}</div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    Interference: <strong className="text-cyan-400">{clash.disciplineA}</strong> vs <strong className="text-amber-400">{clash.disciplineB}</strong>
                  </div>

                  <div className="flex justify-between items-center text-[10px] pt-1.5 border-t border-slate-800/80">
                    <span className="text-red-400 font-bold">Collision Depth: {clash.clearanceMm} mm</span>
                    <span className="text-slate-500 font-mono">XYZ: [{clash.coordinates.join(", ")}]</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 65B LOD-400 Revision Notarization */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>SECTION 65B 6D BIM CUSTODY</span>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed">
                Archohm Consortium Master 6-Bit Digital Model. Cryptographically locked to statutory contract baseline of ₹864.50 Cr.
              </div>
            </div>

            <div>
              {notarizedTime ? (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>BIM MODEL NOTARIZED & SEALED</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    Stamped at {notarizedTime} • MINERVA Core
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleAuthorizeBimRevision}
                  disabled={isNotarizing}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE 6-BIT DIGITAL TWIN REVISION</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 65B Cryptographic Ledger Strip */}
      <div className="bg-black/60 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 font-bold uppercase">LOD-400 MERKLE ROOT LEAF:</span>
          <span className="text-slate-300 select-all font-mono">{modelHash}</span>
        </div>
        <span className="text-slate-500">
          Sign-off: MINERVA-SPATIAL-GOVERNOR & ARCHOHM PMC DIRECTORS
        </span>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: HIGH-FIDELITY ARCHOHM JPNIC 3D CANVAS ---
function JpnicHighFidelity3DCanvas({
  selectedBit,
  renderMode,
  explodedOffset,
  clashes
}: {
  selectedBit: ArchitecturalBit | null;
  renderMode: "REALISTIC" | "XRAY_WIREFRAME" | "MINERVA_CLASH";
  explodedOffset: number;
  clashes: BimClashItem[];
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.0035);

    // Camera framed so the full 94m height and dome fit inside standard FOV
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1200);
    camera.position.set(110, 85, 140);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    // Natural Sun & Fill Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    const sunLight = new THREE.DirectionalLight(0xffedd5, 1.8);
    sunLight.position.set(140, 200, 100);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    scene.add(ambientLight, sunLight);

    const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x0f172a, 0.6);
    scene.add(hemiLight);

    // Ground & Campus Grid
    const groundGeo = new THREE.PlaneGeometry(450, 450);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x090e1a, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(350, 35, 0x1e293b, 0x0f172a);
    gridHelper.position.y = 0.1;
    scene.add(gridHelper);

    // Archohm Material Palette
    const turfGreenMat = new THREE.MeshStandardMaterial({ color: 0x3f7d20, roughness: 0.85 });
    const silverDomeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85, roughness: 0.25 });
    const towerCoreMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7 });
    const glassCyanMat = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.6, roughness: 0.1, transmission: 0.65 });
    const terracottaProwMat = new THREE.MeshStandardMaterial({ color: 0xd94814, roughness: 0.55 });
    const buttressRibMat = new THREE.MeshStandardMaterial({ color: 0xb43403, roughness: 0.5 });
    const helipadDeckMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65 });
    const wireframeMat = new THREE.LineBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.8 });
    const clashRedMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.7 });

    const groups: { [key: string]: THREE.Group } = {
      BIT_1: new THREE.Group(),
      BIT_2: new THREE.Group(),
      BIT_3: new THREE.Group(),
      BIT_4: new THREE.Group(),
      BIT_5: new THREE.Group(),
      BIT_6: new THREE.Group()
    };
    Object.values(groups).forEach(g => scene.add(g));

    const attachWire = (mesh: THREE.Mesh, grp: THREE.Group) => {
      const edges = new THREE.EdgesGeometry(mesh.geometry, 20);
      const wire = new THREE.LineSegments(edges, wireframeMat);
      wire.position.copy(mesh.position);
      wire.rotation.copy(mesh.rotation);
      wire.scale.copy(mesh.scale);
      grp.add(wire);
    };

    // ==========================================
    // 1. BIT 1: STEPPED GREEN WEDGE & DUAL PORTALS
    // ==========================================
    // Sloped turf podium ramp
    const rampShape = new THREE.Shape();
    rampShape.moveTo(-50, 0);
    rampShape.lineTo(20, 0);
    rampShape.lineTo(20, 18);
    rampShape.lineTo(-50, 4);
    rampShape.closePath();
    const rampGeo = new THREE.ExtrudeGeometry(rampShape, { depth: 80, bevelEnabled: false });
    const rampMesh = new THREE.Mesh(rampGeo, turfGreenMat);
    rampMesh.rotation.y = Math.PI / 2;
    rampMesh.position.set(40, 0, 50);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    groups.BIT_1.add(rampMesh);

    // Terracotta Monumental Arch Portals
    const archGeo = new THREE.TorusGeometry(18, 2.2, 16, 32, Math.PI);
    const arch1 = new THREE.Mesh(archGeo, terracottaProwMat);
    arch1.position.set(-10, 18, 55);
    groups.BIT_1.add(arch1);
    attachWire(arch1, groups.BIT_1);

    // ==========================================
    // 2. BIT 2: KALZIP SILVER AUDITORIUM DOME
    // ==========================================
    const domeCyl = new THREE.Mesh(new THREE.CylinderGeometry(28, 28, 12, 36), towerCoreMat);
    domeCyl.position.set(-25, 6, -10);
    domeCyl.castShadow = true;
    groups.BIT_2.add(domeCyl);

    const domeGeo = new THREE.SphereGeometry(28, 36, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    domeGeo.scale(1.2, 0.7, 1.0);
    const domeMesh = new THREE.Mesh(domeGeo, silverDomeMat);
    domeMesh.position.set(-25, 12, -10);
    domeMesh.castShadow = true;
    groups.BIT_2.add(domeMesh);
    attachWire(domeMesh, groups.BIT_2);

    // ==========================================
    // 3. BIT 3: 18-STORY TOWER CORE & DIAGONAL GLASS
    // ==========================================
    const towerGeo = new THREE.BoxGeometry(34, 78, 28);
    const towerMesh = new THREE.Mesh(towerGeo, towerCoreMat);
    towerMesh.position.set(12, 39, -15);
    towerMesh.castShadow = true;
    groups.BIT_3.add(towerMesh);
    attachWire(towerMesh, groups.BIT_3);

    // Facade Window Grid Texture via Geometry
    for (let fl = 1; fl <= 17; fl++) {
      const slabLine = new THREE.Mesh(new THREE.BoxGeometry(34.4, 0.6, 28.4), buttressRibMat);
      slabLine.position.set(12, fl * 4.3 + 2, -15);
      groups.BIT_3.add(slabLine);
    }

    // Signature Diagonal Glass Cutout
    const glassCutout = new THREE.Mesh(new THREE.BoxGeometry(34.8, 42, 14), glassCyanMat);
    glassCutout.position.set(12, 46, -22);
    groups.BIT_3.add(glassCutout);

    // ==========================================
    // 4. BIT 4: EAST TRIANGULAR PROW FACADE (94m)
    // ==========================================
    const prowShape = new THREE.Shape();
    prowShape.moveTo(0, 0);
    prowShape.lineTo(36, 12);
    prowShape.lineTo(0, 94);
    prowShape.closePath();
    const prowGeo = new THREE.ExtrudeGeometry(prowShape, { depth: 16, bevelEnabled: false });
    const prowMesh = new THREE.Mesh(prowGeo, terracottaProwMat);
    prowMesh.position.set(29, 0, -23);
    prowMesh.castShadow = true;
    groups.BIT_4.add(prowMesh);
    attachWire(prowMesh, groups.BIT_4);

    // ==========================================
    // 5. BIT 5: 5 SWOOPING TERRACOTTA BUTTRESS RIBS
    // ==========================================
    for (let r = 0; r < 5; r++) {
      const ribCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(29 + r * 2.5, 0, 15 + r * 7),
        new THREE.Vector3(38 + r * 1.5, 36, 8 + r * 4),
        new THREE.Vector3(29, 68, -8 - r * 2)
      );
      const ribGeo = new THREE.TubeGeometry(ribCurve, 24, 1.4, 8, false);
      const ribMesh = new THREE.Mesh(ribGeo, buttressRibMat);
      ribMesh.castShadow = true;
      groups.BIT_5.add(ribMesh);
      attachWire(ribMesh, groups.BIT_5);
    }

    // ==========================================
    // 6. BIT 6: 38m CANTILEVERED ROOFTOP HELIPAD
    // ==========================================
    // 38m diameter deck (r = 19m) cantilevered on top
    const heliDeck = new THREE.Mesh(new THREE.CylinderGeometry(19, 19, 2.2, 48), helipadDeckMat);
    heliDeck.position.set(12, 80, -15);
    heliDeck.castShadow = true;
    groups.BIT_6.add(heliDeck);
    attachWire(heliDeck, groups.BIT_6);

    // Central painted 'H' markings on deck
    const hBar1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hBar1.position.set(9, 81.2, -15);
    const hBar2 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hBar2.position.set(15, 81.2, -15);
    const hBar3 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.05, 0.8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hBar3.position.set(12, 81.2, -15);
    groups.BIT_6.add(hBar1);
    groups.BIT_6.add(hBar2);
    groups.BIT_6.add(hBar3);

    // Crown Perimeter Safety Railing
    const cageGeo = new THREE.TorusGeometry(20, 0.5, 8, 48);
    const cage = new THREE.Mesh(cageGeo, silverDomeMat);
    cage.rotation.x = Math.PI / 2;
    cage.position.set(12, 82, -15);
    groups.BIT_6.add(cage);

    // ==========================================
    // MINERVA CLASH DETECTION OVERLAYS
    // ==========================================
    const clashGroup = new THREE.Group();
    scene.add(clashGroup);

    clashes.forEach(clash => {
      const box = new THREE.Mesh(new THREE.BoxGeometry(4, 4, 4), clashRedMat);
      box.position.set(clash.coordinates[0], clash.coordinates[1], clash.coordinates[2]);
      clashGroup.add(box);

      const beacon = new THREE.Mesh(new THREE.RingGeometry(3.5, 4.8, 16), new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide }));
      beacon.rotation.x = Math.PI / 2;
      beacon.position.copy(box.position);
      clashGroup.add(beacon);
    });

    // Orbit & Pan Controls
    let isDragging = false;
    let isRightDrag = false;
    let prevX = 0;
    let prevY = 0;
    let theta = 0.85;
    let phi = 1.05;
    let radius = 185;
    let panTarget = new THREE.Vector3(5, 42, 0); // Centers on the whole building

    const canvasEl = renderer.domElement;

    const onPointerDown = (e: PointerEvent) => {
      e.preventDefault();
      canvasEl.setPointerCapture(e.pointerId);
      isDragging = true;
      isRightDrag = e.button === 2;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;

      if (isRightDrag) {
        panTarget.x -= dx * 0.18;
        panTarget.y += dy * 0.18;
      } else {
        theta -= dx * 0.008;
        phi = Math.max(0.15, Math.min(Math.PI / 2 - 0.02, phi - dy * 0.008));
      }

      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      try {
        canvasEl.releasePointerCapture(e.pointerId);
      } catch (_) {}
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      radius = Math.max(50, Math.min(350, radius + e.deltaY * 0.1));
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    canvasEl.addEventListener("pointerdown", onPointerDown);
    canvasEl.addEventListener("pointermove", onPointerMove);
    canvasEl.addEventListener("pointerup", onPointerUp);
    canvasEl.addEventListener("pointercancel", onPointerUp);
    canvasEl.addEventListener("wheel", onWheel, { passive: false });
    canvasEl.addEventListener("contextmenu", onContextMenu);

    let animId: number;
    const animate = () => {
      camera.position.x = panTarget.x + radius * Math.sin(phi) * Math.sin(theta);
      camera.position.y = panTarget.y + radius * Math.cos(phi);
      camera.position.z = panTarget.z + radius * Math.sin(phi) * Math.cos(theta);
      camera.lookAt(panTarget);

      // Manage shaders & transparency
      Object.keys(groups).forEach(k => {
        const grp = groups[k];
        const isFocus = selectedBit === null || selectedBit.id === k;

        grp.children.forEach(obj => {
          if (obj instanceof THREE.Mesh) {
            const mat = obj.material as any;
            if (renderMode === "XRAY_WIREFRAME") {
              mat.wireframe = true;
              mat.transparent = true;
              mat.opacity = 0.35;
            } else if (renderMode === "MINERVA_CLASH") {
              mat.wireframe = false;
              mat.transparent = true;
              mat.opacity = isFocus ? 0.95 : 0.2;
            } else {
              mat.wireframe = false;
              mat.transparent = !isFocus;
              mat.opacity = isFocus ? 1.0 : 0.55;
            }
          }
        });
      });

      // Exploded offsets
      groups.BIT_1.position.z = explodedOffset * 1.0;
      groups.BIT_2.position.x = -explodedOffset * 0.9;
      groups.BIT_4.position.x = explodedOffset * 1.1;
      groups.BIT_6.position.y = explodedOffset * 0.8;

      clashGroup.visible = renderMode === "MINERVA_CLASH";

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    const ro = new ResizeObserver(([entry]) => {
      if (entry && entry.contentRect.width > 0) {
        camera.aspect = entry.contentRect.width / entry.contentRect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(animId);
      canvasEl.removeEventListener("pointerdown", onPointerDown);
      canvasEl.removeEventListener("pointermove", onPointerMove);
      canvasEl.removeEventListener("pointerup", onPointerUp);
      canvasEl.removeEventListener("pointercancel", onPointerUp);
      canvasEl.removeEventListener("wheel", onWheel);
      canvasEl.removeEventListener("contextmenu", onContextMenu);
      ro.disconnect();
      renderer.dispose();
    };
  }, [selectedBit, renderMode, explodedOffset, clashes]);

  return <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" />;
}
PAGE_EOF

# Mirror to companion routes
cp app/site/digital-twin/page.tsx app/digital-twin/page.tsx
cp app/site/digital-twin/page.tsx app/site/bim/page.tsx

echo "============================================================"
echo "✓ High-Fidelity JPNIC 6-Bit Model Deployed Successfully!"
echo "============================================================"
