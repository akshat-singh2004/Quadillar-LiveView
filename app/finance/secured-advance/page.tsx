'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Boxes,
  CheckCircle2,
  Clock,
  Coins,
  FileText,
  Landmark,
  Plus,
  Printer,
  Receipt,
  RefreshCw,
  Scale,
  Search,
  ShieldCheck,
  AlertOctagon,
  X,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export type SecuredMaterialType =
  | 'STEEL_REBAR_FE500D'
  | 'STRUCTURAL_STEEL_SECTIONS'
  | 'CEMENT_OPC_PPC'
  | 'PIPES_AND_SANITARY_FIXTURES'
  | 'CERAMIC_TILES_STONE_SLABS'
  | 'ELECTRICAL_CABLES_CONDUITS'
  | 'JOINERY_BOARDS_HDHMR';

export type SecuredAdvanceStatus =
  | 'INDENTURE_EXECUTED_DISBURSED'
  | 'PARTIALLY_RECOVERED_CONSUMPTION'
  | 'FULLY_RECOVERED_CLOSED'
  | 'DEFAULT_HYPOTHECATION_INVOKED';

export interface SecuredAdvanceRecord {
  id: string;
  project_id: string;
  advance_ref_number: string;
  work_order_ref: string;
  contractor_name: string;
  material_type: SecuredMaterialType;
  material_description: string;
  storage_location_grid: string;
  invoice_challan_ref: string;
  gate_pass_ref?: string | null;
  delivered_quantity: number;
  unit: string;
  invoiced_rate_inr: number;
  market_or_dsr_rate_inr: number;
  assessed_base_rate_inr: number;
  total_assessed_value_inr: number;
  advance_percentage: number;
  sanctioned_advance_inr: number;
  consumed_quantity: number;
  cumulative_recovered_inr: number;
  outstanding_advance_inr: number;
  hypothecation_indenture_ref: string;
  insurance_policy_ref: string;
  insurance_expiry_date: string;
  status: SecuredAdvanceStatus;
  sanctioned_date: string;
  inspected_by_engineer: string;
}

export interface SecuredRecoveryRecord {
  id: string;
  project_id: string;
  advance_ref_number: string;
  ra_bill_number: string;
  emb_entry_ref: string;
  recovery_date: string;
  consumed_qty_this_bill: number;
  recovered_amount_inr: number;
  remaining_advance_inr: number;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString('en-IN')}`;
}

export default function CanonicalSecuredAdvancePage() {
  const { project, role } = useActiveRole();
  const [advances, setAdvances] = useState<SecuredAdvanceRecord[]>([]);
  const [recoveries, setRecoveries] = useState<SecuredRecoveryRecord[]>([]);
  const [selectedAdvance, setSelectedAdvance] = useState<SecuredAdvanceRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [consumeModalOpen, setConsumeModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  // Blank Form States
  const [woRef, setWoRef] = useState('');
  const [contractor, setContractor] = useState('');
  const [matType, setMatType] = useState<SecuredMaterialType>('STEEL_REBAR_FE500D');
  const [matDesc, setMatDesc] = useState('');
  const [gridLoc, setGridLoc] = useState('');
  const [invRef, setInvRef] = useState('');
  const [gatePassRef, setGatePassRef] = useState('');
  const [delQty, setDelQty] = useState('');
  const [unit, setUnit] = useState('MT');
  const [invRate, setInvRate] = useState('');
  const [mktRate, setMktRate] = useState('');
  const [insPolicy, setInsPolicy] = useState('');

  // Consumption Modal
  const [targetRaBill, setTargetRaBill] = useState('');
  const [embRef, setEmbRef] = useState('');
  const [consumedQtyThisBill, setConsumedQtyThisBill] = useState('');

  const loadSecuredData = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: advData }, { data: recData }] = await Promise.all([
        (supabase as any)
          .from('secured_material_advances')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false }),
        (supabase as any)
          .from('secured_advance_consumption_recoveries')
          .select('*')
          .eq('project_id', projectId)
          .order('recovery_date', { ascending: false }),
      ]);

      const advList = advData || [];
      setAdvances(advList);
      setRecoveries(recData || []);

      setSelectedAdvance((prev) => {
        if (!prev) return advList.length > 0 ? advList[0] : null;
        return advList.find((a: SecuredAdvanceRecord) => a.id === prev.id) || (advList.length > 0 ? advList[0] : null);
      });
    } catch (err: any) {
      console.error('Failed to load secured advances:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadSecuredData();
  }, [loadSecuredData]);

  const currentAdvanceRecoveries = useMemo(() => {
    if (!selectedAdvance) return [];
    return recoveries.filter((r) => r.advance_ref_number === selectedAdvance.advance_ref_number);
  }, [recoveries, selectedAdvance]);

  const summary = useMemo(() => {
    const totalSecuredAdvances = advances.length;
    const totalSanctionedInr = advances.reduce((sum, a) => sum + Number(a.sanctioned_advance_inr || 0), 0);
    const totalRecoveredInr = advances.reduce((sum, a) => sum + Number(a.cumulative_recovered_inr || 0), 0);
    const totalOutstandingInr = advances.reduce((sum, a) => sum + Number(a.outstanding_advance_inr || 0), 0);
    const activeHypothecationCount = advances.filter((a) => a.status !== 'FULLY_RECOVERED_CLOSED').length;

    return { totalSecuredAdvances, totalSanctionedInr, totalRecoveredInr, totalOutstandingInr, activeHypothecationCount };
  }, [advances]);

  const filteredAdvances = useMemo(() => {
    return advances.filter((a) => {
      const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;
      const haystack = `${a.advance_ref_number} ${a.contractor_name} ${a.material_description} ${a.hypothecation_indenture_ref}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchSearch;
    });
  }, [advances, filterStatus, search]);

  const handleCreateSecuredAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractor.trim() || !matDesc.trim() || !delQty || !invRate || !mktRate) return;

    setActionInProgress('creating_sec');
    const q = parseFloat(delQty) || 0;
    const iRate = parseFloat(invRate) || 0;
    const mRate = parseFloat(mktRate) || iRate;
    const assessedRate = Math.min(iRate, mRate);
    const totalVal = Math.round(q * assessedRate);
    const sanctioned = Math.round(totalVal * 0.75);

    const advNum = `SEC-${new Date().getFullYear()}-${(advances.length + 1).toString().padStart(3, '0')}`;
    const indRef = `IND-10A-${Date.now().toString(36).toUpperCase()}`;

    const newDbRecord = {
      project_id: projectId,
      advance_ref_number: advNum,
      work_order_ref: woRef.trim() || 'WO-DEFAULT-01',
      contractor_name: contractor.trim(),
      material_type: matType,
      material_description: matDesc.trim(),
      storage_location_grid: gridLoc.trim() || 'Main Site Storage Yard',
      invoice_challan_ref: invRef.trim() || 'CHL-001',
      gate_pass_ref: gatePassRef.trim() || null,
      delivered_quantity: q,
      unit: unit.trim() || 'MT',
      invoiced_rate_inr: iRate,
      market_or_dsr_rate_inr: mRate,
      assessed_base_rate_inr: assessedRate,
      total_assessed_value_inr: totalVal,
      advance_percentage: 75.0,
      sanctioned_advance_inr: sanctioned,
      consumed_quantity: 0,
      cumulative_recovered_inr: 0,
      outstanding_advance_inr: sanctioned,
      hypothecation_indenture_ref: indRef,
      insurance_policy_ref: insPolicy.trim() || 'INS-CAR-POLICY-DEFAULT',
      insurance_expiry_date: new Date(Date.now() + 180 * 86400000).toISOString().slice(0, 10),
      status: 'INDENTURE_EXECUTED_DISBURSED',
      sanctioned_date: new Date().toISOString().slice(0, 10),
      inspected_by_engineer: 'Resident SEOR',
    };

    try {
      const { data, error } = await (supabase as any)
        .from('secured_material_advances')
        .insert([newDbRecord])
        .select()
        .single();

      if (error) throw error;
      setModalOpen(false);
      setContractor('');
      setMatDesc('');
      setDelQty('');
      setInvRate('');
      setMktRate('');
      await loadSecuredData();
      if (data) setSelectedAdvance(data);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to sanction advance.');
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleRecordConsumptionRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvance || !consumedQtyThisBill || !targetRaBill.trim() || !embRef.trim()) return;

    setActionInProgress('recording_rec');
    const consumed = parseFloat(consumedQtyThisBill) || 0;
    const recoveryAmt = Math.round(consumed * selectedAdvance.assessed_base_rate_inr * 0.75);
    const newConsumedTotal = selectedAdvance.consumed_quantity + consumed;
    const newCumulativeRecovered = selectedAdvance.cumulative_recovered_inr + recoveryAmt;
    const newOutstanding = Math.max(0, selectedAdvance.outstanding_advance_inr - recoveryAmt);

    const nextStatus = newOutstanding <= 0 ? 'FULLY_RECOVERED_CLOSED' : 'PARTIALLY_RECOVERED_CONSUMPTION';

    const newRecoveryLog = {
      project_id: projectId,
      advance_ref_number: selectedAdvance.advance_ref_number,
      ra_bill_number: targetRaBill.trim(),
      emb_entry_ref: embRef.trim(),
      recovery_date: new Date().toISOString().slice(0, 10),
      consumed_qty_this_bill: consumed,
      recovered_amount_inr: recoveryAmt,
      remaining_advance_inr: newOutstanding,
    };

    try {
      await (supabase as any).from('secured_advance_consumption_recoveries').insert([newRecoveryLog]);
      await (supabase as any)
        .from('secured_material_advances')
        .update({
          consumed_quantity: newConsumedTotal,
          cumulative_recovered_inr: newCumulativeRecovered,
          outstanding_advance_inr: newOutstanding,
          status: nextStatus,
        })
        .eq('id', selectedAdvance.id);

      setConsumeModalOpen(false);
      setConsumedQtyThisBill('');
      setFeedbackMessage(`Deduction of ${formatInr(recoveryAmt)} recorded on ${targetRaBill}.`);
      setTimeout(() => setFeedbackMessage(null), 3500);
      await loadSecuredData();
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to record recovery.');
      setTimeout(() => setFeedbackMessage(null), 4000);
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
              FINANCIAL GOVERNANCE • CPWD GCC CL. 10B / FORM 10A INDENTURE
              <StatutoryInfo
                standardRef="CPWD GCC CL. 10B / FORM 10A"
                title="Secured Material Advance (75% Rule)"
                idealRange="Cap: 75% of min(Agreement Rate, Market Rate)"
                description="Contractors may receive up to 75% advance against non-perishable structural materials brought to site under an executed Form 10A hypothecation deed. Recovery is 100% amortized against subsequent RA bills as work is measured."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Boxes className="w-6 h-6 text-cyan-400" />
              <span>Secured Material Advance (75% Indenture Form 10A)</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • 75% hypothecation valuation on non-perishable site stock and 100% consumption recovery.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadSecuredData()}
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
              <span>Sanction 75% Advance</span>
            </button>
          </div>
        </header>

        {feedbackMessage && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Outstanding Secured Advance</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {formatInr(summary.totalOutstandingInr)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Hypothecated site stock liability</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Cumulative Recovered (Consumed)</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {formatInr(summary.totalRecoveredInr)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Amortized via e-MB measurements</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Active Hypothecation Indentures</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">
              {summary.activeHypothecationCount} Indentures
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">First legal charge active</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Total Sanctioned Advances</span>
            <div className="text-2xl font-bold text-white mt-1">
              {formatInr(summary.totalSanctionedInr)}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">75% assessed ceiling</span>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="font-bold text-white uppercase text-xs">Advances Ledger ({advances.length})</span>
              <span className="text-zinc-500 text-[10px]">Form 10A</span>
            </div>

            {advances.length === 0 ? (
              <div className="p-12 text-center border border-zinc-850 bg-zinc-950/50">
                <Boxes className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <div className="text-zinc-400 font-bold uppercase">Zero Secured Advances Sanctioned</div>
                <p className="text-[11px] text-zinc-600 font-sans mt-1 max-w-xs mx-auto">
                  No site stock hypothecations logged. Click &quot;Sanction 75% Advance&quot; above.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[550px] overflow-y-auto">
                {filteredAdvances.map((adv) => {
                  const isSelected = selectedAdvance?.id === adv.id;
                  return (
                    <div
                      key={adv.id}
                      onClick={() => setSelectedAdvance(adv)}
                      className={`p-3.5 rounded border cursor-pointer transition space-y-2 ${
                        isSelected
                          ? 'border-cyan-500/60 bg-cyan-950/20'
                          : 'border-zinc-850 bg-zinc-950 hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white">{adv.advance_ref_number}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-amber-400 font-bold uppercase">
                          {adv.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-zinc-200">{adv.material_description}</div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-850 pt-1.5">
                        <span>Delivered: {adv.delivered_quantity} {adv.unit}</span>
                        <span>Outstanding: <strong className="text-amber-400">{formatInr(adv.outstanding_advance_inr)}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            {selectedAdvance ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                  <div>
                    <span className="text-xs font-bold text-cyan-400">{selectedAdvance.advance_ref_number}</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedAdvance.material_description}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConsumeModalOpen(true)}
                    className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase rounded text-[11px]"
                  >
                    + Record Consumption (RA Bill)
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 p-3 bg-zinc-950 border border-zinc-850 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Sanctioned (75% Cap):</span>
                    <strong className="text-white text-sm">{formatInr(selectedAdvance.sanctioned_advance_inr)}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Total Assessed Value:</span>
                    <strong className="text-cyan-300 text-sm">{formatInr(selectedAdvance.total_assessed_value_inr)}</strong>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Assessed Base Rate:</span>
                    <span>₹{selectedAdvance.assessed_base_rate_inr}/{selectedAdvance.unit}</span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Indenture Ref:</span>
                    <span className="text-amber-400 font-bold">{selectedAdvance.hypothecation_indenture_ref}</span>
                  </div>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-850 space-y-1.5">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-zinc-400">Consumption Amortization:</span>
                    <span className="text-emerald-400 font-bold">
                      {selectedAdvance.sanctioned_advance_inr > 0
                        ? Math.round((selectedAdvance.cumulative_recovered_inr / selectedAdvance.sanctioned_advance_inr) * 100)
                        : 0}% Recovered
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-2">
                    <div
                      className="bg-emerald-500 h-2 rounded-full"
                      style={{
                        width: `${Math.min(
                          100,
                          selectedAdvance.sanctioned_advance_inr > 0
                            ? (selectedAdvance.cumulative_recovered_inr / selectedAdvance.sanctioned_advance_inr) * 100
                            : 0
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-white uppercase text-[10px] block">Consumption Recoveries ({currentAdvanceRecoveries.length})</span>
                  {currentAdvanceRecoveries.length === 0 ? (
                    <div className="p-4 text-center text-zinc-600 border border-zinc-850">Zero consumption recoveries logged.</div>
                  ) : (
                    currentAdvanceRecoveries.map((r) => (
                      <div key={r.id} className="p-2.5 bg-zinc-950 border border-zinc-850 rounded flex justify-between items-center text-[11px]">
                        <div>
                          <strong className="text-white block">{r.ra_bill_number}</strong>
                          <span className="text-zinc-500 text-[10px]">{r.emb_entry_ref} • {r.recovery_date}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-emerald-400 font-bold block">-{formatInr(Number(r.recovered_amount_inr))}</span>
                          <span className="text-[10px] text-zinc-500">Remaining: {formatInr(Number(r.remaining_advance_inr))}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="p-16 text-center text-zinc-600">Select a sanctioned advance to inspect hypothecation details.</div>
            )}
          </div>
        </div>

        {/* MODALS */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="font-bold text-white uppercase text-xs">Sanction 75% Secured Advance</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleCreateSecuredAdvance} className="space-y-2.5 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Contractor Name *</label>
                  <input type="text" required placeholder="e.g. Principal Contractor Ltd" value={contractor} onChange={(e) => setContractor(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Material Description *</label>
                  <input type="text" required placeholder="e.g. Tata Tiscon Fe500D 16mm-25mm" value={matDesc} onChange={(e) => setMatDesc(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-white" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">Delivered Qty *</label>
                    <input type="number" required placeholder="45.00" value={delQty} onChange={(e) => setDelQty(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">Unit</label>
                    <input type="text" required placeholder="MT" value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">Invoice Rate (₹) *</label>
                    <input type="number" required placeholder="72000" value={invRate} onChange={(e) => setInvRate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-white" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">Market/DSR Ceiling (₹) *</label>
                    <input type="number" required placeholder="74000" value={mktRate} onChange={(e) => setMktRate(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-0.5">Storage Location</label>
                    <input type="text" placeholder="Yard Bay 02" value={gridLoc} onChange={(e) => setGridLoc(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-white" />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3 py-1 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" disabled={actionInProgress === 'creating_sec'} className="px-3 py-1 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">Execute Advance</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {consumeModalOpen && selectedAdvance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-lg p-5 space-y-3">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                <span className="font-bold text-white uppercase text-xs">Record Consumption Recovery</span>
                <button onClick={() => setConsumeModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
              </div>
              <form onSubmit={handleRecordConsumptionRecovery} className="space-y-2.5 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">RA Bill Number *</label>
                  <input type="text" required placeholder="e.g. RA-02" value={targetRaBill} onChange={(e) => setTargetRaBill(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Certified e-MB Entry Ref *</label>
                  <input type="text" required placeholder="e.g. MB-2026-041" value={embRef} onChange={(e) => setEmbRef(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-white" />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Consumed Qty This Bill ({selectedAdvance.unit}) *</label>
                  <input type="number" step="any" required placeholder="15.00" value={consumedQtyThisBill} onChange={(e) => setConsumedQtyThisBill(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-white" />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setConsumeModalOpen(false)} className="px-3 py-1 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" disabled={actionInProgress === 'recording_rec'} className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase rounded">Deduct from RA Bill</button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
