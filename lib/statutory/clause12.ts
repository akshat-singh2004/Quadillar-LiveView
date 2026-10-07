"use server";

// ============================================================================
// CPWD & FIDIC Statutory Computation Engine: Clause 12 (Variations & Deviations)
// Works Manual 2024 / GCC / FIDIC Red Book Clause 13
// File: lib/statutory/clause12.ts
// ============================================================================

export type WorkType = "superstructure" | "foundation";

export interface Clause12Input {
  baseRate: number;
  boqQuantity: number;
  executedQuantity: number;
  workType: WorkType;
  materialCost: number;
  labourCost: number;
  tpCost: number;
}

export interface Clause12Result {
  baseRate: number;
  boqQuantity: number;
  executedQuantity: number;
  workType: WorkType;
  deviationLimitPercentage: number;
  quantityVariance: number;
  deviationPercentage: number;
  isDeviationExceeded: boolean;
  thresholdQuantity: number;
  withinLimitQuantity: number;
  excessQuantity: number;
  materialCost: number;
  labourCost: number;
  tpCost: number;
  primeCost: number;
  cpOhMultiplier: number;
  cpOhAmount: number;
  derivedRate: number;
  costAtBaseRate: number;
  costWithClause12: number;
  financialImpact: number;
  status: "WITHIN_DEVIATION_LIMIT" | "DEVIATION_LIMIT_EXCEEDED";
  statutoryWarning: string | null;
  formulaNote: string;
}

/**
 * Calculates the statutory Clause 12 variation rate and checks deviation limits.
 *
 * Statutory Rules Enforced:
 * 1. Deviation Limits:
 *    - Superstructure: +-30%
 *    - Foundation / Substructure: 100%
 * 2. Rate Analysis Formula for Deviated/Extra Items:
 *    - Derived Rate = (Material + Labour + T&P) * 1.15 (15% CP&OH)
 */
export async function calculateClause12Rate(
  input: Clause12Input
): Promise<Clause12Result> {
  const {
    baseRate = 0,
    boqQuantity = 0,
    executedQuantity = 0,
    workType = "superstructure",
    materialCost = 0,
    labourCost = 0,
    tpCost = 0,
  } = input;

  // 1. Statutory Deviation Limit Threshold
  const deviationLimitPercentage = workType === "superstructure" ? 30 : 100;

  // 2. Quantity & Deviation Variance Calculation
  const quantityVariance = executedQuantity - boqQuantity;
  const deviationPercentage =
    boqQuantity > 0 ? (quantityVariance / boqQuantity) * 100 : 0;

  const isDeviationExceeded = deviationPercentage > deviationLimitPercentage;

  // 3. Threshold and Excess Allocation
  const limitFactor = 1 + deviationLimitPercentage / 100;
  const thresholdQuantity = boqQuantity * limitFactor;

  let withinLimitQuantity = executedQuantity;
  let excessQuantity = 0;

  if (isDeviationExceeded) {
    withinLimitQuantity = thresholdQuantity;
    excessQuantity = executedQuantity - thresholdQuantity;
  }

  // 4. Rate Analysis Formula: (Material + Labour + T&P) * 1.15 (15% CP&OH)
  const primeCost = Number((materialCost + labourCost + tpCost).toFixed(2));
  const cpOhMultiplier = 1.15;
  const cpOhAmount = Number((primeCost * 0.15).toFixed(2));
  const derivedRate = Number((primeCost * cpOhMultiplier).toFixed(2));

  // 5. Financial Exposure Calculations
  const costAtBaseRate = Number((executedQuantity * baseRate).toFixed(2));
  const costWithClause12 = isDeviationExceeded
    ? Number(
        (withinLimitQuantity * baseRate + excessQuantity * derivedRate).toFixed(2)
      )
    : costAtBaseRate;

  const financialImpact = Number((costWithClause12 - costAtBaseRate).toFixed(2));

  // 6. Statutory Notification Text
  const statutoryWarning = isDeviationExceeded
    ? `STATUTORY DEVIATION LIMIT BREACHED: ${deviationPercentage.toFixed(
        2
      )}% exceeds the statutory ${deviationLimitPercentage}% threshold for ${workType.toUpperCase()}. Agreement rate is restricted to ${thresholdQuantity.toFixed(
        2
      )} units; new derived rate of ₹${derivedRate.toLocaleString(
        "en-IN",
        { minimumFractionDigits: 2 }
      )} applies strictly to the ${excessQuantity.toFixed(2)} excess units.`
    : null;

  const formulaNote = "Derived Rate = (Material + Labour + T&P) × 1.15 (15% CP&OH Multiplier)";

  return {
    baseRate,
    boqQuantity,
    executedQuantity,
    workType,
    deviationLimitPercentage,
    quantityVariance,
    deviationPercentage: Number(deviationPercentage.toFixed(2)),
    isDeviationExceeded,
    thresholdQuantity: Number(thresholdQuantity.toFixed(2)),
    withinLimitQuantity: Number(withinLimitQuantity.toFixed(2)),
    excessQuantity: Number(excessQuantity.toFixed(2)),
    materialCost,
    labourCost,
    tpCost,
    primeCost,
    cpOhMultiplier,
    cpOhAmount,
    derivedRate,
    costAtBaseRate,
    costWithClause12,
    financialImpact,
    status: isDeviationExceeded
      ? "DEVIATION_LIMIT_EXCEEDED"
      : "WITHIN_DEVIATION_LIMIT",
    statutoryWarning,
    formulaNote,
  };
}
