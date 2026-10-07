export interface RegisteredWorker {
  id: string;
  workerPin: string;
  fullName: string;
  contractorAgency: string;
  tradePackage: string;
  skillTier: "SKILLED" | "SEMI_SKILLED" | "UNSKILLED";
  dailyWageInr: number;
  uanNumber?: string;
  esicNumber?: string;
  ismwPassbookIssued: boolean;
}

export interface TurnstilePunch {
  id: string;
  workerPin: string;
  direction: "IN" | "OUT";
  punchTimestamp: string;
}

export interface LaborMusterSummary {
  totalRegisteredWorkers: number;
  activePunchedInWorkers: number;
  certifiedDailyWageInr: number;
  bocwWelfareCessInr: number; // 1.0% statutory deduction per BOCW Act 1996
  contractorBreakdown: { agency: string; presentCount: number; dailyCostInr: number }[];
  ghostDiscrepancyCount: number;
  ghostDebitInr: number;
  isComplianceCleared: boolean;
  verdict: string;
}

export class BocwLaborEngine {
  /**
   * Evaluates active shift muster by cross-referencing registered workers
   * against turnstile punch events for the current shift.
   */
  static evaluateShiftMuster(
    workers: RegisteredWorker[],
    punches: TurnstilePunch[],
    billedHeadcountClaimed = 0
  ): LaborMusterSummary {
    const presentPins = new Set(
      punches.filter((p) => p.direction === "IN").map((p) => p.workerPin)
    );

    const activeWorkers = workers.filter((w) => presentPins.has(w.workerPin));
    const activePunchedInWorkers = activeWorkers.length;

    // Daily wage calculation
    const certifiedDailyWageInr = activeWorkers.reduce(
      (sum, w) => sum + Number(w.dailyWageInr || 0),
      0
    );

    // Statutory 1% BOCW Welfare Cess on gross wage disbursement
    const bocwWelfareCessInr = Math.round(certifiedDailyWageInr * 0.01);

    // Contractor muster breakdown
    const contractorMap = new Map<string, { presentCount: number; dailyCostInr: number }>();
    activeWorkers.forEach((w) => {
      const current = contractorMap.get(w.contractorAgency) || { presentCount: 0, dailyCostInr: 0 };
      contractorMap.set(w.contractorAgency, {
        presentCount: current.presentCount + 1,
        dailyCostInr: current.dailyCostInr + Number(w.dailyWageInr || 0),
      });
    });

    const contractorBreakdown = Array.from(contractorMap.entries()).map(([agency, val]) => ({
      agency,
      presentCount: val.presentCount,
      dailyCostInr: val.dailyCostInr,
    }));

    // Ghost worker detection: billed claims exceed turnstile punch counts
    const ghostDiscrepancyCount = Math.max(0, billedHeadcountClaimed - activePunchedInWorkers);
    const avgWage = activePunchedInWorkers > 0 ? certifiedDailyWageInr / activePunchedInWorkers : 750;
    const ghostDebitInr = Math.round(ghostDiscrepancyCount * avgWage);

    const isComplianceCleared = ghostDiscrepancyCount === 0;

    let verdict = `MUSTER RECONCILED: ${activePunchedInWorkers} workers biometric-verified. 1% BOCW Cess (₹${bocwWelfareCessInr}) calculated.`;
    if (!isComplianceCleared) {
      verdict = `GHOST WORKER FRAUD ALERT: Subcontractor claimed ${billedHeadcountClaimed} workers, but only ${activePunchedInWorkers} punched turnstile. ₹${ghostDebitInr.toLocaleString("en-IN")} contra-charge debit initiated.`;
    }

    return {
      totalRegisteredWorkers: workers.length,
      activePunchedInWorkers,
      certifiedDailyWageInr,
      bocwWelfareCessInr,
      contractorBreakdown,
      ghostDiscrepancyCount,
      ghostDebitInr,
      isComplianceCleared,
      verdict,
    };
  }
}
