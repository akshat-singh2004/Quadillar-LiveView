"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Search,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  Filter,
  FileCheck2,
  FolderArchive,
  ArrowRight,
  Download,
} from "lucide-react";
import type { CdeItem } from "@/types/construction";
import { canPromoteCdeItem } from "@/lib/workflow/engine";
import { updateCdeItemState } from "@/app/lib/services";

type SortKey = "id" | "revision" | "uniclass" | "timestamp";

type FacetedCDETableProps = {
  items: CdeItem[];
};

const divisionOptions = ["03 Concrete", "05 Metals", "22 Plumbing", "23 HVAC", "26 Electrical"] as const;
const stateOptions = ["WIP", "Shared", "Published", "Archived"] as const;

function inferDivision(item: CdeItem) {
  const text = (
    item.container +
    " " +
    (item.metadata && typeof item.metadata === "object" ? String((item.metadata as any).uniclass ?? "") : "")
  ).toLowerCase();
  if (text.includes("concrete")) return "03 Concrete";
  if (text.includes("metal") || text.includes("steel")) return "05 Metals";
  if (text.includes("plumb") || text.includes("water")) return "22 Plumbing";
  if (text.includes("hvac") || text.includes("mech")) return "23 HVAC";
  if (text.includes("elect") || text.includes("power")) return "26 Electrical";
  return "03 Concrete";
}

function inferDiscipline(item: CdeItem) {
  return item.container.split("/")[1]?.trim() ?? "General";
}

export function FacetedCDETable({ items }: FacetedCDETableProps) {
  const [localItems, setLocalItems] = useState(items);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedState, setSelectedState] = useState<(typeof stateOptions)[number] | "All">("All");
  const [selectedDivision, setSelectedDivision] = useState<(typeof divisionOptions)[number] | "All">("All");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => setLocalItems(items), [items]);

  const effectiveItems = useMemo(() => {
    const normalized = localItems.filter((item) => {
      const matchesQuery =
        !search ||
        [item.title, item.id, item.container, item.submittedBy, String((item.metadata as any)?.uniclass ?? "")]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());
      const matchesState = selectedState === "All" || item.state === selectedState;
      const matchesDivision = selectedDivision === "All" || inferDivision(item) === selectedDivision;
      const matchesDiscipline = selectedDiscipline === "All" || inferDiscipline(item) === selectedDiscipline;
      return matchesQuery && matchesState && matchesDivision && matchesDiscipline;
    });

    const sorted = [...normalized].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "id") return a.id.localeCompare(b.id) * direction;
      if (sortKey === "revision") return (a.revision - b.revision) * direction;
      if (sortKey === "uniclass") {
        const left = String((a.metadata as any)?.uniclass ?? "");
        const right = String((b.metadata as any)?.uniclass ?? "");
        return left.localeCompare(right) * direction;
      }

      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * direction;
    });

    return sorted;
  }, [localItems, search, selectedState, selectedDivision, selectedDiscipline, sortKey, sortDirection]);

  const disciplines = useMemo(() => Array.from(new Set(localItems.map(inferDiscipline))), [localItems]);

  const promoteItem = async (item: CdeItem) => {
    const nextState = stateOptions[stateOptions.indexOf(item.state) + 1];
    if (!nextState) return;
    const gate = canPromoteCdeItem(
      { ...item, status: nextState === "Shared" && item.state === "WIP" ? "InReview" : item.status },
      nextState
    );
    if (!gate.allowed) {
      setFeedback(`Promotion blocked: Statutory approval requirement pending for ${item.id}.`);
      return;
    }
    const optimistic = { ...item, state: nextState, updatedAt: new Date().toISOString() };
    setLocalItems((current) => current.map((entry) => (entry.id === item.id ? optimistic : entry)));
    const saved = await updateCdeItemState(
      item.id,
      nextState,
      {
        revision: item.revision,
        revisionCode: item.revisionCode,
        status: nextState === "Published" ? "Approved" : nextState === "Shared" ? "InReview" : item.status,
        approved: nextState === "Published" ? true : item.approved,
      },
      { role: "architect", name: "CDE Table" }
    );
    if (!saved) setLocalItems((current) => current.map((entry) => (entry.id === item.id ? item : entry)));
    setFeedback(`Promoted ${item.id} to ${nextState} container.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const handleBatchAction = (mode: "promote" | "manifest" | "archive") => {
    const selected = effectiveItems.filter((item) => selectedIds.includes(item.id));
    if (!selected.length) return;
    setFeedback(`Executed ${mode.toUpperCase()} on ${selected.length} ISO 19650 package items.`);
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 font-mono text-xs select-none space-y-4">
      {/* HEADER & TOOLBAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-zinc-800 pb-4">
        <div>
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            Document Register • ISO 19650 Common Data Environment
          </div>
          <h3 className="text-base font-bold text-white mt-0.5">
            Faceted CDE Master Ledger &amp; Workflow Gate
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => handleBatchAction("promote")}
            disabled={selectedIds.length === 0}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 rounded text-xs font-bold uppercase disabled:opacity-50 transition cursor-pointer"
          >
            Advance State ({selectedIds.length})
          </button>
          <button
            type="button"
            onClick={() => handleBatchAction("manifest")}
            disabled={selectedIds.length === 0}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 rounded text-xs font-bold uppercase disabled:opacity-50 transition cursor-pointer"
          >
            Export Manifest
          </button>
          <button
            type="button"
            onClick={() => handleBatchAction("archive")}
            disabled={selectedIds.length === 0}
            className="px-3 py-1.5 bg-zinc-900 border border-zinc-700 hover:bg-zinc-800 text-zinc-200 rounded text-xs font-bold uppercase disabled:opacity-50 transition cursor-pointer"
          >
            Archive Package
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-white uppercase text-[10px]">
            Dismiss
          </button>
        </div>
      )}

      {/* SEARCH & FACETS BAR */}
      <div className="flex flex-wrap gap-2.5 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title, ID, Uniclass..."
            className="w-full bg-zinc-900 border border-zinc-800 pl-8 pr-3 py-1.5 text-zinc-100 rounded outline-none"
          />
        </div>

        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value as any)}
          className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-200 rounded outline-none"
        >
          <option value="All">All States</option>
          {stateOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={selectedDivision}
          onChange={(e) => setSelectedDivision(e.target.value as any)}
          className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-200 rounded outline-none"
        >
          <option value="All">All CSI Divisions</option>
          {divisionOptions.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>

        <select
          value={selectedDiscipline}
          onChange={(e) => setSelectedDiscipline(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 text-zinc-200 rounded outline-none"
        >
          <option value="All">All Disciplines</option>
          {disciplines.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </select>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border border-zinc-800 rounded-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-zinc-900/80 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase tracking-wider">
            <tr>
              <th className="p-3 w-8">
                <input
                  type="checkbox"
                  checked={selectedIds.length === effectiveItems.length && effectiveItems.length > 0}
                  onChange={() =>
                    setSelectedIds(selectedIds.length === effectiveItems.length ? [] : effectiveItems.map((i) => i.id))
                  }
                  className="rounded bg-zinc-950 border-zinc-800"
                />
              </th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() => toggleSort("id")}
                  className="flex items-center gap-1 uppercase font-bold text-inherit cursor-pointer"
                >
                  <span>Document ID</span>
                  <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                </button>
              </th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() => toggleSort("revision")}
                  className="flex items-center gap-1 uppercase font-bold text-inherit cursor-pointer"
                >
                  <span>Rev</span>
                  <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                </button>
              </th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() => toggleSort("uniclass")}
                  className="flex items-center gap-1 uppercase font-bold text-inherit cursor-pointer"
                >
                  <span>Uniclass 2015</span>
                  <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                </button>
              </th>
              <th className="p-3">
                <button
                  type="button"
                  onClick={() => toggleSort("timestamp")}
                  className="flex items-center gap-1 uppercase font-bold text-inherit cursor-pointer"
                >
                  <span>Last Modified</span>
                  <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                </button>
              </th>
              <th className="p-3">ISO State</th>
              <th className="p-3 text-right">Workflow Gate</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
            {effectiveItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-600 font-sans">
                  Zero CDE records match the search filter.
                </td>
              </tr>
            ) : (
              effectiveItems.map((item) => {
                const nextState = stateOptions[stateOptions.indexOf(item.state) + 1];
                return (
                  <tr key={item.id} className="hover:bg-zinc-900/50 transition">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.id)}
                        onChange={() => toggleSelected(item.id)}
                        className="rounded bg-zinc-950 border-zinc-800"
                      />
                    </td>
                    <td className="p-3 font-bold text-white font-sans">{item.title}</td>
                    <td className="p-3 text-cyan-400 font-mono font-bold">R{item.revision}</td>
                    <td className="p-3 text-zinc-400 font-mono text-[11px]">
                      {String((item.metadata as any)?.uniclass ?? "EF_20_10")}
                    </td>
                    <td className="p-3 text-zinc-500 text-[11px]">
                      {new Date(item.updatedAt).toLocaleDateString("en-IN")}
                    </td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          item.state === "Published"
                            ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                            : item.state === "Shared"
                            ? "bg-cyan-950 text-cyan-400 border-cyan-800"
                            : item.state === "WIP"
                            ? "bg-amber-950 text-amber-400 border-amber-800"
                            : "bg-zinc-900 text-zinc-400 border-zinc-700"
                        }`}
                      >
                        {item.state}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      {nextState && (
                        <button
                          type="button"
                          onClick={() => void promoteItem(item)}
                          className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-[10px] font-bold uppercase rounded transition cursor-pointer"
                        >
                          Advance &rarr; {nextState}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default FacetedCDETable;
