"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  CheckCircle2,
  Clock,
  Layers,
  Lock,
  Printer,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type StructuralElementType =
  | "COLUMNS_WALLS_VERTICAL"
  | "SLAB_SOFFIT_PROPS_INTACT"
  | "BEAM_SOFFIT_PROPS_INTACT"
  | "SLAB_PROPS_UPTO_4_5M"
  | "SLAB_PROPS_OVER_4_5M"
  | "BEAM_PROPS_UPTO_6M"
  | "BEAM_PROPS_OVER_6M";

export interface StrippingRecord {
  id: string;
  project_id: string;
  pour_card_ref: string;
  element_name: string;
  element_type: StructuralElementType;
  location_grid: string;
  span_length_m: number;
  concrete_grade: string;
  pour_datetime: string;
  min_period_days: number;
  eligible_stripping_datetime: string;
  required_strength_pct: number;
  actual_cube_strength_mpa?: number | null;
  target_characteristic_mpa: number;
  status: "LOCKED_MATURING" | "TEST_VERIFIED_READY" | "STRIPPING_AUTHORIZED" | "STRIPPED_COMPLETED";
  seor_cleared_by?: string | null;
  seor_cleared_at?: string | null;
  ambient_temp_avg_celsius: number;
}

const IS_456_RULES: Record<StructuralElementType, { label: string; minDays: number; strengthPct: number; codeRef: string }> = {
  COLUMNS_WALLS_VERTICAL: {
    label: "Vertical Formwork to Columns, Walls & Beams",
    minDays: 1,
    strengthPct: 25,
    codeRef: "IS 456 Cl. 11.3.1 (a)",
  },
  SLAB_SOFFIT_PROPS_INTACT: {
    label: "Slab Soffit Formwork (Props Left Intact)",
    minDays: 3,
    strengthPct: 50,
    codeRef: "IS 456 Cl. 11.3.1 (b)",
  },
  BEAM_SOFFIT_PROPS_INTACT: {
    label: "Beam Soffit Formwork (Props Left Intact)",
    minDays: 7,
    strengthPct: 70,
    codeRef: "IS 456 Cl. 11.3.1 (c)",
  },
  SLAB_PROPS_UPTO_4_5M: {
    label: "Props to Slabs (Spans up to 4.5m)",
    minDays: 7,
    strengthPct: 70,
    codeRef: "IS 456 Cl. 11.3.1 (d)(i)",
  },
  SLAB_PROPS_OVER_4_5M: {
    label: "Props to Slabs (Spans over 4.5m)",
    minDays: 14,
    strengthPct: 85,
    codeRef: "IS 456 Cl. 11.3.1 (d)(ii)",
  },
  BEAM_PROPS_UPTO_6M: {
    label: "Props to Beams & Arches (Spans up to 6m)",
    minDays: 14,
    strengthPct: 85,
    codeRef: "IS 456 Cl. 11.3.1 (e)(i)",
  },
  BEAM_PROPS_OVER_6M: {
    label: "Props to Beams & Arches (Spans over 6m)",
    minDays: 21,
    strengthPct: 100,
    codeRef: "IS 456 Cl. 11.3.1 (e)(ii)",
  },
};

export default function CanonicalFormworkStrippingPage() {
  const { project, role, tier } = useActiveRole();
  const [records, setRecords] = useState<StrippingRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<StrippingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");

  const roleId = (role as { id?: string })?.id || "";
  const isSeorOrArchitect =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    role.label.includes("Architect") ||
    role.label.includes("SEOR");

  const loadStrippingData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("formwork_stripping_register")
        .select("*")
        .eq("project_id", project.id)
        .order("eligible_stripping_datetime", { ascending: true });

      if (data && data.length > 0) {
        setRecords(data as StrippingRecord[]);
        if (!selectedRecord) setSelectedRecord(data[0] as StrippingRecord);
      } else {
        const defaults: StrippingRecord[] =
          tier === "RESIDENTIAL"
            ? [
                {
                  id: "str-res-01",
                  project_id: project.id,
                  pour_card_ref: "PC-2026-088",
                  element_name: "Sunken Bath Micro-Concrete Bedding Edge Forms",
                  element_type: "COLUMNS_WALLS_VERTICAL",
                  location_grid: "Guest Bath / Sunken Grid PB-01",
                  span_length_m: 2.4,
                  concrete_grade: "M25",
                  pour_datetime: "2026-09-02T10:00:00Z",
                  min_period_days: 1,
                  eligible_stripping_datetime: "2026-09-03T10:00:00Z",
                  required_strength_pct: 25,
                  actual_cube_strength_mpa: 19.8,
                  target_characteristic_mpa: 25,
                  status: "STRIPPED_COMPLETED",
                  seor_cleared_by: "Principal Architect",
                  seor_cleared_at: "2026-09-03T12:00:00Z",
                  ambient_temp_avg_celsius: 27,
                },
                {
                  id: "str-res-02",
                  project_id: project.id,
                  pour_card_ref: "PC-2026-092",
                  element_name: "Living Room Feature Lintel & Ceiling Pelmet Stiffener",
                  element_type: "BEAM_SOFFIT_PROPS_INTACT",
                  location_grid: "Grid LR-Wall B",
                  span_length_m: 3.2,
                  concrete_grade: "M20",
                  pour_datetime: "2026-09-08T09:30:00Z",
                  min_period_days: 7,
                  eligible_stripping_datetime: "2026-09-15T09:30:00Z",
                  required_strength_pct: 70,
                  actual_cube_strength_mpa: 16.4,
                  target_characteristic_mpa: 20,
                  status: "TEST_VERIFIED_READY",
                  seor_cleared_by: null,
                  seor_cleared_at: null,
                  ambient_temp_avg_celsius: 28,
                },
              ]
            : [
                {
                  id: "str-twr-01",
                  project_id: project.id,
                  pour_card_ref: "PC-TWR-104",
                  element_name: "Level 07 Core Shear Wall Hydraulic Formwork",
                  element_type: "COLUMNS_WALLS_VERTICAL",
                  location_grid: "Tower A / Grid B2-E4",
                  span_length_m: 4.0,
                  concrete_grade: "M40",
                  pour_datetime: "2026-08-28T08:00:00Z",
                  min_period_days: 1,
                  eligible_stripping_datetime: "2026-08-29T08:00:00Z",
                  required_strength_pct: 25,
                  actual_cube_strength_mpa: 31.4,
                  target_characteristic_mpa: 40,
                  status: "STRIPPED_COMPLETED",
                  seor_cleared_by: "Resident SEOR",
                  seor_cleared_at: "2026-08-29T10:30:00Z",
                  ambient_temp_avg_celsius: 28,
                },
                {
                  id: "str-twr-02",
                  project_id: project.id,
                  pour_card_ref: "PC-TWR-109",
                  element_name: "Level 08 Main PT Deck Slab Props (Span 5.8m)",
                  element_type: "SLAB_PROPS_OVER_4_5M",
                  location_grid: "Tower A / Grid C2-D4",
                  span_length_m: 5.8,
                  concrete_grade: "M40",
                  pour_datetime: "2026-09-06T11:00:00Z",
                  min_period_days: 14,
                  eligible_stripping_datetime: "2026-09-20T11:00:00Z",
                  required_strength_pct: 85,
                  actual_cube_strength_mpa: 30.8,
                  target_characteristic_mpa: 40,
                  status: "LOCKED_MATURING",
                  seor_cleared_by: null,
                  seor_cleared_at: null,
                  ambient_temp_avg_celsius: 29,
                },
                {
                  id: "str-twr-03",
                  project_id: project.id,
                  pour_card_ref: "PC-TWR-107",
                  element_name: "Level 07 Heavy Transfer Girder Soffit Props (Span 7.2m)",
                  element_type: "BEAM_PROPS_OVER_6M",
                  location_grid: "Grid Transverse Axis 02",
                  span_length_m: 7.2,
                  concrete_grade: "M40",
                  pour_datetime: "2026-08-24T06:00:00Z",
                  min_period_days: 21,
                  eligible_stripping_datetime: "2026-09-14T06:00:00Z",
                  required_strength_pct: 100,
                  actual_cube_strength_mpa: 42.1,
                  target_characteristic_mpa: 40,
                  status: "TEST_VERIFIED_READY",
                  seor_cleared_by: null,
                  seor_cleared_at: null,
                  ambient_temp_avg_celsius: 27,
                },
              ];

        setRecords(defaults);
        if (!selectedRecord) setSelectedRecord(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [project.id, selectedRecord, tier]);

  useEffect(() => {
    void loadStrippingData();

    const channel = supabase
      .channel(`stripping_sync_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "formwork_stripping_register" }, () => void loadStrippingData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadStrippingData]);

  const summary = useMemo(() => {
    const totalCount = records.length;
    const lockedMaturing = records.filter((r) => r.status === "LOCKED_MATURING").length;
    const readyForClearance = records.filter((r) => r.status === "TEST_VERIFIED_READY").length;
    const completedStripped = records.filter((r) => r.status === "STRIPPED_COMPLETED").length;

    return { totalCount, lockedMaturing, readyForClearance, completedStripped };
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (filterType === "ALL") return records;
    return records.filter((r) => r.status === filterType);
  }, [records, filterType]);

  const handleAuthorizeStripping = async (recordId: string) => {
    if (!isSeorOrArchitect) return;
    setActionInProgress(recordId);

    const updatePayload: Partial<StrippingRecord> = {
      status: "STRIPPING_AUTHORIZED",
      seor_cleared_by: role.label,
      seor_cleared_at: new Date().toISOString(),
    };

    try {
      await (supabase as any).from("formwork_stripping_register").update(updatePayload).eq("id", recordId);
    } catch {
      // Optimistic update
    }

    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, ...updatePayload } : r))
    );
    if (selectedRecord && selectedRecord.id === recordId) {
      setSelectedRecord((prev) => (prev ? { ...prev, ...updatePayload } : null));
    }
    setActionInProgress(null);
  };

  const handleMarkStripped = async (recordId: string) => {
    setActionInProgress(`strip_${recordId}`);
    const updatePayload: Partial<StrippingRecord> = {
      status: "STRIPPED_COMPLETED",
    };

    try {
      await (supabase as any).from("formwork_stripping_register").update(updatePayload).eq("id", recordId);
    } catch {
      // Optimistic update
    }

    setRecords((prev) =>
      prev.map((r) => (r.id === recordId ? { ...r, ...updatePayload } : r))
    );
    if (selectedRecord && selectedRecord.id === recordId) {
      setSelectedRecord((prev) => (prev ? { ...prev, ...updatePayload } : null));
    }
    setActionInProgress(null);
  };

  const handlePrintCertificate = (record: StrippingRecord) => {
    const printWin = window.open("", "_blank", "width=1000,height=850");
    if (!printWin) return;

    const rule = IS_456_RULES[record.element_type];
    const targetMpa = (record.target_characteristic_mpa * record.required_strength_pct) / 100;
    const isSatisfied =
      record.actual_cube_strength_mpa &&
      record.actual_cube_strength_mpa >= targetMpa;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Formwork Striking Clearance Certificate — ${record.element_name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
    .released { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    .locked { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .rule-box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 14px; margin-top: 16px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 36px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · IS 456:2000 Clause 11.3 Striking of Formwork</div>
      <h1 class="title">Formwork Striking Clearance Certificate</h1>
      <div class="meta">Pour Card Ref: ${record.pour_card_ref} · Project: ${project.name}</div>
    </div>
    <span class="badge ${record.status === 'STRIPPING_AUTHORIZED' || record.status === 'STRIPPED_COMPLETED' ? 'released' : 'locked'}">${record.status.replace(/_/g, ' ')}</span>
  </div>

  <table>
    <tr><th>Structural Element</th><td colspan="3"><strong>${record.element_name}</strong></td></tr>
    <tr><th>Grid Coordinate</th><td>${record.location_grid}</td><th>Clear Span Length</th><td><strong>${record.span_length_m} meters</strong></td></tr>
    <tr><th>Concrete Mix Grade</th><td>${record.concrete_grade} (Target fck: ${record.target_characteristic_mpa} MPa)</td><th>Pour Timestamp</th><td>${new Date(record.pour_datetime).toLocaleString("en-IN")}</td></tr>
    <tr><th>Statutory Period Rule</th><td><strong>${rule.codeRef}</strong></td><th>Mandatory Duration</th><td>${rule.minDays} Days (&gt; ${record.ambient_temp_avg_celsius}°C)</td></tr>
  </table>

  <div class="rule-box">
    <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #475569;">IS 456 Structural Safety Interlock Evaluation</div>
    <div style="margin-top: 6px;">Classification: <strong>${rule.label}</strong></div>
    <div>Required Cube Strength: <strong>${record.required_strength_pct}% of fck (&ge; ${targetMpa.toFixed(1)} MPa)</strong></div>
    <div>Actual Tested Break: <strong>${record.actual_cube_strength_mpa ? `${record.actual_cube_strength_mpa} MPa` : 'Awaiting Test Result'}</strong> (${isSatisfied ? 'SATISFIED' : 'UNRESOLVED'})</div>
  </div>

  <div class="footer">
    <div>
      <div>Site Shuttering Supervisor</div>
      <div style="color: #64748b;">Props staged per approved sequence.</div>
      <div class="sig">Contractor Formwork Lead</div>
    </div>
    <div>
      <div>QA/QC Testing Inspector</div>
      <div style="color: #64748b;">Compressive cubes broken per IS 516.</div>
      <div class="sig">Cube Test Witness Seal</div>
    </div>
    <div>
      <div>Consultant Structural Engineer (SEOR)</div>
      <div style="color: #64748b;">${record.seor_cleared_by || 'Awaiting Authorization'}</div>
      <div class="sig">SEOR De-Shuttering Seal</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedRecord) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING FORMWORK STRIPPING REGISTER &amp; IS 456 MATURITY RULES...
      </div>
    );
  }

  const selectedRule = IS_456_RULES[selectedRecord.element_type];
  const requiredMpa = (selectedRecord.target_characteristic_mpa * selectedRecord.required_strength_pct) / 100;
  const strengthPassed =
    selectedRecord.actual_cube_strength_mpa !== null &&
    selectedRecord.actual_cube_strength_mpa !== undefined &&
    selectedRecord.actual_cube_strength_mpa >= requiredMpa;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Structural Safety Hold-Gate · IS 456:2000 Clause 11.3</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Formwork Stripping &amp; De-Shuttering Console
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Strict de-shuttering hold-points. Slabs, transfer beams, and props are locked by law until mandatory curing periods and NABL compressive cube tests clear structural threshold criteria.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintCertificate(selectedRecord)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Striking Certificate</span>
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs font-semibold">
              SEOR: <strong className="text-cyan-400">{role.label}</strong>
            </span>
          </div>
        </div>

        {/* 4 PRIMARY METRIC GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Tracked Elements</span>
              <Layers className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.totalCount} Elements
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Slabs, beams, and vertical forms</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Locked Under Prop (Hold)</span>
              <Lock className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-rose-400 mt-2">
              {summary.lockedMaturing} Locked
            </div>
            <div className="text-[11px] text-rose-500/80 mt-1">Curing or awaiting cube break</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Verified Ready for Striking</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-cyan-300 mt-2">
              {summary.readyForClearance} Ready
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Cube test passed · awaiting SEOR seal</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Stripped &amp; Cleared</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {summary.completedStripped} Cleared
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Props struck safely without deflection</div>
          </div>
        </div>

        {/* TOOLBAR FILTER TABS */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
          {[
            { key: "ALL", label: `All Elements (${records.length})` },
            { key: "LOCKED_MATURING", label: "Locked Under Prop" },
            { key: "TEST_VERIFIED_READY", label: "Verified Ready" },
            { key: "STRIPPED_COMPLETED", label: "Stripped & Struck" },
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

        {/* 2-COLUMN WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: STRIPPING REGISTER (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  IS 456 Clause 11.3 Schedule
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Active Elements Under Shuttering</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredRecords.length} Items</span>
            </div>

            <div className="space-y-3">
              {filteredRecords.map((rec) => {
                const isSelected = selectedRecord.id === rec.id;
                const isCompleted = rec.status === "STRIPPED_COMPLETED";
                const isReady = rec.status === "TEST_VERIFIED_READY" || rec.status === "STRIPPING_AUTHORIZED";
                const rule = IS_456_RULES[rec.element_type];

                return (
                  <div
                    key={rec.id}
                    onClick={() => setSelectedRecord(rec)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {rec.pour_card_ref}
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded bg-zinc-800 text-cyan-300 font-mono font-bold">
                          {rec.concrete_grade}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isCompleted
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : isReady
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                            : "bg-rose-950 text-rose-400 border border-rose-800/50"
                        }`}>
                          {rec.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <span className="text-xs font-mono font-bold text-zinc-300">
                        Span: {rec.span_length_m}m
                      </span>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-zinc-100">{rec.element_name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{rule.label}</div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Location: <strong className="text-zinc-300">{rec.location_grid}</strong></span>
                      <span>Min Period: <strong className="text-cyan-400">{rule.minDays} Days</strong></span>
                      <span>Required Strength: <strong className="text-zinc-300">{rec.required_strength_pct}%</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: SEOR CLEARANCE PANE (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  SEOR Striking Clearance Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedRecord.pour_card_ref}</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {selectedRecord.concrete_grade}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">Structural Element:</span>
              <strong className="text-white text-sm font-sans block leading-snug">{selectedRecord.element_name}</strong>
              <div className="text-cyan-400 text-[11px]">{selectedRecord.location_grid}</div>
              <div className="pt-2 border-t border-zinc-800/60 grid grid-cols-2 gap-2 text-[11px]">
                <div>Clear Span: <strong className="text-white">{selectedRecord.span_length_m} m</strong></div>
                <div>Avg Temp: <strong className="text-white">{selectedRecord.ambient_temp_avg_celsius}°C</strong></div>
              </div>
            </div>

            {/* STATUTORY CLAUSE BOX */}
            <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/60 font-mono text-xs space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase text-zinc-400 font-bold">
                  Governing Rule:
                </span>
                <span className="text-cyan-400 font-bold">{selectedRule.codeRef}</span>
              </div>
              <div className="text-[11px] text-zinc-300 font-sans leading-snug">
                {selectedRule.label} requires minimum <strong>{selectedRule.minDays} days</strong> elapsed and minimum <strong>{selectedRecord.required_strength_pct}%</strong> characteristic strength.
              </div>

              <div className="pt-2 border-t border-zinc-800/80 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Required Strength:</span>
                  <strong className="text-zinc-200">
                    &ge; {requiredMpa.toFixed(1)} MPa ({selectedRecord.required_strength_pct}% of {selectedRecord.target_characteristic_mpa} MPa)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Tested Cube Strength:</span>
                  <strong className={strengthPassed ? "text-emerald-400" : "text-rose-400"}>
                    {selectedRecord.actual_cube_strength_mpa ? `${selectedRecord.actual_cube_strength_mpa} MPa` : "Pending Testing"}
                  </strong>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div className="pt-2 border-t border-zinc-800 space-y-2">
              {selectedRecord.status === "LOCKED_MATURING" && (
                <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-800/50 text-rose-300 font-mono text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Mandatory curing maturity in progress. Shuttering removal legally locked.</span>
                </div>
              )}

              {selectedRecord.status === "TEST_VERIFIED_READY" && (
                <button
                  type="button"
                  disabled={!isSeorOrArchitect || actionInProgress === selectedRecord.id}
                  onClick={() => handleAuthorizeStripping(selectedRecord.id)}
                  className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/50 font-mono"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Seal SEOR De-Shuttering Authorization</span>
                </button>
              )}

              {selectedRecord.status === "STRIPPING_AUTHORIZED" && (
                <button
                  type="button"
                  disabled={actionInProgress === `strip_${selectedRecord.id}`}
                  onClick={() => handleMarkStripped(selectedRecord.id)}
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 font-mono"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Formwork Struck in Field</span>
                </button>
              )}

              {selectedRecord.status === "STRIPPED_COMPLETED" && (
                <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Formwork Struck Safely · IS 456 Cleared</span>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              IS 456 Formwork Striking &amp; Deflection Control Protocol
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}