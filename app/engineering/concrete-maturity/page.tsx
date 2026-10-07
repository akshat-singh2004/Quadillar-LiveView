import React from "react";
import { PairThermocoupleNodeModal } from "@/components/engineering/PairThermocoupleNodeModal";
import { LogHydrationReadingModal } from "@/components/engineering/LogHydrationReadingModal";
import { createClient } from "@/lib/supabase/server";
import { Thermometer, Lock, Unlock } from "lucide-react";

export default async function ConcreteMaturityPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real paired nodes
  const { data: nodes } = await supabase
    .from("concrete_maturity_nodes")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const activeNodes = nodes || [];

  // Fetch latest telemetry reading across nodes
  const { data: latestReadings } = await supabase
    .from("concrete_maturity_readings")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1);

  const latestReading = latestReadings?.[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Thermometer className="w-3.5 h-3.5" />
            <span>STRUCTURAL ENGINEERING TELEMETRY • ASTM C1074 MATURITY / IS 456 TABLE 10 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Concrete Maturity &amp; Formwork Stripping Hold-Gate
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Dual-depth thermocouple telemetry, Nurse-Saul maturity calculation &amp; statutory formwork removal controls.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            activeNodes.length > 0 ? "bg-emerald-950 border-emerald-800 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${activeNodes.length > 0 ? "bg-emerald-400 animate-pulse" : "bg-zinc-600"}`} />
            <span>{activeNodes.length > 0 ? `BLE IOT GATEWAY: ${activeNodes.length} NODES LINKED` : "BLE IOT GATEWAY: OFFLINE / UNPAIRED"}</span>
          </span>

          <PairThermocoupleNodeModal projectId={projectId} />
        </div>
      </header>

      {/* 4 REAL TELEMETRY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active In-Situ Probes</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">
            {activeNodes.length} Sacrificial Nodes
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Dual-probe mass sensors</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Current Core Temperature</span>
          <div className="text-xl font-bold text-rose-400 mt-1 tabular-nums">
            {latestReading ? `${latestReading.core_temp_c}°C` : "--"}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {latestReading ? `Surface: ${latestReading.surface_temp_c}°C (ΔT ${Math.abs(latestReading.core_temp_c - latestReading.surface_temp_c).toFixed(1)}°C)` : "Ambient: --"}
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Nurse-Saul Maturity Index</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            {latestReading ? `${Number(latestReading.maturity_index).toLocaleString()} °C·hrs` : "--"}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Datum T0 = -10°C (ASTM C1074)</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">In-Situ Compressive Strength</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            {latestReading ? `${latestReading.estimated_strength_mpa} MPa` : "--"}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Plowman Maturity Model</span>
        </div>
      </div>

      {/* SACRIFICIAL SENSOR NODES TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Embedded Thermocouple Nodes ({activeNodes.length})
          </span>
          <span className="text-[10px] text-zinc-500">IS 456 Table 10 Stripping Authorization</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {activeNodes.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero active maturity sensors logging. Deploy sacrificial probes during concrete casting using &quot;+ Pair Sacrificial Node&quot; above.
            </div>
          ) : (
            activeNodes.map((node: any) => {
              const isAuthorized = node.status === "STRIPPING_AUTHORIZED";

              return (
                <div key={node.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-zinc-850/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-[10px]">
                        {node.node_tag}
                      </span>
                      <strong className="text-white text-sm">{node.structural_element}</strong>
                      <span className="text-zinc-500 text-xs">({node.mix_design_grade})</span>
                    </div>
                    <div className="text-zinc-400 text-[11px] font-sans">
                      {node.grid_location} • Class: <strong className="text-zinc-300 font-mono">{node.element_type}</strong>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <LogHydrationReadingModal
                      projectId={projectId}
                      nodeId={node.id}
                      nodeTag={node.node_tag}
                    />

                    <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isAuthorized
                        ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                        : "bg-amber-950/60 border-amber-800 text-amber-300"
                    }`}>
                      {isAuthorized ? (
                        <>
                          <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Stripping Authorized</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Formwork Locked</span>
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
