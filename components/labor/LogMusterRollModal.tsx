"use client";

import React, { useState } from "react";
import { auditAndLogMusterRoll } from "@/app/actions/labor-actions";
import { Plus, Users, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function LogMusterRollModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [contractorAgency, setContractorAgency] = useState("Falcon Steel Fixing Services");
  const [tradeClassification, setTradeClassification] = useState("BAR_BENDER");
  const [skillTier, setSkillTier] = useState<"SKILLED" | "SEMI_SKILLED" | "UNSKILLED">("SKILLED");
  const [dailyWageRateInr, setDailyWageRateInr] = useState(850);
  const [claimedPinsInput, setClaimedPinsInput] = useState("PIN-101, PIN-102, PIN-103, PIN-104, PIN-105, PIN-106, PIN-107, PIN-108");
  const [turnstilePinsInput, setTurnstilePinsInput] = useState("PIN-101, PIN-102, PIN-103, PIN-104, PIN-105, PIN-106");

  // Live reconciliation calculations
  const claimedList = claimedPinsInput.split(",").map((p) => p.trim()).filter(Boolean);
  const turnstileSet = new Set(turnstilePinsInput.split(",").map((p) => p.trim()).filter(Boolean));
  const ghostList = claimedList.filter((p) => !turnstileSet.has(p));
  const ghostCount = ghostList.length;
  const ghostDebitInr = ghostCount * dailyWageRateInr;

  const floorWage = skillTier === "SKILLED" ? 850 : skillTier === "SEMI_SKILLED" ? 720 : 580;
  const isWageCompliant = dailyWageRateInr >= floorWage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await auditAndLogMusterRoll({
        projectId,
        contractorAgency,
        tradeClassification,
        skillTier,
        dailyWageRateInr,
        claimedWorkerPins: claimedList,
        biometricTurnstilePins: Array.from(turnstileSet),
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to audit muster roll.");
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
        <span>+ Audit Daily Muster</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                  BOCW Act 1996 • Biometric Turnstile Reconciliation
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Audit Shift Labor Muster Roll
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
                  Contractor / Agency
                </label>
                <input
                  type="text"
                  required
                  value={contractorAgency}
                  onChange={(e) => setContractorAgency(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Trade
                  </label>
                  <select
                    value={tradeClassification}
                    onChange={(e) => setTradeClassification(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  >
                    <option value="BAR_BENDER">Bar Bender</option>
                    <option value="CARPENTER">Shuttering Carpenter</option>
                    <option value="MASON">Mason</option>
                    <option value="ELECTRICIAN">Electrician</option>
                    <option value="HELPER">Unskilled Helper</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Skill Tier
                  </label>
                  <select
                    value={skillTier}
                    onChange={(e) => {
                      const st = e.target.value as "SKILLED" | "SEMI_SKILLED" | "UNSKILLED";
                      setSkillTier(st);
                      setDailyWageRateInr(st === "SKILLED" ? 850 : st === "SEMI_SKILLED" ? 720 : 580);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-400 font-bold text-xs"
                  >
                    <option value="SKILLED">Skilled (₹850 floor)</option>
                    <option value="SEMI_SKILLED">Semi-Skilled (₹720 floor)</option>
                    <option value="UNSKILLED">Unskilled (₹580 floor)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Daily Wage (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={dailyWageRateInr}
                    onChange={(e) => setDailyWageRateInr(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-bold text-center text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Contractor Claimed Worker PINs (Comma-Separated)
                </label>
                <textarea
                  rows={2}
                  required
                  value={claimedPinsInput}
                  onChange={(e) => setClaimedPinsInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Turnstile Biometric Ingress Punches (Comma-Separated)
                </label>
                <textarea
                  rows={2}
                  required
                  value={turnstilePinsInput}
                  onChange={(e) => setTurnstilePinsInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-300 font-mono text-xs"
                />
              </div>

              {/* STATUTORY AUDIT PREVIEW */}
              <div className={`p-3 rounded-xl border space-y-1.5 text-[10px] ${
                ghostCount > 0 || !isWageCompliant
                  ? "bg-rose-950/40 border-rose-800/80"
                  : "bg-emerald-950/40 border-emerald-800/80"
              }`}>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Claimed vs Biometric Ingress:</span>
                  <span className="font-bold font-mono text-white">
                    {claimedList.length} Claimed / {turnstileSet.size} Punched
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Ghost Workers Detected:</span>
                  <span className={`font-bold font-mono ${ghostCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {ghostCount} Workers {ghostCount > 0 ? `(-₹${ghostDebitInr.toLocaleString("en-IN")} Debit)` : "✓ Zero"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-1">
                  <span className="text-zinc-400">Statutory Wage Floor (Min Wages Act):</span>
                  <span className={`font-bold font-mono ${isWageCompliant ? "text-emerald-400" : "text-rose-400"}`}>
                    ₹{dailyWageRateInr} / day {isWageCompliant ? `(≥ ₹${floorWage} Compliant)` : `(BREACH < ₹${floorWage})`}
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit Muster Audit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
