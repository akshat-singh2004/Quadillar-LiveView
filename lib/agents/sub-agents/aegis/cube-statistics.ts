export interface CubeSpecimen {
  sampleId: string;
  ageDays: number;
  failureLoadKn: number;
  crossSectionAreaMm2: number; // Standard 150x150 mm = 22500 mm2
}

export interface StatisticalAcceptanceProof {
  characteristicTargetMpa: number;
  sampleCount: number;
  individualStrengthsMpa: number[];
  meanStrengthMpa: number;
  standardDeviationMpa: number;
  maxDeviationFromMeanPct: number;
  clause15_4Valid: boolean;      // Individual specimens within +/-15% of sample mean
  table11Criterion1Met: boolean; // f_mean >= max(f_ck + 0.825 * sigma, f_ck + margin)
  table11Criterion2Met: boolean; // f_min >= f_ck - margin (3 MPa for M15-M20, 4 MPa for M25+)
  isBatchAccepted: boolean;
  mathematicalProof: string;
}

export class CubeStatisticalAcceptanceEngine {
  /**
   * IS 456:2000 Clause 15.4 & Table 11 (incorporating Amendment No. 4, 2013):
   * 1. Cl. 15.4 Sample Validity: Individual cube variation must not exceed +/-15% of sample average.
   * 2. Table 11 Mean Criterion: f_mean >= max(f_ck + 0.825 * sigma, f_ck + margin)
   *    where margin = 3.0 MPa for M15-M20 and 4.0 MPa for M25 and above.
   * 3. Table 11 Individual Criterion: f_ind >= f_ck - margin.
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

    // IS 456 Cl. 15.4: Individual variation from sample average must be <= 15%
    const maxDeviationFromMeanPct =
      mean > 0
        ? parseFloat(
            (Math.max(...strengths.map((s) => Math.abs(s - mean) / mean)) * 100).toFixed(2)
          )
        : 100;
    const clause15_4Valid = maxDeviationFromMeanPct <= 15.0;

    // IS 456 Table 11 (Amendment 4): +/-3 MPa for M15-M20, +/-4 MPa for M25 and above
    const table11Margin = targetFckMpa >= 25 ? 4.0 : 3.0;
    const criterion1Threshold = Math.max(
      targetFckMpa + 0.825 * standardDeviation,
      targetFckMpa + table11Margin
    );
    const criterion1Met = mean >= criterion1Threshold;

    const minAllowableIndividual = targetFckMpa - table11Margin;
    const minStrength = Math.min(...strengths);
    const criterion2Met = strengths.every((s) => s >= minAllowableIndividual);

    const isBatchAccepted = clause15_4Valid && criterion1Met && criterion2Met;

    const proof =
      `f_mean=${mean.toFixed(2)} MPa (req >= ${criterion1Threshold.toFixed(2)}) | ` +
      `f_min=${minStrength.toFixed(2)} MPa (req >= ${minAllowableIndividual.toFixed(2)}) | ` +
      `spread=${maxDeviationFromMeanPct.toFixed(2)}% (Cl. 15.4 limit <= 15%) | ` +
      `sigma=${standardDeviation.toFixed(2)} MPa`;

    return {
      characteristicTargetMpa: targetFckMpa,
      sampleCount: n,
      individualStrengthsMpa: strengths,
      meanStrengthMpa: parseFloat(mean.toFixed(2)),
      standardDeviationMpa: parseFloat(standardDeviation.toFixed(2)),
      maxDeviationFromMeanPct,
      clause15_4Valid,
      table11Criterion1Met: criterion1Met,
      table11Criterion2Met: criterion2Met,
      isBatchAccepted,
      mathematicalProof: proof,
    };
  }
}
