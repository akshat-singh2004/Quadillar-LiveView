"use client";

import React, { useState } from "react";
import { issueStatutoryCureNotice } from "@/app/actions/cure-notice-actions";
import { Plus, AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function IssueCureNoticeModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [defaultingAgency, setDefaultingAgency] = useState("Falcon Structural Steel Erectors");
  const [tradeClassification, setTradeClassification] = useState("Structural Rebar & Shuttering");
  const [clauseInvoked, setClauseInvoked] = useState("CPWD GCC Cl. 2 & 3 / FIDIC Cl. 15.1");
  const [defaultReason, setDefaultReason] = useState("CRITICAL_PATH_ABANDONMENT");
  const [curePeriodDays, setCurePeriodDays] = useState(7);
  const [contractValuationInr, setContractValuationInr] = useState(15000000);
  const [specificDefaultDetails, setSpecificDefaultDetails] = useState("Subcontractor demobilized critical-path bar bending gang from Grid SW-02, causing 14 calendar days of unexcused critical float slippage.");
  const [issuedBy, setIssuedBy] = useState("Akshat Singh Rathore (CEO & Lead Contracts Engineer)");

  const ldCap = Math.round(contractValuationInr * 0.10);
  const pbgRisk = Math.round(contractValuationInr * 0.05);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await issueStatutoryCureNotice({
        projectId,
        defaultingAgency,
        tradeClassification,
        clauseInvoked,
        defaultReason,
        curePeriodDays: Number(curePeriodDays),
        contractValuationInr: Number(contractValuationInr),
        specificDefaultDetails,
        issuedBy,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to issue statutory cure notice.");
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
        <span>+ Issue Statutory Cure Notice</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-rose-400 uppercase tracking-widest font-bold">
                  CPWD GCC Cl. 2 &amp; 3 / FIDIC Cl. 15.1 • Legal Default
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Serve Subcontractor Notice to Correct
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

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Defaulting Subcontractor
                  </label>
                  <input
                    type="text"
                    required
                    value={defaultingAgency}
                    onChange={(e) => setDefaultingAgency(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Trade / Package
                  </label>
                  <input
                    type="text"
                    required
                    value={tradeClassification}
                    onChange={(e) => setTradeClassification(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Default Classification
                  </label>
                  <select
                    value={defaultReason}
                    onChange={(e) => setDefaultReason(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-rose-400 text-xs font-bold"
                  >
                    <option value="CRITICAL_PATH_ABANDONMENT">Critical Path Abandonment / Float Breach</option>
                    <option value="QUALITY_NCR_NON_RECTIFICATION">Unrectified Structural NCR Defect</option>
                    <option value="BOCW_WAGE_BREACH">Statutory Minimum Wage / Ghost Worker Default</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Statutory Cure Period
                  </label>
                  <select
                    value={curePeriodDays}
                    onChange={(e) => setCurePeriodDays(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-400 font-bold text-xs"
                  >
                    <option value={7}>7 Calendar Days (Standard CPWD Cl. 3)</option>
                    <option value={14}>14 Calendar Days (FIDIC Cl. 15.1)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Subcontract Package Valuation (₹ INR)
                </label>
                <input
                  type="number"
                  required
                  value={contractValuationInr}
                  onChange={(e) => setContractValuationInr(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-bold text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Factual Particulars of Default
                </label>
                <textarea
                  rows={3}
                  required
                  value={specificDefaultDetails}
                  onChange={(e) => setSpecificDefaultDetails(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-300 text-xs font-sans leading-relaxed"
                />
              </div>

              {/* STATUTORY EXPOSURE PREVIEW */}
              <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Clause 2 Liquidated Damages Cap:</span>
                  <span className="font-bold font-mono text-rose-400">₹{ldCap.toLocaleString("en-IN")} (10%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Performance Security Deposit at Risk:</span>
                  <span className="font-bold font-mono text-amber-400">₹{pbgRisk.toLocaleString("en-IN")} (5%)</span>
                </div>
                <div className="border-t border-zinc-800 pt-1 text-[9px] text-zinc-400 font-sans">
                  Failure to cure within {curePeriodDays} days authorizes immediate risk-cost execution under CPWD GCC Clause 3.
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Sign &amp; Serve Cure Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
