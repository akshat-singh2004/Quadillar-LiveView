"use client";

import React, { useState } from "react";
import { addMeasurementEntry } from "@/app/actions/emb-actions";
import { Calculator, Plus, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  projectId: string;
}

const COMMON_ITEMS = [
  { code: "DSR-4.1.3", desc: "RCC M30 in Columns & Shear Walls", unit: "CUM", rate: 7450 },
  { code: "DSR-4.1.8", desc: "RCC M30 in Suspended Slabs & Beams", unit: "CUM", rate: 7200 },
  { code: "DSR-5.2.2", desc: "High Yield Strength Deformed (Fe 500D) Rebar", unit: "MT", rate: 68500 },
  { code: "DSR-5.9.1", desc: "Centering & Shuttering (Plywood System)", unit: "SQM", rate: 480 },
  { code: "DSR-6.1.1", desc: "AAC Blockwork in 1:4 Cement Mortar", unit: "CUM", rate: 4250 },
];

export function AddMeasurementLineModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [itemCode, setItemCode] = useState(COMMON_ITEMS[0].code);
  const [description, setDescription] = useState(COMMON_ITEMS[0].desc);
  const [gridLocation, setGridLocation] = useState("Tower Core / Grid B2-C3");
  const [numbersCount, setNumbersCount] = useState(1);
  const [lengthM, setLengthM] = useState(6.0);
  const [breadthM, setBreadthM] = useState(0.45);
  const [depthM, setDepthM] = useState(3.6);
  const [deductionQty, setDeductionQty] = useState(0);
  const [unit, setUnit] = useState(COMMON_ITEMS[0].unit);
  const [rateInr, setRateInr] = useState(COMMON_ITEMS[0].rate);

  // Dynamic geometric computation: Nos * L * B * D - Ded
  const grossQty = parseFloat((numbersCount * lengthM * (breadthM || 1) * (depthM || 1)).toFixed(3));
  const netQty = parseFloat(Math.max(0, grossQty - deductionQty).toFixed(3));
  const amountInr = Math.round(netQty * rateInr);

  const handleItemSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = COMMON_ITEMS.find((i) => i.code === e.target.value);
    if (selected) {
      setItemCode(selected.code);
      setDescription(selected.desc);
      setUnit(selected.unit);
      setRateInr(selected.rate);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await addMeasurementEntry({
        projectId,
        itemCode,
        description,
        gridLocation,
        numbersCount,
        lengthM,
        breadthM,
        depthM,
        grossQty,
        deductionQty,
        netQty,
        unit,
        rateInr,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to commit line");
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
        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Add Measurement Line</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  CPWD Works Manual Cl. 7 • Joint Field Record
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  New e-MB Measurement Line (Form 23)
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
                    CPWD DSR Standard Item
                  </label>
                  <select
                    value={itemCode}
                    onChange={handleItemSelect}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs focus:border-cyan-500 outline-none"
                  >
                    {COMMON_ITEMS.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.code} — {item.desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Structural Grid / Axis Location
                  </label>
                  <input
                    type="text"
                    required
                    value={gridLocation}
                    onChange={(e) => setGridLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs focus:border-cyan-500 outline-none"
                    placeholder="e.g. Tower Core Grid B2-C3"
                  />
                </div>
              </div>

              {/* 4 GEOMETRIC DIMENSIONS */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold block">
                  Field Dimension Geometry (L × B × D)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Nos</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={numbersCount}
                      onChange={(e) => setNumbersCount(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Length (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={lengthM}
                      onChange={(e) => setLengthM(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Breadth (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={breadthM}
                      onChange={(e) => setBreadthM(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Depth / H (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={depthM}
                      onChange={(e) => setDepthM(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-1 border-t border-zinc-800 text-center">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Gross Volume</span>
                    <strong className="text-zinc-200 text-xs tabular-nums">{grossQty} {unit}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Deductions</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={deductionQty}
                      onChange={(e) => setDeductionQty(Number(e.target.value))}
                      className="w-20 bg-zinc-950 border border-zinc-800 rounded text-center text-xs text-rose-400 font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[9px] text-cyan-400 uppercase block font-bold">Net Quantity</span>
                    <strong className="text-emerald-400 text-sm tabular-nums">{netQty} {unit}</strong>
                  </div>
                </div>
              </div>

              {/* VALUATION DERIVATION */}
              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Sanctioned Unit Rate (₹/{unit})
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={rateInr}
                    onChange={(e) => setRateInr(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>

                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-right">
                  <span className="text-[9px] text-zinc-500 uppercase block font-bold">Calculated Line Amount</span>
                  <div className="text-base font-bold text-emerald-400 tabular-nums">
                    ₹{amountInr.toLocaleString("en-IN")}
                  </div>
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
                  disabled={loading || netQty <= 0}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit to e-MB Ledger</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
