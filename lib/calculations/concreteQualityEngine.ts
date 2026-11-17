/**
 * PROJECT VANGUARD: CONCRETE CTM CUBE TESTING & IS 456 STATISTICAL ACCEPTANCE ENGINE
 * Formulated strictly under:
 * - IS 456:2000 Clause 15 (Sampling and Strength of Designed Concrete Mix)
 * - IS 456:2000 Clause 16 & Table 11 (Characteristic Compressive Strength Acceptance Criteria)
 * - IS 516:2021 / 1959 (Hardened Concrete - Methods of Determination of Strength)
 * - IS 1199 (Fresh Concrete - Sampling, Slump, and Temperature Testing)
 * - Indian Evidence Act Section 65B (Calibrated Digital CTM Testing Attestation)
 *
 * Project Vanguard Concrete Baseline:
 * - Design Grade: M35 (Characteristic 28-day target f_ck = 35.0 N/mm2)
 * - Standard Test Specimen: 150mm x 150mm x 150mm Cast Iron Moulds (Area = 22,500 mm2)
 * - 7-Day Target Benchmark: >= 0.67 * f_ck = 23.45 N/mm2
 * - 28-Day Target Benchmark: >= 1.00 * f_ck = 35.00 N/mm2
 *
 * Statutory Acceptance Rules (IS 456:2000 Cl. 16.1):
 * 1. Mean of 4 non-overlapping consecutive test results:
 *      f_mean >= f_ck + 0.825 * sigma   OR   f_ck + 3.0 N/mm2 (whichever is greater)
 *      (For M35, standard deviation sigma = 5.0 N/mm2 per Table 8 -> Threshold = 39.13 N/mm2)
 * 2. Individual test result:
 *      f_individual >= f_ck - 3.0 N/mm2 = 32.00 N/mm2
 * 3. Individual cube variation within a sample:
 *      Range <= +/- 15% of the average of 3 cubes (IS 456 Cl. 15.4)
 */

export interface CubeCrushReading {
  cubeId: string;
  crushLoadKn: number;         // Machine failure load in kN
  compressiveStrengthMpa: number; // P / A (A = 22,500 mm2)
  failurePattern: "NORMAL_CONE_PYRAMID" | "SHEAR_FAILURE" | "FAULTY_EDGE_SPALL";
  isRangeCompliantWithin15Pct: boolean;
}

export interface DigitalPourCardRecord {
  pourCardNo: string;
  wbsActivityId: string;
  structuralLocation: string;
  concreteGradeMpa: number;
  mixDesignRef: string;
  batchingPlantSupplier: string;
  pourVolumeM3: number;
  slumpMm: number;              // Target: 120 +/- 25 mm
  freshConcreteTempC: number;   // Max 32 deg C per IS 456
  castingDate: string;
  testDate7d: string;
  testDate28d: string;
  prePourChecklist: {
    formworkAlignmentAndPlumb: boolean;
    rebarBbsTyingAndCoverBlocks: boolean;
    mepConduitsAndSleevesFixed: boolean;
    surfaceCleaningAndDewatering: boolean;
    tripartiteSignatureObtained: boolean;
  };
  sampleCubes7d: CubeCrushReading[];
  sampleCubes28d: CubeCrushReading[];
  meanStrength7dMpa: number;
  meanStrength28dMpa: number;
  is7dStrengthPassed: boolean;
  is28dStrengthPassed: boolean;
  section65bHash: string;
}

export interface StatisticalAcceptanceBatchResult {
  batchNumber: number;
  sampleIds: string[];
  sampleMeanStrengths28dMpa: [number, number, number, number]; // 4 consecutive test results
  fourSampleMeanMpa: number;
  assumedStandardDeviationSigma: number;
  statutoryMeanThresholdMpa: number;    // f_ck + 0.825 * sigma
  statutoryIndividualThresholdMpa: number; // f_ck - 3.0
  isFourSampleMeanCompliant: boolean;
  isAllIndividualSamplesCompliant: boolean;
  isBatchAcceptedUnderIS456: boolean;
  statutoryVerdict: string;
}

// 1. Calculate Compressive Strength: f_c = (P * 1000) / 22500 (N/mm2)
export function calculateCubeStrength(crushLoadKn: number): number {
  const areaMm2 = 150 * 150; // 22,500 mm2
  return +((crushLoadKn * 1000) / areaMm2).toFixed(2);
}

// 2. Validate IS 456 Cl. 15.4 Range Rule (+/- 15% of average):
export function validateCubeSampleRange(strengths: number[]): {
  meanMpa: number;
  isWithin15Percent: boolean;
  outlierIndices: number[];
} {
  if (strengths.length === 0) return { meanMpa: 0, isWithin15Percent: true, outlierIndices: [] };
  const mean = strengths.reduce((a, b) => a + b, 0) / strengths.length;
  const outlierIndices: number[] = [];

  strengths.forEach((val, idx) => {
    const deviation = Math.abs(val - mean) / mean;
    if (deviation > 0.15) {
      outlierIndices.push(idx);
    }
  });

  return {
    meanMpa: +mean.toFixed(2),
    isWithin15Percent: outlierIndices.length === 0,
    outlierIndices
  };
}

// 3. IS 456 Table 11 Mandatory Sampling Frequency:
export function calculateRequiredCubeSamplesCount(pourVolumeM3: number): number {
  if (pourVolumeM3 <= 5) return 1;
  if (pourVolumeM3 <= 15) return 2;
  if (pourVolumeM3 <= 30) return 3;
  if (pourVolumeM3 <= 50) return 4;
  return 4 + Math.ceil((pourVolumeM3 - 50) / 50);
}

// 4. IS 456:2000 Cl. 16.1 Statistical Acceptance over 4 Consecutive Batches
export function evaluateFourBatchStatisticalAcceptance(
  fourSamples28d: [number, number, number, number],
  targetFck = 35.0,
  sigma = 5.0
): StatisticalAcceptanceBatchResult {
  const fourMean = +(fourSamples28d.reduce((a, b) => a + b, 0) / 4).toFixed(2);
  const meanThreshold = +(Math.max(targetFck + 0.825 * sigma, targetFck + 3.0)).toFixed(2);
  const individualThreshold = +(targetFck - 3.0).toFixed(2); // 32.0 N/mm2

  const isMeanPass = fourMean >= meanThreshold;
  const isIndividualPass = fourSamples28d.every(val => val >= individualThreshold);
  const isAccepted = isMeanPass && isIndividualPass;

  let verdict = `BATCH ACCEPTED (IS 456 CL. 16.1 PASS): 4-Sample Mean = ${fourMean} MPa (>= ${meanThreshold} MPa). All individual samples >= 32.0 MPa.`;
  if (!isAccepted) {
    verdict = `BATCH NON-CONFORMANCE: 4-Sample Mean = ${fourMean} MPa (Required >= ${meanThreshold} MPa). Core testing or NDT investigation triggered under Cl. 17.4.`;
  }

  return {
    batchNumber: 1,
    sampleIds: ["SAMPLE-01", "SAMPLE-02", "SAMPLE-03", "SAMPLE-04"],
    sampleMeanStrengths28dMpa: fourSamples28d,
    fourSampleMeanMpa: fourMean,
    assumedStandardDeviationSigma: sigma,
    statutoryMeanThresholdMpa: meanThreshold,
    statutoryIndividualThresholdMpa: individualThreshold,
    isFourSampleMeanCompliant: isMeanPass,
    isAllIndividualSamplesCompliant: isIndividualPass,
    isBatchAcceptedUnderIS456: isAccepted,
    statutoryVerdict: verdict
  };
}
