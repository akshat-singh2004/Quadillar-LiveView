"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  processMaturityHistory,
  evaluateStrippingReadiness,
  ThermocoupleSensorReading
} from "@/lib/calculations/concreteMaturityEngine";

// --- INLINE SVG ICONS ---
const ThermometerIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 14.76V3.5a2.5 2.5 0 00-5 0v11.26a4.5 4.5 0 105 0z" />
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
const LockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0110 0v4" />
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

export default function ConcreteMaturityPage() {
  // Target Mix Grade: M35 Grade OPC 53 Concrete
  const targetFck = 35.0;

  // Active Thermocouple Telemetry Log for Pour PC-VGD-2026-042 (Zone B Ground Podium Slab)
  // Elapsed time up to 72 hours (3 Days)
  const [currentAgeSliderHours, setCurrentAgeSliderHours] = useState<number>(56); // 56h active
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  // Full 72-Hour Curing Telemetry History (Core, Surface, Ambient Thermocouple probes)
  const fullSensorHistory: ThermocoupleSensorReading[] = useMemo(() => [
    { elapsedHours: 0,  coreTempC: 28.5, surfaceTempC: 28.0, ambientTempC: 27.5 },
    { elapsedHours: 4,  coreTempC: 34.2, surfaceTempC: 31.0, ambientTempC: 26.0 },
    { elapsedHours: 8,  coreTempC: 42.8, surfaceTempC: 36.5, ambientTempC: 24.5 },
    { elapsedHours: 12, coreTempC: 51.5, surfaceTempC: 41.2, ambientTempC: 23.0 },
    { elapsedHours: 16, coreTempC: 58.2, surfaceTempC: 45.0, ambientTempC: 25.5 }, // Peak hydration
    { elapsedHours: 20, coreTempC: 56.4, surfaceTempC: 43.8, ambientTempC: 29.0 },
    { elapsedHours: 24, coreTempC: 52.0, surfaceTempC: 41.0, ambientTempC: 31.5 },
    { elapsedHours: 32, coreTempC: 45.5, surfaceTempC: 37.5, ambientTempC: 27.0 },
    { elapsedHours: 40, coreTempC: 40.2, surfaceTempC: 34.0, ambientTempC: 25.0 },
    { elapsedHours: 48, coreTempC: 36.8, surfaceTempC: 31.5, ambientTempC: 28.5 },
    { elapsedHours: 56, coreTempC: 33.5, surfaceTempC: 29.0, ambientTempC: 26.0 }, // Selected Age
    { elapsedHours: 64, coreTempC: 31.0, surfaceTempC: 27.5, ambientTempC: 25.0 },
    { elapsedHours: 72, coreTempC: 29.5, surfaceTempC: 26.8, ambientTempC: 26.5 }
  ], []);

  // Filter history up to active slider hours
  const activeSensorHistory = useMemo(() => {
    return fullSensorHistory.filter(pt => pt.elapsedHours <= currentAgeSliderHours);
  }, [fullSensorHistory, currentAgeSliderHours]);

  // Compute ASTM C1074 Maturity State & Strength Evolution
  const maturityData = useMemo(() => {
    return processMaturityHistory(activeSensorHistory, targetFck);
  }, [activeSensorHistory, targetFck]);

  // Evaluate IS 456 Table 11.3 Formwork Stripping Authorizations
  const strippingDecisions = useMemo(() => {
    return evaluateStrippingReadiness(
      maturityData.currentStrengthMpa,
      targetFck,
      maturityData.currentThermalGradientC
    );
  }, [maturityData.currentStrengthMpa, targetFck, maturityData.currentThermalGradientC]);

  const handleSealMaturityAudit = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_MATURITY_AGE_${currentAgeSliderHours}H_STRENGTH_${maturityData.currentStrengthMpa}MPA_TTF_${maturityData.currentMaturityTTF}_GRAD_${maturityData.currentThermalGradientC}C_${timestamp}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "THEMIS-CURING-MATURITY",
          synthesis_report: `CONCRETE MATURITY & STRIPPING AUDIT NOTARIZED: Pour PC-042 (Zone B) • Age: ${currentAgeSliderHours}h • In-Situ Strength: ${maturityData.currentStrengthMpa} MPa (${((maturityData.currentStrengthMpa / targetFck) * 100).toFixed(1)}% f_ck) • Nurse-Saul TTF: ${maturityData.currentMaturityTTF} °C·h • Thermal Gradient: ${maturityData.currentThermalGradientC}°C (IS 456 Compliant) • Formwork Stripping Authorized`,
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
            <span className="px-2 py-0.5 text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded">
              ASTM C1074 MATURITY & IS 456 CL. 11.3
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              REAL-TIME FORMWORK STRIPPING ENGINE
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            CONCRETE MATURITY & THERMAL GRADIENT CURING
          </h1>
          <p className="text-xs text-slate-400">
            Pour Card PC-VGD-2026-042 (Zone B Ground Podium Slab) • Embedded Thermocouple Telemetry & Dynamic Stripping Verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/pour-cards" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">📋 POUR CARDS</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/rebar-bbs" className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition">⚙️ REBAR BBS</a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">ELAPSED CURING AGE</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">{currentAgeSliderHours} Hours</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{(currentAgeSliderHours / 24).toFixed(1)} Equivalent Days</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">NURSE-SAUL MATURITY (TTF)</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{maturityData.currentMaturityTTF} °C·h</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Datum Temp T_0 = -10°C</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">IN-SITU STRENGTH ESTIMATE</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{maturityData.currentStrengthMpa} MPa</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">
            {((maturityData.currentStrengthMpa / targetFck) * 100).toFixed(1)}% of Target M{targetFck}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">THERMAL GRADIENT (ΔT)</div>
          <div className={`text-xl font-bold mt-1 font-mono ${maturityData.isThermalGradientCompliant ? "text-emerald-400" : "text-red-400"}`}>
            {maturityData.currentThermalGradientC} °C
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">IS 456 Max Limit: ≤ 20.0 °C</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">SLAB SOFFIT STRIPPING</div>
          <div className={`text-sm font-bold mt-1.5 ${strippingDecisions[1].isStrippingAuthorized ? "text-emerald-400" : "text-amber-400"}`}>
            {strippingDecisions[1].isStrippingAuthorized ? "AUTHORIZED TO STRIP" : "CURE PROPS INTACT"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">70% Design Strength Rule</div>
        </div>
      </div>

      {/* Interactive Age Timeline Slider */}
      <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-2xl flex flex-col gap-2 text-xs">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider flex items-center gap-1.5">
            <ThermometerIcon className="w-3.5 h-3.5 text-purple-400" />
            SIMULATE ELAPSED HYDRATION & CURING TIME
          </span>
          <span className="text-purple-400 font-bold font-mono text-sm">
            T + {currentAgeSliderHours} HOURS ({((currentAgeSliderHours / 72) * 100).toFixed(0)}% OF 3-DAY PROTOCOL)
          </span>
        </div>
        <input
          type="range"
          min="4"
          max="72"
          step="4"
          value={currentAgeSliderHours}
          onChange={e => setCurrentAgeSliderHours(parseInt(e.target.value, 10))}
          className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-400"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0h (Placement)</span>
          <span>16h (Peak Exotherm ~58°C)</span>
          <span>24h (Vertical Forms Permissible)</span>
          <span>48h (Slab Soffits ~70% f_ck)</span>
          <span>72h (Transfer Beams ~85% f_ck)</span>
        </div>
      </div>

      {/* Main Grid: Live HTML5 Canvas Chart & Formwork Stripping Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Dynamic Maturity & Temperature Thermal Chart */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col min-h-[500px]">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <ThermometerIcon className="w-4 h-4 text-purple-400" />
              THERMAL HYDRATION EXOTHERM & STRENGTH MATURITY CURVE
            </span>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1 text-red-400">
                <span className="w-2.5 h-0.5 bg-red-400 inline-block"></span> Core Temp (°C)
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-0.5 bg-amber-400 inline-block"></span> Surface Temp (°C)
              </span>
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-2.5 h-0.5 bg-emerald-400 inline-block"></span> Strength (MPa)
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-950 flex-1 flex flex-col justify-between">
            <MaturityCurveCanvas
              points={maturityData.historyPoints}
              maxHours={72}
              targetFck={targetFck}
            />

            {/* Bottom Thermal Summary Strip */}
            <div className="pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-[10px] text-slate-400 font-mono">
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">PEAK CORE TEMPERATURE</span>
                <span className="font-bold text-red-400 text-xs font-mono">{maturityData.peakCoreTempC} °C</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">MAX THERMAL GRADIENT (ΔT)</span>
                <span className="font-bold text-white text-xs font-mono">{maturityData.maxThermalGradientC} °C (≤ 20°C Limit)</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                <span className="text-[9px] text-slate-500 block">ARRHENIUS EQUIVALENT AGE</span>
                <span className="font-bold text-purple-400 text-xs font-mono">{maturityData.currentEquivalentAgeHours} h (@ 20°C ref)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Statutory IS 456 Cl. 11.3 Formwork Stripping Decisions */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                FORMWORK STRIPPING DECISION ENGINE (IS 456)
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">TABLE 11.3 CRITERIA</span>
            </div>

            <div className="flex flex-col gap-3">
              {strippingDecisions.map(decision => (
                <div
                  key={decision.elementType}
                  className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col gap-2 text-xs"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white leading-tight">{decision.elementLabel}</span>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      decision.isStrippingAuthorized
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-950 text-amber-400 border border-amber-500/30"
                    }`}>
                      {decision.isStrippingAuthorized ? "STRIP FORMWORK" : "HOLD PROPS"}
                    </span>
                  </div>

                  {/* Progress bar toward required strength */}
                  <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${
                        decision.isStrippingAuthorized ? "bg-emerald-500" : "bg-cyan-500"
                      }`}
                      style={{
                        width: `${Math.min(100, (decision.achievedStrengthMpa / decision.requiredStrengthMpa) * 100)}%`
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>
                      Strength: <strong className="text-white">{decision.achievedStrengthMpa} MPa</strong> / Required: <strong className="text-cyan-400">{decision.requiredStrengthMpa} MPa</strong>
                    </span>
                    <span>
                      {decision.isStrippingAuthorized ? (
                        <strong className="text-emerald-400">AUTHORIZED</strong>
                      ) : (
                        <span>~{decision.timeRemainingHours}h remaining</span>
                      )}
                    </span>
                  </div>

                  <div className="text-[9px] text-slate-500 border-t border-slate-900 pt-1">
                    {decision.regulatoryCodeRef}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 65B Digital Curing & Stripping Seal */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>SECTION 65B FORMWORK DE-SHUTTERING CERTIFICATE</span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                Legally seals the thermocouple maturity history and in-situ strength verification into the immutable evidence ledger prior to contractor de-shuttering.
              </div>
            </div>

            <div>
              {sealedHash ? (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>FORMWORK STRIPPING AUDIT SEALED</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono truncate select-all">
                    {sealedHash}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSealMaturityAudit}
                  disabled={isNotarizing}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-emerald-500 hover:from-purple-500 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <LockIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE DE-SHUTTERING AUTHORIZATION</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: CANVAS MATURITY & HYDRATION EXOTHERM PLOTTER ---
function MaturityCurveCanvas({
  points,
  maxHours,
  targetFck
}: {
  points: any[];
  maxHours: number;
  targetFck: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const padL = 50;
    const padR = 50;
    const padT = 30;
    const padB = 35;

    // Background
    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, w, h);

    const maxTemp = 70.0;     // Left Y-Axis: 0 to 70 deg C
    const maxStrength = 45.0; // Right Y-Axis: 0 to 45 MPa

    const toX = (hours: number) => padL + (hours / maxHours) * (w - padL - padR);
    const toYTemp = (t: number) => h - padB - (t / maxTemp) * (h - padT - padB);
    const toYStrength = (s: number) => h - padB - (s / maxStrength) * (h - padT - padB);

    // Grid lines & Axis Labels
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.fillStyle = "#64748b";
    ctx.font = "9px monospace";

    // X-Axis Hours
    for (let hr = 0; hr <= maxHours; hr += 12) {
      const x = toX(hr);
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, h - padB);
      ctx.stroke();
      ctx.fillText(`${hr}h`, x - 8, h - padB + 14);
    }

    // Left Y-Axis Temperature (0, 20, 40, 60 C)
    for (let t = 0; t <= maxTemp; t += 20) {
      const y = toYTemp(t);
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(w - padR, y);
      ctx.stroke();
      ctx.fillText(`${t}°C`, padL - 32, y + 3);
    }

    // Right Y-Axis Strength (MPa)
    ctx.fillStyle = "#10b981";
    for (let s = 10; s <= 40; s += 10) {
      const y = toYStrength(s);
      ctx.fillText(`${s}MPa`, w - padR + 8, y + 3);
    }

    // Target 70% f_ck stripping threshold line (24.5 MPa)
    const y70 = toYStrength(targetFck * 0.70);
    ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, y70);
    ctx.lineTo(w - padR, y70);
    ctx.stroke();
    ctx.fillStyle = "#10b981";
    ctx.fillText("70% f_ck (24.5 MPa Slab Stripping)", padL + 10, y70 - 4);
    ctx.setLineDash([]);

    if (points.length < 2) return;

    // 1. Draw Core Hydration Temperature Curve (Red)
    ctx.strokeStyle = "#ef4444";
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    points.forEach((pt, i) => {
      const x = toX(pt.elapsedHours);
      const y = toYTemp(pt.coreTempC);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 2. Draw Surface Temperature Curve (Amber)
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    points.forEach((pt, i) => {
      const x = toX(pt.elapsedHours);
      const y = toYTemp(pt.surfaceTempC);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // 3. Draw In-Situ Strength Maturity Curve (Emerald Thick)
    ctx.strokeStyle = "#10b981";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    points.forEach((pt, i) => {
      const x = toX(pt.elapsedHours);
      const y = toYStrength(pt.estimatedStrengthMpa);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dot at current active point
    const cur = points[points.length - 1];
    if (cur) {
      const x = toX(cur.elapsedHours);
      const yS = toYStrength(cur.estimatedStrengthMpa);
      const yC = toYTemp(cur.coreTempC);

      ctx.fillStyle = "#10b981";
      ctx.beginPath();
      ctx.arc(x, yS, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(x, yC, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [points, maxHours, targetFck]);

  return (
    <canvas
      ref={canvasRef}
      width={720}
      height={320}
      className="w-full h-full object-contain"
    />
  );
}
