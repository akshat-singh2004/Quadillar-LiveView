"use client";

import React, { useState } from "react";
import { askGovernorAdvisor, GovernorResponse } from "@/app/actions/governor-chat-actions";
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Loader2,
  X,
  MessageSquare,
  HelpCircle,
} from "lucide-react";

interface Props {
  governorId: "Aegis" | "Daedalus" | "Argus" | "Vulcan" | "Plutus" | "Ananke" | "Midas" | "Chronos" | "Themis" | "Minerva";
  projectId?: string;
  defaultOpen?: boolean;
}

export function GovernorInteractiveCopilot({
  governorId,
  projectId = "GOMTI-NAGAR-PH1-FITOUT",
  defaultOpen = false,
}: Props) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatLog, setChatLog] = useState<{ role: "user" | "governor"; text: string; data?: GovernorResponse }[]>([]);

  const handleSend = async (messageToSend?: string) => {
    const text = messageToSend || inputMessage;
    if (!text.trim()) return;

    const userEntry = { role: "user" as const, text };
    setChatLog((prev) => [...prev, userEntry]);
    if (!messageToSend) setInputMessage("");

    setLoading(true);
    try {
      const response = await askGovernorAdvisor({
        governorId,
        projectId,
        message: text,
      });

      setChatLog((prev) => [
        ...prev,
        { role: "governor" as const, text: response.answer, data: response },
      ]);
    } catch (err: any) {
      setChatLog((prev) => [
        ...prev,
        { role: "governor" as const, text: `Error connecting to ${governorId}: ${err?.message || "Internal reasoning fault"}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="font-mono text-xs select-none">
      {/* TRIGGER BUTTON (WHEN CLOSED) */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => {
            setIsOpen(true);
            if (chatLog.length === 0) {
              handleSend("Provide a status overview and standard audit.");
            }
          }}
          className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 font-bold uppercase text-[10px] transition flex items-center gap-1.5 cursor-pointer shadow-lg hover:border-emerald-500"
        >
          <Bot className="w-3.5 h-3.5 text-emerald-400" />
          <span>Consult {governorId} Copilot</span>
        </button>
      )}

      {/* DOCKED COPILOT PANEL (WHEN OPEN) */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[520px] animate-in slide-in-from-bottom duration-300">
          {/* HEADER */}
          <div className="p-3.5 bg-zinc-900 border-b border-zinc-800 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded bg-zinc-950 border border-zinc-800 text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <strong className="text-white text-xs block uppercase">Agent {governorId}</strong>
                <span className="text-[9px] text-zinc-400 block">Domain Copilot &amp; Statutory Advisor</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-zinc-500 hover:text-white p-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* CHAT MESSAGES BODY */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-zinc-950/80">
            {chatLog.length === 0 && (
              <div className="p-6 text-center text-zinc-500 font-sans space-y-2">
                <Bot className="w-8 h-8 text-zinc-700 mx-auto" />
                <p className="text-[11px]">
                  Ask {governorId} to audit site compliance, calculate mathematical thresholds, or explain statutory rules.
                </p>
              </div>
            )}

            {chatLog.map((entry, index) => (
              <div
                key={index}
                className={`space-y-2 ${entry.role === "user" ? "text-right" : "text-left"}`}
              >
                <div
                  className={`inline-block p-3 rounded-xl max-w-[90%] text-[11px] leading-relaxed ${
                    entry.role === "user"
                      ? "bg-zinc-800 text-white font-sans text-left"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-200 font-sans text-left"
                  }`}
                >
                  {entry.role === "governor" && (
                    <div className="flex items-center gap-1.5 text-[9px] text-emerald-400 uppercase font-bold font-mono mb-1 border-b border-zinc-800/80 pb-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>{entry.data?.statutoryStandard || `${governorId} Standard`}</span>
                    </div>
                  )}

                  <p>{entry.text}</p>

                  {/* EMBEDDED KPIS */}
                  {entry.data?.kpis && entry.data.kpis.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-zinc-800 grid grid-cols-1 gap-1 font-mono text-[9px]">
                      {entry.data.kpis.map((kpi, kIdx) => (
                        <div key={kIdx} className="flex justify-between items-center bg-zinc-950/60 p-1.5 rounded">
                          <span className="text-zinc-400">{kpi.label}:</span>
                          <strong className="text-emerald-400">{kpi.value}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SUGGESTED NEXT QUESTIONS */}
                {entry.data?.suggestedQuestions && entry.data.suggestedQuestions.length > 0 && (
                  <div className="space-y-1 text-left pt-1">
                    <span className="text-[8px] text-zinc-500 uppercase tracking-wider block font-bold">
                      Suggested Inquiries:
                    </span>
                    <div className="flex flex-col gap-1">
                      {entry.data.suggestedQuestions.map((q, qIdx) => (
                        <button
                          key={qIdx}
                          type="button"
                          onClick={() => handleSend(q)}
                          className="text-left text-[9px] p-1.5 rounded bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 hover:text-white transition flex items-center justify-between cursor-pointer"
                        >
                          <span className="truncate">{q}</span>
                          <ChevronRight className="w-3 h-3 text-zinc-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-zinc-500 text-[10px] p-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Agent {governorId} is evaluating statutory rules...</span>
              </div>
            )}
          </div>

          {/* INPUT FORM */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 bg-zinc-900 border-t border-zinc-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Ask ${governorId} (e.g. check standard limits)...`}
              className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-200 text-xs font-mono placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={loading || !inputMessage.trim()}
              className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
