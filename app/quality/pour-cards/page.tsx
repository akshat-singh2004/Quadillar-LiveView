import React from "react";
import { CreatePourCardModal } from "@/components/quality/CreatePourCardModal";
import { SignDisciplineButton } from "@/components/quality/SignDisciplineButton";
import { createClient } from "@/lib/supabase/server";
import { ShieldCheck, ShieldAlert, CheckCircle2, Lock, Unlock, FileCheck, Layers } from "lucide-react";

export default async function PourCardsPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real pour cards
  const { data: pourCards } = await supabase
    .from("digital_pour_cards")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const activeCards = pourCards || [];
  const authorizedCount = activeCards.filter((c) => c.status === "PRE_POUR_AUTHORIZED").length;
  const lockedCount = activeCards.filter((c) => c.status === "SPATIAL_HOLD_NCR").length;
  const pendingCount = activeCards.filter((c) => c.status === "PENDING_INSPECTION").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Layers className="w-3.5 h-3.5" />
            <span>STRUCTURAL QUALITY GOVERNANCE • IS 456 CL. 10.2 / CPWD SECTION 10 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Digital Pour Cards &amp; Pre-Pour Clearance Gate
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Formwork, rebar cover, and MEP clearances with Aegis spatial lockouts and Argus weather gates.
          </p>
        </div>

        <CreatePourCardModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active Pour Cards</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{activeCards.length} Bays</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Pre-pour inspection register</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">RMC Dispatch Authorized</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">{authorizedCount} Cleared</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">100% 5-discipline sign-off verified</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Pending Field Sign-Offs</span>
          <div className="text-xl font-bold text-amber-400 mt-1 tabular-nums">{pendingCount} In-Progress</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Awaiting Formwork / Rebar / MEP</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Aegis Spatial Lockouts</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${lockedCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {lockedCount} Blocked
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {lockedCount > 0 ? "Active NCR quality hold[cite: 1]" : "Zero active spatial liens[cite: 1]"}
          </span>
        </div>
      </div>

      {/* POUR CARDS LIST */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Structural Pour Card Register ({activeCards.length})
          </span>
          <span className="text-[10px] text-zinc-500">Section 65B Certified Concreting Permits[cite: 1]</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {activeCards.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero pour cards open. Click &quot;+ Initiate Pour Card&quot; to open inspection gates for upcoming castings.
            </div>
          ) : (
            activeCards.map((card: any) => {
              const isAuthorized = card.status === "PRE_POUR_AUTHORIZED";
              const isLocked = card.status === "SPATIAL_HOLD_NCR";

              return (
                <div key={card.id} className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-zinc-850/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-[10px]">
                        {card.pour_card_number}
                      </span>
                      <strong className="text-white text-sm">{card.structural_element}</strong>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold text-[9px]">
                        {card.concrete_grade}
                      </span>
                    </div>

                    <div className="text-zinc-400 text-[11px] font-sans flex flex-wrap gap-x-4 gap-y-1">
                      <span>Grid: <strong className="text-zinc-300 font-mono">{card.grid_location}</strong></span>
                      <span>Level: <strong className="text-zinc-300">{card.level_elevation}</strong></span>
                      <span>Volume: <strong className="text-emerald-400 font-mono">{card.planned_volume_m3} m³</strong></span>
                      <span>Method: <strong className="text-zinc-300">{card.casting_method}</strong></span>
                    </div>

                    {/* STATUTORY DISCIPLINE BADGES & INTERACTIVE SIGN BUTTONS */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <SignDisciplineButton
                        projectId={projectId}
                        pourCardId={card.id}
                        discipline="FORMWORK"
                        label="Formwork"
                        isCleared={card.formwork_cleared}
                        clearedBy={card.formwork_cleared_by}
                      />
                      <SignDisciplineButton
                        projectId={projectId}
                        pourCardId={card.id}
                        discipline="REBAR"
                        label="Rebar & Cover"
                        isCleared={card.rebar_cleared}
                        clearedBy={card.rebar_cleared_by}
                      />
                      <SignDisciplineButton
                        projectId={projectId}
                        pourCardId={card.id}
                        discipline="MEP"
                        label="MEP Embeds"
                        isCleared={card.mep_embedments_cleared}
                        clearedBy={card.mep_cleared_by}
                      />

                      <span className={`px-2.5 py-1 rounded border text-[9px] font-bold uppercase flex items-center gap-1 ${
                        card.spatial_quality_cleared
                          ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                          : "bg-rose-950 border-rose-800 text-rose-300"
                      }`}>
                        {card.spatial_quality_cleared ? "✓ Aegis Grid Clear[cite: 1]" : "✕ Aegis NCR Hold[cite: 1]"}
                      </span>

                      <span className={`px-2.5 py-1 rounded border text-[9px] font-bold uppercase flex items-center gap-1 ${
                        card.weather_window_cleared
                          ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                          : "bg-amber-950 border-amber-800 text-amber-300"
                      }`}>
                        {card.weather_window_cleared ? "✓ Argus Weather Safe[cite: 1]" : "Argus Weather Check[cite: 1]"}
                      </span>
                    </div>
                  </div>

                  {/* FINAL STATUTORY STATUS BADGE */}
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isAuthorized
                        ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                        : isLocked
                        ? "bg-rose-950 border-rose-800 text-rose-300"
                        : "bg-amber-950/60 border-amber-800 text-amber-300"
                    }`}>
                      {isAuthorized ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>RMC Dispatch Cleared</span>
                        </>
                      ) : isLocked ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-rose-400" />
                          <span>Spatial NCR Lock</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Pre-Pour Hold</span>
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
