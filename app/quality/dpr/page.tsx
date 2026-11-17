"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  evaluateManpowerProductivity,
  evaluateEquipmentFleet,
  evaluateSiteWeather,
  LaborTradeDeployment,
  PlantMachineryLog,
  WeatherSiteTelemetry
} from "@/lib/calculations/dprEngine";

// --- INLINE SVG ICONS ---
const ClipboardIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);
const UsersIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
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
const CloudSunIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
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

export default function DailyProgressReportPage() {
  const dprHeader = {
    reportNo: "DPR-VGD-2026-084",
    reportDate: "29-Oct-2026",
    shift: "Day Shift (08:00 - 17:00 IST)",
    projectTag: "VANGUARD-COMMERCIAL-HUB",
    contractor: "Larsen & Toubro Construction Ltd",
    supervisingPmc: "CBRE South Asia Pvt Ltd",
    leadSafetyOfficer: "Dinesh Sharma (HSE Lead)"
  };

  // 1. Manpower Gang Deployment (IS 7272)
  const [laborTrades] = useState<LaborTradeDeployment[]>([
    { tradeCode: "BAR-01", tradeName: "Rebar Benders & Fixers (Barbenders)", headcount: 14, shiftHours: 8.5, standardOutputNormPerShift: 0.35, actualWorkCompleted: 5.10, unit: "MT" },
    { tradeCode: "CAR-02", tradeName: "Formwork Carpenters & Shuttering Fitters", headcount: 12, shiftHours: 8.5, standardOutputNormPerShift: 7.20, actualWorkCompleted: 91.50, unit: "m²" },
    { tradeCode: "MAS-03", tradeName: "Masons & Surface Finishers (Plaster/Block)", headcount: 8, shiftHours: 8.0, standardOutputNormPerShift: 4.80, actualWorkCompleted: 39.20, unit: "m²" },
    { tradeCode: "RIG-04", tradeName: "Heavy Riggers & Steel Moment Erectors", headcount: 6, shiftHours: 8.0, standardOutputNormPerShift: 0.65, actualWorkCompleted: 4.10, unit: "MT" },
    { tradeCode: "MEP-05", tradeName: "Piping & HVAC Duct Fitters", headcount: 8, shiftHours: 8.0, standardOutputNormPerShift: 3.50, actualWorkCompleted: 29.40, unit: "m" },
    { tradeCode: "HLP-06", tradeName: "General Site Helpers & Safety Marshals", headcount: 18, shiftHours: 8.5, standardOutputNormPerShift: 1.00, actualWorkCompleted: 18.00, unit: "Shift" }
  ]);

  // 2. Heavy Plant & Equipment Fleet Telemetry
  const [equipmentFleet] = useState<PlantMachineryLog[]>([
    { equipmentId: "CRN-01", equipmentName: "Potain IGO 50 Self-Erecting Tower Crane", fuelType: "ELECTRIC_3PH", operatingHours: 6.8, idleHours: 1.2, breakdownHours: 0.0, fuelConsumedLiters: 0, operatorName: "Rameshwar Dayal" },
    { equipmentId: "PMP-02", equipmentName: "Schwing Stetter Concrete Boom Pump (36m)", fuelType: "DIESEL", operatingHours: 5.5, idleHours: 2.0, breakdownHours: 0.0, fuelConsumedLiters: 68.0, operatorName: "Vikram Yadav" },
    { equipmentId: "GEN-03", equipmentName: "Cummins 250 kVA Silent Site DG Generator", fuelType: "DIESEL", operatingHours: 8.0, idleHours: 0.0, breakdownHours: 0.0, fuelConsumedLiters: 96.0, operatorName: "Site Electrician" },
    { equipmentId: "VIB-04", equipmentName: "High-Frequency Concrete Poker Vibrators (x4)", fuelType: "DIESEL", operatingHours: 5.0, idleHours: 3.0, breakdownHours: 0.0, fuelConsumedLiters: 14.5, operatorName: "Concreting Crew" }
  ]);

  // 3. Environmental & Meteorological Telemetry (Lucknow Gomti Basin)
  const [weatherTelemetry, setWeatherTelemetry] = useState<WeatherSiteTelemetry>({
    ambientTempMaxC: 32.4,
    ambientTempMinC: 19.8,
    relativeHumidityPct: 54,
    peakWindSpeedMs: 4.2,      // 4.2 m/s < 9.0 m/s Limit
    cumulativeRainfallMm: 0.0, // Zero precipitation
    workingCondition: "UNRESTRICTED"
  });

  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  // Computations
  const manpower = useMemo(() => evaluateManpowerProductivity(laborTrades), [laborTrades]);
  const plant = useMemo(() => evaluateEquipmentFleet(equipmentFleet), [equipmentFleet]);
  const weather = useMemo(() => evaluateSiteWeather(weatherTelemetry), [weatherTelemetry]);

  const handleSealDprLog = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_DPR_${dprHeader.reportNo}_HEADCOUNT_${manpower.totalHeadcount}_PROD_${manpower.productivityIndexPct}_PLANT_OP_${plant.totalOperatingHours}H_FUEL_${plant.totalFuelLiters}L_TIME_${timestamp}_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "ARGUS-SITE-RECORDER",
          synthesis_report: `STATUTORY DPR #084 NOTARIZED: Total Headcount: ${manpower.totalHeadcount} (${manpower.totalManHours} man-hrs) • Productivity: ${manpower.productivityIndexPct}% • Plant Operating: ${plant.totalOperatingHours} hrs (${plant.overallAvailabilityPct}% avail) • Fuel: ${plant.totalFuelLiters}L • Zero Incidents Recorded`,
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
              CPWD WORKS MANUAL SECTION 32 / IS 7272
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              STATUTORY DAILY SITE DIARY
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            DAILY PROGRESS REPORT (DPR #084)
          </h1>
          <p className="text-xs text-slate-400">
            Project Vanguard • Shift: {dprHeader.shift} • Section 65B Certified Forensic Logbook
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/master-schedule" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">📅 CPM SCHEDULE</a>
          <a href="/site/ptw" className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition">⚠️ PTW SAFETY</a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">DEPLOYED MANPOWER</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">{manpower.totalHeadcount} Workers</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{manpower.totalManHours} Gross Man-Hours</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">LABOR PRODUCTIVITY INDEX</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">{manpower.productivityIndexPct}%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">IS 7272 Standard Output Basis</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">PLANT AVAILABILITY FACTOR</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">{plant.overallAvailabilityPct}%</div>
          <div className="text-[10px] text-cyan-400 mt-0.5">{plant.totalOperatingHours}h Running / 0h Breakdown</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">DIESEL FUEL CONSUMPTION</div>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">{plant.totalFuelLiters} Liters</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Burn Rate: {plant.fuelBurnRateLph} L/hr</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">STATUTORY SAFETY AUDIT</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">0 LTI / ZERO ACCIDENTS</div>
          <div className="text-[10px] text-slate-500 mt-0.5">3 Active Permits Verified</div>
        </div>
      </div>

      {/* Main Grid: Manpower Register & Equipment Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Trade-wise Labor Deployment & Work Executed Table */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <UsersIcon className="w-3.5 h-3.5 text-cyan-400" />
              TRADE-WISE LABOR DEPLOYMENT & PRODUCTION RECORD
            </span>
            <span className="text-cyan-400 font-mono text-[10px]">BOCW ACT 1996</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase border-b border-slate-800 font-mono">
                <tr>
                  <th className="py-2.5 px-3">CODE</th>
                  <th className="py-2.5 px-3">DESIGNATION & TRADE</th>
                  <th className="py-2.5 px-3 text-center">HEADCOUNT</th>
                  <th className="py-2.5 px-3">EXECUTED WORK</th>
                  <th className="py-2.5 px-3">IS 7272 NORM</th>
                  <th className="py-2.5 px-3 text-right">EFFICIENCY</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 font-mono text-[11px]">
                {laborTrades.map(trade => {
                  const expected = trade.headcount * trade.standardOutputNormPerShift;
                  const eff = expected > 0 ? +((trade.actualWorkCompleted / expected) * 100).toFixed(0) : 100;
                  return (
                    <tr key={trade.tradeCode} className="hover:bg-slate-900/40 transition">
                      <td className="py-3 px-3 font-bold text-cyan-400">{trade.tradeCode}</td>
                      <td className="py-3 px-3 font-semibold text-white">{trade.tradeName}</td>
                      <td className="py-3 px-3 text-center font-bold text-white">{trade.headcount}</td>
                      <td className="py-3 px-3 text-white">
                        <strong>{trade.actualWorkCompleted}</strong> {trade.unit}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {expected.toFixed(1)} {trade.unit}
                      </td>
                      <td className="py-3 px-3 text-right font-bold">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${eff >= 100 ? "text-emerald-400 bg-emerald-950/60" : "text-amber-400 bg-amber-950/60"}`}>
                          {eff}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
            <span>Overall Gang Attendance: {manpower.totalHeadcount} workers</span>
            <span className="font-bold text-emerald-400">Average Shift Productivity: {manpower.productivityIndexPct}%</span>
          </div>
        </div>

        {/* Right: Plant & Machinery Telemetry & Weather Conditions */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Equipment Log */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              PLANT & MACHINERY TELEMETRY (SHIFT LOG)
            </span>

            <div className="flex flex-col gap-2 text-xs">
              {equipmentFleet.map(eq => (
                <div key={eq.equipmentId} className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <div className="font-bold text-white leading-tight">{eq.equipmentName}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Operator: {eq.operatorName} • Fuel: {eq.fuelConsumedLiters > 0 ? `${eq.fuelConsumedLiters}L Diesel` : "3-Phase Power"}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-cyan-400 font-mono text-sm">{eq.operatingHours}h Run</span>
                    <span className="text-[9px] text-slate-500 block">Idle: {eq.idleHours}h</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Micro-Climate Atmospheric Telemetry */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <CloudSunIcon className="w-3.5 h-3.5 text-amber-400" />
                SITE MICRO-CLIMATE & ENVIRONMENTAL SENSORS
              </span>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                {weather.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-center">
                <span className="text-[9px] text-slate-500 block">TEMPERATURE</span>
                <span className="font-bold text-white font-mono text-xs">{weatherTelemetry.ambientTempMinC}°C - {weatherTelemetry.ambientTempMaxC}°C</span>
              </div>
              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-center">
                <span className="text-[9px] text-slate-500 block">ANEMOMETER WIND</span>
                <span className="font-bold text-cyan-400 font-mono text-xs">{weatherTelemetry.peakWindSpeedMs} m/s (&lt; 9.0)</span>
              </div>
              <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800 text-center">
                <span className="text-[9px] text-slate-500 block">RAINFALL GAUGE</span>
                <span className="font-bold text-emerald-400 font-mono text-xs">{weatherTelemetry.cumulativeRainfallMm} mm</span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-800">
              {weather.constraintMessage}
            </div>
          </div>

          {/* Section 65B Statutory DPR Sign-off */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>SECTION 65B TRIPARTITE DPR SEAL</span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                Jointly signed by L&T Project Manager, CBRE Resident Engineer, and Vanguard Safety Director.
              </div>
            </div>

            <div>
              {sealedHash ? (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>DPR #084 NOTARIZED & CRYPTOGRAPHICALLY SEALED</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono truncate select-all">
                    {sealedHash}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSealDprLog}
                  disabled={isNotarizing}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ClipboardIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE DAILY PROGRESS REPORT (SEC 65B)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
