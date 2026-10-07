import React from "react";
import { IssuePermitModal } from "@/components/safety/IssuePermitModal";
import { LogAtmosphericTestModal } from "@/components/safety/LogAtmosphericTestModal";
import { createClient } from "@/lib/supabase/server";
import { closePermitToWork } from "@/app/actions/ptw-actions";
import { ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Lock, Flame, Wind } from "lucide-react";

export default async function PermitToWorkPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real active permits
  const { data: permits } = await supabase
    .from("digital_permits_to_work")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const activePermits = permits || [];
  const activeCount = activePermits.filter((p) => p.status === "PERMIT_ACTIVE").length;
  const revokedCount = activePermits.filter((p) => p.status === "GAS_CONTAMINATION_REVOKED").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-rose-400 uppercase tracking-widest font-bold">
            <Flame className="w-3.5 h-3.5" />
            <span>HSE STATUTORY GOVERNANCE • BOCW CENTRAL RULES 1998 / IS 3696 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Digital Permit to Work (PTW) &amp; Safety Hold-Gates
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Height work, hot work, and confined space access gates with Aegis spatial locks and Argus wind interlocks.
          </p>
        </div>

        <IssuePermitModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active Work Permits</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">{activeCount} Permits</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Certified life-safety operations</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Anemometer Wind Cutoff</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">&le; 38.0 km/h</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Argus crane &amp; height cutoff[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Confined Space Gas Limits</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">19.5% &le; O₂ &le; 23.5%</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">LEL &lt; 10%, H₂S &lt; 10 ppm</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Toxic / Gas Revocations</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${revokedCount > 0 ? "text-rose-400" : "text-zinc-400"}`}>
            {revokedCount} Revoked
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {revokedCount > 0 ? "Atmospheric safety breaches" : "Zero gas contamination alerts"}
          </span>
        </div>
      </div>

      {/* PERMITS REGISTER TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Live Permits to Work Register ({activePermits.length})
          </span>
          <span className="text-[10px] text-zinc-500">BOCW Act Rule 34 Statutory Record</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {activePermits.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero active safety permits on site. High-risk trades require a verified PTW. Click &quot;+ Issue Safety Permit (PTW)&quot; above.
            </div>
          ) : (
            activePermits.map((permit: any) => {
              const isActive = permit.status === "PERMIT_ACTIVE";
              const isRevoked = permit.status === "GAS_CONTAMINATION_REVOKED";

              return (
                <div key={permit.id} className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-zinc-850/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold text-[10px]">
                        {permit.permit_number}
                      </span>
                      <strong className="text-white text-sm">{permit.permit_type.replace("_", " ")}</strong>
                      <span className="text-zinc-500 text-xs">({permit.location_zone})</span>
                    </div>

                    <div className="text-zinc-400 text-[11px] font-sans flex flex-wrap gap-x-4 gap-y-1">
                      <span>Agency: <strong className="text-zinc-300">{permit.contractor_agency}</strong></span>
                      <span>Supervisor: <strong className="text-zinc-300">{permit.supervisor_name}</strong></span>
                      <span>Valid Until: <strong className="text-amber-400 font-mono">{new Date(permit.valid_to).toLocaleTimeString()}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[9px] font-bold">
                        {permit.ppe_verified ? "✓ PPE Verified" : "No PPE"}
                      </span>
                      {permit.permit_type === "HEIGHT_WORK" && (
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-300 text-[9px] font-bold">
                          {permit.harness_lifeline_verified ? "✓ Lifeline 100% Tie-off" : "Harness Hold"}
                        </span>
                      )}
                      {permit.permit_type === "HOT_WORK" && (
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-amber-300 text-[9px] font-bold">
                          {permit.fire_watch_assigned ? "✓ Fire Watch Active" : "No Fire Watch"}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {permit.permit_type === "CONFINED_SPACE" && isActive && (
                      <LogAtmosphericTestModal
                        projectId={projectId}
                        permitId={permit.id}
                        permitNumber={permit.permit_number}
                      />
                    )}

                    {isActive && (
                      <form
                        action={async () => {
                          "use server";
                          await closePermitToWork(permit.id, projectId);
                        }}
                      >
                        <button
                          type="submit"
                          className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold uppercase text-[9px] transition cursor-pointer"
                        >
                          Close Permit
                        </button>
                      </form>
                    )}

                    <span className={`px-2.5 py-1 rounded border text-[9px] font-bold uppercase flex items-center gap-1 ${
                      isActive
                        ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                        : isRevoked
                        ? "bg-rose-950 border-rose-800 text-rose-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}>
                      {isActive ? "✓ Permitted Active" : isRevoked ? "✕ Revoked (Toxic Gas)" : permit.status}
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
