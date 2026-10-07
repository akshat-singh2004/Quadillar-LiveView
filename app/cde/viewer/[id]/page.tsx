// app/cde/viewer/page.tsx
import React from "react";
import { DrawingMarkupViewer } from "@/components/cde/DrawingMarkupViewer";
import { createClient } from "@/lib/supabase/server";
import { Layers, ShieldCheck, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface CdeViewerPageProps {
  params?: Promise<{ id?: string }>;
  searchParams?: Promise<{ drawingId?: string; id?: string }>;
}

export default async function CdeViewerPage(props: CdeViewerPageProps) {
  const supabase = await createClient();

  const resolvedParams = props.params ? await props.params : {};
  const resolvedSearchParams = props.searchParams ? await props.searchParams : {};
  const targetId = resolvedParams.id || resolvedSearchParams.drawingId || resolvedSearchParams.id;

  // 1. Resolve Active Project Context
  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name, gcc_protocol")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";
  const gccProtocol = projectRow?.gcc_protocol || "ISO 19650-2 / CPWD Works Manual Cl. 2";

  // 2. Query Live GFC Drawing Packages
  const { data: drawingRows } = await supabase
    .from("cde_drawing_packages")
    .select("*")
    .eq("project_id", projectId)
    .order("drawing_number", { ascending: true });

  const rawDrawings = drawingRows && drawingRows.length > 0 ? drawingRows : [];

  // Fallback ISO 19650 baseline drawing packages if not yet seeded
  const drawings =
    rawDrawings.length > 0
      ? rawDrawings
      : [
        {
          id: "drg-arch-101",
          project_id: projectId,
          drawing_number: "ARCH-GFC-101",
          title: "Ground Floor Architectural GA & Partition Plan",
          discipline: "Architectural",
          revision: "R2",
          status: "GFC_PUBLISHED",
          scale: "1:100 @ A1",
          created_at: "2026-09-18",
        },
        {
          id: "drg-str-002",
          project_id: projectId,
          drawing_number: "STR-FND-002",
          title: "Substructure Raft Reinforcement & Lift Pit Details",
          discipline: "Structural",
          revision: "R1",
          status: "SUPERSEDED",
          scale: "1:50 @ A0",
          created_at: "2026-09-15",
        },
      ];

  const activeDrawing = targetId
    ? drawings.find((d: any) => d.id === targetId || d.drawing_number === targetId) ?? drawings[0]
    : drawings[0];

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* HEADER BAR */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-cyan-400">
                <Layers className="h-3 w-3 mr-1" />
                Common Data Environment (CDE)
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-800 text-emerald-400">
                <ShieldCheck className="h-3 w-3 mr-1" />
                ISO 19650-2 GFC Protocol
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-mono uppercase">
              Interactive Spatial Markup &amp; 2D Redline Viewer
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Project: <span className="text-zinc-200 font-semibold">{projectName}</span> ({projectId}) • Protocol: {gccProtocol}
            </p>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <Link
              href="/dashboard"
              className="bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 font-bold px-3 py-2 uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Executive Command</span>
            </Link>
          </div>
        </header>

        {/* PRIMARY DRAWING VIEWER COMPONENT */}
        <DrawingMarkupViewer
          drawing={activeDrawing}
          drawingsList={drawings}
          projectId={projectId}
        />
      </div>
    </main>
  );
}