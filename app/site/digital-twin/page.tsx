import React from "react";
import { BimModelViewer } from "@/components/viewer/BimModelViewer";
import { createClient } from "@/lib/supabase/server";
import { Box, ShieldAlert, UploadCloud } from "lucide-react";
import Link from "next/link";

export default async function DigitalTwinPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name, bim_model_url")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";
  const modelUrl = projectRow?.bim_model_url;

  const { data: openNcrs } = await supabase
    .from("quality_ncr_register")
    .select("id, ncr_number, grid_location, issue_description, severity, status")
    .eq("project_id", projectId)
    .neq("status", "CLOSED");

  const spatialLocks = openNcrs || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-5">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Box className="w-3.5 h-3.5" />
            <span>SPATIAL DIGITAL TWIN • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            3D BIM &amp; Multi-Disciplinary Spatial Viewport
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Floorplan dissections, MEP/HVAC isolation &amp; geofenced defect pins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 border text-[10px] font-bold uppercase ${
            modelUrl ? "bg-emerald-950 border-emerald-800 text-emerald-400" : "bg-zinc-900 border-zinc-800 text-zinc-500"
          }`}>
            {modelUrl ? "IFC 4D ENGINE ONLINE" : "NO IFC MODEL LINKED"}
          </span>
          {spatialLocks.length > 0 && (
            <span className="px-2.5 py-1 bg-rose-950 border border-rose-800 text-rose-300 font-bold uppercase text-[10px] flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-400" />
              <span>{spatialLocks.length} Active Spatial Holds</span>
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-9 h-[720px] rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900/40">
          {modelUrl ? (
            <BimModelViewer modelUrl={modelUrl} projectId={projectId} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
              <UploadCloud className="w-12 h-12 text-zinc-600" />
              <div className="text-white font-bold text-sm uppercase">No Spatial Model Uploaded</div>
              <p className="text-zinc-500 font-sans text-xs max-w-sm">
                No IFC, DWG, or Revit container has been registered for project [{projectId}]. Complete model onboarding to view the 3D twin.
              </p>
              <Link
                href="/onboarding"
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 uppercase font-bold text-xs rounded transition"
              >
                Upload IFC Package
              </Link>
            </div>
          )}
        </div>

        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
          <div className="border-b border-zinc-800 pb-2 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-[11px] flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Aegis Spatial Lockouts</span>
            </span>
            <span className="text-[10px] text-zinc-500">{spatialLocks.length} Holds</span>
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto">
            {spatialLocks.length === 0 ? (
              <div className="py-12 text-center text-zinc-600 font-sans">
                Zero active geometry holds. Concreting and formwork permitted across all grids.
              </div>
            ) : (
              spatialLocks.map((ncr) => (
                <div key={ncr.id} className="p-3 bg-zinc-950 border border-rose-900/40 rounded-xl space-y-1">
                  <div className="flex justify-between items-center text-[10px]">
                    <strong className="text-rose-400">{ncr.ncr_number}</strong>
                    <span className="px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[9px] uppercase font-bold">
                      {ncr.severity}
                    </span>
                  </div>
                  <div className="text-zinc-200 font-bold text-[11px] truncate">{ncr.grid_location || "Site Grid"}</div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 font-sans">{ncr.issue_description}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
