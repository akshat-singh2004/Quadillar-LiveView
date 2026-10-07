// app/finance/reconciliation/page.tsx
import React from "react";
import Link from "next/link";
import { MaterialReconciliationDrawer } from "@/components/finance/MaterialReconciliationDrawer";
import {
  Scale,
  ShieldCheck,
  TrendingDown,
  AlertTriangle,
  FileSpreadsheet,
  Coins,
  ExternalLink,
} from "lucide-react";

export const metadata = {
  title: "CPWD Clause 42: Material Reconciliation & Consumption Audit | Quadillar LiveView",
  description:
    "Zero-trust material reconciliation ledger auditing theoretical vs. actual consumption, permissible statutory wastage, and penal clawback.",
};

interface MaterialReconciliationRow {
  id: string;
  materialCode: string;
  materialName: string;
  measuredWorkBasis: string;
  mbLink: string;
  theoreticalNorm: string;
  theoreticalQty: string;
  actualIssuedConsumed: string;
  varianceQty: string;
  variancePct: number;
  permissibleLimit: string;
  statutoryAction: "Normal Consumption" | "Allowable Wastage" | "Penal Recovery Triggered";
}

const RECONCILIATION_DATA: MaterialReconciliationRow[] = [
  {
    id: "rec-01",
    materialCode: "MAT-CEM-OPC53",
    materialName: "Portland Cement 53 Grade (Ultratech)",
    measuredWorkBasis: "850.00 cum M25 RCC (Beams & Columns L03-L04)",
    mbLink: "/finance/measurement-book",
    theoreticalNorm: "5.75 Bags / cum (DSR 5.2)",
    theoreticalQty: "4,887.50 Bags",
    actualIssuedConsumed: "4,975.00 Bags",
    varianceQty: "+87.50 Bags",
    variancePct: 1.79,
    permissibleLimit: "2.0%",
    statutoryAction: "Allowable Wastage",
  },
  {
    id: "rec-02",
    materialCode: "REBAR-FE500D",
    materialName: "TMT Reinforcement Steel Fe500D (Tata Tiscon)",
    measuredWorkBasis: "1,420.00 cum RCC Slab & Footings",
    mbLink: "/engineering/bbs",
    theoreticalNorm: "0.082 MT / cum (IS:456 Basis)",
    theoreticalQty: "116.44 MT",
    actualIssuedConsumed: "118.15 MT",
    varianceQty: "+1.71 MT",
    variancePct: 1.47,
    permissibleLimit: "2.0%",
    statutoryAction: "Normal Consumption",
  },
  {
    id: "rec-03",
    materialCode: "CONC-RMC-M30",
    materialName: "Ready Mix Concrete M30 Grade",
    measuredWorkBasis: "620.00 cum Raft Foundation Bay A-B",
    mbLink: "/finance/measurement-book",
    theoreticalNorm: "1.00 cum / cum (Net Yield)",
    theoreticalQty: "620.00 cum",
    actualIssuedConsumed: "625.50 cum",
    varianceQty: "+5.50 cum",
    variancePct: 0.89,
    permissibleLimit: "1.5%",
    statutoryAction: "Normal Consumption",
  },
  {
    id: "rec-04",
    materialCode: "BITU-VG30",
    materialName: "Paving Bitumen VG-30 Bulk",
    measuredWorkBasis: "4,200.00 sqm DBM 50mm (Spine Road)",
    mbLink: "/finance/measurement-book",
    theoreticalNorm: "5.25 kg / sqm (MoRTH Cl. 505)",
    theoreticalQty: "22.05 MT",
    actualIssuedConsumed: "20.80 MT",
    varianceQty: "-1.25 MT",
    variancePct: -5.67,
    permissibleLimit: "2.0%",
    statutoryAction: "Penal Recovery Triggered",
  },
  {
    id: "rec-05",
    materialCode: "AGG-COARSE-20",
    materialName: "Coarse Aggregate 20mm Granite",
    measuredWorkBasis: "850.00 cum M25 RCC (Structural Mix)",
    mbLink: "/finance/measurement-book",
    theoreticalNorm: "0.85 cum / cum (IS:383 Mix)",
    theoreticalQty: "722.50 cum",
    actualIssuedConsumed: "735.00 cum",
    varianceQty: "+12.50 cum",
    variancePct: 1.73,
    permissibleLimit: "2.0%",
    statutoryAction: "Allowable Wastage",
  },
];

export default function MaterialReconciliationPage() {
  // Telemetry KPI Values
  const totalTheoreticalValueInr = 0; // ₹ 1,40,15,972.50
  const netWastageVariancePct = 1.8; // +1.8%
  const penalRecoveryShortageInr = 77760.0; // ₹ 77,760.00 (Bitumen 0.81 MT shortage @ 2x rate)

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
                CPWD Works Manual Clause 42
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-800 text-emerald-400">
                <ShieldCheck className="h-3 w-3 mr-1 text-emerald-400" />
                Material Stock Ledger Verified
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-mono">
              CPWD Clause 42: Material Reconciliation &amp; Consumption Audit
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Reconciles gate receipts and physical stock against measured work, auditing permissible statutory wastage thresholds and 2× penal clawbacks.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-right font-mono">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Reconciliation Cycle</div>
              <div className="text-xs font-bold text-zinc-200">IPC / RA Bill No. 04 Cycle</div>
            </div>
          </div>
        </header>

        {/* ===================================================================
            KPI CARDS (Three col-span-4 cards)
            =================================================================== */}
        {/* Card 1: Total Theoretical Consumption Value (₹ - mono, right-aligned) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-400">
            <span>Total Theoretical Consumption Value</span>
            <Coins className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-4 flex flex-col items-end">
            <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums text-right">
              ₹ {totalTheoreticalValueInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] font-mono text-zinc-500 mt-1">
              DSR Standard Benchmark (Active Billing Cycle)
            </span>
          </div>
        </div>

        {/* Card 2: Permissible Statutory Wastage Variance (highlight text-emerald-500 if <= 2%) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-400">
            <span>Permissible Statutory Wastage Variance</span>
            <TrendingDown className="h-4 w-4 text-zinc-400" />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-[11px] font-mono text-zinc-500">
              Statutory 2.0% Cap
            </span>
            <span
              className={`text-2xl font-bold font-mono tabular-nums ${
                netWastageVariancePct <= 2.0 ? "text-emerald-500" : "text-rose-500"
              }`}
            >
              +{netWastageVariancePct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Card 3: Penal Recovery for Unaccounted Shortage (highlight text-rose-500 if > 0, else text-zinc-500) */}
        <div className="col-span-12 sm:col-span-6 lg:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-mono uppercase tracking-wider text-zinc-400">
            <span>Penal Recovery for Unaccounted Shortage</span>
            <AlertTriangle
              className={`h-4 w-4 ${
                penalRecoveryShortageInr > 0 ? "text-rose-500" : "text-zinc-500"
              }`}
            />
          </div>
          <div className="mt-4 flex items-baseline justify-between">
            <span className="text-[11px] font-mono text-zinc-500">
              CPWD Cl. 42 (2× Tender Rate)
            </span>
            <span
              className={`text-2xl font-bold font-mono tabular-nums text-right ${
                penalRecoveryShortageInr > 0 ? "text-rose-500" : "text-zinc-500"
              }`}
            >
              ₹ {penalRecoveryShortageInr.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* ===================================================================
            MAIN SECTION (col-span-12): Reconciliation Ledger Table
            =================================================================== */}
        <section className="col-span-12 bg-zinc-900 border border-zinc-800">
          {/* Top Bar with Title and Action Controls */}
          <div className="p-4 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
                <h2 className="text-base font-bold text-zinc-100 font-mono uppercase tracking-wide">
                  Reconciliation Ledger (CPWD Form 42)
                </h2>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Detailed comparison of theoretical required volume versus verified inward and site inventory count.
              </p>
            </div>

            {/* Action Controls: Top-right button opens <MaterialReconciliationDrawer/> */}
            <div>
              <MaterialReconciliationDrawer />
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/70 text-[10px] text-zinc-500 uppercase tracking-wider">
                  <th className="py-3 px-4 font-normal">Material Code &amp; Description</th>
                  <th className="py-3 px-4 font-normal">Measured Work Basis</th>
                  <th className="py-3 px-4 font-normal">Theoretical Consumption</th>
                  <th className="py-3 px-4 font-normal">Actual Issued / Consumed</th>
                  <th className="py-3 px-4 font-normal text-right">Variance (Qty &amp; %)</th>
                  <th className="py-3 px-4 font-normal text-center">Permissible Limit</th>
                  <th className="py-3 px-4 font-normal text-center">Statutory Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {RECONCILIATION_DATA.map((row) => {
                  const isNormal = row.statutoryAction === "Normal Consumption";
                  const isAllowable = row.statutoryAction === "Allowable Wastage";
                  const isPenal = row.statutoryAction === "Penal Recovery Triggered";

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-zinc-800/30 transition-colors ${
                        isPenal ? "bg-rose-950/15 hover:bg-rose-950/25" : ""
                      }`}
                    >
                      {/* MATERIAL CODE & DESCRIPTION */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-100">{row.materialCode}</div>
                        <div className="text-[11px] text-zinc-400 font-sans">{row.materialName}</div>
                      </td>

                      {/* MEASURED WORK BASIS */}
                      <td className="py-3.5 px-4 text-zinc-300 min-w-[220px]">
                        <div>{row.measuredWorkBasis}</div>
                        <Link
                          href={row.mbLink}
                          className="inline-flex items-center gap-1 text-[10px] text-zinc-500 hover:text-emerald-400 transition-colors mt-0.5"
                        >
                          <span>Cross-Ref Ledger</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </Link>
                      </td>

                      {/* THEORETICAL CONSUMPTION */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-zinc-200 tabular-nums">{row.theoreticalQty}</div>
                        <div className="text-[10px] text-zinc-500">{row.theoreticalNorm}</div>
                      </td>

                      {/* ACTUAL ISSUED / CONSUMED */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-zinc-100 tabular-nums">{row.actualIssuedConsumed}</div>
                        <div className="text-[10px] text-zinc-500">Gate Inward Less Stock</div>
                      </td>

                      {/* VARIANCE (QTY & %) (mono tabular-nums, right-aligned) */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap tabular-nums">
                        <div
                          className={`font-bold ${
                            isPenal ? "text-rose-400" : isAllowable ? "text-amber-400" : "text-emerald-400"
                          }`}
                        >
                          {row.varianceQty}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          ({row.variancePct > 0 ? `+${row.variancePct}` : row.variancePct}%)
                        </div>
                      </td>

                      {/* PERMISSIBLE LIMIT */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap text-zinc-300">
                        {row.permissibleLimit}
                      </td>

                      {/* STATUTORY ACTION (Status pills) */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono border uppercase tracking-wider font-bold ${
                            isNormal
                              ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                              : isAllowable
                              ? "bg-amber-950/60 border-amber-800 text-amber-400"
                              : "bg-rose-950/60 border-rose-800 text-rose-400"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isNormal ? "bg-emerald-500" : isAllowable ? "bg-amber-500" : "bg-rose-500 animate-pulse"
                            }`}
                          />
                          <span>{row.statutoryAction}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-zinc-400">
            <div className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-zinc-500" />
              <span>
                Statutory Rule: Materials consumed below (Theoretical − Permissible Limit) trigger 2× penal clawback under CPWD Clause 42.
              </span>
            </div>
            <div className="text-[11px] text-zinc-500">
              Audit Period: 01-AUG-2026 to 24-AUG-2026
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
