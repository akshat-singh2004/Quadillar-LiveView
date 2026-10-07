'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';
import {
  FileDiff,
  ShieldCheck,
  AlertTriangle,
  Plus,
  RefreshCw,
  CheckCircle2,
  DollarSign,
  XCircle,
  Clock
} from 'lucide-react';

interface ChangeOrder {
  id: string;
  project_id: string;
  pco_number: string;
  title: string;
  reference_document: string;
  justification: string;
  claimed_amount_inr: number;
  approved_amount_inr: number;
  eot_days_requested: number;
  status: 'DRAFT' | 'SUBMITTED_TO_CLIENT' | 'CLIENT_REJECTED' | 'APPROVED_AS_VARIATION_ORDER';
  client_signature_hash?: string;
  created_at: string;
}

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function PotentialChangeOrdersPage() {
  const { project } = useActiveRole();
  const activeProjectId = project?.project_id || project?.id || "GOMTI-NAGAR-PH1-FITOUT";

  const [pcos, setPcos] = useState<ChangeOrder[]>([]);
  const [selectedPco, setSelectedPco] = useState<ChangeOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Strict Zero-Data Input State
  const [title, setTitle] = useState('');
  const [refDoc, setRefDoc] = useState('');
  const [justification, setJustification] = useState('');
  const [claimedAmount, setClaimedAmount] = useState('');
  const [eotDays, setEotDays] = useState('');

  // Approval State
  const [approvedAmount, setApprovedAmount] = useState('');

  const loadData = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('potential_change_orders')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPcos(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Potential Change Orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeProjectId]);

  // Real-time Dashboard Aggregates (Strictly derived from live DB)
  const aggregates = useMemo(() => {
    let pendingClaimInr = 0;
    let approvedVariationInr = 0;
    let totalEotRequested = 0;
    let pendingCount = 0;

    pcos.forEach((p) => {
      if (p.status === 'SUBMITTED_TO_CLIENT') {
        pendingClaimInr += Number(p.claimed_amount_inr);
        pendingCount++;
      } else if (p.status === 'APPROVED_AS_VARIATION_ORDER') {
        approvedVariationInr += Number(p.approved_amount_inr);
      }
      totalEotRequested += Number(p.eot_days_requested);
    });

    return { pendingClaimInr, approvedVariationInr, totalEotRequested, pendingCount };
  }, [pcos]);

  const handleSubmitPco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !justification.trim() || !claimedAmount.trim()) {
      setErrorMsg('Title, Justification, and Claimed Amount are strictly required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const pcoNum = `PCO-${new Date().getFullYear()}-${(pcos.length + 1).toString().padStart(3, '0')}`;

    const payload = {
      project_id: activeProjectId,
      pco_number: pcoNum,
      title: title.trim(),
      reference_document: refDoc.trim() || 'Verbal/Site Instruction',
      justification: justification.trim(),
      claimed_amount_inr: parseFloat(claimedAmount),
      eot_days_requested: parseFloat(eotDays) || 0,
      status: 'SUBMITTED_TO_CLIENT',
    };

    try {
      const { error } = await (supabase as any).from('potential_change_orders').insert([payload]);
      if (error) throw error;

      setTitle('');
      setRefDoc('');
      setJustification('');
      setClaimedAmount('');
      setEotDays('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit Change Order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovePco = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPco || !approvedAmount.trim()) return;

    setSubmitting(true);
    setErrorMsg(null);

    const clientSig = `CLIENT-VO-${Date.now().toString(36).toUpperCase()}-FIDIC13`;

    try {
      const { error } = await (supabase as any)
        .from('potential_change_orders')
        .update({
          status: 'APPROVED_AS_VARIATION_ORDER',
          approved_amount_inr: parseFloat(approvedAmount),
          client_signature_hash: clientSig,
          approved_at: new Date().toISOString(),
        })
        .eq('id', selectedPco.id);

      if (error) throw error;

      setSelectedPco(null);
      setApprovedAmount('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve Variation Order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectPco = async (pcoId: string) => {
    try {
      const { error } = await (supabase as any)
        .from('potential_change_orders')
        .update({ status: 'CLIENT_REJECTED' })
        .eq('id', pcoId);

      if (error) throw error;
      setSelectedPco(null);
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to reject Change Order.');
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              FINANCIAL GOVERNANCE • SCOPE &amp; VARIATION MANAGEMENT
              <StatutoryInfo 
                standardRef="FIDIC RED BOOK CL. 13.3 / CPWD CL. 12"
                title="Variation Procedure & Deviation Limits"
                idealRange="Contract Baseline &plusmn; 10%"
                description="Any instruction that changes the Works requires a formal Variation Order. Contractors must submit a PCO detailing the cost and schedule impact (EOT) before proceeding, ensuring the baseline budget is legally amended."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileDiff className="w-6 h-6 text-emerald-400" />
              <span>Potential Change Orders (PCO) &amp; Variations</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{project?.project_name || 'Active Contract'}</strong> • Convert drawing revisions and site instructions into legally binding financial adjustments.
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

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Pending PCO Claims</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {formatInr(aggregates.pendingClaimInr)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Awaiting Client/SEOR Approval</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block flex items-center">
              Approved Variations (VO)
              <StatutoryInfo 
                standardRef="BUDGET AUGMENTATION"
                title="Approved Variation Impact"
                idealRange="Added to Gross Valuation"
                description="This amount is legally bound to the contract and expands the maximum ceiling limit for subsequent Running Account (RA) Bills."
              />
            </span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {formatInr(aggregates.approvedVariationInr)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Legally appended to baseline budget</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Extension of Time (EOT) Requested</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {aggregates.totalEotRequested} Days
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Schedule impact across all PCOs</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Total PCO Volume</span>
            <div className="text-2xl font-bold text-white mt-1">
              {pcos.length} Records
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">{aggregates.pendingCount} currently active</span>
          </div>
        </div>

        {/* 2-COLUMN VIEWPORT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">

          {/* LEFT: PCO LEDGER (8 COLS) */}
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <FileDiff className="w-4 h-4 text-emerald-400" />
                <span>Scope Variation Ledger ({pcos.length})</span>
              </span>
            </div>

            {pcos.length === 0 ? (
              <div className="p-12 text-center border border-zinc-850 bg-zinc-950/50">
                <div className="text-zinc-500 mb-2">No Change Orders Logged</div>
                <div className="text-[10px] text-zinc-600 font-sans max-w-sm mx-auto">
                  The variation ledger is currently empty. Use the form on the right to submit a physical scope change against the baseline contract.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full text-left">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                    <tr>
                      <th className="p-3">PCO Reference</th>
                      <th className="p-3 text-right">Claimed (INR)</th>
                      <th className="p-3 text-right">EOT</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                    {pcos.map((p) => {
                      const isApproved = p.status === 'APPROVED_AS_VARIATION_ORDER';
                      const isRejected = p.status === 'CLIENT_REJECTED';

                      return (
                        <tr key={p.id} className="hover:bg-zinc-900/50 transition">
                          <td className="p-3">
                            <span className="text-white font-bold block">{p.pco_number}</span>
                            <span className="text-zinc-300 font-semibold">{p.title}</span>
                            <span className="text-[10px] text-zinc-500 block truncate max-w-xs">Ref: {p.reference_document}</span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="font-bold text-amber-400">{formatInr(Number(p.claimed_amount_inr))}</div>
                            {isApproved && (
                              <div className="text-[9px] text-emerald-400 mt-0.5">Approved: {formatInr(Number(p.approved_amount_inr))}</div>
                            )}
                          </td>
                          <td className="p-3 text-right font-bold text-cyan-400">
                            {p.eot_days_requested > 0 ? `+${p.eot_days_requested}d` : '--'}
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                isApproved
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : isRejected
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}
                            >
                              {p.status.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => { setSelectedPco(p); setApprovedAmount(p.claimed_amount_inr.toString()); }}
                              className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 rounded text-[10px] font-bold uppercase transition"
                            >
                              Inspect
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

          {/* RIGHT: SUBMIT PCO COMPOSER (4 COLS) */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Submit Change Order</span>
              </span>
            </div>

            <form onSubmit={handleSubmitPco} className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Variation Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Additional rock excavation at Grid A"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Triggering Document / Drawing Ref</label>
                <input
                  type="text"
                  placeholder="e.g. Architect SI-04 / Rev-B Drawing"
                  value={refDoc}
                  onChange={(e) => setRefDoc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block mb-1">Justification for Extra Cost *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this deviates from the original BOQ baseline..."
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 p-2 text-xs text-white font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block mb-1">Claimed Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={claimedAmount}
                    onChange={(e) => setClaimedAmount(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-amber-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block mb-1 flex items-center">
                    EOT Days Claimed
                    <StatutoryInfo 
                      standardRef="SCHEDULE IMPACT"
                      title="Extension of Time"
                      idealRange="Critical Path Delay Only"
                      description="Indicate the number of days this variation will delay the project's critical path completion date."
                    />
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    placeholder="0.0"
                    value={eotDays}
                    onChange={(e) => setEotDays(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-cyan-400 font-bold"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase text-xs flex items-center justify-center gap-1.5 transition mt-2"
              >
                <span>{submitting ? 'Submitting...' : 'Submit PCO to Client'}</span>
              </button>
            </form>
          </div>

        </div>

        {/* APPROVAL & REJECTION MODAL */}
        {selectedPco && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-neutral-950 border border-neutral-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-start border-b border-neutral-800 pb-3">
                <div>
                  <span className="text-xs font-bold text-amber-400 block">{selectedPco.pco_number}</span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{selectedPco.title}</h3>
                  <span className="text-[10px] text-neutral-400">Ref: {selectedPco.reference_document}</span>
                </div>
                <button onClick={() => setSelectedPco(null)} className="text-neutral-500 hover:text-neutral-300">
                  ✕
                </button>
              </div>

              <div className="p-3 bg-neutral-900 border border-neutral-800 text-xs text-neutral-300 font-sans leading-relaxed">
                <span className="text-[10px] text-neutral-500 font-bold uppercase block mb-1 font-mono">Contractor Justification</span>
                {selectedPco.justification}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-neutral-900/50 border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 uppercase block mb-1">Contractor Claim</span>
                  <div className="text-lg font-bold text-amber-400">{formatInr(Number(selectedPco.claimed_amount_inr))}</div>
                  <div className="text-[10px] text-cyan-400 mt-1">EOT: +{selectedPco.eot_days_requested} Days</div>
                </div>
                
                <div className="p-3 bg-neutral-900/50 border border-neutral-800">
                  <span className="text-[10px] text-neutral-500 uppercase block mb-1">Current Status</span>
                  <div className="text-sm font-bold text-white uppercase">{selectedPco.status.replace(/_/g, ' ')}</div>
                </div>
              </div>

              {selectedPco.status === 'SUBMITTED_TO_CLIENT' && (
                <form onSubmit={handleApprovePco} className="space-y-3 pt-3 border-t border-neutral-800">
                  <span className="text-xs font-bold text-emerald-400 uppercase block">Client / SEOR Adjudication</span>
                  
                  <div>
                    <label className="text-[10px] text-neutral-400 uppercase block mb-1">Final Approved Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={approvedAmount}
                      onChange={(e) => setApprovedAmount(e.target.value)}
                      className="w-full bg-neutral-900 border border-neutral-800 px-3 py-2 text-xs text-emerald-400 font-bold"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRejectPco(selectedPco.id)}
                      className="flex-1 py-2 bg-neutral-900 hover:bg-rose-950/50 text-rose-400 border border-rose-900/50 font-bold uppercase text-xs rounded transition flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-4 h-4" /> Reject Claim
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase text-xs rounded transition flex items-center justify-center gap-1.5"
                    >
                      <ShieldCheck className="w-4 h-4" /> Approve as V.O.
                    </button>
                  </div>
                </form>
              )}

              {selectedPco.status === 'APPROVED_AS_VARIATION_ORDER' && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-[10px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>APPROVED VARIATION ORDER (V.O.)</span>
                  </div>
                  <div>FINAL APPROVED VALUE: {formatInr(Number(selectedPco.approved_amount_inr))}</div>
                  <div className="font-mono pt-1">CLIENT SIGNATURE HASH: {selectedPco.client_signature_hash}</div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
