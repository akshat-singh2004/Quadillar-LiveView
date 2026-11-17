#!/usr/bin/env bash
set -euo pipefail

cat << 'PAGE_EOF' > app/site/digital-twin/page.tsx
"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { supabase } from "@/lib/supabaseClient";

// --- INLINE SVG ICONS ---
const BoxIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const LayersIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polygon points="12 2 2 7 12 12 22 7 12 2" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 00-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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

// --- COMPONENT METADATA SCHEMA ---
export interface BimSubComponentMeta {
  id: string;
  tag: string;
  name: string;
  category: "FIRE_PIPE" | "HVAC_DUCT" | "WINDOW_SILL" | "WALL_PANEL" | "STRUCTURAL_BEAM" | "LINTEL_BAND";
  discipline: "MEP_PHE" | "MEP_HVAC" | "ARCHITECTURAL" | "STRUCTURAL";
  levelElevation: string;
  lengthM: number;
  widthM?: number;
  depthM?: number;
  surfaceAreaM2: number;
  volumeM3: number;
  unitWeightKgM: number;
  totalWeightKg: number;
  unitRateInr: number;
  totalCostInr: number;
  standardSpec: string;
  vendorOem: string;
  installationStatus: "INSTALLED" | "QA_VERIFIED" | "INSPECTED";
}

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function VanguardCompleteBimTakeoffPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [allRegisteredComponents, setAllRegisteredComponents] = useState<BimSubComponentMeta[]>([]);
  const [multiSelectMode, setMultiSelectMode] = useState<boolean>(true);
  const [shellOpacity, setShellOpacity] = useState<number>(0.35); // Exterior model ghosting opacity
  const [viewFilter, setViewFilter] = useState<"ALL" | "MEP" | "WALLS_FACADE" | "STRUCTURE">("ALL");
  const [modelStatus, setModelStatus] = useState<"LOADING" | "LOADED_GLB" | "LOADED_FALLBACK">("LOADING");
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  const selectedComponents = useMemo(() => {
    return allRegisteredComponents.filter(c => selectedIds.includes(c.id));
  }, [allRegisteredComponents, selectedIds]);

  // Canva-style collective metrics aggregation
  const collectiveMetrics = useMemo(() => {
    const count = selectedComponents.length;
    const totalLengthM = +selectedComponents.reduce((acc, c) => acc + c.lengthM, 0).toFixed(2);
    const totalSurfaceAreaM2 = +selectedComponents.reduce((acc, c) => acc + c.surfaceAreaM2, 0).toFixed(2);
    const totalVolumeM3 = +selectedComponents.reduce((acc, c) => acc + c.volumeM3, 0).toFixed(3);
    const totalWeightKg = +selectedComponents.reduce((acc, c) => acc + c.totalWeightKg, 0).toFixed(1);
    const totalCostInr = +selectedComponents.reduce((acc, c) => acc + c.totalCostInr, 0).toFixed(2);

    return {
      count,
      totalLengthM,
      totalSurfaceAreaM2,
      totalVolumeM3,
      totalWeightKg,
      totalCostInr
    };
  }, [selectedComponents]);

  const handleToggleSelect = (id: string, isShift: boolean) => {
    if (!id) {
      if (!isShift) setSelectedIds([]);
      return;
    }
    if (multiSelectMode || isShift) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    } else {
      setSelectedIds([id]);
    }
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleRemoveSingle = (id: string) => {
    setSelectedIds(prev => prev.filter(item => item !== id));
  };

  const handleSealTakeoffStatement = async () => {
    if (selectedComponents.length === 0) return;
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_TAKEOFF_ITEMS_${selectedComponents.length}_LEN_${collectiveMetrics.totalLengthM}_AREA_${collectiveMetrics.totalSurfaceAreaM2}_COST_${collectiveMetrics.totalCostInr}_${timestamp}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "PLUTUS-TAKEOFF",
          synthesis_report: `COLLECTIVE BIM TAKEOFF NOTARIZED: ${selectedComponents.length} Sub-elements Selected • Total Length: ${collectiveMetrics.totalLengthM}m • Surface Area: ${collectiveMetrics.totalSurfaceAreaM2}m² • Aggregate Value: ₹${collectiveMetrics.totalCostInr.toLocaleString()}`,
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
              LOD-400 MASTER AS-BUILT DIGITAL TWIN
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              10.3m x 10.9m x 15m NORMALIZED
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            VANGUARD 3D DIGITAL TWIN & GRANULAR TAKEOFF INSPECTOR
          </h1>
          <p className="text-xs text-slate-400">
            Complete architectural structure integrated with individually selectable pipe runs, duct spools, window sills, and wall panels.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/material-recon" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">⚖️ CL. 42 RECON</a>
          <a href="/site/master-schedule" className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition">📅 CPM SCHEDULE</a>
        </div>
      </div>

      {/* Control Deck: Exterior Shell Opacity Slider & Multi-Select Modes */}
      <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-2xl grid grid-cols-1 md:grid-cols-12 gap-4 text-xs items-center">
        <div className="md:col-span-4 flex items-center gap-3">
          <div className="w-full">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                EXTERIOR MODEL TRANSPARENCY:
              </span>
              <span className="text-cyan-400 font-bold font-mono">
                {shellOpacity === 1.0 ? "100% (SOLID ARCHITECTURE)" : `${Math.round(shellOpacity * 100)}% (X-RAY GHOSTING)`}
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1.0"
              step="0.05"
              value={shellOpacity}
              onChange={e => setShellOpacity(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
        </div>

        <div className="md:col-span-4 flex items-center justify-center gap-2">
          <button
            onClick={() => setMultiSelectMode(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl border font-bold transition flex items-center gap-1.5 ${
              multiSelectMode
                ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                : "bg-slate-950 text-slate-400 border-slate-800"
            }`}
          >
            <LayersIcon className="w-3.5 h-3.5" />
            <span>{multiSelectMode ? "CANVA MULTI-SELECT: ON" : "SINGLE SELECTION MODE"}</span>
          </button>
        </div>

        <div className="md:col-span-4 flex items-center justify-end gap-1.5">
          {(["ALL", "MEP", "WALLS_FACADE", "STRUCTURE"] as const).map(mode => (
            <button
              key={mode}
              onClick={() => setViewFilter(mode)}
              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition ${
                viewFilter === mode
                  ? "bg-slate-800 border-slate-600 text-white"
                  : "bg-slate-950/60 text-slate-400 border-slate-800 hover:text-white"
              }`}
            >
              {mode.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid: 3D Complete Scene Viewport & Canva-Style Collective Takeoff Sheet */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 3D Viewport with Building + Granular Raycasting Sub-Components */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[580px]">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BoxIcon className="w-4 h-4 text-cyan-400" />
              INTEGRATED AS-BUILT TWIN & SUB-COMPONENT MESH
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className={`px-2 py-0.5 rounded font-bold ${
                modelStatus === "LOADED_GLB" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" : "bg-cyan-950 text-cyan-400"
              }`}>
                {modelStatus === "LOADED_GLB" ? "GLB SHELL MOUNTED" : "STRUCTURAL TWIN ACTIVE"}
              </span>
              <span className="text-cyan-400 font-bold">{selectedIds.length} SELECTED</span>
            </div>
          </div>

          <div className="relative bg-slate-950 flex-1 overflow-hidden min-h-[520px]">
            <VanguardCompleteBimCanvas
              selectedIds={selectedIds}
              onToggleSelect={handleToggleSelect}
              shellOpacity={shellOpacity}
              viewFilter={viewFilter}
              onCatalogRegistered={setAllRegisteredComponents}
              onModelStatusChange={setModelStatus}
            />

            {/* In-Canvas Color Legend Overlay */}
            <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 p-3 rounded-xl backdrop-blur-md text-[10px] flex flex-col gap-1 pointer-events-none z-10 font-mono">
              <span className="text-cyan-400 font-bold uppercase tracking-wider">SELECTABLE SUB-ELEMENTS</span>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 bg-red-500 rounded-sm"></span>
                <span>Fire Wet Riser & Sprinkler Spools (IS 1239)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 bg-cyan-400 rounded-sm"></span>
                <span>GI HVAC Ducts & VAV Spools (IS 655)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 bg-emerald-400 rounded-sm"></span>
                <span>Polished Granite Window Sills (280mm Projection)</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm"></span>
                <span>Modular AAC Spandrel Wall Panels</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 bg-slate-400 rounded-sm"></span>
                <span>Structural Steel ISMB 450 Beams</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Canva-Style Collective Aggregation & Deep Spec Sheet */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Canva-Style Collective Takeoff Summary Card */}
          <div className="bg-slate-900/70 border border-cyan-500/40 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_0_20px_rgba(6,182,212,0.12)]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-wider">
                  CANVA-STYLE COLLECTIVE TAKEOFF (MULTI-SELECTION)
                </span>
                <div className="text-white font-bold text-base mt-0.5">
                  {collectiveMetrics.count} Components Highlighted
                </div>
              </div>
              {selectedIds.length > 0 && (
                <button
                  onClick={handleClearSelection}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] rounded-lg transition font-mono"
                >
                  Clear Selection
                </button>
              )}
            </div>

            {/* Aggregated Numbers Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block">TOTAL LINEAR LENGTH</span>
                <span className="text-cyan-400 font-bold font-mono text-sm">{collectiveMetrics.totalLengthM} m</span>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block">SURFACE AREA</span>
                <span className="text-white font-bold font-mono text-sm">{collectiveMetrics.totalSurfaceAreaM2} m²</span>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block">ESTIMATED MASS</span>
                <span className="text-white font-bold font-mono text-sm">{collectiveMetrics.totalWeightKg} kg</span>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 col-span-2 md:col-span-3 flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-slate-500 uppercase block">AGGREGATE SCHEDULE VALUE (BOQ)</span>
                  <span className="text-emerald-400 font-bold font-mono text-base">
                    ₹{collectiveMetrics.totalCostInr.toLocaleString()}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500">Supply + Fixing + Labor</span>
              </div>
            </div>

            {/* Selection Chips */}
            {selectedComponents.length > 0 && (
              <div className="flex flex-wrap gap-1.5 max-h-[100px] overflow-y-auto pt-1">
                {selectedComponents.map(c => (
                  <span
                    key={c.id}
                    className="px-2 py-0.5 rounded-lg bg-slate-950 border border-cyan-500/40 text-cyan-300 text-[10px] font-mono flex items-center gap-1"
                  >
                    <span>{c.tag}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveSingle(c.id); }}
                      className="hover:text-red-400 ml-1 font-bold"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Deep Single-Item Inspector */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3">
            <div>
              <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  PRIMARY COMPONENT SPECIFICATION
                </span>
                <span className="text-[10px] text-cyan-400 font-mono">
                  {selectedComponents.length > 0 ? selectedComponents[selectedComponents.length - 1].tag : "SELECT AN ELEMENT"}
                </span>
              </div>

              {selectedComponents.length > 0 ? (
                (() => {
                  const item = selectedComponents[selectedComponents.length - 1];
                  return (
                    <div className="flex flex-col gap-2.5 mt-2 text-xs">
                      <div>
                        <div className="text-white font-bold text-sm leading-snug">{item.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{item.levelElevation} • {item.discipline}</div>
                      </div>

                      <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                        <div className="flex justify-between text-slate-300">
                          <span>Segment Length:</span>
                          <span className="font-bold text-white font-mono">{item.lengthM} meters</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Contact Surface Area:</span>
                          <span className="font-bold text-white font-mono">{item.surfaceAreaM2} m²</span>
                        </div>
                        <div className="flex justify-between text-slate-300">
                          <span>Self-Weight / Linear Mass:</span>
                          <span className="font-bold text-cyan-400 font-mono">{item.totalWeightKg} kg ({item.unitWeightKgM} kg/m)</span>
                        </div>
                        <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                          <span>BOQ Unit Item Rate:</span>
                          <span className="font-bold text-emerald-400 font-mono">₹{item.totalCostInr.toLocaleString()} (@ ₹{item.unitRateInr}/unit)</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                          <span className="text-[9px] text-slate-500 block">STANDARD CODE</span>
                          <span className="text-white font-bold">{item.standardSpec}</span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
                          <span className="text-[9px] text-slate-500 block">OEM / FABRICATOR</span>
                          <span className="text-emerald-400 font-bold truncate block">{item.vendorOem}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Click any pipe run, window sill, duct spool, or beam in the 3D model to view detailed engineering parameters.
                </div>
              )}
            </div>

            {/* Section 65B Takeoff Notarization Action */}
            <div className="pt-2 border-t border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-[10px] text-slate-500">
                Auditor: <strong className="text-emerald-400">PLUTUS-TAKEOFF-ENGINE</strong>
              </div>

              <div>
                {sealedHash ? (
                  <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/40 px-2.5 py-1 rounded-xl text-xs font-bold text-emerald-400">
                    <CheckIcon className="w-3.5 h-3.5" />
                    <span className="font-mono text-[9px] select-all">{sealedHash.substring(0, 24)}...</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSealTakeoffStatement}
                    disabled={isNotarizing || selectedComponents.length === 0}
                    className="px-3.5 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50"
                  >
                    {isNotarizing ? <RefreshIcon className="w-3.5 h-3.5 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-3.5 h-3.5 text-slate-950" />}
                    <span>NOTARIZE TAKEOFF STATEMENT</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: INTEGRATED THREE.JS CANVAS (BUILDING + INTERACTIVE COMPONENTS) ---
function VanguardCompleteBimCanvas({
  selectedIds,
  onToggleSelect,
  shellOpacity,
  viewFilter,
  onCatalogRegistered,
  onModelStatusChange
}: {
  selectedIds: string[];
  onToggleSelect: (id: string, isShift: boolean) => void;
  shellOpacity: number;
  viewFilter: "ALL" | "MEP" | "WALLS_FACADE" | "STRUCTURE";
  onCatalogRegistered: (catalog: BimSubComponentMeta[]) => void;
  onModelStatusChange: (status: "LOADING" | "LOADED_GLB" | "LOADED_FALLBACK") => void;
}) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // References to keep mutable states updated without resetting WebGL
  const callbackRef = useRef(onToggleSelect);
  useEffect(() => { callbackRef.current = onToggleSelect; }, [onToggleSelect]);

  const selectedRef = useRef(selectedIds);
  useEffect(() => { selectedRef.current = selectedIds; }, [selectedIds]);

  const filterRef = useRef(viewFilter);
  useEffect(() => { filterRef.current = viewFilter; }, [viewFilter]);

  const shellOpacityRef = useRef(shellOpacity);
  useEffect(() => { shellOpacityRef.current = shellOpacity; }, [shellOpacity]);

  const shellModelRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.012);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(24, 18, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 6.5, 0);

    // Illumination
    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const sunLight = new THREE.DirectionalLight(0xfff3e0, 1.8);
    sunLight.position.set(25, 40, 20);
    sunLight.castShadow = true;
    scene.add(sunLight);

    const floorGrid = new THREE.GridHelper(100, 40, 0x1e293b, 0x0f172a);
    scene.add(floorGrid);

    // Interactive Raycast Target Array & Catalog
    const interactiveMeshes: THREE.Mesh[] = [];
    const catalog: BimSubComponentMeta[] = [];

    const registerBimPart = (
      mesh: THREE.Mesh,
      meta: BimSubComponentMeta,
      baseColor: number
    ) => {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = {
        meta,
        baseColor,
        isBimElement: true
      };
      interactiveMeshes.push(mesh);
      catalog.push(meta);
      scene.add(mesh);
    };

    // =========================================================================
    // 1. GRANULAR FIRE PROTECTION PIPES (DISCRETE 2.5m SPOOLS & RISERS)
    // =========================================================================
    const fireSpoolHeights = [
      { y: 1.25, h: 2.5, tag: "FP-RIS-SPOOL-01", name: "65mm MS Wet Riser Spool #1 (Level 0)", elev: "0.0m - 2.5m RL" },
      { y: 3.75, h: 2.5, tag: "FP-RIS-SPOOL-02", name: "65mm MS Wet Riser Spool #2 (Podium)", elev: "2.5m - 5.0m RL" },
      { y: 6.25, h: 2.5, tag: "FP-RIS-SPOOL-03", name: "65mm MS Wet Riser Spool #3 (Level 1)", elev: "5.0m - 7.5m RL" },
      { y: 8.75, h: 2.5, tag: "FP-RIS-SPOOL-04", name: "65mm MS Wet Riser Spool #4 (Level 2)", elev: "7.5m - 10.0m RL" },
      { y: 11.25, h: 2.5, tag: "FP-RIS-SPOOL-05", name: "65mm MS Wet Riser Spool #5 (Level 3)", elev: "10.0m - 12.5m RL" },
      { y: 13.75, h: 2.5, tag: "FP-RIS-SPOOL-06", name: "65mm MS Wet Riser Spool #6 (Roof)", elev: "12.5m - 15.0m RL" }
    ];

    fireSpoolHeights.forEach((spool, idx) => {
      const geo = new THREE.CylinderGeometry(0.065, 0.065, spool.h, 16);
      const mat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.8, roughness: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(-3.5, spool.y, -2.5);

      const d = 0.13;
      const surfaceArea = +(Math.PI * d * spool.h).toFixed(2);
      const volume = +(Math.PI * Math.pow(d / 2, 2) * spool.h).toFixed(3);
      const unitWeight = 8.5; // kg/m
      const totalWeight = +(unitWeight * spool.h).toFixed(1);
      const unitRate = 1450; // Rs/m
      const totalCost = +(unitRate * spool.h).toFixed(2);

      registerBimPart(mesh, {
        id: `FP_SPOOL_${idx + 1}`,
        tag: spool.tag,
        name: spool.name,
        category: "FIRE_PIPE",
        discipline: "MEP_PHE",
        levelElevation: spool.elev,
        lengthM: spool.h,
        surfaceAreaM2: surfaceArea,
        volumeM3: volume,
        unitWeightKgM: unitWeight,
        totalWeightKg: totalWeight,
        unitRateInr: unitRate,
        totalCostInr: totalCost,
        standardSpec: "IS 1239 Heavy Grade MS ERW",
        vendorOem: "Jindal Star / Tata Pipes",
        installationStatus: "INSTALLED"
      }, 0xef4444);
    });

    // Horizontal Sprinkler Branch Runs
    [4.2, 8.2, 12.2].forEach((floorY, fIdx) => {
      [-2.0, 2.0].forEach((zPos, bIdx) => {
        const branchLen = 4.8;
        const geo = new THREE.CylinderGeometry(0.025, 0.025, branchLen, 12);
        const mat = new THREE.MeshStandardMaterial({ color: 0xdc2626, metalness: 0.8 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.z = Math.PI / 2;
        mesh.position.set(0, floorY, zPos);

        const surfaceArea = +(Math.PI * 0.05 * branchLen).toFixed(2);
        const unitRate = 650;

        registerBimPart(mesh, {
          id: `FP_BR_${fIdx + 1}_${bIdx + 1}`,
          tag: `FP-BR-L${fIdx + 1}-0${bIdx + 1}`,
          name: `25mm Sprinkler Branch Line (Bay ${bIdx === 0 ? "South" : "North"})`,
          category: "FIRE_PIPE",
          discipline: "MEP_PHE",
          levelElevation: `+${floorY}m RL (Level ${fIdx + 1})`,
          lengthM: branchLen,
          surfaceAreaM2: surfaceArea,
          volumeM3: 0.009,
          unitWeightKgM: 2.8,
          totalWeightKg: +(2.8 * branchLen).toFixed(1),
          unitRateInr: unitRate,
          totalCostInr: +(unitRate * branchLen).toFixed(2),
          standardSpec: "IS 15105 Quartzoid Pendent Heads",
          vendorOem: "HD Fire Protect",
          installationStatus: "QA_VERIFIED"
        }, 0xdc2626);
      });
    });

    // =========================================================================
    // 2. GRANULAR HVAC RECTANGULAR DUCTS (2.4m FLANGED SECTIONS)
    // =========================================================================
    [4.0, 8.0, 12.0].forEach((ductY, fIdx) => {
      [-2.5, 0.0, 2.5].forEach((xPos, sIdx) => {
        const segLen = 2.4;
        const geo = new THREE.BoxGeometry(segLen, 0.35, 0.6);
        const mat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.7, roughness: 0.25 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(xPos, ductY, -1.0);

        const surfaceArea = +(2 * (0.35 + 0.6) * segLen).toFixed(2);
        const unitRate = 2200; // Rs/m

        registerBimPart(mesh, {
          id: `HVAC_SEG_L${fIdx + 1}_${sIdx + 1}`,
          tag: `HVAC-DUCT-L${fIdx + 1}-0${sIdx + 1}`,
          name: `600x350mm GI Rectangular Duct Section #${sIdx + 1}`,
          category: "HVAC_DUCT",
          discipline: "MEP_HVAC",
          levelElevation: `+${ductY}m RL (Level ${fIdx + 1})`,
          lengthM: segLen,
          surfaceAreaM2: surfaceArea,
          volumeM3: +(0.6 * 0.35 * segLen).toFixed(3),
          unitWeightKgM: 9.8,
          totalWeightKg: +(9.8 * segLen).toFixed(1),
          unitRateInr: unitRate,
          totalCostInr: +(unitRate * segLen).toFixed(2),
          standardSpec: "IS 655 / SMACNA 24-Gauge Galvanized",
          vendorOem: "Carrier / Sail Coils",
          installationStatus: "INSTALLED"
        }, 0x38bdf8);
      });
    });

    // =========================================================================
    // 3. SUB-DIVIDED WALL FACADE SURFACES (WINDOW SILLS, LINTELS, SPANDRELS)
    // =========================================================================
    const wallLevels = [
      { yBase: 0.0, levelName: "Ground Podium (+0.0m - +4.5m)" },
      { yBase: 4.5, levelName: "Level 1 Office (+4.5m - +8.5m)" },
      { yBase: 8.5, levelName: "Level 2 Superstructure (+8.5m - +12.5m)" }
    ];

    wallLevels.forEach((wl, lIdx) => {
      // A. Lower Spandrel Wall Panel (Below Window: 0.9m high)
      const spandrelGeo = new THREE.BoxGeometry(9.6, 0.9, 0.2);
      const spandrelMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.85 });
      const spandrelMesh = new THREE.Mesh(spandrelGeo, spandrelMat);
      spandrelMesh.position.set(0, wl.yBase + 0.45, 5.25);

      registerBimPart(spandrelMesh, {
        id: `WALL_SPANDREL_L${lIdx + 1}`,
        tag: `ARC-SPANDREL-L${lIdx + 1}`,
        name: `AAC Blockwork Lower Spandrel Wall Panel`,
        category: "WALL_PANEL",
        discipline: "ARCHITECTURAL",
        levelElevation: wl.levelName,
        lengthM: 9.6,
        surfaceAreaM2: +(9.6 * 0.9).toFixed(2),
        volumeM3: +(9.6 * 0.9 * 0.2).toFixed(3),
        unitWeightKgM: 110.0,
        totalWeightKg: +(110.0 * 9.6).toFixed(1),
        unitRateInr: 3200,
        totalCostInr: +(9.6 * 0.9 * 3200).toFixed(2),
        standardSpec: "IS 2185 Autoclaved Aerated Concrete",
        vendorOem: "Magicrete / Biltech AAC",
        installationStatus: "INSTALLED"
      }, 0xd97706);

      // B. Projecting Polished Granite Window Sill Band (Continuously selectable sill surface)
      const sillGeo = new THREE.BoxGeometry(9.8, 0.08, 0.28);
      const sillMat = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.2, metalness: 0.3 });
      const sillMesh = new THREE.Mesh(sillGeo, sillMat);
      sillMesh.position.set(0, wl.yBase + 0.94, 5.3);

      registerBimPart(sillMesh, {
        id: `WALL_SILL_L${lIdx + 1}`,
        tag: `ARC-SILL-L${lIdx + 1}`,
        name: `Moulded Black Granite Window Sill Band (280mm Projection)`,
        category: "WINDOW_SILL",
        discipline: "ARCHITECTURAL",
        levelElevation: wl.levelName,
        lengthM: 9.8,
        surfaceAreaM2: +(9.8 * 0.28).toFixed(2),
        volumeM3: +(9.8 * 0.08 * 0.28).toFixed(3),
        unitWeightKgM: 22.0,
        totalWeightKg: +(22.0 * 9.8).toFixed(1),
        unitRateInr: 1850,
        totalCostInr: +(1850 * 9.8).toFixed(2),
        standardSpec: "IS 1130 Polished Granite Architectural Sill",
        vendorOem: "Rajasthan Granites / Stone Depot",
        installationStatus: "INSTALLED"
      }, 0x10b981);

      // C. Reinforced Concrete Lintel Band (Above Window: 2.4m height)
      const lintelGeo = new THREE.BoxGeometry(9.6, 0.2, 0.2);
      const lintelMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.9 });
      const lintelMesh = new THREE.Mesh(lintelGeo, lintelMat);
      lintelMesh.position.set(0, wl.yBase + 2.4, 5.25);

      registerBimPart(lintelMesh, {
        id: `WALL_LINTEL_L${lIdx + 1}`,
        tag: `STR-LINTEL-L${lIdx + 1}`,
        name: `Continuous Seismic Concrete Lintel Band (200x200mm)`,
        category: "LINTEL_BAND",
        discipline: "STRUCTURAL",
        levelElevation: wl.levelName,
        lengthM: 9.6,
        surfaceAreaM2: +(9.6 * 0.2).toFixed(2),
        volumeM3: +(9.6 * 0.2 * 0.2).toFixed(3),
        unitWeightKgM: 48.0,
        totalWeightKg: +(48.0 * 9.6).toFixed(1),
        unitRateInr: 1250,
        totalCostInr: +(1250 * 9.6).toFixed(2),
        standardSpec: "IS 4326 Earthquake Resisting Band",
        vendorOem: "Site Cast M35 RMC",
        installationStatus: "QA_VERIFIED"
      }, 0x64748b);
    });

    // =========================================================================
    // 4. STRUCTURAL STEEL H-BEAMS (ISMB 450)
    // =========================================================================
    [-4.5, 0.0, 4.5].forEach((xCol, cIdx) => {
      const beamLen = 9.8;
      const geo = new THREE.BoxGeometry(0.3, 0.45, beamLen);
      const mat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.85, roughness: 0.3 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(xCol, 8.5, 0);

      const surfaceArea = +(2 * (0.3 + 0.45) * beamLen).toFixed(2);
      const unitRate = 4850;

      registerBimPart(mesh, {
        id: `BEAM_SEC_GRID_${cIdx + 1}`,
        tag: `STR-HBEAM-G${cIdx + 1}`,
        name: `ISMB 450 Heavy Structural Steel Primary Framing Beam`,
        category: "STRUCTURAL_BEAM",
        discipline: "STRUCTURAL",
        levelElevation: "+8.5m RL (Level 2 Floor Framing)",
        lengthM: beamLen,
        surfaceAreaM2: surfaceArea,
        volumeM3: +(0.3 * 0.45 * beamLen).toFixed(3),
        unitWeightKgM: 72.4,
        totalWeightKg: +(72.4 * beamLen).toFixed(1),
        unitRateInr: unitRate,
        totalCostInr: +(unitRate * beamLen).toFixed(2),
        standardSpec: "IS 800:2007 Structural Steel Design",
        vendorOem: "Tata Structura / SAIL",
        installationStatus: "INSTALLED"
      }, 0x475569);
    });

    onCatalogRegistered(catalog);

    // =========================================================================
    // 5. RESTORE COMPLETE ARCHITECTURAL MODEL (/building.glb + Procedural Fallback)
    // =========================================================================
    const gltfLoader = new GLTFLoader();
    onModelStatusChange("LOADING");

    gltfLoader.load(
      "/building.glb",
      (gltf) => {
        const fileModel = gltf.scene;
        const box = new THREE.Box3().setFromObject(fileModel);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        fileModel.scale.setScalar(15 / maxDim);

        const scaledBox = new THREE.Box3().setFromObject(fileModel);
        const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
        const finalSize = scaledBox.getSize(new THREE.Vector3());
        fileModel.position.sub(scaledCenter);
        fileModel.position.y += finalSize.y / 2;

        fileModel.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach(m => {
              m.transparent = true;
              m.opacity = shellOpacityRef.current;
              m.needsUpdate = true;
            });
          }
        });

        shellModelRef.current = fileModel;
        scene.add(fileModel);
        onModelStatusChange("LOADED_GLB");
      },
      undefined,
      () => {
        // Fallback: Build full 15m structural building shell with floors and facade
        console.warn("Building fallback architectural shell...");
        const shellGroup = new THREE.Group();

        // Concrete Base Footing
        const baseMesh = new THREE.Mesh(
          new THREE.BoxGeometry(10.3, 0.6, 10.9),
          new THREE.MeshStandardMaterial({ color: 0x334155, transparent: true, opacity: shellOpacityRef.current })
        );
        baseMesh.position.set(0, 0.3, 0);
        shellGroup.add(baseMesh);

        // Multi-level floor slabs
        [4.5, 8.5, 12.5].forEach(y => {
          const slab = new THREE.Mesh(
            new THREE.BoxGeometry(10.3, 0.3, 10.9),
            new THREE.MeshStandardMaterial({ color: 0x1e293b, transparent: true, opacity: shellOpacityRef.current })
          );
          slab.position.set(0, y, 0);
          shellGroup.add(slab);
        });

        // 3D Glass Curtain Facade Shell
        const glassCurtain = new THREE.Mesh(
          new THREE.BoxGeometry(10.1, 14.0, 10.7),
          new THREE.MeshPhysicalMaterial({
            color: 0x38bdf8,
            transparent: true,
            opacity: 0.15,
            roughness: 0.1,
            transmission: 0.7
          })
        );
        glassCurtain.position.set(0, 7.5, 0);
        shellGroup.add(glassCurtain);

        // Rooftop Overhanging Canopy
        const roofCanopy = new THREE.Mesh(
          new THREE.BoxGeometry(11.5, 0.5, 12.0),
          new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.7, transparent: true, opacity: shellOpacityRef.current })
        );
        roofCanopy.position.set(0, 14.8, 0);
        shellGroup.add(roofCanopy);

        shellModelRef.current = shellGroup;
        scene.add(shellGroup);
        onModelStatusChange("LOADED_FALLBACK");
      }
    );

    // =========================================================================
    // 6. RAYCASTING INTERACTION HANDLER (Canva-style multi-select)
    // =========================================================================
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDownPos = { x: 0, y: 0 };

    const onPointerDown = (e: MouseEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = (e: MouseEvent) => {
      const dx = Math.abs(e.clientX - pointerDownPos.x);
      const dy = Math.abs(e.clientY - pointerDownPos.y);
      if (dx > 4 || dy > 4) return; // Ignore camera orbit drag

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(pointer, camera);
      const visibleTargets = interactiveMeshes.filter(m => m.visible);
      const intersects = raycaster.intersectObjects(visibleTargets, false);

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        const meta = hitMesh.userData.meta as BimSubComponentMeta;
        if (meta && meta.id) {
          callbackRef.current(meta.id, e.shiftKey);
        }
      } else if (!e.shiftKey) {
        callbackRef.current("", false);
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener("pointerdown", onPointerDown);
    dom.addEventListener("pointerup", onPointerUp);

    // Animation Loop
    let animId: number;
    const animate = () => {
      controls.update();

      // Dynamic Exterior Shell Opacity Sync
      if (shellModelRef.current) {
        const targetOpacity = shellOpacityRef.current;
        shellModelRef.current.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            const mesh = node as THREE.Mesh;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach(m => {
              if (m.opacity !== targetOpacity) {
                m.opacity = targetOpacity;
              }
            });
          }
        });
      }

      // Dynamic Sub-Component Highlight & Filtering
      const currentSelected = selectedRef.current;
      const currentFilter = filterRef.current;

      interactiveMeshes.forEach(mesh => {
        const meta = mesh.userData.meta as BimSubComponentMeta;
        const isSelected = currentSelected.includes(meta.id);
        const mat = mesh.material as THREE.MeshStandardMaterial;

        // View filter visibility
        if (currentFilter === "MEP") {
          mesh.visible = meta.discipline === "MEP_PHE" || meta.discipline === "MEP_HVAC";
        } else if (currentFilter === "WALLS_FACADE") {
          mesh.visible = meta.discipline === "ARCHITECTURAL";
        } else if (currentFilter === "STRUCTURE") {
          mesh.visible = meta.discipline === "STRUCTURAL";
        } else {
          mesh.visible = true;
        }

        // Selection Visual Styling (Bright cyan emissive aura)
        if (isSelected) {
          mat.emissive.setHex(0x06b6d4);
          mat.emissiveIntensity = 0.75;
          mat.color.setHex(0x38bdf8);
        } else {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0.0;
          mat.color.setHex(mesh.userData.baseColor);
        }
      });

      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    const resizeSub = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", resizeSub);

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener("pointerdown", onPointerDown);
      dom.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("resize", resizeSub);
      controls.dispose();
      renderer.dispose();
    };
  }, [onCatalogRegistered, onModelStatusChange]);

  return <div ref={mountRef} className="w-full h-full cursor-pointer active:cursor-grabbing" />;
}
PAGE_EOF

# Mirror across all twin routes
cp app/site/digital-twin/page.tsx app/digital-twin/page.tsx
cp app/site/digital-twin/page.tsx app/site/bim/page.tsx

echo "============================================================"
echo "✓ Full Building Scene Reintegrated with Granular Takeoff!"
echo "============================================================"
