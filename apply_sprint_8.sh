#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Applying Sprint 8 fixes: Material Gate Passes, Quality Inspections (WIR), and Field Punch Lists...\033[0m"

# -----------------------------------------------------------------------------
# 1. FIX: app/procurement/gate-pass/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_GATE_PASS' > app/procurement/gate-pass/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Truck,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  ArrowRight,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface GatePassRecord {
  id: string;
  project_id: string;
  pass_number: string;
  pass_type: "RETURNABLE_RGP" | "NON_RETURNABLE_NRGP";
  dispatch_date: string;
  destination: string;
  recipient_entity: string;
  carrier_vehicle_no: string;
  item_description: string;
  quantity_dispatched: number;
  unit: string;
  expected_return_date?: string | null;
  status: "DISPATCHED_ACTIVE" | "RETURNED_CLOSED" | "OVERDUE";
}

const FALLBACK_PASSES: GatePassRecord[] = [
  {
    id: "gp-fb-1",
    project_id: "PRJ-01-LIVE",
    pass_number: "GP-RGP-2026-001",
    pass_type: "RETURNABLE_RGP",
    dispatch_date: new Date().toISOString().slice(0, 10),
    destination: "OEM Central Workshop Okhla",
    recipient_entity: "Potain Crane Services",
    carrier_vehicle_no: "UP-32-DN-9912",
    item_description: "Tower Crane Hoist Motor Assembly for Diagnostic Calibration",
    quantity_dispatched: 1,
    unit: "Set",
    expected_return_date: "2026-10-15",
    status: "DISPATCHED_ACTIVE",
  },
];

export default function ProcurementGatePassPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [passes, setPasses] = useState<GatePassRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [pType, setPType] = useState<GatePassRecord["pass_type"]>("RETURNABLE_RGP");
  const [desc, setDesc] = useState("");
  const [recipient, setRecipient] = useState("");
  const [vehicle, setVehicle] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("Nos");

  const loadPasses = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("procurement_gate_passes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setPasses(FALLBACK_PASSES);
      } else {
        setIsFallbackMode(false);
        setPasses(data);
      }
    } catch {
      setIsFallbackMode(true);
      setPasses(FALLBACK_PASSES);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadPasses();
  }, [loadPasses]);

  const summary = useMemo(() => {
    const total = passes.length;
    const rgpActive = passes.filter((p) => p.pass_type === "RETURNABLE_RGP" && p.status === "DISPATCHED_ACTIVE").length;
    return { total, rgpActive };
  }, [passes]);

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim() || !recipient.trim()) return;

    const code = `GP-${pType === "RETURNABLE_RGP" ? "RGP" : "NRGP"}-${new Date().getFullYear()}-${(passes.length + 1).toString().padStart(3, "0")}`;
    const payload: Partial<GatePassRecord> = {
      project_id: projectId,
      pass_number: code,
      pass_type: pType,
      dispatch_date: new Date().toISOString().slice(0, 10),
      destination: "Vendor Repair Facility",
      recipient_entity: recipient.trim(),
      carrier_vehicle_no: vehicle.trim().toUpperCase() || "SITE-DISPATCH",
      item_description: desc.trim(),
      quantity_dispatched: parseFloat(qty) || 1,
      unit: unit.trim(),
      expected_return_date: pType === "RETURNABLE_RGP" ? "2026-10-30" : null,
      status: "DISPATCHED_ACTIVE",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("procurement_gate_passes")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setPasses((prev) => [data, ...prev]);
      setFeedback(`Gate Pass ${code} registered successfully.`);
    } catch {
      const fallback = { ...payload, id: `gp-${Date.now()}` } as GatePassRecord;
      setPasses((prev) => [fallback, ...prev]);
      setFeedback(`Optimistic Gate Pass created: ${code}`);
    } finally {
      setModalOpen(false);
      setDesc("");
      setRecipient("");
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
              <span>SUPPLY CHAIN &amp; LOGISTICS • CPWD WORKS MANUAL SECTION 15</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 15 / RGP MANDATE"
                title="Material Gate Pass & Returnable Asset Clearance"
                idealRange="Dual Verification Before Gate Exit"
                description="Governs outward dispatch of machinery parts, scaffolding rentals, and tooling. Enforces mandatory tracking and return dates for Returnable Gate Passes (RGP)."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-cyan-400" />
              <span>Procurement Gate Pass &amp; Material Dispatch Ledger</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Outward material passes, RGP return reconciliation, and security verification.
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
              onClick={() => void loadPasses()}
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
              <span>Issue Gate Pass</span>
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
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Dispatches Logged</span>
            <div className="text-2xl font-bold text-white mt-1">{passes.length} Passes</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Active outbound material log</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Returnable Passes (RGP)</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{summary.rgpActive} Items Outstanding</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Awaiting return to site store</span>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
            Gate Pass Dispatch Roster ({passes.length})
          </span>

          <div className="overflow-x-auto border border-zinc-800 text-xs">
            <table className="w-full text-left">
              <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                <tr>
                  <th className="p-3">Gate Pass Ref</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3">Recipient &amp; Vehicle</th>
                  <th className="p-3 text-right">Quantity</th>
                  <th className="p-3">Expected Return</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                {passes.map((p) => (
                  <tr key={p.id} className="hover:bg-zinc-900/50 transition">
                    <td className="p-3 font-bold text-white">
                      <span>{p.pass_number}</span>
                      <span className="text-[10px] text-cyan-400 block">{p.pass_type.replace(/_/g, " ")}</span>
                    </td>
                    <td className="p-3 text-zinc-200 font-sans">{p.item_description}</td>
                    <td className="p-3 text-zinc-400">
                      <div>{p.recipient_entity}</div>
                      <div className="text-[10px] text-zinc-500 font-mono">{p.carrier_vehicle_no}</div>
                    </td>
                    <td className="p-3 text-right font-bold text-white font-mono">{p.quantity_dispatched} {p.unit}</td>
                    <td className="p-3 font-mono text-zinc-300">{p.expected_return_date || "N/A (Non-Returnable)"}</td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-cyan-950 text-cyan-400 border border-cyan-800">
                        {p.status.replace(/_/g, " ")}
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
                <span className="font-bold text-white uppercase text-xs">Issue Material Gate Pass (Form 15)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreatePass} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Pass Category</label>
                    <select
                      value={pType}
                      onChange={(e) => setPType(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                    >
                      <option value="RETURNABLE_RGP">Returnable Gate Pass (RGP)</option>
                      <option value="NON_RETURNABLE_NRGP">Non-Returnable Gate Pass (NRGP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Carrier Vehicle No.</label>
                    <input
                      type="text"
                      placeholder="e.g. UP-32-BN-8812"
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white uppercase"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Recipient Vendor / Facility *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Potain Crane Service Workshop"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Dispatched Item Description *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe tools, components, or serial numbers..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Quantity</label>
                    <input
                      type="number"
                      value={qty}
                      onChange={(e) => setQty(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Unit</label>
                    <input
                      type="text"
                      value={unit}
                      onChange={(e) => setUnit(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Authorize Gate Pass
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
PAGE_GATE_PASS

# -----------------------------------------------------------------------------
# 2. FIX: app/quality/inspections/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_QUALITY_INSPECTIONS' > app/quality/inspections/page.tsx
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
PAGE_QUALITY_INSPECTIONS

# -----------------------------------------------------------------------------
# 3. FIX: app/punchlist/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_PUNCHLIST' > app/punchlist/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface PunchItem {
  id: string;
  project_id: string;
  item_code: string;
  location_grid: string;
  trade_package: string;
  contractor_name: string;
  defect_description: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  status: "OPEN_PENDING" | "RECTIFIED_AWAITING_QC" | "CLOSED_VERIFIED";
  target_rectification_date: string;
}

const FALLBACK_PUNCH: PunchItem[] = [
  {
    id: "pch-fb-1",
    project_id: "PRJ-01-LIVE",
    item_code: "PCH-2026-104",
    location_grid: "Level 12 - Corridor East",
    trade_package: "Civil & Superstructure",
    contractor_name: "Apex Structural Formworks Ltd.",
    defect_description: "Surface honeycombing on column C-12 face requiring polymer-modified mortar repair.",
    severity: "MAJOR",
    status: "OPEN_PENDING",
    target_rectification_date: "2026-10-07",
  },
  {
    id: "pch-fb-2",
    project_id: "PRJ-01-LIVE",
    item_code: "PCH-2026-105",
    location_grid: "Basement 1 - Pump Room B",
    trade_package: "MEP / HVAC",
    contractor_name: "Thermax MEP Solutions",
    defect_description: "Missing vibration isolation pads under secondary chilled water booster pump.",
    severity: "CRITICAL",
    status: "RECTIFIED_AWAITING_QC",
    target_rectification_date: "2026-10-03",
  },
];

export default function FieldPunchListPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [items, setItems] = useState<PunchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [location, setLocation] = useState("");
  const [trade, setTrade] = useState("Civil & Superstructure");
  const [contractor, setContractor] = useState("");
  const [severity, setSeverity] = useState<PunchItem["severity"]>("MAJOR");
  const [desc, setDesc] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("field_punch_list_items")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setItems(FALLBACK_PUNCH);
      } else {
        setIsFallbackMode(false);
        setItems(data);
      }
    } catch {
      setIsFallbackMode(true);
      setItems(FALLBACK_PUNCH);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const summary = useMemo(() => {
    const total = items.length;
    const open = items.filter((i) => i.status === "OPEN_PENDING").length;
    const critical = items.filter((i) => i.severity === "CRITICAL" && i.status !== "CLOSED_VERIFIED").length;
    return { total, open, critical };
  }, [items]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || !desc.trim()) return;

    const code = `PCH-${new Date().getFullYear()}-${(items.length + 106).toString()}`;
    const payload: Partial<PunchItem> = {
      project_id: projectId,
      item_code: code,
      location_grid: location.trim(),
      trade_package: trade,
      contractor_name: contractor.trim() || "Executing Contractor",
      defect_description: desc.trim(),
      severity,
      status: "OPEN_PENDING",
      target_rectification_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("field_punch_list_items")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setItems((prev) => [data, ...prev]);
      setFeedback(`Punch item ${code} tagged.`);
    } catch {
      const fallback = { ...payload, id: `pch-${Date.now()}` } as PunchItem;
      setItems((prev) => [fallback, ...prev]);
      setFeedback(`Optimistic punch item logged: ${code}`);
    } finally {
      setModalOpen(false);
      setLocation("");
      setDesc("");
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleCloseItem = async (id: string) => {
    try {
      await (supabase as any)
        .from("field_punch_list_items")
        .update({ status: "CLOSED_VERIFIED" })
        .eq("id", id);
    } catch {
      // optimistic
    }

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "CLOSED_VERIFIED" } : i))
    );
    setFeedback("Defect verified and marked closed.");
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>FIELD QUALITY CONTROL • DEFECT LOGGING &amp; RECTIFICATION SLA</span>
              <StatutoryInfo
                standardRef="CPWD MANUAL SECTION 20 / ISO 9001"
                title="Field Punch List & Remediation Tracking"
                idealRange="Critical Defects SLA: < 48 Hours"
                description="Field snagging ledger for logging concrete honeycombing, joint misalignments, MEP clashes, and finishing defects directly to subcontractors."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-cyan-400" />
              <span>Field Punch List &amp; Defect Registry</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Real-time defect tagging, severity tracking, and contractor rectification gates.
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
              onClick={() => void loadItems()}
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
              <span>Tag Punch Item</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 3 SUMMARY TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Punch Items</span>
            <div className="text-2xl font-bold text-white mt-1">{items.length} Defects</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Documented across site trades</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Pending Remediation</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{summary.open} Open</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Awaiting contractor work</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Critical Defects</span>
            <div className={`text-2xl font-bold mt-1 ${summary.critical > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {summary.critical} Urgent
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Mandatory 48-hour resolution SLA</span>
          </div>
        </div>

        {/* LIST */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
            Field Snag Log ({items.length})
          </span>

          <div className="divide-y divide-zinc-800/60">
            {items.map((i) => {
              const isClosed = i.status === "CLOSED_VERIFIED";
              return (
                <div key={i.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{i.item_code}</span>
                      <span className="text-cyan-400 text-xs font-bold">&bull; {i.location_grid}</span>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase border ${
                        i.severity === "CRITICAL"
                          ? "bg-rose-950 text-rose-400 border-rose-800"
                          : "bg-amber-950 text-amber-400 border-amber-800"
                      }`}>
                        {i.severity}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 font-sans leading-relaxed">{i.defect_description}</p>
                    <div className="text-[10px] text-zinc-500">
                      Contractor: <strong className="text-zinc-400">{i.contractor_name}</strong> &bull; Target: {i.target_rectification_date}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      isClosed
                        ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                        : "bg-amber-950 text-amber-400 border-amber-800"
                    }`}>
                      {i.status.replace(/_/g, " ")}
                    </span>

                    {!isClosed && (
                      <button
                        type="button"
                        onClick={() => handleCloseItem(i.id)}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase rounded transition"
                      >
                        Verify &amp; Close
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Tag Field Punch List Defect</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Grid Coordinate / Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Level 14 - Column Junction D4"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Trade Package</label>
                    <select
                      value={trade}
                      onChange={(e) => setTrade(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                    >
                      <option value="Civil & Superstructure">Civil &amp; Superstructure</option>
                      <option value="MEP / HVAC">MEP / HVAC</option>
                      <option value="Finishes & Fitouts">Finishes &amp; Fitouts</option>
                      <option value="Waterproofing">Waterproofing</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                    >
                      <option value="CRITICAL">Critical (Blocks Pour / Safety)</option>
                      <option value="MAJOR">Major (Fix within 7 days)</option>
                      <option value="MINOR">Minor (Cosmetic Blemish)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Assigned Subcontractor</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Structural Formworks Ltd."
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Defect Description *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Detail the non-conformance and required corrective action..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Commit Defect Ticket
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
PAGE_PUNCHLIST

echo -e "\033[1;32m[✓] Sprint 8 patched successfully! All 3 files updated.\033[0m"
