"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  Database,
  Layers,
  MapPin,
  X,
  Eye,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface RedlineItem {
  id: string;
  project_id: string;
  drawing_number: string;
  revision_code: string;
  drawing_title: string;
  markup_title: string;
  category: "STRUCTURAL_CLASH" | "MEP_COORDINATION" | "SITE_DEVIATION";
  pin_x_pct: number;
  pin_y_pct: number;
  author_role: string;
  resolution_status: "OPEN_UNDER_REVIEW" | "APPROVED_SUPERSEDED" | "REJECTED";
  description: string;
}

const FALLBACK_REDLINES: RedlineItem[] = [
  {
    id: "rl-fb-1",
    project_id: "PRJ-01-LIVE",
    drawing_number: "DWG-STR-TWR-104",
    revision_code: "Rev-03",
    drawing_title: "Level 14 Core Wall Shuttering & Rebar Schedule",
    markup_title: "HVAC Duct Sleeve Penetration Conflict",
    category: "MEP_COORDINATION",
    pin_x_pct: 44.5,
    pin_y_pct: 36.2,
    author_role: "BIM Coordinator",
    resolution_status: "OPEN_UNDER_REVIEW",
    description: "400x300mm fresh air supply duct clashes with vertical shear wall rebar curtain at Grid D4. Requires sleeve casting approval.",
  },
  {
    id: "rl-fb-2",
    project_id: "PRJ-01-LIVE",
    drawing_number: "DWG-STR-TWR-104",
    revision_code: "Rev-03",
    drawing_title: "Level 14 Core Wall Shuttering & Rebar Schedule",
    markup_title: "Post-Tensioned Anchor Recess Tolerance",
    category: "STRUCTURAL_CLASH",
    pin_x_pct: 72.0,
    pin_y_pct: 58.0,
    author_role: "Lead Structural SEOR",
    resolution_status: "OPEN_UNDER_REVIEW",
    description: "PT stressing pocket requires 50mm additional edge clearance per IS 1343 code.",
  },
];

export default function SpatialRedlinesPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [redlines, setRedlines] = useState<RedlineItem[]>([]);
  const [selectedRedline, setSelectedRedline] = useState<RedlineItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [markupTitle, setMarkupTitle] = useState("");
  const [category, setCategory] = useState<RedlineItem["category"]>("STRUCTURAL_CLASH");
  const [description, setDescription] = useState("");

  const loadRedlines = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("drawing_spatial_redlines")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setRedlines(FALLBACK_REDLINES);
        setSelectedRedline(FALLBACK_REDLINES[0]);
      } else {
        setIsFallbackMode(false);
        setRedlines(data);
        setSelectedRedline(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setRedlines(FALLBACK_REDLINES);
      setSelectedRedline(FALLBACK_REDLINES[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadRedlines();
  }, [loadRedlines]);

  const handleCreateMarkup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!markupTitle.trim() || !description.trim()) return;

    const payload: Partial<RedlineItem> = {
      project_id: projectId,
      drawing_number: "DWG-STR-TWR-104",
      revision_code: "Rev-03",
      drawing_title: "Level 14 Core Wall Shuttering & Rebar Schedule",
      markup_title: markupTitle.trim(),
      category,
      pin_x_pct: Math.floor(30 + Math.random() * 40),
      pin_y_pct: Math.floor(30 + Math.random() * 40),
      author_role: "Field Quality Inspector",
      resolution_status: "OPEN_UNDER_REVIEW",
      description: description.trim(),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("drawing_spatial_redlines")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setRedlines((prev) => [data, ...prev]);
      setSelectedRedline(data);
      setFeedback("Spatial redline markup saved successfully.");
    } catch {
      const fallback = { ...payload, id: `rl-${Date.now()}` } as RedlineItem;
      setRedlines((prev) => [fallback, ...prev]);
      setSelectedRedline(fallback);
      setFeedback("Optimistic spatial markup pinned to drawing.");
    } finally {
      setModalOpen(false);
      setMarkupTitle("");
      setDescription("");
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>COMMON DATA ENVIRONMENT (CDE) • ISO 19650 SPATIAL MARKUP PROTOCOL</span>
              <StatutoryInfo
                standardRef="ISO 19650 / DIN 18202"
                title="GFC Drawing Spatial Redlines & Markup Canvas"
                idealRange="Status: Coordinated / Approved"
                description="Interactive coordinate-pinned drawing redlines for Good-for-Construction (GFC) sheets. Logs spatial clashes, MEP sleeve penetrations, and rebar deviation waivers."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-cyan-400" />
              <span>GFC Canvas &amp; Spatial Redlines Ledger</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Coordinate-based clash pinning, drawing markups, and revision change logging.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              onClick={() => void loadRedlines()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Spatial Markup</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* CANVAS WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* DRAWING VIEWPORT & PIN CANVAS (8 cols) */}
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <div>
                <span className="font-bold text-white block">DWG-STR-TWR-104 (Rev-03)</span>
                <span className="text-[10px] text-zinc-400">Level 14 Core Wall Shuttering &amp; Rebar Schedule</span>
              </div>
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                GFC APPROVED
              </span>
            </div>

            {/* MOCK BLUEPRINT / DRAWING CANVAS */}
            <div className="relative w-full h-[420px] bg-zinc-950 border border-zinc-800 rounded overflow-hidden flex items-center justify-center">
              {/* Engineering grid lines */}
              <div
                className="absolute inset-0 opacity-15"
                style={{
                  backgroundImage: "radial-gradient(#38bdf8 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />

              <div className="text-center space-y-2 z-10 pointer-events-none">
                <Layers className="w-10 h-10 text-cyan-400/40 mx-auto" />
                <span className="text-xs text-zinc-500 font-mono uppercase block">
                  Interactive Spatial Markup Canvas Active
                </span>
                <span className="text-[10px] text-zinc-600">Click pinned coordinates below to inspect clash findings</span>
              </div>

              {/* SPATIAL PINS */}
              {redlines.map((r) => {
                const isSelected = selectedRedline?.id === r.id;
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRedline(r)}
                    style={{ left: `${r.pin_x_pct}%`, top: `${r.pin_y_pct}%` }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 p-2 rounded-full border transition transform hover:scale-125 z-20 ${
                      isSelected
                        ? "bg-cyan-500 text-zinc-950 border-white shadow-lg shadow-cyan-500/50"
                        : "bg-rose-600 text-white border-rose-300"
                    }`}
                    title={r.markup_title}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: REDLINE DETAIL & RESOLUTION (4 cols) */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm shadow-2xl">
            <div className="border-b border-zinc-800 pb-2">
              <span className="text-[10px] uppercase text-cyan-400 font-bold block">ISO 19650 Markup Audit</span>
              <h3 className="text-sm font-bold text-white mt-0.5">Clash &amp; Deviation Finding</h3>
            </div>

            {selectedRedline ? (
              <div className="space-y-4">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-white">{selectedRedline.markup_title}</span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-950 text-amber-400 border border-amber-800">
                      {selectedRedline.category.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-1">Author: {selectedRedline.author_role}</div>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-1.5">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Description &amp; Directive:</span>
                  <p className="text-xs text-zinc-200 font-sans leading-relaxed">{selectedRedline.description}</p>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Pinned Coordinate:</span>
                    <strong className="text-cyan-400 font-mono">X: {selectedRedline.pin_x_pct}%, Y: {selectedRedline.pin_y_pct}%</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Status:</span>
                    <span className="text-emerald-400 font-bold">{selectedRedline.resolution_status.replace(/_/g, " ")}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-zinc-600">Select a spatial pin on the drawing to inspect findings.</div>
            )}
          </div>

        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Add GFC Drawing Spatial Redline</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateMarkup} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Markup Finding Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Electrical Conduit Clash with Shear Link"
                    value={markupTitle}
                    onChange={(e) => setMarkupTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Classification</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="STRUCTURAL_CLASH">Structural Clash</option>
                    <option value="MEP_COORDINATION">MEP Coordination</option>
                    <option value="SITE_DEVIATION">Site As-Built Deviation</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Technical Observation &amp; Directive *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Detail the spatial collision, affected grid, and required engineering resolution..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Pin Redline to Canvas
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
