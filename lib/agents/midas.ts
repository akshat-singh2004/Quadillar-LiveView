import { CpwdClause10CCEscalator } from "./sub-agents/midas/cpwd-escalation";
import { StatutoryTaxWithholdingAuditor } from "./sub-agents/midas/tax-withholding";
import { HermesAgent } from "./hermes";

export class MidasAgent {
  static calculateEscalation(grossWorkDoneR: number, baseL0: number, currentLi: number) {
    return CpwdClause10CCEscalator.calculateLaborEscalation({
      grossWorkDoneR,
      laborComponentPct: 25,
      baseLaborIndexL0: baseL0,
      currentLaborIndexLi: currentLi,
    });
  }

  static applyBillingWaterfall(grossValuationInr: number) {
    return StatutoryTaxWithholdingAuditor.computeDeductions(grossValuationInr);
  }
}
