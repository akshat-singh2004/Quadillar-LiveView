import React from "react";
import { createClient } from "@/lib/supabase/server";
import { FileDiff, Plus, Clock, CheckCircle2 } from "lucide-react";

export default async function VariationsPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name, contract_value")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real variations from Supabase (found 1 live row)
  const { data: variations } = await supabase
    .from("contract_variations")
    .select("*")
    .eq("project_id", projectId);

  const voList = variations || [];
  const totalVoBudget = voList.reduce((sum, v) => sum + (Number(v.cost_impact_inr || v.amount || 0)), 0);
  const totalEotDays = voList.reduce((sum, v) => sum + (Number(v.schedule_impact_days || v.time_impact_days || 0)), 0);
  const pendingCount = voList.filter((v) => v.status === "AwaitingApproval" || v.status === "Pending").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <FileDiff className="w-3.5 h-3.5" />
            <span>CONTRACT ADMINISTRATION • CPWD GCC CL. 12 / FIDIC CL. 13 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Contract Variations &amp; Rate Derivation Ledger (VO)
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Extra items, substituted specifications &amp; statutory deviation limits.
          </p>
        </div>

        <button
          type="button"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Log Variation Proposal</span>
        </button>
      </header>

      {/* 4 SUMMARY TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Sanctioned VO Budget</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            ₹{totalVoBudget.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Approved net deviation</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Pending Review</span>
          <div className="text-xl font-bold text-amber-400 mt-1 tabular-nums">{pendingCount} Proposals</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Awaiting rate analysis</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Sanctioned EOT Schedule</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">+{totalEotDays} Days</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Authorized critical extension</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Variation Records</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{voList.length} Orders</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">CPWD Form 11 records</span>
        </div>
      </div>

      {/* VARIATIONS LIST OR ZERO STATE */}
      {voList.length === 0 ? (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center space-y-3">
          <FileDiff className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-bold text-white uppercase">No Variation Orders Logged</h3>
          <p className="text-zinc-500 font-sans text-xs max-w-md mx-auto">
            Scope is executing within the original tender envelope for [{projectId}].
          </p>
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Sanctioned Variation Orders ({voList.length})
            </span>
            <span className="text-[10px] text-zinc-500">CPWD Form 11 Ledger</span>
          </div>

          <div className="divide-y divide-zinc-800">
            {voList.map((item) => (
              <div key={item.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-zinc-850/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-[10px]">
                      {item.vo_number || item.variation_number || "VO-01"}
                    </span>
                    <span className="text-white font-bold text-sm">{item.title || item.scope_description || "Scope Adjustment"}</span>
                  </div>
                  <p className="text-zinc-400 font-sans text-xs">{item.description || item.scope_description || "Contractual scope adjustment recorded."}</p>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="text-emerald-400 font-bold text-sm">
                      ₹{Number(item.cost_impact_inr || item.amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div className="text-[10px] text-zinc-500">+{Number(item.schedule_impact_days || item.time_impact_days || 0)} Days EOT</div>
                  </div>
                  <span className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-zinc-300 font-bold text-[10px] uppercase">
                    {item.status || "APPROVED"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
