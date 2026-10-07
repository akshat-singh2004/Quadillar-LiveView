// app/setup/charter/page.tsx
import React from "react";
import { ProjectHandshakeForm } from "@/components/setup/ProjectHandshakeForm";
import { Scale, ShieldCheck } from "lucide-react";

export const metadata = {
  title: "Project Charter & Statutory Handshake | Quadillar LiveView",
  description:
    "Zero-trust onboarding gateway enforcing Phase 1 identity verification and Phase 2 statutory countersigning under FIDIC and CPWD contracts.",
};

export default function ProjectCharterPage() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center p-6 font-sans text-zinc-100">
      <div className="w-full max-w-5xl my-auto space-y-6">
        {/* ===================================================================
            HEADER: Project Charter & Statutory Handshake
            =================================================================== */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 text-zinc-400">
                <Scale className="h-3 w-3 mr-1 text-zinc-400" />
                FIDIC Red Book / CPWD Works Manual Standard
              </span>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-950/40 border border-emerald-800 text-emerald-400">
                <ShieldCheck className="h-3 w-3 mr-1 text-emerald-400" />
                Phase 1 &amp; 2 Statutory Gateway
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100 font-mono">
              Quadillar LiveView: Project Charter &amp; Statutory Handshake (FIDIC / CPWD)
            </h1>
            <p className="text-xs text-zinc-400 font-mono mt-1">
              Zero-Trust Onboarding Gateway: Locks the legal contract baseline, commencement date, and digital signatures before live dashboard activation.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-3">
            <div className="bg-zinc-900 border border-zinc-800 px-3.5 py-2 text-right font-mono">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500">Security Standard</div>
              <div className="text-xs font-bold text-zinc-300">Zero-Trust Dual Sign-Off</div>
            </div>
          </div>
        </header>

        {/* ===================================================================
            MAIN SECTION: Project Handshake Form
            =================================================================== */}
        <section>
          <ProjectHandshakeForm />
        </section>
      </div>
    </main>
  );
}
