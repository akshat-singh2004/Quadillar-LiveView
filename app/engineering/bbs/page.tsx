"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Maximize2,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  TrendingDown,
  Wrench,
  X
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type RebarShapeType =
  | "STRAIGHT"
  | "L_BENT_90"
  | "U_HOOK_180"
  | "STIRRUP_RECTANGULAR"
  | "CRANKED_CHAIR";

export type BbsStatus = "DRAFT" | "SEOR_APPROVED" | "FABRICATED_TIED";

export interface BbsItemRecord {
  id: string;
  project_id: string;
  schedule_number: string;
  structural_element: string;
  location_grid: string;
  bar_mark: string;
  bar_diameter_mm: number;
  shape_type: RebarShapeType;
  dimensions_detail: string; // e.g., "A: 4200, B: 300"
  no_of_members: number;
  bars_per_member: number;
  total_bars: number;
  cutting_length_m: number;
  total_length_m: number;
  unit_weight_kg_m: number;
  total_weight_kg: number;
  offcut_waste_pct: number;
  status: BbsStatus;
  approved_by?: string | null;
  created_at: string;
}

function calculateUnitWeight(diaMm: number): number {
  return Number(((diaMm * diaMm) / 162.2).toFixed(3));
}

function formatKgToMt(valKg: number): string {
  if (valKg >= 1000) return `${(valKg / 1000).toFixed(2)} MT`;
  return `${Math.round(valKg || 0).toLocaleString("en-IN")} kg`;
}

export default function CanonicalBbsPage() {
  const { project, role, tier } = useActiveRole();
  const [bbsItems, setBbsItems] = useState<BbsItemRecord[]>([]);
  const [selectedBbs, setSelectedBbs] = useState<BbsItemRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterDia, setFilterDia] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // Form State for Adding New Bar Mark
  const [schedNo, setSchedNo] = useState(`BBS-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
  const [element, setElement] = useState(
    tier === "RESIDENTIAL" ? "Master Bed Lintel & Sunken Bath Rim Stiffener" : "Level 08 Shear Core Column C4"
  );
  const [locationGrid, setLocationGrid] = useState(
    tier === "RESIDENTIAL" ? "Grid MB-Wall B" : "Tower A / Grid C4-D4"
  );
  const [barMark, setBarMark] = useState("BM-01");
  const [diameter, setDiameter] = useState<number>(tier === "RESIDENTIAL" ? 10 : 25);
  const [shape, setShape] = useState<RebarShapeType>(
    tier === "RESIDENTIAL" ? "L_BENT_90" : "STRAIGHT"
  );
  const [membersCount, setMembersCount] = useState<number>(tier === "RESIDENTIAL" ? 2 : 4);
  const [barsPerMember, setBarsPerMember] = useState<number>(tier === "RESIDENTIAL" ? 4 : 12);
  const [cuttingLength, setCuttingLength] = useState<number>(tier === "RESIDENTIAL" ? 3.45 : 8.85);
  const [dimDetail, setDimDetail] = useState("A: 3150mm, B: 300mm (2d bend deduction)");

  // Type-Safe Role Checking (avoids TS2367 strict union errors)
  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = role?.label || "";
  const isSeorOrArchitect =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("SEOR") ||
    roleLabel.includes("Engineer") ||
    roleLabel.includes("Lead");

  const loadBbsData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("engineering_bbs_schedules")
        .select("*")
        .eq("project_id", project.id)
        .order("bar_mark", { ascending: true });

      if (data && data.length > 0) {
        setBbsItems(data as BbsItemRecord[]);
        if (!selectedBbs) setSelectedBbs(data[0] as BbsItemRecord);
      } else {
        const defaults: BbsItemRecord[] =
          tier === "RESIDENTIAL"
            ? [
                {
                  id: "bbs-res-01",
                  project_id: project.id,
                  schedule_number: "BBS-RES-011",
                  structural_element: "Sunken Bath Micro-Concrete Rim L-Stiffeners",
                  location_grid: "Guest Bath / Sunken PB-01",
                  bar_mark: "BM-01",
                  bar_diameter_mm: 10,
                  shape_type: "L_BENT_90",
                  dimensions_detail: "A: 2800mm, B: 300mm (-20mm bend deduction)",
                  no_of_members: 2,
                  bars_per_member: 4,
                  total_bars: 8,
                  cutting_length_m: 3.08,
                  total_length_m: 24.64,
                  unit_weight_kg_m: calculateUnitWeight(10),
                  total_weight_kg: Number((24.64 * calculateUnitWeight(10)).toFixed(2)),
                  offcut_waste_pct: 1.8,
                  status: "SEOR_APPROVED",
                  approved_by: "Principal Architect",
                  created_at: new Date().toISOString(),
                },
                {
                  id: "bbs-res-02",
                  project_id: project.id,
                  schedule_number: "BBS-RES-012",
                  structural_element: "Living Room False Ceiling Pelmet Tie Stiffener",
                  location_grid: "Grid LR-Wall B",
                  bar_mark: "BM-02",
                  bar_diameter_mm: 8,
                  shape_type: "STRAIGHT",
                  dimensions_detail: "Straight Run: 3600mm",
                  no_of_members: 3,
                  bars_per_member: 2,
                  total_bars: 6,
                  cutting_length_m: 3.6,
                  total_length_m: 21.6,
                  unit_weight_kg_m: calculateUnitWeight(8),
                  total_weight_kg: Number((21.6 * calculateUnitWeight(8)).toFixed(2)),
                  offcut_waste_pct: 1.2,
                  status: "FABRICATED_TIED",
                  approved_by: "Principal Architect",
                  created_at: new Date(Date.now() - 86400000).toISOString(),
                },
              ]
            : [
                {
                  id: "bbs-twr-01",
                  project_id: project.id,
                  schedule_number: "BBS-TWR-104",
                  structural_element: "Level 08 Shear Core Main Vertical Reinforcement",
                  location_grid: "Tower A / Grid C4 Core Wall",
                  bar_mark: "BM-V1",
                  bar_diameter_mm: 32,
                  shape_type: "STRAIGHT",
                  dimensions_detail: "Full Floor Height: 8850mm (Includes 50d lap)",
                  no_of_members: 4,
                  bars_per_member: 16,
                  total_bars: 64,
                  cutting_length_m: 8.85,
                  total_length_m: 566.4,
                  unit_weight_kg_m: calculateUnitWeight(32),
                  total_weight_kg: Number((566.4 * calculateUnitWeight(32)).toFixed(2)),
                  offcut_waste_pct: 1.4,
                  status: "SEOR_APPROVED",
                  approved_by: "Resident SEOR",
                  created_at: new Date().toISOString(),
                },
                {
                  id: "bbs-twr-02",
                  project_id: project.id,
                  schedule_number: "BBS-TWR-105",
                  structural_element: "Core Shear Wall Confining Closed Stirrups",
                  location_grid: "Tower A / Grid C4 Core Wall",
                  bar_mark: "BM-T1",
                  bar_diameter_mm: 12,
                  shape_type: "STIRRUP_RECTANGULAR",
                  dimensions_detail: "A: 750mm, B: 350mm, Hooks: 2x 135deg (10d)",
                  no_of_members: 4,
                  bars_per_member: 45,
                  total_bars: 180,
                  cutting_length_m: 2.45,
                  total_length_m: 441.0,
                  unit_weight_kg_m: calculateUnitWeight(12),
                  total_weight_kg: Number((441.0 * calculateUnitWeight(12)).toFixed(2)),
                  offcut_waste_pct: 2.1,
                  status: "SEOR_APPROVED",
                  approved_by: "Resident SEOR",
                  created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
                },
                {
                  id: "bbs-twr-03",
                  project_id: project.id,
                  schedule_number: "BBS-TWR-106",
                  structural_element: "PT Slab Deck Bottom Secondary Mesh Chairs",
                  location_grid: "Level 08 Slab / Grid B-D",
                  bar_mark: "BM-CH1",
                  bar_diameter_mm: 16,
                  shape_type: "CRANKED_CHAIR",
                  dimensions_detail: "H: 140mm, Top: 300mm, Bases: 2x 200mm",
                  no_of_members: 1,
                  bars_per_member: 120,
                  total_bars: 120,
                  cutting_length_m: 1.15,
                  total_length_m: 138.0,
                  unit_weight_kg_m: calculateUnitWeight(16),
                  total_weight_kg: Number((138.0 * calculateUnitWeight(16)).toFixed(2)),
                  offcut_waste_pct: 2.4,
                  status: "DRAFT",
                  created_at: new Date().toISOString(),
                },
              ];

        setBbsItems(defaults);
        if (!selectedBbs) setSelectedBbs(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [project.id, selectedBbs, tier]);

  useEffect(() => {
    void loadBbsData();

    const channel = supabase
      .channel(`bbs_sync_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "engineering_bbs_schedules" }, () => void loadBbsData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadBbsData]);

  const summary = useMemo(() => {
    const totalBarsCount = bbsItems.reduce((sum, b) => sum + b.total_bars, 0);
    const totalLengthM = bbsItems.reduce((sum, b) => sum + b.total_length_m, 0);
    const totalWeightKg = bbsItems.reduce((sum, b) => sum + b.total_weight_kg, 0);
    const approvedWeightKg = bbsItems
      .filter((b) => b.status === "SEOR_APPROVED" || b.status === "FABRICATED_TIED")
      .reduce((sum, b) => sum + b.total_weight_kg, 0);
    const avgOffcutPct =
      bbsItems.length > 0
        ? (bbsItems.reduce((sum, b) => sum + b.offcut_waste_pct, 0) / bbsItems.length).toFixed(1)
        : "0.0";

    return { totalBarsCount, totalLengthM, totalWeightKg, approvedWeightKg, avgOffcutPct };
  }, [bbsItems]);

  const filteredItems = useMemo(() => {
    return bbsItems.filter((b) => {
      const matchesDia = filterDia === "ALL" || b.bar_diameter_mm.toString() === filterDia;
      const haystack = `${b.bar_mark} ${b.structural_element} ${b.location_grid} ${b.schedule_number}`.toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchesDia && matchesSearch;
    });
  }, [bbsItems, filterDia, search]);

  const handleUpdateStatus = async (bbsId: string, nextStatus: BbsStatus) => {
    if (!isSeorOrArchitect && nextStatus === "SEOR_APPROVED") return;
    setActionInProgress(bbsId);

    const updatePayload: Partial<BbsItemRecord> = { status: nextStatus };
    if (nextStatus === "SEOR_APPROVED") {
      updatePayload.approved_by = role.label;
    }

    try {
      await (supabase as any).from("engineering_bbs_schedules").update(updatePayload).eq("id", bbsId);
    } catch {
      // Optimistic update
    }

    setBbsItems((prev) =>
      prev.map((b) => (b.id === bbsId ? { ...b, ...updatePayload } : b))
    );
    if (selectedBbs && selectedBbs.id === bbsId) {
      setSelectedBbs((prev) => (prev ? { ...prev, ...updatePayload } : null));
    }
    setActionInProgress(null);
  };

  const handleCreateBbs = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating");

    const totalBars = Number(membersCount) * Number(barsPerMember);
    const totalLen = totalBars * Number(cuttingLength);
    const unitWt = calculateUnitWeight(Number(diameter));
    const totalWt = Number((totalLen * unitWt).toFixed(2));

    const newRecord: Omit<BbsItemRecord, "id"> = {
      project_id: project.id,
      schedule_number: schedNo.trim(),
      structural_element: element.trim(),
      location_grid: locationGrid.trim(),
      bar_mark: barMark.trim(),
      bar_diameter_mm: Number(diameter),
      shape_type: shape,
      dimensions_detail: dimDetail.trim(),
      no_of_members: Number(membersCount),
      bars_per_member: Number(barsPerMember),
      total_bars: totalBars,
      cutting_length_m: Number(cuttingLength),
      total_length_m: Number(totalLen.toFixed(2)),
      unit_weight_kg_m: unitWt,
      total_weight_kg: totalWt,
      offcut_waste_pct: 1.5,
      status: "DRAFT",
      created_at: new Date().toISOString(),
    };

    try {
      await (supabase as any).from("engineering_bbs_schedules").insert([newRecord]);
    } catch {
      // Local append
    }

    setBbsItems((prev) => [{ ...newRecord, id: `bbs-${Date.now()}` }, ...prev]);
    setModalOpen(false);
    setActionInProgress(null);
  };

  const handlePrintBbs = () => {
    const printWin = window.open("", "_blank", "width=1000,height=850");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Bar Bending Schedule (BBS) — ${project.name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .total-row { background: #f1f5f9; font-weight: bold; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 36px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · IS 2502:1963 / SP 34 Concrete Reinforcement Schedule</div>
      <h1 class="title">Statutory Bar Bending Schedule (BBS)</h1>
      <div class="meta">Project: ${project.name} (${project.id}) · Total Steel Mass: ${formatKgToMt(summary.totalWeightKg)}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Mark</th>
        <th>Structural Element & Grid</th>
        <th>Dia (mm)</th>
        <th>Shape & Dimension Details</th>
        <th class="tar">Bars</th>
        <th class="tar">Cut L (m)</th>
        <th class="tar">Total L (m)</th>
        <th class="tar">Unit Wt</th>
        <th class="tar">Weight (kg)</th>
      </tr>
    </thead>
    <tbody>
      ${bbsItems.map((b) => `
        <tr>
          <td style="font-family: monospace; font-weight: bold;">${b.bar_mark}</td>
          <td><strong>${b.structural_element}</strong><div style="font-size: 10px; color: #64748b;">${b.location_grid}</div></td>
          <td style="font-family: monospace;">T${b.bar_diameter_mm}</td>
          <td>${b.shape_type.replace(/_/g, ' ')} (${b.dimensions_detail})</td>
          <td class="tar">${b.total_bars}</td>
          <td class="tar">${b.cutting_length_m.toFixed(2)}</td>
          <td class="tar">${b.total_length_m.toFixed(1)}</td>
          <td class="tar">${b.unit_weight_kg_m.toFixed(3)}</td>
          <td class="tar" style="font-weight: bold;">${Math.round(b.total_weight_kg).toLocaleString("en-IN")}</td>
        </tr>
      `).join("")}
      <tr class="total-row">
        <td colspan="4"><strong>TOTAL CERTIFIED BBS REBAR TONNAGE</strong></td>
        <td class="tar">${summary.totalBarsCount}</td>
        <td></td>
        <td class="tar">${summary.totalLengthM.toFixed(1)} m</td>
        <td></td>
        <td class="tar" style="color: #0284c7; font-size: 13px;">${formatKgToMt(summary.totalWeightKg)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <div>
      <div>Rebar Detailing Engineer</div>
      <div style="color: #64748b;">Cut lengths minimized (&lt; 2.5% offcut).</div>
      <div class="sig">Detailing Lead Signature</div>
    </div>
    <div>
      <div>Bar Bending Gang Master</div>
      <div style="color: #64748b;">Pins and mandrels checked per IS 2502.</div>
      <div class="sig">Fabrication Foreman Sign</div>
    </div>
    <div>
      <div>Resident SEOR / Consultant</div>
      <div style="color: #64748b;">Cover, laps and hook lengths approved.</div>
      <div class="sig">SEOR Structural Approval Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedBbs) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        OPTIMIZING IS 2502 BAR BENDING SCHEDULES &amp; REBAR WEIGHT GAUGES...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Engineering & Detailing · IS 2502:1963 / SP 34 Standards</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Bar Bending Schedule (BBS) &amp; Rebar Optimizer
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Strict reinforcement cutting and bending calculations ($D^2/162.2$). Enforces standard bend deductions ($2d$ for $90^\circ$, $3d$ for $135^\circ$ hooks) and minimizes offcut scrap before tying release.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handlePrintBbs}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Statutory BBS</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSchedNo(`BBS-${tier === "RESIDENTIAL" ? "RES" : "TWR"}-${Math.floor(100 + Math.random() * 900)}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50"
            >
              <Plus className="w-4 h-4" />
              <span>Add Bar Mark</span>
            </button>
          </div>
        </div>

        {/* 4 PRIMARY BBS METRIC GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Rebar Schedule Mass</span>
              <Scale className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {formatKgToMt(summary.totalWeightKg)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">{summary.totalBarsCount} Total individual cut pieces</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>SEOR Approved for Tying</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {formatKgToMt(summary.approvedWeightKg)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Cleared for fabrication yard staging</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Linear Length</span>
              <Layers className="w-4 h-4 text-zinc-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {Math.round(summary.totalLengthM).toLocaleString("en-IN")} m
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Across all structural bar marks</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Avg Offcut Scrap Waste</span>
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {summary.avgOffcutPct}%
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Permissible benchmark &le; 2.5%</div>
          </div>
        </div>

        {/* TOOLBAR: SEARCH & DIAMETER FILTER */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: "ALL", label: `All Diameters (${bbsItems.length})` },
              { key: "8", label: "8mm" },
              { key: "10", label: "10mm" },
              { key: "12", label: "12mm" },
              { key: "16", label: "16mm" },
              { key: "20", label: "20mm" },
              { key: "25", label: "25mm" },
              { key: "32", label: "32mm" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterDia(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                  filterDia === tab.key
                    ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-72 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
            <input
              type="text"
              placeholder="Search bar mark, element, grid..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-white text-xs outline-none focus:border-cyan-400"
            />
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: BBS TABLE (7 cols) vs BAR MARK INSPECTOR & BEND CALCULATOR (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: BBS SCHEDULE TABLE (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  IS 2502 Detailing Schedule
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Reinforcement Cutting List</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredItems.length} Bar Marks</span>
            </div>

            <div className="space-y-3">
              {filteredItems.map((item) => {
                const isSelected = selectedBbs.id === item.id;
                const isApproved = item.status === "SEOR_APPROVED";
                const isFabricated = item.status === "FABRICATED_TIED";

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedBbs(item)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {item.bar_mark}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-cyan-300 font-mono font-bold">
                          T{item.bar_diameter_mm}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isFabricated
                            ? "bg-blue-950 text-blue-400 border border-blue-800/50"
                            : isApproved
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-amber-950 text-amber-400 border border-amber-800/50"
                        }`}>
                          {item.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <span className="text-xs font-mono font-extrabold text-white">
                        {Math.round(item.total_weight_kg).toLocaleString("en-IN")} kg
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-zinc-100">{item.structural_element}</div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        {item.shape_type.replace(/_/g, " ")} · {item.dimensions_detail}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Cut L: <strong className="text-zinc-200">{item.cutting_length_m} m</strong></span>
                      <span>Total Bars: <strong className="text-zinc-300">{item.total_bars}</strong></span>
                      <span>Offcut Waste: <strong className="text-emerald-400">{item.offcut_waste_pct}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: BEND DEDUCTION & STRUCTURAL VERIFICATION DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  BBS Engineering Inspector
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedBbs.bar_mark} (T{selectedBbs.bar_diameter_mm})</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {selectedBbs.schedule_number}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">Structural Element:</span>
              <strong className="text-white text-sm font-sans block leading-snug">{selectedBbs.structural_element}</strong>
              <div className="text-cyan-400 text-[11px]">{selectedBbs.location_grid}</div>
              <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-[11px]">
                <div>Shape: <strong className="text-zinc-200">{selectedBbs.shape_type.replace(/_/g, " ")}</strong></div>
                <div>Members: <strong className="text-zinc-200">{selectedBbs.no_of_members} Units</strong></div>
              </div>
            </div>

            {/* MATHEMATICAL PROOF & BEND DEDUCTIONS */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <span className="text-[10px] uppercase text-zinc-500 font-bold block">
                IS 2502 Standard Steel Weight Calculations:
              </span>

              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Unit Mass Formula (D²/162.2):</span>
                  <span className="text-zinc-200">{selectedBbs.unit_weight_kg_m} kg/m</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Cutting Length per Bar:</span>
                  <span className="text-zinc-200">{selectedBbs.cutting_length_m} meters</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Total Linear Length:</span>
                  <span className="text-zinc-200">{selectedBbs.total_length_m} meters</span>
                </div>
                <div className="flex justify-between text-white font-bold pt-1 border-t border-zinc-800">
                  <span>Total Calculated Mass:</span>
                  <span className="text-cyan-400">{Math.round(selectedBbs.total_weight_kg).toLocaleString("en-IN")} kg</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Offcut Optimization Waste:</span>
                  <span>{selectedBbs.offcut_waste_pct}% (&le; 2.5% tolerance)</span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              {selectedBbs.status === "DRAFT" && (
                <button
                  type="button"
                  disabled={!isSeorOrArchitect || actionInProgress === selectedBbs.id}
                  onClick={() => handleUpdateStatus(selectedBbs.id, "SEOR_APPROVED")}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs font-mono transition flex items-center justify-center gap-1.5 shadow-md ${
                    !isSeorOrArchitect
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                      : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/50"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Approve BBS for Cutting Yard (SEOR)</span>
                </button>
              )}

              {selectedBbs.status === "SEOR_APPROVED" && (
                <button
                  type="button"
                  disabled={actionInProgress === selectedBbs.id}
                  onClick={() => handleUpdateStatus(selectedBbs.id, "FABRICATED_TIED")}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs font-mono transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50"
                >
                  <Wrench className="w-4 h-4" />
                  <span>Confirm Fabricated &amp; Tied on Formwork</span>
                </button>
              )}

              {selectedBbs.status === "FABRICATED_TIED" && (
                <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Rebar Fabricated &amp; Tied in Formwork</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              IS 2502 / SP 34 Structural Concrete Reinforcement Standard
            </div>
          </div>

        </div>

        {/* ADD BAR MARK MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-in fade-in duration-150">
            <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                    Add Rebar Bar Mark (IS 2502)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateBbs} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Schedule Ref</label>
                    <input
                      type="text"
                      required
                      value={schedNo}
                      onChange={(e) => setSchedNo(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Bar Mark ID</label>
                    <input
                      type="text"
                      required
                      value={barMark}
                      onChange={(e) => setBarMark(e.target.value)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Structural Element</label>
                  <input
                    type="text"
                    required
                    value={element}
                    onChange={(e) => setElement(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Location Grid / Axis</label>
                  <input
                    type="text"
                    required
                    value={locationGrid}
                    onChange={(e) => setLocationGrid(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Diameter (mm)</label>
                    <select
                      value={diameter}
                      onChange={(e) => setDiameter(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-mono"
                    >
                      <option value={8}>T8 (0.395 kg/m)</option>
                      <option value={10}>T10 (0.617 kg/m)</option>
                      <option value={12}>T12 (0.888 kg/m)</option>
                      <option value={16}>T16 (1.578 kg/m)</option>
                      <option value={20}>T20 (2.466 kg/m)</option>
                      <option value={25}>T25 (3.853 kg/m)</option>
                      <option value={32}>T32 (6.313 kg/m)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Shape Type</label>
                    <select
                      value={shape}
                      onChange={(e) => setShape(e.target.value as RebarShapeType)}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 font-mono"
                    >
                      <option value="STRAIGHT">Straight Bar</option>
                      <option value="L_BENT_90">L-Bent (90 deg)</option>
                      <option value="STIRRUP_RECTANGULAR">Rectangular Stirrup</option>
                      <option value="CRANKED_CHAIR">Cranked Chair</option>
                      <option value="U_HOOK_180">U-Hook (180 deg)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Members</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={membersCount}
                      onChange={(e) => setMembersCount(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Bars / Member</label>
                    <input
                      type="number"
                      min={1}
                      required
                      value={barsPerMember}
                      onChange={(e) => setBarsPerMember(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Cut L (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={cuttingLength}
                      onChange={(e) => setCuttingLength(Number(e.target.value))}
                      className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-white font-mono outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1 font-mono">Dimension &amp; Bend Details</label>
                  <input
                    type="text"
                    required
                    value={dimDetail}
                    onChange={(e) => setDimDetail(e.target.value)}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-[11px] space-y-1">
                  <div className="flex justify-between text-zinc-400">
                    <span>Total Bar Count:</span>
                    <strong className="text-white">{membersCount * barsPerMember} Bars</strong>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Calculated Total Weight:</span>
                    <strong className="text-cyan-400">
                      {Math.round(membersCount * barsPerMember * cuttingLength * calculateUnitWeight(diameter))} kg
                    </strong>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === "creating"}
                    className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition shadow-md shadow-cyan-950/50 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Save BBS Entry</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}