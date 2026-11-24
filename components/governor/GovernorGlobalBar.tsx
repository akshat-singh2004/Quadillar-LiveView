"use client";

import Link from "next/link";
import { useGovernor } from "@/context/GovernorContext";

const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function GovernorGlobalBar() {
  const { mode, snapshot, setMode } = useGovernor();
  const blocked = snapshot.escrow.httpStatus === 422;

  return (
    <div className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur px-3 lg:px-6 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`inline-flex h-2 w-2 shrink-0 rounded-full ${blocked ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
          <span className="font-bold text-zinc-100 truncate">
            {blocked ? `HTTP 422 PARTIAL HOLD (${snapshot.violations.length} FAULTS)` : "HTTP 200 ALL GATES CLEARED"}
          </span>
          <span className="hidden md:inline text-zinc-500">•</span>
          <Link href="/finance/ra-bills" className="hidden md:inline text-zinc-300 hover:text-white underline-offset-2 hover:underline">
            FROZEN {formatInr(snapshot.escrow.frozenInr)} | NET RTGS {formatInr(snapshot.escrow.netCertifiedReleaseInr)}
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
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
          <Link
            href="/closeout/audit-vault"
            className="hidden xl:inline-flex items-center rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-400 hover:text-zinc-200"
          >
            BSA63:{snapshot.bsaSec63Ledger.rowHash.slice(0, 10)}
          </Link>
        </div>
      </div>
    </div>
  );
}
