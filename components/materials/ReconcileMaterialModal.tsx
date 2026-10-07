"use client";

import React, { useState } from "react";
import { reconcileMaterialConsumption } from "@/app/actions/material-actions";
import { Plus, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function ReconcileMaterialModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [materialType, setMaterialType] = useState<"STEEL" | "CEMENT">("STEEL");
  const [structuralElement, setStructuralElement] = useState("Tower Core SW-1 to SW-4 (L3 to L5)");
  const [theoreticalQty, setTheoreticalQty] = useState(120.0);
  const [actualConsumedQty, setActualConsumedQty] = useState(124.5);
  const [stipulatedRateInr, setStipulatedRateInr] = useState(65000);

  // Live CPWD Cl. 42 Preview
  const tolerancePct = materialType === "STEEL" ? 0.03 : 0.02;
  const permissibleLimit = theoreticalQty * (1 + tolerancePct);
  const excessQty = Math.max(0, actualConsumedQty - permissibleLimit);
  const penalDebitInr = Math.round(excessQty * (stipulatedRateInr * 2.0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await reconcileMaterialConsumption({
        projectId,
        materialType,
        structuralElement,
        theoreticalQty,
        actualConsumedQty,
        stipulatedRateInr,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to reconcile material.");
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
        className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Run Cl. 42 Reconciliation</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">
                  CPWD GCC Clause 42 • Materials Governance
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Material Consumption Reconciliation
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
                    Material Type
                  </label>
                  <select
                    value={materialType}
                    onChange={(e) => {
                      const t = e.target.value as "STEEL" | "CEMENT";
                      setMaterialType(t);
                      setStipulatedRateInr(t === "STEEL" ? 65000 : 7200);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  >
                    <option value="STEEL">Structural Steel / TMT (+3% Tol.)</option>
                    <option value="CEMENT">OPC 53 Cement (+2% Tol.)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Stipulated Rate (₹/MT)
                  </label>
                  <input
                    type="number"
                    required
                    value={stipulatedRateInr}
                    onChange={(e) => setStipulatedRateInr(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Structural Element Scope
                </label>
                <input
                  type="text"
                  required
                  value={structuralElement}
                  onChange={(e) => setStructuralElement(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Theoretical Requirement (MT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={theoreticalQty}
                    onChange={(e) => setTheoreticalQty(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs text-center"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Actual Inward Consumed (MT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={actualConsumedQty}
                    onChange={(e) => setActualConsumedQty(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold text-center"
                  />
                </div>
              </div>

              {/* STATUTORY CLAUSE 42 PREVIEW */}
              <div className={`p-3 rounded-xl border space-y-1 text-[11px] ${
                excessQty > 0 ? "bg-rose-950/40 border-rose-800/80" : "bg-emerald-950/40 border-emerald-800/80"
              }`}>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Permissible Ceiling (+{(tolerancePct * 100).toFixed(0)}%):</span>
                  <span className="font-bold text-white font-mono">{permissibleLimit.toFixed(2)} MT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Excess Unallowable Wastage:</span>
                  <span className={`font-bold font-mono ${excessQty > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {excessQty.toFixed(2)} MT
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-1 font-bold">
                  <span className="text-zinc-300">Penal Debit (2x Rate):</span>
                  <span className={`font-mono ${excessQty > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    ₹{penalDebitInr.toLocaleString("en-IN")}
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Certify Reconciliation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
