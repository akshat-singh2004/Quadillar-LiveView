export class Clause42PenalRecoveryEngine {
  /**
   * CPWD GCC Clause 42 Material Reconciliation:
   * Theoretical vs. Actual Inward consumption.
   * Permissible variation: Steel (+3%), Cement (+2%).
   * Excess wastage charged at 2x stipulated penal rate.
   */
  static evaluateReconciliation(params: {
    material: "STEEL" | "CEMENT";
    theoreticalQty: number;
    actualQty: number;
    stipulatedRateInr: number;
  }): { excessQty: number; penalDebitInr: number; isWithinTolerance: boolean } {
    const tolerancePct = params.material === "STEEL" ? 0.03 : 0.02;
    const permissibleCeiling = params.theoreticalQty * (1 + tolerancePct);
    const excessQty = Math.max(0, params.actualQty - permissibleCeiling);
    const penalDebitInr = Math.round(excessQty * (params.stipulatedRateInr * 2.0));

    return {
      excessQty: parseFloat(excessQty.toFixed(3)),
      penalDebitInr,
      isWithinTolerance: excessQty === 0,
    };
  }
}
