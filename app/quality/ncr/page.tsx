'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { ImageUploader } from '@/app/components/ImageUploader';
import { ValidatedEvidencePayload } from '@/lib/security/exifGeofenceValidator';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Plus,
  RefreshCw,
  TrendingDown,
  DollarSign,
  FileCheck2,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface QualityNCR {
  id: string;
  project_id: string;
  ncr_number: string;
  title: string;
  structural_grid: string;
  ifc_guid?: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  spec_clause_breach: string;
  financial_lien_inr: number;
  root_cause_analysis?: string;
  seor_disposition: 'PENDING_REVIEW' | 'REPAIR_EPOXY_GROUT' | 'ACCEPT_WITH_PENALTY' | 'NDT_CORE_CRUSH' | 'DEMOLISH_RECAST';
  seor_signatory_hash?: string;
  remedial_evidence_sha256?: string;
  status: 'OPEN' | 'ROOT_CAUSE_SUBMITTED' | 'SEOR_DISPOSITION_COMMITTED' | 'RECTIFIED_VERIFIED' | 'CLOSED';
  created_at: string;
}

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function QualityNcrManagementPage() {
  const { project, role } = useActiveRole();
  const activeProjectId = project?.project_id || project?.id || "GOMTI-NAGAR-PH1-FITOUT";

  const [ncrs, setNcrs] = useState<QualityNCR[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter State
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'OPEN_LIENS' | 'CLOSED'>('ALL');

  // New NCR Form
  const [title, setTitle] = useState('');
  const [gridLocation, setGridLocation] = useState('');
  const [ifcGuid, setIfcGuid] = useState('');
  const [severity, setSeverity] = useState<QualityNCR['severity']>('MAJOR');
  const [specBreach, setSpecBreach] = useState('');
  const [lienAmount, setLienAmount] = useState('');

  // Disposition Action Drawer Modal
  const [selectedNcr, setSelectedNcr] = useState<QualityNCR | null>(null);
  const [dispositionAction, setDispositionAction] = useState<QualityNCR['seor_disposition']>('REPAIR_EPOXY_GROUT');
  const [rootCauseNote, setRootCauseNote] = useState('');
  const [evidencePayload, setEvidencePayload] = useState<ValidatedEvidencePayload | null>(null);

  const loadNcrs = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('quality_ncr_register')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNcrs(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Quality NCR register.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNcrs();
  }, [activeProjectId]);

  // Aggregate Metrics
  const summary = useMemo(() => {
    let totalLienInr = 0;
    let criticalOpen = 0;
    let seorPending = 0;

    ncrs.forEach((n) => {
      if (n.status !== 'CLOSED') {
        totalLienInr += Number(n.financial_lien_inr) || 0;
        if (n.severity === 'CRITICAL') criticalOpen++;
        if (n.seor_disposition === 'PENDING_REVIEW') seorPending++;
      }
    });

    return { totalLienInr, criticalOpen, seorPending, totalCount: ncrs.length };
  }, [ncrs]);

  const filteredNcrs = useMemo(() => {
    if (filterStatus === 'OPEN_LIENS') return ncrs.filter((n) => n.status !== 'CLOSED');
    if (filterStatus === 'CLOSED') return ncrs.filter((n) => n.status === 'CLOSED');
    return ncrs;
  }, [ncrs, filterStatus]);

  const handleCreateNcr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !gridLocation.trim()) {
      setErrorMsg('Observation title and structural grid location are mandatory.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const ncrNum = `NCR-${new Date().getFullYear()}-${(ncrs.length + 1).toString().padStart(3, '0')}`;

    const payload = {
      project_id: activeProjectId,
      ncr_number: ncrNum,
      title: title.trim(),
      structural_grid: gridLocation.trim(),
      ifc_guid: ifcGuid.trim() || null,
      severity,
      spec_clause_breach: specBreach,
      financial_lien_inr: parseFloat(lienAmount) || 0,
      seor_disposition: 'PENDING_REVIEW',
      status: 'OPEN',
    };

    try {
      const { error } = await (supabase as any).from('quality_ncr_register').insert([payload]);
      if (error) throw error;

      setTitle('');
      setGridLocation('');
      setIfcGuid('');
      await loadNcrs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to raise structural NCR.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommitDisposition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNcr) return;

    setSubmitting(true);
    setErrorMsg(null);

    const seorSig = `SEOR-DISP-${Date.now().toString(36).toUpperCase()}-IS456`;

    try {
      const { error } = await (supabase as any)
        .from('quality_ncr_register')
        .update({
          seor_disposition: dispositionAction,
          root_cause_analysis: rootCauseNote.trim() || selectedNcr.root_cause_analysis,
          seor_signatory_hash: seorSig,
          status: 'SEOR_DISPOSITION_COMMITTED',
        })
        .eq('id', selectedNcr.id);

      if (error) throw error;

      setSelectedNcr(null);
      await loadNcrs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to commit SEOR disposition.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyRectificationAndClose = async (ncr: QualityNCR) => {
    if (!evidencePayload?.sha256Hash) {
      setErrorMsg('SECTION 65B EVIDENCE REQUIRED: Attach geofenced photograph of rectified element before dissolving financial lien.');
      return;
    }

    try {
      const { error } = await (supabase as any)
        .from('quality_ncr_register')
        .update({
          status: 'CLOSED',
          financial_lien_inr: 0.00, // Releases financial lien on IPC
          remedial_evidence_sha256: evidencePayload.sha256Hash,
          closed_at: new Date().toISOString(),
        })
        .eq('id', ncr.id);

      if (error) throw error;

      setSelectedNcr(null);
      setEvidencePayload(null);
      await loadNcrs();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to close NCR.');
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
              QUALITY ASSURANCE &amp; STATUTORY LIEN GOVERNANCE • IS 456 CL. 10.8 / FIDIC 7.6
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
              <span>Structural Non-Conformance (NCR) &amp; Debit Lien Engine</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{project?.project_name || 'Active Contract'}</strong> • Breached construction standards automatically freeze financial debit liens on active RA bills.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadNcrs()}
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

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Active Commercial Debit Liens</span>
            <div className={`text-2xl font-bold mt-1 ${summary.totalLienInr > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatInr(summary.totalLienInr)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Withheld on Running Account bills</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Critical Structural NCRs</span>
            <div className={`text-2xl font-bold mt-1 ${summary.criticalOpen > 0 ? 'text-rose-500' : 'text-zinc-100'}`}>
              {summary.criticalOpen} Open Defect(s)
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Immediate SEOR action required</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Awaiting SEOR Disposition</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {summary.seorPending} Observation(s)
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Engineering review queued</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Statutory NDT Protocol</span>
            <div className="text-2xl font-bold text-zinc-100 mt-1">IS 13311 / IS 516</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Core Extraction &amp; UPV Verification</span>
          </div>
        </div>

        {/* NAVIGATION FILTER TABS */}
        <div className="flex border-b border-zinc-800 gap-2 text-xs">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`pb-2.5 px-4 font-bold border-b-2 transition ${
              filterStatus === 'ALL'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ALL NCR DEFECTS ({ncrs.length})
          </button>
          <button
            onClick={() => setFilterStatus('OPEN_LIENS')}
            className={`pb-2.5 px-4 font-bold border-b-2 transition ${
              filterStatus === 'OPEN_LIENS'
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            ACTIVE FINANCIAL LIENS ({ncrs.filter((n) => n.status !== 'CLOSED').length})
          </button>
          <button
            onClick={() => setFilterStatus('CLOSED')}
            className={`pb-2.5 px-4 font-bold border-b-2 transition ${
              filterStatus === 'CLOSED'
                ? 'border-zinc-400 text-zinc-200'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            RECTIFIED &amp; RELEASED ({ncrs.filter((n) => n.status === 'CLOSED').length})
          </button>
        </div>

        {/* 2-COLUMN VIEWPORT: NCR REGISTER & COMPOSER */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">

          {/* LEFT: AUDITED NCR REGISTER (8 COLS) */}
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="font-bold text-white uppercase text-xs">
                Audited Non-Conformance Register ({filteredNcrs.length})
              </span>
              <span className="text-zinc-500 text-[10px]">Real-Time Commercial Lien Link</span>
            </div>

            {filteredNcrs.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 border border-zinc-850">
                Zero quality non-conformance records matching selected filter.
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full text-left">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                    <tr>
                      <th className="p-2.5">NCR Code / Title</th>
                      <th className="p-2.5">Location &amp; BIM GUID</th>
                      <th className="p-2.5 text-center">Severity</th>
                      <th className="p-2.5 text-right">Debit Lien</th>
                      <th className="p-2.5">SEOR Disposition</th>
                      <th className="p-2.5 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                    {filteredNcrs.map((n) => {
                      const isClosed = n.status === 'CLOSED';
                      return (
                        <tr key={n.id} className="hover:bg-zinc-900/50 transition">
                          <td className="p-2.5">
                            <span className="text-rose-400 font-bold block">{n.ncr_number}</span>
                            <span className="text-zinc-200 font-semibold">{n.title}</span>
                            <span className="text-[10px] text-zinc-500 block">{n.spec_clause_breach}</span>
                          </td>
                          <td className="p-2.5 text-zinc-400">
                            <div>{n.structural_grid}</div>
                            {n.ifc_guid && (
                              <span className="text-[10px] text-cyan-400 font-mono block">IFC: {n.ifc_guid}</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                n.severity === 'CRITICAL'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : n.severity === 'MAJOR'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}
                            >
                              {n.severity}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-bold text-rose-400">
                            {formatInr(Number(n.financial_lien_inr))}
                          </td>
                          <td className="p-2.5">
                            <span className="text-zinc-300 block font-semibold">
                              {n.seor_disposition.replace(/_/g, ' ')}
                            </span>
                            {n.seor_signatory_hash && (
                              <span className="text-[9px] text-emerald-400 font-mono block">SEOR SIGNED</span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => setSelectedNcr(n)}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded text-[10px] font-bold uppercase transition"
                            >
                              {isClosed ? 'Inspect' : 'Remediate'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RIGHT: RAISE NCR COMPOSER (4 COLS) */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-rose-500" />
                <span>Issue Quality NCR</span>
              </span>
              <span className="text-[10px] text-zinc-500 uppercase">Clause 10.8</span>
            </div>

            <form onSubmit={handleCreateNcr} className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Defect Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Honeycombing on soffit of transfer girder TG-01"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Structural Grid / Elevation *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grid C2-D3 / Elevation +8.4m"
                  value={gridLocation}
                  onChange={(e) => setGridLocation(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">BIM Element IFC GUID</label>
                <input
                  type="text"
                  placeholder="e.g. IFC_COL_L1_B2"
                  value={ifcGuid}
                  onChange={(e) => setIfcGuid(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-cyan-400 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block mb-1">Severity Tier</label>
                  <select
                    value={severity}
                    onChange={(e) => setSeverity(e.target.value as any)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs text-white"
                  >
                    <option value="CRITICAL">Critical (Structural Deficit)</option>
                    <option value="MAJOR">Major (Cover / Honeycomb)</option>
                    <option value="MINOR">Minor (Cosmetic Honeycomb)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block mb-1">Debit Lien (₹)</label>
                  <input
                    type="number"
                    value={lienAmount}
                    onChange={(e) => setLienAmount(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs text-rose-400 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Breached Technical Standard</label>
                <select
                  value={specBreach}
                  onChange={(e) => setSpecBreach(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-xs text-white"
                >
                  <option value="IS 456 Cl. 26.4 (Rebar Clear Cover Deficit)">IS 456 Cl. 26.4 (Cover Deficit)</option>
                  <option value="IS 456 Cl. 10.8 (Compaction & Honeycombing)">IS 456 Cl. 10.8 (Honeycombing)</option>
                  <option value="IS 516 (Concrete 28-day Cube Failure)">IS 516 (Cube Strength Failure)</option>
                  <option value="IS 1200 / CPWD (Formwork Line & Plumb Defect)">IS 1200 / CPWD (Plumb Out of Tol)</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase text-xs flex items-center justify-center gap-1.5 transition mt-2"
              >
                <span>{submitting ? 'Registering...' : 'Commit NCR & Impose Lien'}</span>
              </button>
            </form>
          </div>

        </div>

        {/* SEOR DISPOSITION & RECTIFICATION MODAL */}
        {selectedNcr && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-2xl bg-neutral-950 border border-neutral-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
                <div>
                  <span className="text-xs font-bold text-rose-400 block">{selectedNcr.ncr_number}</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{selectedNcr.title}</h3>
                  <span className="text-[10px] text-neutral-400">{selectedNcr.structural_grid} • {selectedNcr.spec_clause_breach}</span>
                </div>
                <button onClick={() => setSelectedNcr(null)} className="text-neutral-500 hover:text-neutral-300">
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 p-3 bg-neutral-900/50 border border-neutral-800 text-xs">
                <div>
                  <span className="text-neutral-500 block text-[10px]">CURRENT FINANCIAL LIEN</span>
                  <span className="text-rose-400 font-bold text-base">{formatInr(Number(selectedNcr.financial_lien_inr))}</span>
                </div>
                <div>
                  <span className="text-neutral-500 block text-[10px]">CURRENT STATUS</span>
                  <span className="text-white font-bold uppercase">{selectedNcr.status.replace(/_/g, ' ')}</span>
                </div>
              </div>

              {selectedNcr.status !== 'CLOSED' ? (
                <div className="space-y-4">
                  {/* SEOR Engineering Disposition Form */}
                  <form onSubmit={handleCommitDisposition} className="space-y-3">
                    <span className="text-xs font-bold text-emerald-400 block uppercase">1. SEOR Structural Engineering Disposition</span>
                    
                    <div>
                      <label className="text-[10px] text-neutral-400 uppercase block mb-1">Approved Remedial Protocol</label>
                      <select
                        value={dispositionAction}
                        onChange={(e) => setDispositionAction(e.target.value as any)}
                        className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-white"
                      >
                        <option value="REPAIR_EPOXY_GROUT">Epoxy Pressure Grouting (ASTM C881 / Micro-concrete)</option>
                        <option value="NDT_CORE_CRUSH">Non-Destructive Testing (IS 13311 Core Extraction)</option>
                        <option value="ACCEPT_WITH_PENALTY">Accept As-Is With Commercial Rate Penalty</option>
                        <option value="DEMOLISH_RECAST">Demolish &amp; Recast Structural Element</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-neutral-400 uppercase block mb-1">Root-Cause Engineering Findings</label>
                      <textarea
                        rows={2}
                        placeholder="State technical root cause (e.g. Inadequate needle vibrator insertion)..."
                        value={rootCauseNote}
                        onChange={(e) => setRootCauseNote(e.target.value)}
                        className="w-full bg-neutral-900 border border-neutral-800 p-2 text-xs text-white"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold uppercase text-xs rounded border border-neutral-600 transition"
                    >
                      {submitting ? 'Signing...' : 'Sign SEOR Engineering Order'}
                    </button>
                  </form>

                  {/* Section 65B Rectification Proof & Lien Release */}
                  <div className="border-t border-neutral-800 pt-4 space-y-3">
                    <span className="text-xs font-bold text-cyan-400 block uppercase">2. Closeout &amp; Financial Lien Release</span>
                    <p className="text-[11px] text-neutral-400 font-sans">
                      To release the {formatInr(Number(selectedNcr.financial_lien_inr))} debit lien on the contractor&apos;s RA bill, attach geofenced photographic proof of completed remediation.
                    </p>

                    <ImageUploader
                      entityType="NCR"
                      entityId={selectedNcr.id}
                      onEvidenceValidated={(payload: any) => setEvidencePayload(payload)}
                    />

                    <button
                      type="button"
                      onClick={() => handleVerifyRectificationAndClose(selectedNcr)}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify Rectification &amp; Release Financial Lien</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>DEFECT RESOLVED &amp; FINANCIAL LIEN DISSOLVED</span>
                  </div>
                  {selectedNcr.remedial_evidence_sha256 && (
                    <div className="text-[10px] font-mono break-all text-neutral-400">
                      SECTION 65B EVIDENCE HASH: {selectedNcr.remedial_evidence_sha256}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
