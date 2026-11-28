"use client";

import React from "react";
import Link from "next/link";
import { useGovernor } from "@/context/GovernorContext";
import { ResponsiveEscrowLedger } from "@/components/ui/ResponsiveEscrowLedger";

export type GovernorModule =
  | "WIND_STABILITY"
  | "GANTT_EVM"
  | "CONCRETE_MATURITY"
  | "RA_BILLS"
  | "AUDIT_VAULT"
  | "PTW_SAFETY"
  | "MATERIAL_RECON"
  | "EVM_SCURVE";

const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function GovernorInterlockBanner({ module }: { module: GovernorModule }) {
  const { input, snapshot, patchInput } = useGovernor();

  const downloadBsaManifest = () => {
    const manifest = {
      certificateStandard: "Bharatiya Sakshya Adhiniyam, 2023 — Section 63(4) Schedule (Part A & Part B Payload)",
      generatedAtUtc: new Date().toISOString(),
      projectId: input.projectId,
      zoneId: input.zoneId,
      bimGlobalId: input.bimGlobalId,
      raBillNo: input.raBillNo,
      ledger: snapshot.bsaSec63Ledger,
      escrowVerdict: snapshot.escrow,
      activeViolations: snapshot.violations,
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `BSA-Sec63-Manifest-${input.raBillNo}-${input.bimGlobalId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4 text-zinc-100 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 text-[10px] font-mono font-bold uppercase text-sky-300">
            MOLECULAR GOVERNOR LIVE LINK
          </span>
          <span className="text-xs font-mono text-zinc-400">
            {input.zoneId} • {input.bimGlobalId} • {input.raBillNo}
          </span>
        </div>
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-mono font-bold ${
            snapshot.bimStatusMap[input.bimGlobalId] === "RED"
              ? "bg-red-600 text-white"
              : "bg-emerald-600 text-white"
          }`}
        >
          BIM {input.bimGlobalId}: {snapshot.bimStatusMap[input.bimGlobalId]}
        </span>
      </div>

      {module === "WIND_STABILITY" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">LIVE GUST (IS 875 PT.3)</div>
            <div className="mt-1 text-base font-bold text-white">{(snapshot.windSafety.windSpeedKmh / 3.6).toFixed(1)} m/s</div>
            <input
              type="range"
              min={5}
              max={25}
              step={0.5}
              value={input.windSpeedMs}
              onChange={(e) => patchInput({ windSpeedMs: Number(e.target.value) })}
              className="mt-2 w-full accent-sky-400"
            />
          </div>
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">OVERTURNING FoS (MIN 1.50)</div>
            <div className={`mt-1 text-base font-bold ${snapshot.windSafety.craneLockout ? "text-red-400" : "text-emerald-400"}`}>
              {snapshot.windSafety.factorOfSafety}x ({snapshot.windSafety.pressurePa} Pa)
            </div>
          </div>
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">TOWER CRANE PTW</div>
            <div className={`mt-1 text-base font-bold ${snapshot.permits.craneLiftPtwAllowed ? "text-emerald-400" : "text-red-400"}`}>
              {snapshot.permits.craneLiftPtwAllowed ? "UNLOCKED" : "LOCKED OUT"}
            </div>
          </div>
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">HINDRANCE EOT LOG</div>
            <div className="mt-1 text-sm font-bold text-amber-300">
              {snapshot.windSafety.logHindranceEot ? "AUTO-LOGGED TO EOT" : "NO STOPPAGE"}
            </div>
          </div>
        </div>
      )}

      {module === "CONCRETE_MATURITY" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">NURSE-SAUL MATURITY</div>
            <div className="mt-1 text-base font-bold text-white">
              {input.probeMaturityCHrs} / {input.requiredStripMaturityCHrs} °C·h
            </div>
            <input
              type="range"
              min={1500}
              max={8000}
              step={100}
              value={input.probeMaturityCHrs}
              onChange={(e) => patchInput({ probeMaturityCHrs: Number(e.target.value) })}
              className="mt-2 w-full accent-sky-400"
            />
          </div>
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">CORE / THERMAL GRADIENT</div>
            <div className={`mt-1 text-base font-bold ${snapshot.concrete.thermalGradientC > 20 ? "text-red-400" : "text-emerald-400"}`}>
              {input.probeCoreTempC}°C / Δ{snapshot.concrete.thermalGradientC}°C
            </div>
          </div>
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">IS 456 CUBE MEAN / MIN</div>
            <div className="mt-1 text-base font-bold text-white">
              {snapshot.concrete.meanCubeMpa} / {snapshot.concrete.minCubeMpa} MPa
            </div>
          </div>
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">SOFFIT STRIPPING PTW</div>
            <div className={`mt-1 text-base font-bold ${snapshot.permits.strippingPtwAllowed ? "text-emerald-400" : "text-red-400"}`}>
              {snapshot.permits.strippingPtwAllowed ? "STRIP ALLOWED" : "HARD LOCKED"}
            </div>
          </div>
        </div>
      )}

      {module === "PTW_SAFETY" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
          <div className={`rounded-lg p-3 border ${snapshot.permits.strippingPtwAllowed ? "border-emerald-500/40 bg-emerald-950/30" : "border-red-500/50 bg-red-950/40"}`}>
            <div className="text-zinc-300">FORMWORK STRIPPING INTERLOCK (LOOP 1)</div>
            <div className="mt-1 text-base font-bold text-white">
              {snapshot.permits.strippingPtwAllowed ? "CLEARED TO STRIP" : "BLOCKED BY MATURITY / CUBE / THERMAL"}
            </div>
          </div>
          <div className={`rounded-lg p-3 border ${snapshot.permits.craneLiftPtwAllowed ? "border-emerald-500/40 bg-emerald-950/30" : "border-red-500/50 bg-red-950/40"}`}>
            <div className="text-zinc-300">TOWER CRANE LIFT INTERLOCK (LOOP 3)</div>
            <div className="mt-1 text-base font-bold text-white">
              {snapshot.permits.craneLiftPtwAllowed ? "CLEARED TO LIFT" : `LOCKED — WIND ${(snapshot.windSafety.windSpeedKmh / 3.6).toFixed(1)} m/s (FoS ${snapshot.windSafety.factorOfSafety})`}
            </div>
          </div>
        </div>
      )}

      {module === "MATERIAL_RECON" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">WEIGHBRIDGE INFLOW (MT)</div>
            <div className="mt-1 text-base font-bold text-white">
              {input.weighbridgeCementMt} / {input.billedCementMt} MT billed
            </div>
            <input
              type="range"
              min={14.0}
              max={18.5}
              step={0.1}
              value={input.weighbridgeCementMt}
              onChange={(e) => patchInput({ weighbridgeCementMt: Number(e.target.value) })}
              className="mt-2 w-full accent-sky-400"
            />
          </div>
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">GATE SHORTAGE</div>
            <div className={`mt-1 text-base font-bold ${snapshot.materialRecon.gateShortagePct > 3 ? "text-red-400" : "text-emerald-400"}`}>
              {snapshot.materialRecon.gateShortageMt} MT ({snapshot.materialRecon.gateShortagePct}%)
            </div>
          </div>
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">BATCH VARIANCE VS DESIGN</div>
            <div className="mt-1 text-base font-bold text-white">
              {snapshot.concrete.cementVariancePct}% (w/c max {snapshot.concrete.maxBatchWcRatio})
            </div>
          </div>
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">CPWD CL. 42 PENALTY (2X)</div>
            <div className="mt-1 text-base font-bold text-amber-300">
              -{formatInr(snapshot.materialRecon.clause42PenalRecoveryInr)}
            </div>
          </div>
        </div>
      )}

      {(module === "GANTT_EVM" || module === "EVM_SCURVE") && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">CLAIMED VS GREEN-VERIFIED EV</div>
            <div className="mt-1 text-sm font-bold text-white">
              {formatInr(snapshot.evm.claimedEvInr)} → <span className="text-emerald-400">{formatInr(snapshot.evm.verifiedGreenEvInr)}</span>
            </div>
          </div>
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">TRUE SPI (CLAIMED {snapshot.evm.claimedSpi})</div>
            <div className={`mt-1 text-base font-bold ${snapshot.evm.verifiedSpi < 0.85 ? "text-red-400" : "text-emerald-400"}`}>
              {snapshot.evm.verifiedSpi}
            </div>
          </div>
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">TRUE CPI (CLAIMED {snapshot.evm.claimedCpi})</div>
            <div className={`mt-1 text-base font-bold ${snapshot.evm.verifiedCpi < 0.85 ? "text-red-400" : "text-emerald-400"}`}>
              {snapshot.evm.verifiedCpi}
            </div>
          </div>
          <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
            <div className="text-zinc-400">PROJECTED OVERRUN (EAC-BAC)</div>
            <div className="mt-1 text-base font-bold text-amber-300">
              {formatInr(snapshot.evm.projectedOverrunInr)}
            </div>
          </div>
        </div>
      )}

      {module === "RA_BILLS" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
            <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800">
              <div className="text-zinc-400">GROSS CLAIM</div>
              <div className="mt-1 text-sm md:text-base font-bold text-white">{formatInr(snapshot.escrow.grossClaimInr)}</div>
            </div>
            <div className="rounded-lg bg-zinc-950 p-3 border border-red-500/40">
              <div className="text-red-300">FROZEN (HTTP 422)</div>
              <div className="mt-1 text-sm md:text-base font-bold text-red-400">{formatInr(snapshot.escrow.frozenInr)}</div>
            </div>
            <div className="rounded-lg bg-zinc-950 p-3 border border-amber-500/40">
              <div className="text-amber-300">CL. 42 + STATUTORY DED.</div>
              <div className="mt-1 text-sm md:text-base font-bold text-amber-300">
                -{formatInr(
                  snapshot.escrow.retention5Inr +
                    snapshot.escrow.mobAdvance10Inr +
                    snapshot.escrow.itTds2Inr +
                    snapshot.escrow.bocwCess1Inr +
                    snapshot.escrow.gstTds2Inr +
                    snapshot.escrow.clause42PenaltyInr
                )}
              </div>
            </div>
            <div className="rounded-lg bg-zinc-950 p-3 border border-emerald-500/40">
              <div className="text-emerald-300">NET RTGS RELEASE (+18% GST)</div>
              <div className="mt-1 text-sm md:text-base font-bold text-emerald-400">{formatInr(snapshot.escrow.netCertifiedReleaseInr)}</div>
            </div>
          </div>
          <ResponsiveEscrowLedger tranches={input.tranches} bimStatusMap={snapshot.bimStatusMap} />
        </div>
      )}

      {module === "AUDIT_VAULT" && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-lg bg-zinc-950 p-3 border border-zinc-800 text-xs font-mono">
          <div className="space-y-1 min-w-0">
            <div className="text-emerald-400 font-bold">BHARATIYA SAKSHYA ADHINIYAM (BSA) 2023 — SECTION 63 HASH CHAIN</div>
            <div className="text-zinc-300 truncate">SHA-256: {snapshot.bsaSec63Ledger.rowHash}</div>
            <div className="text-zinc-500">
              UTC: {snapshot.bsaSec63Ledger.recordedAtUtc} • Violations Sealed: {snapshot.violations.length}
            </div>
          </div>
          <button
            type="button"
            onClick={downloadBsaManifest}
            className="shrink-0 min-h-[44px] rounded-lg bg-zinc-100 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-white"
          >
            Export BSA Sec 63 Manifest
          </button>
        </div>
      )}

      {snapshot.violations.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] font-mono text-red-300">
          <span>
            Active Triggers: {snapshot.violations.map((v) => v.code).join(" • ")}
          </span>
          <Link href="/finance/ra-bills" className="text-sky-400 hover:underline">
            Inspect Escrow Impact →
          </Link>
        </div>
      )}
    </section>
  );
}
