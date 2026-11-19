// @refresh reset
"use client";

import React, { useState } from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import {
  GOVERNOR_PROFILES,
  GovernorId,
  CONSTRUCTION_PROFILES,
  ConstructionProfileId,
  QUADMAX_FUNCTION_REGISTRY,
  executeQuadmaxFunction,
  dispatchVanguardGovernorQuery,
  AgentSynthesisResponse,
} from "@/lib/agents/quadillarAgentMesh";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";

export default function QuadmaxMultiProfileConsolePage() {
  const { isLight } = useLiveviewTheme();
  const [selectedAgent, setSelectedAgent] = useState<GovernorId | "ALL">("ALL");
  const [selectedProfileId, setSelectedProfileId] =
    useState<ConstructionProfileId | "ALL">("ALL");
  const [prompt, setPrompt] = useState("");
  const [history, setHistory] = useState<AgentSynthesisResponse[]>(() => [
    executeQuadmaxFunction("pd_executive_pulse"),
  ]);

  const activeProfile =
    selectedProfileId === "ALL"
      ? null
      : CONSTRUCTION_PROFILES.find((p) => p.id === selectedProfileId) || null;

  const filteredFunctions = QUADMAX_FUNCTION_REGISTRY.filter((fn) => {
    const matchesAgent = selectedAgent === "ALL" || fn.governor === selectedAgent;
    const matchesProfile =
      selectedProfileId === "ALL" || fn.profileId === selectedProfileId;
    return matchesAgent && matchesProfile;
  });

  const runFunction = (fnId: string) => {
    const res = executeQuadmaxFunction(fnId);
    setHistory((prev) => [res, ...prev.slice(0, 11)]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    const res = dispatchVanguardGovernorQuery(
      prompt,
      selectedAgent === "ALL" ? undefined : selectedAgent,
      selectedProfileId === "ALL" ? undefined : selectedProfileId
    );
    setHistory((prev) => [res, ...prev.slice(0, 11)]);
    setPrompt("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-5 font-mono">
      {/* Header with All Agents Dropdown */}
      <div className="border-b border-slate-800 pb-4 flex flex-wrap justify-between items-center gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 text-xs font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded">
              QUADMAX.AI • MULTI-AGENT & PROFILE KERNEL
            </span>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded">
              5 GOVERNORS • 7 PROFILES • 21 FUNCTIONS
            </span>
          </div>
          <h1 className="text-xl font-bold text-white mt-1">
            QUADMAX.AI GOVERNANCE & TELEMETRY CONSOLE
          </h1>
          <p className="text-xs text-slate-400">
            {VANGUARD_GENOME.projectName} ({VANGUARD_GENOME.projectId}) • EPC Baseline ₹{VANGUARD_GENOME.financials.epcBaselineCr.toFixed(2)} Cr
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            aria-label="All Agents Filter"
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value as GovernorId | "ALL")}
            style={{
              backgroundColor: isLight ? "#FDFCF9" : "#0F172A",
              color: isLight ? "#1F1E1B" : "#F8FAFC",
              borderColor: isLight ? "#CFC8B8" : "#334155",
            }}
            className="px-3 py-1.5 rounded-lg border font-bold outline-none cursor-pointer"
          >
            <option value="ALL">ALL AGENTS (MINERVA • ARGUS • MIDAS • THEMIS • HERMES)</option>
            {GOVERNOR_PROFILES.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} — {g.domain}
              </option>
            ))}
          </select>

          <a href="/" className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg">
            ← COMMAND CENTER
          </a>
        </div>
      </div>

      {/* 7 Construction Project Profile Cards + All Profiles Reset */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
        <button
          type="button"
          onClick={() => setSelectedProfileId("ALL")}
          className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 ${
            selectedProfileId === "ALL"
              ? "bg-cyan-500/20 border-cyan-400 shadow-md"
              : "bg-slate-900/60 hover:bg-slate-900 border-slate-800"
          }`}
        >
          <span className="text-[10px] font-bold text-cyan-400">ALL ROLES</span>
          <span className="text-xs font-bold text-white leading-snug">All 7 Profiles</span>
          <span className="text-[9px] text-slate-400">Cross-discipline view</span>
        </button>

        {CONSTRUCTION_PROFILES.map((prof) => {
          const isSelected = prof.id === selectedProfileId;
          return (
            <button
              key={prof.id}
              type="button"
              onClick={() => {
                setSelectedProfileId(prof.id);
              }}
              className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 ${
                isSelected
                  ? "bg-cyan-500/20 border-cyan-400 shadow-md"
                  : "bg-slate-900/60 hover:bg-slate-900 border-slate-800"
              }`}
            >
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-cyan-400">{prof.shortCode}</span>
                <span className="text-slate-400">{prof.primaryGovernor}</span>
              </div>
              <div className="text-xs font-bold text-white leading-snug">{prof.title}</div>
              <div className="text-[9px] text-slate-400 line-clamp-2">{prof.authorityScope}</div>
            </button>
          );
        })}
      </div>

      {/* Function Matrix + Execution Stream */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
          <div className="border-b border-slate-800 pb-2 flex justify-between items-center">
            <div>
              <div className="text-[10px] text-cyan-400 font-bold uppercase">
                {selectedAgent === "ALL" ? "ALL 5 AGENTS" : selectedAgent} •{" "}
                {activeProfile ? activeProfile.department : "ALL 7 PROFILES"}
              </div>
              <div className="text-sm font-bold text-white">
                {activeProfile ? activeProfile.title : "Full Project Deterministic Function Registry"}
              </div>
            </div>
            <span className="text-xs font-bold text-emerald-400">
              {filteredFunctions.length} TOOLS
            </span>
          </div>

          <div className="flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1">
            {filteredFunctions.map((fn) => (
              <button
                key={fn.id}
                type="button"
                onClick={() => runFunction(fn.id)}
                className="p-3 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-left transition flex flex-col gap-1"
              >
                <div className="flex justify-between items-center text-[10px]">
                  <span className="font-bold text-cyan-400">{fn.commandLabel}</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] text-emerald-400">
                    {fn.governor}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300">{fn.description}</div>
                <div className="text-[9px] text-slate-400">Ref: {fn.standardRef}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={`Query ${selectedAgent === "ALL" ? "All Agents" : selectedAgent}...`}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-400"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl"
            >
              EXECUTE
            </button>
          </form>
        </div>

        {/* Right: Notarized Deterministic Output Stream */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          {history.map((item, idx) => (
            <div
              key={`${item.functionId}-${item.timestampIso}-${idx}`}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2.5"
            >
              <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800 pb-2 text-[10px]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-bold">
                    {item.profileTitle}
                  </span>
                  <span className="text-emerald-400 font-bold">GOV: {item.primaryGovernor}</span>
                </div>
                <span className="text-slate-400">{item.standardRef}</span>
              </div>

              <div className="text-sm font-bold text-white">{item.headline}</div>
              <div className="text-xs text-slate-300 leading-relaxed">{item.summary}</div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {item.telemetryMetrics.map((m) => (
                  <div
                    key={m.label}
                    className="bg-slate-950/90 border border-slate-800 rounded-xl p-2 flex flex-col"
                  >
                    <span className="text-[9px] text-slate-400 uppercase">{m.label}</span>
                    <span
                      className={`text-xs font-bold mt-0.5 ${
                        m.status === "ACTION"
                          ? "text-rose-400"
                          : m.status === "WATCH"
                          ? "text-amber-400"
                          : "text-emerald-400"
                      }`}
                    >
                      {m.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap justify-between items-center gap-2 pt-1 text-[10px]">
                <span className="text-slate-400">
                  BSA Sec. 63 / Sec. 65B SHA-256: <strong className="text-slate-300">{item.sha256Seal.slice(0, 32)}…</strong>
                </span>
                <a
                  href={item.deepLink.href}
                  className="px-3 py-1 bg-cyan-500 text-slate-950 font-bold rounded-lg"
                >
                  {item.deepLink.label} →
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
