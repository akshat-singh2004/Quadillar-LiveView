import { fetchSafetyIncidents } from "@/app/lib/services";
import { SafetyIncidentTable } from "@/components/site/SafetyIncidentTable";

export default async function SiteSafetyPage() {
  const incidents = await fetchSafetyIncidents("proj-1");

  return (
    <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 24 }}>
        <header><div style={{ color: "#fbbf24", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>Quadillar LiveView / HSE</div><h1 style={{ margin: "10px 0 0", fontSize: 40, letterSpacing: "-0.04em" }}>Safety Incident & Hazard Console</h1><p style={{ margin: "10px 0 0", color: "#94a3b8" }}>Keep incident evidence, CAPA actions, and safe-work streaks visible to the whole project team.</p></header>
        <section style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 22, padding: 20 }}><SafetyIncidentTable initialIncidents={incidents} /></section>
      </div>
    </main>
  );
}
