"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Building2,
  CheckCircle2,
  FileCheck2,
  GitBranch,
  Lock,
  Network,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wind,
  Zap,
} from "lucide-react";

type OperatorRole = "DIRECTOR" | "SITE_ENGINEER" | "AUDITOR";

interface PortfolioProjectSummary {
  projectId: string;
  code: string;
  name: string;
  location: string;
  contractValueCr: number;
  status: "HOLD_ACTIVE" | "DEVIATION_FLAGGED" | "NOMINAL";
  activeAlertCount: number;
  defaultZoneId: string;
}

interface OntologyNode {
  id: string;
  type: string;
  label: string;
  status: "NOMINAL" | "WARNING" | "CRITICAL_LOCKED";
  metrics: Record<string, string | number | boolean>;
}

interface ProposedAction {
  actionId: string;
  actionType: string;
  title: string;
  targetNodeId: string;
  financialImpactInr: number;
  standardRef: string;
  requiresDirectorSignoff: boolean;
}

interface OntologyResponse {
  storageMode: string;
  mode: string;
  project?: {
    projectId: string;
    code: string;
    name: string;
    location: string;
    contractValueCr: number;
    status: string;
  };
  graph: {
    projectId: string;
    rowHash: string;
    summary: {
      totalNodes: number;
      totalEdges: number;
      lockedNodes: number;
      frozenInr: number;
      netCertifiedReleaseInr: number;
      httpStatus: number;
    };
    nodes: OntologyNode[];
    proposedActions: ProposedAction[];
  };
  blastRadius: {
    focusNodeId: string;
    impactedNodeIds: string[];
    blockedPermits: string[];
    financialExposureInr: number;
  };
}

interface SimulationResult {
  scenarioName: string;
  mutatedDatabase: boolean;
  baseline: { httpStatus: number; violationCount: number; frozenInr: number; netCertifiedReleaseInr: number };
  simulated: { httpStatus: number; violationCount: number; frozenInr: number; netCertifiedReleaseInr: number };
  deltas: {
    deltaFrozenInr: number;
    deltaNetReleaseInr: number;
    newlyTriggeredCodes: string[];
    resolvedCodes: string[];
  };
}

interface WeatherResponse {
  weather: {
    source: string;
    locationLabel: string;
    temperatureC: number;
    windSpeedMs: number;
    windGustsMs: number;
    interlocks: {
      craneLockoutRecommended: boolean;
      effectiveWindForGovernorMs: number;
    };
  };
}

interface TriangulationResponse {
  preset: string;
  report: {
    challanNo: string;
    vendorName: string;
    verdict: string;
    httpStatus: number;
    trustScorePct: number;
    derivedMetrics: {
      weighbridgeDerivedM3: number;
      ghostVolumeM3: number;
      missingCementBags: number;
      strengthRatioPct: number;
    };
    discrepancies: Array<{
      code: string;
      severity: string;
      explanation: string;
      financialRiskInr: number;
    }>;
    recommendedEscrowHoldInr: number;
    recommendedClause42PenaltyInr: number;
  };
}

interface VerifyChainResponse {
  storageMode: string;
  simulatedTamperDemo: boolean;
  verification: {
    valid: boolean;
    projectId: string;
    checkedEvents: number;
    headSeq: number;
    headHash: string;
    tamperedSeq: number | null;
    reason: string;
  };
}

interface RoleConfigMeta {
  pinMode: "production_env" | "demo_default";
  customPinConfigured: boolean;
  demoHint: string | null;
  allowedActions: string[];
}

interface ActionReceipt {
  executedAction: string;
  role: OperatorRole;
  actor: string;
  state: { projectId: string; projectName?: string; httpStatus: number };
  receipt: {
    seq: number;
    chainHash: string;
    bsaSec63Hash: string;
    certificateUrl: string;
    armedAlertChannels: string[];
  };
}

const fmtInr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const ROLE_LABELS: Record<OperatorRole, string> = {
  DIRECTOR: "Director (Full Escrow + PTW)",
  SITE_ENGINEER: "Site Engineer (Safety PTWs Only)",
  AUDITOR: "External Auditor (Read-Only)",
};

const DEFAULT_DEMO_PINS: Record<OperatorRole, string> = {
  DIRECTOR: "4220",
  SITE_ENGINEER: "3110",
  AUDITOR: "1000",
};

export default function ExecutiveWarRoomPage() {
  const [projects, setProjects] = useState<PortfolioProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("VANGUARD-LKO-01");

  const [ontology, setOntology] = useState<OntologyResponse | null>(null);
  const [weather, setWeather] = useState<WeatherResponse | null>(null);
  const [triangulation, setTriangulation] = useState<TriangulationResponse | null>(null);
  const [triPreset, setTriPreset] = useState<"fraud" | "clean">("fraud");
  const [chain, setChain] = useState<VerifyChainResponse | null>(null);

  const [windOverride, setWindOverride] = useState<number>(22.5);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);

  const [operatorRole, setOperatorRole] = useState<OperatorRole>("DIRECTOR");
  const [actorName, setActorName] = useState("Director — Quadillar ConTech");
  const [operatorPin, setOperatorPin] = useState("4220");
  const [rbacMeta, setRbacMeta] = useState<Record<OperatorRole, RoleConfigMeta> | null>(null);
  const [actionError, setActionError] = useState<{ status: number; message: string } | null>(null);

  const [executing, setExecuting] = useState<string | null>(null);
  const [lastReceipt, setLastReceipt] = useState<ActionReceipt | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSiteData = useCallback(
    async (projectId: string, preset: "fraud" | "clean" = triPreset) => {
      setLoading(true);
      try {
        const q = encodeURIComponent(projectId);
        const [projRes, ontRes, wRes, triRes, chRes, actMeta] = await Promise.all([
          fetch("/api/portfolio/projects", { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/ontology/graph?projectId=${q}`, { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/weather/live", { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/triangulation/correlate?preset=${preset}`, { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/audit/verify-chain?projectId=${q}`, { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/actions/execute", { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (Array.isArray(projRes?.projects)) setProjects(projRes.projects);
        setOntology(ontRes);
        setWeather(wRes);
        setTriangulation(triRes);
        setChain(chRes);
        if (actMeta?.rbac?.roles) {
          setRbacMeta(actMeta.rbac.roles);
        }
      } finally {
        setLoading(false);
      }
    },
    [triPreset]
  );

  useEffect(() => {
    loadSiteData(selectedProjectId, "fraud");
  }, [selectedProjectId, loadSiteData]);

  const handleProjectSwitch = (nextId: string) => {
    setSelectedProjectId(nextId);
    setSimResult(null);
    setLastReceipt(null);
    setActionError(null);
  };

  const handleRoleSwitch = (nextRole: OperatorRole) => {
    setOperatorRole(nextRole);
    setActionError(null);
    setActorName(
      nextRole === "DIRECTOR"
        ? "Director — Quadillar ConTech"
        : nextRole === "SITE_ENGINEER"
        ? "Site Engineer — Field HSE"
        : "External Auditor — BSA Review"
    );
    const roleCfg = rbacMeta?.[nextRole];
    if (roleCfg?.pinMode === "production_env") {
      setOperatorPin("");
    } else {
      setOperatorPin(roleCfg?.demoHint || DEFAULT_DEMO_PINS[nextRole]);
    }
  };

  const runSimulation = async (windMs: number, name: string) => {
    setSimLoading(true);
    try {
      const res = await fetch("/api/governor/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          scenarioName: name,
          overrides: { windSpeedMs: windMs },
        }),
      });
      const data = await res.json();
      if (data?.simulation) setSimResult(data.simulation);
    } finally {
      setSimLoading(false);
    }
  };

  const executeKineticAction = async (actionType: string, rationale: string) => {
    setExecuting(actionType);
    setActionError(null);
    try {
      const res = await fetch("/api/actions/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-operator-role": operatorRole,
          "x-operator-pin": operatorPin,
        },
        body: JSON.stringify({
          projectId: selectedProjectId,
          role: operatorRole,
          actionType,
          actor: actorName,
          rationale,
          pin: operatorPin,
        }),
      });
      const data = await res.json();
      if (res.ok && data?.ok) {
        setLastReceipt(data);
        await loadSiteData(selectedProjectId, triPreset);
      } else {
        setActionError({
          status: res.status,
          message: data?.error || `Action blocked (HTTP ${res.status})`,
        });
      }
    } catch {
      setActionError({ status: 0, message: "Network error while signing kinetic action." });
    } finally {
      setExecuting(null);
    }
  };

  const runChainCheck = async (simulateTamper: boolean) => {
    const q = encodeURIComponent(selectedProjectId);
    const res = await fetch(
      `/api/audit/verify-chain?projectId=${q}${simulateTamper ? "&simulateTamper=1" : ""}`,
      { cache: "no-store" }
    );
    setChain(await res.json());
  };

  const switchTriangulation = async (preset: "fraud" | "clean") => {
    setTriPreset(preset);
    const res = await fetch(`/api/triangulation/correlate?preset=${preset}`, { cache: "no-store" });
    setTriangulation(await res.json());
  };

  const summary = ontology?.graph?.summary;
  const isLocked = summary?.httpStatus === 422;
  const activeRoleCfg = rbacMeta?.[operatorRole];
  const allowedForActiveRole = activeRoleCfg?.allowedActions ?? [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 space-y-6 font-sans">
      {/* Header + Portfolio Project Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-cyan-400">
            <Network className="w-3.5 h-3.5" />
            <span>Palantir Core • Multi-Project Portfolio & 3-Tier RBAC</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mt-1">
            Executive War Room
          </h1>
          {ontology?.project && (
            <p className="text-xs font-mono text-zinc-400 mt-0.5">
              {ontology.project.name} • {ontology.project.location} • ₹{ontology.project.contractValueCr} Cr
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Multi-Project Switcher */}
          <div className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-zinc-900 px-2.5 py-1.5">
            <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              aria-label="Select Portfolio Project"
              value={selectedProjectId}
              onChange={(e) => handleProjectSwitch(e.target.value)}
              className="bg-zinc-900 text-xs font-mono text-zinc-100 focus:outline-none cursor-pointer max-w-[230px]"
            >
              {projects.length === 0 ? (
                <option value={selectedProjectId}>{selectedProjectId}</option>
              ) : (
                projects.map((p) => (
                  <option key={p.projectId} value={p.projectId}>
                    {p.code} — {p.name} ({p.status})
                  </option>
                ))
              )}
            </select>
          </div>

          <span
            className={`px-2.5 py-1.5 rounded text-xs font-mono font-bold ${
              isLocked ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"
            }`}
          >
            {isLocked ? "HTTP 422 ESCROW LOCKED" : "HTTP 200 COMPLIANT"}
          </span>

          <button
            type="button"
            onClick={() => loadSiteData(selectedProjectId, triPreset)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-mono text-zinc-200 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Site</span>
          </button>
        </div>
      </div>

      {/* Top KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-[11px] font-mono uppercase text-zinc-400">Frozen Escrow</div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-rose-400 mt-1">
            {summary ? fmtInr(summary.frozenInr) : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-[11px] font-mono uppercase text-zinc-400">Net Certified RTGS</div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-emerald-400 mt-1">
            {summary ? fmtInr(summary.netCertifiedReleaseInr) : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-[11px] font-mono uppercase text-zinc-400">Ontology Graph</div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-white mt-1">
            {summary ? `${summary.totalNodes} Nodes / ${summary.totalEdges} Edges` : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="text-[11px] font-mono uppercase text-zinc-400">Blocked Safety PTWs</div>
          <div className="text-lg sm:text-xl font-bold font-mono tabular-nums text-amber-400 mt-1">
            {ontology ? ontology.blastRadius.blockedPermits.length : "—"}
          </div>
        </div>
      </div>

      {/* Main 2-Column Operational Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Causal Ontology Blast-Radius + RBAC Signed Kinetic Action Executor */}
        <div className="lg:col-span-7 space-y-6">
          {/* Ontology Graph Panel */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                  1. Live Causal Ontology ({selectedProjectId})
                </h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                BSA63: {ontology?.graph.rowHash.slice(0, 12) || "—"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {(ontology?.graph.nodes || []).map((node) => {
                const locked = node.status === "CRITICAL_LOCKED";
                return (
                  <div
                    key={node.id}
                    className={`rounded-xl border p-3 text-xs ${
                      locked
                        ? "border-rose-500/40 bg-rose-950/20"
                        : "border-zinc-800 bg-zinc-950/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase text-zinc-400">{node.type}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                          locked ? "bg-rose-600 text-white" : "bg-emerald-700 text-white"
                        }`}
                      >
                        {node.status}
                      </span>
                    </div>
                    <div className="font-semibold text-zinc-100 mt-1 truncate" title={node.label}>
                      {node.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Signed Kinetic Action Executor with 3-Tier RBAC */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
            <div className="flex flex-col gap-3 border-b border-zinc-800 pb-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                    2. Signed Kinetic Action Executor (RBAC)
                  </h2>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-300">
                  {operatorRole}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="flex items-center gap-1.5 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1">
                  <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <select
                    aria-label="Operator RBAC Role"
                    value={operatorRole}
                    onChange={(e) => handleRoleSwitch(e.target.value as OperatorRole)}
                    className="bg-zinc-950 text-xs font-mono text-zinc-100 w-full focus:outline-none cursor-pointer"
                  >
                    {(Object.keys(ROLE_LABELS) as OperatorRole[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  type="text"
                  value={actorName}
                  onChange={(e) => setActorName(e.target.value)}
                  aria-label="Signing Operator Name"
                  className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs font-mono text-zinc-100"
                />

                <input
                  type="password"
                  value={operatorPin}
                  onChange={(e) => setOperatorPin(e.target.value)}
                  placeholder={
                    activeRoleCfg?.pinMode === "production_env"
                      ? `${operatorRole} PIN`
                      : `Demo PIN: ${activeRoleCfg?.demoHint || DEFAULT_DEMO_PINS[operatorRole]}`
                  }
                  aria-label="Operator Authorization PIN"
                  className="rounded-lg border border-amber-500/40 bg-zinc-950 px-2.5 py-1 text-xs font-mono text-amber-200"
                />
              </div>

              <div className="text-[11px] font-mono text-zinc-400">
                Permitted for <strong className="text-zinc-200">{operatorRole}</strong>:{" "}
                {allowedForActiveRole.length > 0 ? allowedForActiveRole.join(", ") : "NONE (Read-Only Auditor)"}
              </div>
            </div>

            <div className="space-y-2.5">
              {(ontology?.graph.proposedActions || []).map((act) => {
                const permitted = allowedForActiveRole.length === 0 ? false : allowedForActiveRole.includes(act.actionType);
                return (
                  <div
                    key={act.actionId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-950/70 p-3.5"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">{act.title}</div>
                      <div className="text-[11px] font-mono text-zinc-400 mt-0.5">
                        {act.standardRef} • Target: {act.targetNodeId}
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={executing !== null}
                      onClick={() => executeKineticAction(act.actionType, act.title)}
                      className={`shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-white transition cursor-pointer disabled:opacity-50 ${
                        permitted
                          ? "bg-cyan-600 hover:bg-cyan-500"
                          : "bg-zinc-800 hover:bg-rose-900/70 border border-rose-500/40 text-rose-200"
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span>
                        {executing === act.actionType
                          ? "Signing..."
                          : permitted
                          ? "Sign & Execute"
                          : "Test RBAC (403)"}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick State Toggle Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={executing !== null}
                onClick={() =>
                  executeKineticAction("REVOKE_CRANE_PTW", "Field HSE: Revoke Crane PTW on high wind")
                }
                className="rounded-lg border border-amber-500/40 bg-amber-950/40 hover:bg-amber-900/50 px-3 py-1.5 text-xs font-mono font-semibold text-amber-200 cursor-pointer"
              >
                Revoke Crane PTW (HSE)
              </button>
              <button
                type="button"
                disabled={executing !== null}
                onClick={() =>
                  executeKineticAction("FREEZE_RA_BILL_422", "Executive override: Enforce HTTP 422 Lock")
                }
                className="rounded-lg border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/50 px-3 py-1.5 text-xs font-mono font-semibold text-rose-200 cursor-pointer"
              >
                Enforce Stress Lock (422)
              </button>
              <button
                type="button"
                disabled={executing !== null}
                onClick={() =>
                  executeKineticAction("CLEAR_FOR_RTGS", "Director sign-off: Clear for RTGS release")
                }
                className="rounded-lg border border-emerald-500/40 bg-emerald-950/40 hover:bg-emerald-900/50 px-3 py-1.5 text-xs font-mono font-semibold text-emerald-200 cursor-pointer"
              >
                Clear for RTGS (Director)
              </button>
            </div>

            {actionError && (
              <div className="rounded-xl border border-rose-500/50 bg-rose-950/30 p-3 text-xs font-mono text-rose-200 flex items-center justify-between gap-2">
                <span>
                  {actionError.status === 403 ? "HTTP 403 RBAC DENIED" : `HTTP ${actionError.status} GUARD`}:{" "}
                  {actionError.message}
                </span>
                {activeRoleCfg?.demoHint && (
                  <span className="text-[10px] text-amber-300 shrink-0">
                    {operatorRole} Demo PIN: {activeRoleCfg.demoHint}
                  </span>
                )}
              </div>
            )}

            {lastReceipt && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-950/20 p-3.5 text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-emerald-300 font-bold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    SEALED TO {lastReceipt.state.projectId} CHAIN (SEQ #{lastReceipt.receipt.seq} • {lastReceipt.role})
                  </span>
                  <Link
                    href={lastReceipt.receipt.certificateUrl}
                    className="underline text-cyan-300 hover:text-white inline-flex items-center gap-1"
                  >
                    <FileCheck2 className="w-3.5 h-3.5" />
                    BSA Sec 63(4) PDF
                  </Link>
                </div>
                <div className="text-zinc-300 break-all">
                  Chain Hash: {lastReceipt.receipt.chainHash.slice(0, 32)}...
                </div>
                <div className="text-zinc-400">
                  Armed Alert Channels:{" "}
                  {lastReceipt.receipt.armedAlertChannels.length > 0
                    ? lastReceipt.receipt.armedAlertChannels.join(", ")
                    : "None enabled in /settings"}
                </div>
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: What-If Crisis Fork + 5-Way Lie Detector + Isolated Hash-Chain Tamper Test */}
        <div className="lg:col-span-5 space-y-6">
          {/* What-If Crisis Fork + Live Weather */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-violet-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                  3. What-If Crisis Fork (Zero DB Mutation)
                </h2>
              </div>
            </div>

            {weather && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 p-3 flex items-center justify-between gap-2 text-xs font-mono">
                <div className="flex items-center gap-2 min-w-0">
                  <Wind className="w-4 h-4 text-sky-400 shrink-0" />
                  <span className="truncate text-zinc-200">
                    {weather.weather.locationLabel}: {weather.weather.temperatureC}°C • Gusts{" "}
                    {weather.weather.windGustsMs} m/s
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const w = weather.weather.interlocks.effectiveWindForGovernorMs;
                    setWindOverride(w);
                    runSimulation(w, "Live Lucknow Weather Injection");
                  }}
                  className="shrink-0 rounded bg-sky-600 hover:bg-sky-500 px-2.5 py-1 text-[10px] font-bold text-white cursor-pointer"
                >
                  Inject Live Wind
                </button>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono text-zinc-300">
                <span>Simulated Wind Gust (IS 875 Limit: 15.0 m/s)</span>
                <span className="font-bold text-white tabular-nums">{windOverride.toFixed(1)} m/s</span>
              </div>
              <input
                type="range"
                min={2}
                max={30}
                step={0.5}
                value={windOverride}
                onChange={(e) => setWindOverride(Number(e.target.value))}
                className="w-full accent-violet-500"
              />
              <button
                type="button"
                disabled={simLoading}
                onClick={() => runSimulation(windOverride, `Cyclone Gust ${windOverride} m/s Fork`)}
                className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 py-2 text-xs font-mono font-bold text-white transition cursor-pointer"
              >
                {simLoading ? "Forking Site State..." : `Run What-If Fork on ${selectedProjectId}`}
              </button>
            </div>

            {simResult && (
              <div className="rounded-xl border border-violet-500/30 bg-violet-950/20 p-3.5 text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-violet-200 font-bold">
                  <span>{simResult.scenarioName}</span>
                  <span>DB MUTATED: {simResult.mutatedDatabase ? "YES" : "FALSE"}</span>
                </div>
                <div className="text-zinc-300">
                  HTTP {simResult.baseline.httpStatus} → HTTP {simResult.simulated.httpStatus} | Delta Frozen:{" "}
                  {fmtInr(simResult.deltas.deltaFrozenInr)}
                </div>
                {simResult.deltas.newlyTriggeredCodes.length > 0 && (
                  <div className="text-rose-300">
                    + New Faults: {simResult.deltas.newlyTriggeredCodes.join(", ")}
                  </div>
                )}
                {simResult.deltas.resolvedCodes.length > 0 && (
                  <div className="text-emerald-300">
                    - Resolved: {simResult.deltas.resolvedCodes.join(", ")}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 5-Way Triangulation Lie Detector */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                  4. 5-Way Triangulation Lie Detector
                </h2>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => switchTriangulation("fraud")}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer ${
                    triPreset === "fraud" ? "bg-rose-600 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  Fraud Pour
                </button>
                <button
                  type="button"
                  onClick={() => switchTriangulation("clean")}
                  className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer ${
                    triPreset === "clean" ? "bg-emerald-600 text-white" : "bg-zinc-800 text-zinc-400"
                  }`}
                >
                  Clean Pour
                </button>
              </div>
            </div>

            {triangulation && (
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between text-zinc-300">
                  <span>{triangulation.report.challanNo}</span>
                  <span
                    className={
                      triangulation.report.httpStatus === 422
                        ? "text-rose-400 font-bold"
                        : "text-emerald-400 font-bold"
                    }
                  >
                    TRUST: {triangulation.report.trustScorePct}% (HTTP {triangulation.report.httpStatus})
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-zinc-950 p-2 border border-zinc-800">
                    Ghost Volume: <strong className="text-white">{triangulation.report.derivedMetrics.ghostVolumeM3} m³</strong>
                  </div>
                  <div className="rounded-lg bg-zinc-950 p-2 border border-zinc-800">
                    Missing Cement: <strong className="text-white">{triangulation.report.derivedMetrics.missingCementBags} bags</strong>
                  </div>
                </div>
                {triangulation.report.discrepancies.slice(0, 3).map((d) => (
                  <div key={d.code} className="rounded-lg border border-rose-500/30 bg-rose-950/20 p-2 text-[11px] text-rose-200">
                    <strong>{d.code}:</strong> {d.explanation}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Isolated Per-Project Hash-Chain Verifier */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                {chain?.verification.valid ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                ) : (
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                )}
                <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-white">
                  5. Isolated Hash-Chain ({selectedProjectId})
                </h2>
              </div>
            </div>

            {chain && (
              <div
                className={`rounded-xl border p-3 text-xs font-mono space-y-1 ${
                  chain.verification.valid
                    ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
                    : "border-rose-500/50 bg-rose-950/30 text-rose-200"
                }`}
              >
                <div className="font-bold">
                  {chain.verification.valid
                    ? `CHAIN INTACT (${chain.verification.checkedEvents} EVENTS • ${chain.storageMode})`
                    : `TAMPER CAUGHT AT SEQ #${chain.verification.tamperedSeq}`}
                </div>
                <div className="text-[11px] opacity-90">{chain.verification.reason}</div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => runChainCheck(false)}
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 py-1.5 text-xs font-mono font-semibold text-zinc-100 cursor-pointer"
              >
                Verify Site Chain
              </button>
              <button
                type="button"
                onClick={() => runChainCheck(true)}
                className="flex-1 rounded-lg border border-rose-500/40 bg-rose-950/40 hover:bg-rose-900/50 py-1.5 text-xs font-mono font-semibold text-rose-200 cursor-pointer"
              >
                Simulate ₹1 DB Tamper
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
