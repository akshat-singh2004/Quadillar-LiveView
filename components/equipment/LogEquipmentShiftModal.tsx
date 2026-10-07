"use client";

import React, { useState } from "react";
import { logEquipmentShift } from "@/app/actions/equipment-actions";
import { Fuel, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  equipmentId: string;
  equipmentCode: string;
  oemRateLph: number;
}

export function LogEquipmentShiftModal({ projectId, equipmentId, equipmentCode, oemRateLph }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [operatingHours, setOperatingHours] = useState(7.5);
  const [idlingHours, setIdlingHours] = useState(1.0);
  const [fuelIssuedLiters, setFuelIssuedLiters] = useState(115.0);
  const [outputAchievedM3, setOutputAchievedM3] = useState(180);
  const [targetOutputM3, setTargetOutputM3] = useState(200);

  // Live burn rate & variance calculations
  const effectiveHours = Math.max(0.5, operatingHours);
  const actualBurnRateLph = parseFloat((fuelIssuedLiters / effectiveHours).toFixed(2));
  const fuelVariancePct = oemRateLph > 0
    ? parseFloat((((actualBurnRateLph - oemRateLph) / oemRateLph) * 100).toFixed(1))
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await logEquipmentShift({
        projectId,
        equipmentId,
        operatingHours,
        idlingHours,
        fuelIssuedLiters,
        outputAchievedM3,
        targetOutputM3,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to commit shift log.");
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
        className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-bold uppercase text-[9px] transition flex items-center gap-1 cursor-pointer"
      >
        <Fuel className="w-3 h-3" />
        <span>Log Fuel &amp; Hours</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  CPWD Form 31 Shift Logbook • {equipmentCode}
                </span>
                <h3 className="text-sm font-bold text-white uppercase mt-0.5">
                  Record Hours &amp; Fuel Telematics
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

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Operating Hours (hrs)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    required
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Idling Hours (hrs)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={idlingHours}
                    onChange={(e) => setIdlingHours(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-400 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  High-Speed Diesel (HSD) Dispensed (Liters)
                </label>
                <input
                  type="number"
                  step="1"
                  min="0"
                  required
                  value={fuelIssuedLiters}
                  onChange={(e) => setFuelIssuedLiters(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-amber-400 text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Output Achieved (m³)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={outputAchievedM3}
                    onChange={(e) => setOutputAchievedM3(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Target Shift Output (m³)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    value={targetOutputM3}
                    onChange={(e) => setTargetOutputM3(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-400 text-xs"
                  />
                </div>
              </div>

              {/* LIVE FUEL CONSUMPTION TELEMETRY CARD */}
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 uppercase text-[9px] font-bold">Burn Rate</span>
                  <span className="font-bold text-white tabular-nums">{actualBurnRateLph} L/hr (OEM: {oemRateLph} L/hr)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-zinc-500 uppercase text-[9px] font-bold">Burn Variance</span>
                  <span className={`font-bold tabular-nums ${fuelVariancePct <= 15 ? "text-emerald-400" : "text-rose-400"}`}>
                    {fuelVariancePct > 0 ? `+${fuelVariancePct}%` : `${fuelVariancePct}%`} {fuelVariancePct > 15 ? "(Pilferage / Mechanical Flag)" : "(Normal)"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold uppercase rounded text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit Shift Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
