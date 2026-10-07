"use client";

import React, { useState } from "react";
import { logAtmosphericGasTest } from "@/app/actions/ptw-actions";
import { Gauge, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  permitId: string;
  permitNumber: string;
}

export function LogAtmosphericTestModal({ projectId, permitId, permitNumber }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [oxygenPct, setOxygenPct] = useState(20.9);
  const [combustibleLelPct, setCombustibleLelPct] = useState(0.0);
  const [h2sPpm, setH2sPpm] = useState(0.0);
  const [coPpm, setCoPpm] = useState(2.0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await logAtmosphericGasTest({
        projectId,
        permitId,
        oxygenPct,
        combustibleLelPct,
        h2sPpm,
        coPpm,
        testedBy: "Certified Gas Tester",
      });

      if (res.success) {
        if (!res.isAtmosphereSafe) {
          alert("DANGER: Toxic/combustible gas limit breached. Permit has been AUTOMATICALLY REVOKED.");
        }
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to log atmospheric test.");
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
        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-300 font-bold uppercase text-[9px] transition flex items-center gap-1 cursor-pointer"
      >
        <Gauge className="w-3 h-3" />
        <span>Log 4-Gas Test</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  OSHA 1910.146 • {permitNumber}
                </span>
                <h3 className="text-sm font-bold text-white uppercase mt-0.5">
                  Calibrated 4-Gas Telemetry
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
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Oxygen O2 (19.5 - 23.5%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={oxygenPct}
                    onChange={(e) => setOxygenPct(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-cyan-400 text-center font-bold"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Combustible LEL (&lt; 10%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={combustibleLelPct}
                    onChange={(e) => setCombustibleLelPct(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-amber-400 text-center font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    H2S Toxic (&lt; 10 ppm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={h2sPpm}
                    onChange={(e) => setH2sPpm(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-rose-400 text-center font-bold"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Carbon Monoxide (&lt; 25 ppm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={coPpm}
                    onChange={(e) => setCoPpm(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                  />
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
                  className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Verify Atmosphere</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
