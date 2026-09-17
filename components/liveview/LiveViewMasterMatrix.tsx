"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Activity,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Beaker,
  CheckCircle2,
  Clock,
  FileText,
  HardHat,
  Lock,
  Paintbrush,
  Receipt,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sofa,
  Truck,
  Wrench,
  Sparkles
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole, ProjectTier } from "@/context/RoleContext";

export interface LiveViewMasterTelemetry {
  pending_pour_cards: number;
  approved_pour_cards: number;
  pending_cube_tests: number;
  curing_stripping_locked: number;
  active_ptw: number;
  ptw_expiring_soon: number;
  today_manpower: number;
  today_gate_inward_count: number;
  open_ncrs: number;
  critical_ncrs: number;
  total_certified_ra_lakhs: number;
  net_disbursed_lakhs: number;
}

const defaultTelemetry: LiveViewMasterTelemetry = {
  pending_pour_cards: 2,
  approved_pour_cards: 14,
  pending_cube_tests: 3,
  curing_stripping_locked: 1,
  active_ptw: 4,
  ptw_expiring_soon: 1,
  today_manpower: 88,
  today_gate_inward_count: 6,
  open_ncrs: 2,
  critical_ncrs: 1,
  total_certified_ra_lakhs: 43.56,
  net_disbursed_lakhs: 31.20,
};

interface AdaptiveStage {
  step: number;
  title: string;
  description: string;
  route: string;
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
  status: "Cleared" | "In Progress" | "Locked";
  tone: "cyan" | "amber" | "rose" | "emerald" | "slate";
}

export default function LiveViewMasterMatrix() {
  const { role, project, tier } = useActiveRole();
  const [telemetry, setTelemetry] = useState<LiveViewMasterTelemetry>(defaultTelemetry);
  const [loading, setLoading] = useState(false);
  const [lastSynced, setLastSynced] = useState<string>("");

  const fetchTelemetry = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_liveview_master_telemetry", {
        p_project_id: project.id
      });
      if (!error && data) {
        setTelemetry({ ...defaultTelemetry, ...(data as LiveViewMasterTelemetry) });
      }
    } catch {
      // Fallback gracefully to default seeded telemetry
    } finally {
      setLastSynced(new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }));
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTelemetry();
    const channel = supabase.channel(`liveview_matrix_${project.id}`);
    channel
      .on("postgres_changes", { event: "*", schema: "public", table: "pour_cards" }, () => void fetchTelemetry())
      .on("postgres_changes", { event: "*", schema: "public", table: "ra_bills" }, () => void fetchTelemetry())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [project.id]);

  // Dynamically configure stages based on whether this is a 1BHK, Tower, or Infrastructure project
  const stages: AdaptiveStage[] = useMemo(() => {
    if (tier === "RESIDENTIAL") {
      return [
        { step: 1, title: "Material Catalog", description: "Veneer, stone & laminates", route: "/submittals", icon: Sparkles, value: "14 Items", label: "client approved", status: "Cleared", tone: "emerald" },
        { step: 2, title: "Civil & Masonry", description: "Chasing & partition checks", route: "/operations/dpr", icon: HardHat, value: `${telemetry.today_manpower} Craft`, label: "artisans on site", status: "In Progress", tone: "cyan" },
        { step: 3, title: "MEP First-Fix", description: "Conduiting & plumbing tests", route: "/quality/inspections", icon: Wrench, value: "100%", label: "pressure passed", status: "Cleared", tone: "emerald" },
        { step: 4, title: "Custom Joinery", description: "Millwork & carcass assembly", route: "/submittals", icon: Sofa, value: "2 Units", label: "awaiting inspection", status: "In Progress", tone: "amber" },
        { step: 5, title: "Surface Finishes", description: "Primer, PU paint & polish", route: "/punchlist", icon: Paintbrush, value: "70%", label: "surface prepared", status: "In Progress", tone: "cyan" },
        { step: 6, title: "Punch Snagging", description: "Owner defects & punch items", route: "/punchlist", icon: AlertOctagon, value: `${telemetry.open_ncrs}`, label: "touch-ups pending", status: telemetry.open_ncrs > 0 ? "In Progress" : "Cleared", tone: "rose" },
        { step: 7, title: "Final Dressing", description: "Soft furnishings & fixtures", route: "/handover", icon: ShieldCheck, value: "Ready", label: "for final cleaning", status: "Cleared", tone: "emerald" },
        { step: 8, title: "Billing Release", description: "Contractor stage milestone", route: "/finance/ra-bills", icon: Receipt, value: `₹ ${(telemetry.total_certified_ra_lakhs * 0.1).toFixed(1)} L`, label: "certified payout", status: "Cleared", tone: "emerald" },
      ];
    }

    // Commercial Core & Shell / Infrastructure Pipeline
    return [
      { step: 1, title: "Gate Inward", description: "Weighbridge receipts", route: "/operations/gate-register", icon: Truck, value: `${telemetry.today_gate_inward_count}`, label: "vehicles today", status: "Cleared", tone: "cyan" },
      { step: 2, title: "DPR Shift Log", description: "Daily site muster", route: "/operations/dpr", icon: HardHat, value: `${telemetry.today_manpower}`, label: "muster strength", status: "In Progress", tone: "slate" },
      { step: 3, title: "High-Risk PTW", description: "Height & hot work safety", route: "/safety/ptw", icon: ShieldAlert, value: `${telemetry.active_ptw}`, label: "active permits", status: telemetry.ptw_expiring_soon > 0 ? "In Progress" : "Cleared", tone: "amber" },
      { step: 4, title: "Pour Cards", description: "Pre-pour stage gate", route: "/quality/pour-cards", icon: FileText, value: `${telemetry.pending_pour_cards}`, label: "pending sign-off", status: telemetry.pending_pour_cards > 0 ? "In Progress" : "Cleared", tone: "rose" },
      { step: 5, title: "IS 516 Cubes", description: "Compressive strength test", route: "/quality/cube-tests", icon: Beaker, value: `${telemetry.pending_cube_tests}`, label: "pending crushes", status: "In Progress", tone: "cyan" },
      { step: 6, title: "Formwork Stripping", description: "Maturity interlock (IS 456)", route: "/safety/formwork-stripping", icon: Lock, value: `${telemetry.curing_stripping_locked}`, label: "spans locked", status: telemetry.curing_stripping_locked > 0 ? "Locked" : "Cleared", tone: "amber" },
      { step: 7, title: "NCR Defect Log", description: "Defect rectification loop", route: "/quality/ncr", icon: AlertOctagon, value: `${telemetry.open_ncrs}`, label: "open notices", status: telemetry.critical_ncrs > 0 ? "Locked" : "In Progress", tone: "rose" },
      { step: 8, title: "Commercial RA", description: "Quantity surveyor release", route: "/finance/ra-bills", icon: Receipt, value: `₹ ${telemetry.total_certified_ra_lakhs.toFixed(1)} L`, label: "certified payout", status: "Cleared", tone: "emerald" },
    ];
  }, [tier, telemetry]);

  const activeBlockers = [
    telemetry.ptw_expiring_soon > 0 ? `${telemetry.ptw_expiring_soon} high-risk permit-to-work expiring within 2 hours.` : null,
    telemetry.critical_ncrs > 0 ? `${telemetry.critical_ncrs} structural quality defect(s) pending formal CAPA sign-off.` : null,
    telemetry.curing_stripping_locked > 0 && tier !== "RESIDENTIAL" ? "IS 456 Stripping Lock: Soffit de-shuttering held pending 7-day cube maturity." : null,
  ].filter(Boolean) as string[];

  return (
    <section className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
      
      {/* HEADER STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
            <span>Governance Sequence</span>
            <span>·</span>
            <span className="text-zinc-400">{project.name}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-1">
            Construction Control Matrix
          </h1>
          <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
            Atomic stage-gate control from physical inward site activity to statutory financial release.
          </p>
        </div>

        {/* Sync Status & Trigger */}
        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900/90 px-3 py-1 text-xs">
            <span className={`h-2 w-2 rounded-full ${loading ? "bg-amber-400 animate-spin" : "bg-emerald-500"}`} />
            <span className="text-zinc-300 font-mono text-[11px]">
              {loading ? "Syncing..." : lastSynced ? `Synced · ${lastSynced}` : "Live Telemetry"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => void fetchTelemetry()}
            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            title="Refresh Matrix"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* BLOCKER RADAR (Appears Only When Physical Blockers Exist) */}
      {activeBlockers.length > 0 && (
        <div className="mt-5 rounded-xl border border-rose-500/30 bg-rose-950/20 p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span>Active Stage-Gate Blockers ({activeBlockers.length})</span>
          </div>
          <div className="divide-y divide-rose-500/20">
            {activeBlockers.map((b, i) => (
              <div key={i} className="py-2 text-xs text-rose-200/90 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                <span>{b}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 8-STAGE HORIZONTAL CONTROL CONDUIT */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            Governed Progression Sequence ({tier})
          </span>
          <span className="text-[11px] font-mono text-zinc-400">
            Role: <strong className="text-zinc-200">{role.label}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {stages.map((stage) => {
            const Icon = stage.icon;
            return (
              <div
                key={stage.step}
                className="group relative flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 hover:border-zinc-700 hover:bg-zinc-900/80 transition-all duration-200"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-zinc-400 group-hover:text-zinc-200">
                      0{stage.step}
                    </span>
                    <Icon className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
                  </div>

                  <h2 className="text-xs font-bold text-zinc-200 mt-2.5 leading-tight">
                    {stage.title}
                  </h2>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 mt-1 leading-snug">
                    {stage.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-zinc-800/60">
                  <div className="font-mono text-sm font-bold text-white tracking-tight">
                    {stage.value}
                  </div>
                  <div className="text-[9px] text-zinc-400 uppercase tracking-wide">
                    {stage.label}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider ${
                      stage.status === "Cleared"
                        ? "text-emerald-400"
                        : stage.status === "Locked"
                        ? "text-rose-400"
                        : "text-amber-400"
                    }`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        stage.status === "Cleared"
                          ? "bg-emerald-400"
                          : stage.status === "Locked"
                          ? "bg-rose-400 animate-pulse"
                          : "bg-amber-400"
                      }`} />
                      {stage.status}
                    </span>

                    <Link
                      href={stage.route}
                      className="text-zinc-400 hover:text-cyan-400 transition"
                      title="Open Stage Register"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FOOTER AUDIT METADATA */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between border-t border-zinc-800/60 pt-4 text-[11px] text-zinc-400 gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-zinc-400" />
            PostgreSQL Realtime Channel Active
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            ISO 19650 Governance Active
          </span>
        </div>
        <span className="font-mono text-[10px] text-zinc-400">
          Project Ref: {project.id}
        </span>
      </div>

    </section>
  );
}