"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  HardHat,
  Receipt,
  Layers,
  Lock,
  Unlock,
  Building2,
  UserCheck,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

interface StatutoryClearance {
  bocwCessPaid: boolean;
  epfEsiVerified: boolean;
  labourLicenseActive: boolean;
  noClaimSigned: boolean;
  siteCleared: boolean;
}

interface SubcontractorRecord {
  id: string;
  name: string;
  trade: string;
  vendorCode: string;
  awardValue: number;
  finalMeasuredValue: number;
  debitNotes: number;
  clearance: StatutoryClearance;
  settlementStatus: "PENDING_CLEARANCE" | "READY_FOR_PAYOUT" | "AUTHORIZED";
  authTimestamp?: string;
  authRef?: string;
}

// ---------------------------------------------------------------------------
// Initial Subcontractor Dataset
// ---------------------------------------------------------------------------

const INITIAL_SUBCONTRACTORS: SubcontractorRecord[] = [
  {
    id: "sub-01",
    name: "Apex Structural Facades Ltd",
    trade: "Glazing & Aluminum Cladding",
    vendorCode: "VEN-FAC-401",
    awardValue: 32000000,
    finalMeasuredValue: 34250000,
    debitNotes: 1420000,
    clearance: {
      bocwCessPaid: true,
      epfEsiVerified: true,
      labourLicenseActive: true,
      noClaimSigned: true,
      siteCleared: false, // 1 pending
    },
    settlementStatus: "PENDING_CLEARANCE",
  },
  {
    id: "sub-02",
    name: "Vardhman MEP Solutions",
    trade: "HVAC & Primary Chiller Ducting",
    vendorCode: "VEN-MEP-108",
    awardValue: 48000000,
    finalMeasuredValue: 46820000,
    debitNotes: 850000,
    clearance: {
      bocwCessPaid: true,
      epfEsiVerified: true,
      labourLicenseActive: true,
      noClaimSigned: true,
      siteCleared: true, // All cleared
    },
    settlementStatus: "READY_FOR_PAYOUT",
  },
  {
    id: "sub-03",
    name: "Sterling Reinforced Concrete",
    trade: "RCC Superstructure & Formwork",
    vendorCode: "VEN-CIV-003",
    awardValue: 85000000,
    finalMeasuredValue: 89540000,
    debitNotes: 2680000,
    clearance: {
      bocwCessPaid: true,
      epfEsiVerified: false, // Pending
      labourLicenseActive: true,
      noClaimSigned: false, // Pending
      siteCleared: true,
    },
    settlementStatus: "PENDING_CLEARANCE",
  },
  {
    id: "sub-04",
    name: "Precision Fire & Safety Ltd",
    trade: "Sprinklers & Hydrant Mains",
    vendorCode: "VEN-FIR-512",
    awardValue: 16500000,
    finalMeasuredValue: 16280000,
    debitNotes: 210000,
    clearance: {
      bocwCessPaid: true,
      epfEsiVerified: true,
      labourLicenseActive: true,
      noClaimSigned: true,
      siteCleared: true, // All cleared
    },
    settlementStatus: "READY_FOR_PAYOUT",
  },
  {
    id: "sub-05",
    name: "Falcon Interior Fitouts",
    trade: "Drywall, Acoustic Paneling & Paint",
    vendorCode: "VEN-INT-204",
    awardValue: 21000000,
    finalMeasuredValue: 22890000,
    debitNotes: 640000,
    clearance: {
      bocwCessPaid: false, // Pending
      epfEsiVerified: true,
      labourLicenseActive: false, // Violation
      noClaimSigned: false, // Pending
      siteCleared: true,
    },
    settlementStatus: "PENDING_CLEARANCE",
  },
];

// ---------------------------------------------------------------------------
// Formatting Helper
// ---------------------------------------------------------------------------

function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

// ---------------------------------------------------------------------------
// Page Component: Subcontractor Final Settlement & Labour Clearance
// ---------------------------------------------------------------------------

export default function SubcontractorSettlementPage() {
  const [subcontractors, setSubcontractors] =
    useState<SubcontractorRecord[]>(INITIAL_SUBCONTRACTORS);
  const [selectedSubId, setSelectedSubId] = useState<string>("sub-01");

  const selectedSub =
    subcontractors.find((s) => s.id === selectedSubId) || subcontractors[0];

  // Helper to compute net payable = Final Measured - Debit Notes
  const netPayable = selectedSub.finalMeasuredValue - selectedSub.debitNotes;

  // Check if all 5 statutory items are cleared for the active subcontractor
  const isBocwCleared = selectedSub.clearance.bocwCessPaid;
  const isEpfCleared = selectedSub.clearance.epfEsiVerified;
  const isLicenseCleared = selectedSub.clearance.labourLicenseActive;
  const isNoClaimCleared = selectedSub.clearance.noClaimSigned;
  const isSiteCleared = selectedSub.clearance.siteCleared;

  const totalChecklistItems = 0;
  const clearedChecklistCount = [
    isBocwCleared,
    isEpfCleared,
    isLicenseCleared,
    isNoClaimCleared,
    isSiteCleared,
  ].filter(Boolean).length;

  const allStatutoryCleared = clearedChecklistCount === totalChecklistItems;

  // Toggle individual compliance checkbox for active subcontractor
  const handleToggleClearance = (key: keyof StatutoryClearance) => {
    setSubcontractors((prev) =>
      prev.map((sub) => {
        if (sub.id === selectedSubId) {
          const updatedClearance = {
            ...sub.clearance,
            [key]: !sub.clearance[key],
          };
          const allOk = Object.values(updatedClearance).every(Boolean);
          return {
            ...sub,
            clearance: updatedClearance,
            settlementStatus: allOk ? "READY_FOR_PAYOUT" : "PENDING_CLEARANCE",
          };
        }
        return sub;
      })
    );
  };

  // Authorize Payout Action
  const handleAuthorizePayout = () => {
    if (!allStatutoryCleared) return;

    const authRef = `AUTH-SUB-PAY-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";

    setSubcontractors((prev) =>
      prev.map((sub) => {
        if (sub.id === selectedSubId) {
          return {
            ...sub,
            settlementStatus: "AUTHORIZED",
            authRef,
            authTimestamp: timestamp,
          };
        }
        return sub;
      })
    );
  };

  // Aggregate stats across all subcontractors
  const totalAward = subcontractors.reduce((acc, s) => acc + s.awardValue, 0);
  const totalMeasured = subcontractors.reduce((acc, s) => acc + s.finalMeasuredValue, 0);
  const totalDebit = subcontractors.reduce((acc, s) => acc + s.debitNotes, 0);
  const totalNet = totalMeasured - totalDebit;

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-sans">
      <div className="grid grid-cols-12 gap-6">
        {/* ===================================================================
            TOP ROW (col-span-12): Dashboard Header & KPI Summary
            =================================================================== */}
        <header className="col-span-12 bg-zinc-900 border border-zinc-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-zinc-800/50">
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
                  CONTRACTUAL CLOSEOUT &amp; AUDIT
                </span>
                <span className="text-zinc-600">/</span>
                <span className="text-xs font-mono tracking-tight text-zinc-400">
                  STATUTORY DISBURSEMENT GATEWAY
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-100 mt-1 uppercase font-mono">
                Subcontractor Final Settlement &amp; Labour Clearance (CPWD Cl. 19)
              </h1>
            </div>

            <div className="mt-3 md:mt-0 flex items-center gap-3 self-start md:self-auto">
              <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-500 font-medium">
                  BOCW &amp; CLRA COMPLIANT
                </span>
              </div>
              <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5">
                <span className="text-xs font-mono tabular-nums tracking-tight text-zinc-400">
                  5 CONTRACTORS IN AUDIT
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 px-5 py-2.5 text-xs text-zinc-400 bg-zinc-950/40">
            <div className="text-left border-r border-zinc-800/50 pr-4">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Total Award Baseline</span>
              <span className="text-zinc-100 font-mono tabular-nums font-bold block">{formatInr(totalAward)}</span>
            </div>
            <div className="text-left md:border-r border-zinc-800/50 px-0 md:px-4">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Gross Final Measured</span>
              <span className="text-zinc-100 font-mono tabular-nums font-bold block">{formatInr(totalMeasured)}</span>
            </div>
            <div className="text-left border-r border-zinc-800/50 pr-4 md:px-4 mt-2 md:mt-0">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Total Debit Deductions</span>
              <span className="text-rose-400 font-mono tabular-nums font-bold block">-{formatInr(totalDebit)}</span>
            </div>
            <div className="text-left pl-0 md:pl-4 mt-2 md:mt-0">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Net Terminal Liability</span>
              <span className="text-emerald-400 font-mono tabular-nums font-bold block">{formatInr(totalNet)}</span>
            </div>
          </div>
        </header>

        {/* ===================================================================
            LEFT COLUMN (col-span-12 lg:col-span-8): The Settlement Ledger
            =================================================================== */}
        <section className="col-span-12 lg:col-span-8 bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-zinc-800/50 flex items-center justify-between">
              <div>
                <h2 className="text-xs uppercase tracking-wider text-zinc-100 font-semibold text-left font-mono">
                  Subcontractor Financial Settlement Ledger
                </h2>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Select a vendor row to inspect and authorize statutory clearance
                </span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 border border-zinc-800 px-2 py-0.5">
                CPWD Cl. 19 &amp; Form 65
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/50 bg-zinc-950/50 text-[11px] text-zinc-500 font-mono uppercase tracking-wider">
                    <th className="py-2.5 px-4 font-normal text-left">Subcontractor (Trade)</th>
                    <th className="py-2.5 px-4 font-normal text-right">Award Value (₹)</th>
                    <th className="py-2.5 px-4 font-normal text-right">Final Measured Value (₹)</th>
                    <th className="py-2.5 px-4 font-normal text-right">Debit Notes (₹)</th>
                    <th className="py-2.5 px-4 font-normal text-right">Net Payable (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/30 text-xs font-mono">
                  {subcontractors.map((sub) => {
                    const rowNet = sub.finalMeasuredValue - sub.debitNotes;
                    const isSelected = sub.id === selectedSubId;
                    const allOk = Object.values(sub.clearance).every(Boolean);

                    return (
                      <tr
                        key={sub.id}
                        onClick={() => setSelectedSubId(sub.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-zinc-800/60 border-l-2 border-emerald-500"
                            : "hover:bg-zinc-800/20"
                        }`}
                      >
                        {/* Subcontractor (Trade) */}
                        <td className="py-3.5 px-4 text-left">
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                sub.settlementStatus === "AUTHORIZED"
                                  ? "bg-emerald-400"
                                  : allOk
                                  ? "bg-amber-400"
                                  : "bg-rose-500"
                              }`}
                            />
                            <span className="text-zinc-100 font-semibold font-mono text-xs">
                              {sub.name}
                            </span>
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono mt-0.5 pl-3.5">
                            {sub.trade} • <span className="text-zinc-400">{sub.vendorCode}</span>
                          </div>
                        </td>

                        {/* Award Value (₹) */}
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-zinc-400 whitespace-nowrap">
                          {formatInr(sub.awardValue)}
                        </td>

                        {/* Final Measured Value (₹) */}
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-zinc-200 font-medium whitespace-nowrap">
                          {formatInr(sub.finalMeasuredValue)}
                        </td>

                        {/* Debit Notes/Deductions (₹) */}
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-rose-400 whitespace-nowrap">
                          -{formatInr(sub.debitNotes)}
                        </td>

                        {/* Net Payable (₹) */}
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums text-emerald-400 font-bold whitespace-nowrap">
                          {formatInr(rowNet)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-5 py-3 border-t border-zinc-800/50 bg-zinc-950/50 text-[11px] text-zinc-500 font-mono flex justify-between items-center">
            <span>Terminal Subcontractor Settlement Ledger</span>
            <span>Selected Vendor: <span className="text-zinc-200">{selectedSub.name}</span></span>
          </div>
        </section>

        {/* ===================================================================
            RIGHT COLUMN (col-span-12 lg:col-span-4): Statutory Labour Gate
            =================================================================== */}
        <section className="col-span-12 lg:col-span-4 bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div>
            {/* Header: Selected Subcontractor Info */}
            <div className="px-5 py-3.5 border-b border-zinc-800/50 flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                  STATUTORY AUDIT GATEWAY
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 border uppercase font-semibold ${
                    selectedSub.settlementStatus === "AUTHORIZED"
                      ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                      : allStatutoryCleared
                      ? "bg-amber-950/60 border-amber-800 text-amber-400"
                      : "bg-rose-950/60 border-rose-800 text-rose-500"
                  }`}
                >
                  {selectedSub.settlementStatus === "AUTHORIZED"
                    ? "DISBURSAL AUTHORIZED"
                    : allStatutoryCleared
                    ? "READY FOR SIGN-OFF"
                    : "CLEARANCE PENDING"}
                </span>
              </div>
              <h3 className="text-sm font-bold font-mono text-zinc-100 uppercase truncate">
                {selectedSub.name}
              </h3>
              <div className="flex justify-between items-baseline text-xs font-mono pt-1">
                <span className="text-zinc-400">Net Payable Terminal:</span>
                <span className="text-emerald-400 font-bold tabular-nums">
                  {formatInr(netPayable)}
                </span>
              </div>
            </div>

            {/* Checklist Progress Meter */}
            <div className="px-5 py-2.5 border-b border-zinc-800/50 bg-zinc-950/50 flex justify-between items-center text-xs font-mono">
              <div className="flex items-center gap-2">
                {allStatutoryCleared ? (
                  <Unlock className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <Lock className="h-3.5 w-3.5 text-rose-500" />
                )}
                <span className="text-zinc-300">
                  {clearedChecklistCount} of {totalChecklistItems} Statutory Gates Cleared
                </span>
              </div>
              <span
                className={`font-bold tabular-nums ${
                  allStatutoryCleared ? "text-emerald-400" : "text-rose-500"
                }`}
              >
                {Math.round((clearedChecklistCount / totalChecklistItems) * 100)}%
              </span>
            </div>

            {/* Strict Vertical Checklist */}
            <div className="p-4 space-y-2.5">
              {/* Item 1: BOCW 1% Cess Paid */}
              <div
                onClick={() => handleToggleClearance("bocwCessPaid")}
                className={`p-3 border flex items-start justify-between cursor-pointer select-none transition-colors ${
                  isBocwCleared
                    ? "bg-zinc-950/50 border-zinc-800 hover:bg-zinc-800/30"
                    : "bg-rose-950/20 border-rose-900/60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isBocwCleared}
                    onChange={() => {}}
                    className="mt-0.5 h-4 w-4 rounded-none accent-emerald-600 bg-zinc-900 border-zinc-700 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold font-mono text-zinc-100 block">
                      BOCW 1% Cess Paid
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                      Building &amp; Other Construction Workers Act receipt verified
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase font-bold tracking-wider ${
                    isBocwCleared ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {isBocwCleared ? "CLEARED" : "PENDING"}
                </span>
              </div>

              {/* Item 2: EPF/ESI Challans Verified */}
              <div
                onClick={() => handleToggleClearance("epfEsiVerified")}
                className={`p-3 border flex items-start justify-between cursor-pointer select-none transition-colors ${
                  isEpfCleared
                    ? "bg-zinc-950/50 border-zinc-800 hover:bg-zinc-800/30"
                    : "bg-rose-950/20 border-rose-900/60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isEpfCleared}
                    onChange={() => {}}
                    className="mt-0.5 h-4 w-4 rounded-none accent-emerald-600 bg-zinc-900 border-zinc-700 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold font-mono text-zinc-100 block">
                      EPF/ESI Challans Verified
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                      TRRN wage contribution slips reconciled for all site labor
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase font-bold tracking-wider ${
                    isEpfCleared ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {isEpfCleared ? "CLEARED" : "PENDING"}
                </span>
              </div>

              {/* Item 3: Labour License (Form VI) Active */}
              <div
                onClick={() => handleToggleClearance("labourLicenseActive")}
                className={`p-3 border flex items-start justify-between cursor-pointer select-none transition-colors ${
                  isLicenseCleared
                    ? "bg-zinc-950/50 border-zinc-800 hover:bg-zinc-800/30"
                    : "bg-rose-950/20 border-rose-900/60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isLicenseCleared}
                    onChange={() => {}}
                    className="mt-0.5 h-4 w-4 rounded-none accent-emerald-600 bg-zinc-900 border-zinc-700 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold font-mono text-zinc-100 block">
                      Labour License (Form VI) Active
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                      Contract Labour (Regulation &amp; Abolition) validity verified
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase font-bold tracking-wider ${
                    isLicenseCleared ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {isLicenseCleared ? "CLEARED" : "PENDING"}
                </span>
              </div>

              {/* Item 4: No-Claim Certificate Signed */}
              <div
                onClick={() => handleToggleClearance("noClaimSigned")}
                className={`p-3 border flex items-start justify-between cursor-pointer select-none transition-colors ${
                  isNoClaimCleared
                    ? "bg-zinc-950/50 border-zinc-800 hover:bg-zinc-800/30"
                    : "bg-rose-950/20 border-rose-900/60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isNoClaimCleared}
                    onChange={() => {}}
                    className="mt-0.5 h-4 w-4 rounded-none accent-emerald-600 bg-zinc-900 border-zinc-700 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold font-mono text-zinc-100 block">
                      No-Claim Certificate Signed
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                      CPWD Form 65 unconditional legal discharge countersigned
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase font-bold tracking-wider ${
                    isNoClaimCleared ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {isNoClaimCleared ? "CLEARED" : "PENDING"}
                </span>
              </div>

              {/* Item 5: Site Cleared of Debris */}
              <div
                onClick={() => handleToggleClearance("siteCleared")}
                className={`p-3 border flex items-start justify-between cursor-pointer select-none transition-colors ${
                  isSiteCleared
                    ? "bg-zinc-950/50 border-zinc-800 hover:bg-zinc-800/30"
                    : "bg-rose-950/20 border-rose-900/60"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={isSiteCleared}
                    onChange={() => {}}
                    className="mt-0.5 h-4 w-4 rounded-none accent-emerald-600 bg-zinc-900 border-zinc-700 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold font-mono text-zinc-100 block">
                      Site Cleared of Debris
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono block mt-0.5">
                      CPWD Cl. 1A site cleaning, scrap handoff &amp; snag closure
                    </span>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase font-bold tracking-wider ${
                    isSiteCleared ? "text-emerald-500" : "text-rose-500"
                  }`}
                >
                  {isSiteCleared ? "CLEARED" : "PENDING"}
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Gate: Authorize Button */}
          <div className="p-4 border-t border-zinc-800/50 bg-zinc-950/40">
            {selectedSub.settlementStatus === "AUTHORIZED" && selectedSub.authRef && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-left mb-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono font-bold uppercase mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Terminal Disbursal Authorized
                </div>
                <div className="text-[10px] font-mono text-zinc-300">
                  REF: <span className="text-emerald-400">{selectedSub.authRef}</span>
                </div>
                <div className="text-[10px] font-mono text-zinc-500 mt-0.5">
                  Timestamp: {selectedSub.authTimestamp}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleAuthorizePayout}
              disabled={!allStatutoryCleared || selectedSub.settlementStatus === "AUTHORIZED"}
              className={`w-full py-3 px-4 font-mono text-xs uppercase tracking-wider font-semibold transition-colors ${
                !allStatutoryCleared || selectedSub.settlementStatus === "AUTHORIZED"
                  ? "opacity-50 cursor-not-allowed bg-zinc-800 text-zinc-500 border border-zinc-700"
                  : "bg-zinc-100 hover:bg-zinc-300 text-zinc-950 cursor-pointer shadow-none"
              }`}
            >
              {selectedSub.settlementStatus === "AUTHORIZED"
                ? "Disbursal Formally Authorized"
                : "Authorize Final Subcontractor Payout"}
            </button>

            {!allStatutoryCleared && (
              <p className="text-[10px] font-mono text-rose-500 text-center mt-2 flex items-center justify-center gap-1">
                <ShieldAlert className="h-3 w-3" />
                Disbursal blocked: All 5 statutory labour clearance gates must be cleared
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
