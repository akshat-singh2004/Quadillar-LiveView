export class NurseSaulIntegrator {
  /**
   * ASTM C1074 Nurse-Saul Temperature-Time Factor:
   * M(t) = sum (T_i - T_0) * delta_t_i with datum T_0 = -10°C
   */
  static computeMaturityIndex(coreTempC: number, surfaceTempC: number, hoursElapsed: number): number {
    const avgTemp = (coreTempC + surfaceTempC) / 2;
    const datum = -10.0;
    return Math.max(0, Math.round((avgTemp - datum) * hoursElapsed));
  }

  /**
   * Plowman Logarithmic Compressive Strength Derivation:
   * f_c = f_ck * (log10(M) / 3.8) bounded by 1.15 * f_ck
   */
  static estimateStrengthMpa(maturityIndex: number, targetFckMpa: number): number {
    const normalizedProgress = Math.log10(Math.max(10, maturityIndex)) / 3.8;
    return parseFloat(Math.min(targetFckMpa * 1.15, targetFckMpa * normalizedProgress).toFixed(2));
  }
}
