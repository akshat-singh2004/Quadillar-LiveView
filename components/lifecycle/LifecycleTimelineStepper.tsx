"use client";

const phases = [
  { id: 1, title: "Land Due Diligence & Geotech", status: "Cleared" },
  { id: 2, title: "Pre-Design & Information Governance (EIR/BEP)", status: "Cleared" },
  { id: 3, title: "Multi-Disciplinary Design (LOD 100-350) & Permitting", status: "In Progress" },
  { id: 4, title: "Scope Division & Trade Award (MasterFormat)", status: "In Progress" },
  { id: 5, title: "Pre-Con Mobilization & LOD 400 Submittals", status: "Locked" },
  { id: 6, title: "Field Execution, Structural QC & Rough MEP", status: "Locked" },
  { id: 7, title: "Systems Commissioning (CxA TAB) & Substantial Completion", status: "Locked" },
  { id: 8, title: "Progressive AIM Integration & Facility Operations", status: "Locked" },
] as const;

export function LifecycleTimelineStepper() {
  return (
    <div style={{ background: "rgba(11,18,32,0.9)", border: "1px solid #1e293b", borderRadius: 18, padding: "14px 16px", marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 12, flexWrap: "wrap" }}>
        <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 700 }}>Project Lifecycle</div>
        <div style={{ fontSize: 12, color: "#94a3b8" }}>8-phase governance roadmap</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
        {phases.map((phase) => {
          const tone =
            phase.status === "Cleared"
              ? { bg: "rgba(34,197,94,0.14)", border: "#22c55e", color: "#86efac" }
              : phase.status === "In Progress"
                ? { bg: "rgba(251,191,36,0.12)", border: "#f59e0b", color: "#fbbf24" }
                : { bg: "rgba(148,163,184,0.08)", border: "#475569", color: "#cbd5e1" };

          return (
            <div key={phase.id} style={{ background: tone.bg, border: `1px solid ${tone.border}`, borderRadius: 12, padding: 10 }}>
              <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 8 }}>Phase {phase.id}</div>
              <div style={{ fontWeight: 700, lineHeight: 1.35 }}>{phase.title}</div>
              <div style={{ marginTop: 10, color: tone.color, fontSize: 11, fontWeight: 700 }}>{phase.status}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
