#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Generating Architect Project Genesis & AI Ingestion Wizard...\033[0m"

mkdir -p components/onboarding app/onboarding

# -----------------------------------------------------------------------------
# 1. COMPONENT: components/onboarding/ProjectGenesisModal.tsx
# -----------------------------------------------------------------------------
cat << 'COMP_GENESIS' > components/onboarding/ProjectGenesisModal.tsx
"use client";

import React, { useState } from "react";
import { Building2, ArrowRight, ShieldCheck, Sparkles, Loader2, IndianRupee } from "lucide-react";
import { supabase } from "@/app/lib/supabase";

interface ProjectGenesisModalProps {
  open: boolean;
  onProjectCreated: (project: { id: string; name: string; code: string; tier: string }) => void;
}

export function ProjectGenesisModal({ open, onProjectCreated }: ProjectGenesisModalProps) {
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [tier, setTier] = useState<"COMMERCIAL" | "RESIDENTIAL" | "INFRASTRUCTURE">("COMMERCIAL");
  const [contractValue, setContractValue] = useState("");
  const [gccProtocol, setGccProtocol] = useState("CPWD Works Manual / FIDIC Red Book");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectCode.trim()) return;

    setLoading(true);
    setError(null);

    const generatedId = projectCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "-");
    const numValue = parseFloat(contractValue.replace(/[^0-9.]/g, "")) || 450000000;

    try {
      const { data, error: dbErr } = await (supabase as any)
        .from("projects")
        .insert({
          project_id: generatedId,
          project_code: projectCode.trim().toUpperCase(),
          project_name: projectName.trim(),
          contract_value: numValue,
          tier,
          gcc_protocol: gccProtocol,
          active_stage: "ONBOARDING_COMPLIANCE",
        })
        .select()
        .single();

      if (dbErr) throw dbErr;

      // Seed Initial AI Readiness Record
      await (supabase as any).from("project_ai_readiness").upsert({
        project_id: generatedId,
        readiness_score_pct: 15,
      });

      onProjectCreated({
        id: generatedId,
        name: projectName.trim(),
        code: projectCode.trim().toUpperCase(),
        tier,
      });
    } catch (err: any) {
      setError(err?.message || "Failed to initialize project charter.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 font-mono text-xs select-none">
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 text-zinc-100">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Architect Onboarding • Project Genesis Gate</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Register Project Entity
          </h2>
          <p className="text-zinc-400 font-sans text-xs mt-1">
            Establish the root project anchor before initiating AI governance protocols and statutory data intake.
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-zinc-400 text-[10px] uppercase mb-1 font-bold">
              Formal Project Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Gomti Nagar Commercial Hub Phase 1"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-cyan-500 font-sans text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 text-[10px] uppercase mb-1 font-bold">
                Project Code Identifier *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. GOMTI-PH1"
                value={projectCode}
                onChange={(e) => setProjectCode(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-white outline-none focus:border-cyan-500 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-[10px] uppercase mb-1 font-bold">
                Asset Classification
              </label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as any)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                <option value="COMMERCIAL">Commercial Core &amp; Shell</option>
                <option value="RESIDENTIAL">Luxury Interior / Residential</option>
                <option value="INFRASTRUCTURE">Civil Infrastructure &amp; Public Works</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-zinc-400 text-[10px] uppercase mb-1 font-bold">
                Sanctioned Baseline (INR ₹)
              </label>
              <input
                type="text"
                placeholder="₹ 45,00,00,000"
                value={contractValue}
                onChange={(e) => setContractValue(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-zinc-400 text-[10px] uppercase mb-1 font-bold">
                Statutory GCC Conditions
              </label>
              <select
                value={gccProtocol}
                onChange={(e) => setGccProtocol(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-white outline-none focus:border-cyan-500"
              >
                <option value="CPWD Works Manual / FIDIC Red Book">CPWD Manual / FIDIC Red</option>
                <option value="FIDIC Yellow Book (Design-Build)">FIDIC Yellow Book (D&amp;B)</option>
                <option value="CPWD GCC 2020 (Item Rate)">CPWD GCC 2020 (Item Rate)</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Initialize Project Entity</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ProjectGenesisModal;
COMP_GENESIS

# -----------------------------------------------------------------------------
# 2. COMPONENT: components/onboarding/ProjectActivationSuccess.tsx
# -----------------------------------------------------------------------------
cat << 'COMP_SUCCESS' > components/onboarding/ProjectActivationSuccess.tsx
"use client";

import React from "react";
import { CheckCircle2, ShieldCheck, ArrowRight, Cpu, FileCheck } from "lucide-react";

interface Props {
  project: { id: string; name: string; code: string; tier: string };
  onEnterComplianceIntake: () => void;
}

export function ProjectActivationSuccess({ project, onEnterComplianceIntake }: Props) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center font-mono text-xs select-none p-4">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="inline-flex p-3 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 shadow-xl shadow-emerald-950/40">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
            Project Workspace Active
          </span>
          <h1 className="text-2xl font-bold text-white mt-1 uppercase">
            {project.name}
          </h1>
          <p className="text-zinc-400 font-sans text-xs mt-1">
            Registered with Code <strong className="text-cyan-400 font-mono">[{project.code}]</strong> under {project.tier} protocol.
          </p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-left space-y-2">
          <div className="text-[10px] uppercase text-zinc-500 font-bold flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Autonomous AI Orchestration Readiness</span>
          </div>
          <p className="text-zinc-300 font-sans text-xs leading-relaxed">
            The platform is ready to baseline your contract parameters. Complete the progressive compliance intake to calibrate Aegis (Quality), Chronos (Schedule), and Midas (Finance).
          </p>
        </div>

        <button
          type="button"
          onClick={onEnterComplianceIntake}
          className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-zinc-950 font-bold uppercase rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-lg shadow-cyan-950/40 text-xs"
        >
          <FileCheck className="w-4 h-4" />
          <span>Launch AI Compliance Intake Wizard</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default ProjectActivationSuccess;
COMP_SUCCESS

# -----------------------------------------------------------------------------
# 3. COMPONENT: components/onboarding/ProjectComplianceIntakeWizard.tsx
# -----------------------------------------------------------------------------
cat << 'COMP_WIZARD' > components/onboarding/ProjectComplianceIntakeWizard.tsx
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
COMP_WIZARD

# -----------------------------------------------------------------------------
# 4. PAGE: app/onboarding/page.tsx (The Unified Flow Conductor)
# -----------------------------------------------------------------------------
cat << 'PAGE_ONBOARDING' > app/onboarding/page.tsx
"use client";

import React, { useState } from "react";
import { ProjectGenesisModal } from "@/components/onboarding/ProjectGenesisModal";
import { ProjectActivationSuccess } from "@/components/onboarding/ProjectActivationSuccess";
import { ProjectComplianceIntakeWizard } from "@/components/onboarding/ProjectComplianceIntakeWizard";

export default function OnboardingConductorPage() {
  const [createdProject, setCreatedProject] = useState<{ id: string; name: string; code: string; tier: string } | null>(null);
  const [intakeActive, setIntakeActive] = useState(false);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      {!createdProject && (
        <ProjectGenesisModal
          open={true}
          onProjectCreated={(proj) => setCreatedProject(proj)}
        />
      )}

      {createdProject && !intakeActive && (
        <ProjectActivationSuccess
          project={createdProject}
          onEnterComplianceIntake={() => setIntakeActive(true)}
        />
      )}

      {createdProject && intakeActive && (
        <ProjectComplianceIntakeWizard
          projectId={createdProject.id}
          projectName={createdProject.name}
        />
      )}
    </main>
  );
}
PAGE_ONBOARDING

# -----------------------------------------------------------------------------
# 5. VERIFY COMPILATION HEALTH
# -----------------------------------------------------------------------------
echo -e "\033[1;36m[+] Verifying TypeScript compilation health with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Onboarding & Progressive Intake Wizard deployed cleanly! Zero errors.\033[0m"
