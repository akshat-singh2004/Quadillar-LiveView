// components/safety/StrippingPermitCard.tsx
"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertOctagon,
  Lock,
  Unlock,
  Layers,
  Calendar,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface StrippingPermitItem {
  id: string;
  elementTag: string;
  spanDimensions: string;
  pourDate: string;
  curingAgeDays: number;
  elementCategory: string; // e.g., "Slab Props > 4.5m - Min 14 Days"
  requiredDays: number;
  achievedCubeMpa: number;
  requiredCubeMpa: number;
  designFckMpa: number;
  fckPercent: number; // e.g., 70
  isAuthorized?: boolean;
}

export interface StrippingPermitCardProps {
  permit?: StrippingPermitItem;
  initialPermit?: StrippingPermitItem;
  onAuthorize?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Client Component: StrippingPermitCard
// ---------------------------------------------------------------------------

export function StrippingPermitCard({
  permit: incomingPermit,
  initialPermit,
  onAuthorize,
}: StrippingPermitCardProps) {
  const permitData = incomingPermit || initialPermit || {
    id: "str-001",
    elementTag: "SLAB-L3-BAY-A2",
    spanDimensions: "Span: 5.2m",
    pourDate: "05-SEP-2026",
    curingAgeDays: 14,
    elementCategory: "Slab Props > 4.5m - Min 14 Days",
    requiredDays: 14,
    achievedCubeMpa: 22.4,
    requiredCubeMpa: 21.0,
    designFckMpa: 30,
    fckPercent: 70,
    isAuthorized: false,
  };

  const [authorized, setAuthorized] = useState(permitData.isAuthorized ?? false);

  // Dual-Condition Validation Engine
  // Gate 1: Statutory Age Elapsed
  const isGate1Satisfied = permitData.curingAgeDays >= permitData.requiredDays;

  // Gate 2: Concrete Maturity / Cube Test Verification (Achieved >= Required)
  const isGate2Satisfied = permitData.achievedCubeMpa >= permitData.requiredCubeMpa;

  // Safety Lock: BOTH Gate 1 and Gate 2 must be satisfied
  const canStrip = isGate1Satisfied && isGate2Satisfied;

  const handleAuthorize = () => {
    if (!canStrip) return;
    setAuthorized(true);
    onAuthorize?.(permitData.id);
  };

  return (
    <article className="bg-zinc-900 border border-zinc-800 p-5 rounded-none flex flex-col justify-between space-y-4 hover:border-zinc-700 transition-colors font-sans">
      {/* ===================================================================
          STRUCTURAL ELEMENT DETAILS & HEADER
          =================================================================== */}
      <div className="space-y-3">
        {/* Header Row: Element Tag & Span/Dimensions */}
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  authorized
                    ? "bg-emerald-400"
                    : canStrip
                    ? "bg-emerald-500 animate-pulse"
                    : "bg-rose-500"
                }`}
              />
              <span className="font-mono text-sm font-bold text-zinc-100 tracking-wider">
                {permitData.elementTag}
              </span>
            </div>
            <div className="text-xs text-zinc-400 font-mono mt-0.5">
              {permitData.spanDimensions}
            </div>
          </div>

          {/* Scaffolding Status Badge */}
          <span
            className={`text-[10px] font-mono border uppercase tracking-wider font-bold px-2 py-0.5 whitespace-nowrap ${
              authorized
                ? "bg-emerald-950/60 border-emerald-700 text-emerald-400"
                : canStrip
                ? "bg-emerald-950/30 border-emerald-800 text-emerald-400"
                : "bg-rose-950/40 border-rose-800 text-rose-400"
            }`}
          >
            {authorized ? "STRIPPING AUTHORIZED" : canStrip ? "READY FOR DE-SHUTTER" : "STATUTORY HOLD"}
          </span>
        </div>

        {/* Concrete Pour Date & Curing Age */}
        <div className="bg-zinc-950/60 p-2.5 border border-zinc-800/80 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5 text-zinc-400">
            <Calendar className="h-3.5 w-3.5 text-zinc-500" />
            <span>Poured: {permitData.pourDate}</span>
          </div>
          <div className="text-zinc-200 tabular-nums">
            Curing Age: <strong className="text-zinc-100">{permitData.curingAgeDays} Days</strong>
          </div>
        </div>

        {/* Element Type Formwork Category */}
        <div className="text-xs font-mono">
          <span className="text-[10px] uppercase text-zinc-500 block">Formwork Code Category (IS:456 Cl. 11.3)</span>
          <span className="text-zinc-200 font-medium">{permitData.elementCategory}</span>
        </div>
      </div>

      {/* ===================================================================
          DUAL-CONDITION VALIDATION ENGINE
          =================================================================== */}
      <div className="space-y-2.5 bg-zinc-950 p-3.5 border border-zinc-800/80 font-mono text-xs">
        <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold flex items-center justify-between">
          <span>Dual-Gate Safety Interlock</span>
          <span className="text-zinc-500">IS:456 / CPWD Standard</span>
        </div>

        {/* Gate 1: Statutory Age Elapsed */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
          <div>
            <span className="text-zinc-400 block text-[11px]">Gate 1: Statutory Age Elapsed</span>
            <span className="text-[10px] text-zinc-500">
              Min Required: {permitData.requiredDays} Days
            </span>
          </div>
          <div className="text-right">
            <span
              className={`font-bold tabular-nums text-xs ${
                isGate1Satisfied ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {permitData.curingAgeDays} / {permitData.requiredDays} Days Elapsed
            </span>
            <span
              className={`block text-[10px] ${
                isGate1Satisfied ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isGate1Satisfied ? "PASS (Age Met)" : "HOLD (Inadequate Age)"}
            </span>
          </div>
        </div>

        {/* Gate 2: Concrete Maturity / Cube Test Verification */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
          <div>
            <span className="text-zinc-400 block text-[11px]">
              Gate 2: Concrete Cube Strength (70% f_ck)
            </span>
            <span className="text-[10px] text-zinc-500">
              Target Grade: M{permitData.designFckMpa}
            </span>
          </div>
          <div className="text-right">
            <span
              className={`font-bold tabular-nums text-xs ${
                isGate2Satisfied ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              {permitData.achievedCubeMpa.toFixed(1)} / {permitData.requiredCubeMpa.toFixed(1)} MPa
            </span>
            <span
              className={`block text-[10px] ${
                isGate2Satisfied ? "text-emerald-400" : "text-rose-400"
              }`}
            >
              {isGate2Satisfied
                ? `PASS (${((permitData.achievedCubeMpa / permitData.designFckMpa) * 100).toFixed(0)}% f_ck)`
                : `HOLD (${((permitData.achievedCubeMpa / permitData.designFckMpa) * 100).toFixed(0)}% < 70%)`}
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================================
          SAFETY LOCK ACTION
          =================================================================== */}
      <div className="pt-2">
        {canStrip ? (
          <button
            type="button"
            onClick={handleAuthorize}
            disabled={authorized}
            className={`font-bold uppercase tracking-wider text-xs py-2.5 w-full text-center transition-colors font-mono cursor-pointer border ${
              authorized
                ? "bg-zinc-950 border-emerald-800 text-emerald-400 cursor-default"
                : "bg-emerald-600 hover:bg-emerald-500 text-zinc-100 border-emerald-500"
            }`}
          >
            {authorized ? "Stripping Authorized ✓" : "Authorize Formwork Stripping"}
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="bg-zinc-800 text-zinc-500 cursor-not-allowed opacity-60 font-mono text-xs py-2.5 w-full text-center border border-zinc-700 select-none uppercase tracking-wider font-bold"
          >
            STRIPPING BLOCKED: STATUTORY HOLD ACTIVE
          </button>
        )}
      </div>
    </article>
  );
}

export default StrippingPermitCard;