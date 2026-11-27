import {
  PHYSICAL_BOUNDS,
  clampFinite,
  validateNumericBounds,
} from "@/lib/domain/signalTriage";

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
  | "CEMENT_SHORTAGE_CLAUSE42"
  | "TELEMETRY_QUARANTINE_FAULT"
  | "INSUFFICIENT_FIELD_SIGNAL";

export interface TriangulationInput {
  projectId: string;
  zoneId: string;
  challanNo: string;
  vendorName: string;
  challanVolumeM3: number;
  claimedGradeMpa: number;
  claimedCementBags: number;
  weighbridgeNetKg: number;
  wetConcreteDensityKgM3?: number;
  plcBatchVolumeM3: number;
  plcCementKg: number;
  plcWaterCementRatio: number;
  bimDesignVolumeM3: number;
  inSituEstimatedMpa: number;
  coreTempPeakC?: number;
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
  quarantinedFields?: string[];
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
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function evaluateFiveWayTriangulation(input: TriangulationInput): TriangulationReport {
  const rawDensity = input.wetConcreteDensityKgM3 ?? 2400;
  const rawConcreteRate = input.concreteRatePerM3Inr ?? 7800;
  const rawCementRate = input.cementRatePerBagInr ?? 420;

  // Step 0: Physical-Domain Signal Triage (blocks NaN, Infinity, zero/negative, and extreme overflows)
  const triage = validateNumericBounds([
    { field: "challanVolumeM3", value: input.challanVolumeM3, ...PHYSICAL_BOUNDS.VOLUME_M3, allowZero: false, unit: "m3" },
    { field: "claimedGradeMpa", value: input.claimedGradeMpa, ...PHYSICAL_BOUNDS.GRADE_MPA, allowZero: false, unit: "MPa" },
    { field: "claimedCementBags", value: input.claimedCementBags, ...PHYSICAL_BOUNDS.CEMENT_BAGS, allowZero: false, unit: "bags" },
    { field: "weighbridgeNetKg", value: input.weighbridgeNetKg, ...PHYSICAL_BOUNDS.WEIGHT_KG, allowZero: false, unit: "kg" },
    { field: "wetConcreteDensityKgM3", value: rawDensity, ...PHYSICAL_BOUNDS.CONCRETE_DENSITY_KG_M3, allowZero: false, unit: "kg/m3" },
    { field: "plcBatchVolumeM3", value: input.plcBatchVolumeM3, ...PHYSICAL_BOUNDS.VOLUME_M3, allowZero: false, unit: "m3" },
    { field: "plcCementKg", value: input.plcCementKg, ...PHYSICAL_BOUNDS.CEMENT_KG, allowZero: false, unit: "kg" },
    { field: "plcWaterCementRatio", value: input.plcWaterCementRatio, ...PHYSICAL_BOUNDS.WC_RATIO, allowZero: false },
    { field: "bimDesignVolumeM3", value: input.bimDesignVolumeM3, ...PHYSICAL_BOUNDS.VOLUME_M3, allowZero: false, unit: "m3" },
    { field: "inSituEstimatedMpa", value: input.inSituEstimatedMpa, ...PHYSICAL_BOUNDS.IN_SITU_MPA, allowZero: false, unit: "MPa" },
    { field: "concreteRatePerM3Inr", value: rawConcreteRate, min: 1000, max: 100_000, allowZero: false, unit: "INR" },
    { field: "cementRatePerBagInr", value: rawCementRate, min: 100, max: 5_000, allowZero: false, unit: "INR" },
  ]);

  const density = clampFinite(rawDensity, 2400, 1800, 3000);
  const concreteRate = clampFinite(rawConcreteRate, 7800, 1000, 100_000);
  const cementRate = clampFinite(rawCementRate, 420, 100, 5_000);

  const challanVolumeM3 = clampFinite(input.challanVolumeM3, 0, 0, PHYSICAL_BOUNDS.VOLUME_M3.max);
  const claimedGradeMpa = clampFinite(input.claimedGradeMpa, 0, 0, PHYSICAL_BOUNDS.GRADE_MPA.max);
  const claimedCementBags = clampFinite(input.claimedCementBags, 0, 0, PHYSICAL_BOUNDS.CEMENT_BAGS.max);
  const weighbridgeNetKg = clampFinite(input.weighbridgeNetKg, 0, 0, PHYSICAL_BOUNDS.WEIGHT_KG.max);
  const plcBatchVolumeM3 = clampFinite(input.plcBatchVolumeM3, 0, 0, PHYSICAL_BOUNDS.VOLUME_M3.max);
  const plcCementKg = clampFinite(input.plcCementKg, 0, 0, PHYSICAL_BOUNDS.CEMENT_KG.max);
  const plcWaterCementRatio = clampFinite(input.plcWaterCementRatio, 0, 0, PHYSICAL_BOUNDS.WC_RATIO.max);
  const bimDesignVolumeM3 = clampFinite(input.bimDesignVolumeM3, 0, 0, PHYSICAL_BOUNDS.VOLUME_M3.max);
  const inSituEstimatedMpa = clampFinite(input.inSituEstimatedMpa, 0, 0, PHYSICAL_BOUNDS.IN_SITU_MPA.max);

  const weighbridgeDerivedM3 = round2(weighbridgeNetKg / density);
  const plcDerivedCementBags = round2(plcCementKg / 50);
  const effectiveDeliveredM3 = round2(Math.min(weighbridgeDerivedM3, plcBatchVolumeM3));
  const ghostVolumeM3 = round2(Math.max(0, challanVolumeM3 - effectiveDeliveredM3));
  const missingCementBags = round2(Math.max(0, claimedCementBags - plcDerivedCementBags));
  const strengthRatioPct =
    claimedGradeMpa > 0 ? round2((inSituEstimatedMpa / claimedGradeMpa) * 100) : 0;

  const discrepancies: TriangulationDiscrepancy[] = [];
  let penaltyScore = 0;
  let recommendedEscrowHoldInr = 0;
  let recommendedClause42PenaltyInr = 0;

  if (!triage.valid) {
    const quarantineHoldInr = Math.max(0, Math.round(challanVolumeM3 * concreteRate));
    recommendedEscrowHoldInr += quarantineHoldInr;
    penaltyScore += 65;
    discrepancies.push({
      code: "TELEMETRY_QUARANTINE_FAULT",
      severity: "CRITICAL",
      signalsCompared: ["Raw Ingress Telemetry", "Physical Domain Bounds"],
      expected: "Finite, positive engineering measurements within IS 456 physical limits",
      observed: triage.reasons.slice(0, 3).join("; "),
      variancePct: 100,
      financialRiskInr: quarantineHoldInr,
      standardRef: "Quadillar Signal Triage & Fail-Closed Quarantine Gate",
      explanation: `Contaminated or physically impossible telemetry quarantined (${triage.quarantinedFields.join(", ")}) -> automatic HTTP 422 billing lock.`,
    });
  }

  // Cross-Check 1: Paper Challan vs. Physical Weighbridge Load Cell (>3% variance)
  const challanVsWeighPct =
    challanVolumeM3 > 0
      ? round2(((challanVolumeM3 - weighbridgeDerivedM3) / challanVolumeM3) * 100)
      : 0;

  if (triage.valid && challanVsWeighPct > 3.0) {
    const ghostInr = Math.max(0, Math.round(ghostVolumeM3 * concreteRate));
    recommendedEscrowHoldInr += ghostInr;
    penaltyScore += 28;
    discrepancies.push({
      code: "GHOST_VOLUME_BILLING",
      severity: "CRITICAL",
      signalsCompared: ["Paper Challan", "Gate Weighbridge ANPR"],
      expected: `${challanVolumeM3.toFixed(2)} m³ billed`,
      observed: `${weighbridgeDerivedM3.toFixed(2)} m³ weighed (${weighbridgeNetKg.toLocaleString("en-IN")} kg)`,
      variancePct: challanVsWeighPct,
      financialRiskInr: ghostInr,
      standardRef: "CPWD Measurement Integrity & Gate Interlock",
      explanation: `Challan overbills physical weighbridge mass by ${ghostVolumeM3.toFixed(2)} m³ (${challanVsWeighPct}%).`,
    });
  }

  // Cross-Check 2: Batching Plant PLC vs. Gate Weighbridge (>3% transit diversion)
  const plcVsWeighPct =
    plcBatchVolumeM3 > 0
      ? round2((Math.abs(plcBatchVolumeM3 - weighbridgeDerivedM3) / plcBatchVolumeM3) * 100)
      : 0;

  if (triage.valid && plcVsWeighPct > 3.0) {
    const divertedM3 = round2(Math.abs(plcBatchVolumeM3 - weighbridgeDerivedM3));
    const diversionInr = Math.max(0, Math.round(divertedM3 * concreteRate));
    recommendedEscrowHoldInr += diversionInr;
    penaltyScore += 18;
    discrepancies.push({
      code: "TRANSIT_DIVERSION_MISMATCH",
      severity: "HIGH",
      signalsCompared: ["Batching Plant PLC", "Gate Weighbridge ANPR"],
      expected: `${plcBatchVolumeM3.toFixed(2)} m³ batched`,
      observed: `${weighbridgeDerivedM3.toFixed(2)} m³ arrived at gate`,
      variancePct: plcVsWeighPct,
      financialRiskInr: diversionInr,
      standardRef: "RMC Transit Custody Verification",
      explanation: `Batching PLC dispatch and site weighbridge diverge by ${plcVsWeighPct}% (${divertedM3.toFixed(2)} m³).`,
    });
  }

  // Cross-Check 3: Paper Challan vs. Revit/BIM Theoretical Pour Volume (>5% padding)
  const challanVsBimPct =
    bimDesignVolumeM3 > 0
      ? round2(((challanVolumeM3 - bimDesignVolumeM3) / bimDesignVolumeM3) * 100)
      : 0;

  if (triage.valid && challanVsBimPct > 5.0) {
    const excessBimM3 = round2(challanVolumeM3 - bimDesignVolumeM3);
    const paddingInr = Math.max(0, Math.round(excessBimM3 * concreteRate));
    penaltyScore += 16;
    discrepancies.push({
      code: "BIM_POUR_PADDING",
      severity: "HIGH",
      signalsCompared: ["Paper Challan", "Revit IFC BIM Quantity"],
      expected: `${bimDesignVolumeM3.toFixed(2)} m³ BIM geometry (+5% max wastage)`,
      observed: `${challanVolumeM3.toFixed(2)} m³ billed (+${challanVsBimPct}%)`,
      variancePct: challanVsBimPct,
      financialRiskInr: paddingInr,
      standardRef: "ISO 19650 / BIM Quantity Reconciliation",
      explanation: `Billed pour exceeds 3D BIM structural volume by ${excessBimM3.toFixed(2)} m³ (+${challanVsBimPct}%).`,
    });
  }

  // Cross-Check 4: Claimed Grade vs. In-Situ Curing Maturity Curve (<85% fck)
  const minAcceptedMpa = round2(claimedGradeMpa * 0.85);
  if (triage.valid && inSituEstimatedMpa < minAcceptedMpa) {
    const fullPourFreezeInr = Math.max(0, Math.round(challanVolumeM3 * concreteRate));
    recommendedEscrowHoldInr = Math.max(recommendedEscrowHoldInr, fullPourFreezeInr);
    penaltyScore += 35;
    discrepancies.push({
      code: "GRADE_DILUTION_FRAUD",
      severity: "CRITICAL",
      signalsCompared: ["Claimed Grade (Challan)", "In-Situ Maturity & Thermal Curve"],
      expected: `>= ${minAcceptedMpa.toFixed(1)} MPa (0.85 × M${claimedGradeMpa})`,
      observed: `${inSituEstimatedMpa.toFixed(1)} MPa (${strengthRatioPct}% of target)`,
      variancePct: round2(100 - strengthRatioPct),
      financialRiskInr: fullPourFreezeInr,
      standardRef: "IS 456:2000 Cl. 17.4.3 & ASTM C1074 Maturity",
      explanation: `In-situ curing strength (${inSituEstimatedMpa} MPa) indicates lower concrete grade or transit water dilution; entire pour value locked.`,
    });
  }

  // Cross-Check 5: Batching PLC Water-Cement Ratio
  const maxWc = claimedGradeMpa >= 40 ? 0.45 : 0.5;
  if (triage.valid && plcWaterCementRatio > maxWc) {
    const wcVarPct = round2(((plcWaterCementRatio - maxWc) / maxWc) * 100);
    penaltyScore += 15;
    discrepancies.push({
      code: "WATER_CEMENT_BREACH",
      severity: "HIGH",
      signalsCompared: ["Batching Plant PLC", "IS 456 Table 5 Durability Cap"],
      expected: `w/c <= ${maxWc.toFixed(2)}`,
      observed: `w/c = ${plcWaterCementRatio.toFixed(2)}`,
      variancePct: wcVarPct,
      financialRiskInr: 0,
      standardRef: "IS 456:2000 Table 5",
      explanation: `Excess water-cement ratio (${plcWaterCementRatio}) compromises M${claimedGradeMpa} durability and compressive strength.`,
    });
  }

  // Cross-Check 6: Claimed Cement Bags vs. PLC Cement Weight (CPWD Clause 42 double recovery >2% variation)
  const cementShortPct =
    claimedCementBags > 0
      ? round2((missingCementBags / claimedCementBags) * 100)
      : 0;

  if (triage.valid && cementShortPct > 2.0) {
    recommendedClause42PenaltyInr = Math.max(0, Math.round(missingCementBags * 2 * cementRate));
    penaltyScore += 22;
    discrepancies.push({
      code: "CEMENT_SHORTAGE_CLAUSE42",
      severity: "CRITICAL",
      signalsCompared: ["Challan Cement Claim", "Batching Plant PLC Silo Weight"],
      expected: `${claimedCementBags} bags (${(claimedCementBags * 50).toLocaleString("en-IN")} kg)`,
      observed: `${plcDerivedCementBags} bags (${plcCementKg.toLocaleString("en-IN")} kg)`,
      variancePct: cementShortPct,
      financialRiskInr: recommendedClause42PenaltyInr,
      standardRef: "CPWD GCC Clause 42 (Double-Rate Recovery)",
      explanation: `PLC silo telemetry shows ${missingCementBags} fewer cement bags than claimed -> triggers 2× Clause 42 recovery (₹${recommendedClause42PenaltyInr.toLocaleString("en-IN")}).`,
    });
  }

  recommendedEscrowHoldInr = Math.max(0, Number.isFinite(recommendedEscrowHoldInr) ? recommendedEscrowHoldInr : 0);
  recommendedClause42PenaltyInr = Math.max(
    0,
    Number.isFinite(recommendedClause42PenaltyInr) ? recommendedClause42PenaltyInr : 0
  );

  const trustScorePct = Math.max(0, Math.min(100, 100 - penaltyScore));
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
    ...(triage.quarantinedFields.length > 0 ? { quarantinedFields: triage.quarantinedFields } : {}),
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
