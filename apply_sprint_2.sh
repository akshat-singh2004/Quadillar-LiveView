#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Applying Sprint 2 fixes: Claims, Taking-Over (TOC), and Contract Analyzer...\033[0m"

# -----------------------------------------------------------------------------
# 1. FIX: app/contracts/claims/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_CLAIMS' > app/contracts/claims/page.tsx
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
PAGE_CLAIMS

# -----------------------------------------------------------------------------
# 2. FIX: app/contracts/taking-over/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_TOC' > app/contracts/taking-over/page.tsx
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
PAGE_TOC

# -----------------------------------------------------------------------------
# 3. FIX: app/contracts/analyzer/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_ANALYZER' > app/contracts/analyzer/page.tsx
"use client";

import React, { useState } from "react";
import {
  FileText,
  AlertTriangle,
  ShieldCheck,
  Search,
  Scale,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

interface ClauseItem {
  id: string;
  clause_no: string;
  heading: string;
  source_framework: "FIDIC_RED_BOOK" | "CPWD_GCC_2023";
  risk_level: "HIGH" | "MEDIUM" | "LOW";
  original_text: string;
  deviation_finding: string;
  contractor_exposure: string;
}

const CLAUSE_DATABASE: ClauseItem[] = [
  {
    id: "cl-1",
    clause_no: "Clause 10B",
    heading: "Mobilization Advance & Interest Recovery",
    source_framework: "CPWD_GCC_2023",
    risk_level: "MEDIUM",
    original_text: "Simple interest @ 10% per annum shall be charged on the advance, recoverable pro-rata from Running Account bills.",
    deviation_finding: "Admissible per CPWD rules. Amortization must start when gross work reaches 10% of tender value.",
    contractor_exposure: "Interest burden recoverable if billing schedule slips beyond critical path float.",
  },
  {
    id: "cl-2",
    clause_no: "Clause 12",
    heading: "Deviations, Variations & Rate Derivation",
    source_framework: "CPWD_GCC_2023",
    risk_level: "HIGH",
    original_text: "Deviation limit of 30% for building works. Beyond deviation limit, market rates per CPWD DAR shall apply.",
    deviation_finding: "Tender includes onerous condition capping contractor market overhead to 10% instead of standard 15%.",
    contractor_exposure: "Severe commercial exposure on foundation excavation quantities exceeding 30% baseline.",
  },
  {
    id: "cl-3",
    clause_no: "Clause 20.1",
    heading: "Contractor Claims & 28-Day Notice Bar",
    source_framework: "FIDIC_RED_BOOK",
    risk_level: "HIGH",
    original_text: "If the Contractor fails to give notice of a claim within 28 days, the Employer is discharged from all liability.",
    deviation_finding: "Strict condition precedent. Barring clause legally enforceable under Indian Contract Act Section 28.",
    contractor_exposure: "Complete forfeiture of financial entitlement and EOT if notice is delayed beyond 28 days.",
  },
  {
    id: "cl-4",
    clause_no: "Clause 2",
    heading: "Liquidated Damages for Delay (LD Capping)",
    source_framework: "CPWD_GCC_2023",
    risk_level: "LOW",
    original_text: "Compensation for delay shall be @ 1.5% per month of delay computed on daily basis, subject to a maximum of 10%.",
    deviation_finding: "Standard CPWD clause with capped 10% exposure. No uncapped delay damages.",
    contractor_exposure: "Liability strictly capped at 10% of contract value.",
  },
];

export default function ContractAnalyzerPage() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [activeClause, setActiveClause] = useState<ClauseItem>(CLAUSE_DATABASE[1]);

  const filtered = CLAUSE_DATABASE.filter((c) => {
    const matchFilter = selectedFilter === "ALL" || c.risk_level === selectedFilter;
    const matchSearch =
      !search.trim() ||
      c.clause_no.toLowerCase().includes(search.toLowerCase()) ||
      c.heading.toLowerCase().includes(search.toLowerCase()) ||
      c.deviation_finding.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>CONTRACT INTELLIGENCE • AI CLAUSE AUDIT &amp; DEVIATION ENGINE</span>
              <StatutoryInfo
                standardRef="FIDIC RED BOOK & CPWD GCC 2023"
                title="AI Contract Specification & Risk Analyzer"
                idealRange="Risk Tolerance: Low to Moderate"
                description="Cross-references tender clauses against FIDIC / CPWD benchmarks to identify latent commercial risks, time-bar hazards, and deviation limit exposures."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              <span>AI Contract Clause &amp; Tender Specification Analyzer</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Automated legal risk audit: clause-by-clause exposure assessment, statutory deviation analysis, and dispute mitigation recommendations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-800 text-[10px] text-cyan-300">
              Active Benchmark: CPWD GCC 2023 / FIDIC Red Book
            </span>
          </div>
        </header>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* CLAUSE LIST (5 cols) */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase">Clause Risk Matrix ({filtered.length})</span>
              <div className="flex items-center gap-1.5">
                {["ALL", "HIGH", "MEDIUM", "LOW"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedFilter(level)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedFilter === level
                        ? "bg-cyan-500 text-zinc-950"
                        : "bg-zinc-900 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              {filtered.map((c) => {
                const isSelected = activeClause.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveClause(c)}
                    className={`p-3.5 rounded border transition cursor-pointer space-y-1.5 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{c.clause_no}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          c.risk_level === "HIGH"
                            ? "bg-rose-950 text-rose-400 border-rose-800"
                            : c.risk_level === "MEDIUM"
                            ? "bg-amber-950 text-amber-400 border-amber-800"
                            : "bg-emerald-950 text-emerald-400 border-emerald-800"
                        }`}
                      >
                        {c.risk_level} RISK
                      </span>
                    </div>
                    <div className="text-zinc-300 font-bold">{c.heading}</div>
                    <div className="text-[10px] text-zinc-500">{c.source_framework.replace(/_/g, " ")}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: CLAUSE DETAIL & RISK ASSESSMENT (7 cols) */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 p-6 space-y-5 rounded-sm shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase text-cyan-400 font-bold">Clause Deep-Dive Audit</span>
                <h3 className="text-sm font-bold text-white mt-0.5">{activeClause.clause_no} &mdash; {activeClause.heading}</h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  activeClause.risk_level === "HIGH"
                    ? "bg-rose-950 text-rose-400 border-rose-800"
                    : "bg-amber-950 text-amber-400 border-amber-800"
                }`}
              >
                {activeClause.risk_level} EXPOSURE
              </span>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-1.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Contract Tender Specification Text:</span>
                <p className="text-xs text-zinc-200 font-sans italic leading-relaxed">
                  &ldquo;{activeClause.original_text}&rdquo;
                </p>
              </div>

              <div className="p-4 bg-amber-950/20 border border-amber-800/50 rounded space-y-1.5">
                <span className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Statutory Deviation Finding:</span>
                </span>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {activeClause.deviation_finding}
                </p>
              </div>

              <div className="p-4 bg-rose-950/20 border border-rose-800/50 rounded space-y-1.5">
                <span className="text-[10px] text-rose-400 uppercase font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Commercial &amp; Financial Exposure Assessment:</span>
                </span>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {activeClause.contractor_exposure}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 text-center">
              Benchmarked against standard FIDIC Conditions of Contract &amp; CPWD General Conditions of Contract 2023.
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
PAGE_ANALYZER

echo -e "\033[1;32m[✓] Sprint 2 patched successfully! All 3 files updated.\033[0m"
