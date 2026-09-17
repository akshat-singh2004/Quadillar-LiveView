"use client";

import { useMemo, useState } from "react";
import type { BimClashRecord } from "@/types/construction";

export interface ClashResolutionDrawerProps {
  clashes: BimClashRecord[];
  focusTarget?: { x: number; y: number; z: number } | null;
  onFocus?: (target: { x: number; y: number; z: number }) => void;
}

export function ClashResolutionDrawer({ clashes, focusTarget = null, onFocus }: ClashResolutionDrawerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(clashes[0]?.id ?? null);

  const matrix = useMemo(() => {
    const groups = [
      { zone: "A-01", architecture: 4, structural: 3, mep: 2, resolved: 2 },
      { zone: "B-02", architecture: 3, structural: 2, mep: 4, resolved: 3 },
      { zone: "C-03", architecture: 2, structural: 5, mep: 3, resolved: 4 },
      { zone: "D-04", architecture: 5, structural: 1, mep: 2, resolved: 2 },
    ];

    return groups.map((zone) => ({
      ...zone,
      open: zone.architecture + zone.structural + zone.mep - zone.resolved,
      total: zone.architecture + zone.structural + zone.mep,
    }));
  }, []);

  const activeClash = clashes.find((clash) => clash.id === selectedId) ?? clashes[0] ?? null;

  return (
    <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1.2fr 0.8fr", color: "#e2e8f0" }}>
      <section style={{ border: "1px solid rgba(148,163,184,0.18)", borderRadius: 20, padding: 18, background: "rgba(15,23,42,0.82)" }}>
        <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Clash Matrix</div>
        <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, fontSize: 11, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em" }}>
            <span>Zone</span>
            <span>Arch</span>
            <span>Struct</span>
            <span>MEP</span>
          </div>
          {matrix.map((row) => (
            <div key={row.zone} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, alignItems: "center", background: "rgba(15,23,42,0.72)", borderRadius: 12, border: "1px solid rgba(148,163,184,0.12)", padding: "10px 12px" }}>
              <strong>{row.zone}</strong>
              <span>{row.architecture}</span>
              <span>{row.structural}</span>
              <span>{row.mep}</span>
            </div>
          ))}
        </div>
      </section>

      <aside style={{ border: "1px solid rgba(148,163,184,0.18)", borderRadius: 20, padding: 18, background: "rgba(15,23,42,0.82)" }}>
        <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Clash issue resolution</div>
        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {clashes.map((clash) => (
            <button
              key={clash.id}
              type="button"
              onClick={() => {
                setSelectedId(clash.id);
                if (onFocus) {
                  onFocus({ x: clash.x, y: clash.y, z: clash.z });
                }
              }}
              style={{
                textAlign: "left",
                borderRadius: 12,
                border: activeClash?.id === clash.id ? "1px solid rgba(96,165,250,0.6)" : "1px solid rgba(148,163,184,0.14)",
                background: activeClash?.id === clash.id ? "rgba(59,130,246,0.08)" : "rgba(15,23,42,0.6)",
                padding: 12,
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong>{clash.title}</strong>
                <span style={{ color: clash.severity === "Critical" ? "#fca5a5" : clash.severity === "Moderate" ? "#fbbf24" : "#93c5fd", fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase" }}>{clash.severity}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: "#cbd5e1" }}>{clash.location}</div>
            </button>
          ))}
        </div>

        {activeClash && (
          <div style={{ marginTop: 20, borderTop: "1px solid rgba(148,163,184,0.18)", paddingTop: 16 }}>
            <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>Selected focus</div>
            <div style={{ marginTop: 8, fontSize: 20, fontWeight: 700 }}>{activeClash.title}</div>
            <div style={{ marginTop: 8, color: "#cbd5e1", lineHeight: 1.5 }}>{activeClash.description}</div>
            <div style={{ marginTop: 10, fontSize: 12, color: "#cbd5e1" }}>Coordinates: {activeClash.x}, {activeClash.y}, {activeClash.z}</div>
            {focusTarget && <div style={{ marginTop: 8, fontSize: 12, color: "#67e8f9" }}>Camera locked to clash point</div>}
          </div>
        )}
      </aside>
    </div>
  );
}
