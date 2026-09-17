import { SensorTelemetryGrid } from "@/components/site/SensorTelemetryGrid";
import { ConcreteMaturityChart } from "@/components/quality/ConcreteMaturityChart";

const maturityPoints = [
  { timeHour: 0, temperatureC: 18 },
  { timeHour: 4, temperatureC: 24 },
  { timeHour: 8, temperatureC: 30 },
  { timeHour: 12, temperatureC: 36 },
  { timeHour: 18, temperatureC: 41 },
  { timeHour: 24, temperatureC: 44 },
  { timeHour: 30, temperatureC: 42 },
  { timeHour: 36, temperatureC: 38 },
];

export default function SiteIotPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: "28px 24px 60px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 24 }}>
        <header>
          <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>Quadillar LiveView / Site Monitoring</div>
          <h1 style={{ margin: "8px 0 0", fontSize: 42 }}>IoT & Environmental Telemetry</h1>
        </header>

        <section style={{ border: "1px solid rgba(148,163,184,0.18)", borderRadius: 22, padding: 20, background: "rgba(15,23,42,0.8)" }}>
          <SensorTelemetryGrid />
        </section>

        <section>
          <ConcreteMaturityChart pourName="Level 03 Slab Pour - Bay C3" points={maturityPoints} designStrengthMpa={30} />
        </section>
      </div>
    </main>
  );
}
