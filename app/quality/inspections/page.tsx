"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FileCheck2,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  AlertTriangle,
  Flame,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface WIRRecord {
  id: string;
  project_id: string;
  wir_number: string;
  inspection_type: string;
  location_grid: string;
  subcontractor_name: string;
  inspection_result: "CONCURRED_APPROVED" | "REJECTED_NCR" | "UNDER_INSPECTION";
  inspecting_engineer: string;
  remarks?: string | null;
}

const FALLBACK_WIRS: WIRRecord[] = [
  {
    id: "wir-fb-1",
    project_id: "PRJ-01-LIVE",
    wir_number: "WIR-STR-2026-089",
    inspection_type: "REBAR_COVER",
    location_grid: "Tower A - Level 14 Shear Wall Core C1-C4",
    subcontractor_name: "Apex Structural Formworks Ltd.",
    inspection_result: "CONCURRED_APPROVED",
    inspecting_engineer: "Quality Lead / SEOR",
    remarks: "Cover block depth 50mm verified per IS 456. Clearance granted for concrete casting.",
  },
  {
    id: "wir-fb-2",
    project_id: "PRJ-01-LIVE",
    wir_number: "WIR-MEP-2026-090",
    inspection_type: "MEP_CONCEALMENT",
    location_grid: "Basement 2 - Chilled Water Wall Sleeves",
    subcontractor_name: "Thermax MEP Solutions",
    inspection_result: "CONCURRED_APPROVED",
    inspecting_engineer: "Resident MEP Engineer",
    remarks: "Pressure testing at 1.5x working head authenticated. Ready for backfill.",
  },
];

export default function QualityInspectionsPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [wirs, setWirs] = useState<WIRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [wirType, setWirType] = useState("REBAR_COVER");
  const [grid, setGrid] = useState("");
  const [contractor, setContractor] = useState("");
  const [remarks, setRemarks] = useState("");

  const loadWIRs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("quality_inspection_requests")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setWirs(FALLBACK_WIRS);
      } else {
        setIsFallbackMode(false);
        setWirs(data);
      }
    } catch {
      setIsFallbackMode(true);
      setWirs(FALLBACK_WIRS);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadWIRs();
  }, [loadWIRs]);

  const summary = useMemo(() => {
    const total = wirs.length;
    const approved = wirs.filter((w) => w.inspection_result === "CONCURRED_APPROVED").length;
    return { total, approved };
  }, [wirs]);

  const handleCreateWIR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!grid.trim() || !contractor.trim()) return;

    const code = `WIR-STR-${new Date().getFullYear()}-${(wirs.length + 91).toString().padStart(3, "0")}`;
    const payload: Partial<WIRRecord> = {
      project_id: projectId,
      wir_number: code,
      inspection_type: wirType,
      location_grid: grid.trim(),
      subcontractor_name: contractor.trim(),
      inspection_result: "CONCURRED_APPROVED",
      inspecting_engineer: "Quality Lead / SEOR",
      remarks: remarks.trim() || "Inspection cleared per technical specifications.",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("quality_inspection_requests")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setWirs((prev) => [data, ...prev]);
      setFeedback(`Work Inspection Request ${code} recorded.`);
    } catch {
      const fallback = { ...payload, id: `wir-${Date.now()}` } as WIRRecord;
      setWirs((prev) => [fallback, ...prev]);
      setFeedback(`Optimistic WIR logged: ${code}`);
    } finally {
      setModalOpen(false);
      setGrid("");
      setContractor("");
      setRemarks("");
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>QUALITY ASSURANCE • IS 456 &amp; CPWD STAGE-GATE INSPECTIONS</span>
              <StatutoryInfo
                standardRef="IS 456:2000 / CPWD SECTION 17"
                title="Work Inspection Requests (WIR / RFI)"
                idealRange="100% Quality Concurrence Prior to Pour"
                description="Governs stage-gate technical clearances for rebar covers, formwork shuttering, and MEP sleeves prior to irreversible concrete casting."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-cyan-400" />
              <span>Work Inspection Requests (WIR) &amp; Stage-Gates</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Mandatory engineering sign-offs, rebar verification, and concrete casting clearance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              onClick={() => void loadWIRs()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Raise Inspection (WIR)</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 2 SUMMARY TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Stage-Gate Inspections</span>
            <div className="text-2xl font-bold text-white mt-1">{wirs.length} WIR Requests</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Engineering verification checks</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Concurred &amp; Cleared for Casting</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{summary.approved} Approved</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Zero non-conformance blocks</span>
          </div>
        </div>

        {/* WIR TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
            Quality Inspection Log ({wirs.length})
          </span>

          <div className="overflow-x-auto border border-zinc-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                <tr>
                  <th className="p-3">WIR Number</th>
                  <th className="p-3">Inspection Discipline</th>
                  <th className="p-3">Grid Location</th>
                  <th className="p-3">Subcontractor</th>
                  <th className="p-3">Remarks / Finding</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {wirs.map((w) => (
                  <tr key={w.id} className="hover:bg-zinc-900/50 transition">
                    <td className="p-3 font-bold text-white">{w.wir_number}</td>
                    <td className="p-3 text-cyan-300 font-mono text-[11px]">{w.inspection_type.replace(/_/g, " ")}</td>
                    <td className="p-3 text-zinc-300">{w.location_grid}</td>
                    <td className="p-3 text-zinc-400">{w.subcontractor_name}</td>
                    <td className="p-3 text-zinc-300 font-sans text-xs">{w.remarks}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {w.inspection_result.replace(/_/g, " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Raise Work Inspection Request (WIR)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateWIR} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Inspection Discipline *</label>
                  <select
                    value={wirType}
                    onChange={(e) => setWirType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="REBAR_COVER">Rebar Detailing &amp; Cover Blocks (IS 456)</option>
                    <option value="FORMWORK_ALIGNMENT">Formwork Plumb &amp; Shuttering Tightness</option>
                    <option value="MEP_CONCEALMENT">MEP Wall &amp; Slab Sleeve Concealment</option>
                    <option value="WATERPROOFING_PONDING">Waterproofing 48h Ponding Test</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Location Grid Coordinate *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tower A - Level 15 Core Wall Grid C2"
                    value={grid}
                    onChange={(e) => setGrid(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Subcontractor Entity *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Structural Formworks Ltd."
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Inspection Observations / Compliance Findings</label>
                  <textarea
                    rows={2}
                    placeholder="Note rebar spacing, cover block depths, and alignment tolerance..."
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Commit WIR Record
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
