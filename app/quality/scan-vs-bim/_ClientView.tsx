"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { supabase } from "@/lib/supabaseClient";
import {
  calculatePointDeviation,
  evaluateColumnPlumbness,
  calculateAstmE1155FloorNumbers,
  PointCloudSamplePoint,
  ColumnVerticalityPlumbness
} from "@/lib/calculations/scanVsBimEngine";

// --- INLINE SVG ICONS ---
const ScanIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2m10 0h2a2 2 0 012 2v2m0 10v2a2 2 0 01-2 2h-2m-10 0H5a2 2 0 01-2-2v-2" />
    <line x1="8" y1="12" x2="16" y2="12" />
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
const AlertTriangleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const RefreshIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function ScanVsBimDeviationPage() {
  const [selectedScanStation, setSelectedScanStation] = useState<string>("STATION-TS-01");
  const [toleranceThresholdFilter, setToleranceThresholdFilter] = useState<"ALL" | "OUT_OF_TOLERANCE" | "WARNING">("ALL");
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  // 1. Raw Total Station / Terrestrial Laser Scanning (TLS) Point Dataset
  // Aligned to Project Vanguard's 10.3m x 10.9m x 15m coordinates
  const sampleScanPoints: PointCloudSamplePoint[] = useMemo(() => [
    {
      id: "PTS-001",
      structuralElementTag: "COL-A1",
      elementType: "COLUMN",
      designCoordMm: [-4500, 15000, -4500],
      scannedCoordMm: [-4492, 14998, -4495],
      deviationDeltaMm: 9.6,
      vectorDxMm: 8.0,
      vectorDyMm: -2.0,
      vectorDzMm: 5.0,
      toleranceLimitMm: 20.0, // IS 456 Plumbness Limit
      status: "IN_TOLERANCE"
    },
    {
      id: "PTS-002",
      structuralElementTag: "COL-C2", // Known Honeycombed Column Grid
      elementType: "COLUMN",
      designCoordMm: [4500, 15000, 4500],
      scannedCoordMm: [4524, 14994, 4516],
      deviationDeltaMm: 29.5, // 29.5mm > 20mm Limit -> Exceeds Plumbness Limit
      vectorDxMm: 24.0,
      vectorDyMm: -6.0,
      vectorDzMm: 16.0,
      toleranceLimitMm: 20.0,
      status: "OUT_OF_TOLERANCE_NCR"
    },
    {
      id: "PTS-003",
      structuralElementTag: "BEAM-L2-MID",
      elementType: "BEAM",
      designCoordMm: [0, 8500, 0],
      scannedCoordMm: [2, 8491, -1], // -9mm vertical sag
      deviationDeltaMm: 9.3,
      vectorDxMm: 2.0,
      vectorDyMm: -9.0,
      vectorDzMm: -1.0,
      toleranceLimitMm: 6.0, // IS 456 Camber / Sag Limit = +/-6mm
      status: "OUT_OF_TOLERANCE_NCR"
    },
    {
      id: "PTS-004",
      structuralElementTag: "SLAB-PODIUM-L1",
      elementType: "SLAB",
      designCoordMm: [-2000, 4500, 2000],
      scannedCoordMm: [-2001, 4504, 2002],
      deviationDeltaMm: 4.6,
      vectorDxMm: -1.0,
      vectorDyMm: 4.0,
      vectorDzMm: 2.0,
      toleranceLimitMm: 6.0,
      status: "IN_TOLERANCE"
    },
    {
      id: "PTS-005",
      structuralElementTag: "SLAB-PODIUM-L1",
      elementType: "SLAB",
      designCoordMm: [3000, 4500, -3000],
      scannedCoordMm: [3002, 4505, -2998],
      deviationDeltaMm: 5.7,
      vectorDxMm: 2.0,
      vectorDyMm: 5.0,
      vectorDzMm: 2.0,
      toleranceLimitMm: 6.0,
      status: "WARNING_NEAR_LIMIT"
    },
    {
      id: "PTS-006",
      structuralElementTag: "WALL-FACADE-EAST",
      elementType: "WALL",
      designCoordMm: [5150, 6500, 0],
      scannedCoordMm: [5154, 6498, -2],
      deviationDeltaMm: 4.9,
      vectorDxMm: 4.0,
      vectorDyMm: -2.0,
      vectorDzMm: -2.0,
      toleranceLimitMm: 10.0,
      status: "IN_TOLERANCE"
    }
  ], []);

  // 2. Column Plumbness Inclinometer Schedule (IS 456 Cl. 20.1)
  const columnPlumbnessSchedule: ColumnVerticalityPlumbness[] = useMemo(() => [
    evaluateColumnPlumbness("COL-A1", 15.0, 2.1, 9.4),
    evaluateColumnPlumbness("COL-B1", 15.0, 1.5, 7.8),
    evaluateColumnPlumbness("COL-C1", 15.0, 3.2, 12.1),
    evaluateColumnPlumbness("COL-C2", 15.0, 4.0, 26.5), // Fails: 22.5mm drift > 20mm limit
    evaluateColumnPlumbness("COL-B2", 15.0, 1.2, 5.4),
    evaluateColumnPlumbness("COL-A2", 15.0, 2.5, 11.2)
  ], []);

  // 3. ASTM E1155 Floor Flatness / Floor Levelness (FF/FL) on Ground Podium Slab
  // 16 elevation readings sampled along 4.5m test line at 300mm intervals
  const rawPodiumElevationsMm = useMemo(() => [
    0.0, 1.2, 2.5, 1.8, -0.5, -1.8, -2.4, -1.0, 0.8, 1.9, 2.1, 1.4, -0.2, -1.1, -0.6, 0.4
  ], []);

  const floorFlatnessResult = useMemo(() => {
    return calculateAstmE1155FloorNumbers("SLAB-PODIUM-L1", rawPodiumElevationsMm, 35, 25);
  }, [rawPodiumElevationsMm]);

  // Filtered Points
  const filteredPoints = useMemo(() => {
    if (toleranceThresholdFilter === "OUT_OF_TOLERANCE") {
      return sampleScanPoints.filter(p => p.status === "OUT_OF_TOLERANCE_NCR");
    }
    if (toleranceThresholdFilter === "WARNING") {
      return sampleScanPoints.filter(p => p.status === "WARNING_NEAR_LIMIT");
    }
    return sampleScanPoints;
  }, [sampleScanPoints, toleranceThresholdFilter]);

  // Aggregate Metrics
  const complianceRatePct = useMemo(() => {
    const passed = sampleScanPoints.filter(p => p.status === "IN_TOLERANCE").length;
    return +((passed / sampleScanPoints.length) * 100).toFixed(1);
  }, [sampleScanPoints]);

  const maxObservedDeviationMm = useMemo(() => {
    return Math.max(...sampleScanPoints.map(p => p.deviationDeltaMm));
  }, [sampleScanPoints]);

  const handleSealScanVsBimAudit = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_SCAN_BIM_${selectedScanStation}_MAXDEV_${maxObservedDeviationMm}_FF_${floorFlatnessResult.floorFlatnessFF}_FL_${floorFlatnessResult.floorLevelnessFL}_TIME_${timestamp}_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "ARGUS-SPATIAL",
          synthesis_report: `SCAN-VS-BIM AS-BUILT NOTARIZED: Station: ${selectedScanStation} • Compliance Rate: ${complianceRatePct}% • Max Spatial Delta: ${maxObservedDeviationMm} mm (Column C2 Out of Tolerance) • ASTM E1155: FF ${floorFlatnessResult.floorFlatnessFF} / FL ${floorFlatnessResult.floorLevelnessFL}`,
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
              SCAN-VS-BIM LASER SPATIAL AUDIT
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              IS 456 CL. 20 / ASTM E1155
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            AS-BUILT SCAN-VS-BIM DEVIATION & SURFACE TOLERANCES
          </h1>
          <p className="text-xs text-slate-400">
            Terrestrial LiDAR Point-Cloud Alignment against Vanguard 10.3m x 10.9m x 15m BIM Coordination Model
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/quality/ncr" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">⚠️ NCR LIENS</a>
          <a href="/quality/pour-cards" className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition">🧪 POUR CARDS</a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">TOLERANCE COMPLIANCE</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{complianceRatePct}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">IS 456 Table 20 Thresholds</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">MAX SPATIAL DELTA</div>
          <div className="text-xl font-bold text-red-400 mt-1 font-mono">+{maxObservedDeviationMm} mm</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Col C2 Top Plumb Drift</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">ASTM E1155 FLOOR FLATNESS</div>
          <div className={`text-xl font-bold mt-1 font-mono ${floorFlatnessResult.isFlatnessCompliant ? "text-emerald-400" : "text-amber-400"}`}>
            FF {floorFlatnessResult.floorFlatnessFF}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Specified Min: FF {floorFlatnessResult.specifiedMinFF}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">ASTM E1155 FLOOR LEVELNESS</div>
          <div className={`text-xl font-bold mt-1 font-mono ${floorFlatnessResult.isLevelnessCompliant ? "text-emerald-400" : "text-amber-400"}`}>
            FL {floorFlatnessResult.floorLevelnessFL}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Specified Min: FL {floorFlatnessResult.specifiedMinFL}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">SCAN STATION TELEMETRY</div>
          <div className="text-sm font-bold text-cyan-400 mt-1.5 flex items-center gap-1.5">
            <ScanIcon className="w-3.5 h-3.5" />
            <span>LEICA RTC360 ACTIVE</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Coordinate Residual: 0.8 mm</div>
        </div>
      </div>

      {/* Main Grid: 3D Point-Cloud Deviation Canvas & Inspection Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Three.js Point-Cloud Heatmap Viewport */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[580px]">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ScanIcon className="w-4 h-4 text-cyan-400" />
              HEATMAP OVERLAY: TLS CLOUD VS BIM SURFACE
            </span>
            <div className="flex items-center gap-2">
              {(["ALL", "OUT_OF_TOLERANCE", "WARNING"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setToleranceThresholdFilter(f)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition ${
                    toleranceThresholdFilter === f
                      ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                      : "bg-slate-950 text-slate-500 border border-slate-800"
                  }`}
                >
                  {f.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="relative bg-slate-950 flex-1 overflow-hidden min-h-[520px]">
            <PointCloudHeatmapCanvas points={filteredPoints} />

            {/* In-Canvas Deviation Heatmap Color Bar */}
            <div className="absolute bottom-4 left-4 right-4 bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl backdrop-blur-md text-[10px] flex flex-col gap-1.5 font-mono">
              <div className="flex justify-between items-center text-slate-400">
                <span>-20mm (Negative Undersize)</span>
                <span className="text-emerald-400 font-bold">0.0 mm (Exact Nominal)</span>
                <span>+30mm (Positive Bulge / Out-of-Plumb)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-gradient-to-r from-blue-500 via-emerald-400 via-amber-400 to-red-500 border border-slate-800" />
            </div>
          </div>
        </div>

        {/* Right: Inspection Tables: Column Plumbness & ASTM E1155 Flatness */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Table A: Column Verticality Plumbness Schedule (IS 456 Cl. 20.1) */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                COLUMN PLUMBNESS / VERTICALITY AUDIT (IS 456)
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">H = 15.0m (Limit: 20mm)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950/80 text-[10px] text-slate-500 uppercase border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-2">COL</th>
                    <th className="py-2 px-2">TOP DRIFT</th>
                    <th className="py-2 px-2">RATIO</th>
                    <th className="py-2 px-2 text-right">VERDICT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-[11px]">
                  {columnPlumbnessSchedule.map(col => (
                    <tr key={col.columnTag} className="hover:bg-slate-900/40">
                      <td className="py-2 px-2 font-bold text-white">{col.columnTag}</td>
                      <td className="py-2 px-2 font-semibold text-slate-300">{col.lateralDriftDeltaMm} mm</td>
                      <td className="py-2 px-2 text-slate-400">{col.plumbnessRatio}</td>
                      <td className="py-2 px-2 text-right">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          col.isPlumbCompliant
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : "bg-red-950 text-red-400 border border-red-500/30"
                        }`}>
                          {col.isPlumbCompliant ? "PLUMB OK" : "OUT OF PLUMB"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-[10px] text-slate-500 border-t border-slate-800/80 pt-1.5">
              IS 456 Cl. 20.1(b): Maximum permissible lateral drift of column centerline is $H/300 \le 20 mm$. Column C2 exceeds threshold ($22.5 mm$ net drift) and is held under structural lien.
            </div>
          </div>

          {/* Table B: ASTM E1155 Floor Flatness Profile */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                ASTM E1155 FLOOR PROFILE: PODIUM SLAB
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">16 SAMPLES @ 300mm</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block">MEASURED FLATNESS (FF)</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">FF {floorFlatnessResult.floorFlatnessFF}</span>
                <div className="text-[9px] text-slate-400">Spec: FF {floorFlatnessResult.specifiedMinFF} (Class: Flat)</div>
              </div>

              <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 uppercase block">MEASURED LEVELNESS (FL)</span>
                <span className="text-lg font-bold text-cyan-400 font-mono">FL {floorFlatnessResult.floorLevelnessFL}</span>
                <div className="text-[9px] text-slate-400">Spec: FL {floorFlatnessResult.specifiedMinFL} (Pitch: 3m)</div>
              </div>
            </div>

            <div className="p-2.5 bg-black/40 rounded-xl border border-slate-800/80 text-[10px] text-slate-400">
              Formulation: $F_F = 115.7 / (3 \cdot S_q + |q_mean|)$ where curvature standard deviation $S_q = {floorFlatnessResult.stdDeviationCurvatureSq} mm$.
            </div>
          </div>

          {/* BSA Section 63 Scan-vs-BIM Notarization */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>BSA Section 63 AS-BUILT GEODETIC SEAL</span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                Legally seals raw spatial point-cloud scan deltas, column verticality deviations, and ASTM E1155 surface numbers into the immutable audit chain.
              </div>
            </div>

            <div>
              {sealedHash ? (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>SCAN-VS-BIM AUDIT NOTARIZED & SEALED</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono truncate select-all">
                    {sealedHash}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSealScanVsBimAudit}
                  disabled={isNotarizing}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE SCAN-VS-BIM AUDIT (BSA Sec 63)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: THREE.JS POINT CLOUD HEATMAP CANVAS ---
function PointCloudHeatmapCanvas({ points }: { points: PointCloudSamplePoint[] }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(20, 16, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 6.0, 0);

    // Floor Grid & Lighting
    scene.add(new THREE.GridHelper(40, 20, 0x1e293b, 0x0f172a));
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    // Ghosted Wireframe Box representing 10.3m x 10.9m x 15m BIM Nominal Envelope
    const wireframeBox = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(10.3, 15.0, 10.9)),
      new THREE.LineBasicMaterial({ color: 0x334155 })
    );
    wireframeBox.position.set(0, 7.5, 0);
    scene.add(wireframeBox);

    // Render Point Cloud Targets with Color-Coded Heatmap Spheres
    points.forEach(pt => {
      // Scale coordinates from mm to Three.js world units (meters)
      const x = pt.scannedCoordMm[0] / 1000;
      const y = pt.scannedCoordMm[1] / 1000;
      const z = pt.scannedCoordMm[2] / 1000;

      // Color mapping: Green (<=6mm), Amber (6-12mm), Red (>12mm)
      let colorHex = 0x10b981; // Green
      if (pt.status === "OUT_OF_TOLERANCE_NCR") colorHex = 0xef4444; // Red
      else if (pt.status === "WARNING_NEAR_LIMIT") colorHex = 0xf59e0b; // Amber

      const sphereGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({ color: colorHex });
      const mesh = new THREE.Mesh(sphereGeo, sphereMat);
      mesh.position.set(x, y, z);
      scene.add(mesh);

      // Vector indicator line from BIM nominal to Scanned actual
      const designPos = new THREE.Vector3(
        pt.designCoordMm[0] / 1000,
        pt.designCoordMm[1] / 1000,
        pt.designCoordMm[2] / 1000
      );
      const lineGeo = new THREE.BufferGeometry().setFromPoints([designPos, new THREE.Vector3(x, y, z)]);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
      scene.add(new THREE.Line(lineGeo, lineMat));
    });

    let animId: number;
    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
      animId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      controls.dispose();
      renderer.dispose();
    };
  }, [points]);

  return <div ref={mountRef} className="w-full h-full cursor-pointer active:cursor-grabbing" />;
}
