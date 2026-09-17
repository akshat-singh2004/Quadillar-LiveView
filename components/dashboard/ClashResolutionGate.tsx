"use client";

import { useMemo } from "react";
import type { ClashIssue } from "@/types/construction";

interface ClashResolutionGateProps {
  clashes: ClashIssue[];
}

export function ClashResolutionGate({ clashes }: ClashResolutionGateProps) {
  const hardOpenClashes = useMemo(
    () => clashes.filter((clash) => clash.severity === "Hard" && clash.status === "Open"),
    [clashes],
  );

  const gateBlocked = hardOpenClashes.length > 0;

  return (
    <div style={{ background: "#0b1220", border: "1px solid #1e293b", borderRadius: 20, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>Pre-GFC gate</div>
          <h2 style={{ margin: "8px 0 0", fontSize: 24 }}>Multi-disciplinary clash resolution</h2>
        </div>
        <span
          style={{
            background: gateBlocked ? "#7f1d1d" : "#166534",
            color: "#f8fafc",
            borderRadius: 999,
            padding: "6px 12px",
            fontWeight: 700,
          }}
        >
          {gateBlocked ? "Gate Locked" : "Ready for GFC"}
        </span>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {clashes.map((clash) => (
          <div key={clash.clashId} style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 14, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "justify-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 800 }}>{clash.discipline} • {clash.severity} clash</div>
              <span
                style={{
                  background: clash.status === "Resolved" ? "#166534" : "#7f1d1d",
                  color: "#f8fafc",
                  borderRadius: 999,
                  padding: "5px 10px",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {clash.status}
              </span>
            </div>
            <div style={{ color: "#cbd5e1", marginTop: 10 }}>{clash.description}</div>
            <div style={{ color: "#94a3b8", marginTop: 8, fontSize: 12 }}>{clash.location ?? "Not assigned"}</div>
          </div>
        ))}
      </div>

      {gateBlocked && (
        <div style={{ marginTop: 18, background: "#3f0b0b", border: "1px solid #ef4444", borderRadius: 14, padding: 14, color: "#fecaca", fontWeight: 700 }}>
          Gate enforcement: no CDE drawing may advance from Shared to Published (GFC) while critical hard clashes remain unresolved.
        </div>
      )}
    </div>
  );
}
