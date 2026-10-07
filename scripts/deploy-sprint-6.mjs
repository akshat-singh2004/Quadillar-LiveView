import fs from 'fs';
import path from 'path';

console.log("Starting Sprint 6 Procurement & CST Surgery...");

// --------------------------------------------------------------------------
// 1. Scrubbed app/procurement/tenders/page.tsx
// --------------------------------------------------------------------------
const tendersCode = `'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Award,
  Clock,
  Plus,
  Printer,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  TrendingDown,
  Building2,
  FileCheck2,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export type TenderStatus = 'RFP_ISSUED' | 'TECHNICAL_EVALUATION' | 'COMMERCIAL_BID_OPENED' | 'AWARDED_LOI' | 'CANCELLED_RETENDER';

export interface BidderQuotation {
  id: string;
  tender_id: string;
  contractor_name: string;
  technical_score_pct: number;
  quoted_amount_inr: number;
  proposed_duration_days: number;
  ranking: 'L1' | 'L2' | 'L3' | 'DISQUALIFIED';
  is_selected: boolean;
}

export interface ProcurementTender {
  id: string;
  project_id: string;
  tender_code: string;
  package_name: string;
  trade_category: string;
  estimated_budget_inr: number;
  emd_amount_inr: number;
  rfp_publish_date: string;
  bid_submission_deadline: string;
  status: TenderStatus;
  awarded_vendor?: string | null;
  awarded_amount_inr?: number | null;
  loi_issued_at?: string | null;
  issued_by?: string | null;
  bidders?: BidderQuotation[];
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return \`₹\${(val / 10000000).toFixed(2)} Cr\`;
  if (Math.abs(val) >= 100000) return \`₹\${(val / 100000).toFixed(2)} Lakh\`;
  return \`₹\${Math.round(val || 0).toLocaleString('en-IN')}\`;
}

export default function ProcurementTendersPage() {
  const { project, role } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || 'proj-1';
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [tenders, setTenders] = useState<ProcurementTender[]>([]);
  const [selectedTender, setSelectedTender] = useState<ProcurementTender | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [pkgName, setPkgName] = useState('');
  const [tradeCat, setTradeCat] = useState('Civil & Superstructure');
  const [budget, setBudget] = useState('');
  const [deadline, setDeadline] = useState('');

  const loadTenders = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('procurement_tender_packages')
        .select('*, bidders:procurement_tender_bids(*)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = data || [];
      setTenders(list);

      setSelectedTender((prev) => {
        if (!prev) return list.length > 0 ? list[0] : null;
        return list.find((t: ProcurementTender) => t.id === prev.id) || (list.length > 0 ? list[0] : null);
      });
    } catch (err: any) {
      console.error('Failed to load tenders:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadTenders();
  }, [loadTenders]);

  const summary = useMemo(() => {
    const totalCount = tenders.length;
    const awardedTenders = tenders.filter((t) => t.status === 'AWARDED_LOI');
    const totalAwardedValue = awardedTenders.reduce((sum, t) => sum + Number(t.awarded_amount_inr || 0), 0);
    const activeEvaluations = tenders.filter((t) => t.status === 'RFP_ISSUED' || t.status === 'COMMERCIAL_BID_OPENED').length;
    const totalBudget = tenders.reduce((sum, t) => sum + Number(t.estimated_budget_inr || 0), 0);
    const procurementSavings = Math.max(0, totalBudget - totalAwardedValue);

    return { totalCount, totalAwardedValue, activeEvaluations, procurementSavings };
  }, [tenders]);

  const filteredTenders = useMemo(() => {
    return tenders.filter((t) => {
      const matchStatus = filterStatus === 'ALL' || t.status === filterStatus;
      const haystack = \`\${t.tender_code} \${t.package_name} \${t.trade_category}\`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [tenders, filterStatus, search]);

  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pkgName.trim() || !budget || !deadline) return;

    setActionInProgress('creating_pkg');
    const code = \`RFP-\${new Date().getFullYear()}-\${(tenders.length + 1).toString().padStart(3, '0')}\`;

    const payload = {
      project_id: projectId,
      tender_code: code,
      package_name: pkgName.trim(),
      trade_category: tradeCat,
      estimated_budget_inr: parseFloat(budget) || 0,
      bid_submission_deadline: deadline,
      status: 'RFP_ISSUED',
      issued_by: (role as any)?.label || 'Contracts Lead',
    };

    try {
      const { data, error } = await (supabase as any)
        .from('procurement_tender_packages')
        .insert([payload])
        .select('*, bidders:procurement_tender_bids(*)')
        .single();

      if (error) throw error;

      setModalOpen(false);
      setPkgName('');
      setBudget('');
      setDeadline('');
      setFeedback(\`Tender package \${code} published successfully.\`);
      setTimeout(() => setFeedback(null), 3500);
      await loadTenders();
      if (data) setSelectedTender(data);
    } catch (err: any) {
      setFeedback(err.message || 'Failed to publish tender package.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAwardLoi = async (tenderId: string, bidder: BidderQuotation) => {
    setActionInProgress(tenderId);
    try {
      await (supabase as any)
        .from('procurement_tender_packages')
        .update({
          status: 'AWARDED_LOI',
          awarded_vendor: bidder.contractor_name,
          awarded_amount_inr: bidder.quoted_amount_inr,
          loi_issued_at: new Date().toISOString(),
          issued_by: (role as any)?.label || 'Project Director',
        })
        .eq('id', tenderId);

      await (supabase as any)
        .from('procurement_tender_bids')
        .update({ is_selected: true })
        .eq('id', bidder.id);

      setFeedback(\`Letter of Intent (LOI) issued to \${bidder.contractor_name}.\`);
      setTimeout(() => setFeedback(null), 3500);
      await loadTenders();
    } catch (err: any) {
      console.error('Failed to issue LOI:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              PROCUREMENT &amp; TENDERING • CPWD WORKS MANUAL SECTION 17 / FIDIC CL. 4.4
              <StatutoryInfo
                standardRef="CPWD MANUAL SEC. 17 / FIDIC CL. 4.4"
                title="Tender Packages & Subcontractor Prequalification"
                idealRange="EMD: 2.0% of Estimate"
                description="Governs competitive bidding, publication of NIT/RFP notices, statutory 2% Earnest Money Deposit (EMD) retention, and formal issuance of Letters of Intent (LOI) to responsive lowest (L1) bidders."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
              <span>Procurement Tenders &amp; RFP Package Ledger</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Dual-envelope competitive bidding, EMD tracking, and LOI contract award governance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadTenders()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Publish RFP Package</span>
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
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Total Packages Sanctioned</span>
            <div className="text-2xl font-bold text-white mt-1">
              {summary.totalCount} RFP Packages
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Trade procurement queue</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Awarded Contract Value</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {formatInr(summary.totalAwardedValue)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Bound under executed LOIs</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Commercial Savings</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {formatInr(summary.procurementSavings)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Below estimated budget</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Active Tender Pipeline</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {summary.activeEvaluations} Packages
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">In evaluation or bidding</span>
          </div>
        </div>

        {/* 2-COLUMN VIEWPORT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="font-bold text-white uppercase">Tender Packages ({tenders.length})</span>
              <span className="text-zinc-500 text-[10px]">CPWD Section 17</span>
            </div>

            {tenders.length === 0 ? (
              <div className="p-12 text-center border border-zinc-850 bg-zinc-950">
                <FileSpreadsheet className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <div className="text-zinc-400 font-bold uppercase">Zero Tender Packages Published</div>
                <p className="text-[11px] text-zinc-600 font-sans mt-1 max-w-sm mx-auto">
                  No active trade packages. Click &quot;Publish RFP Package&quot; to issue a notice inviting tenders.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto">
                {filteredTenders.map((t) => {
                  const isSelected = selectedTender?.id === t.id;
                  const isAwarded = t.status === 'AWARDED_LOI';

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTender(t)}
                      className={\`p-4 rounded border cursor-pointer transition space-y-2.5 \${
                        isSelected ? 'border-cyan-500/60 bg-cyan-950/20' : 'border-zinc-850 bg-zinc-950 hover:border-zinc-700'
                      }\`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">{t.tender_code}</span>
                        <span className={\`text-[9px] px-2 py-0.5 rounded font-bold uppercase \${
                          isAwarded ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                        }\`}>
                          {t.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-zinc-200">{t.package_name}</div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-850 pt-2">
                        <span>Est: <strong className="text-white">{formatInr(Number(t.estimated_budget_inr))}</strong></span>
                        <span>EMD: <strong className="text-amber-400">{formatInr(Number(t.emd_amount_inr))}</strong></span>
                        <span>Deadline: <strong className="text-zinc-300">{t.bid_submission_deadline}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            {selectedTender ? (
              <div className="space-y-4">
                <div className="border-b border-zinc-800 pb-2">
                  <span className="text-xs font-bold text-cyan-400">{selectedTender.tender_code}</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{selectedTender.package_name}</h3>
                  <div className="text-[10px] text-zinc-500">{selectedTender.trade_category}</div>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-850 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Estimated Budget:</span>
                    <strong className="text-white">{formatInr(Number(selectedTender.estimated_budget_inr))}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Earnest Money (2% EMD):</span>
                    <strong className="text-amber-400">{formatInr(Number(selectedTender.emd_amount_inr))}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Submission Due Date:</span>
                    <span className="text-zinc-300">{selectedTender.bid_submission_deadline}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white uppercase text-[10px]">
                      Submitted Bid Quotations ({selectedTender.bidders?.length || 0})
                    </span>
                    <Link
                      href="/procurement/tender-evaluation"
                      className="text-[10px] text-cyan-400 hover:underline"
                    >
                      Open Comparative Statement (CST) &rarr;
                    </Link>
                  </div>

                  {(!selectedTender.bidders || selectedTender.bidders.length === 0) ? (
                    <div className="p-4 text-center text-zinc-600 border border-zinc-850 bg-zinc-950">
                      Zero bids submitted. Awaiting vendor proposal submissions.
                    </div>
                  ) : (
                    selectedTender.bidders.map((b) => (
                      <div key={b.id} className="p-3 bg-zinc-950 border border-zinc-850 rounded space-y-1.5">
                        <div className="flex justify-between items-center">
                          <strong className="text-white">{b.contractor_name}</strong>
                          <span className="text-xs font-bold text-emerald-400">{formatInr(Number(b.quoted_amount_inr))}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] text-zinc-500">
                          <span>Tech Score: <strong className="text-cyan-400">{b.technical_score_pct}%</strong></span>
                          <span>Rank: <strong className="text-amber-400">{b.ranking}</strong></span>
                        </div>
                        {selectedTender.status !== 'AWARDED_LOI' && b.ranking === 'L1' && (
                          <button
                            type="button"
                            onClick={() => handleAwardLoi(selectedTender.id, b)}
                            className="w-full mt-1 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase text-[10px] rounded transition"
                          >
                            Award Letter of Intent (LOI)
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {selectedTender.status === 'AWARDED_LOI' && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded text-center text-xs text-emerald-400 font-bold">
                    ✓ Awarded to {selectedTender.awarded_vendor} ({formatInr(Number(selectedTender.awarded_amount_inr || 0))})
                  </div>
                )}
              </div>
            ) : (
              <div className="p-16 text-center text-zinc-600">Select a tender package to review status and bids.</div>
            )}
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Publish Procurement Tender Package</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
              </div>

              <form onSubmit={handleCreatePackage} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Package Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Unitized Curtain Wall &amp; Architectural Glazing"
                    value={pkgName}
                    onChange={(e) => setPkgName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Trade Category</label>
                    <select
                      value={tradeCat}
                      onChange={(e) => setTradeCat(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                    >
                      <option value="Civil & Superstructure">Civil &amp; Superstructure</option>
                      <option value="Facade & Glazing">Facade &amp; Glazing</option>
                      <option value="Custom Joinery & Millwork">Custom Joinery &amp; Millwork</option>
                      <option value="First-Fix Plumbing & Sanitary">Plumbing &amp; Sanitary</option>
                      <option value="Electrical & Substation">Electrical &amp; Substation</option>
                      <option value="HVAC & Chilled Water">HVAC &amp; Chilled Water</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Estimated Budget (₹) *</label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Bid Submission Deadline *</label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div className="p-3 bg-zinc-900 rounded border border-zinc-800 text-[11px] text-zinc-400">
                  <span>Statutory EMD Rule: </span>
                  <strong className="text-amber-400">2.0% Earnest Money Deposit ({formatInr((parseFloat(budget) || 0) * 0.02)})</strong> will be required from participating contractors.
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" disabled={actionInProgress === 'creating_pkg'} className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Publish Tender Package
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
`;

fs.writeFileSync("app/procurement/tenders/page.tsx", tendersCode, "utf8");
console.log("✓ Re-written app/procurement/tenders/page.tsx with pure zero-data RFP ledger.");

// --------------------------------------------------------------------------
// 2. Scrubbed app/procurement/tender-evaluation/page.tsx
// --------------------------------------------------------------------------
const evaluationCode = `'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Award,
  Scale,
  Plus,
  RefreshCw,
  Search,
  CheckCircle2,
  X,
  Sliders,
  DollarSign,
  Briefcase,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface BidItem {
  id: string;
  tender_id: string;
  contractor_name: string;
  quoted_amount_inr: number;
  technical_score_pct: number;
  safety_score_pct: number;
  financial_solvency_score_pct: number;
  plant_machinery_score_pct: number;
  proposed_duration_days: number;
  ranking: 'L1' | 'L2' | 'L3' | 'DISQUALIFIED';
  is_selected: boolean;
  committee_remarks?: string | null;
}

export interface TenderPackageItem {
  id: string;
  tender_code: string;
  package_name: string;
  estimated_budget_inr: number;
  emd_amount_inr: number;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return \`₹\${(val / 10000000).toFixed(2)} Cr\`;
  if (Math.abs(val) >= 100000) return \`₹\${(val / 100000).toFixed(2)} Lakh\`;
  return \`₹\${Math.round(val || 0).toLocaleString('en-IN')}\`;
}

export default function TenderEvaluationPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || 'proj-1';
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [packages, setPackages] = useState<TenderPackageItem[]>([]);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('');
  const [bids, setBids] = useState<BidItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Bid Form
  const [contractor, setContractor] = useState('');
  const [quoteAmt, setQuoteAmt] = useState('');
  const [techScore, setTechScore] = useState('85');
  const [safetyScore, setSafetyScore] = useState('90');
  const [duration, setDuration] = useState('60');

  const loadPackagesAndBids = useCallback(async () => {
    setLoading(true);
    try {
      const { data: pkgData, error: pkgErr } = await (supabase as any)
        .from('procurement_tender_packages')
        .select('id, tender_code, package_name, estimated_budget_inr, emd_amount_inr')
        .eq('project_id', projectId);

      if (pkgErr) throw pkgErr;
      const pkgList = pkgData || [];
      setPackages(pkgList);

      const activePkgId = selectedPackageId || (pkgList.length > 0 ? pkgList[0].id : '');
      if (activePkgId && !selectedPackageId) setSelectedPackageId(activePkgId);

      if (activePkgId) {
        const { data: bidData, error: bidErr } = await (supabase as any)
          .from('procurement_tender_bids')
          .select('*')
          .eq('tender_id', activePkgId)
          .order('quoted_amount_inr', { ascending: true });

        if (bidErr) throw bidErr;
        setBids(bidData || []);
      } else {
        setBids([]);
      }
    } catch (err: any) {
      console.error('Failed to load CST data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedPackageId]);

  useEffect(() => {
    void loadPackagesAndBids();
  }, [loadPackagesAndBids]);

  const activePackage = useMemo(() => {
    return packages.find((p) => p.id === selectedPackageId) || null;
  }, [packages, selectedPackageId]);

  const sortedBids = useMemo(() => {
    return [...bids].sort((a, b) => Number(a.quoted_amount_inr) - Number(b.quoted_amount_inr));
  }, [bids]);

  const l1Bid = sortedBids[0] || null;
  const l2Bid = sortedBids[1] || null;

  const budget = Number(activePackage?.estimated_budget_inr || 0);
  const l1Amount = Number(l1Bid?.quoted_amount_inr || 0);
  const l1VariancePct = budget > 0 && l1Amount > 0 ? ((l1Amount - budget) / budget) * 100 : 0;
  const savingsInr = Math.max(0, budget - l1Amount);

  const handleCreateBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractor.trim() || !quoteAmt || !selectedPackageId) return;

    setSubmitting(true);
    const qAmount = parseFloat(quoteAmt) || 0;
    const rank = bids.length === 0 ? 'L1' : qAmount < Number(l1Bid?.quoted_amount_inr || Infinity) ? 'L1' : 'L2';

    const payload = {
      tender_id: selectedPackageId,
      contractor_name: contractor.trim(),
      quoted_amount_inr: qAmount,
      technical_score_pct: parseFloat(techScore) || 80.0,
      safety_score_pct: parseFloat(safetyScore) || 85.0,
      financial_solvency_score_pct: 85.0,
      plant_machinery_score_pct: 85.0,
      proposed_duration_days: parseInt(duration, 10) || 60,
      ranking: rank,
      is_selected: false,
    };

    try {
      const { error } = await (supabase as any).from('procurement_tender_bids').insert([payload]);
      if (error) throw error;

      setModalOpen(false);
      setContractor('');
      setQuoteAmt('');
      setFeedback('Vendor bid registered in Comparative Statement (CS).');
      setTimeout(() => setFeedback(null), 3500);
      await loadPackagesAndBids();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to record vendor bid.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              COMMERCIAL EVALUATION • CPWD WORKS MANUAL CH. V &amp; VI / CST
              <StatutoryInfo
                standardRef="CPWD MANUAL CH. V & VI / SEC. 22"
                title="Comparative Statement of Tenders (CST)"
                idealRange="Justified Range: -5% to +10%"
                description="Tabulates side-by-side contractor rate quotes against the DSR 2023 estimated baseline. Bids within -5% to +10% are admissible without mandatory negotiation. Bids lower than -15% require an Additional Performance Security (APS)."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Scale className="w-6 h-6 text-cyan-400" />
              <span>Comparative Statement of Tenders (CST Engine)</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Automated L1/L2 ranking, rate deviation indexing, and statutory award justification.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {packages.length > 0 && (
              <select
                value={selectedPackageId}
                onChange={(e) => setSelectedPackageId(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded text-xs text-white"
              >
                {packages.map((p) => (
                  <option key={p.id} value={p.id}>{p.tender_code} - {p.package_name}</option>
                ))}
              </select>
            )}
            <button
              onClick={() => void loadPackagesAndBids()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              disabled={!selectedPackageId}
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Enter Bid Quotation</span>
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
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Engineer&apos;s Estimate (Baseline)</span>
            <div className="text-2xl font-bold text-white mt-1">
              {formatInr(budget)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">CPWD DSR 2023 schedule</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">L1 Lowest Responsive Bid</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {l1Bid ? formatInr(l1Amount) : 'Awaiting Bids'}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              {l1Bid ? \`\${l1VariancePct >= 0 ? '+' : ''}\${l1VariancePct.toFixed(2)}% vs Baseline\` : '0 bids recorded'}
            </span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Procurement Savings (vs Est)</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {formatInr(savingsInr)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Net commercial saving</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">L1 / L2 Bid Spread</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {l2Bid ? formatInr(Number(l2Bid.quoted_amount_inr) - l1Amount) : '₹0.00'}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">{bids.length} Qualified Bidders</span>
          </div>
        </div>

        {/* COMPARATIVE TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="text-white font-bold text-xs uppercase block">
              Comparative Statement of Tenders (CST) — {activePackage?.tender_code || 'No Package Selected'}
            </span>
            <span className="text-zinc-500 text-[10px]">Ranked L1 to Ln</span>
          </div>

          {bids.length === 0 ? (
            <div className="p-12 text-center border border-zinc-850 bg-zinc-950 text-xs text-zinc-500">
              Zero bidder quotations registered for this package. Click &quot;Enter Bid Quotation&quot; to log vendor bids.
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3 text-center">Rank</th>
                    <th className="p-3">Contractor Entity</th>
                    <th className="p-3 text-right">Quoted Amount (₹)</th>
                    <th className="p-3 text-right">Variance vs Baseline</th>
                    <th className="p-3 text-center">Technical Score</th>
                    <th className="p-3 text-center">Tenure</th>
                    <th className="p-3 text-center">Statutory Finding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {sortedBids.map((b, idx) => {
                    const variance = budget > 0 ? ((Number(b.quoted_amount_inr) - budget) / budget) * 100 : 0;
                    const isL1 = idx === 0;

                    return (
                      <tr key={b.id} className={\`hover:bg-zinc-900/50 transition \${isL1 ? 'bg-emerald-950/20' : ''}\`}>
                        <td className="p-3 text-center font-bold">
                          <span className={\`px-2 py-0.5 rounded text-[10px] \${isL1 ? 'bg-emerald-500 text-zinc-950 font-extrabold' : 'bg-zinc-800 text-zinc-300'}\`}>
                            L{idx + 1}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-white">{b.contractor_name}</td>
                        <td className="p-3 text-right font-bold text-emerald-400">{formatInr(Number(b.quoted_amount_inr))}</td>
                        <td className="p-3 text-right font-bold">
                          <span className={variance < 0 ? 'text-emerald-400' : 'text-amber-400'}>
                            {variance >= 0 ? '+' : ''}{variance.toFixed(2)}%
                          </span>
                        </td>
                        <td className="p-3 text-center text-cyan-300 font-bold">{b.technical_score_pct}%</td>
                        <td className="p-3 text-center text-zinc-400">{b.proposed_duration_days} Days</td>
                        <td className="p-3 text-center">
                          <span className={\`px-2 py-0.5 rounded text-[9px] font-bold uppercase \${
                            isL1 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-zinc-900 text-zinc-500'
                          }\`}>
                            {isL1 ? 'RECOMMENDED L1 AWARD' : 'HIGHER QUOTE'}
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

      </div>

      {/* ENTER BID MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs">Enter Subcontractor Bid Quotation</span>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateBid} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Contractor / Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Larsen &amp; Toubro Ltd"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Quoted Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={quoteAmt}
                    onChange={(e) => setQuoteAmt(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Proposed Tenure (Days)</label>
                  <input
                    type="number"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Technical Score (%)</label>
                  <input
                    type="number"
                    value={techScore}
                    onChange={(e) => setTechScore(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Safety / HSE Score (%)</label>
                  <input
                    type="number"
                    value={safetyScore}
                    onChange={(e) => setSafetyScore(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                  Record Bid
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
`;

fs.writeFileSync("app/procurement/tender-evaluation/page.tsx", evaluationCode, "utf8");
console.log("✓ Re-written app/procurement/tender-evaluation/page.tsx with pure zero-data CST comparative engine.");

// --------------------------------------------------------------------------
// 3. Scrubbed app/procurement/vendors/page.tsx (Replaced empty redirect with full Vendor Directory)
// --------------------------------------------------------------------------
const vendorsCode = `'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  AlertTriangle,
  Building2,
  Scale,
  Award,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface VendorRecord {
  id: string;
  project_id: string;
  vendor_code: string;
  contractor_name: string;
  trade_specialization: string;
  enlistment_class: 'CLASS_I_UNLIMITED' | 'CLASS_II_UPTO_15CR' | 'CLASS_III_UPTO_5CR' | 'CLASS_IV_UPTO_1CR' | 'CLASS_V_UPTO_25L';
  gstin: string;
  pan: string;
  bank_solvency_amount_inr: number;
  annual_turnover_inr: number;
  is_blacklisted_or_debarred: boolean;
  contact_person: string;
  contact_phone: string;
  status: 'EMPANELLED_ACTIVE' | 'PROVISIONAL_UNDER_SCRUTINY' | 'SUSPENDED_BLACK_FLAG';
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return \`₹\${(val / 10000000).toFixed(2)} Cr\`;
  if (Math.abs(val) >= 100000) return \`₹\${(val / 100000).toFixed(2)} Lakh\`;
  return \`₹\${Math.round(val || 0).toLocaleString('en-IN')}\`;
}

export default function ProcurementVendorsPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || 'proj-1';
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [contractor, setContractor] = useState('');
  const [trade, setTrade] = useState('Civil & Structural');
  const [enlistClass, setEnlistClass] = useState<VendorRecord['enlistment_class']>('CLASS_I_UNLIMITED');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [solvency, setSolvency] = useState('');
  const [turnover, setTurnover] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactPhone, setContactPhone] = useState('');

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('procurement_vendors')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (err: any) {
      console.error('Failed to load vendors:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadVendors();
  }, [loadVendors]);

  const summary = useMemo(() => {
    const totalCount = vendors.length;
    const class1Count = vendors.filter((v) => v.enlistment_class === 'CLASS_I_UNLIMITED').length;
    const totalSolvency = vendors.reduce((sum, v) => sum + Number(v.bank_solvency_amount_inr || 0), 0);
    const debarredCount = vendors.filter((v) => v.is_blacklisted_or_debarred).length;

    return { totalCount, class1Count, totalSolvency, debarredCount };
  }, [vendors]);

  const handleEmpanelVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractor.trim() || !gstin.trim() || !pan.trim()) return;

    setSubmitting(true);
    const code = \`VEND-\${new Date().getFullYear()}-\${(vendors.length + 1).toString().padStart(3, '0')}\`;

    const payload = {
      project_id: projectId,
      vendor_code: code,
      contractor_name: contractor.trim(),
      trade_specialization: trade,
      enlistment_class: enlistClass,
      gstin: gstin.trim().toUpperCase(),
      pan: pan.trim().toUpperCase(),
      bank_solvency_amount_inr: parseFloat(solvency) || 0,
      annual_turnover_inr: parseFloat(turnover) || 0,
      is_blacklisted_or_debarred: false,
      contact_person: contactPerson.trim() || 'Managing Director',
      contact_phone: contactPhone.trim() || '+91 9999999999',
      status: 'EMPANELLED_ACTIVE',
    };

    try {
      const { error } = await (supabase as any).from('procurement_vendors').insert([payload]);
      if (error) throw error;

      setModalOpen(false);
      setContractor('');
      setGstin('');
      setPan('');
      setSolvency('');
      setTurnover('');
      setFeedback(\`Vendor \${contractor} empanelled successfully under \${code}.\`);
      setTimeout(() => setFeedback(null), 3500);
      await loadVendors();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to empanel vendor.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              SUPPLY CHAIN MANAGEMENT • CPWD CONTRACTOR ENLISTMENT RULES 2023
              <StatutoryInfo
                standardRef="CPWD ENLISTMENT RULES 2023"
                title="Vendor Pre-Qualification &amp; Solvency Mandates"
                idealRange="Class I to Class V Solvency Verified"
                description="Governs contractor empanelment criteria: Class I (Unlimited), Class II (upto 15 Cr), Class III (upto 5 Cr). Requires mandatory bank solvency certificates, GSTIN compliance, and zero debarment/blacklisting verification."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              <span>Vendor Prequalification &amp; Empanelment Directory</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Registered subcontractors, statutory tax verification, bank solvency limits, and performance auditing.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadVendors()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Empanel Subcontractor</span>
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
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Empanelled Vendors</span>
            <div className="text-2xl font-bold text-white mt-1">
              {summary.totalCount} Contractors
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Active prequalified directory</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Class I Unlimited Vendors</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {summary.class1Count} Entities
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Tender capacity &gt; ₹15 Crore</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Verified Solvency Reserves</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {formatInr(summary.totalSolvency)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Bank solvency certificates</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Debarred / Blacklisted</span>
            <div className={\`text-2xl font-bold mt-1 \${summary.debarredCount > 0 ? "text-rose-400" : "text-emerald-400"}\`}>
              {summary.debarredCount} Debarred
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">CPWD Clause 19 black flag</span>
          </div>
        </div>

        {/* VENDORS TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="text-white font-bold text-xs uppercase block">
              Empanelled Vendor Directory ({vendors.length})
            </span>
          </div>

          {vendors.length === 0 ? (
            <div className="p-12 text-center border border-zinc-850 bg-zinc-950 text-xs text-zinc-500">
              Zero subcontractors empanelled. Click &quot;Empanel Subcontractor&quot; to register vendor qualifications.
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Vendor Code &amp; Name</th>
                    <th className="p-3">Trade Specialization</th>
                    <th className="p-3">CPWD Enlistment</th>
                    <th className="p-3">GSTIN / PAN</th>
                    <th className="p-3 text-right">Bank Solvency (₹)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {vendors.map((v) => (
                    <tr key={v.id} className="hover:bg-zinc-900/50 transition">
                      <td className="p-3">
                        <span className="text-white font-bold block">{v.contractor_name}</span>
                        <span className="text-[10px] text-cyan-400">{v.vendor_code}</span>
                      </td>
                      <td className="p-3 text-zinc-200">{v.trade_specialization}</td>
                      <td className="p-3 text-amber-400 font-bold">{v.enlistment_class.replace(/_/g, ' ')}</td>
                      <td className="p-3 font-mono text-[11px] text-zinc-400">
                        <div>GST: {v.gstin}</div>
                        <div>PAN: {v.pan}</div>
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-400">{formatInr(Number(v.bank_solvency_amount_inr))}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {v.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* EMPANEL VENDOR MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs">Empanel Subcontractor (CPWD Prequalification)</span>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleEmpanelVendor} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Company / Contractor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shapoorji Pallonji &amp; Co Ltd"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Trade Specialization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Structural Concrete"
                    value={trade}
                    onChange={(e) => setTrade(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">CPWD Enlistment Class</label>
                  <select
                    value={enlistClass}
                    onChange={(e) => setEnlistClass(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="CLASS_I_UNLIMITED">Class I (Unlimited)</option>
                    <option value="CLASS_II_UPTO_15CR">Class II (Up to ₹15 Cr)</option>
                    <option value="CLASS_III_UPTO_5CR">Class III (Up to ₹5 Cr)</option>
                    <option value="CLASS_IV_UPTO_1CR">Class IV (Up to ₹1 Cr)</option>
                    <option value="CLASS_V_UPTO_25L">Class V (Up to ₹25 Lakh)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">GSTIN Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 09AAACB1234F1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">PAN Card Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AAACB1234F"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Bank Solvency Amount (₹)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={solvency}
                    onChange={(e) => setSolvency(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Annual Turnover (₹)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={turnover}
                    onChange={(e) => setTurnover(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                  Empanel Subcontractor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
`;

fs.writeFileSync("app/procurement/vendors/page.tsx", vendorsCode, "utf8");
console.log("✓ Re-written app/procurement/vendors/page.tsx with pure zero-data vendor prequalification directory.");

// --------------------------------------------------------------------------
// 4. Wire Sidebar.tsx
// --------------------------------------------------------------------------
const sidebarPath = "components/layout/Sidebar.tsx";
if (fs.existsSync(sidebarPath)) {
  let content = fs.readFileSync(sidebarPath, "utf8");

  if (!content.includes("/procurement/tenders")) {
    content = content.replace(
      /(\{\s*label:\s*["\x27]Subcontractor Work Orders["\x27][^}]*\},)/g,
      `$1\n      { label: "Tender Packages (RFP)", href: "/procurement/tenders", icon: FileSpreadsheet },\n      { label: "Comparative Statement (CST)", href: "/procurement/tender-evaluation", icon: Scale },\n      { label: "Vendor Directory", href: "/procurement/vendors", icon: Users },`
    );

    if (!content.includes("FileSpreadsheet,")) {
      content = content.replace("FileCheck2,", "FileCheck2,\n  FileSpreadsheet,");
    }
  }

  fs.writeFileSync(sidebarPath, content, "utf8");
  console.log("✓ Linked Procurement Tenders, CST, and Vendors in Sidebar.tsx");
}

