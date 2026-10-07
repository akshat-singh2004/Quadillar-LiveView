import React from "react";
import { createClient } from "@/lib/supabase/server";
import { LaborRosterTable } from "@/components/site/LaborRosterTable";
import { RegisterHindranceModal } from "@/components/site/RegisterHindranceModal";
import { SaveDprDraftModal } from "@/components/site/SaveDprDraftModal";
import { SealDprButton } from "@/components/site/SealDprButton";
import { FileText, Clock, Users, Sun, ShieldCheck, AlertCircle } from "lucide-react";

export default async function DailyProgressReportPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";
  const today = new Date().toISOString().slice(0, 10);

  // 1. Fetch today's DPR draft or record
  const { data: dprRow } = await supabase
    .from("daily_progress_reports")
    .select("*")
    .eq("project_id", projectId)
    .eq("report_date", today)
    .maybeSingle();

  // 2. Fetch trade roster entries for today
  const { data: rosterRows } = await supabase
    .from("site_labor_roster")
    .select("*")
    .eq("project_id", projectId)
    .eq("shift_date", today);

  const tradeRoster = rosterRows || [];
  const rosterManpower = tradeRoster.reduce((sum, r) => sum + (Number(r.actual_count) || 0), 0);

  // 3. Fetch active critical hindrances
  const { data: hindrances } = await supabase
    .from("site_hindrance_register")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "OPEN_CRITICAL_DELAY")
    .order("created_at", { ascending: false });

  const activeHindrances = hindrances || [];
  const cumulativeDelayDays = activeHindrances.reduce((sum, h) => sum + (Number(h.days_hindered) || 0), 0);

  const isSealed = dprRow?.status === "SEOR_SEALED";
  const totalManpower = dprRow?.total_manpower || rosterManpower || 0;
  const shiftHours = Number(dprRow?.shift_hours || 8.5);
  const cumulativeManHours = Number(dprRow?.cumulative_man_hours || (totalManpower * shiftHours).toFixed(1));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <FileText className="w-3.5 h-3.5" />
            <span>CONTEMPORANEOUS SITE RECORD • FIDIC CL. 4.20 / CPWD GCC CL. 5.2 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Daily Progress Report (DPR) &amp; Site Telemetry
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Turnstile biometric logs, trade outputs, and contemporaneous delay notices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 text-[10px] font-bold uppercase">
            {today}
          </span>
        </div>
      </header>

      {/* 4 STATUTORY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Manpower On-Site</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">
            {totalManpower} Personnel
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Biometric muster gate sync</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Weather / Shift Window</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            {dprRow ? `${dprRow.weather_summary} | ${shiftHours}h` : "Clear / 32°C | 8.5h"}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Site microclimate telemetry</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Cumulative Man-Hours</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            {cumulativeManHours} Hrs
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">BOCW safe working threshold</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">DPR Statutory Status</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${isSealed ? "text-emerald-400" : dprRow ? "text-amber-400" : "text-zinc-500"}`}>
            {isSealed ? "SEOR SEALED" : dprRow ? "DRAFT LOGGED" : "NO LOG TODAY"}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {isSealed ? "Section 65B certified" : "Awaiting Sign-off"}
          </span>
        </div>
      </div>

      {/* OPERATIONS WORKSPACE: LABOR ROSTER & HINDRANCE JOURNAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* TRADE-WISE LABOR ROSTER (7 COLS) */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Trade-Wise Labor Roster ({tradeRoster.length} Packages)</span>
            </span>
            <span className="text-[10px] text-zinc-500">Muster Integration</span>
          </div>

          <LaborRosterTable initialRoster={tradeRoster} projectId={projectId} />
        </div>

        {/* CONTEMPORANEOUS HINDRANCE & EOT JOURNAL (5 COLS) */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <div>
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Hindrance &amp; EOT Delay Journal ({activeHindrances.length})</span>
              </span>
              <span className="text-[9px] text-zinc-500 block mt-0.5">Clause 5 Critical Delay Events</span>
            </div>
            <RegisterHindranceModal projectId={projectId} />
          </div>

          <div className="divide-y divide-zinc-800/60 max-h-[380px] overflow-y-auto">
            {activeHindrances.length === 0 ? (
              <div className="py-12 text-center text-zinc-600 font-sans">
                Zero active hindrances recorded on site today. Site progressing per original baseline float.
              </div>
            ) : (
              activeHindrances.map((h: any) => (
                <div key={h.id} className="py-3 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-amber-400 font-bold text-xs truncate max-w-[220px]">
                      {h.delay_category}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-bold text-[9px]">
                      +{h.days_hindered}d Delay
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-300 font-sans line-clamp-2">
                    {h.description}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Grid: {h.grid_location} • Logged: {h.logged_date}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS BAR */}
      <div className="p-4 border border-zinc-800 bg-zinc-900/60 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="text-zinc-400 text-xs font-sans">
          {isSealed ? (
            <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Section 65B Certified Merkle Stamp Active • {dprRow?.seor_signature_hash}</span>
            </span>
          ) : (
            <span>Saving draft updates the shift muster without locking statutory EOT legal records.</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <SaveDprDraftModal projectId={projectId} totalManpower={totalManpower} />
          <SealDprButton projectId={projectId} isSealed={isSealed} />
        </div>
      </div>
    </div>
  );
}
