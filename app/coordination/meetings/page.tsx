"use client";

import { useEffect, useState } from "react";
import { createOrUpdateMeetingMinutes, fetchMeetingMinutes } from "@/app/lib/services";
import { MeetingDocument } from "@/components/coordination/MeetingDocument";
import type { MeetingMinutesRecord } from "@/types/construction";

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<MeetingMinutesRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => { void fetchMeetingMinutes("proj-1").then((items) => { setMeetings(items); setSelectedId(items[0]?.id ?? null); }); }, []);
  const createMeeting = async () => { const meeting: MeetingMinutesRecord = { id: `mom-${Date.now()}`, projectId: "proj-1", meetingNumber: `MOM-${String(meetings.length + 43).padStart(3, "0")}`, title: "New coordination meeting", meetingDate: new Date().toISOString(), attendees: [{ id: `att-${Date.now()}`, name: "Current user", role: "Project Manager", present: true }, { id: `att-${Date.now()}-2`, name: "Contractor representative", role: "Contractor", present: false }], agendaNotes: "", actionItems: [], published: false, createdAt: new Date().toISOString() }; const saved = await createOrUpdateMeetingMinutes(meeting); if (saved) { setMeetings((current) => [saved, ...current]); setSelectedId(saved.id); } };
  const selected = meetings.find((item) => item.id === selectedId) ?? null;
  return <main style={{ minHeight: "100vh", background: "#050816", color: "#e2e8f0", padding: 28 }}><div style={{ maxWidth: 1400, margin: "0 auto", display: "grid", gridTemplateColumns: "280px 1fr", gap: 20 }}><aside style={sidebar}><div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>Coordination</div><h1 style={{ margin: "8px 0 18px", fontSize: 28 }}>Meeting Minutes</h1><button type="button" onClick={() => void createMeeting()} style={primary}>+ New MOM</button><div style={{ display: "grid", gap: 8, marginTop: 20 }}>{meetings.map((meeting) => <button type="button" key={meeting.id} onClick={() => setSelectedId(meeting.id)} style={{ ...meetingButton, borderColor: selectedId === meeting.id ? "#38bdf8" : "#1e293b" }}><div style={{ color: "#f8fafc", fontWeight: 700 }}>{meeting.meetingNumber}</div><div style={{ marginTop: 5, color: "#94a3b8", fontSize: 12 }}>{meeting.title}</div><div style={{ marginTop: 6, color: meeting.published ? "#86efac" : "#fde68a", fontSize: 11 }}>{meeting.published ? "Published" : "Draft"}</div></button>)}</div></aside><div>{selected ? <MeetingDocument initialMeeting={selected} onSaved={(updated) => setMeetings((current) => current.map((item) => item.id === updated.id ? updated : item))} /> : <div style={empty}>Select or create a meeting minute document.</div>}</div></div></main>;
}

const sidebar = { background: "#0b1220", border: "1px solid #1e293b", borderRadius: 20, padding: 20, alignSelf: "start" as const };
const primary = { width: "100%", border: 0, borderRadius: 10, background: "#2563eb", color: "#eff6ff", padding: "11px 14px", fontWeight: 700, cursor: "pointer" };
const meetingButton = { width: "100%", textAlign: "left" as const, border: "1px solid", borderRadius: 12, background: "#111827", padding: 12, color: "#e2e8f0", cursor: "pointer" };
const empty = { minHeight: 500, display: "grid", placeItems: "center", background: "#0b1220", border: "1px solid #1e293b", borderRadius: 20, color: "#94a3b8" };
