import React from "react";
import { LogMusterRollModal } from "@/components/labor/LogMusterRollModal";
import { createClient } from "@/lib/supabase/server";
import { Users, ShieldCheck, ShieldAlert, AlertTriangle, DollarSign, Layers } from "lucide-react";

export default async function LaborMusterPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real muster records
  const { data: musterRolls } = await supabase
    .from("daily_labor_muster_rolls")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const activeMuster = musterRolls || [];
  const totalClaimedHeadcount = activeMuster.reduce((s, m) => s + (Number(m.claimed_headcount) || 0), 0);
  const totalVerifiedHeadcount = activeMuster.reduce((s, m) => s + (Number(m.biometric_verified_headcount) || 0), 0);
  const totalGhostWorkers = activeMuster.reduce((s, m) => s + (Number(m.ghost_workers_count) || 0), 0);
  const totalGhostDebitInr = activeMuster.reduce((s, m) => s + (Number(m.ghost_wage_debit_inr) || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>LABOR &amp; WELFARE GOVERNANCE • BOCW ACT 1996 / MINIMUM WAGES ACT 1948 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Biometric Labor Muster &amp; Statutory Wage Ledger
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Anti-passback turnstile verification, ghost worker contra-charge debits, and Section 65B notarized muster rolls[cite: 1].
          </p>
        </div>

        <LogMusterRollModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Claimed Headcount</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{totalClaimedHeadcount} Workers</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{activeMuster.length} Shift Musters Audited</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Biometric Ingress Verified</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">{totalVerifiedHeadcount} Punched</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Turnstile anti-passback cleared[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Ghost Workers Flagged</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${totalGhostWorkers > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {totalGhostWorkers} Flagged
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {totalGhostWorkers > 0 ? "Bypassed turnstile ingress[cite: 1]" : "100% headcount match"}
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Ghost Wage Contra-Charges</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${totalGhostDebitInr > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            ₹{totalGhostDebitInr.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Debited from contractor IPCs[cite: 1]</span>
        </div>
      </div>

      {/* MUSTER AUDIT REGISTER TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Shift Muster Roll Audit Register ({activeMuster.length})
          </span>
          <span className="text-[10px] text-zinc-500">BOCW Act Statutory Shift Log</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {activeMuster.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero muster rolls audited. Click &quot;+ Audit Daily Muster&quot; to cross-reference contractor rolls with turnstile biometrics.
            </div>
          ) : (
            activeMuster.map((muster: any) => {
              const hasGhosts = Number(muster.ghost_workers_count) > 0;
              const isCompliant = muster.status === "VERIFIED_AUDIT_PASSED";

              return (
                <div key={muster.id} className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-zinc-850/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                        {muster.muster_code}
                      </span>
                      <strong className="text-white text-sm">{muster.trade_classification.replace("_", " ")}</strong>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold text-[9px]">
                        {muster.skill_tier}
                      </span>
                    </div>

                    <div className="text-zinc-400 text-[11px] font-sans flex flex-wrap gap-x-4 gap-y-1">
                      <span>Agency: <strong className="text-zinc-300">{muster.contractor_agency}</strong></span>
                      <span>Date: <strong className="text-zinc-300">{muster.shift_date}</strong></span>
                      <span>Claimed: <strong className="text-zinc-200 font-mono">{muster.claimed_headcount}</strong></span>
                      <span>Biometric: <strong className="text-cyan-400 font-mono">{muster.biometric_verified_headcount}</strong></span>
                      <span>Daily Wage: <strong className="text-emerald-400 font-mono">₹{muster.daily_wage_rate_inr}</strong></span>
                    </div>

                    {hasGhosts && (
                      <div className="text-rose-400 text-[10px] font-mono pt-0.5">
                        &bull; Forensic Warning: {muster.ghost_workers_count} unverified ghost worker(s) debited at ₹{muster.ghost_wage_debit_inr} from contractor bill[cite: 1].
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isCompliant
                        ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                        : "bg-rose-950 border-rose-800 text-rose-300"
                    }`}>
                      {isCompliant ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Muster Verified</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                          <span>{hasGhosts ? "Ghost Worker Debit" : "Statutory Wage Breach"}</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
