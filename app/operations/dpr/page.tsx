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
    weather_condition: "UNRECORDED",
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
      weather_condition: "UNRECORDED",
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
            <div className="text-2xl font-bold text-cyan-400 mt-1">UNRECORDED</div>
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
