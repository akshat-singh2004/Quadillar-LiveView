"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

export interface SCurvePoint {
  month: string;
  pv: number;
  ev: number;
  acwp: number;
}

interface SCurveChartProps {
  data: SCurvePoint[];
  loading?: boolean;
}

export function SCurveChart({ data, loading = false }: SCurveChartProps) {
  if (loading) {
    return <div style={{ height: 260, borderRadius: 18, background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.18)", display: "grid", placeItems: "center", color: "#94a3b8" }}>Loading cashflow curve…</div>;
  }

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 16, right: 20, left: 0, bottom: 8 }}>
          <CartesianGrid stroke="rgba(148,163,184,0.12)" vertical={false} />
          <XAxis dataKey="month" tick={{ fill: "#cbd5e1", fontSize: 12 }} stroke="rgba(148,163,184,0.2)" />
          <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} stroke="rgba(148,163,184,0.2)" tickFormatter={(value) => `₹${Number(value / 100000).toFixed(0)}L`} />
          <Tooltip
            contentStyle={{ background: "#0f172a", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12, color: "#f8fafc" }}
            formatter={(value) => {
              const numericValue = Array.isArray(value) ? Number(value[0] ?? 0) : Number(value ?? 0);
              return [`₹${(numericValue / 100000).toFixed(2)} Lakh`, ""];
            }}
          />
          <Legend wrapperStyle={{ color: "#e2e8f0" }} />
          <Line type="monotone" dataKey="pv" name="PV" stroke="#60a5fa" strokeWidth={2.5} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="ev" name="EV" stroke="#34d399" strokeWidth={2.5} dot={{ r: 2 }} />
          <Line type="monotone" dataKey="acwp" name="ACWP" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 2 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
