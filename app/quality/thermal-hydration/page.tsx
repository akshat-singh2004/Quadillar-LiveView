import React from "react";
import { LogHydrationTelemetryModal } from "@/components/quality/LogHydrationTelemetryModal";
import { createClient } from "@/lib/supabase/server";
import { authorizeFormworkStripping } from "@/app/actions/hydration-actions";
import { Thermometer, ShieldCheck, ShieldAlert, Layers, CheckCircle2, Lock } from "lucide-react";

export default async function ThermalHydrationPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch telemetry logs & stripping permits
  const [telemetryRes, permitsRes] = await Promise.all([
    supabase.from("concrete_hydration_telemetry").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("formwork_stripping_permits").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);

  const telemetryLogs = telemetryRes.data || [];
  const strippingPermits = permitsRes.data || [];

  const thermalBreaches = telemetryLogs.filter((t) => t.is_thermal_crack_risk || t.is_def_risk).length;
  const readyToStripCount = telemetryLogs.filter((t) => t.stripping_permitted).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Thermometer className="w-3.5 h-3.5" />
            <span>THERMODYNAMICS &amp; STRUCTURAL QUALITY • ASTM C1074 / CIRIA C766 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Concrete Hydration Kinetics &amp; Formwork Stripping
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Nurse-Saul maturity calculation, CIRIA early thermal cracking limits (&Delta;T &le; 20&deg;C), and Section 65B stripping permits.
          </p>
        </div>

        <LogHydrationTelemetryModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Thermocouple Readings</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{telemetryLogs.length} Records</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Real-time core &amp; surface log</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Thermal Gradient Limit</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">&Delta;T &le; 20.0&deg;C</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">CIRIA C766 crack prevention</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">De-shuttering Cleared</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">{readyToStripCount} Elements</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Achieved &ge; 70% characteristic f_ck</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active Thermal Holds</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${thermalBreaches > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {thermalBreaches} Breaches
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {thermalBreaches > 0 ? "Insulation blankets deployed" : "Zero thermal gradient risks"}
          </span>
        </div>
      </div>

      {/* DUAL PANELS: TELEMETRY STREAM & STRIPPING PERMITS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: THERMAL TELEMETRY READINGS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Live Hydration Telemetry Log ({telemetryLogs.length})
            </span>
            <span className="text-[10px] text-zinc-500">ASTM C1074 Sensor Network</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {telemetryLogs.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero telemetry recorded. Click &quot;+ Log Thermocouple Reading&quot; to log in-situ concrete hydration data.
              </div>
            ) : (
              telemetryLogs.map((log: any) => {
                const isCrackRisk = log.is_thermal_crack_risk;
                return (
                  <div key={log.id} className="p-4 space-y-2 hover:bg-zinc-850/50 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-[10px]">
                          {log.pour_card_id}
                        </span>
                        <strong className="text-white text-xs">{log.structural_element}</strong>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isCrackRisk ? "bg-rose-950 border border-rose-800 text-rose-300" : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                      }`}>
                        &Delta;T = {log.differential_temp_c}&deg;C {isCrackRisk ? "(Hold)" : "(Safe)"}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-zinc-400 font-sans">
                      <span>Core: <strong className="text-rose-400 font-mono">{log.core_temp_c}&deg;C</strong></span>
                      <span>Surface: <strong className="text-amber-400 font-mono">{log.surface_temp_c}&deg;C</strong></span>
                      <span>Age: <strong className="text-zinc-200 font-mono">{log.hours_since_pour}h</strong></span>
                      <span>Strength: <strong className="text-emerald-400 font-mono">{log.estimated_strength_mpa} MPa</strong></span>
                    </div>

                    <div className="flex justify-between items-center border-t border-zinc-800/80 pt-2">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Maturity: {log.maturity_index_deg_hrs} &deg;C&middot;hrs
                      </span>

                      {log.stripping_permitted && (
                        <form
                          action={async () => {
                            "use server";
                            await authorizeFormworkStripping({
                              projectId,
                              pourCardId: log.pour_card_id,
                              structuralElement: log.structural_element,
                              gridLocation: "Tower Core Axis",
                              targetFckMpa: log.target_fck_mpa,
                            });
                          }}
                        >
                          <button
                            type="submit"
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[9px] transition cursor-pointer flex items-center gap-1 shadow"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Authorize De-shuttering</span>
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: STRIPPING PERMITS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Formwork Stripping Permits ({strippingPermits.length})
            </span>
            <span className="text-[10px] text-zinc-500">IS 456 Cl. 11.3 Statutory Release</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {strippingPermits.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero de-shuttering permits authorized yet. Shoring must remain until maturity reaches &ge; 70% f_ck.
              </div>
            ) : (
              strippingPermits.map((permit: any) => (
                <div key={permit.id} className="p-4 space-y-1.5 hover:bg-zinc-850/50 transition">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                        {permit.permit_number}
                      </span>
                      <strong className="text-white text-xs">{permit.structural_element}</strong>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[9px] font-bold uppercase">
                      Cleared ({permit.strength_ratio_pct}% f_ck)
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 font-sans">
                    Grid: <strong className="text-zinc-300">{permit.grid_location}</strong> • Achieved: <strong className="text-emerald-400 font-mono">{permit.achieved_strength_mpa} MPa</strong> vs M{permit.target_fck_mpa}
                  </div>

                  <div className="text-[10px] text-zinc-500 flex justify-between border-t border-zinc-800/80 pt-1.5">
                    <span>Authorized By: {permit.authorized_by}</span>
                    <span className="font-mono text-cyan-400">Section 65B Sealed ✓</span>
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
