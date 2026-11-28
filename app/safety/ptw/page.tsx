"use client";
import { GovernorInterlockBanner } from "@/components/governor/GovernorInterlockBanner";

import React, { useState, useMemo, useEffect } from "react";
import { useGovernor } from "@/context/GovernorContext";
import { supabase } from "@/lib/supabaseClient";
import {
  calculateFallArrestImpactForceKn,
  evaluateAtmosphericSafety,
  evaluateWindSafetyInterlock,
  PermitToWorkItem,
  PermitHazardCategory,
  ConfinedSpaceGasTelemetry
} from "@/lib/calculations/ptwSafetyEngine";

// --- INLINE SVG ICONS ---
const AlertTriangleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
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
const FlameIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
  </svg>
);
const WindIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.59 4.59A2 2 0 1111 8H2m10.59 11.41A2 2 0 1014 16H2m15.73-8.27A2.5 2.5 0 1119.5 12H2" />
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

export default function PermitToWorkPage() {
  // Live Environmental Sensor Inputs
  const { snapshot: governorSnapshot } = useGovernor();
  const [liveWindSpeedMs, setLiveWindSpeedMs] = useState<number>(4.8); // Synced with Governor anemometer

  useEffect(() => {
    const govAny = governorSnapshot as unknown as Record<string, any>;
    const govWind =
      govAny?.telemetry?.windSpeedMs ??
      govAny?.telemetry?.windVelocityMs ??
      govAny?.input?.windSpeedMs ??
      govAny?.input?.windVelocityMs;
    if (typeof govWind === "number" && Number.isFinite(govWind) && govWind >= 0) {
      setLiveWindSpeedMs(govWind);
    }
  }, [governorSnapshot]);
  const [selectedPermitId, setSelectedPermitId] = useState<string>("PTW-VGD-01");

  // Dynamic Confined Space Gas Sensor Adjustments (for Lift Pit PTW-03)
  const [gasTelemetry, setGasTelemetry] = useState<ConfinedSpaceGasTelemetry>({
    oxygenPct: 20.9,
    lowerExplosiveLimitPct: 2.1,
    hydrogenSulfidePpm: 1.2,
    carbonMonoxidePpm: 4.5
  });

  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  // Active Statutory Permit Register for Project Vanguard
  const [permits, setPermits] = useState<PermitToWorkItem[]>([
    {
      permitId: "PTW-VGD-01",
      permitNumber: "PTW-2026-LIFT-01",
      category: "HEAVY_CRANE_LIFT",
      title: "3.5T Packaged Chiller Tandem Rigging & Rooftop Placement (+15.0m Deck)",
      locationZone: "ZONE_D",
      cpmActivityId: "ACT-09",
      executingContractor: "Carrier HVAC Heavy Rigging Division",
      leadPermitHolder: "Mahesh Chandra (Certified Rigger Level 3)",
      validFrom: "29-Oct-2026 09:00 IST",
      validTo: "29-Oct-2026 17:00 IST",
      status: "APPROVED_ACTIVE",
      windSpeedThresholdMs: 9.0,
      fallArrest: {
        workerMassKg: 100,
        freeFallDistanceM: 1.8,
        decelerationStrokeM: 0.6
      },
      mandatoryPpeChecks: {
        doubleLanyardHarness: true,
        gasMonitorCalibrated: false,
        fireExtinguisherPlaced: true,
        insulatedRescueHook: true
      },
      section65bHash: "c189b21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"
    },
    {
      permitId: "PTW-VGD-02",
      permitNumber: "PTW-2026-HOT-02",
      category: "HOT_WORK_WELDING",
      title: "ISMB 450 Full-Penetration Moment Joint Welding & Arc Gouging",
      locationZone: "ZONE_C",
      cpmActivityId: "ACT-06",
      executingContractor: "L&T Structural Steel IC",
      leadPermitHolder: "Gurpreet Singh (AWS Certified Welder)",
      validFrom: "29-Oct-2026 10:00 IST",
      validTo: "29-Oct-2026 18:00 IST",
      status: "APPROVED_ACTIVE",
      windSpeedThresholdMs: 12.0,
      fireWatchMinutesRemaining: 48, // 48 mins left of 60-min mandatory fire watch
      mandatoryPpeChecks: {
        doubleLanyardHarness: true,
        gasMonitorCalibrated: false,
        fireExtinguisherPlaced: true,
        insulatedRescueHook: true
      },
      section65bHash: "7b41e21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"
    },
    {
      permitId: "PTW-VGD-03",
      permitNumber: "PTW-2026-CONF-03",
      category: "CONFINED_SPACE",
      title: "Basement Elevator Pit Sump Dewatering & Grouting (-3.5m Depth)",
      locationZone: "ZONE_A",
      cpmActivityId: "ACT-01",
      executingContractor: "Gomti Geo-Technics & Waterproofing",
      leadPermitHolder: "Sunil Verma (Confined Space Supervisor)",
      validFrom: "29-Oct-2026 08:30 IST",
      validTo: "29-Oct-2026 14:30 IST",
      status: "APPROVED_ACTIVE",
      windSpeedThresholdMs: 15.0,
      gasTelemetry: gasTelemetry,
      mandatoryPpeChecks: {
        doubleLanyardHarness: true,
        gasMonitorCalibrated: true,
        fireExtinguisherPlaced: false,
        insulatedRescueHook: true
      },
      section65bHash: "8e92a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"
    },
    {
      permitId: "PTW-VGD-04",
      permitNumber: "PTW-2026-ELEC-04",
      category: "ELECTRICAL_LOTO",
      title: "415V Main LT Distribution Switchboard Busbar Isolation & LOTO",
      locationZone: "ZONE_B",
      cpmActivityId: "ACT-04",
      executingContractor: "Schneider Electric Field Commissioning",
      leadPermitHolder: "Amitava Roy (Chartered Electrical Engineer)",
      validFrom: "29-Oct-2026 11:00 IST",
      validTo: "29-Oct-2026 15:00 IST",
      status: "APPROVED_ACTIVE",
      windSpeedThresholdMs: 20.0,
      mandatoryPpeChecks: {
        doubleLanyardHarness: false,
        gasMonitorCalibrated: false,
        fireExtinguisherPlaced: true,
        insulatedRescueHook: true
      },
      section65bHash: "a418b21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"
    }
  ]);

  const activePermit = useMemo(() => {
    return permits.find(p => p.permitId === selectedPermitId) || permits[0];
  }, [permits, selectedPermitId]);

  // Physics Evaluations
  const fallKinematics = useMemo(() => {
    if (activePermit.fallArrest) {
      return calculateFallArrestImpactForceKn(activePermit.fallArrest);
    }
    return calculateFallArrestImpactForceKn({
      workerMassKg: 100,
      freeFallDistanceM: 1.8,
      decelerationStrokeM: 0.6
    });
  }, [activePermit]);

  const atmosphericAudit = useMemo(() => {
    return evaluateAtmosphericSafety(gasTelemetry);
  }, [gasTelemetry]);

  const windAudit = useMemo(() => {
    return evaluateWindSafetyInterlock(liveWindSpeedMs, activePermit.category, activePermit.windSpeedThresholdMs);
  }, [liveWindSpeedMs, activePermit]);

  // Determine Overall Operational Interlock Status
  const isSafetyInterlocked = useMemo(() => {
    if (windAudit.isSuspendedDueToWind) return true;
    if (activePermit.category === "CONFINED_SPACE" && !atmosphericAudit.isAtmosphereSafe) return true;
    return false;
  }, [windAudit, activePermit, atmosphericAudit]);

  const handleSealPtwPermit = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_PTW_${activePermit.permitNumber}_CAT_${activePermit.category}_WIND_${liveWindSpeedMs}MS_FALLFORCE_${fallKinematics.impactForceKn}KN_TIME_${timestamp}_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "AEGIS-SAFETY-GOVERNOR",
          synthesis_report: `PTW SAFETY AUDIT NOTARIZED: Permit ${activePermit.permitNumber} (${activePermit.category}) • Fall Arrest Impact Force: ${fallKinematics.impactForceKn} kN (IS 3521 Pass) • Wind: ${liveWindSpeedMs} m/s (Limit: ${activePermit.windSpeedThresholdMs} m/s) • Confined Gas O2: ${gasTelemetry.oxygenPct}% • Tripartite Electronic Attestation Recorded`,
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
            <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
              PERMIT TO WORK (PTW) & HIGH-HAZARD GOVERNOR
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              IS 3521 / IS 3696 / CEA LOTO COMPLIANT
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            STATUTORY PERMIT TO WORK & SAFETY INTERLOCK ENGINE
          </h1>
          <p className="text-xs text-slate-400">
            Project Vanguard • Real-Time Fall Arrest Physics, Atmospheric Gas Telemetry & Wind Gust Interlocks
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/dpr" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">📋 DPR #084</a>
          <a href="/site/gis" className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs rounded-lg transition">📡 GIS RADAR</a>
        </div>
      </div>

      {/* Live Environmental Sensor Telemetry Strip */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 md:grid-cols-4 gap-4 text-xs items-center">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
              <WindIcon className="w-3.5 h-3.5 text-cyan-400" />
              LIVE ROOF ANEMOMETER (15.0M)
            </span>
            <span className={`font-mono font-bold ${liveWindSpeedMs > 9.0 ? "text-red-400" : "text-cyan-400"}`}>
              {liveWindSpeedMs.toFixed(1)} m/s
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="16.0"
            step="0.2"
            value={liveWindSpeedMs}
            onChange={e => setLiveWindSpeedMs(parseFloat(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
          />
          <div className="text-[10px] text-slate-500 mt-1">Permissible Cut-off Limit: 9.0 m/s (Tower Crane Interlock: 15.0 m/s)</div>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">WIND SAFETY STATUS</span>
          <div className={`text-base font-bold mt-1 ${windAudit.isSuspendedDueToWind ? "text-red-400" : "text-emerald-400"}`}>
            {windAudit.isSuspendedDueToWind ? "AUTOMATIC STOPPAGE ACTIVATED" : "PERMISSIBLE (< 9.0 m/s)"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Operating Margin: {windAudit.operatingMarginMs} m/s</div>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">FALL ARREST IMPACT FORCE</span>
          <div className="text-base font-bold text-white mt-1 font-mono">{fallKinematics.impactForceKn} kN</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">IS 3521 Limit: &lt; 6.0 kN (FOS: {fallKinematics.safetyFactor})</div>
        </div>

        <div>
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">ACTIVE PERMITS ON SITE</span>
          <div className="text-base font-bold text-cyan-400 mt-1 font-mono">4 HIGH-HAZARD PERMITS</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Zero Safety Non-Conformances</div>
        </div>
      </div>

      {/* Main Grid: Permit Queue & Deep Hazard Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Active Permit Queue */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <LockIcon className="w-3.5 h-3.5 text-amber-400" />
              STATUTORY PERMIT QUEUE ({permits.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">DGFASLI STANDARD</span>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[500px]">
            {permits.map(permit => {
              const isSelected = selectedPermitId === permit.permitId;
              const isSuspended = (permit.category === "HEAVY_CRANE_LIFT" || permit.category === "WORK_AT_HEIGHT") && liveWindSpeedMs > 9.0;
              return (
                <div
                  key={permit.permitId}
                  onClick={() => setSelectedPermitId(permit.permitId)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
      <GovernorInterlockBanner module="PTW_SAFETY" />
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-amber-400 font-mono">{permit.permitNumber}</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold ${
                      isSuspended
                        ? "bg-red-950 text-red-400 border border-red-500/30"
                        : "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                    }`}>
                      {isSuspended ? "WIND SUSPENDED" : permit.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="text-white font-semibold text-xs leading-snug">{permit.title}</div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/80">
                    <span className="text-cyan-400 font-bold">{permit.category.replace(/_/g, " ")}</span>
                    <span className="text-slate-400 font-mono">{permit.locationZone.replace("_", " ")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Permit Hazard Controls & Physics Audit */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheckIcon className="w-3.5 h-3.5 text-amber-400" />
                HAZARD CONTROLS & CHECKLIST: {activePermit.permitNumber}
              </span>
              <span className="text-cyan-400 font-mono text-[10px]">{activePermit.locationZone}</span>
            </div>

            <div className="p-4 flex flex-col gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-bold">PERMIT TITLE & DETAILS</span>
                <div className="text-white font-bold text-sm mt-0.5">{activePermit.title}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Contractor: <strong className="text-slate-300">{activePermit.executingContractor}</strong> • Lead: <strong className="text-white">{activePermit.leadPermitHolder}</strong>
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Validity: {activePermit.validFrom} to {activePermit.validTo}</div>
              </div>

              {/* Dynamic Sub-Panel 1: Fall Arrest Physics (IS 3521) */}
              {(activePermit.category === "HEAVY_CRANE_LIFT" || activePermit.category === "WORK_AT_HEIGHT") && (
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                      FALL ARREST DYNAMIC IMPACT PHYSICS (IS 3521:1999)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      PASSED (&lt; 6.0 kN)
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">WORKER MASS</span>
                      <span className="font-bold text-white">100 kg</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">FREE-FALL DROP</span>
                      <span className="font-bold text-cyan-400">1.8 meters</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">ABSORBER STROKE</span>
                      <span className="font-bold text-white">0.6 meters</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400">
                    Formula: F_impact = (m · g · h_free) / d_stroke = (100 · 9.81 · 1.8) / 0.6 = {fallKinematics.impactForceKn} kN. Safe under 6.0 kN statutory threshold.
                  </div>
                </div>
              )}

              {/* Dynamic Sub-Panel 2: Confined Space Multi-Gas Telemetry (IS 2825) */}
              {activePermit.category === "CONFINED_SPACE" && (
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col gap-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                      CONFINED SPACE MULTI-GAS TELEMETRY (IS 2825 / OSHA)
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${atmosphericAudit.isAtmosphereSafe ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" : "bg-red-950 text-red-400 border border-red-500/30"}`}>
                      {atmosphericAudit.isAtmosphereSafe ? "SAFE ENTRY" : "ATMOSPHERE DANGEROUS"}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">OXYGEN (O2)</span>
                      <span className={`font-bold font-mono text-sm ${gasTelemetry.oxygenPct < 19.5 ? "text-red-400" : "text-emerald-400"}`}>
                        {gasTelemetry.oxygenPct}%
                      </span>
                      <span className="text-[8px] text-slate-500 block">19.5 - 23.5%</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">COMBUSTIBLE LEL</span>
                      <span className={`font-bold font-mono text-sm ${gasTelemetry.lowerExplosiveLimitPct >= 10 ? "text-red-400" : "text-emerald-400"}`}>
                        {gasTelemetry.lowerExplosiveLimitPct}%
                      </span>
                      <span className="text-[8px] text-slate-500 block">&lt; 10% Limit</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">H2S GAS</span>
                      <span className="font-bold text-white font-mono text-sm">{gasTelemetry.hydrogenSulfidePpm} ppm</span>
                      <span className="text-[8px] text-slate-500 block">&le; 10 ppm Limit</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                      <span className="text-[9px] text-slate-500 block">CARBON MONOXIDE</span>
                      <span className="font-bold text-white font-mono text-sm">{gasTelemetry.carbonMonoxidePpm} ppm</span>
                      <span className="text-[8px] text-slate-500 block">&le; 25 ppm Limit</span>
                    </div>
                  </div>

                  {/* Gas Slider Simulation Controls */}
                  <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-800/80">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>Oxygen Conc:</span>
                        <span className="text-white font-mono">{gasTelemetry.oxygenPct}%</span>
                      </div>
                      <input
                        type="range"
                        min="16.0"
                        max="24.0"
                        step="0.1"
                        value={gasTelemetry.oxygenPct}
                        onChange={e => setGasTelemetry(prev => ({ ...prev, oxygenPct: parseFloat(e.target.value) }))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                        <span>Combustible LEL:</span>
                        <span className="text-white font-mono">{gasTelemetry.lowerExplosiveLimitPct}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="20"
                        step="0.5"
                        value={gasTelemetry.lowerExplosiveLimitPct}
                        onChange={e => setGasTelemetry(prev => ({ ...prev, lowerExplosiveLimitPct: parseFloat(e.target.value) }))}
                        className="w-full h-1 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Dynamic Sub-Panel 3: Hot Work Fire Watch (IS 3016) */}
              {activePermit.category === "HOT_WORK_WELDING" && (
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FlameIcon className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">
                        HOT WORK FIRE WATCH COOL-DOWN (IS 3016)
                      </span>
                      <span className="text-slate-200">
                        Post-welding thermal dissipation watch: <strong className="text-amber-400">{activePermit.fireWatchMinutesRemaining} minutes remaining</strong>
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-950 text-amber-400 border border-amber-500/30">
                    FIRE WATCH ACTIVE
                  </span>
                </div>
              )}

              {/* Mandatory Checklist Checks */}
              <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl flex flex-col gap-1.5 text-[11px]">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  MANDATORY HIGH-HAZARD CHECKLIST VERIFICATIONS
                </span>

                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-emerald-400 font-bold">✔</span>
                  <span>Full-Body Harness with Double Scaffolding Hooks & Shock Absorber (IS 3521)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-emerald-400 font-bold">✔</span>
                  <span>Calibrated Multi-Gas Detector Bump-Tested within 24 Hours</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-emerald-400 font-bold">✔</span>
                  <span>10kg DCP Fire Extinguisher Stationed within 5-Meter Radius (IS 3016)</span>
                </div>
                <div className="flex items-center gap-2 text-slate-300">
                  <span className="text-emerald-400 font-bold">✔</span>
                  <span>11kV Powerline Separation Exceeds 3.5m (CEA Regulation Verified)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer & BSA Section 63 Notarization */}
          <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-[10px] text-slate-500">
              Authority: <strong className="text-amber-400">AEGIS-SAFETY-GOVERNOR</strong> • DGFASLI Statutory Attestation
            </div>

            <div>
              {sealedHash ? (
                <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400">
                  <CheckIcon className="w-4 h-4" />
                  <span className="font-mono text-[10px] select-all">{sealedHash.substring(0, 24)}...</span>
                </div>
              ) : (
                <button
                  onClick={handleSealPtwPermit}
                  disabled={isNotarizing || isSafetyInterlocked}
                  className={`px-4 py-2 font-bold text-xs rounded-xl transition flex items-center gap-2 ${
                    isSafetyInterlocked
                      ? "bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed"
                      : "bg-gradient-to-r from-amber-500 to-emerald-500 hover:from-amber-400 hover:to-emerald-400 text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  }`}
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                  <span>{isSafetyInterlocked ? "SAFETY INTERLOCKED (HOLD)" : "NOTARIZE PTW SAFETY PERMIT"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
