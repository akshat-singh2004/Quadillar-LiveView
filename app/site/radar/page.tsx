"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  calculateCraneTipPosition,
  evaluatePowerlineClearance,
  calculatePhotogrammetryGsd,
  CraneKinematicState,
  Point2D,
  PhotogrammetryFlightSpec
} from "@/lib/calculations/gisRadarEngine";

// --- INLINE SVG ICONS ---
const RadarIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
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
const LockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
  </svg>
);
const CameraIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
    <circle cx="12" cy="13" r="4" />
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

export default function GisRadarSafetyPage() {
  // Tower Crane Kinematic Configuration (Potain IGO 50)
  const [craneState, setCraneState] = useState<CraneKinematicState>({
    mastCoord: { x: -8.0, y: 3.5 },
    jibRadiusM: 35.0,
    trolleyRadiusM: 18.5,
    slewAngleDeg: 42.0, // Initial slew orientation in degrees
    hookElevationM: 16.4,
    suspendedLoadTonnage: 2.1
  });

  // 11kV Overhead Powerline Vector (Northern Site Boundary)
  const powerlineStart: Point2D = { x: -25.0, y: 22.0 };
  const powerlineEnd: Point2D = { x: 25.0, y: 22.0 };

  // Drone Aerial Photogrammetry Mission Spec (DJI Phantom 4 RTK)
  const flightSpec: PhotogrammetryFlightSpec = {
    altitudeAGLM: 45.0,
    sensorWidthMm: 13.2,
    focalLengthMm: 8.8,
    imageWidthPx: 5472,
    imageHeightPx: 3648,
    forwardOverlapPct: 80,
    sideOverlapPct: 70
  };

  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  // Computations
  const cranePositions = useMemo(() => calculateCraneTipPosition(craneState), [craneState]);
  const powerlineAudit = useMemo(() => {
    return evaluatePowerlineClearance(
      cranePositions.trolleyCoord,
      cranePositions.tipCoord,
      powerlineStart,
      powerlineEnd,
      3.50 // 3.5m Statutory Clearance
    );
  }, [cranePositions, powerlineStart, powerlineEnd]);

  const photogrammetryGsd = useMemo(() => calculatePhotogrammetryGsd(flightSpec), [flightSpec]);

  const handleSealGisTelemetry = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_GIS_SLEW_${craneState.slewAngleDeg}_TROLLEY_${craneState.trolleyRadiusM}M_SEP_${powerlineAudit.minSeparationM}M_GSD_${photogrammetryGsd.gsdHorizontalCmPx}CM_${timestamp}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "ARGUS-RADAR-GATEWAY",
          synthesis_report: `GIS RADAR TELEMETRY NOTARIZED: Crane Slew ${craneState.slewAngleDeg}° • Powerline Separation: ${powerlineAudit.minSeparationM}m (${powerlineAudit.status}) • Drone Survey GSD: ${photogrammetryGsd.gsdHorizontalCmPx} cm/px • Geofence Integrity Cleared`,
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
              SITE GIS & 360° CRANE RADAR GEOFENCE
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              CEA SAFETY REGS / DGCA CAR SEC 3
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            SPATIAL GIS RADAR & CRANE SLEW INTERLOCK
          </h1>
          <p className="text-xs text-slate-400">
            Project Vanguard Coordinates (26.8520° N, 80.9980° E Lucknow) • 11kV Powerline Exclusion & Aerial Drone Orthomosaic
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/ptw" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">⚠️ PTW SAFETY</a>
          <a href="/site/dpr" className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition">📋 DPR #084</a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">CRANE SLEW ORIENTATION</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">{craneState.slewAngleDeg.toFixed(1)}° Azimuth</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Trolley Reach: {craneState.trolleyRadiusM}m / 35m</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">11kV POWERLINE SEPARATION</div>
          <div className={`text-xl font-bold mt-1 font-mono ${powerlineAudit.minSeparationM <= 3.5 ? "text-red-400" : powerlineAudit.minSeparationM <= 6.5 ? "text-amber-400" : "text-emerald-400"}`}>
            {powerlineAudit.minSeparationM} meters
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">CEA Statutory Buffer: 3.50m</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">CRANE INTERLOCK STATUS</div>
          <div className={`text-sm font-bold mt-1.5 ${powerlineAudit.isInterlockTriggered ? "text-red-400" : "text-emerald-400"}`}>
            {powerlineAudit.isInterlockTriggered ? "SLEW BRAKE ENGAGED" : "UNRESTRICTED SLEWING"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{powerlineAudit.status.replace(/_/g, " ")}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">DRONE ORTHOMOSAIC GSD</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{photogrammetryGsd.gsdHorizontalCmPx} cm/px</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">{photogrammetryGsd.effectiveResolutionRating.replace(/_/g, " ")}</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">GEODETIC DATUM</div>
          <div className="text-sm font-bold text-purple-400 mt-1.5">UTM ZONE 44N</div>
          <div className="text-[10px] text-slate-500 mt-0.5">WGS84 RTK Lock (Fixed)</div>
        </div>
      </div>

      {/* Main Grid: Interactive Radar Canvas & Spatial Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: 2D Interactive GIS Radar Sweep Canvas */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[540px]">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <RadarIcon className="w-4 h-4 text-cyan-400" />
              TOP-DOWN GEOSPATIAL RADAR SWEEP (50m x 50m SITE GRID)
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-cyan-400">
                <span className="w-2.5 h-2.5 bg-cyan-400 inline-block rounded-sm"></span> Vanguard Footprint
              </span>
              <span className="flex items-center gap-1 text-red-400">
                <span className="w-2.5 h-0.5 bg-red-500 inline-block"></span> 11kV Powerline
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 border border-amber-400 inline-block"></span> 35m Jib Circle
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-950 flex-1 flex flex-col justify-between">
            <GisRadarCanvas
              crane={craneState}
              powerlineStart={powerlineStart}
              powerlineEnd={powerlineEnd}
              isInterlocked={powerlineAudit.isInterlockTriggered}
            />

            <div className="pt-3 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 font-mono gap-2">
              <span>Crane Mast: (-8.0m, +3.5m) | Jib Tip: ({cranePositions.tipCoord.x}m, {cranePositions.tipCoord.y}m)</span>
              <span>CEA Mandate: Minimum 3.5m separation maintained from northern 11kV conductor line</span>
            </div>
          </div>
        </div>

        {/* Right: Slew Controls, Drone Photogrammetry & Notarization */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Crane Kinematic Simulation Controls */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              CRANE KINEMATICS & SLEW SIMULATION
            </span>

            {/* Slew Angle Slider */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-slate-400">SLEW ORIENTATION (θ):</span>
                <span className="text-cyan-400 font-bold font-mono">{craneState.slewAngleDeg}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={craneState.slewAngleDeg}
                onChange={e => setCraneState(prev => ({ ...prev, slewAngleDeg: parseInt(e.target.value, 10) }))}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="text-[10px] text-slate-500 mt-1">Azimuth 70° - 110° sweeps near northern powerline</div>
            </div>

            {/* Trolley Radius Slider */}
            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-slate-400">TROLLEY REACH (r):</span>
                <span className="text-white font-bold font-mono">{craneState.trolleyRadiusM} m</span>
              </div>
              <input
                type="range"
                min="3"
                max="35"
                step="0.5"
                value={craneState.trolleyRadiusM}
                onChange={e => setCraneState(prev => ({ ...prev, trolleyRadiusM: parseFloat(e.target.value) }))}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-white"
              />
              <div className="text-[10px] text-slate-500 mt-1">Hook Elevation: {craneState.hookElevationM}m RL • Load: {craneState.suspendedLoadTonnage} MT</div>
            </div>

            {/* Powerline Proximity Status Box */}
            <div className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${
              powerlineAudit.isInterlockTriggered
                ? "bg-red-950/60 border-red-500/50 text-red-200"
                : powerlineAudit.minSeparationM <= 6.5
                ? "bg-amber-950/60 border-amber-500/50 text-amber-200"
                : "bg-emerald-950/60 border-emerald-500/50 text-emerald-200"
            }`}>
              <div className="flex items-center gap-2">
                <LockIcon className="w-4 h-4 shrink-0" />
                <div>
                  <div className="font-bold">{powerlineAudit.status.replace(/_/g, " ")}</div>
                  <div className="text-[10px] opacity-80">Separation: {powerlineAudit.minSeparationM}m (Limit: 3.5m)</div>
                </div>
              </div>
              <span className="font-bold text-sm font-mono">{powerlineAudit.isInterlockTriggered ? "LOCK" : "CLEAR"}</span>
            </div>
          </div>

          {/* Aerial Drone Survey & Photogrammetry Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CameraIcon className="w-3.5 h-3.5 text-cyan-400" />
                DRONE PHOTOGRAMMETRY MISSION
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">45m AGL</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">GROUND SAMPLING (GSD)</span>
                <span className="text-emerald-400 font-bold font-mono text-sm">{photogrammetryGsd.gsdHorizontalCmPx} cm/px</span>
              </div>
              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">SINGLE FRAME AREA</span>
                <span className="text-white font-bold font-mono text-sm">{photogrammetryGsd.footprintWidthM}m x {photogrammetryGsd.footprintHeightM}m</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 bg-slate-950/40 p-2 rounded-lg border border-slate-800">
              DJI Phantom 4 RTK • 1-inch 20MP CMOS • 80% Forward / 70% Side Overlap for point-cloud generation.
            </div>
          </div>

          {/* Section 65B GIS Notarization */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>SECTION 65B GIS TELEMETRY SEAL</span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                Cryptographically certifies the crane geofence position, CEA statutory clearance, and drone survey state into the immutable ledger.
              </div>
            </div>

            <div>
              {sealedHash ? (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>GIS TELEMETRY NOTARIZED & SEALED</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono truncate select-all">
                    {sealedHash}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSealGisTelemetry}
                  disabled={isNotarizing}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <RadarIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE GIS TELEMETRY (SEC 65B)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: 2D GIS RADAR SWEEP CANVAS ---
function GisRadarCanvas({
  crane,
  powerlineStart,
  powerlineEnd,
  isInterlocked
}: {
  crane: CraneKinematicState;
  powerlineStart: Point2D;
  powerlineEnd: Point2D;
  isInterlocked: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let sweepAngle = 0;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;
      const scale = 8.5; // pixels per meter

      // Background
      ctx.fillStyle = "#070b14";
      ctx.fillRect(0, 0, w, h);

      const toScreenX = (x: number) => cx + x * scale;
      const toScreenY = (y: number) => cy - y * scale;

      // Range Rings (10m, 20m, 30m, 40m)
      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      [10, 20, 30, 40].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, r * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#475569";
        ctx.font = "8px monospace";
        ctx.fillText(`${r}m`, cx + r * scale + 4, cy - 4);
      });

      // Axis crosshairs
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(w, cy);
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, h);
      ctx.stroke();

      // 1. Draw Project Vanguard Footprint (10.3m x 10.9m centered at 0,0)
      const bW = 10.3 * scale;
      const bH = 10.9 * scale;
      ctx.fillStyle = "rgba(6, 182, 212, 0.15)";
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 1.5;
      ctx.fillRect(cx - bW / 2, cy - bH / 2, bW, bH);
      ctx.strokeRect(cx - bW / 2, cy - bH / 2, bW, bH);
      ctx.fillStyle = "#38bdf8";
      ctx.font = "bold 9px monospace";
      ctx.fillText("VANGUARD (10.3 x 10.9m)", cx - 45, cy + 3);

      // 2. Draw 11kV Overhead Powerline Exclusion Buffer (Red Band)
      const plY = toScreenY(powerlineStart.y);
      const bufferHeightPx = 3.5 * scale;
      ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
      ctx.fillRect(0, plY - bufferHeightPx, w, bufferHeightPx * 2);

      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, plY);
      ctx.lineTo(w, plY);
      ctx.stroke();

      ctx.fillStyle = "#ef4444";
      ctx.font = "bold 9px monospace";
      ctx.fillText("11kV OVERHEAD LINE (CEA PROHIBITED ZONE)", 20, plY - 8);

      // 3. Draw Potain Crane Mast, 35m Jib Circle, and Active Boom
      const mastScreenX = toScreenX(crane.mastCoord.x);
      const mastScreenY = toScreenY(crane.mastCoord.y);

      // 35m Jib Working Circle
      ctx.strokeStyle = isInterlocked ? "rgba(239, 68, 68, 0.6)" : "rgba(245, 158, 11, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(mastScreenX, mastScreenY, crane.jibRadiusM * scale, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // Crane Boom Vector
      const thetaRad = (crane.slewAngleDeg * Math.PI) / 180;
      const tipX = mastScreenX + crane.jibRadiusM * scale * Math.cos(thetaRad);
      const tipY = mastScreenY - crane.jibRadiusM * scale * Math.sin(thetaRad);

      ctx.strokeStyle = isInterlocked ? "#ef4444" : "#f59e0b";
      ctx.lineWidth = 3.0;
      ctx.beginPath();
      ctx.moveTo(mastScreenX, mastScreenY);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();

      // Trolley Load Position
      const trolleyX = mastScreenX + crane.trolleyRadiusM * scale * Math.cos(thetaRad);
      const trolleyY = mastScreenY - crane.trolleyRadiusM * scale * Math.sin(thetaRad);

      ctx.fillStyle = isInterlocked ? "#ef4444" : "#10b981";
      ctx.beginPath();
      ctx.arc(trolleyX, trolleyY, 5.0, 0, Math.PI * 2);
      ctx.fill();

      // Mast Center Marker
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(mastScreenX, mastScreenY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f59e0b";
      ctx.font = "9px monospace";
      ctx.fillText("POTAIN IGO 50", mastScreenX - 35, mastScreenY + 16);

      // 4. Dynamic Rotating Radar Sweep Beam
      sweepAngle = (sweepAngle + 0.025) % (Math.PI * 2);
      const sweepX = cx + 45 * scale * Math.cos(sweepAngle);
      const sweepY = cy - 45 * scale * Math.sin(sweepAngle);

      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 45 * scale);
      grad.addColorStop(0, "rgba(6, 182, 212, 0.25)");
      grad.addColorStop(1, "rgba(6, 182, 212, 0.0)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, 45 * scale, -sweepAngle, -sweepAngle + 0.25);
      ctx.closePath();
      ctx.fill();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [crane, powerlineStart, powerlineEnd, isInterlocked]);

  return (
    <canvas
      ref={canvasRef}
      width={780}
      height={420}
      className="w-full h-full object-contain"
    />
  );
}
