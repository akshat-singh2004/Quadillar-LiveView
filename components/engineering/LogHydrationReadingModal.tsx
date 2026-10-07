"use client";

import React, { useState } from "react";
import { logThermocoupleReading } from "@/app/actions/maturity-actions";
import { Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  nodeId: string;
  nodeTag: string;
}

export function LogHydrationReadingModal({ projectId, nodeId, nodeTag }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [hoursSincePour, setHoursSincePour] = useState(72);
  const [coreTempC, setCoreTempC] = useState(48.5);
  const [surfaceTempC, setSurfaceTempC] = useState(36.0);
  const [ambientTempC, setAmbientTempC] = useState(28.0);

  const deltaPreview = parseFloat(Math.abs(coreTempC - surfaceTempC).toFixed(1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await logThermocoupleReading({
        projectId,
        nodeId,
        hoursSincePour,
        coreTempC,
        surfaceTempC,
        ambientTempC,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to commit telemetry reading.");
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
        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase text-[9px] transition cursor-pointer"
      >
        Log Telemetry Packet
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  Telemetry Packet Intake • {nodeTag}
                </span>
                <h3 className="text-sm font-bold text-white uppercase mt-0.5">
                  Thermocouple Gradient Ingress
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
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Hours Elapsed Since Casting
                </label>
                <input
                  type="number"
                  step="0.5"
                  required
                  value={hoursSincePour}
                  onChange={(e) => setHoursSincePour(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Core Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={coreTempC}
                    onChange={(e) => setCoreTempC(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-rose-400 text-xs font-bold text-center"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Surface Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={surfaceTempC}
                    onChange={(e) => setSurfaceTempC(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-400 text-xs font-bold text-center"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Ambient (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={ambientTempC}
                    onChange={(e) => setAmbientTempC(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-300 text-xs font-bold text-center"
                  />
                </div>
              </div>

              {/* LIVE DELTA GRADIENT CALCULATION */}
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[9px] text-zinc-500 uppercase block font-bold">Thermal Differential (ΔT)</span>
                  <span className={`text-sm font-bold tabular-nums ${deltaPreview <= 20.0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {deltaPreview}°C {deltaPreview <= 20.0 ? "(Safe ≤ 20°C)" : "(Breach > 20°C)"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-zinc-500 uppercase block font-bold">DEF Check</span>
                  <span className={`text-xs font-bold ${coreTempC <= 70.0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {coreTempC <= 70.0 ? "Pass (≤ 70°C)" : "DEF Alert"}
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
                  <span>Evaluate &amp; Commit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
