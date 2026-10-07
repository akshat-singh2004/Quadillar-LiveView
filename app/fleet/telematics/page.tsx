import React from "react";
import { LogAssetTelemetryModal } from "@/components/fleet/LogAssetTelemetryModal";
import { createClient } from "@/lib/supabase/server";
import { Wrench, ShieldCheck, ShieldAlert, Cpu, Radio, AlertTriangle } from "lucide-react";

export default async function FleetTelematicsPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch telemetry logs & inter-agent synapse events
  const [fleetRes, synapseRes] = await Promise.all([
    supabase.from("plant_machinery_telematics").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("council_interagent_events").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(10),
  ]);

  const fleetLogs = fleetRes.data || [];
  const synapseEvents = synapseRes.data || [];

  const onlineCount = fleetLogs.filter((f) => f.operational_status === "ONLINE").length;
  const groundedCount = fleetLogs.filter((f) => f.operational_status === "GROUNDED_SAFETY_HOLD").length;
  const avgOee = fleetLogs.length > 0
    ? parseFloat((fleetLogs.reduce((s, f) => s + Number(f.oee_pct), 0) / fleetLogs.length).toFixed(1))
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Radio className="w-3.5 h-3.5" />
            <span>FLEET &amp; TELEMATICS GOVERNANCE • ISO 22400 / CPWD FORM 31 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Heavy Plant Telematics &amp; Autonomous Council Synapse
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Real-time asset OEE, CPWD Form 31 fuel pilferage surveillance, and Argus-to-Ananke wind interlocks[cite: 1].
          </p>
        </div>

        <LogAssetTelemetryModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Tracked Fleet Assets</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{fleetLogs.length} Units</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">CAN-bus telemetry streaming</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Average Fleet OEE</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">{avgOee}%</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">ISO 22400 benchmark[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Operational Online</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">{onlineCount} Deployed</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Cleared for operations</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Grounded Safety Holds</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${groundedCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {groundedCount} Grounded
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {groundedCount > 0 ? "High wind or fitness expiry[cite: 1]" : "Zero safety groundings"}
          </span>
        </div>
      </div>

      {/* DUAL PANELS: FLEET TELEMETRY & A2A SYNAPSE EVENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: PLANT TELEMETRY LOGS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Live Fleet Telemetry Register ({fleetLogs.length})
            </span>
            <span className="text-[10px] text-zinc-500">ISO 22400 OEE Stream[cite: 1]</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {fleetLogs.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero telemetry recorded. Click &quot;+ Log Asset Telemetry&quot; to ingest equipment telemetry.
              </div>
            ) : (
              fleetLogs.map((log: any) => {
                const isGrounded = log.operational_status === "GROUNDED_SAFETY_HOLD";
                const isFlagged = log.is_fuel_pilferage_flagged;

                return (
                  <div key={log.id} className="p-4 space-y-1.5 hover:bg-zinc-850/50 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-[10px]">
                          {log.asset_code}
                        </span>
                        <strong className="text-white text-xs">{log.asset_name}</strong>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isGrounded
                          ? "bg-rose-950 border border-rose-800 text-rose-300"
                          : isFlagged
                          ? "bg-amber-950 border border-amber-800 text-amber-300"
                          : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                      }`}>
                        {log.operational_status}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-zinc-400 font-sans">
                      <span>OEE: <strong className="text-cyan-400 font-mono">{log.oee_pct}%</strong>[cite: 1]</span>
                      <span>Hours: <strong className="text-zinc-200 font-mono">{log.actual_operating_hours}h</strong></span>
                      <span>Fuel Burn: <strong className="text-amber-400 font-mono">{log.fuel_consumed_liters}L</strong></span>
                      <span>Variance: <strong className={isFlagged ? "text-rose-400 font-mono" : "text-emerald-400 font-mono"}>
                        {log.fuel_variance_pct > 0 ? `+${log.fuel_variance_pct}%` : `${log.fuel_variance_pct}%`}
                      </strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: COUNCIL SYNAPSE INTER-AGENT COMMUNICATIONS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Council Synapse: A2A Inter-Agent Directives
            </span>
            <span className="text-[10px] text-cyan-400">Reactive Coordination Bus</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {synapseEvents.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero inter-agent events logged. Governors communicate reactively when safety, quality, or weather boundaries trip[cite: 1].
              </div>
            ) : (
              synapseEvents.map((evt: any) => (
                <div key={evt.id} className="p-4 space-y-1 hover:bg-zinc-850/50 transition">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-cyan-400">
                      {evt.source_agent} &rarr; {evt.target_agent}
                    </span>
                    <span className="text-[9px] text-zinc-500 font-mono">
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-300 font-sans">
                    {evt.action_taken}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
