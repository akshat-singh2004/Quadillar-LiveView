"use client";

import React, { useState } from "react";
import { saveDprDraft } from "@/app/actions/dpr-actions";
import { FileText, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  totalManpower: number;
}

export function SaveDprDraftModal({ projectId, totalManpower }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [shiftType, setShiftType] = useState("DAY_SHIFT");
  const [weatherSummary, setWeatherSummary] = useState("Clear / 32°C");
  const [temperatureC, setTemperatureC] = useState(32.0);
  const [shiftHours, setShiftHours] = useState(8.5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await saveDprDraft({
        projectId,
        shiftType,
        weatherSummary,
        temperatureC,
        shiftHours,
        totalManpower,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to save draft.");
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
        className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 font-bold uppercase text-xs transition cursor-pointer"
      >
        Save Daily DPR Draft
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  CPWD Works Manual Section 18
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Configure Daily DPR Parameters
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
                    Shift Mode
                  </label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  >
                    <option value="DAY_SHIFT">Day Shift (Standard)</option>
                    <option value="NIGHT_SHIFT">Night Shift (Concreting)</option>
                    <option value="EXTENDED_SHIFT">Extended Overtime</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Shift Duration (hrs)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={shiftHours}
                    onChange={(e) => setShiftHours(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Weather Condition
                  </label>
                  <input
                    type="text"
                    required
                    value={weatherSummary}
                    onChange={(e) => setWeatherSummary(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Ambient Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={temperatureC}
                    onChange={(e) => setTemperatureC(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-amber-400 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase text-[10px] font-bold">Computed Man-Hours</span>
                <span className="text-cyan-400 font-bold tabular-nums">
                  {(totalManpower * shiftHours).toFixed(1)} Man-Hours ({totalManpower} Workers)
                </span>
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
                  <span>Save Draft</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
