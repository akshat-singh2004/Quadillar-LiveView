'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';
import {
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  CheckCircle2,
  DollarSign,
  Building,
  RefreshCw,
  Clock,
  Landmark,
  FileSignature,
  Scale,
  Key,
} from 'lucide-react';

interface TakingOverCert {
  id: string;
  certificate_number: string;
  status: string;
  substantial_completion_date: string;
}

interface RABill {
  id: string;
  ra_bill_number: string;
  gross_work_done: number;
  retention_amount: number;
  net_payable_certified: number;
}

interface PBGRecord {
  id: string;
  bg_reference_number: string;
  issuing_bank_name: string;
  bg_amount_inr: number;
  valid_until: string;
  status: 'ACTIVE_ENCUMBERED' | 'DISCHARGED_RELEASED' | 'INVOKED_FORFEITED';
}

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function FinalBillAndPBGDischargePage() {
  const { project } = useActiveRole();
  const activeProjectId = project?.project_id || project?.id || "GOMTI-NAGAR-PH1-FITOUT";

  const [tocs, setTocs] = useState<TakingOverCert[]>([]);
  const [raBills, setRaBills] = useState<RABill[]>([]);
  const [pbgs, setPbgs] = useState<PBGRecord[]>([]);
  const [openCatASnags, setOpenCatASnags] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // PBG Registration Form
  const [bgNumber, setBgNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [bgAmount, setBgAmount] = useState('');
  const [bgValidDate, setBgValidDate] = useState('');

  // No-Claims Certificate State
  const [hasNoClaimsDeed, setHasNoClaimsDeed] = useState(false);

  const loadData = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const [tocRes, billsRes, pbgRes, snagsRes] = await Promise.all([
        (supabase as any)
          .from('taking_over_certificates')
          .select('id, certificate_number, status, substantial_completion_date')
          .eq('project_id', activeProjectId),
        (supabase as any)
          .from('running_account_bills')
          .select('id, ra_bill_number, gross_work_done, retention_amount, net_payable_certified')
          .eq('project_id', activeProjectId),
        (supabase as any)
          .from('performance_bank_guarantees')
          .select('*')
          .eq('project_id', activeProjectId)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('punch_list_items')
          .select('id')
          .eq('project_id', activeProjectId)
          .eq('category', 'CATEGORY_A_CRITICAL')
          .neq('status', 'CONSULTANT_VERIFIED_CLOSED'),
      ]);

      if (tocRes.error) throw tocRes.error;
      if (billsRes.error) throw billsRes.error;
      if (pbgRes.error) throw pbgRes.error;

      setTocs(tocRes.data || []);
      setRaBills(billsRes.data || []);
      setPbgs(pbgRes.data || []);
      setOpenCatASnags(snagsRes.data?.length || 0);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Final Bill & PBG data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeProjectId]);

  // Pure Dynamic Calculation from Physical RA Bills
  const metrics = useMemo(() => {
    const totalGross = raBills.reduce((sum, b) => sum + Number(b.gross_work_done || 0), 0);
    const totalRetentionEscrow = raBills.reduce((sum, b) => sum + Number(b.retention_amount || 0), 0);
    const totalRaPaid = raBills.reduce((sum, b) => sum + Number(b.net_payable_certified || 0), 0);

    // Tranche 2 retention (50% remaining held across DLP)
    const tranche2Retention = Math.round(totalRetentionEscrow * 0.5);
    const netFinalPayable = Math.max(0, totalGross - totalRaPaid + tranche2Retention);

    // Prerequisite: TOC must exist and be issued, with 0 Category A snags
    const activeToc = tocs.find((t) => t.status === 'TOC_ISSUED');
    const isTocCleared = Boolean(activeToc) && openCatASnags === 0;

    return {
      totalGross,
      totalRetentionEscrow,
      tranche2Retention,
      totalRaPaid,
      netFinalPayable,
      isTocCleared,
      activeToc,
    };
  }, [raBills, tocs, openCatASnags]);

  const handleRegisterPBG = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bgNumber.trim() || !bankName.trim() || !bgAmount.trim() || !bgValidDate) {
      setErrorMsg('All Bank Guarantee fields are mandatory.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const payload = {
      project_id: activeProjectId,
      bg_reference_number: bgNumber.trim(),
      issuing_bank_name: bankName.trim(),
      bg_amount_inr: parseFloat(bgAmount) || 0,
      valid_until: bgValidDate,
      claim_expiry_date: bgValidDate,
      status: 'ACTIVE_ENCUMBERED',
    };

    try {
      const { error } = await (supabase as any).from('performance_bank_guarantees').insert([payload]);
      if (error) throw error;

      setBgNumber('');
      setBankName('');
      setBgAmount('');
      setBgValidDate('');
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register Bank Guarantee.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDischargePBG = async (pbgId: string) => {
    if (!metrics.isTocCleared) {
      setErrorMsg('HOLD-GATE: Cannot discharge PBG without a certified Taking Over Certificate (FIDIC Clause 4.2).');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const dischargeHash = `SEOR-PBG-DISCHARGE-${Date.now().toString(36).toUpperCase()}-FIDIC4.2`;

    try {
      const { error } = await (supabase as any)
        .from('performance_bank_guarantees')
        .update({
          status: 'DISCHARGED_RELEASED',
          discharge_certificate_hash: dischargeHash,
          discharged_at: new Date().toISOString(),
        })
        .eq('id', pbgId);

      if (error) throw error;
      await loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to discharge Bank Guarantee.');
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
              COMMERCIAL HANDOVER • FIDIC RED BOOK CL. 14.11 / CPWD GCC CL. 9
              <StatutoryInfo
                standardRef="FIDIC CL. 14.11 / CPWD CL. 9"
                title="Final Bill & PBG Release Protocol"
                idealRange="Issued within 56 days of TOC"
                description="The Final Bill represents the conclusive accounting of all Works executed. It legally extinguishes all past claims upon execution of the statutory No-Claims Indemnity Deed, and conditions the return of the Performance Bank Guarantee on complete Defect Liability expiration."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-emerald-400" />
              <span>Final Bill &amp; Performance Security Discharge</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{project?.project_name || 'Active Contract'}</strong> • Final financial closure, statutory no-claims deeds, and Performance Bank Guarantee (PBG) release.
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

        {/* PREREQUISITE WARNING BANNER (IDENTICAL TO COMMAND CENTER) */}
        {!metrics.isTocCleared && (
          <div className="p-4 bg-amber-950/40 border border-amber-800/80 rounded-lg flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 text-amber-300 font-bold">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                Prerequisite Incomplete: Final Bill handover pending Taking-Over Certificate (TOC) &amp; Defect Rectification.
              </span>
            </div>
            <span className="text-[10px] px-2 py-1 rounded bg-amber-950 border border-amber-700 text-amber-300 font-mono uppercase font-bold">
              PREREQUISITE UNFULFILLED
            </span>
          </div>
        )}

        {/* 2-COLUMN VIEWPORT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">

          {/* LEFT: FINAL BILL GROSS STATEMENT (8 COLS) */}
          <div className="lg:col-span-8 bg-zinc-900/40 border border-zinc-800 p-5 space-y-5">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-emerald-400" />
                <span>Reconciled Final Bill Gross Statement</span>
              </span>
              <span className="text-[10px] text-zinc-500">FIDIC Clause 14.11 Audit</span>
            </div>

            {/* 3 METRIC TILES */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-zinc-950 border border-zinc-850">
                <span className="text-[10px] text-zinc-500 uppercase block">Gross Measured Work</span>
                <div className="text-xl font-bold text-white mt-1">{formatInr(metrics.totalGross)}</div>
                <span className="text-[9px] text-zinc-600 block mt-0.5">Sum of all approved e-MB lines</span>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-850">
                <span className="text-[10px] text-zinc-500 uppercase block">Total RA Bills Certified</span>
                <div className="text-xl font-bold text-cyan-400 mt-1">{formatInr(metrics.totalRaPaid)}</div>
                <span className="text-[9px] text-zinc-600 block mt-0.5">Disbursed on RA Bills 01 to {raBills.length || '0'}</span>
              </div>

              <div className="p-4 bg-zinc-950 border border-zinc-850">
                <span className="text-[10px] text-zinc-500 uppercase block">Net Final Payable Balance</span>
                <div className="text-xl font-bold text-emerald-400 mt-1">{formatInr(metrics.netFinalPayable)}</div>
                <span className="text-[9px] text-zinc-600 block mt-0.5">Includes Tranche 2 retention</span>
              </div>
            </div>

            {/* STATUTORY INDEMNITY / NO-CLAIMS CERTIFICATE SECTION */}
            <div className="p-4 bg-zinc-950 border border-zinc-850 space-y-3">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-2">
                <span className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
                  <FileSignature className="w-4 h-4 text-cyan-400" />
                  <span>Statutory Indemnity / No-Claims Certificate (Clause 14.12)</span>
                </span>
                <StatutoryInfo
                  standardRef="FIDIC RED BOOK CL. 14.12"
                  title="Discharge & Indemnity"
                  idealRange="Mandatory Legal Condition"
                  description="When submitting the Final Statement, the Contractor must submit a written discharge confirming that the total of the Final Statement represents full and final settlement of all moneys due under the Contract."
                />
              </div>

              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                By ticking below, the Principal Contractor confirms that all claims for extensions of time, extra work, price escalation, and contractual liabilities are fully and finally settled.
              </p>

              <label className="flex items-center gap-2.5 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={hasNoClaimsDeed}
                  onChange={(e) => setHasNoClaimsDeed(e.target.checked)}
                  className="accent-emerald-500"
                />
                <span className={hasNoClaimsDeed ? 'text-emerald-400 font-bold' : 'text-zinc-300 font-semibold'}>
                  I hereby depose and execute the Unconditional No-Claims Certificate &amp; Legal Indemnity Deed.
                </span>
              </label>

              <button
                type="button"
                disabled={!metrics.isTocCleared || !hasNoClaimsDeed}
                className={`w-full py-2.5 rounded font-bold uppercase text-xs flex items-center justify-center gap-2 transition ${metrics.isTocCleared && hasNoClaimsDeed
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-zinc-950 cursor-pointer shadow-lg shadow-emerald-950/50'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                  }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {metrics.isTocCleared && hasNoClaimsDeed
                    ? 'Execute Final Payment Certificate & Seal Account'
                    : 'Locked: TOC Clearance & Indemnity Deed Required'}
                </span>
              </button>
            </div>
          </div>

          {/* RIGHT: PERFORMANCE SECURITY & PBG DISCHARGE (4 COLS) */}
          <div className="lg:col-span-4 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Landmark className="w-4 h-4 text-cyan-400" />
                <span>Performance Security &amp; Release</span>
              </span>
              <span className="text-[10px] text-zinc-500">FIDIC Cl. 4.2</span>
            </div>

            {/* RETENTION ESCROW BALANCE */}
            <div className="p-3 bg-zinc-950 border border-zinc-850 space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase block">Retention Balance (50% DLP Escrow)</span>
              <div className="text-xl font-bold text-emerald-400">{formatInr(metrics.tranche2Retention)}</div>
              <span className="text-[9px] text-zinc-500 block">Released upon 12-month Defect Liability expiry</span>
            </div>

            {/* ACTIVE PBG LIST */}
            <div className="space-y-2">
              <span className="text-[10px] text-zinc-400 font-bold uppercase block">Active Bank Guarantees ({pbgs.length})</span>

              {pbgs.length === 0 ? (
                <div className="p-4 text-center text-zinc-600 border border-zinc-850">
                  Zero Bank Guarantees registered. Register the contract PBG below.
                </div>
              ) : (
                pbgs.map((pbg) => {
                  const isDischarged = pbg.status === 'DISCHARGED_RELEASED';
                  return (
                    <div key={pbg.id} className="p-3 bg-zinc-950 border border-zinc-850 rounded space-y-2">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-white">{pbg.bg_reference_number}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${isDischarged ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'}`}>
                          {pbg.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400">{pbg.issuing_bank_name} • Value: <strong className="text-emerald-400">{formatInr(Number(pbg.bg_amount_inr))}</strong></div>
                      <div className="text-[10px] text-zinc-500">Valid Until: {pbg.valid_until}</div>

                      {!isDischarged && (
                        <button
                          type="button"
                          disabled={!metrics.isTocCleared || submitting}
                          onClick={() => handleDischargePBG(pbg.id)}
                          className={`w-full py-1.5 rounded text-[10px] font-bold uppercase transition ${metrics.isTocCleared
                              ? 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer'
                              : 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
                            }`}
                        >
                          Discharge PBG &amp; Release Final Escrow
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* REGISTER PBG FORM */}
            <form onSubmit={handleRegisterPBG} className="p-3 bg-zinc-950 border border-zinc-850 rounded space-y-2.5">
              <span className="text-[10px] text-zinc-400 uppercase font-bold block border-b border-zinc-800 pb-1">
                Register Performance Bank Guarantee
              </span>

              <div>
                <label className="text-[9px] text-zinc-500 block mb-0.5">BG Reference Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PBG-HDFC-2026-098"
                  value={bgNumber}
                  onChange={(e) => setBgNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[9px] text-zinc-500 block mb-0.5">Issuing Bank *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Bank Ltd"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-500 block mb-0.5">BG Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    placeholder="0.00"
                    value={bgAmount}
                    onChange={(e) => setBgAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs text-emerald-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-500 block mb-0.5">Valid Until *</label>
                  <input
                    type="date"
                    required
                    value={bgValidDate}
                    onChange={(e) => setBgValidDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-white font-bold text-[10px] uppercase rounded border border-neutral-600 transition"
              >
                Log Performance Security
              </button>
            </form>
          </div>

        </div>

      </div>
    </main>
  );
}