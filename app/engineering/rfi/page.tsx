'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  FileQuestion,
  Clock,
  Flame,
  AlertOctagon,
  ShieldAlert,
  Search,
  Plus,
  Printer,
  CheckCircle2,
  Send,
  Coins,
  X,
  RefreshCw,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export type RfiPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL_BLOCKER';
export type RfiStatus = 'OPEN' | 'UNDER_REVIEW' | 'ANSWERED' | 'CLOSED_CONCURRED' | 'REJECTED_OUT_OF_SCOPE';

export interface RfiRecord {
  id: string;
  project_id: string;
  rfi_number: string;
  title: string;
  discipline: string;
  location_grid: string;
  drawing_reference: string;
  specification_clause?: string | null;
  contractor_entity: string;
  question_text: string;
  suggested_solution?: string | null;
  response_text?: string | null;
  priority: RfiPriority;
  status: RfiStatus;
  cost_impact: boolean;
  schedule_impact: boolean;
  potential_variation_inr: number;
  potential_delay_days: number;
  linked_hindrance_number?: string | null;
  linked_variation_number?: string | null;
  sla_target_date: string;
  response_date?: string | null;
  assigned_consultant: string;
  responded_by?: string | null;
  created_at?: string;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString('en-IN')}`;
}

export default function CanonicalRfiPage() {
  const { project, role } = useActiveRole();
  const [rfis, setRfis] = useState<RfiRecord[]>([]);
  const [selectedRfi, setSelectedRfi] = useState<RfiRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Response form inside audit desk
  const [responseText, setResponseText] = useState('');

  const projectId = (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const roleLabel = (role as { label?: string })?.label || 'Resident SEOR';
  const isConsultantOrEngineer = true; // Authorized to record determinations

  // Form State for Creating New RFI (Strictly Blank Initial State)
  const [rfiTitle, setRfiTitle] = useState('');
  const [discipline, setDiscipline] = useState('Structural / Civil');
  const [locationGrid, setLocationGrid] = useState('');
  const [drawingRef, setDrawingRef] = useState('');
  const [specClause, setSpecClause] = useState('');
  const [contractor, setContractor] = useState('');
  const [priority, setPriority] = useState<RfiPriority>('HIGH');
  const [questionText, setQuestionText] = useState('');
  const [suggestedSolution, setSuggestedSolution] = useState('');
  const [costImpact, setCostImpact] = useState(false);
  const [scheduleImpact, setScheduleImpact] = useState(false);
  const [potentialVariation, setPotentialVariation] = useState<string>('');
  const [potentialDelay, setPotentialDelay] = useState<string>('');

  const loadRfis = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('requests_for_information')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = data || [];
      setRfis(list);

      // Keep current selection if valid, otherwise select first item or null
      setSelectedRfi((prev) => {
        if (!prev) return list.length > 0 ? list[0] : null;
        const exists = list.find((item: RfiRecord) => item.id === prev.id);
        return exists || (list.length > 0 ? list[0] : null);
      });
    } catch (err: any) {
      console.error('Failed to load RFIs:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadRfis();
  }, [loadRfis]);

  // Metric Summaries (Strictly Zero-State Compliant)
  const summary = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const totalCount = rfis.length;
    const openCount = rfis.filter((r) => r.status === 'OPEN' || r.status === 'UNDER_REVIEW').length;
    const criticalCount = rfis.filter(
      (r) => r.priority === 'CRITICAL_BLOCKER' && r.status !== 'CLOSED_CONCURRED'
    ).length;
    const overdueCount = rfis.filter(
      (r) => (r.status === 'OPEN' || r.status === 'UNDER_REVIEW') && r.sla_target_date < today
    ).length;

    return { totalCount, openCount, criticalCount, overdueCount };
  }, [rfis]);

  const filteredRfis = useMemo(() => {
    return rfis.filter((r) => {
      const matchStatus = filterStatus === 'ALL' || r.status === filterStatus;
      const matchPriority = filterPriority === 'ALL' || r.priority === filterPriority;
      const haystack = `${r.rfi_number} ${r.title} ${r.location_grid} ${r.drawing_reference} ${r.contractor_entity}`.toLowerCase();
      const matchSearch = !search.trim() || haystack.includes(search.toLowerCase().trim());
      return matchStatus && matchPriority && matchSearch;
    });
  }, [rfis, filterStatus, filterPriority, search]);

  // Submit Official Engineering Determination
  const handleAnswerRfi = async () => {
    if (!selectedRfi || !responseText.trim() || !isConsultantOrEngineer) return;
    setActionInProgress(`answer_${selectedRfi.id}`);

    const updatePayload = {
      response_text: responseText.trim(),
      response_date: new Date().toISOString().slice(0, 10),
      status: 'ANSWERED',
      responded_by: roleLabel || 'Resident SEOR',
    };

    try {
      const { error } = await (supabase as any)
        .from('requests_for_information')
        .update(updatePayload)
        .eq('id', selectedRfi.id);

      if (error) throw error;

      setResponseText('');
      setFeedbackMessage(`Official technical determination issued for ${selectedRfi.rfi_number}.`);
      setTimeout(() => setFeedbackMessage(null), 3500);
      await loadRfis();
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to submit technical determination.');
    } finally {
      setActionInProgress(null);
    }
  };

  // Close Concurred
  const handleCloseRfi = async (rfiId: string) => {
    setActionInProgress(rfiId);
    try {
      const { error } = await (supabase as any)
        .from('requests_for_information')
        .update({ status: 'CLOSED_CONCURRED' })
        .eq('id', rfiId);

      if (error) throw error;
      await loadRfis();
    } catch (err: any) {
      console.error('Failed to close RFI:', err);
    } finally {
      setActionInProgress(null);
    }
  };

  // Bridge to DPR Hindrance Register
  const handleEscalateToHindrance = async (rfi: RfiRecord) => {
    setActionInProgress(`hindrance_${rfi.id}`);
    const hindranceNo = `HIN-${new Date().getFullYear()}-${rfi.rfi_number.replace('RFI-', '')}`;

    try {
      await (supabase as any).from('site_hindrance_register').insert([
        {
          project_id: projectId,
          hindrance_item_no: hindranceNo,
          category: 'DRAWING_REVISION_UNAVAILABLE',
          description: `Contractual delay notice: Awaiting technical determination on ${rfi.rfi_number} (${rfi.title})`,
          affected_grid: rfi.location_grid,
          days_hindered: rfi.potential_delay_days || 1.0,
          status: 'NOTIFIED_TO_CLIENT',
          notified_to_client: true,
        },
      ]);

      await (supabase as any)
        .from('requests_for_information')
        .update({ linked_hindrance_number: hindranceNo })
        .eq('id', rfi.id);

      setFeedbackMessage(`SLA delay notice logged in Hindrance Register (${hindranceNo}) per FIDIC Cl. 1.9.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
      await loadRfis();
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to log hindrance entry.');
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setActionInProgress(null);
    }
  };

  // Bridge to Potential Change Orders (PCO)
  const handlePromoteToVariation = async (rfi: RfiRecord) => {
    setActionInProgress(`variation_${rfi.id}`);
    const pcoNo = `PCO-${new Date().getFullYear()}-${rfi.rfi_number.replace('RFI-', '')}`;

    try {
      await (supabase as any).from('potential_change_orders').insert([
        {
          project_id: projectId,
          pco_number: pcoNo,
          title: `Variation arising from ${rfi.rfi_number}: ${rfi.title}`,
          reference_document: `${rfi.drawing_reference} / ${rfi.rfi_number}`,
          justification: `Site technical query determination: ${rfi.response_text || rfi.question_text}`,
          claimed_amount_inr: rfi.potential_variation_inr || 0,
          eot_days_requested: rfi.potential_delay_days || 0,
          status: 'SUBMITTED_TO_CLIENT',
        },
      ]);

      await (supabase as any)
        .from('requests_for_information')
        .update({ linked_variation_number: pcoNo })
        .eq('id', rfi.id);

      setFeedbackMessage(`Generated Potential Change Order (${pcoNo}) in Scope Variation Ledger.`);
      setTimeout(() => setFeedbackMessage(null), 4000);
      await loadRfis();
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to generate Change Order.');
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setActionInProgress(null);
    }
  };

  // Create New RFI
  const handleCreateRfi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rfiTitle.trim() || !locationGrid.trim() || !drawingRef.trim() || !questionText.trim()) {
      return;
    }

    setActionInProgress('creating_rfi');
    const rfiNum = `RFI-${new Date().getFullYear()}-${(rfis.length + 1).toString().padStart(3, '0')}`;

    const newDbRecord = {
      project_id: projectId,
      rfi_number: rfiNum,
      title: rfiTitle.trim(),
      discipline: discipline.trim(),
      location_grid: locationGrid.trim(),
      drawing_reference: drawingRef.trim(),
      specification_clause: specClause.trim() || 'CPWD / IS 456 Specifications',
      contractor_entity: contractor.trim() || 'Principal Contractor',
      question_text: questionText.trim(),
      suggested_solution: suggestedSolution.trim() || null,
      priority,
      status: 'OPEN',
      cost_impact: costImpact,
      schedule_impact: scheduleImpact,
      potential_variation_inr: parseFloat(potentialVariation) || 0,
      potential_delay_days: parseFloat(potentialDelay) || 0,
      sla_target_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      assigned_consultant: 'Resident SEOR',
    };

    try {
      const { data, error } = await (supabase as any)
        .from('requests_for_information')
        .insert([newDbRecord])
        .select()
        .single();

      if (error) throw error;

      setModalOpen(false);
      setRfiTitle('');
      setLocationGrid('');
      setDrawingRef('');
      setSpecClause('');
      setContractor('');
      setQuestionText('');
      setSuggestedSolution('');
      setPotentialVariation('');
      setPotentialDelay('');
      await loadRfis();
      if (data) setSelectedRfi(data);
    } catch (err: any) {
      setFeedbackMessage(err.message || 'Failed to submit RFI.');
      setTimeout(() => setFeedbackMessage(null), 4000);
    } finally {
      setActionInProgress(null);
    }
  };

  // Printable CPWD / FIDIC RFI Dossier
  const handlePrintRfi = (rfi: RfiRecord) => {
    const printWin = window.open('', '_blank', 'width=1000,height=900');
    if (!printWin) return;

    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Request for Information — ${rfi.rfi_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 32px; color: #09090b; font-size: 11px; line-height: 1.5; }
    .header { border-bottom: 2px solid #09090b; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
    .title { font-size: 20px; font-weight: 800; margin: 0; }
    .meta { font-size: 11px; font-family: monospace; color: #52525b; margin-top: 4px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 10px; }
    .critical { background: #fee2e2; color: #b91c1c; border: 1px solid #ef4444; }
    .answered { background: #dcfce7; color: #15803d; border: 1px solid #22c55e; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; }
    th, td { border: 1px solid #cbd5e1; padding: 7px 10px; text-align: left; }
    th { background: #f8fafc; font-size: 10px; text-transform: uppercase; }
    .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px; margin-top: 14px; background: #fafafa; }
    .footer { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 54px; border-top: 1px solid #cbd5e1; padding-top: 16px; }
    .sig { border-top: 1px dashed #09090b; padding-top: 4px; margin-top: 40px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #0284c7;">Quadillar LiveView · FIDIC Cl. 1.9 / CPWD Section 2</div>
      <h1 class="title">Request for Information &amp; Technical Instruction (RFI)</h1>
      <div class="meta">RFI Number: ${rfi.rfi_number} · Project: ${projectName} (${projectId})</div>
    </div>
    <span class="badge ${rfi.status === 'ANSWERED' || rfi.status === 'CLOSED_CONCURRED' ? 'answered' : 'critical'}">
      ${rfi.status.replace(/_/g, ' ')}
    </span>
  </div>

  <table>
    <tr><th>Executing Contractor</th><td><strong>${rfi.contractor_entity}</strong></td><th>Technical Discipline</th><td>${rfi.discipline}</td></tr>
    <tr><th>Structural / Room Grid</th><td><strong>${rfi.location_grid}</strong></td><th>Target Drawing Reference</th><td><strong>${rfi.drawing_reference}</strong></td></tr>
    <tr><th>Specification Clause</th><td>${rfi.specification_clause || 'Standard CPWD / IS Codes'}</td><th>Assigned Consultant</th><td><strong>${rfi.assigned_consultant}</strong></td></tr>
    <tr><th>SLA Response Target Date</th><td><strong>${rfi.sla_target_date}</strong></td><th>Priority Ranking</th><td><strong>${rfi.priority.replace(/_/g, ' ')}</strong></td></tr>
  </table>

  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Factual Technical Query / Clashing Ambiguity</div>
    <div>${rfi.question_text}</div>
  </div>

  ${rfi.suggested_solution ? `
  <div class="box">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: #475569; margin-bottom: 4px;">Proposed Contractor Resolution</div>
    <div>${rfi.suggested_solution}</div>
  </div>` : ''}

  <div class="box" style="background: ${rfi.response_text ? '#f0fdf4' : '#fef2f2'}; border-color: ${rfi.response_text ? '#86efac' : '#fca5a5'};">
    <div style="font-weight: bold; text-transform: uppercase; font-size: 10px; color: ${rfi.response_text ? '#166534' : '#991b1b'}; margin-bottom: 4px;">
      Official Consultant Technical Determination / Instruction
    </div>
    <div style="font-size: 12px; font-weight: 500;">
      ${rfi.response_text || 'Awaiting formal engineering determination from assigned consultant.'}
    </div>
    ${rfi.response_date ? `<div style="margin-top: 6px; font-size: 10px; color: #64748b;">Issued on ${rfi.response_date} by ${rfi.responded_by || rfi.assigned_consultant}</div>` : ''}
  </div>

  <div class="footer">
    <div>
      <div>Subcontractor Lead Engineer</div>
      <div style="color: #64748b;">${rfi.contractor_entity}</div>
      <div class="sig">Contractor Originator Sign</div>
    </div>
    <div>
      <div>Resident SEOR / Principal Architect</div>
      <div style="color: #64748b;">${rfi.responded_by || rfi.assigned_consultant}</div>
      <div class="sig">Engineering Determination Seal</div>
    </div>
    <div>
      <div>PMC Project Director</div>
      <div style="color: #64748b;">Variation &amp; Schedule impact verified.</div>
      <div class="sig">Client Acknowledgment</div>
    </div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  const isAnswered = selectedRfi ? selectedRfi.status === 'ANSWERED' || selectedRfi.status === 'CLOSED_CONCURRED' : false;
  const isOverdue = selectedRfi
    ? (selectedRfi.status === 'OPEN' || selectedRfi.status === 'UNDER_REVIEW') &&
    selectedRfi.sla_target_date < new Date().toISOString().slice(0, 10)
    : false;

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8 font-mono">
      <div className="mx-auto max-w-[1650px] space-y-6">

        {/* TOP TITLE BAR */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] tracking-widest text-cyan-400 uppercase font-bold">
              <span>Engineering Governance · FIDIC Cl. 1.9 / CPWD Section 2</span>
              <StatutoryInfo
                standardRef="FIDIC CL. 1.9 / CPWD SEC. 2"
                title="Requests for Information & Design Instructions"
                idealRange="SLA: <= 7 Calendar Days"
                description="Contractors must give notice to the Engineer whenever the Works are likely to be delayed if any necessary drawing or instruction is not issued within a reasonable time. Unanswered queries directly substantiate Extension of Time (EOT) claims."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              Requests for Information (RFI) &amp; Design Instructions
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans max-w-2xl">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Architectural clash escalation, SEOR engineering determinations, and automated statutory delay links.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {selectedRfi && (
              <button
                type="button"
                onClick={() => handlePrintRfi(selectedRfi)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print RFI Sheet</span>
              </button>
            )}
            <Link
              href="/site/dpr"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition"
            >
              <Clock className="w-3.5 h-3.5 text-rose-400" />
              <span>Hindrance EOT</span>
            </Link>
            <button
              type="button"
              onClick={() => void loadRfis()}
              className="p-1.5 rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-md shadow-cyan-950/50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Technical RFI</span>
            </button>
          </div>
        </header>

        {/* FEEDBACK BANNER */}
        {feedbackMessage && (
          <div className="p-3 rounded bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* 4 PRIMARY METRIC GAUGES (STRICT ZERO-STATE) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 text-xs">
          <div className="border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] uppercase">Total RFIs Recorded</span>
              <FileQuestion className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold text-white mt-1">
              {summary.totalCount} Queries
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Contractual FIDIC Cl. 1.9 register</span>
          </div>

          <div className="border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] uppercase">Pending Clarification</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400 mt-1">
              {summary.openCount} Under Review
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Awaiting consultant determination</span>
          </div>

          <div className="border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] uppercase flex items-center">
                Critical Pour Blockers
                <StatutoryInfo
                  standardRef="POUR CARD HOLD-GATE"
                  title="Critical Path Execution Gate"
                  idealRange="0 Unresolved Blockers"
                  description="RFIs marked Critical Blocker freeze downstream Pour Cards (IS 456) in that structural grid until the SEOR formal determination is issued."
                />
              </span>
              <Flame className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-bold mt-1 ${summary.criticalCount > 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
              {summary.criticalCount} Critical
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Locks ready-mix concrete discharge</span>
          </div>

          <div className="border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-[10px] uppercase">Overdue SLA Breaches</span>
              <AlertOctagon className="w-4 h-4 text-rose-400" />
            </div>
            <div className={`text-2xl font-bold mt-1 ${summary.overdueCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {summary.overdueCount > 0 ? `${summary.overdueCount} Breached` : 'Zero Delays'}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Directly feeds Hindrance EOT claims</span>
          </div>
        </div>

        {/* SLA BREACH CALLOUT BANNER */}
        {summary.overdueCount > 0 && (
          <div className="p-4 bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200 uppercase tracking-wider block font-bold">
                  FIDIC Clause 1.9 SLA Breach: Delayed Drawings / Instructions
                </strong>
                <span className="text-rose-300/80 font-sans">
                  {summary.overdueCount} RFIs have breached their 7-day contractual SLA. Escalate to log delay events in the Hindrance Register.
                </span>
              </div>
            </div>
            <Link
              href="/site/dpr"
              className="px-3 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 transition font-mono uppercase"
            >
              Open Hindrance Register
            </Link>
          </div>
        )}

        {/* TOOLBAR: SEARCH & FILTERS */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto">
            {[
              { key: 'ALL', label: `All RFIs (${rfis.length})` },
              { key: 'OPEN', label: 'Open' },
              { key: 'ANSWERED', label: 'Answered' },
              { key: 'CLOSED_CONCURRED', label: 'Closed' },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setFilterStatus(tab.key)}
                className={`px-3 py-1.5 rounded font-bold whitespace-nowrap transition ${filterStatus === tab.key
                    ? 'bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-950/50'
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="rounded border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-zinc-200 outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="CRITICAL_BLOCKER">Critical Blocker</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-2 text-zinc-500" />
              <input
                type="text"
                placeholder="Search RFI, drawing..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded border border-zinc-800 bg-zinc-900 text-white text-xs outline-none"
              />
            </div>
          </div>
        </div>

        {/* 2-COLUMN WORKBENCH: RFI ROSTER (7 cols) vs TECHNICAL DETERMINATION DESK (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">

          {/* LEFT: RFI REGISTRY (7 cols) */}
          <div className="lg:col-span-7 border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                  Technical Clarification Ledger
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">RFI Inward &amp; Review Schedule</h2>
              </div>
              <span className="text-zinc-500">{filteredRfis.length} Queries</span>
            </div>

            {filteredRfis.length === 0 ? (
              <div className="p-12 text-center border border-zinc-850 bg-zinc-950 text-xs">
                <FileQuestion className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <div className="text-zinc-400 font-bold uppercase">Zero Technical RFIs Logged</div>
                <p className="text-[11px] text-zinc-600 mt-1 max-w-sm mx-auto font-sans">
                  The query register is currently empty. Click &quot;Log Technical RFI&quot; above to submit an architectural clash or design clarification.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredRfis.map((rfi) => {
                  const isSelected = selectedRfi?.id === rfi.id;
                  const isCritical = rfi.priority === 'CRITICAL_BLOCKER';
                  const isItemAnswered = rfi.status === 'ANSWERED' || rfi.status === 'CLOSED_CONCURRED';
                  const itemOverdue =
                    (rfi.status === 'OPEN' || rfi.status === 'UNDER_REVIEW') &&
                    rfi.sla_target_date < new Date().toISOString().slice(0, 10);

                  return (
                    <div
                      key={rfi.id}
                      onClick={() => setSelectedRfi(rfi)}
                      className={`rounded border p-4 transition cursor-pointer space-y-2.5 ${isSelected
                          ? 'border-cyan-500/60 bg-cyan-950/20 shadow-lg shadow-cyan-950/30'
                          : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                        }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{rfi.rfi_number}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isCritical
                                ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                                : rfi.priority === 'HIGH'
                                  ? 'bg-amber-950 text-amber-400 border border-amber-800/50'
                                  : 'bg-zinc-800 text-zinc-300'
                              }`}
                          >
                            {rfi.priority.replace(/_/g, ' ')}
                          </span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${isItemAnswered
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                                : itemOverdue
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                                  : 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                              }`}
                          >
                            {rfi.status.replace(/_/g, ' ')}
                          </span>
                        </div>

                        <span className={`font-bold ${itemOverdue ? 'text-rose-400' : 'text-zinc-400'}`}>
                          SLA: {rfi.sla_target_date} {itemOverdue && '[BREACHED]'}
                        </span>
                      </div>

                      <div>
                        <div className="font-bold text-white">{rfi.title}</div>
                        <div className="text-zinc-400 mt-0.5 line-clamp-2 font-sans">{rfi.question_text}</div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-2 border-t border-zinc-850">
                        <span>Ref: <strong className="text-zinc-300">{rfi.drawing_reference}</strong></span>
                        <span>Grid: <strong className="text-zinc-300">{rfi.location_grid}</strong></span>
                        <span>Discipline: <strong className="text-cyan-300">{rfi.discipline}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: TECHNICAL DETERMINATION AUDIT DESK (5 cols) */}
          <div className="lg:col-span-5 border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
            {selectedRfi ? (
              <div className="space-y-4">
                <div className="border-b border-zinc-800 pb-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                      Technical Determination Desk
                    </span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedRfi.rfi_number}</h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${isAnswered
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/50'
                        : isOverdue
                          ? 'bg-rose-950 text-rose-400 border border-rose-800/50'
                          : 'bg-cyan-950 text-cyan-400 border border-cyan-800/50'
                      }`}
                  >
                    {selectedRfi.status.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-850 space-y-2 text-xs">
                  <div>
                    <span className="text-zinc-500 text-[10px] uppercase block">Subject</span>
                    <strong className="text-white block mt-0.5 font-sans">{selectedRfi.title}</strong>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-850 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block">Drawing Reference</span>
                      <span className="text-cyan-300 font-bold">{selectedRfi.drawing_reference}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Location Grid</span>
                      <span className="text-zinc-200">{selectedRfi.location_grid}</span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-850">
                    <span className="text-zinc-500 text-[10px] uppercase block">Query Text</span>
                    <p className="text-zinc-200 font-sans mt-0.5 leading-relaxed">{selectedRfi.question_text}</p>
                  </div>

                  {selectedRfi.suggested_solution && (
                    <div className="pt-2 border-t border-zinc-850">
                      <span className="text-zinc-500 text-[10px] uppercase block">Contractor Proposed Solution</span>
                      <p className="text-zinc-300 font-sans mt-0.5 leading-relaxed">{selectedRfi.suggested_solution}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-850 text-[11px]">
                    <div>
                      <span className="text-zinc-500 block">Assigned Consultant</span>
                      <span className="text-white font-bold">{selectedRfi.assigned_consultant}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Target SLA Date</span>
                      <span className={isOverdue ? 'text-rose-400 font-bold' : 'text-zinc-200'}>
                        {selectedRfi.sla_target_date}
                      </span>
                    </div>
                  </div>
                </div>

                {/* OFFICIAL CONSULTANT DETERMINATION BOX */}
                {selectedRfi.response_text ? (
                  <div className="p-3 bg-emerald-950/30 border border-emerald-800/50 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-emerald-400 font-bold">
                      <span>Official Engineering Determination</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <p className="text-zinc-200 font-sans leading-relaxed pt-1">
                      {selectedRfi.response_text}
                    </p>
                    <div className="text-[10px] text-zinc-400 pt-1 border-t border-emerald-900/60">
                      Issued by {selectedRfi.responded_by || selectedRfi.assigned_consultant} on {selectedRfi.response_date}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-zinc-400 text-xs">
                      Issue Consultant Determination (SEOR / Architect):
                    </label>
                    <textarea
                      rows={3}
                      value={responseText}
                      onChange={(e) => setResponseText(e.target.value)}
                      placeholder="Provide definitive engineering instruction, sketch reference, or approved deviation..."
                      className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-white text-xs outline-none font-sans resize-none"
                    />
                    <button
                      type="button"
                      disabled={!responseText.trim() || actionInProgress === `answer_${selectedRfi.id}`}
                      onClick={handleAnswerRfi}
                      className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs uppercase transition flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Issue Official Determination</span>
                    </button>
                  </div>
                )}

                {/* STATUTORY CROSS-MODULE BRIDGES */}
                <div className="space-y-2 pt-2 border-t border-zinc-800">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                    Statutory Interlock Actions:
                  </span>

                  {/* Bridge 1: Escalate to Hindrance Register */}
                  {!selectedRfi.linked_hindrance_number ? (
                    <button
                      type="button"
                      disabled={actionInProgress === `hindrance_${selectedRfi.id}`}
                      onClick={() => handleEscalateToHindrance(selectedRfi)}
                      className="w-full py-2 bg-rose-950/30 hover:bg-rose-950/50 text-rose-400 border border-rose-800/50 text-xs font-bold uppercase transition flex items-center justify-center gap-1.5"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Log Delay in Hindrance Register (EOT)</span>
                    </button>
                  ) : (
                    <div className="p-2.5 bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center justify-between">
                      <span>Linked Hindrance: {selectedRfi.linked_hindrance_number}</span>
                      <Link href="/site/dpr" className="text-[10px] text-rose-400 underline">
                        View in DPR &rarr;
                      </Link>
                    </div>
                  )}

                  {/* Bridge 2: Promote to Potential Change Order (PCO) */}
                  {selectedRfi.cost_impact && !selectedRfi.linked_variation_number && (
                    <button
                      type="button"
                      disabled={actionInProgress === `variation_${selectedRfi.id}`}
                      onClick={() => handlePromoteToVariation(selectedRfi)}
                      className="w-full py-2 bg-cyan-950/30 hover:bg-cyan-950/50 text-cyan-400 border border-cyan-800/50 text-xs font-bold uppercase transition flex items-center justify-center gap-1.5"
                    >
                      <Coins className="w-3.5 h-3.5" />
                      <span>Promote to Change Order (PCO)</span>
                    </button>
                  )}

                  {selectedRfi.linked_variation_number && (
                    <div className="p-2.5 bg-cyan-950/40 border border-cyan-800/50 text-cyan-300 text-xs flex items-center justify-between">
                      <span>Linked Change Order: {selectedRfi.linked_variation_number}</span>
                      <Link href="/finance/change-orders" className="text-[10px] text-cyan-400 underline">
                        View in PCO Ledger &rarr;
                      </Link>
                    </div>
                  )}

                  {/* Concurrence Final Button */}
                  {selectedRfi.status === 'ANSWERED' && (
                    <button
                      type="button"
                      disabled={actionInProgress === selectedRfi.id}
                      onClick={() => handleCloseRfi(selectedRfi.id)}
                      className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase transition flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Close RFI &bull; Contractor Concurred</span>
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-16 text-center text-zinc-600">
                Select an active RFI from the left or log a new query to open the determination desk.
              </div>
            )}
          </div>

        </div>

        {/* LOG NEW RFI MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-lg border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs flex items-center gap-2">
                  <FileQuestion className="w-4 h-4 text-cyan-400" />
                  <span>Log Request for Information (RFI)</span>
                </span>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="text-zinc-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRfi} className="space-y-2.5 text-xs">
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-0.5">RFI Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Beam reinforcement clash with plumbing sleeves"
                    value={rfiTitle}
                    onChange={(e) => setRfiTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-0.5">Discipline</label>
                    <select
                      value={discipline}
                      onChange={(e) => setDiscipline(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white outline-none"
                    >
                      <option value="Structural / Civil">Structural / Civil</option>
                      <option value="MEP / Plumbing">MEP / Plumbing</option>
                      <option value="MEP / Electrical">MEP / Electrical</option>
                      <option value="HVAC / Chilled Water">HVAC / Chilled Water</option>
                      <option value="Architectural Finishes">Architectural Finishes</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-0.5">Priority</label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as RfiPriority)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white outline-none"
                    >
                      <option value="CRITICAL_BLOCKER">Critical Blocker (Stops Work)</option>
                      <option value="HIGH">High Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="LOW">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-0.5">Location Grid *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Axis C2-D4 / Level 08"
                      value={locationGrid}
                      onChange={(e) => setLocationGrid(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-0.5">Drawing Reference *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. GFC-STR-LVL08-REV03"
                      value={drawingRef}
                      onChange={(e) => setDrawingRef(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-0.5">Contractor Entity</label>
                    <input
                      type="text"
                      placeholder="e.g. Principal Contractor"
                      value={contractor}
                      onChange={(e) => setContractor(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 text-[10px] uppercase mb-0.5">Spec Clause</label>
                    <input
                      type="text"
                      placeholder="e.g. IS 456 Cl. 26.4"
                      value={specClause}
                      onChange={(e) => setSpecClause(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-0.5">Factual Query / Ambiguity *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe the clash or lack of design clarity on site..."
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white outline-none resize-none font-sans"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-0.5">Contractor Suggested Solution</label>
                  <textarea
                    rows={2}
                    placeholder="Proposed engineering workaround or sleeve relocation..."
                    value={suggestedSolution}
                    onChange={(e) => setSuggestedSolution(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white outline-none resize-none font-sans"
                  />
                </div>

                {/* IMPACT TOGGLES */}
                <div className="grid grid-cols-2 gap-2 p-2.5 bg-zinc-900/60 border border-zinc-800 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
                    <input
                      type="checkbox"
                      checked={costImpact}
                      onChange={(e) => setCostImpact(e.target.checked)}
                      className="accent-cyan-500"
                    />
                    <span>Potential Cost Impact</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-zinc-200">
                    <input
                      type="checkbox"
                      checked={scheduleImpact}
                      onChange={(e) => setScheduleImpact(e.target.checked)}
                      className="accent-rose-500"
                    />
                    <span>Schedule Impact (EOT)</span>
                  </label>
                </div>

                {(costImpact || scheduleImpact) && (
                  <div className="grid grid-cols-2 gap-2">
                    {costImpact && (
                      <div>
                        <label className="block text-zinc-400 text-[10px] uppercase mb-0.5">Estimated Cost (₹)</label>
                        <input
                          type="number"
                          placeholder="0.00"
                          value={potentialVariation}
                          onChange={(e) => setPotentialVariation(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-amber-400 font-bold outline-none"
                        />
                      </div>
                    )}
                    {scheduleImpact && (
                      <div>
                        <label className="block text-zinc-400 text-[10px] uppercase mb-0.5">Estimated Delay (Days)</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={potentialDelay}
                          onChange={(e) => setPotentialDelay(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1 text-rose-400 font-bold outline-none"
                        />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-3.5 py-1.5 text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={actionInProgress === 'creating_rfi'}
                    className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase text-xs transition"
                  >
                    Submit Technical Query
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}