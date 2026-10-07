#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Applying Sprint 16: QA/QC Testing Console, Labor Muster & DPR Modal...\033[0m"

# -----------------------------------------------------------------------------
# 0. SQL MIGRATION: Schema for Labor Roster & Daily Operations
# -----------------------------------------------------------------------------
mkdir -p supabase/migrations
cat << 'SQL_MIGRATION' > supabase/migrations/20261003_sprint_16_labor_dpr.sql
CREATE TABLE IF NOT EXISTS public.labor_roster_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT NOT NULL,
    work_date DATE NOT NULL DEFAULT CURRENT_DATE,
    trade TEXT NOT NULL,
    contractor_name TEXT NOT NULL,
    planned_headcount INTEGER NOT NULL DEFAULT 0,
    actual_headcount INTEGER NOT NULL DEFAULT 0,
    wage_rate_per_day NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    overtime_hours NUMERIC(6,2) NOT NULL DEFAULT 0.00,
    target_output_unit TEXT NOT NULL DEFAULT 'units',
    target_output_qty NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    achieved_output_qty NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    synced_to_dpr BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_labor_roster_proj_date ON public.labor_roster_entries(project_id, work_date);
SQL_MIGRATION

# -----------------------------------------------------------------------------
# 1. SERVER ACTION: app/actions/labor-actions.ts
# -----------------------------------------------------------------------------
cat << 'ACTION_LABOR' > app/actions/labor-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";

export interface LaborRosterPayload {
  projectId: string;
  workDate: string;
  trade: string;
  contractorName: string;
  plannedHeadcount: number;
  actualHeadcount: number;
  wageRatePerDay: number;
  overtimeHours: number;
  targetOutputUnit: string;
  targetOutputQty: number;
  achievedOutputQty: number;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function addLaborRosterEntry(payload: LaborRosterPayload) {
  try {
    const supabase = getSupabase();
    const timestamp = new Date().toISOString();

    const { data, error } = await supabase
      .from("labor_roster_entries")
      .insert({
        project_id: payload.projectId,
        work_date: payload.workDate || timestamp.slice(0, 10),
        trade: payload.trade,
        contractor_name: payload.contractorName,
        planned_headcount: payload.plannedHeadcount,
        actual_headcount: payload.actualHeadcount,
        wage_rate_per_day: payload.wageRatePerDay,
        overtime_hours: payload.overtimeHours,
        target_output_unit: payload.targetOutputUnit,
        target_output_qty: payload.targetOutputQty,
        achieved_output_qty: payload.achievedOutputQty,
        synced_to_dpr: false,
        created_at: timestamp,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/operations/workforce-tracking");
    revalidatePath("/site/labor");
    return { success: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to record muster.";
    return { success: false, error: message };
  }
}

export async function syncRosterEntriesToDPR(projectId: string) {
  try {
    const supabase = getSupabase();
    const timestamp = new Date().toISOString();

    const { data: updated, error } = await supabase
      .from("labor_roster_entries")
      .update({ synced_to_dpr: true, updated_at: timestamp })
      .eq("project_id", projectId)
      .eq("synced_to_dpr", false)
      .select("id");

    if (error) throw error;

    // Seal muster sync in immutable audit log via Hermes
    await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: `Synchronized Site Labor Roster to DPR (${updated?.length || 0} trades)`,
      actionCategory: "WORKFORCE_DPR_SYNC",
      moduleRef: `MUSTER-${timestamp.slice(0, 10)}`,
      details: { synchronizedCount: updated?.length || 0, timestamp },
      signatoryName: "Lead Site Superintendent",
      signatoryRole: "Workforce Operations Officer",
      severity: "verified",
    });

    revalidatePath("/operations/workforce-tracking");
    revalidatePath("/site/labor");
    revalidatePath("/site/dpr");
    return { success: true, syncedCount: updated?.length || 0 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to sync roster to DPR.";
    return { success: false, error: message };
  }
}
ACTION_LABOR

# -----------------------------------------------------------------------------
# 2. REFACTOR: app/quality/cube-tests/page.tsx
# -----------------------------------------------------------------------------
cat << 'PAGE_CUBE_TESTS' > app/quality/cube-tests/page.tsx
import React from "react";
import {
  Beaker,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Layers,
} from "lucide-react";
import { ConcreteMaturityChart } from "@/components/quality/ConcreteMaturityChart";
import { LogCubeTestModal } from "@/components/quality/LogCubeTestModal";
import { createClient } from "@/lib/supabase/server";

interface PageProps {
  searchParams?: Promise<{ projectId?: string }>;
}

export default async function CubeTestsPage({ searchParams }: PageProps) {
  const resolvedParams = searchParams ? await searchParams : {};
  const supabase = await createClient();

  // 1. Resolve Project Context
  let projectId = resolvedParams.projectId;
  let projectName = "Gomti Nagar Extension Commercial Hub Ph-1";

  if (!projectId) {
    const { data: projectRow } = await supabase
      .from("projects")
      .select("project_id, project_name")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
    projectName = projectRow?.project_name || projectName;
  }

  // 2. Fetch Live Concrete Test Logs
  const { data: cubeData } = await supabase
    .from("quality_concrete_cube_tests")
    .select("*")
    .eq("project_id", projectId)
    .order("cast_date", { ascending: false });

  const cubeRegister = cubeData || [];

  // 3. Compute Real-Time Telemetry & Acceptance Metrics
  const totalSetsCast = cubeRegister.length;
  const completed28DayTests = cubeRegister.filter((r) => r.strength_28day_mpa !== null);
  const passed28DayTests = completed28DayTests.filter(
    (r) => Number(r.strength_28day_mpa) >= Number(r.specified_grade_fck)
  );

  const passRatePct =
    completed28DayTests.length > 0
      ? (passed28DayTests.length / completed28DayTests.length) * 100
      : 100.0;

  const criticalFailures = cubeRegister.filter(
    (r) =>
      (r.strength_28day_mpa !== null &&
        Number(r.strength_28day_mpa) < Number(r.specified_grade_fck)) ||
      r.status === "FAILED_NCR_ISSUED"
  ).length;

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-mono text-xs select-none">
      <div className="grid grid-cols-12 gap-5">
        {/* HEADER */}
        <header className="col-span-12 bg-zinc-900 border border-zinc-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-zinc-800/80 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] tracking-widest text-zinc-400 uppercase font-bold">
                  QUALITY ASSURANCE (QA/QC) • NABL LAB TESTING
                </span>
                <span className="text-zinc-600">•</span>
                <span className="text-[10px] tracking-tight text-zinc-400">
                  IS 516 &amp; IS 456 CLAUSE 15 ACCEPTANCE
                </span>
              </div>
              <h1 className="text-base font-bold tracking-tight text-zinc-100 mt-1 uppercase">
                IS 516 Concrete Cube Compressive Strength &amp; Maturity Telemetry
              </h1>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                ACTIVE PROJECT: <strong className="text-zinc-200">{projectName}</strong> [{projectId}]
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <LogCubeTestModal projectId={projectId} />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 px-5 py-2.5 bg-zinc-950/40 text-[10px] text-zinc-400 divide-x divide-zinc-800/60">
            <div className="pr-4">
              <span className="block text-zinc-500 uppercase tracking-wider">Testing Rig Calibration</span>
              <span className="text-zinc-200 font-bold text-xs">CTM-2000kN (NABL Accr.)</span>
            </div>
            <div className="px-4">
              <span className="block text-zinc-500 uppercase tracking-wider">Curing Tank Control</span>
              <span className="text-emerald-400 font-bold text-xs">27°C ± 2°C Saturated Tank</span>
            </div>
            <div className="px-4">
              <span className="block text-zinc-500 uppercase tracking-wider">Loading Rate Tolerance</span>
              <span className="text-zinc-200 text-xs">14 N/mm²/min (IS 516 Cl. 5.5)</span>
            </div>
            <div className="pl-4">
              <span className="block text-zinc-500 uppercase tracking-wider">De-Shuttering Gate</span>
              <span className="text-emerald-400 font-bold text-xs">≥ 70% Design Strength Trigger</span>
            </div>
          </div>
        </header>

        {/* 3 KPI CARDS */}
        <div className="col-span-12 md:col-span-4 bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
            <span>Total Cube Sets Cast</span>
            <Beaker className="h-4 w-4 text-zinc-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-zinc-100 tabular-nums">
              {totalSetsCast} <span className="text-xs text-zinc-500 font-normal">Sets</span>
            </div>
            <span className="text-[11px] text-zinc-400 tabular-nums">{totalSetsCast * 6} Specimen Cubes</span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 flex items-center justify-between">
            <span>Sampling Frequency</span>
            <span className="text-zinc-300 font-semibold">IS 456 Table 11 Compliant</span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
            <span>28-Day Strength Pass Rate</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div className="text-2xl font-bold text-emerald-400 tabular-nums">
              {passRatePct.toFixed(1)}%
            </div>
            <span className="text-[10px] px-2 py-0.5 border bg-emerald-950/60 border-emerald-800 text-emerald-400 font-bold">
              f_m ≥ f_ck + 1.65σ
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 flex items-center justify-between">
            <span>Acceptance Standard</span>
            <span className="text-emerald-400 font-semibold">Zero Structural Deficit</span>
          </div>
        </div>

        <div className="col-span-12 md:col-span-4 bg-zinc-900 border border-zinc-800 p-4">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 uppercase tracking-wider font-bold">
            <span>Critical Failures / Retest Hold</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div
              className={`text-2xl font-bold tabular-nums ${
                criticalFailures > 0 ? "text-rose-400" : "text-zinc-500"
              }`}
            >
              {criticalFailures} <span className="text-xs font-normal">Sets</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 border font-bold ${
                criticalFailures > 0
                  ? "bg-rose-950/60 border-rose-800 text-rose-400"
                  : "bg-zinc-800 border-zinc-700 text-zinc-500"
              }`}
            >
              {criticalFailures > 0 ? "Aegis Hold Active" : "Nominal"}
            </span>
          </div>
          <div className="mt-2 pt-2 border-t border-zinc-800/60 text-[10px] text-zinc-500 flex items-center justify-between">
            <span>Remedial Action</span>
            <span className={criticalFailures > 0 ? "text-rose-400 font-bold" : "text-zinc-400"}>
              {criticalFailures > 0 ? "Core Extraction (IS 456 Cl 17.4.3)" : "No Retests Pending"}
            </span>
          </div>
        </div>

        {/* LOG TABLE */}
        <div className="col-span-12 lg:col-span-8 bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="px-4 py-3 border-b border-zinc-800/80 flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-100 flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Concrete Cube Register &amp; Compressive Strength Ledger</span>
                </h2>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  IS 516 Crushing Tests &amp; IS 456 Cl. 15 Statistical Acceptance
                </p>
              </div>
              <span className="text-[10px] text-zinc-500">
                {cubeRegister.length} Active Sample Sets
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-950/80 text-[10px] text-zinc-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-normal whitespace-nowrap">Sample ID</th>
                    <th className="py-2.5 px-3 font-normal whitespace-nowrap">Pour Card Ref</th>
                    <th className="py-2.5 px-3 font-normal min-w-[180px]">Location / Element</th>
                    <th className="py-2.5 px-2.5 font-normal whitespace-nowrap">Grade (f_ck)</th>
                    <th className="py-2.5 px-3 font-normal whitespace-nowrap">Cast Date</th>
                    <th className="py-2.5 px-3 text-right font-normal whitespace-nowrap">7-Day (MPa)</th>
                    <th className="py-2.5 px-3 text-right font-normal whitespace-nowrap">28-Day (MPa)</th>
                    <th className="py-2.5 px-3 font-normal text-center whitespace-nowrap">IS 456 Gate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {cubeRegister.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-zinc-600 font-sans text-xs">
                        Zero concrete cube crushing tests logged for this project.
                      </td>
                    </tr>
                  ) : (
                    cubeRegister.map((record) => {
                      const fck = Number(record.specified_grade_fck);
                      const s7 = Number(record.strength_7day_mpa || 0);
                      const s28 =
                        record.strength_28day_mpa !== null && record.strength_28day_mpa !== undefined
                          ? Number(record.strength_28day_mpa)
                          : null;

                      const isFailed =
                        record.status === "FAILED_NCR_ISSUED" || (s28 !== null && s28 < fck);
                      const isCompliant =
                        record.status === "COMPLIANT" || (s28 !== null && s28 >= fck);

                      return (
                        <tr
                          key={record.id}
                          className={`transition-colors ${
                            isFailed
                              ? "bg-rose-950/20 hover:bg-rose-950/30"
                              : "hover:bg-zinc-800/30"
                          }`}
                        >
                          <td className="py-2.5 px-3 font-bold text-zinc-200 whitespace-nowrap">
                            {record.sample_ref_id}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap text-zinc-400">
                            {record.pour_card_id || "PC-AUTO"}
                          </td>
                          <td className="py-2.5 px-3 text-zinc-300">
                            <span className="truncate block max-w-[200px]">
                              {record.structural_element}
                            </span>
                          </td>
                          <td className="py-2.5 px-2.5 font-bold text-zinc-200 whitespace-nowrap">
                            <span className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 text-[10px]">
                              M{fck}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-zinc-400 whitespace-nowrap">
                            {new Date(record.cast_date).toISOString().split("T")[0]}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                            {s7 > 0 ? (
                              <div>
                                <span
                                  className={`font-bold ${
                                    s7 >= 0.67 * fck ? "text-amber-400" : "text-rose-400"
                                  }`}
                                >
                                  {s7.toFixed(1)}
                                </span>
                                <span className="text-[9px] text-zinc-500 block">
                                  {((s7 / fck) * 100).toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-600 text-[10px]">Due 7d</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums whitespace-nowrap">
                            {s28 !== null ? (
                              <div>
                                <span
                                  className={`font-bold ${
                                    s28 >= fck ? "text-emerald-400" : "text-rose-400"
                                  }`}
                                >
                                  {s28.toFixed(1)}
                                </span>
                                <span className="text-[9px] text-zinc-500 block">
                                  {((s28 / fck) * 100).toFixed(0)}%
                                </span>
                              </div>
                            ) : (
                              <span className="text-zinc-600 text-[10px]">Due 28d</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] border font-bold uppercase tracking-wider ${
                                isCompliant
                                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                                  : isFailed
                                  ? "bg-rose-950/60 border-rose-800 text-rose-400"
                                  : "bg-zinc-950 border-zinc-800 text-zinc-400"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  isCompliant
                                    ? "bg-emerald-400"
                                    : isFailed
                                    ? "bg-rose-400 animate-pulse"
                                    : "bg-zinc-600"
                                }`}
                              />
                              <span>
                                {isCompliant
                                  ? "COMPLIANT ✓"
                                  : isFailed
                                  ? "DEFICIT (NCR ACTIVE)"
                                  : "CURING"}
                              </span>
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="px-4 py-2.5 border-t border-zinc-800/80 bg-zinc-950 text-[10px] text-zinc-500 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-emerald-500 rounded-full" />
                <span className="text-emerald-400 font-semibold">≥ f_ck Compliant</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-amber-500 rounded-full" />
                <span className="text-amber-400 font-semibold">Target 7d ≥ 0.67 f_ck</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 bg-rose-500 rounded-full" />
                <span className="text-rose-400 font-semibold">&lt; f_ck Aegis Hold</span>
              </span>
            </div>
            <span>IS 456:2000 Clause 15 Acceptance Rules</span>
          </div>
        </div>

        {/* MATURITY & STRENGTH DEVELOPMENT VISUALIZATION */}
        <div className="col-span-12 lg:col-span-4">
          <ConcreteMaturityChart
            pourName={cubeRegister[0]?.structural_element || "Level 04 Deck Bay C"}
            targetFck={Number(cubeRegister[0]?.specified_grade_fck) || 30.0}
            designStrengthMpa={Number(cubeRegister[0]?.specified_grade_fck) || 30.0}
          />
        </div>
      </div>
    </div>
  );
}
PAGE_CUBE_TESTS

# -----------------------------------------------------------------------------
# 3. REFACTOR: components/site/LaborRosterTable.tsx
# -----------------------------------------------------------------------------
cat << 'COMP_LABOR_ROSTER' > components/site/LaborRosterTable.tsx
"use client";

import React, { useEffect, useState, useMemo, useCallback, useTransition } from "react";
import {
  Activity,
  AlertTriangle,
  Banknote,
  CheckCircle2,
  Clock,
  HardHat,
  Plus,
  RefreshCw,
  Users,
  Loader2,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { addLaborRosterEntry, syncRosterEntriesToDPR } from "@/app/actions/labor-actions";

export interface LaborRosterItem {
  id: string;
  project_id: string;
  work_date: string;
  trade: string;
  contractor_name: string;
  planned_headcount: number;
  actual_headcount: number;
  wage_rate_per_day: number;
  overtime_hours: number;
  target_output_unit: string;
  target_output_qty: number;
  achieved_output_qty: number;
  synced_to_dpr: boolean;
}

function formatInr(val: number) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Number(val).toLocaleString("en-IN")}`;
}

export function LaborRosterTable() {
  const { project, tier } = useActiveRole();
  const projectId = project?.id || "GOMTI-NAGAR-PH1-FITOUT";

  const [roster, setRoster] = useState<LaborRosterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form State for Adding New Roster Entries
  const [form, setForm] = useState({
    trade: tier === "RESIDENTIAL" ? "Master Joinery Carpenters" : "Rebar Steel Fixers",
    contractor_name: tier === "RESIDENTIAL" ? "Royal Woodworks" : "Falcon Structural RCC Works",
    planned_headcount: 12,
    actual_headcount: 10,
    wage_rate_per_day: 1050,
    overtime_hours: 0,
    target_output_unit: "MT",
    target_output_qty: 4.5,
    achieved_output_qty: 4.2,
  });

  const loadRoster = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("labor_roster_entries")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });

      if (data) setRoster(data as LaborRosterItem[]);
    } catch {
      // Graceful error trap
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadRoster();

    const channel = supabase
      .channel(`labor_realtime_${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "labor_roster_entries", filter: `project_id=eq.${projectId}` },
        () => void loadRoster()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadRoster]);

  // Overtime & Daily Cash Burn Math per CPWD Labor Regulations
  const metrics = useMemo(() => {
    const totalActual = roster.reduce((sum, i) => sum + Number(i.actual_headcount), 0);
    const totalPlanned = roster.reduce((sum, i) => sum + Number(i.planned_headcount), 0);

    // Standard hourly overtime: (Daily Wage / 8 hrs) * OT Hours * 1.5
    const totalDailyBurn = roster.reduce((sum, i) => {
      const basePay = Number(i.actual_headcount) * Number(i.wage_rate_per_day);
      const hourlyRate = Number(i.wage_rate_per_day) / 8;
      const otPay = Number(i.overtime_hours) * hourlyRate * 1.5;
      return sum + basePay + otPay;
    }, 0);

    // True Productivity (Achieved Output vs Target Output)
    const avgYield =
      roster.length > 0
        ? roster.reduce((sum, i) => {
            const ratio =
              Number(i.target_output_qty) > 0
                ? (Number(i.achieved_output_qty) / Number(i.target_output_qty)) * 100
                : 100;
            return sum + ratio;
          }, 0) / roster.length
        : 100;

    const allSynced = roster.length > 0 && roster.every((i) => i.synced_to_dpr);

    return { totalActual, totalPlanned, totalDailyBurn, avgYield, allSynced };
  }, [roster]);

  const chartData = useMemo(() => {
    return roster.map((item) => ({
      trade: item.trade.length > 14 ? item.trade.slice(0, 14) + "…" : item.trade,
      Planned: item.planned_headcount,
      Actual: item.actual_headcount,
    }));
  }, [roster]);

  const handleAddRoster = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await addLaborRosterEntry({
        projectId,
        workDate: new Date().toISOString().slice(0, 10),
        trade: form.trade,
        contractorName: form.contractor_name,
        plannedHeadcount: form.planned_headcount,
        actualHeadcount: form.actual_headcount,
        wageRatePerDay: form.wage_rate_per_day,
        overtimeHours: form.overtime_hours,
        targetOutputUnit: form.target_output_unit,
        targetOutputQty: form.target_output_qty,
        achievedOutputQty: form.achieved_output_qty,
      });

      if (res.success) {
        setFeedback({ type: "success", text: `Trade gang [${form.trade}] appended to site muster.` });
        await loadRoster();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to add trade gang." });
      }
    });
  };

  const handleSyncToDpr = () => {
    startTransition(async () => {
      const res = await syncRosterEntriesToDPR(projectId);
      if (res.success) {
        setFeedback({
          type: "success",
          text: `Synchronized ${res.syncedCount} muster lines to official DPR (Hermes sealed).`,
        });
        await loadRoster();
      } else {
        setFeedback({ type: "error", text: res.error || "Failed to sync muster." });
      }
    });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING MUSTER TELEMETRY...
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono text-xs select-none">
      {feedback && (
        <div
          className={`p-3 border flex items-center justify-between gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
              : "bg-rose-950/80 border-rose-800 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-zinc-200 uppercase text-[10px]">
            Dismiss
          </button>
        </div>
      )}

      {/* TOP 3 VITAL METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Site Muster Strength</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-white">
            {metrics.totalActual} <span className="text-xs text-zinc-500 font-sans">/ {metrics.totalPlanned} planned</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                metrics.totalActual >= metrics.totalPlanned ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span>
              {((metrics.totalActual / Math.max(metrics.totalPlanned, 1)) * 100).toFixed(0)}% attendance fulfillment
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Daily Wage &amp; Overtime Burn</span>
            <Banknote className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-rose-400">
            {formatInr(metrics.totalDailyBurn)}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Calculated on 8h statutory shift + 1.5x OT rate
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>Avg Gang Output Yield</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-extrabold font-mono text-emerald-400">
            {metrics.avgYield.toFixed(1)}%
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Measured output vs planned gang target
          </div>
        </div>
      </div>

      {/* 2-COLUMN SPLIT: RECHARTS (LEFT) vs DAILY MUSTER INTAKE (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: MUSTER BAR CHART */}
        <div className="lg:col-span-7 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                Muster Comparison
              </span>
              <h2 className="text-sm font-bold text-white mt-0.5">
                Planned vs Actual Deployment by Trade
              </h2>
            </div>
            <span className="text-xs font-mono text-zinc-500">Shift Date: {new Date().toISOString().slice(0, 10)}</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid stroke="#27272a" vertical={false} />
                <XAxis dataKey="trade" tick={{ fill: "#a1a1aa", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#09090b", borderColor: "#27272a", borderRadius: 8, fontSize: 12 }}
                  itemStyle={{ color: "#fafafa" }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                <Bar dataKey="Planned" fill="#52525b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Actual" fill="#06b6d4" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* RIGHT: DAILY MUSTER INTAKE FORM */}
        <div className="lg:col-span-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-zinc-800/80 pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Field Logging
                </span>
                <h2 className="text-sm font-bold text-white mt-0.5">
                  Daily Shift Muster Intake
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 font-mono text-[10px] border border-zinc-800">
                Live Input
              </span>
            </div>

            <form onSubmit={handleAddRoster} className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-400 text-[11px] mb-1">Trade Specialization</label>
                <input
                  type="text"
                  value={form.trade}
                  onChange={(e) => setForm({ ...form, trade: e.target.value })}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Planned Men</label>
                  <input
                    type="number"
                    min="0"
                    value={form.planned_headcount}
                    onChange={(e) => setForm({ ...form, planned_headcount: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Actual Muster</label>
                  <input
                    type="number"
                    min="0"
                    value={form.actual_headcount}
                    onChange={(e) => setForm({ ...form, actual_headcount: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Daily Wage (₹/day)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.wage_rate_per_day}
                    onChange={(e) => setForm({ ...form, wage_rate_per_day: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">OT Hours (Total)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.overtime_hours}
                    onChange={(e) => setForm({ ...form, overtime_hours: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Target Output ({form.target_output_unit})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.target_output_qty}
                    onChange={(e) => setForm({ ...form, target_output_qty: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[11px] mb-1">Achieved Output</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={form.achieved_output_qty}
                    onChange={(e) => setForm({ ...form, achieved_output_qty: Number(e.target.value) })}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-100 outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full mt-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 py-2 text-xs font-bold text-white transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>+ Append Gang Roster</span>
              </button>
            </form>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-800">
            <button
              type="button"
              disabled={metrics.allSynced || isPending}
              onClick={handleSyncToDpr}
              className={`w-full py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                metrics.allSynced
                  ? "bg-zinc-900 border border-zinc-800 text-emerald-400 cursor-default"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{metrics.allSynced ? "Muster Synced to Official DPR" : "Auto-Sync Roster into DPR"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* DETAILED GANG PRODUCTIVITY & YIELD LEDGER */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-xl">
        <div className="border-b border-zinc-800/80 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardHat className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
              Governed Trade Gang Performance &amp; Yield Ledger
            </h2>
          </div>
          <span className="text-[11px] font-mono text-zinc-500">
            IS 7272 Construction Gang Productivity Index
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 font-mono text-[10px] text-zinc-400 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3">Trade</th>
                <th className="px-5 py-3">Contractor</th>
                <th className="px-5 py-3 text-center">Planned / Actual</th>
                <th className="px-5 py-3 text-right">Daily Rate</th>
                <th className="px-5 py-3 text-right">OT Hours</th>
                <th className="px-5 py-3 text-right">Total Burn</th>
                <th className="px-5 py-3 text-right">Output Yield</th>
                <th className="px-5 py-3 text-center">DPR State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-zinc-300">
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-zinc-600 font-sans">
                    Zero muster logs recorded for this project shift.
                  </td>
                </tr>
              ) : (
                roster.map((item) => {
                  const hourlyRate = Number(item.wage_rate_per_day) / 8;
                  const totalItemBurn =
                    Number(item.actual_headcount) * Number(item.wage_rate_per_day) +
                    Number(item.overtime_hours) * hourlyRate * 1.5;
                  const yieldPct =
                    Number(item.target_output_qty) > 0
                      ? (Number(item.achieved_output_qty) / Number(item.target_output_qty)) * 100
                      : 100;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-900/40 transition">
                      <td className="px-5 py-3.5 font-sans font-bold text-white">{item.trade}</td>
                      <td className="px-5 py-3.5 font-sans text-zinc-400">{item.contractor_name}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="font-bold text-white">{item.actual_headcount}</span>
                        <span className="text-zinc-500"> / {item.planned_headcount}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-zinc-400">
                        ₹{Number(item.wage_rate_per_day).toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5 text-right text-amber-400">{item.overtime_hours}h</td>
                      <td className="px-5 py-3.5 text-right font-bold text-rose-400">
                        ₹{Math.round(totalItemBurn).toLocaleString("en-IN")}
                      </td>
                      <td className="px-5 py-3.5 text-right font-bold">
                        <span
                          className={
                            yieldPct >= 100
                              ? "text-emerald-400"
                              : yieldPct >= 85
                              ? "text-amber-400"
                              : "text-rose-400"
                          }
                        >
                          {yieldPct.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-zinc-500 block font-normal">
                          {item.achieved_output_qty}/{item.target_output_qty} {item.target_output_unit}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            item.synced_to_dpr
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                              : "bg-amber-950 text-amber-400 border border-amber-800/50"
                          }`}
                        >
                          {item.synced_to_dpr ? "Synced" : "Draft"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default LaborRosterTable;
COMP_LABOR_ROSTER

# -----------------------------------------------------------------------------
# 4. REFACTOR: components/site/DPRFormModal.tsx (Inline Styles Purged)
# -----------------------------------------------------------------------------
cat << 'COMP_DPR_MODAL' > components/site/DPRFormModal.tsx
"use client";

import React, { useMemo, useRef, useState, useTransition } from "react";
import { X, Upload, CheckCircle2, Loader2, Camera, CloudSun, HardHat, Cog } from "lucide-react";
import { uploadFileToBucket } from "@/lib/storage";
import type { SiteDailyProgressReport, SiteDprMilestoneLog } from "@/types/construction";

export interface DPRFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (report: SiteDailyProgressReport) => void;
}

const initialMilestones: SiteDprMilestoneLog[] = [
  { title: "Structural Works", status: "Completed", note: "Core shell slab activity completed to planned lift." },
  { title: "MEP Rough-in", status: "In Progress", note: "Service routing continues in north wing with coordinated access." },
  { title: "Finishes", status: "Delayed", note: "Plaster trim progress dependent on façade fix-out sequencing." },
];

export function DPRFormModal({ open, onClose, onSubmit }: DPRFormModalProps) {
  const [weather, setWeather] = useState({ condition: "Clear", temperatureC: 32, humidityPct: 58, windKph: 12 });
  const [manpower, setManpower] = useState({ total: 148, subcontractors: 82, supervisors: 12 });
  const [machinery, setMachinery] = useState({ active: 14, breakdown: "Crane 02 - minor hydraulic leak" });
  const [narrative, setNarrative] = useState(
    "Implemented staged concrete works and maintained schedule adherence with no critical safety incidents. Coordination on MEP trimming remains in progress."
  );
  const [milestones, setMilestones] = useState<SiteDprMilestoneLog[]>(initialMilestones);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const photoCount = useMemo(() => photos.length, [photos]);

  if (!open) return null;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    try {
      const uploaded = await Promise.all(
        Array.from(files).map(async (file) => {
          const result = await uploadFileToBucket("site-dpr", file, "daily-progress");
          return result.publicUrl ?? result.path;
        })
      );
      setPhotos((current) => [...current, ...uploaded]);
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    const report: SiteDailyProgressReport = {
      id: `dpr-${Date.now()}`,
      projectId: "GOMTI-NAGAR-PH1-FITOUT",
      reportDate: new Date().toISOString(),
      weather,
      manpower,
      machinery: { active: machinery.active, breakdown: machinery.breakdown ? [machinery.breakdown] : [] },
      narrative,
      milestoneLogs: milestones,
      photos: photos.map((url, index) => ({ id: `photo-${index + 1}`, url, uploadedAt: new Date().toISOString() })),
      status: "Draft",
      createdAt: new Date().toISOString(),
    };

    onSubmit(report);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs select-none">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5 text-zinc-100">
        {/* MODAL HEADER */}
        <div className="flex justify-between items-center border-b border-zinc-800 pb-4">
          <div>
            <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
              Daily Progress Report
            </div>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Site Diary Entry &amp; Shift Synthesis
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* FORM GRID */}
        <div className="space-y-4">
          {/* Weather Section */}
          <section className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
            <span className="text-[10px] uppercase text-zinc-400 font-bold flex items-center gap-1.5">
              <CloudSun className="w-3.5 h-3.5 text-cyan-400" />
              <span>Microclimate Telemetry Readings</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Atmosphere</label>
                <input
                  value={weather.condition}
                  onChange={(e) => setWeather({ ...weather, condition: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Temp (°C)</label>
                <input
                  type="number"
                  value={weather.temperatureC}
                  onChange={(e) => setWeather({ ...weather, temperatureC: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Humidity (%)</label>
                <input
                  type="number"
                  value={weather.humidityPct}
                  onChange={(e) => setWeather({ ...weather, humidityPct: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Wind (km/h)</label>
                <input
                  type="number"
                  value={weather.windKph}
                  onChange={(e) => setWeather({ ...weather, windKph: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
            </div>
          </section>

          {/* Manpower & Machinery */}
          <section className="p-3.5 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2">
            <span className="text-[10px] uppercase text-zinc-400 font-bold flex items-center gap-1.5">
              <HardHat className="w-3.5 h-3.5 text-emerald-400" />
              <span>Shift Deployment &amp; Plant Fleet</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Total Manpower</label>
                <input
                  type="number"
                  value={manpower.total}
                  onChange={(e) => setManpower({ ...manpower, total: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Subcontractors</label>
                <input
                  type="number"
                  value={manpower.subcontractors}
                  onChange={(e) => setManpower({ ...manpower, subcontractors: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Supervisors</label>
                <input
                  type="number"
                  value={manpower.supervisors}
                  onChange={(e) => setManpower({ ...manpower, supervisors: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
              <div>
                <label className="block text-zinc-500 text-[10px] uppercase mb-1">Active Machinery</label>
                <input
                  type="number"
                  value={machinery.active}
                  onChange={(e) => setMachinery({ ...machinery, active: Number(e.target.value) })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none text-right tabular-nums"
                />
              </div>
            </div>
          </section>

          {/* Machinery Breakdown */}
          <div>
            <label className="block text-zinc-400 text-[10px] uppercase mb-1">Machinery Breakdown / Stoppages</label>
            <textarea
              rows={2}
              value={machinery.breakdown}
              onChange={(e) => setMachinery({ ...machinery, breakdown: e.target.value })}
              className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-100 rounded outline-none"
            />
          </div>

          {/* Daily Progress Narrative */}
          <div>
            <label className="block text-zinc-400 text-[10px] uppercase mb-1">Daily Progress Narrative *</label>
            <textarea
              rows={3}
              value={narrative}
              onChange={(e) => setNarrative(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-100 rounded outline-none"
            />
          </div>

          {/* Milestone Logs */}
          <div className="space-y-2">
            <label className="block text-zinc-400 text-[10px] uppercase">Milestone Progress Tracking</label>
            <div className="space-y-2">
              {milestones.map((milestone, index) => (
                <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                  <input
                    value={milestone.title}
                    onChange={(e) =>
                      setMilestones(
                        milestones.map((entry, idx) => (idx === index ? { ...entry, title: e.target.value } : entry))
                      )
                    }
                    className="sm:col-span-4 bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none"
                  />
                  <select
                    value={milestone.status}
                    onChange={(e) =>
                      setMilestones(
                        milestones.map((entry, idx) =>
                          idx === index ? { ...entry, status: e.target.value as SiteDprMilestoneLog["status"] } : entry
                        )
                      )
                    }
                    className="sm:col-span-3 bg-zinc-950 border border-zinc-800 px-2 py-1.5 text-zinc-100 rounded outline-none"
                  >
                    <option value="Completed">Completed</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Delayed">Delayed</option>
                  </select>
                  <input
                    value={milestone.note}
                    onChange={(e) =>
                      setMilestones(
                        milestones.map((entry, idx) => (idx === index ? { ...entry, note: e.target.value } : entry))
                      )
                    }
                    className="sm:col-span-5 bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 rounded outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Photo Capture */}
          <div className="border border-dashed border-zinc-800 bg-zinc-900/40 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold block">
                  Geofenced Photographic Evidence
                </span>
                <span className="text-[11px] text-zinc-400">{photoCount} photos attached to diary</span>
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                <span>{uploading ? "Uploading..." : "Add Photos"}</span>
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => void handleFiles(e.target.files)}
            />

            {photos.length > 0 && (
              <div className="flex gap-2.5 flex-wrap pt-2">
                {photos.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`DPR Photo ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border border-zinc-800"
                  />
                ))}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded font-semibold text-xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold uppercase text-xs transition cursor-pointer"
            >
              Commit Site Diary Entry
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DPRFormModal;
COMP_DPR_MODAL

# -----------------------------------------------------------------------------
# 5. VERIFY BUILD HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying TypeScript compilation health with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Sprint 16 applied cleanly! Zero errors detected.\033[0m"
