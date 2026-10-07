"use client";

import React, { useMemo, useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  FileCheck2,
  AlertTriangle,
  HelpCircle,
  Clock,
  Layers,
  Send,
  CheckCircle2,
  X,
} from "lucide-react";
import type { CdeItem, RfiRecord } from "@/types/construction";

interface DrawingValidatorProps {
  drawing: CdeItem | null;
}

function formatValue(value: string | undefined, fallback: string) {
  return value && value.trim() ? value : fallback;
}

export function DrawingValidator({ drawing }: DrawingValidatorProps) {
  const [showRfiForm, setShowRfiForm] = useState(false);
  const [discipline, setDiscipline] = useState("Structural");
  const [queryText, setQueryText] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);

  const status = useMemo(() => {
    if (!drawing) {
      return {
        isApproved: false,
        badge: "DRAWING RECORD NOT FOUND IN CDE",
        tone: "red" as const,
      };
    }

    if (drawing.state === "Published" && drawing.isLatest) {
      return {
        isApproved: true,
        badge: "VERIFIED GFC (GOOD FOR CONSTRUCTION • SITE EXECUTION AUTHORIZED)",
        tone: "green" as const,
      };
    }

    return {
      isApproved: false,
      badge: "STOP WORK — SUPERSEDED / UNAPPROVED DRAWING CONTAINER",
      tone: "red" as const,
    };
  }, [drawing]);

  const activeGfc = useMemo(() => {
    if (!drawing) return "N/A";
    return drawing.state === "Published" && drawing.isLatest
      ? `Rev ${drawing.revision}`
      : `Rev ${drawing.revision} (Superseded)`;
  }, [drawing]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Partial<RfiRecord> = {
      id: `rfi-${Date.now()}`,
      title: `Field query on ${drawing?.title ?? "drawing"}`,
      description: queryText || `Request clarification for drawing ${drawing?.id ?? "drawing"}.`,
      submittedBy: "Field Engineer",
      currentOwner: discipline,
      ballInCourt: "Consultant",
      status: "Open",
      contractImpact: "None",
      riskScore: 52,
    };

    setFeedback(`Site query ${payload.id} raised against ${drawing?.title || "Drawing"}. Notified ${discipline} Lead.`);
    setShowRfiForm(false);
    setQueryText("");
    setTimeout(() => setFeedback(null), 4000);
  };

  if (!drawing) {
    return (
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 font-mono text-xs select-none">
        <h2 className="text-sm font-bold text-zinc-100 uppercase mb-2 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Drawing Verification Terminal</span>
        </h2>
        <div className="text-rose-400 font-semibold p-3 bg-rose-950/40 border border-rose-800 rounded">
          No registered drawing found for this identifier in the ISO 19650 container.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-mono text-xs select-none">
      {/* STATUS BANNER */}
      <div
        className={`p-4 rounded-xl border text-center font-bold text-sm tracking-wider flex items-center justify-center gap-2 ${
          status.tone === "green"
            ? "bg-emerald-950/70 border-emerald-700 text-emerald-300 shadow-lg shadow-emerald-950/40"
            : "bg-rose-950/70 border-rose-700 text-rose-300 shadow-lg shadow-rose-950/40"
        }`}
      >
        {status.tone === "green" ? (
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
        ) : (
          <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
        )}
        <span>{status.badge}</span>
      </div>

      {feedback && (
        <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 rounded flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-zinc-500 hover:text-white uppercase text-[10px]">
            Dismiss
          </button>
        </div>
      )}

      {/* METRIC STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Drawing Code</span>
          <span className="text-zinc-100 font-bold mt-1 block truncate text-xs">{drawing.title}</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Authorized Revision</span>
          <span className="text-cyan-400 font-bold mt-1 block text-xs">Rev {drawing.revision}</span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Verification Date</span>
          <span className="text-zinc-300 font-semibold mt-1 block text-xs">
            {new Date(drawing.updatedAt).toLocaleDateString("en-IN")}
          </span>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-3.5 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Trade Discipline</span>
          <span className="text-zinc-200 font-semibold mt-1 block text-xs">
            {formatValue((drawing.metadata as { discipline?: string } | undefined)?.discipline, "General Civil")}
          </span>
        </div>
      </div>

      {/* OPERATIONAL CLEARANCE CALLOUT */}
      <div
        className={`p-4 rounded-xl border ${
          status.tone === "green"
            ? "bg-emerald-950/30 border-emerald-800/80 text-emerald-200"
            : "bg-rose-950/30 border-rose-800/80 text-rose-200"
        }`}
      >
        <div className="font-bold mb-1 flex items-center gap-1.5 text-xs">
          {status.isApproved ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          )}
          <span>{status.isApproved ? "Site Execution Permitted" : "Site Execution Strictly Prohibited"}</span>
        </div>
        <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
          {status.isApproved
            ? `Active GFC revision is ${activeGfc}. Stamp validated per ISO 19650-2 protocols.`
            : `Active GFC revision is ${activeGfc}; this drawing is not cleared for field execution. Procure approved revision before commencing fabrication or shuttering.`}
        </p>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowRfiForm((curr) => !curr)}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold uppercase rounded flex items-center gap-1.5 transition cursor-pointer"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{showRfiForm ? "Collapse Query Form" : "Raise Field Query (RFI) on this Sheet"}</span>
        </button>
      </div>

      {/* RFI SUBMISSION DRAWER */}
      {showRfiForm && (
        <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3.5">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
            <span className="font-bold text-white uppercase text-xs flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-cyan-400" />
              <span>Submit Contemporaneous Field RFI</span>
            </span>
            <button
              type="button"
              onClick={() => setShowRfiForm(false)}
              className="text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase mb-1">Drawing Number</label>
              <input
                value={drawing.id}
                readOnly
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-400 rounded outline-none cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-[10px] text-zinc-400 uppercase mb-1">Target Discipline</label>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-100 rounded outline-none"
              >
                <option value="Structural">Structural</option>
                <option value="MEP">MEP</option>
                <option value="Architectural">Architectural</option>
                <option value="Civil">Civil</option>
                <option value="Facade">Facade</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] text-zinc-400 uppercase mb-1">
              Field Clarification Description *
            </label>
            <textarea
              value={queryText}
              required
              onChange={(e) => setQueryText(e.target.value)}
              rows={4}
              placeholder="Describe reinforcement clash, sleeve alignment deficit, or spatial mismatch..."
              className="w-full bg-zinc-950 border border-zinc-800 p-2.5 text-zinc-100 rounded outline-none text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowRfiForm(false)}
              className="px-3 py-1.5 border border-zinc-800 bg-zinc-950 text-zinc-400 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase rounded flex items-center gap-1.5 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch RFI Ticket</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default DrawingValidator;
