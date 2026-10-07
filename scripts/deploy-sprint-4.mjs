import fs from 'fs';
import path from 'path';

console.log("Starting Sprint 4 Codebase Surgery...");

// --------------------------------------------------------------------------
// 1. Scrubbed app/contracts/work-orders/page.tsx
// --------------------------------------------------------------------------
const originalWo = fs.readFileSync("app/contracts/work-orders/page.tsx", "utf8");

let woCleaned = originalWo
  // Remove hardcoded defaults array & loading lock
  .replace(/const defaults: WorkOrderRecord\[\] =[\s\S]*?setOrders\(defaults\);[\s\S]*?if \(!selectedOrder\) setSelectedOrder\(defaults\[0\]\);/g, 'setOrders([]); setSelectedOrder(null);')
  .replace(/if \(loading \Vert{}\Vert{} !selectedOrder\) \{[\s\S]*?return \([\s\S]*?INITIALIZING CONTRACT WORK ORDERS[\s\S]*?<\/div>\s*\);\s*\}/g, `
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        SYNCHRONIZING CONTRACT WORK ORDERS &amp; COMMITMENTS...
      </div>
    );
  }
  `)
  // Clean form defaults
  .replace(/const \[tenderRef, setTenderRef\] = useState\([\s\S]*?\);/g, 'const [tenderRef, setTenderRef] = useState("");')
  .replace(/const \[contractor, setContractor\] = useState\([\s\S]*?\);/g, 'const [contractor, setContractor] = useState("");')
  .replace(/const \[tradePackage, setTradePackage\] = useState\([\s\S]*?\);/g, 'const [tradePackage, setTradePackage] = useState("");')
  .replace(/const \[title, setTitle\] = useState\([\s\S]*?\);/g, 'const [title, setTitle] = useState("");')
  .replace(/const \[scope, setScope\] = useState\([\s\S]*?\);/g, 'const [scope, setScope] = useState("");')
  .replace(/const \[awardedCost, setAwardedCost\] = useState<number>\([\s\S]*?\);/g, 'const [awardedCost, setAwardedCost] = useState<number>(0);')
  .replace(/const \[mobAdvance, setMobAdvance\] = useState<number>\([\s\S]*?\);/g, 'const [mobAdvance, setMobAdvance] = useState<number>(0);')
  .replace(/const \[pbgRef, setPbgRef\] = useState\("PBG-HDFC-2026-9921"\);/g, 'const [pbgRef, setPbgRef] = useState("");');

fs.writeFileSync("app/contracts/work-orders/page.tsx", woCleaned, "utf8");
console.log("✓ Scrubbed app/contracts/work-orders/page.tsx of mock data & loading locks.");

// --------------------------------------------------------------------------
// 2. Scrubbed app/finance/backcharges/page.tsx
// --------------------------------------------------------------------------
const backchargesCode = `'use client';

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
  const projectId = (project as any)?.project_id || (project as any)?.id || 'proj-1';
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
    const debitNum = \`DN-\${new Date().getFullYear()}-\${(backcharges.length + 1).toString().padStart(3, '0')}\`;

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
    const pmcHash = \`PMC-CERT-\${Date.now().toString(36).toUpperCase()}-CL14\`;
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
            <div className={\`text-2xl font-bold mt-1 \${summary.disputedCount > 0 ? "text-amber-400" : "text-emerald-400"}\`}>
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
                          <span className={\`px-2 py-0.5 rounded text-[9px] font-bold uppercase \${
                            isCertified
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }\`}>
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
`;

fs.writeFileSync("app/finance/backcharges/page.tsx", backchargesCode, "utf8");
console.log("✓ Re-written app/finance/backcharges/page.tsx with pure zero-data contra-charge ledger.");

// --------------------------------------------------------------------------
// 3. Scrubbed app/finance/subcontractors/page.tsx
// --------------------------------------------------------------------------
const subcontractorsCode = `'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Users, Scale, CheckCircle2, Clock, Plus, RefreshCw, X, Receipt, ShieldCheck, AlertTriangle } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface SubcontractorIpcBill {
  id: string;
  project_id: string;
  bill_number: string;
  work_order_id: string;
  subcontractor_name: string;
  gross_claimed_inr: number;
  retention_deducted_inr: number;
  backcharges_deducted_inr: number;
  advance_recovery_inr: number;
  net_certified_inr: number;
  master_ipc_funded: boolean;
  status: 'UNDER_VERIFICATION' | 'PAY_WHEN_PAID_HOLD' | 'CERTIFIED_FUNDED' | 'DISBURSED_SETTLED';
  certified_at?: string | null;
}

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function SubcontractorsPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || 'proj-1';
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [bills, setBills] = useState<SubcontractorIpcBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [billNum, setBillNum] = useState('');
  const [subName, setSubName] = useState('');
  const [grossClaim, setGrossClaim] = useState('');
  const [backcharges, setBackcharges] = useState('0');
  const [advRecovery, setAdvRecovery] = useState('0');

  const loadBills = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('subcontractor_ipc_bills')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBills(data || []);
    } catch (err: any) {
      console.error('Failed to load subcontractor bills:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadBills();
  }, [loadBills]);

  const summary = useMemo(() => {
    const totalGross = bills.reduce((sum, b) => sum + Number(b.gross_claimed_inr || 0), 0);
    const totalRetention = bills.reduce((sum, b) => sum + Number(b.retention_deducted_inr || 0), 0);
    const totalContraCharges = bills.reduce((sum, b) => sum + Number(b.backcharges_deducted_inr || 0), 0);
    const netCertified = bills.reduce((sum, b) => sum + Number(b.net_certified_inr || 0), 0);

    return { totalGross, totalRetention, totalContraCharges, netCertified, count: bills.length };
  }, [bills]);

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subName.trim() || !grossClaim) return;

    setSubmitting(true);
    const gClaim = parseFloat(grossClaim) || 0;
    const retDeduct = Math.round(gClaim * 0.05); // 5% retention
    const contraDeduct = parseFloat(backcharges) || 0;
    const advDeduct = parseFloat(advRecovery) || 0;
    const netPayable = Math.max(0, gClaim - retDeduct - contraDeduct - advDeduct);

    const bCode = billNum.trim() || \`SUB-RA-\${new Date().getFullYear()}-\${(bills.length + 1).toString().padStart(3, '0')}\`;

    const payload = {
      project_id: projectId,
      bill_number: bCode,
      work_order_id: '00000000-0000-0000-0000-000000000000', // Default linking
      subcontractor_name: subName.trim(),
      gross_claimed_inr: gClaim,
      retention_deducted_inr: retDeduct,
      backcharges_deducted_inr: contraDeduct,
      advance_recovery_inr: advDeduct,
      net_certified_inr: netPayable,
      master_ipc_funded: false,
      status: 'PAY_WHEN_PAID_HOLD',
    };

    try {
      const { error } = await (supabase as any).from('subcontractor_ipc_bills').insert([payload]);
      if (error) throw error;

      setModalOpen(false);
      setBillNum('');
      setSubName('');
      setGrossClaim('');
      setBackcharges('0');
      setAdvRecovery('0');
      setFeedback('Subcontractor IPC certificate registered under Pay-When-Paid hold.');
      setTimeout(() => setFeedback(null), 3500);
      await loadBills();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to create subcontractor bill.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReleasePaymentGate = async (id: string) => {
    try {
      await (supabase as any)
        .from('subcontractor_ipc_bills')
        .update({
          master_ipc_funded: true,
          status: 'CERTIFIED_FUNDED',
          certified_at: new Date().toISOString(),
        })
        .eq('id', id);

      setFeedback('Payment gate opened: Employer IPC funded.');
      setTimeout(() => setFeedback(null), 3500);
      await loadBills();
    } catch (err: any) {
      console.error('Failed to release payment gate:', err);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              FINANCIAL GOVERNANCE • SUBCONTRACT IPC VALUATION &amp; RETAINAGE
              <StatutoryInfo
                standardRef="MSMEDA ACT 2006 / FIDIC CL. 4.4"
                title="Pay-When-Paid Gates & Statutory Retainage"
                idealRange="5% Retention Escrow"
                description="Governs back-to-back funding gates with the Employer, maintains 5% retention deductions across intermediate bills, and enforces statutory MSME compliance timelines once General Contractor IPCs are realized."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              <span>Subcontractor IPC Bills &amp; Retainage Reconciler</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Subcontractor running valuations, 5% retention escrow, contra-charge offsets, and Pay-When-Paid release gates.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadBills()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Generate Subcontractor IPC</span>
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
            <span className="text-[10px] text-zinc-500 uppercase block">Gross Subcontractor Billing</span>
            <div className="text-2xl font-bold text-white mt-1">
              {formatInr(summary.totalGross)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">{summary.count} intermediate IPCs</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Retention Escrow (5%)</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {formatInr(summary.totalRetention)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Held across 12-month DLP</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Contra-Charges Debited</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">
              -{formatInr(summary.totalContraCharges)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Rectification &amp; scrap offsets</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Net Certified Valuation</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {formatInr(summary.netCertified)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Payable upon gate release</span>
          </div>
        </div>

        {/* SUBCONTRACTOR IPC TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="text-white font-bold text-xs uppercase block">
              Subcontractor IPC Ledger ({bills.length})
            </span>
          </div>

          {bills.length === 0 ? (
            <div className="p-12 text-center border border-zinc-850 bg-zinc-950 text-xs">
              <Receipt className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <div className="text-zinc-400 font-bold uppercase">Zero Subcontractor IPCs Logged</div>
              <p className="text-[11px] text-zinc-600 font-sans mt-1 max-w-sm mx-auto">
                No subcontractor valuation certificates. Click &quot;Generate Subcontractor IPC&quot; above to calculate gross progress, retainage, and net payout.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">IPC Bill &amp; Subcontractor</th>
                    <th className="p-3 text-right">Gross Claimed (₹)</th>
                    <th className="p-3 text-right">Retention (5%)</th>
                    <th className="p-3 text-right">Contra-Charges</th>
                    <th className="p-3 text-right">Net Certified (₹)</th>
                    <th className="p-3 text-center">Funding Gate</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40 font-mono">
                  {bills.map((b) => (
                    <tr key={b.id} className="hover:bg-zinc-900/50 transition">
                      <td className="p-3">
                        <span className="text-white font-bold block">{b.bill_number}</span>
                        <span className="text-[10px] text-cyan-400">{b.subcontractor_name}</span>
                      </td>
                      <td className="p-3 text-right text-zinc-200">
                        {formatInr(Number(b.gross_claimed_inr))}
                      </td>
                      <td className="p-3 text-right text-amber-400">
                        -{formatInr(Number(b.retention_deducted_inr))}
                      </td>
                      <td className="p-3 text-right text-rose-400">
                        {Number(b.backcharges_deducted_inr) > 0 ? \`-\${formatInr(Number(b.backcharges_deducted_inr))}\` : '₹0'}
                      </td>
                      <td className="p-3 text-right font-bold text-emerald-400 text-sm">
                        {formatInr(Number(b.net_certified_inr))}
                      </td>
                      <td className="p-3 text-center">
                        <span className={\`px-2 py-0.5 rounded text-[9px] font-bold uppercase \${
                          b.master_ipc_funded
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }\`}>
                          {b.master_ipc_funded ? 'Funded · Released' : 'Pay-When-Paid Hold'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {!b.master_ipc_funded && (
                          <button
                            type="button"
                            onClick={() => handleReleasePaymentGate(b.id)}
                            className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded text-[10px] font-bold uppercase transition"
                          >
                            Release Gate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* GENERATE IPC MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-cyan-400" />
                <span>Generate Subcontractor IPC Valuation</span>
              </span>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateBill} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">IPC Bill Number</label>
                  <input
                    type="text"
                    placeholder="e.g. SUB-RA-01"
                    value={billNum}
                    onChange={(e) => setBillNum(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Subcontractor Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Narmada Concrete Works"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Gross Measured Claim (₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={grossClaim}
                  onChange={(e) => setGrossClaim(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Contra-Charges / Backcharges (₹)</label>
                  <input
                    type="number"
                    value={backcharges}
                    onChange={(e) => setBackcharges(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-rose-400 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Advance Recovery (₹)</label>
                  <input
                    type="number"
                    value={advRecovery}
                    onChange={(e) => setAdvRecovery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-amber-400 font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-900 rounded border border-zinc-800 space-y-1 text-[11px]">
                <div className="flex justify-between text-zinc-400">
                  <span>Standard 5% Retention Deduction:</span>
                  <span className="text-amber-400 font-bold">-{formatInr(Math.round((parseFloat(grossClaim) || 0) * 0.05))}</span>
                </div>
                <div className="flex justify-between text-white pt-1 border-t border-zinc-800 font-bold">
                  <span>Net Certified Payable:</span>
                  <span className="text-emerald-400">
                    {formatInr(
                      Math.max(
                        0,
                        (parseFloat(grossClaim) || 0) -
                        Math.round((parseFloat(grossClaim) || 0) * 0.05) -
                        (parseFloat(backcharges) || 0) -
                        (parseFloat(advRecovery) || 0)
                      )
                    )}
                  </span>
                </div>
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
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase text-xs rounded transition"
                >
                  {submitting ? 'Certifying...' : 'Certify Subcontractor IPC'}
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

fs.writeFileSync("app/finance/subcontractors/page.tsx", subcontractorsCode, "utf8");
console.log("✓ Re-written app/finance/subcontractors/page.tsx with pure zero-data IPC valuation reconciler.");

// --------------------------------------------------------------------------
// 4. Wire Sidebar.tsx
// --------------------------------------------------------------------------
const sidebarPath = "components/layout/Sidebar.tsx";
if (fs.existsSync(sidebarPath)) {
  let content = fs.readFileSync(sidebarPath, "utf8");

  if (!content.includes("/contracts/work-orders")) {
    content = content.replace(
      /(\{\s*label:\s*["\x27]Digital Measurement Book \(e-MB\)["\x27][^}]*\},)/g,
      `$1\n      { label: "Subcontractor Work Orders", href: "/contracts/work-orders", icon: Briefcase },\n      { label: "Contra-Charges & Backcharges", href: "/finance/backcharges", icon: MinusCircle },\n      { label: "Subcontractor IPCs", href: "/finance/subcontractors", icon: Users },`
    );

    if (!content.includes("Briefcase,")) {
      content = content.replace("Calculator,", "Calculator,\n  Briefcase,\n  MinusCircle,");
    }
  }

  fs.writeFileSync(sidebarPath, content, "utf8");
  console.log("✓ Linked Work Orders, Backcharges, and Subcontractor IPCs in Sidebar.tsx");
}

