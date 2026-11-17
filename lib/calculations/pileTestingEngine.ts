/**
 * PROJECT VANGUARD: GEOTECHNICAL PILE LOAD TESTING & SETTLEMENT ENGINE
 * Formulated strictly under:
 * - IS 2911 (Part 4): 2013 (Design & Construction of Pile Foundations - Load Test on Piles)
 * - ASTM D1143 / D1143M-20 (Standard Test Methods for Deep Foundations Under Static Axial Compressive Load)
 * - IS 1892: Code of Practice for Subsurface Investigation for Foundations
 * - IS 456:2000 (Plain and Reinforced Concrete - Deep Foundation Elements)
 * - Indian Evidence Act Section 65B (Calibrated Load-Cell & LVDT Attestation)
 *
 * Project Vanguard Geotechnical Baseline (Gomti Alluvial Basin, Lucknow):
 * - Pile Diameter (D): 600 mm (0.60 m) bored cast-in-situ concrete pile
 * - Embedded Pile Length (L): 18.0 m into stiff silty clay / dense sandy silt strata
 * - Concrete Grade: M35 (E_c = 29,580 MPa per IS 456 Cl. 6.2.3.1)
 * - Working Design Load (Q_safe): 1100 kN (112.1 MT)
 * - Maximum Test Proof Load:
 *     Routine Load Test: 1.5 * Q_safe = 1650 kN (168.2 MT)
 *     Initial Ultimate Test: 2.5 * Q_safe = 2750 kN (280.3 MT)
 *
 * Statutory Acceptance Criteria (IS 2911 Part 4 Cl. 6.1.5):
 * 1. Total Settlement under Working Load (1100 kN) <= 12.0 mm (or 2% of pile dia = 12.0 mm).
 * 2. Total Settlement under Test Proof Load (1650 kN) <= 18.0 mm.
 * 3. Net Residual Settlement upon complete unloading <= 6.0 mm.
 */

export interface PileLoadStageRecord {
  stageIndex: number;
  stageName: string;
  loadAppliedKn: number;
  loadAppliedTonnageMt: number;
  percentageOfWorkingLoadPct: number;
  gaugeReadingsMm: [number, number, number, number]; // 4 orthogonal LVDT dial gauges
  meanSettlementMm: number;
  holdDurationMinutes: number;
  settlementRateMmPerHour: number;
  isRateStabilized: boolean; // Rate < 0.02 mm/hr or hold duration reached
}

export interface PileSpecification {
  pileTag: string;
  pileDiameterMm: number;
  embeddedDepthM: number;
  concreteGradeMpa: number;
  workingLoadKn: number;
  testLoadKn: number;
  testType: "ROUTINE_COMPRESSION_1.5X" | "INITIAL_ULTIMATE_2.5X";
  reactionType: "KENTLEDGE_CONCRETE_BLOCKS" | "GROUND_ANCHOR_REACTION_PILES";
  kentledgeDeadWeightMt: number;
}

export interface PileTestAuditSummary {
  pileTag: string;
  testType: string;
  maxLoadAppliedKn: number;
  settlementAtWorkingLoadMm: number;
  settlementAtMaxTestLoadMm: number;
  netResidualSettlementMm: number;
  elasticReboundMm: number;
  isWorkingSettlementPass: boolean;   // <= 12.0 mm
  isTestSettlementPass: boolean;      // <= 18.0 mm
  isResidualSettlementPass: boolean;  // <= 6.0 mm
  isOverallTestCertified: boolean;
  statutoryVerdict: string;
}

// 1. Elastic Axial Compression of Pile Column:
// delta_elastic = (P * L) / (A * E_c)
export function calculateTheoreticalElasticCompressionMm(
  loadKn: number,
  pileDiameterMm = 600,
  embeddedDepthM = 18.0,
  concreteGradeMpa = 35.0
): number {
  const radiusM = (pileDiameterMm / 1000) / 2;
  const areaM2 = Math.PI * radiusM * radiusM;
  const EcMpa = 5000 * Math.sqrt(concreteGradeMpa); // 29,580 MPa
  const EcKnM2 = EcMpa * 1000;

  // Assuming skin friction distributes load such that effective compressive length is ~0.67 * L
  const effectiveLengthM = embeddedDepthM * 0.67;
  const deltaM = (loadKn * effectiveLengthM) / (areaM2 * EcKnM2);

  return +(deltaM * 1000).toFixed(2); // In mm
}

// 2. Synthesize Multi-Stage Static Load-Settlement Hysteresis
export function evaluatePileLoadTest(
  stages: PileLoadStageRecord[],
  spec: PileSpecification
): PileTestAuditSummary {
  // Find reading closest to 100% working load (1100 kN)
  const workingStage = stages.find(s => Math.abs(s.loadAppliedKn - spec.workingLoadKn) < 50) || stages[4];
  const maxLoadStage = [...stages].sort((a, b) => b.loadAppliedKn - a.loadAppliedKn)[0];
  const finalUnloadedStage = stages[stages.length - 1];

  const settlementAtWorkingLoad = workingStage ? workingStage.meanSettlementMm : 0;
  const settlementAtMaxLoad = maxLoadStage ? maxLoadStage.meanSettlementMm : 0;
  const residualSettlement = finalUnloadedStage ? finalUnloadedStage.meanSettlementMm : 0;
  const elasticRebound = +(settlementAtMaxLoad - residualSettlement).toFixed(2);

  // Statutory Criteria checks:
  const isWorkingPass = settlementAtWorkingLoad <= 12.0;
  const isTestPass = settlementAtMaxLoad <= 18.0;
  const isResidualPass = residualSettlement <= 6.0;
  const isOverallPass = isWorkingPass && isTestPass && isResidualPass;

  let verdict = `PILE LOAD TEST PASSED: S_work=${settlementAtWorkingLoad}mm (<=12mm), S_max=${settlementAtMaxLoad}mm (<=18mm), S_res=${residualSettlement}mm (<=6mm). Capacity certified under IS 2911.`;
  if (!isOverallPass) {
    verdict = `PILE CAPACITY DEFICIENT: S_work=${settlementAtWorkingLoad}mm, S_max=${settlementAtMaxLoad}mm, S_res=${residualSettlement}mm. Fails statutory criteria under IS 2911 Part 4.`;
  }

  return {
    pileTag: spec.pileTag,
    testType: spec.testType,
    maxLoadAppliedKn: maxLoadStage.loadAppliedKn,
    settlementAtWorkingLoadMm: settlementAtWorkingLoad,
    settlementAtMaxTestLoadMm: settlementAtMaxLoad,
    netResidualSettlementMm: residualSettlement,
    elasticReboundMm: elasticRebound,
    isWorkingSettlementPass: isWorkingPass,
    isTestSettlementPass: isTestPass,
    isResidualSettlementPass: isResidualPass,
    isOverallTestCertified: isOverallPass,
    statutoryVerdict: verdict
  };
}
