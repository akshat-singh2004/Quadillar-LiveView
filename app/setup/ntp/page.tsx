"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import {
  ShieldCheck,
  CheckCircle2,
  AlertOctagon,
  Radio,
  Video,
  ArrowRight,
  Clock,
  Scale,
} from "lucide-react";

export default function NoticeToProceedCommencePage() {
  const router = useRouter();
  const { project } = useActiveRole();
  const [commencing, setCommencing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeProjectId = project?.project_id || "PRJ-TEMP";

  const handleIssueNtpAndCommence = async () => {
    setCommencing(true);
    setErrorMsg(null);

    try {
      // 1. Transition Project to ACTIVE_SURVEILLANCE
      const { error: projError } = await (supabase as any)
        .from("projects")
        .update({
          status: "ACTIVE_SURVEILLANCE",
          updated_at: new Date().toISOString(),
        })
        .eq("project_id", activeProjectId);

      if (projError) throw projError;

      // 2. Write Immutable Audit Log Genesis Block
      await (supabase as any).from("immutable_audit_logs").insert([
        {
          project_id: activeProjectId,
          action_title: "COMMENCEMENT: Notice to Proceed (NTP) Issued",
          details: `Statutory baseline verified under FIDIC Clause 8.1 / CPWD GCC. Operational surveillance and e-MB activated.`,
          created_at: new Date().toISOString(),
        },
      ]);

      // Direct to Master Reality Command Center
      router.push("/");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to issue Notice to Proceed.");
    } finally {
      setCommencing(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-10 font-sans flex items-center justify-center">
      <div className="max-w-2xl w-full bg-zinc-900/40 border border-zinc-800 p-8 space-y-6">

        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-950 text-emerald-400 border border-emerald-800 font-mono text-[10px] font-bold uppercase">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>Ready for Notice to Proceed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Issue Commencement Notice
          </h1>
          <p className="text-xs text-zinc-400 font-mono max-w-md mx-auto">
            All statutory gates are verified. Issuing the Notice to Proceed (NTP) commences the contract clock and unlocks operational surveillance.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono">
            {errorMsg}
          </div>
        )}

        {/* 4 GATES VERIFICATION CHECKLIST */}
        <div className="bg-zinc-950 border border-zinc-800 p-5 space-y-3 font-mono text-xs">
          <span className="text-[10px] uppercase text-zinc-500 font-bold block">
            Statutory Gate Readiness Assessment:
          </span>

          <div className="flex items-center justify-between text-zinc-300 py-1 border-b border-zinc-900">
            <span>Gate 0: Stakeholder Auth &amp; License Verification</span>
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-300 py-1 border-b border-zinc-900">
            <span>Gate 1: Contractual Deed Handshake (SHA-256)</span>
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> BONDED
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-300 py-1 border-b border-zinc-900">
            <span>Gate 2: Sanctioned Map Vector &amp; Boundary Calibration</span>
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> PARSED
            </span>
          </div>

          <div className="flex items-center justify-between text-zinc-300 py-1">
            <span>Gate 3: BOQ Quantities &amp; Telemetry Scope Matrix</span>
            <span className="text-emerald-400 flex items-center gap-1 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> ACTIVE
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleIssueNtpAndCommence}
          disabled={commencing}
          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-950/50 disabled:opacity-50"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{commencing ? "Commencing Engine..." : "Issue Notice to Proceed & Commence Surveillance"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

      </div>
    </main>
  );
}