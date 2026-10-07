"use client";

import React, { useState } from "react";
import { recordTurnstilePunch } from "@/app/actions/labor-actions";
import { Radio, Loader2, ArrowRight } from "lucide-react";

interface Props {
  projectId: string;
}

export function SimulateTurnstilePunchModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workerPin, setWorkerPin] = useState("PIN-7001");
  const [terminalId, setTerminalId] = useState("TURNSTILE-01-NORTH-GATE");
  const [direction, setDirection] = useState<"IN" | "OUT">("IN");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await recordTurnstilePunch({
        projectId,
        terminalId,
        workerPin,
        direction,
      });

      if (res.success && res.worker) {
        setMessage(`ACCESS GRANTED: ${res.worker.full_name} (${res.worker.contractor_agency}) Punched ${direction}.`);
        setTimeout(() => setIsOpen(false), 1400);
      } else {
        setMessage(res.error || "Turnstile transaction rejected.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setMessage(null);
        }}
        className="px-3.5 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer"
      >
        <Radio className="w-3.5 h-3.5 text-cyan-400" />
        <span>Hardware Ingress Test</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  IoT Turnstile TCP Packet Simulator
                </span>
                <h3 className="text-sm font-bold text-white uppercase mt-0.5">
                  Record Biometric Punch
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
                  Enrolled Worker PIN
                </label>
                <input
                  type="text"
                  required
                  value={workerPin}
                  onChange={(e) => setWorkerPin(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold uppercase"
                  placeholder="e.g. PIN-7001"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Terminal Gateway
                  </label>
                  <select
                    value={terminalId}
                    onChange={(e) => setTerminalId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-zinc-300 text-[10px]"
                  >
                    <option value="TURNSTILE-01-NORTH">Turnstile 01 (North)</option>
                    <option value="TURNSTILE-02-SOUTH">Turnstile 02 (South)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Direction
                  </label>
                  <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as "IN" | "OUT")}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-1.5 text-zinc-300 text-[10px]"
                  >
                    <option value="IN">IN (Entry)</option>
                    <option value="OUT">OUT (Exit)</option>
                  </select>
                </div>
              </div>

              {message && (
                <div className={`p-2.5 rounded-lg border text-[11px] font-sans ${
                  message.includes("GRANTED") ? "bg-emerald-950/60 border-emerald-800 text-emerald-300" : "bg-rose-950/60 border-rose-800 text-rose-300"
                }`}>
                  {message}
                </div>
              )}

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
                  <span>Trigger Ingress Punch</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
