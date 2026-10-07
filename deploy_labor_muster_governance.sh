#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating directory structures...\033[0m"
mkdir -p lib/labor app/actions components/labor app/labor/muster

echo -e "\033[1;36m[+] Deploying Biometric Labor Muster & BOCW Wage Governance Engine (Plutus)...\033[0m"

# -----------------------------------------------------------------------------
# 1. ACTION: app/actions/labor-actions.ts
# Evaluates PlutusAgent, BiometricAntiPassbackReconciler, and BOCW minimum wages
# -----------------------------------------------------------------------------
cat << 'ACTION_LABOR' > app/actions/labor-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { PlutusAgent } from "@/lib/agents/plutus";
import { StatutoryMinWageTierAuditor } from "@/lib/agents/sub-agents/plutus/bocw-wages";
import { HermesAgent } from "@/lib/agents/hermes";

export interface AuditMusterPayload {
  projectId: string;
  contractorAgency: string;
  tradeClassification: string;
  skillTier: "SKILLED" | "SEMI_SKILLED" | "UNSKILLED";
  claimedWorkerPins: string[];
  biometricTurnstilePins: string[];
  dailyWageRateInr: number;
  shiftDate?: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase credentials for Labor actions.");
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function auditAndLogMusterRoll(payload: AuditMusterPayload) {
  try {
    const supabase = getSupabase();
    const musterCode = `MUSTER-${payload.tradeClassification.slice(0, 3)}-${Date.now().toString().slice(-5)}`;

    // 1. Execute deterministic turnstile anti-passback reconciliation via Plutus
    const reconciliation = PlutusAgent.auditMuster(
      payload.claimedWorkerPins,
      payload.biometricTurnstilePins
    );

    // 2. Audit statutory minimum wage compliance
    const isWageCompliant = PlutusAgent.verifyMinimumWage(
      payload.skillTier,
      payload.dailyWageRateInr
    );
    const statutoryFloor = StatutoryMinWageTierAuditor.getStatutoryFloorWageInr(payload.skillTier);

    const hasGhostWorkers = reconciliation.ghostCount > 0;
    const status = !isWageCompliant
      ? "STATUTORY_WAGE_BREACH_HOLD"
      : hasGhostWorkers
      ? "MUSTER_DISCREPANCY_FLAG"
      : "VERIFIED_AUDIT_PASSED";

    // 3. Commit record to daily_labor_muster_rolls
    const { data, error } = await supabase
      .from("daily_labor_muster_rolls")
      .insert({
        project_id: payload.projectId,
        muster_code: musterCode,
        contractor_agency: payload.contractorAgency,
        trade_classification: payload.tradeClassification,
        skill_tier: payload.skillTier,
        claimed_headcount: payload.claimedWorkerPins.length,
        biometric_verified_headcount: reconciliation.verifiedCount,
        ghost_workers_count: reconciliation.ghostCount,
        daily_wage_rate_inr: payload.dailyWageRateInr,
        ghost_wage_debit_inr: reconciliation.ghostDebitInr,
        statutory_minimum_wage_inr: statutoryFloor,
        is_wage_compliant: isWageCompliant,
        shift_date: payload.shiftDate || new Date().toISOString().slice(0, 10),
        status,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Cryptographic Section 65B Notarization via Hermes
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `BOCW Labor Muster Audited: ${musterCode} [${payload.tradeClassification}]`,
      actionCategory: "LABOR_BOCW_MUSTER_AUDITED",
      moduleRef: musterCode,
      details: {
        payload,
        reconciliation,
        statutoryFloor,
        isWageCompliant,
      } as Record<string, unknown>,
      signatoryName: "Agent Plutus (Labor & BOCW Governor)",
      signatoryRole: "Autonomous Labor Welfare Auditor",
      severity: hasGhostWorkers || !isWageCompliant ? "critical" : "verified",
    });

    await supabase
      .from("daily_labor_muster_rolls")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    revalidatePath("/labor/muster");
    revalidatePath("/commercial/ra-bills");
    revalidatePath("/");

    return { success: true, data, reconciliation, isWageCompliant, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to audit labor muster roll." };
  }
}
ACTION_LABOR

# -----------------------------------------------------------------------------
# 2. COMPONENT: components/labor/LogMusterRollModal.tsx
# Field dialog for cross-referencing claimed rolls against biometric turnstiles
# -----------------------------------------------------------------------------
cat << 'COMP_MUSTER_MODAL' > components/labor/LogMusterRollModal.tsx
"use client";

import React, { useState } from "react";
import { auditAndLogMusterRoll } from "@/app/actions/labor-actions";
import { Plus, Users, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function LogMusterRollModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [contractorAgency, setContractorAgency] = useState("Falcon Steel Fixing Services");
  const [tradeClassification, setTradeClassification] = useState("BAR_BENDER");
  const [skillTier, setSkillTier] = useState<"SKILLED" | "SEMI_SKILLED" | "UNSKILLED">("SKILLED");
  const [dailyWageRateInr, setDailyWageRateInr] = useState(850);
  const [claimedPinsInput, setClaimedPinsInput] = useState("PIN-101, PIN-102, PIN-103, PIN-104, PIN-105, PIN-106, PIN-107, PIN-108");
  const [turnstilePinsInput, setTurnstilePinsInput] = useState("PIN-101, PIN-102, PIN-103, PIN-104, PIN-105, PIN-106");

  // Live reconciliation calculations
  const claimedList = claimedPinsInput.split(",").map((p) => p.trim()).filter(Boolean);
  const turnstileSet = new Set(turnstilePinsInput.split(",").map((p) => p.trim()).filter(Boolean));
  const ghostList = claimedList.filter((p) => !turnstileSet.has(p));
  const ghostCount = ghostList.length;
  const ghostDebitInr = ghostCount * dailyWageRateInr;

  const floorWage = skillTier === "SKILLED" ? 850 : skillTier === "SEMI_SKILLED" ? 720 : 580;
  const isWageCompliant = dailyWageRateInr >= floorWage;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await auditAndLogMusterRoll({
        projectId,
        contractorAgency,
        tradeClassification,
        skillTier,
        dailyWageRateInr,
        claimedWorkerPins: claimedList,
        biometricTurnstilePins: Array.from(turnstileSet),
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to audit muster roll.");
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
        <span>+ Audit Daily Muster</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
                  BOCW Act 1996 • Biometric Turnstile Reconciliation
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Audit Shift Labor Muster Roll
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
                  Contractor / Agency
                </label>
                <input
                  type="text"
                  required
                  value={contractorAgency}
                  onChange={(e) => setContractorAgency(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Trade
                  </label>
                  <select
                    value={tradeClassification}
                    onChange={(e) => setTradeClassification(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  >
                    <option value="BAR_BENDER">Bar Bender</option>
                    <option value="CARPENTER">Shuttering Carpenter</option>
                    <option value="MASON">Mason</option>
                    <option value="ELECTRICIAN">Electrician</option>
                    <option value="HELPER">Unskilled Helper</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Skill Tier
                  </label>
                  <select
                    value={skillTier}
                    onChange={(e) => {
                      const st = e.target.value as "SKILLED" | "SEMI_SKILLED" | "UNSKILLED";
                      setSkillTier(st);
                      setDailyWageRateInr(st === "SKILLED" ? 850 : st === "SEMI_SKILLED" ? 720 : 580);
                    }}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-400 font-bold text-xs"
                  >
                    <option value="SKILLED">Skilled (₹850 floor)</option>
                    <option value="SEMI_SKILLED">Semi-Skilled (₹720 floor)</option>
                    <option value="UNSKILLED">Unskilled (₹580 floor)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[9px] text-zinc-500 uppercase block font-bold mb-1">
                    Daily Wage (₹)
                  </label>
                  <input
                    type="number"
                    required
                    value={dailyWageRateInr}
                    onChange={(e) => setDailyWageRateInr(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-bold text-center text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Contractor Claimed Worker PINs (Comma-Separated)
                </label>
                <textarea
                  rows={2}
                  required
                  value={claimedPinsInput}
                  onChange={(e) => setClaimedPinsInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 font-mono text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Turnstile Biometric Ingress Punches (Comma-Separated)
                </label>
                <textarea
                  rows={2}
                  required
                  value={turnstilePinsInput}
                  onChange={(e) => setTurnstilePinsInput(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-300 font-mono text-xs"
                />
              </div>

              {/* STATUTORY AUDIT PREVIEW */}
              <div className={`p-3 rounded-xl border space-y-1.5 text-[10px] ${
                ghostCount > 0 || !isWageCompliant
                  ? "bg-rose-950/40 border-rose-800/80"
                  : "bg-emerald-950/40 border-emerald-800/80"
              }`}>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Claimed vs Biometric Ingress:</span>
                  <span className="font-bold font-mono text-white">
                    {claimedList.length} Claimed / {turnstileSet.size} Punched
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Ghost Workers Detected:</span>
                  <span className={`font-bold font-mono ${ghostCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                    {ghostCount} Workers {ghostCount > 0 ? `(-₹${ghostDebitInr.toLocaleString("en-IN")} Debit)` : "✓ Zero"}
                  </span>
                </div>
                <div className="flex justify-between border-t border-zinc-800 pt-1">
                  <span className="text-zinc-400">Statutory Wage Floor (Min Wages Act):</span>
                  <span className={`font-bold font-mono ${isWageCompliant ? "text-emerald-400" : "text-rose-400"}`}>
                    ₹{dailyWageRateInr} / day {isWageCompliant ? `(≥ ₹${floorWage} Compliant)` : `(BREACH < ₹${floorWage})`}
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
                  <span>Commit Muster Audit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_MUSTER_MODAL

# -----------------------------------------------------------------------------
# 3. PAGE: app/labor/muster/page.tsx
# Connected to live daily_labor_muster_rolls with forensic fraud indicators
# -----------------------------------------------------------------------------
cat << 'PAGE_MUSTER' > app/labor/muster/page.tsx
import React from "react";
import { LogMusterRollModal } from "@/components/labor/LogMusterRollModal";
import { createClient } from "@/lib/supabase/server";
import { Users, ShieldCheck, ShieldAlert, AlertTriangle, DollarSign, Layers } from "lucide-react";

export default async function LaborMusterPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  // Fetch real muster records
  const { data: musterRolls } = await supabase
    .from("daily_labor_muster_rolls")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });

  const activeMuster = musterRolls || [];
  const totalClaimedHeadcount = activeMuster.reduce((s, m) => s + (Number(m.claimed_headcount) || 0), 0);
  const totalVerifiedHeadcount = activeMuster.reduce((s, m) => s + (Number(m.biometric_verified_headcount) || 0), 0);
  const totalGhostWorkers = activeMuster.reduce((s, m) => s + (Number(m.ghost_workers_count) || 0), 0);
  const totalGhostDebitInr = activeMuster.reduce((s, m) => s + (Number(m.ghost_wage_debit_inr) || 0), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-emerald-400 uppercase tracking-widest font-bold">
            <Users className="w-3.5 h-3.5" />
            <span>LABOR &amp; WELFARE GOVERNANCE • BOCW ACT 1996 / MINIMUM WAGES ACT 1948 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Biometric Labor Muster &amp; Statutory Wage Ledger
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Anti-passback turnstile verification, ghost worker contra-charge debits, and Section 65B notarized muster rolls[cite: 1].
          </p>
        </div>

        <LogMusterRollModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total Claimed Headcount</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">{totalClaimedHeadcount} Workers</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">{activeMuster.length} Shift Musters Audited</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Biometric Ingress Verified</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">{totalVerifiedHeadcount} Punched</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Turnstile anti-passback cleared[cite: 1]</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Ghost Workers Flagged</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${totalGhostWorkers > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {totalGhostWorkers} Flagged
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">
            {totalGhostWorkers > 0 ? "Bypassed turnstile ingress[cite: 1]" : "100% headcount match"}
          </span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Ghost Wage Contra-Charges</span>
          <div className={`text-xl font-bold mt-1 tabular-nums ${totalGhostDebitInr > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            ₹{totalGhostDebitInr.toLocaleString("en-IN")}
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Debited from contractor IPCs[cite: 1]</span>
        </div>
      </div>

      {/* MUSTER AUDIT REGISTER TABLE */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Shift Muster Roll Audit Register ({activeMuster.length})
          </span>
          <span className="text-[10px] text-zinc-500">BOCW Act Statutory Shift Log</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {activeMuster.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero muster rolls audited. Click &quot;+ Audit Daily Muster&quot; to cross-reference contractor rolls with turnstile biometrics.
            </div>
          ) : (
            activeMuster.map((muster: any) => {
              const hasGhosts = Number(muster.ghost_workers_count) > 0;
              const isCompliant = muster.status === "VERIFIED_AUDIT_PASSED";

              return (
                <div key={muster.id} className="p-4 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 hover:bg-zinc-850/50 transition">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 font-bold text-[10px]">
                        {muster.muster_code}
                      </span>
                      <strong className="text-white text-sm">{muster.trade_classification.replace("_", " ")}</strong>
                      <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-bold text-[9px]">
                        {muster.skill_tier}
                      </span>
                    </div>

                    <div className="text-zinc-400 text-[11px] font-sans flex flex-wrap gap-x-4 gap-y-1">
                      <span>Agency: <strong className="text-zinc-300">{muster.contractor_agency}</strong></span>
                      <span>Date: <strong className="text-zinc-300">{muster.shift_date}</strong></span>
                      <span>Claimed: <strong className="text-zinc-200 font-mono">{muster.claimed_headcount}</strong></span>
                      <span>Biometric: <strong className="text-cyan-400 font-mono">{muster.biometric_verified_headcount}</strong></span>
                      <span>Daily Wage: <strong className="text-emerald-400 font-mono">₹{muster.daily_wage_rate_inr}</strong></span>
                    </div>

                    {hasGhosts && (
                      <div className="text-rose-400 text-[10px] font-mono pt-0.5">
                        &bull; Forensic Warning: {muster.ghost_workers_count} unverified ghost worker(s) debited at ₹{muster.ghost_wage_debit_inr} from contractor bill[cite: 1].
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                      isCompliant
                        ? "bg-emerald-950 border-emerald-800 text-emerald-300"
                        : "bg-rose-950 border-rose-800 text-rose-300"
                    }`}>
                      {isCompliant ? (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Muster Verified</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                          <span>{hasGhosts ? "Ghost Worker Debit" : "Statutory Wage Breach"}</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
PAGE_MUSTER

# -----------------------------------------------------------------------------
# 4. VERIFY FULL COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Labor Muster & BOCW Wage Governance Engine deployed cleanly with ZERO errors!\033[0m"
