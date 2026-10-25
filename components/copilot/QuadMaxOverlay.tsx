"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Cpu, X, Send, Play, Shield, Layers, Loader2, BookOpen, Activity } from "lucide-react";
import { askQuadMax, executeQuadMaxAction, QuadMaxMessage, QuadMaxAction } from "@/app/actions/quadmax-actions";
import { MiniClashViewport3D } from "@/components/bim/MiniClashViewport3D";


const STORAGE_KEY = "quadmax_chat_history_v1";

export function QuadMaxOverlay({ projectId = "GOMTI-NAGAR-PH1-FITOUT" }: { projectId?: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [messages, setMessages] = useState<QuadMaxMessage[]>([
    {
      role: "assistant",
      content: "### QuadMax Kernel Initialized\n\nI am **QuadMax**, the LiveView.OS cognitive kernel. I coordinate telemetry across all 11 Domain Governors, cross-referenced against the National Building Code (NBC 2016), IS 456, IS 13920, and FIDIC protocols.\n\nHow may I direct project governance today?",
      codeReferences: ["NBC 2016", "IS 456:2000", "FIDIC Red Book", "BSA 2023"],
    },
  ]);

  async function handleSend(queryText?: string) {
    const text = queryText || input;
    if (!text.trim() || loading) return;

    const userMsg: QuadMaxMessage = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setLoading(true);

    try {
      const reply = await askQuadMax(text, messages, projectId);
      setMessages((prev) => [...prev, reply]);
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Error connecting to QuadMax Synapse: " + e.message },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(action: QuadMaxAction) {
    setActionLoading(true);
    try {
      const res = await executeQuadMaxAction(action);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.success ? `✓ **QuadMax Action Executed**: ${res.message}` : `✗ **Action Failed**: ${res.message}`,
        },
      ]);
      if (res.success) {
        router.refresh();
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `✗ Execution Error: ${err.message}` },
      ]);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-700 text-white shadow-2xl hover:shadow-cyan-500/30 border border-cyan-400/40 transition transform hover:-translate-y-1 group"
        >
          <div className="relative">
            <Cpu className="w-5 h-5 text-cyan-200" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold tracking-wider uppercase font-mono">QuadMax.AI</span>
            <span className="text-[10px] text-cyan-200">LiveView OS Kernel</span>
          </div>
          <span className="text-[9px] bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-400/30 text-cyan-200 font-mono">
            NBC 2016
          </span>
        </button>
      )}

      {isOpen && (
        <div className="w-[460px] h-[640px] rounded-2xl bg-slate-950 border border-cyan-900/50 shadow-2xl flex flex-col overflow-hidden backdrop-blur-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border-b border-cyan-900/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white tracking-wider flex items-center gap-2 font-mono">
                  QUADMAX LM
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    LIVEVIEW SYNAPSE ACTIVE
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">Autonomous Architectural & Statutory Intelligence</p>
              </div>
            </div>
            <button
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setMessages([{
                  role: "assistant",
                  content: "### QuadMax Memory Cleared\nSession reset to baseline zero-state.",
                  codeReferences: ["NBC 2016"],
                }]);
              }}
              title="Reset Memory"
              className="text-slate-400 hover:text-rose-400 p-1 rounded-lg hover:bg-slate-800/50 transition mr-1 font-mono text-[10px]"
            >
              [CLEAR]
            </button>
            <button onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/50 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Prompt Chips */}
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-900/50 border-b border-slate-800/60 overflow-x-auto text-[11px]">
            <button
              onClick={() => handleSend("Analyze active MEP clash at Grid F-8 and suggest code-compliant resolution")}
              className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-200 border border-slate-700/60 transition flex items-center gap-1.5 font-mono text-[10px]"
            >
              <Layers className="w-3 h-3 text-cyan-400" /> Resolve MEP Clash
            </button>
            <button
              onClick={() => handleSend("Review Midas 5-tier billing waterfall and liens on RA Bill #04")}
              className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-200 border border-slate-700/60 transition flex items-center gap-1.5 font-mono text-[10px]"
            >
              <Activity className="w-3 h-3 text-emerald-400" /> Check RA Bill
            </button>
            <button
              onClick={() => handleSend("Evaluate critical path delays under FIDIC Cl. 8.4")}
              className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-950/60 text-slate-300 hover:text-cyan-200 border border-slate-700/60 transition flex items-center gap-1.5 font-mono text-[10px]"
            >
              <Shield className="w-3 h-3 text-amber-400" /> Claims & EOT
            </button>
          </div>

          {/* Chat Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex flex-col gap-1.5 ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`rounded-xl p-3.5 max-w-[92%] leading-relaxed whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-cyan-600 text-white rounded-br-xs"
                      : "bg-slate-900/90 text-slate-200 border border-slate-800/80 rounded-bl-xs shadow-xl"
                  }`}
                >
                  {m.content}

                  {/* 3D Micro-Viewport Visual Pinpointer */}
                  {m.spatialVisual && (
                    <div className="mt-3 w-full">
                      <MiniClashViewport3D
                        gridLocation={m.spatialVisual.gridLocation}
                        structuralElement={m.spatialVisual.structuralElement}
                        mepElement={m.spatialVisual.mepElement}
                        penetrationMm={m.spatialVisual.penetrationMm}
                        dedicatedUrl={m.spatialVisual.dedicatedUrl}
                        height={180}
                      />
                    </div>
                  )}

                  {/* Regulatory Badges */}
                  {m.codeReferences && m.codeReferences.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap gap-1.5">
                      {m.codeReferences.map((ref, rIdx) => (
                        <span
                          key={rIdx}
                          className="inline-flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/50"
                        >
                          <BookOpen className="w-2.5 h-2.5" /> {ref}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Live Action Execution Button */}
                {m.actionAvailable && (
                  <div className="mt-1">
                    <button
                      onClick={() => handleAction(m.actionAvailable!)}
                      disabled={actionLoading}
                      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-semibold text-[11px] shadow-lg shadow-emerald-950/50 transition border border-emerald-400/30 disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Play className="w-3 h-3 fill-current" />
                      )}
                      {m.actionAvailable.label}
                    </button>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-cyan-400 text-xs italic">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                QuadMax reasoning across NBC 2016 and Council telemetry...
              </div>
            )}
          </div>

          {/* Prompt Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask QuadMax about codes, holds, bills, or actions..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition font-sans"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 disabled:opacity-40 transition shadow-lg shadow-cyan-950"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
