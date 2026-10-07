#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating directory structures...\033[0m"
mkdir -p lib/commercial app/actions components/commercial app/commercial/cure-notices

echo -e "\033[1;36m[+] Deploying Subcontractor Cure Notice Engine (Themis & Midas)...\033[0m"

# -----------------------------------------------------------------------------
# 1. ACTION: app/actions/cure-notice-actions.ts
# Evaluates Themis Cl. 2/3 rules, Midas exposures, and notarizes via Hermes
# -----------------------------------------------------------------------------
cat << 'ACTION_CURE' > app/actions/cure-notice-actions.ts
"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { HermesAgent } from "@/lib/agents/hermes";

export interface IssueCureNoticePayload {
  projectId: string;
  defaultingAgency: string;
  tradeClassification: string;
  clauseInvoked: string;
  defaultReason: "CRITICAL_PATH_ABANDONMENT" | "QUALITY_NCR_NON_RECTIFICATION" | "BOCW_WAGE_BREACH" | string;
  curePeriodDays: number;
  contractValuationInr: number;
  specificDefaultDetails: string;
  issuedBy?: string;
}

export interface CureNoticeRecord {
  id: string;
  project_id: string;
  notice_code: string;
  defaulting_agency: string;
  trade_classification: string;
  clause_invoked: string;
  default_reason: string;
  cure_period_days: number;
  cure_deadline: string;
  liquidated_damages_exposure_inr: number;
  security_deposit_at_risk_inr: number;
  notice_text_markdown: string;
  status: string;
  seor_signoff_hash?: string | null;
  issued_by: string;
  issued_at: string;
  created_at: string;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-project.supabase.co";
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "placeholder-service-key";
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function issueStatutoryCureNotice(payload: IssueCureNoticePayload) {
  try {
    const supabase = getSupabase();
    const noticeCode = `NOTICE-CURE-${Date.now().toString().slice(-6)}`;
    const issuer = payload.issuedBy || "Head of Project Commercial & Legal";

    // 1. Calculate Statutory Financial Exposures
    const ldExposureInr = Math.round(payload.contractValuationInr * 0.10); // Capped at 10% per CPWD Cl. 2
    const securityDepositAtRiskInr = Math.round(payload.contractValuationInr * 0.05); // 5% standard security deposit

    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + payload.curePeriodDays);
    const deadlineIso = deadlineDate.toISOString().slice(0, 10);

    // 2. Draft Court-Ready Statutory Notice to Correct Text
    const noticeTextMarkdown = `
# FORMAL STATUTORY NOTICE TO CORRECT & CURE PERIOD DEMAND
**ISSUED UNDER ${payload.clauseInvoked.toUpperCase()}**
*In accordance with Section 65B of the Indian Evidence Act, 1872*

---

**NOTICE REFERENCE:** ${noticeCode}  
**DATE OF ISSUANCE:** ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}  
**TO:** ${payload.defaultingAgency} (${payload.tradeClassification})  
**PROJECT IDENTIFIER:** ${payload.projectId}  

### 1. SUBJECT MATTER: NOTICE OF DEFAULT & IMPOSITION OF CURE PERIOD
You are hereby formally notified that you are in material default of your contractual obligations under the covenants governing Project [${payload.projectId}].

### 2. SPECIFICATION OF DEFAULT
- **Category of Default:** ${payload.defaultReason.replace(/_/g, " ")}
- **Factual Particulars:** ${payload.specificDefaultDetails}
- **Governing Contractual Clause:** ${payload.clauseInvoked}

### 3. MANDATORY STATUTORY CURE PERIOD
In terms of ${payload.clauseInvoked}, you are granted a peremptory cure period of **${payload.curePeriodDays} CALENDAR DAYS**, expiring on **${deadlineIso}** at 18:00 Hours IST, to remedy the defaults cited herein.

### 4. CONSEQUENCES OF NON-COMPLIANCE & RISK-PURCHASE
Take notice that upon your failure to cure the defaults within the stipulated deadline:
1. **Liquidated Damages:** Clause 2 recovery shall be levied at 1.0% per week, up to the contractual cap of **₹${ldExposureInr.toLocaleString("en-IN")}**.
2. **Security Deposit Forfeiture:** Your performance bank guarantee / retention escrow amounting to **₹${securityDepositAtRiskInr.toLocaleString("en-IN")}** shall be forfeited.
3. **Execution at Risk & Cost (Clause 3):** The balance works shall be executed through third-party agencies at your sole risk, cost, and consequence.

---
**ISSUED BY:**  
${issuer}  
*For and on behalf of the Principal Employer / Main Contractor*
    `.trim();

    // 3. Commit record to statutory_cure_notices
    const { data, error } = await supabase
      .from("statutory_cure_notices")
      .insert({
        project_id: payload.projectId,
        notice_code: noticeCode,
        defaulting_agency: payload.defaultingAgency,
        trade_classification: payload.tradeClassification,
        clause_invoked: payload.clauseInvoked,
        default_reason: payload.defaultReason,
        cure_period_days: payload.curePeriodDays,
        cure_deadline: deadlineIso,
        liquidated_damages_exposure_inr: ldExposureInr,
        security_deposit_at_risk_inr: securityDepositAtRiskInr,
        notice_text_markdown: noticeTextMarkdown,
        status: "CURE_PERIOD_ACTIVE",
        issued_by: issuer,
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // 4. Hermes Section 65B Notarization
    const seal = await HermesAgent.notarizeTransaction({
      projectId: payload.projectId,
      actionTitle: `Statutory Cure Notice Issued: ${noticeCode} -> ${payload.defaultingAgency}`,
      actionCategory: "COMMERCIAL_CURE_NOTICE_SERVED",
      moduleRef: noticeCode,
      details: { payload, noticeCode, deadlineIso, ldExposureInr } as unknown as Record<string, unknown>,
      signatoryName: issuer,
      signatoryRole: "Lead Contracts Adjudicator",
      severity: "critical",
    });

    await supabase
      .from("statutory_cure_notices")
      .update({ seor_signoff_hash: seal.blockHash })
      .eq("id", data.id);

    revalidatePath("/commercial/cure-notices");
    revalidatePath("/commercial/ra-bills");
    revalidatePath("/");

    return { success: true, data, noticeCode, deadlineIso, sealHash: seal.blockHash };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to issue statutory cure notice." };
  }
}

export async function fetchStatutoryCureNotices(projectId = "GOMTI-NAGAR-PH1-FITOUT"): Promise<CureNoticeRecord[]> {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from("statutory_cure_notices")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data || []) as CureNoticeRecord[];
  } catch (err: any) {
    console.error("[fetchStatutoryCureNotices notice]:", err.message);
    return [];
  }
}
ACTION_CURE

# -----------------------------------------------------------------------------
# 2. COMPONENT: components/commercial/IssueCureNoticeModal.tsx
# Field dialog for issuing statutory default notices with live LD exposure math
# -----------------------------------------------------------------------------
cat << 'COMP_CURE_MODAL' > components/commercial/IssueCureNoticeModal.tsx
"use client";

import React, { useState } from "react";
import { issueStatutoryCureNotice } from "@/app/actions/cure-notice-actions";
import { Plus, AlertTriangle, ShieldAlert, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
}

export function IssueCureNoticeModal({ projectId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [defaultingAgency, setDefaultingAgency] = useState("Falcon Structural Steel Erectors");
  const [tradeClassification, setTradeClassification] = useState("Structural Rebar & Shuttering");
  const [clauseInvoked, setClauseInvoked] = useState("CPWD GCC Cl. 2 & 3 / FIDIC Cl. 15.1");
  const [defaultReason, setDefaultReason] = useState("CRITICAL_PATH_ABANDONMENT");
  const [curePeriodDays, setCurePeriodDays] = useState(7);
  const [contractValuationInr, setContractValuationInr] = useState(15000000);
  const [specificDefaultDetails, setSpecificDefaultDetails] = useState("Subcontractor demobilized critical-path bar bending gang from Grid SW-02, causing 14 calendar days of unexcused critical float slippage.");
  const [issuedBy, setIssuedBy] = useState("Akshat Singh Rathore (CEO & Lead Contracts Engineer)");

  const ldCap = Math.round(contractValuationInr * 0.10);
  const pbgRisk = Math.round(contractValuationInr * 0.05);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await issueStatutoryCureNotice({
        projectId,
        defaultingAgency,
        tradeClassification,
        clauseInvoked,
        defaultReason,
        curePeriodDays: Number(curePeriodDays),
        contractValuationInr: Number(contractValuationInr),
        specificDefaultDetails,
        issuedBy,
      });

      if (res.success) {
        setIsOpen(false);
      } else {
        alert(res.error || "Failed to issue statutory cure notice.");
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
        <span>+ Issue Statutory Cure Notice</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-xs select-none">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-start border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] text-rose-400 uppercase tracking-widest font-bold">
                  CPWD GCC Cl. 2 &amp; 3 / FIDIC Cl. 15.1 • Legal Default
                </span>
                <h3 className="text-base font-bold text-white uppercase mt-0.5">
                  Serve Subcontractor Notice to Correct
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

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Defaulting Subcontractor
                  </label>
                  <input
                    type="text"
                    required
                    value={defaultingAgency}
                    onChange={(e) => setDefaultingAgency(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Trade / Package
                  </label>
                  <input
                    type="text"
                    required
                    value={tradeClassification}
                    onChange={(e) => setTradeClassification(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-200 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Default Classification
                  </label>
                  <select
                    value={defaultReason}
                    onChange={(e) => setDefaultReason(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-rose-400 text-xs font-bold"
                  >
                    <option value="CRITICAL_PATH_ABANDONMENT">Critical Path Abandonment / Float Breach</option>
                    <option value="QUALITY_NCR_NON_RECTIFICATION">Unrectified Structural NCR Defect</option>
                    <option value="BOCW_WAGE_BREACH">Statutory Minimum Wage / Ghost Worker Default</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                    Statutory Cure Period
                  </label>
                  <select
                    value={curePeriodDays}
                    onChange={(e) => setCurePeriodDays(Number(e.target.value))}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-cyan-400 font-bold text-xs"
                  >
                    <option value={7}>7 Calendar Days (Standard CPWD Cl. 3)</option>
                    <option value={14}>14 Calendar Days (FIDIC Cl. 15.1)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Subcontract Package Valuation (₹ INR)
                </label>
                <input
                  type="number"
                  required
                  value={contractValuationInr}
                  onChange={(e) => setContractValuationInr(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-white font-bold text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase block font-bold mb-1">
                  Factual Particulars of Default
                </label>
                <textarea
                  rows={3}
                  required
                  value={specificDefaultDetails}
                  onChange={(e) => setSpecificDefaultDetails(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-zinc-300 text-xs font-sans leading-relaxed"
                />
              </div>

              {/* STATUTORY EXPOSURE PREVIEW */}
              <div className="p-3 bg-rose-950/40 border border-rose-800/80 rounded-xl space-y-1.5 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Clause 2 Liquidated Damages Cap:</span>
                  <span className="font-bold font-mono text-rose-400">₹{ldCap.toLocaleString("en-IN")} (10%)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Performance Security Deposit at Risk:</span>
                  <span className="font-bold font-mono text-amber-400">₹{pbgRisk.toLocaleString("en-IN")} (5%)</span>
                </div>
                <div className="border-t border-zinc-800 pt-1 text-[9px] text-zinc-400 font-sans">
                  Failure to cure within {curePeriodDays} days authorizes immediate risk-cost execution under CPWD GCC Clause 3.
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
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold uppercase rounded text-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Sign &amp; Serve Cure Notice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
COMP_CURE_MODAL

# -----------------------------------------------------------------------------
# 3. PAGE: app/commercial/cure-notices/page.tsx
# Connected Statutory Cure Notices table with live countdown and markdown export
# -----------------------------------------------------------------------------
cat << 'PAGE_CURE' > app/commercial/cure-notices/page.tsx
import React from "react";
import { fetchStatutoryCureNotices } from "@/app/actions/cure-notice-actions";
import { IssueCureNoticeModal } from "@/components/commercial/IssueCureNoticeModal";
import { createClient } from "@/lib/supabase/server";
import { AlertTriangle, ShieldAlert, Download, Clock, ShieldCheck, Layers } from "lucide-react";

export default async function CureNoticesPage() {
  const supabase = await createClient();

  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";

  const notices = await fetchStatutoryCureNotices(projectId);

  const activeNotices = notices.filter((n) => n.status === "CURE_PERIOD_ACTIVE");
  const totalLdExposure = activeNotices.reduce((s, n) => s + Number(n.liquidated_damages_exposure_inr), 0);
  const totalSecurityAtRisk = activeNotices.reduce((s, n) => s + Number(n.security_deposit_at_risk_inr), 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-rose-400 uppercase tracking-widest font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>CONTRACTUAL DEFAULT &amp; CURE PERIODS • CPWD CL. 2/3 / FIDIC CL. 15.1 • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Subcontractor Statutory Cure Notices &amp; Default Ledger
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            {projectName} • Formal 7/14-day cure clocks, liquidated damages exposure warnings, and Section 65B certified legal notices.
          </p>
        </div>

        <IssueCureNoticeModal projectId={projectId} />
      </header>

      {/* 4 STATUTORY KPI TILES */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active Default Clocks</span>
          <div className="text-xl font-bold text-rose-400 mt-1 tabular-nums">{activeNotices.length} Notices</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Cure periods running</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Total LD at Risk</span>
          <div className="text-xl font-bold text-amber-400 mt-1 tabular-nums">
            ₹{(totalLdExposure / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">CPWD Cl. 2 10% ceiling</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">PBG / Retention at Risk</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">
            ₹{(totalSecurityAtRisk / 100000).toFixed(2)} Lakh
          </div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Subject to Clause 3 forfeiture</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Statutory Admissibility</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">Sec. 65B Certified</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Anchored by Hermes Merkle hash</span>
        </div>
      </div>

      {/* CURE NOTICES REGISTER */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Subcontractor Statutory Cure Register ({notices.length})
          </span>
          <span className="text-[10px] text-zinc-500">CPWD Works Manual Clause 2 &amp; 3 Ledger</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {notices.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              Zero cure notices issued. Click &quot;+ Issue Statutory Cure Notice&quot; to place a defaulting subcontractor on contractual cure notice.
            </div>
          ) : (
            notices.map((notice) => {
              const isActive = notice.status === "CURE_PERIOD_ACTIVE";

              return (
                <div key={notice.id} className="p-5 space-y-3 hover:bg-zinc-850/50 transition">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-bold text-[10px]">
                        {notice.notice_code}
                      </span>
                      <strong className="text-white text-sm">{notice.defaulting_agency}</strong>
                      <span className="text-zinc-500 text-xs">({notice.trade_classification})</span>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded text-[9px] font-bold uppercase flex items-center gap-1 ${
                      isActive
                        ? "bg-rose-950 border border-rose-800 text-rose-300"
                        : "bg-emerald-950 border border-emerald-800 text-emerald-300"
                    }`}>
                      <Clock className="w-3 h-3" />
                      <span>{isActive ? `CURE DEADLINE: ${notice.cure_deadline}` : notice.status}</span>
                    </span>
                  </div>

                  <div className="text-[11px] text-zinc-400 font-sans flex flex-wrap gap-x-5 gap-y-1">
                    <span>Grounds: <strong className="text-rose-400">{notice.default_reason.replace(/_/g, " ")}</strong></span>
                    <span>Clause: <strong className="text-zinc-200">{notice.clause_invoked}</strong></span>
                    <span>LD Exposure: <strong className="text-amber-400 font-mono">₹{Number(notice.liquidated_damages_exposure_inr).toLocaleString("en-IN")}</strong></span>
                    <span>PBG at Risk: <strong className="text-cyan-400 font-mono">₹{Number(notice.security_deposit_at_risk_inr).toLocaleString("en-IN")}</strong></span>
                    <span>Issued By: <strong className="text-zinc-300">{notice.issued_by}</strong></span>
                  </div>

                  {/* NOTICE TEXT PREVIEW & EXPORT ACTIONS */}
                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-rose-400 font-bold uppercase">
                        Legal Notice Document Preview:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const element = document.createElement("a");
                          const file = new Blob([notice.notice_text_markdown], { type: "text/markdown" });
                          element.href = URL.createObjectURL(file);
                          element.download = `${notice.notice_code}.md`;
                          document.body.appendChild(element);
                          element.click();
                          document.body.removeChild(element);
                        }}
                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-bold text-[9px] uppercase flex items-center gap-1 cursor-pointer transition"
                      >
                        <Download className="w-3 h-3" />
                        <span>Export Legal Notice (.md)</span>
                      </button>
                    </div>

                    <pre className="text-[10px] text-zinc-300 font-mono max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                      {notice.notice_text_markdown}
                    </pre>
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
PAGE_CURE

# -----------------------------------------------------------------------------
# 4. VERIFY FULL BUILD TYPESCRIPT COMPILATION
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying full TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Subcontractor Statutory Cure Notice Engine deployed cleanly with ZERO errors!\033[0m"
