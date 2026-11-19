// @refresh reset
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Plus,
  ShieldAlert,
  Layers,
  Sparkles,
} from "lucide-react";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";
import {
  getAllPortfolioAlerts,
  HIERARCHICAL_AGENT_MESH,
  PORTFOLIO_10_PROJECTS,
  SCOPE_DOMAINS,
  ScopeDomainId,
} from "@/lib/agents/portfolioSentinelMesh";
import type {
  CustomAgentSpec,
  QuadmaxChatPayload,
  QuadmaxCitation,
  QuadmaxMetricPill,
} from "@/app/api/quadmax/route";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  activeAgentChain?: string[];
  scopeLabel?: string;
  siteLabel?: string;
  standardRef?: string;
  metrics?: QuadmaxMetricPill[];
  citations?: QuadmaxCitation[];
  followUps?: string[];
}

const POS_STORAGE_KEY = "quadmax-draggable-pill-pos-v2";
const THREAD_STORAGE_KEY = "quadmax-quadmax-thread-v4";
const CUSTOM_AGENTS_KEY = "quadmax-custom-agents-v1";
const PILL_WIDTH = 184;
const PILL_HEIGHT = 36;

export default function QuadmaxKernelFloatingWidget() {
  const { isLight } = useLiveviewTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Site × Scope × Hierarchical Agent Filters
  const [selectedProjectId, setSelectedProjectId] = useState<string>("ALL_10");
  const [selectedScope, setSelectedScope] = useState<ScopeDomainId>("ALL_SCOPES");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("AUTO");

  // Custom Micro-Agent Builder State
  const [customAgents, setCustomAgents] = useState<CustomAgentSpec[]>([]);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentToleranceMm, setNewAgentToleranceMm] = useState("2.0");
  const [newAgentInstruction, setNewAgentInstruction] = useState("");

  // Hands-Free "Hey Quadmax" Voice Recognition & Spoken TTS
  const [isListening, setIsListening] = useState(false);
  const [wakeWordArmed, setWakeWordArmed] = useState(false);
  const [voiceSpeakEnabled, setVoiceSpeakEnabled] = useState(false);
  const [voiceStatusNote, setVoiceStatusNote] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initialAlerts = getAllPortfolioAlerts("ALL_10", "ALL_SCOPES");
    const summitAlert = initialAlerts.find((a) => a.projectId === "LKO-SUMMIT-TOWER");
    const vanguardAlert = initialAlerts.find((a) => a.alertId === "NCR-2026-STR-042");

    return [
      {
        id: "quadmax-boot-brief",
        role: "assistant",
        timestamp: "LIVE",
        activeAgentChain: ["PRIME-COMMAND", "MINERVA-ARCH", "ARGUS-SPATIAL", "μ-GRIDLINE-DELTA"],
        scopeLabel: "All Domains (360°)",
        siteLabel: "All 10 Portfolio Sites",
        standardRef: "ISO 19650-2 • IS 456:2000 • 1.0 mm Sentinel",
        content: `Portfolio Sentinel active across all 10 Lucknow sites (₹4,576.50 Cr total EPC value, 1.3–2.0 mm LiDAR RMS). ${initialAlerts.length} active wrongdoings detected:\n\n• [Summit Corporate Building — 12th Floor, Grid B4–B7]: ${summitAlert?.headline} (${summitAlert?.deviationMetric}).\n• [Project Vanguard — Tower A / BIT-4 TG-03]: ${vanguardAlert?.headline} (${vanguardAlert?.deviationMetric}).\n• [Aurelia Sky-Villas & Sushant Med-Tech]: 14.0 mm Column C-11 tilt & εr 1.6 hollow partition spoof caught.`,
        metrics: [
          { label: "Portfolio Scope", value: "10 Active Sites", tone: "nominal" },
          { label: "Summit 12F Wall", value: "+1,000 mm Offset", tone: "critical" },
          { label: "Vanguard TG-03", value: "₹4.50L Hold", tone: "critical" },
          { label: "Spatial Floor", value: "±1.3–2.0 mm", tone: "nominal" },
        ],
        citations: [
          { label: "Focus Vanguard TG-03 in 3D BIM", href: "/site/digital-twin?zone=BIT-4-TG03&ncr=NCR-2026-STR-042", tag: "3D BIM" },
          { label: "Section 65B Evidence Vault", href: "/site/audit-ledger", tag: "65B VAULT" },
        ],
        followUps: [
          "Give me full details on the Summit Building 12th floor 1m wall error",
          "Report strictly on Project Vanguard Commercial Hub",
          "Check millimeter spatial deviations across all 10 sites",
        ],
      },
    ];
  });

  const [input, setInput] = useState("");
  const [historyCursor, setHistoryCursor] = useState<number>(-1);
  const [isSending, setIsSending] = useState(false);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const sendRef = useRef<(overridePrompt?: string) => Promise<void>>(async () => {});

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

  const speakResponse = useCallback(
    (text: string) => {
      if (!voiceSpeakEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const clean = text.replace(/[•[]]/g, "").slice(0, 420);
        const utter = new SpeechSynthesisUtterance(clean);
        utter.rate = 1.04;
        utter.pitch = 0.96;
        window.speechSynthesis.speak(utter);
      } catch {}
    },
    [voiceSpeakEnabled]
  );

  useEffect(() => {
    try {
      const savedThread = localStorage.getItem(THREAD_STORAGE_KEY);
      if (savedThread) {
        const parsed = JSON.parse(savedThread);
        if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
      }
      const savedCustom = localStorage.getItem(CUSTOM_AGENTS_KEY);
      if (savedCustom) {
        const parsedAgents = JSON.parse(savedCustom);
        if (Array.isArray(parsedAgents)) setCustomAgents(parsedAgents);
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
      const savedPos = localStorage.getItem(POS_STORAGE_KEY);
      if (savedPos) {
        const parsed = JSON.parse(savedPos);
        if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
          setPos(clampPos(parsed.x, parsed.y));
          return;
        }
      }
    } catch {}

    setPos(clampPos(window.innerWidth - PILL_WIDTH - 16, window.innerHeight - PILL_HEIGHT - 16));

    const handleResize = () => setPos((prev) => (prev ? clampPos(prev.x, prev.y) : prev));
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      try {
        localStorage.setItem(THREAD_STORAGE_KEY, JSON.stringify(messages.slice(-24)));
      } catch {}
    }
    if (isOpen) {
      threadEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  const handleSend = useCallback(
    async (overridePrompt?: string) => {
      const prompt = (overridePrompt ?? input).trim();
      if (!prompt || isSending) return;

      const nowTime = new Date().toTimeString().slice(0, 5);
      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: prompt,
        timestamp: nowTime,
      };

      const nextThread = [...messages, userMsg];
      setMessages(nextThread);
      if (!overridePrompt) setInput("");
      setHistoryCursor(-1);
      setIsSending(true);

      const activeCustom = customAgents.find((a) => a.id === selectedAgentId) || null;

      try {
        const res = await fetch("/api/quadmax", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: prompt,
            projectId: selectedProjectId,
            scope: activeCustom ? activeCustom.scope : selectedScope,
            agentId: selectedAgentId,
            customAgent: activeCustom,
            history: nextThread.map((m) => ({ role: m.role, content: m.content })),
          }),
        });

        const data = await res.json();
        const payload = data?.payload as QuadmaxChatPayload | undefined;

        if (payload) {
          const assistantMsg: ChatMessage = {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: payload.answer,
            timestamp: new Date().toTimeString().slice(0, 5),
            activeAgentChain: payload.activeAgentChain,
            scopeLabel: payload.scopeLabel,
            siteLabel: payload.siteLabel,
            standardRef: payload.standardRef,
            metrics: payload.metrics,
            citations: payload.citations,
            followUps: payload.followUps,
          };
          setMessages((prev) => [...prev, assistantMsg]);
          speakResponse(payload.answer);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: "Unable to reach /api/quadmax. Verify your Next.js server is running.",
            timestamp: new Date().toTimeString().slice(0, 5),
          },
        ]);
      } finally {
        setIsSending(false);
      }
    },
    [
      customAgents,
      input,
      isSending,
      messages,
      selectedAgentId,
      selectedProjectId,
      selectedScope,
      speakResponse,
    ]
  );

  useEffect(() => {
    sendRef.current = handleSend;
  }, [handleSend]);

  // Embedded "Hey Quadmax" / Push-to-Talk Voice Engine
  const startVoiceCapture = useCallback(
    (continuousWake: boolean) => {
      if (typeof window === "undefined") return;
      const SpeechRec =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRec) {
        setVoiceStatusNote("Browser voice recognition unavailable — type commands below.");
        return;
      }

      try {
        recognitionRef.current?.stop();
      } catch {}

      const rec = new SpeechRec();
      rec.lang = "en-IN";
      rec.continuous = continuousWake;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
        setVoiceStatusNote(
          continuousWake
            ? 'Wake-word armed: say "Hey Quadmax, give me an overview..."'
            : "Listening for voice command..."
        );
      };

      rec.onresult = (event: any) => {
        const last = event.results[event.results.length - 1];
        if (!last || !last.isFinal) return;
        const transcript = String(last[0].transcript || "").trim();
        if (!transcript) return;

        if (continuousWake) {
          const lower = transcript.toLowerCase();
          if (
            lower.includes("hey quadmax") ||
            lower.includes("quadmax") ||
            lower.includes("quadmax") ||
            lower.includes("hey google")
          ) {
            const cleaned = transcript
              .replace(/^(heys+quadmax|quadmax|quadmax|heys+google)[,s]*/i, "")
              .trim();
            setIsOpen(true);
            setVoiceSpeakEnabled(true);
            sendRef.current(cleaned || "Give me a complete executive briefing across all 10 projects");
          }
        } else {
          setIsOpen(true);
          sendRef.current(transcript);
        }
      };

      rec.onerror = () => {
        setIsListening(false);
        setWakeWordArmed(false);
      };

      rec.onend = () => {
        if (continuousWake) {
          try {
            rec.start();
          } catch {
            setIsListening(false);
          }
        } else {
          setIsListening(false);
          setVoiceStatusNote(null);
        }
      };

      recognitionRef.current = rec;
      rec.start();
    },
    []
  );

  const toggleWakeWord = () => {
    if (wakeWordArmed) {
      setWakeWordArmed(false);
      setIsListening(false);
      setVoiceStatusNote(null);
      try {
        recognitionRef.current?.stop();
      } catch {}
    } else {
      setWakeWordArmed(true);
      setVoiceSpeakEnabled(true);
      startVoiceCapture(true);
    }
  };

  const handleCreateCustomAgent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgentName.trim()) return;
    const created: CustomAgentSpec = {
      id: `CUSTOM-${Date.now()}`,
      name: newAgentName.trim(),
      scope: selectedScope === "ALL_SCOPES" ? "SPATIAL_MILLIMETER_QA" : selectedScope,
      projectId: selectedProjectId,
      toleranceMm: parseFloat(newAgentToleranceMm) || 2.0,
      instruction:
        newAgentInstruction.trim() ||
        `Audit ${selectedProjectId} within ±${newAgentToleranceMm} mm tolerance and report any sequence or dimensional anomaly.`,
    };
    const updated = [...customAgents, created];
    setCustomAgents(updated);
    setSelectedAgentId(created.id);
    setShowCustomBuilder(false);
    setNewAgentName("");
    setNewAgentInstruction("");
    try {
      localStorage.setItem(CUSTOM_AGENTS_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const userPrompts = messages.filter((m) => m.role === "user").map((m) => m.content);
    if (e.key === "ArrowUp" && userPrompts.length > 0) {
      e.preventDefault();
      const nextIdx = historyCursor === -1 ? userPrompts.length - 1 : Math.max(0, historyCursor - 1);
      setHistoryCursor(nextIdx);
      setInput(userPrompts[nextIdx]);
    } else if (e.key === "ArrowDown" && historyCursor !== -1) {
      e.preventDefault();
      if (historyCursor >= userPrompts.length - 1) {
        setHistoryCursor(-1);
        setInput("");
      } else {
        const nextIdx = historyCursor + 1;
        setHistoryCursor(nextIdx);
        setInput(userPrompts[nextIdx]);
      }
    }
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
    if (Math.hypot(dx, dy) > 4) ds.moved = true;
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

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1280;
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const openUpward = pos.y > viewportH * 0.52;
  const alignRight = pos.x + PILL_WIDTH / 2 > viewportW * 0.5;

  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const activeFollowUps = latestAssistant?.followUps || [];
  const totalPortfolioAlerts = getAllPortfolioAlerts("ALL_10", "ALL_SCOPES").length;

  const panelStyle: React.CSSProperties = isLight
    ? { backgroundColor: "rgba(253, 252, 249, 0.98)", borderColor: "#D6CFC2", color: "#1F1E1B" }
    : { backgroundColor: "rgba(9, 9, 11, 0.97)", borderColor: "#27272A", color: "#FAFAFA" };

  const surfaceBg = isLight ? "#F3EFE6" : "#141417";
  const borderSubtle = isLight ? "#DED8CA" : "#27272A";
  const mutedText = isLight ? "#6E695F" : "#A1A1AA";
  const accentColor = isLight ? "#C96442" : "#10B981";

  return (
    <div
      style={{ position: "fixed", left: `${pos.x}px`, top: `${pos.y}px`, zIndex: 60 }}
      className="font-mono"
    >
      {isOpen && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            ...(openUpward ? { bottom: `${PILL_HEIGHT + 10}px` } : { top: `${PILL_HEIGHT + 10}px` }),
            ...(alignRight ? { right: 0 } : { left: 0 }),
            ...panelStyle,
          }}
          className={`${
            isExpanded ? "w-[580px] h-[640px]" : "w-[450px] h-[520px]"
          } max-w-[95vw] max-h-[calc(100vh-80px)] rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden select-text transition-all duration-150`}
        >
          {/* 1. J.A.R.V.I.S. Top Command Header + Voice Wake Controls */}
          <div
            style={{ borderColor: borderSubtle }}
            className="px-3.5 py-2.5 border-b flex items-center justify-between gap-2 shrink-0"
          >
            <div className="flex items-center gap-2">
              <Sparkles style={{ color: accentColor }} className="w-3.5 h-3.5" />
              <span className="font-bold text-xs tracking-tight">QUADMAX.AI</span>
              <span
                style={{ backgroundColor: surfaceBg, borderColor: borderSubtle, color: accentColor }}
                className="px-1.5 py-0.5 rounded border text-[9px] font-bold"
              >
                QUADMAX • 10 SITES
              </span>
            </div>

            <div className="flex items-center gap-1 text-[10px]">
              <button
                type="button"
                onClick={toggleWakeWord}
                style={{
                  backgroundColor: wakeWordArmed ? accentColor : surfaceBg,
                  borderColor: borderSubtle,
                  color: wakeWordArmed ? "#09090B" : mutedText,
                }}
                className="px-2 py-0.5 rounded border font-bold flex items-center gap-1"
                title='Enable hands-free "Hey Quadmax" voice wake listener'
              >
                {wakeWordArmed ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                {wakeWordArmed ? "Hey Quadmax: ON" : "Hey Quadmax"}
              </button>

              <button
                type="button"
                onClick={() => setVoiceSpeakEnabled((v) => !v)}
                style={{ backgroundColor: surfaceBg, borderColor: borderSubtle, color: mutedText }}
                className="p-1 rounded border"
                title={voiceSpeakEnabled ? "Mute spoken voice readout" : "Enable spoken voice readout"}
              >
                {voiceSpeakEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMessages((prev) => [prev[0]]);
                  try {
                    localStorage.removeItem(THREAD_STORAGE_KEY);
                  } catch {}
                }}
                style={{ backgroundColor: surfaceBg, borderColor: borderSubtle, color: mutedText }}
                className="px-2 py-0.5 rounded border font-bold"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                style={{ backgroundColor: surfaceBg, borderColor: borderSubtle, color: mutedText }}
                className="px-2 py-0.5 rounded border font-bold"
              >
                {isExpanded ? "Compact" : "Expand"}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{ backgroundColor: surfaceBg, borderColor: borderSubtle, color: mutedText }}
                className="px-2 py-0.5 rounded border font-bold"
              >
                ✕
              </button>
            </div>
          </div>

          {/* 2. Site × Domain Scope × 3-Tier Hierarchical Agent Selector */}
          <div
            style={{ borderColor: borderSubtle, backgroundColor: surfaceBg }}
            className="px-3 py-2 border-b grid grid-cols-1 sm:grid-cols-3 gap-1.5 shrink-0 text-[10px]"
          >
            {/* Site / Building Filter */}
            <div className="flex flex-col gap-0.5">
              <span style={{ color: mutedText }} className="text-[8px] font-bold uppercase">
                BUILDING / SITE
              </span>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                style={{
                  backgroundColor: isLight ? "#FDFCF9" : "#09090B",
                  borderColor: borderSubtle,
                  color: isLight ? "#1F1E1B" : "#FAFAFA",
                }}
                className="rounded-lg border px-2 py-1 font-bold outline-none"
              >
                <option value="ALL_10">All 10 Sites (Portfolio)</option>
                {PORTFOLIO_10_PROJECTS.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.code}: {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Domain / Role Scope Filter */}
            <div className="flex flex-col gap-0.5">
              <span style={{ color: mutedText }} className="text-[8px] font-bold uppercase">
                YOUR SCOPE / DOMAIN
              </span>
              <select
                value={selectedScope}
                onChange={(e) => setSelectedScope(e.target.value as ScopeDomainId)}
                style={{
                  backgroundColor: isLight ? "#FDFCF9" : "#09090B",
                  borderColor: borderSubtle,
                  color: isLight ? "#1F1E1B" : "#FAFAFA",
                }}
                className="rounded-lg border px-2 py-1 font-bold outline-none"
              >
                {SCOPE_DOMAINS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Management / Sub / Micro / Custom Agent Mesh */}
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span style={{ color: mutedText }} className="text-[8px] font-bold uppercase">
                  AGENT TIER
                </span>
                <button
                  type="button"
                  onClick={() => setShowCustomBuilder((v) => !v)}
                  style={{ color: accentColor }}
                  className="text-[8px] font-bold flex items-center gap-0.5 hover:underline"
                >
                  <Plus className="w-2.5 h-2.5" /> Custom
                </button>
              </div>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                style={{
                  backgroundColor: isLight ? "#FDFCF9" : "#09090B",
                  borderColor: borderSubtle,
                  color: isLight ? "#1F1E1B" : "#FAFAFA",
                }}
                className="rounded-lg border px-2 py-1 font-bold outline-none"
              >
                <option value="AUTO">Auto-Orchestrate (3-Tier)</option>
                <optgroup label="Tier 1: Management Agents">
                  {HIERARCHICAL_AGENT_MESH.filter((a) => a.tier === "MANAGEMENT").map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Tier 2: Domain Sub-Agents">
                  {HIERARCHICAL_AGENT_MESH.filter((a) => a.tier === "SUB_AGENT").map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Tier 3: Millimeter Micro-Agents">
                  {HIERARCHICAL_AGENT_MESH.filter((a) => a.tier === "MICRO_AGENT").map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </optgroup>
                {customAgents.length > 0 && (
                  <optgroup label="Custom User Agents">
                    {customAgents.map((c) => (
                      <option key={c.id} value={c.id}>
                        ★ {c.name} (±{c.toleranceMm}mm)
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>
          </div>

          {/* Optional Custom Micro-Agent Builder Drawer */}
          {showCustomBuilder && (
            <form
              onSubmit={handleCreateCustomAgent}
              style={{ borderColor: borderSubtle, backgroundColor: surfaceBg }}
              className="p-3 border-b flex flex-col gap-2 text-[10px] shrink-0"
            >
              <div className="font-bold flex items-center justify-between">
                <span>CREATE CUSTOM SCOPE / MILLIMETER AGENT</span>
                <button type="button" onClick={() => setShowCustomBuilder(false)}>
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="text"
                  placeholder="Agent Name (e.g. 12F Wall Guard)"
                  value={newAgentName}
                  onChange={(e) => setNewAgentName(e.target.value)}
                  style={{ backgroundColor: isLight ? "#FDFCF9" : "#09090B", borderColor: borderSubtle }}
                  className="col-span-2 rounded-lg border px-2 py-1 outline-none"
                  required
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Tol (mm)"
                  value={newAgentToleranceMm}
                  onChange={(e) => setNewAgentToleranceMm(e.target.value)}
                  style={{ backgroundColor: isLight ? "#FDFCF9" : "#09090B", borderColor: borderSubtle }}
                  className="rounded-lg border px-2 py-1 outline-none"
                />
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Mandate (e.g. Flag any wall cast >5mm off gridline or out of WBS order)"
                  value={newAgentInstruction}
                  onChange={(e) => setNewAgentInstruction(e.target.value)}
                  style={{ backgroundColor: isLight ? "#FDFCF9" : "#09090B", borderColor: borderSubtle }}
                  className="flex-1 rounded-lg border px-2 py-1 outline-none"
                />
                <button
                  type="submit"
                  style={{
                    backgroundColor: isLight ? "#1F1E1B" : "#FAFAFA",
                    color: isLight ? "#FDFCF9" : "#09090B",
                  }}
                  className="px-3 py-1 rounded-lg font-bold"
                >
                  Deploy
                </button>
              </div>
            </form>
          )}

          {voiceStatusNote && (
            <div
              style={{ backgroundColor: surfaceBg, borderColor: borderSubtle, color: accentColor }}
              className="px-3 py-1 border-b text-[9.5px] font-bold shrink-0"
            >
              🎙️ {voiceStatusNote}
            </div>
          )}

          {/* 3. Persistent Scrollable Multi-Turn Conversation Thread */}
          <div className="flex-1 overflow-y-auto p-3.5 flex flex-col gap-3">
            {messages.map((msg) => {
              if (msg.role === "user") {
                return (
                  <div key={msg.id} className="flex flex-col items-end gap-0.5">
                    <div
                      style={{
                        backgroundColor: isLight ? "#1F1E1B" : "#27272A",
                        color: "#FAFAFA",
                      }}
                      className="max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2 text-[11px] leading-relaxed shadow-sm"
                    >
                      {msg.content}
                    </div>
                    <span style={{ color: mutedText }} className="text-[8.5px] pr-1">
                      You • {msg.timestamp}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex flex-col items-start gap-1">
                  <div
                    style={{ backgroundColor: surfaceBg, borderColor: borderSubtle }}
                    className="w-full rounded-2xl rounded-bl-sm border p-3 flex flex-col gap-2 text-[11px]"
                  >
                    {/* 3-Tier Agent Chain & Scope Trace */}
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[9px]">
                      <span style={{ color: accentColor }} className="font-bold flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {(msg.activeAgentChain || ["PRIME-COMMAND"]).join(" → ")}
                      </span>
                      <span style={{ color: mutedText }}>
                        {msg.siteLabel} • {msg.scopeLabel}
                      </span>
                    </div>

                    {/* Natural Engineering Prose */}
                    <div className="whitespace-pre-line leading-relaxed text-[11px]">
                      {msg.content}
                    </div>

                    {/* Inline Telemetry & Deviation Pills */}
                    {msg.metrics && msg.metrics.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-0.5">
                        {msg.metrics.map((m) => {
                          const toneColor =
                            m.tone === "critical"
                              ? "#EF4444"
                              : m.tone === "watch"
                              ? "#D97706"
                              : accentColor;
                          return (
                            <div
                              key={m.label}
                              style={{
                                backgroundColor: isLight ? "#FDFCF9" : "#09090B",
                                borderColor: borderSubtle,
                              }}
                              className="px-2 py-1 rounded-lg border flex flex-col"
                            >
                              <span style={{ color: mutedText }} className="text-[8px] uppercase truncate">
                                {m.label}
                              </span>
                              <span style={{ color: toneColor }} className="text-[10px] font-bold truncate">
                                {m.value}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Executable Dashboard & 3D BIM Citations */}
                    {msg.citations && msg.citations.length > 0 && (
                      <div
                        style={{ borderColor: borderSubtle }}
                        className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t"
                      >
                        {msg.citations.map((cit) => (
                          <a
                            key={cit.label}
                            href={cit.href}
                            style={{
                              backgroundColor: isLight ? "#FDFCF9" : "#09090B",
                              borderColor: borderSubtle,
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[9.5px] font-bold hover:opacity-80 transition"
                          >
                            <span style={{ color: accentColor }}>[{cit.tag}]</span>
                            <span>{cit.label} →</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <span style={{ color: mutedText }} className="text-[8.5px] pl-1">
                    QUADMAX J.A.R.V.I.S. • {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {isSending && (
              <div
                style={{ backgroundColor: surfaceBg, borderColor: borderSubtle, color: mutedText }}
                className="self-start px-3 py-2 rounded-2xl border text-[10px] animate-pulse"
              >
                Orchestrating Management → Sub → Micro agents across telemetry...
              </div>
            )}

            <div ref={threadEndRef} />
          </div>

          {/* 4. Contextual Follow-Up Chips */}
          {activeFollowUps.length > 0 && !isSending && (
            <div
              style={{ borderColor: borderSubtle }}
              className="px-3 py-1.5 border-t flex items-center gap-1.5 overflow-x-auto shrink-0"
            >
              {activeFollowUps.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSend(q)}
                  style={{ backgroundColor: surfaceBg, borderColor: borderSubtle }}
                  className="px-2 py-1 rounded-lg border text-[9px] font-bold shrink-0 hover:opacity-80 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* 5. Composer Bar with Push-to-Talk Mic + ↑/↓ History Recall */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            style={{ borderColor: borderSubtle }}
            className="p-2.5 border-t flex items-center gap-1.5 shrink-0"
          >
            <button
              type="button"
              onClick={() => startVoiceCapture(false)}
              style={{
                backgroundColor: isListening ? "#EF4444" : surfaceBg,
                borderColor: borderSubtle,
                color: isListening ? "#FFFFFF" : accentColor,
              }}
              className="p-2 rounded-xl border shrink-0"
              title="Speak command to QUADMAX.AI"
            >
              <Mic className="w-3.5 h-3.5" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="Ask J.A.R.V.I.S. across 10 sites or 1mm detail (↑ history)..."
              style={{ backgroundColor: surfaceBg, borderColor: borderSubtle }}
              className="flex-1 rounded-xl border px-3 py-2 text-[10.5px] outline-none"
            />

            <button
              type="submit"
              disabled={isSending || !input.trim()}
              style={{
                backgroundColor: isLight ? "#1F1E1B" : "#FAFAFA",
                color: isLight ? "#FDFCF9" : "#09090B",
              }}
              className="px-3.5 py-2 rounded-xl font-bold text-[10px] disabled:opacity-40 transition shrink-0"
            >
              Send
            </button>
          </form>
        </div>
      )}

      {/* Compact Movable Pill Launcher with Live Portfolio Alert Count */}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsOpen((v) => !v);
        }}
        title="Drag anywhere • Click to open QUADMAX J.A.R.V.I.S."
        style={{
          width: `${PILL_WIDTH}px`,
          height: `${PILL_HEIGHT}px`,
          touchAction: "none",
          backgroundColor: isLight ? "#FDFCF9" : "#09090B",
          borderColor: isLight ? "rgba(201, 100, 66, 0.55)" : "rgba(161, 161, 170, 0.45)",
          color: isLight ? "#1F1E1B" : "#FAFAFA",
        }}
        className={`flex items-center justify-between px-2.5 rounded-full border shadow-lg backdrop-blur-md transition-shadow select-none ${
          isDragging ? "cursor-grabbing scale-105 shadow-xl" : "cursor-grab hover:shadow-md"
        }`}
      >
        <span style={{ color: mutedText }} className="text-[10px] leading-none tracking-tighter">
          ⋮⋮
        </span>
        <span
          style={{ backgroundColor: accentColor }}
          className="w-2 h-2 rounded-full animate-pulse shrink-0"
        />
        <span className="text-[10px] font-bold tracking-tight">QUADMAX.AI</span>
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[8px] font-bold">
          <ShieldAlert className="w-2.5 h-2.5" />
          {totalPortfolioAlerts}
        </span>
      </div>
    </div>
  );
}
