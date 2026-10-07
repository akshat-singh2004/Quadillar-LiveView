import React from "react";
import { SiteGeospatialMap } from "@/components/gis/SiteGeospatialMap";
import { CraneSlewRadar } from "@/components/site/CraneSlewRadar";
import { createClient } from "@/lib/supabase/server";
import { Compass } from "lucide-react";

export default async function SiteGisPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
          <Compass className="w-3.5 h-3.5" />
          <span>GEOSPATIAL REALITY CAPTURE &amp; RIGGING SAFETY • {projectId}</span>
        </div>
        <h1 className="text-xl font-bold text-white uppercase mt-0.5">
          Site GIS Geofencing &amp; Crane Rigging Radar
        </h1>
        <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
          {projectName} • Orthomosaic drone boundary overlays, zone hazard radiuses &amp; tower crane wind lockouts.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8">
          <SiteGeospatialMap />
        </div>
        <div className="lg:col-span-4">
          <CraneSlewRadar />
        </div>
      </div>
    </div>
  );
}
