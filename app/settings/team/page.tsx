import { StakeholderMatrix } from "@/components/settings/StakeholderMatrix";

export default function TeamSettingsPage() {
  return (
    <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: "28px 24px 60px" }}>
      <div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gap: 24 }}>
        <header>
          <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>Project settings</div>
          <h1 style={{ margin: "8px 0 0", fontSize: 42 }}>Team & Permissions</h1>
        </header>

        <section style={{ border: "1px solid rgba(148,163,184,0.18)", borderRadius: 22, padding: 20, background: "rgba(15,23,42,0.8)" }}>
          <StakeholderMatrix />
        </section>
      </div>
    </main>
  );
}
