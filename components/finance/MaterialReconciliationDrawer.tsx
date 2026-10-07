// components/finance/MaterialReconciliationDrawer.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  X,
  AlertTriangle,
  Scale,
  ShieldCheck,
  CheckCircle2,
  Calculator,
  Layers,
  ArrowRight,
  Package,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type MaterialCategory =
  | "Cement (PPC/OPC)"
  | "Reinforcement Steel (Fe500D)"
  | "Bitumen"
  | "Ready Mix Concrete (RMC)";

export interface MaterialCategoryConfig {
  name: MaterialCategory;
  code: string;
  unit: string;
  defaultMbQty: number;
  dsrCoefficient: number;
  coefficientLabel: string;
  tenderRateInr: number;
  gateInward: number;
  defaultPhysicalStock: number;
  permissibleWastagePct: number;
}

export interface MaterialReconciliationDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
  record?: any;
  onDebitNote?: (debitNote: any) => void;
}

// ---------------------------------------------------------------------------
// Material Configurations (CPWD DSR Constants)
// ---------------------------------------------------------------------------

const MATERIAL_CONFIGS: Record<MaterialCategory, MaterialCategoryConfig> = {
  "Cement (PPC/OPC)": {
    name: "Cement (PPC/OPC)",
    code: "MAT-CEM-OPC53",
    unit: "Bags",
    defaultMbQty: 850.0, // cum M25 RCC
    dsrCoefficient: 5.75, // bags per cum
    coefficientLabel: "5.75 Bags / cum (CPWD DSR 5.2)",
    tenderRateInr: 385,
    gateInward: 5200,
    defaultPhysicalStock: 225,
    permissibleWastagePct: 2.0,
  },
  "Reinforcement Steel (Fe500D)": {
    name: "Reinforcement Steel (Fe500D)",
    code: "REBAR-FE500D",
    unit: "MT",
    defaultMbQty: 1420.0, // cum RCC
    dsrCoefficient: 0.082, // MT per cum
    coefficientLabel: "0.082 MT / cum (IS:456 Density standard)",
    tenderRateInr: 54000,
    gateInward: 130.0,
    defaultPhysicalStock: 11.85,
    permissibleWastagePct: 2.0,
  },
  Bitumen: {
    name: "Bitumen",
    code: "BITU-VG30",
    unit: "MT",
    defaultMbQty: 4200.0, // sqm DBM 50mm
    dsrCoefficient: 0.00525, // MT per sqm (5.25 kg/sqm)
    coefficientLabel: "5.25 kg / sqm (MoRTH Cl. 505)",
    tenderRateInr: 48000,
    gateInward: 25.0,
    defaultPhysicalStock: 4.2,
    permissibleWastagePct: 2.0,
  },
  "Ready Mix Concrete (RMC)": {
    name: "Ready Mix Concrete (RMC)",
    code: "CONC-RMC-M30",
    unit: "cum",
    defaultMbQty: 620.0, // cum Raft
    dsrCoefficient: 1.0, // cum per cum
    coefficientLabel: "1.00 cum / cum (Net batch yield)",
    tenderRateInr: 5800,
    gateInward: 625.5,
    defaultPhysicalStock: 0.0,
    permissibleWastagePct: 1.5,
  },
};

// ---------------------------------------------------------------------------
// Client Component: MaterialReconciliationDrawer
// ---------------------------------------------------------------------------

export function MaterialReconciliationDrawer({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  trigger,
  record,
  onDebitNote,
}: MaterialReconciliationDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleOpen = () => {
    if (!isControlled) setInternalIsOpen(true);
  };

  const handleClose = () => {
    if (controlledOnClose) controlledOnClose();
    if (!isControlled) setInternalIsOpen(false);
  };

  // Active Category State
  const [category, setCategory] = useState<MaterialCategory>("Bitumen");
  const config = MATERIAL_CONFIGS[category];

  // Editable Site Parameters
  const [mbExecutedQty, setMbExecutedQty] = useState<number>(config.defaultMbQty);
  const [physicalStock, setPhysicalStock] = useState<number>(config.defaultPhysicalStock);

  // Sync inputs when category changes
  const handleCategorySelect = (cat: MaterialCategory) => {
    setCategory(cat);
    const newConfig = MATERIAL_CONFIGS[cat];
    setMbExecutedQty(newConfig.defaultMbQty);
    setPhysicalStock(newConfig.defaultPhysicalStock);
  };

  // Calculations
  const calculations = useMemo(() => {
    // 1. Theoretical Volume = MB Executed Qty * DSR Coefficient
    const theoreticalVolume = parseFloat((mbExecutedQty * config.dsrCoefficient).toFixed(2));

    // 2. Actual Consumed = Gate Inward - Physical Stock at Cycle Close
    const actualConsumed = parseFloat(Math.max(0, config.gateInward - physicalStock).toFixed(2));

    // 3. Permissible Allowance (2%)
    const permissibleTolerance = parseFloat((theoreticalVolume * (config.permissibleWastagePct / 100)).toFixed(2));
    const lowerPermissibleLimit = parseFloat((theoreticalVolume - permissibleTolerance).toFixed(2));
    const upperPermissibleLimit = parseFloat((theoreticalVolume + permissibleTolerance).toFixed(2));

    // 4. Variance
    const varianceQty = parseFloat((actualConsumed - theoreticalVolume).toFixed(2));
    const variancePct = theoreticalVolume > 0 ? parseFloat(((varianceQty / theoreticalVolume) * 100).toFixed(2)) : 0;

    // 5. Clause 42 Penal Recovery Calculation:
    // If Actual Consumption < (Theoretical - Permissible Limit), calculate penal clawback at 2x rate
    let isUnderConsumed = false;
    let shortageQty = 0;
    let penalRecoveryInr = 0;

    if (actualConsumed < lowerPermissibleLimit) {
      isUnderConsumed = true;
      shortageQty = parseFloat((lowerPermissibleLimit - actualConsumed).toFixed(2));
      // Penal rate = 2x Tender Rate
      penalRecoveryInr = Math.round(shortageQty * (config.tenderRateInr * 2));
    }

    return {
      theoreticalVolume,
      actualConsumed,
      permissibleTolerance,
      lowerPermissibleLimit,
      upperPermissibleLimit,
      varianceQty,
      variancePct,
      isUnderConsumed,
      shortageQty,
      penalRecoveryInr,
    };
  }, [mbExecutedQty, physicalStock, config]);

  // Sign-off verification states
  const [qcManagerSigned, setQcManagerSigned] = useState(true);
  const [billingEngineerSigned, setBillingEngineerSigned] = useState(false);
  const [commitSuccess, setCommitSuccess] = useState(false);

  const handleCommitPenalty = () => {
    if (!qcManagerSigned || !billingEngineerSigned) {
      alert(
        "Statutory Requirement: Dual verification (QC Manager & Commercial / Billing Engineer) must be completed before committing Clause 42 penalties."
      );
      return;
    }

    if (calculations.penalRecoveryInr <= 0) {
      alert("No penal recovery triggered for this material category (consumption is within permissible limits).");
      return;
    }

    setCommitSuccess(true);
    const debit = {
      id: `CL42-${Date.now().toString().slice(-6)}`,
      material: config.name,
      amount: calculations.penalRecoveryInr,
      shortageQty: calculations.shortageQty,
      unit: config.unit,
    };

    if (onDebitNote) {
      onDebitNote(debit);
    }

    setTimeout(() => {
      setCommitSuccess(false);
      handleClose();
      alert(`Clause 42 Penal Debit Note of ₹ ${calculations.penalRecoveryInr.toLocaleString("en-IN")} committed to Next IPC.`);
    }, 1200);
  };

  return (
    <>
      {/* Trigger Button if rendered directly */}
      {trigger !== undefined ? (
        <span onClick={handleOpen} className="inline-block">
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className="bg-zinc-100 text-zinc-950 hover:bg-zinc-300 font-bold uppercase tracking-wider text-xs px-4 py-2 flex items-center gap-2 transition-colors cursor-pointer font-mono"
        >
          <Scale className="h-3.5 w-3.5" />
          <span>Reconcile Active Billing Cycle</span>
        </button>
      )}

      {/* Drawer Overlay & Content */}
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          {/* Semi-transparent backdrop overlay */}
          <div
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          {/* Sliding Right Drawer */}
          <div className="fixed inset-y-0 right-0 w-[560px] max-w-full bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto font-mono text-xs">
            {/* TOP HEADER */}
            <div className="border-b border-zinc-800 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                    CPWD Clause 42 Statutory Material Audit
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-zinc-400 hover:text-zinc-100 p-1 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h2 className="text-base font-bold text-zinc-100 mt-2 font-mono">
                Theoretical vs. Actual Consumption Reconciler
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                Cycle: Active Billing Cycle • Permissible Margin: {config.permissibleWastagePct}% • 2× Penal Rate Rule
              </p>
            </div>

            {/* FORM BODY / CLAUSE 42 AUDIT DETAILS */}
            <div className="py-5 space-y-5 overflow-y-auto flex-1 pr-1">
              {/* SECTION 1: Material Category Selector */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 space-y-3">
                <label className="block text-zinc-400 text-[10px] uppercase font-bold">
                  Material Category Selector *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      "Cement (PPC/OPC)",
                      "Reinforcement Steel (Fe500D)",
                      "Bitumen",
                      "Ready Mix Concrete (RMC)",
                    ] as MaterialCategory[]
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategorySelect(cat)}
                      className={`p-2.5 text-left border text-[11px] font-mono transition-colors cursor-pointer ${
                        category === cat
                          ? "bg-zinc-800 border-zinc-500 text-zinc-100 font-bold"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                      }`}
                    >
                      <div className="truncate">{cat}</div>
                      <div className="text-[9px] text-zinc-500 uppercase mt-0.5">
                        {MATERIAL_CONFIGS[cat].code}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 2: Stock Count Adjustment */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-200 font-bold flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-zinc-400" />
                    Physical Stock Count Adjustment
                  </span>
                  <span className="text-[10px] text-zinc-500">Site Store Verified</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                      Gate Inward Cumulative ({config.unit})
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`${config.gateInward.toLocaleString("en-IN")} ${config.unit}`}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-zinc-400 font-mono text-xs focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                      Physical Stock at Close ({config.unit}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={physicalStock}
                      onChange={(e) => setPhysicalStock(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-zinc-700 px-3 py-1.5 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-500"
                    />
                  </div>
                </div>

                <div className="p-2.5 bg-zinc-900 border border-zinc-800 flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Actual Issued / Consumed at Site:</span>
                  <span className="font-bold text-zinc-100 tabular-nums">
                    {calculations.actualConsumed.toLocaleString("en-IN")} {config.unit}
                  </span>
                </div>
              </div>

              {/* SECTION 3: Theoretical Calculation Breakdown */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <span className="text-[11px] uppercase tracking-wider text-zinc-200 font-bold flex items-center gap-1.5">
                    <Calculator className="h-3.5 w-3.5 text-emerald-400" />
                    Theoretical Calculation Breakdown
                  </span>
                  <span className="text-[10px] text-zinc-500">CPWD DSR Norm</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-400">MB Executed Work Quantity:</span>
                    <input
                      type="number"
                      step="0.1"
                      value={mbExecutedQty}
                      onChange={(e) => setMbExecutedQty(parseFloat(e.target.value) || 0)}
                      className="w-24 bg-zinc-900 border border-zinc-700 px-2 py-1 text-right text-zinc-100 font-mono text-xs"
                    />
                  </div>

                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">DSR Standard Coefficient:</span>
                    <span className="text-zinc-300 font-mono">{config.coefficientLabel}</span>
                  </div>

                  <div className="p-2.5 bg-zinc-900 border border-zinc-800 flex justify-between items-center text-[11px] font-bold">
                    <span className="text-zinc-300">Standard Theoretical Volume:</span>
                    <span className="text-emerald-400 tabular-nums">
                      {calculations.theoreticalVolume.toLocaleString("en-IN")} {config.unit}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: Wastage & Permissible Limit Calculation */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 space-y-2">
                <div className="flex items-center justify-between text-[11px] border-b border-zinc-800 pb-2">
                  <span className="text-zinc-200 uppercase font-bold">
                    Wastage &amp; Tolerance Margins
                  </span>
                  <span className="text-zinc-400 font-mono">
                    ± {config.permissibleWastagePct}% Permissible Cap
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-zinc-900 p-2 border border-zinc-800">
                    <span className="text-zinc-500 block text-[10px]">Permissible Lower Bound</span>
                    <strong className="text-zinc-200 tabular-nums">
                      {calculations.lowerPermissibleLimit} {config.unit}
                    </strong>
                  </div>
                  <div className="bg-zinc-900 p-2 border border-zinc-800">
                    <span className="text-zinc-500 block text-[10px]">Permissible Upper Bound</span>
                    <strong className="text-zinc-200 tabular-nums">
                      {calculations.upperPermissibleLimit} {config.unit}
                    </strong>
                  </div>
                </div>

                <div className="flex justify-between items-center text-[11px] pt-1">
                  <span className="text-zinc-400">Actual Variance:</span>
                  <span
                    className={`font-bold tabular-nums ${
                      calculations.variancePct < 0
                        ? "text-rose-400"
                        : calculations.variancePct <= config.permissibleWastagePct
                        ? "text-emerald-400"
                        : "text-amber-400"
                    }`}
                  >
                    {calculations.varianceQty > 0 ? `+${calculations.varianceQty}` : calculations.varianceQty}{" "}
                    {config.unit} ({calculations.variancePct}%)
                  </span>
                </div>
              </div>

              {/* SECTION 5: Penal Recovery Calculation (Clause 42) */}
              <div
                className={`p-4 border space-y-3 ${
                  calculations.isUnderConsumed
                    ? "bg-rose-950/40 border-rose-800"
                    : "bg-zinc-950 border-zinc-800"
                }`}
              >
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <span className="text-[11px] uppercase tracking-wider text-rose-400 font-bold flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                    Clause 42 Penal Clawback Audit
                  </span>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">
                    {calculations.isUnderConsumed ? "Penal Active" : "No Shortage"}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                  Under CPWD Clause 42, if Actual Consumption &lt; (Theoretical − Permissible Limit),
                  unaccounted shortage is deemed unauthorized omission or substandard work, recovered at{" "}
                  <strong className="text-zinc-200">2× the tender/market rate</strong>.
                </p>

                {calculations.isUnderConsumed ? (
                  <div className="space-y-2 bg-zinc-900/90 border border-rose-900/60 p-3 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Unaccounted Shortage:</span>
                      <strong className="text-rose-400 tabular-nums">
                        {calculations.shortageQty} {config.unit}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Contract Tender Rate:</span>
                      <span className="text-zinc-200 tabular-nums">
                        ₹{config.tenderRateInr.toLocaleString("en-IN")} / {config.unit}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Penal Multiplier:</span>
                      <span className="text-rose-400 font-bold">2.00× (Statutory Clause 42)</span>
                    </div>
                    <div className="pt-2 border-t border-zinc-800 flex justify-between items-center text-xs">
                      <span className="text-zinc-200 font-bold">Penal Recovery Amount:</span>
                      <span className="text-rose-400 font-bold text-sm tabular-nums">
                        ₹ {calculations.penalRecoveryInr.toLocaleString("en-IN")}.00
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    <span>Actual consumption satisfies minimum required theoretical placement.</span>
                  </div>
                )}
              </div>

              {/* SECTION 6: Audit Sign-off Strip */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[11px] uppercase tracking-wider text-zinc-200 font-bold">
                    Statutory Reconciliation Sign-off Strip
                  </span>
                </div>

                {/* Signatory 1: Quality Control Manager */}
                <div className="flex items-center justify-between bg-zinc-900 p-3 border border-zinc-800">
                  <div>
                    <div className="font-bold text-zinc-200">Quality Control Manager Certification</div>
                    <div className="text-[10px] text-zinc-500">
                      Er. P. N. Dixit (Chief QMS Auditor)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setQcManagerSigned(!qcManagerSigned)}
                    className={`px-2.5 py-1 text-[10px] font-mono uppercase font-bold border cursor-pointer transition-colors ${
                      qcManagerSigned
                        ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                        : "bg-amber-950 border-amber-800 text-amber-400"
                    }`}
                  >
                    {qcManagerSigned ? "Verified ✓" : "Pending"}
                  </button>
                </div>

                {/* Signatory 2: Commercial / Billing Engineer */}
                <div className="flex items-center justify-between bg-zinc-900 p-3 border border-zinc-800">
                  <div>
                    <div className="font-bold text-zinc-200">Commercial / Billing Engineer Sign-off</div>
                    <div className="text-[10px] text-zinc-500">
                      Er. Harsh Vardhan (Lead QS Auditor)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBillingEngineerSigned(!billingEngineerSigned)}
                    className={`px-2.5 py-1 text-[10px] font-mono uppercase font-bold border cursor-pointer transition-colors ${
                      billingEngineerSigned
                        ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                        : "bg-amber-950 border-amber-800 text-amber-400"
                    }`}
                  >
                    {billingEngineerSigned ? "Verified ✓" : "Pending"}
                  </button>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER (Sticky Bottom Bar) */}
            <div className="pt-4 border-t border-zinc-800 bg-zinc-900 sticky bottom-0 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="text-zinc-400 hover:text-zinc-200 text-xs uppercase font-mono px-3 py-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleCommitPenalty}
                disabled={commitSuccess || calculations.penalRecoveryInr <= 0}
                className={`text-zinc-100 font-bold uppercase tracking-wider text-xs py-3 px-6 transition-colors font-mono flex items-center gap-2 ${
                  calculations.penalRecoveryInr > 0
                    ? "bg-rose-600 hover:bg-rose-500 cursor-pointer shadow-none"
                    : "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700"
                }`}
              >
                {commitSuccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 animate-spin text-zinc-100" />
                    <span>Committing Debit...</span>
                  </>
                ) : (
                  <span>Commit Material Penalties to Next IPC</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MaterialReconciliationDrawer;
