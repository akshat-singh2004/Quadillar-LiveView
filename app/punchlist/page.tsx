"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  CheckSquare,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface PunchItem {
  id: string;
  project_id: string;
  item_code: string;
  location_grid: string;
  trade_package: string;
  contractor_name: string;
  defect_description: string;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  status: "OPEN_PENDING" | "RECTIFIED_AWAITING_QC" | "CLOSED_VERIFIED";
  target_rectification_date: string;
}

const FALLBACK_PUNCH: PunchItem[] = [
  {
    id: "pch-fb-1",
    project_id: "PRJ-01-LIVE",
    item_code: "PCH-2026-104",
    location_grid: "Level 12 - Corridor East",
    trade_package: "Civil & Superstructure",
    contractor_name: "Apex Structural Formworks Ltd.",
    defect_description: "Surface honeycombing on column C-12 face requiring polymer-modified mortar repair.",
    severity: "MAJOR",
    status: "OPEN_PENDING",
    target_rectification_date: "2026-10-07",
  },
  {
    id: "pch-fb-2",
    project_id: "PRJ-01-LIVE",
    item_code: "PCH-2026-105",
    location_grid: "Basement 1 - Pump Room B",
    trade_package: "MEP / HVAC",
    contractor_name: "Thermax MEP Solutions",
    defect_description: "Missing vibration isolation pads under secondary chilled water booster pump.",
    severity: "CRITICAL",
    status: "RECTIFIED_AWAITING_QC",
    target_rectification_date: "2026-10-03",
  },
];

export default function FieldPunchListPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [items, setItems] = useState<PunchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [location, setLocation] = useState("");
  const [trade, setTrade] = useState("Civil & Superstructure");
  const [contractor, setContractor] = useState("");
  const [severity, setSeverity] = useState<PunchItem["severity"]>("MAJOR");
  const [desc, setDesc] = useState("");

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("field_punch_list_items")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setItems(FALLBACK_PUNCH);
      } else {
        setIsFallbackMode(false);
        setItems(data);
      }
    } catch {
      setIsFallbackMode(true);
      setItems(FALLBACK_PUNCH);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const summary = useMemo(() => {
    const total = items.length;
    const open = items.filter((i) => i.status === "OPEN_PENDING").length;
    const critical = items.filter((i) => i.severity === "CRITICAL" && i.status !== "CLOSED_VERIFIED").length;
    return { total, open, critical };
  }, [items]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim() || !desc.trim()) return;

    const code = `PCH-${new Date().getFullYear()}-${(items.length + 106).toString()}`;
    const payload: Partial<PunchItem> = {
      project_id: projectId,
      item_code: code,
      location_grid: location.trim(),
      trade_package: trade,
      contractor_name: contractor.trim() || "Executing Contractor",
      defect_description: desc.trim(),
      severity,
      status: "OPEN_PENDING",
      target_rectification_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("field_punch_list_items")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setItems((prev) => [data, ...prev]);
      setFeedback(`Punch item ${code} tagged.`);
    } catch {
      const fallback = { ...payload, id: `pch-${Date.now()}` } as PunchItem;
      setItems((prev) => [fallback, ...prev]);
      setFeedback(`Optimistic punch item logged: ${code}`);
    } finally {
      setModalOpen(false);
      setLocation("");
      setDesc("");
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handleCloseItem = async (id: string) => {
    try {
      await (supabase as any)
        .from("field_punch_list_items")
        .update({ status: "CLOSED_VERIFIED" })
        .eq("id", id);
    } catch {
      // optimistic
    }

    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, status: "CLOSED_VERIFIED" } : i))
    );
    setFeedback("Defect verified and marked closed.");
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>FIELD QUALITY CONTROL • DEFECT LOGGING &amp; RECTIFICATION SLA</span>
              <StatutoryInfo
                standardRef="CPWD MANUAL SECTION 20 / ISO 9001"
                title="Field Punch List & Remediation Tracking"
                idealRange="Critical Defects SLA: < 48 Hours"
                description="Field snagging ledger for logging concrete honeycombing, joint misalignments, MEP clashes, and finishing defects directly to subcontractors."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-cyan-400" />
              <span>Field Punch List &amp; Defect Registry</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Real-time defect tagging, severity tracking, and contractor rectification gates.
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
              onClick={() => void loadItems()}
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
              <span>Tag Punch Item</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 3 SUMMARY TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Punch Items</span>
            <div className="text-2xl font-bold text-white mt-1">{items.length} Defects</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Documented across site trades</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Pending Remediation</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{summary.open} Open</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Awaiting contractor work</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Critical Defects</span>
            <div className={`text-2xl font-bold mt-1 ${summary.critical > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {summary.critical} Urgent
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Mandatory 48-hour resolution SLA</span>
          </div>
        </div>

        {/* LIST */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
            Field Snag Log ({items.length})
          </span>

          <div className="divide-y divide-zinc-800/60">
            {items.map((i) => {
              const isClosed = i.status === "CLOSED_VERIFIED";
              return (
                <div key={i.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{i.item_code}</span>
                      <span className="text-cyan-400 text-xs font-bold">&bull; {i.location_grid}</span>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase border ${
                        i.severity === "CRITICAL"
                          ? "bg-rose-950 text-rose-400 border-rose-800"
                          : "bg-amber-950 text-amber-400 border-amber-800"
                      }`}>
                        {i.severity}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-200 font-sans leading-relaxed">{i.defect_description}</p>
                    <div className="text-[10px] text-zinc-500">
                      Contractor: <strong className="text-zinc-400">{i.contractor_name}</strong> &bull; Target: {i.target_rectification_date}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      isClosed
                        ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                        : "bg-amber-950 text-amber-400 border-amber-800"
                    }`}>
                      {i.status.replace(/_/g, " ")}
                    </span>

                    {!isClosed && (
                      <button
                        type="button"
                        onClick={() => handleCloseItem(i.id)}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase rounded transition"
                      >
                        Verify &amp; Close
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Tag Field Punch List Defect</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Grid Coordinate / Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Level 14 - Column Junction D4"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Trade Package</label>
                    <select
                      value={trade}
                      onChange={(e) => setTrade(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                    >
                      <option value="Civil & Superstructure">Civil &amp; Superstructure</option>
                      <option value="MEP / HVAC">MEP / HVAC</option>
                      <option value="Finishes & Fitouts">Finishes &amp; Fitouts</option>
                      <option value="Waterproofing">Waterproofing</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Severity</label>
                    <select
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                    >
                      <option value="CRITICAL">Critical (Blocks Pour / Safety)</option>
                      <option value="MAJOR">Major (Fix within 7 days)</option>
                      <option value="MINOR">Minor (Cosmetic Blemish)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Assigned Subcontractor</label>
                  <input
                    type="text"
                    placeholder="e.g. Apex Structural Formworks Ltd."
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Defect Description *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Detail the non-conformance and required corrective action..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Commit Defect Ticket
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
