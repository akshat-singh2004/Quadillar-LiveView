import { CubeStatisticalAcceptanceEngine } from "../lib/agents/sub-agents/aegis/cube-statistics";
import { RebarCoverDurabilityAuditor } from "../lib/agents/sub-agents/aegis/rebar-cover";
import { NurseSaulIntegrator } from "../lib/agents/sub-agents/daedalus/nurse-saul";
import { CiriaThermalStrainAuditor } from "../lib/agents/sub-agents/daedalus/ciria-thermal";
import { CpwdClause10CCEscalator } from "../lib/agents/sub-agents/midas/cpwd-escalation";
import { StatutoryTaxWithholdingAuditor } from "../lib/agents/sub-agents/midas/tax-withholding";
import { CuttingStock1DBilletOptimizer } from "../lib/agents/sub-agents/vulcan/cutting-stock";
import { Clause42PenalRecoveryEngine } from "../lib/agents/sub-agents/vulcan/clause42-reconciler";
import { BiometricAntiPassbackReconciler } from "../lib/agents/sub-agents/plutus/turnstile-reconciler";
import { StatutoryMinWageTierAuditor } from "../lib/agents/sub-agents/plutus/bocw-wages";
import { CpmTopologicalSortEngine } from "../lib/agents/sub-agents/chronos/cpm-engine";
import { LiquidatedDamagesCalculator } from "../lib/agents/sub-agents/themis/ld-calculator";
import { MicroclimateWeatherAuditor } from "../lib/agents/sub-agents/argus/weather-auditor";
import { OeeFleetEngine } from "../lib/agents/sub-agents/ananke/oee-engine";
import { AabbCollisionDetector } from "../lib/agents/sub-agents/minerva/aabb-collision";

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`\x1b[1;31m  ✗ FAILED: ${testName}\x1b[0m`);
    process.exit(1);
  }
  console.log(`\x1b[1;32m  ✓ PASSED: ${testName}\x1b[0m`);
}

console.log("\n\x1b[1;36m=== EXECUTING AUTONOMOUS SUB-AGENT STATUTORY UNIT TEST SUITE ===\x1b[0m\n");

// 1. IS 456 Table 11 Cube Statistics
console.log("[1/15] Aegis: CubeStatisticalAcceptanceEngine");
const validCubes = [
  { sampleId: "C1", ageDays: 28, failureLoadKn: 900, crossSectionAreaMm2: 22500 }, // 40.0 MPa
  { sampleId: "C2", ageDays: 28, failureLoadKn: 920, crossSectionAreaMm2: 22500 }, // 40.89 MPa
  { sampleId: "C3", ageDays: 28, failureLoadKn: 910, crossSectionAreaMm2: 22500 }, // 40.44 MPa
];
const passProof = CubeStatisticalAcceptanceEngine.evaluateBatch(35, validCubes);
assert(passProof.isBatchAccepted === true, "M35 concrete with >40 MPa cubes must pass Table 11");

const failedCubes = [
  { sampleId: "C1", ageDays: 28, failureLoadKn: 650, crossSectionAreaMm2: 22500 }, // 28.89 MPa (< 32 MPa threshold)
  { sampleId: "C2", ageDays: 28, failureLoadKn: 670, crossSectionAreaMm2: 22500 },
  { sampleId: "C3", ageDays: 28, failureLoadKn: 660, crossSectionAreaMm2: 22500 },
];
const failProof = CubeStatisticalAcceptanceEngine.evaluateBatch(35, failedCubes);
assert(failProof.isBatchAccepted === false, "M35 concrete with <32 MPa cubes must fail Criterion 2");

// 2. IS 456 Table 16 Rebar Cover
console.log("\n[2/15] Aegis: RebarCoverDurabilityAuditor");
const coverPass = RebarCoverDurabilityAuditor.auditCoverBlockInstallation({
  exposure: "SEVERE",
  memberType: "BEAM",
  installedCoverMm: 50,
});
assert(coverPass.compliant === true && coverPass.requiredMm === 45, "Severe exposure beam requires 45mm cover");

// 3. ASTM C1074 Nurse-Saul Maturity
console.log("\n[3/15] Daedalus: NurseSaulIntegrator");
const maturity = NurseSaulIntegrator.computeMaturityIndex(40, 30, 48); // avg 35°C, (35 - (-10)) * 48 = 2160
assert(maturity === 2160, "Maturity index at avg 35°C for 48h must equal 2160 °C·hrs");
const strength = NurseSaulIntegrator.estimateStrengthMpa(maturity, 35);
assert(strength > 25, "Estimated compressive strength must show hydration progression");

// 4. CIRIA C766 Thermal Cracking & DEF
console.log("\n[4/15] Daedalus: CiriaThermalStrainAuditor");
const thermalSafe = CiriaThermalStrainAuditor.evaluateThermalGradient(55, 38); // Delta = 17°C
assert(thermalSafe.isGradientSafe === true && thermalSafe.isDefSafe === true, "Delta 17°C is within CIRIA 20°C limit");
const thermalBreach = CiriaThermalStrainAuditor.evaluateThermalGradient(68, 42); // Delta = 26°C
assert(thermalBreach.isGradientSafe === false, "Delta 26°C must breach 20°C limit");

// 5. CPWD GCC Cl. 10CC Escalation
console.log("\n[5/15] Midas: CpwdClause10CCEscalator");
const escalation = CpwdClause10CCEscalator.calculateLaborEscalation({
  grossWorkDoneR: 10000000,
  laborComponentPct: 25,
  baseLaborIndexL0: 200,
  currentLaborIndexLi: 220, // +10% increase
});
assert(escalation === 212500, "10% labor index increase on ₹1Cr with 25% labor component must equal ₹2,12,500");

// 6. Statutory Tax & Retainage Waterfall
console.log("\n[6/15] Midas: StatutoryTaxWithholdingAuditor");
const taxWaterfall = StatutoryTaxWithholdingAuditor.computeDeductions(1000000);
assert(taxWaterfall.retentionInr === 50000, "5% retention on ₹10L must equal ₹50,000");
assert(taxWaterfall.bocwCessInr === 10000, "1% BOCW Cess on ₹10L must equal ₹10,000");
assert(taxWaterfall.netPayableInr === 900000, "Total deductions of 10% leave ₹9,00,000 net payable");

// 7. 1D Cutting-Stock Rebar Optimizer
console.log("\n[7/15] Vulcan: CuttingStock1DBilletOptimizer");
const cutResult = CuttingStock1DBilletOptimizer.optimize12mBillets([5.8, 5.8, 5.8, 5.8]);
assert(cutResult.billetsNeeded === 2, "Four 5.8m pieces fit into two 12.0m billets");

// 8. CPWD GCC Cl. 42 Material Recovery
console.log("\n[8/15] Vulcan: Clause42PenalRecoveryEngine");
const steelReconcile = Clause42PenalRecoveryEngine.evaluateReconciliation({
  material: "STEEL",
  theoreticalQty: 100, // +3% tolerance = 103 MT allowable
  actualQty: 105,      // 2 MT excess
  stipulatedRateInr: 65000,
});
assert(steelReconcile.excessQty === 2 && steelReconcile.penalDebitInr === 260000, "2 MT excess steel charged at 2x rate = ₹2,60,000");

// 9. BOCW Biometric Turnstile Muster
console.log("\n[9/15] Plutus: BiometricAntiPassbackReconciler");
const musterAudit = BiometricAntiPassbackReconciler.reconcileTurnstileLogs(
  ["PIN-01", "PIN-02"],
  ["PIN-01", "PIN-02", "PIN-03", "PIN-04"] // 2 ghost workers
);
assert(musterAudit.ghostCount === 2 && musterAudit.ghostDebitInr === 1500, "2 ghost workers flag ₹1,500 contra-charge");

// 10. Minimum Wages Act 1948 Floor
console.log("\n[10/15] Plutus: StatutoryMinWageTierAuditor");
assert(StatutoryMinWageTierAuditor.auditWageCompliance("SKILLED", 850) === true, "₹850 satisfies skilled minimum wage");
assert(StatutoryMinWageTierAuditor.auditWageCompliance("SKILLED", 700) === false, "₹700 breaches skilled minimum wage");

// 11. CPM Schedule Topological Sort
console.log("\n[11/15] Chronos: CpmTopologicalSortEngine");
const cpm = CpmTopologicalSortEngine.computeCriticalPathFloat([
  { id: "A", durationDays: 10, predecessors: [] },
  { id: "B", durationDays: 15, predecessors: ["A"] },
]);
assert(cpm.projectDurationDays === 25, "Sequential 10d + 15d path duration must equal 25 days");

// 12. CPWD Cl. 2 Liquidated Damages
console.log("\n[12/15] Themis: LiquidatedDamagesCalculator");
const ldResult = LiquidatedDamagesCalculator.compute(100000000, 14); // 2 weeks delay = 2% of ₹10Cr
assert(ldResult.ldInr === 2000000, "2 weeks unexcused delay evaluates to ₹20,00,000 LD");

// 13. IS 13367 Microclimate Weather Cutoff
console.log("\n[13/15] Argus: MicroclimateWeatherAuditor");
const windCheck = MicroclimateWeatherAuditor.evaluate(42, 0, 30); // 42 km/h > 38 km/h
assert(windCheck.permitted === false, "Wind speed 42 km/h must trigger crane stoppage");

// 14. ISO 22400 Fleet OEE
console.log("\n[14/15] Ananke: OeeFleetEngine");
const oee = OeeFleetEngine.compute(8, 8, 180, 200); // 100% avail * 90% perf = 90%
assert(oee === 90, "8/8h availability and 180/200 m3 output yields 90.0% OEE");

// 15. ISO 19650 AABB 3D Collision
console.log("\n[15/15] Minerva: AabbCollisionDetector");
const box1 = { minX: 0, maxX: 2, minY: 0, maxY: 2, minZ: 0, maxZ: 2 };
const box2 = { minX: 1.5, maxX: 3, minY: 1, maxY: 3, minZ: 1, maxZ: 3 };
assert(AabbCollisionDetector.checkCollision(box1, box2) === true, "Overlapping 3D bounding boxes must trigger collision");

console.log("\n\x1b[1;32m======================================================================\x1b[0m");
console.log("\x1b[1;32m  ALL 15 SUB-AGENT MATHEMATICAL STATUTORY TESTS PASSED WITH 100% SUCCESS \x1b[0m");
console.log("\x1b[1;32m======================================================================\x1b[0m\n");
