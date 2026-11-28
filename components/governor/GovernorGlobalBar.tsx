"use client";

import Link from "next/link";
import { useGovernor } from "@/context/GovernorContext";

const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function GovernorGlobalBar() {
  const { mode, snapshot, syncStatus, setMode } = useGovernor();
  const blocked = snapshot.escrow.httpStatus === 422;

  return (
    <div className="print:hidden sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur pl-3 pr-24 lg:pl-6 lg:pr-28 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
              blocked ? "bg-red-500 animate-pulse" : "bg-emerald-500"
            }`}
          />
          <span className="font-bold text-zinc-100 truncate">
            {blocked ? `HTTP 422 HOLD (${snapshot.violations.length} FAULTS)` : "HTTP 200 ALL GATES CLEARED"}
          </span>
          <span className="hidden md:inline text-zinc-500">•</span>
          <Link
            href="/finance/ra-bills"
            className="hidden md:inline text-zinc-300 hover:text-white underline-offset-2 hover:underline"
          >
            FROZEN {formatInr(snapshot.escrow.frozenInr)} | NET RTGS {formatInr(snapshot.escrow.netCertifiedReleaseInr)}
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("quadillar:open-palette"))}
            title="Open Command Palette (Ctrl+K)"
            className="hidden sm:inline-flex items-center gap-1 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-300 hover:border-zinc-700 hover:text-white"
          >
            <span>Jump</span>
            <kbd className="rounded bg-zinc-800 px-1 text-[10px] text-zinc-400">Ctrl+K</kbd>
          </button>

          <button
            type="button"
            onClick={() => setMode("stress-test")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              mode === "stress-test"
                ? "bg-red-600 text-white"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            }`}
          >
            TG-03 Stress
          </button>
          <button
            type="button"
            onClick={() => setMode("compliant")}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-colors ${
              mode === "compliant"
                ? "bg-emerald-600 text-white"
                : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white"
            }`}
          >
            Compliant
          </button>

          <span
            title="Cross-device Governor sync channel"
            className={`hidden xl:inline-flex items-center rounded px-2 py-1 text-[10px] border ${
              syncStatus === "supabase"
                ? "border-emerald-500/30 bg-emerald-950/40 text-emerald-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400"
            }`}
          >
            {syncStatus === "supabase" ? "LIVE SYNC" : syncStatus === "edge_fallback" ? "EDGE SYNC" : "LOCAL"}
          </span>

          <Link
            href="/closeout/bsa-certificate"
            className="hidden xl:inline-flex items-center rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-300 hover:text-white"
          >
            BSA63:{snapshot.bsaSec63Ledger.rowHash.slice(0, 8)}
          </Link>
        </div>
      </div>
    </div>
  );
}
