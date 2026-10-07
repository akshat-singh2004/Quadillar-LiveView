export class BiometricAntiPassbackReconciler {
  static reconcileTurnstileLogs(
    punchedPins: string[],
    claimedPins: string[],
    dailyRateInr = 750
  ): { ghostCount: number; ghostDebitInr: number; verifiedCount: number } {
    const punchSet = new Set(punchedPins);
    const ghostWorkers = claimedPins.filter((pin) => !punchSet.has(pin));
    const ghostCount = ghostWorkers.length;
    const ghostDebitInr = ghostCount * dailyRateInr;

    return {
      ghostCount,
      ghostDebitInr,
      verifiedCount: claimedPins.length - ghostCount,
    };
  }
}
