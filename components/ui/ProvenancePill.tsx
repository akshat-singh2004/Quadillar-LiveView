"use client";

import React from "react";
import { BadgeCheck, AlertTriangle, Radio } from "lucide-react";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";

export type ProvenanceKind =
  | "Verified Field Audio + Photo"
  | "Lab Core Certificate"
  | "Live IoT Feed"
  | "BSA Sec. 63 / BSA Sec 63 Vault"
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
  const { isLight } = useLiveviewTheme();
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
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-500 text-[9px] font-bold tracking-tight shrink-0"
      >
        <AlertTriangle className="w-2.5 h-2.5" />
        STALE ({ageMinutes}m)
      </span>
    );
  }

  const isLiveIoT = source === "Live IoT Feed";

  return (
    <span
      style={{
        backgroundColor: isLight ? "#EFECE4" : "#18181B",
        borderColor: isLight ? "#D8D1C3" : "#27272A",
        color: isLight ? "#57534E" : "#A1A1AA",
      }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[9px] font-semibold tracking-tight shrink-0"
    >
      {isLiveIoT ? (
        <Radio className="w-2.5 h-2.5 text-emerald-500" />
      ) : (
        <BadgeCheck className="w-2.5 h-2.5 text-emerald-500" />
      )}
      {source}
    </span>
  );
}
