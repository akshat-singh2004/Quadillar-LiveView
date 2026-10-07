import fs from 'fs';
import path from 'path';

console.log("Starting Sprint 2 Codebase Surgery...");

// --------------------------------------------------------------------------
// 1. Scrubbed app/engineering/bbs/page.tsx
// --------------------------------------------------------------------------
const bbsCode = `'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Layers, Scale, TrendingDown, ShieldCheck, CheckCircle2, Plus, RefreshCw, AlertTriangle, X } from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface BbsScheduleItem {
  id: string;
  project_id: string;
  structural_element: string;
  bar_mark: string;
  dia_mm: number;
  bar_shape_type: 'Straight' | 'L-Bend' | 'Crank' | 'Stirrup';
  cutting_length_m: number;
  number_of_bars: number;
  total_cut_length_m: number;
  calculated_weight_mt: number;
  status: 'Approved for Bending' | 'Draft Detailing' | 'Excess Wastage Flag';
  scrap_rate_pct: number;
  seor_signatory_hash?: string;
}

export default function BBSPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || 'proj-1';
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [bbsItems, setBbsItems] = useState<BbsScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [element, setElement] = useState('');
  const [barMark, setBarMark] = useState('');
  const [diaMm, setDiaMm] = useState<number>(16);
  const [shape, setShape] = useState<'Straight' | 'L-Bend' | 'Crank' | 'Stirrup'>('Straight');
  const [cutLength, setCutLength] = useState('');
  const [numBars, setNumBars] = useState('');
  const [scrapRate, setScrapRate] = useState('2.0');

  const loadBbs = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('bar_bending_schedules')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBbsItems(data || []);
    } catch (err: any) {
      console.error('Failed to load BBS items:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadBbs();
  }, [loadBbs]);

  // Zero-State Computed Aggregates
  const aggregates = useMemo(() => {
    const totalRebarRequiredMt = bbsItems.reduce((sum, item) => sum + Number(item.calculated_weight_mt || 0), 0);
    const avgScrapRate = bbsItems.length > 0
      ? bbsItems.reduce((sum, item) => sum + Number(item.scrap_rate_pct || 0), 0) / bbsItems.length
      : 0;
    const procurementCostInr = Math.round(totalRebarRequiredMt * 65000);
    const approvedCount = bbsItems.filter((i) => i.status === 'Approved for Bending').length;

    return { totalRebarRequiredMt, avgScrapRate, procurementCostInr, approvedCount };
  }, [bbsItems]);

  const handleCreateBbsItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!element.trim() || !barMark.trim() || !cutLength || !numBars) return;

    setSubmitting(true);
    const scrap = parseFloat(scrapRate) || 2.0;
    const status = scrap > 3.0 ? 'Excess Wastage Flag' : 'Draft Detailing';

    const payload = {
      project_id: projectId,
      structural_element: element.trim(),
      bar_mark: barMark.trim().toUpperCase(),
      dia_mm: Number(diaMm),
      bar_shape_type: shape,
      cutting_length_m: parseFloat(cutLength),
      number_of_bars: parseInt(numBars, 10),
      scrap_rate_pct: scrap,
      status,
    };

    try {
      const { error } = await (supabase as any).from('bar_bending_schedules').insert([payload]);
      if (error) throw error;

      setModalOpen(false);
      setElement('');
      setBarMark('');
      setCutLength('');
      setNumBars('');
      setFeedback('BBS structural element scheduled successfully.');
      setTimeout(() => setFeedback(null), 3500);
      await loadBbs();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to record BBS schedule.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveBbs = async (id: string) => {
    const seorSig = \`SEOR-BBS-\${Date.now().toString(36).toUpperCase()}-IS2502\`;
    try {
      await (supabase as any)
        .from('bar_bending_schedules')
        .update({ status: 'Approved for Bending', seor_signatory_hash: seorSig })
        .eq('id', id);

      await loadBbs();
    } catch (err: any) {
      console.error('Failed to approve BBS:', err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-sans">
      <div className="grid grid-cols-12 gap-6 max-w-[1700px] mx-auto">

        {/* HEADER BAR */}
        <header className="col-span-12 bg-zinc-900 border border-zinc-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-zinc-800/50">
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
                  STRUCTURAL ENGINEERING &amp; MATERIALS
                </span>
                <span className="text-zinc-600">/</span>
                <span className="text-xs font-mono tracking-tight text-zinc-400 flex items-center">
                  IS:2502 &amp; IS:1786 REBAR SPECIFICATIONS
                  <StatutoryInfo
                    standardRef="IS 2502 / IS 1786"
                    title="BBS Bending Tolerances & Wastage"
                    idealRange="Scrap <= 3.0% (CPWD Cl. 42)"
                    description="Governs cutting length allowances, bend deductions (2d for 45 deg, 4d for 90 deg), and rebar nesting. Scrap exceeding 3% triggers an automatic contractual deduction under CPWD Clause 42."
                  />
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-100 mt-1 uppercase font-mono">
                Bar Bending Schedule (BBS) &amp; Rebar Scrap Telemetry
              </h1>
            </div>

            <div className="mt-4 md:mt-0 flex items-center gap-3 font-mono text-xs">
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase rounded flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Schedule Rebar Member</span>
              </button>
              <button
                type="button"
                onClick={() => void loadBbs()}
                className="p-1.5 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 px-5 py-2.5 text-xs text-zinc-400 bg-zinc-950/40 font-mono">
            <div className="text-left border-r border-zinc-800/50 pr-4">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Steel Grade</span>
              <span className="text-zinc-100 text-xs block truncate font-bold">Fe500D High Ductility (TMT)</span>
            </div>
            <div className="text-left md:border-r border-zinc-800/50 px-0 md:px-4">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Statutory Wastage Norm</span>
              <span className="text-emerald-400 text-xs block font-bold">CPWD Cl. 42 Max 3.0% Off-Cut</span>
            </div>
            <div className="text-left border-r border-zinc-800/50 pr-4 md:px-4 mt-2 md:mt-0">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Standard Billet Stock</span>
              <span className="text-zinc-100 text-xs block truncate">12.000m Rolling Length</span>
            </div>
            <div className="text-left px-0 md:px-4 mt-2 md:mt-0">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Approved Members</span>
              <span className="text-emerald-400 text-xs block truncate font-bold">{aggregates.approvedCount} / {bbsItems.length} Cut Lists Active</span>
            </div>
          </div>
        </header>

        {feedback && (
          <div className="col-span-12 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 font-mono">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 3 KPI CARDS */}
        <div className="col-span-12 md:col-span-4 bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400 uppercase tracking-wider font-mono">
            <span>Total Rebar Required</span>
            <Layers className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-4 text-right">
            <div className="text-3xl font-bold font-mono text-zinc-100 tabular-nums">
              {aggregates.totalRebarRequiredMt.toFixed(2)} MT
            </div>
            <span className="text-xs font-mono text-zinc-400 block mt-0.5">
              Net Bending Cut Requirement
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/50 text-xs text-zinc-400 font-mono flex items-center justify-between">
            <span>Unit Weight Formula</span>
            <span className="text-zinc-200 font-mono text-right">IS 2502: d²/162.28 kg/m</span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400 uppercase tracking-wider font-mono">
            <span>Calculated Off-Cut Scrap Rate</span>
            <TrendingDown className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <div
              className={\`text-3xl font-bold font-mono tabular-nums \${
                aggregates.avgScrapRate <= 3.0 ? "text-emerald-500" : "text-rose-500"
              }\`}
            >
              {aggregates.avgScrapRate.toFixed(1)}%
            </div>
            <span
              className={\`text-xs font-mono px-2 py-0.5 border \${
                aggregates.avgScrapRate <= 3.0
                  ? "bg-emerald-950/60 text-emerald-400 border-emerald-800"
                  : "bg-rose-950/60 text-rose-400 border-rose-800"
              }\`}
            >
              {aggregates.avgScrapRate <= 3.0 ? "Optimal (≤ 3.0%)" : "Excess Scrap (> 3.0%)"}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/50 text-xs text-zinc-400 font-mono flex items-center justify-between">
            <span>CPWD Cl. 42 Permissible Limit</span>
            <span className="text-emerald-400 font-semibold">3.0% Max Permissible</span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 bg-zinc-900 border border-zinc-800 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400 uppercase tracking-wider font-mono">
            <span>Procurement Liability @ Fe500D</span>
            <Scale className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-4 text-right">
            <div className="text-3xl font-bold font-mono text-zinc-100 tabular-nums">
              ₹ {aggregates.procurementCostInr.toLocaleString("en-IN")}
            </div>
            <span className="text-xs font-mono text-zinc-400 block mt-0.5">
              Benchmark: ₹65,000 / MT Base
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-zinc-800/50 text-xs text-zinc-400 font-mono flex items-center justify-between">
            <span>Rebar Nesting Engine</span>
            <span className="text-zinc-200 font-mono text-right">12m Stock Optimization</span>
          </div>
        </div>

        {/* BBS DATA TABLE */}
        <div className="col-span-12 bg-zinc-900 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3 font-mono">
            <div>
              <span className="text-white font-bold text-xs uppercase block">
                Bar Bending Schedule Register ({bbsItems.length})
              </span>
              <span className="text-[10px] text-zinc-500">
                Structural Member Rebar Take-off, Cutting Lengths, and Nesting Scrap Audit
              </span>
            </div>
          </div>

          {bbsItems.length === 0 ? (
            <div className="p-12 text-center border border-zinc-850 bg-zinc-950 font-mono text-xs">
              <Layers className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              <div className="text-zinc-400 font-bold uppercase">Zero Structural Members Scheduled</div>
              <p className="text-[11px] text-zinc-600 mt-1 max-w-sm mx-auto font-sans">
                Click &quot;Schedule Rebar Member&quot; above to log structural rebar cut lengths and compute IS 2502 tonnage.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Member &amp; Bar Mark</th>
                    <th className="p-3">Dia &amp; Shape</th>
                    <th className="p-3 text-right">Bars × Cut (m)</th>
                    <th className="p-3 text-right">Total Cut Length</th>
                    <th className="p-3 text-right">Calculated Wt (MT)</th>
                    <th className="p-3 text-center">Scrap %</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {bbsItems.map((item) => {
                    const isApproved = item.status === 'Approved for Bending';
                    const isExcess = item.status === 'Excess Wastage Flag';

                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/50 transition">
                        <td className="p-3">
                          <span className="text-white font-bold block">{item.structural_element}</span>
                          <span className="text-cyan-400 font-mono text-[11px]">{item.bar_mark}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-zinc-200 block font-bold">{item.dia_mm} mm</span>
                          <span className="text-zinc-500 text-[10px]">{item.bar_shape_type}</span>
                        </td>
                        <td className="p-3 text-right text-zinc-400">
                          {item.number_of_bars} × {item.cutting_length_m}m
                        </td>
                        <td className="p-3 text-right font-bold text-zinc-200">
                          {Number(item.total_cut_length_m).toFixed(2)} m
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-400">
                          {Number(item.calculated_weight_mt).toFixed(3)} MT
                        </td>
                        <td className="p-3 text-center font-bold">
                          <span className={item.scrap_rate_pct > 3.0 ? 'text-rose-400' : 'text-emerald-400'}>
                            {item.scrap_rate_pct}%
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={\`px-2 py-0.5 rounded text-[9px] font-bold uppercase \${
                              isApproved
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                : isExcess
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-amber-950 text-amber-400 border border-amber-800'
                            }\`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {!isApproved && (
                            <button
                              type="button"
                              onClick={() => handleApproveBbs(item.id)}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 border border-zinc-700 rounded text-[10px] font-bold uppercase transition"
                            >
                              Approve
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

      {/* SCHEDULE REBAR MEMBER MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Schedule Rebar Member (IS 2502)</span>
              </span>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateBbsItem} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Structural Element *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Columns C1-C4 (Level 3)"
                  value={element}
                  onChange={(e) => setElement(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Bar Mark *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BM-COL-01"
                    value={barMark}
                    onChange={(e) => setBarMark(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Bar Diameter (mm)</label>
                  <select
                    value={diaMm}
                    onChange={(e) => setDiaMm(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    {[8, 10, 12, 16, 20, 25, 28, 32, 36, 40].map((d) => (
                      <option key={d} value={d}>{d} mm (w={((d * d) / 162.28).toFixed(2)} kg/m)</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Shape</label>
                  <select
                    value={shape}
                    onChange={(e) => setShape(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="Straight">Straight</option>
                    <option value="L-Bend">L-Bend</option>
                    <option value="Crank">Crank</option>
                    <option value="Stirrup">Stirrup</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Cut Length (m) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 5.85"
                    value={cutLength}
                    onChange={(e) => setCutLength(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">No. of Bars *</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 12"
                    value={numBars}
                    onChange={(e) => setNumBars(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Nesting Scrap Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={scrapRate}
                  onChange={(e) => setScrapRate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                />
                <span className="text-[9px] text-zinc-500 mt-0.5 block">CPWD Cl. 42 sets a 3.0% maximum threshold before penal deductions.</span>
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
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase text-xs rounded transition"
                >
                  {submitting ? 'Scheduling...' : 'Authorize Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
`;

fs.writeFileSync("app/engineering/bbs/page.tsx", bbsCode, "utf8");
console.log("✓ Re-written app/engineering/bbs/page.tsx with pure IS 2502 calculation & zero mock data.");

// --------------------------------------------------------------------------
// 2. Scrubbed app/operations/plant-machinery/page.tsx
// --------------------------------------------------------------------------
const plantMachineryOriginal = fs.readFileSync("app/operations/plant-machinery/page.tsx", "utf8");

// Remove mock fallback arrays and fix infinite loading
let pmCleaned = plantMachineryOriginal
  .replace(/const defaults: PlantMachineryRecord\[\] =[\s\S]*?setEquipmentList\(defaults\);[\s\S]*?if \(!selectedEquipment\) setSelectedEquipment\(defaults\[0\]\);/g, 'setEquipmentList([]); setSelectedEquipment(null);')
  .replace(/const defaultLogs: FuelTelematicsRecord\[\] =[\s\S]*?setFuelLogs\(defaultLogs\);/g, 'setFuelLogs([]);')
  .replace(/if \(loading \Vert{}\Vert{} !selectedEquipment\) \{[\s\S]*?return \([\s\S]*?INITIALIZING PLANT &amp; MACHINERY[\s\S]*?<\/div>\s*\);\s*\}/g, `
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        SYNCHRONIZING HEAVY PLANT ASSET REGISTER...
      </div>
    );
  }
  `);

// Clean form defaults
pmCleaned = pmCleaned
  .replace(/const \[eqName, setEqName\] = useState\([\s\S]*?\);/g, 'const [eqName, setEqName] = useState("");')
  .replace(/const \[makeModel, setMakeModel\] = useState\([\s\S]*?\);/g, 'const [makeModel, setMakeModel] = useState("");')
  .replace(/const \[contractor, setContractor\] = useState\([\s\S]*?\);/g, 'const [contractor, setContractor] = useState("");')
  .replace(/const \[gridLoc, setGridLoc\] = useState\([\s\S]*?\);/g, 'const [gridLoc, setGridLoc] = useState("");')
  .replace(/const \[operator, setOperator\] = useState\("R\. S\. Chauhan"\);/g, 'const [operator, setOperator] = useState("");')
  .replace(/const \[bowserRef, setBowserRef\] = useState\([\s\S]*?\);/g, 'const [bowserRef, setBowserRef] = useState("");');

fs.writeFileSync("app/operations/plant-machinery/page.tsx", pmCleaned, "utf8");
console.log("✓ Scrubbed app/operations/plant-machinery/page.tsx of mock data & infinite loading patterns.");

// --------------------------------------------------------------------------
// 3. Scrubbed app/engineering/submittals/page.tsx
// --------------------------------------------------------------------------
const submittalsOriginal = fs.readFileSync("app/engineering/submittals/page.tsx", "utf8");

let subCleaned = submittalsOriginal
  .replace(/const defaults: SubmittalRecord\[\] =[\s\S]*?setSubmittals\(defaults\);[\s\S]*?if \(!selectedSubmittal\) setSelectedSubmittal\(defaults\[0\]\);/g, 'setSubmittals([]); setSelectedSubmittal(null);')
  .replace(/if \(loading \Vert{}\Vert{} !selectedSubmittal\) \{[\s\S]*?return \([\s\S]*?INITIALIZING TECHNICAL SUBMITTALS[\s\S]*?<\/div>\s*\);\s*\}/g, `
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING TECHNICAL SUBMITTAL &amp; MAR VAULT...
      </div>
    );
  }
  `);

// Clean form defaults
subCleaned = subCleaned
  .replace(/const \[title, setTitle\] = useState\([\s\S]*?\);/g, 'const [title, setTitle] = useState("");')
  .replace(/const \[contractor, setContractor\] = useState\([\s\S]*?\);/g, 'const [contractor, setContractor] = useState("");')
  .replace(/const \[tradePackage, setTradePackage\] = useState\([\s\S]*?\);/g, 'const [tradePackage, setTradePackage] = useState("");')
  .replace(/const \[specClause, setSpecClause\] = useState\([\s\S]*?\);/g, 'const [specClause, setSpecClause] = useState("");')
  .replace(/const \[brand, setBrand\] = useState\([\s\S]*?\);/g, 'const [brand, setBrand] = useState("");')
  .replace(/const \[vendor, setVendor\] = useState\([\s\S]*?\);/g, 'const [vendor, setVendor] = useState("");');

fs.writeFileSync("app/engineering/submittals/page.tsx", subCleaned, "utf8");
console.log("✓ Scrubbed app/engineering/submittals/page.tsx of mock data & infinite loading patterns.");

// --------------------------------------------------------------------------
// 4. Wire Sidebar.tsx
// --------------------------------------------------------------------------
const sidebarPath = "components/layout/Sidebar.tsx";
if (fs.existsSync(sidebarPath)) {
  let content = fs.readFileSync(sidebarPath, "utf8");

  if (!content.includes("/engineering/bbs")) {
    content = content.replace(
      /(\{\s*label:\s*["\x27]Technical Queries \(RFI\)["\x27][^}]*\},)/g,
      `$1\n      { label: "Bar Bending Schedule (BBS)", href: "/engineering/bbs", icon: Layers },\n      { label: "Material Approvals (MAR)", href: "/engineering/submittals", icon: FileCheck2 },`
    );
  }

  if (!content.includes("/operations/plant-machinery")) {
    content = content.replace(
      /(\{\s*label:\s*["\x27]Gate Inward & Weighbridge["\x27][^}]*\},)/g,
      `$1\n      { label: "Plant & Machinery (P&M)", href: "/operations/plant-machinery", icon: Wrench },`
    );

    if (!content.includes("Wrench,")) {
      content = content.replace("Truck,", "Truck,\n  Wrench,");
    }
  }

  fs.writeFileSync(sidebarPath, content, "utf8");
  console.log("✓ Linked BBS, Plant & Machinery, and Submittals in Sidebar.tsx");
}

