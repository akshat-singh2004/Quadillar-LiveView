// components/engineering/BBSDetailModal.tsx
"use client";

import React, { useState, useMemo } from "react";
import { X, Plus, Calculator, Layers, AlertTriangle, CheckCircle2 } from "lucide-react";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type RebarDiameter = 8 | 10 | 12 | 16 | 20 | 25 | 32;
export type BarShape = "Straight" | "L-Bend" | "Crank" | "Stirrup";

export interface BBSFormData {
  elementTag: string;
  memberType: string;
  diameterMm: RebarDiameter;
  barShape: BarShape;
  numberOfBars: number;
  spacingCcMm: number;
  clearCoverMm: number;
  cutLengthPerBarM: number;
  bends45Count: number;
  bends90Count: number;
}

export interface BBSDetailModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSave?: (data: any) => void;
  trigger?: React.ReactNode;
}

const REBAR_DIAMETERS: RebarDiameter[] = [8, 10, 12, 16, 20, 25, 32];
const BAR_SHAPES: BarShape[] = ["Straight", "L-Bend", "Crank", "Stirrup"];

// Unit weight in kg/m per IS:1786 (d^2 / 162.2)
const UNIT_WEIGHTS: Record<RebarDiameter, number> = {
  8: 0.395,
  10: 0.617,
  12: 0.888,
  16: 1.58,
  20: 2.47,
  25: 3.858,
  32: 6.313,
};

// ---------------------------------------------------------------------------
// Client Component: BBSDetailModal
// ---------------------------------------------------------------------------

export function BBSDetailModal({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onSave,
  trigger,
}: BBSDetailModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleOpen = () => {
    if (!isControlled) setInternalIsOpen(true);
  };

  const handleClose = () => {
    if (controlledOnClose) {
      controlledOnClose();
    }
    if (!isControlled) {
      setInternalIsOpen(false);
    }
  };

  // Form State
  const [elementTag, setElementTag] = useState("C1-C4 Columns L3");
  const [memberType, setMemberType] = useState("Column");
  const [diameterMm, setDiameterMm] = useState<RebarDiameter>(20);
  const [barShape, setBarShape] = useState<BarShape>("L-Bend");
  const [numberOfBars, setNumberOfBars] = useState(24);
  const [spacingCcMm, setSpacingCcMm] = useState(150);
  const [clearCoverMm, setClearCoverMm] = useState(40);
  const [cutLengthPerBarM, setCutLengthPerBarM] = useState(5.85);
  const [bends45Count, setBends45Count] = useState(0);
  const [bends90Count, setBends90Count] = useState(2);
  const [committedNotice, setCommittedNotice] = useState(false);

  // Calculations
  // Bend Deduction: 45 deg = 1d, 90 deg = 2d
  const bendDeductionMm = useMemo(() => {
    return bends45Count * 1 * diameterMm + bends90Count * 2 * diameterMm;
  }, [bends45Count, bends90Count, diameterMm]);

  // Standard 12m Billet Nesting Analysis
  // Total cut length per single bar
  const totalBarLengthM = cutLengthPerBarM;
  const cutsPerBillet = Math.floor(12 / (totalBarLengthM || 1));
  const residualScrapLengthM =
    cutsPerBillet > 0
      ? parseFloat((12 - cutsPerBillet * totalBarLengthM).toFixed(3))
      : 12;
  const scrapRatePct = parseFloat(((residualScrapLengthM / 12) * 100).toFixed(1));

  // Weight Calculation
  const totalLengthM = totalBarLengthM * numberOfBars;
  const unitWeightKgM = UNIT_WEIGHTS[diameterMm] || (diameterMm * diameterMm) / 162.2;
  const totalWeightKg = totalLengthM * unitWeightKgM;
  const totalWeightMt = totalWeightKg / 1000;

  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      elementTag,
      memberType,
      diameterMm,
      barShape,
      numberOfBars,
      spacingCcMm,
      clearCoverMm,
      cutLengthPerBarM,
      bendDeductionMm,
      residualScrapLengthM,
      scrapRatePct,
      totalLengthM,
      totalWeightMt,
      status: scrapRatePct <= 3.0 ? "Approved for Bending" : "Excess Wastage Flag",
    };

    onSave?.(payload);
    setCommittedNotice(true);
    setTimeout(() => {
      setCommittedNotice(false);
      handleClose();
    }, 1200);
  };

  return (
    <>
      {/* Uncontrolled Trigger Button */}
      {!isControlled &&
        (trigger ? (
          <div onClick={handleOpen}>{trigger}</div>
        ) : (
          <button
            type="button"
            onClick={handleOpen}
            className="bg-zinc-100 text-zinc-950 hover:bg-zinc-300 font-bold uppercase tracking-wider text-xs px-4 py-2.5 flex items-center gap-2 transition-colors cursor-pointer shadow-none font-mono"
          >
            <Plus className="h-4 w-4" />
            <span>New BBS Schedule</span>
          </button>
        ))}

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl relative my-8">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-mono tracking-widest text-zinc-400 uppercase">
                    IS:2502 &amp; IS:1786 REBAR COMPLIANCE
                  </span>
                </div>
                <h2 className="text-base font-bold uppercase tracking-wider text-zinc-100 font-mono mt-1">
                  BBS Detailing &amp; 12m Billet Nesting Optimizer
                </h2>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Structural Detailing, Bend Deductions, and Residual Off-Cut Audit
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="text-zinc-400 hover:text-zinc-100 p-1 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Success Notice */}
            {committedNotice && (
              <div className="mt-4 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>Schedule committed and cut list dispatched to steel fabrication yard!</span>
              </div>
            )}

            {/* Form Matrix */}
            <form onSubmit={handleCommit} className="mt-5 space-y-5 font-mono text-xs">
              {/* Row 1: Element Tag & Member Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                    Structural Element Tag *
                  </label>
                  <input
                    type="text"
                    required
                    value={elementTag}
                    onChange={(e) => setElementTag(e.target.value)}
                    placeholder="e.g., Retaining Wall RW-02, C1-C4 Columns L3"
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                    Member Type *
                  </label>
                  <select
                    value={memberType}
                    onChange={(e) => setMemberType(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  >
                    <option value="Column">Column (Compression Member)</option>
                    <option value="Grade Beam">Grade Beam (Flexural Member)</option>
                    <option value="Retaining Wall">Retaining Wall (Earth Retention)</option>
                    <option value="Shear Wall">Shear Wall (Lateral Resisting)</option>
                    <option value="Slab Deck">Slab Deck (Two-Way/One-Way)</option>
                    <option value="Raft Foundation">Raft Foundation / Footing</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Diameter Selector */}
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-2">
                  Nominal Bar Diameter (mm) - Fe500D TMT
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {REBAR_DIAMETERS.map((dia) => (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => setDiameterMm(dia)}
                      className={`py-2 text-center border font-mono transition-colors cursor-pointer ${
                        diameterMm === dia
                          ? "bg-zinc-100 text-zinc-950 border-zinc-100 font-bold"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700"
                      }`}
                    >
                      <span className="text-xs">{dia}</span>
                      <span className="text-[10px] block opacity-70">mm</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: Bar Shape Selection */}
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-2">
                  Bar Shape Geometry (IS:2502)
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {BAR_SHAPES.map((shape) => (
                    <button
                      key={shape}
                      type="button"
                      onClick={() => setBarShape(shape)}
                      className={`py-2 px-3 text-center border font-mono text-xs transition-colors cursor-pointer ${
                        barShape === shape
                          ? "bg-zinc-800 text-zinc-100 border-zinc-600 font-bold"
                          : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                      }`}
                    >
                      {shape}
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 4: Number of Bars & Spacing & Clear Cover */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                    Number of Bars *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={numberOfBars}
                    onChange={(e) => setNumberOfBars(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                    Spacing (c/c mm)
                  </label>
                  <input
                    type="number"
                    min={50}
                    step={10}
                    value={spacingCcMm}
                    onChange={(e) => setSpacingCcMm(parseInt(e.target.value, 10) || 150)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase tracking-wider mb-1">
                    Clear Cover (mm)
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={100}
                    value={clearCoverMm}
                    onChange={(e) => setClearCoverMm(parseInt(e.target.value, 10) || 40)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono tabular-nums"
                  />
                </div>
              </div>

              {/* Row 5: Bend Deductions (45 deg = 1d, 90 deg = 2d) */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                    Bend Deductions (IS:2502 Cl. 4.2)
                  </span>
                  <span className="text-zinc-300 text-xs">
                    Total Deduction: <strong className="text-emerald-400">{bendDeductionMm} mm</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-500 text-[10px] mb-1">
                      45° Bends (Deduction: 1d = {1 * diameterMm} mm / bend)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={bends45Count}
                      onChange={(e) => setBends45Count(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-500 text-[10px] mb-1">
                      90° Bends (Deduction: 2d = {2 * diameterMm} mm / bend)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={bends90Count}
                      onChange={(e) => setBends90Count(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono tabular-nums"
                    />
                  </div>
                </div>
              </div>

              {/* Row 6: Standard 12m Billet Nesting & Scrap Telemetry */}
              <div className="p-3.5 bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                    Standard 12m Billet Nesting &amp; Residual Scrap
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 border ${
                      scrapRatePct <= 3.0
                        ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                        : "bg-rose-950/60 border-rose-800 text-rose-400"
                    }`}
                  >
                    Scrap: {scrapRatePct}% {scrapRatePct <= 3.0 ? "(Optimal ≤ 3%)" : "(Excess Wastage > 3%)"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-500 text-[10px] mb-1">
                      Single Bar Cut Length (m)
                    </label>
                    <input
                      type="number"
                      step={0.01}
                      min={0.1}
                      max={12}
                      required
                      value={cutLengthPerBarM}
                      onChange={(e) => setCutLengthPerBarM(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-500 text-[10px] mb-1">
                      Residual Cut Scrap Length (12m - Total Cut)
                    </label>
                    <div className="w-full bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-200 font-mono tabular-nums flex items-center justify-between">
                      <span>{residualScrapLengthM.toFixed(3)} m</span>
                      <span className="text-[10px] text-zinc-500">
                        ({cutsPerBillet} cuts / 12m billet)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Total Steel Output for Member:</span>
                  <span className="text-zinc-100 font-bold tabular-nums">
                    {totalLengthM.toFixed(1)} m • {totalWeightMt.toFixed(3)} MT ({totalWeightKg.toFixed(1)} kg)
                  </span>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-zinc-400 hover:text-zinc-200 text-xs font-mono uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-500 text-zinc-100 font-bold uppercase tracking-wider text-xs px-5 py-2.5 transition-colors cursor-pointer shadow-none font-mono"
                >
                  Commit Schedule &amp; Generate Cut List
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export default BBSDetailModal;
