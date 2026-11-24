"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useGovernor } from "@/context/GovernorContext";
import {
  dispatchGovernanceAlert,
  type GovernanceAlertEvent,
} from "@/lib/notifications/dispatcher";
import { NOTIFICATION_STORAGE_KEY } from "@/lib/notifications/preferences";

interface ActiveToast {
  event: GovernanceAlertEvent;
  channels: string[];
}

const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function GovernorAlertListener() {
  const { input, snapshot } = useGovernor();
  const prevCodesRef = useRef<Set<string> | null>(null);
  const [toast, setToast] = useState<ActiveToast | null>(null);

  // Hydrate saved Supabase notification preferences into localStorage once per session
  useEffect(() => {
    fetch("/api/settings/notifications?userKey=default-operator")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.preferences) {
          try {
            localStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(data.preferences));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Listen to real-time Molecular Governor state transitions across all 43 routes
  useEffect(() => {
    const currentCodes = new Set(snapshot.violations.map((v) => v.code));

    // Record baseline on initial hydration so page load doesn't spam popups
    if (prevCodesRef.current === null) {
      prevCodesRef.current = currentCodes;
      return;
    }

    const newlyAdded = snapshot.violations.filter((v) => !prevCodesRef.current?.has(v.code));
    prevCodesRef.current = currentCodes;

    if (newlyAdded.length === 0) return;

    const events: GovernanceAlertEvent[] = [];

    if (snapshot.escrow.httpStatus === 422 && newlyAdded.some((v) => v.blocksPayout)) {
      events.push({
        id: `escrow-422-${input.raBillNo}`,
        trigger: "escrowHold422",
        severity: "CRITICAL",
        title: `HTTP 422 Hold • ${input.bimGlobalId} (${input.raBillNo})`,
        body: `${formatInr(snapshot.escrow.frozenInr)} frozen. Net RTGS adjusted to ${formatInr(snapshot.escrow.netCertifiedReleaseInr)}.`,
        url: "/finance/ra-bills",
      });
    }

    if (newlyAdded.some((v) => v.code === "CRANE_WIND_LOCKOUT")) {
      events.push({
        id: `crane-wind-${input.zoneId}`,
        trigger: "craneWindLockout",
        severity: "HIGH",
        title: `Crane Wind Lockout • ${snapshot.windSafety.windSpeedKmh} km/h`,
        body: `Overturning FoS dropped to ${snapshot.windSafety.factorOfSafety}x (<1.50). PTW locked & EOT logged.`,
        url: "/site/wind-stability",
      });
    }

    if (
      newlyAdded.some((v) =>
        ["MATURITY_STRIP_LOCK", "THERMAL_CRACK_DEF_RISK", "IS456_CUBE_FAILURE"].includes(v.code)
      )
    ) {
      events.push({
        id: `concrete-lock-${input.bimGlobalId}`,
        trigger: "concreteMaturityLock",
        severity: "CRITICAL",
        title: `IS 456 Structural Lock • ${input.bimGlobalId}`,
        body: `Stripping PTW blocked. Mean ${snapshot.concrete.meanCubeMpa} MPa, ΔT ${snapshot.concrete.thermalGradientC}°C.`,
        url: "/engineering/concrete-maturity",
      });
    }

    if (newlyAdded.some((v) => v.code === "GATE_WEIGHBRIDGE_SHORTAGE")) {
      events.push({
        id: `clause42-${input.zoneId}`,
        trigger: "weighbridgeShortage",
        severity: "HIGH",
        title: `Clause 42 Gate Shortage • ${snapshot.materialRecon.gateShortageMt} MT`,
        body: `Auto-deducted 2x penal recovery of ${formatInr(snapshot.materialRecon.clause42PenalRecoveryInr)} on ${input.raBillNo}.`,
        url: "/materials/reconciliation",
      });
    }

    const primary = events[0];
    if (!primary) return;

    dispatchGovernanceAlert(primary).then((res) => {
      if (res.dispatched) {
        setToast({ event: primary, channels: res.firedChannels });
      }
    });
  }, [input.bimGlobalId, input.raBillNo, input.zoneId, snapshot]);

  // Listen to Field Capture offline flush & HTTP 409 duplicate rejection events
  useEffect(() => {
    const onFieldEvent = (ev: Event) => {
      const detail = (ev as CustomEvent<GovernanceAlertEvent>).detail;
      if (!detail) return;
      dispatchGovernanceAlert(detail).then((res) => {
        if (res.dispatched) {
          setToast({ event: detail, channels: res.firedChannels });
        }
      });
    };
    window.addEventListener("quadillar:field-event", onFieldEvent);
    return () => window.removeEventListener("quadillar:field-event", onFieldEvent);
  }, []);

  // Auto-dismiss visual toast after 7 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 7000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  return (
    <div className="fixed bottom-20 lg:bottom-5 right-3 sm:right-5 z-50 w-[min(380px,calc(100vw-24px))] rounded-xl border border-red-500/60 bg-zinc-950/95 p-3.5 shadow-2xl backdrop-blur text-xs font-mono">
      <div className="flex items-start justify-between gap-2">
        <div className="font-bold text-red-300">{toast.event.title}</div>
        <button
          type="button"
          onClick={() => setToast(null)}
          className="text-zinc-500 hover:text-white px-1"
          aria-label="Dismiss alert"
        >
          ✕
        </button>
      </div>
      <p className="mt-1 text-zinc-200 leading-relaxed">{toast.event.body}</p>
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-zinc-800 pt-2 text-[10px]">
        <span className="text-emerald-400 truncate">SENT: {toast.channels.join(", ")}</span>
        <Link
          href={toast.event.url}
          onClick={() => setToast(null)}
          className="shrink-0 font-bold text-sky-400 hover:underline"
        >
          Inspect →
        </Link>
      </div>
    </div>
  );
}
