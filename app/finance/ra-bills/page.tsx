'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { generateRABillFromMB } from '@/app/actions/billing-pipeline';
import {
  Receipt,
  FileCheck2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Plus,
  RefreshCw,
  Lock,
  ArrowRight,
  TrendingDown,
  Scale,
} from 'lucide-react';

interface RABillRecord {
  id: string;
  project_id: string;
  ra_bill_number: string;
  bill_sequence_no: number;
  gross_work_done: number;
  gross_valuation: number;
  retention_amount: number;
  mobilization_advance_recovery: number;
  labour_cess_amount: number;
  tds_gst_inr: number;
  tds_amount: number;
  ncr_backcharges_inr: number;
  net_payable_certified: number;
  sha256_deed_hash?: string;
  status: string;
  created_at: string;
}

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function RunningAccountBillsPage() {
  const { project, role } = useActiveRole();
  const activeProjectId = project?.project_id || project?.id || "GOMTI-NAGAR-PH1-FITOUT";

  const [bills, setBills] = useState<RABillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadBills = async () => {
    if (!activeProjectId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('running_account_bills')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('bill_sequence_no', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load Running Account bills.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBills();
  }, [activeProjectId]);

  const handleGenerateNextRABill = async () => {
    setGenerating(true);
    setErrorMsg(null);

    const nextSequence = bills.length + 1;

    try {
      const result = await generateRABillFromMB(activeProjectId, nextSequence);
      if (!result.success) throw new Error('Failed to generate RA bill from e-MB.');
      await loadBills();
    } catch (err: any) {
      setErrorMsg(err.message || 'Billing pipeline execution failed.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1">
              COMMERCIAL GOVERNANCE • CPWD GCC CL. 7 / FIDIC RED BOOK CLAUSE 14.3
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-emerald-400" />
              <span>Running Account (RA) Billing &amp; IPC Ledger</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Interim Payment Certificate (IPC) engine with automated e-MB aggregation, 5% retention escrow, 2% GST TDS, and statutory lien deductions.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateNextRABill}
              disabled={generating}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase rounded transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{generating ? 'Aggregating e-MB...' : `Generate RA Bill #${bills.length + 1}`}</span>
            </button>
          </div>
        </header>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* BILLING ACCORDION / TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <span className="font-bold text-white uppercase text-xs">
              Statutory RA Bill History ({bills.length})
            </span>
            <span className="text-zinc-500 text-[10px]">Section 65B Certified Certificates</span>
          </div>

          {bills.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 border border-zinc-850">
              Zero Running Account bills certified. Click &quot;Generate RA Bill&quot; to aggregate verified e-MB lines.
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Bill Number</th>
                    <th className="p-3 text-right">Gross Valuation</th>
                    <th className="p-3 text-right">5% Retention</th>
                    <th className="p-3 text-right">1% BOCW Cess</th>
                    <th className="p-3 text-right">2% GST TDS</th>
                    <th className="p-3 text-right">NCR Liens</th>
                    <th className="p-3 text-right">Net Certified (INR)</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {bills.map((b) => (
                    <tr key={b.id} className="hover:bg-zinc-900/50 transition">
                      <td className="p-3">
                        <span className="text-white font-bold block">{b.ra_bill_number}</span>
                        <span className="text-[10px] text-zinc-500">{new Date(b.created_at).toLocaleDateString()}</span>
                      </td>
                      <td className="p-3 text-right text-zinc-300 font-semibold">{formatInr(Number(b.gross_work_done))}</td>
                      <td className="p-3 text-right text-rose-400">-{formatInr(Number(b.retention_amount))}</td>
                      <td className="p-3 text-right text-rose-400">-{formatInr(Number(b.labour_cess_amount))}</td>
                      <td className="p-3 text-right text-rose-400">-{formatInr(Number(b.tds_gst_inr))}</td>
                      <td className="p-3 text-right text-rose-400">
                        {Number(b.ncr_backcharges_inr) > 0 ? `-${formatInr(Number(b.ncr_backcharges_inr))}` : '₹0'}
                      </td>
                      <td className="p-3 text-right text-emerald-400 font-bold text-sm">
                        {formatInr(Number(b.net_payable_certified))}
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {b.status}
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
    </main>
  );
}
