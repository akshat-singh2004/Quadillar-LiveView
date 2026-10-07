#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating required directory structures...\033[0m"
mkdir -p lib/dpr app/actions components/site app/site/dpr

echo -e "\033[1;36m[+] Deploying Daily Progress Report (DPR) & Contemporaneous Site Telemetry Engine...\033[0m"

# -----------------------------------------------------------------------------
# 1. ACTION: app/actions/dpr-actions.ts
# Server actions to save DPR draft, register hindrances, and apply Section 65B SEOR seal
# -----------------------------------------------------------------------------
cat << 'ACTION_DPR' > app/actions/dpr-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";

export interface SaveDprDraftPayload {
  projectId: string;
  shiftType: string;
  weatherSummary: string;
  temperatureC: number;
  shiftHours: number;
  totalManpower: number;
  notes?: string;
}

export interface RegisterHindrancePayload {
  projectId: string;
  delayCategory: string;
  description: string;
  gridLocation: string;
  daysHindered: number;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for DPR actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function saveDprDraft(payload: SaveDprDraftPayload) {
  try {
    const supabase = getSupabase();
    const cumulativeManHours = parseFloat((payload.totalManpower * payload.shiftHours).toFixed(2));
    const today = new Date().toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from("daily_progress_reports")
      .select("id")
      .eq("project_id", payload.projectId)
      .eq("report_date", today)
      .maybeSingle();

    let result;
    if (existing) {
      result = await supabase
        .from("daily_progress_reports")
        .update({
          shift_type: payload.shiftType,
          weather_summary: payload.weatherSummary,
          temperature_c: payload.temperatureC,
          shift_hours: payload.shiftHours,
          total_manpower: payload.totalManpower,
          cumulative_man_hours: cumulativeManHours,
          status: "DRAFT_IN_PROGRESS",
        })
        .eq("id", existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from("daily_progress_reports")
        .insert({
          project_id: payload.projectId,
          report_date: today,
          shift_type: payload.shiftType,
          weather_summary: payload.weatherSummary,
          temperature_c: payload.temperatureC,
          shift_hours: payload.shiftHours,
          total_manpower: payload.totalManpower,
          cumulative_man_hours: cumulativeManHours,
          status: "DRAFT_IN_PROGRESS",
          created_at: new Date().toISOString(),
        })
        .select()
        .single();
    }

    if (result.error) throw result.error;

    revalidatePath("/site/dpr");
    revalidatePath("/");

    return { success: true, data: result.data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to save DPR draft." };
  }
}

export async function sealAndSignDpr(projectId: string) {
  try {
    const supabase = getSupabase();
    const today = new Date().toISOString().slice(0, 10);

    const { data: dpr, error: fetchErr } = await supabase
      .from("daily_progress_reports")
      .select("*")
      .eq("project_id", projectId)
      .eq("report_date", today)
      .maybeSingle();

    if (fetchErr || !dpr) {
      return { success: false, error: "No active draft exists for today. Save a draft before applying the SEOR seal." };
    }

    // Cryptographic notarization via Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId,
      actionTitle: `Daily Progress Report Certified & Sealed [${today}]`,
      actionCategory: "DPR_STATUTORY_SEOR_SEAL",
      moduleRef: String(dpr.id),
      details: { dpr } as Record<string, unknown>,
      signatoryName: "Superintending Engineer of Record (SEOR)",
      signatoryRole: "Statutory Employer Representative",
      severity: "verified",
    });

    const { error: updateErr } = await supabase
      .from("daily_progress_reports")
      .update({
        status: "SEOR_SEALED",
        seor_sealed_at: new Date().toISOString(),
        seor_signature_hash: seal.hash,
      })
      .eq("id", dpr.id);

    if (updateErr) throw updateErr;

    revalidatePath("/site/dpr");
    revalidatePath("/");

    return { success: true, hash: seal.hash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to seal DPR." };
  }
}

export async function registerSiteHindrance(payload: RegisterHindrancePayload) {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from("site_hindrance_register")
      .insert({
        project_id: payload.projectId,
        delay_category: payload.delayCategory,
        description: payload.description,
        grid_location: payload.gridLocation,
        days_hindered: payload.daysHindered,
        status: "OPEN_CRITICAL_DELAY",
        logged_date: new Date().toISOString().slice(0, 10),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Contemporaneous Delay Event Registered: ${payload.delayCategory}`,
      actionCategory: "COMMERCIAL_HINDRANCE_LOGGED",
      moduleRef: String(data.id),
      details: { ...payload } as Record<string, unknown>,
      signatoryName: "Contemporaneous Site Officer",
      signatoryRole: "Planning & Delay Specialist",
      severity: "warning",
    });

    revalidatePath("/site/dpr");
    revalidatePath("/commercial/hindrance-eot");
    revalidatePath("/");

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to log hindrance." };
  }
}
ACTION_DPR

# -----------------------------------------------------------------------------
# 2. MODAL: components/site/RegisterHindranceModal.tsx
# Delay event intake dialog for contemporaneous Clause 5 claims
# -----------------------------------------------------------------------------
cat << 'COMP_HINDRANCE_MODAL' > components/site/RegisterHindranceModal.tsx
"use client";

import React, { useState } from "react";
import { registerSiteHindrance } from "@/app/actions/dpr-actions";
import { Clock, Plus, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

const DELAY_CATEGORIES = [
  "Drawing Revision Unavailable (Architect Hold)",
  "Unprecedented Meteorological Ingress (Force Majeure)",
  "Workfront Access Denial / Clear Handover Missing",
  "Material Delivery Disruption / Supply Chain Hold",
  "Statutory Inspector Stoppage / Third-Party NOC Hold",
];

export function RegisterHindranceModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [delayCategory, setDelayCategory] = useState(DELAY_CATEGORIES[0]);
  const [description, setDescription] = useState("Awaiting revised shear wall reinforcement detail from architect of record.");
  const [gridLocation, setGridLocation] = useState("Grid B-C / Axis 02");
  const [daysHindered, setDaysHindered] = useState(1.0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await registerSiteHindrance({
        projectId,
        delayCategory,
        description,
        gridLocation,
        daysHindered,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to register delay event.");
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
        className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>Register Delay Event</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-amber-400 uppercase tracking-widest font-bold">
                  CPWD GCC Cl. 5 / FIDIC Cl. 8.4 Contemporaneous Notice
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Register Critical Delay Event
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

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Delay Classification Category
                </label>
                <select
                  value={delayCategory}
                  onChange={(e) => setDelayCategory(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs focus:border-amber-500 outline-none"
                >
                  {DELAY_CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Affected Structural Grid / Axis
                </label>
                <input
                  type="text"
                  required
                  value={gridLocation}
                  onChange={(e) => setGridLocation(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  placeholder="e.g. Grid B-C / Axis 02"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Days of Critical Float Hindered
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={daysHindered}
                  onChange={(e) => setDaysHindered(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-amber-400 text-xs font-bold"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Contemporaneous Event Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-sans"
                />
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
                  <span>Commit to Delay Journal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_HINDRANCE_MODAL

# -----------------------------------------------------------------------------
# 3. MODAL: components/site/SaveDprDraftModal.tsx
# Shift window & weather configuration modal for saving DPR draft
# -----------------------------------------------------------------------------
cat << 'COMP_DPR_MODAL' > components/site/SaveDprDraftModal.tsx
"use client";

import React, { useState } from "react";
import { saveDprDraft } from "@/app/actions/dpr-actions";
import { FileText, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  totalManpower: number;
}

export function SaveDprDraftModal({ projectId, totalManpower }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [shiftType, setShiftType] = useState("DAY_SHIFT");
  const [weatherSummary, setWeatherSummary] = useState("Clear / 32°C");
  const [temperatureC, setTemperatureC] = useState(32.0);
  const [shiftHours, setShiftHours] = useState(8.5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await saveDprDraft({
        projectId,
        shiftType,
        weatherSummary,
        temperatureC,
        shiftHours,
        totalManpower,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to save draft.");
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
        className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 font-bold uppercase text-xs transition cursor-pointer"
      >
        Save Daily DPR Draft
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
                  CPWD Works Manual Section 18
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Configure Daily DPR Parameters
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

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Shift Mode
                  </label>
                  <select
                    value={shiftType}
                    onChange={(e) => setShiftType(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  >
                    <option value="DAY_SHIFT">Day Shift (Standard)</option>
                    <option value="NIGHT_SHIFT">Night Shift (Concreting)</option>
                    <option value="EXTENDED_SHIFT">Extended Overtime</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Shift Duration (hrs)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={shiftHours}
                    onChange={(e) => setShiftHours(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Weather Condition
                  </label>
                  <input
                    type="text"
                    required
                    value={weatherSummary}
                    onChange={(e) => setWeatherSummary(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Ambient Temperature (°C)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={temperatureC}
                    onChange={(e) => setTemperatureC(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-amber-400 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-between items-center text-xs">
                <span className="text-zinc-500 uppercase text-[10px] font-bold">Computed Man-Hours</span>
                <span className="text-cyan-400 font-bold tabular-nums">
                  {(totalManpower * shiftHours).toFixed(1)} Man-Hours ({totalManpower} Workers)
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
                  <span>Save Draft</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_DPR_MODAL

# -----------------------------------------------------------------------------
# 4. COMPONENT: components/site/SealDprButton.tsx
# Triggers cryptographic Section 65B SEOR stamp certification
# -----------------------------------------------------------------------------
cat << 'COMP_SEAL_BTN' > components/site/SealDprButton.tsx
"use client";

import React, { useState } from "react";
import { sealAndSignDpr } from "@/app/actions/dpr-actions";
import { ShieldCheck, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  isSealed: boolean;
}

export function SealDprButton({ projectId, isSealed }: Props) {
  const [loading, setLoading] = useState(false);

  const handleSeal = async () => {
    if (isSealed) return;
    if (!confirm("Are you sure you want to seal and sign today's DPR with a statutory SEOR Merkle stamp? This locks the daily diary permanently under Section 65B.")) return;

    setLoading(true);
    try {
      const res = await sealAndSignDpr(projectId);
      if (!res.success) {
        alert(res.error || "Failed to seal DPR.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSeal}
      disabled={loading || isSealed}
      className={`px-5 py-2.5 rounded-xl font-bold uppercase text-xs transition flex items-center gap-2 cursor-pointer shadow-lg ${
        isSealed
          ? "bg-emerald-950 border border-emerald-800 text-emerald-300 cursor-default"
          : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40"
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <ShieldCheck className="w-4 h-4 text-emerald-300" />
      )}
      <span>{isSealed ? "✓ DPR SEOR SEALED" : "SEAL & SIGN DPR (SEOR STAMP)"}</span>
    </button>
  );
}
COMP_SEAL_BTN

# -----------------------------------------------------------------------------
# 5. PAGE: app/site/dpr/page.tsx
# Connected to live daily_progress_reports, site_labor_roster & site_hindrance_register
# -----------------------------------------------------------------------------
cat << 'PAGE_DPR' > app/site/dpr/page.tsx
import React from "react";
import { createClient } from "@/lib/supabase/server";
import { LaborRosterTable } from "@/components/site/LaborRosterTable";
import { RegisterHindranceModal } from "@/components/site/RegisterHindranceModal";
import { SaveDprDraftModal } from "@/components/site/SaveDprDraftModal";
import { SealDprButton } from "@/components/site/SealDprButton";
import { FileText, Clock, Users, Sun, ShieldCheck, AlertCircle } from "lucide-react";

export default async function DailyProgressReportPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";
  const today = new Date().toISOString().slice(0, 10);

  // 1. Fetch today's DPR draft or record
  const { data: dprRow } = await supabase
    .from("daily_progress_reports")
    .select("*")
    .eq("project_id", projectId)
    .eq("report_date", today)
    .maybeSingle();

  // 2. Fetch trade roster entries for today
  const { data: rosterRows } = await supabase
    .from("site_labor_roster")
    .select("*")
    .eq("project_id", projectId)
    .eq("shift_date", today);

  const tradeRoster = rosterRows || [];
  const rosterManpower = tradeRoster.reduce((sum, r) => sum + (Number(r.actual_count) || 0), 0);

  // 3. Fetch active critical hindrances
  const { data: hindrances } = await supabase
    .from("site_hindrance_register")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "OPEN_CRITICAL_DELAY")
    .order("created_at", { ascending: false });

  const activeHindrances = hindrances || [];
  const cumulativeDelayDays = activeHindrances.reduce((sum, h) => sum + (Number(h.days_hindered) || 0), 0);

  const isSealed = dprRow?.status === "SEOR_SEALED";
  const totalManpower = dprRow?.total_manpower || rosterManpower || 0;
  const shiftHours = Number(dprRow?.shift_hours || 8.5);
  const cumulativeManHours = Number(dprRow?.cumulative_man_hours || (totalManpower * shiftHours).toFixed(1));

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <FileText className="w-3.5 h-3.5" />
            <span>CONTEMPORANEOUS SITE RECORD • FIDIC CL. 4.20 / CPWD GCC CL. 5.2 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Daily Progress Report (DPR) &amp; Site Telemetry
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Turnstile biometric logs, trade outputs, and contemporaneous delay notices.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="px-2.5 py-1 rounded border border-zinc-800 bg-zinc-900 text-zinc-400 text-[10px] font-bold uppercase">
            {today}
          </span>
        </div>
      </header>

      {/* 4 STATUTORY KPI CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Manpower On-Site</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">
            {totalManpower} Personnel
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Biometric muster gate sync</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Weather / Shift Window</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            {dprRow ? `${dprRow.weather_summary} | ${shiftHours}h` : "Clear / 32°C | 8.5h"}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Site microclimate telemetry</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Cumulative Man-Hours</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">
            {cumulativeManHours} Hrs
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">BOCW safe working threshold</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">DPR Statutory Status</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${isSealed ? "text-emerald-400" : dprRow ? "text-amber-400" : "text-zinc-500"}`}>
            {isSealed ? "SEOR SEALED" : dprRow ? "DRAFT LOGGED" : "NO LOG TODAY"}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {isSealed ? "Section 65B certified" : "Awaiting Sign-off"}
          </span>
        </div>
      </div>

      {/* OPERATIONS WORKSPACE: LABOR ROSTER & HINDRANCE JOURNAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* TRADE-WISE LABOR ROSTER (7 COLS) */}
        <div className="lg:col-span-7 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
              <span>Trade-Wise Labor Roster ({tradeRoster.length} Packages)</span>
            </span>
            <span className="text-[10px] text-zinc-500">Muster Integration</span>
          </div>

          <LaborRosterTable initialRoster={tradeRoster} projectId={projectId} />
        </div>

        {/* CONTEMPORANEOUS HINDRANCE & EOT JOURNAL (5 COLS) */}
        <div className="lg:col-span-5 bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <div>
              <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Hindrance &amp; EOT Delay Journal ({activeHindrances.length})</span>
              </span>
              <span className="text-[9px] text-zinc-500 block mt-0.5">Clause 5 Critical Delay Events</span>
            </div>
            <RegisterHindranceModal projectId={projectId} />
          </div>

          <div className="divide-y divide-zinc-800/60 max-h-[380px] overflow-y-auto">
            {activeHindrances.length === 0 ? (
              <div className="py-12 text-center text-zinc-600 font-sans">
                Zero active hindrances recorded on site today. Site progressing per original baseline float.
              </div>
            ) : (
              activeHindrances.map((h: any) => (
                <div key={h.id} className="py-3 space-y-1">
                  <div className="flex justify-between items-start">
                    <span className="text-amber-400 font-bold text-xs truncate max-w-[220px]">
                      {h.delay_category}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-800 text-amber-300 font-bold text-[9px]">
                      +{h.days_hindered}d Delay
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-300 font-sans line-clamp-2">
                    {h.description}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Grid: {h.grid_location} • Logged: {h.logged_date}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* FOOTER ACTIONS BAR */}
      <div className="p-4 border border-zinc-800 bg-zinc-900/60 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="text-zinc-400 text-xs font-sans">
          {isSealed ? (
            <span className="text-emerald-400 font-mono text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Section 65B Certified Merkle Stamp Active • {dprRow?.seor_signature_hash}</span>
            </span>
          ) : (
            <span>Saving draft updates the shift muster without locking statutory EOT legal records.</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <SaveDprDraftModal projectId={projectId} totalManpower={totalManpower} />
          <SealDprButton projectId={projectId} isSealed={isSealed} />
        </div>
      </div>
    </div>
  );
}
PAGE_DPR

# -----------------------------------------------------------------------------
# 6. VERIFY BUILD HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Daily Progress Report (DPR) & Contemporaneous Site Telemetry Engine deployed cleanly with ZERO errors!\033[0m"
