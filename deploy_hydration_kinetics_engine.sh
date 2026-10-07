#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating directory structures...\033[0m"
mkdir -p lib/quality app/actions components/quality app/quality/thermal-hydration

echo -e "\033[1;36m[+] Deploying Concrete Hydration Kinetics & Formwork Stripping Engine (Daedalus / CIRIA C766)...\033[0m"

# -----------------------------------------------------------------------------
# 1. ACTION: app/actions/hydration-actions.ts
# Evaluates DaedalusAgent, ASTM C1074 maturity, and CIRIA C766 thermal gradients
# -----------------------------------------------------------------------------
cat << 'ACTION_HYDRATION' > app/actions/hydration-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { DaedalusAgent } from "@/lib/agents/daedalus";
import { HermesAgent } from "@/lib/agents/hermes";

export interface LogHydrationReadingPayload {
  projectId: string;
  pourCardId: string;
  structuralElement: string;
  sensorNodeCode: string;
  coreTempC: number;
  surfaceTempC: number;
  ambientTempC: number;
  hoursSincePour: number;
  targetFckMpa: number;
}

export interface AuthorizeStrippingPayload {
  projectId: string;
  pourCardId: string;
  structuralElement: string;
  gridLocation: string;
  targetFckMpa: number;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Hydration actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function logHydrationReading(payload: LogHydrationReadingPayload) {
  try {
    const supabase = getSupabase();

    // 1. Execute deterministic hydration kinetics & CIRIA C766 evaluation via Daedalus
    const evalResult = DaedalusAgent.evaluateHydrationKinetics({
      coreTempC: payload.coreTempC,
      surfaceTempC: payload.surfaceTempC,
      ambientTempC: payload.ambientTempC,
      hoursSincePour: payload.hoursSincePour,
      targetFckMpa: payload.targetFckMpa,
    });

    // 2. Commit telemetry record to concrete_hydration_telemetry
    const { data, error } = await supabase
      .from("concrete_hydration_telemetry")
      .insert({
        project_id: payload.projectId,
        pour_card_id: payload.pourCardId,
        structural_element: payload.structuralElement,
        sensor_node_code: payload.sensorNodeCode,
        core_temp_c: payload.coreTempC,
        surface_temp_c: payload.surfaceTempC,
        ambient_temp_c: payload.ambientTempC,
        hours_since_pour: payload.hoursSincePour,
        target_fck_mpa: payload.targetFckMpa,
        differential_temp_c: evalResult.differentialTempC,
        maturity_index_deg_hrs: evalResult.maturityIndexCdegHours,
        estimated_strength_mpa: evalResult.estimatedStrengthMpa,
        is_def_risk: evalResult.isDefRisk,
        is_thermal_crack_risk: evalResult.isThermalCrackRisk,
        stripping_permitted: evalResult.strippingPermitted,
        evaluation_verdict: evalResult.verdict,
        logged_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Notarize critical thermal anomalies if gradient breached
    if (evalResult.isThermalCrackRisk || evalResult.isDefRisk) {
      await HermesAgent.notarizeTransaction({
        projectId: payload.projectId,
        actionTitle: `CIRIA C766 Thermal Hold: ${payload.pourCardId} (ΔT=${evalResult.differentialTempC}°C)`,
        actionCategory: "QUALITY_THERMAL_GRADIENT_BREACH",
        moduleRef: payload.pourCardId,
        details: { payload, evalResult } as Record<string, unknown>,
        signatoryName: "Agent Daedalus (Hydration Governor)",
        signatoryRole: "Autonomous Thermodynamic Adjudicator",
        severity: "critical",
      });
    }

    revalidatePath("/quality/thermal-hydration");
    revalidatePath("/");

    return { success: true, data, evalResult };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to commit hydration telemetry." };
  }
}

export async function authorizeFormworkStripping(payload: AuthorizeStrippingPayload) {
  try {
    const supabase = getSupabase();
    const permitNumber = `STRIP-${Date.now().toString().slice(-6)}`;

    // 1. Fetch latest telemetry reading for this pour
    const { data: latestReading, error: fetchErr } = await supabase
      .from("concrete_hydration_telemetry")
      .select("*")
      .eq("pour_card_id", payload.pourCardId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !latestReading) {
      return { success: false, error: "No thermal telemetry recorded for this pour card." };
    }

    if (!latestReading.stripping_permitted) {
      return {
        success: false,
        error: `STRIPPING REJECTED: In-situ strength ${latestReading.estimated_strength_mpa} MPa has not reached 70% threshold (${payload.targetFckMpa * 0.70} MPa) or thermal gradient ΔT=${latestReading.differential_temp_c}°C exceeds 20°C limit.`,
      };
    }

    const strengthRatioPct = parseFloat(
      ((latestReading.estimated_strength_mpa / payload.targetFckMpa) * 100).toFixed(1)
    );

    // 2. Cryptographic Section 65B Notarization via Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Formwork Stripping Authorized: ${permitNumber} [${strengthRatioPct}% f_ck]`,
      actionCategory: "QUALITY_FORMWORK_STRIPPING_AUTHORIZED",
      moduleRef: permitNumber,
      details: {
        payload,
        latestReading,
        strengthRatioPct,
      } as Record<string, unknown>,
      signatoryName: "Agent Daedalus (Hydration Governor)",
      signatoryRole: "Autonomous Thermodynamic Adjudicator",
      severity: "verified",
    });

    // 3. Commit Permit Record
    const { data, error } = await supabase
      .from("formwork_stripping_permits")
      .insert({
        project_id: payload.projectId,
        permit_number: permitNumber,
        pour_card_id: payload.pourCardId,
        structural_element: payload.structuralElement,
        grid_location: payload.gridLocation,
        target_fck_mpa: payload.targetFckMpa,
        achieved_strength_mpa: latestReading.estimated_strength_mpa,
        strength_ratio_pct: strengthRatioPct,
        differential_temp_c: latestReading.differential_temp_c,
        status: "STRIPPING_AUTHORIZED",
        seor_signoff_hash: seal.blockHash,
        cleared_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath("/quality/thermal-hydration");
    revalidatePath("/quality/pour-cards");
    revalidatePath("/");

    return { success: true, data, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to authorize formwork stripping." };
  }
}
ACTION_HYDRATION

# -----------------------------------------------------------------------------
# 2. COMPONENT: components/quality/LogHydrationTelemetryModal.tsx
# Field dialog for thermocouple ingest with real-time gradient & DEF preview
# -----------------------------------------------------------------------------
cat << 'COMP_HYDRATION_MODAL' > components/quality/LogHydrationTelemetryModal.tsx
"use client";

import React, { useState } from "react";
import { logHydrationReading } from "@/app/actions/hydration-actions";
import { Plus, Thermometer, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function LogHydrationTelemetryModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [pourCardId, setPourCardId] = useState("PC-940211");
  const [structuralElement, setStructuralElement] = useState("Raft Foundation Bay R-02 (2.4m Depth)");
  const [sensorNodeCode] = useState("TH-NODE-B2-CORE");
  const [coreTempC, setCoreTempC] = useState(56.5);
  const [surfaceTempC, setSurfaceTempC] = useState(38.0);
  const [ambientTempC, setAmbientTempC] = useState(28.0);
  const [hoursSincePour, setHoursSincePour] = useState(44);
  const [targetFckMpa, setTargetFckMpa] = useState(40);

  // Live ASTM / CIRIA Calculation Previews
  const deltaT = parseFloat(Math.abs(coreTempC - surfaceTempC).toFixed(1));
  const isGradientSafe = deltaT <= 20.0;
  const isDefSafe = coreTempC <= 70.0;
  const avgTemp = (coreTempC + surfaceTempC) / 2;
  const maturityIndex = Math.max(0, Math.round((avgTemp - (-10.0)) * hoursSincePour));
  const normalizedProgress = Math.log10(Math.max(10, maturityIndex)) / 3.8;
  const estimatedStrength = parseFloat(Math.min(targetFckMpa * 1.15, targetFckMpa * normalizedProgress).toFixed(2));
  const strippingAllowed = estimatedStrength >= targetFckMpa * 0.70 && isGradientSafe && isDefSafe;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await logHydrationReading({
        projectId,
        pourCardId,
        structuralElement,
        sensorNodeCode,
        coreTempC,
        surfaceTempC,
        ambientTempC,
        hoursSincePour,
        targetFckMpa,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to log telemetry.");
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
        <Plus className="w-3.5 h-3.5" />
        <span>+ Log Thermocouple Reading</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  ASTM C1074 / CIRIA C766 • Hydration Kinetics
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Record Thermocouple Telemetry
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
                    Pour Card Reference
                  </label>
                  <input
                    type="text"
                    required
                    value={pourCardId}
                    onChange={(e) => setPourCardId(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-400 text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Specified Grade f_ck (MPa)
                  </label>
                  <input
                    type="number"
                    required
                    value={targetFckMpa}
                    onChange={(e) => setTargetFckMpa(Number(e.target.value))}
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

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Core Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={coreTempC}
                    onChange={(e) => setCoreTempC(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-rose-400 font-bold text-center text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Surface Temp (°C)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={surfaceTempC}
                    onChange={(e) => setSurfaceTempC(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-amber-400 font-bold text-center text-xs"
                  />
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Hours Elapsed
                  </label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={hoursSincePour}
                    onChange={(e) => setHoursSincePour(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded p-1.5 text-cyan-300 font-bold text-center text-xs"
                  />
                </div>
              </div>

              {/* STATUTORY PREVIEW CARD */}
              <div className={`p-3 rounded-xl border space-y-1.5 text-[10px] ${
                !isGradientSafe ? "bg-rose-950/40 border-rose-800/80" : "bg-zinc-900/60 border-zinc-800"
              }`}>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Core-to-Surface Differential (CIRIA C766):</span>
                  <span className={`font-bold font-mono ${isGradientSafe ? "text-emerald-400" : "text-rose-400"}`}>
                    ΔT = {deltaT}°C {isGradientSafe ? "(Safe ≤ 20°C)" : "(CRACK RISK > 20°C)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Maturity Index (Nurse-Saul):</span>
                  <span className="text-white font-mono">{maturityIndex} °C·hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Estimated Compressive Strength:</span>
                  <span className="font-bold text-cyan-400 font-mono">
                    {estimatedStrength} MPa ({((estimatedStrength / targetFckMpa) * 100).toFixed(0)}% f_ck)
                  </span>
                </div>
                <div className="border-t border-zinc-800 pt-1.5 flex justify-between font-bold">
                  <span className="text-zinc-300">Formwork De-shuttering Gate:</span>
                  <span className={strippingAllowed ? "text-emerald-400" : "text-amber-400"}>
                    {strippingAllowed ? "✓ Ready to Strip (≥ 70% & ΔT Safe)" : "Hold (Curing Required)"}
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
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit Telemetry</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_HYDRATION_MODAL

# -----------------------------------------------------------------------------
# 3. PAGE: app/quality/thermal-hydration/page.tsx
# Connected to live telemetry and formwork stripping permits
# -----------------------------------------------------------------------------
cat << 'PAGE_HYDRATION' > app/quality/thermal-hydration/page.tsx
import React from "react";
import { LogHydrationTelemetryModal } from "@/components/quality/LogHydrationTelemetryModal";
import { createClient } from "@/lib/supabase/server";
import { authorizeFormworkStripping } from "@/app/actions/hydration-actions";
import { Thermometer, ShieldCheck, ShieldAlert, Layers, CheckCircle2, Lock } from "lucide-react";

export default async function ThermalHydrationPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch telemetry logs & stripping permits
  const [telemetryRes, permitsRes] = await Promise.all([
    supabase.from("concrete_hydration_telemetry").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("formwork_stripping_permits").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);

  const telemetryLogs = telemetryRes.data || [];
  const strippingPermits = permitsRes.data || [];

  const thermalBreaches = telemetryLogs.filter((t) => t.is_thermal_crack_risk || t.is_def_risk).length;
  const readyToStripCount = telemetryLogs.filter((t) => t.stripping_permitted).length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Thermometer className="w-3.5 h-3.5" />
            <span>THERMODYNAMICS &amp; STRUCTURAL QUALITY • ASTM C1074 / CIRIA C766 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Concrete Hydration Kinetics &amp; Formwork Stripping
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Nurse-Saul maturity calculation, CIRIA early thermal cracking limits (&Delta;T &le; 20&deg;C), and Section 65B stripping permits.
          </p>
        </div>

        <LogHydrationTelemetryModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Thermocouple Readings</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{telemetryLogs.length} Records</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Real-time core &amp; surface log</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Thermal Gradient Limit</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">&Delta;T &le; 20.0&deg;C</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">CIRIA C766 crack prevention</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">De-shuttering Cleared</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">{readyToStripCount} Elements</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Achieved &ge; 70% characteristic f_ck</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active Thermal Holds</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${thermalBreaches > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {thermalBreaches} Breaches
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {thermalBreaches > 0 ? "Insulation blankets deployed" : "Zero thermal gradient risks"}
          </span>
        </div>
      </div>

      {/* DUAL PANELS: TELEMETRY STREAM & STRIPPING PERMITS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: THERMAL TELEMETRY READINGS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Live Hydration Telemetry Log ({telemetryLogs.length})
            </span>
            <span className="text-[10px] text-zinc-500">ASTM C1074 Sensor Network</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {telemetryLogs.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero telemetry recorded. Click &quot;+ Log Thermocouple Reading&quot; to log in-situ concrete hydration data.
              </div>
            ) : (
              telemetryLogs.map((log: any) => {
                const isCrackRisk = log.is_thermal_crack_risk;
                return (
                  <div key={log.id} className="p-4 space-y-2 hover:bg-zinc-850/50 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-[10px]">
                          {log.pour_card_id}
                        </span>
                        <strong className="text-white text-xs">{log.structural_element}</strong>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isCrackRisk ? "bg-rose-950 border border-rose-800 text-rose-300" : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                      }`}>
                        &Delta;T = {log.differential_temp_c}&deg;C {isCrackRisk ? "(Hold)" : "(Safe)"}
                      </span>
                    </div>

                    <div className="flex justify-between text-[11px] text-zinc-400 font-sans">
                      <span>Core: <strong className="text-rose-400 font-mono">{log.core_temp_c}&deg;C</strong></span>
                      <span>Surface: <strong className="text-amber-400 font-mono">{log.surface_temp_c}&deg;C</strong></span>
                      <span>Age: <strong className="text-zinc-200 font-mono">{log.hours_since_pour}h</strong></span>
                      <span>Strength: <strong className="text-emerald-400 font-mono">{log.estimated_strength_mpa} MPa</strong></span>
                    </div>

                    <div className="flex justify-between items-center border-t border-zinc-800/80 pt-2">
                      <span className="text-[10px] text-zinc-500 font-mono">
                        Maturity: {log.maturity_index_deg_hrs} &deg;C&middot;hrs
                      </span>

                      {log.stripping_permitted && (
                        <form
                          action={async () => {
                            "use server";
                            await authorizeFormworkStripping({
                              projectId,
                              pourCardId: log.pour_card_id,
                              structuralElement: log.structural_element,
                              gridLocation: "Tower Core Axis",
                              targetFckMpa: log.target_fck_mpa,
                            });
                          }}
                        >
                          <button
                            type="submit"
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[9px] transition cursor-pointer flex items-center gap-1 shadow"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Authorize De-shuttering</span>
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: STRIPPING PERMITS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Formwork Stripping Permits ({strippingPermits.length})
            </span>
            <span className="text-[10px] text-zinc-500">IS 456 Cl. 11.3 Statutory Release</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {strippingPermits.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero de-shuttering permits authorized yet. Shoring must remain until maturity reaches &ge; 70% $f_{ck}$.
              </div>
            ) : (
              strippingPermits.map((permit: any) => (
                <div key={permit.id} className="p-4 space-y-1.5 hover:bg-zinc-850/50 transition">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                        {permit.permit_number}
                      </span>
                      <strong className="text-white text-xs">{permit.structural_element}</strong>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[9px] font-bold uppercase">
                      Cleared ({permit.strength_ratio_pct}% f_ck)
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 font-sans">
                    Grid: <strong className="text-zinc-300">{permit.grid_location}</strong> • Achieved: <strong className="text-emerald-400 font-mono">{permit.achieved_strength_mpa} MPa</strong> vs M{permit.target_fck_mpa}
                  </div>

                  <div className="text-[10px] text-zinc-500 flex justify-between border-t border-zinc-800/80 pt-1.5">
                    <span>Authorized By: {permit.authorized_by}</span>
                    <span className="font-mono text-cyan-400">Section 65B Sealed ✓</span>
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
PAGE_HYDRATION

# -----------------------------------------------------------------------------
# 4. VERIFY FULL TYPESCRIPT COMPILATION
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Hydration Kinetics & Stripping Engine deployed cleanly with ZERO errors!\033[0m"
