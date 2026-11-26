import assert from "node:assert/strict";
import {
  COMPLIANT_TG03_FIXTURE,
  EXTREME_TG03_FIXTURE,
} from "../lib/engines/molecularGovernor";
import {
  buildSiteOntologyGraph,
  simulateScenarioFork,
  traceBlastRadius,
} from "../lib/domain/ontologyEngine";
import { getAiRouterDiagnostics } from "../lib/ai/modelRouter";

// 1. Causal Ontology + Blast Radius on Extreme TG-03 Cascade
const extremeGraph = buildSiteOntologyGraph(EXTREME_TG03_FIXTURE);
assert.equal(extremeGraph.summary.httpStatus, 422, "Extreme graph must lock escrow at HTTP 422");
assert.ok(extremeGraph.nodes.length >= 10, "Extreme graph must emit project, asset, permits, escrow, ledger & rule nodes");
assert.ok(extremeGraph.proposedActions.some((a) => a.actionType === "FREEZE_RA_BILL_422"), "Must propose HTTP 422 freeze action");

const blast = traceBlastRadius(extremeGraph, `ASSET:${EXTREME_TG03_FIXTURE.zoneId}`);
assert.ok(blast.impactedNodeIds.includes(`ESCROW:${EXTREME_TG03_FIXTURE.raBillNo}`), "Blast radius must reach RA Bill escrow node");
assert.ok(blast.blockedPermits.length >= 1, "Blast radius must report blocked permits");
assert.equal(blast.financialExposureInr, 6200000 + 33120, "Financial exposure must equal frozen + Clause 42 penalty");
console.log(
  `[PASS] Causal Ontology & Blast Radius -> ${extremeGraph.summary.totalNodes} nodes, ${extremeGraph.summary.totalEdges} edges | Exposure: ₹${blast.financialExposureInr.toLocaleString("en-IN")} | Blocked PTWs: ${blast.blockedPermits.length}`
);

// 2. Zero-Mutation What-If Scenario Fork (Compliant -> 22.5 m/s Cyclone Gust)
const originalWind = COMPLIANT_TG03_FIXTURE.windSpeedMs;
const fork = simulateScenarioFork(COMPLIANT_TG03_FIXTURE, { windSpeedMs: 22.5 }, "Cyclone Wind Gust Shock");
assert.equal(fork.mutatedDatabase, false, "Scenario fork must never mutate DB");
assert.equal(COMPLIANT_TG03_FIXTURE.windSpeedMs, originalWind, "Scenario fork must never mutate input fixture");
assert.equal(fork.baseline.violationCount, 0, "Compliant baseline starts at 0 violations");
assert.ok(fork.simulated.violationCount >= 1, "22.5 m/s gust must trigger crane/wind violation");
assert.ok(fork.deltas.newlyTriggeredCodes.length >= 1, "Deltas must isolate newly triggered code");
console.log(
  `[PASS] What-If Scenario Fork -> Baseline: 0 faults -> Cyclone 22.5 m/s: +${fork.deltas.newlyTriggeredCodes.join(", ")} (Zero DB mutation)`
);

// 3. Multi-Model AI Router diagnostics
const diag = getAiRouterDiagnostics();
assert.equal(diag.deterministicFallbackAlwaysReady, true, "Deterministic fallback must always be ready");
assert.ok(diag.tiers.fast_sensory.gemini.includes("gemini-4-hydrogen"), "Fast sensory tier must default to gemini-4-hydrogen");
assert.ok(diag.tiers.deep_reasoning.gemini.includes("gemini-3.8-flash"), "Deep reasoning tier must default to gemini-3.8-flash");
console.log(
  `[PASS] Multi-Model AI Router -> Providers configured: [${diag.configuredProviders.join(", ") || "deterministic-only"}] | 3 tiers ready`
);
