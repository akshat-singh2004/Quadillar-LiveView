"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Award,
  Banknote,
  CheckCircle2,
  Clock,
  Download,
  FileCheck,
  FileSpreadsheet,
  Filter,
  HardHat,
  Layers,
  Lock,
  Printer,
  RefreshCw,
  Scale,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  Wrench
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

export interface HoldGate {
  id: string;
  name: string;
  is_mandatory: boolean;
  status: "VERIFIED" | "PENDING";
  verified_by?: string | null;
  verified_at?: string | null;
  spec_ref: string;
}

export interface GovernedMilestone {
  id: string;
  project_id: string;
  sequence_number: number;
  sequence_label: string;
  title: string;
  work_scope: string;
  trade_name: string;
  contractor_name: string;
  contractor_allocated_inr: number;
  total_milestone_value_inr: number;
  target_date: string;
  status: "IN_PROGRESS" | "READY_FOR_SUBMISSION" | "SUBMITTED" | "CERTIFIED_RELEASED";
  hold_gates: HoldGate[];
  financial_condition_cleared: boolean;
  certified_by?: string | null;
  certified_at?: string | null;
}

function formatInr(val: number) {
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} Lakh`;
  return `₹${Math.round(val || 0).toLocaleString("en-IN")}`;
}

export default function GovernedMilestonesPage() {
  const { project, role, tier } = useActiveRole();
  const [milestones, setMilestones] = useState<GovernedMilestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-default";
  const projectName = (project as any)?.project_name || (project as any)?.name || "Default Project";

  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || "Authorized Signatory";

  const isArchitectOrPmc =
    roleId === "PRINCIPAL_ARCHITECT" ||
    roleId === "PMC_LEAD" ||
    roleId === "RESIDENT_SEOR" ||
    roleId === "RESIDENT_ENGINEER" ||
    roleId === "PROJECT_DIRECTOR";

  const isContractor =
    roleId === "SPECIALTY_CONTRACTOR" ||
    roleId === "TRADE_CONTRACTOR";

  const loadMilestones = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("governed_milestone_ledger")
        .select("*")
        .eq("project_id", projectId)
        .order("sequence_number", { ascending: true });

      if (data && data.length > 0) {
        setMilestones(data as GovernedMilestone[]);
      } else {
        setMilestones(
          tier === "RESIDENTIAL"
            ? [
                {
                  id: "ms-res-01",
                  project_id: projectId,
                  sequence_number: 1,
                  sequence_label: "SEQUENCE 01",
                  title: "Civil Chasing & Electrical Conduit First-Fix",
                  work_scope: "Wall chasing, junction boxes, and concealed conduit runs.",
                  trade_name: "Avadh MEP Solutions",
                  contractor_name: "Avadh MEP Solutions",
                  contractor_allocated_inr: 85000,
                  total_milestone_value_inr: 120000,
                  target_date: "2026-08-30",
                  status: "IN_PROGRESS",
                  hold_gates: [
                    {
                      id: "hg-1",
                      name: "Plumbing Pressure Check",
                      is_mandatory: true,
                      status: "PENDING",
                      spec_ref: "Hold-point: 10-bar pneumatic test on CPVC lines.",
                    },
                    {
                      id: "hg-2",
                      name: "Consultant Conduit Sign-off",
                      is_mandatory: true,
                      status: "PENDING",
                      spec_ref: "Architect sign-off on concealed conduit locations.",
                    },
                  ],
                  financial_condition_cleared: false,
                },
                {
                  id: "ms-res-02",
                  project_id: projectId,
                  sequence_number: 2,
                  sequence_label: "SEQUENCE 02",
                  title: "Custom Millwork & Carcass Assembly",
                  work_scope: "HDHMR modular frames, carcass assembly, and hinge alignment.",
                  trade_name: "Royal Woodworkers & Interiors",
                  contractor_name: "Royal Woodworkers & Interiors",
                  contractor_allocated_inr: 190000,
                  total_milestone_value_inr: 280000,
                  target_date: "2026-09-28",
                  status: "READY_FOR_SUBMISSION",
                  hold_gates: [
                    {
                      id: "hg-3",
                      name: "Boilo HDHMR Batch Verification",
                      is_mandatory: true,
                      status: "VERIFIED",
                      verified_by: "Principal Architect",
                      verified_at: "2026-09-10T12:00:00Z",
                      spec_ref: "IS 12406 moisture-resistance test cleared.",
                    },
                    {
                      id: "hg-4",
                      name: "Carcass Squareness & Laser Level",
                      is_mandatory: true,
                      status: "VERIFIED",
                      verified_by: "Principal Architect",
                      verified_at: "2026-09-11T14:30:00Z",
                      spec_ref: "Laser plumb verification within ±1.0mm.",
                    },
                  ],
                  financial_condition_cleared: true,
                },
              ]
            : [
                {
                  id: "ms-twr-01",
                  project_id: projectId,
                  sequence_number: 1,
                  sequence_label: "SEQUENCE 01",
                  title: "Raft Foundation M40 Casting & Waterproofing",
                  work_scope: "2400 m³ continuous pour, thermocouple sensors, membrane installation.",
                  trade_name: "Civil & Superstructure",
                  contractor_name: "Narmada Concrete Works",
                  contractor_allocated_inr: 9800000,
                  total_milestone_value_inr: 12500000,
                  target_date: "2026-06-15",
                  status: "CERTIFIED_RELEASED",
                  hold_gates: [
                    {
                      id: "hg-t1",
                      name: "Rebar Cover & Chair Verification",
                      is_mandatory: true,
                      status: "VERIFIED",
                      verified_by: "Resident SEOR",
                      verified_at: "2026-06-10T08:00:00Z",
                      spec_ref: "IS 456 cover block compliance verified.",
                    },
                    {
                      id: "hg-t2",
                      name: "Thermal Gradient Simulation Cleared",
                      is_mandatory: true,
                      status: "VERIFIED",
                      verified_by: "Principal Architect",
                      verified_at: "2026-06-12T16:00:00Z",
                      spec_ref: "Core-to-surface delta < 20°C verified.",
                    },
                  ],
                  financial_condition_cleared: true,
                  certified_by: "Principal Architect",
                  certified_at: "2026-06-16T10:00:00Z",
                },
                {
                  id: "ms-twr-02",
                  project_id: projectId,
                  sequence_number: 2,
                  sequence_label: "SEQUENCE 02",
                  title: "Levels 01-04 Shear Core & PT Deck Pouring",
                  work_scope: "Post-tensioned slab tendons, ducting alignment, and concrete casting.",
                  trade_name: "Civil & Superstructure",
                  contractor_name: "Narmada Concrete Works",
                  contractor_allocated_inr: 11200000,
                  total_milestone_value_inr: 14500000,
                  target_date: "2026-09-30",
                  status: "IN_PROGRESS",
                  hold_gates: [
                    {
                      id: "hg-t3",
                      name: "PT Tendon Profile Clearance",
                      is_mandatory: true,
                      status: "PENDING",
                      spec_ref: "Specialty PT consultant physical inspection.",
                    },
                    {
                      id: "hg-t4",
                      name: "Formwork Stripping Cube Strength (IS 456)",
                      is_mandatory: true,
                      status: "PENDING",
                      spec_ref: "70% 28d strength (28 N/mm²) required prior to deck release.",
                    },
                  ],
                  financial_condition_cleared: false,
                },
              ]
        );
      }
    } catch {
      // Local fallback
    } finally {
      setLoading(false);
    }
  }, [projectId, tier]);

  useEffect(() => {
    void loadMilestones();

    const channel = supabase
      .channel(`milestones_sync_${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "governed_milestone_ledger" }, () => void loadMilestones())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadMilestones]);

  const handleToggleHoldGate = async (milestoneId: string, gateId: string) => {
    if (!isArchitectOrPmc) return;
    setActionInProgress(`gate_${gateId}`);

    const targetMilestone = milestones.find((m) => m.id === milestoneId);
    if (!targetMilestone) return;

    const updatedGates = targetMilestone.hold_gates.map((g) => {
      if (g.id === gateId) {
        const nextStatus = g.status === "VERIFIED" ? "PENDING" : "VERIFIED";
        return {
          ...g,
          status: nextStatus as "VERIFIED" | "PENDING",
          verified_by: nextStatus === "VERIFIED" ? roleLabel : null,
          verified_at: nextStatus === "VERIFIED" ? new Date().toISOString() : null,
        };
      }
      return g;
    });

    const allVerified = updatedGates.every((g) => g.status === "VERIFIED");
    const nextMilestoneStatus =
      allVerified && targetMilestone.status === "IN_PROGRESS"
        ? "READY_FOR_SUBMISSION"
        : !allVerified && targetMilestone.status === "READY_FOR_SUBMISSION"
        ? "IN_PROGRESS"
        : targetMilestone.status;

    const updatePayload = {
      hold_gates: updatedGates,
      financial_condition_cleared: allVerified,
      status: nextMilestoneStatus,
    };

    try {
      await (supabase as any).from("governed_milestone_ledger").update(updatePayload).eq("id", milestoneId);
    } catch {
      // Optimistic local update
    }

    setMilestones((prev) =>
      prev.map((m) => (m.id === milestoneId ? { ...m, ...updatePayload } : m))
    );
    setActionInProgress(null);
  };

  const handleSubmitForVerification = async (milestoneId: string) => {
    setActionInProgress(`submit_${milestoneId}`);
    const updatePayload = { status: "SUBMITTED" as const };

    try {
      await (supabase as any).from("governed_milestone_ledger").update(updatePayload).eq("id", milestoneId);
    } catch {
      // Optimistic local update
    }

    setMilestones((prev) =>
      prev.map((m) => (m.id === milestoneId ? { ...m, ...updatePayload } : m))
    );
    setActionInProgress(null);
  };

  const handleCertifyReleaseEscrow = async (milestoneId: string) => {
    if (!isArchitectOrPmc) return;
    setActionInProgress(`certify_${milestoneId}`);

    const updatePayload = {
      status: "CERTIFIED_RELEASED" as const,
      certified_by: roleLabel,
      certified_at: new Date().toISOString(),
    };

    try {
      await (supabase as any).from("governed_milestone_ledger").update(updatePayload).eq("id", milestoneId);
    } catch {
      // Optimistic local update
    }

    setMilestones((prev) =>
      prev.map((m) => (m.id === milestoneId ? { ...m, ...updatePayload } : m))
    );
    setActionInProgress(null);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center text-xs font-mono text-zinc-500">
        <Clock className="w-4 h-4 mr-2 animate-spin text-cyan-400" />
        LOADING GOVERNED ESCROW MILESTONES &amp; HOLD-GATE PROTOCOLS...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1600px] space-y-6">
        
        {/* TOP TITLE BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
              <span>Escrow &amp; Stage Verification Engine</span>
              <span>·</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
              Governed Milestone Ledger
            </h1>
            <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
              Strict stage-gated escrow releases. Contractor cannot draw progress tranches until all governing quality checkpoints clear mandatory digital sign-off.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs font-semibold">
              Tier: <strong className="text-cyan-400">{tier}</strong>
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs font-semibold">
              Active Persona: <strong className="text-cyan-400">{roleLabel}</strong>
            </span>
          </div>
        </div>

        {/* MILESTONE SEQUENCE CARDS */}
        <div className="space-y-6">
          {milestones.map((ms) => {
            const isCompleted = ms.status === "CERTIFIED_RELEASED";
            const isSubmitted = ms.status === "SUBMITTED";
            const isReadyToSubmit = ms.status === "READY_FOR_SUBMISSION";
            const holdPointsPending = ms.hold_gates.some((g) => g.status === "PENDING");

            return (
              <div
                key={ms.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-5 hover:border-zinc-700 transition shadow-xl"
              >
                {/* CARD HEADER */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-4 gap-2">
                  <div>
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="text-zinc-500 font-bold">{ms.sequence_label}</span>
                      <span className="text-zinc-600">·</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isCompleted
                          ? "bg-emerald-950 text-emerald-400 border border-emerald-800/50"
                          : isSubmitted
                          ? "bg-blue-950 text-blue-400 border border-blue-800/50"
                          : isReadyToSubmit
                          ? "bg-cyan-950 text-cyan-400 border border-cyan-800/50"
                          : "bg-zinc-900 text-amber-400 border border-amber-800/50"
                      }`}>
                        {ms.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white mt-1">{ms.title}</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">{ms.work_scope}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider block">
                      Total Milestone Value
                    </span>
                    <div className="text-xl font-extrabold font-mono text-cyan-400">
                      {formatInr(ms.total_milestone_value_inr)}
                    </div>
                    <div className="text-[10px] font-mono text-zinc-500">
                      Target: {ms.target_date}
                    </div>
                  </div>
                </div>

                {/* 3-COLUMN DETAIL STRIP */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* LEFT: TRADE ALLOCATIONS (4 cols) */}
                  <div className="lg:col-span-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold block">
                      Trade Allocations (1)
                    </span>

                    <div className="space-y-1">
                      <strong className="text-xs text-white block">{ms.trade_name}</strong>
                      <div className="text-[11px] font-mono text-zinc-400">
                        {ms.contractor_name} · <span className="text-emerald-400">Active</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-zinc-800/60 flex justify-between items-baseline font-mono text-xs">
                      <span className="text-zinc-500">Contractor Tranche:</span>
                      <strong className="text-white">{formatInr(ms.contractor_allocated_inr)}</strong>
                    </div>
                  </div>

                  {/* CENTER: MANDATORY HOLD-POINT GATES (5 cols) */}
                  <div className="lg:col-span-5 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold">
                        Mandatory Hold-Point Gates ({ms.hold_gates.length})
                      </span>
                      <span className="text-[10px] font-mono text-zinc-400">
                        {ms.hold_gates.filter((g) => g.status === "VERIFIED").length}/{ms.hold_gates.length} Cleared
                      </span>
                    </div>

                    <div className="space-y-2">
                      {ms.hold_gates.map((gate) => {
                        const isVerified = gate.status === "VERIFIED";

                        return (
                          <div
                            key={gate.id}
                            className={`p-3 rounded-lg border transition space-y-1.5 ${
                              isVerified
                                ? "border-emerald-800/60 bg-emerald-950/20"
                                : "border-zinc-800 bg-zinc-900/50"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                {isVerified ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                                )}
                                <span className="text-xs font-bold text-zinc-200">{gate.name}</span>
                                <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[9px] font-mono text-zinc-400 uppercase">
                                  Mandatory Gate
                                </span>
                              </div>

                              {isArchitectOrPmc && !isCompleted && (
                                <button
                                  type="button"
                                  disabled={actionInProgress === `gate_${gate.id}`}
                                  onClick={() => handleToggleHoldGate(ms.id, gate.id)}
                                  className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold transition flex items-center gap-1 ${
                                    isVerified
                                      ? "bg-emerald-950 text-emerald-300 hover:bg-emerald-900 border border-emerald-800"
                                      : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-sm"
                                  }`}
                                >
                                  {isVerified ? "Verified ✓" : "Verify"}
                                </button>
                              )}
                            </div>

                            <div className="text-[11px] font-mono text-zinc-500 leading-snug">
                              {gate.spec_ref}
                            </div>

                            {gate.verified_by && (
                              <div className="text-[10px] font-mono text-emerald-400/80">
                                Certified by: {gate.verified_by}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* RIGHT: ESCROW ACTIONS & RELEASE (3 cols) */}
                  <div className="lg:col-span-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 space-y-3 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-500 font-bold mb-2">
                        <span>Escrow Gateway</span>
                        {holdPointsPending ? (
                          <span className="text-amber-400 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        ) : (
                          <span className="text-emerald-400 flex items-center gap-1">
                            <Unlock className="w-3 h-3" /> Unlocked
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-mono text-zinc-400 space-y-1">
                        <div>
                          Status:{" "}
                          <strong className={holdPointsPending ? "text-amber-400" : "text-emerald-400"}>
                            {holdPointsPending ? "Hold-Points Active" : "All Gates Verified"}
                          </strong>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          Sign-off Authority:{" "}
                          <span className="text-cyan-400 font-semibold">
                            {isArchitectOrPmc ? roleLabel : "Principal Architect"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                      {!isCompleted && !isSubmitted && (
                        <button
                          type="button"
                          disabled={holdPointsPending || actionInProgress === `submit_${ms.id}`}
                          onClick={() => handleSubmitForVerification(ms.id)}
                          className={`w-full py-2 rounded-xl text-xs font-bold font-mono transition shadow-sm ${
                            holdPointsPending
                              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                              : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-cyan-950/50"
                          }`}
                        >
                          Submit for Verification
                        </button>
                      )}

                      {!isCompleted && (
                        <button
                          type="button"
                          disabled={
                            holdPointsPending ||
                            !isArchitectOrPmc ||
                            actionInProgress === `certify_${ms.id}`
                          }
                          onClick={() => handleCertifyReleaseEscrow(ms.id)}
                          className={`w-full py-2 rounded-xl text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 shadow-sm ${
                            holdPointsPending || !isArchitectOrPmc
                              ? "bg-zinc-900 text-zinc-600 border border-zinc-800 cursor-not-allowed"
                              : "bg-emerald-500 hover:bg-emerald-400 text-zinc-950 shadow-emerald-950/50"
                          }`}
                        >
                          <Award className="w-3.5 h-3.5" />
                          <span>Certify &amp; Release Escrow</span>
                        </button>
                      )}

                      {isCompleted && (
                        <div className="p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 font-mono text-center text-xs font-bold flex items-center justify-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Tranche Disbursed</span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* CARD FOOTER FINANCIAL NOTIFICATION */}
                <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2 text-zinc-400">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Financial Condition:</span>
                    <span>
                      {ms.financial_condition_cleared
                        ? "Cleared: All mandatory hold-points passed. Ready for payment certification."
                        : "Clearance held until all mandatory criteria receive digital seal."}
                    </span>
                  </div>
                  {ms.certified_by && (
                    <span className="text-emerald-400 font-bold">
                      Sealed by {ms.certified_by}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </main>
  );
}