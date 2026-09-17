"use client";

import { useMemo, useState } from "react";

type PinStatus = "Open" | "Pending Review" | "Resolved";
type PinKind = "RFI" | "Clash" | "Quality";

export interface SheetPin {
  id: string;
  x: number;
  y: number;
  status: PinStatus;
  kind: PinKind;
  title: string;
  assignee: string;
  sheet: string;
}

interface SheetViewerProps {
  title?: string;
  sheetName?: string;
  pins?: SheetPin[];
  onPinAdd?: (pin: { x: number; y: number; sheet: string; title: string; assignee: string; kind: PinKind; status: PinStatus }) => void;
}

const statusColors: Record<PinStatus, string> = {
  Open: "#ef4444",
  "Pending Review": "#f59e0b",
  Resolved: "#10b981",
};

export function SheetViewer({ title = "Architectural Floor Sheet", sheetName = "A-102", pins = [], onPinAdd }: SheetViewerProps) {
  const [draftPins, setDraftPins] = useState<SheetPin[]>(pins);
  const [activePinId, setActivePinId] = useState<string | null>(null);

  const pinMap = useMemo(() => new Map(draftPins.map((pin) => [pin.id, pin])), [draftPins]);

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(2));
    const y = Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(2));
    const nextPin: SheetPin = {
      id: `pin-${Date.now()}`,
      x: Math.min(96, Math.max(4, x)),
      y: Math.min(96, Math.max(4, y)),
      status: "Open",
      kind: "RFI",
      title: "New RFI Pin",
      assignee: "Design Consultant",
      sheet: sheetName,
    };

    setDraftPins((current) => [...current, nextPin]);
    setActivePinId(nextPin.id);
    onPinAdd?.({ x: nextPin.x, y: nextPin.y, sheet: nextPin.sheet, title: nextPin.title, assignee: nextPin.assignee, kind: nextPin.kind, status: nextPin.status });
  };

  return (
    <div style={{ background: "rgba(11,18,32,0.96)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 22, padding: 18, color: "#e2e8f0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#94a3b8" }}>Sheet viewer</div>
          <h3 style={{ margin: "8px 0 0", fontSize: 22, letterSpacing: "-0.04em" }}>{title}</h3>
        </div>
        <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 999, padding: "8px 12px", fontSize: 12, color: "#cbd5e1" }}>{sheetName}</div>
      </div>

      <div onClick={handleCanvasClick} style={{ position: "relative", height: 500, background: "linear-gradient(120deg, rgba(96,165,250,0.10), rgba(15,23,42,0.86))", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 18, overflow: "hidden", cursor: "crosshair" }}>
        <div style={{ position: "absolute", inset: 18, border: "2px solid rgba(148,163,184,0.36)", borderRadius: 16 }} />
        <div style={{ position: "absolute", left: "14%", top: "15%", width: "30%", height: "22%", border: "2px dashed rgba(125,211,252,0.6)", borderRadius: 12 }} />
        <div style={{ position: "absolute", left: "42%", top: "28%", width: "28%", height: "32%", border: "2px dashed rgba(34,197,94,0.6)", borderRadius: 12 }} />
        <div style={{ position: "absolute", left: "18%", top: "65%", width: "32%", height: "18%", border: "2px dashed rgba(251,191,36,0.6)", borderRadius: 12 }} />

        {draftPins.map((pin) => (
          <div key={pin.id} onClick={(event) => event.stopPropagation()} style={{ position: "absolute", left: `${pin.x}%`, top: `${pin.y}%`, transform: "translate(-50%, -50%)", zIndex: activePinId === pin.id ? 3 : 2 }}>
            <div style={{ position: "relative", display: "grid", placeItems: "center" }}>
              <div style={{ width: 18, height: 18, borderRadius: "999px", background: statusColors[pin.status], boxShadow: `0 0 0 6px ${statusColors[pin.status]}30`, border: "2px solid rgba(15,23,42,0.9)" }} />
              <div style={{ marginTop: 8, background: "rgba(15,23,42,0.92)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 10, padding: "6px 8px", fontSize: 11, color: "#e2e8f0", whiteSpace: "nowrap", boxShadow: "0 10px 28px rgba(15,23,42,0.45)" }}>
                {pin.kind} • {pin.status}
              </div>
            </div>
            {activePinId === pin.id && (
              <div style={{ position: "absolute", left: 20, top: 22, minWidth: 180, background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.2)", borderRadius: 12, padding: 10, fontSize: 12, color: "#e2e8f0" }}>
                <div style={{ fontWeight: 700 }}>{pin.title}</div>
                <div style={{ marginTop: 4, color: "#cbd5e1" }}>{pin.assignee}</div>
                <div style={{ marginTop: 4, color: "#94a3b8" }}>{pin.sheet}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
        {Array.from(pinMap.values()).map((pin) => (
          <button key={pin.id} type="button" onClick={() => setActivePinId(activePinId === pin.id ? null : pin.id)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(148,163,184,0.18)", color: "#e2e8f0", borderRadius: 999, padding: "8px 10px", cursor: "pointer", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            {pin.title} • {pin.status}
          </button>
        ))}
      </div>
    </div>
  );
}
