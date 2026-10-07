// app/handover/dlp/page.tsx
import React from "react";
import { PBGTrackerCard, PBGRecord } from "@/components/finance/PBGTrackerCard";
import {
  Scale,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Coins,
  FileCheck,
  Building2,
  AlertTriangle,
  Plus,
} from "lucide-react";

export const metadata = {
  title: "Defect Liability Period (DLP) & PBG Expiry Telemetry | Quadillar LiveView",
  description:
    "Statutory DLP clock tracking and Performance Bank Guarantee expiration monitoring under CPWD Cl. 17 & FIDIC Cl. 11.",
};

const ACTIVE_PBG_REGISTRY: PBGRecord[] = [
  {
    id: "pbg-01",
    subcontractor: "Apex Interiors Pvt Ltd",
    trade: "Joinery & Architectural Fitout",
    project: "Gomti Nagar Tower A (L01-L08)",
    documentRef: "BG-HDFC-2026-0899",
    issuingBank: "HDFC Bank Ltd • Treasury Branch Lucknow",
    guaranteeAmountInr: 2450000,
    startDate: "2025-11-01",
    expiryDate: "2026-11-01",
    dlpDurationMonths: 12,
    claimGracePeriodDays: 30,
  },
  {
    id: "pbg-02",
    subcontractor: "Voltech MEP Solutions",
    trade: "HVAC & Fire Protection Central Plant",
    project: "Gomti Nagar Central Plant & Service Tunnel",
    documentRef: "BG-ICICI-2025-4412",
    issuingBank: "ICICI Bank Ltd • Corporate Banking",
    guaranteeAmountInr: 4875000,
    startDate: "2025-10-10",
    expiryDate: "2026-10-10",
    dlpDurationMonths: 12,
    claimGracePeriodDays: 30,
  },
  {
    id: "pbg-03",
    subcontractor: "Delta Flooring Systems",
    trade: "Heavy Industrial Epoxy & Deck Screeds",
    project: "Basement B1 & B2 Parking Deck",
    documentRef: "BG-SBI-2025-1109",
    issuingBank: "State Bank of India • Commercial Branch",
    guaranteeAmountInr: 1680000,
    startDate: "2025-08-15",
    expiryDate: "2026-08-15",
    dlpDurationMonths: 12,
    claimGracePeriodDays: 30,
  },
  {
    id: "pbg-04",
    subcontractor: "Stoneworks Heritage JV",
    trade: "Structural Glazing & Façade Envelope",
    project: "Tower A & B Unitized Curtain Wall",
    documentRef: "BG-AXIS-2025-9921",
    issuingBank: "Axis Bank Ltd • Specialized Banking Branch",
    guaranteeAmountInr: 3250000,
    startDate: "2026-01-15",
    expiryDate: "2027-01-15",
    dlpDurationMonths: 12,
    claimGracePeriodDays: 30,
  },
];

export default function DLPPage() {
  // Aggregate Telemetry
  const totalPBGValueInr = ACTIVE_PBG_REGISTRY.reduce(
    (sum, item) => sum + item.guaranteeAmountInr,
    0
  ); // ₹ 1,22,55,000.00
  const activeDLPCount = ACTIVE_PBG_REGISTRY.length; // 4 Active Subcontracts
  const expiringWithin30DaysCount = 1; // Voltech MEP (expires 2026-10-10, 21 days remaining)

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-sans">
      <div className="max-w-[1600px] mx-auto grid grid-cols-12 gap-6">
        {/* ===================================================================
            TOP ROW: DASHBOARD HEADER (col-span-12)
            =================================================================== */}
        <header className="col-span-12 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-400">
                <Scale className="h-3 w-3 mr-1 text-zinc-400" />
                CPWD Cl. 17 / FIDIC Cl. 11.9
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-800 text-emerald-400">
                <ShieldCheck className="h-3 w-3 mr-1 text-emerald-400" />
                Statutory Financial Escrow
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-mono">
              Defect Liability Period (DLP) &amp; PBG Expiry Telemetry
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Statutory defect liability tracking and Performance Bank Guarantee monitoring. Enforces zero unauthorized retention releases before DLP expiration clearance.
            </p>
          </div>

          {/* Action Gateway: Top-right action button labeled "Log PBG Extension" */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="bg-zinc-100 text-zinc-950 hover:bg-zinc-300 font-bold uppercase tracking-wider text-xs px-4 py-2 flex items-center gap-1.5 transition-colors cursor-pointer font-mono"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Log PBG Extension</span>
            </button>
          </div>
        </header>

        {/* ===================================================================
            KPI CARDS (Three col-span-4 cards)
            =================================================================== */}
        {/* Card 1: Total Withheld Retention / PBG Value (₹ - mono, right-aligned) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-400">
            <span>Total Withheld Retention / PBG Value</span>
            <Coins className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-4 flex flex-col items-end">
            <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums text-right">
              ₹ {totalPBGValueInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 mt-1">
              Active Escrow Guarantees Under Custody
            </span>
          </div>
        </div>

        {/* Card 2: Active DLP Projects (mono, text-zinc-100) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-400">
            <span>Active DLP Projects</span>
            <Building2 className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-[11px] font-mono text-zinc-500">
              Contractor Trade Packages
            </span>
            <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
              {activeDLPCount} Subcontracts
            </span>
          </div>
        </div>

        {/* Card 3: PBGs Expiring within 30 Days (highlighted text-rose-500 if > 0, else text-zinc-500) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-400">
            <span>PBGs Expiring within 30 Days</span>
            <AlertTriangle
              className={`h-4 w-4 ${
                expiringWithin30DaysCount > 0 ? "text-rose-500" : "text-zinc-500"
              }`}
            />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-[11px] font-mono text-zinc-500">
              Mandatory Claim / Extension Notice
            </span>
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                expiringWithin30DaysCount > 0 ? "text-rose-500" : "text-zinc-500"
              }`}
            >
              {expiringWithin30DaysCount > 0
                ? `${expiringWithin30DaysCount} Guarantee`
                : "0 Guarantees"}
            </span>
          </div>
        </div>

        {/* ===================================================================
            MAIN SECTION (col-span-12): Import and render <PBGTrackerCard/>
            =================================================================== */}
        <section className="col-span-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {ACTIVE_PBG_REGISTRY.map((record) => (
              <PBGTrackerCard key={record.id} record={record} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
