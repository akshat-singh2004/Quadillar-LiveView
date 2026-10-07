"use client";

import React, { useState } from "react";
import { logInwardTruckRecord } from "@/app/actions/gate-inward-actions";
import { Truck, Plus, Loader2, Scale, ShieldCheck, ShieldAlert } from "lucide-react";

interface Props {
  projectId: string;
}

const MATERIAL_CATEGORIES = [
  { code: "STEEL_REBAR", label: "Fe 500D TMT Reinforcement Steel (IS 1786)" },
  { code: "CEMENT_BULKER", label: "OPC 53 Grade Cement Bulker (IS 269)" },
  { code: "AGGREGATE_20MM", label: "Coarse Aggregate 20mm (IS 383)" },
  { code: "SAND_ZONE_II", label: "Manufactured Sand Zone II (IS 383)" },
  { code: "RMC_CONCRETE", label: "Ready-Mix Concrete (RMC) Transit Mixer" },
];

export function LogInwardTruckModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [vehicleNumber, setVehicleNumber] = useState("UP-32-BN-8812");
  const [vendorName, setVendorName] = useState("TATA Steel Ltd / Authorized Stockist");
  const [materialCategory, setMaterialCategory] = useState(MATERIAL_CATEGORIES[0].code);
  const [challanNumber, setChallanNumber] = useState("DC-2026-9041");
  const [challanWeightMt, setChallanWeightMt] = useState(25.400);
  const [grossWeightMt, setGrossWeightMt] = useState(38.250);
  const [tareWeightMt, setTareWeightMt] = useState(12.890);
  const [mtcBatchNumber, setMtcBatchNumber] = useState("TATA-HT-44812");
  const [hasMtcCertificate, setHasMtcCertificate] = useState(true);

  // Live net weight & variance preview
  const netWeightPreview = parseFloat(Math.max(0, grossWeightMt - tareWeightMt).toFixed(3));
  const varianceMtPreview = parseFloat((netWeightPreview - challanWeightMt).toFixed(3));
  const variancePctPreview = challanWeightMt > 0
    ? parseFloat(((Math.abs(varianceMtPreview) / challanWeightMt) * 100).toFixed(2))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await logInwardTruckRecord({
        projectId,
        vehicleNumber,
        vendorName,
        materialCategory,
        challanNumber,
        challanWeightMt,
        grossWeightMt,
        tareWeightMt,
        mtcBatchNumber,
        hasMtcCertificate,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to commit weighbridge record.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Log Inward Truck</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  CPWD Form 31 • Legal Metrology Act 2009
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Log Weighbridge Inward Ticket
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Vehicle Registration Number
                  </label>
                  <input
                    type="text"
                    required
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold uppercase"
                    placeholder="e.g. UP-32-BN-8812"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Vendor / Material Supplier
                  </label>
                  <input
                    type="text"
                    required
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                    placeholder="e.g. TATA Steel / UltraTech"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Material Specification
                  </label>
                  <select
                    value={materialCategory}
                    onChange={(e) => setMaterialCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  >
                    {MATERIAL_CATEGORIES.map((m) => (
                      <option key={m.code} value={m.code}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Delivery Challan Number
                  </label>
                  <input
                    type="text"
                    required
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>
              </div>

              {/* WEIGHBRIDGE METROLOGY DERIVATION (Gross - Tare = Net) */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold block flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Weighbridge Dual-Pass Telemetry (Gross &amp; Tare)</span>
                </span>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Challan Wt (MT)</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={challanWeightMt}
                      onChange={(e) => setChallanWeightMt(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Scale Gross (MT)</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={grossWeightMt}
                      onChange={(e) => setGrossWeightMt(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Scale Tare (MT)</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={tareWeightMt}
                      onChange={(e) => setTareWeightMt(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-800 items-center">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Measured Net Payload</span>
                    <strong className="text-emerald-400 text-base tabular-nums">{netWeightPreview.toFixed(3)} MT</strong>
                  </div>

                  <div className="text-right">
                    <span className="text-[9px] text-zinc-500 uppercase block">Challan Variance</span>
                    <span className={`text-xs font-bold tabular-nums ${variancePctPreview <= 0.5 ? "text-emerald-400" : variancePctPreview <= 2.5 ? "text-amber-400" : "text-rose-400"}`}>
                      {variancePctPreview}% ({varianceMtPreview >= 0 ? `+${varianceMtPreview}` : varianceMtPreview} MT)
                    </span>
                  </div>
                </div>
              </div>

              {/* MTC QUALITY ATTESTATION */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Mill Test Cert (MTC) Heat / Batch #
                  </label>
                  <input
                    type="text"
                    value={mtcBatchNumber}
                    onChange={(e) => setMtcBatchNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-mono"
                    placeholder="e.g. SAIL-HT-9921"
                  />
                </div>

                <div className="pt-4 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="mtcCheck"
                    checked={hasMtcCertificate}
                    onChange={(e) => setHasMtcCertificate(e.target.checked)}
                    className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="mtcCheck" className="text-zinc-300 text-xs select-none cursor-pointer">
                    MTC Attached &amp; IS Verified
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold uppercase rounded text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Generate GRS Form 31</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
