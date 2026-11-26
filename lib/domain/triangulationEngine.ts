export type TriangulationVerdict =
  | "VERIFIED_CONSISTENT"
  | "ANOMALY_REVIEW"
  | "FRAUD_OR_DILUTION_LOCK_422";

export type DiscrepancyCode =
  | "GHOST_VOLUME_BILLING"
  | "TRANSIT_DIVERSION_MISMATCH"
  | "BIM_POUR_PADDING"
  | "GRADE_DILUTION_FRAUD"
  | "WATER_CEMENT_BREACH"
  | "CEMENT_SHORTAGE_CLAUSE42";

export interface TriangulationInput {
  projectId: string;
  zoneId: string;
  challanNo: string;
  vendorName: string;
  // Signal 1: Paper / Digital Delivery Challan
  challanVolumeM3: number;
  claimedGradeMpa: number;
  claimedCementBags: number;
  // Signal 2: Gate Weighbridge + ANPR Load Cell
  weighbridgeNetKg: number;
  wetConcreteDensityKgM3?: number; // Default IS standard ~2400 kg/m3
  // Signal 3: Batching Plant PLC Telemetry
  plcBatchVolumeM3: number;
  plcCementKg: number;
  plcWaterCementRatio: number;
  // Signal 4: Revit / BIM Design Quantity
  bimDesignVolumeM3: number;
  // Signal 5: In-Situ Curing Maturity & Thermal Sensor
  inSituEstimatedMpa: number;
  coreTempPeakC?: number;
  // Commercial Rates (INR)
  concreteRatePerM3Inr?: number;
  cementRatePerBagInr?: number;
}

export interface TriangulationDiscrepancy {
  code: DiscrepancyCode;
  severity: "HIGH" | "CRITICAL";
  signalsCompared: [string, string];
  expected: string;
  observed: string;
  variancePct: number;
  financialRiskInr: number;
  standardRef: string;
  explanation: string;
}

export interface TriangulationReport {
  projectId: string;
  zoneId: string;
  challanNo: string;
  vendorName: string;
  verdict: TriangulationVerdict;
  httpStatus: 200 | 422;
  trustScorePct: number;
  derivedMetrics: {
    weighbridgeDerivedM3: number;
    plcDerivedCementBags: number;
    effectiveDeliveredM3: number;
    ghostVolumeM3: number;
    missingCementBags: number;
    strengthRatioPct: number;
  };
  discrepancies: TriangulationDiscrepancy[];
  recommendedEscrowHoldInr: number;
  recommendedClause42PenaltyInr: number;
  totalFinancialExposureInr: number;
  summary: string;
}

/**
 * Realistic Lucknow site fraud/dilution stress fixture:
 * Paper challan bills 42.0 m3 M50 (360 bags), but Weighbridge (90,720 kg = 37.8 m3)
 * and Batching PLC (38.0 m3, 15,200 kg cement, w/c 0.51) prove 4.2 m3 ghost billing,
 * 56 missing cement bags, and in-situ curing thermal curve shows 36.4 MPa (~M35).
 */
export const VANGUARD_FRAUD_FIXTURE: TriangulationInput = {
  projectId: "VANGUARD-LKO-01",
  zoneId: "BIT-4-TG03",
  challanNo: "CHLN-LKO-2026-0842",
  vendorName: "Avadh ReadyMix Infra Pvt. Ltd.",
  challanVolumeM3: 42.0,
  claimedGradeMpa: 50,
  claimedCementBags: 360,
  weighbridgeNetKg: 90720,
  wetConcreteDensityKgM3: 2400,
  plcBatchVolumeM3: 38.0,
  plcCementKg: 15200,
  plcWaterCementRatio: 0.51,
  bimDesignVolumeM3: 38.5,
  inSituEstimatedMpa: 36.4,
  coreTempPeakC: 74.2,
  concreteRatePerM3Inr: 7800,
  cementRatePerBagInr: 420,
};

export const VANGUARD_CLEAN_POUR_FIXTURE: TriangulationInput = {
  projectId: "VANGUARD-LKO-01",
  zoneId: "BIT-4-TG03",
  challanNo: "CHLN-LKO-2026-0899",
  vendorName: "Avadh ReadyMix Infra Pvt. Ltd.",
  challanVolumeM3: 38.0,
  claimedGradeMpa: 50,
  claimedCementBags: 320,
  weighbridgeNetKg: 91200,
  wetConcreteDensityKgM3: 2400,
  plcBatchVolumeM3: 38.0,
  plcCementKg: 16000,
  plcWaterCementRatio: 0.39,
  bimDesignVolumeM3: 38.0,
  inSituEstimatedMpa: 51.8,
  coreTempPeakC: 61.5,
  concreteRatePerM3Inr: 7800,
  cementRatePerBagInr: 420,
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function evaluateFiveWayTriangulation(input: TriangulationInput): TriangulationReport {
  const density = input.wetConcreteDensityKgM3 ?? 2400;
  const concreteRate = input.concreteRatePerM3Inr ?? 7800;
  const cementRate = input.cementRatePerBagInr ?? 420;

  const weighbridgeDerivedM3 = round2(input.weighbridgeNetKg / density);
  const plcDerivedCementBags = round2(input.plcCementKg / 50);
  const effectiveDeliveredM3 = round2(Math.min(weighbridgeDerivedM3, input.plcBatchVolumeM3));
  const ghostVolumeM3 = round2(Math.max(0, input.challanVolumeM3 - effectiveDeliveredM3));
  const missingCementBags = round2(Math.max(0, input.claimedCementBags - plcDerivedCementBags));
  const strengthRatioPct = round2((input.inSituEstimatedMpa / Math.max(1, input.claimedGradeMpa)) * 100);

  const discrepancies: TriangulationDiscrepancy[] = [];
  let penaltyScore = 0;
  let recommendedEscrowHoldInr = 0;
  let recommendedClause42PenaltyInr = 0;

  // Cross-Check 1: Paper Challan vs. Physical Weighbridge Load Cell (>3% variance)
  const challanVsWeighPct =
    input.challanVolumeM3 > 0
      ? round2(((input.challanVolumeM3 - weighbridgeDerivedM3) / input.challanVolumeM3) * 100)
      : 0;

  if (challanVsWeighPct > 3.0) {
    const ghostInr = Math.round(ghostVolumeM3 * concreteRate);
    recommendedEscrowHoldInr += ghostInr;
    penaltyScore += 28;
    discrepancies.push({
      code: "GHOST_VOLUME_BILLING",
      severity: "CRITICAL",
      signalsCompared: ["Paper Challan", "Gate Weighbridge ANPR"],
      expected: `${input.challanVolumeM3.toFixed(2)} m³ billed`,
      observed: `${weighbridgeDerivedM3.toFixed(2)} m³ weighed (${input.weighbridgeNetKg.toLocaleString("en-IN")} kg)`,
      variancePct: challanVsWeighPct,
      financialRiskInr: ghostInr,
      standardRef: "CPWD Measurement Integrity & Gate Interlock",
      explanation: `Challan overbills physical weighbridge mass by ${ghostVolumeM3.toFixed(2)} m³ (${challanVsWeighPct}%).`,
    });
  }

  // Cross-Check 2: Batching Plant PLC vs. Gate Weighbridge (>3% transit diversion)
  const plcVsWeighPct =
    input.plcBatchVolumeM3 > 0
      ? round2((Math.abs(input.plcBatchVolumeM3 - weighbridgeDerivedM3) / input.plcBatchVolumeM3) * 100)
      : 0;

  if (plcVsWeighPct > 3.0) {
    const divertedM3 = round2(Math.abs(input.plcBatchVolumeM3 - weighbridgeDerivedM3));
    const diversionInr = Math.round(divertedM3 * concreteRate);
    recommendedEscrowHoldInr += diversionInr;
    penaltyScore += 18;
    discrepancies.push({
      code: "TRANSIT_DIVERSION_MISMATCH",
      severity: "HIGH",
      signalsCompared: ["Batching Plant PLC", "Gate Weighbridge ANPR"],
      expected: `${input.plcBatchVolumeM3.toFixed(2)} m³ batched`,
      observed: `${weighbridgeDerivedM3.toFixed(2)} m³ arrived at gate`,
      variancePct: plcVsWeighPct,
      financialRiskInr: diversionInr,
      standardRef: "RMC Transit Custody Verification",
      explanation: `Batching PLC dispatch and site weighbridge diverge by ${plcVsWeighPct}% (${divertedM3.toFixed(2)} m³).`,
    });
  }

  // Cross-Check 3: Paper Challan vs. Revit/BIM Theoretical Pour Volume (>5% padding)
  const challanVsBimPct =
    input.bimDesignVolumeM3 > 0
      ? round2(((input.challanVolumeM3 - input.bimDesignVolumeM3) / input.bimDesignVolumeM3) * 100)
      : 0;

  if (challanVsBimPct > 5.0) {
    const excessBimM3 = round2(input.challanVolumeM3 - input.bimDesignVolumeM3);
    const paddingInr = Math.round(excessBimM3 * concreteRate);
    penaltyScore += 16;
    discrepancies.push({
      code: "BIM_POUR_PADDING",
      severity: "HIGH",
      signalsCompared: ["Paper Challan", "Revit IFC BIM Quantity"],
      expected: `${input.bimDesignVolumeM3.toFixed(2)} m³ BIM geometry (+5% max wastage)`,
      observed: `${input.challanVolumeM3.toFixed(2)} m³ billed (+${challanVsBimPct}%)`,
      variancePct: challanVsBimPct,
      financialRiskInr: paddingInr,
      standardRef: "ISO 19650 / BIM Quantity Reconciliation",
      explanation: `Billed pour exceeds 3D BIM structural volume by ${excessBimM3.toFixed(2)} m³ (+${challanVsBimPct}%).`,
    });
  }

  // Cross-Check 4: Claimed Grade vs. In-Situ Curing Maturity Curve (<85% fck)
  const minAcceptedMpa = round2(input.claimedGradeMpa * 0.85);
  if (input.inSituEstimatedMpa < minAcceptedMpa) {
    const fullPourFreezeInr = Math.round(input.challanVolumeM3 * concreteRate);
    recommendedEscrowHoldInr = Math.max(recommendedEscrowHoldInr, fullPourFreezeInr);
    penaltyScore += 35;
    discrepancies.push({
      code: "GRADE_DILUTION_FRAUD",
      severity: "CRITICAL",
      signalsCompared: ["Claimed Grade (Challan)", "In-Situ Maturity & Thermal Curve"],
      expected: `>= ${minAcceptedMpa.toFixed(1)} MPa (0.85 × M${input.claimedGradeMpa})`,
      observed: `${input.inSituEstimatedMpa.toFixed(1)} MPa (${strengthRatioPct}% of target)`,
      variancePct: round2(100 - strengthRatioPct),
      financialRiskInr: fullPourFreezeInr,
      standardRef: "IS 456:2000 Cl. 17.4.3 & ASTM C1074 Maturity",
      explanation: `In-situ curing strength (${input.inSituEstimatedMpa} MPa) indicates lower concrete grade or transit water dilution; entire pour value locked.`,
    });
  }

  // Cross-Check 5: Batching PLC Water-Cement Ratio (>0.45 for structural M35+/severe exposure)
  const maxWc = input.claimedGradeMpa >= 40 ? 0.45 : 0.5;
  if (input.plcWaterCementRatio > maxWc) {
    const wcVarPct = round2(((input.plcWaterCementRatio - maxWc) / maxWc) * 100);
    penaltyScore += 15;
    discrepancies.push({
      code: "WATER_CEMENT_BREACH",
      severity: "HIGH",
      signalsCompared: ["Batching Plant PLC", "IS 456 Table 5 Durability Cap"],
      expected: `w/c <= ${maxWc.toFixed(2)}`,
      observed: `w/c = ${input.plcWaterCementRatio.toFixed(2)}`,
      variancePct: wcVarPct,
      financialRiskInr: 0,
      standardRef: "IS 456:2000 Table 5",
      explanation: `Excess water-cement ratio (${input.plcWaterCementRatio}) compromises M${input.claimedGradeMpa} durability and compressive strength.`,
    });
  }

  // Cross-Check 6: Claimed Cement Bags vs. PLC Cement Weight (CPWD Clause 42 double recovery >2% variation)
  const cementShortPct =
    input.claimedCementBags > 0
      ? round2((missingCementBags / input.claimedCementBags) * 100)
      : 0;

  if (cementShortPct > 2.0) {
    // CPWD GCC Clause 42 double-rate penal recovery for unexplained material shortfall
    recommendedClause42PenaltyInr = Math.round(missingCementBags * 2 * cementRate);
    penaltyScore += 22;
    discrepancies.push({
      code: "CEMENT_SHORTAGE_CLAUSE42",
      severity: "CRITICAL",
      signalsCompared: ["Challan Cement Claim", "Batching Plant PLC Silo Weight"],
      expected: `${input.claimedCementBags} bags (${(input.claimedCementBags * 50).toLocaleString("en-IN")} kg)`,
      observed: `${plcDerivedCementBags} bags (${input.plcCementKg.toLocaleString("en-IN")} kg)`,
      variancePct: cementShortPct,
      financialRiskInr: recommendedClause42PenaltyInr,
      standardRef: "CPWD GCC Clause 42 (Double-Rate Recovery)",
      explanation: `PLC silo telemetry shows ${missingCementBags} fewer cement bags than claimed -> triggers 2× Clause 42 recovery (₹${recommendedClause42PenaltyInr.toLocaleString("en-IN")}).`,
    });
  }

  const trustScorePct = Math.max(0, 100 - penaltyScore);
  const hasCritical = discrepancies.some((d) => d.severity === "CRITICAL");
  const verdict: TriangulationVerdict = hasCritical
    ? "FRAUD_OR_DILUTION_LOCK_422"
    : discrepancies.length > 0
    ? "ANOMALY_REVIEW"
    : "VERIFIED_CONSISTENT";

  const httpStatus: 200 | 422 = hasCritical ? 422 : 200;
  const totalFinancialExposureInr = recommendedEscrowHoldInr + recommendedClause42PenaltyInr;

  const summary =
    discrepancies.length === 0
      ? `All 5 independent streams align for ${input.challanNo} (${input.zoneId}). Trust score 100%; cleared for billing.`
      : `${discrepancies.length} cross-signal discrepancies caught on ${input.challanNo} (${input.zoneId}): ${discrepancies
          .map((d) => d.code)
          .join(", ")}. Recommended hold ₹${recommendedEscrowHoldInr.toLocaleString("en-IN")} + Clause 42 recovery ₹${recommendedClause42PenaltyInr.toLocaleString("en-IN")}.`;

  return {
    projectId: input.projectId,
    zoneId: input.zoneId,
    challanNo: input.challanNo,
    vendorName: input.vendorName,
    verdict,
    httpStatus,
    trustScorePct,
    derivedMetrics: {
      weighbridgeDerivedM3,
      plcDerivedCementBags,
      effectiveDeliveredM3,
      ghostVolumeM3,
      missingCementBags,
      strengthRatioPct,
    },
    discrepancies,
    recommendedEscrowHoldInr,
    recommendedClause42PenaltyInr,
    totalFinancialExposureInr,
    summary,
  };
}
