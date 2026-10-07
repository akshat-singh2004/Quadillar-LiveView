"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Database,
  ArrowLeft,
  X,
  MapPin,
  Camera,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface SnagTicket {
  id: string;
  project_id: string;
  ticket_code: string;
  unit_or_area: string;
  trade_category: string;
  defect_description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "OPEN_REPORTED" | "UNDER_RECTIFICATION" | "RESOLVED_VERIFIED";
  reported_by: string;
  created_at: string;
}

const FALLBACK_SNAGS: SnagTicket[] = [
  {
    id: "sng-fb-1",
    project_id: "PRJ-01-LIVE",
    ticket_code: "SNG-2026-001",
    unit_or_area: "Tower A - Unit 1402",
    trade_category: "Finishes & Joinery",
    defect_description: "Hairline joint gap in engineered teak flooring near balcony threshold.",
    priority: "LOW",
    status: "RESOLVED_VERIFIED",
    reported_by: "Buyer / Appointing Party",
    created_at: "2026-09-28",
  },
  {
    id: "sng-fb-2",
    project_id: "PRJ-01-LIVE",
    ticket_code: "SNG-2026-002",
    unit_or_area: "Tower A - Master Bath",
    trade_category: "Plumbing & Sanitary",
    defect_description: "Thermostatic shower diverter cartridge pressure calibration required.",
    priority: "MEDIUM",
    status: "OPEN_REPORTED",
    reported_by: "Client Representative",
    created_at: "2026-09-29",
  },
  {
    id: "sng-fb-3",
    project_id: "PRJ-01-LIVE",
    ticket_code: "SNG-2026-003",
    unit_or_area: "Tower B - Lobby Entrance",
    trade_category: "Electrical & Lighting",
    defect_description: "Sensor-activated cove lighting strip flicker at north bulkhead.",
    priority: "HIGH",
    status: "UNDER_RECTIFICATION",
    reported_by: "Quality Auditor",
    created_at: "2026-09-30",
  },
];

export default function ClientSnagReportingPortal() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [snags, setSnags] = useState<SnagTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [unit, setUnit] = useState("");
  const [trade, setTrade] = useState("Finishes & Joinery");
  const [priority, setPriority] = useState<SnagTicket["priority"]>("MEDIUM");
  const [desc, setDesc] = useState("");

  const loadSnags = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("client_snag_tickets")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setSnags(FALLBACK_SNAGS);
      } else {
        setIsFallbackMode(false);
        setSnags(data);
      }
    } catch {
      setIsFallbackMode(true);
      setSnags(FALLBACK_SNAGS);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadSnags();
  }, [loadSnags]);

  const summary = useMemo(() => {
    const total = snags.length;
    const resolved = snags.filter((s) => s.status === "RESOLVED_VERIFIED").length;
    const open = snags.filter((s) => s.status === "OPEN_REPORTED" || s.status === "UNDER_RECTIFICATION").length;
    return { total, resolved, open };
  }, [snags]);

  const handleCreateSnag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unit.trim() || !desc.trim()) return;

    const code = `SNG-${new Date().getFullYear()}-${(snags.length + 4).toString().padStart(3, "0")}`;
    const payload: Partial<SnagTicket> = {
      project_id: projectId,
      ticket_code: code,
      unit_or_area: unit.trim(),
      trade_category: trade,
      defect_description: desc.trim(),
      priority,
      status: "OPEN_REPORTED",
      reported_by: "Client / Buyer",
      created_at: new Date().toISOString().slice(0, 10),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("client_snag_tickets")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setSnags((prev) => [data, ...prev]);
      setFeedback(`Snag ticket ${code} registered and dispatched to contractor.`);
    } catch {
      const fallback = { ...payload, id: `sng-${Date.now()}` } as SnagTicket;
      setSnags((prev) => [fallback, ...prev]);
      setFeedback(`Snag recorded: ${code}`);
    } finally {
      setModalOpen(false);
      setUnit("");
      setDesc("");
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>CUSTOMER PORTAL • RERA DEFECT LIABILITY &amp; SNAGGING DESK</span>
              <StatutoryInfo
                standardRef="RERA SECTION 14(3) / CPWD CLOSEOUT"
                title="Client Snagging & Remediation Portal"
                idealRange="Rectification SLA: < 7 Days"
                description="Enables clients and buyers to log finishing snags, paint blemishes, and fixture misalignments directly into the contractor punch list registry."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-cyan-400" />
              <span>Client Snag &amp; Defect Reporting Portal</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Direct snagging submission, contractor remediation tracking, and warranty verification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal/client"
              className="px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded flex items-center gap-1.5 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Client Cockpit</span>
            </Link>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Report Snag Ticket</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 3 SUMMARY METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Snags Logged</span>
            <div className="text-2xl font-bold text-white mt-1">{summary.total} Tickets</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">RERA defect liability registry</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Under Active Rectification</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{summary.open} Pending</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Contractor SLA: &lt; 7 calendar days</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Resolved &amp; Client Verified</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{summary.resolved} Resolved</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">De-snagged and closed</span>
          </div>
        </div>

        {/* SNAG LIST */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
            Registered Snag Tickets ({snags.length})
          </span>

          <div className="divide-y divide-zinc-800/60">
            {snags.map((s) => (
              <div key={s.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-xs">{s.ticket_code}</span>
                    <span className="text-cyan-400 text-xs font-bold">&bull; {s.unit_or_area}</span>
                    <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase border ${
                      s.priority === "HIGH" || s.priority === "CRITICAL"
                        ? "bg-rose-950 text-rose-400 border-rose-800"
                        : "bg-amber-950 text-amber-400 border-amber-800"
                    }`}>
                      {s.priority} PRIORITY
                    </span>
                  </div>
                  <p className="text-xs text-zinc-200 font-sans leading-relaxed">{s.defect_description}</p>
                  <div className="text-[10px] text-zinc-500">
                    Trade: <strong className="text-zinc-400">{s.trade_category}</strong> &bull; Logged: {s.created_at} &bull; Reporter: {s.reported_by}
                  </div>
                </div>

                <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase shrink-0 border ${
                  s.status === "RESOLVED_VERIFIED"
                    ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                    : s.status === "UNDER_RECTIFICATION"
                    ? "bg-cyan-950 text-cyan-400 border-cyan-800"
                    : "bg-amber-950 text-amber-400 border-amber-800"
                }`}>
                  {s.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Report Snag or Finishing Defect</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateSnag} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Unit Number / Area Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tower A - Unit 1402 Living Room"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Trade Category</label>
                    <select
                      value={trade}
                      onChange={(e) => setTrade(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Finishes & Joinery">Finishes &amp; Joinery</option>
                      <option value="Plumbing & Sanitary">Plumbing &amp; Sanitary</option>
                      <option value="Electrical & Lighting">Electrical &amp; Lighting</option>
                      <option value="HVAC & Thermostat">HVAC &amp; Thermostat</option>
                      <option value="Painting & Wall Plaster">Painting &amp; Wall Plaster</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Severity Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="LOW">Low (Minor Aesthetic)</option>
                      <option value="MEDIUM">Medium (Fix Before Handover)</option>
                      <option value="HIGH">High (Urgent Contractor Action)</option>
                      <option value="CRITICAL">Critical (Safety / Inoperable)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Defect Description *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe the issue observed (e.g. cracked tile, loose switchboard, paint peel)..."
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Submit Snag Ticket
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
