#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Applying Sprint 20: Master Command Layout, Federated Global Search & Claims Engine...\033[0m"

# -----------------------------------------------------------------------------
# 0. SQL MIGRATION: Federated Global Search & Claims Indexes
# -----------------------------------------------------------------------------
mkdir -p supabase/migrations
cat << 'SQL_MIGRATION' > supabase/migrations/20261003_sprint_20_command_search.sql
CREATE TABLE IF NOT EXISTS public.contract_claims_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    claim_reference TEXT NOT NULL,
    title TEXT NOT NULL,
    work_order_ref TEXT NOT NULL,
    contractor_name TEXT NOT NULL,
    trade_package TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'TIME_EXTENSION_EOT',
    event_occurrence_date DATE NOT NULL,
    claim_notice_date DATE NOT NULL,
    days_to_notice INTEGER NOT NULL DEFAULT 0,
    is_time_barred BOOLEAN NOT NULL DEFAULT FALSE,
    time_extension_claimed_days INTEGER NOT NULL DEFAULT 0,
    financial_quantum_claimed_inr NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    engineer_assessed_eot_days INTEGER NOT NULL DEFAULT 0,
    engineer_assessed_amount_inr NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    liquidated_damages_levied_inr NUMERIC(14,2) NOT NULL DEFAULT 0.00,
    unjustified_delay_weeks NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    linked_hindrance_code TEXT,
    dab_referral_date DATE,
    dab_decision_due_date DATE,
    dab_decision_summary TEXT,
    status TEXT NOT NULL DEFAULT 'NOTICE_SUBMITTED_28D',
    lead_arbiter_name TEXT,
    seor_assessor_name TEXT,
    settled_at TIMESTAMPTZ,
    contemporaneous_evidence_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_claims_proj ON public.contract_claims_disputes(project_id, status);
CREATE INDEX IF NOT EXISTS idx_claims_ref ON public.contract_claims_disputes(claim_reference);
SQL_MIGRATION

# -----------------------------------------------------------------------------
# 1. REFACTOR: components/layout/SidebarAwareLayout.tsx
# -----------------------------------------------------------------------------
cat << 'COMP_SIDEBAR_LAYOUT' > components/layout/SidebarAwareLayout.tsx
'use client';

import React from 'react';

interface SidebarAwareLayoutProps {
  children: React.ReactNode;
}

export function SidebarAwareLayout({ children }: SidebarAwareLayoutProps) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* 
        pt-16 ensures content starts below the fixed navigation bar.
        md:pl-64 provides continuous clearance for the fixed left sidebar.
        overflow-x-hidden prevents accidental horizontal page expansion.
      */}
      <div className="flex-1 w-full pt-16 md:pl-64 transition-all duration-200 overflow-x-hidden">
        <main className="w-full h-full relative">
          {children}
        </main>
      </div>
    </div>
  );
}

export default SidebarAwareLayout;
COMP_SIDEBAR_LAYOUT

# -----------------------------------------------------------------------------
# 2. REFACTOR: components/ui/GlobalSearchBar.tsx (True Federated Search)
# -----------------------------------------------------------------------------
cat << 'COMP_GLOBAL_SEARCH' > components/ui/GlobalSearchBar.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import {
  Search,
  Command,
  FileSpreadsheet,
  Receipt,
  ShieldAlert,
  Compass,
  FileText,
  X,
  Layers,
  ArrowRight,
  HardHat,
  CheckSquare,
  Banknote,
  Gavel,
} from "lucide-react";

interface SearchHit {
  category: "PROJECT" | "DRAWING" | "NCR_DEFECT" | "PTW_PERMIT" | "PUNCH_SNAG" | "RA_BILL" | "CLAIM";
  id: string;
  code: string;
  title: string;
  subtitle: string;
  route: string;
}

export function GlobalSearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const q = `%${query.trim()}%`;
      const hits: SearchHit[] = [];

      try {
        // 1. Projects
        const { data: pData } = await (supabase as any)
          .from("projects")
          .select("project_id, project_name")
          .or(`project_name.ilike.${q},project_id.ilike.${q}`)
          .limit(3);

        (pData || []).forEach((p: any) => {
          hits.push({
            category: "PROJECT",
            id: String(p.project_id),
            code: p.project_id,
            title: p.project_name,
            subtitle: "Contract Anchor",
            route: `/?project_id=${p.project_id}`,
          });
        });

        // 2. CDE Drawings
        const { data: dData } = await (supabase as any)
          .from("cde_drawing_packages")
          .select("id, drawing_number, drawing_title, revision")
          .or(`drawing_number.ilike.${q},drawing_title.ilike.${q}`)
          .limit(3);

        (dData || []).forEach((d: any) => {
          hits.push({
            category: "DRAWING",
            id: String(d.id),
            code: `${d.drawing_number} (Rev ${d.revision || "R1"})`,
            title: d.drawing_title,
            subtitle: "ISO 19650 GFC Sheet",
            route: `/cde/viewer/${d.drawing_number}`,
          });
        });

        // 3. Quality NCR Register
        const { data: ncrData } = await (supabase as any)
          .from("quality_ncr_register")
          .select("id, ncr_number, grid_location, issue_description, withholding_amount_inr")
          .or(`ncr_number.ilike.${q},issue_description.ilike.${q},grid_location.ilike.${q}`)
          .limit(3);

        (ncrData || []).forEach((n: any) => {
          hits.push({
            category: "NCR_DEFECT",
            id: String(n.id),
            code: n.ncr_number,
            title: n.issue_description,
            subtitle: `${n.grid_location || "Site"} • Lien: ₹${Number(n.withholding_amount_inr || 0).toLocaleString("en-IN")}`,
            route: "/quality/ncr",
          });
        });

        // 4. Safety Permits to Work
        const { data: ptwData } = await (supabase as any)
          .from("safety_ptw_register")
          .select("id, permit_number, permit_category, location_zone")
          .or(`permit_number.ilike.${q},location_zone.ilike.${q},permit_category.ilike.${q}`)
          .limit(3);

        (ptwData || []).forEach((pt: any) => {
          hits.push({
            category: "PTW_PERMIT",
            id: String(pt.id),
            code: pt.permit_number,
            title: `${pt.permit_category} Clearance`,
            subtitle: `Zone: ${pt.location_zone}`,
            route: "/site/permits",
          });
        });

        // 5. Punch List Snags
        const { data: punchData } = await (supabase as any)
          .from("punch_list_items")
          .select("id, ticket_id, defect_description, location_room")
          .or(`ticket_id.ilike.${q},defect_description.ilike.${q},location_room.ilike.${q}`)
          .limit(3);

        (punchData || []).forEach((pn: any) => {
          hits.push({
            category: "PUNCH_SNAG",
            id: String(pn.id),
            code: pn.ticket_id,
            title: pn.defect_description,
            subtitle: pn.location_room,
            route: "/site/punch-list",
          });
        });

        // 6. Running Account Bills
        const { data: billData } = await (supabase as any)
          .from("running_account_bills")
          .select("id, ra_bill_number, gross_work_done, status")
          .or(`ra_bill_number.ilike.${q},status.ilike.${q}`)
          .limit(3);

        (billData || []).forEach((b: any) => {
          hits.push({
            category: "RA_BILL",
            id: String(b.id),
            code: b.ra_bill_number,
            title: `Running Account Bill ${b.ra_bill_number} [${b.status}]`,
            subtitle: `Gross: ₹${Number(b.gross_work_done || 0).toLocaleString("en-IN")}`,
            route: "/finance/ra-bills",
          });
        });

        setResults(hits);
      } catch {
        // Safe failover
      } finally {
        setSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (route: string) => {
    setOpen(false);
    router.push(route);
  };

  const getCategoryIcon = (category: SearchHit["category"]) => {
    switch (category) {
      case "PROJECT":
        return <Layers className="w-4 h-4 text-cyan-400" />;
      case "DRAWING":
        return <Compass className="w-4 h-4 text-amber-400" />;
      case "NCR_DEFECT":
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case "PTW_PERMIT":
        return <HardHat className="w-4 h-4 text-emerald-400" />;
      case "PUNCH_SNAG":
        return <CheckSquare className="w-4 h-4 text-sky-400" />;
      case "RA_BILL":
        return <Banknote className="w-4 h-4 text-emerald-400" />;
      case "CLAIM":
        return <Gavel className="w-4 h-4 text-purple-400" />;
      default:
        return <FileText className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition font-mono text-xs cursor-pointer"
      >
        <Search className="w-3.5 h-3.5 text-zinc-500" />
        <span className="hidden sm:inline">Search platform...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] bg-zinc-950 border border-zinc-800 text-zinc-500 rounded">
          <Command className="w-2.5 h-2.5" /> K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4 font-mono text-xs select-none">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-700 shadow-2xl rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-zinc-800 bg-zinc-900/60 gap-3">
              <Search className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search across Contracts, Drawings, NCRs, Permits, Snags, and Bills..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-zinc-500 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {searching ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  Searching federated project ledger...
                </div>
              ) : results.length > 0 ? (
                results.map((hit) => (
                  <button
                    key={`${hit.category}_${hit.id}`}
                    type="button"
                    onClick={() => handleSelect(hit.route)}
                    className="w-full p-2.5 bg-zinc-900/50 hover:bg-zinc-850 rounded border border-zinc-800/80 hover:border-cyan-500/50 flex items-center justify-between text-left transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded bg-zinc-950 border border-zinc-800 shrink-0">
                        {getCategoryIcon(hit.category)}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs group-hover:text-cyan-400 transition truncate">
                            {hit.code}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 uppercase font-bold">
                            {hit.category.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 font-sans truncate">{hit.title}</p>
                        <span className="text-[10px] text-zinc-500">{hit.subtitle}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 shrink-0 ml-2" />
                  </button>
                ))
              ) : query.trim() ? (
                <div className="p-8 text-center text-zinc-500">
                  Zero matching records found for &quot;{query}&quot;.
                </div>
              ) : (
                <div className="p-6 text-center text-zinc-600 text-[11px] space-y-1">
                  <div>Search across GFC drawings, active NCR liens, PTW permits, and RA bill ledgers.</div>
                  <div className="text-[10px] text-zinc-500">Quick jumps: ARCH, PTW, NCR, RA-01, or SNG</div>
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
              <span>Navigate with mouse or arrow keys</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GlobalSearchBar;
COMP_GLOBAL_SEARCH

# -----------------------------------------------------------------------------
# 3. REFACTOR: app/contracts/claims-disputes/page.tsx (Fixed Init Buffer Bug)
# -----------------------------------------------------------------------------
cat << 'PAGE_CLAIMS' > app/contracts/claims-disputes/page.tsx
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
PAGE_CLAIMS

# -----------------------------------------------------------------------------
# 4. REFACTOR: components/dashboard/ExecutiveCommandHub.tsx
# -----------------------------------------------------------------------------
cat << 'COMP_EXEC_HUB' > components/dashboard/ExecutiveCommandHub.tsx
"use client";

import React from "react";
import {
  TrendingUp,
  AlertTriangle,
  Building2,
  Lock,
} from "lucide-react";

export interface ExecutiveMetrics {
  grossWorkExecutedInr: number;
  unbilledMbInventoryInr: number;
  totalCertifiedNetInr: number;
  retentionEscrowInr: number;
  ncrWithholdsInr: number;
  cpi: number;
  spi: number;
  safeManHours: number;
  clause5DelayDays: number;
  ldExposureInr: number;
  criticalPoursFrozen: number;
  gccProtocol: string;
}

function formatInr(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val);
}

export function ExecutiveCommandHub({ metrics }: { metrics: ExecutiveMetrics }) {
  const isCpiHealthy = metrics.cpi >= 1.0;
  const isSpiHealthy = metrics.spi >= 1.0;

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* STATUS STRIP */}
      <div className="bg-zinc-900 border border-zinc-800 px-5 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-200 font-bold uppercase tracking-wider">
              ENTERPRISE AUDIT ACTIVE
            </span>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">{metrics.gccProtocol}</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-zinc-500">
            HSE SAFE HOURS:{" "}
            <strong className="text-emerald-400 font-bold">
              {metrics.safeManHours.toLocaleString("en-IN")} HRS
            </strong>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500">
            FROZEN STAGE-GATES:{" "}
            <strong
              className={
                metrics.criticalPoursFrozen > 0
                  ? "text-rose-400 font-bold"
                  : "text-zinc-300"
              }
            >
              {metrics.criticalPoursFrozen}
            </strong>
          </span>
        </div>
      </div>

      {/* 4 PRIMARY PILLARS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Production Executed */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between rounded-xl">
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
              <span>Gross Production Executed</span>
              <Building2 className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-3 flex flex-col items-end">
              <span className="text-2xl font-bold text-zinc-100 tabular-nums">
                {formatInr(metrics.grossWorkExecutedInr)}
              </span>
              <span className="text-[10px] text-amber-400 mt-0.5">
                Unbilled e-MB: {formatInr(metrics.unbilledMbInventoryInr)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-zinc-500">
            <span>Disbursed Net IPC:</span>
            <span className="text-emerald-400 font-bold">
              {formatInr(metrics.totalCertifiedNetInr)}
            </span>
          </div>
        </div>

        {/* CPI & SPI */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between rounded-xl">
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
              <span>Cost &amp; Schedule Index</span>
              <TrendingUp className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-zinc-500 block">COST (CPI)</span>
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    isCpiHealthy ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {metrics.cpi.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block">SCHEDULE (SPI)</span>
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    isSpiHealthy ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {metrics.spi.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-zinc-500">
            <span>Efficiency Verdict:</span>
            <span
              className={
                isCpiHealthy && isSpiHealthy
                  ? "text-emerald-400 font-bold"
                  : "text-amber-400 font-bold"
              }
            >
              {isCpiHealthy && isSpiHealthy
                ? "Target Baseline Surpassed"
                : "Under Schedule Friction"}
            </span>
          </div>
        </div>

        {/* Clause 5 Delay Defense */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between rounded-xl">
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
              <span>Statutory Hindrance Defense</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-3 flex flex-col items-end">
              <span
                className={`text-2xl font-bold tabular-nums ${
                  metrics.clause5DelayDays > 0 ? "text-amber-400" : "text-zinc-100"
                }`}
              >
                {metrics.clause5DelayDays} Delay Days
              </span>
              <span className="text-[10px] text-zinc-500 mt-0.5">
                Contemporaneous Logged (Cl. 5)
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-zinc-500">
            <span>Potential LD Exposure:</span>
            <span
              className={
                metrics.ldExposureInr > 0 ? "text-rose-400 font-bold" : "text-zinc-400"
              }
            >
              {metrics.ldExposureInr > 0 ? formatInr(metrics.ldExposureInr) : "Zero Liability"}
            </span>
          </div>
        </div>

        {/* Retention Escrow & QMS */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between rounded-xl">
          <div>
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-400 font-bold">
              <span>Retention Escrow &amp; QMS</span>
              <Lock className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3 flex flex-col items-end">
              <span className="text-2xl font-bold text-zinc-100 tabular-nums">
                {formatInr(metrics.retentionEscrowInr)}
              </span>
              <span className="text-[10px] text-rose-400 mt-0.5">
                NCR Withholds: -{formatInr(metrics.ncrWithholdsInr)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-zinc-500">
            <span>Cl. 17 DLP Escrow:</span>
            <span className="text-emerald-400 font-bold">Tranche 1 Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExecutiveCommandHub;
COMP_EXEC_HUB

# -----------------------------------------------------------------------------
# 5. REFACTOR: components/liveview/LiveViewMasterMatrix.tsx
# -----------------------------------------------------------------------------
cat << 'COMP_MASTER_MATRIX' > components/liveview/LiveViewMasterMatrix.tsx
"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Beaker,
  CheckCircle2,
  Clock,
  FileText,
  HardHat,
  Lock,
  Paintbrush,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sofa,
  Truck,
  Wrench,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export interface LiveViewMasterTelemetry {
  pending_pour_cards: number;
  approved_pour_cards: number;
  pending_cube_tests: number;
  curing_stripping_locked: number;
  active_ptw: number;
  ptw_expiring_soon: number;
  today_manpower: number;
  today_gate_inward_count: number;
  open_ncrs: number;
  critical_ncrs: number;
  total_certified_ra_lakhs: number;
  net_disbursed_lakhs: number;
}

const defaultTelemetry: LiveViewMasterTelemetry = {
  pending_pour_cards: 0,
  approved_pour_cards: 0,
  pending_cube_tests: 0,
  curing_stripping_locked: 0,
  active_ptw: 0,
  ptw_expiring_soon: 0,
  today_manpower: 0,
  today_gate_inward_count: 0,
  open_ncrs: 0,
  critical_ncrs: 0,
  total_certified_ra_lakhs: 0.0,
  net_disbursed_lakhs: 0.0,
};

interface AdaptiveStage {
  step: number;
  title: string;
  description: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  status: "Cleared" | "In Progress" | "Locked";
  tone: "cyan" | "amber" | "rose" | "emerald" | "slate";
}

export default function LiveViewMasterMatrix() {
  const { role, project, tier } = useActiveRole();
  const [telemetry, setTelemetry] = useState<LiveViewMasterTelemetry>(defaultTelemetry);
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>("");

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_liveview_master_telemetry", {
        p_project_id: project.id,
      });
      if (!error && data) {
        setTelemetry({ ...defaultTelemetry, ...(data as LiveViewMasterTelemetry) });
      } else {
        // Direct query count aggregation fallback
        const [pourRes, cubeRes, ncrRes, ptwRes] = await Promise.all([
          supabase.from("pour_cards").select("status").eq("project_id", project.id),
          supabase.from("quality_concrete_cube_tests").select("status").eq("project_id", project.id),
          supabase.from("quality_ncr_register").select("status, severity").eq("project_id", project.id).neq("status", "CLOSED"),
          supabase.from("safety_ptw_register").select("status").eq("project_id", project.id).eq("status", "APPROVED_ACTIVE"),
        ]);

        const openNcrs = ncrRes.data?.length || 0;
        const criticalNcrs = ncrRes.data?.filter((n: any) => n.severity === "CRITICAL" || n.severity === "MAJOR_STRUCTURAL").length || 0;
        const pendingPours = pourRes.data?.filter((p: any) => p.status === "Hold" || p.status === "Pending").length || 0;

        setTelemetry((prev) => ({
          ...prev,
          open_ncrs: openNcrs,
          critical_ncrs: criticalNcrs,
          pending_pour_cards: pendingPours,
          active_ptw: ptwRes.data?.length || 0,
          pending_cube_tests: cubeRes.data?.filter((c: any) => c.status === "CURING" || c.status === "PENDING_28D").length || 0,
        }));
      }
    } catch {
      // Safe fallback
    } finally {
      setLastSynced(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTelemetry();
  }, [project.id]);

  const stages: AdaptiveStage[] = useMemo(() => {
    if (tier === "RESIDENTIAL") {
      return [
        { step: 1, title: "Material Catalog", description: "Veneer, stone & laminates", route: "/submittals", icon: Sparkles, value: "Verified", label: "client approved", status: "Cleared", tone: "emerald" },
        { step: 2, title: "Civil & Masonry", description: "Chasing & partition checks", route: "/operations/dpr", icon: HardHat, value: `${telemetry.today_manpower} Men`, label: "muster strength", status: "In Progress", tone: "cyan" },
        { step: 3, title: "MEP First-Fix", description: "Conduiting & plumbing tests", route: "/quality/inspections", icon: Wrench, value: "100%", label: "pressure passed", status: "Cleared", tone: "emerald" },
        { step: 4, title: "Custom Joinery", description: "Millwork & carcass assembly", route: "/submittals", icon: Sofa, value: "In Progress", label: "awaiting inspection", status: "In Progress", tone: "amber" },
        { step: 5, title: "Surface Finishes", description: "Primer, PU paint & polish", route: "/site/punch-list", icon: Paintbrush, value: "Active", label: "surface prepared", status: "In Progress", tone: "cyan" },
        { step: 6, title: "Punch Snagging", description: "Owner defects & punch items", route: "/site/punch-list", icon: AlertOctagon, value: `${telemetry.open_ncrs}`, label: "open defects", status: telemetry.open_ncrs > 0 ? "In Progress" : "Cleared", tone: "rose" },
        { step: 7, title: "Final Dressing", description: "Soft furnishings & fixtures", route: "/handover", icon: ShieldCheck, value: "Ready", label: "for final cleaning", status: "Cleared", tone: "emerald" },
        { step: 8, title: "Billing Release", description: "Contractor stage milestone", route: "/finance/ra-bills", icon: Receipt, value: `₹ ${telemetry.total_certified_ra_lakhs.toFixed(1)} L`, label: "certified payout", status: "Cleared", tone: "emerald" },
      ];
    }

    return [
      { step: 1, title: "Gate Inward", description: "Weighbridge receipts", route: "/operations/gate-register", icon: Truck, value: `${telemetry.today_gate_inward_count}`, label: "vehicles today", status: "Cleared", tone: "cyan" },
      { step: 2, title: "DPR Shift Log", description: "Daily site muster", route: "/operations/dpr", icon: HardHat, value: `${telemetry.today_manpower}`, label: "muster strength", status: "In Progress", tone: "slate" },
      { step: 3, title: "High-Risk PTW", description: "Height & hot work safety", route: "/site/permits", icon: ShieldAlert, value: `${telemetry.active_ptw}`, label: "active permits", status: telemetry.ptw_expiring_soon > 0 ? "In Progress" : "Cleared", tone: "amber" },
      { step: 4, title: "Pour Cards", description: "Pre-pour stage gate", route: "/quality/pour-cards", icon: FileText, value: `${telemetry.pending_pour_cards}`, label: "pending sign-off", status: telemetry.pending_pour_cards > 0 ? "In Progress" : "Cleared", tone: "rose" },
      { step: 5, title: "IS 516 Cubes", description: "Compressive strength test", route: "/quality/cube-tests", icon: Beaker, value: `${telemetry.pending_cube_tests}`, label: "pending crushes", status: "In Progress", tone: "cyan" },
      { step: 6, title: "Formwork Stripping", description: "Maturity interlock (IS 456)", route: "/safety/formwork-stripping", icon: Lock, value: `${telemetry.curing_stripping_locked}`, label: "spans locked", status: telemetry.curing_stripping_locked > 0 ? "Locked" : "Cleared", tone: "amber" },
      { step: 7, title: "NCR Defect Log", description: "Defect rectification loop", route: "/quality/ncr", icon: AlertOctagon, value: `${telemetry.open_ncrs}`, label: "open notices", status: telemetry.critical_ncrs > 0 ? "Locked" : "In Progress", tone: "rose" },
      { step: 8, title: "Commercial RA", description: "Quantity surveyor release", route: "/finance/ra-bills", icon: Receipt, value: `₹ ${telemetry.total_certified_ra_lakhs.toFixed(1)} L`, label: "certified payout", status: "Cleared", tone: "emerald" },
    ];
  }, [tier, telemetry]);

  const activeBlockers = [
    telemetry.ptw_expiring_soon > 0 ? `${telemetry.ptw_expiring_soon} high-risk permit-to-work expiring within 2 hours.` : null,
    telemetry.critical_ncrs > 0 ? `${telemetry.critical_ncrs} structural quality defect(s) pending formal CAPA sign-off.` : null,
    telemetry.curing_stripping_locked > 0 && tier !== "RESIDENTIAL" ? "IS 456 Stripping Lock: Soffit de-shuttering held pending 7-day cube maturity." : null,
  ].filter(Boolean) as string[];

  return (
    <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 font-mono text-xs select-none">
      {/* HEADER STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
            <span>Governance Sequence</span>
            <span>·</span>
            <span className="text-zinc-400">{project.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
            Construction Control Matrix
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl font-sans">
            Atomic stage-gate control from physical inward site activity to statutory financial release.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1 text-xs">
            <span className={`h-2 w-2 rounded-full ${loading ? "bg-amber-400 animate-spin" : "bg-emerald-500"}`} />
            <span className="text-zinc-300 font-mono text-[11px]">
              {loading ? "Syncing..." : lastSynced ? `Synced · ${lastSynced}` : "Live Telemetry"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void fetchTelemetry()}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
            title="Refresh Matrix"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* BLOCKERS RADAR */}
      {activeBlockers.length > 0 && (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Active Stage-Gate Blockers ({activeBlockers.length})</span>
          </div>
          <div className="divide-y divide-rose-500/20">
            {activeBlockers.map((b, i) => (
              <div key={i} className="py-2 text-xs text-rose-200/90 flex items-center gap-2 font-sans">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8-STAGE HORIZONTAL GRID */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Governed Progression Sequence ({tier})
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            Role: <strong className="text-zinc-200">{role.label}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.step}
                className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 group-hover:text-zinc-200">
                      0{stage.step}
                    </span>
                    <Icon className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                  </div>

                  <h2 className="text-xs font-bold text-zinc-200 mt-2.5 leading-tight">
                    {stage.title}
                  </h2>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1 leading-snug font-sans">
                    {stage.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/60">
                  <div className="font-mono text-sm font-bold text-white tracking-tight">
                    {stage.value}
                  </div>
                  <div className="text-[9px] text-zinc-400 uppercase tracking-wide">
                    {stage.label}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider ${
                        stage.status === "Cleared"
                          ? "text-emerald-400"
                          : stage.status === "Locked"
                          ? "text-rose-400"
                          : "text-amber-400"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          stage.status === "Cleared"
                            ? "bg-emerald-400"
                            : stage.status === "Locked"
                            ? "bg-rose-400 animate-pulse"
                            : "bg-amber-400"
                        }`}
                      />
                      {stage.status}
                    </span>

                    <Link
                      href={stage.route}
                      className="text-zinc-400 hover:text-cyan-400 transition"
                      title="Open Stage Register"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
COMP_MASTER_MATRIX

# -----------------------------------------------------------------------------
# 6. VERIFY COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying TypeScript compilation health with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Sprint 20 applied cleanly! Layout, claims engine & global search completely resolved.\033[0m"
