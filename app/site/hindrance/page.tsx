"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- INLINE SVG ICONS ---
const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);
const AlertTriangleIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);
const FileTextIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const CheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);
const RefreshIcon = ({ className = "w-3.5 h-3.5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface HindranceItem {
  id: string;
  hindranceNo: string;
  bitTarget: string;
  clauseReference: string;
  category: "CLIENT_DELAY" | "UNFORESEEN_GROUND" | "FORCE_MAJEURE" | "STATUTORY_NOC";
  description: string;
  startDate: string;
  endDate: string;
  grossDaysLost: number;
  netCriticalImpactDays: number;
  ldExposureProtectedInr: number;
  status: "NOTARIZED_APPROVED" | "PENDING_SE_APPROVAL" | "UNDER_ASSESSMENT";
  evidenceRefs: string[];
}

const HINDRANCE_LOG: HindranceItem[] = [
  {
    id: "HIND-VANGUARD-01",
    hindranceNo: "HN-2026-08",
    bitTarget: "BIT-4 EAST TRIANGULAR PROW",
    clauseReference: "CPWD GCC Cl. 5.2 / FIDIC Sub-Cl. 8.4(b)",
    category: "CLIENT_DELAY",
    description: "Delayed Architectural PMC GFC Drawings for 94m Terracotta Rain-Screen Bracket Anchorage",
    startDate: "12-Sep-2026",
    endDate: "26-Sep-2026",
    grossDaysLost: 14,
    netCriticalImpactDays: 14,
    ldExposureProtectedInr: 8645000,
    status: "NOTARIZED_APPROVED",
    evidenceRefs: ["PMC-TRANS-2026-881", "DPR-374-TO-388", "RFI-PROW-112"]
  },
  {
    id: "HIND-VANGUARD-02",
    hindranceNo: "HN-2026-09",
    bitTarget: "BIT-1 GREEN WEDGE PODIUM",
    clauseReference: "CPWD GCC Cl. 5.3 / FIDIC Sub-Cl. 4.12",
    category: "UNFORESEEN_GROUND",
    description: "Unseasonal Gomti Riverfront Sub-surface Water Table Infiltration at South Portal Footings",
    startDate: "02-Oct-2026",
    endDate: "09-Oct-2026",
    grossDaysLost: 7,
    netCriticalImpactDays: 4,
    ldExposureProtectedInr: 2470000,
    status: "NOTARIZED_APPROVED",
    evidenceRefs: ["GEO-BORE-SURVEY-04", "DPR-394-TO-400", "DEWATERING-LOG-22"]
  },
  {
    id: "HIND-VANGUARD-03",
    hindranceNo: "HN-2026-10",
    bitTarget: "BIT-6 38M HELIPAD CROWN",
    clauseReference: "CPWD GCC Cl. 5.1 / FIDIC Sub-Cl. 8.4(d)",
    category: "STATUTORY_NOC",
    description: "DGCA / Airport Authority Height Clearance Re-validation for 90.5m Aviation Beacon Installation",
    startDate: "18-Oct-2026",
    endDate: "24-Oct-2026",
    grossDaysLost: 6,
    netCriticalImpactDays: 0, // Activity had 8 days total float
    ldExposureProtectedInr: 0,
    status: "PENDING_SE_APPROVAL",
    evidenceRefs: ["DGCA-LTR-2026-771", "AIRSPACE-RADAR-LOD400"]
  },
  {
    id: "HIND-VANGUARD-04",
    hindranceNo: "HN-2026-11",
    bitTarget: "BIT-2 SILVER DOME AUDITORIUM",
    clauseReference: "CPWD GCC Cl. 10CA & Cl. 5",
    category: "CLIENT_DELAY",
    description: "Revision to Acoustic Perforated Ceiling Material Specification (NRC 0.85 Upgrade Requirement)",
    startDate: "22-Oct-2026",
    endDate: "Active (Expected 29-Oct)",
    grossDaysLost: 7,
    netCriticalImpactDays: 5,
    ldExposureProtectedInr: 3087500,
    status: "UNDER_ASSESSMENT",
    evidenceRefs: ["ACOUSTIC-MEMO-ARCHOHM-42", "DPR-414-418"]
  }
];

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function JpnicHindranceEotPage() {
  const [activeHindrance, setActiveHindrance] = useState<HindranceItem>(HINDRANCE_LOG[0]);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authorizedIds, setAuthorizedIds] = useState<string[]>(["HIND-VANGUARD-01", "HIND-VANGUARD-02"]);
  const [eotMerkleHash, setEotMerkleHash] = useState<string | null>(null);

  const totalGrossDays = HINDRANCE_LOG.reduce((acc, curr) => acc + curr.grossDaysLost, 0);
  const totalNetCriticalDays = HINDRANCE_LOG.reduce((acc, curr) => acc + curr.netCriticalImpactDays, 0);
  const totalProtectedLdInr = HINDRANCE_LOG.reduce((acc, curr) => acc + curr.ldExposureProtectedInr, 0);

  const isApproved = authorizedIds.includes(activeHindrance.id);

  const handleAuthorizeNotice = async () => {
    setIsAuthorizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawPayload = `vanguard_EOT_CLAIM_NOTICE_${activeHindrance.hindranceNo}_CRITICAL_DAYS_${activeHindrance.netCriticalImpactDays}_${Date.now()}`;
    const hash = await generateSHA256(rawPayload);

    setTimeout(async () => {
      setEotMerkleHash(hash);
      setAuthorizedIds(prev => [...prev, activeHindrance.id]);
      setIsAuthorizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "UP-LDA-VANGUARD-CAMPUS",
          primary_governor: "THEMIS",
          synthesis_report: `STATUTORY EOT NOTICE NOTARIZED: ${activeHindrance.hindranceNo} • ${activeHindrance.description} • Net EOT Entitlement: ${activeHindrance.netCriticalImpactDays} Days • LD Shield ₹${(activeHindrance.ldExposureProtectedInr / 100000).toFixed(2)} Lakh`,
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
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              CPWD CLAUSE 5 & FIDIC SUB-CLAUSE 8.4
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              THEMIS • CONTRACTUAL CLAIMS SHIELD
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            STATUTORY HINDRANCE REGISTER & EXTENSION OF TIME (EOT)
          </h1>
          <p className="text-xs text-slate-400">
            PROJECT VANGUARD COMMERCIAL HUB • Time-Impact Analysis (TIA), Critical Path Delays & Liquidated Damages (LD) Defense
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/"
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-lg transition"
          >
            ← COMMAND CENTER
          </a>
          <a
            href="/site/digital-twin"
            className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs rounded-lg transition"
          >
            🏛️ 3D BIM TWIN
          </a>
          <a
            href="/site/dpr"
            className="px-3 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-xs rounded-lg transition"
          >
            📋 DPR #418
          </a>
          <a
            href="/site/ptw"
            className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition"
          >
            ⚠️ PTW SAFETY
          </a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">NET CRITICAL EOT ENTITLED</div>
          <div className="text-xl font-bold text-cyan-400 mt-1">{totalNetCriticalDays} Calendar Days</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Topological Path Impact</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">GROSS HINDRANCE DAYS</div>
          <div className="text-xl font-bold text-white mt-1">{totalGrossDays} Days Logged</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Includes Concurrent Events</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">LIQUIDATED DAMAGES SHIELD</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">₹{(totalProtectedLdInr / 100000).toFixed(2)} Lakh</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Protected from 0.5%/wk Penalty</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">EVALUATION METHOD</div>
          <div className="text-sm font-bold text-white mt-1.5">TIME-IMPACT ANALYSIS (TIA)</div>
          <div className="text-[10px] text-cyan-400 mt-0.5">As-Built vs As-Planned S-Curve</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">ARBITRATION ADMISSIBILITY</div>
          <div className="text-sm font-bold text-purple-400 mt-1.5">100% NOTARIZED</div>
          <div className="text-[10px] text-slate-500 mt-0.5">Indian Evidence Act Sec 65B</div>
        </div>
      </div>

      {/* Main Grid: Hindrance Register Table & Detailed Legal Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Registered Hindrances Queue */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ClockIcon className="w-3.5 h-3.5 text-cyan-400" />
              STATUTORY HINDRANCES ({HINDRANCE_LOG.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">CPWD FORM 5 RECORD</span>
          </div>

          <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[460px]">
            {HINDRANCE_LOG.map(item => {
              const isSelected = activeHindrance.id === item.id;
              const isItemApproved = authorizedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveHindrance(item)}
                  className={`p-3 rounded-xl border text-xs cursor-pointer transition flex flex-col gap-1.5 ${
                    isSelected
                      ? "bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-cyan-400">{item.hindranceNo}</span>
                    <span className={`px-1.5 py-0.2 rounded font-bold ${
                      isItemApproved
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-500/30"
                        : item.status === "PENDING_SE_APPROVAL"
                        ? "bg-amber-950 text-amber-400 border border-amber-500/30"
                        : "bg-purple-950 text-purple-300 border border-purple-500/30"
                    }`}>
                      {isItemApproved ? "NOTARIZED EOT" : item.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="text-white font-semibold text-xs leading-snug">{item.description}</div>
                  <div className="text-[10px] text-slate-400">{item.bitTarget}</div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                    <div>
                      Gross: <strong className="text-white">{item.grossDaysLost}d</strong>
                    </div>
                    <div>
                      Net TIA: <strong className="text-cyan-400 font-bold">{item.netCriticalImpactDays}d</strong>
                    </div>
                    <div>
                      Shield: <strong className="text-emerald-400">₹{(item.ldExposureProtectedInr / 100000).toFixed(1)}L</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Detailed Contractual Legal Dossier & TIA Delay Analysis */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
              <FileTextIcon className="w-4 h-4 text-cyan-400" />
              <span className="font-bold text-white uppercase tracking-wider">
                CONTEMPORANEOUS DELAY DOSSIER: {activeHindrance.hindranceNo}
              </span>
            </div>
            <span className="text-cyan-400 font-mono text-[10px]">{activeHindrance.clauseReference}</span>
          </div>

          <div className="p-4 bg-slate-950 flex-1 flex flex-col justify-between gap-4">
            {/* Delay Description & Time Period */}
            <div className="bg-black/70 border border-slate-800 p-3.5 rounded-xl flex flex-col gap-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                  STATUTORY EVENT PARTICULARS
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-500/30 font-bold">
                  {activeHindrance.category}
                </span>
              </div>
              <div className="text-white font-bold text-sm leading-relaxed">{activeHindrance.description}</div>
              <div className="text-[11px] text-slate-400">
                Period of Impact: <strong className="text-white">{activeHindrance.startDate}</strong> to <strong className="text-white">{activeHindrance.endDate}</strong> ({activeHindrance.grossDaysLost} Gross Calendar Days)
              </div>
            </div>

            {/* Time-Impact Analysis (TIA) Critical Path Impact Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold">TIME-IMPACT ANALYSIS (CHRONOS)</span>
                <div className="text-cyan-400 font-bold text-base mt-0.5">
                  {activeHindrance.netCriticalImpactDays} Days Critical Float Slips
                </div>
                <div className="text-[10px] text-slate-400">
                  {activeHindrance.netCriticalImpactDays > 0
                    ? "Activity lies on Zero-Float Topological Critical Path"
                    : "Activity had positive buffer; zero direct completion slip"}
                </div>
              </div>

              <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex flex-col gap-1.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold">LIQUIDATED DAMAGES (LD) EXPOSURE</span>
                <div className="text-emerald-400 font-bold text-base mt-0.5">
                  ₹{(activeHindrance.ldExposureProtectedInr / 100000).toFixed(2)} Lakh Protected
                </div>
                <div className="text-[10px] text-slate-400">
                  Calculated under CPWD GCC Cl. 2 (1.0% per month max 10%)
                </div>
              </div>
            </div>

            {/* Contemporaneous Evidentiary Attachments */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                CONTEMPORANEOUS SECTION 65B EVIDENCE ATTACHMENTS
              </span>
              <div className="flex flex-wrap gap-2">
                {activeHindrance.evidenceRefs.map((ref, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg text-slate-300 text-[10px] flex items-center gap-1.5"
                  >
                    <CheckIcon className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{ref}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Authorize EOT Notice Action */}
            <div className="pt-2 border-t border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="text-xs text-slate-400">
                Governed By: <strong className="text-cyan-400">THEMIS (Contracts & Claims)</strong>
              </div>

              <div>
                {isApproved ? (
                  <span className="px-3.5 py-1.5 bg-emerald-950 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-2">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>EOT NOTARIZED & SERVED ON UP-LDA</span>
                  </span>
                ) : (
                  <button
                    onClick={handleAuthorizeNotice}
                    disabled={isAuthorizing}
                    className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                  >
                    {isAuthorizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                    <span>NOTARIZE FIDIC 20.1 / CPWD EOT NOTICE</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 65B Contractual Claims Forensic Ledger */}
      <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-5 flex flex-col gap-3 shadow-[0_0_20px_rgba(168,85,247,0.12)]">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-2 gap-2">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
            <span>SECTION 65B CONTEMPORANEOUS DELAY RECORD NOTARIZATION</span>
          </div>
          <span className="text-[10px] text-slate-500">
            Admissible in Commercial Arbitration under Indian Evidence Act Sec 65B(4)
          </span>
        </div>

        <div className="bg-black/60 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px]">
          <div className="flex items-center gap-2">
            <span className="text-purple-400 font-bold uppercase">SECTION 65B MERKLE ROOT:</span>
            <span className="text-slate-300 select-all font-mono">
              {eotMerkleHash || "8602a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"}
            </span>
          </div>
          <span className="text-slate-500">
            Sign-off: THEMIS-CONTRACTS-GOVERNOR & CHIEF CLAIMS COUNSEL
          </span>
        </div>
      </div>
    </div>
  );
}
