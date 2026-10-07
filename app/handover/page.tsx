'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { ImageUploader } from '@/app/components/ImageUploader';
import { ValidatedEvidencePayload } from '@/lib/security/exifGeofenceValidator';
import {
  ClipboardCheck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Plus,
  RefreshCw,
  Clock,
  ArrowRight,
  FileText,
  DollarSign,
  Building,
} from 'lucide-react';

interface TakingOverCert {
  id: string;
  project_id: string;
  certificate_number: string;
  scope_description: string;
  substantial_completion_date: string;
  dlp_period_months: number;
  retention_released_inr: number;
  seor_signatory_hash?: string;
  client_signatory_hash?: string;
  status: 'INSPECTION_PENDING' | 'PUNCHLIST_OPEN' | 'TOC_ISSUED' | 'DLP_ACTIVE' | 'FINAL_COMPLETION';
}

interface PunchItem {
  id: string;
  project_id: string;
  toc_id?: string;
  item_code: string;
  trade_package: 'CIVIL_FINISHES' | 'MEP_SERVICES' | 'JOINERY_MILLWORK' | 'GLAZING_FACADE' | 'FIRE_SAFETY';
  location_grid: string;
  defect_description: string;
  category: 'CATEGORY_A_CRITICAL' | 'CATEGORY_B_DE_MINIMIS';
  cost_to_cure_inr: number;
  target_rectification_date: string;
  rectification_evidence_sha256?: string;
  status: 'OPEN' | 'CONTRACTOR_RECTIFIED' | 'CONSULTANT_VERIFIED_CLOSED';
  created_at: string;
}

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function SnagRegisterAndTocPage() {
  const { project, role } = useActiveRole();
  const activeProjectId = project?.project_id || project?.id || "GOMTI-NAGAR-PH1-FITOUT";

  const [tocs, setTocs] = useState<TakingOverCert[]>([]);
  const [snags, setSnags] = useState<PunchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter View
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'CAT_A' | 'CAT_B' | 'CLOSED'>('ALL');

  // New Snag Composer Form
  const [tradePackage, setTradePackage] = useState<PunchItem['trade_package']>('CIVIL_FINISHES');
  const [locationGrid, setLocationGrid] = useState('');
  const [defectDesc, setDefectDesc] = useState('');
  const [category, setCategory] = useState<PunchItem['category']>('CATEGORY_B_DE_MINIMIS');
  const [costToCure, setCostToCure] = useState('12000');
  const [targetDate, setTargetDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );

  // Remediation Action Modal
  const [selectedSnag, setSelectedSnag] = useState<PunchItem | null>(null);
  const [evidencePayload, setEvidencePayload] = useState<ValidatedEvidencePayload | null>(null);

  const loadData = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const [tocRes, snagRes] = await Promise.all([
        (supabase as any)
          .from('taking_over_certificates')
          .select('*')
          .eq('project_id', activeProjectId)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('punch_list_items')
          .select('*')
          .eq('project_id', activeProjectId)
          .order('created_at', { ascending: false }),
      ]);

      if (tocRes.error) throw tocRes.error;
      if (snagRes.error) throw snagRes.error;

      setTocs(tocRes.data || []);
      setSnags(snagRes.data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Snag & TOC records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeProjectId]);

  // Aggregate Computation
  const aggregates = useMemo(() => {
    let openCatA = 0;
    let openCatB = 0;
    let totalCostToCure = 0;

    snags.forEach((s) => {
      if (s.status !== 'CONSULTANT_VERIFIED_CLOSED') {
        totalCostToCure += Number(s.cost_to_cure_inr) || 0;
        if (s.category === 'CATEGORY_A_CRITICAL') openCatA++;
        if (s.category === 'CATEGORY_B_DE_MINIMIS') openCatB++;
      }
    });

    const activeToc = tocs[0] || null;
    const canGrantToc = openCatA === 0;

    return {
      openCatA,
      openCatB,
      totalCostToCure,
      activeToc,
      canGrantToc,
      totalSnags: snags.length,
    };
  }, [snags, tocs]);

  const filteredSnags = useMemo(() => {
    if (activeFilter === 'CAT_A') return snags.filter((s) => s.category === 'CATEGORY_A_CRITICAL' && s.status !== 'CONSULTANT_VERIFIED_CLOSED');
    if (activeFilter === 'CAT_B') return snags.filter((s) => s.category === 'CATEGORY_B_DE_MINIMIS' && s.status !== 'CONSULTANT_VERIFIED_CLOSED');
    if (activeFilter === 'CLOSED') return snags.filter((s) => s.status === 'CONSULTANT_VERIFIED_CLOSED');
    return snags;
  }, [snags, activeFilter]);

  const handleCreateSnag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!locationGrid.trim() || !defectDesc.trim()) {
      setErrorMsg('Location Grid and Defect Description are mandatory.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const itemCode = `SNAG-${new Date().getFullYear()}-${(snags.length + 1).toString().padStart(3, '0')}`;

    const payload = {
      project_id: activeProjectId,
      toc_id: aggregates.activeToc?.id || null,
      item_code: itemCode,
      trade_package: tradePackage,
      location_grid: locationGrid.trim(),
      defect_description: defectDesc.trim(),
      category,
      cost_to_cure_inr: parseFloat(costToCure) || 0,
      target_rectification_date: targetDate,
      status: 'OPEN',
    };

    try {
      const { error } = await (supabase as any).from('punch_list_items').insert([payload]);
      if (error) throw error;

      setLocationGrid('');
      setDefectDesc('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to log snag item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyAndCloseSnag = async (snagId: string) => {
    if (!evidencePayload?.sha256Hash) {
      setErrorMsg('EVIDENCE REQUIRED: Attach geofenced photographic proof of completed remediation before closing snag.');
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('punch_list_items')
        .update({
          status: 'CONSULTANT_VERIFIED_CLOSED',
          rectification_evidence_sha256: evidencePayload.sha256Hash,
          closed_at: new Date().toISOString(),
        })
        .eq('id', snagId);

      if (error) throw error;

      setSelectedSnag(null);
      setEvidencePayload(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to close snag.');
    }
  };

  const handleGrantTOC = async (tocId: string) => {
    if (!aggregates.canGrantToc) {
      setErrorMsg('STATUTORY HOLD: Cannot grant Taking Over Certificate while Category A defects remain open (FIDIC Clause 10.1).');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const seorSig = `SEOR-TOC-${Date.now().toString(36).toUpperCase()}-FIDIC10`;
    const clientSig = `CLIENT-ACCEPT-${Date.now().toString(36).toUpperCase()}-DLP`;

    try {
      const { error } = await (supabase as any)
        .from('taking_over_certificates')
        .update({
          status: 'TOC_ISSUED',
          seor_signatory_hash: seorSig,
          client_signatory_hash: clientSig,
          issued_at: new Date().toISOString(),
        })
        .eq('id', tocId);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue Taking Over Certificate.');
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
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
              CONTRACTUAL HANDOVER • FIDIC RED BOOK CL. 10 / CPWD GCC CL. 8 TAKING OVER
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ClipboardCheck className="w-6 h-6 text-emerald-400" />
              <span>Taking Over Certificate (TOC) &amp; Snag Register</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{project?.project_name || 'Active Contract'}</strong> • Category A structural/life-safety defects block TOC issuance and lock Tranche 1 retention release.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadData()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 4 PRIMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Category A Snags (Critical)</span>
            <div className={`text-2xl font-bold mt-1 ${aggregates.openCatA > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
              {aggregates.openCatA} Defect(s)
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">
              {aggregates.openCatA > 0 ? 'TOC ISSUANCE BLOCKED' : 'Clean: Safe for occupancy'}
            </span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Category B Snags (Minor)</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {aggregates.openCatB} Cosmetic Lines
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">14-Day rectification window</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Total Cost-To-Cure Hold</span>
            <div className="text-2xl font-bold text-white mt-1">
              {formatInr(aggregates.totalCostToCure)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Remediation liability reserve</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Tranche 1 Retention at Stake</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {formatInr(aggregates.activeToc?.retention_released_inr || 205000)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">50% released on TOC sign-off</span>
          </div>
        </div>

        {/* TAKING OVER CERTIFICATE BANNER / SIGN-OFF GATE */}
        {aggregates.activeToc && (
          <div
            className={`p-5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs ${aggregates.activeToc.status === 'TOC_ISSUED'
                ? 'bg-emerald-950/30 border-emerald-800 text-emerald-300'
                : aggregates.canGrantToc
                  ? 'bg-cyan-950/30 border-cyan-800 text-cyan-300'
                  : 'bg-zinc-900/60 border-zinc-800 text-zinc-300'
              }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white">{aggregates.activeToc.certificate_number}</span>
                <span className="text-[9px] px-2 py-0.5 rounded font-bold uppercase bg-zinc-950 border border-zinc-700">
                  {aggregates.activeToc.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans">
                {aggregates.activeToc.scope_description} • Substantial Completion:{' '}
                <strong>{aggregates.activeToc.substantial_completion_date}</strong> • 12-Month DLP
              </p>
              {aggregates.activeToc.seor_signatory_hash && (
                <div className="text-[10px] text-emerald-400 font-mono">
                  SEOR STAMP: {aggregates.activeToc.seor_signatory_hash}
                </div>
              )}
            </div>

            <div>
              {aggregates.activeToc.status !== 'TOC_ISSUED' ? (
                <button
                  type="button"
                  disabled={!aggregates.canGrantToc || submitting}
                  onClick={() => handleGrantTOC(aggregates.activeToc!.id)}
                  className={`px-4 py-2 rounded text-xs font-bold uppercase transition flex items-center gap-2 ${aggregates.canGrantToc
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer shadow-lg shadow-emerald-950/50'
                      : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                    }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {aggregates.canGrantToc
                      ? 'Issue TOC & Release 50% Retention'
                      : 'Blocked: Open Category A Snag'}
                  </span>
                </button>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <ShieldCheck className="w-5 h-5" />
                  <span>TOC ISSUED • 12-MONTH DLP COMMENCED</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-zinc-800 gap-2 text-xs">
          <button
            onClick={() => setActiveFilter('ALL')}
            className={`pb-2.5 px-4 font-bold border-b-2 transition ${activeFilter === 'ALL'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            ALL DEFECTS ({snags.length})
          </button>
          <button
            onClick={() => setActiveFilter('CAT_A')}
            className={`pb-2.5 px-4 font-bold border-b-2 transition ${activeFilter === 'CAT_A'
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            CATEGORY A (TOC BLOCKING: {aggregates.openCatA})
          </button>
          <button
            onClick={() => setActiveFilter('CAT_B')}
            className={`pb-2.5 px-4 font-bold border-b-2 transition ${activeFilter === 'CAT_B'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
              }`}
          >
            CATEGORY B (MINOR SLA: {aggregates.openCatB})
          </button>
          <button
            onClick={() => setActiveFilter('CLOSED')}
            className={`pb-2.5 px-4 font-bold border-b-2 transition ${activeFilter === 'CLOSED'
                ? 'border-zinc-400 text-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
          >
            VERIFIED CLOSED ({snags.filter((s) => s.status === 'CONSULTANT_VERIFIED_CLOSED').length})
          </button>
        </div>

        {/* 2-COLUMN VIEWPORT: SNAG TABLE & COMPOSER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">

          {/* LEFT: AUDITED SNAG TABLE (8 COLS) */}
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="font-bold text-white uppercase text-xs">
                Audited Snag Register ({filteredSnags.length})
              </span>
              <span className="text-zinc-500 text-[10px]">FIDIC Clause 11 DLP Protocol</span>
            </div>

            {filteredSnags.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 border border-zinc-850">
                Zero defects logged under selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full text-left">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                    <tr>
                      <th className="p-2.5">Code / Defect</th>
                      <th className="p-2.5">Trade &amp; Location</th>
                      <th className="p-2.5 text-center">Category</th>
                      <th className="p-2.5 text-right">Cost to Cure</th>
                      <th className="p-2.5 text-center">Target SLA</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                    {filteredSnags.map((s) => {
                      const isClosed = s.status === 'CONSULTANT_VERIFIED_CLOSED';
                      const isCatA = s.category === 'CATEGORY_A_CRITICAL';

                      return (
                        <tr key={s.id} className="hover:bg-zinc-900/50 transition">
                          <td className="p-2.5">
                            <span className="text-white font-bold block">{s.item_code}</span>
                            <span className="text-zinc-300 font-sans text-[11px]">{s.defect_description}</span>
                          </td>
                          <td className="p-2.5 text-zinc-400">
                            <span className="text-cyan-400 block font-semibold">{s.trade_package.replace(/_/g, ' ')}</span>
                            <span>{s.location_grid}</span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isCatA
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                                }`}
                            >
                              {isCatA ? 'CAT A (CRITICAL)' : 'CAT B (MINOR)'}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-bold text-zinc-200">
                            {formatInr(Number(s.cost_to_cure_inr))}
                          </td>
                          <td className="p-2.5 text-center text-zinc-400">
                            {s.target_rectification_date}
                          </td>
                          <td className="p-2.5 text-center">
                            {!isClosed ? (
                              <button
                                type="button"
                                onClick={() => setSelectedSnag(s)}
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-700 rounded text-[10px] font-bold uppercase transition"
                              >
                                Rectify
                              </button>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-bold flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>CLOSED</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT: RECORD SNAG COMPOSER (4 COLS) */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Log Handover Snag</span>
              </span>
              <span className="text-[10px] text-zinc-500 uppercase">TOC Walkthrough</span>
            </div>

            <form onSubmit={handleCreateSnag} className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Trade Discipline</label>
                <select
                  value={tradePackage}
                  onChange={(e) => setTradePackage(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                >
                  <option value="CIVIL_FINISHES">Civil Finishes &amp; Flooring</option>
                  <option value="MEP_SERVICES">MEP Plumbing / Electrical</option>
                  <option value="JOINERY_MILLWORK">Bespoke Millwork &amp; Paneling</option>
                  <option value="GLAZING_FACADE">Glazing, Windows &amp; Façade</option>
                  <option value="FIRE_SAFETY">Fire Fighting &amp; Smoke Containment</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Spatial Location / Grid *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 302 Balcony / Axis B-4"
                  value={locationGrid}
                  onChange={(e) => setLocationGrid(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Defect Description *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. Water ponding near rainwater spout, tile slope deficit"
                  value={defectDesc}
                  onChange={(e) => setDefectDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block mb-1">Defect Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="CATEGORY_A_CRITICAL">Category A (Blocks TOC)</option>
                    <option value="CATEGORY_B_DE_MINIMIS">Category B (Minor Finishes)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block mb-1">Cost to Cure (₹)</label>
                  <input
                    type="number"
                    value={costToCure}
                    onChange={(e) => setCostToCure(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Rectification Target Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase text-xs flex items-center justify-center gap-1.5 transition mt-2"
              >
                <span>{submitting ? 'Registering...' : 'Register Snag Item'}</span>
              </button>
            </form>
          </div>

        </div>

        {/* PROOF OF RECTIFICATION MODAL */}
        {selectedSnag && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl bg-neutral-950 border border-neutral-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
                <div>
                  <span className="text-xs font-bold text-white block">{selectedSnag.item_code}</span>
                  <h3 className="text-sm font-bold text-emerald-400 mt-0.5">{selectedSnag.trade_package.replace(/_/g, ' ')}</h3>
                  <span className="text-[10px] text-neutral-400">{selectedSnag.location_grid}</span>
                </div>
                <button onClick={() => setSelectedSnag(null)} className="text-neutral-500 hover:text-neutral-300">
                  ✕
                </button>
              </div>

              <div className="p-3 bg-neutral-900 border border-neutral-800 text-xs">
                <span className="text-neutral-500 block text-[10px]">DEFECT FINDING</span>
                <p className="text-neutral-200 mt-1">{selectedSnag.defect_description}</p>
              </div>

              <div className="space-y-3">
                <span className="text-xs font-bold text-white block uppercase">Attach Proof of Rectification (Section 65B)</span>
                <p className="text-[11px] text-neutral-400 font-sans">
                  The consultant engineer will verify this geotagged photograph before clearing the defect.
                </p>

                <ImageUploader
                  entityType="PUNCH_ITEM"
                  entityId={selectedSnag.id}
                  onEvidenceValidated={(payload: any) => setEvidencePayload(payload)}
                />

                <button
                  type="button"
                  onClick={() => handleVerifyAndCloseSnag(selectedSnag.id)}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verify Rectification &amp; Close Snag</span>
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}