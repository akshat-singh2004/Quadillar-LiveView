"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Gavel,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Scale,
  Calendar,
  AlertTriangle,
  Database,
  ArrowRight,
  ShieldAlert,
  FileCheck2,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface ContractClaimRecord {
  id: string;
  project_id: string;
  claim_number: string;
  title: string;
  claimant: string;
  clause_citation: string;
  cause_category: "Variation" | "Delay / Disruption" | "Late Information" | "Force Majeure" | "Payment";
  claimed_delay_days: number;
  claimed_cost_inr: number;
  approved_delay_days?: number | null;
  approved_cost_inr?: number | null;
  status: "Submitted" | "Under Assessment" | "Determined" | "Disputed";
  determination_notes?: string | null;
  submitted_at: string;
  determined_at?: string | null;
}

const FALLBACK_CLAIMS: ContractClaimRecord[] = [
  {
    id: "clm-fb-1",
    project_id: "PRJ-01-LIVE",
    claim_number: "CLM-024",
    title: "Late structural IFC drawing release for Podium B Core",
    claimant: "Apex Structural Formworks Ltd.",
    clause_citation: "FIDIC Cl. 1.9 / CPWD Cl. 5",
    cause_category: "Late Information",
    claimed_delay_days: 21,
    claimed_cost_inr: 1850000,
    approved_delay_days: null,
    approved_cost_inr: null,
    status: "Under Assessment",
    submitted_at: "2026-08-12",
  },
  {
    id: "clm-fb-2",
    project_id: "PRJ-01-LIVE",
    claim_number: "CLM-023",
    title: "Exceptional monsoon precipitation disruption to basement dewatering",
    claimant: "Thermax MEP Solutions",
    clause_citation: "FIDIC Cl. 8.5 / CPWD Cl. 5.2",
    cause_category: "Force Majeure",
    claimed_delay_days: 14,
    claimed_cost_inr: 4200000,
    approved_delay_days: 8,
    approved_cost_inr: 1800000,
    status: "Determined",
    determination_notes: "Rainfall records authenticated by IMD. Critical path delay recognized for 8 calendar days.",
    submitted_at: "2026-08-05",
    determined_at: "2026-08-18",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function ClaimsDisputesPage() {
  const { project, role } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [claims, setClaims] = useState<ContractClaimRecord[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ContractClaimRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [targetDate, setTargetDate] = useState("2026-12-31");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [claimTitle, setClaimTitle] = useState("");
  const [claimantName, setClaimantName] = useState("");
  const [clause, setClause] = useState("FIDIC Cl. 8.4 (Extension of Time)");
  const [cause, setCause] = useState<ContractClaimRecord["cause_category"]>("Delay / Disruption");
  const [claimedDays, setClaimedDays] = useState("14");
  const [claimedCost, setClaimedCost] = useState("");

  const loadClaims = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("contract_claims")
        .select("*")
        .eq("project_id", projectId)
        .order("submitted_at", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setClaims(FALLBACK_CLAIMS);
        setSelectedClaim(FALLBACK_CLAIMS[0]);
      } else {
        setIsFallbackMode(false);
        setClaims(data);
        setSelectedClaim(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setClaims(FALLBACK_CLAIMS);
      setSelectedClaim(FALLBACK_CLAIMS[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadClaims();
  }, [loadClaims]);

  const approvedDays = useMemo(() => {
    return claims.reduce((total, c) => total + (c.approved_delay_days || 0), 0);
  }, [claims]);

  const revisedTargetDate = useMemo(() => {
    const d = new Date(targetDate);
    d.setDate(d.getDate() + approvedDays);
    return d.toISOString().slice(0, 10);
  }, [targetDate, approvedDays]);

  const summary = useMemo(() => {
    const totalCount = claims.length;
    const claimedCostTotal = claims.reduce((sum, c) => sum + Number(c.claimed_cost_inr || 0), 0);
    const approvedCostTotal = claims.reduce((sum, c) => sum + Number(c.approved_cost_inr || 0), 0);
    const pendingAssessment = claims.filter((c) => c.status === "Submitted" || c.status === "Under Assessment").length;

    return { totalCount, claimedCostTotal, approvedCostTotal, pendingAssessment };
  }, [claims]);

  const filteredClaims = useMemo(() => {
    if (!search.trim()) return claims;
    const term = search.toLowerCase();
    return claims.filter(
      (c) =>
        c.claim_number.toLowerCase().includes(term) ||
        c.title.toLowerCase().includes(term) ||
        c.claimant.toLowerCase().includes(term) ||
        c.clause_citation.toLowerCase().includes(term)
    );
  }, [claims, search]);

  const handleCreateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimTitle.trim() || !claimantName.trim()) return;

    setSubmitting(true);
    const code = `CLM-${(claims.length + 25).toString().padStart(3, "0")}`;

    const payload: Partial<ContractClaimRecord> = {
      project_id: projectId,
      claim_number: code,
      title: claimTitle.trim(),
      claimant: claimantName.trim(),
      clause_citation: clause.trim(),
      cause_category: cause,
      claimed_delay_days: parseInt(claimedDays, 10) || 0,
      claimed_cost_inr: parseFloat(claimedCost) || 0,
      status: "Submitted",
      submitted_at: new Date().toISOString().slice(0, 10),
    };

    try {
      const { data, error } = await (supabase as any)
        .from("contract_claims")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setClaims((prev) => [data, ...prev]);
      setSelectedClaim(data);
      setFeedback(`Claim notice ${code} registered successfully.`);
    } catch {
      const fallback = { ...payload, id: `clm-${Date.now()}` } as ContractClaimRecord;
      setClaims((prev) => [fallback, ...prev]);
      setSelectedClaim(fallback);
      setFeedback(`Optimistic claim recorded: ${code}`);
    } finally {
      setModalOpen(false);
      setClaimTitle("");
      setClaimantName("");
      setClaimedCost("");
      setSubmitting(false);
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
              <span>CONTRACTS ADMINISTRATION • FIDIC CL. 20.1 / CPWD GCC CL. 25 DISPUTES</span>
              <StatutoryInfo
                standardRef="FIDIC RED BOOK CL. 20.1 / CPWD CL. 25"
                title="Claims, Entitlement & Extension of Time (EOT)"
                idealRange="Notice within 28 Days of Event"
                description="Governs contractor entitlement claims for delays and compensation. Mandates submission of notice within 28 days of event occurrence and contemporary records substantiation."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Gavel className="w-6 h-6 text-cyan-400" />
              <span>Claims, Disputes &amp; Extension of Time (EOT)</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Statutory delay assessments, compensation determinations, and baseline completion date governance.
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
              onClick={() => void loadClaims()}
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
              <span>Log Contract Claim</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Claims Logged</span>
            <div className="text-2xl font-bold text-white mt-1">
              {loading ? "--" : `${summary.totalCount} Claims`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Contemporary dispute notifications</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Claimed Financial Exposure</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {loading ? "--" : formatInr(summary.claimedCostTotal)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Contractor compensation demands</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Granted EOT Days</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {loading ? "--" : `+${approvedDays} Calendar Days`}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Revised Target: <strong className="text-zinc-300">{revisedTargetDate}</strong></span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Determined Compensation</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {loading ? "--" : formatInr(summary.approvedCostTotal)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Sanctioned by Engineer / SEOR</span>
          </div>
        </div>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* CLAIMS TABLE (8 cols) */}
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase">Dispute &amp; EOT Ledger ({filteredClaims.length})</span>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Filter claims, clause..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 pl-8 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50"
                />
              </div>
            </div>

            {loading ? (
              <div className="p-12 text-center text-zinc-500">Loading claims ledger...</div>
            ) : filteredClaims.length === 0 ? (
              <div className="p-12 text-center text-zinc-500">No contract claims recorded.</div>
            ) : (
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full text-left">
                  <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                    <tr>
                      <th className="p-3">Claim Ref &amp; Cause</th>
                      <th className="p-3">Clause Citation</th>
                      <th className="p-3 text-right">Claimed Delay / Cost</th>
                      <th className="p-3 text-right">Approved Delay / Cost</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                    {filteredClaims.map((c) => {
                      const isSelected = selectedClaim?.id === c.id;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedClaim(c)}
                          className={`hover:bg-zinc-900/50 transition cursor-pointer ${
                            isSelected ? "bg-cyan-950/20" : ""
                          }`}
                        >
                          <td className="p-3">
                            <span className="font-bold text-white block">{c.claim_number} &mdash; {c.title}</span>
                            <span className="text-[10px] text-cyan-400">{c.claimant} &bull; {c.cause_category}</span>
                          </td>
                          <td className="p-3 text-zinc-300 font-mono text-[11px]">{c.clause_citation}</td>
                          <td className="p-3 text-right font-mono">
                            <div className="text-amber-400 font-bold">{c.claimed_delay_days} Days</div>
                            <div className="text-zinc-500 text-[10px]">{formatInr(c.claimed_cost_inr)}</div>
                          </td>
                          <td className="p-3 text-right font-mono">
                            <div className="text-emerald-400 font-bold">{c.approved_delay_days != null ? `+${c.approved_delay_days} Days` : "--"}</div>
                            <div className="text-zinc-400 text-[10px]">{c.approved_cost_inr != null ? formatInr(c.approved_cost_inr) : "--"}</div>
                          </td>
                          <td className="p-3 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                              c.status === "Determined"
                                ? "bg-emerald-950 text-emerald-400 border-emerald-800"
                                : c.status === "Disputed"
                                ? "bg-rose-950 text-rose-400 border-rose-800"
                                : "bg-amber-950 text-amber-400 border-amber-800"
                            }`}>
                              {c.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT: EOT DETERMINATION PANEL (4 cols) */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="border-b border-zinc-800 pb-2">
              <span className="text-[10px] uppercase text-cyan-400 font-bold block">FIDIC Cl. 20.1 Determination</span>
              <h3 className="text-sm font-bold text-white mt-0.5">EOT &amp; Entitlement Evaluation</h3>
            </div>

            {selectedClaim ? (
              <div className="space-y-3">
                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase">Selected Claim:</span>
                  <div className="text-xs font-bold text-white">{selectedClaim.claim_number}: {selectedClaim.title}</div>
                  <div className="text-[10px] text-zinc-400">Claimant: {selectedClaim.claimant}</div>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Claimed Days:</span>
                    <strong className="text-amber-400">{selectedClaim.claimed_delay_days} Calendar Days</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Claimed Cost:</span>
                    <strong className="text-amber-400">{formatInr(selectedClaim.claimed_cost_inr)}</strong>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-zinc-850">
                    <span className="text-zinc-500">Sanctioned EOT:</span>
                    <strong className="text-emerald-400">{selectedClaim.approved_delay_days ?? 0} Days</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Sanctioned Cost:</span>
                    <strong className="text-emerald-400">{formatInr(selectedClaim.approved_cost_inr || 0)}</strong>
                  </div>
                </div>

                {selectedClaim.determination_notes && (
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded text-[11px] text-zinc-300 font-sans leading-relaxed">
                    <strong className="text-cyan-400 block font-mono text-[10px] uppercase mb-1">Engineer Finding:</strong>
                    {selectedClaim.determination_notes}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-600">Select a claim to review statutory assessment details.</div>
            )}

            <div className="pt-2 border-t border-zinc-800 space-y-2">
              <label className="text-[10px] text-zinc-400 block">Baseline Contract Completion Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded text-white text-xs"
              />
              <div className="p-2.5 bg-emerald-950/40 border border-emerald-800 rounded text-center text-xs">
                <span className="text-[10px] text-zinc-400 block uppercase">Revised Contract Target Date</span>
                <strong className="text-emerald-400 text-sm">{revisedTargetDate}</strong>
              </div>
            </div>
          </div>

        </div>

        {/* LOG CLAIM MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Register Notice of Contract Claim (FIDIC Cl. 20.1)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateClaim} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Claim Subject / Event Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unforeseen Subsurface Rock Intrusion at Zone 3"
                    value={claimTitle}
                    onChange={(e) => setClaimTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Claimant Entity *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Structural Formworks"
                      value={claimantName}
                      onChange={(e) => setClaimantName(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Cause Classification</label>
                    <select
                      value={cause}
                      onChange={(e) => setCause(e.target.value as any)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Delay / Disruption">Delay / Disruption</option>
                      <option value="Late Information">Late Information</option>
                      <option value="Force Majeure">Force Majeure</option>
                      <option value="Variation">Variation Dispute</option>
                      <option value="Payment">Payment Default</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Contract Clause Citation</label>
                    <input
                      type="text"
                      required
                      value={clause}
                      onChange={(e) => setClause(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Claimed Delay (Days)</label>
                    <input
                      type="number"
                      required
                      value={claimedDays}
                      onChange={(e) => setClaimedDays(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Claimed Financial Quantum (₹)</label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={claimedCost}
                    onChange={(e) => setClaimedCost(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-emerald-400 font-bold focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded disabled:opacity-50">
                    {submitting ? "Logging..." : "Submit Claim Notice"}
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
