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
const ScaleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-7-6l7-12 7 12M5 15h14M3 19h18" />
  </svg>
);
const CameraIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
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

interface InwardVehicle {
  id: string;
  vehicleNumber: string;
  rfidTag: string;
  supplier: string;
  materialDescription: string;
  bitTarget: string;
  ewayBillNumber: string;
  grossWeightMt: number;
  tareWeightMt: number;
  netWeightMt: number;
  moistureDeductionPct: number;
  billableWeightMt: number;
  slumpOrQualityCheck: string;
  gateStatus: "SCALE_ACTIVE" | "INSPECTED" | "DISCHARGED";
  arrivalTime: string;
}

const INWARD_QUEUE: InwardVehicle[] = [
  {
    id: "GATE-VANGUARD-881",
    vehicleNumber: "UP 32 EG 8841",
    rfidTag: "RFID-TRK-904",
    supplier: "UltraTech RMC Plant (Chinhat)",
    materialDescription: "M40 Self-Compacting Concrete (SCC) for Bit 6 Helipad",
    bitTarget: "BIT-6 HELIPAD CORE",
    ewayBillNumber: "EWB-9914-2026-8812",
    grossWeightMt: 32.45,
    tareWeightMt: 13.25,
    netWeightMt: 19.20, // ~8.0 m³ @ 2.4 MT/m³
    moistureDeductionPct: 0.0,
    billableWeightMt: 19.20,
    slumpOrQualityCheck: "Slump Flow: 650 mm (Passed • SCC Flowable)",
    gateStatus: "SCALE_ACTIVE",
    arrivalTime: "13:15 IST"
  },
  {
    id: "GATE-VANGUARD-882",
    vehicleNumber: "DL 01 AB 4492",
    rfidTag: "RFID-TRK-412",
    supplier: "Terreal Terracotta India / France",
    materialDescription: "Red-Orange Terracotta Rain-Screen Cladding Tiles",
    bitTarget: "BIT-4 EAST PROW WALL",
    ewayBillNumber: "EWB-4412-2026-3391",
    grossWeightMt: 28.60,
    tareWeightMt: 11.40,
    netWeightMt: 17.20,
    moistureDeductionPct: 0.0,
    billableWeightMt: 17.20,
    slumpOrQualityCheck: "Visual Impact Test: 0 Cracks / Lab Batch Cert Verified",
    gateStatus: "INSPECTED",
    arrivalTime: "12:50 IST"
  },
  {
    id: "GATE-VANGUARD-883",
    vehicleNumber: "UP 32 CZ 1109",
    rfidTag: "RFID-TRK-229",
    supplier: "Tata Steel Tiscon Distributor",
    materialDescription: "12.0m Commercial TMT Fe 550D Billets (T32 & T25)",
    bitTarget: "BIT-3 14TH FL TOWER CORE",
    ewayBillNumber: "EWB-7718-2026-9042",
    grossWeightMt: 44.80,
    tareWeightMt: 14.50,
    netWeightMt: 30.30,
    moistureDeductionPct: 0.0,
    billableWeightMt: 30.30,
    slumpOrQualityCheck: "Heat #TATA-550D-8821 verified • 0.2% Proof: 582 N/mm²",
    gateStatus: "DISCHARGED",
    arrivalTime: "11:20 IST"
  },
  {
    id: "GATE-VANGUARD-884",
    vehicleNumber: "HR 55 X 3012",
    rfidTag: "RFID-TRK-781",
    supplier: "Kalzip Aluminium Systems",
    materialDescription: "Aluminium Standing-Seam Acoustic Roof Coils",
    bitTarget: "BIT-2 SILVER DOME",
    ewayBillNumber: "EWB-1120-2026-4401",
    grossWeightMt: 24.10,
    tareWeightMt: 12.20,
    netWeightMt: 11.90,
    moistureDeductionPct: 0.0,
    billableWeightMt: 11.90,
    slumpOrQualityCheck: "Alloy 3004 Temper H18 • Anodized finish verified",
    gateStatus: "INSPECTED",
    arrivalTime: "10:05 IST"
  }
];

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function JpnicWeighbridgePage() {
  const [activeVehicle, setActiveVehicle] = useState<InwardVehicle>(INWARD_QUEUE[0]);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [dischargedVehicles, setDischargedVehicles] = useState<string[]>(["GATE-VANGUARD-883"]);
  const [slipMerkleHash, setSlipMerkleHash] = useState<string | null>(null);

  // Live Load Cell drift simulation (±0.02 MT stability)
  const [liveGrossDrift, setLiveGrossDrift] = useState(activeVehicle.grossWeightMt);

  useEffect(() => {
    setLiveGrossDrift(activeVehicle.grossWeightMt);
    const interval = setInterval(() => {
      setLiveGrossDrift(prev => +(activeVehicle.grossWeightMt + (Math.random() - 0.5) * 0.04).toFixed(2));
    }, 1500);
    return () => clearInterval(interval);
  }, [activeVehicle]);

  const liveNet = +(liveGrossDrift - activeVehicle.tareWeightMt).toFixed(2);
  const isDischarged = dischargedVehicles.includes(activeVehicle.id);

  const handleAuthorizeSlip = async () => {
    setIsAuthorizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `vanguard_WEIGHBRIDGE_SLIP_${activeVehicle.id}_VEHICLE_${activeVehicle.vehicleNumber}_NET_${liveNet}MT_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSlipMerkleHash(hash);
      setDischargedVehicles(prev => [...prev, activeVehicle.id]);
      setIsAuthorizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "UP-LDA-VANGUARD-CAMPUS",
          primary_governor: "VULCAN",
          synthesis_report: `WEIGHBRIDGE DISCHARGE CERTIFIED: ${activeVehicle.vehicleNumber} • ${activeVehicle.materialDescription} • Net: ${liveNet} MT • ${activeVehicle.bitTarget}`,
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
              GATE 02 WEIGHBRIDGE • 60 MT PITLESS
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              ANPR & RFID AUTOMATED
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            GATE INWARD & WEIGHBRIDGE TELEMETRY ENGINE
          </h1>
          <p className="text-xs text-slate-400">
            PROJECT VANGUARD COMMERCIAL HUB • Real-time Load Cell Telemetry, Tare Reconciliations & Quality Gate Clearance
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
            href="/site/dpr"
            className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition"
          >
            �� DPR #418
          </a>
          <a
            href="/site/bbs"
            className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs rounded-lg transition"
          >
            ✂️ REBAR BBS
          </a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">LIVE SCALE READING</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">{liveGrossDrift.toFixed(2)} MT</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Mettler-Toledo 4-Cell Sensor</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">CALCULATED NET WEIGHT</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{liveNet.toFixed(2)} MT</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Tare: {activeVehicle.tareWeightMt.toFixed(2)} MT</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">TODAY'S INWARD TONNAGE</div>
          <div className="text-xl font-bold text-white mt-1">118.6 MT</div>
          <div className="text-[10px] text-slate-500 mt-0.5">8 Commercial Trucks Logged</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">ANPR RECOGNITION</div>
          <div className="text-sm font-bold text-white mt-1.5">{activeVehicle.vehicleNumber}</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Confidence: 99.4% (Clear)</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">DISCHARGE STATUS</div>
          <div className={`text-sm font-bold mt-1.5 ${isDischarged ? "text-emerald-400" : "text-amber-400"}`}>
            {isDischarged ? "DISCHARGED TO SITE" : "AWAITING GATE PASS"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">VULCAN & Security Sign-off</div>
        </div>
      </div>

      {/* Main Grid: Queue & Live Load Cell Telemetry Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Inward Vehicle Queue */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TruckIcon className="w-3.5 h-3.5 text-cyan-400" />
              GATE INWARD QUEUE ({INWARD_QUEUE.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">GATE 02 RFID SCANNER</span>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[440px]">
            {INWARD_QUEUE.map(veh => {
              const isSelected = activeVehicle.id === veh.id;
              const isDone = dischargedVehicles.includes(veh.id);
              return (
                <div
                  key={veh.id}
                  onClick={() => setActiveVehicle(veh)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      {veh.vehicleNumber}
                    </span>
                    <span className={`px-1.5 py-0.2 rounded font-bold ${
                      isDone
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-950 text-amber-400 border border-amber-500/30"
                    }`}>
                      {isDone ? "DISCHARGED" : "ON SCALE"}
                    </span>
                  </div>

                  <div className="text-slate-200 font-semibold truncate">{veh.materialDescription}</div>
                  <div className="text-[10px] text-slate-400 truncate">{veh.supplier}</div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                    <span className="text-cyan-400 font-bold">{veh.bitTarget}</span>
                    <span>Net: <strong className="text-white">{veh.netWeightMt} MT</strong></span>
                    <span>{veh.arrivalTime}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Load Cell Visualizer & ANPR Gate Camera */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          {/* Action Header */}
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <CameraIcon className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="font-bold text-white uppercase tracking-wider">
                ANPR GATE 02 FEED & WEIGHBRIDGE SCALE PLATFORM
              </span>
            </div>
            <span className="text-emerald-400 font-mono text-[10px]">60T PITLESS DECK</span>
          </div>

          <div className="p-4 bg-slate-950 flex-1 flex flex-col justify-between gap-4">
            {/* Live Scale Display Terminal */}
            <div className="bg-black/80 border border-cyan-500/40 p-4 rounded-xl flex flex-col gap-3 shadow-[0_0_20px_rgba(6,182,212,0.12)]">
              <div className="flex justify-between items-center text-xs border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <ScaleIcon className="w-4 h-4 text-cyan-400" />
                  <span className="text-slate-300 font-bold uppercase">DIGITAL INDICATOR: METTLER IND780</span>
                </div>
                <span className="text-emerald-400 text-[10px] font-bold">STATUS: ZERO VERIFIED</span>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center py-2">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase">GROSS WEIGHT</div>
                  <div className="text-2xl md:text-3xl font-bold text-cyan-400 tracking-wider">
                    {liveGrossDrift.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-400">METRIC TONS</div>
                </div>

                <div className="border-x border-slate-800">
                  <div className="text-[10px] text-slate-500 uppercase">TARE WEIGHT</div>
                  <div className="text-2xl md:text-3xl font-bold text-slate-300 tracking-wider">
                    {activeVehicle.tareWeightMt.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-400">EMPTY VEHICLE</div>
                </div>

                <div>
                  <div className="text-[10px] text-slate-500 uppercase">NET RECEIPT</div>
                  <div className="text-2xl md:text-3xl font-bold text-emerald-400 tracking-wider">
                    {liveNet.toFixed(2)}
                  </div>
                  <div className="text-[9px] text-slate-400">NET MATERIAL</div>
                </div>
              </div>
            </div>

            {/* Inward Vehicle Inspection Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold">STATUTORY INVOICE & E-WAY BILL</span>
                <div className="text-white font-bold">{activeVehicle.ewayBillNumber}</div>
                <div className="text-slate-400 text-[11px]">Supplier: {activeVehicle.supplier}</div>
                <div className="text-cyan-400 text-[10px]">Destination: {activeVehicle.bitTarget}</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold">QA GATE TESTING / SLUMP CHECK</span>
                <div className="text-emerald-400 font-bold">{activeVehicle.slumpOrQualityCheck}</div>
                <div className="text-slate-400 text-[11px]">Inspection: 100% Passed at Gate 02</div>
                <div className="text-slate-500 text-[10px]">Audited by: VULCAN Quality Agent</div>
              </div>
            </div>

            {/* Authorize Discharge Gate Pass Action */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Vehicle: <strong className="text-white">{activeVehicle.vehicleNumber}</strong> • RFID: <strong className="text-cyan-400">{activeVehicle.rfidTag}</strong>
              </div>

              <div>
                {isDischarged ? (
                  <span className="px-3.5 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>GATE PASS ISSUED (DISCHARGED)</span>
                  </span>
                ) : (
                  <button
                    onClick={handleAuthorizeSlip}
                    disabled={isAuthorizing}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                  >
                    {isAuthorizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                    <span>AUTHORIZE & ISSUE WEIGHMENT SLIP</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 65B Electronic Weighment Slip Ledger */}
      <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-5 flex flex-col gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-2 gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
            <span>SECTION 65B DIGITAL WEIGHMENT SLIP PROVENANCE</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Authenticated by Weighbridge Load Cell #02 • Form A Custody
          </span>
        </div>

        <div className="bg-black/60 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-bold uppercase">SECTION 65B MERKLE ROOT:</span>
            <span className="text-slate-300 select-all font-mono">
              {slipMerkleHash || "8602a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"}
            </span>
          </div>
          <span className="text-slate-500">
            Sign-off: VULCAN-GATE-CONTROLLER & SECURITY CHIEF
          </span>
        </div>
      </div>
    </div>
  );
}
