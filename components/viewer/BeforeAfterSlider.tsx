"use client";

import { useMemo, useState } from "react";
import type { RealityCaptureRecord } from "@/types/construction";

export function BeforeAfterSlider({ captures }: { captures: RealityCaptureRecord[] }) {
  const zones = useMemo(() => Array.from(new Set(captures.map((item) => item.locationZone))), [captures]);
  const [zone, setZone] = useState(zones[0] ?? "All zones");
  const zoneCaptures = useMemo(() => captures.filter((item) => zone === "All zones" || item.locationZone === zone).sort((a, b) => b.captureDate.localeCompare(a.captureDate)), [captures, zone]);
  const [selectedDate, setSelectedDate] = useState(zoneCaptures[0]?.captureDate ?? "");
  const current = zoneCaptures.find((item) => item.captureDate === selectedDate) ?? zoneCaptures[0];
  const previous = zoneCaptures.find((item) => item.captureDate < (current?.captureDate ?? "")) ?? zoneCaptures[1];
  const [position, setPosition] = useState(52);
  const [panoramaOffset, setPanoramaOffset] = useState(50);

  if (!current) return <div style={{ color: "#94a3b8" }}>No reality captures are available for this project.</div>;

  const movePanorama = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.buttons === 1) setPanoramaOffset((value) => Math.max(0, Math.min(100, value - event.movementX / 5)));
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {["All zones", ...zones].map((item) => <button type="button" key={item} onClick={() => { setZone(item); setSelectedDate(""); }} style={{ ...tagStyle, background: zone === item ? "#0ea5e9" : "rgba(255,255,255,0.04)", color: zone === item ? "#082f49" : "#cbd5e1" }}>{item}</button>)}
      </div>
      <div><div style={eyebrow}>Capture timeline</div><input type="range" min="0" max={Math.max(0, zoneCaptures.length - 1)} value={Math.max(0, zoneCaptures.findIndex((item) => item.id === current.id))} onChange={(event) => setSelectedDate(zoneCaptures[Number(event.target.value)]?.captureDate ?? "")} style={{ width: "100%", marginTop: 10 }} /><div style={{ display: "flex", justifyContent: "space-between", color: "#94a3b8", fontSize: 12 }}>{zoneCaptures.slice().reverse().map((item) => <span key={item.id}>{item.captureDate}</span>)}</div></div>
      {current.isEquirectangular && <div><div style={eyebrow}>360° panoramic viewport</div><div onPointerMove={movePanorama} style={{ marginTop: 10, height: 220, borderRadius: 16, border: "1px solid #334155", backgroundImage: `url(${current.imageUrl})`, backgroundSize: "200% 100%", backgroundPosition: `${panoramaOffset}% center`, cursor: "ew-resize" }} /></div>}
      <div style={{ position: "relative", height: 520, overflow: "hidden", borderRadius: 18, background: "#111827", border: "1px solid #334155" }}><img src={previous?.imageUrl ?? current.imageUrl} alt="Previous site capture" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} /><div style={{ position: "absolute", inset: 0, width: `${position}%`, overflow: "hidden", borderRight: "3px solid #f8fafc" }}><img src={current.imageUrl} alt="Current site capture" style={{ width: `${100 / (position / 100)}%`, height: "100%", objectFit: "cover", maxWidth: "none" }} /></div><input aria-label="Comparison split" type="range" min="5" max="95" value={position} onChange={(event) => setPosition(Number(event.target.value))} style={{ position: "absolute", inset: 0, width: "100%", opacity: 0, cursor: "ew-resize" }} /><div style={overlayLabel("left")}>Current · {current.captureDate}</div><div style={overlayLabel("right")}>Previous · {previous?.captureDate ?? "Design baseline"}</div></div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}><div><div style={eyebrow}>Selected zone</div><div style={{ marginTop: 5, color: "#f8fafc", fontWeight: 700 }}>{current.locationZone}</div></div><div style={{ color: "#7dd3fc", fontSize: 12 }}>{current.isEquirectangular ? "360° panoramic capture" : "Perspective capture"}</div></div>
    </div>
  );
}

const eyebrow = { color: "#94a3b8", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" as const };
const tagStyle = { border: "1px solid rgba(148,163,184,0.2)", borderRadius: 999, padding: "9px 12px", cursor: "pointer" };
const overlayLabel = (side: "left" | "right") => ({ position: "absolute" as const, top: 14, [side]: 14, background: "rgba(2,6,23,0.78)", borderRadius: 8, padding: "7px 9px", fontSize: 11 });
