#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Deploying Rebar BBS & 1D Billet Nesting Engine (IS 2502 / IS 1786)...\033[0m"

# -----------------------------------------------------------------------------
# 1. OPTIMIZER: lib/engineering/bbs-optimizer.ts
# Pure algorithmic cutting-stock solver with IS 2502 bend deductions
# -----------------------------------------------------------------------------
cat << 'LIB_BBS' > lib/engineering/bbs-optimizer.ts
export interface RebarCutRequirement {
  id: string;
  memberTag: string;
  barMark: string;
  diameterMm: number;
  cutLengthM: number;
  quantity: number;
}

export interface BilletCutPattern {
  billetId: number;
  stockLengthM: number;
  cuts: { memberTag: string; lengthM: number; diameterMm: number }[];
  usedLengthM: number;
  offcutLengthM: number;
  isOffcutSalvaged: boolean; // Offcuts >= 1.5m are salvaged as chairs/dowels
}

export interface NestingOptimizationResult {
  diameterMm: number;
  totalCutPieces: number;
  totalCutLengthM: number;
  billetsConsumed: number;
  totalBilletLengthM: number;
  totalOffcutM: number;
  salvagedOffcutM: number;
  trueScrapM: number;
  scrapRatePct: number;
  isWithinCpwdLimit: boolean; // Scrap <= 3.0% per CPWD Cl. 42
  totalWeightKg: number;
  patterns: BilletCutPattern[];
  verdict: string;
}

export class BbsNestingOptimizer {
  /**
   * Computes unit weight in kg/m per IS 1786:2008 (d^2 / 162.2)
   */
  static getUnitWeightKgPerM(diameterMm: number): number {
    return parseFloat(((diameterMm * diameterMm) / 162.2).toFixed(3));
  }

  /**
   * Calculates IS 2502 cutting length with statutory bend deductions
   */
  static calculateCutLength(params: {
    grossSumM: number;
    diameterMm: number;
    bends45Count?: number;
    bends90Count?: number;
    bends135Count?: number;
    hookCount?: number;
  }): number {
    const dM = params.diameterMm / 1000;
    const deduct45 = (params.bends45Count || 0) * (1 * dM);
    const deduct90 = (params.bends90Count || 0) * (2 * dM);
    const deduct135 = (params.bends135Count || 0) * (3 * dM);
    const hookAddition = (params.hookCount || 0) * (9 * dM); // Standard 135° seismic hook: 9d

    const netCut = params.grossSumM - (deduct45 + deduct90 + deduct135) + hookAddition;
    return parseFloat(Math.max(0.2, netCut).toFixed(3));
  }

  /**
   * 1D Cutting Stock Optimizer (Best-Fit Decreasing with Offcut Salvage)
   * Standard rolling mill stock: 12.0 meters
   */
  static optimizeBilletNesting(
    cuts: RebarCutRequirement[],
    stockLengthM = 12.0
  ): NestingOptimizationResult {
    if (cuts.length === 0) {
      return {
        diameterMm: 0,
        totalCutPieces: 0,
        totalCutLengthM: 0,
        billetsConsumed: 0,
        totalBilletLengthM: 0,
        totalOffcutM: 0,
        salvagedOffcutM: 0,
        trueScrapM: 0,
        scrapRatePct: 0,
        isWithinCpwdLimit: true,
        totalWeightKg: 0,
        patterns: [],
        verdict: "No cut requirements provided.",
      };
    }

    const dia = cuts[0].diameterMm;

    // Expand requirements into individual piece array
    const pieces: { memberTag: string; lengthM: number; diameterMm: number }[] = [];
    cuts.forEach((req) => {
      for (let i = 0; i < req.quantity; i++) {
        pieces.push({
          memberTag: req.memberTag,
          lengthM: req.cutLengthM,
          diameterMm: req.diameterMm,
        });
      }
    });

    // Sort pieces in descending order (Best-Fit Decreasing heuristic)
    pieces.sort((a, b) => b.lengthM - a.lengthM);

    const patterns: BilletCutPattern[] = [];

    // Bin Packing BFD loop
    pieces.forEach((piece) => {
      // Find billet with best remaining capacity
      let bestBilletIndex = -1;
      let minRemainingAfterCut = Infinity;

      for (let i = 0; i < patterns.length; i++) {
        const remaining = stockLengthM - patterns[i].usedLengthM;
        if (remaining >= piece.lengthM) {
          const diff = remaining - piece.lengthM;
          if (diff < minRemainingAfterCut) {
            minRemainingAfterCut = diff;
            bestBilletIndex = i;
          }
        }
      }

      if (bestBilletIndex !== -1) {
        // Place in existing billet
        patterns[bestBilletIndex].cuts.push(piece);
        patterns[bestBilletIndex].usedLengthM = parseFloat(
          (patterns[bestBilletIndex].usedLengthM + piece.lengthM).toFixed(3)
        );
        patterns[bestBilletIndex].offcutLengthM = parseFloat(
          (stockLengthM - patterns[bestBilletIndex].usedLengthM).toFixed(3)
        );
      } else {
        // Open a new 12.0m billet
        patterns.push({
          billetId: patterns.length + 1,
          stockLengthM,
          cuts: [piece],
          usedLengthM: piece.lengthM,
          offcutLengthM: parseFloat((stockLengthM - piece.lengthM).toFixed(3)),
          isOffcutSalvaged: false,
        });
      }
    });

    // Evaluate Offcut Salvage vs True Scrap
    let totalCutLengthM = 0;
    let totalOffcutM = 0;
    let salvagedOffcutM = 0;

    patterns.forEach((p) => {
      totalCutLengthM += p.usedLengthM;
      totalOffcutM += p.offcutLengthM;
      // Reusable salvage threshold: offcuts >= 1.5m are preserved for spacers/chairs
      if (p.offcutLengthM >= 1.5) {
        p.isOffcutSalvaged = true;
        salvagedOffcutM += p.offcutLengthM;
      }
    });

    const billetsConsumed = patterns.length;
    const totalBilletLengthM = billetsConsumed * stockLengthM;
    const trueScrapM = parseFloat(Math.max(0, totalOffcutM - salvagedOffcutM).toFixed(3));
    const scrapRatePct = parseFloat(((trueScrapM / totalBilletLengthM) * 100).toFixed(2));
    const isWithinCpwdLimit = scrapRatePct <= 3.0;

    const unitWeight = this.getUnitWeightKgPerM(dia);
    const totalWeightKg = parseFloat((totalCutLengthM * unitWeight).toFixed(1));

    let verdict = `OPTIMIZED: Scrap ${scrapRatePct}% complies with CPWD Cl. 42 (<= 3.0%).`;
    if (!isWithinCpwdLimit) {
      verdict = `PENAL SCRAP BREACH: Scrap ${scrapRatePct}% exceeds 3.0% statutory threshold. Salvage lap staggering recommended.`;
    }

    return {
      diameterMm: dia,
      totalCutPieces: pieces.length,
      totalCutLengthM: parseFloat(totalCutLengthM.toFixed(3)),
      billetsConsumed,
      totalBilletLengthM,
      totalOffcutM: parseFloat(totalOffcutM.toFixed(3)),
      salvagedOffcutM: parseFloat(salvagedOffcutM.toFixed(3)),
      trueScrapM,
      scrapRatePct,
      isWithinCpwdLimit,
      totalWeightKg,
      patterns,
      verdict,
    };
  }
}
LIB_BBS

# -----------------------------------------------------------------------------
# 2. ACTION: app/actions/bbs-actions.ts
# Server action to commit nested BBS schedules and seal with Hermes
# -----------------------------------------------------------------------------
cat << 'ACTION_BBS' > app/actions/bbs-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { BbsNestingOptimizer, RebarCutRequirement } from "@/lib/engineering/bbs-optimizer";
import { HermesAgent } from "@/lib/agents/hermes";

export interface CreateBbsPayload {
  projectId: string;
  elementTag: string;
  memberType: string;
  diameterMm: number;
  grossDimensions: {
    lengthM: number;
    breadthM?: number;
    depthM?: number;
    bends90Count: number;
    bends135Count: number;
  };
  totalBarsRequired: number;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for BBS action.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function optimizeAndCommitBbsSchedule(payload: CreateBbsPayload) {
  try {
    const supabase = getSupabase();

    // 1. Calculate net cutting length using IS 2502 deductions
    const cutLengthM = BbsNestingOptimizer.calculateCutLength({
      grossSumM: payload.grossDimensions.lengthM,
      diameterMm: payload.diameterMm,
      bends90Count: payload.grossDimensions.bends90Count,
      bends135Count: payload.grossDimensions.bends135Count,
    });

    // 2. Run 1D Cutting-Stock BFD optimization against 12.0m billets
    const cutReq: RebarCutRequirement = {
      id: "req-1",
      memberTag: payload.elementTag,
      barMark: `T${payload.diameterMm}-${payload.elementTag}`,
      diameterMm: payload.diameterMm,
      cutLengthM,
      quantity: payload.totalBarsRequired,
    };

    const optimization = BbsNestingOptimizer.optimizeBilletNesting([cutReq], 12.0);

    // 3. Commit to database
    const { data, error } = await supabase
      .from("bar_bending_schedules")
      .insert({
        project_id: payload.projectId,
        element_tag: payload.elementTag,
        member_type: payload.memberType,
        bar_diameter_mm: payload.diameterMm,
        num_bars: payload.totalBarsRequired,
        cutting_length_m: cutLengthM,
        total_weight_kg: optimization.totalWeightKg,
        scrap_rate_pct: optimization.scrapRatePct,
        status: optimization.isWithinCpwdLimit ? "FABRICATION_RELEASED" : "SCRAP_AUDIT_HOLD",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Seal with Section 65B Cryptographic Audit Log
    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `BBS 12m Billet Optimization: ${payload.elementTag} (Dia ${payload.diameterMm}mm)`,
      actionCategory: "REBAR_BBS_FABRICATION_RELEASE",
      moduleRef: String(data.id),
      details: {
        optimizationSummary: {
          billetsConsumed: optimization.billetsConsumed,
          scrapRatePct: optimization.scrapRatePct,
          totalWeightKg: optimization.totalWeightKg,
          salvagedOffcutM: optimization.salvagedOffcutM,
        },
      },
      signatoryName: "Agent Vulcan (Rebar Metallurgist)",
      signatoryRole: "Autonomous Rebar Detailing Auditor",
      severity: optimization.isWithinCpwdLimit ? "verified" : "warning",
    });

    revalidatePath("/engineering/bbs");
    revalidatePath("/finance/measurement-book");
    revalidatePath("/");

    return { success: true, optimization, data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to commit BBS schedule." };
  }
}
ACTION_BBS

# -----------------------------------------------------------------------------
# 3. COMPONENT: components/engineering/NewBbsScheduleModal.tsx
# Interactive schedule builder with live 1D nesting pattern visualization
# -----------------------------------------------------------------------------
cat << 'COMP_BBS_MODAL' > components/engineering/NewBbsScheduleModal.tsx
"use client";

import React, { useState } from "react";
import { optimizeAndCommitBbsSchedule } from "@/app/actions/bbs-actions";
import { Scissors, Plus, Loader2, CheckCircle2, ShieldAlert, Cpu } from "lucide-react";

interface Props {
  projectId: string;
}

const COMMON_MEMBERS = [
  { type: "BEAM_MAIN", label: "Continuous Beam Longitudinal Bars", defaultDia: 20 },
  { type: "COLUMN_VERTICAL", label: "Column Vertical Reinforcement", defaultDia: 25 },
  { type: "SHEAR_STIRRUP", label: "Two-Legged Closed Stirrups (Ties)", defaultDia: 8 },
  { type: "SLAB_TOP_EXTRA", label: "Cantilever Slab Hogging Steel", defaultDia: 10 },
  { type: "RAFT_MAT", label: "Raft Foundation Bottom Mat", defaultDia: 32 },
];

export function NewBbsScheduleModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [elementTag, setElementTag] = useState("TB-01 (Grid B1-B4)");
  const [memberType, setMemberType] = useState(COMMON_MEMBERS[0].type);
  const [diameterMm, setDiameterMm] = useState(COMMON_MEMBERS[0].defaultDia);
  const [grossLengthM, setGrossLengthM] = useState(6.4);
  const [bends90Count, setBends90Count] = useState(2);
  const [bends135Count, setBends135Count] = useState(0);
  const [totalBarsRequired, setTotalBarsRequired] = useState(16);

  // Live preview calculations per IS 2502 & IS 1786
  const dM = diameterMm / 1000;
  const netCutPreview = parseFloat(
    Math.max(0.2, grossLengthM - (bends90Count * 2 * dM + bends135Count * 3 * dM)).toFixed(3)
  );
  const unitWeightKgM = parseFloat(((diameterMm * diameterMm) / 162.2).toFixed(3));
  const estimatedTotalWeightKg = parseFloat((netCutPreview * totalBarsRequired * unitWeightKgM).toFixed(1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await optimizeAndCommitBbsSchedule({
        projectId,
        elementTag,
        memberType,
        diameterMm,
        grossDimensions: {
          lengthM: grossLengthM,
          bends90Count,
          bends135Count,
        },
        totalBarsRequired,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Optimization commit failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ New BBS Schedule</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  IS 2502 / IS 1786 • 1D Cutting Stock Optimization
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Rebar Cutting Schedule &amp; Billet Nesting
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-zinc-500 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Structural Element Tag
                  </label>
                  <input
                    type="text"
                    required
                    value={elementTag}
                    onChange={(e) => setElementTag(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold focus:border-cyan-500 outline-none"
                    placeholder="e.g. Beam TB-01 (L3)"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    RCC Member Type
                  </label>
                  <select
                    value={memberType}
                    onChange={(e) => setMemberType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs focus:border-cyan-500 outline-none"
                  >
                    {COMMON_MEMBERS.map((m) => (
                      <option key={m.type} value={m.type}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* BAR CONFIGURATION & BEND DEDUCTIONS */}
              <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-3">
                <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-bold block">
                  IS 2502 Bend Deduction Geometrics
                </span>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Bar Dia (mm)</label>
                    <select
                      value={diameterMm}
                      onChange={(e) => setDiameterMm(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    >
                      {[8, 10, 12, 16, 20, 25, 32].map((d) => (
                        <option key={d} value={d}>
                          T{d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Gross Length (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.5"
                      max="12.0"
                      required
                      value={grossLengthM}
                      onChange={(e) => setGrossLengthM(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">90° Bends (-2d)</label>
                    <input
                      type="number"
                      min="0"
                      max="6"
                      value={bends90Count}
                      onChange={(e) => setBends90Count(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-zinc-200 text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-0.5">Total Bars</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={totalBarsRequired}
                      onChange={(e) => setTotalBarsRequired(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded p-1.5 text-cyan-400 text-center font-bold"
                    />
                  </div>
                </div>

                {/* CALCULATED LIVE PREVIEWS */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-800 text-center">
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Net Cut Length</span>
                    <strong className="text-emerald-400 text-xs tabular-nums">{netCutPreview} m</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Unit Weight</span>
                    <strong className="text-zinc-200 text-xs tabular-nums">{unitWeightKgM} kg/m</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-zinc-500 uppercase block">Total Batch Weight</span>
                    <strong className="text-white text-xs tabular-nums">{estimatedTotalWeightKg} kg</strong>
                  </div>
                </div>
              </div>

              {/* BILLET NESTING INFORMATION BOX */}
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl space-y-1 text-zinc-400 text-[11px] font-sans">
                <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[10px] uppercase font-bold">
                  <Cpu className="w-3.5 h-3.5" />
                  <span>Vulcan 1D Nesting Algorithm armed</span>
                </div>
                <p>
                  Bars will be nested into standard 12.0m billets via Best-Fit Decreasing. Offcuts &ge; 1.5m are preserved as structural spacers. Scrap capped at &le; 3.0% per CPWD Cl. 42.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 font-bold uppercase rounded text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Nest &amp; Release Cutting Schedule</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_BBS_MODAL

# -----------------------------------------------------------------------------
# 4. PAGE: app/engineering/bbs/page.tsx
# Fully wired BBS view displaying committed schedules, yields, and scrap rates
# -----------------------------------------------------------------------------
cat << 'PAGE_BBS' > app/engineering/bbs/page.tsx
import React from "react";
import { NewBbsScheduleModal } from "@/components/engineering/NewBbsScheduleModal";
import { createClient } from "@/lib/supabase/server";
import { Scissors, ShieldCheck, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";

export default async function BbsPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real committed BBS schedules
  const { data: schedules } = await supabase
    .from("bar_bending_schedules")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const activeSchedules = schedules || [];

  const totalSteelWeightKg = activeSchedules.reduce(
    (sum, s) => sum + (Number(s.total_weight_kg) || 0),
    0
  );

  const avgScrapRate = activeSchedules.length > 0
    ? activeSchedules.reduce((sum, s) => sum + (Number(s.scrap_rate_pct) || 0), 0) / activeSchedules.length
    : 0;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Scissors className="w-3.5 h-3.5" />
            <span>IS 2502 &amp; IS 1786 REBAR COMPLIANCE • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Bar Bending Schedule (BBS) &amp; 12m Billet Nesting Engine
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Bend deductions (45° = 1d, 90° = 2d) and 1D off-cut scrap minimization.
          </p>
        </div>

        <NewBbsScheduleModal projectId={projectId} />
      </header>

      {/* 3 STATUTORY KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Optimal Scrap Ceiling</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            &le; 3.0%
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            Target nesting efficiency per CPWD Cl. 42 (Current avg: {avgScrapRate.toFixed(1)}%)
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Standard Density Formula</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            d&sup2; / 162.2 kg/m
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">IS 1786 unit weight derivation</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Committed Steel Weight</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">
            {(totalSteelWeightKg / 1000).toFixed(2)} MT ({totalSteelWeightKg.toLocaleString()} kg)
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Fe 500D TMT Primary Mill Stock</span>
        </div>
      </div>

      {/* REBAR SCHEDULES TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Committed Rebar Cutting Schedules ({activeSchedules.length})
          </span>
          <span className="text-[10px] text-zinc-500">Fabrication Yard Dispatch</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-zinc-950/80 border-b border-zinc-800 text-[10px] text-zinc-500 uppercase tracking-wider">
              <tr>
                <th className="p-3">Element Tag</th>
                <th className="p-3">Member Type</th>
                <th className="p-3 text-center">Dia (mm)</th>
                <th className="p-3 text-right">Bars</th>
                <th className="p-3 text-right">Cut Length (m)</th>
                <th className="p-3 text-right">Scrap Rate</th>
                <th className="p-3 text-right">Total Weight</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
              {activeSchedules.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-zinc-600 font-sans">
                    Zero custom BBS schedules committed yet. Click &quot;+ New BBS Schedule&quot; above to calculate bar cut lists.
                  </td>
                </tr>
              ) : (
                activeSchedules.map((s: any) => (
                  <tr key={s.id} className="hover:bg-zinc-850 transition">
                    <td className="p-3 font-bold text-white">{s.element_tag}</td>
                    <td className="p-3 text-zinc-400">{s.member_type}</td>
                    <td className="p-3 text-center font-bold text-cyan-400">T{s.bar_diameter_mm}</td>
                    <td className="p-3 text-right tabular-nums">{s.num_bars}</td>
                    <td className="p-3 text-right tabular-nums text-emerald-400">{Number(s.cutting_length_m).toFixed(2)} m</td>
                    <td className="p-3 text-right tabular-nums">
                      <span className={`font-bold ${Number(s.scrap_rate_pct) <= 3.0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {Number(s.scrap_rate_pct).toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3 text-right tabular-nums font-bold text-white">
                      {Number(s.total_weight_kg).toLocaleString()} kg
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {s.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
PAGE_BBS

# -----------------------------------------------------------------------------
# 5. VERIFY COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] BBS Billet Nesting Engine deployed cleanly with ZERO compilation errors!\033[0m"
