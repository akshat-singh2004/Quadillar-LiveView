import React from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  AlertOctagon,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Layers,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  FileSpreadsheet,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Server Component: Executive Portfolio & EVM Telemetry Dashboard
// ---------------------------------------------------------------------------

export default function ExecutiveDashboardPage() {
  // EVM Master Parameter Metrics (Consolidated Portfolio)
  const earnedValue = 371000000; // ₹37.10 Cr
  const actualCost = 403200000; // ₹40.32 Cr
  const plannedValue = 353300000; // ₹35.33 Cr
  const budgetAtCompletion = 1450000000; // ₹145.00 Cr

  // Cost Performance Index (CPI) = EV / AC
  const cpi = earnedValue / actualCost; // 0.92 (Over budget)
  // Schedule Performance Index (SPI) = EV / PV
  const spi = earnedValue / plannedValue; // 1.05 (Ahead of schedule)

  const isCpiOverBudget = cpi < 1.0;
  const isSpiAhead = spi >= 1.0;

  return (
    <div className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-sans">
      <div className="grid grid-cols-12 gap-6">
        {/* ===================================================================
            TOP ROW (col-span-12): Dashboard Header
            =================================================================== */}
        <header className="col-span-12 bg-zinc-900 border border-zinc-800">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-zinc-800/50">
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono tracking-widest text-zinc-400 uppercase">
                  EXECUTIVE SUITE / DIRECTORATE OVERSIGHT
                </span>
                <span className="text-zinc-600">/</span>
                <span className="text-xs font-mono tracking-tight text-zinc-400">
                  CPWD WORKS MANUAL 2024 &amp; FIDIC RED BOOK
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-100 mt-1 uppercase font-mono">
                Executive Portfolio &amp; EVM Telemetry
              </h1>
            </div>

            <div className="mt-3 md:mt-0 flex items-center gap-3 self-start md:self-auto">
              <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-xs font-mono uppercase tracking-wider text-emerald-500 font-medium">
                  EVM ISO 21508 STANDARD
                </span>
              </div>
              <div className="border border-zinc-800 bg-zinc-950 px-3 py-1.5">
                <span className="text-xs font-mono tabular-nums tracking-tight text-zinc-400">
                  PORTFOLIO HEALTH: AMBER WATCH
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 px-5 py-2.5 text-xs text-zinc-400 bg-zinc-950/40">
            <div className="text-left border-r border-zinc-800/50 pr-4">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Active Project Pool</span>
              <span className="text-zinc-100 font-mono text-xs block truncate font-medium">
                Gomti Nagar, Noida Sec-62, Varanasi
              </span>
            </div>
            <div className="text-left md:border-r border-zinc-800/50 px-0 md:px-4">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Budget at Completion (BAC)</span>
              <span className="text-zinc-100 font-mono tabular-nums text-xs block font-bold">
                ₹145.00 Cr
              </span>
            </div>
            <div className="text-left border-r border-zinc-800/50 pr-4 md:px-4 mt-2 md:mt-0">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Est. at Completion (EAC)</span>
              <span className="text-rose-400 font-mono tabular-nums text-xs block font-bold">
                ₹157.60 Cr (+8.69%)
              </span>
            </div>
            <div className="text-left pl-0 md:pl-4 mt-2 md:mt-0">
              <span className="block text-zinc-500 uppercase tracking-wider text-[10px]">Executive Sync</span>
              <span className="text-emerald-400 font-mono tabular-nums text-xs block">
                Live Supabase Telemetry
              </span>
            </div>
          </div>
        </header>

        {/* ===================================================================
            EVM KPI ROW (Four col-span-12 sm:col-span-6 lg:col-span-3 cards)
            =================================================================== */}

        {/* KPI 1: Earned Value (EV) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-zinc-900 border border-zinc-800 flex flex-col justify-between p-5">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
                Earned Value (EV)
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">BCWP</span>
            </div>

            <div className="flex flex-col items-end my-2">
              <span className="font-mono tabular-nums tracking-tight text-2xl font-bold text-zinc-100 text-right">
                ₹37.10 Cr
              </span>
              <span className="text-xs text-zinc-400 font-mono mt-0.5 text-right">
                25.59% of Portfolio BAC
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-500">Planned Value (PV)</span>
            <span className="text-zinc-300 font-mono tabular-nums text-right">₹35.33 Cr</span>
          </div>
        </div>

        {/* KPI 2: Actual Cost (AC) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-zinc-900 border border-zinc-800 flex flex-col justify-between p-5">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
                Actual Cost (AC)
              </span>
              <span className="text-[10px] font-mono text-zinc-500 uppercase">ACWP</span>
            </div>

            <div className="flex flex-col items-end my-2">
              <span className="font-mono tabular-nums tracking-tight text-2xl font-bold text-zinc-100 text-right">
                ₹40.32 Cr
              </span>
              <span className="text-xs text-rose-400 font-mono mt-0.5 text-right flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" />
                Cost Overrun: ₹3.22 Cr
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-500">Cost Variance (CV)</span>
            <span className="text-rose-400 font-mono tabular-nums text-right">-₹3.22 Cr</span>
          </div>
        </div>

        {/* KPI 3: Cost Performance Index (CPI) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-zinc-900 border border-zinc-800 flex flex-col justify-between p-5">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
                Cost Performance Index (CPI)
              </span>
              <span
                className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 border ${
                  isCpiOverBudget
                    ? "bg-rose-950/60 border-rose-800 text-rose-500"
                    : "bg-emerald-950/60 border-emerald-800 text-emerald-500"
                }`}
              >
                {isCpiOverBudget ? "Over Budget" : "Under Budget"}
              </span>
            </div>

            <div className="flex flex-col items-end my-2">
              <span
                className={`font-mono tabular-nums tracking-tight text-2xl font-bold text-right ${
                  isCpiOverBudget ? "text-rose-500" : "text-emerald-500"
                }`}
              >
                {cpi.toFixed(2)}
              </span>
              <span
                className={`text-xs font-mono mt-0.5 text-right ${
                  isCpiOverBudget ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {isCpiOverBudget ? "CPI < 1.00 (Loss Velocity)" : "CPI ≥ 1.00 (Margin Gain)"}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-500">Target Benchmark</span>
            <span className="text-zinc-300 font-mono tabular-nums text-right">1.00 Par</span>
          </div>
        </div>

        {/* KPI 4: Schedule Performance Index (SPI) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-3 bg-zinc-900 border border-zinc-800 flex flex-col justify-between p-5">
          <div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs uppercase tracking-wider text-zinc-400 font-medium block text-left">
                Schedule Performance Index (SPI)
              </span>
              <span
                className={`text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 border ${
                  isSpiAhead
                    ? "bg-emerald-950/60 border-emerald-800 text-emerald-500"
                    : "bg-rose-950/60 border-rose-800 text-rose-500"
                }`}
              >
                {isSpiAhead ? "Ahead of Schedule" : "Behind Schedule"}
              </span>
            </div>

            <div className="flex flex-col items-end my-2">
              <span
                className={`font-mono tabular-nums tracking-tight text-2xl font-bold text-right ${
                  isSpiAhead ? "text-emerald-500" : "text-rose-500"
                }`}
              >
                {spi.toFixed(2)}
              </span>
              <span
                className={`text-xs font-mono mt-0.5 text-right ${
                  isSpiAhead ? "text-emerald-400" : "text-rose-400"
                }`}
              >
                {isSpiAhead ? "SPI > 1.00 (Float Gained)" : "SPI < 1.00 (Critical Delay)"}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800/50 flex justify-between items-center text-xs font-mono">
            <span className="text-zinc-500">Schedule Variance (SV)</span>
            <span className="text-emerald-400 font-mono tabular-nums text-right">+₹1.77 Cr</span>
          </div>
        </div>

        {/* ===================================================================
            MIDDLE SECTION (col-span-12 lg:col-span-8): S-Curve & Cashflow
            =================================================================== */}
        <section className="col-span-12 lg:col-span-8 bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-zinc-800/50 flex items-center justify-between">
              <div>
                <h2 className="text-xs uppercase tracking-wider text-zinc-100 font-semibold text-left font-mono">
                  S-Curve &amp; Cashflow Projection
                </h2>
                <span className="text-[10px] text-zinc-400 font-mono">
                  Cumulative Baseline PV vs. Certified EV vs. Disbursed AC (18-Month Trajectory)
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-emerald-950/40 border border-emerald-800/60 text-emerald-400 font-bold uppercase tracking-wider">
                EVM S-Curve Telemetry Active
              </span>
            </div>

            {/* S-Curve Chart Container (h-96) */}
            <div className="h-96 w-full p-5 relative flex items-center justify-center bg-zinc-950/60 overflow-hidden">
              {/* Minimal Grid Background */}
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, #3f3f46 1px, transparent 1px),
                    linear-gradient(to bottom, #3f3f46 1px, transparent 1px)
                  `,
                  backgroundSize: "48px 48px",
                }}
              />

              {/* Technical S-Curve Vector Visualization */}
              <svg
                viewBox="0 0 800 320"
                className="w-full h-full relative z-10 select-none"
                preserveAspectRatio="none"
              >
                {/* Horizontal Level Markers (₹0 to ₹150 Cr) */}
                <line x1="60" y1="280" x2="780" y2="280" stroke="#3f3f46" strokeWidth="1" />
                <text x="50" y="284" fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="end">
                  ₹0
                </text>

                <line x1="60" y1="210" x2="780" y2="210" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                <text x="50" y="214" fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="end">
                  ₹35Cr
                </text>

                <line x1="60" y1="140" x2="780" y2="140" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                <text x="50" y="144" fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="end">
                  ₹70Cr
                </text>

                <line x1="60" y1="70" x2="780" y2="70" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
                <text x="50" y="74" fill="#71717a" fontSize="10" fontFamily="monospace" textAnchor="end">
                  ₹105Cr
                </text>

                <line x1="60" y1="20" x2="780" y2="20" stroke="#3f3f46" strokeWidth="1" strokeDasharray="2 2" />
                <text x="50" y="24" fill="#10b981" fontSize="10" fontFamily="monospace" textAnchor="end">
                  BAC ₹145Cr
                </text>

                {/* Vertical Timeline Divider at Month 6 (Current Data Date) */}
                <line x1="330" y1="20" x2="330" y2="280" stroke="#52525b" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="330" y="14" fill="#e4e4e7" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  CURRENT MONTH (M06)
                </text>

                {/* 1. Planned Value (PV) S-Curve (Grey/Dashed forward projection) */}
                <path
                  d="M 60 280 C 180 275, 240 230, 330 206 C 450 170, 600 50, 780 20"
                  fill="none"
                  stroke="#a1a1aa"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                />

                {/* 2. Actual Cost (AC) Curve (Rose / Overrun) up to M06 */}
                <path
                  d="M 60 280 C 160 270, 230 220, 330 192"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="3"
                />

                {/* 3. Earned Value (EV) Curve (Emerald / Certified Progress) up to M06 */}
                <path
                  d="M 60 280 C 170 274, 240 228, 330 200"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.5"
                />

                {/* Active Data Points at M06 */}
                {/* AC Point */}
                <circle cx="330" cy="192" r="4.5" fill="#f43f5e" stroke="#09090b" strokeWidth="2" />
                <text x="340" y="194" fill="#f43f5e" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  AC ₹40.32 Cr
                </text>

                {/* EV Point */}
                <circle cx="330" cy="200" r="4.5" fill="#10b981" stroke="#09090b" strokeWidth="2" />
                <text x="340" y="210" fill="#10b981" fontSize="10" fontFamily="monospace" fontWeight="bold">
                  EV ₹37.10 Cr
                </text>

                {/* PV Point */}
                <circle cx="330" cy="206" r="3.5" fill="#a1a1aa" stroke="#09090b" strokeWidth="1.5" />

                {/* Forecasted EAC Path (Rose dashed from M06 to M18) */}
                <path
                  d="M 330 192 C 450 150, 600 30, 780 5"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <text x="775" y="12" fill="#f43f5e" fontSize="9" fontFamily="monospace" textAnchor="end">
                  EAC ₹157.60 Cr
                </text>
              </svg>
            </div>
          </div>

          {/* S-Curve Legend & Trajectory Footer */}
          <div className="px-5 py-3 border-t border-zinc-800/50 bg-zinc-950/50 text-xs font-mono flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="h-0.5 w-4 bg-zinc-400 border-b border-dashed border-zinc-200" />
                <span className="text-zinc-400">Planned Value (PV)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-4 bg-emerald-500" />
                <span className="text-emerald-400 font-semibold">Earned Value (EV)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-4 bg-rose-500" />
                <span className="text-rose-400 font-semibold">Actual Cost (AC)</span>
              </span>
            </div>

            <div className="text-zinc-400">
              VARIANCE: <span className="text-rose-400 font-bold">CV -₹3.22 Cr</span> •{" "}
              <span className="text-emerald-400 font-bold">SV +₹1.77 Cr</span>
            </div>
          </div>
        </section>

        {/* ===================================================================
            RIGHT SECTION (col-span-12 lg:col-span-4): Global Statutory Alerts
            =================================================================== */}
        <section className="col-span-12 lg:col-span-4 bg-zinc-900 border border-zinc-800 flex flex-col justify-between">
          <div>
            <div className="px-5 py-3.5 border-b border-zinc-800/50 flex items-center justify-between">
              <div>
                <h2 className="text-xs uppercase tracking-wider text-zinc-100 font-semibold text-left font-mono">
                  Global Statutory Alerts
                </h2>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Cross-Project Executive Risk Registry
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-950/50 border border-rose-800 text-rose-400 font-bold uppercase">
                Requires Board Action
              </span>
            </div>

            {/* Rigid List of High-Severity Cross-Project Warnings */}
            <div className="divide-y divide-zinc-800/40">
              {/* Alert 1: Liquidated Damages Approaching 10% Cap */}
              <div className="p-4 hover:bg-zinc-800/20 transition-colors">
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 border bg-rose-950/60 border-rose-800 text-rose-500 font-bold uppercase tracking-wider">
                    CRITICAL EXPOSURE
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">CPWD Cl. 2</span>
                </div>
                <h3 className="text-xs font-bold font-mono text-rose-400 mb-1 text-left">
                  GOMTI-NAGAR-PH1: Liquidated Damages approaching 10% Cap
                </h3>
                <p className="text-[11px] text-zinc-300 leading-snug text-left mb-2">
                  Cumulative delay of 18 days logged on critical path. Assessed LD of ₹38.2L nearing contractual threshold. Hard ceiling caps at ₹4.50 Cr (10% baseline).
                </p>
                <div className="flex justify-between items-center text-[10px] font-mono pt-1 text-zinc-500 border-t border-zinc-800/30">
                  <span className="text-amber-400">Action: EOT Hearing Due</span>
                  <Link
                    href="/commercial/hindrance-eot"
                    className="text-zinc-300 hover:text-zinc-100 underline underline-offset-2"
                  >
                    Scrutinize Register &rarr;
                  </Link>
                </div>
              </div>

              {/* Alert 2: Subcontractor Settlement Blocked: Missing Labour License */}
              <div className="p-4 hover:bg-zinc-800/20 transition-colors">
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 border bg-rose-950/60 border-rose-800 text-rose-500 font-bold uppercase tracking-wider">
                    STATUTORY VIOLATION
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">CLRA Act 1970</span>
                </div>
                <h3 className="text-xs font-bold font-mono text-rose-400 mb-1 text-left">
                  Subcontractor Settlement Blocked: Missing Labour License
                </h3>
                <p className="text-[11px] text-zinc-300 leading-snug text-left mb-2">
                  Falcon Interior Fitouts (VEN-INT-204): Form VI licence renewal not filed. Statutory clearance gate locked; ₹2.22 Cr final disbursement strictly withheld.
                </p>
                <div className="flex justify-between items-center text-[10px] font-mono pt-1 text-zinc-500 border-t border-zinc-800/30">
                  <span className="text-rose-400 font-bold">Disbursal Frozen</span>
                  <Link
                    href="/closeout/subcontractor-settlement"
                    className="text-zinc-300 hover:text-zinc-100 underline underline-offset-2"
                  >
                    View Labour Gate &rarr;
                  </Link>
                </div>
              </div>

              {/* Alert 3: Defect Escrow Release Due in 14 Days */}
              <div className="p-4 hover:bg-zinc-800/20 transition-colors">
                <div className="flex justify-between items-start gap-2 mb-1.5">
                  <span className="text-[10px] font-mono px-2 py-0.5 border bg-amber-950/60 border-amber-800 text-amber-500 font-bold uppercase tracking-wider">
                    ESCROW ESCALATION
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500">CPWD Cl. 17</span>
                </div>
                <h3 className="text-xs font-bold font-mono text-amber-400 mb-1 text-left">
                  Defect Escrow Release Due in 14 Days
                </h3>
                <p className="text-[11px] text-zinc-300 leading-snug text-left mb-2">
                  365-Day DLP expiry on Substructure Package. 50% Stage 2 Retention Escrow (₹60.00 Lakhs) release contingent upon unconditional Form 65 sign-off.
                </p>
                <div className="flex justify-between items-center text-[10px] font-mono pt-1 text-zinc-500 border-t border-zinc-800/30">
                  <span className="text-amber-500">Due: 2026-10-03</span>
                  <Link
                    href="/commercial/final-bill-retention"
                    className="text-zinc-300 hover:text-zinc-100 underline underline-offset-2"
                  >
                    Form 65 Gateway &rarr;
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Action Desk Footer */}
          <div className="p-4 border-t border-zinc-800/50 bg-zinc-950/50">
            <div className="flex justify-between items-center text-xs font-mono text-zinc-400">
              <span>BOARD STATUS:</span>
              <span className="text-rose-400 font-bold uppercase">3 High Risks Active</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}