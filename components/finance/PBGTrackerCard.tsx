// components/finance/PBGTrackerCard.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Calendar,
  AlertTriangle,
  Building2,
  Clock,
  ArrowRight,
  CheckCircle2,
  FileCheck,
  Coins,
  X,
  Plus,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface PBGRecord {
  id: string;
  subcontractor: string;
  trade: string;
  project: string;
  documentRef: string;
  issuingBank: string;
  guaranteeAmountInr: number;
  startDate: string; // TOC Issue Date (YYYY-MM-DD)
  expiryDate: string; // Target Expiry Date (YYYY-MM-DD)
  dlpDurationMonths: number;
  claimGracePeriodDays?: number;
}

export interface PBGTrackerCardProps {
  record?: PBGRecord;
  onExtend?: (id: string, newExpiry: string) => void;
  onRelease?: (id: string) => void;
}

// Default Fallback Guarantee Record
const DEFAULT_RECORD: PBGRecord = {
  id: "pbg-01",
  subcontractor: "Apex Interiors Pvt Ltd",
  trade: "Joinery & Fitout Works",
  project: "Gomti Nagar Commercial Hub Ph-1",
  documentRef: "BG-HDFC-2026-0899",
  issuingBank: "HDFC Bank Ltd • Treasury Branch Lucknow",
  guaranteeAmountInr: 2450000,
  startDate: "2025-11-01",
  expiryDate: "2026-11-01",
  dlpDurationMonths: 12,
  claimGracePeriodDays: 30,
};

// ---------------------------------------------------------------------------
// Client Component: PBGTrackerCard
// ---------------------------------------------------------------------------

export function PBGTrackerCard({
  record = DEFAULT_RECORD,
  onExtend,
  onRelease,
}: PBGTrackerCardProps) {
  // Current simulated tracking date
  const todayStr = "2026-09-19";

  const [currentExpiryDate, setCurrentExpiryDate] = useState(record.expiryDate);
  const [isExtendModalOpen, setIsExtendModalOpen] = useState(false);
  const [extensionMonths, setExtensionMonths] = useState<number>(6);
  const [released, setReleased] = useState(false);

  // Timeline & Days Calculation
  const timeline = useMemo(() => {
    const start = new Date(record.startDate).getTime();
    const expiry = new Date(currentExpiryDate).getTime();
    const today = new Date(todayStr).getTime();

    const totalDurationMs = Math.max(1, expiry - start);
    const elapsedMs = Math.max(0, today - start);

    const progressPct = Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)));
    const msRemaining = expiry - today;
    const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0;
    const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;

    return {
      progressPct,
      daysRemaining,
      isExpired,
      isExpiringSoon,
    };
  }, [record.startDate, currentExpiryDate, todayStr]);

  // Handle Extension Submission
  const handleApplyExtension = (e: React.FormEvent) => {
    e.preventDefault();
    const current = new Date(currentExpiryDate);
    current.setMonth(current.getMonth() + extensionMonths);
    const updated = current.toISOString().split("T")[0];
    setCurrentExpiryDate(updated);
    setIsExtendModalOpen(false);

    if (onExtend) {
      onExtend(record.id, updated);
    }
    alert(
      `Statutory Extension Logged: PBG ${record.documentRef} extended by ${extensionMonths} months. New expiry: ${updated}`
    );
  };

  // Handle Release
  const handleAuthorizeRelease = () => {
    if (!timeline.isExpired) {
      alert("Interlock Violation: PBG release cannot be authorized before the statutory DLP expiry date.");
      return;
    }
    setReleased(true);
    if (onRelease) {
      onRelease(record.id);
    }
    alert(
      `Statutory Clearance Verified: Final PBG ${record.documentRef} released to ${record.subcontractor}. Initial 50% retention warrant unlocked.`
    );
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-none flex flex-col justify-between font-sans">
      {/* ===================================================================
          PROJECT & GUARANTEE DETAILS (Header)
          =================================================================== */}
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500 font-bold">
                {record.project}
              </span>
              <span className="text-zinc-600">•</span>
              <span className="text-[10px] font-mono text-zinc-400">
                {record.dlpDurationMonths}M Statutory DLP
              </span>
            </div>
            <h3 className="text-base font-bold text-zinc-100 font-mono mt-0.5">
              {record.subcontractor} | {record.trade}
            </h3>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Issuing Bank: {record.issuingBank}
            </p>
          </div>

          <div className="text-right">
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold border uppercase tracking-wider ${
                released
                  ? "bg-zinc-800 border-zinc-700 text-zinc-400"
                  : timeline.isExpired
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                  : timeline.isExpiringSoon
                  ? "bg-rose-950/60 border-rose-800 text-rose-400 animate-pulse"
                  : "bg-zinc-950 border-zinc-800 text-zinc-300"
              }`}
            >
              {released
                ? "Guarantee Released"
                : timeline.isExpired
                ? "DLP Concluded"
                : timeline.isExpiringSoon
                ? "Expiring Soon (<30D)"
                : "Active Guarantee"}
            </span>
          </div>
        </div>

        {/* Ref and Guarantee Amount */}
        <div className="mt-4 pt-3 border-t border-zinc-800/80 grid grid-cols-2 gap-3 font-mono text-xs">
          <div>
            <span className="block text-zinc-500 text-[10px] uppercase">PBG Document Ref</span>
            <span className="text-zinc-200 font-bold block mt-0.5">{record.documentRef}</span>
          </div>

          <div className="text-right">
            <span className="block text-zinc-500 text-[10px] uppercase">Guarantee Amount</span>
            <span className="text-emerald-400 font-bold text-sm tabular-nums block mt-0.5">
              ₹ {record.guaranteeAmountInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* ===================================================================
            DLP TIMELINE & EXPIRY TRACKER
            =================================================================== */}
        <div className="mt-5 space-y-2 bg-zinc-950 border border-zinc-800 p-3.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400 uppercase text-[10px] font-bold">
              Defect Liability Clock ({record.dlpDurationMonths} Months)
            </span>
            {/* Status Text: 142 Days Remaining to Expiry (amber if < 30 days, else emerald) */}
            <span
              className={`text-xs tabular-nums font-bold ${
                timeline.isExpired
                  ? "text-emerald-400"
                  : timeline.isExpiringSoon
                  ? "text-amber-400 animate-pulse"
                  : "text-emerald-400"
              }`}
            >
              {timeline.isExpired
                ? "0 Days Remaining (DLP Matured)"
                : `${timeline.daysRemaining} Days Remaining to Expiry`}
            </span>
          </div>

          {/* Visual Progress Bar */}
          <div className="h-2 w-full bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                timeline.isExpired
                  ? "bg-zinc-600"
                  : timeline.isExpiringSoon
                  ? "bg-amber-500"
                  : "bg-emerald-500"
              }`}
              style={{ width: `${timeline.progressPct}%` }}
            />
          </div>

          {/* Timeline Markers */}
          <div className="grid grid-cols-3 text-[10px] font-mono text-zinc-500 pt-1">
            <div className="text-left">
              <span className="block uppercase text-zinc-600">Start (TOC)</span>
              <span className="text-zinc-300 tabular-nums">{record.startDate}</span>
            </div>
            <div className="text-center">
              <span className="block uppercase text-zinc-600">Today</span>
              <span className="text-zinc-300 tabular-nums">{todayStr}</span>
            </div>
            <div className="text-right">
              <span className="block uppercase text-zinc-600">Target Expiry</span>
              <span
                className={`tabular-nums font-bold ${
                  timeline.isExpiringSoon ? "text-amber-400" : "text-zinc-300"
                }`}
              >
                {currentExpiryDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
          ACTION & RELEASE INTERLOCK (Dual-button footer)
          =================================================================== */}
      <div className="mt-5 pt-4 border-t border-zinc-800 flex items-center justify-between gap-3 font-mono text-xs">
        {/* Button 1: Request PBG Extension */}
        <button
          type="button"
          onClick={() => setIsExtendModalOpen(true)}
          disabled={released}
          className="bg-zinc-800 text-zinc-100 hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed font-bold uppercase tracking-wider text-xs px-3 py-2 border border-zinc-700 transition-colors cursor-pointer"
        >
          Request PBG Extension
        </button>

        {/* Button 2: Authorize Final PBG Release (with Interlock Rule) */}
        <button
          type="button"
          onClick={handleAuthorizeRelease}
          disabled={!timeline.isExpired || released}
          title={
            !timeline.isExpired
              ? "Interlock Active: Cannot release PBG prior to target DLP expiry."
              : undefined
          }
          className={`font-bold uppercase tracking-wider text-xs px-4 py-2 transition-colors ${
            released
              ? "bg-zinc-800 text-zinc-500 opacity-40 cursor-not-allowed border border-zinc-700/50"
              : !timeline.isExpired
              ? "opacity-40 cursor-not-allowed bg-zinc-800 text-zinc-500 border border-zinc-700/50"
              : "bg-emerald-600 hover:bg-emerald-500 text-zinc-100 cursor-pointer shadow-none"
          }`}
        >
          {released ? "Release Completed ✓" : "Authorize Final PBG Release"}
        </button>
      </div>

      {/* ===================================================================
          MODAL: Log PBG Extension
          =================================================================== */}
      {isExtendModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
                Request Statutory PBG Extension
              </h3>
              <button
                type="button"
                onClick={() => setIsExtendModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleApplyExtension} className="mt-4 space-y-4">
              <div className="bg-zinc-950 p-3 border border-zinc-800 space-y-1">
                <div className="text-zinc-400 text-[10px] uppercase">Active Guarantee Ref</div>
                <div className="font-bold text-zinc-100 text-xs">{record.documentRef}</div>
                <div className="text-zinc-500 text-[11px] font-sans">{record.subcontractor}</div>
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Extension Duration *
                </label>
                <select
                  value={extensionMonths}
                  onChange={(e) => setExtensionMonths(parseInt(e.target.value, 10))}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 font-mono focus:outline-none focus:border-zinc-600"
                >
                  <option value={3}>+3 Months (Interim Remedial Extension)</option>
                  <option value={6}>+6 Months (FIDIC Cl. 11.3 Latent Defect)</option>
                  <option value={12}>+12 Months (Full Cycle Extended Liability)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Statutory Justification / Clause Ref
                </label>
                <input
                  type="text"
                  required
                  defaultValue="CPWD Cl. 17 / Rectification Period Extension"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExtendModalOpen(false)}
                  className="px-3 py-1.5 border border-zinc-700 text-zinc-300 hover:text-zinc-100 uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-bold uppercase text-xs"
                >
                  Log Extension
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PBGTrackerCard;
