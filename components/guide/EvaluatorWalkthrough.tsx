"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Compass,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  ExternalLink,
  Layers,
  Database,
  Cpu,
  Lock,
  Box,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface GuideStep {
  id: string;
  stepNumber: number;
  rubricTag: string;
  deckSync: string;
  title: string;
  actionInstruction: string;
  underTheHood: string;
  selectors: string[];
}

const GUIDE_STEPS: GuideStep[] = [
  {
    id: "iot-seal",
    stepNumber: 1,
    rubricTag: "Technical Architecture",
    deckSync: "Deck Slide 4 | Video 0:30",
    title: "Seal Live Telemetry in Immutable Ledger",
    actionInstruction:
      "Click the highlighted IoT Burst button in the top bar to send a real multi-ray sensor packet.",
    underTheHood:
      "Hits /api/telemetry/ingress, computes a canonical SHA-256 digest, and writes to PostgreSQL section_65b_audit_ledger protected by BEFORE UPDATE/DELETE immutability triggers.",
    selectors: ['[data-guide-target="iot-burst"]', '[data-quadmax-target="trigger-iot-burst"]'],
  },
  {
    id: "gemini-field",
    stepNumber: 2,
    rubricTag: "Depth of Google AI",
    deckSync: "Deck Slide 5 | Video 1:00",
    title: "Run Gemini 2.5 Flash Field Grounding",
    actionInstruction:
      "Click Site Report, speak or type a site observation (English or Hinglish), and send.",
    underTheHood:
      "Gemini 2.5 Flash transcribes audio directly, maps the BIM zone using live project state, cites IS 456 clauses, and persists a tamper-sealed record.",
    selectors: ['[data-quadmax-target="open-whatsapp-field"]'],
  },
  {
    id: "is456-gate",
    stepNumber: 3,
    rubricTag: "Product Potential & Fit",
    deckSync: "Deck Slide 6 | Video 1:40",
    title: "Test Deterministic IS 456:2000 Payment Hold",
    actionInstruction:
      "Click Submit Lab Core Test (or Re-Lock Payment Hold first if cleared), load the failing 39.47 MPa sample, and submit to trigger an HTTP 422 rejection.",
    underTheHood:
      "Server-side IS 456:2000 Cl. 17.4.3 validator requires M50 core mean at least 42.50 MPa. Failing readings return HTTP 422 and keep INR 4,50,000 locked in escrow.",
    selectors: [
      '[data-quadmax-target="core-1-input"]',
      '[data-guide-target="open-core-form"]',
      '[data-guide-target="escrow-card"]',
    ],
  },
  {
    id: "qr-and-mcp",
    stepNumber: 4,
    rubricTag: "Market Viability & GTM",
    deckSync: "Deck Slide 7 | Video 2:15",
    title: "Scan Live Sec. 65B QR & Inspect Open MCP",
    actionInstruction:
      "Click Tools, then select Legal Proof Cert (Sec. 65B). Scan the live ISO QR code with your phone camera to verify the Postgres block.",
    underTheHood:
      "Generates an ISO QR pointing to /verify/[hash] backed by live Supabase queries. External ERPs and agents can query the exact same kernel over JSON-RPC 2.0 at /api/mcp.",
    selectors: ['[data-quadmax-target="open-65b-cert"]', '[data-quadmax-target="open-tools-menu"]'],
  },
  {
    id: "bim-twin",
    stepNumber: 5,
    rubricTag: "Spatial & AI Moat",
    deckSync: "Deck Slides 8-9 | Video 2:40",
    title: "Inspect LOD-400 3D Building Twin",
    actionInstruction:
      "Click 3D Building to launch the interactive Three.js 6-Bit spatial model, toggle Interior Cutaway, and inspect zone BIT-4-TG03.",
    underTheHood:
      "Links financial escrow holds and site defects directly to 3D structural elements with Gemini-powered zone triage.",
    selectors: ['[data-guide-target="open-3d-twin"]'],
  },
];

const SESSION_KEY = "quadillar-evaluator-disclaimer-seen-v2";

interface RectBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

function detectOpenOverlay(): boolean {
  const overlays = document.querySelectorAll(
    '.fixed.inset-0:not([data-walkthrough-disclaimer="true"]), [role="dialog"]:not([data-walkthrough-disclaimer="true"])'
  );
  for (const overlay of Array.from(overlays)) {
    const style = window.getComputedStyle(overlay);
    if (style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0") {
      return true;
    }
  }
  return false;
}

function closeOpenOverlays(): void {
  const overlays = document.querySelectorAll(
    '.fixed.inset-0:not([data-walkthrough-disclaimer="true"])'
  );
  overlays.forEach((overlay) => {
    const closeBtn = overlay.querySelector(
      '[data-overlay-close="true"], button[aria-label*="Close" i]'
    ) as HTMLButtonElement | null;
    if (closeBtn) {
      closeBtn.click();
    }
  });
}

function isTargetUnobstructed(el: HTMLElement, rect: RectBox): boolean {
  if (detectOpenOverlay()) return false;
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  if (cx < 0 || cy < 0 || cx > window.innerWidth || cy > window.innerHeight) {
    return false;
  }
  const topEl = document.elementFromPoint(cx, cy);
  if (!topEl) return false;
  return el === topEl || el.contains(topEl) || topEl.contains(el);
}

export default function EvaluatorWalkthrough() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [activeStepIdx, setActiveStepIdx] = useState<number | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [spotlightRect, setSpotlightRect] = useState<RectBox | null>(null);
  const [stepClicked, setStepClicked] = useState(false);
  const [hasOpenOverlay, setHasOpenOverlay] = useState(false);
  const [manualExpand, setManualExpand] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    try {
      const seen = sessionStorage.getItem(SESSION_KEY);
      if (!seen) {
        const timer = setTimeout(() => setShowDisclaimer(true), 600);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const onOpen = () => {
      closeOpenOverlays();
      setShowComplete(false);
      setActiveStepIdx(null);
      setSpotlightRect(null);
      setIsMinimized(false);
      setManualExpand(false);
      setShowDisclaimer(true);
    };
    window.addEventListener("quadillar-open-evaluator-guide", onOpen);
    return () => window.removeEventListener("quadillar-open-evaluator-guide", onOpen);
  }, []);

  // Reset per-step state ONLY when step index changes (never re-runs on click)
  useEffect(() => {
    setStepClicked(false);
    setIsMinimized(false);
    setManualExpand(false);
    setSpotlightRect(null);
  }, [activeStepIdx]);

  const currentStep = activeStepIdx !== null ? GUIDE_STEPS[activeStepIdx] : null;

  const findActiveElement = useCallback((step: GuideStep): HTMLElement | null => {
    for (const sel of step.selectors) {
      const el = document.querySelector(sel) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) return el;
      }
    }
    return null;
  }, []);

  useEffect(() => {
    if (!currentStep) {
      setSpotlightRect(null);
      setHasOpenOverlay(false);
      return;
    }

    let scrolledOnce = false;
    let boundEl: HTMLElement | null = null;

    const onTargetClick = (ev: Event) => {
      const targetEl = ev.currentTarget as HTMLElement | null;
      // In Step 4, allow clicking Tools dropdown to transition spotlight onto Legal Proof Cert
      if (targetEl?.getAttribute("data-quadmax-target") === "open-tools-menu") {
        setSpotlightRect(null);
        return;
      }
      setStepClicked(true);
      setSpotlightRect(null);
    };

    const syncState = () => {
      const overlayActive = detectOpenOverlay();
      setHasOpenOverlay(overlayActive);

      if (overlayActive || stepClicked) {
        setSpotlightRect(null);
        return;
      }

      const el = findActiveElement(currentStep);
      if (!el) {
        setSpotlightRect(null);
        return;
      }

      if (!scrolledOnce) {
        scrolledOnce = true;
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }

      if (boundEl !== el) {
        if (boundEl) boundEl.removeEventListener("click", onTargetClick);
        boundEl = el;
        boundEl.addEventListener("click", onTargetClick);
      }

      const r = el.getBoundingClientRect();
      const rawBox: RectBox = {
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      };

      if (!isTargetUnobstructed(el, rawBox)) {
        setSpotlightRect(null);
        return;
      }

      setSpotlightRect({
        top: r.top - 5,
        left: r.left - 5,
        width: r.width + 10,
        height: r.height + 10,
      });
    };

    syncState();
    const interval = setInterval(syncState, 180);
    window.addEventListener("resize", syncState);
    window.addEventListener("scroll", syncState, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", syncState);
      window.removeEventListener("scroll", syncState, true);
      if (boundEl) boundEl.removeEventListener("click", onTargetClick);
    };
  }, [currentStep, findActiveElement, stepClicked]);

  const dismissDisclaimer = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
    setShowDisclaimer(false);
  };

  const startWalkthrough = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, "1");
    } catch {}
    closeOpenOverlays();
    setShowDisclaimer(false);
    setShowComplete(false);
    setIsMinimized(false);
    setManualExpand(false);
    setActiveStepIdx(0);
  };

  const handleNext = () => {
    if (activeStepIdx === null) return;
    closeOpenOverlays();
    setSpotlightRect(null);
    if (activeStepIdx + 1 < GUIDE_STEPS.length) {
      setActiveStepIdx(activeStepIdx + 1);
    } else {
      setActiveStepIdx(null);
      setShowComplete(true);
    }
  };

  const handleBack = () => {
    if (activeStepIdx === null || activeStepIdx === 0) return;
    closeOpenOverlays();
    setSpotlightRect(null);
    setActiveStepIdx(activeStepIdx - 1);
  };

  const handleExit = () => {
    setActiveStepIdx(null);
    setSpotlightRect(null);
    setShowComplete(false);
  };

  const compactPillMode = Boolean(currentStep && (isMinimized || (hasOpenOverlay && !manualExpand)));

  return (
    <>
      {/* 1. Upfront Evaluator Disclaimer & Walkthrough Intro Modal */}
      {showDisclaimer && (
        <div
          data-walkthrough-disclaimer="true"
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-sans"
        >
          <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
                <Compass className="w-4 h-4" />
                <span>Interactive Evaluator Guide (90 Seconds)</span>
              </div>
              <button
                type="button"
                onClick={dismissDisclaimer}
                className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                aria-label="Close disclaimer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-zinc-300">
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold text-white">
                  Quadillar LiveView — Construction Operating Kernel
                </h2>
                <p className="text-zinc-400 leading-relaxed">
                  Please follow the 5 guided clicks below to understand what the software is doing
                  in real time. Every step corresponds directly to our Pitch Deck slides and hits
                  live production backends—nothing is pre-recorded or mocked.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
                  Live Production Systems Active In This Session
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Cpu className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Gemini 2.5 Flash Field & Vision AI</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Trigger-Locked Postgres (Sec. 65B)</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>IS 456:2000 Escrow Payment Gate</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-200">
                    <Box className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>LOD-400 3D BIM + Open /api/mcp</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="text-[10.5px] font-semibold uppercase tracking-wider text-zinc-400">
                  5 Guided Evaluation Steps
                </div>
                <ol className="space-y-1 text-[11.5px] text-zinc-300">
                  {GUIDE_STEPS.map((s) => (
                    <li key={s.id} className="flex items-center justify-between gap-2 py-0.5">
                      <span>
                        <strong className="text-white font-mono mr-1.5">0{s.stepNumber}.</strong>
                        {s.title}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                        {s.rubricTag}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={dismissDisclaimer}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 font-semibold cursor-pointer transition"
                >
                  Explore Freely
                </button>
                <button
                  type="button"
                  onClick={startWalkthrough}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold inline-flex items-center justify-center gap-2 cursor-pointer transition"
                >
                  <span>Start 5-Step Guided Evaluation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Unobstructed Spotlight Ring — NEVER rendered while any modal/drawer is open or after click */}
      {currentStep && spotlightRect && !stepClicked && !hasOpenOverlay && (
        <div
          className="fixed z-30 pointer-events-none rounded-2xl border-2 border-emerald-400 shadow-[0_0_0_4px_rgba(16,185,129,0.2),0_0_20px_rgba(16,185,129,0.4)] transition-all duration-150"
          style={{
            top: `${spotlightRect.top}px`,
            left: `${spotlightRect.left}px`,
            width: `${spotlightRect.width}px`,
            height: `${spotlightRect.height}px`,
          }}
        />
      )}

      {/* 3. Floating Interactive Guide — Auto-collapses to 1-line pill whenever a modal/drawer is open */}
      {currentStep && compactPillMode && (
        <div className="fixed bottom-3 left-3 z-[55] bg-zinc-950/95 backdrop-blur-md border border-emerald-500/50 rounded-full shadow-2xl px-3 py-1.5 font-sans text-xs flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono font-bold text-[10px]">
            STEP {currentStep.stepNumber}/{GUIDE_STEPS.length}
          </span>
          <span className="text-[11px] font-semibold text-zinc-200 max-w-[160px] truncate hidden sm:inline">
            {currentStep.title}
          </span>
          <button
            type="button"
            onClick={handleNext}
            className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer"
          >
            <span>{activeStepIdx === GUIDE_STEPS.length - 1 ? "Finish" : "Next Step"}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => {
              setIsMinimized(false);
              setManualExpand(true);
            }}
            className="p-1 rounded-full text-zinc-400 hover:text-white cursor-pointer"
            title="Expand guide card"
            aria-label="Expand guide card"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleExit}
            className="p-1 rounded-full text-zinc-500 hover:text-white cursor-pointer"
            title="Exit guide"
            aria-label="Exit guide"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {currentStep && !compactPillMode && (
        <div className="fixed bottom-4 left-4 z-[55] w-[355px] max-w-[calc(100vw-2rem)] bg-zinc-950/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl shadow-2xl p-3.5 font-sans text-xs space-y-2.5">
          <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 font-mono font-bold text-[10px]">
                STEP {currentStep.stepNumber} / {GUIDE_STEPS.length}
              </span>
              <span className="text-[10.5px] font-semibold text-zinc-400 truncate">
                {currentStep.rubricTag}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setIsMinimized(true);
                  setManualExpand(false);
                }}
                className="p-1 rounded-md text-zinc-400 hover:text-white cursor-pointer"
                aria-label="Minimize guide"
                title="Minimize guide"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleExit}
                className="p-1 rounded-md text-zinc-500 hover:text-white cursor-pointer"
                aria-label="Exit guide"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-white">{currentStep.title}</h3>
            <p className="text-emerald-300 font-medium leading-relaxed">
              {currentStep.actionInstruction}
            </p>
            <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 leading-relaxed">
              <span className="text-[10px] uppercase font-bold text-zinc-500 block mb-0.5">
                Under the hood ({currentStep.deckSync})
              </span>
              {currentStep.underTheHood}
            </div>
          </div>

          {stepClicked && (
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Clicked — inspect the live result, then continue.</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleBack}
              disabled={activeStepIdx === 0}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-semibold inline-flex items-center gap-1 disabled:opacity-40 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="px-4 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <span>
                {activeStepIdx === GUIDE_STEPS.length - 1 ? "Finish Guide" : "Next Step"}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 4. Evaluation Complete Summary Card */}
      {showComplete && (
        <div className="fixed bottom-4 left-4 z-[55] w-[355px] max-w-[calc(100vw-2rem)] bg-zinc-950/95 backdrop-blur-md border border-emerald-500/50 rounded-2xl shadow-2xl p-4 font-sans text-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Evaluation Walkthrough Complete</span>
            </div>
            <button
              type="button"
              onClick={handleExit}
              className="p-1 rounded-md text-zinc-500 hover:text-white cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-zinc-300 leading-relaxed">
            You have tested live telemetry hashing, Gemini 2.5 Flash field grounding, IS 456:2000
            payment locks, scannable Section 65B proof, and the 3D BIM twin.
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            <a
              href="/api/mcp"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-semibold inline-flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Inspect /api/mcp</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={startWalkthrough}
              className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold cursor-pointer"
            >
              Restart Guide
            </button>
          </div>
        </div>
      )}
    </>
  );
}
