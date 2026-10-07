"use client";

import React, { useState } from "react";
import { registerSiteHindrance } from "@/app/actions/dpr-actions";
import { Clock, Plus, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

const DELAY_CATEGORIES = [
  "Drawing Revision Unavailable (Architect Hold)",
  "Unprecedented Meteorological Ingress (Force Majeure)",
  "Workfront Access Denial / Clear Handover Missing",
  "Material Delivery Disruption / Supply Chain Hold",
  "Statutory Inspector Stoppage / Third-Party NOC Hold",
];

export function RegisterHindranceModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [delayCategory, setDelayCategory] = useState(DELAY_CATEGORIES[0]);
  const [description, setDescription] = useState("Awaiting revised shear wall reinforcement detail from architect of record.");
  const [gridLocation, setGridLocation] = useState("Grid B-C / Axis 02");
  const [daysHindered, setDaysHindered] = useState(1.0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await registerSiteHindrance({
        projectId,
        delayCategory,
        description,
        gridLocation,
        daysHindered,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to register delay event.");
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
        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Register Delay Event</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">
                  CPWD GCC Cl. 5 / FIDIC Cl. 8.4 Contemporaneous Notice
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Register Critical Delay Event
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
                  Delay Classification Category
                </label>
                <select
                  value={delayCategory}
                  onChange={(e) => setDelayCategory(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs focus:border-amber-500 outline-none"
                >
                  {DELAY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Affected Structural Grid / Axis
                </label>
                <input
                  type="text"
                  required
                  value={gridLocation}
                  onChange={(e) => setGridLocation(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  placeholder="e.g. Grid B-C / Axis 02"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Days of Critical Float Hindered
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={daysHindered}
                  onChange={(e) => setDaysHindered(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-amber-400 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Contemporaneous Event Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-sans"
                />
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit to Delay Journal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
