#!/usr/bin/env bash
set -euo pipefail

cat << 'PAGE_EOF' > app/site/gis/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- INLINE SVG ICONS ---
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const RadarIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="12" cy="12" r="9" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 019 9M12 12l6.36-6.36M12 12v-4" />
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

export default function VanguardSiteGisRadarPage() {
  // Telemetry tailored to a Potain IGO 50 Self-Erecting Crane for a 15m building
  const [craneData, setCraneData] = useState({
    azimuthDeg: 45.0,
    trolleyRadiusM: 18.5,
    hookHeightM: 21.0, // Safely above the 15m roof
    payloadTons: 1.25,
    loadMomentPct: 42.4,
    windSpeedMs: 3.2,
    isInterlocked: false
  });

  const [activeGeofences, setActiveGeofences] = useState({
    powerLines: true,
    publicRoadway: true,
    zoneD_Roof: true
  });

  const [radarSweepDeg, setRadarSweepDeg] = useState(0);
  const [recentEvents, setRecentEvents] = useState<Array<{ id: string; text: string; hash: string; time: string; type: "NOMINAL" | "BREACH" }>>([
    {
      id: "ev-01",
      text: "Potain IGO 50 Telemetry Online • Footprint locked to 10.3m x 10.9m",
      hash: "8602a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4",
      time: "08:15:12",
      type: "NOMINAL"
    }
  ]);

  // Dynamic crane telemetry oscillation
  useEffect(() => {
    const interval = setInterval(() => {
      setCraneData(prev => {
        if (prev.isInterlocked) return prev;
        const nextAzimuth = (prev.azimuthDeg + 0.8) % 360;
        const nextWind = Math.max(1.5, Math.min(8.5, +(prev.windSpeedMs + (Math.random() - 0.5) * 0.4).toFixed(1)));
        const nextLoadPct = Math.min(85, Math.max(20, +(42 + Math.sin(nextAzimuth * 0.05) * 10).toFixed(1)));
        return {
          ...prev,
          azimuthDeg: +nextAzimuth.toFixed(1),
          windSpeedMs: nextWind,
          loadMomentPct: nextLoadPct
        };
      });
      setRadarSweepDeg(prev => (prev + 4) % 360);
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleSimulateGeofenceBreach = async () => {
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_CRANE_BREACH_POWER_LINES_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setCraneData(prev => ({
      ...prev,
      isInterlocked: true,
      azimuthDeg: 345.0, // Aim directly at power line geofence
      loadMomentPct: 78.4
    }));

    const newEvent = {
      id: Math.random().toString(36).substring(2, 9),
      text: "CRITICAL: Potain jib intersected 11kV Power Line buffer • Hoist Interlock Tripped",
      hash,
      time: timestamp,
      type: "BREACH" as const
    };

    setRecentEvents(prev => [newEvent, ...prev.slice(0, 4)]);

    try {
      await supabase.from("section_65b_audit_ledger").insert({
        project_id: "VANGUARD-COMMERCIAL-HUB",
        primary_governor: "ARGUS",
        synthesis_report: newEvent.text,
        merkle_root_hash: hash
      });
    } catch (e) {}
  };

  const handleResetInterlock = () => {
    setCraneData(prev => ({ ...prev, isInterlocked: false, azimuthDeg: 45.0 }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-6 font-mono">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              PROJECT VANGUARD
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              ARGUS CV SENSORS ONLINE
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            SITE GIS & CRANE AIRSPACE RADAR
          </h1>
          <p className="text-xs text-slate-400">
            Commercial Hub Phase 1 • Verified Footprint: 10.3m (W) x 10.9m (D) x 15.0m (H)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive 2D GIS & Polar Crane Radar Canvas */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <RadarIcon className="w-4 h-4 text-cyan-400 animate-spin" />
              <span className="font-bold text-white uppercase tracking-wider">
                AIRSPACE POLAR RADAR • POTAIN IGO 50 (40M JIB)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 text-[10px] rounded font-bold ${craneData.isInterlocked ? "bg-red-950 text-red-400 border border-red-500/50 animate-pulse" : "bg-emerald-950 text-emerald-400 border border-emerald-500/40"}`}>
                {craneData.isInterlocked ? "HOIST INTERLOCKED" : "SLEW PERMITTED"}
              </span>
              <span className="text-slate-500 text-[10px]">FREQ: 2.4 GHz RF</span>
            </div>
          </div>

          <div className="relative bg-slate-950 flex-1 min-h-[440px] flex items-center justify-center p-4 overflow-hidden">
            <VanguardGisRadarCanvas crane={craneData} sweepDeg={radarSweepDeg} geofences={activeGeofences} />

            {/* In-Canvas Geofence Toggles */}
            <div className="absolute top-4 left-4 bg-slate-900/90 border border-slate-800 p-3 rounded-xl backdrop-blur-md flex flex-col gap-2 text-[10px]">
              <span className="text-slate-400 font-bold uppercase tracking-wider mb-0.5">ACTIVE GEOFENCE ZONES</span>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={activeGeofences.powerLines}
                  onChange={e => setActiveGeofences(prev => ({ ...prev, powerLines: e.target.checked }))}
                  className="rounded border-slate-700 accent-red-500"
                />
                <span>Zone 1: 11kV Urban Power Lines</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={activeGeofences.publicRoadway}
                  onChange={e => setActiveGeofences(prev => ({ ...prev, publicRoadway: e.target.checked }))}
                  className="rounded border-slate-700 accent-amber-500"
                />
                <span>Zone 2: Pedestrian Sidewalk Buffer</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={activeGeofences.zoneD_Roof}
                  onChange={e => setActiveGeofences(prev => ({ ...prev, zoneD_Roof: e.target.checked }))}
                  className="rounded border-slate-700 accent-emerald-500"
                />
                <span>Zone 3: 15m Roof Plant Area</span>
              </label>
            </div>

            <div className="absolute bottom-4 right-4 flex gap-2">
              {craneData.isInterlocked ? (
                <button onClick={handleResetInterlock} className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg transition flex items-center gap-1.5">
                  <RefreshIcon className="w-3.5 h-3.5" />
                  <span>RESET CRANE INTERLOCK</span>
                </button>
              ) : (
                <button onClick={handleSimulateGeofenceBreach} className="px-3 py-1.5 bg-red-950 hover:bg-red-900 border border-red-500/50 text-red-300 font-bold text-xs rounded-lg transition flex items-center gap-1.5">
                  <AlertTriangleIcon className="w-3.5 h-3.5 text-red-400" />
                  <span>SIMULATE POWER LINE BREACH</span>
                </button>
              )}
            </div>
          </div>

          {/* Bottom Telemetry Bar */}
          <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 grid grid-cols-2 md:grid-cols-6 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-slate-500">SLEW AZIMUTH</div>
              <div className="text-cyan-400 font-bold text-sm">{craneData.azimuthDeg}°</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">TROLLEY RADIUS</div>
              <div className="text-white font-bold text-sm">{craneData.trolleyRadiusM} m</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">HOOK HEIGHT</div>
              <div className="text-white font-bold text-sm">{craneData.hookHeightM} m</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">ACTIVE PAYLOAD</div>
              <div className="text-amber-400 font-bold text-sm">{craneData.payloadTons} T</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">LOAD MOMENT</div>
              <div className={`font-bold text-sm ${craneData.loadMomentPct > 80 ? "text-red-400" : "text-emerald-400"}`}>
                {craneData.loadMomentPct}%
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500">WIND (ANEMOMETER)</div>
              <div className="text-cyan-400 font-bold text-sm">{craneData.windSpeedMs} m/s</div>
            </div>
          </div>
        </div>

        {/* Right: Site Spatial Specifications & Section 65B Telemetry Audit */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">
              VANGUARD CALIBRATED METRICS
            </span>
            <div className="flex flex-col gap-2 text-xs">
              <div className="flex justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">Dimensions:</span>
                <span className="text-white">10.3m (W) x 10.9m (D)</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">Peak Elevation:</span>
                <span className="text-white">15.0m (Zone D)</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">Footprint Area:</span>
                <span className="text-white">112.27 m²</span>
              </div>
              <div className="flex justify-between pb-1.5 border-b border-slate-800">
                <span className="text-slate-400">Crane Model:</span>
                <span className="text-white">Potain IGO 50 (Self-Erecting)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Max Jib Reach:</span>
                <span className="text-cyan-400 font-bold">40.0 m (R=40m)</span>
              </div>
            </div>
          </div>

          {/* Section 65B Crane Geofence Audit Stream */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheckIcon className="w-3.5 h-3.5" />
                SEC 65B TELEMETRY LEDGER
              </span>
              <span className="text-[10px] text-slate-500">TAMPER PROOF</span>
            </div>

            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[300px]">
              {recentEvents.map(ev => (
                <div
                  key={ev.id}
                  className={`p-2.5 rounded-xl border text-xs flex flex-col gap-1 transition-all ${
                    ev.type === "BREACH"
                      ? "bg-red-950/40 border-red-500/50 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.15)]"
                      : "bg-slate-950/60 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className={`font-bold ${ev.type === "BREACH" ? "text-red-400" : "text-emerald-400"}`}>
                      {ev.type === "BREACH" ? "GEOFENCE VIOLATION" : "TELEMETRY TICK"}
                    </span>
                    <span className="text-slate-500">{ev.time}</span>
                  </div>
                  <div className="text-[11px] leading-relaxed">{ev.text}</div>
                  <div className="text-[9px] text-slate-500 truncate pt-1 border-t border-slate-800/80">
                    Proof: <span className="text-purple-400">{ev.hash}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: CANVAS POLAR RADAR & VANGUARD MAP ---
function VanguardGisRadarCanvas({
  crane,
  sweepDeg,
  geofences
}: {
  crane: { azimuthDeg: number; trolleyRadiusM: number; hookHeightM: number; isInterlocked: boolean };
  sweepDeg: number;
  geofences: { powerLines: boolean; publicRoadway: boolean; zoneD_Roof: boolean };
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const cX = w * 0.45;
    const cY = h * 0.55;
    
    // Scale: 40m max radius fits in view (1m = ~5 pixels)
    const pxPerMeter = (Math.min(w, h) * 0.4) / 40; 
    const maxRadiusPx = 40 * pxPerMeter;

    // Dark canvas background
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, w, h);

    // 1. Concentric Polar Distance Rings (10m, 20m, 30m, 40m)
    const ringDistances = [10, 20, 30, 40];
    ringDistances.forEach(dist => {
      const r = dist * pxPerMeter;
      ctx.strokeStyle = "rgba(30, 41, 59, 0.7)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cX, cY, r, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(100, 116, 139, 0.6)";
      ctx.font = "9px monospace";
      ctx.fillText(`${dist}m`, cX + r - 16, cY - 4);
    });

    // 2. Crosshair coordinate axes
    ctx.strokeStyle = "rgba(30, 41, 59, 0.8)";
    ctx.beginPath();
    ctx.moveTo(cX - maxRadiusPx - 20, cY);
    ctx.lineTo(cX + maxRadiusPx + 20, cY);
    ctx.moveTo(cX, cY - maxRadiusPx - 20);
    ctx.lineTo(cX, cY + maxRadiusPx + 20);
    ctx.stroke();

    // 3. VANGUARD FOOTPRINT (10.3m x 10.9m)
    // Placed slightly offset from the crane mast (which is at cX, cY)
    const bldgWidthPx = 10.3 * pxPerMeter;
    const bldgDepthPx = 10.9 * pxPerMeter;
    const bldgX = cX + (5 * pxPerMeter); // Building starts 5m to the right of crane
    const bldgY = cY - (bldgDepthPx / 2); // Centered vertically relative to crane

    ctx.fillStyle = "rgba(6, 182, 212, 0.15)";
    ctx.strokeStyle = "rgba(6, 182, 212, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bldgX, bldgY, bldgWidthPx, bldgDepthPx);
    ctx.fillRect(bldgX, bldgY, bldgWidthPx, bldgDepthPx);
    
    ctx.fillStyle = "#06b6d4";
    ctx.font = "8px monospace";
    ctx.fillText("VANGUARD 10.3x10.9", bldgX + 5, bldgY - 5);

    // GEOFENCE: 11kV Power Lines (Top Left)
    if (geofences.powerLines) {
      ctx.fillStyle = crane.isInterlocked ? "rgba(239, 68, 68, 0.35)" : "rgba(239, 68, 68, 0.15)";
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      // Draw a line representing power lines
      ctx.moveTo(cX - (30 * pxPerMeter), cY - (40 * pxPerMeter));
      ctx.lineTo(cX + (10 * pxPerMeter), cY - (40 * pxPerMeter));
      // Draw a buffer zone
      ctx.rect(cX - (35 * pxPerMeter), cY - (45 * pxPerMeter), 50 * pxPerMeter, 10 * pxPerMeter);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = "#ef4444";
      ctx.fillText("ZONE 1: 11kV POWER LINES", cX - (30 * pxPerMeter), cY - (30 * pxPerMeter));
    }

    // GEOFENCE: Public Roadway Buffer (Bottom)
    if (geofences.publicRoadway) {
      ctx.fillStyle = "rgba(245, 158, 11, 0.15)";
      ctx.strokeStyle = "#f59e0b";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(cX - (20 * pxPerMeter), cY + (25 * pxPerMeter), 60 * pxPerMeter, 15 * pxPerMeter);
      ctx.fillRect(cX - (20 * pxPerMeter), cY + (25 * pxPerMeter), 60 * pxPerMeter, 15 * pxPerMeter);
      ctx.setLineDash([]);
      ctx.fillStyle = "#f59e0b";
      ctx.fillText("ZONE 2: ROADWAY BUFFER", cX - (15 * pxPerMeter), cY + (32 * pxPerMeter));
    }

    // 4. Radar Sweep Line & Phosphor Glow
    const sweepRad = (sweepDeg * Math.PI) / 180;
    const sweepGrad = ctx.createRadialGradient(cX, cY, 0, cX, cY, maxRadiusPx);
    sweepGrad.addColorStop(0, "rgba(6, 182, 212, 0.35)");
    sweepGrad.addColorStop(1, "rgba(6, 182, 212, 0.0)");

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cX, cY);
    ctx.arc(cX, cY, maxRadiusPx, sweepRad - 0.35, sweepRad);
    ctx.closePath();
    ctx.fillStyle = sweepGrad;
    ctx.fill();

    ctx.strokeStyle = "rgba(6, 182, 212, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cX, cY);
    ctx.lineTo(cX + Math.cos(sweepRad) * maxRadiusPx, cY + Math.sin(sweepRad) * maxRadiusPx);
    ctx.stroke();
    ctx.restore();

    // 5. Active Crane Jib Arm & Hook Indicator
    const craneRad = (crane.azimuthDeg * Math.PI) / 180;
    const jibLengthPx = maxRadiusPx;
    const trolleyDistPx = crane.trolleyRadiusM * pxPerMeter;

    // Crane Mast Center
    ctx.fillStyle = "#facc15";
    ctx.beginPath();
    ctx.arc(cX, cY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Jib Arm Line
    ctx.strokeStyle = crane.isInterlocked ? "#ef4444" : "#facc15";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cX, cY);
    const jibEndX = cX + Math.cos(craneRad) * jibLengthPx;
    const jibEndY = cY + Math.sin(craneRad) * jibLengthPx;
    ctx.lineTo(jibEndX, jibEndY);
    ctx.stroke();

    // Trolley & Suspended Hook Point
    const hookX = cX + Math.cos(craneRad) * trolleyDistPx;
    const hookY = cY + Math.sin(craneRad) * trolleyDistPx;

    ctx.fillStyle = crane.isInterlocked ? "#ef4444" : "#38bdf8";
    ctx.beginPath();
    ctx.arc(hookX, hookY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Hook Target Ring
    ctx.strokeStyle = crane.isInterlocked ? "rgba(239, 68, 68, 0.8)" : "rgba(56, 189, 248, 0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(hookX, hookY, 10, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.font = "8px monospace";
    ctx.fillText(`HOOK [R=${crane.trolleyRadiusM}m]`, hookX + 10, hookY - 4);
  }, [crane, sweepDeg, geofences]);

  return (
    <canvas
      ref={canvasRef}
      width={780}
      height={440}
      className="w-full h-full object-contain"
    />
  );
}
PAGE_EOF

echo "============================================================"
echo "✓ Site GIS & Crane Radar aligned to 10.3 x 10.9 x 15m Project Vanguard!"
echo "============================================================"
