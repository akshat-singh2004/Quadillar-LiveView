import React from "react";
import { DrawingRedlineCanvas } from "@/components/cde/DrawingRedlineCanvas";
import { createClient } from "@/lib/supabase/server";

interface DrawingPackage {
  id: string;
  code: string;
  title: string;
  discipline: "Architecture" | "Structural" | "MEP Services";
  version: "R0" | "R1" | "R2" | "R3";
  status: "Approved" | "Pending" | "Superseded";
  dotColor: "emerald" | "amber" | "rose";
  date: string;
  isActive?: boolean;
}

export default async function CdeRedlinePage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";

  // Fetch live CDE drawing metadata from Supabase
  const { data: drawingRows } = await supabase
    .from("cde_drawing_packages")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const drawingPackages: DrawingPackage[] = (drawingRows && drawingRows.length > 0)
    ? drawingRows.map((d: any, idx: number) => ({
      id: d.id,
      code: d.drawing_code || `DRG-${idx}`,
      title: d.drawing_title || "Engineering GFC Drawing",
      discipline: d.discipline || "Architecture",
      version: d.revision_version || "R1",
      status: d.status || "Approved",
      dotColor: d.status === "Approved" ? "emerald" : d.status === "Pending" ? "amber" : "rose",
      date: d.created_at ? new Date(d.created_at).toISOString().split("T")[0] : "2026-09-18",
      isActive: idx === 0,
    }))
    : [
      {
        id: "drg-1",
        code: "ARCH-GFC-101",
        title: "Ground Floor Architectural GA & Partition Plan",
        discipline: "Architecture",
        version: "R2",
        status: "Approved",
        dotColor: "emerald",
        date: "2026-09-18",
        isActive: true,
      },
      {
        id: "drg-2",
        code: "STR-FND-002",
        title: "Substructure Raft Reinforcement & Lift Pit Details",
        discipline: "Structural",
        version: "R1",
        status: "Pending",
        dotColor: "amber",
        date: "2026-09-15",
      },
    ];

  const activeDrawing = drawingPackages.find((p) => p.isActive) || drawingPackages[0];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col md:flex-row w-full overflow-hidden bg-zinc-950 text-zinc-100 font-sans">
      {/* ===================================================================
          LEFT SIDEBAR (w-80): Revision Control & Drawing Index
          =================================================================== */}
      <aside className="w-full md:w-80 flex-shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col justify-between overflow-y-auto">
        <div>
          {/* Header */}
          <div className="px-5 py-4 border-b border-zinc-800/60 bg-zinc-950/40">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-400">
                ISO 19650-2 CDE
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950/50 border border-emerald-800 text-emerald-400 font-bold uppercase">
                GFC Published
              </span>
            </div>
            <h1 className="text-sm font-bold font-mono uppercase tracking-wider text-zinc-100">
              Drawing Index &amp; Revisions
            </h1>
          </div>

          {/* Revision Status Filter Legend */}
          <div className="px-5 py-2.5 border-b border-zinc-800/40 bg-zinc-950/20 flex items-center justify-between text-[11px] font-mono">
            <span className="text-zinc-500 uppercase tracking-tight">Status Legend:</span>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Approved
              </span>
              <span className="flex items-center gap-1 text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-amber-500" />
                Pending
              </span>
              <span className="flex items-center gap-1 text-zinc-300">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                Superseded
              </span>
            </div>
          </div>

          {/* List of Drawing Packages */}
          <div className="divide-y divide-zinc-800/40">
            {drawingPackages.map((pkg) => {
              const dotClass =
                pkg.dotColor === "emerald"
                  ? "bg-emerald-500"
                  : pkg.dotColor === "amber"
                    ? "bg-amber-500"
                    : "bg-rose-500";

              return (
                <div
                  key={pkg.id}
                  className={`p-4 transition-colors cursor-pointer text-left ${pkg.isActive
                      ? "bg-zinc-800/60 border-l-2 border-emerald-500"
                      : "hover:bg-zinc-800/20"
                    }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full flex-shrink-0 ${dotClass}`} />
                      <span className="font-mono font-bold text-xs text-zinc-100">
                        {pkg.code}
                      </span>
                    </div>

                    <span className="font-mono tabular-nums text-[11px] px-1.5 py-0.5 bg-zinc-950 border border-zinc-700 font-bold text-zinc-200">
                      {pkg.version}
                    </span>
                  </div>

                  <h2 className="text-xs text-zinc-300 font-normal line-clamp-1 mb-1.5 pl-4">
                    {pkg.title}
                  </h2>

                  <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500 pl-4">
                    <span>{pkg.discipline}</span>
                    <span className="tabular-nums">{pkg.date}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar Footer Metadata */}
        <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/50 text-[10px] font-mono text-zinc-500 space-y-1">
          <div className="flex justify-between">
            <span>AUDIT STANDARD:</span>
            <span className="text-zinc-400">CPWD WORKS MANUAL 2024</span>
          </div>
          <div className="flex justify-between">
            <span>BALL-IN-COURT:</span>
            <span className="text-emerald-400 font-bold">PRINCIPAL ARCHITECT</span>
          </div>
        </div>
      </aside>

      {/* ===================================================================
          MAIN CONTENT AREA: Full-Width Vector Redline & Markup Canvas
          =================================================================== */}
      <main className="flex-1 relative h-full overflow-hidden">
        <DrawingRedlineCanvas activeDrawingRef={activeDrawing.code} />
      </main>
    </div>
  );
}