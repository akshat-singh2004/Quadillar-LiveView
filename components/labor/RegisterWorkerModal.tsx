"use client";

import React, { useState } from "react";
import { registerBocwWorker } from "@/app/actions/labor-actions";
import { Plus, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

const TRADE_PACKAGES = [
  "Barbender / Steel Reinforcement",
  "Shuttering / Formwork Carpenter",
  "Mason / Blockwork & Plastering",
  "Welder / Structural Steel",
  "Rigger / Crane Slinger",
  "General Civil Helper / Unskilled",
];

export function RegisterWorkerModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [workerPin, setWorkerPin] = useState("PIN-7001");
  const [fullName, setFullName] = useState("Ramesh Kumar");
  const [contractorAgency, setContractorAgency] = useState("Apex Structural Glazing Ltd");
  const [tradePackage, setTradePackage] = useState(TRADE_PACKAGES[0]);
  const [skillTier, setSkillTier] = useState<"SKILLED" | "SEMI_SKILLED" | "UNSKILLED">("SKILLED");
  const [dailyWageInr, setDailyWageInr] = useState(850);
  const [uanNumber, setUanNumber] = useState("101928374652");
  const [esicNumber, setEsicNumber] = useState("31009876543210001");
  const [ismwPassbookIssued, setIsmwPassbookIssued] = useState(true);

  const handleTierChange = (tier: "SKILLED" | "SEMI_SKILLED" | "UNSKILLED") => {
    setSkillTier(tier);
    if (tier === "SKILLED") setDailyWageInr(850);
    else if (tier === "SEMI_SKILLED") setDailyWageInr(720);
    else setDailyWageInr(580);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await registerBocwWorker({
        projectId,
        workerPin,
        fullName,
        contractorAgency,
        tradePackage,
        skillTier,
        dailyWageInr,
        uanNumber,
        esicNumber,
        ismwPassbookIssued,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to enroll workman.");
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
        <span>+ Register BOCW Workman</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  BOCW Act 1996 • Form XIII / XIV Enrollment
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Register Workman for Turnstile Access
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
                    Worker Biometric PIN / RFID ID
                  </label>
                  <input
                    type="text"
                    required
                    value={workerPin}
                    onChange={(e) => setWorkerPin(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold uppercase"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Full Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Subcontractor Agency
                  </label>
                  <input
                    type="text"
                    required
                    value={contractorAgency}
                    onChange={(e) => setContractorAgency(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Trade Package
                  </label>
                  <select
                    value={tradePackage}
                    onChange={(e) => setTradePackage(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  >
                    {TRADE_PACKAGES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* STATUTORY SKILL TIER & WAGE */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold block">
                  Statutory Wage &amp; Skill Classification
                </span>

                <div className="grid grid-cols-3 gap-2">
                  {(["SKILLED", "SEMI_SKILLED", "UNSKILLED"] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleTierChange(tier)}
                      className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                        skillTier === tier
                          ? "bg-cyan-500/10 border-cyan-500 text-cyan-300 font-bold"
                          : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <span className="text-[9px] uppercase block">{tier.replace("_", " ")}</span>
                    </button>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-1 border-t border-zinc-800">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold">Approved Daily Wage</span>
                  <div className="flex items-center gap-1">
                    <span className="text-zinc-500 text-xs">₹</span>
                    <input
                      type="number"
                      required
                      value={dailyWageInr}
                      onChange={(e) => setDailyWageInr(Number(e.target.value))}
                      className="w-24 bg-zinc-950 border border-zinc-800 rounded p-1 text-emerald-400 text-sm font-bold text-right"
                    />
                    <span className="text-[10px] text-zinc-500">/day</span>
                  </div>
                </div>
              </div>

              {/* STATUTORY SOCIAL SECURITY COMPLIANCE */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">
                    12-Digit EPFO UAN
                  </label>
                  <input
                    type="text"
                    value={uanNumber}
                    onChange={(e) => setUanNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-mono"
                    placeholder="e.g. 101928374652"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">
                    17-Digit ESIC Insurance #
                  </label>
                  <input
                    type="text"
                    value={esicNumber}
                    onChange={(e) => setEsicNumber(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-mono"
                    placeholder="e.g. 31009876543210001"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="ismwCheck"
                  checked={ismwPassbookIssued}
                  onChange={(e) => setIsmwPassbookIssued(e.target.checked)}
                  className="w-4 h-4 rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0 cursor-pointer"
                />
                <label htmlFor="ismwCheck" className="text-zinc-300 text-xs select-none cursor-pointer">
                  Inter-State Migrant Workman (ISMW Act Passbook Issued)
                </label>
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
                  <span>Enroll in Biometric Gate</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
