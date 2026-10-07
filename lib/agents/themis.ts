import { LiquidatedDamagesCalculator } from "./sub-agents/themis/ld-calculator";
import { HermesAgent } from "./hermes";

export class ThemisAgent {
  static computeLiquidatedDamages(params: { contractBaselineInr: number; unexcusedDelayDays: number }) {
    const res = LiquidatedDamagesCalculator.compute(params.contractBaselineInr, params.unexcusedDelayDays);
    return {
      computedLdInr: res.ldInr,
      isCappedAtTenPercent: res.isCapped,
      verdict: res.ldInr > 0 ? `Liquidated damages of ₹${res.ldInr.toLocaleString("en-IN")} assessed per CPWD Cl. 2.` : "Zero liquidated damages.",
    };
  }
}
