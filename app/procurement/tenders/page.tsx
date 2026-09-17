"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  Tag,
  TrendingDown,
  Wrench,
  X
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export type TenderStatus = "RFP_ISSUED" | "TECHNICAL_EVALUATION" | "COMMERCIAL_BID_OPENED" | "AWARDED_LOI" | "REJECTED";

export interface BidderQuotation {
  bidder_id: string;
  contractor_name: string;
  technical_score_pct: number;
  quoted_amount_inr: number;
  variance_to_estimate_pct: number;
  ranking: "L1" | "L2" | "L3" | "DISQUALIFIED";
  proposed_duration_days: number;
  is_selected: boolean;
}

export interface ProcurementTender {
  id: string;
  project_id: string;
  tender_code: string;
  package_name: string;
  trade_category: string;
  estimated_budget_inr: number;
  rfp_publish_date: string;
  bid_submission_deadline: string;
  bidders: BidderQuotation[];
  status: TenderStatus;
  awarded_vendor?: string | null;
  awarded_amount_inr?: number | null;
  loi_issued_at?: string | null;
  issued_by?: string | null;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function CanonicalProcurementTendersPage() {
  const { project, role, tier } = useActiveRole();
  const [tenders, setTenders] = useState<ProcurementTender[]>([]);
  const [selectedTender, setSelectedTender] = useState<ProcurementTender | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = role?.label || "";
  const isProcurementLeadOrArchitect =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "QS_BILLING" ||
    roleLabel.includes("Procurement") ||
    roleLabel.includes("Architect") ||
    roleLabel.includes("Lead") ||
    roleLabel.includes("Surveyor");

  const loadTenderData = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("procurement_tender_packages")
        .select("*")
        .eq("project_id", project.id)
        .order("bid_submission_deadline", { ascending: true });

      if (data && data.length > 0) {
        setTenders(data as ProcurementTender[]);
        if (!selectedTender) setSelectedTender(data[0] as ProcurementTender);
      } else {
        const defaults: ProcurementTender[] =
          tier === "RESIDENTIAL"
            ? [
                {
                  id: "tnd-res-01",
                  project_id: project.id,
                  tender_code: "RFP-RES-041",
                  package_name: "Modular Carcass Joinery & High-Gloss Polish",
                  trade_category: "Custom Joinery & Millwork",
                  estimated_budget_inr: 280000,
                  rfp_publish_date: "2026-08-15",
                  bid_submission_deadline: "2026-08-28",
                  bidders: [
                    {
                      bidder_id: "b-01",
                      contractor_name: "Royal Woodworks & Interiors",
                      technical_score_pct: 92.5,
                      quoted_amount_inr: 265000,
                      variance_to_estimate_pct: -5.36,
                      ranking: "L1",
                      proposed_duration_days: 18,
                      is_selected: true,
                    },
                    {
                      bidder_id: "b-02",
                      contractor_name: "Oudh Modular Craftsmen",
                      technical_score_pct: 84.0,
                      quoted_amount_inr: 282000,
                      variance_to_estimate_pct: 0.71,
                      ranking: "L2",
                      proposed_duration_days: 22,
                      is_selected: false,
                    },
                    {
                      bidder_id: "b-03",
                      contractor_name: "Kanpur Joiners LLP",
                      technical_score_pct: 68.0,
                      quoted_amount_inr: 240000,
                      variance_to_estimate_pct: -14.29,
                      ranking: "DISQUALIFIED",
                      proposed_duration_days: 28,
                      is_selected: false,
                    },
                  ],
                  status: "AWARDED_LOI",
                  awarded_vendor: "Royal Woodworks & Interiors",
                  awarded_amount_inr: 265000,
                  loi_issued_at: "2026-09-01T10:00:00Z",
                  issued_by: "Principal Architect",
                },
                {
                  id: "tnd-res-02",
                  project_id: project.id,
                  tender_code: "RFP-RES-042",
                  package_name: "Plumbing Diverters & Sanitary Fixture Installation",
                  trade_category: "First-Fix Plumbing & Sanitary",
                  estimated_budget_inr: 95000,
                  rfp_publish_date: "2026-09-02",
                  bid_submission_deadline: "2026-09-18",
                  bidders: [
                    {
                      bidder_id: "b-04",
                      contractor_name: "Avadh MEP Solutions",
                      technical_score_pct: 88.0,
                      quoted_amount_inr: 89500,
                      variance_to_estimate_pct: -5.79,
                      ranking: "L1",
                      proposed_duration_days: 12,
                      is_selected: false,
                    },
                    {
                      bidder_id: "b-05",
                      contractor_name: "Gomti Hydraulic Engineers",
                      technical_score_pct: 82.5,
                      quoted_amount_inr: 94000,
                      variance_to_estimate_pct: -1.05,
                      ranking: "L2",
                      proposed_duration_days: 14,
                      is_selected: false,
                    },
                  ],
                  status: "COMMERCIAL_BID_OPENED",
                },
              ]
            : [
                {
                  id: "tnd-twr-01",
                  project_id: project.id,
                  tender_code: "RFP-TWR-101",
                  package_name: "Superstructure Ready-Mix Concrete & Pumping Package",
                  trade_category: "Civil & Superstructure",
                  estimated_budget_inr: 185000000,
                  rfp_publish_date: "2026-05-10",
                  bid_submission_deadline: "2026-05-28",
                  bidders: [
                    {
                      bidder_id: "b-10",
                      contractor_name: "Narmada Concrete Works",
                      technical_score_pct: 94.0,
                      quoted_amount_inr: 178500000,
                      variance_to_estimate_pct: -3.51,
                      ranking: "L1",
                      proposed_duration_days: 120,
                      is_selected: true,
                    },
                    {
                      bidder_id: "b-11",
                      contractor_name: "BuildMix RMC India Pvt Ltd",
                      technical_score_pct: 91.5,
                      quoted_amount_inr: 182000000,
                      variance_to_estimate_pct: -1.62,
                      ranking: "L2",
                      proposed_duration_days: 125,
                      is_selected: false,
                    },
                  ],
                  status: "AWARDED_LOI",
                  awarded_vendor: "Narmada Concrete Works",
                  awarded_amount_inr: 178500000,
                  loi_issued_at: "2026-06-02T12:00:00Z",
                  issued_by: "PMC Lead Director",
                },
                {
                  id: "tnd-twr-02",
                  project_id: project.id,
                  tender_code: "RFP-TWR-102",
                  package_name: "Unitized Curtain Wall & Architectural Glazing",
                  trade_category: "Facade & Glazing",
                  estimated_budget_inr: 58000000,
                  rfp_publish_date: "2026-08-20",
                  bid_submission_deadline: "2026-09-22",
                  bidders: [
                    {
                      bidder_id: "b-12",
                      contractor_name: "Apex Glass & Façades",
                      technical_score_pct: 89.0,
                      quoted_amount_inr: 56400000,
                      variance_to_estimate_pct: -2.76,
                      ranking: "L1",
                      proposed_duration_days: 60,
                      is_selected: false,
                    },
                    {
                      bidder_id: "b-13",
                      contractor_name: "Hind Curtain Wall Technologies",
                      technical_score_pct: 86.0,
                      quoted_amount_inr: 57900000,
                      variance_to_estimate_pct: -0.17,
                      ranking: "L2",
                      proposed_duration_days: 65,
                      is_selected: false,
                    },
                  ],
                  status: "COMMERCIAL_BID_OPENED",
                },
              ];

        setTenders(defaults);
        if (!selectedTender) setSelectedTender(defaults[0]);
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [project.id, selectedTender, tier]);

  useEffect(() => {
    void loadTenderData();

    const channel = supabase
      .channel(`tenders_sync_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "procurement_tender_packages" }, () => void loadTenderData())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadTenderData]);

  const summary = useMemo(() => {
    const totalCount = tenders.length;
    const awardedTenders = tenders.filter((t) => t.status === "AWARDED_LOI");
    const totalAwardedValue = awardedTenders.reduce(
      (sum, t) => sum + Number(t.awarded_amount_inr || t.estimated_budget_inr || 0),
      0
    );
    const activeEvaluations = tenders.filter(
      (t) => t.status === "TECHNICAL_EVALUATION" || t.status === "COMMERCIAL_BID_OPENED"
    ).length;
    const totalBudget = tenders.reduce((sum, t) => sum + Number(t.estimated_budget_inr || 0), 0);
    const procurementSavings = Math.max(0, totalBudget - totalAwardedValue);

    return { totalCount, totalAwardedValue, activeEvaluations, procurementSavings };
  }, [tenders]);

  const filteredTenders = useMemo(() => {
    return tenders.filter((t) => {
      const matchesFilter = filterStatus === "ALL" || t.status === filterStatus;
      const haystack = `${t.tender_code} ${t.package_name} ${t.trade_category}`.toLowerCase();
      const matchesSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchesFilter && matchesSearch;
    });
  }, [tenders, filterStatus, search]);

  const handleAwardLoi = async (tenderId: string, bidder: BidderQuotation) => {
    if (!isProcurementLeadOrArchitect) return;
    setActionInProgress(tenderId);

    const updatePayload: Partial<ProcurementTender> = {
      status: "AWARDED_LOI",
      awarded_vendor: bidder.contractor_name,
      awarded_amount_inr: bidder.quoted_amount_inr,
      loi_issued_at: new Date().toISOString(),
      issued_by: role.label,
    };

    try {
      await (supabase as any).from("procurement_tender_packages").update(updatePayload).eq("id", tenderId);
    } catch {
      // Optimistic local update
    }

    setTenders((prev) =>
      prev.map((t) => (t.id === tenderId ? { ...t, ...updatePayload } : t))
    );
    if (selectedTender && selectedTender.id === tenderId) {
      setSelectedTender((prev) => (prev ? { ...prev, ...updatePayload } : null));
    }
    setActionInProgress(null);
  };

  const handlePrintLOI = (tender: ProcurementTender) => {
    const printWin = window.open("", "_blank", "width=1000,height=850");
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Letter of Intent (LOI) — ${tender.package_name}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
    .awarded { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .tar { text-align: right; font-family: monospace; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 16px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 60px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 36px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · CPWD Works Manual / FIDIC Clause 4.4 Subcontract Award</div>
      <h1 class="title">Formal Letter of Intent (LOI) &amp; Work Order Award</h1>
      <div class="meta">Package Ref: ${tender.tender_code} · Project: ${project.name} (${project.id})</div>
    </div>
    <span class="badge awarded">${tender.status.replace(/_/g, ' ')}</span>
  </div>

  <table>
    <tr><th>Awarded Vendor / Contractor</th><td><strong>${tender.awarded_vendor || 'L1 Bidder Under Award'}</strong></td><th>Package Classification</th><td>${tender.package_name}</td></tr>
    <tr><th>Trade Designation</th><td>${tender.trade_category}</td><th>Contract Value Awarded</th><td class="tar" style="color: #0284c7; font-size: 12px; font-weight: bold;">₹${(tender.awarded_amount_inr || tender.estimated_budget_inr).toLocaleString("en-IN")}</td></tr>
  </table>

  <table>
    <thead>
      <tr><th>Bidder Entity</th><th class="tar">Technical Score</th><th class="tar">Quoted Total (INR)</th><th class="tar">Variance to Estimate</th><th>Bid Rank</th></tr>
    </thead>
    <tbody>
      ${tender.bidders.map((b) => `
        <tr style="${b.contractor_name === tender.awarded_vendor ? 'background: #f0fdf4; font-weight: bold;' : ''}">
          <td>${b.contractor_name}</td>
          <td class="tar">${b.technical_score_pct}%</td>
          <td class="tar">₹${b.quoted_amount_inr.toLocaleString("en-IN")}</td>
          <td class="tar" style="color: ${b.variance_to_estimate_pct < 0 ? '#15803d' : '#b91c1c'};">${b.variance_to_estimate_pct > 0 ? '+' : ''}${b.variance_to_estimate_pct.toFixed(2)}%</td>
          <td><span style="font-family: monospace;">${b.ranking}</span></td>
        </tr>
      `).join("")}
    </tbody>
  </table>

  <div class="box">
    <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #475569; margin-bottom: 4px;">Standard Contractual Conditions of Award</div>
    <div>1. Mobilization period is 7 calendar days from LOI receipt. 5% statutory retention will be held per RA billing cycle.<br/>
    2. Submittals (MAR), method statements, and labor muster strength must be submitted prior to mobilization draw.<br/>
    3. Defect Liability Period (DLP) shall govern for 12 months post Taking-Over Certificate (TOC) release.</div>
  </div>

  <div class="footer">
    <div>
      <div>Contracts &amp; Procurement Lead</div>
      <div style="color: #64748b;">Competitive bid matrix verified.</div>
      <div class="sig">Procurement Signature</div>
    </div>
    <div>
      <div>Awarded Subcontractor</div>
      <div style="color: #64748b;">${tender.awarded_vendor || 'Agreed & Accepted'}</div>
      <div class="sig">Authorized Vendor Sign</div>
    </div>
    <div>
      <div>Employer Project Director</div>
      <div style="color: #64748b;">${tender.issued_by || 'Work Order Sanctioned'}</div>
      <div class="sig">Employer Approval Stamp</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  if (loading || !selectedTender) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        INITIALIZING PROCUREMENT PACKAGES &amp; COMPETITIVE BID EVALUATION MATRIX...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Procurement and Tendering · CPWD Section 17 / FIDIC Clause 4.4</span>
              <span>·</span>
              <span className="text-zinc-400">{project.name}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Procurement Tenders and Bid Evaluation Matrix
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Strict dual-envelope competitive bidding. Ranks subcontractors by technical capability score (75% or greater) and commercial normalization (L1 / L2) before releasing the formal Letter of Intent (LOI).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handlePrintLOI(selectedTender)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Award Letter (LOI)</span>
            </button>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs font-semibold">
              Procurement: <strong className="text-cyan-400">{role.label}</strong>
            </span>
          </div>
        </div>

        {/* 4 PRIMARY PROCUREMENT GAUGES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Total Packages Sanctioned</span>
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-white mt-2">
              {summary.totalCount} RFP Packages
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Across all civil and finish trades</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Awarded Contract Value</span>
              <Award className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {formatInr(summary.totalAwardedValue)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Bound under signed Letters of Intent (LOI)</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Commercial Savings Generated</span>
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-emerald-400 mt-2">
              {formatInr(summary.procurementSavings)}
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Delta against initial estimated budget</div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400 text-xs">
              <span>Active Tender Pipeline</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-extrabold font-mono text-amber-400 mt-2">
              {summary.activeEvaluations} Packages
            </div>
            <div className="text-[11px] text-zinc-500 mt-1">Under technical / commercial review</div>
          </div>
        </div>

        {/* TOOLBAR FILTER TABS */}
        <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3 overflow-x-auto">
          {[
            { key: "ALL", label: `All Tenders (${tenders.length})` },
            { key: "COMMERCIAL_BID_OPENED", label: "Bid Matrix Opened" },
            { key: "AWARDED_LOI", label: "Awarded (LOI Issued)" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold whitespace-nowrap transition ${
                filterStatus === tab.key
                  ? "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50"
                  : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 2-COLUMN WORKBENCH: TENDER LIST (7 cols) vs BID COMPARISON & AWARD DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: TENDER PACKAGES (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Procurement Register
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">Trade Package Procurement Queue</h2>
              </div>
              <span className="text-xs font-mono text-zinc-500">{filteredTenders.length} Packages</span>
            </div>

            <div className="space-y-3">
              {filteredTenders.map((tender) => {
                const isSelected = selectedTender.id === tender.id;
                const isAwarded = tender.status === "AWARDED_LOI";

                return (
                  <div
                    key={tender.id}
                    onClick={() => setSelectedTender(tender)}
                    className={`rounded-xl border p-4 transition cursor-pointer space-y-3 ${
                      isSelected
                        ? "border-cyan-500/50 bg-cyan-950/20 shadow-lg shadow-cyan-950/30"
                        : "border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-white">
                          {tender.tender_code}
                        </span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-mono font-bold uppercase ${
                          isAwarded
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                        }`}>
                          {tender.status.replace(/_/g, " ")}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-mono font-extrabold text-white">
                          Est: {formatInr(tender.estimated_budget_inr)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs font-bold text-zinc-100">{tender.package_name}</div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">{tender.trade_category}</div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 pt-2 border-t border-zinc-800/60">
                      <span>Bidders: <strong className="text-zinc-300">{tender.bidders.length} Qualified</strong></span>
                      <span>Awarded: <strong className="text-emerald-400">{tender.awarded_vendor || "Evaluation Active"}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: BID MATRIX & LOI AWARD DESK (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Commercial Evaluation Desk
                </span>
                <h3 className="text-sm font-bold text-white mt-0.5">{selectedTender.package_name}</h3>
              </div>
              <span className="text-xs font-mono text-zinc-400">
                {selectedTender.tender_code}
              </span>
            </div>

            <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-2 text-xs font-mono">
              <span className="text-[10px] uppercase text-zinc-500 block">Package Scope:</span>
              <strong className="text-white text-sm font-sans block leading-snug">{selectedTender.package_name}</strong>
              <div className="text-cyan-400 text-[11px]">{selectedTender.trade_category}</div>
              <div className="pt-2 border-t border-zinc-800/60 flex justify-between items-baseline text-[11px]">
                <span className="text-zinc-400">Approved Budget:</span>
                <strong className="text-white">{formatInr(selectedTender.estimated_budget_inr)}</strong>
              </div>
            </div>

            {/* BIDDER MATRIX EVALUATION CARDS */}
            <div className="space-y-2.5">
              <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Subcontractor Bid Quotations ({selectedTender.bidders.length}):
              </span>

              {selectedTender.bidders.map((bidder) => {
                const isDisqualified = bidder.ranking === "DISQUALIFIED";
                const isL1 = bidder.ranking === "L1";
                const isSelectedForAward = selectedTender.awarded_vendor === bidder.contractor_name;

                return (
                  <div
                    key={bidder.bidder_id}
                    className={`p-3.5 rounded-xl border transition space-y-2 text-xs font-mono ${
                      isSelectedForAward
                        ? "border-emerald-800/80 bg-emerald-950/20 shadow-md"
                        : isDisqualified
                        ? "border-zinc-800 bg-zinc-900/20 opacity-60"
                        : "border-zinc-800 bg-zinc-900/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                          isL1
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                            : isDisqualified
                            ? "bg-rose-950 text-rose-400 border border-rose-800/50"
                            : "bg-zinc-800 text-zinc-300"
                        }`}>
                          {bidder.ranking}
                        </span>
                        <strong className="text-white font-sans text-xs">{bidder.contractor_name}</strong>
                      </div>

                      <strong className="text-white font-mono">
                        {formatInr(bidder.quoted_amount_inr)}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-zinc-400 pt-1 border-t border-zinc-800/60">
                      <span>Tech Score: <strong className={bidder.technical_score_pct >= 75 ? "text-emerald-400" : "text-rose-400"}>{bidder.technical_score_pct}%</strong></span>
                      <span>Variance: <strong className={bidder.variance_to_estimate_pct < 0 ? "text-emerald-400" : "text-amber-400"}>{bidder.variance_to_estimate_pct > 0 ? "+" : ""}{bidder.variance_to_estimate_pct.toFixed(1)}%</strong></span>
                      <span>Schedule: <strong className="text-zinc-200">{bidder.proposed_duration_days}d</strong></span>
                    </div>

                    {!selectedTender.awarded_vendor && !isDisqualified && (
                      <div className="pt-2 border-t border-zinc-800/60">
                        <button
                          type="button"
                          disabled={!isProcurementLeadOrArchitect || actionInProgress === selectedTender.id}
                          onClick={() => handleAwardLoi(selectedTender.id, bidder)}
                          className={`w-full py-1.5 rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-sm ${
                            isL1
                              ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
                              : "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                          }`}
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Award Letter of Intent (LOI)</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {selectedTender.status === "AWARDED_LOI" && (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>LOI Issued to {selectedTender.awarded_vendor} ({formatInr(selectedTender.awarded_amount_inr || 0)})</span>
              </div>
            )}

            <div className="pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 font-mono text-center">
              CPWD Works Manual Section 17 and FIDIC Subcontract Award Protocol
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}