import React from "react";
import { BBSClientManager } from "@/components/engineering/BBSClientManager";
import { createClient } from "@/lib/supabase/server";
import { Layers } from "lucide-react";

export default async function BBSManagementPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real bar bending schedules from database
  const { data: schedules } = await supabase
    .from("bar_bending_schedules")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
          <Layers className="w-3.5 h-3.5" />
          <span>IS:2502 &amp; IS:1786 REBAR COMPLIANCE • {projectId}</span>
        </div>
        <h1 className="text-xl font-bold text-white uppercase mt-0.5">
          Bar Bending Schedule (BBS) &amp; 12m Billet Nesting Engine
        </h1>
        <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
          {projectName} • Bend deductions (45° = 1d, 90° = 2d) and off-cut scrap minimization.
        </p>
      </header>

      {/* 3 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Optimal Scrap Ceiling</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1 tabular-nums">≤ 3.0%</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Target nesting efficiency per 12m stock billet</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Standard Formula</span>
          <div className="text-lg font-bold text-white mt-1">d² / 162.2 kg/m</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">IS:1786 unit weight derivation</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active Rebar Grade</span>
          <div className="text-lg font-bold text-cyan-400 mt-1">Fe 500D TMT</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">High-ductility earthquake resistance standard</span>
        </div>
      </div>

      <BBSClientManager projectId={projectId} initialSchedules={schedules || []} />
    </div>
  );
}
