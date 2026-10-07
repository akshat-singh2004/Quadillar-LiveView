"use client";

import React from "react";
import {
  TrendingUp,
  AlertTriangle,
  Building2,
  Lock,
} from "lucide-react";

export interface ExecutiveMetrics {
  grossWorkExecutedInr: number;
  unbilledMbInventoryInr: number;
  totalCertifiedNetInr: number;
  retentionEscrowInr: number;
  ncrWithholdsInr: number;
  cpi: number;
  spi: number;
  safeManHours: number;
  clause5DelayDays: number;
  ldExposureInr: number;
  criticalPoursFrozen: number;
  gccProtocol: string;
}

function formatInr(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function ExecutiveCommandHub({ metrics }: { metrics: ExecutiveMetrics }) {
  const isCpiHealthy = metrics.cpi >= 1.0;
  const isSpiHealthy = metrics.spi >= 1.0;

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* STATUS STRIP */}
      <div className="bg-zinc-900 border border-zinc-800 px-5 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-200 font-bold uppercase tracking-wider">
              ENTERPRISE AUDIT ACTIVE
            </span>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">{metrics.gccProtocol}</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-zinc-500">
            HSE SAFE HOURS:{" "}
            <strong className="text-emerald-400 font-bold">
              {metrics.safeManHours.toLocaleString("en-IN")} HRS
            </strong>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500">
            FROZEN STAGE-GATES:{" "}
            <strong
              className={
                metrics.criticalPoursFrozen > 0
                  ? "text-rose-400 font-bold"
                  : "text-zinc-300"
              }
            >
              {metrics.criticalPoursFrozen}
            </strong>
          </span>
        </div>
      </div>

      {/* 4 PRIMARY PILLARS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Production Executed */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between rounded-xl">
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
              <span>Gross Production Executed</span>
              <Building2 className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-3 flex flex-col items-end">
              <span className="text-2xl font-bold text-zinc-100 tabular-nums">
                {formatInr(metrics.grossWorkExecutedInr)}
              </span>
              <span className="text-[10px] text-amber-400 mt-0.5">
                Unbilled e-MB: {formatInr(metrics.unbilledMbInventoryInr)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-zinc-500">
            <span>Disbursed Net IPC:</span>
            <span className="text-emerald-400 font-bold">
              {formatInr(metrics.totalCertifiedNetInr)}
            </span>
          </div>
        </div>

        {/* CPI & SPI */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between rounded-xl">
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
              <span>Cost &amp; Schedule Index</span>
              <TrendingUp className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 block">COST (CPI)</span>
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    isCpiHealthy ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {metrics.cpi.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block">SCHEDULE (SPI)</span>
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    isSpiHealthy ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {metrics.spi.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-zinc-500">
            <span>Efficiency Verdict:</span>
            <span
              className={
                isCpiHealthy && isSpiHealthy
                  ? "text-emerald-400 font-bold"
                  : "text-amber-400 font-bold"
              }
            >
              {isCpiHealthy && isSpiHealthy
                ? "Target Baseline Surpassed"
                : "Under Schedule Friction"}
            </span>
          </div>
        </div>

        {/* Clause 5 Delay Defense */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between rounded-xl">
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
              <span>Statutory Hindrance Defense</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-3 flex flex-col items-end">
              <span
                className={`text-2xl font-bold tabular-nums ${
                  metrics.clause5DelayDays > 0 ? "text-amber-400" : "text-zinc-100"
                }`}
              >
                {metrics.clause5DelayDays} Delay Days
              </span>
              <span className="text-[10px] text-zinc-500 mt-0.5">
                Contemporaneous Logged (Cl. 5)
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-zinc-500">
            <span>Potential LD Exposure:</span>
            <span
              className={
                metrics.ldExposureInr > 0 ? "text-rose-400 font-bold" : "text-zinc-400"
              }
            >
              {metrics.ldExposureInr > 0 ? formatInr(metrics.ldExposureInr) : "Zero Liability"}
            </span>
          </div>
        </div>

        {/* Retention Escrow & QMS */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between rounded-xl">
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
              <span>Retention Escrow &amp; QMS</span>
              <Lock className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3 flex flex-col items-end">
              <span className="text-2xl font-bold text-zinc-100 tabular-nums">
                {formatInr(metrics.retentionEscrowInr)}
              </span>
              <span className="text-[10px] text-rose-400 mt-0.5">
                NCR Withholds: -{formatInr(metrics.ncrWithholdsInr)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-zinc-500">
            <span>Cl. 17 DLP Escrow:</span>
            <span className="text-emerald-400 font-bold">Tranche 1 Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExecutiveCommandHub;
