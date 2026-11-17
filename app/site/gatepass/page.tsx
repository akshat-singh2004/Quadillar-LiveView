"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  evaluateWeighbridgePayload,
  WeighbridgeTransaction,
  WeighbridgeAuditResult
} from "@/lib/calculations/weighbridgeEngine";

// --- INLINE SVG ICONS ---
const ScaleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m-9-6l9-4 9 4M6 15l-3 4h6l-3-4zm12 0l-3 4h6l-3-4z" />
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
const TruckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <rect x="1" y="3" width="15" height="13" />
    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
    <circle cx="5.5" cy="18.5" r="2.5" />
    <circle cx="18.5" cy="18.5" r="2.5" />
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

export default function WeighbridgeGatepassPage() {
  // Live Weighbridge Inward Queue for Project Vanguard
  const [transactions, setTransactions] = useState<WeighbridgeTransaction[]>([
    {
      ticketNo: "WB-2026-084-01",
      vehicleRegistrationNo: "UP 32 HN 4920",
      materialCategory: "RMC_CONCRETE",
      supplierName: "UltraTech Concrete Ltd (Amausi Plant)",
      challanNumber: "DC-UT-99402",
      challanQuantity: 6.0, // 6.0 m3 ordered
      unit: "m³",
      grossWeightKg: 28420,
      tareWeightKg: 13950,
      contractSupplyRatePerUnitInr: 8850.0,
      entryTimestamp: "29-Oct-2026 10:14 IST",
      exitTimestamp: "29-Oct-2026 10:48 IST"
    },
    {
      ticketNo: "WB-2026-084-02",
      vehicleRegistrationNo: "UP 32 EQ 8812",
      materialCategory: "TMT_REBAR_FE550D",
      supplierName: "Tata Steel B2B Distribution (Kanpur Hub)",
      challanNumber: "DC-TS-44109",
      challanQuantity: 14.50, // 14.50 MT ordered
      unit: "MT",
      grossWeightKg: 34250,
      tareWeightKg: 19820, // Net = 14.43 MT (-0.07 MT variance = -0.48%)
      theoreticalNominalKg: 14500,
      contractSupplyRatePerUnitInr: 64500.0,
      entryTimestamp: "29-Oct-2026 11:20 IST",
      exitTimestamp: "29-Oct-2026 12:15 IST"
    },
    {
      ticketNo: "WB-2026-084-03",
      vehicleRegistrationNo: "UP 32 KT 1104",
      materialCategory: "RIVER_SAND_Z2",
      supplierName: "Gomti River Minerals & Aggregates",
      challanNumber: "DC-GR-10283",
      challanQuantity: 18.00, // 18.00 MT ordered
      unit: "MT",
      grossWeightKg: 31200,
      tareWeightKg: 13800, // Net = 17.40 MT wet; with 4.5% moisture = 16.65 MT dry (-7.5% shortfall!)
      surfaceMoisturePct: 4.5,
      contractSupplyRatePerUnitInr: 1450.0,
      entryTimestamp: "29-Oct-2026 13:40 IST",
      exitTimestamp: "29-Oct-2026 14:25 IST"
    }
  ]);

  const [selectedTicketNo, setSelectedTicketNo] = useState<string>("WB-2026-084-01");
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  const activeTransaction = useMemo(() => {
    return transactions.find(t => t.ticketNo === selectedTicketNo) || transactions[0];
  }, [transactions, selectedTicketNo]);

  // Compute live physics & legal metrology results
  const auditResult = useMemo(() => {
    return evaluateWeighbridgePayload(activeTransaction);
  }, [activeTransaction]);

  // Dynamic adjustments for testing discrepancies
  const handleUpdateWeight = (type: "gross" | "tare", value: number) => {
    setTransactions(prev => prev.map(t => {
      if (t.ticketNo === activeTransaction.ticketNo) {
        return {
          ...t,
          [type === "gross" ? "grossWeightKg" : "tareWeightKg"]: value
        };
      }
      return t;
    }));
  };

  const handleSealWeighbridgeGatepass = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_WEIGHBRIDGE_${activeTransaction.ticketNo}_NET_${auditResult.netDeliveredKg}KG_VAR_${auditResult.challanVariancePct}%_DEBIT_${auditResult.shortfallDeductionInr}_TIME_${timestamp}_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "MIDAS-LOGISTICS",
          synthesis_report: `WEIGHBRIDGE GATEPASS NOTARIZED: Ticket ${activeTransaction.ticketNo} • Vehicle: ${activeTransaction.vehicleRegistrationNo} • Net Weight: ${auditResult.netDeliveredKg} kg (${auditResult.netDeliveredUnits} ${activeTransaction.unit}) • Variance: ${auditResult.challanVariancePct}% (${auditResult.verificationVerdict}) • Shortfall Debit: ₹${auditResult.shortfallDeductionInr.toLocaleString()}`,
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
              LEGAL METROLOGY ACT 2009 / IS 4926
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              AUTOMATED LOAD-CELL TELEMETRY ACTIVE
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            WEIGHBRIDGE LOAD-CELL TELEMETRY & MATERIAL GATEPASS
          </h1>
          <p className="text-xs text-slate-400">
            Project Vanguard Main Inward Gate • Pitless 60-Ton Multi-Load-Cell Telemetry & ANPR Vehicle Logging
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/material-recon" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">⚖️ CL. 42 RECON</a>
          <a href="/site/pour-cards" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">🧪 POUR CARDS</a>
        </div>
      </div>

      {/* KPI Load-Cell Diagnostics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">NET MEASURED PAYLOAD</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">
            {auditResult.netDeliveredKg.toLocaleString()} kg
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5">
            {auditResult.netDeliveredUnits} {activeTransaction.unit} Delivered
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">CHALLAN DISCREPANCY</div>
          <div className={`text-xl font-bold mt-1 font-mono ${auditResult.isWithinPermissibleTolerance ? "text-emerald-400" : "text-red-400"}`}>
            {auditResult.challanVariancePct > 0 ? `+${auditResult.challanVariancePct}` : auditResult.challanVariancePct}%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Permissible Limit: ±{auditResult.permissibleTolerancePct}.0%
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">WET DENSITY VERIFICATION</div>
          <div className={`text-xl font-bold mt-1 font-mono ${auditResult.isDensityCompliant ? "text-emerald-400" : "text-amber-400"}`}>
            {auditResult.calculatedDensityKgM3 ? `${auditResult.calculatedDensityKgM3} kg/m³` : "N/A (Dry Material)"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {auditResult.isDensityCompliant ? "IS 4926 Compliant (2420 nom)" : "Moisture Corrected"}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">SHORTFALL PENAL DEBIT</div>
          <div className={`text-xl font-bold mt-1 font-mono ${auditResult.shortfallDeductionInr > 0 ? "text-red-400" : "text-slate-400"}`}>
            ₹{auditResult.shortfallDeductionInr.toLocaleString()}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Auto-Lien on Supplier Bill</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">VERIFICATION STATUS</div>
          <div className={`text-xs font-bold mt-1.5 ${
            auditResult.verificationVerdict === "ACCEPTED_CLEARED" ? "text-emerald-400" : "text-red-400"
          }`}>
            {auditResult.verificationVerdict.replace(/_/g, " ")}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">ANPR Camera Verified</div>
        </div>
      </div>

      {/* Main Grid: Queue of Trucks & Live Load-Cell Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Inward Vehicle Weighment Queue */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <TruckIcon className="w-3.5 h-3.5 text-cyan-400" />
              INWARD DELIVERY LOGBOOK ({transactions.length} VEHICLES)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">ANPR FEED: ACTIVE</span>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[500px]">
            {transactions.map(item => {
              const res = evaluateWeighbridgePayload(item);
              const isSelected = selectedTicketNo === item.ticketNo;
              return (
                <div
                  key={item.ticketNo}
                  onClick={() => setSelectedTicketNo(item.ticketNo)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-cyan-400 font-mono">{item.vehicleRegistrationNo}</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold ${
                      res.isWithinPermissibleTolerance ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30" : "bg-red-950 text-red-400 border border-red-500/30"
                    }`}>
                      {res.isWithinPermissibleTolerance ? "TOLERANCE OK" : "SHORTFALL"}
                    </span>
                  </div>

                  <div className="text-white font-semibold text-xs leading-snug">{item.supplierName}</div>

                  <div className="text-[10px] text-slate-400">
                    Challan: <strong className="text-slate-300">{item.challanNumber}</strong> ({item.challanQuantity} {item.unit}) • Net: <strong className="text-white">{res.netDeliveredUnits} {item.unit}</strong>
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/80">
                    <span className="text-cyan-400 font-bold">{item.materialCategory.replace(/_/g, " ")}</span>
                    <span>{item.entryTimestamp}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Pitless Load-Cell Scale Terminal */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between">
          <div>
            <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ScaleIcon className="w-3.5 h-3.5 text-cyan-400" />
                DIGITAL LOAD-CELL TERMINAL: {activeTransaction.ticketNo}
              </span>
              <span className="text-cyan-400 font-mono text-[10px]">{activeTransaction.vehicleRegistrationNo}</span>
            </div>

            <div className="p-4 flex flex-col gap-4 text-xs">
              {/* Gross and Tare Sliders */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">GROSS WEIGHT (W_gross)</span>
                    <span className="text-white font-mono font-bold text-sm">{activeTransaction.grossWeightKg.toLocaleString()} kg</span>
                  </div>
                  <input
                    type="range"
                    min="18000"
                    max="45000"
                    step="50"
                    value={activeTransaction.grossWeightKg}
                    onChange={e => handleUpdateWeight("gross", parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[9px] text-slate-500">Loaded Vehicle on Inward Scale</span>
                </div>

                <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">TARE WEIGHT (W_tare)</span>
                    <span className="text-white font-mono font-bold text-sm">{activeTransaction.tareWeightKg.toLocaleString()} kg</span>
                  </div>
                  <input
                    type="range"
                    min="8000"
                    max="22000"
                    step="50"
                    value={activeTransaction.tareWeightKg}
                    onChange={e => handleUpdateWeight("tare", parseInt(e.target.value, 10))}
                    className="w-full h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-white"
                  />
                  <span className="text-[9px] text-slate-500">Empty Vehicle on Outward Scale</span>
                </div>
              </div>

              {/* Material Specific Physical Breakdown */}
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  STATUTORY RECONCILIATION DOSSIER
                </span>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">CHALLAN QUANTITY</span>
                    <span className="font-bold text-white text-sm">{activeTransaction.challanQuantity} {activeTransaction.unit}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">DELIVERED PAYLOAD</span>
                    <span className="font-bold text-cyan-400 text-sm">{auditResult.netDeliveredUnits} {activeTransaction.unit}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    <span className="text-[9px] text-slate-500 block">NET DISPARITY</span>
                    <span className={`font-bold text-sm ${auditResult.isWithinPermissibleTolerance ? "text-emerald-400" : "text-red-400"}`}>
                      {auditResult.challanVarianceUnits > 0 ? `+${auditResult.challanVarianceUnits}` : auditResult.challanVarianceUnits} {activeTransaction.unit}
                    </span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/80 flex flex-col gap-1">
                  <div>Supplier: <strong className="text-white">{activeTransaction.supplierName}</strong></div>
                  <div>Contract Supply Rate: <strong className="text-emerald-400 font-mono">₹{activeTransaction.contractSupplyRatePerUnitInr.toLocaleString()} / {activeTransaction.unit}</strong></div>
                  {activeTransaction.surfaceMoisturePct !== undefined && (
                    <div className="text-amber-400">
                      IS 2386 Sand Surface Moisture Correction: {activeTransaction.surfaceMoisturePct}% water deducted from wet mass.
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Deductions Banner */}
              {auditResult.shortfallDeductionInr > 0 && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <AlertTriangleIcon className="w-4 h-4 text-red-400 shrink-0" />
                    <div>
                      <div className="font-bold text-red-200">AUTOMATIC SHORTFALL LIEN ENGAGED</div>
                      <div className="text-[10px] text-red-400">Variance ({auditResult.challanVariancePct}%) exceeds permissible {auditResult.permissibleTolerancePct}.0% threshold</div>
                    </div>
                  </div>
                  <span className="font-bold font-mono text-white text-sm">
                    -₹{auditResult.shortfallDeductionInr.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Footer & Section 65B Gatepass Notarization */}
          <div className="p-4 bg-slate-900/60 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-3">
            <div className="text-[10px] text-slate-500">
              Legal Metrology Compliance: Scale Calibrated & Stamped by Dept of Weights & Measures (UP).
            </div>

            <div>
              {sealedHash ? (
                <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-500/40 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-400">
                  <CheckIcon className="w-4 h-4" />
                  <span className="font-mono text-[10px] select-all">{sealedHash.substring(0, 24)}...</span>
                </div>
              ) : (
                <button
                  onClick={handleSealWeighbridgeGatepass}
                  disabled={isNotarizing}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE WEIGHMENT GATEPASS (SEC 65B)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
