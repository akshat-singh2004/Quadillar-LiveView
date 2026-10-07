import React from "react";
import { SettlementDisplacementChart } from "@/components/engineering/SettlementDisplacementChart";
import { createClient } from "@/lib/supabase/server";
import { Activity } from "lucide-react";
import type { GeotechnicalReading } from "@/types/construction";

export default async function GeotechnicalPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Query live geotechnical sensor telemetry
  const { data: sensorRows } = await supabase
    .from("geotechnical_telemetry_readings")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });

  const mappedReadings: GeotechnicalReading[] = (sensorRows || []).map((r: any) => ({
    time: new Date(r.recorded_at || r.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    wallDeflectionMm: Number(r.wall_deflection_mm || 0),
    prismSettlementMm: Number(r.prism_settlement_mm || 0),
    piezometerLevelM: Number(r.piezometer_level_m || 2.6),
  }));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
          <Activity className="w-3.5 h-3.5" />
          <span>IS 2911 • FOUNDATION &amp; DEEP PILE DYNAMICS • {projectId}</span>
        </div>
        <h1 className="text-xl font-bold text-white uppercase mt-0.5">
          Geotechnical Monitoring &amp; Pile Load Displacement
        </h1>
        <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
          {projectName} • Optical prism settlement, inclinometer diaphragm wall deflection &amp; cyclic pile load tests.
        </p>
      </header>

      <SettlementDisplacementChart readings={mappedReadings} />
    </div>
  );
}
