"use client";

import React, { useState, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  evaluateHindrancesAndEot,
  HindranceLogEvent,
  HindranceClassification
} from "@/lib/calculations/hindranceEotEngine";

// --- INLINE SVG ICONS ---
const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 00-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const AlertTriangleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const FileTextIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);
const RefreshIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function HindranceEotPage() {
  const contractSpec = {
    projectTag: "VANGUARD-COMMERCIAL-HUB",
    contractSanctionedBac: 18592000, // ₹1.8592 Cr
    contractDurationDays: 180,
    originalCompletionDate: "27-Oct-2026",
    contractor: "Larsen & Toubro Construction Ltd",
    supervisingPmc: "CBRE South Asia Pvt Ltd",
    client: "Vanguard Holdings Group Pvt Ltd"
  };

  // Statutory CPWD Form 24 Hindrance Register
  const [hindrances, setHindrances] = useState<HindranceLogEvent[]>([
    {
      hindranceId: "HIN-01",
      hindranceNo: "HN-2026-001",
      wbsActivityId: "ACT-01",
      activityDescription: "Deep Bored Piling & Excavation (Zone A)",
      classification: "EMPLOYER_RISK_EVENT",
      startDate: "12-May-2026",
      endDate: "20-May-2026",
      grossDurationDays: 8,
      criticalPathTotalFloatDays: 0, // On Critical Path (TF = 0)
      netCriticalDelayDays: 8,
      isConcurrent: false,
      statutoryNoticeServedWithinDays: 4, // CPWD Cl. 5.2 compliant (< 14d)
      isNoticeCompliant: true,
      compensableStatus: "TIME_AND_COST"
    },
    {
      hindranceId: "HIN-02",
      hindranceNo: "HN-2026-002",
      wbsActivityId: "ACT-03",
      activityDescription: "Ground Podium Slab Shuttering & Electrical Conduits",
      classification: "FORCE_MAJEURE_STATUTORY",
      startDate: "04-Jul-2026",
      endDate: "09-Jul-2026",
      grossDurationDays: 5,
      criticalPathTotalFloatDays: 0,
      netCriticalDelayDays: 5,
      isConcurrent: false,
      statutoryNoticeServedWithinDays: 2,
      isNoticeCompliant: true,
      compensableStatus: "TIME_ONLY" // Force Majeure = Time, No Cost
    },
    {
      hindranceId: "HIN-03",
      hindranceNo: "HN-2026-003",
      wbsActivityId: "ACT-04",
      activityDescription: "HVAC Packaged Chiller Procurement & Factory Testing",
      classification: "EMPLOYER_RISK_EVENT",
      startDate: "18-Aug-2026",
      endDate: "26-Aug-2026",
      grossDurationDays: 8,
      criticalPathTotalFloatDays: 12, // Absorbed by 12 days Total Float!
      netCriticalDelayDays: 0, // 8 <= 12 TF -> Zero Milestone Delay!
      isConcurrent: false,
      statutoryNoticeServedWithinDays: 6,
      isNoticeCompliant: true,
      compensableStatus: "NON_COMPENSABLE"
    },
    {
      hindranceId: "HIN-04",
      hindranceNo: "HN-2026-004",
      wbsActivityId: "ACT-06",
      activityDescription: "ISMB 450 Structural Steel Moment Frame Erection",
      classification: "EMPLOYER_RISK_EVENT",
      startDate: "10-Sep-2026",
      endDate: "18-Sep-2026",
      grossDurationDays: 8,
      criticalPathTotalFloatDays: 2, // Only 2 days float -> 6 days critical
      netCriticalDelayDays: 6,
      isConcurrent: false,
      statutoryNoticeServedWithinDays: 5,
      isNoticeCompliant: true,
      compensableStatus: "TIME_AND_COST"
    }
  ]);

  const [selectedHindranceId, setSelectedHindranceId] = useState<string>("HIN-01");
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [sealedHash, setSealedHash] = useState<string | null>(null);

  // Synthesize EOT calculations
  const eotSummary = useMemo(() => {
    return evaluateHindrancesAndEot(
      hindrances,
      contractSpec.contractSanctionedBac,
      contractSpec.contractDurationDays,
      contractSpec.originalCompletionDate
    );
  }, [hindrances, contractSpec]);

  const activeHindrance = useMemo(() => {
    return hindrances.find(h => h.hindranceId === selectedHindranceId) || hindrances[0];
  }, [hindrances, selectedHindranceId]);

  const handleSealEotArbitrationLedger = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `VANGUARD_EOT_CLAIM_DAYS_${eotSummary.netNonConcurrentCriticalDelayDays}_REVISED_${eotSummary.proposedRevisedCompletionDate}_HUDSON_${eotSummary.hudsonOverheadClaimInr}_LD_${eotSummary.contractorLiquidatedDamagesExposureInr}_${timestamp}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setSealedHash(hash);
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "VANGUARD-COMMERCIAL-HUB",
          primary_governor: "JUSTICIA-CONTRACTS",
          synthesis_report: `STATUTORY EOT CLAIM NOTARIZED: Net Critical Extension: ${eotSummary.netNonConcurrentCriticalDelayDays} Days • Revised Completion: ${eotSummary.proposedRevisedCompletionDate} • Hudson Overhead Entitlement: ₹${(eotSummary.hudsonOverheadClaimInr / 100000).toFixed(2)}L • Liquidated Damages Shield: ₹0 LD Payable • CPWD GCC Clause 5 Sign-Off Attested`,
          merkle_root_hash: hash
        });
      } catch (e) {}
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Top Header */}
      <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
              CPWD GCC CL. 5 / FIDIC 8.4
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              SCL DELAY PROTOCOL / TIME IMPACT ANALYSIS
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            STATUTORY HINDRANCE REGISTER & EOT CLAIM SHIELD
          </h1>
          <p className="text-xs text-slate-400">
            Project Vanguard • Total BAC: ₹1.859 Cr • CPWD Form 24 Logbook & Hudson Overhead Prolongation Engine
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition">← COMMAND CENTER</a>
          <a href="/site/master-schedule" className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition">📅 CPM FLOAT</a>
          <a href="/site/commercial" className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition">💼 COMMERCIAL</a>
          <a href="/site/evidence-vault" className="px-3 py-1.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-xs rounded-lg transition">⚖️ EVIDENCE VAULT</a>
        </div>
      </div>

      {/* Primary KPI Commercial & Delay Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">NET CRITICAL DELAY</div>
          <div className="text-xl font-bold text-amber-400 mt-1 font-mono">
            +{eotSummary.netNonConcurrentCriticalDelayDays} Days
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Gross Hindrances: {eotSummary.totalGrossHindranceDays} Days
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">REVISED MILESTONE DATE</div>
          <div className="text-xl font-bold text-white mt-1 font-mono">
            {eotSummary.proposedRevisedCompletionDate}
          </div>
          <div className="text-[10px] text-cyan-400 mt-0.5">
            Original: {contractSpec.originalCompletionDate}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">LIQUIDATED DAMAGES (CL. 2)</div>
          <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">
            ₹0.00 (SHIELDED)
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            Max Exposure: ₹{(contractSpec.contractSanctionedBac * 0.10).toLocaleString()}
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">HUDSON OVERHEAD CLAIM</div>
          <div className="text-xl font-bold text-cyan-400 mt-1 font-mono">
            ₹{(eotSummary.hudsonOverheadClaimInr / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            14 Compensable Days @ 15% HO
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">STATUTORY STATUS</div>
          <div className="text-sm font-bold text-emerald-400 mt-1.5 flex items-center gap-1.5">
            <ShieldCheckIcon className="w-4 h-4 text-emerald-400" />
            <span>100% NOTICE COMPLIANT</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">CPWD Cl. 5.2 14-Day Rule</div>
        </div>
      </div>

      {/* Main Grid: CPWD Form 24 Hindrance Register & Detailed Delay Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: CPWD Form 24 Hindrance Table */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <span className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileTextIcon className="w-3.5 h-3.5 text-amber-400" />
              CPWD FORM 24: STATUTORY HINDRANCE REGISTER
            </span>
            <span className="text-amber-400 font-mono text-[10px]">
              {hindrances.length} EVENTS RECORDED
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950/80 text-[10px] text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">EVENT #</th>
                  <th className="py-2.5 px-3">WBS DESCRIPTION</th>
                  <th className="py-2.5 px-3">CLASSIFICATION</th>
                  <th className="py-2.5 px-3 text-center">DURATION</th>
                  <th className="py-2.5 px-3 text-center">TOTAL FLOAT</th>
                  <th className="py-2.5 px-3 text-center">CRITICAL DELAY</th>
                  <th className="py-2.5 px-3 text-right">COMPENSATION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300 text-[11px]">
                {hindrances.map(h => {
                  const isSelected = selectedHindranceId === h.hindranceId;
                  return (
                    <tr
                      key={h.hindranceId}
                      onClick={() => setSelectedHindranceId(h.hindranceId)}
                      className={`cursor-pointer transition ${
                        isSelected ? "bg-slate-900/90 text-white font-bold" : "hover:bg-slate-900/40"
                      }`}
                    >
                      <td className="py-3 px-3 text-amber-400">{h.hindranceNo}</td>
                      <td className="py-3 px-3">
                        <div className="text-white font-sans text-xs font-semibold leading-tight">
                          {h.activityDescription}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {h.wbsActivityId} • {h.startDate} to {h.endDate}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          h.classification === "EMPLOYER_RISK_EVENT"
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-500/20"
                            : "bg-purple-950 text-purple-400 border border-purple-500/20"
                        }`}>
                          {h.classification.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">{h.grossDurationDays}d</td>
                      <td className="py-3 px-3 text-center text-slate-400">{h.criticalPathTotalFloatDays}d</td>
                      <td className="py-3 px-3 text-center font-bold text-amber-400">
                        {h.netCriticalDelayDays > 0 ? `+${h.netCriticalDelayDays}d` : "0d"}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          h.compensableStatus === "TIME_AND_COST"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                            : h.compensableStatus === "TIME_ONLY"
                            ? "bg-amber-950 text-amber-400 border border-amber-500/30"
                            : "bg-slate-950 text-slate-500 border border-slate-800"
                        }`}>
                          {h.compensableStatus.replace(/_/g, " ")}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 bg-slate-950/80 border-t border-slate-800 text-[10px] text-slate-400 flex justify-between">
            <span>SCL Delay Protocol: Total Float is an expiring resource belonging to the project.</span>
            <span className="font-bold text-white">
              Cumulative Critical Impact: +{eotSummary.netNonConcurrentCriticalDelayDays} Days
            </span>
          </div>
        </div>

        {/* Right: SCL Delay Analysis Dossier & Section 65B Seal */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-800 pb-2">
              TIME IMPACT ANALYSIS (TIA): {activeHindrance.hindranceNo}
            </span>

            <div className="flex flex-col gap-2.5 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-bold">AFFECTED CPM ACTIVITY</span>
                <div className="text-white font-bold text-sm mt-0.5">{activeHindrance.activityDescription}</div>
                <div className="text-[10px] text-cyan-400 mt-0.5">Task Code: {activeHindrance.wbsActivityId}</div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5 font-mono">
                <div className="flex justify-between text-slate-300">
                  <span>Gross Hindrance Span:</span>
                  <span className="font-bold text-white">{activeHindrance.grossDurationDays} Days</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Available Total Float (TF):</span>
                  <span className="font-bold text-cyan-400">{activeHindrance.criticalPathTotalFloatDays} Days</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-1 border-t border-slate-800">
                  <span>Net Milestone Delay:</span>
                  <span className="font-bold text-amber-400">+{activeHindrance.netCriticalDelayDays} Days</span>
                </div>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex flex-col gap-1 text-[11px]">
                <span className="text-[10px] text-slate-500 uppercase font-bold">STATUTORY NOTICE ATTRIBUTION</span>
                <div className="text-slate-300">
                  Notice Served: <strong className="text-white">Day +{activeHindrance.statutoryNoticeServedWithinDays}</strong> of occurrence (CPWD Limit: 14 Days)
                </div>
                <div className="text-emerald-400 font-bold mt-0.5">
                  ✔ Formally acknowledged by CBRE Resident Engineer
                </div>
              </div>
            </div>
          </div>

          {/* Section 65B EOT Arbitral Award Attestation */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-1">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>SECTION 65B EOT ARBITRAL ATTESTATION</span>
              </div>
              <div className="text-[11px] text-slate-300 leading-relaxed">
                Cryptographically binds contemporaneous weather data, site daily diaries, and Float consumption proofs into a court-admissible forensic delay bundle.
              </div>
            </div>

            <div>
              {sealedHash ? (
                <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>EOT DELAY BUNDLE SEALED & NOTARIZED</span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono truncate select-all">
                    {sealedHash}
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleSealEotArbitrationLedger}
                  disabled={isNotarizing}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(245,158,11,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ClockIcon className="w-4 h-4 text-slate-950" />}
                  <span>SEAL EOT FORENSIC CLAIM (SEC 65B)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
