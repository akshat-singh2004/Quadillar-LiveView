"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  X,
  FileSpreadsheet,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { dispatchIPCApplication } from "@/app/actions/ipc-actions";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface IPCDeductionDrawerProps {
  isOpen?: boolean;
  onClose?: () => void;
  trigger?: React.ReactNode;
  applicationId?: string;
  projectRef?: string;
  grossAmount?: number;
}

export interface MaterialAdvanceItem {
  id: string;
  materialName: string;
  consumedQty: string;
  rateInr: number;
  creditAdjustmentInr: number;
}

export interface QualityWithholdItem {
  ncrId: string;
  title: string;
  severity: "Critical" | "Major" | "Minor";
  amountInr: number;
  status: "Unresolved" | "Rectification Underway";
}

const FORM_31_MATERIALS: MaterialAdvanceItem[] = [
  {
    id: "mat-01",
    materialName: "Cement OPC 53 Grade (Ultratech)",
    consumedQty: "420 Bags",
    rateInr: 385,
    creditAdjustmentInr: 161700,
  },
  {
    id: "mat-02",
    materialName: "TMT Fe500D Reinforcement Steel (Tata Tiscon)",
    consumedQty: "14.50 MT",
    rateInr: 54000,
    creditAdjustmentInr: 783000,
  },
];

const QUALITY_WITHHOLDS: QualityWithholdItem[] = [
  {
    ncrId: "NCR-2026-08",
    title: "Honeycombing in shear wall Bay C2 Level 03",
    severity: "Critical",
    amountInr: 125000,
    status: "Unresolved",
  },
];

// ---------------------------------------------------------------------------
// Client Component: IPCDeductionDrawer
// ---------------------------------------------------------------------------

export function IPCDeductionDrawer({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  trigger,
  applicationId = "RA-BILL-04",
  projectRef = "Gomti Nagar Commercial Hub Ph-1",
  grossAmount = 7450400,
}: IPCDeductionDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

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

  // Statutory Challan Reference State
  const [gstin, setGstin] = useState("09AAACQ1234F1Z5");
  const [bocwOrderNo, setBocwOrderNo] = useState("BOCW/UP/LKO/2026/0892");
  const [tanRef, setTanRef] = useState("LKOC01234E");

  // Dual Signature Verification State
  const [clientSigned, setClientSigned] = useState(true);
  const [architectSigned, setArchitectSigned] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleDispatch = () => {
    if (!clientSigned || !architectSigned) {
      setNotification({
        message: "Statutory Requirement: Dual verification (Client Representative & Principal Architect) must be confirmed prior to issuing IPC & Payment Warrant.",
        type: "error",
      });
      return;
    }

    startTransition(async () => {
      const res = await dispatchIPCApplication(applicationId, {
        gstin,
        bocwOrderNo,
        tanRef,
      });

      if (res.success) {
        setNotification({
          message: `Formal IPC #${applicationId} and Statutory Payment Warrant dispatched to ERP / Escrow Disbursal.`,
          type: "success",
        });
        setTimeout(() => {
          setNotification(null);
          handleClose();
        }, 1800);
      } else {
        setNotification({
          message: `Dispatch failed: ${res.error}`,
          type: "error",
        });
      }
    });
  };

  return (
    <>
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
          <Receipt className="h-3.5 w-3.5" />
          <span>Inspect Deduction Breakdown</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden font-sans">
          <div
            onClick={handleClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
            aria-hidden="true"
          />

          <div className="fixed inset-y-0 right-0 w-[540px] max-w-full bg-zinc-900 border-l border-zinc-800 shadow-2xl z-50 p-6 flex flex-col justify-between overflow-y-auto font-mono text-xs">
            {/* TOP HEADER */}
            <div className="border-b border-zinc-800 pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                    Statutory Deduction &amp; Recovery Audit
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-zinc-400 hover:text-zinc-100 p-1 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <h2 className="text-base font-bold text-zinc-100 mt-2 font-mono">
                IPC / {applicationId} Deduction Breakdown
              </h2>
              <p className="text-[11px] text-zinc-400 mt-0.5 font-mono">
                {projectRef} • CPWD Cl. 7 / FIDIC Cl. 14.3
              </p>
            </div>

            {/* NOTIFICATION BANNER */}
            {notification && (
              <div
                className={`my-3 p-3 border text-xs font-mono flex items-center gap-2 ${notification.type === "success"
                    ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                    : "bg-rose-950/80 border-rose-800 text-rose-300"
                  }`}
              >
                {notification.type === "success" ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                )}
                <span>{notification.message}</span>
              </div>
            )}

            {/* FORM BODY */}
            <div className="py-5 space-y-6 overflow-y-auto flex-1 pr-1">
              {/* SECTION 1: Form 31 Material Advance Adjustment */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-zinc-400" />
                    <span className="text-[11px] uppercase tracking-wider text-zinc-200 font-bold">
                      Form 31 Material Advance Adjustment
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-500 uppercase">CPWD Cl. 10B</span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Materials secured under Form 31 and consumed during this measurement cycle are credited back against the running advance ledger:
                </p>

                <div className="space-y-2">
                  {FORM_31_MATERIALS.map((mat) => (
                    <div
                      key={mat.id}
                      className="flex items-center justify-between bg-zinc-900 border border-zinc-800/80 p-2.5 text-[11px]"
                    >
                      <div>
                        <div className="font-bold text-zinc-200">{mat.materialName}</div>
                        <div className="text-[10px] text-zinc-500">
                          Qty Consumed: {mat.consumedQty} @ ₹{mat.rateInr.toLocaleString("en-IN")}
                        </div>
                      </div>
                      <div className="text-right font-bold text-emerald-400 tabular-nums">
                        +₹{mat.creditAdjustmentInr.toLocaleString("en-IN")}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-zinc-800/60 flex justify-between text-[11px]">
                  <span className="text-zinc-400">Total Material Advance Credited:</span>
                  <span className="font-bold text-zinc-100 tabular-nums">₹ 9,44,700.00</span>
                </div>
              </div>

              {/* SECTION 2: Quality Penalties & Debit Notes */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                    <span className="text-[11px] uppercase tracking-wider text-zinc-200 font-bold">
                      Quality Penalties &amp; Debit Notes
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-400 uppercase font-bold">Active Withholds</span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-relaxed font-sans">
                  Contractual retainage imposed due to unresolved structural non-conformance tickets pending remediation:
                </p>

                <div className="space-y-2">
                  {QUALITY_WITHHOLDS.map((item) => (
                    <div
                      key={item.ncrId}
                      className="bg-zinc-900 border border-zinc-800/80 p-2.5 text-[11px] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-rose-400">{item.ncrId}</span>
                        <span className="font-bold text-rose-400 tabular-nums">
                          -₹{item.amountInr.toLocaleString("en-IN")}.00
                        </span>
                      </div>
                      <div className="text-zinc-300 font-sans text-xs">{item.title}</div>
                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1">
                        <span>Severity: {item.severity}</span>
                        <span className="text-amber-500 uppercase">{item.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-end">
                  <Link
                    href="/quality/ncr"
                    className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <span>Inspect Active NCR Ledger</span>
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </div>
              </div>

              {/* SECTION 3: Statutory Challan References */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
                  <Receipt className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="text-[11px] uppercase tracking-wider text-zinc-200 font-bold">
                    Statutory Challan References
                  </span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                      GSTIN (Contractor Tax ID) *
                    </label>
                    <input
                      type="text"
                      value={gstin}
                      disabled={isPending}
                      onChange={(e) => setGstin(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                      BOCW Assessment Order No. (1% Labour Cess) *
                    </label>
                    <input
                      type="text"
                      value={bocwOrderNo}
                      disabled={isPending}
                      onChange={(e) => setBocwOrderNo(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                      TAN Reference Number (Sec 194C TDS Challan) *
                    </label>
                    <input
                      type="text"
                      value={tanRef}
                      disabled={isPending}
                      onChange={(e) => setTanRef(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-600 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: Dual Signature Sign-off Strip */}
              <div className="bg-zinc-950 border border-zinc-800 p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-[11px] uppercase tracking-wider text-zinc-200 font-bold">
                    Dual Signature Statutory Gate
                  </span>
                </div>

                <div className="flex items-center justify-between bg-zinc-900 p-3 border border-zinc-800">
                  <div>
                    <div className="font-bold text-zinc-200">Client Representative Sign-off</div>
                    <div className="text-[10px] text-zinc-500">
                      Er. S. P. Verma (General Manager Finance)
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setClientSigned(!clientSigned)}
                    className={`px-2.5 py-1 text-[10px] font-mono uppercase font-bold border cursor-pointer transition-colors ${clientSigned
                        ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                        : "bg-amber-950 border-amber-800 text-amber-400"
                      }`}
                  >
                    {clientSigned ? "Verified ✓" : "Pending Sign-off"}
                  </button>
                </div>

                <div className="flex items-center justify-between bg-zinc-900 p-3 border border-zinc-800">
                  <div>
                    <div className="font-bold text-zinc-200">Architect / Engineer Certification</div>
                    <div className="text-[10px] text-zinc-500">
                      Ar. Meera Tandon (CoA: CA/2012/58912)
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setArchitectSigned(!architectSigned)}
                    className={`px-2.5 py-1 text-[10px] font-mono uppercase font-bold border cursor-pointer transition-colors ${architectSigned
                        ? "bg-emerald-950 border-emerald-800 text-emerald-400"
                        : "bg-amber-950 border-amber-800 text-amber-400"
                      }`}
                  >
                    {architectSigned ? "Verified ✓" : "Pending Sign-off"}
                  </button>
                </div>
              </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="pt-4 border-t border-zinc-800 bg-zinc-900 sticky bottom-0 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isPending}
                className="text-zinc-400 hover:text-zinc-200 text-xs uppercase font-mono px-3 py-2 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDispatch}
                disabled={isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-zinc-100 font-bold uppercase tracking-wider text-xs py-3 px-6 transition-colors cursor-pointer shadow-none font-mono flex items-center gap-2 disabled:opacity-50"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 text-zinc-100 animate-spin" />
                    <span>Dispatching Warrant...</span>
                  </>
                ) : (
                  <span>Issue Formal IPC &amp; Dispatch Payment Warrant</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default IPCDeductionDrawer;