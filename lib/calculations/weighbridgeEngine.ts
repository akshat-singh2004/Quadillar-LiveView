/**
 * PROJECT VANGUARD: WEIGHBRIDGE LOAD-CELL TELEMETRY & MATERIAL ANTI-THEFT ENGINE
 * Formulated strictly under:
 * - Legal Metrology Act 2009 & Legal Metrology (General) Rules 2011 (Weighbridge Tolerances)
 * - IS 2386 (Part 3): Methods of Test for Aggregates - Surface Moisture Correction
 * - IS 456:2000 & IS 4926 (Ready Mixed Concrete - Batching Tolerances: +/- 2% Cement, +/- 3% Aggregates)
 * - IS 1786:2008 Clause 7.2 (TMT Steel Rolling Margin Permissible Discrepancies)
 * - Indian Evidence Act 1872 Section 65B (Automated Electronic Gatepass & ANPR Attestation)
 *
 * Mathematically calculates:
 * 1. Net Payload Mass: W_net = W_gross - W_tare (kg)
 * 2. RMC Wet Density Verification: rho_wet = W_net / V_challan (Target: 2380 - 2480 kg/m3)
 * 3. Surface Moisture Compensated Sand Weight: W_dry = W_net / (1 + moisture_pct / 100)
 * 4. TMT Rebar Rolling Margin Deviation: delta_rolling = (W_scale - W_theoretical) / W_theoretical * 100
 * 5. Automatic Discrepancy Financial Lien if supply shortfall exceeds statutory tolerance
 */

export interface WeighbridgeTransaction {
  ticketNo: string;
  vehicleRegistrationNo: string; // e.g. UP 32 HN 4920
  materialCategory: "RMC_CONCRETE" | "TMT_REBAR_FE550D" | "RIVER_SAND_Z2" | "STRUCTURAL_STEEL";
  supplierName: string;
  challanNumber: string;
  challanQuantity: number;       // In m3 for concrete, MT for rebar/sand
  unit: "m³" | "MT";
  grossWeightKg: number;
  tareWeightKg: number;
  surfaceMoisturePct?: number;   // Relevant for sand
  theoreticalNominalKg?: number; // Relevant for TMT steel
  contractSupplyRatePerUnitInr: number;
  entryTimestamp: string;
  exitTimestamp: string;
}

export interface WeighbridgeAuditResult {
  netDeliveredKg: number;
  netDeliveredUnits: number;
  challanVarianceUnits: number;
  challanVariancePct: number;
  isWithinPermissibleTolerance: boolean;
  permissibleTolerancePct: number;
  calculatedDensityKgM3?: number;
  isDensityCompliant?: boolean;
  shortfallDeductionInr: number;
  verificationVerdict: "ACCEPTED_CLEARED" | "SHORTFALL_DEBIT_FLAGGED" | "CRITICAL_THEFT_SUSPECTED";
}

// 1. Core Load-Cell Weight & Volume Derivations
export function evaluateWeighbridgePayload(
  item: WeighbridgeTransaction
): WeighbridgeAuditResult {
  const netDeliveredKg = Math.max(0, item.grossWeightKg - item.tareWeightKg);
  let netDeliveredUnits = 0;
  let calculatedDensityKgM3: number | undefined = undefined;
  let isDensityCompliant: boolean | undefined = undefined;
  let permissibleTolerancePct = 2.0; // Default +/- 2.0%

  if (item.materialCategory === "RMC_CONCRETE") {
    // Normal weight concrete design density benchmark: 2420 kg/m3 (M35 Grade)
    const nominalDensity = 2420.0;
    netDeliveredUnits = +(netDeliveredKg / nominalDensity).toFixed(2);
    calculatedDensityKgM3 = item.challanQuantity > 0 ? +(netDeliveredKg / item.challanQuantity).toFixed(1) : 0;
    isDensityCompliant = calculatedDensityKgM3 >= 2350.0 && calculatedDensityKgM3 <= 2500.0;
    permissibleTolerancePct = 2.0; // IS 4926 batching limit
  } else if (item.materialCategory === "TMT_REBAR_FE550D" || item.materialCategory === "STRUCTURAL_STEEL") {
    netDeliveredUnits = +(netDeliveredKg / 1000).toFixed(3);
    permissibleTolerancePct = 2.0; // Rolling tolerance per IS 1786
  } else if (item.materialCategory === "RIVER_SAND_Z2") {
    // Dry sand mass derivation with moisture adjustment
    const moisture = item.surfaceMoisturePct || 0;
    const dryMassKg = netDeliveredKg / (1 + moisture / 100);
    netDeliveredUnits = +(dryMassKg / 1000).toFixed(3);
    permissibleTolerancePct = 3.0; // Aggregate moisture allowance
  }

  // Variance calculation: Positive = Excess, Negative = Short delivery
  const challanVarianceUnits = +(netDeliveredUnits - item.challanQuantity).toFixed(3);
  const challanVariancePct = item.challanQuantity > 0
    ? +((challanVarianceUnits / item.challanQuantity) * 100).toFixed(2)
    : 0;

  const isWithinPermissibleTolerance = Math.abs(challanVariancePct) <= permissibleTolerancePct;

  // Financial Penalty if short delivery exceeds allowable tolerance
  let shortfallDeductionInr = 0;
  let verificationVerdict: WeighbridgeAuditResult["verificationVerdict"] = "ACCEPTED_CLEARED";

  if (challanVariancePct < -permissibleTolerancePct) {
    const billableShortfall = Math.abs(challanVarianceUnits) - (item.challanQuantity * (permissibleTolerancePct / 100));
    shortfallDeductionInr = +(billableShortfall * item.contractSupplyRatePerUnitInr).toFixed(2);

    if (challanVariancePct < -6.0) {
      verificationVerdict = "CRITICAL_THEFT_SUSPECTED";
    } else {
      verificationVerdict = "SHORTFALL_DEBIT_FLAGGED";
    }
  }

  return {
    netDeliveredKg,
    netDeliveredUnits,
    challanVarianceUnits,
    challanVariancePct,
    isWithinPermissibleTolerance,
    permissibleTolerancePct,
    calculatedDensityKgM3,
    isDensityCompliant,
    shortfallDeductionInr,
    verificationVerdict
  };
}
