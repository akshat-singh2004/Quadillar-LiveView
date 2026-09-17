"use client";

import type { CdeItem } from "@/types/construction";

interface MinimalCDEListProps {
  items: CdeItem[];
  onInspect: (item: CdeItem) => void;
}

const filterOptions = [
  { value: "All", label: "All" },
  { value: "GFC / Published", label: "GFC / Published" },
  { value: "Under Coordination", label: "Under Coordination" },
  { value: "Draft", label: "Draft" },
] as const;

function getStateLabel(state: CdeItem["state"]) {
  if (state === "Published") return "GFC / Published";
  if (state === "Shared") return "Under Coordination";
  if (state === "WIP") return "Draft";
  return "Archived";
}

function getBadgeClasses(state: CdeItem["state"]) {
  if (state === "Published") {
    return "bg-white/[0.06] text-neutral-200 border border-white/10";
  }
  if (state === "Shared") {
    return "bg-white/[0.03] text-neutral-400 border border-white/5";
  }
  if (state === "WIP") {
    return "bg-neutral-800/80 text-neutral-300 border border-neutral-700";
  }
  return "bg-white/[0.03] text-neutral-400 border border-white/5";
}

export function MinimalCDEList({ items, onInspect }: MinimalCDEListProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-neutral-950/40">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.04] px-4 py-3">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[11px] font-medium tracking-[0.12em] text-neutral-400 transition-all duration-200 ease-out hover:border-white/[0.12] hover:text-neutral-200"
          >
            {option.label}
          </button>
        ))}
      </div>

      <div>
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onInspect(item)}
            className="group flex w-full items-center justify-between gap-6 border-b border-white/[0.04] px-6 py-4 text-left transition-all duration-200 ease-out hover:bg-white/[0.02]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono tracking-[0.16em] text-neutral-400">{item.id}</span>
              </div>
              <div className="mt-2 text-base font-medium tracking-tight text-neutral-100">{item.title}</div>
              <div className="mt-1 text-[12px] text-neutral-400">{item.container}</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                <span className="text-[11px] font-mono tracking-[0.12em] text-neutral-400">{String((item.metadata as Record<string, unknown> | undefined)?.uniclass ?? "EF_20_10")}</span>
                <span className="h-3 w-px bg-white/[0.12]" />
                <span className="text-[11px] font-medium text-neutral-300">Rev P{String(item.revision).padStart(2, "0")}</span>
              </div>

              <div className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[10px] font-medium tracking-[0.12em] uppercase ${getBadgeClasses(item.state)}`}>
                {getStateLabel(item.state)}
              </div>

              <span className="hidden text-[11px] font-medium tracking-[0.12em] text-neutral-300 transition-all duration-200 ease-out group-hover:inline-flex md:inline-flex">
                Inspect
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
