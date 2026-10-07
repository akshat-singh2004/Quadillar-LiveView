"use client";

import React, { useState } from "react";
import { adjudicateEotClaim } from "@/app/actions/hindrance-eot-actions";
import { ShieldCheck, Scale, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  hindranceId: string;
  hindranceCode: string;
  daysHindered: number;
}

export function AdjudicateEotModal({ projectId, hindranceId, hindranceCode, daysHindered }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [contractorAgency, setContractorAgency] = useState("L&T Construction (Civil Package)");
  const [claimedDays, setClaimedDays] = useState(daysHindered);
  const [eventDate, setEventDate] = useState("2026-09-10");
  const [noticeDate, setNoticeDate] = useState("2026-09-24");
  const [contractBaselineInr, setContractBaselineInr] = useState(25000000);

  // Live 28-day notice time-bar calculation
  const eventTime = new Date(eventDate).getTime();
  const noticeTime = new Date(noticeDate).getTime();
  const elapsedDays = Math.max(0, Math.round((noticeTime - eventTime) / (1000 * 3600 * 24)));
  const isTimeBarred = elapsedDays > 28;

  // Live Liquidated Damages calculation (1% per week, max 10%)
  const weeks = claimedDays / 7.0;
  const computedLd = Math.round(contractBaselineInr * (weeks * 0.01));
  const ldCap = Math.round(contractBaselineInr * 0.10);
  const shieldedLd = Math.min(computedLd, ldCap);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adjudicateEotClaim({
        projectId,
        hindranceId,
        contractorAgency,
        claimedDaysExtension: claimedDays,
        noticeEventDateIso: eventDate,
        noticeSubmissionDateIso: noticeDate,
        contractBaselineInr,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to adjudicate EOT claim.");
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
        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-emerald-950 border border-zinc-700 hover:border-emerald-800 text-zinc-300 hover:text-emerald-300 font-bold uppercase text-[9px] transition flex items-center gap-1 cursor-pointer"
      >
        <Scale className="w-3 h-3 text-emerald-400" />
        <span>Adjudicate EOT</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                  FIDIC Cl. 8.4 / 20.1 • EOT Statutory Claims
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Adjudicate EOT Claim ({hindranceCode})
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
                  Contractor Agency
                </label>
                <input
                  type="text"
                  required
                  value={contractorAgency}
                  onChange={(e) => setContractorAgency(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Event Occurrence Date
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Formal Notice Served Date
                  </label>
                  <input
                    type="date"
                    required
                    value={noticeDate}
                    onChange={(e) => setNoticeDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Days Extension Claimed
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={claimedDays}
                    onChange={(e) => setClaimedDays(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-emerald-400 font-bold text-center text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Contract Baseline Valuation (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={contractBaselineInr}
                    onChange={(e) => setContractBaselineInr(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-bold text-center text-xs"
                  />
                </div>
              </div>

              {/* STATUTORY ADJUDICATION PREVIEW */}
              <div className={`p-3 rounded-xl border space-y-1.5 text-[10px] ${
                isTimeBarred ? "bg-rose-950/40 border-rose-800/80" : "bg-emerald-950/40 border-emerald-800/80"
              }`}>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Notice Period Elapsed (FIDIC Cl. 20.1):</span>
                  <span className={`font-bold font-mono ${isTimeBarred ? "text-rose-400" : "text-emerald-400"}`}>
                    {elapsedDays} Days {isTimeBarred ? "(TIME-BARRED > 28d)" : "(Compliant ≤ 28d)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">CPWD Cl. 2 Liquidated Damages Shielded:</span>
                  <span className="font-bold font-mono text-cyan-400">
                    ₹{shieldedLd.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="border-t border-zinc-800 pt-1 flex justify-between font-bold">
                  <span className="text-zinc-300">Council Adjudication Verdict:</span>
                  <span className={isTimeBarred ? "text-rose-400" : "text-emerald-400"}>
                    {isTimeBarred ? "REJECTED (Time-Barred Notice)" : `APPROVED (+${claimedDays}d EOT Certified)`}
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
                  <span>Certify EOT Dossier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
