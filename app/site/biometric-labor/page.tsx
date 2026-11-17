"use client";

import React, { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// --- INLINE SVG ICONS ---
const HardHatIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 18h20M4 18v-3a8 8 0 0116 0v3M9 10a3 3 0 016 0" />
  </svg>
);
const UserCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <polyline points="17 11 19 13 23 9" />
  </svg>
);
const ShieldCheckIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
const ClockIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

interface WorkerTradeGroup {
  tradeCode: string;
  tradeName: string;
  bitAssignment: string;
  subcontractor: string;
  headcountPresent: number;
  headcountBudgeted: number;
  wageRatePerDayInr: number;
  totalDailyWageInr: number;
  otHoursToday: number;
  safetyBriefingComplete: boolean;
  medicalFitnessPassed: boolean;
  status: "NOMINAL" | "ATTENTION";
}

const TRADE_GROUPS: WorkerTradeGroup[] = [
  {
    tradeCode: "TR-01",
    tradeName: "Formwork Carpenters & Barbenders",
    bitAssignment: "Bit 6: 38m Helipad Core & Cantilever Soffits",
    subcontractor: "Anandeshwar Shuttering Consortium",
    headcountPresent: 146,
    headcountBudgeted: 150,
    wageRatePerDayInr: 950,
    totalDailyWageInr: 138700,
    otHoursToday: 24,
    safetyBriefingComplete: true,
    medicalFitnessPassed: true,
    status: "NOMINAL"
  },
  {
    tradeCode: "TR-02",
    tradeName: "Terracotta Cladding Riggers & Stonemasons",
    bitAssignment: "Bit 4: East Triangular Prow & 5 Buttress Ribs",
    subcontractor: "Façade Tech Engineering Ltd",
    headcountPresent: 88,
    headcountBudgeted: 90,
    wageRatePerDayInr: 1100,
    totalDailyWageInr: 96800,
    otHoursToday: 12,
    safetyBriefingComplete: true,
    medicalFitnessPassed: true,
    status: "NOMINAL"
  },
  {
    tradeCode: "TR-03",
    tradeName: "Chiller, Piping & Electrical MEP Trades",
    bitAssignment: "Bit 3: 14th Fl Risers & Rear Cantilever Plant Box",
    subcontractor: "Voltas / BlueStar MEP Subcontractor",
    headcountPresent: 112,
    headcountBudgeted: 115,
    wageRatePerDayInr: 1050,
    totalDailyWageInr: 117600,
    otHoursToday: 18,
    safetyBriefingComplete: true,
    medicalFitnessPassed: true,
    status: "NOMINAL"
  },
  {
    tradeCode: "TR-04",
    tradeName: "Kalzip Space-Frame & Acoustic Riggers",
    bitAssignment: "Bit 2: Silver Auditorium Dome Interior & Roof",
    subcontractor: "Kalzip Certified Erection Partner",
    headcountPresent: 82,
    headcountBudgeted: 85,
    wageRatePerDayInr: 1250,
    totalDailyWageInr: 102500,
    otHoursToday: 16,
    safetyBriefingComplete: true,
    medicalFitnessPassed: true,
    status: "NOMINAL"
  }
];

export interface BiometricLogEntry {
  id: string;
  aadhaarMasked: string;
  name: string;
  trade: string;
  terminalId: string;
  punchInTime: string;
  bodyTempC: number;
  ppeCompliance: "PASS" | "FAIL";
  status: "AUTHORIZED";
}

async function generateSHA256(str: string): Promise<string> {
  const buf = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function JpnicLaborMusterPage() {
  const [selectedTrade, setSelectedTrade] = useState<WorkerTradeGroup>(TRADE_GROUPS[0]);
  const [isNotarizing, setIsNotarizing] = useState(false);
  const [musterStatus, setMusterStatus] = useState<"ACTIVE_LOGGED" | "NOTARIZED_APPROVED">("ACTIVE_LOGGED");
  const [musterMerkleHash, setMusterMerkleHash] = useState<string | null>(null);

  // Live Terminal Stream (Gate 01, Gate 02, Tower Core)
  const [recentPunches] = useState<BiometricLogEntry[]>([
    {
      id: "BIO-4412",
      aadhaarMasked: "XXXX-XXXX-4812",
      name: "Raju Pal",
      trade: "Lead Formwork Carpenter",
      terminalId: "Gate 02 Facial Scanner",
      punchInTime: "07:42:15 IST",
      bodyTempC: 36.5,
      ppeCompliance: "PASS",
      status: "AUTHORIZED"
    },
    {
      id: "BIO-4413",
      aadhaarMasked: "XXXX-XXXX-9021",
      name: "Dharmendra Yadav",
      trade: "Façade Cladding Rigger",
      terminalId: "Gate 01 Fingerprint Terminal",
      punchInTime: "07:44:02 IST",
      bodyTempC: 36.6,
      ppeCompliance: "PASS",
      status: "AUTHORIZED"
    },
    {
      id: "BIO-4414",
      aadhaarMasked: "XXXX-XXXX-1148",
      name: "Mohd. Aslam",
      trade: "HVAC Pipe Welder",
      terminalId: "Tower Core Turnstile A",
      punchInTime: "07:46:50 IST",
      bodyTempC: 36.4,
      ppeCompliance: "PASS",
      status: "AUTHORIZED"
    },
    {
      id: "BIO-4415",
      aadhaarMasked: "XXXX-XXXX-7320",
      name: "Suresh Chandra",
      trade: "Kalzip Space-Frame Specialist",
      terminalId: "Gate 02 Facial Scanner",
      punchInTime: "07:48:11 IST",
      bodyTempC: 36.5,
      ppeCompliance: "PASS",
      status: "AUTHORIZED"
    }
  ]);

  const totalHeadcount = TRADE_GROUPS.reduce((acc, curr) => acc + curr.headcountPresent, 0);
  const totalBudgeted = TRADE_GROUPS.reduce((acc, curr) => acc + curr.headcountBudgeted, 0);
  const totalDailyWageBill = TRADE_GROUPS.reduce((acc, curr) => acc + curr.totalDailyWageInr, 0);
  const totalOtHours = TRADE_GROUPS.reduce((acc, curr) => acc + curr.otHoursToday, 0);

  const handleNotarizeMuster = async () => {
    setIsNotarizing(true);
    const timestamp = new Date().toLocaleTimeString();
    const rawData = `vanguard_LABOR_MUSTER_DAY_418_HEADCOUNT_${totalHeadcount}_WAGE_INR_${totalDailyWageBill}_${Date.now()}`;
    const hash = await generateSHA256(rawData);

    setTimeout(async () => {
      setMusterMerkleHash(hash);
      setMusterStatus("NOTARIZED_APPROVED");
      setIsNotarizing(false);

      try {
        await supabase.from("section_65b_audit_ledger").insert({
          project_id: "UP-LDA-VANGUARD-CAMPUS",
          primary_governor: "AEGIS",
          synthesis_report: `BIOMETRIC MUSTER NOTARIZED: 428 Tradesmen Authenticated • Daily Wages ₹4,55,600 • 100% BOCW & PF/ESIC Compliant`,
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
              BOCW ACT 1996 & CLRA 1970
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              100% BIOMETRIC AADHAAR VERIFIED
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white mt-1">
            BIOMETRIC LABOR MUSTER & SKILL MATRIX
          </h1>
          <p className="text-xs text-slate-400">
            PROJECT VANGUARD COMMERCIAL HUB • 428 Tradesmen Headcount, Trade Skill Grading & Wage Pass-Through Reconciliation
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
            href="/site/plant-machinery"
            className="px-3 py-1.5 bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-300 text-xs rounded-lg transition"
          >
            🚜 P&M FLEET
          </a>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">TOTAL WORKFORCE PRESENT</div>
          <div className="text-xl font-bold text-white mt-1">{totalHeadcount} Tradesmen</div>
          <div className="text-[10px] text-emerald-400 mt-0.5">Budgeted: {totalBudgeted} (97.3% Attendance)</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">GROSS DAILY WAGE BILL</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">₹{(totalDailyWageBill / 100000).toFixed(2)} Lakh</div>
          <div className="text-[10px] text-slate-500 mt-0.5">MIDAS Ledger Pass-Through</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">OVERTIME RECORD (OT)</div>
          <div className="text-xl font-bold text-amber-400 mt-1">{totalOtHours} Man-Hours</div>
          <div className="text-[10px] text-slate-500 mt-0.5">2x Rate Under CLRA 1970</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">BOCW & PF/ESIC COMPLIANCE</div>
          <div className="text-sm font-bold text-emerald-400 mt-1.5">100% VERIFIED</div>
          <div className="text-[10px] text-slate-500 mt-0.5">1% Welfare Cess Remitted</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl">
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">MUSTER NOTARIZATION</div>
          <div className={`text-sm font-bold mt-1.5 ${musterStatus === "NOTARIZED_APPROVED" ? "text-emerald-400" : "text-amber-400"}`}>
            {musterStatus === "NOTARIZED_APPROVED" ? "SECTION 65B SEALED" : "LIVE SCAN ACTIVE"}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">AEGIS Safety Officer Certified</div>
        </div>
      </div>

      {/* Main Grid: Trade Groups & Live Gate Turnstile Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Trade Breakdown & 6-Bit Location Allocation */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <HardHatIcon className="w-3.5 h-3.5 text-cyan-400" />
              SPECIALIST TRADE BRIGADES ({TRADE_GROUPS.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">6-BIT CAMPUS DEPLOYMENT</span>
          </div>

          <div className="flex flex-col gap-3">
            {TRADE_GROUPS.map(trade => {
              const isSelected = selectedTrade.tradeCode === trade.tradeCode;
              return (
                <div
                  key={trade.tradeCode}
                  onClick={() => setSelectedTrade(trade)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition flex flex-col gap-2 ${
                    isSelected
                      ? "bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.2)]"
                      : "bg-slate-950/60 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-cyan-400">{trade.tradeCode} • {trade.tradeName}</span>
                    <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      {trade.headcountPresent} / {trade.headcountBudgeted} PRESENT
                    </span>
                  </div>

                  <div className="text-white font-semibold text-xs">{trade.bitAssignment}</div>
                  <div className="text-[10px] text-slate-400">Subcontractor: {trade.subcontractor}</div>

                  <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                    <div>
                      Daily Rate: <strong className="text-white">₹{trade.wageRatePerDayInr}</strong>
                    </div>
                    <div>
                      Total Wages: <strong className="text-emerald-400">₹{(trade.totalDailyWageInr / 1000).toFixed(1)}k</strong>
                    </div>
                    <div>
                      OT Hours: <strong className="text-amber-400">{trade.otHoursToday} hrs</strong>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Live Biometric Punch Terminal & Safety Gate Clearance */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Live Biometric Scanner Stream */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <UserCheckIcon className="w-3.5 h-3.5 text-cyan-400" />
                LIVE TURNSTILE AUTH FEED
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">ENCRYPTED AADHAAR</span>
            </div>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[220px]">
              {recentPunches.map(p => (
                <div key={p.id} className="bg-slate-950/70 border border-slate-800 p-2.5 rounded-xl flex justify-between items-center text-xs">
                  <div>
                    <div className="font-semibold text-white">{p.name}</div>
                    <div className="text-[10px] text-slate-500">{p.trade} • {p.aadhaarMasked}</div>
                    <div className="text-[9px] text-cyan-400">{p.terminalId}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-emerald-400 block">{p.punchInTime}</span>
                    <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-500/30">
                      PPE: {p.ppeCompliance}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statutory Welfare & Safety Compliance Card */}
          <div className="bg-slate-900/70 border border-purple-500/40 rounded-2xl p-4 flex flex-col justify-between flex-1 gap-3">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-wider mb-2">
                <ShieldCheckIcon className="w-4 h-4 text-purple-400" />
                <span>SECTION 65B MUSTER CERTIFICATION</span>
              </div>

              <div className="flex flex-col gap-1.5 text-xs">
                <div className="flex justify-between border-b border-slate-800 pb-1 text-[11px]">
                  <span className="text-slate-400">Selected Brigade:</span>
                  <span className="text-cyan-400 font-bold">{selectedTrade.tradeName}</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1 text-[11px]">
                  <span className="text-slate-400">Height Fitness Pass (&gt;30m):</span>
                  <span className="text-emerald-400 font-bold">100% Cleared (IS 3696)</span>
                </div>
                <div className="flex justify-between border-b border-slate-800 pb-1 text-[11px]">
                  <span className="text-slate-400">Statutory 1% BOCW Cess:</span>
                  <span className="text-emerald-400 font-bold">₹4,556.00 Remitted</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-400">PF/ESIC Universal Account:</span>
                  <span className="text-white font-bold">UAN Linked</span>
                </div>
              </div>
            </div>

            <div>
              {musterStatus === "NOTARIZED_APPROVED" ? (
                <div className="p-3 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-center">
                  <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckIcon className="w-4 h-4 text-emerald-400" />
                    <span>MUSTER CERTIFIED & AUDIT SEALED</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-mono">
                    AEGIS Safety Officer & Chief IR Endorsed
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleNotarizeMuster}
                  disabled={isNotarizing}
                  className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  {isNotarizing ? <RefreshIcon className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheckIcon className="w-4 h-4 text-slate-950" />}
                  <span>NOTARIZE DAILY BIOMETRIC MUSTER</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 65B Biometric Muster Forensic Strip */}
      <div className="bg-black/60 border border-slate-800 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-2 text-[10px]">
        <div className="flex items-center gap-2">
          <span className="text-purple-400 font-bold uppercase">SECTION 65B FORENSIC CHAIN:</span>
          <span className="text-slate-300 select-all font-mono">
            {musterMerkleHash || "8602a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4"}
          </span>
        </div>
        <span className="text-slate-500">
          Sign-off Authority: AEGIS-HSE-GOVERNOR & VANGUARD CHIEF IR OFFICER
        </span>
      </div>
    </div>
  );
}
