"use client";

import React, { useState } from "react";
import { logHydrationReading } from "@/app/actions/hydration-actions";
import { Plus, Thermometer, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function LogHydrationTelemetryModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [pourCardId, setPourCardId] = useState("PC-940211");
  const [structuralElement, setStructuralElement] = useState("Raft Foundation Bay R-02 (2.4m Depth)");
  const [sensorNodeCode] = useState("TH-NODE-B2-CORE");
  const [coreTempC, setCoreTempC] = useState(56.5);
  const [surfaceTempC, setSurfaceTempC] = useState(38.0);
  const [ambientTempC, setAmbientTempC] = useState(28.0);
  const [hoursSincePour, setHoursSincePour] = useState(44);
  const [targetFckMpa, setTargetFckMpa] = useState(40);

  // Live ASTM / CIRIA Calculation Previews
  const deltaT = parseFloat(Math.abs(coreTempC - surfaceTempC).toFixed(1));
  const isGradientSafe = deltaT <= 20.0;
  const isDefSafe = coreTempC <= 70.0;
  const avgTemp = (coreTempC + surfaceTempC) / 2;
  const maturityIndex = Math.max(0, Math.round((avgTemp - (-10.0)) * hoursSincePour));
  const normalizedProgress = Math.log10(Math.max(10, maturityIndex)) / 3.8;
  const estimatedStrength = parseFloat(Math.min(targetFckMpa * 1.15, targetFckMpa * normalizedProgress).toFixed(2));
  const strippingAllowed = estimatedStrength >= targetFckMpa * 0.70 && isGradientSafe && isDefSafe;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await logHydrationReading({
        projectId,
        pourCardId,
        structuralElement,
        sensorNodeCode,
        coreTempC,
        surfaceTempC,
        ambientTempC,
        hoursSincePour,
        targetFckMpa,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to log telemetry.");
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
        <span>+ Log Thermocouple Reading</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  ASTM C1074 / CIRIA C766 • Hydration Kinetics
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Record Thermocouple Telemetry
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
                    Pour Card Reference
                  </label>
                  <input
                    type="text"
                    required
                    value={pourCardId}
                    onChange={(e) => setPourCardId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-400 text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Specified Grade f_ck (MPa)
                  </label>
                  <input
                    type="number"
                    required
                    value={targetFckMpa}
                    onChange={(e) => setTargetFckMpa(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Structural Element Scope
                </label>
                <input
                  type="text"
                  required
                  value={structuralElement}
                  onChange={(e) => setStructuralElement(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
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
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-rose-400 font-bold text-center text-xs"
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
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-amber-400 font-bold text-center text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Hours Elapsed
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={hoursSincePour}
                    onChange={(e) => setHoursSincePour(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-cyan-300 font-bold text-center text-xs"
                  />
                </div>
              </div>

              {/* STATUTORY PREVIEW CARD */}
              <div className={`p-3 rounded-xl border space-y-1.5 text-[10px] ${
                !isGradientSafe ? "bg-rose-950/40 border-rose-800/80" : "bg-zinc-900/60 border-zinc-800"
              }`}>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Core-to-Surface Differential (CIRIA C766):</span>
                  <span className={`font-bold font-mono ${isGradientSafe ? "text-emerald-400" : "text-rose-400"}`}>
                    ΔT = {deltaT}°C {isGradientSafe ? "(Safe ≤ 20°C)" : "(CRACK RISK > 20°C)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Maturity Index (Nurse-Saul):</span>
                  <span className="text-white font-mono">{maturityIndex} °C·hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Estimated Compressive Strength:</span>
                  <span className="font-bold text-cyan-400 font-mono">
                    {estimatedStrength} MPa ({((estimatedStrength / targetFckMpa) * 100).toFixed(0)}% f_ck)
                  </span>
                </div>
                <div className="border-t border-zinc-800 pt-1.5 flex justify-between font-bold">
                  <span className="text-zinc-300">Formwork De-shuttering Gate:</span>
                  <span className={strippingAllowed ? "text-emerald-400" : "text-amber-400"}>
                    {strippingAllowed ? "✓ Ready to Strip (≥ 70% & ΔT Safe)" : "Hold (Curing Required)"}
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
