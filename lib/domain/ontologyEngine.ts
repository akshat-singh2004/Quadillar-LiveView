import {
  evaluateMolecularGovernor,
  type GovernorSnapshot,
  type MolecularInput,
} from "@/lib/engines/molecularGovernor";

export type OntologyNodeType =
  | "PROJECT"
  | "ASSET_ZONE"
  | "SENSOR_STREAM"
  | "STATUTORY_RULE"
  | "SAFETY_PERMIT"
  | "FINANCIAL_ESCROW"
  | "CRYPTO_LEDGER";

export type OntologyStatus = "NOMINAL" | "WARNING" | "CRITICAL_LOCKED";

export interface OntologyNode {
  id: string;
  type: OntologyNodeType;
  label: string;
  status: OntologyStatus;
  metrics: Record<string, string | number | boolean>;
}

export interface OntologyEdge {
  from: string;
  to: string;
  relation: "CONTAINS" | "MONITORS" | "VIOLATES" | "BLOCKS" | "FREEZES" | "SEALS";
  weight: "LOW" | "HIGH" | "CRITICAL";
  rationale: string;
}

export interface KineticActionProposal {
  actionId: string;
  actionType: "FREEZE_RA_BILL_422" | "REVOKE_CRANE_PTW" | "REVOKE_STRIPPING_PTW" | "ISSUE_CLAUSE42_RECOVERY" | "CLEAR_FOR_RTGS";
  title: string;
  targetNodeId: string;
  financialImpactInr: number;
  standardRef: string;
  requiresDirectorSignoff: boolean;
}

export interface SiteOntologyGraph {
  projectId: string;
  generatedAtUtc: string;
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
  edges: OntologyEdge[];
  proposedActions: KineticActionProposal[];
}

export interface BlastRadiusResult {
  focusNodeId: string;
  impactedNodeIds: string[];
  impactedEdges: OntologyEdge[];
  blockedPermits: string[];
  financialExposureInr: number;
}

export interface ScenarioForkResult {
  scenarioName: string;
  mutatedDatabase: false;
  appliedOverrides: Partial<MolecularInput>;
  baseline: {
    httpStatus: number;
    violationCount: number;
    frozenInr: number;
    clause42PenaltyInr: number;
    netCertifiedReleaseInr: number;
    rowHash: string;
  };
  simulated: {
    httpStatus: number;
    violationCount: number;
    frozenInr: number;
    clause42PenaltyInr: number;
    netCertifiedReleaseInr: number;
    rowHash: string;
  };
  deltas: {
    deltaFrozenInr: number;
    deltaClause42PenaltyInr: number;
    deltaNetReleaseInr: number;
    newlyTriggeredCodes: string[];
    resolvedCodes: string[];
  };
  proposedActions: KineticActionProposal[];
}

export function buildSiteOntologyGraph(
  input: MolecularInput,
  snapshotInput?: GovernorSnapshot
): SiteOntologyGraph {
  const snapshot = snapshotInput ?? evaluateMolecularGovernor(input);
  const nodes: OntologyNode[] = [];
  const edges: OntologyEdge[] = [];
  const proposedActions: KineticActionProposal[] = [];

  const projectNodeId = `PROJECT:${input.projectId}`;
  const assetNodeId = `ASSET:${input.zoneId}`;
  const windSensorId = `SENSOR:ANEMOMETER:${input.zoneId}`;
  const escrowNodeId = `ESCROW:${input.raBillNo}`;
  const stripPtwId = `PERMIT:STRIPPING:${input.zoneId}`;
  const cranePtwId = `PERMIT:CRANE_LIFT:${input.zoneId}`;
  const ledgerNodeId = `LEDGER:BSA63:${snapshot.bsaSec63Ledger.rowHash.slice(0, 10)}`;

  const anyPayoutBlocked = snapshot.escrow.httpStatus === 422;
  const anyStripBlocked = snapshot.violations.some((v) => v.blocksStrippingPtw);
  const anyCraneBlocked = snapshot.violations.some((v) => v.blocksCranePtw);

  nodes.push(
    {
      id: projectNodeId,
      type: "PROJECT",
      label: input.projectId,
      status: anyPayoutBlocked ? "CRITICAL_LOCKED" : "NOMINAL",
      metrics: { raBillNo: input.raBillNo, violations: snapshot.violations.length },
    },
    {
      id: assetNodeId,
      type: "ASSET_ZONE",
      label: `${input.zoneId} (${input.bimGlobalId})`,
      status: snapshot.violations.length > 0 ? "CRITICAL_LOCKED" : "NOMINAL",
      metrics: { bimGlobalId: input.bimGlobalId, activeFaults: snapshot.violations.length },
    },
    {
      id: windSensorId,
      type: "SENSOR_STREAM",
      label: `Wind & Environmental Node (${input.windSpeedMs} m/s)`,
      status: input.windSpeedMs >= 15 ? "CRITICAL_LOCKED" : input.windSpeedMs >= 12 ? "WARNING" : "NOMINAL",
      metrics: { windSpeedMs: input.windSpeedMs, is875ThresholdMs: 15 },
    },
    {
      id: stripPtwId,
      type: "SAFETY_PERMIT",
      label: "Formwork De-Shuttering PTW",
      status: anyStripBlocked ? "CRITICAL_LOCKED" : "NOMINAL",
      metrics: { locked: anyStripBlocked },
    },
    {
      id: cranePtwId,
      type: "SAFETY_PERMIT",
      label: "Tower Crane Slewing & Lifting PTW",
      status: anyCraneBlocked ? "CRITICAL_LOCKED" : "NOMINAL",
      metrics: { locked: anyCraneBlocked, windSpeedMs: input.windSpeedMs },
    },
    {
      id: escrowNodeId,
      type: "FINANCIAL_ESCROW",
      label: `${input.raBillNo} Commercial Escrow`,
      status: anyPayoutBlocked ? "CRITICAL_LOCKED" : "NOMINAL",
      metrics: {
        httpStatus: snapshot.escrow.httpStatus,
        grossClaimInr: snapshot.escrow.grossClaimInr,
        frozenInr: snapshot.escrow.frozenInr,
        clause42PenaltyInr: snapshot.escrow.clause42PenaltyInr,
        netCertifiedReleaseInr: snapshot.escrow.netCertifiedReleaseInr,
      },
    },
    {
      id: ledgerNodeId,
      type: "CRYPTO_LEDGER",
      label: `BSA Sec 63 Seal (${snapshot.bsaSec63Ledger.rowHash.slice(0, 12)})`,
      status: "NOMINAL",
      metrics: {
        rowHash: snapshot.bsaSec63Ledger.rowHash,
        prevHash: snapshot.bsaSec63Ledger.prevHash,
        recordedAtUtc: snapshot.bsaSec63Ledger.recordedAtUtc,
      },
    }
  );

  edges.push(
    {
      from: projectNodeId,
      to: assetNodeId,
      relation: "CONTAINS",
      weight: "LOW",
      rationale: "Primary BIM structural element under active governance",
    },
    {
      from: windSensorId,
      to: assetNodeId,
      relation: "MONITORS",
      weight: input.windSpeedMs >= 15 ? "CRITICAL" : "LOW",
      rationale: "Continuous meteorological telemetry feeding IS 875 Part 3 checks",
    },
    {
      from: escrowNodeId,
      to: ledgerNodeId,
      relation: "SEALS",
      weight: "HIGH",
      rationale: "Deterministic FIPS 180-4 SHA-256 evidentiary record under BSA Section 63",
    }
  );

  for (const v of snapshot.violations) {
    const ruleId = `RULE:${v.code}`;
    nodes.push({
      id: ruleId,
      type: "STATUTORY_RULE",
      label: `${v.code} (${v.standardRef})`,
      status: "CRITICAL_LOCKED",
      metrics: {
        standardRef: v.standardRef,
        blocksPayout: v.blocksPayout,
        blocksStrippingPtw: v.blocksStrippingPtw,
        blocksCranePtw: v.blocksCranePtw,
      },
    });

    edges.push({
      from: assetNodeId,
      to: ruleId,
      relation: "VIOLATES",
      weight: "CRITICAL",
      rationale: v.message,
    });

    if (v.blocksPayout) {
      edges.push({
        from: ruleId,
        to: escrowNodeId,
        relation: "FREEZES",
        weight: "CRITICAL",
        rationale: `Triggers HTTP 422 escrow hold under ${v.standardRef}`,
      });
    }
    if (v.blocksStrippingPtw) {
      edges.push({
        from: ruleId,
        to: stripPtwId,
        relation: "BLOCKS",
        weight: "CRITICAL",
        rationale: `Locks de-shuttering permit under ${v.standardRef}`,
      });
    }
    if (v.blocksCranePtw) {
      edges.push({
        from: ruleId,
        to: cranePtwId,
        relation: "BLOCKS",
        weight: "CRITICAL",
        rationale: `Locks crane slewing/lifting under ${v.standardRef}`,
      });
    }
  }

  // Generate structured Kinetic Action Proposals grounded 100% in Governor output
  if (anyPayoutBlocked) {
    proposedActions.push({
      actionId: `ACT-FREEZE-${input.raBillNo}`,
      actionType: "FREEZE_RA_BILL_422",
      title: `Enforce HTTP 422 Hold on ${input.raBillNo} (Freeze ₹${snapshot.escrow.frozenInr.toLocaleString("en-IN")})`,
      targetNodeId: escrowNodeId,
      financialImpactInr: snapshot.escrow.frozenInr,
      standardRef: "IS 456 / CPWD Contractual Escrow Gate",
      requiresDirectorSignoff: true,
    });
  } else {
    proposedActions.push({
      actionId: `ACT-RTGS-${input.raBillNo}`,
      actionType: "CLEAR_FOR_RTGS",
      title: `Approve Net Certified RTGS Release (₹${snapshot.escrow.netCertifiedReleaseInr.toLocaleString("en-IN")})`,
      targetNodeId: escrowNodeId,
      financialImpactInr: snapshot.escrow.netCertifiedReleaseInr,
      standardRef: "BSA Section 63 Verified Release",
      requiresDirectorSignoff: true,
    });
  }

  if (anyCraneBlocked) {
    proposedActions.push({
      actionId: `ACT-CRANE-${input.zoneId}`,
      actionType: "REVOKE_CRANE_PTW",
      title: `Lock Tower Crane Slewing PTW (${input.windSpeedMs} m/s wind breach)`,
      targetNodeId: cranePtwId,
      financialImpactInr: 0,
      standardRef: "IS 875 Part 3",
      requiresDirectorSignoff: false,
    });
  }

  if (anyStripBlocked) {
    proposedActions.push({
      actionId: `ACT-STRIP-${input.zoneId}`,
      actionType: "REVOKE_STRIPPING_PTW",
      title: `Suspend Formwork Stripping PTW on ${input.zoneId}`,
      targetNodeId: stripPtwId,
      financialImpactInr: 0,
      standardRef: "IS 456:2000 Clause 11.3 / CIRIA C660",
      requiresDirectorSignoff: false,
    });
  }

  if (snapshot.escrow.clause42PenaltyInr > 0) {
    proposedActions.push({
      actionId: `ACT-CL42-${input.raBillNo}`,
      actionType: "ISSUE_CLAUSE42_RECOVERY",
      title: `Issue Double-Rate CPWD Clause 42 Recovery Notice (₹${snapshot.escrow.clause42PenaltyInr.toLocaleString("en-IN")})`,
      targetNodeId: escrowNodeId,
      financialImpactInr: snapshot.escrow.clause42PenaltyInr,
      standardRef: "CPWD GCC Clause 42",
      requiresDirectorSignoff: true,
    });
  }

  return {
    projectId: input.projectId,
    generatedAtUtc: new Date().toISOString(),
    rowHash: snapshot.bsaSec63Ledger.rowHash,
    summary: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      lockedNodes: nodes.filter((n) => n.status === "CRITICAL_LOCKED").length,
      frozenInr: snapshot.escrow.frozenInr,
      netCertifiedReleaseInr: snapshot.escrow.netCertifiedReleaseInr,
      httpStatus: snapshot.escrow.httpStatus,
    },
    nodes,
    edges,
    proposedActions,
  };
}

export function traceBlastRadius(graph: SiteOntologyGraph, focusNodeId: string): BlastRadiusResult {
  const visited = new Set<string>([focusNodeId]);
  const queue: string[] = [focusNodeId];
  const impactedEdges: OntologyEdge[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const edge of graph.edges) {
      if (edge.from === current) {
        impactedEdges.push(edge);
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push(edge.to);
        }
      }
    }
  }

  const impactedNodeIds = Array.from(visited);
  const blockedPermits = graph.nodes
    .filter((n) => visited.has(n.id) && n.type === "SAFETY_PERMIT" && n.status === "CRITICAL_LOCKED")
    .map((n) => n.label);

  const escrowNode = graph.nodes.find((n) => visited.has(n.id) && n.type === "FINANCIAL_ESCROW");
  const financialExposureInr = escrowNode
    ? Number(escrowNode.metrics.frozenInr || 0) + Number(escrowNode.metrics.clause42PenaltyInr || 0)
    : 0;

  return {
    focusNodeId,
    impactedNodeIds,
    impactedEdges,
    blockedPermits,
    financialExposureInr,
  };
}

export function simulateScenarioFork(
  baseInput: MolecularInput,
  overrides: Partial<MolecularInput>,
  scenarioName = "Ad-Hoc Crisis Simulation"
): ScenarioForkResult {
  const baselineSnap = evaluateMolecularGovernor(baseInput);
  const forkedInput: MolecularInput = {
    ...baseInput,
    ...overrides,
    recordedAtUtc: overrides.recordedAtUtc || new Date().toISOString(),
  };
  const simulatedSnap = evaluateMolecularGovernor(forkedInput);
  const forkedGraph = buildSiteOntologyGraph(forkedInput, simulatedSnap);

  const baseCodes = new Set(baselineSnap.violations.map((v) => v.code));
  const simCodes = new Set(simulatedSnap.violations.map((v) => v.code));

  return {
    scenarioName,
    mutatedDatabase: false,
    appliedOverrides: overrides,
    baseline: {
      httpStatus: baselineSnap.escrow.httpStatus,
      violationCount: baselineSnap.violations.length,
      frozenInr: baselineSnap.escrow.frozenInr,
      clause42PenaltyInr: baselineSnap.escrow.clause42PenaltyInr,
      netCertifiedReleaseInr: baselineSnap.escrow.netCertifiedReleaseInr,
      rowHash: baselineSnap.bsaSec63Ledger.rowHash,
    },
    simulated: {
      httpStatus: simulatedSnap.escrow.httpStatus,
      violationCount: simulatedSnap.violations.length,
      frozenInr: simulatedSnap.escrow.frozenInr,
      clause42PenaltyInr: simulatedSnap.escrow.clause42PenaltyInr,
      netCertifiedReleaseInr: simulatedSnap.escrow.netCertifiedReleaseInr,
      rowHash: simulatedSnap.bsaSec63Ledger.rowHash,
    },
    deltas: {
      deltaFrozenInr: simulatedSnap.escrow.frozenInr - baselineSnap.escrow.frozenInr,
      deltaClause42PenaltyInr: simulatedSnap.escrow.clause42PenaltyInr - baselineSnap.escrow.clause42PenaltyInr,
      deltaNetReleaseInr: simulatedSnap.escrow.netCertifiedReleaseInr - baselineSnap.escrow.netCertifiedReleaseInr,
      newlyTriggeredCodes: Array.from(simCodes).filter((c) => !baseCodes.has(c)),
      resolvedCodes: Array.from(baseCodes).filter((c) => !simCodes.has(c)),
    },
    proposedActions: forkedGraph.proposedActions,
  };
}
