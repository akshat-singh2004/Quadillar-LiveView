#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating directory structures...\033[0m"
mkdir -p lib/commercial app/actions components/commercial app/commercial/hindrance-eot

echo -e "\033[1;36m[+] Deploying Contemporaneous Delay Forensics & EOT Claims Engine...\033[0m"

# -----------------------------------------------------------------------------
# 1. ACTION: app/actions/hindrance-eot-actions.ts
# Evaluates Chronos TIA, Themis time-bars, Council Synapse, and Hermes seals
# -----------------------------------------------------------------------------
cat << 'ACTION_HINDRANCE' > app/actions/hindrance-eot-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { ChronosAgent } from "@/lib/agents/chronos";
import { ThemisAgent } from "@/lib/agents/themis";
import { HermesAgent } from "@/lib/agents/hermes";
import { CouncilSynapse } from "@/lib/agents/synapse";

export interface LogHindrancePayload {
  projectId: string;
  delayCategory: "CLIENT_DESIGN_HOLD" | "WEATHER_STOPPAGE" | "SITE_ACCESS_DENIAL" | "FORCE_MAJEURE" | string;
  description: string;
  gridLocation: string;
  daysHindered: number;
}

export interface AdjudicateEotPayload {
  projectId: string;
  hindranceId: string;
  contractorAgency: string;
  claimedDaysExtension: number;
  noticeEventDateIso: string;
  noticeSubmissionDateIso: string;
  contractBaselineInr: number;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Hindrance/EOT actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function logContemporaneousHindrance(payload: LogHindrancePayload) {
  try {
    const supabase = getSupabase();
    const hindranceCode = `HND-${Date.now().toString().slice(-6)}`;

    // 1. Evaluate Time Impact Analysis (TIA) via Chronos
    const assessment = await ChronosAgent.assessHindranceImpact({
      projectId: payload.projectId,
      hindranceDays: payload.daysHindered,
      hindranceNumber: hindranceCode,
    });

    // 2. Commit to site_hindrance_register
    const { data, error } = await supabase
      .from("site_hindrance_register")
      .insert({
        project_id: payload.projectId,
        hindrance_code: hindranceCode,
        delay_category: payload.delayCategory,
        description: payload.description,
        grid_location: payload.gridLocation,
        days_hindered: payload.daysHindered,
        is_critical_path: assessment.criticalPathImpacted,
        logged_date: new Date().toISOString().slice(0, 10),
        status: "OPEN_CRITICAL_DELAY",
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Hermes Section 65B Notarization
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Site Hindrance Event Registered: ${hindranceCode} (+${payload.daysHindered}d Delay)`,
      actionCategory: "COMMERCIAL_HINDRANCE_LOGGED",
      moduleRef: hindranceCode,
      details: { payload, assessment } as Record<string, unknown>,
      signatoryName: "Agent Chronos & Resident Planning Engineer",
      signatoryRole: "Contemporaneous Delay Specialist",
      severity: assessment.criticalPathImpacted ? "critical" : "warning",
    });

    await supabase
      .from("site_hindrance_register")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    // 4. Dispatch Synapse Directive: Chronos -> Themis
    if (assessment.criticalPathImpacted) {
      await CouncilSynapse.dispatch({
        projectId: payload.projectId,
        eventType: "CRITICAL_PATH_SLIPPAGE",
        sourceAgent: "Chronos (4D Schedule Governor)",
        targetAgent: "Themis (Contract Claims Governor)",
        payload: { hindranceCode, delayDays: payload.daysHindered, assessment },
        actionTaken: `Initiated 28-day notice time-bar tracking under FIDIC Cl. 20.1 / CPWD Cl. 5.`,
      });
    }

    revalidatePath("/commercial/hindrance-eot");
    revalidatePath("/schedule/gantt");
    revalidatePath("/");

    return { success: true, data, assessment, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to log hindrance event." };
  }
}

export async function adjudicateEotClaim(payload: AdjudicateEotPayload) {
  try {
    const supabase = getSupabase();
    const claimNumber = `EOT-${Date.now().toString().slice(-6)}`;

    // 1. Themis 28-Day Statutory Time-Bar Audit (FIDIC Cl. 20.1)
    const eventTime = new Date(payload.noticeEventDateIso).getTime();
    const noticeTime = new Date(payload.noticeSubmissionDateIso).getTime();
    const elapsedDays = Math.max(0, Math.round((noticeTime - eventTime) / (1000 * 3600 * 24)));
    const isNoticeTimeBarred = elapsedDays > 28;

    // 2. Liquidated Damages Shielding Derivation
    const ldShield = ThemisAgent.computeLiquidatedDamages({
      contractBaselineInr: payload.contractBaselineInr,
      unexcusedDelayDays: isNoticeTimeBarred ? 0 : payload.claimedDaysExtension,
    });

    const adjudicatedDays = isNoticeTimeBarred ? 0 : payload.claimedDaysExtension;
    const revisedDate = new Date();
    revisedDate.setDate(revisedDate.getDate() + Math.round(adjudicatedDays));

    const status = isNoticeTimeBarred
      ? "TIME_BARRED_FIDIC_REJECTED"
      : "EOT_APPROVED_CERTIFIED";

    // 3. Commit to eot_claim_dossiers
    const { data, error } = await supabase
      .from("eot_claim_dossiers")
      .insert({
        project_id: payload.projectId,
        claim_number: claimNumber,
        linked_hindrance_id: payload.hindranceId,
        contractor_agency: payload.contractorAgency,
        claimed_days_extension: payload.claimedDaysExtension,
        adjudicated_days_approved: adjudicatedDays,
        statutory_clause_ref: "CPWD GCC Cl. 5 / FIDIC Cl. 8.4",
        is_notice_time_barred: isNoticeTimeBarred,
        revised_completion_date: revisedDate.toISOString().slice(0, 10),
        liquidated_damages_shielded_inr: ldShield.computedLdInr,
        status,
        adjudicated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Update linked hindrance status to resolved
    await supabase
      .from("site_hindrance_register")
      .update({
        status: isNoticeTimeBarred ? "DISMISSED_TIME_BARRED" : "RESOLVED_EOT_GRANTED",
        resolved_at: new Date().toISOString(),
      })
      .eq("id", payload.hindranceId);

    // 5. Hermes Section 65B Notarization
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `EOT Claim Adjudicated: ${claimNumber} [${status}]`,
      actionCategory: "COMMERCIAL_EOT_ADJUDICATED",
      moduleRef: claimNumber,
      details: { payload, isNoticeTimeBarred, ldShield, revisedDate: revisedDate.toISOString() } as Record<string, unknown>,
      signatoryName: "Agent Chronos & Themis",
      signatoryRole: "Council Arbitral Adjudicators",
      severity: isNoticeTimeBarred ? "critical" : "verified",
    });

    await supabase
      .from("eot_claim_dossiers")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    revalidatePath("/commercial/hindrance-eot");
    revalidatePath("/commercial/ra-bills");
    revalidatePath("/");

    return { success: true, data, isNoticeTimeBarred, ldShield, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to adjudicate EOT claim." };
  }
}
ACTION_HINDRANCE

# -----------------------------------------------------------------------------
# 2. COMPONENT: components/commercial/LogHindranceModal.tsx
# Field dialog for logging delay events with grid location & category
# -----------------------------------------------------------------------------
cat << 'COMP_HINDRANCE_MODAL' > components/commercial/LogHindranceModal.tsx
"use client";

import React, { useState } from "react";
import { logContemporaneousHindrance } from "@/app/actions/hindrance-eot-actions";
import { Plus, Clock, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function LogHindranceModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [delayCategory, setDelayCategory] = useState("CLIENT_DESIGN_HOLD");
  const [gridLocation, setGridLocation] = useState("Tower Core Axis SW-02");
  const [description, setDescription] = useState("Client structural revision on Shear Wall reinforcement delayed pour card inspection.");
  const [daysHindered, setDaysHindered] = useState(4.5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await logContemporaneousHindrance({
        projectId,
        delayCategory,
        gridLocation,
        description,
        daysHindered,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to log hindrance event.");
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
        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-950/40"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>+ Log Site Hindrance</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-rose-400 uppercase tracking-widest font-bold">
                  CPWD GCC Cl. 5 / SCL Delay Protocol • Delay Forensics
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Register Contemporaneous Hindrance
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
                    Delay Category
                  </label>
                  <select
                    value={delayCategory}
                    onChange={(e) => setDelayCategory(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  >
                    <option value="CLIENT_DESIGN_HOLD">Client Design Hold</option>
                    <option value="WEATHER_STOPPAGE">Weather Stoppage (IS 13367)</option>
                    <option value="SITE_ACCESS_DENIAL">Site Access Denial</option>
                    <option value="FORCE_MAJEURE">Force Majeure Event</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Grid Location Axis
                  </label>
                  <input
                    type="text"
                    required
                    value={gridLocation}
                    onChange={(e) => setGridLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Delay Description &amp; Cause of Hindrance
                </label>
                <textarea
                  rows={3}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Net Days Hindered
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  required
                  value={daysHindered}
                  onChange={(e) => setDaysHindered(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-rose-400 font-bold text-center text-xs"
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Commit Hindrance Log</span>
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
# 3. COMPONENT: components/commercial/AdjudicateEotModal.tsx
# Claims arbitration dialog with 28-day notice check & LD calculation
# -----------------------------------------------------------------------------
cat << 'COMP_EOT_MODAL' > components/commercial/AdjudicateEotModal.tsx
"use client";

import React, { useState } from "react";
import { adjudicateEotClaim } from "@/app/actions/hindrance-eot-actions";
import { ShieldCheck, Scale, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  hindranceId: string;
  hindranceCode: string;
  daysHindered: number;
}

export function AdjudicateEotModal({ projectId, hindranceId, hindranceCode, daysHindered }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [contractorAgency, setContractorAgency] = useState("L&T Construction (Civil Package)");
  const [claimedDays, setClaimedDays] = useState(daysHindered);
  const [eventDate, setEventDate] = useState("2026-09-10");
  const [noticeDate, setNoticeDate] = useState("2026-09-24");
  const [contractBaselineInr, setContractBaselineInr] = useState(25000000);

  // Live 28-day notice time-bar calculation
  const eventTime = new Date(eventDate).getTime();
  const noticeTime = new Date(noticeDate).getTime();
  const elapsedDays = Math.max(0, Math.round((noticeTime - eventTime) / (1000 * 3600 * 24)));
  const isTimeBarred = elapsedDays > 28;

  // Live Liquidated Damages calculation (1% per week, max 10%)
  const weeks = claimedDays / 7.0;
  const computedLd = Math.round(contractBaselineInr * (weeks * 0.01));
  const ldCap = Math.round(contractBaselineInr * 0.10);
  const shieldedLd = Math.min(computedLd, ldCap);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await adjudicateEotClaim({
        projectId,
        hindranceId,
        contractorAgency,
        claimedDaysExtension: claimedDays,
        noticeEventDateIso: eventDate,
        noticeSubmissionDateIso: noticeDate,
        contractBaselineInr,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to adjudicate EOT claim.");
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
        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-emerald-950 border border-zinc-700 hover:border-emerald-800 text-zinc-300 hover:text-emerald-300 font-bold uppercase text-[9px] transition flex items-center gap-1 cursor-pointer"
      >
        <Scale className="w-3 h-3 text-emerald-400" />
        <span>Adjudicate EOT</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                  FIDIC Cl. 8.4 / 20.1 • EOT Statutory Claims
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Adjudicate EOT Claim ({hindranceCode})
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
              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Contractor Agency
                </label>
                <input
                  type="text"
                  required
                  value={contractorAgency}
                  onChange={(e) => setContractorAgency(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Event Occurrence Date
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Formal Notice Served Date
                  </label>
                  <input
                    type="date"
                    required
                    value={noticeDate}
                    onChange={(e) => setNoticeDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Days Extension Claimed
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={claimedDays}
                    onChange={(e) => setClaimedDays(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-emerald-400 font-bold text-center text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Contract Baseline Valuation (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={contractBaselineInr}
                    onChange={(e) => setContractBaselineInr(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-bold text-center text-xs"
                  />
                </div>
              </div>

              {/* STATUTORY ADJUDICATION PREVIEW */}
              <div className={`p-3 rounded-xl border space-y-1.5 text-[10px] ${
                isTimeBarred ? "bg-rose-950/40 border-rose-800/80" : "bg-emerald-950/40 border-emerald-800/80"
              }`}>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Notice Period Elapsed (FIDIC Cl. 20.1):</span>
                  <span className={`font-bold font-mono ${isTimeBarred ? "text-rose-400" : "text-emerald-400"}`}>
                    {elapsedDays} Days {isTimeBarred ? "(TIME-BARRED > 28d)" : "(Compliant ≤ 28d)"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">CPWD Cl. 2 Liquidated Damages Shielded:</span>
                  <span className="font-bold font-mono text-cyan-400">
                    ₹{shieldedLd.toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="border-t border-zinc-800 pt-1 flex justify-between font-bold">
                  <span className="text-zinc-300">Council Adjudication Verdict:</span>
                  <span className={isTimeBarred ? "text-rose-400" : "text-emerald-400"}>
                    {isTimeBarred ? "REJECTED (Time-Barred Notice)" : `APPROVED (+${claimedDays}d EOT Certified)`}
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Certify EOT Dossier</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_EOT_MODAL

# -----------------------------------------------------------------------------
# 4. PAGE: app/commercial/hindrance-eot/page.tsx
# Connected to live site_hindrance_register & eot_claim_dossiers
# -----------------------------------------------------------------------------
cat << 'PAGE_HINDRANCE' > app/commercial/hindrance-eot/page.tsx
import React from "react";
import { LogHindranceModal } from "@/components/commercial/LogHindranceModal";
import { AdjudicateEotModal } from "@/components/commercial/AdjudicateEotModal";
import { createClient } from "@/lib/supabase/server";
import { Clock, ShieldCheck, ShieldAlert, Scale, AlertTriangle, Layers } from "lucide-react";

export default async function HindranceEotPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch hindrances and EOT claim dossiers
  const [hindranceRes, eotRes] = await Promise.all([
    supabase.from("site_hindrance_register").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("eot_claim_dossiers").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
  ]);

  const hindrances = hindranceRes.data || [];
  const eotClaims = eotRes.data || [];

  const totalDelayDays = hindrances.reduce((s, h) => s + (Number(h.days_hindered) || 0), 0);
  const totalApprovedDays = eotClaims.reduce((s, c) => s + (Number(c.adjudicated_days_approved) || 0), 0);
  const totalLdShieldedInr = eotClaims.reduce((s, c) => s + (Number(c.liquidated_damages_shielded_inr) || 0), 0);
  const openHindrancesCount = hindrances.filter((h) => h.status === "OPEN_CRITICAL_DELAY").length;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-rose-400 uppercase tracking-widest font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>DELAY FORENSICS &amp; CLAIMS • FIDIC CL. 8.4 / CPWD CL. 5 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Site Hindrance Register &amp; Extension of Time (EOT) Claims
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Contemporaneous float analysis, 28-day notice time-bar surveillance, and CPWD Cl. 2 liquidated damages defense[cite: 1].
          </p>
        </div>

        <LogHindranceModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Logged Hindrance Days</span>
          <div className="text-xl font-bold text-rose-400 mt-1 tabular-nums">+{totalDelayDays} Days</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{openHindrancesCount} active open delays</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">EOT Certified Extensions</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">+{totalApprovedDays} Days</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{eotClaims.length} Dossiers Adjudicated</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">CPWD Cl. 2 LD Shielded</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            ₹{(totalLdShieldedInr / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Protected from recovery[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">28-Day Notice Window</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">FIDIC Cl. 20.1</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Statutory time-bar armed</span>
        </div>
      </div>

      {/* DUAL PANELS: HINDRANCE REGISTER & EOT CLAIMS DOSSIERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PANEL 1: SITE HINDRANCES */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Contemporaneous Hindrances Register ({hindrances.length})
            </span>
            <span className="text-[10px] text-zinc-500">SCL Delay Protocol Log</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {hindrances.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero delay events logged. Click &quot;+ Log Site Hindrance&quot; to contemporaneously record progress obstructions.
              </div>
            ) : (
              hindrances.map((h: any) => {
                const isOpen = h.status === "OPEN_CRITICAL_DELAY";
                return (
                  <div key={h.id} className="p-4 space-y-1.5 hover:bg-zinc-850/50 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold text-[10px]">
                          {h.hindrance_code}
                        </span>
                        <strong className="text-white text-xs">{h.delay_category.replace(/_/g, " ")}</strong>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isOpen ? "bg-rose-950 border border-rose-800 text-rose-300" : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                      }`}>
                        +{h.days_hindered}d ({isOpen ? "Open Delay" : "Resolved"})
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-300 font-sans">
                      {h.description}
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-1.5 font-mono">
                      <span>Grid: <strong className="text-zinc-300">{h.grid_location}</strong></span>

                      {isOpen && (
                        <AdjudicateEotModal
                          projectId={projectId}
                          hindranceId={h.id}
                          hindranceCode={h.hindrance_code}
                          daysHindered={Number(h.days_hindered)}
                        />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* PANEL 2: EOT CLAIMS DOSSIERS */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">
              Adjudicated EOT Claim Dossiers ({eotClaims.length})
            </span>
            <span className="text-[10px] text-zinc-500">FIDIC Cl. 8.4 Legal Awards</span>
          </div>

          <div className="divide-y divide-zinc-800 max-h-[500px] overflow-y-auto">
            {eotClaims.length === 0 ? (
              <div className="p-8 text-center text-zinc-600 font-sans">
                Zero EOT claims adjudicated. Click &quot;Adjudicate EOT&quot; on open hindrances to evaluate statutory time extensions.
              </div>
            ) : (
              eotClaims.map((claim: any) => {
                const isApproved = claim.status === "EOT_APPROVED_CERTIFIED";
                return (
                  <div key={claim.id} className="p-4 space-y-1.5 hover:bg-zinc-850/50 transition">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                          {claim.claim_number}
                        </span>
                        <strong className="text-white text-xs">{claim.contractor_agency}</strong>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isApproved ? "bg-emerald-950 border border-emerald-800 text-emerald-300" : "bg-rose-950 border border-rose-800 text-rose-300"
                      }`}>
                        {isApproved ? `+${claim.adjudicated_days_approved}d Certified` : "Time-Barred (0d)"}
                      </span>
                    </div>

                    <div className="text-[11px] text-zinc-400 font-sans">
                      New Target Completion: <strong className="text-emerald-400 font-mono">{claim.revised_completion_date}</strong> • Shielded LD: <strong className="text-cyan-400 font-mono">₹{Number(claim.liquidated_damages_shielded_inr).toLocaleString("en-IN")}</strong>
                    </div>

                    <div className="flex justify-between text-[10px] text-zinc-500 border-t border-zinc-800/80 pt-1.5 font-mono">
                      <span>Clause: {claim.statutory_clause_ref}</span>
                      <span className="text-cyan-400">Section 65B Certified ✓</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
PAGE_HINDRANCE

# -----------------------------------------------------------------------------
# 5. VERIFY FULL TYPESCRIPT COMPILATION
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Contemporaneous Delay Forensics & EOT Claims Engine deployed cleanly with ZERO errors!\033[0m"
