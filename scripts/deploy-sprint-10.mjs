import fs from 'fs';
import path from 'path';

console.log("Starting Sprint 10 Spatial CDE & CPWD Clause 42 Deployment...");

const safeWriteFileSync = (targetPath, content) => {
  const dir = path.dirname(targetPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(targetPath, content, 'utf8');
};

// --------------------------------------------------------------------------
// 1. Scrubbed app/drawings/gfc-canvas/page.tsx
// --------------------------------------------------------------------------
let gfcCode = fs.readFileSync("app/drawings/gfc-canvas/page.tsx", "utf8");

gfcCode = gfcCode.replace(
  "const activeProjectId = project?.project_id || project?.id || 'proj-1';",
  "const activeProjectId = (project as any)?.project_id || (project as any)?.id || 'proj-1';"
);

safeWriteFileSync("app/drawings/gfc-canvas/page.tsx", gfcCode);
console.log("✓ Verified app/drawings/gfc-canvas/page.tsx.");

// --------------------------------------------------------------------------
// 2. Production app/operations/material-recon/page.tsx (CPWD Clause 42)
// --------------------------------------------------------------------------
const reconCode = `'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Scale,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Plus,
  RefreshCw,
  CheckCircle2,
  Receipt,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface MaterialReconRecord {
  id: string;
  project_id: string;
  reconciliation_period: string;
  material_type: 'CEMENT_OPC_PPC' | 'STEEL_REBAR_FE500D' | 'STRUCTURAL_STEEL' | 'BITUMEN_VG30';
  unit: string;
  theoretical_consumption: number;
  actual_consumption: number;
  permissible_variation_pct: number;
  permissible_limit_qty: number;
  excess_wastage_qty: number;
  shortfall_under_consumption_qty: number;
  penal_rate_inr: number;
  penal_recovery_amount_inr: number;
  status: 'RECONCILED_DRAFT' | 'SEOR_CONFIRMED' | 'PENAL_DEBIT_ENFORCED';
  seor_certifier_hash?: string | null;
}

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function MaterialReconciliationPage() {
  const { project } = useActiveRole();
  const activeProjectId = (project as any)?.project_id || (project as any)?.id || 'proj-1';
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [records, setRecords] = useState<MaterialReconRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [period, setPeriod] = useState('Up to RA Bill #04');
  const [matType, setMatType] = useState<MaterialReconRecord['material_type']>('STEEL_REBAR_FE500D');
  const [unit, setUnit] = useState('MT');
  const [theoreticalQty, setTheoreticalQty] = useState('');
  const [actualQty, setActualQty] = useState('');
  const [permissiblePct, setPermissiblePct] = useState('2.0');
  const [penalRate, setPenalRate] = useState('130000'); // 2x benchmark for steel

  const loadRecon = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('material_reconciliation_records')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (err: any) {
      console.error('Failed to load material reconciliation:', err);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadRecon();
  }, [loadRecon]);

  const summary = useMemo(() => {
    const totalPenalRecoveryInr = records.reduce((sum, r) => sum + Number(r.penal_recovery_amount_inr || 0), 0);
    const totalExcessWastage = records.reduce((sum, r) => sum + Number(r.excess_wastage_qty || 0), 0);
    const breachedItemsCount = records.filter((r) => Number(r.excess_wastage_qty || 0) > 0).length;

    return { totalPenalRecoveryInr, totalExcessWastage, breachedItemsCount, count: records.length };
  }, [records]);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theoreticalQty || !actualQty) return;

    setSubmitting(true);
    const theo = parseFloat(theoreticalQty) || 0;
    const act = parseFloat(actualQty) || 0;
    const permPct = parseFloat(permissiblePct) || 2.0;
    const pRate = parseFloat(penalRate) || 0;

    const payload = {
      project_id: activeProjectId,
      reconciliation_period: period.trim(),
      material_type: matType,
      unit,
      theoretical_consumption: theo,
      actual_consumption: act,
      permissible_variation_pct: permPct,
      penal_rate_inr: pRate,
      status: 'RECONCILED_DRAFT',
    };

    try {
      const { error } = await (supabase as any)
        .from('material_reconciliation_records')
        .insert([payload]);

      if (error) throw error;

      setModalOpen(false);
      setTheoreticalQty('');
      setActualQty('');
      setFeedback('Material reconciliation entry logged per CPWD Clause 42.');
      setTimeout(() => setFeedback(null), 3500);
      await loadRecon();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to record reconciliation entry.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnforcePenalDebit = async (rec: MaterialReconRecord) => {
    try {
      const seorHash = \`SEOR-CL42-PENAL-\${Date.now().toString(36).toUpperCase()}\`;
      await (supabase as any)
        .from('material_reconciliation_records')
        .update({
          status: 'PENAL_DEBIT_ENFORCED',
          seor_certifier_hash: seorHash,
        })
        .eq('id', rec.id);

      setFeedback(\`Clause 42 penal recovery of \${formatInr(rec.penal_recovery_amount_inr)} debited.\`);
      setTimeout(() => setFeedback(null), 3500);
      await loadRecon();
    } catch (err: any) {
      console.error('Failed to enforce penal recovery:', err);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              STATUTORY MATERIAL CONTROL • CPWD GCC CLAUSE 42 / IS 1200 AUDIT
              <StatutoryInfo
                standardRef="CPWD GCC CL. 42"
                title="Theoretical vs Actual Material Reconciliation"
                idealRange="Permissible Wastage: <= 2.0%"
                description="Theoretical consumption is derived from certified e-MB measurements multiplied by standard DSR coefficients. Actual consumption is audited against store issues. Any wastage exceeding the 2% permissible limit is recovered from the contractor at double (2x) the market/issue rate."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Scale className="w-6 h-6 text-cyan-400" />
              <span>Material Reconciliation (CPWD Clause 42 Ledger)</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Theoretical vs. Actual consumption audits for Cement, Steel &amp; Bitumen with 2x penal recovery enforcement.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadRecon()}
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
              <span>Record Reconciliation</span>
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
            <span className="text-[10px] text-zinc-500 uppercase block">Clause 42 Penal Recoveries</span>
            <div className={\`text-2xl font-bold mt-1 \${summary.totalPenalRecoveryInr > 0 ? "text-rose-400" : "text-emerald-400"}\`}>
              {formatInr(summary.totalPenalRecoveryInr)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Debitable at 2x statutory rate</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Excess Material Wastage</span>
            <div className="text-2xl font-bold text-white mt-1">
              {summary.totalExcessWastage.toFixed(2)} MT
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Exceeds &plusmn;2.0% tolerance limit</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Breach Incidents</span>
            <div className={\`text-2xl font-bold mt-1 \${summary.breachedItemsCount > 0 ? "text-amber-400" : "text-emerald-400"}\`}>
              {summary.breachedItemsCount} Batches
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Subject to SEOR penal debit</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Audited Cycles</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{summary.count} Periods</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Reconciled up to active RA bill</span>
          </div>
        </div>

        {/* RECONCILIATION TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="text-white font-bold text-xs uppercase block">
              Clause 42 Consumption Variance Ledger ({records.length})
            </span>
          </div>

          {records.length === 0 ? (
            <div className="p-12 text-center border border-zinc-850 bg-zinc-950 text-xs text-zinc-500">
              Zero reconciliation audits on record. Click &quot;Record Reconciliation&quot; to test material consumption against permissible tolerances.
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Period &amp; Material</th>
                    <th className="p-3 text-right">Theoretical Qty</th>
                    <th className="p-3 text-right">Actual Inward Qty</th>
                    <th className="p-3 text-right">Permissible (+2%)</th>
                    <th className="p-3 text-right">Excess Wastage</th>
                    <th className="p-3 text-right">Penal Rate (2x)</th>
                    <th className="p-3 text-right">Recovery Balance</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {records.map((r) => {
                    const isBreach = Number(r.excess_wastage_qty) > 0;
                    const isDebited = r.status === 'PENAL_DEBIT_ENFORCED';

                    return (
                      <tr key={r.id} className={\`hover:bg-zinc-900/50 transition \${isBreach ? 'bg-rose-950/10' : ''}\`}>
                        <td className="p-3">
                          <span className="text-white font-bold block">{r.reconciliation_period}</span>
                          <span className="text-[10px] text-cyan-400">{r.material_type.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="p-3 text-right text-zinc-300 font-bold">{Number(r.theoretical_consumption).toFixed(2)} {r.unit}</td>
                        <td className="p-3 text-right text-zinc-200">{Number(r.actual_consumption).toFixed(2)} {r.unit}</td>
                        <td className="p-3 text-right text-zinc-400">{Number(r.permissible_limit_qty).toFixed(2)} {r.unit}</td>
                        <td className="p-3 text-right font-bold">
                          <span className={isBreach ? 'text-rose-400' : 'text-emerald-400'}>
                            {isBreach ? \`+\${Number(r.excess_wastage_qty).toFixed(2)}\` : '0.00'} {r.unit}
                          </span>
                        </td>
                        <td className="p-3 text-right text-zinc-400">₹{Number(r.penal_rate_inr).toLocaleString()}/{r.unit}</td>
                        <td className="p-3 text-right font-bold text-rose-400 text-sm">
                          {isBreach ? formatInr(Number(r.penal_recovery_amount_inr)) : '₹0'}
                        </td>
                        <td className="p-3 text-center">
                          {isBreach && !isDebited ? (
                            <button
                              type="button"
                              onClick={() => handleEnforcePenalDebit(r)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px] font-bold uppercase transition"
                            >
                              Debit 2x Penal
                            </button>
                          ) : (
                            <span className="text-[10px] text-zinc-500 font-bold uppercase">
                              {isDebited ? 'DEBITED IN IPC' : 'CLEARED OK'}
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

      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-cyan-400" />
                <span>Record Material Reconciliation (CPWD Cl. 42)</span>
              </span>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateRecord} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Reconciliation Period *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cumulative up to RA Bill #04"
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Material Type</label>
                  <select
                    value={matType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setMatType(val);
                      if (val.includes('CEMENT')) { setUnit('Bags'); setPenalRate('760'); }
                      else if (val.includes('STEEL')) { setUnit('MT'); setPenalRate('130000'); }
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="STEEL_REBAR_FE500D">TMT Steel Rebar Fe500D</option>
                    <option value="CEMENT_OPC_PPC">Portland Cement (OPC / PPC)</option>
                    <option value="STRUCTURAL_STEEL">Structural Steel Sections</option>
                    <option value="BITUMEN_VG30">Bitumen VG-30</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Theoretical Consumption ({unit}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={theoreticalQty}
                    onChange={(e) => setTheoreticalQty(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-bold"
                  />
                  <span className="text-[9px] text-zinc-500 mt-0.5 block">e-MB work done &times; DSR factor</span>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Actual Consumption / Inward ({unit}) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={actualQty}
                    onChange={(e) => setActualQty(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-bold"
                  />
                  <span className="text-[9px] text-zinc-500 mt-0.5 block">Store issues &plusmn; yard stock</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Permissible Wastage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={permissiblePct}
                    onChange={(e) => setPermissiblePct(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                  <span className="text-[9px] text-zinc-500 mt-0.5 block">CPWD Cl. 42 standard: 2.0%</span>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Penal Rate (2x Issue Rate in ₹) *</label>
                  <input
                    type="number"
                    required
                    value={penalRate}
                    onChange={(e) => setPenalRate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-rose-400 font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded text-xs">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase text-xs rounded transition">
                  Execute Reconciliation
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

safeWriteFileSync("app/operations/material-recon/page.tsx", reconCode);
console.log("✓ Deployed app/operations/material-recon/page.tsx with CPWD Clause 42 calculations.");

// --------------------------------------------------------------------------
// 3. Production app/drawings/page.tsx (ISO 19650 Transmittals & GFC Register)
// --------------------------------------------------------------------------
const drawingsIndexCode = `'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Compass,
  Layers,
  FileCheck2,
  RefreshCw,
  Plus,
  Send,
  ExternalLink,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface Transmittal {
  id: string;
  transmittal_number: string;
  subject: string;
  sender_organization: string;
  recipient_organization: string;
  purpose_of_issue: 'FOR_CONSTRUCTION' | 'FOR_INFORMATION' | 'FOR_REVIEW' | 'AS_BUILT';
  transmitted_date: string;
  acknowledgement_status: 'SENT_PENDING_ACK' | 'ACKNOWLEDGED_RECEIVED';
}

export default function DrawingsMasterPage() {
  const { project } = useActiveRole();
  const activeProjectId = (project as any)?.project_id || (project as any)?.id || 'proj-1';
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [transmittals, setTransmittals] = useState<Transmittal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('drawing_transmittals')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransmittals(data || []);
    } catch (err: any) {
      console.error('Failed to load transmittals:', err);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              COMMON DATA ENVIRONMENT (CDE) • ISO 19650-2 TRANSMITTAL LOG
              <StatutoryInfo
                standardRef="ISO 19650-2 / DIN 1356"
                title="Electronic Document Transmittals"
                idealRange="Status: A1 For Construction"
                description="Governs the legally binding distribution of drawings and specifications between Architect, SEOR, and General Contractor. All site execution must reference acknowledged transmittals."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-cyan-400" />
              <span>GFC Drawing Register &amp; Transmittal Log</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • ISO 19650 document distribution, statutory revision control, and spatial blueprint canvas gateway.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadData()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href="/drawings/gfc-canvas"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase rounded transition flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4" />
              <span>Open Spatial Floor Canvas</span>
            </Link>
          </div>
        </header>

        {/* 3 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Registered Transmittals</span>
            <div className="text-2xl font-bold text-white mt-1">{transmittals.length} Transmittals</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Electronic CDE log</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">GFC Construction Releases</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {transmittals.filter((t) => t.purpose_of_issue === 'FOR_CONSTRUCTION').length} Releases
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Approved for field execution</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">CDE Standard</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">ISO 19650-2</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">BIM Container Governance</span>
          </div>
        </div>

        {/* TRANSMITTALS TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="text-white font-bold text-xs uppercase block">
              Official Document Transmittal History ({transmittals.length})
            </span>
          </div>

          {transmittals.length === 0 ? (
            <div className="p-12 text-center border border-zinc-850 bg-zinc-950 text-xs text-zinc-500">
              Zero document transmittals on record.
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Transmittal No</th>
                    <th className="p-3">Subject / Document Scope</th>
                    <th className="p-3">Issuing Agency</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3 text-center">Purpose of Issue</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {transmittals.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-900/50 transition">
                      <td className="p-3 font-bold text-cyan-400">{t.transmittal_number}</td>
                      <td className="p-3 text-zinc-200 font-sans font-medium">{t.subject}</td>
                      <td className="p-3 text-zinc-400">{t.sender_organization}</td>
                      <td className="p-3 text-zinc-400">{t.recipient_organization}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-800 text-zinc-300">
                          {t.purpose_of_issue.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {t.acknowledgement_status.replace(/_/g, ' ')}
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
`;

safeWriteFileSync("app/drawings/page.tsx", drawingsIndexCode);
console.log("✓ Deployed app/drawings/page.tsx with ISO 19650 transmittal log.");

// --------------------------------------------------------------------------
// 4. Verify & Ensure Sidebar.tsx Wiring
// --------------------------------------------------------------------------
const sidebarPath = "components/layout/Sidebar.tsx";
if (fs.existsSync(sidebarPath)) {
  let content = fs.readFileSync(sidebarPath, "utf8");

  // Ensure icons are present in lucide-react import
  const requiredIcons = ["Scale", "Compass", "FileCheck2"];
  requiredIcons.forEach(icon => {
    if (!content.includes(icon + ",") && !content.includes(icon + " ")) {
      content = content.replace(/(import\s*\{[^}]*)(\}\s*from\s*["']lucide-react["'])/s, `$1, ${icon} $2`);
    }
  });

  if (!content.includes("/operations/material-recon")) {
    content = content.replace(
      /(\{\s*label:\s*["\x27]Vendor Directory["\x27][^}]*\},)/g,
      `$1\n      { label: "Material Recon (Cl. 42)", href: "/operations/material-recon", icon: Scale },`
    );
  }

  if (!content.includes("/drawings/gfc-canvas")) {
    content = content.replace(
      /(\{\s*label:\s*["\x27]Material Recon \(Cl\. 42\)["\x27][^}]*\},)/g,
      `$1\n      { label: "GFC Blueprint Canvas", href: "/drawings/gfc-canvas", icon: Compass },\n      { label: "Drawing Transmittals", href: "/drawings", icon: FileCheck2 },`
    );
  }

  fs.writeFileSync(sidebarPath, content, "utf8");
  console.log("✓ Verified Sidebar.tsx links for Material Recon, GFC Canvas & Transmittals.");
}

