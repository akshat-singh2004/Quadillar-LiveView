// @refresh reset
"use client";

import React, { useState } from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import {
  dispatchVanguardGovernorQuery,
  AgentSynthesisResponse,
} from "@/lib/agents/quadillarAgentMesh";

export default function QuadmaxKernelFloatingWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AgentSynthesisResponse>(() =>
    dispatchVanguardGovernorQuery("Project Vanguard campus overview", "MINERVA")
  );

  const handleAsk = (qText?: string) => {
    const prompt = (qText ?? query).trim();
    if (!prompt) return;
    setResult(dispatchVanguardGovernorQuery(prompt));
    if (!qText) setQuery("");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 font-mono">
      {isOpen && (
        <div className="mb-2.5 w-80 md:w-96 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-2xl p-4 flex flex-col gap-3 text-xs text-slate-100">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div>
              <div className="font-bold text-cyan-400">QUADMAX.AI • LIVEVIEW OS KERNEL</div>
              <div className="text-[10px] text-slate-400">
                {VANGUARD_GENOME.projectId} • ₹{VANGUARD_GENOME.financials.epcBaselineCr.toFixed(2)} Cr • NBC 2016
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white font-bold px-1.5 py-0.5 rounded bg-slate-900"
            >
              ✕
            </button>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-bold text-emerald-400">GOVERNOR: {result.primaryGovernor}</span>
              <span className="text-slate-400">6 BITS SYNCED</span>
            </div>
            <div className="font-bold text-white text-xs leading-snug">{result.headline}</div>
            <div className="text-[11px] text-slate-300 leading-relaxed">{result.summary}</div>
            <div className="flex gap-1.5 pt-1.5">
              <a
                href={result.deepLink.href}
                className="flex-1 py-1.5 px-2 bg-cyan-500 text-slate-950 font-bold text-[10px] rounded-lg text-center"
              >
                {result.deepLink.label} →
              </a>
              <a
                href="/site/agent-console"
                className="py-1.5 px-2.5 bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-[10px] rounded-lg"
              >
                CONSOLE
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {[
              { label: "Node #14B Snag", q: "Audit BIT-2 Node #14B snag" },
              { label: "Crane 38.5°", q: "Check Liebherr 280 EC-H crane radar" },
              { label: "₹864.50 Cr EPC", q: "Reconcile ₹864.50 Cr baseline and retention" },
              { label: "2,400 TR Plant", q: "Verify Column C2 and 2,400 TR chillers" },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleAsk(chip.q)}
                className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[10px] text-cyan-300"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1.5">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="Ask ARGUS, MIDAS, MINERVA, THEMIS..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white outline-none focus:border-cyan-400"
            />
            <button
              onClick={() => handleAsk()}
              className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] rounded-lg"
            >
              ASK
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-xl border border-cyan-300/40 hover:opacity-95 transition"
      >
        <div className="text-left">
          <div className="text-xs font-bold leading-none">QUADMAX.AI</div>
          <div className="text-[9px] text-cyan-100 mt-0.5">LiveView OS Kernel</div>
        </div>
        <span className="px-1.5 py-0.5 rounded bg-slate-950/60 text-[9px] font-bold text-cyan-300">
          NBC 2016
        </span>
      </button>
    </div>
  );
}
