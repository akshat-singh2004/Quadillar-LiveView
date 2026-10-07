export class LiquidatedDamagesCalculator {
  /**
   * CPWD GCC Clause 2 Liquidated Damages:
   * 1.0% per week of unexcused delay, capped strictly at 10.0% of contract baseline.
   */
  static compute(contractBaselineInr: number, delayDays: number): { ldInr: number; isCapped: boolean } {
    if (delayDays <= 0) return { ldInr: 0, isCapped: false };
    const weeks = delayDays / 7.0;
    const computedLd = Math.round(contractBaselineInr * (weeks * 0.01));
    const cap = Math.round(contractBaselineInr * 0.10);
    const isCapped = computedLd >= cap;
    return { ldInr: Math.min(computedLd, cap), isCapped };
  }
}
