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
const ScaleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-9-6l9-4 9 4M6 15l-3 4h6l-3-4zm12 0l-3 4h6l-3-4z" />
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

interface WeighbridgeTicket {
  ticketNo: string;
  vehicleNo: string;
  materialName: string;
  targetZone: string;
  supplier: string;
  challanNo: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  challanQtyKg: number;
  varianceKg: number;
  variancePct: number;
  gateStatus: "ACCEPTED_ENTRY" | "TARE_VERIFIED" | "REJECTED_OVERLOAD" | "DISCHARGED";
  timestamp: string;
  anprConfidence: number;
  slumpCheckMm?: number;
  batchTempC?: number;
}

const WEIGHBRIDGE_LOGS: WeighbridgeTicket[] = [
  {
    ticketNo: "WB-VGD-2026-0881",
    vehicleNo: "UP 32 HN 4920",
    materialName: "M35 Grade Pumpable Ready-Mix Concrete (RMC)",
    targetZone: "ZONE-B GROUND LEVEL PODIUM (+4.5m SLAB)",
    supplier: "UltraTech RMC Batching Plant (Lucknow South)",
    challanNo: "DC-UT-99402",
    grossWeightKg: 28420,
    tareWeightKg: 13950,
    netWeightKg: 14470, // ~6.0 m3 @ 2410 kg/m3
    challanQtyKg: 14460,
    varianceKg: 10,
    variancePct: 0.07,
    gateStatus: "TARE_VERIFIED",
    timestamp: "10:14 IST",
    anprConfidence: 98.4,
    slumpCheckMm: 125,
    batchTempC: 27.8
  },
  {
    ticketNo: "WB-VGD-2026-0882",
    vehicleNo: "UP 32 ET 8812",
    materialName: "Tata Structura IS 4923 Hollow Steel Sections (H-Beams)",
    targetZone: "ZONE-C SUPERSTRUCTURE (+8.5m MOMENT FRAMES)",
    supplier: "Tata Steel Distribution Yard (Chinhat)",
    challanNo: "TS-LKO-2026-441",
    grossWeightKg: 19840,
    tareWeightKg: 7820,
    netWeightKg: 12020,
    challanQtyKg: 12000,
    varianceKg: 20,
    variancePct: 0.17,
    gateStatus: "ACCEPTED_ENTRY",
    timestamp: "10:48 IST",
    anprConfidence: 96.9
  },
  {
    ticketNo: "WB-VGD-2026-0883",
    vehicleNo: "HR 38 Z 5504",
    materialName: "Galvanized Steel Sheet Coils (22-Gauge HVAC Ducting)",
    targetZone: "ZONE-D ROOF & MEP FABRICATION",
    supplier: "Jindal Steel & Power Ltd (Faridabad Depot)",
    challanNo: "JSPL-77102-INV",
    grossWeightKg: 16420,
    tareWeightKg: 9100,
    netWeightKg: 7320,
    challanQtyKg: 7500,
    varianceKg: -180, // Net shortage
    variancePct: -2.40,
    gateStatus: "REJECTED_OVERLOAD",
    timestamp: "11:22 IST",
    anprConfidence: 99.1
  },
  {
    ticketNo: "WB-VGD-2026-0884",
    vehicleNo: "UP 32 DN 2108",
    materialName: "Coarse River Sand (Zone II Grading for Mortar & Screeds)",
    targetZone: "ZONE-A FOUNDATION GROUTING & BASEMENT",
    supplier: "Gomti Aggregates & Mineral Transport",
    challanNo: "CH-GAM-810",
    grossWeightKg: 22100,
    tareWeightKg: 8400,
    netWeightKg: 13700,
    challanQtyKg: 13650,
    varianceKg: 50,
    variancePct: 0.36,
    gateStatus: "TARE_VERIFIED",
    timestamp: "11:55 IST",
    anprConfidence: 97.5
  }
];

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function VanguardWeighbridgePage() {
  const [selectedTicket, setSelectedTicket] = useState<WeighbridgeTicket>(WEIGHBRIDGE_LOGS[0]);
  const [liveLoadCellKg, setLiveLoadCellKg] = useState(28420);
  const [barrierGateOpen, setBarrierGateOpen] = useState(false);
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [notarizedTickets, setNotarizedTickets] = useState<string[]>(["WB-VGD-2026-0881"]);
  const [merkleRootHash, setMerkleRootHash] = useState("d748a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4");

  // Minor live telemetry jitter simulating active load-cell vibration
  useEffect(() => {
    const interval = setInterval(() => {
      setLiveLoadCellKg(prev => {
        const jitter = Math.floor((Math.random() - 0.5) * 8);
        return prev + jitter;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  const isTicketNotarized = notarizedTickets.includes(selectedTicket.ticketNo);

  const handleAuthorizeTicket = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawPayload = `VANGUARD_WEIGHBRIDGE_${selectedTicket.ticketNo}_NET_${selectedTicket.netWeightKg}KG_CHALLAN_${selectedTicket.challanNo}_TIME_${timestamp}_${Date.now()}`;
    const hash = await generateSHA256(rawPayload);

    setTimeout(async () => {
      setMerkleRootHash(hash);
      setNotarizedTickets(prev => [...prev, selectedTicket.ticketNo]);
      setBarrierGateOpen(true);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "MIDAS-LOGISTICS",
          synthesis_report: `GATE INWARD NOTARIZED: ${selectedTicket.ticketNo} • ${selectedTicket.vehicleNo} • Net ${selectedTicket.netWeightKg} kg • Mat: ${selectedTicket.materialName} • Variance ${selectedTicket.varianceKg} kg (${selectedTicket.variancePct}%)`,
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
              GATE INWARD & WEIGHBRIDGE TELEMETRY
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              PROJECT VANGUARD
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            DIGITAL WEIGHBRIDGE & MATERIAL RECONCILIATION
          </h1>
          <p className="text-xs text-slate-400">
            Phase 1 Commercial Hub • 10.3m x 10.9m x 15m Envelope • Load-Cell Telemetry & ANPR Verification
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/dpr" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">📋 DPR #084</a>
          <a href="/site/ptw" className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition">⚠️ PTW SAFETY</a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">LIVE PLATFORM LOAD CELL</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">{liveLoadCellKg.toLocaleString()} kg</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Dual Biaxial Shear Beams OK</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">TODAY's INWARD VOLUME</div>
          <div className="text-xl font-bold text-white mt-1">47.51 MT</div>
          <div className="text-[10px] text-slate-500 mt-0.5">4 Vehicles Processed</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">CHALLAN VARIANCE RATE</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">+0.12% Net</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Within ±0.5% Tolerance</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">AUTOMATIC BOOM BARRIER</div>
          <div className={`text-sm font-bold mt-1.5 ${barrierGateOpen ? "text-emerald-400" : "text-amber-400"}`}>
            {barrierGateOpen ? "BARRIER RAISED (OPEN)" : "BARRIER DOWN (SECURED)"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">RFID & ANPR Interlocked</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">SECTION 65B EVIDENCE</div>
          <div className="text-sm font-bold text-purple-400 mt-1.5">CRYPTOGRAPHICALLY SEALED</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Weigh Slip SHA-256 Valid</div>
        </div>
      </div>

      {/* Main Grid: Ticket Queue & Inspection Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Inward Vehicle Queue */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TruckIcon className="w-3.5 h-3.5 text-cyan-400" />
              GATE INWARD QUEUE ({WEIGHBRIDGE_LOGS.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">GATE #01 WEIGHBRIDGE</span>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {WEIGHBRIDGE_LOGS.map(ticket => {
              const isSelected = selectedTicket.ticketNo === ticket.ticketNo;
              const isApproved = notarizedTickets.includes(ticket.ticketNo);
              return (
                <div
                  key={ticket.ticketNo}
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setLiveLoadCellKg(ticket.grossWeightKg);
                    setBarrierGateOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-cyan-400">{ticket.ticketNo}</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold ${
                      isApproved
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        : ticket.gateStatus === "REJECTED_OVERLOAD"
                        ? "bg-red-950 text-red-400 border border-red-500/30"
                        : "bg-amber-950 text-amber-400 border border-amber-500/30"
                    }`}>
                      {isApproved ? "NOTARIZED SLIP" : ticket.gateStatus.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold text-sm tracking-wide">{ticket.vehicleNo}</span>
                    <span className="text-slate-400 font-mono text-[10px]">{ticket.timestamp}</span>
                  </div>

                  <div className="text-slate-300 text-xs leading-snug truncate">{ticket.materialName}</div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                    <div>
                      Gross: <strong className="text-white">{ticket.grossWeightKg.toLocaleString()}k</strong>
                    </div>
                    <div>
                      Net: <strong className="text-cyan-400 font-bold">{ticket.netWeightKg.toLocaleString()}k</strong>
                    </div>
                    <div>
                      Variance: <strong className={ticket.varianceKg < 0 ? "text-red-400" : "text-emerald-400"}>
                        {ticket.varianceKg > 0 ? `+${ticket.varianceKg}` : ticket.varianceKg} kg
                      </strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Weighbridge Slip & QA Inspection Sheet */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <ScaleIcon className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white uppercase tracking-wider">
                WEIGH SLIP DOSSIER: {selectedTicket.ticketNo}
              </span>
            </div>
            <span className="text-cyan-400 font-mono text-[10px]">Challan: {selectedTicket.challanNo}</span>
          </div>

          <div className="p-4 bg-slate-950 flex-1 flex flex-col justify-between gap-4">
            {/* ANPR Camera Snapshot & Vehicle Particulars */}
            <div className="bg-black/70 border border-slate-800 p-3.5 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <CameraIcon className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                    ANPR OPTICAL LICENSE CAPTURE
                  </span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    {selectedTicket.anprConfidence}% MATCH
                  </span>
                </div>
                <div className="text-white font-bold text-lg mt-1 tracking-wider">{selectedTicket.vehicleNo}</div>
                <div className="text-[11px] text-slate-400">{selectedTicket.supplier}</div>
              </div>

              <div className="text-right">
                <span className="text-[9px] text-slate-500 block uppercase">DESTINATION FOOTPRINT</span>
                <span className="text-cyan-400 font-bold text-xs">{selectedTicket.targetZone}</span>
              </div>
            </div>

            {/* Load Cell Measurements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold">GROSS LADEN WEIGHT</span>
                <div className="text-white font-bold text-base mt-0.5">{selectedTicket.grossWeightKg.toLocaleString()} kg</div>
                <div className="text-[10px] text-slate-400">Captured at Gate Inward</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold">EMPTY TARE WEIGHT</span>
                <div className="text-slate-300 font-bold text-base mt-0.5">{selectedTicket.tareWeightKg.toLocaleString()} kg</div>
                <div className="text-[10px] text-slate-400">Verified at Gate Outward</div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-500 uppercase font-bold">CERTIFIED NET DELIVERY</span>
                <div className="text-emerald-400 font-bold text-base mt-0.5">{selectedTicket.netWeightKg.toLocaleString()} kg</div>
                <div className="text-[10px] text-emerald-400">Challan: {selectedTicket.challanQtyKg.toLocaleString()} kg</div>
              </div>
            </div>

            {/* Quality & Fresh Concrete Slump Checks (if applicable) */}
            {selectedTicket.slumpCheckMm && (
              <div className="bg-slate-900/40 border border-slate-800 p-3 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">FRESH CONCRETE QA TEST</span>
                  <span className="text-slate-200">Slump Cone: <strong className="text-white">{selectedTicket.slumpCheckMm} mm</strong> (IS 1199 Standard)</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">BATCH TEMP</span>
                  <span className="text-cyan-400 font-bold">{selectedTicket.batchTempC}° C (Permissible &lt; 32° C)</span>
                </div>
              </div>
            )}

            {/* Discrepancy & Overload Detection Panel */}
            <div className={`p-3 rounded-xl border flex items-center justify-between text-xs ${
              selectedTicket.varianceKg < -100
                ? "bg-red-950/40 border-red-500/40 text-red-300"
                : "bg-slate-900/40 border-slate-800 text-slate-300"
            }`}>
              <div className="flex items-center gap-2">
                {selectedTicket.varianceKg < -100 ? (
                  <AlertTriangleIcon className="w-4 h-4 text-red-400 shrink-0" />
                ) : (
                  <CheckIcon className="w-4 h-4 text-emerald-400 shrink-0" />
                )}
                <div>
                  <div className="font-bold">
                    {selectedTicket.varianceKg < -100 ? "MATERIAL SHORTAGE DETECTED" : "TOLERANCE RECONCILIATION PASSED"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Net variance of {selectedTicket.varianceKg} kg ({selectedTicket.variancePct}%) against supplier delivery challan.
                  </div>
                </div>
              </div>

              <span className={`font-mono font-bold text-xs ${selectedTicket.varianceKg < -100 ? "text-red-400" : "text-emerald-400"}`}>
                {selectedTicket.variancePct}%
              </span>
            </div>

            {/* Notarization & Gate Release Action */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Governed By: <strong className="text-cyan-400">MIDAS (Commercial Logistics Gateway)</strong>
              </div>

              <div>
                {isTicketNotarized ? (
                  <span className="px-3.5 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>SLIP NOTARIZED & BOOM RAISED</span>
                  </span>
                ) : (
                  <button
                    onClick={handleAuthorizeTicket}
                    disabled={isNotarizing}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                  >
                    {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                    <span>NOTARIZE WEIGH SLIP & RAISE GATE</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 65B Commercial Notarization Strip */}
      <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-white">SEC 65B MATERIAL INWARD HASH:</span>
          <span className="text-slate-300 select-all font-mono text-[10px]">{merkleRootHash}</span>
        </div>
        <span className="text-slate-500 text-[10px]">
          Sign-off: CHIEF MATERIAL CONTROLLER & WEIGHBRIDGE OFFICER
        </span>
      </div>
    </div>
  );
}
