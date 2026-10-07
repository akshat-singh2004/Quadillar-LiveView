export class CpwdClause10CCEscalator {
  /**
   * CPWD Works Manual Clause 10CC Price Variation Formula:
   * V_l = 0.85 * (P_l / 100) * R * (L_i - L_0) / L_0
   */
  static calculateLaborEscalation(params: {
    grossWorkDoneR: number;
    laborComponentPct: number; // Typically 25% for civil building works
    baseLaborIndexL0: number;
    currentLaborIndexLi: number;
  }): number {
    if (params.baseLaborIndexL0 <= 0) return 0;
    const factor = (params.currentLaborIndexLi - params.baseLaborIndexL0) / params.baseLaborIndexL0;
    const escalation = 0.85 * (params.laborComponentPct / 100) * params.grossWorkDoneR * factor;
    return parseFloat(Math.max(0, escalation).toFixed(2));
  }
}
