"use client";

import React, { useState } from "react";
import { createPourCard } from "@/app/actions/pour-card-actions";
import { Plus, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function CreatePourCardModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [structuralElement, setStructuralElement] = useState("Shear Wall SW-04 & Core Column C2");
  const [gridLocation, setGridLocation] = useState("Tower Core Grid B2-C3");
  const [levelElevation, setLevelElevation] = useState("Level +14.20m (L4 Slab)");
  const [concreteGrade, setConcreteGrade] = useState("M35");
  const [plannedVolumeM3, setPlannedVolumeM3] = useState(28.5);
  const [castingMethod, setCastingMethod] = useState("BOOM_PUMP");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await createPourCard({
        projectId,
        structuralElement,
        gridLocation,
        levelElevation,
        concreteGrade,
        plannedVolumeM3,
        castingMethod,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to initiate pour card.");
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
        <span>+ Initiate Pour Card</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  CPWD Works Manual Section 10 • Pre-Pour Gate
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Initiate Structural Pour Card
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
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Structural Element Description
                </label>
                <input
                  type="text"
                  required
                  value={structuralElement}
                  onChange={(e) => setStructuralElement(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Grid Location Axis
                  </label>
                  <input
                    type="text"
                    required
                    value={gridLocation}
                    onChange={(e) => setGridLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Level / Elevation
                  </label>
                  <input
                    type="text"
                    required
                    value={levelElevation}
                    onChange={(e) => setLevelElevation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Concrete Grade
                  </label>
                  <select
                    value={concreteGrade}
                    onChange={(e) => setConcreteGrade(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-400 font-bold text-xs"
                  >
                    {["M25", "M30", "M35", "M40", "M50"].map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Planned Volume (m³)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    required
                    value={plannedVolumeM3}
                    onChange={(e) => setPlannedVolumeM3(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold text-center"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Casting Method
                  </label>
                  <select
                    value={castingMethod}
                    onChange={(e) => setCastingMethod(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  >
                    <option value="BOOM_PUMP">Boom Pump</option>
                    <option value="STATIONARY_LINE">Stationary Line</option>
                    <option value="CRANE_BUCKET">Crane Bucket</option>
                    <option value="DIRECT_CHUTE">Direct Chute</option>
                  </select>
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
                  <span>Open Inspection Gate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
