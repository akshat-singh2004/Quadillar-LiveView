"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  Calendar,
  Users,
  HardHat,
  ArrowRight,
  Printer,
  X,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface TBTRecord {
  id: string;
  project_id: string;
  talk_code: string;
  briefing_date: string;
  topic: string;
  trade_classification: string;
  conductor_name: string;
  attendees_count: number;
  key_hazards_briefed: string;
  status: "CONDUCTED_SIGNED" | "SCHEDULED_PENDING";
}

const FALLBACK_TBTS: TBTRecord[] = [
  {
    id: "tbt-fb-1",
    project_id: "PRJ-01-LIVE",
    talk_code: "TBT-2026-0929",
    briefing_date: new Date().toISOString().slice(0, 10),
    topic: "Fall Protection & Double-Lanyard Anchor Protocol",
    trade_classification: "BAR_BENDER & SCAFFOLDER",
    conductor_name: "Chief HSE Officer",
    attendees_count: 48,
    key_hazards_briefed: "Mandatory 100% tie-off on perimeter lifelines above 2.0m. Daily harness webbing and carabiner latch inspection.",
    status: "CONDUCTED_SIGNED",
  },
  {
    id: "tbt-fb-2",
    project_id: "PRJ-01-LIVE",
    talk_code: "TBT-2026-0928",
    briefing_date: "2026-09-28",
    topic: "Hot Work Flashback Arrestor & Spark Containment",
    trade_classification: "MEP & PIPING",
    conductor_name: "Senior Safety Inspector",
    attendees_count: 26,
    key_hazards_briefed: "Dual flashback arrestors on oxygen-acetylene regulators and torches. Fire blanket shielding around combustible risers.",
    status: "CONDUCTED_SIGNED",
  },
];

export default function ToolboxTalkPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [talks, setTalks] = useState<TBTRecord[]>([]);
  const [selectedTbt, setSelectedTbt] = useState<TBTRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Form State
  const [topic, setTopic] = useState("");
  const [trade, setTrade] = useState("ALL_TRADES");
  const [attendees, setAttendees] = useState("35");
  const [hazards, setHazards] = useState("");

  const loadTalks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("site_toolbox_talks")
        .select("*")
        .eq("project_id", projectId)
        .order("briefing_date", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setTalks(FALLBACK_TBTS);
        setSelectedTbt(FALLBACK_TBTS[0]);
      } else {
        setIsFallbackMode(false);
        setTalks(data);
        setSelectedTbt(data[0]);
      }
    } catch {
      setIsFallbackMode(true);
      setTalks(FALLBACK_TBTS);
      setSelectedTbt(FALLBACK_TBTS[0]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadTalks();
  }, [loadTalks]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const isConductedToday = useMemo(() => {
    return talks.some((t) => t.briefing_date === todayStr);
  }, [talks, todayStr]);

  // 30-Day compliance calendar days
  const calendarDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 30 }, (_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - 29 + idx);
      const iso = d.toISOString().slice(0, 10);
      const covered = talks.some((t) => t.briefing_date === iso);
      return { iso, day: d.getDate(), covered };
    });
  }, [talks]);

  const coveragePct = useMemo(() => {
    const coveredCount = calendarDays.filter((d) => d.covered).length;
    return Math.round((coveredCount / 30) * 100);
  }, [calendarDays]);

  const handleCreateTbt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() || !hazards.trim()) return;

    const code = `TBT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`;
    const payload: Partial<TBTRecord> = {
      project_id: projectId,
      talk_code: code,
      briefing_date: todayStr,
      topic: topic.trim(),
      trade_classification: trade,
      conductor_name: "Chief HSE Officer",
      attendees_count: parseInt(attendees, 10) || 12,
      key_hazards_briefed: hazards.trim(),
      status: "CONDUCTED_SIGNED",
    };

    try {
      const { data, error } = await (supabase as any)
        .from("site_toolbox_talks")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      setTalks((prev) => [data, ...prev]);
      setSelectedTbt(data);
      setFeedback(`Toolbox Talk ${code} recorded.`);
    } catch {
      const fallback = { ...payload, id: `tbt-${Date.now()}` } as TBTRecord;
      setTalks((prev) => [fallback, ...prev]);
      setSelectedTbt(fallback);
      setFeedback(`Optimistic TBT logged: ${code}`);
    } finally {
      setModalOpen(false);
      setTopic("");
      setHazards("");
      setTimeout(() => setFeedback(null), 3500);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>SAFETY CULTURE &bull; BOCW CENTRAL RULES 1998 / CPWD SECTION 18 TBT PROTOCOL</span>
              <StatutoryInfo
                standardRef="BOCW RULES 1998 / CPWD SEC. 18"
                title="Daily Toolbox Talk (TBT) & Induction Record"
                idealRange="Daily Mandatory Pre-Shift Briefing"
                description="Governs morning task-specific hazard briefings for high-risk operations: Work at Height, Electrical LOTO, Deep Trench Shoring, and Crane Slew zones. Mandates attendance logs."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <HardHat className="w-6 h-6 text-cyan-400" />
              <span>Daily Toolbox Talk (TBT) &amp; Hazard Briefing Console</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Task hazard identification, shift safety inductions, and 30-day compliance tracking.
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
              onClick={() => void loadTalks()}
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
              <span>Log Today&apos;s TBT</span>
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 4 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Today&apos;s Induction Status</span>
            <div className={`text-2xl font-bold mt-1 ${isConductedToday ? "text-emerald-400" : "text-amber-400"}`}>
              {isConductedToday ? "Conducted & Signed" : "Briefing Pending"}
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">{todayStr} shift kickoff</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">30-Day TBT Compliance</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{coveragePct}% Coverage</div>
            <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden mt-2">
              <div className="bg-cyan-400 h-full rounded-full" style={{ width: `${coveragePct}%` }} />
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Latest Briefing Headcount</span>
            <div className="text-2xl font-bold text-white mt-1">{talks[0]?.attendees_count || 0} Workers</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Signed attendance sheet</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Conductor</span>
            <div className="text-2xl font-bold text-zinc-200 mt-1 truncate">{talks[0]?.conductor_name || "HSE Lead"}</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Certified safety induction lead</span>
          </div>
        </div>

        {/* 30-DAY COMPLIANCE HEATMAP */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-3 rounded-sm">
          <div className="flex justify-between items-center">
            <span className="font-bold text-white uppercase text-xs">30-Day Pre-Shift TBT Compliance Calendar</span>
            <span className="text-[10px] text-zinc-400">Emerald blocks signify verified daily briefing records</span>
          </div>

          <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-1.5">
            {calendarDays.map((d) => (
              <div
                key={d.iso}
                title={`${d.iso}: ${d.covered ? "Conducted & Signed" : "No TBT Logged"}`}
                className={`h-9 rounded flex flex-col items-center justify-center font-bold text-xs border transition ${
                  d.covered
                    ? "bg-emerald-950/80 border-emerald-800 text-emerald-300"
                    : "bg-zinc-950 border-zinc-850 text-zinc-600"
                }`}
              >
                <span>{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* TBT LOGS LIST (6 cols) */}
          <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
              Recent Daily Briefings ({talks.length})
            </span>

            <div className="space-y-3">
              {talks.map((t) => {
                const isSelected = selectedTbt?.id === t.id;
                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTbt(t)}
                    className={`p-4 rounded border transition cursor-pointer space-y-2 ${
                      isSelected ? "border-cyan-500/60 bg-cyan-950/20" : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white text-xs">{t.talk_code}</span>
                      <span className="text-[10px] text-cyan-400 font-mono">{t.briefing_date}</span>
                    </div>

                    <div className="text-zinc-200 font-bold text-xs">{t.topic}</div>
                    <div className="flex justify-between text-[10px] text-zinc-500 border-t border-zinc-850 pt-2 font-mono">
                      <span>Trade: <strong className="text-zinc-300">{t.trade_classification}</strong></span>
                      <span>Attendees: <strong className="text-white">{t.attendees_count} Present</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* DETAIL VIEW (6 cols) */}
          <div className="lg:col-span-6 bg-zinc-900/40 border border-zinc-800 p-6 space-y-5 rounded-sm shadow-2xl">
            {selectedTbt ? (
              <>
                <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] uppercase text-cyan-400 font-bold">{selectedTbt.talk_code}</span>
                    <h3 className="text-sm font-bold text-white mt-0.5">{selectedTbt.topic}</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {selectedTbt.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Briefing Date:</span>
                    <strong className="text-white font-mono">{selectedTbt.briefing_date}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Target Trades:</span>
                    <span className="text-cyan-300 font-bold">{selectedTbt.trade_classification}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">HSE Officer:</span>
                    <span className="text-zinc-300">{selectedTbt.conductor_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Verified Attendees:</span>
                    <strong className="text-emerald-400 font-mono">{selectedTbt.attendees_count} Personnel Signed</strong>
                  </div>
                </div>

                <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-2">
                  <span className="text-[10px] text-zinc-500 uppercase font-bold block">Key Hazards &amp; Precautionary Controls Briefed:</span>
                  <p className="text-xs text-zinc-200 font-sans leading-relaxed">{selectedTbt.key_hazards_briefed}</p>
                </div>
              </>
            ) : (
              <div className="p-16 text-center text-zinc-500">Select a briefing record to inspect hazard items.</div>
            )}
          </div>

        </div>

        {/* MODAL */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-lg p-6 space-y-4 shadow-2xl">
              <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
                <span className="font-bold text-white uppercase text-xs">Log Daily Toolbox Talk (TBT)</span>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateTbt} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Briefing Topic *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scaffolding Inspection & Toe-Board Verification"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Trade Classification</label>
                    <select
                      value={trade}
                      onChange={(e) => setTrade(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white"
                    >
                      <option value="ALL_TRADES">All Site Trades</option>
                      <option value="BAR_BENDER & SCAFFOLDER">Bar Benders &amp; Scaffolders</option>
                      <option value="MEP & PIPING">MEP, Electrical &amp; Piping</option>
                      <option value="CONCRETE_OPERATORS">Concrete Pour Crew &amp; Pump Operators</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 block mb-1">Attendees Present *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={attendees}
                      onChange={(e) => setAttendees(e.target.value)}
                      className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Key Hazards &amp; Specific Precautions *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Detail the primary risk factors, PPE mandates, and safety controls briefed..."
                    value={hazards}
                    onChange={(e) => setHazards(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                  <button type="button" onClick={() => setModalOpen(false)} className="px-3.5 py-1.5 bg-zinc-900 text-zinc-400 rounded">Cancel</button>
                  <button type="submit" className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded">
                    Commit TBT Induction
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
