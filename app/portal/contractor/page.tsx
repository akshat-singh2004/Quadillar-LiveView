"use client";

import React, { useEffect, useState, useMemo, useCallback, FormEvent } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileText,
  HardHat,
  Layers,
  MessageSquare,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Truck,
  Upload
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { PourCardDetailModal, type ConcretePourCardRecord } from "@/components/quality/PourCardDetailModal";

interface MaterialSubmittalItem {
  id: string;
  project_id: string;
  submittal_code: string;
  title: string;
  trade: string;
  spec_section: string;
  sample_status: "Under_Review" | "Approved" | "Rejected" | "Revise_Resubmit";
  contractor_name: string;
  submitted_date: string;
  approved_by?: string | null;
}

export default function ContractorPortalPage() {
  const { project, role, tier } = useActiveRole();
  const [pourCards, setPourCards] = useState<ConcretePourCardRecord[]>([]);
  const [submittals, setSubmittals] = useState<MaterialSubmittalItem[]>([]);
  const [selectedPour, setSelectedPour] = useState<ConcretePourCardRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Quick Site Query (RFI) Form State
  const [rfiTitle, setRfiTitle] = useState("");
  const [rfiDescription, setRfiDescription] = useState("");
  const [rfiBusy, setRfiBusy] = useState(false);
  const [rfiSuccess, setRfiSuccess] = useState(false);

  const loadContractorData = useCallback(async () => {
    try {
      const [{ data: pours }, { data: subs }] = await Promise.all([
        supabase.from("pour_cards").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
        supabase.from("material_submittals").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
      ]);

      if (pours) setPourCards(pours as ConcretePourCardRecord[]);
      if (subs) setSubmittals(subs as MaterialSubmittalItem[]);
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    void loadContractorData();

    const channel = supabase
      .channel(`contractor_hub_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pour_cards" }, () => void loadContractorData())
      .on("postgres_changes", { event: "*", schema: "public", table: "material_submittals" }, () => void loadContractorData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadContractorData]);

  // Submit Technical Site Query (RFI)
  const handleSubmitRfi = async (e: FormEvent) => {
    e.preventDefault();
    if (!rfiTitle.trim() || !rfiDescription.trim()) return;

    setRfiBusy(true);
    await supabase.from("drawing_spatial_pins").insert([{
      project_id: project.id,
      sheet_no: tier === "RESIDENTIAL" ? "INT-DET-01" : "GFC-STR-02-101",
      x_pct: 50.0,
      y_pct: 50.0,
      pin_type: "RFI",
      label: rfiTitle.trim(),
      description: rfiDescription.trim(),
      grid_reference: "Site Request",
      status: "OPEN",
    }]);

    setRfiTitle("");
    setRfiDescription("");
    setRfiBusy(false);
    setRfiSuccess(true);
    setTimeout(() => setRfiSuccess(false), 3500);
  };

  const openHoldCards = pourCards.filter((p) => p.status === "Hold").length;
  const approvedSubmittals = submittals.filter((s) => s.sample_status === "Approved").length;

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING CONTRACTOR EXECUTION WORKBENCH...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1500px] space-y-6">
        
        {/* WORKBENCH TOP BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Site Execution Workbench</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Contractor Execution Hub
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Field hold-point inspections, sample submittals, and verified Good For Construction (GFC) drawing downloads.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => void loadContractorData()}
              className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition"
              title="Refresh Workbench"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs font-semibold">
              Trade Persona: <strong className="text-cyan-400">{role.label}</strong>
            </span>
          </div>
        </div>

        {/* 4 FIELD EXECUTION INDICATORS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Inspection Cards</span>
              <FileCheck className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-2">
              {pourCards.length} Cards
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              {openHoldCards} waiting on consultant hold-points
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Approved Submittals</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
              {approvedSubmittals} / {submittals.length}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Architect physical samples sealed
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Latest GFC Revisions</span>
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white mt-2">
              REV C Active
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Zero uncoordinated sheet versions
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Next Billing Cutoff</span>
              <Clock className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-300 mt-2">
              5 Days Left
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">
              Submit MB claims prior to 25th
            </div>
          </div>
        </div>

        {/* 2-COLUMN SPLIT: FIELD INSPECTION GATES (LEFT) vs QUICK SITE QUERY DESK (RIGHT) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT: POUR CARDS & INSPECTION REQUESTS (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  {tier === "RESIDENTIAL" ? "Work Inspection Requests (WIR)" : "Concrete Pour Cards (IS 456)"}
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">
                  Pre-Pour Hold Points & Clearances
                </h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{pourCards.length} Active Records</span>
            </div>

            <div className="space-y-3">
              {pourCards.map((pour) => (
                <div
                  key={pour.id}
                  className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 hover:border-zinc-700 transition flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-zinc-200">
                        {pour.pour_number}
                      </span>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                        pour.status === "Cleared"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                          : "bg-rose-950 text-rose-400 border border-rose-800/50 animate-pulse"
                      }`}>
                        {pour.status}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-white">
                      {pour.location}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono">
                      {pour.grade} · Assigned: {pour.contractor_name}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedPour(pour)}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition"
                  >
                    Inspect Hold Gates
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: TECHNICAL SITE QUERY (RFI) INTAKE (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3 mb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                    Fast-Track Clarification
                  </span>
                  <h2 className="text-sm font-bold text-white mt-0.5">
                    Submit Field Query (RFI)
                  </h2>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">
                  Direct to Architect Queue
                </span>
              </div>

              <form onSubmit={handleSubmitRfi} className="space-y-3 text-xs">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Issue Subject</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Beam drop clashes with sprinkler pipe"
                    value={rfiTitle}
                    onChange={(e) => setRfiTitle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Technical Doubt & Site Constraints</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide specific grid reference, elevation, or architectural dimension clarification required..."
                    value={rfiDescription}
                    onChange={(e) => setRfiDescription(e.target.value)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-cyan-400 resize-none"
                  />
                </div>

                <div className="p-3 rounded-lg border border-dashed border-zinc-800 bg-zinc-900/30 text-center text-zinc-500 cursor-pointer hover:border-zinc-700 transition">
                  <Upload className="w-4 h-4 mx-auto mb-1 text-zinc-400" />
                  <span className="text-[11px]">Attach site photo or sketch</span>
                </div>

                {rfiSuccess && (
                  <div className="p-2 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Query lodged. Spatially pinned to CDE drawing sheet.</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={rfiBusy}
                  className="w-full py-2.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{rfiBusy ? "Transmitting Query..." : "Lodge Technical Query"}</span>
                </button>
              </form>
            </div>

            <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px] text-zinc-500">
              <span>SLA Target: 48h consultant reply</span>
              <Link href="/drawings" className="text-cyan-400 hover:text-cyan-300 font-semibold">
                Open Drawing Viewer →
              </Link>
            </div>
          </div>

        </div>

        {/* MATERIAL SUBMITTALS & SAMPLE TRACKER */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
          <div className="border-b border-zinc-800/80 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                Material Submittal & Physical Sample Register
              </h2>
            </div>
            <span className="text-[11px] font-mono text-zinc-500">
              Architect Sign-off Before Site Delivery
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-zinc-800 bg-zinc-900/60 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3">Submittal Code</th>
                  <th className="px-5 py-3">Specification Item</th>
                  <th className="px-5 py-3">Trade</th>
                  <th className="px-5 py-3">Section</th>
                  <th className="px-5 py-3 text-center">Sample Status</th>
                  <th className="px-5 py-3 text-right">Approval Lead</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
                {submittals.map((sub) => (
                  <tr key={sub.id} className="hover:bg-zinc-900/40 transition">
                    <td className="px-5 py-3.5 font-bold text-white">
                      {sub.submittal_code}
                    </td>
                    <td className="px-5 py-3.5 font-sans font-medium text-zinc-200">
                      {sub.title}
                    </td>
                    <td className="px-5 py-3.5 font-sans text-zinc-400">
                      {sub.trade}
                    </td>
                    <td className="px-5 py-3.5 text-zinc-500">
                      {sub.spec_section}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        sub.sample_status === "Approved"
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                          : sub.sample_status === "Under_Review"
                          ? "bg-amber-950 text-amber-400 border border-amber-800/50"
                          : "bg-rose-950 text-rose-400 border border-rose-800/50"
                      }`}>
                        {sub.sample_status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right font-sans text-zinc-400">
                      {sub.approved_by ?? "Pending Review"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* POUR CARD DETAIL MODAL */}
      <PourCardDetailModal
        pour={selectedPour}
        onClose={() => setSelectedPour(null)}
        onUpdated={(updated) => {
          setPourCards((prev) => prev.map((p) => p.id === updated.id ? updated : p));
        }}
      />
    </main>
  );
}