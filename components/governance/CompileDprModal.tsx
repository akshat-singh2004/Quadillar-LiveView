"use client";

import React, { useState } from "react";
import { compileDailyGovernanceDossier } from "@/app/actions/dpr-actions";
import { Plus, BookOpen, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function CompileDprModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [dprDate, setDprDate] = useState(new Date().toISOString().slice(0, 10));
  const [weatherSummary, setWeatherSummary] = useState("Clear sky, peak wind 14.5 km/h, zero rainfall");
  const [compiledBy, setCompiledBy] = useState("Resident Project Manager & QA Lead");
  const [summaryNarrative, setSummaryNarrative] = useState("Shift closeout: Full workforce attendance verified, concrete boom pump deployed on Grid B2-C3, zero safety stoppages.");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await compileDailyGovernanceDossier({
        projectId,
        dprDate,
        weatherSummary,
        compiledBy,
        summaryNarrative,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to compile daily dossier.");
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
        <span>+ Compile Shift DPR Dossier</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                  CPWD Works Manual Cl. 32 / FIDIC Cl. 4.21 • Shift Closeout
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Compile Daily Governance Dossier (DPR)
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
                    DPR Shift Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dprDate}
                    onChange={(e) => setDprDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Certifying Project Lead
                  </label>
                  <input
                    type="text"
                    required
                    value={compiledBy}
                    onChange={(e) => setCompiledBy(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Meteorological Environment Summary
                </label>
                <input
                  type="text"
                  required
                  value={weatherSummary}
                  onChange={(e) => setWeatherSummary(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-300 text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Executive Shift Narrative
                </label>
                <textarea
                  rows={3}
                  required
                  value={summaryNarrative}
                  onChange={(e) => setSummaryNarrative(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-300 text-xs font-sans leading-relaxed"
                />
              </div>

              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1 text-[10px] text-zinc-400">
                <span className="text-emerald-400 uppercase font-bold block">
                  Autonomous Multi-Agent Synthesis:
                </span>
                <p className="font-sans leading-relaxed">
                  Upon submission, the council queries live verified turnstile muster logs (Plutus), concrete volume (Aegis), fleet operating hours (Ananke), and critical path hindrances (Chronos), cryptographically anchoring the shift record into the Hermes Section 65B Merkle ledger.
                </p>
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
                  <span>Compile &amp; Seal Dossier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
