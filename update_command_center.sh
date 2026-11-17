#!/usr/bin/env bash
set -euo pipefail

cat << 'PAGE_EOF' > app/page.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";

// --- INLINE SVG ICONS (Zero external package dependencies) ---
const StarIcon = ({ filled = false, className = "w-3.5 h-3.5" }: { filled?: boolean, className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);
const ChevronDownIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
  </svg>
);
const ChevronUpIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
  </svg>
);
const ChatIcon = ({ className = "w-3 h-3" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);
const SendIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const CloseIcon = ({ className = "w-4 h-4" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// --- 11 AUTONOMOUS DOMAIN GOVERNORS ---
interface Governor {
  id: string;
  name: string;
  role: string;
  status: "NOMINAL" | "STANDBY";
  message: string;
  color: string;
  border: string;
  bg: string;
  expertise: string;
}

const DOMAIN_GOVERNORS: Governor[] = [
  { id: "AEGIS", name: "AEGIS", role: "Structural Quality & HSE", status: "NOMINAL", message: "IS 456 Table 11 compliance confirmed.", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", expertise: "Civil structural codes, pour card validations, worker safety, IS 456 compliance" },
  { id: "ARGUS", name: "ARGUS", role: "Site CV & Crane Radar", status: "STANDBY", message: "Telemetry offline. Manual PTZ override active.", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10", expertise: "Optical computer vision, crane collision zoning, site intrusion detection, video streams" },
  { id: "MIDAS", name: "MIDAS", role: "Commercial & Billing", status: "NOMINAL", message: "5-Tier statutory retainage & tax deduction algorithm active.", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", expertise: "RA billing, retention money, GST statutory deductions, commercial ledger balancing" },
  { id: "VULCAN", name: "VULCAN", role: "Materials & QA/QC", status: "NOMINAL", message: "10-day curing scan within 45.0%.", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", expertise: "Concrete compressive strength, rebar mill cert verification, BBS scrap optimization" },
  { id: "DAEDALUS", name: "DAEDALUS", role: "Hydration & Maturity", status: "STANDBY", message: "Concrete thermocouples required. Log pour to activate ASTM C1074.", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10", expertise: "Thermal hydration curves, formwork early-stripping maturity index, ASTM C1074 logging" },
  { id: "PLUTUS", name: "PLUTUS", role: "Finance & Escrow", status: "STANDBY", message: "Escrow tranches locked pending DPR sign-off.", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10", expertise: "Tripartite bank escrow disbursement, milestone verification, budget overrun control" },
  { id: "ANANKE", name: "ANANKE", role: "Plant & Machinery", status: "STANDBY", message: "Heavy plant CAN bus gateway standby. Operating on gsm edge.", color: "text-amber-400", border: "border-amber-500/30", bg: "bg-amber-500/10", expertise: "Telematics telemetry, diesel consumption tracking, batching plant calibration" },
  { id: "CHRONOS", name: "CHRONOS", role: "12-Segment Master CPM", status: "NOMINAL", message: "Topological critical path float positive.", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", expertise: "CPM network scheduling, critical path float analysis, milestone delay forecasting" },
  { id: "THEMIS", name: "THEMIS", role: "Contracts & Claims", status: "NOMINAL", message: "Contractual notices tracked; escalation delays assessed.", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", expertise: "FIDIC/CPWD contractual dispute risk, Clause 10CA price escalation, time extension (EOT)" },
  { id: "MINERVA", name: "MINERVA", role: "3D Spatial Analytics", status: "NOMINAL", message: "3D AABB interference clear.", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", expertise: "BIM clash detection, 3D volumetric calculations, MEP vs Structural interference analysis" },
  { id: "HERMES", name: "HERMES", role: "Notarization Core", status: "NOMINAL", message: "Continuous cryptographic Merkle notarization & Section 65B custody active.", color: "text-emerald-400", border: "border-emerald-500/30", bg: "bg-emerald-500/10", expertise: "Indian Evidence Act Section 65B compliance, SHA-256 tamper-evident chains, audit trails" }
];

export default function MasterCommandCenter() {
  const [pinnedAgentIds, setPinnedAgentIds] = useState<string[]>(["MIDAS", "HERMES"]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeChatAgent, setActiveChatAgent] = useState<Governor | null>(null);

  const togglePin = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setPinnedAgentIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const primaryAgents = DOMAIN_GOVERNORS.filter(g => pinnedAgentIds.includes(g.id));
  const dropdownAgents = DOMAIN_GOVERNORS.filter(g => !pinnedAgentIds.includes(g.id));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 flex flex-col gap-6">
      {/* 1. TOP HEADER & METRIC SUMMARY */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono text-cyan-400 tracking-widest uppercase">
              STATUTORY PROJECT GOVERNANCE • LUCKNOW-TECHPARK-PH1
            </div>
            <h1 className="text-xl font-bold tracking-tight mt-1">MASTER COMMAND CENTER</h1>
            <p className="text-xs text-slate-400">
              Lucknow IT City Technology Park - Tower A • Contract Baseline: <span className="text-slate-200 font-bold">₹4.50 Cr</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-xs font-mono bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 rounded">
              POSTGRES RLS ENFORCED
            </span>
          </div>
        </div>
      </div>

      {/* 2. KPI STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "CONTRACT VALUE (HT)", val: "₹4.50 Cr", sub: "Gomti Nagar Fit-Out" },
          { label: "CERTIFIED LINE VALUATION", val: "0 Verified Lines", sub: "Awaiting Architect Sign-off" },
          { label: "RETAINED ESCROW (5%)", val: "₹22.50 Lakh", sub: "DLP Tranche 1 & 2" },
          { label: "ACTIVE NCR / SNAGS", val: "₹0.00", sub: "0 Open Issues" },
          { label: "CRITICAL PATH FLOAT", val: "On Baseline (0d)", sub: "Phase 2 EOT Eligible", highlight: "text-emerald-400" },
        ].map((kpi, idx) => (
          <div key={idx} className="bg-slate-900/60 border border-slate-800 p-3.5 rounded-xl flex flex-col justify-center">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">{kpi.label}</span>
            <span className={`text-base md:text-lg font-bold mt-1 ${kpi.highlight || "text-white"}`}>{kpi.val}</span>
            <span className="text-[11px] text-slate-500 mt-0.5">{kpi.sub}</span>
          </div>
        ))}
      </div>

      {/* 3. SITE VIDEO REALITY GATEWAY & NOTARIZED AUDIT (MOVED ABOVE GOVERNORS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Reality Gateway */}
        <div className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center text-[11px] font-mono">
            <span className="text-cyan-400 uppercase tracking-widest font-semibold">SITE VIDEO & REALITY GATEWAY</span>
            <span className="text-slate-500">HARDWARE UNPAIRED</span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between min-h-[160px] bg-slate-950/60">
            <div className="flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono rounded bg-red-950/60 text-red-400 border border-red-500/40">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                LIVE • 1080P WHEP
              </span>
              <span className="text-xs font-mono text-slate-300">
                Tower Crane 01 (PTZ Slew) <span className="text-slate-500">[0.00 azimuth | 0.00 elev | 45.00 FOV]</span>
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-slate-400 pt-3 border-t border-slate-800/80">
              <div>PORT: <span className="text-cyan-400">854</span></div>
              <div>PROTOCOL: <span className="text-cyan-400">RTSP_OVER_WHEP</span></div>
              <div>PING: <span className="text-emerald-400">14ms</span></div>
            </div>
          </div>
        </div>

        {/* Right: Notarized Audit Stream */}
        <div className="border border-slate-800 rounded-xl bg-slate-900/40 overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex justify-between items-center text-[11px] font-mono">
            <span className="text-emerald-400 uppercase tracking-widest font-semibold">SECTION 65B NOTARIZED AUDIT STREAM</span>
            <span className="text-slate-500">IMMUTABLE MERKLE SEAL</span>
          </div>
          <div className="p-4 flex-1 flex flex-col justify-between min-h-[160px] bg-slate-950/60 font-mono text-xs">
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-slate-200">
                <span className="font-semibold text-emerald-300">Quarterly DLP Compliance Dossier Certified</span>
                <span className="text-[10px] text-slate-500">DOSSIER-DLP-Q1-2026-2027</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Zero open snags | 100% SLA compliance | Tranche 2 Escrow intact at ₹7,12,933.35
              </div>
            </div>
            <div className="text-[9px] text-slate-500 truncate pt-2 border-t border-slate-800/80">
              Merkle Root: 8602a21acb4ebb84334f603aebfe99933a40bbb0d235d818bcc0504cab1089d4
            </div>
          </div>
        </div>
      </div>

      {/* 4. PRIMARY VIEW GOVERNORS (PINNED TO DASHBOARD) */}
      {primaryAgents.length > 0 && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
              <StarIcon filled={true} className="w-3.5 h-3.5 text-amber-400" />
              PRIMARY VIEW GOVERNORS ({primaryAgents.length})
            </span>
            <span className="text-[10px] text-slate-500 font-mono">Pinned outside the dropdown for direct monitoring</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {primaryAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isPinned={true}
                onTogglePin={togglePin}
                onOpenChat={() => setActiveChatAgent(agent)}
              />
            ))}
          </div>
        </div>
      )}

      {/* 5. COLLAPSIBLE AUTONOMOUS COUNCIL DROPDOWN */}
      <div className="border border-slate-800 rounded-xl bg-slate-900/30 overflow-hidden">
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full px-4 py-3 bg-slate-900/80 hover:bg-slate-800/60 transition flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
              AUTONOMOUS COUNCIL ({DOMAIN_GOVERNORS.length} DOMAIN GOVERNORS)
            </span>
            <span className="px-2 py-0.5 text-[10px] font-mono bg-cyan-950 border border-cyan-500/40 text-cyan-400 rounded">
              {dropdownAgents.length} in dropdown • {primaryAgents.length} in primary view
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 font-mono text-xs">
            <span>{isDropdownOpen ? "Hide Agents" : "Show All Agents"}</span>
            {isDropdownOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </div>
        </button>

        {isDropdownOpen && (
          <div className="p-4 bg-slate-950/70 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {dropdownAgents.map(agent => (
              <AgentCard
                key={agent.id}
                agent={agent}
                isPinned={false}
                onTogglePin={togglePin}
                onOpenChat={() => setActiveChatAgent(agent)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 6. MODAL: AGENT CHAT & CROSS-DOMAIN SYNTHESIS */}
      {activeChatAgent && (
        <AgentChatModal
          agent={activeChatAgent}
          allGovernors={DOMAIN_GOVERNORS}
          onClose={() => setActiveChatAgent(null)}
        />
      )}
    </div>
  );
}

// --- SUB-COMPONENT: GOVERNOR CARD ---
function AgentCard({
  agent,
  isPinned,
  onTogglePin,
  onOpenChat
}: {
  agent: Governor;
  isPinned: boolean;
  onTogglePin: (e: React.MouseEvent, id: string) => void;
  onOpenChat: () => void;
}) {
  return (
    <div
      onClick={onOpenChat}
      className={`p-3.5 rounded-xl border bg-slate-900/60 hover:bg-slate-850 hover:border-cyan-500/50 cursor-pointer transition flex flex-col justify-between gap-3 relative group ${agent.border}`}
    >
      <div>
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-wide">{agent.name}</span>
              <span className={`px-1.5 py-0.2 text-[9px] font-mono rounded ${agent.bg} ${agent.color} border ${agent.border}`}>
                {agent.status}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">{agent.role}</div>
          </div>

          <button
            onClick={(e) => onTogglePin(e, agent.id)}
            title={isPinned ? "Remove from Primary View" : "Set as Primary View"}
            className={`p-1.5 rounded-lg border transition ${
              isPinned
                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                : "bg-slate-800 text-slate-500 border-slate-700 hover:text-amber-400 hover:border-amber-400/40"
            }`}
          >
            <StarIcon filled={isPinned} />
          </button>
        </div>

        <div className="text-xs font-mono text-slate-300 mt-2.5 leading-relaxed bg-slate-950/50 p-2 rounded border border-slate-800/80">
          &gt; {agent.message}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-500 group-hover:text-cyan-400 transition">
        <span>Open Agent Terminal</span>
        <ChatIcon />
      </div>
    </div>
  );
}

// --- SUB-COMPONENT: AGENT CHAT & CROSS-SYNTHESIS MODAL ---
function AgentChatModal({
  agent,
  allGovernors,
  onClose
}: {
  agent: Governor;
  allGovernors: Governor[];
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Array<{ sender: "user" | "agent"; text: string; crossAgents?: string[] }>>([
    {
      sender: "agent",
      text: `Secure Governor Link established. I am ${agent.name}, Domain Governor for ${agent.role}.\n\nCore Expertise: ${agent.expertise}.\nCurrent Status: ${agent.status} ("${agent.message}").\n\nYou can query my domain directly, or prompt me to synthesize data across other council governors.`
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, isProcessing]);

  const handleSendMessage = (textToSend?: string) => {
    const query = textToSend || inputValue;
    if (!query.trim() || isProcessing) return;

    setMessages(prev => [...prev, { sender: "user", text: query }]);
    if (!textToSend) setInputValue("");
    setIsProcessing(true);

    setTimeout(() => {
      let response = "";
      const lower = query.toLowerCase();

      // Check if comparing with other agents
      const matchedOtherAgents = allGovernors.filter(
        g => g.id !== agent.id && (lower.includes(g.id.toLowerCase()) || lower.includes(g.name.toLowerCase()))
      );

      if (matchedOtherAgents.length > 0 || lower.includes("compare") || lower.includes("synthesize") || lower.includes("add up")) {
        const agentNames = matchedOtherAgents.length > 0 ? matchedOtherAgents.map(a => a.name).join(" and ") : "the Council Network";
        response = `[CROSS-DOMAIN SYNTHESIS REPORT]\nQuerying telemetry from ${agentNames}...\n\nFrom my perspective as ${agent.name} (${agent.role}):\n• Cross-referenced telemetry against: ${matchedOtherAgents.map(a => `${a.name} [${a.status}: ${a.message}]`).join("; ") || "all 10 domain feeds"}.\n• My Domain Impact: No unmitigated clash found with our baseline.\n• Final Synthesis: Current risk level remains within approved variance tolerances for Lucknow IT City Tower A.`;
      } else {
        response = `[${agent.name} STATUS LOG]\nAnalyzing request against ${agent.role} parameters...\n• Telemetry Status: ${agent.status}\n• Active Protocol: ${agent.message}\n• Domain Assessment: All operational constraints for my sector are strictly accounted for in the master ledger.`;
      }

      setMessages(prev => [...prev, { sender: "agent", text: response }]);
      setIsProcessing(false);
    }, 700);
  };

  const otherGovernors = allGovernors.filter(g => g.id !== agent.id);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl flex flex-col h-[560px] max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`w-2.5 h-2.5 rounded-full ${agent.status === "NOMINAL" ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{agent.name} TERMINAL</span>
                <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-400">
                  {agent.role}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 font-mono">Direct Governor Interrogation & Synthesis Protocol</div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition">
            <CloseIcon />
          </button>
        </div>

        {/* Quick Synthesis Suggestion Strip */}
        <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-800 flex items-center gap-2 overflow-x-auto text-[10px] font-mono">
          <span className="text-slate-500 whitespace-nowrap">CROSS-AGENT SYNTHESIS:</span>
          {otherGovernors.slice(0, 4).map(other => (
            <button
              key={other.id}
              onClick={() => handleSendMessage(`Compare your status with ${other.name} (${other.role}) and give me a combined summary.`)}
              className="px-2 py-1 rounded bg-slate-800/80 hover:bg-cyan-950 hover:text-cyan-300 border border-slate-700 text-slate-300 whitespace-nowrap transition"
            >
              + Compare w/ {other.name}
            </button>
          ))}
        </div>

        {/* Chat History */}
        <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 font-mono text-xs bg-slate-950/40">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] p-3 rounded-xl whitespace-pre-line leading-relaxed ${
                  m.sender === "user"
                    ? "bg-cyan-600/20 text-cyan-200 border border-cyan-500/30"
                    : "bg-slate-900 border border-slate-800 text-slate-200"
                }`}
              >
                {m.sender === "agent" && (
                  <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest mb-1">
                    {agent.name} GOVERNOR RESPONSE:
                  </div>
                )}
                {m.text}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-slate-900 border border-slate-800 text-slate-400 p-3 rounded-xl flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping"></span>
                <span>Executing cross-domain synthesis query...</span>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
            placeholder={`Query ${agent.name} or prompt: "Compare data with [Agent]..."`}
            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={() => handleSendMessage()}
            disabled={!inputValue.trim() || isProcessing}
            className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition disabled:opacity-50 flex items-center justify-center"
          >
            <SendIcon />
          </button>
        </div>
      </div>
    </div>
  );
}
PAGE_EOF

# Copy to app/site/page.tsx so both routes match
mkdir -p app/site
cp app/page.tsx app/site/page.tsx

echo "============================================================"
echo "✓ Master Command Center applied directly to app/page.tsx!"
echo "============================================================"
