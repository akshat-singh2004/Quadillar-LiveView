export class CiriaThermalStrainAuditor {
  /**
   * CIRIA C766 Early Thermal Contraction Cracking Evaluation:
   * Restrained strain epsilon_r = alpha_c * T_1 * R
   * Maximum allowable core-surface thermal gradient <= 20.0°C
   */
  static evaluateThermalGradient(coreTempC: number, surfaceTempC: number): {
    deltaT: number;
    isGradientSafe: boolean;
    isDefSafe: boolean;
    verdict: string;
  } {
    const deltaT = parseFloat(Math.abs(coreTempC - surfaceTempC).toFixed(1));
    const isGradientSafe = deltaT <= 20.0;
    const isDefSafe = coreTempC <= 70.0;

    let verdict = "THERMAL STABLE: Gradient within CIRIA C766 limits.";
    if (!isDefSafe) {
      verdict = `CRITICAL DEF ALERT: Core ${coreTempC}°C exceeds 70°C maximum limit. Delayed Ettringite Formation risk.`;
    } else if (!isGradientSafe) {
      verdict = `THERMAL CRACK BREACH: Core-surface delta ${deltaT}°C exceeds 20°C limit. Add insulation blankets.`;
    }

    return { deltaT, isGradientSafe, isDefSafe, verdict };
  }
}
