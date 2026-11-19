#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# 1. RESTORE ANY ACCIDENTALLY STUBBED NAVIGATION/HEADER FILES FROM GIT
# ==============================================================================
node - << 'NODE_EOF'
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", ".next", ".git"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(tsx|ts|jsx|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const toRestore = walk(".").filter((f) => {
  const base = path.basename(f);
  if (base.startsWith("QuadMaxOverlay") || base.startsWith("QuadmaxKernelFloatingWidget")) {
    return false;
  }
  const src = fs.readFileSync(f, "utf8");
  return (
    src.includes("LegacyQuadmaxFloatingStub") ||
    (src.includes('export { default } from "@/components/QuadmaxKernelFloatingWidget"') &&
      src.split(/\r?\n/).length <= 5)
  );
});

if (toRestore.length > 0) {
  execFileSync("git", ["checkout", "--", ...toRestore], { stdio: "inherit" });
  console.log("✓ Restored original layout/header files:", toRestore.join(", "));
} else {
  console.log("✓ No external header/sidebar files were stubbed.");
}
NODE_EOF

# ==============================================================================
# 2. ADD GOVERNOR_PROFILES METADATA TO lib/agents/quadillarAgentMesh.ts
# ==============================================================================
node - << 'NODE_EOF'
const fs = require("fs");
const meshPath = "lib/agents/quadillarAgentMesh.ts";
let src = fs.readFileSync(meshPath, "utf8");

if (!src.includes("GOVERNOR_PROFILES")) {
  const governorBlock = `
export interface GovernorMeta {
  id: GovernorId;
  name: string;
  domain: string;
  badge: string;
}

export const GOVERNOR_PROFILES: GovernorMeta[] = [
  { id: "MINERVA", name: "MINERVA", domain: "BIM, Spatial & Master CPM", badge: "LOD-400 / CPM" },
  { id: "ARGUS", name: "ARGUS", domain: "Site Telemetry, NDT, LiDAR & HSE", badge: "IS-Code / PTW" },
  { id: "MIDAS", name: "MIDAS", domain: "Commercial, RA Billing & Clause 42", badge: "₹864.50 Cr / EVM" },
  { id: "THEMIS", name: "THEMIS", domain: "SCL Delay Protocol & UP-LDA Escrow", badge: "EOT / Escrow" },
  { id: "HERMES", name: "HERMES", domain: "BSA Sec. 63 / Sec. 65B Merkle Vault", badge: "Block #18402" },
];
`;
  src = src.replace(
    "export const CONSTRUCTION_PROFILES:",
    governorBlock + "\nexport const CONSTRUCTION_PROFILES:"
  );
  fs.writeFileSync(meshPath, src, "utf8");
  console.log("✓ Added GOVERNOR_PROFILES registry to lib/agents/quadillarAgentMesh.ts");
}
NODE_EOF

# ==============================================================================
# 3. UPGRADE MOVABLE QUADMAX.AI DRAWER WITH "ALL AGENTS" + "ALL ROLES" DROPDOWNS
# ==============================================================================
cat << 'WIDGET_EOF' > components/QuadmaxKernelFloatingWidget.tsx
// @refresh reset
"use client";

import React, { useState, useEffect, useRef } from "react";
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

const POS_STORAGE_KEY = "quadmax-draggable-pill-pos-v2";
const PROFILE_STORAGE_KEY = "quadmax-active-profile-v2";
const AGENT_STORAGE_KEY = "quadmax-active-agent-v1";
const PILL_WIDTH = 172;
const PILL_HEIGHT = 34;

export default function QuadmaxKernelFloatingWidget() {
  const { isLight } = useLiveviewTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<GovernorId | "ALL">("ALL");
  const [activeProfileId, setActiveProfileId] =
    useState<ConstructionProfileId | "ALL">("ALL");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AgentSynthesisResponse>(() =>
    executeQuadmaxFunction("pd_executive_pulse")
  );

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const savedAgent = localStorage.getItem(AGENT_STORAGE_KEY) as GovernorId | "ALL" | null;
      if (savedAgent === "ALL" || GOVERNOR_PROFILES.some((g) => g.id === savedAgent)) {
        setSelectedAgent(savedAgent);
      }
      const savedProfile = localStorage.getItem(PROFILE_STORAGE_KEY) as
        | ConstructionProfileId
        | "ALL"
        | null;
      if (
        savedProfile === "ALL" ||
        CONSTRUCTION_PROFILES.some((p) => p.id === savedProfile)
      ) {
        setActiveProfileId(savedProfile);
      }
    } catch {}

    const clampPos = (rawX: number, rawY: number) => {
      const maxX = Math.max(12, window.innerWidth - PILL_WIDTH - 12);
      const maxY = Math.max(12, window.innerHeight - PILL_HEIGHT - 12);
      return {
        x: Math.min(Math.max(12, rawX), maxX),
        y: Math.min(Math.max(12, rawY), maxY),
      };
    };

    try {
      const saved = localStorage.getItem(POS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          setPos(clampPos(parsed.x, parsed.y));
          return;
        }
      }
    } catch {}

    setPos(clampPos(window.innerWidth - PILL_WIDTH - 16, window.innerHeight - PILL_HEIGHT - 16));

    const handleResize = () => {
      setPos((prev) => (prev ? clampPos(prev.x, prev.y) : prev));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filteredFunctions = QUADMAX_FUNCTION_REGISTRY.filter((fn) => {
    const matchesAgent = selectedAgent === "ALL" || fn.governor === selectedAgent;
    const matchesProfile = activeProfileId === "ALL" || fn.profileId === activeProfileId;
    return matchesAgent && matchesProfile;
  });

  const handleAgentDropdownChange = (nextAgent: GovernorId | "ALL") => {
    setSelectedAgent(nextAgent);
    try {
      localStorage.setItem(AGENT_STORAGE_KEY, nextAgent);
    } catch {}

    const nextPool = QUADMAX_FUNCTION_REGISTRY.filter(
      (fn) =>
        (nextAgent === "ALL" || fn.governor === nextAgent) &&
        (activeProfileId === "ALL" || fn.profileId === activeProfileId)
    );
    if (nextPool.length > 0) {
      setResult(executeQuadmaxFunction(nextPool[0].id));
    } else if (nextAgent !== "ALL") {
      const fallbackPool = QUADMAX_FUNCTION_REGISTRY.filter((fn) => fn.governor === nextAgent);
      if (fallbackPool.length > 0) {
        setActiveProfileId("ALL");
        setResult(executeQuadmaxFunction(fallbackPool[0].id));
      }
    }
  };

  const handleSelectProfile = (profileId: ConstructionProfileId | "ALL") => {
    setActiveProfileId(profileId);
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, profileId);
    } catch {}

    const nextPool = QUADMAX_FUNCTION_REGISTRY.filter(
      (fn) =>
        (selectedAgent === "ALL" || fn.governor === selectedAgent) &&
        (profileId === "ALL" || fn.profileId === profileId)
    );
    if (nextPool.length > 0) {
      setResult(executeQuadmaxFunction(nextPool[0].id));
    } else if (profileId !== "ALL") {
      const profilePool = QUADMAX_FUNCTION_REGISTRY.filter((fn) => fn.profileId === profileId);
      if (profilePool.length > 0) {
        setSelectedAgent("ALL");
        setResult(executeQuadmaxFunction(profilePool[0].id));
      }
    }
  };

  const handleRunFunction = (fnId: string) => {
    const res = executeQuadmaxFunction(fnId);
    setResult(res);
  };

  const handleAsk = (qText?: string) => {
    const prompt = (qText ?? query).trim();
    if (!prompt) return;
    const res = dispatchVanguardGovernorQuery(
      prompt,
      selectedAgent === "ALL" ? undefined : selectedAgent,
      activeProfileId === "ALL" ? undefined : activeProfileId
    );
    setResult(res);
    if (!qText) setQuery("");
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: pos.x,
      originY: pos.y,
      moved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragState.current;
    if (!ds || ds.pointerId !== e.pointerId) return;
    const dx = e.clientX - ds.startX;
    const dy = e.clientY - ds.startY;
    if (Math.hypot(dx, dy) > 4) {
      ds.moved = true;
    }
    const maxX = Math.max(12, window.innerWidth - PILL_WIDTH - 12);
    const maxY = Math.max(12, window.innerHeight - PILL_HEIGHT - 12);
    setPos({
      x: Math.min(Math.max(12, ds.originX + dx), maxX),
      y: Math.min(Math.max(12, ds.originY + dy), maxY),
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const ds = dragState.current;
    if (!ds || ds.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);

    if (ds.moved && pos) {
      try {
        localStorage.setItem(POS_STORAGE_KEY, JSON.stringify(pos));
      } catch {}
    } else {
      setIsOpen((prev) => !prev);
    }
    dragState.current = null;
  };

  if (!pos) return null;

  const activeProfile =
    activeProfileId === "ALL"
      ? null
      : CONSTRUCTION_PROFILES.find((p) => p.id === activeProfileId) || null;

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const openUpward = pos.y > viewportH * 0.52;
  const alignRight = pos.x + PILL_WIDTH / 2 > viewportW * 0.5;

  return (
    <div
      style={{
        position: "fixed",
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        zIndex: 60,
        touchAction: "none",
      }}
      className="font-mono select-none"
    >
      {/* Multi-Agent & Multi-Profile Kernel Drawer */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            ...(openUpward ? { bottom: `${PILL_HEIGHT + 8}px` } : { top: `${PILL_HEIGHT + 8}px` }),
            ...(alignRight ? { right: 0 } : { left: 0 }),
          }}
          className="w-[400px] max-w-[94vw] bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2.5 text-xs text-slate-100 select-text"
        >
          {/* Top Header */}
          <div className="flex justify-between items-start border-b border-slate-800 pb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-cyan-400 text-[11px]">QUADMAX.AI</span>
                <span className="px-1.5 py-0.2 bg-emerald-500/20 border border-emerald-500/40 rounded text-[9px] text-emerald-400 font-bold">
                  5 AGENTS • 7 PROFILES
                </span>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                {VANGUARD_GENOME.projectId} • ₹{VANGUARD_GENOME.financials.epcBaselineCr.toFixed(2)} Cr
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white font-bold px-2 py-0.5 rounded bg-slate-900 text-[10px]"
            >
              ✕
            </button>
          </div>

          {/* Dual Dropdown Bar: ALL AGENTS Dropdown + PROFILE Dropdown */}
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex flex-col gap-0.5">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase">
                AGENT GOVERNOR
              </label>
              <select
                aria-label="All Agents Dropdown"
                value={selectedAgent}
                onChange={(e) =>
                  handleAgentDropdownChange(e.target.value as GovernorId | "ALL")
                }
                style={{
                  backgroundColor: isLight ? "#EFECE4" : "#0F172A",
                  color: isLight ? "#1F1E1B" : "#F8FAFC",
                  borderColor: isLight ? "#CFC8B8" : "#334155",
                }}
                className="w-full rounded-lg border px-2 py-1 text-[10px] font-bold outline-none cursor-pointer"
              >
                <option value="ALL">ALL AGENTS (5)</option>
                {GOVERNOR_PROFILES.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} • {g.badge}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[8.5px] text-slate-400 font-bold uppercase">
                STAKEHOLDER PROFILE
              </label>
              <select
                aria-label="Project Profile Dropdown"
                value={activeProfileId}
                onChange={(e) =>
                  handleSelectProfile(e.target.value as ConstructionProfileId | "ALL")
                }
                style={{
                  backgroundColor: isLight ? "#EFECE4" : "#0F172A",
                  color: isLight ? "#1F1E1B" : "#F8FAFC",
                  borderColor: isLight ? "#CFC8B8" : "#334155",
                }}
                className="w-full rounded-lg border px-2 py-1 text-[10px] font-bold outline-none cursor-pointer"
              >
                <option value="ALL">ALL PROFILES (7)</option>
                {CONSTRUCTION_PROFILES.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.shortCode} • {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Role Chips */}
          <div className="grid grid-cols-4 gap-1">
            <button
              type="button"
              onClick={() => handleSelectProfile("ALL")}
              className={`px-1.5 py-1 rounded-lg border text-[9px] font-bold truncate transition ${
                activeProfileId === "ALL"
                  ? "bg-cyan-500 text-slate-950 border-cyan-400"
                  : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
              }`}
            >
              ALL ROLES
            </button>
            {CONSTRUCTION_PROFILES.map((prof) => {
              const selected = prof.id === activeProfileId;
              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => handleSelectProfile(prof.id)}
                  title={`${prof.title} — ${prof.authorityScope}`}
                  className={`px-1.5 py-1 rounded-lg border text-[9px] font-bold truncate transition ${
                    selected
                      ? "bg-cyan-500 text-slate-950 border-cyan-400"
                      : "bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300"
                  }`}
                >
                  {prof.shortCode}
                </button>
              );
            })}
          </div>

          {/* Filtered Deterministic Function Triggers */}
          <div className="flex flex-col gap-1">
            <div className="flex justify-between items-center text-[9px] text-slate-400 uppercase">
              <span>
                {selectedAgent === "ALL" ? "ALL AGENTS" : selectedAgent} •{" "}
                {activeProfile ? activeProfile.shortCode : "ALL PROFILES"}
              </span>
              <span>{filteredFunctions.length} TOOLS</span>
            </div>
            <div className="grid grid-cols-3 gap-1 max-h-24 overflow-y-auto pr-0.5">
              {filteredFunctions.map((fn) => {
                const isCurrent = result.functionId === fn.id;
                return (
                  <button
                    key={fn.id}
                    type="button"
                    onClick={() => handleRunFunction(fn.id)}
                    className={`p-1.5 rounded-lg border text-left transition flex flex-col gap-0.5 ${
                      isCurrent
                        ? "bg-cyan-500/20 border-cyan-400 text-white"
                        : "bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300"
                    }`}
                  >
                    <span className="text-[9px] font-bold text-cyan-400 truncate">
                      {fn.shortLabel}
                    </span>
                    <span className="text-[8px] text-slate-400 truncate">{fn.governor}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Deterministic Synthesis & Telemetry Matrix */}
          <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-2">
            <div className="flex justify-between items-center text-[9px]">
              <span className="font-bold text-emerald-400">
                GOV: {result.primaryGovernor} • {result.complianceStatus.replace("_", " ")}
              </span>
              <span className="text-slate-400 truncate max-w-[165px]">{result.standardRef}</span>
            </div>

            <div className="font-bold text-white text-[11px] leading-snug">{result.headline}</div>
            <div className="text-[10px] text-slate-300 leading-relaxed">{result.summary}</div>

            <div className="grid grid-cols-2 gap-1.5 pt-0.5">
              {result.telemetryMetrics.map((m) => (
                <div
                  key={m.label}
                  className="bg-slate-950/90 border border-slate-800 rounded-lg px-2 py-1 flex flex-col"
                >
                  <span className="text-[8px] text-slate-400 uppercase">{m.label}</span>
                  <span
                    className={`text-[10px] font-bold ${
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

            {result.followUpIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 pt-0.5">
                <span className="text-[8px] text-slate-400">NEXT:</span>
                {result.followUpIds.map((fid) => {
                  const targetFn = QUADMAX_FUNCTION_REGISTRY.find((f) => f.id === fid);
                  if (!targetFn) return null;
                  return (
                    <button
                      key={fid}
                      type="button"
                      onClick={() => handleRunFunction(fid)}
                      className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-700 text-[8.5px] text-cyan-300"
                    >
                      {targetFn.shortLabel}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-slate-800">
              <span className="text-[8px] text-slate-400 truncate">
                65B: {result.sha256Seal.slice(0, 14)}…
              </span>
              <div className="flex gap-1 shrink-0">
                <a
                  href={result.deepLink.href}
                  className="py-1 px-2 bg-cyan-500 text-slate-950 font-bold text-[9.5px] rounded-lg"
                >
                  {result.deepLink.label} →
                </a>
                <a
                  href="/site/agent-console"
                  className="py-1 px-2 bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-[9.5px] rounded-lg"
                >
                  CONSOLE
                </a>
              </div>
            </div>
          </div>

          {/* Prompt Bar */}
          <div className="flex gap-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder={`Ask ${selectedAgent === "ALL" ? "All Agents" : selectedAgent}...`}
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={() => handleAsk()}
              className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] rounded-lg"
            >
              RUN
            </button>
          </div>
        </div>
      )}

      {/* Compact Movable Pill Launcher */}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsOpen((v) => !v);
        }}
        title="Drag to move anywhere • Click to open All Agents & Profiles"
        style={{
          width: `${PILL_WIDTH}px`,
          height: `${PILL_HEIGHT}px`,
          backgroundColor: isLight ? "#FDFCF9" : "#0F172A",
          borderColor: isLight ? "rgba(201, 100, 66, 0.55)" : "rgba(34, 211, 238, 0.45)",
          color: isLight ? "#1F1E1B" : "#F8FAFC",
        }}
        className={`flex items-center justify-between px-2.5 rounded-full border shadow-lg backdrop-blur-md transition-shadow ${
          isDragging ? "cursor-grabbing scale-105 shadow-xl" : "cursor-grab hover:shadow-md"
        }`}
      >
        <span
          style={{ color: isLight ? "#78736A" : "#64748B" }}
          className="text-[10px] leading-none tracking-tighter"
        >
          ⋮⋮
        </span>
        <span
          style={{ backgroundColor: isLight ? "#C96442" : "#22D3EE" }}
          className="w-2 h-2 rounded-full animate-pulse shrink-0"
        />
        <span className="text-[10px] font-bold tracking-tight">QUADMAX.AI</span>
        <span
          style={{
            backgroundColor: isLight ? "#EFECE4" : "#1E293B",
            color: isLight ? "#C96442" : "#22D3EE",
          }}
          className="px-1.5 py-0.5 rounded text-[8px] font-bold"
        >
          {selectedAgent === "ALL" ? "ALL 5" : selectedAgent}
        </span>
      </div>
    </div>
  );
}
WIDGET_EOF

# ==============================================================================
# 4. ADD ALL AGENTS DROPDOWN TO /site/agent-console
# ==============================================================================
cat << 'CONSOLE_EOF' > app/site/agent-console/page.tsx
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
CONSOLE_EOF

npx tsc --noEmit && echo "✓ All Agents dropdown restored & TypeScript check passed with 0 errors!"
