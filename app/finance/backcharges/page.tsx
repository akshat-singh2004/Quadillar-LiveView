'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { MinusCircle, ShieldCheck, CheckCircle2, Clock, AlertTriangle, Plus, RefreshCw, X, Scale, FileText, Check } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface BackchargeRecord {
  id: string;
  project_id: string;
  debit_note_number: string;
  subcontractor_name: string;
  contra_category: 'DAMAGED_WORK_RECTIFICATION' | 'REBAR_SCRAP_EXCESS_CL42' | 'FAILED_ITP_HOLD_GATE' | 'PPE_SAFETY_VIOLATION' | 'CLEANING_HOUSEKEEPING_DEFAULT' | 'EQUIPMENT_MISUSE_IDLE';
  incident_or_ncr_ref?: string | null;
  amount_inr: number;
  description: string;
  status: 'ISSUED_PENDING_DISPUTE' | 'UNDER_DISPUTE_REVIEW' | 'CERTIFIED_BY_PMC' | 'DEBITED_IN_IPC' | 'REVOKED_WAIVED';
  debited_in_bill_ref?: string | null;
  pmc_certifier_hash?: string | null;
  issued_at: string;
}

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function BackchargesPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [backcharges, setBackcharges] = useState<BackchargeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState<BackchargeRecord['contra_category']>('DAMAGED_WORK_RECTIFICATION');
  const [amount, setAmount] = useState('');
  const [ncrRef, setNcrRef] = useState('');
  const [description, setDescription] = useState('');

  const loadBackcharges = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('subcontractor_backcharges')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBackcharges(data || []);
    } catch (err: any) {
      console.error('Failed to load backcharges:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadBackcharges();
  }, [loadBackcharges]);

  const summary = useMemo(() => {
    const totalIssuedInr = backcharges.reduce((sum, b) => sum + Number(b.amount_inr || 0), 0);
    const certifiedInr = backcharges.filter((b) => b.status === 'CERTIFIED_BY_PMC' || b.status === 'DEBITED_IN_IPC')
      .reduce((sum, b) => sum + Number(b.amount_inr || 0), 0);
    const disputedCount = backcharges.filter((b) => b.status === 'UNDER_DISPUTE_REVIEW').length;

    return { totalIssuedInr, certifiedInr, disputedCount, count: backcharges.length };
  }, [backcharges]);

  const handleCreateBackcharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor.trim() || !amount || !description.trim()) return;

    setSubmitting(true);
    const debitNum = `DN-${new Date().getFullYear()}-${(backcharges.length + 1).toString().padStart(3, '0')}`;

    const payload = {
      project_id: projectId,
      debit_note_number: debitNum,
      subcontractor_name: vendor.trim(),
      contra_category: category,
      incident_or_ncr_ref: ncrRef.trim() || null,
      amount_inr: parseFloat(amount) || 0,
      description: description.trim(),
      status: 'ISSUED_PENDING_DISPUTE',
    };

    try {
      const { error } = await (supabase as any).from('subcontractor_backcharges').insert([payload]);
      if (error) throw error;

      setModalOpen(false);
      setVendor('');
      setAmount('');
      setNcrRef('');
      setDescription('');
      setFeedback('Contra-charge debit note issued successfully.');
      setTimeout(() => setFeedback(null), 3500);
      await loadBackcharges();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to issue backcharge.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCertifyBackcharge = async (id: string) => {
    const pmcHash = `PMC-CERT-${Date.now().toString(36).toUpperCase()}-CL14`;
    try {
      await (supabase as any)
        .from('subcontractor_backcharges')
        .update({
          status: 'CERTIFIED_BY_PMC',
          pmc_certifier_hash: pmcHash,
        })
        .eq('id', id);

      setFeedback('Contra-charge certified by PMC for immediate IPC deduction.');
      setTimeout(() => setFeedback(null), 3500);
      await loadBackcharges();
    } catch (err: any) {
      console.error('Failed to certify backcharge:', err);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              FINANCIAL GOVERNANCE • CPWD GCC CL. 14 &amp; 29 CONTRA-CHARGE RECOVERY
              <StatutoryInfo
                standardRef="CPWD GCC CL. 14 / CL. 29"
                title="Subcontractor Backcharges & Rectification Debits"
                idealRange="Deducted at 100% of PMC Rectification Invoices"
                description="When a subcontractor fails to rectify damaged works, defects, excess steel cutting scrap (>3%), or safety non-compliances, the General Contractor has the legal right to execute the work via third parties and debit the full cost directly against intermediate IPCs."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <MinusCircle className="w-6 h-6 text-rose-400" />
              <span>Subcontractor Backcharges &amp; Contra-Charge Ledger</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Rectification of defective work, safety penalties, and automated deduction from subcontractor IPC bills.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadBackcharges()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Contra-Charge (Debit Note)</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Total Contra-Charges Issued</span>
            <div className="text-2xl font-bold text-white mt-1">
              {formatInr(summary.totalIssuedInr)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">{summary.count} debit notes active</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Certified for IPC Deduction</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              {formatInr(summary.certifiedInr)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Debited on subcontractor bills</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Disputed Contra-Charges</span>
            <div className={`text-2xl font-bold mt-1 ${summary.disputedCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
              {summary.disputedCount} Under Review
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Awaiting PM mediation</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Statutory Framework</span>
            <div className="text-2xl font-bold text-zinc-200 mt-1">CPWD Cl. 14 / 29</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Contractor remedial right</span>
          </div>
        </div>

        {/* BACKCHARGES TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="text-white font-bold text-xs uppercase block">
              Contra-Charge Register ({backcharges.length})
            </span>
          </div>

          {backcharges.length === 0 ? (
            <div className="p-12 text-center border border-zinc-850 bg-zinc-950 text-xs">
              <MinusCircle className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <div className="text-zinc-400 font-bold uppercase">Zero Contra-Charges Issued</div>
              <p className="text-[11px] text-zinc-600 font-sans mt-1 max-w-sm mx-auto">
                No subcontractor backcharges on record. Click &quot;Issue Contra-Charge&quot; to penalize defective work or safety non-compliances.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Debit Note &amp; Subcontractor</th>
                    <th className="p-3">Category &amp; Reference</th>
                    <th className="p-3">Description of Default</th>
                    <th className="p-3 text-right">Debit Amount (₹)</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {backcharges.map((b) => {
                    const isCertified = b.status === 'CERTIFIED_BY_PMC' || b.status === 'DEBITED_IN_IPC';

                    return (
                      <tr key={b.id} className="hover:bg-zinc-900/50 transition">
                        <td className="p-3">
                          <span className="text-white font-bold block">{b.debit_note_number}</span>
                          <span className="text-[10px] text-cyan-400">{b.subcontractor_name}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-zinc-200 block font-semibold">{b.contra_category.replace(/_/g, ' ')}</span>
                          {b.incident_or_ncr_ref && (
                            <span className="text-[10px] text-zinc-500 font-mono">Ref: {b.incident_or_ncr_ref}</span>
                          )}
                        </td>
                        <td className="p-3 text-zinc-400 max-w-sm font-sans text-[11px] leading-relaxed">
                          {b.description}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-400 font-mono">
                          -{formatInr(Number(b.amount_inr))}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isCertified
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {b.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {!isCertified && (
                            <button
                              type="button"
                              onClick={() => handleCertifyBackcharge(b.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold uppercase transition"
                            >
                              Certify Debit
                            </button>
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

      </div>

      {/* ISSUE BACKCHARGE MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <MinusCircle className="w-4 h-4 text-rose-400" />
                <span>Issue Subcontractor Contra-Charge</span>
              </span>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateBackcharge} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Subcontractor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Woodworks & Interiors"
                    value={vendor}
                    onChange={(e) => setVendor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Contra Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="DAMAGED_WORK_RECTIFICATION">Damaged Works Rectification</option>
                    <option value="REBAR_SCRAP_EXCESS_CL42">Rebar Scrap Excess (&gt; 3%)</option>
                    <option value="FAILED_ITP_HOLD_GATE">Failed ITP Hold-Gate Re-test</option>
                    <option value="PPE_SAFETY_VIOLATION">BOCW / PPE Safety Violation</option>
                    <option value="CLEANING_HOUSEKEEPING_DEFAULT">Site Debris &amp; Waste Default</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Debit Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-rose-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Linked NCR / Incident Ref</label>
                  <input
                    type="text"
                    placeholder="e.g. NCR-2026-004"
                    value={ncrRef}
                    onChange={(e) => setNcrRef(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Factual Description of Breach *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the damage or contract clause default..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase text-xs rounded transition"
                >
                  {submitting ? 'Issuing...' : 'Issue Debit Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
