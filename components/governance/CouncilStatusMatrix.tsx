"use client";

import React, { useState } from "react";
import { runAutonomousCouncilAudit, CouncilAuditReport, AgentVerdict } from "@/app/actions/council-actions";
import { ShieldCheck, ShieldAlert, Cpu, RefreshCw, CheckCircle2, AlertTriangle, Radio } from "lucide-react";

interface Props {
  initialReport?: CouncilAuditReport;
  projectId?: string;
}

export function CouncilStatusMatrix({ initialReport, projectId = "GOMTI-NAGAR-PH1-FITOUT" }: Props) {
  const [report, setReport] = useState<CouncilAuditReport | undefined>(initialReport);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunAudit = async () => {
    setIsRunning(true);
    try {
      const res = await runAutonomousCouncilAudit(projectId);
      setReport(res);
    } finally {
      setIsRunning(false);
    }
  };

  const activeHolds = report?.verdicts.filter((v) => v.status === "ACTIVE_HOLD").length || 0;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 font-mono text-xs select-none space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-950/60 border border-cyan-800 text-cyan-400">
            <Cpu className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
              AI Statutory &amp; Engineering Governance Cluster
            </div>
            <h3 className="text-sm font-bold text-white uppercase mt-0.5">
              Autonomous Council (11 Domain Governors)
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className={`px-2.5 py-1 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
            activeHolds > 0
              ? "bg-rose-950/80 border-rose-800 text-rose-300"
              : "bg-emerald-950/80 border-emerald-800 text-emerald-300"
          }`}>
            {activeHolds > 0 ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>{activeHolds} Active Hold(s)</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>All 11 Governors Clear</span>
              </>
            )}
          </span>

          <button
            type="button"
            onClick={handleRunAudit}
            disabled={isRunning}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded border border-zinc-700 text-[10px] uppercase font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${isRunning ? "animate-spin" : ""}`} />
            <span>{isRunning ? "Auditing..." : "Trigger Audit"}</span>
          </button>
        </div>
      </div>

      {/* MATRIX OF 11 AGENTS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 pt-1">
        {(report?.verdicts || []).map((agent) => {
          const isHold = agent.status === "ACTIVE_HOLD";
          const isStandby = agent.status === "STANDBY_NO_DATA";

          return (
            <div
              key={agent.agentName}
              className={`p-3 rounded-xl border transition-all ${
                isHold
                  ? "bg-rose-950/30 border-rose-800/80"
                  : isStandby
                  ? "bg-zinc-950/50 border-zinc-850"
                  : "bg-zinc-950 border-zinc-800/80 hover:border-zinc-700"
              }`}
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-white text-xs uppercase flex items-center gap-1">
                  <span>{agent.agentName}</span>
                </span>
                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                  isHold
                    ? "bg-rose-950 text-rose-400 border border-rose-800"
                    : isStandby
                    ? "bg-zinc-900 text-zinc-500 border border-zinc-800"
                    : "bg-emerald-950 text-emerald-400 border border-emerald-800"
                }`}>
                  {agent.status}
                </span>
              </div>

              <div className="text-[10px] text-zinc-500 font-sans mt-0.5 truncate">{agent.domain}</div>
              <div className="text-[9px] text-cyan-400/80 font-mono mt-1 truncate">{agent.governingStandard}</div>

              <p className="text-[10px] text-zinc-300 font-sans mt-2 line-clamp-2 leading-relaxed">
                {agent.verdictText}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CouncilStatusMatrix;
