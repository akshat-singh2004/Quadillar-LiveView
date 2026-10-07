import { CuttingStock1DBilletOptimizer } from "./sub-agents/vulcan/cutting-stock";
import { Clause42PenalRecoveryEngine } from "./sub-agents/vulcan/clause42-reconciler";
import { HermesAgent } from "./hermes";

export class VulcanAgent {
  static optimizeRebarNesting(cutLengthsM: number[]) {
    return CuttingStock1DBilletOptimizer.optimize12mBillets(cutLengthsM);
  }

  static reconcileMaterials(params: { material: "STEEL" | "CEMENT"; theoretical: number; actual: number; rate: number }) {
    return Clause42PenalRecoveryEngine.evaluateReconciliation({
      material: params.material,
      theoreticalQty: params.theoretical,
      actualQty: params.actual,
      stipulatedRateInr: params.rate,
    });
  }
}
