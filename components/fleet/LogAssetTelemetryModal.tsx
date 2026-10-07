"use client";

import React, { useState } from "react";
import { logAssetTelemetry } from "@/app/actions/fleet-actions";
import { Plus, Wrench, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function LogAssetTelemetryModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [assetCode, setAssetCode] = useState("TC-POTAIN-01");
  const [assetName, setAssetName] = useState("Potain Top-Slewing Tower Crane 50m Jib");
  const [category, setCategory] = useState<"TOWER_CRANE" | "CONCRETE_PUMP" | "TRANSIT_MIXER" | "EXCAVATOR">("TOWER_CRANE");
  const [plannedOperatingHours, setPlannedOperatingHours] = useState(8);
  const [actualOperatingHours, setActualOperatingHours] = useState(7.5);
  const [fuelConsumedLiters, setFuelConsumedLiters] = useState(95);
  const [oemRatedFuelBurnLph, setOemRatedFuelBurnLph] = useState(10.5);
  const [outputVolumeM3, setOutputVolumeM3] = useState(180);
  const [targetVolumeM3, setTargetVolumeM3] = useState(200);
  const [fitnessExpiryDateIso, setFitnessExpiryDateIso] = useState("2026-12-31");

  // Live OEE & Fuel Burn Preview
  const availability = plannedOperatingHours > 0 ? Math.min(1.0, actualOperatingHours / plannedOperatingHours) : 0;
  const performance = targetVolumeM3 > 0 ? Math.min(1.0, outputVolumeM3 / targetVolumeM3) : 1.0;
  const oee = parseFloat((availability * performance * 100).toFixed(1));

  const burnRate = actualOperatingHours > 0 ? fuelConsumedLiters / actualOperatingHours : 0;
  const fuelVariance = oemRatedFuelBurnLph > 0 ? parseFloat((((burnRate - oemRatedFuelBurnLph) / oemRatedFuelBurnLph) * 100).toFixed(1)) : 0;
  const isPilferage = fuelVariance > 15.0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await logAssetTelemetry({
        projectId,
        assetCode,
        assetName,
        category,
        plannedOperatingHours,
        actualOperatingHours,
        fuelConsumedLiters,
        oemRatedFuelBurnLph,
        outputVolumeM3,
        targetVolumeM3,
        fitnessExpiryDateIso,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to commit telemetry.");
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
        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Log Asset Telemetry</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  ISO 22400 / CPWD Form 31 • Plant Telematics
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Record Asset Telemetry Packet
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
                    Asset Identifier Code
                  </label>
                  <input
                    type="text"
                    required
                    value={assetCode}
                    onChange={(e) => setAssetCode(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-400 text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Machinery Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  >
                    <option value="TOWER_CRANE">Tower Crane (IS 13367)</option>
                    <option value="CONCRETE_PUMP">Boom Concrete Pump</option>
                    <option value="TRANSIT_MIXER">Transit Mixer 7m³</option>
                    <option value="EXCAVATOR">Hydraulic Excavator</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Equipment Description
                </label>
                <input
                  type="text"
                  required
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Actual Op. Hours
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={actualOperatingHours}
                    onChange={(e) => setActualOperatingHours(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-white font-bold text-center text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Fuel Consumed (L)
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={fuelConsumedLiters}
                    onChange={(e) => setFuelConsumedLiters(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-amber-400 font-bold text-center text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Fitness Expiry
                  </label>
                  <input
                    type="date"
                    required
                    value={fitnessExpiryDateIso}
                    onChange={(e) => setFitnessExpiryDateIso(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-300 text-xs text-center"
                  />
                </div>
              </div>

              {/* STATUTORY AUDIT PREVIEW */}
              <div className={`p-3 rounded-xl border space-y-1.5 text-[10px] ${
                isPilferage ? "bg-rose-950/40 border-rose-800/80" : "bg-zinc-900/60 border-zinc-800"
              }`}>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Fleet OEE (ISO 22400):</span>
                  <span className="font-bold font-mono text-cyan-400">{oee}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Fuel Burn Variance vs OEM:</span>
                  <span className={`font-bold font-mono ${isPilferage ? "text-rose-400" : "text-emerald-400"}`}>
                    {fuelVariance > 0 ? `+${fuelVariance}%` : `${fuelVariance}%`} {isPilferage ? "(PILFERAGE / MAINTENANCE FLAG)" : "(Nominal)"}
                  </span>
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
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit Telemetry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
