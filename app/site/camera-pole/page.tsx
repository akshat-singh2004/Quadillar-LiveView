"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  computeSolarBatteryBalance,
  evaluatePoleTamperState,
  CameraPoleTelemetryState
} from "@/lib/calculations/liveViewEngine";

// --- INLINE SVG ICONS ---
const VideoIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polygon points="23 7 16 12 23 17 23 7" />
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
  </svg>
);
const SunIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </svg>
);
const BatteryChargingIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M5 18H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.19M15 6h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3.19" />
    <line x1="23" y1="13" x2="23" y2="11" />
    <polyline points="11 6 7 12 13 12 9 18" />
  </svg>
);
const WifiIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" y1="20" x2="12.01" y2="20" />
  </svg>
);
const ShieldAlertIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
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

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function LiveViewTelemetryPage() {
  const [selectedPoleId, setSelectedPoleId] = useState<string>("POLE-VGD-01");

  // Dynamic Simulation Sliders
  const [solarIrradiance, setSolarIrradiance] = useState<number>(680); // W/m2 (Sunlight)
  const [simulatedTiltDeg, setSimulatedTiltDeg] = useState<number>(0.6); // 0.6 deg (Vertical)
  const [cabinetDoorOpen, setCabinetDoorOpen] = useState<boolean>(false);
  const [isNotarizing, setIsNotarizing] = useState<boolean>(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  // Deployed Protective Camera Poles across Project Vanguard (No Site Wi-Fi needed)
  const [polesList] = useState<CameraPoleTelemetryState[]>([
    {
      poleId: "POLE-VGD-01",
      poleLabel: "POLE #01: NORTH GATE & WEIGHBRIDGE",
      locationDescription: "Main Site Entry / ANPR / Material Inward Zone",
      gpsCoordinates: { lat: 26.8522, lng: 80.9978 },
      powerSystem: {
        batteryVoltageV: 25.8,
        batteryStateOfChargePct: 88,
        solarIrradianceWm2: 680,
        solarPowerGeneratedWatts: 86.2,
        systemPowerLoadWatts: 28.5,
        netCurrentAmps: 2.25,
        batteryAutonomyHoursRemaining: 67.2
      },
      cellularUplink: {
        networkBearer: "5G_SA",
        carrier: "Jio Commercial",
        signalStrengthRssiDbm: -68, // Strong 5G signal
        bandwidthMbps: 42.5,
        dataThrottlingActive: false
      },
      physicalSecurity: {
        memsTiltAngleDeg: 0.6,
        isTamperAlertTriggered: false,
        enclosureDoorLocked: true,
        internalCabinetTempC: 31.4
      },
      edgeInference: {
        fps: 5.2,
        workersDetected: 6,
        ppeHardhatViolations: 0,
        ppeVestViolations: 0,
        exclusionZoneBreaches: 0,
        anprPlateLastRead: "UP 32 HN 4920 (UltraTech Mixer)"
      }
    },
    {
      poleId: "POLE-VGD-02",
      poleLabel: "POLE #02: SOUTH CORE & TOWER CRANE",
      locationDescription: "Podium Footprint & Steel Yard Staging Area",
      gpsCoordinates: { lat: 26.8518, lng: 80.9982 },
      powerSystem: {
        batteryVoltageV: 25.4,
        batteryStateOfChargePct: 81,
        solarIrradianceWm2: 680,
        solarPowerGeneratedWatts: 86.2,
        systemPowerLoadWatts: 29.2,
        netCurrentAmps: 2.22,
        batteryAutonomyHoursRemaining: 61.8
      },
      cellularUplink: {
        networkBearer: "5G_SA",
        carrier: "Airtel Enterprise",
        signalStrengthRssiDbm: -72,
        bandwidthMbps: 38.0,
        dataThrottlingActive: false
      },
      physicalSecurity: {
        memsTiltAngleDeg: 0.8,
        isTamperAlertTriggered: false,
        enclosureDoorLocked: true,
        internalCabinetTempC: 32.8
      },
      edgeInference: {
        fps: 5.0,
        workersDetected: 14,
        ppeHardhatViolations: 1, // Alert
        ppeVestViolations: 0,
        exclusionZoneBreaches: 0,
        anprPlateLastRead: "UP 32 EQ 8812 (Tata Steel Truck)"
      }
    },
    {
      poleId: "POLE-VGD-03",
      poleLabel: "POLE #03: ROOFTOP 15M ELEVATION",
      locationDescription: "Rooftop Mechanical Deck / 11kV Conductor Perimeter",
      gpsCoordinates: { lat: 26.8521, lng: 80.9984 },
      powerSystem: {
        batteryVoltageV: 25.9,
        batteryStateOfChargePct: 92,
        solarIrradianceWm2: 740,
        solarPowerGeneratedWatts: 93.8,
        systemPowerLoadWatts: 27.8,
        netCurrentAmps: 2.58,
        batteryAutonomyHoursRemaining: 71.0
      },
      cellularUplink: {
        networkBearer: "5G_SA",
        carrier: "Jio Commercial",
        signalStrengthRssiDbm: -62,
        bandwidthMbps: 48.0,
        dataThrottlingActive: false
      },
      physicalSecurity: {
        memsTiltAngleDeg: 0.5,
        isTamperAlertTriggered: false,
        enclosureDoorLocked: true,
        internalCabinetTempC: 29.6
      },
      edgeInference: {
        fps: 5.1,
        workersDetected: 4,
        ppeHardhatViolations: 0,
        ppeVestViolations: 0,
        exclusionZoneBreaches: 0,
        anprPlateLastRead: "N/A (Rooftop View)"
      }
    }
  ]);

  const activePole = useMemo(() => {
    return polesList.find(p => p.poleId === selectedPoleId) || polesList[0];
  }, [polesList, selectedPoleId]);

  // Compute live energy balance and tamper physics
  const energyBalance = useMemo(() => {
    return computeSolarBatteryBalance(solarIrradiance, 28.5, activePole.powerSystem.batteryStateOfChargePct);
  }, [solarIrradiance, activePole]);

  const tamperAudit = useMemo(() => {
    // Convert simulated angle to Z component: az = g * cos(theta)
    const rad = (simulatedTiltDeg * Math.PI) / 180.0;
    const ax = 9.81 * Math.sin(rad);
    const az = 9.81 * Math.cos(rad);
    return evaluatePoleTamperState(ax, 0, az, cabinetDoorOpen);
  }, [simulatedTiltDeg, cabinetDoorOpen]);

  const handleSealLiveViewTelemetry = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_LIVEVIEW_${activePole.poleId}_SOLAR_${energyBalance.solarPowerWatts}W_BATT_${energyBalance.updatedBatteryPct}%_TILT_${tamperAudit.tiltAngleDeg}DEG_AI_WORKERS_${activePole.edgeInference.workersDetected}_PLATE_${activePole.edgeInference.anprPlateLastRead}_${timestamp}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "ARGUS-LIVEVIEW-AI",
          synthesis_report: `LIVEVIEW POLE NOTARIZED: Station ${activePole.poleId} • 5G Uplink: ${activePole.cellularUplink.signalStrengthRssiDbm} dBm • Solar: ${energyBalance.solarPowerWatts}W • Battery: ${energyBalance.updatedBatteryPct}% • Tamper Tilt: ${tamperAudit.tiltAngleDeg}° (${tamperAudit.isTamperTriggered ? "TAMPER ALERT" : "OK"}) • AI Detections: ${activePole.edgeInference.workersDetected} Workers (Hardhat Violations: ${activePole.edgeInference.ppeHardhatViolations}) • ANPR: ${activePole.edgeInference.anprPlateLastRead}`,
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
              QUADILLAR LIVEVIEW™ ENTERPRISE
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              OFF-GRID 5G EDGE CAMERA POLES
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            SITE TELEMETRY, SOLAR HARDWARE & AI SURVEILLANCE
          </h1>
          <p className="text-xs text-slate-400">
            Project Vanguard (10.3m x 10.9m x 15m) • Zero-Wi-Fi Architecture • Autonomous 5G Cellular & Anti-Theft Gyro Poles
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/weighbridge" className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs rounded-lg transition">⚖️ WEIGHBRIDGE</a>
          <a href="/site/gis" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">📡 GIS RADAR</a>
        </div>
      </div>

      {/* Primary Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <SunIcon className="w-3.5 h-3.5 text-amber-400" />
            SOLAR GENERATION
          </div>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
            {energyBalance.solarPowerWatts} W
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Irradiance: {solarIrradiance} W/m² (120W Panel)
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <BatteryChargingIcon className="w-3.5 h-3.5 text-emerald-400" />
            24V LiFePO4 BATTERY
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
            {energyBalance.updatedBatteryPct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Autonomy: {energyBalance.batteryAutonomyHours}h Remaining
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <WifiIcon className="w-3.5 h-3.5 text-cyan-400" />
            5G CELLULAR BEARER
          </div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
            {activePole.cellularUplink.signalStrengthRssiDbm} dBm
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {activePole.cellularUplink.carrier} (No Wi-Fi Needed)
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <ShieldAlertIcon className="w-3.5 h-3.5 text-purple-400" />
            ANTI-THEFT TILT GYRO
          </div>
          <div className={`text-xl font-bold mt-1 font-mono ${tamperAudit.isTamperTriggered ? "text-red-400 animate-pulse" : "text-white"}`}>
            {tamperAudit.tiltAngleDeg}°
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {tamperAudit.isTamperTriggered ? "TAMPER ALARM" : "Vertical Alignment OK"}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">ON-DEVICE EDGE AI</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">
            {activePole.edgeInference.workersDetected} Workers
          </div>
          <div className={`text-[10px] mt-0.5 font-bold ${
            activePole.edgeInference.ppeHardhatViolations > 0 ? "text-amber-400" : "text-emerald-400"
          }`}>
            {activePole.edgeInference.ppeHardhatViolations > 0 ? "1 PPE Hardhat Warning" : "100% PPE Compliant"}
          </div>
        </div>
      </div>

      {/* Main Grid: Live Camera Stream with Edge AI Bounding Boxes & Hardware Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Simulated Real-Time Camera Stream Canvas */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[520px]">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <VideoIcon className="w-4 h-4 text-cyan-400" />
              LIVE EDGE OPTICAL FEED: {activePole.poleLabel}
            </span>
            <div className="flex items-center gap-2 text-[10px] font-mono">
              <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping"></span>
                <span>REC • 5.1 FPS EDGE NPU</span>
              </span>
              <span className="text-slate-400">{activePole.cellularUplink.networkBearer}</span>
            </div>
          </div>

          <div className="p-4 bg-slate-950 flex-1 flex flex-col justify-between">
            <LiveCameraStreamCanvas
              poleId={activePole.poleId}
              isTampered={tamperAudit.isTamperTriggered}
              tiltAngle={tamperAudit.tiltAngleDeg}
              lastPlate={activePole.edgeInference.anprPlateLastRead}
            />

            {/* In-Feed Live Overlay Info */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col md:flex-row justify-between items-center text-[10px] text-slate-400 font-mono gap-2">
              <span>Location: {activePole.locationDescription} (GPS: {activePole.gpsCoordinates.lat}, {activePole.gpsCoordinates.lng})</span>
              <span className="text-cyan-400 font-bold">ANPR Detected: {activePole.edgeInference.anprPlateLastRead}</span>
            </div>
          </div>
        </div>

        {/* Right: Camera Station Switcher & Hardware Anti-Theft Diagnostics */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Station Selector */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              DEPLOYED TELEMETRY POLES
            </span>

            <div className="flex flex-col gap-2">
              {polesList.map(pole => {
                const isSelected = selectedPoleId === pole.poleId;
                return (
                  <button
                    key={pole.poleId}
                    onClick={() => setSelectedPoleId(pole.poleId)}
                    className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                      isSelected
                        ? "bg-cyan-500/20 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.15)]"
                        : "bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white">{pole.poleId}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">5G • {pole.powerSystem.batteryStateOfChargePct}% BATT</span>
                    </div>
                    <div className="text-[10px] text-slate-400 leading-tight">{pole.locationDescription}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hardware Environment & Anti-Theft Diagnostics */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              HARDWARE ANTI-THEFT & SOLAR SIMULATOR
            </span>

            {/* Solar Irradiance Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">SOLAR IRRADIANCE (G):</span>
                <span className="text-amber-400 font-bold font-mono">{solarIrradiance} W/m²</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="20"
                value={solarIrradiance}
                onChange={e => setSolarIrradiance(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-amber-400"
              />
              <div className="text-[10px] text-slate-500 mt-1">Simulates day/night & cloudy conditions (Net: {energyBalance.netCurrentAmps}A)</div>
            </div>

            {/* Gyro Tilt Angle Slider (Anti-Theft) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">POLE DISPLACEMENT TILT (θ):</span>
                <span className={`font-bold font-mono ${tamperAudit.isTamperTriggered ? "text-red-400" : "text-white"}`}>
                  {simulatedTiltDeg.toFixed(1)}°
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="12.0"
                step="0.2"
                value={simulatedTiltDeg}
                onChange={e => setSimulatedTiltDeg(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-400"
              />
              <div className="text-[10px] text-slate-500 mt-1">Tilt &gt; 3.5° triggers siren, cloud lockdown & police dispatch</div>
            </div>

            {/* Cabinet Magnetic Reed Door Switch */}
            <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-300">Cabinet Enclosure Door:</span>
              <button
                onClick={() => setCabinetDoorOpen(prev => !prev)}
                className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition ${
                  cabinetDoorOpen
                    ? "bg-red-950 text-red-400 border border-red-500/40"
                    : "bg-emerald-950 text-emerald-400 border border-emerald-500/40"
                }`}
              >
                {cabinetDoorOpen ? "BREACHED / OPEN" : "SECURELY LOCKED"}
              </button>
            </div>

            <div className={`p-2 rounded-lg border text-[10px] ${
              tamperAudit.isTamperTriggered ? "bg-red-950/60 border-red-500/50 text-red-200" : "bg-slate-950/50 border-slate-800 text-slate-400"
            }`}>
              {tamperAudit.tamperMessage}
            </div>
          </div>

          {/* Section 65B Telemetry Notarization */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>SECTION 65B SURVEILLANCE SNAPSHOT SEAL</span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                Legally seals live edge optical telemetry, ANPR plate records, and tamper gyro state into the sovereign audit ledger.
              </div>
            </div>

            <div>
              {sealedHash ? (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>LIVEVIEW FRAME NOTARIZED & SEALED</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono truncate select-all">
                    {sealedHash}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSealLiveViewTelemetry}
                  disabled={isNotarizing}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <VideoIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE LIVEVIEW SURVEILLANCE FRAME</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: REAL-TIME SIMULATED EDGE AI CAMERA STREAM CANVAS ---
function LiveCameraStreamCanvas({
  poleId,
  isTampered,
  tiltAngle,
  lastPlate
}: {
  poleId: string;
  isTampered: boolean;
  tiltAngle: number;
  lastPlate: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let tick = 0;

    const render = () => {
      tick++;
      const w = canvas.width;
      const h = canvas.height;

      // Dark Industrial Background
      ctx.fillStyle = "#090d16";
      ctx.fillRect(0, 0, w, h);

      // Camera shake / tilt distortion if tampered
      ctx.save();
      if (isTampered) {
        const shakeX = (Math.random() - 0.5) * 6;
        const shakeY = (Math.random() - 0.5) * 6;
        ctx.translate(shakeX, shakeY);
        ctx.rotate((tiltAngle * Math.PI) / 180.0 * 0.1);
      }

      // Construction Site Grid Perspective Simulation
      ctx.strokeStyle = "#172033";
      ctx.lineWidth = 1;
      for (let y = h / 2; y < h; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // 3D Vanguard Building Monolith Wireframe in Scene
      ctx.strokeStyle = "rgba(6, 182, 212, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(w * 0.25, h * 0.2, w * 0.45, h * 0.55);

      // Floor slabs
      ctx.beginPath();
      ctx.moveTo(w * 0.25, h * 0.35);
      ctx.lineTo(w * 0.70, h * 0.35);
      ctx.moveTo(w * 0.25, h * 0.50);
      ctx.lineTo(w * 0.70, h * 0.50);
      ctx.moveTo(w * 0.25, h * 0.65);
      ctx.lineTo(w * 0.70, h * 0.65);
      ctx.stroke();

      // Simulated Workers with On-Device Edge NPU Bounding Boxes
      const workers = [
        { x: w * 0.32, y: h * 0.58, w: 28, h: 64, label: "WORKER #1: HARDHAT OK [0.94]", safe: true },
        { x: w * 0.48, y: h * 0.62, w: 28, h: 64, label: "WORKER #2: HARNESS OK [0.98]", safe: true },
        { x: w * 0.60, y: h * 0.54, w: 26, h: 60, label: poleId === "POLE-VGD-02" ? "ALERT: NO HARDHAT [0.89]" : "WORKER #3: PPE OK [0.95]", safe: poleId !== "POLE-VGD-02" }
      ];

      workers.forEach(wk => {
        // Person stick figure representation
        ctx.fillStyle = "#334155";
        ctx.fillRect(wk.x, wk.y, wk.w, wk.h);

        // Edge AI Bounding Box
        ctx.strokeStyle = wk.safe ? "#10b981" : "#ef4444";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(wk.x - 4, wk.y - 4, wk.w + 8, wk.h + 8);

        // Label Tag
        ctx.fillStyle = wk.safe ? "#10b981" : "#ef4444";
        ctx.font = "bold 9px monospace";
        ctx.fillText(wk.label, wk.x - 8, wk.y - 8);
      });

      // ANPR Vehicle Bounding Box (Transit Mixer / Delivery Truck)
      if (poleId === "POLE-VGD-01") {
        const truckX = w * 0.05;
        const truckY = h * 0.45;
        ctx.strokeStyle = "#06b6d4";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(truckX, truckY, 130, 80);

        ctx.fillStyle = "#06b6d4";
        ctx.font = "bold 9px monospace";
        ctx.fillText("ANPR: " + lastPlate, truckX, truckY - 8);
      }

      ctx.restore();

      // Tamper Alarm Overlay Banner if tilt > 3.5 deg
      if (isTampered) {
        ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = "#ef4444";
        ctx.font = "bold 14px monospace";
        ctx.fillText("⚠ PHYSICAL TAMPER ALERT: POLE DISPLACEMENT DETECTED ⚠", w * 0.15, 30);
      }

      // HUD OSD Timestamp & Watermark
      ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
      ctx.font = "10px monospace";
      const now = new Date();
      ctx.fillText(`${poleId} • 26.8520°N 80.9980°E • LUCKNOW • ${now.toISOString().replace("T", " ").substring(0, 19)} IST`, 15, h - 15);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [poleId, isTampered, tiltAngle, lastPlate]);

  return (
    <canvas
      ref={canvasRef}
      width={780}
      height={380}
      className="w-full h-full object-contain rounded-xl border border-slate-800/80"
    />
  );
}
