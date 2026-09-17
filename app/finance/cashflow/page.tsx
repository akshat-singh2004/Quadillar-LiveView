"use client";

import { useMemo } from "react";
import { CashflowProjectionChart, type CashflowForecastPoint } from "@/components/finance/CashflowProjectionChart";

const projectionData: CashflowForecastPoint[] = [
  { month: "Apr", plannedOutflow: 2200000, actualIncurred: 1800000, projectedInflows: 2400000, netLiquidityGap: 200000 },
  { month: "May", plannedOutflow: 4700000, actualIncurred: 3900000, projectedInflows: 4800000, netLiquidityGap: 100000 },
  { month: "Jun", plannedOutflow: 7200000, actualIncurred: 6300000, projectedInflows: 6500000, netLiquidityGap: 700000 },
  { month: "Jul", plannedOutflow: 9800000, actualIncurred: 9100000, projectedInflows: 8600000, netLiquidityGap: 1200000 },
  { month: "Aug", plannedOutflow: 12800000, actualIncurred: 11600000, projectedInflows: 10600000, netLiquidityGap: 2200000 },
  { month: "Sep", plannedOutflow: 15700000, actualIncurred: 14900000, projectedInflows: 13800000, netLiquidityGap: 1900000 },
];

const formatLakhs = (value: number) => `₹${(value / 100000).toFixed(2)} Lakh`;
const formatCrores = (value: number) => `₹${(value / 10000000).toFixed(2)} Cr`;

function formatCurrency(value: number) {
  if (value >= 10000000) return formatCrores(value);
  return formatLakhs(value);
}

export default function CashFlowPage() {
  const evm = useMemo(() => {
    const bac = 360000000;
    const ev = 249000000;
    const ac = 214000000;
    const cpi = (ev / ac) || 1;
    const eac = ac + (bac - ev) / cpi;
    const etc = eac - ac;
    const vac = bac - eac;

    return { bac, ev, ac, cpi, eac, etc, vac };
  }, []);

  const latestGap = projectionData[projectionData.length - 1]?.netLiquidityGap ?? 0;

  return (
    <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: "28px 24px 56px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 24 }}>
        <header>
          <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>Financial controls</div>
          <h1 style={{ margin: 0, fontSize: 42, letterSpacing: "-0.05em" }}>Cash Flow Forecasting & EAC / ETC Engine</h1>
        </header>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 18 }}>
          {[
            { label: "BAC", value: formatCurrency(evm.bac) },
            { label: "EV", value: formatCurrency(evm.ev) },
            { label: "AC", value: formatCurrency(evm.ac) },
            { label: "CPI", value: evm.cpi.toFixed(3) },
          ].map((stat) => (
            <div key={stat.label} style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 18, padding: 18 }}>
              <div style={{ color: "#94a3b8", fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase" }}>{stat.label}</div>
              <div style={{ marginTop: 10, fontSize: 28, fontWeight: 800 }}>{stat.value}</div>
            </div>
          ))}
        </section>

        <section style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 22, padding: 18 }}>
          <div style={{ marginBottom: 12, color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Treasury projection</div>
          <CashflowProjectionChart data={projectionData} />
        </section>

        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 18, padding: 18 }}>
            <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>EVM forecast</div>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <MetricRow label="EAC" value={formatCurrency(evm.eac)} />
              <MetricRow label="ETC" value={formatCurrency(evm.etc)} />
              <MetricRow label="VAC" value={formatCurrency(evm.vac)} />
            </div>
          </div>

          <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 18, padding: 18 }}>
            <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Treasury alerts</div>
            <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
              <AlertRow label="Next 60-day liquidity gap" value={formatCurrency(Math.max(0, latestGap))} tone={latestGap > 0 ? "#f87171" : "#34d399"} />
              <AlertRow label="Burn rate" value={`${((evm.ac / evm.bac) * 100).toFixed(1)}%`} tone="#fbbf24" />
              <AlertRow label="Escrow buffer" value={formatCurrency(2400000)} tone="#60a5fa" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "rgba(2,6,23,0.6)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(148,163,184,0.18)" }}>
      <span style={{ color: "#cbd5e1" }}>{label}</span>
      <strong style={{ color: "#f8fafc" }}>{value}</strong>
    </div>
  );
}

function AlertRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: "rgba(2,6,23,0.6)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(148,163,184,0.18)" }}>
      <span style={{ color: "#cbd5e1" }}>{label}</span>
      <strong style={{ color: tone }}>{value}</strong>
    </div>
  );
}
