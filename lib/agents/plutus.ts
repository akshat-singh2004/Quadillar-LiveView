import { BiometricAntiPassbackReconciler } from "./sub-agents/plutus/turnstile-reconciler";
import { StatutoryMinWageTierAuditor } from "./sub-agents/plutus/bocw-wages";
import { HermesAgent } from "./hermes";

export class PlutusAgent {
  static auditMuster(claimedPins: string[], punchedPins: string[]) {
    return BiometricAntiPassbackReconciler.reconcileTurnstileLogs(punchedPins, claimedPins);
  }

  static verifyMinimumWage(tier: "SKILLED" | "SEMI_SKILLED" | "UNSKILLED", paidWage: number) {
    return StatutoryMinWageTierAuditor.auditWageCompliance(tier, paidWage);
  }
}
