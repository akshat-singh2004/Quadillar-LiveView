import React from "react";
import { fetchDailyGovernanceDossiers } from "@/app/actions/dpr-actions";
import { CompileDprModal } from "@/components/governance/CompileDprModal";
import { createClient } from "@/lib/supabase/server";
import { BookOpen, ShieldCheck, Users, Box, Wrench, Clock, FileCheck, Layers } from "lucide-react";

export default async function DailyDprPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  const dossiers = await fetchDailyGovernanceDossiers(projectId);

  const totalShifts = dossiers.length;
  const totalVolume = dossiers.reduce((s, d) => s + Number(d.concrete_volume_placed_m3), 0);
  const totalOperatives = dossiers.reduce((s, d) => s + Number(d.total_workers_punched), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            <span>STATUTORY PROGRESS &amp; SITE LOGS • CPWD CL. 32 / FIDIC CL. 4.21 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Daily Progress Reports (DPR) &amp; Shift Dossiers
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Contemporaneous shift synthesis across quality, workforce, fleet, and safety with Section 65B notarization.
          </p>
        </div>

        <CompileDprModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Compiled Dossiers</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{totalShifts} Shifts</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Tamper-evident logs</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Concrete Placed</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">{totalVolume.toFixed(1)} m³</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Pre-pour verified pours</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Cumulative Worker Shifts</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">{totalOperatives} Ingresses</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Biometric turnstile punches</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Evidence Standard</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">Sec. 65B Certified</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Admissible in arbitral court</span>
        </div>
      </div>

      {/* DPR DOSSIERS REGISTER */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Shift Governance Dossier Register ({dossiers.length})
          </span>
          <span className="text-[10px] text-zinc-500">Contemporaneous Site Ledger</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {dossiers.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero daily dossiers compiled. Click &quot;+ Compile Shift DPR Dossier&quot; to synthesize today&apos;s shift records.
            </div>
          ) : (
            dossiers.map((dossier) => (
              <div key={dossier.id} className="p-4 space-y-2 hover:bg-zinc-850/50 transition">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                      {dossier.dossier_code}
                    </span>
                    <strong className="text-white text-xs">{dossier.dpr_date}</strong>
                    <span className="text-zinc-500 text-[11px]">({dossier.weather_summary})</span>
                  </div>

                  <span className="px-2.5 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[9px] font-bold uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>Hermes Notarized</span>
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 font-sans leading-relaxed">
                  {dossier.summary_narrative}
                </p>

                <div className="flex flex-wrap justify-between items-center text-[10px] text-zinc-400 font-mono border-t border-zinc-800/80 pt-2 gap-y-1">
                  <span>Operatives: <strong className="text-cyan-300">{dossier.total_workers_punched}</strong></span>
                  <span>Concrete Placed: <strong className="text-emerald-300">{dossier.concrete_volume_placed_m3} m³</strong></span>
                  <span>Cubes: <strong className="text-zinc-200">{dossier.cubes_tested_count}</strong></span>
                  <span>Fleet Hours: <strong className="text-zinc-200">{dossier.equipment_operating_hours}h ({dossier.fleet_oee_avg_pct}% OEE)</strong></span>
                  <span>Certified By: <strong className="text-zinc-200">{dossier.compiled_by}</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
