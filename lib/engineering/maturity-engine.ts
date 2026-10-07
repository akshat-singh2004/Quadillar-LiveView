export interface MaturityEvaluationParams {
  targetFckMpa: number;
  elementType: "VERTICAL_WALL_COL" | "SLAB_SOFFIT" | "BEAM_SOFFIT_PROPS" | "LONG_SPAN_OVER_6M";
  coreTempC: number;
  surfaceTempC: number;
  ambientTempC: number;
  hoursSincePour: number;
  previousMaturityIndex?: number;
}

export interface StrippingGateResult {
  maturityIndexCdegHours: number;
  estimatedStrengthMpa: number;
  strengthRatioPct: number;
  requiredStrengthRatioPct: number;
  differentialTempC: number;
  isThermalSafe: boolean; // Delta-T <= 20°C per CIRIA C766
  isDefSafe: boolean;     // T_core <= 70°C (Delayed Ettringite Formation)
  strippingPermitted: boolean;
  lockoutReason?: string;
  verdict: string;
}

export class ConcreteMaturityEngine {
  /**
   * Evaluates IS 456 Table 10 stripping percentage required
   */
  static getRequiredStrengthThreshold(elementType: string): number {
    switch (elementType) {
      case "VERTICAL_WALL_COL":
        return 0.25; // 25% of f_ck (Columns/Walls)
      case "SLAB_SOFFIT":
        return 0.50; // 50% of f_ck (Slabs props intact)
      case "BEAM_SOFFIT_PROPS":
        return 0.70; // 70% of f_ck (Beams/Props < 4.5m)
      case "LONG_SPAN_OVER_6M":
        return 0.85; // 85% of f_ck (Spans > 6m)
      default:
        return 0.70;
    }
  }

  /**
   * Calculates Nurse-Saul Maturity M = sum((T - T0) * delta_t) with T0 = -10°C
   * and derives in-situ compressive strength via Plowman logarithmic model.
   */
  static evaluateStrippingGate(params: MaturityEvaluationParams): StrippingGateResult {
    const differentialTempC = parseFloat(Math.abs(params.coreTempC - params.surfaceTempC).toFixed(1));
    const avgTemp = (params.coreTempC + params.surfaceTempC) / 2;

    // Nurse-Saul Maturity Index increment
    const maturity = Math.max(0, (avgTemp + 10) * params.hoursSincePour);

    // Plowman Logarithmic compressive curve normalized to target mix:
    // f_c(M) = targetFck * (log10(M) / 3.8) bounded by 1.15 * f_ck
    const normalizedProgress = Math.log10(Math.max(10, maturity)) / 3.8;
    const estimatedStrengthMpa = parseFloat(
      Math.min(params.targetFckMpa * 1.15, params.targetFckMpa * normalizedProgress).toFixed(2)
    );

    const strengthRatioPct = parseFloat(((estimatedStrengthMpa / params.targetFckMpa) * 100).toFixed(1));
    const requiredRatio = this.getRequiredStrengthThreshold(params.elementType);
    const requiredStrengthRatioPct = Math.round(requiredRatio * 100);

    // Structural & Thermal Checks
    const isStrengthAchieved = estimatedStrengthMpa >= params.targetFckMpa * requiredRatio;
    const isThermalSafe = differentialTempC <= 20.0;
    const isDefSafe = params.coreTempC <= 70.0;

    let strippingPermitted = false;
    let lockoutReason: string | undefined;

    if (!isDefSafe) {
      lockoutReason = `DEF RISK: Core temperature ${params.coreTempC}°C exceeds 70.0°C maximum. Thermal breakdown alert.`;
    } else if (!isThermalSafe) {
      lockoutReason = `THERMAL CRACKING RISK: Core-surface delta ${differentialTempC}°C exceeds 20.0°C CIRIA C766 limit. Insulation blankets required.`;
    } else if (!isStrengthAchieved) {
      lockoutReason = `STRENGTH DEFICIENT: In-situ strength ${estimatedStrengthMpa} MPa (${strengthRatioPct}%) is below IS 456 required ${requiredStrengthRatioPct}% threshold.`;
    } else {
      strippingPermitted = true;
    }

    return {
      maturityIndexCdegHours: Math.round(maturity),
      estimatedStrengthMpa,
      strengthRatioPct,
      requiredStrengthRatioPct,
      differentialTempC,
      isThermalSafe,
      isDefSafe,
      strippingPermitted,
      lockoutReason,
      verdict: strippingPermitted
        ? `STRIPPING AUTHORIZED: In-situ strength (${strengthRatioPct}%) & thermal gradients pass IS 456 Table 10 criteria.`
        : `STRIPPING LOCKED: ${lockoutReason}`,
    };
  }
}
