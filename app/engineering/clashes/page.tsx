"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  MapPin,
  Maximize2,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  Search,
  ShieldAlert,
  ShieldCheck,
  Wrench,
  X
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type ClashCategory = "HARD_CLASH" | "CLEARANCE_SOFT" | "DUPLICATE_GEOMETRY";
export type ClashStatus = "OPEN_ACTIVE" | "IN_RESOLUTION" | "APPROVED_RESOLVED" | "DEVIATION_WAIVED";

export interface BimClashRecord {
  id: string;
  project_id: string;
  clash_code: string;
  discipline_a: string;
  discipline_b: string;
  element_a_revit_id: string;
  element_b_revit_id: string;
  location_grid: string;
  grid_level: string;
  penetration_depth_mm: number;
  clash_type: ClashCategory;
  assigned_trade: string;
  resolution_instruction: string;
  status: ClashStatus;
  detected_date: string;
  resolved_by?: string | null;
  resolved_at?: string | null;
}

export default function CanonicalBimClashesPage() {
  const { project, role, tier } = useActiveRole();
  const [clashes, setClashes] = useState<BimClashRecord[]>([]);
  const [selectedClash, setSelectedClash] = useState<BimClashRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Type-Safe Role Authorization
  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = role?.label || "";
  const isBimLeadOrArchitect =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("BIM") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Lead");

  const loadClashData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("bim_spatial_clashes")
        .select("*")
        .eq("project_id", project.id)
        .order("penetration_depth_mm", { ascending: false });

      if (data && data.length > 0) {
        setClashes(data as BimClashRecord[]);
        if (!selectedClash) setSelectedClash(data[0] as BimClashRecord);
      } else {
        const defaults: BimClashRecord[] =
          tier === "RESIDENTIAL"
            ? [
                {
                  id: "cls-res-01",
                  project_id: project.id,
                  clash_code: "CLS-RES-004",
                  discipline_a: "Custom Joinery (Wardrobe)",
                  discipline_b: "Concealed Electrical (DB Chasing)",
                  element_a_revit_id: "REV-349012 (Wardrobe Carcass)",
                  element_b_revit_id: "REV-891002 (32A Riser Chasing)",
                  location_grid: "Master Bedroom / Grid B-2",
                  grid_level: "Level 01",
                  penetration_depth_mm: 45,
                  clash_type: "HARD_CLASH",
                  assigned_trade: "Royal Woodworks & Interiors",
                  resolution_instruction:
                    "Re-route 25mm PVC electrical conduit 120mm east to clear wardrobe fixing anchor expansion bolt zone.",
                  status: "OPEN_ACTIVE",
                  detected_date: "2026-09-08",
                },
                {
                  id: "cls-res-02",
                  project_id: project.id,
                  clash_code: "CLS-RES-005",
                  discipline_a: "False Ceiling Pelmet",
                  discipline_b: "Concealed AC Drain Line",
                  element_a_revit_id: "REV-440192 (Shadow Gap Grid)",
                  element_b_revit_id: "REV-610291 (32mm CPVC Drain)",
                  location_grid: "Living Room / North Bay",
                  grid_level: "Level 01",
                  penetration_depth_mm: 22,
                  clash_type: "CLEARANCE_SOFT",
                  assigned_trade: "Avadh MEP Solutions",
                  resolution_instruction:
                    "Drop ceiling perimeter pelmet level by 35mm to maintain 1:100 gravity slope on AC condensation line.",
                  status: "APPROVED_RESOLVED",
                  detected_date: "2026-09-05",
                  resolved_by: "Principal Architect",
                  resolved_at: "2026-09-07T14:00:00Z",
                },
              ]
            : [
                {
                  id: "cls-twr-01",
                  project_id: project.id,
                  clash_code: "CLS-TWR-101",
                  discipline_a: "HVAC Primary Supply Duct (600x400)",
                  discipline_b: "Structural Post-Tensioned Drop Beam",
                  element_a_revit_id: "MEP-491028 (Galvanized Duct)",
                  element_b_revit_id: "STR-102941 (PT Beam B-4)",
                  location_grid: "Grid D-3 / Transverse Axis",
                  grid_level: "Level 08",
                  penetration_depth_mm: 110,
                  clash_type: "HARD_CLASH",
                  assigned_trade: "Avadh MEP Solutions",
                  resolution_instruction:
                    "Split 600x400 supply duct into twin 400x250 low-profile rectangular runs passing under PT drop beam soffit.",
                  status: "OPEN_ACTIVE",
                  detected_date: "2026-09-10",
                },
                {
                  id: "cls-twr-02",
                  project_id: project.id,
                  clash_code: "CLS-TWR-102",
                  discipline_a: "Fire Sprinkler Main Loop (100mm MS)",
                  discipline_b: "Cable Tray Riser Trunk (450mm)",
                  element_a_revit_id: "FPS-201948 (Fire Header)",
                  element_b_revit_id: "ELE-884910 (HT Tray)",
                  location_grid: "Tower Core Riser A",
                  grid_level: "Level 07-08",
                  penetration_depth_mm: 35,
                  clash_type: "CLEARANCE_SOFT",
                  assigned_trade: "Avadh MEP Solutions",
                  resolution_instruction:
                    "Shift cable tray bracket 80mm west to maintain 150mm statutory clearance from pressurized fire line per NBC Part 4.",
                  status: "IN_RESOLUTION",
                  detected_date: "2026-09-09",
                },
                {
                  id: "cls-twr-03",
                  project_id: project.id,
                  clash_code: "CLS-TWR-103",
                  discipline_a: "Facade Unitized Transom Anchor",
                  discipline_b: "Edge Beam Core Rebar Cage",
                  element_a_revit_id: "FAC-301928 (Cast-in Channel)",
                  element_b_revit_id: "STR-881920 (T25 Rebar L-Bar)",
                  location_grid: "North Elevation / Grid E2",
                  grid_level: "Level 08 Deck",
                  penetration_depth_mm: 55,
                  clash_type: "HARD_CLASH",
                  assigned_trade: "Apex Glass & Façades",
                  resolution_instruction:
                    "Adjust cast-in anchor plate offset by 40mm. SEOR certified BBS Mark BM-V4 adjusted.",
                  status: "APPROVED_RESOLVED",
                  detected_date: "2026-09-04",
                  resolved_by: "Resident SEOR",
                  resolved_at: "2026-09-06T17:00:00Z",
                },
              ];

        setClashes(defaults);
        if (!selectedClash) setSelectedClash(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [project.id, selectedClash, tier]);

  useEffect(() => {
    void loadClashData();

    const channel = supabase
      .channel(`bim_clashes_sync_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bim_spatial_clashes" }, () => void loadClashData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadClashData]);

  const summary = useMemo(() => {
    const total = clashes.length;
    const hardClashes = clashes.filter((c) => c.clash_type === "HARD_CLASH" && c.status !== "APPROVED_RESOLVED").length;
    const softClearance = clashes.filter((c) => c.clash_type === "CLEARANCE_SOFT" && c.status !== "APPROVED_RESOLVED").length;
    const resolved = clashes.filter((c) => c.status === "APPROVED_RESOLVED").length;
    const resolutionPct = total > 0 ? Math.round((resolved / total) * 100) : 100;

    return { total, hardClashes, softClearance, resolved, resolutionPct };
  }, [clashes]);

  const filteredClashes = useMemo(() => {
    return clashes.filter((c) => {
      const matchesFilter = filterType === "ALL" || c.clash_type === filterType;
      const haystack = `${c.clash_code} ${c.discipline_a} ${c.discipline_b} ${c.location_grid} ${c.assigned_trade}`.toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchesFilter && matchesSearch;
    });
  }, [clashes, filterType, search]);

  const handleUpdateStatus = async (clashId: string, nextStatus: ClashStatus) => {
    if (!isBimLeadOrArchitect && nextStatus === "APPROVED_RESOLVED") return;
    setActionInProgress(clashId);

    const updatePayload: Partial<BimClashRecord> = { status: nextStatus };
    if (nextStatus === "APPROVED_RESOLVED") {
      updatePayload.resolved_by = role.label;
      updatePayload.resolved_at = new Date().toISOString();
    }

    try {
      await (supabase as any).from("bim_spatial_clashes").update(updatePayload).eq("id", clashId);
    } catch {
      // Optimistic local update
    }

    setClashes((prev) =>
      prev.map((c) => (c.id === clashId ? { ...c, ...updatePayload } : c))
    );
    if (selectedClash && selectedClash.id === clashId) {
      setSelectedClash((prev) => (prev ? { ...prev, ...updatePayload } : null));
    }
    setActionInProgress(null);
  };

  const handlePrintMatrix = () => {
    const printWin = window.open("", "_blank", "width=1000,height=850");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>BIM Spatial Coordination Matrix — ${project.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .hard-clash { color: #b91c1c; font-weight: bold; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 36px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · ISO 19650-2 / Navisworks Clash Resolution Matrix</div>
      <h1 class="title">BIM Coordination & Spatial Clearance Log</h1>
      <div class="meta">Project: ${project.name} (${project.id}) · Coordination Resolution: ${summary.resolutionPct}% Cleared</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Clash Ref</th>
        <th>Discipline Conflict</th>
        <th>Location & Level</th>
        <th class="tar">Penetration</th>
        <th>Trade Owner</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${clashes.map((c) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${c.clash_code}</td>
          <td><strong>${c.discipline_a}</strong> vs <strong>${c.discipline_b}</strong></td>
          <td>${c.location_grid} (${c.grid_level})</td>
          <td class="tar ${c.penetration_depth_mm > 50 ? 'hard-clash' : ''}">${c.penetration_depth_mm} mm</td>
          <td>${c.assigned_trade}</td>
          <td><strong>${c.status.replace(/_/g, ' ')}</strong></td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>BIM Coordinator (VDC)</div>
      <div style="color: #64748b;">Navisworks federated clash report run.</div>
      <div class="sig">VDC Lead Signature</div>
    </div>
    <div>
      <div>MEP Specialist Contractor</div>
      <div style="color: #64748b;">Invert levels adjusted per CDE markup.</div>
      <div class="sig">MEP Lead Sign</div>
    </div>
    <div>
      <div>Principal Architect / Consultant SEOR</div>
      <div style="color: #64748b;">Spatial models certified for GFC issuance.</div>
      <div class="sig">SEOR Approval Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedClash) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING ISO 19650 FEDERATED BIM CLASH MATRIX...
      </div>
    );
  }

  const isHard = selectedClash.clash_type === "HARD_CLASH";
  const isResolved = selectedClash.status === "APPROVED_RESOLVED";

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Virtual Design &amp; Construction (VDC) · ISO 19650-2 Protocol</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              BIM Clash Detection &amp; Spatial Coordination Matrix
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Multi-trade model clash resolution. Solves geometric collisions between Structure, MEP, and Architectural finishes before field mobilization to eliminate costly on-site change orders.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintMatrix}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Clash Matrix</span>
            </button>
            <Link
              href="/drawings/redlines"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-sm"
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Inspect on CDE Redline</span>
            </Link>
          </div>
        </div>

        {/* 4 PRIMARY CLASH GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Hard Clashes</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-rose-400 mt-2">
              {summary.hardClashes} Critical
            </div>
            <div className="text-[11px] text-rose-500/80 mt-1">Direct solid geometric penetrations</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Clearance &amp; Soft Conflicts</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
              {summary.softClearance} Conflicts
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Insulation &amp; maintenance access breaches</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Resolved Spatial Items</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {summary.resolved} / {summary.total}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{summary.resolutionPct}% model resolution cleared</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Federated LOD Status</span>
              <Boxes className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              LOD 400
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Fabrication-ready spatial coordination</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & CATEGORY FILTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            {[
              { key: "ALL", label: `All Conflicts (${clashes.length})` },
              { key: "HARD_CLASH", label: "Hard Clashes" },
              { key: "CLEARANCE_SOFT", label: "Clearance / Soft" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterType(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition ${
                  filterType === tab.key
                    ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search clash ref, discipline, grid..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: CLASH REGISTER (7 cols) vs SPATIAL RESOLUTION DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: CLASH QUEUE (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Navisworks Coordination Report
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Spatial Intersection Matrix</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredClashes.length} Active Clashes</span>
            </div>

            <div className="space-y-3">
              {filteredClashes.map((c) => {
                const isSelected = selectedClash.id === c.id;
                const isHardClash = c.clash_type === "HARD_CLASH";
                const isApproved = c.status === "APPROVED_RESOLVED";

                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedClash(c)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {c.clash_code}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isHardClash
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {c.clash_type.replace(/_/g, " ")}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isApproved
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-zinc-800 text-zinc-300"
                        }`}>
                          {c.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <span className={`text-xs font-mono font-extrabold ${isHardClash ? "text-rose-400" : "text-amber-400"}`}>
                        {c.penetration_depth_mm} mm Penetration
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-zinc-100">
                        {c.discipline_a} <span className="text-zinc-500 font-normal">interferes with</span> {c.discipline_b}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {c.location_grid} ({c.grid_level})
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Owner: <strong className="text-zinc-300">{c.assigned_trade}</strong></span>
                      <span>Detected: <strong className="text-zinc-400">{c.detected_date}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: RESOLUTION & METHOD INSTRUCTION DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  BIM Engineering Resolver
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedClash.clash_code}</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {selectedClash.grid_level}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">Spatial Conflict:</span>
              <strong className="text-white text-sm font-sans block leading-snug">
                {selectedClash.discipline_a} vs {selectedClash.discipline_b}
              </strong>
              <div className="text-cyan-400 text-[11px]">{selectedClash.location_grid}</div>
              <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-[11px]">
                <div>Element A: <strong className="text-zinc-200 block truncate">{selectedClash.element_a_revit_id}</strong></div>
                <div>Element B: <strong className="text-zinc-200 block truncate">{selectedClash.element_b_revit_id}</strong></div>
              </div>
            </div>

            {/* ENGINEERING RESOLUTION DIRECTIVE */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase text-zinc-400 font-bold">
                  Mandatory Model Adjustment Directive:
                </span>
                <span className={`text-[10px] font-bold ${isHard ? "text-rose-400" : "text-amber-400"}`}>
                  {selectedClash.penetration_depth_mm}mm Collision
                </span>
              </div>
              <p className="text-zinc-300 font-sans text-xs leading-relaxed">
                {selectedClash.resolution_instruction}
              </p>
              {selectedClash.resolved_by && (
                <div className="pt-2 border-t border-zinc-800/80 text-[10px] text-emerald-400 font-mono">
                  Certified Resolved by: {selectedClash.resolved_by} on {new Date(selectedClash.resolved_at || "").toLocaleDateString("en-IN")}
                </div>
              )}
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              {selectedClash.status === "OPEN_ACTIVE" && (
                <button
                  type="button"
                  disabled={actionInProgress === selectedClash.id}
                  onClick={() => handleUpdateStatus(selectedClash.id, "IN_RESOLUTION")}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs font-mono transition flex items-center justify-center gap-1.5 shadow-md shadow-amber-950/50"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Assign Reroute Action to Trade</span>
                </button>
              )}

              {selectedClash.status === "IN_RESOLUTION" && (
                <button
                  type="button"
                  disabled={!isBimLeadOrArchitect || actionInProgress === selectedClash.id}
                  onClick={() => handleUpdateStatus(selectedClash.id, "APPROVED_RESOLVED")}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs font-mono transition flex items-center justify-center gap-1.5 shadow-md ${
                    !isBimLeadOrArchitect
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                      : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/50"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Model Clearance &amp; Seal GFC</span>
                </button>
              )}

              {selectedClash.status === "APPROVED_RESOLVED" && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Conflict Resolved in Federated IFC Model</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              ISO 19650 Common Data Environment VDC Interlock
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}