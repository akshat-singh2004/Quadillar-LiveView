// @refresh reset
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Plus,
  ShieldAlert,
  Layers,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";
import { startFieldVoiceCapture, LiveAudioCaptureHandle } from "@/lib/audio/openSourceAudioEngine";
import { useGovernor } from "@/context/GovernorContext";
import { useActiveProject } from "@/context/ProjectContext";
import {
  AutopilotSettings,
  getAutopilotSettings,
  planUiActionsFromCommand,
  saveAutopilotSettings,
  UiActionPlan,
} from "@/lib/agents/uiActionPlanner";
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
const THREAD_STORAGE_KEY = "quadmax-portfolio-thread-v6";
const CUSTOM_AGENTS_KEY = "quadmax-custom-agents-v1";
const PILL_WIDTH = 176;
const PILL_HEIGHT = 36;

function getIstGreeting(): string {
  const hr = new Date().getHours();
  if (hr < 12) return "Good morning";
  if (hr < 17) return "Good afternoon";
  return "Good evening";
}

export default function QuadmaxKernelFloatingWidget() {
  const router = useRouter();
  const { isLight } = useLiveviewTheme();
  const { activeProjectId, selectProject } = useActiveProject();

  const [isOpen, setIsOpen] = useState(false);
  const { snapshot: govSnap } = useGovernor();
  const [isExpanded, setIsExpanded] = useState(true);

  const [selectedProjectId, setSelectedProjectId] = useState<string>("UP-LDA-VANGUARD-CAMPUS");
  const [selectedScope, setSelectedScope] = useState<ScopeDomainId>("ALL_SCOPES");
  const [selectedAgentId, setSelectedAgentId] = useState<string>("AUTO");

  const [customAgents, setCustomAgents] = useState<CustomAgentSpec[]>([]);
  const [showCustomBuilder, setShowCustomBuilder] = useState(false);
  const [showAutopilotSettings, setShowAutopilotSettings] = useState<boolean>(false);
  const [autopilotSettings, setAutopilotSettings] = useState<AutopilotSettings>({
    enabled: true,
    requireConfirmation: true,
  });
  const [pendingActionPlan, setPendingActionPlan] = useState<UiActionPlan | null>(null);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentToleranceMm, setNewAgentToleranceMm] = useState("2.0");
  const [newAgentInstruction, setNewAgentInstruction] = useState("");

  const [isListening, setIsListening] = useState(false);
  const [voiceSpeakEnabled, setVoiceSpeakEnabled] = useState(false);
  const [voiceStatusNote, setVoiceStatusNote] = useState<string | null>(null);
  const audioHandleRef = useRef<LiveAudioCaptureHandle | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const initialAlerts = getAllPortfolioAlerts("UP-LDA-VANGUARD-CAMPUS", "ALL_SCOPES");
    const greeting = getIstGreeting();

    return [
      {
        id: "quadmax-boot-brief-v6",
        role: "assistant",
        timestamp: "LIVE",
        activeAgentChain: ["PRIME-COMMAND", "MINERVA-ARCH", "ARGUS-SPATIAL", "GRIDLINE-DELTA"],
        scopeLabel: "All Domains (360°)",
        siteLabel: "PRJ-01: Project Vanguard Commercial Hub",
        standardRef: "ISO 19650-2 • IS 456:2000",
        content:
          `${greeting}, Principal Architect. QUADMAX Kernel is locked onto Project Vanguard Commercial Hub (UP-LDA-VANGUARD-CAMPUS • INR 864.50 Cr EPC Baseline • +/-1.8 mm LiDAR RMS). ${initialAlerts.length} active governance item(s) tracked:\n\n` +
          initialAlerts
            .map((a) => `• [${a.floorOrZone}]: ${a.headline} (${a.deviationMetric}).`)
            .join("\n"),
        metrics: [
          { label: "Active Site", value: "PRJ-01 Vanguard", tone: "nominal" },
          { label: "EPC Baseline", value: "INR 864.50 Cr", tone: "nominal" },
          { label: "Transfer Girder", value: "TG-03 Monitored", tone: "watch" },
          { label: "LiDAR RMS", value: "+/-1.8 mm", tone: "nominal" },
        ],
        citations: [
          { label: "Focus TG-03 in 3D BIM", href: "/site/digital-twin?zone=BIT-4-TG03&ncr=NCR-2026-STR-042", tag: "3D BIM" },
          { label: "BSA Section 63 Vault", href: "/closeout/audit-vault", tag: "65B VAULT" },
        ],
        followUps: [
          "What did the site engineer report a moment ago?",
          "Check Transfer Girder TG-03 IS 456 core gate status",
        ],
      },
    ];
  });

  const [input, setInput] = useState("");
  const [historyCursor, setHistoryCursor] = useState<number>(-1);
  const [isSending, setIsSending] = useState(false);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const sendRef = useRef<(overridePrompt?: string) =>Promise<void>>(async () => {});

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
      localStorage.removeItem("quadmax-portfolio-thread-v5");
      localStorage.removeItem("quadmax-jarvis-thread-v4");
    } catch {}

    const onProjectChange = (e: Event) => {
      const nextId = (e as CustomEvent<string>).detail;
      if (nextId) setSelectedProjectId(nextId);
    };
    window.addEventListener("quadillar-project-change", onProjectChange);
    return () =>window.removeEventListener("quadillar-project-change", onProjectChange);
  }, []);

  const speakResponse = useCallback(
    (text: string) => {
      if (!voiceSpeakEnabled || typeof window === "undefined" || !("speechSynthesis"in window)) {
        return;
      }
      try {
        window.speechSynthesis.cancel();
        const clean = text.replace(/[•\[\]]/g, "").slice(0, 420);
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
        if (Array.isArray(parsed) && parsed.length >0) setMessages(parsed);
      }
      const savedCustom = localStorage.getItem(CUSTOM_AGENTS_KEY);
      if (savedCustom) {
        const parsedAgents = JSON.parse(savedCustom);
        if (Array.isArray(parsedAgents)) setCustomAgents(parsedAgents);
      }
    } catch {}

    const clampPos = (rawX: number, rawY: number) => {
      const maxX = Math.max(12, window.innerWidth - PILL_WIDTH - 16);
      const maxY = Math.max(12, window.innerHeight - PILL_HEIGHT - 16);
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

    setPos(clampPos(window.innerWidth - PILL_WIDTH - 20, window.innerHeight - PILL_HEIGHT - 20));

    const handleResize = () =>setPos((prev) => (prev ? clampPos(prev.x, prev.y) : prev));
    window.addEventListener("resize", handleResize);
    return () =>window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (messages.length >1) {
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

      const currentSettings = getAutopilotSettings();
      const plannedUi = currentSettings.enabled ? planUiActionsFromCommand(prompt) : null;
      if (plannedUi) {
        const nowPlanTime = new Date().toTimeString().slice(0, 5);
        if (currentSettings.requireConfirmation) {
          setPendingActionPlan(plannedUi);
          setMessages((prev) => [
            ...prev,
            { id: `u-${Date.now()}`, role: "user", content: prompt, timestamp: nowPlanTime },
            {
              id: `a-plan-${Date.now()}`,
              role: "assistant",
              content: `The command you've given will result in: ${plannedUi.summaryOutcome} — Confirm below if I should proceed.`,
              timestamp: nowPlanTime,
            },
          ]);
          if (!overridePrompt) setInput("");
          return;
        } else {
          window.dispatchEvent(new CustomEvent("quadmax-execute-plan", { detail: plannedUi }));
        }
      }

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

      const activeCustom = customAgents.find((a) =>a.id === selectedAgentId) || null;

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

          // Live UI Actuation on explicit voice/text navigation commands
          const lowerCmd = prompt.toLowerCase();
          if (lowerCmd.includes("vanguard")) {
            selectProject("UP-LDA-VANGUARD-CAMPUS");
            setSelectedProjectId("UP-LDA-VANGUARD-CAMPUS");
          }
          if (
            (lowerCmd.includes("open") ||
              lowerCmd.includes("zoom") ||
              lowerCmd.includes("focus") ||
              lowerCmd.includes("locate")) &&
            (lowerCmd.includes("bim") ||
              lowerCmd.includes("girder") ||
              lowerCmd.includes("tg-03") ||
              lowerCmd.includes("3d"))
          ) {
            const wantsHeatmap = lowerCmd.includes("heatmap") || lowerCmd.includes("millimeter") || lowerCmd.includes("tolerance") || lowerCmd.includes("offset");
            router.push(wantsHeatmap ? "/site/digital-twin?zone=BIT-4-TG03&ncr=NCR-2026-STR-042&heatmap=1" : "/site/digital-twin?zone=BIT-4-TG03&ncr=NCR-2026-STR-042");
            if (wantsHeatmap) {
              window.dispatchEvent(new CustomEvent("quadillar-heatmap-toggle", { detail: true }));
            }
          }
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
      router,
      selectProject,
      selectedAgentId,
      selectedProjectId,
      selectedScope,
      speakResponse,
    ]
  );

  useEffect(() => {
    sendRef.current = handleSend;
  }, [handleSend]);

  const toggleUnifiedVoice = useCallback(async () => {
    // If already listening, stop and transcribe with Gemini 3.5 Flash Lite
    if (isListening && audioHandleRef.current) {
      setIsListening(false);
      setVoiceStatusNote("Transcribing voice command with Gemini...");
      try {
        const res = await audioHandleRef.current.stop();
        audioHandleRef.current = null;
        if (!res.audioBlob || res.audioBlob.size === 0) {
          setVoiceStatusNote("No audio captured — tap mic and speak clearly.");
          setTimeout(() => setVoiceStatusNote(null), 2500);
          return;
        }
        const fd = new FormData();
        const safeBlob = res.audioBlob.type
          ? res.audioBlob
          : new Blob([res.audioBlob], { type: "audio/webm" });
        const ext = safeBlob.type.includes("mp4") ? "m4a" : "webm";
        fd.append("audio", safeBlob, `quadmax-cmd-${Date.now()}.${ext}`);

        const trRes = await fetch("/api/transcribe", { method: "POST", body: fd });
        const trData = await trRes.json();
        const spoken = String(trData?.transcript || "").trim();
        if (trRes.ok && spoken) {
          setVoiceStatusNote(null);
          setIsOpen(true);
          await sendRef.current(spoken);
        } else {
          setVoiceStatusNote("Could not hear speech clearly — please try again or type below.");
          setTimeout(() => setVoiceStatusNote(null), 3000);
        }
      } catch {
        setVoiceStatusNote("Voice transcription error — type command below.");
        setTimeout(() => setVoiceStatusNote(null), 3000);
      }
      return;
    }

    // Start fresh microphone capture (single unified mic, zero wake-word conflict)
    setVoiceStatusNote("Listening... tap the red mic button again to send.");
    setIsListening(true);
    try {
      const handle = await startFieldVoiceCapture({});
      audioHandleRef.current = handle;
    } catch {
      setIsListening(false);
      setVoiceStatusNote("Microphone unavailable — check browser permission or type below.");
      setTimeout(() => setVoiceStatusNote(null), 3000);
    }
  }, [isListening]);

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
    const userPrompts = messages.filter((m) =>m.role === "user").map((m) =>m.content);
    if (e.key === "ArrowUp" && userPrompts.length >0) {
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
    if (Math.hypot(dx, dy) >4) ds.moved = true;
    const maxX = Math.max(12, window.innerWidth - PILL_WIDTH - 16);
    const maxY = Math.max(12, window.innerHeight - PILL_HEIGHT - 16);
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
  const openUpward = pos.y >viewportH * 0.52;
  const alignRight = pos.x + PILL_WIDTH / 2 >viewportW * 0.5;

  const latestAssistant = [...messages].reverse().find((m) =>m.role === "assistant");
  const activeFollowUps = latestAssistant?.followUps || [];
  const totalPortfolioAlerts = getAllPortfolioAlerts("UP-LDA-VANGUARD-CAMPUS", "ALL_SCOPES").length;

  const panelStyle: React.CSSProperties = isLight
    ? { backgroundColor: "rgba(253, 252, 249, 0.98)", borderColor: "#D6CFC2", color: "#1F1E1B" }
    : { backgroundColor: "rgba(9, 9, 11, 0.97)", borderColor: "#27272A", color: "#FAFAFA" };

  const surfaceBg = isLight ? "#F3EFE6" : "#141417";
  const borderSubtle = isLight ? "#DED8CA" : "#27272A";
  const mutedText = isLight ? "#6E695F" : "#A1A1AA";
  const accentColor = isLight ? "#C96442" : "#10B981";

  const renderStructuredContent = (raw: string) => {
    const lines = raw.split("\n").filter((l) =>l.trim().length >0);
    const leadLines = lines.filter((l) => !l.trim().startsWith("•"));
    const bulletLines = lines.filter((l) =>l.trim().startsWith("•"));

    return (
      <div className="flex flex-col gap-2">
        {leadLines.map((line, i) => (
          <p key={i} className="leading-relaxed text-[11px]">
            {line}
          </p>
        ))}

        {bulletLines.length >0 && (
          <div className="flex flex-col gap-1.5">
            {bulletLines.map((b, i) => {
              const clean = b.replace(/^•\s*/, "");
              const bracketMatch = clean.match(/^\[([^\]]+)\]:\s*(.*)$/);
              const isCritical =
                clean.toLowerCase().includes("hold") ||
                clean.toLowerCase().includes("1,000 mm") ||
                clean.toLowerCase().includes("spoof");

              return (
                <div
                  key={i}
                  style={{
                    backgroundColor: isLight ? "#FFFFFF" : "#15181E",
                    borderColor: isCritical ? "rgba(239, 68, 68, 0.45)" : borderSubtle,
                  }}
                  className="p-2.5 rounded-xl border flex flex-col gap-1"
                >
                  {bracketMatch ? (
                    <>
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="text-[10px] font-bold">{bracketMatch[1]}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[8.5px] font-bold shrink-0 ${
                            isCritical
                              ? "bg-rose-500/15 text-rose-500"
                              : "bg-amber-500/15 text-amber-500"
                          }`}
                        >
                          {isCritical ? "CRITICAL" : "WATCH"}
                        </span>
                      </div>
                      <p style={{ color: mutedText }} className="text-[10.5px] leading-snug">
                        {bracketMatch[2]}
                      </p>
                    </>
                  ) : (
                    <span className="text-[10.5px] leading-snug">{clean}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{ position: "fixed", left: `${pos.x}px`, top: `${pos.y}px`, zIndex: isOpen ? 70 : 40 }}
      className="font-mono max-sm:!left-auto max-sm:!top-auto max-sm:right-3 max-sm:bottom-20"
    >
      {isOpen && (
        <div
          onPointerDown={(e) =>e.stopPropagation()}
          style={{
            ...(viewportW >= 640
              ? {
                  position: "absolute" as const,
                  ...(openUpward ? { bottom: `${PILL_HEIGHT + 10}px` } : { top: `${PILL_HEIGHT + 10}px` }),
                  ...(alignRight ? { right: 0 } : { left: 0 }),
                }
              : {}),
            ...panelStyle,
          }}
          className={`fixed inset-x-2.5 bottom-20 h-[64dvh] max-h-[520px] sm:inset-x-auto sm:bottom-auto ${
            isExpanded ? "sm:w-[540px] sm:h-[600px]" : "sm:w-[420px] sm:h-[480px]"
          } sm:max-w-[94vw] sm:max-h-[calc(100vh-80px)] rounded-2xl border shadow-2xl backdrop-blur-xl flex flex-col overflow-hidden select-text transition-all duration-150`}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 text-[10px] font-mono border-b border-zinc-800/30 bg-zinc-900 text-zinc-100 shrink-0">
            <span className="truncate font-bold">
              LIVE GOVERNOR SYNC: {govSnap.escrow.httpStatus === 200 ? "HTTP 200 COMPLIANT • 0 HOLDS" : `HTTP 422 HOLD • ${govSnap.violations.length} FAULTS`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="shrink-0 rounded bg-zinc-800 hover:bg-zinc-700 px-2 py-0.5 text-[10px] font-bold text-white"
              aria-label="Close QUADMAX.AI"
            >
              ✕ Close
            </button>
          </div>
          {/* 1. Clean Top Command Header */}
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
                PRJ-01 • VANGUARD KERNEL
              </span>
            </div>

            <div className="flex items-center gap-1 text-[10px]">
              <button
                type="button"
                onClick={() =>setShowAutopilotSettings((v) => !v)}
                style={{
                  backgroundColor: showAutopilotSettings ? accentColor : surfaceBg,
                  borderColor: borderSubtle,
                  color: showAutopilotSettings ? "#09090B" : mutedText,
                }}
                className="px-2 py-0.5 rounded-lg border font-bold"
                title="Configure Autonomous UI Co-Pilot & Confirmation Settings"
              >
                 Autopilot
              </button>

              <button
                type="button"
                onClick={() => setShowMobileFilters((v) => !v)}
                style={{
                  backgroundColor: showMobileFilters ? accentColor : surfaceBg,
                  borderColor: borderSubtle,
                  color: showMobileFilters ? "#09090B" : mutedText,
                }}
                className="sm:hidden px-2 py-1 rounded-lg border font-bold cursor-pointer"
                title="Show or hide project & agent filters"
              >
                Filters
              </button>

              <button
                type="button"
                onClick={() =>setVoiceSpeakEnabled((v) => !v)}
                style={{ backgroundColor: surfaceBg, borderColor: borderSubtle, color: mutedText }}
                className="p-1 rounded-lg border"
                title={voiceSpeakEnabled ? "Mute readout" : "Enable voice readout"}
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
                className="px-2 py-0.5 rounded-lg border font-bold"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                style={{ backgroundColor: surfaceBg, borderColor: borderSubtle, color: mutedText }}
                className="hidden sm:inline-flex px-2 py-0.5 rounded-lg border font-bold cursor-pointer"
              >
                {isExpanded ? "Compact" : "Expand"}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                style={{
                  backgroundColor: isLight ? "#1F1E1B" : "#27272A",
                  borderColor: borderSubtle,
                  color: "#FAFAFA",
                }}
                className="px-2.5 py-1 rounded-lg border font-bold inline-flex items-center gap-1 cursor-pointer"
                title="Hide QUADMAX panel"
              >
                <span>Hide</span>
                <span>✕</span>
              </button>
            </div>
          </div>

          {/* 2. Site × Domain Scope × 3-Tier Hierarchical Agent Selector */}
          <div
            style={{ borderColor: borderSubtle, backgroundColor: surfaceBg }}
            className={`${showMobileFilters ? "grid" : "hidden sm:grid"} px-3 py-2 border-b grid-cols-1 sm:grid-cols-3 gap-1.5 shrink-0 text-[10px]`}
          >
            <div className="flex flex-col gap-0.5">
              <span style={{ color: mutedText }} className="text-[8px] font-bold uppercase">
                BUILDING / SITE
              </span>
              <div
                style={{
                  backgroundColor: isLight ? "#FDFCF9" : "#09090B",
                  borderColor: borderSubtle,
                  color: isLight ? "#1F1E1B" : "#FAFAFA",
                }}
                className="rounded-lg border px-2 py-1 font-bold truncate"
                title="UP-LDA-VANGUARD-CAMPUS"
              >
                PRJ-01: Vanguard Hub
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              <span style={{ color: mutedText }} className="text-[8px] font-bold uppercase">
                YOUR SCOPE / DOMAIN
              </span>
              <select
                value={selectedScope}
                onChange={(e) =>setSelectedScope(e.target.value as ScopeDomainId)}
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

            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between">
                <span style={{ color: mutedText }} className="text-[8px] font-bold uppercase">
                  AGENT TIER
                </span>
                <button
                  type="button"
                  onClick={() =>setShowCustomBuilder((v) => !v)}
                  style={{ color: accentColor }}
                  className="text-[8px] font-bold flex items-center gap-0.5 hover:underline"
                >
                  <Plus className="w-2.5 h-2.5" />Custom
                </button>
              </div>
              <select
                value={selectedAgentId}
                onChange={(e) =>setSelectedAgentId(e.target.value)}
                style={{
                  backgroundColor: isLight ? "#FDFCF9" : "#09090B",
                  borderColor: borderSubtle,
                  color: isLight ? "#1F1E1B" : "#FAFAFA",
                }}
                className="rounded-lg border px-2 py-1 font-bold outline-none"
              >
                <option value="AUTO">Auto-Orchestrate (3-Tier)</option>
                <optgroup label="Tier 1: Management Agents">
                  {HIERARCHICAL_AGENT_MESH.filter((a) =>a.tier === "MANAGEMENT").map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Tier 2: Domain Sub-Agents">
                  {HIERARCHICAL_AGENT_MESH.filter((a) =>a.tier === "SUB_AGENT").map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Tier 3: Millimeter Micro-Agents">
                  {HIERARCHICAL_AGENT_MESH.filter((a) =>a.tier === "MICRO_AGENT").map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </optgroup>
                {customAgents.length >0 && (
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

          {showCustomBuilder && (
            <form
              onSubmit={handleCreateCustomAgent}
              style={{ borderColor: borderSubtle, backgroundColor: surfaceBg }}
              className="p-3 border-b flex flex-col gap-2 text-[10px] shrink-0"
            >
              <div className="font-bold flex items-center justify-between">
                <span>CREATE CUSTOM SCOPE / MILLIMETER AGENT</span>
                <button type="button"onClick={() =>setShowCustomBuilder(false)}>
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="text"
                  placeholder="Agent Name (e.g. 12F Wall Guard)"
                  value={newAgentName}
                  onChange={(e) =>setNewAgentName(e.target.value)}
                  style={{ backgroundColor: isLight ? "#FDFCF9" : "#09090B", borderColor: borderSubtle }}
                  className="col-span-2 rounded-lg border px-2 py-1 outline-none"
                  required
                />
                <input
                  type="number"
                  step="0.1"
                  placeholder="Tol (mm)"
                  value={newAgentToleranceMm}
                  onChange={(e) =>setNewAgentToleranceMm(e.target.value)}
                  style={{ backgroundColor: isLight ? "#FDFCF9" : "#09090B", borderColor: borderSubtle }}
                  className="rounded-lg border px-2 py-1 outline-none"
                />
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Mandate (e.g. Flag any wall cast >5mm off gridline)"
                  value={newAgentInstruction}
                  onChange={(e) =>setNewAgentInstruction(e.target.value)}
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
               {voiceStatusNote}
            </div>
          )}

          {/* 3. Persistent Scrollable Conversation Thread */}
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
                    className="w-full rounded-2xl rounded-bl-sm border p-3 flex flex-col gap-2.5 text-[11px]"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[9px]">
                      <span style={{ color: accentColor }} className="font-bold flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {(msg.activeAgentChain || ["PRIME-COMMAND"]).join(" → ")}
                      </span>
                      <span style={{ color: mutedText }}>
                        {msg.siteLabel} • {msg.scopeLabel}
                      </span>
                    </div>

                    {renderStructuredContent(msg.content)}

                    {msg.metrics && msg.metrics.length >0 && (
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
                              className="px-2 py-1.5 rounded-lg border flex flex-col"
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

                    {msg.citations && msg.citations.length >0 && (
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
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[9.5px] font-bold hover:opacity-80 transition"
                          >
                            <span style={{ color: accentColor }}>[{cit.tag}]</span>
                            <span>{cit.label}</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <span style={{ color: mutedText }} className="text-[8.5px] pl-1">
                    QUADMAX.AI • {msg.timestamp}
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

            {pendingActionPlan && (
            <div
              style={{ borderColor: accentColor, backgroundColor: surfaceBg }}
              className="p-3 rounded-2xl border flex flex-col gap-2 text-[10.5px] shadow-lg"
            >
              <div style={{ color: accentColor }} className="font-bold uppercase">
                 ACTION PREVIEW — SHOULD I PROCEED?
              </div>
              <p className="leading-relaxed">{pendingActionPlan.summaryOutcome}</p>
              <div className="space-y-1 pl-2 border-l-2 border-emerald-500/50">
                {pendingActionPlan.steps.map((st, idx) => (
                  <div key={st.id} style={{ color: mutedText }}>
                    {idx + 1}. {st.label}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const planToRun = pendingActionPlan;
                    setPendingActionPlan(null);
                    window.dispatchEvent(
                      new CustomEvent("quadmax-execute-plan", { detail: planToRun })
                    );
                  }}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold cursor-pointer"
                >
                   Proceed & Take Control
                </button>
                <button
                  type="button"
                  onClick={() =>setPendingActionPlan(null)}
                  style={{ borderColor: borderSubtle }}
                  className="py-1.5 px-3 rounded-xl border font-bold cursor-pointer"
                >
                  ✕ Cancel
                </button>
              </div>
            </div>
          )}
          <div ref={threadEndRef} />
          </div>

          {activeFollowUps.length >0 && !isSending && (
            <div
              style={{ borderColor: borderSubtle }}
              className="px-3 py-1.5 border-t flex items-center gap-1.5 overflow-x-auto shrink-0"
            >
              {activeFollowUps.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() =>handleSend(q)}
                  style={{ backgroundColor: surfaceBg, borderColor: borderSubtle }}
                  className="px-2.5 py-1 rounded-lg border text-[9px] font-bold shrink-0 hover:opacity-80 transition"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

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
              onClick={() => void toggleUnifiedVoice()}
              style={{
                backgroundColor: isListening ? "#EF4444" : surfaceBg,
                borderColor: borderSubtle,
                color: isListening ? "#FFFFFF" : accentColor,
              }}
              className="p-2 rounded-xl border shrink-0"
              title={isListening ? "Tap to stop and send voice command" : "Tap to speak command to QUADMAX.AI"}
            >
              <Mic className="w-3.5 h-3.5" />
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) =>setInput(e.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder={isListening ? "Listening... tap red mic to send" : "Ask QUADMAX about cracks, sensors, or escrow..."}
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
        title="Drag anywhere • Click to open QUADMAX.AI"
        style={{
          width: `${PILL_WIDTH}px`,
          height: `${PILL_HEIGHT}px`,
          touchAction: "none",
          backgroundColor: isLight ? "#FDFCF9" : "#09090B",
          borderColor: isLight ? "#E2E5EA" : "#252A34",
          color: isLight ? "#1F1E1B" : "#FAFAFA",
        }}
        className={`${isOpen ? "hidden" : "flex"} items-center justify-between px-2.5 rounded-full border shadow-md backdrop-blur-md transition-shadow select-none ${
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
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-500 text-[8px] font-bold">
          <ShieldAlert className="w-2.5 h-2.5" />
          {totalPortfolioAlerts}
        </span>
      </div>
    </div>
  );
}
