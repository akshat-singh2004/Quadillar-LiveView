"use client";

import { useMemo, useState } from "react";
import { TBTComposerModal } from "@/components/site/TBTComposerModal";
import type { ToolboxTalkRecord } from "@/types/construction";

const today = new Date();
const initialTalk: ToolboxTalkRecord = { id: "tbt-today", projectId: "proj-1", briefingDate: today.toISOString().slice(0, 10), topic: "Height Safety", checklist: [], attendees: ["R. Kumar", "S. Patil", "M. Das"], loggedAt: today.toISOString() };

export default function TbtPage() {
  const [talks, setTalks] = useState<ToolboxTalkRecord[]>([initialTalk]);
  const [open, setOpen] = useState(false);
  const days = useMemo(() => Array.from({ length: 30 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() - 29 + index); const key = date.toISOString().slice(0, 10); return { key, day: date.getDate(), covered: talks.some((talk) => talk.briefingDate === key) }; }), [talks]);
  return <main style={pageStyle}><div style={{ maxWidth: 1100, margin: "0 auto" }}><header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end", marginBottom: 25 }}><div><div style={eyebrowStyle}>Site / safety culture</div><h1 style={{ margin: "8px 0 0", fontSize: 38 }}>Daily toolbox talk console</h1><p style={mutedStyle}>Run high-risk briefings, capture attendance, and keep the site induction record audit-ready.</p></div><button type="button" onClick={() => setOpen(true)} style={primaryButton}>Log today's TBT</button></header><section style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 18 }}>{[{ label: "Today's status", value: talks.some((talk) => talk.briefingDate === today.toISOString().slice(0, 10)) ? "Conducted" : "Pending" }, { label: "Present headcount", value: talks[0]?.attendees.length ?? 0 }, { label: "30-day coverage", value: `${Math.round((days.filter((day) => day.covered).length / 30) * 100)}%` }].map((item) => <div key={item.label} style={panelStyle}><div style={labelStyle}>{item.label}</div><div style={{ marginTop: 12, fontSize: 26, fontWeight: 900, color: item.value === "Pending" ? "#fbbf24" : "#86efac" }}>{item.value}</div></div>)}</section><section style={panelStyle}><div style={eyebrowStyle}>30-day TBT compliance calendar</div><div style={{ display: "grid", gridTemplateColumns: "repeat(10, 1fr)", gap: 8, marginTop: 16 }}>{days.map((day) => <div key={day.key} title={`${day.key}: ${day.covered ? "covered" : "not logged"}`} style={{ aspectRatio: "1", display: "grid", placeItems: "center", borderRadius: 8, background: day.covered ? "#065f46" : "#1f2937", border: `1px solid ${day.covered ? "#34d399" : "#334155"}`, color: day.covered ? "#d1fae5" : "#64748b", fontSize: 12, fontWeight: 800 }}>{day.day}</div>)}</div><div style={{ marginTop: 15, color: "#94a3b8", fontSize: 12 }}>Emerald dates have a signed briefing record and attendance roster.</div></section><section style={{ ...panelStyle, marginTop: 18 }}><div style={eyebrowStyle}>Recent briefing records</div><div style={{ display: "grid", gap: 9, marginTop: 14 }}>{talks.map((talk) => <div key={talk.id} style={rowStyle}><div><strong>{talk.topic}</strong><div style={mutedSmall}>{talk.briefingDate} · {talk.attendees.length} workers present</div></div><span style={badgeStyle}>Logged</span></div>)}</div></section></div><TBTComposerModal open={open} onClose={() => setOpen(false)} onSaved={(talk) => { setTalks((current) => [talk, ...current]); setOpen(false); }} /></main>;
}
const pageStyle: React.CSSProperties = { minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: "44px 24px" };
const panelStyle: React.CSSProperties = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 15, padding: 20 };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700 };
const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 11, letterSpacing: ".1em", textTransform: "uppercase" };
const mutedStyle: React.CSSProperties = { color: "#94a3b8", margin: "9px 0 0", maxWidth: 680 };
const mutedSmall: React.CSSProperties = { color: "#94a3b8", fontSize: 12, marginTop: 5 };
const rowStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", padding: 13, background: "#111827", border: "1px solid #1f2937", borderRadius: 10 };
const badgeStyle: React.CSSProperties = { color: "#86efac", background: "#052e2b", border: "1px solid #10b981", borderRadius: 999, padding: "5px 9px", fontSize: 11, fontWeight: 800 };
const primaryButton: React.CSSProperties = { background: "#f59e0b", color: "#111827", border: 0, borderRadius: 8, padding: "11px 14px", fontWeight: 900, cursor: "pointer" };
