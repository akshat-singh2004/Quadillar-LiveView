/**
 * PROJECT VANGUARD: SCAN-VS-BIM AS-BUILT DEVIATION & SURFACE TOLERANCE ENGINE
 * Formulated strictly under:
 * - IS 456:2000 Clause 20 & Table 20 (Permissible Tolerances for Concrete Construction)
 * - ASTM E1155-14 (Standard Test Method for Determining FF Floor Flatness and FL Floor Levelness)
 * - ACI 117-10 (Specification for Tolerances for Concrete Construction and Materials)
 * - ISO 4463-1 (Measurement Methods for Building - Setting-out and Measurement)
 * - Indian Evidence Act 1872 Section 65B (Cryptographic As-Built Notarization)
 *
 * Mathematically evaluates:
 * 1. 3D Euclidean Spatial Deviation Delta between LiDAR Scan and BIM Model Coordinates:
 *      Delta = sqrt( (x_scan - x_bim)^2 + (y_scan - y_bim)^2 + (z_scan - z_bim)^2 )
 * 2. Column Verticality / Plumbness Ratio per IS 456 Cl. 20.1(b):
 *      Delta_plumb <= min( H / 300, 20 mm )
 * 3. ASTM E1155 Floor Flatness (FF) & Floor Levelness (FL) Statistical Formulations:
 *      FF = 115.7 / (3 * S_q + |q_mean|)
 *      FL = 111.4 / (3 * S_z + |z_mean|)
 * 4. Heatmap Color Binning & Quality Non-Conformance Alerting
 */

export interface PointCloudSamplePoint {
  id: string;
  structuralElementTag: string; // e.g. COL-C2, SLAB-PODIUM-L1, BEAM-G2
  elementType: "COLUMN" | "SLAB" | "BEAM" | "WALL";
  designCoordMm: [number, number, number]; // [X, Y, Z] Design nominal
  scannedCoordMm: [number, number, number]; // [X, Y, Z] LiDAR Total Station actual
  deviationDeltaMm: number;                // Euclidean distance
  vectorDxMm: number;
  vectorDyMm: number;                      // Elevation delta (camber/sag)
  vectorDzMm: number;
  toleranceLimitMm: number;
  status: "IN_TOLERANCE" | "WARNING_NEAR_LIMIT" | "OUT_OF_TOLERANCE_NCR";
}

export interface ColumnVerticalityPlumbness {
  columnTag: string;
  columnHeightM: number;
  baseDeviationMm: number;
  topDeviationMm: number;
  lateralDriftDeltaMm: number;
  permissibleDriftLimitMm: number; // H / 300 or 20mm
  plumbnessRatio: string;          // e.g. "1:450"
  isPlumbCompliant: boolean;
}

export interface FloorFlatnessLevelnessResult {
  slabElementTag: string;
  measuredElevationProfileMm: number[]; // 300mm reading increments
  floorFlatnessFF: number;             // ASTM E1155 FF
  floorLevelnessFL: number;            // ASTM E1155 FL
  specifiedMinFF: number;              // Commercial spec (e.g. FF 35)
  specifiedMinFL: number;              // Commercial spec (e.g. FL 25)
  isFlatnessCompliant: boolean;
  isLevelnessCompliant: boolean;
  meanCurvatureQ: number;
  stdDeviationCurvatureSq: number;
}

// 1. Compute 3D Spatial Vector & Euclidean Deviation Delta
export function calculatePointDeviation(
  design: [number, number, number],
  scanned: [number, number, number],
  elementType: PointCloudSamplePoint["elementType"],
  elementSpanOrHeightM = 15.0
): {
  dxMm: number;
  dyMm: number;
  dzMm: number;
  deltaMm: number;
  toleranceLimitMm: number;
  status: PointCloudSamplePoint["status"];
} {
  const dxMm = +(scanned[0] - design[0]).toFixed(2);
  const dyMm = +(scanned[1] - design[1]).toFixed(2);
  const dzMm = +(scanned[2] - design[2]).toFixed(2);
  const deltaMm = +Math.sqrt(dxMm * dxMm + dyMm * dyMm + dzMm * dzMm).toFixed(2);

  // IS 456 Table 20 Permissible Tolerances:
  // - Columns: Cross-section: +12mm / -6mm; Plumbness: H/300 <= 20mm
  // - Slabs: Thickness: +6mm / -3mm; Surface level: +/- 6mm
  // - Beams: Camber/Level: +/- 6mm
  let toleranceLimitMm = 6.0;
  if (elementType === "COLUMN") {
    toleranceLimitMm = Math.min(20.0, (elementSpanOrHeightM * 1000) / 300);
  } else if (elementType === "WALL") {
    toleranceLimitMm = 10.0;
  } else if (elementType === "SLAB") {
    toleranceLimitMm = 6.0;
  }

  let status: PointCloudSamplePoint["status"] = "IN_TOLERANCE";
  if (deltaMm > toleranceLimitMm) {
    status = "OUT_OF_TOLERANCE_NCR";
  } else if (deltaMm > toleranceLimitMm * 0.75) {
    status = "WARNING_NEAR_LIMIT";
  }

  return { dxMm, dyMm, dzMm, deltaMm, toleranceLimitMm: +toleranceLimitMm.toFixed(1), status };
}

// 2. IS 456:2000 Cl. 20.1(b) Column Plumbness Evaluation:
// Max lateral drift = H / 300, subject to max 20 mm
export function evaluateColumnPlumbness(
  columnTag: string,
  heightM: number,
  baseShiftMm: number,
  topShiftMm: number
): ColumnVerticalityPlumbness {
  const lateralDriftMm = +Math.abs(topShiftMm - baseShiftMm).toFixed(2);
  const permissibleLimitMm = +Math.min(20.0, (heightM * 1000) / 300).toFixed(2);

  const isCompliant = lateralDriftMm <= permissibleLimitMm;
  const ratioDenominator = lateralDriftMm > 0 ? Math.round((heightM * 1000) / lateralDriftMm) : 9999;

  return {
    columnTag,
    columnHeightM: heightM,
    baseDeviationMm: baseShiftMm,
    topDeviationMm: topShiftMm,
    lateralDriftDeltaMm: lateralDriftMm,
    permissibleDriftLimitMm: permissibleLimitMm,
    plumbnessRatio: `1:${ratioDenominator}`,
    isPlumbCompliant: isCompliant
  };
}

// 3. ASTM E1155 Floor Flatness (FF) & Floor Levelness (FL) Formulation:
// Samples elevations at 300mm intervals:
// q_i = z_i - 2*z_{i+1} + z_{i+2} (Curvature in mm)
// FF = 115.7 / (3 * S_q + |q_mean|)
// FL = 111.4 / (3 * S_z + |z_mean|)
export function calculateAstmE1155FloorNumbers(
  slabTag: string,
  elevationsMm: number[],
  specFF = 35,
  specFL = 25
): FloorFlatnessLevelnessResult {
  const n = elevationsMm.length;
  if (n < 3) {
    return {
      slabElementTag: slabTag,
      measuredElevationProfileMm: elevationsMm,
      floorFlatnessFF: 0,
      floorLevelnessFL: 0,
      specifiedMinFF: specFF,
      specifiedMinFL: specFL,
      isFlatnessCompliant: false,
      isLevelnessCompliant: false,
      meanCurvatureQ: 0,
      stdDeviationCurvatureSq: 0
    };
  }

  // Curvature differences q_i
  const qValues: number[] = [];
  for (let i = 0; i < n - 2; i++) {
    const q = elevationsMm[i] - 2 * elevationsMm[i + 1] + elevationsMm[i + 2];
    qValues.push(q);
  }

  const qMean = qValues.reduce((a, b) => a + b, 0) / qValues.length;
  const qVariance = qValues.reduce((acc, q) => acc + Math.pow(q - qMean, 2), 0) / (qValues.length - 1 || 1);
  const sq = Math.sqrt(qVariance);

  // ASTM E1155 Formula for FF
  const ffDenominator = 3 * sq + Math.abs(qMean);
  const floorFlatnessFF = ffDenominator > 0 ? +(115.7 / ffDenominator).toFixed(1) : 99.9;

  // Levelness z deviations (relative to 3m pitch slope d_i)
  const zDeltas: number[] = [];
  for (let i = 0; i < n - 10; i++) {
    zDeltas.push(elevationsMm[i + 10] - elevationsMm[i]); // 10 intervals * 300mm = 3.0m pitch
  }
  const zMean = zDeltas.length > 0 ? zDeltas.reduce((a, b) => a + b, 0) / zDeltas.length : 0;
  const zVariance = zDeltas.length > 1
    ? zDeltas.reduce((acc, z) => acc + Math.pow(z - zMean, 2), 0) / (zDeltas.length - 1)
    : 0.1;
  const sz = Math.sqrt(zVariance);

  const flDenominator = 3 * sz + Math.abs(zMean);
  const floorLevelnessFL = flDenominator > 0 ? +(111.4 / flDenominator).toFixed(1) : 99.9;

  return {
    slabElementTag: slabTag,
    measuredElevationProfileMm: elevationsMm,
    floorFlatnessFF,
    floorLevelnessFL,
    specifiedMinFF: specFF,
    specifiedMinFL: specFL,
    isFlatnessCompliant: floorFlatnessFF >= specFF,
    isLevelnessCompliant: floorLevelnessFL >= specFL,
    meanCurvatureQ: +qMean.toFixed(3),
    stdDeviationCurvatureSq: +sq.toFixed(3)
  };
}
