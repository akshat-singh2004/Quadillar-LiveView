"use client";

import { useMemo, useState } from "react";
import { CartesianGrid, Legend, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface MaturityPoint {
  timeHour: number;
  temperatureC: number;
  surfaceTemperatureC?: number;
  ambientTemperatureC?: number;
}

const buttonStyle = { border: "1px solid rgba(103,232,249,.35)", background: "rgba(34,211,238,.1)", color: "#cffafe", borderRadius: 8, padding: "8px 10px", cursor: "pointer" };
const activeButton = { ...buttonStyle, background: "#0ea5e9", color: "#082f49" };

interface ConcreteMaturityChartProps {
  pourName: string;
  points: MaturityPoint[];
  datumTemperatureC?: number;
  designStrengthMpa?: number;
}

export function ConcreteMaturityChart({
  pourName,
  points,
  datumTemperatureC = -10,
  designStrengthMpa = 30,
}: ConcreteMaturityChartProps) {
  const [view, setView] = useState<"thermal" | "maturity">("thermal");
  const maturityData = useMemo(() => {
    const effectivePoints = [...points].sort((a, b) => a.timeHour - b.timeHour);
    const cumulative = effectivePoints.reduce<{ points: (MaturityPoint & { surfaceTemperatureC: number; ambientTemperatureC: number; differential: number; maturity: number; temperatureAdjusted: number; strengthMpa: number })[]; maturity: number }>((result, point, index) => {
      const deltaT = index === 0 ? 0 : effectivePoints[index].timeHour - effectivePoints[index - 1].timeHour;
      const adjusted = Math.max(0, point.temperatureC - datumTemperatureC);
      const maturity = result.maturity + adjusted * deltaT;
      const surfaceTemperatureC = point.surfaceTemperatureC ?? point.temperatureC - 3;
      const ambientTemperatureC = point.ambientTemperatureC ?? 24;
      result.points.push({ ...point, surfaceTemperatureC, ambientTemperatureC, differential: point.temperatureC - surfaceTemperatureC, maturity, temperatureAdjusted: adjusted, strengthMpa: designStrengthMpa * Math.min(1, maturity / 7000) });
      return { points: result.points, maturity };
    }, { points: [], maturity: 0 });

    const estimatedStrengthPercent = Math.min(100, (cumulative.maturity / 7000) * 100);
    const estimatedStrengthMpa = designStrengthMpa * estimatedStrengthPercent / 100;
    const isReady = estimatedStrengthPercent >= 70;
    const status = isReady ? "Safe to De-Shutter (Achieved ≥ 70% Design Strength)" : "Maturity below stripping threshold";

    return { cumulative: cumulative.points, maturity: cumulative.maturity, estimatedStrengthPercent, estimatedStrengthMpa, isReady, status };
  }, [datumTemperatureC, designStrengthMpa, points]);

  const latest = maturityData.cumulative[maturityData.cumulative.length - 1];
  const maxDifferential = Math.max(...maturityData.cumulative.map((point) => point.differential), 0);

  return (
    <div style={{ background: "rgba(15,23,42,0.82)", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 18, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Concrete maturity</div>
          <h3 style={{ margin: "8px 0 0", fontSize: 28 }}>{pourName}</h3>
        </div>
        <div style={{ padding: "8px 12px", borderRadius: 999, background: maturityData.isReady ? "rgba(34,197,94,0.12)" : "rgba(251,191,36,0.12)", border: `1px solid ${maturityData.isReady ? "rgba(34,197,94,0.32)" : "rgba(251,191,36,0.32)"}`, color: maturityData.isReady ? "#bbf7d0" : "#fde68a", fontWeight: 800 }}>
          {maturityData.status}
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 16 }}>
        <div style={{ display: "flex", gap: 8 }}><button type="button" onClick={() => setView("thermal")} style={view === "thermal" ? activeButton : buttonStyle}>Thermal telemetry</button><button type="button" onClick={() => setView("maturity")} style={view === "maturity" ? activeButton : buttonStyle}>Nurse-Saul strength</button></div>
        <div style={{ height: 300 }}><ResponsiveContainer width="100%" height="100%"><LineChart data={maturityData.cumulative}><CartesianGrid stroke="rgba(148,163,184,.12)" vertical={false}/><XAxis dataKey="timeHour" tick={{ fill: "#cbd5e1" }} unit="h"/><YAxis tick={{ fill: "#cbd5e1" }}/><Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155" }}/><Legend/>{view === "thermal" ? <><ReferenceArea y1={20} y2={80} fill="#ef4444" fillOpacity={0.14} label="ΔT ≥ 20°C"/><ReferenceLine y={20} stroke="#ef4444" strokeDasharray="6 4"/><Line type="monotone" dataKey="temperatureC" name="Core temperature °C" stroke="#f97316" strokeWidth={3}/><Line type="monotone" dataKey="surfaceTemperatureC" name="Surface temperature °C" stroke="#38bdf8" strokeWidth={3}/><Line type="monotone" dataKey="ambientTemperatureC" name="Ambient temperature °C" stroke="#94a3b8"/><Line type="monotone" dataKey="differential" name="ΔT core-surface °C" stroke="#ef4444" strokeWidth={2}/></> : <><ReferenceLine y={designStrengthMpa * .7} stroke="#34d399" strokeDasharray="6 4" label="70% threshold"/><Line type="monotone" dataKey="maturity" name="M(t) °C·h" stroke="#a78bfa" strokeWidth={3}/><Line type="monotone" dataKey="strengthMpa" name="Estimated fcm MPa" stroke="#34d399" strokeWidth={3}/></>}</LineChart></ResponsiveContainer></div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <div style={{ background: "rgba(2,6,23,0.58)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 14, padding: 14 }}>
            <div style={{ color: "#a5f3fc", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>Nurse-Saul M(t)</div>
            <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800 }}>{maturityData.maturity.toFixed(0)}°C·h</div>
          </div>
          <div style={{ background: "rgba(2,6,23,0.58)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 14, padding: 14 }}>
            <div style={{ color: "#a5f3fc", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>Estimated Strength</div>
            <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800 }}>{latest?.strengthMpa.toFixed(1) ?? maturityData.estimatedStrengthMpa.toFixed(1)} MPa</div>
            <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>{maturityData.estimatedStrengthPercent.toFixed(1)}% of design strength</div>
          </div>
          <div style={{ background: "rgba(2,6,23,0.58)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 14, padding: 14 }}>
            <div style={{ color: "#a5f3fc", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase" }}>Design Strength Target</div>
            <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800 }}>{maxDifferential}°C ΔT</div>
          </div>
        </div>
      </div>
    </div>
  );
}
