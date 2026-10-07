export interface CubeSpecimen {
  sampleId: string;
  ageDays: number;
  failureLoadKn: number;
  crossSectionAreaMm2: number; // Standard 150x150 mm = 22500 mm²
}

export interface StatisticalAcceptanceProof {
  characteristicTargetMpa: number;
  sampleCount: number;
  individualStrengthsMpa: number[];
  meanStrengthMpa: number;
  standardDeviationMpa: number;
  table11Criterion1Met: boolean; // f_mean >= f_ck + 0.825 * sigma (or f_ck + 3)
  table11Criterion2Met: boolean; // f_min >= f_ck - 3
  isBatchAccepted: boolean;
  mathematicalProof: string;
}

export class CubeStatisticalAcceptanceEngine {
  /**
   * IS 456:2000 Clause 15.4 / Table 11 Statistical Acceptance Criteria:
   * 1. Mean strength of 4 non-overlapping consecutive test results:
   *    f_mean >= f_ck + 0.825 * standard_deviation OR f_ck + 3.0 N/mm² (whichever is greater)
   * 2. Any individual test result:
   *    f_ind >= f_ck - 3.0 N/mm² (for M15 and above)
   */
  static evaluateBatch(targetFckMpa: number, cubes: CubeSpecimen[]): StatisticalAcceptanceProof {
    const strengths = cubes.map((c) =>
      parseFloat(((c.failureLoadKn * 1000) / c.crossSectionAreaMm2).toFixed(2))
    );

    const n = strengths.length;
    if (n < 3) {
      throw new Error("IS 456 Cl. 15.2.2 requires a minimum statistical set of 3 test specimens.");
    }

    const mean = strengths.reduce((a, b) => a + b, 0) / n;
    const variance = strengths.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const standardDeviation = Math.sqrt(variance);

    const criterion1Threshold = Math.max(targetFckMpa + 0.825 * standardDeviation, targetFckMpa + 3.0);
    const criterion1Met = mean >= criterion1Threshold;

    const minAllowableIndividual = targetFckMpa - 3.0;
    const minStrength = Math.min(...strengths);
    const criterion2Met = strengths.every((s) => s >= minAllowableIndividual);

    const isBatchAccepted = criterion1Met && criterion2Met;

    const proof = `f_mean=${mean.toFixed(2)} MPa (req >= ${criterion1Threshold.toFixed(2)}) | ` +
      `f_min=${minStrength.toFixed(2)} MPa (req >= ${minAllowableIndividual.toFixed(2)}) | ` +
      `sigma=${standardDeviation.toFixed(2)} MPa`;

    return {
      characteristicTargetMpa: targetFckMpa,
      sampleCount: n,
      individualStrengthsMpa: strengths,
      meanStrengthMpa: parseFloat(mean.toFixed(2)),
      standardDeviationMpa: parseFloat(standardDeviation.toFixed(2)),
      table11Criterion1Met: criterion1Met,
      table11Criterion2Met: criterion2Met,
      isBatchAccepted,
      mathematicalProof: proof,
    };
  }
}
