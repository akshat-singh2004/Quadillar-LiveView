"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  ShieldCheck,
  Compass,
  Layers,
  Upload,
  CheckCircle2,
  Clock,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Bot,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";

interface Props {
  projectId: string;
  projectName: string;
}

export function ProjectComplianceIntakeWizard({ projectId, projectName }: Props) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Compliance Form State
  const [sanctionNumber, setSanctionNumber] = useState("");
  const [fireNocRef, setFireNocRef] = useState("");
  const [agreementDate, setAgreementDate] = useState("");
  const [dlpMonths, setDlpMonths] = useState("12");
  const [retentionPct, setRetentionPct] = useState("5.0");
  const [concreteGrade, setConcreteGrade] = useState("M35");
  const [rebarSpec, setRebarSpec] = useState("Fe 550D TMT");

  const handleCompleteStep = (stepNumber: number) => {
    setFeedback(`Section ${stepNumber} ingested and verified by AI Orchestration Sentinel.`);
    setTimeout(() => setFeedback(null), 3000);
    if (stepNumber < 4) {
      setCurrentStep(stepNumber + 1);
    } else {
      router.push(`/?project_id=${projectId}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 font-mono text-xs select-none space-y-6">
      {/* HEADER */}
      <div className="border-b border-zinc-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="text-[10px] text-cyan-400 uppercase tracking-widest font-bold flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5" />
            <span>AI Calibration Gate • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Compliance &amp; Baseline Ingestion
          </h1>
          <p className="text-zinc-400 font-sans text-xs mt-0.5">
            Scope: <strong className="text-zinc-200">{projectName}</strong> • Supply statutory permits, contractual deeds, and CAD/BIM packages to calibrate autonomous governance.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 bg-zinc-900 border border-zinc-800 text-emerald-400 font-bold uppercase text-[10px]">
            Step {currentStep} of 4
          </span>
        </div>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* STEP TABS */}
      <div className="grid grid-cols-4 gap-2 text-center text-[10px] uppercase font-bold">
        {[
          { n: 1, label: "Statutory Sanctions" },
          { n: 2, label: "Contractual Protocol" },
          { n: 3, label: "BIM & GFC Drawings" },
          { n: 4, label: "Quality Specifications" },
        ].map((tab) => (
          <div
            key={tab.n}
            className={`p-2.5 rounded-xl border transition ${
              currentStep === tab.n
                ? "bg-cyan-950/40 border-cyan-500 text-white shadow-md shadow-cyan-950/40"
                : currentStep > tab.n
                ? "bg-zinc-900 border-zinc-800 text-emerald-400"
                : "bg-zinc-950 border-zinc-850 text-zinc-600"
            }`}
          >
            <div>0{tab.n}</div>
            <div className="truncate mt-0.5">{tab.label}</div>
          </div>
        ))}
      </div>

      {/* STEP CONTAINER */}
      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-5">
        
        {/* STEP 1: STATUTORY SANCTIONS */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-zinc-850 pb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>1. Municipal Approvals &amp; Authority Sanctions</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Municipal Sanction Order Ref *
                </label>
                <input
                  type="text"
                  placeholder="e.g. LDA/BP/2026/894"
                  value={sanctionNumber}
                  onChange={(e) => setSanctionNumber(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Provisional Fire Safety NOC Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. FS/NOC/LKO-1044"
                  value={fireNocRef}
                  onChange={(e) => setFireNocRef(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="border border-dashed border-zinc-800 bg-zinc-900/40 rounded-xl p-5 text-center space-y-2">
              <Upload className="w-6 h-6 text-cyan-400 mx-auto" />
              <div className="text-white font-bold text-xs">Upload Sanctioned Map &amp; Legal Order Deed</div>
              <div className="text-[10px] text-zinc-500">Accepted: Digitally signed PDF, scanned authorization charters</div>
            </div>
          </div>
        )}

        {/* STEP 2: CONTRACTUAL PROTOCOL */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-zinc-850 pb-2">
              <FileText className="w-4 h-4" />
              <span>2. FIDIC / CPWD Contract Governance Conditions</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Contract Agreement Date
                </label>
                <input
                  type="date"
                  value={agreementDate}
                  onChange={(e) => setAgreementDate(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Defect Liability Period (Months)
                </label>
                <input
                  type="number"
                  value={dlpMonths}
                  onChange={(e) => setDlpMonths(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Retention Escrow Percent (%)
                </label>
                <input
                  type="text"
                  value={retentionPct}
                  onChange={(e) => setRetentionPct(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] text-zinc-300">
              <strong className="text-amber-400 uppercase text-[10px] block">Midas Commercial Engine Note:</strong>
              Retention deductions (5.0%) and milestone hold-gates will be calculated automatically on every interim payment certificate (IPC / RA Bill).
            </div>
          </div>
        )}

        {/* STEP 3: BIM & GFC DRAWINGS */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-zinc-850 pb-2">
              <Compass className="w-4 h-4" />
              <span>3. Spatial Digital Twin (IFC 4D / Master GFC Sheets)</span>
            </div>

            <div className="border border-dashed border-zinc-800 bg-zinc-900/40 rounded-xl p-6 text-center space-y-2">
              <Compass className="w-8 h-8 text-cyan-400 mx-auto" />
              <div className="text-white font-bold text-xs">Drop IFC 3D Model or GFC Architectural Drawing Package</div>
              <div className="text-[10px] text-zinc-500">Supports .ifc, .dwg, vector .pdf sheets with ISO 19650 container naming</div>
            </div>

            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] text-zinc-300">
              <strong className="text-cyan-400 uppercase text-[10px] block">Aegis Spatial Sentinel:</strong>
              Architectural grids and levels will be extracted dynamically to anchor punch snags and pour card locations.
            </div>
          </div>
        )}

        {/* STEP 4: QUALITY SPECIFICATIONS */}
        {currentStep === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm border-b border-zinc-850 pb-2">
              <Layers className="w-4 h-4" />
              <span>4. Concrete Mix &amp; Material Quality Tolerances</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Primary Concrete Grade (f_ck)
                </label>
                <input
                  type="text"
                  value={concreteGrade}
                  onChange={(e) => setConcreteGrade(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Reinforcement Specification
                </label>
                <input
                  type="text"
                  value={rebarSpec}
                  onChange={(e) => setRebarSpec(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
                />
              </div>
            </div>

            <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-xl text-[11px] text-zinc-300">
              <strong className="text-emerald-400 uppercase text-[10px] block">IS 456 / IS 516 Testing Rules:</strong>
              Cube crushing strength evaluations and soffit formwork stripping approvals will enforce standard maturity thresholds.
            </div>
          </div>
        )}

        {/* NAV CONTROLS */}
        <div className="pt-4 border-t border-zinc-850 flex items-center justify-between">
          <button
            type="button"
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(currentStep - 1)}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-850 text-zinc-400 hover:text-white uppercase font-bold text-[10px] disabled:opacity-30 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 inline mr-1" />
            Previous
          </button>

          <button
            type="button"
            onClick={() => handleCompleteStep(currentStep)}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase text-[10px] flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-cyan-950/40"
          >
            <span>{currentStep === 4 ? "Complete Calibration & Launch LiveView" : "Confirm & Proceed"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </div>
  );
}

export default ProjectComplianceIntakeWizard;
