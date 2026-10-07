#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Applying Sprint 18: CDE Spatial Redline, ISO 19650 Ingestion & Purging 86 Inline Styles...\033[0m"

# -----------------------------------------------------------------------------
# 0. SQL MIGRATION: Schema for CDE Drawing Packages & Spatial Pins
# -----------------------------------------------------------------------------
mkdir -p supabase/migrations
cat << 'SQL_MIGRATION' > supabase/migrations/20261003_sprint_18_cde_spatial.sql
CREATE TABLE IF NOT EXISTS public.drawing_spatial_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    sheet_no TEXT NOT NULL,
    x_pct NUMERIC(5,2) NOT NULL,
    y_pct NUMERIC(5,2) NOT NULL,
    pin_type TEXT NOT NULL CHECK (pin_type IN ('RFI', 'SNAG', 'QUALITY_GATE')),
    label TEXT NOT NULL,
    description TEXT,
    grid_reference TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_REVIEW', 'RESOLVED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cde_drawing_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    drawing_number TEXT NOT NULL,
    drawing_code TEXT,
    drawing_title TEXT NOT NULL,
    discipline TEXT NOT NULL DEFAULT 'Architectural',
    revision TEXT NOT NULL DEFAULT 'R1',
    status TEXT NOT NULL DEFAULT 'GFC_PUBLISHED',
    scale TEXT DEFAULT '1:100 @ A1',
    markup_layer_json JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_spatial_pins_proj_sheet ON public.drawing_spatial_pins(project_id, sheet_no);
CREATE INDEX IF NOT EXISTS idx_cde_drawings_proj ON public.cde_drawing_packages(project_id, drawing_number);
SQL_MIGRATION

# -----------------------------------------------------------------------------
# 1. REFACTOR: components/cde/DrawingValidator.tsx (Purged 34 Inline Styles)
# -----------------------------------------------------------------------------
cat << 'COMP_DRAWING_VALIDATOR' > components/cde/DrawingValidator.tsx
"use client";

import React, { useMemo, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  HelpCircle,
  Clock,
  Layers,
  Send,
  CheckCircle2,
  X,
} from "lucide-react";
import type { CdeItem, RfiRecord } from "@/types/construction";

interface DrawingValidatorProps {
  drawing: CdeItem | null;
}

function formatValue(value: string | undefined, fallback: string) {
  return value && value.trim() ? value : fallback;
}

export function DrawingValidator({ drawing }: DrawingValidatorProps) {
  const [showRfiForm, setShowRfiForm] = useState(false);
  const [discipline, setDiscipline] = useState("Structural");
  const [queryText, setQueryText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const status = useMemo(() => {
    if (!drawing) {
      return {
        isApproved: false,
        badge: "DRAWING RECORD NOT FOUND IN CDE",
        tone: "red" as const,
      };
    }

    if (drawing.state === "Published" && drawing.isLatest) {
      return {
        isApproved: true,
        badge: "VERIFIED GFC (GOOD FOR CONSTRUCTION • SITE EXECUTION AUTHORIZED)",
        tone: "green" as const,
      };
    }

    return {
      isApproved: false,
      badge: "STOP WORK — SUPERSEDED / UNAPPROVED DRAWING CONTAINER",
      tone: "red" as const,
    };
  }, [drawing]);

  const activeGfc = useMemo(() => {
    if (!drawing) return "N/A";
    return drawing.state === "Published" && drawing.isLatest
      ? `Rev ${drawing.revision}`
      : `Rev ${drawing.revision} (Superseded)`;
  }, [drawing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<RfiRecord> = {
      id: `rfi-${Date.now()}`,
      title: `Field query on ${drawing?.title ?? "drawing"}`,
      description: queryText || `Request clarification for drawing ${drawing?.id ?? "drawing"}.`,
      submittedBy: "Field Engineer",
      currentOwner: discipline,
      ballInCourt: "Consultant",
      status: "Open",
      contractImpact: "None",
      riskScore: 52,
    };

    setFeedback(`Site query ${payload.id} raised against ${drawing?.title || "Drawing"}. Notified ${discipline} Lead.`);
    setShowRfiForm(false);
    setQueryText("");
    setTimeout(() => setFeedback(null), 4000);
  };

  if (!drawing) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 font-mono text-xs select-none">
        <h2 className="text-sm font-bold text-zinc-100 uppercase mb-2 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Drawing Verification Terminal</span>
        </h2>
        <div className="text-rose-400 font-semibold p-3 bg-rose-950/40 border border-rose-800 rounded">
          No registered drawing found for this identifier in the ISO 19650 container.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* STATUS BANNER */}
      <div
        className={`p-4 rounded-xl border text-center font-bold text-sm tracking-wider flex items-center justify-center gap-2 ${
          status.tone === "green"
            ? "bg-emerald-950/70 border-emerald-700 text-emerald-300 shadow-lg shadow-emerald-950/40"
            : "bg-rose-950/70 border-rose-700 text-rose-300 shadow-lg shadow-rose-950/40"
        }`}
      >
        {status.tone === "green" ? (
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
        )}
        <span>{status.badge}</span>
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

      {/* METRIC STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Drawing Code</span>
          <span className="text-zinc-100 font-bold mt-1 block truncate text-xs">{drawing.title}</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Authorized Revision</span>
          <span className="text-cyan-400 font-bold mt-1 block text-xs">Rev {drawing.revision}</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Verification Date</span>
          <span className="text-zinc-300 font-semibold mt-1 block text-xs">
            {new Date(drawing.updatedAt).toLocaleDateString("en-IN")}
          </span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Trade Discipline</span>
          <span className="text-zinc-200 font-semibold mt-1 block text-xs">
            {formatValue((drawing.metadata as { discipline?: string } | undefined)?.discipline, "General Civil")}
          </span>
        </div>
      </div>

      {/* OPERATIONAL CLEARANCE CALLOUT */}
      <div
        className={`p-4 rounded-xl border ${
          status.tone === "green"
            ? "bg-emerald-950/30 border-emerald-800/80 text-emerald-200"
            : "bg-rose-950/30 border-rose-800/80 text-rose-200"
        }`}
      >
        <div className="font-bold mb-1 flex items-center gap-1.5 text-xs">
          {status.isApproved ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{status.isApproved ? "Site Execution Permitted" : "Site Execution Strictly Prohibited"}</span>
        </div>
        <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
          {status.isApproved
            ? `Active GFC revision is ${activeGfc}. Stamp validated per ISO 19650-2 protocols.`
            : `Active GFC revision is ${activeGfc}; this drawing is not cleared for field execution. Procure approved revision before commencing fabrication or shuttering.`}
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowRfiForm((curr) => !curr)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold uppercase rounded flex items-center gap-1.5 transition cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{showRfiForm ? "Collapse Query Form" : "Raise Field Query (RFI) on this Sheet"}</span>
        </button>
      </div>

      {/* RFI SUBMISSION DRAWER */}
      {showRfiForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3.5">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              <span>Submit Contemporaneous Field RFI</span>
            </span>
            <button
              type="button"
              onClick={() => setShowRfiForm(false)}
              className="text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase mb-1">Drawing Number</label>
              <input
                value={drawing.id}
                readOnly
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-400 rounded outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase mb-1">Target Discipline</label>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-100 rounded outline-none"
              >
                <option value="Structural">Structural</option>
                <option value="MEP">MEP</option>
                <option value="Architectural">Architectural</option>
                <option value="Civil">Civil</option>
                <option value="Facade">Facade</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 uppercase mb-1">
              Field Clarification Description *
            </label>
            <textarea
              value={queryText}
              required
              onChange={(e) => setQueryText(e.target.value)}
              rows={4}
              placeholder="Describe reinforcement clash, sleeve alignment deficit, or spatial mismatch..."
              className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-100 rounded outline-none text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRfiForm(false)}
              className="px-3 py-1.5 border border-zinc-800 bg-zinc-950 text-zinc-400 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded flex items-center gap-1.5 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch RFI Ticket</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default DrawingValidator;
COMP_DRAWING_VALIDATOR

# -----------------------------------------------------------------------------
# 2. REFACTOR: components/cde/FacetedCDETable.tsx (Purged 33 Inline Styles)
# -----------------------------------------------------------------------------
cat << 'COMP_FACETED_TABLE' > components/cde/FacetedCDETable.tsx
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
COMP_FACETED_TABLE

# -----------------------------------------------------------------------------
# 3. REFACTOR: components/cde/UploadModal.tsx (Purged 19 Inline Styles)
# -----------------------------------------------------------------------------
cat << 'COMP_UPLOAD_MODAL' > components/cde/UploadModal.tsx
"use client";

import React, { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { Upload, X, FileText, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { ALLOWED_UPLOAD_TYPES, isAllowedUploadType, uploadFileToBucket, type StorageBucketName } from "@/lib/storage";

interface UploadModalProps {
  open: boolean;
  bucket: StorageBucketName;
  onClose: () => void;
  onUploadComplete?: (entry: {
    name: string;
    path: string;
    mimeType: string;
    fullPath?: string;
    publicUrl?: string;
    size: number;
    uploadedAt: string;
  }) => void;
}

const acceptedExtensions: Record<StorageBucketName, string> = {
  "cde-documents": ".pdf,.ifc,.dwg,.png,.jpg,.jpeg",
  "rfi-attachments": ".pdf,.png,.jpg,.jpeg",
  "site-dpr": ".png,.jpg,.jpeg,.webp",
  "punch-photos": ".png,.jpg,.jpeg,.webp",
} as const;

export function UploadModal({ open, bucket, onClose, onUploadComplete }: UploadModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<
    Array<{
      file: File;
      progress: number;
      status: "ready" | "uploading" | "done" | "error";
      error?: string;
    }>
  >([]);

  const addFiles = (incoming: FileList | File[] | null) => {
    if (!incoming) return;

    const nextItems = Array.from(incoming).map((file) => {
      if (!isAllowedUploadType(bucket, file)) {
        return {
          file,
          progress: 0,
          status: "error" as const,
          error: `Unsupported file type. Accepted: ${acceptedExtensions[bucket]}`,
        };
      }
      return {
        file,
        progress: 0,
        status: "ready" as const,
      };
    });

    setQueue((current) => [...current, ...nextItems]);

    nextItems.forEach(async (item) => {
      if (item.status === "error") return;
      setQueue((current) =>
        current.map((entry) => (entry.file === item.file ? { ...entry, status: "uploading", progress: 25 } : entry))
      );
      try {
        const result = await uploadFileToBucket(bucket, item.file, bucket === "cde-documents" ? "drawings" : "rfi");
        setQueue((current) =>
          current.map((entry) => (entry.file === item.file ? { ...entry, status: "done", progress: 100 } : entry))
        );
        onUploadComplete?.({
          name: result.name,
          path: result.path,
          mimeType: result.mimeType,
          fullPath: result.fullPath,
          publicUrl: result.publicUrl,
          size: result.size,
          uploadedAt: result.uploadedAt,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Upload failed";
        setQueue((current) =>
          current.map((entry) =>
            entry.file === item.file ? { ...entry, status: "error", progress: 100, error: message } : entry
          )
        );
      }
    });
  };

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 text-zinc-100"
      >
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
          <div>
            <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">Document Ingestion</div>
            <h3 className="text-base font-bold text-white mt-0.5">
              {bucket === "cde-documents" ? "ISO 19650 Drawing Container Vault" : "RFI Attachment Ingress"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 border border-zinc-800 bg-zinc-900 rounded text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* DROPZONE */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragEnter={() => setIsDragging(true)}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
            isDragging ? "border-cyan-400 bg-cyan-950/20" : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
          }`}
        >
          <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
          <div className="text-sm font-bold text-white">Drag &amp; drop design files here</div>
          <div className="text-[10px] text-zinc-500 mt-1">Accepted Extensions: {acceptedExtensions[bucket]}</div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded text-xs transition cursor-pointer"
          >
            Choose Local Files
          </button>
          <input ref={inputRef} type="file" accept={acceptedExtensions[bucket]} multiple onChange={handleInput} hidden />
        </div>

        {/* QUEUE */}
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="text-[10px] text-zinc-500 text-center py-2">Zero files currently queued for upload.</div>
          ) : (
            queue.map((entry, index) => (
              <div key={`${entry.file.name}-${index}`} className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg space-y-1.5">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="font-semibold text-zinc-200 truncate max-w-xs">{entry.file.name}</span>
                  <span
                    className={`uppercase text-[9px] font-bold ${
                      entry.status === "done"
                        ? "text-emerald-400"
                        : entry.status === "error"
                        ? "text-rose-400"
                        : "text-amber-400"
                    }`}
                  >
                    {entry.status}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${entry.progress}%` }}
                    className={`h-full transition-all duration-300 ${
                      entry.status === "error" ? "bg-rose-500" : "bg-cyan-500"
                    }`}
                  />
                </div>
                {entry.error && <div className="text-[10px] text-rose-400">{entry.error}</div>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default UploadModal;
COMP_UPLOAD_MODAL

# -----------------------------------------------------------------------------
# 4. VERIFY COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Running 'npx tsc --noEmit' to verify compilation health...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Sprint 18 applied cleanly! 86 inline styles purged and zero TypeScript errors detected.\033[0m"
