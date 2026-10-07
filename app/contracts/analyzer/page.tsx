"use client";

import React, { useState } from "react";
import {
  FileText,
  AlertTriangle,
  ShieldCheck,
  Search,
  Scale,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

interface ClauseItem {
  id: string;
  clause_no: string;
  heading: string;
  source_framework: "FIDIC_RED_BOOK" | "CPWD_GCC_2023";
  risk_level: "HIGH" | "MEDIUM" | "LOW";
  original_text: string;
  deviation_finding: string;
  contractor_exposure: string;
}

const CLAUSE_DATABASE: ClauseItem[] = [
  {
    id: "cl-1",
    clause_no: "Clause 10B",
    heading: "Mobilization Advance & Interest Recovery",
    source_framework: "CPWD_GCC_2023",
    risk_level: "MEDIUM",
    original_text: "Simple interest @ 10% per annum shall be charged on the advance, recoverable pro-rata from Running Account bills.",
    deviation_finding: "Admissible per CPWD rules. Amortization must start when gross work reaches 10% of tender value.",
    contractor_exposure: "Interest burden recoverable if billing schedule slips beyond critical path float.",
  },
  {
    id: "cl-2",
    clause_no: "Clause 12",
    heading: "Deviations, Variations & Rate Derivation",
    source_framework: "CPWD_GCC_2023",
    risk_level: "HIGH",
    original_text: "Deviation limit of 30% for building works. Beyond deviation limit, market rates per CPWD DAR shall apply.",
    deviation_finding: "Tender includes onerous condition capping contractor market overhead to 10% instead of standard 15%.",
    contractor_exposure: "Severe commercial exposure on foundation excavation quantities exceeding 30% baseline.",
  },
  {
    id: "cl-3",
    clause_no: "Clause 20.1",
    heading: "Contractor Claims & 28-Day Notice Bar",
    source_framework: "FIDIC_RED_BOOK",
    risk_level: "HIGH",
    original_text: "If the Contractor fails to give notice of a claim within 28 days, the Employer is discharged from all liability.",
    deviation_finding: "Strict condition precedent. Barring clause legally enforceable under Indian Contract Act Section 28.",
    contractor_exposure: "Complete forfeiture of financial entitlement and EOT if notice is delayed beyond 28 days.",
  },
  {
    id: "cl-4",
    clause_no: "Clause 2",
    heading: "Liquidated Damages for Delay (LD Capping)",
    source_framework: "CPWD_GCC_2023",
    risk_level: "LOW",
    original_text: "Compensation for delay shall be @ 1.5% per month of delay computed on daily basis, subject to a maximum of 10%.",
    deviation_finding: "Standard CPWD clause with capped 10% exposure. No uncapped delay damages.",
    contractor_exposure: "Liability strictly capped at 10% of contract value.",
  },
];

export default function ContractAnalyzerPage() {
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [activeClause, setActiveClause] = useState<ClauseItem>(CLAUSE_DATABASE[1]);

  const filtered = CLAUSE_DATABASE.filter((c) => {
    const matchFilter = selectedFilter === "ALL" || c.risk_level === selectedFilter;
    const matchSearch =
      !search.trim() ||
      c.clause_no.toLowerCase().includes(search.toLowerCase()) ||
      c.heading.toLowerCase().includes(search.toLowerCase()) ||
      c.deviation_finding.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>CONTRACT INTELLIGENCE • AI CLAUSE AUDIT &amp; DEVIATION ENGINE</span>
              <StatutoryInfo
                standardRef="FIDIC RED BOOK & CPWD GCC 2023"
                title="AI Contract Specification & Risk Analyzer"
                idealRange="Risk Tolerance: Low to Moderate"
                description="Cross-references tender clauses against FIDIC / CPWD benchmarks to identify latent commercial risks, time-bar hazards, and deviation limit exposures."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-cyan-400" />
              <span>AI Contract Clause &amp; Tender Specification Analyzer</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Automated legal risk audit: clause-by-clause exposure assessment, statutory deviation analysis, and dispute mitigation recommendations.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded bg-cyan-950/80 border border-cyan-800 text-[10px] text-cyan-300">
              Active Benchmark: CPWD GCC 2023 / FIDIC Red Book
            </span>
          </div>
        </header>

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* CLAUSE LIST (5 cols) */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 p-5 space-y-4 rounded-sm">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase">Clause Risk Matrix ({filtered.length})</span>
              <div className="flex items-center gap-1.5">
                {["ALL", "HIGH", "MEDIUM", "LOW"].map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setSelectedFilter(level)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      selectedFilter === level
                        ? "bg-cyan-500 text-zinc-950"
                        : "bg-zinc-900 text-zinc-400 hover:text-white"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2.5">
              {filtered.map((c) => {
                const isSelected = activeClause.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setActiveClause(c)}
                    className={`p-3.5 rounded border transition cursor-pointer space-y-1.5 ${
                      isSelected
                        ? "border-cyan-500/60 bg-cyan-950/20"
                        : "border-zinc-800 bg-zinc-950 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-white">{c.clause_no}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                          c.risk_level === "HIGH"
                            ? "bg-rose-950 text-rose-400 border-rose-800"
                            : c.risk_level === "MEDIUM"
                            ? "bg-amber-950 text-amber-400 border-amber-800"
                            : "bg-emerald-950 text-emerald-400 border-emerald-800"
                        }`}
                      >
                        {c.risk_level} RISK
                      </span>
                    </div>
                    <div className="text-zinc-300 font-bold">{c.heading}</div>
                    <div className="text-[10px] text-zinc-500">{c.source_framework.replace(/_/g, " ")}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: CLAUSE DETAIL & RISK ASSESSMENT (7 cols) */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 p-6 space-y-5 rounded-sm shadow-2xl">
            <div className="border-b border-zinc-800 pb-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase text-cyan-400 font-bold">Clause Deep-Dive Audit</span>
                <h3 className="text-sm font-bold text-white mt-0.5">{activeClause.clause_no} &mdash; {activeClause.heading}</h3>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                  activeClause.risk_level === "HIGH"
                    ? "bg-rose-950 text-rose-400 border-rose-800"
                    : "bg-amber-950 text-amber-400 border-amber-800"
                }`}
              >
                {activeClause.risk_level} EXPOSURE
              </span>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-zinc-950 border border-zinc-800 rounded space-y-1.5">
                <span className="text-[10px] text-zinc-500 uppercase font-bold block">Contract Tender Specification Text:</span>
                <p className="text-xs text-zinc-200 font-sans italic leading-relaxed">
                  &ldquo;{activeClause.original_text}&rdquo;
                </p>
              </div>

              <div className="p-4 bg-amber-950/20 border border-amber-800/50 rounded space-y-1.5">
                <span className="text-[10px] text-amber-400 uppercase font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Statutory Deviation Finding:</span>
                </span>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {activeClause.deviation_finding}
                </p>
              </div>

              <div className="p-4 bg-rose-950/20 border border-rose-800/50 rounded space-y-1.5">
                <span className="text-[10px] text-rose-400 uppercase font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Commercial &amp; Financial Exposure Assessment:</span>
                </span>
                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  {activeClause.contractor_exposure}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-500 text-center">
              Benchmarked against standard FIDIC Conditions of Contract &amp; CPWD General Conditions of Contract 2023.
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
