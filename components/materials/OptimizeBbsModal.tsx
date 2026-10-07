"use client";

import React, { useState } from "react";
import { optimizeRebarCuttingSchedule } from "@/app/actions/material-actions";
import { Scissors, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function OptimizeBbsModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [structuralElement, setStructuralElement] = useState("Core Column C2 Main Rebar (L4)");
  const [barDiameterMm, setBarDiameterMm] = useState(25);
  const [cutLengthsInput, setCutLengthsInput] = useState("5.8, 5.8, 4.2, 4.2, 3.8, 3.8, 2.4, 2.4");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cutLengthsM = cutLengthsInput
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      if (cutLengthsM.length === 0) {
        alert("Please provide valid comma-separated cut lengths in meters.");
        return;
      }

      const res = await optimizeRebarCuttingSchedule({
        projectId,
        structuralElement,
        barDiameterMm,
        cutLengthsM,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to optimize cutting schedule.");
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
        <Scissors className="w-3.5 h-3.5" />
        <span>+ Optimize Rebar BBS</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  IS 2502 • 1D Billet Cutting-Stock Optimizer
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Optimize Bar Bending Schedule
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
                    Bar Diameter (mm)
                  </label>
                  <select
                    value={barDiameterMm}
                    onChange={(e) => setBarDiameterMm(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  >
                    {[8, 10, 12, 16, 20, 25, 32].map((d) => (
                      <option key={d} value={d}>{d} mm ({(d * d / 162.2).toFixed(2)} kg/m)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Stock Billet Length
                  </label>
                  <input
                    type="text"
                    disabled
                    value="12.00 meters (Standard)"
                    className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-2 text-zinc-400 text-xs text-center"
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Required Cut Lengths in Meters (Comma-Separated)
                </label>
                <textarea
                  rows={3}
                  required
                  value={cutLengthsInput}
                  onChange={(e) => setCutLengthsInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-300 font-mono text-xs"
                />
                <span className="text-[9px] text-zinc-500 block mt-1">
                  Vulcan runs a Best-Fit Decreasing heuristic to pack pieces into minimum 12m stock billets with salvage calculation[cite: 1].
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
                  <span>Execute 1D Nesting</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
