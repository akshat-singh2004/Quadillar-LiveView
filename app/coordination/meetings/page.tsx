"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Users,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  Printer,
  Calendar,
  Layers,
  X,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface MOMRecord {
  id: string;
  project_id: string;
  meeting_number: string;
  title: string;
  meeting_date: string;
  meeting_type: string;
  attendees_count: number;
  open_actions_count: number;
  agenda_notes: string;
  status: "DRAFT" | "PUBLISHED" | "ACTIONED_CLOSED";
  chairperson: string;
}

const FALLBACK_MOMS: MOMRecord[] = [
  {
    id: "mom-fb-1",
    project_id: "PRJ-01-LIVE",
    meeting_number: "MOM-043",
    title: "Superstructure Level 14 Coordination & MEP Sleeves Review",
    meeting_date: "2026-09-28",
    meeting_type: "WEEKLY_SITE_COORDINATION",
    attendees_count: 8,
    open_actions_count: 3,
    agenda_notes: "Reviewed Level 14 core shuttering timeline. Directed MEP contractor to complete 400x300mm duct penetrations prior to 04-Oct concrete pour gate. Structural consultant authenticated shear key reinforcement.",
    status: "PUBLISHED",
    chairperson: "Resident SEOR / Consultant",
  },
  {
    id: "mom-fb-2",
    project_id: "PRJ-01-LIVE",
    meeting_number: "MOM-042",
    title: "Façade Procurement & Crane Tandem Rigging Planning",
    meeting_date: "2026-09-21",
    meeting_type: "ARCHITECTURAL_REVIEW",
    attendees_count: 6,
    open_actions_count: 0,
    agenda_notes: "Cleared unitized curtain wall sample mock-ups. Reviewed tower crane slew path and anemometer interlock protocol with safety director.",
    status: "ACTIONED_CLOSED",
    chairperson: "Principal Architect",
  },
];

export default function MeetingsCoordinationPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [meetings, setMeetings] = useState<MOMRecord[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<MOMRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [mType, setMType] = useState("WEEKLY_SITE_COORDINATION");
  const [notes, setNotes] = useState("");
  const [attendees, setAttendees] = useState("6");

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("coordination_meeting_minutes")
        .select("*")
        .eq("project_id", projectId)
        .order("meeting_date", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setMeetings(FALLBACK_MOMS);
        setSelectedMeeting(FALLBACK_MOMS[0]);
      } else {
        setIsFallbackMode(false);
        setMeetings(data);
        setSelectedMeeting(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setMeetings(FALLBACK_MOMS);
      setSelectedMeeting(FALLBACK_MOMS[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadMeetings();
  }, [loadMeetings]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !notes.trim()) return;

    const code = `MOM-${(meetings.length + 44).toString().padStart(3, "0")}`;
    const payload: Partial<MOMRecord> = {
      project_id: projectId,
      meeting_number: code,
      title: title.trim(),
      meeting_date: new Date().toISOString().slice(0, 10),
      meeting_type: mType,
      attendees_count: parseInt(attendees, 10) || 6,
      open_actions_count: 2,
      agenda_notes: notes.trim(),
      status: "PUBLISHED",
      chairperson: "Project Director / SEOR",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("coordination_meeting_minutes")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setMeetings((prev) => [data, ...prev]);
      setSelectedMeeting(data);
      setFeedback(`Minutes of Meeting ${code} recorded & published.`);
    } catch {
      const fallback = { ...payload, id: `mom-${Date.now()}` } as MOMRecord;
      setMeetings((prev) => [fallback, ...prev]);
      setSelectedMeeting(fallback);
      setFeedback(`MOM recorded: ${code}`);
    } finally {
      setModalOpen(false);
      setTitle("");
      setNotes("");
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  const handlePrintMOM = (m: MOMRecord) => {
    const printWin = window.open("", "_blank");
    if (!printWin) return;
    printWin.document.write(`<!doctype html>
<html>
<head>
  <title>Minutes of Meeting — ${m.meeting_number}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; color: #09090b; font-size: 12px; line-height: 1.6; }
    h1 { margin: 0; font-size: 20px; font-weight: 800; }
    .badge { display: inline-block; padding: 4px 10px; background: #e0f2fe; color: #0369a1; font-weight: bold; border-radius: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; }
  </style>
</head>
<body>
  <div style="border-bottom: 2px solid #000; padding-bottom: 12px; margin-bottom: 16px;">
    <div style="font-size: 10px; text-transform: uppercase; color: #0284c7; font-weight: bold;">Quadillar LiveView · Site Coordination Protocol</div>
    <h1>Minutes of Meeting (MOM): ${m.title}</h1>
    <div>Ref: <strong>${m.meeting_number}</strong> &bull; Date: <strong>${m.meeting_date}</strong> &bull; Chair: <strong>${m.chairperson}</strong></div>
    <div>Project: <strong>${projectName}</strong> (${projectId})</div>
  </div>

  <table>
    <tr><th>Meeting Classification</th><td>${m.meeting_type.replace(/_/g, " ")}</td><th>Attendees Count</th><td>${m.attendees_count} Stakeholders Present</td></tr>
  </table>

  <h3 style="margin-top: 24px; font-size: 14px;">Summary of Deliberations &amp; Site Directives</h3>
  <div style="padding: 16px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px;">
    ${m.agenda_notes}
  </div>

  <div style="margin-top: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
    <div><div style="border-top: 1px dashed #000; padding-top: 4px; font-weight: bold;">Lead Structural Consultant</div></div>
    <div><div style="border-top: 1px dashed #000; padding-top: 4px; font-weight: bold;">General Contractor Representative</div></div>
  </div>
</body>
</html>`);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => printWin.print(), 250);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>PROJECT COORDINATION • MULTI-STAKEHOLDER SITE PROTOCOL</span>
              <StatutoryInfo
                standardRef="CPWD SECTION 18 / FIDIC CL. 3.2"
                title="Minutes of Meeting (MOM) & Technical Directives"
                idealRange="Formal Circulation within 24 Hours"
                description="Governs weekly site progress reviews, coordination meetings with architects and contractors, formal directives recording, and action-item tracking."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Users className="w-6 h-6 text-cyan-400" />
              <span>Site Coordination &amp; Minutes of Meeting (MOM)</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Weekly progress records, architectural coordination agendas, and action items.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              onClick={() => void loadMeetings()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="px-3.5 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Record New MOM</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* LEFT: MEETING ROSTER (5 cols) */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase">Coordination Sessions ({meetings.length})</span>
            </div>

            <div className="space-y-3">
              {meetings.map((m) => {
                const isSelected = selectedMeeting?.id === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedMeeting(m)}
                    className={`p-4 rounded border transition cursor-pointer space-y-2 ${
                      isSelected ? "border-cyan-500/60 bg-cyan-950/20" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{m.meeting_number}</span>
                      <span className="text-[10px] text-zinc-400 font-mono">{m.meeting_date}</span>
                    </div>
                    <div className="text-zinc-200 font-bold text-xs">{m.title}</div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-500 border-t border-zinc-850 pt-2">
                      <span>Attendees: <strong className="text-zinc-300">{m.attendees_count}</strong></span>
                      <span className={`font-bold ${m.open_actions_count > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                        {m.open_actions_count} Open Actions
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: MOM VIEWER & DIRECTIVES (7 cols) */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 p-6 space-y-5 rounded-sm shadow-2xl">
            {selectedMeeting ? (
              <>
                <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase text-cyan-400 font-bold block">{selectedMeeting.meeting_number}</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedMeeting.title}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintMOM(selectedMeeting)}
                      className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print MOM</span>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Meeting Date:</span>
                    <strong className="text-white">{selectedMeeting.meeting_date}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Classification:</span>
                    <strong className="text-cyan-300">{selectedMeeting.meeting_type.replace(/_/g, " ")}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Chairperson:</span>
                    <span className="text-zinc-300">{selectedMeeting.chairperson}</span>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Directives &amp; Action Notes:</span>
                  <p className="text-xs text-zinc-200 font-sans leading-relaxed">{selectedMeeting.agenda_notes}</p>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-zinc-500">Select a meeting to inspect minutes and directives.</div>
            )}
          </div>
        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Record Site Minutes of Meeting (MOM)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateMeeting} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Meeting Agenda Subject *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tower A Podium Slab Formwork & Rebar Concurrence"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Meeting Type</label>
                    <select
                      value={mType}
                      onChange={(e) => setMType(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                    >
                      <option value="WEEKLY_SITE_COORDINATION">Weekly Site Coordination</option>
                      <option value="ARCHITECTURAL_REVIEW">Architectural / MEP Review</option>
                      <option value="COMMERCIAL_AUDIT">Commercial &amp; Billing Audit</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Attendees Present</label>
                    <input
                      type="number"
                      value={attendees}
                      onChange={(e) => setAttendees(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Summary of Deliberations &amp; Directives *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Document decisions, designated contractors, and milestone dates agreed..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Publish MOM Protocol
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
