import fs from 'fs';
import path from 'path';

console.log("Starting Sprint 7 Project Controls & EVM Surgery...");

// --------------------------------------------------------------------------
// 1. Scrubbed app/schedule/gantt/page.tsx
// --------------------------------------------------------------------------
const ganttCode = `'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface ScheduleTask {
  id: string;
  project_id: string;
  task_code: string;
  task_name: string;
  wbs_code: string;
  start_date: string;
  end_date: string;
  duration_days: number;
  progress_pct: number;
  total_float_days: number;
  is_critical_path: boolean;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DELAYED_HOLD';
}

export default function MasterGanttPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || 'proj-1';
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [tasks, setTasks] = useState<ScheduleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Task Form State
  const [name, setName] = useState('');
  const [wbs, setWbs] = useState('WBS-01');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [progress, setProgress] = useState('0');
  const [floatDays, setFloatDays] = useState('0');

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('project_schedule_tasks')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTasks(data || []);
    } catch (err: any) {
      console.error('Failed to load schedule tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const summary = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter((t) => Number(t.progress_pct) === 100).length;
    const critical = tasks.filter((t) => t.is_critical_path || Number(t.total_float_days) === 0).length;
    const overallProgress = total > 0
      ? Math.round(tasks.reduce((sum, t) => sum + Number(t.progress_pct || 0), 0) / total)
      : 0;

    return { total, completed, critical, overallProgress };
  }, [tasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !startDate || !endDate) return;

    setSubmitting(true);
    const code = \`TSK-\${(tasks.length + 1).toString().padStart(3, '0')}\`;
    const fDays = parseInt(floatDays, 10) || 0;
    const prog = parseFloat(progress) || 0;

    const payload = {
      project_id: projectId,
      task_code: code,
      task_name: name.trim(),
      wbs_code: wbs.trim(),
      start_date: startDate,
      end_date: endDate,
      progress_pct: prog,
      total_float_days: fDays,
      is_critical_path: fDays === 0,
      status: prog === 100 ? 'COMPLETED' : prog > 0 ? 'IN_PROGRESS' : 'NOT_STARTED',
    };

    try {
      const { error } = await (supabase as any).from('project_schedule_tasks').insert([payload]);
      if (error) throw error;

      setModalOpen(false);
      setName('');
      setStartDate('');
      setEndDate('');
      setProgress('0');
      setFloatDays('0');
      setFeedback(\`Schedule activity \${code} committed to CPM baseline.\`);
      setTimeout(() => setFeedback(null), 3500);
      await loadTasks();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to schedule task.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 p-6 md:p-8 text-zinc-100 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold mb-1 flex items-center">
              TIME CONTROL DESK • FIDIC CLAUSE 8.3 PROGRAMME / CPWD CLAUSE 5
              <StatutoryInfo
                standardRef="FIDIC CL. 8.3 / CPWD CL. 5"
                title="Critical Path Method (CPM) Baseline"
                idealRange="Critical Float = 0 Days"
                description="Governs the master construction programme. Critical path activities have zero total float; any delay immediately shifts the contractual Taking-Over Certificate (TOC) milestone unless mitigated via concurrent float absorption."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100">
              Master Schedule &amp; CPM Gantt Console
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Baseline time-scaled network tracking, dependency sequencing, and critical path governance.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadTasks()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Schedule CPM Activity</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 SUMMARY METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Cumulative Progress</span>
            <div className="text-2xl font-bold text-white mt-1">{summary.overallProgress}%</div>
            <div className="text-[10px] text-zinc-500 mt-1">{summary.completed} of {summary.total} activities completed</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Critical Path (0 Float)</span>
            <div className={\`text-2xl font-bold mt-1 \${summary.critical > 0 ? "text-rose-400" : "text-emerald-400"}\`}>
              {summary.critical} Tasks
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">Drives contractual completion date</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Schedule Status</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">Active Baseline</div>
            <div className="text-[10px] text-zinc-500 mt-1">FIDIC Clause 8.3 Conforming</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Milestones Cleared</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{summary.completed} / {summary.total}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Certified work items</div>
          </div>
        </div>

        {/* TIME-SCALED ACTIVITY LEDGER */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase text-xs">CPM Network Activities ({tasks.length})</span>
            <span className="text-zinc-500 text-[10px]">Zero Float = Critical Path</span>
          </div>

          {tasks.length === 0 ? (
            <div className="py-16 text-center text-zinc-500 space-y-2 border border-zinc-850 bg-zinc-950">
              <Calendar className="w-8 h-8 mx-auto text-zinc-600 mb-2" />
              <div className="text-zinc-300 font-bold uppercase text-xs">Zero CPM Schedule Activities Logged</div>
              <p className="text-[11px] text-zinc-500 font-sans max-w-md mx-auto">
                No active schedule network. Click &quot;Schedule CPM Activity&quot; above to log activities, start/finish dates, and float parameters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Code &amp; WBS</th>
                    <th className="p-3">Activity Description</th>
                    <th className="p-3 text-right">Start Date</th>
                    <th className="p-3 text-right">Finish Date</th>
                    <th className="p-3 text-right">Duration</th>
                    <th className="p-3 text-right">Total Float</th>
                    <th className="p-3 text-center">Path Class</th>
                    <th className="p-3 text-right">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {tasks.map((t) => {
                    const isCritical = t.is_critical_path || Number(t.total_float_days) === 0;

                    return (
                      <tr key={t.id} className="hover:bg-zinc-900/50 transition">
                        <td className="p-3">
                          <span className="text-white font-bold block">{t.task_code}</span>
                          <span className="text-[10px] text-cyan-400 font-mono">{t.wbs_code}</span>
                        </td>
                        <td className="p-3 text-zinc-200 font-sans font-medium">{t.task_name}</td>
                        <td className="p-3 text-right text-zinc-400">{t.start_date}</td>
                        <td className="p-3 text-right text-zinc-400">{t.end_date}</td>
                        <td className="p-3 text-right font-bold text-zinc-200">{t.duration_days} Days</td>
                        <td className="p-3 text-right font-bold">
                          <span className={isCritical ? 'text-rose-400' : 'text-emerald-400'}>
                            {t.total_float_days} Days
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className={\`px-2 py-0.5 rounded text-[9px] font-bold uppercase \${
                            isCritical
                              ? 'bg-rose-950 text-rose-400 border border-rose-800'
                              : 'bg-zinc-800 text-zinc-300'
                          }\`}>
                            {isCritical ? 'CRITICAL (0 FLOAT)' : 'FLOAT ABSORBABLE'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-bold text-white">
                          {Number(t.progress_pct).toFixed(0)}%
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
              <span className="font-bold text-white uppercase text-xs">Schedule CPM Activity</span>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Activity Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Level 4 Shear Wall Reinforcement &amp; Formwork"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">WBS Code</label>
                <input
                  type="text"
                  placeholder="e.g. WBS-2.1.4"
                  value={wbs}
                  onChange={(e) => setWbs(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Total Float (Days)</label>
                  <input
                    type="number"
                    value={floatDays}
                    onChange={(e) => setFloatDays(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Progress (%)</label>
                  <input
                    type="number"
                    value={progress}
                    onChange={(e) => setProgress(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                  Commit to CPM Network
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

fs.writeFileSync("app/schedule/gantt/page.tsx", ganttCode, "utf8");
console.log("✓ Re-written app/schedule/gantt/page.tsx with pure zero-data CPM Gantt console.");

// --------------------------------------------------------------------------
// 2. Scrubbed app/executive/evm-scurve/page.tsx
// --------------------------------------------------------------------------
const evmCode = `'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  Award,
  TrendingUp,
  Clock,
  Printer,
  FileSpreadsheet,
  Plus,
  RefreshCw,
  CheckCircle2,
  X,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface MonthlyEvmDataPoint {
  id?: string;
  month_sequence: number;
  month: string;
  pv_cumulative_inr: number;
  ev_cumulative_inr: number;
  ac_cumulative_inr: number;
}

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return \`₹\${(val / 10000000).toFixed(2)} Cr\`;
  if (Math.abs(val) >= 100000) return \`₹\${(val / 100000).toFixed(2)} Lakh\`;
  return \`₹\${Math.round(val || 0).toLocaleString('en-IN')}\`;
}

export default function CanonicalEvmScurvePage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || 'proj-1';
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [dataPoints, setDataPoints] = useState<MonthlyEvmDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [monthLabel, setMonthLabel] = useState('');
  const [pvVal, setPvVal] = useState('');
  const [evVal, setEvVal] = useState('');
  const [acVal, setAcVal] = useState('');

  const bacValue = Number((project as any)?.contract_value || 450000000);

  const loadEvmData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('project_evm_monthly_logs')
        .select('*')
        .eq('project_id', projectId)
        .order('month_sequence', { ascending: true });

      if (error) throw error;
      const list = data || [];
      setDataPoints(list);
      if (list.length > 0) setSelectedMonthIndex(list.length - 1);
    } catch (err: any) {
      console.error('Failed to load EVM data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadEvmData();
  }, [loadEvmData]);

  const currentPoint = dataPoints[selectedMonthIndex] || (dataPoints.length > 0 ? dataPoints[0] : null);

  const metrics = useMemo(() => {
    if (!currentPoint) {
      return {
        pv: 0,
        ev: 0,
        ac: 0,
        cv: 0,
        sv: 0,
        cpi: 1.0,
        spi: 1.0,
        eac: bacValue,
        vac: 0,
        tcpi: 1.0,
      };
    }

    const pv = Number(currentPoint.pv_cumulative_inr || 0);
    const ev = Number(currentPoint.ev_cumulative_inr || 0);
    const ac = Number(currentPoint.ac_cumulative_inr || 0);

    const cv = ev - ac;
    const sv = ev - pv;
    const cpi = ac > 0 ? ev / ac : 1.0;
    const spi = pv > 0 ? ev / pv : 1.0;

    const eac = cpi > 0 ? bacValue / cpi : bacValue;
    const vac = bacValue - eac;
    const unearned = bacValue - ev;
    const unspent = bacValue - ac;
    const tcpi = unspent > 0 ? unearned / unspent : 1.0;

    return {
      pv,
      ev,
      ac,
      cv,
      sv,
      cpi: Number(cpi.toFixed(2)),
      spi: Number(spi.toFixed(2)),
      eac: Math.round(eac),
      vac: Math.round(vac),
      tcpi: Number(tcpi.toFixed(2)),
    };
  }, [currentPoint, bacValue]);

  const handleCreateEvmLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!monthLabel.trim()) return;

    setSubmitting(true);
    const nextSeq = dataPoints.length + 1;
    const payload = {
      project_id: projectId,
      month_sequence: nextSeq,
      month: monthLabel.trim(),
      pv_cumulative_inr: parseFloat(pvVal) || 0,
      ev_cumulative_inr: parseFloat(evVal) || 0,
      ac_cumulative_inr: parseFloat(acVal) || 0,
    };

    try {
      const { error } = await (supabase as any).from('project_evm_monthly_logs').insert([payload]);
      if (error) throw error;

      setModalOpen(false);
      setMonthLabel('');
      setPvVal('');
      setEvVal('');
      setAcVal('');
      setFeedback('EVM progress log committed.');
      setTimeout(() => setFeedback(null), 3500);
      await loadEvmData();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to record EVM log.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              EXECUTIVE TELEMETRY • ISO 21508:2018 / FIDIC CLAUSE 8.4 S-CURVE
              <StatutoryInfo
                standardRef="ISO 21508 / FIDIC 8.4"
                title="Earned Value Management (EVM) Indicators"
                idealRange="CPI >= 1.00 • SPI >= 1.00"
                description="Integrates physical measurement with financial cost data. Schedule Performance Index (SPI = EV/PV) and Cost Performance Index (CPI = EV/AC) provide objective projections of final completion budget (EAC)."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-cyan-400" />
              <span>Earned Value (EVM) S-Curve Console</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Planned Value (PV), Earned Value (EV), Actual Cost (AC), and Estimate at Completion (EAC).
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadEvmData()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Log EVM Milestone</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 SUMMARY METRIC CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Budget at Completion (BAC)</span>
            <div className="text-2xl font-bold text-white mt-1">{formatInr(bacValue)}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Governed project baseline</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Earned Value (EV)</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{formatInr(metrics.ev)}</div>
            <div className="text-[10px] text-zinc-500 mt-1">Physical output measured per e-MB</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Cost Performance Index (CPI)</span>
            <div className={\`text-2xl font-bold mt-1 \${metrics.cpi >= 1.0 ? 'text-emerald-400' : 'text-rose-400'}\`}>
              {metrics.cpi}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">CV: {formatInr(metrics.cv)}</div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Schedule Index (SPI)</span>
            <div className={\`text-2xl font-bold mt-1 \${metrics.spi >= 1.0 ? 'text-emerald-400' : 'text-amber-400'}\`}>
              {metrics.spi}
            </div>
            <div className="text-[10px] text-zinc-500 mt-1">SV: {formatInr(metrics.sv)}</div>
          </div>
        </div>

        {/* 2-COLUMN VIEWPORT */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <div className="border-b border-zinc-800 pb-2 flex justify-between items-center">
              <span className="font-bold text-white uppercase">ISO 21508 Predictive Forecasts</span>
              <span className="text-zinc-500 text-[10px]">{currentPoint?.month || 'Zero Logs'}</span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-zinc-950 border border-zinc-850 flex justify-between items-center">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Estimate at Completion (EAC = BAC / CPI)</span>
                  <strong className="text-white text-base">{formatInr(metrics.eac)}</strong>
                </div>
                <span className="text-[10px] text-zinc-500">Projected Final Cost</span>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-850 flex justify-between items-center">
                <div>
                  <span className="text-zinc-500 block text-[10px]">Variance at Completion (VAC = BAC - EAC)</span>
                  <strong className={\`text-base \${metrics.vac >= 0 ? 'text-emerald-400' : 'text-rose-400'}\`}>
                    {formatInr(metrics.vac)}
                  </strong>
                </div>
                <span className="text-[10px] text-zinc-500">{metrics.vac >= 0 ? 'Cost Saving' : 'Cost Overrun'}</span>
              </div>

              <div className="p-3 bg-zinc-950 border border-zinc-850 flex justify-between items-center">
                <div>
                  <span className="text-zinc-500 block text-[10px]">To-Complete Performance Index (TCPI)</span>
                  <strong className="text-white text-base">{metrics.tcpi}</strong>
                </div>
                <span className="text-[10px] text-zinc-500">Efficiency Required</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
            <div className="border-b border-zinc-800 pb-2 flex justify-between items-center">
              <span className="font-bold text-white uppercase">EVM Milestone History ({dataPoints.length})</span>
            </div>

            {dataPoints.length === 0 ? (
              <div className="p-12 text-center border border-zinc-850 bg-zinc-950 text-zinc-500">
                Zero EVM monthly logs. Click &quot;Log EVM Milestone&quot; to start S-Curve tracking.
              </div>
            ) : (
              <div className="overflow-x-auto border border-zinc-800 text-xs">
                <table className="w-full text-left">
                  <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                    <tr>
                      <th className="p-3">Month</th>
                      <th className="p-3 text-right">Planned (PV)</th>
                      <th className="p-3 text-right">Earned (EV)</th>
                      <th className="p-3 text-right">Actual (AC)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                    {dataPoints.map((dp, idx) => (
                      <tr
                        key={dp.month}
                        onClick={() => setSelectedMonthIndex(idx)}
                        className={\`cursor-pointer transition \${selectedMonthIndex === idx ? 'bg-cyan-950/30 text-white font-bold' : 'hover:bg-zinc-900/30'}\`}
                      >
                        <td className="p-3">{dp.month}</td>
                        <td className="p-3 text-right text-cyan-400">{formatInr(Number(dp.pv_cumulative_inr))}</td>
                        <td className="p-3 text-right text-emerald-400">{formatInr(Number(dp.ev_cumulative_inr))}</td>
                        <td className="p-3 text-right text-amber-400">{formatInr(Number(dp.ac_cumulative_inr))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs">Log Monthly EVM Progress</span>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateEvmLog} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Month Period *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. May 2026"
                  value={monthLabel}
                  onChange={(e) => setMonthLabel(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Cumulative Planned Value (PV in ₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={pvVal}
                  onChange={(e) => setPvVal(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-cyan-400 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Cumulative Earned Value (EV in ₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={evVal}
                  onChange={(e) => setEvVal(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-emerald-400 font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Cumulative Actual Cost (AC in ₹) *</label>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  value={acVal}
                  onChange={(e) => setAcVal(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-amber-400 font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                  Commit S-Curve Point
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

fs.writeFileSync("app/executive/evm-scurve/page.tsx", evmCode, "utf8");
console.log("✓ Re-written app/executive/evm-scurve/page.tsx with pure zero-data EVM analytics.");

// --------------------------------------------------------------------------
// 3. Scrubbed app/milestones/page.tsx
// --------------------------------------------------------------------------
const originalMilestones = fs.readFileSync("app/milestones/page.tsx", "utf8");

let msCleaned = originalMilestones
  .replace(/setMilestones\(\s*tier === "RESIDENTIAL"[\s\S]*?\);\s*\}/g, 'setMilestones([]);\n    }')
  .replace(/if \(loading\) \{[\s\S]*?return \([\s\S]*?LOADING GOVERNED ESCROW MILESTONES[\s\S]*?<\/div>\s*\);\s*\}/g, `
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING GOVERNED ESCROW MILESTONES &amp; HOLD-GATE PROTOCOLS...
      </div>
    );
  }
  `);

fs.writeFileSync("app/milestones/page.tsx", msCleaned, "utf8");
console.log("✓ Scrubbed app/milestones/page.tsx of mock fallback arrays.");

// --------------------------------------------------------------------------
// 4. Wire Sidebar.tsx
// --------------------------------------------------------------------------
const sidebarPath = "components/layout/Sidebar.tsx";
if (fs.existsSync(sidebarPath)) {
  let content = fs.readFileSync(sidebarPath, "utf8");

  if (!content.includes("/schedule/gantt")) {
    content = content.replace(
      /(\{\s*label:\s*["\x27]Hindrance Register & EOT["\x27][^}]*\},)/g,
      `$1\n      { label: "Master Schedule (CPM)", href: "/schedule/gantt", icon: Calendar },\n      { label: "EVM S-Curve Cashflow", href: "/executive/evm-scurve", icon: TrendingUp },\n      { label: "Governed Milestones", href: "/milestones", icon: Award },`
    );

    if (!content.includes("Calendar,")) {
      content = content.replace("Clock,", "Clock,\n  Calendar,\n  Award,");
    }
  }

  fs.writeFileSync(sidebarPath, content, "utf8");
  console.log("✓ Linked Schedule Gantt, EVM S-Curve, and Milestones in Sidebar.tsx");
}

