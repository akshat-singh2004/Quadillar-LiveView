import React from "react";
import { ReconcileMaterialModal } from "@/components/materials/ReconcileMaterialModal";
import { OptimizeBbsModal } from "@/components/materials/OptimizeBbsModal";
import { createClient } from "@/lib/supabase/server";
import { Box, Layers, Scissors, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

export default async function MaterialReconciliationPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch material reconciliations & cutting schedules
  const [reconcileRes, bbsRes] = await Promise.all([
    supabase.from("material_reconciliation_records").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("rebar_cutting_schedules").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);

  const reconciliations = reconcileRes.data || [];
  const bbsSchedules = bbsRes.data || [];

  const totalPenalDebitInr = reconciliations.reduce((s, r) => s + (Number(r.penal_recovery_inr) || 0), 0);
  const breachedCount = reconciliations.filter((r) => r.status === "PENAL_RECOVERY_DEBITED").length;
  const compliantBbsCount = bbsSchedules.filter((b) => b.is_compliant).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-amber-400 uppercase tracking-widest font-bold">
            <Box className="w-3.5 h-3.5" />
            <span>MATERIALS &amp; METALLURGY GOVERNANCE • CPWD GCC CL. 42 / IS 2502 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Material Reconciliation &amp; 1D Rebar Nesting
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Clause 42 penal recoveries, 1D billet cutting-stock optimization, and Section 65B notarized material manifests[cite: 1].
          </p>
        </div>

        <div className="flex items-center gap-2">
          <OptimizeBbsModal projectId={projectId} />
          <ReconcileMaterialModal projectId={projectId} />
        </div>
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Audits Committed</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{reconciliations.length} Records</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Theoretical vs Inward</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Clause 42 Penal Debits</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${totalPenalDebitInr > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            ₹{(totalPenalDebitInr / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Assessed at 2x stipulated rate[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">BBS Optimizations</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">{bbsSchedules.length} Schedules</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{compliantBbsCount} compliant with &le; 3% scrap[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Tolerance Ceiling Breaches</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${breachedCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {breachedCount} Breaches
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {breachedCount > 0 ? "Excess wastage debited to IPC" : "100% within statutory limit"}
          </span>
        </div>
      </div>

      {/* DUAL PANELS: CLAUSE 42 AUDITS & BBS SCHEDULES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: CLAUSE 42 RECONCILIATIONS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              CPWD Clause 42 Material Register ({reconciliations.length})
            </span>
            <span className="text-[10px] text-zinc-500">2x Rate Penal Audit[cite: 1]</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {reconciliations.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero reconciliations logged. Click &quot;+ Run Cl. 42 Reconciliation&quot; to audit consumed materials.
              </div>
            ) : (
              reconciliations.map((rec: any) => {
                const hasExcess = Number(rec.excess_consumption_qty) > 0;
                return (
                  <div key={rec.id} className="p-4 space-y-1.5 hover:bg-zinc-850/50 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-bold text-[10px]">
                          {rec.reconciliation_code}
                        </span>
                        <strong className="text-white text-xs">{rec.material_type}</strong>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        hasExcess ? "bg-rose-950 border border-rose-800 text-rose-300" : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                      }`}>
                        {hasExcess ? `+${rec.excess_consumption_qty} MT Excess` : "Within Ceiling"}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 font-sans">
                      {rec.structural_element}
                    </div>

                    <div className="flex justify-between text-[10px] text-zinc-400 border-t border-zinc-800/80 pt-1.5 font-mono">
                      <span>Theo: <strong className="text-zinc-200">{rec.theoretical_qty} MT</strong></span>
                      <span>Actual: <strong className="text-zinc-200">{rec.actual_consumed_qty} MT</strong></span>
                      <span>Penal: <strong className={hasExcess ? "text-rose-400" : "text-emerald-400"}>
                        ₹{Number(rec.penal_recovery_inr).toLocaleString("en-IN")}
                      </strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: REBAR BBS NESTING SCHEDULES */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Optimized BBS Cutting Schedules ({bbsSchedules.length})
            </span>
            <span className="text-[10px] text-zinc-500">IS 2502 12m Billet Nesting[cite: 1]</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {bbsSchedules.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero BBS schedules optimized. Click &quot;+ Optimize Rebar BBS&quot; to nest cut lengths against 12m stock.
              </div>
            ) : (
              bbsSchedules.map((bbs: any) => (
                <div key={bbs.id} className="p-4 space-y-1.5 hover:bg-zinc-850/50 transition">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-[10px]">
                        {bbs.schedule_code}
                      </span>
                      <strong className="text-white text-xs">{bbs.bar_diameter_mm} mm TMT</strong>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      bbs.is_compliant ? "bg-emerald-950 border border-emerald-800 text-emerald-300" : "bg-amber-950 border border-amber-800 text-amber-300"
                    }`}>
                      {bbs.is_compliant ? "Scrap &le; 3% Compliant" : `${bbs.true_scrap_pct}% Scrap (High)`}[cite: 1]
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 font-sans">
                    {bbs.structural_element}
                  </div>

                  <div className="flex justify-between text-[10px] text-zinc-400 border-t border-zinc-800/80 pt-1.5 font-mono">
                    <span>12m Billets: <strong className="text-zinc-200">{bbs.billets_required_count}</strong></span>
                    <span>Salvaged: <strong className="text-cyan-400">{bbs.salvaged_offcut_m}m</strong></span>
                    <span>True Scrap: <strong className={bbs.is_compliant ? "text-emerald-400" : "text-amber-400"}>
                      {bbs.true_scrap_pct}% ({bbs.total_waste_m}m)
                    </strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
