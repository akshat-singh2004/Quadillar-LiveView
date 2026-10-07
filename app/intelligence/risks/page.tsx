"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  RefreshCw,
  Search,
  Database,
  TrendingDown,
  ShieldAlert,
  Flame,
  Zap,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export interface PredictiveRiskItem {
  id: string;
  project_id: string;
  risk_code: string;
  title: string;
  category: "Quality" | "Weather" | "Schedule" | "Commercial" | "Safety";
  probability: number;
  impact: number;
  estimated_cost_exposure: number;
  signal_description: string;
  mitigation_directive: string;
  status: "ACTIVE_MONITORING" | "MITIGATION_SCHEDULED" | "RESOLVED";
}

const FALLBACK_RISKS: PredictiveRiskItem[] = [
  {
    id: "rsk-fb-1",
    project_id: "PRJ-01-LIVE",
    risk_code: "RSK-001",
    title: "Quality Rejection & Cube Strength Deviation",
    category: "Quality",
    probability: 0.72,
    impact: 4,
    estimated_cost_exposure: 18500000,
    signal_description: "WIR rejection rate 18%; 7-day cube breaks trending 8% below characteristic target.",
    mitigation_directive: "Increase batching plant silt content tests and enforce IS 456 Clause 15 28-day accelerated water curing.",
    status: "ACTIVE_MONITORING",
  },
  {
    id: "rsk-fb-2",
    project_id: "PRJ-01-LIVE",
    risk_code: "RSK-002",
    title: "Monsoon Precipitation & High Wind Rigging Interlock",
    category: "Weather",
    probability: 0.55,
    impact: 3,
    estimated_cost_exposure: 9200000,
    signal_description: "Anemometer telemetry forecast projects wind speed > 38 km/h over the next 48 hours.",
    mitigation_directive: "Re-sequence facade installation to leeward podium sectors and pause tower crane tandem lifts.",
    status: "ACTIVE_MONITORING",
  },
  {
    id: "rsk-fb-3",
    project_id: "PRJ-01-LIVE",
    risk_code: "RSK-003",
    title: "Aging Design RFIs & Architectural Revisions",
    category: "Schedule",
    probability: 0.81,
    impact: 4,
    estimated_cost_exposure: 12400000,
    signal_description: "Open RFI aging exceeds 72 hours across Level 15 shear key details.",
    mitigation_directive: "Convene urgent BIM clash session with Principal Architect to sign off GFC Rev-04.",
    status: "ACTIVE_MONITORING",
  },
];

function formatInr(val: number) {
  if (Math.abs(val) >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (Math.abs(val) >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function PredictiveRisksPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Project 01 / Main Shell";

  const [risks, setRisks] = useState<PredictiveRiskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallbackMode, setIsFallbackMode] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const loadRisks = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("predictive_risk_register")
        .select("*")
        .eq("project_id", projectId)
        .order("impact", { ascending: false });

      if (error || !data || data.length === 0) {
        setIsFallbackMode(true);
        setRisks(FALLBACK_RISKS);
      } else {
        setIsFallbackMode(false);
        setRisks(data);
      }
    } catch {
      setIsFallbackMode(true);
      setRisks(FALLBACK_RISKS);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadRisks();
  }, [loadRisks]);

  const summary = useMemo(() => {
    const totalExposure = risks.reduce((sum, r) => sum + Number(r.estimated_cost_exposure || 0), 0);
    const highRisks = risks.filter((r) => r.impact >= 4).length;
    return { count: risks.length, totalExposure, highRisks };
  }, [risks]);

  const handleMitigate = async (id: string) => {
    try {
      await (supabase as any)
        .from("predictive_risk_register")
        .update({ status: "MITIGATION_SCHEDULED" })
        .eq("id", id);
    } catch {
      // optimistic
    }

    setRisks((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "MITIGATION_SCHEDULED" } : r))
    );
    setFeedback("Mitigation directive dispatched to critical path schedule.");
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>PREDICTIVE INTELLIGENCE • RISK FORECAST &amp; ANOMALY TELEMETRY</span>
              <StatutoryInfo
                standardRef="ISO 31000 / PMI EVM RISK"
                title="Predictive Construction Risk Matrix"
                idealRange="Critical Exposure < 10% Contract Sum"
                description="Cross-references leading indicators: WIR rejections, concrete maturity curves, RFI turnaround latencies, and weather forecasts to predict schedule slippage."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-cyan-400" />
              <span>Predictive Risk Intelligence &amp; Anomaly Engine</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • Leading risk signals, 5x5 severity matrix, and automated mitigation directives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isFallbackMode && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-950/80 border border-amber-800 text-[10px] text-amber-300">
                <Database className="w-3.5 h-3.5" />
                <span>Simulated Offline Telemetry</span>
              </span>
            )}
            <button
              onClick={() => void loadRisks()}
              disabled={loading}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded transition"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* 3 SUMMARY TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Total Estimated Exposure</span>
            <div className="text-2xl font-bold text-amber-400 mt-1">{formatInr(summary.totalExposure)}</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Quantified commercial liability</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">High Severity Threats (Impact &ge; 4)</span>
            <div className="text-2xl font-bold text-rose-400 mt-1">{summary.highRisks} Critical Risks</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Immediate mitigation required</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4 rounded-sm">
            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Active Monitored Signals</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">{summary.count} Leading Indicators</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Quality, Weather &amp; Schedule loops</span>
          </div>
        </div>

        {/* 5x5 RISK MATRIX */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
          <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
            5 &times; 5 Probability / Impact Risk Heatmap
          </span>

          <div className="grid grid-cols-5 gap-2 max-w-lg mx-auto">
            {Array.from({ length: 25 }, (_, idx) => {
              const impact = 5 - Math.floor(idx / 5);
              const prob = (idx % 5) + 1;
              const matches = risks.filter(
                (r) => r.impact === impact && Math.ceil(r.probability * 5) === prob
              );
              const score = impact * prob;

              return (
                <div
                  key={idx}
                  className={`h-12 rounded flex items-center justify-center font-bold text-xs border ${
                    score >= 16
                      ? "bg-rose-950/80 border-rose-800 text-rose-300"
                      : score >= 9
                      ? "bg-amber-950/80 border-amber-800 text-amber-300"
                      : "bg-cyan-950/60 border-cyan-800 text-cyan-300"
                  }`}
                  title={`Impact: ${impact}/5 &bull; Prob: ${prob}/5`}
                >
                  {matches.length > 0 ? `${matches.length} RSK` : ""}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-zinc-500 max-w-lg mx-auto">
            <span>Low Probability &bull; Low Impact</span>
            <span>High Probability &bull; Severe Impact</span>
          </div>
        </div>

        {/* RISK CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {risks.map((r) => {
            const isMitigated = r.status === "MITIGATION_SCHEDULED";
            return (
              <div key={r.id} className="p-5 bg-zinc-900/40 border border-zinc-800 rounded-sm space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-white text-xs">{r.risk_code}</span>
                    <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase border ${
                      r.impact >= 4 ? "bg-rose-950 text-rose-400 border-rose-800" : "bg-amber-950 text-amber-400 border-amber-800"
                    }`}>
                      {r.category} &bull; Imp: {r.impact}/5
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-zinc-100 font-sans">{r.title}</h3>

                  <div className="p-3 bg-zinc-950 border border-zinc-800 rounded space-y-1">
                    <span className="text-[10px] text-zinc-500 uppercase font-bold block">Signal:</span>
                    <p className="text-[11px] text-zinc-300 font-sans">{r.signal_description}</p>
                  </div>

                  <div className="p-3 bg-cyan-950/20 border border-cyan-800/40 rounded space-y-1">
                    <span className="text-[10px] text-cyan-400 uppercase font-bold block">Mitigation Directive:</span>
                    <p className="text-[11px] text-zinc-300 font-sans">{r.mitigation_directive}</p>
                  </div>

                  <div className="text-[11px] text-zinc-400 font-mono pt-1">
                    Exposure: <strong className="text-amber-400">{formatInr(Number(r.estimated_cost_exposure))}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isMitigated}
                  onClick={() => handleMitigate(r.id)}
                  className={`w-full py-2 rounded text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 ${
                    isMitigated
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                      : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950"
                  }`}
                >
                  {isMitigated ? "Mitigation Queued" : "Dispatch Mitigation"}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}
