"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  FileCheck2,
  Award,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  AlertTriangle,
  Database,
  Printer,
  X,
  Building2,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface TakingOverCertificateRecord {
  id: string;
  project_id: string;
  toc_number: string;
  package_name: string;
  contractor_name: string;
  work_order_ref: string;
  substantial_completion_date: string;
  dlp_period_months: number;
  dlp_end_date: string;
  retention_release_eligible_inr: number;
  outstanding_snags_count: number;
  status: "RECOMMENDED_SEOR" | "TOC_ISSUED_ACTIVE_DLP" | "FINAL_HANDOVER_DISCHARGED";
  certifying_engineer: string;
}

const FALLBACK_TOCS: TakingOverCertificateRecord[] = [
  {
    id: "toc-fb-1",
    project_id: "PRJ-01-LIVE",
    toc_number: "TOC-2026-001",
    package_name: "Tower A Substructure & Foundation Raft",
    contractor_name: "Apex Structural Formworks Ltd.",
    work_order_ref: "WO-TWR-101",
    substantial_completion_date: "2026-08-30",
    dlp_period_months: 12,
    dlp_end_date: "2027-08-30",
    retention_release_eligible_inr: 1725000,
    outstanding_snags_count: 0,
    status: "TOC_ISSUED_ACTIVE_DLP",
    certifying_engineer: "Resident SEOR / Consultant",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function TakingOverCertificatePage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [tocs, setTocs] = useState<TakingOverCertificateRecord[]>([]);
  const [selectedToc, setSelectedToc] = useState<TakingOverCertificateRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [packageName, setPackageName] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [woRef, setWoRef] = useState("WO-TWR-101");
  const [completionDate, setCompletionDate] = useState(new Date().toISOString().slice(0, 10));
  const [retentionAmount, setRetentionAmount] = useState("");

  const loadTocs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("taking_over_certificates")
        .select("*")
        .eq("project_id", projectId)
        .order("substantial_completion_date", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setTocs(FALLBACK_TOCS);
        setSelectedToc(FALLBACK_TOCS[0]);
      } else {
        setIsFallbackMode(false);
        setTocs(data);
        setSelectedToc(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setTocs(FALLBACK_TOCS);
      setSelectedToc(FALLBACK_TOCS[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadTocs();
  }, [loadTocs]);

  const summary = useMemo(() => {
    const totalCount = tocs.length;
    const activeDlpCount = tocs.filter((t) => t.status === "TOC_ISSUED_ACTIVE_DLP").length;
    const totalRetentionEligible = tocs.reduce((sum, t) => sum + Number(t.retention_release_eligible_inr || 0), 0);

    return { totalCount, activeDlpCount, totalRetentionEligible };
  }, [tocs]);

  const handleCreateToc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageName.trim() || !contractorName.trim()) return;

    const code = `TOC-${new Date().getFullYear()}-${(tocs.length + 1).toString().padStart(3, "0")}`;
    const dlpEnd = new Date(completionDate);
    dlpEnd.setFullYear(dlpEnd.getFullYear() + 1);

    const payload: Partial<TakingOverCertificateRecord> = {
      project_id: projectId,
      toc_number: code,
      package_name: packageName.trim(),
      contractor_name: contractorName.trim(),
      work_order_ref: woRef.trim(),
      substantial_completion_date: completionDate,
      dlp_period_months: 12,
      dlp_end_date: dlpEnd.toISOString().slice(0, 10),
      retention_release_eligible_inr: parseFloat(retentionAmount) || 0,
      outstanding_snags_count: 0,
      status: "TOC_ISSUED_ACTIVE_DLP",
      certifying_engineer: "Resident SEOR / Consultant",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("taking_over_certificates")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setTocs((prev) => [data, ...prev]);
      setSelectedToc(data);
      setFeedback(`Taking-Over Certificate ${code} issued successfully.`);
    } catch {
      const fallback = { ...payload, id: `toc-${Date.now()}` } as TakingOverCertificateRecord;
      setTocs((prev) => [fallback, ...prev]);
      setSelectedToc(fallback);
      setFeedback(`Optimistic TOC registered: ${code}`);
    } finally {
      setModalOpen(false);
      setPackageName("");
      setContractorName("");
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
              <span>CONTRACTS ADMINISTRATION • FIDIC CL. 10 / CPWD WORKS MANUAL SECTION 25</span>
              <StatutoryInfo
                standardRef="FIDIC RED BOOK CL. 10 / CPWD SEC. 25"
                title="Taking-Over Certificate (TOC) & Defects Liability Period"
                idealRange="DLP Warranty: 12 to 24 Months"
                description="Governs formal handover of completed packages from contractor to employer. Initiates the Defects Liability Period (DLP) and releases 50% of withheld contract retention funds."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-cyan-400" />
              <span>Taking-Over Certificate (TOC) &amp; DLP Ledger</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Substantial completion certificates, retention release clearance, and warranty management.
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
              onClick={() => void loadTocs()}
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
              <span>Issue Taking-Over Certificate</span>
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
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">TOC Issued Packages</span>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? "--" : `${summary.totalCount} Packages`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Substantially completed &amp; occupied</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active DLP Warranties</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "--" : `${summary.activeDlpCount} Active Warranties`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">12-month contractor defect liability</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Retention Eligible for Release</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {loading ? "--" : formatInr(summary.totalRetentionEligible)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">50% retention unblocked on TOC</span>
          </div>
        </div>

        {/* TOC ROSTER */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase text-xs">Handover Certificate Register ({tocs.length})</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-500">Loading certificate register...</div>
          ) : tocs.length === 0 ? (
            <div className="p-12 text-center text-zinc-500">No taking-over certificates recorded.</div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">TOC Ref &amp; Package</th>
                    <th className="p-3">Subcontractor</th>
                    <th className="p-3">Completion Date</th>
                    <th className="p-3">DLP Horizon</th>
                    <th className="p-3 text-right">Retention Release (₹)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {tocs.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-900/50 transition">
                      <td className="p-3">
                        <span className="font-bold text-white block">{t.toc_number}</span>
                        <span className="text-[10px] text-cyan-400">{t.package_name}</span>
                      </td>
                      <td className="p-3 text-zinc-300">{t.contractor_name}</td>
                      <td className="p-3 text-zinc-400 font-mono">{t.substantial_completion_date}</td>
                      <td className="p-3 text-zinc-400 font-mono">{t.dlp_end_date} (12m)</td>
                      <td className="p-3 text-right font-bold text-emerald-400 font-mono">
                        {formatInr(Number(t.retention_release_eligible_inr))}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {t.status.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ISSUE TOC MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Issue Taking-Over Certificate (FIDIC Cl. 10)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateToc} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Package Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Structural Concrete Core Level 1-15"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Subcontractor Entity *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Structural Formworks"
                      value={contractorName}
                      onChange={(e) => setContractorName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Parent Work Order Ref</label>
                    <input
                      type="text"
                      required
                      value={woRef}
                      onChange={(e) => setWoRef(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Substantial Completion Date</label>
                    <input
                      type="date"
                      required
                      value={completionDate}
                      onChange={(e) => setCompletionDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">50% Retention Release (₹)</label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={retentionAmount}
                      onChange={(e) => setRetentionAmount(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-zinc-900 rounded border border-zinc-800 text-[11px] text-zinc-400">
                  <span>Defects Liability: </span>
                  <strong className="text-cyan-400">12 Months statutory warranty</strong> will be initiated upon TOC sign-off.
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Issue TOC
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
