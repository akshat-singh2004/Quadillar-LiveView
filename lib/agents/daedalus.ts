import { NurseSaulIntegrator } from "./sub-agents/daedalus/nurse-saul";
import { CiriaThermalStrainAuditor } from "./sub-agents/daedalus/ciria-thermal";
import { HermesAgent } from "./hermes";

export class DaedalusAgent {
  static evaluateHydrationKinetics(params: {
    coreTempC: number;
    surfaceTempC: number;
    targetFckMpa: number;
    hoursSincePour: number;
    ambientTempC: number;
  }) {
    const maturity = NurseSaulIntegrator.computeMaturityIndex(params.coreTempC, params.surfaceTempC, params.hoursSincePour);
    const estimatedStrengthMpa = NurseSaulIntegrator.estimateStrengthMpa(maturity, params.targetFckMpa);
    const thermal = CiriaThermalStrainAuditor.evaluateThermalGradient(params.coreTempC, params.surfaceTempC);

    const strippingPermitted = estimatedStrengthMpa >= params.targetFckMpa * 0.70 && thermal.isGradientSafe && thermal.isDefSafe;

    return {
      coreTempC: params.coreTempC,
      surfaceTempC: params.surfaceTempC,
      differentialTempC: thermal.deltaT,
      isDefRisk: !thermal.isDefSafe,
      isThermalCrackRisk: !thermal.isGradientSafe,
      maturityIndexCdegHours: maturity,
      estimatedStrengthMpa,
      strippingPermitted,
      verdict: thermal.verdict,
    };
  }
}
