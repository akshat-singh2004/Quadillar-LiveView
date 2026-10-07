import fs from 'fs';
import path from 'path';

console.log("Starting Sprint 5 Codebase Surgery...");

// --------------------------------------------------------------------------
// 1. Scrubbed app/commercial/hindrance-eot/page.tsx
// --------------------------------------------------------------------------
const hindranceEotCode = `'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Scale,
  FileText,
  Plus,
  RefreshCw,
  X,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface HindranceRecord {
  id: string;
  project_id: string;
  hindrance_number: string;
  nature_of_hindrance: string;
  start_date: string;
  end_date: string;
  attributable_party: 'Client' | 'Contractor' | 'Force Majeure';
  clause_ref: string;
  days_hindered: number;
  critical_path_impact: boolean;
  status: 'OPEN' | 'RESOLVED' | 'DISPUTED';
}

function formatInr(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val || 0);
}

export default function HindranceEotModulePage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || 'proj-1';
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [hindrances, setHindrances] = useState<HindranceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Contract Baseline defaults (dynamically adjusted)
  const contractBaseline = Number((project as any)?.contract_value || 450000000);
  const stipulatedDate = (project as any)?.stipulated_completion_date || '2026-11-30';

  // Form State
  const [nature, setNature] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [party, setParty] = useState<'Client' | 'Contractor' | 'Force Majeure'>('Client');
  const [clauseRef, setClauseRef] = useState('CPWD Cl. 5.1 / GCC 42');

  const loadHindrances = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('site_hindrance_register')
        .select('*')
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setHindrances(data || []);
    } catch (err: any) {
      console.error('Failed to load hindrances:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadHindrances();
  }, [loadHindrances]);

  // Self-Contained SCL / CPWD Clause 2 & 5 Delay Resolution Engine
  const analysis = useMemo(() => {
    if (hindrances.length === 0) {
      return {
        totalGrossDays: 0,
        totalUniqueDelayDays: 0,
        overlappingDays: 0,
        justifiedEotDays: 0,
        contractorDelayDays: 0,
        projectedLd: 0,
        statutory10PercentCap: contractBaseline * 0.1,
        isCapReached: false,
        revisedCompletionDate: stipulatedDate,
        itemsWithConcurrency: [],
      };
    }

    // Determine min start and max end
    let minTime = Infinity;
    let maxTime = -Infinity;

    hindrances.forEach((h) => {
      const s = new Date(h.start_date).getTime();
      const e = new Date(h.end_date).getTime();
      if (s < minTime) minTime = s;
      if (e > maxTime) maxTime = e;
    });

    const dayMs = 86400000;
    const totalDaysSpan = Math.max(1, Math.round((maxTime - minTime) / dayMs) + 1);

    // Timeline arrays for each calendar day
    const dayHasClient = new Uint8Array(totalDaysSpan);
    const dayHasContractor = new Uint8Array(totalDaysSpan);
    const dayHasForceMajeure = new Uint8Array(totalDaysSpan);
    const dayCount = new Uint16Array(totalDaysSpan);

    let grossDays = 0;
    const itemsWithConcurrency = hindrances.map((h) => {
      const s = Math.round((new Date(h.start_date).getTime() - minTime) / dayMs);
      const e = Math.round((new Date(h.end_date).getTime() - minTime) / dayMs);
      const duration = Math.max(1, e - s + 1);
      grossDays += duration;

      let overlap = 0;
      for (let d = s; d <= e; d++) {
        if (dayCount[d] > 0) overlap++;
        dayCount[d]++;
        if (h.attributable_party === 'Client') dayHasClient[d] = 1;
        else if (h.attributable_party === 'Contractor') dayHasContractor[d] = 1;
        else dayHasForceMajeure[d] = 1;
      }

      return {
        ...h,
        durationDays: duration,
        overlappingDays: overlap,
        eotGrantedDays: h.attributable_party !== 'Contractor' ? duration : 0,
      };
    });

    let uniqueDays = 0;
    let justifiedEot = 0;
    let contractorDefault = 0;

    for (let d = 0; d < totalDaysSpan; d++) {
      if (dayCount[d] > 0) {
        uniqueDays++;
        const hasExcusable = dayHasClient[d] || dayHasForceMajeure[d];
        const hasContractor = dayHasContractor[d];

        // SCL Protocol: Concurrent delay yields EOT (excused time without prolongation cost)
        if (hasExcusable) {
          justifiedEot++;
        } else if (hasContractor) {
          contractorDefault++;
        }
      }
    }

    // CPWD Cl. 2: 1.5% per month (0.05% per day) of delayed work value, capped at 10%
    const rawLd = contractorDefault * (0.015 / 30) * contractBaseline;
    const cap10 = contractBaseline * 0.1;
    const projectedLd = Math.min(rawLd, cap10);
    const isCapReached = rawLd >= cap10 && cap10 > 0;

    const revisedDate = new Date(new Date(stipulatedDate).getTime() + justifiedEot * dayMs)
      .toISOString()
      .slice(0, 10);

    return {
      totalGrossDays: grossDays,
      totalUniqueDelayDays: uniqueDays,
      overlappingDays: Math.max(0, grossDays - uniqueDays),
      justifiedEotDays: justifiedEot,
      contractorDelayDays: contractorDefault,
      projectedLd,
      statutory10PercentCap: cap10,
      isCapReached,
      revisedCompletionDate: revisedDate,
      itemsWithConcurrency,
    };
  }, [hindrances, contractBaseline, stipulatedDate]);

  const handleCreateHindrance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nature.trim() || !startDate || !endDate) return;

    setSubmitting(true);
    const hinNum = \`HIN-\${new Date().getFullYear()}-\${(hindrances.length + 1).toString().padStart(3, '0')}\`;

    const payload = {
      project_id: projectId,
      hindrance_number: hinNum,
      nature_of_hindrance: nature.trim(),
      start_date: startDate,
      end_date: endDate,
      attributable_party: party,
      clause_ref: clauseRef.trim(),
      critical_path_impact: true,
      status: 'OPEN',
    };

    try {
      const { error } = await (supabase as any).from('site_hindrance_register').insert([payload]);
      if (error) throw error;

      setModalOpen(false);
      setNature('');
      setStartDate('');
      setEndDate('');
      setFeedback('Hindrance event registered in statutory e-Hindrance register.');
      setTimeout(() => setFeedback(null), 3500);
      await loadHindrances();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to record hindrance.');
      setTimeout(() => setFeedback(null), 4000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-6 md:p-8 text-zinc-100 font-mono">
      <header className="max-w-7xl mx-auto mb-6 bg-zinc-900 border border-zinc-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-zinc-800/50">
          <div>
            <div className="flex items-center gap-2 text-xs tracking-widest text-zinc-400 uppercase">
              <span>STATUTORY COMMERCIAL SUITE • CPWD WORKS MANUAL 2024 CL. 2 &amp; CL. 5</span>
              <StatutoryInfo
                standardRef="CPWD CL. 2 / CL. 5 / FIDIC 8.4"
                title="Concurrent Delay & Liquidated Damages Capping"
                idealRange="LD Capped at 10.00% of Contract Sum"
                description="Governs Extension of Time (EOT) admissibility. Concurrent events attributable to both Employer and Contractor afford time extension without monetary prolongation compensation. Exclusive Contractor default attracts Liquidated Damages capped strictly at 10%."
              />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white uppercase mt-0.5">
              Hindrance Register, Concurrent Delay &amp; LD Capping Engine
            </h1>
            <p className="text-xs text-zinc-400 font-sans mt-0.5">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Base Contract: {formatInr(contractBaseline)}
            </p>
          </div>

          <div className="mt-3 md:mt-0 flex items-center gap-2">
            <button
              onClick={() => void loadHindrances()}
              className="p-2 bg-zinc-950 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase rounded text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Log Hindrance Event</span>
            </button>
          </div>
        </div>

        <div className="px-5 py-2.5 bg-zinc-950/60 text-xs text-zinc-400 flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/50">
          <div>STIPULATED COD: <span className="text-zinc-100 font-bold">{stipulatedDate}</span></div>
          <div>REVISED COD: <span className="text-emerald-400 font-bold">{analysis.revisedCompletionDate}</span></div>
          <div className="text-amber-400 font-bold">10% LD CEILING: {formatInr(analysis.statutory10PercentCap)}</div>
        </div>
      </header>

      {feedback && (
        <div className="max-w-7xl mx-auto mb-6 p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 4 SUMMARY METRIC CARDS */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 text-xs">
        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <span className="text-[10px] uppercase text-zinc-400 block">Total Hindrance Days</span>
          <div className="text-2xl font-bold text-white mt-1">{analysis.totalUniqueDelayDays} DAYS</div>
          <div className="text-[10px] text-zinc-500 mt-1">Overlap: {analysis.overlappingDays} Days</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <span className="text-[10px] uppercase text-zinc-400 block">Justified EOT Days (Cl. 5)</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">+{analysis.justifiedEotDays} DAYS</div>
          <div className="text-[10px] text-zinc-500 mt-1">Excused Time Entitlement</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <span className="text-[10px] uppercase text-zinc-400 block">Contractor Default Delay</span>
          <div className={\`text-2xl font-bold mt-1 \${analysis.contractorDelayDays > 0 ? 'text-rose-400' : 'text-emerald-400'}\`}>
            {analysis.contractorDelayDays} DAYS
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">Subject to Clause 2 Damages</div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4">
          <span className="text-[10px] uppercase text-zinc-400 block">Projected Liquidated Damages</span>
          <div className={\`text-2xl font-bold mt-1 \${analysis.projectedLd > 0 ? 'text-rose-400' : 'text-white'}\`}>
            {formatInr(analysis.projectedLd)}
          </div>
          <div className="text-[10px] text-zinc-500 mt-1">Capped strictly at 10.0%</div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto space-y-6">
        {analysis.isCapReached && (
          <div className="bg-rose-950/40 border border-rose-800 p-4 text-xs">
            <div className="flex items-center gap-2 text-rose-400 font-bold mb-1">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>CRITICAL STATUTORY AUDIT WARNING: CLAUSE 2 HARD CAP EXHAUSTED</span>
            </div>
            <p className="text-rose-300 font-sans leading-relaxed">
              Liquidated Damages have reached the 10.0% contract ceiling ({formatInr(analysis.statutory10PercentCap)}). No further delay compensation may be withheld from running bills under CPWD Works Manual guidelines.
            </p>
          </div>
        )}

        {/* HINDRANCE REGISTER GRID */}
        <section className="bg-zinc-900 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3 text-xs">
            <span className="text-white font-bold uppercase flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              <span>Statutory Hindrance Register (Form CPWD 8)</span>
            </span>
            <span className="text-zinc-500">{hindrances.length} Recorded Events</span>
          </div>

          {hindrances.length === 0 ? (
            <div className="p-12 text-center border border-zinc-850 bg-zinc-950 text-xs text-zinc-500">
              Zero hindrances logged. Site progressing per original baseline.
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Ref</th>
                    <th className="p-3">Nature of Hindrance</th>
                    <th className="p-3 text-right">Start Date</th>
                    <th className="p-3 text-right">End Date</th>
                    <th className="p-3 text-right">Duration</th>
                    <th className="p-3 text-right">Overlap</th>
                    <th className="p-3 text-center">Attribution</th>
                    <th className="p-3 text-right">EOT Granted</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {analysis.itemsWithConcurrency.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-900/50 transition">
                      <td className="p-3 font-bold text-white">{item.hindrance_number}</td>
                      <td className="p-3 font-sans text-zinc-200">
                        <div>{item.nature_of_hindrance}</div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{item.clause_ref}</div>
                      </td>
                      <td className="p-3 text-right text-zinc-400">{item.start_date}</td>
                      <td className="p-3 text-right text-zinc-400">{item.end_date}</td>
                      <td className="p-3 text-right font-bold text-zinc-200">{item.durationDays} Days</td>
                      <td className="p-3 text-right text-amber-400">{item.overlappingDays} Days</td>
                      <td className="p-3 text-center">
                        <span className={\`px-2 py-0.5 rounded text-[10px] font-bold uppercase \${
                          item.attributable_party === 'Contractor'
                            ? 'bg-rose-950 text-rose-400 border border-rose-800'
                            : item.attributable_party === 'Client'
                            ? 'bg-amber-950 text-amber-400 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        }\`}>
                          {item.attributable_party}
                        </span>
                      </td>
                      <td className="p-3 text-right font-bold">
                        {item.eotGrantedDays > 0 ? (
                          <span className="text-emerald-400">+{item.eotGrantedDays} Days</span>
                        ) : (
                          <span className="text-rose-400">0 Days</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs">Log Statutory Hindrance Event</span>
              <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateHindrance} className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Nature of Hindrance *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delayed drawing release for lift shaft core"
                  value={nature}
                  onChange={(e) => setNature(e.target.value)}
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
                  <label className="text-[10px] text-zinc-400 block mb-1">Attributable Party</label>
                  <select
                    value={party}
                    onChange={(e) => setParty(e.target.value as any)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  >
                    <option value="Client">Client / Employer</option>
                    <option value="Contractor">Contractor Default</option>
                    <option value="Force Majeure">Force Majeure (Act of God)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Clause Reference</label>
                  <input
                    type="text"
                    required
                    value={clauseRef}
                    onChange={(e) => setClauseRef(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                <button type="submit" disabled={submitting} className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase rounded">Record Hindrance</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync("app/commercial/hindrance-eot/page.tsx", hindranceEotCode, "utf8");
console.log("✓ Re-written app/commercial/hindrance-eot/page.tsx with pure zero-data delay & LD engine.");

// --------------------------------------------------------------------------
// 2. Scrubbed app/contracts/claims-disputes/page.tsx
// --------------------------------------------------------------------------
const originalClaims = fs.readFileSync("app/contracts/claims-disputes/page.tsx", "utf8");

let claimsCleaned = originalClaims
  .replace(/const defaults: ClaimDisputeRecord\[\] =[\s\S]*?setClaims\(defaults\);[\s\S]*?if \(!selectedClaim\) setSelectedClaim\(defaults\[0\]\);/g, 'setClaims([]); setSelectedClaim(null);')
  .replace(/if \(loading \Vert{}\Vert{} !selectedClaim\) \{[\s\S]*?return \([\s\S]*?INITIALIZING CONTRACT CLAIMS[\s\S]*?<\/div>\s*\);\s*\}/g, `
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING STATUTORY CLAIMS &amp; DISPUTE BOARD DOSSIER...
      </div>
    );
  }
  `)
  // Clean form defaults
  .replace(/const \[title, setTitle\] = useState\([\s\S]*?\);/g, 'const [title, setTitle] = useState("");')
  .replace(/const \[woRef, setWoRef\] = useState\([\s\S]*?\);/g, 'const [woRef, setWoRef] = useState("");')
  .replace(/const \[contractor, setContractor\] = useState\([\s\S]*?\);/g, 'const [contractor, setContractor] = useState("");')
  .replace(/const \[tradePackage, setTradePackage\] = useState\([\s\S]*?\);/g, 'const [tradePackage, setTradePackage] = useState("");')
  .replace(/const \[claimedDays, setClaimedDays\] = useState<number>\([\s\S]*?\);/g, 'const [claimedDays, setClaimedDays] = useState<number>(0);')
  .replace(/const \[claimedAmount, setClaimedAmount\] = useState<number>\([\s\S]*?\);/g, 'const [claimedAmount, setClaimedAmount] = useState<number>(0);')
  .replace(/const \[hindranceCode, setHindranceCode\] = useState\([\s\S]*?\);/g, 'const [hindranceCode, setHindranceCode] = useState("");');

fs.writeFileSync("app/contracts/claims-disputes/page.tsx", claimsCleaned, "utf8");
console.log("✓ Scrubbed app/contracts/claims-disputes/page.tsx of mock data & loading locks.");

// --------------------------------------------------------------------------
// 3. Scrubbed app/contracts/variations/page.tsx
// --------------------------------------------------------------------------
const originalVariations = fs.readFileSync("app/contracts/variations/page.tsx", "utf8");

let variationsCleaned = originalVariations
  .replace(/const defaults: VariationRecord\[\] =[\s\S]*?setVariations\(defaults\);[\s\S]*?if \(!selectedVariation\) setSelectedVariation\(defaults\[0\]\);/g, 'setVariations([]); setSelectedVariation(null);')
  .replace(/if \(loading \Vert{}\Vert{} !selectedVariation\) \{[\s\S]*?return \([\s\S]*?INITIALIZING CONTRACT VARIATIONS[\s\S]*?<\/div>\s*\);\s*\}/g, `
  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING CONTRACT VARIATIONS &amp; RATE DERIVATION LEDGER...
      </div>
    );
  }
  `)
  // Clean form defaults
  .replace(/const \[title, setTitle\] = useState\([\s\S]*?\);/g, 'const [title, setTitle] = useState("");')
  .replace(/const \[woRef, setWoRef\] = useState\([\s\S]*?\);/g, 'const [woRef, setWoRef] = useState("");')
  .replace(/const \[contractor, setContractor\] = useState\([\s\S]*?\);/g, 'const [contractor, setContractor] = useState("");')
  .replace(/const \[tradePackage, setTradePackage\] = useState\([\s\S]*?\);/g, 'const [tradePackage, setTradePackage] = useState("");')
  .replace(/const \[boqRef, setBoqRef\] = useState\([\s\S]*?\);/g, 'const [boqRef, setBoqRef] = useState("");')
  .replace(/const \[origQty, setOrigQty\] = useState<number>\([\s\S]*?\);/g, 'const [origQty, setOrigQty] = useState<number>(0);')
  .replace(/const \[revQty, setRevQty\] = useState<number>\([\s\S]*?\);/g, 'const [revQty, setRevQty] = useState<number>(0);')
  .replace(/const \[tenderRate, setTenderRate\] = useState<number>\([\s\S]*?\);/g, 'const [tenderRate, setTenderRate] = useState<number>(0);')
  .replace(/const \[derivedRate, setDerivedRate\] = useState<number>\([\s\S]*?\);/g, 'const [derivedRate, setDerivedRate] = useState<number>(0);')
  .replace(/const \[eotDays, setEotDays\] = useState<number>\([\s\S]*?\);/g, 'const [eotDays, setEotDays] = useState<number>(0);')
  .replace(/const \[desc, setDesc\] = useState\([\s\S]*?\);/g, 'const [desc, setDesc] = useState("");');

fs.writeFileSync("app/contracts/variations/page.tsx", variationsCleaned, "utf8");
console.log("✓ Scrubbed app/contracts/variations/page.tsx of mock data & loading locks.");

// --------------------------------------------------------------------------
// 4. Wire Sidebar.tsx
// --------------------------------------------------------------------------
const sidebarPath = "components/layout/Sidebar.tsx";
if (fs.existsSync(sidebarPath)) {
  let content = fs.readFileSync(sidebarPath, "utf8");

  if (!content.includes("/commercial/hindrance-eot")) {
    content = content.replace(
      /(\{\s*label:\s*["\x27]Permit to Work \(PTW\)["\x27][^}]*\},)/g,
      `$1\n      { label: "Hindrance Register & EOT", href: "/commercial/hindrance-eot", icon: Clock },`
    );
  }

  if (!content.includes("/contracts/claims-disputes")) {
    content = content.replace(
      /(\{\s*label:\s*["\x27]Potential Change Orders \(PCO\)["\x27][^}]*\},)/g,
      `$1\n      { label: "Contract Variations (VO)", href: "/contracts/variations", icon: FileDiff },\n      { label: "Claims & Dispute Board (DAB)", href: "/contracts/claims-disputes", icon: Scale },`
    );

    if (!content.includes("Scale,")) {
      content = content.replace("Calculator,", "Calculator,\n  Scale,");
    }
  }

  fs.writeFileSync(sidebarPath, content, "utf8");
  console.log("✓ Linked Hindrance EOT, Variations, and Claims & Disputes in Sidebar.tsx");
}

