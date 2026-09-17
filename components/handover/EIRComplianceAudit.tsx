"use client";

import { useMemo } from "react";
import { validateCobieAudit } from "@/lib/cobie/validator";
import type { CobieComponent, CobieType } from "@/types/construction";

interface Props {
  types: CobieType[];
  components: CobieComponent[];
  documentCount?: number;
  systems?: string[];
}

export function EIRComplianceAudit({ types, components, documentCount = 0, systems = [] }: Props) {
  const audit = useMemo(
    () => validateCobieAudit({ types, components, documentCount, systems }),
    [types, components, documentCount, systems],
  );

  return (
    <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 18, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 22 }}>EIR & COBie Quality Audit</h2>
        <span
          style={{
            background: audit.compliant ? "#dcfce7" : "#fee2e2",
            color: audit.compliant ? "#166534" : "#991b1b",
            borderRadius: 999,
            padding: "8px 12px",
            fontWeight: 700,
          }}
        >
          {audit.score}% / {audit.threshold}%
        </span>
      </div>

      <div style={{ marginBottom: 18, height: 10, background: "#0f172a", borderRadius: 999, overflow: "hidden" }}>
        <div
          style={{
            width: `${audit.score}%`,
            height: "100%",
            background: audit.compliant ? "linear-gradient(90deg, #22c55e, #4ade80)" : "linear-gradient(90deg, #f59e0b, #ef4444)",
            borderRadius: 999,
          }}
        />
      </div>

      <div style={{ color: audit.compliant ? "#86efac" : "#fca5a5", fontWeight: 700, marginBottom: 16 }}>{audit.summary}</div>

      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 12 }}>
          <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>Status</div>
          <div style={{ fontWeight: 700, marginTop: 6 }}>{audit.compliant ? "Ready for AIM export" : "Gate blocked pending compliance remediation"}</div>
        </div>

        {audit.missingAttributes.length > 0 && (
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 12 }}>
            <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>Missing mandatory attributes</div>
            <ul style={{ margin: "8px 0 0 18px", color: "#fca5a5", padding: 0 }}>
              {audit.missingAttributes.slice(0, 6).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {audit.blockers.length > 0 && (
          <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 12 }}>
            <div style={{ color: "#94a3b8", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em" }}>Blockers</div>
            <ul style={{ margin: "8px 0 0 18px", color: "#fca5a5", padding: 0 }}>
              {audit.blockers.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
