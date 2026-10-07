import React from "react";
import { fetchCpmActivities } from "@/app/actions/schedule-actions";
import { ChronosCpmGanttViewer } from "@/components/schedule/ChronosCpmGanttViewer";
import { createClient } from "@/lib/supabase/server";
import { Calendar, Clock, AlertTriangle, ShieldCheck, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ScheduleGanttPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  const activities = await fetchCpmActivities(projectId);
  const criticalCount = activities.filter((a) => a.is_critical_path).length;
  const delayedCount = activities.filter((a) => a.delay_variance_days > 0).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Calendar className="w-3.5 h-3.5" />
            <span>4D SCHEDULE FORENSICS • SCL DELAY PROTOCOL / CPM NETWORK • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Chronos 4D Critical Path Schedule &amp; Time Impact Analysis Radar
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Contemporaneous Time Impact Analysis (TIA), total float consumption audits, and FIDIC Cl. 20.1 time-bar tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/commercial/cure-notices"
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase text-[10px] transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Cure Notices</span>
          </Link>
        </div>
      </header>

      {/* 4 SCHEDULE KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total WBS Activities</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{activities.length} Network Nodes</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Q4 Baseline Target</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Critical Path Activities</span>
          <div className="text-xl font-bold text-rose-400 mt-1 tabular-nums">{criticalCount} Zero-Float Nodes</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Float &le; 0d threshold</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Hindered Variances</span>
          <div className="text-xl font-bold text-amber-400 mt-1 tabular-nums">{delayedCount} Variances</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Covered by SCL TIA</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Statutory Defense</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">100% Notarized</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Section 65B certified</span>
        </div>
      </div>

      {/* INTERACTIVE GANTT VIEWER */}
      <ChronosCpmGanttViewer activities={activities} projectId={projectId} />
    </div>
  );
}
