"use client";

import { buildEvmCurve, formatEvmCurrency, summarizeEvmCurve } from "@/lib/analytics/evm";

export function EVMProgressChart() {
  const points = buildEvmCurve();
  const summary = summarizeEvmCurve(points);

  const width = 820;
  const height = 260;
  const padding = { top: 20, right: 20, bottom: 30, left: 48 };

  const maxValue = Math.max(...points.flatMap((point) => [point.pv, point.ev, point.ac])) * 1.12;

  const x = (index: number) => padding.left + (index / (points.length - 1)) * (width - padding.left - padding.right);
  const y = (value: number) => height - padding.bottom - (value / maxValue) * (height - padding.top - padding.bottom);

  const toPath = (key: "pv" | "ev" | "ac") =>
    points
      .map((point, index) => `${index === 0 ? "M" : "L"}${x(index)},${y(point[key])}`)
      .join(" ");

  return (
    <div style={{ background: "#0a0a0a", border: "1px solid #262626", borderRadius: 18, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ color: "#a3a3a3", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>Earned value management</div>
          <h3 style={{ margin: "8px 0 0", fontSize: 24, letterSpacing: "-0.04em" }}>S-curve performance</h3>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <div style={{ background: "#111111", border: "1px solid #262626", borderRadius: 12, padding: "8px 10px" }}>
            <div style={{ color: "#a3a3a3", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>CPI</div>
            <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 700 }}>{summary.cpi.toFixed(2)}</div>
          </div>
          <div style={{ background: "#111111", border: "1px solid #262626", borderRadius: 12, padding: "8px 10px" }}>
            <div style={{ color: "#a3a3a3", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>SPI</div>
            <div style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontWeight: 700 }}>{summary.spi.toFixed(2)}</div>
          </div>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 280, borderRadius: 12, background: "#050505" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const lineY = y(maxValue * ratio);
          return (
            <g key={ratio}>
              <line x1={padding.left} x2={width - padding.right} y1={lineY} y2={lineY} stroke="rgba(255,255,255,0.12)" strokeDasharray="4 6" />
            </g>
          );
        })}

        <path d={toPath("pv")} fill="none" stroke="#f5f5f5" strokeWidth="2" strokeDasharray="6 6" />
        <path d={toPath("ev")} fill="none" stroke="#d4d4d4" strokeWidth="2.5" />
        <path d={toPath("ac")} fill="none" stroke="#a3a3a3" strokeWidth="2.5" />

        {points.map((point, index) => (
          <g key={point.period}>
            <circle cx={x(index)} cy={y(point.ev)} r={3} fill="#e5e5e5" />
            <text x={x(index)} y={height - 8} textAnchor="middle" fill="#a3a3a3" fontSize="10">{point.period}</text>
          </g>
        ))}
      </svg>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 18 }}>
        {[
          { label: "Planned value (PV)", value: formatEvmCurrency(summary.pv) },
          { label: "Earned value (EV)", value: formatEvmCurrency(summary.ev) },
          { label: "Actual cost (AC)", value: formatEvmCurrency(summary.ac) },
          { label: "Schedule variance (SV)", value: formatEvmCurrency(summary.sv) },
          { label: "Cost variance (CV)", value: formatEvmCurrency(summary.cv) },
        ].map((metric) => (
          <div key={metric.label} style={{ background: "#111111", border: "1px solid #262626", borderRadius: 12, padding: 12 }}>
            <div style={{ color: "#a3a3a3", fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase" }}>{metric.label}</div>
            <div style={{ marginTop: 8, fontWeight: 700, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{metric.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
