"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { useGovernor } from "@/context/GovernorContext";
import type { BimState } from "@/lib/engines/molecularGovernor";

export function MobileSafeSpatialGate({
  title = "3D Spatial Viewport",
  subtitle = "Mobile low-bandwidth guard — tap below to download WebGL",
  statusMap: statusMapProp,
  activeViolationsCount: violationsProp,
  children,
}: {
  title?: string;
  subtitle?: string;
  statusMap?: Record<string, BimState>;
  activeViolationsCount?: number;
  children: ReactNode;
}) {
  const { snapshot } = useGovernor();
  const statusMap = statusMapProp ?? snapshot.bimStatusMap;
  const activeViolationsCount = violationsProp ?? snapshot.violations.length;

  const [isMobile, setIsMobile] = useState<boolean | null>(null);
  const [force3DOnMobile, setForce3DOnMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  if (isMobile === false || force3DOnMobile) {
    return <>{children}</>;
  }

  if (isMobile === null) {
    return <div className="min-h-[50vh] rounded-xl bg-zinc-950 p-6 text-xs font-mono text-zinc-400">Detecting viewport…</div>;
  }

  return (
    <div className="p-3 space-y-3">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/90 p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-sky-400">
              Mobile Spatial Guard • Zero WebGL Loaded
            </div>
            <h1 className="mt-0.5 text-lg font-bold text-white">{title}</h1>
            <p className="text-xs text-zinc-400">{subtitle}</p>
          </div>
          <span
            className={`shrink-0 rounded-md px-2 py-1 text-xs font-mono font-bold ${
              activeViolationsCount > 0 ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            {activeViolationsCount > 0 ? `${activeViolationsCount} HOLDS` : "CLEAR"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {Object.entries(statusMap).map(([id, state]) => (
            <div
              key={id}
              className={`rounded-lg px-3 py-2.5 text-xs font-mono font-bold ${
                state === "RED"
                  ? "bg-red-600 text-white"
                  : state === "AMBER"
                  ? "bg-amber-500 text-zinc-950"
                  : "bg-emerald-600 text-white"
              }`}
            >
              {id} • {state}
            </div>
          ))}
        </div>

        {snapshot.violations.length > 0 && (
          <div className="rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-xs font-mono text-red-200 space-y-1">
            <div className="font-bold text-red-300">ACTIVE INTERLOCKS</div>
            {snapshot.violations.slice(0, 4).map((v) => (
              <div key={v.code} className="truncate">
                • {v.code}: {v.message}
              </div>
            ))}
            <Link href="/finance/ra-bills" className="inline-block pt-1 text-sky-400 underline">
              Open Escrow Hold Ledger →
            </Link>
          </div>
        )}

        <button
          type="button"
          onClick={() => setForce3DOnMobile(true)}
          className="w-full min-h-[52px] rounded-lg bg-zinc-100 active:bg-zinc-300 text-zinc-950 font-semibold text-sm"
        >
          Load Full 3D WebGL Canvas (~2.5 MB)
        </button>
      </div>
    </div>
  );
}
