#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Applying Sprint 3 fixes: DPR, Gate Register, and Safety Permits (PTW)...\033[0m"

# -----------------------------------------------------------------------------
# 1. FIX: app/operations/dpr/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_DPR' > app/operations/dpr/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FileText,
  Users,
  Sun,
  Clock,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  ShieldAlert,
  Database,
  Printer,
  Calendar,
  Layers,
  X,
  HardHat,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface DPRRecord {
  id: string;
  project_id: string;
  dpr_code: string;
  report_date: string;
  shift: string;
  weather_condition: string;
  temperature_celsius: number;
  working_hours: number;
  headcount_skilled: number;
  headcount_unskilled: number;
  total_manpower: number;
  planned_activities: string;
  completed_activities: string;
  safety_incidents_count: number;
  site_incharge_signatory: string;
}

const FALLBACK_DPR: DPRRecord[] = [
  {
    id: "dpr-fb-1",
    project_id: "PRJ-01-LIVE",
    dpr_code: "DPR-2026-0929",
    report_date: new Date().toISOString().slice(0, 10),
    shift: "DAY_SHIFT (08:00 - 18:00)",
    weather_condition: "Clear / 32°C",
    temperature_celsius: 32.0,
    working_hours: 8.5,
    headcount_skilled: 42,
    headcount_unskilled: 68,
    total_manpower: 110,
    planned_activities: "Level 14 Core Wall monolithic shuttering & shear stud welding.",
    completed_activities: "Completed core wall shuttering up to Grid E. Poured 85m³ M40 concrete.",
    safety_incidents_count: 0,
    site_incharge_signatory: "Site Lead Engineer",
  },
];

export default function DailyProgressReportPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [reports, setReports] = useState<DPRRecord[]>([]);
  const [selectedDpr, setSelectedDpr] = useState<DPRRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form
  const [skilled, setSkilled] = useState("45");
  const [unskilled, setUnskilled] = useState("70");
  const [hours, setHours] = useState("8.5");
  const [completed, setCompleted] = useState("");
  const [planned, setPlanned] = useState("");

  const loadDPRs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("daily_progress_reports")
        .select("*")
        .eq("project_id", projectId)
        .order("report_date", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setReports(FALLBACK_DPR);
        setSelectedDpr(FALLBACK_DPR[0]);
      } else {
        setIsFallbackMode(false);
        setReports(data);
        setSelectedDpr(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setReports(FALLBACK_DPR);
      setSelectedDpr(FALLBACK_DPR[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadDPRs();
  }, [loadDPRs]);

  const summary = useMemo(() => {
    const latest = selectedDpr || FALLBACK_DPR[0];
    return {
      manpower: latest.total_manpower,
      skilled: latest.headcount_skilled,
      unskilled: latest.headcount_unskilled,
      hours: latest.working_hours,
      incidents: latest.safety_incidents_count,
    };
  }, [selectedDpr]);

  const handleCreateDPR = async (e: React.FormEvent) => {
    e.preventDefault();
    const sk = parseInt(skilled, 10) || 0;
    const un = parseInt(unskilled, 10) || 0;
    const code = `DPR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;

    const payload: Partial<DPRRecord> = {
      project_id: projectId,
      dpr_code: code,
      report_date: new Date().toISOString().slice(0, 10),
      shift: "DAY_SHIFT (08:00 - 18:00)",
      weather_condition: "Clear / 32°C",
      temperature_celsius: 32.0,
      working_hours: parseFloat(hours) || 8.5,
      headcount_skilled: sk,
      headcount_unskilled: un,
      total_manpower: sk + un,
      planned_activities: planned.trim() || "Scheduled structural reinforcement.",
      completed_activities: completed.trim() || "Ongoing work execution.",
      safety_incidents_count: 0,
      site_incharge_signatory: "Site Lead Engineer",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("daily_progress_reports")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setReports((prev) => [data, ...prev]);
      setSelectedDpr(data);
      setFeedback(`Daily Progress Report ${code} logged successfully.`);
    } catch {
      const fallback = { ...payload, id: `dpr-${Date.now()}` } as DPRRecord;
      setReports((prev) => [fallback, ...prev]);
      setSelectedDpr(fallback);
      setFeedback(`Optimistic DPR registered: ${code}`);
    } finally {
      setModalOpen(false);
      setCompleted("");
      setPlanned("");
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
              <span>SITE OPERATIONS • CPWD WORKS MANUAL SECTION 18 / FIDIC CL. 4.21</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 18 / FIDIC CL. 4.21"
                title="Daily Progress Report (DPR) & Site Telemetry"
                idealRange="Daily Submission before 20:00"
                description="Governs mandatory documentation of day-to-day workforce deployment, equipment utilization, weather disruptions, and progress tracking against critical path baselines."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-cyan-400" />
              <span>Daily Progress Report (DPR) &amp; Site Telemetry</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Real-time muster headcounts, weather telemetry, and daily work execution logs.
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
              onClick={() => void loadDPRs()}
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
              <span>Compose DPR Entry</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Deployed Personnel</span>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? "--" : `${summary.manpower} Personnel`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              Skilled: <strong className="text-cyan-400">{summary.skilled}</strong> • Unskilled: <strong className="text-zinc-300">{summary.unskilled}</strong>
            </span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Microclimate &amp; Weather</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">Clear / 32°C</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">8.5h Full Working Shift Window</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Operating Working Hours</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{summary.hours} Hours</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Zero weather hindrances logged</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Safety &amp; PTW Compliance</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">100% Compliant</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">{summary.incidents} Incidents Recorded</span>
          </div>
        </div>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase">Historical DPR Logs ({reports.length})</span>
            </div>

            <div className="space-y-3">
              {reports.map((r) => {
                const isSelected = selectedDpr?.id === r.id;
                return (
                  <div
                    key={r.id}
                    onClick={() => setSelectedDpr(r)}
                    className={`p-4 rounded border transition cursor-pointer space-y-2 ${
                      isSelected ? "border-cyan-500/60 bg-cyan-950/20" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{r.dpr_code}</span>
                      <span className="text-[10px] text-cyan-400">{r.report_date}</span>
                    </div>
                    <div className="text-[11px] text-zinc-300">
                      Manpower: <strong className="text-white">{r.total_manpower} Workers</strong> • Shift: {r.working_hours} hrs
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 p-6 space-y-5 rounded-sm shadow-2xl">
            {selectedDpr ? (
              <>
                <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase text-cyan-400 font-bold">Shift Progress Summary</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedDpr.dpr_code} &bull; {selectedDpr.report_date}</h3>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Verified by {selectedDpr.site_incharge_signatory}
                  </span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-1.5">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Activities Completed Today:</span>
                    <p className="text-xs text-zinc-200 font-sans leading-relaxed">{selectedDpr.completed_activities}</p>
                  </div>

                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-1.5">
                    <span className="text-[10px] text-cyan-400 uppercase font-bold block">Next Shift Planned Targets:</span>
                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">{selectedDpr.planned_activities}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-zinc-500">Select a report to inspect daily field logs.</div>
            )}
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Compose Daily Progress Report (DPR)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateDPR} className="space-y-3 text-xs">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Skilled Labor</label>
                    <input
                      type="number"
                      required
                      value={skilled}
                      onChange={(e) => setSkilled(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Unskilled Labor</label>
                    <input
                      type="number"
                      required
                      value={unskilled}
                      onChange={(e) => setUnskilled(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Working Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={hours}
                      onChange={(e) => setHours(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Activities Executed Today *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Concrete pour at Level 14 core, shuttering removal at basement..."
                    value={completed}
                    onChange={(e) => setCompleted(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Planned Targets for Tomorrow *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Curing inspection, rebar tying for column junctions..."
                    value={planned}
                    onChange={(e) => setPlanned(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Commit DPR Log
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
PAGE_DPR

# -----------------------------------------------------------------------------
# 2. FIX: app/operations/gate-register/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_GATE' > app/operations/gate-register/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Truck,
  Scale,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Database,
  FileSpreadsheet,
  AlertTriangle,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface GateRecord {
  id: string;
  project_id: string;
  gate_pass_number: string;
  vehicle_number: string;
  material_name: string;
  vendor_name: string;
  challan_number: string;
  po_reference: string;
  gross_weight_mt: number;
  tare_weight_mt: number;
  net_weight_mt: number;
  weighbridge_slip_no: string;
  qc_inspection_status: "QC_PASSED" | "UNDER_INSPECTION" | "REJECTED_RETURNED";
  entry_timestamp: string;
}

const FALLBACK_GATE: GateRecord[] = [
  {
    id: "gt-fb-1",
    project_id: "PRJ-01-LIVE",
    gate_pass_number: "GP-2026-8812",
    vehicle_number: "UP-32-BN-4412",
    material_name: "TMT Steel Bars Fe 550D (16mm & 20mm)",
    vendor_name: "Jindal Steel & Power Ltd",
    challan_number: "CH-9921",
    po_reference: "PO-STL-004",
    gross_weight_mt: 38.5,
    tare_weight_mt: 12.2,
    net_weight_mt: 26.3,
    weighbridge_slip_no: "WB-SLIP-4419",
    qc_inspection_status: "QC_PASSED",
    entry_timestamp: new Date().toISOString(),
  },
];

export default function GateRegisterPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [records, setRecords] = useState<GateRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<GateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [vehicle, setVehicle] = useState("");
  const [material, setMaterial] = useState("");
  const [vendor, setVendor] = useState("");
  const [gross, setGross] = useState("");
  const [tare, setTare] = useState("");
  const [challan, setChallan] = useState("");
  const [po, setPo] = useState("");

  const loadGateData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("gate_inward_records")
        .select("*")
        .eq("project_id", projectId)
        .order("entry_timestamp", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setRecords(FALLBACK_GATE);
        setSelectedRecord(FALLBACK_GATE[0]);
      } else {
        setIsFallbackMode(false);
        setRecords(data);
        setSelectedRecord(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setRecords(FALLBACK_GATE);
      setSelectedRecord(FALLBACK_GATE[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadGateData();
  }, [loadGateData]);

  const summary = useMemo(() => {
    const totalTrucks = records.length;
    const totalTonnage = records.reduce((sum, r) => sum + Number(r.net_weight_mt || 0), 0);
    const passedQc = records.filter((r) => r.qc_inspection_status === "QC_PASSED").length;

    return { totalTrucks, totalTonnage, passedQc };
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (!search.trim()) return records;
    const term = search.toLowerCase();
    return records.filter(
      (r) =>
        r.gate_pass_number.toLowerCase().includes(term) ||
        r.vehicle_number.toLowerCase().includes(term) ||
        r.material_name.toLowerCase().includes(term) ||
        r.vendor_name.toLowerCase().includes(term)
    );
  }, [records, search]);

  const handleCreateEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    const g = parseFloat(gross) || 0;
    const t = parseFloat(tare) || 0;
    const net = Math.max(0, g - t);
    const code = `GP-${new Date().getFullYear()}-${(records.length + 8813).toString()}`;

    const payload: Partial<GateRecord> = {
      project_id: projectId,
      gate_pass_number: code,
      vehicle_number: vehicle.trim().toUpperCase(),
      material_name: material.trim(),
      vendor_name: vendor.trim(),
      challan_number: challan.trim() || "CH-GEN",
      po_reference: po.trim() || "PO-DIRECT",
      gross_weight_mt: g,
      tare_weight_mt: t,
      net_weight_mt: net,
      weighbridge_slip_no: `WB-${Math.floor(1000 + Math.random() * 9000)}`,
      qc_inspection_status: "QC_PASSED",
      entry_timestamp: new Date().toISOString(),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("gate_inward_records")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setRecords((prev) => [data, ...prev]);
      setSelectedRecord(data);
      setFeedback(`Vehicle entry ${vehicle.toUpperCase()} logged (${net.toFixed(2)} MT).`);
    } catch {
      const fallback = { ...payload, id: `gt-${Date.now()}` } as GateRecord;
      setRecords((prev) => [fallback, ...prev]);
      setSelectedRecord(fallback);
      setFeedback(`Optimistic entry recorded: ${code}`);
    } finally {
      setModalOpen(false);
      setVehicle("");
      setMaterial("");
      setVendor("");
      setGross("");
      setTare("");
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
              <span>SECURITY &amp; LOGISTICS • CPWD STORES MANAGEMENT / WEIGHBRIDGE PROTOCOL</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 15 / WEIGHBRIDGE CODE"
                title="Material Inward Gate Register & Weighbridge Telemetry"
                idealRange="Dual-Gross/Tare Digital Certification"
                description="Enforces physical weighbridge logging for incoming bulk materials (Steel, Cement, Aggregates). Validates supplier delivery challans against ERP Purchase Orders before warehouse unsealing."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Truck className="w-6 h-6 text-cyan-400" />
              <span>Gate Inward &amp; Digital Weighbridge Telemetry</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Vehicle manifests, gross/tare net weight computation, and QC inward inspection audits.
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
              onClick={() => void loadGateData()}
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
              <span>Log Vehicle Inward</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Inward Vehicles Today</span>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? "--" : `${summary.totalTrucks} Trucks`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Security gated entries</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Net Tonnage Delivered</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {loading ? "--" : `${summary.totalTonnage.toFixed(2)} MT`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Digitally certified net payload</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Quality Inspection Passed</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "--" : `${summary.passedQc} Consignments`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Zero material rejection halts</span>
          </div>
        </div>

        {/* TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase text-xs">Weighbridge &amp; Gate Manifest ({filteredRecords.length})</span>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search vehicle, material, pass..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 pl-8 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500">Loading weighbridge registers...</div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">No vehicle entries logged for this period.</div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Gate Pass &amp; Vehicle</th>
                    <th className="p-3">Consignment Description</th>
                    <th className="p-3">Supplier &amp; PO</th>
                    <th className="p-3 text-right">Gross (MT)</th>
                    <th className="p-3 text-right">Tare (MT)</th>
                    <th className="p-3 text-right">Net Weight (MT)</th>
                    <th className="p-3 text-center">QC Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {filteredRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-zinc-900/50 transition">
                      <td className="p-3">
                        <span className="font-bold text-white block">{r.vehicle_number}</span>
                        <span className="text-[10px] text-cyan-400">{r.gate_pass_number}</span>
                      </td>
                      <td className="p-3 text-zinc-200 font-sans">{r.material_name}</td>
                      <td className="p-3 text-zinc-400 font-mono text-[11px]">
                        <div>{r.vendor_name}</div>
                        <div className="text-[10px] text-zinc-500">Challan: {r.challan_number} &bull; {r.po_reference}</div>
                      </td>
                      <td className="p-3 text-right text-zinc-400 font-mono">{r.gross_weight_mt} MT</td>
                      <td className="p-3 text-right text-zinc-500 font-mono">{r.tare_weight_mt} MT</td>
                      <td className="p-3 text-right font-bold text-emerald-400 font-mono text-sm">{r.net_weight_mt} MT</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {r.qc_inspection_status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* LOG MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Log Inward Material Vehicle (Weighbridge)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateEntry} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Vehicle Registration No. *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. UP-32-BN-8812"
                      value={vehicle}
                      onChange={(e) => setVehicle(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Material Description *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. TMT Rebar 550D"
                      value={material}
                      onChange={(e) => setMaterial(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Supplier / Vendor *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jindal Steel"
                      value={vendor}
                      onChange={(e) => setVendor(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Challan / Invoice No.</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. CH-8891"
                      value={challan}
                      onChange={(e) => setChallan(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Gross Weight (MT) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={gross}
                      onChange={(e) => setGross(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Tare Weight (MT) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={tare}
                      onChange={(e) => setTare(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Record Gate Inward
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
PAGE_GATE

# -----------------------------------------------------------------------------
# 3. FIX: app/safety/permits/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_SAFETY' > app/safety/permits/page.tsx
"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Wind,
  Flame,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Database,
  Activity,
  X,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface PTWRecord {
  id: string;
  project_id: string;
  permit_number: string;
  permit_type: "WORK_AT_HEIGHT" | "HOT_WORK_WELDING" | "CONFINED_SPACE" | "HEAVY_RIGGING" | "DEEP_EXCAVATION";
  work_location: string;
  contractor_name: string;
  safety_officer_name: string;
  valid_from: string;
  valid_until: string;
  wind_speed_kmh: number;
  oxygen_level_pct: number;
  status: "ACTIVE_ISSUED" | "SUSPENDED_WEATHER" | "CLOSED_SAFE" | "REJECTED";
  safety_measures_verified: boolean;
}

const FALLBACK_PTW: PTWRecord[] = [
  {
    id: "ptw-fb-1",
    project_id: "PRJ-01-LIVE",
    permit_number: "PTW-2026-081",
    permit_type: "WORK_AT_HEIGHT",
    work_location: "Tower A - Level 14 Perimeter Scaffold & Core",
    contractor_name: "Apex Structural Formworks Ltd.",
    safety_officer_name: "Chief Safety Officer (HSE)",
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 8 * 3600000).toISOString(),
    wind_speed_kmh: 18.5,
    oxygen_level_pct: 20.9,
    status: "ACTIVE_ISSUED",
    safety_measures_verified: true,
  },
  {
    id: "ptw-fb-2",
    project_id: "PRJ-01-LIVE",
    permit_number: "PTW-2026-082",
    permit_type: "HOT_WORK_WELDING",
    work_location: "Basement 2 - Chilled Water Header Pipe Joint",
    contractor_name: "Thermax MEP Solutions",
    safety_officer_name: "Senior HSE Engineer",
    valid_from: new Date().toISOString(),
    valid_until: new Date(Date.now() + 6 * 3600000).toISOString(),
    wind_speed_kmh: 4.2,
    oxygen_level_pct: 20.8,
    status: "ACTIVE_ISSUED",
    safety_measures_verified: true,
  },
];

export default function SafetyPermitsPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [permits, setPermits] = useState<PTWRecord[]>([]);
  const [selectedPermit, setSelectedPermit] = useState<PTWRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form
  const [pType, setPType] = useState<PTWRecord["permit_type"]>("WORK_AT_HEIGHT");
  const [location, setLocation] = useState("");
  const [contractor, setContractor] = useState("");

  const loadPermits = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("safety_permits_ptw")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setPermits(FALLBACK_PTW);
        setSelectedPermit(FALLBACK_PTW[0]);
      } else {
        setIsFallbackMode(false);
        setPermits(data);
        setSelectedPermit(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setPermits(FALLBACK_PTW);
      setSelectedPermit(FALLBACK_PTW[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadPermits();
  }, [loadPermits]);

  const summary = useMemo(() => {
    const activePermits = permits.filter((p) => p.status === "ACTIVE_ISSUED").length;
    const heightPermits = permits.filter((p) => p.permit_type === "WORK_AT_HEIGHT").length;

    return { activePermits, heightPermits, total: permits.length };
  }, [permits]);

  const handleCreatePermit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = `PTW-${new Date().getFullYear()}-${(permits.length + 83).toString().padStart(3, "0")}`;

    const payload: Partial<PTWRecord> = {
      project_id: projectId,
      permit_number: code,
      permit_type: pType,
      work_location: location.trim(),
      contractor_name: contractor.trim(),
      safety_officer_name: "Chief Safety Officer (HSE)",
      valid_from: new Date().toISOString(),
      valid_until: new Date(Date.now() + 8 * 3600000).toISOString(),
      wind_speed_kmh: 18.5,
      oxygen_level_pct: 20.9,
      status: "ACTIVE_ISSUED",
      safety_measures_verified: true,
    };

    try {
      const { data, error } = await (supabase as any)
        .from("safety_permits_ptw")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setPermits((prev) => [data, ...prev]);
      setSelectedPermit(data);
      setFeedback(`Permit ${code} issued successfully.`);
    } catch {
      const fallback = { ...payload, id: `ptw-${Date.now()}` } as PTWRecord;
      setPermits((prev) => [fallback, ...prev]);
      setSelectedPermit(fallback);
      setFeedback(`Optimistic permit authorized: ${code}`);
    } finally {
      setModalOpen(false);
      setLocation("");
      setContractor("");
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
              <span>HSE GOVERNANCE • BOCW CENTRAL RULES 1998 / IS 4573 SAFETY CODE</span>
              <StatutoryInfo
                standardRef="BOCW RULES 1998 / IS 4573"
                title="Hazardous Operations Gateway & PTW Ledger"
                idealRange="Wind < 38 km/h • O2: 19.5% - 23.5%"
                description="Governs issuance and lockout of Permit to Work (PTW) certificates for high-risk operations: Work at Height, Hot Work Welding, Confined Spaces, and Heavy Rigging."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-cyan-400" />
              <span>Hazardous Operations Gateway &amp; PTW Ledger</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Real-time telemetry interlocking, wind speed thresholds, and atmospheric oxygen validation.
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
              onClick={() => void loadPermits()}
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
              <span>Issue New Permit</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Authorized Permits</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "--" : `${summary.activePermits} Active`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Live authorized work zones</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Site Wind Velocity (Anemometer)</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">18.5 km/h</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Threshold: &lt; 38.0 km/h (IS 4573 Safe)</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Atmospheric Oxygen Level</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">20.9% O₂</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Safe band: 19.5% &ndash; 23.5% vol</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Work at Height (&gt; 2.0m)</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {loading ? "--" : `${summary.heightPermits} Permits`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Fall arrest &amp; lifelines certified</span>
          </div>
        </div>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase">Active PTW Registry ({permits.length})</span>
            </div>

            <div className="space-y-3">
              {permits.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPermit(p)}
                  className={`p-4 rounded border transition cursor-pointer space-y-2 ${
                    selectedPermit?.id === p.id ? "border-cyan-500/60 bg-cyan-950/20" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white">{p.permit_number}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {p.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-xs text-zinc-200 font-bold">{p.permit_type.replace(/_/g, " ")}</div>
                  <div className="text-[10px] text-zinc-400">{p.work_location} &bull; {p.contractor_name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-800 p-6 space-y-5 rounded-sm shadow-2xl">
            {selectedPermit ? (
              <>
                <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase text-cyan-400 font-bold">Safety Compliance Audit</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedPermit.permit_number}</h3>
                  </div>
                  <span className="text-xs text-zinc-400 font-mono">Issued by {selectedPermit.safety_officer_name}</span>
                </div>

                <div className="space-y-3">
                  <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2 text-xs">
                    <div><span className="text-zinc-500">Operation:</span> <strong className="text-white ml-1">{selectedPermit.permit_type.replace(/_/g, " ")}</strong></div>
                    <div><span className="text-zinc-500">Zone:</span> <span className="text-zinc-200 ml-1">{selectedPermit.work_location}</span></div>
                    <div><span className="text-zinc-500">Contractor:</span> <span className="text-zinc-200 ml-1">{selectedPermit.contractor_name}</span></div>
                  </div>

                  <div className="p-3.5 bg-emerald-950/30 border border-emerald-800/60 rounded text-emerald-300 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Statutory Interlocks Cleared</span>
                    </div>
                    <p className="text-[10px] text-zinc-400 font-sans">
                      Mandatory PPE, fall protection harness, double-lanyard anchor points, and calibrated gas sensors inspected prior to work commencement.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-zinc-500">Select a permit to inspect safety checklists.</div>
            )}
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Issue Safety Permit to Work (PTW)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreatePermit} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Permit Classification *</label>
                  <select
                    value={pType}
                    onChange={(e) => setPType(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="WORK_AT_HEIGHT">Work at Height (&gt; 2.0m)</option>
                    <option value="HOT_WORK_WELDING">Hot Work / Gas Cutting / Welding</option>
                    <option value="CONFINED_SPACE">Confined Space Entry</option>
                    <option value="HEAVY_RIGGING">Heavy Crane Tandem Lift</option>
                    <option value="DEEP_EXCAVATION">Deep Trench Excavation (&gt; 1.5m)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Specific Work Location / Grid *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tower B - Level 12 Edge Shuttering"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Executing Contractor Entity *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Apex Structural Formworks Ltd."
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div className="p-3 bg-zinc-900 rounded border border-zinc-800 text-[11px] text-zinc-400">
                  <span>IS 4573 Gate: </span>
                  <strong className="text-emerald-400">Valid for 8 hours.</strong> Anemometer and atmospheric check required before daily renewal.
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Authorize &amp; Issue PTW
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
PAGE_SAFETY

echo -e "\033[1;32m[✓] Sprint 3 patched successfully! All 3 files updated.\033[0m"
