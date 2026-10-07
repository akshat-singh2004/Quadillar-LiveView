"use client";

import React, { useState } from "react";
import { logContemporaneousHindrance } from "@/app/actions/hindrance-eot-actions";
import { Plus, Clock, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function LogHindranceModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [delayCategory, setDelayCategory] = useState("CLIENT_DESIGN_HOLD");
  const [gridLocation, setGridLocation] = useState("Tower Core Axis SW-02");
  const [description, setDescription] = useState("Client structural revision on Shear Wall reinforcement delayed pour card inspection.");
  const [daysHindered, setDaysHindered] = useState(4.5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await logContemporaneousHindrance({
        projectId,
        delayCategory,
        gridLocation,
        description,
        daysHindered,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to log hindrance event.");
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
        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Log Site Hindrance</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-rose-400 uppercase tracking-widest font-bold">
                  CPWD GCC Cl. 5 / SCL Delay Protocol • Delay Forensics
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Register Contemporaneous Hindrance
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
                    Delay Category
                  </label>
                  <select
                    value={delayCategory}
                    onChange={(e) => setDelayCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  >
                    <option value="CLIENT_DESIGN_HOLD">Client Design Hold</option>
                    <option value="WEATHER_STOPPAGE">Weather Stoppage (IS 13367)</option>
                    <option value="SITE_ACCESS_DENIAL">Site Access Denial</option>
                    <option value="FORCE_MAJEURE">Force Majeure Event</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Grid Location Axis
                  </label>
                  <input
                    type="text"
                    required
                    value={gridLocation}
                    onChange={(e) => setGridLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Delay Description &amp; Cause of Hindrance
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Net Days Hindered
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={daysHindered}
                  onChange={(e) => setDaysHindered(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-rose-400 font-bold text-center text-xs"
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit Hindrance Log</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
