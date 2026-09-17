"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type CashflowForecastPoint = {
  month: string;
  plannedOutflow: number;
  actualIncurred: number;
  projectedInflows: number;
  netLiquidityGap: number;
};

const formatLakhs = (value: number) => `₹${(value / 100000).toFixed(1)}L`;
const formatCrores = (value: number) => `₹${(value / 10000000).toFixed(2)}Cr`;

function formatCurrency(value: number) {
  if (value >= 10000000) return formatCrores(value);
  return formatLakhs(value);
}

export function CashflowProjectionChart({ data }: { data: CashflowForecastPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={360}>
      <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 12 }}>
        <defs>
          <linearGradient id="plannedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.04} />
          </linearGradient>
          <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.04} />
          </linearGradient>
        </defs>

        <CartesianGrid stroke="rgba(148,163,184,0.18)" strokeDasharray="3 3" />
        <XAxis dataKey="month" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={{ stroke: "rgba(148,163,184,0.22)" }} tickLine={false} />
        <YAxis tickFormatter={(value) => formatCurrency(value)} tick={{ fill: "#cbd5e1", fontSize: 11 }} axisLine={{ stroke: "rgba(148,163,184,0.22)" }} tickLine={false} width={80} />
        <Tooltip
          contentStyle={{ background: "#0f172a", border: "1px solid rgba(148,163,184,0.22)", borderRadius: 12, color: "#e2e8f0" }}
          formatter={(value, name) => [formatCurrency(Number(value ?? 0)), String(name ?? "value")]}
        />
        <Legend wrapperStyle={{ color: "#e2e8f0" }} />
        <ReferenceArea x1="Jul" x2="Sep" y1={0} y2={10000000} fill="rgba(248, 113, 113, 0.08)" />

        <Area type="monotone" dataKey="plannedOutflow" name="Planned Cumulative Outflow" stroke="#38bdf8" fill="url(#plannedGradient)" strokeWidth={2.5} />
        <Line type="monotone" dataKey="actualIncurred" name="Actual Certified Incurred Cost" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="projectedInflows" name="Projected Inflows" stroke="#34d399" strokeWidth={2.5} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="netLiquidityGap" name="Net Liquidity Gap" stroke="#f87171" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
