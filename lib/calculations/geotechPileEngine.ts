/**
 * PROJECT VANGUARD: GEOTECHNICAL PILE CAPACITY & LOAD TEST ENGINE
 * Formulated strictly under:
 * - IS 2911 (Part 1/Sec 2):2010 (Bored Cast-in-Situ Concrete Piles)
 * - IS 2911 (Part 4):2010 (Load Test on Piles: Axial Compression, Lateral, Pull-out)
 * - Davisson's Method (1972) for Ultimate Failure Load
 * - Chin-Kondner Hyperbolic Extrapolation (1970) for Asymptotic Capacity
 * - Converse-Labarre Formula for Group Pile Efficiency
 */

export interface PileGeometry {
  diameterMm: number;        // Nominal pile diameter (e.g. 500mm, 600mm)
  embeddedLengthM: number;   // Pile embedded shaft length L (e.g. 18.0m into Lucknow alluvium)
  concreteGradeMpa: number;  // Concrete f_ck (e.g. M35)
  modulusOfElasticityGpa: number; // E_c = 5000 * sqrt(fck) in MPa (converted to GPa)
}

export interface SoilStratumLayer {
  layerName: string;
  depthFromM: number;
  depthToM: number;
  soilType: "SAND" | "CLAY_SILT" | "DENSE_SAND";
  cohesionCuKpa: number;     // Undrained shear strength / cohesion
  adhesionFactorAlpha: number; // Adhesion factor alpha per IS 2911
  effectiveFrictionAngleDeg: number; // phi angle
  sptNValue: number;         // Standard Penetration Resistance N-value
}

export interface LoadTestObservation {
  loadKn: number;
  settlementMm: number;
  timeMins: number;
  gaugeReadingsMm: [number, number, number, number]; // 4 orthogonal dial gauges
}

// 1. Structural Modulus of Concrete per IS 456: E_c = 5000 * sqrt(f_ck) in MPa
export function calculateConcreteEc(fckMpa: number): number {
  return +(5000 * Math.sqrt(fckMpa)).toFixed(1); // MPa
}

// 2. IS 2911 (Part 1/Sec 2) Ultimate Static Pile Capacity
// Q_u = Q_b + Q_s = A_b * q_b + Sum [ alpha * C_u * A_s ]
export function calculateStaticPileCapacity(
  pile: PileGeometry,
  strata: SoilStratumLayer[],
  factorOfSafety = 2.5
): {
  baseAreaM2: number;
  perimeterM: number;
  endBearingCapacityKn: number;
  skinFrictionCapacityKn: number;
  ultimateCapacityKn: number;
  safeWorkingLoadKn: number;
} {
  const dM = pile.diameterMm / 1000;
  const baseAreaM2 = +(Math.PI * Math.pow(dM / 2, 2)).toFixed(4);
  const perimeterM = +(Math.PI * dM).toFixed(4);

  // End bearing in hard alluvial silt/sand (N_c = 9 for deep clay/silt; q_b = 9*Cu or N_q*sigma_v)
  const tipStratum = strata[strata.length - 1];
  let unitEndBearingKpa = 9 * tipStratum.cohesionCuKpa;
  if (tipStratum.soilType === "DENSE_SAND") {
    unitEndBearingKpa = Math.min(10000, 40 * tipStratum.sptNValue * (pile.embeddedLengthM / dM));
  }
  const endBearingCapacityKn = +(baseAreaM2 * unitEndBearingKpa).toFixed(1);

  // Skin friction across strata: Q_s = Sum [ alpha * Cu * As ]
  let skinFrictionCapacityKn = 0;
  strata.forEach(layer => {
    const layerThicknessM = Math.max(0, Math.min(pile.embeddedLengthM, layer.depthToM) - layer.depthFromM);
    if (layerThicknessM > 0) {
      const shaftAreaM2 = perimeterM * layerThicknessM;
      let unitSkinFrictionKpa = layer.adhesionFactorAlpha * layer.cohesionCuKpa;
      if (layer.soilType === "SAND" || layer.soilType === "DENSE_SAND") {
        unitSkinFrictionKpa = Math.min(100, 2 * layer.sptNValue); // SPT correlation
      }
      skinFrictionCapacityKn += shaftAreaM2 * unitSkinFrictionKpa;
    }
  });
  skinFrictionCapacityKn = +skinFrictionCapacityKn.toFixed(1);

  const ultimateCapacityKn = +(endBearingCapacityKn + skinFrictionCapacityKn).toFixed(1);
  const safeWorkingLoadKn = +(ultimateCapacityKn / factorOfSafety).toFixed(1);

  return {
    baseAreaM2,
    perimeterM,
    endBearingCapacityKn,
    skinFrictionCapacityKn,
    ultimateCapacityKn,
    safeWorkingLoadKn
  };
}

// 3. Davisson's Method for Ultimate Failure Load Offset Line:
// Delta_davisson = Delta_elastic + (3.81 mm + D / 120)
// where Delta_elastic = (P * L) / (A * E_c)
export function calculateDavissonElasticOffset(
  loadKn: number,
  pile: PileGeometry
): {
  elasticDeformationMm: number;
  davissonOffsetLineMm: number;
} {
  const dM = pile.diameterMm / 1000;
  const areaM2 = Math.PI * Math.pow(dM / 2, 2);
  const ecMpa = calculateConcreteEc(pile.concreteGradeMpa);
  const ecKpa = ecMpa * 1000;

  // Elastic compression of free shaft (using effective transfer length = 0.75 * L)
  const effectiveLengthM = 0.75 * pile.embeddedLengthM;
  const elasticDeformationMm = +((loadKn * effectiveLengthM) / (areaM2 * ecKpa) * 1000).toFixed(2);

  // Davisson constant: 3.81mm (0.15 in) + D / 120
  const davissonConstantMm = 3.81 + (pile.diameterMm / 120);
  const davissonOffsetLineMm = +(elasticDeformationMm + davissonConstantMm).toFixed(2);

  return {
    elasticDeformationMm,
    davissonOffsetLineMm
  };
}

// 4. IS 2911 (Part 4):2010 Acceptance Verification Criteria:
// Cl. 7.1.1: Safe axial load is minimum of:
// - 2/3 of final load producing total settlement of 12 mm
// - 50% of final load producing total settlement of 10% of pile diameter
// - Load producing net plastic settlement of 6 mm after release
export function evaluateIS2911Compliance(
  loadTestObservations: LoadTestObservation[],
  pile: PileGeometry,
  specifiedWorkingLoadKn: number
): {
  maxAppliedLoadKn: number;
  maxSettlementMm: number;
  settlementAtWorkingLoadMm: number;
  settlementAt150PctWorkingLoadMm: number;
  isWorkingLoadSettlementPassed: boolean; // Must be <= 12 mm per IS 2911
  isOverloadSettlementPassed: boolean;    // Must be <= 18 mm (or 2% of D)
  safeLoadBasedOn12mmLimitKn: number;
  isOverallAccepted: boolean;
} {
  const sorted = [...loadTestObservations].sort((a, b) => a.loadKn - b.loadKn);
  const maxApplied = sorted[sorted.length - 1];

  // Interpolate settlement at 1.0 * WorkingLoad and 1.5 * WorkingLoad
  const findSettlementAt = (targetLoad: number) => {
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].loadKn <= targetLoad && sorted[i + 1].loadKn >= targetLoad) {
        const ratio = (targetLoad - sorted[i].loadKn) / (sorted[i + 1].loadKn - sorted[i].loadKn);
        return +(sorted[i].settlementMm + ratio * (sorted[i + 1].settlementMm - sorted[i].settlementMm)).toFixed(2);
      }
    }
    return sorted[sorted.length - 1].settlementMm;
  };

  const settlementAtWorkingLoadMm = findSettlementAt(specifiedWorkingLoadKn);
  const settlementAt150PctWorkingLoadMm = findSettlementAt(specifiedWorkingLoadKn * 1.5);

  // Find load at 12mm settlement for IS 2911 safe load derivation
  let loadAt12mmKn = maxApplied.loadKn;
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i].settlementMm <= 12.0 && sorted[i + 1].settlementMm >= 12.0) {
      const ratio = (12.0 - sorted[i].settlementMm) / (sorted[i + 1].settlementMm - sorted[i].settlementMm);
      loadAt12mmKn = +(sorted[i].loadKn + ratio * (sorted[i + 1].loadKn - sorted[i].loadKn)).toFixed(1);
      break;
    }
  }
  const safeLoadBasedOn12mmLimitKn = +((2 / 3) * loadAt12mmKn).toFixed(1);

  const isWorkingLoadSettlementPassed = settlementAtWorkingLoadMm <= 12.0;
  // At 1.5x test load, settlement should not exceed 18mm or (0.02 * D) = 10mm for 500mm pile
  const permissible150Settlement = Math.min(18.0, 0.02 * pile.diameterMm);
  const isOverloadSettlementPassed = settlementAt150PctWorkingLoadMm <= permissible150Settlement;

  return {
    maxAppliedLoadKn: maxApplied.loadKn,
    maxSettlementMm: maxApplied.settlementMm,
    settlementAtWorkingLoadMm,
    settlementAt150PctWorkingLoadMm,
    isWorkingLoadSettlementPassed,
    isOverloadSettlementPassed,
    safeLoadBasedOn12mmLimitKn,
    isOverallAccepted: isWorkingLoadSettlementPassed && isOverloadSettlementPassed
  };
}

// 5. Converse-Labarre Pile Group Efficiency Formula:
// eta = 1 - [ arctan(D/s) / 90 ] * [ ((n - 1)*m + (m - 1)*n) / (m * n) ]
export function calculateGroupEfficiency(
  rowsM: number,
  colsN: number,
  diameterMm: number,
  spacingMm: number
): number {
  if (rowsM <= 1 && colsN <= 1) return 1.0;
  const thetaRad = Math.atan(diameterMm / spacingMm);
  const thetaDeg = (thetaRad * 180) / Math.PI;

  const numerator = (colsN - 1) * rowsM + (rowsM - 1) * colsN;
  const denominator = 90 * (rowsM * colsN);
  const efficiency = 1 - (thetaDeg * (numerator / denominator));

  return +efficiency.toFixed(3);
}
