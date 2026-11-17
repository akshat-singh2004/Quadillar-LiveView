/**
 * PROJECT VANGUARD: CLAUSE 42 STATUTORY MATERIAL RECONCILIATION ENGINE
 * Formulated strictly under:
 * - CPWD General Conditions of Contract (GCC) Clause 42 (Reconciliation of Cement & Steel)
 * - IS 10262:2019 (Concrete Mix Proportioning Guidelines)
 * - IS 456:2000 (Plain and Reinforced Concrete - Code of Practice)
 * - IS 1786:2008 (High Strength Deformed Steel Bars - Rolling Tolerances)
 *
 * Derives theoretical material constants based on actual BIM physical volumes,
 * analyzes weighbridge inward gate receipts vs. site consumption, computes permissible
 * rolling margins and wastage thresholds, and calculates double-rate penal recovery debits.
 */

export interface MaterialReconciliationItem {
  materialCode: string;
  materialName: string;
  category: "CEMENT_OPC_53" | "REBAR_FE_550D" | "STRUCTURAL_STEEL_SECTIONS" | "COARSE_SAND_Z2";
  unitOfMeasurement: "BAGS" | "MT";
  bimVolumeExecutedM3: number;    // Net concrete volume from 3D BIM model
  theoreticalConstantPerM3: number;// Standard consumption coefficient (e.g., 8.20 bags/m3 for M35)
  theoreticalConsumptionQty: number; // Q_theo = Volume * Constant
  actualIssuedAndConsumedQty: number;// Q_act = Opening + Received - Balance
  contractPermissibleVariationPct: number; // Permissible +/- limit (e.g. 2.0% for steel, 2.0% for cement)
  standardContractRateInr: number; // Base BOQ schedule supply rate
  penalRecoveryRateFactor: number; // Standard 2.0x penal recovery multiplier
}

export interface Clause42ReconResult {
  materialCode: string;
  materialName: string;
  unit: string;
  theoreticalQty: number;
  actualConsumedQty: number;
  permissibleLimitQty: number;     // Allowable band threshold
  permissibleMaxQty: number;       // Upper permissible bound: Q_theo * (1 + delta)
  permissibleMinQty: number;       // Lower structural limit: Q_theo * (1 - delta)
  varianceQty: number;             // Actual - Theoretical
  variancePct: number;
  status: "COMPLIANT_WITHIN_TOLERANCE" | "OVER_CONSUMPTION_PENAL" | "UNDER_CONSUMPTION_DEFICIENT";
  penalQuantityChargeable: number; // Excess above allowable tolerance
  penalRecoveryAmountInr: number;  // Financial penalty debit (PenalQty * 2 * Rate)
  structuralIntegrityRisk: boolean;// True if under-consumed (insufficient cement/rebar placed)
}

// 1. IS 10262:2019 Theoretical Concrete Mix Constants
export function getConcreteMixConstants(fckMpa: number): {
  cementBagsPerM3: number;
  waterCementRatio: number;
  fineAggregateKgPerM3: number;
  coarseAggregateKgPerM3: number;
} {
  switch (fckMpa) {
    case 25:
      return { cementBagsPerM3: 6.80, waterCementRatio: 0.48, fineAggregateKgPerM3: 745, coarseAggregateKgPerM3: 1180 };
    case 30:
      return { cementBagsPerM3: 7.60, waterCementRatio: 0.44, fineAggregateKgPerM3: 710, coarseAggregateKgPerM3: 1210 };
    case 35:
    default:
      // M35 Grade standard pumpable mix design (410 kg/m3 cement = 8.20 bags @ 50kg)
      return { cementBagsPerM3: 8.20, waterCementRatio: 0.40, fineAggregateKgPerM3: 685, coarseAggregateKgPerM3: 1240 };
    case 40:
      return { cementBagsPerM3: 8.80, waterCementRatio: 0.36, fineAggregateKgPerM3: 660, coarseAggregateKgPerM3: 1265 };
  }
}

// 2. IS 1786 Rolling Margin Tolerances for TMT Rebar:
// - 8mm to 10mm: +/- 7.0%
// - 12mm to 16mm: +/- 5.0%
// - 20mm and above: +/- 3.0%
export function calculateRollingMarginFactor(nominalDiaMm: number): number {
  if (nominalDiaMm <= 10) return 0.07;
  if (nominalDiaMm <= 16) return 0.05;
  return 0.03;
}

// 3. Mathematical Clause 42 Reconciliation Evaluator
export function evaluateClause42Reconciliation(item: MaterialReconciliationItem): Clause42ReconResult {
  const theoreticalQty = +(item.bimVolumeExecutedM3 * item.theoreticalConstantPerM3).toFixed(2);
  const actualConsumedQty = +item.actualIssuedAndConsumedQty.toFixed(2);
  const varianceQty = +(actualConsumedQty - theoreticalQty).toFixed(2);
  const variancePct = theoreticalQty > 0 ? +((varianceQty / theoreticalQty) * 100).toFixed(2) : 0;

  const allowableVariationFactor = item.contractPermissibleVariationPct / 100;
  const permissibleLimitQty = +(theoreticalQty * allowableVariationFactor).toFixed(2);
  const permissibleMaxQty = +(theoreticalQty + permissibleLimitQty).toFixed(2);
  const permissibleMinQty = +(theoreticalQty - permissibleLimitQty).toFixed(2);

  let status: Clause42ReconResult["status"] = "COMPLIANT_WITHIN_TOLERANCE";
  let penalQuantityChargeable = 0;
  let penalRecoveryAmountInr = 0;
  let structuralIntegrityRisk = false;

  if (actualConsumedQty > permissibleMaxQty) {
    // Over-consumption: Waste exceeds allowable limits. Contractor charged double standard rate.
    status = "OVER_CONSUMPTION_PENAL";
    penalQuantityChargeable = +(actualConsumedQty - permissibleMaxQty).toFixed(2);
    penalRecoveryAmountInr = +(penalQuantityChargeable * item.standardContractRateInr * item.penalRecoveryRateFactor).toFixed(2);
  } else if (actualConsumedQty < permissibleMinQty) {
    // Under-consumption: Less material placed than structural design. Critical quality/safety non-conformance.
    status = "UNDER_CONSUMPTION_DEFICIENT";
    structuralIntegrityRisk = true;
    penalQuantityChargeable = +(permissibleMinQty - actualConsumedQty).toFixed(2);
    // Compounded penal debit plus mandatory NDT structural audit lien
    penalRecoveryAmountInr = +(penalQuantityChargeable * item.standardContractRateInr * 1.5).toFixed(2);
  }

  return {
    materialCode: item.materialCode,
    materialName: item.materialName,
    unit: item.unitOfMeasurement,
    theoreticalQty,
    actualConsumedQty,
    permissibleLimitQty,
    permissibleMaxQty,
    permissibleMinQty,
    varianceQty,
    variancePct,
    status,
    penalQuantityChargeable,
    penalRecoveryAmountInr,
    structuralIntegrityRisk
  };
}
