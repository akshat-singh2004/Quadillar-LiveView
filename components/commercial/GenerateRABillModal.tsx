"use client";

import React, { useState } from "react";
import { generateRunningAccountBill } from "@/app/actions/billing-actions";
import { Plus, Receipt, Loader2, DollarSign } from "lucide-react";

interface Props {
  projectId: string;
}

export function GenerateRABillModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [contractorName, setContractorName] = useState("L&T Construction (Civil Package)");
  const [billPeriodStart, setBillPeriodStart] = useState("2026-09-01");
  const [billPeriodEnd, setBillPeriodEnd] = useState("2026-09-30");
  const [grossAmountInr, setGrossAmountInr] = useState(12500000);
  const [baseLaborIndexL0, setBaseLaborIndexL0] = useState(210);
  const [currentLaborIndexLi, setCurrentLaborIndexLi] = useState(225);
  const [unexcusedDelayDays, setUnexcusedDelayDays] = useState(0);

  // Live preview calculations
  const escalation = baseLaborIndexL0 > 0 && currentLaborIndexLi > baseLaborIndexL0
    ? 0.85 * 0.25 * grossAmountInr * ((currentLaborIndexLi - baseLaborIndexL0) / baseLaborIndexL0)
    : 0;
  const totalValuation = grossAmountInr + escalation;
  const retention = Math.round(totalValuation * 0.05);
  const bocwCess = Math.round(totalValuation * 0.01);
  const gstTds = Math.round(totalValuation * 0.02);
  const itTds = Math.round(totalValuation * 0.02);
  const totalDeductions = retention + bocwCess + gstTds + itTds;
  const netEstimated = totalValuation - totalDeductions;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await generateRunningAccountBill({
        projectId,
        contractorName,
        billPeriodStart,
        billPeriodEnd,
        grossAmountInr,
        baseLaborIndexL0,
        currentLaborIndexLi,
        unexcusedDelayDays,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to certify bill.");
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
        <span>+ Generate RA Bill (IPC)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                  CPWD Works Manual Cl. 7 / FIDIC Cl. 14 • Commercial Gate
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Certify Interim Running Account Bill
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
                  Contractor / Vendor Agency
                </label>
                <input
                  type="text"
                  required
                  value={contractorName}
                  onChange={(e) => setContractorName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Period Start Date
                  </label>
                  <input
                    type="date"
                    required
                    value={billPeriodStart}
                    onChange={(e) => setBillPeriodStart(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Period End Date
                  </label>
                  <input
                    type="date"
                    required
                    value={billPeriodEnd}
                    onChange={(e) => setBillPeriodEnd(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Gross Work Done Valuation (₹)
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={grossAmountInr}
                  onChange={(e) => setGrossAmountInr(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-emerald-400 font-bold text-sm text-center"
                />
              </div>

              {/* STATUTORY 10CC & LD CONTROLS */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Base Labor Index L₀
                  </label>
                  <input
                    type="number"
                    value={baseLaborIndexL0}
                    onChange={(e) => setBaseLaborIndexL0(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-zinc-300 text-center text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Current Labor Index Lᵢ
                  </label>
                  <input
                    type="number"
                    value={currentLaborIndexLi}
                    onChange={(e) => setCurrentLaborIndexLi(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-cyan-400 text-center text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Unexcused Delays (d)
                  </label>
                  <input
                    type="number"
                    value={unexcusedDelayDays}
                    onChange={(e) => setUnexcusedDelayDays(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-rose-400 text-center text-xs"
                  />
                </div>
              </div>

              {/* LIVE WATERFALL BREAKDOWN PREVIEW */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1.5 text-[10px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Gross Valuation + Cl. 10CC Escalation:</span>
                  <span className="text-white font-bold">₹{totalValuation.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>5% Retention Escrow (Cl. 1A):</span>
                  <span>-₹{retention.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>1% BOCW Welfare Cess:</span>
                  <span>-₹{bocwCess.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>2% GST TDS + 2% IT TDS (Sec. 51 / 194C):</span>
                  <span>-₹{(gstTds + itTds).toLocaleString("en-IN")}</span>
                </div>
                <div className="border-t border-zinc-800 pt-1.5 flex justify-between text-xs font-bold">
                  <span className="text-emerald-400">Net Estimated Disbursement:</span>
                  <span className="text-emerald-300">₹{netEstimated.toLocaleString("en-IN")}</span>
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
                  <span>Sign &amp; Certify RA Bill</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
