"use client";

import { useEffect, useMemo, useState } from "react";
import type { BimClashRecord, BimSensorBinding, ProjectScheduleTask } from "@/types/construction";

export interface BimModelViewerProps {
  clashes: BimClashRecord[];
  tasks?: ProjectScheduleTask[];
  sensorBindings?: BimSensorBinding[];
  focusTarget?: { x: number; y: number; z: number } | null;
  onSelect?: (clash: BimClashRecord) => void;
  playbackTime?: number;
  showPlaybackControls?: boolean;
}

export function BimModelViewer({ clashes, tasks = [], sensorBindings = [], focusTarget = null, onSelect, playbackTime: controlledPlaybackTime, showPlaybackControls = true }: BimModelViewerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(clashes[0]?.id ?? null);
  const [selectedSensorId, setSelectedSensorId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ yaw: 18, pitch: 30, zoom: 1 });
  const scheduleBounds = useMemo(() => {
    const dates = tasks.flatMap((task) => [Date.parse(task.baselineStart), Date.parse(task.baselineFinish)]).filter(Number.isFinite);
    const start = Math.min(...dates, Date.now());
    const finish = Math.max(...dates, start + 86400000);
    return { start, finish };
  }, [tasks]);
  const [playbackTime, setPlaybackTime] = useState(scheduleBounds.start);
  const effectivePlaybackTime = controlledPlaybackTime ?? playbackTime;

  useEffect(() => {
    if (!focusTarget) return;
    const targetYaw = 18 + (focusTarget.x / 100) * 32;
    const targetPitch = 18 + (focusTarget.z / 12) * 25;
    let frame = 0;
    const animate = () => {
      frame += 1;
      setCamera((current) => ({
        yaw: current.yaw + (targetYaw - current.yaw) * 0.12,
        pitch: current.pitch + (targetPitch - current.pitch) * 0.12,
        zoom: current.zoom + (1.3 - current.zoom) * 0.12,
      }));
      if (frame < 18) requestAnimationFrame(animate);
    };
    const id = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(id);
  }, [focusTarget]);

  const activeClash = useMemo(
    () => clashes.find((clash) => clash.id === selectedId) ?? clashes[0] ?? null,
    [clashes, selectedId],
  );
  const visibleTasks = tasks.filter((task) => Date.parse(task.baselineStart) <= effectivePlaybackTime);
  const playbackDate = new Date(effectivePlaybackTime).toISOString().slice(0, 10);
  const elementColor = (task?: ProjectScheduleTask) => {
    if (!task) return "rgba(125,211,252,0.5)";
    if (task.status === "Delayed") return "#ef4444";
    if (task.status === "Complete" || task.actualFinish || effectivePlaybackTime >= Date.parse(task.baselineFinish)) return "#14b8a6";
    return "#facc15";
  };
  const sensorBinding = (index: number) => sensorBindings[index % Math.max(sensorBindings.length, 1)];

  return (
    <div style={{ display: "grid", gap: 20, gridTemplateColumns: "1.3fr 0.7fr", color: "#e2e8f0" }}>
      <div style={{ position: "relative", minHeight: 440, background: "radial-gradient(circle at top, rgba(59,130,246,0.18), rgba(15,23,42,0.92) 42%)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 24, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 18, border: "1px solid rgba(148,163,184,0.18)", borderRadius: 18, transform: `perspective(1000px) rotateX(${camera.pitch}deg) rotateY(${camera.yaw}deg) scale(${camera.zoom})`, transition: "transform 200ms ease-out" }}>
          {[{ left: "12%", top: "18%", width: "28%", height: "44%" }, { left: "46%", top: "22%", width: "34%", height: "46%" }, { left: "28%", top: "66%", width: "42%", height: "16%" }].map((element, index) => {
            const task = visibleTasks[index % Math.max(visibleTasks.length, 1)];
            const binding = sensorBinding(index);
            const sensor = binding?.sensor;
            const sensorColor = sensor?.status === "Critical" ? "#ef4444" : sensor?.status === "Watch" ? "#f59e0b" : "#22d3ee";
            const color = elementColor(task);
            return <button type="button" key={`${element.left}-${element.top}`} title={task ? `${task.title} · ${task.status}` : "Planned future element"} onClick={() => setSelectedSensorId(binding?.elementId ?? null)} style={{ position: "absolute", ...element, border: `2px solid ${sensor ? sensorColor : color}`, background: `${sensor ? sensorColor : color}1a`, boxShadow: sensor?.status === "Critical" ? `0 0 28px ${sensorColor}` : sensor?.status === "Watch" ? `0 0 18px ${sensorColor}` : task?.status === "In Progress" ? "0 0 22px #f59e0b" : "none", borderRadius: 18, cursor: sensor ? "pointer" : "default", opacity: task ? 0.9 : 0.1 }} />;
          })}
        </div>
        {focusTarget && (
          <div
            style={{
              position: "absolute",
              left: `${Math.min(85, Math.max(10, 20 + (focusTarget.x / 100) * 56))}%`,
              top: `${Math.min(80, Math.max(12, 18 + (focusTarget.y / 100) * 54))}%`,
              transform: "translate(-50%, -50%)",
              width: 120,
              height: 120,
              borderRadius: "50%",
              border: "1px solid rgba(239,68,68,0.8)",
              background: "rgba(239,68,68,0.12)",
              boxShadow: "0 0 0 12px rgba(239,68,68,0.08), 0 0 40px rgba(239,68,68,0.3)",
              zIndex: 1,
            }}
          />
        )}
        {selectedSensorId && (() => { const binding = sensorBindings.find((item) => item.elementId === selectedSensorId); if (!binding) return null; return <div style={{ position: "absolute", right: 18, top: 18, width: 220, padding: 14, background: "rgba(2,6,23,.94)", border: "1px solid rgba(103,232,249,.35)", borderRadius: 14, zIndex: 2 }}><div style={{ color: "#67e8f9", fontSize: 11, textTransform: "uppercase" }}>{binding.sensor.metric}</div><strong style={{ display: "block", marginTop: 8, fontSize: 22 }}>{binding.sensor.value} {binding.sensor.unit}</strong><div style={{ marginTop: 6, color: "#cbd5e1", fontSize: 12 }}>{binding.sensor.location} · {binding.sensor.status}</div><svg viewBox="0 0 120 40" width="100%" height="40" style={{ marginTop: 10 }}><polyline points={binding.sensor.trend.map((value, index) => `${index * 20},${38 - value / Math.max(...binding.sensor.trend, 1) * 30}`).join(" ")} fill="none" stroke="#67e8f9" strokeWidth="2" /></svg><button type="button" onClick={() => setSelectedSensorId(null)} style={{ marginTop: 8, background: "transparent", border: 0, color: "#94a3b8", cursor: "pointer" }}>Close HUD</button></div>; })()}

        {clashes.map((clash) => {
          const isActive = activeClash?.id === clash.id;
          const color = clash.severity === "Critical" ? "#ef4444" : clash.severity === "Moderate" ? "#f59e0b" : "#60a5fa";
          const left = 12 + ((clash.x % 80) + 8) * 0.9;
          const top = 18 + ((clash.y % 60) + 8) * 1.1;

          return (
            <button
              key={clash.id}
              type="button"
              onClick={() => {
                setSelectedId(clash.id);
                onSelect?.(clash);
              }}
              style={{
                position: "absolute",
                left: `${Math.min(85, Math.max(8, left))}%`,
                top: `${Math.min(80, Math.max(12, top))}%`,
                transform: "translate(-50%, -50%)",
                width: isActive ? 26 : 18,
                height: isActive ? 26 : 18,
                borderRadius: "999px",
                border: `2px solid ${color}`,
                background: color,
                boxShadow: isActive ? `0 0 0 10px ${color}33` : `0 0 0 6px ${color}22`,
                cursor: "pointer",
              }}
              title={`${clash.title} (${clash.severity})`}
            />
          );
        })}
      </div>

      <aside style={{ background: "rgba(15,23,42,0.82)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 20, padding: 18 }}>
        {tasks.length > 0 && showPlaybackControls && <div style={{ marginBottom: 18, borderBottom: "1px solid rgba(148,163,184,0.18)", paddingBottom: 18 }}>
          <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>4D schedule playback</div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontSize: 12 }}><span>{playbackDate}</span><span>{visibleTasks.length}/{tasks.length} active</span></div>
          <input type="range" min={scheduleBounds.start} max={scheduleBounds.finish} value={Math.min(effectivePlaybackTime, scheduleBounds.finish)} onChange={(event) => setPlaybackTime(Number(event.target.value))} aria-label="4D BIM playback date" style={{ width: "100%", marginTop: 12 }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12, fontSize: 11 }}><span style={{ color: "#14b8a6" }}>● Complete</span><span style={{ color: "#facc15" }}>● In Progress</span><span style={{ color: "#ef4444" }}>● Delayed</span></div>
        </div>}
        <div style={{ color: "#7dd3fc", fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase" }}>Clash feed</div>
        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {clashes.map((clash) => (
            <button
              key={clash.id}
              type="button"
              onClick={() => {
                setSelectedId(clash.id);
                onSelect?.(clash);
              }}
              style={{
                width: "100%",
                textAlign: "left",
                borderRadius: 14,
                border: activeClash?.id === clash.id ? "1px solid rgba(125,211,252,0.4)" : "1px solid rgba(148,163,184,0.12)",
                background: activeClash?.id === clash.id ? "rgba(59,130,246,0.08)" : "rgba(15,23,42,0.7)",
                padding: 12,
                color: "#e2e8f0",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                <span style={{ fontWeight: 700 }}>{clash.title}</span>
                <span style={{ fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: clash.severity === "Critical" ? "#fca5a5" : clash.severity === "Moderate" ? "#fbbf24" : "#93c5fd" }}>{clash.severity}</span>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "#cbd5e1" }}>{clash.discipline} • {clash.location ?? "Unassigned"}</div>
            </button>
          ))}
        </div>

        {activeClash && (
          <div style={{ marginTop: 18, borderTop: "1px solid rgba(148,163,184,0.18)", paddingTop: 18 }}>
            <div style={{ color: "#94a3b8", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>Selected clash</div>
            <div style={{ marginTop: 10, fontSize: 18, fontWeight: 700 }}>{activeClash.title}</div>
            <p style={{ margin: "8px 0 0", color: "#cbd5e1", lineHeight: 1.5 }}>{activeClash.description}</p>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>Status: <span style={{ color: "#f8fafc" }}>{activeClash.status}</span></div>
              <div style={{ color: "#94a3b8", fontSize: 12 }}>Coordinates: <span style={{ color: "#f8fafc" }}>{activeClash.x}, {activeClash.y}, {activeClash.z}</span></div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
