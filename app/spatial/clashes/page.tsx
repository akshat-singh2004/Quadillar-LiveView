import React from "react";
import { fetchSpatialClashes } from "@/app/actions/bim-actions";
import { MinervaSpatialClashViewer } from "@/components/spatial/MinervaSpatialClashViewer";
import { createClient } from "@/lib/supabase/server";
import { Box, Layers, ShieldAlert, CheckCircle2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function SpatialClashesPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  const clashes = await fetchSpatialClashes(projectId);
  const hardClashes = clashes.filter((c) => c.clash_category === "HARD_CLASH");
  const lockedCount = clashes.filter((c) => c.pour_card_lock_engaged).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Box className="w-3.5 h-3.5" />
            <span>3D BIM SPATIAL COORDINATION • ISO 19650-2 / PAS 1192 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Minerva Spatial Interference &amp; Pre-Pour Lockout HUD
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Continuous 3D Axis-Aligned Bounding Box (AABB) clash queries between structural models and MEP services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/governance/council"
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase text-[10px] transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Council War Room</span>
          </Link>
        </div>
      </header>

      {/* 4 SPATIAL KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Hard Clashes Detected</span>
          <div className="text-xl font-bold text-rose-400 mt-1 tabular-nums">{hardClashes.length} Active</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Structural vs MEP conduit</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Pour Cards Blocked</span>
          <div className="text-xl font-bold text-amber-400 mt-1 tabular-nums">{lockedCount} Locked Grids</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Pre-pour lock active</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">LOD Coordination</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">LOD 400</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Fabrication precision</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">SEOR Releases</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            {clashes.length - lockedCount} Cleared
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Section 65B Notarized</span>
        </div>
      </div>

      {/* 3D VIEWER COMPONENT */}
      <MinervaSpatialClashViewer clashes={clashes} projectId={projectId} />
    </div>
  );
}
