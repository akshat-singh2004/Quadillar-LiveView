// @refresh reset
"use client";

import React, { useState, useEffect, useRef } from "react";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";
import {
  dispatchVanguardGovernorQuery,
  AgentSynthesisResponse,
} from "@/lib/agents/quadillarAgentMesh";
import { useLiveviewTheme } from "@/lib/theme/liveviewTheme";

const POS_STORAGE_KEY = "quadmax-draggable-pill-pos-v1";
const PILL_WIDTH = 138;
const PILL_HEIGHT = 34;

export default function QuadmaxKernelFloatingWidget() {
  const { isLight } = useLiveviewTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<AgentSynthesisResponse>(() =>
    dispatchVanguardGovernorQuery("Project Vanguard campus overview", "MINERVA")
  );

  // Viewport coordinates (top-left of the compact pill)
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

  // Initialize clamped position from localStorage or default bottom-right
  useEffect(() => {
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

  const handleAsk = (qText?: string) => {
    const prompt = (qText ?? query).trim();
    if (!prompt) return;
    setResult(dispatchVanguardGovernorQuery(prompt));
    if (!qText) setQuery("");
  };

  if (!pos) return null;

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
      {/* Smart-Anchored Expandable Kernel Drawer */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            ...(openUpward ? { bottom: `${PILL_HEIGHT + 8}px` } : { top: `${PILL_HEIGHT + 8}px` }),
            ...(alignRight ? { right: 0 } : { left: 0 }),
          }}
          className="w-80 bg-slate-950/95 backdrop-blur-xl border border-cyan-500/50 rounded-2xl shadow-2xl p-3.5 flex flex-col gap-2.5 text-xs text-slate-100 select-text"
        >
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <div>
              <div className="font-bold text-cyan-400 text-[11px]">QUADMAX.AI • LIVEVIEW OS</div>
              <div className="text-[9px] text-slate-400">
                {VANGUARD_GENOME.projectId} • ₹{VANGUARD_GENOME.financials.epcBaselineCr.toFixed(2)} Cr
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white font-bold px-1.5 py-0.5 rounded bg-slate-900 text-[10px]"
            >
              ✕
            </button>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2.5 flex flex-col gap-1.5">
            <div className="flex justify-between items-center text-[9px]">
              <span className="font-bold text-emerald-400">GOV: {result.primaryGovernor}</span>
              <span className="text-slate-400">6 BITS SYNCED</span>
            </div>
            <div className="font-bold text-white text-[11px] leading-snug">{result.headline}</div>
            <div className="text-[10px] text-slate-300 leading-relaxed">{result.summary}</div>
            <div className="flex gap-1.5 pt-1">
              <a
                href={result.deepLink.href}
                className="flex-1 py-1 px-2 bg-cyan-500 text-slate-950 font-bold text-[10px] rounded-lg text-center"
              >
                {result.deepLink.label} →
              </a>
              <a
                href="/site/agent-console"
                className="py-1 px-2 bg-slate-950 border border-slate-700 text-cyan-300 font-bold text-[10px] rounded-lg"
              >
                CONSOLE
              </a>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            {[
              { label: "Node #14B", q: "Audit BIT-2 Node #14B snag" },
              { label: "Crane 38.5°", q: "Check Liebherr 280 EC-H crane radar" },
              { label: "₹864.5 Cr", q: "Reconcile ₹864.50 Cr baseline and retention" },
              { label: "2,400 TR", q: "Verify Column C2 and 2,400 TR chillers" },
            ].map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => handleAsk(chip.q)}
                className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[9px] text-cyan-300"
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="flex gap-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAsk()}
              placeholder="Ask ARGUS, MIDAS, MINERVA..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[10px] text-white outline-none focus:border-cyan-400"
            />
            <button
              type="button"
              onClick={() => handleAsk()}
              className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] rounded-lg"
            >
              ASK
            </button>
          </div>
        </div>
      )}

      {/* Compact Movable Pill Button */}
      <div
        role="button"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") setIsOpen((v) => !v);
        }}
        title="Drag to move anywhere • Click to toggle QUADMAX.AI"
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
          className="text-[10px] leading-none tracking-tighter pr-1"
        >
          ⋮⋮
        </span>
        <span
          style={{ backgroundColor: isLight ? "#C96442" : "#22D3EE" }}
          className="w-2 h-2 rounded-full animate-pulse shrink-0"
        />
        <span className="text-[10px] font-bold tracking-tight ml-1.5">QUADMAX.AI</span>
      </div>
    </div>
  );
}
