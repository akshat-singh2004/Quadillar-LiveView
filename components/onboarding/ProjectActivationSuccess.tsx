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
