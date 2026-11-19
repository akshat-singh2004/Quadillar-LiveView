"use client";

import React from "react";
import { BadgeCheck, AlertTriangle, Radio } from "lucide-react";

export type ProvenanceKind =
  | "Verified Field Audio + Photo"
  | "Lab Core Certificate"
  | "Live IoT Feed"
  | "BSA Sec. 63 / Sec. 65B Vault"
  | "LOD-400 BIM Sync"
  | "UP-LDA Escrow Ledger";

interface ProvenancePillProps {
  source: ProvenanceKind | string;
  lastUpdatedIso?: string;
  staleThresholdMinutes?: number;
}

export default function ProvenancePill({
  source,
  lastUpdatedIso,
  staleThresholdMinutes = 15,
}: ProvenancePillProps) {
  let isStale = false;
  let ageMinutes = 0;

  if (lastUpdatedIso) {
    const ts = Date.parse(lastUpdatedIso);
    if (Number.isFinite(ts)) {
      ageMinutes = Math.max(0, Math.floor((Date.now() - ts) / 60000));
      isStale = ageMinutes > staleThresholdMinutes;
    }
  }

  if (isStale) {
    return (
      <span
        title={`Last telemetry packet received ${ageMinutes}m ago (> ${staleThresholdMinutes}m SLA)`}
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[9px] font-bold tracking-tight shrink-0"
      >
        <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
        STALE TELEMETRY ({ageMinutes}m)
      </span>
    );
  }

  const isLiveIoT = source === "Live IoT Feed";

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-950/90 border border-zinc-800 text-zinc-300 text-[9px] font-bold tracking-tight shrink-0">
      {isLiveIoT ? (
        <Radio className="w-2.5 h-2.5 text-emerald-400" />
      ) : (
        <BadgeCheck className="w-2.5 h-2.5 text-emerald-400" />
      )}
      {source}
    </span>
  );
}
