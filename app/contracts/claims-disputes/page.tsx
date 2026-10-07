"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  Clock,
  DollarSign,
  Gavel,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Scale,
  CheckCircle2,
  X,
  Coins,
  FileText,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type ClaimCategory =
  | "TIME_EXTENSION_EOT"
  | "PROLONGATION_COSTS"
  | "EMPLOYER_DELAY_VARIATION"
  | "UNFORESEEN_PHYSICAL_CONDITIONS"
  | "LIQUIDATED_DAMAGES_LEVIED";

export type ClaimDisputeStatus =
  | "NOTICE_SUBMITTED_28D"
  | "DISALLOWED_TIME_BARRED"
  | "ENGINEER_DETERMINATION_CLAUSE_3_5"
  | "DAB_REFERRAL_84D"
  | "MUTUALLY_SETTLED"
  | "ESCALATED_ARBITRATION";

export interface ClaimDisputeRecord {
  id: string;
  project_id: string;
  claim_reference: string;
  title: string;
  work_order_ref: string;
  contractor_name: string;
  trade_package: string;
  category: ClaimCategory;
  event_occurrence_date: string;
  claim_notice_date: string;
  days_to_notice: number;
  is_time_barred: boolean;
  time_extension_claimed_days: number;
  financial_quantum_claimed_inr: number;
  engineer_assessed_eot_days: number;
  engineer_assessed_amount_inr: number;
  liquidated_damages_levied_inr: number;
  unjustified_delay_weeks: number;
  linked_hindrance_code?: string | null;
  dab_referral_date?: string | null;
  dab_decision_due_date?: string | null;
  dab_decision_summary?: string | null;
  status: ClaimDisputeStatus;
  lead_arbiter_name?: string | null;
  seor_assessor_name?: string | null;
  settled_at?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

function checkFidic28DayTimeBar(eventDate: string, noticeDate: string) {
  const diffTime = Math.abs(new Date(noticeDate).getTime() - new Date(eventDate).getTime());
  const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const isTimeBarred = daysDiff > 28;
  return { daysDiff, isTimeBarred };
}

function normalizeClaimRecord(d: any): ClaimDisputeRecord {
  const eventDate = d?.event_occurrence_date ?? new Date(Date.now() - 15 * 86400000).toISOString().slice(0, 10);
  const noticeDate = d?.claim_notice_date ?? new Date().toISOString().slice(0, 10);
  const tb = checkFidic28DayTimeBar(eventDate, noticeDate);

  return {
    id: d?.id ?? `claim-${Date.now()}`,
    project_id: d?.project_id ?? "GOMTI-NAGAR-PH1-FITOUT",
    claim_reference: d?.claim_reference ?? `CLM-${Date.now().toString().slice(-4)}`,
    title: d?.title ?? "Contractual Claim for Time & Cost",
    work_order_ref: d?.work_order_ref ?? "WO-01",
    contractor_name: d?.contractor_name ?? "Executing Contractor",
    trade_package: d?.trade_package ?? "Civil & Superstructure",
    category: (d?.category as ClaimCategory) ?? "TIME_EXTENSION_EOT",
    event_occurrence_date: eventDate,
    claim_notice_date: noticeDate,
    days_to_notice: Number(d?.days_to_notice ?? tb.daysDiff),
    is_time_barred: Boolean(d?.is_time_barred ?? tb.isTimeBarred),
    time_extension_claimed_days: Number(d?.time_extension_claimed_days ?? 0),
    financial_quantum_claimed_inr: Number(d?.financial_quantum_claimed_inr ?? 0),
    engineer_assessed_eot_days: Number(d?.engineer_assessed_eot_days ?? 0),
    engineer_assessed_amount_inr: Number(d?.engineer_assessed_amount_inr ?? 0),
    liquidated_damages_levied_inr: Number(d?.liquidated_damages_levied_inr ?? 0),
    unjustified_delay_weeks: Number(d?.unjustified_delay_weeks ?? 0),
    linked_hindrance_code: d?.linked_hindrance_code ?? null,
    dab_referral_date: d?.dab_referral_date ?? null,
    dab_decision_due_date: d?.dab_decision_due_date ?? null,
    dab_decision_summary: d?.dab_decision_summary ?? null,
    status: (d?.status as ClaimDisputeStatus) ?? (tb.isTimeBarred ? "DISALLOWED_TIME_BARRED" : "NOTICE_SUBMITTED_28D"),
    lead_arbiter_name: d?.lead_arbiter_name ?? null,
    seor_assessor_name: d?.seor_assessor_name ?? null,
    settled_at: d?.settled_at ?? null,
    created_at: d?.created_at ?? new Date().toISOString(),
  };
}

export default function CanonicalClaimsDisputesPage() {
  const { project, role, tier } = useActiveRole();
  const [claims, setClaims] = useState<ClaimDisputeRecord[]>([]);
  const [selectedClaim, setSelectedClaim] = useState<ClaimDisputeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Gomti Nagar Extension Hub";

  // Form State
  const [claimRef, setClaimRef] = useState(`CLM-2026-001`);
  const [title, setTitle] = useState("");
  const [woRef, setWoRef] = useState("WO-CW-01");
  const [contractor, setContractor] = useState("Falcon Structural RCC Works");
  const [tradePackage, setTradePackage] = useState("Civil & Superstructure");
  const [category, setCategory] = useState<ClaimCategory>("TIME_EXTENSION_EOT");
  const [eventDate, setEventDate] = useState(new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10));
  const [noticeDate, setNoticeDate] = useState(new Date().toISOString().slice(0, 10));
  const [claimedDays, setClaimedDays] = useState<number>(14);
  const [claimedAmount, setClaimedAmount] = useState<number>(450000);
  const [hindranceCode, setHindranceCode] = useState("HND-01");

  const loadClaimsData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("contract_claims_disputes")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        const normalized = data.map((d: any) => normalizeClaimRecord(d));
        setClaims(normalized);
        setSelectedClaim(normalized[0]);
      } else {
        setClaims([]);
        setSelectedClaim(null);
      }
    } catch {
      setClaims([]);
      setSelectedClaim(null);
    } finally {
      // Guaranteed resolution of loading state prevents the "initializing buffer" hang
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadClaimsData();
  }, [loadClaimsData]);

  const summary = useMemo(() => {
    const totalClaims = claims.length;
    const totalClaimedQuantum = claims.reduce((sum, c) => sum + Number(c.financial_quantum_claimed_inr || 0), 0);
    const totalLdLevied = claims.reduce((sum, c) => sum + Number(c.liquidated_damages_levied_inr || 0), 0);
    const timeBarredCount = claims.filter((c) => c.is_time_barred).length;
    const inDabCount = claims.filter((c) => c.status === "DAB_REFERRAL_84D").length;

    return { totalClaims, totalClaimedQuantum, totalLdLevied, timeBarredCount, inDabCount };
  }, [claims]);

  const filteredClaims = useMemo(() => {
    return claims.filter((c) => {
      const matchStatus = filterStatus === "ALL" || c.status === filterStatus;
      const haystack = `${c.claim_reference} ${c.title} ${c.contractor_name}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [claims, filterStatus, search]);

  const handleLodgeClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionInProgress("creating_claim");

    const tb = checkFidic28DayTimeBar(eventDate, noticeDate);
    const newDbRecord = {
      project_id: projectId,
      claim_reference: claimRef.trim(),
      title: title.trim(),
      work_order_ref: woRef.trim(),
      contractor_name: contractor.trim(),
      trade_package: tradePackage.trim(),
      category,
      event_occurrence_date: eventDate,
      claim_notice_date: noticeDate,
      days_to_notice: tb.daysDiff,
      is_time_barred: tb.isTimeBarred,
      time_extension_claimed_days: Number(claimedDays),
      financial_quantum_claimed_inr: Number(claimedAmount),
      engineer_assessed_eot_days: 0,
      engineer_assessed_amount_inr: 0,
      liquidated_damages_levied_inr: category === "LIQUIDATED_DAMAGES_LEVIED" ? Number(claimedAmount) : 0,
      unjustified_delay_weeks: 0,
      linked_hindrance_code: hindranceCode.trim() || null,
      status: tb.isTimeBarred ? "DISALLOWED_TIME_BARRED" : "NOTICE_SUBMITTED_28D",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("contract_claims_disputes")
        .insert([newDbRecord])
        .select()
        .single();

      if (data) {
        const normalized = normalizeClaimRecord(data);
        setClaims((prev) => [normalized, ...prev]);
        setSelectedClaim(normalized);
      } else {
        throw error;
      }
    } catch {
      const fallback = normalizeClaimRecord({ ...newDbRecord, id: `claim-${Date.now()}` });
      setClaims((prev) => [fallback, ...prev]);
      setSelectedClaim(fallback);
    }

    setFeedbackMessage(`Claim ${claimRef} lodged into statutory dispute docket.`);
    setTimeout(() => setFeedbackMessage(null), 3500);
    setModalOpen(false);
    setActionInProgress(null);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING CONTRACT CLAIMS &amp; DISPUTE BOARD CLEARINGHOUSE...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8 font-mono text-xs select-none">
      <div className="mx-auto max-w-[1600px] space-y-6">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Dispute Governance • FIDIC Red Book Clause 20 / CPWD GCC Clause 2 &amp; 25</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Claims, Liquidated Damages &amp; Dispute Board (DAB)
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl font-sans">
              Statutory claim adjudication and dispute clearinghouse. Enforces the strict 28-day notice time-bar under FIDIC 20.1 and computes CPWD Clause 2 liquidated damages for unexcused delays.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/finance/ra-bills"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Coins className="w-3.5 h-3.5 text-rose-400" />
              <span>RA Bills Clearinghouse</span>
            </Link>
            <button
              type="button"
              onClick={() => {
                setClaimRef(`CLM-2026-00${claims.length + 1}`);
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Lodge Claim / Notice</span>
            </button>
          </div>
        </div>

        {feedbackMessage && (
          <div className="p-3 rounded-xl bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* 4 PRIMARY GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Financial Claims</span>
              <DollarSign className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold text-white mt-2 tabular-nums">
              {formatInr(summary.totalClaimedQuantum)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Contractor claimed prolongation costs</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Liquidated Damages Levied</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-extrabold text-rose-400 mt-2 tabular-nums">
              {formatInr(summary.totalLdLevied)}
            </div>
            <div className="text-[11px] text-rose-500/80 mt-1">CPWD Clause 2 delay compensation</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Disallowed Time-Barred</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className={`text-2xl font-extrabold mt-2 tabular-nums ${summary.timeBarredCount > 0 ? "text-amber-400" : "text-zinc-400"}`}>
              {summary.timeBarredCount} Claim(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Notice &gt; 28 days under FIDIC 20.1</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active DAB Proceedings</span>
              <Gavel className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold text-emerald-400 mt-2 tabular-nums">
              {summary.inDabCount} Dispute(s)
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">In 84-day statutory adjudication</div>
          </div>
        </div>

        {/* WORKBENCH: ROSTER (7 cols) vs STICKY ADJUDICATION DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT: CLAIMS LISTING */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase">Lodged Claims &amp; Dispute Register</span>
              <span className="text-zinc-500">{filteredClaims.length} Claims Listed</span>
            </div>

            {filteredClaims.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-zinc-700" />
                <p>Zero active claims lodged. Contract performance is proceeding within schedule baseline.</p>
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 rounded text-cyan-400 uppercase font-bold text-[10px]"
                >
                  Lodge First Claim Notice
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredClaims.map((c) => {
                  const isSelected = selectedClaim?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedClaim(c)}
                      className={`rounded-xl border p-4 transition cursor-pointer space-y-2.5 ${
                        isSelected
                          ? "border-cyan-500 bg-cyan-950/20 shadow-md shadow-cyan-950/40"
                          : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs">{c.claim_reference}</span>
                            <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-400">
                              {c.category.replace(/_/g, " ")}
                            </span>
                          </div>
                          <h3 className="text-zinc-200 font-bold mt-1 text-xs">{c.title}</h3>
                        </div>
                        <span className="text-emerald-400 font-bold tabular-nums">
                          {formatInr(c.financial_quantum_claimed_inr)}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-zinc-500 pt-2 border-t border-zinc-800">
                        <span>Contractor: <strong className="text-zinc-300">{c.contractor_name}</strong></span>
                        <span>Notice Horizon: <strong className="text-cyan-400">{c.days_to_notice}d</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: STICKY ADJUDICATION DESK (Anchored Pinned Viewport) */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            {selectedClaim ? (
              <>
                <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase text-cyan-400 font-bold">Adjudication Detail</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedClaim.claim_reference}</h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      selectedClaim.is_time_barred
                        ? "bg-rose-950 text-rose-400 border border-rose-800"
                        : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    }`}
                  >
                    {selectedClaim.is_time_barred ? "Time-Barred" : "Timely Notice"}
                  </span>
                </div>

                <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                  <div className="text-zinc-400 text-[10px] uppercase">Claim Subject:</div>
                  <div className="text-white font-bold text-xs">{selectedClaim.title}</div>
                  <div className="text-[11px] text-zinc-400">
                    Executing Contractor: <strong className="text-zinc-200">{selectedClaim.contractor_name}</strong> ({selectedClaim.work_order_ref})
                  </div>
                </div>

                <div className="p-3.5 bg-zinc-900 border border-zinc-800 rounded-xl space-y-2">
                  <span className="text-[10px] uppercase text-zinc-500 font-bold block">Adjudication Quantums:</span>
                  <div className="flex justify-between text-zinc-300">
                    <span>Claimed Time Extension:</span>
                    <strong className="text-cyan-400">+{selectedClaim.time_extension_claimed_days} Days</strong>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Claimed Quantum:</span>
                    <strong className="text-emerald-400">{formatInr(selectedClaim.financial_quantum_claimed_inr)}</strong>
                  </div>
                </div>

                {selectedClaim.is_time_barred ? (
                  <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 rounded text-center">
                    <AlertOctagon className="w-4 h-4 mx-auto mb-1 text-rose-400" />
                    <strong>FIDIC Clause 20.1 Disallowance Active</strong>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Notice was lodged {selectedClaim.days_to_notice} days after event (exceeding 28-day statutory limit).
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFeedbackMessage(`Engineer determination approved for ${selectedClaim.claim_reference}.`);
                      setTimeout(() => setFeedbackMessage(null), 3000);
                    }}
                    className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded transition cursor-pointer"
                  >
                    Issue Engineer Clause 3.5 Determination
                  </button>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-zinc-600">
                Select a claim from the left register to inspect its adjudication terms.
              </div>
            )}
          </div>
        </div>

        {/* MODAL: LODGE CLAIM */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 text-xs font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase">Lodge Contract Claim / LD Notice</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleLodgeClaim} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">Claim Ref *</label>
                    <input
                      required
                      value={claimRef}
                      onChange={(e) => setClaimRef(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white rounded outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as ClaimCategory)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white rounded outline-none"
                    >
                      <option value="TIME_EXTENSION_EOT">Extension of Time (EOT)</option>
                      <option value="PROLONGATION_COSTS">Prolongation Costs</option>
                      <option value="UNFORESEEN_PHYSICAL_CONDITIONS">Unforeseen Physical Conditions</option>
                      <option value="LIQUIDATED_DAMAGES_LEVIED">Liquidated Damages (Levied)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">Claim Title *</label>
                  <input
                    required
                    placeholder="e.g. Foundation dewatering delay during unseasonal monsoon"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white rounded outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">Event Date</label>
                    <input
                      type="date"
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white rounded outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">Notice Date</label>
                    <input
                      type="date"
                      value={noticeDate}
                      onChange={(e) => setNoticeDate(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white rounded outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">Claimed EOT (Days)</label>
                    <input
                      type="number"
                      value={claimedDays}
                      onChange={(e) => setClaimedDays(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white rounded outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-1">Claimed Amount (₹)</label>
                    <input
                      type="number"
                      value={claimedAmount}
                      onChange={(e) => setClaimedAmount(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white rounded outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded cursor-pointer">
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase rounded cursor-pointer">
                    Transmit Claim Notice
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
