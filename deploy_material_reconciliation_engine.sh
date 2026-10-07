#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating directory structures...\033[0m"
mkdir -p lib/materials app/actions components/materials app/materials/reconciliation

echo -e "\033[1;36m[+] Deploying Material Reconciliation & 1D Rebar BBS Engine (Vulcan / CPWD Cl. 42)...\033[0m"

# -----------------------------------------------------------------------------
# 1. ACTION: app/actions/material-actions.ts
# Integrates VulcanAgent, Clause 42 penal recovery, and 1D nesting optimization
# -----------------------------------------------------------------------------
cat << 'ACTION_MATERIAL' > app/actions/material-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { VulcanAgent } from "@/lib/agents/vulcan";
import { HermesAgent } from "@/lib/agents/hermes";

export interface ReconcileMaterialPayload {
  projectId: string;
  materialType: "STEEL" | "CEMENT";
  structuralElement: string;
  theoreticalQty: number;
  actualConsumedQty: number;
  stipulatedRateInr: number;
}

export interface OptimizeBbsPayload {
  projectId: string;
  structuralElement: string;
  barDiameterMm: number;
  cutLengthsM: number[];
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Material actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function reconcileMaterialConsumption(payload: ReconcileMaterialPayload) {
  try {
    const supabase = getSupabase();
    const reconciliationCode = `REC-${payload.materialType.slice(0, 3)}-${Date.now().toString().slice(-5)}`;

    // 1. Execute deterministic CPWD Cl. 42 evaluation via Vulcan Sub-Agent
    const evaluation = VulcanAgent.reconcileMaterials({
      material: payload.materialType,
      theoretical: payload.theoreticalQty,
      actual: payload.actualConsumedQty,
      rate: payload.stipulatedRateInr,
    });

    const permissibleVariationPct = payload.materialType === "STEEL" ? 3.0 : 2.0;
    const status = evaluation.isWithinTolerance
      ? "RECONCILED_WITHIN_TOLERANCE"
      : "PENAL_RECOVERY_DEBITED";

    // 2. Commit audit record to material_reconciliation_records
    const { data, error } = await supabase
      .from("material_reconciliation_records")
      .insert({
        project_id: payload.projectId,
        reconciliation_code: reconciliationCode,
        material_type: payload.materialType,
        structural_element: payload.structuralElement,
        theoretical_qty: payload.theoreticalQty,
        actual_consumed_qty: payload.actualConsumedQty,
        unit_of_measure: "MT",
        stipulated_rate_inr: payload.stipulatedRateInr,
        permissible_variation_pct: permissibleVariationPct,
        excess_consumption_qty: evaluation.excessQty,
        penal_recovery_inr: evaluation.penalDebitInr,
        status,
        reconciled_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Cryptographic Section 65B Notarization via Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `CPWD Cl. 42 Reconciliation: ${reconciliationCode} [${payload.materialType}]`,
      actionCategory: "MATERIALS_CL42_RECONCILIATION",
      moduleRef: reconciliationCode,
      details: {
        payload,
        evaluation,
        penalDebitInr: evaluation.penalDebitInr,
      } as Record<string, unknown>,
      signatoryName: "Agent Vulcan (Metallurgy & Materials Governor)",
      signatoryRole: "Autonomous Materials Adjudicator",
      severity: evaluation.isWithinTolerance ? "verified" : "critical",
    });

    await supabase
      .from("material_reconciliation_records")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    revalidatePath("/materials/reconciliation");
    revalidatePath("/commercial/ra-bills");
    revalidatePath("/");

    return { success: true, data, evaluation, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to reconcile materials." };
  }
}

export async function optimizeRebarCuttingSchedule(payload: OptimizeBbsPayload) {
  try {
    const supabase = getSupabase();
    const scheduleCode = `BBS-${payload.barDiameterMm}MM-${Date.now().toString().slice(-5)}`;

    // 1. Execute deterministic 1D nesting optimization via Vulcan Sub-Agent
    const nesting = VulcanAgent.optimizeRebarNesting(payload.cutLengthsM);

    // 2. Commit cutting schedule to rebar_cutting_schedules
    const { data, error } = await supabase
      .from("rebar_cutting_schedules")
      .insert({
        project_id: payload.projectId,
        schedule_code: scheduleCode,
        structural_element: payload.structuralElement,
        bar_diameter_mm: payload.barDiameterMm,
        cut_lengths_json: payload.cutLengthsM,
        stock_billet_length_m: 12.0,
        billets_required_count: nesting.billetsNeeded,
        total_waste_m: nesting.totalWasteM,
        salvaged_offcut_m: nesting.salvagedM,
        true_scrap_pct: nesting.trueScrapPct,
        is_compliant: nesting.isCompliant,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Cryptographic Section 65B Notarization via Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Rebar BBS 1D Nesting Certified: ${scheduleCode} (${nesting.billetsNeeded} Billets)`,
      actionCategory: "MATERIALS_REBAR_BBS_OPTIMIZED",
      moduleRef: scheduleCode,
      details: { payload, nesting } as Record<string, unknown>,
      signatoryName: "Agent Vulcan (Metallurgy & Materials Governor)",
      signatoryRole: "Autonomous Materials Adjudicator",
      severity: nesting.isCompliant ? "verified" : "warning",
    });

    await supabase
      .from("rebar_cutting_schedules")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    revalidatePath("/materials/reconciliation");
    revalidatePath("/");

    return { success: true, data, nesting, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to optimize rebar schedule." };
  }
}
ACTION_MATERIAL

# -----------------------------------------------------------------------------
# 2. COMPONENT: components/materials/ReconcileMaterialModal.tsx
# Field dialog for logging CPWD Cl. 42 material consumption audits
# -----------------------------------------------------------------------------
cat << 'COMP_REC_MODAL' > components/materials/ReconcileMaterialModal.tsx
"use client";

import React, { useState } from "react";
import { reconcileMaterialConsumption } from "@/app/actions/material-actions";
import { Plus, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function ReconcileMaterialModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [materialType, setMaterialType] = useState<"STEEL" | "CEMENT">("STEEL");
  const [structuralElement, setStructuralElement] = useState("Tower Core SW-1 to SW-4 (L3 to L5)");
  const [theoreticalQty, setTheoreticalQty] = useState(120.0);
  const [actualConsumedQty, setActualConsumedQty] = useState(124.5);
  const [stipulatedRateInr, setStipulatedRateInr] = useState(65000);

  // Live CPWD Cl. 42 Preview
  const tolerancePct = materialType === "STEEL" ? 0.03 : 0.02;
  const permissibleLimit = theoreticalQty * (1 + tolerancePct);
  const excessQty = Math.max(0, actualConsumedQty - permissibleLimit);
  const penalDebitInr = Math.round(excessQty * (stipulatedRateInr * 2.0));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await reconcileMaterialConsumption({
        projectId,
        materialType,
        structuralElement,
        theoreticalQty,
        actualConsumedQty,
        stipulatedRateInr,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to reconcile material.");
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
        className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Run Cl. 42 Reconciliation</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">
                  CPWD GCC Clause 42 • Materials Governance
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Material Consumption Reconciliation
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
                    Material Type
                  </label>
                  <select
                    value={materialType}
                    onChange={(e) => {
                      const t = e.target.value as "STEEL" | "CEMENT";
                      setMaterialType(t);
                      setStipulatedRateInr(t === "STEEL" ? 65000 : 7200);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  >
                    <option value="STEEL">Structural Steel / TMT (+3% Tol.)</option>
                    <option value="CEMENT">OPC 53 Cement (+2% Tol.)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Stipulated Rate (₹/MT)
                  </label>
                  <input
                    type="number"
                    required
                    value={stipulatedRateInr}
                    onChange={(e) => setStipulatedRateInr(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Structural Element Scope
                </label>
                <input
                  type="text"
                  required
                  value={structuralElement}
                  onChange={(e) => setStructuralElement(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Theoretical Requirement (MT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={theoreticalQty}
                    onChange={(e) => setTheoreticalQty(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs text-center"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Actual Inward Consumed (MT)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={actualConsumedQty}
                    onChange={(e) => setActualConsumedQty(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold text-center"
                  />
                </div>
              </div>

              {/* STATUTORY CLAUSE 42 PREVIEW */}
              <div className={`p-3 rounded-xl border space-y-1 text-[11px] ${
                excessQty > 0 ? "bg-rose-950/40 border-rose-800/80" : "bg-emerald-950/40 border-emerald-800/80"
              }`}>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Permissible Ceiling (+{(tolerancePct * 100).toFixed(0)}%):</span>
                  <span className="font-bold text-white font-mono">{permissibleLimit.toFixed(2)} MT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Excess Unallowable Wastage:</span>
                  <span className={`font-bold font-mono ${excessQty > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {excessQty.toFixed(2)} MT
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-1 font-bold">
                  <span className="text-zinc-300">Penal Debit (2x Rate):</span>
                  <span className={`font-mono ${excessQty > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    ₹{penalDebitInr.toLocaleString("en-IN")}
                  </span>
                </div>
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
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Certify Reconciliation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_REC_MODAL

# -----------------------------------------------------------------------------
# 3. COMPONENT: components/materials/OptimizeBbsModal.tsx
# 1D nesting solver for rebar cutting schedules against 12.0m billets
# -----------------------------------------------------------------------------
cat << 'COMP_BBS_MODAL' > components/materials/OptimizeBbsModal.tsx
"use client";

import React, { useState } from "react";
import { optimizeRebarCuttingSchedule } from "@/app/actions/material-actions";
import { Scissors, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function OptimizeBbsModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [structuralElement, setStructuralElement] = useState("Core Column C2 Main Rebar (L4)");
  const [barDiameterMm, setBarDiameterMm] = useState(25);
  const [cutLengthsInput, setCutLengthsInput] = useState("5.8, 5.8, 4.2, 4.2, 3.8, 3.8, 2.4, 2.4");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const cutLengthsM = cutLengthsInput
        .split(",")
        .map((s) => parseFloat(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);

      if (cutLengthsM.length === 0) {
        alert("Please provide valid comma-separated cut lengths in meters.");
        return;
      }

      const res = await optimizeRebarCuttingSchedule({
        projectId,
        structuralElement,
        barDiameterMm,
        cutLengthsM,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to optimize cutting schedule.");
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
        className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-950/40"
      >
        <Scissors className="w-3.5 h-3.5" />
        <span>+ Optimize Rebar BBS</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  IS 2502 • 1D Billet Cutting-Stock Optimizer
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Optimize Bar Bending Schedule
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
                    Bar Diameter (mm)
                  </label>
                  <select
                    value={barDiameterMm}
                    onChange={(e) => setBarDiameterMm(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  >
                    {[8, 10, 12, 16, 20, 25, 32].map((d) => (
                      <option key={d} value={d}>{d} mm ({(d * d / 162.2).toFixed(2)} kg/m)</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Stock Billet Length
                  </label>
                  <input
                    type="text"
                    disabled
                    value="12.00 meters (Standard)"
                    className="w-full bg-zinc-900/50 border border-zinc-800/80 rounded-lg p-2 text-zinc-400 text-xs text-center"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Structural Element Scope
                </label>
                <input
                  type="text"
                  required
                  value={structuralElement}
                  onChange={(e) => setStructuralElement(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Required Cut Lengths in Meters (Comma-Separated)
                </label>
                <textarea
                  rows={3}
                  required
                  value={cutLengthsInput}
                  onChange={(e) => setCutLengthsInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-300 font-mono text-xs"
                />
                <span className="text-[9px] text-zinc-500 block mt-1">
                  Vulcan runs a Best-Fit Decreasing heuristic to pack pieces into minimum 12m stock billets with salvage calculation[cite: 1].
                </span>
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
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Execute 1D Nesting</span>
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
# 4. PAGE: app/materials/reconciliation/page.tsx
# Connected to live reconciliations & cutting schedules
# -----------------------------------------------------------------------------
cat << 'PAGE_MATERIALS' > app/materials/reconciliation/page.tsx
import React from "react";
import { ReconcileMaterialModal } from "@/components/materials/ReconcileMaterialModal";
import { OptimizeBbsModal } from "@/components/materials/OptimizeBbsModal";
import { createClient } from "@/lib/supabase/server";
import { Box, Layers, Scissors, ShieldAlert, CheckCircle2, AlertTriangle } from "lucide-react";

export default async function MaterialReconciliationPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch material reconciliations & cutting schedules
  const [reconcileRes, bbsRes] = await Promise.all([
    supabase.from("material_reconciliation_records").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("rebar_cutting_schedules").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);

  const reconciliations = reconcileRes.data || [];
  const bbsSchedules = bbsRes.data || [];

  const totalPenalDebitInr = reconciliations.reduce((s, r) => s + (Number(r.penal_recovery_inr) || 0), 0);
  const breachedCount = reconciliations.filter((r) => r.status === "PENAL_RECOVERY_DEBITED").length;
  const compliantBbsCount = bbsSchedules.filter((b) => b.is_compliant).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-amber-400 uppercase tracking-widest font-bold">
            <Box className="w-3.5 h-3.5" />
            <span>MATERIALS &amp; METALLURGY GOVERNANCE • CPWD GCC CL. 42 / IS 2502 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Material Reconciliation &amp; 1D Rebar Nesting
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Clause 42 penal recoveries, 1D billet cutting-stock optimization, and Section 65B notarized material manifests[cite: 1].
          </p>
        </div>

        <div className="flex items-center gap-2">
          <OptimizeBbsModal projectId={projectId} />
          <ReconcileMaterialModal projectId={projectId} />
        </div>
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Audits Committed</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{reconciliations.length} Records</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Theoretical vs Inward</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Clause 42 Penal Debits</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${totalPenalDebitInr > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            ₹{(totalPenalDebitInr / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Assessed at 2x stipulated rate[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">BBS Optimizations</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">{bbsSchedules.length} Schedules</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{compliantBbsCount} compliant with &le; 3% scrap[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Tolerance Ceiling Breaches</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${breachedCount > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {breachedCount} Breaches
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {breachedCount > 0 ? "Excess wastage debited to IPC" : "100% within statutory limit"}
          </span>
        </div>
      </div>

      {/* DUAL PANELS: CLAUSE 42 AUDITS & BBS SCHEDULES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: CLAUSE 42 RECONCILIATIONS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              CPWD Clause 42 Material Register ({reconciliations.length})
            </span>
            <span className="text-[10px] text-zinc-500">2x Rate Penal Audit[cite: 1]</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {reconciliations.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero reconciliations logged. Click &quot;+ Run Cl. 42 Reconciliation&quot; to audit consumed materials.
              </div>
            ) : (
              reconciliations.map((rec: any) => {
                const hasExcess = Number(rec.excess_consumption_qty) > 0;
                return (
                  <div key={rec.id} className="p-4 space-y-1.5 hover:bg-zinc-850/50 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-bold text-[10px]">
                          {rec.reconciliation_code}
                        </span>
                        <strong className="text-white text-xs">{rec.material_type}</strong>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        hasExcess ? "bg-rose-950 border border-rose-800 text-rose-300" : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                      }`}>
                        {hasExcess ? `+${rec.excess_consumption_qty} MT Excess` : "Within Ceiling"}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 font-sans">
                      {rec.structural_element}
                    </div>

                    <div className="flex justify-between text-[10px] text-zinc-400 border-t border-zinc-800/80 pt-1.5 font-mono">
                      <span>Theo: <strong className="text-zinc-200">{rec.theoretical_qty} MT</strong></span>
                      <span>Actual: <strong className="text-zinc-200">{rec.actual_consumed_qty} MT</strong></span>
                      <span>Penal: <strong className={hasExcess ? "text-rose-400" : "text-emerald-400"}>
                        ₹{Number(rec.penal_recovery_inr).toLocaleString("en-IN")}
                      </strong></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: REBAR BBS NESTING SCHEDULES */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Optimized BBS Cutting Schedules ({bbsSchedules.length})
            </span>
            <span className="text-[10px] text-zinc-500">IS 2502 12m Billet Nesting[cite: 1]</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {bbsSchedules.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero BBS schedules optimized. Click &quot;+ Optimize Rebar BBS&quot; to nest cut lengths against 12m stock.
              </div>
            ) : (
              bbsSchedules.map((bbs: any) => (
                <div key={bbs.id} className="p-4 space-y-1.5 hover:bg-zinc-850/50 transition">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-[10px]">
                        {bbs.schedule_code}
                      </span>
                      <strong className="text-white text-xs">{bbs.bar_diameter_mm} mm TMT</strong>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                      bbs.is_compliant ? "bg-emerald-950 border border-emerald-800 text-emerald-300" : "bg-amber-950 border border-amber-800 text-amber-300"
                    }`}>
                      {bbs.is_compliant ? "Scrap &le; 3% Compliant" : `${bbs.true_scrap_pct}% Scrap (High)`}[cite: 1]
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 font-sans">
                    {bbs.structural_element}
                  </div>

                  <div className="flex justify-between text-[10px] text-zinc-400 border-t border-zinc-800/80 pt-1.5 font-mono">
                    <span>12m Billets: <strong className="text-zinc-200">{bbs.billets_required_count}</strong></span>
                    <span>Salvaged: <strong className="text-cyan-400">{bbs.salvaged_offcut_m}m</strong></span>
                    <span>True Scrap: <strong className={bbs.is_compliant ? "text-emerald-400" : "text-amber-400"}>
                      {bbs.true_scrap_pct}% ({bbs.total_waste_m}m)
                    </strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
PAGE_MATERIALS

# -----------------------------------------------------------------------------
# 5. VERIFY COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Material Reconciliation & BBS Engine deployed cleanly with ZERO compilation errors!\033[0m"
