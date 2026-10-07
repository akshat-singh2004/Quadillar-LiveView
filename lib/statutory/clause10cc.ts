"use server";

// ============================================================================
// CPWD Statutory Computation Engine: Clause 10CC (Price Escalation)
// Works Manual 2024 / Schedule F / Polynomial Inflation & Clawback Formulation
// File: lib/statutory/clause10cc.ts
// ============================================================================

export interface BaseIndices {
  MI0: number; // Base Wholesale Price Index for Material
  LI0: number; // Base Consumer Price Index for Industrial Workers (Labour)
  FI0: number; // Base Wholesale Price Index for POL (Fuel & Lubricants)
}

export interface CurrentIndices {
  MI: number; // Current Wholesale Price Index for Material
  LI: number; // Current Consumer Price Index for Industrial Workers (Labour)
  FI: number; // Current Wholesale Price Index for POL (Fuel & Lubricants)
}

export interface ScheduleFPercentages {
  Xm: number; // Material component percentage (Xm %)
  Y: number;  // Labour component percentage (Y %)
  Z: number;  // POL component percentage (Z %)
}

export interface Clause10CCInput {
  grossWorkValue: number;
  baseIndices: BaseIndices;
  currentIndices: CurrentIndices;
  componentPercentages: ScheduleFPercentages;
}

export interface ComponentEscalationResult {
  name: string;
  code: string;
  weightPercentage: number;
  baseIndex: number;
  currentIndex: number;
  indexDelta: number;
  indexDeltaPercentage: number;
  variationAmount: number;
  isClawback: boolean;
}

export interface Clause10CCResult {
  grossWorkValue: number;
  escalatableWorkValueW: number; // W = 0.85 * grossWorkValue (15% CP&OH stripped)
  cpOhDeductionAmount: number;   // 0.15 * grossWorkValue
  material: ComponentEscalationResult;
  labour: ComponentEscalationResult;
  pol: ComponentEscalationResult;
  totalEscalationAmount: number; // V_total = V_m + V_l + V_f
  isNetClawback: boolean;        // true if total < 0
  status: "PAYABLE_TO_CONTRACTOR" | "CLAWBACK_RECOVERABLE_BY_CLIENT" | "NEUTRAL";
  statutoryAuditNote: string;
}

/**
 * Calculates statutory Clause 10CC price escalation / clawbacks.
 *
 * Rules Enforced:
 * 1. Escalatable Value (W) = 0.85 * Gross Certified Work Value (strips 15% CP&OH).
 * 2. V_m = W * (X_m / 100) * ((MI - MI_0) / MI_0)
 * 3. V_l = W * (Y / 100) * ((LI - LI_0) / LI_0)
 * 4. V_f = W * (Z / 100) * ((FI - FI_0) / FI_0)
 * 5. Negative Index Clawbacks are preserved for statutory recovery.
 */
export async function calculateClause10CC(
  input: Clause10CCInput
): Promise<Clause10CCResult> {
  const {
    grossWorkValue = 0,
    baseIndices = { MI0: 100, LI0: 100, FI0: 100 },
    currentIndices = { MI: 100, LI: 100, FI: 100 },
    componentPercentages = { Xm: 60, Y: 25, Z: 5 },
  } = input;

  // 1. Calculate Escalatable Value W (Deducting 15% CP&OH)
  const escalatableWorkValueW = Number((grossWorkValue * 0.85).toFixed(2));
  const cpOhDeductionAmount = Number((grossWorkValue * 0.15).toFixed(2));

  // 2. Material Component (V_m)
  const miDelta = currentIndices.MI - baseIndices.MI0;
  const miRatio = baseIndices.MI0 > 0 ? miDelta / baseIndices.MI0 : 0;
  const vmAmount = Number(
    (escalatableWorkValueW * (componentPercentages.Xm / 100) * miRatio).toFixed(2)
  );

  const materialResult: ComponentEscalationResult = {
    name: "Material Component",
    code: "Vm",
    weightPercentage: componentPercentages.Xm,
    baseIndex: baseIndices.MI0,
    currentIndex: currentIndices.MI,
    indexDelta: Number(miDelta.toFixed(2)),
    indexDeltaPercentage: Number((miRatio * 100).toFixed(2)),
    variationAmount: vmAmount,
    isClawback: vmAmount < 0,
  };

  // 3. Labour Component (V_l)
  const liDelta = currentIndices.LI - baseIndices.LI0;
  const liRatio = baseIndices.LI0 > 0 ? liDelta / baseIndices.LI0 : 0;
  const vlAmount = Number(
    (escalatableWorkValueW * (componentPercentages.Y / 100) * liRatio).toFixed(2)
  );

  const labourResult: ComponentEscalationResult = {
    name: "Labour Component",
    code: "Vl",
    weightPercentage: componentPercentages.Y,
    baseIndex: baseIndices.LI0,
    currentIndex: currentIndices.LI,
    indexDelta: Number(liDelta.toFixed(2)),
    indexDeltaPercentage: Number((liRatio * 100).toFixed(2)),
    variationAmount: vlAmount,
    isClawback: vlAmount < 0,
  };

  // 4. POL (Fuel & Lubricant) Component (V_f)
  const fiDelta = currentIndices.FI - baseIndices.FI0;
  const fiRatio = baseIndices.FI0 > 0 ? fiDelta / baseIndices.FI0 : 0;
  const vfAmount = Number(
    (escalatableWorkValueW * (componentPercentages.Z / 100) * fiRatio).toFixed(2)
  );

  const polResult: ComponentEscalationResult = {
    name: "POL (Fuel & Lubricants)",
    code: "Vf",
    weightPercentage: componentPercentages.Z,
    baseIndex: baseIndices.FI0,
    currentIndex: currentIndices.FI,
    indexDelta: Number(fiDelta.toFixed(2)),
    indexDeltaPercentage: Number((fiRatio * 100).toFixed(2)),
    variationAmount: vfAmount,
    isClawback: vfAmount < 0,
  };

  // 5. Total Net Statutory Adjustment (Preserving Negative Clawbacks)
  const totalEscalationAmount = Number(
    (vmAmount + vlAmount + vfAmount).toFixed(2)
  );
  const isNetClawback = totalEscalationAmount < 0;

  const status =
    totalEscalationAmount > 0
      ? "PAYABLE_TO_CONTRACTOR"
      : totalEscalationAmount < 0
      ? "CLAWBACK_RECOVERABLE_BY_CLIENT"
      : "NEUTRAL";

  const statutoryAuditNote = isNetClawback
    ? `STATUTORY NEGATIVE CLAWBACK: Deflation in composite indices results in -₹${Math.abs(
        totalEscalationAmount
      ).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
      })} recoverable from contractor under CPWD Clause 10CC.`
    : `STATUTORY ESCALATION APPROVED: Net inflation of ₹${totalEscalationAmount.toLocaleString(
        "en-IN",
        { minimumFractionDigits: 2 }
      )} certified under CPWD Works Manual 2024 Schedule F.`;

  return {
    grossWorkValue,
    escalatableWorkValueW,
    cpOhDeductionAmount,
    material: materialResult,
    labour: labourResult,
    pol: polResult,
    totalEscalationAmount,
    isNetClawback,
    status,
    statutoryAuditNote,
  };
}
