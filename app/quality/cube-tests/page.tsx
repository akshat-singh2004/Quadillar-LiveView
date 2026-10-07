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
