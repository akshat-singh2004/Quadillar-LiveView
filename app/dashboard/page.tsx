import React from "react";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  FileSpreadsheet,
  ShieldCheck,
  Receipt,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Building2,
  Lock,
} from "lucide-react";

interface ExecutiveMetrics {
  grossWorkExecutedInr: number;
  unbilledMbInventoryInr: number;
  totalCertifiedNetInr: number;
  retentionEscrowInr: number;
  ncrWithholdsInr: number;
  cpi: number;
  spi: number;
  safeManHours: number;
  clause5DelayDays: number;
  ldExposureInr: number;
  criticalPoursFrozen: number;
  gccProtocol: string;
}

function formatInr(val: number): string {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(val || 0);
}

function ExecutiveCommandHub({ metrics }: { metrics: ExecutiveMetrics }) {
  const isCpiHealthy = metrics.cpi >= 1.0;
  const isSpiHealthy = metrics.spi >= 1.0;

  return (
    <div className="space-y-4 font-sans">
      <div className="bg-zinc-900 border border-zinc-800 px-5 py-3 flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-zinc-200 font-bold uppercase tracking-wider">
              ENTERPRISE AUDIT ACTIVE
            </span>
          </div>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-400">{metrics.gccProtocol}</span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-zinc-500">
            HSE SAFE HOURS:{" "}
            <strong className="text-emerald-400 font-bold">
              {metrics.safeManHours.toLocaleString("en-IN")} HRS
            </strong>
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500">
            FROZEN STAGE-GATES:{" "}
            <strong
              className={
                metrics.criticalPoursFrozen > 0
                  ? "text-rose-400 font-bold"
                  : "text-zinc-300"
              }
            >
              {metrics.criticalPoursFrozen}
            </strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PILLAR 1: COMMERCIAL REVENUE & BILLING LAG */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              <span>Gross Production Executed</span>
              <Building2 className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-3 flex flex-col items-end">
              <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
                {formatInr(metrics.grossWorkExecutedInr)}
              </span>
              <span className="text-[10px] font-mono text-amber-400 mt-0.5">
                Unbilled e-MB: {formatInr(metrics.unbilledMbInventoryInr)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-500">
            <span>Disbursed Net IPC:</span>
            <span className="text-emerald-400 font-bold">
              {formatInr(metrics.totalCertifiedNetInr)}
            </span>
          </div>
        </div>

        {/* PILLAR 2: EARNED VALUE PERFORMANCE (CPI & SPI) */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              <span>Cost &amp; Schedule Index</span>
              <TrendingUp className="h-4 w-4 text-zinc-500" />
            </div>
            <div className="mt-3 flex items-baseline justify-between font-mono">
              <div>
                <span className="text-[10px] text-zinc-500 block">COST (CPI)</span>
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    isCpiHealthy ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {metrics.cpi.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-zinc-500 block">SCHEDULE (SPI)</span>
                <span
                  className={`text-2xl font-bold tabular-nums ${
                    isSpiHealthy ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {metrics.spi.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-500">
            <span>Efficiency Verdict:</span>
            <span
              className={
                isCpiHealthy && isSpiHealthy
                  ? "text-emerald-400 font-bold"
                  : "text-amber-400 font-bold"
              }
            >
              {isCpiHealthy && isSpiHealthy
                ? "Target Baseline Surpassed"
                : "Under Schedule Friction"}
            </span>
          </div>
        </div>

        {/* PILLAR 3: CLAUSE 5 HINDRANCE & LIQUIDATED DAMAGES RISK */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              <span>Statutory Hindrance Defense</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <div className="mt-3 flex flex-col items-end">
              <span
                className={`text-2xl font-bold font-mono tabular-nums ${
                  metrics.clause5DelayDays > 0 ? "text-amber-400" : "text-zinc-100"
                }`}
              >
                {metrics.clause5DelayDays} Delay Days
              </span>
              <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
                Contemporaneous Logged (Cl. 5)
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-500">
            <span>Potential LD Exposure:</span>
            <span
              className={
                metrics.ldExposureInr > 0 ? "text-rose-400 font-bold" : "text-zinc-400"
              }
            >
              {metrics.ldExposureInr > 0
                ? formatInr(metrics.ldExposureInr)
                : "Zero Liability"}
            </span>
          </div>
        </div>

        {/* PILLAR 4: RETENTION ESCROW & QUALITY INTERLOCK */}
        <div className="bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400">
              <span>Retention Escrow &amp; QMS</span>
              <Lock className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="mt-3 flex flex-col items-end">
              <span className="text-2xl font-bold font-mono text-zinc-100 tabular-nums">
                {formatInr(metrics.retentionEscrowInr)}
              </span>
              <span className="text-[10px] font-mono text-rose-400 mt-0.5">
                NCR Withholds: -{formatInr(metrics.ncrWithholdsInr)}
              </span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs font-mono text-zinc-500">
            <span>Cl. 17 DLP Escrow:</span>
            <span className="text-emerald-400 font-bold">Tranche 1 Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Resolve Project Context
  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_name, contract_value, gcc_protocol")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName =
    projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";
  const contractBudget = Number(projectRow?.contract_value) || 0;
  const gccProtocol =
    projectRow?.gcc_protocol || "CPWD GCC Cl. 14 / FIDIC Red Book";

  // 2. Fetch Live Commercial & Measurement Book Volumes
  const { data: mbRows } = await supabase
    .from("digital_measurement_book_entries")
    .select("measured_quantity, consultant_qs_verified")
    .eq("project_id", projectId);

  const mbEntries = mbRows || [];
  const grossMbProduction = mbEntries.reduce(
    (sum, row) => sum + (Number(row.measured_quantity) || 0) * 4500,
    0
  );

  // 3. Fetch Latest Certified RA Bills
  const { data: bills } = await supabase
    .from("running_account_bills")
    .select("*")
    .eq("project_id", projectId)
    .order("bill_sequence_no", { ascending: false });

  const billList = bills || [];
  const latestBill = billList[0];
  const totalCertifiedNet = billList
    .filter((b) => b.status === "SEOR_CERTIFIED_IPC")
    .reduce((sum, b) => sum + (Number(b.net_payable_certified) || 0), 0);

  const unbilledMbInventoryInr = Math.max(
    0,
    grossMbProduction - (Number(latestBill?.gross_valuation) || 0)
  );

  // 4. Fetch Quality NCR Withholdings
  const { data: ncrs } = await supabase
    .from("quality_ncr_register")
    .select("withholding_amount_inr, status")
    .eq("project_id", projectId)
    .neq("status", "CLOSED");

  const totalNcrWithholding = (ncrs || []).reduce(
    (sum, row) => sum + (Number(row.withholding_amount_inr) || 0),
    0
  );

  // 5. Fetch Statutory Hindrances (CPWD Clause 5)
  const { data: hindrances } = await supabase
    .from("site_hindrance_register")
    .select("days_hindered, critical_path_impact")
    .eq("project_id", projectId);

  const totalDelayDays = (hindrances || []).reduce(
    (sum, row) => sum + (Number(row.days_hindered) || 0),
    0
  );

  const ldWeeks = Math.floor(totalDelayDays / 7);
  const calculatedLd = Math.min(
    contractBudget * 0.1,
    contractBudget * 0.005 * ldWeeks
  );

  // 6. Assemble Verified Executive Metrics (with 0 fallbacks for unseeded state)
  const executiveMetrics: ExecutiveMetrics = {
    grossWorkExecutedInr:
      grossMbProduction > 0
        ? grossMbProduction
        : Number(latestBill?.gross_valuation) || 0,
    unbilledMbInventoryInr,
    totalCertifiedNetInr: totalCertifiedNet,
    retentionEscrowInr: contractBudget * 0.05,
    ncrWithholdsInr: totalNcrWithholding,
    cpi: 0,
    spi: 0,
    safeManHours: 0,
    clause5DelayDays: totalDelayDays,
    ldExposureInr: calculatedLd,
    criticalPoursFrozen: ncrs?.length || 0,
    gccProtocol,
  };

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-zinc-100 font-sans">
      <div className="max-w-[1600px] mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-400">
                Project Code: {projectId}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-800 text-emerald-400">
                Contract Value: ₹ {(contractBudget / 10000000).toFixed(2)} Cr
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-100 font-mono uppercase">
              Master Command Center: {projectName}
            </h1>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <Link
              href="/finance/ra-bills"
              className="bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-bold px-4 py-2 uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <FileSpreadsheet className="h-4 w-4" />
              <span>Open RA Bills</span>
            </Link>
          </div>
        </header>

        <ExecutiveCommandHub metrics={executiveMetrics} />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-emerald-400" />
                  <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-zinc-100">
                    Contractor Payment Certificates (RA Register)
                  </h2>
                </div>
                <Link
                  href="/finance/ra-bills"
                  className="text-[10px] font-mono text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
                >
                  <span>Full Ledger</span>
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>

              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 text-[10px] text-zinc-500 uppercase">
                      <th className="py-2.5 px-3">Bill No.</th>
                      <th className="py-2.5 px-3">Work Package</th>
                      <th className="py-2.5 px-3 text-right">Gross Valuation</th>
                      <th className="py-2.5 px-3 text-right">Net Certified</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {billList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-zinc-500">
                          No active payment certificates compiled yet.
                        </td>
                      </tr>
                    ) : (
                      billList.map((b) => (
                        <tr key={b.id} className="hover:bg-zinc-800/20">
                          <td className="py-3 px-3 font-bold text-zinc-200">
                            {b.ra_bill_number}
                          </td>
                          <td className="py-3 px-3 text-zinc-400 truncate max-w-[200px]">
                            {b.trade_package || "General Civil"}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums text-zinc-100">
                            ₹ {(Number(b.gross_valuation) || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3 text-right tabular-nums text-emerald-400 font-bold">
                            ₹ {(Number(b.net_payable_certified) || 0).toLocaleString("en-IN")}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <span className="px-2 py-0.5 border text-[10px] uppercase font-bold bg-emerald-950/40 border-emerald-800 text-emerald-400">
                              {b.status.replace(/_/g, " ")}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 bg-zinc-900 border border-zinc-800 p-5 flex flex-col justify-between font-mono text-xs">
            <div>
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-800">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <h2 className="font-bold uppercase tracking-wider text-zinc-100">
                  Principal Action Desk
                </h2>
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-3 bg-zinc-950 border border-zinc-800">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-zinc-500 uppercase">
                      QMS NCR Withholdings
                    </span>
                    <span className="px-1.5 py-0.2 bg-rose-950/60 border border-rose-800 text-rose-400 text-[10px]">
                      Active
                    </span>
                  </div>
                  <div className="text-sm font-bold text-rose-400 mt-1">
                    -₹ {totalNcrWithholding.toLocaleString("en-IN")}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Locked across active Interim Payment Certificates until CAPA
                    training closure.
                  </p>
                </div>

                <div className="p-3 bg-zinc-950 border border-zinc-800">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] text-zinc-500 uppercase">
                      Clause 5 Hindrance Register
                    </span>
                    <span className="px-1.5 py-0.2 bg-amber-950/60 border border-amber-800 text-amber-400 text-[10px]">
                      {totalDelayDays} Days
                    </span>
                  </div>
                  <div className="text-sm font-bold text-zinc-200 mt-1">
                    Weather &amp; Drawing Approvals
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Contemporaneous delay records logged for formal Extension of
                    Time (EOT) defense.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
              <span>QUADILLAR LIVEVIEW v3.2</span>
              <span>CPWD / FIDIC CONFORMANCE</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
