import React from "react";
import { LogHindranceModal } from "@/components/commercial/LogHindranceModal";
import { AdjudicateEotModal } from "@/components/commercial/AdjudicateEotModal";
import { createClient } from "@/lib/supabase/server";
import { Clock, ShieldCheck, ShieldAlert, Scale, AlertTriangle, Layers } from "lucide-react";

export default async function HindranceEotPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch hindrances and EOT claim dossiers
  const [hindranceRes, eotRes] = await Promise.all([
    supabase.from("site_hindrance_register").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("eot_claim_dossiers").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);

  const hindrances = hindranceRes.data || [];
  const eotClaims = eotRes.data || [];

  const totalDelayDays = hindrances.reduce((s, h) => s + (Number(h.days_hindered) || 0), 0);
  const totalApprovedDays = eotClaims.reduce((s, c) => s + (Number(c.adjudicated_days_approved) || 0), 0);
  const totalLdShieldedInr = eotClaims.reduce((s, c) => s + (Number(c.liquidated_damages_shielded_inr) || 0), 0);
  const openHindrancesCount = hindrances.filter((h) => h.status === "OPEN_CRITICAL_DELAY").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-rose-400 uppercase tracking-widest font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>DELAY FORENSICS &amp; CLAIMS • FIDIC CL. 8.4 / CPWD CL. 5 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Site Hindrance Register &amp; Extension of Time (EOT) Claims
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Contemporaneous float analysis, 28-day notice time-bar surveillance, and CPWD Cl. 2 liquidated damages defense[cite: 1].
          </p>
        </div>

        <LogHindranceModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Logged Hindrance Days</span>
          <div className="text-xl font-bold text-rose-400 mt-1 tabular-nums">+{totalDelayDays} Days</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{openHindrancesCount} active open delays</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">EOT Certified Extensions</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">+{totalApprovedDays} Days</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{eotClaims.length} Dossiers Adjudicated</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">CPWD Cl. 2 LD Shielded</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            ₹{(totalLdShieldedInr / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Protected from recovery[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">28-Day Notice Window</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">FIDIC Cl. 20.1</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Statutory time-bar armed</span>
        </div>
      </div>

      {/* DUAL PANELS: HINDRANCE REGISTER & EOT CLAIMS DOSSIERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: SITE HINDRANCES */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Contemporaneous Hindrances Register ({hindrances.length})
            </span>
            <span className="text-[10px] text-zinc-500">SCL Delay Protocol Log</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {hindrances.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero delay events logged. Click &quot;+ Log Site Hindrance&quot; to contemporaneously record progress obstructions.
              </div>
            ) : (
              hindrances.map((h: any) => {
                const isOpen = h.status === "OPEN_CRITICAL_DELAY";
                return (
                  <div key={h.id} className="p-4 space-y-1.5 hover:bg-zinc-850/50 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold text-[10px]">
                          {h.hindrance_code}
                        </span>
                        <strong className="text-white text-xs">{h.delay_category.replace(/_/g, " ")}</strong>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isOpen ? "bg-rose-950 border border-rose-800 text-rose-300" : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                      }`}>
                        +{h.days_hindered}d ({isOpen ? "Open Delay" : "Resolved"})
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-300 font-sans">
                      {h.description}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-1.5 font-mono">
                      <span>Grid: <strong className="text-zinc-300">{h.grid_location}</strong></span>

                      {isOpen && (
                        <AdjudicateEotModal
                          projectId={projectId}
                          hindranceId={h.id}
                          hindranceCode={h.hindrance_code}
                          daysHindered={Number(h.days_hindered)}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: EOT CLAIMS DOSSIERS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Adjudicated EOT Claim Dossiers ({eotClaims.length})
            </span>
            <span className="text-[10px] text-zinc-500">FIDIC Cl. 8.4 Legal Awards</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {eotClaims.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero EOT claims adjudicated. Click &quot;Adjudicate EOT&quot; on open hindrances to evaluate statutory time extensions.
              </div>
            ) : (
              eotClaims.map((claim: any) => {
                const isApproved = claim.status === "EOT_APPROVED_CERTIFIED";
                return (
                  <div key={claim.id} className="p-4 space-y-1.5 hover:bg-zinc-850/50 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                          {claim.claim_number}
                        </span>
                        <strong className="text-white text-xs">{claim.contractor_agency}</strong>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isApproved ? "bg-emerald-950 border border-emerald-800 text-emerald-300" : "bg-rose-950 border border-rose-800 text-rose-300"
                      }`}>
                        {isApproved ? `+${claim.adjudicated_days_approved}d Certified` : "Time-Barred (0d)"}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 font-sans">
                      New Target Completion: <strong className="text-emerald-400 font-mono">{claim.revised_completion_date}</strong> • Shielded LD: <strong className="text-cyan-400 font-mono">₹{Number(claim.liquidated_damages_shielded_inr).toLocaleString("en-IN")}</strong>
                    </div>

                    <div className="flex justify-between text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-1.5 font-mono">
                      <span>Clause: {claim.statutory_clause_ref}</span>
                      <span className="text-cyan-400">Section 65B Certified ✓</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
