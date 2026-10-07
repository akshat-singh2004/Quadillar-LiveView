'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layers, ShieldCheck, CheckCircle2, Clock, AlertTriangle, Plus, RefreshCw, X, FileText, Check } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface ITPStageGate {
  id: string;
  project_id: string;
  gate_code: string;
  trade_discipline: string;
  inspection_item: string;
  structural_zone: string;
  gate_type: 'HOLD_POINT' | 'WITNESS_POINT' | 'SURVEILLANCE';
  acceptance_criteria: string;
  standard_clause_ref: string;
  contractor_qc_engineer: string;
  consultant_seor_name?: string | null;
  status: 'PENDING_INSPECTION' | 'APPROVED_CONCURRED' | 'REJECTED_HOLD_ACTIVE';
  seor_signature_hash?: string | null;
  inspected_at?: string | null;
}

export default function ITPPage() {
  const { project, role } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [gates, setGates] = useState<ITPStageGate[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [discipline, setDiscipline] = useState('CIVIL_REBAR_SHUTTERING');
  const [item, setItem] = useState('');
  const [zone, setZone] = useState('');
  const [gateType, setGateType] = useState<'HOLD_POINT' | 'WITNESS_POINT' | 'SURVEILLANCE'>('HOLD_POINT');
  const [criteria, setCriteria] = useState('');
  const [standardRef, setStandardRef] = useState('IS 456:2000 Cl. 10 / CPWD Quality Manual');

  const loadGates = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('itp_stage_gates')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGates(data || []);
    } catch (err: any) {
      console.error('Failed to load ITP gates:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadGates();
  }, [loadGates]);

  const summary = useMemo(() => {
    const totalGates = gates.length;
    const holdPoints = gates.filter((g) => g.gate_type === 'HOLD_POINT').length;
    const pendingCount = gates.filter((g) => g.status === 'PENDING_INSPECTION').length;
    const approvedCount = gates.filter((g) => g.status === 'APPROVED_CONCURRED').length;

    return { totalGates, holdPoints, pendingCount, approvedCount };
  }, [gates]);

  const handleCreateGate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item.trim() || !zone.trim() || !criteria.trim()) return;

    setSubmitting(true);
    const gateNum = `ITP-GATE-${new Date().getFullYear()}-${(gates.length + 1).toString().padStart(3, '0')}`;

    const payload = {
      project_id: projectId,
      gate_code: gateNum,
      trade_discipline: discipline,
      inspection_item: item.trim(),
      structural_zone: zone.trim(),
      gate_type: gateType,
      acceptance_criteria: criteria.trim(),
      standard_clause_ref: standardRef.trim(),
      contractor_qc_engineer: 'Site QA/QC Engineer',
      status: 'PENDING_INSPECTION',
    };

    try {
      const { error } = await (supabase as any).from('itp_stage_gates').insert([payload]);
      if (error) throw error;

      setModalOpen(false);
      setItem('');
      setZone('');
      setCriteria('');
      setFeedback('ITP stage-gate hold point registered successfully.');
      setTimeout(() => setFeedback(null), 3500);
      await loadGates();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to register ITP gate.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignoffGate = async (gateId: string, isApproval: boolean) => {
    const seorSig = `SEOR-ITP-${Date.now().toString(36).toUpperCase()}-IS456`;
    const newStatus = isApproval ? 'APPROVED_CONCURRED' : 'REJECTED_HOLD_ACTIVE';

    try {
      await (supabase as any)
        .from('itp_stage_gates')
        .update({
          status: newStatus,
          consultant_seor_name: 'Resident SEOR / Principal Consultant',
          seor_signature_hash: isApproval ? seorSig : null,
          inspected_at: new Date().toISOString(),
        })
        .eq('id', gateId);

      await loadGates();
    } catch (err: any) {
      console.error('Failed to signoff ITP gate:', err);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              QUALITY ASSURANCE • IS 456 CL. 10 / CPWD QUALITY MANUAL
              <StatutoryInfo
                standardRef="IS 456 CL. 10 / ISO 9001"
                title="ITP Hold Points & Witness Gates"
                idealRange="0 Unapproved Hold Gates"
                description="Hold Points (H) contractually stop subsequent site activity (e.g. concrete casting or backfilling) until the client/SEOR representative physically signs and seals the clearance certificate."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Layers className="w-6 h-6 text-cyan-400" />
              <span>Inspection &amp; Test Plan (ITP) Stage-Gate Matrix</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Statutory witness and hold points enforcing mandatory QA/QC sign-offs before critical-path execution.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadGates()}
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
              <span>Register Hold Point</span>
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
            <span className="text-[10px] text-zinc-500 uppercase block">Active ITP Stage-Gates</span>
            <div className="text-2xl font-bold text-white mt-1">
              {summary.totalGates} Gates
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Contractual Inspection Matrix</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Mandatory Hold Points (H)</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {summary.holdPoints} Points
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Requires physical SEOR sign-off</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Pending Endorsement</span>
            <div className={`text-2xl font-bold mt-1 ${summary.pendingCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
              {summary.pendingCount} In Queue
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Work execution locked</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Approved &amp; Concurred</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {summary.approvedCount} Cleared
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Cryptographic QA certificates issued</span>
          </div>
        </div>

        {/* ITP GATES TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="text-white font-bold text-xs uppercase block">
              Inspection Hold Point Register ({gates.length})
            </span>
          </div>

          {gates.length === 0 ? (
            <div className="p-12 text-center border border-zinc-850 bg-zinc-950 text-xs">
              <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <div className="text-zinc-400 font-bold uppercase">Zero Inspection Stage-Gates Registered</div>
              <p className="text-[11px] text-zinc-600 font-sans mt-1 max-w-sm mx-auto">
                No active hold points. Click &quot;Register Hold Point&quot; to define mandatory pre-pour or pre-closing inspection gates.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Gate Code &amp; Trade</th>
                    <th className="p-3">Inspection Item</th>
                    <th className="p-3">Structural Zone</th>
                    <th className="p-3 text-center">Gate Type</th>
                    <th className="p-3">Acceptance Criteria</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {gates.map((g) => {
                    const isApproved = g.status === 'APPROVED_CONCURRED';
                    const isRejected = g.status === 'REJECTED_HOLD_ACTIVE';

                    return (
                      <tr key={g.id} className="hover:bg-zinc-900/50 transition">
                        <td className="p-3">
                          <span className="text-white font-bold block">{g.gate_code}</span>
                          <span className="text-[10px] text-zinc-500">{g.trade_discipline.replace(/_/g, ' ')}</span>
                        </td>
                        <td className="p-3">
                          <strong className="text-zinc-200 block">{g.inspection_item}</strong>
                          <span className="text-[10px] text-zinc-500 font-sans">{g.standard_clause_ref}</span>
                        </td>
                        <td className="p-3 text-cyan-300 font-mono text-[11px]">{g.structural_zone}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            g.gate_type === 'HOLD_POINT'
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : g.gate_type === 'WITNESS_POINT'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}>
                            {g.gate_type.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-400 max-w-xs truncate font-sans text-[11px]">
                          {g.acceptance_criteria}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            isApproved
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : isRejected
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {g.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {!isApproved && (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSignoffGate(g.id, true)}
                                className="px-2 py-1 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[10px] uppercase rounded"
                              >
                                Clear Gate
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSignoffGate(g.id, false)}
                                className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 font-bold text-[10px] uppercase rounded"
                              >
                                Reject
                              </button>
                            </div>
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

      {/* REGISTER HOLD POINT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Register ITP Stage-Gate Hold Point</span>
              </span>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateGate} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Discipline</label>
                  <select
                    value={discipline}
                    onChange={(e) => setDiscipline(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="CIVIL_REBAR_SHUTTERING">Rebar &amp; Formwork</option>
                    <option value="CONCRETE_PLACEMENT">Concrete Placement</option>
                    <option value="WATERPROOFING_MEMBRANE">Waterproofing Membrane</option>
                    <option value="POST_TENSIONING_STRESSING">PT Tendon Stressing</option>
                    <option value="MEP_CONCEALED_FIRST_FIX">Concealed MEP Rough-in</option>
                    <option value="STRUCTURAL_STEEL_WELDING">Structural Steel Welding</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Gate Classification</label>
                  <select
                    value={gateType}
                    onChange={(e) => setGateType(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="HOLD_POINT">Hold Point (Mandatory Sign-off)</option>
                    <option value="WITNESS_POINT">Witness Point</option>
                    <option value="SURVEILLANCE">Surveillance Audit</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Inspection Item *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Level 3 Slab Rebar Cover & Chair Spacing"
                  value={item}
                  onChange={(e) => setItem(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Structural Zone / Grid *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tower A / Elevation +12.4m / Axis B1-C4"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Acceptance Criteria *</label>
                <textarea
                  rows={2}
                  required
                  placeholder="e.g. 50mm clear cover verified; cover blocks @ 1m spacing; lap lengths >= 50d..."
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
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
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase text-xs rounded transition"
                >
                  {submitting ? 'Registering...' : 'Sanction Gate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </main>
  );
}
