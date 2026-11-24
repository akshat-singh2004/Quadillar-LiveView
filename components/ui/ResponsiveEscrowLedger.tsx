"use client";

import type { BimState, BoqTranche } from "@/lib/engines/molecularGovernor";

const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export function ResponsiveEscrowLedger({
  tranches,
  bimStatusMap,
  onInspectElement,
}: {
  tranches: BoqTranche[];
  bimStatusMap: Record<string, BimState>;
  onInspectElement?: (boqCode: string) => void;
}) {
  return (
    <>
      {/* PC VIEW: Dense Multi-Column Audit Table */}
      <div className="hidden md:block overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-900/90 text-xs uppercase tracking-wider text-zinc-400">
            <tr>
              <th className="px-4 py-3">BOQ Code</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Linked BIM Elements</th>
              <th className="px-4 py-3 text-right">Claimed (INR)</th>
              <th className="px-4 py-3">Gate Verdict</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/80">
            {tranches.map((t) => {
              const blocked = t.bimGlobalIds.some((id) => bimStatusMap[id] === "RED");
              return (
                <tr key={t.boqCode} className="hover:bg-zinc-900/50">
                  <td className="px-4 py-3 font-mono text-zinc-200">{t.boqCode}</td>
                  <td className="px-4 py-3 text-zinc-100">{t.description}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{t.bimGlobalIds.join(", ")}</td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-100">{formatInr(t.claimedInr)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        blocked ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                      }`}
                    >
                      {blocked ? "FROZEN (HTTP 422)" : "CLEARED"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onInspectElement?.(t.boqCode)}
                      className="text-xs font-medium text-sky-400 hover:underline"
                    >
                      Inspect Proof
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* MOBILE VIEW: Sunlight-Contrast Touch Cards */}
      <div className="md:hidden space-y-3">
        {tranches.map((t) => {
          const blocked = t.bimGlobalIds.some((id) => bimStatusMap[id] === "RED");
          return (
            <div
              key={t.boqCode}
              className={`rounded-xl border p-4 ${
                blocked ? "border-red-500/60 bg-red-950/30" : "border-zinc-800 bg-zinc-900/80"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs text-zinc-400">{t.boqCode}</span>
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-bold ${
                    blocked ? "bg-red-600 text-white" : "bg-emerald-600 text-white"
                  }`}
                >
                  {blocked ? "HOLD 422" : "CLEARED"}
                </span>
              </div>
              <div className="mt-1.5 text-base font-semibold text-white">{t.description}</div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xs font-mono text-zinc-400">{t.bimGlobalIds.join(" • ")}</span>
                <span className="text-lg font-mono font-bold text-white">{formatInr(t.claimedInr)}</span>
              </div>
              <button
                type="button"
                onClick={() => onInspectElement?.(t.boqCode)}
                className="mt-3 w-full min-h-[48px] rounded-lg bg-zinc-800 active:bg-zinc-700 text-sm font-semibold text-white"
              >
                {blocked ? "Open Blocking Violations & Snag Camera" : "View BSA Sec 63 Certificate"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
