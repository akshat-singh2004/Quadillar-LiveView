"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  Lock, 
  Unlock, 
  ShieldAlert, 
  ShieldCheck, 
  Camera, 
  Sparkles, 
  Building2, 
  ArrowRight,
  ExternalLink
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

interface VerificationRule {
  id: string;
  milestone_id: string;
  verification_type: string;
  description: string;
  is_mandatory: boolean;
  is_verified: boolean;
  verified_by_role: string;
  verified_by_name?: string;
  verified_at?: string;
}

interface Allocation {
  id: string;
  milestone_id: string;
  contractor_name: string;
  trade_specialization: string;
  assigned_contract_value_inr: number;
  performance_status: string;
}

interface Milestone {
  id: string;
  project_id: string;
  sequence_order: number;
  title: string;
  description: string;
  target_completion_date: string;
  allocated_budget_inr: number;
  status: "Pending" | "In_Progress" | "Under_Verification" | "Certified_Completed";
  escrow_released: boolean;
  certified_at?: string;
  certified_by?: string;
  rules: VerificationRule[];
  allocations: Allocation[];
}

function formatInr(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${val.toLocaleString("en-IN")}`;
}

export function MilestoneManager() {
  const { role, project, tier } = useActiveRole();
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadMilestones = useCallback(async () => {
    try {
      const { data: msData } = await supabase
        .from("custom_milestones")
        .select("*")
        .eq("project_id", project.id)
        .order("sequence_order", { ascending: true });

      if (msData && msData.length > 0) {
        const msIds = msData.map((m) => m.id);

        const [{ data: allocData }, { data: rulesData }] = await Promise.all([
          supabase.from("contractor_milestone_allocations").select("*").in("milestone_id", msIds),
          supabase.from("milestone_verification_rules").select("*").in("milestone_id", msIds),
        ]);

        const populated = msData.map((m) => ({
          ...m,
          allocations: (allocData || []).filter((a) => a.milestone_id === m.id),
          rules: (rulesData || []).filter((r) => r.milestone_id === m.id),
        }));
        setMilestones(populated);
      } else {
        setMilestones([]);
      }
    } catch {
      // Fallback gracefully
    } finally {
      setLoading(false);
    }
  }, [project.id]);

  useEffect(() => {
    void loadMilestones();

    const channel = supabase
      .channel(`ms_realtime_${project.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_milestones" }, () => void loadMilestones())
      .on("postgres_changes", { event: "*", schema: "public", table: "milestone_verification_rules" }, () => void loadMilestones())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id, loadMilestones]);

  // Handle Hold-Point Verification by Authorized Roles
  const handleVerifyRule = async (rule: VerificationRule) => {
    setActionInProgress(rule.id);
    const now = new Date().toISOString();

    await supabase
      .from("milestone_verification_rules")
      .update({
        is_verified: true,
        verified_at: now,
        verified_by_name: `${role.label}`,
      })
      .eq("id", rule.id);

    await loadMilestones();
    setActionInProgress(null);
  };

  // Submit Milestone to Client for Final Escrow Clearance
  const handleSubmitForVerification = async (milestoneId: string) => {
    setActionInProgress(milestoneId);
    await supabase
      .from("custom_milestones")
      .update({ status: "Under_Verification" })
      .eq("id", milestoneId);

    await loadMilestones();
    setActionInProgress(null);
  };

  // Certify and Unlock Escrow Funds
  const handleCertifyMilestone = async (milestoneId: string) => {
    setActionInProgress(milestoneId);
    await supabase
      .from("custom_milestones")
      .update({
        status: "Certified_Completed",
        escrow_released: true,
        certified_at: new Date().toISOString(),
        certified_by: role.label,
      })
      .eq("id", milestoneId);

    await loadMilestones();
    setActionInProgress(null);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING PROJECT MILESTONE LEDGER...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 space-y-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
            <span>Escrow & Stage Verification Engine</span>
            <span>·</span>
            <span className="text-zinc-400">{project.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
            Governed Milestone Ledger
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Atomic stage-gate clearance. Financial release is cryptographically locked until mandatory hold-point criteria are sealed.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs">
            Tier: <strong className="text-white">{tier}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 font-mono text-xs">
            Active Persona: {role.label}
          </span>
        </div>
      </div>

      {/* MILESTONE LIST */}
      <div className="space-y-6">
        {milestones.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950 text-zinc-500 text-xs">
            No milestones configured for {project.name}. Run database seed migration to populate.
          </div>
        ) : (
          milestones.map((m) => {
            const allMandatoryVerified = m.rules.filter((r) => r.is_mandatory).every((r) => r.is_verified);
            const totalAllocatedToTrades = m.allocations.reduce((sum, a) => sum + Number(a.assigned_contract_value_inr), 0);
            const verifiedRulesCount = m.rules.filter((r) => r.is_verified).length;

            return (
              <div
                key={m.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-6 shadow-xl backdrop-blur-sm transition-all"
              >
                {/* MILESTONE TITLE BAR */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-800/80 gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-zinc-800 text-zinc-300">
                        SEQUENCE 0{m.sequence_order}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        m.status === "Certified_Completed"
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-700/60"
                          : m.status === "Under_Verification"
                          ? "bg-amber-950 text-amber-300 border border-amber-700/60 animate-pulse"
                          : "bg-blue-950 text-blue-300 border border-blue-700/60"
                      }`}>
                        {m.status.replace("_", " ")}
                      </span>
                      {m.escrow_released && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                          <Unlock className="w-3 h-3" /> Escrow Disbursed
                        </span>
                      )}
                    </div>

                    <h2 className="text-xl font-bold text-white mt-2 tracking-tight">
                      {m.title}
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1 max-w-3xl">
                      {m.description}
                    </p>
                  </div>

                  {/* BUDGET & METADATA BADGES */}
                  <div className="flex sm:flex-col items-end justify-between sm:justify-center border-t sm:border-t-0 border-zinc-800/60 pt-3 sm:pt-0">
                    <div className="text-[11px] font-mono uppercase text-zinc-400">Total Milestone Value</div>
                    <div className="text-2xl font-extrabold text-white font-mono mt-0.5">
                      {formatInr(m.allocated_budget_inr)}
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1">
                      Target: <strong className="text-zinc-300">{m.target_completion_date}</strong>
                    </div>
                  </div>
                </div>

                {/* 2-COLUMN SPLIT: CONTRACTORS (LEFT) vs VERIFICATION GATES (RIGHT) */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* LEFT: CONTRACTOR SCOPE ALLOCATION (5 cols) */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-300">
                      <span>Trade Allocations ({m.allocations.length})</span>
                      <span className="font-mono text-zinc-400 text-[11px]">
                        Allocated: {formatInr(totalAllocatedToTrades)}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {m.allocations.map((alloc) => (
                        <div
                          key={alloc.id}
                          className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 flex items-center justify-between"
                        >
                          <div>
                            <div className="text-xs font-bold text-zinc-200">
                              {alloc.contractor_name}
                            </div>
                            <div className="text-[11px] text-zinc-400 mt-0.5 flex items-center gap-1.5">
                              <span>{alloc.trade_specialization}</span>
                              <span>·</span>
                              <span className="text-emerald-400">{alloc.performance_status.replace("_", " ")}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-xs font-bold text-zinc-100">
                              {formatInr(alloc.assigned_contract_value_inr)}
                            </div>
                            <div className="text-[10px] text-zinc-400 uppercase tracking-tight mt-0.5">
                              Contract Cap
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* RIGHT: ATOMIC VERIFICATION GATES (7 cols) */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-zinc-300">
                      <span>Mandatory Hold-Point Gates ({verifiedRulesCount}/{m.rules.length})</span>
                      <span className={`text-[10px] font-mono ${allMandatoryVerified ? "text-emerald-400" : "text-amber-400"}`}>
                        {allMandatoryVerified ? "All Mandatories Cleared" : "Hold-Points Active"}
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {m.rules.map((rule) => {
                        const canThisRoleSign = 
                          role.id === rule.verified_by_role || 
                          role.id === "PRINCIPAL_ARCHITECT" || 
                          role.id === "PMC_LEAD";

                        return (
                          <div
                            key={rule.id}
                            className={`rounded-xl border p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              rule.is_verified
                                ? "border-emerald-900/60 bg-emerald-950/20"
                                : "border-zinc-800 bg-zinc-900/40"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              {rule.is_verified ? (
                                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-zinc-100">
                                    {rule.verification_type}
                                  </span>
                                  {rule.is_mandatory && (
                                    <span className="text-[9px] font-mono font-semibold text-rose-400 bg-rose-950/80 px-1.5 py-0.2 rounded border border-rose-800/40 uppercase">
                                      Mandatory Gate
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-1">
                                  {rule.description}
                                </p>
                                <div className="text-[10px] font-mono text-zinc-400 mt-1">
                                  {rule.is_verified ? (
                                    <span className="text-emerald-400">
                                      Sealed by {rule.verified_by_name ?? rule.verified_by_role} · {new Date(rule.verified_at!).toLocaleDateString("en-IN")}
                                    </span>
                                  ) : (
                                    <span>Requires: {rule.verified_by_role}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* SIGN-OFF INTERACTION */}
                            <div className="self-end sm:self-center shrink-0">
                              {rule.is_verified ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 px-2.5 py-1 rounded bg-emerald-950/40 border border-emerald-800/60">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                                </span>
                              ) : canThisRoleSign ? (
                                <button
                                  type="button"
                                  disabled={actionInProgress === rule.id}
                                  onClick={() => handleVerifyRule(rule)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition shadow-sm"
                                >
                                  <FileCheck className="w-3.5 h-3.5" />
                                  <span>Sign Gate</span>
                                </button>
                              ) : (
                                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                                  Awaiting {rule.verified_by_role}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

                {/* BOTTOM ESCROW CONTROL BAR */}
                <div className="mt-6 pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <Lock className="w-4 h-4 text-amber-400" />
                    <span>
                      Financial condition:{" "}
                      <strong className={allMandatoryVerified ? "text-emerald-400" : "text-amber-400"}>
                        {allMandatoryVerified 
                          ? "All mandatory hold-points passed. Ready for certification." 
                          : "Clearance held until all mandatory criteria receive digital seal."}
                      </strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2.5">
                    {m.status === "In_Progress" && (
                      <button
                        type="button"
                        disabled={actionInProgress === m.id}
                        onClick={() => handleSubmitForVerification(m.id)}
                        className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition"
                      >
                        Submit for Verification
                      </button>
                    )}

                    {m.status !== "Certified_Completed" && (
                      <button
                        type="button"
                        disabled={!allMandatoryVerified || actionInProgress === m.id}
                        onClick={() => handleCertifyMilestone(m.id)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition ${
                          allMandatoryVerified
                            ? "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-lg shadow-emerald-950/50 cursor-pointer"
                            : "bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed"
                        }`}
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>Certify & Release Escrow</span>
                      </button>
                    )}

                    {m.status === "Certified_Completed" && (
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-950 border border-emerald-800/60 text-emerald-300 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Certified by {m.certified_by}
                      </span>
                    )}
                  </div>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}