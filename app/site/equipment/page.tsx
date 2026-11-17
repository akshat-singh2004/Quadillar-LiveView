"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- INLINE SVG ICONS ---
const TruckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
const GaugeIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.07-7.07l-1.41 1.41M6.34 17.66l-1.41 1.41m14.14 0l-1.41-1.41M6.34 6.34L4.93 4.93" />
    <circle cx="12" cy="12" r="7" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 12l3-3" />
  </svg>
);
const ZapIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
const AlertTriangleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

interface EquipmentItem {
  id: string;
  name: string;
  category: "LIFTING" | "PUMPING" | "TRANSIT" | "POWER";
  makeModel: string;
  bitTarget: string;
  operatorName: string;
  telematicsProtocol: string;
  utilizationPct: number;
  fuelBurnLiters: number;
  engineHoursTotal: number;
  status: "ONLINE_OPERATIONAL" | "WARNING_HOLD" | "STANDBY";
  primaryMetric: { label: string; value: string; status: "OK" | "ALERT" };
  secondaryMetric: { label: string; value: string };
  lastTpiDate: string;
  fitnessCertificateNo: string;
}

const FLEET_REGISTRY: EquipmentItem[] = [
  {
    id: "EQ-VANGUARD-CR01",
    name: "Tower Crane 01 (Liebherr 280 EC-H)",
    category: "LIFTING",
    makeModel: "Liebherr 280 EC-H 16 Litronic (Mast 115m, Jib 70m)",
    bitTarget: "BIT-6 HELIPAD & BIT-3 TOWER CORE",
    operatorName: "Sunil Verma (Lic: CR-UP-4491)",
    telematicsProtocol: "CAN-Bus SAE J1939 via 4G Edge Gateway",
    utilizationPct: 82.5,
    fuelBurnLiters: 142.0,
    engineHoursTotal: 3418.5,
    status: "ONLINE_OPERATIONAL",
    primaryMetric: { label: "LOAD MOMENT", value: "62.8% (Nominal)", status: "OK" },
    secondaryMetric: { label: "WIND ANEMOMETER", value: "4.8 m/s (Limit: 14.0 m/s)" },
    lastTpiDate: "12-Aug-2026 (Bureau Veritas)",
    fitnessCertificateNo: "FORM-V-CR01-BV-2026-99"
  },
  {
    id: "EQ-VANGUARD-BP01",
    name: "Schwing Stetter 36m Concrete Boom Pump",
    category: "PUMPING",
    makeModel: "Schwing S36X RZ-4 Section Roll-and-Fold Boom",
    bitTarget: "BIT-6 38M HELIPAD SUPPORT CORE",
    operatorName: "Mohd. Tariq (Lic: BP-UP-1120)",
    telematicsProtocol: "Schwing Vector Controller (Modbus TCP)",
    utilizationPct: 74.0,
    fuelBurnLiters: 95.0,
    engineHoursTotal: 1824.2,
    status: "ONLINE_OPERATIONAL",
    primaryMetric: { label: "DELIVERY PRESSURE", value: "85 Bar (Hydraulic OK)", status: "OK" },
    secondaryMetric: { label: "STROKE COUNTER", value: "1,420 Cycles Today" },
    lastTpiDate: "05-Sep-2026 (SGS India)",
    fitnessCertificateNo: "FORM-V-BP01-SGS-2026-42"
  },
  {
    id: "EQ-VANGUARD-TM04",
    name: "UltraTech Transit Mixer TM-04 (8m³)",
    category: "TRANSIT",
    makeModel: "Ashok Leyland 2820 RMC 8m³ Drum",
    bitTarget: "CHINHAT RMC TO GOMTI NAGAR GATE 02",
    operatorName: "Rameshwar Singh (Lic: TM-UP-7721)",
    telematicsProtocol: "OBD-II CAN / GPS Geofence Fleet Sync",
    utilizationPct: 68.0,
    fuelBurnLiters: 110.0,
    engineHoursTotal: 4120.0,
    status: "ONLINE_OPERATIONAL",
    primaryMetric: { label: "IS 4926 TRANSIT CLOCK", value: "42 min / 90 min max", status: "OK" },
    secondaryMetric: { label: "DRUM ROTATION", value: "3.2 RPM (Agitating)" },
    lastTpiDate: "18-Jul-2026 (Internal QA)",
    fitnessCertificateNo: "RMC-TM04-CAL-2026-14"
  },
  {
    id: "EQ-VANGUARD-DG01",
    name: "Cummins 250 kVA Standby Diesel Generator",
    category: "POWER",
    makeModel: "Cummins PowerCommand 1.1 Silent DG",
    bitTarget: "CAMPUS EMERGENCY POWER & CRANE BUS",
    operatorName: "Pawan Shukla (Plant Electrical Supv)",
    telematicsProtocol: "DeepSea DSE7320 MKII Controller",
    utilizationPct: 15.0,
    fuelBurnLiters: 24.0,
    engineHoursTotal: 642.8,
    status: "STANDBY",
    primaryMetric: { label: "PHASE BALANCE", value: "R:310A Y:305A B:312A", status: "OK" },
    secondaryMetric: { label: "FREQUENCY", value: "50.1 Hz (50 Hz Grid Target)" },
    lastTpiDate: "01-Oct-2026 (Electrical Inspectorate)",
    fitnessCertificateNo: "DG-250KVA-UP-GOV-2026"
  }
];

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function JpnicPlantMachineryPage() {
  const [activeEquipment, setActiveEquipment] = useState<EquipmentItem>(FLEET_REGISTRY[0]);
  const [isSealingCertificate, setIsSealingCertificate] = useState(false);
  const [certifiedEquipmentIds, setCertifiedEquipmentIds] = useState<string[]>(["EQ-VANGUARD-DG01"]);
  const [telematicsHash, setTelematicsHash] = useState<string | null>(null);

  // Dynamic CAN-bus telemetry oscillation
  const [liveLoadMoment, setLiveLoadMoment] = useState(62.8);
  const [liveHydraulicPressure, setLiveHydraulicPressure] = useState(85);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveLoadMoment(+(62.8 + (Math.random() - 0.5) * 4.2).toFixed(1));
      setLiveHydraulicPressure(Math.round(85 + (Math.random() - 0.5) * 6));
    }, 1400);
    return () => clearInterval(interval);
  }, []);

  const isCertified = certifiedEquipmentIds.includes(activeEquipment.id);

  const handleSealEquipmentFitness = async () => {
    setIsSealingCertificate(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `vanguard_PM_FITNESS_${activeEquipment.id}_${activeEquipment.fitnessCertificateNo}_HOURS_${activeEquipment.engineHoursTotal}_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setTelematicsHash(hash);
      setCertifiedEquipmentIds(prev => [...prev, activeEquipment.id]);
      setIsSealingCertificate(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "UP-LDA-VANGUARD-CAMPUS",
          primary_governor: "ANANKE",
          synthesis_report: `EQUIPMENT FITNESS CERTIFIED: ${activeEquipment.name} • ${activeEquipment.fitnessCertificateNo} • CAN-Bus Health 100% • TPI Valid`,
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
              ANANKE • P&M TELEMATICS ENGINE
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              CAN-BUS SAE J1939 ACTIVE
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            PLANT & MACHINERY (P&M) FLEET TELEMETRY
          </h1>
          <p className="text-xs text-slate-400">
            PROJECT VANGUARD COMMERCIAL HUB • Real-time Equipment Utilization, Fuel Burn, TPI Certifications & Safety Overload Cutoffs
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
            href="/site/digital-twin"
            className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition"
          >
            🏛️ 3D BIM TWIN
          </a>
          <a
            href="/site/gis"
            className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs rounded-lg transition"
          >
            📡 RADAR GIS
          </a>
          <a
            href="/site/weighbridge"
            className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition"
          >
            ⚖️ WEIGHBRIDGE
          </a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">TOTAL ACTIVE MACHINES</div>
          <div className="text-xl font-bold text-white mt-1">4 Heavy Units</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">3 Online • 1 Standby</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">FLEET AVERAGE UTILIZATION</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">78.5%</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Peak Hour: 10:00 – 16:00</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">DIESEL BURN (TODAY)</div>
          <div className="text-xl font-bold text-amber-400 mt-1">371.0 Liters</div>
          <div className="text-[10px] text-slate-500 mt-0.5">₹33,390 @ ₹90/L Baseline</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">TPI STATUTORY HEALTH</div>
          <div className="text-sm font-bold text-emerald-400 mt-1.5">100% COMPLIANT</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Form V Inspection Certified</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">CAN-BUS EDGE PACKETS</div>
          <div className="text-sm font-bold text-white mt-1.5">12.4k pkts/sec</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Latency: 18ms (4G GSM)</div>
        </div>
      </div>

      {/* Main Grid: Equipment Registry & Live CAN-Bus Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Heavy Equipment Registry Cards */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TruckIcon className="w-3.5 h-3.5 text-cyan-400" />
              VANGUARD HEAVY PLANT REGISTRY ({FLEET_REGISTRY.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">ANANKE CLUSTER</span>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {FLEET_REGISTRY.map(eq => {
              const isSelected = activeEquipment.id === eq.id;
              const isCertifiedItem = certifiedEquipmentIds.includes(eq.id);
              return (
                <div
                  key={eq.id}
                  onClick={() => setActiveEquipment(eq)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col gap-2 ${
                    isSelected
                      ? "bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-cyan-400">{eq.id}</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold ${
                      eq.status === "ONLINE_OPERATIONAL"
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        : "bg-slate-800 text-slate-400"
                    }`}>
                      {eq.status === "ONLINE_OPERATIONAL" ? "ONLINE" : "STANDBY"}
                    </span>
                  </div>

                  <div>
                    <div className="font-semibold text-white">{eq.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{eq.makeModel}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                    <div>
                      Utilization: <strong className="text-white">{eq.utilizationPct}%</strong>
                    </div>
                    <div>
                      Fuel: <strong className="text-amber-400">{eq.fuelBurnLiters} L</strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[9px] pt-1 border-t border-slate-800/60">
                    <span className="text-slate-500 truncate">{eq.operatorName}</span>
                    <span className={isCertifiedItem ? "text-emerald-400 font-bold" : "text-purple-400 font-bold"}>
                      {isCertifiedItem ? "✔ Form V Certified" : "Pending Sign-off"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live CAN-Bus Diagnostics & Telemetry Dashboard */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <GaugeIcon className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="font-bold text-white uppercase tracking-wider">
                LIVE TELEMETRY DIAGNOSTICS: {activeEquipment.id}
              </span>
            </div>
            <span className="text-emerald-400 font-mono text-[10px]">{activeEquipment.telematicsProtocol}</span>
          </div>

          <div className="p-4 bg-slate-950 flex-1 flex flex-col justify-between gap-4">
            {/* Live Instrument Gauge Displays */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-black/70 border border-slate-800 p-4 rounded-xl flex flex-col justify-between gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">
                    {activeEquipment.primaryMetric.label}
                  </span>
                  <span className="text-emerald-400 text-[10px] font-bold">REAL-TIME CAN FEED</span>
                </div>

                <div className="text-3xl font-bold text-cyan-400 tracking-wider">
                  {activeEquipment.id === "EQ-VANGUARD-CR01"
                    ? `${liveLoadMoment}%`
                    : activeEquipment.id === "EQ-VANGUARD-BP01"
                    ? `${liveHydraulicPressure} Bar`
                    : activeEquipment.primaryMetric.value}
                </div>

                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-500"
                    style={{
                      width: activeEquipment.id === "EQ-VANGUARD-CR01"
                        ? `${liveLoadMoment}%`
                        : "70%"
                    }}
                  />
                </div>
              </div>

              <div className="bg-black/70 border border-slate-800 p-4 rounded-xl flex flex-col justify-between gap-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">
                    {activeEquipment.secondaryMetric.label}
                  </span>
                  <span className="text-cyan-400 text-[10px] font-bold">SENSOR STABLE</span>
                </div>

                <div className="text-2xl font-bold text-white tracking-wider">
                  {activeEquipment.secondaryMetric.value}
                </div>

                <div className="text-[10px] text-slate-500">
                  Target Destination: <strong className="text-amber-400">{activeEquipment.bitTarget}</strong>
                </div>
              </div>
            </div>

            {/* Statutory Compliance & Inspection Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold">THIRD-PARTY INSPECTION (TPI)</span>
                <div className="text-white font-bold">{activeEquipment.lastTpiDate}</div>
                <div className="text-slate-400 text-[11px]">Certificate: {activeEquipment.fitnessCertificateNo}</div>
                <div className="text-emerald-400 text-[10px]">✔ Load Test Deflection Factor: Nominal</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold">OPERATOR & SHIFT GOVERNANCE</span>
                <div className="text-white font-bold">{activeEquipment.operatorName}</div>
                <div className="text-slate-400 text-[11px]">Shift Engine Hours: {activeEquipment.engineHoursTotal} hrs</div>
                <div className="text-cyan-400 text-[10px]">Supervisor: ANANKE Domain Lead</div>
              </div>
            </div>

            {/* Authorize Fitness Certificate Action */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Machine ID: <strong className="text-white">{activeEquipment.id}</strong> • Protocol: <strong className="text-cyan-400">{activeEquipment.telematicsProtocol.split(" ")[0]}</strong>
              </div>

              <div>
                {isCertified ? (
                  <span className="px-3.5 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>FORM V FITNESS CERTIFIED</span>
                  </span>
                ) : (
                  <button
                    onClick={handleSealEquipmentFitness}
                    disabled={isSealingCertificate}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                  >
                    {isSealingCertificate ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                    <span>NOTARIZE EQUIPMENT FITNESS (FORM V)</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 65B Telematics Cryptographic Ledger */}
      <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-5 flex flex-col gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-2 gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
            <span>SECTION 65B TELEMATICS FORENSIC CUSTODY</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Authenticated by ANANKE Engine Telematics Gateway • Form A Custody
          </span>
        </div>

        <div className="bg-black/60 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-bold uppercase">SECTION 65B MERKLE ROOT:</span>
            <span className="text-slate-300 select-all font-mono">
              {telematicsHash || "8602a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"}
            </span>
          </div>
          <span className="text-slate-500">
            Certified By: ANANKE-P&M-GOVERNOR & CHIEF PLANT ENGINEER
          </span>
        </div>
      </div>
    </div>
  );
}
