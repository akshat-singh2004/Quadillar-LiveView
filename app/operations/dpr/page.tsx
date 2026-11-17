"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- INLINE SVG ICONS ---
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const SunIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="12" cy="12" r="5" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
);
const TruckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
  </svg>
);
const HardHatIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 18h20M4 18v-3a8 8 0 0116 0v3M9 10a3 3 0 016 0" />
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

export default function VanguardDprPage() {
  const [dprStatus, setDprStatus] = useState<"DRAFT" | "SUBMITTED" | "NOTARIZED">("SUBMITTED");
  const [isSigning, setIsSigning] = useState(false);
  const [merkleHash, setMerkleHash] = useState("a418e21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4");
  const [signedTime, setSignedTime] = useState<string | null>(null);

  // 4-Zone Daily Quantity Matrix
  const [zoneQuantities, setZoneQuantities] = useState([
    { zone: "ZONE-A", name: "Foundation & Subgrade", todayQty: "0 m³", cumulative: "100%", unit: "Excavation & Footings", status: "COMPLETED" },
    { zone: "ZONE-B", name: "Ground Level Podium", todayQty: "32 m²", cumulative: "85%", unit: "Formwork & Columns", status: "ON_TRACK" },
    { zone: "ZONE-C", name: "3-Story Superstructure", todayQty: "14 MT", cumulative: "45%", unit: "Structural Steel H-Beams", status: "CRITICAL" },
    { zone: "ZONE-D", name: "Roof & Mechanical Plant", todayQty: "0 Units", cumulative: "0%", unit: "HVAC & Canopy Prep", status: "AWAITING_FRONT" },
  ]);

  // Heavy Equipment Hours (Scaled for 15m Hub)
  const plantMachinery = [
    { id: "EQ-01", name: "Potain IGO 50 Tower Crane", runHrs: "7.2 hrs", fuelLiters: "0 L (Electric)", status: "OPERATIONAL" },
    { id: "EQ-02", name: "Putzmeister TK 40 Trailer Pump", runHrs: "3.5 hrs", fuelLiters: "42 L", status: "OPERATIONAL" },
    { id: "EQ-03", name: "Transit Mixers (6m³ Batches)", runHrs: "4 Trips", fuelLiters: "65 L", status: "OPERATIONAL" },
    { id: "EQ-04", name: "125 kVA Standby DG Set", runHrs: "2.0 hrs", fuelLiters: "18 L", status: "STANDBY" },
  ];

  const handleAuthorizeNotarization = async () => {
    setIsSigning(true);
    const timestamp = new Date().toLocaleTimeString();
    const payload = `VANGUARD_DPR_084_NOTARIZATION_DATE_2026-10-29_TIME_${timestamp}_VANGUARD_HOLDINGS`;
    const hash = await generateSHA256(payload);

    setTimeout(async () => {
      setMerkleHash(hash);
      setDprStatus("NOTARIZED");
      setSignedTime(timestamp);
      setIsSigning(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "CHRONOS",
          synthesis_report: `DPR #084 AUTHORIZED & NOTARIZED • 4 Zones Reconciled • 48 Tradesmen Authenticated`,
          merkle_root_hash: hash
        });
      } catch (e) {}
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              DPR #084 • 29 OCT 2026
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              PROJECT VANGUARD
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            DAILY PROGRESS REPORT (DPR) & STATUTORY LOG
          </h1>
          <p className="text-xs text-slate-400">
            Vanguard Commercial Hub (Phase 1) • Lucknow IT Park • 10.3m x 10.9m Layout Baseline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/digital-twin" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">🏛️ 3D BIM TWIN</a>
          <a href="/site/gis" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">📡 GIS RADAR</a>
        </div>
      </div>

      {/* Weather Station & Environmental Telemetry */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-xl">
            <SunIcon className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500">AMBIENT TEMP</div>
            <div className="text-white font-bold text-sm">31.4° C</div>
            <div className="text-[10px] text-emerald-400">Clear Skies (Lucknow)</div>
          </div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500">RELATIVE HUMIDITY</div>
          <div className="text-white font-bold text-sm mt-0.5">48.2% RH</div>
          <div className="text-[10px] text-slate-400">Dew Point: 18.5° C</div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500">ANEMOMETER WIND</div>
          <div className="text-cyan-400 font-bold text-sm mt-0.5">3.2 m/s NW</div>
          <div className="text-[10px] text-emerald-400">Safe for Lifting</div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500">STATUTORY HINDRANCE</div>
          <div className="text-emerald-400 font-bold text-sm mt-0.5">0.0 Hours</div>
          <div className="text-[10px] text-slate-400">Zero Rainfall Stoppage</div>
        </div>

        <div>
          <div className="text-[10px] text-slate-500">SHIFT TIMING</div>
          <div className="text-white font-bold text-sm mt-0.5">08:00 – 18:00 IST</div>
          <div className="text-[10px] text-slate-400">General Day Shift</div>
        </div>
      </div>

      {/* 4-Zone Physical Progress Grid */}
      <div className="border border-slate-800 rounded-2xl bg-slate-900/40 overflow-hidden flex flex-col">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
          <span className="font-bold text-white uppercase tracking-wider">
            VANGUARD 4-ZONE EXECUTION QUANTITIES (TODAY VS. CUMULATIVE)
          </span>
          <span className="text-cyan-400 font-mono text-[10px]">15M MASTER BASELINE</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">ZONE REF</th>
                <th className="py-2.5 px-4">ARCHITECTURAL COMPONENT</th>
                <th className="py-2.5 px-4">TODAY'S EXECUTION</th>
                <th className="py-2.5 px-4">CUMULATIVE PROGRESS</th>
                <th className="py-2.5 px-4">DISCIPLINE UNIT</th>
                <th className="py-2.5 px-4 text-right">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {zoneQuantities.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-900/40 transition">
                  <td className="py-3 px-4 font-bold text-cyan-400">{item.zone}</td>
                  <td className="py-3 px-4 font-semibold text-white">{item.name}</td>
                  <td className="py-3 px-4 font-bold text-emerald-400">{item.todayQty}</td>
                  <td className="py-3 px-4">{item.cumulative}</td>
                  <td className="py-3 px-4 text-slate-400">{item.unit}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status === "ON_TRACK" ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" :
                      item.status === "COMPLETED" ? "bg-cyan-950 text-cyan-400 border border-cyan-500/30" :
                      item.status === "CRITICAL" ? "bg-amber-950 text-amber-400 border border-amber-500/30" :
                      "bg-slate-800 text-slate-400"
                    }`}>
                      {item.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operations Split: Equipment Telemetry & Labor Muster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Plant & Heavy Equipment Telemetry */}
        <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TruckIcon className="w-3.5 h-3.5 text-cyan-400" />
              HEAVY PLANT & MACHINERY LOG
            </span>
            <span className="text-[10px] text-slate-500 font-mono">ANANKE SYNC</span>
          </div>

          <div className="flex flex-col gap-2.5">
            {plantMachinery.map(eq => (
              <div key={eq.id} className="bg-slate-950/60 border border-slate-800/80 p-2.5 rounded-xl flex justify-between items-center text-xs">
                <div>
                  <div className="font-semibold text-white">{eq.name}</div>
                  <div className="text-[10px] text-slate-500">Burn: {eq.fuelLiters} • ID: {eq.id}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-cyan-400">{eq.runHrs}</div>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                    {eq.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Biometric Workforce Distribution */}
        <div className="lg:col-span-6 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <HardHatIcon className="w-3.5 h-3.5 text-emerald-400" />
              BIOMETRIC MUSTER (48 TRADESMEN)
            </span>
            <span className="text-[10px] text-emerald-400 font-mono">100% AUTH</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
              <div className="text-slate-500 text-[10px]">FORMWORK CARPENTERS</div>
              <div className="text-white font-bold text-base mt-0.5">18</div>
              <div className="text-[10px] text-slate-400">Zone B Slab Shutters</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
              <div className="text-slate-500 text-[10px]">STRUCTURAL WELDERS</div>
              <div className="text-white font-bold text-base mt-0.5">12</div>
              <div className="text-[10px] text-slate-400">Zone C Steel H-Beams</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
              <div className="text-slate-500 text-[10px]">MASONS & BRICKLAYERS</div>
              <div className="text-white font-bold text-base mt-0.5">10</div>
              <div className="text-[10px] text-slate-400">Core Walls</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 p-3 rounded-xl">
              <div className="text-slate-500 text-[10px]">GENERAL LABORERS</div>
              <div className="text-cyan-400 font-bold text-base mt-0.5">8</div>
              <div className="text-[10px] text-slate-400">Housekeeping & Logistics</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tripartite Statutory Sign-Off Deck & Section 65B Seal */}
      <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-5 flex flex-col gap-4 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-3">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheckIcon className="w-5 h-5 text-purple-400" />
              <span>TRIPARTITE STATUTORY ENDORSEMENT (DPR #084)</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Indian Evidence Act Section 65B Compliance • Forensic Digital Signature Chain
            </div>
          </div>

          <div className="flex items-center gap-3">
            {dprStatus === "NOTARIZED" ? (
              <span className="px-3.5 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-2">
                <CheckIcon className="w-4 h-4 text-emerald-400" />
                <span>NOTARIZED & AUDIT LOGGED ({signedTime || "13:25 IST"})</span>
              </span>
            ) : (
              <button
                onClick={handleAuthorizeNotarization}
                disabled={isSigning}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                {isSigning ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                <span>{isSigning ? "SEALING SECTION 65B CHAIN..." : "AUTHORIZE & NOTARIZE DPR"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Signer Chain Progression */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-500">STAGE 1: GENERAL CONTRACTOR</span>
            <div className="font-bold text-white mt-1">L&T Const. / Site In-charge</div>
            <div className="text-[10px] text-emerald-400 mt-1">✔ Submitted at 17:45 IST</div>
          </div>

          <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-xl flex flex-col justify-between">
            <span className="text-[10px] text-slate-500">STAGE 2: PROJECT MANAGEMENT (PMC)</span>
            <div className="font-bold text-white mt-1">CBRE India Pvt Ltd</div>
            <div className="text-[10px] text-emerald-400 mt-1">✔ Quantity Reconciled</div>
          </div>

          <div className={`p-3 rounded-xl flex flex-col justify-between border ${
            dprStatus === "NOTARIZED"
              ? "bg-purple-950/40 border-purple-500/50"
              : "bg-slate-950/70 border-slate-800"
          }`}>
            <span className="text-[10px] text-slate-500">STAGE 3: CLIENT ENTITY</span>
            <div className="font-bold text-white mt-1">Vanguard Holdings Group</div>
            <div className={`text-[10px] mt-1 ${dprStatus === "NOTARIZED" ? "text-purple-300 font-bold" : "text-amber-400"}`}>
              {dprStatus === "NOTARIZED" ? "✔ Section 65B Sealed" : "Pending Final Authorization"}
            </div>
          </div>
        </div>

        {/* SHA-256 Merkle Proof Strip */}
        <div className="bg-black/60 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-bold uppercase">SHA-256 MERKLE ROOT:</span>
            <span className="text-slate-300 select-all font-mono">{merkleHash}</span>
          </div>
          <span className="text-slate-500">Chain Status: Vanguard Block Synced</span>
        </div>
      </div>
    </div>
  );
}
